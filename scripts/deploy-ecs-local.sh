#!/bin/bash

# ==============================================================================
# Deploy prod - Orfanato NIB API na Super Stack EC2
# ==============================================================================
# Fluxo:
#   1. Build da imagem linux/arm64
#   2. Push para ECR prod-orfanato-nib-api com DUAS tags: o SHA curto do git (rastreio/rollback)
#      e `latest` (a EC2 puxa `latest`; contrato da stack, nao mudar)
#   3. Pull da imagem na EC2 e recriacao do container orfanato-nib-api
#
# Este script NAO gerencia config/env. Ele assume que a EC2 ja tem:
#   /mnt/data/env/orfanato.env
#
# O script nao cria nem altera config/env da EC2. Ele valida que o env remoto ja
# esta pronto para rodar com --network host.
#
# Porta:
#   O clubinho-nib-api ja usa 3001 na Super Stack. O Orfanato usa 3002 por
#   padrao para evitar conflito. O arquivo remoto precisa ter PORT=3002.
#
# Teste manual esperado:
#   curl http://3.219.144.222:3002/health
# ==============================================================================

set -euo pipefail

API_NAME="orfanato-nib-api"
REPO_NAME="prod-orfanato-nib-api"
CONTAINER_NAME="orfanato-nib-api"
AWS_PROFILE="${AWS_PROFILE:-conta-aws}"
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${STACK_NAME:-super-stack-prod}"
HOST_PORT="${HOST_PORT:-3002}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/arm64}"
REMOTE_ENV_FILE="${REMOTE_ENV_FILE:-/mnt/data/env/orfanato.env}"
REMOTE_DB_HOST="${REMOTE_DB_HOST:-localhost}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${BLUE}--- Deploy prod: ${API_NAME} na Super Stack EC2 ---${NC}"
echo -e "AWS profile: ${AWS_PROFILE}"
echo -e "AWS region:  ${AWS_REGION}"
echo -e "Host port:   ${HOST_PORT}"
echo ""

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo -e "${RED}Erro: comando obrigatorio nao encontrado: $1${NC}"
        exit 1
    fi
}

require_command aws
require_command docker

if ! docker buildx version >/dev/null 2>&1; then
    echo -e "${RED}Erro: docker buildx e obrigatorio para publicar imagem ${DOCKER_PLATFORM}.${NC}"
    exit 1
fi

echo -e "${YELLOW}1. Recuperando URL do ECR...${NC}"
REPO_URI=$(aws ecr describe-repositories \
    --repository-names "$REPO_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'repositories[0].repositoryUri' \
    --output text)

if [ -z "$REPO_URI" ] || [ "$REPO_URI" = "None" ]; then
    echo -e "${RED}Erro: repositorio ECR $REPO_NAME nao encontrado.${NC}"
    exit 1
fi

GIT_SHA="$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)"
if [ -z "$GIT_SHA" ]; then
    echo -e "${RED}Erro: nao foi possivel obter o SHA do git (git rev-parse --short HEAD).${NC}"
    exit 1
fi
SHA_IMAGE_URI="${REPO_URI}:${GIT_SHA}"
IMAGE_URI="${REPO_URI}:latest"
echo -e "   -> ${GREEN}${SHA_IMAGE_URI}${NC}"
echo -e "   -> ${GREEN}${IMAGE_URI}${NC} (a EC2 puxa esta)"

echo -e "${YELLOW}2. Autenticando Docker no ECR...${NC}"
aws ecr get-login-password --region "$AWS_REGION" --profile "$AWS_PROFILE" | \
    docker login --username AWS --password-stdin "$REPO_URI"

echo -e "${YELLOW}3. Build e push da imagem ${DOCKER_PLATFORM}...${NC}"
cd "$PROJECT_ROOT"
docker buildx build \
    --platform "$DOCKER_PLATFORM" \
    -f Dockerfile \
    -t "$SHA_IMAGE_URI" \
    -t "$IMAGE_URI" \
    --push \
    .

echo -e "${YELLOW}4. Localizando EC2 atual do ASG ${STACK_NAME}...${NC}"
INSTANCE_ID=$(aws autoscaling describe-auto-scaling-groups \
    --auto-scaling-group-names "$STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'AutoScalingGroups[0].Instances[?LifecycleState==`InService`].InstanceId | [0]' \
    --output text)

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
    echo -e "${RED}Erro: instancia InService nao encontrada no ASG ${STACK_NAME}.${NC}"
    exit 1
fi

echo -e "   -> ${GREEN}${INSTANCE_ID}${NC}"

echo -e "${YELLOW}5. Recriando container ${CONTAINER_NAME} na EC2...${NC}"
COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --document-name "AWS-RunShellScript" \
    --comment "deploy-${CONTAINER_NAME}-prod" \
    --parameters "commands=[
        'set -e',
        'test -f ${REMOTE_ENV_FILE}',
        'grep -qx \"PORT=${HOST_PORT}\" ${REMOTE_ENV_FILE}',
        'grep -qx \"DB_HOST=${REMOTE_DB_HOST}\" ${REMOTE_ENV_FILE}',
        'aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${REPO_URI}',
        'docker pull ${IMAGE_URI}',
        'docker rm -f ${CONTAINER_NAME} 2>/dev/null || true',
        'if ss -ltn \"sport = :${HOST_PORT}\" | grep -q LISTEN; then active=\$(docker ps --format \"{{.Names}}\" | tr \"\\n\" \" \" || true); echo \"porta ${HOST_PORT} ja esta em uso por outro processo/container. containers ativos: \${active}\"; exit 1; fi',
        'docker run -d --name ${CONTAINER_NAME} --restart unless-stopped --network host --env-file ${REMOTE_ENV_FILE} --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 ${IMAGE_URI}',
        'sleep 5',
        'docker ps --filter name=${CONTAINER_NAME} --format \"table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}\"',
        'docker logs --tail 80 ${CONTAINER_NAME}'
    ]" \
    --query 'Command.CommandId' \
    --output text)

echo -e "   -> Command ID: ${GREEN}${COMMAND_ID}${NC}"
echo -e "${YELLOW}6. Aguardando SSM finalizar...${NC}"

for attempt in $(seq 1 30); do
    STATUS=$(aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Status' \
        --output text 2>/dev/null || echo "Pending")

    if [ "$STATUS" != "Pending" ] && [ "$STATUS" != "InProgress" ] && [ "$STATUS" != "Delayed" ]; then
        break
    fi

    echo -e "   tentativa ${attempt}/30 - ${STATUS}"
    sleep 5
done

STDOUT=$(aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'StandardOutputContent' \
    --output text 2>/dev/null || true)

STDERR=$(aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'StandardErrorContent' \
    --output text 2>/dev/null || true)

echo ""
echo -e "${BLUE}Resultado SSM: ${STATUS}${NC}"
[ -n "$STDOUT" ] && [ "$STDOUT" != "None" ] && echo "" && echo "$STDOUT"
[ -n "$STDERR" ] && [ "$STDERR" != "None" ] && echo "" && echo "$STDERR"

if [ "$STATUS" != "Success" ]; then
    echo -e "${RED}Erro: deploy falhou no SSM.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Deploy concluido.${NC}"
echo -e "Teste por IP/porta:"
echo -e "${GREEN}curl http://3.219.144.222:${HOST_PORT}/health${NC}"
