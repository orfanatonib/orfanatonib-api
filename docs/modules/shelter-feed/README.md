# Feed dos abrigos v2: autoria, celebrar e comentários

Extensão do feed de fotos (`GET /image-pages/:id/sections`). O que a galeria já
decidia continua igual: visitante só vê galeria e seção públicas; com sessão,
todas. Nada disso foi relaxado.

## Autoria

- `image_sections.authorId` (FK nula para `users`, `ON DELETE SET NULL`).
- Gravada em `POST /image-sections` a partir da **sessão** (nunca do corpo).
- Seções antigas ficam sem autor: o app mostra "Autor não informado".
- Nome exibido = primeiro nome + inicial do último sobrenome ("Maria L."),
  `toPublicDisplayName` (`src/common/utils/display-name.util.ts`). Nunca e-mail
  nem telefone. **Visitante não recebe autoria** (privacidade).
- Moderação por autor: `GET /image-sections?authorId=<uuid>` (admin) e o DTO
  administrativo traz `authorId`.
- `PATCH /image-sections/:id` aceita `pageId` opcional (galeria de destino);
  omitido = galeria do feed (`FEED_ORFANATO_PAGE_ID`).

## Celebrar

| Rota | Quem | Flags |
|---|---|---|
| `POST /feed-sections/:id/celebration/toggle` | sessão | `shelter_feed` + `shelter_feed_celebrations` |
| `GET /feed-sections/:id/celebration` | visitante (só a contagem) ou sessão | idem |

- Tabela `image_section_celebrations` com `UNIQUE (sectionId, userId)`.
- Alternar é idempotente sob concorrência: o `INSERT` duplicado (`ER_DUP_ENTRY`)
  é absorvido, sem 500 e sem duplicata.
- Resposta: `{ sectionId, count, celebratedByMe }`. **Nunca lista nomes.**
- O feed traz `celebrationCount` e `celebratedByMe` em lote (2 consultas).
- Seção inexistente, ainda sem galeria ou invisível ao ator: 404.

## Comentários (com moderação)

Todo comentário nasce **PENDENTE**; o admin aprova ou reprova; só o **aprovado**
aparece para todos e entra em `commentCount`. Estados em
`FeedCommentStatus` (`pending | approved | rejected`).

| Rota | Quem | Flags |
|---|---|---|
| `GET /feed-sections/:id/comments?page&limit` | sessão (só APROVADOS) | `shelter_feed` + `shelter_feed_comments` |
| `GET /feed-sections/:id/comments/mine?page&limit` | sessão (os do próprio autor, qualquer status, com `moderationReason`) | idem |
| `POST /feed-sections/:id/comments` `{ content, requestId }` | sessão | idem |
| `DELETE /feed-section-comments/:id` | autor (o seu, em qualquer status) ou admin (qualquer) | idem |
| `GET /feed-section-comments/moderation?status&search&page&limit` | admin | idem |
| `GET /feed-section-comments/moderation/pending-count` | admin | idem |
| `PATCH /feed-section-comments/:id/approve` | admin | idem |
| `PATCH /feed-section-comments/:id/reject` `{ reason }` | admin | idem |

- **Idempotência**: `requestId` (UUID v4, obrigatório) com `UNIQUE (authorId, requestId)`.
  Reenviar o mesmo envio devolve o mesmo comentário (sem duplicar nem novo e-mail);
  o mesmo `requestId` com outro texto: 409. Comentários anteriores à moderação
  ficam `APPROVED` e sem `requestId`.
- **Limite de envios**: 5 por minuto por autor (429), porque cada pendente avisa os admins.
- **Decisão**: só um PENDENTE muda de estado (`UPDATE ... WHERE status = 'pending'`).
  Repetir a mesma decisão é idempotente (200, sem novo e-mail); a decisão contrária
  sobre um já moderado é **409**. Reprovar exige `reason` (1 a 500 caracteres; 400 sem).
- **Fila** (admin): paginada (`limit` 1 a 50), filtro `status`, busca por texto, autor
  ou legenda da publicação; devolve `counts` por status (abas) e `post` (legenda e
  capa da publicação) em cada item. O motivo só chega ao autor e ao admin.
- Máximo 500 caracteres; **recusa e-mail, telefone/documento (8+ dígitos) e links** (400).
- Visível **só com sessão** (visitante: 401). Resposta com nome do autor; `authorId`
  só para admin; `canDelete`/`isMine` calculados no servidor.
