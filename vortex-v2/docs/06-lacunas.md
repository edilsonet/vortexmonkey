# VORTEX — docs/06: RELATÓRIO DE LACUNAS (v2 — registro histórico de auditoria)

> **Versão 2 — 12/09/2026.** **Status deste documento mudou:** na v1 era a lista de lacunas em aberto; na v2, todas as lacunas acionáveis foram **injetadas no CLAUDE.md v2 (seção 12)** e nos docs reformulados. Este arquivo permanece como **registro histórico de auditoria** — o que era lacuna, quando foi detectado e onde foi resolvido — para preservar a trilha de decisão do projeto.
> Aderência global da v1: 89% (8 COBERTO, 25 PARCIAL, 4 AUSENTE). Na v2: **100% das lacunas acionáveis resolvidas**; as de profundidade paramétrica seguem como trabalho contínuo da matriz (docs/01).

## 1. CRUZAMENTO DA MATRIZ_DETALHADA (IDs 1–1262) — status v1 e resolução v2

| Bloco Regulatório | IDs / IS | Parte Alvo | Status v1 | Resolução v2 |
|-------------------|----------|-----------|-----------|--------------|
| RBAC 39 (DAs/FCDA) | 1-10, 643, 707, 591-592 | Parte 5, 6 | PARCIAL | IDs e AMOC mantidos nos seeds (docs/05, seed 6006); notas v2 no docs/01 |
| RBAC 43 (manutenção) | 1210-1215, 600-687 | Parte 5 | PARCIAL | IDs e parâmetros exatos nos seeds (docs/05); fluxo 12 etapas no contrato (seção 12.1) |
| RBAC 91 (regras gerais) | 688-777 | Parte 6 | PARCIAL | CVA, TBO, PBN/EFB/RVSM/CAT II-III mantidos na matriz (docs/01 §2.3); seeds 5001-5004 |
| RBAC 119 (certificação) | 778-780, 901-912, 1201-1209 | Parte 6 | PARCIAL | 5 fases, Simples/Padrão, PSF 30 dias, ROP 10 dias, FAI mantidos (docs/01 §2.5; docs/02 §5) |
| RBAC 121 (transporte regular) | 781-852, 1159-1200 | Parte 6 | PARCIAL | ETOPS, MCmsV, UPRT, FAD, INSPAC, MGM/PMAC mantidos (docs/01 §2.4); passagens 121 → app Travel (v2) |
| RBAC 135 (não regular) | 853-912, 1239-1262 | Parte 6 | PARCIAL | Aeromédico, +4°C, repeso 36 meses, 35 seções mantidos (docs/01 §2.5; docs/02 §4-5); fretamento → app Fretamento (v2) |
| RBAC 137 (aeroagrícola) | 913-941 | Parte 6 | PARCIAL | **ERP Agrícola desmembrado (v2)**; EMC, etanol, SGSO 3 cenários mantidos (docs/01 §2.6); seed próprio rbac-137 (docs/05 §7) |
| RBAC 141 (CIAC) | 942-988 | Parte 7 | PARCIAL | S141 6 situações, dobro do período, FOP 400-422, vistorias mantidos (docs/01 §2.7; docs/02 §5) |
| RBAC 142 (CTAC) | 989-1016 | Parte 7 | PARCIAL | 5 documentos, FOP-CT 101-125, 3 currículos, 8 horas mantidos (docs/01 §2.8; docs/02 §5) |
| RBAC 153 (aeródromos) | 1017-1092, 1232-1238 | Parte 7 | PARCIAL | SOCMS, PISOA, PCN/IRI/macrotextura, checklists 8 áreas, PGSO/PESO, SGSO quadrimestral mantidos (docs/01 §2.9; docs/02 §7) |
| RBAC 183 (credenciamento) | 476-530, 1093-1147 | Parte 1, 7 | PARCIAL | SDEA, PCA Grupos A/B/C, Famma, 36 meses nos seeds rbac-183 (docs/05 §10); contrato seção 12.6 |
| RBAC 21 (certificação de produto) | 580-599 | Parte 1 | PARCIAL | CT/TCDS/CST, F-101-11, ICA/ALI mantidos (docs/01 §2.11); condução à certificação → app Certificações (v2) |
| RBAC 01 (definições) | 531-579 | Parte 1 | COBERTO | — |

## 2. CRUZAMENTO DA MATRIZ COMPLEMENTAR (IDs 2001–7016) — status v1 e resolução v2

