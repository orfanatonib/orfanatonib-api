#!/bin/bash

# Script unificado para deploy de ACM + EC2
# Faz deploy do certificado SSL primeiro, depois da infraestrutura EC2
# Uso: ./deploy-infrastructure.sh

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Profile AWS
AWS_PROFILE=${AWS_PROFILE:-clubinho-aws}

# Domínio (pode ser sobrescrito com variável de ambiente ou parâmetro)
DOMAIN=${1:-${DOMAIN:-orfanatonib.com}}

# Diretórios e arquivos
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Arquivos ACM
ACM_TEMPLATE="$SCRIPT_DIR/acm-stack.yaml"
ACM_PARAMS="$SCRIPT_DIR/acm-params.json"

# Arquivos EC2
EC2_TEMPLATE="$SCRIPT_DIR/ec2-stack.yaml"
EC2_PARAMS="$SCRIPT_DIR/ec2-params.json"

echo -e "${MAGENTA}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║   🚀 Deploy Infraestrutura - ACM + EC2                ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# VALIDAÇÃO DE PRÉ-REQUISITOS
# ============================================================================

echo -e "${BLUE}🔍 Validando pré-requisitos...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI não instalado${NC}"
    exit 1
fi

# Check Python3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 não instalado (necessário para manipulação JSON)${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
    echo -e "${RED}❌ Credenciais AWS não configuradas para profile: $AWS_PROFILE${NC}"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query 'Account' --output text)
echo -e "${GREEN}✅ AWS CLI configurado (Account: $ACCOUNT_ID)${NC}"
echo -e "${GREEN}✅ Python3 disponível${NC}"
echo -e "${CYAN}📋 AWS Profile: ${AWS_PROFILE}${NC}"
echo -e "${CYAN}📋 Domínio: ${DOMAIN}${NC}"
echo ""

# ============================================================================
# AUTO-DESCOBERTA DE RECURSOS AWS
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📡 Auto-descobrindo Recursos AWS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. VPC
echo -e "${CYAN}🔍 Descobrindo VPC...${NC}"
VPC_ID=$(aws ec2 describe-vpcs \
    --profile "$AWS_PROFILE" \
    --filters "Name=is-default,Values=true" \
    --query 'Vpcs[0].VpcId' \
    --output text 2>/dev/null || echo "")

if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "None" ]; then
    VPC_ID=$(aws ec2 describe-vpcs \
        --profile "$AWS_PROFILE" \
        --query 'Vpcs[0].VpcId' \
        --output text 2>/dev/null || echo "")
fi

if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "None" ]; then
    echo -e "${RED}❌ Nenhuma VPC encontrada!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ VPC: ${VPC_ID}${NC}"

# 2. Subnets Públicas (em AZs que suportam t3.micro)
echo -e "${CYAN}🔍 Descobrindo Subnets públicas...${NC}"

# Buscar subnets públicas e filtrar por AZ válida
ALL_SUBNETS=$(aws ec2 describe-subnets \
    --profile "$AWS_PROFILE" \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=map-public-ip-on-launch,Values=true" \
    --query 'Subnets[*].[SubnetId,AvailabilityZone]' \
    --output text 2>/dev/null || echo "")

# AZs que suportam t3.micro (excluindo us-east-1e)
SUBNETS=""
while IFS=$'\t' read -r subnet_id az; do
    if [[ "$az" != "us-east-1e" ]]; then
        SUBNETS="$SUBNETS $subnet_id"
    fi
done <<< "$ALL_SUBNETS"

SUBNET_STAGING=$(echo "$SUBNETS" | awk '{print $1}')
SUBNET_PROD=$(echo "$SUBNETS" | awk '{print $2}')

if [ -z "$SUBNET_STAGING" ] || [ -z "$SUBNET_PROD" ]; then
    echo -e "${RED}❌ Não foi possível encontrar pelo menos 2 subnets!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Subnet Staging: ${SUBNET_STAGING}${NC}"
echo -e "${GREEN}✅ Subnet Prod: ${SUBNET_PROD}${NC}"

# 3. Hosted Zone
echo -e "${CYAN}🔍 Descobrindo Hosted Zone para ${DOMAIN}...${NC}"
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
    --profile "$AWS_PROFILE" \
    --query "HostedZones[?Name=='${DOMAIN}.'].Id" \
    --output text 2>/dev/null | cut -d'/' -f3 || echo "")

if [ -z "$HOSTED_ZONE_ID" ] || [ "$HOSTED_ZONE_ID" = "None" ]; then
    echo -e "${RED}❌ Hosted Zone não encontrada para ${DOMAIN}${NC}"
    echo -e "${YELLOW}💡 Crie uma Hosted Zone no Route53 para o domínio ${DOMAIN}${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Hosted Zone: ${HOSTED_ZONE_ID}${NC}"

# 4. AMI mais recente (Amazon Linux 2023)
echo -e "${CYAN}🔍 Descobrindo AMI Amazon Linux 2023...${NC}"
AMI_ID=$(aws ec2 describe-images \
    --profile "$AWS_PROFILE" \
    --owners amazon \
    --filters "Name=name,Values=al2023-ami-2023*-x86_64" "Name=state,Values=available" \
    --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
    --output text 2>/dev/null || echo "ami-08d7aabbb50c2c24e")
echo -e "${GREEN}✅ AMI: ${AMI_ID}${NC}"

# 5. Key Pair
echo -e "${CYAN}🔍 Verificando Key Pair...${NC}"
KEY_PAIR_NAME=$(aws ec2 describe-key-pairs \
    --profile "$AWS_PROFILE" \
    --query 'KeyPairs[0].KeyName' \
    --output text 2>/dev/null || echo "orfanato-nib-api")
echo -e "${GREEN}✅ Key Pair: ${KEY_PAIR_NAME}${NC}"

