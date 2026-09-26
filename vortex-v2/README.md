# VORTEX v2 — Documentação de Especificação (Angular + Nx)

> **Versão 2 — 12/09/2026.** Reformulação completa da v1 (React 19 + Turborepo) para **Angular moderno** (signals, standalone components, `inject()`, `@if`/`@for`) + **NestJS com monorepo Nx**. 13 aplicativos, Núcleo separado da Rconta, ledger imutável com conteúdo cifrado e acesso auditado (zero-trust).

## Estrutura desta pasta

| Arquivo | Conteúdo |
|---------|----------|
| `CLAUDE.md` | **Contrato global v2** — identidade, stack, 11 princípios imutáveis, seções 5-A (ledger com acesso governado), 5-B (bloco de assinatura SEI), 6 (contabilidade de dupla entrada), 7 (Shell SPA Opção A→B→C), 13 apps, plano de criação em 10 partes, registro de decisões |
| `docs/00-visao-geral.md` | Porta de entrada: 13 apps, princípio central, modelo de negócio, estoque bidirecional, fases |
| `docs/01-matriz-regulatoria.md` | ~1.370 requisitos rastreáveis por RBAC (coluna App atualizada para os 13 apps) |
| `docs/02-parametros-prazos.md` | Valores oficiais (validades, retenções, MEL, combustível, jobs) |
| `docs/03-formularios-anac.md` | Catálogo de formulários ANAC + bloco de assinatura SEI |
| `docs/04-enums-controlados.md` | Enums regulatórios + enums v2 (assinaturas, concessões, origens de estoque) |
| `docs/05-seeds-rbac.md` | Seeds canônicos por RBAC (padrão Nx `@vortex/shared-dto`) |
| `docs/06-lacunas.md` | Registro histórico de auditoria (todas as lacunas resolvidas na v2) |
| `docs/07-delimitacao.md` | Prevalência dos valores oficiais |
| `docs/08-odoo-esqueleto.md` | Referência conceitual (filosofia ERP/CRM) |
| `docs/09-mapa-adaptacao-vortex.md` | Mapa de adaptação: conceitos → 13 apps |
| `docs/10-navegacao-por-app.md` | Navegação nível-clique por app (referência do frontend) |
| `docs/prompts/parte-1.md` a `parte-10.md` | **As 10 partes de construção** (prompts de execução fase a fase) |

## Os 13 aplicativos

1. **Núcleo** (nucleo.vortex.com) — Cadastro Central + Ledger + Banco Central + console de gestão (zero-trust)
2. **Rconta** (rconta.vortex.com) — app do usuário (7 módulos + 2 menus)
3. **RLoja** (market.vortex.com) — marketplace multi-vendor, comissão 3%
4. **Recrutamento** (recruta.vortex.com) — vagas de 2 origens, sem comissão
5. **ERP Manutenção** (mro.vortex.com) — 43/145, oficina em 12 etapas
6. **ERP Operadores** (ops.vortex.com) — 91/119/121/135
7. **ERP Cursos** (training.vortex.com) — 141/142 + ISs
8. **ERP Agrícola** (agri.vortex.com) — 137
9. **ERP Aeródromos** (airport.vortex.com) — 153
10. **App ANAC** (anac.vortex.com) — auditor do ledger (somente-leitura)
11. **Travel** (travel.vortex.com) — passagens 121
12. **Fretamento** (charter.vortex.com) — 135/137
13. **Certificações e Publicações** (certpub.vortex.com) — produto + assinaturas anuais

## Stack

- **Frontend:** Angular 19+ (standalone, signals, `inject()`, `@if`/`@for`, OnPush) + Angular Material + Design System próprio
- **Backend:** NestJS + PostgreSQL 16 (RLS) + TypeORM/SQL nativo (sem Prisma, sem CQRS, sem TimescaleDB)
- **Monorepo:** Nx (24 apps/serviços + 17 libs)
- **Infra:** Redis, RabbitMQ, MinIO, WebSockets
- **Ledger:** append-only, SHA-256 encadeado + Ed25519, payload cifrado AES-256-GCM, acesso governado por concessões

## Como usar

1. Ler o `CLAUDE.md` (contrato) + `docs/00` (visão geral)
2. Executar as partes 1 a 10 em ordem — **uma fase por vez**, testando antes de avançar
3. Em divergência de valores: `docs/07` prevalece; em arquitetura: `CLAUDE.md`

---

*Histórico: a v1 (React/Turborepo) permanece na raiz deste repositório. Esta pasta (`vortex-v2/`) é a especificação vigente.*
