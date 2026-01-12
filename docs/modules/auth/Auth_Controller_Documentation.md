# 🔐 Auth Controller - Documentação Completa

## 🎯 Visão Geral

O **AuthController** gerencia toda a autenticação e autorização do sistema. Este controller é responsável por login, logout, registro, autenticação via Google, refresh tokens e obtenção dos dados do usuário autenticado.

### 🔑 Características Principais

- ✅ **Login tradicional** com email e senha
- ✅ **Login com Google** OAuth2
- ✅ **Refresh Token** para renovar tokens JWT
- ✅ **Logout** para invalidar tokens
- ✅ **Registro de novos usuários**
- ✅ **Completar registro** (para usuários do Google)
- ✅ **Get Me** - Retorna dados completos do usuário autenticado (incluindo perfis e imagem)

### 🔐 Segurança

- **JWT Tokens**: Sistema de autenticação baseado em JWT
- **Refresh Tokens**: Tokens de longa duração para renovação
- **Hash de Senhas**: Bcrypt com salt rounds = 10
- **Validação de Tokens**: Verificação de integridade e expiração

---

## 📋 Endpoints Disponíveis

### 1. **POST /auth/login** - Login Tradicional

Realiza login com email e senha, retornando tokens JWT de acesso e refresh.

#### Request

**Método:** `POST`  
**URL:** `/auth/login`  
**Content-Type:** `application/json`  
**Autenticação:** Não requerida (público)

#### Body (JSON)

```json
{
  "email": "usuario@example.com",
  "password": "senha123"
}
```

**Campos:**
- `email` (string, obrigatório): Email do usuário (deve ser um email válido)
- `password` (string, obrigatório): Senha do usuário

#### Exemplo de Request (cURL)

```bash
curl -X POST \
  'https://api.example.com/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "joao@example.com",
    "password": "minhasenha123"
  }'
```

#### Exemplo de Request (JavaScript/Fetch)

```javascript
fetch('/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'joao@example.com',
    password: 'minhasenha123'
  })
})
.then(res => res.json())
.then(data => {
  console.log('Access Token:', data.accessToken);
  console.log('Refresh Token:', data.refreshToken);
  // Salvar tokens no localStorage ou cookie
});
```

#### Response 200 OK

```json
{
  "message": "Login successful",
  "user": {
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
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### ⚠️ Erros Possíveis

**401 - Credenciais inválidas:**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

**400 - Dados inválidos:**
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password should not be empty"
  ],
  "error": "Bad Request"
}
```

---

### 2. **POST /auth/google** - Login com Google

Realiza autenticação via Google OAuth2 usando token ID do Google.

#### Request

**Método:** `POST`  
**URL:** `/auth/google`  
**Content-Type:** `application/json`  
**Autenticação:** Não requerida (público)

#### Body (JSON)

```json
{
  "token": "google_id_token_aqui"
}
```

**Campos:**
- `token` (string, obrigatório): Google ID Token obtido do cliente OAuth2

#### Exemplo de Request (cURL)

```bash
curl -X POST \
  'https://api.example.com/auth/google' \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1NiJ9..."
  }'
```

#### Response 200 OK - Usuário Novo (não completou registro)

```json
{
  "email": "joao@gmail.com",
  "name": "João Silva",
  "completed": false,
  "commonUser": false,
  "newUser": true
}
```

#### Response 200 OK - Usuário Existente

```json
{
  "message": "Login successful",
  "isNewUser": false,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "joao@gmail.com",
    "name": "João Silva",
    "phone": "+5511999999999",
    "role": "member",
    "active": true,
    "completed": true,
    "commonUser": true,
    "createdAt": "2025-09-27T21:00:00.000Z",
    "updatedAt": "2025-09-27T21:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### ⚠️ Erros Possíveis

**401 - Token inválido:**
```json
{
  "statusCode": 401,
  "message": "Invalid Google token",
  "error": "Unauthorized"
}
```

---

### 3. **POST /auth/refresh** - Renovar Token

Renova o access token usando o refresh token.

#### Request

**Método:** `POST`  
**URL:** `/auth/refresh`  
**Content-Type:** `application/json`  
**Autenticação:** Não requerida (público)

#### Body (JSON)

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Campos:**
- `refreshToken` (string, obrigatório): Refresh token válido

#### Exemplo de Request (cURL)

```bash
curl -X POST \
  'https://api.example.com/auth/refresh' \
  -H 'Content-Type: application/json' \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

