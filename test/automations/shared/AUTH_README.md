# 🔐 Módulo de Autenticação Centralizado

Este módulo fornece autenticação centralizada para todas as automações do sistema.

## 📋 Credenciais Padrão

```javascript
Email: superuser@orfanatonib.com
Senha: Abc@123
```

## 🚀 Como Usar

### Opção 1: Usando o Módulo Auth Diretamente

```javascript
const { login, getAuthHeaders } = require('./shared/auth');

async function minhaAutomacao() {
  // Login simples
  const token = await login();

  // Usar em requisições
  const axios = require('axios');
  const response = await axios.get('http://localhost:3000/users', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}
```

### Opção 2: Usando o ApiClient (Recomendado)

```javascript
const ApiClient = require('./shared/api-client');

async function minhaAutomacao() {
  const client = new ApiClient();

  // Faz login automaticamente com credenciais padrão
  await client.login();

  // Faz requisições
  const response = await client.get('/users');
  console.log(response.data);
}
```

### Opção 3: Usando a Classe Base AutomationBase

```javascript
const AutomationBase = require('./shared/automation-base');

class MinhaAutomacao extends AutomationBase {
  async run() {
    // Login já foi feito automaticamente no constructor

    // Use this.client para fazer requisições
    const response = await this.client.get('/users');
    console.log(response.data);
  }
}

// Executar
const automation = new MinhaAutomacao('Minha Automação');
automation.execute();
```

## 📚 API do Módulo Auth

### `login(email, password)`
Faz login e retorna o token de autenticação.

```javascript
// Login com credenciais padrão
const token = await login();

// Login com credenciais customizadas
const token = await login('outro@email.com', 'outraSenha');
```

### `getAuthToken()`
Retorna o token em cache (se válido) ou faz novo login.

```javascript
const token = await getAuthToken();
```

### `getAuthHeaders(email, password)`
Retorna headers prontos para uso em requisições HTTP.

```javascript
const headers = await getAuthHeaders();
// { 'Authorization': 'Bearer xxx...', 'Content-Type': 'application/json' }

// Usar com axios
const response = await axios.get(url, { headers });
```

### `clearTokenCache()`
Limpa o cache do token, forçando novo login.

```javascript
clearTokenCache();
```

### `isTokenValid()`
Verifica se o token em cache ainda é válido.

```javascript
if (isTokenValid()) {
  console.log('Token ainda válido!');
}
```

### `testAuth()`
Testa a autenticação fazendo uma requisição ao endpoint `/auth/me`.

```javascript
const user = await testAuth();
console.log(`Autenticado como: ${user.email} (${user.role})`);
```

## 🔄 Cache de Token

O módulo mantém um cache do token de autenticação para evitar múltiplos logins:

- Token é armazenado em memória
- Válido por 23 horas
- Automaticamente renovado quando expira
- Compartilhado entre todas as automações do mesmo processo

## ⚙️ Configuração

As credenciais estão centralizadas em `shared/config.js`:

```javascript
module.exports = {
  BASE_URL: process.env.API_URL || 'http://localhost:3000',

  ADMIN_CREDENTIALS: {
    email: 'superuser@orfanatonib.com',
    password: 'Abc@123'
  },

  // ... outras configurações
};
```

## 🔒 Segurança

- **NÃO** commitar credenciais em produção
- Use variáveis de ambiente quando apropriado
- Troque as senhas padrão em produção
- Mantenha os tokens seguros

## 📝 Exemplos Completos

### Exemplo 1: Automação Simples

```javascript
const { login } = require('./shared/auth');
const axios = require('axios');
const config = require('./shared/config');

async function listarUsuarios() {
  // Faz login
  const token = await login();

  // Busca usuários
  const response = await axios.get(`${config.BASE_URL}/users`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log(`Total de usuários: ${response.data.length}`);
}

listarUsuarios();
```

### Exemplo 2: Usando ApiClient

```javascript
const ApiClient = require('./shared/api-client');

async function criarUsuario() {
  const client = new ApiClient();
  await client.login();

  const novoUsuario = {
    name: 'João Silva',
    email: 'joao@example.com',
    password: 'senha123',
    role: 'teacher'
  };

  const response = await client.post('/users', novoUsuario);

  if (response) {
    console.log('✅ Usuário criado:', response.data);
  }
}

criarUsuario();
```

### Exemplo 3: Classe Base

```javascript
const AutomationBase = require('./shared/automation-base');

class CriarUsuariosAutomation extends AutomationBase {
  async run() {
    this.log('Criando usuários...');

    for (let i = 0; i < 10; i++) {
      const usuario = {
        name: `Usuario ${i}`,
        email: `usuario${i}@example.com`,
        password: 'senha123',
        role: 'teacher'
      };

      const response = await this.client.post('/users', usuario);
      if (response) {
        this.success(`Usuário ${i} criado`);
      }
    }
  }
}

const automation = new CriarUsuariosAutomation('Criar Usuários');
automation.execute();
```

## 🐛 Troubleshooting

### Token inválido ou expirado
```javascript
const { clearTokenCache, login } = require('./shared/auth');

// Força novo login
clearTokenCache();
const token = await login();
```

### Credenciais incorretas
Verifique o arquivo `shared/config.js` e certifique-se que as credenciais estão corretas.

### Erro de conexão
Verifique se a API está rodando em `http://localhost:3000` ou configure `BASE_URL` no config.

## 📖 Mais Informações

- Ver `shared/config.js` para todas as configurações
- Ver `shared/api-client.js` para cliente HTTP completo
- Ver `shared/automation-base.js` para classe base de automações