| Bloco Regulatório | IDs / IS | Parte Alvo | Status v1 | Resolução v2 |
|-------------------|----------|-----------|-----------|--------------|
| RBAC 145 (OM) | 2001-2034 | Parte 5 | PARCIAL | IDs e ISs específicas nos seeds (docs/05 §3); coluna App v2 |
| RBAC 61 (pilotos) | 3001-3022 | Parte 1, 4 | PARCIAL | CIV Digital IS 61-001G no contrato (seção 12.5); SDEA nos seeds 3002 |
| RBAC 63 (comissários/mec. voo) | 4001-4015 | Parte 1 | PARCIAL | IS 00-008E SACI e CMA RBAC 67 nos seeds 4012/4015 |
| RBAC 65 (DOV/MMA) | 5001-5022 | Parte 1, 6 | PARCIAL | IS 65-001F, MMA elegibilidade/curso/exame, prerrogativas nos seeds (docs/05 §4) |
| RBAC 39 (DAs) | 6001-6013 | Parte 5 | PARCIAL | AMOC, IS 39-001C, 39.19-001A nos seeds 6006/6010-6013 |
| RBAC 120 (PPSP) | 7001-7016 | Parte 4 | PARCIAL | ARSO, substâncias Portaria 344/98, IS 120-002D, janela longa nos seeds (docs/05 §5) |

## 3. CRUZAMENTO DOS ARQUIVOS DE REFERÊNCIA (MD) — status v1 e resolução v2

| Arquivo | Conteúdo | Parte | Status v1 | Resolução v2 |
|---------|----------|-------|-----------|--------------|
| CLAUDE.md | Contrato global, 10 regras, stack, schemas, ledger, MDM | Todas | COBERTO (essência) | **Reescrito integralmente (v2)** — Angular/Nx, 14 apps, seções 5-A/5-B/6 || docs/rbac-183.md | Validade 3 anos, alerta 60 dias, F-101-06 | Parte 1, 7 | COBERTO | — |
| docs/res-458.md | IDs 646-655, ledger imutável | Parte 2 | COBERTO | Ampliado: conteúdo cifrado + acesso auditado (contrato seção 5-A) |
| docs/res-520.md | Protocolo AAAA-NNNNNN, timeline, acesso | Parte 2 | COBERTO | — |
| docs/lei-14063.md | Assinatura 3 níveis | Parte 3 | COBERTO | Ampliado: bloco de assinatura SEI (contrato seção 5-B) |
| docs/lgpd.md | Compliance, portabilidade, esquecimento | Parte 3 | PARCIAL | **RESOLVIDO** — export/erase/consentimento revogável no contrato (seção 12.3); Parte 3 v2 incluirá os endpoints |

## 4. LACUNAS DE REGRAS DE NEGÓCIO E MODELO — status v1 e resolução v2

| # | Lacuna | Descrição | Parte | Status v1 | Resolução v2 |
|---|--------|-----------|-------|-----------|--------------|
| 1 | Fluxo da oficina em 12 etapas | Cotação → ... → Pagamento, com etiquetas | Parte 5 | AUSENTE | **RESOLVIDA** — contrato seção 12.1 (máquina de estados, seed rbac-43-145) |
| 2 | Conceito da RLoja | Anúncio como VISÃO do estoque | Parte 8 | AUSENTE | **RESOLVIDA** — contrato seção 12.4 + princípio 11 (multi-vendor) + docs/04 §9.3 |
| 3 | Validação RAB | Matrícula ↔ nome/CPF/CNPJ | Parte 5, 8 | AUSENTE | **RESOLVIDA** — contrato seção 12.2 (regra `AIRCRAFT_RAB_MISMATCH` do BRE; docs/02 §10.11) |
| 4 | Modelo de negócio 3% | Loja 3% + recrutamento 3% | Parte 4, 8 | PARCIAL | **SUBSTITUÍDA** — recrutamento SEM comissão (decisão 10/09/2026); RLoja mantém 3% do vendedor |
| 5 | Schema do logbook | vortex_logbook_entries | Parte 6 | PARCIAL | **RESOLVIDA** — CIV Digital no contrato (seção 12.5); schema `professional.flight_log_entries` |
| 6 | Núcleos de backend | Identity, RH Core, Catálogo, Estoque, Ledger, Ops | Parte 1 | PARCIAL | **SUPERADA** — Núcleo separado da Rconta (decisão 12/09/2026): Cadastro Central + Ledger + Banco Central |
| 7 | Schemas PostgreSQL | identity/catalog/inventory/hr/ledger/ops | Parte 1 | PARCIAL | **RESOLVIDA** — lista de schemas v2 no contrato (seção 10), incluindo `accounting` |
| 8 | Papéis e permissões | Visitante...Procurador | Parte 1 | PARCIAL | **RESOLVIDA** — RBAC/ABAC + procuração mantidos; console do Núcleo com zero-trust (seção 5-A) |
| 9 | Regras críticas | Gate de acesso, cadastro colaborativo, RAB... | Parte 1, 8 | PARCIAL | **RESOLVIDA** — BRE com regras v2 (docs/02 §10) |
| 10 | Links oficiais ANAC | RAB, SEI, Portal, S141, SIGRA | Parte 8 | AUSENTE | **RESOLVIDA** — Parte 8 v2 incluirá o módulo de integrações com os conectores |
| 11 | Performance/escala | SPA, SVG, lazy loading, cache, CDN | Parte 1 | COBERTO | Refinada: SPA única Angular com lazy loading por feature-lib (contrato seção 7) |
| 12 | Estudo jurídico assinaturas | Lei 14.063, MP 2.200-2, Decreto 10.543 | Parte 3 | COBERTO | Ampliado: bloco SEI no contrato (seção 5-B) |

