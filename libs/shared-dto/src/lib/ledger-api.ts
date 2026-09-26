/** Contratos de auditoria do ledger imutavel (Resolucao ANAC 458/2017). */

/** Resultado de `GET /api/ledger/verify` para o tenant do contexto. */
export interface LedgerVerification {
  readonly valid: boolean;
  readonly blocks: number;
  readonly tenantId: string;
  readonly failure: LedgerVerificationFailure | null;
}

export interface LedgerVerificationFailure {
  readonly blockId: string;
  readonly position: number;
  readonly reason: string;
}
