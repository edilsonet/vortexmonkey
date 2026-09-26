# VORTEX — docs/02: PARÂMETROS, PRAZOS E JOBS AUTOMATIZADOS (v2)

> **Versão 2 — 12/09/2026.** Os **valores oficiais permanecem intocados** (são dados regulatórios). Mudanças desta versão: destinos dos jobs atualizados para os 13 apps, nota de prevalência v2 e referência ao schema `accounting` (dupla entrada) no ciclo de cobrança.
> Estes são os VALORES OFICIAIS. Em qualquer divergência, prevalecem sobre valores gerados (ver `docs/07-delimitacao.md`). Em arquitetura, prevalece o `CLAUDE.md v2`.
> Nenhum parâmetro deve ser hardcoded — sempre lido dos seeds.

## 1. VALIDADES DE CERTIFICADOS E CREDENCIAMENTOS

| Parâmetro | Valor | Unidade | Norma | Alerta |
|-----------|-------|---------|-------|--------|
| Validade CVA (Certificado de Verificação de Aeronavegabilidade) | 365 | dias (1 ano civil) | IS 91-403-001 | 30 dias antes |
| Validade Credenciamento RBAC 183 | 1095 | dias (3 anos) | IS 183-002 | 60 dias antes |
| Credenciamento Provisório SDEA (IS 183-001) | 365 | dias (1 ano) | IS 183-001 | — |
| Validade Certificados Instrutor 135 | 4 | anos (máx. da emissão) | IS 135-004 | — |
| Validade Exame Toxicológico (PPSP, janela longa) | 90 | dias | RBAC 120 / IS 120-002D | 15 dias antes |
| Recertificação Examinadores CIAC/CTAC | 24 | meses | RBAC 141/142 | — |
| Validade Avaliação Teórica Ground School | 12 | meses | IS 141-006 | — |

## 2. RETENÇÕES LEGAIS (nunca apagar antes do prazo)

| Registro | Retenção | Norma |
|----------|----------|-------|
| Registros de Manutenção | 1 ano após retirada definitiva de serviço | RBAC 43.9/43.11, IS 43.9-002 |
| Fichas de Instrução CIAC | 5 anos | IS 141-006 |
| Registros de Segurança SGSO | 5 anos | RBAC 121/135/153 |
| Despacho ETOPS 207 min | 5 anos | IS 121-012 |
| Despacho Operacional | 30 dias | RBAC 121.695/135.401 |
| Inspeções de Aspectos Críticos de Aeródromos | 6 meses | IS 153.63-001 |
| **Histórico de assinatura encerrada (ledger)** | **mínimo 5 anos (legível, congelado)** | **v2 — seção 5-A do contrato** |

## 3. PRAZOS DE MEL (Lista de Equipamentos Mínimos)

| Categoria | Prazo | Equivalência | Norma |
|-----------|-------|--------------|-------|
| A | Prazo especificado no documento | — | IS 91-012 |
| B | 3 dias corridos | 72 horas | IS 91-012 |
| C | 10 dias corridos | 240 horas | IS 91-012 |
| D | 120 dias corridos | — | IS 91-012 |

- Revisão de MEL: 60 dias por impacto de alteração técnica; 30 dias se notificado pela ANAC.
- Migração de MELs antigas (IAC 3507): 60 dias.

## 4. COMBUSTÍVEL E DESEMPENHO (RBAC 135)

| Cenário | Reserva | Norma |
|---------|---------|-------|
| VFR avião (dia) | +30 min | IS 135-006 |
| VFR avião (noite) | +45 min | IS 135-006 |
| VFR helicóptero | +20 min | IS 135-006 |
| IFR turboélice/jato sem alternativa | 2 horas sobre o destino | IS 135-006/135.223 |
| Margem de desempenho sem estação met | Temp. máx. prevista (±3h) + 4°C | IS 135-007 |
| Gatilhos PAADV | +5°C, -5 hPa, variação >1% | IS 135-007 |

## 5. PRAZOS DE PROCESSOS E CERTIFICAÇÃO

| Processo | Prazo | Norma |
|----------|-------|-------|
| PSF RBAC 135 | Prazo fatal de 30 dias (sem dilação) | IS 119-004 |
| ROP (Reunião de Orientação Prévia) | Antecedência mínima de 10 dias | IS 119-004 |
| FOP 224 (manuais 135) | 30 dias para saneamento | IS 119-004 |
| Adequação AOM | 180 dias | IS 121-004 |
| Atualização base EGPWS | 60 dias | IS 121-020 |
| Repeso de frota (até 9 assentos) | 36 meses | IS 135-21-001 |
| Emissão certificado conclusão CIAC | até 10 dias corridos | IS 141-001 |
| Conclusão curso S141 | limite de 2x a duração homologada | IS 141-001 |
| Comunicação de vacância de cargos | 60 dias | IS 141-004 |
| Vistorias semestrais CIAC | 2x/ano (máx. 180 dias entre) | IS 141-005 |
| Carga horária pedagógica CTAC | 8 horas (inicial) | IS 142-003 |

