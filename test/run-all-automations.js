#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Executa em SEQUÊNCIA (ordem importa). Inclui fixes entre módulos.
// Observação: algumas automações podem falhar dependendo de integrações externas (ex.: Contacts envia e-mail).
const automations = [
  // Core data
  { name: 'Users', script: 'automations/users/users-complete-automation.js', timeoutMs: 5 * 60_000 },
  { name: 'Shelters', script: 'automations/shelters/shelters-complete-automation.js', timeoutMs: 5 * 60_000 },
  { name: 'Fix: vincular leaders/teachers aos shelters', script: 'fix-shelter-staff-links.js', timeoutMs: 10 * 60_000 },
  { name: 'Sheltered', script: 'automations/sheltered/sheltered-complete-automation.js', timeoutMs: 10 * 60_000 },
  { name: 'Pagelas', script: 'automations/pagelas/pagelas-complete-automation.js', timeoutMs: 10 * 60_000 },

  // Content/pages
  { name: 'Events', script: 'automations/events/events-complete-automation.js', timeoutMs: 5 * 60_000 },
  { name: 'Video Pages', script: 'automations/video-pages/video-pages-complete-automation.js', timeoutMs: 5 * 60_000 },
  { name: 'Image Pages', script: 'automations/image-pages/image-pages-complete-automation.js', timeoutMs: 5 * 60_000 },
  { name: 'Ideas Pages', script: 'automations/ideas-pages/ideas-pages-complete-automation.js', timeoutMs: 5 * 60_000 },
  { name: 'Visit Material Pages', script: 'automations/visit-material-pages/visit-material-pages-complete-automation.js', timeoutMs: 7 * 60_000 },
  { name: 'Ideas Sections Órfãs', script: 'automations/ideas-sections/ideas-sections-orphan-automation.js', timeoutMs: 5 * 60_000 },
  { name: 'Image Sections Órfãs', script: 'automations/image-sections/image-sections-orphan-automation.js', timeoutMs: 5 * 60_000 },
  { name: 'Documents', script: 'automations/documents/documents-complete-automation.js', timeoutMs: 5 * 60_000 },
  { name: 'Informatives', script: 'automations/informatives/informatives-complete-automation.js', timeoutMs: 5 * 60_000 },
  { name: 'Meditations', script: 'automations/meditations/meditations-complete-automation.js', timeoutMs: 5 * 60_000 },
  { name: 'Comments', script: 'automations/comments/comments-complete-automation.js', timeoutMs: 5 * 60_000 },
  { name: 'Feedbacks', script: 'automations/feedbacks/feedbacks-complete-automation.js', timeoutMs: 5 * 60_000 },
  { name: 'Contacts', script: 'automations/contacts/contacts-complete-automation.js', timeoutMs: 5 * 60_000 },
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

    const scriptPath = path.join(__dirname, automation.script);
    const child = spawn('node', [scriptPath], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(d);
    });
    child.stderr.on('data', (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(d);
    });

    const timeoutMs = automation.timeoutMs ?? 120000;
    const timer = setTimeout(() => {
      log(`\n⏰ Timeout (${Math.round(timeoutMs / 1000)}s): ${automation.name} — encerrando...`, colors.yellow);
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000);
    }, timeoutMs);

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      if (code === 0) {
        log(`\n✅ Sucesso: ${automation.name} (${duration}s)`, colors.green);
        resolve({ name: automation.name, success: true, duration });
      } else {
        const msg = `code=${code} signal=${signal || 'none'}`;
        log(`\n❌ Falha: ${automation.name} (${duration}s) [${msg}]`, colors.red);
        // manter stderr curto no resumo
        resolve({ name: automation.name, success: false, duration, error: msg, stderrTail: stderr.split('\n').slice(-10).join('\n') });
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
    try {
      const result = await runAutomation(automation);
      results.push(result);
      console.log(`\n`);

      // Delay entre automações para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      results.push({ name: automation.name, success: false, duration: 'error', error: error.message });
      log(`💥 Erro crítico em ${automation.name}: ${error.message}`, colors.red);
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  // Resumo Final
  log('\n╔════════════════════════════════════════════════════════════════╗', colors.blue);
  log('║                    📊 RESUMO FINAL                            ║', colors.bright);
  log('╚════════════════════════════════════════════════════════════════╝\n', colors.blue);

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