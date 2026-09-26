# VORTEX — PARTE 2/10 (v2): LEDGER IMUTÁVEL COM CONTEÚDO CIFRADO, PROTOCOLO ELETRÔNICO E TRILHA DE AUDITORIA

> **Versão 2 — 12/09/2026.** Reformulada: o ledger é a **linha do tempo com conteúdo** (payload completo: quem/papel, início, fim, o quê, app de origem), **cifrado em repouso** (AES-256-GCM por tenant), com **acesso governado** (zero-trust, concessões, App ANAC, segredo de justiça — contrato seção 5-A) e **restauração reconciliada** (5-A.6).
> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em integridade criptográfica, registros eletrônicos imutáveis, criptografia de dados em repouso, conformidade regulatória (Resolução ANAC nº 458/2017 e nº 520/2019) e trilhas de auditoria. Construa o motor de Ledger, o serviço de Protocolo Eletrônico e a Trilha de Auditoria do ecossistema VORTEX conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, migrações SQL, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 2

Entregar quatro capacidades fundamentais de integridade:
1. **Ledger Imutável (append-only) com conteúdo** — razão criptográfico encadeado que registra todo evento relevante **com o conteúdo completo do que aconteceu**, em conformidade com a **Resolução ANAC nº 458/2017**.
2. **Criptografia e acesso governado** — payload cifrado em repouso; descriptografia apenas sob concessão (dono, suporte por protocolo, auditoria consentida/compulsória, justiça); todo o ciclo auditado por meta-eventos.
3. **Protocolo Eletrônico** — geração e rastreio de protocolos no formato `AAAA-NNNNNN` (Resolução ANAC nº 520/2019).
4. **Trilha de Auditoria** — consulta auditável e verificável de qualquer evento, com verificação de integridade da cadeia e **restauração reconciliada com backup**.

> **Aderência à arquitetura central:** o Ledger é o **vergalhão central** do ecossistema. Nenhum aplicativo armazena histórico próprio — todos **exibem filtros projetados do Ledger**. O payload contém o conteúdo completo do evento (o ledger É a linha do tempo); a `origin_app` identifica o aplicativo que gerou o evento.

## 2. PRINCÍPIOS DE INTEGRIDADE (IMUTÁVEIS)

1. **Append-only:** o Ledger só aceita INSERT. UPDATE e DELETE são bloqueados por trigger no banco.
2. **Encadeamento criptográfico:** cada bloco contém o hash do bloco anterior (`previous_hash`), formando uma cadeia contínua.
3. **Assinatura assimétrica:** cada bloco é assinado com chave privada Ed25519; a verificação usa a chave pública correspondente.
4. **Hash de conteúdo:** o `content_hash` é calculado sobre o **payload em claro canônico** (antes da cifra) — a integridade é verificável sem descriptografar.
5. **Payload cifrado em repouso:** o conteúdo do evento é cifrado com **AES-256-GCM** usando chave de dados por tenant (envelope encryption). **Os administradores NÃO detêm as chaves de dados dos tenants.**
6. **Zero-trust ("administrar sem ver"):** ninguém acessa conteúdo por padrão — nem administradores da plataforma. Acesso apenas via concessão ativa (seção 5).
7. **Não repúdio:** o autor do evento (`user_id` + `actor_role`), o tenant, a empresa e o **app de origem** (`origin_app`) são registrados em metadados em claro (fora do payload cifrado).
8. **Verificação contínua:** job periódico percorre a cadeia e valida hashes e assinaturas; inconsistência gera alerta CRITICAL/BLOCKING e aciona o fluxo de restauração (seção 8).
9. **Apps nunca duplicam histórico:** o histórico exibido em qualquer tela é uma projeção (filtro) do Ledger — via **LedgerTimeline**.

## 3. FUNDAMENTAÇÃO REGULATÓRIA

- **Resolução ANAC nº 458/2017:** dispõe sobre o uso de sistemas computadorizados para guarda e emissão de registros aeronáuticos, exigindo integridade, autenticidade e imutabilidade dos registros eletrônicos.
- **Resolução ANAC nº 520/2019:** institui o protocolo eletrônico de documentos, com formato de numeração sequencial anual.
- **Lei nº 12.965/2014 (Marco Civil) e LGPD (Lei nº 13.709/2018):** requisitos de segurança, rastreabilidade e proteção de dados nos registros.

