export type OmCategory = 'CELULA' | 'MOTOR' | 'HELICE' | 'AVIONICOS' | 'SERVICOS_ESPECIALIZADOS';
export type OmPersonnelRole = 'RT' | 'GR' | 'GERENTE_QUALIDADE' | 'INSPETOR' | 'TECNICO';
export type AirworthinessStatus = 'AERONAVEGAVEL' | 'INOPERANTE' | 'GROUNDED';
export type LogbookType = 'CELULA' | 'MOTOR' | 'HELICE' | 'COMPONENTE';
export type WorkOrderType = 'PREVENTIVA' | 'CORRETIVA' | 'GRANDE_REPARO' | 'GRANDE_ALTERACAO' | 'INSPECAO' | 'REVISAO';
export type WorkOrderStatus = 'ABERTA' | 'EM_EXECUCAO' | 'AGUARDANDO_PECAS' | 'AGUARDANDO_APROVACAO' | 'CONCLUIDA' | 'CANCELADA';
export type PartCondition = 'NOVA' | 'USADA_SERVICAVEL' | 'USADA_NAO_SERVICAVEL' | 'REVISADA' | 'REPARADA';
export type PartTag = 'VERDE_SERVICAVEL' | 'AMARELA_REPARAVEL_INSPECAO' | 'VERMELHA_CONDENADA_NAO_AERONAVEGAVEL';
export type PartCertification = 'TC' | 'STC' | 'TSO' | 'PMA' | 'OTP' | 'PADRAO';
export type PartStatus = 'EM_ESTOQUE' | 'QUARENTENA' | 'RESERVADO' | 'INSTALADO' | 'DESCARTADO';
export type ToolStatus = 'OPERACIONAL' | 'CALIBRACAO_VENCIDA' | 'EM_MANUTENCAO' | 'BAIXADA';
export type CalibrationStandard = 'RBC_INMETRO' | 'FABRICANTE_OEM' | 'PADRAO_RASTREAVEL_INTERNACIONAL';
export type NdtMethod = 'LIQUIDO_PENETRANTE' | 'PARTICULAS_MAGNETICAS' | 'ULTRASSOM' | 'RADIOGRAFIA' | 'EDDY_CURRENT' | 'VISUAL';
export type NdtInspectorLevel = 'NIVEL_I' | 'NIVEL_II' | 'NIVEL_III';
export type AdStatus = 'PENDENTE' | 'CUMPRIDA' | 'NAO_APLICAVEL' | 'REVOGADA';

/** Fluxo comercial/técnico da oficina em 12 Etapas */
export const WORK_ORDER_STEPS: Record<number, string> = {
  1: 'Pedido de Cotação',
  2: 'Pré-Orçamento',
  3: 'Aprovação do Cliente',
  4: 'Solicitação de Peças',
  5: 'Inspeção de Recebimento',
  6: 'Triagem de Complexidade',
  7: 'Abertura da OS',
  8: 'Execução',
  9: 'Fechamento Técnico APRS',
  10: 'Orçamento Final Consolidado',
  11: 'Geração de Documentos (CRS/SEGVOO)',
  12: 'Liquidação Financeira',
};

export const PHASE_5_MAINTENANCE_EVENTS = {
  OM_REGISTERED: 'OM_REGISTERED',
  AIRCRAFT_REGISTERED: 'AIRCRAFT_REGISTERED',
  LOGBOOK_ENTRY_ADDED: 'LOGBOOK_ENTRY_ADDED',
  WORK_ORDER_CREATED: 'WORK_ORDER_CREATED',
  WORK_ORDER_STEP_UPDATED: 'WORK_ORDER_STEP_UPDATED',
  WORK_ORDER_CLOSED: 'WORK_ORDER_CLOSED',
  CRS_ISSUED: 'CRS_ISSUED',
  PART_REGISTERED: 'PART_REGISTERED',
  PART_QUARANTINED: 'PART_QUARANTINED',
  PART_INSTALLED: 'PART_INSTALLED',
  TOOL_CALIBRATED: 'TOOL_CALIBRATED',
  TOOL_CALIBRATION_EXPIRED: 'TOOL_CALIBRATION_EXPIRED',
  NDT_REPORTED: 'NDT_REPORTED',
  AD_COMPLIED: 'AD_COMPLIED',
} as const;
