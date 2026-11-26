# 🏠 Orfanato API - Documentação Completa

## 📋 Visão Geral

API REST desenvolvida com NestJS para gerenciar um sistema completo de orfanato, incluindo usuários, abrigos, crianças abrigadas, perfis de líderes e membros, além de páginas de conteúdo (eventos, vídeos, imagens, ideias, materiais de visita, meditações, etc.).

## 🏗️ Arquitetura

### Módulos Principais

#### 🔐 Autenticação e Usuários
- **Auth** - Autenticação JWT, login, refresh tokens
- **Users** - Gerenciamento de usuários, roles, permissões

#### 🏠 Gestão de Abrigos
- **Shelters** - Gerenciamento de abrigos, equipes, endereços
- **Sheltered** - Crianças abrigadas, dados pessoais, responsáveis
- **Leader Profiles** - Perfis de líderes/coordenadores
- **Member Profiles** - Perfis de membros
- **Pagelas** - Sistema de relatórios e visitas

#### 📄 Páginas de Conteúdo
- **Events** - Eventos e atividades
- **Video Pages** - Páginas de vídeos
- **Image Pages** - Galerias de imagens
- **Ideas Pages** - Páginas de ideias com seções
- **Visit Material Pages** - Materiais de visita bíblicos
- **Meditations** - Meditações semanais
- **Comments** - Comentários
- **Contacts** - Mensagens de contato
- **Documents** - Documentos
- **Feedbacks** - Feedback do site
- **Informatives** - Banners informativos

## 📁 Estrutura do Projeto

```
orfanatonib-api/
├── 📚 docs/                    # Documentação completa
│   ├── modules/                # Documentação por módulo
│   │   ├── auth/
│   │   ├── users/
│   │   ├── shelters/
│   │   ├── sheltered/
│   │   ├── leader-profiles/
│   │   ├── member-profiles/
│   │   └── pagelas/
│   ├── guides/                 # Guias gerais
│   ├── MODULO_*.md            # Guias completos para frontend
│   ├── INDEX.md               # Índice geral
│   └── CHANGELOG.md           # Histórico de mudanças
├── 🧪 test/                    # Scripts de teste e automação
│   ├── automations/            # Automações de criação de dados
│   │   ├── events/
│   │   ├── video-pages/
│   │   ├── image-pages/
│   │   ├── ideas-pages/
│   │   ├── visit-material-pages/
│   │   ├── meditations/
│   │   ├── comments/
│   │   ├── contacts/
│   │   ├── documents/
│   │   ├── feedbacks/
│   │   ├── informatives/
│   │   ├── users/
│   │   ├── shelters/
│   │   ├── sheltered/
│   │   ├── leader-profiles/
│   │   ├── member-profiles/
│   │   └── pagelas/
│   └── run-all-automations.js  # Script master para todas as automações
└── src/                        # Código fonte da aplicação
```

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 18+
- MySQL/MariaDB
- npm ou yarn

### Instalação
```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp env/local.env.example env/local.env
# Edite env/local.env com suas credenciais

# Executar migrações
npm run migration:run

# Iniciar aplicação
npm run start:dev
```

### Credenciais de Teste (Admin)
```json
{
  "email": "superuser@orfanatonib.com",
  "password": "Abc@123"
}
```

## 📖 Documentação

### 📚 Documentação Completa
- **[Índice Geral](docs/INDEX.md)** - Índice completo de toda a documentação
- **[README Principal](docs/README.md)** - Documentação detalhada por módulos
- **[Changelog](docs/CHANGELOG.md)** - Histórico de mudanças

### 🎯 Guias para Frontend
- **[Módulo Abrigo](docs/MODULO_ABRIGO.md)** - Guia completo de abrigos, equipes, líderes e membros
- **[Módulo Líder](docs/MODULO_LIDER.md)** - Guia completo de perfis de líderes
- **[Módulo Membro](docs/MODULO_MEMBRO.md)** - Guia completo de perfis de membros
- **[Módulo Materiais de Visita](docs/MODULO_MATERIAIS_VISITA.md)** - Guia de materiais bíblicos