#### Response 200 OK

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### ⚠️ Erros Possíveis

**401 - Refresh token inválido:**
```json
{
  "statusCode": 401,
  "message": "Invalid refresh token",
  "error": "Unauthorized"
}
```

---

### 4. **POST /auth/logout** - Logout

Invalida o refresh token do usuário, efetivando o logout.

#### Request

**Método:** `POST`  
**URL:** `/auth/logout`  
**Content-Type:** `application/json`  
**Autenticação:** JWT Token obrigatório

#### Headers

```http
Authorization: Bearer <access_token>
```

#### Exemplo de Request (cURL)

```bash
curl -X POST \
  'https://api.example.com/auth/logout' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

#### Response 200 OK

```json
{
  "message": "User logged out"
}
```

#### ⚠️ Erros Possíveis

**401 - Token inválido ou ausente:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

### 5. **GET /auth/me** - Obter Dados do Usuário Autenticado

Retorna todos os dados completos do usuário autenticado, incluindo perfis (member/leader), imagem, teams, shelters e endereços.

#### Request

**Método:** `GET`  
**URL:** `/auth/me`  
**Content-Type:** `application/json`  
**Autenticação:** JWT Token obrigatório

#### Headers

```http
Authorization: Bearer <access_token>
```

#### Exemplo de Request (cURL)

```bash
curl -X GET \
  'https://api.example.com/auth/me' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

#### Exemplo de Request (JavaScript/Fetch)

```javascript
fetch('/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})
.then(res => res.json())
.then(user => {
  console.log('User data:', user);
  console.log('Image URL:', user.image?.url);
  console.log('Member Profile:', user.memberProfile);
  console.log('Leader Profile:', user.leaderProfile);
});
```

