# VORTEX — RELATÓRIO DE LACUNAS: ARQUIVOS ORIGINAIS vs. AS 8 PARTES

> Fonte: auditoria cruzada entre os arquivos originais (Vortex_Ecosistema.docx, consolidacao.docx, consolidacao_2.docx, Consolidacao_Completa.docx, Sistema_de_assinaturas.docx) e as 8 partes de prompts.
> Classificação: **COBERTO** (presente e correto) | **PARCIAL** (presente mas incompleto/divergente) | **AUSENTE** (não estava nas 8 partes).
> Aderência global: **89%** (8 COBERTO, 25 PARCIAL, 4 AUSENTE).

## 1. CRUZAMENTO DA MATRIZ_DETALHADA (IDs 1–1262)

| Bloco Regulatório | IDs / IS | Parte Alvo | Status | Diagnóstico |
|-------------------|----------|-----------|--------|-------------|
| RBAC 39 (DAs/FCDA) | 1-10, 643, 707, 591-592 | Parte 5, 6 | PARCIAL | Módulo coberto; IDs não transcritos; AMOC não especificado |
| RBAC 43 (manutenção) | 1210-1215, 600-687 | Parte 5 | PARCIAL | Regras e entidades presentes; IDs e parâmetros exatos ausentes |
| RBAC 91 (regras gerais) | 688-777 | Parte 6 | PARCIAL | MEL, combustível, logbook presentes; faltam CVA, TBO, PBN/EFB/RVSM/CAT II-III |
| RBAC 119 (certificação) | 778-780, 901-912, 1201-1209 | Parte 6 | PARCIAL | COA/EO presentes; faltam 5 fases, Simples/Padrão, PSF 30 dias, ROP 10 dias, FAI |
| RBAC 121 (transporte regular) | 781-852, 1159-1200 | Parte 6 | PARCIAL | Despacho, MEL, logbook, manuais presentes; faltam ETOPS, MCmsV 25 tópicos, UPRT, FAD, INSPAC, MGM/PMAC |
| RBAC 135 (não regular) | 853-912, 1239-1262 | Parte 6 | PARCIAL | MGO, MEL, combustível presentes; faltam aeromédico, +4°C, repeso 36 meses, 35 seções |
| RBAC 137 (aeroagrícola) | 913-941 | Parte 6 | PARCIAL | CDAG, dispersores, DGPS presentes; faltam EMC, etanol, SGSO 3 cenários |
| RBAC 141 (CIAC) | 942-988 | Parte 7 | PARCIAL | Turmas, alunos, diários, FSTD presentes; faltam S141 6 situações, dobro do período, FOP 400-422, vistorias |
| RBAC 142 (CTAC) | 989-1016 | Parte 7 | PARCIAL | FSTD, instrutores presentes; faltam 5 documentos, FOP-CT 101-125, 3 currículos, 8 horas |
| RBAC 153 (aeródromos) | 1017-1092, 1232-1238 | Parte 7 | PARCIAL | RWYCC, SESCINC, fauna presentes; faltam SOCMS, PISOA, PCN/IRI/macrotextura, checklists 8 áreas, PGSO/PESO, SGSO quadrimestral |
| RBAC 183 (credenciamento) | 476-530, 1093-1147 | Parte 1, 7 | PARCIAL | Credenciamento presente; faltam SDEA, PCA Grupos A/B/C, F-141-10/12, Famma, 36 meses |
| RBAC 21 (certificação de produto) | 580-599 | Parte 1 | PARCIAL | Catálogo presente; faltam CT/TCDS/CST, F-101-11, ICA/ALI |
| RBAC 01 (definições) | 531-579 | Parte 1 | COBERTO | Glossário, unidades, taxonomia presentes no seed rbac-01 |

## 2. CRUZAMENTO DA MATRIZ COMPLEMENTAR (IDs 2001–7016)

| Bloco Regulatório | IDs / IS | Parte Alvo | Status | Diagnóstico |
|-------------------|----------|-----------|--------|-------------|
| RBAC 145 (OM) | 2001-2034 | Parte 5 | PARCIAL | COM, EO, LC, CRS, MOM, SGSO presentes; faltam IDs e IS específicas |
| RBAC 61 (pilotos) | 3001-3022 | Parte 1, 4 | PARCIAL | Licenças, recenticidade presentes; faltam CIV Digital IS 61-001G, SDEA |
| RBAC 63 (comissários/mec. voo) | 4001-4015 | Parte 1 | PARCIAL | Licenças presentes; faltam IS 00-008E SACI, CMA RBAC 67 |
| RBAC 65 (DOV/MMA) | 5001-5022 | Parte 1, 6 | PARCIAL | DOV presente; faltam IS 65-001F, MMA elegibilidade/curso/exame, prerrogativas |
| RBAC 39 (DAs) | 6001-6013 | Parte 5 | PARCIAL | DA/FCDA presentes; faltam AMOC, IS 39-001C, 39.19-001A |
| RBAC 120 (PPSP) | 7001-7016 | Parte 4 | PARCIAL | PPSP presente; faltam ARSO, substâncias Portaria 344/98, IS 120-002D, janela longa |

## 3. CRUZAMENTO DOS ARQUIVOS DE REFERÊNCIA (MD)

