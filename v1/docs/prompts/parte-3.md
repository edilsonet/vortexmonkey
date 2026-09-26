# VORTEX — PARTE 3/8: ASSINATURA DIGITAL, DOCUMENTOS ESTRUTURADOS E GERENCIADOR DE ARQUIVOS

> Instrução ao agente de código: você é um engenheiro de software sênior especialista em assinatura eletrônica (Lei 14.063/2020, MP 2.200-2/2001, Decreto 10.543/2020, ICP-Brasil), gestão documental, LGPD e conformidade regulatória. Construa o VORTEX Sign (motor de assinatura em 3 níveis), o motor de documentos estruturados (.md/XML) e o gerenciador de arquivos do ecossistema VORTEX conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 3

Entregar três capacidades centrais:
1. **VORTEX Sign** — motor de assinatura eletrônica em 3 níveis (simples, avançada, qualificada) com abstração de provedor, timestamp e verificação pública.
2. **Documentos Estruturados** — geração de documentos regulatórios (.md/XML) com versionamento e hash.
3. **Gerenciador de Arquivos** — upload, armazenamento (MinIO), presigned URLs, classificação e anonimização.

## 2. FUNDAMENTAÇÃO REGULATÓRIA

- **Lei 14.063/2020:** disciplina o uso de assinaturas eletrônicas nas interações com entes públicos, estabelecendo 3 níveis.
- **MP 2.200-2/2001, art. 10:** documentos eletrônicos com certificado ICP-Brasil têm presunção de veracidade.
- **Decreto 10.543/2020, art. 4º:** níveis mínimos de segurança para interação eletrônica com órgãos públicos.
- **Código Civil, art. 219 (parágrafo único):** presunção de autoria para assinaturas eletrônicas.
- **Res. 458/2017:** assinatura digital ICP-Brasil (ID 647), autenticidade (ID 648), trilha (ID 652).
- **LGPD (Lei 13.709/2018):** direitos dos titulares, retenção legal, portabilidade, esquecimento com retenção.

## 3. OS 3 NÍVEIS DE ASSINATURA

| Nível | Requisitos | Método | Validade |
|-------|-----------|--------|----------|
| **SIMPLES** | Identificação do usuário | Senha, login | Menor segurança; válida para atos de baixo risco |
| **AVANÇADA** | Identificação inequívoca + vínculo com o ato + dados de autoria | Gov.br (prata/ouro) + 2FA, certificado digital | Média segurança; presume-se autoria |
| **QUALIFICADA** | Certificado digital ICP-Brasil | Certificado A1/A3 via SDK | Máxima segurança; plena validade jurídica |

> **Nota:** a empresa NÃO é AC (Autoridade Certificadora). Integra provedores externos (Gov.br, ICP-Brasil via Serpro/Certisign).

## 4. ENTIDADES (schema signatures)
```sql
-- SCHEMA: signatures
CREATE TABLE signatures.signature_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,   -- SIMPLE | GOVBR | ICP_SERPRO | ICP_CERTISIGN
    name VARCHAR(255) NOT NULL,
    level VARCHAR(50) NOT NULL CHECK (level IN ('SIMPLE','AVANCADA','QUALIFICADA')),
    config JSONB NOT NULL DEFAULT '{}',   -- secrets NUNCA em claro
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE signatures.signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id),
    document_hash VARCHAR(64) NOT NULL,
    signer_user_id UUID NOT NULL REFERENCES identity.users(id),
    signer_company_id UUID REFERENCES identity.companies(id),
    signature_level VARCHAR(50) NOT NULL CHECK (signature_level IN ('SIMPLE','AVANCADA','QUALIFICADA')),
    provider_code VARCHAR(50) NOT NULL,
    provider_reference VARCHAR(255),
    method VARCHAR(50) NOT NULL,   -- SENHA | GOVBR_2FA | CERTIFICADO_A1 | CERTIFICADO_A3
    certificate_serial VARCHAR(100),
    certificate_issuer VARCHAR(255),
    timestamp_bsb TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    verification_code VARCHAR(50) NOT NULL UNIQUE,
    crc_code VARCHAR(50) NOT NULL,
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE signatures.signature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id),
    requested_by UUID NOT NULL REFERENCES identity.users(id),
    signers JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING','SIGNED','PARTIALLY_SIGNED','REJECTED','EXPIRED')),
    expires_at TIMESTAMPTZ,
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id)
);
```

## 5. ABSTRAÇÃO DE PROVEDOR
```typescript
// Interface de provedor de assinatura
interface SignatureProvider {
  code: string;
  level: 'SIMPLE' | 'AVANCADA' | 'QUALIFICADA';
  sign(payload: SignPayload): Promise<SignResult>;
  verify(verification: VerifyPayload): Promise<VerifyResult>;
}

class SimpleProvider implements SignatureProvider { /* senha + hash */ }
class GovBrProvider implements SignatureProvider { /* Gov.br + 2FA */ }
class IcpBrasilProvider implements SignatureProvider { /* certificado A1/A3 */ }
```

## 6. FLUXO DE ASSINATURA

1. **Solicitação:** `POST /signatures/requests` com documento e signatários.
2. **Autenticação:** signatário autentica (SIMPLES: senha; AVANÇADA: Gov.br + 2FA; QUALIFICADA: certificado A1/A3).
3. **Cálculo do hash:** SHA-256 do documento.
4. **Execução do provedor:** assina conforme o nível.
5. **Registro:** grava + ledger `DOCUMENT_SIGNED` + timestamp (TSA RFC 3161, fallback NTP + horário Brasília).
6. **Código verificador + CRC.**
7. **Verificação pública:** `GET /verify?code=XXXX`.

