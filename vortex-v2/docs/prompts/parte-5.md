# VORTEX — PARTE 5/10 (v2): ERP MANUTENÇÃO (RBAC 43/145) — OFICINA, SUPRIMENTOS, BIBLIOTECA TÉCNICA, QUALIDADE E CONTABILIDADE

> **Versão 2 — 12/09/2026.** Reformulada: **Contabilidade de dupla entrada** na camada administrativa (contrato seção 6), fluxo da oficina em **12 etapas como máquina de estados formal** (contrato seção 12.1), **recortes de Publicações** na Biblioteca Técnica (seed 2009), cadernetas com o princípio "registro é um só" (Parte I = projeção; Parte II = eventos primários), e pessoas vindas do Núcleo (não mais da Rconta).
> **Instrução ao agente de código:** engenheiro sênior em manutenção aeronáutica (RBAC 43/145), SGSO (IS 145.214-001B), DA (RBAC 39), suprimentos aeronáuticos, contabilidade de partidas dobradas e qualidade. Construa o ERP Manutenção do ecossistema VORTEX com rigor, TypeScript estrito, migrações SQL e testes. Execute completo, sem resumir, sem pular seções.

## 1. OBJETIVO
Entregar o ERP da Organização de Manutenção (OM 43/145):
1. **Comercial/CRM do domínio** (venda de serviços de manutenção).
2. **Biblioteca Técnica** (manuais, boletins, DA/FCDA) com **recortes de Publicações**.
3. **Suprimentos** — Ferramentaria, Estoque técnico, Compras, Importações.
4. **Setor de Registros** (cadernetas, OS arquivadas, retenções).
5. **Manutenção/Oficina** (máquina de estados em 12 etapas, APRS/CRS, SEGVOO 001).
6. **Qualidade/SGSO** (inspeções, END, não conformidades).
7. **Camada administrativa geral** (RH, Financeiro, **Contabilidade de dupla entrada**, Compras) + RH interno + Vagas.
8. **Frontend Angular** (feature-lib `feature-mro`).

## 2. ADERÊNCIA À ARQUITETURA CENTRAL
- Pessoas (mecânicos com CHT, licenças RBAC 65, certificados, experiência, CIV, CMA) vivem **no Núcleo (Cadastro Central)**; o ERP apenas consulta via API.
- Estoque usa o **catálogo do Núcleo**; a custódia do estoque empresarial migra para este ERP quando contratado e volta à Rconta (ou à RLoja, se criada lá) em suspensão/cancelamento.
- Toda OS, inspeção, liberação, compra e comunicação gera **bloco no Ledger** (com `origin_app = ERP_MANUTENCAO`); o ERP exibe histórico via **LedgerTimeline**.
- A OM é uma `identity.companies` com certificado OM_145; o responsável técnico (RT) e o gerente da qualidade são pessoas do Núcleo com vínculo aprovado.
- **Recortes de Publicações:** a tarefa de manutenção consome o recorte do manual aplicável **se a empresa tem assinatura de Publicações ativa**; sem assinatura, a tarefa abre sem o recorte e o sistema orienta a obtenção por fora (nunca bloqueia a tarefa).

## 3. FUNDAMENTAÇÃO REGULATÓRIA
- RBAC 43 (manutenção, preventiva, alterações), RBAC 145 (OM: certificação, pessoal, instalações, dados técnicos, registros), RBAC 39 (DA/FCDA), RBAC 65 (mecânicos CHT), RBAC 21 (peças e FORM 8130-3).
- SGSO da OM: **IS 145.214-001B**. Grande reparo/alteração: **SEGVOO 001**. Retenção de registros: período parametrizável conforme IS/contrato (o sistema alerta antes do vencimento).
- Etiquetas de condição de peça: **verde** (serviçável), **amarela** (reparável), **vermelha** (não aeronavegável).

