# VORTEX v4 — PARTE 04/14: RLOJA (market.vortex.com — comissão 3%)

> **Origem v2:** conteúdo extraído VERBATIM da Parte 8 v2 (§§2–3 — modelo de negócio e RLoja multi-vendor com estoque bidirecional). A v3 separa um app por parte; integrações, BRE e Central de Comunicação da antiga Parte 8 ficam em partes próprias.
> **Consumo do Núcleo (Parte 01):** a RLoja NÃO tem banco próprio de produtos/estoque — o cadastro do produto e o estoque vivem no Núcleo (Catálogo + Estoque); a RLoja apenas projeta visões. Todo evento registra `origin_app = RLOJA` no ledger.

> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em marketplaces B2B multi-vendor, pagamentos, arquitetura enterprise multi-tenant e aviação civil regulada. Construa a RLOJA conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 04

Entregar a **RLoja (Marketplace B2B multi-vendor)**:

1. **Anúncio como VISÃO do estoque** — nunca registro separado; sem item de estoque, sem anúncio.
2. **Multi-vendor sem barreira de entrada** — vender não exige tenant nem assinatura; comprador isento.
3. **Estoque bidirecional RLoja ↔ ERP** — estoque criado na RLoja migra ao ERP ao contratar (RLOJA_TO_ERP); estoque do ERP pode virar loja na RLoja.
4. **Comissão de 3% do vendedor** — única receita da RLoja, cobrada no fechamento.
5. **Frontend Angular** (feature-lib `feature-rloja`).

## 2. ADERÊNCIA À ARQUITETURA CENTRAL (CLAUDE.md v2)

- **Princípio 11 (Plataforma multi-tenant; RLoja multi-vendor):** a plataforma (Rconta, ERPs, Catálogo, Recrutamento) é multi-tenant (RLS por linha); a RLoja é **marketplace multi-vendor** — vender não exige tenant nem assinatura: `catalog.listings` aceita `seller_person_id` (pessoa física com Rconta grátis, estoque pessoal) OU `seller_company_id`; a comissão de 3% do vendedor é a única receita da RLoja; a RLoja só projeta visões do estoque, nunca é dona do dado.
- **Princípio 7 (Estoque e custódia):** catálogo único no **Núcleo** (serviço do Cadastro Central); estoque pessoal no módulo Profissional; estoque empresarial (1 por empresa) no módulo Empresarial; custódia dinâmica Rconta ↔ RLoja ↔ ERP com eventos no ledger.
- **Seção 4.5 do contrato (ESTOQUE BIDIRECIONAL RLoja ↔ ERP — decisão 12/09/2026):**
  - **Estoque criado na RLoja** (empresa sem assinatura, perfil privado): cadastro do produto vai ao **núcleo**; ao contratar um ERP, as lojas ativas/inativas da RLoja **viram estoque no ERP** automaticamente (evento de custódia no ledger).
  - **Estoque criado no ERP:** pode virar loja na RLoja (perfil privado ou público) — o anúncio é sempre visão do estoque.
  - **Vender na RLoja não exige assinatura** (multi-vendor); a comissão de 3% do vendedor é a única receita da RLoja.
  - O cadastro do produto **nunca** fica no ERP nem na RLoja — fica no núcleo (Catálogo + Estoque).
- **Princípio 2 (Ledger imutável):** toda publicação/venda gera bloco no ledger (`origin_app = RLOJA`); histórico exibido via LedgerTimeline.
- **10 regras imutáveis de engenharia:** toda escrita valida permissão (RBAC/ABAC) → executa ação de domínio → registra no ledger → gera protocolo (se aplicável) → publica evento no bus; ledger append-only; padrão de resposta `{ success, data, error }`; `Idempotency-Key` em rotas de escrita; RLS por linha (tenant é contexto — mas vender não exige tenant); migrações SQL + testes; secrets em env/secret manager; toda entrega lista o que fez e o que NÃO fez.
- **Regras do BRE (Parte 01 — Núcleo) relacionadas:** `LISTING_WITHOUT_INVENTORY` (BLOCKING — anúncio da RLoja é visão do estoque), `COURSE_SALES_ERP_TRAINING_ONLY` (BLOCKING), `PUBLICATION_LICENSE_REQUIRED` (BLOCKING), `STOCK_RLOJA_TO_ERP_ON_CONTRACT` (INFO), `STOCK_CUSTODY_RETURN_ON_SUSPENSION` (BLOCKING).

## 3. FUNDAMENTAÇÃO REGULATÓRIA

