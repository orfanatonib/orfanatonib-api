# 🏠 Shelters Module

## 📋 Visão Geral

O módulo Shelters gerencia os abrigos do sistema de orfanato, incluindo informações de localização, horários e vinculação com líderes.

## 🏗️ Estrutura

### Entidades
- **ShelterEntity** - Dados do abrigo
- **AddressEntity** - Endereço do abrigo (relacionamento)
- **LeaderProfileEntity** - Líder responsável (relacionamento)

### Relacionamentos
```
Shelter -> Address (1:1)
Shelter -> LeaderProfile (N:1) - Um abrigo tem um líder principal
Shelter -> TeacherProfile (1:N) - Um abrigo pode ter múltiplos professores
```

## 🚀 Endpoints

### 📋 Listagem e Busca
- `GET /shelters` - Lista paginada com filtros
- `GET /shelters/simple` - Lista simplificada
- `GET /shelters/:id` - Busca por ID

### 🔧 Criação e Gerenciamento
- `POST /shelters` - Criar novo abrigo
- `PATCH /shelters/:id` - Atualizar abrigo
- `DELETE /shelters/:id` - Deletar abrigo

## 📊 Filtros Disponíveis

### Query Parameters
- `page` - Número da página (padrão: 1)
- `limit` - Itens por página (padrão: 12, máximo: 100)
- `sort` - Campo de ordenação (`name`, `createdAt`, `updatedAt`, `city`, `state`)
- `order` - Direção (`asc`, `desc`)
- `addressSearchString` - Busca por endereço
- `userSearchString` - Busca por usuários (líderes/professores)
- `shelterSearchString` - Busca por nome do abrigo

## 🔐 Autenticação e Autorização

### Roles Permitidos
- **admin** - Acesso total
- **coordinator** (leader) - Acesso aos próprios abrigos
- **teacher** - Acesso aos abrigos onde trabalha

### Headers Obrigatórios
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

## 📝 Exemplos de Uso

### Listar Shelters com Paginação
```bash
GET /shelters?page=1&limit=12&sort=name&order=asc
```

### Filtrar por Endereço
```bash
GET /shelters?addressSearchString=Rio de Janeiro
```

### Filtrar por Nome do Abrigo
```bash
GET /shelters?shelterSearchString=Central
```

### Criar Novo Abrigo
```bash
POST /shelters
Content-Type: application/json

{
  "name": "Abrigo Nova Esperança",
  "address": {
    "street": "Rua das Flores, 123",
    "district": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-567"
  }
}
```

### Atualizar Abrigo
```bash
PATCH /shelters/uuid-shelter-id
Content-Type: application/json

{
  "name": "Abrigo Nova Esperança Atualizado"
}
```

## 📊 Respostas da API

### Sucesso - Lista Paginada (200)
```json
{
  "items": [
    {
      "id": "uuid-shelter",
      "name": "Abrigo Central",
      "address": {
        "id": "uuid-address",
        "street": "Rua das Flores, 123",
        "district": "Centro",
        "city": "São Paulo",
        "state": "SP",
        "postalCode": "01234-567"
      },
      "leader": {
        "id": "uuid-leader",
        "user": {
          "id": "uuid-leader-user",
          "name": "Maria Santos",
          "email": "maria@example.com",
          "phone": "+5511888888888",
          "active": true,
          "completed": true,
          "commonUser": false
        }
      },
      "teachers": [
        {
          "id": "uuid-teacher",
          "user": {
            "id": "uuid-teacher-user",
            "name": "João Silva",
            "email": "joao@example.com",
            "phone": "+5511999999999",
            "active": true,
            "completed": true,
            "commonUser": false
          }
        }
      ],
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
  "id": "uuid-shelter",
  "name": "Abrigo Nova Esperança",
  "address": {
    "id": "uuid-address",
    "street": "Rua das Flores, 123",
    "district": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-567"
  },
  "leader": null,
  "teachers": [],
  "createdAt": "2025-09-27T21:00:00.000Z",
  "updatedAt": "2025-09-27T21:00:00.000Z"
}
```

### Erro - Shelter Não Encontrado (404)
```json
{
  "statusCode": 404,
  "message": "Shelter não encontrado",
  "error": "Not Found"
}
```

### Erro - Validação (400)
```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "name should not be empty"
  ],
  "error": "Bad Request"
}
```

## 🧪 Testes

### Scripts Disponíveis
- `tests/shelters/test-shelter-crud.js` - Teste CRUD básico
- `tests/shelters/test-shelter-filters.js` - Teste de filtros

### Executar Testes
```bash
node tests/shelters/test-shelter-crud.js
node tests/shelters/test-shelter-filters.js
```

## 🤖 Automações

### Scripts Disponíveis
- `automations/shelters/create-shelters-automation.js` - Criação em massa

### Executar Automação
```bash
node automations/shelters/create-shelters-automation.js
```

## 📁 Arquivos Relacionados

### Código Fonte
- `src/modules/shelters/controller/shelters.controller.ts`
- `src/modules/shelters/services/shelters.service.ts`
- `src/modules/shelters/repositories/shelters.repository.ts`
- `src/modules/shelters/dto/` - DTOs de request e response
- `src/modules/shelters/entities/shelter.entity.ts`

### Documentação
- `docs/Shelters_API_Collection.postman_collection.json`
- `docs/Shelters_API_Documentation.md`

### Resultados de Automações
- `docs/shelters/results/created-shelters-2025-09-27.json` - Criação de abrigos

## 🔄 Histórico de Mudanças

### v1.2.0 - Refatoração Completa
- ✅ Removido campo `number` (não usado mais)
- ✅ Removido campo `weekday` (não usado mais)
- ✅ Adicionado campo `name` obrigatório
- ✅ Atualizado filtros para usar `name` em vez de `number`
- ✅ Corrigido relacionamentos com líderes e professores
- ✅ Atualizada collection do Postman

### v1.1.0 - Funcionalidades Básicas
- ✅ CRUD completo de shelters
- ✅ Vinculação com endereços
- ✅ Paginação e filtros
- ✅ Autenticação e autorização

## 📋 Campos da Entidade

### ShelterEntity
- `id` - UUID único
- `name` - Nome do abrigo (obrigatório)
- `address` - Relacionamento com AddressEntity
- `leader` - Relacionamento com LeaderProfileEntity
- `teachers` - Relacionamento com TeacherProfileEntity[]
- `createdAt` - Data de criação
- `updatedAt` - Data de atualização

---

**Módulo Shelters - Sistema de Orfanato** 🏠
