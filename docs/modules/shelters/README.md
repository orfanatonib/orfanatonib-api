# 🏠 Módulo Shelters (Abrigos)

Os abrigos do orfanato: dados, endereço, equipes, foto principal e a rota
pública da página do abrigo.

- **Contrato dos endpoints**: [`Shelters_API_Documentation.md`](./Shelters_API_Documentation.md)
- **Diagrama de fluxo**: [`docs/diagrams/flow/shelter/shelter-flow.puml`](../../diagrams/flow/shelter/shelter-flow.puml)

---

## 📁 Estrutura

```text
src/shelter/shelter/
├── shelters.module.ts
├── shelters.controller.ts          # só HTTP: parse do multipart e ator do token
├── constants.ts                    # campos multipart, prefixo/entityType da rota, mensagens
├── types.ts                        # escopo do ator, dicionário de arquivos, linhas do SQL cru
├── dto/
│   ├── create-shelter.dto.ts
│   ├── update-shelter.dto.ts
│   ├── query-shelters.dto.ts
│   ├── shelter.response.dto.ts
│   ├── shelter-paginated-response.dto.ts
│   ├── shelter-select-option.dto.ts
│   ├── shelter-team-select-option.dto.ts
│   └── shelter-teams-quantity-response.dto.ts
├── entities/shelter.entity/shelter.entity.ts
├── mappers/shelter.mapper.ts       # entidade → DTO, incluindo a visibilidade do endereço
├── repositories/shelters.repository.ts
├── services/
│   ├── create-shelters.service.ts
│   ├── get-shelters.service.ts
│   ├── update-shelters.service.ts
│   ├── delete-shelters.service.ts
│   ├── shelter-media.service.ts    # foto do abrigo e fotos de perfil das equipes
│   ├── shelter-route.service.ts    # a rota pública do abrigo
│   └── shelter-teams.service.ts    # numeração e reconciliação das equipes
└── utils/
    ├── shelter-access.util.ts      # ator a partir da requisição, regras de escopo
    ├── shelter-payload.util.ts     # parse e validação do JSON multipart
    └── shelter-transform.util.ts   # helpers de @Transform dos DTOs
```

---

## 🔐 Quem enxerga o quê

O escopo **nunca** vem do corpo da requisição: o controller resolve
`ShelterAccessContext` a partir do token com `toShelterAccessContext(request)` e
passa esse contrato aos casos de uso, que ficam livres de HTTP.

| Papel | Listagem administrativa (`GET /shelters`) | Escrita | Lista simples |
|-------|-------------------------------------------|---------|---------------|
| `admin` | todos os abrigos | ✅ | todos |
| `leader` | só os abrigos que lidera | ✅ editar/remover só os dele; **criar ❌ `403`** (só o admin cria) | só os dele |
| `member` | ❌ `403` | ❌ `403` | só os dele |
| sem papel | ❌ `403` | ❌ `403` | nenhum |

Um abrigo **fora do escopo do ator responde `404`, não `403`** — a existência do
registro não vaza para quem não deveria alcançá-lo.

---

## 🧩 Os três colaboradores

O módulo tinha a mesma regra escrita três vezes — uma em cada operação. Hoje
cada assunto tem um dono:

- **`ShelterMediaService`** — a foto principal do abrigo e as fotos de perfil de
  quem está nas equipes. Anexa tudo em **uma consulta por alvo**, não uma por
  pessoa. Quando há mais de uma mídia para o mesmo alvo, a mais recente vence.
  Substituir um upload apaga o arquivo anterior do bucket; falhar nessa limpeza
  não aborta a operação que o usuário pediu.
- **`ShelterRouteService`** — a rota pública. A criação, a atualização e a troca
  de imagem montavam a rota cada uma do seu jeito, **inclusive com três grafias
  diferentes de `entityType`** (`shelterPage`, `ShelterPage`, `ShelterEntity`),
  o que deixava a consulta de exclusão sem casar com o que a criação gravava.
  Agora há uma constante só: `SHELTER_ROUTE_ENTITY_TYPE`.
  A **exclusão** é a exceção: ela não passa por aqui. `shelters.routeId` é
  `ON DELETE CASCADE`, então apagar a rota antes apagaria o abrigo — a remoção
  inteira acontece na transação do repositório, na ordem abrigo → rota →
  endereço (o endereço é `RESTRICT`).
