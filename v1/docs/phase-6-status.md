# VORTEX — Status da Fase 6: ERP de Operadores Aéreos e Aeroagrícola (RBAC 91/119/121/135/137)

## Resumo da Fase 6

A Fase 6 do VORTEX adicionou o módulo completo de operadores aéreos, cobrindo RBAC 91, 119, 121, 135 e 137:

1. **Gestão de Operadores e Certificação (RBAC 119)**:
   - Operadores com COA/EO, classificação SIMPLES/PADRAO (135) e certificação em 5 fases (`FASE_1` → `CERTIFICADO`).
   - Homologação ETOPS por operador (IS 121-012) com tempo de desvio homologado.

2. **Frota e MEL (RBAC 91 / IS 91-012)**:
   - Frota com repeso a cada 36 meses (IS 135-21-001) e categoria de aeronave (avião/helicóptero/jato/turboélice).
   - MEL com categorias A/B/C/D e prazo de diferimento automático por categoria (B = 3 dias, C = 10 dias, D = 120 dias).
   - **DA prevalece sobre MEL**: proibido diferir item se houver DA pendente aplicável.

3. **Logbook Digital (schema canônico `vortex_logbook_entries`)**:
   - Ciclo de vida completo `draft → signed → rectified → voided`, assinatura digital obrigatória com hash de conteúdo, endosso de instrutor e envio DBE.
   - Escrituração automática de horas/ciclos na caderneta da aeronave.

4. **Despacho Operacional (DOV)**:
   - Validação de combustível regulamentar (VFR +30/+45/+20 min; IFR sem alternativa 2 horas), met, peso e balanceamento, MEL, DA, CVA, repeso e ETOPS.
   - Liberação com assinatura digital do DOV; despacho liberado é documento imutável.

5. **Manuais Operacionais**: MGO, AOM, MCmsV, MGM, PTO, SOP e MIP com fluxo de aprovação.

6. **Aeroagrícola (RBAC 137)**: CDAG, dispersores (calibração vencida bloqueia uso), DGPS com Declaração de Conformidade (IS 137-002) e alerta de calibração em 30 dias.

---

## Arquivos Criados / Modificados

```
packages/
├── contracts-be/src/
│   └── operators.ts              # Tipos, constantes regulatórias (MEL, combustível, CVA, ETOPS, PAADV) e eventos
└── database/migrations/
    └── 0017_operators_rbac91_121_135_137.sql # Schema ops: operadores, frota, MEL, logbook, despacho, manuais, aeroagrícola

apps/api/src/modules/
└── operators/
    ├── operators.dto.ts
    ├── operators.service.ts
    ├── operators.controller.ts
    ├── operators.module.ts
    └── operators.service.spec.ts
```

---

## Regras de Negócio Implementadas (todas testadas)

| # | Regra | Implementação |
|---|-------|---------------|
| 1 | MEL vencido bloqueia o voo | Item `DIFERIDO` com prazo expirado → `BLOQUEADO` na validação de despacho |
| 2 | DA prevalece sobre MEL | Diferimento bloqueado com DA pendente; DA pendente bloqueia o despacho |
| 3 | Combustível VFR 135 | Avião +30 min (dia) / +45 min (noite); helicóptero +20 min |
| 4 | Combustível IFR sem alternativa | 2 horas (120 min) sobre o destino |
| 5 | Margem de desempenho sem met | Temperatura máxima prevista (±3h) + 4°C |
| 6 | Gatilhos PAADV | +5°C, -5 hPa, variação de vento > 1% (advisory no `validation_notes`) |
| 7 | Repeso de frota | 36 meses (IS 135-21-001); vencido bloqueia o despacho |
| 8 | Despacho bloqueado | Sem combustível regulamentar, met, P&B ou item MEL/DA pendente |
| 9 | CVA | 365 dias (IS 91-403-001), alerta 30 dias, bloqueio por não conformidade crítica |
| 10 | ETOPS | Despacho validado pelo tempo de desvio homologado; retenção 207 min por 5 anos (ancorada no ledger) |
| 11 | Relatório mensal ANAC | Prazo 15/mês registrado como diretriz operacional (ver lacunas) |
| 12 | Relatório semestral examinador 135 | Março e setembro (ver lacunas) |
| 13 | PSF 135 | Prazo fatal 30 dias; ROP antecedência 10 dias (ver lacunas) |
| 14 | FOP 224 | 30 dias para saneamento (ver lacunas) |
| 15 | AOM 180 dias / EGPWS 60 dias | Prazos de adequação (ver lacunas) |
| 16 | Logbook | Assinatura obrigatória; `draft/signed/rectified/voided`; endosso; envio DBE |
| 17 | Aeroagrícola | CDAG 3 iterações; dispersor com calibração vencida bloqueia; DGPS exige Declaração de Conformidade |

