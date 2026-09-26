# VORTEX — docs/01: MATRIZ REGULATÓRIA CONSOLIDADA (v2)

> **Versão 2 — 12/09/2026.** O conteúdo regulatório (~1.370 requisitos) permanece **intocado** — é dado oficial, não arquitetura. Mudanças desta versão: **coluna "App" atualizada para os 14 aplicativos** (Núcleo absorveu o Catálogo Central; ERP Agrícola 137 desmembrado do Operadores; novos apps ANAC, Travel, Fretamento, Certificações e Publicações — o antigo CertPub dividido em dois) e referência ao **recorte de Publicações** nas tarefas de manutenção.
> Antes de fixar qualquer requisito em código, verifique a vigência no site da ANAC.
> Em divergência de valores, prevalece o `docs/07-delimitacao.md`; em arquitetura, o `CLAUDE.md v2`.

## 1. RESUMO DAS MATRIZES

| Fonte | Cobertura | Quantidade |
|-------|-----------|-----------|
| MATRIZ_DETALHADA | RBAC 43, 91, 121, 135, 137, 141, 142, 153, 183, 01, 21 | 1.262 requisitos |
| MATRIZ COMPLEMENTAR | RBAC 145, 61, 63, 65, 39, 120 + ISs | ~110 requisitos (IDs 2001–7016) |
| **Total** | — | **~1.370 requisitos rastreáveis** |

## 2. MATRIZ_DETALHADA (IDs 1–1262) — POR BLOCO REGULATÓRIO

### 2.1 RBAC 39 — Diretrizes de Aeronavegabilidade (DAs)
- **IDs 1–10 / RBAC 39:** Monitoramento e cumprimento mandatório de DAs. Emissão e controle da Ficha de Cumprimento de Diretriz de Aeronavegabilidade (FCDA).
- **ID 643 / IS 43.9-003 §3.4:** Registro obrigatório do cumprimento de DA na caderneta correspondente (célula, motor ou hélice).
- **ID 707 / IS 91-012 §5.3.6:** Prevalência absoluta da DA sobre a MEL — proibido relaxamento operacional se houver DA aplicável em aberto.
- **IDs 591–592 / IS 21-001:** Vinculação com Instruções de Aeronavegabilidade Continuada (ICA) e Limitações de Aeronavegabilidade (ALI).

### 2.2 RBAC 43 — Manutenção, Manutenção Preventiva, Reconstrução e Alteração
- **ID 1210 / RBAC 43.3:** Validação rigorosa de licença, habilitação e vínculo do profissional executor.
- **ID 1211 / RBAC 43.5:** Execução de manutenção preventiva estritamente amparada em dados técnicos aprovados.
- **ID 1212 / RBAC 43.7:** Trava lógica que impede a aprovação para retorno ao serviço (CRS/APRS) e o encerramento da OS sem assinatura digital de profissional habilitado.
- **ID 1213 / RBAC 43.9:** Registros de manutenção com descrição detalhada, data, assinatura e licença do responsável.
- **ID 1214 / RBAC 43.11:** Guarda e conservação dos registros pelo período regulamentar.
- **ID 1215 / RBAC 43.13:** Vinculação de cada tarefa ao manual técnico do fabricante (AMM, SRM, CMM) — **v2: a tarefa consome o recorte do manual via Publicações (se assinante); sem assinatura, obtenção por fora**.
- **IDs 600–612, 1217–1223 / IS 43-001 (Rastreabilidade):** Cadastro no recebimento (P/N, S/N, fabricante, condição). FORM 8130-3 para novos; histórico para usados; laudo para recuperados. Segregação física/lógica (etiqueta amarela/vermelha/verde). Trilha ponta a ponta. Shelf life e tempo em serviço. Lotes indivisíveis.
- **IDs 621–628 / IS 43.9-001 (SEGVOO 001):** Geração mandatória após grandes alterações/reparos. Remessa via SEI antes do retorno.
- **IDs 629–635 / IS 43.9-002 (Registros):** Retenção mínima de 1 ano após a retirada definitiva de serviço.
- **IDs 636–645 / IS 43.9-003 (Cadernetas):** Escrituração digital de célula, motor, hélice e componentes com limite de vida — **v2: Parte I = projeção agregada; Parte II = eventos primários no ledger (registro é um só)**.
- **IDs 656–662 / IS 43.13-003 (IIO):** Inspeções de Itens Obrigatórios, inspetores credenciados, não conformidades.
- **IDs 663–668 / IS 43.13-004 (END):** Métodos (LP, PM, US, RX, Eddy Current, Visual), inspetores Níveis I/II/III, laudos assinados.
- **IDs 669–676 / IS 43.13-005 (Ferramentas):** Calibração RBC/INMETRO, bloqueio de ferramentas vencidas, caixas de ferramentas.
- **IDs 677–681 / IS 43-012 (Itens Inoperantes):** Desativação com dados aprovados, placard, reativação.
- **IDs 682–687 / IS 43-002 (Pessoal):** Mecânicos habilitados, supervisão, designação de inspetores.

