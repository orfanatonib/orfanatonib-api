#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

const automations = [
  { name: 'Users', path: 'test/automations/users/users-complete-automation.js' },
  { name: 'Shelters', path: 'test/automations/shelters/shelters-complete-automation.js' },
  { name: 'Leader Profiles', path: 'test/automations/leader-profiles/leader-profiles-complete-automation.js' },
  { name: 'Teacher Profiles', path: 'test/automations/teacher-profiles/teacher-profiles-complete-automation.js' },
  { name: 'Sheltered', path: 'test/automations/sheltered/sheltered-complete-automation.js' },
  { name: 'Pagelas', path: 'test/automations/pagelas/pagelas-complete-automation.js' },
];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runAutomation(automation) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    log(`\n${'='.repeat(70)}`, colors.blue);
    log(`🚀 Executando: ${automation.name}`, colors.bright);
    log(`${'='.repeat(70)}`, colors.blue);
    
    exec(`node ${automation.path}`, (error, stdout, stderr) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      
      if (error) {
        log(`\n❌ Falha: ${automation.name} (${duration}s)`, colors.red);
        resolve({ name: automation.name, success: false, duration, error: error.message });
      } else {
        log(`\n✅ Sucesso: ${automation.name} (${duration}s)`, colors.green);
        resolve({ name: automation.name, success: true, duration });
      }
    });
  });
}

async function runAllAutomations() {
  const startTime = Date.now();
  
  log('\n╔════════════════════════════════════════════════════════════════╗', colors.blue);
  log('║     🧪 EXECUTANDO TODAS AS AUTOMAÇÕES - ORFANATONIB API      ║', colors.bright);
  log('╚════════════════════════════════════════════════════════════════╝\n', colors.blue);
  
  log(`📋 Total de automações: ${automations.length}`, colors.blue);
  log(`🕐 Início: ${new Date().toLocaleTimeString('pt-BR')}\n`, colors.blue);
  
  const results = [];
  
  for (const automation of automations) {
    const result = await runAutomation(automation);
    results.push(result);
  }
  
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Resumo Final
  log('\n╔════════════════════════════════════════════════════════════════╗', colors.blue);
  log('║                    📊 RESUMO FINAL                            ║', colors.bright);
  log('╚════════════════════════════════════════════════════════════════╝\n', colors.blue);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  log(`✅ Sucessos: ${successful}/${automations.length}`, colors.green);
  log(`❌ Falhas: ${failed}/${automations.length}`, failed > 0 ? colors.red : colors.green);
  log(`⏱️  Tempo total: ${totalDuration}s`, colors.blue);
  log(`🕐 Fim: ${new Date().toLocaleTimeString('pt-BR')}\n`, colors.blue);
  
  // Detalhes por módulo
  log('📋 Detalhes por módulo:\n', colors.blue);
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? colors.green : colors.red;
    log(`  ${index + 1}. ${icon} ${result.name.padEnd(20)} - ${result.duration}s`, color);
  });
  
  if (failed > 0) {
    log('\n⚠️  Algumas automações falharam. Verifique os logs acima.', colors.yellow);
    process.exit(1);
  } else {
    log('\n🎉 Todas as automações foram executadas com sucesso!', colors.green);
    process.exit(0);
  }
}

// Executar
runAllAutomations().catch(error => {
  log(`\n❌ Erro fatal: ${error.message}`, colors.red);
  process.exit(1);
});

