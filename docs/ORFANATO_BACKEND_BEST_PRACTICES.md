# Orfanato NIB Backend Best Practices & Engineering Guidelines

## 1. Purpose and Scope

This document defines the mandatory engineering standards for `orfanatonib-api`. AI coding assistants and human developers MUST read it before creating, fixing, or refactoring backend code.

This backend is a NestJS 11 application written in TypeScript. It uses TypeORM with MySQL, class-validator/class-transformer, JWT/Passport, AWS SDK integrations, Jest, and Supertest. Source code and environment-aware configuration take precedence over stale stack descriptions in older documentation.

Core principles:

- Preserve public API and database contracts unless the requested change explicitly modifies them.
- Keep HTTP transport, business rules, persistence, and external integrations in separate layers.
- Prefer narrow, testable changes over unrelated repository-wide refactors.
- Treat authentication, authorization, and data privacy as part of every feature.
- Do not alter environment, infrastructure, deployment, or production data without explicit authorization.

## 2. Mandatory Pre-Change Workflow

Before implementing a change:

1. Read `package.json`, `tsconfig.json`, `src/main.ts`, `src/app.module.ts`, and the complete affected module.
2. Read `AI_DATABASE_CHANGE_REQUIREMENTS.md` for database work, `docs/ERROR_HANDLING_GUIDE.md` for failure behavior, and the relevant module documentation under `docs/`.
3. Trace the full request path: controller → service → repository/provider → entity and back through response DTOs.
4. Inspect guards, roles, shelter/team scope, ownership rules, feature flags, database relations, and transaction boundaries.
5. Search for equivalent patterns already used by another well-structured module.
6. Locate unit, integration, automation, and contract documentation that must change with the behavior.
7. Preserve unrelated local changes and do not format files outside the task scope.

### 2.1 AI Instruction Discovery and Execution Protocol

