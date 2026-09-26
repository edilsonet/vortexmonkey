# VORTEX v4 — PARTE 02/14: RCONTA (rconta.vortex.com — Grátis/VIP)

> **Origem v2:** conteúdo extraído VERBATIM da Parte 1 v2 (§§9–14 — Rconta, módulos, estoque/custódia) e do docs/10 (menu da Rconta). A v3 separa um app por parte; a fundação (workspace Nx, Shell, Design System, Núcleo) fica na Parte 01.
> **Consumo do Núcleo (Parte 01):** a Rconta NÃO tem banco próprio — tudo via API do Núcleo (schemas `identity`, `professional`, `stock`). Todo evento registra `origin_app = RCONTA` no ledger.

> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em arquitetura enterprise, multi-tenancy, identidade federada (OIDC), dados cadastrais com validação automática, design systems Angular e aviação civil regulada. Construa a RCONTA conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 02

Entregar a **Rconta** — o app do usuário (Grátis com banners / VIP): **7 módulos + 2 menus** que consomem o Núcleo:

1. **Módulo Pessoal** — dados cadastrais (contatos, endereços, documentos pessoais, redes sociais) com validação N0–N3.
2. **Módulo Profissional** — dados profissionais, documentos profissionais, currículo (cursos, treinamentos, experiências, CMA, CIV), **declarações de experiência**, **estoque pessoal**.
3. **Módulo Empresarial** — responsáveis legais, procuradores, empresas vinculadas (com documento digital assinado), **1 estoque por empresa**, **[timeline da assinatura]**.
4. **Módulo Protocolo** — protocolo eletrônico AAAA-NNNNNN.
5. **Módulo Assinaturas** — Rconta VIP · Assinatura de Vagas · 5 ERPs · Publicações — detalhes e cancelamento.
6. **Módulo Personalização** — tamanho do texto, fonte, cor de fundo; tema claro → escuro → personalizado.
7. **Módulo Segurança** — senha, dispositivos, 2FA.
8. **Menu Dashboard** — widgets de cada módulo.
9. **Menu Configurações** — idioma, horário UTC, demais preferências.

## 2. ADERÊNCIA À ARQUITETURA CENTRAL (CLAUDE.md v2)

- **Princípio 1 (Núcleo dono da verdade):** a Rconta é a experiência do usuário sobre o Núcleo; os mesmos dados são acessíveis pelos demais apps autorizados. O mesmo dado pode ser criado/editado por qualquer app autorizado (ex.: endereço pela Rconta, RLoja OU Recrutamento) — o que muda é apenas o campo **`origin_app`** no evento do ledger; o cadastro vive **uma única vez** no núcleo.
- **Princípio 2 (Ledger imutável):** o histórico de tudo é o **Ledger** — linha do tempo com conteúdo completo (quem/papel, início, fim, o quê, app de origem), cifrado em repouso. A Rconta exibe **filtros projetados do ledger** (componente `LedgerTimeline`) — nunca histórico duplicado.
- **Princípio 3 (Validação em níveis N0–N3):** ⚪ N0 Pendente → 🟡 N1 Sistema → 🟢 N2 Oficial (gov/Receita/Correios/SACI/RAB) → 🔵 N3 Autêntico. Dado pendente é exibido sem selo; **nada é bloqueado** por falta de validação.
- **Princípio 4 (Vínculo misto):** pessoa↔empresa só fica ATIVO quando os dois lados aprovam (dupla confirmação).
- **Princípio 8 (Banners):** Rconta grátis exibe anúncios (`BannerAd`); Rconta VIP ou compra de qualquer ERP remove os anúncios **apenas na Rconta do comprador**.
- **Princípio 7 (Estoque e custódia):** estoque pessoal no módulo Profissional; estoque empresarial (1 por empresa) no módulo Empresarial; catálogo único no Núcleo; custódia dinâmica Rconta ↔ RLoja ↔ ERP.
- **10 regras imutáveis de engenharia:** toda escrita valida permissão (RBAC/ABAC) → executa ação de domínio → registra no ledger → gera protocolo (se aplicável) → publica evento no bus; ledger append-only (UPDATE/DELETE bloqueados por trigger); tenant é contexto; frontend nunca valida regra de negócio (guards/hides são UX); padrão de resposta `{ success, data, error }`; rotas de escrita exigem `Idempotency-Key` (Redis, 24h); RLS por linha; código com migrações SQL + testes; secrets em env/secret manager; toda entrega lista o que fez e o que NÃO fez.
- **Erros padrão:** `AUTH_REQUIRED`(401), `TOKEN_EXPIRED`(401), `PERMISSION_DENIED`(403), `NOT_FOUND`(404), `VALIDATION_ERROR`(422), `RATE_LIMITED`(429), `IDEMPOTENCY_CONFLICT`(409), `LEDGER_VERIFICATION_FAILED`(500).

