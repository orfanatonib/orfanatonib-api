/**
 * Utilitário de logging com cores e formatação
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

class Logger {
  static log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  static success(message) {
    console.log(`${colors.green}✅ ${message}${colors.reset}`);
  }

  static error(message) {
    console.log(`${colors.red}❌ ${message}${colors.reset}`);
  }

  static warning(message) {
    console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
  }

  static info(message) {
    console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
  }

  static header(message) {
    const line = '='.repeat(70);
    console.log(`${colors.blue}${line}`);
    console.log(`${colors.bright}${message}${colors.reset}`);
    console.log(`${colors.blue}${line}${colors.reset}`);
  }

  static section(message) {
    console.log(`\n${colors.magenta}${'─'.repeat(60)}`);
    console.log(`${message}${colors.reset}`);
  }

  static progress(current, total, itemName = 'item') {
    const percentage = ((current / total) * 100).toFixed(1);
    console.log(`${colors.dim}[${current}/${total}] ${percentage}% - ${itemName}${colors.reset}`);
  }

  static summary(title, results) {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    this.header(`📊 ${title}`);
    console.log(`${colors.green}✅ Sucesso: ${successful}${colors.reset}`);
    console.log(`${colors.red}❌ Falhas: ${failed}${colors.reset}`);
    console.log(`${colors.blue}📋 Total: ${results.length}${colors.reset}\n`);

    if (failed > 0) {
      console.log(`${colors.yellow}Itens com falha:${colors.reset}`);
      results.filter(r => !r.success).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.name || r.id || 'Item'}`);
      });
    }
  }
}

module.exports = Logger;