#### Response 200 OK - Usuário Member

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
  "updatedAt": "2025-10-01T15:30:00.000Z",
  "image": {
    "id": "image-uuid",
    "title": "Foto do Usuário",
    "description": "Imagem de perfil",
    "url": "https://bucket.s3.amazonaws.com/image.jpg",
    "uploadType": "upload",
    "mediaType": "image",
    "isLocalFile": true,
    "platformType": null,
    "originalName": "foto.jpg",
    "size": 123456,
    "createdAt": "2025-10-01T14:00:00.000Z",
    "updatedAt": "2025-10-01T14:00:00.000Z"
  },
  "memberProfile": {
    "id": "member-profile-uuid",
    "active": true,
    "createdAt": "2025-09-27T21:00:00.000Z",
    "updatedAt": "2025-09-27T21:00:00.000Z",
    "team": {
      "id": "team-uuid",
      "numberTeam": 1,
      "description": "Equipe de ensino",
      "createdAt": "2025-09-27T21:00:00.000Z",
      "updatedAt": "2025-09-27T21:00:00.000Z",
      "shelter": {
        "id": "shelter-uuid",
        "name": "Abrigo São José",
        "description": "Abrigo para crianças",
        "teamsQuantity": 4,
        "createdAt": "2025-09-27T21:00:00.000Z",
        "updatedAt": "2025-09-27T21:00:00.000Z",
        "address": {
          "id": "address-uuid",
          "street": "Rua das Flores",
          "number": "123",
          "district": "Centro",
          "city": "São Paulo",
          "state": "SP",
          "postalCode": "01234-567",
          "createdAt": "2025-09-27T21:00:00.000Z",
          "updatedAt": "2025-09-27T21:00:00.000Z"
        }
      }
    }
  },
  "leaderProfile": null
}
```

#### Response 200 OK - Usuário Leader

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "maria@example.com",
  "name": "Maria Santos",
  "phone": "+5511888888888",
  "role": "leader",
  "active": true,
  "completed": true,
  "commonUser": true,
  "createdAt": "2025-09-27T21:00:00.000Z",
  "updatedAt": "2025-10-01T15:30:00.000Z",
  "image": {
    "id": "image-uuid",
    "title": "Foto do Usuário",
    "description": "Imagem de perfil",
    "url": "https://bucket.s3.amazonaws.com/image.jpg",
    "uploadType": "upload",
    "mediaType": "image",
    "isLocalFile": true,
    "platformType": null,
    "originalName": "foto.jpg",
    "size": 123456,
    "createdAt": "2025-10-01T14:00:00.000Z",
    "updatedAt": "2025-10-01T14:00:00.000Z"
  },
  "memberProfile": null,
  "leaderProfile": {
    "id": "leader-profile-uuid",
    "active": true,
    "createdAt": "2025-09-27T21:00:00.000Z",
    "updatedAt": "2025-09-27T21:00:00.000Z",
    "teams": [
      {
        "id": "team-1-uuid",
        "numberTeam": 1,
        "description": "Equipe 1",
        "createdAt": "2025-09-27T21:00:00.000Z",
        "updatedAt": "2025-09-27T21:00:00.000Z",
        "shelter": {
          "id": "shelter-1-uuid",
          "name": "Abrigo São José",
          "description": "Abrigo para crianças",
          "teamsQuantity": 4,
          "createdAt": "2025-09-27T21:00:00.000Z",
          "updatedAt": "2025-09-27T21:00:00.000Z",
          "address": {
            "id": "address-uuid",
            "street": "Rua das Flores",
            "number": "123",
            "district": "Centro",
            "city": "São Paulo",
            "state": "SP",
            "postalCode": "01234-567",
            "createdAt": "2025-09-27T21:00:00.000Z",
            "updatedAt": "2025-09-27T21:00:00.000Z"
          }
        }
      },
      {
        "id": "team-2-uuid",
        "numberTeam": 2,
        "description": "Equipe 2",
        "createdAt": "2025-09-27T21:00:00.000Z",
        "updatedAt": "2025-09-27T21:00:00.000Z",
        "shelter": {
          "id": "shelter-2-uuid",
          "name": "Abrigo Esperança",
          "description": "Abrigo para adolescentes",
          "teamsQuantity": 3,
          "createdAt": "2025-09-27T21:00:00.000Z",
          "updatedAt": "2025-09-27T21:00:00.000Z",
          "address": {
            "id": "address-2-uuid",
            "street": "Avenida Principal",
            "number": "456",
            "district": "Jardim",
            "city": "São Paulo",
            "state": "SP",
            "postalCode": "04567-890",
            "createdAt": "2025-09-27T21:00:00.000Z",
            "updatedAt": "2025-09-27T21:00:00.000Z"
          }
        }
      }
    ]
  }
}
```

#### ⚠️ Erros Possíveis

**401 - Token inválido ou ausente:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**401 - Usuário não encontrado:**
```json
{
  "statusCode": 401,
  "message": "User not found",
  "error": "Unauthorized"
}
```

---

### 6. **POST /auth/register** - Registrar Novo Usuário

Registra um novo usuário no sistema.

#### Request

**Método:** `POST`  
**URL:** `/auth/register`  
**Content-Type:** `application/json`  
**Autenticação:** Não requerida (público)

#### Body (JSON)

```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123",
  "phone": "+5511999999999",
  "role": "member"
}
```

**Campos:**
- `name` (string, obrigatório): Nome completo do usuário
- `email` (string, obrigatório): Email do usuário (deve ser único e válido)
- `password` (string, obrigatório, mínimo 6 caracteres): Senha do usuário
- `phone` (string, obrigatório): Telefone do usuário
- `role` (enum, obrigatório): Role do usuário (`member`, `leader`, `admin`, `user`)

#### Exemplo de Request (cURL)

```bash
curl -X POST \
  'https://api.example.com/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "password": "senha123456",
    "phone": "+5511999999999",
    "role": "member"
  }'
```

#### Response 200 OK

```json
{
  "message": "Registration successful",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "joao@example.com",
    "name": "João Silva",
    "phone": "+5511999999999",
    "role": "member",
    "active": false,
    "completed": true,
    "commonUser": true,
    "createdAt": "2025-10-01T15:00:00.000Z",
    "updatedAt": "2025-10-01T15:00:00.000Z"
  }
}
```