### 2.3 RBAC 91 — Regras Gerais de Operação
- **IDs 688–716, 1148–1158 / IS 91-012 (MEL):** Estrutura padronizada (página de rosto, LPE, índice ATA, preâmbulo). Categorias: A (prazo especificado), B (3 dias), C (10 dias), D (120 dias). Procedimentos O/M. Associação ATA 100/2200. Obrigatória para 121/135; facultativa para 91. Revisão: 60 dias por alteração, 30 dias se notificado.
- **IDs 717–721, 1229–1231 / IS 91-403-001 (CVA):** Verificação anual. F-145-27E e F-145-28. Bloqueio se não conformidade crítica.
- **IDs 722–725 / IS 91-409-001 (TBO):** Controle de tempo entre revisões gerais, fluxo de extensão.
- **IDs 726–729 / IS 91-409-002:** Monitoramento de motores (tendências termodinâmicas).
- **IDs 730–735 / IS 91-001 (PBN):** RNAV 10/1/2, RNP 1/2/4/APCH/AR APCH/0.3, Declaração de Conformidade.
- **IDs 736–740 / IS 91-002 (EFB):** Classes 1/2/3, ciclo de atualização de cartas.
- **IDs 741–777:** RVSM (IS 91-005), ILS CAT I AR e LVTO (IS 91-003), CAT II/III (IS 91-004), NAT-HLA (IS 91-006), SAE (IS 91-007), Eventos Aéreos (IS 91-008), Crédito de Pavimento (IS 91-009), CPDLC/ADS-C (IS 91-010), EFVS (IS 91-011), Propriedade Compartilhada (IS 91-013), Fatoração de Pista (IS 91-014), Reconstituição de Diários (IS 91-015), PED a Bordo (IS 91.21-001), Sobrevoo Experimental (IS 91-319-001).

### 2.4 RBAC 121 — Transporte Aéreo Regular
- **IDs 778–780 / IS 119-001:** Certificação em 5 fases, qualificação pessoal (119.69/119.71).
- **IDs 781–782 / IS 121-001:** Guia de Rotas.
- **IDs 783–785 / IS 121-003:** SOP no AOM (121.135(b)(27)), STE-BR.
- **IDs 786–788 / IS 121-004:** AOM, memory items, prazo 180 dias.
- **IDs 789–796 / IS 121-006/007/008:** PTO, LOFT, MDR/ODR, recertificação 24 meses, DOV 40h.
- **IDs 797–798 / IS 121-009:** Conjuntos de sobrevivência.
- **IDs 799–800 / IS 121-010:** Sistema de Documentos.
- **IDs 801–803 / IS 121-011:** PTO comissários, exame prático, 4 ciclos, 5 níveis.
- **IDs 804–808 / IS 121-012:** ETOPS 75/120/138/180/207 min, Grupos 1/2, retenção 5 anos.
- **IDs 809–811 / IS 121-013:** Estações de linha, auditorias semestrais.
- **IDs 812–815, 1159–1183 / IS 121-014:** MCmsV, 25 tópicos (Apêndice B).
- **IDs 816–817 / IS 121-015:** Evacuação 90 segundos, amerissagem.
- **IDs 818–822 / IS 121-016/017:** Mínimos meteorológicos, PAADV.
- **IDs 823–827 / IS 121-018/019:** Mínimos de aeródromo, LVTO.
- **IDs 828–831 / IS 121-020:** Aeródromos especiais, EGPWS 60 dias.
- **IDs 832–834 / IS 121-021:** UPRT.
- **IDs 835–836 / IS 121-022:** FAD de DOV (7 seções, 4 critérios).
- **IDs 837–839 / IS 121-023:** INSPAC, QR Code, relatório mensal dia 15.
- **IDs 840–844 / IS 121-024:** MGM/PMAC (10 elementos), D-144-02, FOP 107/111, SASC.
- **IDs 845–847 / IS 121-025:** Controle operacional, retenção 30 dias.
- **ID 848 / IS 121-1225-001:** SGSO 4 pilares ICAO.
- **IDs 849–852 / IS 121-002:** Examinadores, 2 exames/12 meses, supervisão 24 meses.
- **IDs 1184–1200 / RBAC 121 Subparte I:** Desempenho decolagem/pouso, alternativas, combustível (121.624).
- **v2:** as passagens de linha 121 são vendidas pelo app **Travel** (comissão de agência); o operador 121 usa o **ERP Operadores**.