The repository-root `AGENTS.md` is the canonical instruction entrypoint. `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, and `.cursor/rules/` redirect supported assistants to this guide. These adapter files MUST remain concise and MUST NOT define conflicting architecture.

For every backend task, the assistant MUST:

1. Convert the request into observable HTTP, persistence, authorization, shelter/team scope, statistics, and failure acceptance criteria.
2. Trace the complete code path and inspect all DTOs, guards, entities, relations, repositories, providers, and tests it reaches.
3. Confirm current behavior from code and contract docs; do not invent endpoints, tables, roles, metric definitions, or response fields.
4. Identify concurrency, rollback, not-found, conflict, forbidden, validation, and external-provider failure paths before coding.
5. Implement the smallest cohesive change and avoid unrelated module-wide cleanup.
6. Test the affected layer in isolation, then run integration/build checks proportional to risk.
7. Review the final diff for unrequested formatting, schema drift, secrets, generated files, stale docs, and missing migrations.
8. Report verification evidence and distinguish new failures from pre-existing failures.

Existing code is evidence of behavior, not permission to reproduce architectural debt. New code follows this guide; broader cleanup requires explicit scope.

## 3. NestJS Module Architecture

The repository is organized by business area under `src/core/`, `src/shelter/`, `src/content/`, `src/communication/`, `src/infrastructure/`, and selected top-level domains such as `src/attendance/` and `src/atendente/`. Shared technical concerns belong in `src/shared/` or `src/common/`.

New or substantially expanded modules SHOULD follow this layout:

```text
src/<area>/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── dto/
│   ├── create-<feature>.dto.ts
│   ├── update-<feature>.dto.ts
│   ├── query-<feature>.dto.ts
│   └── <feature>-response.dto.ts
├── entities/
│   ├── <feature>.entity.ts
│   └── <domain-value>.enum.ts
├── services/
│   ├── create-<feature>.service.ts
│   ├── get-<feature>.service.ts
│   ├── update-<feature>.service.ts
│   └── delete-<feature>.service.ts
├── repositories/
│   └── <feature>.repository.ts
└── providers/             # Feature-owned external integrations, if needed
```

Do not create empty directories. When creating or editing any module, services MUST ALWAYS be split into separate operation-focused files: `create-<feature>.service.ts`, `get-<feature>.service.ts`, `update-<feature>.service.ts`, and `delete-<feature>.service.ts`.

Every new NestJS module MUST:

- declare controllers and providers in its module;
- register TypeORM entities through `TypeOrmModule.forFeature(...)` when required;
- export only the providers needed by another module;
- be imported by `src/app.module.ts` or the relevant parent module;
- avoid circular module dependencies; use `forwardRef` only as a documented last resort.

## 4. Mandatory Layer Separation

### 4.1 Controllers: HTTP Transport Only

Controllers may:

- declare routes, status codes, guards, pipes, interceptors, request DTOs, and response types;
- extract route, query, body, file, and authenticated-user inputs;
- delegate one use case to a service.

Controllers MUST NOT:

- query TypeORM repositories or `DataSource` directly;
- implement business rules, authorization-by-data, transaction logic, or response assembly loops;
- call AWS, Twilio, email, or another external API directly;
- return unrestricted TypeORM entities when a response DTO exists.

Every public method MUST declare an explicit return type. Use Nest pipes such as `ParseUUIDPipe` for transport-level validation.

### 4.2 Services: Business Rules and Orchestration

Services own use cases, permissions based on loaded data, workflow order, and transaction orchestration. They MUST delegate persistence to repositories and external I/O to providers.

- Services MUST NEVER manipulate the database or call TypeORM directly — they MUST ALWAYS delegate all database access and persistence operations to dedicated repositories.
- Services MUST ALWAYS be split into separate files per operation (`create`, `get`, `update`, `delete`) whenever creating or editing a module.
- Keep a transaction around the smallest atomic set of writes.
- A service in module A MUST NEVER inject or call a repository from module B; cross-module interaction MUST ALWAYS consume module B's service contract.
- Do not hide business rules in private controller methods or entity hooks.
- Return response DTOs or explicitly mapped domain results.

### 4.3 Repositories: Persistence Only

Repositories own TypeORM access:

- `Repository<Entity>` operations;
- query builders, joins, pagination, sorting, and database filters;
- persistence-specific duplicate-key interpretation;
- methods that accept an optional `EntityManager` when participating in a transaction.

Repositories MUST NOT own HTTP concerns, user-facing messages, role policy, notification delivery, or cross-domain workflow decisions. Query values MUST be parameterized. Dynamic sort fields MUST map through an allowlist.

### 4.4 Entities and DTOs

- Entities describe persistence and relations; they are not request or response DTOs.
- Every endpoint and operation MUST define explicit input DTOs (request body, query, params) and explicit output DTOs (response DTOs) for everything.
- Request DTOs use class-validator decorators and class-transformer where conversion or nested validation is required.
- Response DTOs define the public contract and prevent accidental exposure of internal columns or relation cycles.
- Update DTOs must distinguish an omitted field from an explicit `null` where the contract permits nullability.
- Never bind request bodies directly to entities or return unrestricted TypeORM entities.
- Paginated endpoints MUST return the shared paginated DTO shape instead of inventing feature-specific envelopes.

### 4.5 External Providers

AWS S3/SES, Twilio, Google authentication, and every other third-party integration MUST be isolated behind injectable providers in `src/shared/providers/` or the owning feature's `providers/` directory.

Providers own client configuration, timeouts, retries, vendor payloads, and error translation. Services consume typed, vendor-neutral methods. Tests MUST mock providers and MUST NOT call live services.

## 5. TypeScript, DTOs, Enums, and Validation

- NEVER use `any` under any circumstances. Use explicit types for everything; use `unknown` only for caught errors or untrusted payloads and narrow it immediately.
- Do not use type assertions (`as`) merely to silence a contract mismatch.
- Public controller, service, repository, provider, and utility methods MUST declare return types.
- ALWAYS create dedicated files for `types` (e.g., `types.ts` or DTO files) and `constants` (`constants.ts`) — inline declaration of types, interfaces, magic numbers, or hardcoded config constants in controllers, services, repositories, or providers is strictly prohibited.
- ALWAYS use domain enums for roles, statuses, weekdays, attendance values, shelter/team scope, criminal-record scope, domain options, and all finite sets — magic strings are strictly prohibited across controllers, services, repositories, and DTOs.
- ALWAYS create dedicated `utils` / helper files for reusable pure functions, formatters, and data transformations instead of duplicating logic inline inside controllers, services, or repositories.
- Use DTOs for every input payload (body, query, parameters) and explicit output DTOs for every response without exception.
- Prefer `readonly` for injected dependencies and immutable data where appropriate.

The global `ValidationPipe` is configured in `src/main.ts`. New DTOs MUST remain compatible with `whitelist`, transformation, and rejection of non-whitelisted fields. Nested DTOs require both `@ValidateNested()` and `@Type(() => NestedDto)`.

```ts
export class QuerySheltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @IsString()
  searchString?: string;
}
```

## 6. Authentication and Authorization

- Use existing JWT guards and role/permission mechanisms. Do not parse or verify JWTs manually in controllers.
- Authentication proves identity; every operation must separately enforce role, shelter/team scope, and resource ownership where applicable.
- Admin, leader, and staff access MUST use the same policy across list, detail, create, update, delete, and statistics endpoints.
- Never trust a client-provided actor ID when it is available from the authenticated request.
- Use a typed authenticated-request interface instead of repeated casts to `any`.
- Feature flags that protect a capability must be enforced by the API, not only by the frontend.
- Return 401 for missing/invalid authentication and 403 for an authenticated actor without permission.

## 7. Error Contract and Observability

`docs/ERROR_HANDLING_GUIDE.md` and the implementations under `src/common/exceptions/` and `src/common/filters/` are the source of truth.

- Throw the established application exception for known business, rule, validation, authentication, authorization, conflict, and not-found failures.
- Do not throw a generic `Error` or raw TypeORM/AWS exception for a known domain condition.
- Preserve an existing application exception when catching it; do not replace its specific code with a generic 500.
- Wrap unknown infrastructure failures with an internal application exception and retain the original error as a cause where supported.
- The global exception filter owns the standard `{ success: false, error: ... }` envelope. Controllers and services MUST NOT create competing shapes.
- Keep end-user messages appropriate for Portuguese UI while code, types, and engineering documentation remain in English.
- Use NestJS `Logger` with structured context such as module, operation, request/correlation ID, and safe resource IDs.
- Never log JWTs, passwords, authorization headers, request bodies containing personal data, children's records, guardian details, criminal-record details, or uploaded file contents.
- Do not swallow caught exceptions. Recover deliberately, translate them, or rethrow them.

## 8. TypeORM, Transactions, and Schema Changes

- Keep database access in repositories.
- Use `DataSource.transaction(...)` or a `QueryRunner` for multi-write atomic operations.
- Every operation in a transaction MUST use the transaction's `EntityManager`; mixing global repositories with transactional ones breaks atomicity.
- Always release a manual `QueryRunner` in `finally` and roll back after failures.
- Avoid N+1 queries. Load required relations intentionally and select only fields needed by the contract.
- Pagination endpoints MUST use bounded limits, deterministic ordering, and an accurate total.
- Add indexes and uniqueness constraints for enforced lookup/uniqueness rules; application checks alone are not concurrency-safe.
- Derived statistics must document their filters, date boundaries, timezone assumptions, and access scope.

`AI_DATABASE_CHANGE_REQUIREMENTS.md` is authoritative for all entity and database schema changes.

Every schema migration MUST be generated automatically by the official TypeORM CLI/core through `typeorm migration:generate`, using the repository `DataSource` and the difference between registered entities and the current local schema. The migration file MUST NOT be created with an editor, `apply_patch`, copy/paste, raw SQL, an ad hoc script, or `typeorm migration:create`. Its generated contents MUST NOT be edited manually. If the output is wrong or unsafe, fix the entity metadata or `DataSource` configuration, remove the incorrect generated output, and run `migration:generate` again.

The current `DatabaseModule` uses `synchronize: true`, and the repository does not yet expose the required CLI `DataSource` and migration scripts. This is existing technical debt, not an allowed schema-change mechanism. Before the next schema-changing delivery, establish the TypeORM CLI infrastructure described in `AI_DATABASE_CHANGE_REQUIREMENTS.md`, set `synchronize: false`, and let TypeORM generate the migration.

Migration rules:

- Only the official TypeORM CLI/core `migration:generate` workflow may create a schema migration.
- Never use `migration:create` for a schema change and never manually create or edit a migration file.
- Never rely on `synchronize` to deploy or emulate a schema migration.
- Never change production tables manually through a console or ad hoc SQL.
- Never modify a migration that may already have run; change the entities and generate the next migration.
- Design data backfills and destructive changes as staged, recoverable operations.
- Do not run migrations against shared or production environments without explicit authorization.
- Entity/schema changes and the matching TypeORM-generated migration belong in the same delivery.

## 9. Privacy and Security

This system handles data about vulnerable people and ministry participants. Data minimization is mandatory.

- Collect, return, and log only fields required by the use case.
- Never expose password hashes, reset tokens, refresh tokens, internal notes, or hidden entity columns in response DTOs.
- Validate upload MIME type, extension, size, and ownership on the server.
- Do not trust filenames or client-provided storage keys.
- Keep secrets in environment configuration; never commit real credentials or place them in documentation and tests.
- Parameterize database queries and allowlist dynamic sorting/filter fields.
- Preserve the security headers, CORS policy, global validation, rate limiting, and timeout behavior configured by the application.
- Avoid including personal data in error details, analytics, or third-party telemetry unless documented requirements demand authorized aggregate reporting.
- Statistics and exports MUST enforce the same access scope as source-record endpoints.

## 10. Testing and Coverage

Every behavior change MUST add or update tests in the same delivery.

- Controllers: guard/delegation behavior, valid input, invalid input, and response status/shape.
- Services: success, not found, conflict, forbidden, and relevant rule branches.
- Repositories: filters, pagination, relation loading, transaction manager usage, and duplicate constraints.
- Statistics: exact fixtures for date ranges, inactive records, permissions, totals, and boundary cases.
- Providers: success, timeout, translated vendor error, and retry policy without live network calls.
- Bug fixes: add a regression test that fails before the correction.

Use Jest, `@nestjs/testing`, and Supertest for HTTP tests. Mock TypeORM repositories, `DataSource`, AWS, Twilio, email, time, and random values. Tests MUST NOT connect to real databases or external services.

New or changed modules should maintain at least 90% coverage in the affected scope, including meaningful branches. Keep tests deterministic and cap execution to a single worker unless parallel isolation has been proven.

## 11. API and Domain Documentation

When behavior or a contract changes, update all applicable artifacts:

- the relevant Markdown file under `docs/`;
- `docs/INDEX.md` or `docs/README.md` when navigation changes;
- the corresponding Postman collection/environment when an endpoint changes;
- automation scripts or examples that encode the previous contract;
- `docs/CHANGELOG.md` for externally relevant behavior changes.

Documentation examples MUST be validated against current DTOs, roles, status codes, and response envelopes.

### 11.6 PlantUML Diagrams for Database Schemas and Feature Flows

PlantUML diagrams follow the scope of the current backend change. When a change creates or modifies a database schema or feature execution flow, create the affected diagram if it does not exist, or update it if it already exists. If a schema or feature is not changed by the current work, leave its existing diagram untouched and do not create a missing diagram merely as unrelated backfill.

Store diagrams under the `docs/` folder as follows:

1. **Database Schema Diagrams**:
   - Stored under `docs/diagrams/database/`.
   - Contains PlantUML ER / schema definition files (`.puml` or `.plantuml`) and their exported `.png` images (e.g. `database-schema.puml` and `database-schema.png`).

2. **Feature Flow Diagrams**:
   - Stored under `docs/diagrams/flow/`.
   - Must contain a dedicated subfolder for each feature (e.g. `docs/diagrams/flow/auth/`, `docs/diagrams/flow/shelter/`, `docs/diagrams/flow/attendance/`).
   - Inside each feature folder, place the PlantUML flow diagram file (`.puml`) and its rendered `.png` image.

3. **Mandatory Immediate Rendering Rule**:
   - Whenever creating or editing any `.puml` or `.plantuml` file, the corresponding `.png` image file **MUST be generated immediately right after**.
   - Run `npm run diagrams:generate` or `node scripts/generate-diagrams.js` to render all updated diagrams automatically.

### 11.1 Dependency Injection and Configuration

- NestJS providers are singleton by default. Never store request-specific mutable state on a service or repository instance.
- Constructor injection is mandatory for services, repositories, providers, `ConfigService`, and `DataSource`; avoid service-locator patterns and module-level mutable clients.
- Do not instantiate another service with `new`. Register and inject it through its module.
- Read environment configuration through `ConfigService`; avoid scattered direct `process.env` reads.
- Required variables must fail clearly during application startup. Do not wait for the first request to discover missing database or provider configuration.
- Environment defaults must be safe for local development and must never contain real credentials.
- Keep vendor configuration in the owning provider. Domain services must not know secret names, base URLs, or SDK initialization details.

### 11.2 API Compatibility, Pagination, and Idempotency

- Treat path, method, status code, request fields, response fields, nullability, enum values, sorting, and pagination metadata as public contract.
- Prefer additive compatible changes. Renaming/removing a field or changing its meaning requires an explicit migration/deprecation plan and synchronized frontend/docs changes.
- Use consistent pagination defaults and a bounded maximum `limit`; never allow an unbounded list through a user-controlled value.
- Sorting accepts only documented allowlisted fields and `ASC`/`DESC` directions.
- Create endpoints that can be retried by clients should support a natural unique constraint or an explicit idempotency strategy when duplicate creation is harmful.
- `PATCH` updates only supplied fields. `PUT`, if used, must have documented replacement semantics.
- Return 409 for state/uniqueness conflicts, 422 or the established validation status for invalid payloads, and 404 without revealing records outside the actor's scope.

### 11.3 Uploads, Asynchronous Work, and Concurrency

- Validate upload count, declared MIME type, detected content type where feasible, extension, and size before provider upload.
- Generate storage keys on the server. Never trust a client path, filename, bucket, or ownership field.
- If database persistence fails after an upload, compensate by deleting the new object or record the cleanup for a reliable retry.
- Do not start untracked fire-and-forget promises from a request. Await critical work or hand it to an established durable job mechanism.
- Every deliberately detached promise must handle and log rejection without sensitive context.
- Use database uniqueness/foreign-key constraints for concurrency-sensitive invariants and translate their violations into the documented application error.
- Avoid read-then-write assumptions without a constraint, lock, or transaction when concurrent requests can violate the rule.

### 11.4 NestJS Unit Test Blueprint

```ts
import { Test } from '@nestjs/testing';