## 4. ENTIDADES DO LEDGER (schema `ledger`)

```sql
-- SCHEMA: ledger
CREATE SCHEMA IF NOT EXISTS ledger;

CREATE TABLE ledger.ledger_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_index BIGSERIAL NOT NULL,               -- índice sequencial global
    previous_hash VARCHAR(64) NOT NULL,           -- hash SHA-256 do bloco anterior
    current_hash VARCHAR(64) NOT NULL,            -- hash SHA-256 deste bloco (sobre payload em claro)
    signature VARCHAR(128) NOT NULL,              -- assinatura Ed25519 (hex)
    public_key VARCHAR(64) NOT NULL,              -- chave pública Ed25519 (hex)
    tenant_id UUID NOT NULL,                      -- metadado em claro (indexável)
    company_id UUID,                              -- metadado em claro (indexável)
    user_id UUID NOT NULL,                        -- autor do evento (metadado em claro)
    actor_role VARCHAR(50) NOT NULL,              -- papel do autor: ADMIN, USER, COMPANY, VENDEDOR, COMPRADOR, AUDITOR, SISTEMA
    origin_app VARCHAR(50) NOT NULL,              -- app de origem: RCONTA, RECRUTAMENTO, RLOJA, ERP_*, TRAVEL, CHARTER, CERTPUB, ANAC, NUCLEO
    action VARCHAR(100) NOT NULL,                 -- ação de domínio (ex.: WORK_ORDER_CREATED)
    entity_name VARCHAR(100) NOT NULL,            -- entidade afetada (ex.: mro.work_orders)
    entity_id UUID NOT NULL,                      -- id da entidade afetada
    payload_ciphertext BYTEA NOT NULL,            -- conteúdo do evento CIFRADO (AES-256-GCM)
    payload_nonce BYTEA NOT NULL,                 -- nonce/IV do AES-GCM
    payload_key_id VARCHAR(100) NOT NULL,         -- referência à chave de dados do tenant (envelope)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de consulta (leitura por entidade/tenant/ação — metadados em claro)
CREATE INDEX idx_ledger_entity ON ledger.ledger_blocks (entity_name, entity_id);
CREATE INDEX idx_ledger_tenant ON ledger.ledger_blocks (tenant_id, created_at);
CREATE INDEX idx_ledger_action ON ledger.ledger_blocks (action, created_at);
CREATE INDEX idx_ledger_origin_app ON ledger.ledger_blocks (origin_app, created_at);
CREATE INDEX idx_ledger_block_index ON ledger.ledger_blocks (block_index);

-- Trigger de imutabilidade (bloqueia UPDATE e DELETE)
CREATE OR REPLACE FUNCTION ledger.prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'VIOLAÇÃO REGULATÓRIA: Registros do Ledger são estritamente imutáveis (Res. ANAC 458/2017). Operação negada.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_immutability
BEFORE UPDATE OR DELETE ON ledger.ledger_blocks
FOR EACH ROW EXECUTE FUNCTION ledger.prevent_mutation();
```

### 4.1 Cálculo do hash do bloco (regra de negócio)
O `current_hash` é calculado sobre a concatenação canônica de: `block_index`, `previous_hash`, `tenant_id`, `company_id`, `user_id`, `actor_role`, `origin_app`, `action`, `entity_name`, `entity_id`, **payload em claro (JSON canônico serializado, chaves ordenadas)** e `created_at`. O resultado é SHA-256 em hex. A assinatura Ed25519 é aplicada sobre esse hash com a chave privada do serviço de ledger. **O hash é sempre sobre o payload em claro — a cifra não interfere na integridade.**

### 4.2 Fluxo de escrita (append)
1. Serviço de domínio chama `ledger-service` com o evento estruturado (payload em claro + metadados).
2. O serviço valida permissão (RBAC/ABAC) e a existência do autor.
3. Calcula `content_hash` sobre o payload em claro canônico; assina com Ed25519.
4. Cifra o payload com a chave de dados do tenant (AES-256-GCM, envelope) e insere o bloco (append-only).
5. Retorna o `block_id`.
6. Publica o evento no bus (RabbitMQ) para os consumidores reativos (espelhos).
7. Se aplicável, gera o protocolo (ver seção 6).