### 2.5 RBAC 135 — Transporte Não Regular
- **IDs 853–857 / IS 135-001:** Piloto examinador via SEI, FAP 13, relatórios semestrais (março/setembro).
- **IDs 858–860 / IS 135-002:** MGO 135 (3 capítulos), 7 serviços de solo.
- **IDs 861–864 / IS 135-003:** PTO, treinamento anual (135.351).
- **IDs 865–867 / IS 135-004:** Comissário examinador, certificados até 4 anos.
- **IDs 868–875 / IS 135-005:** Aeromédico, 11 módulos, kit médico como grande alteração.
- **IDs 876–880 / IS 135-006:** Ambiente hostil, combustível VFR +30/+45/+20 min, IFR 2 horas.
- **IDs 881–884 / IS 135-007:** Meios alternativos de desempenho, +4°C.
- **IDs 885–887 / IS 135-008:** SOP, PF/PM, FMA.
- **IDs 888–892 / IS 135-009:** AOM 135, cotejamento mútuo, FOP 207/211/212.
- **IDs 893–900 / IS 135-21-001:** MGM até 9 assentos, repeso 36 meses, SEGVOO 001.
- **IDs 901–912, 1201–1209 / IS 119-004:** Simples/Padrão, FOP 200-226, PSF 30 dias, ROP 10 dias, FAI, FOP 224.
- **IDs 1239–1262 / RBAC 135 Subparte J/L:** Manual 35 seções (135.23), verificação no diário (135.71), traslado técnico (135.179), confiabilidade (135.415), interrupção (135.417), manutenção até 9 assentos (135.421).
- **v2:** fretamento 135 (passageiros, carga, aeromédico) é vendido pelo app **Fretamento**.

### 2.6 RBAC 137 — Operações Aeroagrícolas
- **IDs 913–919 / IS 137-001:** Dispersores, EMC, disjuntores, helicópteros.
- **IDs 920–924 / IS 137-002:** DGPS, Declaração de Conformidade de Instalação.
- **IDs 925–933 / IS 137-003:** CDAG, FCDAG, 3 iterações, desistência 30 dias, suspensão 30 dias, cassação 360 dias.
- **IDs 934–935 / IS 137.201-001:** Etanol hidratado.
- **IDs 936–941 / IS 137.215-001:** SGSO aeroagrícola, 3 cenários, biblioteca de perigos.
- **v2:** RBAC 137 pertence ao **ERP Agrícola** (app próprio, desmembrado do Operadores); o fretamento agrícola é vendido pelo app **Fretamento**.

### 2.7 RBAC 141 — Centros de Instrução (CIAC)
- **IDs 942–959 / RBAC 141:** Certificado, EI, 3 tipos, MIP/MGQ, SGSO 4 componentes (5 anos), FSTD RBAC 60, corpo docente, estrutura administrativa, registros escolares, certificado 10 dias, examinadores 24 meses.
- **IDs 960–967 / IS 141-001 (S141):** API, matrícula, 6 situações, status CIAC, instrutores, histórico, dobro do período letivo, transferência.
- **IDs 968–970 / IS 141-003:** Curso DOV.
- **IDs 971–975 / IS 141-004:** Certificação 5 fases, FOP 400-422, vacância 60 dias.
- **IDs 976–981 / IS 141-005:** Gestor/GSO, reportes, vistorias semestrais, SPIs, relatório semestral (Res. 714).
- **IDs 982–988 / IS 141-006/007:** Programas por modalidade, ground school 12 meses, fichas 5 anos, MMA em oficinas homologadas.

