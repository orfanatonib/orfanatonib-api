#!/usr/bin/env bash
# Só IMPRIME o comando de criação da tabela; não executa nada na AWS.
# Uso: infra/dynamodb/create-log-table.sh <staging|prod> [regiao]
set -euo pipefail

ENVIRONMENT="${1:-}"
REGION="${2:-${AWS_REGION:-us-east-1}}"
case "$ENVIRONMENT" in
  staging | prod) ;;
  *)
    echo "Uso: $0 <staging|prod> [regiao]" >&2
    exit 2
    ;;
esac

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "# Revise e execute você mesmo (com credenciais do ambiente ${ENVIRONMENT}):"
cat <<CMD
aws cloudformation deploy \\
  --region ${REGION} \\
  --stack-name orfanatonib-log-records-${ENVIRONMENT} \\
  --template-file ${DIR}/orfanatonib-log-records.cloudformation.yml \\
  --parameter-overrides Environment=${ENVIRONMENT} \\
  --no-fail-on-empty-changeset
CMD
