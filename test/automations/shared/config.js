/**
 * Configuração compartilhada para todas as automações
 * Centraliza credenciais, URLs e outras configurações
 */

module.exports = {
  // URL base da API
  BASE_URL: process.env.API_URL || 'http://localhost:3000',

  // Credenciais de admin
  ADMIN_CREDENTIALS: {
    email: 'superuser@orfanatonib.com',
    password: 'Edu@27032016'
  },

  // Timeouts (em milissegundos)
  TIMEOUTS: {
    login: 10000,
    request: 30000,
    longRequest: 60000
  },

  // Delays entre requisições (em milissegundos)
  DELAYS: {
    betweenRequests: 100,
    betweenCreations: 30,
    betweenBatches: 1000
  },

  // Limites de criação
  LIMITS: {
    defaultBatchSize: 50,
    maxRetries: 3,
    maxErrors: 10
  }
};
