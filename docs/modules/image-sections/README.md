# 📷 Módulo Image Sections (publicações de fotos e vídeo dos abrigos)

Fila de **publicações** enviadas por membros, líderes e admins (`image_sections`, mídias em `media_items` com
`targetType = ImagesPage`). Quem não é admin propõe; o admin revê, **aprova** (anexa à galeria do feed) ou **reprova**
(com motivo). Consumido pela área do membro (`/area-do-membro/imagens-abrigo`), pelo painel (`/adm/fotos-abrigos`) e,
depois de aprovada, pelo feed (`shelter-feed`, plano 36) via `image-page`. **Mude junto** com `image-page` e `shelter-feed`.

---

## 📁 Estrutura

```
image-section/
├── constants.ts                         limites, formatos, mensagens
├── media-validation.ts                  composição (≤10 fotos + 1 vídeo), tipo, tamanho e assinatura
├── dto/                                 create, update, reject, resposta, minhas, contagem de pendentes
├── repositories/
│   ├── image-section.repository.ts      leituras e `countPending`
│   └── image-section-transaction.repository.ts   único ponto que abre a transação (mesmo EntityManager em tudo)
├── services/
│   ├── create-image-section.service.ts  publicação na transação; mídia descartada se algo falhar; avisa os admins
│   ├── update-image-section.service.ts  aprovar/editar: trava a linha, mídia na transação, objetos só depois do commit
│   ├── delete-image-section.service.ts  linhas e publicação na transação; objetos só depois do commit
│   ├── reject-image-section.service.ts
│   └── get-image-section.service.ts
└── image-section.controller.ts
```

## 🔐 Endpoints, perfis e flags

| Verbo | Rota | Quem | Flag (`@FeatureFlag`) |
|---|---|---|---|
| POST | `/image-sections` | qualquer sessão (membro/líder/admin) | `shelter_photo_upload` **ou** `photo_moderation` |
| GET | `/image-sections/mine` | qualquer sessão (só as próprias) | `shelter_photo_upload` ou `photo_moderation` |
| GET | `/image-sections` (`?authorId=`) | admin | `photo_moderation` |
| GET | `/image-sections/pending-count` | admin | `photo_moderation` |
| GET | `/image-sections/:id` | admin | `photo_moderation` |
| PATCH | `/image-sections/:id` | admin | `photo_moderation` |
| PATCH | `/image-sections/:id/reject` | admin | `photo_moderation` |
| DELETE | `/image-sections/:id` | admin | `photo_moderation` |

- **Autoria:** gravada da **sessão** (`authorId`); o corpo não aceita `authorId` nem `reviewStatus` (`forbidNonWhitelisted`, `400`).
- **Publicação direta só do admin:** de quem não é admin, `public` é forçado a `false`; a seção nasce `pending`, sem galeria.
- **Aprovar (`PATCH`)** anexa à galeria (`pageId` do corpo ou `FEED_ORFANATO_PAGE_ID`, lido pelo `ConfigService`), grava
  `reviewStatus = approved`, `reviewedBy`, `reviewedAt` e limpa o motivo. Mídia de **outra** publicação não pode ser reaproveitada (`400/404`).
- **`GET /image-sections/pending-count`** devolve `{ pending }` (selo do painel admin, que atualiza a cada 60 s).
- **Erros:** payload inválido `400`; `PATCH`/`DELETE`/`GET` de id inexistente `404` (padrão do projeto); flag desligada
  `403 FEATURE_DISABLED` sem tocar no banco nem no bucket; sem token `401`; membro/líder nas rotas de admin `403`.
- **`GET /image-sections/:id`** não tem chamador no front: é contrato para integrações e para a coleção Postman (decisão mantida).
- **E-mails (flags próprias):** `email_image_shared_notification` (admins, quando um não-admin publica; o admin publicando não
  avisa ninguém) e `email_image_rejected_notification` (autor, com o motivo). Aprovar e apagar não enviam e-mail.

## 🗄️ S3 sem órfão e sem referência quebrada

- **Criar:** tudo é validado antes da transação (`400`, nada sobe). A publicação grava na transação; as mídias sobem e gravam
  em seguida. Se algo falha depois de as mídias gravarem, linhas e objetos são removidos (`deleteAfterCommit`).
- **Aprovar/editar:** `SELECT ... FOR UPDATE` na publicação (duas edições simultâneas se enfileiram) e **todas** as linhas
  (publicação e mídia) na MESMA transação. Os objetos novos sobem durante a transação e, em falha, são descartados; os
  substituídos/removidos só saem do bucket **depois do commit** (falha de remoção vai para `media_cleanup_queue`).
- **Apagar:** mídia e publicação saem na transação; os objetos só depois do commit.
- Chaves `<env>/uploads/<uuid>_<nome>` (dois uploads de mesmo nome nunca colidem).

## 🧪 Testes

- Jest: `NODE_OPTIONS='--max-old-space-size=2048' npx jest --runInBand src/content/page/image-section` (create/update/delete/get/reject
  com repository e S3 mockados, rollback, guards, repository de transação). Os IDs `falha-do-colaborador-sem-efeito-parcial`
  e `rollback-de-transacao` da matriz são provados aqui.
- E2E (`orfanatonib-app/e2e/live/image-sections`): matriz `e2e/scenarios/image-section.json` (66 IDs, `npm run check:scenarios`);
  autorização e flags em `image-sections-authorization.api.spec.ts`, contrato com prova por SELECT em
  `image-sections.api.spec.ts`, cenários S3 `.01–.12` em `image-sections.s3.api.spec.ts`, telas (envio, fila, aprovar,
  reprovar, excluir, selo, perfis, flags, mobile 375 px) em `image-sections.ui.spec.ts`.
- Fluxo: `docs/diagrams/flow/image-sections/image-sections-flow.puml`. Coleção Postman: `Image_Sections_API_Collection.postman_collection.json`.