# 6. Região
AWS_REGION=$(aws configure get region --profile "$AWS_PROFILE" 2>/dev/null || echo "us-east-1")
echo -e "${GREEN}✅ Região: ${AWS_REGION}${NC}"

# 7. S3 Bucket
S3_BUCKET_NAME="orfanato-nib-storage"
echo -e "${GREEN}✅ S3 Bucket: ${S3_BUCKET_NAME}${NC}"

echo ""
echo -e "${GREEN}✅ Auto-descoberta concluída!${NC}"
echo ""

# ============================================================================
# ATUALIZAR ARQUIVOS DE PARÂMETROS COM VALORES DESCOBERTOS
# ============================================================================

echo -e "${CYAN}📝 Atualizando arquivos de parâmetros...${NC}"

# Atualizar acm-params.json
cat > "$ACM_PARAMS" <<EOF
[
  {
    "ParameterKey": "DomainName",
    "ParameterValue": "$DOMAIN"
  },
  {
    "ParameterKey": "HostedZoneId",
    "ParameterValue": "$HOSTED_ZONE_ID"
  }
]
EOF

# Validar se arquivo foi criado corretamente
if [ ! -f "$ACM_PARAMS" ]; then
    echo -e "${RED}❌ Erro: Falha ao criar $ACM_PARAMS${NC}"
    exit 1
fi

# Validar JSON
if ! python3 -m json.tool "$ACM_PARAMS" > /dev/null 2>&1; then
    echo -e "${RED}❌ Erro: $ACM_PARAMS contém JSON inválido${NC}"
    cat "$ACM_PARAMS"
    exit 1
fi

echo -e "${GREEN}✅ acm-params.json atualizado e validado${NC}"
echo ""

# Nomes das stacks
ACM_STACK_NAME="orfanato-nib-acm"
EC2_STACK_NAME="orfanato-nib-ec2"

# ============================================================================
# FUNÇÕES AUXILIARES
# ============================================================================

get_stack_status() {
    local stack_name=$1
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --profile "$AWS_PROFILE" \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "NOT_FOUND"
}

wait_for_stack() {
    local stack_name=$1
    local target_statuses=$2
    local timeout=${3:-600}
    local elapsed=0
    local check_interval=10
    local last_status=""
    local status_unchanged_count=0
    local max_unchanged_iterations=30  # 5 minutos sem mudança = problema

    echo -e "${CYAN}⏳ Aguardando stack $stack_name atingir status: $target_statuses${NC}"
    echo -e "${CYAN}   Timeout: ${timeout}s | Check interval: ${check_interval}s${NC}"

    while [ $elapsed -lt $timeout ]; do
        local status=$(get_stack_status "$stack_name")

        # Verificar se status está travado (não muda há muito tempo)
        if [ "$status" = "$last_status" ]; then
            status_unchanged_count=$((status_unchanged_count + 1))
            if [ $status_unchanged_count -ge $max_unchanged_iterations ]; then
                echo -e "\n${RED}❌ Stack travada! Status '$status' sem mudança há $((status_unchanged_count * check_interval))s${NC}"
                echo -e "${YELLOW}⚠️  Possível problema na operação CloudFormation${NC}"
                return 3  # Código especial para status travado
            fi
        else
            status_unchanged_count=0
        fi
        last_status="$status"

        # Verificar se atingiu algum dos estados alvo
        for target in $(echo "$target_statuses" | tr '|' ' '); do
            if [ "$status" = "$target" ]; then
                echo -e "\n${GREEN}✅ Stack atingiu status: $status (${elapsed}s)${NC}"
                return 0
            fi
        done

        case "$status" in
            NOT_FOUND)
                # Stack não existe - isso pode ser esperado durante DELETE
                if echo "$target_statuses" | grep -q "NOT_FOUND"; then
                    echo -e "\n${GREEN}✅ Stack não encontrada (esperado)${NC}"
                    return 0
                else
                    echo -e "\n${RED}❌ Stack não encontrada inesperadamente${NC}"
                    return 1
                fi
                ;;
            ROLLBACK_COMPLETE)
                echo -e "\n${YELLOW}⚠️  Stack em estado ROLLBACK_COMPLETE (não pode ser atualizada)${NC}"
                return 2  # Código especial para indicar que precisa deletar
                ;;
            CREATE_FAILED|UPDATE_FAILED|DELETE_FAILED|UPDATE_ROLLBACK_FAILED)
                echo -e "\n${RED}❌ Stack falhou com status: $status${NC}"
                echo -e "${YELLOW}💡 Logs de erro:${NC}"
                aws cloudformation describe-stack-events \
                    --stack-name "$stack_name" \
                    --profile "$AWS_PROFILE" \
                    --max-items 5 \
                    --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[LogicalResourceId,ResourceStatusReason]' \
                    --output table 2>/dev/null || echo "Não foi possível obter logs"
                return 1
                ;;
            UPDATE_ROLLBACK_COMPLETE|UPDATE_ROLLBACK_IN_PROGRESS)
                echo -e "\n${YELLOW}⚠️  Update falhou, rollback em progresso/completo: $status${NC}"
                if echo "$target_statuses" | grep -q "UPDATE_ROLLBACK_COMPLETE"; then
                    echo -e "${GREEN}✅ Rollback completo (esperado)${NC}"
                    return 0
                else
                    return 2  # Precisa deletar e recriar
                fi
                ;;
            CREATE_IN_PROGRESS|UPDATE_IN_PROGRESS|DELETE_IN_PROGRESS|ROLLBACK_IN_PROGRESS|UPDATE_COMPLETE_CLEANUP_IN_PROGRESS)
                local minutes=$((elapsed / 60))
                local seconds=$((elapsed % 60))
                local percent=$((elapsed * 100 / timeout))
                echo -ne "\r${CYAN}⏳ Status: $status... (${minutes}m ${seconds}s / ${timeout}s - ${percent}%)${NC}   "
                sleep $check_interval
                elapsed=$((elapsed + check_interval))
                ;;
            *)
                echo -e "\n${YELLOW}⚠️  Status desconhecido/inesperado: $status${NC}"
                sleep $check_interval
                elapsed=$((elapsed + check_interval))
                ;;
        esac
    done

    echo -e "\n${RED}❌ TIMEOUT! Stack não atingiu status esperado em ${timeout}s${NC}"
    echo -e "${YELLOW}⚠️  Status atual: $last_status${NC}"
    echo -e "${YELLOW}💡 Verifique o console AWS CloudFormation para mais detalhes${NC}"
    return 1
}

