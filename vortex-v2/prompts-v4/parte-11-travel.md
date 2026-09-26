# VORTEX v4 — PARTE 11/14: TRAVEL (travel.vortex.com)

> **Origem:** Parte 9 v2 §2 (Travel), reorganizada em 14 partes (uma por app). Consome o Núcleo — Parte 01 (Cadastro Central, Ledger, comissões via eventos do ledger — Parte 01 — Núcleo).
> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em serviços de viagem e marketplaces de passagens aéreas. Construa o módulo conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, migrações SQL, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 11

1. **Travel** — busca e venda de passagens de **linhas aéreas regulares 121** — modelo agência de viagem, com **comissão de agência** por passagem emitida.
2. **Frontend Angular** — feature-lib `feature-travel`.

> **Aderência à arquitetura central:** o Travel é consumidor do Núcleo — passageiros são pessoas do Cadastro Central (dados cadastrais e de compra reutilizados, sem cadastro duplicado), comissões acionadas por eventos do ledger (Parte 01 — Núcleo), ancoragem de todos os eventos no ledger. Schema `travel` já criado na fundação (Parte 01).

## 2. ADERÊNCIA À ARQUITETURA CENTRAL

- **Núcleo dono da verdade:** pessoas/compradores vêm do Cadastro Central; o operador 121 é uma empresa do Núcleo. Nenhum cadastro duplicado.
- **Ledger imutável (Res. ANAC 458/2017):** oferta, pedido e emissão geram blocos no ledger com `origin_app = TRAVEL`; o histórico de qualquer registro abre como LedgerTimeline (filtro do ledger), nunca como lista editável.
- **Comissões por eventos:** a comissão de agência é acionada por evento do ledger e processada pelo billing (Parte 01 — Núcleo — tabela `commissions`).
- **RLS multi-tenant:** usuário sem vínculo não acessa ofertas/pedidos de outros tenants; validação N0–N3 nunca bloqueia o fluxo.
- **Multi-app de edição:** qualquer app autorizado cria/edita cadastros do núcleo conforme permissão — o app de origem (`TRAVEL`) fica registrado no evento do ledger.

## 3. FUNDAMENTAÇÃO REGULATÓRIA

- **RBAC 121** — transporte aéreo regular de passageiros: o app serve à **venda de passagens de linhas regulares operadas por certificados 121**; a plataforma **não é a companhia** — o operador 121 publica ofertas.
- **Pré-requisito operacional:** oferta só publicável por operador com COA 121 válido (consulta ao Núcleo — teste obrigatório 3 da Parte 9 v2).
- **Formulários ANAC (docs/03):** FOP 121 (ficha de operador de passageiros) permanece no ERP Operadores; o Travel consome a validade do certificado, não a emite.
- **Ancoragem regulatória:** emissão de e-ticket, cancelamento e reembolso são eventos do ledger — a cadeia de hashes SHA-256 + Ed25519 (Res. ANAC 458/2017) garante a trilha completa da venda.

## 4. ESTRUTURA DE MENUS (docs/10 §11 — verbatim)

- Buscar voos `[busca: origem/destino/data → resultados]`
- Reserva/compra `[detalhe → passageiros (dados do núcleo) → pagamento → e-ticket]`
- Minhas viagens `[lista → detalhe → remarcar/cancelar]`
- Minhas vendas (agência) `[lista → comissões]`
- Configuração `[companhias, tarifas, comissionamento]`

Regras de navegação aplicáveis (docs/10 §15): tela de detalhe segue o padrão de abas `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`; ValidationBadge ao lado de dados de pessoa; navegação esconde apenas o que o usuário não pode ver (UX), nunca valida regra.

## 5. ENTIDADES PRINCIPAIS (schema `travel` — verbatim Parte 9 v2 §2.2)