### 2.8 RBAC 142 — Centros de Treinamento (CTAC)
- **IDs 989–1000 / RBAC 142:** Certificado, ET, 5 documentos (Certificado, ET, MIP, MGSO, PRE), FSTD RBAC 60, CTAC Satélite/Remoto/Estrangeiro, SGQ ISO 9001.
- **IDs 1001–1006 / IS 142-001:** Certificação 5 fases, FOP-CT 101-125, 3 currículos.
- **IDs 1007–1011 / IS 142-002:** CTAC exterior, 30 dias, FSTD.
- **IDs 1012–1016 / IS 142-003:** Corpo docente, 10 tópicos, 8 horas pedagógicas, trava de redução.
- **v2:** RBAC 141/142 pertencem ao **ERP Cursos e Treinamentos**, incluindo as ISs 121-006/007/008/011, 135-001/003 e 137-207 (treinamentos associados a operadores).

### 2.9 RBAC 153 — Aeródromos e Infraestrutura
- **IDs 1017–1023 / IS 153-001 (SOCMS):** Movimentação no solo, incursão, SMGCS.
- **IDs 1024–1028 / IS 153-002:** Manutenção em 8 áreas.
- **IDs 1029–1033 / IS 153.37-001 (PISOA):** Treinamentos.
- **IDs 1034–1040 / IS 153.51-001 (SGSO):** 4 componentes, Gestor/CSO, AISO, relatório quadrimestral (20/01, 20/05, 20/09).
- **IDs 1041–1046 / IS 153.63-001/73-001 (PGSO/PESO):** 5 áreas, checklists, retenção 6 meses, ações 12 meses.
- **IDs 1047–1049 / IS 153.107-001:** Proteção da área operacional, credenciamento.
- **IDs 1050–1055, 1232–1234 / IS 153.133-001:** RCAM, RWYCC 0-6, RCR, notificação à TWR.
- **IDs 1056–1060 / IS 153.203-001/205-001:** PCN, IRI ≤2,5, atrito, macrotextura ≥0,60.
- **IDs 1061–1079 / IS 153.403-001 a 433-001 (SESCINC):** CAT, agentes, CCI, 3 minutos, EPR, Observador, SESAQ.
- **IDs 1080–1092, 1235–1238 / IS 153.501-001 a 505-001 (Fauna):** IPF, PGRF, SIGRA, R = log(x).
- **v2:** RBAC 153 pertence ao **ERP Aeródromos**, incluindo pousos e decolagens no escopo operacional.

### 2.10 RBAC 183 — Credenciamento de Pessoas Físicas e Jurídicas
- **IDs 1093–1108 / RBAC 183:** PCP, PCF, PCA, médicos peritos, SDEA, pessoas jurídicas. Validade 3 anos. 6 hipóteses de cancelamento (183.15(b)). Grupos A/B/C. Transferência de vínculo. Associações aerodesportivas (3 anos de posse).
- **IDs 1109–1115 / IS 183-001 (SDEA):** 7 categorias, 5 fases, provisório 1 ano, ELE/SME, reciclagem anual.
- **IDs 1116–1120 / IS 183-002:** Validade trienal, F-101-06, relatório de interação 3 anos.
- **IDs 1121–1125 / IS 183-003:** Examinador MMA, 4 fases, 36 meses, Famma.
- **IDs 1126–1128 / IS 183-004:** Associações aerodesportivas.
- **IDs 1129–1147 / IS 183-005 (PCA):** Grupos A/B/C, VTE, 7 premissas, Empregado/Autônomo, 3 anos, F-141-10, F-141-12, Termo de Responsabilidade, alerta 60 dias, não renovação sem vistorias, encerramento 2 anos.

### 2.11 RBAC 21 — Certificação de Produto Aeronáutico
- **IDs 580–599 / RBAC 21, IS 21-001:** Certificação de Tipo em 6 etapas, CT, TCDS, CST/STC, DLA, AIT, FCAR, F-101-11, ICA/ALI, AFM/RFM, placas de dados, F-101-06, grandes reparos.
- **v2:** a condução à certificação de empresas (91 Ap.K, 121, 135, 137, 145, 141, 142, 153) é produto do app **Certificações**.

