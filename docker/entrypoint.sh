#!/bin/sh
# VORTEX v4 — boot da API: espera infra, migra, (opcional) semeia, sobe o app.
set -eu

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

tcp_wait() {
  host="$1"
  port="$2"
  label="$3"
  echo "[vortex] aguardando ${label} em ${host}:${port} ..."
  i=0
  while [ "$i" -lt 60 ]; do
    if node -e "const net=require('net');const s=net.connect(Number(process.argv[1]),process.argv[2]);s.setTimeout(2000);s.on('connect',()=>{s.end();process.exit(0)});s.on('timeout',()=>{s.destroy();process.exit(1)});s.on('error',()=>process.exit(1))" "$port" "$host" 2>/dev/null; then
      echo "[vortex] ${label} pronto."
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  echo "[vortex] ERRO: ${label} nao respondeu em ${host}:${port} apos 120s." >&2
  exit 1
}

tcp_wait "$DB_HOST" "$DB_PORT" PostgreSQL
tcp_wait "$REDIS_HOST" "$REDIS_PORT" Redis

# Em `NODE_ENV=production` o ledger EXIGE um arquivo de chave. Em ambientes
# efemeros (showcase/CI) geramos a chave no primeiro boot e a persistimos no
# volume montado, para que a cadeia continue verificavel apos reinicios.
if [ -n "${LEDGER_PRIVATE_KEY_FILE:-}" ] && [ ! -f "$LEDGER_PRIVATE_KEY_FILE" ]; then
  mkdir -p "$(dirname "$LEDGER_PRIVATE_KEY_FILE")"
  node -e "const {generateKeyPairSync}=require('crypto');const fs=require('fs');const {privateKey}=generateKeyPairSync('ed25519');fs.writeFileSync(process.env.LEDGER_PRIVATE_KEY_FILE,privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});"
  echo "[vortex] chave Ed25519 gerada em ${LEDGER_PRIVATE_KEY_FILE}."
fi

echo "[vortex] aplicando migracoes ..."
node /app/tools/migrate.mjs

if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  echo "[vortex] aplicando seed de desenvolvimento ..."
  node /app/tools/seed-dev.mjs
fi

# Administrador de producao: cria tenant/empresa/admin na primeira subida.
# Idempotente; so roda quando BOOTSTRAP_ON_BOOT=true. Exige ADMIN_* definidos.
if [ "${BOOTSTRAP_ON_BOOT:-false}" = "true" ]; then
  echo "[vortex] executando bootstrap do administrador ..."
  node /app/tools/bootstrap-admin.mjs
fi

echo "[vortex] iniciando API: $*"
exec "$@"
