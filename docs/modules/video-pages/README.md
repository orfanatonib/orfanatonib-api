# 🎥 Módulo Video Pages (Páginas de vídeos)

Galerias de vídeos publicadas como página dinâmica: cada página tem uma rota (`routes`), vídeos por **link**
(YouTube, Drive, OneDrive, Dropbox) ou **arquivo** enviado ao S3. É consumida pela página pública, pela
Área do Membro (`/area-do-membro/videos`) e pelo painel de gestão (`/adm/paginas-videos`).

---

## 📁 Estrutura

```
video-page/
├── constants.ts                       prefixo/imagem da rota, mensagens
├── utils.ts                           mídia removida, URLs locais, motivo do erro (sem stack)
├── entities/video-page.entity.ts      `videos_pages` (+ rota 1:1)
├── dto/                               create, update e resposta
├── repositories/                      único ponto que fala TypeORM (transação, trava, mídia)
├── services/
│   ├── create-video-page.service.ts
│   ├── update-video-page.service.ts
│   ├── delete-video-page.service.ts
│   ├── get-video-page.service.ts
│   └── video-page-media.service.ts    monta cada vídeo; sobe arquivos no lote descartável
└── video-page.controller.ts
```

## 🔐 Endpoints, perfis e flags

| Verbo | Rota | Quem | Flag (`@FeatureFlag`) |
|---|---|---|---|
| POST | `/video-pages` | admin | `page_management` |
| PATCH | `/video-pages/:id` | admin | `page_management` |
| DELETE | `/video-pages/:id` | admin | `page_management` |
| GET | `/video-pages` | público | `anyOf` `public_videos`, `training_videos`, `page_management` |
| GET | `/video-pages/:id` | público | `anyOf` idem |

- **Contrato de saída:** `videos` é `VideoMediaResponseDto[]` (id, title, description, mediaType, uploadType, platformType, url, isLocalFile, originalName, size, createdAt, updatedAt); `storageKey`, `targetId` e `targetType` da `MediaItemEntity` **não** são expostos (mapeado em `VideosPageResponseDto.fromEntity`, usado por get/create/update/list).
- **Visibilidade:** visitante (sem sessão) só recebe páginas `public: true`; página não pública é `404` para ele.
  Com sessão válida, todas.
- **Flag desligada:** `403 FEATURE_DISABLED`, sem tocar no banco nem no bucket.
- **Erros:** página inexistente é `404` (update/delete/get); payload inválido é `400`; arquivo recusado
  (`MEDIA_MIME`, `MEDIA_SIZE`, `MEDIA_EMPTY`, `MEDIA_CONTENT`) é `400`; limite do Multer: 10 arquivos de 200 MB.
- Mídia de **outra** página referenciada pelo `id` no PATCH é `404` (não pode ser reivindicada).

## 🗄️ S3 sem órfão e sem referência quebrada

- Os arquivos sobem com `MediaStorageService` (chave única `<env>/VideosPage/<paginaId>/<uuid>.<ext>`).
- **Criar:** página, rota e linhas de mídia na mesma transação; os objetos enviados só ficam se ela confirmar
  (`UploadBatch.commit`), senão são descartados (`discard`).
- **Atualizar:** a transação **trava a página** (`SELECT ... FOR UPDATE`) e lê a mídia já dentro dela, então
  edições simultâneas se enfileiram. Objetos novos sobem → linhas gravadas → só **depois do commit** saem os
  objetos antigos (`deleteAfterCommit`). Falha: novos descartados, antigos intactos e referenciados.
- **Apagar:** linhas, página e rota numa transação; os objetos saem do bucket depois do commit. Falha ao
  remover do S3 vai para `media_cleanup_queue` (nunca derruba a exclusão nem é engolida).
- Logs de erro registram só a **causa** (`error.message`), nunca o stack.

## 🧪 Testes

- Jest: `npx jest --runInBand src/content/page/video-page` (specs de create/update/delete/get, utils, visibilidade).
- E2E (`orfanatonib-app/e2e/live/video-pages`): matriz `e2e/scenarios/video-page.json` (60 IDs), cenários S3
  `.01–.12` em `video-pages-s3.api.spec.ts`, telas em `video-pages.ui.spec.ts`, flags em
  `video-pages-flags.ui.spec.ts`. `video-page.s3.11` é provado em Jest (falha real de remoção no S3 → fila).
- Fluxo: `docs/diagrams/flow/video-pages/video-pages-flow.puml`. Coleção Postman: `Video_Pages_API_Collection.postman_collection.json`.
