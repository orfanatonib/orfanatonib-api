# 👨‍🏫 Teacher Profiles Module

> **Para documentação completa, consulte**: [📖 GUIA COMPLETO DO TEACHER PROFILES](../documentation/TEACHER_PROFILES_COMPLETE_GUIDE.md)

---

## 📚 Documentação Consolidada

Toda a documentação do módulo **Teacher Profiles** foi consolidada em um único guia abrangente:

### 🎯 [GUIA COMPLETO - Teacher Profiles](../documentation/TEACHER_PROFILES_COMPLETE_GUIDE.md)

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

### 📑 [ÍNDICE RÁPIDO](../documentation/TEACHER_PROFILES_INDEX.md)

Consulte o índice para navegação rápida e links diretos para seções específicas.

---

## 📋 Visão Geral

O módulo Teacher Profiles gerencia os perfis dos professores do sistema de orfanato, incluindo vinculação com abrigos e gerenciamento de responsabilidades.

### Características Principais

- ✅ **Criação Automática**: Profiles criados ao criar usuário com role `teacher`
- ✅ **Vinculação com Shelters**: Um teacher por shelter
- ✅ **Listagem Avançada**: Paginação, filtros, busca
- ✅ **Controle de Visibilidade**: Baseado em status ativo

---

## 🚀 Início Rápido

### Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| **GET** | `/teacher-profiles` | Lista com paginação e filtros |
| **GET** | `/teacher-profiles/simple` | Lista simplificada |
| **GET** | `/teacher-profiles/:id` | Busca por ID |
| **GET** | `/teacher-profiles/by-shelter/:shelterId` | Teachers de um shelter |
| **PATCH** | `/teacher-profiles/:id/assign-shelter` | Vincular a shelter |
| **PATCH** | `/teacher-profiles/:id/unassign-shelter` | Desvincular de shelter |

**📘 [Ver Documentação Completa dos Endpoints](../documentation/TEACHER_PROFILES_COMPLETE_GUIDE.md#endpoints-da-api)**

---

### Exemplo Básico

```http
# Listar teacher profiles
GET /teacher-profiles?page=1&limit=10&hasShelter=true
Authorization: Bearer {{access_token}}

# Vincular teacher a shelter
PATCH /teacher-profiles/:teacherId/assign-shelter
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "shelterId": "uuid-shelter-id"
}

# Desvincular teacher de shelter
PATCH /teacher-profiles/:teacherId/unassign-shelter
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "shelterId": "uuid-shelter-id"
}
```

**📘 [Ver Mais Exemplos](../documentation/TEACHER_PROFILES_COMPLETE_GUIDE.md#endpoints-da-api)**

---

## 🧪 Automações e Testes

### Teste Completo

```bash
# Testar todos os endpoints
node tests/teacher-profiles/test-teacher-profiles-complete-automation.js
```

### Teste de Vinculação

```bash
# Testar vinculação/desvinculação
node tests/teacher-profiles/test-teacher-shelter-linking.js
```

**📘 [Ver Guia Completo de Automações](../documentation/TEACHER_PROFILES_COMPLETE_GUIDE.md#automações-e-testes)**

---

## 📦 Collection Postman

A collection completa está disponível em:
- `docs/collections/Teacher_Profiles_API_Collection.postman_collection.json`

**Variáveis necessárias**:
- `base_url` - URL da API
- `access_token` - Token JWT
- `teacher_profile_id` - ID para testes
- `shelter_id` - ID de shelter

**📘 [Ver Guia da Collection Postman](../documentation/TEACHER_PROFILES_COMPLETE_GUIDE.md#collection-postman)**

---

## 🔗 Links Úteis

### Documentação
- 📖 [Guia Completo](../documentation/TEACHER_PROFILES_COMPLETE_GUIDE.md)
- 📑 [Índice Rápido](../documentation/TEACHER_PROFILES_INDEX.md)

### Código Fonte
- 📁 `src/modules/teacher-profiles/` - Módulo completo

### Testes
- 🧪 `tests/teacher-profiles/test-teacher-profiles-complete-automation.js`
- 🧪 `tests/teacher-profiles/test-teacher-shelter-linking.js`

### Collection
- 📦 `docs/collections/Teacher_Profiles_API_Collection.postman_collection.json`

---

## ⚠️ Mudanças Importantes

### v1.2.0 - Refatoração para Shelters

Renomeado `club` para `shelter` em todos os endpoints e DTOs.

**📘 [Ver Histórico Completo de Mudanças](../documentation/TEACHER_PROFILES_COMPLETE_GUIDE.md#histórico-de-mudanças)**

---

## 📞 Suporte

Para dúvidas ou problemas:

1. **Consulte o [Guia Completo](../documentation/TEACHER_PROFILES_COMPLETE_GUIDE.md)**
2. **Veja o [Troubleshooting](../documentation/TEACHER_PROFILES_COMPLETE_GUIDE.md#troubleshooting)**
3. **Verifique os exemplos no [Índice](../documentation/TEACHER_PROFILES_INDEX.md)**

---

**Versão da API**: 1.2.0  
**Última Atualização**: Outubro 2025

👉 **[Ir para o Guia Completo](../documentation/TEACHER_PROFILES_COMPLETE_GUIDE.md)**
