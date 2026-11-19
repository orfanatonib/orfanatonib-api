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

## Comentários

| Rota | Quem | Flags |
|---|---|---|
| `GET /feed-sections/:id/comments?page&limit` | sessão | `shelter_feed` + `shelter_feed_comments` |
| `POST /feed-sections/:id/comments` | sessão | idem |
| `DELETE /feed-section-comments/:id` | autor (o seu) ou admin (qualquer) | idem |

- Máximo 500 caracteres; `limit` 1 a 50 (padrão 10), `page` ≥ 1; fora disso: 400.
- Texto normalizado; **recusa e-mail, telefone/documento (8+ dígitos) e links**
  (400): proteção de crianças e famílias.
- Visível **só com sessão** (visitante: 401). Resposta com nome público; `authorId`
  só para admin; `canDelete`/`isMine` calculados no servidor.
- O log registra só ids, nunca o texto.
- Tabela `image_section_comments`; apagar a seção ou o usuário apaga os comentários.

## Flags novas (catálogo, ligadas, público: todos)

`shelter_feed_celebrations`, `shelter_feed_comments`.

## Módulos

`feed-celebration` e `feed-photo-comment` (em `src/content/page/`) usam o
`GetImageSectionService.assertFeedSectionVisible` para checar a publicação; o
`GetImagePageService` consome os respectivos serviços `Get*` para o feed.

Diagramas: `docs/diagrams/database/shelter-feed-schema.puml` e
`docs/diagrams/flow/shelter-feed/shelter-feed-flow.puml`.
