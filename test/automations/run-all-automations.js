const { spawn } = require('child_process');
const path = require('path');

const automations = [
  { name: 'Events', script: 'events/events-complete-automation.js' },
  { name: 'Video Pages', script: 'video-pages/video-pages-complete-automation.js' },
  { name: 'Image Pages', script: 'image-pages/image-pages-complete-automation.js' },
  { name: 'Ideas Pages', script: 'ideas-pages/ideas-pages-complete-automation.js' },
  { name: 'Visit Material Pages', script: 'visit-material-pages/visit-material-pages-complete-automation.js' },
  { name: 'Ideas Sections Órfãs', script: 'ideas-sections/ideas-sections-orphan-automation.js' },
  { name: 'Image Sections Órfãs', script: 'image-sections/image-sections-orphan-automation.js' },
  { name: 'Comments', script: 'comments/comments-complete-automation.js' },
  { name: 'Contacts', script: 'contacts/contacts-complete-automation.js' },
  { name: 'Documents', script: 'documents/documents-complete-automation.js' },
  { name: 'Feedbacks', script: 'feedbacks/feedbacks-complete-automation.js' },
  { name: 'Informatives', script: 'informatives/informatives-complete-automation.js' },
  { name: 'Meditations', script: 'meditations/meditations-complete-automation.js' }
];

async function runAutomation(automation) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, automation.script);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Executando automação: ${automation.name}`);
    console.log('='.repeat(60));
    
    let hasResolved = false;
    let processExited = false;
    let finalExitCode = null;
    
    // Usar spawn ao invés de exec para melhor controle
    const childProcess = spawn('node', [scriptPath], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false
    });

    // Capturar stdout
    childProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    // Capturar stderr (filtrar ECONNRESET que pode ser apenas warning)
    childProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      // Filtrar apenas erros de ECONNRESET que não são críticos
      if (!dataStr.includes('ECONNRESET') || dataStr.includes('Error:')) {
        process.stderr.write(data);
      }
    });

    // Função para resolver a promise de forma segura
    const safeResolve = (code) => {
      if (hasResolved) return;
      hasResolved = true;
      finalExitCode = code;
      
      if (code === 0 || code === null) {
        resolve();
      } else {
        const error = new Error(`Processo ${automation.name} terminou com código ${code}`);
        reject(error);
      }
    };

    // Tratar quando o processo termina
    childProcess.on('exit', (code, signal) => {
      processExited = true;
      finalExitCode = code;
      
      if (hasResolved) return;
      
      // Se recebeu um sinal, pode ser um problema
      if (signal) {
        console.error(`⚠️ Processo ${automation.name} foi terminado com sinal: ${signal}`);
      }
      
      safeResolve(code);
    });

    // Tratar erros do processo
    childProcess.on('error', (error) => {
      // Se o processo já terminou, ignorar erros de conexão
      if (processExited && error.code === 'ECONNRESET') {
        // O processo já terminou, usar o exit code
        if (!hasResolved) {
          safeResolve(finalExitCode);
        }
        return;
      }
      
      if (hasResolved) return;
      
      // ECONNRESET pode acontecer mas o processo pode ter terminado com sucesso
      if (error.code === 'ECONNRESET') {
        // Aguardar um pouco para ver se o processo termina
        setTimeout(() => {
          if (!hasResolved) {
            // Se o processo já terminou, usar o exit code
            if (processExited) {
              safeResolve(finalExitCode);
            } else {
              // Processo ainda rodando, considerar como erro
              hasResolved = true;
              reject(error);
            }
          }
        }, 1000);
      } else {
        hasResolved = true;
        reject(error);
      }
    });
  });
}

async function runAllAutomations() {
  console.log('🎯 Iniciando execução de todas as automações...\n');
  console.log(`📋 Total de automações: ${automations.length}\n`);

  const results = {
    success: [],
    failed: []
  };

  for (const automation of automations) {
    try {
      await runAutomation(automation);
      results.success.push(automation.name);
      console.log(`\n✅ ${automation.name} concluída com sucesso!\n`);
      
      // Delay entre automações para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      results.failed.push(automation.name);
      // Não imprimir o erro completo se for ECONNRESET (pode ser apenas um warning)
      if (error.code === 'ECONNRESET') {
        console.error(`\n⚠️ ${automation.name} teve problema de conexão, mas pode ter concluído.\n`);
      } else {
        console.error(`\n❌ ${automation.name} falhou: ${error.message}\n`);
      }
      
      // Continuar mesmo com erro
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO FINAL DE TODAS AS AUTOMAÇÕES');
  console.log('='.repeat(60));
  console.log(`✅ Sucesso: ${results.success.length}`);
  console.log(`❌ Falhas: ${results.failed.length}`);
  
  if (results.success.length > 0) {
    console.log('\n✅ Automações bem-sucedidas:');
    results.success.forEach(name => console.log(`   - ${name}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Automações com falha:');
    results.failed.forEach(name => console.log(`   - ${name}`));
  }
  
  console.log('='.repeat(60));
}

// Executar todas as automações
runAllAutomations()
  .then(() => {
    console.log('\n✅ Todas as automações foram executadas!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });

