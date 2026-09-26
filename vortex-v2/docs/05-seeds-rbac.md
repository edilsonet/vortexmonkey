# VORTEX — docs/05: SEEDS REGULATÓRIOS POR RBAC (v2)

> **Versão 2 — 12/09/2026.** Os seeds (dados canônicos das matrizes) permanecem intocados. Mudanças desta versão: `targetApp` atualizado para os 13 apps, importação do BRE no padrão Nx (`@vortex/shared-dto`) e nota de residência dos seeds.
> Estes seeds são a FONTE CANÔNICA de dados regulatórios consumida pelo BRE e pelos módulos.
> Nenhum parâmetro deve ser hardcoded — sempre lido destes seeds.
> Em qualquer divergência, o Valor Oficial (`docs/07-delimitacao.md`) prevalece.

## 1. INTERFACE CANÔNICA DE TIPAGEM
```typescript
// libs/shared-dto/src/lib/seeds/regulatory-seed.interface.ts (v2 — Nx)
export interface RegulatorySeedItem {
  id: number;                          // ID numérico da MATRIZ (1-1262 ou 2001-7016)
  rbac: string;                        // RBAC de referência (ex: '01', '43', '145', '121')
  isRef?: string;                      // Instrução Suplementar aplicável (ex: 'IS 43.9-001')
  legalReference: string;              // Artigo, parágrafo ou seção da norma (ex: 'RBAC 43.9(a)')
  requirementTitle: string;            // Título descritivo do requisito regulatório
  systemFeature: string;               // Funcionalidade técnica implementada no sistema
  mandatory: boolean;                  // Obrigatoriedade do requisito (true/false)
  targetApp: string;                   // App responsável (v2: 13 apps — ver enum APPS)
  formsAssociated?: string[];          // Códigos dos formulários ANAC vinculados
  controlledEnums?: Record<string, string[]>; // Enums aplicáveis e seus domínios
  parameters?: Record<string, unknown>; // Prazos, limites físicos, tolerâncias e constantes
}
```

> **v2 — residência dos seeds:** os arquivos de seeds vivem em `libs/shared-dto/src/lib/seeds/` (fonte única importada pelo backend e pelo BRE; o frontend usa os mesmos tipos para exibir referências regulatórias nos ValidationBadges e telas de conformidade).

## 2. seeds/rbac-01.ts (RBAC 01: Definições, Regras de Redação e Unidades)
```typescript
export const RBAC_01_TAXONOMY_SEEDS = {
  aircraftCategories: [
    { code: 'AIRPLANE', labelPtBr: 'Avião (Asa Fixa)', definition: 'Aeronave mais pesada que o ar, propulsada mecanicamente, cuja sustentação em voo é obtida principalmente por reações aerodinâmicas sobre superfícies que permanecem fixas.' },
    { code: 'ROTORCRAFT', labelPtBr: 'Giroplano / Helicóptero (Asa Rotativa)', definition: 'Aeronave mais pesada que o ar que depende principalmente da sustentação gerada por um ou mais rotores acionados mecanicamente.' },
    { code: 'GLIDER', labelPtBr: 'Planador', definition: 'Aeronave mais pesada que o ar, não propulsada mecanicamente.' },
    { code: 'BALLOON', labelPtBr: 'Balão Livre / Dirigível', definition: 'Aeronave mais leve que o ar.' }
  ],
  componentVsPart: {
    component: { definition: 'Sistema, subsistema, conjunto ou acessório instalado que desempenha função operacional.', examples: ['Atuador de comando de voo', 'Bomba de combustível', 'Transponder', 'Magneto'] },
    part: { definition: 'Unidade indivisível de fabricação, desprovida de autonomia funcional.', examples: ['Parafuso AN3-5A', 'O-ring', 'Rebite MS20470AD', 'Porca auto-frenante'] }
  },
  maintenanceInterventions: {
    PREVENTIVE_MAINTENANCE: { isMajor: false, triggerSEGVOO001: false, definition: 'Operações de preservação simples e substituição de peças padronizadas pequenas.' },
    MAINTENANCE: { isMajor: false, triggerSEGVOO001: false, definition: 'Ações de inspeção, revisão, reparo e conservação para assegurar a aeronavegabilidade.' },
    MAJOR_REPAIR: { isMajor: true, triggerSEGVOO001: true, definition: 'Reparo que pode afetar a resistência estrutural, desempenho ou características de voo.' },
    MAJOR_ALTERATION: { isMajor: true, triggerSEGVOO001: true, definition: 'Alteração que pode afetar peso/balanceamento, integridade estrutural ou características de voo.' },
    REBUILD: { isMajor: true, triggerSEGVOO001: true, definition: 'Desmontagem integral, limpeza, inspeção, reparo, remontagem e teste conforme tolerâncias de fabricação.' }
  },
  technicalDataStatus: {
    APPROVED_DATA: 'Dados explicitamente aprovados pela ANAC (ex: Manuais aprovados, DAs, STC/CST). Exigidos para Grandes Reparos e Grandes Alterações.',
    ACCEPTED_DATA: 'Dados aceitos por conformidade com práticas padrão reconhecidas (ex: AC 43.13-1B, boletins informativos).'
  },
  unitConverters: {
    altitudeDistance: { FEET_TO_METERS: 0.3048, METERS_TO_FEET: 3.28084, NAUTICAL_MILES_TO_KM: 1.852, KM_TO_NAUTICAL_MILES: 0.539957 },
    weightMass: { POUNDS_TO_KILOGRAMS: 0.45359237, KILOGRAMS_TO_POUNDS: 2.20462262 },
    pressure: { HPA_TO_INHG: 0.0295299830714, INHG_TO_HPA: 33.8638866667 },
    volumeFuel: { AVGAS_LITERS_TO_KG: 0.72, JET_A1_LITERS_TO_KG: 0.804, US_GALLONS_TO_LITERS: 3.785411784 }
  },
  regulatoryAcronyms: [
    { acronym: 'ANAC', name: 'Agência Nacional de Aviação Civil (Brasil)' },
    { acronym: 'DECEA', name: 'Departamento de Controle do Espaço Aéreo' },
    { acronym: 'CENIPA', name: 'Centro de Investigação e Prevenção de Acidentes Aeronáuticos' },
    { acronym: 'ICAO', name: 'Organização da Aviação Civil Internacional (OACI)' },
    { acronym: 'FAA', name: 'Federal Aviation Administration (EUA)' },
    { acronym: 'EASA', name: 'European Union Aviation Safety Agency' }
  ]
};
```

