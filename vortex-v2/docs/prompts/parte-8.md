# VORTEX — PARTE 8/10 (v2): RLOJA, INTEGRAÇÕES, MOTOR DE REGRAS (BRE), CENTRAL DE COMUNICAÇÃO E CONSOLIDAÇÃO

> **Versão 2 — 12/09/2026.** Reformulada e reescopada: **RLoja multi-vendor com estoque bidirecional**, integrações (RAB, SEI, S141, SIGRA, gov/Receita/Correios, Asaas, Resend, Sentry), Motor de Regras (BRE), Central de Comunicação (WebSockets) e consolidação final. **Travel, Fretamento e CertPub migraram para a Parte 9; App ANAC e Console do Núcleo para a Parte 10** (princípio "uma fase por vez").
> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em marketplaces B2B, integrações com sistemas externos (ANAC, SEI, pagamentos), motor de regras declarativo (BRE) e consolidação de arquitetura. Construa a RLoja, o módulo de integrações, o Motor de Regras e a Central de Comunicação do ecossistema VORTEX conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 8

Entregar as capacidades finais de comércio e infraestrutura:
1. **RLoja (Marketplace B2B multi-vendor)** — anúncio como VISÃO do estoque; estoque bidirecional RLoja ↔ ERP.
2. **Integrações externas** — ANAC (RAB, SEI, S141, SIGRA), validação N2 (gov, Receita, Correios), Asaas, Resend, Sentry.
3. **Motor de Regras Declarativo (BRE)** — centraliza as regras de negócio de todo o ecossistema.
4. **Central de Comunicação** — chat (WebSockets), alertas, e-mails, comunicados oficiais.
5. **Consolidação** — visão final, decisões e integração das 10 partes.
6. **Frontend Angular** (feature-lib `feature-rloja` + Central de Comunicação na Shell).

> **Nota de escopo (v2):** Travel, Fretamento e Certificações e Publicações são especificados na **Parte 9**; App ANAC e Console do Núcleo na **Parte 10**. Esta parte foca no comércio (RLoja) e na infraestrutura transversal (integrações, BRE, comunicação).

## 2. MODELO DE NEGÓCIO DO ECOSSISTEMA (v2)

| Produto/App | Modelo | Observação |
|-------------|--------|------------|
| **Rconta (grátis)** | Grátis com banners | VIP ou compra de ERP remove anúncios apenas na Rconta do comprador |
| **Rconta VIP** | Assinatura | — |
| **Assinatura de Vagas** | Assinatura | Recrutamento para empresa sem ERP |
| **5 ERPs** (Manutenção, Operadores, Cursos, Agrícola, Aeródromos) | Assinatura | Recrutamento embutido em todos |
| **Publicações** | Assinatura anual | Manuais digitalizados licenciados; recortes nas tarefas de manutenção (Parte 9) |
| **RLoja** | Comissão 3% do vendedor | Comprador isento; vender não exige assinatura (multi-vendor) |
| **Travel** | Comissão de agência | Passagens 121 (Parte 9) |
| **Fretamento** | Comissão/contrato | 135 e 137 (Parte 9) |
| **Certificações** | Produto (na RLoja) | 91 Ap.K, 121, 135, 137, 145, 141, 142, 153 (Parte 9) |
| **Núcleo / Catálogo / App ANAC** | Não vendidos | Infraestrutura e uso oficial |

## 3. RLOJA (MARKETPLACE B2B MULTI-VENDOR)

### 3.1 Conceito central
> **O anúncio na RLoja é uma VISÃO do estoque, NÃO um registro separado.** A RLoja agrega anúncios de **TODAS as origens de estoque**: Rconta pessoal, Rconta empresarial, estoque criado na própria RLoja e estoques dos ERPs contratados. **Vender não exige tenant nem assinatura** — a comissão de 3% do vendedor é a única receita.

