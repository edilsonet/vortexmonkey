# VORTEX — Fase 7

ERP Cursos 141/142/145-010 (schema `training`) + ERP Aerodromos 153 (schema `airport`).

## Feito

- Migracao `0013_training_airport_rbac141_142_153.sql`: centros CIAC/CTAC, cursos, alunos S141, FSTD, instrutores; aerodromo, pavimento, RCR, SESCINC, fauna, SGSO, manutencao 8 areas + RLS
- Politica TR: S141 dobro do periodo; teoria 12 meses; certificado 10 dias; CTAC 8h pedagogicas; FSTD vencido bloqueia sessao; examinador inativo bloqueia banca
- Politica AP: SESCINC <=180s; IRI <=2,5 m/km; macrotextura >=0,60 mm; RCAM->RWYCC; fauna log10; SGSO 20/01 20/05 20/09
- RCR / SESCINC / fauna imutaveis (UPDATE/DELETE bloqueados salvo `ledger_block_id`)
- Escritas geram ledger; centro, certificado, aerodromo e desvio SESCINC geram protocolo
- UI TR: Dashboard, Cursos (catalogo/turmas/RLoja), FSTD, Certificados, S141
- UI AP: Dashboard, Pista (RWYCC/RCR/PCN), SESCINC, Fauna/SIGRA, Infra 8 areas, SGSO

## Smoke

- CIAC `CIAC-0001` protocolo `2026-000014`
- Matricula `S141-00001` max 12 meses; certificado `2026-000017` vencimento `2026-09-18`
- CTAC instrutor 7h recusado (`Instrutor CTAC exige 8 horas pedagogicas.`)
- FSTD vencido `QUALIFICACAO_VENCIDA` bloqueia sessao
- Aerodromo SBGL protocolo `2026-000018`; IRI 2,6 recusado; RCR GELO `RWYCC 0` TWR
- SESCINC 181s desvio protocolo `2026-000019`; fauna count 10 risk 1 SIGRA

## Nao feito

- Camada administrativa geral (RH/Financeiro/Contabilidade/Compras) dos ERPs — ainda stub
- CRM de matriculas (TR) e contratos/espacos (AP) — stub
- Qualidade/SGSO operacional alem da data de entrega; relatorios; config — stub
- Publicacao real do curso na RLoja (anuncio/comissao e Fase 8)
- Envio real SIGRA/TWR; homologacao ANAC S141; FSTD RBAC 60 operacional
- Programa S141/CHT detalhado; acervo de certificados alem da lista
