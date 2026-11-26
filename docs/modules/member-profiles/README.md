# 👨‍🏫 Member Profiles Module

> **Para documentação completa, consulte**: [📖 GUIA COMPLETO DO MEMBER PROFILES](../documentation/MEMBER_PROFILES_COMPLETE_GUIDE.md)

---

## 📚 Documentação Consolidada

Toda a documentação do módulo **Member Profiles** foi consolidada em um único guia abrangente:

### 🎯 [GUIA COMPLETO - Member Profiles](../documentation/MEMBER_PROFILES_COMPLETE_GUIDE.md)

Este guia único contém:

- ✅ **Visão Geral Completa**: Conceitos, estrutura, características
- ✅ **Todos os 6 Endpoints**: Documentação detalhada com exemplos
- ✅ **Autenticação e Autorização**: JWT, roles, permissões
- ✅ **Filtros Avançados**: Paginação, busca, ordenação
- ✅ **Vinculação com Shelters**: Assign/Unassign completo
- ✅ **DTOs e Validações**: Todas as interfaces e regras
- ✅ **Relacionamentos**: Users, Shelters, Leaders
- ✅ **Guia Backend**: Exemplos NestJS/TypeORM
- ✅ **Guia Frontend**: Exemplos React/TypeScript
- ✅ **Collection Postman**: Como importar e usar
- ✅ **Automações e Testes**: Scripts e execução
- ✅ **Troubleshooting**: Solução de problemas comuns
- ✅ **Histórico de Mudanças**: Todas as versões

### 📑 [ÍNDICE RÁPIDO](../documentation/MEMBER_PROFILES_INDEX.md)

Consulte o índice para navegação rápida e links diretos para seções específicas.

---

## 📋 Visão Geral

O módulo Member Profiles gerencia os perfis dos professores do sistema de orfanato, incluindo vinculação com abrigos e gerenciamento de responsabilidades.

### Características Principais

- ✅ **Criação Automática**: Profiles criados ao criar usuário com role `member`
- ✅ **Vinculação com Shelters**: Um member por shelter
- ✅ **Listagem Avançada**: Paginação, filtros, busca
- ✅ **Controle de Visibilidade**: Baseado em status ativo

---

## 🚀 Início Rápido

### Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| **GET** | `/member-profiles` | Lista com paginação e filtros |
| **GET** | `/member-profiles/simple` | Lista simplificada |
| **GET** | `/member-profiles/:id` | Busca por ID |
| **GET** | `/member-profiles/by-shelter/:shelterId` | Members de um shelter |
| **PATCH** | `/member-profiles/:id/assign-shelter` | Vincular a shelter |
| **PATCH** | `/member-profiles/:id/unassign-shelter` | Desvincular de shelter |

**📘 [Ver Documentação Completa dos Endpoints](../documentation/MEMBER_PROFILES_COMPLETE_GUIDE.md#endpoints-da-api)**

---

### Exemplo Básico

```http
# Listar member profiles
GET /member-profiles?page=1&limit=10&hasShelter=true
Authorization: Bearer {{access_token}}

# Vincular member a shelter
PATCH /member-profiles/:memberId/assign-shelter
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "shelterId": "uuid-shelter-id"
}

# Desvincular member de shelter
PATCH /member-profiles/:memberId/unassign-shelter
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "shelterId": "uuid-shelter-id"
}
```

**📘 [Ver Mais Exemplos](../documentation/MEMBER_PROFILES_COMPLETE_GUIDE.md#endpoints-da-api)**

---

## 🧪 Automações e Testes

### Teste Completo

```bash
# Testar todos os endpoints
node tests/member-profiles/test-member-profiles-complete-automation.js
```

### Teste de Vinculação

```bash
# Testar vinculação/desvinculação
node tests/member-profiles/test-member-shelter-linking.js
```

**📘 [Ver Guia Completo de Automações](../documentation/MEMBER_PROFILES_COMPLETE_GUIDE.md#automações-e-testes)**

---

## 📦 Collection Postman

A collection completa está disponível em:
- `docs/collections/Member_Profiles_API_Collection.postman_collection.json`

**Variáveis necessárias**:
- `base_url` - URL da API
- `access_token` - Token JWT
- `member_profile_id` - ID para testes
- `shelter_id` - ID de shelter

**📘 [Ver Guia da Collection Postman](../documentation/MEMBER_PROFILES_COMPLETE_GUIDE.md#collection-postman)**

---

## 🔗 Links Úteis

### Documentação
- 📖 [Guia Completo](../documentation/MEMBER_PROFILES_COMPLETE_GUIDE.md)
- 📑 [Índice Rápido](../documentation/MEMBER_PROFILES_INDEX.md)

### Código Fonte
- 📁 `src/modules/member-profiles/` - Módulo completo

### Testes
- 🧪 `tests/member-profiles/test-member-profiles-complete-automation.js`
- 🧪 `tests/member-profiles/test-member-shelter-linking.js`

### Collection
- 📦 `docs/collections/Member_Profiles_API_Collection.postman_collection.json`

---

## ⚠️ Mudanças Importantes

**2026-11-22 — `PUT /member-profiles/:memberId` (alocar membro em equipe):** é uma operação só (`TeamsRepository.assignMemberToTeam`, transação): membro ou abrigo inexistente → `404` sem gravar nada (nenhuma equipe nasce); equipe do número pedido é criada se não existir; repetir o pedido é idempotente (`200`, sem equipe duplicada). O e-mail `team-assignment-changed` (flag `email_team_assignment_changed`) sai **só quando a equipe mudou de fato** (antes saía a cada chamada). `GET /member-profiles/simple` lista apenas membros **sem equipe** (o seletor de quem ainda pode ser alocado); `GET /member-profiles` conta só membros de usuário ativo.

### v1.2.0 - Refatoração para Shelters

Renomeado `club` para `shelter` em todos os endpoints e DTOs.

**📘 [Ver Histórico Completo de Mudanças](../documentation/MEMBER_PROFILES_COMPLETE_GUIDE.md#histórico-de-mudanças)**

---

## 📞 Suporte

Para dúvidas ou problemas:

1. **Consulte o [Guia Completo](../documentation/MEMBER_PROFILES_COMPLETE_GUIDE.md)**
2. **Veja o [Troubleshooting](../documentation/MEMBER_PROFILES_COMPLETE_GUIDE.md#troubleshooting)**
3. **Verifique os exemplos no [Índice](../documentation/MEMBER_PROFILES_INDEX.md)**

---

**Versão da API**: 1.2.0  
**Última Atualização**: Outubro 2025

👉 **[Ir para o Guia Completo](../documentation/MEMBER_PROFILES_COMPLETE_GUIDE.md)**