- **Resolução ANAC nº 458/2017** — registros eletrônicos imutáveis (publicação, venda e comissão geram blocos no ledger).
- **Rastreabilidade de peças (RBAC 43/45):** peças físicas com rastreabilidade e **FORM 8130-3** quando aplicável; peça com etiqueta vermelha ou em quarentena **não pode ser anunciada**.
- **Catálogo do Núcleo:** não é vendido nem anunciado — apenas inserção e busca.
- **Validação N2 (fonte oficial):** Receita Federal (CPF/CNPJ do vendedor), Correios/ViaCEP (endereço de entrega) — elevam o selo, nunca bloqueiam o fluxo.

## 4. ESTRUTURA DE MENUS (docs/10 — nível de clique)

- Explorar `[busca + filtros por categoria/origem]`
- Anúncio `[detalhe → comprar]`
- Meus anúncios `[lista → criar (visão do estoque: pessoal OU empresarial) → editar → pausar]`
- Minhas compras `[lista → detalhe]`
- Minhas vendas `[lista → detalhe → comissão 3%]`
- **Meus dados de compra** `[form: endereços pessoais/empresariais — edita o cadastro no NÚCLEO; visível igual na Rconta]`
- Configuração de vendedor `[form: perfil privado/público, banners]`

Padrão global da Shell: top bar com Central de Comunicação (Chat · Alertas · E-mails · Comunicados) + Tema; padrão de detalhe com abas `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`. **ValidationBadge** ao lado de dados validáveis; **LedgerTimeline** para histórico — nunca lista editável.

## 5. ENTIDADES PRINCIPAIS (schema `market` — verbatim da Parte 8 v2)

> Anúncio como VISÃO do estoque de qualquer origem.

