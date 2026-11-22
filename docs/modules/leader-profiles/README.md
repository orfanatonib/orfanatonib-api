# 👨‍💼 Leader Profiles - Documentação Completa

Módulo responsável pela gestão de perfis de líderes e sua vinculação a abrigos (shelters).

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Arquivos do Módulo](#-arquivos-do-módulo)
- [Endpoints](#-endpoints)
- [Relacionamentos](#-relacionamentos)
- [Filtros e Paginação](#-filtros-e-paginação)
- [Exemplos de Uso](#-exemplos-de-uso)
- [Automação](#-automação)
- [Changelog](#-changelog)

## 🎯 Visão Geral

O módulo Leader Profiles gerencia os perfis de líderes que são responsáveis pelos abrigos. 

### Características Principais

- ✅ Criação automática de perfil a partir de User
- ✅ Relacionamento **ManyToOne** com Shelters (um leader → um shelter ou nenhum)
- ✅ Filtros consolidados (busca por líder, shelter, vinculação)
- ✅ Operações de atribuição, remoção e movimentação de shelters
- ✅ Paginação avançada com ordenação
- ✅ Listagem simplificada para dropdowns

### Tecnologias

- NestJS + TypeORM
- PostgreSQL
- JWT Authentication
- DTOs com class-transformer e class-validator

## 📁 Arquivos do Módulo

```
modules/leader-profiles/
├── README.md (este arquivo)
├── Leader_Profiles_API_Collection.postman_collection.json
├── Leader_Profiles_API_Documentation.md
├── Leader_Profiles_API_Environment.postman_environment.json
├── LEADER_PROFILES_COLLECTION_UPDATE_LOG.md
├── RESUMO_AUTOMACAO_LEADER_PROFILES_FINAL.md
└── results/
    ├── created-leader-profiles-2025-09-27.json
    ├── created-leaders-alternative-2025-09-27.json
    ├── created-leaders-register-2025-09-27.json
    └── complete-test-results-*.json
```

## 🔌 Endpoints

> **Contrato atual (2026-11-22):** hoje o módulo expõe `GET /leader-profiles` (paginado), `/simple`, `/my-shelters`, `/:id` e `PUT /leader-profiles/:leaderId`. O `PUT` recebe **um array** `[{ shelterId, teams: number[] }]` (cada número ≥ 1) e deixa o líder **somente** nas equipes pedidas, criando as que não existem. É **tudo ou nada**, numa transação: abrigo inexistente → `404` e nada muda (antes o líder ficava sem nenhuma equipe); abrigo e número repetidos no pedido contam uma vez; `[]` solta o líder de todas. Líder só mexe em líderes e abrigos que ele lidera (`403`); leitura fora do escopo é `404`. As seções abaixo descrevem a API antiga e ficam como histórico.

### 1. Criar Leader Profile para Usuário
```http
POST /leader-profiles/create-for-user/:userId
```
Cria automaticamente um leader profile para um usuário com role 'leader'.

**Resposta**: `LeaderResponseDto`

---

### 2. Listar com Paginação
```http
GET /leader-profiles
```

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 12, max: 100)
- `sort` (updatedAt | createdAt | name, default: updatedAt)
- `order` (asc | desc, default: desc)
- `leaderSearchString` (string, opcional) - Busca por nome, email ou telefone
- `shelterSearchString` (string, opcional) - Busca por dados do shelter
- `hasShelter` (boolean, opcional) - true: com shelter, false: sem shelter, undefined: todos

**⭐ Comportamento Padrão**: Sem filtros, retorna **TODOS** os leaders (com e sem shelter)

**Resposta**: `Paginated<LeaderResponseDto>`
```json
{
  "items": LeaderResponseDto[],
  "total": number,
  "page": number,
  "limit": number,
  "pageCount": number
}
```

---

### 3. Listar Simplificado
```http
GET /leader-profiles/simple
```

**Resposta**: `LeaderSimpleListDto[]`
```json
[
  {
    "leaderProfileId": "uuid",
    "name": "string",
    "vinculado": boolean
  }
]
```

---

### 4. Buscar por ID
```http
GET /leader-profiles/:id
```

**Resposta**: `LeaderResponseDto`

---

### 5. Buscar por Shelter
```http
GET /leader-profiles/by-shelter/:shelterId
```

Retorna o leader vinculado ao shelter especificado.

**Resposta**: `LeaderResponseDto`

---

### 6. Atribuir Shelter
```http
PATCH /leader-profiles/:leaderId/assign-shelter
```

**Body**:
```json
{
  "shelterId": "uuid"
}
```

**Validações**:
- Leader não pode estar vinculado a outro shelter
- Shelter deve existir

**Resposta**:
```json
{
  "message": "Líder atribuído ao shelter com sucesso"
}
```

---

### 7. Desatribuir Shelter
```http
PATCH /leader-profiles/:leaderId/unassign-shelter
```

**Body**:
```json
{
  "shelterId": "uuid"
}
```

**Validações**:
- Leader deve estar vinculado ao shelter informado

**Resposta**:
```json
{
  "message": "Líder removido do shelter com sucesso"
}
```

---

### 8. Mover Shelter Entre Leaders
```http
PATCH /leader-profiles/:fromLeaderId/move-shelter
```

**Body**:
```json
{
  "shelterId": "uuid",
  "toLeaderId": "uuid"
}
```

**Validações**:
- Leader origem deve estar vinculado ao shelter
- Leader destino não pode estar vinculado a outro shelter

**Resposta**:
```json
{
  "message": "Shelter movido com sucesso"
}
```

---

## 🔗 Relacionamentos

### ManyToOne: LeaderProfile → Shelter
```typescript
@ManyToOne(() => ShelterEntity, (shelter) => shelter.leaders, {
  nullable: true,
  onDelete: 'SET NULL',
})
shelter: ShelterEntity | null;
```

**Características**:
- Um leader pode ter **UM** shelter ou **nenhum**
- Um shelter pode ter **múltiplos** leaders
- Se o shelter for deletado, a referência é setada como null

### OneToOne: LeaderProfile → User
```typescript
@OneToOne(() => UserEntity, (user) => user.leaderProfile, {
  nullable: false,
  onDelete: 'CASCADE',
})
user: UserEntity;
```

**Características**:
- Cada leader profile pertence a um user único
- User deve ter role 'leader'
- Se o user for deletado, o profile é deletado em cascata

## 🔍 Filtros e Paginação

### LeaderProfilesQueryDto

```typescript
{
  leaderSearchString?: string;    // Busca: nome, email, telefone
  shelterSearchString?: string;   // Busca: nome, endereço do shelter
  hasShelter?: boolean;           // true/false/undefined
  page: number = 1;
  limit: number = 12;             // máx: 100
  sort: 'updatedAt' | 'createdAt' | 'name' = 'updatedAt';
  order: 'asc' | 'desc' = 'desc';
}
```

### Exemplos de Consultas

```
# TODOS os leaders
GET /leader-profiles?page=1&limit=12

# Apenas com shelter
GET /leader-profiles?hasShelter=true

# Apenas sem shelter
GET /leader-profiles?hasShelter=false

# Buscar por nome do líder
GET /leader-profiles?leaderSearchString=João

# Buscar por shelter
GET /leader-profiles?shelterSearchString=Central

# Combinação de filtros
GET /leader-profiles?leaderSearchString=Silva&hasShelter=true&sort=name&order=asc
```

## 💡 Exemplos de Uso

### 1. Criar Leader Profile

```javascript
// 1. Login
POST /auth/login
{
  "email": "admin@example.com",
  "password": "password123"
}

// 2. Criar leader profile para user
POST /leader-profiles/create-for-user/{userId}
Authorization: Bearer {token}
```

### 2. Listar Todos os Leaders

```javascript
GET /leader-profiles?page=1&limit=50
Authorization: Bearer {token}

// Resposta
{
  "items": [
    {
      "id": "uuid",
      "active": true,
      "user": { "name": "João Silva", ... },
      "shelter": { "name": "Abrigo Central", ... } | null,
      "createdAt": "2025-01-10T08:00:00.000Z",
      "updatedAt": "2025-01-22T16:45:00.000Z"
    }
  ],
  "total": 17,
  "page": 1,
  "limit": 50,
  "pageCount": 1
}
```

### 3. Atribuir Shelter a Leader

```javascript
PATCH /leader-profiles/{leaderId}/assign-shelter
Authorization: Bearer {token}

{
  "shelterId": "shelter-uuid"
}
```

## 🧪 Automação

Execute a automação completa:

```bash
node tests/automations/leader-profiles/leader-profiles-complete-automation.js
```

### Testes Incluídos

1. ✅ CRUD de Leader Profiles
2. ✅ Filtros Consolidados
3. ✅ Listagens e Paginação
4. ✅ Validações de Dados
5. ✅ Relacionamentos (assign/unassign/move)
6. ✅ Filtro hasShelter

### Resultados Esperados

```
✅ 17 users com role leader encontrados
✅ 61 shelters disponíveis
✅ CRUD funcionando
✅ Filtros consolidados funcionando
✅ Paginação retorna TODOS os leaders por padrão
✅ hasShelter=true: 16 leaders
✅ hasShelter=false: 1 leader
✅ Total: 17 leaders
```

## 📦 DTOs

### LeaderResponseDto
```typescript
{
  id: string;
  active: boolean;
  user: UserMiniDto;
  shelter: ShelterWithMembersDto | null;
  createdAt: Date;
  updatedAt: Date;
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

### AssignShelterDto
```typescript
{
  shelterId: string;
}
```

### MoveShelterDto
```typescript
{
  shelterId: string;
  toLeaderId: string;
}
```

## 📝 Changelog

### v6.0.0 - 2025-10-23
- ✅ Collection 100% sincronizada com DTOs
- ✅ Correção: Paginação retorna TODOS os leaders por padrão
- ✅ Correção: Filtro hasShelter só aplica quando true/false explícito
- ✅ Correção: Listagem simples retorna TODOS os leaders
- ✅ 8 exemplos detalhados de paginação adicionados
- ✅ Documentação atualizada com comportamento padrão

### v5.0.0 - 2025-09-27
- ✅ Implementação de relacionamento ManyToOne
- ✅ Filtros consolidados (leaderSearchString, shelterSearchString, hasShelter)
- ✅ Operações de movimentação de shelters
- ✅ Automação completa

---

## 🔗 Links Relacionados

- [Documentação Completa dos Endpoints](./LEADER_PROFILES_ENDPOINTS_COMPLETE.md) ⭐ **NOVO**
- [Documentação Técnica](./Leader_Profiles_API_Documentation.md)
- [Collection Postman](./Leader_Profiles_API_Collection.postman_collection.json)
- [Log de Atualizações](./LEADER_PROFILES_COLLECTION_UPDATE_LOG.md)
- [Índice Geral](../../README.md)

---

**Última atualização**: 23 de Outubro de 2025  
**Status**: ✅ 100% Funcional e Documentado
