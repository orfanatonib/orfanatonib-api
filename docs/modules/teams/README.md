# Equipes (`/teams`)

Equipe = grupo de líderes e membros de um abrigo. Contém e-mail e telefone dos integrantes, por isso **tudo é admin/líder e escopado por abrigo** (correção de P0: membro lia e escrevia equipes).

| Endpoint | Quem | Regra |
|---|---|---|
| `GET /teams` | admin, líder | admin todas; líder só as dos abrigos que lidera |
| `GET /teams/my-teams` | qualquer sessão | as equipes do próprio ator |
| `GET /teams/by-shelter/:shelterId` | admin, líder | líder só em abrigo que lidera (403 fora) |
| `GET /teams/:id` | admin, líder | 404 se não existe; 403 se o abrigo está fora do escopo |
| `POST /teams`, `PUT /teams/:id`, `DELETE /teams/:id` | admin, líder do abrigo | membro e visitante nunca; flag `shelter_management` desligada ⇒ 403 `FEATURE_DISABLED` |

**Regras de escrita (2026-11-22):** o número da equipe é único por abrigo (`409` ao repetir; o próprio número é aceito no `PUT`); `leaderProfileIds`/`memberProfileIds` inexistentes dão `404` e nada é gravado (antes o `PUT` os descartava e esvaziava a equipe, e o `POST` os ignorava); o `POST` agora grava os líderes e membros do corpo; o `DELETE` solta os líderes (`leader_teams`) e deixa os membros sem equipe, numa transação (antes dava `409` se a equipe tinha líder). Criar, alterar e remover equipe **não envia e-mail** — o aviso de troca de equipe é do `PUT /member-profiles`.

Escopo único em `utils/team-access.util.ts` (`assertCanManageTeamsIn` / `assertCanReadTeamsIn`); a agenda de abrigo (`shelter-schedule`) usa a mesma fronteira.

**Mudança de contrato:** membro recebe `403` em `/teams` (exceto `my-teams`); líder só enxerga/escreve no próprio abrigo.

Testes: `team-write-scope.spec.ts`, `team-read-scope.spec.ts`, `team-services-flow.spec.ts`; E2E `teams-authorization.api.spec.ts` (31 cenários com `SELECT`) — matriz `team` 37/63.
