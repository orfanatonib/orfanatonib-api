#!/bin/bash

# Script COMPLETO para build, push e deploy da aplicação
# Faz TUDO: cria imagem Docker -> push para ECR (staging/prod) -> deploy na EC2 (staging/prod)
# Uso: ./deploy-complete.sh [staging|production|prod] [tag] [--skip-build] [--skip-deploy]
# Exemplo: ./deploy-complete.sh staging latest
#          ./deploy-complete.sh prod v1.0.0

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Profile AWS (pode ser sobrescrito com variável de ambiente)
AWS_PROFILE=${AWS_PROFILE:-clubinho-aws}

# Diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Parâmetros
ENVIRONMENT=${1:-staging}
TAG=${2:-latest}
SKIP_BUILD=false
SKIP_DEPLOY=false

# Caminho dos envs locais
ENV_DIR="$PROJECT_ROOT/env"

# Normalizar environment
if [ "$ENVIRONMENT" = "prod" ]; then
    ENVIRONMENT="production"
fi

# Validar ambiente
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${RED}❌ Erro: Ambiente inválido. Use 'staging' ou 'production' (ou 'prod')${NC}"
    exit 1
fi

# Processar flags
for arg in "$@"; do
    case $arg in
        --skip-build)
            SKIP_BUILD=true
            ;;
        --skip-deploy)
            SKIP_DEPLOY=true
            ;;
    esac
done

# Constantes (stack única multi-ambiente)
STACK_NAME="orfanato-nib-ec2"
ECR_STACK_NAME="orfanato-nib-ecr"

# Banner
echo -e "${MAGENTA}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║   🚀 Deploy Completo - Orfanato NIB API              ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📋 Ambiente: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}🏷️  Tag: ${TAG}${NC}"
echo -e "${CYAN}🔐 AWS Profile: ${AWS_PROFILE}${NC}"
echo ""

# Função para obter repositório ECR
get_ecr_repository() {
    if [ "$ENVIRONMENT" = "production" ]; then
        REPO_OUTPUT_KEY="ProductionRepositoryUri"
    else
        REPO_OUTPUT_KEY="StagingRepositoryUri"
    fi

    REPOSITORY_URI=$(aws cloudformation describe-stacks --profile "$AWS_PROFILE" \
        --stack-name "$ECR_STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey==\`${REPO_OUTPUT_KEY}\`].OutputValue" \
        --output text 2>/dev/null || echo "")

    if [ -z "$REPOSITORY_URI" ]; then
        echo -e "${RED}❌ Erro: Stack ECR não encontrada. Execute primeiro: cd ../ecr && bash deploy.sh${NC}"
        exit 1
    fi

    echo "$REPOSITORY_URI"
}

# Função para obter informações da EC2
get_ec2_info() {
    local id_key=""
    local ip_key=""
    if [ "$ENVIRONMENT" = "production" ]; then
        id_key="InstanceIdProd"
        ip_key="PublicIPProd"
    else
        id_key="InstanceIdStaging"
        ip_key="PublicIPStaging"
    fi

    INSTANCE_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --query "Stacks[0].Outputs[?OutputKey==\`${id_key}\`].OutputValue" \
        --output text 2>/dev/null || echo "")

    PUBLIC_IP=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --query "Stacks[0].Outputs[?OutputKey==\`${ip_key}\`].OutputValue" \
        --output text 2>/dev/null || echo "")

    if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
        echo -e "${RED}❌ Erro: InstanceId não encontrado na stack única${NC}"
        exit 1
    fi
    if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" = "None" ]; then
        echo -e "${YELLOW}⚠️  IP público não encontrado; tente novamente após a criação completar${NC}"
        exit 1
    fi

    echo "$INSTANCE_ID|$PUBLIC_IP"
}