## 5. ACESSO GOVERNADO AO CONTEÚDO (zero-trust — contrato seção 5-A)

### 5.1 Entidade de concessões
```sql
CREATE TABLE ledger.access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    grant_type VARCHAR(50) NOT NULL
      CHECK (grant_type IN ('DONO','SUPORTE_PROTOCOLO','AUDITORIA_CONSENTIDA','AUDITORIA_COMPULSORIA','JUSTICA')),
    granted_by UUID NOT NULL,             -- quem autorizou (dono, admin, sistema)
    granted_to UUID NOT NULL,             -- quem acessa (usuário, auditor, admin)
    protocol_number VARCHAR(20),          -- obrigatório para SUPORTE_PROTOCOLO
    scope_filter JSONB NOT NULL,          -- escopo mínimo: entity_name, entity_id, tenant, período
    read_only BOOLEAN NOT NULL DEFAULT TRUE,
    confidential BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE para segredo de justiça
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE','EXPIRED','REVOKED')),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meta-eventos do ciclo de acesso (blocos no próprio ledger)
-- Ações: ACCESS_REQUESTED, ACCESS_GRANTED, ACCESS_VIEWED, ACCESS_EXPIRED, ACCESS_REVOKED,
--        SYSTEM_RESTORED, AUDIT_SUSPENSION_APPLIED
```

### 5.2 Regras de acesso
1. **DONO:** o dono do dado acessa seus filtros (cadastro pessoal/profissional, documentos, currículo, empregos, configurações, ERPs com vínculo) enquanto durar o vínculo — descriptografia transparente mediada por permissão.
2. **SUPORTE_PROTOCOLO:** administrador descriptografa **apenas com protocolo do próprio dono** informado na concessão; escopo mínimo; concessão temporária; dono notificado; proprietários do VORTEX revisam o relatório de todas as descriptografias administrativas.
3. **AUDITORIA_CONSENTIDA / AUDITORIA_COMPULSORIA:** via **App ANAC**; consentida primeiro; recusa → ANAC pode suspender certificação (empresa/aeronave) e emitir compulsória; **somente leitura**; **somente o solicitante vê**; auditado notificado (exceto segredo de justiça).
4. **JUSTICA (segredo de justiça):** concessão `confidential=TRUE`; visível apenas ao admin autorizador + proprietários; **meta-eventos confidenciais** (não aparecem para os demais admins); auditado não notificado enquanto durar o segredo.
5. **Cessação:** toda concessão expira automaticamente (`expires_at`) ou é revogada; encerrado o acesso, o filtro volta cifrado.
6. **Execução às cegas (suporte):** para operações comuns de suporte (ex.: correção de cadastro), a concessão é escopada a um campo/operação — o admin executa sem navegar livremente pelo ledger do cliente.
7. **Chaves de dados por tenant** em envelope encryption (chave-mestra em secret manager); **nenhum admin detém chaves de tenant**; a única via de descriptografia é o serviço de concessão.

## 6. PROTOCOLO ELETRÔNICO (schema `protocol`)

```sql
-- SCHEMA: protocol
CREATE SCHEMA IF NOT EXISTS protocol;

CREATE TABLE protocol.protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    sequence_number INT NOT NULL,
    formatted_protocol VARCHAR(20) NOT NULL UNIQUE, -- AAAA-NNNNNN (gerado pelo serviço)
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    subject VARCHAR(255) NOT NULL,
    entity_name VARCHAR(100),
    entity_id UUID,
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_protocol_tenant ON protocol.protocols (tenant_id, created_at);
CREATE INDEX idx_protocol_entity ON protocol.protocols (entity_name, entity_id);
```

### 6.1 Regras do protocolo
1. Numeração sequencial **por ano** no formato `AAAA-NNNNNN` (ex.: `2026-000001`).
2. A sequência reinicia a cada ano (o `sequence_number` é combinado com `protocol_year`).
3. Geração **atômica** (sem corrida): `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` sobre contador por ano.
4. Todo protocolo está **ancorado em um bloco do Ledger** (`ledger_block_id`) — o protocolo é a "capa" pública de um evento imutável.
5. Protocolo é imutável: correções geram novo protocolo vinculado ao anterior.
6. O protocolo é exibido em toda comunicação oficial e é a referência exigida nas concessões de suporte (5.2.2).

