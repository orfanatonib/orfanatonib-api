# 👥 Users Module

## 📋 Visão Geral

O módulo Users gerencia os usuários do sistema de orfanato, incluindo perfis, roles, ativação/desativação e dados pessoais.

## 🏗️ Estrutura

### Entidades
- **UserEntity** - Dados do usuário
- **TeacherProfileEntity** - Perfil de professor (relacionamento opcional)
- **LeaderProfileEntity** - Perfil de líder (relacionamento opcional)

### Relacionamentos
```
User -> TeacherProfile (1:0..1) - Usuário pode ter perfil de professor
User -> LeaderProfile (1:0..1) - Usuário pode ter perfil de líder
```

## 🚀 Endpoints

### 📋 Listagem e Busca
- `GET /users` - Lista paginada com filtros
- `GET /users/simple` - Lista simplificada
- `GET /users/:id` - Busca por ID

### 🔧 Criação e Gerenciamento
- `POST /users` - Criar novo usuário
- `PATCH /users/:id` - Atualizar usuário
- `PATCH /users/:id/activate` - Ativar usuário
- `PATCH /users/:id/deactivate` - Desativar usuário
- `DELETE /users/:id` - Deletar usuário

## 📊 Filtros Disponíveis

### Query Parameters
- `page` - Número da página (padrão: 1)
- `limit` - Itens por página (padrão: 12, máximo: 100)
- `sort` - Campo de ordenação (`createdAt`, `updatedAt`, `name`, `email`)
- `order` - Direção (`asc`, `desc`)
- `searchString` - Busca por nome, email ou telefone
- `role` - Filtrar por role (`admin`, `coordinator`, `teacher`)
- `active` - Filtrar por status ativo (`true`/`false`)
- `completed` - Filtrar por registro completo (`true`/`false`)

## 🔐 Autenticação e Autorização

### Roles Permitidos
- **admin** - Acesso total
- **coordinator** (leader) - Acesso limitado
- **teacher** - Acesso apenas aos próprios dados

### Headers Obrigatórios
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

## 📝 Exemplos de Uso

### Listar Usuários com Paginação
```bash
GET /users?page=1&limit=12&sort=name&order=asc
```

### Filtrar por Role
```bash
GET /users?role=teacher&active=true
```

### Filtrar por Status
```bash
GET /users?active=true&completed=false
```

### Criar Novo Usuário
```bash
POST /users
Content-Type: application/json

{
  "name": "Ana Silva",
  "email": "ana@example.com",
  "phone": "+5511777777777",
  "password": "password123",
  "role": "teacher"
}
```

### Atualizar Usuário
```bash
PATCH /users/uuid-user-id
Content-Type: application/json

{
  "name": "Ana Silva Santos",
  "phone": "+5511777777778"
}
```

### Ativar Usuário
```bash
PATCH /users/uuid-user-id/activate
```

### Desativar Usuário
```bash
PATCH /users/uuid-user-id/deactivate
```

## 📊 Respostas da API

### Sucesso - Lista Paginada (200)
```json
{
  "items": [
    {
      "id": "uuid-user",
      "name": "Ana Silva",
      "email": "ana@example.com",
      "phone": "+5511777777777",
      "active": true,
      "completed": true,
      "commonUser": false,
      "role": "teacher",
      "createdAt": "2025-09-27T21:00:00.000Z",
      "updatedAt": "2025-09-27T21:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 12
}
```

### Sucesso - Criação (201)
```json
{
  "id": "uuid-user",
  "name": "Ana Silva",
  "email": "ana@example.com",
  "phone": "+5511777777777",
  "active": false,
  "completed": false,
  "commonUser": true,
  "role": "teacher",
  "createdAt": "2025-09-27T21:00:00.000Z",
  "updatedAt": "2025-09-27T21:00:00.000Z"
}
```

### Sucesso - Ativação (200)
```json
{
  "message": "User activated successfully"
}
```

### Sucesso - Desativação (200)
```json
{
  "message": "User deactivated successfully"
}
```

### Erro - Usuário Não Encontrado (404)
```json
{
  "statusCode": 404,
  "message": "User não encontrado",
  "error": "Not Found"
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
    "role must be one of: admin, coordinator, teacher"
  ],
  "error": "Bad Request"
}
```

## 🔒 Segurança

### Validações de Email
- Formato válido de email
- Único no sistema

### Validações de Telefone
- Formato internacional (+55...)
- Único no sistema

### Validações de Senha
- Mínimo 6 caracteres
- Recomendado: maiúsculas, minúsculas, números e símbolos

### Roles Válidos
- `admin` - Administrador
- `coordinator` - Coordenador/Líder
- `teacher` - Professor

## 🧪 Testes

### Scripts Disponíveis
- `tests/users/test-user-crud.js` - Teste CRUD básico
- `tests/users/test-user-filters.js` - Teste de filtros
- `tests/users/test-user-activation.js` - Teste de ativação/desativação

### Executar Testes
```bash
node tests/users/test-user-crud.js
node tests/users/test-user-filters.js
node tests/users/test-user-activation.js
```

## 🤖 Automações

### Scripts Disponíveis
- `automations/users/create-users-automation.js` - Criação em massa de usuários

### Executar Automação
```bash
node automations/users/create-users-automation.js
```

## 📁 Arquivos Relacionados

### Código Fonte
- `src/user/user.controller.ts`
- `src/user/user.service.ts`
- `src/user/user.repository.ts`
- `src/user/user.entity.ts`
- `src/user/dto/` - DTOs de request e response

### Documentação
- `docs/User_API_Collection.postman_collection.json`
- `docs/User_API_Documentation.md`
- `docs/User_API_Usage_Examples.md`

### Resultados de Automações
- `docs/users/results/created-50-users-2025-09-27.json` - Criação de 50 usuários
- `docs/users/results/created-users-2025-09-27.json` - Criação de usuários

## 🔄 Histórico de Mudanças

### v1.2.0 - Melhorias de Gerenciamento
- ✅ Ativação/desativação de usuários
- ✅ Filtros aprimorados
- ✅ Validações de segurança
- ✅ Logs de auditoria

### v1.1.0 - Funcionalidades Básicas
- ✅ CRUD completo de usuários
- ✅ Controle de roles
- ✅ Paginação e filtros
- ✅ Autenticação e autorização

## 📋 Campos da Entidade

### UserEntity
- `id` - UUID único
- `name` - Nome completo (obrigatório)
- `email` - Email único (obrigatório)
- `phone` - Telefone único (obrigatório)
- `password` - Senha hash (obrigatório)
- `role` - Role do usuário (`admin`, `coordinator`, `teacher`)
- `active` - Status ativo (padrão: `false`)
- `completed` - Registro completo (padrão: `false`)
- `commonUser` - Usuário comum (padrão: `true`)
- `createdAt` - Data de criação
- `updatedAt` - Data de atualização

## 🔧 Configuração

### Credenciais de Teste
```json
{
  "email": "joao@example.com",
  "password": "password123"
}
```

### Roles do Sistema
- **admin** - Acesso total ao sistema
- **coordinator** - Gerencia abrigos e professores
- **teacher** - Acesso limitado aos próprios dados

---

**Módulo Users - Sistema de Orfanato** 👥
