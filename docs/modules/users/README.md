# 👥 Users Module

## 📋 Visão Geral

O módulo Users gerencia os usuários do sistema de orfanato, incluindo perfis, roles, ativação/desativação e dados pessoais.

## 🏗️ Estrutura

### Entidades
- **UserEntity** - Dados do usuário
- **MemberProfileEntity** - Perfil de professor (relacionamento opcional)
- **LeaderProfileEntity** - Perfil de líder (relacionamento opcional)

### Relacionamentos
```
User -> MemberProfile (1:0..1) - Usuário pode ter perfil de professor
User -> LeaderProfile (1:0..1) - Usuário pode ter perfil de líder
```

## 🚀 Endpoints (estado atual — plano 07)

Flag = `@FeatureFlag` do handler; "só papel" = sem flag (decide apenas o guard).

| Verbo | Rota | Quem | Flag |
|---|---|---|---|
| POST | `/users` | admin | `user_management` |
| GET | `/users` | admin (a lista **não traz admins**) | `user_management` |
| GET | `/users/simple` | admin | `user_management` |
| GET | `/users/simple-for-select` | admin, líder | só papel |
| GET | `/users/:id`, `/users/:id/profile` | admin | `user_management` |
| PUT | `/users/:id` | admin | `user_management` |
| DELETE | `/users/:id` | admin (404 se não existe) | `user_management` |
| PATCH | `/users/:id/image` | admin (**sem chamador no front**) | `user_management` |
| GET / PATCH | `/profile` | qualquer sessão (só o próprio) | só papel |
| PATCH | `/profile/password`, `/profile/image` | qualquer sessão (só o próprio) | só papel |
| POST | `/profiles` | qualquer sessão (cria/atualiza o PRÓPRIO) | `user_management` **ou** `member_area` |
| GET | `/profiles` | admin, líder (líder só enxerga a própria equipe) | `user_management` **ou** `leader_management` |
| GET | `/profiles/me`, PUT `/profiles/me` | qualquer sessão (só o próprio) | só papel |
| GET / PUT / DELETE | `/profiles/:id` | admin (DELETE **sem chamador no front**) | `user_management` |

Garantias (cobertas por Jest e pela matriz E2E `user-profile`, 199/199):
- Nenhuma resposta traz `password` nem `refreshToken` (`toSafeUser`).
- `POST/PUT /profiles*` gravam dados pessoais e preferências numa **única transação** (`ProfileWriteRepository`); a data de nascimento é gravada como o mesmo dia em qualquer fuso do servidor (`parseBirthDate`).
- `POST /users` desfaz o usuário recém-criado se o perfil de líder/membro não puder ser criado; `DELETE /users/:id` apaga perfis e usuário primeiro e a foto depois (falha na limpeza da foto é registrada, não desfaz a exclusão).
- `active`, `completed` e `commonUser` só aceitam booleano de verdade (antes `"false"` virava `true` pela conversão implícita).
- A troca da foto de um mesmo usuário é serializada por usuário (`KeyedQueue`): duas trocas simultâneas não deixam objeto órfão no bucket. Vale por instância da API.
- O dono vem sempre do token: `id`/`userId` no corpo de `/profiles`, `/profile` e `/profile/password` é 400.

> A seção "Endpoints" antiga (PATCH `/users/:id`, `activate`, `deactivate`) descrevia rotas que não existem; os exemplos abaixo são históricos.

### Decisões pendentes (solicitante)
- Destino de `PATCH /users/:id/image` e de `DELETE /profiles/:id`: sem chamador no front (remover, documentar consumidor externo ou ligar).

### Riscos conhecidos
- `DELETE /users/:id` remove os perfis de líder/membro antes de apagar o usuário, sem transação entre módulos: uma falha do banco nesse meio deixa o usuário sem o perfil do papel.
- A fila por usuário da foto não protege duas instâncias da API ao mesmo tempo (exigiria lock no banco).

## 📊 Filtros Disponíveis

### Query Parameters
- `page` - Número da página (padrão: 1)
- `limit` - Itens por página (padrão: 12, máximo: 100)
- `sort` - Campo de ordenação (`createdAt`, `updatedAt`, `name`, `email`)
- `order` - Direção (`asc`, `desc`)
- `searchString` - Busca por nome, email ou telefone
- `role` - Filtrar por role (`admin`, `coordinator`, `member`)
- `active` - Filtrar por status ativo (`true`/`false`)
- `completed` - Filtrar por registro completo (`true`/`false`)

## 🔐 Autenticação e Autorização

### Roles Permitidos
- **admin** - Acesso total
- **coordinator** (leader) - Acesso limitado
- **member** - Acesso apenas aos próprios dados

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
GET /users?role=member&active=true
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
  "role": "member"
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
      "role": "member",
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
  "role": "member",
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
    "role must be one of: admin, coordinator, member"
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
- `member` - Professor

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
- `role` - Role do usuário (`admin`, `coordinator`, `member`)
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
- **member** - Acesso limitado aos próprios dados

---

**Módulo Users - Sistema de Orfanato** 👥
