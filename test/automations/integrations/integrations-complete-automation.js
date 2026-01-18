const AutomationBase = require('../shared/automation-base');
const Logger = require('../shared/logger');
const FormData = require('form-data');

class IntegrationsAutomation extends AutomationBase {
  constructor() {
    super({
      name: 'Integrações',
      baseUrl: process.env.API_URL || 'http://localhost:3000'
    });

    this.results = [];

    // Dados mockados específicos para integrações (expandidos)
    this.integrationNames = [
      // Nomes comuns brasileiros
      'Maria Silva', 'João Santos', 'Ana Costa', 'Pedro Oliveira',
      'Carla Ferreira', 'Lucas Almeida', 'Juliana Souza', 'Rafael Lima',
      'Fernanda Rocha', 'Bruno Martins', 'Patricia Gomes', 'Ricardo Dias',
      'Camila Araújo', 'Thiago Ribeiro', 'Larissa Barbosa', 'Felipe Cardoso',
      'Mariana Mendes', 'Gabriel Pinto', 'Amanda Ramos', 'Diego Correia',
      'Cristina Nunes', 'Roberto Castro', 'Beatriz Lima', 'André Carvalho',
      'Sofia Mendes', 'Vinícius Santos', 'Isabella Costa', 'Leonardo Oliveira',
      'Luana Ferreira', 'Matheus Almeida', 'Valentina Souza', 'Eduardo Lima',
      'Gabriela Rodrigues', 'Lucas Pereira', 'Amanda Silva', 'Matheus Costa',
      'Julia Oliveira', 'Gabriel Ferreira', 'Larissa Almeida', 'Pedro Souza',
      'Beatriz Lima', 'João Pereira', 'Mariana Costa', 'Lucas Oliveira',
      'Ana Ferreira', 'Pedro Almeida', 'Carla Souza', 'Rafael Lima',
      'Fernanda Pereira', 'Bruno Costa', 'Patricia Oliveira', 'Ricardo Ferreira',
      'Camila Almeida', 'Thiago Souza', 'Larissa Pereira', 'Felipe Costa',
      'Mariana Oliveira', 'Gabriel Ferreira', 'Amanda Almeida', 'Diego Souza',
      'Cristina Pereira', 'Roberto Costa', 'Beatriz Oliveira', 'André Ferreira',
      'Sofia Almeida', 'Vinícius Souza', 'Isabella Pereira', 'Leonardo Costa',
      'Luana Oliveira', 'Matheus Ferreira', 'Valentina Almeida', 'Eduardo Souza',
      'Gabriela Pereira', 'Lucas Costa', 'Amanda Oliveira', 'Matheus Ferreira',
      'Julia Almeida', 'Gabriel Souza', 'Larissa Pereira', 'Pedro Costa',
      'Beatriz Oliveira', 'João Ferreira', 'Mariana Almeida', 'Lucas Souza',
      'Ana Pereira', 'Pedro Costa', 'Carla Oliveira', 'Rafael Ferreira',
      'Fernanda Almeida', 'Bruno Souza', 'Patricia Pereira', 'Ricardo Costa',
      'Camila Oliveira', 'Thiago Ferreira', 'Larissa Almeida', 'Felipe Souza',
      'Mariana Pereira', 'Gabriel Costa', 'Amanda Oliveira', 'Diego Ferreira',
      'Cristina Almeida', 'Roberto Souza', 'Beatriz Pereira', 'André Costa',
      'Sofia Oliveira', 'Vinícius Ferreira', 'Isabella Almeida', 'Leonardo Souza',
      'Luana Pereira', 'Matheus Costa', 'Valentina Oliveira', 'Eduardo Ferreira',
      'Gabriela Almeida', 'Lucas Souza', 'Amanda Pereira', 'Matheus Costa',
      'Julia Oliveira', 'Gabriel Ferreira', 'Larissa Almeida', 'Pedro Souza',
      'Beatriz Pereira', 'João Costa', 'Mariana Oliveira', 'Lucas Ferreira',
      'Ana Almeida', 'Pedro Souza', 'Carla Pereira', 'Rafael Costa',
      'Fernanda Oliveira', 'Bruno Ferreira', 'Patricia Almeida', 'Ricardo Souza',
      'Camila Pereira', 'Thiago Costa', 'Larissa Oliveira', 'Felipe Ferreira',
      'Mariana Almeida', 'Gabriel Souza', 'Amanda Pereira', 'Diego Costa',
      'Cristina Oliveira', 'Roberto Ferreira', 'Beatriz Almeida', 'André Souza',
      'Sofia Pereira', 'Vinícius Costa', 'Isabella Oliveira', 'Leonardo Ferreira',
      'Luana Almeida', 'Matheus Souza', 'Valentina Pereira', 'Eduardo Costa',
      'Gabriela Oliveira', 'Lucas Ferreira', 'Amanda Almeida', 'Matheus Souza',
      'Julia Pereira', 'Gabriel Costa', 'Larissa Oliveira', 'Pedro Ferreira',
      'Beatriz Almeida', 'João Souza', 'Mariana Pereira', 'Lucas Costa',
      'Ana Oliveira', 'Pedro Ferreira', 'Carla Almeida', 'Rafael Souza',
      'Fernanda Pereira', 'Bruno Costa', 'Patricia Oliveira', 'Ricardo Ferreira',
      'Camila Almeida', 'Thiago Souza', 'Larissa Pereira', 'Felipe Costa',
      'Mariana Oliveira', 'Gabriel Ferreira', 'Amanda Almeida', 'Diego Souza',
      'Cristina Pereira', 'Roberto Costa', 'Beatriz Oliveira', 'André Ferreira',
      'Sofia Almeida', 'Vinícius Souza', 'Isabella Pereira', 'Leonardo Costa',
      'Luana Oliveira', 'Matheus Ferreira', 'Valentina Almeida', 'Eduardo Souza',
      'Gabriela Pereira', 'Lucas Costa', 'Amanda Oliveira', 'Matheus Ferreira',
      'Julia Almeida', 'Gabriel Souza', 'Larissa Pereira', 'Pedro Costa'
    ];

    this.gaLeaders = [
      // Líderes GA diversificados
      'Pastor João', 'Pastora Maria', 'Pr. Roberto', 'Pr. Carlos',
      'Pastora Ana', 'Pr. Fernando', 'Pastora Lúcia', 'Pr. Marcos',
      'Pastora Sofia', 'Pr. André', 'Pastora Beatriz', 'Pr. Vinícius',
      'Pastora Isabella', 'Pr. Leonardo', 'Pastora Luana', 'Pr. Matheus',
      'Pastor Gabriel', 'Pastora Julia', 'Pr. Rafael', 'Pr. Amanda',
      'Pastora Pedro', 'Pr. Carla', 'Pastora Lucas', 'Pr. Juliana',
      'Pastor Rafael', 'Pastora Fernanda', 'Pr. Bruno', 'Pr. Patricia',
      'Pastora Ricardo', 'Pr. Camila', 'Pastora Thiago', 'Pr. Larissa',
      'Pastor Felipe', 'Pastora Mariana', 'Pr. Diego', 'Pr. Cristina',
      'Pastora Roberto', 'Pr. Beatriz', 'Pastora André', 'Pr. Sofia',
      'Pastor Vinícius', 'Pastora Isabella', 'Pr. Leonardo', 'Pr. Luana',
      'Pastora Matheus', 'Pr. Valentina', 'Pastor Eduardo', 'Pr. Gabriela',
      'Pastora Lucas', 'Pr. Amanda', 'Pastora Matheus', 'Pr. Julia',
      'Pastor Gabriel', 'Pastora Larissa', 'Pr. Pedro', 'Pr. Beatriz',
      'Pastora João', 'Pr. Mariana', 'Pastora Lucas', 'Pr. Ana',
      'Pastor Pedro', 'Pastora Carla', 'Pr. Rafael', 'Pr. Fernanda',
      'Pastora Bruno', 'Pr. Patricia', 'Pastora Ricardo', 'Pr. Camila',
      'Pastor Thiago', 'Pastora Larissa', 'Pr. Felipe', 'Pr. Mariana',
      'Pastora Diego', 'Pr. Cristina', 'Pastora Roberto', 'Pr. Beatriz',
      'Pastor André', 'Pastora Sofia', 'Pr. Vinícius', 'Pr. Isabella',
      'Pastora Leonardo', 'Pr. Luana', 'Pastora Matheus', 'Pr. Valentina',
      'Pastor Eduardo', 'Pastora Gabriela', 'Pr. Lucas', 'Pr. Amanda',
      'Pastora Matheus', 'Pr. Julia', 'Pastora Gabriel', 'Pr. Larissa',
      'Pastor Pedro', 'Pastora Beatriz', 'Pr. João', 'Pr. Mariana',
      'Pastora Lucas', 'Pr. Ana', 'Pastor Pedro', 'Pr. Carla'
    ];

    this.previousMinistries = [
      // Ministérios eclesiásticos diversificados
      'Música', 'Jovens', 'Crianças', 'Adolescentes', 'Casais',
      'Missões', 'Ensino', 'Comunicação', 'Administração', 'Diáconos',
      'Evangelismo', 'Pregação', 'Louvor', 'Tecnologia', 'Artes', 'Esportes',
      'Teatro', 'Dança', 'Fotografia', 'Vídeo', 'Som', 'Iluminação',
      'Intercessão', 'Cura Interior', 'Libertação', 'Profecia', 'Milagres',
      'Ensino Bíblico', 'Estudos Proféticos', 'História da Igreja', 'Teologia',
      'Aconselhamento', 'Psicologia Cristã', 'Orientação Familiar', 'Casamento',
      'Direito Canônico', 'Ética Cristã', 'Filosofia Cristã', 'Apologética',
      'Missões Urbanas', 'Missões Rurais', 'Missões Internacionais', 'Cruzadas',
      'Discipulado', 'Mentoria', 'Liderança', 'Administração Eclesiástica',
      'Finanças', 'Contabilidade', 'Jurídico', 'Recursos Humanos',
      'Comunicação Social', 'Marketing Digital', 'Redes Sociais', 'Jornalismo',
      'Educação Cristã', 'Escola Dominical', 'Ensino Superior', 'Pesquisa',
      'Música Gospel', 'Coral', 'Banda', 'Worship', 'Adoração', 'Cânticos',
      'Teatro Cristão', 'Dança Litúrgica', 'Artes Visuais', 'Pintura', 'Escultura',
      'Literatura Cristã', 'Escrita', 'Poesia', 'Música Sacra', 'Órgão',
      'Piano', 'Violão', 'Bateria', 'Percussão', 'Saxofone', 'Trompete',
      'Esportes Cristãos', 'Futebol', 'Basquete', 'Vôlei', 'Natação',
      'Atletismo', 'Artes Marciais', 'Yoga Cristão', 'Meditação', 'Contemplação',
      'Retiro Espiritual', 'Jejum', 'Orações', 'Vigílias', 'Cultos',
      'Celebrações', 'Festas Cristãs', 'Natal', 'Páscoa', 'Pentecostes',
      'Trabalho Social', 'Assistência Social', 'Caridade', 'Solidariedade',
      'Abrigo', 'Albergue', 'Refeitório', 'Banco de Alimentos', 'Doações',
      'Voluntariado', 'Serviço Comunitário', 'Ação Social', 'ONG Cristã'
    ];

    this.imageUrls = [
      // URLs de perfis diversos do Unsplash
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=400',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
      'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
      'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=400',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400',
      'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=400',
      'https://images.unsplash.com/photo-1541101767792-f9b2b1c4f127?w=400',
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
      'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=400',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
      'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=400',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400'
    ];
  }

