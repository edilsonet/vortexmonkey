#!/usr/bin/env bash
#
# VORTEX — Script de Backup (PostgreSQL + MinIO)
# Uso: ./scripts/backup.sh [diretório_destino]
# Requer: pg_dump, mc (MinIO Client), variáveis de ambiente carregadas do .env
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
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
MINIO_ALIAS="${MINIO_ALIAS:-vortex}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

echo "==> Iniciando backup VORTEX em ${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}"

# 1. Backup do PostgreSQL (dump completo)
echo "==> PostgreSQL: gerando dump..."
pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  -F c \
  -f "${BACKUP_DIR}/vortex_postgres_${TIMESTAMP}.dump"

# 2. Backup do MinIO (espelho de todos os buckets)
echo "==> MinIO: espelhando objetos..."
if ! mc alias set "${MINIO_ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" >/dev/null 2>&1; then
  echo "AVISO: não foi possível conectar ao MinIO. Verifique MINIO_ENDPOINT/credenciais."
else
  mc mirror --overwrite "${MINIO_ALIAS}" "${BACKUP_DIR}/minio"
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