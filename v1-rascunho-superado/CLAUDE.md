# CLAUDE.md — VORTEX (CONTRATO GLOBAL E PLANO DE CRIAÇÃO)

> Leia este arquivo primeiro, sempre. Ele define identidade, princípios imutáveis, arquitetura, regras de engenharia e o plano de construção completo do ecossistema VORTEX.
> Arquivos de apoio: `docs/00-visao-geral.md` a `docs/10-navegacao-por-app.md` e `docs/prompts/parte-1.md` a `parte-8.md`.
> Valor oficial: `docs/07-delimitacao.md` prevalece sobre qualquer outro em caso de divergência.

---

## 1. IDENTIDADE

O VORTEX é um ecossistema integrado de **conformidade, governança, RH, estoque e comércio** para a aviação civil brasileira, cobrindo os segmentos regulados pela ANAC (RBAC 01, 21, 39, 43/145, 61/63/65, 67, 91/119/121/135, 120, 137, 141/142/145-010, 153, 183).

- Registros eletrônicos imutáveis: **Resolução ANAC nº 458/2017**.
- Assinatura eletrônica: **Lei nº 14.063/2020**.
- Protocolo eletrônico: **Resolução ANAC nº 520/2019** (formato `AAAA-NNNNNN`).

Referências conceituais de esqueleto de ERP/CRM (apenas ideia, sem código): `docs/08-odoo-esqueleto.md` e `docs/09-mapa-adaptacao-vortex.md`.

---

## 2. STACK (IMUTÁVEL)

- Backend: **NestJS + TypeScript estrito**, monorepo **Turborepo**.
- Banco: **PostgreSQL 16** com Row-Level Security (RLS). **Nunca MongoDB.**
- Cache/sessão/rate-limit: **Redis**. Fila/eventos: **RabbitMQ**. Arquivos: **MinIO** (presigned URLs).
- Frontend: **React 19 + Vite + Module Federation + Tailwind + shadcn/ui**.
- Um único backend `api.vortex.com`; frontends separados por subdomínio.
- Multi-tenant lógico por RLS: tenant é **contexto**, nunca dono do dado.

---

## 3. PRINCÍPIOS ARQUITETURAIS (IMUTÁVEIS)

1. **Núcleo dono da verdade:** a Rconta concentra Pessoas, Profissionais, Empresas, Estoque e Documentos. Os apps (ERPs, RLoja, Recrutamento) **consomem** — nunca criam cadastro duplicado de pessoa, produto, vaga ou currículo.
2. **Ledger imutável (append-only):** todo evento relevante vira bloco com hash SHA-256 encadeado + assinatura Ed25519. Apps exibem **filtros do ledger**, nunca histórico duplicado.
3. **Validação em níveis que nunca bloqueia fluxo:** N0 pendente (⚪) → N1 sistema (🟡) → N2 fonte oficial (🟢 gov/Receita/Correios/SACI/RAB) → N3 empresa/administrador (🔵 autêntico). Dado pendente é exibido sem selo; o fluxo nunca para por aprovação.
4. **Vínculo misto com dupla confirmação:** pessoa↔empresa só fica ATIVO quando os dois lados aprovam.
5. **Monetização:** RLoja por **comissão de 3% do vendedor** (comprador isento). **6 produtos por assinatura:** Rconta VIP, Recrutamento, ERP Manutenção, ERP Operadores, ERP Cursos e Treinamentos, ERP Aeródromos. **Catálogo Central não é vendido** (só inserção/busca).
6. **Cursos só pelo ERP de Cursos e Treinamentos (141/142/145-010):** é o único que cria e vende cursos na RLoja; os demais ERPs têm treinamento interno apenas para funcionários.
7. **Estoque e custódia:** estoque pessoal no módulo Profissional; estoque empresarial (1 por empresa) no módulo Empresarial; catálogo único no Catálogo Central. Contratou ERP → custódia migra para o ERP. Suspendeu/cancelou → estoque volta à Rconta como **um único estoque** com marcação de origem por item. Regularizou → o sistema **pergunta** se restaura os estoques nas posições originais; itens vendidos não voltam.
8. **Banners:** Rconta grátis exibe anúncios; Rconta VIP ou compra de qualquer ERP remove os anúncios **apenas na Rconta do comprador**.

---

## 4. MODELO EM CAMADAS (ERP + CRM completo)

### 4.1 Camada administrativa geral (vale para qualquer empresa/tenant)
RH · Financeiro · Contabilidade · Compras · Comercial/CRM · Estoque/Administrativo · Documentos/Contratos.
- **RH:** colaboradores (vínculo aprovado da Rconta), contratos, cargos, escalas, férias/ausências, ponto, despesas, treinamentos internos.
- **Financeiro:** contas a pagar/receber, faturas, cobranças, fluxo de caixa, conciliação.
- **Contabilidade:** plano de contas padrão (normas públicas brasileiras — conhecimento comum/regulatório), diário, razão, balancete, DRE, fechamento.
- **Compras:** pedidos, cotações, fornecedores (empresas do núcleo), recebimento, faturamento.
- **Comercial/CRM:** pipeline de oportunidades do negócio (estágios, equipes, motivos de perda).
- **Documentos/Contratos:** contratos, renovações, alertas de vencimento.

