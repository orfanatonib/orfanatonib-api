# 📑 Índice Geral da Documentação

Índice completo de toda a documentação da API Orfanatonib, organizada por módulos.

## 🎯 Documentação Principal dos Módulos

### 📚 Módulos Principais

Documentação completa e consolidada dos 3 módulos principais:

- 📚 **[Módulo Professor](./MODULO_PROFESSOR.md)** - Gestão completa de professores, equipes e abrigos
- 👥 **[Módulo Líder](./MODULO_LIDER.md)** - Gestão completa de líderes, equipes e abrigos  
- 🏠 **[Módulo Abrigo](./MODULO_ABRIGO.md)** - Gestão completa de abrigos, equipes, líderes e professores

**Estrutura de Relacionamentos:**
```
Professor → Equipe → Abrigo
Líder → Equipe → Abrigo
```

---

## 📚 Estrutura Geral

```
docs/
├── README.md                              # Documentação principal
├── INDEX.md                               # Este índice
├── Orfanatonib_API_Environment.postman_environment.json
├── modules/                               # Documentação por módulo
│   ├── auth/
│   ├── users/
│   ├── shelters/
│   ├── leader-profiles/
│   ├── member-profiles/
│   ├── sheltered/
│   ├── feature-flags/
│   └── pagelas/
└── guides/                                # Guias gerais
```

---

## 🔐 1. Auth

**Autenticação e Autorização**

### Arquivos
- [`modules/auth/README.md`](./modules/auth/README.md)
- [`modules/auth/Auth_API_Collection.postman_collection.json`](./modules/auth/Auth_API_Collection.postman_collection.json)
- [`modules/auth/Auth_API_Documentation.md`](./modules/auth/Auth_API_Documentation.md)
- [`modules/auth/Auth_Collection_Usage_Example.md`](./modules/auth/Auth_Collection_Usage_Example.md)

### Endpoints Principais
- `POST /auth/login` - Login e geração de token
- `POST /auth/refresh` - Refresh de token
- `GET /auth/profile` - Perfil do usuário autenticado

---

## 👥 2. Users

**Gestão de Usuários**

### Arquivos
- [`modules/users/README.md`](./modules/users/README.md)
- [`modules/users/Users_API_Collection.postman_collection.json`](./modules/users/Users_API_Collection.postman_collection.json)
- [`modules/users/Users_API_Documentation.md`](./modules/users/Users_API_Documentation.md)
- [`modules/users/RESUMO_AUTOMACAO_USERS_FINAL.md`](./modules/users/RESUMO_AUTOMACAO_USERS_FINAL.md)
- [`modules/users/CONTROLE_VISIBILIDADE_ACTIVE.md`](./modules/users/CONTROLE_VISIBILIDADE_ACTIVE.md)

### Endpoints Principais
- `POST /users` - Criar usuário
- `GET /users` - Listar com paginação e filtros
- `GET /users/:id` - Buscar por ID
- `PUT /users/:id` - Atualizar usuário
- `DELETE /users/:id` - Deletar usuário

### Guias Específicos
- [Análise de Orquestração](./modules/users/ANALISE_ORQUESTRACAO_USERS.md)
- [Controle de Visibilidade](./modules/users/CONTROLE_VISIBILIDADE_ACTIVE.md)
- [Resumo de Atualizações](./modules/users/RESUMO_ATUALIZACOES_USERS.md)

---

## 🏠 3. Shelters

**Gestão de Abrigos**

### Arquivos
- [`modules/shelters/README.md`](./modules/shelters/README.md)
- [`modules/shelters/Shelters_API_Collection.postman_collection.json`](./modules/shelters/Shelters_API_Collection.postman_collection.json)
- [`modules/shelters/Shelters_API_Documentation.md`](./modules/shelters/Shelters_API_Documentation.md)
- [`modules/shelters/SHELTERS_COMPLETE_GUIDE.md`](./modules/shelters/SHELTERS_COMPLETE_GUIDE.md)
- [`modules/shelters/SHELTERS_INDEX.md`](./modules/shelters/SHELTERS_INDEX.md)

### Endpoints Principais
- `POST /shelters` - Criar abrigo
- `GET /shelters` - Listar com paginação
- `GET /shelters/simple` - Listagem simplificada
- `GET /shelters/:id` - Buscar por ID
- `PUT /shelters/:id` - Atualizar abrigo
- `DELETE /shelters/:id` - Deletar abrigo

### Features
- ✅ Gestão de endereços
- ✅ Media items (fotos)
- ✅ Relacionamentos com leaders e members
- ✅ Filtros por localização

---

## 👨‍💼 4. Leader Profiles

