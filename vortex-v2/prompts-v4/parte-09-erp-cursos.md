# VORTEX v4 — PARTE 09/14: ERP CURSOS E TREINAMENTOS (training.vortex.com)

> **Origem v2:** PARTE A do `docs/prompts/parte-7.md` (ERP Cursos), reorganizada sem alteração de conteúdo regulatório ou técnico. Consome o **Núcleo** (Parte 01/14) para pessoas, empresas, catálogo, estoque e ledger — nenhuma tabela de pessoa neste app.
> **Instrução ao agente de código:** engenheiro sênior em instrução aeronáutica (CIAC/CTAC, S141), FSTD e currículos de IS. Construa o ERP com rigor, TypeScript estrito, migrações SQL e testes. Execute completo.

---

## 1. OBJETIVO DA PARTE 09

1. **Comercial/CRM do domínio**: prospecção de alunos → matrículas.
2. **Catálogo de cursos (produto digital)**: único ERP autorizado a criar e **vender cursos na RLoja**.
3. **Turmas**: alunos (do Núcleo), instrutores, agenda, frequência, avaliações.
4. **Simuladores (FSTD)**: dispositivos e qualificações.
5. **Certificados**: emissão (prazo 10 dias), diplomas.
6. **Integração S141** (ANAC).
7. **Camada administrativa geral** (RH, Financeiro, Contabilidade de dupla entrada, Compras) + RH interno + Vagas.
8. **Frontend Angular** (feature-lib `feature-training`).

---

## 2. ADERÊNCIA À ARQUITETURA CENTRAL (CLAUDE.md v2)

- Alunos e instrutores são **pessoas do Núcleo** (curso/treinamento/certificado do instrutor ficam no perfil profissional, com selo N0–N3).
- **Cursos só podem ser vendidos por este ERP** (regra de negócio global — BRE: `COURSE_SALES_ERP_TRAINING_ONLY`). Operadores, Manutenção, Agrícola e Aeródromos têm treinamento interno para funcionários, mas **não vendem cursos** (CLAUDE.md v2, seção 4.2).
- O curso vendido na RLoja entrega **conteúdo digital** via document-service (presigned URL/download após pagamento); não fica no estoque físico.
- Toda turma, matrícula, frequência e certificado gera bloco no Ledger (`origin_app = ERP_CURSOS`) — princípios da seção 3 e seção 5-A do CLAUDE.md v2 (payload cifrado AES-256-GCM, hash sobre payload em claro, acesso auditado via `access_grants`).
- **Vagas do RH** → Recrutamento (sem comissão — CLAUDE.md v2, seção 4.3: uso embutido na assinatura do ERP, contratação cria vínculo automático, pessoas nunca pagam).
- Multi-tenant com RLS por linha (PostgreSQL 16); protocolo AAAA-NNNNNN (Res. 520/2019); assinatura eletrônica no bloco padrão SEI (seção 5-B).
- Camada administrativa geral conforme seção 4.1 do CLAUDE.md v2 (RH · Financeiro · Contabilidade de dupla entrada · Compras · Comercial/CRM · Documentos/Contratos).

---

## 3. FUNDAMENTAÇÃO REGULATÓRIA

RBAC 141 (CIAC), RBAC 142 (CTAC), integração S141; FSTD (qualificação de simuladores); matrícula no **dobro do período letivo → cancelamento** (regra S141); certificados em até **10 dias**.

**ISs associadas (v2):** 121-006/121-007/121-008/121-011 (PTO, LOFT, recertificação de tripulação 121), 135-001/135-003 (examinadores e PTO 135), 137-207 (treinamento aeroagrícola) — os currículos destas ISs são criados e vendidos por este ERP; os operadores 121/135 e o ERP Agrícola **contratam** o treinamento (turma fechada/corporativa), nunca o criam.

---

## 4. ESTRUTURA DE MENUS (docs/09 v2 §4.6 + docs/10 v2 §7)

