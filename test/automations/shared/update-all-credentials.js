#!/usr/bin/env node

/**
 * Script para atualizar credenciais em todas as automações
 * Substitui credenciais hardcoded pela configuração centralizada
 */

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  '../contacts/contacts-complete-automation.js',
  '../documents/documents-complete-automation.js',
  '../events/events-complete-automation.js',
  '../fixes/fix-shelter-staff-links.js',
  '../fixes/fix-sheltered-relationships.js',
  '../ideas-pages/ideas-pages-complete-automation.js',
  '../ideas-sections/ideas-sections-orphan-automation.js',
  '../image-pages/image-pages-complete-automation.js',
  '../image-sections/image-sections-orphan-automation.js',
  '../informatives/informatives-complete-automation.js',
  '../leader-profiles/create-leaders-for-shelters.js',
  '../leader-profiles/leader-profiles-complete-automation.js',
  '../meditations/meditations-complete-automation.js',
  '../pagelas/pagelas-mass-creation.js',
  '../sheltered/sheltered-complete-automation.js',
  '../sheltered/sheltered-mass-creation.js',
  '../shelters/create-shelters-and-members.js',
  '../shelters/shelters-complete-automation.js',
  '../member-profiles/member-profiles-complete-automation.js',
  '../users/users-complete-automation.js',
  '../utils/create-list-fix-orchestrator.js',
  '../utils/listing-and-fixes-automation.js',
  '../video-pages/video-pages-complete-automation.js',
  '../visit-material-pages/fix-broken-links.js',
  '../visit-material-pages/visit-material-pages-complete-automation.js'
];

function updateFile(relativeFilePath) {
  const filePath = path.join(__dirname, relativeFilePath);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Verificar se já usa config
  if (content.includes("require('../shared/config')") || content.includes("require('./shared/config')")) {
    console.log(`⏭️  Já atualizado: ${path.basename(filePath)}`);
    return false;
  }

  // Atualizar importações no topo do arquivo
  const configImport = "const config = require('../shared/config');";

  // Adicionar import do config após require('axios')
  if (content.includes("const axios = require('axios');")) {
    content = content.replace(
      "const axios = require('axios');",
      `const axios = require('axios');\n${configImport}`
    );
  } else if (content.includes("const { ")) {
    // Para arquivos que começam com destructuring
    const firstLine = content.split('\n')[0];
    content = content.replace(firstLine, `${firstLine}\n${configImport}`);
  }

  // Substituir BASE_URL
  content = content.replace(
    /const BASE_URL = ['"]http:\/\/localhost:3000['"];?/g,
    'const BASE_URL = config.BASE_URL;'
  );

  // Substituir ADMIN_CREDENTIALS (pattern mais complexo)
  const credentialsPattern = /const ADMIN_CREDENTIALS = \{\s*email:\s*['"][^'"]+['"],\s*password:\s*['"][^'"]+['"]\s*\};?/gs;
  content = content.replace(
    credentialsPattern,
    'const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;'
  );

  // Salvar arquivo atualizado
  fs.writeFileSync(filePath, content);

  console.log(`✅ Atualizado: ${path.basename(filePath)}`);
  return true;
}

console.log('🔄 Atualizando credenciais em todas as automações...\n');

let updatedCount = 0;
let skippedCount = 0;
let errorCount = 0;

for (const file of filesToUpdate) {
  try {
    const updated = updateFile(file);
    if (updated) {
      updatedCount++;
    } else {
      skippedCount++;
    }
  } catch (error) {
    console.error(`❌ Erro ao atualizar ${file}:`, error.message);
    errorCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DA ATUALIZAÇÃO');
console.log('='.repeat(60));
console.log(`✅ Arquivos atualizados: ${updatedCount}`);
console.log(`⏭️  Arquivos já atualizados: ${skippedCount}`);
console.log(`❌ Erros: ${errorCount}`);
console.log('='.repeat(60));

console.log('\n✅ Atualização concluída!');
