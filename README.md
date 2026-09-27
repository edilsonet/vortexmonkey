# VORTEX — Ecossistema de Conformidade e Governança Aeronáutica

Plataforma integrada de conformidade, governança, RH, estoque e comércio para a
aviação civil brasileira, alinhada aos RBAC e Resoluções da ANAC. O contrato
global (identidade, princípios imutáveis, arquitetura e plano de construção) está
em `CLAUDE.md` — leia-o primeiro.

## Segmentos cobertos

- Manutenção aeronáutica (RBAC 43 e 145)
- Operações de transporte aéreo regular e não regular (RBAC 91, 121 e 135)
- Operações aeroagrícolas (RBAC 137)
- Centros de formação e treinamento (RBAC 141 e 142)
- Infraestrutura aeroportuária (RBAC 153)
- Credenciamento de pessoas físicas e jurídicas (RBAC 183)

## Stack

- Monorepo **Nx** + TypeScript estrito.
- Backend: **NestJS** (SQL nativo via `pg`).
- Banco: **PostgreSQL 16** com Row-Level Security por linha.
- Cache/idempotência: **Redis**. Filas/eventos: **RabbitMQ**. Arquivos: **MinIO**.
- Frontend: **Angular 20** standalone, zoneless, **Angular Material** + Design
  System próprio (`@vortex/ui`).

Os schemas SQL vivem em `migrations/`; o código compartilhado em `libs/`
(`@vortex/shared-dto` = contratos, `@vortex/util-aeronautics` = motor de cálculo,
`@vortex/core` = acesso à API/sessão, `@vortex/shell` = chrome compartilhado,
`@vortex/ui` = Design System).

## Estado atual

Implementado e verificado:

- `apps/ops-mro` — API do ERP Manutenção: motor de aeronavegabilidade,
  utilização, peso e balanceamento, contadores, amortização e alertas; escrita
  com **ledger imutável** (SHA-256 encadeado + Ed25519), **idempotência** e
  **RLS** por tenant e empresa. Inclui **autenticação JWT** (`POST /api/auth/login`
  por vínculo) com **refresh token rotativo** (`POST /api/auth/refresh` e
  `logout`, com detecção de reuso que revoga a família). A **revogação por
  evento** encerra sessões ao trocar a senha (`POST /api/auth/password`) ou
  perder o vínculo, e `POST /api/auth/sessions/revoke` encerra todas as sessões
  do usuário. `GET /api/auth/sessions` lista as sessões ativas por dispositivo
  (o painel "Sessões" da Shell permite encerrar uma a uma). No **reuso de refresh
  token detectado**, avisa o dono da sessão por **notificação in-app**
  (`GET /api/notifications`, com o dispositivo/IP da tentativa) e **e-mail
  transacional** enfileirado na Central. Inclui **protocolo eletrônico**
  `AAAA-NNNNNN` (Resolução ANAC 520/2019) e **outbox transacional** gravado junto
  de cada bloco do ledger, com
  **publicação no RabbitMQ** (exchange topic `vortex.events`, at-least-once,
  reconexão e backoff). O **consumidor idempotente** deduplica por `messageId`
  (inbox), retenta com atraso e descarta na dead-letter queue após o teto de
  tentativas; ele projeta o **Hub de Alertas Preditivos** (`GET /api/mro/alerts`)
  a partir dos eventos de medição e conformidade. O outbox tem **teto de
  tentativas** (evento que não publica é marcado como abandonado, não apagado) e
  métricas em `GET /api/health/bus`; um **monitor** vigia o atraso e abre alarmes
  (`notifications.bus_alarms`), e um administrador do tenant pode devolver
  eventos abandonados à fila em `POST /api/bus/redrive` (auditado no ledger).
  A **Central de Comunicação** (`/api/communication/*`) expõe chat, alertas,
  comunicados e e-mails: conversas, mensagens, comunicados e e-mails ancoram
  bloco no ledger, os badges da Shell são contagem derivada e as marcas de
  leitura são estado de consumo por usuário (não geram bloco). A Central também
  tem **push em tempo real** por WebSocket (socket.io): o canal só **avisa** o
  que já foi ancorado no ledger, o handshake autentica o JWT e cada socket entra
  nas salas do seu contexto (usuário, tenant, empresa) e, sob confirmação do
  RLS, na sala de cada conversa. A API aplica **rate limit por IP** em Redis
  (teto global e limites mais apertados em `login`/`refresh`/`logout`).
