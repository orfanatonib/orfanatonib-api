#!/usr/bin/env node

/**
 * Script para converter automações antigas que usam axios diretamente
 * para usar o ApiClient centralizado
 *
 * Uso: node test/automations/shared/convert-to-apiclient.js
 */

const fs = require('fs');
const path = require('path');

// Padrões a serem detectados e sugestões de conversão
const patterns = {
  oldLogin: /async function login\(\) \{[\s\S]*?axios\.post\(`\$\{BASE_URL\}\/auth\/login`[\s\S]*?\}/g,
  axiosImport: /const axios = require\('axios'\);/g,
  authToken: /let authToken = ['"]['"]/g,
};

function findAutomationFiles() {
  const automationsDir = path.join(__dirname, '..');
  const files = [];

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== 'shared') {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('-automation.js')) {
        files.push(fullPath);
      }
    }
  }

  scanDir(automationsDir);
  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // Verifica se usa axios diretamente
  if (content.includes("const axios = require('axios')") && !content.includes('const ApiClient = require')) {
    issues.push({
      type: 'uses_axios_directly',
      message: 'Usa axios diretamente ao invés de ApiClient'
    });
  }

  // Verifica se tem função login customizada
  if (content.match(/async function login\(\)/)) {
    issues.push({
      type: 'custom_login',
      message: 'Tem função login customizada (deveria usar ApiClient.login)'
    });
  }

  // Verifica se armazena authToken manualmente
  if (content.match(/let authToken\s*=/) || content.match(/this\.authToken\s*=/)) {
    issues.push({
      type: 'manual_token',
      message: 'Armazena token manualmente (deveria usar ApiClient)'
    });
  }

  return {
    path: filePath,
    needsUpdate: issues.length > 0,
    issues
  };
}

function generateReport(analyses) {
  console.log('\n📊 RELATÓRIO DE ANÁLISE DAS AUTOMAÇÕES\n');
  console.log('═'.repeat(70));

  const needUpdate = analyses.filter(a => a.needsUpdate);
  const upToDate = analyses.filter(a => !a.needsUpdate);

  console.log(`\n✅ Arquivos atualizados: ${upToDate.length}`);
  console.log(`⚠️  Arquivos que precisam atualização: ${needUpdate.length}\n`);

  if (needUpdate.length > 0) {
    console.log('📋 Arquivos que precisam ser convertidos:\n');

    needUpdate.forEach((analysis, index) => {
      const fileName = path.basename(analysis.path);
      const dirName = path.basename(path.dirname(analysis.path));

      console.log(`${index + 1}. ${dirName}/${fileName}`);
      analysis.issues.forEach(issue => {
        console.log(`   → ${issue.message}`);
      });
      console.log('');
    });

    console.log('═'.repeat(70));
    console.log('\n💡 COMO CONVERTER PARA ApiClient:\n');
    console.log('Substitua:');
    console.log('─'.repeat(70));
    console.log(`
const axios = require('axios');
const config = require('../shared/config');
let authToken = '';

async function login() {
  const response = await axios.post(\`\${BASE_URL}/auth/login\`, ADMIN_CREDENTIALS);
  authToken = response.data.accessToken;
}
    `);
    console.log('Por:');
    console.log('─'.repeat(70));
    console.log(`
const ApiClient = require('../shared/api-client');

// No início da função principal
const client = new ApiClient();
await client.login();

// Use client.get(), client.post(), etc.
const response = await client.get('/users');
    `);
    console.log('═'.repeat(70));
  } else {
    console.log('🎉 Todas as automações já estão usando ApiClient!\n');
  }
}

// Executar análise
console.log('🔍 Analisando automações...\n');

const files = findAutomationFiles();
console.log(`📁 Encontrados ${files.length} arquivos de automação\n`);

const analyses = files.map(analyzeFile);
generateReport(analyses);

// Exportar relatório JSON
const reportPath = path.join(__dirname, 'automation-analysis-report.json');
fs.writeFileSync(reportPath, JSON.stringify(analyses, null, 2));
console.log(`\n💾 Relatório detalhado salvo em: ${reportPath}\n`);