describe('CreateAtendenteService', () => {
  const repository = {
    findConflict: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('delegates persistence and returns the mapped response', async () => {
    repository.findConflict.mockResolvedValue(null);
    repository.create.mockResolvedValue({ id: 'atendente-id', name: 'Maria' });

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateAtendenteService,
        { provide: AtendenteRepository, useValue: repository },
      ],
    }).compile();

    const service = moduleRef.get(CreateAtendenteService);
    await expect(service.execute(validDto, actor)).resolves.toMatchObject({
      id: 'atendente-id',
    });
    expect(repository.create).toHaveBeenCalledTimes(1);
  });
});
```

Use builders for valid DTOs/entities and override only fields relevant to each test. Avoid one shared mutable fixture across cases.

## 12. Verification Commands

Run from `orfanatonib-api`:

```bash
NODE_OPTIONS='--max-old-space-size=2048' npm run build
NODE_OPTIONS='--max-old-space-size=2048' npm test -- --runInBand
NODE_OPTIONS='--max-old-space-size=2048' npm run test:cov -- --runInBand
NODE_OPTIONS='--max-old-space-size=2048' npm run lint
```

The current lint script applies fixes. Inspect the diff afterward and revert no unrelated user changes. During implementation, focused Jest paths are preferred; before delivery, run checks proportional to the affected scope.

## 13. Definition of Done

A backend change is complete only when:

- NestJS layer boundaries and public contracts are respected;
- authentication, authorization, validation, and privacy paths are covered;
- schema changes include a reviewed migration generated by the official TypeORM CLI/core, with no manual creation or edits;
- application errors preserve the standardized envelope and error code;
- relevant tests and documentation were updated;
- build, tests, coverage, and lint checks pass for the affected scope;
- no new `any`, sensitive logging, live-service test, or unrelated diff was introduced.
