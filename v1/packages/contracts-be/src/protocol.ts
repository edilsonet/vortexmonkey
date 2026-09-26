export const PROTOCOL_ACCESS_LEVELS = ['PUBLIC', 'RESTRICTED', 'PRIVATE'] as const;
export type ProtocolAccessLevel = (typeof PROTOCOL_ACCESS_LEVELS)[number];

export const RESTRICTION_BASES = [
  'LGPD_PERSONAL_DATA',
  'BUSINESS_CONFIDENTIALITY',
  'NATIONAL_SECURITY',
  'ONGOING_PROCESS',
] as const;
export type RestrictionBasis = (typeof RESTRICTION_BASES)[number];

export const PROTOCOL_VIEW_ACTIONS = ['REQUEST', 'GRANT', 'DENY'] as const;
export type ProtocolViewAction = (typeof PROTOCOL_VIEW_ACTIONS)[number];

export const PROTOCOL_EVENT_TYPES = [
  'PROTOCOL_CREATED',
  'DOCUMENT_ADDED',
  'STATUS_CHANGED',
  'NOTE_ADDED',
  'VIEW_REQUESTED',
  'VIEW_GRANTED',
  'VIEW_DENIED',
] as const;
export type ProtocolEventType = (typeof PROTOCOL_EVENT_TYPES)[number];

export const PHASE_2_EVENTS = {
  LEDGER_BLOCK_APPENDED: 'ledger.block.appended.v2',
  PROTOCOL_CREATED: 'protocol.created.v1',
  PROTOCOL_EVENT_APPENDED: 'protocol.event.appended.v1',
  PROTOCOL_VIEW_REQUESTED: 'protocol.view.requested.v1',
  PROTOCOL_VIEW_DECIDED: 'protocol.view.decided.v1',
  AUDIT_RECORDED: 'audit.recorded.v1',
} as const;
