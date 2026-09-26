import { Injectable, inject } from '@angular/core';
import type { LedgerVerification, ProtocolRecord } from '@vortex/shared-dto';
import { Observable } from 'rxjs';
import { ApiClient } from '../api/api-client.service';

/** Ledger e protocolo: a prova documental do que foi registrado. */
@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly api = inject(ApiClient);

  verifyLedger(): Observable<LedgerVerification> {
    return this.api.get<LedgerVerification>('/ledger/verify');
  }

  findProtocol(protocolNumber: string): Observable<ProtocolRecord> {
    return this.api.get<ProtocolRecord>(`/protocols/${encodeURIComponent(protocolNumber)}`);
  }
}
