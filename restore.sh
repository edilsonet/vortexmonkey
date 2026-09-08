#!/usr/bin/env bash
#
# VORTEX — Script de Restauração (PostgreSQL + MinIO)
# Uso: ./scripts/restore.sh <arquivo_backup.tar.gz>
# Requer: pg_restore, mc (MinIO Client), variáveis de ambiente do .env
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
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
MINIO_ALIAS="${MINIO_ALIAS:-vortex}"

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
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
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
  if mc alias set "${MINIO_ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" >/dev/null 2>&1; then
    mc mirror --overwrite "${BACKUP_DIR}/minio" "${MINIO_ALIAS}"
    echo "==> MinIO restaurado."
  else
    echo "AVISO: não foi possível conectar ao MinIO."
  fi
fi

rm -rf "${RESTORE_ROOT}"
echo "==> Restauração concluída."