delete_stack() {
    local stack_name=$1
    local status=$(get_stack_status "$stack_name")
    local max_retries=3
    local retry_count=0

    echo -e "${CYAN}🔍 Verificando stack $stack_name antes de deletar...${NC}"

    if [ "$status" = "NOT_FOUND" ] || [ "$status" = "DELETE_COMPLETE" ]; then
        echo -e "${GREEN}✅ Stack $stack_name já está deletada${NC}"
        return 0
    fi

    # Verificar se stack está em estado que permite deleção
    case "$status" in
        DELETE_IN_PROGRESS)
            echo -e "${YELLOW}⚠️  Stack já está sendo deletada, aguardando...${NC}"
            if wait_for_stack "$stack_name" "DELETE_COMPLETE|NOT_FOUND" 600; then
                echo -e "${GREEN}✅ Stack deletada com sucesso${NC}"
                return 0
            else
                echo -e "${RED}❌ Erro aguardando deleção da stack${NC}"
                return 1
            fi
            ;;
        CREATE_IN_PROGRESS|UPDATE_IN_PROGRESS|ROLLBACK_IN_PROGRESS)
            echo -e "${YELLOW}⚠️  Stack em operação ($status), aguardando conclusão antes de deletar...${NC}"
            # Aguardar operação atual completar (com timeout menor)
            wait_for_stack "$stack_name" "CREATE_COMPLETE|UPDATE_COMPLETE|ROLLBACK_COMPLETE|CREATE_FAILED|UPDATE_FAILED" 300 || true
            status=$(get_stack_status "$stack_name")
            echo -e "${CYAN}Status atualizado: $status${NC}"
            ;;
    esac

    # Tentar deletar com retry
    while [ $retry_count -lt $max_retries ]; do
        retry_count=$((retry_count + 1))
        echo -e "${YELLOW}🗑️  Deletando stack $stack_name (tentativa $retry_count/$max_retries)...${NC}"

        if aws cloudformation delete-stack --stack-name "$stack_name" --profile "$AWS_PROFILE" 2>&1; then
            echo -e "${CYAN}✅ Comando de deleção enviado${NC}"

            if wait_for_stack "$stack_name" "DELETE_COMPLETE|NOT_FOUND" 600; then
                echo -e "${GREEN}✅ Stack deletada com sucesso${NC}"
                return 0
            else
                local wait_exit_code=$?
                if [ $wait_exit_code -eq 3 ]; then
                    echo -e "${YELLOW}⚠️  Stack travada durante deleção, tentando novamente...${NC}"
                    sleep 5
                    continue
                else
                    echo -e "${RED}❌ Erro ao aguardar deleção da stack${NC}"
                    if [ $retry_count -lt $max_retries ]; then
                        echo -e "${YELLOW}⏳ Aguardando 10s antes de tentar novamente...${NC}"
                        sleep 10
                    fi
                fi
            fi
        else
            echo -e "${RED}❌ Erro ao enviar comando de deleção${NC}"
            if [ $retry_count -lt $max_retries ]; then
                echo -e "${YELLOW}⏳ Aguardando 10s antes de tentar novamente...${NC}"
                sleep 10
            fi
        fi
    done

    echo -e "${RED}❌ Falha ao deletar stack após $max_retries tentativas${NC}"
    echo -e "${YELLOW}💡 Você pode tentar deletar manualmente pelo console AWS${NC}"
    return 1
}

# ============================================================================
# PASSO 1: VERIFICAR/DEPLOY DO CERTIFICADO SSL (ACM)
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 PASSO 1: Verificar/Deploy do Certificado SSL (ACM)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar se já existe certificado VÁLIDO para o domínio
echo -e "${CYAN}🔍 Buscando certificados ACM existentes para o domínio ${DOMAIN}...${NC}"

ALL_CERTS=$(aws acm list-certificates --profile "$AWS_PROFILE" --query 'CertificateSummaryList[].CertificateArn' --output text 2>/dev/null || echo "")

