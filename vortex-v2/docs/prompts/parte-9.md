# VORTEX — PARTE 9/10 (v2): TRAVEL, FRETIMENTO E CERTIFICAÇÕES E PUBLICAÇÕES

> **Versão 2 — 12/09/2026.** Parte nova — desmembrada da antiga Parte 8 para respeitar o princípio "uma fase por vez, testar antes de avançar". Cobre os três apps de serviço/receita: **Travel** (passagens 121, comissão de agência), **Fretamento** (135/137) e **Certificações e Publicações** (produto na RLoja + assinaturas anuais com recortes).
> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em serviços de viagem, marketplaces de fretamento, produtos de conformidade regulatória e bibliotecas técnicas licenciadas. Construa os três apps conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, migrações SQL, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 9

1. **Travel** — busca e venda de passagens de linhas regulares 121 (modelo agência de viagem, comissão).
2. **Fretamento** — reserva e venda de fretamento 135 (passageiros, carga, aeromédico) e 137 (agrícola).
3. **Certificações e Publicações (CertPub)** — certificações como produto na RLoja (trilha de conformidade por norma); publicações como assinaturas anuais de manuais digitalizados licenciados, com **recortes consumidos pelas tarefas de manutenção** dos ERPs (Partes 5 e 6).
4. **Frontend Angular** (feature-libs `feature-travel`, `feature-charter`, `feature-certpub`).

> **Aderência à arquitetura central:** os três apps são consumidores do Núcleo — pessoas/empresas do Cadastro Central, documentos no document-service, comissões acionadas por eventos do ledger (Parte 4), acesso a conteúdo conforme concessão/assinatura. Nenhum cadastro duplicado. Schemas `travel`, `charter`, `certpub` já criados na fundação (Parte 1).

## 2. TRAVEL (passagens 121, comissão de agência)

### 2.1 Conceito
- Busca e venda de passagens de **linhas aéreas regulares 121** — modelo agência de viagem.
- **Comissão de agência** por passagem emitida (percentual por companhia, configurável — Parte 4).
- Passageiros são pessoas do Núcleo (dados cadastrais e de compra reutilizados).
- O operador 121 publica ofertas; a plataforma não é a companhia.

### 2.2 Entidades (schema `travel`)
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

### 2.3 Regras do Travel
1. E-ticket emitido → evento no ledger → dispara comissão de agência (Parte 4).
2. Cancelamento/reembolso conforme regra da companhia; reembolso cancela a comissão pendente.
3. Pagamento via Asaas; webhook idempotente.
4. O operador 121 publica ofertas; assentos decrementados atômicamente na compra.
5. Ancoragem: oferta, pedido e emissão geram blocos no ledger (`origin_app = TRAVEL`).

### 2.4 Endpoints
- `GET /travel/offers?origin=&destination=&date=` — busca de voos.
- `POST /travel/orders` — criar pedido.
- `POST /travel/orders/:id/pay` — pagamento (Asaas).
- `POST /travel/orders/:id/issue` — emitir e-ticket (dispara comissão).
- `POST /travel/orders/:id/cancel` / `:id/refund` — cancelar/reembolsar.
- `GET /travel/my-trips` — minhas viagens.
- `GET /travel/my-sales` — vendas/comissões (agência).

## 3. FRETIMENTO (135 e 137)

### 3.1 Conceito
- Reserva e venda de fretamento: **135** (passageiros, carga, aeromédico) e **137** (agrícola).
- Operadores publicam capacidade; clientes cotam, reservam e contratam.
- **Comissão/contrato** por operação (percentual ou taxa — Parte 4).

### 3.2 Entidades (schema `charter`)
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

### 3.3 Regras do Fretamento
1. Contrato confirmado → evento no ledger → dispara comissão (Parte 4).
2. Execução atualiza o status (`EM_EXECUCAO` → `CONCLUIDO`); cada transição gera bloco.
3. Fretamento agrícola (137) referencia área de aplicação (integra com ERP Agrícola — Parte 6).
4. Fretamento aeromédico exige dados do paciente no `details` (RESTRICTED — nível de acesso de documento).
5. Pagamento via Asaas; webhook idempotente.
6. Ancoragem: listing, cotação e contrato geram blocos no ledger (`origin_app = CHARTER`).

### 3.4 Endpoints
- `GET /charter/listings?type=&region=` — busca de fretamentos.
- `POST /charter/listings` — operador publica capacidade.
- `POST /charter/contracts` — cotar/reservar.
- `POST /charter/contracts/:id/confirm` — confirmar contrato (dispara comissão).
- `POST /charter/contracts/:id/status` — atualizar execução.
- `GET /charter/my-contracts` — minhas contratações.
- `GET /charter/operator/requests` — painel do operador.

