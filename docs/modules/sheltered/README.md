# 👶 Sheltered Module

> **Para documentação completa, consulte**: [📖 GUIA COMPLETO DO SHELTERED](../documentation/SHELTERED_COMPLETE_GUIDE.md)

---

## 📚 Documentação Consolidada

Toda a documentação do módulo **Sheltered** foi consolidada em um único guia abrangente:

### 🎯 [GUIA COMPLETO - Sheltered](../documentation/SHELTERED_COMPLETE_GUIDE.md)

Este guia único contém:

- ✅ **Visão Geral Completa**: Conceitos, estrutura, características
- ✅ **Todos os 6 Endpoints**: Documentação detalhada com exemplos
- ✅ **Autenticação e Autorização**: JWT, roles, permissões
- ✅ **Filtros Avançados**: Paginação, busca, ordenação
- ✅ **DTOs e Validações**: Todas as interfaces e regras
- ✅ **Relacionamentos**: Shelters, Addresses, Pagelas, AcceptedChrists
- ✅ **Guia Backend**: Exemplos NestJS/TypeORM
- ✅ **Guia Frontend**: Exemplos React/TypeScript
- ✅ **Collection Postman**: Como importar e usar
- ✅ **Automações e Testes**: Scripts e execução
- ✅ **Troubleshooting**: Solução de problemas comuns
- ✅ **Histórico de Mudanças**: Todas as versões

### 📑 [ÍNDICE RÁPIDO](../documentation/SHELTERED_INDEX.md)

Consulte o índice para navegação rápida e links diretos para seções específicas.

---

## 🚀 Início Rápido

### Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| **GET** | `/sheltered` | Lista com paginação e filtros |
| **GET** | `/sheltered/simple` | Lista simplificada |
| **GET** | `/sheltered/:id` | Busca por ID |
| **POST** | `/sheltered` | Criar novo sheltered |
| **PUT** | `/sheltered/:id` | Atualizar sheltered |
| **DELETE** | `/sheltered/:id` | Deletar sheltered |

**📘 [Ver Documentação Completa dos Endpoints](../documentation/SHELTERED_COMPLETE_GUIDE.md#endpoints-da-api)**

---

### Campos Principais

#### Obrigatórios
- `name` - Nome completo
- `birthDate` - Data de nascimento (YYYY-MM-DD)
- `gender` - Gênero

#### Opcionais (desde v2.1.0)
- `guardianName` - Nome do responsável
- `guardianPhone` - Telefone do responsável
- `joinedAt` - Data de ingresso
- `shelterId` - ID do shelter
- `address` - Endereço completo

**📘 [Ver Estrutura Completa de Dados](../documentation/SHELTERED_COMPLETE_GUIDE.md#estrutura-de-dados)**

---

### Exemplo Básico

```http
# Listar sheltered
GET /sheltered?page=1&limit=10
Authorization: Bearer {{access_token}}

# Criar sheltered (com responsável)
POST /sheltered
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "João Silva",
  "birthDate": "2010-05-15",
  "gender": "Masculino",
  "guardianName": "Maria Silva",
  "guardianPhone": "+5511999999999"
}

# Criar sheltered (sem responsável)
POST /sheltered
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "João Sem Responsável",
  "birthDate": "2012-03-20",
  "gender": "Masculino"
}
```

**📘 [Ver Mais Exemplos](../documentation/SHELTERED_COMPLETE_GUIDE.md#endpoints-da-api)**

---

## 🧪 Automações e Testes

### Criar Dados de Teste

```bash
# Criar 20 sheltered automaticamente
node automations/sheltered/sheltered-complete-automation.js
```

### Testar Endpoints

```bash
# Testar todos os endpoints (12 testes)
node tests/sheltered/test-sheltered-crud.js
```

**📘 [Ver Guia Completo de Automações](../documentation/SHELTERED_COMPLETE_GUIDE.md#automações-e-testes)**

---

## 📦 Collection Postman

A collection completa está disponível em:
- `docs/collections/Sheltered_API_Collection.postman_collection.json`

**Variáveis necessárias**:
- `base_url` - URL da API
- `access_token` - Token JWT
- `sheltered_id` - ID para testes
- `shelter_id` - ID de shelter

**📘 [Ver Guia da Collection Postman](../documentation/SHELTERED_COMPLETE_GUIDE.md#collection-postman)**

---

## 🔗 Links Úteis

### Documentação
- 📖 [Guia Completo](../documentation/SHELTERED_COMPLETE_GUIDE.md)
- 📑 [Índice Rápido](../documentation/SHELTERED_INDEX.md)

### Código Fonte
- 📁 `src/modules/sheltered/` - Módulo completo

### Automações
- 🤖 `automations/sheltered/sheltered-complete-automation.js`
- 🧪 `tests/sheltered/test-sheltered-crud.js`

### Collection
- 📦 `docs/collections/Sheltered_API_Collection.postman_collection.json`

---

## ⚠️ Mudanças Importantes

### v2.1.0 - Campos Opcionais

Os campos `guardianName` e `guardianPhone` são **opcionais** desde outubro/2025.

**Importante no Frontend**:
```typescript
// Sempre verificar null
const guardianDisplay = sheltered.guardianName ?? 'Não informado';

// Ou renderização condicional
{sheltered.guardianName && (
  <span>Responsável: {sheltered.guardianName}</span>
)}
```

**📘 [Ver Histórico Completo de Mudanças](../documentation/SHELTERED_COMPLETE_GUIDE.md#histórico-de-mudanças)**

---

## 📞 Suporte

Para dúvidas ou problemas:

1. **Consulte o [Guia Completo](../documentation/SHELTERED_COMPLETE_GUIDE.md)**
2. **Veja o [Troubleshooting](../documentation/SHELTERED_COMPLETE_GUIDE.md#troubleshooting)**
3. **Verifique os exemplos no [Índice](../documentation/SHELTERED_INDEX.md)**

---

**Versão da API**: 2.1.0  
**Última Atualização**: Outubro 2025

👉 **[Ir para o Guia Completo](../documentation/SHELTERED_COMPLETE_GUIDE.md)**
