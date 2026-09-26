#!/usr/bin/env bash
#
# VORTEX — Script de Restauração (PostgreSQL + MinIO)
# Uso: bash restore.sh <arquivo_backup.tar.gz>
# Requer: pg_restore e variáveis de ambiente do .env.
# Para o MinIO usa o `mc` do host ou, na sua ausência, a imagem oficial
# `minio/mc` via Docker/Podman.
#
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Uso: $0 <arquivo_backup.tar.gz>"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERRO: arquivo de backup não encontrado: ${BACKUP_FILE}"
  exit 1
fi

# Carrega variáveis do .env se existir
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

RESTORE_ROOT="$(mktemp -d)"
POSTGRES_HOST="${DB_HOST:-localhost}"
POSTGRES_PORT="${DB_PORT:-5432}"
MINIO_ALIAS="${MINIO_ALIAS:-vortex}"
# Senha do restore: pg_restore le de PGPASSWORD.
export PGPASSWORD="${DB_ADMIN_PASSWORD:-}"

# --- Cliente MinIO ---------------------------------------------------------
# Mesma estratégia do backup.sh: `mc` do host ou `minio/mc` em container.
container_engine() {
  if command -v docker >/dev/null 2>&1; then printf 'docker'; return 0; fi
  if command -v podman >/dev/null 2>&1; then printf 'podman'; return 0; fi
  return 0
}

HAVE_MC=0
if command -v mc >/dev/null 2>&1; then HAVE_MC=1; fi

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

minio_push() { # $1 host_dir, $2 alias
  if [ "${HAVE_MC}" -eq 1 ]; then
    mc mirror --overwrite "$1" "$2"
  else
    mc_container "$1:/backup" mirror --overwrite /backup "$2"
  fi
}

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "ERRO: pg_restore não encontrado no PATH. Instale o cliente PostgreSQL." >&2
  exit 1
fi

echo "==> Extraindo backup: ${BACKUP_FILE}"
tar -xzf "${BACKUP_FILE}" -C "${RESTORE_ROOT}"
BACKUP_DIR="$(find "${RESTORE_ROOT}" -maxdepth 1 -type d | tail -n 1)"

echo "==> RESTAURAÇÃO DO POSTGRESQL"
echo "ATENÇÃO: isso irá SOBRESCREVER o banco atual. Deseja continuar? (s/N)"
read -r CONFIRM
if [[ ! "${CONFIRM}" =~ ^[sSyY]$ ]]; then
  echo "Restauração cancelada."
  rm -rf "${RESTORE_ROOT}"
  exit 0
fi

DUMP_FILE="$(find "${BACKUP_DIR}" -name '*.dump' | head -n 1)"
if [ -n "${DUMP_FILE}" ]; then
  echo "==> Restaurando dump: ${DUMP_FILE}"
  pg_restore \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${DB_ADMIN_USER:-vortex_admin}" \
    -d "${DB_NAME:-vortex}" \
    --clean \
    --if-exists \
    "${DUMP_FILE}"
  echo "==> PostgreSQL restaurado."
else
  echo "AVISO: nenhum dump PostgreSQL encontrado no backup."
fi

# Restaura MinIO
if [ -d "${BACKUP_DIR}/minio" ]; then
  echo "==> Restaurando MinIO..."
  if [ -z "${MINIO_ENDPOINT:-}" ]; then
    echo "AVISO: MINIO_ENDPOINT não definido; restauração do MinIO ignorada."
  elif minio_alias_set "${MINIO_ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null 2>&1; then
    minio_push "${BACKUP_DIR}/minio" "${MINIO_ALIAS}"
    echo "==> MinIO restaurado."
  else
    echo "AVISO: não foi possível conectar ao MinIO."
  fi
fi

rm -rf "${RESTORE_ROOT}"
echo "==> Restauração concluída."
