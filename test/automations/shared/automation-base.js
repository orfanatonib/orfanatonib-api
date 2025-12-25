const ApiClient = require('./api-client');
const MockDataGenerator = require('./mock-data-generator');
const Logger = require('./logger');

/**
 * Classe base para automações
 * Fornece estrutura comum e métodos auxiliares
 */
class AutomationBase {
  constructor(config = {}) {
    this.name = config.name || 'Automation';
    this.client = new ApiClient(config.baseUrl);
    this.mockData = new MockDataGenerator();
    this.results = [];
  }

  /**
   * Executa a automação completa
   */
  async run() {
    Logger.header(`🚀 Iniciando: ${this.name}`);

    const startTime = Date.now();

    try {
      // Login
      const loginSuccess = await this.client.login();
      if (!loginSuccess) {
        Logger.error('Falha no login. Abortando automação.');
        process.exit(1);
      }

      // Executar a lógica principal
      await this.execute();

      // Resumo
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      Logger.summary(`Resumo: ${this.name}`, this.results);
      Logger.success(`Automação concluída em ${duration}s`);

      process.exit(0);
    } catch (error) {
      Logger.error(`Erro fatal: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
  }

  /**
   * Método a ser sobrescrito pelas classes filhas
   */
  async execute() {
    throw new Error('Método execute() deve ser implementado pela classe filha');
  }

  /**
   * Cria múltiplos itens usando uma função de criação
   */
  async createMultiple(count, createFn, itemName = 'item') {
    Logger.section(`📝 Criando ${count} ${itemName}(s)...`);

    for (let i = 0; i < count; i++) {
      Logger.progress(i + 1, count, itemName);

      const result = await createFn(i);

      if (result) {
        this.results.push({ success: true, data: result });
      } else {
        this.results.push({ success: false, index: i });
      }

      // Delay para não sobrecarregar
      await this.delay(100);
    }

    const successful = this.results.filter(r => r.success).length;
    Logger.info(`${successful}/${count} ${itemName}(s) criado(s) com sucesso`);
  }

  /**
   * Delay em milissegundos
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Testa CRUD completo de um recurso
   */
  async testCrud(endpoint, createData, updateData, itemName = 'item') {
    const results = {
      create: false,
      read: false,
      update: false,
      delete: false,
      createdId: null
    };

    try {
      // CREATE
      Logger.section(`📝 Testando CREATE de ${itemName}...`);
      const createResponse = await this.client.post(endpoint, createData);
      if (createResponse && (createResponse.status === 201 || createResponse.status === 200)) {
        results.create = true;
        results.createdId = createResponse.data.id;
        Logger.success(`${itemName} criado: ${results.createdId}`);
      } else {
        Logger.error(`Falha ao criar ${itemName}`);
        return results;
      }

      // READ
      Logger.section(`📖 Testando READ de ${itemName}...`);
      const readResponse = await this.client.get(`${endpoint}/${results.createdId}`);
      if (readResponse && readResponse.status === 200) {
        results.read = true;
        Logger.success(`${itemName} lido com sucesso`);
      } else {
        Logger.error(`Falha ao ler ${itemName}`);
      }

      // UPDATE
      if (updateData) {
        Logger.section(`✏️  Testando UPDATE de ${itemName}...`);
        const updateResponse = await this.client.put(`${endpoint}/${results.createdId}`, updateData);
        if (updateResponse && updateResponse.status === 200) {
          results.update = true;
          Logger.success(`${itemName} atualizado com sucesso`);
        } else {
          Logger.error(`Falha ao atualizar ${itemName}`);
        }
      }

      // DELETE
      Logger.section(`🗑️  Testando DELETE de ${itemName}...`);
      const deleteResponse = await this.client.delete(`${endpoint}/${results.createdId}`);
      if (deleteResponse && (deleteResponse.status === 200 || deleteResponse.status === 204)) {
        results.delete = true;
        Logger.success(`${itemName} deletado com sucesso`);
      } else {
        Logger.error(`Falha ao deletar ${itemName}`);
      }

    } catch (error) {
      Logger.error(`Erro durante teste CRUD: ${error.message}`);
    }

    return results;
  }
}

module.exports = AutomationBase;
