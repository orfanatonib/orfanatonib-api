# API de Attendance (Registro de Presença)

Este documento descreve todos os endpoints disponíveis para o módulo de registro de presença/falta.

## Índice
- [Regras de Negócio](#regras-de-negócio)
- [Endpoints](#endpoints)
  - [Registro de Presença/Falta](#registro-de-presençafalta)
  - [Registro em Lote (Pagela)](#registro-em-lote-pagela)
  - [Listar Membros do Time](#listar-membros-do-time)
  - [Listar Reuniões e Visitas com Filtros](#listar-reuniões-e-visitas-com-filtros)
  - [Listar Times do Líder](#listar-times-do-líder)
  - [Listar Times + Membros (agrupado por abrigo)](#listar-times--membros-agrupado-por-abrigo)
  - [Listar Hierarquia Completa](#listar-hierarquia-completa-abrigos--equipes--membros)
- [Pendências do Líder](#pendências-do-líder)
- [Pendências do Membro](#pendências-do-membro)
- [Novos Endpoints (v2)](#novos-endpoints-v2)
  - [Listar Registros de Presença com Filtros](#listar-registros-de-presença-com-filtros)
  - [Estatísticas de Presença do Usuário](#estatísticas-de-presença-do-usuário)
  - [Estatísticas de Presença por Time](#estatísticas-de-presença-por-time-líderes)
  - [Listar Reuniões/Visitas com Estatísticas](#listar-reuniõesvisitas-com-estatísticas)
  - [Listar Pagelas Hierarquicamente](#listar-pagelas-hierarquicamente)
- [Tipos de Dados](#tipos-de-dados)
- [Exemplos Práticos (cURL)](#exemplos-práticos-curl)
- [Fluxo de Uso no Frontend](#fluxo-de-uso-no-frontend)
- [Notas Importantes](#notas-importantes)

---

## Regras de Negócio

### Vínculo com ShelterSchedule
- Não é permitido registrar presença ou falta sem um ShelterSchedule válido
- O ShelterSchedule deve ter pelo menos uma data válida (meetingDate ou visitDate)

### Registro Duplicado
- Se já existir um registro de presença/falta para o mesmo membro e evento, o sistema atualiza o registro existente

### Controle de Acesso
- Apenas **professores** precisam registrar presença/falta (líderes não registram)
- Líderes podem registrar presença/falta apenas para os **professores** da equipe (pagela)
- Líderes só podem operar nos times que lideram (admin pode operar em qualquer time)
- Professores só podem registrar presença em eventos dos times aos quais pertencem

### Pendências
- Um evento é considerado pendente quando:
  - A data do evento (meetingDate ou visitDate) é anterior à data atual
  - E não existe registro de presença/falta para o **professor** (líderes não têm pendências)

---

## Endpoints

### Registro de Presença/Falta

**Endpoint:** `POST /attendance/register`

**Autenticação:** JWT (JwtAuthGuard)

**Permissão:** Todos os usuários autenticados

**Descrição:** Permite que um **professor** registre sua própria presença ou falta em um evento. Líderes não precisam registrar presença.

**Request Body:**
```json
{
  "scheduleId": "uuid-do-evento",
  "type": "present" | "absent",
  "comment": "Comentário opcional (sempre opcional, independente do tipo)"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "type": "present",
  "comment": "Comentário opcional",
  "memberId": "uuid-do-membro",
  "memberName": "Nome do Membro",
  "scheduleId": "uuid-do-evento",
  "visitNumber": 1,
  "visitDate": "2024-01-15",
  "meetingDate": "2024-01-10",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**Erros:**
- `404 Not Found` - Evento não encontrado
- `403 Forbidden` - Membro não pertence ao time do evento
- `403 Forbidden` - Evento não possui data válida

---

### Registro em Lote (Pagela)

**Endpoint:** `POST /attendance/register/team`

**Autenticação:** JWT (JwtAuthGuard)

**Permissão:** Admin ou Leader (AdminOrLeaderRoleGuard) — apenas para times que o líder realmente gerencia

**Descrição:** Permite que um líder registre presença/falta em lote apenas para os **professores** da equipe (líderes não registram presença).

**Request Body:**
```json
{
  "teamId": "uuid-do-time",
  "scheduleId": "uuid-do-evento",
  "attendances": [
    {
      "memberId": "uuid-membro-1",
      "type": "present",
      "comment": "Comentário opcional"
    },
    {
      "memberId": "uuid-membro-2",
      "type": "absent",
      "comment": "Faltou por motivo de saúde"
    }
  ]
}
```

**Response (200):**
```json
[
  {
    "id": "uuid-1",
    "type": "present",
    "comment": "Comentário opcional",
    "memberId": "uuid-membro-1",
    "memberName": "João Silva",
    "scheduleId": "uuid-do-evento",
    "visitNumber": 1,
    "visitDate": "2024-01-15",
    "meetingDate": null,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  {
    "id": "uuid-2",
    "type": "absent",
    "comment": "Faltou por motivo de saúde",
    "memberId": "uuid-membro-2",
    "memberName": "Maria Santos",
    "scheduleId": "uuid-do-evento",
    "visitNumber": 1,
    "visitDate": "2024-01-15",
    "meetingDate": null,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

**Erros:**
- `404 Not Found` - Evento ou time não encontrado
- `403 Forbidden` - Evento não pertence ao time informado
- `403 Forbidden` - Evento não possui data válida
- `400 Bad Request` - Membro não encontrado no time

---

### Pendências do Líder

**Endpoint:** `GET /attendance/pending/leader?teamId={teamId}`

**Autenticação:** JWT (JwtAuthGuard)

**Permissão:** Admin ou Leader (AdminOrLeaderRoleGuard) — apenas times liderados pelo usuário

**Descrição:** Retorna reuniões e visitas já realizadas (meetingDate ou visitDate < hoje) do time informado onde ainda existem membros sem presença/falta lançada (pagela pendente). Útil para o líder saber em quais eventos precisa lançar a pagela do time.

**Query Parameters:**
- `teamId` (required): UUID do time

**Response (200):**
```json
[
  {
    "scheduleId": "uuid-evento-1",
    "visitNumber": 1,
    "visitDate": "2024-01-10",
    "meetingDate": "2024-01-08",
    "lessonContent": "Lição sobre valores",
    "observation": null,
    "meetingRoom": "Sala 3",
    "teamName": "Equipe Matutina",
    "shelterName": "Orfanato Luz do Amanhã",
    "totalMembers": 3,
    "pendingMembers": [
      {
        "memberId": "uuid-teacher-1",
        "memberName": "João Silva",
        "memberEmail": "joao@email.com",
        "role": "teacher"
      },
      {
        "memberId": "uuid-teacher-2",
        "memberName": "Maria Santos",
        "memberEmail": "maria@email.com",
        "role": "teacher"
      }
    ]
  }
]
```

**Erros:**
- `404 Not Found` - Time não encontrado

---

### Pendências do Membro

**Endpoint:** `GET /attendance/pending/member`

**Autenticação:** JWT (JwtAuthGuard)

**Permissão:** Todos os usuários autenticados

**Descrição:** Retorna reuniões e visitas já realizadas em que o **professor** ainda não registrou sua presença ou ausência. Líderes não têm pendências.

**Response (200):**
```json
[
  {
    "scheduleId": "uuid-evento-1",
    "visitNumber": 1,
    "visitDate": "2024-01-10",
    "meetingDate": "2024-01-08",
    "lessonContent": "Lição sobre valores",
    "teamId": "uuid-time-1",
    "teamNumber": 1,
    "shelterName": "Orfanato Luz do Amanhã"
  },
  {
    "scheduleId": "uuid-evento-2",
    "visitNumber": 2,
    "visitDate": "2024-01-15",
    "meetingDate": null,
    "lessonContent": "Lição sobre respeito",
    "teamId": "uuid-time-1",
    "teamNumber": 1,
    "shelterName": "Orfanato Luz do Amanhã"
  }
]
```

**Erros:**
- `404 Not Found` - Usuário não encontrado

---

### Listar Membros do Time

**Endpoint:** `GET /attendance/team/{teamId}/members`

**Autenticação:** JWT (JwtAuthGuard)

**Permissão:** Admin ou Leader (AdminOrLeaderRoleGuard) — apenas times liderados pelo usuário

**Descrição:** Lista apenas os **professores** de um time (líderes não precisam registrar presença).

**Path Parameters:**
- `teamId` (required): UUID do time

**Response (200):**
```json
{
  "teamId": "uuid-time-1",
  "teamNumber": 1,
  "shelterName": "Orfanato Luz do Amanhã",
  "members": [
    {
      "id": "uuid-teacher-1",
      "name": "Maria Santos",
      "email": "maria@email.com",
      "role": "teacher"
    },
    {
      "id": "uuid-teacher-2",
      "name": "Pedro Silva",
      "email": "pedro@email.com",
      "role": "teacher"
    }
  ]
}
```

**Erros:**
- `404 Not Found` - Time não encontrado

---

### Listar Reuniões e Visitas com Filtros

**Endpoint:** `GET /attendance/team/{teamId}/schedules?page=1&limit=10&startDate=2024-01-01&endDate=2024-12-31&sortBy=visitDate&sortOrder=desc`

**Autenticação:** JWT (JwtAuthGuard)

**Permissão:** Admin, líder ou professor do time solicitado

**Descrição:** Lista reuniões e visitas de um time com paginação, filtros e estatísticas de presença.

**Path Parameters:**
- `teamId` (required): UUID do time

**Query Parameters:** Mesmo que `AttendanceFiltersDto` (page, limit, startDate, endDate, sortBy, sortOrder)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-evento-1",
      "visitNumber": 2,
      "visitDate": "2024-01-20",
      "meetingDate": "2024-01-18",
      "lessonContent": "Lição sobre respeito",
      "observation": "Observação do evento",
      "meetingRoom": "Sala 3",
      "teamId": "uuid-time-1",
      "teamNumber": 1,
      "teamName": "Equipe Matutina",
      "shelterName": "Orfanato Luz do Amanhã",
      "attendanceCount": 3,
      "totalMembers": 4
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### Listar Times do Líder

**Endpoint:** `GET /attendance/leader/teams`

**Autenticação:** JWT (JwtAuthGuard)

**Permissão:** Admin ou Leader (AdminOrLeaderRoleGuard)

**Descrição:** Lista os times (e abrigos) que o líder autenticado gerencia. Admin recebe a lista completa.

**Response (200):**
```json
[
  {
    "teamId": "uuid-time-1",
    "teamNumber": 1,
    "shelterId": "uuid-shelter-1",
    "shelterName": "Orfanato Luz do Amanhã",
    "description": "Equipe matutina"
  }
]
```

---

### Listar Times + Membros (agrupado por abrigo)

**Endpoint:** `GET /attendance/leader/teams/members`

**Autenticação:** JWT (JwtAuthGuard)

**Permissão:** Admin ou Leader (AdminOrLeaderRoleGuard)

**Descrição:** Retorna os abrigos do líder com suas equipes e apenas os **professores** (líderes não precisam registrar presença). Útil para montar o drill-down abrigo → equipe → professores.

**Response (200):**
```json
[
  {
    "shelterId": "uuid-shelter-1",
    "shelterName": "Orfanato Luz do Amanhã",
    "teams": [
      {
        "teamId": "uuid-time-1",
        "teamNumber": 1,
        "description": "Equipe matutina",
        "members": [
          { "id": "uuid-teacher-1", "name": "Maria", "email": "maria@email.com", "role": "teacher" },
          { "id": "uuid-teacher-2", "name": "Pedro", "email": "pedro@email.com", "role": "teacher" }
        ]
      }
    ]
  }
]
```

---

### Listar Hierarquia Completa (Abrigos → Equipes → Membros)

**Endpoint:** `GET /attendance/leader/shelters-teams-members`

**Autenticação:** JWT (JwtAuthGuard)

**Permissão:** Admin ou Leader (AdminOrLeaderRoleGuard)

**Descrição:** Lista a hierarquia completa abrigos[] → equipes[] → professores[] onde o líder autenticado faz parte. Retorna todos os abrigos que o líder gerencia, com suas respectivas equipes e apenas os **professores** (líderes não precisam registrar presença).

**Response (200):**
```json
[
  {
    "shelterId": "uuid-shelter-1",
    "shelterName": "Orfanato Luz do Amanhã",
    "teams": [
      {
        "teamId": "uuid-time-1",
        "teamNumber": 1,
        "description": "Equipe matutina",
        "members": [
          { "id": "uuid-teacher-1", "name": "Maria", "email": "maria@email.com", "role": "teacher" },
          { "id": "uuid-teacher-2", "name": "Pedro", "email": "pedro@email.com", "role": "teacher" }
        ]
      },
      {
        "teamId": "uuid-time-2",
        "teamNumber": 2,
        "description": "Equipe vespertina",
        "members": [
          { "id": "uuid-teacher-3", "name": "Carlos", "email": "carlos@email.com", "role": "teacher" }
        ]
      }
    ]
  },
  {
    "shelterId": "uuid-shelter-2",
    "shelterName": "Lar Esperança",
    "teams": [
      {
        "teamId": "uuid-time-3",
        "teamNumber": 1,
        "description": "Equipe única",
        "members": [
          { "id": "uuid-teacher-4", "name": "Ana Silva", "email": "ana@email.com", "role": "teacher" },
          { "id": "uuid-teacher-5", "name": "João Santos", "email": "joao@email.com", "role": "teacher" }
        ]
      }
    ]
  }
]
```

**Erros:**
- `404 Not Found` - Usuário não encontrado

---

## Fluxo de UI (drill-down)
1) Abrigos → Equipes: use `GET /attendance/leader/teams`, agrupe por `shelterId`/`shelterName` e liste `teamNumber`.
2) Equipe → Professores: ao clicar no time, chame `GET /attendance/team/:teamId/members` para listar apenas professores (líderes não registram presença).
3) Equipe → Eventos: chame `GET /attendance/team/:teamId/schedules` para mostrar visitas/reuniões com estatísticas de presença.
4) Lançamento: use `POST /attendance/register/team` (pagela apenas para professores) ou `POST /attendance/register` (individual para professores).
5) Alertas: exiba `GET /attendance/pending/leader?teamId=...` (professores sem registro) e `GET /attendance/pending/member` (apenas para professores).

---

## Tipos de Dados

### AttendanceType (Enum)
```typescript
enum AttendanceType {
  PRESENT = 'present',
  ABSENT = 'absent'
}
```

### DTOs de Entrada

#### RegisterAttendanceDto
```typescript
{
  scheduleId: string; // UUID do evento
  type: AttendanceType; // 'present' | 'absent'
  comment?: string; // Sempre opcional, máximo 500 caracteres
}
```

#### RegisterTeamAttendanceDto
```typescript
{
  teamId: string; // UUID do time
  scheduleId: string; // UUID do evento
  attendances: MemberAttendanceDto[]; // Pelo menos 1 registro
}
```

#### MemberAttendanceDto
```typescript
{
  memberId: string; // UUID do professor
  type: AttendanceType; // 'present' | 'absent'
  comment?: string; // Sempre opcional, máximo 500 caracteres
}
```

### DTOs de Saída

#### AttendanceResponseDto
```typescript
{
  id: string;
  type: AttendanceType;
  comment?: string;
  memberId: string;
  memberName: string;
  memberEmail?: string;
  scheduleId: string;
  visitNumber: number;
  visitDate?: string;
  meetingDate?: string;
  lessonContent?: string;
  observation?: string;
  meetingRoom?: string;
  teamName: string;
  shelterName: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### PendingForLeaderDto
```typescript
{
  scheduleId: string;
  visitNumber: number;
  visitDate?: string;
  meetingDate?: string;
  lessonContent: string;
  observation?: string;
  meetingRoom?: string;
  teamName: string;
  shelterName: string;
  totalMembers: number;
  pendingMembers: PendingMemberDto[];
}
```

#### PendingMemberDto
```typescript
{
  memberId: string;
  memberName: string;
  memberEmail: string;
  role: 'teacher'; // sempre 'teacher' (líderes não têm pendências)
}
```

#### PendingForMemberDto
```typescript
{
  scheduleId: string;
  visitNumber: number;
  visitDate?: string;
  meetingDate?: string;
  lessonContent: string;
  observation?: string;
  meetingRoom?: string;
  teamId: string;
  teamNumber: number;
  teamName: string;
  shelterName: string;
}
```

#### AttendanceFiltersDto (para filtros e paginação)
```typescript
{
  page?: number; // Padrão: 1
  limit?: number; // Padrão: 20, máximo: 100
  startDate?: string; // Formato: YYYY-MM-DD
  endDate?: string; // Formato: YYYY-MM-DD
  type?: AttendanceType; // 'present' | 'absent'
  teamId?: string; // UUID do time
  memberId?: string; // UUID do membro
  sortOrder?: 'asc' | 'desc'; // Padrão: 'desc'
  sortBy?: 'createdAt' | 'visitDate' | 'meetingDate'; // Padrão: 'createdAt'
}
```

#### AttendanceStatsDto
```typescript
{
  totalEvents: number; // Total de eventos
  totalAttendanceRecords: number; // Total de registros de presença
  presentCount: number; // Contagem de presentes
  absentCount: number; // Contagem de ausentes
  attendanceRate: number; // Taxa de presença em %
  pendingCount: number; // Registros pendentes
}
```

#### PaginationDto
```typescript
{
  page?: number; // Padrão: 1
  limit?: number; // Padrão: 20, máximo: 100
}
```

#### TeamMemberDto
```typescript
{
  id: string;
  name: string;
  email: string;
  role: 'leader' | 'teacher';
}
```

#### TeamScheduleDto
```typescript
{
  id: string;
  visitNumber: number;
  visitDate?: string;
  meetingDate?: string;
  lessonContent: string;
  observation?: string;
  meetingRoom?: string;
  teamId: string;
  teamNumber: number;
  shelterName: string;
}
```

#### LeaderTeamDto
```typescript
{
  teamId: string;
  teamNumber: number;
  shelterId: string;
  shelterName: string;
  description: string;
  memberCount?: number; // total de professores (líderes não contam)
}
```

#### PaginatedResponseDto<T>
```typescript
{
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

#### DTOs para Listagem Hierárquica de Pagelas

##### AttendanceRecordDto
```typescript
{
  id: string;
  type: AttendanceType;
  comment?: string;
  memberId: string;
  memberName: string;
  memberEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

##### ScheduleWithAttendanceDto
```typescript
{
  scheduleId: string;
  visitNumber: number;
  visitDate?: string;
  meetingDate?: string;
  lessonContent: string;
  observation?: string;
  meetingRoom?: string;
  totalTeachers: number;
  presentCount: number;
  absentCount: number;
  pendingCount: number;
  attendanceRecords: AttendanceRecordDto[];
}
```

##### TeamWithSchedulesDto
```typescript
{
  teamId: string;
  teamNumber: number;
  teamName: string;
  description?: string;
  totalSchedules: number;
  schedules: ScheduleWithAttendanceDto[];
}
```

##### ShelterWithTeamsDto
```typescript
{
  shelterId: string;
  shelterName: string;
  totalTeams: number;
  teams: TeamWithSchedulesDto[];
}
```

---

## Exemplos Práticos (cURL)

### Registrar presença individual
```bash
curl -X POST http://localhost:3333/attendance/register \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "scheduleId": "sched-1", "type": "present", "comment": "Cheguei no horário" }'  # comentário opcional
```

### Registrar presença em lote (pagela)
```bash
curl -X POST http://localhost:3333/attendance/register/team \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": "team-1",
    "scheduleId": "sched-1",
    "attendances": [
      { "memberId": "mem-1", "type": "present" },
      { "memberId": "mem-2", "type": "absent", "comment": "Doente" },
      { "memberId": "mem-3", "type": "present" }  # comentário sempre opcional
    ]
  }'
```

### Consultar pendências do líder
```bash
curl -X GET "http://localhost:3333/attendance/pending/leader?teamId=team-1" \
  -H "Authorization: Bearer <token>"
```

### Consultar pendências do membro
```bash
curl -X GET http://localhost:3333/attendance/pending/member \
  -H "Authorization: Bearer <token>"
```

### Listar registros com filtros
```bash
curl -X GET "http://localhost:3333/attendance/records?page=1&limit=10&startDate=2024-01-01&type=present&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer <token>"
```

### Estatísticas do usuário
```bash
curl -X GET "http://localhost:3333/attendance/stats?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer <token>"
```

### Estatísticas do time (líder)
```bash
curl -X GET "http://localhost:3333/attendance/leader/stats/team/team-1?startDate=2024-01-01" \
  -H "Authorization: Bearer <token>"
```

### Listar pagelas hierarquicamente
```bash
curl -X GET "http://localhost:3333/attendance/sheets/hierarchical?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer <token>"
```

### Listar membros do time
```bash
curl -X GET http://localhost:3333/attendance/team/team-1/members \
  -H "Authorization: Bearer <token>"
```

### Listar reuniões e visitas de um time
```bash
curl -X GET "http://localhost:3333/attendance/team/team-1/schedules?page=1&limit=10&startDate=2024-01-01&sortBy=visitDate&sortOrder=desc" \
  -H "Authorization: Bearer <token>"
```

### Listar times do líder
```bash
curl -X GET http://localhost:3333/attendance/leader/teams \
  -H "Authorization: Bearer <token>"
```

### Listar hierarquia times e membros do líder
```bash
curl -X GET http://localhost:3333/attendance/leader/teams/members \
  -H "Authorization: Bearer <token>"
```

### Listar hierarquia abrigos-equipes-membros do líder
```bash
curl -X GET http://localhost:3333/attendance/leader/shelters-teams-members \
  -H "Authorization: Bearer <token>"
```

---

## Novos Endpoints (v2)

### Listar Registros de Presença com Filtros

**Endpoint:** `GET /attendance/records?page=1&limit=20&startDate=2024-01-01&endDate=2024-12-31&type=present&teamId=xxx&memberId=xxx&sortBy=createdAt&sortOrder=desc`

**Autenticação:** JWT (JwtAuthGuard)

**Permissão:** Todos os usuários autenticados (filtrado por times que participa)

**Descrição:** Lista todos os registros de presença com filtros avançados e paginação. Admin vê todos os registros; outros usuários só veem registros dos times que participam.

**Query Parameters:**
- `page` (number, opcional): Página atual (padrão: 1)
- `limit` (number, opcional): Itens por página (padrão: 20, máximo: 100)
- `startDate` (string, opcional): Data inicial (YYYY-MM-DD)
- `endDate` (string, opcional): Data final (YYYY-MM-DD)
- `type` (string, opcional): Tipo de presença ('present' ou 'absent')
- `teamId` (string, opcional): UUID do time
- `memberId` (string, opcional): UUID do membro
- `sortBy` (string, opcional): Campo para ordenação ('createdAt', 'visitDate', 'meetingDate')
- `sortOrder` (string, opcional): Ordem ('asc' ou 'desc')

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-registro",
      "type": "present",
      "comment": "Chegou no horário",
      "memberId": "uuid-membro",
      "memberName": "João Silva",
      "memberEmail": "joao@email.com",
      "scheduleId": "uuid-evento",
      "visitNumber": 1,
      "visitDate": "2024-01-15",
      "meetingDate": null,
      "lessonContent": "Lição sobre valores",
      "observation": "Evento corrido bem",
      "meetingRoom": "Sala 3",
      "teamName": "Equipe Matutina",
      "shelterName": "Orfanato Luz do Amanhã",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### Estatísticas de Presença do Usuário

**Endpoint:** `GET /attendance/stats?teamId=xxx&startDate=2024-01-01&endDate=2024-12-31`

**Autenticação:** JWT (JwtAuthGuard)

**Permissão:** Todos os usuários autenticados

**Descrição:** Retorna estatísticas de presença do usuário autenticado, opcionalmente filtrado por time e período.

**Query Parameters:**
- `teamId` (string, opcional): UUID do time para filtrar
- `startDate` (string, opcional): Data inicial (YYYY-MM-DD)
- `endDate` (string, opcional): Data final (YYYY-MM-DD)

**Response (200):**
```json
{
  "totalEvents": 25,
  "totalAttendanceRecords": 25,
  "presentCount": 22,
  "absentCount": 3,
  "attendanceRate": 88,
  "pendingCount": 0
}
```

---

### Estatísticas de Presença por Time (Líderes)

**Endpoint:** `GET /attendance/leader/stats/team/:teamId?startDate=2024-01-01&endDate=2024-12-31`

**Autenticação:** JWT (JwtAuthGuard)

**Permissão:** Admin ou Leader (AdminOrLeaderRoleGuard) — apenas times liderados

**Descrição:** Retorna estatísticas completas de presença de um time específico.

**Path Parameters:**
- `teamId` (required): UUID do time

**Query Parameters:**
- `startDate` (string, opcional): Data inicial (YYYY-MM-DD)
- `endDate` (string, opcional): Data final (YYYY-MM-DD)

**Response (200):**
```json
{
  "totalEvents": 12,
  "totalAttendanceRecords": 36,
  "presentCount": 30,
  "absentCount": 6,
  "attendanceRate": 83,
  "pendingCount": 0
}
```

**Erros:**
- `404 Not Found` - Time não encontrado
- `403 Forbidden` - Usuário não é líder do time

---

### Listar Reuniões/Visitas com Estatísticas

**Endpoint:** `GET /attendance/team/:teamId/schedules?page=1&limit=10&startDate=2024-01-01&endDate=2024-12-31&sortBy=visitDate&sortOrder=desc`

**Autenticação:** JWT (JwtAuthGuard)

**Permissão:** Todos os usuários (filtrado por participação no time)

**Descrição:** Lista reuniões e visitas de um time com paginação, filtros e estatísticas de presença.

**Path Parameters:**
- `teamId` (required): UUID do time

**Query Parameters:** Mesmo que `AttendanceFiltersDto` (page, limit, startDate, endDate, sortBy, sortOrder)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-evento",
      "visitNumber": 2,
      "visitDate": "2024-01-20",
      "meetingDate": "2024-01-18",
      "lessonContent": "Lição sobre respeito",
      "observation": null,
      "meetingRoom": "Sala 3",
      "teamId": "uuid-time",
      "teamNumber": 1,
      "teamName": "Equipe Matutina",
      "shelterName": "Orfanato Luz do Amanhã",
      "attendanceCount": 3,
      "totalMembers": 4
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### Listar Pagelas Hierarquicamente

**Endpoint:** `GET /attendance/sheets/hierarchical?startDate=2024-01-01&endDate=2024-12-31`

**Autenticação:** JWT (JwtAuthGuard)

**Permissão:** Admin ou Leader (AdminOrLeaderRoleGuard)

**Descrição:** Lista todas as pagelas (registros de presença) organizadas hierarquicamente por abrigos → equipes → agendamentos. Para cada agendamento, mostra os registros de presença/falta dos professores, com estatísticas consolidadas.

**Query Parameters:**
- `startDate` (string, opcional): Data inicial para filtrar agendamentos (YYYY-MM-DD)
- `endDate` (string, opcional): Data final para filtrar agendamentos (YYYY-MM-DD)

**Response (200):**
```json
[
  {
    "shelterId": "uuid-shelter-1",
    "shelterName": "Orfanato Luz do Amanhã",
    "totalTeams": 2,
    "teams": [
      {
        "teamId": "uuid-team-1",
        "teamNumber": 1,
        "teamName": "Equipe Matutina",
        "description": "Equipe da manhã",
        "totalSchedules": 3,
        "schedules": [
          {
            "scheduleId": "uuid-schedule-1",
            "visitNumber": 1,
            "visitDate": "2024-01-15",
            "meetingDate": null,
            "lessonContent": "Lição sobre valores",
            "observation": "Atividade realizada com sucesso",
            "meetingRoom": "Sala 3",
            "totalTeachers": 3,
            "presentCount": 3,
            "absentCount": 0,
            "pendingCount": 0,
            "attendanceRecords": [
              {
                "id": "uuid-attendance-1",
                "type": "present",
                "comment": "Chegou pontualmente",
                "memberId": "uuid-teacher-1",
                "memberName": "Maria Silva",
                "memberEmail": "maria@email.com",
                "createdAt": "2024-01-15T08:00:00Z",
                "updatedAt": "2024-01-15T08:00:00Z"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

**Erros:**
- `403 Forbidden` - Usuário não é líder ou admin

---

## Fluxo de Uso no Frontend

### Para Líder/Admin:
1. **Visão geral completa:** `GET /attendance/sheets/hierarchical` para ver todas as pagelas organizadas por abrigo→equipe→agendamento
2. **Dashboard inicial:** `GET /attendance/leader/shelters-teams-members` para hierarquia de membros
3. **Selecionar abrigo → equipe → membros** para interface drill-down
4. **Ver estatísticas:** `GET /attendance/leader/stats/team/:teamId` para métricas do time
5. **Listar eventos:** `GET /attendance/team/:teamId/schedules` com paginação e filtros
6. **Ver pendências:** `GET /attendance/pending/leader?teamId=...` para alertas
7. **Registrar presença:** `POST /attendance/register/team` (pagela em lote)

### Para Membro (Professor/Líder individual):
1. **Dashboard pessoal:** `GET /attendance/stats` para estatísticas próprias
2. **Ver pendências:** `GET /attendance/pending/member` para eventos pendentes
3. **Listar histórico:** `GET /attendance/records` para histórico completo
4. **Registrar presença:** `POST /attendance/register` para presença individual

### URLs de Frontend:
- **Admin/Líder:** `http://localhost:5173/adm/presenca`
- **Membro:** `http://localhost:5173/presenca`

---

## Notas Importantes

1. **Datas de Eventos:** O sistema considera um evento como "passado" se a data de reunião (meetingDate) OU a data de visita (visitDate) for anterior à data atual.

2. **Atualização de Registros:** Se um membro já registrou presença/falta e fizer um novo registro para o mesmo evento, o registro anterior será atualizado (não é criado um registro duplicado).

3. **Validação de Pertencimento:** O sistema valida se o membro realmente pertence ao time do evento antes de permitir o registro.

4. **Ordenação:** A lista de reuniões e visitas é ordenada pela data de visita em ordem decrescente (mais recentes primeiro).

5. **Controle de Acesso:** Líder só opera em times que lidera; membro só registra em eventos de seus times; admin tem acesso total.

6. **Comentários:** Campo sempre opcional para qualquer tipo de presença/falta (máximo 500 caracteres).

7. **Paginação:** Endpoints que retornam listas suportam paginação com `page` e `limit` para melhor performance.

8. **Filtros Avançados:** Novos endpoints suportam filtros por data, tipo de presença, time e membro.

9. **Estatísticas:** Endpoints dedicados para métricas de presença ajudam no acompanhamento de performance.

10. **Validação Aprimorada:** DTOs com validação completa garantem integridade dos dados.

11. **Hierarquia Completa:** Endpoint `/attendance/leader/shelters-teams-members` fornece visão completa abrigo→equipe→professores.

12. **Líderes não Registram Presença:** Líderes são excluídos de todos os cálculos de presença, pendências e estatísticas. Apenas professores precisam registrar presença/falta.