- O log registra só ids, nunca o texto.
- Tabela `image_section_comments`; apagar a seção ou o usuário apaga os comentários.

### E-mails (cada um com flag própria, ligada por padrão; `email_delivery` é a chave-mestra)

| Template | Flag | Destino | Conteúdo |
|---|---|---|---|
| `feed-comment-pending` | `email_feed_comment_pending` | admins, na chegada | autor e legenda; **sem o texto** |
| `feed-comment-approved` | `email_feed_comment_approved` | autor, ao aprovar | trecho do comentário e link do feed |
| `feed-comment-rejected` | `email_feed_comment_rejected` | autor, ao reprovar | trecho, **motivo** e link do feed |

Envio depois da decisão, nunca derruba a operação (falha só vai ao log, com ids).
Fluxo e esquema: `docs/diagrams/flow/shelter-feed` e `docs/diagrams/database`.

## Flags novas (catálogo, ligadas, público: todos)

`shelter_feed_celebrations`, `shelter_feed_comments`.

## Módulos

`feed-celebration` e `feed-photo-comment` (em `src/content/page/`) usam o
`GetImageSectionService.assertFeedSectionVisible` para checar a publicação; o
`GetImagePageService` consome os respectivos serviços `Get*` para o feed.

Diagramas: `docs/diagrams/database/shelter-feed-schema.puml` e
`docs/diagrams/flow/shelter-feed/shelter-feed-flow.puml`.

## Envio de fotos e vídeo, revisão e avisos (plano 36, Fase 8)

`POST /image-sections` (sessão; flag `shelter_photo_upload` ou `photo_moderation`) recebe
multipart: `sectionData` (JSON) + um campo por arquivo, ligado à mídia por `fieldKey`.

- **Composição**: de 1 a **10 fotos** e no máximo **1 vídeo** no mesmo post
  (o Clubinho aceita 20 fotos OU 1 vídeo, sem misturar; aqui mistura é permitido de propósito).
- **Arquivos**: foto JPG/PNG/WebP/GIF até 10 MB; vídeo **MP4/WebM/MOV** até **100 MB**
  (teto da política de mídia: 200 MB). Multer: 11 arquivos, 100 MB por arquivo.
  Vídeo é só por arquivo (link de vídeo novo é recusado). Tipo declarado, MIME, extensão,
  tamanho e assinatura dos bytes são conferidos **antes** de abrir transação
  (`validateShelterPostMedia`, `image-section/media-validation.ts`) com mensagens claras (400).
- **Autor** gravado da sessão. Quem não é admin nunca publica direto (`public=false`, sem galeria).

### Revisão (`reviewStatus`)

| Estado | Significado |
|---|---|
| `pending` | enviada, aguardando o admin (padrão) |
| `approved` | anexada à galeria pelo `PATCH /image-sections/:id` (grava `reviewedBy`/`reviewedAt`) |
| `rejected` | `PATCH /image-sections/:id/reject` `{ reason }` (admin; flag `photo_moderation`) |

- `reject`: motivo obrigatório (1–500, com trim; 400), só `pending` (aprovada → **409**), repetir
  numa já reprovada é idempotente (200, sem mudar o motivo e sem reenviar o e-mail). Reprovada **não tem
  galeria**, logo não aparece no feed de ninguém; segue na fila do admin (que pode excluir) e para o autor.
- `GET /image-sections/mine` (qualquer sessão): minhas publicações com status, contagem de fotos/vídeo e o
  `rejectionReason` (só quando reprovada). Nunca devolve publicação de outro autor.
- Migration `AddImageSectionReview`: linhas já anexadas viram `approved`, as demais `pending`.

### E-mails (cada um com flag própria, passam por `EmailDispatchService`)

| Template | Para quem | Flag | Conteúdo |
|---|---|---|---|
| `image-shared-notification` | admins (não quando o autor é admin) | `email_image_shared_notification` | nome público do autor, legenda, nº de fotos/vídeo, link `/adm/fotos-abrigos` |
| `image-rejected-notification` | autor | `email_image_rejected_notification` | legenda e o motivo; link para `/area-do-membro/imagens-abrigo` |

Disparados **depois do commit**; falha de e-mail só é logada e nunca desfaz a publicação nem a reprovação.
Flag desligada grava `skipped` no outbox. Nunca vai e-mail/telefone do autor nem arquivo.

