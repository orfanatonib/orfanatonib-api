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
- `POST /content-studio/packages/:packageId/publish` and
  `GET /content-studio/packages/:packageId/publication`, guarded by JWT, admin
  role, `content_studio` and `content_studio_publication` (see "Publicação");
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
age ranges, stages, order and dependencies. New clients choose one audience per material; legacy requests without an
`audience` still create the four audience tracks. The API never classifies a sheltered person and the contract contains
no personal data.

Package creation is transactional: one package creates the selected audience track
and its required stages from the versioned catalog. Omitting the optional
`audience` retains four-track creation. `allAudiencesRequired` is now `false`. `GET` endpoints are pure
reads and do not create stages, update templates or change approval state.

Generation availability follows `content-studio-generation`. The registered worker
processes structured text jobs and validates stage/audience output before saving
an immutable version. Visual stages currently generate a structured visual plan,
not image assets. Provider credentials and model configuration remain server-owned.
Saving human-authored structured content cancels active jobs for that stage,
invalidates dependent versions and lets an administrator mark the stage as
producer-approved.

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

The module registers provider adapters and a generation worker. Deployment must
configure a credential, an allowlisted model and the provider switch before
activation. The catalog flag reports the enabled workflow, not a live provider
health probe. This change does not modify deployment configuration.

## Safety baseline

- Bible input is limited to references and administrator-authored canonical
  notes; a model is not a canonical source for licensed text.
- Prompts and logs must not contain sheltered-person data.
- Provider errors returned to the UI are redacted.
- Only timeout, rate-limit and provider-server failures are retryable.
- Publication requires approval of the exact current version and never performs
  implicit approval.

See `docs/decisions/CONTENT_STUDIO_MVP_DECISIONS.md` for the complete baseline.

## Single-audience creation

`POST /content-studio/packages` accepts optional `audience`: `BABY`, `CHILD`,
`TEEN`, or `ADULT`. Unknown values fail DTO validation. Other fields and response
contracts remain unchanged. Filtering and completion use the persisted tracks;
existing four-track packages retain their original workflow. No schema change
is required.

```json
{
  "audience": "ADULT",
  "theme": "Esperança",
  "biblicalReferences": "Salmos 23",
  "canonicalObjective": "Compreender o cuidado de Deus"
}
```

## Fila de geração: em processo (decisão vigente)
A fila do Estúdio é `InMemoryAiJobQueue` atrás de `AiJobQueuePort`; **não há Redis/BullMQ**. Consequências: jobs em voo morrem no deploy e só voltam pelo reconciliador (a cada 60 s, por lease vencido); a concorrência (`CS_QUEUE_CONCURRENCY`, padrão 2) vale por processo, sem fila compartilhada entre instâncias. Trocar por BullMQ exige autorização de infra (regra 16) e um novo adaptador da mesma porta.

## Acompanhamento pelo front
- `POST .../stages/:stageId/generations` responde **202** (aceito na fila).
- `GET .../stages/:stageId/generations/latest` devolve o job mais recente da etapa (vazio se nunca houve): `status` (`PENDING`, `RUNNING`, `RETRY_SCHEDULED`, `SUCCEEDED`, `FAILED`, `CANCELLED`), `attempts` e `errorCode`.
- O front faz polling a cada 2 s (teto de 5 min), cancelável, e mostra mensagem por `errorCode`.

## Tipos de erro do provedor
`TIMEOUT`, `RATE_LIMIT`, `SERVER`, `NETWORK` (tentam de novo); `AUTHENTICATION`, `QUOTA`, `SAFETY`, `SCHEMA`, `NOT_FOUND_MODEL`, `CONTEXT_LENGTH`, `INVALID_REQUEST`, `CANCELLED`, `UNKNOWN`. A tradução de resposta HTTP é única (`ai/utils/provider-http-error.util.ts`), usada por OpenAI e Gemini.

## Painel "Provedores e Modelos IA" (ChatGPT/OpenAI e Gemini)
Tela `/adm/config-provedores-ia` (link no sidebar do Estúdio e no rodapé, só admin, flags `content_studio` + `content_studio_provider_admin`), igual à do Clubinho.

| Rota (só admin) | O que faz |
|---|---|
| `GET /api/v1/lessons/providers/settings` | provedor ativo, modelos e `hasApiKey` por provedor (nunca a chave) |
| `PUT /api/v1/lessons/providers/settings` | salva provedor ativo + blocos; `apiKey` omitida mantém, `""` remove, valor cifrado (`enc:`) é recusado; o provedor ATIVO precisa ter chave |
| `GET/PUT /api/v1/lessons/providers/{openai,gemini}/settings` | um provedor só (é por aqui que se remove a chave de um provedor) |
| `GET /api/v1/lessons/providers/{openai,gemini}/models` | lista de modelos ao vivo com a chave salva; sem chave ou com falha, lista padrão com o motivo |

