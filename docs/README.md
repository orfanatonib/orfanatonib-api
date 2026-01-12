# 📚 Documentação da API Orfanatonib

Documentação completa da API do projeto Orfanatonib, organizada por módulos.

## 📂 Estrutura Simplificada

```
docs/
├── README.md                    # Este arquivo
├── INDEX.md                     # Índice com links
├── CHANGELOG.md                 # Histórico completo
├── Orfanatonib_API_Environment.postman_environment.json
│
├── modules/                     # Cada módulo tem sua pasta
│   ├── auth/
│   ├── users/
│   ├── shelters/
│   ├── leader-profiles/         # ⭐ v6.0.0 - 100% sincronizado
│   ├── member-profiles/
│   ├── sheltered/
│   └── pagelas/
│
└── guides/                      # Guias e referências gerais
```

**📊 Redução**: 43 → 18 arquivos MD (58% menos redundância)

## 🎯 Módulos da API

### 🔐 Auth
**Autenticação e Autorização**
- Login e geração de tokens JWT
- Controle de acesso por roles (admin, leader, member)
- Refresh de tokens

📁 [`modules/auth/`](./modules/auth/)

---

### 👥 Users
**Gestão de Usuários**
- CRUD completo de usuários
- Filtros avançados (role, status, busca)
- Controle de visibilidade (active)
- Estatísticas de usuários

📁 [`modules/users/`](./modules/users/)

---

### 🏠 Shelters
**Gestão de Abrigos**
- CRUD de abrigos
- Gestão de endereços
- Media items (fotos)
- Filtros por localização e staff
- Relacionamentos com leaders e members

📁 [`modules/shelters/`](./modules/shelters/)

---

### 👨‍💼 Leader Profiles
**Perfis de Líderes**
- Criação automática de perfis a partir de users
- Atribuição de shelters (ManyToOne)
- Filtros consolidados (leader, shelter, vinculação)
- Operações de movimentação entre shelters

📁 [`modules/leader-profiles/`](./modules/leader-profiles/)

---

### 👩‍🏫 Member Profiles
**Perfis de Professores**
- CRUD de perfis de professores
- Vinculação a shelters
- Especializações e habilidades
- Filtros avançados

📁 [`modules/member-profiles/`](./modules/member-profiles/)

---

### 👶 Sheltered
**Gestão de Abrigados**
- CRUD de abrigados
- Dados pessoais e responsáveis
- Vinculação a shelters
- Filtros por idade, gênero, shelter
- Validação de gender (M/F)

📁 [`modules/sheltered/`](./modules/sheltered/)

---

### 📝 Pagelas
**Sistema de Pagelas (Relatórios)**
- CRUD de pagelas
- Vinculação a sheltered e members
- Filtros por ano, visita, presença
- Busca avançada
- Estatísticas

📁 [`modules/pagelas/`](./modules/pagelas/)

---

## 📖 Guias Gerais

A pasta [`guides/`](./guides/) contém:
- ✅ Resumos de automações
- ✅ Guias de refatoração
- ✅ Exemplos de uso
- ✅ Boas práticas

## 🔧 Ambiente Postman

Use o arquivo `Orfanatonib_API_Environment.postman_environment.json` para configurar seu ambiente no Postman com:
- `base_url`: URL base da API
- `access_token`: Token JWT após login
- Variáveis específicas de cada módulo

## 🚀 Como Usar

### 1. Importar Collections no Postman

Cada módulo tem sua própria collection Postman:

```
modules/[módulo]/[Módulo]_API_Collection.postman_collection.json
```

### 2. Configurar Ambiente

Importe o environment global:
```
Orfanatonib_API_Environment.postman_environment.json
```

### 3. Fazer Login

Use o endpoint de Auth para obter o token:
```
POST /auth/login
{
  "email": "joao@example.com",
  "password": "password123"
}
```

### 4. Executar Automações

Cada módulo tem automação completa em:
```
tests/automations/[módulo]/[módulo]-complete-automation.js
```

## 📊 Status dos Módulos

| Módulo | Collection | Docs | Automação | Status |
|--------|-----------|------|-----------|--------|
| Auth | ✅ | ✅ | ✅ | 100% |
| Users | ✅ | ✅ | ✅ | 100% |
| Shelters | ✅ | ✅ | ✅ | 100% |
| Leader Profiles | ✅ | ✅ | ✅ | 100% |
| Member Profiles | ✅ | ✅ | ✅ | 100% |
| Sheltered | ✅ | ✅ | ✅ | 100% |
| Pagelas | ✅ | ✅ | ✅ | 100% |

## 🔗 Links Úteis

- [Índice Geral](./INDEX.md)
- [Guias de Automação](./guides/)
- [Repositório GitHub](https://github.com/your-repo)

## 📝 Convenções

### Estrutura de cada Módulo

Cada pasta de módulo contém:

```
modules/[módulo]/
├── README.md                              # Documentação do módulo
├── [Módulo]_API_Collection.postman_collection.json
├── [Módulo]_API_Documentation.md         # Guia completo
├── [Módulo]_API_Environment.postman_environment.json (opcional)
├── results/                               # Resultados de testes
│   └── created-[módulo]-YYYY-MM-DD.json
└── RESUMO_*.md                           # Resumos e guias
```

### Nomenclatura

- **Collections**: `[Módulo]_API_Collection.postman_collection.json`
- **Documentação**: `[Módulo]_API_Documentation.md`
- **Guias**: `[CONTEXTO]_COMPLETE_GUIDE.md`
- **Resumos**: `RESUMO_[ACAO]_[MÓDULO].md`

## 🎓 Para Desenvolvedores

1. **Explorar um módulo**: Acesse `modules/[módulo]/README.md`
2. **Testar endpoints**: Importe a collection e environment no Postman
3. **Executar automações**: `node tests/automations/[módulo]/[módulo]-complete-automation.js`
4. **Atualizar docs**: Mantenha a collection sincronizada com os DTOs

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte o README do módulo específico
2. Verifique os guias em `/guides`
3. Execute as automações para validar o funcionamento

---

**Última atualização**: 23 de Outubro de 2025  
**Versão**: 2.0.0 (Reorganização completa por módulos)
