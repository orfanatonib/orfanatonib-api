# Leader Profiles API Documentation

## Visão Geral

O módulo Leader Profiles gerencia os perfis de líderes do sistema, incluindo suas atribuições a shelters e relacionamentos com professores.

**Base URL:** `{{base_url}}/leader-profiles`

**Autenticação:** Bearer Token (JWT) obrigatório em todos os endpoints

## Endpoints

### 1. Listar Leader Profiles (Paginação)

**GET** `/leader-profiles`

Lista todos os leader profiles com paginação e filtros opcionais.

#### Query Parameters

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `page` | number | Não | 1 | Número da página |
| `limit` | number | Não | 12 | Itens por página (máximo: 100) |
| `sort` | string | Não | "updatedAt" | Campo para ordenação (updatedAt, createdAt, name) |
| `order` | string | Não | "desc" | Ordem da ordenação (asc, desc) |
| `searchString` | string | Não | - | String de busca |
| `q` | string | Não | - | Query de busca alternativa |
| `active` | boolean | Não | - | Filtrar por status ativo |
| `hasShelters` | boolean | Não | - | Filtrar por líderes com shelters |
| `shelterNumber` | number | Não | - | Filtrar por número do shelter |

#### Exemplo de Request

```http
GET {{base_url}}/leader-profiles?page=1&limit=12&sort=updatedAt&order=desc&active=true&hasShelters=true
```

#### Exemplo de Response

```json
{
  "items": [
    {
      "id": "uuid",
      "active": true,
      "user": {
        "id": "uuid",
        "name": "João Silva",
        "email": "joao@email.com",
        "phone": "11999999999",
        "active": true,
        "completed": true,
        "commonUser": false
      },
      "shelter": {
        "id": "uuid",
        "number": 1,
        "weekday": "SUNDAY",
        "teachers": [
          {
            "id": "uuid",
            "active": true,
            "user": {
              "id": "uuid",
              "name": "Maria Santos",
              "email": "maria@email.com",
              "phone": "11888888888",
              "active": true,
              "completed": true,
              "commonUser": false
            }
          }
        ]
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 12
}
```

### 2. Listar Leader Profiles Simples

**GET** `/leader-profiles/simple`

Lista todos os leader profiles em formato simplificado.

#### Exemplo de Request

```http
GET {{base_url}}/leader-profiles/simple
```

#### Exemplo de Response

```json
[
  {
    "leaderProfileId": "uuid",
    "name": "João Silva",
    "vinculado": true
  },
  {
    "leaderProfileId": "uuid",
    "name": "Maria Santos",
    "vinculado": false
  }
]
```

### 3. Buscar Leader Profile por ID

**GET** `/leader-profiles/:id`

Busca um leader profile específico por ID.

#### Path Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `id` | string (UUID) | Sim | ID do leader profile |

#### Exemplo de Request

```http
GET {{base_url}}/leader-profiles/123e4567-e89b-12d3-a456-426614174000
```

