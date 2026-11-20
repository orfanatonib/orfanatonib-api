# 📋 Módulo Attendance (Frequência)

Quem esteve presente em cada encontro: a visita ao abrigo e a reunião na NIB.

- **Contrato dos endpoints**: [`ATTENDANCE_API_DOCUMENTATION.md`](./ATTENDANCE_API_DOCUMENTATION.md)
- **Diagrama de fluxo**: [`docs/diagrams/flow/attendance/attendance-flow.puml`](../../diagrams/flow/attendance/attendance-flow.puml)

---

## 🧭 O conceito central: encontro

Um `ShelterScheduleEntity` guarda **duas** datas — `visitDate` e `meetingDate`.
Cada uma é um **encontro** com frequência própria, e a chave de um registro é
`(membro, agendamento, categoria)`.

Essa expansão estava copiada em quatro métodos do serviço de leitura, cada
cópia remontando o rótulo do local à mão. Agora é `occurrencesOf(schedule, team)`.

---

## 📁 Estrutura

```text
src/attendance/
├── attendance.module.ts
├── attendance.controller.ts        # só HTTP: ator do token e DTO validado
├── constants.ts                    # rótulos, limites, mensagens
├── types.ts                        # ator, escopo, encontro, filtros
├── dto/
│   ├── register-attendance.dto.ts
│   ├── register-team-attendance.dto.ts
│   ├── attendance-filters.dto.ts   # o que entra
│   └── attendance-response.dto.ts  # o que sai
├── entities/attendance.entity.ts
├── mappers/attendance.mapper.ts
├── repositories/attendance.repository.ts
├── services/
│   ├── attendance-scope.service.ts # resolve as equipes do ator uma vez
│   ├── register-attendance.service.ts
│   ├── get-pendings.service.ts
│   ├── get-teams.service.ts
│   ├── get-schedules.service.ts
│   ├── get-records.service.ts
│   └── get-stats.service.ts
└── utils/
    ├── attendance-scope.util.ts
    ├── attendance-occurrence.util.ts
    └── attendance-filters.util.ts
```

---

## 🔐 Escopo

`AttendanceScopeService.resolve` responde, de uma vez, quais equipes o ator
alcança. Antes cada método refazia a pergunta: `getUserWithMembership` e
`getLeaderTeamIds` eram chamados de novo a cada endpoint, e cada `assert`
disparava outras duas consultas.

| Papel | Enxerga | Lança em lote |
|-------|---------|---------------|
| `admin` | tudo | qualquer equipe |
| `leader` | as equipes que lidera | as que lidera |
| `member` | o próprio histórico | ❌ `403` |

`assertLeads` é para lançar pela equipe; `assertBelongs`, para pertencer a ela.

---

## ⚡ As consultas

`findAllPendings` era um método de **278 linhas** com consultas dentro de três
laços aninhados: uma de agendamentos por equipe, mais duas de frequência por
agendamento, mais uma de relatório por visita. Com admin — que enxerga todas as
equipes — isso crescia sem limite.

Hoje são **quatro consultas fixas**, independentemente de quantas equipes o ator
enxerga, e há teste cobrindo exatamente isso. O mesmo vale para a folha
hierárquica: três consultas, não três laços.

---

## 🚀 Endpoints

| Rota | Guard |
|------|-------|
| `POST /attendance/register` | JWT |
| `POST /attendance/register/team` | JWT + Admin/Líder |
| `GET /attendance/pending/all` | JWT |
| `GET /attendance/team/:teamId/members` | JWT + Admin/Líder |
| `GET /attendance/team/:teamId/schedules` | JWT |
| `GET /attendance/leader/teams` | JWT + Admin/Líder |
| `GET /attendance/leader/teams/members` | JWT + Admin/Líder |
| `GET /attendance/sheets/hierarchical` | JWT + Admin/Líder |
| `GET /attendance/records` | JWT |
| `GET /attendance/stats` | JWT |
| `GET /attendance/leader/stats/team/:teamId` | JWT + Admin/Líder |

### Removido

`GET /attendance/leader/shelters-teams-members` chamava **o mesmo método** de
`leader/teams/members`, e nenhum código o consumia — só a documentação o citava.

---

## 📊 As duas taxas

`attendanceRate` significa coisas diferentes em cada endpoint, e isso é
intencional:

- **`/stats`** (pessoal): presença sobre o que foi lançado — *"compareci a
  quantos dos encontros em que fui marcado?"*
- **`/leader/stats/team/:teamId`**: lançamentos sobre o esperado
  (encontros × membros) — *"quanto da folha já foi preenchido?"*

---

## 🧪 Testes

```bash
# backend
npx jest src/attendance

# contratos da API, ao vivo
npx playwright test --config=playwright.live.config.ts e2e/live/attendance.api.spec.ts

# as telas, ao vivo
npx playwright test --config=playwright.live.config.ts e2e/live/attendance.ui.spec.ts
```

Backend: 7 suítes e 118 testes, **96.6% stmts / 97% linhas**. O módulo não
tinha nenhum teste.

Frontend: **só Playwright**, contra a pilha real — nada de teste unitário de
tela. `attendance.ui.spec.ts` monta a própria hierarquia pela API no
`beforeAll` (abrigo, equipe, membro vinculado e visita no passado), dirige a UI
de verdade e lê a API de volta para provar que gravou; o `afterAll` apaga o
abrigo, e a exclusão cascateia equipe e agendamento e desvincula o membro.

Nenhum cenário depende do que já existe no banco. A versão anterior pulava
quatro cenários quando o banco local estava vazio — e foi justamente ali que
três defeitos passaram: o 400 dos encontros, o erro engolido e a mensagem de
sucesso que sumia antes de ser lida.

---

## 📌 Débitos conhecidos

- `PaginatedResponseDto` deste módulo usa `meta.total`/`hasNext`, e não o
  envelope compartilhado (`meta.totalItems`). É o contrato que o frontend já
  consome; a convergência fica registrada.
- `getTeamAttendanceStats` conta `totalEvents` como agendamentos, não como
  encontros — um agendamento com visita e reunião conta uma vez. O
  comportamento foi preservado como estava.

## Atualização mobile — novembro de 2026

- `POST /attendance/register/team` valida todos os membros antes de persistir e grava o lote em uma única transação. Uma falha desfaz o lote, sem presença parcialmente salva. O corpo e a resposta permanecem compatíveis.
- A resposta do POST é o estado persistido utilizado pelo formulário; não é necessário um GET adicional para confirmar o salvamento.
- `GET /attendance/team/:teamId/schedules` e `GET /attendance/sheets/hierarchical` filtram cada ocorrência pela sua própria data: uma reunião fora do período não aparece só porque a visita está dentro.
- As permissões de admin/líder, os vínculos de equipe e as feature flags permanecem exigidos pela API.
