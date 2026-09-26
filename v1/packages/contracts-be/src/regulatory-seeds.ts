export interface RegulatorySeedItem {
  id: number;
  rbac: string;
  isRef?: string;
  legalReference: string;
  requirementTitle: string;
  systemFeature: string;
  mandatory: boolean;
  targetApp: string;
  formsAssociated?: readonly string[];
  controlledEnums?: Readonly<Record<string, readonly string[]>>;
  parameters?: Readonly<Record<string, unknown>>;
}

export const RBAC_61_63_65_SEEDS = [
  {
    id: 3001,
    rbac: '61',
    isRef: 'IS 61-001G',
    legalReference: 'RBAC 61.21 / RBAC 61.25',
    requirementTitle: 'Recenticidade de Voo e CIV Digital',
    systemFeature: 'Validação canônica da recenticidade de voo.',
    mandatory: true,
    targetApp: 'rconta',
    parameters: { recentLandingMinCount: 3, recentLandingWindowDays: 90, recentFlightHoursMin: 5 },
  },
  {
    id: 3004,
    rbac: '65',
    isRef: 'IS 65-001F',
    legalReference: 'RBAC 65.71 / RBAC 65.83',
    requirementTitle: 'Prerrogativas e Experiência Recente de MMA',
    systemFeature: 'Validação da atividade profissional de MMA.',
    mandatory: true,
    targetApp: 'rconta',
    parameters: { requiredActiveMonthsInWindow: 6, windowPeriodMonths: 24 },
  },
] as const satisfies readonly RegulatorySeedItem[];

export const RBAC_183_SEEDS = [
  {
    id: 479,
    rbac: '183',
    isRef: 'IS 183-002 §5',
    legalReference: 'RBAC 183.43 / RBAC 183.55',
    requirementTitle: 'Vigência Trienal e Renovação de Credenciamento',
    systemFeature: 'Validade de 1.095 dias, alerta em 60 dias e bloqueio automático.',
    mandatory: true,
    targetApp: 'rconta',
    formsAssociated: ['F-101-06'],
    parameters: { accreditationValidityDays: 1095, renewalAlertDays: 60, interactionReportIntervalYears: 3 },
  },
  {
    id: 526,
    rbac: '183',
    isRef: 'IS 183-003 §5.13',
    legalReference: 'RBAC 183.61',
    requirementTitle: 'Credenciamento de Examinadores de MMA',
    systemFeature: 'Controle de elegibilidade e Famma.',
    mandatory: true,
    targetApp: 'rconta',
    formsAssociated: ['Famma'],
    parameters: { minPracticalExperienceMonthsMMA: 36 },
  },
] as const satisfies readonly RegulatorySeedItem[];

export const PHASE_ONE_REGULATORY_SEEDS = [...RBAC_61_63_65_SEEDS, ...RBAC_183_SEEDS] as const;
