#!/usr/bin/env bash
#
# VORTEX — Script de Backup (PostgreSQL + MinIO)
# Uso: bash backup.sh [diretório_destino]
# Requer: pg_dump e variáveis de ambiente carregadas do .env.
# Para o MinIO usa o `mc` do host ou, na sua ausência, a imagem oficial
# `minio/mc` via Docker/Podman.
#
set -euo pipefail

# Carrega variáveis do .env se existir
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Configurações
BACKUP_ROOT="${1:-./backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
POSTGRES_HOST="${DB_HOST:-localhost}"
POSTGRES_PORT="${DB_PORT:-5432}"
MINIO_ALIAS="${MINIO_ALIAS:-vortex}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
# Senha do dump: pg_dump le de PGPASSWORD (nunca de argumento de linha de comando).
export PGPASSWORD="${DB_ADMIN_PASSWORD:-}"

# --- Cliente MinIO ---------------------------------------------------------
# O host pode não ter o `mc` instalado. Preferimos o `mc` do host; na ausência,
# rodamos `minio/mc` em container (o host já roda Docker/Podman para o compose).
# O endpoint precisa ser alcançável a partir do container (por isso
# `--network host`).
container_engine() {
  if command -v docker >/dev/null 2>&1; then printf 'docker'; return 0; fi
  if command -v podman >/dev/null 2>&1; then printf 'podman'; return 0; fi
  return 0
}

HAVE_MC=0
if command -v mc >/dev/null 2>&1; then HAVE_MC=1; fi

# Config isolada: o container não escreve no ~/.mc do host.
MC_CONFIG_DIR="$(mktemp -d)"
trap 'rm -rf "${MC_CONFIG_DIR}"' EXIT

mc_container() { # $1: mount host:container ("" = nenhum); demais: args do mc
  local mount="$1"; shift
  local engine
  engine="$(container_engine)"
  if [ -z "${engine}" ]; then
    echo "ERRO: 'mc' (MinIO Client) não encontrado e não há docker/podman." >&2
    echo "      Instale o mc: https://min.io/docs/minio/linux/reference/minio-mc.html" >&2
    return 1
  fi
  local mounts=(-v "${MC_CONFIG_DIR}:/root/.mc")
  if [ -n "${mount}" ]; then mounts+=(-v "${mount}"); fi
  "${engine}" run --rm --network host "${mounts[@]}" \
    docker.io/minio/mc:latest --config-dir /root/.mc "$@"
}

minio_alias_set() { # $1 alias, $2 endpoint, $3 user, $4 pass
  if [ "${HAVE_MC}" -eq 1 ]; then
    mc alias set "$1" "$2" "$3" "$4"
  else
    mc_container "" alias set "$1" "$2" "$3" "$4"
  fi
}

minio_pull() { # $1 alias, $2 host_dir
  if [ "${HAVE_MC}" -eq 1 ]; then
    mc mirror --overwrite "$1" "$2"
  else
    mc_container "$2:/backup" mirror --overwrite "$1" /backup
  fi
}

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERRO: pg_dump não encontrado no PATH. Instale o cliente PostgreSQL." >&2
  exit 1
fi

echo "==> Iniciando backup VORTEX em ${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}"

# 1. Backup do PostgreSQL (dump completo)
echo "==> PostgreSQL: gerando dump..."
pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${DB_ADMIN_USER:-vortex_admin}" \
  -d "${DB_NAME:-vortex}" \
  -F c \
  -f "${BACKUP_DIR}/vortex_postgres_${TIMESTAMP}.dump"

# 2. Backup do MinIO (espelho de todos os buckets)
echo "==> MinIO: espelhando objetos..."
if [ -z "${MINIO_ENDPOINT:-}" ]; then
  echo "AVISO: MINIO_ENDPOINT não definido; backup do MinIO ignorado."
elif ! minio_alias_set "${MINIO_ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null 2>&1; then
  echo "AVISO: não foi possível conectar ao MinIO. Verifique MINIO_ENDPOINT/credenciais."
else
  minio_pull "${MINIO_ALIAS}" "${BACKUP_DIR}/minio"
fi

# 3. Manifesto do backup
cat > "${BACKUP_DIR}/MANIFEST.txt" <<EOF
VORTEX BACKUP MANIFEST
Data: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
PostgreSQL dump: vortex_postgres_${TIMESTAMP}.dump
MinIO mirror: ./minio
EOF

# 4. Compactação
echo "==> Compactando..."
tar -czf "${BACKUP_ROOT}/vortex_backup_${TIMESTAMP}.tar.gz" -C "${BACKUP_ROOT}" "${TIMESTAMP}"
rm -rf "${BACKUP_DIR}"

echo "==> Backup concluído: ${BACKUP_ROOT}/vortex_backup_${TIMESTAMP}.tar.gz"

# 5. Retenção: remove backups mais antigos que RETENTION_DAYS
echo "==> Limpeza de backups antigos (> ${RETENTION_DAYS} dias)..."
find "${BACKUP_ROOT}" -name "vortex_backup_*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "==> Backup finalizado com sucesso."
