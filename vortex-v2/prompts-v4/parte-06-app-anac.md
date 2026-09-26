# VORTEX v4 — PARTE 06/14: APP ANAC (anac.vortex.com)

> **Origem:** Parte 10 v2 §2 (App ANAC), reorganizada em 14 partes (uma por app). Consome o Núcleo — Parte 01 (Cadastro Central, Ledger, concessões `ledger.access_grants`).
> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em auditoria regulatória, sistemas de concessão de acesso, zero-trust e interfaces de altíssima auditabilidade. Construa o módulo conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, migrações SQL, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 06

1. **App ANAC** — aplicativo de **uso oficial (não vendido)** para auditores da ANAC: solicitação de acesso ao ledger, audiências somente-leitura, suspensão de certificação por recusa de acesso, ciclo 100% auditado por meta-eventos.
2. **Somente-leitura sempre** — o auditor não edita, não inclui eventos, não cria versões. O objetivo da auditoria é apontar o que está errado e quem está errado; a **correção é do auditado**, por inclusão de novos eventos com as provas (append-only).
3. **Frontend Angular** — feature-lib `feature-anac`.

> **Aderência à arquitetura central:** o App ANAC opera **exclusivamente sobre o serviço de concessões** (`ledger.access_grants` — Parte 01 — Núcleo) e sobre metadados em claro. **O app não detém chaves de tenant.** A única via de descriptografia é o serviço de concessão. Schema `anac` criado na fundação (Parte 01).

## 2. ADERÊNCIA À ARQUITETURA CENTRAL

- **Ledger imutável (Res. ANAC 458/2017):** todo evento relevante vira bloco com hash SHA-256 encadeado + assinatura Ed25519; payload cifrado em repouso (AES-256-GCM, envelope por tenant); hash e assinatura sempre em claro (verificáveis sem descriptografar).
- **Zero-trust "administrar sem ver" (CLAUDE.md v2, seção 5-A):** ninguém acessa conteúdo por padrão — nem os administradores da plataforma. Toda abertura de acesso é, ela mesma, um evento no ledger.
- **RLS multi-tenant + criptografia:** a RLS isola tenants entre si; a criptografia protege contra insiders da plataforma. As duas camadas são necessárias — uma não substitui a outra.
- **Acesso ANAC:** exclusivamente pelo App ANAC (5-A.1.4), sobre o filtro solicitado. Concessões `read_only = TRUE` sempre para terceiros.

## 3. FUNDAMENTAÇÃO REGULATÓRIA

### 3.1 Auditoria ANAC — consentida primeiro, compulsória depois (CLAUDE.md v2, seção 5-A.3 — verbatim)

1. O auditor ANAC solicita, pelo **App ANAC**, acesso a um **filtro específico** do ledger (pessoa, empresa, aeronave, peça, OS ou acidente).
2. O **proprietário do dado é notificado** e decide:
   - **Autorizar** → acesso liberado ao auditor solicitante (somente leitura).
   - **Recusar** → a ANAC **não acessa**; pode, pelo App ANAC, **suspender a certificação** da empresa ou da aeronave pela negativa de acesso; e pode então emitir **solicitação compulsória** aos administradores da plataforma, que passam a exibir os dois botões (autorizar / compulsório).
3. **Somente leitura:** o auditor NÃO edita, NÃO inclui eventos, NÃO cria versões. O objetivo da auditoria é apontar o que está errado e quem está errado; a **correção é feita pelo próprio auditado**, por inclusão de novos eventos com as provas da correção (append-only).
4. **Notificação:** toda auditoria — consentida ou compulsória — **notifica o auditado** de que seu conteúdo está sendo acessado, exceto segredo de justiça (5-A.4).
5. **Escopo e isolamento:** somente o **solicitante** vê o conteúdo descriptografado do filtro solicitado; qualquer outra pessoa (inclusive outros auditores) não vê.
6. **Ciclo de vida:** todo o ciclo gera meta-eventos — quem solicitou, quem aprovou, quem visualizou, quando começou, quando terminou. Encerrada a audiência, o acesso é **cessado automaticamente** e o filtro volta cifrado.

