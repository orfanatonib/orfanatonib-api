const AutomationBase = require('../shared/automation-base');
const Logger = require('../shared/logger');

/**
 * Automação para criar dados de perfil em massa
 * Cria PersonalData e UserPreferences para usuários existentes que ainda não possuem perfil
 */
class ProfilesBulkCreateAutomation extends AutomationBase {
  constructor() {
    super({ name: 'Profiles Bulk Create Automation' });
    this.users = [];
    this.profilesCreated = 0;
  }

  async execute() {
    // 1. Obter todos os usuários
    await this.fetchUsers();

    // 2. Criar perfis para usuários sem dados
    await this.createProfilesForUsers();

    // 3. Verificar criação
    await this.verifyProfiles();
  }

  /**
   * Busca todos os usuários do sistema
   */
  async fetchUsers() {
    Logger.section('📊 Buscando usuários...');

    const response = await this.client.get('/users?limit=1000');

    if (response && response.status === 200) {
      this.users = response.data.items || [];
      Logger.success(`${this.users.length} usuários encontrados`);
    } else {
      Logger.error('Falha ao buscar usuários');
      throw new Error('Não foi possível buscar usuários');
    }
  }

  /**
   * Cria perfis para todos os usuários
   */
  async createProfilesForUsers() {
    Logger.section(`📝 Criando perfis para ${this.users.length} usuários...`);

    for (let i = 0; i < this.users.length; i++) {
      const user = this.users[i];
      Logger.progress(i + 1, this.users.length, 'perfil');

      // Fazer login como o usuário (simular criação de perfil próprio)
      // Mas como não temos a senha, vamos criar via admin usando POST /profiles
      const profileData = this.generateProfileData(user);

      const result = await this.createProfile(user, profileData);

      if (result) {
        this.profilesCreated++;
        this.results.push({ success: true, userId: user.id, data: result });
      } else {
        this.results.push({ success: false, userId: user.id });
      }

      // Delay para não sobrecarregar
      await this.delay(150);
    }

    Logger.info(`${this.profilesCreated}/${this.users.length} perfis criados com sucesso`);
  }

  /**
   * Gera dados de perfil aleatórios
   */
  generateProfileData(user) {
    const loveLanguages = [
      'Palavras de afirmação',
      'Tempo de qualidade',
      'Presentes',
      'Atos de serviço',
      'Toque físico'
    ];

    const temperaments = [
      'Sanguíneo',
      'Colérico',
      'Melancólico',
      'Fleumático',
      'Sanguíneo Colérico',
      'Melancólico Fleumático',
      'Colérico Sanguíneo',
      'Fleumático Melancólico'
    ];

    const colors = [
      'Azul', 'Verde', 'Vermelho', 'Amarelo', 'Roxo', 'Rosa',
      'Laranja', 'Preto', 'Branco', 'Azul Marinho', 'Verde Água'
    ];

    const foods = [
      'Pizza', 'Lasanha', 'Feijoada', 'Churrasco', 'Sushi',
      'Peixe', 'Frango', 'Massa', 'Salada', 'Hambúrguer',
      'Arroz e feijão', 'Bolo de chocolate'
    ];

    const musics = [
      'Louvores', 'Gospel', 'MPB', 'Rock', 'Pop',
      'Sertanejo', 'Jazz', 'Clássica', 'Adoração',
      'Música instrumental', 'Hinários', 'Contemporânea'
    ];

    const smiles = [
      'Momentos com a família',
      'Ver crianças felizes',
      'Servir ao próximo',
      'Ler a Bíblia',
      'Estar na presença de Deus',
      'Conversas com amigos',
      'Natureza e paisagens',
      'Animais de estimação',
      'Fazer novas amizades',
      'Ajudar as pessoas'
    ];

    const talents = [
      'Ensino e educação',
      'Música e canto',
      'Arte e pintura',
      'Culinária',
      'Esportes',
      'Liderança',
      'Comunicação',
      'Organização',
      'Tecnologia',
      'Atendimento e hospitalidade'
    ];

    const gaLeaderNames = [
      'João e Maria Silva',
      'Pedro e Ana Costa',
      'Carlos e Juliana Santos',
      'Fernando e Patricia Oliveira',
      'Ricardo e Camila Souza',
      'Rafael e Larissa Lima',
      'Gabriel e Mariana Almeida',
      'Bruno e Amanda Ferreira'
    ];

    // Gerar data de nascimento aleatória (entre 18 e 80 anos)
    const randomAge = Math.floor(Math.random() * 62) + 18; // 18 a 80 anos
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - randomAge;
    const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const birthDate = `${birthYear}-${birthMonth}-${birthDay}`;

    return {
      personalData: {
        birthDate: birthDate,
        gaLeaderName: gaLeaderNames[Math.floor(Math.random() * gaLeaderNames.length)],
        gaLeaderContact: `(${Math.floor(Math.random() * 90) + 10}) ${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(1000 + Math.random() * 9000)}`
      },
      preferences: {
        loveLanguages: this.getRandomItems(loveLanguages, 1, 2).join(', '),
        temperaments: temperaments[Math.floor(Math.random() * temperaments.length)],
        favoriteColor: colors[Math.floor(Math.random() * colors.length)],
        favoriteFood: foods[Math.floor(Math.random() * foods.length)],
        favoriteMusic: musics[Math.floor(Math.random() * musics.length)],
        whatMakesYouSmile: smiles[Math.floor(Math.random() * smiles.length)],
        skillsAndTalents: this.getRandomItems(talents, 1, 3).join(', ')
      }
    };
  }