| Menu | Conteúdo |
|------|----------|
| **Dashboard** | Turmas ativas, alunos por turma, certificados pendentes, vendas de cursos |
| **Comercial/CRM** | Pipeline (interessados) → Matrículas |
| **Cursos** | Catálogo de cursos (criar; publicar na RLoja; conteúdo digital; valor) — inclui currículos das ISs 121-006/007/008/011, 135-001/003, 137-207 |
| **Turmas** | Turmas · Alunos (do Núcleo) · Instrutores · Agenda · Frequência · Avaliações · **Turmas corporativas (v2: contratadas por operadores/agrícola)** |
| **Simuladores (FSTD)** | Dispositivos · Qualificações · Reservas |
| **Certificados** | Emissão (10 dias) · Diplomas · Reemissão |
| **S141** | Sincronização com a ANAC · Envio de dados |
| **RH interno** | Instrutores · Examinadores (credenciais do Núcleo) · **Vagas (v2)** |
| **Administrativo geral** | RH · Financeiro · **Contabilidade (dupla entrada)** · Compras |
| **Relatórios** | Desempenho, conformidade S141, vendas |
| **Configuração** | Tipos de curso, matriz curricular, templates de certificado |

Árvore nível-clique (docs/10 v2 §7):
- Dashboard `[turmas | certificados | vendas]`
- Comercial/CRM `[pipeline → matrículas]`
- Cursos `[catálogo → publicar na RLoja]`
- Turmas `[alunos | instrutores | agenda | frequência | avaliações]`
- Simuladores (FSTD) `[dispositivos | qualificações | reservas]`
- Certificados `[emissão ≤10 dias | diplomas]`
- S141 `[sincronização ANAC]`
- RH interno `[instrutores | examinadores]` + Vagas
- Administrativo geral `[RH | Financeiro | Contabilidade | Compras]`
- Relatórios / Configuração

---

## 5. ENTIDADES PRINCIPAIS (schema `training` — verbatim da v2)

```sql
CREATE TABLE training.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, -- CIAC/CTAC
    code VARCHAR(30) UNIQUE NOT NULL, title VARCHAR(255) NOT NULL,
    course_type VARCHAR(30) NOT NULL, -- PP, PC, PLA, IFR, COMISSARIO, INSTRUTOR, PTO_121, LOFT, PTO_135, TREINAMENTO_AGRICOLA_137, ...
    regulatory_basis VARCHAR(50),    -- IS de referência (121-006, 135-001, 137-207...)
    workload_hours NUMERIC(10,2), price NUMERIC(15,2), currency VARCHAR(3) DEFAULT 'BRL',
    digital_content_key VARCHAR(512), -- conteúdo digital (MinIO)
    status VARCHAR(20) DEFAULT 'RASCUNHO', -- RASCUNHO/PUBLICADO/SUSPENSO
    published_rloja BOOLEAN DEFAULT FALSE, -- só este ERP publica na RLoja
    ledger_block_id UUID
);

CREATE TABLE training.turmas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES training.courses(id),
    code VARCHAR(30) UNIQUE NOT NULL, start_date DATE, end_date DATE,
    schedule JSONB DEFAULT '[]', instructor_id UUID, -- pessoa do Núcleo
    corporate_client_company_id UUID, -- v2: turma fechada contratada por operador/agrícola
    status VARCHAR(20) DEFAULT 'PLANEJADA', ledger_block_id UUID
);

CREATE TABLE training.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id UUID NOT NULL REFERENCES training.turmas(id),
    student_id UUID NOT NULL, -- aluno do Núcleo
    origin VARCHAR(30) DEFAULT 'ERP', -- ERP / RLOJA (compra) / CORPORATIVO (v2)
    status VARCHAR(20) DEFAULT 'MATRICULADO', -- MATRICULADO/CANCELADO/CONCLUIDO
    ledger_block_id UUID
);

CREATE TABLE training.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL, class_date DATE NOT NULL, presence BOOLEAN DEFAULT FALSE,
    ledger_block_id UUID
);

CREATE TABLE training.fstd_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, device_code VARCHAR(30), device_type VARCHAR(30),
    qualification VARCHAR(30), qualification_validity DATE, status VARCHAR(20) DEFAULT 'OPERACIONAL',
    ledger_block_id UUID
);

CREATE TABLE training.certificates_issued (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL, certificate_number VARCHAR(100) UNIQUE,
    issued_at TIMESTAMPTZ DEFAULT NOW(), issued_by UUID,
    digital_hash VARCHAR(64), ledger_block_id UUID
);
```