## 7. TRILHA DE AUDITORIA (serviço de consulta)

### 7.1 Conceito
- A Trilha de Auditoria é uma **projeção de leitura** do Ledger — nunca um armazenamento duplicado.
- Qualquer tela de qualquer app consulta o histórico de uma entidade (`entity_name` + `entity_id`) via **LedgerTimeline**.
- A consulta valida a integridade da cadeia antes de retornar (hashes e assinaturas).
- O **conteúdo** (payload) só é descriptografado se o solicitante tiver concessão ativa cobrando aquele escopo — caso contrário, a timeline exibe apenas metadados (quem/papel, quando, ação, app de origem).

### 7.2 Verificação de integridade
```sql
-- Função que verifica a cadeia a partir de um bloco inicial
CREATE OR REPLACE FUNCTION ledger.verify_chain(from_index BIGINT, to_index BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    prev_hash VARCHAR(64) := '';
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT block_index, previous_hash, current_hash, signature, public_key
        FROM ledger.ledger_blocks
        WHERE block_index BETWEEN from_index AND to_index
        ORDER BY block_index
    LOOP
        IF rec.previous_hash <> prev_hash THEN
            RETURN FALSE;  -- quebra de encadeamento
        END IF;
        -- (a verificação da assinatura Ed25519 é feita no serviço de aplicação)
        prev_hash := rec.current_hash;
    END LOOP;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### 7.3 Endpoints da trilha
- `GET /api/v1/ledger/entity/:entityName/:entityId` — histórico completo de uma entidade (metadados; conteúdo conforme concessão).
- `GET /api/v1/ledger/tenant/:tenantId` — eventos de um tenant (paginado).
- `GET /api/v1/ledger/block/:blockId` — detalhe de um bloco.
- `GET /api/v1/ledger/verify` — verificação de integridade da cadeia.
- `GET /api/v1/ledger/verify/range?from=&to=` — verificação de um intervalo.
- `POST /api/v1/ledger/access-grants` — criar concessão (com validação do tipo).
- `POST /api/v1/ledger/access-grants/:id/revoke` — revogar concessão.
- `GET /api/v1/ledger/access-grants` — listar concessões (console do Núcleo).
- `GET /api/v1/protocols` — listar protocolos.
- `GET /api/v1/protocols/:formattedProtocol` — detalhe de um protocolo.

## 8. CONTINUIDADE: VERIFICAÇÃO E RESTAURAÇÃO (contrato 5-A.6)

1. **Job de verificação** a cada 6 horas (e sob demanda): valida hashes e assinaturas da cadeia; falha gera alerta CRITICAL/BLOCKING e identifica **exatamente onde** a cadeia rompeu.
2. **A cadeia detecta; o backup restaura:** o snapshot diário + WAL/PITR (fora do escopo desta parte — infraestrutura) devolve o conteúdo anterior à violação.
3. **Restauração reconciliada (anti-fraude):** restaurar backup NÃO pode apagar eventos já ocorridos. Procedimento:
   1. Restaurar o snapshot até o ponto anterior à violação.
   2. Revalidar os eventos posteriores ao ponto de restauração contra a cadeia de hashes (eventos íntegros são preservados; eventos corrompidos são descartados e re-emitidos pelos serviços de origem, se necessário).
   3. Gerar meta-evento `SYSTEM_RESTORED` no ledger (quem restaurou, quando, ponto de restauração, resultado da reconciliação).
4. **Teste de restauração** trimestral em ambiente isolado, com relatório.

## 9. REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. Nenhuma escrita de domínio é concluída sem gerar bloco no Ledger (regra 1 das 10 regras imutáveis).
2. UPDATE/DELETE no Ledger são bloqueados por trigger — qualquer tentativa gera exceção e log de segurança.
3. A verificação de integridade roda a cada 6 horas (job) e sob demanda; falha gera alerta CRITICAL/BLOCKING no Hub de Alertas.
4. Toda correção de um registro imutável é feita por **novo evento** (ex.: `WORK_ORDER_RECTIFIED`), nunca por edição do bloco original.
5. O protocolo é obrigatório para comunicações oficiais e processos regulatórios; sem protocolo, o evento não é "público".
6. A Trilha de Auditoria respeita RLS: usuário só vê eventos de tenants/empresas aos quais tem vínculo.
7. O payload é serializado em JSON canônico (chaves ordenadas) **antes** do hash e da cifra — hash determinístico.
8. A chave privada Ed25519 do ledger vive em secret manager (nunca em código ou `.env`).
9. As chaves de dados por tenant vivem no serviço de concessão — nunca nas mãos de administradores.
10. Todo acesso ao conteúdo descriptografado gera meta-evento (`ACCESS_VIEWED`) com quem, quando e escopo.

## 10. TESTES OBRIGATÓRIOS DA PARTE 2

1. Teste de imutabilidade: tentativa de UPDATE/DELETE em `ledger_blocks` é rejeitada (trigger).
2. Teste de encadeamento: alterar um bloco intermediário quebra a verificação da cadeia.
3. Teste de assinatura: bloco com assinatura inválida é detectado na verificação.
4. Teste de append: novo bloco referencia o `previous_hash` do último bloco.
5. Teste de hash sobre payload em claro: cifra não altera o `content_hash`.
6. Teste de cifra: payload em repouso é ilegível sem a chave de dados do tenant.
7. Teste de concessão DONO: dono lê o conteúdo; sem vínculo, sem acesso.
8. Teste de SUPORTE_PROTOCOLO: sem protocolo, concessão rejeitada; com protocolo, escopo mínimo e dono notificado.
9. Teste de AUDITORIA: consentida → acesso; recusa → suspensão registrada + compulsória possível; auditor somente-leitura; só o solicitante vê.
10. Teste de segredo de justiça: concessão confidential esconde meta-eventos dos demais admins; sem notificação ao auditado.
11. Teste de cessação: concessão expirada/revogada → conteúdo volta cifrado; meta-evento gerado.
12. Teste de meta-eventos: todo ciclo de acesso gera ACCESS_REQUESTED/GRANTED/VIEWED/EXPIRED/REVOKED.
13. Teste de protocolo: formato `AAAA-NNNNNN` correto; sequência reinicia por ano; geração atômica sem corrida.
14. Teste de ancoragem: todo protocolo tem `ledger_block_id` válido.
15. Teste de trilha: consulta de histórico retorna apenas eventos do tenant (RLS); conteúdo só com concessão.
16. Teste de verificação: `verify_chain` retorna TRUE para cadeia íntegra e FALSE para corrompida.
17. Teste de idempotência: o mesmo evento não gera bloco duplicado (Idempotency-Key).
18. Teste de não duplicação: nenhum app cria tabela de histórico paralela ao Ledger.
19. Teste de restauração reconciliada: eventos posteriores ao ponto de restauração são revalidados; `SYSTEM_RESTORED` gerado.
20. Teste de origin_app: escrita pela Rconta e pelo Recrutamento produzem blocos com `origin_app` distintos para o mesmo cadastro.

## 11. CRITÉRIOS DE ACEITE DA PARTE 2

- [ ] Schema `ledger` com `ledger_blocks` (payload cifrado, metadados em claro), índices e trigger de imutabilidade.
- [ ] Schema `ledger.access_grants` com os 5 tipos de concessão + meta-eventos do ciclo de acesso.
- [ ] Cifra AES-256-GCM por tenant (envelope) com hash sobre payload em claro.
- [ ] Schema `protocol` com sequência anual atômica e formato `AAAA-NNNNNN`.
- [ ] Serviço `ledger-service` com append, hashing, assinatura Ed25519, cifra e verificação.
- [ ] Serviço de concessão (única via de descriptografia; chaves de tenant fora das mãos de admins).
- [ ] Trilha de Auditoria como projeção de leitura (metadados públicos; conteúdo conforme concessão), com RLS.
- [ ] Job de verificação a cada 6 horas + fluxo de restauração reconciliada (`SYSTEM_RESTORED`).
- [ ] Testes de aceite passando; lacunas listadas.
