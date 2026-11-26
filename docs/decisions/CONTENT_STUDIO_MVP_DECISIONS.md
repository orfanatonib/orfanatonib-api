# Content Studio MVP decisions

**Status:** adopted implementation baseline  
**Date:** 2026-10-01  
**Scope:** internal, administrator-only MVP

This record resolves the implementation choices that can safely default to the
most restrictive behavior. It does not authorize a real AI credential, public
publication, copyrighted Bible text, or production rollout.

## Domain and editorial catalog

- One package contains all four required audiences.
- `BABY`: 0–2 years; `CHILD`: 3–11 years; `TEEN`: 12–15 years;
  `ADULT`: 16 years and older.
- Display names are Bebê, Criança, Adolescente and Adulto.
- The versioned catalog in `src/content/studio/constants.ts` is the single
  source for stage order, requirements and dependencies.
- The administrator selects an audience; the application never classifies a
  sheltered person or sends their age or personal data to an AI provider.

## Authorization

- The MVP is administrator-only for catalog, production, review, publication,
  dashboard and provider administration.
- API guards and capability-specific flags are authoritative. UI visibility is
  only an additional usability boundary.
- Broader leader access requires a new decision and shelter/team scope design.

## Bible and content safety

- The MVP accepts Bible references and administrator-authored canonical notes.
- It does not fetch, reproduce or ask a model to quote a licensed translation.
- Generated images must be illustrations and must not portray or imitate a
  real or identifiable sheltered person.
- Prompts reject requests for names, documents, diagnoses, legal situations,
  trauma histories, exact locations or other personal data.

## Publication

- No direct public publication is enabled in the foundation phase.
- The first export target is a reviewable PDF artifact. Publishing to an
  existing site entity remains disabled until its mapping and rollback are
  approved.
- Publication never approves content and always requires approval of the exact
  current version.

## Asynchronous execution

- The MVP queue uses MySQL rows with atomic claim, worker ID, lease expiry,
  heartbeat and recovery of expired jobs.
- This design targets low internal volume. A dedicated queue is required if
  measured concurrency or latency exceeds the documented operating limits.
- No in-memory timer is a delivery guarantee.

## Providers and secrets

- Provider adapters are disabled until explicitly configured by deployment.
- Secrets are resolved server-side from environment/secret references and are
  never stored in Content Studio tables or returned to the browser.
- Text and image capabilities are configured independently. There is no silent
  fallback.
- Model allowlists, retry rules, timeout, budget and usage snapshots are
  mandatory before enabling generation.

## Retention

- Versions, review decisions, publications and usage metadata are immutable
  audit records during the MVP.
- Packages are archived, not hard-deleted, after they have generated content.
- Generated assets may only be removed by a later documented retention job
  that proves they are not referenced by a version or publication.

## Rollout gates that remain external

The following evidence cannot be manufactured by implementation and remains a
release gate: restored-schema drift exercises for every environment, backup and
rollback approval, real-provider sandbox account and budget owner, credential
rotation evidence, ministry review of the editorial catalog, load results and
production rollout authorization.

