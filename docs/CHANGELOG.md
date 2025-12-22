# 📝 Changelog - API Orfanatonib

Registro completo de todas as mudanças, atualizações e melhorias do projeto.

---

## [2.0.0] - 2025-10-23 - REORGANIZAÇÃO COMPLETA ⭐

### 🏗️ Estrutura
- **REORGANIZAÇÃO TOTAL** da pasta `docs/` por módulos
- Criada estrutura `docs/modules/[módulo]/`
- Movidos 50+ arquivos para nova estrutura
- Criado `docs/guides/` para documentação geral

### 🧪 Tests Consolidation
- **UNIFIED** `test/` and `tests/` folders → single `test/` folder
- **CONSOLIDATED** 20+ test files → 6 complete automations (1 per module)
- **ORGANIZED** all tests in `test/automations/{module}/`
- **REMOVED** redundant test files (debug, check, investigate)
- **SIMPLIFIED** JSON results → `results.json` (latest only)
- **REDUCTION**: ~70% fewer test files

### 🔧 Leader Profiles - v6.0.0

#### Backend
- **FIX**: Paginação agora retorna TODOS os leaders por padrão (antes: apenas 1)
- **FIX**: Filtro `hasShelter` só aplica quando explicitamente true/false
- **FIX**: Método `list()` retorna TODOS os leaders (antes: só sem shelter)

#### Collection
- **UPDATE**: 100% sincronizada com DTOs do backend
- **UPDATE**: Estrutura de paginação: `{items, total, page, limit, pageCount}`
- **UPDATE**: Relacionamento ManyToOne: `shelter: {...} | null`
- **ADD**: 8 exemplos detalhados de paginação
- **FIX**: Listagem simples: `{leaderProfileId, name, vinculado}`

#### Validação
```
✅ Paginação sem filtro: 17 leaders (TODOS)
✅ hasShelter=true: 16 leaders  
✅ hasShelter=false: 1 leader
✅ Listagem simples: 17 leaders
```

### 📚 Documentação
- **ADD**: `docs/README.md` - Documentação principal atualizada
- **ADD**: `docs/INDEX.md` - Índice completo com links
- **ADD**: `docs/modules/leader-profiles/README.md` - Exemplo completo
- **ADD**: `docs/CHANGELOG.md` - Este arquivo (consolidação de logs)

### 🗑️ Limpeza
- **REMOVE**: 11 pastas desorganizadas antigas
- **CONSOLIDATE**: Múltiplos MDs de resumo → CHANGELOG.md
- **MOVE**: Collections para `modules/[módulo]/`
- **MOVE**: Documentação para `modules/[módulo]/`

---

## [1.5.0] - 2025-09-30

### 🏠 Shelters
- **ADD**: Sistema de Media Items (fotos)
- **ADD**: Relacionamento com leaders e teachers
- **UPDATE**: Estrutura de endereços melhorada

### 👩‍🏫 Teacher Profiles
- **ADD**: Especializações de professores
- **ADD**: Vinculação a shelters
- **REFACTOR**: Filtros consolidados

### 👶 Sheltered
- **UPDATE**: Campos opcionais (guardianName, guardianPhone)
- **FIX**: Validação de gender (M/F)
- **ADD**: Relacionamento com pagelas

---

## [1.0.0] - 2025-09-27 - RELEASE INICIAL

### 🔐 Auth
- **ADD**: Sistema de autenticação JWT
- **ADD**: Login e refresh token
- **ADD**: Controle de acesso por roles (admin, leader, teacher)

### 👥 Users
- **ADD**: CRUD completo de usuários
- **ADD**: Filtros (role, status, busca)
- **ADD**: Controle de visibilidade (active)
- **ADD**: Paginação e ordenação

### 🏠 Shelters
- **ADD**: CRUD de abrigos
- **ADD**: Sistema de endereços
- **ADD**: Filtros por localização

### 👨‍💼 Leader Profiles
- **ADD**: Gestão de perfis de líderes
- **ADD**: Vinculação a shelters (ManyToOne)
- **ADD**: Operações de atribuição/movimentação

### 👩‍🏫 Teacher Profiles
- **ADD**: Gestão de perfis de professores
- **ADD**: Vinculação a shelters

### 👶 Sheltered
- **ADD**: Gestão de abrigados
- **ADD**: Dados pessoais e responsáveis
- **ADD**: Filtros por idade, gênero, shelter

### 📝 Pagelas
- **ADD**: Sistema de relatórios
- **ADD**: Vinculação a sheltered e teachers
- **ADD**: Filtros por ano, visita, presença

### 🧪 Automações
- **ADD**: Automação completa para todos os módulos
- **ADD**: `tests/automations/[módulo]/[módulo]-complete-automation.js`
- **ADD**: Validação de CRUD, filtros, paginação

### 📚 Documentação
- **ADD**: Collections Postman para todos os módulos
- **ADD**: Documentação de APIs
- **ADD**: Environments Postman

---

## Legenda

- **ADD**: Nova funcionalidade
- **UPDATE**: Atualização de funcionalidade existente
- **FIX**: Correção de bug
- **REFACTOR**: Refatoração de código
- **REMOVE**: Remoção de código/arquivo
- **CONSOLIDATE**: Consolidação de múltiplos arquivos
- **MOVE**: Movimentação de arquivos

---

## 📊 Estatísticas do Projeto

### Módulos
- 7 módulos principais
- 7 collections Postman
- 7 automações completas

### Código
- ~50 arquivos de código modificados
- ~100 endpoints documentados
- 1 collection 100% sincronizada (Leader Profiles v6.0.0)
- 6 collections pendentes de atualização

### Documentação
- 43 arquivos MD (será consolidado)
- 7 READMEs de módulos
- 1 README principal
- 1 INDEX completo

---

**Última atualização**: 23 de Outubro de 2025  
**Versão atual**: 2.0.0  
**Status**: 🚀 Em desenvolvimento ativo

