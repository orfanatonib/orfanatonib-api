# 📚 Módulo Visit Material Pages (Materiais de Visita)

Páginas de material de visita, cada uma com sua rota pública e quatro acervos de
mídia: vídeos, documentos, imagens e áudios.

- **Contrato detalhado dos endpoints**: [`docs/MODULO_MATERIAIS_VISITA.md`](../../MODULO_MATERIAIS_VISITA.md)
- **Diagrama de fluxo**: [`docs/diagrams/flow/visit-material-page/`](../../diagrams/flow/visit-material-page/visit-material-page-flow.puml)

---

## 📁 Estrutura

```text
src/content/page/visit-material-page/
├── visit-material-page.module.ts
├── visit-material-page.controller.ts
├── constants.ts                 # prefixo da rota, imagem do card, mensagens
├── types.ts                     # dicionário de arquivos, acervos, agrupamentos
├── enums/testament-type.enum.ts
├── dto/
│   ├── visit-material-media.dto.ts        # os quatro acervos, compartilhados
│   ├── create-visit-material-page.dto.ts
│   ├── update-visit-material-page.dto.ts
│   ├── query-visit-material-pages.dto.ts
│   └── visit-material-page-response.dto.ts
├── entities/visit-material-page.entity.ts
├── mappers/visit-material-page.mapper.ts
├── repositories/visit-material-page.repository.ts
├── services/
│   ├── create-visit-material-page.service.ts
│   ├── get-visit-material-page.service.ts
│   ├── update-visit-material-page.service.ts
│   ├── delete-visit-material-page.service.ts
│   ├── set-current-visit-material-page.service.ts
│   └── visit-material-media.service.ts    # regras de mídia dos quatro acervos
└── utils/visit-material-payload.util.ts   # parse do multipart, acervos, arquivos
```

---

## 🎛️ Um acervo, uma rotina

A página tem quatro acervos de mídia e **nenhum deles tem regra própria**: o tipo
é um parâmetro. `VisitMaterialMediaService` concentra listar, remover o que saiu
do payload, criar e atualizar — para vídeo, documento, imagem e áudio.

```ts
for (const [mediaType, incoming] of VisitMaterialMediaService.toEntries(buckets)) {
  await this.mediaService.removeMissing(stored.get(mediaType) ?? [], incoming);
}
```

O serviço de update lê a mídia armazenada **uma vez** e agrupa por tipo, em vez
de consultar o banco uma vez por acervo.

---

## 🔐 Autenticação

Todas as rotas exigem `JwtAuthGuard`. Escrita exige também `AdminRoleGuard`:

| Rota | Guard |
|------|-------|
| `GET /visit-material-pages` | JWT |
| `GET /visit-material-pages/current-material` | JWT |
| `GET /visit-material-pages/:id` | JWT |
| `POST /visit-material-pages` | JWT + Admin |
| `PATCH /visit-material-pages/:id` | JWT + Admin |
| `POST /visit-material-pages/current-material/:id` | JWT + Admin |
| `DELETE /visit-material-pages/:id` | JWT + Admin |

---

## 📦 Payload multipart

O corpo chega como `multipart/form-data` com o JSON da página em um único campo
de texto, `visitMaterialsPageData`, e os arquivos nos demais campos. O
`ValidationPipe` global **não enxerga** esse campo, então o controller faz o
parse e a validação por `parseVisitMaterialPayload`, antes de chamar o caso de
uso — e os serviços recebem um DTO já validado.

Cada item de mídia enviado como upload precisa de um `fieldKey` apontando para o
campo do arquivo. Um upload sem `fieldKey`, ou com `fieldKey` sem arquivo
correspondente, é recusado com `400` **antes** de qualquer escrita.

---

## 🔁 Transações

| Operação | Escopo atômico |
|----------|----------------|
| `POST` | página + rota + processamento de mídia |
| `PATCH` | gravação da página (mídia e rota são reconciliadas antes) |
| `POST /current-material/:id` | despromoção da anterior + promoção da nova |
| `DELETE` | remoção da rota + remoção da página |

> Arquivos no S3 não participam da transação — um upload não é revertido por um
> rollback. O que o rollback garante é que a página não fica gravada pela metade.

---

## 🧪 Testes

```bash
NODE_OPTIONS='--max-old-space-size=2048' npx jest src/content/page/visit-material-page --runInBand
```

119 testes. Cobertura do escopo: **95% de statements, 98% de branches, 99% de
funções**.
