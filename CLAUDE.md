# Claude Project Instructions — Orfanato NIB Backend

Read and comply with [`AGENTS.md`](AGENTS.md), [`docs/ORFANATO_BACKEND_BEST_PRACTICES.md`](docs/ORFANATO_BACKEND_BEST_PRACTICES.md), [`AI_DATABASE_CHANGE_REQUIREMENTS.md`](AI_DATABASE_CHANGE_REQUIREMENTS.md) for database work, [`docs/deploy/README.md`](docs/deploy/README.md) for deploy/migration rollout (never deploy without explicit approval), and applicable error/domain documentation before modifying this repository.

Mandatory summary:

- This API is NestJS 11 with TypeScript, TypeORM, and MySQL.
- Controllers handle HTTP; services handle use cases; repositories handle persistence; providers handle external integrations.
- Services MUST NEVER manipulate the database directly — they MUST ALWAYS delegate persistence to repositories. A service in module A MUST NEVER call a repository from module B; it MUST ALWAYS call module B's service.
- When creating or editing any module, services MUST ALWAYS be split into separate operation files: create, get, update, and delete.
- Always use explicit input DTOs (request/query) and output DTOs (response contracts) for everything; do not expose raw entities. ALWAYS create dedicated files for `types` and `constants`, ALWAYS use domain enums for finite sets (no magic strings), ALWAYS create dedicated `utils` files for pure functions/logic, and NEVER use `any` under any circumstances.
- Enforce role, shelter/team scope, ownership, errors, privacy, statistics scope, and transactions in the API.
- Toda notificação por e-mail fica atrás de uma feature flag PRÓPRIA — uma flag por tipo de notificação, nunca compartilhada com a flag do recurso de origem, nunca ausente. **Toda feature nova que precise notificar por e-mail cria a notificação E a flag na mesma entrega.** Exige, em conjunto: valor em `EmailTemplateKey`, template no registro + amostra de preview, flag `email_<tipo>` (chave derivada por `emailFeatureFlagKey()`) semeada em `DEFAULT_FEATURE_FLAGS` com `enabled: true`, e envio por `EmailDispatchService.dispatch`; atualize os testes que contam flags/templates e prove flag ligada (envia) e desligada (`skipped`).
- Every schema migration must come from the official TypeORM CLI/core `migration:generate` command. Never use `migration:create`, create/edit migrations manually, or use `synchronize` to deploy schema changes.
- When a backend change creates or modifies a database schema or feature flow, create its PlantUML diagram if missing or update the existing one under `docs/diagrams/database/` or `docs/diagrams/flow/<feature-name>/`. Leave diagrams outside the current change untouched. Whenever a diagram is created or edited, ALWAYS generate its `.png` immediately (`npm run diagrams:generate`).
- Behavior changes require Jest tests and synchronized docs.

If this summary and the detailed guide differ, the detailed guide controls.