## 3. FUNDAMENTAÇÃO REGULATÓRIA

- **Resolução ANAC nº 458/2017** — registros eletrônicos imutáveis (base do ledger; todo evento da Rconta gera bloco).
- **Lei nº 14.063/2020** — assinaturas eletrônicas (documentos pessoais/profissionais e vínculos empresariais assinados; bloco SEI — Parte 01 (Núcleo — M4)).
- **Resolução ANAC nº 520/2019** — protocolo eletrônico `AAAA-NNNNNN` (Módulo Protocolo).
- **RBAC 61 / IS 61-001G** — CIV (Caderneta Individual de Voo): lançamento com assinatura do piloto, endosso do instrutor, estados draft/signed/rectified/voided, envio ANAC.
- **RBAC 67** — CMA (Certificado Médico Aeronáutico): classes 1/2/3, validade, restrições. Integração SACI (ANAC) quando disponível eleva a validação do CMA para **N2 (selo oficial 🟢)**. Nunca bloqueia o cadastro.
- **Validação N2 (fonte oficial):** Gov.br (identidade), Receita Federal (CPF/CNPJ), Correios/ViaCEP (CEP/endereço), SACI (CMA) — elevam o selo, nunca bloqueiam o fluxo.

## 4. ESTRUTURA DE MENUS (docs/10 — nível de clique)

- Dashboard `[widgets por módulo + pendências de validação + vínculos pendentes + alertas]`
- **Pessoal**
  - Meus dados `[form]`
  - Contatos `[lista → form]`
  - Endereços `[lista → form]` (CEP via ViaCEP preenche)
  - Documentos pessoais `[lista → form + anexo]` (CPF, RG, Título, Passaporte, outros)
  - Redes sociais pessoais `[lista → form]`
- **Profissional**
  - Dados profissionais `[form]`
  - Documentos profissionais `[lista → form]` (CANAC, Licenças CHT, Habilitações, CREA, CNH, outros)
  - Redes sociais profissionais `[lista → form]`
  - Currículo
    - Cursos `[lista → detalhe + certificado]`
    - Treinamentos `[lista → detalhe + certificado]`
    - Experiências `[lista → detalhe]` (dupla confirmação)
    - CMA `[lista → detalhe]`
    - CIV `[lista → lançamento → assinar → endosso → enviar ANAC]`
  - **Declarações de experiência** `[lista → solicitar → documento assinado (gerado do ledger)]`
  - Meu estoque (pessoal) `[lista → item → anunciar na RLoja]`
- **Empresarial**
  - Responsabilidades legais `[lista → documento assinado]`
  - Procurações `[lista → documento assinado]`
  - Minhas empresas `[lista]`
    - Detalhe da empresa `[detalhe: Dados | Funcionários | Assinaturas | Estoque da empresa | [timeline da assinatura]]`
- **Protocolo** `[lista → detalhe]`
- **Assinaturas** `[lista → detalhe → cancelar/reativar]`
- **Personalização** `[form: tema/fonte/cor]`
- **Segurança** — Senha `[form]` · Dispositivos `[lista → desconectar]` · 2FA `[form]`
- **Configurações** `[form: idioma/UTC/notificações]`

Padrão global da Shell: top bar com Central de Comunicação (Chat · Alertas · E-mails · Comunicados) + Tema (claro → escuro → personalizado); padrão de detalhe com abas `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`. **ValidationBadge** (N0–N3) ao lado de todo dado validável; **LedgerTimeline** abre o histórico de qualquer registro como filtro do ledger — nunca lista editável.

## 5. ENTIDADES PRINCIPAIS (schemas do Núcleo — verbatim da Parte 1 v2)

