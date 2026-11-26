#!/usr/bin/env bash
# =============================================================================
# remote-deploy.sh <imagem-completa> — executa NA EC2 da Super Stack (via SSM).
# Fonte única do deploy do Orfanato: usado pelo GitHub Actions e pelo script local.
#
# Ordem (qualquer falha antes do passo 5 não altera nada em produção):
#   1. contrato de env (nomes das chaves em required-env.txt)
#   2. pull da imagem nova (ECR)
#   3. dump verificado do banco do Orfanato -> EBS + S3 (mysql/pre-deploy/)
#   4. migrations com a imagem NOVA (modo auto: adota o schema legado ou aplica pendentes),
#      sob o lock do host (nenhum backup agendado no meio), API antiga parada
#   5. /opt/super-stack/scripts/deploy.sh orfanato <imagem> (recria só orfanato-api)
#   6. readiness (/health/ready) por até 120s
#   7. falhou? volta a imagem anterior e, se esta execução migrou, restaura o dump do passo 3
#
# Variáveis: ROLLBACK_RESTORE_DB=1 (padrão) | DRY_RUN=1 (valida passos 1-3 e mostra o plano)
# =============================================================================
set -euo pipefail

IMAGE="${1:?uso: remote-deploy.sh <registry/repo:tag>}"
# Lista de chaves obrigatórias (scripts/deploy/required-env.txt) enviada pelo chamador em base64.
REQUIRED_ENV="$(printf '%s' "${REQUIRED_ENV_B64:?REQUIRED_ENV_B64 ausente}" | base64 -d)"
ROLLBACK_RESTORE_DB="${ROLLBACK_RESTORE_DB:-1}"
DRY_RUN="${DRY_RUN:-0}"
ENV_FILE=/mnt/data/env/orfanato.env
IMAGES_ENV=/mnt/data/env/images.env
SCRIPTS=/opt/super-stack/scripts
WORK=/mnt/data/backup-tmp
LOCK=/var/run/super-stack-host-change.lock

# shellcheck disable=SC1091
source "$SCRIPTS/lib.sh"
load_context
export COMPOSE_PROFILES
# shellcheck disable=SC1091
source /opt/super-stack/stack.env      # BACKUP_BUCKET
# shellcheck disable=SC1091
source /mnt/data/env/databases.env     # MYSQL_ROOT_PASSWORD

log() { echo ">> $*"; }
die() { echo "ERRO: $*" >&2; exit 1; }

case "$IMAGE" in "$ECR_REGISTRY/prod-orfanato-nib-api:"*) ;; *) die "imagem fora do repositório prod-orfanato-nib-api";; esac
[ "$ENVIRONMENT" = prod ] || die "este script só publica em prod (ENVIRONMENT=$ENVIRONMENT)"

# --- 1. contrato de env -------------------------------------------------------
[ -f "$ENV_FILE" ] || die "$ENV_FILE ausente"
missing=()
while IFS= read -r line; do
  line="${line%%#*}"; line="${line// /}"; [ -n "$line" ] || continue
  key="${line%%=*}"
  if [[ "$line" == *=* ]]; then
    grep -qx "$line" "$ENV_FILE" || missing+=("$key (valor esperado: ${line#*=})")
  else
    grep -Eq "^${key}=.+" "$ENV_FILE" || missing+=("$key")
  fi
