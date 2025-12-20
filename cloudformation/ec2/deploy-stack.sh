#!/bin/bash

# Script para fazer deploy da stack EC2 Spot usando os arquivos de parâmetros
# Uso: ./deploy-stack.sh ou ENVIRONMENT=staging bash deploy-stack.sh

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Profile AWS (pode ser sobrescrito com variável de ambiente)
AWS_PROFILE=${AWS_PROFILE:-clubinho-aws}

# Diretório do script (pasta do serviço)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Nome da stack (pode ser sobrescrito com variável de ambiente)
ENVIRONMENT=${ENVIRONMENT:-staging}
STACK_NAME="orfanato-nib-ec2-spot-${ENVIRONMENT}"
TEMPLATE_FILE="stack.yaml"

# Determinar arquivo de parâmetros baseado no ambiente
if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "prod" ]; then
    PARAMS_FILE="params-prod.json"
else
    PARAMS_FILE="params-staging.json"
fi

echo -e "${BLUE}🚀 Deploy da Stack EC2 Spot - Orfanatonib${NC}"
echo -e "${CYAN}Ambiente: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}AWS Profile: ${AWS_PROFILE}${NC}"
echo ""

# Verificar se os arquivos existem
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}❌ Erro: Arquivo $TEMPLATE_FILE não encontrado${NC}"
    exit 1
fi

if [ ! -f "$PARAMS_FILE" ]; then
    echo -e "${RED}❌ Erro: Arquivo $PARAMS_FILE não encontrado${NC}"
    exit 1
fi

# Função para obter status da stack
get_stack_status() {
    aws cloudformation describe-stacks --stack-name "$STACK_NAME" --profile "$AWS_PROFILE" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND"
}

# Função para aguardar stack estar pronta (aceita múltiplos estados finais)
wait_for_stack() {
    local target_statuses="$1"  # Lista de estados separados por |
    local timeout=${2:-600}  # 10 minutos padrão (EC2 pode demorar)
    local elapsed=0
    
    echo -e "${CYAN}⏳ Aguardando stack atingir um dos status: $target_statuses${NC}"
    
    while [ $elapsed -lt $timeout ]; do
        local status=$(get_stack_status)
        
        # Verificar se atingiu algum dos estados alvo
        for target in $(echo "$target_statuses" | tr '|' ' '); do
            if [ "$status" = "$target" ]; then
                echo -e "${GREEN}✅ Stack atingiu status: $status${NC}"
                return 0
            fi
        done
        
        # Estados de falha que não são alvo
        case "$status" in
            CREATE_FAILED|UPDATE_FAILED|DELETE_FAILED)
                echo -e "${RED}❌ Stack falhou com status: $status${NC}"
                return 1
                ;;
            CREATE_IN_PROGRESS|UPDATE_IN_PROGRESS|DELETE_IN_PROGRESS|ROLLBACK_IN_PROGRESS)
                local minutes=$((elapsed / 60))
                local seconds=$((elapsed % 60))
                echo -ne "\r${CYAN}⏳ Status: $status... (${minutes}m ${seconds}s)${NC}   "
                sleep 10
                elapsed=$((elapsed + 10))
                ;;
            *)
                sleep 10
                elapsed=$((elapsed + 10))
                ;;
        esac
    done
    
    echo -e "${RED}❌ Timeout aguardando stack (${timeout}s)${NC}"
    return 1
}

