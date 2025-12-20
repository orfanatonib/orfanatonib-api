# Automações de Criação de Conteúdo

Este diretório contém scripts de automação para criar dados em massa para todos os módulos de páginas da aplicação.

## 📋 Módulos Disponíveis

### 1. **Events** (`events/`)
- Cria eventos com título, data, localização, descrição e imagem
- Endpoint: `POST /events`
- Quantidade padrão: 15 eventos

### 2. **Video Pages** (`video-pages/`)
- Cria páginas de vídeos com título, descrição e múltiplos vídeos
- Endpoint: `POST /video-pages`
- Quantidade padrão: 10 páginas (3-7 vídeos cada)

### 3. **Image Pages** (`image-pages/`)
- Cria galerias de imagens com seções e múltiplas imagens
- Endpoint: `POST /image-pages`
- Quantidade padrão: 10 galerias (2-4 seções, 2-5 imagens por seção)

### 4. **Ideas Pages** (`ideas-pages/`)
- Cria páginas de ideias com seções e múltiplos tipos de mídia (vídeos, documentos, imagens)
- Endpoint: `POST /ideas-pages`
- Quantidade padrão: 10 páginas (2-4 seções, 2-5 mídias por seção)

### 5. **Visit Material Pages** (`visit-material-pages/`)
- Cria páginas de materiais de visita com vídeos, documentos, imagens e áudios
- Endpoint: `POST /visit-material-pages`
- Quantidade padrão: 30 páginas (alternando entre Antigo e Novo Testamento)

### 6. **Ideas Sections Órfãs** (`ideas-sections/`)
- Cria seções de ideias sem página pai (órfãs)
- Endpoint: `POST /ideas-sections`
- Quantidade padrão: 15 seções (2-5 mídias cada)

### 7. **Image Sections Órfãs** (`image-sections/`)
- Cria seções de imagens sem página pai (órfãs)
- Endpoint: `POST /image-sections`
- Quantidade padrão: 15 seções (2-6 imagens cada)

### 8. **Comments** (`comments/`)
- Cria comentários com nome, comentário, shelter e bairro
- Endpoint: `POST /comments`
- Quantidade padrão: 20 comentários

### 9. **Contacts** (`contacts/`)
- Cria mensagens de contato com nome, email, telefone e mensagem
- Endpoint: `POST /contact`
- Quantidade padrão: 15 contatos
- **Nota**: Não requer autenticação para criar

### 10. **Documents** (`documents/`)
- Cria documentos com nome, descrição e arquivo PDF
- Endpoint: `POST /documents`
- Quantidade padrão: 15 documentos

### 11. **Feedbacks** (`feedbacks/`)
- Cria feedbacks do site com nome, email, rating, comentário e categoria
- Endpoint: `POST /site-feedbacks`
- Quantidade padrão: 20 feedbacks

### 12. **Informatives** (`informatives/`)
- Cria banners informativos com título, descrição e visibilidade
- Endpoint: `POST /informatives`
- Quantidade padrão: 15 informativos

### 13. **Meditations** (`meditations/`)
- Cria meditações semanais com tópico, datas, imagem e 5 dias (segunda a sexta)
- Endpoint: `POST /meditations`
- Quantidade padrão: 10 meditações

## 🚀 Como Usar

### Executar uma automação específica:

```bash
# Events
node test/automations/events/events-complete-automation.js

# Video Pages
node test/automations/video-pages/video-pages-complete-automation.js

# Image Pages
node test/automations/image-pages/image-pages-complete-automation.js

# Ideas Pages
node test/automations/ideas-pages/ideas-pages-complete-automation.js

# Visit Material Pages
node test/automations/visit-material-pages/visit-material-pages-complete-automation.js

# Ideas Sections Órfãs
node test/automations/ideas-sections/ideas-sections-orphan-automation.js

# Image Sections Órfãs
node test/automations/image-sections/image-sections-orphan-automation.js

# Comments
node test/automations/comments/comments-complete-automation.js

# Contacts
node test/automations/contacts/contacts-complete-automation.js

# Documents
node test/automations/documents/documents-complete-automation.js

# Feedbacks
node test/automations/feedbacks/feedbacks-complete-automation.js

# Informatives
node test/automations/informatives/informatives-complete-automation.js

# Meditations
node test/automations/meditations/meditations-complete-automation.js

# Pagelas (Criação em Massa) ⭐ NOVO
node test/automations/pagelas/pagelas-mass-creation.js
```

### Executar todas as automações:

```bash
node test/automations/run-all-automations.js
```

## ⚙️ Configuração

### Credenciais de Admin

Todas as automações usam as mesmas credenciais padrão:

```javascript
const ADMIN_CREDENTIALS = {
  email: 'superuser@orfanatonib.com',
  password: 'Abc@123'
};
```

Para alterar, edite a constante `ADMIN_CREDENTIALS` em cada script.

### URL Base

A URL base padrão é `http://localhost:3000`. Para alterar, edite a constante `BASE_URL` em cada script.

## 📝 Características

### Links Reais e Funcionais

Todas as automações usam links reais e funcionais para mídias:

- **Vídeos**: Links do YouTube (vídeos públicos)
- **Documentos**: Links de PDFs públicos de teste
- **Imagens**: Links do Unsplash (imagens públicas e gratuitas)
- **Áudios**: Links de arquivos MP3 públicos de teste

### Dados Realistas

Os scripts geram dados realistas e variados:
- Títulos e descrições contextualizadas
- Datas futuras para eventos
- Mistura de conteúdo público e privado
- Quantidades variadas de mídias por página

## 🔧 Estrutura dos Scripts

Cada script segue a mesma estrutura:

1. **Utilitários**: Funções de login e requisições HTTP
2. **Dados Mockados**: Arrays com títulos, descrições, URLs, etc.
3. **Função de Criação**: Cria um item individual
4. **Função de Criação em Massa**: Cria múltiplos itens
5. **Testes**: Testa listagem e busca por ID
6. **Função Principal**: Orquestra todo o processo

## 📊 Logs e Feedback

Todos os scripts fornecem feedback detalhado:
- ✅ Sucessos
- ❌ Erros
- 📊 Estatísticas
- 🧪 Resultados dos testes

## ⚠️ Observações

1. **Delay entre requisições**: Cada script inclui um delay de 500ms entre criações para não sobrecarregar o servidor
2. **Autenticação**: Todos os scripts fazem login automaticamente antes de criar conteúdo
3. **Validação**: Os dados são validados antes de serem enviados
4. **Tratamento de Erros**: Erros são capturados e exibidos sem interromper a execução

## 🎯 Exemplo de Saída

```
🚀 Iniciando automação de Events...

🔐 Fazendo login como admin...
✅ Login realizado com sucesso!

📅 Criando 15 eventos...

  ✅ Evento criado: "Culto de Adoração" - 2025-01-15
  ✅ Evento criado: "Estudo Bíblico" - 2025-01-20
  ...

✅ Criação concluída:
  ✅ Sucesso: 15
  ❌ Erros: 0
  📊 Total criado: 15

🧪 Executando testes...

📋 Testando listagem de todos os eventos...
  ✅ 15 eventos encontrados
  ...
```

## 📦 Dependências

As automações requerem:
- `axios`: Para requisições HTTP
- `form-data`: Para envio de form-data (arquivos)

Instale com:
```bash
npm install axios form-data
```
