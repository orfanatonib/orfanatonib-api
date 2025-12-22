# Shelters API Documentation

## Visão Geral

O módulo Shelters gerencia os abrigos do sistema, incluindo suas informações de endereço, horários, líderes e professores associados.

**Base URL:** `{{base_url}}/shelters`

**Autenticação:** Bearer Token (JWT) obrigatório em todos os endpoints

## Endpoints

### 1. Listar Shelters (Paginação)

**GET** `/shelters`

Lista todos os shelters com paginação e filtros opcionais.

#### Query Parameters

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `page` | number | Não | 1 | Número da página |
| `limit` | number | Não | 10 | Itens por página |
| `sort` | string | Não | "name" | Campo para ordenação (name, time, createdAt, updatedAt, city, state) |
| `orderBy` | string | Não | "name" | Campo para ordenação alternativo |
| `order` | string | Não | "ASC" | Ordem da ordenação (ASC, DESC, asc, desc) |
| `addressSearchString` | string | Não | - | Busca por endereço |
| `userSearchString` | string | Não | - | Busca por usuário |
| `searchString` | string | Não | - | Busca geral |
| `nameSearchString` | string | Não | - | Busca por nome do shelter |
| `leaderId` | string | Não | - | Filtrar por ID do líder |
| `hasLeader` | boolean | Não | - | Filtrar por shelters com líder |

#### Exemplo de Request

```http
GET {{base_url}}/shelters?page=1&limit=10&sort=name&order=ASC&nameSearchString=Central&hasLeader=true
```

