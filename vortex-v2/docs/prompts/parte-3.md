# VORTEX — PARTE 3/10 (v2): ASSINATURA DIGITAL COM BLOCO SEI, DOCUMENTOS ESTRUTURADOS, ARQUIVOS E COMPLIANCE LGPD

> **Versão 2 — 12/09/2026.** Reformulada: bloco de assinatura **padrão SEI/ANAC** (QR SVG + manifesto textual — contrato seção 5-B), página pública de autenticidade `/ass/autenticidade`, e **compliance LGPD completo** (export, erase, consentimento revogável — contrato seção 12.3).
> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em assinatura eletrônica (Lei nº 14.063/2020, Decreto nº 10.543/2020), documentos estruturados com integridade criptográfica, armazenamento seguro de objetos (MinIO), compliance LGPD e gestão de arquivos com versionamento. Construa o módulo de Assinatura Digital, o Gestor de Documentos Estruturados, o Gerenciador de Arquivos e o módulo de Compliance do ecossistema VORTEX conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, migrações SQL, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 3

Entregar quatro capacidades:
1. **Assinatura Digital** — assinatura eletrônica em níveis (simples, avançada e qualificada ICP-Brasil), conforme a **Lei nº 14.063/2020**, com **bloco de assinatura padrão SEI/ANAC** em todo documento assinado.
2. **Documentos Estruturados** — documentos com conteúdo, hash e metadados, ancorados no Ledger.
3. **Gerenciador de Arquivos** — upload, versionamento e download seguro via **MinIO** com presigned URLs.
4. **Compliance LGPD** — portabilidade (export), esquecimento (erase com ressalvas de retenção regulatória) e consentimento revogável por finalidade.

> **Aderência à arquitetura central:** documentos e assinaturas são **entidades do núcleo** (schemas `documents` e `signatures`), consumidas por todos os apps. Todo documento assinado e toda assinatura geram **bloco no Ledger** (com `origin_app`). Os arquivos físicos vivem no MinIO; o banco guarda apenas metadados e hashes. **Todo documento permanece texto estruturado** — PDF só sob demanda (efêmero).

## 2. PRINCÍPIOS (IMUTÁVEIS)

1. **Integridade:** todo documento tem hash SHA-256 calculado sobre o conteúdo; qualquer alteração quebra o hash.
2. **Autenticidade:** a assinatura vincula o documento ao signatário de forma verificável.
3. **Não repúdio:** a assinatura qualificada/avançada impede que o signatário negue a assinatura.
4. **Imutabilidade:** um documento assinado (selado) não pode ser alterado; mudanças geram nova versão.
5. **Rastreabilidade:** toda criação, versão, assinatura e download gera bloco no Ledger.
6. **Segurança:** arquivos nunca trafegam sem autenticação; downloads usam presigned URLs com expiração curta.
7. **Níveis de assinatura:** simples, avançada e qualificada (ICP-Brasil), conforme o requisito do documento.
8. **Tudo em texto (v2):** documento, bloco de assinatura, QR (SVG) e logomarcas (SVG/base64) — nada binário persistido.

## 3. FUNDAMENTAÇÃO REGULATÓRIA

- **Lei nº 14.063/2020:** assinaturas eletrônicas em interações com entes públicos e atos jurídicos — níveis **simples**, **avançada** e **qualificada (ICP-Brasil)**.
- **Decreto nº 10.543/2020, art. 4º:** fundamento do manifesto do bloco de assinatura (padrão SEI).
- **MP nº 2.200-2/2001:** institui a ICP-Brasil.
- **Resolução ANAC nº 458/2017:** autenticidade e integridade dos registros aeronáuticos eletrônicos.
- **LGPD (Lei nº 13.709/2018):** portabilidade (art. 18, II), eliminação (art. 18, VI — com ressalvas de retenção legal), consentimento (art. 8º — revogável a qualquer momento).

## 4. ENTIDADES (schemas `documents` e `signatures`)

