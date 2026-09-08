# VORTEX — Ecossistema de Conformidade e Governança Aeronáutica

Plataforma integrada de gestão de conformidade e governança de processos para a aviação civil brasileira, estruturada em consonância com os Regulamentos Brasileiros da Aviação Civil (RBAC), Instruções Suplementares (IS) e Resoluções da ANAC.

## Segmentos cobertos

- Manutenção aeronáutica (RBAC 43 e 145)
- Operações de transporte aéreo regular e não regular (RBAC 91, 121 e 135)
- Operações aeroagrícolas (RBAC 137)
- Centros de formação e treinamento (RBAC 141 e 142)
- Infraestrutura aeroportuária (RBAC 153)
- Credenciamento de pessoas físicas e jurídicas (RBAC 183)

## Fase 1 — Rconta (fundação)

Gestão de Identidade (MDM de Pessoas e Organizações), Registro Distribuído Imutável (Ledger — Res. ANAC 458/2017), Protocolo Oficial Unificado, Motor de Assinatura Digital ICP-Brasil e Infraestrutura de Subscrição e Faturamento (Billing).

## Stack

- Backend: NestJS + TypeScript estrito (monorepo Turborepo)
- Banco: PostgreSQL 16 com Row-Level Security
- Cache/Filas: Redis, RabbitMQ
- Armazenamento: MinIO (presigned URLs)
- Frontend: React 19 + Vite + Module Federation + Tailwind + shadcn/ui

## Requisitos

- Node.js 20+
- pnpm 9+
- Docker 26+ / Docker Compose v2
- Git

## Início rápido (desenvolvimento local)
```bash
# 1. Clonar e instalar
git clone <seu-repo-url> vortex && cd vortex
cp .env.example .env      # preencha os segredos (ver seção Segredos)

# 2. Subir infraestrutura (PostgreSQL, Redis, RabbitMQ, MinIO)
make up

# 3. Instalar dependências e rodar migrações
make install
make migrate
make seed

# 4. Rodar em desenvolvimento
make dev
```

A API fica em `http://localhost:3000` e o healthcheck em `http://localhost:3000/health`.

## Segredos (IMPORTANTE)

1. `cp .env.example .env`
2. Gere segredos fortes: `openssl rand -base64 32`
3. Gere as chaves do Ledger (Ed25519): `openssl genpkey -algorithm ed25519`
4. Valide que o `.env` está ignorado: `git check-ignore .env` (deve retornar `.env`)
5. **NUNCA** commite o `.env` real.

## Deploy no VPS (Ubuntu + Docker Compose)

### 1. Preparar o servidor
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker e Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Faça logout/login para aplicar o grupo docker

# Verificar
docker --version && docker compose version
```

### 2. Clonar o repositório
```bash
git clone <seu-repo-url> /opt/vortex && cd /opt/vortex
```

### 3. Configurar o ambiente
```bash
cp .env.example .env
nano .env   # preencha TODOS os segredos (POSTGRES_PASSWORD, REDIS_PASSWORD, JWT_SECRET, LEDGER keys, etc.)
```

### 4. Subir em produção
```bash
make prod-up
```

A API fica em `http://SEU_IP:3000`. Para domínio próprio com HTTPS, configure um proxy reverso (Nginx/Caddy) apontando para `localhost:3000` e emita certificado Let's Encrypt.

### 5. Verificar
```bash
curl http://localhost:3000/health
# → {"success":true,"data":{"status":"ok"},"error":null}
```

## Backup e restauração
```bash
# Backup (PostgreSQL + MinIO) — gera tar.gz em ./backups
make backup

# Restauração
make restore FILE=backups/vortex_backup_20260907_120000.tar.gz
```

Sugestão: agende o backup com cron (ex.: diário às 02h):
```cron
0 2 * * * cd /opt/vortex && ./scripts/backup.sh >> /var/log/vortex-backup.log 2>&1
```

## Comandos úteis

| Comando | Ação |
|---------|------|
| `make up` / `make down` | Sobe/derruba infraestrutura local |
| `make migrate` / `make seed` | Aplica migrações e sementes |
| `make test` / `make test-e2e` | Testes unitários/integração e end-to-end |
| `make ledger-verify` | Verifica integridade da cadeia do Ledger |
| `make prod-up` / `make prod-down` | Sobe/derruba produção |
| `make backup` / `make restore` | Backup e restauração |

## Documentação

- `CLAUDE.md` — contrato global e plano de construção
- `docs/` — visão geral, matriz regulatória, parâmetros, enums, seeds, lacunas, delimitação, esqueleto de ERP e navegação
- `docs/prompts/` — as 8 partes de arquitetura

## Licença

Proprietária. Uso interno restrito. Distribuição não autorizada.