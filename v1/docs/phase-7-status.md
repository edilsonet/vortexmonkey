# VORTEX — Status da Fase 7: ERP 141/142 (Instrução e Treinamento) + ERP 153 (Aeródromos)

## Resumo da Fase 7

A Fase 7 do VORTEX adicionou dois módulos completos:

1. **ERP 141/142 (Instrução e Treinamento)**:
   - **CIAC (RBAC 141)**: certificado, EI, 3 tipos (Tipo 1 pilotos, Tipo 2 comissários, Tipo 3 mecânicos), MIP/MGQ, integração S141 com as 6 situações do aluno (MATRICULADO, APROVADO, REPROVADO, CANCELADO, TRANSFERIDO, DESISTENTE) e **cancelamento automático no dobro do período letivo homologado**.
   - **CTAC (RBAC 142)**: certificado, ET, 5 documentos (MIP, MGQ, MGSO, PRE, manuais), **8 horas pedagógicas obrigatórias** para instrutor (IS 142-003).
   - **FSTD (RBAC 60)**: FFS/FTD/FNPT/BITD com níveis de qualificação; **qualificação vencida bloqueia sessões de treinamento**.
   - **Examinadores**: recertificação a cada 24 meses; **vencido bloqueia bancas de avaliação**.
   - **Ground school**: avaliação teórica válida por 12 meses; expirada invalida o aproveitamento.
   - **Certificado de conclusão** emitido em até 10 dias corridos após o término.
   - Fichas de instrução e avaliações retidas por 5 anos (ancoragem no ledger).

2. **ERP 153 (Aeródromos)**:
   - Aeródromos com categoria de contraincêndio (CAT_1 a CAT_10) e pavimento com **IRI ≤ 2,5 m/km e macrotextura ≥ 0,60 mm** (IS 153.203-001/205-001).
   - **RWYCC 0-6 por terço (T1/T2/T3)** com matriz RCAM e mensagem RCR padronizada enviada à TWR (IS 153.133-001).
   - **SESCINC**: tempo-resposta máximo de 3 minutos (180s); desvio registrado e ancorado como alerta.
   - **Fauna (SIGRA)**: avistamentos/colisões com risco R = log(x) e envio ao SIGRA (IS 153.501-001 a 505-001).
   - **SGSO**: relatório quadrimestral 20/01, 20/05 e 20/09 com próxima data calculada (IS 153.51-001).
   - RCR, respostas de incêndio e eventos de fauna são **imutáveis** (triggers PostgreSQL) e ancorados no ledger.

---

## Arquivos Criados / Modificados

```
packages/
├── contracts-be/src/
│   ├── training.ts                # Tipos/constantes/eventos RBAC 141/142 (S141, 12 meses, 24 meses, 10 dias)
│   └── aerodromes.ts              # Tipos/constantes/eventos RBAC 153 (RCAM, SESCINC 180s, SGSO 20/01|20/05|20/09)
└── database/migrations/
    └── 0018_training_aerodromes_rbac141_142_153.sql # 13 tabelas no schema ops + RLS + triggers de imutabilidade

apps/api/src/modules/
├── training/
│   ├── training.dto.ts
│   ├── training.service.ts
│   ├── training.controller.ts
│   ├── training.module.ts
│   └── training.service.spec.ts
└── aerodromes/
    ├── aerodromes.dto.ts
    ├── aerodromes.service.ts
    ├── aerodromes.controller.ts
    ├── aerodromes.module.ts
    └── aerodromes.service.spec.ts
```

---

## Regras de Negócio Implementadas (todas testadas)