#### Exemplo de Response

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Abrigo Central",
      "time": "19:00",
      "address": {
        "id": "uuid",
        "street": "Rua das Flores",
        "number": "123",
        "district": "Centro",
        "city": "São Paulo",
        "state": "SP",
        "postalCode": "01234-567",
        "complement": "Apto 45",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      "leader": {
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
        }
      },
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
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10
}
```

### 2. Listar Shelters Simples

**GET** `/shelters/simple`

Lista todos os shelters em formato simplificado.

#### Exemplo de Request

```http
GET {{base_url}}/shelters/simple
```

#### Exemplo de Response

```json
[
  {
    "id": "uuid",
    "name": "Abrigo Central",
    "time": "19:00",
    "address": {
      "id": "uuid",
      "street": "Rua das Flores",
      "number": "123",
      "district": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "postalCode": "01234-567",
      "complement": "Apto 45",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 3. Listar Shelters para Select

**GET** `/shelters/list`

Lista shelters formatados para uso em selects/dropdowns.

#### Exemplo de Request

```http
GET {{base_url}}/shelters/list
```

#### Exemplo de Response

```json
[
  {
    "id": "uuid",
    "detalhe": "Abrigo 1 : Centro",
    "leader": true
  },
  {
    "id": "uuid",
    "detalhe": "Abrigo 2 : Jardins",
    "leader": false
  }
]
```

### 4. Buscar Shelter por ID

**GET** `/shelters/:id`

Busca um shelter específico por ID.

#### Path Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `id` | string (UUID) | Sim | ID do shelter |

#### Exemplo de Request

```http
GET {{base_url}}/shelters/123e4567-e89b-12d3-a456-426614174000
```

#### Exemplo de Response

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Abrigo Central",
  "time": "19:00",
  "address": {
    "id": "uuid",
    "street": "Rua das Flores",
    "number": "123",
    "district": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-567",
    "complement": "Apto 45",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "leader": {
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
    }
  },
  "teachers": [],
  "weekday": "monday",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 5. Criar Shelter

**POST** `/shelters`

Cria um novo shelter.

#### Request Body

```json
{
  "name": "Abrigo Central",
  "time": "19:00",
  "address": {
    "street": "string",
    "number": "string",
    "district": "string",
    "city": "string",
    "state": "string",
    "postalCode": "string",
    "complement": "string"
  },
  "leaderProfileId": "string (UUID)",
  "teacherProfileIds": ["string (UUID)"]
}
```

#### Exemplo de Request

```http
POST {{base_url}}/shelters
Content-Type: application/json

{
  "name": "Abrigo Central",
  "time": "19:00",
  "address": {
    "street": "Rua das Flores",
    "number": "123",
    "district": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-567",
    "complement": "Apto 45"
  },
  "leaderProfileId": "123e4567-e89b-12d3-a456-426614174000",
  "teacherProfileIds": ["987fcdeb-51a2-43d7-b456-426614174000"]
}
```

#### Exemplo de Response

```json
{
  "id": "uuid",
  "number": 1,
  "time": "19:00",
  "address": {
    "id": "uuid",
    "street": "Rua das Flores",
    "number": "123",
    "district": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-567",
    "complement": "Apto 45",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "leader": {
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
    }
  },
  "teachers": [
    {
      "id": "987fcdeb-51a2-43d7-b456-426614174000",
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
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 6. Atualizar Shelter

**PUT** `/shelters/:id`

Atualiza um shelter existente.

#### Path Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `id` | string (UUID) | Sim | ID do shelter |

#### Request Body

```json
{
  "name": "Abrigo Jardins",
  "time": "20:00",
  "address": {
    "street": "string",
    "number": "string",
    "district": "string",
    "city": "string",
    "state": "string",
    "postalCode": "string",
    "complement": "string"
  },
  "leaderProfileId": "string (UUID)",
  "teacherProfileIds": ["string (UUID)"]
}
```

#### Exemplo de Request

```http
PUT {{base_url}}/shelters/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json

{
  "name": "Abrigo Jardins",
  "time": "20:00",
  "address": {
    "street": "Rua das Palmeiras",
    "number": "456",
    "district": "Jardins",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-890",
    "complement": "Casa 2"
  },
  "leaderProfileId": "123e4567-e89b-12d3-a456-426614174000",
  "teacherProfileIds": ["987fcdeb-51a2-43d7-b456-426614174000"]
}
```

#### Exemplo de Response

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "number": 2,
  "time": "20:00",
  "address": {
    "id": "uuid",
    "street": "Rua das Palmeiras",
    "number": "456",
    "district": "Jardins",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-890",
    "complement": "Casa 2",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "leader": {
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
    }
  },
  "teachers": [
    {
      "id": "987fcdeb-51a2-43d7-b456-426614174000",
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
  ],
  "weekday": "tuesday",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 7. Deletar Shelter

**DELETE** `/shelters/:id`

Remove um shelter.

#### Path Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `id` | string (UUID) | Sim | ID do shelter |

#### Exemplo de Request

```http
DELETE {{base_url}}/shelters/123e4567-e89b-12d3-a456-426614174000
```

#### Exemplo de Response

```json
{
  "message": "Shelter removido com sucesso"
}
```

## Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Dados inválidos |
| 401 | Não autorizado |
| 404 | Recurso não encontrado |
| 500 | Erro interno do servidor |

## Estruturas de Dados

### ShelterResponseDto

```typescript
{
  id: string;
  name: string;
  time: string | null;
  address: AddressResponseDto;
  leader: CoordinatorWithUserDto | null;
  teachers: TeacherWithUserDto[];
  createdAt: Date;
  updatedAt: Date;
}
```

### ShelterSimpleResponseDto

```typescript
{
  id: string;
  name: string;
  time: string | null;
  address: AddressResponseDto;
  createdAt: Date;
  updatedAt: Date;
}
```

### ShelterSelectOptionDto

```typescript
{
  id: string;
  detalhe: string;
  leader: boolean;
}
```

### AddressInputDto (Create)

```typescript
{
  street: string;
  number?: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  complement?: string;
}
```

### AddressPatchDto (Update)

```typescript
{
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  complement?: string;
}
```

### CoordinatorWithUserDto

```typescript
{
  id: string;
  active: boolean;
  user: UserMiniDto;
}
```

### TeacherWithUserDto

```typescript
{
  id: string;
  active: boolean;
  user: UserMiniDto;
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

## Enums

### Weekday

```typescript
enum Weekday {
  MONDAY = "monday",
  TUESDAY = "tuesday",
  WEDNESDAY = "wednesday",
  THURSDAY = "thursday",
  FRIDAY = "friday",
  SATURDAY = "saturday"
}
```

## Validações

### Formato de Horário
- **Padrão:** `H:mm` ou `HH:mm` (0:00–23:59)
- **Exemplos válidos:** `9:30`, `19:00`, `23:59`
- **Exemplos inválidos:** `25:00`, `9:60`, `abc`

### Campos Obrigatórios (Create)
- `name` - Nome do shelter (string, 2-255 caracteres)
- `address` - Objeto de endereço completo

### Campos Opcionais (Create)
- `time` - Horário do shelter
- `leaderProfileId` - ID do líder
- `teacherProfileIds` - Array de IDs dos professores

## Exemplos de Uso

### 1. Buscar shelters por nome

```http
GET {{base_url}}/shelters?nameSearchString=Central
```

### 2. Buscar shelters por cidade

```http
GET {{base_url}}/shelters?addressSearchString=São Paulo
```

### 3. Buscar shelters ordenados por nome

```http
GET {{base_url}}/shelters?sort=name&order=ASC
```

### 4. Buscar shelters de um líder específico

```http
GET {{base_url}}/shelters?leaderId=123e4567-e89b-12d3-a456-426614174000
```

### 5. Buscar shelters sem líder

```http
GET {{base_url}}/shelters?hasLeader=false
```

## Notas Importantes

1. **Autenticação**: Todos os endpoints requerem autenticação JWT válida
2. **Validação de UUID**: Todos os IDs devem ser UUIDs válidos
3. **Horário**: Formato deve seguir o padrão H:mm ou HH:mm
4. **Endereço**: Todos os campos de endereço são obrigatórios na criação
5. **Relacionamentos**: Líder e professores são opcionais
6. **Paginação**: Suporte completo com filtros avançados
7. **Busca**: Múltiplos tipos de busca disponíveis (endereço, usuário, clube, geral)
