# VORTEX — PARTE 10/10 (v2): APP ANAC E CONSOLE DO NÚCLEO (interfaces restritas e auditadas)

> **Versão 2 — 12/09/2026.** Parte nova — desmembrada da antiga Parte 8. Cobre as duas interfaces mais sensíveis do ecossistema, ambas dependentes da Parte 2 (ledger com concessões): o **App ANAC** (auditoria regulatória, somente-leitura, ciclo auditado) e o **Console do Núcleo** (gestão da plataforma com zero-trust — "administrar sem ver").
> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em auditoria regulatória, sistemas de concessão de acesso, zero-trust administration, execução às cegas e interfaces de altíssima auditabilidade. Construa os dois módulos conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, migrações SQL, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 10

1. **App ANAC** — aplicativo de uso oficial (não vendido) para auditores da ANAC: solicitação de acesso ao ledger, audiências somente-leitura, suspensão de certificação por recusa de acesso, ciclo 100% auditado por meta-eventos.
2. **Console do Núcleo** — interface de gestão restrita aos administradores da plataforma: tenants, concessões de acesso, revisão de descriptografias, integridade do ledger, catálogo, auditoria da plataforma, restaurações. **Vê estados e métricas, nunca conteúdo** (zero-trust — contrato seção 5-A).
3. **Frontend Angular** (feature-libs `feature-anac` e `feature-nucleo`).

> **Aderência à arquitetura central:** ambas as interfaces operam **exclusivamente sobre o serviço de concessões** (`ledger.access_grants` — Parte 2) e sobre metadados em claro. **Nenhuma das duas detém chaves de tenant.** A única via de descriptografia é o serviço de concessão. Schemas `anac` criado na fundação (Parte 1); o console usa os schemas existentes.

## 2. APP ANAC (auditor do ledger — contrato seção 5-A)

### 2.1 Conceito e fluxo
- **Somente-leitura sempre** — o auditor não edita, não inclui eventos, não cria versões. O objetivo da auditoria é apontar o que está errado e quem está errado; a **correção é do auditado**, por inclusão de novos eventos com as provas (append-only).
- Fluxo: **consentida primeiro** → recusa → **suspensão de certificação** (empresa/aeronave) → **solicitação compulsória** aos administradores (dois botões).
- Acesso ao conteúdo **apenas sob concessão ativa**; somente o solicitante vê; auditado notificado (**exceto** segredo de justiça).

### 2.2 Entidades (schema `anac`)
```sql
CREATE SCHEMA IF NOT EXISTS anac;

CREATE TABLE anac.auditors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,          -- auditor credenciado (pessoa do Núcleo)
    credential_number VARCHAR(50) NOT NULL,
    credential_validity DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE anac.audit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditor_id UUID NOT NULL REFERENCES anac.auditors(id),
    request_type VARCHAR(30) NOT NULL CHECK (request_type IN ('CONSENTIDA','COMPULSORIA','JUSTICA')),
    scope_filter JSONB NOT NULL,           -- pessoa/empresa/aeronave/peça/OS/acidente
    justification TEXT NOT NULL,
    target_tenant_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'AGUARDANDO_AUTORIZACAO'
      CHECK (status IN ('AGUARDANDO_AUTORIZACAO','AUTORIZADA','RECUSADA','COMPULSORIA_APROVADA','EM_ANDAMENTO','ENCERRADA')),
    owner_response_at TIMESTAMPTZ,
    grant_id UUID,                          -- concessão criada (Parte 2)
    suspension_id UUID,                     -- suspensão aplicada (se recusa)
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE anac.certification_suspensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_company_id UUID,
    target_aircraft_id UUID,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('RECUSA_DE_ACESSO','NAO_CONFORMIDADE')),
    audit_request_id UUID REFERENCES anac.audit_requests(id),
    suspended_at TIMESTAMPTZ DEFAULT NOW(),
    lifted_at TIMESTAMPTZ,
    ledger_block_id UUID
);
```