```sql
-- SCHEMA: documents
CREATE SCHEMA IF NOT EXISTS documents;

CREATE TABLE documents.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID,
    user_id UUID NOT NULL,                        -- autor do documento
    origin_app VARCHAR(50) NOT NULL,              -- app de origem (v2)
    title VARCHAR(255) NOT NULL,
    doc_type VARCHAR(50) NOT NULL,                -- APRS, OS, CIV, LAUDO, CONTRATO, PROCURACAO, CERTIFICADO, DECLARACAO_EXPERIENCIA, FORMULARIO_ANAC, OUTRO
    content_format VARCHAR(20) NOT NULL DEFAULT 'MARKDOWN' CHECK (content_format IN ('MARKDOWN','XML')),
    storage_key VARCHAR(512) NOT NULL,            -- chave no MinIO (texto estruturado)
    sha256_hash VARCHAR(64) NOT NULL,             -- hash SHA-256 do conteúdo
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'text/markdown',
    version INT NOT NULL DEFAULT 1,
    is_sealed BOOLEAN NOT NULL DEFAULT FALSE,     -- selado = imutável (assinado)
    sealed_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE documents.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id),
    version INT NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    change_reason VARCHAR(255),
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, version)
);

-- SCHEMA: signatures
CREATE SCHEMA IF NOT EXISTS signatures;

CREATE TABLE signatures.signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id),
    signer_user_id UUID NOT NULL,
    signer_role VARCHAR(100) NOT NULL,            -- papel exibido no manifesto (ex.: Responsável Técnico)
    signer_company_id UUID,                       -- empresa exibida no manifesto
    signature_level VARCHAR(50) NOT NULL
      CHECK (signature_level IN ('SIMPLES','AVANCADA','QUALIFICADA_ICP')),
    signature_manifest JSONB NOT NULL,            -- metadados (data/hora Brasília, IP, dispositivo, contexto)
    digital_certificate_thumbprint VARCHAR(128),  -- impressão digital do certificado (ICP-Brasil)
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    signature_hash VARCHAR(64) NOT NULL,
    verifier_code VARCHAR(20) NOT NULL UNIQUE,    -- código verificador (ID público da assinatura)
    crc_code VARCHAR(8) NOT NULL,                 -- CRC = 8 primeiros hex do sha256 do documento
    signature_block_svg TEXT,                     -- bloco de assinatura gerado (texto + QR SVG) — selado junto ao documento
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_tenant ON documents.documents (tenant_id, created_at);
CREATE INDEX idx_documents_type ON documents.documents (doc_type, created_at);
CREATE INDEX idx_signatures_document ON signatures.signatures (document_id);
CREATE INDEX idx_signatures_signer ON signatures.signatures (signer_user_id);
CREATE INDEX idx_signatures_verifier ON signatures.signatures (verifier_code);
```

## 5. NÍVEIS DE ASSINATURA (Lei 14.063/2020)

| Nível | Uso recomendado | Mecanismo |
|-------|-----------------|-----------|
| **Simples** | Documentos internos, comunicados, confirmações de leitura | Identificação por login + aceite (registrado no ledger) |
| **Avançada** | Documentos operacionais (OS, APRS/CRS, contratos, procurações, declarações de experiência) | Assinatura com hash criptográfico + metadados de contexto (IP, dispositivo, sessão) — não repúdio |
| **Qualificada (ICP-Brasil)** | Documentos regulatórios de maior exigência (quando exigido) | Assinatura com certificado digital ICP-Brasil (e-CPF/e-CNPJ) |

### 5.1 Regras dos níveis
1. O tipo de documento define o **nível mínimo** de assinatura exigido (configurável por domínio).
2. APRS/CRS, OS de manutenção, procurações, contratos e declarações de experiência exigem **no mínimo assinatura avançada**.
3. Documentos regulatórios que exigem certificado digital usam **qualificada ICP-Brasil**.
4. A assinatura simples é suficiente para comunicações internas e confirmações.
5. Toda assinatura gera bloco no Ledger (não repúdio).

## 6. BLOCO DE ASSINATURA PADRÃO SEI/ANAC (contrato seção 5-B — v2)

