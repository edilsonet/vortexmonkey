# VORTEX — PARTE 2/8: LEDGER IMUTÁVEL, PROTOCOLO ELETRÔNICO E AUDITORIA

> Instrução ao agente de código: você é um engenheiro de software sênior especialista em sistemas de registro distribuído imutável, criptografia, protocolo eletrônico e conformidade regulatória (Resolução ANAC 458/2017, IS 43.9-004, Resolução 520/2019). Construa o VERGALHÃO CENTRAL de integridade e o motor de protocolo do ecossistema VORTEX conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 2

Entregar dois vergalhões centrais:
1. **Ledger Imutável** (append-only) — baseado na Resolução 458/2017 e IS 43.9-004 (IDs 646–655).
2. **Protocolo Eletrônico** (tipo SEI) — baseado na Resolução 520/2019, com numeração AAAA-NNNNNN, timeline imutável e níveis de acesso.
3. **Trilha de Auditoria** completa de todas as ações.

## 2. LEDGER IMUTÁVEL (O VERGALHÃO CENTRAL)

### 2.1 Fundamentação regulatória
- Resolução ANAC 458/2017: permite sistemas informatizados para registro e guarda de informações, exigindo integridade, autenticidade, legibilidade e disponibilidade.
- IS 43.9-004 (Registros Digitais): IDs 646–655.
- Requisitos: substituição de registros físicos (ID 646), assinatura ICP-Brasil (ID 647), autenticidade (ID 648), hash SHA-256 (ID 649), disponibilidade (ID 650), redundância/backup (ID 651), trilha de auditoria (ID 652), controle de acessos (ID 653), exportação íntegra (ID 654), conformidade com RBAC 43.9 (ID 655).

### 2.2 Entidade (schema ledger)
```sql
-- SCHEMA: ledger
CREATE TABLE ledger.ledger_blocks (
    id UUID DEFAULT gen_random_uuid(),
    version INT NOT NULL DEFAULT 1,
    previous_hash VARCHAR(64) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- INSERT, STATUS_CHANGE, APPROVAL, SIGNATURE, REVOQUE
    payload JSONB NOT NULL,
    changes JSONB, -- Diff estruturado: { field_path, old_value, new_value }
    created_by UUID NOT NULL REFERENCES identity.users(id),
    signature VARCHAR(512) NOT NULL, -- Assinatura criptográfica do bloco
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Particionamento mensal automático
CREATE TABLE ledger.ledger_blocks_2026_08 PARTITION OF ledger.ledger_blocks
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
CREATE TABLE ledger.ledger_blocks_2026_09 PARTITION OF ledger.ledger_blocks
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

-- Trava absoluta de imutabilidade
CREATE OR REPLACE FUNCTION ledger.prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'VIOLAÇÃO REGULATÓRIA: O Ledger do Ecossistema VORTEX é estritamente imutável (Resolução ANAC 458/2017). Operações de UPDATE ou DELETE são proibidas.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_protect_update
BEFORE UPDATE ON ledger.ledger_blocks
FOR EACH ROW EXECUTE FUNCTION ledger.prevent_ledger_mutation();

CREATE TRIGGER trg_ledger_protect_delete
BEFORE DELETE ON ledger.ledger_blocks
FOR EACH ROW EXECUTE FUNCTION ledger.prevent_ledger_mutation();
```

### 2.3 Algoritmo de append
- Função PL/pgSQL `append_block()`: pega o último bloco com `SELECT ... FOR UPDATE` (lock anti-concorrência), monta string `prev_hash|entity_type|entity_id|action_type|payload`, calcula SHA-256.
- `LedgerService.append()`: assina o hash com Ed25519 (libsodium) antes de inserir.
- `changes` guarda diff de campos (`field_path`, `old_value`, `new_value`).

### 2.4 Verificação de integridade
- Job `verifyLedger`: percorre a cadeia, valida hash e encadeamento, reporta bloco violado.
- Endpoint `GET /ledger/verify` retorna `{ valid, blocks, first_broken_block }`.
- `diff` reconstrói a evolução de uma entidade.

### 2.5 Endpoints
- `POST /ledger/append` (interno, service-to-service).
- `GET /ledger/:entity_id`.
- `GET /ledger/:entity_id/diff`.
- `GET /ledger/verify`.

### 2.6 Regras de negócio do ledger
1. Nenhum registro finalizado sem hash SHA-256 (ID 649).
2. Nenhuma alteração sem novo evento (append-only).
3. Toda ação registra `created_by` + assinatura (não-repúdio).
4. Exportação/verificação de integridade disponível a qualquer momento.
5. Ledger nunca é apagado, mesmo em eliminação LGPD (retenção legal).