### 2.3 Regras do App ANAC
1. **Solicitação:** auditor solicita acesso a um filtro específico (pessoa, empresa, aeronave, peça, OS ou acidente) com justificativa — gera `ACCESS_REQUESTED`.
2. **Autorização do dono:** o proprietário é notificado; **autorizar** → concessão `AUDITORIA_CONSENTIDA` (Parte 2); **recusar** → ANAC pode **suspender a certificação** da empresa/aeronave pela negativa e emitir **solicitação compulsória** aos administradores, que passam a exibir os dois botões (autorizar / compulsório).
3. **Compulsória:** aprovada pelos administradores → concessão `AUDITORIA_COMPULSORIA` (com o registro da recusa e da suspensão no histórico).
4. **Somente leitura:** visualização da timeline descriptografada **dentro do escopo da concessão** (`scope_filter`); tentativa de escrita é rejeitada no backend (o frontend nem exibe controles de escrita).
5. **Isolamento:** somente o solicitante vê; outros auditores não veem.
6. **Ciclo auditado:** todo o ciclo gera meta-eventos (ACCESS_REQUESTED/GRANTED/VIEWED/EXPIRED/REVOKED); encerrada a audiência, acesso cessado automaticamente e filtro volta cifrado.
7. **Notificação:** auditado sempre notificado, **exceto** segredo de justiça (concessão `confidential` — visível só ao admin autorizador + proprietários; meta-eventos confidenciais).
8. **Suspensão de certificação:** aplicada pelo App ANAC com motivo registrado; **levantável** quando a auditoria for autorizada (ou por decisão da ANAC).
9. **Credencial do auditor:** vencida → auditor bloqueado (alerta 60 dias antes).

### 2.4 Endpoints
- `POST /anac/audit-requests` — solicitar acesso.
- `POST /anac/audit-requests/:id/authorize` — dono autoriza.
- `POST /anac/audit-requests/:id/refuse` — dono recusa.
- `POST /anac/audit-requests/:id/compulsory` — administradores aprovam compulsória.
- `POST /anac/audit-requests/:id/close` — encerrar audiência (cessa acesso).
- `GET /anac/audit-requests/:id/timeline` — visualização somente-leitura (conforme concessão).
- `POST /anac/suspensions` — suspender certificação.
- `POST /anac/suspensions/:id/lift` — levantar suspensão.
- `GET /anac/my-requests` — histórico de auditorias do auditor.

## 3. CONSOLE DO NÚCLEO (gestão zero-trust — contrato seção 5-A e docs/10 §1)

### 3.1 Princípio
> **O console vê estados e métricas, nunca conteúdo.** Toda ação exige protocolo e vira meta-evento. Nenhum administrador detém chaves de tenant. O console é a materialização do "administrar sem ver".

### 3.2 Módulos do console
| Módulo | O que vê | O que NUNCA vê |
|--------|----------|----------------|
| **Dashboard** | KPIs de plataforma: tenants ativos, apps, integridade do ledger, fila de concessões | Conteúdo de tenants |
| **Tenants** | Estados, assinaturas, métricas de uso | Dados cadastrais, financeiro, estoque dos tenants |
| **Concessões de acesso** | Lista com tipo (DONO/SUPORTE_PROTOCOLO/AUDITORIA_CONSENTIDA/AUDITORIA_COMPULSORIA/JUSTICA), escopo, validade, status | O conteúdo concedido |
| **Nova concessão por protocolo** | Form: nº do protocolo + escopo mínimo → execução às cegas | Conteúdo além do escopo |
| **Revisão de descriptografias** | Relatório de meta-eventos: quem, escopo, protocolo, quando | O conteúdo descriptografado |
| **Integridade do ledger** | Status da cadeia, verificação por intervalo, relatório de quebras | Conteúdo dos blocos |
| **Catálogo** | Itens, deduplicação, taxonomia ATA | Estoque/financeiro dos tenants |
| **Auditoria da plataforma** | Timeline de meta-eventos | Conteúdo |
| **Restaurações** | Histórico SYSTEM_RESTORED, nova restauração reconciliada | Conteúdo |
| **Configuração** | Papéis de admin, parâmetros da plataforma | — |

### 3.3 Execução às cegas (suporte por protocolo)
1. O dono do dado solicita suporte → **protocolo** emitido com a descrição do problema.
2. O administrador abre o protocolo no console → informa o nº → sistema valida que o protocolo existe, pertence ao tenant e descreve a operação.
3. Concessão `SUPORTE_PROTOCOLO` criada com **escopo mínimo** (entidade + operação/campo) e expiração curta.
4. O admin executa a operação **por formulário escopado** (não navega pelo ledger do cliente) — ex.: correção de nome por decisão judicial.
5. A operação gera evento no ledger (com `origin_app = NUCLEO`) + meta-eventos de concessão; o dono é notificado.
6. Os **proprietários do VORTEX** revisam o relatório mensal de todas as descriptografias administrativas: "por que você acessou? por que não foi pelo protocolo do sistema?". Acesso sem justificativa de protocolo é falta grave.