done <<<"$REQUIRED_ENV"
if ((${#missing[@]})); then printf 'FALTANDO em %s:\n' "$ENV_FILE" >&2; printf '  - %s\n' "${missing[@]}" >&2; exit 1; fi
envval() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2-; }
DB_NAME="$(envval DB_NAME)"
[[ "$DB_NAME" =~ ^[A-Za-z0-9_-]+$ ]] || die "DB_NAME inválido"
log "contrato de env ok (db=$DB_NAME)"

# --- 2. imagem ---------------------------------------------------------------
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "$ECR_REGISTRY" >/dev/null
docker pull -q "$IMAGE" >/dev/null
PREV_IMAGE="$(grep -E '^ORFANATO_IMAGE=' "$IMAGES_ENV" 2>/dev/null | cut -d= -f2- || true)"
log "imagem nova puxada; anterior: ${PREV_IMAGE:-nenhuma}"

mysql_exec() { $COMPOSE exec -T -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql mysql -uroot "$@"; }
TS="$(date -u +%Y-%m-%dT%H-%M-%SZ)"; TAG="${IMAGE##*:}"
DUMP="$WORK/orfanato-pre-deploy-${TAG:0:12}-$TS.sql.gz"
mkdir -p "$WORK"

# --- 3. dump verificado ------------------------------------------------------
make_dump() {
  local tables
  tables="$(mysql_exec -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE TABLE_SCHEMA='$DB_NAME'" | tr -d '\r')"
  $COMPOSE exec -T -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql mysqldump -uroot \
    --single-transaction --routines --triggers --hex-blob --add-drop-database --databases "$DB_NAME" | gzip > "$DUMP"
  gzip -t "$DUMP"
  [ "$(zcat "$DUMP" | grep -c '^CREATE TABLE')" -eq "$tables" ] || die "dump com número de tabelas diferente do banco ($tables)"
  zcat "$DUMP" | tail -3 | grep -q 'Dump completed' || die "dump sem rodapé 'Dump completed'"
  aws s3 cp "$DUMP" "s3://$BACKUP_BUCKET/mysql/pre-deploy/$(basename "$DUMP")" --only-show-errors
  [ "$(stat -c%s "$DUMP")" = "$(aws s3api head-object --bucket "$BACKUP_BUCKET" --key "mysql/pre-deploy/$(basename "$DUMP")" --query ContentLength --output text)" ] \
    || die "tamanho do dump no S3 diverge"
  log "dump verificado ($tables tabelas): s3://$BACKUP_BUCKET/mysql/pre-deploy/$(basename "$DUMP")"
}
restore_dump() {
  log "RESTAURANDO $DB_NAME a partir de $DUMP"
  zcat "$DUMP" | mysql_exec
}
run_migrations() {
  ORFANATO_IMAGE="$IMAGE" $COMPOSE run --rm --no-deps -T --entrypoint node orfanato-api scripts/deploy/database.cjs "$@"
}

if [ "$DRY_RUN" = 1 ]; then
  ( flock -w 300 8 || exit 1; make_dump && run_migrations status ) 8>"$LOCK"
  log "DRY_RUN: nada foi alterado além do dump"; exit 0
fi

MIGRATED=0
( # --- 4. migrations sob o lock do host -------------------------------------
  flock -w 300 8 || die "outro deploy/backup em andamento"
  make_dump || exit 1
  log "parando a API antiga durante a migration"
  $COMPOSE stop orfanato-api >/dev/null || exit 1
  run_migrations auto || exit 1
) 8>"$LOCK" || {
  echo "ERRO: migration falhou." >&2
  ( flock -w 300 8 || exit 1
    restore_dump || exit 1
    [ -z "$PREV_IMAGE" ] || ORFANATO_IMAGE="$PREV_IMAGE" $COMPOSE up -d --no-deps orfanato-api
  ) 8>"$LOCK" || echo "ERRO CRÍTICO: restore automático falhou; restaure manualmente: $DUMP" >&2
  exit 1
}
MIGRATED=1

rollback() {
  echo "ERRO: $1 — revertendo" >&2
  $COMPOSE stop orfanato-api >/dev/null 2>&1 || true
  if [ "$MIGRATED" = 1 ] && [ "$ROLLBACK_RESTORE_DB" = 1 ]; then
    ( flock -w 300 8 && restore_dump ) 8>"$LOCK" || echo "ERRO CRÍTICO: restore falhou; dump: $DUMP" >&2
  fi
  [ -z "$PREV_IMAGE" ] || "$SCRIPTS/deploy.sh" orfanato "$PREV_IMAGE" || true
  exit 1
}

# --- 5. troca da imagem ------------------------------------------------------
"$SCRIPTS/deploy.sh" orfanato "$IMAGE" || rollback "deploy.sh falhou"

# --- 6. readiness ------------------------------------------------------------
ok=0
for i in $(seq 1 24); do
  cid="$($COMPOSE ps -q orfanato-api || true)"
  if [ -n "$cid" ] && docker exec "$cid" node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then ok=1; break; fi
  sleep 5
done
[ "$ok" = 1 ] || rollback "/health/ready não respondeu em 120s"
run_migrations check
log "deploy concluído: $IMAGE"