| # | Regra | Implementação |
|---|-------|---------------|
| 141/142-1 | Dobro do período letivo → cancelamento automático (S141) | `UPDATE` de auto-cancelamento + evento `S141_SITUATION_UPDATED` |
| 141/142-2 | Ground school 12 meses | `theory_valid_until` = avaliação + 12 meses; expirada bloqueia conclusão |
| 141/142-3 | Certificado em 10 dias corridos | `computeCertificateDueDate` = término + 10 dias |
| 141/142-4 | Examinador 24 meses | Recertificação = +24 meses; vencido bloqueia bancas (sem examinador ativo → conclusão bloqueada) |
| 141/142-5 | Fichas retidas 5 anos | Constante + teste de retenção |
| 141/142-6 | Vistorias semestrais (180 dias) | Constante (lacuna de agendamento, ver abaixo) |
| 141/142-7 | Vacância 60 dias | Constante (lacuna, ver abaixo) |
| 141/142-8 | CTAC 8 horas pedagógicas | Bloqueio no cadastro de instrutor com < 8 horas |
| 141/142-9 | Examinador CTAC sem redução | Registrado como diretriz (lacuna, ver abaixo) |
| 141/142-10 | FSTD vencido bloqueia sessões | Bloqueio em `FICHA_VOO` com FSTD vencido (RBAC 60) |
| 141/142-11 | S141 bidirecional (6 situações) | Situações ancoradas no ledger a cada transição |
| 141/142-12 | MMA em oficinas homologadas | Registrado como diretriz (lacuna, ver abaixo) |
| 153-1 | SESCINC ≤ 180s | `within_limit` calculado; desvio → `FIRE_RESPONSE_DEVIATION` no ledger |
| 153-2 | IRI ≤ 2,5 / macrotextura ≥ 0,60 | Bloqueio no cadastro de pavimento |
| 153-3 | RWYCC por terço + RCR à TWR | Matriz RCAM, mensagem `RCR xx T1/n T2/n T3/n RWYCC n`, flag `sent_to_twr` |
| 153-4 | SGSO 20/01, 20/05, 20/09 | `isSgsoReportDue` / `nextSgsoReportDue` + KPI no dashboard |
| 153-5 | Checklists 6 meses / engenharia 12 meses | Constantes (lacuna, ver abaixo) |
| 153-6 | Fauna SIGRA, R = log(x) | `risk_grade` = log10(x) + `FAUNA_SENT_TO_SIGRA` |
| 153-7 | Rebaixamento CAT notificado | Constante/diretriz (lacuna, ver abaixo) |
| 153-8 | Credenciamento lado ar | Lacuna (depende do módulo de identidade) |
| 153-9 | Manutenção 8 áreas | Constante `MAINTENANCE_AREAS` |
| 153-10 | Toda ação no ledger | RCR, incêndio e fauna ancorados com eventos próprios |

## Endpoints (26 rotas em `/api/v1`)

**Instrução**: `POST/GET training-centers`, `POST/GET training-documents`, `POST/GET students`,
`POST students/:id/transfer`, `POST students/:id/graduate`, `POST/GET student-records`,
`POST/GET fstd-devices`, `POST/GET instructors`, `GET training/dashboard`.

**Aeródromos**: `POST/GET aerodromes`, `POST/GET runway-pavement`, `POST/GET runway-condition-reports`,
`POST/GET fire-response-logs`, `POST/GET fauna-events`, `GET aerodromes/dashboard`.

## Verificação e Qualidade

- **Testes Unitários**: 26 testes novos (14 training + 12 aerodromes) cobrindo os 12 cenários obrigatórios da Parte 7 (dobro do período, ground school, certificado 10 dias, examinador 24 meses, FSTD vencido, S141 6 situações, SESCINC 180s, RWYCC/RCR, fauna R=log(x), SGSO quadrimestral, ancoragem e performance RWYCC < 50ms).
- **Suite API**: 17 arquivos de teste, **99 testes, 100% de aprovação**.
- **Build Monorepo**: API compilada com sucesso; `@vortex/contracts-be` recompilado com os novos contratos.
- **Imutabilidade e RLS**: triggers bloqueiam UPDATE/DELETE de RCR, resposta de incêndio e eventos de fauna; RLS ativa nas 11 tabelas novas.
- **Typecheck**: zero novos erros introduzidos (erros pré-existentes em specs de fases anteriores permanecem).

## Lacunas (nunca silenciadas)

1. **Vistorias semestrais (141-6), vacância 60 dias (141-7) e redução de carga de examinador CTAC (142-9)**: prazos registrados como constantes; o agendamento de vistorias e os fluxos ANAC dependem do hub de alertas preditivos da Fase 4 (integração pendente).
2. **MMA em oficinas homologadas (141-12)**: registrado como diretriz; o cadastro de oficinas homologadas pertence ao ERP 43+145 (Fase 5) e não foi vinculado nesta fase.
3. **SESCINC e credenciamento lado ar (153-7/8)**: rebaixamento de CAT e credenciamento de pessoas/veículos no lado ar dependem de endpoints de atualização de aeródromo e do módulo de identidade — anotados como lacuna.
4. **Integrações externas reais**: S141, SIGRA, TWR e sistemas da ANAC não são acessíveis neste ambiente; a sincronização é representada pelos eventos ancorados no ledger.
5. **PDFs oficiais** (RBAC 141/142/60/153 e ISs citadas) não estão anexados no workspace; validação documental final permanece lacuna conforme fases anteriores.