### 3.4 Endpoints do console
- `GET /nucleo/dashboard` — KPIs de plataforma.
- `GET /nucleo/tenants` / `GET /nucleo/tenants/:id` — estados e métricas (sem conteúdo).
- `POST /nucleo/access-grants` — criar concessão (validação por tipo; protocolo obrigatório para SUPORTE_PROTOCOLO).
- `POST /nucleo/access-grants/:id/revoke` — revogar.
- `GET /nucleo/access-grants` — listar concessões.
- `GET /nucleo/descriptions-report` — relatório de descriptografias (meta-eventos).
- `GET /nucleo/ledger-integrity` / `POST /nucleo/ledger-integrity/verify` — integridade da cadeia.
- `GET /nucleo/catalog` / `POST /nucleo/catalog/dedup` — catálogo e deduplicação.
- `GET /nucleo/audit-timeline` — timeline de meta-eventos da plataforma.
- `POST /nucleo/restorations` — iniciar restauração reconciliada (Parte 2, seção 8).
- `GET /nucleo/restorations` — histórico SYSTEM_RESTORED.

## 4. FRONTEND ANGULAR (feature-libs v2)

### 4.1 `feature-anac`
- Dashboard `[fila de solicitações | certificações sob monitoramento]` · Solicitar acesso `[form: filtro + justificativa]` · Audiências `[status → visualização somente-leitura [timeline descriptografada do filtro] → encerrar]` · Suspensão de certificação `[form: empresa/aeronave + motivo]` · Consulta de pessoas/empresas `[somente-leitura conforme concessão]` · Histórico de auditorias `[timeline dos próprios acessos]`.
- **Sem controles de escrita em dados de domínio** — a UI não renderiza botões de edição (o backend rejeita de qualquer forma).

### 4.2 `feature-nucleo` (console)
- Layout distinto (sala de máquinas): sidebar de módulos, sem Central de Comunicação de tenant.
- Cada módulo exibe **estados/métricas** (tabelas, contadores, gráficos) — nenhum componente de conteúdo de tenant.
- **Fluxo de concessão por protocolo:** form → validação → execução às cegas (formulário escopado à operação) → confirmação com meta-evento exibido.
- **LedgerTimeline** disponível apenas para meta-eventos da plataforma (nunca para conteúdo de tenant).
- Padrões obrigatórios: standalone + signals + OnPush + `inject()` + `@if/@for`; formulários reativos tipados; guards de papel (admin da plataforma) no frontend + validação no backend.

## 5. TESTES OBRIGATÓRIOS DA PARTE 10

1. Teste App ANAC: solicitação → autorização → visualização somente-leitura dentro do escopo; encerramento cessa acesso; meta-eventos completos.
2. Teste App ANAC: recusa → suspensão registrada → compulsória aprovável pelos admins (dois botões).
3. Teste App ANAC: auditor somente-leitura — tentativa de escrita rejeitada no backend.
4. Teste App ANAC: somente o solicitante vê o conteúdo; outros auditores não veem.
5. Teste de segredo de justiça: concessão confidential esconde meta-eventos dos demais admins; sem notificação ao auditado.
6. Teste de credencial: auditor com credencial vencida bloqueado; alerta 60 dias antes.
7. Teste de suspensão: levantada quando a auditoria é autorizada.
8. Teste do console: administrador comum NÃO vê conteúdo de tenants (apenas estados/métricas) — teste de RLS + RBAC.
9. Teste de concessão por protocolo: sem protocolo válido, concessão rejeitada; com protocolo, escopo mínimo e expiração curta.
10. Teste de execução às cegas: admin executa operação escopada sem navegar pelo ledger do cliente; dono notificado.
11. Teste de revisão: relatório de descriptografias acessível apenas aos proprietários; acesso sem justificativa de protocolo é sinalizado.
12. Teste de integridade: verificação da cadeia acessível pelo console; quebra gera alerta BLOCKING.
13. Teste de restauração: restauração reconciliada acessível pelo console; gera SYSTEM_RESTORED.
14. Teste de isolamento de UI: feature-anac e feature-nucleo não importam feature-libs de apps de domínio (module boundaries).

## 6. CRITÉRIOS DE ACEITE DA PARTE 10

- [ ] App ANAC operando: solicitação, autorização/recusa, suspensão de certificação, compulsória, audiência somente-leitura, encerramento — ciclo 100% auditado.
- [ ] Segredo de justiça: concessão confidential com meta-eventos ocultos aos demais admins e sem notificação.
- [ ] Console do Núcleo operando: tenants, concessões, revisão de descriptografias, integridade, catálogo, auditoria, restaurações — **vendo estados, nunca conteúdo**.
- [ ] Execução às cegas por protocolo funcionando (escopo mínimo, expiração, notificação do dono).
- [ ] Relatório de descriptografias revisável pelos proprietários.
- [ ] Frontend Angular (feature-libs `feature-anac` e `feature-nucleo`) conforme padrões v2, com isolamento de UI garantido por module boundaries.
- [ ] Testes de aceite passando; lacunas listadas.