  /**
   * Gera dados mockados para uma integração
   */
  generateIntegrationData(index = 0) {
    const name = this.integrationNames[index % this.integrationNames.length] || this.mockData.getName();
    const timestamp = Date.now() + index;

    // Gerar dados aleatórios baseados nos campos do DTO
    const integrationData = {
      name: `${name} ${timestamp}`, // Garantir unicidade
      phone: this.mockData.generatePhone(),
      gaLeader: this.mockData.getRandomElement(this.gaLeaders),
      baptized: Math.random() > 0.2, // 80% de chance de ser batizado (mais realista)
      churchYears: this.mockData.getRandomInt(1, 60), // 1-60 anos na igreja (mais abrangente)
      previousMinistry: this.mockData.getRandomElement(this.previousMinistries),
      integrationYear: new Date().getFullYear() - this.mockData.getRandomInt(0, 15), // Últimos 15 anos
    };

    // Adicionar múltiplas imagens opcionalmente (60% das vezes para mais dados)
    if (Math.random() > 0.4) {
      const numImages = Math.floor(Math.random() * 3) + 1; // 1-3 imagens
      integrationData.images = [];

      for (let i = 0; i < numImages; i++) {
        const mediaTypes = ['profile', 'document', 'certificate'];
        const selectedType = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];

        integrationData.images.push({
          title: selectedType === 'profile' ? `Foto de ${name} ${i + 1}` :
                 selectedType === 'document' ? `Documento de ${name} ${i + 1}` :
                 `Certificado de ${name} ${i + 1}`,
          description: selectedType === 'profile' ? `Foto de perfil de ${name}` :
                       selectedType === 'document' ? `Documento pessoal de ${name}` :
                       `Certificado de participação de ${name}`,
          url: this.mockData.getRandomElement(this.imageUrls),
          isLocalFile: false
        });
      }
    }