## 3. seeds/rbac-43-145.ts (RBAC 43 e 145: Manutenção e OM)
```typescript
export const RBAC_43_145_REGULATORY_SEEDS: RegulatorySeedItem[] = [
  {
    id: 2001, rbac: '43', legalReference: 'RBAC 43.3 / RBAC 43.7', isRef: 'IS 43-002',
    requirementTitle: 'Validação de Prerrogativa e Vínculo para Execução e Liberação de Manutenção',
    systemFeature: 'Trava sistêmica que impede abertura e assinatura de OS por profissional sem CHT ativa na habilitação aplicável (CEL, GMP, AVI) e sem vínculo ativo com a OM.',
    mandatory: true, targetApp: 'ERP_MANUTENCAO',
    controlledEnums: { MMA_RATINGS: ['CELULA', 'GMP', 'AVIONICOS'] }
  },
  {
    id: 2002, rbac: '43', legalReference: 'RBAC 43.9(a) / RBAC 43.11', isRef: 'IS 43.9-002',
    requirementTitle: 'Emissão Mandatória de Registro de Manutenção e CRS',
    systemFeature: 'Geração do CRS e lançamento em caderneta digital com assinatura eletrônica obrigatória antes da liberação da aeronave.',
    mandatory: true, targetApp: 'ERP_MANUTENCAO',
    parameters: { retentionPeriodYearsAfterRetirement: 1 }
  },
  {
    id: 2003, rbac: '43', legalReference: 'RBAC 43 Apêndice B', isRef: 'IS 43.9-001 §5.1',
    requirementTitle: 'Geração e Transmissão Mandatória do SEGVOO 001 em Grandes Intervenções',
    systemFeature: 'Geração automática de XML/PDF do SEGVOO 001 quando a OS for Grande Reparo ou Grande Alteração, com bloqueio de CRS até o protocolo no SEI/ANAC.',
    mandatory: true, targetApp: 'ERP_MANUTENCAO', formsAssociated: ['SEGVOO 001']
  },
  {
    id: 2004, rbac: '43', legalReference: 'RBAC 43.13(a)', isRef: 'IS 43-001',
    requirementTitle: 'Rastreabilidade e Segregação Física/Lógica de Peças e Componentes',
    systemFeature: 'Almoxarifado Aeronáutico com etiquetagem por cores e bloqueio de instalação para peças sem FORM 8130-3 ou com etiqueta vermelha.',
    mandatory: true, targetApp: 'ERP_MANUTENCAO', formsAssociated: ['FORM 8130-3'],
    controlledEnums: {
      PART_TAG_COLOR: ['VERDE_SERVICAVEL', 'AMARELA_REPARAVEL_INSPECAO', 'VERMELHA_CONDENADA_NAO_AERONAVEGAVEL'],
      CERTIFICATION_BASIS: ['TC', 'STC', 'TSO', 'PMA', 'OTP', 'STANDARD_HARDWARE']
    }
  },
  {
    id: 2005, rbac: '43', legalReference: 'RBAC 43.13(b)', isRef: 'IS 43.13-004',
    requirementTitle: 'Execução e Registro de Ensaios Não Destrutivos (END)',
    systemFeature: 'Registro estruturado de inspeções por END com validação de qualificação do inspetor (Níveis I, II, III) e laudo assinado.',
    mandatory: true, targetApp: 'ERP_MANUTENCAO',
    controlledEnums: {
      END_METHODS: ['LIQUIDO_PENETRANTE', 'PARTICULAS_MAGNETICAS', 'ULTRASSOM', 'RADIOGRAFIA', 'EDDY_CURRENT', 'INSPECAO_VISUAL_AVANCADA'],
      INSPECTOR_LEVELS: ['NIVEL_I', 'NIVEL_II', 'NIVEL_III']
    }
  },
  {
    id: 2006, rbac: '43', legalReference: 'RBAC 43.13(a)', isRef: 'IS 43.13-005',
    requirementTitle: 'Controle Metrológico e Calibração de Ferramental',
    systemFeature: 'Bloqueio de vinculação em OS de ferramentas de precisão com certificado RBC/INMETRO vencido.',
    mandatory: true, targetApp: 'ERP_MANUTENCAO',
    controlledEnums: { CALIBRATION_STANDARDS: ['RBC_INMETRO', 'FABRICANTE_OEM', 'PADRAO_RASTREAVEL_INTERNACIONAL'] }
  },
  {
    id: 2007, rbac: '145', legalReference: 'RBAC 145.51 / RBAC 145.61-I', isRef: 'IS 145-001H / IS 145-009E',
    requirementTitle: 'Gestão de EO, Lista de Capacidade (LC) e MOM da OM',
    systemFeature: 'Controle de escopo homologado da OM com trava para abertura de OS fora das marcas/modelos/serviços da LC ativa.',
    mandatory: true, targetApp: 'ERP_MANUTENCAO', formsAssociated: ['F-145-27E', 'F-145-28']
  },
  {
    id: 2008, rbac: '145', legalReference: 'RBAC 145.214-I', isRef: 'IS 145.214-001',
    requirementTitle: 'Sistema de Gestão da Segurança Operacional (SGSO) em OM',
    systemFeature: 'Módulo de reporte de perigos, matriz de risco 5x5, planos de mitigação e auditorias internas com retenção de 5 anos.',
    mandatory: true, targetApp: 'ERP_MANUTENCAO',
    parameters: { sgsoAuditRetentionYears: 5 }
  },
  {
    id: 2009, rbac: '43', legalReference: 'RBAC 43.13 / IS 43-001', isRef: 'Publicações',
    requirementTitle: 'Vinculação da Tarefa ao Manual Técnico via Recorte de Publicações',
    systemFeature: 'A tarefa de manutenção consome o recorte do manual aplicável (biblioteca licenciada). Sem assinatura de Publicações, a tarefa abre sem o recorte e o sistema orienta a obtenção por fora.',
    mandatory: true, targetApp: 'CERTPUB',
    parameters: { requiresPublicationSubscription: true }
  }
];
```

