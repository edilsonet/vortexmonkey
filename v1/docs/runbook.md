# Runbook local da Parte 1

**Autor:** Manus AI

## Preparação

Use Node.js 22.19 ou superior, pnpm 12.3.4 e Docker Compose v2. O ambiente não depende de `.env` versionado. O serviço `secrets-init` cria senhas e a chave Ed25519 no volume `vortex-secrets`.

```bash
pnpm install --frozen-lockfile
docker compose config -q
docker compose up -d --build
```

A migration é um serviço one-shot. Ela registra cada arquivo aplicado em `public.schema_migrations`. Reexecutar o Compose não reaplica migrations concluídas.

## Operação cotidiana

| Ação | Comando |
|---|---|
| Iniciar | `docker compose up -d` |
| Reconstruir | `docker compose up -d --build` |
| Ver estado | `docker compose ps` |
| Ver logs da API | `docker compose logs -f api` |
| Ver logs das migrations | `docker compose logs migrate` |
| Parar | `docker compose down` |
| Parar e apagar volumes locais | `docker compose down -v` |

A remoção de volumes apaga dados e segredos locais. Não execute `down -v` em ambiente que contenha dados necessários.

## Credencial de desenvolvimento

```bash
docker compose run --rm \
  -e VORTEX_DEV_PASSWORD='uma-senha-local-com-12-ou-mais-caracteres' \
  -e VORTEX_DEV_EMAIL='admin@vortex.local' \
  migrate pnpm db:seed:dev
```

O seed é idempotente para os UUIDs reservados de desenvolvimento. Cada execução troca a senha. A senha não aparece no log.

## Validação

```bash
pnpm check
pnpm test:coverage
pnpm audit --prod --audit-level high

docker compose run --rm migrate pnpm db:rls-test

docker compose exec -T postgres sh -ec \
  'export PGPASSWORD="$(cat /run/vortex-secrets/postgres-admin)"; exec psql -U vortex_admin -d vortex' \
  < tools/test-ledger-immutability.sql

docker compose exec -T postgres sh -ec \
  'export PGPASSWORD="$(cat /run/vortex-secrets/postgres-admin)"; exec psql -U vortex_admin -d vortex' \
  < tools/test-mdm-uniqueness.sql
```

O teste ponta a ponta `tools/e2e-auth-identity.mjs` é destinado ao pipeline de integração local. Ele espera uma senha efêmera em `/tmp/vortex-test-password`, efetua login, escreve credenciamento duas vezes com a mesma chave, verifica a cadeia, rotaciona o refresh token e encerra a sessão.

## Diagnóstico

| Sintoma | Verificação | Ação |
|---|---|---|
| `/health` indisponível | `docker compose ps` e logs da API | Confirmar PostgreSQL, Redis e migration concluída |
| API não lê segredos | `docker compose run --rm secrets-init` | Reaplicar propriedade `1000:1000` e modo `0600` |
| Remote não carrega | Solicitar `/remotes/<app>/remoteEntry.js` | Reconstruir `web` e verificar CORS no Nginx |
| Login retorna 401 | Confirmar seed e senha | Reaplicar `db:seed:dev`; aguardar 15 minutos se bloqueado |
| Contexto retorna 403 | Conferir `X-Tenant-Id` e `X-Company-Id` | Selecionar membership e vínculo presentes no token |
| Migration falha | `docker compose logs migrate` | Corrigir o arquivo novo; nunca alterar migration já aplicada em produção |
| Outbox pendente | Consultar `ledger.outbox_events` | Verificar RabbitMQ e logs do publisher |

## Produção

O Compose entregue não é o deploy final de produção. A fase de infraestrutura deverá introduzir proxy externo com TLS 1.3, domínio real, secret manager, PgBouncer, backup PITR, retenção, Grafana/Loki, alertas, GitHub Actions de deploy e procedimentos de recuperação.

## Referências

[1]: canonical/prompts/parte-1.md "Critérios de aceite e stack da Parte 1"
[2]: canonical/07-delimitacao.md "Delimitação do escopo executável"
