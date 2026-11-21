# Bootstrap e configuração (plano 01)

## Saúde
| Rota | Papel | Observação |
|---|---|---|
| `GET /` | raiz | pública, sem efeito colateral |
| `GET /health` | **liveness** | o processo responde; sem banco, sem memória. Traz `aiProviderMode` (`fake` nos E2E) |
| `GET /health/ready` | **readiness** | `SELECT 1` com prazo (`HEALTH_READINESS_TIMEOUT_MS`); `503` com `checks.database = unavailable` |

`/health/detailed` **não existe mais** (404). Consumidores: balanceador/ECS (readiness), `HEALTHCHECK` do Docker (liveness) e os E2E (`aiProviderMode`). Todas respondem `X-Request-Id`.

## Configuração
- O env é validado no boot (`src/config/env.validation.ts`, ligado em `AppModule`): variável faltando ou inválida derruba o boot com mensagem segura.
- **CORS** por allowlist (`CORS_ALLOWED_ORIGINS`); sem a lista, em ambiente implantado, o boot avisa que qualquer origem é aceita.
- **Cabeçalhos de segurança** são manuais em `main.ts` (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, HSTS). **Decisão:** manter manual, sem `helmet`, até haver necessidade de CSP.
- **Rate limit** é opt-in (`RATE_LIMIT_ENABLED=true`); atrás de proxy defina `TRUST_PROXY_HOPS`.
- Filtro de exceção por DI (`APP_FILTER`); `enableShutdownHooks()` (sem `process.exit` manual).

## Imagem Docker
`Dockerfile` (renomeado de `DockerFile`): `npm ci` a partir do lock, só dependências de produção na imagem final, `USER node`, `HEALTHCHECK` em `/health`, `.dockerignore` (sem `env`, `.git`, testes). Variáveis vêm de `docker run -e/--env-file`.

## CI
- API (`build-*.yml`): `npm ci` -> `npm run lint:check` -> `build` -> `test:cov`. `lint:check` é o **gate sem `--fix`**, escopado à unidade (`src/app*.ts`, `src/main.ts`, `src/config`, `src/common/controllers`); `lint:fix` reformata (uso local). Nunca rode `npm run lint` global (reformata ~415 arquivos); o escopo do `lint:check` cresce por unidade conforme os arquivos entram limpos.
- App: `type-check` -> Vitest (`test:unit`) -> `build`.
- **Tag da imagem**: `deploy-staging.yml` e `deploy-prod.yml` publicam só a tag imutável `${{ github.sha }}` (o `latest` saiu dos dois; o staging faz `docker pull`/`run` pela mesma tag do commit). Rollback = reexecutar o deploy de um commit anterior. O `scripts/deploy-ecs-local.sh` (Super Stack EC2) ainda publica `:latest` por ser o contrato da stack local; mudar exige decisão do solicitante.
- **Migrations na CI: PENDENTE (decisão do solicitante, regra 16).** Hoje nenhum workflow roda `migration:run`; os scripts `db:local:migration:*` são só locais. O passo está **preparado e comentado** (desativado) em `deploy-staging.yml` e `deploy-prod.yml`, antes do deploy. Para ativar é preciso decidir: (1) quem aplica hoje em staging/prod, (2) se o runner do GitHub alcança o banco (rede/VPC) ou se roda via SSM na instância, (3) política de rollback (`migration:revert`). Não ativar sem essa resposta.

## Testes
Jest: `app.bootstrap.spec.ts` (DI do filtro, health, CORS), `health.controller.spec.ts`, `env.validation.spec.ts`, `cors.config.spec.ts`. Playwright: `e2e/live/bootstrap-config/bootstrap-config.api.spec.ts` (16 cenários) e `bootstrap-config.ui.spec.ts` (9 cenários de boot e rotas lazy, 2 em 375x812); matriz 25/25 (`node scripts/check-scenario-coverage.mjs --unit=bootstrap-config`). Fora de E2E: a tela `app-boot-timeout` só aparece com a API indisponível (derrubar a API quebraria os demais cenários em paralelo e simulá-la seria mock, proibido).

## Front: rotas sob demanda (T5.1)
`orfanatonib-app/src/App.tsx` (1043 -> ~100 linhas) só cuida do boot (sessão, flags, `AppBootScreen`) e renderiza `AppRoutes`. As rotas moram em `src/routes/`: `publicRoutes.tsx`, `memberRoutes.tsx`, `adminRoutes.tsx`, `dynamicRoutes.tsx`, `lazyPages.ts` (todas as páginas via `React.lazy`), `flaggedElement.tsx` (guarda de flag síncrona por fora, página lazy por dentro), `lazyElement.tsx` (`Suspense` + `RouteFallback`, esqueleto `data-testid="route-fallback"`) e `utils.ts` (`resolveDynamicRouteTarget`, com teste Vitest). Cada página tem a própria fronteira de `Suspense`, então o layout (`/adm`, Área do Membro, Estúdio) não some enquanto a página filha é baixada. Guardas (`ProtectedRoute`, `RequireAdmin`, `FeatureFlagRoute`), paths e `data-testid` ficaram idênticos; Home e 404 são eager. `scripts/check-route-coverage.mjs` passou a ler `src/routes/*Routes.tsx` e a montar o caminho das rotas aninhadas.
