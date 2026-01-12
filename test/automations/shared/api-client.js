const axios = require('axios');
const FormData = require('form-data');
const config = require('./config');
const auth = require('./auth');

/**
 * Cliente HTTP compartilhado para todas as automações
 * Centraliza autenticação, configuração de requests e tratamento de erros
 */
class ApiClient {
  constructor(baseUrl = null) {
    this.baseUrl = baseUrl || config.BASE_URL;
    this.authToken = '';
    this.adminCredentials = config.ADMIN_CREDENTIALS;
  }

  /**
   * Faz login e armazena o token de autenticação
   * Usa o módulo auth.js centralizado
   */
  async login(credentials = null) {
    try {
      const email = credentials?.email || null;
      const password = credentials?.password || null;

      // Usa o módulo de autenticação centralizado
      this.authToken = await auth.login(email, password);
      return true;
    } catch (error) {
      console.error('❌ Erro no login:', error.message);
      return false;
    }
  }

  /**
   * Faz uma requisição HTTP genérica
   */
  async makeRequest(method, url, data = null, options = {}) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${url}`,
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response;
    } catch (error) {
      if (!options.silent) {
        console.error(`❌ Erro na requisição ${method} ${url}:`, error.response?.data || error.message);
      }
      return null;
    }
  }

  /**
   * Faz uma requisição com FormData (multipart/form-data)
   */
  async makeMultipartRequest(method, url, formData, options = {}) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${url}`,
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          ...formData.getHeaders(),
          ...options.headers
        },
        data: formData,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: options.timeout || 30000
      };

      const response = await axios(config);
      return response;
    } catch (error) {
      if (!options.silent) {
        console.error(`❌ Erro na requisição multipart ${method} ${url}:`, error.response?.data || error.message);
      }
      return null;
    }
  }

  /**
   * Métodos de conveniência HTTP
   */
  async get(url, options = {}) {
    return this.makeRequest('GET', url, null, options);
  }

  async post(url, data, options = {}) {
    return this.makeRequest('POST', url, data, options);
  }

  async put(url, data, options = {}) {
    return this.makeRequest('PUT', url, data, options);
  }

  async patch(url, data, options = {}) {
    return this.makeRequest('PATCH', url, data, options);
  }

  async delete(url, options = {}) {
    return this.makeRequest('DELETE', url, null, options);
  }

  /**
   * Baixa uma imagem de uma URL
   */
  async downloadImage(imageUrl, options = {}) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: options.timeout || 10000
      });
      return response.data;
    } catch (error) {
      if (!options.silent) {
        console.error(`❌ Erro ao baixar imagem ${imageUrl}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Busca dados necessários para testes (users, shelters, etc.)
   */
  async getTestData() {
    console.log('📊 Obtendo dados necessários para os testes...');

    const testData = {
      users: [],
      shelters: [],
      leaderProfiles: [],
      memberProfiles: [],
      teams: []
    };

    try {
      // Users
      const usersResponse = await this.get('/users?page=1&limit=100', { silent: true });
      if (usersResponse) {
        testData.users = usersResponse.data?.items || usersResponse.data?.data || [];
        console.log(`  👤 ${testData.users.length} users encontrados`);
      }

      // Shelters
      const sheltersResponse = await this.get('/shelters/simple', { silent: true });
      if (sheltersResponse) {
        testData.shelters = sheltersResponse.data || [];
        console.log(`  🏠 ${testData.shelters.length} shelters encontrados`);
      }

      // Leader Profiles
      const leadersResponse = await this.get('/leader-profiles/simple', { silent: true });
      if (leadersResponse) {
        testData.leaderProfiles = leadersResponse.data || [];
        console.log(`  👔 ${testData.leaderProfiles.length} leader profiles encontrados`);
      }

      // Member Profiles
      const membersResponse = await this.get('/member-profiles/simple', { silent: true });
      if (membersResponse) {
        testData.memberProfiles = membersResponse.data || [];
        console.log(`  👨‍🏫 ${testData.memberProfiles.length} member profiles encontrados`);
      }

      // Teams
      const teamsResponse = await this.get('/teams', { silent: true });
      if (teamsResponse) {
        testData.teams = teamsResponse.data || [];
        console.log(`  👥 ${testData.teams.length} teams encontrados`);
      }

    } catch (error) {
      console.error('⚠️ Erro ao obter dados de teste:', error.message);
    }

    return testData;
  }
}

module.exports = ApiClient;