**Sem duplicação:** nenhuma tabela de pessoa no schema `training` — identidade e credenciais vivem no Núcleo (Parte 01).

---

## 6. REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. **Somente este ERP cria e vende cursos na RLoja**; demais ERPs não (BRE: `COURSE_SALES_ERP_TRAINING_ONLY`).
2. **Currículos das ISs (v2):** 121-006/007/008/011, 135-001/003 e 137-207 são criados e vendidos por este ERP; operadores 121/135 e ERP Agrícola contratam turma corporativa (`corporate_client_company_id`) — nunca criam currículo próprio.
3. Matrícula além do **dobro do período letivo** → cancelamento automático (regra S141).
4. **Certificado emitido em até 10 dias** após a conclusão; reemissão registrada.
5. Frequência e avaliações registradas por aula (ledger).
6. Aluno/instrutor: identidade e credenciais consultadas no Núcleo; certificados emitidos aqui aparecem no perfil profissional do aluno (evento para o Núcleo).
7. Compra pela RLoja gera matrícula com origem `RLOJA`; pagamento via Asaas; entrega do conteúdo digital após confirmação.
8. FSTD: dispositivo sem qualificação válida não pode ser usado em treinamento.
9. **Sem duplicação:** nenhuma tabela de pessoa no schema `training`.

---

## 7. ENDPOINTS DA API (resumo)

Todos sob `/api/training` (NestJS, módulo `training` do monorepo Nx), autenticados e com RLS por tenant; escritas ancoram bloco no ledger com `origin_app = ERP_CURSOS`:

- `POST /courses` · `PATCH /courses/:id` · `POST /courses/:id/publish-rloja` (único ERP autorizado) · `GET /courses`
- `POST /turmas` · `POST /turmas/:id/corporativa` (vincula `corporate_client_company_id`) · `GET /turmas`
- `POST /enrollments` (origem ERP/RLOJA/CORPORATIVO) · `PATCH /enrollments/:id/status`
- `POST /attendance` (por aula)
- `POST /fstd-devices` · `PATCH /fstd-devices/:id/qualification` · `POST /fstd-devices/:id/reservas`
- `POST /certificates/emit` (≤10 dias) · `POST /certificates/:id/reemitir`
- `POST /s141/sync` · `POST /s141/envio`
- Camada administrativa geral: endpoints padrão de RH, Financeiro (dupla entrada — seção 6 do CLAUDE.md v2), Compras e CRM.

---

## 8. FRONTEND ANGULAR (feature-lib `feature-training`)

- Feature-lib `libs/feature-training` na Shell SPA (Opção A — lazy loading por feature-lib, module boundaries preparados para desmembramento futuro — CLAUDE.md v2, seção 7).
- Padrões v2 obrigatórios (seção 18 da Parte 1 v2): **Angular moderno — signals, standalone components, `inject()`, controle de fluxo `@if/@for`**; nunca NgModules, nunca `*ngIf/*ngFor`.
- UI = Angular Material + Design System próprio (`@vortex/ui` com `ValidationBadge` N0–N3).
- Estado local com signals + NgRx ComponentStore (sem NgRx global); WebSockets para atualização de turmas/certificados.
- Consulta de alunos/instrutores sempre via API do Núcleo (sem cache local de pessoa).
- Publicação de curso na RLoja: fluxo de formulário com preview do anúncio (visão do curso, categoria "cursos" na RLoja).

---

## 9. TESTES OBRIGATÓRIOS (verbatim da v2)

1. Apenas este ERP publica curso na RLoja.
2. **Currículo de IS (121-006 etc.) criado por operador é rejeitado; contratado como turma corporativa é aceito.**
3. Matrícula no dobro do período letivo é cancelada.
4. Certificado sai em ≤10 dias; reemissão registrada.
5. Compra via RLoja cria matrícula e libera conteúdo digital após pagamento.
6. FSTD sem qualificação válida bloqueia uso.
7. Certificado emitido aqui reflete no perfil do aluno no Núcleo.
8. Ancoragem: turma, matrícula, frequência e certificado geram blocos no ledger.