## 4. seeds/rbac-61-63-65.ts (RBAC 61, 63, 65: Licenças e Habilitações)
```typescript
export const RBAC_61_63_65_REGULATORY_SEEDS: RegulatorySeedItem[] = [
  {
    id: 3001, rbac: '61', legalReference: 'RBAC 61.21 / RBAC 61.25', isRef: 'IS 61-001G',
    requirementTitle: 'Recenticidade de Voo de Pilotos e Validação de CIV Digital',
    systemFeature: 'Cálculo automatizado de recenticidade para liberação de escala e despacho, exigindo mínimo de 3 pousos em 90 dias ou 5 horas no tipo/classe.',
    mandatory: true, targetApp: 'ERP_OPERADORES',
    parameters: { recentLandingMinCount: 3, recentLandingWindowDays: 90, recentFlightHoursMin: 5 }
  },
  {
    id: 3002, rbac: '61', legalReference: 'RBAC 61.13(a) / Anexo 1 OACI',
    requirementTitle: 'Controle de Proficiência Linguística ICAO (Inglês Aeronáutico)',
    systemFeature: 'Controle de validade do exame de proficiência (SDEA), com bloqueio de voos internacionais.',
    mandatory: true, targetApp: 'RECRUTAMENTO',
    controlledEnums: { ICAO_ENGLISH_LEVELS: ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4_OPERATIONAL', 'LEVEL_5_EXTENDED', 'LEVEL_6_EXPERT'] },
    parameters: { validityYearsLevel4: 3, validityYearsLevel5: 6, validityYearsLevel6: 99 }
  },
  {
    id: 3003, rbac: '67', legalReference: 'RBAC 67.11 / RBAC 67.13',
    requirementTitle: 'Controle de Validade do Certificado Médico Aeronáutico (CMA)',
    systemFeature: 'Monitoramento preventivo de validade do CMA por classe de licença e faixa etária, com alertas a 30 dias do vencimento.',
    mandatory: true, targetApp: 'RCONTA',
    controlledEnums: { CMA_CLASSES: ['CLASSE_1_PLA_PC', 'CLASSE_2_PP_COMISSARIO', 'CLASSE_3_ATCO', 'CLASSE_4_VANT_LEVE'] }
  },
  {
    id: 3004, rbac: '65', legalReference: 'RBAC 65.71 / RBAC 65.83', isRef: 'IS 65-001F',
    requirementTitle: 'Prerrogativas e Experiência Recente de MMA',
    systemFeature: 'Verificação de atividade profissional de MMA (6 meses nos últimos 24 meses) para preservação das prerrogativas de liberação.',
    mandatory: true, targetApp: 'RCONTA',
    parameters: { requiredActiveMonthsInWindow: 6, windowPeriodMonths: 24 }
  },
  {
    id: 3005, rbac: '65', legalReference: 'RBAC 65 Subparte B', isRef: 'IS 00-008E',
    requirementTitle: 'Validação de Habilitação de Despachante Operacional de Voo (DOV)',
    systemFeature: 'Checagem do código CANAC e habilitação de DOV para assinatura e liberação de despacho sob RBAC 121 e 135.',
    mandatory: true, targetApp: 'ERP_OPERADORES', formsAssociated: ['FAD']
  }
];
```