**Perfis de Líderes**

### Arquivos
- [`modules/leader-profiles/README.md`](./modules/leader-profiles/README.md) ⭐ **ATUALIZADO**
- [`modules/leader-profiles/Leader_Profiles_API_Collection.postman_collection.json`](./modules/leader-profiles/Leader_Profiles_API_Collection.postman_collection.json) ⭐ **v6.0.0**
- [`modules/leader-profiles/Leader_Profiles_API_Documentation.md`](./modules/leader-profiles/Leader_Profiles_API_Documentation.md)
- [`modules/leader-profiles/LEADER_PROFILES_COLLECTION_UPDATE_LOG.md`](./modules/leader-profiles/LEADER_PROFILES_COLLECTION_UPDATE_LOG.md) ⭐ **NOVO**

### Endpoints Principais
- `POST /leader-profiles/create-for-user/:userId` - Criar profile
- `GET /leader-profiles` - Listar com paginação (retorna TODOS por padrão)
- `GET /leader-profiles/simple` - Listagem simplificada
- `GET /leader-profiles/:id` - Buscar por ID
- `GET /leader-profiles/by-shelter/:shelterId` - Buscar por shelter
- `PATCH /leader-profiles/:id/assign-shelter` - Atribuir shelter
- `PATCH /leader-profiles/:id/unassign-shelter` - Desatribuir shelter
- `PATCH /leader-profiles/:id/move-shelter` - Mover shelter

### Relacionamentos
- **ManyToOne** com Shelters (um leader → um ou nenhum shelter)
- **OneToOne** com User

### Filtros
- `leaderSearchString` - Busca por nome, email, telefone
- `shelterSearchString` - Busca por dados do shelter
- `hasShelter` - true/false/undefined (todos)

---

## 👩‍🏫 5. Member Profiles

**Perfis de Professores**

### Arquivos
- [`modules/member-profiles/README.md`](./modules/member-profiles/README.md)
- [`modules/member-profiles/Member_Profiles_API_Collection.postman_collection.json`](./modules/member-profiles/Member_Profiles_API_Collection.postman_collection.json)
- [`modules/member-profiles/MEMBER_PROFILES_COMPLETE_GUIDE.md`](./modules/member-profiles/MEMBER_PROFILES_COMPLETE_GUIDE.md)
- [`modules/member-profiles/MEMBER_PROFILES_INDEX.md`](./modules/member-profiles/MEMBER_PROFILES_INDEX.md)

### Endpoints Principais
- `POST /member-profiles` - Criar profile
- `GET /member-profiles` - Listar com paginação
- `GET /member-profiles/simple` - Listagem simplificada
- `GET /member-profiles/:id` - Buscar por ID
- `PUT /member-profiles/:id` - Atualizar profile

### Features
- ✅ Especializações
- ✅ Vinculação a shelters
- ✅ Filtros consolidados

---

## 👶 6. Sheltered

**Gestão de Abrigados**

### Arquivos
- [`modules/sheltered/README.md`](./modules/sheltered/README.md)
- [`modules/sheltered/Sheltered_API_Collection.postman_collection.json`](./modules/sheltered/Sheltered_API_Collection.postman_collection.json)
- [`modules/sheltered/SHELTERED_COMPLETE_GUIDE.md`](./modules/sheltered/SHELTERED_COMPLETE_GUIDE.md)
- [`modules/sheltered/SHELTERED_INDEX.md`](./modules/sheltered/SHELTERED_INDEX.md)

### Endpoints Principais
- `POST /sheltered` - Criar abrigado
- `GET /sheltered` - Listar com paginação
- `GET /sheltered/simple` - Listagem simplificada
- `GET /sheltered/:id` - Buscar por ID
- `PUT /sheltered/:id` - Atualizar abrigado
- `DELETE /sheltered/:id` - Deletar abrigado

### Features
- ✅ Dados pessoais e responsáveis
- ✅ Validação de gender (M/F)
- ✅ Filtros por idade, gênero, shelter
- ✅ Campos opcionais (guardianName, guardianPhone)

---

## 📝 7. Pagelas

**Sistema de Pagelas (Relatórios)**

### Arquivos
- [`modules/pagelas/README.md`](./modules/pagelas/README.md)
- [`modules/pagelas/Pagelas_API_Collection.postman_collection.json`](./modules/pagelas/Pagelas_API_Collection.postman_collection.json)
- [`modules/pagelas/Pagelas_API_Documentation.md`](./modules/pagelas/Pagelas_API_Documentation.md)
- [`modules/pagelas/REFATORACAO_PAGELAS_COMPLETA.md`](./modules/pagelas/REFATORACAO_PAGELAS_COMPLETA.md)
- [`modules/pagelas/ANALISE_TECNICA_PAGELAS.md`](./modules/pagelas/ANALISE_TECNICA_PAGELAS.md)