### 📦 Documentação por Módulo
Cada módulo tem sua própria documentação em `docs/modules/[módulo]/`:
- **[Auth](docs/modules/auth/README.md)** - Autenticação JWT
- **[Users](docs/modules/users/README.md)** - Gerenciamento de usuários
- **[Shelters](docs/modules/shelters/README.md)** - Gerenciamento de abrigos
- **[Sheltered](docs/modules/sheltered/README.md)** - Crianças abrigadas
- **[Leader Profiles](docs/modules/leader-profiles/README.md)** - Perfis de líderes
- **[Member Profiles](docs/modules/member-profiles/README.md)** - Perfis de membros
- **[Pagelas](docs/modules/pagelas/README.md)** - Sistema de relatórios

## 🧪 Testes e Automações

### Executar Testes
```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e
```

### Automações de Criação de Dados

O projeto inclui scripts de automação para criar dados em massa para todos os módulos:

```bash
# Executar todas as automações
node test/automations/run-all-automations.js

# Executar automação específica
node test/automations/events/events-complete-automation.js
node test/automations/video-pages/video-pages-complete-automation.js
node test/automations/image-pages/image-pages-complete-automation.js
node test/automations/ideas-pages/ideas-pages-complete-automation.js
node test/automations/visit-material-pages/visit-material-pages-complete-automation.js
node test/automations/meditations/meditations-complete-automation.js
# ... e mais 7 automações
```

**📚 Documentação completa:** [test/automations/README.md](test/automations/README.md)

### Módulos com Automação
- ✅ Events (15 eventos)
- ✅ Video Pages (10 páginas)
- ✅ Image Pages (10 galerias)
- ✅ Ideas Pages (10 páginas)
- ✅ Visit Material Pages (30 páginas)
- ✅ Ideas Sections Órfãs (15 seções)
- ✅ Image Sections Órfãs (15 seções)
- ✅ Comments (20 comentários)
- ✅ Contacts (15 contatos)
- ✅ Documents (15 documentos)
- ✅ Feedbacks (20 feedbacks)
- ✅ Informatives (15 informativos)
- ✅ Meditations (10 meditações)
- ✅ Users, Shelters, Sheltered, Leaders, Members, Pagelas

## 📊 Postman Collections

Todas as collections estão disponíveis em `docs/modules/[módulo]/`:

- `Auth_API_Collection.postman_collection.json`
- `Users_API_Collection.postman_collection.json`
- `Shelters_API_Collection.postman_collection.json`
- `Sheltered_API_Collection.postman_collection.json`
- `Leader_Profiles_API_Collection.postman_collection.json`
- `Member_Profiles_API_Collection.postman_collection.json`
- `Pagelas_API_Collection.postman_collection.json`

### Ambiente Postman
Use o arquivo `docs/Orfanatonib_API_Environment.postman_environment.json` para configurar as variáveis de ambiente.

**📚 Guia completo:** [docs/README.md](docs/README.md)

## 🔧 Tecnologias Utilizadas

- **Backend:** NestJS, TypeScript
- **Database:** MySQL/MariaDB, TypeORM
- **Auth:** JWT, Passport
- **Validation:** class-validator, class-transformer
- **File Storage:** AWS S3
- **Email:** Gmail SMTP (Nodemailer)
- **Testing:** Jest, Supertest
- **Documentation:** Postman Collections, Markdown

## 📝 Convenções

### Roles de Usuário
- `admin` - Acesso total ao sistema
- `coordinator` (leader) - Gerencia abrigos e membros
- `member` - Acesso limitado aos seus dados

### Padrões de API
- RESTful endpoints
- Paginação padrão: `page=1&limit=12` (varia por módulo)
- Filtros por query parameters
- Respostas padronizadas com status codes HTTP
- Suporte a JSON e Form-Data (para uploads)

### Estrutura de Relacionamentos
```
User → Leader/Member Profile → Team → Shelter
Sheltered → Shelter (direto)
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para dúvidas ou suporte:
1. Consulte a [documentação completa](docs/README.md)
2. Verifique o [índice geral](docs/INDEX.md)
3. Entre em contato através dos issues do GitHub

## 🔗 Links Úteis

- [Documentação Completa](docs/README.md)
- [Índice Geral](docs/INDEX.md)
- [Changelog](docs/CHANGELOG.md)
- [Automações](test/automations/README.md)

---

**Desenvolvido com ❤️ para o sistema de orfanato**

**Última atualização:** Dezembro 2025