EXISTING_VALID_CERT=""
if [ -n "$ALL_CERTS" ]; then
    for ARN in $ALL_CERTS; do
        # Verificar SANs e status deste certificado
        CERT_INFO=$(aws acm describe-certificate \
            --certificate-arn "$ARN" \
            --profile "$AWS_PROFILE" \
            --output json 2>/dev/null || echo "{}")

        # Verificar se certificado é do domínio e está ISSUED
        IS_VALID=$(echo "$CERT_INFO" | python3 -c "
import json, sys
try:
    cert = json.load(sys.stdin).get('Certificate', {})
    sans = cert.get('SubjectAlternativeNames', [])
    status = cert.get('Status', '')
    domain = '$DOMAIN'

    # Verificar se tem o domínio nos SANs E está ISSUED
    has_domain = domain in sans or f'*.{domain}' in sans or f'api.{domain}' in sans or f'staging-api.{domain}' in sans
    if has_domain and status == 'ISSUED':
        print('yes')
    else:
        print('no')
except:
    print('no')
" 2>/dev/null || echo "no")

        if [ "$IS_VALID" = "yes" ]; then
            echo -e "${GREEN}✅ Certificado VÁLIDO já existe para o domínio: $ARN${NC}"
            EXISTING_VALID_CERT="$ARN"
            break
        fi
    done
fi

# Se encontrou certificado válido, REUTILIZAR ao invés de criar novo
if [ -n "$EXISTING_VALID_CERT" ]; then
    echo -e "${GREEN}✅ Reutilizando certificado existente (evita limite da AWS)${NC}"
    CERT_ARN="$EXISTING_VALID_CERT"
    SKIP_ACM_CREATION=true
else
    echo -e "${CYAN}📋 Nenhum certificado válido encontrado, criando novo para o domínio ${DOMAIN}${NC}"
    SKIP_ACM_CREATION=false
fi

if [ "$SKIP_ACM_CREATION" != "true" ]; then
    echo ""
    echo -e "${BLUE}📦 Criando/Atualizando stack ACM...${NC}"

    # Verificar arquivos ACM
    if [ ! -f "$ACM_TEMPLATE" ] || [ ! -f "$ACM_PARAMS" ]; then
        echo -e "${RED}❌ Erro: Arquivos ACM não encontrados${NC}"
        echo -e "${RED}   Template: $ACM_TEMPLATE${NC}"
        echo -e "${RED}   Params: $ACM_PARAMS${NC}"
        exit 1
    fi

    ACM_STATUS=$(get_stack_status "$ACM_STACK_NAME")
    echo -e "${CYAN}🔍 Status da stack ACM: ${ACM_STATUS}${NC}"

    # SEMPRE deletar stack ACM em estado inválido antes de criar
    if [ "$ACM_STATUS" = "ROLLBACK_COMPLETE" ] || [ "$ACM_STATUS" = "DELETE_COMPLETE" ] || [ "$ACM_STATUS" = "CREATE_FAILED" ]; then
        echo -e "${YELLOW}⚠️  Stack ACM em estado inválido ($ACM_STATUS)${NC}"
        echo -e "${YELLOW}🗑️  Deletando stack ACM antes de recriar...${NC}"

        if ! delete_stack "$ACM_STACK_NAME"; then
            echo -e "${RED}❌ Falha ao deletar stack ACM${NC}"
            exit 1
        fi

        # Atualizar status após deleção
        ACM_STATUS="NOT_FOUND"
        echo -e "${CYAN}✅ Stack ACM deletada, status atualizado: ${ACM_STATUS}${NC}"
    fi

case "$ACM_STATUS" in
    NOT_FOUND)
        echo -e "${GREEN}📦 Criando nova stack ACM...${NC}"
        aws cloudformation create-stack \
            --stack-name "$ACM_STACK_NAME" \
            --template-body file://"$ACM_TEMPLATE" \
            --parameters file://"$ACM_PARAMS" \
            --profile "$AWS_PROFILE" \
            --capabilities CAPABILITY_NAMED_IAM

        if ! wait_for_stack "$ACM_STACK_NAME" "CREATE_COMPLETE" 600; then
            wait_result=$?

            if [ $wait_result -eq 2 ]; then
                # ROLLBACK_COMPLETE detectado, deletar e recriar
                echo -e "${YELLOW}🔄 Stack em ROLLBACK_COMPLETE, deletando e recriando...${NC}"
                if ! delete_stack "$ACM_STACK_NAME"; then
                    echo -e "${RED}❌ Falha ao deletar stack ACM${NC}"
                    exit 1
                fi

                echo -e "${CYAN}📦 Recriando stack ACM...${NC}"
                if ! aws cloudformation create-stack \
                    --stack-name "$ACM_STACK_NAME" \
                    --template-body file://"$ACM_TEMPLATE" \
                    --parameters file://"$ACM_PARAMS" \
                    --profile "$AWS_PROFILE" \
                    --capabilities CAPABILITY_NAMED_IAM 2>&1; then
                    echo -e "${RED}❌ Falha ao recriar stack ACM${NC}"
                    exit 1
                fi

                if ! wait_for_stack "$ACM_STACK_NAME" "CREATE_COMPLETE" 600; then
                    echo -e "${RED}❌ Stack ACM falhou novamente após recriação${NC}"
                    exit 1
                fi
            elif [ $wait_result -eq 3 ]; then
                echo -e "${RED}❌ Stack ACM travada! Operação abortada${NC}"
                exit 1
            else
                echo -e "${RED}❌ Erro ao criar stack ACM${NC}"
                exit 1
            fi
        fi

        echo -e "${GREEN}✅ Stack ACM criada com sucesso!${NC}"
        ;;
    CREATE_COMPLETE|UPDATE_COMPLETE)
        echo -e "${GREEN}✅ Stack ACM já existe${NC}"
        echo -e "${BLUE}🔄 Atualizando stack ACM...${NC}"

        update_output=$(aws cloudformation update-stack \
            --stack-name "$ACM_STACK_NAME" \
            --template-body file://"$ACM_TEMPLATE" \
            --parameters file://"$ACM_PARAMS" \
            --profile "$AWS_PROFILE" \
            --capabilities CAPABILITY_NAMED_IAM 2>&1) || true

        if echo "$update_output" | grep -q "No updates are to be performed"; then
            echo -e "${GREEN}✅ Nenhuma atualização necessária${NC}"
        elif echo "$update_output" | grep -q "StackId"; then
            if ! wait_for_stack "$ACM_STACK_NAME" "UPDATE_COMPLETE" 600; then
                wait_result=$?

                if [ $wait_result -eq 2 ]; then
                    # ROLLBACK_COMPLETE detectado, deletar e recriar
                    echo -e "${YELLOW}🔄 Update falhou, deletando e recriando...${NC}"
                    if ! delete_stack "$ACM_STACK_NAME"; then
                        echo -e "${RED}❌ Falha ao deletar stack ACM${NC}"
                        exit 1
                    fi

                    echo -e "${CYAN}📦 Recriando stack ACM...${NC}"
                    if ! aws cloudformation create-stack \
                        --stack-name "$ACM_STACK_NAME" \
                        --template-body file://"$ACM_TEMPLATE" \
                        --parameters file://"$ACM_PARAMS" \
                        --profile "$AWS_PROFILE" \
                        --capabilities CAPABILITY_NAMED_IAM 2>&1; then
                        echo -e "${RED}❌ Falha ao recriar stack ACM${NC}"
                        exit 1
                    fi

                    if ! wait_for_stack "$ACM_STACK_NAME" "CREATE_COMPLETE" 600; then
                        echo -e "${RED}❌ Stack ACM falhou após recriação${NC}"
                        exit 1
                    fi
                elif [ $wait_result -eq 3 ]; then
                    echo -e "${RED}❌ Stack ACM travada! Operação abortada${NC}"
                    exit 1
                else
                    echo -e "${RED}❌ Erro ao atualizar stack ACM${NC}"
                    exit 1
                fi
            fi

            echo -e "${GREEN}✅ Stack ACM atualizada!${NC}"
        else
            echo -e "${YELLOW}⚠️  Resposta de update desconhecida:${NC}"
            echo "$update_output"
            echo -e "${YELLOW}⚠️  Continuando...${NC}"
        fi
        ;;
    ROLLBACK_COMPLETE|DELETE_COMPLETE)
        echo -e "${YELLOW}⚠️  Stack em estado inválido ($ACM_STATUS), deletando e recriando...${NC}"
        if delete_stack "$ACM_STACK_NAME"; then
            echo -e "${GREEN}📦 Recriando stack ACM...${NC}"
            aws cloudformation create-stack \
                --stack-name "$ACM_STACK_NAME" \
                --template-body file://"$ACM_TEMPLATE" \
                --parameters file://"$ACM_PARAMS" \
                --profile "$AWS_PROFILE" \
                --capabilities CAPABILITY_NAMED_IAM

            wait_for_stack "$ACM_STACK_NAME" "CREATE_COMPLETE" 600
        fi
        ;;
    *)
        echo -e "${YELLOW}⚠️  Status atual: $ACM_STATUS, aguardando...${NC}"
        wait_for_stack "$ACM_STACK_NAME" "CREATE_COMPLETE|UPDATE_COMPLETE" 600
        ;;
