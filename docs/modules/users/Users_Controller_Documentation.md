# 👥 Users Controller - Documentação Completa (Admin)

## 🎯 Visão Geral

O **UsersController** gerencia todas as operações CRUD de usuários do sistema. **TODOS os endpoints deste controller requerem permissão de administrador**.

### 🔑 Características Principais

- ✅ **CRUD Completo** de usuários
- ✅ **Apenas Admin**: Todos os endpoints requerem `AdminRoleGuard`
- ✅ **Orquestração Automática** de Member/Leader profiles
- ✅ **Controle Total**: Admin pode alterar qualquer campo de qualquer usuário
- ✅ **Sem Validação de Senha Atual**: Admin pode alterar senhas sem conhecer a senha atual

### 🔐 Autenticação e Autorização

- **Autenticação**: JWT Token obrigatório
- **Autorização**: Apenas usuários com role `admin`
- **Guards**: `JwtAuthGuard` + `AdminRoleGuard` (aplicados globalmente no controller)

---

## 📋 Endpoints Disponíveis

### 1. **POST /users** - Criar Novo Usuário

Cria um novo usuário no sistema e automaticamente cria o profile correspondente (Member ou Leader) baseado no role.

#### Request

**Método:** `POST`  
**URL:** `/users`  
**Content-Type:** `application/json`  
**Authorization:** `Bearer <jwt_token>` (obrigatório - apenas admin)

#### Body (JSON)

```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123456",
  "phone": "+5511999999999",
  "role": "member",
  "active": false,
  "completed": false,
  "commonUser": true
}
```

**Campos Obrigatórios:**
- `name` (string): Nome completo do usuário
- `email` (string): Email único do usuário (deve ser um email válido)
- `password` (string, mínimo 6 caracteres): Senha do usuário
- `phone` (string): Telefone do usuário

**Campos Opcionais:**
- `role` (enum): Role do usuário (`member`, `leader`, `admin`, `user`) - padrão: `member`
- `active` (boolean): Status ativo - padrão: `false`
- `completed` (boolean): Status completado - padrão: `false`
- `commonUser` (boolean): Usuário comum - padrão: `true`

#### Exemplo de Request (cURL)

```bash
curl -X POST \
  'https://api.example.com/users' \
  -H 'Authorization: Bearer seu_token_admin' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "password": "senha123456",
    "phone": "+5511999999999",
    "role": "member",
    "active": true
  }'
```

#### Response 200 OK

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "joao@example.com",
  "name": "João Silva",
  "phone": "+5511999999999",
  "role": "member",
  "active": true,
  "completed": false,
  "commonUser": true,
  "createdAt": "2025-10-01T15:00:00.000Z",
  "updatedAt": "2025-10-01T15:00:00.000Z"
}
```

#### Orquestração Automática

- Se `role = "member"` → Cria automaticamente **Member Profile**
- Se `role = "leader"` → Cria automaticamente **Leader Profile**
- Se `role = "admin"` → Não cria profile específico

---

### 2. **GET /users** - Listar Todos os Usuários

Lista todos os usuários com paginação, filtros e ordenação.

#### Request

**Método:** `GET`  
**URL:** `/users`  
**Authorization:** `Bearer <jwt_token>` (obrigatório - apenas admin)

#### Query Parameters

| Parâmetro | Tipo | Descrição | Padrão |
|-----------|------|-----------|--------|
| `page` | number | Número da página | 1 |
| `limit` | number | Itens por página (máx: 100) | 12 |
| `q` | string | Busca por nome, email, telefone ou role | - |
| `role` | string | Filtro por role (`member`, `leader`, `admin`, `user`) | - |
| `active` | string | Filtro por status ativo (`true`/`false`) | - |
| `completed` | string | Filtro por status completado (`true`/`false`) | - |
| `sort` | string | Campo de ordenação (`name`, `email`, `phone`, `role`, `createdAt`, `updatedAt`) | `updatedAt` |
| `order` | string | Direção da ordenação (`ASC`, `DESC`) | `DESC` |

#### Exemplo de Request (cURL)

```bash
curl -X GET \
  'https://api.example.com/users?page=1&limit=10&role=member&active=true&sort=name&order=ASC' \
  -H 'Authorization: Bearer seu_token_admin'
