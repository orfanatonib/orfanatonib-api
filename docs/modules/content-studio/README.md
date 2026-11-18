# Content Studio

The Content Studio is an administrator-only, feature-flagged workflow for
creating, reviewing and exporting multi-audience ministry material.

## Current foundation

The foundation exposes protected contracts for catalog, package persistence and
safe provider metadata:

- `GET /content-studio/catalog`, guarded by JWT, admin role and
  `content-studio`;
- `GET /content-studio/dashboard`, guarded by JWT, admin role and
  `content-studio`;
- `POST /content-studio/packages`, guarded by JWT, admin role and
  `content-studio`;
- `GET /content-studio/packages`, guarded by JWT, admin role and
  `content-studio`;
- `GET /content-studio/packages/:id`, guarded by JWT, admin role and
  `content-studio`;
- `POST /content-studio/packages/:packageId/archive`, guarded by JWT, admin
  role and `content-studio`;
- `POST /content-studio/packages/:packageId/stages/:stageId/generations`,
  guarded by JWT, admin role, `content-studio` and
  `content-studio-generation`;
- `PATCH /content-studio/packages/:packageId/stages/:stageId/content`,
  guarded by JWT, admin role and `content-studio`;
- `POST /content-studio/packages/:packageId/stages/:stageId/complete-production`,
  guarded by JWT, admin role and `content-studio`;
- `POST /content-studio/packages/:packageId/submit-review`,
  `POST .../stages/:stageId/approve` and `POST .../request-changes`, guarded
  by JWT, admin role, `content-studio` and `content-studio-review`;
- `POST /content-studio/packages/:packageId/review-comments/:commentId/resolve`,
  guarded by JWT, admin role, `content-studio` and `content-studio-review`;
- `GET /ai-management/providers`, guarded by JWT, admin role and
  `content-studio-provider-admin`.

`GET /content-studio/packages?reviewQueue=true` applies search, status, audience
and creation-date filters in the repository and supports pagination. The review
queue also supports these filters; reviewer and last-updated filters remain
pending.
Approval and change-request bodies include the current `versionId`,
`contentChecksum` and `lockVersion`; the repository rejects stale decisions
while serializing package mutations.
The dashboard aggregates package, stage and job status counts in the database,
and returns five recent package summaries. Optional `startDate` and `endDate`
filter by package creation time; `audience` scopes stage/job counts and recent
track details. Package counts remain distinct even when all four required
audiences are present. The endpoint is admin-only; user/team scope is not
applicable to this MVP.
Review decisions are checked against the submitted version and stage lock. Each
approval/change request writes an immutable decision row in the same transaction
as the state mutation, retaining the exact version/checksum and reviewer; a
change request references its version-linked comment. Hard deletion of
referenced stages/versions is restricted by foreign keys. The detail response
and UI expose this history.

The catalog is versioned and is the frontend source of truth for audiences,
age ranges, stages, order and dependencies. All four audiences are required in
the MVP. The API never classifies a sheltered person and the contract contains
no personal data.

Package creation is transactional: one package creates all four audience tracks
and their required stages from the versioned catalog. `GET` endpoints are pure
reads and do not create stages, update templates or change approval state.

Automatic generation is fail-closed: the capability is reported unavailable
and requests return `503` until a provider adapter and durable worker are wired.
This avoids leaving a stage stuck in `GENERATING`. Saving human-authored
structured JSON creates an immutable version, cancels active
jobs for that stage, invalidates dependent versions and lets an
administrator mark the stage as producer-approved.

Manual structured content is constrained to plain JSON values (100 KB total,
12 levels, 100 items per array, 8,000 characters per string). Obvious personal
data field names (for example address, phone, diagnosis or a sheltered person's
name/ID) are rejected before persistence. This is a guardrail, not a substitute
for editorial review or a full privacy classifier.

Provider administration is deployment-owned. The response contains only the
provider name, enabled state, credential presence, health state and allowlisted
model IDs/capabilities. It never includes a credential, reference value,
prompt, response or environment variable value.

## Feature flags

| Flag | Scope |
|---|---|
| `content-studio` | catalog, hub, package reads, manual production and archive |
| `content-studio-generation` | AI generation job requests |
| `content-studio-review` | review and approval |
| `content-studio-publication` | export/publication mutations |
| `content-studio-provider-admin` | provider metadata administration |

All flags default to disabled and target administrators. Backend guards remain
mandatory even when a frontend route is hidden.

## Deployment configuration

Each provider supports an enabled switch, a server-only API key and independent
comma-separated allowlists for structured text and image models:

- `CONTENT_STUDIO_OPENAI_ENABLED`
- `CONTENT_STUDIO_OPENAI_API_KEY`
- `CONTENT_STUDIO_OPENAI_TEXT_MODELS`
- `CONTENT_STUDIO_OPENAI_IMAGE_MODELS`
- `CONTENT_STUDIO_GEMINI_ENABLED`
- `CONTENT_STUDIO_GEMINI_API_KEY`
- `CONTENT_STUDIO_GEMINI_TEXT_MODELS`
- `CONTENT_STUDIO_GEMINI_IMAGE_MODELS`

The OpenAI adapter is implemented and registered, but jobs do not call it until
the durable worker and approved stage schemas are wired. A provider feature flag
alone does not enable generation. Deployment must configure a credential, an
allowlisted model and the provider switch before a controlled activation.

## Safety baseline

- Bible input is limited to references and administrator-authored canonical
  notes; a model is not a canonical source for licensed text.
- Prompts and logs must not contain sheltered-person data.
- Provider errors returned to the UI are redacted.
- Only timeout, rate-limit and provider-server failures are retryable.
- Publication requires approval of the exact current version and never performs
  implicit approval.

See `docs/decisions/CONTENT_STUDIO_MVP_DECISIONS.md` for the complete baseline.
