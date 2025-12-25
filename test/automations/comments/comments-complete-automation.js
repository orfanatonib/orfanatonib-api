const AutomationBase = require('../shared/automation-base');
const Logger = require('../shared/logger');

/**
 * Automação completa de Comments
 * Cria múltiplos comentários e testa listagens
 */
class CommentsAutomation extends AutomationBase {
  constructor() {
    super({ name: 'Comments Automation' });
    this.commentsCount = 20;
  }

  async execute() {
    // Criar comentários
    await this.createMultiple(
      this.commentsCount,
      (i) => this.createComment(),
      'comentário'
    );

    // Testes de listagem
    await this.testListings();
  }

  /**
   * Cria um comentário com dados aleatórios
   */
  async createComment() {
    const commentData = {
      name: this.mockData.getName(),
      comment: this.mockData.getComment(),
      shelter: this.mockData.getShelter(),
      neighborhood: this.mockData.getNeighborhood()
    };

    const response = await this.client.post('/comments', commentData);

    if (response && response.status === 201) {
      Logger.success(`Comentário criado: "${commentData.name}" - ${commentData.shelter}`);
      return response.data;
    } else {
      Logger.warning(`Erro ao criar comentário: "${commentData.name}"`);
      return null;
    }
  }

  /**
   * Testa as diferentes listagens de comentários
   */
  async testListings() {
    Logger.section('🧪 Testando listagens de comentários');

    // Listar todos
    const allResponse = await this.client.get('/comments');
    if (allResponse && allResponse.status === 200) {
      Logger.success(`${allResponse.data.length} comentários encontrados (todos)`);
    } else {
      Logger.error('Falha ao listar todos os comentários');
    }

    // Listar publicados
    const publishedResponse = await this.client.get('/comments/published');
    if (publishedResponse && publishedResponse.status === 200) {
      Logger.success(`${publishedResponse.data.length} comentários publicados encontrados`);
    } else {
      Logger.error('Falha ao listar comentários publicados');
    }
  }
}

// Executar automação
const automation = new CommentsAutomation();
automation.run();