### 6.1 Composição (gerado no momento da assinatura, selado junto com o documento)
```
---
[LOGOMARCA SVG/base64]

Documento assinado eletronicamente por [NOME COMPLETO], [PAPEL/CARGO], [EMPRESA],
em [DD/MM/AAAA] às [HH:MM], conforme horário oficial de Brasília, com fundamento
no art. 4º do Decreto nº 10.543, de 13 de novembro de 2020.

A autenticidade deste documento pode ser conferida em
https://[domínio]/ass/autenticidade, informando o código verificador [VERIFIER_CODE]
e o código CRC [CRC_CODE].

[QR CODE — SVG, apontando para /ass/autenticidade?code=VERIFIER_CODE&crc=CRC_CODE]
---
```

### 6.2 Regras do bloco
1. **QR code em SVG** (fallback base64 PNG para consumidores que não renderizam SVG) — aponta para a página pública de autenticidade.
2. **Manifesto textual gerado do Ledger** — nunca digitado à mão: nome, papel, empresa, data/hora de Brasília, fundamento legal.
3. **Códigos:** `verifier_code` = ID público da assinatura; `crc_code` = **8 primeiros hex do sha256_hash do documento** (conferência rápida sem expor o hash completo).
4. **Múltiplos signatários:** um bloco por signatário, em ordem cronológica de assinatura.
5. **Texto e QR são dois renderizadores da mesma verdade** (dados do ledger) — divergência invalida a verificação.
6. O bloco é gerado no momento da assinatura e **selado junto com o documento** (`signature_block_svg` persistido; não se regenera).
7. Os 3 níveis de assinatura usam o mesmo bloco, com o fundamento legal correspondente.

### 6.3 Página pública de autenticidade (`/ass/autenticidade`)
- **Acesso público** (nível PUBLIC — o único conteúdo público do sistema).
- Entrada: código verificador + CRC (ou QR escaneado).
- Saída: confirmação de autenticidade, signatário (nome/papel/empresa), data/hora de assinatura, integridade verificada — **sem expor o conteúdo do documento**.
- Consulta identificável gera meta-evento no ledger (quem verificou, quando).

## 7. GERENCIADOR DE ARQUIVOS (MinIO)

### 7.1 Conceito
- Arquivos físicos vivem no **MinIO**; o banco guarda `storage_key`, hash e metadados.
- Uploads e downloads usam **presigned URLs** (expiração curta: 15 min upload, 5 min download).
- Versionamento: cada alteração gera nova versão (append-only no histórico de versões).
- **MinIO com versionamento de bucket + replicação offsite** (contrato 5-A.6).

### 7.2 Fluxo de upload
1. Cliente solicita presigned URL de upload (`POST /api/v1/documents/presign-upload`).
2. Cliente envia o arquivo diretamente ao MinIO.
3. Serviço calcula o hash SHA-256 e registra o documento no banco.
4. Gera bloco no Ledger (`DOCUMENT_CREATED`, com `origin_app`).

### 7.3 Fluxo de download
1. Cliente solicita presigned URL de download (`GET /api/v1/documents/:id/presign-download`).
2. Serviço valida permissão (RLS) e gera URL com expiração curta.
3. Cliente baixa o arquivo diretamente do MinIO.

### 7.4 Regras do gerenciador
1. Restrição de tipos MIME e tamanho máximo (configurável por domínio).
2. Hash SHA-256 obrigatório em todo arquivo (integridade).
3. Arquivo selado (assinado) não pode ser substituído; nova versão é criada.
4. Presigned URLs com expiração curta e escopo restrito.
5. Todo upload, download e versão gera bloco no Ledger.
6. **Documentos de Publicações** (manuais licenciados) têm controle de acesso adicional: o recorte só é servido a assinantes (ver Parte 9 — CertPub).

## 8. COMPLIANCE LGPD (v2 — contrato seção 12.3)