## 6. PROCESSO CDAG (RBAC 137 — ERP Agrícola)

| Regra | Valor |
|-------|-------|
| Iterações de análise (Etapa I) | máx. 3 |
| Inércia por 30 dias | desistência tácita |
| Vacância do RT por 30 dias | suspensão cautelar |
| Suspensão por 360 dias | cassação sumária |

## 7. AERÓDROMOS (RBAC 153 — ERP Aeródromos)

| Parâmetro | Valor | Norma |
|-----------|-------|-------|
| Tempo-resposta SESCINC | máx. 3 minutos | IS 153.409-001 |
| IRI longitudinal | ≤ 2,5 m/km | IS 153.205-001 |
| Macrotextura superficial | ≥ 0,60 mm | IS 153.205-001 |
| Retenção checklists | 6 meses | IS 153.63-001 |
| Ações corretivas de engenharia | 12 meses | IS 153.73-001 |
| Relatório quadrimestral SGSO | 20/01, 20/05, 20/09 | IS 153.51-001 |

## 8. JOBS AUTOMATIZADOS (cron / BullMQ — destino v2)

| Job | Frequência | Norma | Destino (v2) |
|-----|-----------|-------|--------------|
| Relatório Mensal ANAC (IS 121-023) | dia 15 de cada mês | IS 121-023 | ERP Operadores |
| Relatório Semestral Piloto Examinador 135 | março e setembro | IS 135-001 | ERP Operadores |
| Relatório Quadrimestral de Aeródromo | 20/01, 20/05, 20/09 | IS 153.51-001 | ERP Aeródromos |
| Relatório de Interação Credenciamento 183 | a cada 3 anos | IS 183-002 | Rconta (credenciamentos) |
| Verificação de integridade do Ledger | a cada 6 horas | Res. 458 | Núcleo (ledger-service) |
| Varredura de alertas preditivos | a cada 6 horas | — | Hub de Alertas (notification-service) |
| Ciclo de cobrança (billing) | diário | — | subscription-service (assinaturas + comissões RLoja/Travel/Fretamento) |
| **Backup: snapshot diário + WAL contínuo** | **diário + contínuo** | **v2 — seção 5-A.6** | **Núcleo → destino offsite (segundo VPS/WORM)** |
| **Teste de restauração de backup** | **trimestral** | **v2 — seção 5-A.6** | **Núcleo (ambiente isolado)** |

## 9. RECENTICIDADE E ELEGIBILIDADE

| Regra | Valor | Norma |
|-------|-------|-------|
| Recenticidade de piloto | 3 pousos em 90 dias OU 5h no tipo/classe | RBAC 61.21 |
| Experiência prévia examinador MMA | 36 meses | IS 183-003 |
| Manutenção credenciamento examinador 121 | mín. 2 exames/12 meses + 1 supervisão/24 meses | IS 121-002 |
| Atividade profissional MMA | 6 meses nos últimos 24 meses | RBAC 65 |

## 10. REGRAS DE NEGÓCIO CRÍTICAS (resumo — consumidas pelo BRE)

1. Credenciamento expirado (3 anos) → bloqueio automático + alerta 60 dias antes.
2. Licença, CMA ou credenciamento vencido → bloqueio do profissional.
3. Exame toxicológico vencido (90 dias) → bloqueio da função crítica (ARSO).
4. Item MEL vencido → bloqueio do voo.
5. DA aplicável pendente → prevalece sobre a MEL (proibido relaxar).
6. Despacho bloqueado se faltar combustível regulamentar.
7. Ferramenta com calibração vencida → bloqueio de uso na OS.
8. Peça com etiqueta vermelha → bloqueio de instalação.
9. OS não aprovada para retorno sem assinatura de profissional habilitado.
10. Grande reparo/alteração → SEGVOO 001 antes do retorno.
11. **Matrícula de aeronave deve bater com o RAB** (v2 — docs/06, injetada no contrato).
12. **Tarefa de manutenção consome o recorte do manual apenas com assinatura de Publicações** (v2 — sem assinatura, obtenção por fora).

## 11. MUDANÇAS DA v1 → v2 NESTE DOCUMENTO
1. **Seção 8:** destinos dos jobs atualizados para os 13 apps; jobs de backup e teste de restauração adicionados (seção 5-A.6 do contrato).
2. **Seção 2:** retenção de 5 anos do histórico de assinatura encerrada adicionada (seção 5-A do contrato).
3. **Seção 6:** título apontando para o ERP Agrícola; **seção 7** apontando para o ERP Aeródromos.
4. **Seção 10:** regras 11 (RAB) e 12 (recorte de Publicações) adicionadas.
5. Nota de prevalência v2 no cabeçalho.