# ============================================================================
# PASSO 1: BUILD E PUSH DA IMAGEM DOCKER
# ============================================================================
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📦 PASSO 1: Build e Push da Imagem Docker${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Obter informações do ECR
    echo -e "${CYAN}🔍 Obtendo informações do ECR...${NC}"
    REPOSITORY_URI=$(get_ecr_repository)
    IMAGE_NAME="${REPOSITORY_URI}:${TAG}"
    REGION=$(aws configure get region --profile "$AWS_PROFILE" || echo "us-east-1")

    echo -e "${GREEN}✅ Repositório ECR: ${REPOSITORY_URI}${NC}"
    echo -e "${GREEN}✅ Imagem: ${IMAGE_NAME}${NC}"
    echo -e "${GREEN}✅ Região: ${REGION}${NC}"
    echo ""

    # Mudar para raiz do projeto
    cd "$PROJECT_ROOT"

    # Detectar docker ou podman
    if command -v docker &> /dev/null && docker ps &> /dev/null; then
        DOCKER_CMD="docker"
    elif command -v podman &> /dev/null; then
        DOCKER_CMD="podman"
        echo -e "${YELLOW}⚠️  Docker não disponível, usando Podman${NC}"
    else
        echo -e "${RED}❌ Erro: Docker ou Podman não encontrado${NC}"
        exit 1
    fi

    # Login no ECR
    echo -e "${CYAN}🔐 Fazendo login no ECR...${NC}"
    if aws ecr get-login-password --region "$REGION" --profile "$AWS_PROFILE" | \
        $DOCKER_CMD login --username AWS --password-stdin "$REPOSITORY_URI"; then
        echo -e "${GREEN}✅ Login realizado${NC}"
    else
        echo -e "${RED}❌ Erro ao fazer login no ECR${NC}"
        exit 1
    fi
    echo ""

    # Build da imagem
    echo -e "${CYAN}🔨 Construindo imagem Docker...${NC}"
    echo -e "${BLUE}   Dockerfile: DockerFile${NC}"
    echo -e "${BLUE}   Imagem: ${IMAGE_NAME}${NC}"
    echo ""
    if $DOCKER_CMD build -f DockerFile -t "$IMAGE_NAME" .; then
        echo ""
        echo -e "${GREEN}✅ Build concluído com sucesso!${NC}"
    else
        echo ""
        echo -e "${RED}❌ Erro ao fazer build da imagem${NC}"
        exit 1
    fi
    echo ""

    # Push da imagem
    echo -e "${CYAN}📤 Fazendo push da imagem para o ECR...${NC}"
    if $DOCKER_CMD push "$IMAGE_NAME"; then
        echo ""
        echo -e "${GREEN}✅ Push concluído com sucesso!${NC}"
        echo -e "${GREEN}📋 Imagem disponível em: ${IMAGE_NAME}${NC}"
    else
        echo ""
        echo -e "${RED}❌ Erro ao fazer push da imagem${NC}"
        exit 1
    fi
    echo ""
else
    echo -e "${YELLOW}⏭️  Pulando build e push (--skip-build)${NC}"
    echo ""
    # Ainda precisamos obter as informações do ECR para o deploy
    REPOSITORY_URI=$(get_ecr_repository)
    IMAGE_NAME="${REPOSITORY_URI}:${TAG}"
    REGION=$(aws configure get region --profile "$AWS_PROFILE" || echo "us-east-1")
fi

# ============================================================================
# PASSO 2: DEPLOY NA EC2
# ============================================================================
if [ "$SKIP_DEPLOY" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🚀 PASSO 2: Deploy na Instância EC2${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Obter informações da EC2
    echo -e "${CYAN}🔍 Obtendo informações da EC2...${NC}"
    EC2_INFO=$(get_ec2_info)
    INSTANCE_ID=$(echo "$EC2_INFO" | cut -d'|' -f1)
    PUBLIC_IP=$(echo "$EC2_INFO" | cut -d'|' -f2)

    echo -e "${GREEN}✅ Instance ID: ${INSTANCE_ID}${NC}"
    echo -e "${GREEN}✅ IP Público: ${PUBLIC_IP}${NC}"
    echo ""

    # Fazer deploy via SSM
    echo -e "${CYAN}🔧 Fazendo deploy via SSM...${NC}"
    
    # Normalizar environment para o arquivo .env
    ENV_FILE_NAME="$ENVIRONMENT"
    if [ "$ENVIRONMENT" = "production" ]; then
        ENV_FILE_NAME="prod"
    fi

    LOCAL_ENV_FILE="${ENV_DIR}/${ENV_FILE_NAME}.env"
    if [ ! -f "$LOCAL_ENV_FILE" ]; then
        echo -e "${RED}❌ Erro: Arquivo de env não encontrado: ${LOCAL_ENV_FILE}${NC}"
        exit 1
    fi

    # Preparar env em base64 para enviar via SSM
    ENV_B64=$(base64 -w0 "$LOCAL_ENV_FILE")

    # Enviar env e subir o container
    COMMAND_ID=$(aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --profile "$AWS_PROFILE" \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[
            'set -e',
            'aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${REPOSITORY_URI}',
            'mkdir -p /opt/orfanato-nib-api/env',
            'echo ${ENV_B64} | base64 -d > /opt/orfanato-nib-api/env/${ENV_FILE_NAME}.env',
            'docker stop orfanato-nib-api || true',
            'docker rm orfanato-nib-api || true',
            'docker pull ${IMAGE_NAME}',
            'docker run -d --name orfanato-nib-api --restart unless-stopped -p 80:3000 -p 3000:3000 --env-file /opt/orfanato-nib-api/env/${ENV_FILE_NAME}.env ${IMAGE_NAME}',
            'sleep 2',
            'docker ps | grep orfanato-nib-api'
        ]" \
        --output text --query 'Command.CommandId' 2>/dev/null || echo "")

    if [ -z "$COMMAND_ID" ]; then
        echo -e "${YELLOW}⚠️  SSM não disponível. Use SSH manualmente:${NC}"
        echo ""
        echo -e "${BLUE}Execute:${NC}"
        echo -e "${CYAN}ssh ec2-user@${PUBLIC_IP}${NC}"
        echo ""
        echo "E depois execute:"
        echo "  aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${REPOSITORY_URI}"
        echo "  docker stop orfanato-nib-api || true"
        echo "  docker rm orfanato-nib-api || true"
        echo "  docker pull ${IMAGE_NAME}"
        echo "  docker run -d --name orfanato-nib-api --restart unless-stopped -p 80:3000 --env-file /opt/orfanato-nib-api/env/${ENV_FILE_NAME}.env ${IMAGE_NAME}"
    else
        echo -e "${GREEN}✅ Comando enviado! Command ID: ${COMMAND_ID}${NC}"
        echo -e "${CYAN}⏳ Aguardando execução (15 segundos)...${NC}"
        sleep 15

        echo ""
        echo -e "${CYAN}📋 Resultado do deploy:${NC}"
        # NOTE: Avoid piping into `while read ...` because EOF makes `read` return non-zero and,
        # under `set -e`, can incorrectly fail the script even when the command succeeded.
        SSM_STATUS=$(aws ssm get-command-invocation \
            --command-id "$COMMAND_ID" \
            --instance-id "$INSTANCE_ID" \
            --profile "$AWS_PROFILE" \
            --query 'Status' \
            --output text 2>/dev/null || echo "UNKNOWN")

        SSM_STDOUT=$(aws ssm get-command-invocation \
            --command-id "$COMMAND_ID" \
            --instance-id "$INSTANCE_ID" \
            --profile "$AWS_PROFILE" \
            --query 'StandardOutputContent' \
            --output text 2>/dev/null || echo "")

        SSM_STDERR=$(aws ssm get-command-invocation \
            --command-id "$COMMAND_ID" \
            --instance-id "$INSTANCE_ID" \
            --profile "$AWS_PROFILE" \
            --query 'StandardErrorContent' \
            --output text 2>/dev/null || echo "")

        echo "Status: $SSM_STATUS"
        [ -n "$SSM_STDOUT" ] && [ "$SSM_STDOUT" != "None" ] && echo "" && echo "Output:" && echo "$SSM_STDOUT"
        [ -n "$SSM_STDERR" ] && [ "$SSM_STDERR" != "None" ] && echo "" && echo "Error:" && echo "$SSM_STDERR"

        echo ""
        echo -e "${GREEN}✅ Deploy concluído!${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  Pulando deploy (--skip-deploy)${NC}"
fi

# ============================================================================
# RESUMO FINAL
# ============================================================================
echo ""
echo -e "${MAGENTA}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║          ✅ Deploy Completo Concluído!                 ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Determinar URL da API
if [ "$ENVIRONMENT" = "staging" ]; then
    API_URL="https://staging-api.orfanatonib.com"
else
    API_URL="https://api.orfanatonib.com"
fi

echo -e "${GREEN}📋 Resumo do Deploy:${NC}"
echo -e "${CYAN}   Ambiente: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}   Tag: ${TAG}${NC}"
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${CYAN}   Build: ✅${NC}"
    echo -e "${CYAN}   Push ECR: ✅${NC}"
fi
if [ "$SKIP_DEPLOY" = false ]; then
    echo -e "${CYAN}   Deploy EC2: ✅${NC}"
fi
echo ""
echo -e "${YELLOW}🌐 API disponível em: ${API_URL}${NC}"
echo ""
echo -e "${BLUE}💡 Para verificar o status da aplicação:${NC}"
echo -e "${CYAN}   curl ${API_URL}/health${NC}"
echo ""