Chave cifrada no banco (AES-256-GCM) com `AI_PROVIDER_SETTINGS_ENCRYPTION_KEY` (obrigatória fora do `local`). Ver `docs/decisions/AI_PROVIDER_SECRETS_ADR.md` (revisão de 2026-11-19).
O Estúdio usa o provedor, a chave e os modelos salvos na **próxima geração** (`ConfiguredAiGenerationGateway`); sem chave salva, vale o ambiente.

## Documento rico e exportação (DOCX/PDF)
Núcleo portado do Clubinho, adaptado ao Estúdio (`src/content/studio/export/`):

- **Documento por versão:** cada versão guarda `structuredContent` (fonte para a IA e a validação) e, opcionalmente, `contentDocument` (TipTap/ProseMirror, editado à mão). Sem `contentDocument`, a prévia e a exportação **montam o documento a partir dos campos** (`stage-document.builder.ts`, um montador por tipo de etapa). Salvar pelos campos descarta a edição do documento; salvar o documento mantém os campos da versão atual.
- **Salvar:** `PATCH /content-studio/packages/:id/stages/:stageId/content` aceita `contentDocument` (raiz `doc`, até 1,5 MB e 32 níveis; texto passa pela checagem de dados pessoais). O limite do corpo JSON da API é 4 MB.
- **Ler para o editor:** `GET .../stages/:stageId/document` → `{ document, edited, versionId }`.
- **Exportar** (sempre a versão atual SALVA; rascunho local não entra): `GET .../stages/:stageId/export/{pdf|docx}`, `GET .../tracks/:audience/export/{pdf|docx}`, `GET .../export/{pdf|docx}` (todas as faixas). PDF abre inline; DOCX baixa. Sem conteúdo salvo ⇒ 422.
- **DOCX:** `tiptap-docx.renderer.ts` converte o documento (títulos, listas, citações, tabelas, marcas, links) com a biblioteca `docx`; `studio-docx.service.ts` monta capa, cabeçalho "Orfanatos NIB · Material para visita", rodapé com paginação e uma seção por etapa.
- **PDF:** `pdf-libreoffice.service.ts` roda `soffice --headless` num processo isolado (perfil temporário próprio, grupo de processos morto no timeout), com fila (2 conversões simultâneas por padrão, `PDF_CONVERSION_MAX_CONCURRENCY`), cache por versões (as versões são imutáveis) e verificação da assinatura `%PDF-`. **Requer `libreoffice-writer` e as fontes `font-carlito`/`font-liberation` na imagem** (já no `Dockerfile`).

## Histórico de revisão (enviar → ajustar → reenviar)
Cada item guarda a sua linha do tempo em `content_review_decisions` (já vem em `reviewDecisions` de cada etapa): `SUBMITTED` (envio para a revisão; `reviewerId` = quem enviou), `CHANGES_REQUESTED` (ajuste pedido, ligado à observação por `related_comment_id`) e `APPROVED`. O primeiro `SUBMITTED` é o envio; os seguintes, depois de um ajuste, são reenvios (cada um com a **versão** enviada). Só os itens que realmente mudam para `IN_REVIEW` geram evento, então reenviar uma categoria não repete o envio dos itens que já estavam lá. As telas de Revisão e de Produção mostram a mesma lista (`ReviewTimeline`). Migration: `AddSubmittedReviewDecision` (novo valor do enum).

## Publicação como página de materiais para visita (incremental por categoria)
"Publicar" leva à página de **Materiais para Visita** (`visit_material_pages`, rota pública `/<route.path>`) as categorias **aprovadas e ainda não publicadas**. A página é uma só por material (`sourceLessonId = packageId`, índice único) e **cresce por categoria**: o BABY pode ser revisado e publicado primeiro; depois, só as crianças (ou as demais) são enviadas, revisadas e publicadas **na mesma página**, sem tocar no que já foi publicado.

