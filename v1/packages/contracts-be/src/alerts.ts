export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'BLOCKING';
export type AlertStatus = 'ABERTO' | 'LIDO' | 'RESOLVIDO' | 'EXPIRADO';

export interface AlertDefinition {
  readonly alertType: string;
  readonly severity: AlertSeverity;
  readonly advanceDays: number; // Dias de antecedência
  readonly isBlocking: boolean;
}

export const SYSTEM_ALERTS = {
  CREDENTIAL_EXPIRING_RBAC183: { alertType: 'CREDENTIAL_EXPIRING_RBAC183', severity: 'CRITICAL', advanceDays: 60, isBlocking: false },
  LICENSE_CMA_EXPIRING: { alertType: 'LICENSE_CMA_EXPIRING', severity: 'CRITICAL', advanceDays: 30, isBlocking: false },
  TOXICOLOGICAL_EXAM_EXPIRING: { alertType: 'TOXICOLOGICAL_EXAM_EXPIRING', severity: 'CRITICAL', advanceDays: 15, isBlocking: false },
  MEL_ITEM_EXPIRING: { alertType: 'MEL_ITEM_EXPIRING', severity: 'CRITICAL', advanceDays: 3, isBlocking: false },
  TRAINING_EXPIRING: { alertType: 'TRAINING_EXPIRING', severity: 'WARNING', advanceDays: 30, isBlocking: false },
  OPERATIONAL_APPROVAL_EXPIRING: { alertType: 'OPERATIONAL_APPROVAL_EXPIRING', severity: 'WARNING', advanceDays: 30, isBlocking: false },
  ANAC_REPORT_DUE: { alertType: 'ANAC_REPORT_DUE', severity: 'CRITICAL', advanceDays: 15, isBlocking: false },
  INVOICE_OVERDUE: { alertType: 'INVOICE_OVERDUE', severity: 'BLOCKING', advanceDays: 0, isBlocking: true },
  AIRCRAFT_GROUNDED: { alertType: 'AIRCRAFT_GROUNDED', severity: 'CRITICAL', advanceDays: 0, isBlocking: true },
  TOOL_CALIBRATION_EXPIRED: { alertType: 'TOOL_CALIBRATION_EXPIRED', severity: 'BLOCKING', advanceDays: 0, isBlocking: true },
  DISPERSER_CALIBRATION_EXPIRED: { alertType: 'DISPERSER_CALIBRATION_EXPIRED', severity: 'BLOCKING', advanceDays: 0, isBlocking: true },
  ACCESS_CREDENTIAL_EXPIRED: { alertType: 'ACCESS_CREDENTIAL_EXPIRED', severity: 'BLOCKING', advanceDays: 0, isBlocking: true },
  MAINTENANCE_CHECKLIST_OVERDUE: { alertType: 'MAINTENANCE_CHECKLIST_OVERDUE', severity: 'WARNING', advanceDays: 0, isBlocking: false },
  EXTINGUISHER_BELOW_MINIMUM: { alertType: 'EXTINGUISHER_BELOW_MINIMUM', severity: 'CRITICAL', advanceDays: 0, isBlocking: false },
  RWYCC_DOWNGRADED: { alertType: 'RWYCC_DOWNGRADED', severity: 'CRITICAL', advanceDays: 0, isBlocking: false },
} as const;

export const PHASE_4_ALERT_EVENTS = {
  ALERT_CREATED: 'ALERT_CREATED',
  ALERT_READ: 'ALERT_READ',
  ALERT_RESOLVED: 'ALERT_RESOLVED',
} as const;