### 2.12 RBAC 01 — Definições, Regras de Redação e Unidades
- **IDs 531–579 / RBAC 01:** Taxonomia, componente vs peça, manutenção/alteração/reparo/reconstrução, aeronavegabilidade, dados aprovados vs aceitos, certificados, licenças/CHT/CMA, TSO/PMA/OTP, shelf life, conversor de unidades, siglas, STE-BR.

### 2.13 RBACs 23/25/26/27/29/33/35/45 — Normas de Projeto e Registro (v2)
- Incluídos na Identidade do contrato v2 (RBACs de projeto por categoria de aeronave e RBAC 45 — registro e controle de manutenção de aeronaves). Requisitos detalhados a incorporar na matriz quando da especificação do **ERP Manutenção** (45) e do **Núcleo** (tipos de produto/certificação de projeto).

## 3. MATRIZ COMPLEMENTAR (IDs 2001–7016)

### 3.1 RBAC 145 + ISs — Organizações de Manutenção (IDs 2001–2034)
| ID | Ref | Requisito | Funcionalidade | Obrig. | App (v2) |
|----|-----|-----------|----------------|--------|----------|
| 2001 | 145.3 | Definições | Glossário OM, CRS, RT, GR, MOM, MCQ | Sim | Núcleo |
| 2002 | 145.51 | COM | Cadastro COM | Sim | Rconta |
| 2003 | 145.53(a) | Emissão COM | Fluxo de emissão | Sim | Rconta |
| 2004 | 145.59 | Categorias | Célula, motor, hélice, aviônicos | Sim | Núcleo |
| 2005 | 145.61-I | EO | Cadastro EO | Sim | ERP Manutenção |
| 2006 | 145.65 | LC | Gestão LC | Sim | ERP Manutenção |
| 2007 | 145.109 | Pessoal | Cadastro com qualificações | Sim | Recrutamento |
| 2008 | 145.109-001 | RT | Cadastro RT | Sim | Rconta |
| 2009 | 145.109 | GR | Cadastro GR | Sim | Rconta |
| 2010 | 145.111 | Instalações | Registro de bases | Sim | ERP Manutenção |
| 2011 | 145.113 | Equipamentos | Inventário com calibração | Sim | ERP Manutenção |
| 2012 | 145.151 | CRS | Emissão com assinatura | Sim | ERP Manutenção |
| 2013 | 145.151-001 | Cadastro RT | IS 145.151-001F | Sim | Rconta |
| 2014 | 145.163 | Registros | Imutável, retenção legal | Sim | ERP Manutenção |
| 2015 | 145.163-001 | Arquivamento | Prazos de retenção | Sim | ERP Manutenção |
| 2016 | 145.165 | Treinamento | PTM | Sim | Recrutamento |
| 2017 | 145.207 | MOM | Revisões e distribuição | Sim | ERP Manutenção |
| 2018 | 145.209 | Conteúdo MOM | IS 145-009 | Sim | ERP Manutenção |
| 2019 | 145.211 | Qualidade | Não-conformidades, auditorias | Sim | ERP Manutenção |
| 2020 | 145.213 | Inspeção | Controle de liberação | Sim | ERP Manutenção |
| 2021 | 145.214-I | SGSO | SGSO da OM | Sim | ERP Manutenção |
| 2022 | 145.215-I | EO/LC | Gestão integrada | Sim | ERP Manutenção |
| 2023 | 145.217 | Subcontratação | Contratos entre OMs | Sim | ERP Manutenção |
| 2024 | 145.219 | Arquivamento | Política de retenção | Sim | ERP Manutenção |
| 2025 | 145.221 | Dificuldade | Relatórios de falha | Sim | Rconta |
| 2026 | 145.221-I | Periódicos | Relatórios à ANAC | Sim | Rconta |
| 2027 | IS 145-001H | OM doméstica | Fluxo de certificação | Sim | Rconta |
| 2028 | IS 145-002C | OM estrangeira | Fluxo de certificação | Sim | Rconta |
| 2029 | IS 145-009E | MOM/MCQ/DC | Elaboração e controle | Sim | ERP Manutenção |
| 2030 | IS 145-010 | PTM | Gestão do treinamento | Sim | Recrutamento |
| 2031 | IS 145.109-001 | Pessoal | Matriz de qualificação | Sim | Recrutamento |
| 2032 | IS 145.151-001F | RT | Integração fluxo | Sim | Rconta |
| 2033 | IS 145.163-001 | Registros | Controle e retenção | Sim | ERP Manutenção |
| 2034 | IS 145.214-001 | SGSO | Componentes do SGSO | Sim | ERP Manutenção |