### 3.2 Segredo de justiça (seção 5-A.4 — verbatim)

1. Investigação judicial com **segredo de justiça** (mandado apresentado): acesso concedido apenas ao **administrador que autorizou** e aos **administradores proprietários** do VORTEX — os demais administradores **nem tomam conhecimento**.
2. Os meta-eventos desse acesso são marcados como **confidenciais** (visíveis apenas ao círculo acima); o auditado **não é notificado** enquanto durar o segredo.
3. Findo o segredo (por decisão judicial), os meta-eventos tornam-se visíveis conforme as regras gerais.

### 3.3 Implementação das concessões (seção 5-A.5 — verbatim)

- **Cifra:** payload cifrado com **AES-256-GCM**; **chave de dados por tenant** em envelope encryption — **os administradores NÃO detêm as chaves de dados dos tenants**; a única via de descriptografia é o **serviço de concessão de acesso**, que só libera a chave com concessão ativa (protocolo de suporte, auditoria autorizada/compulsória ou ordem judicial).
- **Concessões:** tabela `ledger.access_grants` (`granted_by`, `grant_type` (DONO / SUPORTE_PROTOCOLO / AUDITORIA_CONSENTIDA / AUDITORIA_COMPULSORIA / JUSTICA), `protocol_number`, `scope_filter`, `read_only` (sempre TRUE para terceiros), `confidential` (segredo de justiça), `expires_at`, `revoked_at`) + meta-eventos `ACCESS_REQUESTED / GRANTED / VIEWED / EXPIRED / REVOKED`.
- **Verificação sem descriptografar:** jobs de integridade (hash/assinatura) rodam sobre os dados cifrados — a integridade é pública; o conteúdo, não.

## 4. ESTRUTURA DE MENUS (docs/10 §10 — verbatim)

- Dashboard `[fila de solicitações | certificações sob monitoramento]`
- **Solicitar acesso ao ledger** `[form: filtro (pessoa/empresa/aeronave/peça/OS/acidente) + justificativa]`
- **Audiências** `[lista → detalhe: status (aguardando autorização/autorizada/compulsória/encerrada) → visualização somente-leitura [timeline descriptografada do filtro] → encerrar]`
- **Suspensão de certificação** `[form: empresa/aeronave + motivo (recusa de acesso)]`
- **Consulta de pessoas/empresas** `[busca → detalhe regulatório (somente-leitura, conforme concessão)]`
- Histórico de auditorias `[timeline dos próprios acessos]`
- *(sem escrita em dados de domínio — somente-leitura sempre)*

Regras de navegação aplicáveis (docs/10 §15): o App ANAC é somente-leitura sempre; toda visualização dentro do escopo de uma concessão ativa. Tela de detalhe segue o padrão de abas: `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`.

## 5. ENTIDADES PRINCIPAIS (schema `anac` — verbatim Parte 10 v2 §2.2)

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
    grant_id UUID,                          -- concessão criada (Parte 01 — Núcleo)
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

## 6. REGRAS DE NEGÓCIO OBRIGATÓRIAS (verbatim Parte 10 v2 §2.3)

