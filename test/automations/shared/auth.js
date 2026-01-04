/**
 * Módulo de Autenticação Centralizado
 *
 * Este módulo fornece funcionalidades de autenticação reutilizáveis
 * para todas as automações do sistema.
 *
 * Uso:
 * const { login, getAuthToken } = require('./shared/auth');
 * const token = await login();
 */

const axios = require('axios');
const config = require('./config');
const logger = require('./logger');

// Cache do token para evitar múltiplos logins
let cachedToken = null;
let tokenExpiration = null;

/**
 * Faz login e retorna o token de autenticação
 * @param {string} email - Email do usuário (opcional, usa admin por padrão)
 * @param {string} password - Senha do usuário (opcional, usa admin por padrão)
 * @returns {Promise<string>} Token de autenticação
 */
async function login(email = null, password = null) {
  const credentials = {
    email: email || config.ADMIN_CREDENTIALS.email,
    password: password || config.ADMIN_CREDENTIALS.password
  };

  // Verifica se há token em cache e ainda é válido
  if (cachedToken && tokenExpiration && Date.now() < tokenExpiration) {
    logger.info(`🔑 Usando token em cache para ${credentials.email}`);
    return cachedToken;
  }

  try {
    logger.info(`🔐 Fazendo login como ${credentials.email}...`);

    const response = await axios.post(
      `${config.BASE_URL}/auth/login`,
      credentials,
      {
        timeout: config.TIMEOUTS.login,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data || !response.data.accessToken) {
      throw new Error('Token não retornado na resposta do login');
    }

    cachedToken = response.data.accessToken;
    // Token expira em 23 horas (para dar margem)
    tokenExpiration = Date.now() + (23 * 60 * 60 * 1000);

    logger.success(`✅ Login realizado com sucesso! Token obtido.`);
    return cachedToken;

  } catch (error) {
    if (error.response) {
      logger.error(`❌ Erro no login: ${JSON.stringify(error.response.data)}`);
      throw new Error(`Falha na autenticação: ${error.response.data.message || 'Erro desconhecido'}`);
    } else if (error.request) {
      logger.error('❌ Erro de conexão ao tentar fazer login');
      throw new Error('Não foi possível conectar ao servidor');
    } else {
      logger.error(`❌ Erro inesperado no login: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Retorna o token em cache (se existir e válido) ou faz novo login
 * @returns {Promise<string>} Token de autenticação
 */
async function getAuthToken() {
  if (cachedToken && tokenExpiration && Date.now() < tokenExpiration) {
    return cachedToken;
  }
  return login();
}

/**
 * Limpa o cache do token (força novo login na próxima chamada)
 */
function clearTokenCache() {
  cachedToken = null;
  tokenExpiration = null;
  logger.info('🧹 Cache de token limpo');
}

/**
 * Verifica se o token atual ainda é válido
 * @returns {boolean} True se o token é válido
 */
function isTokenValid() {
  return !!(cachedToken && tokenExpiration && Date.now() < tokenExpiration);
}

/**
 * Faz login e retorna headers de autenticação prontos para uso
 * @param {string} email - Email do usuário (opcional)
 * @param {string} password - Senha do usuário (opcional)
 * @returns {Promise<Object>} Headers com Bearer token
 */
async function getAuthHeaders(email = null, password = null) {
  const token = await login(email, password);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Testa a autenticação fazendo uma requisição ao endpoint /auth/me
 * @returns {Promise<Object>} Dados do usuário autenticado
 */
async function testAuth() {
  try {
    const token = await getAuthToken();

    const response = await axios.get(
      `${config.BASE_URL}/auth/me`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: config.TIMEOUTS.request
      }
    );

    logger.success(`✅ Autenticação verificada: ${response.data.email} (${response.data.role})`);
    return response.data;

  } catch (error) {
    logger.error('❌ Falha na verificação de autenticação');
    throw error;
  }
}

module.exports = {
  login,
  getAuthToken,
  getAuthHeaders,
  clearTokenCache,
  isTokenValid,
  testAuth
};