### 8.1 Entidades
```sql
-- SCHEMA: compliance
CREATE SCHEMA IF NOT EXISTS compliance;

CREATE TABLE compliance.consent_purposes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purpose_code VARCHAR(50) NOT NULL UNIQUE,   -- ex.: RECRUTAMENTO, MARKETING, COMPARTILHAMENTO_PERFIL
    description VARCHAR(500) NOT NULL,
    legal_basis VARCHAR(50) NOT NULL,           -- CONSENTIMENTO, OBRIGACAO_LEGAL, EXECUCAO_CONTRATO...
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE compliance.user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    purpose_id UUID NOT NULL REFERENCES compliance.consent_purposes(id),
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    consent_proof JSONB NOT NULL,               -- contexto da coleta (IP, dispositivo, versão do texto)
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE compliance.data_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('EXPORT','ERASE')),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE'
      CHECK (status IN ('PENDENTE','EM_PROCESSAMENTO','CONCLUIDO','PARCIAL','REJEITADO')),
    retention_justification JSONB,              -- dados retidos por obrigação regulatória (quando PARCIAL)
    result_storage_key VARCHAR(512),            -- export: arquivo no MinIO (download autenticado)
    protocol_id UUID,                           -- protocolo do pedido
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

### 8.2 Regras LGPD
1. **Consentimento revogável por finalidade:** o usuário concede/revoga cada finalidade independentemente (Rconta → Módulo Segurança/Privacidade); a revogação é imediata para finalidades de consentimento e gera bloco no ledger.
2. **Export (portabilidade):** `POST /compliance/export` → gera arquivo estruturado (JSON/Markdown) com todos os dados do usuário (cadastros, currículo, CIV, documentos, histórico do ledger de que é dono) → download autenticado via presigned URL → protocolo emitido.
3. **Erase (esquecimento) com ressalva regulatória:** `POST /compliance/erase` → apaga dados pessoais não sujeitos a retenção legal; **dados com retenção regulatória (caderneta, registros de manutenção, SGSO, fiscal — docs/02 §2) NÃO são apagados**: são anonimizados (identificadores pessoais removidos) e o pedido retorna `PARCIAL` com a justificativa de retenção por norma.
4. O erase **nunca** quebra a cadeia do ledger: os blocos permanecem (imutáveis), com o payload anonimizado **por novo evento** (`PERSONAL_DATA_ERASED`) — o dado original fica cifrado e inacessível (chave de acesso revogada), preservando a cadeia.
5. Todo pedido de export/erase tem **protocolo** e gera blocos no ledger.
6. Prazo de atendimento: 15 dias (LGPD, art. 19).

### 8.3 Endpoints de compliance
- `GET /api/v1/compliance/consents` — finalidades e estado do consentimento do usuário.
- `POST /api/v1/compliance/consents/:purposeId` — conceder/revogar consentimento.
- `POST /api/v1/compliance/export` — solicitar portabilidade.
- `POST /api/v1/compliance/erase` — solicitar esquecimento.
- `GET /api/v1/compliance/requests/:id` — acompanhar pedido.

## 9. ENDPOINTS DA API

### 9.1 Documentos
- `POST /api/v1/documents` — criar documento (metadados).
- `POST /api/v1/documents/presign-upload` — solicitar URL de upload.
- `GET /api/v1/documents/:id` — detalhe do documento.
- `GET /api/v1/documents/:id/presign-download` — solicitar URL de download.
- `POST /api/v1/documents/:id/versions` — criar nova versão.
- `GET /api/v1/documents/:id/versions` — listar versões.
- `POST /api/v1/documents/:id/seal` — selar documento (tornar imutável).
- `GET /api/v1/documents` — listar documentos (filtros por tipo/tenant).

### 9.2 Assinaturas
- `POST /api/v1/signatures` — assinar documento (nível especificado; gera bloco SEI).
- `GET /api/v1/signatures/document/:documentId` — assinaturas de um documento.
- `GET /api/v1/signatures/user/:userId` — assinaturas de um usuário.
- `POST /api/v1/signatures/:id/verify` — verificar validade e integridade de uma assinatura.
- `GET /ass/autenticidade?code=&crc=` — **pública** — confirmação de autenticidade.

## 10. REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. Documento sem hash válido não pode ser assinado.
2. Documento selado (`is_sealed = TRUE`) não aceita novas versões nem alterações.
3. A assinatura exige que o signatário tenha vínculo/permissão ao documento (RLS).
4. A assinatura qualificada exige certificado ICP-Brasil válido (validação do thumbprint).
5. Toda assinatura gera bloco no Ledger com o `signature_hash`.
6. A verificação de assinatura valida o hash do documento, o hash da assinatura e (quando ICP) o certificado.
7. Documentos de pessoas (CIV, CMA, certificados, procurações, declarações) são ancorados no perfil no núcleo.
8. O download de documento exige permissão e gera bloco no Ledger (`DOCUMENT_DOWNLOADED`).
9. **O bloco de assinatura é gerado do ledger e selado com o documento** — nunca regenerado (v2).
10. **Consentimento revogado suspende imediatamente o tratamento da finalidade** (exceto obrigações legais) (v2).

## 11. TESTES OBRIGATÓRIOS DA PARTE 3

1. Teste de integridade: alterar o conteúdo do arquivo quebra o hash e invalida a assinatura.
2. Teste de nível: documento que exige assinatura avançada rejeita assinatura simples.
3. Teste de selagem: documento selado não aceita nova versão.
4. Teste de versionamento: nova versão preserva o histórico anterior (append-only).
5. Teste de presigned URL: URL expirada é rejeitada; URL válida baixa o arquivo.
6. Teste de RLS: usuário sem vínculo não acessa documento de outro tenant.
7. Teste de não repúdio: assinatura avançada/qualificada registra signatário, data e contexto no ledger.
8. Teste de ICP-Brasil: assinatura qualificada exige certificado válido.
9. Teste de ancoragem: criação, versão, assinatura e download geram blocos no ledger.
10. Teste de idempotência: assinar duas vezes o mesmo documento com a mesma chave não duplica.
11. **Teste do bloco SEI:** QR SVG válido; manifesto com nome/papel/empresa/data de Brasília/Decreto 10.543; verifier_code + crc_code corretos (8 hex do sha256).
12. **Teste da página pública:** /ass/autenticidade confirma com códigos válidos; rejeita inválidos; não expõe conteúdo.
13. **Teste de divergência:** manifesto alterado manualmente invalida a verificação (texto e QR são a mesma verdade).
14. **Teste de múltiplos signatários:** blocos em ordem cronológica; selados junto ao documento.
15. **Teste de consentimento:** revogação imediata suspende a finalidade; gera bloco no ledger.
16. **Teste de export:** arquivo contém todos os dados do usuário; download autenticado; protocolo emitido.
17. **Teste de erase parcial:** dados com retenção regulatória são anonimizados (não apagados); justificativa por norma retornada.
18. **Teste de erase vs ledger:** cadeia íntegra após erase (anonimização por novo evento, nunca edição).

## 12. CRITÉRIOS DE ACEITE DA PARTE 3

- [ ] Schemas `documents` e `signatures` criados com índices (incluindo `verifier_code`).
- [ ] Assinatura em 3 níveis (simples, avançada, qualificada ICP-Brasil) implementada.
- [ ] **Bloco de assinatura padrão SEI/ANAC** (QR SVG + manifesto do ledger) gerado e selado com o documento.
- [ ] **Página pública `/ass/autenticidade`** operando (confirma sem expor conteúdo).
- [ ] Hash SHA-256 e selagem de documentos implementados.
- [ ] Versionamento de documentos com histórico append-only.
- [ ] Gerenciador de arquivos via MinIO com presigned URLs.
- [ ] **Compliance LGPD:** consentimento revogável por finalidade, export e erase (com anonimização de dados retidos por norma).
- [ ] Verificação de assinatura e de integridade.
- [ ] Toda ação (criação, versão, assinatura, download, consentimento) ancorada no ledger.
- [ ] Testes de aceite passando; lacunas listadas.