### 3.2 Quem pode vender (sem barreira de entrada)
| Origem | Estoque | Regra de anúncio |
|--------|---------|------------------|
| Pessoa com Rconta grátis | Estoque pessoal (Profissional) | Pode anunciar como **privado**, sem comprar nada |
| Empresa vinculada (responsável legal, procurador ou funcionário com permissão) | Estoque empresarial (Empresarial, 1 por empresa) | Pode anunciar |
| Empresa sem ERP (v2) | Estoque criado na RLoja (perfil privado) | Anuncia pela RLoja; ao contratar ERP, o estoque migra (bidirecional) |
| Empresa com ERP contratado | Estoque empresarial migrado para o ERP | Anuncia pelo ERP (vira loja na RLoja) |
| Comprador | — | **Compra gratuita**; apenas o vendedor paga **3%** no fechamento |

### 3.3 O que pode ser vendido
- **Físicos:** aeronaves, motores, hélices, rádios, instrumentos, acessórios, peças, consumíveis, inflamáveis (com rastreabilidade e FORM 8130-3 quando aplicável).
- **Digitais:** cursos somente pelo **ERP de Cursos e Treinamentos** (Parte 7); manuais/publicações pelo app **CertPub** (Parte 9). Cursos e publicações **não** ficam no estoque físico.
- **Catálogo do Núcleo:** não é vendido nem anunciado — apenas inserção e busca.

### 3.4 Estoque bidirecional RLoja ↔ ERP (v2 — contrato seção 4.5)
1. **Estoque criado na RLoja** (empresa sem assinatura, perfil privado) → cadastro do produto vai ao **Núcleo**.
2. Ao contratar um ERP → as lojas ativas/inativas da RLoja **viram estoque no ERP** automaticamente (evento de custódia `RLOJA_TO_ERP` no ledger).
3. **Estoque criado no ERP** → pode virar loja na RLoja (perfil privado ou público) — o anúncio é sempre visão do estoque.
4. Suspensão/cancelamento → retorno conforme Parte 1 (seção 14.3).