1. **Solicitação:** auditor solicita acesso a um filtro específico (pessoa, empresa, aeronave, peça, OS ou acidente) com justificativa — gera `ACCESS_REQUESTED`.
2. **Autorização do dono:** o proprietário é notificado; **autorizar** → concessão `AUDITORIA_CONSENTIDA` (Parte 01 — Núcleo); **recusar** → ANAC pode **suspender a certificação** da empresa/aeronave pela negativa e emitir **solicitação compulsória** aos administradores, que passam a exibir os dois botões (autorizar / compulsório).
3. **Compulsória:** aprovada pelos administradores → concessão `AUDITORIA_COMPULSORIA` (com o registro da recusa e da suspensão no histórico).
4. **Somente leitura:** visualização da timeline descriptografada **dentro do escopo da concessão** (`scope_filter`); tentativa de escrita é rejeitada no backend (o frontend nem exibe controles de escrita).
5. **Isolamento:** somente o solicitante vê; outros auditores não veem.
6. **Ciclo auditado:** todo o ciclo gera meta-eventos (ACCESS_REQUESTED/GRANTED/VIEWED/EXPIRED/REVOKED); encerrada a audiência, acesso cessado automaticamente e filtro volta cifrado.
7. **Notificação:** auditado sempre notificado, **exceto** segredo de justiça (concessão `confidential` — visível só ao admin autorizador + proprietários; meta-eventos confidenciais).
8. **Suspensão de certificação:** aplicada pelo App ANAC com motivo registrado; **levantável** quando a auditoria for autorizada (ou por decisão da ANAC).
9. **Credencial do auditor:** vencida → auditor bloqueado (alerta 60 dias antes).

## 7. ENDPOINTS DA API (verbatim Parte 10 v2 §2.4)

- `POST /anac/audit-requests` — solicitar acesso.
- `POST /anac/audit-requests/:id/authorize` — dono autoriza.
- `POST /anac/audit-requests/:id/refuse` — dono recusa.
- `POST /anac/audit-requests/:id/compulsory` — administradores aprovam compulsória.
- `POST /anac/audit-requests/:id/close` — encerrar audiência (cessa acesso).
- `GET /anac/audit-requests/:id/timeline` — visualização somente-leitura (conforme concessão).
- `POST /anac/suspensions` — suspender certificação.
- `POST /anac/suspensions/:id/lift` — levantar suspensão.
- `GET /anac/my-requests` — histórico de auditorias do auditor.

## 8. FRONTEND ANGULAR (`feature-anac` — verbatim Parte 10 v2 §4.1)

- Dashboard `[fila de solicitações | certificações sob monitoramento]` · Solicitar acesso `[form: filtro + justificativa]` · Audiências `[status → visualização somente-leitura [timeline descriptografada do filtro] → encerrar]` · Suspensão de certificação `[form: empresa/aeronave + motivo]` · Consulta de pessoas/empresas `[somente-leitura conforme concessão]` · Histórico de auditorias `[timeline dos próprios acessos]`.
- **Sem controles de escrita em dados de domínio** — a UI não renderiza botões de edição (o backend rejeita de qualquer forma).
- Padrões obrigatórios (Parte 01, seção 18): standalone + signals + OnPush + `inject()` + `@if/@for`; formulários reativos tipados; LedgerTimeline para histórico; guards de papel (auditor credenciado) no frontend + validação no backend.

## 9. TESTES OBRIGATÓRIOS (verbatim Parte 10 v2 §5, itens do App ANAC)

1. Teste App ANAC: solicitação → autorização → visualização somente-leitura dentro do escopo; encerramento cessa acesso; meta-eventos completos.
2. Teste App ANAC: recusa → suspensão registrada → compulsória aprovável pelos admins (dois botões).
3. Teste App ANAC: auditor somente-leitura — tentativa de escrita rejeitada no backend.
4. Teste App ANAC: somente o solicitante vê o conteúdo; outros auditores não veem.
5. Teste de segredo de justiça: concessão confidential esconde meta-eventos dos demais admins; sem notificação ao auditado.
6. Teste de credencial: auditor com credencial vencida bloqueado; alerta 60 dias antes.
7. Teste de suspensão: levantada quando a auditoria é autorizada.
8. Teste de RLS: usuário sem vínculo não acessa dados de outros tenants.
9. Teste de isolamento de UI: feature-anac não importa feature-libs de apps de domínio (module boundaries).