## 3. PROTOCOLO ELETRÔNICO (TIPO SEI — VERGALHÃO UNIVERSAL)

### 3.1 Fundamentação regulatória
- Resolução 520/2019: processo eletrônico no âmbito da ANAC.
- Requisitos: numeração única, timeline imutável, níveis de acesso, hipóteses legais de restrição, consulta pública.

### 3.2 Entidades (schema protocol)
```sql
-- SCHEMA: protocol
CREATE TABLE protocol.sequences (
    year INT PRIMARY KEY,
    last_sequence BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE protocol.protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    protocol_number VARCHAR(20) UNIQUE NOT NULL, -- Formato: AAAA-NNNNNN
    year INT NOT NULL,
    sequence BIGINT NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    subject VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL REFERENCES identity.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Função geradora de protocolo oficial concorrente
CREATE OR REPLACE FUNCTION protocol.generate_protocol(
    p_tenant_id UUID, p_user_id UUID, p_entity_type VARCHAR, p_entity_id UUID, p_subject VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
    v_year INT := EXTRACT(YEAR FROM NOW());
    v_seq BIGINT;
    v_protocol_str VARCHAR(20);
BEGIN
    INSERT INTO protocol.sequences (year, last_sequence)
    VALUES (v_year, 1)
    ON CONFLICT (year) DO UPDATE
    SET last_sequence = protocol.sequences.last_sequence + 1
    RETURNING last_sequence INTO v_seq;
    INSERT INTO protocol.protocols (tenant_id, protocol_number, year, sequence, entity_type, entity_id, subject, created_by)
    VALUES (p_tenant_id, v_protocol_str, v_year, v_seq, p_entity_type, p_entity_id, p_subject, p_user_id);
    RETURN v_protocol_str;
END;
$$ LANGUAGE plpgsql;
```

### 3.3 Níveis de acesso e hipóteses legais
- Níveis: `PUBLIC` (consulta pública), `RESTRICTED` (dado pessoal), `PRIVATE`.
- Hipóteses legais de restrição: dados pessoais (LGPD), sigilo empresarial, segurança nacional, processo em andamento.
- Documento com dado pessoal só pode ser RESTRICTED/PRIVATE (nunca PUBLIC).

### 3.4 Regras de negócio do protocolo
1. Número `AAAA-NNNNNN` único por ano (teste de unicidade).
2. Timeline imutável — nunca editar/remover eventos.
3. Documento com dado pessoal só pode ser RESTRICTED/PRIVATE.
4. Vista de processo controla prazos (5 dias atendimento, 10 dias acesso).
5. Toda criação/evento → bloco no ledger.
6. Pesquisa pública (`GET /public/search`) lista apenas documentos PUBLIC.

### 3.5 Endpoints
- `POST /protocols`.
- `GET /protocols/:id`.
- `POST /protocols/:id/events`.
- `GET /protocols/:id/timeline`.
- `GET /public/search`.
- `POST /protocols/:id/vista`.

## 4. TRILHA DE AUDITORIA (ID 652)

- Toda ação (acesso, alteração, consulta) registra: usuário, data/hora, IP, ação, entidade, valores.
- Trilha imutável (append-only), vinculada ao ledger.
- Consulta por entidade, usuário, período.

## 5. TESTES OBRIGATÓRIOS DA PARTE 2

1. Teste de imutabilidade: tentar UPDATE/DELETE no ledger falha com exceção regulatória.
2. Teste de concorrência: geração de protocolos sem colisão sob carga.
3. Teste de unicidade: número AAAA-NNNNNN único por ano.
4. Teste de verificação: alterar um bloco quebra a cadeia (`verifyChain` retorna TAMPERED).
5. Teste de diff: reconstrução da evolução de uma entidade.
6. Teste de timeline: eventos imutáveis, sem edição/remoção.
7. Teste de acesso: pesquisa pública só retorna PUBLIC.
8. Teste de ancoragem: entidades de outros módulos geram blocos no ledger.

## 6. CRITÉRIOS DE ACEITE DA PARTE 2

- [ ] Ledger imutável com hash SHA-256 encadeado + assinatura Ed25519.
- [ ] Particionamento mensal automático.
- [ ] Trava de imutabilidade (UPDATE/DELETE bloqueados por trigger).
- [ ] Verificação de integridade (`GET /ledger/verify`).
- [ ] Protocolo AAAA-NNNNNN com numeração atômica e sem colisão.
- [ ] Timeline imutável com níveis de acesso e hipóteses legais.
- [ ] Vista de processo com prazos (5/10 dias).
- [ ] Trilha de auditoria completa.
- [ ] Testes de aceite passando; lacunas listadas.