import { Injectable, inject } from '@angular/core';
import type {
  AircraftComplianceResponse,
  AircraftRecord,
  ComplianceItemRecord,
  CreateAircraftRequest,
  CreateAircraftResponse,
  CreateComplianceItemRequest,
  CreateComplianceItemResponse,
  CreateMeterResetRequest,
  CreateMeterResetResponse,
  MeterReadingRecord,
  MeterResetRecord,
  RecordComplianceDoneRequest,
  RecordComplianceDoneResponse,
  RecordMeterReadingRequest,
  RecordMeterReadingResponse,
  ResetRule,
} from '@vortex/shared-dto';
import { Observable } from 'rxjs';
import { ApiClient } from '../api/api-client.service';

/** Acesso tipado as rotas de persistencia do ERP Manutencao (`ops-mro`). */
@Injectable({ providedIn: 'root' })
export class MroService {
  private readonly api = inject(ApiClient);

  listAircraft(): Observable<AircraftRecord[]> {
    return this.api.get<AircraftRecord[]>('/mro/aircraft');
  }

  createAircraft(body: CreateAircraftRequest): Observable<CreateAircraftResponse> {
    return this.api.post<CreateAircraftResponse>('/mro/aircraft', body);
  }

  listMeterReadings(aircraftId: string): Observable<MeterReadingRecord[]> {
    return this.api.get<MeterReadingRecord[]>(`/mro/aircraft/${aircraftId}/meter-readings`);
  }

  recordMeterReading(
    aircraftId: string,
    body: RecordMeterReadingRequest,
  ): Observable<RecordMeterReadingResponse> {
    return this.api.post<RecordMeterReadingResponse>(
      `/mro/aircraft/${aircraftId}/meter-readings`,
      body,
    );
  }

  listMeterResets(aircraftId: string): Observable<MeterResetRecord[]> {
    return this.api.get<MeterResetRecord[]>(`/mro/aircraft/${aircraftId}/meter-resets`);
  }

  createMeterReset(
    aircraftId: string,
    body: CreateMeterResetRequest,
  ): Observable<CreateMeterResetResponse> {
    return this.api.post<CreateMeterResetResponse>(
      `/mro/aircraft/${aircraftId}/meter-resets`,
      body,
    );
  }

  listComplianceItems(aircraftId: string): Observable<ComplianceItemRecord[]> {
    return this.api.get<ComplianceItemRecord[]>(`/mro/aircraft/${aircraftId}/compliance-items`);
  }

  createComplianceItem(
    aircraftId: string,
    body: CreateComplianceItemRequest,
  ): Observable<CreateComplianceItemResponse> {
    return this.api.post<CreateComplianceItemResponse>(
      `/mro/aircraft/${aircraftId}/compliance-items`,
      body,
    );
  }

  assessAircraft(aircraftId: string): Observable<AircraftComplianceResponse> {
    return this.api.get<AircraftComplianceResponse>(
      `/mro/aircraft/${aircraftId}/compliance/assess`,
    );
  }

  recordComplianceDone(
    body: RecordComplianceDoneRequest,
  ): Observable<RecordComplianceDoneResponse> {
    return this.api.post<RecordComplianceDoneResponse>('/mro/compliance/done', body);
  }

  listResetRules(): Observable<ResetRule[]> {
    return this.api.get<ResetRule[]>('/mro/compliance/reset-rules');
  }
}