## 5. seeds/rbac-120.ts (RBAC 120: PPSP)
```typescript
export const RBAC_120_REGULATORY_SEEDS: RegulatorySeedItem[] = [
  {
    id: 4001, rbac: '120', legalReference: 'RBAC 120.5 / RBAC 120.7', isRef: 'IS 120-002D',
    requirementTitle: 'Identificação e Cadastro de Pessoal Designado ARSO',
    systemFeature: 'Mapeamento automático de usuários com funções críticas sujeitos ao PPSP (tripulantes, MMA, DOV, operadores de rampa, controladores).',
    mandatory: true, targetApp: 'RCONTA',
    controlledEnums: { ARSO_FUNCTIONS: ['PILOTO_COMANDO', 'COPILOTO', 'COMISSARIO_VOO', 'MECANICO_VOO', 'MECANICO_MANUTENCAO_AERONAUTICA', 'DESPACHANTE_OPERACIONAL_VOO', 'OPERADOR_TRATOR_RAMPA_AEROPORTO', 'AGENTE_PROTECAO_AVSEC'] }
  },
  {
    id: 4002, rbac: '120', legalReference: 'RBAC 120.15 / RBAC 120.17', isRef: 'IS 120-002D §6',
    requirementTitle: 'Gestão de Exames Toxicológicos Periódicos de Larga Janela de Detecção',
    systemFeature: 'Controle de validade estrita de 90 dias para laudos toxicológicos de queratina/cabelo, bloqueando a atuação se expirar.',
    mandatory: true, targetApp: 'RCONTA',
    parameters: { toxicologicalValidityDays: 90, alertDaysBeforeExpiry: 15 },
    controlledEnums: { SCREENED_SUBSTANCES: ['ALCOOL_ETILICO', 'CANNABINOIDES_MACONHA', 'COCAINA_E_DERIVADOS', 'OPIACEOS_MORFINA_CODEINA_HEROINA', 'ANFETAMINAS_E_METANFETAMINAS', 'FENCICLIDINA_PCP'] }
  },
  {
    id: 4003, rbac: '120', legalReference: 'RBAC 120.15(c)', isRef: 'IS 120-002D §7',
    requirementTitle: 'Motor Criptográfico de Sorteio Aleatório Inopinado de ARSO',
    systemFeature: 'Algoritmo pseudoaleatório auditável com ancoragem de semente no ledger para seleção inopinada de colaboradores.',
    mandatory: true, targetApp: 'RCONTA',
    parameters: { minimumAnnualRandomTestingRatePercent: 25 }
  },
  {
    id: 4004, rbac: '120', legalReference: 'RBAC 120.23', isRef: 'IS 120-002D §10',
    requirementTitle: 'Protocolo de Afastamento Imediato por Resultado Positivo',
    systemFeature: 'Bloqueio instantâneo e irrevogável de todas as prerrogativas operacionais do colaborador em caso de laudo positivo, notificando o Gestor do PPSP.',
    mandatory: true, targetApp: 'RCONTA'
  }
];
```