#### ⚠️ Erros Possíveis

**401 - Email já existe:**
```json
{
  "statusCode": 401,
  "message": "User already exists",
  "error": "Unauthorized"
}
```

**400 - Dados inválidos:**
```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "email must be an email",
    "password must be longer than or equal to 6 characters",
    "role must be one of the following values: member, leader, admin, user"
  ],
  "error": "Bad Request"
}
```

---

### 7. **POST /auth/complete-register** - Completar Registro

Completa o registro de um usuário (usado principalmente após login com Google quando o usuário ainda não completou o cadastro).

#### Request

**Método:** `POST`  
**URL:** `/auth/complete-register`  
**Content-Type:** `application/json`  
**Autenticação:** Não requerida (público)

#### Body (JSON)

```json
{
  "email": "joao@gmail.com",
  "name": "João Silva",
  "phone": "+5511999999999",
  "password": "senha123456",
  "role": "member"
}
```

**Campos:**
- `email` (string, obrigatório): Email do usuário (deve existir no sistema)
- `name` (string, obrigatório): Nome completo do usuário
- `phone` (string, obrigatório): Telefone do usuário
- `password` (string, opcional, mínimo 6 caracteres): Senha do usuário
- `role` (enum, opcional): Role do usuário (`member`, `leader`, `admin`, `user`)

#### Exemplo de Request (cURL)

```bash
curl -X POST \
  'https://api.example.com/auth/complete-register' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "joao@gmail.com",
    "name": "João Silva",
    "phone": "+5511999999999",
    "password": "senha123456",
    "role": "member"
  }'
```

#### Response 200 OK

```json
{
  "message": "Registration completed successfully"
}
```

#### ⚠️ Erros Possíveis

**404 - Usuário não encontrado:**
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

**404 - Registro já completado:**
```json
{
  "statusCode": 404,
  "message": "User already completed registration",
  "error": "Not Found"
}
```

**400 - Dados inválidos:**
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "name should not be empty",
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

---

## 📊 Estrutura de Dados

### Login Response

```typescript
interface LoginResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string;
    role: UserRole;
    active: boolean;
    completed: boolean;
    commonUser: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}
```

### Me Response (GET /auth/me)

```typescript
interface MeResponse {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  active: boolean;
  completed: boolean;
  commonUser: boolean;
  createdAt: Date;
  updatedAt: Date;
  image: {
    id: string;
    title: string;
    description: string;
    url: string;
    uploadType: 'upload' | 'link';
    mediaType: 'image';
    isLocalFile: boolean;
    platformType?: string;
    originalName?: string;
    size?: number;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  memberProfile: {
    id: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    team: {
      id: string;
      numberTeam: number;
      description?: string;
      createdAt: Date;
      updatedAt: Date;
      shelter: {
        id: string;
        name: string;
        description?: string;
        teamsQuantity?: number;
        createdAt: Date;
        updatedAt: Date;
        address: {
          id: string;
          street: string;
          number: string;
          district: string;
          city: string;
          state: string;
          postalCode: string;
          createdAt: Date;
          updatedAt: Date;
        } | null;
      } | null;
    } | null;
  } | null;
  leaderProfile: {
    id: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    teams: Array<{
      id: string;
      numberTeam: number;
      description?: string;
      createdAt: Date;
      updatedAt: Date;
      shelter: {
        id: string;
        name: string;
        description?: string;
        teamsQuantity?: number;
        createdAt: Date;
        updatedAt: Date;
        address: {
          id: string;
          street: string;
          number: string;
          district: string;
          city: string;
          state: string;
          postalCode: string;
          createdAt: Date;
          updatedAt: Date;
        } | null;
      } | null;
    }>;
  } | null;
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

---

## 🔄 Fluxos de Autenticação

### Fluxo de Login Tradicional

```
1. Cliente → POST /auth/login (email, password)
2. Servidor valida credenciais
3. Servidor gera accessToken e refreshToken
4. Servidor salva refreshToken no banco
5. Servidor retorna tokens + dados do usuário
6. Cliente salva tokens (localStorage/cookie)
7. Cliente usa accessToken nas requisições
```

### Fluxo de Login Google

```
1. Cliente obtém Google ID Token do Google OAuth2
2. Cliente → POST /auth/google (token)
3. Servidor verifica token com Google
4. Servidor busca ou cria usuário pelo email
5. Se usuário novo → retorna { newUser: true, completed: false }
6. Se usuário existe mas não completou → retorna { completed: false }
7. Se usuário completo → retorna tokens + dados do usuário
```

### Fluxo de Refresh Token

```
1. AccessToken expira
2. Cliente → POST /auth/refresh (refreshToken)
3. Servidor valida refreshToken
4. Servidor verifica se refreshToken está no banco
5. Servidor gera novos tokens
6. Servidor atualiza refreshToken no banco
7. Servidor retorna novos tokens
```

### Fluxo de Logout

```
1. Cliente → POST /auth/logout (accessToken no header)
2. Servidor extrai userId do token
3. Servidor remove refreshToken do banco (null)
4. Servidor retorna { message: "User logged out" }
5. Cliente remove tokens do storage
```

---

## 🔒 Segurança

### Tokens JWT

- **Access Token**: Token de curta duração (padrão: configurável via `JWT_EXPIRES_IN`)
- **Refresh Token**: Token de longa duração (padrão: configurável via `JWT_REFRESH_EXPIRES_IN`)
- **Secret**: Armazenado em variáveis de ambiente (`JWT_SECRET`, `JWT_REFRESH_SECRET`)

### Hash de Senhas

- **Algoritmo**: Bcrypt
- **Salt Rounds**: 10
- Senhas nunca são retornadas nas respostas

### Validações

- Email único no sistema
- Senha mínima de 6 caracteres
- Validação de formato de email
- Verificação de tokens JWT em todas as rotas protegidas

---

## 📝 Exemplos de Uso

### Exemplo 1: Fluxo Completo de Login

```javascript
// 1. Login
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'joao@example.com',
    password: 'senha123'
  })
});