## 4. ESTRUTURA DE MENUS (esqueleto por setor)
| Setor | Menus |
|-------|-------|
| **Dashboard** | KPIs: OS abertas por etapa, atrasos, retenções, calibrações vencendo, horas de oficina |
| **Comercial/CRM** | Pipeline → Propostas → Clientes (empresas/pessoas do Núcleo) |
| **Biblioteca Técnica** | Manuais · Boletins de Serviço · DA/FCDA · Documentação por aeronave/componente · Revisões controladas · **Recortes de Publicações (v2)** |
| **Suprimentos → Ferramentaria** | Ferramentas · Controle de calibração (RBC) · Empréstimos |
| **Suprimentos → Estoque técnico** | Peças (catálogo do Núcleo) · Recebimento · Quarentena · Etiquetagem · Rastreabilidade |
| **Suprimentos → Compras** | Pedidos de compra · Cotações · Fornecedores · Recebimento · Faturamento de compra |
| **Suprimentos → Importações** | Processos de importação · Documentação aduaneira · Acompanhamento |
| **Setor de Registros** | Cadernetas de aeronave (Parte I = projeção; Parte II = eventos) · OS arquivadas · Retenções · Consulta histórica |
| **Manutenção/Oficina** | Ordens de Serviço (kanban 12 etapas) · Inspeções · END · APRS/CRS · SEGVOO |
| **Qualidade/SGSO** | Não conformidades · Auditorias internas · Perigos/riscos · Indicadores SGSO |
| **RH interno** | Mecânicos (CHT via Núcleo) · Treinamentos internos · Escalas · PPSP (se aplicável) · **Vagas (v2 → Recrutamento)** |
| **Administrativo geral** | RH · Financeiro · **Contabilidade (dupla entrada — v2)** · Compras |
| **Relatórios** | Conformidade, produtividade, retenção, custos |
| **Configuração** | Etapas de OS, tipos de serviço, categorias ATA, templates |