## 6. seeds/rbac-121-135.ts (RBAC 91, 119, 121, 135: Operadores — v2 sem 137)
```typescript
export const RBAC_OPERATIONS_REGULATORY_SEEDS: RegulatorySeedItem[] = [
  {
    id: 5001, rbac: '91', legalReference: 'RBAC 91.213 / RBAC 135.179 / RBAC 121.628', isRef: 'IS 91-012',
    requirementTitle: 'Gestão Estrita de Categorias e Prazos de Diferimento de Itens da MEL',
    systemFeature: 'Motor de contagem regressiva de prazos de diferimento com bloqueio automático da aeronave no término do período regulamentar.',
    mandatory: true, targetApp: 'ERP_OPERADORES',
    controlledEnums: { MEL_CATEGORIES: ['CAT_A_PRAZO_ESPECIFICO_CONFORME_TABELA', 'CAT_B_3_DIAS_CONSECUTIVOS_72_HORAS', 'CAT_C_10_DIAS_CONSECUTIVOS_240_HORAS', 'CAT_D_120_DIAS_CONSECUTIVOS'] },
    parameters: { melCategoryBHours: 72, melCategoryCHours: 240, melCategoryDHours: 2880 }
  },
  {
    id: 5002, rbac: '121', legalReference: 'RBAC 121.645 / RBAC 135.209 / RBAC 135.223', isRef: 'IS 135-006',
    requirementTitle: 'Cálculo Regulamentar de Mínimos de Combustível de Decolagem e Alternativa',
    systemFeature: 'Algoritmo de validação de plano de voo e despacho com exigência de combustível de etapa, alternativa e reservas mínimas.',
    mandatory: true, targetApp: 'ERP_OPERADORES',
    parameters: { vfrDayReserveAirplaneMinutes: 30, vfrNightReserveAirplaneMinutes: 45, vfrRotorcraftReserveMinutes: 20, ifrAirplaneReserveMinutes: 45, ifrTurbineWithoutAlternateHours: 2 }
  },
  {
    id: 5003, rbac: '121', legalReference: 'RBAC 121.161', isRef: 'IS 121-012',
    requirementTitle: 'Controle de Aprovação e Despacho de Voos ETOPS',
    systemFeature: 'Validação de despacho para rotas ETOPS com checagem de aeródromos de alternativa conforme o tempo de desvio homologado.',
    mandatory: true, targetApp: 'ERP_OPERADORES',
    controlledEnums: { ETOPS_TIERS: ['MIN_75', 'MIN_120', 'MIN_138', 'MIN_180', 'MIN_207'] },
    parameters: { etops207LogRetentionYears: 5 }
  },
  {
    id: 5004, rbac: '135', legalReference: 'RBAC 135.23 / RBAC 135.421', isRef: 'IS 135-002 / IS 135-21-001',
    requirementTitle: 'Gestão de MGO e Repeso Periódico de Frota',
    systemFeature: 'Controle do ciclo de repeso trienal (36 meses) para aeronaves de até 9 assentos e gestão dos 7 serviços de solo e 3 capítulos do MGO.',
    mandatory: true, targetApp: 'ERP_OPERADORES',
    parameters: { reweighCycleMonths: 36 },
    controlledEnums: { GROUND_SERVICES_135: ['RAMPA', 'PASSAGEIROS', 'BAGAGEM', 'CABINE', 'PESO_BALANCEAMENTO', 'EQUIPE_AUXILIAR', 'ABASTECIMENTO'] }
  }
];
```