### 5.1 Módulo Pessoal (schema `identity`)
```sql
CREATE TABLE identity.person_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    contact_type VARCHAR(50) NOT NULL CHECK (contact_type IN ('EMAIL','TELEFONE','CELULAR','WHATSAPP','OUTRO')),
    value VARCHAR(255) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE'
      CHECK (validation_status IN ('PENDENTE','VALIDADO','REJEITADO')),
    validation_source VARCHAR(100), -- SISTEMA, GOV, RECEITA, CORREIOS, MANUAL
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, contact_type, value)
);

CREATE TABLE identity.person_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    address_type VARCHAR(50) NOT NULL CHECK (address_type IN ('RESIDENCIAL','COMERCIAL','COBRANCA','ENTREGA')),
    zip_code VARCHAR(8) NOT NULL,
    street VARCHAR(255) NOT NULL,
    number VARCHAR(20),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE'
      CHECK (validation_status IN ('PENDENTE','VALIDADO','REJEITADO')),
    validation_source VARCHAR(100),
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.person_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN
      ('RG','CNH','PASSAPORTE','CPF','TITULO_ELEITOR','COMPROVANTE_RESIDENCIA','CERTIDAO_NASCIMENTO','CERTIDAO_CASAMENTO','OUTRO')),
    document_number VARCHAR(100) NOT NULL,
    issuing_authority VARCHAR(100),
    issuing_state VARCHAR(2),
    issue_date DATE,
    expiration_date DATE,
    file_hash VARCHAR(64),
    storage_key VARCHAR(512),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE'
      CHECK (validation_status IN ('PENDENTE','VALIDADO','REJEITADO')),
    validation_source VARCHAR(100),
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.person_social_networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    network_type VARCHAR(50) NOT NULL CHECK (network_type IN ('LINKEDIN','INSTAGRAM','FACEBOOK','X','YOUTUBE','OUTRO')),
    profile_url VARCHAR(512) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, network_type)
);
```

### 5.2 Módulo Profissional — currículo, certificados (schema `professional`)
```sql
CREATE TABLE professional.professional_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    contact_type VARCHAR(50) NOT NULL CHECK (contact_type IN ('EMAIL','TELEFONE','CELULAR','OUTRO')),
    value VARCHAR(255) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE professional.professional_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN
      ('CANAC','LICENCA_CHT','HABILITACAO','CREA','CNH','CIV','OUTRO')),
    document_number VARCHAR(100) NOT NULL,
    issuing_authority VARCHAR(100),
    issue_date DATE,
    expiration_date DATE,
    file_hash VARCHAR(64),
    storage_key VARCHAR(512),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    validated_by UUID,
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE professional.professional_social_networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    network_type VARCHAR(50) NOT NULL,
    profile_url VARCHAR(512) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE professional.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    course_type VARCHAR(50) NOT NULL, -- PP, PC, PLA, IFR, COMISSARIO, MMA, DOV, INSTRUTOR, EXAMINADOR
    course_name VARCHAR(255) NOT NULL,
    institution VARCHAR(255),
    institution_certificate VARCHAR(100),
    start_date DATE,
    end_date DATE,
    workload_hours NUMERIC(10,2),
    certificate_file_hash VARCHAR(64),
    certificate_storage_key VARCHAR(512),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE'
      CHECK (validation_status IN ('PENDENTE','SISTEMA','OFICIAL','AUTENTICO')),
    validated_by UUID,
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE professional.trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    training_type VARCHAR(50) NOT NULL, -- TREINAMENTO_PERIODICO, RECORRENCIA, FATORES_HUMANOS, UPRT, ETOPS, PTO, LOFT
    training_name VARCHAR(255) NOT NULL,
    provider VARCHAR(255),
    start_date DATE,
    end_date DATE,
    validity_date DATE,
    certificate_file_hash VARCHAR(64),
    certificate_storage_key VARCHAR(512),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    validated_by UUID,
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE professional.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    certificate_type VARCHAR(50) NOT NULL, -- LICENCA, HABILITACAO, CMA, CREDENCIAMENTO, CERTIFICADO_CURSO
    certificate_name VARCHAR(255) NOT NULL,
    certificate_number VARCHAR(100),
    issuing_authority VARCHAR(255),
    issue_date DATE,
    expiration_date DATE,
    file_hash VARCHAR(64),
    storage_key VARCHAR(512),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    validated_by UUID,
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.3 CIV — Caderneta Individual de Voo (RBAC 61 / IS 61-001G)
```sql
CREATE TABLE professional.flight_log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id), -- piloto dono do registro
    entry_type VARCHAR(20) NOT NULL, -- flight, ground_run, simulador
    entry_date DATE NOT NULL,
    departure_aerodrome VARCHAR(10),
    arrival_aerodrome VARCHAR(10),
    takeoff_time TIMESTAMPTZ,
    landing_time TIMESTAMPTZ,
    flight_time_hours DECIMAL(15,2) NOT NULL,
    pousos INTEGER DEFAULT 1 NOT NULL,
    diurno DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    noturno DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    navegacao DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    instrumento DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    capota DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    simulador DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    milhas_navegacao DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    aircraft_registration VARCHAR(10),
    aircraft_model VARCHAR(50),
    habilitacao VARCHAR(10) NOT NULL, -- IFRA, MLTE, MNTE, IFRH
    funcao VARCHAR(10) NOT NULL, -- PIC, SIC, INSTR, INSP
    instructor_user_id UUID REFERENCES identity.users(id),
    tpx BOOLEAN DEFAULT FALSE NOT NULL,
    experimental BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed','rectified','voided')),
    signature_timestamp TIMESTAMPTZ,
    signature_identity VARCHAR(255),
    signature_verified BOOLEAN DEFAULT FALSE NOT NULL,
    attestation_text TEXT,
    endossado BOOLEAN DEFAULT FALSE NOT NULL,
    endossado_por UUID,
    endossado_em TIMESTAMPTZ,
    civ_sent_anac BOOLEAN DEFAULT FALSE NOT NULL,
    civ_sent_anac_at TIMESTAMPTZ,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    validated_by UUID,
    validated_at TIMESTAMPTZ,
    content_hash VARCHAR(64),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.4 CMA — Certificado Médico Aeronáutico (RBAC 67)
