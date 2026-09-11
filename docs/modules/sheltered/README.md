# 👶 Módulo Sheltered (Acolhidos)

Módulo responsável pelo cadastro dos acolhidos, seu vínculo com um abrigo e seu
endereço. Segue o layout padrão descrito em
[`docs/ORFANATO_BACKEND_BEST_PRACTICES.md`](../../ORFANATO_BACKEND_BEST_PRACTICES.md).

**Diagrama de fluxo**: [`docs/diagrams/flow/sheltered/sheltered-flow.puml`](../../diagrams/flow/sheltered/sheltered-flow.puml)

---

## 📁 Estrutura

```text
src/shelter/sheltered/
├── sheltered.module.ts
├── sheltered.controller.ts
├── constants.ts                  # defaults de paginação, allowlist de ordenação, mensagens
├── types.ts                      # ShelteredAccessContext, PaginatedRows, filtros
├── enums/                        # gênero, ordenação, filtros de status e decisão
├── dto/                          # entradas (create/update/query) e contratos de resposta
├── entities/sheltered.entity.ts
├── mappers/sheltered.mapper.ts
├── repositories/sheltered.repository.ts
├── services/
│   ├── create-sheltered.service.ts
│   ├── get-sheltered.service.ts
│   ├── update-sheltered.service.ts
│   ├── delete-sheltered.service.ts
│   └── sheltered-shelter-access.service.ts   # autoriza o vínculo com o abrigo
└── utils/                        # datas, contexto de acesso, referência de relação
```

---

## 🔐 Autenticação e escopo

Todas as rotas exigem `JwtAuthGuard`. O ator é lido de `request.user` (populado
pelo guard) e convertido em `ShelteredAccessContext` (`{ userId, role }`) pelo
controller — os serviços nunca recebem o objeto `Request`.

| Papel | Visibilidade |
|-------|--------------|
| `admin` | todos os acolhidos |
| `leader` | acolhidos dos abrigos cujas equipes ele lidera |
| `member` | acolhidos dos abrigos cujas equipes ele integra |

Um papel ausente ou desconhecido no token é degradado para `null` e não recebe
escopo privilegiado.

> **Registro fora do escopo retorna `404`, não `403`.** Um acolhido ou abrigo que
> o ator não enxerga é indistinguível de um inexistente, conforme
> `ORFANATO_BACKEND_BEST_PRACTICES.md` §11.2.

---

## 📡 Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/sheltered` | Lista paginada com filtros e ordenação |
| `GET` | `/sheltered/simple` | Lista enxuta para seletores (usada pelas pagelas) |
| `GET` | `/sheltered/:id` | Detalhe |
| `POST` | `/sheltered` | Cria |
| `PUT` | `/sheltered/:id` | Atualiza (apenas campos enviados) |
| `PATCH` | `/sheltered/:id/status` | Ativa/inativa |
| `DELETE` | `/sheltered/:id` | Remove |

### `GET /sheltered` — query

| Parâmetro | Tipo | Default | Observação |
|-----------|------|---------|------------|
| `page` | inteiro ≥ 1 | `1` | |
| `limit` | inteiro 1–100 | `20` | limite máximo obrigatório |
| `orderBy` | `name` \| `birthDate` \| `joinedAt` \| `createdAt` \| `updatedAt` | `name` | allowlist; qualquer outro valor → 400 |
| `order` | `ASC` \| `DESC` | `ASC` | maiúsculas |
| `searchString` | texto | — | nome do acolhido, nome ou telefone do responsável |
| `shelterSearchingString` | texto | — | nome, cidade ou estado do abrigo |
| `addressFilter` | texto | — | rua, bairro, cidade ou estado do acolhido |
| `shelterId` | uuid | — | |
| `gender` | `M` \| `F` | — | |
| `birthDateFrom` / `birthDateTo` | `AAAA-MM-DD` | — | intervalo inclusivo |
| `joinedFrom` / `joinedTo` | `AAAA-MM-DD` | — | intervalo inclusivo |

A resposta usa o envelope paginado compartilhado
(`src/shared/dto/paginated-response.dto.ts`):

```json
{
  "data": [ { "...": "ShelteredResponseDto" } ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 41,
    "totalPages": 3,
    "orderBy": "name",
    "order": "ASC"
  }
}
```

### `GET /sheltered/simple` — query

| Parâmetro | Tipo | Default |
|-----------|------|---------|
| `page` | inteiro ≥ 1 | `1` |
| `limit` | inteiro 1–100 | `20` |
| `searchString` | texto | — |
| `acceptedJesus` | `accepted` \| `not_accepted` \| `all` | `all` |
| `active` | `active` \| `inactive` \| `all` | `all` |

Retorna `ShelteredListItemDto` (`id`, `name`, `guardianName`, `gender`,
`guardianPhone`, `shelterId`, `active`, `acceptedChrists`), ordenado com os
ativos primeiro.

---

## 📦 Contratos

### `ShelteredResponseDto`

```ts
{
  id: string;
  name: string;
  gender: 'M' | 'F';
  birthDate: string | null;   // AAAA-MM-DD
  guardianName?: string | null;
  guardianPhone?: string | null;
  joinedAt: string | null;    // AAAA-MM-DD
  active: boolean;
  shelter: { id: string; name: string } | null;
  address: ShelteredAddressResponseDto | null;
  createdAt: string;          // ISO-8601
  updatedAt: string;          // ISO-8601
}
```

Relações internas (`pagelas`, `acceptedChrists`) **não** são expostas neste
contrato — a lista simples é a fonte das decisões.

### Entrada

- **`POST`**: `name` e `gender` são obrigatórios. `birthDate`, `joinedAt`,
  `guardianName`, `guardianPhone`, `shelterId` e `address` são opcionais.
  `guardianName`/`guardianPhone` em branco são tratados como ausentes.
  Em `address`, `city` e `state` são obrigatórios.
- **`PUT`**: todos os campos são opcionais. Uma chave omitida não altera a
  coluna; `shelterId: null` e `address: null` desvinculam a relação.
- Datas de entrada aceitam `AAAA-MM-DD` ou ISO completo e são normalizadas para
  `AAAA-MM-DD` antes de persistir.

---

## ⚠️ Erros

Seguem o envelope global descrito em
[`docs/ERROR_HANDLING_GUIDE.md`](../../ERROR_HANDLING_GUIDE.md).

| Situação | Status | Categoria |
|----------|--------|-----------|
| Payload/query inválidos | `400` | `RULE` |
| Sem token ou token inválido | `401` | `BUSINESS` |
| Acolhido inexistente ou fora do escopo | `404` | `BUSINESS` |
| Abrigo informado inexistente ou fora do escopo | `404` | `BUSINESS` |

---

## 🧪 Testes

```bash
NODE_OPTIONS='--max-old-space-size=2048' npx jest src/shelter/sheltered --runInBand
```

Cobertura do escopo do módulo: **92% de statements, 91% de branches** (101 testes). Repositórios,
serviços, mappers e utils estão em ~100%; o restante são declarações de
classe/módulo sem código executável.

Automação ponta a ponta (requer API e banco locais):

```bash
npm run test:auto:sheltered
```

---

## 📮 Collection Postman

`docs/modules/sheltered/Sheltered_API_Collection.postman_collection.json`

Variáveis: `base_url`, `access_token`, `sheltered_id`, `shelter_id`.