```sql
CREATE TABLE market.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL, -- item do estoque de origem (Núcleo)
    inventory_origin VARCHAR(50) NOT NULL
      CHECK (inventory_origin IN ('RCONTA_PESSOAL','RCONTA_EMPRESARIAL','RLOJA','ERP_OPERADORES','ERP_MANUTENCAO','ERP_CURSOS','ERP_AGRICOLA','ERP_AERODROMOS')),
    origin VARCHAR(50) NOT NULL CHECK (origin IN ('PESSOA','EMPRESA')),
    seller_company_id UUID,
    seller_person_id UUID,
    category VARCHAR(50) NOT NULL
      CHECK (category IN ('AERONAVE','MOTOR','HELICE','RADIO','INSTRUMENTO','ACESSORIO','PECA','CONSUMIVEL','CURSO','MANUAL','PUBLICACAO','TREINAMENTO')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    visibility VARCHAR(20) NOT NULL DEFAULT 'PRIVADO' CHECK (visibility IN ('PRIVADO','PUBLICO')),
    status VARCHAR(50) NOT NULL DEFAULT 'RASCUNHO'
      CHECK (status IN ('RASCUNHO','PUBLICADO','PAUSADO','VENDIDO','CANCELADO')),
    published_by UUID,
    published_at TIMESTAMPTZ,
    admin_approved BOOLEAN NOT NULL DEFAULT FALSE, -- controle do Admin
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE market.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES market.listings(id),
    buyer_company_id UUID,
    buyer_person_id UUID,
    delivery_address_id UUID,        -- endereço do Núcleo (pessoal ou empresarial)
    amount NUMERIC(15,2) NOT NULL,
    commission_percent NUMERIC(5,2) NOT NULL DEFAULT 3.00, -- 3% do vendedor
    commission_amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE'
      CHECK (status IN ('PENDENTE','PAGO','CONCLUIDO','CANCELADO')),
    payment_reference VARCHAR(100),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 6. REGRAS DE NEGÓCIO OBRIGATÓRIAS

### 6.1 Conceito central
> **O anúncio na RLoja é uma VISÃO do estoque, NÃO um registro separado.** A RLoja agrega anúncios de **TODAS as origens de estoque**: Rconta pessoal, Rconta empresarial, estoque criado na própria RLoja e estoques dos ERPs contratados. **Vender não exige tenant nem assinatura** — a comissão de 3% do vendedor é a única receita.

### 6.2 Quem pode vender (sem barreira de entrada)
| Origem | Estoque | Regra de anúncio |
|--------|---------|------------------|
| Pessoa com Rconta grátis | Estoque pessoal (Profissional) | Pode anunciar como **privado**, sem comprar nada |
| Empresa vinculada (responsável legal, procurador ou funcionário com permissão) | Estoque empresarial (Empresarial, 1 por empresa) | Pode anunciar |
| Empresa sem ERP (v2) | Estoque criado na RLoja (perfil privado) | Anuncia pela RLoja; ao contratar ERP, o estoque migra (bidirecional) |
| Empresa com ERP contratado | Estoque empresarial migrado para o ERP | Anuncia pelo ERP (vira loja na RLoja) |
| Comprador | — | **Compra gratuita**; apenas o vendedor paga **3%** no fechamento |

### 6.3 O que pode ser vendido
- **Físicos:** aeronaves, motores, hélices, rádios, instrumentos, acessórios, peças, consumíveis, inflamáveis (com rastreabilidade e FORM 8130-3 quando aplicável).
- **Digitais:** cursos somente pelo **ERP de Cursos e Treinamentos** (Parte 09); manuais/publicações pelo app **Publicações** (Parte 14). Cursos e publicações **não** ficam no estoque físico.
- **Catálogo do Núcleo:** não é vendido nem anunciado — apenas inserção e busca.

### 6.4 Estoque bidirecional RLoja ↔ ERP (v2 — contrato seção 4.5)
1. **Estoque criado na RLoja** (empresa sem assinatura, perfil privado) → cadastro do produto vai ao **Núcleo**.
2. Ao contratar um ERP → as lojas ativas/inativas da RLoja **viram estoque no ERP** automaticamente (evento de custódia `RLOJA_TO_ERP` no ledger).
3. **Estoque criado no ERP** → pode virar loja na RLoja (perfil privado ou público) — o anúncio é sempre visão do estoque.
4. Suspensão/cancelamento → retorno conforme Parte 02 (Rconta, seção 6.5 — estoque único na Rconta com marcação de origem; regularização pergunta se restaura posições; itens vendidos não voltam).

### 6.5 Regras de negócio da RLoja
1. Anúncio é **visão do estoque** — sem item de estoque, sem anúncio.
2. Qualquer pessoa com Rconta grátis pode anunciar (estoque pessoal) — **sem assinatura**.
3. Empresa vinculada anuncia pelo estoque empresarial (1 estoque por empresa).
4. **Estoque criado na RLoja** (v2) tem perfil privado por padrão; migra ao ERP ao contratar.
5. **Cursos apenas pelo ERP de Cursos (Parte 09); publicações pela Parte 14 (Publicações).**
6. Comissão de **3% cobrada do vendedor** no fechamento; comprador isento.
7. Peça com etiqueta vermelha ou em quarentena não pode ser anunciada.
8. **Dados de compra (endereços)** vêm do Núcleo — a compra pode usar endereço pessoal ou empresarial; a edição do endereço pela RLoja escreve no Núcleo (origem no ledger).
9. Toda publicação/venda gera bloco no ledger (`origin_app = RLOJA`).

## 7. ENDPOINTS DA API (resumo — verbatim da Parte 8 v2)

- `GET /market/listings?category=&origin=&search=` — explorar.
- `POST /market/listings` — criar anúncio (visão do estoque).
- `POST /market/listings/:id/publish` / `:id/pause` — publicar/pausar (com aprovação do Admin quando exigida).
- `POST /market/orders` — comprar.
- `POST /market/orders/:id/pay` / `:id/complete` / `:id/cancel` — pagamento e conclusão.
- `GET /market/my-listings` / `GET /market/my-purchases` / `GET /market/my-sales` — painéis.
- `PUT /market/my-purchase-data` — editar endereços de compra (escreve no Núcleo).
- Todas as rotas de escrita exigem `Idempotency-Key`; resposta sempre `{ success, data, error }`.

## 8. FRONTEND ANGULAR (feature-lib `feature-rloja`)

1. Componentes **standalone** com **signals** + **OnPush** — sem `NgModule`.
2. Injeção com **`inject()`** — construtor de DI proibido em código novo.
3. Controle de fluxo **`@if`/`@for`/`@switch`** — `*ngIf`/`*ngFor` proibidos em código novo.
4. `input()`/`output()` function-based; formulários reativos **tipados** (`NonNullableFormBuilder`).
5. Estado de componente com signals; estado complexo local com NgRx ComponentStore.
6. Chamadas HTTP via services com `inject(HttpClient)`; interceptors em `libs/core` (token, erro padrão `{success,data,error}`, idempotency-key).
7. Toda tela de escrita valida permissão no backend; guards/hides são UX.
8. Histórico sempre via **LedgerTimeline** (nunca lista editável); **ValidationBadge** ao lado de dados validáveis.
9. Feature-lib `feature-rloja` importa apenas `shared-dto`, `ui`, `core` e `util-*` (module boundaries).
10. Performance: busca na RLoja em < 200ms (cache Redis + CDN, paginação, índices).

## 9. TESTES OBRIGATÓRIOS (verbatim da Parte 8 v2, escopo RLoja)

1. Teste da RLoja: anúncio sem item de estoque é rejeitado.
2. Teste de comissão: 3% da venda cobrado do vendedor; comprador isento.
3. Teste de aprovação: Admin controla a publicação.
4. Teste de venda sem assinatura: pessoa com Rconta grátis anuncia (estoque pessoal) e vende; comissão de 3% do vendedor.
5. Teste de origem do anúncio: anúncio referencia o estoque de origem — sem item de estoque, sem anúncio.
6. Teste de cursos: apenas o ERP de Cursos cria/vende cursos; demais ERPs rejeitados.
7. Teste de custódia: migração ERP↔Rconta registrada no ledger; retorno como estoque único com marcação de origem.
8. **Teste de estoque bidirecional:** estoque criado na RLoja migra ao ERP ao contratar (RLOJA_TO_ERP).
9. Teste de ancoragem: publicação e venda geram blocos no ledger.
10. Teste de performance: busca na RLoja em < 200ms.
11. Teste de dados de compra: edição de endereço pela RLoja escreve no Núcleo (visível igual na Rconta).
12. Teste de peça bloqueada: etiqueta vermelha ou quarentena não pode ser anunciada.
13. Teste de idempotency: retry não duplica. Teste de padrão de resposta: 100% das rotas em `{ success, data, error }`.

## 10. CRITÉRIOS DE ACEITE

- [ ] RLoja multi-vendor com anúncio como visão do estoque (todas as origens) e **estoque bidirecional RLoja ↔ ERP**.
- [ ] Venda aberta a pessoa com Rconta grátis e a empresas vinculadas, **sem assinatura para vender**.
- [ ] Cursos apenas pelo ERP de Cursos (Parte 09); publicações apenas pela Parte 14 (Publicações).
- [ ] **Comissão da RLoja 3% (vendedor)** — acionada por evento do ledger; comprador isento.
- [ ] `market.listings` referencia obrigatoriamente `inventory_item_id` + `inventory_origin` (sem item de estoque, sem anúncio).
- [ ] Estoque criado na RLoja tem perfil privado por padrão e migra ao ERP ao contratar (RLOJA_TO_ERP).
- [ ] Dados de compra (endereços) editados pela RLoja escrevem no Núcleo.
- [ ] Toda publicação/venda gera bloco no ledger (`origin_app = RLOJA`).
- [ ] Testes de aceite passando; lacunas listadas.

## 11. MAPA DE MÓDULOS (decomposição futura em pedaços menores)

| Módulo | Seções previstas |
|--------|------------------|
| **04.1 — Explorar e anúncio** | 1. Busca + filtros (categoria/origem) · 2. Detalhe do anúncio · 3. Comprar · 4. Performance (<200ms) |
| **04.2 — Meus anúncios (visão do estoque)** | 1. Criar anúncio (pessoal OU empresarial OU estoque RLoja) · 2. Editar/pausar · 3. Regra sem item de estoque, sem anúncio · 4. Aprovação do Admin · 5. Restrições (etiqueta vermelha, quarentena, cursos/publicações) |
| **04.3 — Pedidos e comissão** | 1. Minhas compras · 2. Minhas vendas · 3. Comissão 3% do vendedor no fechamento · 4. Status do pedido (pendente/pago/concluído/cancelado) · 5. Pagamento (Asaas — Parte 01 — Núcleo) |
| **04.4 — Estoque bidirecional** | 1. Estoque criado na RLoja (perfil privado) · 2. Migração RLOJA_TO_ERP ao contratar · 3. Estoque do ERP vira loja · 4. Retorno na suspensão/cancelamento · 5. Eventos de custódia no ledger |
| **04.5 — Dados de compra e vendedor** | 1. Meus dados de compra (endereços do Núcleo) · 2. Configuração de vendedor (privado/público, banners) · 3. Multi-vendor: seller_person_id OU seller_company_id |

## 12. FONTES v2

- `artifacts/vortex-v2/docs/prompts/parte-8.md` — §2 (modelo de negócio do ecossistema), §3 (RLoja: conceito central, quem pode vender, o que pode ser vendido, estoque bidirecional, entidades, regras, endpoints), §8 (testes), §9 (critérios de aceite).
- `artifacts/vortex-v2/CLAUDE.md` — princípio 11 (multi-tenant/multi-vendor), seção 4.5 (estoque bidirecional RLoja ↔ ERP), seção 8 (regras de engenharia), seção 11 (tabela de apps).
- `artifacts/vortex-v2/docs/10-navegacao-por-app.md` — seção 3 (menu RLoja nível-clique) e seção 15 (regras de navegação).
- `artifacts/vortex-v2/docs/00-visao-geral.md` — seções 3, 9 e 10 (RLoja multi-vendor, modelo de negócio, estoque e custódia bidirecional).
- `artifacts/vortex-v2/docs/prompts/parte-1.md` — §14 (estoque no Núcleo e custódia — origens e fluxo de restauração).