```sql
CREATE TABLE professional.medical_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    cma_class VARCHAR(20) NOT NULL CHECK (cma_class IN ('CLASSE_1','CLASSE_2','CLASSE_3')),
    cma_number VARCHAR(100),
    issuing_date DATE NOT NULL,
    validity_end DATE NOT NULL,
    restriction_code VARCHAR(255),
    file_hash VARCHAR(64),
    storage_key VARCHAR(512),
    status VARCHAR(50) NOT NULL DEFAULT 'VALIDO'
      CHECK (status IN ('VALIDO','VENCIDO','SUSPENSO','CASSADO')),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    validated_by UUID,
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.5 Vínculos de experiência profissional (pessoa ↔ empresa) — dupla confirmação mista
```sql
CREATE TABLE professional.work_experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    role VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    initiated_by VARCHAR(20) NOT NULL CHECK (initiated_by IN ('PESSOA','EMPRESA')),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE_PESSOA'
      CHECK (status IN ('PENDENTE_PESSOA','PENDENTE_EMPRESA','ATIVO','REJEITADO','ENCERRADO')),
    confirmed_by_person BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_by_person_at TIMESTAMPTZ,
    confirmed_by_company BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_by_company_at TIMESTAMPTZ,
    confirmed_by_company_user UUID,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.6 Declarações automáticas de experiência