## Endpoints (26 rotas em `/api/v1`)

`POST/GET air-operators`, `POST/GET operator-fleet`, `POST/GET mel-items`, `POST mel-items/:id/defer`,
`POST/GET logbook-entries`, `POST logbook-entries/:id/sign|endorse|rectify|void`,
`POST/GET dispatch-releases`, `POST dispatch-releases/:id/validate|release`,
`POST/GET operational-manuals`, `POST/GET agri-operators`, `POST dispersers`, `GET dispersers/expiring`,
`GET operators/dashboard`, e extensão `POST aircraft/:id/cva`.

## Verificação e Qualidade

- **Testes Unitários**: 23 testes novos no `operators.service.spec.ts` cobrindo os 13 cenários obrigatórios da Parte 6 (MEL, DA, combustível VFR/IFR, margem +4°C, repeso, CVA, ETOPS, logbook, endosso/DBE, aeroagrícola, ancoragem no ledger e performance < 100ms).
- **Suite API**: 15 arquivos de teste, 73 testes, 100% de aprovação.
- **Build Monorepo**: API compilada com sucesso (`tsc -p tsconfig.build.json`); pacote `@vortex/contracts-be` recompilado.
- **Imutabilidade e RLS**: triggers bloqueiam UPDATE/DELETE de logbook anulado e de despacho liberado/executado; políticas RLS ativas em todas as tabelas novas; DAs e CVA ancorados no ledger.
- **Typecheck**: zero novos erros introduzidos (erros pré-existentes em specs de outras fases permanecem).

## Lacunas (nunca silenciadas)

1. **CVA, ETOPS e repeso**: colunas `cva_*` em `ops.aircraft` e `etops_*`/`aircraft_category` em `ops.air_operators`/`ops.operator_fleet` são extensões documentadas além do schema canônico do prompt — necessárias para as regras 7, 9 e 10.
2. **Relatórios regulatórios (regras 11-15)**: prazos (15/mês, março/setembro, PSF 30 dias, FOP 224, AOM 180 dias, EGPWS 60 dias) registrados como constantes/diretrizes; a geração automatizada dos relatórios ANAC e as máquinas de estado de PSF/ROP/FOP ficam para fase posterior, pois dependem do hub de alertas preditivos da Fase 4 (pendência de integração).
3. **CVA alerta 30 dias**: exposto no dashboard (KPI `expiringSoon`); a emissão programada de alertas via hub de alertas não foi integrada nesta fase.
4. **PAADV**: gatilhos calculados como advisory no `validation_notes`; o plano de ação (documento estruturado) pertence ao módulo de documentos da Fase 3.
5. **DBE**: envio marcado como flag + timestamp; a integração real com o sistema DBE da ANAC não é possível neste ambiente (depende de credenciais externas).
6. **PDFs oficiais** (RBAC 91/119/121/135/137, ISs citadas) não estão anexados no workspace; a validação documental final permanece lacuna conforme fases anteriores.