# Função para atualizar DNS
update_dns() {
    local hosted_zone_id="$1"
    
    if [ -z "$hosted_zone_id" ] || [ "$hosted_zone_id" = "" ]; then
        echo -e "${YELLOW}⚠️  HostedZoneId não fornecido, pulando atualização DNS${NC}"
        return 0
    fi
    
    echo -e "${CYAN}🌐 Atualizando registro DNS...${NC}"
    
    # Obter informações da EC2
    INSTANCE_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
        echo -e "${YELLOW}⚠️  Instance ID não disponível, pulando atualização DNS${NC}"
        return 0
    fi
    
    PUBLIC_IP=$(aws ec2 describe-instances --profile "$AWS_PROFILE" \
        --instance-ids "$INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" = "None" ]; then
        echo -e "${YELLOW}⚠️  IP público não disponível, pulando atualização DNS${NC}"
        return 0
    fi
    
    # Determinar subdomínio
    DOMAIN_NAME="orfanatonib.com"
    if [ "$ENVIRONMENT" = "staging" ]; then
        SUBDOMAIN="staging-api.${DOMAIN_NAME}"
    elif [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "prod" ]; then
        SUBDOMAIN="api.${DOMAIN_NAME}"
    else
        SUBDOMAIN="${ENVIRONMENT}-api.${DOMAIN_NAME}"
    fi
    
    # Atualizar DNS
    if aws route53 change-resource-record-sets \
        --hosted-zone-id "$hosted_zone_id" \
        --profile "$AWS_PROFILE" \
        --change-batch "{
            \"Changes\": [{
                \"Action\": \"UPSERT\",
                \"ResourceRecordSet\": {
                    \"Name\": \"${SUBDOMAIN}\",
                    \"Type\": \"A\",
                    \"TTL\": 300,
                    \"ResourceRecords\": [{\"Value\": \"${PUBLIC_IP}\"}]
                }
            }]
        }" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ DNS atualizado: ${SUBDOMAIN} -> ${PUBLIC_IP}${NC}"
    else
        echo -e "${YELLOW}⚠️  Erro ao atualizar DNS (pode ser normal se já estiver atualizado)${NC}"
    fi
}

# Função para deletar stack
delete_stack() {
    local current_status=$(get_stack_status)
    
    # Se já está deletada ou não existe
    if [ "$current_status" = "NOT_FOUND" ] || [ "$current_status" = "DELETE_COMPLETE" ]; then
        echo -e "${GREEN}✅ Stack já está deletada${NC}"
        return 0
    fi
    
    # Se já está em processo de deleção
    if [ "$current_status" = "DELETE_IN_PROGRESS" ]; then
        echo -e "${YELLOW}⚠️  Stack já está em processo de deleção, aguardando...${NC}"
        if wait_for_stack "DELETE_COMPLETE|NOT_FOUND" 600; then
            echo -e "${GREEN}✅ Stack deletada com sucesso${NC}"
            return 0
        else
            echo -e "${RED}❌ Timeout aguardando deleção${NC}"
            return 1
        fi
    fi
    
    # Se está em ROLLBACK_IN_PROGRESS, aguardar primeiro chegar em ROLLBACK_COMPLETE
    if [ "$current_status" = "ROLLBACK_IN_PROGRESS" ]; then
        echo -e "${YELLOW}⚠️  Stack em ROLLBACK_IN_PROGRESS, aguardando ROLLBACK_COMPLETE...${NC}"
        if wait_for_stack "ROLLBACK_COMPLETE" 300; then
            echo -e "${CYAN}✅ Rollback completo, iniciando deleção...${NC}"
        else
            echo -e "${YELLOW}⚠️  Rollback demorou, tentando deletar mesmo assim...${NC}"
        fi
    fi
    
    echo -e "${YELLOW}🗑️  Deletando stack $STACK_NAME...${NC}"
    if aws cloudformation delete-stack --stack-name "$STACK_NAME" --profile "$AWS_PROFILE" 2>/dev/null; then
        if wait_for_stack "DELETE_COMPLETE|NOT_FOUND" 600; then
            echo -e "${GREEN}✅ Stack deletada com sucesso${NC}"
            return 0
        else
            echo -e "${RED}❌ Timeout aguardando deleção${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Erro ao iniciar deleção da stack${NC}"
        return 1
    fi
}

# Verificar status atual da stack
echo -e "${CYAN}🔍 Verificando status da stack $STACK_NAME...${NC}"
CURRENT_STATUS=$(get_stack_status)

