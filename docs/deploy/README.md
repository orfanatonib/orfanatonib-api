# Deploy de produção — Orfanato NIB API

> Leitura obrigatória para qualquer IA ou pessoa antes de mexer em deploy, migrations, Dockerfile, workflow ou env de produção.
> **Nunca faça deploy sem ordem explícita do dono.** Nada aqui foi executado em produção ainda (ver "Status").

## 1. Onde roda
Produção é a **Super Stack**: uma EC2 (ASG `super-stack-prod`, tag `Project=super-stack-prod`, profile AWS `conta-aws`, `us-east-1`) com docker compose. **Não é ECS.** A infraestrutura vive em outro repo (`conta-aws/super-stack`).

| Peça | Fato |
|---|---|
| API | container `super-stack-orfanato-api-1`, profile `orfanato`, redes `edge` + `nib-net`, atrás do Caddy; sem porta publicada |
| Banco | container `super-stack-mysql-1` (MySQL 8.4), **dentro da EC2**, database `orfanato-nib-prod`; datadir `/mnt/data/mysql` |
| Env | `/mnt/data/env/orfanato.env` (só root); imagens em `/mnt/data/env/images.env` (`ORFANATO_IMAGE`) |
| Imagem | ECR `prod-orfanato-nib-api`, tag `<sha-do-commit>-arm64` (sem `latest`) |
| Backup | dump a cada 6 h em `s3://super-stack-db-backups-prod/mysql/scheduled/`; deploy grava em `mysql/pre-deploy/` |
| URL | `https://orfanato-nib-api.rodolfo-silva.com/health` |

## 2. Como fazer o deploy
Dois caminhos, **o mesmo código** (`scripts/deploy/remote-deploy.sh`, enviado por SSM):
- **GitHub Actions** — `.github/workflows/deploy-prod.yml` (push em `main` ou *Run workflow*; input `dry_run`). Usa o role OIDC `super-stack-prod-deploy-orfanato`.
- **Local** — `./scripts/deploy-prod-local.sh` (exige working tree limpo). `DRY_RUN=1` valida sem alterar; `SKIP_BUILD=1 IMAGE_TAG=<sha>-arm64` reaproveita imagem.

**Primeira execução: sempre `DRY_RUN=1`.** Ele testa o transporte SSM, o contrato de env, o dump verificado e o status das migrations, sem parar a API nem migrar.

### O que o deploy faz (nessa ordem; falha antes do passo 5 não altera produção)
1. **Contrato de env** — `scripts/deploy/required-env.txt` (só nomes; valores nunca são impressos). Falta qualquer chave → aborta listando.
2. **Pull** da imagem nova e leitura da imagem anterior.
3. **Dump verificado** do `orfanato-nib-prod` (`gzip -t`, nº de tabelas, rodapé `Dump completed`, tamanho no S3).
4. **Migrations** com a imagem nova, sob o lock do host, **API antiga parada**: `database.cjs auto`. Falhou → restaura o dump e sobe a imagem anterior (DDL de MySQL não é transacional).
5. **Troca** via `/opt/super-stack/scripts/deploy.sh orfanato <imagem>` (recria só a API; nunca toca nos bancos).
6. **Readiness** — `/health/ready` por até 120 s. Falhou → para, restaura o dump (se esta execução migrou; `ROLLBACK_RESTORE_DB=0` desliga) e volta a imagem anterior.

## 3. Migrations
- `database/migrations/` = só a cadeia nova: `ReleaseBaseline1795459200000` (53 tabelas) e `ReleaseDataPolicies1795459201000`. O histórico antigo ficou em `database/migrations/legacy/` (somente referência, não é carregado).
- `database/adoption/` = `LegacyProductionUpgrade1795459199000`: leva o schema de produção (35 tabelas, sem `typeorm_migrations`) ao atual, uma única vez. `feature_flags.environment` é removida uma só vez.
- `scripts/deploy/database.cjs` (roda de dentro da imagem, `dist/`): modos `status | check | run | auto | adopt-legacy | adopt-current`.
  - `auto` (usado pelo deploy): banco adotado → `run`; banco vazio → `run`; banco legado sem histórico → `adopt-legacy`; qualquer outro estado → aborta.
  - `adopt-legacy` só prossegue se a impressão digital do schema for igual a `database/adoption/legacy-schema.json`, alinha a collation padrão do banco à das tabelas (`utf8mb4_0900_ai_ci`), aplica o upgrade, exige **0 diferenças** contra as entidades e só então registra a baseline (fake).
- Mapa entidade × migration: `docs/guides/ENTITY_MIGRATION_MAP.md`. Regras de geração: `docs/guides/TYPEORM_MIGRATIONS.md`.
- `synchronize`, `migrationsRun` e `dropSchema` são `false` fixos em `database/database.config.ts` (teste garante).

### Regra de ensaio (obrigatória antes de qualquer deploy com migration nova)
Baixar o **backup mais recente** de `s3://super-stack-db-backups-prod/mysql/scheduled/` (profile `conta-aws`), restaurar num banco **novo** do MySQL local, rodar `database.cjs auto` duas vezes (a 2ª não pode mudar nada), conferir a contagem de linhas de todas as tabelas antes × depois e `check`. Nunca reutilizar dump nem repetir tentativas no mesmo banco. Ensaio de 2026-11-23: 35 tabelas com contagens idênticas, 18 criadas, 0 diferenças de schema.

## 4. Contrato de env (`/mnt/data/env/orfanato.env`)
Obrigatórias: `ENVIRONMENT=production`, `PORT`, `DB_HOST/PORT/USERNAME/PASSWORD/NAME`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ALLOWED_ORIGINS`, `APP_URL`, `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD`, `AI_PROVIDER_SETTINGS_ENCRYPTION_KEY`, `REDIS_URL`, `OBS_STORAGE=dynamodb`, `AUDIT_STORAGE=dynamodb`, `LOG_DYNAMODB_TABLE_NAME`, `LOG_AWS_CREDENTIALS_SOURCE=instance-profile`. A lista executável é `scripts/deploy/required-env.txt` — mantenha as duas em sincronia.
Logs/auditoria vão para o DynamoDB (`infra/dynamodb/`) com o role da instância; o container não tem volume, arquivo local seria perdido.

## 5. Filas de IA (Redis/Valkey)
O Valkey compartilhado da stack (voto/juri) está em `allkeys-lru` 128 MB e fora da rede do Orfanato — **não serve** para BullMQ (exige `noeviction`). Recomendado: serviço dedicado `orfanato-valkey` em `nib-net` (`--appendonly yes --maxmemory 256mb --maxmemory-policy noeviction`, volume próprio) e `REDIS_URL=redis://orfanato-valkey:6379/0`. O código já isola as chaves com o prefixo `orfanato-nib-<ambiente>`. A mudança de compose é no repo `conta-aws/super-stack`.

## 6. Status e pendências (2026-11-23)
- Ensaio local com backup real: **ok**. `remote-deploy.sh`: só checagem de sintaxe; **nunca executado na EC2** — rodar `DRY_RUN=1` primeiro (confirma também se o SSM aceita o tamanho do script).
- Não verificado: permissão da instância para gravar em `mysql/pre-deploy/` do bucket de backup.
- Pendentes fora deste repo: serviço Valkey dedicado, chaves faltantes no `orfanato.env`, tabela DynamoDB de logs, permissão da instância.
- O deploy do **staging** (`deploy-staging.yml`) não foi alterado e segue com outro mecanismo.
