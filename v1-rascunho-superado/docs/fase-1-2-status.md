# VORTEX — Fase 1 + Fase 2

Entrega do zero (zips ignorados). Visual da Shell no estilo MonkeyCode: fundo #0b0d10, denso, mono para IDs.

## Feito

- Monorepo pnpm + Turborepo (`apps/api`, `apps/web`, `packages/{types,utils,config,database}`)
- Docker Compose: PostgreSQL 16, Redis, RabbitMQ, MinIO
- Rconta 7+2 no frontend (Pessoal, Profissional, Empresarial, Protocolo, Assinaturas, Personalizacao, Seguranca + Dashboard, Configuracoes) e Estoque, Ledger, Recrutamento
- Validacao N0-N3 (selos; fluxo nao bloqueia)
- Vinculo pessoa-empresa nasce PENDING; ACTIVE so com dupla confirmacao
- Profissional: perfil, CIV, CMA, experiencia
- Estoque/custodia pessoal e empresarial com origem por item
- Recrutamento agregador (vagas + candidatura)
- RBAC por papel + RLS FORCADO via `SET LOCAL ROLE vortex_app` (`app.person_id` / `app.tenant_id`)
- Teste de integracao RLS: sem vinculo retorna 0 linhas
- Ledger append-only SHA-256 encadeado + Ed25519 persistido em `.secrets/`; trigger anti UPDATE/DELETE
- Criador da empresa nasce com vinculo PENDING (dupla confirmacao no UI)
- Protocolo AAAA-NNNNNN
- Envelope `{ success, data, error }` e Idempotency-Key
- Proxy Vite `/api` -> API 3001
- Seed: edilson@vortex.local / Vortex@123

## Nao feito (lacunas)

- 18 microservicos (um NestJS modular na Fase 1+2; split nas fases seguintes)
- Module Federation com 8 remotes (Shell unica na Fase 1+2; launcher visual dos 8 apps)
- Assinatura ICP-Brasil / MinIO / documentos estruturados (Fase 3)
- Billing, PPSP, hub preditivo (Fase 4)
- ERPs 43/145, 91/135, 141/142, 153 (Fases 5-7)
- RLoja, chat real, BRE, integracoes ANAC/Asaas (Fase 8)
- 2FA, banners servidos por campanha, N2 contra Receita/SACI/RAB de verdade
- Camada administrativa RH/Financeiro/Contabilidade