case "$CURRENT_STATUS" in
    NOT_FOUND)
        echo -e "${GREEN}Criando nova stack $STACK_NAME...${NC}"
        OPERATION="create"
        ;;
    CREATE_COMPLETE|UPDATE_COMPLETE)
        echo -e "${YELLOW}Stack $STACK_NAME já existe (Status: $CURRENT_STATUS)${NC}"
        echo -e "${BLUE}Atualizando stack...${NC}"
        OPERATION="update"
        ;;
    CREATE_IN_PROGRESS|UPDATE_IN_PROGRESS)
        echo -e "${YELLOW}⚠️  Stack $STACK_NAME já está sendo criada/atualizada ($CURRENT_STATUS)${NC}"
        echo -e "${YELLOW}   Aguarde a conclusão antes de atualizar${NC}"
        if wait_for_stack "CREATE_COMPLETE|UPDATE_COMPLETE" 600; then
            echo -e "${GREEN}✅ Stack concluída!${NC}"
            OPERATION="none"
        else
            echo -e "${RED}❌ Stack falhou ou timeout durante criação/atualização${NC}"
            exit 1
        fi
        ;;
    ROLLBACK_COMPLETE|DELETE_COMPLETE)
        echo -e "${YELLOW}⚠️  Stack em estado inválido ($CURRENT_STATUS)${NC}"
        echo -e "${CYAN}🗑️  Deletando stack para recriar...${NC}"
        if delete_stack; then
            echo -e "${GREEN}📦 Criando nova stack...${NC}"
            OPERATION="create"
        else
            echo -e "${RED}❌ Não foi possível deletar stack${NC}"
            exit 1
        fi
        ;;
    ROLLBACK_IN_PROGRESS)
        echo -e "${YELLOW}⚠️  Stack em processo de rollback ($CURRENT_STATUS)${NC}"
        echo -e "${CYAN}⏳ Aguardando rollback completar...${NC}"
        if wait_for_stack "ROLLBACK_COMPLETE" 300; then
            echo -e "${CYAN}🗑️  Rollback completo, deletando stack para recriar...${NC}"
            if delete_stack; then
                echo -e "${GREEN}📦 Criando nova stack...${NC}"
                OPERATION="create"
            else
                echo -e "${RED}❌ Erro ao deletar stack após rollback${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Timeout aguardando rollback${NC}"
            exit 1
        fi
        ;;
    DELETE_IN_PROGRESS)
        echo -e "${YELLOW}⚠️  Stack em processo de deleção ($CURRENT_STATUS)${NC}"
        echo -e "${CYAN}⏳ Aguardando deleção completar...${NC}"
        if wait_for_stack "DELETE_COMPLETE|NOT_FOUND" 600; then
            echo -e "${GREEN}📦 Stack deletada, criando nova...${NC}"
            OPERATION="create"
        else
            echo -e "${RED}❌ Timeout aguardando deleção${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${YELLOW}Stack $STACK_NAME existe com status: $CURRENT_STATUS${NC}"
        echo -e "${BLUE}Tentando atualizar...${NC}"
        OPERATION="update"
        ;;
esac

# Executar deploy
if [ "$OPERATION" = "create" ]; then
    echo -e "${BLUE}📋 Criando stack com template: $TEMPLATE_FILE${NC}"
    echo -e "${BLUE}📋 Usando parâmetros de: $PARAMS_FILE${NC}"
    echo ""
    
    if aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://"$TEMPLATE_FILE" \
        --parameters file://"$PARAMS_FILE" \
        --capabilities CAPABILITY_NAMED_IAM \
        --profile "$AWS_PROFILE" 2>&1; then
        echo ""
        echo -e "${GREEN}✅ Comando de criação enviado com sucesso!${NC}"
        echo ""
        echo -e "${YELLOW}⏳ Aguardando criação (pode levar alguns minutos)...${NC}"
        echo -e "${BLUE}   Você pode acompanhar o progresso com:${NC}"
        echo -e "${BLUE}   aws cloudformation describe-stacks --stack-name $STACK_NAME --profile $AWS_PROFILE${NC}"
    else
        create_error=$?
        echo ""
        echo -e "${RED}❌ Erro ao criar stack (código: $create_error)${NC}"
        exit 1
    fi
