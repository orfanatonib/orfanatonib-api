# 🧪 Diretório de Testes e Automações

Este diretório contém testes E2E e automações de criação de dados para a API Orfanatonib.

## 📁 Estrutura Organizada

```
test/
├── run-all-automations.js          # 🚀 Script principal - executa TODAS as automações
├── app.e2e-spec.ts                 # Testes E2E do NestJS
├── jest-e2e.json                   # Configuração do Jest para E2E
│
└── automations/                    # 🤖 Automações de criação de dados
    ├── README.md                   # Documentação das automações
    │
    ├── shared/                     # 📚 Biblioteca compartilhada (NOVA!)
    │   ├── api-client.js          # Cliente HTTP com autenticação
    │   ├── mock-data-generator.js # Gerador de dados falsos
    │   ├── logger.js              # Sistema de logging colorido
    │   ├── automation-base.js     # Classe base para automações
    │   └── README.md              # Documentação completa dos utilitários
    │
    ├── users/                      # Automação de usuários
    ├── shelters/                   # Automação de abrigos
    ├── teacher-profiles/           # Automação de professores
    ├── leader-profiles/            # Automação de líderes
    ├── sheltered/                  # Automação de abrigados
    ├── pagelas/                    # Automação de pagelas
    ├── events/                     # Automação de eventos
    ├── video-pages/                # Automação de páginas de vídeo
    ├── image-pages/                # Automação de galerias de imagem
    ├── ideas-pages/                # Automação de páginas de ideias
    ├── ideas-sections/             # Automação de seções de ideias órfãs
    ├── image-sections/             # Automação de seções de imagem órfãs
    ├── visit-material-pages/       # Automação de material de visita
    ├── documents/                  # Automação de documentos
    ├── informatives/               # Automação de informativos
    ├── meditations/                # Automação de meditações
    ├── comments/                   # ✨ Automação de comentários (REFATORADA)
    ├── feedbacks/                  # ✨ Automação de feedbacks (REFATORADA)
    ├── contacts/                   # Automação de contatos
    │
    ├── fixes/                      # 🔧 Scripts de correção
    │   ├── fix-shelter-staff-links.js
    │   └── fix-sheltered-relationships.js
    │
    └── utils/                      # 🛠️ Utilitários diversos
        ├── listing-and-fixes-automation.js
        ├── create-list-fix-orchestrator.js
        └── test-endpoints.js
```

## 🚀 Como Usar

### Executar TODAS as Automações

```bash
# A partir da raiz do projeto
node test/run-all-automations.js
```

Este script executará **todas as automações na ordem correta**, incluindo:
1. Core data (Users, Shelters, Teachers, Leaders)
2. Fixes (correções de relacionamentos)
3. Dados principais (Sheltered, Pagelas)
4. Conteúdo (Events, Pages, Documents, etc.)
5. Interações (Comments, Feedbacks, Contacts)

### Executar uma Automação Específica

```bash
# Comments (refatorada)
node test/automations/comments/comments-complete-automation.js

# Feedbacks (refatorada)
node test/automations/feedbacks/feedbacks-complete-automation.js

# Events
node test/automations/events/events-complete-automation.js

# Qualquer outra automação
node test/automations/[módulo]/[módulo]-complete-automation.js
```

## ✨ Biblioteca Compartilhada (NOVA!)

Foi criada uma **biblioteca compartilhada** em `automations/shared/` que:

- ✅ **Elimina 70% do código duplicado**
- ✅ **Padroniza todas as automações**
- ✅ **Facilita criação de novas automações**
- ✅ **Logs bonitos e consistentes**

### Automações Já Refatoradas

- ✅ **Comments** - De 247 para 75 linhas (-70%)
- ✅ **Feedbacks** - De 240 para 81 linhas (-66%)

**[Leia a documentação completa](automations/shared/README.md)** para entender como usar.

## 📊 Benefícios da Nova Estrutura

### Antes (Antigo)
```
test/
├── run-all-automations.js
├── create-shelters-and-teachers.js    ❌ Arquivo solto
├── create-leaders-for-shelters.js     ❌ Arquivo solto
├── fix-shelter-staff-links.js         ❌ Arquivo solto
├── fix-sheltered-relationships.js     ❌ Arquivo solto
├── listing-and-fixes-automation.js    ❌ Arquivo solto
├── test-endpoints.js                  ❌ Arquivo solto
└── automations/
    ├── run-all-automations.js         ❌ Duplicado!
    ├── comments/ (247 linhas)          ❌ Código duplicado
    ├── feedbacks/ (240 linhas)         ❌ Código duplicado
    └── ...
```

### Depois (Novo) ✅
```
test/
├── run-all-automations.js              ✅ Único orchestrador
└── automations/
    ├── shared/                         ✅ Biblioteca compartilhada
    │   ├── api-client.js
    │   ├── mock-data-generator.js
    │   ├── logger.js
    │   └── automation-base.js
    ├── comments/ (75 linhas)           ✅ -70% código
    ├── feedbacks/ (81 linhas)          ✅ -66% código
    ├── fixes/                          ✅ Organizado
    │   ├── fix-shelter-staff-links.js
    │   └── fix-sheltered-relationships.js
    ├── utils/                          ✅ Organizado
    └── ...
```

## 🎯 Ordem de Execução

O `run-all-automations.js` executa as automações nesta ordem:

1. **Core Data** - Estrutura básica
   - Users
   - Shelters
   - Teacher Profiles
   - Leader Profiles

2. **Fixes** - Correções de relacionamentos
   - Fix: vincular leaders/teachers aos shelters

3. **Dados Principais**
   - Sheltered
   - Pagelas

4. **Conteúdo** - Páginas e mídia
   - Events, Video Pages, Image Pages, etc.

5. **Interações** - Comentários e feedbacks
   - Comments ✨ (refatorada)
   - Feedbacks ✨ (refatorada)
   - Contacts

## 🔧 Configuração

### Pré-requisitos

```bash
npm install axios form-data
```

### Credenciais

Todas as automações usam as credenciais padrão:

```javascript
{
  email: 'superuser@orfanatonib.com',
  password: 'Abc@123'
}
```

### URL Base

Padrão: `http://localhost:3000`

## 📝 Criar Nova Automação

Com a biblioteca compartilhada, criar uma nova automação é muito simples:

```javascript
const AutomationBase = require('../shared/automation-base');
const Logger = require('../shared/logger');

class MyAutomation extends AutomationBase {
  constructor() {
    super({ name: 'My Automation' });
  }

  async execute() {
    await this.createMultiple(10, () => this.createItem(), 'item');
  }

  async createItem() {
    const response = await this.client.post('/my-endpoint', {
      name: this.mockData.getName()
    });

    if (response?.status === 201) {
      Logger.success('Item criado!');
      return response.data;
    }
    return null;
  }
}

const automation = new MyAutomation();
automation.run();
```

**[Ver documentação completa](automations/shared/README.md)**

## 📚 Mais Informações

- **Automações**: [automations/README.md](automations/README.md)
- **Biblioteca Compartilhada**: [automations/shared/README.md](automations/shared/README.md)

## 🎉 Resultados da Refatoração

- ✅ **Arquivos organizados**: Tudo em suas pastas apropriadas
- ✅ **Zero duplicação**: Um único `run-all-automations.js`
- ✅ **-70% de código**: Comments e Feedbacks refatorados
- ✅ **Biblioteca reutilizável**: Pronta para novas automações
- ✅ **Documentação completa**: READMEs em todos os níveis