- **`ShelterTeamsService`** — a numeração. Um abrigo com `teamsQuantity` N tem
  exatamente as equipes `1..N`; o payload só personaliza as que quiser. A
  criação e a atualização compartilham a mesma validação (número fora da faixa,
  número repetido, membro em duas equipes).

---

## 📦 Multipart

O abrigo chega como `multipart/form-data` com o JSON num campo de texto, que o
`ValidationPipe` global **não enxerga**. Por isso o parse e a validação
acontecem no transporte, antes do caso de uso:

```ts
const dto = parseShelterPayload(body, CreateShelterDto);
```

| Campo | Uso |
|-------|-----|
| `shelterData` | JSON do abrigo (`POST`, `PUT`). Os campos soltos no body também são aceitos |
| `mediaData` | JSON da mídia (`PATCH /:id/media`). `title`/`url` soltos também são aceitos |
| qualquer arquivo | indexado por `fieldname`; o `fieldKey` do payload escolhe qual |

Payload ausente ou inválido responde `400` com a categoria `RULE` e a lista de
campos que falharam.

---

## 🚀 Endpoints

| Rota | Guard | Observação |
|------|-------|------------|
| `GET /shelters` | JWT | paginada; admin e líder |
| `GET /shelters/simple` | JWT | aberta também ao membro, no escopo dele |
| `GET /shelters/list` | JWT | opções de seleção |
| `GET /shelters/list-teams` | — | pública |
| `GET /shelters/:id` | JWT | |
| `GET /shelters/:id/teams-quantity` | JWT | |
| `POST /shelters` | JWT | multipart; **só admin**. É atômico: se equipes, foto ou rota falham, abrigo, endereço, equipes e mídia são desfeitos |
| `PUT /shelters/:id` | JWT | substituição completa: `teamsQuantity` é obrigatório |
| `PATCH /shelters/:id/media` | JWT | troca só a foto principal |
| `DELETE /shelters/:id` | JWT | limpa mídia e rota antes de remover |

### Envelope da listagem

`GET /shelters` responde `{ items, total, page, limit, pageCount }`. Difere do
`PaginatedResponseDto` compartilhado (`data`/`meta`) porque este é o contrato que
o frontend já consome; a convergência está registrada como débito.

### Endereço atrás de flag

O endereço do abrigo só vai na resposta quando a feature flag
`FeatureFlagKeys.SHELTER_ADDRESS` está ligada. A decisão é aplicada no mapper,
em um ponto só (`applyAddressVisibility`).

---

## 🤝 Contrato com outros módulos

O repositório **não é exportado**. Quem precisa de abrigo fala com os serviços:

```ts
// src/shelter/leader-profile/services/leader-profiles.service.ts
const shelterIds = await this.getSheltersService.findShelterIdsForLeader(userId);
```

| Contrato | Para quê |
|----------|----------|
| `GetSheltersService.existsForActor(id, actor)` | o abrigo existe **e** o ator o alcança, sem expor o payload |
| `GetSheltersService.findShelterIdsForLeader(userId)` | os abrigos que um líder lidera |
| `GetSheltersService.findEntityOrFail(id, actor)` | lookup compartilhado pelos casos de uso de escrita |

---

## 🧪 Testes

```bash
npx jest src/shelter/shelter
```

14 suítes, cobrindo controller, os quatro casos de uso, os três
colaboradores, o repositório, os mappers e os utils. Cobertura do módulo acima de
90% em statements, branches, funções e linhas.

Os testes unitários **não bastam**: os três defeitos mais graves do módulo (o
`DELETE` que cascateava, o `POST` com mídia respondendo 500 e a foto ausente na
resposta da criação) só apareceram exercitando o stack local de verdade.

---

## 📌 Débitos conhecidos

- `ShelterPaginatedResponseDto` ainda não usa o envelope compartilhado
  `PaginatedResponseDto`.
- `LeaderProfilesService` ainda injeta `Repository<ShelterEntity>` direto para a
  leitura da lista de abrigos do líder; isso pertence a um contrato deste módulo.