## 4. CERTIFICAÇÕES E PUBLICAÇÕES (CertPub)

### 4.1 Certificações (produto na RLoja)
- Produto online anunciado na RLoja que **conduz a empresa à certificação/cumprimento** para: 91 Apêndice K, 121, 135, 137, 145, 141, 142 e 153.
- **Trilha de conformidade:** checklist por requisito (da matriz regulatória — docs/01), documentos exigidos, protocolos SEI, acompanhamento de fase (ex.: 5 fases de certificação de operador).
- A trilha consome os requisitos dos seeds (`shared-dto`) e exibe o progresso com ValidationBadge.

### 4.2 Publicações (assinatura anual)
- Pacotes de **manuais digitalizados** (fabricantes e Veryon — **sujeito a acordo de licenciamento** com cada detentor de direitos; pré-requisito comercial: pacote sem `license_agreement_ref` não publica).
- Digitalização com **OCR + indexação por ATA**; leitor integrado com busca.
- **Recortes:** a tarefa de manutenção (Partes 5 e 6) consome o **recorte do manual aplicável**; sem assinatura ativa, sem acesso ao recorte (obtenção por fora) — **a tarefa nunca é bloqueada**.

### 4.3 Entidades (schema `certpub`)
```sql
CREATE SCHEMA IF NOT EXISTS certpub;

CREATE TABLE certpub.certification_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    norm VARCHAR(30) NOT NULL,             -- 91_APK, 121, 135, 137, 145, 141, 142, 153
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(15,2) NOT NULL,
    published_rloja BOOLEAN DEFAULT TRUE,  -- anunciado na RLoja
    status VARCHAR(20) DEFAULT 'ATIVO',
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certpub.certification_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES certpub.certification_products(id),
    company_id UUID NOT NULL,              -- empresa certificanda
    current_phase VARCHAR(50),             -- ex.: FASE_1..FASE_5, CERTIFICADO
    progress_percent NUMERIC(5,2) DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'EM_ANDAMENTO'
      CHECK (status IN ('EM_ANDAMENTO','CONCLUIDA','SUSPENSA')),
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certpub.track_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID NOT NULL REFERENCES certpub.certification_tracks(id),
    seed_id INT NOT NULL,                  -- requisito da matriz (docs/01/seeds)
    requirement_title VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE'
      CHECK (status IN ('PENDENTE','EM_CUMPRIMENTO','CUMPRIDO','NAO_CUMPRIDO')),
    evidence_document_id UUID,             -- documento comprobatório (assinado)
    protocol_number VARCHAR(20),           -- protocolo SEI (quando aplicável)
    completed_at TIMESTAMPTZ,
    ledger_block_id UUID
);

CREATE TABLE certpub.publication_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publisher VARCHAR(100) NOT NULL,       -- fabricante ou Veryon
    license_agreement_ref VARCHAR(255),    -- referência do acordo de licenciamento (pré-requisito)
    title VARCHAR(255) NOT NULL,
    description TEXT,
    annual_price NUMERIC(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'ATIVO',
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certpub.publication_manuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES certpub.publication_packages(id),
    manual_code VARCHAR(100) NOT NULL,     -- ex.: AMM capítulo
    title VARCHAR(255) NOT NULL,
    ata_chapter VARCHAR(2),                -- indexação por ATA
    storage_key VARCHAR(512) NOT NULL,     -- digitalização (MinIO)
    ocr_index JSONB DEFAULT '{}',          -- índice OCR para busca
    revision VARCHAR(20), revision_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certpub.manual_excerpts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manual_id UUID NOT NULL REFERENCES certpub.publication_manuals(id),
    excerpt_ref VARCHAR(255) NOT NULL,     -- página/seção
    ata_chapter VARCHAR(2),
    content_ref JSONB NOT NULL,            -- referência do recorte no documento
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 Regras do CertPub
1. **Certificações:** compra na RLoja → cria `certification_tracks` para a empresa; requisitos vêm dos seeds; evidências são documentos assinados (Parte 3); protocolos SEI vinculados; progresso exibido com ValidationBadge.
2. **Publicações:** assinatura anual por pacote (Parte 4); acesso ao leitor e aos recortes **somente com assinatura ativa**.
3. **Recorte:** a tarefa de manutenção referencia `manual_excerpts` (via `mro.task_publication_excerpts` — Parte 5); sem assinatura → `access_granted = FALSE` + orientação de obtenção externa; **a tarefa nunca é bloqueada**.
4. **Licenciamento:** pacote sem `license_agreement_ref` não pode ser publicado (BRE: `PUBLICATION_SALES_CERTPUB_ONLY` + validação de licença).
5. Revisão nova de manual → revisão antiga marcada `is_current = FALSE` (alerta nos ERPs — Parte 5, regra 8).
6. Ancoragem: compra, trilha, requisito cumprido, assinatura e leitura de recorte geram blocos no ledger (`origin_app = CERTPUB`).

### 4.5 Endpoints
- `GET /certpub/certifications` — catálogo de produtos de certificação.
- `POST /certpub/tracks` — iniciar trilha (após compra na RLoja).
- `GET /certpub/tracks/:id` — progresso da trilha.
- `POST /certpub/tracks/:id/requirements/:reqId/evidence` — anexar evidência (documento assinado).
- `POST /certpub/tracks/:id/requirements/:reqId/complete` — marcar requisito cumprido.
- `GET /certpub/publications` — catálogo de pacotes.
- `POST /certpub/publications/:id/subscribe` — assinar pacote (anual).
- `GET /certpub/manuals?search=&ata=` — biblioteca (busca OCR/ATA; assinantes).
- `GET /certpub/manuals/:id/excerpts/:excerptId` — recorte (somente assinantes).
- `GET /certpub/my-subscriptions` — minhas assinaturas de publicações.

## 5. FRONTEND ANGULAR (feature-libs v2)

### 5.1 `feature-travel`
- Busca de voos `[form origem/destino/data → resultados]` · Reserva `[detalhe → passageiros (Núcleo) → pagamento]` · Minhas viagens `[lista → detalhe]` · Minhas vendas `[lista → comissões]`.

### 5.2 `feature-charter`
- Busca/cotação `[tipo (passageiros/carga/aeromédico/agrícola) → operadores]` · Reserva `[detalhe → contrato]` · Painel do operador `[solicitações → propostas → contratos → execução]` · Minhas contratações.

### 5.3 `feature-certpub`
- **Certificações:** catálogo por norma → comprar na RLoja → trilha `[checklist por requisito com ValidationBadge → evidências → protocolos]` → Minha certificação `[fase, pendências, timeline]`.
- **Publicações:** catálogo de pacotes → assinar → Biblioteca `[leitor digitalizado/OCR, busca por ATA]` → Recortes `[tarefa → recorte (se assinante); senão orientação externa]` → Minhas assinaturas.

### 5.4 Padrões obrigatórios (idem Parte 1, seção 18)
Standalone + signals + OnPush + `inject()` + `@if/@for`; formulários reativos tipados; LedgerTimeline para histórico; ValidationBadge em trilhas e requisitos; guards de permissão (UX) + validação no backend.

## 6. TESTES OBRIGATÓRIOS DA PARTE 9

1. Teste Travel: e-ticket emitido dispara comissão de agência; reembolso cancela comissão pendente.
2. Teste Travel: assentos decrementados atômicamente; venda sem assento é rejeitada.
3. Teste Travel: oferta só publicável por operador com COA 121 válido (consulta Núcleo).
4. Teste Fretamento: contrato confirmado dispara comissão; execução atualiza status com blocos.
5. Teste Fretamento: aeromédico exige dados do paciente (RESTRICTED).
6. Teste Fretamento: agrícola referencia área de aplicação (integração ERP Agrícola).
7. Teste Certificações: compra na RLoja cria trilha; requisitos dos seeds; evidência assinada marca CUMPRIDO.
8. Teste Certificações: trilha exibe progresso com ValidationBadge e fase atual.
9. Teste Publicações: pacote sem `license_agreement_ref` não publica.
10. Teste Publicações: assinatura ativa → recorte servido; suspensa → orientação externa; tarefa nunca bloqueada.
11. Teste Publicações: revisão nova marca a antiga como não vigente (alerta nos ERPs).
12. Teste de ancoragem: oferta, pedido, e-ticket, listing, contrato, trilha, requisito e recorte geram blocos no ledger com `origin_app` correto.
13. Teste de idempotência: webhooks de pagamento não duplicam pedidos/assinaturas.
14. Teste de RLS: usuário sem vínculo não acessa ofertas/contratos/trilhas de outros tenants.

## 7. CRITÉRIOS DE ACEITE DA PARTE 9

- [ ] Travel operando (busca, reserva, emissão, reembolso, comissão de agência).
- [ ] Fretamento operando (listings, cotação, contrato, execução, comissão) para 135 e 137.
- [ ] Certificações operando (produto na RLoja, trilha por norma com requisitos dos seeds, evidências, protocolos).
- [ ] Publicações operando (pacotes licenciados, OCR/ATA, recortes consumidos pelas tarefas dos ERPs, assinatura anual).
- [ ] Comissões acionadas por eventos do ledger (integração com Parte 4).
- [ ] Frontend Angular (feature-libs `feature-travel`, `feature-charter`, `feature-certpub`) conforme padrões v2.
- [ ] Testes de aceite passando; lacunas listadas.