esac

    echo ""
    echo -e "${CYAN}🔍 Obtendo ARN do certificado da stack...${NC}"
    CERT_ARN=$(aws cloudformation describe-stacks \
        --stack-name "$ACM_STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --query 'Stacks[0].Outputs[?OutputKey==`CertificateArn`].OutputValue' \
        --output text 2>/dev/null || echo "")

    if [ -z "$CERT_ARN" ] || [ "$CERT_ARN" = "None" ]; then
        echo -e "${RED}❌ Erro: Não foi possível obter o ARN do certificado da stack${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Certificado ARN obtido da stack: ${CERT_ARN}${NC}"
fi

echo ""

# Validar se CERT_ARN foi obtido
if [ -z "$CERT_ARN" ] || [ "$CERT_ARN" = "None" ]; then
    echo -e "${RED}❌ Erro: CERT_ARN está vazio ou inválido${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Certificado SSL pronto: ${CERT_ARN}${NC}"
echo ""

# ============================================================================
# PASSO 2: VALIDAR CERTIFICADO SSL
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔒 PASSO 2: Validando Certificado SSL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}🔍 Verificando status do certificado...${NC}"

# Verificar status atual com retry (caso API falhe temporariamente)
MAX_API_RETRIES=3
API_RETRY_COUNT=0
CERT_STATUS=""

while [ $API_RETRY_COUNT -lt $MAX_API_RETRIES ]; do
    CERT_STATUS=$(aws acm describe-certificate \
        --certificate-arn "$CERT_ARN" \
        --profile "$AWS_PROFILE" \
        --query 'Certificate.Status' \
        --output text 2>/dev/null || echo "")

    if [ -n "$CERT_STATUS" ] && [ "$CERT_STATUS" != "None" ]; then
        break
    fi

    API_RETRY_COUNT=$((API_RETRY_COUNT + 1))
    if [ $API_RETRY_COUNT -lt $MAX_API_RETRIES ]; then
        echo -e "${YELLOW}⚠️  Falha ao obter status do certificado, tentando novamente... ($API_RETRY_COUNT/$MAX_API_RETRIES)${NC}"
        sleep 5
    fi
done

if [ -z "$CERT_STATUS" ] || [ "$CERT_STATUS" = "None" ]; then
    echo -e "${RED}❌ Erro: Não foi possível obter status do certificado${NC}"
    exit 1
fi

if [ "$CERT_STATUS" = "ISSUED" ]; then
    echo -e "${GREEN}✅ Certificado já está validado e emitido!${NC}"
    echo ""