## 10. CRITÉRIOS DE ACEITE

- [ ] App ANAC operando: solicitação, autorização/recusa, suspensão de certificação, compulsória, audiência somente-leitura, encerramento — ciclo 100% auditado.
- [ ] Segredo de justiça: concessão confidential com meta-eventos ocultos aos demais admins e sem notificação.
- [ ] Auditor somente-leitura garantido no backend (tentativa de escrita rejeitada) e na UI (sem controles de escrita).
- [ ] Isolamento: somente o solicitante vê o conteúdo; credencial vencida bloqueia o auditor.
- [ ] Frontend Angular (`feature-anac`) conforme padrões v2, com isolamento de UI garantido por module boundaries.
- [ ] Testes de aceite passando; lacunas listadas.

## 11. MAPA DE MÓDULOS

> Base para a fragmentação futura em pedaços menores (prompts de construção por módulo/seção).

- **MÓDULO 06.1 — Credenciamento de auditores** (`anac.auditors`)
  - Seções previstas: 06.1.1 credencial (número, validade, status) · 06.1.2 bloqueio por credencial vencida + alerta 60 dias · 06.1.3 vínculo com pessoa do Núcleo
- **MÓDULO 06.2 — Solicitação de acesso** (`anac.audit_requests` — criação)
  - Seções previstas: 06.2.1 form de filtro (pessoa/empresa/aeronave/peça/OS/acidente) + justificativa · 06.2.2 meta-evento ACCESS_REQUESTED · 06.2.3 tipos (CONSENTIDA/COMPULSORIA/JUSTICA)
- **MÓDULO 06.3 — Ciclo de autorização do dono**
  - Seções previstas: 06.3.1 notificação do proprietário · 06.3.2 autorizar → concessão AUDITORIA_CONSENTIDA · 06.3.3 recusar → habilita suspensão + compulsória · 06.3.4 dois botões dos administradores
- **MÓDULO 06.4 — Audiência somente-leitura**
  - Seções previstas: 06.4.1 concessão ativa como pré-requisito · 06.4.2 timeline descriptografada dentro do scope_filter · 06.4.3 rejeição de escrita no backend · 06.4.4 encerramento cessa acesso e filtro volta cifrado
- **MÓDULO 06.5 — Suspensão de certificação** (`anac.certification_suspensions`)
  - Seções previstas: 06.5.1 aplicar por recusa de acesso / não conformidade · 06.5.2 levantar quando a auditoria for autorizada
- **MÓDULO 06.6 — Segredo de justiça**
  - Seções previstas: 06.6.1 concessão JUSTICA/confidential · 06.6.2 meta-eventos confidenciais (só admin autorizador + proprietários) · 06.6.3 sem notificação ao auditado
- **MÓDULO 06.7 — Consulta e histórico**
  - Seções previstas: 06.7.1 consulta de pessoas/empresas (somente-leitura conforme concessão) · 06.7.2 histórico de auditorias do auditor
- **MÓDULO 06.8 — Frontend `feature-anac`**
  - Seções previstas: 06.8.1 dashboard (fila + certificações monitoradas) · 06.8.2 audiências · 06.8.3 suspensões · 06.8.4 padrões Angular v2 + module boundaries

## 12. FONTES v2

- `artifacts/vortex-v2/docs/prompts/parte-10.md` — §2 App ANAC (entidades, regras, endpoints, testes) — conteúdo verbatim.
- `artifacts/vortex-v2/CLAUDE.md` — seção 5-A (5-A.3 auditoria ANAC, 5-A.4 segredo de justiça, 5-A.5 implementação) e seção 11 (App ANAC, linha 10).
- `artifacts/vortex-v2/docs/10-navegacao-por-app.md` — §10 App ANAC (menus) e §15 regra 6.
- `artifacts/vortex-v2/docs/09-mapa-adaptacao-vortex.md` — §4.13 App ANAC.