### 3.2 RBAC 61 + IS 61-001 — Licenças de Pilotos (IDs 3001–3022)
| ID | Ref | Requisito | Funcionalidade | Obrig. | App (v2) |
|----|-----|-----------|----------------|--------|----------|
| 3001 | 61.2 | Definições | Glossário licenças, CIV, recenticidade | Sim | Núcleo |
| 3002 | 61.3 | Aplicabilidade | Pilotos sujeitos ao RBAC 61 | Sim | Recrutamento |
| 3003 | 61.5 | Licenças | PP, PC, PLA, planador | Sim | Recrutamento |
| 3004 | 61.7 | Requisitos gerais | Idade, instrução, exames | Sim | Recrutamento |
| 3005 | 61.9 | Idade | Idade mínima por licença | Sim | Recrutamento |
| 3006 | 61.11 | Experiência | Horas de voo exigidas | Sim | Recrutamento |
| 3007 | 61.13 | Inglês | SDEA, validade | Sim | Recrutamento |
| 3008 | 61.15 | Exames | Teóricos e práticos | Sim | Recrutamento |
| 3009 | 61.17 | Validade | Controle de datas | Sim | Recrutamento |
| 3010 | 61.19 | Revalidação | Prazos e alertas | Sim | Recrutamento |
| 3011 | 61.21 | Recenticidade | Bloqueio sem experiência recente | Sim | Recrutamento |
| 3012 | 61.23 | Prerrogativas | Por licença/habilitação | Sim | Recrutamento |
| 3013 | 61.25 | CIV | Horas de voo por piloto | Sim | Recrutamento |
| 3014 | 61.65 | PP | Concessão/revalidação | Sim | Recrutamento |
| 3015 | 61.95 | PC | Concessão/revalidação | Sim | Recrutamento |
| 3016 | 61.115 | PLA | Concessão/revalidação | Sim | Recrutamento |
| 3017 | 61.173 | IFR | Gestão habilitação | Sim | Recrutamento |
| 3018 | 61.185 | Tipo | Habilitações de tipo | Sim | Recrutamento |
| 3019 | 61.67/97/117 | Experiência | Horas por tipo | Sim | Recrutamento |
| 3020 | IS 61-001G | CIV Digital | Caderneta eletrônica | Sim | Rconta |
| 3021 | IS 61-001G | Declaração | Horas para concessão | Sim | Rconta |
| 3022 | IS 61-001G | Integração | Validação RBAC 61/91 | Sim | ERP Operadores |

### 3.3 RBAC 63 + ISs — Comissários e Mecânicos de Voo (IDs 4001–4015)
| ID | Ref | Requisito | Funcionalidade | Obrig. | App (v2) |
|----|-----|-----------|----------------|--------|----------|
| 4001 | 63.1 | Aplicabilidade | Mecânicos de voo e comissários | Sim | Recrutamento |
| 4002 | 63.3 | Definições | Glossário | Sim | Núcleo |
| 4003 | 63.5 | Condições | Exercício das prerrogativas | Sim | Recrutamento |
| 4004 | 63.7 | Licenças | Cadastro | Sim | Recrutamento |
| 4005 | 63.9 | Solicitação | Fluxo | Sim | Recrutamento |
| 4006 | 63.11 | Exame prático | Controle de reprovações | Sim | Recrutamento |
| 4007 | 63.13 | Vigilância | Validade, revalidação | Sim | Recrutamento |
| 4008 | 63.51–67 | Mecânico de voo | Requisitos | Sim | Recrutamento |
| 4009 | 63.71–87 | Comissário | Requisitos | Sim | Recrutamento |
| 4010 | 63.7/9 | Habilitações | Gestão | Sim | Recrutamento |
| 4011 | 63.13 | Revalidação | Cálculo e bloqueio | Sim | Recrutamento |
| 4012 | IS 00-008E | SACI | Solicitação de licenças | Sim | Recrutamento |
| 4013 | IS 00-008E | Atualização | Dados cadastrais | Sim | Rconta |
| 4014 | IS 61-001G | CIV | Mecânicos de voo | Sim | Rconta |
| 4015 | RBAC 67 | CMA | Validade do CMA | Sim | Rconta |