- **`POST /content-studio/packages/:packageId/publish`** — admin, flags `content_studio` + `content_studio_publication`. Corpo: `{ idempotencyKey: string (<=191), testament?: OLD_TESTAMENT | NEW_TESTAMENT }` (o testamento só vale na primeira publicação, quando a página é criada). Resposta (sempre DTO): `id, packageId, status, targetType, visitMaterialPageId, audiences, visitMaterialPagePath, publishedAt, errorCode, errorMessage, createdAt`. `audiences` = categorias levadas por esta publicação (`null` em publicação antiga, que levava o pacote inteiro).
- **`GET .../publication`** — última publicação (200) ou **204** se nunca houve.
- **Categoria publicável:** todas as etapas obrigatórias `APPROVED` (com versão) e `published_at` nulo. O pacote fica `READY_FOR_PUBLICATION` assim que existe **ao menos uma**; as outras (em revisão, devolvidas ou em produção) não seguram a publicação das aprovadas. Sem nenhuma publicável => **409**.
- **Fluxo (3 fases):** (1) transação: `READY_FOR_PUBLICATION -> PUBLISHING` + publicação `PUBLISHING` (`approvedVersions` e `audiences` só das categorias publicáveis); (2) fora de transação: renderizar DOCX/PDF só dessas categorias e **criar a página** (primeira vez) ou **acrescentar as seções que faltam** (`AppendVisitMaterialSectionsService`: só cria, recusa categoria que a página já tem e nunca altera ou remove seção existente); (3) transação: marca as categorias (`content_tracks.published_at` e `publication_id`), publicação `PUBLISHED` e o pacote vai a `PUBLISHED` (todas as categorias na página) ou volta ao caminho das demais (`IN_REVIEW`, `CHANGES_REQUESTED`, `READY_FOR_PUBLICATION` ou `IN_PROGRESS`).
- **Material completo:** só é gerado (e vai em "Geral") quando, depois da publicação, todas as categorias estão na página.
- **Categoria publicada fica travada:** editar, gerar, concluir produção e reenviar para revisão devolvem **409**. Pacote antigo `PUBLISHED` conta todas as categorias como publicadas (sem backfill).
- **Idempotência:** a mesma `idempotencyKey` devolve a mesma publicação (de outro material => 409).
- **Falha:** erro ao renderizar/criar/acrescentar => publicação `FAILED` (`errorCode` estável) e o pacote volta a `READY_FOR_PUBLICATION`; tentar de novo exige outra chave. Página gravada mas estado final não => `UNCERTAIN` (pacote segue `PUBLISHING`); a próxima chamada **reconcilia pelo que a página realmente tem**: só completa se ela tiver **todas** as categorias da publicação; senão `FAILED(INTERRUPTED)`. `PUBLISHING` parado há mais de 10 min é interrompida.
- **Banco:** migrations `AddContentPublicationVisitMaterialPage` e `AddIncrementalPublicationByTrack` (`content_tracks.published_at`, `content_tracks.publication_id`, `content_publications.audiences`).
- **Estados do pacote:** novas transições `CHANGES_REQUESTED <-> READY_FOR_PUBLICATION` e `PUBLISHING -> IN_REVIEW | CHANGES_REQUESTED | IN_PROGRESS`; a decisão de revisão e o envio para revisão também valem com o pacote `READY_FOR_PUBLICATION` (outra categoria pode seguir em revisão).
- **Listagem:** cada item traz `publishedAudiences` (faixas já publicadas); as duas telas (Produção e Revisão) derivam dele e das etapas o seu status e botão.
- **Front:** a publicação mora na tela de **Revisão** (`/adm/estudio/revisao/:id`): "Aprovar tudo" e "Publicar"; ao publicar vai para `/adm/paginas-materiais-visita`. A produção não aprova nem publica.
- **Limites conhecidos:** a rota pública da página é a dinâmica `/<route.path>` (as páginas dinâmicas ficam na raiz); despublicar/atualizar a página a partir do Estúdio não existe (apagar a página em Materiais para Visita não devolve o material a `READY`).

## Fixação do versículo com peças e nova geração de item concluído

A etapa `VERSE_FIXATION` gera o documento, uma folha de instruções (`compilado-01`) e uma imagem por peça do jogo
(`peca-01…`, `peca-referencia`), todas em A4 paisagem; os perfis por público ficam em
`ai/generation/verse-fixation.constants.ts`. Um item `PRODUCER_APPROVED` pode ser gerado de novo: ao concluir, os
itens seguintes da categoria que já têm versão ficam `STALE`. Com algum item `IN_REVIEW` ou `APPROVED` na categoria,
só o item devolvido pelo revisor pode ser gerado (409 para os demais). Fluxo em
`docs/diagrams/flow/content-studio/content-studio-regeneration.puml`.

## Brincadeira divertida com kit de peças (prompts 2.6.0)

A etapa `STANDARD_GAME` segue o modelo da fixação: documento, folha de instruções em A4 paisagem (`compilado-NN`) e o kit imprimível, uma imagem por peça (`peca-NN`; `jogo2-peca-NN` na segunda brincadeira das crianças). As peças de um jogo são geradas a partir da primeira, usada como imagem de referência. Crianças e adolescentes podem ter movimento; bebês e adultos ficam em espaço pequeno. Regras em `ai/generation/game-kit.constants.ts`; fluxo em `docs/diagrams/flow/content-studio/content-studio-fun-images.puml`.
