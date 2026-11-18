# Content Studio AI boundary

This directory contains the vendor-neutral boundary used by Content Studio.
It intentionally does not select a provider, model, credential mechanism,
timeout, retry policy or budget. Those choices remain blocked by the approved
AI policy and the secrets/async ADRs.

Provider adapters must implement `AiGenerationGateway`. They must return typed
results, never expose credentials, and treat structured output as untrusted
until the application layer validates it against the approved editorial schema.

The gateway currently defines four capabilities required by the implementation
plan:

- structured text generation;
- image generation;
- model discovery by capability;
- provider health checks.

`OpenAiGenerationGateway` implements structured text with the Responses API
and illustration generation with the Images API. It resolves credentials on
the server, selects only deployment-allowlisted model IDs, disables response
storage for text, applies abortable timeouts and returns sanitized error kinds.
The adapter is registered but not invoked by jobs until the durable worker,
approved stage schemas and safety rollout gates are complete.