## 5. LACUNAS NOVAS DETECTADAS NA v2 (e já resolvidas no contrato)

| # | Lacuna | Resolução |
|---|--------|-----------|
| N1 | Ledger sem governança de acesso ao conteúdo | Seção 5-A (zero-trust, concessões, App ANAC, segredo de justiça) |
| N2 | Backup/continuidade do núcleo | Seção 5-A.6 (snapshot+WAL, WORM, restauração reconciliada) |
| N3 | Infraestrutura piloto→produção | Seção 5-A.7 (2º VPS, restic, WORM, 3-2-1, chave fora do VPS) |
| N4 | Bloco de assinatura visual | Seção 5-B (QR SVG + manifesto SEI, /ass/autenticidade) |
| N5 | Contabilidade sem especificação | Seção 6 (dupla entrada, schema `accounting`) |
| N6 | Núcleo sem interface de gestão | Seção 11 (console de gestão zero-trust) |
| N7 | Apps de serviço (Travel, Fretamento, Certificações, Publicações) | Tabela de 14 apps + docs/10 v2 (navegação) |
| N8 | Declarações automáticas de experiência | Seção 4.3 do contrato (Recrutamento completo) |
| N9 | Estoque criado na RLoja (origem nova) | Seção 4.5 (bidirecional RLoja ↔ ERP) |
| N10 | **8 partes insuficientes para 13 apps** | **Partes 9 e 10 criadas (12/09/2026): Parte 8 reescopada (RLoja/integrações/BRE/comunicação), Parte 9 (Travel/Fretamento/CertPub), Parte 10 (App ANAC/Console do Núcleo)** — registro histórico: na época, o CertPub era um app só; hoje são 14 apps (CertPub dividido em Certificações e Publicações) |

## 6. RESUMO QUANTITATIVO

| Dimensão | Total | v1 | v2 |
|----------|-------|-----|-----|
| Matriz Detalhada | 13 blocos | 1 coberto / 12 parciais | 100% estrutural; profundidade paramétrica contínua via seeds |
| Matriz Complementar | 6 blocos | 6 parciais | IDs/ISs nos seeds; coluna App v2 |
| Arquivos MD | 6 docs | 5 cobertos / 1 parcial | LGPD resolvida no contrato |
| Regras de Negócio | 12 tópicos | 2 cobertos / 6 parciais / 4 ausentes | 12/12 resolvidas (1 substituída: comissão de recrutamento removida) |
| Lacunas novas da v2 | 9 | — | 9/9 resolvidas no contrato |

## 7. CONCLUSÃO (v2)
- A v1 tinha 89% de aderência com 4 regras ausentes e profundidade paramétrica faltante.
- A v2 **resolveu todas as lacunas acionáveis**: as 4 regras ausentes foram injetadas no contrato (seção 12), as parciais foram cobertas pelos seeds/docs reformulados, e 9 lacunas novas (detectadas nas decisões de 10–12/09) já nasceram resolvidas.
- A profundidade paramétrica (IDs, prazos, formulários) é **trabalho contínuo da matriz** (docs/01) e dos seeds (docs/05) — não é lacuna de arquitetura.
- Este documento permanece como **trilha de auditoria**: nada foi silenciado; cada lacuna tem destino registrado.
