#!/bin/bash

echo "========================================="
echo "🚀 AUTOMAÇÃO COMPLETA"
echo "========================================="
echo ""
echo "Este script executa:"
echo "1. Criação de Shelter Schedules"
echo "2. Criação de Attendances (Pagelas)"
echo ""
echo "========================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para exibir mensagens
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se node está instalado
if ! command -v node &> /dev/null; then
    log_error "Node.js não está instalado!"
    exit 1
fi

# Diretório base
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Passo 1: Criar Shelter Schedules
echo ""
log_info "========================================="
log_info "PASSO 1: Criando Shelter Schedules"
log_info "========================================="
echo ""

node "$SCRIPT_DIR/shelter-schedules/shelter-schedules-complete-automation.js"
SCHEDULES_EXIT_CODE=$?

if [ $SCHEDULES_EXIT_CODE -ne 0 ]; then
    log_error "Falha ao criar Shelter Schedules! Abortando automação integrada."
    exit $SCHEDULES_EXIT_CODE
else
    log_info "✅ Shelter Schedules criados com sucesso!"
fi

# Aguardar um pouco entre as automações
log_info "Aguardando 3 segundos antes de continuar..."
sleep 3

# Passo 2: Criar Attendances
echo ""
log_info "========================================="
log_info "PASSO 2: Criando Attendances (Pagelas)"
log_info "========================================="
echo ""

node "$SCRIPT_DIR/attendance/attendance-complete-automation.js"
ATTENDANCE_EXIT_CODE=$?

if [ $ATTENDANCE_EXIT_CODE -ne 0 ]; then
    log_error "Falha ao criar Attendances!"
    exit 1
else
    log_info "✅ Attendances criados com sucesso!"
fi

# Resumo final
echo ""
log_info "========================================="
log_info "🎉 AUTOMAÇÃO COMPLETA FINALIZADA!"
log_info "========================================="
echo ""
log_info "Resumo:"
log_info "  ✅ Shelter Schedules: $([ $SCHEDULES_EXIT_CODE -eq 0 ] && echo 'Sucesso' || echo 'Falha')"
log_info "  ✅ Attendances: $([ $ATTENDANCE_EXIT_CODE -eq 0 ] && echo 'Sucesso' || echo 'Falha')"
echo ""
log_info "Sistema pronto para uso!"
echo ""

exit 0
