#!/usr/bin/env bash
# =============================================================================
# Deploy PROD do Orfanato pela máquina local — mesmo caminho do GitHub Actions:
#   build arm64 -> ECR (tag <sha>-arm64) -> SSM -> scripts/deploy/remote-deploy.sh na EC2
# A EC2 roda a Super Stack (docker compose, container super-stack-orfanato-api-1, rede
# interna atrás do Caddy). NÃO usa --network host, NÃO usa porta 3002, NÃO tem tag latest.
#
#   ./scripts/deploy-prod-local.sh            # deploy real
#   DRY_RUN=1 ./scripts/deploy-prod-local.sh  # build/push + dump verificado + status das migrations; não altera nada
#   SKIP_BUILD=1 IMAGE_TAG=<sha>-arm64 ...    # reaproveita imagem já enviada ao ECR
# =============================================================================
set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-conta-aws}"
AWS_REGION="${AWS_REGION:-us-east-1}"
REPO_NAME=prod-orfanato-nib-api
STACK_TAG="${STACK_TAG:-super-stack-prod}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export AWS_PROFILE AWS_REGION

git -C "$PROJECT_ROOT" diff --quiet HEAD -- || { echo "Erro: working tree com alterações; faça commit antes do deploy." >&2; exit 1; }
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$PROJECT_ROOT" rev-parse HEAD)-arm64}"
REGISTRY="$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE="$REGISTRY/$REPO_NAME:$IMAGE_TAG"
echo "Imagem: $IMAGE"

if [ "${SKIP_BUILD:-0}" != 1 ]; then
  aws ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null
  docker buildx build --platform linux/arm64 -f "$PROJECT_ROOT/Dockerfile" -t "$IMAGE" --push "$PROJECT_ROOT"
fi

INSTANCES=$(aws ec2 describe-instances --filters "Name=tag:Project,Values=$STACK_TAG" "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].InstanceId' --output text)
[ "$(wc -w <<<"$INSTANCES")" -eq 1 ] || { echo "Erro: esperava exatamente 1 instância $STACK_TAG, achei: ${INSTANCES:-nenhuma}" >&2; exit 1; }

REQ_B64=$(base64 -w0 "$PROJECT_ROOT/scripts/deploy/required-env.txt")
SCRIPT_B64=$(base64 -w0 "$PROJECT_ROOT/scripts/deploy/remote-deploy.sh")
CMD="echo $SCRIPT_B64 | base64 -d > /tmp/orfanato-remote-deploy.sh && DRY_RUN=${DRY_RUN:-0} REQUIRED_ENV_B64=$REQ_B64 bash /tmp/orfanato-remote-deploy.sh $IMAGE; rc=\$?; rm -f /tmp/orfanato-remote-deploy.sh; exit \$rc"
CMD_ID=$(aws ssm send-command --instance-ids "$INSTANCES" --document-name AWS-RunShellScript \
  --timeout-seconds 1800 --comment "deploy-orfanato" --parameters "commands=[\"$CMD\"]" --query Command.CommandId --output text)
echo "SSM: $CMD_ID"
aws ssm wait command-executed --command-id "$CMD_ID" --instance-id "$INSTANCES" 2>/dev/null || true
aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCES" --query '[Status,StandardOutputContent,StandardErrorContent]' --output text
STATUS=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCES" --query Status --output text)
[ "$STATUS" = Success ] || { echo "Deploy falhou ($STATUS)" >&2; exit 1; }
[ "${DRY_RUN:-0}" = 1 ] || curl -fsS --retry 5 --retry-delay 5 https://orfanato-nib-api.rodolfo-silva.com/health
echo; echo "Concluído."
