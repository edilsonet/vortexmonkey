# Runbook operacional — Fase 2

## Subida e saúde

```bash
pnpm install --frozen-lockfile
docker compose up -d --build
docker compose ps
curl -fsS http://localhost:3000/health
```

O projeto Compose usa o nome `vortex-phase2`. Os volumes da Fase 1 não são reutilizados automaticamente.

## Migrations

```bash
docker compose run --rm migrate pnpm db:migrate
```

As migrations são transacionais e ordenadas por nome. A Fase 2 termina em `0013_ledger_chain_head.sql`.

## Verificação do ledger

A API executa verificação inicial ao subir e, depois, diariamente às **02:00 UTC**. Consulte a evidência persistida:

```sql
SELECT id,tenant_id,status,total_blocks,first_broken_block,last_hash,completed_at
FROM ledger.verification_runs
ORDER BY completed_at DESC;
```

Se `status = 'TAMPERED'`, preserve banco, logs, secrets e backups. Não corrija linhas. Identifique `first_broken_block`, suspenda escritas do tenant e compare o bloco com a última prova Merkle exportada.

## Partições

A rotina diária mantém três meses futuros. Audite:

```sql
SELECT child.relname
FROM pg_inherits inheritance
JOIN pg_class child ON child.oid = inheritance.inhrelid
JOIN pg_class parent ON parent.oid = inheritance.inhparent
WHERE parent.relname = 'ledger_blocks'
ORDER BY child.relname;
```

A função `ledger.ensure_monthly_partitions(3)` pode ser executada pelo papel da aplicação. Ela não move registros antigos da partição padrão.

## Testes de aceite

```bash
pnpm check
pnpm test:coverage
node tools/e2e-phase2.mjs
docker compose run --rm migrate pnpm db:rls-test
```

Para os testes SQL:

```bash
docker compose exec -T postgres sh -ec \
  'export PGPASSWORD="$$(cat /run/vortex-secrets/postgres-admin)"; exec psql -v ON_ERROR_STOP=1 -U vortex_admin -d vortex' \
  < tools/test-phase2-access.sql
```

Repita com `tools/test-phase2-immutability.sql`.

## Rotação de chaves

A chave privada Ed25519 está no volume de secrets e nunca deve ser copiada para o repositório. Uma rotação futura deve preservar a chave pública anterior e registrar a vigência de cada chave; esta fase usa um único par por ambiente.

## Backup

O ledger não substitui backup. Mantenha PITR do PostgreSQL, cópia versionada do volume de secrets e exportações Merkle periódicas fora da VPS. Um restore deve ser seguido de verificação integral antes da reabertura das escritas.
