/**
 * Gerador de dados mockados reutilizável
 * Centraliza todos os dados falsos usados nas automações
 */

class MockDataGenerator {
  constructor() {
    this.names = [
      'Maria Silva', 'João Santos', 'Ana Costa', 'Pedro Oliveira',
      'Carla Ferreira', 'Lucas Almeida', 'Juliana Souza', 'Rafael Lima',
      'Fernanda Rocha', 'Bruno Martins', 'Patricia Gomes', 'Ricardo Dias',
      'Camila Araújo', 'Thiago Ribeiro', 'Larissa Barbosa', 'Felipe Cardoso',
      'Mariana Mendes', 'Gabriel Pinto', 'Amanda Ramos', 'Diego Correia'
    ];

    this.emails = [
      'maria.silva@email.com', 'joao.santos@email.com', 'ana.costa@email.com',
      'pedro.oliveira@email.com', 'carla.ferreira@email.com', 'lucas.almeida@email.com',
      'juliana.souza@email.com', 'rafael.lima@email.com', 'fernanda.rocha@email.com',
      'bruno.martins@email.com'
    ];

    this.shelters = [
      'Clube do Amor', 'Clube da Fé', 'Clube da Esperança',
      'Clube da Alegria', 'Clube da Paz', 'Clube da União',
      'Clube da Amizade', 'Clube da Caridade', 'Clube da Gratidão',
      'Clube da Harmonia'
    ];

    this.neighborhoods = [
      'Centro', 'Jardim das Flores', 'Vila Nova', 'Bairro São José',
      'Parque das Águas', 'Alto da Boa Vista', 'Vila Esperança',
      'Bairro Novo', 'Jardim Primavera', 'Vila São Pedro'
    ];

    this.locations = [
      'Templo Principal', 'Salão de Eventos', 'Auditório',
      'Sala de Reuniões', 'Pátio Externo', 'Capela',
      'Sala de Jovens', 'Sala de Crianças', 'Online - Zoom',
      'Online - YouTube'
    ];

    this.eventTitles = [
      'Culto de Adoração', 'Estudo Bíblico', 'Oração e Intercessão',
      'Reunião de Jovens', 'Escola Bíblica Dominical', 'Culto de Celebração',
      'Reunião de Oração', 'Encontro de Casais', 'Culto de Missões',
      'Reunião de Líderes', 'Culto de Avivamento', 'Reunião de Crianças',
      'Culto de Gratidão', 'Reunião de Adolescentes', 'Culto de Consagração'
    ];

    this.descriptions = [
      'Venha participar deste momento especial de adoração e comunhão.',
      'Estudo aprofundado da Palavra de Deus com aplicações práticas.',
      'Momento de oração e intercessão pela igreja e pela nação.',
      'Encontro especial para jovens com música, palavra e comunhão.',
      'Aulas bíblicas para todas as idades com material didático.',
      'Celebração especial com testemunhos e ministração da Palavra.',
      'Reunião dedicada à oração e busca pela presença de Deus.',
      'Encontro para casais com ministração específica.',
      'Culto especial focado em missões e evangelismo.',
      'Reunião de líderes para planejamento e edificação.'
    ];

    this.comments = [
      'Excelente trabalho! Muito edificante.',
      'Adorei o conteúdo, muito inspirador.',
      'Parabéns pela dedicação e carinho.',
      'Muito bom, continue assim!',
      'Gratidão por compartilhar isso conosco.',
      'Mensagem muito tocante e verdadeira.',
      'Que bênção poder participar disso!',
      'Conteúdo de qualidade, obrigado!',
      'Muito edificante para minha vida.',
      'Deus abençoe todo o trabalho!'
    ];

    this.feedbackComments = [
      'O site está muito bom, mas poderia ter mais conteúdo.',
      'Gostei muito da interface, muito intuitiva.',
      'Encontrei um bug na página de login.',
      'Seria interessante ter uma versão mobile melhor.',
      'Adorei o design, muito moderno e limpo.',
      'O site está lento em alguns momentos.',
      'Falta uma funcionalidade de busca.',
      'Sugestão: adicionar mais imagens.',
      'O conteúdo está excelente, parabéns!',
      'O site está muito bom, continue assim!'
    ];

    this.feedbackCategories = [
      'content', 'appearance', 'usability', 'broken_feature',
      'missing_feature', 'performance', 'mobile_experience',
      'suggestion', 'complaint', 'other'
    ];

    // URLs reais de imagens do Unsplash
    this.imageUrls = [
      'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&q=80',
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80',
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80',
      'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
      'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
      'https://images.unsplash.com/photo-1509824227185-9c5a01ceba0d?w=800&q=80'
    ];
  }

  /**
   * Retorna elemento aleatório de um array
   */
  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Retorna múltiplos elementos aleatórios de um array
   */
  getRandomElements(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Gera um número aleatório entre min e max (inclusive)
   */
  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Gera uma data aleatória futura
   */
  getRandomFutureDate(daysFromNow = 30) {
    const today = new Date();
    const randomDays = Math.floor(Math.random() * daysFromNow);
    const eventDate = new Date(today);
    eventDate.setDate(today.getDate() + randomDays);
    eventDate.setHours(19, 0, 0, 0);
    return eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Gera uma data aleatória passada
   */
  getRandomPastDate(daysAgo = 30) {
    const today = new Date();
    const randomDays = Math.floor(Math.random() * daysAgo);
    const eventDate = new Date(today);
    eventDate.setDate(today.getDate() - randomDays);
    return eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Gera email único baseado em timestamp
   */
  generateUniqueEmail(baseName = 'user') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${baseName}_${timestamp}_${random}@test.com`;
  }

  /**
   * Gera telefone brasileiro aleatório
   */
  generatePhone() {
    const ddd = this.getRandomInt(11, 99);
    const prefix = this.getRandomInt(90000, 99999);
    const suffix = this.getRandomInt(1000, 9999);
    return `${ddd}${prefix}${suffix}`;
  }

  // Métodos de acesso rápido
  getName() { return this.getRandomElement(this.names); }
  getEmail() { return this.getRandomElement(this.emails); }
  getShelter() { return this.getRandomElement(this.shelters); }
  getNeighborhood() { return this.getRandomElement(this.neighborhoods); }
  getLocation() { return this.getRandomElement(this.locations); }
  getEventTitle() { return this.getRandomElement(this.eventTitles); }
  getDescription() { return this.getRandomElement(this.descriptions); }
  getComment() { return this.getRandomElement(this.comments); }
  getFeedbackComment() { return this.getRandomElement(this.feedbackComments); }
  getFeedbackCategory() { return this.getRandomElement(this.feedbackCategories); }
  getImageUrl() { return this.getRandomElement(this.imageUrls); }
  getRating() { return this.getRandomInt(1, 5); }
}

module.exports = MockDataGenerator;
