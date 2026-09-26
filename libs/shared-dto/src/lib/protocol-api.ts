/** Registro de protocolo eletronico `AAAA-NNNNNN` (Resolucao ANAC 520/2019). */
export interface ProtocolRecord {
  readonly id: string;
  readonly protocolNumber: string;
  readonly protocolYear: number;
  readonly sequenceNumber: number;
  readonly tenantId: string;
  readonly companyId: string | null;
  readonly entityType: string;
  readonly entityId: string;
  readonly ledgerBlockId: string | null;
  readonly createdAt: string;
}
