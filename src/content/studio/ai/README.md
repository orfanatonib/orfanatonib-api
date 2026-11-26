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

## Geração por etapa e por público (modelo do Clubinho, adaptado)

Como no Clubinho, cada etapa tem um **prompt-base imutável**, um **contrato de sistema** (conteúdo recebido é dado, nunca instrução), **esquema JSON de saída** por etapa, **campos internos** (`centralMessage`, `reviewerNotes`) que não chegam ao editor, **conteúdo aprovado a montante** como fonte fechada e **variantes anteriores** como referência negativa na regeneração. A diferença do Orfanato: **quatro públicos** — bebê (0–2), criança (3–11), adolescente (12–15) e adulto (16+).

- `ai/generation/audience-profiles.constants.ts`: por público — quem conduz (cuidador, líder, facilitador), voz, linguagem, duração, estilo de atividade, regras de segurança e **orçamentos** (palavras da lição, nº de perguntas, passos, itens visuais, minutos).
- `ai/generation/stage-prompts.constants.ts`: contrato de sistema (cuidado com pessoas em vulnerabilidade: nunca presumir pai/mãe/lar, nunca pedir que contem a própria história, sem dados pessoais) e prompt-base por etapa e público. `STAGE_PROMPT_VERSION` vai no snapshot de cada versão.
- `ai/generation/stage-output-schemas.ts`: esquema estrito por etapa (`CANONICAL_BASE`, `LESSON`, `DISCUSSION`, `ACTIVITY`, `VISUAL`, `FACILITATOR_GUIDANCE`).
- `ai/generation/stage-prompt.builder.ts`: monta instruções + entrada + esquema (puro, testado contra a política de conteúdo sensível para os 24 pares público×etapa).
- `ai/generation/stage-output.validator.ts`: valida esquema **e** regras do público (bebê: lição curta e sem perguntas; adulto: estudo longo com perguntas…), higieniza Markdown e separa os campos internos.
- Worker: `ProcessGenerationJobService` carrega o contexto (`loadStageGenerationContext`), gera, valida, grava versão + job na mesma transação. Saída fora das regras do público é **retentada** (variação do modelo); esgotadas as tentativas, a etapa fica `FAILED` sem gravar.
- Provedor simulado (`AI_PROVIDER_MODE=fake`): devolve conteúdo realista por etapa e público.
