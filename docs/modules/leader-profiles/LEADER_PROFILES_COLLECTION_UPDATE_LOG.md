# 📝 Leader Profiles API Collection - Log de Atualização

**Data:** 23 de Outubro de 2025  
**Versão:** 6.0.0  
**Status:** ✅ 100% Sincronizada com os DTOs

## 🎯 Objetivo

Atualizar a collection do Postman para refletir **exatamente** as estruturas dos DTOs do backend, garantindo que todos os exemplos de Request/Response sejam precisos e testáveis.

## 🔄 Mudanças Principais

### 1. **Correção do Relacionamento** ⚠️
- **ANTES:** Documentado como ManyToMany (shelters [])
- **AGORA:** ManyToOne correto (shelter: objeto ou null)
- **Motivo:** O banco de dados usa `@ManyToOne`, um leader tem apenas UM shelter

### 2. **Estrutura de Paginação** 📊
- **ANTES:** 
```json
{
  "items": [...],
  "meta": {
    "totalItems": 16,
    "itemCount": 12,
    "itemsPerPage": 12,
    "totalPages": 2,
    "currentPage": 1
  }
}
```

- **AGORA:** 
```json
{
  "items": [...],
  "total": 16,
  "page": 1,
  "limit": 12,
  "pageCount": 2
}
```
- **Motivo:** Seguir exatamente a estrutura do `Paginated<T>` DTO

### 3. **LeaderResponseDto** 🎭
```typescript
{
  "id": "uuid",
  "active": boolean,
  "user": {
    "id": "uuid",
    "name": string,
    "email": string,
    "phone": string,
    "active": boolean,
    "completed": boolean,
    "commonUser": boolean
  },
  "shelter": {  // ← SINGULAR, não plural
    "id": "uuid",
    "name": string,
    "number": number,
    "weekday": Weekday,
    "teachers": TeacherMiniDto[]
  } | null,  // ← Pode ser null
  "createdAt": Date,
  "updatedAt": Date
}
```

### 4. **LeaderSimpleListDto** 📋
```typescript
[
  {
    "leaderProfileId": "uuid",  // ← id do profile
    "name": string,             // ← nome do user
    "vinculado": boolean        // ← !!shelter
  }
]
```

### 5. **Query Parameters** 🔍
```typescript
{
  leaderSearchString?: string,   // Busca por nome, email, telefone do líder
  shelterSearchString?: string,  // Busca por dados do shelter
  hasShelter?: boolean,          // true/false
  page: number = 1,              // Padrão: 1
  limit: number = 12,            // Padrão: 12, máximo: 100
  sort: 'updatedAt' | 'createdAt' | 'name' = 'updatedAt',
  order: 'asc' | 'desc' = 'desc'
}
```

## 📚 Exemplos Adicionados

### Endpoint: GET /leader-profiles (Paginação)

1. ✅ **Paginação Básica** - Estrutura completa com relacionamentos
2. ✅ **Filtro leaderSearchString** - Busca por "João"
3. ✅ **Filtro shelterSearchString** - Busca por "Central"
4. ✅ **Filtro hasShelter=true** - Apenas leaders com shelter
5. ✅ **Filtro hasShelter=false** - Apenas leaders sem shelter
6. ✅ **Ordenação por Nome (ASC)** - Alfabética
7. ✅ **Filtros Combinados** - Múltiplos filtros
8. ✅ **Segunda Página e Lista Vazia** - Edge cases

### Endpoint: GET /leader-profiles/simple

- ✅ Array de objetos simples com `leaderProfileId`, `name`, `vinculado`

## 🔧 Endpoints Mapeados

| Método | Endpoint | Request Body | Response |
|--------|----------|--------------|----------|
| POST | `/leader-profiles/create-for-user/:userId` | - | LeaderResponseDto |
| GET | `/leader-profiles` | Query Params | Paginated<LeaderResponseDto> |
| GET | `/leader-profiles/simple` | - | LeaderSimpleListDto[] |
| GET | `/leader-profiles/:id` | - | LeaderResponseDto |
| GET | `/leader-profiles/by-shelter/:shelterId` | - | LeaderResponseDto |
| PATCH | `/leader-profiles/:leaderId/assign-shelter` | `{ shelterId }` | `{ message }` |
| PATCH | `/leader-profiles/:leaderId/unassign-shelter` | `{ shelterId }` | `{ message }` |
| PATCH | `/leader-profiles/:fromLeaderId/move-shelter` | `{ shelterId, toLeaderId }` | `{ message }` |

## ✅ Validações Implementadas

- ✅ Todos os campos obrigatórios dos DTOs
- ✅ Tipos de dados corretos (UUID, string, boolean, Date)
- ✅ Estruturas aninhadas (user, shelter, teachers)
- ✅ Valores null quando apropriado
- ✅ Arrays de teachers vazios e populados
- ✅ Paginação com `pageCount` correto
- ✅ Filtros combinados funcionando

## 🧪 Testes

A automação `tests/automations/leader-profiles/leader-profiles-complete-automation.js` foi atualizada para:

1. ✅ Buscar users com role=leader (endpoint correto)
2. ✅ Testar relacionamentos ManyToOne (não ManyToMany)
3. ✅ Validar estruturas de resposta conforme DTOs
4. ✅ Testar todos os 8 endpoints
5. ✅ Validar filtros consolidados
6. ✅ Testar operações de assign/unassign/move shelter

## 📊 Resultados

```
✅ 17 users com role leader encontrados
✅ 61 shelters disponíveis
✅ 1 leader profile existente
✅ CRUD funcionando
✅ Filtros consolidados funcionando
✅ Paginação funcionando
✅ Validações funcionando
✅ Relacionamentos funcionando
```

## 🚀 Próximos Passos

1. ✅ Collection sincronizada com DTOs
2. ✅ Automação atualizada e funcional
3. ⏳ Importar collection no Postman e testar manualmente
4. ⏳ Validar com o frontend
5. ⏳ Documentar casos de uso reais

## 📝 Notas Importantes

⚠️ **BREAKING CHANGES:**
- Response `shelters[]` → `shelter` (singular, pode ser null)
- Paginação `meta{}` → campos diretos (`total`, `page`, `limit`, `pageCount`)
- Listagem simples retorna estrutura completamente diferente

✅ **Compatível com:**
- Backend atual (NestJS + TypeORM)
- DTOs definidos no código
- Relacionamentos do banco de dados

## 📖 Referências

- **DTOs:** `src/modules/leader-profiles/dto/`
- **Entity:** `src/modules/leader-profiles/entities/leader-profile.entity/`
- **Controller:** `src/modules/leader-profiles/leader-profiles.controller.ts`
- **Automação:** `tests/automations/leader-profiles/leader-profiles-complete-automation.js`

---

**Atualizado por:** AI Assistant  
**Revisado por:** [Pending]  
**Status:** ✅ Pronto para uso