    return integrationData;
  }

  /**
   * Cria uma integração individual
   */
  async createIntegration(index = 0) {
    const integrationData = this.generateIntegrationData(index);

    try {
      // Criar FormData para envio multipart
      const form = new FormData();
      form.append('integrationData', JSON.stringify(integrationData));

      const response = await this.client.makeMultipartRequest('POST', '/integrations', form);

      if (response && response.status === 201) {
        Logger.success(`Integração criada: ${integrationData.name}`);
        return response.data;
      } else {
        Logger.error(`Falha ao criar integração: ${integrationData.name}`);
        return null;
      }
    } catch (error) {
      Logger.error(`Erro ao criar integração: ${error.message}`);
      return null;
    }
  }

  /**
   * Cria múltiplas integrações em massa
   */
  async createIntegrationsInBulk(count = 200) {
    Logger.section(`📝 Criando ${count} integrações em massa...`);

    await this.createMultiple(count, async (index) => {
      const result = await this.createIntegration(index);
      if (result) {
        this.results.push(result);
      }
      return result;
    }, 'integração');
  }

  /**
   * Testa CRUD básico das integrações (usando multipart)
   */
  async testCrud() {
    Logger.section('🧪 Testando CRUD de Integrações...');

    const results = {
      create: false,
      read: false,
      update: false,
      delete: false,
      createdId: null
    };

    try {
      // Dados para teste
      const testData = this.generateIntegrationData(9999); // Usar índice alto para evitar conflitos
      const updateData = {
        ...testData,
        name: `${testData.name} - Atualizado`,
        churchYears: testData.churchYears + 1
      };

      // CREATE
      Logger.section('📝 Testando CREATE de Integração...');
      const createForm = new FormData();
      createForm.append('integrationData', JSON.stringify(testData));

      const createResponse = await this.client.makeMultipartRequest('POST', '/integrations', createForm);
      if (createResponse && createResponse.status === 201) {
        results.create = true;
        results.createdId = createResponse.data.id;
        Logger.success(`Integração criada: ${results.createdId}`);
      } else {
        Logger.error('Falha ao criar Integração');
        return results;
      }

      // READ
      Logger.section('📖 Testando READ de Integração...');
      const readResponse = await this.client.get(`/integrations/${results.createdId}`);
      if (readResponse && readResponse.status === 200) {
        results.read = true;
        Logger.success('Integração lida com sucesso');
      } else {
        Logger.error('Falha ao ler Integração');
      }

      // UPDATE
      Logger.section('✏️  Testando UPDATE de Integração...');
      const updateForm = new FormData();
      updateForm.append('integrationData', JSON.stringify(updateData));

      const updateResponse = await this.client.makeMultipartRequest('PUT', `/integrations/${results.createdId}`, updateForm);
      if (updateResponse && updateResponse.status === 200) {
        results.update = true;
        Logger.success('Integração atualizada com sucesso');
      } else {
        Logger.error('Falha ao atualizar Integração');
      }

      // DELETE
      Logger.section('🗑️  Testando DELETE de Integração...');
      const deleteResponse = await this.client.delete(`/integrations/${results.createdId}`);
      if (deleteResponse && (deleteResponse.status === 200 || deleteResponse.status === 204)) {
        results.delete = true;
        Logger.success('Integração deletada com sucesso');
      } else {
        Logger.error('Falha ao deletar Integração');
      }

    } catch (error) {
      Logger.error(`Erro durante teste CRUD: ${error.message}`);
    }

    if (results.create && results.read && results.update && results.delete) {
      Logger.success('✅ CRUD completo funcionando');
    } else {
      Logger.warning('⚠️  Alguns testes de CRUD falharam');
    }

    return results;
  }

  /**
   * Testa validações das integrações
   */
  async testValidations() {
    Logger.section('🧪 Testando Validações de Integrações...');

    // Teste 1: Dados válidos (já testado no CRUD)
    Logger.info('✅ Dados válidos já testados no CRUD');

    // Teste 2: Campo obrigatório faltando
    try {
      // Tentar fazer uma requisição POST sem o campo integrationData
      const response = await this.client.makeMultipartRequest('POST', '/integrations', new FormData());
      if (response && response.status === 400) {
        Logger.success('✅ Validação de campo obrigatório funcionando');
      } else {
        Logger.warning('⚠️  Validação de campo obrigatório pode não estar funcionando');
      }
    } catch (error) {
      Logger.success('✅ Validação de campo obrigatório funcionando (erro esperado)');
    }
  }

  /**
   * Testa listagens e filtros
   */
  async testListings() {
    Logger.section('🧪 Testando Listagens de Integrações...');

    try {
      // Listagem simples
      const simpleResponse = await this.client.get('/integrations/simple');
      if (simpleResponse && simpleResponse.status === 200) {
        Logger.success(`✅ Listagem simples: ${simpleResponse.data.length} integrações`);
      }

      // Listagem paginada
      const paginatedResponse = await this.client.get('/integrations?page=1&limit=10');
      if (paginatedResponse && paginatedResponse.status === 200) {
        const { data, total } = paginatedResponse.data;
        Logger.success(`✅ Listagem paginada: ${data?.length || 0} itens, total: ${total || 0}`);
      }

    } catch (error) {
      Logger.error(`Erro durante testes de listagem: ${error.message}`);
    }
  }

  /**
   * Executa toda a automação
   */
  async execute() {
    // Criar integrações em massa
    await this.createIntegrationsInBulk(200);

    // Executar testes
    await this.testCrud();
    await this.testValidations();
    await this.testListings();

    Logger.success('🎉 Automação de Integrações concluída!');
  }
}

// Permitir quantidade customizada via argumento de linha de comando
const customCount = process.argv[2] ? parseInt(process.argv[2]) : null;

// Executar automação
const automation = new IntegrationsAutomation();
if (customCount && customCount > 0) {
  // Sobrescrever método para usar quantidade customizada
  const originalExecute = automation.execute;
  automation.execute = async function() {
    Logger.section(`📝 Criando ${customCount} integrações em massa (customizado)...`);
    await this.createMultiple(customCount, async (index) => {
      return await this.createIntegration(index);
    }, 'integração');

    // Executar testes normalmente
    await this.testCrud();
    await this.testValidations();
    await this.testListings();

    Logger.success('🎉 Automação de Integrações concluída!');
  };
}
automation.run();