### Endpoints Principais
- `POST /pagelas` - Criar pagela
- `GET /pagelas` - Listar com paginação
- `GET /pagelas/simple` - Listagem simplificada
- `GET /pagelas/:id` - Buscar por ID
- `PUT /pagelas/:id` - Atualizar pagela
- `DELETE /pagelas/:id` - Deletar pagela

### Features
- ✅ Vinculação a sheltered e members
- ✅ Filtros por ano, visita, presença
- ✅ Busca avançada
- ✅ Estatísticas

---

## 📖 8. Guias Gerais

Antes dos guias, consulte também o módulo de
[`feature-flags`](./modules/feature-flags/README.md), que documenta o painel,
os públicos e o mapa consumido pelo frontend.

Documentação transversal e guias de automação.

### Arquivos
- [`guides/GMAIL_SMTP_CONFIGURATION.md`](./guides/GMAIL_SMTP_CONFIGURATION.md) - Configuração de envio pelo Gmail SMTP
- [`guides/COLLECTIONS_README.md`](./guides/COLLECTIONS_README.md)
- [`guides/DOCUMENTATION_README.md`](./guides/DOCUMENTATION_README.md)
- [`guides/RESUMO_ATUALIZACAO_COLLECTIONS.md`](./guides/RESUMO_ATUALIZACAO_COLLECTIONS.md)
- [`guides/REFATORACAO_SHELTER_COMPLETA.md`](./guides/REFATORACAO_SHELTER_COMPLETA.md)
- [`guides/RESUMO_AUTOMACAO_SHELTERS.md`](./guides/RESUMO_AUTOMACAO_SHELTERS.md)
- [`guides/RESUMO_AUTOMACAO_USUARIOS.md`](./guides/RESUMO_AUTOMACAO_USUARIOS.md)
- [`guides/RESUMO_LEADERS_CRIADOS.md`](./guides/RESUMO_LEADERS_CRIADOS.md)
- [`guides/perfect-examples.json`](./guides/perfect-examples.json)

---

## 🚀 Quick Start

### 1. Setup Postman

1. Importe o environment global:
   ```
   docs/Orfanatonib_API_Environment.postman_environment.json
   ```

2. Importe as collections desejadas:
   ```
   docs/modules/[módulo]/[Módulo]_API_Collection.postman_collection.json
   ```

### 2. Autenticar

```http
POST /auth/login
{
  "email": "joao@example.com",
  "password": "password123"
}
```

### 3. Executar Automações

```bash
# Leader Profiles
node tests/automations/leader-profiles/leader-profiles-complete-automation.js

# Users
node tests/automations/users/users-complete-automation.js

# Shelters
node tests/automations/shelters/shelters-complete-automation.js

# E assim por diante...
```

---

## 📊 Status Geral

| Módulo | Docs | Collection | Automação | Última Atualização |
|--------|------|------------|-----------|-------------------|
| Auth | ✅ | ✅ | ✅ | 2025-09-27 |
| Users | ✅ | ✅ | ✅ | 2025-09-27 |
| Shelters | ✅ | ✅ | ✅ | 2025-09-30 |
| Leader Profiles | ✅ | ✅ v6.0.0 | ✅ | **2025-10-23** ⭐ |
| Member Profiles | ✅ | ✅ | ✅ | 2025-09-30 |
| Sheltered | ✅ | ✅ | ✅ | 2025-09-27 |
| Pagelas | ✅ | ✅ | ✅ | 2025-09-28 |

---

## 🔄 Últimas Atualizações

### 2025-10-23 - Reorganização Completa
- ✅ Documentação reorganizada por módulos
- ✅ Leader Profiles 100% sincronizado com DTOs
- ✅ Correção: Paginação retorna TODOS os leaders
- ✅ Collection v6.0.0 com 8 exemplos detalhados

### 2025-09-30
- ✅ Shelters com media items
- ✅ Member Profiles refatorado
- ✅ Sheltered com campos opcionais

### 2025-09-27
- ✅ Implementação inicial de todos os módulos
- ✅ Automações completas
- ✅ Collections Postman

---

## 📞 Suporte

Para cada módulo, consulte seu README específico:
- [`modules/[módulo]/README.md`](./modules/)

Para questões gerais:
- [Guias](./guides/)
- [README Principal](./README.md)

---

**Última atualização do índice**: 23 de Outubro de 2025  
**Versão da documentação**: 2.0.0
