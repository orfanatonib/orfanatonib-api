# 💡 Módulo Ideas Sections (Ideias Compartilhadas)

Um membro compartilha uma ideia — uma brincadeira, um versículo, uma forma de
contar uma história — com vídeos, imagens e documentos. A ideia nasce **solta**,
sem página. Depois um admin a edita e a publica numa página de ideias.

---

## 🧭 O conceito central: a seção órfã

Uma seção sem `page` é uma ideia **enviada e ainda não publicada**. É esse o
acervo que `GET /ideas-sections` devolve e que a tela administrativa gerencia —
o endpoint nunca listou tudo, só o que está esperando curadoria.

Publicar é `PATCH /ideas-sections/:id/attach/:pageId`, e acontece **uma vez**:
uma seção já vinculada responde 409.

---

## 📁 Estrutura

```
ideas-section/
├── constants.ts                  campo multipart, mensagens, defaults do banco
├── types.ts                      dicionário de arquivos, dados da seção, mapa de tipos
├── entities/                     (era "entites/", com o typo no nome)
├── enums/
├── dto/                          entradas validadas + resposta como tipo puro
├── mappers/                      entidade → DTO, agrupamento de mídia
├── repositories/                 único ponto que fala TypeORM
├── services/
│   ├── create-ideas-section.service.ts
│   ├── update-ideas-section.service.ts
│   ├── attach-ideas-section.service.ts
│   ├── get-ideas-sections.service.ts
│   ├── delete-ideas-section.service.ts
│   └── ideas-section-media.service.ts    todas as regras de mídia e S3
├── utils/ideas-section-payload.util.ts   parse e validação do multipart
└── ideas-section.controller.ts
```

---

## 🔐 Acesso

| Rota | Quem |
|------|------|
| `POST /ideas-sections` | qualquer usuário autenticado |
| `GET /ideas-sections` | qualquer usuário autenticado |
| `GET /ideas-sections/:id` | qualquer usuário autenticado |
| `PATCH /ideas-sections/:id` | admin |
| `PATCH /ideas-sections/:id/attach/:pageId` | admin |
| `DELETE /ideas-sections/:id` | admin |

As duas leituras **não tinham guard nenhum**. A seção expõe nome, e-mail e
telefone de quem a enviou, e qualquer visitante anônimo podia listar tudo.

---

## 📦 O payload multipart

O JSON da seção viaja num campo de texto chamado `sectionData`; os arquivos
vão em campos próprios, referenciados por `fieldKey`:

```
sectionData = {"title":"...","description":"...","public":true,"medias":[
  {"uploadType":"link","mediaType":"video","isLocalFile":false,"url":"https://youtu.be/..."},
  {"uploadType":"upload","mediaType":"image","isLocalFile":true,"fieldKey":"image_upload"}
]}
image_upload = <arquivo>
```

O `ValidationPipe` global não enxerga esse campo, então quem valida é
`parseIdeasSectionPayload`. Antes cada rota repetia `JSON.parse` +
`plainToInstance` + `validate`, e um campo ausente ou malformado virava **500
com a stack trace no corpo da resposta**.

### A lista de mídias é a verdade

Toda escrita reenvia a lista inteira. O que não vier nela é apagado — inclusive
o arquivo no bucket. Um item com `id` e sem arquivo novo mantém o que já está
lá; um item que deixa de ser upload tem o arquivo removido.

---

## 🐞 O que estava quebrado

- **Criar uma ideia com mídia era impossível.** `media_items.title` e
  `.description` são `NOT NULL` sem default, e o payload os declara opcionais:
  o insert morria com `Field 'description' doesn't have a default value`,
  devolvido como 400 sem sentido para quem enviava. Qualquer ideia com vídeo,
  imagem ou documento — ou seja, todas — falhava.
- **Cada `PATCH` criava uma seção nova.** `upsertSection` montava um objeto
  **sem `id`** e chamava `save`, que o TypeORM trata como inserção. A original
  ficava para trás e o cliente recebia outro id. Conferido contra o MySQL real.
- **A trava de exclusão nunca disparava.** A seção era lida sem a relação
  `page`, então o campo vinha sempre indefinido e dava para apagar uma seção já
  publicada.
- **A resposta da criação não trazia o autor**: a seção recém-salva carrega o
  usuário só como `{ id }`, e o `user` saía como `{ name: "" }`.

---

## 🧪 Testes

```bash
# backend
npx jest src/content/page/ideas-section

# contratos da API, ao vivo
npx playwright test --config=playwright.live.config.ts e2e/live/ideas-sections.api.spec.ts

# as telas, ao vivo
npx playwright test --config=playwright.live.config.ts e2e/live/ideas-sections.ui.spec.ts
```

Backend: 6 suítes e 87 testes, **98.7% stmts / 98.6% linhas**. O módulo não
tinha nenhum teste.

Frontend: **só Playwright**. `ideas-sections.ui.spec.ts` cria as ideias pela
API, dirige as telas de verdade — inclusive o envio de uma ideia por um membro,
o caminho que estava quebrado — e confere na API o que a tela gravou.

---

## 📌 Débitos conhecidos

- `content/page/ideas-page` mantém **a sua própria** `IdeasSectionRepository`,
  uma segunda classe com o mesmo nome sobre a mesma entidade. Some quando
  aquele módulo for refatorado; este já exporta `GetIdeasSectionsService` como
  contrato de leitura.
- A criação não é transacional: o upload sai do banco. A compensação é
  explícita — se a mídia falhar, a seção recém-criada é removida.
- `mediaType` aceita três tipos (vídeo, documento, imagem); a tabela
  compartilhada conhece quatro. O áudio nunca foi oferecido pela tela e
  continua recusado.