```

#### Response 200 OK

```json
{
  "items": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "joao@example.com",
      "name": "João Silva",
      "phone": "+5511999999999",
      "role": "member",
      "active": true,
      "completed": true,
      "commonUser": true,
      "createdAt": "2025-09-27T21:00:00.000Z",
      "updatedAt": "2025-09-27T21:30:00.000Z"
    },
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "email": "maria@example.com",
      "name": "Maria Santos",
      "phone": "+5511888888888",
      "role": "leader",
      "active": true,
      "completed": true,
      "commonUser": true,
      "createdAt": "2025-09-28T10:00:00.000Z",
      "updatedAt": "2025-09-28T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "sort": "name",
    "order": "ASC"
  }
}
```

---

### 3. **GET /users/:id** - Buscar Usuário por ID

Busca um usuário específico pelo ID.

#### Request

**Método:** `GET`  
**URL:** `/users/:id`  
**Authorization:** `Bearer <jwt_token>` (obrigatório - apenas admin)

#### Parâmetros de URL

- `id` (UUID, obrigatório): ID do usuário

#### Exemplo de Request (cURL)

```bash
curl -X GET \
  'https://api.example.com/users/123e4567-e89b-12d3-a456-426614174000' \
  -H 'Authorization: Bearer seu_token_admin'
```

#### Response 200 OK

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "joao@example.com",
  "name": "João Silva",
  "phone": "+5511999999999",
  "role": "member",
  "active": true,
  "completed": true,
  "commonUser": true,
  "createdAt": "2025-09-27T21:00:00.000Z",
  "updatedAt": "2025-09-27T21:30:00.000Z"
}
```

---

### 4. **PUT /users/:id** - Atualizar Usuário

Atualiza um usuário existente. **Admin pode alterar TUDO**, incluindo senha sem precisar da senha atual.

#### Request

**Método:** `PUT`  
**URL:** `/users/:id`  
**Content-Type:** `application/json`  
**Authorization:** `Bearer <jwt_token>` (obrigatório - apenas admin)

#### Parâmetros de URL

- `id` (UUID, obrigatório): ID do usuário

#### Body (JSON)

```json
{
  "name": "João Silva Atualizado",
  "email": "joao.novo@example.com",
  "phone": "+5511888888888",
  "password": "nova_senha_123",
  "role": "leader",
  "active": true,
  "completed": true,
  "commonUser": false
}
```

**Todos os campos são opcionais.** Você pode enviar apenas os campos que deseja atualizar.

**Campos Editáveis:**
- `name` (string): Nome completo
- `email` (string): Email (deve ser único)
- `phone` (string): Telefone
- `password` (string, mínimo 6 caracteres): **Nova senha (admin não precisa da senha atual)**
- `role` (enum): Role (`member`, `leader`, `admin`, `user`)
- `active` (boolean): Status ativo
- `completed` (boolean): Status completado
- `commonUser` (boolean): Usuário comum

#### Exemplo de Request (cURL) - Alterar Apenas Nome

```bash
curl -X PUT \
  'https://api.example.com/users/123e4567-e89b-12d3-a456-426614174000' \
  -H 'Authorization: Bearer seu_token_admin' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "João Silva Atualizado"
  }'
```

#### Exemplo de Request (cURL) - Alterar Senha (Admin não precisa da senha atual)

```bash
curl -X PUT \
  'https://api.example.com/users/123e4567-e89b-12d3-a456-426614174000' \
  -H 'Authorization: Bearer seu_token_admin' \
  -H 'Content-Type: application/json' \
  -d '{
    "password": "nova_senha_segura_123"
  }'
```

#### Exemplo de Request (cURL) - Mudar Role com Orquestração

```bash
curl -X PUT \
  'https://api.example.com/users/123e4567-e89b-12d3-a456-426614174000' \
  -H 'Authorization: Bearer seu_token_admin' \
  -H 'Content-Type: application/json' \
  -d '{
    "role": "leader",
    "active": true
  }'
```

#### Response 200 OK

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "joao.novo@example.com",
  "name": "João Silva Atualizado",
  "phone": "+5511888888888",
  "role": "leader",
  "active": true,
  "completed": true,
  "commonUser": false,
  "createdAt": "2025-09-27T21:00:00.000Z",
  "updatedAt": "2025-10-01T16:00:00.000Z"
}
```

#### Orquestração de Mudança de Role

- **member → leader**: Remove Member Profile, cria Leader Profile
- **leader → member**: Remove Leader Profile, cria Member Profile
- **member/leader → admin**: Remove profile específico
- **admin → member/leader**: Cria profile correspondente

#### ⚠️ Importante - Alteração de Senha

Quando admin altera a senha de um usuário:
- ✅ **NÃO precisa** da senha atual
- ✅ Apenas envia a nova senha no campo `password`
- ✅ A nova senha é automaticamente hasheada com bcrypt

---

### 5. **DELETE /users/:id** - Deletar Usuário

Remove um usuário e seus profiles associados.

#### Request

**Método:** `DELETE`  
**URL:** `/users/:id`  
**Authorization:** `Bearer <jwt_token>` (obrigatório - apenas admin)

#### Parâmetros de URL

- `id` (UUID, obrigatório): ID do usuário

#### Exemplo de Request (cURL)

```bash
curl -X DELETE \
  'https://api.example.com/users/123e4567-e89b-12d3-a456-426614174000' \
  -H 'Authorization: Bearer seu_token_admin'
