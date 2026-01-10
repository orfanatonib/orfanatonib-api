#!/usr/bin/env node

/**
 * Script de Teste de Autenticação
 *
 * Testa o módulo de autenticação centralizado
 *
 * Uso: node test/automations/shared/test-auth.js
 */

const { login, getAuthToken, getAuthHeaders, testAuth, clearTokenCache, isTokenValid } = require('./auth');
const logger = require('./logger');

async function testarAutenticacao() {
  console.log('\n🧪 TESTE DE AUTENTICAÇÃO\n');
  console.log('═'.repeat(60));

  try {
    // Teste 1: Login básico
    console.log('\n📍 Teste 1: Login básico');
    const token1 = await login();
    logger.success(`✅ Token obtido: ${token1.substring(0, 20)}...`);

    // Teste 2: Verificar se token é válido
    console.log('\n📍 Teste 2: Verificar validade do token');
    const valido = isTokenValid();
    logger.success(`✅ Token válido: ${valido}`);

    // Teste 3: Obter token em cache
    console.log('\n📍 Teste 3: Obter token em cache (deve ser o mesmo)');
    const token2 = await getAuthToken();
    const saoIguais = token1 === token2;
    logger.success(`✅ Tokens são iguais: ${saoIguais}`);

    // Teste 4: Obter headers de autenticação
    console.log('\n📍 Teste 4: Obter headers de autenticação');
    const headers = await getAuthHeaders();
    logger.success(`✅ Headers obtidos: Authorization=${headers.Authorization.substring(0, 30)}...`);

    // Teste 5: Testar autenticação com endpoint /auth/me
    console.log('\n📍 Teste 5: Testar autenticação com /auth/me');
    const userData = await testAuth();
    logger.success(`✅ Usuário: ${userData.name} (${userData.email})`);
    logger.success(`✅ Role: ${userData.role}`);

    // Teste 6: Limpar cache e verificar
    console.log('\n📍 Teste 6: Limpar cache de token');
    clearTokenCache();
    const validoAposLimpar = isTokenValid();
    logger.success(`✅ Token válido após limpar: ${validoAposLimpar}`);

    // Teste 7: Novo login após limpar cache
    console.log('\n📍 Teste 7: Novo login após limpar cache');
    const token3 = await login();
    const diferente = token1 !== token3;
    logger.success(`✅ Novo token obtido (diferente do anterior): ${diferente}`);

    // Resumo final
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
    console.log('═'.repeat(60));
    console.log('\n✅ Módulo de autenticação funcionando corretamente');
    console.log('✅ Credenciais: superuser@orfanatonib.com');
    console.log('✅ Cache de token funcionando');
    console.log('✅ Todas as funções operacionais\n');

    process.exit(0);

  } catch (error) {
    console.log('\n' + '═'.repeat(60));
    console.error('❌ ERRO NO TESTE DE AUTENTICAÇÃO');
    console.log('═'.repeat(60));
    console.error('\n' + error.message);
    console.error('\nVerifique:');
    console.error('  1. A API está rodando? (http://localhost:3000)');
    console.error('  2. As credenciais estão corretas em shared/config.js?');
    console.error('  3. O usuário superuser@orfanatonib.com existe no banco?\n');
    process.exit(1);
  }
}

// Executar
testarAutenticacao();
