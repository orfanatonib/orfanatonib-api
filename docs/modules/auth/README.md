# 🔐 Auth Module

## 📋 Visão Geral

O módulo Auth gerencia a autenticação e autorização do sistema de orfanato, incluindo registro, login, refresh tokens e controle de acesso baseado em roles.

## 🏗️ Estrutura

### Funcionalidades
- **Registro de usuários** - Criação de contas
- **Login/Logout** - Autenticação JWT
- **Refresh Tokens** - Renovação de tokens
- **Autorização** - Controle de acesso por roles
- **Validação** - Verificação de dados
- **Recuperação de senha** - Envio do link diretamente por Gmail SMTP

### Roles do Sistema
- `admin` - Acesso total ao sistema
- `coordinator` (leader) - Gerencia abrigos e professores
- `member` - Acesso limitado aos próprios dados

## 🚀 Endpoints

### 🔑 Autenticação
- `POST /auth/register` - Registrar novo usuário
- `POST /auth/login` - Fazer login
- `POST /auth/refresh` - Renovar token
- `POST /auth/logout` - Fazer logout
- `POST /auth/complete-register` - Completar registro
- `POST /auth/forgot-password` - Solicitar link de recuperação por e-mail
- `GET /auth/reset-password/validate` - Validar token de recuperação
- `POST /auth/reset-password` - Redefinir a senha

### Entrega de e-mail

O backend envia e-mails pelo SMTP do Gmail. Não há mais cadastro ou verificação
de destinatários no SES. Por isso, login e registro não retornam mais o campo
legado `emailVerification`, e a recuperação de senha tenta enviar o link
diretamente ao endereço cadastrado.

Veja [`../../guides/GMAIL_SMTP_CONFIGURATION.md`](../../guides/GMAIL_SMTP_CONFIGURATION.md)
para configurar as credenciais do remetente.

### 👤 Perfil do Usuário
- `GET /auth/profile` - Obter perfil do usuário logado
- `PATCH /auth/profile` - Atualizar perfil

## 📊 Dados de Registro

### Registro Inicial
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "+5511999999999",
  "password": "password123",
  "role": "member"
}
```

### Completar Registro
```json
{
  "email": "joao@example.com",
  "name": "João Silva",
  "phone": "+5511999999999",
  "password": "password123",
  "role": "member"
}
```

## 🔐 Autenticação JWT

### Headers Obrigatórios
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

### Estrutura do Token
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "member",
  "iat": 1759008614,
  "exp": 1759613414
}
```

## 📝 Exemplos de Uso

### Registrar Usuário
```bash
POST /auth/register
Content-Type: application/json

{
  "name": "Maria Santos",
  "email": "maria@example.com",
  "phone": "+5511888888888",
  "password": "password123",
  "role": "coordinator"
}
```

### Fazer Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "maria@example.com",
  "password": "password123"
}
```

### Renovar Token
```bash
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Obter Perfil
```bash
GET /auth/profile
Authorization: Bearer {access_token}
```

## 📊 Respostas da API

### Sucesso - Login (201)
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid-user",
    "email": "maria@example.com",
    "name": "Maria Santos",
    "active": true,
    "completed": true,
    "commonUser": false,
    "phone": "+5511888888888",
    "role": "coordinator",
    "createdAt": "2025-09-27T21:00:00.000Z",
    "updatedAt": "2025-09-27T21:26:05.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Sucesso - Registro (201)
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-user",
    "email": "maria@example.com",
    "name": "Maria Santos",
    "active": false,
    "completed": false,
    "commonUser": true,
    "phone": "+5511888888888",
    "role": "coordinator",
    "createdAt": "2025-09-27T21:00:00.000Z",
    "updatedAt": "2025-09-27T21:00:00.000Z"
  }
}
```

### Sucesso - Perfil (200)
```json
{
  "id": "uuid-user",
  "email": "maria@example.com",
  "name": "Maria Santos",
  "active": true,
  "completed": true,
  "commonUser": false,
  "phone": "+5511888888888",
  "role": "coordinator",
  "createdAt": "2025-09-27T21:00:00.000Z",
  "updatedAt": "2025-09-27T21:26:05.000Z"
}
```

### Erro - Credenciais Inválidas (401)
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

### Erro - Email Já Existe (409)
```json
{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict"
}
```

### Erro - Validação (400)
```json
{
  "statusCode": 400,
  "message": [
    "email must be a valid email",
    "password must be at least 6 characters",
    "role must be one of: admin, coordinator, member"
  ],
  "error": "Bad Request"
}
```

## 🔒 Segurança

### Validações de Senha
- Mínimo 6 caracteres
- Recomendado: maiúsculas, minúsculas, números e símbolos

### Validações de Email
- Formato válido de email
- Único no sistema

### Validações de Telefone
- Formato internacional (+55...)
- Único no sistema

### Roles Válidos
- `admin` - Administrador
- `coordinator` - Coordenador/Líder
- `member` - Professor

## 🧪 Testes

### Scripts Disponíveis
- `tests/auth/test-login.js` - Teste de login
- `tests/auth/test-register.js` - Teste de registro
- `tests/auth/test-refresh.js` - Teste de refresh token

### Executar Testes
```bash
node tests/auth/test-login.js
node tests/auth/test-register.js
node tests/auth/test-refresh.js
```

## 🤖 Automações

### Scripts Disponíveis
- `automations/auth/create-users-automation.js` - Criação em massa de usuários

### Executar Automação
```bash
node automations/auth/create-users-automation.js
```

## 📁 Arquivos Relacionados

### Código Fonte
- `src/auth/auth.controller.ts`
- `src/auth/auth.service.ts`
- `src/auth/auth.repository.ts`
- `src/auth/strategies/` - Estratégias de autenticação
- `src/auth/guards/` - Guards de autorização
- `src/auth/dto/` - DTOs de request e response

### Documentação
- `docs/Auth_API_Collection.postman_collection.json`
- `docs/Auth_API_Documentation.md`
- `docs/Auth_Collection_Usage_Example.md`

## 🔄 Histórico de Mudanças

### v1.2.0 - Melhorias de Segurança
- ✅ Validação aprimorada de senhas
- ✅ Controle de sessões
- ✅ Refresh tokens com expiração
- ✅ Logs de auditoria

### v1.1.0 - Funcionalidades Básicas
- ✅ Registro e login
- ✅ JWT tokens
- ✅ Controle de roles
- ✅ Validação de dados

## 🔧 Configuração

### Variáveis de Ambiente
```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=30d
```

### Credenciais de Teste
```json
{
  "email": "joao@example.com",
  "password": "password123"
}
```

---

**Módulo Auth - Sistema de Orfanato** 🔐