```

#### Response 200 OK

```json
{
  "message": "User removed successfully"
}
```

#### Orquestração de Exclusão

- Remove automaticamente **Member Profile** (se existir)
- Remove automaticamente **Leader Profile** (se existir)
- Remove o usuário
- Mantém integridade referencial

---

## 📊 Estrutura de Dados

### UserEntity

```typescript
interface UserEntity {
  id: string;                    // UUID único
  name: string;                  // Nome do usuário
  email: string;                 // Email único
  password: string;              // Senha hasheada (nunca retornada)
  phone: string;                 // Telefone
  role: UserRole;               // Role do usuário
  active: boolean;              // Status ativo
  completed: boolean;           // Status completado
  commonUser: boolean;          // Usuário comum
  refreshToken: string | null;  // Token de refresh
  createdAt: Date;              // Data de criação
  updatedAt: Date;              // Data de atualização
  memberProfile?: MemberProfileEntity;  // Profile de professor
  leaderProfile?: LeaderProfileEntity;    // Profile de líder
}
```

### UserRole Enum

```typescript
enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  LEADER = 'leader',
  USER = 'user'
}
```

### Paginated Response

```typescript
interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    sort: string;
    order: 'ASC' | 'DESC';
  };
}
```

---

## 🎭 Orquestração Automática de Profiles

### Criação de Usuário

```
POST /users com role = "member"
  ↓
Cria UserEntity
  ↓
Cria MemberProfile automaticamente
```

```
POST /users com role = "leader"
  ↓
Cria UserEntity
  ↓
Cria LeaderProfile automaticamente
```

### Mudança de Role

```
PUT /users/:id com role = "leader" (usuário era member)
  ↓
Remove MemberProfile
  ↓
Cria LeaderProfile
  ↓
Atualiza UserEntity
```

### Ativação/Desativação

```
PUT /users/:id com active = true (usuário member)
  ↓
Se não existe MemberProfile
  ↓
Cria MemberProfile

PUT /users/:id com active = false (usuário member)
  ↓
Remove MemberProfile
```

---

## ⚠️ Tratamento de Erros

### 400 - Bad Request

#### Dados inválidos

```json
{
  "statusCode": 400,
  "message": [
    "name must be longer than or equal to 2 characters",
    "email must be an email",
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

#### Email duplicado

```json
{
  "statusCode": 400,
  "message": "Email already exists",
  "error": "Bad Request"
}
```

### 401 - Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 - Forbidden

```json
{
  "statusCode": 403,
  "message": "Access restricted to administrators",
  "error": "Forbidden"
}
```

### 404 - Not Found

```json
{
  "statusCode": 404,
  "message": "UserEntity not found",
  "error": "Not Found"
}
```

---

## 🔒 Segurança

### Permissões

- ✅ **Apenas Admin**: Todos os endpoints requerem role `admin`
- ✅ **Controle Total**: Admin pode alterar qualquer campo de qualquer usuário
- ✅ **Sem Limitações**: Admin não tem restrições de campos editáveis

### Hash de Senhas

- **Algoritmo**: Bcrypt
- **Salt Rounds**: 10
- **Alteração de Senha**: Admin pode alterar sem conhecer senha atual

---

## 📝 Exemplos de Uso

### Exemplo 1: Criar Member

```javascript
const response = await fetch('/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'João Silva',
    email: 'joao@example.com',
    password: 'senha123456',
    phone: '+5511999999999',
    role: 'member',
    active: true
  })
});

const user = await response.json();
console.log('Usuário criado:', user);
// MemberProfile criado automaticamente
```

### Exemplo 2: Mudar Member para Leader

```javascript
const response = await fetch(`/users/${userId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    role: 'leader',
    active: true
  })
});

const updatedUser = await response.json();
// MemberProfile removido, LeaderProfile criado automaticamente
```

### Exemplo 3: Alterar Senha (Admin não precisa da senha atual)

```javascript
const response = await fetch(`/users/${userId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    password: 'nova_senha_segura_123'
  })
});

// Senha alterada sem precisar da senha atual
```

### Exemplo 4: Listar Usuários com Filtros

```javascript
const params = new URLSearchParams({
  page: '1',
  limit: '20',
  role: 'member',
  active: 'true',
  sort: 'name',
  order: 'ASC'
});

const response = await fetch(`/users?${params}`, {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});

const { items, meta } = await response.json();
console.log('Usuários:', items);
console.log('Total:', meta.total);
```

---

## 🔗 Relacionamento com Outros Endpoints

- **Profile Endpoints**: Ver [Profile_Controller_Documentation.md](./Profile_Controller_Documentation.md) para endpoints de perfil próprio
- **Auth Endpoints**: Ver [Auth_Controller_Documentation.md](../auth/Auth_Controller_Documentation.md) para autenticação

---

**Users Controller (Admin) - Sistema de Orfanato** 👥