- `apps/shell-web` — **host federado** (`app.vortex.com`): portal, login e o
  chrome compartilhado (`@vortex/shell`), montando os MFEs dos domínios em
  subcaminhos (hoje o MRO sob `/mro`). O chrome traz a **Central de
  Comunicação** (Chat, Alertas, E-mails, Comunicados, Notificações) alimentada por
  `summary()`.
- `apps/mro-web` — frontend Angular do ERP Manutenção **e primeiro MFE
  federado** (`mro.vortex.com`): login, painel de conformidade da frota, ficha
  da aeronave (itens, urgências, execução que gera **protocolo** + bloco no
  ledger, leituras de medidor) e lista de aeronaves. Expõe só as rotas
  (`./Routes`) para o host e roda completo no modo standalone, com proxy `/api`
  para a API em desenvolvimento.
- `libs/util-aeronautics` — motor puro portado e testado (49 testes).
- `libs/core` / `libs/ui` — núcleo de acesso (envelope + erro normalizado,
  sessão com renovação silenciosa, interceptor Bearer + `Idempotency-Key` +
  retry no `TOKEN_EXPIRED`, guards, tema) e Design System. O `@vortex/core`
  traz ainda o cliente de tempo real da Central de Comunicação
  (`CommunicationRealtime`), que alimenta os badges por push e relê o resumo ao
  reconectar.

Ainda não implementado (ver seções 19 a 21 de
`repos-externos/ANALISE-APLICACAO-VORTEX.md`): SSO entre subdomínios, os demais
MFEs, o empacotamento de deploy do frontend, o envio real de e-mails (o aviso de
reuso apenas **enfileira** o transacional, não o despacha) e a tela de composição
do chat (o socket entrega os avisos, mas ainda não há editor de conversas na
Shell). Também seguem abertos a profundidade das filas do RabbitMQ (exige plugin
de management), o alarme por e-mail/in-app dos alarmes do bus e 2FA/RBAC fino.

## Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Healthcheck |
| `GET` | `/api/health/bus` | Métricas do outbox (lag, abandonados) e da inbox |
| `POST` | `/api/bus/redrive` | Devolve à fila eventos abandonados (admin do tenant) |
| `POST` | `/api/auth/login` | Login (senha verificada no banco) |
| `POST` | `/api/auth/refresh` | Rotaciona o refresh token e emite novo access token |
| `POST` | `/api/auth/logout` | Revoga a família de refresh tokens |
| `POST` | `/api/auth/password` | Troca a senha e revoga todas as sessões |
| `POST` | `/api/auth/sessions/revoke` | Encerra todas as sessões do usuário |
| `GET` | `/api/auth/sessions` | Lista as sessões ativas (dispositivo, IP, datas) |
| `POST` | `/api/auth/sessions/:sessionId/revoke` | Encerra uma sessão específica |
| `GET` | `/api/auth/me` | Vínculos do usuário autenticado |
| `GET` | `/api/protocols/:protocolNumber` | Consulta de protocolo (RLS) |
| `GET` | `/api/ledger/verify` | Integridade da cadeia do ledger |
| `GET`/`POST` | `/api/mro/aircraft` | Aeronaves |
| `GET`/`POST` | `/api/mro/aircraft/:id/meter-readings` | Leituras de medidor |
| `GET`/`POST` | `/api/mro/aircraft/:id/compliance-items` | Itens de conformidade |
| `POST` | `/api/mro/compliance/done` | Execução (gera bloco + protocolo) |
| `GET` | `/api/mro/alerts` | Alertas correntes do Hub Preditivo (projeção) |
| `GET` | `/api/notifications` | Avisos diretos ao usuário (ex.: sessão encerrada por segurança) |
| `POST` | `/api/notifications/:notificationId/read` | Marca um aviso como lido |
| `GET` | `/api/communication/summary` | Contadores (chat, alertas, e-mails, comunicados, notificações) |
| `GET`/`POST` | `/api/communication/conversations` | Conversas visíveis / criar conversa |
| `GET`/`POST` | `/api/communication/conversations/:id/messages` | Mensagens da conversa |
| `POST` | `/api/communication/conversations/:id/read` | Marca a conversa como lida |
| `GET` | `/api/communication/alerts` | Alertas correntes do Hub (janela da Central) |
| `GET`/`POST` | `/api/communication/announcements` | Comunicados oficiais (publicar exige admin) |
| `GET`/`POST` | `/api/communication/mail` | Caixa de e-mails transacionais |