## 7. seeds/rbac-137.ts (RBAC 137: Aeroagrícola — v2, ERP Agrícola)
```typescript
export const RBAC_137_REGULATORY_SEEDS: RegulatorySeedItem[] = [
  {
    id: 5005, rbac: '137', legalReference: 'RBAC 137.201 / RBAC 137.215', isRef: 'IS 137-001 / IS 137-002 / IS 137-003',
    requirementTitle: 'Gestão de Certificado CDAG, Calibração de Dispersores e Registro de DGPS',
    systemFeature: 'Registro georreferenciado de faixas de aplicação aeroagrícola, controle de calibração de bicos/barras e laudo de calibração do DGPS.',
    mandatory: true, targetApp: 'ERP_AGRICOLA', formsAssociated: ['FCDAG']
  }
];
```

## 8. seeds/rbac-141-142.ts (RBAC 141 e 142: CIAC e CTAC)
```typescript
export const RBAC_141_142_REGULATORY_SEEDS: RegulatorySeedItem[] = [
  {
    id: 6001, rbac: '141', legalReference: 'RBAC 141.51 / RBAC 141.61', isRef: 'IS 141-001 §5',
    requirementTitle: 'Integração Canônica e Atualização de Status de Alunos no Sistema S141',
    systemFeature: 'Sincronização bidirecional via API com a base S141 da ANAC, controlando os 6 estados da vida acadêmica do aluno.',
    mandatory: true, targetApp: 'ERP_CURSOS',
    controlledEnums: { S141_STUDENT_STATUS: ['MATRICULADO', 'APROVADO', 'REPROVADO', 'CANCELADO', 'TRANSFERIDO', 'DESISTENTE'] }
  },
  {
    id: 6002, rbac: '141', legalReference: 'RBAC 141.83', isRef: 'IS 141-006 §4.2',
    requirementTitle: 'Trava Sistêmica de Tempo Limite de Matrícula (Dobro do Período Letivo)',
    systemFeature: 'Cancelamento compulsório da matrícula se o aluno atingir o dobro do tempo letivo homologado sem conclusão.',
    mandatory: true, targetApp: 'ERP_CURSOS',
    parameters: { maxCourseDurationMultiplier: 2.0 }
  },
  {
    id: 6003, rbac: '141', legalReference: 'RBAC 141.87', isRef: 'IS 141-006 §5.1',
    requirementTitle: 'Validade da Avaliação Teórica (Ground School) e Prazos de Certificação',
    systemFeature: 'Invalidação automática do aproveitamento teórico se as horas práticas não forem concluídas em 12 meses; certificado em até 10 dias.',
    mandatory: true, targetApp: 'ERP_CURSOS',
    parameters: { theoryEvaluationValidityMonths: 12, certificateIssuanceMaxDays: 10, studentRecordsRetentionYears: 5 }
  },
  {
    id: 6004, rbac: '142', legalReference: 'RBAC 142.49 / RBAC 60', isRef: 'IS 142-001 §5.2',
    requirementTitle: 'Qualificação e Monitoramento de Dispositivos de Simulação de Voo (FSTD)',
    systemFeature: 'Controle de qualificação periódica de FSTD sob o RBAC 60 (Níveis A, B, C, D), com bloqueio de sessões em caso de certificação vencida.',
    mandatory: true, targetApp: 'ERP_CURSOS',
    controlledEnums: { FSTD_QUALIFICATION_LEVELS: ['LEVEL_A', 'LEVEL_B', 'LEVEL_C', 'LEVEL_D', 'BITD', 'FNPT_I', 'FNPT_II', 'FTD_4', 'FTD_5', 'FTD_6'] }
  },
  {
    id: 6005, rbac: '142', legalReference: 'RBAC 142.27', isRef: 'IS 142-003',
    requirementTitle: 'Recertificação e Recorrência Bienal de Examinadores Credenciados de CTAC',
    systemFeature: 'Rastreamento da janela de 24 meses de recertificação dos examinadores de CTAC, com bloqueio de exames após o vencimento.',
    mandatory: true, targetApp: 'ERP_CURSOS',
    parameters: { examinerRecertificationMonths: 24 }
  }
];
```