else
    # Se não estiver ISSUED, aguardar validação
    echo -e "${YELLOW}⏳ Status atual: $CERT_STATUS${NC}"
    echo -e "${CYAN}Aguardando validação DNS...${NC}"

    MAX_RETRIES=60  # 10 minutos total
    RETRY_COUNT=0
    SLEEP_TIME=10
    LAST_STATUS=""
    STATUS_UNCHANGED_COUNT=0
    MAX_UNCHANGED=30  # 5 minutos sem mudança = problema

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        CERT_STATUS=$(aws acm describe-certificate \
            --certificate-arn "$CERT_ARN" \
            --profile "$AWS_PROFILE" \
            --query 'Certificate.Status' \
            --output text 2>/dev/null || echo "")

        # Verificar se status está travado
        if [ "$CERT_STATUS" = "$LAST_STATUS" ] && [ "$CERT_STATUS" = "PENDING_VALIDATION" ]; then
            STATUS_UNCHANGED_COUNT=$((STATUS_UNCHANGED_COUNT + 1))
            if [ $STATUS_UNCHANGED_COUNT -ge $MAX_UNCHANGED ]; then
                echo -e "\n${RED}❌ Certificado travado em PENDING_VALIDATION por $((STATUS_UNCHANGED_COUNT * SLEEP_TIME))s${NC}"
                echo -e "${YELLOW}💡 Possíveis causas:${NC}"
                echo -e "${YELLOW}   - Registros DNS de validação não foram criados no Route53${NC}"
                echo -e "${YELLOW}   - DNS não propagou ainda (pode levar até 1 hora)${NC}"
                echo -e "${YELLOW}   - Hosted Zone incorreta${NC}"
                echo -e "${YELLOW}⚠️  Verifique o console ACM e Route53${NC}"
                exit 1
            fi
        else
            STATUS_UNCHANGED_COUNT=0
        fi
        LAST_STATUS="$CERT_STATUS"

        if [ "$CERT_STATUS" = "ISSUED" ]; then
            echo -e "\n${GREEN}✅ Certificado validado e emitido com sucesso!${NC}"
            echo ""
            break
        elif [ "$CERT_STATUS" = "PENDING_VALIDATION" ]; then
            RETRY_COUNT=$((RETRY_COUNT + 1))
            MINUTES=$((RETRY_COUNT * SLEEP_TIME / 60))
            PERCENT=$((RETRY_COUNT * 100 / MAX_RETRIES))
            echo -ne "\r${CYAN}⏳ Aguardando validação DNS... ($RETRY_COUNT/$MAX_RETRIES - ${MINUTES}m - ${PERCENT}%)${NC}   "
            sleep $SLEEP_TIME
        elif [ "$CERT_STATUS" = "VALIDATION_TIMED_OUT" ] || [ "$CERT_STATUS" = "FAILED" ]; then
            echo -e "\n${RED}❌ Certificado falhou com status: $CERT_STATUS${NC}"
            echo -e "${YELLOW}⚠️  Verifique os registros DNS no Route53${NC}"
            exit 1
        else
            echo -e "\n${RED}❌ Status inesperado do certificado: $CERT_STATUS${NC}"
            exit 1
        fi
    done

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "\n${RED}❌ TIMEOUT aguardando validação do certificado ($((MAX_RETRIES * SLEEP_TIME))s)${NC}"
        echo -e "${YELLOW}⚠️  Certificado ainda está em: $CERT_STATUS${NC}"
        echo -e "${YELLOW}💡 Verifique os registros DNS no Route53 e tente novamente${NC}"
        exit 1
    fi
fi