## 5. ENTIDADES PRINCIPAIS (schema `mro`)
```sql
CREATE TABLE mro.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,           -- OM
    aircraft_id UUID,                   -- aeronave (cadastro do Núcleo)
    component_id UUID,                  -- componente (quando não é célula)
    customer_company_id UUID,           -- cliente = empresa do Núcleo
    wo_number VARCHAR(30) UNIQUE NOT NULL,
    stage INT NOT NULL DEFAULT 1 CHECK (stage BETWEEN 1 AND 12),
    status VARCHAR(30) NOT NULL DEFAULT 'ORCAMENTO',
    ata_chapter VARCHAR(2), task_description TEXT,
    labor_hours_planned NUMERIC(10,2), labor_hours_actual NUMERIC(10,2),
    parts_cost NUMERIC(15,2) DEFAULT 0, external_service_cost NUMERIC(15,2) DEFAULT 0,
    apres_signed_by UUID, apres_signed_at TIMESTAMPTZ,     -- APRS/CRS
    segvoo_required BOOLEAN DEFAULT FALSE, segvoo_done BOOLEAN DEFAULT FALSE,
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mro.wo_stage_history ( -- transições das 12 etapas (espelho do ledger p/ UX)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id UUID NOT NULL REFERENCES mro.work_orders(id),
    from_stage INT, to_stage INT NOT NULL,
    performed_by UUID NOT NULL, performed_at TIMESTAMPTZ DEFAULT NOW(),
    ledger_block_id UUID
);

CREATE TABLE mro.technical_library_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    doc_type VARCHAR(30) NOT NULL, -- MANUAL, BOLETIM_SERVICO, DA, FCDA, IPC, SB
    doc_number VARCHAR(100) NOT NULL, revision VARCHAR(20), revision_date DATE,
    applicability VARCHAR(255), storage_key VARCHAR(512), file_hash VARCHAR(64),
    is_current BOOLEAN DEFAULT TRUE, ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- v2: recortes de Publicações vinculados a tarefas
CREATE TABLE mro.task_publication_excerpts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id UUID REFERENCES mro.work_orders(id),
    task_description_id UUID,           -- tarefa planejada
    publication_id UUID NOT NULL,       -- manual licenciado (CertPub — Parte 9)
    excerpt_ref VARCHAR(255) NOT NULL,  -- referência do recorte (página/seção ATA)
    access_granted BOOLEAN NOT NULL,    -- FALSE = sem assinatura de Publicações
    ledger_block_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mro.tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, tool_code VARCHAR(100) NOT NULL, description VARCHAR(255),
    calibration_required BOOLEAN DEFAULT FALSE,
    calibration_due_date DATE, calibration_status VARCHAR(20) DEFAULT 'VENCENDO',
    location VARCHAR(100), status VARCHAR(20) DEFAULT 'DISPONIVEL', ledger_block_id UUID
);

CREATE TABLE mro.parts_movements ( -- estoque técnico (catálogo do Núcleo)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID NOT NULL, wo_id UUID, movement_type VARCHAR(30) NOT NULL,
    quantity NUMERIC(15,2) NOT NULL, tag VARCHAR(20) NOT NULL, -- VERDE/AMARELA/VERMELHA
    form8130_hash VARCHAR(64), ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mro.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, supplier_company_id UUID NOT NULL,
    po_number VARCHAR(30) UNIQUE NOT NULL, status VARCHAR(20) DEFAULT 'COTACAO',
    total NUMERIC(15,2) DEFAULT 0, ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mro.import_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, po_id UUID REFERENCES mro.purchase_orders(id),
    process_number VARCHAR(100), customs_status VARCHAR(30) DEFAULT 'EM_ANDAMENTO',
    expected_arrival DATE, ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mro.quality_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, wo_id UUID, event_type VARCHAR(30) NOT NULL, -- NC, AUDITORIA, PERIGO, END
    description TEXT, severity VARCHAR(20), status VARCHAR(20) DEFAULT 'ABERTO',
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mro.records_retention (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, record_type VARCHAR(30) NOT NULL, reference_id UUID NOT NULL,
    retention_months INT NOT NULL, retention_end DATE NOT NULL,
    storage_key VARCHAR(512), ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 6. FLUXO DA OFICINA — MÁQUINA DE ESTADOS EM 12 ETAPAS (contrato seção 12.1)

| # | Etapa | Transições permitidas |
|---|-------|----------------------|
| 1 | Recebimento do pedido/orçamento | → 2 |
| 2 | Cotação (mão de obra, peças, serviços de terceiros) | → 3 |
| 3 | Aceite do cliente (autorização formal) | → 4 |
| 4 | Emissão da OS | → 5 |
| 5 | Inspeção de recebimento (condição, documentação, logística) | → 6 |
| 6 | Planejamento (tarefas, pessoal CHT habilitado, materiais, **recortes de Publicações**) | → 7 |
| 7 | Execução (tarefas, registro de trabalho) | → 8 |
| 8 | Inspeção/END (verificação independente) | → 9 |
| 9 | Tratamento de discrepâncias (NC, peças vermelhas/amarelas) | → 10 |
| 10 | Verificação documental (FORM 8130-3, certificados, FCDA) | → 11 |
| 11 | APRS/CRS (assinatura de profissional habilitado; SEGVOO 001 se grande reparo/alteração) | → 12 |
| 12 | Entrega e arquivamento (retenção, ledger, relatório ao cliente) | — (fim) |

**Regras da máquina de estados:**
1. Transição só ocorre com permissão (RBAC) e gera registro em `wo_stage_history` + bloco no Ledger.
2. Transições retroativas são proibidas — discrepância volta como novo evento (append-only).
3. A etapa 11 (APRS/CRS) exige profissional habilitado (CHT válida consultada no Núcleo) + assinatura eletrônica (Lei 14.063/2020, nível avançado mínimo).
4. A etapa 6 vincula os recortes de Publicações às tarefas planejadas (`task_publication_excerpts`).

## 7. CONTABILIDADE DE DUPLA ENTRADA (camada administrativa — contrato seção 6)

> Implementada conforme a especificação do contrato (seção 6): schema `accounting` com `chart_of_accounts`, `journal_entries` e `journal_lines`.

1. **Partidas dobradas:** todo lançamento exige Σ débitos = Σ créditos; rejeitado no serviço (constraint `balanced` como última defesa).
2. **Lançamento imutável:** `CONTABILIZADO` não aceita edição; erro → **estorno** (novo par débito/crédito), nunca UPDATE.
3. **Origem rastreável:** todo lançamento automático referencia `source_module` (FINANCEIRO, COMPRAS, OFICINA, MANUAL) + `source_entity_id` (OS, pedido, fatura) e gera bloco no ledger.
4. **Plano de contas padrão** brasileiro (normas públicas) semeado por seed; tenant estende, nunca quebra.
5. **Integração com a oficina:** custos da OS (peças + mão de obra + terceiros) geram lançamentos automáticos na Contabilidade ao fechamento (etapa 12).
6. **Frontend (v2):** tela de lançamento com validação em tempo real do balanceamento (signal computado `Σdébito − Σcrédito` exibido ao digitar).

## 8. REGRAS DE NEGÓCIO OBRIGATÓRIAS
1. **DA aplicável pendente** → bloqueia retorno ao serviço (prevalece sobre qualquer liberação).
2. **FCDA** é exigida e vinculada à OS/DA; sem FCDA não há APRS/CRS.
3. **Peça etiqueta vermelha** → bloqueada para instalação (quarentena/descarte); **amarela** → só via reparo aprovado; **verde** → instalável com FORM 8130-3 quando aplicável.
4. **Ferramenta com calibração vencida** → bloqueada para uso em OS (alerta BLOCKING).
5. **APRS/CRS exige profissional habilitado** (CHT/certificação válida consultada no Núcleo) e assinatura eletrônica (Lei 14.063/2020).
6. **Grande reparo/alteração** → SEGVOO 001 antes do retorno ao serviço.
7. **OS só é liberada** com todas as tarefas executadas, inspeções feitas e documentação anexada.
8. **Biblioteca técnica** controlada: só é utilizável a revisão vigente do manual/boletim; revisão nova gera alerta.
9. **Recortes de Publicações (v2):** tarefa com recorte exige assinatura ativa; sem assinatura, `access_granted = FALSE` + orientação de obtenção externa — **a tarefa nunca é bloqueada por falta de recorte**.
10. **Retenção de registros** parametrizável por tipo (alerta 60 dias antes do vencimento).
11. **Custos** (peças + mão de obra + terceiros) acumulados na OS alimentam Financeiro/Contabilidade (lançamento automático no fechamento).
12. **Vagas de RH** (mecânicos) criadas neste ERP (externas/internas) são consumidas pelo Recrutamento; contratação cria vínculo automático — **sem comissão**.
13. **Sem duplicação:** nenhum dado de pessoa é criado aqui; CHT/CMA/experiência são consultados no Núcleo.
14. **Banners:** OM com Rconta grátis exibe anúncios; VIP/ERP remove apenas na conta do comprador.
15. **Cadernetas (v2):** Parte II (registros primários de manutenção) são eventos do ledger; Parte I (totais mensais de horas/ciclos/pousos/TSN/CSN/LDG) é **projeção agregada recomputável** — nunca registro duplicado.

## 9. ENDPOINTS (resumo)
- Comercial: `/api/v1/mro/opportunities`, `/proposals`, `/proposals/:id/convert`
- OS: `/api/v1/mro/work-orders` (CRUD + `:id/advance-stage`, `:id/apres`, `:id/segvoo`, `:id/close`)
- Biblioteca: `/api/v1/mro/library` (+ `:id/revision`)
- Recortes: `/api/v1/mro/tasks/:id/excerpts` (v2 — acesso conforme assinatura de Publicações)
- Suprimentos: `/api/v1/mro/tools`, `/api/v1/mro/tools/calibration-expiring`, `/api/v1/mro/parts`, `/api/v1/mro/purchase-orders`, `/api/v1/mro/imports`
- Qualidade: `/api/v1/mro/quality-events`
- Registros: `/api/v1/mro/records`, `/api/v1/mro/records/expiring`
- Contabilidade: `/api/v1/accounting/chart-of-accounts`, `/journal-entries`, `/journal-entries/:id/reverse`, `/reports/balancete`, `/reports/dre`
- RH: `/api/v1/mro/job-postings` (para Recrutamento)
- Dashboard: `/api/v1/mro/dashboard`

## 10. FRONTEND ANGULAR (feature-lib `feature-mro` — padrões v2)
1. Componentes standalone + signals + OnPush + `inject()` + `@if/@for`.
2. **Kanban das 12 etapas** com colunas por etapa; transição por drag-and-drop chama `:id/advance-stage` (backend valida permissão e regras).
3. **LedgerTimeline** na aba de histórico da OS e das cadernetas.
4. **Tela de lançamento contábil** com signal computado de balanceamento em tempo real.
5. **ValidationBadge** em CHT/mecânicos, peças (etiquetas) e ferramentas (calibração).
6. Recorte de Publicações: componente de leitura inline (se `access_granted`); senão, card de orientação de obtenção externa.

## 11. TESTES OBRIGATÓRIOS
1. OS não avança etapa sem permissão e sem registro no ledger.
2. Transição retroativa de etapa é rejeitada (máquina de estados).
3. DA pendente bloqueia APRS/CRS.
4. Peça vermelha bloqueia instalação; amarela exige reparo aprovado.
5. Ferramenta com calibração vencida bloqueia uso.
6. APRS/CRS só com profissional habilitado (consulta Núcleo).
7. Grande reparo exige SEGVOO antes do retorno.
8. Revisão antiga de manual é bloqueada na execução.
9. **Recorte de Publicações:** com assinatura → recorte servido; sem assinatura → `access_granted = FALSE` + orientação; tarefa nunca bloqueada.
10. Retenção alerta 60 dias antes.
11. Nenhuma tabela de pessoa (CHT/CMA) existe no schema `mro`.
12. Vaga de RH criada aqui aparece no Recrutamento; contratação gera vínculo automático sem cobrança.
13. Custos da OS geram lançamento contábil balanceado no fechamento.
14. **Lançamento desbalanceado é rejeitado; estorno gera novo par (nunca UPDATE).**
15. **Caderneta Parte I é recomputável dos eventos da Parte II (conferência contra o ledger).**

## 12. CRITÉRIOS DE ACEITE
- [ ] Menus por setor (Comercial, Biblioteca, Suprimentos, Registros, Oficina, Qualidade, RH, administrativo, relatórios, configuração) implementados.
- [ ] **Máquina de estados de 12 etapas** com transições auditadas no ledger (sem retroativos).
- [ ] APRS/CRS com assinatura; SEGVOO automático quando devido.
- [ ] Biblioteca técnica com revisão controlada; DA/FCDA vinculadas; **recortes de Publicações** conforme assinatura.
- [ ] Ferramentaria com calibração; estoque com etiquetas e FORM 8130-3; importações rastreadas.
- [ ] **Contabilidade de dupla entrada** operando (lançamentos, estorno, relatórios, integração com custos da OS).
- [ ] Cadernetas: Parte II = eventos; Parte I = projeção recomputável.
- [ ] Camada administrativa geral (RH/Financeiro/Contabilidade/Compras) operando.
- [ ] Vagas de RH integradas ao Recrutamento; sem duplicação de pessoa.
- [ ] Frontend Angular conforme padrões v2 (seção 10).
- [ ] Testes verdes e lacunas listadas.
