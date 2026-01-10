#!/usr/bin/env node

/**
 * Script de Conversão Automática para ApiClient
 *
 * Converte automaticamente automações antigas que usam axios diretamente
 * para usar o ApiClient centralizado
 */

const fs = require('fs');
const path = require('path');

function convertFile(filePath) {
  console.log(`\n📝 Convertendo: ${path.basename(filePath)}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Adicionar import do ApiClient se não existir
  if (!content.includes("const ApiClient = require('../shared/api-client')")) {
    // Substituir ou adicionar após outras importações
    if (content.includes("const axios = require('axios')")) {
      content = content.replace(
        /const axios = require\('axios'\);/,
        "const ApiClient = require('../shared/api-client');"
      );
      modified = true;
      console.log('  ✓ Substituído axios por ApiClient');
    }
  }

  // 2. Remover declaração de authToken
  if (content.match(/let authToken\s*=\s*['"];/)) {
    content = content.replace(/let authToken\s*=\s*['"].*;?\n?/g, '');
    modified = true;
    console.log('  ✓ Removido authToken manual');
  }

  // 3. Substituir função login customizada
  if (content.match(/async function login\(\)/)) {
    // Encontrar e remover a função login antiga
    content = content.replace(
      /async function login\(\) \{[\s\S]*?^\}/gm,
      ''
    );
    modified = true;
    console.log('  ✓ Removida função login customizada');
  }

  // 4. Adicionar inicialização do client na função principal
  // Procurar pela função main ou pelo início da execução
  const mainFunctionMatch = content.match(/async function (main|run|execute|start)\(\)/);

  if (mainFunctionMatch && !content.includes('const client = new ApiClient()')) {
    const functionName = mainFunctionMatch[0];
    content = content.replace(
      new RegExp(`${functionName.replace(/[()]/g, '\\$&')} \\{`),
      `${functionName} {\n  const client = new ApiClient();\n  await client.login();\n`
    );
    modified = true;
    console.log('  ✓ Adicionado client e login');
  }

  // 5. Substituir chamadas axios por client
  const axiosReplacements = [
    { from: /axios\.get\(/g, to: 'client.get(' },
    { from: /axios\.post\(/g, to: 'client.post(' },
    { from: /axios\.put\(/g, to: 'client.put(' },
    { from: /axios\.patch\(/g, to: 'client.patch(' },
    { from: /axios\.delete\(/g, to: 'client.delete(' },
  ];

  axiosReplacements.forEach(({ from, to }) => {
    if (content.match(from)) {
      content = content.replace(from, to);
      modified = true;
    }
  });

  if (modified) {
    console.log('  ✓ Substituídas chamadas axios por client');
  }

  // 6. Remover uso manual de headers com authToken
  content = content.replace(
    /headers:\s*\{\s*['"]Authorization['"]:.*?authToken.*?\}/gs,
    ''
  );

  // 7. Salvar arquivo
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  ✅ Arquivo convertido com sucesso!');
    return true;
  } else {
    console.log('  ⏭️  Nenhuma mudança necessária');
    return false;
  }
}

function convertAllFiles() {
  const analysisReport = require('./automation-analysis-report.json');
  const filesToConvert = analysisReport.filter(a => a.needsUpdate);

  console.log('\n🚀 CONVERSÃO AUTOMÁTICA PARA ApiClient');
  console.log('═'.repeat(70));
  console.log(`\nTotal de arquivos a converter: ${filesToConvert.length}\n`);

  let converted = 0;
  let skipped = 0;

  filesToConvert.forEach((file, index) => {
    console.log(`\n[${index + 1}/${filesToConvert.length}]`);

    if (convertFile(file.path)) {
      converted++;
    } else {
      skipped++;
    }
  });

  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 RESUMO DA CONVERSÃO:');
  console.log(`   ✅ Convertidos: ${converted}`);
  console.log(`   ⏭️  Ignorados: ${skipped}`);
  console.log(`   📁 Total processado: ${filesToConvert.length}\n`);

  if (converted > 0) {
    console.log('🎯 Próximos passos:');
    console.log('   1. Revisar os arquivos convertidos');
    console.log('   2. Testar: node test/run-all-automations.js\n');
  }
}

// Executar
try {
  convertAllFiles();
} catch (error) {
  console.error('\n❌ Erro durante conversão:', error.message);
  console.error('\nExecute primeiro: node convert-to-apiclient.js\n');
  process.exit(1);
}