Toda rota autenticada exige `Authorization: Bearer <token>`. Rotas de mutação
exigem também `Idempotency-Key`.

O host federado fica em `http://localhost:4300` e encaminha `/api` para a API;
o MFE `mro-web` sobe sozinho em `http://localhost:4301`.

## Requisitos

- Node.js 22+
- pnpm 10+
- Docker 26+ com Compose v2 (ou Podman + `podman-compose`)

## Início rápido (desenvolvimento local)

```bash
# 1. Configurar ambiente
cp .env.example .env

# 2. Instalar dependencias do workspace
pnpm install

# 3. Subir a infraestrutura (PostgreSQL, Redis, RabbitMQ, MinIO)
make infra-up

# 4. Aplicar migracoes e seed de desenvolvimento
make migrate
make seed

# 5. Rodar a API em modo dev
make serve

# 6. Rodar o host federado (outro terminal)
make web
```

A API fica em `http://localhost:3400/api` e o healthcheck em
`http://localhost:3400/api/health`.
O host federado fica em `http://localhost:4300` (o `mro-web` standalone sobe em
`http://localhost:4301` com `pnpm nx serve mro-web`).

Alternativamente, suba tudo em containers (a API aplica as migrações no boot):

```bash
make up
```

## Verificação

```bash
# Envelope padrao { success, data, error }
curl http://localhost:3400/api/health

# Qualidade: typecheck + lint + testes + build
make verify

# Testes end-to-end (sobe o servidor de verdade)
make e2e

# Integridade da cadeia do ledger
curl http://localhost:3400/api/ledger/verify
```

## Segredos (IMPORTANTE)

1. `cp .env.example .env` e preencha os valores.
2. Gere segredos fortes: `openssl rand -base64 32`.
3. Gere as chaves Ed25519 do ledger: `make ledger-key` (usa
   `openssl genpkey -algorithm ed25519` ou `node tools/gen-ledger-key.mjs`).
4. Valide que o `.env` está ignorado: `git check-ignore .env`.
5. **NUNCA** commite o `.env` real.

## Comandos úteis

| Comando | Ação |
|---------|------|
| `make install` | Instala dependências (pnpm) |
| `make build` / `make verify` | Compila / typecheck + lint + test + build |
| `make test` / `make e2e` | Testes unitários / end-to-end |
| `make serve` | API em modo dev (porta 3400) |
| `make web` | Host federado `shell-web` em modo dev (porta 4300; monta o `mro-web`) |
| `make infra-up` / `make up` | Sobe infraestrutura / infraestrutura + API |
| `make down` / `make logs` | Derruba / acompanha os containers |
| `make migrate` / `make seed` | Aplica migrações / seed de desenvolvimento |
| `make ledger-key` | Gera o par Ed25519 do ledger em `.secrets/` |
| `make prod-up` / `make prod-down` | Sobe/derruba produção |
| `make prod-bootstrap` | Cria o administrador de produção (container em execução) |
| `make prod-bootstrap-check` | Valida `ADMIN_*`/`TENANT_*`/`COMPANY_*` sem gravar nada |
| `make backup` / `make restore FILE=...` | Backup e restauração |

## Instalação em VPS limpa

Procedimento completo em um servidor Debian/Ubuntu recém-instalado. Requer
Docker Engine com o plugin Compose v2, `git`, `make`, `openssl` e (para backup)
o cliente do PostgreSQL 16. O Node.js **não** é necessário no host: as imagens
trazem o runtime. Se `make` não estiver disponível, cada alvo abaixo é um atalho
para o `docker compose` equivalente.

### 1. Docker e utilitários

```bash
apt-get update
apt-get install -y ca-certificates curl git make openssl ufw
curl -fsSL https://get.docker.com | sh
docker compose version
```

O `docker compose version` deve responder `v2.x`. Se o comando não existir,
instale o plugin: `apt-get install -y docker-compose-plugin`.

O cliente do PostgreSQL (mesma versão 16 do servidor) é necessário para
`make backup` / `make restore` no host. Instale pelo repositório oficial, que
garante a versão 16 mesmo em distros que empacotam uma mais antiga:

```bash
install -d /usr/share/postgresql-common/pgdg
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
. /etc/os-release
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" > /etc/apt/sources.list.d/pgdg.list
apt-get update
apt-get install -y postgresql-client-16
pg_dump --version
```

`pg_dump --version` deve responder `16.x`. O cliente do MinIO (`mc`) é opcional:
o `backup.sh` usa o `mc` do host se existir; caso contrário, baixa a imagem
`minio/mc` automaticamente via Docker.

