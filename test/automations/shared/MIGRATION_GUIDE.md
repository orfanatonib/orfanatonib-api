# 🔄 Guia de Migração para ApiClient

Este guia mostra como converter automações antigas que usam `axios` diretamente para usar o `ApiClient` centralizado.

## ⚠️ Por que migrar?

- ✅ Credenciais centralizadas
- ✅ Cache de token automático
- ✅ Menos código duplicado
- ✅ Mais fácil de manter
- ✅ Tratamento de erros padronizado

## 📋 Checklist de Conversão

Para cada arquivo de automação:

- [ ] Substituir `const axios` por `const ApiClient`
- [ ] Remover `let authToken = ''`
- [ ] Remover função `login()` customizada
- [ ] Adicionar `const client = new ApiClient()` e `await client.login()`
- [ ] Substituir todas as chamadas `axios.*` por `client.*`
- [ ] Remover headers de autenticação manuais
- [ ] Testar a automação

## 🔀 Conversão Passo a Passo

### ANTES (❌ Padrão Antigo)

```javascript
const axios = require('axios');
const config = require('../shared/config');

const BASE_URL = config.BASE_URL;
const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;

let authToken = '';

// ==================== UTILITÁRIOS ====================

async function login() {
  try {
    console.log('🔐 Fazendo login como admin...');
    const response = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);

    if (response.status === 201) {
      authToken = response.data.accessToken;
      console.log('✅ Login realizado com sucesso!');
      return true;
    }
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    return false;
  }
}

async function makeRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response;
  } catch (error) {
    console.error(`❌ Erro na requisição ${method} ${url}:`, error.response?.data || error.message);
    return null;
  }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function main() {
  console.log('🎯 AUTOMAÇÃO - MÓDULO EXEMPLO');
  console.log('═'.repeat(50));

  // Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Falha no login');
    return;
  }

  // Buscar dados
  const response = await makeRequest('GET', '/users');
  if (response) {
    console.log(`✅ ${response.data.length} usuários encontrados`);
  }

  // Criar dados
  const createResponse = await makeRequest('POST', '/users', {
    name: 'Novo Usuário',
    email: 'novo@example.com'
  });
}

main();
```

### DEPOIS (✅ Padrão Novo com ApiClient)

```javascript
const ApiClient = require('../shared/api-client');

// ==================== FUNÇÃO PRINCIPAL ====================

async function main() {
  console.log('🎯 AUTOMAÇÃO - MÓDULO EXEMPLO');
  console.log('═'.repeat(50));

  // Criar client e fazer login
  const client = new ApiClient();
  await client.login();

  // Buscar dados
  const response = await client.get('/users');
  if (response) {
    console.log(`✅ ${response.data.length} usuários encontrados`);
  }

  // Criar dados
  const createResponse = await client.post('/users', {
    name: 'Novo Usuário',
    email: 'novo@example.com'
  });
}

main();
```

## 🔧 Substituições Detalhadas

### 1. Imports

```javascript
// ❌ ANTES
const axios = require('axios');
const config = require('../shared/config');
const BASE_URL = config.BASE_URL;
const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;

// ✅ DEPOIS
const ApiClient = require('../shared/api-client');
```

### 2. Variáveis Globais

```javascript
// ❌ ANTES
let authToken = '';
let testData = {};

// ✅ DEPOIS
let testData = {};
// (não precisa mais de authToken!)
```

### 3. Função de Login

```javascript
// ❌ ANTES
async function login() {
  const response = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
  authToken = response.data.accessToken;
  // ... tratamento de erros
}

// ✅ DEPOIS
// Não precisa mais! O ApiClient faz isso automaticamente
```

### 4. Requisições HTTP

```javascript
// ❌ ANTES
const response = await axios.get(`${BASE_URL}/users`, {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});

// ✅ DEPOIS
const response = await client.get('/users');
```

```javascript
// ❌ ANTES
const response = await axios.post(`${BASE_URL}/users`, userData, {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});

// ✅ DEPOIS
const response = await client.post('/users', userData);
```

### 5. Inicialização na Função Main

```javascript
// ❌ ANTES
async function main() {
  const loginSuccess = await login();
  if (!loginSuccess) return;

  // ... resto do código
}

// ✅ DEPOIS
async function main() {
  const client = new ApiClient();
  await client.login();

  // ... resto do código (substituir axios por client)
}
```

## 📝 Template Completo

Use este template como base para suas automações:

```javascript
const ApiClient = require('../shared/api-client');

/**
 * Automação: [NOME DA AUTOMAÇÃO]
 * Descrição: [DESCRIÇÃO]
 */

async function main() {
  console.log('🎯 AUTOMAÇÃO - [NOME]');
  console.log('═'.repeat(60));

  // Inicializar cliente e fazer login
  const client = new ApiClient();
  await client.login();

  try {
    // Seu código aqui
    const response = await client.get('/endpoint');

    console.log('\n✅ Automação concluída com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro na automação:', error.message);
    process.exit(1);
  }
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error.message);
  process.exit(1);
});
```

## 🧪 Como Testar

Após converter um arquivo:

```bash
# Testar automação individual
node test/automations/users/users-complete-automation.js

# Testar todas as automações
node test/run-all-automations.js
```

## ⚡ Conversão Rápida com Regex

Se preferir usar buscar e substituir:

1. **Substituir import:**
   - Buscar: `const axios = require\('axios'\);`
   - Substituir: `const ApiClient = require('../shared/api-client');`

2. **Remover authToken:**
   - Buscar: `let authToken = '';?\n?`
   - Substituir: (vazio)

3. **Remover função login:** (manual - cada arquivo é diferente)

4. **Substituir chamadas:**
   - Buscar: `axios\.get\(`
   - Substituir: `client.get(`

   (Repetir para post, put, patch, delete)

## ❓ FAQ

### E se minha automação usa credenciais customizadas?

```javascript
const client = new ApiClient();
await client.login({
  email: 'outro@email.com',
  password: 'outraSenha'
});
```

### E se eu preciso de timeout customizado?

```javascript
const response = await client.get('/endpoint', {
  timeout: 60000 // 60 segundos
});
```

### E se eu preciso enviar FormData?

```javascript
const FormData = require('form-data');
const formData = new FormData();
formData.append('file', fileBuffer, 'filename.jpg');

const response = await client.makeMultipartRequest('POST', '/upload', formData);
```

## 📚 Recursos Adicionais

- Ver: `test/automations/shared/auth.js` - Módulo de autenticação
- Ver: `test/automations/shared/api-client.js` - Cliente HTTP completo
- Ver: `test/automations/shared/AUTH_README.md` - Documentação completa
- Ver: `test/automations/comments/comments-complete-automation.js` - Exemplo já convertido

## ✅ Arquivos Já Convertidos (Exemplos)

- ✅ `feedbacks/feedbacks-complete-automation.js`
- ✅ `comments/comments-complete-automation.js`
- ✅ `profiles/profiles-bulk-create-automation.js`

Use estes como referência!