### 3.4 RBAC 65 + IS 65-001 — DOV e MMA (IDs 5001–5022)
| ID | Ref | Requisito | Funcionalidade | Obrig. | App (v2) |
|----|-----|-----------|----------------|--------|----------|
| 5001 | 65.1 | Aplicabilidade | DOV e MMA | Sim | Recrutamento |
| 5002 | 65.3 | Definições | Glossário | Sim | Núcleo |
| 5003 | 65.5 | Licenças | Cadastro | Sim | Recrutamento |
| 5004 | 65.7 | Requisitos gerais | Validação | Sim | Recrutamento |
| 5005 | 65.9 | Solicitação | Fluxo | Sim | Recrutamento |
| 5006 | 65.11 | Exames | Registro | Sim | Recrutamento |
| 5007 | 65.13 | Validade | Controle | Sim | Recrutamento |
| 5008 | 65.31–53 | DOV (Subparte B) | Requisitos | Sim | Recrutamento |
| 5009 | 65.71 | MMA elegibilidade | Idade, ensino médio | Sim | Recrutamento |
| 5010 | 65.73 | MMA curso teórico | CIAC | Sim | Recrutamento |
| 5011 | 65.75 | MMA experiência | Validação prática | Sim | Recrutamento |
| 5012 | 65.77 | MMA exame prático | IS 65-001 | Sim | Recrutamento |
| 5013 | 65.79 | MMA licença | Emissão | Sim | Recrutamento |
| 5014 | 65.83 | MMA recência | Bloqueio | Sim | Recrutamento |
| 5015 | 65.85 | MMA célula | Prerrogativas | Sim | Recrutamento |
| 5016 | 65.87 | MMA GMP | Prerrogativas | Sim | Recrutamento |
| 5017 | 65.88/89 | Demais | Prerrogativas/limitações | Sim | Recrutamento |
| 5018 | IS 65-001F | Licença MMA | Fluxo completo | Sim | Recrutamento |
| 5019 | IS 65-001F | Habilitações | Procedimentos | Sim | Recrutamento |
| 5020 | IS 65-001F | Recadastro | Fluxo | Sim | Recrutamento |
| 5021 | IS 65-001F | Forças auxiliares | Procedimentos especiais | Sim | Recrutamento |
| 5022 | IS 00-008E | SACI | Integração | Sim | Recrutamento |

### 3.5 RBAC 39 + IS 39-001 / 39.19-001 — Diretrizes de Aeronavegabilidade (IDs 6001–6013)
| ID | Ref | Requisito | Funcionalidade | Obrig. | App (v2) |
|----|-----|-----------|----------------|--------|----------|
| 6001 | 39.1 | Aplicabilidade | Produtos sujeitos às DA | Sim | ERP Manutenção |
| 6002 | 39.3 | Definições | Glossário DA, FCDA | Sim | Núcleo |
| 6003 | 39.5 | Emissão DA | Cadastro | Sim | ERP Manutenção |
| 6004 | 39.7 | Cumprimento | Por matrícula | Sim | ERP Manutenção |
| 6005 | 39.9 | Registro | FCDA com hash e trilha | Sim | ERP Manutenção |
| 6006 | 39.11 | AMOC | Aprovação alternativa | Sim | ERP Manutenção |
| 6007 | 39.13 | Revogação | Histórico | Sim | ERP Manutenção |
| 6008 | 39.17 | Notificação | Relatórios à ANAC | Sim | Rconta |
| 6009 | 39.19 | DA aplicável | FCDA com histórico | Sim | ERP Manutenção |
| 6010 | IS 39-001C | Orientações | Análise de aplicabilidade | Sim | ERP Manutenção |
| 6011 | IS 39-001C | FCDA formato | Registro primário | Sim | ERP Manutenção |
| 6012 | IS 39.19-001A | Procedimentos | RBAC 39.19 | Sim | ERP Manutenção |
| 6013 | IS 39.19-001A | Canceladas | Histórico na FCDA | Sim | ERP Manutenção |