## 9. seeds/rbac-153.ts (RBAC 153: Aeródromos e Infraestrutura)
```typescript
export const RBAC_153_REGULATORY_SEEDS: RegulatorySeedItem[] = [
  {
    id: 7001, rbac: '153', legalReference: 'RBAC 153.133 / RBAC 153.135', isRef: 'IS 153.133-001',
    requirementTitle: 'Avaliação da Condição de Pista via Matriz RCAM e Emissão de RCR',
    systemFeature: 'Cálculo automatizado do RWYCC (0 a 6) por terço (T1, T2, T3) e formatação da mensagem RCR para envio ao órgão ATS/AIS.',
    mandatory: true, targetApp: 'ERP_AERODROMOS', formsAssociated: ['RCR'],
    controlledEnums: {
      RWYCC_CODES: ['RWYCC_0', 'RWYCC_1', 'RWYCC_2', 'RWYCC_3', 'RWYCC_4', 'RWYCC_5', 'RWYCC_6'],
      RUNWAY_THIRDS: ['T1_PRIMEIRO_TERCO', 'T2_TERCO_CENTRAL', 'T3_TERCO_FINAL'],
      CONTAMINANTS: ['PISTA_SECA', 'UMIDA', 'AGUA_LAMINA_ATE_3MM', 'AGUA_LAMINA_MAIOR_3MM', 'GELO', 'BORRACHA_DEPOSITADA']
    }
  },
  {
    id: 7002, rbac: '153', legalReference: 'RBAC 153.403 / RBAC 153.415', isRef: 'IS 153.403-001 a IS 153.433-001',
    requirementTitle: 'Tempo-Resposta Máximo e Prontidão Operacional do SESCINC',
    systemFeature: 'Monitoramento do tempo-resposta de 3 minutos do CCI ao ponto mais distante da pista, com registro mandatório de desvios.',
    mandatory: true, targetApp: 'ERP_AERODROMOS',
    parameters: { maxResponseTimeMinutes: 3.0 },
    controlledEnums: { FIRE_CATEGORIES: ['CAT_1', 'CAT_2', 'CAT_3', 'CAT_4', 'CAT_5', 'CAT_6', 'CAT_7', 'CAT_8', 'CAT_9', 'CAT_10'], EXTINGUISHING_AGENTS: ['LGE_ESPUMA_CONCENTRADA', 'PQ_QUIMICO_ABC', 'PQ_QUIMICO_BC'] }
  },
  {
    id: 7003, rbac: '153', legalReference: 'RBAC 153.203 / RBAC 153.205', isRef: 'IS 153.203-001 / IS 153.205-001',
    requirementTitle: 'Monitoramento Físico de Pavimento: Atrito, Macrotextura e IRI',
    systemFeature: 'Controle de relatórios de ensaio de atrito e macrotextura com alertas para valores inferiores a 0,60 mm ou IRI superior a 2,5 m/km.',
    mandatory: true, targetApp: 'ERP_AERODROMOS',
    parameters: { minMacrotextureDepthMm: 0.60, maxIriMetersPerKm: 2.50 }
  },
  {
    id: 7004, rbac: '153', legalReference: 'RBAC 153.501 a 153.505', isRef: 'IS 153.501-001 a IS 153.505-001',
    requirementTitle: 'Gestão do Risco de Fauna e Integração Mandatória com o SIGRA',
    systemFeature: 'Registro de avistamentos e colisões com fauna na ASA com cálculo de risco logarítmico R=log(x) e envio compulsório ao SIGRA.',
    mandatory: true, targetApp: 'ERP_AERODROMOS'
  },
  {
    id: 7005, rbac: '153', legalReference: 'RBAC 153.51', isRef: 'IS 153.51-001',
    requirementTitle: 'Submissão de Relatório Quadrimestral do SGSO de Aeródromos',
    systemFeature: 'Job automatizado com alertas para fechamento e transmissão dos relatórios quadrimestrais à ANAC nos dias 20/01, 20/05 e 20/09.',
    mandatory: true, targetApp: 'ERP_AERODROMOS',
    parameters: { quadrimestralReportDeadlines: ['20/01', '20/05', '20/09'] }
  }
];
```

