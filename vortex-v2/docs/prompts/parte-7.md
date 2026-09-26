# VORTEX — PARTE 7/10 (v2): ERP CURSOS E TREINAMENTOS (141/142/145-010 + ISs) E ERP AERÓDROMOS (153)

> **Versão 2 — 12/09/2026.** Reformulada: pessoas vindas do **Núcleo** (não mais da Rconta), ERP Cursos com as **ISs 121-006/121-007/121-008/121-011/135-001/135-003/137-207**, ERP Aeródromos com **pousos e decolagens** no escopo operacional, frontend Angular, e camada administrativa com Contabilidade de dupla entrada.
> **Instrução ao agente de código:** engenheiro sênior em instrução aeronáutica (CIAC/CTAC, S141), FSTD, aeródromos (RBAC 153, SESCINC, SIGRA) e SGSO. Construa os dois ERPs do VORTEX com rigor, TypeScript estrito, migrações SQL e testes. Execute completo.

---

# PARTE A — ERP CURSOS E TREINAMENTOS (141/142/145-010 + 121-006/007/008/011/135-001/003/137-207)

## A1. OBJETIVO
1. **Comercial/CRM do domínio**: prospecção de alunos → matrículas.
2. **Catálogo de cursos (produto digital)**: único ERP autorizado a criar e **vender cursos na RLoja**.
3. **Turmas**: alunos (do Núcleo), instrutores, agenda, frequência, avaliações.
4. **Simuladores (FSTD)**: dispositivos e qualificações.
5. **Certificados**: emissão (prazo 10 dias), diplomas.
6. **Integração S141** (ANAC).
7. **Camada administrativa geral** (RH, Financeiro, Contabilidade de dupla entrada, Compras) + RH interno + Vagas.
8. **Frontend Angular** (feature-lib `feature-training`).

## A2. ADERÊNCIA À ARQUITETURA CENTRAL
- Alunos e instrutores são **pessoas do Núcleo** (curso/treinamento/certificado do instrutor ficam no perfil profissional, com selo N0–N3).
- **Cursos só podem ser vendidos por este ERP** (regra de negócio global — BRE: `COURSE_SALES_ERP_TRAINING_ONLY`). Operadores, Manutenção, Agrícola e Aeródromos têm treinamento interno para funcionários, mas **não vendem cursos**.
- O curso vendido na RLoja entrega **conteúdo digital** via document-service (presigned URL/download após pagamento); não fica no estoque físico.
- Toda turma, matrícula, frequência e certificado gera bloco no Ledger (`origin_app = ERP_CURSOS`).
- **Vagas do RH** → Recrutamento (sem comissão).

## A3. FUNDAMENTAÇÃO
RBAC 141 (CIAC), RBAC 142 (CTAC), integração S141; FSTD (qualificação de simuladores); matrícula no **dobro do período letivo → cancelamento** (regra S141); certificados em até **10 dias**.
**ISs associadas (v2):** 121-006/121-007/121-008/121-011 (PTO, LOFT, recertificação de tripulação 121), 135-001/135-003 (examinadores e PTO 135), 137-207 (treinamento aeroagrícola) — os currículos destas ISs são criados e vendidos por este ERP; os operadores 121/135 e o ERP Agrícola **contratam** o treinamento (turma fechada/corporativa), nunca o criam.

## A4. ESTRUTURA DE MENUS
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

## A5. ENTIDADES PRINCIPAIS (schema `training`)
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

## A6. REGRAS DE NEGÓCIO (CURSOS)
1. **Somente este ERP cria e vende cursos na RLoja**; demais ERPs não (BRE: `COURSE_SALES_ERP_TRAINING_ONLY`).
2. **Currículos das ISs (v2):** 121-006/007/008/011, 135-001/003 e 137-207 são criados e vendidos por este ERP; operadores 121/135 e ERP Agrícola contratam turma corporativa (`corporate_client_company_id`) — nunca criam currículo próprio.
3. Matrícula além do **dobro do período letivo** → cancelamento automático (regra S141).
4. **Certificado emitido em até 10 dias** após a conclusão; reemissão registrada.
5. Frequência e avaliações registradas por aula (ledger).
6. Aluno/instrutor: identidade e credenciais consultadas no Núcleo; certificados emitidos aqui aparecem no perfil profissional do aluno (evento para o Núcleo).
7. Compra pela RLoja gera matrícula com origem `RLOJA`; pagamento via Asaas; entrega do conteúdo digital após confirmação.
8. FSTD: dispositivo sem qualificação válida não pode ser usado em treinamento.
9. **Sem duplicação:** nenhuma tabela de pessoa no schema `training`.