## 7. DOCUMENTOS ESTRUTURADOS (.md/XML)

### 7.1 Conceito
- Todo documento regulatório é um documento estruturado (.md ou XML), nunca um binário.
- PDF é gerado SOMENTE sob demanda (efêmero, nunca persistido).
- Versionamento N1.N2 com diff e hash SHA-256.

### 7.2 Entidades (schema documents)
```sql
-- SCHEMA: documents
CREATE TABLE documents.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    size_bytes BIGINT NOT NULL,
    hash VARCHAR(64) NOT NULL,                  -- SHA-256
    storage_key VARCHAR(512) NOT NULL,
    classification VARCHAR(50) NOT NULL CHECK (classification IN ('PUBLIC','RESTRICTED','PRIVATE')),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT'
      CHECK (status IN ('DRAFT','PENDING_SIGN','SIGNED','ARCHIVED')),
    protocol_id UUID REFERENCES protocol.protocols(id),
    owner_type VARCHAR(100),
    owner_id UUID,
    created_by UUID NOT NULL REFERENCES identity.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE documents.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id),
    version INT NOT NULL,
    hash VARCHAR(64) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    created_by UUID NOT NULL REFERENCES identity.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.3 Documentos regulatórios gerados
- CRS (Certificado de Retorno ao Serviço) — .md.
- FCDA (Ficha de Cumprimento de DA) — .md.
- SEGVOO 001 — XML.
- CVA (F-145-27E/28) — .md.
- Certificados de conclusão — .md.
- Mensagens RCR — .md.
- Faturas — .md.
- Relatórios ANAC (S141, SGSO) — XML.

### 7.4 Regras de documentos
1. Todo upload gera hash SHA-256.
2. Versões recuperáveis (nunca sobrescrever sem nova versão).
3. Presigned URL expirável (5 min).
4. Documento com dado pessoal força RESTRICTED/PRIVATE (nunca PUBLIC).
5. Anonimização: job mascara CPF/CNPJ.
6. Toda criação/versão → ledger + protocolo.

## 8. GERENCIADOR DE ARQUIVOS

- Upload via MinIO (presigned URLs).
- Restrição de tipo/tamanho/hash.
- Download via presigned URL (5 min).
- Classificação (PUBLIC/RESTRICTED/PRIVATE).
- Anonimização de dados pessoais.
- Trilha de auditoria de acessos.

## 9. COMPLIANCE LGPD

### 9.1 Direitos do titular (arts. 18 e 19)
| Direito | Implementação |
|---------|---------------|
| Confirmação e acesso | `GET /compliance/data` |
| Correção | Edição com registro no ledger |
| Anonimização/bloqueio | `POST /compliance/erase` (anonimiza) |
| Eliminação | Anonimização com retenção legal |
| Portabilidade | `POST /compliance/export` |
| Informação | Trilha no ledger |
| Revogação de consentimento | Ledger `CONSENT_REVOKED` |

### 9.2 Retenção legal (limite ao esquecimento)
- Registros de manutenção (RBAC 43.9 / 145.163) NÃO podem ser apagados.
- O direito ao esquecimento anonimiza dados pessoais, mas PRESERVA a trilha do ledger e os registros retidos.
- O ledger é append-only — nunca é apagado, mesmo em eliminação.

## 10. ENDPOINTS DA PARTE 3

- `POST /signatures/requests`
- `POST /signatures/requests/:id/sign`
- `GET /signatures/:id`
- `GET /verify?code=XXXX`
- `POST /documents/upload`
- `GET /documents/:id`
- `GET /documents/:id/versions`
- `POST /documents/:id/anonymize`
- `POST /documents/:id/segvoo-001`
- `POST /compliance/export`
- `GET /compliance/exports/:id`
- `POST /compliance/erase`
- `GET /compliance/erase/status`

## 11. TESTES OBRIGATÓRIOS DA PARTE 3

1. Teste dos 3 níveis: SIMPLES, AVANÇADA e QUALIFICADA funcionais.
2. Teste de verificação: hash assinado ≠ hash atual → verify falha.
3. Teste de ancoragem: toda assinatura gera bloco + código + CRC + timestamp.
4. Teste de secrets: secrets dos provedores nunca em claro.
5. Teste de QUALIFICADA: exige validação de cadeia do certificado (OCSP/CRL).
6. Teste de versionamento: versões recuperáveis com diff e hash.
7. Teste de LGPD: eliminação anonimiza SEM apagar o ledger.
8. Teste de classificação: documento com dado pessoal bloqueia PUBLIC.
9. Teste de presigned URL: expira em 5 min.

## 12. CRITÉRIOS DE ACEITE DA PARTE 3

- [ ] VORTEX Sign com 3 níveis e abstração de provedor.
- [ ] Assinatura QUALIFICADA com validação de cadeia ICP-Brasil.
- [ ] Timestamp (TSA RFC 3161) + código verificador + CRC.
- [ ] Verificação pública `GET /verify`.
- [ ] Documentos estruturados (.md/XML) com versionamento e hash.
- [ ] Gerenciador de arquivos com MinIO e presigned URLs.
- [ ] Compliance LGPD (portabilidade, esquecimento com retenção, consentimento).
- [ ] Testes de aceite passando; lacunas listadas.