## 10. seeds/rbac-183.ts (RBAC 183: Credenciamento de Pessoas Físicas e Jurídicas)
```typescript
export const RBAC_183_REGULATORY_SEEDS: RegulatorySeedItem[] = [
  {
    id: 479, rbac: '183', legalReference: 'RBAC 183.43 / RBAC 183.55', isRef: 'IS 183-002 §5',
    requirementTitle: 'Vigência Trienal e Renovação Periódica de Credenciamento (PCP/PCF/PCA)',
    systemFeature: 'Controle de validade estrita de 1095 dias (3 anos) para portarias de credenciamento, com alerta de renovação aos 60 dias.',
    mandatory: true, targetApp: 'RCONTA',
    parameters: { accreditationValidityDays: 1095, renewalAlertDays: 60, interactionReportIntervalYears: 3 },
    formsAssociated: ['F-101-06']
  },
  {
    id: 500, rbac: '183', legalReference: 'RBAC 183.57', isRef: 'IS 183-005 §5.1.9',
    requirementTitle: 'Escopo e Prerrogativas de Vistoria Técnica Especial (VTE) por PCA',
    systemFeature: 'Controle do escopo de atuação do PCA por grupos de aeronaves e geração dos relatórios periódicos de atividade.',
    mandatory: true, targetApp: 'RCONTA',
    formsAssociated: ['F-141-10', 'F-141-12', 'TERMO_RESPONSABILIDADE_APENDICE_C'],
    controlledEnums: { PCA_SCOPES: ['GRUPO_A_PEQUENO_PORTE_ATE_5700KG', 'GRUPO_B_MEDIO_PORTE_COMMUTER', 'GRUPO_C_GRANDE_PORTE_TRANSPORTE'], PCA_AFFILIATION_TYPE: ['PCA_EMPREGADO', 'PCA_AUTONOMO'] }
  },
  {
    id: 526, rbac: '183', legalReference: 'RBAC 183.61', isRef: 'IS 183-003 §5.13',
    requirementTitle: 'Credenciamento de Examinadores de Mecânicos de Manutenção (MMA)',
    systemFeature: 'Controle de qualificação e histórico de exames aplicados por examinadores credenciados de MMA com preenchimento da ficha Famma.',
    mandatory: true, targetApp: 'RCONTA',
    formsAssociated: ['Famma'],
    parameters: { minPracticalExperienceMonthsMMA: 36 }
  }
];
```

## 11. COMO INTEGRAR OS SEEDS AO BRE E AOS MÓDULOS (v2 — padrão Nx)
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { RBAC_OPERATIONS_REGULATORY_SEEDS } from '@vortex/shared-dto/seeds/rbac-121-135';
import { RBAC_43_145_REGULATORY_SEEDS } from '@vortex/shared-dto/seeds/rbac-43-145';

@Injectable()
export class BusinessRulesEngineService {
  private readonly logger = new Logger(BusinessRulesEngineService.name);

  public async validateFlightDispatch(dispatchContext: DispatchContext): Promise<ValidationResult> {
    const fuelSeed = RBAC_OPERATIONS_REGULATORY_SEEDS.find(s => s.id === 5002);
    const melSeed = RBAC_OPERATIONS_REGULATORY_SEEDS.find(s => s.id === 5001);

    if (dispatchContext.flightRule === 'VFR' && dispatchContext.isNight) {
      const requiredReserve = (fuelSeed.parameters.vfrNightReserveAirplaneMinutes as number);
      if (dispatchContext.calculatedReserveMinutes < requiredReserve) {
        return { approved: false, violationCode: 'FUEL_RESERVE_INSUFFICIENT', regulatoryRef: fuelSeed.legalReference, message: `Reserva calculada (${dispatchContext.calculatedReserveMinutes} min) inferior ao mínimo de ${requiredReserve} min.` };
      }
    }

    if (dispatchContext.hasExpiredMelItems) {
      return { approved: false, violationCode: 'MEL_ITEM_EXPIRED', regulatoryRef: melSeed.legalReference, message: 'Aeronave possui item inoperante com prazo de diferimento vencido.' };
    }

    return { approved: true };
  }
}
```

> **Garantia de Integridade:** Toda avaliação do BRE que resulte em aprovação ou bloqueio é assinada com Ed25519 e ancorada no ledger sob o tipo `COMPLIANCE_CERTIFIED`.

## 12. MUDANÇAS DA v1 → v2 NESTE DOCUMENTO
1. **`targetApp` atualizado para os 13 apps** (enum `APP_MANUTENCAO`, `ERP_OPERADORES`, `ERP_AGRICOLA`, `ERP_CURSOS`, `ERP_AERODROMOS`, `RCONTA`, `RECRUTAMENTO`, `CERTPUB`, `NUCLEO`).
2. **RBAC 137 separado** em `seeds/rbac-137.ts` (ERP Agrícola); o arquivo de operações ficou `rbac-121-135.ts`.
3. **Seed 2009 novo** — recorte de Publicações vinculado à tarefa de manutenção (app CERTPUB).
4. **Importação do BRE no padrão Nx** (`@vortex/shared-dto/seeds/...`).
5. **Residência dos seeds:** `libs/shared-dto/src/lib/seeds/`.
