# VORTEX v4 — PARTE 14/14: PUBLICAÇÕES (publicacoes.vortex.com)

> **Origem:** Parte 9 v2 §4 (CertPub), reorganizada em 14 partes (uma por app). Na v4 o antigo CertPub foi dividido: esta parte contém **somente as PUBLICAÇÕES** (assinaturas anuais de manuais digitalizados e recortes); as Certificações ficam na Parte 13. Consome o Núcleo — Parte 01 (Cadastro Central, Ledger, billing) e integra RLoja (Parte 04) e os ERPs de Manutenção/Agrícola (Partes 07 e 08).
> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em bibliotecas técnicas licenciadas, digitalização/OCR de manuais e gestão de direitos autorais. Construa o módulo conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, migrações SQL, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 14

1. **Publicações** — assinaturas **anuais** de pacotes de **manuais digitalizados** (fabricantes e Veryon — **sujeito a acordo de licenciamento**), com **recortes consumidos pelas tarefas de manutenção** dos ERPs (Partes 07 e 08). **Sem assinatura, sem recorte** (obtenção por fora) — **a tarefa nunca é bloqueada**.
2. **Frontend Angular** — feature-lib `feature-publicacoes`.

> **Aderência à arquitetura central:** o app de Publicações é consumidor do Núcleo — assinantes são empresas do Cadastro Central, documentos no document-service (Parte 01 — M4), assinaturas via eventos do ledger (Parte 01 — Núcleo), ancoragem de todos os eventos no ledger. Schema `publications` já criado na fundação (Parte 01).

## 2. ADERÊNCIA À ARQUITETURA CENTRAL

- **Núcleo dono da verdade:** os assinantes são empresas do Cadastro Central; manuais armazenados no MinIO com hash (Parte 01 — M4).
- **Ledger imutável (Res. ANAC 458/2017):** assinatura e leitura de recorte geram blocos no ledger com `origin_app = PUBLICACOES`; histórico abre como LedgerTimeline.
- **RLoja = canal de venda:** o pacote de publicações é anunciado na RLoja; a RLoja é marketplace multi-vendor — vender não exige tenant.
- **Billing (Parte 01 — Núcleo):** assinatura anual por pacote; comissões acionadas por eventos do ledger.
- **BRE (Parte 01 — Núcleo):** regra `PUBLICATION_LICENSE_REQUIRED` + validação de licença — pacote sem `license_agreement_ref` não publica.
- **RLS multi-tenant:** usuário sem vínculo não acessa assinaturas/biblioteca de outros tenants; validação N0–N3 nunca bloqueia o fluxo.

## 3. FUNDAMENTAÇÃO REGULATÓRIA

- **Publicações licenciadas:** manuais de fabricantes e Veryon são propriedade intelectual de terceiros — **sujeito a acordo de licenciamento com cada detentor de direitos**; pré-requisito comercial: pacote sem `license_agreement_ref` não publica.
- **Recortes e manutenção:** a tarefa de manutenção (RBAC 43/145 — Parte 07; ERP Agrícola — Parte 08) consome o **recorte do manual aplicável**; sem assinatura ativa, sem acesso ao recorte — **a tarefa nunca é bloqueada** (orientação de obtenção externa).
- **Revisões de manual:** revisão nova → revisão antiga marcada `is_current = FALSE` (alerta nos ERPs — Parte 07, regra 8).

## 4. ESTRUTURA DE MENUS (docs/10 §13 — bloco Publicações)

- **Publicações** `[catálogo de pacotes de manuais (fabricante/Veryon) → assinar (anual) → biblioteca]`
  - Biblioteca de manuais `[lista → leitor (digitalizado/OCR) → busca por ATA]`
  - **Recortes** `[tarefa de manutenção → recorte do manual aplicável (se assinante); sem assinatura → orientação de obtenção externa]`
  - Minhas assinaturas de publicações `[lista → detalhe → renovação]`
- Configuração `[pacotes, preços, licenças]`

Regras de navegação aplicáveis (docs/10 §15): tela de detalhe segue o padrão de abas `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`; ValidationBadge (N0–N3) ao lado de assinaturas.

## 5. ENTIDADES PRINCIPAIS (schema `publications` — verbatim Parte 9 v2 §4.3, schema renomeado)