#### Exemplo de Response

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "active": true,
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "11999999999",
    "active": true,
    "completed": true,
    "commonUser": false
  },
  "shelter": {
    "id": "uuid",
    "number": 1,
    "weekday": "SUNDAY",
    "teachers": []
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 4. Buscar Leader Profile por Shelter ID

**GET** `/leader-profiles/by-shelter/:shelterId`

Busca o leader profile responsável por um shelter específico.

#### Path Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `shelterId` | string (UUID) | Sim | ID do shelter |

#### Exemplo de Request

```http
GET {{base_url}}/leader-profiles/by-shelter/123e4567-e89b-12d3-a456-426614174000
```

#### Exemplo de Response

```json
{
  "id": "uuid",
  "active": true,
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "11999999999",
    "active": true,
    "completed": true,
    "commonUser": false
  },
  "shelter": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "number": 1,
    "weekday": "SUNDAY",
    "teachers": []
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 5. Atribuir Shelter ao Leader

**PATCH** `/leader-profiles/:leaderId/assign-shelter`

Atribui um shelter a um leader profile.

#### Path Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `leaderId` | string (UUID) | Sim | ID do leader profile |

#### Request Body

```json
{
  "shelterId": "string (UUID)"
}
```

#### Exemplo de Request

```http
PATCH {{base_url}}/leader-profiles/123e4567-e89b-12d3-a456-426614174000/assign-shelter
Content-Type: application/json

{
  "shelterId": "987fcdeb-51a2-43d7-b456-426614174000"
}
```

#### Exemplo de Response

```json
{
  "message": "Líder atribuído ao shelter com sucesso"
}
```

### 6. Remover Shelter do Leader

**PATCH** `/leader-profiles/:leaderId/unassign-shelter`

Remove um shelter de um leader profile.

#### Path Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `leaderId` | string (UUID) | Sim | ID do leader profile |

#### Request Body

```json
{
  "shelterId": "string (UUID)"
}
```

#### Exemplo de Request

```http
PATCH {{base_url}}/leader-profiles/123e4567-e89b-12d3-a456-426614174000/unassign-shelter
Content-Type: application/json

{
  "shelterId": "987fcdeb-51a2-43d7-b456-426614174000"
}
```

#### Exemplo de Response

```json
{
  "message": "Líder removido do shelter com sucesso"
}
```

### 7. Mover Shelter entre Leaders

**PATCH** `/leader-profiles/:fromLeaderId/move-shelter`

Move um shelter de um leader para outro.

#### Path Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `fromLeaderId` | string (UUID) | Sim | ID do leader profile atual |

#### Request Body

```json
{
  "shelterId": "string (UUID)",
  "toLeaderId": "string (UUID)"
}
```

#### Exemplo de Request

```http
PATCH {{base_url}}/leader-profiles/123e4567-e89b-12d3-a456-426614174000/move-shelter
Content-Type: application/json

{
  "shelterId": "987fcdeb-51a2-43d7-b456-426614174000",
  "toLeaderId": "456e7890-e89b-12d3-a456-426614174000"
}
```

#### Exemplo de Response

```json
{
  "message": "Shelter movido com sucesso"
}
```

## Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 400 | Dados inválidos |
| 401 | Não autorizado |
| 404 | Recurso não encontrado |
| 500 | Erro interno do servidor |

## Estruturas de Dados

### LeaderResponseDto

```typescript
{
  id: string;
  active: boolean;
  user: UserMiniDto;
  shelter: ShelterWithTeachersDto | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### UserMiniDto

```typescript
{
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  completed: boolean;
  commonUser: boolean;
}
```

### ShelterWithTeachersDto

```typescript
{
  id: string;
  number: number;
  weekday: Weekday;
  teachers: TeacherMiniDto[];
}
```

### TeacherMiniDto

```typescript
{
  id: string;
  active: boolean;
  user: UserMiniDto;
}
```

### LeaderSimpleListDto

```typescript
{
  leaderProfileId: string;
  name: string;
  vinculado: boolean;
}
```

## Enums

### Weekday

```typescript
enum Weekday {
  SUNDAY = "SUNDAY",
  MONDAY = "MONDAY",
  TUESDAY = "TUESDAY",
  WEDNESDAY = "WEDNESDAY",
  THURSDAY = "THURSDAY",
  FRIDAY = "FRIDAY",
  SATURDAY = "SATURDAY"
}
```

## Exemplos de Uso

### 1. Buscar todos os líderes ativos com shelters

```http
GET {{base_url}}/leader-profiles?active=true&hasShelters=true
```

### 2. Buscar líderes por nome

```http
GET {{base_url}}/leader-profiles?searchString=João
```

### 3. Buscar líderes ordenados por nome

```http
GET {{base_url}}/leader-profiles?sort=name&order=asc
```

### 4. Buscar líderes do shelter número 5

```http
GET {{base_url}}/leader-profiles?shelterNumber=5
```

## Notas Importantes

1. **Autenticação**: Todos os endpoints requerem autenticação JWT válida
2. **Paginação**: O endpoint de listagem suporta paginação com limite máximo de 100 itens por página
3. **Filtros**: Múltiplos filtros podem ser combinados na mesma requisição
4. **Validação**: Todos os IDs devem ser UUIDs válidos
5. **Relacionamentos**: Os endpoints retornam dados relacionados (usuário, shelter, professores) quando disponíveis