| Arquivo | Conteúdo | Parte | Status | Ação |
|---------|----------|-------|--------|------|
| CLAUDE.md | Contrato global, 10 regras, stack, schemas, ledger, MDM | Todas | COBERTO (essência) | Criar arquivo real na raiz; referenciar |
| docs/rbac-183.md | Validade 3 anos, alerta 60 dias, F-101-06 | Parte 1, 7 | COBERTO | — |
| docs/res-458.md | IDs 646-655, ledger imutável | Parte 2 | COBERTO | — |
| docs/res-520.md | Protocolo AAAA-NNNNNN, timeline, acesso | Parte 2 | COBERTO | — |
| docs/lei-14063.md | Assinatura 3 níveis | Parte 3 | COBERTO | — |
| docs/lgpd.md | Compliance, portabilidade, esquecimento | Parte 3 | PARCIAL | Faltam /compliance/export, /compliance/erase, consentimento revogável |

## 4. LACUNAS DE REGRAS DE NEGÓCIO E MODELO (AUSENTES ou PARCIAIS)

| # | Lacuna | Descrição | Parte | Status | Correção |
|---|--------|-----------|-------|--------|----------|
| 1 | Fluxo da oficina em 12 etapas | Cotação → Pré-Orçamento → Aprovação → Solicitação de Peça → Inspeção de Recebimento → Triagem de Complexidade → Abertura de OS → Execução → Fechamento APRS → Orçamento Final → Geração de Documentos → Pagamento, com etiquetas verde/amarela/vermelha | Parte 5 | AUSENTE | Injetar como máquina de estados no seed rbac-43-145 |
| 2 | Conceito da RLoja | Anúncio como VISÃO do estoque (não registro separado), estoque pessoal vs empresarial, controle do admin dono por tenant | Parte 8 | AUSENTE | Ajustar modelo de dados (vincular listing ao parts_inventory) |
| 3 | Validação RAB | Matrícula deve bater com nome/CPF do proprietário/operador; RAB como fonte via scraping | Parte 5, 8 | AUSENTE | Adicionar regra no módulo de aeronaves e onboarding |
| 4 | Modelo de negócio 3% | Loja 3% vendedor + recrutamento 3% primeiro salário do contratante com garantia 90 dias (candidato nunca paga) | Parte 4, 8 | PARCIAL | Adicionar 3% recrutamento com garantia 90 dias |
| 5 | Schema do logbook | vortex_logbook_entries: horas diurno/noturno/instrumento/navegação/capota/simulador, motor/hélice/APU, discrepâncias, MEL, assinatura, status draft/signed/rectified/voided | Parte 6 | PARCIAL | Usar schema real como referência |
| 6 | Núcleos de backend | Identity, RH Core, Catálogo Central, Estoque Central (quarentena), Ledger, Ops/ERP | Parte 1 | PARCIAL | Alinhar nomenclatura de módulos |
| 7 | Schemas PostgreSQL | identity/catalog/inventory/hr/ledger/ops; tabelas rcontas, empresas, vinculos, procuracoes, inventory_grants, tenant_publicacao, quarentena | Parte 1 | PARCIAL | Alinhar schema SQL regenerado |
| 8 | Papéis e permissões | Visitante, rConta, Criador de empresa, Administrador, Representante Legal, Procurador (escopo por módulo), Proprietário/Operador | Parte 1 | PARCIAL | Enriquecer RBAC/ABAC + procuração |
| 9 | Regras críticas | Gate de acesso, cadastro colaborativo, representante legal automático, privacidade, procuração só por representante, validação aeronave, pré-cadastro, RAB | Parte 1, 8 | PARCIAL | Incorporar como regras do BRE |
| 10 | Links oficiais ANAC | RAB, SEI, Portal ANAC, S141, SIGRA | Parte 8 | AUSENTE | Adicionar ao módulo de integrações |
| 11 | Performance/escala | SPA, SVG, lazy loading, cache dupla, CDN, load balancer, autoscaling, UUID | Parte 1 | COBERTO | — |
| 12 | Estudo jurídico assinaturas | Lei 14.063, MP 2.200-2, Decreto 10.543, ICP-Brasil, empresa não é AC | Parte 3 | COBERTO | — |

## 5. RESUMO QUANTITATIVO

| Dimensão | Total | COBERTO | PARCIAL | AUSENTE | Cobertura |
|----------|-------|---------|---------|---------|-----------|
| Matriz Detalhada | 13 blocos | 1 (8%) | 12 (92%) | 0 | 100% estrutural / 45% profundidade |
| Matriz Complementar | 6 blocos | 0 | 6 (100%) | 0 | 100% estrutural / 50% profundidade |
| Arquivos MD | 6 docs | 5 (83%) | 1 (17%) | 0 | 95% conceitual |
| Regras de Negócio | 12 tópicos | 2 (17%) | 6 (50%) | 4 (33%) | 67% inicial |
| **Total** | **37** | **8 (22%)** | **25 (67%)** | **4 (11%)** | **89% global** |

## 6. CONCLUSÃO

- As lacunas são majoritariamente de **profundidade paramétrica** (IDs, prazos, formulários que devem ser carregados via seeds), NÃO de arquitetura.
- Apenas **4 regras de negócio ausentes** (fluxo 12 etapas, RLoja como visão do estoque, validação RAB, 3% recrutamento), todas injetáveis no BRE sem reescrever as 8 partes.
- Os seeds por RBAC (docs/05) resolvem as lacunas de profundidade.
- O documento de delimitação (docs/07) define a prevalência dos valores oficiais.