# ============================================================================
# PASSO 3: ATUALIZAR EC2-PARAMS.JSON COM TODOS OS VALORES DESCOBERTOS
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 PASSO 3: Atualizando ec2-params.json com valores descobertos${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Atualizar ec2-params.json com TODOS os valores descobertos + certificado
cat > "$EC2_PARAMS" <<EOF
[
  {
    "ParameterKey": "VpcId",
    "ParameterValue": "$VPC_ID"
  },
  {
    "ParameterKey": "SubnetStaging",
    "ParameterValue": "$SUBNET_STAGING"
  },
  {
    "ParameterKey": "SubnetProd",
    "ParameterValue": "$SUBNET_PROD"
  },
  {
    "ParameterKey": "HostedZoneId",
    "ParameterValue": "$HOSTED_ZONE_ID"
  },
  {
    "ParameterKey": "DomainName",
    "ParameterValue": "$DOMAIN"
  },
  {
    "ParameterKey": "SSLCertificateArn",
    "ParameterValue": "$CERT_ARN"
  },
  {
    "ParameterKey": "AMIId",
    "ParameterValue": "$AMI_ID"
  },
  {
    "ParameterKey": "KeyPairName",
    "ParameterValue": "$KEY_PAIR_NAME"
  },
  {
    "ParameterKey": "AllowedCIDR",
    "ParameterValue": "0.0.0.0/0"
  },
  {
    "ParameterKey": "InstanceTypeStaging",
    "ParameterValue": "t3.micro"
  },
  {
    "ParameterKey": "InstanceTypeProd",
    "ParameterValue": "t3.micro"
  },
  {
    "ParameterKey": "AWSRegion",
    "ParameterValue": "$AWS_REGION"
  },
  {
    "ParameterKey": "S3BucketName",
    "ParameterValue": "$S3_BUCKET_NAME"
  }
]
EOF

# Validar se arquivo foi criado corretamente
if [ ! -f "$EC2_PARAMS" ]; then
    echo -e "${RED}❌ Erro: Falha ao criar $EC2_PARAMS${NC}"
    exit 1
fi

# Validar JSON
if ! python3 -m json.tool "$EC2_PARAMS" > /dev/null 2>&1; then
    echo -e "${RED}❌ Erro: $EC2_PARAMS contém JSON inválido${NC}"
    cat "$EC2_PARAMS"
    exit 1
fi

# Validar que valores críticos não estão vazios
echo -e "${CYAN}🔍 Validando valores críticos no ec2-params.json...${NC}"
CRITICAL_PARAMS=("VpcId" "SubnetStaging" "SubnetProd" "SSLCertificateArn" "HostedZoneId" "AMIId")
for param in "${CRITICAL_PARAMS[@]}"; do
    VALUE=$(python3 -c "import json; data=json.load(open('$EC2_PARAMS')); print([p['ParameterValue'] for p in data if p['ParameterKey']=='$param'][0])" 2>/dev/null || echo "")
    if [ -z "$VALUE" ] || [ "$VALUE" = "None" ]; then
        echo -e "${RED}❌ Erro: Parâmetro crítico '$param' está vazio ou inválido${NC}"
        exit 1
    fi
    echo -e "${GREEN}   ✅ $param: $VALUE${NC}"
done

echo -e "${GREEN}✅ ec2-params.json atualizado, validado e com todos os valores críticos${NC}"
echo ""

# ============================================================================
# PASSO 4: DEPLOY DA STACK EC2
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 PASSO 4: Deploy da Stack EC2${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

EC2_STATUS=$(get_stack_status "$EC2_STACK_NAME")
echo -e "${CYAN}🔍 Status da stack EC2: ${EC2_STATUS}${NC}"

case "$EC2_STATUS" in
    NOT_FOUND)
        echo -e "${GREEN}📦 Criando nova stack EC2...${NC}"
        if ! aws cloudformation create-stack \
            --stack-name "$EC2_STACK_NAME" \
            --template-body file://"$EC2_TEMPLATE" \
            --parameters file://"$EC2_PARAMS" \
            --capabilities CAPABILITY_NAMED_IAM \
            --profile "$AWS_PROFILE" 2>&1; then
            echo -e "${RED}❌ Falha ao enviar comando de criação da stack EC2${NC}"
            exit 1
        fi

        if ! wait_for_stack "$EC2_STACK_NAME" "CREATE_COMPLETE" 900; then
            wait_result=$?

            if [ $wait_result -eq 2 ]; then
                # ROLLBACK_COMPLETE detectado, deletar e recriar
                echo -e "${YELLOW}🔄 Stack em ROLLBACK_COMPLETE, deletando e recriando...${NC}"
                if ! delete_stack "$EC2_STACK_NAME"; then
                    echo -e "${RED}❌ Falha ao deletar stack EC2${NC}"
                    exit 1
                fi

                echo -e "${CYAN}📦 Recriando stack EC2...${NC}"
                if ! aws cloudformation create-stack \
                    --stack-name "$EC2_STACK_NAME" \
                    --template-body file://"$EC2_TEMPLATE" \
                    --parameters file://"$EC2_PARAMS" \
                    --capabilities CAPABILITY_NAMED_IAM \
                    --profile "$AWS_PROFILE" 2>&1; then
                    echo -e "${RED}❌ Falha ao recriar stack EC2${NC}"
                    exit 1
                fi

                if ! wait_for_stack "$EC2_STACK_NAME" "CREATE_COMPLETE" 900; then
                    echo -e "${RED}❌ Stack EC2 falhou novamente após recriação${NC}"
                    exit 1
                fi
            elif [ $wait_result -eq 3 ]; then
                echo -e "${RED}❌ Stack EC2 travada! Operação abortada${NC}"
                exit 1
            else
                echo -e "${RED}❌ Erro ao criar stack EC2${NC}"
                exit 1
            fi
        fi

        echo -e "${GREEN}✅ Stack EC2 criada com sucesso!${NC}"
        ;;
    CREATE_COMPLETE|UPDATE_COMPLETE)
        echo -e "${GREEN}✅ Stack EC2 já existe${NC}"
        echo -e "${BLUE}🔄 Atualizando stack EC2...${NC}"

        update_output=$(aws cloudformation update-stack \
            --stack-name "$EC2_STACK_NAME" \
            --template-body file://"$EC2_TEMPLATE" \
            --parameters file://"$EC2_PARAMS" \
            --capabilities CAPABILITY_NAMED_IAM \
            --profile "$AWS_PROFILE" 2>&1) || true

        if echo "$update_output" | grep -q "No updates are to be performed"; then
            echo -e "${GREEN}✅ Nenhuma atualização necessária${NC}"
        elif echo "$update_output" | grep -q "StackId"; then
            if ! wait_for_stack "$EC2_STACK_NAME" "UPDATE_COMPLETE" 900; then
                wait_result=$?

                if [ $wait_result -eq 2 ]; then
                    # ROLLBACK_COMPLETE detectado, deletar e recriar
                    echo -e "${YELLOW}🔄 Update falhou, deletando e recriando...${NC}"
                    if ! delete_stack "$EC2_STACK_NAME"; then
                        echo -e "${RED}❌ Falha ao deletar stack EC2${NC}"
                        exit 1
                    fi

                    echo -e "${CYAN}📦 Recriando stack EC2...${NC}"
                    if ! aws cloudformation create-stack \
                        --stack-name "$EC2_STACK_NAME" \
                        --template-body file://"$EC2_TEMPLATE" \
                        --parameters file://"$EC2_PARAMS" \
                        --capabilities CAPABILITY_NAMED_IAM \
                        --profile "$AWS_PROFILE" 2>&1; then
                        echo -e "${RED}❌ Falha ao recriar stack EC2${NC}"
                        exit 1
                    fi

                    if ! wait_for_stack "$EC2_STACK_NAME" "CREATE_COMPLETE" 900; then
                        echo -e "${RED}❌ Stack EC2 falhou após recriação${NC}"
                        exit 1
                    fi
                elif [ $wait_result -eq 3 ]; then
                    echo -e "${RED}❌ Stack EC2 travada! Operação abortada${NC}"
                    exit 1
                else
                    echo -e "${RED}❌ Erro ao atualizar stack EC2${NC}"
                    exit 1
                fi
            fi

            echo -e "${GREEN}✅ Stack EC2 atualizada!${NC}"
        else
            echo -e "${YELLOW}⚠️  Resposta de update desconhecida:${NC}"
            echo "$update_output"
            echo -e "${YELLOW}⚠️  Continuando...${NC}"
        fi
        ;;
    ROLLBACK_COMPLETE|DELETE_COMPLETE|UPDATE_ROLLBACK_COMPLETE)
        echo -e "${YELLOW}⚠️  Stack em estado inválido ($EC2_STATUS), deletando e recriando...${NC}"
        if delete_stack "$EC2_STACK_NAME"; then
            echo -e "${GREEN}📦 Recriando stack EC2...${NC}"
            if ! aws cloudformation create-stack \
                --stack-name "$EC2_STACK_NAME" \
                --template-body file://"$EC2_TEMPLATE" \
                --parameters file://"$EC2_PARAMS" \
                --capabilities CAPABILITY_NAMED_IAM \
                --profile "$AWS_PROFILE" 2>&1; then
                echo -e "${RED}❌ Falha ao recriar stack EC2${NC}"
                exit 1
            fi

            if ! wait_for_stack "$EC2_STACK_NAME" "CREATE_COMPLETE" 900; then
                echo -e "${RED}❌ Stack EC2 falhou após recriação${NC}"
                exit 1
            fi

            echo -e "${GREEN}✅ Stack EC2 recriada com sucesso!${NC}"
        else
            echo -e "${RED}❌ Falha ao deletar stack EC2${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${YELLOW}⚠️  Status atual: $EC2_STATUS, aguardando...${NC}"
        wait_for_stack "$EC2_STACK_NAME" "CREATE_COMPLETE|UPDATE_COMPLETE" 900
        ;;
