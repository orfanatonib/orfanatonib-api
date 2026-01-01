# Shelter Schedule API

**v2.1.0** - Datas opcionais, eventos independentes, limpeza automática de S3

---

## Endpoints

### 1. POST /shelter-schedules
**Criar Agendamento**

**Auth:** JWT + Admin/Leader

**Request Body:**
```json
{
  "visitNumber": 1,
  "teamId": "uuid-da-equipe",
  "visitDate": "2024-03-15",
  "meetingDate": "2024-03-10",
  "lessonContent": "Parábola do Bom Samaritano",
  "observation": "Preparar materiais",
  "meetingRoom": "Sala 3"
}
```

**Variações Suportadas:**
```json
{
  "teamId": "...",
  "visitDate": "2024-03-15",
  "lessonContent": "..."
}
```
→ Cria APENAS evento de visita

```json
{
  "teamId": "...",
  "meetingDate": "2024-03-10",
  "lessonContent": "..."
}
```
→ Cria APENAS evento de reunião

```json
{
  "teamId": "...",
  "lessonContent": "..."
}
```
→ Cria schedule SEM eventos

**DTO:** CreateShelterScheduleDto

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `visitNumber` | number | **Sim** | Número da visita |
| `teamId` | UUID | Sim | ID da equipe |
| `visitDate` | string | Não | Data da visita |
| `meetingDate` | string | Não | Data da reunião |
| `lessonContent` | string | Sim | Conteúdo da lição |
| `observation` | string | Não | Observações |
| `meetingRoom` | string | Não | Sala da reunião |

**Response:** ShelterScheduleResponseDto (201 Created)
```json
{
  "id": "uuid-do-agendamento",
  "visitNumber": 1,
  "visitDate": "2024-03-15",
  "meetingDate": "2024-03-10",
  "lessonContent": "Parábola do Bom Samaritano",
  "observation": "Preparar materiais",
  "meetingRoom": "Sala 3",
  "shelter": {
    "id": "uuid-do-abrigo",
    "name": "Abrigo Esperança",
    "team": {
      "id": "uuid-da-equipe",
      "numberTeam": 1
    }
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Status:** 201 Created | 400 Bad Request | 401 Unauthorized | 403 Forbidden | 404 Not Found

---

### 2. GET /shelter-schedules
**Listar Agendamentos (Filtrado por Contexto)**

**Auth:** JWT (todas as roles)

**Response:** Array de ShelterScheduleResponseDto (200 OK)
```json
[
  {
    "id": "uuid-1",
    "visitDate": "2024-03-15",
    "meetingDate": "2024-03-10",
    "lessonContent": "Parábola do Bom Samaritano",
    "observation": "Preparar materiais visuais",
    "meetingRoom": "Sala 3 - NIB",
    "shelter": {
      "id": "uuid-abrigo-1",
      "name": "Abrigo Esperança",
      "description": "Abrigo para crianças",
      "address": {
        "street": "Rua das Flores",
        "number": "123",
        "district": "Centro",
        "city": "São Paulo",
        "state": "SP",
        "postalCode": "01234-567",
        "complement": "Próximo ao mercado"
      },
      "team": {
        "id": "uuid-equipe-1",
        "numberTeam": 1,
        "description": "Equipe principal"
      }
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

**Status:** 200 OK | 401 Unauthorized

---

### 3. PUT /shelter-schedules/:id
**Atualizar Agendamento**

**Auth:** JWT + Admin/Leader

**Request Body:**
```json
{
  "visitNumber": 2,
  "visitDate": "2024-03-20",
  "meetingDate": "2024-03-15",
  "lessonContent": "Parábola do Filho Pródigo",
  "observation": "Incluir atividade prática",
  "meetingRoom": "Sala 2",
  "teamId": "novo-uuid-da-equipe"
}
```

**DTO:** UpdateShelterScheduleDto

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `visitNumber` | number | Não | Novo número da visita |
| `teamId` | UUID | Não | Novo ID da equipe |
| `visitDate` | string | Não | Nova data da visita |
| `meetingDate` | string | Não | Nova data da reunião |
| `lessonContent` | string | Não | Novo conteúdo da lição |
| `observation` | string | Não | Novas observações |
| `meetingRoom` | string | Não | Nova sala da reunião |

**Response:** ShelterScheduleResponseDto (200 OK)
```json
{
  "id": "uuid-do-agendamento",
  "visitNumber": 2,
  "visitDate": "2024-03-20",
  "meetingDate": "2024-03-15",
  "lessonContent": "Parábola do Filho Pródigo",
  "observation": "Incluir atividade prática",
  "meetingRoom": "Sala 2",
  "shelter": {
    "id": "uuid-do-abrigo",
    "name": "Abrigo Esperança",
    "team": {
      "id": "novo-uuid-da-equipe",
      "numberTeam": 1
    }
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

**Status:** 200 OK | 400 Bad Request | 401 Unauthorized | 403 Forbidden | 404 Not Found

---

### 4. DELETE /shelter-schedules/:id
**Deletar Agendamento**

**Auth:** JWT + Admin/Leader
