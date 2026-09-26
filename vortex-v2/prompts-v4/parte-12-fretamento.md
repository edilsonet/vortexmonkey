# VORTEX v4 — PARTE 12/14: FRETIMENTO (charter.vortex.com)

> **Origem:** Parte 9 v2 §3 (Fretamento), reorganizada em 14 partes (uma por app). Consome o Núcleo — Parte 01 (Cadastro Central, Ledger, comissões via eventos do ledger — Parte 01 — Núcleo).
> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em marketplaces de fretamento aéreo e contratos de operação. Construa o módulo conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, migrações SQL, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 12

1. **Fretamento** — reserva e venda de fretamento: **135** (passageiros, carga, aeromédico) e **137** (agrícola). Operadores publicam capacidade; clientes cotam, reservam e contratam; **comissão/contrato** por operação (percentual ou taxa — Parte 01 — Núcleo).
2. **Frontend Angular** — feature-lib `feature-charter`.

> **Aderência à arquitetura central:** o Fretamento é consumidor do Núcleo — operadores e clientes são empresas/pessoas do Cadastro Central (sem cadastro duplicado), aeronaves do Núcleo, comissões acionadas por eventos do ledger (Parte 01 — Núcleo), ancoragem de todos os eventos no ledger. Schema `charter` já criado na fundação (Parte 01).

## 2. ADERÊNCIA À ARQUITETURA CENTRAL

- **Núcleo dono da verdade:** operador 135/137 é empresa do Núcleo; cliente é empresa ou pessoa do Núcleo; aeronave referenciada do Núcleo. Nenhum cadastro duplicado.
- **Ledger imutável (Res. ANAC 458/2017):** listing, cotação e contrato geram blocos no ledger com `origin_app = CHARTER`; cada transição de status da execução gera bloco; histórico abre como LedgerTimeline.
- **Comissões por eventos:** comissão/contrato acionada por evento do ledger e processada pelo billing (Parte 01 — Núcleo — tabela `commissions`).
- **Integração com ERPs:** fretamento agrícola (137) referencia área de aplicação do ERP Agrícola (Parte 08); a venda de fretamento conduz o Comercial/CRM do ERP Operadores (docs/09 §4.11).
- **Dados sensíveis:** fretamento aeromédico exige dados do paciente no `details` — nível de acesso de documento RESTRICTED.
- **RLS multi-tenant:** usuário sem vínculo não acessa listings/contratos de outros tenants.

## 3. FUNDAMENTAÇÃO REGULATÓRIA

- **RBAC 135** — transporte aéreo não regular (passageiros, carga, aeromédico): o app serve à comercialização da capacidade do operador 135; a plataforma não é a operadora.
- **RBAC 137** — serviços aéreos especializados (agrícola): o fretamento agrícola conecta o cliente ao operador 137 e referencia a área de aplicação do ERP Agrícola (CDAG/dispersores — Parte 08).
- **Formulários ANAC (docs/03):** FOP 135 e FCDAG (ficha de cadastro de atividade agrícola) permanecem nos ERPs; o Fretamento consome a validade dos certificados, não os emite.
- **Ancoragem regulatória:** contrato confirmado, transições de execução e cancelamento são eventos do ledger — cadeia SHA-256 + Ed25519 (Res. ANAC 458/2017) garante a trilha completa da operação.
- **Dados do paciente (aeromédico):** tratados como documento RESTRICTED — acesso conforme concessão/assinatura; cifrado em repouso (AES-256-GCM).

## 4. ESTRUTURA DE MENUS (docs/10 §12 — verbatim)

- Buscar/cotar fretamento `[busca: tipo (passageiros/carga/aeromédico/agrícola) → operadores disponíveis]`
- Reserva `[detalhe → contrato → confirmação]`
- Painel do operador `[solicitações recebidas → propostas → contratos → execução]`
- Minhas contratações `[lista → detalhe]`
- Configuração `[tipos de operação, tarifas]`