### 2. Código e configuração

```bash
mkdir -p /opt && cd /opt
git clone <seu-repo-url> vortex && cd vortex
cp .env.example .env
```

Gere os seis segredos. São valores aleatórios e independentes, só seus. O `hex`
é usado nos quatro primeiros porque a senha do RabbitMQ entra numa URL de
conexão (caracteres como `/` e `+` quebrariam a URL):

```bash
for name in DB_ADMIN_PASSWORD DB_APP_PASSWORD REDIS_PASSWORD RABBITMQ_PASSWORD MINIO_ROOT_PASSWORD; do
  printf '%s=%s\n' "$name" "$(openssl rand -hex 24)"
done
printf 'JWT_SECRET=%s\n' "$(openssl rand -base64 48)"
```

Cada linha impressa é uma variável pronta para colar no `.env`. Não é preciso
repetir nem reexecutar nada: o `docker compose` lê o `.env` uma única vez e
aplica o mesmo valor nos dois lados de cada serviço. As demais variáveis:

- `MINIO_ROOT_USER=vortex` (usuário, não é segredo).
- `RABBITMQ_URL`: só é usada fora do Docker; no compose a URL é montada
  automaticamente a partir de `RABBITMQ_USER`/`RABBITMQ_PASSWORD`. Pode deixar
  como está.
- `IMAGE_TAG=prod`, `WEB_PORT=8080`, `API_PORT=3400`.
- `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_CPF` (11 dígitos), `ADMIN_PASSWORD` (12+
  caracteres, 3 das 4 classes), `TENANT_NAME`, `TENANT_TYPE`, `COMPANY_CNPJ`
  (14 dígitos), `COMPANY_NAME`, `COMPANY_TRADE_NAME`. O bootstrap valida tudo
  antes de gravar; dá para conferir com `make prod-bootstrap-check`.
- `SEED_ON_BOOT=false` e `BOOTSTRAP_ON_BOOT=false` (mantenha assim).

Se a senha do admin tiver `#` ou `$`, coloque-a entre aspas no `.env`
(`ADMIN_PASSWORD="..."`), pois o compose trata `#` como comentário e `$` como
interpolação.

### 3. Chave do ledger (Ed25519)

```bash
mkdir -p .secrets
openssl genpkey -algorithm ed25519 -out .secrets/ledger_ed25519.pem
openssl pkey -in .secrets/ledger_ed25519.pem -pubout -out .secrets/ledger_ed25519.pub
chmod 600 .secrets/ledger_ed25519.pem
```