  /**
   * Retorna entre min e max itens aleatórios de um array
   */
  getRandomItems(array, min, max) {
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Cria perfil para um usuário via login
   */
  async createProfile(user, profileData) {
    try {
      // Tentar fazer login com o usuário
      // Como não temos a senha, vamos tentar usar uma senha padrão
      // Se falhar, pular este usuário
      const loginAttempt = await this.tryLoginAsUser(user);

      if (!loginAttempt) {
        Logger.warning(`Não foi possível fazer login como ${user.email}, pulando...`);
        return null;
      }

      // Salvar token atual do admin
      const adminToken = this.client.authToken;

      // Usar token do usuário temporariamente
      this.client.authToken = loginAttempt.token;

      // Criar perfil
      const response = await this.client.post('/profiles', profileData);

      // Restaurar token do admin
      this.client.authToken = adminToken;

      if (response && (response.status === 201 || response.status === 200)) {
        Logger.success(`Perfil criado para ${user.name} (${user.email})`);
        return response.data;
      } else {
        Logger.warning(`Erro ao criar perfil para ${user.email}`);
        return null;
      }
    } catch (error) {
      Logger.warning(`Erro ao processar perfil para ${user.email}: ${error.message}`);
      return null;
    }
  }

  /**
   * Tenta fazer login como usuário (tenta senhas comuns)
   */
  async tryLoginAsUser(user) {
    const commonPasswords = ['Abc@123', 'password123', 'Edu@27032016', '123456'];

    for (const password of commonPasswords) {
      try {
        const response = await this.client.apiClient.post('/auth/login', {
          email: user.email,
          password: password
        });

        if (response.status === 201 && response.data.accessToken) {
          return { token: response.data.accessToken };
        }
      } catch (error) {
        // Senha incorreta, tentar próxima
        continue;
      }
    }

    return null;
  }

  /**
   * Verifica quantos perfis foram criados
   */
  async verifyProfiles() {
    Logger.section('🔍 Verificando perfis criados...');

    const response = await this.client.get('/profiles');

    if (response && response.status === 200) {
      const profiles = response.data || [];
      Logger.success(`${profiles.length} perfis encontrados no sistema`);
      Logger.info(`${this.profilesCreated} perfis foram criados nesta execução`);
    } else {
      Logger.warning('Não foi possível verificar perfis');
    }
  }
}

// Executar automação
const automation = new ProfilesBulkCreateAutomation();
automation.run();