```sql
CREATE SCHEMA IF NOT EXISTS travel;

CREATE TABLE travel.flight_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airline_company_id UUID NOT NULL,     -- operador 121 (empresa do Núcleo)
    flight_number VARCHAR(20) NOT NULL,
    origin VARCHAR(10) NOT NULL, destination VARCHAR(10) NOT NULL,
    departure_at TIMESTAMPTZ NOT NULL, arrival_at TIMESTAMPTZ NOT NULL,
    fare_class VARCHAR(10) NOT NULL,
    base_price NUMERIC(15,2) NOT NULL,
    agency_commission_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    seats_available INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE travel.ticket_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES travel.flight_offers(id),
    buyer_person_id UUID NOT NULL,        -- passageiro/comprador (Núcleo)
    passenger_data JSONB NOT NULL,        -- dados do voo (assento, bagagem)
    amount NUMERIC(15,2) NOT NULL,
    commission_amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE'
      CHECK (status IN ('PENDENTE','PAGO','EMITIDO','CANCELADO','REEMBOLSADO')),
    eticket_number VARCHAR(30),
    payment_reference VARCHAR(100),
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 6. REGRAS DE NEGÓCIO OBRIGATÓRIAS (verbatim Parte 9 v2 §2.3)

1. E-ticket emitido → evento no ledger → dispara comissão de agência (Parte 01).
2. Cancelamento/reembolso conforme regra da companhia; reembolso cancela a comissão pendente.
3. Pagamento via Asaas; webhook idempotente.
4. O operador 121 publica ofertas; assentos decrementados atômicamente na compra.
5. Ancoragem: oferta, pedido e emissão geram blocos no ledger (`origin_app = TRAVEL`).

## 7. ENDPOINTS DA API (verbatim Parte 9 v2 §2.4)

- `GET /travel/offers?origin=&destination=&date=` — busca de voos.
- `POST /travel/orders` — criar pedido.
- `POST /travel/orders/:id/pay` — pagamento (Asaas).
- `POST /travel/orders/:id/issue` — emitir e-ticket (dispara comissão).
- `POST /travel/orders/:id/cancel` / `:id/refund` — cancelar/reembolsar.
- `GET /travel/my-trips` — minhas viagens.
- `GET /travel/my-sales` — vendas/comissões (agência).

## 8. FRONTEND ANGULAR (`feature-travel` — verbatim Parte 9 v2 §5.1)

- Busca de voos `[form origem/destino/data → resultados]` · Reserva `[detalhe → passageiros (Núcleo) → pagamento]` · Minhas viagens `[lista → detalhe]` · Minhas vendas `[lista → comissões]`.

Padrões obrigatórios (idem Parte 01, seção 18): standalone + signals + OnPush + `inject()` + `@if/@for`; formulários reativos tipados; LedgerTimeline para histórico; ValidationBadge em dados de pessoa; guards de permissão (UX) + validação no backend.

## 9. TESTES OBRIGATÓRIOS (verbatim Parte 9 v2 §6, itens do Travel)

1. Teste Travel: e-ticket emitido dispara comissão de agência; reembolso cancela comissão pendente.
2. Teste Travel: assentos decrementados atômicamente; venda sem assento é rejeitada.
3. Teste Travel: oferta só publicável por operador com COA 121 válido (consulta Núcleo).
4. Teste de ancoragem: oferta, pedido e e-ticket geram blocos no ledger com `origin_app = TRAVEL`.
5. Teste de idempotência: webhooks de pagamento não duplicam pedidos.
6. Teste de RLS: usuário sem vínculo não acessa ofertas/pedidos de outros tenants.

## 10. CRITÉRIOS DE ACEITE

- [ ] Travel operando (busca, reserva, emissão, reembolso, comissão de agência).
- [ ] Comissão de agência acionada por evento do ledger (integração com Parte 01).
- [ ] Assentos atômicos; venda sem assento rejeitada; operador sem COA 121 válido não publica.
- [ ] Pagamento Asaas com webhook idempotente.
- [ ] Frontend Angular (`feature-travel`) conforme padrões v2.
- [ ] Testes de aceite passando; lacunas listadas.

## 11. MAPA DE MÓDULOS

> Base para a fragmentação futura em pedaços menores (prompts de construção por módulo/seção).

- **MÓDULO 11.1 — Ofertas de voo** (`travel.flight_offers`)
  - Seções previstas: 11.1.1 publicação de oferta pelo operador 121 (validação COA via Núcleo) · 11.1.2 campos de voo (número, origem/destino, horários, tarifa) · 11.1.3 comissão de agência por companhia (percentual configurável — Parte 01) · 11.1.4 controle de assentos
- **MÓDULO 11.2 — Pedidos de passagem** (`travel.ticket_orders`)
  - Seções previstas: 11.2.1 criação de pedido (comprador do Núcleo) · 11.2.2 máquina de estados (PENDENTE→PAGO→EMITIDO→CANCELADO/REEMBOLSADO) · 11.2.3 decremento atômico de assentos · 11.2.4 e-ticket
- **MÓDULO 11.3 — Pagamento (Asaas)**
  - Seções previstas: 11.3.1 checkout · 11.3.2 webhook idempotente · 11.3.3 reembolso conforme regra da companhia
- **MÓDULO 11.4 — Comissão de agência**
  - Seções previstas: 11.4.1 evento de emissão dispara comissão (Parte 01) · 11.4.2 reembolso cancela comissão pendente · 11.4.3 painel de vendas/comissões da agência
- **MÓDULO 11.5 — Ancoragem no ledger**
  - Seções previstas: 11.5.1 blocos de oferta/pedido/emissão com `origin_app = TRAVEL` · 11.5.2 LedgerTimeline do pedido
- **MÓDULO 11.6 — Frontend `feature-travel`**
  - Seções previstas: 11.6.1 busca de voos · 11.6.2 reserva/compra · 11.6.3 minhas viagens · 11.6.4 minhas vendas · 11.6.5 padrões Angular v2 + module boundaries

## 12. FONTES v2

- `artifacts/vortex-v2/docs/prompts/parte-9.md` — §2 Travel (entidades, regras, endpoints, testes) — conteúdo verbatim.
- `artifacts/vortex-v2/CLAUDE.md` — seção 11 (Travel, linha 9 da tabela de apps).
- `artifacts/vortex-v2/docs/10-navegacao-por-app.md` — §11 Travel (menus) e §15 regras de navegação.
- `artifacts/vortex-v2/docs/09-mapa-adaptacao-vortex.md` — §4.10 Travel.