---

## 10. CRITÉRIOS DE ACEITE (da Parte C v2, recorte Cursos)

- [ ] ERP Cursos com CRM/matrículas, catálogo de cursos (incluindo currículos das ISs 121-006/007/008/011, 135-001/003, 137-207 e turmas corporativas), FSTD, certificados (10 dias) e S141.
- [ ] Somente o ERP Cursos publica/vende cursos na RLoja.
- [ ] Camada administrativa geral (com Contabilidade de dupla entrada) operando.
- [ ] Vagas de RH integradas ao Recrutamento; sem duplicação de pessoa; sem comissão.
- [ ] Frontend Angular (feature-lib `feature-training`) conforme padrões v2.
- [ ] Testes verdes e lacunas listadas.

---

## 11. MAPA DE MÓDULOS (decomposição futura em pedaços menores)

Cada módulo abaixo será fragmentado em seções numeradas (M09.S01, M09.S02, …) para construção incremental:

- **M09.1 — Fundação do ERP (schema `training` + integração Núcleo):** S01 migrações do schema `training` (courses, turmas, enrollments, attendance, fstd_devices, certificates_issued) · S02 RLS multi-tenant + seeds RBAC (141/142/145-010) · S03 cliente do Núcleo (pessoas, empresas, credenciais) · S04 ancoragem no ledger (`origin_app = ERP_CURSOS`).
- **M09.2 — Cursos e RLoja:** S01 CRUD de cursos + conteúdo digital (MinIO/document-service) · S02 regra `COURSE_SALES_ERP_TRAINING_ONLY` no BRE · S03 publicação na RLoja + matrícula origem `RLOJA` + pagamento Asaas · S04 currículos das ISs (121-006/007/008/011, 135-001/003, 137-207).
- **M09.3 — Turmas corporativas e matrículas:** S01 turmas + agenda + instrutores · S02 turma corporativa (`corporate_client_company_id`) — operadores/agrícola contratam, nunca criam currículo · S03 matrículas (3 origens) + cancelamento S141 (dobro do período) · S04 frequência e avaliações por aula.
- **M09.4 — FSTD:** S01 dispositivos e qualificações · S02 bloqueio de uso sem qualificação válida · S03 reservas.
- **M09.5 — Certificados:** S01 emissão ≤10 dias + numeração + hash · S02 reemissão · S03 evento de perfil profissional no Núcleo · S04 bloco de assinatura padrão SEI (seção 5-B).
- **M09.6 — S141:** S01 sincronização com a ANAC · S02 envio de dados · S03 conformidade/reconciliação.
- **M09.7 — Camada administrativa geral:** S01 RH interno (instrutores/examinadores) + Vagas → Recrutamento · S02 Financeiro + Contabilidade de dupla entrada (seção 6) · S03 Compras + Comercial/CRM (pipeline → matrículas) · S04 Relatórios e Configuração (tipos de curso, matriz curricular, templates).
- **M09.8 — Frontend:** S01 feature-lib `feature-training` (rotas lazy + module boundaries) · S02 telas de Cursos/Turmas · S03 telas de FSTD/Certificados/S141 · S04 Dashboard e Relatórios.

---

## 12. FONTES v2

- `artifacts/vortex-v2/docs/prompts/parte-7.md` — PARTE A (ERP Cursos): objetivo, aderência, fundamentação, menus, schema `training`, regras, testes (conteúdo verbatim).
- `artifacts/vortex-v2/CLAUDE.md` — seções 3 (princípios), 4.1/4.2/4.3/4.4 (camadas, Recrutamento sem comissão, CRM por ERP), 5-A (ledger), 5-B (assinatura), 6 (contabilidade), 7 (Shell), 11 (aplicativos e subdomínios — linha 7: ERP Cursos `training.vortex.com`).
- `artifacts/vortex-v2/docs/10-navegacao-por-app.md` — §7 ERP Cursos (árvore de menus nível-clique).
- `artifacts/vortex-v2/docs/09-mapa-adaptacao-vortex.md` — §4.6 ERP Cursos e Treinamentos (menus) e CRM do ERP.