esac

# ============================================================================
# PASSO 5: VALIDAÇÃO FINAL DA INFRAESTRUTURA
# ============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 PASSO 5: Validando Infraestrutura${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get EC2 instance IDs
STAGING_INSTANCE_ID=$(aws cloudformation describe-stacks \
    --stack-name "$EC2_STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --query 'Stacks[0].Outputs[?OutputKey==`InstanceIdStaging`].OutputValue' \
    --output text 2>/dev/null || echo "")

PROD_INSTANCE_ID=$(aws cloudformation describe-stacks \
    --stack-name "$EC2_STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --query 'Stacks[0].Outputs[?OutputKey==`InstanceIdProd`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$STAGING_INSTANCE_ID" ]; then
    STAGING_STATE=$(aws ec2 describe-instances \
        --instance-ids "$STAGING_INSTANCE_ID" \
        --profile "$AWS_PROFILE" \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text)
    echo -e "${CYAN}   Staging Instance ($STAGING_INSTANCE_ID): $STAGING_STATE${NC}"
fi

if [ -n "$PROD_INSTANCE_ID" ]; then
    PROD_STATE=$(aws ec2 describe-instances \
        --instance-ids "$PROD_INSTANCE_ID" \
        --profile "$AWS_PROFILE" \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text)
    echo -e "${CYAN}   Production Instance ($PROD_INSTANCE_ID): $PROD_STATE${NC}"
fi

# Get ALB DNS
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name "$EC2_STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --query 'Stacks[0].Outputs[?OutputKey==`ALBDNS`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$ALB_DNS" ]; then
    echo -e "${GREEN}   ✅ Load Balancer: $ALB_DNS${NC}"
fi

# Get application URLs from stack outputs
STAGING_URL=$(aws cloudformation describe-stacks \
    --stack-name "$EC2_STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --query 'Stacks[0].Outputs[?OutputKey==`StagingURL`].OutputValue' \
    --output text 2>/dev/null || echo "")

PROD_URL=$(aws cloudformation describe-stacks \
    --stack-name "$EC2_STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --query 'Stacks[0].Outputs[?OutputKey==`ProdURL`].OutputValue' \
    --output text 2>/dev/null || echo "")

echo ""
if [ -n "$STAGING_URL" ]; then
    echo -e "${GREEN}   ✅ Staging URL: $STAGING_URL${NC}"
fi

if [ -n "$PROD_URL" ]; then
    echo -e "${GREEN}   ✅ Production URL: $PROD_URL${NC}"
fi

echo ""
echo -e "${GREEN}✅ Validação da infraestrutura completa${NC}"
echo -e "${CYAN}ℹ️  Ambas as instâncias (Staging + Production) foram criadas no mesmo deploy${NC}"

# ============================================================================
# RESUMO FINAL
# ============================================================================

echo ""
echo -e "${MAGENTA}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║          ✅ Deploy de Infraestrutura Completo!         ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}📋 Resumo:${NC}"
echo -e "${CYAN}   ✅ Stack ACM: ${ACM_STACK_NAME}${NC}"
echo -e "${CYAN}   ✅ Stack EC2: ${EC2_STACK_NAME}${NC}"
echo -e "${CYAN}   ✅ Certificado: ${CERT_ARN}${NC}"
echo -e "${CYAN}   ✅ Instâncias: Staging + Production (criadas simultaneamente)${NC}"
echo ""

echo -e "${YELLOW}🌐 URLs da API:${NC}"
echo -e "${CYAN}   Staging: https://staging-api.orfanatonib.com${NC}"
echo -e "${CYAN}   Production: https://api.orfanatonib.com${NC}"
echo ""

echo -e "${BLUE}💡 Próximo passo - Deploy da aplicação:${NC}"
echo -e "${CYAN}   Para Staging:${NC}"
echo -e "${CYAN}   cd $SCRIPT_DIR && bash deploy-complete.sh staging${NC}"
echo ""
echo -e "${CYAN}   Para Production:${NC}"
echo -e "${CYAN}   cd $SCRIPT_DIR && bash deploy-complete.sh prod${NC}"
echo ""
echo -e "${YELLOW}ℹ️  Nota: Ambas as instâncias estão prontas. Você pode fazer deploy em qualquer uma.${NC}"
echo ""