```sql
CREATE TABLE professional.experience_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_experience_id UUID NOT NULL REFERENCES professional.work_experiences(id),
    requested_by UUID NOT NULL REFERENCES identity.users(id),
    request_origin VARCHAR(20) NOT NULL CHECK (request_origin IN ('FUNCIONARIO','DESLIGAMENTO_EMPRESA')),
    statement_document_id UUID, -- documento estruturado assinado (Parte 01 — Núcleo)
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.7 Módulo Empresarial — vínculos com empresas (schema `identity`)
```sql
CREATE TABLE identity.company_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    binding_type VARCHAR(50) NOT NULL
      CHECK (binding_type IN ('RESPONSAVEL_LEGAL','PROCURADOR','FUNCIONARIO')),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING','APPROVED','REJECTED','REVOKED')),
    initiated_by VARCHAR(20) NOT NULL CHECK (initiated_by IN ('PESSOA','EMPRESA')),
    confirmed_by_person BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_by_person_at TIMESTAMPTZ,
    confirmed_by_company BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_by_company_at TIMESTAMPTZ,
    confirmed_by_company_user UUID,
    binding_document_id UUID, -- documents.documents (Parte 01 — Núcleo)
    binding_signature_id UUID, -- signatures.signatures (Parte 01 — Núcleo)
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.8 Personalização e Segurança (schema `identity`)
```sql
CREATE TABLE identity.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES identity.users(id),
    theme_mode VARCHAR(20) NOT NULL DEFAULT 'LIGHT'
      CHECK (theme_mode IN ('LIGHT','DARK','CUSTOM')),
    font_family VARCHAR(100) NOT NULL DEFAULT 'DEFAULT',
    font_scale NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    background_color VARCHAR(20),
    language VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.security_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50), -- WEB, MOBILE, API
    user_agent TEXT,
    ip_address VARCHAR(45),
    last_seen_at TIMESTAMPTZ,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.security_settings (
    user_id UUID PRIMARY KEY REFERENCES identity.users(id),
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_method VARCHAR(20), -- TOTP_GOOGLE, SMS, EMAIL
    two_factor_secret_cipher VARCHAR(512), -- criptografado (nunca em claro)
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.9 Estoque e custódia (schema `stock` — Núcleo)
```sql
CREATE TABLE stock.company_stocks ( -- 1 estoque por empresa
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    custody VARCHAR(50) NOT NULL DEFAULT 'RCONTA'
      CHECK (custody IN ('RCONTA','RLOJA','ERP_OPERADORES','ERP_MANUTENCAO','ERP_CURSOS','ERP_AGRICOLA','ERP_AERODROMOS')),
    name VARCHAR(255) NOT NULL DEFAULT 'Estoque da Empresa',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock.personal_stock ( -- estoque pessoal (Profissional)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock.stock_custody_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL,
    stock_owner_type VARCHAR(20) NOT NULL CHECK (stock_owner_type IN ('COMPANY','PERSON')),
    from_custody VARCHAR(50) NOT NULL,
    to_custody VARCHAR(50) NOT NULL,
    reason VARCHAR(50) NOT NULL
      CHECK (reason IN ('ERP_CONTRACTED','ERP_SUSPENDED','ERP_CANCELLED','ERP_REACTIVATED','REGULARIZED','RLOJA_TO_ERP','ERLOJA_CREATED')),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock.stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL,
    stock_owner_type VARCHAR(20) NOT NULL CHECK (stock_owner_type IN ('COMPANY','PERSON')),
    catalog_item_id UUID NOT NULL, -- item do catálogo do Núcleo (fonte da verdade)
    origin_erp VARCHAR(50), -- preenchido quando o item veio de um ERP/RLoja (rastreabilidade)
    origin_erp_stock_label VARCHAR(255),
    serial_number VARCHAR(100),
    condition VARCHAR(50) NOT NULL DEFAULT 'NOVO',
    tag VARCHAR(50) NOT NULL DEFAULT 'VERDE_SERVICAVEL',
    quantity NUMERIC(15,2) NOT NULL DEFAULT 1,
    unit VARCHAR(10) NOT NULL DEFAULT 'UN',
    status VARCHAR(50) NOT NULL DEFAULT 'EM_ESTOQUE'
      CHECK (status IN ('EM_ESTOQUE','QUARENTENA','RESERVADO','INSTALADO','VENDIDO','DESCARTADO')),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 6. REGRAS DE NEGÓCIO OBRIGATÓRIAS

### 6.1 Módulo Pessoal
1. Múltiplos contatos, endereços, documentos e redes sociais por pessoa — sem duplicação.
2. Um contato/endereço marcado como **principal** por tipo.
3. Toda validação/criação gera bloco no ledger (com `origin_app`).
4. Dados pessoais exibidos com **ValidationBadge** conforme o nível.
5. **Editável pela Rconta, RLoja (dados de compra) e Recrutamento (perfil)** — mesmo cadastro no núcleo.

### 6.2 Módulo Profissional
1. Curso/treinamento/certificado/vínculo/CIV/CMA/declaração são criados **no núcleo** — nenhum app cria cadastro próprio.
2. **Editável pela Rconta E pelo Recrutamento** (perfil profissional completo) — origem no ledger.
3. Certificado anexado gera hash SHA-256 e é armazenado no MinIO.
4. Validação em níveis N0–N3; nada é bloqueado por falta de validação.
5. Lançamento na CIV exige **assinatura do piloto**; voo de instrução exige **endosso do instrutor**; correção gera `rectified`; cancelamento gera `voided`.
6. O evento `FLIGHT_CLOSED` do ERP pode **pré-preencher rascunho** na CIV — só vira registro assinado após confirmação do piloto.
7. Toda criação/validação/rejeição gera bloco no ledger.
8. **Declaração de experiência:** é **direito do trabalhador** ter a declaração de que exerceu o cargo/função pelo período X — a pedido dele ou quando a empresa encerra o vínculo. Documento estruturado, assinado, gerado do histórico de vínculo do núcleo e ancorado no ledger. Solicitável pela Rconta **ou** pelo Recrutamento.

### 6.3 Módulo Empresarial
1. Lista as empresas em que a pessoa tem **responsabilidade legal**, **procuração** ou **vínculo de funcionário**.
2. **Documento digital assinado** para cada responsabilidade/procuração aprovada.
3. Ao clicar na empresa: cadastro completo + **[timeline da assinatura]** (histórico desde a compra; congelado e legível por 5 anos após encerramento).
4. **1 estoque por empresa** (ver 6.5).
5. Aprovação de vínculo: **dupla confirmação**; pendente é exibido sem selo.

### 6.4 Módulos Protocolo, Assinaturas, Personalização e Segurança
1. **Protocolo:** `AAAA-NNNNNN` (Resolução 520/2019) — detalhes na Parte 01 (Núcleo — Protocolo) do serviço central; a Rconta apenas lista e detalha.
2. **Assinaturas — lista (v2, sem "Recrutamento" como produto):** Rconta VIP · Assinatura de Vagas · ERP Manutenção · ERP Operadores · ERP Cursos · ERP Agrícola · ERP Aeródromos · Publicações. Detalhe (plano, início, renovação, faturas) + **Cancelar/Reativar**.
3. Cancelamento/suspensão → migração de custódia do estoque de volta à Rconta (evento no ledger). Regularização → o sistema pergunta se restaura os estoques.
4. **Personalização:** ícone de tema alterna a cada clique — **claro → escuro → personalizado → claro**.
5. **Segurança:** senha alterável; cada troca **desconecta os dispositivos**. Dispositivos: lista com sessão ativa; desconectar individual ou todos. 2FA: TOTP (Google Authenticator), SMS ou e-mail; secret sempre cifrado.

### 6.5 Estoque no Núcleo e custódia (bidirecional RLoja ↔ ERP)
1. **Origens do estoque (v2):** estoque **pessoal** (Profissional) — da pessoa física; gratuito; pode anunciar na RLoja **sem comprar nada**. Estoque **empresarial** (Empresarial) — **1 estoque por empresa**. **Estoque criado na RLoja (v2)** — empresa sem assinatura cria estoque com perfil privado na RLoja; ao contratar ERP, as lojas ativas/inativas **viram estoque no ERP** automaticamente (evento de custódia no ledger).
2. **Catálogo único** no núcleo — Rconta, RLoja e ERPs inserem/buscam nele, nunca em catálogos paralelos.
3. **Custódia com ERP contratado:** o estoque empresarial **migra para o ERP** (evento no ledger).
4. **Suspensão/cancelamento:** estoque volta à Rconta (Empresarial) como **UM único estoque**, com marcação de origem por item (`origin_erp`, `origin_erp_stock_label`).
5. **Fluxo de restauração do estoque residual:** ERP suspenso/cancelado → custódia volta à Rconta como um único estoque; itens **vendidos** durante a vigência **não voltam**; ao regularizar/reativar, o sistema **pergunta**: *"Restaurar os estoques como estavam antes?"* — **Sim** → remanescentes retornam às posições originais; **Não** → permanece o estoque único na Rconta.
6. O cadastro do produto **nunca** fica no ERP nem na RLoja — fica no núcleo (Catálogo + Estoque).

## 7. ENDPOINTS DA API (resumo — consumidos via `api.vortex.com`)

- `GET/POST/PUT /identity/me/contacts` · `/identity/me/addresses` · `/identity/me/documents` · `/identity/me/social-networks` — módulo Pessoal (ViaCEP preenche endereço).
- `GET/POST/PUT /professional/me/documents` · `/professional/me/courses` · `/professional/me/trainings` · `/professional/me/certificates` — módulo Profissional.
- `POST /professional/me/flight-log-entries` · `POST /professional/me/flight-log-entries/:id/sign` · `:id/endorse` · `:id/rectify` · `:id/void` · `:id/send-anac` — CIV.
- `GET/POST /professional/me/medical-certificates` — CMA.
- `GET/POST /professional/me/work-experiences` · `POST /professional/me/work-experiences/:id/confirm` — vínculos (dupla confirmação).
- `POST /professional/me/experience-statements` — solicitar declaração de experiência.
- `GET /identity/me/company-bindings` · `POST /identity/me/company-bindings/:id/confirm` — módulo Empresarial.
- `GET /protocol/me` — Módulo Protocolo (lista/detalhe AAAA-NNNNNN).
- `GET /subscriptions/me` · `POST /subscriptions/me/:id/cancel` · `:id/reactivate` — Módulo Assinaturas.
- `GET/PUT /identity/me/preferences` — Personalização.
- `PUT /auth/me/password` · `GET/DELETE /auth/me/devices` · `POST /auth/me/2fa` — Segurança.
- `GET/POST /stock/personal` · `/stock/personal/items` · `POST /stock/personal/items/:id/list` — estoque pessoal → anunciar na RLoja.
- Todas as rotas de escrita exigem `Idempotency-Key`; resposta sempre `{ success, data, error }`.

## 8. FRONTEND ANGULAR (feature-lib `feature-rconta`)

1. Componentes **standalone** com **signals** + **OnPush** — sem `NgModule`.
2. Injeção com **`inject()`** — construtor de DI proibido em código novo.
3. Controle de fluxo **`@if`/`@for`/`@switch`** — `*ngIf`/`*ngFor` proibidos em código novo.
4. `input()`/`output()` function-based; formulários reativos **tipados** (`NonNullableFormBuilder`).
5. Estado de componente com signals; estado complexo local com NgRx ComponentStore.
6. Chamadas HTTP via services com `inject(HttpClient)`; interceptors em `libs/core` (token, erro padrão `{success,data,error}`, idempotency-key).
7. Toda tela de escrita valida permissão no backend; guards/hides são UX.
8. Histórico sempre via **LedgerTimeline** (nunca lista editável).
9. **ValidationBadge** (selos ⚪ N0 / 🟡 N1 / 🟢 N2 / 🔵 N3) ao lado de dados validáveis.
10. **BannerAd** exibido apenas para Rconta grátis (condição lida da assinatura no núcleo); VIP ou compra de ERP remove apenas na Rconta do comprador.
11. **SeletorDeTema** — claro → escuro → personalizado (alterna a cada clique).
12. Feature-lib `feature-rconta` importa apenas `shared-dto`, `ui`, `core` e `util-*` (module boundaries).

## 9. TESTES OBRIGATÓRIOS

1. Teste de MDM: uma pessoa = um perfil; sem duplicação.
2. Teste de dados cadastrais: múltiplos contatos/endereços/documentos/redes sociais por pessoa; um principal por tipo.
3. Teste de validação em níveis: dado sem validação é exibido (sem selo); N1/N2/N3 elevam o selo; nada bloqueia.
4. Teste de CPF/CNPJ: dígito verificador; inválido rejeitado.
5. Teste de CEP: ViaCEP preenche rua/bairro/cidade/UF; CEP inválido rejeitado.
6. Teste de módulo profissional: curso/treinamento/certificado no núcleo; anexo gera hash.
7. Teste de CIV: lançamento exige assinatura; instrução exige endosso; draft/signed/rectified/voided.
8. Teste de CMA: vencido ou classe inadequada bloqueia despacho; alerta 30 dias.
9. Teste de vínculo misto: pessoa inicia → empresa aprova → ATIVO; empresa inicia → pessoa confirma → ATIVO; pendente sem selo.
10. Teste de declaração de experiência: solicitada pelo funcionário OU gerada no desligamento; documento assinado.
11. Teste de módulo empresarial: documento digital assinado de responsabilidade/procuração aprovada.
12. Teste de estoque pessoal: pessoa com Rconta grátis cria estoque e anuncia sem assinatura.
13. Teste de estoque empresarial: 1 estoque por empresa.
14. Teste de estoque criado na RLoja: migra ao ERP ao contratar (evento de custódia no ledger).
15. Teste de custódia: contratar ERP migra custódia (evento no ledger); retorno como estoque único com marcação de origem.
16. Teste de restauração: regularização pergunta e restaura posições originais; itens vendidos não voltam.
17. Teste de multi-app de escrita: currículo editado pela Rconta E pelo Recrutamento → mesmo cadastro no núcleo, `origin_app` diferente no ledger.
18. Teste de personalização: claro → escuro → personalizado alternando a cada clique.
19. Teste de segurança: troca de senha desconecta dispositivos; 2FA TOTP funcional.
20. Teste de banners: Rconta grátis com banners; VIP/ERP remove apenas na Rconta do comprador.
21. Teste de idempotency: retry não duplica. Teste de padrão de resposta: 100% das rotas em `{ success, data, error }`.

## 10. CRITÉRIOS DE ACEITE

- [ ] Rconta com **7 módulos + 2 menus** implementados (consumindo o núcleo — sem banco próprio).
- [ ] Módulo Pessoal: dados cadastrais completos com validação N0–N3 (contatos, endereços, documentos, redes sociais).
- [ ] Módulo Profissional: currículo, CIV, CMA, certificados, **declarações de experiência** e **estoque pessoal**.
- [ ] Módulo Empresarial: responsáveis, procuradores, empresas vinculadas, documentos assinados, **1 estoque por empresa**, timeline da assinatura.
- [ ] Módulos Protocolo, Assinaturas (v2: sem Recrutamento como produto), Personalização e Segurança implementados.
- [ ] Estoque com catálogo único, custódia ERP ↔ Rconta ↔ RLoja e fluxo de restauração.
- [ ] Toda escrita registra `origin_app = RCONTA` no ledger; histórico exibido só via LedgerTimeline.
- [ ] ValidationBadge e BannerAd conforme assinatura; temas claro/escuro/personalizado.
- [ ] Testes de aceite passando; lacunas listadas.

## 11. MAPA DE MÓDULOS (decomposição futura em pedaços menores)

| Módulo | Seções previstas |
|--------|------------------|
| **02.1 — Dashboard e Configurações** | 1. Widgets por módulo · 2. Pendências de validação · 3. Vínculos pendentes · 4. Alertas · 5. Configurações (idioma, UTC, notificações) |
| **02.2 — Módulo Pessoal** | 1. Meus dados · 2. Contatos · 3. Endereços (ViaCEP) · 4. Documentos pessoais · 5. Redes sociais pessoais · 6. Validação N0–N3 e ValidationBadge |
| **02.3 — Módulo Profissional: cadastro** | 1. Dados profissionais · 2. Documentos profissionais (CANAC, CHT, habilitações, CREA, CNH) · 3. Redes sociais profissionais |
| **02.4 — Módulo Profissional: currículo** | 1. Cursos · 2. Treinamentos · 3. Experiências (dupla confirmação) · 4. Certificados (hash + MinIO) |
| **02.5 — CIV (Caderneta Individual de Voo)** | 1. Lançamento · 2. Assinatura do piloto · 3. Endosso do instrutor · 4. Estados draft/signed/rectified/voided · 5. Envio ANAC · 6. Pré-preenchimento por FLIGHT_CLOSED |
| **02.6 — CMA e declarações** | 1. CMA (classes, validade, restrições, SACI) · 2. Declarações de experiência (solicitar → documento assinado) |
| **02.7 — Módulo Empresarial** | 1. Responsabilidades legais · 2. Procurações · 3. Minhas empresas · 4. Detalhe da empresa (Dados/Funcionários/Assinaturas/Estoque/timeline) · 5. Documentos assinados de vínculo |
| **02.8 — Estoque e custódia** | 1. Estoque pessoal · 2. Estoque empresarial (1 por empresa) · 3. Custódia Rconta ↔ RLoja ↔ ERP · 4. Fluxo de restauração · 5. Anunciar na RLoja |
| **02.9 — Protocolo e Assinaturas** | 1. Protocolo AAAA-NNNNNN (lista/detalhe) · 2. Lista de assinaturas (8 produtos v2) · 3. Detalhe/cancelar/reativar · 4. Efeitos de cancelamento na custódia |
| **02.10 — Personalização e Segurança** | 1. Tema claro → escuro → personalizado · 2. Fonte/tamanho/cor de fundo · 3. Senha e dispositivos · 4. 2FA (TOTP/SMS/e-mail) · 5. Banners (grátis vs VIP) |

## 12. FONTES v2

- `artifacts/vortex-v2/docs/prompts/parte-1.md` — §§9–14 (Rconta 7+2, módulos Pessoal/Profissional/Empresarial, Protocolo/Assinaturas/Personalização/Segurança, estoque e custódia), §18 (padrões Angular), §§19–20 (testes e critérios de aceite).
- `artifacts/vortex-v2/docs/10-navegacao-por-app.md` — seção 2 (menu Rconta nível-clique) e seção 15 (regras de navegação).
- `artifacts/vortex-v2/docs/00-visao-geral.md` — seções 3, 5, 8, 9, 10 (Rconta 7+2, validação N0–N3, modelo de negócio, estoque/custódia).
- `artifacts/vortex-v2/CLAUDE.md` — seções 3 (princípios), 8 (regras de engenharia), 9 (Design System), 11 (tabela de apps).