elif [ "$OPERATION" = "update" ]; then
    echo -e "${BLUE}📋 Atualizando stack com template: $TEMPLATE_FILE${NC}"
    echo -e "${BLUE}📋 Usando parâmetros de: $PARAMS_FILE${NC}"
    echo ""
    
    update_output=$(aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://"$TEMPLATE_FILE" \
        --parameters file://"$PARAMS_FILE" \
        --capabilities CAPABILITY_NAMED_IAM \
        --profile "$AWS_PROFILE" 2>&1) || true
    update_exit_code=$?
    
    if [ $update_exit_code -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Comando de atualização enviado com sucesso!${NC}"
        echo ""
        echo -e "${YELLOW}⏳ Aguardando atualização (pode levar alguns minutos)...${NC}"
        echo -e "${BLUE}   Você pode acompanhar o progresso com:${NC}"
        echo -e "${BLUE}   aws cloudformation describe-stacks --stack-name $STACK_NAME --profile $AWS_PROFILE${NC}"
    else
        if echo "$update_output" | grep -q "No updates are to be performed"; then
            echo -e "${GREEN}✅ Nenhuma atualização necessária - stack já está atualizada${NC}"
        elif echo "$update_output" | grep -qi "ROLLBACK_COMPLETE\|does not exist"; then
            echo -e "${YELLOW}⚠️  Stack em estado inválido, deletando para recriar...${NC}"
            if delete_stack; then
                echo -e "${GREEN}📦 Criando nova stack...${NC}"
                if aws cloudformation create-stack \
                    --stack-name "$STACK_NAME" \
                    --template-body file://"$TEMPLATE_FILE" \
                    --parameters file://"$PARAMS_FILE" \
                    --capabilities CAPABILITY_NAMED_IAM \
                    --profile "$AWS_PROFILE" 2>&1; then
                    echo -e "${GREEN}✅ Stack criada com sucesso!${NC}"
                else
                    echo -e "${RED}❌ Erro ao recriar stack${NC}"
                    exit 1
                fi
            else
                echo -e "${RED}❌ Erro ao deletar stack para recriar${NC}"
                exit 1
            fi
        else
            echo ""
            echo -e "${RED}❌ Erro ao atualizar stack${NC}"
            echo "$update_output"
            exit 1
        fi
    fi
fi

# Aguardar stack estar completa antes de atualizar DNS
if [ "$OPERATION" != "none" ]; then
    echo ""
    echo -e "${CYAN}⏳ Aguardando stack estar completa para atualizar DNS...${NC}"
    if wait_for_stack "CREATE_COMPLETE|UPDATE_COMPLETE" 600; then
        echo ""
        # Obter HostedZoneId do arquivo de parâmetros
        HOSTED_ZONE_ID=$(grep -A 1 '"ParameterKey": "HostedZoneId"' "$PARAMS_FILE" | \
            grep '"ParameterValue"' | \
            sed 's/.*"ParameterValue": "\([^"]*\)".*/\1/' || echo "")
        
        if [ ! -z "$HOSTED_ZONE_ID" ] && [ "$HOSTED_ZONE_ID" != "" ]; then
            update_dns "$HOSTED_ZONE_ID"
        fi
    fi
fi

echo ""
echo -e "${GREEN}📊 Para ver os outputs quando estiver pronto:${NC}"
echo -e "${BLUE}   aws cloudformation describe-stacks --stack-name $STACK_NAME --profile $AWS_PROFILE --query 'Stacks[0].Outputs'${NC}"