```sql
CREATE SCHEMA IF NOT EXISTS publications;

CREATE TABLE publications.publication_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publisher VARCHAR(100) NOT NULL,       -- fabricante ou Veryon
    license_agreement_ref VARCHAR(255),    -- referência do acordo de licenciamento (pré-requisito)
    title VARCHAR(255) NOT NULL,
    description TEXT,
    annual_price NUMERIC(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'ATIVO',
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE publications.publication_manuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES publications.publication_packages(id),
    manual_code VARCHAR(100) NOT NULL,     -- ex.: AMM capítulo
    title VARCHAR(255) NOT NULL,
    ata_chapter VARCHAR(2),                -- indexação por ATA
    storage_key VARCHAR(512) NOT NULL,     -- digitalização (MinIO)
    ocr_index JSONB DEFAULT '{}',          -- índice OCR para busca
    revision VARCHAR(20), revision_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE publications.manual_excerpts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manual_id UUID NOT NULL REFERENCES publications.publication_manuals(id),
    excerpt_ref VARCHAR(255) NOT NULL,     -- página/seção
    ata_chapter VARCHAR(2),
    content_ref JSONB NOT NULL,            -- referência do recorte no documento
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 6. REGRAS DE NEGÓCIO OBRIGATÓRIAS (verbatim Parte 9 v2 §4.2/§4.4 — bloco Publicações)

**Publicações (assinatura anual):**
- Pacotes de **manuais digitalizados** (fabricantes e Veryon — **sujeito a acordo de licenciamento** com cada detentor de direitos; pré-requisito comercial: pacote sem `license_agreement_ref` não publica).
- Digitalização com **OCR + indexação por ATA**; leitor integrado com busca.
- **Recortes:** a tarefa de manutenção (Partes 07 e 08) consome o **recorte do manual aplicável**; sem assinatura ativa, sem acesso ao recorte (obtenção por fora) — **a tarefa nunca é bloqueada**.

**Regras do app:**
1. **Publicações:** assinatura anual por pacote (Parte 01 — Núcleo); acesso ao leitor e aos recortes **somente com assinatura ativa**.
2. **Recorte:** a tarefa de manutenção referencia `publications.manual_excerpts` (via `mro.task_publication_excerpts` — Parte 07); sem assinatura → `access_granted = FALSE` + orientação de obtenção externa; **a tarefa nunca é bloqueada**.
3. **Licenciamento:** pacote sem `license_agreement_ref` não pode ser publicado (BRE: `PUBLICATION_LICENSE_REQUIRED` + validação de licença).
4. Revisão nova de manual → revisão antiga marcada `is_current = FALSE` (alerta nos ERPs — Parte 07, regra 8).
5. Ancoragem: assinatura e leitura de recorte geram blocos no ledger (`origin_app = PUBLICACOES`).

## 7. ENDPOINTS DA API (bloco Publicações — verbatim Parte 9 v2 §4.5, prefixo renomeado)

- `GET /publications/packages` — catálogo de pacotes.
- `POST /publications/packages/:id/subscribe` — assinar pacote (anual).
- `GET /publications/manuals?search=&ata=` — biblioteca (busca OCR/ATA; assinantes).
- `GET /publications/manuals/:id/excerpts/:excerptId` — recorte (somente assinantes).
- `GET /publications/my-subscriptions` — minhas assinaturas de publicações.

## 8. FRONTEND ANGULAR (`feature-publicacoes` — verbatim Parte 9 v2 §5.3, bloco Publicações)

- **Publicações:** catálogo de pacotes → assinar → Biblioteca `[leitor digitalizado/OCR, busca por ATA]` → Recortes `[tarefa → recorte (se assinante); senão orientação externa]` → Minhas assinaturas.

Padrões obrigatórios (idem Parte 01, seção 18): standalone + signals + OnPush + `inject()` + `@if/@for`; formulários reativos tipados; LedgerTimeline para histórico; ValidationBadge em assinaturas; guards de permissão (UX) + validação no backend.

## 9. TESTES OBRIGATÓRIOS (verbatim Parte 9 v2 §6, itens de Publicações)

1. Teste Publicações: pacote sem `license_agreement_ref` não publica.
2. Teste Publicações: assinatura ativa → recorte servido; suspensa → orientação externa; tarefa nunca bloqueada.
3. Teste Publicações: revisão nova marca a antiga como não vigente (alerta nos ERPs).
4. Teste de ancoragem: assinatura e leitura de recorte geram blocos no ledger com `origin_app = PUBLICACOES`.
5. Teste de idempotência: webhooks de pagamento não duplicam assinaturas.
6. Teste de RLS: usuário sem vínculo não acessa assinaturas/biblioteca de outros tenants.

## 10. CRITÉRIOS DE ACEITE

- [ ] Publicações operando (pacotes licenciados, OCR/ATA, recortes consumidos pelas tarefas dos ERPs — Partes 07 e 08, assinatura anual).
- [ ] Regra "sem assinatura, sem recorte" garantida (`access_granted = FALSE` + orientação externa) sem bloquear a tarefa.
- [ ] Licenciamento como pré-requisito de publicação (BRE `PUBLICATION_LICENSE_REQUIRED`).
- [ ] Revisão nova de manual gera alerta nos ERPs.
- [ ] Frontend Angular (`feature-publicacoes`) conforme padrões v2.
- [ ] Testes de aceite passando; lacunas listadas.

## 11. MAPA DE MÓDULOS

> Base para a fragmentação futura em pedaços menores (prompts de construção por módulo/seção).

- **MÓDULO 14.1 — Pacotes e licenciamento** (`publications.publication_packages`)
  - Seções previstas: 14.1.1 cadastro de pacote (fabricante/Veryon) · 14.1.2 licenciamento (`license_agreement_ref` obrigatório para publicar — BRE `PUBLICATION_LICENSE_REQUIRED`) · 14.1.3 assinatura anual (Parte 01 — Núcleo)
- **MÓDULO 14.2 — Manuais digitalizados** (`publications.publication_manuals`)
  - Seções previstas: 14.2.1 digitalização no MinIO (`storage_key`) · 14.2.2 OCR + indexação por ATA (`ocr_index`) · 14.2.3 leitor com busca · 14.2.4 revisões (`is_current` + alerta nos ERPs)
- **MÓDULO 14.3 — Recortes** (`publications.manual_excerpts`)
  - Seções previstas: 14.3.1 recorte por página/seção (`content_ref`) · 14.3.2 consumo pela tarefa de manutenção (`mro.task_publication_excerpts` — Partes 07 e 08) · 14.3.3 regra "sem assinatura, sem recorte" (`access_granted = FALSE` + orientação externa; tarefa nunca bloqueada)
- **MÓDULO 14.4 — Ancoragem no ledger**
  - Seções previstas: 14.4.1 blocos de assinatura/leitura com `origin_app = PUBLICACOES` · 14.4.2 LedgerTimeline da assinatura
- **MÓDULO 14.5 — Frontend `feature-publicacoes`**
  - Seções previstas: 14.5.1 catálogo de pacotes · 14.5.2 biblioteca de manuais (leitor/OCR/ATA) · 14.5.3 recortes · 14.5.4 minhas assinaturas · 14.5.5 padrões Angular v2 + module boundaries

## 12. FONTES v2

- `artifacts/vortex-v2/docs/prompts/parte-9.md` — §4 Certificações e Publicações (entidades, regras, endpoints, testes) — conteúdo verbatim do bloco Publicações.
- **Divisão v4:** o antigo CertPub (Parte 13 v3) foi dividido em Parte 13 (Certificações) e Parte 14 (Publicações — esta). Renomeações aplicadas: schema `certpub` → `publications`; `origin_app = CERTPUB` → `PUBLICACOES`; endpoints `/certpub/*` → `/publications/*`; feature-lib `feature-certpub` → `feature-publicacoes`; regra de BRE `PUBLICATION_SALES_CERTPUB_ONLY` → **`PUBLICATION_LICENSE_REQUIRED`**.
- `artifacts/vortex-v2/CLAUDE.md` — seção 11 (Certificações e Publicações, tabela de apps) e princípio de produtos (8 produtos).
- `artifacts/vortex-v2/docs/10-navegacao-por-app.md` — §13 Certificações e Publicações (menus — bloco Publicações) e §15 regras de navegação.
- `artifacts/vortex-v2/docs/09-mapa-adaptacao-vortex.md` — §4.12 Certificações e Publicações.
