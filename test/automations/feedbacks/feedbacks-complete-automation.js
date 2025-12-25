const AutomationBase = require('../shared/automation-base');
const Logger = require('../shared/logger');

/**
 * Automação completa de Feedbacks
 * Cria múltiplos feedbacks e testa listagens
 */
class FeedbacksAutomation extends AutomationBase {
  constructor() {
    super({ name: 'Feedbacks Automation' });
    this.feedbacksCount = 20;
  }

  async execute() {
    // Criar feedbacks
    await this.createMultiple(
      this.feedbacksCount,
      (i) => this.createFeedback(),
      'feedback'
    );

    // Testes de listagem
    await this.testListings();
  }

  /**
   * Cria um feedback com dados aleatórios
   */
  async createFeedback() {
    const feedbackData = {
      name: this.mockData.getName(),
      email: this.mockData.getEmail(),
      rating: this.mockData.getRating(),
      comment: this.mockData.getFeedbackComment(),
      category: this.mockData.getFeedbackCategory()
    };

    const response = await this.client.post('/site-feedbacks', feedbackData);

    if (response && (response.status === 201 || response.status === 200)) {
      Logger.success(`Feedback criado: "${feedbackData.name}" - Rating: ${feedbackData.rating}/5 - ${feedbackData.category}`);
      return response.data;
    } else {
      Logger.warning(`Erro ao criar feedback: "${feedbackData.name}"`);
      return null;
    }
  }

  /**
   * Testa as diferentes listagens de feedbacks
   */
  async testListings() {
    Logger.section('🧪 Testando listagens de feedbacks');

    // Listar todos
    const allResponse = await this.client.get('/site-feedbacks');
    if (allResponse && allResponse.status === 200) {
      const total = allResponse.data.items?.length || allResponse.data.length || 0;
      Logger.success(`${total} feedbacks encontrados`);
    } else {
      Logger.error('Falha ao listar feedbacks');
    }

    // Estatísticas por categoria (se disponível)
    const categories = ['content', 'appearance', 'usability', 'suggestion'];
    for (const category of categories) {
      const response = await this.client.get(`/site-feedbacks?category=${category}`, { silent: true });
      if (response && response.status === 200) {
        const count = response.data.items?.length || response.data.length || 0;
        if (count > 0) {
          Logger.info(`Categoria "${category}": ${count} feedbacks`);
        }
      }
    }
  }
}

// Executar automação
const automation = new FeedbacksAutomation();
automation.run();