Regras de navegação aplicáveis (docs/10 §15): tela de detalhe segue o padrão de abas `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`; o mesmo dado editável em vários apps mantém a origem no evento do ledger.

## 5. ENTIDADES PRINCIPAIS (schema `charter` — verbatim Parte 9 v2 §3.2)

```sql
CREATE SCHEMA IF NOT EXISTS charter;

CREATE TABLE charter.charter_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_company_id UUID NOT NULL,    -- operador 135/137 (Núcleo)
    charter_type VARCHAR(20) NOT NULL CHECK (charter_type IN ('PASSAGEIROS','CARGA','AEROMEDICO','AGRICOLA')),
    aircraft_id UUID NOT NULL,
    base_region VARCHAR(255),             -- região de base
    availability JSONB DEFAULT '[]',      -- janelas de disponibilidade
    price_basis VARCHAR(20) NOT NULL DEFAULT 'POR_HORA' CHECK (price_basis IN ('POR_HORA','POR_VOO','POR_CONTRATO')),
    price NUMERIC(15,2) NOT NULL,
    commission_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE charter.charter_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES charter.charter_listings(id),
    client_company_id UUID,
    client_person_id UUID,
    charter_type VARCHAR(20) NOT NULL,
    scheduled_at TIMESTAMPTZ,
    details JSONB DEFAULT '{}',           -- itinerário, carga, pacientes, área agrícola...
    amount NUMERIC(15,2) NOT NULL,
    commission_amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'COTACAO'
      CHECK (status IN ('COTACAO','PROPOSTA','CONFIRMADO','EM_EXECUCAO','CONCLUIDO','CANCELADO')),
    payment_reference VARCHAR(100),
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 6. REGRAS DE NEGÓCIO OBRIGATÓRIAS (verbatim Parte 9 v2 §3.3)

1. Contrato confirmado → evento no ledger → dispara comissão (Parte 01).
2. Execução atualiza o status (`EM_EXECUCAO` → `CONCLUIDO`); cada transição gera bloco.
3. Fretamento agrícola (137) referencia área de aplicação (integra com ERP Agrícola — Parte 08).
4. Fretamento aeromédico exige dados do paciente no `details` (RESTRICTED — nível de acesso de documento).
5. Pagamento via Asaas; webhook idempotente.
6. Ancoragem: listing, cotação e contrato geram blocos no ledger (`origin_app = CHARTER`).

## 7. ENDPOINTS DA API (verbatim Parte 9 v2 §3.4)

- `GET /charter/listings?type=&region=` — busca de fretamentos.
- `POST /charter/listings` — operador publica capacidade.
- `POST /charter/contracts` — cotar/reservar.
- `POST /charter/contracts/:id/confirm` — confirmar contrato (dispara comissão).
- `POST /charter/contracts/:id/status` — atualizar execução.
- `GET /charter/my-contracts` — minhas contratações.
- `GET /charter/operator/requests` — painel do operador.

## 8. FRONTEND ANGULAR (`feature-charter` — verbatim Parte 9 v2 §5.2)

- Busca/cotação `[tipo (passageiros/carga/aeromédico/agrícola) → operadores]` · Reserva `[detalhe → contrato]` · Painel do operador `[solicitações → propostas → contratos → execução]` · Minhas contratações.

Padrões obrigatórios (idem Parte 01, seção 18): standalone + signals + OnPush + `inject()` + `@if/@for`; formulários reativos tipados; LedgerTimeline para histórico; ValidationBadge em dados de empresa/pessoa; guards de permissão (UX) + validação no backend.

## 9. TESTES OBRIGATÓRIOS (verbatim Parte 9 v2 §6, itens do Fretamento)

1. Teste Fretamento: contrato confirmado dispara comissão; execução atualiza status com blocos.
2. Teste Fretamento: aeromédico exige dados do paciente (RESTRICTED).
3. Teste Fretamento: agrícola referencia área de aplicação (integração ERP Agrícola).
4. Teste de ancoragem: listing, cotação, contrato e transições de execução geram blocos no ledger com `origin_app = CHARTER`.
5. Teste de idempotência: webhooks de pagamento não duplicam contratos.
6. Teste de RLS: usuário sem vínculo não acessa listings/contratos de outros tenants.

## 10. CRITÉRIOS DE ACEITE

- [ ] Fretamento operando (listings, cotação, contrato, execução, comissão) para 135 e 137.
- [ ] Comissão acionada por evento do ledger (integração com Parte 01).
- [ ] Aeromédico com dados do paciente protegidos (RESTRICTED); agrícola integrado ao ERP Agrícola (área de aplicação).
- [ ] Pagamento Asaas com webhook idempotente.
- [ ] Frontend Angular (`feature-charter`) conforme padrões v2.
- [ ] Testes de aceite passando; lacunas listadas.

## 11. MAPA DE MÓDULOS

> Base para a fragmentação futura em pedaços menores (prompts de construção por módulo/seção).

- **MÓDULO 12.1 — Listings de capacidade** (`charter.charter_listings`)
  - Seções previstas: 12.1.1 publicação pelo operador 135/137 · 12.1.2 tipos (PASSAGEIROS/CARGA/AEROMEDICO/AGRICOLA) · 12.1.3 disponibilidade (janelas JSONB) · 12.1.4 base de preço (POR_HORA/POR_VOO/POR_CONTRATO) e comissão padrão
- **MÓDULO 12.2 — Cotação e contratos** (`charter.charter_contracts`)
  - Seções previstas: 12.2.1 cotação/reserva (cliente empresa ou pessoa do Núcleo) · 12.2.2 máquina de estados (COTACAO→PROPOSTA→CONFIRMADO→EM_EXECUCAO→CONCLUIDO/CANCELADO) · 12.2.3 `details` (itinerário, carga, pacientes, área agrícola) · 12.2.4 confirmação dispara comissão (Parte 01)
- **MÓDULO 12.3 — Execução**
  - Seções previstas: 12.3.1 transições EM_EXECUCAO→CONCLUIDO com bloco por transição · 12.3.2 painel do operador (solicitações → propostas → contratos → execução)
- **MÓDULO 12.4 — Aeromédico (RESTRICTED)**
  - Seções previstas: 12.4.1 dados do paciente obrigatórios no `details` · 12.4.2 nível de acesso de documento RESTRICTED (cifrado, acesso conforme concessão)
- **MÓDULO 12.5 — Agrícola (137)**
  - Seções previstas: 12.5.1 referência à área de aplicação do ERP Agrícola (Parte 08) · 12.5.2 integração com o CRM do ERP Agrícola
- **MÓDULO 12.6 — Pagamento (Asaas)**
  - Seções previstas: 12.6.1 cobrança do contrato · 12.6.2 webhook idempotente
- **MÓDULO 12.7 — Ancoragem no ledger**
  - Seções previstas: 12.7.1 blocos de listing/cotação/contrato com `origin_app = CHARTER` · 12.7.2 LedgerTimeline do contrato
- **MÓDULO 12.8 — Frontend `feature-charter`**
  - Seções previstas: 12.8.1 busca/cotação · 12.8.2 reserva · 12.8.3 painel do operador · 12.8.4 minhas contratações · 12.8.5 padrões Angular v2 + module boundaries

## 12. FONTES v2

- `artifacts/vortex-v2/docs/prompts/parte-9.md` — §3 Fretamento (entidades, regras, endpoints, testes) — conteúdo verbatim.
- `artifacts/vortex-v2/CLAUDE.md` — seção 11 (Fretamento, tabela de apps).
- `artifacts/vortex-v2/docs/10-navegacao-por-app.md` — §12 Fretamento (menus) e §15 regras de navegação.
- `artifacts/vortex-v2/docs/09-mapa-adaptacao-vortex.md` — §4.11 Fretamento.