## A7. TESTES (CURSOS)
1. Apenas este ERP publica curso na RLoja.
2. **Currículo de IS (121-006 etc.) criado por operador é rejeitado; contratado como turma corporativa é aceito.**
3. Matrícula no dobro do período letivo é cancelada.
4. Certificado sai em ≤10 dias; reemissão registrada.
5. Compra via RLoja cria matrícula e libera conteúdo digital após pagamento.
6. FSTD sem qualificação válida bloqueia uso.
7. Certificado emitido aqui reflete no perfil do aluno no Núcleo.
8. Ancoragem: turma, matrícula, frequência e certificado geram blocos no ledger.

---

# PARTE B — ERP AERÓDROMOS (153)

## B1. OBJETIVO
1. **Comercial/CRM do domínio**: contratos (operadores, lojas, espaços, slots).
2. **Infraestrutura**: pista/taxiway/pátio, pavimento (PCN/IRI/macrotextura), sinalização/iluminação.
3. **Operações**: **pousos e decolagens**, RWYCC/RCR, inspeções/checklists, credenciamento de acesso (lado ar).
4. **SESCINC** (contraincêndio): viaturas, agentes, tempo-resposta ≤ 3 min.
5. **Fauna/SIGRA**: registros, risco, relatórios.
6. **Manutenção (8 áreas críticas)** e **SGSO aeroportuário** (relatórios quadrimestrais).
7. **Camada administrativa geral** + RH interno + Vagas.
8. **Frontend Angular** (feature-lib `feature-airport`).

## B2. ADERÊNCIA À ARQUITETURA CENTRAL
- Aeródromo é `identity.companies` (certificado AERODROMO_153); operadores/lojistas são empresas/pessoas do Núcleo.
- Credenciamento de acesso usa dados do Núcleo (identidade validada N2/N3).
- Toda inspeção, evento de fauna, ocorrência SESCINC, **movimento de pouso/decolagem** e contrato gera bloco no Ledger (`origin_app = ERP_AERODROMOS`).
- Estoque de materiais usa o catálogo do Núcleo; vagas de RH vão ao Recrutamento.

## B3. FUNDAMENTAÇÃO
RBAC 153 (aeródromos: 8 áreas críticas de manutenção — sinalização horizontal/vertical, iluminação, pavimento, etc.), SESCINC (tempo-resposta ≤ 3 minutos), SIGRA (gestão de risco da fauna), SGSO aeroportuário (relatórios quadrimestrais). **v2: pousos e decolagens integram o escopo operacional** (registro de movimentos, controle de compatibilidade RWYCC/operação).

## B4. ESTRUTURA DE MENUS
| Menu | Conteúdo |
|------|----------|
| **Dashboard** | RWYCC atual · SESCINC · fauna · inspeções · **movimentos de pousos/decolagens** · contratos |
| **Comercial/CRM** | Pipeline → Contratos (operadores, lojas, espaços, slots) |
| **Infraestrutura** | Pista/Taxiway/Pátio · Pavimento (PCN/IRI/macrotextura) · Sinalização · Iluminação · Cerca/patrimônio |
| **Operações** | **Pousos e decolagens (v2)** · RWYCC/RCR · Inspeções (checklists) · Credenciamento de acesso (lado ar) · Obra/trabalho em pátio |
| **SESCINC** | Viaturas · Agentes · Tempo-resposta · Exercícios |
| **Fauna/SIGRA** | Registros de fauna · Risco · Mitigação · Relatórios |
| **Manutenção (8 áreas)** | Ordens por área crítica · Equipamentos · Infraestrutura |
| **SGSO** | Perigos · Riscos · Relatórios quadrimestrais |
| **RH interno / Vagas** | Funcionários · Credenciais · vagas → Recrutamento |
| **Administrativo geral** | RH · Financeiro · **Contabilidade (dupla entrada)** · Compras |
| **Relatórios / Configuração** | Indicadores operacionais · Áreas críticas · Checklists · Templates |

