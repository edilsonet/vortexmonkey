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
  leitura são estado de consumo por usuário (não geram bloco).
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
  retry no `TOKEN_EXPIRED`, guards, tema) e Design System.

Ainda não implementado (ver seções 19 a 21 de
`repos-externos/ANALISE-APLICACAO-VORTEX.md`): SSO entre subdomínios, os demais
MFEs, o empacotamento de deploy do frontend, WebSocket/push da Central e o envio
real de e-mails (o aviso de reuso apenas **enfileira** o transacional, não o
despacha); também seguem abertos a profundidade das filas do RabbitMQ
(exige plugin de management), o alarme por e-mail/in-app dos alarmes do bus e
2FA/RBAC fino.

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
| `make backup` / `make restore FILE=...` | Backup e restauração |

## Deploy (VPS + Docker Compose)

```bash
# No servidor: instale Docker e o plugin Compose, depois clone o repositorio
git clone <seu-repo-url> /opt/vortex && cd /opt/vortex

# Configure os segredos obrigatorios
cp .env.example .env
nano .env   # DB_ADMIN_PASSWORD, DB_APP_PASSWORD, REDIS_PASSWORD,
            # RABBITMQ_PASSWORD, MINIO_ROOT_*, LEDGER_*

# Gere a chave do ledger e aponte LEDGER_PRIVATE_KEY_FILE/LEDGER_PUBLIC_KEY_FILE
make ledger-key

# Suba em producao
make prod-up
```

A API fica em `http://SEU_IP:3400`. Para domínio próprio com HTTPS, configure um
proxy reverso (Nginx/Caddy) apontando para a porta 3400 e emita certificado
Let's Encrypt.

## Documentação

- `vortex-v2/CLAUDE.md` — contrato global vigente (v2: Angular + Nx) e plano de
  construção; `vortex-v2/docs/` e `vortex-v2/prompts-v4/` são o material de apoio.
- `CLAUDE.md` (raiz) — rascunho v1 (React + Turborepo), superado; mantido apenas
  como registro do primeiro desenho.
- `repos-externos/ANALISE-APLICACAO-VORTEX.md` — registro do reaproveitamento de
  lógica, lacunas explícitas e próximo passo

## Material não-v4

O produto é o workspace Nx v4 (`apps/`, `libs/`, `migrations/`, `tools/`). O
restante do repositório é referência ou rascunho superado, fora do grafo de
projetos do Nx (ver `.nxignore`):

- `v1/` — rascunho v1 (React 19 + Vite + Turborepo), superado.
- `v1-rascunho-superado/` — cópia em texto do rascunho v1 no estado inicial.
- `vortex-v2/` — contrato v2 e documentação (ver acima).
- `ANAC/` — fragmentos das resoluções/regulamentos (fonte regulatória).
- `repos-externos/` — clones de terceiros para estudo.
- `Makefile.makefile`, `Dockerfile.dockerfile` e `.env.example.env` — cópias do
  template antigo, marcadas como SUPERADAS no próprio conteúdo.

## Licença

Proprietária. Uso interno restrito. Distribuição não autorizada.