const { accessToken, refreshToken, user } = await loginResponse.json();

// Salvar tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// 2. Obter dados do usuário
const meResponse = await fetch('/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const userData = await meResponse.json();
console.log('User:', userData);
console.log('Image:', userData.image);
console.log('Member Profile:', userData.memberProfile);
```

### Exemplo 2: Refresh Token Automático

```javascript
async function apiCall(url, options = {}) {
  let accessToken = localStorage.getItem('accessToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });

  // Se token expirou, tenta renovar
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    const refreshResponse = await fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (refreshResponse.ok) {
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      // Retry a requisição original
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newAccessToken}`
        }
      });
    } else {
      // Refresh token inválido, fazer logout
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  }

  return response;
}
```

### Exemplo 3: Login com Google

```javascript
// No frontend (React exemplo)
const handleGoogleLogin = async () => {
  try {
    // Obter token do Google (via Google OAuth2 library)
    const googleUser = await signInWithGoogle();
    const idToken = googleUser.getAuthResponse().id_token;

    const response = await fetch('/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: idToken })
    });

    const data = await response.json();

    if (data.newUser && !data.completed) {
      // Redirecionar para completar registro
      router.push('/complete-registration');
    } else if (data.accessToken) {
      // Login bem-sucedido
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      router.push('/dashboard');
    }
  } catch (error) {
    console.error('Google login error:', error);
  }
};
```

---

## ⚠️ Tratamento de Erros

### Códigos de Status HTTP

- **200 OK**: Operação bem-sucedida
- **400 Bad Request**: Dados inválidos ou faltando
- **401 Unauthorized**: Credenciais inválidas, token inválido ou ausente
- **404 Not Found**: Recurso não encontrado

### Formato de Erro

```json
{
  "statusCode": 400,
  "message": "Error message or array of validation errors",
  "error": "Error type"
}
```

---

## 🔗 Relacionamento com Outros Endpoints

- **User Management**: Ver [Users_Controller_Documentation.md](../users/Users_Controller_Documentation.md) para gerenciamento de usuários (admin)
- **Profile Management**: Ver [Profile_Controller_Documentation.md](../users/Profile_Controller_Documentation.md) para gerenciamento de perfil próprio

---

**Auth Controller - Sistema de Orfanato** 🔐