### 4.2 Camada de domínio (particularidades por ERP)
- **ERP Manutenção (43/145):** Biblioteca Técnica · Suprimentos (Ferramentaria, Estoque técnico, Compras, Importações) · Setor de Registros · Manutenção/Oficina (12 etapas).
- **ERP Operadores (91/121/135/137):** 2 departamentos — **Operações** e **Manutenção** (+ Aeroagrícola 137 quando aplicável).
- **ERP Cursos e Treinamentos (141/142/145-010):** departamento **Cursos e Treinamentos**.
- **ERP Aeródromos (153):** pista/RWYCC · SESCINC · fauna/SIGRA · SGSO · infraestrutura.

### 4.3 CRM por ERP
Cada ERP tem seu pipeline comercial do domínio: Operadores vendem fretamento/charters; Manutenção vende serviços de manutenção; Cursos vendem matrículas; Aeródromos vendem contratos/espaços.

---

## 5. CENTRAL DE COMUNICAÇÃO (barra superior da Shell — em todos os apps)

- **Chat:** conversas entre usuários da mesma empresa/tenant + conversas do processo seletivo.
- **Alertas:** badges do Hub Preditivo (INFO/WARNING/CRITICAL/BLOCKING).
- **E-mails:** caixa de e-mails transacionais.
- **Comunicados Oficiais:** avisos da plataforma e da empresa.
- **Tema:** claro → escuro → personalizado (alterna a cada clique).
- Toda conversa/comunicado relevante gera bloco no Ledger; a Central apenas **exibe** (filtro), sem duplicar.

---

## 6. AS 10 REGRAS IMUTÁVEIS DE ENGENHARIA

1. Toda escrita: valida permissão (RBAC/ABAC) → executa ação de domínio → registra no ledger → gera protocolo (se aplicável) → publica evento no bus.
2. Ledger é append-only; UPDATE/DELETE bloqueados por trigger no banco.
3. Tenant é contexto; tabelas operacionais têm `user_id`, `company_id`, `tenant_id`.
4. Frontend nunca valida regra regulatória soberanamente — sempre no backend.
5. Padrão de resposta global: `{ success, data, error }` com `code` de erro.
6. Rotas de escrita exigem `Idempotency-Key` (Redis, 24h).
7. Um banco; schemas por domínio; RLS por linha. Nunca banco/schema por cliente.
8. Código sempre com migrações SQL + testes de integração.
9. Secrets só em env/secret manager; nunca commitar `.env` (GitGuardian).
10. Toda entrega lista o que fez e o que NÃO fez (nunca silenciar lacunas).

Erros padrão: `AUTH_REQUIRED`(401) · `TOKEN_EXPIRED`(401) · `PERMISSION_DENIED`(403) · `NOT_FOUND`(404) · `VALIDATION_ERROR`(422) · `RATE_LIMITED`(429) · `IDEMPOTENCY_CONFLICT`(409) · `LEDGER_VERIFICATION_FAILED`(500).

---

## 7. ESTRUTURA DO MONOREPO
```
/apps
  api-gateway            # gateway, rate limit, idempotência
  auth-service           # login, refresh, 2FA, sessões
  ledger-service         # ledger imutável (SHA-256 + Ed25519)
  protocol-service       # protocolo AAAA-NNNNNN
  document-service       # documentos, versões, hash
  catalog-service        # Catálogo Central (fonte da verdade)
  subscription-service   # billing, assinaturas, comissões
  identity-service       # Rconta: pessoas, contatos, empresas, vínculos
  professional-service   # Rconta: currículo, CIV, CMA, certificados
  stock-service          # estoques + custódia dinâmica
  recruitment-service    # agregador de vagas/candidaturas
  rloja-service          # marketplace por comissão
  communication-service  # Central de Comunicação
  notification-service   # e-mail + in-app + alertas
  ops-mro                # ERP Manutenção 43/145
  ops-operators          # ERP Operadores 91/121/135/137
  ops-training           # ERP Cursos 141/142/145-010
  ops-airport            # ERP Aeródromos 153
/packages
  types · utils · config · database
```

Schemas PostgreSQL: `identity` · `professional` · `stock` · `recruitment` · `market` · `communication` · `mro` · `ops` · `training` · `airport` · `ledger` · `protocol` · `documents` · `signatures` · `catalog` · `subscriptions` · `oauth` · `compliance` · `notifications`.

---

## 8. APLICATIVOS E SUBDOMÍNIOS