### 3.6 RBAC 120 + IS 120-002 — PPSP (IDs 7001–7016)
> **Nota:** o RBAC 120 EMD 04 trata do PPSP (prevenção ao uso de substâncias psicoativas), NÃO do SGSO. O SGSO da OM 145 está na IS 145.214-001B; o SGSO dos operadores está no RBAC 121.1225-001.

| ID | Ref | Requisito | Funcionalidade | Obrig. | App (v2) |
|----|-----|-----------|----------------|--------|----------|
| 7001 | 120.1 | Aplicabilidade | Provedores e pessoal PPSP | Sim | Recrutamento |
| 7002 | 120.3 | Definições | PPSP, ARSO | Sim | Núcleo |
| 7003 | 120.5 | ARSO | Cadastro do pessoal | Sim | Recrutamento |
| 7004 | 120.7 | Substâncias | Portaria 344/98, álcool | Sim | Recrutamento |
| 7005 | 120.9 | Programa | Política, educação, exames | Sim | Recrutamento |
| 7006 | 120.11 | Manual | Revisões e distribuição | Sim | ERP Manutenção |
| 7007 | 120.13 | Declaração | Geração e protocolo | Sim | Rconta |
| 7008 | 120.15 | Exames | Validade e alertas | Sim | Recrutamento |
| 7009 | 120.17 | Registros | Imutável no ledger | Sim | Núcleo (ledger) |
| 7010 | 120.19 | Educação | Treinamentos | Sim | Recrutamento |
| 7011 | 120.21 | Supervisão | Comunicação e intervenção | Sim | Recrutamento |
| 7012 | 120.23 | Afastamento | Motivo registrado | Sim | Recrutamento |
| 7013 | IS 120-002D | Implantação | Orientações | Sim | Recrutamento |
| 7014 | IS 120-002D | ARSO | Identificação | Sim | Recrutamento |
| 7015 | IS 120-002D | Janela longa | Exame toxicológico | Sim | Recrutamento |
| 7016 | IS 120-002D | Educação | Subprogramas com certificado | Sim | Recrutamento |

## 4. VIGÊNCIAS VERIFICADAS (referência)
- RBAC 145 EMD 09 (07/2026); IS 145-001H (01/11/2024), IS 145-002C (21/01/2026), IS 145.151-001F (05/02/2025).
- RBAC 61 EMD 16 (15/08/2024); IS 61-001G (27/03/2023).
- RBAC 63 EMD 00 (Res 706, vig. 01/01/2024); IS 00-008E (03/04/2023).
- RBAC 65 EMD 00 (Res 469/2018); IS 65-001F (vig. 13/10/2025).
- RBAC 39 EMD 00 (últ. mod. 12/02/2025); IS 39-001C (02/08/2019).
- RBAC 120 EMD 04 (últ. mod. 07/04/2026); IS 120-002D (vig. 01/12/2021).
- RBAC 183 EMD 01 (Res 477/2018; última mod. 12/02/2025).

## 5. MUDANÇAS DA v1 → v2 NESTE DOCUMENTO
1. **Coluna "App" atualizada para os 14 apps** — "Catálogo" → **Núcleo** (catálogo absorvido); "ERP 145" → **ERP Manutenção**; "erp121135" → **ERP Operadores**; "erp141142" → **ERP Cursos e Treinamentos**; "erp153" → **ERP Aeródromos**.
2. **RBAC 137** apontado para o **ERP Agrícola** (app próprio) — com nota de que o fretamento agrícola é do app Fretamento.
3. **RBAC 121/135** com notas de que a venda de passagens 121 é do **Travel** e o fretamento 135 do **Fretamento**.
4. **RBAC 21** com nota do app **Certificações** (condução à certificação de empresas).
5. **ID 1215** (vinculação a manuais) com nota do **recorte de Publicações**.
6. **ID 643** (cadernetas) com nota do princípio "registro é um só" (Parte I = projeção; Parte II = eventos).
7. **Seção 2.13 nova** — RBACs 23/25/26/27/29/33/35/45 incluídos na Identidade do contrato v2 (detalhamento futuro na matriz).
8. IDs 2001/2004/3001/4002/5002/7002/7009: "Catálogo" → **Núcleo**; 7009 (registros imutáveis) → **Núcleo (ledger)**.
