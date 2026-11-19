# Rollout do DynamoDB de observabilidade e auditoria (plano 12)

Passo a passo para **você** executar. Nada aqui foi aplicado na AWS; os artefatos estão em `infra/dynamodb/`. Contexto do módulo: [`../observability-audit/README.md`](../observability-audit/README.md).

Tabela: **uma por ambiente** (`orfanatonib-log-records-staging` e `orfanatonib-log-records-prod`), nunca compartilhada com outra aplicação.

## 1. Criar a tabela (por ambiente)

```bash
infra/dynamodb/create-log-table.sh staging us-east-1   # só imprime o comando
```

Copie o `aws cloudformation deploy ...` impresso e execute com as credenciais do ambiente. Repita para `prod`. O template cria: chave `pk`(HASH)+`sk`(RANGE), GSI `gsi1-request` (`gsi1pk`+`gsi1sk`, projeção ALL), TTL em `expiresAtEpochSeconds`, `PAY_PER_REQUEST`, point-in-time recovery **só em prod**, tags e `DeletionPolicy: Retain` (apagar a stack não apaga a tabela).

## 2. Política IAM mínima

Edite `infra/dynamodb/iam-policy.json` trocando `<REGIAO>`, `<ID_DA_CONTA>` e `<staging|prod>` e anexe à **role do serviço** (Task Role do ECS/instância). Ações: `PutItem`, `GetItem`, `UpdateItem`, `DeleteItem`, `BatchWriteItem`, `Query` (tabela e índice `gsi1-request`) e, para o doctor, `DescribeTable`/`DescribeTimeToLive`. A aplicação **não** tem `CreateTable`/`Scan` e não deve ganhar. Sem access key no código: o SDK usa a cadeia padrão de credenciais.

## 3. Variáveis por ambiente (placeholders)

```
AWS_REGION=<regiao>
LOG_DYNAMODB_TABLE_NAME=orfanatonib-log-records-<staging|prod>
OBS_TTL_DAYS=14
AUDIT_TTL_DAYS=365
# NÃO definir LOG_DYNAMODB_ENDPOINT (é só do DynamoDB Local)
# Só no passo 5:
# OBS_STORAGE=dynamodb
# AUDIT_STORAGE=dynamodb
```

## 4. Conferir com `npm run logs:doctor`

Somente leitura (`DescribeTable`/`DescribeTimeToLive`). Com as variáveis acima no ambiente (e `OBS_STORAGE`/`AUDIT_STORAGE=dynamodb` apenas para o comando):

```bash
OBS_STORAGE=dynamodb AUDIT_STORAGE=dynamodb npm run logs:doctor
# ou com arquivo de env: npx dotenv -e env/staging.env -- npm run logs:doctor
```

Confere nome, status ACTIVE, chaves, tipos, cobrança, GSI e TTL no atributo certo; imprime `[OK]`/`[FALHA]` por item e sai com código 1 se algo estiver errado. Só siga se o resultado for OK.

## 5. Ligar (e voltar)

1. **Staging primeiro**: defina `OBS_STORAGE=dynamodb` e `AUDIT_STORAGE=dynamodb`, faça o deploy e acompanhe os logs de boot (config inválida derruba o boot com mensagem segura).
2. Valide (seção 7). Só então repita em **prod**.
3. **Rollback:** em staging/prod o storage `file` é recusado pelo boot; portanto o retorno ao arquivo é feito **voltando a imagem/versão anterior** ou, apenas em ambiente não-produtivo, `OBS_STORAGE=file`/`AUDIT_STORAGE=file`. Os registros já gravados permanecem na tabela (Retain) e voltam a ser consultáveis ao religar. Falha de gravação nunca bloqueia a requisição (fila de entrega com backpressure e escrita de emergência).

## 6. Custos e retenção

`PAY_PER_REQUEST`: paga-se por escrita/leitura e armazenamento; sem capacidade ociosa. Retenção por TTL: erro técnico 14 dias, auditoria 365 (`OBS_TTL_DAYS`/`AUDIT_TTL_DAYS`). O DynamoDB remove itens expirados em segundo plano (pode levar horas); as consultas já filtram itens expirados. PITR em prod acrescenta custo proporcional ao tamanho da tabela. Auditoria com menos de 90 dias não é apagável pelo painel.

## 7. O que verificar depois

- Faça uma mutação qualquer (p. ex. alternar uma flag) e confirme o item na tabela (partição `STREAM#audit#DAY#<aaaa-mm-dd>`); gere/observe um erro técnico e confirme em `STREAM#observability#...`.
- Como admin, com a flag `observability_audit` ligada: `GET /log-records/audit?from=..&to=..` e `GET /log-records/observability?from=..&to=..` (janela ≤ 31 dias) devolvem os registros; o painel `/adm/observabilidade-auditoria` mostra as abas Auditoria/Erros sem o aviso de storage `file`.
- Confirme que nenhum registro contém corpo, query string, IP, token ou nome do ator.
- Pendente depois do rollout: alarmes (taxa de `fatal`, fila de entrega cheia) e rodar o E2E do módulo contra o ambiente.