| # | Aplicativo | Subdomínio | Modelo | Escopo |
|---|-----------|------------|--------|--------|
| 1 | **Rconta** | rconta.vortex.com | Grátis (banners) / VIP | Núcleo: 7 módulos + 2 menus |
| 2 | **Catálogo Central** | catalogo.vortex.com | Não vendido | Catálogo único (inserção/busca) |
| 3 | **RLoja** | market.vortex.com | Comissão 3% | Marketplace B2B (agrega estoques) |
| 4 | **Recrutamento** | recruta.vortex.com | Assinatura | Agregador de vagas (ERPs) + currículos (Rconta) |
| 5 | **ERP Manutenção** | mro.vortex.com | Assinatura | Oficina 43/145 |
| 6 | **ERP Operadores** | ops.vortex.com | Assinatura | 91/119/121/135/137 + aeroagrícola |
| 7 | **ERP Cursos e Treinamentos** | training.vortex.com | Assinatura | 141/142/145-010 (único que vende cursos) |
| 8 | **ERP Aeródromos** | airport.vortex.com | Assinatura | 153 |

**Rconta — 7 módulos + 2 menus:** Pessoal · Profissional · Empresarial · Protocolo · Assinaturas · Personalização · Segurança + Dashboard · Configurações.

---

## 9. TERMINOLOGIA (PT-BR técnico ANAC)

OS · FORM 8130-3 · APRS/CRS · DA/FCDA · SEGVOO 001 · MIP/MGQ · CIV · CMA · MEL · RWYCC/RCR · SESCINC · SGSO · CDAG · ARSO · PPSP · DOV · CHT · FSTD · S141 · PCN/IRI · SIGRA.

---

## 10. PLANO DE CRIAÇÃO (UMA FASE POR VEZ — TESTAR ANTES DE AVANÇAR)

| Fase | Arquivo-fonte | Escopo da entrega |
|------|---------------|-------------------|
| 0 | docs/00–10 | Ler contrato, visão, matrizes, delimitação, esqueleto de ERP e navegação |
| 1 | parte-1.md | Fundação: monorepo, Shell (Module Federation), Design System, Rconta 7+2, validação N0–N3, dados cadastrais + módulo profissional (CIV, CMA, currículo, experiência), módulo empresarial com documentos assinados, estoque/custódia, recrutamento agregador, RBAC/ABAC/RLS |
| 2 | parte-2.md | Ledger imutável (SHA-256 encadeado + Ed25519, triggers anti-UPDATE/DELETE, verificação), Protocolo AAAA-NNNNNN, auditoria |
| 3 | parte-3.md | Assinatura digital (Lei 14.063/2020), documentos estruturados com hash, gerenciador de arquivos (MinIO/presigned) |
| 4 | parte-4.md | Billing (6 assinaturas + comissão 3% RLoja e 3% Recrutamento por evento de contratação), PPSP RBAC 120 (ARSO, toxicológico 90 dias, sorteio ≥25%/ano), Hub de Alertas Preditivos (badges da Shell) |
| 5 | parte-5.md | ERP Manutenção: camada administrativa + Biblioteca Técnica, Suprimentos (ferramentaria, estoque técnico, compras, importações), Setor de Registros, Oficina em 12 etapas, APRS/CRS, SEGVOO, Qualidade/SGSO, CRM do domínio, vagas p/ Recrutamento |
| 6 | parte-6.md | ERP Operadores: camada administrativa + departamentos Operações e Manutenção, CRM/fretamento, frota (repeso 36 meses), despacho (combustível/met/P&B/MEL/tripulação via núcleo), diário técnico da aeronave, MEL/DA, manuais, aeroagrícola, PPSP, vagas p/ Recrutamento |
| 7 | parte-7.md | ERP Cursos e Treinamentos (catálogo de cursos vendido na RLoja, turmas, FSTD, certificados ≤10 dias, S141) + ERP Aeródromos (contratos, infraestrutura, RWYCC/RCR, SESCINC ≤3 min, fauna/SIGRA, manutenção 8 áreas, SGSO quadrimestral) + camadas administrativas |
| 8 | parte-8.md | RLoja (anúncio como visão do estoque, comissão, banners), Central de Comunicação, integrações ANAC/gov/Asaas/Resend/Sentry, Motor de Regras (BRE), consolidação final |
| 9 | docs/09–10 | Refinamento fino das árvores de menu de cada app e validação de navegação |

**Ordem interna padrão de cada ERP:** Dashboard → Comercial/CRM do domínio → Camada administrativa geral (RH, Financeiro, Contabilidade, Compras) → Setores de domínio → Qualidade/SGSO → Relatórios → Configuração. Ledger em tudo.

---

## 11. DEFINITION OF DONE (CADA FASE)

- [ ] Roda em Docker Compose; `/health` verde.
- [ ] Migrações SQL 100% aplicadas no PostgreSQL 16.
- [ ] RLS habilitado e comprovado por teste (usuário sem vínculo → 403).
- [ ] Padrão `{ success, data, error }` em 100% das rotas.
- [ ] Eventos relevantes ancorados no ledger (bloco com hash + assinatura).
- [ ] Testes unitários e de integração verdes.
- [ ] Lacunas listadas no relatório da fase (nunca silenciar).