# 🏠 Módulo Abrigo - Documentação Completa de Endpoints

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Autenticação](#-autenticação)
3. [Endpoints Detalhados](#-endpoints-detalhados)
4. [Endpoints Auxiliares](#-endpoints-auxiliares)
5. [DTOs de Entrada](#-dtos-de-entrada)
6. [DTOs de Saída](#-dtos-de-saída)
7. [Códigos de Erro](#-códigos-de-erro)

---

## 📋 Visão Geral

Este documento descreve **todos os endpoints** do módulo de Abrigos, incluindo:
- DTOs de entrada e saída detalhados
- Exemplos de requisições e respostas
- Códigos de erro

### 🎯 Base URL

```
http://localhost:3000/shelters
```

### 🔐 Autenticação

**Todos os endpoints requerem autenticação JWT.** Inclua o token no header:

```
Authorization: Bearer <seu-token-jwt>
```

---

## 📡 Endpoints Detalhados

### 1. GET /shelters - Listar Abrigos (Paginado)

Lista todos os abrigos com paginação e filtros.

#### Request

**Query Parameters:**

```typescript
interface QuerySheltersDto {
  page?: number;           // Página (padrão: 1)
  limit?: number;          // Itens por página (padrão: 10)
  sort?: 'name' | 'createdAt' | 'updatedAt' | 'city' | 'state';  // Campo de ordenação (padrão: 'name')
  order?: 'ASC' | 'DESC' | 'asc' | 'desc';  // Ordem (padrão: 'ASC')
  searchString?: string;   // Busca unificada: nome, cidade, UF, bairro, nome de professores ou líderes
}
```

**Exemplo de Requisição:**

```http
GET /shelters?page=1&limit=10&sort=name&order=ASC&searchString=São Paulo
Authorization: Bearer <token>
```

#### Response

**Status:** `200 OK`

```typescript
interface Paginated<ShelterResponseDto> {
  items: ShelterResponseDto[];
  total: number;
  page: number;
  limit: number;
}
```

**Exemplo de Resposta:**

```json
{
  "items": [
    {
      "id": "uuid-here",
      "name": "Abrigo São Paulo",
      "description": "Abrigo dedicado ao cuidado de crianças",
      "teamsQuantity": 3,
      "address": {
        "id": "uuid-here",
        "street": "Rua das Flores",
        "number": "123",
        "district": "Centro",
        "city": "São Paulo",
        "state": "SP",
        "postalCode": "01234-567",
        "complement": null
      },
      "teams": [
        {
          "id": "uuid-here",
          "numberTeam": 1,
          "description": "Equipe matutina",
          "leaders": [
            {
              "id": "uuid-here",
              "active": true,
              "user": {
                "id": "uuid-here",
                "name": "João Silva",
                "email": "joao@example.com",
                "phone": "11999999999",
                "active": true,
                "completed": true,
                "commonUser": false
              }
            }
          ],
          "teachers": [
            {
              "id": "uuid-here",
              "active": true,
              "user": {
                "id": "uuid-here",
                "name": "Maria Santos",
                "email": "maria@example.com",
                "phone": "11888888888",
                "active": true,
                "completed": true,
                "commonUser": false
              }
            }
          ]
        }
      ],
      "leaders": [...],  // Agregado de todos os líderes de todas as equipes
      "teachers": [...], // Agregado de todos os professores de todas as equipes
      "mediaItem": {
        "id": "uuid-here",
        "title": "Foto do Abrigo",
        "description": "Imagem principal",
        "mediaType": "IMAGE",
        "uploadType": "UPLOAD",
        "url": "https://s3.amazonaws.com/...",
        "isLocalFile": true,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
      },
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10
}
```

---

### 2. GET /shelters/simple - Listar Abrigos (Simplificado)

Lista todos os abrigos em formato simplificado (sem paginação).

#### Request

```http
GET /shelters/simple
Authorization: Bearer <token>
```

#### Response

**Status:** `200 OK`

```typescript
interface ShelterSimpleResponseDto {
  id: string;
  name: string;
  description?: string;
  teamsQuantity?: number;
  address: AddressResponseDto;
  teams: TeamWithMembersDto[];
  mediaItem?: MediaItemResponseDto | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Exemplo de Resposta:**

```json
[
  {
    "id": "uuid-here",
    "name": "Abrigo São Paulo",
    "description": "Abrigo dedicado ao cuidado de crianças",
    "teamsQuantity": 3,
    "address": { ... },
    "teams": [ ... ],
    "mediaItem": { ... },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### 3. GET /shelters/list - Listar Abrigos (Select Options)

Lista abrigos em formato simplificado para uso em selects/dropdowns.

#### Request

```http
GET /shelters/list
Authorization: Bearer <token>
```

#### Response

**Status:** `200 OK`

```typescript
interface ShelterSelectOptionDto {
  id: string;
  detalhe: string;  // Formato: "Nome do Abrigo : Bairro"
  leader: boolean;  // Indica se o abrigo tem líderes
}
```

**Exemplo de Resposta:**

```json
[
  {
    "id": "uuid-here",
    "detalhe": "Abrigo São Paulo : Centro",
    "leader": true
  },
  {
    "id": "uuid-here-2",
    "detalhe": "Abrigo Rio de Janeiro : Copacabana",
    "leader": false
  }
]
```

---

### 4. GET /shelters/:id - Buscar Abrigo por ID

Busca um abrigo específico pelo ID.

#### Request

```http
GET /shelters/86226231-33d8-4bc9-8d1f-5e29441917c3
Authorization: Bearer <token>
```

#### Response

**Status:** `200 OK`

```typescript
interface ShelterResponseDto {
  id: string;
  name: string;
  description?: string;
  teamsQuantity?: number;
  address: AddressResponseDto;
  teams: TeamWithMembersDto[];
  leaders: CoordinatorWithUserDto[];  // Agregado de todas as equipes
  teachers: TeacherWithUserDto[];     // Agregado de todas as equipes
  mediaItem?: MediaItemResponseDto | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Exemplo de Resposta:**

```json
{
  "id": "86226231-33d8-4bc9-8d1f-5e29441917c3",
  "name": "Abrigo São Paulo",
  "description": "Abrigo dedicado ao cuidado de crianças",
  "teamsQuantity": 3,
  "address": { ... },
  "teams": [ ... ],
  "leaders": [ ... ],
  "teachers": [ ... ],
  "mediaItem": { ... },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**Erros:**

- `404 Not Found`: Abrigo não encontrado

---

### 5. GET /shelters/:id/teams-quantity - Buscar Quantidade de Equipes

Retorna apenas a quantidade de equipes de um abrigo.

#### Request

```http
GET /shelters/86226231-33d8-4bc9-8d1f-5e29441917c3/teams-quantity
Authorization: Bearer <token>
```

#### Response

**Status:** `200 OK`

```typescript
interface ShelterTeamsQuantityResponseDto {
  id: string;
  teamsQuantity: number;  // Retorna 0 se não estiver definido
}
```

**Exemplo de Resposta:**

```json
{
  "id": "86226231-33d8-4bc9-8d1f-5e29441917c3",
  "teamsQuantity": 3
}
```

**Nota:** Se `teamsQuantity` for `null` ou `undefined`, retorna `0` em vez de erro.

---

### 6. POST /shelters - Criar Abrigo

Cria um novo abrigo. **Suporta form-data (com arquivos) ou JSON puro.**

#### Request

**Opção 1: JSON Puro**

```http
POST /shelters
Content-Type: application/json
Authorization: Bearer <token>
```

**Body (JSON):**

```typescript
interface CreateShelterRequestDto {
  name: string;                    // Obrigatório (2-255 caracteres)
  description?: string;            // Opcional
  teamsQuantity: number;           // Obrigatório (mínimo 1)
  address: AddressInputDto;        // Obrigatório
  teams?: TeamInputDto[];          // Opcional - para vincular líderes/professores
  mediaItem?: MediaItemInputDto;   // Opcional
}
```

**Exemplo (JSON):**

```json
{
  "name": "Abrigo Novo",
  "description": "Novo abrigo para crianças",
  "teamsQuantity": 2,
  "address": {
    "street": "Rua das Flores",
    "number": "123",
    "district": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-567",
    "complement": "Apto 101"
  },
  "teams": [
    {
      "numberTeam": 1,
      "description": "Equipe matutina",
      "leaderProfileIds": ["uuid-lider-1"],
      "teacherProfileIds": ["uuid-professor-1", "uuid-professor-2"]
    },
    {
      "numberTeam": 2,
      "description": "Equipe vespertina",
      "leaderProfileIds": ["uuid-lider-2"],
      "teacherProfileIds": ["uuid-professor-3"]
    }
  ],
  "mediaItem": {
    "title": "Foto do Abrigo",
    "description": "Imagem principal",
    "uploadType": "LINK",
    "url": "https://example.com/image.jpg"
  }
}
```

**Opção 2: Form-Data (com arquivo)**

```http
POST /shelters
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Body (Form-Data):**

```
shelterData: {"name":"Abrigo Novo","description":"...","teamsQuantity":2,"address":{...},"teams":[...]}
file: [arquivo de imagem]
```

**Exemplo (Form-Data com arquivo):**

```javascript
const formData = new FormData();
formData.append('shelterData', JSON.stringify({
  name: "Abrigo Novo",
  description: "Novo abrigo",
  teamsQuantity: 2,
  address: {
    street: "Rua das Flores",
    number: "123",
    district: "Centro",
    city: "São Paulo",
    state: "SP",
    postalCode: "01234-567"
  },
  teams: [
    {
      numberTeam: 1,
      leaderProfileIds: ["uuid-lider-1"],
      teacherProfileIds: ["uuid-professor-1"]
    }
  ],
  mediaItem: {
    title: "Foto do Abrigo",
    uploadType: "UPLOAD",
    isLocalFile: true,
    fieldKey: "file"
  }
}));
formData.append('file', fileInput.files[0]);
```

#### Response

**Status:** `201 Created`

```typescript
interface ShelterResponseDto {
  // ... (mesma estrutura do GET /shelters/:id)
}
```

**Erros:**

- `400 Bad Request`: Dados inválidos
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Sem permissão (apenas admin e leader)

---

### 7. PUT /shelters/:id - Atualizar Abrigo

Atualiza um abrigo existente. **Suporta form-data (com arquivos) ou JSON puro.**

#### Request

**Opção 1: JSON Puro**

```http
PUT /shelters/86226231-33d8-4bc9-8d1f-5e29441917c3
Content-Type: application/json
Authorization: Bearer <token>
```

**Body (JSON):**

```typescript
interface UpdateShelterRequestDto {
  name?: string;                   // Opcional
  description?: string;            // Opcional
  teamsQuantity: number;           // Obrigatório (mínimo 1)
  address?: AddressPatchDto;       // Opcional
  teams?: TeamInputDto[];          // Opcional - para atualizar equipes
  mediaItem?: MediaItemDto;        // Opcional
}
```

**Exemplo (JSON):**

```json
{
  "name": "Abrigo Atualizado",
  "description": "Nova descrição",
  "teamsQuantity": 4,
  "address": {
    "street": "Nova Rua",
    "number": "456",
    "district": "Novo Bairro",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-567"
  },
  "teams": [
    {
      "numberTeam": 1,
      "description": "Equipe atualizada",
      "leaderProfileIds": ["uuid-lider-1"],
      "teacherProfileIds": ["uuid-professor-1"]
    }
  ]
}
```

**Opção 2: Form-Data (com arquivo)**

```http
PUT /shelters/86226231-33d8-4bc9-8d1f-5e29441917c3
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Body (Form-Data):**

```
shelterData: {"name":"Abrigo Atualizado","teamsQuantity":4,...}
file: [arquivo de imagem]
```

#### Response

**Status:** `200 OK`

```typescript
interface ShelterResponseDto {
  // ... (mesma estrutura do GET /shelters/:id)
}
```

**Erros:**

- `400 Bad Request`: Dados inválidos
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Sem permissão
- `404 Not Found`: Abrigo não encontrado

**Notas Importantes:**

- Se `teamsQuantity` aumentar, novas equipes serão criadas automaticamente
- Se `teamsQuantity` diminuir, equipes extras serão removidas
- Se `teams` array for fornecido, as equipes serão atualizadas/criadas conforme especificado

---

### 8. PATCH /shelters/:id/media - Atualizar Mídia do Abrigo

Atualiza apenas a mídia (imagem) de um abrigo. **Suporta form-data (com arquivo) ou JSON puro.**

#### Request

**Opção 1: JSON Puro (URL externa)**

```http
PATCH /shelters/86226231-33d8-4bc9-8d1f-5e29441917c3/media
Content-Type: application/json
Authorization: Bearer <token>
```

**Body (JSON):**

```typescript
interface UpdateShelterMediaRequestDto {
  title?: string;                  // Opcional
  description?: string;            // Opcional
  uploadType?: 'UPLOAD' | 'LINK'; // Opcional
  url?: string;                    // URL da imagem (para LINK)
  isLocalFile?: boolean;           // Opcional
}
```

**Exemplo (JSON com URL):**

```json
{
  "title": "Nova Foto do Abrigo",
  "description": "Imagem atualizada",
  "uploadType": "LINK",
  "url": "https://example.com/nova-imagem.jpg"
}
```

**Opção 2: Form-Data (com arquivo)**

```http
PATCH /shelters/86226231-33d8-4bc9-8d1f-5e29441917c3/media
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Body (Form-Data):**

```
mediaData: {"title":"Nova Foto","uploadType":"UPLOAD","isLocalFile":true,"fieldKey":"file"}
file: [arquivo de imagem]
```

**Exemplo (Form-Data com arquivo):**

```javascript
const formData = new FormData();
formData.append('mediaData', JSON.stringify({
  title: "Nova Foto do Abrigo",
  description: "Imagem atualizada",
  uploadType: "UPLOAD",
  isLocalFile: true,
  fieldKey: "file"
}));
formData.append('file', fileInput.files[0]);
```

**Opção 3: Campos Diretos (Form-Data)**

```
title: Nova Foto do Abrigo
description: Imagem atualizada
url: https://example.com/imagem.jpg
```

#### Response

**Status:** `200 OK`

```typescript
interface ShelterResponseDto {
  // ... (mesma estrutura do GET /shelters/:id)
}
```

**Erros:**

- `400 Bad Request`: Dados inválidos ou arquivo não encontrado
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Sem permissão
- `404 Not Found`: Abrigo não encontrado

---

### 9. DELETE /shelters/:id - Deletar Abrigo

Deleta um abrigo.

#### Request

```http
DELETE /shelters/86226231-33d8-4bc9-8d1f-5e29441917c3
Authorization: Bearer <token>
```

#### Response

**Status:** `200 OK`

```json
{
  "message": "Shelter removido com sucesso"
}
```

**Erros:**

- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Sem permissão
- `404 Not Found`: Abrigo não encontrado

---

## 🔗 Endpoints Auxiliares

Estes endpoints são necessários para obter listas de líderes e professores que podem ser vinculados às equipes dos abrigos.

### GET /leader-profiles/simple - Listar Líderes (Simplificado)

Lista todos os líderes em formato simplificado para uso em selects/dropdowns.

#### Request

```http
GET /leader-profiles/simple
Authorization: Bearer <token>
```

#### Response

**Status:** `200 OK`

```typescript
interface LeaderSimpleListDto {
  leaderProfileId: string;  // ID do perfil de líder (use este ID para vincular)
  name: string;             // Nome do líder
  vinculado: boolean;       // Indica se já está vinculado a uma equipe
}
```

**Exemplo de Resposta:**

```json
[
  {
    "leaderProfileId": "uuid-lider-1",
    "name": "João Silva",
    "vinculado": false
  },
  {
    "leaderProfileId": "uuid-lider-2",
    "name": "Maria Santos",
    "vinculado": true
  }
]
```

**Uso:** Use o campo `leaderProfileId` no array `leaderProfileIds` ao criar/editar equipes.

---

### GET /teacher-profiles/simple - Listar Professores (Simplificado)

Lista todos os professores em formato simplificado para uso em selects/dropdowns.

#### Request

```http
GET /teacher-profiles/simple
Authorization: Bearer <token>
```

#### Response

**Status:** `200 OK`

```typescript
interface TeacherSimpleListDto {
  teacherProfileId: string;  // ID do perfil de professor (use este ID para vincular)
  name: string;              // Nome do professor
  vinculado: boolean;        // Indica se já está vinculado a uma equipe
}
```

**Exemplo de Resposta:**

```json
[
  {
    "teacherProfileId": "uuid-professor-1",
    "name": "Pedro Costa",
    "vinculado": false
  },
  {
    "teacherProfileId": "uuid-professor-2",
    "name": "Ana Lima",
    "vinculado": true
  }
]
```

**Uso:** Use o campo `teacherProfileId` no array `teacherProfileIds` ao criar/editar equipes.

**Nota:** Use o campo `leaderProfileId` (não `id`) para vincular líderes às equipes. Use o campo `teacherProfileId` (não `id`) para vincular professores às equipes.

---

## 📥 DTOs de Entrada

### CreateShelterRequestDto

```typescript
interface CreateShelterRequestDto {
  // Opção 1: Form-data com shelterData (string JSON)
  shelterData?: string | CreateShelterDto;
  
  // Opção 2: Campos diretos (JSON puro)
  name?: string;
  description?: string;
  teamsQuantity?: number;
  address?: AddressInputDto | string;
  teams?: TeamInputDto[] | string;
  mediaItem?: MediaItemInputDto | string;
}
```

### UpdateShelterRequestDto

```typescript
interface UpdateShelterRequestDto {
  // Opção 1: Form-data com shelterData (string JSON)
  shelterData?: string | UpdateShelterDto;
  
  // Opção 2: Campos diretos (JSON puro)
  name?: string;
  description?: string;
  teamsQuantity?: number;
  address?: AddressPatchDto | string;
  teams?: TeamInputDto[] | string;
  mediaItem?: MediaItemDto | string;
}
```

### UpdateShelterMediaRequestDto

```typescript
interface UpdateShelterMediaRequestDto {
  // Opção 1: Form-data com mediaData (string JSON)
  mediaData?: string | {
    title?: string;
    description?: string;
    uploadType?: 'UPLOAD' | 'LINK';
    url?: string;
    isLocalFile?: boolean;
  };
  
  // Opção 2: Campos diretos
  title?: string;
  description?: string;
  uploadType?: 'UPLOAD' | 'LINK';
  url?: string;
  isLocalFile?: boolean;
}
```

### AddressInputDto

```typescript
interface AddressInputDto {
  street: string;          // Obrigatório
  number?: string;         // Opcional
  district: string;        // Obrigatório
  city: string;            // Obrigatório
  state: string;           // Obrigatório
  postalCode: string;      // Obrigatório
  complement?: string;     // Opcional
}
```

### AddressPatchDto

```typescript
interface AddressPatchDto {
  id?: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  complement?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

### TeamInputDto

```typescript
interface TeamInputDto {
  numberTeam: number;                    // Obrigatório (mínimo 1)
  description?: string;                  // Opcional
  leaderProfileIds?: string[];           // Opcional (array de UUIDs)
  teacherProfileIds?: string[];          // Opcional (array de UUIDs)
}
```

### MediaItemInputDto

```typescript
interface MediaItemInputDto {
  title?: string;
  description?: string;
  uploadType?: 'UPLOAD' | 'LINK';
  platformType?: string;
  url?: string;
  isLocalFile?: boolean;
  originalName?: string;
  size?: number;
  fieldKey?: string;  // Nome do campo no form-data (ex: "file")
}
```

### MediaItemDto

```typescript
interface MediaItemDto {
  id?: string;
  title?: string;
  description?: string;
  uploadType?: 'UPLOAD' | 'LINK';
  platformType?: string;
  url?: string;
  isLocalFile?: boolean;
  originalName?: string;
  size?: number;
  fieldKey?: string;
}
```

### QuerySheltersDto

```typescript
interface QuerySheltersDto {
  page?: number;           // Padrão: 1
  limit?: number;          // Padrão: 10
  sort?: 'name' | 'createdAt' | 'updatedAt' | 'city' | 'state';  // Padrão: 'name'
  order?: 'ASC' | 'DESC' | 'asc' | 'desc';  // Padrão: 'ASC'
  searchString?: string;   // Busca unificada
}
```

---

## 📤 DTOs de Saída

### ShelterResponseDto

```typescript
interface ShelterResponseDto {
  id: string;
  name: string;
  description?: string;
  teamsQuantity?: number;
  address: AddressResponseDto;
  teams: TeamWithMembersDto[];
  leaders: CoordinatorWithUserDto[];  // Agregado de todas as equipes
  teachers: TeacherWithUserDto[];     // Agregado de todas as equipes
  mediaItem?: MediaItemResponseDto | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### ShelterSimpleResponseDto

```typescript
interface ShelterSimpleResponseDto {
  id: string;
  name: string;
  description?: string;
  teamsQuantity?: number;
  address: AddressResponseDto;
  teams: TeamWithMembersDto[];
  mediaItem?: MediaItemResponseDto | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### ShelterSelectOptionDto

```typescript
interface ShelterSelectOptionDto {
  id: string;
  detalhe: string;  // Formato: "Nome do Abrigo : Bairro"
  leader: boolean;  // Indica se tem líderes
}
```

### ShelterTeamsQuantityResponseDto

```typescript
interface ShelterTeamsQuantityResponseDto {
  id: string;
  teamsQuantity: number;  // Retorna 0 se não estiver definido
}
```

### TeamWithMembersDto

```typescript
interface TeamWithMembersDto {
  id: string;
  numberTeam: number;
  description?: string;
  leaders: CoordinatorWithUserDto[];
  teachers: TeacherWithUserDto[];
}
```

### CoordinatorWithUserDto

```typescript
interface CoordinatorWithUserDto {
  id: string;
  active: boolean;
  user: UserMiniDto;
}
```

### TeacherWithUserDto

```typescript
interface TeacherWithUserDto {
  id: string;
  active: boolean;
  user: UserMiniDto;
}
```

### UserMiniDto

```typescript
interface UserMiniDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  completed: boolean;
  commonUser: boolean;
}
```

### AddressResponseDto

```typescript
interface AddressResponseDto {
  id: string;
  street: string;
  number?: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  complement?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### MediaItemResponseDto

```typescript
interface MediaItemResponseDto {
  id: string;
  title: string;
  description: string;
  mediaType: 'IMAGE';
  uploadType: 'UPLOAD' | 'LINK';
  url: string;
  isLocalFile: boolean;
  platformType?: string;
  originalName?: string;
  size?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Paginated<T>

```typescript
interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
```

### LeaderSimpleListDto

```typescript
interface LeaderSimpleListDto {
  leaderProfileId: string;  // ID do perfil de líder (use para vincular)
  name: string;             // Nome do líder
  vinculado: boolean;       // Indica se já está vinculado a uma equipe
}
```

### TeacherSimpleListDto

```typescript
interface TeacherSimpleListDto {
  teacherProfileId: string;  // ID do perfil de professor (use para vincular)
  name: string;              // Nome do professor
  vinculado: boolean;        // Indica se já está vinculado a uma equipe
}
```

---

---

## ❌ Códigos de Erro

### 400 Bad Request
- Dados inválidos nos DTOs
- Validação de campos falhou
- `teamsQuantity` menor que 1
- `numberTeam` fora do intervalo permitido
- Duplicatas no array `teams`
- Arquivo não encontrado no form-data

### 401 Unauthorized
- Token JWT ausente ou inválido
- Token expirado

### 403 Forbidden
- Usuário sem permissão (apenas `admin` e `leader` podem criar/editar/deletar)
- `teacher` tentando acessar endpoints restritos

### 404 Not Found
- Abrigo não encontrado
- ID inválido ou inexistente

### 500 Internal Server Error
- Erro interno do servidor
- Erro ao processar arquivo
- Erro ao salvar no banco de dados

---

## 📚 Referências

- [MODULO_ABRIGO.md](./MODULO_ABRIGO.md) - Documentação completa do módulo
- [MODULO_PROFESSOR.md](./MODULO_PROFESSOR.md) - Módulo de Professores
- [MODULO_LIDER.md](./MODULO_LIDER.md) - Módulo de Líderes
- [ENDPOINTS_PAGINACAO_BUSCA.md](./ENDPOINTS_PAGINACAO_BUSCA.md) - Endpoints de paginação e busca