`LEDGER_PRIVATE_KEY_FILE`/`LEDGER_PUBLIC_KEY_FILE` já apontam para esses arquivos
no `.env.example`. Com Node.js no host, `make ledger-key` gera o mesmo par
(PKCS#8 + SPKI); o `openssl` evita instalar Node só para isso.

### 4. Subir a produção

```bash
# Equivale a: docker compose -f docker-compose.prod.yml up -d --build
make prod-up
# Aguarde `api` e `web` aparecerem como "healthy"
docker compose -f docker-compose.prod.yml ps
```

O entrypoint da API espera Postgres/Redis, aplica as migrações e sobe o app. O
compose exige que os arquivos de `.secrets/` existam (passo 3).

### 5. Criar o administrador (primeiro acesso)

```bash
# Valide ADMIN_*/TENANT_*/COMPANY_* sem gravar nada
make prod-bootstrap-check
# Crie tenant, empresa, usuario e vinculo ADMIN
make prod-bootstrap
```

Numa VPS limpa não existe usuário: sem o bootstrap o login retorna 401. É
idempotente; para redefinir a senha de um admin existente defina
`BOOTSTRAP_RESET_PASSWORD=true` no `.env` e reexecute.

### 6. Firewall e acesso

No `docker-compose.prod.yml` apenas a UI (`web`) publica porta em todas as
interfaces. Postgres, MinIO e a API publicam **somente em loopback**
(`127.0.0.1`), então não há nada a proteger com firewall além da própria UI:

```bash
ufw allow 22/tcp
ufw allow 8080/tcp
ufw enable
ufw status
```

Se `WEB_PORT` for diferente de `8080`, ajuste o `ufw allow`. Não é necessário
liberar `3400` (API), `5432` (Postgres) nem `9000` (MinIO): a UI fala com a API
pela rede interna do compose (`http://api:3400`) e o `make backup` fala com o
Postgres/MinIO pelo loopback da própria VPS.

- UI: `http://SEU_IP:8080`
- API via proxy da UI: `curl http://SEU_IP:8080/api/health`
- API direta, na própria VPS: `curl http://127.0.0.1:3400/api/health`

Se precisar da API a partir da sua máquina sem expô-la, use um túnel SSH:

```bash
ssh -L 3400:127.0.0.1:3400 usuario@SEU_IP
curl http://127.0.0.1:3400/api/health
```

O login usa `ADMIN_EMAIL`/`ADMIN_PASSWORD`. A UI fala com a API pela mesma
origem (`/api`, proxy do nginx do container web).

Para domínio próprio com HTTPS, configure um proxy reverso (Nginx/Caddy)
apontando para a porta `WEB_PORT` e emita certificado Let's Encrypt.

### Administrador de produção

`tools/bootstrap-admin.mjs` cria a identidade mínima para o primeiro acesso:
tenant, empresa, usuário e vínculo `ADMIN`. É idempotente e não troca a senha de
um admin existente (use `BOOTSTRAP_RESET_PASSWORD=true` para redefinir). Pode
rodar no boot (`BOOTSTRAP_ON_BOOT=true`) ou sob demanda (`make prod-bootstrap`).
A senha exige 12+ caracteres e 3 das 4 classes (minúsculas, maiúsculas, dígitos,
símbolos). A criação roda em **uma transação** e ancora um bloco de sistema
(`identity.users` / `ADMIN_BOOTSTRAPPED`) na **mesma cadeia de hashes** do
ledger, assinado com a chave Ed25519; sem a chave o bootstrap segue, mas avisa
que o evento não foi ancorado.

### Backup e restauração

`make backup` / `make restore FILE=...` rodam no host e exigem `pg_dump` /
`pg_restore`. Para o MinIO usam o `mc` do host ou, na ausência, a imagem oficial
`minio/mc` via Docker. O `docker-compose.prod.yml` publica Postgres e MinIO
somente em loopback (`127.0.0.1:5432` e `127.0.0.1:9000`), para que estes
comandos funcionem sem expor a infraestrutura à internet.

Os valores lidos do `.env` (`DB_HOST=127.0.0.1`, `DB_PORT=5432`,
`MINIO_ENDPOINT=http://127.0.0.1:9000`) já vêm corretos no `.env.example`.

```bash
cd /opt/vortex
make backup
make restore FILE=backups/vortex_backup_YYYYmmdd_HHMMSS.tar.gz
```

O backup precisa sair da VPS (regra 3-2-1: outra máquina, outra conta,
idealmente outro provedor). Copie o arquivo mais recente:

```bash
rsync -avz backups/ usuario@outro-servidor:/srv/vortex-backups/
```

O `backup.sh` mantém retenção local de `BACKUP_RETENTION_DAYS` (30 por padrão) e
apaga os arquivos mais antigos; a cópia offsite não é feita pelo script. Guarde
a chave de criptografia do backup fora da VPS e teste a restauração
trimestralmente num ambiente isolado.

## Documentação

- `CLAUDE.md` — contrato global vigente (Angular + Nx) e plano de construção.
- `vortex-v2/docs/` e `vortex-v2/prompts-v4/` — documentação de apoio e prompts.
- `v1-rascunho-superado/CLAUDE.md` — contrato do rascunho v1 (React + Turborepo),
  superado; mantido apenas como registro do primeiro desenho.
- `repos-externos/ANALISE-APLICACAO-VORTEX.md` — registro do reaproveitamento de
  lógica, lacunas explícitas e próximo passo

## Material não-v4

O produto é o workspace Nx v4 (`apps/`, `libs/`, `migrations/`, `tools/`). O
restante do repositório é referência ou rascunho superado, fora do grafo de
projetos do Nx (ver `.nxignore`):

- `v1/` — rascunho v1 (React 19 + Vite + Turborepo), superado.
- `v1-rascunho-superado/` — cópia em texto do rascunho v1 no estado inicial,
  incluindo o contrato daquela versão.
- `vortex-v2/` — documentação de apoio do contrato vigente (ver acima).
- `ANAC/` — fragmentos das resoluções/regulamentos (fonte regulatória).
- `repos-externos/` — clones de terceiros para estudo.
- `Makefile.makefile`, `Dockerfile.dockerfile` e `.env.example.env` — cópias do
  template antigo, marcadas como SUPERADAS no próprio conteúdo.

## Licença

Proprietária. Uso interno restrito. Distribuição não autorizada.