## B5. ENTIDADES PRINCIPAIS (schema `airport`)
```sql
CREATE TABLE airport.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, contract_type VARCHAR(30) NOT NULL, -- OPERADOR/LOJA/ESPACO/SLOT
    counterparty_company_id UUID, counterparty_person_id UUID,
    start_date DATE, end_date DATE, status VARCHAR(20) DEFAULT 'ATIVO',
    ledger_block_id UUID
);

CREATE TABLE airport.pavement_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, segment VARCHAR(30) NOT NULL, -- RWY/TWY/APRON
    pcn VARCHAR(50), iri NUMERIC(5,2), macrotexture NUMERIC(5,2),
    last_inspection DATE, next_inspection DATE, status VARCHAR(20) DEFAULT 'OPERACIONAL',
    ledger_block_id UUID
);

CREATE TABLE airport.rwycc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, rwy VARCHAR(10), third VARCHAR(10),
    rwycc VARCHAR(10) NOT NULL, -- 0-6
    contamination VARCHAR(50), observed_at TIMESTAMPTZ DEFAULT NOW(),
    rcr_actual INT, rcr_required INT, released BOOLEAN DEFAULT FALSE,
    ledger_block_id UUID
);

-- v2: registro de movimentos (pousos e decolagens)
CREATE TABLE airport.movement_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('POUSO','DECOLAGEM')),
    rwy VARCHAR(10) NOT NULL,
    aircraft_registration VARCHAR(10),
    operator_company_id UUID,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rwycc_at_movement VARCHAR(10),       -- RWYCC vigente no momento
    operation_compatible BOOLEAN NOT NULL DEFAULT TRUE, -- compatibilidade RWYCC/operação
    flight_ref VARCHAR(30),              -- referência ao voo (quando 121/135)
    ledger_block_id UUID
);

CREATE TABLE airport.sescinc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, occurrence_type VARCHAR(50), category VARCHAR(20),
    response_time_seconds INT NOT NULL, vehicles JSONB DEFAULT '[]',
    agents_status VARCHAR(20) DEFAULT 'OK', extinguishant_level VARCHAR(20),
    occurred_at TIMESTAMPTZ DEFAULT NOW(), ledger_block_id UUID
);

CREATE TABLE airport.wildlife_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, species VARCHAR(100), risk_level VARCHAR(20),
    mitigation TEXT, event_date TIMESTAMPTZ DEFAULT NOW(), sigra_status VARCHAR(20),
    ledger_block_id UUID
);

CREATE TABLE airport.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, checklist_type VARCHAR(50) NOT NULL,
    area VARCHAR(30) NOT NULL, findings JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'CONCLUIDA', inspected_by UUID,
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## B6. REGRAS DE NEGÓCIO (AERÓDROMOS)
1. **SESCINC:** tempo-resposta ≤ **3 minutos** (se exceder → CRITICAL + alerta).
2. **RWYCC rebaixado** bloqueia operações compatíveis (alerta imediato; RCR atual vs. requerido).
3. **Pousos e decolagens (v2):** todo movimento é registrado (`movement_log`) com RWYCC vigente e verificação de **compatibilidade RWYCC/operação** — pouso/decolagem em RWYCC incompatível é bloqueado e gera CRITICAL.
4. **Pavimento:** inspeções periódicas (IRI/macrotextura); vencida → WARNING e restrição quando aplicável.
5. **Agente extintor abaixo do mínimo** → CRITICAL/BLOCKING para pousos/decolagens.
6. **Fauna:** registro obrigatório; nível de risco alimenta SIGRA e restrições.
7. **Credenciamento de acesso (lado ar):** identidade validada (N2/N3) via Núcleo; credencial vencida bloqueia.
8. **Manutenção nas 8 áreas críticas** com ordens por área; cada checklist/inspeção registra no ledger.
9. **SGSO:** perigos e riscos com relatório **quadrimestral** (20/01, 20/05, 20/09).
10. **Vagas do RH** (operadores de equipamentos, bombeiros, etc.) vão ao Recrutamento; contratação cria vínculo automático — sem comissão.
11. **Sem duplicação:** nenhuma tabela de pessoa no schema `airport`.

## B7. TESTES (AERÓDROMOS)
1. Tempo-resposta SESCINC > 3 min gera CRITICAL.
2. RWYCC rebaixado bloqueia operação correspondente.
3. **Movimento (pouso/decolagem) em RWYCC incompatível é bloqueado e gera CRITICAL; movimento registrado com RWYCC vigente.**
4. Pavimento com inspeção vencida gera WARNING/restrição.
5. Agente extintor abaixo do mínimo bloqueia.
6. Credencial de acesso vencida bloqueia entrada no lado ar.
7. Evento de fauna registrado alimenta SIGRA.
8. Relatório quadrimestral do SGSO gerado nas datas oficiais.
9. Contrato vencendo gera alerta (WARNING 30 dias).
10. Ancoragem: movimento, inspeção, fauna e SESCINC geram blocos no ledger.

---

# PARTE C — CRITÉRIOS DE ACEITE COMUNS (PARTE 7)
- [ ] ERP Cursos com CRM/matrículas, catálogo de cursos (incluindo currículos das ISs 121-006/007/008/011, 135-001/003, 137-207 e turmas corporativas), FSTD, certificados (10 dias) e S141.
- [ ] Somente o ERP Cursos publica/vende cursos na RLoja.
- [ ] ERP Aeródromos com contratos, infraestrutura, operações (**pousos/decolagens com registro de movimentos e compatibilidade RWYCC**), SESCINC, fauna/SIGRA, manutenção 8 áreas, SGSO quadrimestral.
- [ ] Camadas administrativas gerais (com Contabilidade de dupla entrada) operando nos dois ERPs.
- [ ] Vagas de RH integradas ao Recrutamento; sem duplicação de pessoa; sem comissão.
- [ ] Frontend Angular (feature-libs `feature-training` e `feature-airport`) conforme padrões v2.
- [ ] Testes verdes e lacunas listadas.