### 3.5 Entidades
```sql
-- SCHEMA: market (RLoja) — anúncio como VISÃO do estoque de qualquer origem
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

### 3.6 Regras de negócio da RLoja
1. Anúncio é **visão do estoque** — sem item de estoque, sem anúncio.
2. Qualquer pessoa com Rconta grátis pode anunciar (estoque pessoal) — **sem assinatura**.
3. Empresa vinculada anuncia pelo estoque empresarial (1 estoque por empresa).
4. **Estoque criado na RLoja** (v2) tem perfil privado por padrão; migra ao ERP ao contratar.
5. **Cursos apenas pelo ERP de Cursos (Parte 7); publicações pelo CertPub (Parte 9).**
6. Comissão de **3% cobrada do vendedor** no fechamento; comprador isento.
7. Peça com etiqueta vermelha ou em quarentena não pode ser anunciada.
8. **Dados de compra (endereços)** vêm do Núcleo — a compra pode usar endereço pessoal ou empresarial; a edição do endereço pela RLoja escreve no Núcleo (origem no ledger).
9. Toda publicação/venda gera bloco no ledger (`origin_app = RLOJA`).

### 3.7 Endpoints
- `GET /market/listings?category=&origin=&search=` — explorar.
- `POST /market/listings` — criar anúncio (visão do estoque).
- `POST /market/listings/:id/publish` / `:id/pause` — publicar/pausar (com aprovação do Admin quando exigida).
- `POST /market/orders` — comprar.
- `POST /market/orders/:id/pay` / `:id/complete` / `:id/cancel` — pagamento e conclusão.
- `GET /market/my-listings` / `GET /market/my-purchases` / `GET /market/my-sales` — painéis.
- `PUT /market/my-purchase-data` — editar endereços de compra (escreve no Núcleo).

## 4. INTEGRAÇÕES EXTERNAS

### 4.1 Links oficiais ANAC (referência)
| Recurso | Link |
|---------|------|
| RAB (Registro Aeronáutico Brasileiro) | https://aeronaves.anac.gov.br/aeronaves/cons_rab_resposta2.asp |
| Consulta de matrícula (exemplo PP-EPT) | https://aeronaves.anac.gov.br/aeronaves/cons_rab_resposta2.asp?tipo_pesquisa=marcas&textMarca=PP-EPT |
| Sistema Eletrônico de Informações (SEI) | https://sei.anac.gov.br |
| Portal ANAC | https://www.gov.br/anac |
| S141 (centros de instrução) | https://s141.anac.gov.br |

### 4.2 Validação RAB (regra do cadastro de aeronave)
- No cadastro de aeronave, o sistema confronta a matrícula com a base pública do RAB.
- Valida se o operador/proprietário cadastrado coincide com o titular no RAB (nome + CPF/CNPJ).
- Matrícula NÃO no nome da pessoa/empresa → cadastro bloqueado (`AIRCRAFT_RAB_MISMATCH`).
- Matrícula com um dos proprietários ou operadores = nome e CPF/CNPJ do Núcleo → cadastro liberado.
- Fonte: RAB via scraping (sem API oficial) — **circuit breaker**: RAB indisponível → cadastro pendente de validação (nunca bloqueado para sempre).

### 4.3 Integrações de validação cadastral (N2 — fonte oficial)
> As integrações abaixo elevam o nível de validação dos dados cadastrais e profissionais para **N2 (selo oficial 🟢)**. Nunca bloqueiam o fluxo.

| Integração | Dado validado | Nível |
|------------|---------------|-------|
| Gov.br | Identidade do usuário | N2 |
| Receita Federal | CPF / CNPJ | N2 |
| Correios (ViaCEP) | CEP / endereço | N2 |
| RAB (ANAC) | Matrícula / proprietário / operador | N2 |
| SACI (ANAC) | CMA | N2 |

### 4.4 Integrações de infraestrutura
- **Asaas** (pagamentos): PIX, boleto, cartão; cobrança recorrente; webhook idempotente.
- **Resend** (e-mail transacional): templates, bounce.
- **Sentry** (erros): monitoramento.
- **GitGuardian** (segredos): prevenção de vazamento.

### 4.5 Regras de integração
1. Secrets NUNCA em claro (env/secret manager).
2. Webhooks idempotentes (não duplicam).
3. Toda integração externa registra no ledger.
4. Falha de integração não derruba o fluxo principal (circuit breaker).
5. Integrações de validação elevam o selo (N2) — nunca bloqueiam o fluxo.

## 5. MOTOR DE REGRAS DECLARATIVO (BRE)

### 5.1 Conceito
- Centraliza TODAS as regras de negócio do ecossistema (`regras-bre.ts` em `libs/shared-dto`).
- Consome os seeds por RBAC (docs/05) como fonte canônica.
- Nenhuma regra hardcoded — sempre lida dos seeds/configuração.

### 5.2 Regras críticas a registrar no BRE (v2)
1. Credenciamento expirado (3 anos) → bloqueio automático + alerta 60 dias.
2. Licença/CMA/credenciamento vencido → bloqueio do profissional.
3. Exame toxicológico vencido (90 dias) → bloqueio da função ARSO.
4. Item MEL vencido → bloqueio do voo.
5. DA aplicável pendente → prevalece sobre a MEL.
6. Despacho bloqueado se faltar combustível regulamentar.
7. Ferramenta com calibração vencida → bloqueio de uso na OS.
8. Peça com etiqueta vermelha → bloqueio de instalação.
9. OS não aprovada para retorno sem assinatura de profissional habilitado.
10. Grande reparo/alteração → SEGVOO 001 antes do retorno.
11. Fluxo comercial da oficina em 12 etapas (máquina de estados, sem retroativos).
12. Matrícula de aeronave deve bater com o RAB.
13. Anúncio da RLoja é visão do estoque (sem item de estoque, sem anúncio).
14. Matrícula no dobro do período letivo → cancelamento (S141).
15. Tempo-resposta SESCINC ≤ 3 minutos.
16. **Vínculo de experiência só fica ATIVO com dupla confirmação (misto).**
17. **Vaga interna visível apenas para funcionário com vínculo ativo na empresa.**
18. **Contratação finalizada cria vínculo automático Núcleo ↔ RH do ERP — sem cobrança.**
19. **Recrutamento nunca cria cadastro próprio de pessoas — apenas agrega e edita perfil (origem no ledger).**
20. **Histórico exibido é sempre um filtro do ledger — nunca duplicado.**
21. **Cursos só podem ser anunciados pelo ERP de Cursos; publicações pelo CertPub.**
22. **Rconta grátis exibe banners; Rconta VIP ou compra de ERP remove apenas na Rconta do comprador.**
23. **Suspensão de ERP devolve o estoque à Rconta como estoque único com marcação de origem; regularização pode restaurar posições originais (itens vendidos não voltam).**
24. **Estoque criado na RLoja migra ao ERP ao contratar (RLOJA_TO_ERP).**
25. **Recorte de manual exige assinatura de Publicações ativa; sem assinatura, orientação de obtenção externa — tarefa nunca bloqueada.**
26. **Acesso ao ledger exige concessão ativa (5 tipos); auditor ANAC é somente-leitura; segredo de justiça esconde meta-eventos.**
27. **Movimento (pouso/decolagem) em RWYCC incompatível é bloqueado.**
28. **Currículo de IS (121-006 etc.) só é criado pelo ERP Cursos; operadores contratam turma corporativa.**

### 5.3 Estrutura
```typescript
// libs/shared-dto/src/lib/rules/regras-bre.ts
export const BUSINESS_RULES = [
  { code: 'ACCREDITATION_EXPIRED', severity: 'BLOCKING' },
  { code: 'LICENSE_EXPIRED', severity: 'BLOCKING' },
  { code: 'TOXICOLOGICAL_EXPIRED', severity: 'BLOCKING' },
  { code: 'MEL_ITEM_EXPIRED', severity: 'BLOCKING' },
  { code: 'DA_PENDING', severity: 'BLOCKING' },
  { code: 'FUEL_INSUFFICIENT', severity: 'BLOCKING' },
  { code: 'TOOL_CALIBRATION_EXPIRED', severity: 'BLOCKING' },
  { code: 'PART_RED_TAG', severity: 'BLOCKING' },
  { code: 'CRS_WITHOUT_SIGNATURE', severity: 'BLOCKING' },
  { code: 'SEGVOO_REQUIRED', severity: 'BLOCKING' },
  { code: 'AIRCRAFT_RAB_MISMATCH', severity: 'BLOCKING' },
  { code: 'LISTING_WITHOUT_INVENTORY', severity: 'BLOCKING' },
  { code: 'ENROLLMENT_DOUBLE_PERIOD', severity: 'BLOCKING' },
  { code: 'SESCINC_RESPONSE_OVER_LIMIT', severity: 'CRITICAL' },
  { code: 'RWYCC_OPERATION_INCOMPATIBLE', severity: 'BLOCKING' },
  { code: 'EXPERIENCE_LINK_PENDING_DUAL_CONFIRM', severity: 'INFO' },
  { code: 'INTERNAL_JOB_VISIBILITY_RESTRICTED', severity: 'BLOCKING' },
  { code: 'HIRING_CREATES_AUTOMATIC_LINK', severity: 'INFO' },
  { code: 'RECRUITMENT_AGGREGATOR_ONLY', severity: 'BLOCKING' },
  { code: 'COURSE_SALES_ERP_TRAINING_ONLY', severity: 'BLOCKING' },
  { code: 'PUBLICATION_SALES_CERTPUB_ONLY', severity: 'BLOCKING' },
  { code: 'EXCERPT_REQUIRES_PUBLICATION_SUBSCRIPTION', severity: 'BLOCKING' },
  { code: 'BANNERS_RCONTA_FREE', severity: 'INFO' },
  { code: 'STOCK_CUSTODY_RETURN_ON_SUSPENSION', severity: 'BLOCKING' },
  { code: 'STOCK_RLOJA_TO_ERP_ON_CONTRACT', severity: 'INFO' },
  { code: 'LEDGER_ACCESS_REQUIRES_GRANT', severity: 'BLOCKING' },
  { code: 'ANAC_AUDITOR_READ_ONLY', severity: 'BLOCKING' }
];
```

## 6. CENTRAL DE COMUNICAÇÃO (barra superior da Shell)

1. **Chat:** conversas entre usuários da mesma empresa/tenant e conversas do processo seletivo — **tempo real via WebSockets** (mensagens em `communication.messages`; cada mensagem gera bloco no ledger).
2. **Alertas:** consome `notifications.alerts` (badges do Hub Preditivo) — push WebSocket.
3. **E-mails:** caixa de e-mails transacionais (entrada/saída via Resend).
4. **Comunicados Oficiais:** avisos da plataforma e da empresa (target por tenant/empresa/papel).
5. **Tema:** alterna claro → escuro → personalizado.
- Toda conversa/comunicado relevante gera bloco no Ledger; a Central apenas exibe filtros (sem duplicar histórico).
- Schema: `communication` (threads, mensagens, participantes, comunicados).

## 7. CONSOLIDAÇÃO FINAL

### 7.1 Visão geral do ecossistema (v2)
- **13 aplicativos**, 1 backend (`api.vortex.com`), 1 banco (PostgreSQL 16 com RLS), 1 ledger imutável com conteúdo cifrado.
- **Núcleo** (Cadastro Central + Ledger + Banco Central + console de gestão zero-trust) — dono da verdade; **todos os apps inserem e consomem** (origem no ledger).
- Apps: Rconta, RLoja, Recrutamento, ERP Manutenção, ERP Operadores, ERP Cursos, ERP Agrícola, ERP Aeródromos, App ANAC, Travel, Fretamento, Certificações e Publicações.

### 7.2 Modelo de negócio (v2)
| Fonte | Regra |
|-------|-------|
| Assinaturas | Rconta VIP, Assinatura de Vagas, 5 ERPs (Recrutamento incluso), Publicações |
| Marketplace (RLoja) | 3% da venda, cobrado do vendedor; comprador isento; vender sem assinatura |
| Travel | Comissão de agência por passagem 121 (Parte 9) |
| Fretamento | Comissão/contrato por operação 135/137 (Parte 9) |
| Recrutamento | **Sem comissão** — embutido no ERP ou Assinatura de Vagas; pessoas nunca pagam |

### 7.3 Decisões finais (consolidação v2)
| Decisão | Escolha |
|---------|---------|
| Estrutura | 13 apps consumindo o Núcleo (Cadastro Central + Ledger + Banco Central) |
| Backend | Único em núcleos (domain services), monorepo Nx |
| Frontend | SPA única Angular (Opção A) com 13 feature-libs; migração planejada A→B→C |
| Banco | PostgreSQL único, esquemas por domínio, RLS |
| Histórico | Ledger central append-only **com conteúdo cifrado**; apps exibem filtros (LedgerTimeline) |
| Acesso ao conteúdo | Zero-trust — concessões (DONO/SUPORTE/AUDITORIA/JUSTICA); chaves fora das mãos de admins |
| Cadastros | Tudo no Núcleo; qualquer app autorizado insere/edita (origem no ledger) |
| Recrutamento | Agregador + RH completo; 2 origens de vagas; **sem comissão** |
| RLoja | Multi-vendor; anúncio = visão do estoque; estoque bidirecional com ERPs |
| Estoque | Catálogo único no Núcleo; custódia dinâmica Rconta ↔ RLoja ↔ ERP |
| Certificações/Publicações | Produto na RLoja + assinaturas anuais com recortes nas tarefas de manutenção (Parte 9) |
| Auditoria | App ANAC: consentida → recusa → suspensão → compulsória; somente-leitura; ciclo auditado (Parte 10) |
| Escala | Infraestrutura elástica (autoscaling, CDN, load balancer) |

### 7.4 Performance e escala
- SPA Angular com lazy loading por feature-lib; SVG; paginação.
- Cache em dupla camada (Redis + CDN).
- Load balancer, autoscaling, UUID.
- Índices do ledger sobre metadados em claro (entidade, ação, tenant, origin_app).

## 8. TESTES OBRIGATÓRIOS DA PARTE 8

1. Teste da RLoja: anúncio sem item de estoque é rejeitado.
2. Teste de comissão: 3% da venda cobrado do vendedor; comprador isento.
3. Teste de aprovação: Admin controla a publicação.
4. Teste de validação RAB: matrícula divergente bloqueia o cadastro; RAB indisponível → pendente (circuit breaker).
5. Teste de integração N2: gov/receita/correios elevam o selo de validação (nunca bloqueiam).
6. Teste de BRE: cada regra bloqueia a ação correspondente.
7. Teste de vínculo misto: vínculo de experiência só fica ATIVO com dupla confirmação.
8. Teste de vaga interna: visível apenas para funcionário com vínculo ativo na empresa.
9. Teste de contratação: finalizar contratação cria vínculo automático — **sem cobrança**.
10. Teste de agregador: Recrutamento não cria cadastro próprio; histórico é filtro do ledger.
11. Teste de venda sem assinatura: pessoa com Rconta grátis anuncia (estoque pessoal) e vende; comissão de 3% do vendedor.
12. Teste de origem do anúncio: anúncio referencia o estoque de origem — sem item de estoque, sem anúncio.
13. Teste de banners: Rconta grátis com banners; VIP/ERP remove apenas na Rconta do comprador.
14. Teste de cursos: apenas o ERP de Cursos cria/vende cursos; demais ERPs rejeitados.
15. Teste de custódia: migração ERP↔Rconta registrada no ledger; retorno como estoque único com marcação de origem.
16. **Teste de estoque bidirecional:** estoque criado na RLoja migra ao ERP ao contratar (RLOJA_TO_ERP).
17. Teste de integração: webhook idempotente não duplica.
18. Teste de circuit breaker: falha de integração não derruba o fluxo.
19. Teste de ancoragem: publicação e venda geram blocos no ledger.
20. Teste de performance: busca na RLoja em < 200ms.
21. **Teste da Central de Comunicação:** chat em tempo real via WebSocket; mensagem gera bloco no ledger; badges alimentados pelo Hub.

## 9. CRITÉRIOS DE ACEITE DA PARTE 8

- [ ] RLoja multi-vendor com anúncio como visão do estoque (todas as origens) e **estoque bidirecional RLoja ↔ ERP**.
- [ ] Venda aberta a pessoa com Rconta grátis e a empresas vinculadas, sem assinatura para vender.
- [ ] Cursos apenas pelo ERP de Cursos (Parte 7); publicações apenas pelo CertPub (Parte 9).
- [ ] Banners: grátis com anúncios; Rconta VIP/ERP remove apenas na Rconta do comprador.
- [ ] Comissão da RLoja 3% (vendedor) — acionada por evento do ledger.
- [ ] Integrações ANAC (RAB, SEI, S141, SIGRA) e validação N2 (gov, Receita, Correios, SACI) com circuit breakers.
- [ ] Validação RAB no cadastro de aeronave.
- [ ] Motor de Regras Declarativo (BRE) centralizado com as regras v2 (28 regras).
- [ ] Central de Comunicação com WebSockets.
- [ ] Consolidação final das 10 partes.
- [ ] Frontend Angular (feature-lib `feature-rloja` + Central na Shell) conforme padrões v2.
- [ ] Testes de aceite passando; lacunas listadas.
