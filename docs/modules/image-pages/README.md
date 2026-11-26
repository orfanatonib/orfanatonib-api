# 📸 Módulo Image Pages (Galerias de imagens)

Galerias de fotos publicadas como página dinâmica: cada galeria tem uma rota (`routes`) e **seções** (`image_sections`),
cada uma com mídias (`media_items`, `targetType = ImagesPage`) por **link** ou **arquivo** enviado ao S3. É consumida pela
página pública (`/galeria_imagens_*`), pelo painel de gestão (`/adm/paginas-fotos`) e, pelo id da galeria do feed
(`FEED_ORFANATO_PAGE_ID`), pelo feed de notícias (plano 36, `/feed-ministerio-orfanatos-nib`) — **mude junto** com
`image-section`, `shelter-feed` e `dynamic-routes`.

---

## 📁 Estrutura

```
image-page/
├── constants.ts                          nome da variável do feed, prefixo e imagem da rota
├── media-change-log.ts                   objetos enviados / sem dono numa atualização
├── entities/                             image_pages, image_sections
├── dto/                                  create, update, resposta, resposta paginada (DTO de saída, sem decorators)
├── repositories/
│   ├── image-page.repository.ts          leituras
│   └── image-page-transaction.repository.ts   único ponto que abre a transação (mesmo EntityManager em tudo)
├── services/
│   ├── create-image-page.service.ts      confere uploads → transação → descarta mídia se falhar
│   ├── update-image-page.service.ts      orquestra seção/rota/página
│   ├── update-image-page-media.service.ts mídia: linhas na transação, objetos só registrados
│   ├── delete-image-page.service.ts
│   └── get-image-page.service.ts
└── image-page.controller.ts
```

## 🔐 Endpoints, perfis e flags

| Verbo | Rota | Quem | Flag (`@FeatureFlag`) |
|---|---|---|---|
| POST | `/image-pages` | admin | `page_management` |
| PATCH | `/image-pages/:id` | admin | `page_management` |
| DELETE | `/image-pages/:id` | admin | `page_management` |
| GET | `/image-pages` | público | `public_galleries` |
| GET | `/image-pages/:id` | público | `public_galleries` |
| GET | `/image-pages/:id/sections` | público | `shelter_feed` |

- **Visibilidade:** visitante só recebe galerias `public: true` (galeria não pública é `404` para ele); com sessão, todas.
- **Paginação (`GET /:id/sections`)** é sanitizada em vez de recusada: `page` inválido/menor que 1 vira 1, `limit` inválido
  vira 2 e tem teto de 50. É de propósito (não quebra chamadas antigas, ver plano 33 §6); por isso não há DTO de query e
  `paginated-image-section.dto.ts` é só DTO de **saída**.
- **`GET /image-pages/:id`** não tem chamador no front: é contrato público para integrações e para a automação
  (`test/automations/image-pages`) e a coleção Postman; mantido por decisão de contrato.
- **Galeria do feed:** `DELETE` da galeria cujo id é `FEED_ORFANATO_PAGE_ID` (lido pelo `ConfigService`) responde `403`.
- **Flag desligada:** `403 FEATURE_DISABLED`, sem tocar no banco nem no bucket.
- **Erros:** payload inválido é `400` genérico; galeria inexistente em `PATCH`/`DELETE`/`GET` é `404` (padrão igual ao de vídeo e ideias; o front não depende do 400). Limite do Multer: 30 arquivos de 10 MB.

## 🗄️ S3 sem órfão e sem referência quebrada

- **Criar:** todo upload declarado precisa ter arquivo (`400` antes de abrir a transação ou subir qualquer objeto). Seções e
  rota vão na transação; as mídias de cada seção são gravadas pelo processador. Falha depois do upload: rollback do banco
  **e** remoção das linhas e dos objetos das seções já processadas.
- **Atualizar:** linhas de mídia mudam na transação; objetos substituídos/removidos são só **registrados** e saem do bucket
  **depois do commit** (`deleteAfterCommit`, falha vai para `media_cleanup_queue`). Falha: os uploads novos sem referência
  são descartados e os antigos continuam intactos e referenciados.
- **Apagar:** rota e página saem na transação; só depois as linhas de mídia e os objetos. Se a transação falhar, mídia e
  objetos permanecem.
- Chaves `<env>/uploads/<uuid>_<nome>` (uuid: dois uploads de mesmo nome nunca colidem).

## 🧪 Testes

- Jest: `npx jest --runInBand src/content/page/image-page` (create/update/delete com repository e S3 mockados, rollback,
  visibilidade, repository de transação).
- E2E (`orfanatonib-app/e2e/live/image-pages`): matriz `e2e/scenarios/image-page.json` (68 IDs, `npm run check:scenarios`),
  autorização e flags em `image-pages-authorization.api.spec.ts`, contrato em `image-pages.api.spec.ts`, cenários S3
  `.01–.12` em `image-pages.s3.api.spec.ts`, telas (painel, criador, galeria pública, mobile, flags) em
  `image-pages.ui.spec.ts`. Os IDs `falha-do-colaborador-sem-efeito-parcial` e `rollback-de-transacao` são provados em Jest.
- Fluxo: `docs/diagrams/flow/image-pages/image-pages-flow.puml`. Coleção Postman: `Image_Pages_API_Collection.postman_collection.json`.
