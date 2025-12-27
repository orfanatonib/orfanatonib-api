# 🚀 Biblioteca Compartilhada de Automações

Esta pasta contém utilitários reutilizáveis para criar automações de teste e criação de dados de forma simplificada e padronizada.

## 📁 Arquivos

### `config.js`
Configuração centralizada para todas as automações:
- URL base da API
- Credenciais de admin
- Timeouts e delays
- Limites de criação

**Credenciais atuais:**
```javascript
{
  email: 'superuser@orfanatonib.com',
  password: 'Edu@27032016'
}
```

**Exemplo de uso:**
```javascript
const config = require('../shared/config');

console.log(config.BASE_URL); // http://localhost:3000
console.log(config.ADMIN_CREDENTIALS); // { email: '...', password: '...' }
```

### `api-client.js`
Cliente HTTP centralizado que gerencia:
- Autenticação automática
- Requisições HTTP (GET, POST, PUT, PATCH, DELETE)
- Upload de arquivos (multipart/form-data)
- Download de imagens
- Busca de dados de teste (users, shelters, etc.)

**Exemplo de uso:**
```javascript
const ApiClient = require('../shared/api-client');

const client = new ApiClient();
await client.login();

// Métodos HTTP
const response = await client.get('/comments');
const created = await client.post('/comments', { name: 'Teste', ... });
await client.put('/comments/id', { name: 'Atualizado' });
await client.delete('/comments/id');

// Buscar dados para testes
const testData = await client.getTestData();
console.log(testData.users, testData.shelters);
```

### `mock-data-generator.js`
Gerador de dados falsos padronizados:
- Nomes, emails, telefones
- Shelters, neighborhoods, locations
- Títulos de eventos, descrições
- Comentários, feedbacks
- URLs de imagens do Unsplash
- Datas aleatórias (passado/futuro)

**Exemplo de uso:**
```javascript
const MockDataGenerator = require('../shared/mock-data-generator');

const mock = new MockDataGenerator();

const commentData = {
  name: mock.getName(),
  comment: mock.getComment(),
  shelter: mock.getShelter(),
  neighborhood: mock.getNeighborhood()
};

const rating = mock.getRating(); // 1-5
const date = mock.getRandomFutureDate(30); // próximos 30 dias
const email = mock.generateUniqueEmail('test'); // test_timestamp_random@test.com
```

### `logger.js`
Sistema de logging com cores e formatação:
- Mensagens coloridas (success, error, warning, info)
- Headers e seções formatadas
- Barra de progresso
- Resumo de resultados

**Exemplo de uso:**
```javascript
const Logger = require('../shared/logger');

Logger.header('Iniciando Automação');
Logger.success('Item criado com sucesso!');
Logger.error('Falha ao criar item');
Logger.warning('Atenção: dados podem estar incompletos');
Logger.info('Processando...');
Logger.section('Criando comentários');
Logger.progress(5, 10, 'comentários');
Logger.summary('Resumo Final', results);
```

### `automation-base.js`
Classe base para criar automações rapidamente:
- Estrutura padronizada
- Login automático
- Métodos auxiliares (createMultiple, testCrud, delay)
- Geração automática de resumos

**Exemplo de uso:**
```javascript
const AutomationBase = require('../shared/automation-base');
const Logger = require('../shared/logger');

class MyAutomation extends AutomationBase {
  constructor() {
    super({ name: 'My Automation' });
    this.itemCount = 20;
  }

  async execute() {
    // Criar múltiplos itens
    await this.createMultiple(
      this.itemCount,
      (i) => this.createItem(),
      'item'
    );

    // Testar CRUD completo
    const crudResults = await this.testCrud(
      '/items',
      { name: 'Test' },
      { name: 'Updated' },
      'item'
    );
  }

  async createItem() {
    const data = {
      name: this.mockData.getName(),
      description: this.mockData.getDescription()
    };

    const response = await this.client.post('/items', data);
    if (response && response.status === 201) {
      Logger.success(`Item criado: ${data.name}`);
      return response.data;
    }
    return null;
  }
}

// Executar
const automation = new MyAutomation();
automation.run();
```

## 🎯 Como Criar uma Nova Automação

### 1. Crie um novo arquivo na pasta do módulo

```bash
test/automations/my-module/my-module-complete-automation.js
```

### 2. Use o template básico

```javascript
const AutomationBase = require('../shared/automation-base');
const Logger = require('../shared/logger');

class MyModuleAutomation extends AutomationBase {
  constructor() {
    super({ name: 'My Module Automation' });
  }

  async execute() {
    // Sua lógica aqui
    await this.createMultiple(10, () => this.createItem(), 'item');
  }

  async createItem() {
    // Lógica de criação
    const response = await this.client.post('/my-endpoint', {
      name: this.mockData.getName()
    });

    if (response?.status === 201) {
      Logger.success('Item criado');
      return response.data;
    }
    return null;
  }
}

const automation = new MyModuleAutomation();
automation.run();
```

### 3. Execute a automação

```bash
node test/automations/my-module/my-module-complete-automation.js
```

## 🔧 Propriedades Disponíveis

Dentro da classe que herda `AutomationBase`, você tem acesso a:

- `this.client` - ApiClient configurado e autenticado
- `this.mockData` - MockDataGenerator para gerar dados falsos
- `this.results` - Array para armazenar resultados

## 📊 Métodos Úteis

### `createMultiple(count, createFn, itemName)`
Cria múltiplos itens em loop:
```javascript
await this.createMultiple(20, () => this.createComment(), 'comentário');
```

### `testCrud(endpoint, createData, updateData, itemName)`
Testa CRUD completo (Create, Read, Update, Delete):
```javascript
const results = await this.testCrud(
  '/comments',
  { name: 'Test', comment: 'Test comment' },
  { name: 'Updated' },
  'comentário'
);
```

### `delay(ms)`
Aguarda X milissegundos:
```javascript
await this.delay(1000); // 1 segundo
```

## 🎨 Benefícios da Refatoração

✅ **Menos Código Duplicado**: Utilitários compartilhados
✅ **Mais Legível**: Código limpo e organizado
✅ **Fácil Manutenção**: Mudanças em um só lugar
✅ **Padronização**: Todas automações seguem o mesmo padrão
✅ **Logs Bonitos**: Sistema de logging consistente
✅ **Rápido Desenvolvimento**: Template pronto para novas automações

## 📝 Exemplo Completo

Veja as automações refatoradas como exemplo:
- [comments-complete-automation.js](../comments/comments-complete-automation.js)
- [feedbacks-complete-automation.js](../feedbacks/feedbacks-complete-automation.js)

## 🚀 Próximos Passos

Para refatorar uma automação existente:

1. Leia o arquivo atual para entender a lógica
2. Identifique o que pode ser substituído pelos utilitários
3. Crie uma classe que herda `AutomationBase`
4. Implemente o método `execute()`
5. Teste a automação
6. Delete o código antigo comentado

Para criar uma nova automação:

1. Use o template acima
2. Implemente apenas a lógica específica do módulo
3. Aproveite todos os utilitários compartilhados
