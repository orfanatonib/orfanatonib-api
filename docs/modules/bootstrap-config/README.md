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
- API: `npm ci` → `lint` → `build`. **Dívida:** o `lint` ainda usa `--fix` porque o repositório tem ~9,5 mil divergências de Prettier; só dá para tirar o `--fix` depois de um commit único de formatação.
- App: `type-check` → Vitest (`test:unit`) → `build`.

## Testes
Jest: `app.bootstrap.spec.ts` (DI do filtro, health, CORS), `health.controller.spec.ts`, `env.validation.spec.ts`, `cors.config.spec.ts`. Playwright: `e2e/live/bootstrap-config/bootstrap-config.api.spec.ts` (16 cenários, matriz 16/16).
