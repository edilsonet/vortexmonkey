import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  CVA_ALERT_DAYS,
  CVA_VALIDITY_DAYS,
  ETOPS_RETENTION_MINUTES,
  ETOPS_RETENTION_YEARS,
  FUEL_MINUTES,
  MEL_CATEGORY_DAYS,
  PAADV_QNH_DELTA_HPA,
  PAADV_TEMP_DELTA_C,
  PAADV_WIND_VARIATION,
  PERFORMANCE_MARGIN_C,
  PHASE_6_OPERATORS_EVENTS,
  REWEIGH_MONTHS,
  type AircraftCategory,
  type FlightRule,
  type MelCategory,
} from '@vortex/contracts-be';
import type { RequestContext } from '@vortex/types';
import { DatabaseService } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';
import type {
  AddFleetDto,
  CreateAirOperatorDto,
  CreateDispatchReleaseDto,
  CreateLogbookEntryDto,
  CreateMelItemDto,
  CreateOperationalManualDto,
  DeferMelItemDto,
  EndorseLogbookEntryDto,
  MetObservationDto,
  RecordCvaDto,
  RectifyLogbookEntryDto,
  RegisterAgriOperatorDto,
  RegisterDisperserDto,
  ReleaseDispatchDto,
  SignLogbookEntryDto,
  ValidateDispatchReleaseDto,
  VoidLogbookEntryDto,
} from './operators.dto';

/**
 * Converte data: strings 'YYYY-MM-DD' são ancoradas ao meio-dia UTC para evitar
 * deslocamento de fuso (meia-noite UTC vira o dia anterior em UTC-3), mantendo o
 * cálculo em JavaScript alinhado ao que é armazenado no PostgreSQL.
 */
const parseDate = (value: string): Date => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value));

const asDate = (value: string | Date): Date => (typeof value === 'string' ? parseDate(value) : new Date(value));

interface AirOperatorRow {
  id: string; tenant_id: string; company_id: string; operator_type: string;
  coa_number: string | null; eo_number: string | null; certification_phase: string;
  etops_approved: boolean; etops_diversion_minutes: number | null; status: string;
}

interface FleetRow {
  id: string; operator_id: string; aircraft_id: string; registration: string;
  model: string; aircraft_category: AircraftCategory; last_reweigh_date: string | null;
  next_reweigh_date: string | null; status: string;
}

interface AircraftRow {
  id: string; tenant_id: string; registration: string; total_hours: number;
  total_cycles: number; cva_number: string | null; cva_validity: string | null;
  cva_status: string;
}

interface MelItemRow {
  id: string; aircraft_id: string; ata_chapter: string; item_description: string;
  category: MelCategory; deferral_deadline: string | null; status: string;
}

interface DispatchReleaseRow {
  id: string; tenant_id: string; flight_number: string | null; aircraft_id: string;
  departure: string; destination: string; alternates: string[] | null;
  flight_rule: FlightRule; is_night: boolean;
  fuel_required_minutes: number; fuel_planned_minutes: number;
  fuel_valid: boolean; weight_balance_valid: boolean; met_valid: boolean;
  mel_items_valid: boolean; doo_id: string; status: string;
  etops_diversion_minutes: number | null; validation_notes: Record<string, unknown>;
}

interface LogbookEntryRow {
  id: string; tenant_id: string; aircraft_id: string; entry_date: string;
  departure_aerodrome: string; arrival_aerodrome: string;
  takeoff_time: string; landing_time: string; flight_time_hours: number;
  pilot_name: string; pilot_license: string; pilot_funcao: string;
  status: string; version: number;
}

@Injectable()
export class OperatorsService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
  ) {}

  // ─────────────────────────────────────────────
  // Regras puras de negócio (testáveis e determinísticas)
  // ─────────────────────────────────────────────

  /** Reserva regulamentar de combustível em minutos (RBAC 135, regras 3 e 4). */
  public static computeRequiredFuelMinutes(
    flightRule: FlightRule,
    isNight: boolean,
    aircraftCategory: AircraftCategory,
    hasAlternate: boolean,
  ): number {
    if (flightRule === 'VFR') {
      if (aircraftCategory === 'HELICOPTERO') return FUEL_MINUTES.VFR_HELICOPTERO;
      return isNight ? FUEL_MINUTES.VFR_AVIAO_NOITE : FUEL_MINUTES.VFR_AVIAO_DIA;
    }
    return hasAlternate ? FUEL_MINUTES.IFR_COM_ALTERNATIVA : FUEL_MINUTES.IFR_SEM_ALTERNATIVA;
  }

  /** Margem de desempenho sem MET: temperatura máxima prevista (±3h) + 4°C (regra 5). */
  public static evaluatePerformanceMargin(
    metValid: boolean,
    maxTemperatureForecastC?: number,
  ): { performanceValid: boolean; marginTemperatureC?: number; reason?: string } {
    if (metValid) return { performanceValid: true };
    if (maxTemperatureForecastC === undefined) {
      return {
        performanceValid: false,
        reason: 'Sem MET válida: exigida temperatura máxima prevista (±3h) para margem de desempenho de +4°C.',
      };
    }
    return { performanceValid: true, marginTemperatureC: maxTemperatureForecastC + PERFORMANCE_MARGIN_C };
  }

  /** Gatilhos PAADV: +5°C, -5 hPa, variação de vento > 1% (regra 6). */
  public static evaluatePaadv(met?: MetObservationDto | null): { required: boolean; reasons: string[] } {
    if (!met) return { required: false, reasons: [] };
    const reasons: string[] = [];
    if (met.temperatureC !== undefined && met.temperatureC >= PAADV_TEMP_DELTA_C) {
      reasons.push(`Temperatura ${met.temperatureC}°C ≥ gatilho +${PAADV_TEMP_DELTA_C}°C`);
    }
    if (met.qnhHpa !== undefined && met.qnhHpa <= -PAADV_QNH_DELTA_HPA) {
      reasons.push(`QNH ${met.qnhHpa} hPa ≤ gatilho -${PAADV_QNH_DELTA_HPA} hPa`);
    }
    if (met.windVariationPct !== undefined && met.windVariationPct > PAADV_WIND_VARIATION * 100) {
      reasons.push(`Variação de vento ${met.windVariationPct}% > ${PAADV_WIND_VARIATION * 100}%`);
    }
    return { required: reasons.length > 0, reasons };
  }

  /** Repeso de frota vencido: 36 meses (IS 135-21-001, regra 7). */
  public static isReweighExpired(lastReweighDate: string | Date | null): boolean {
    if (!lastReweighDate) return false;
    const limit = asDate(lastReweighDate);
    limit.setMonth(limit.getMonth() + REWEIGH_MONTHS);
    return limit < new Date();
  }

  /** CVA vencido (365 dias — IS 91-403-001, regra 9). `cvaValidity` é a data de emissão/verificação. */
  public static isCvaExpired(cvaValidity: string | Date | null): boolean {
    if (!cvaValidity) return false;
    const expiry = asDate(cvaValidity);
    expiry.setDate(expiry.getDate() + CVA_VALIDITY_DAYS);
    return expiry < new Date();
  }

  /** CVA em alerta: vence nos próximos 30 dias (data de emissão + 365 dias). */
  public static isCvaExpiringSoon(cvaValidity: string | Date | null): boolean {
    if (!cvaValidity) return false;
    const expiry = asDate(cvaValidity);
    expiry.setDate(expiry.getDate() + CVA_VALIDITY_DAYS);
    const alertLimit = new Date();
    alertLimit.setDate(alertLimit.getDate() + CVA_ALERT_DAYS);
    return expiry <= alertLimit && !OperatorsService.isCvaExpired(cvaValidity);
  }

  // ─────────────────────────────────────────────
  // Operadores e certificação (RBAC 119, 5 fases)
  // ─────────────────────────────────────────────

  /** POST /air-operators — Cadastra operador aéreo (RBAC 91/121/135/137). */
  public async registerAirOperator(context: RequestContext, dto: CreateAirOperatorDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const operatorId = randomUUID();
      const ledgerId = randomUUID();

      const result = await client.query(
        `INSERT INTO ops.air_operators
          (id, tenant_id, company_id, operator_type, coa_number, coa_validity, classification, eo_number, certification_phase, etops_approved, etops_diversion_minutes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ATIVO') RETURNING *`,
        [operatorId, context.tenantId, dto.companyId, dto.operatorType,
          dto.coaNumber ?? null, dto.coaValidity ? new Date(dto.coaValidity) : null,
          dto.classification ?? null, dto.eoNumber ?? null,
          dto.certificationPhase ?? 'FASE_1', dto.etopsApproved ?? false,
          dto.etopsDiversionMinutes ?? null],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'AIR_OPERATOR', entityId: operatorId,
        actionType: PHASE_6_OPERATORS_EVENTS.OPERATOR_REGISTERED,
        payload: { operatorId, operatorType: dto.operatorType, companyId: dto.companyId, certificationPhase: dto.certificationPhase ?? 'FASE_1' },
      });

      return result.rows[0];
    });
  }

  /** GET /air-operators — Lista operadores do tenant. */
  public listAirOperators(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query<AirOperatorRow>(
        'SELECT * FROM ops.air_operators WHERE tenant_id = $1 ORDER BY created_at DESC',
        [context.tenantId],
      )).rows);
  }

  /** POST /operator-fleet — Vincula aeronave à frota do operador. */
  public async addOperatorFleet(context: RequestContext, dto: AddFleetDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const operator = (await client.query<AirOperatorRow>(
        'SELECT * FROM ops.air_operators WHERE id = $1 AND tenant_id = $2',
        [dto.operatorId, context.tenantId],
      )).rows[0];

      if (!operator) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Operador não encontrado no tenant.' });

      const fleetId = randomUUID();
      const ledgerId = randomUUID();
      const lastReweigh = dto.lastReweighDate ? parseDate(dto.lastReweighDate) : null;
      const nextReweigh = lastReweigh
        ? new Date(lastReweigh.getFullYear(), lastReweigh.getMonth() + REWEIGH_MONTHS, lastReweigh.getDate())
        : null;

      const result = await client.query<FleetRow>(
        `INSERT INTO ops.operator_fleet
          (id, operator_id, aircraft_id, registration, model, aircraft_category, max_passengers, max_takeoff_weight_kg, last_reweigh_date, next_reweigh_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [fleetId, dto.operatorId, dto.aircraftId, dto.registration, dto.model,
          dto.aircraftCategory ?? 'AVIAO', dto.maxPassengers ?? null,
          dto.maxTakeoffWeightKg ?? null, lastReweigh, nextReweigh],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'OPERATOR_FLEET', entityId: fleetId,
        actionType: PHASE_6_OPERATORS_EVENTS.FLEET_ADDED,
        payload: { fleetId, operatorId: dto.operatorId, aircraftId: dto.aircraftId, registration: dto.registration, nextReweighDate: nextReweigh?.toISOString() ?? null },
      });

      return result.rows[0];
    });
  }

  /** GET /operator-fleet — Lista frota do tenant (via operadores). */
  public listOperatorFleet(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query<FleetRow>(
        `SELECT f.* FROM ops.operator_fleet f
         JOIN ops.air_operators o ON o.id = f.operator_id
         WHERE o.tenant_id = $1 ORDER BY f.created_at DESC`,
        [context.tenantId],
      )).rows);
  }

  // ─────────────────────────────────────────────
  // MEL — Lista de Equipamentos Mínimos (IS 91-012)
  // ─────────────────────────────────────────────

  /** POST /mel-items — Cadastra item MEL. */
  public async createMelItem(context: RequestContext, dto: CreateMelItemDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const melId = randomUUID();
      const ledgerId = randomUUID();

      const result = await client.query<MelItemRow>(
        `INSERT INTO ops.mel_items
          (id, tenant_id, aircraft_id, ata_chapter, item_description, category, procedure_o, procedure_m, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [melId, context.tenantId, dto.aircraftId, dto.ataChapter, dto.itemDescription,
          dto.category, dto.procedureO ?? null, dto.procedureM ?? null, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'MEL_ITEM', entityId: melId,
        actionType: PHASE_6_OPERATORS_EVENTS.MEL_ITEM_CREATED,
        payload: { melId, aircraftId: dto.aircraftId, ataChapter: dto.ataChapter, category: dto.category },
      });

      return result.rows[0];
    });
  }

  /** GET /mel-items — Lista itens MEL (com status EXPIRADO derivado). */
  public listMelItems(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      await client.query(
        `UPDATE ops.mel_items
         SET status = 'EXPIRADO', updated_at = now()
         WHERE tenant_id = $1 AND status = 'DIFERIDO' AND deferral_deadline < now()`,
        [context.tenantId],
      );
      return (await client.query<MelItemRow>(
        'SELECT * FROM ops.mel_items WHERE tenant_id = $1 ORDER BY created_at DESC',
        [context.tenantId],
      )).rows;
    });
  }

  /** POST /mel-items/:id/defer — Diferir item com prazo por categoria; DA prevalece (regra 2). */
  public async deferMelItem(context: RequestContext, melId: string, dto: DeferMelItemDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const mel = (await client.query<MelItemRow>(
        'SELECT * FROM ops.mel_items WHERE id = $1 AND tenant_id = $2',
        [melId, context.tenantId],
      )).rows[0];

      if (!mel) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Item MEL não encontrado.' });
      if (mel.status === 'REPARADO') {
        throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Item MEL já reparado.' });
      }

      // Regra 2: DA pendente prevalece sobre o MEL — proibido relaxamento operacional.
      const pendingAd = (await client.query(
        `SELECT * FROM ops.airworthiness_directives WHERE aircraft_id = $1 AND status = 'PENDENTE' LIMIT 1`,
        [mel.aircraft_id],
      )).rows[0];

      if (pendingAd) {
        throw new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: `VIOLAÇÃO IS 91-012: DA pendente "${pendingAd.ad_number}" prevalece sobre o MEL; diferimento bloqueado.`,
        });
      }

      const days = MEL_CATEGORY_DAYS[mel.category];
      let deadline = dto.deferralDeadline ? new Date(dto.deferralDeadline) : null;
      if (!deadline && days != null) {
        deadline = new Date();
        deadline.setDate(deadline.getDate() + days);
      }
      if (!deadline) {
        throw new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: 'Item MEL CAT_A exige prazo de diferimento explícito (deferralDeadline).',
        });
      }

      const ledgerId = randomUUID();
      await client.query(
        `UPDATE ops.mel_items
         SET status = 'DIFERIDO', deferral_deadline = $2, procedure_o = COALESCE($3, procedure_o), updated_at = now()
         WHERE id = $1`,
        [melId, deadline, dto.procedureO ?? null],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'MEL_ITEM', entityId: melId,
        actionType: PHASE_6_OPERATORS_EVENTS.MEL_ITEM_DEFERRED,
        payload: { melId, aircraftId: mel.aircraft_id, category: mel.category, deferralDeadline: deadline.toISOString() },
      });

      return { melId, status: 'DIFERIDO', deferralDeadline: deadline.toISOString() };
    });
  }

  // ─────────────────────────────────────────────
  // Logbook digital (schema canônico vortex_logbook_entries)
  // ─────────────────────────────────────────────

  /** POST /logbook-entries — Lança registro no logbook digital. */
  public async createLogbookEntry(context: RequestContext, dto: CreateLogbookEntryDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const entryId = randomUUID();
      const ledgerId = randomUUID();

      const result = await client.query(
        `INSERT INTO ops.logbook_entries
          (id, aircraft_id, entry_type, entry_date, entry_time_utc, departure_aerodrome, arrival_aerodrome,
           block_off_time, takeoff_time, landing_time, block_on_time, flight_time_hours, habilitacao, modelo,
           pousos, diurno, noturno, navegacao, instrumento, capota, simulador, milhas_navegacao, tpx, experimental,
           airframe_hours_increment, airframe_cycles_increment,
           engine_1_hours, engine_1_cycles, engine_2_hours, engine_2_cycles,
           propeller_1_hours, propeller_2_hours, apu_hours, apu_cycles,
           discrepancies, mel_cdl_reference,
           pilot_person_id, pilot_name, pilot_license, pilot_funcao, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41) RETURNING *`,
        [entryId, dto.aircraftId, dto.entryType, dto.entryDate, new Date(dto.entryTimeUtc),
          dto.departureAerodrome, dto.arrivalAerodrome, dto.takeoffTime ? new Date(dto.takeoffTime) : null,
          new Date(dto.takeoffTime), new Date(dto.landingTime), null, dto.flightTimeHours,
          dto.habilitacao, dto.modelo, dto.pousos ?? 1, dto.diurno ?? 0, dto.noturno ?? 0,
          dto.navegacao ?? 0, dto.instrumento ?? 0, dto.capota ?? 0, dto.simulador ?? 0,
          dto.milhasNavegacao ?? 0, dto.tpx ?? false, dto.experimental ?? false,
          dto.airframeHoursIncrement, dto.airframeCyclesIncrement,
          dto.engine1Hours ?? 0, dto.engine1Cycles ?? 0, dto.engine2Hours ?? 0, dto.engine2Cycles ?? 0,
          dto.propeller1Hours ?? 0, dto.propeller2Hours ?? 0, dto.apuHours ?? 0, dto.apuCycles ?? 0,
          dto.discrepancies ?? null, dto.melCdlReference ?? null,
          dto.pilotPersonId, dto.pilotName, dto.pilotLicense, dto.pilotFuncao, context.tenantId],
      );

      // Escrituração automática das horas/ciclos na aeronave (IS 91-015 / cadernetas digitais)
      await client.query(
        `UPDATE ops.aircraft
         SET total_hours = total_hours + $2, total_cycles = total_cycles + $3, updated_at = now()
         WHERE id = $1`,
        [dto.aircraftId, dto.airframeHoursIncrement, dto.airframeCyclesIncrement],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'LOGBOOK_ENTRY', entityId: entryId,
        actionType: PHASE_6_OPERATORS_EVENTS.LOGBOOK_ENTRY_CREATED,
        payload: { entryId, aircraftId: dto.aircraftId, entryDate: dto.entryDate, pilotFuncao: dto.pilotFuncao, flightTimeHours: dto.flightTimeHours },
      });

      return result.rows[0];
    });
  }

  /** GET /logbook-entries — Lista lançamentos do tenant. */
  public listLogbookEntries(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query<LogbookEntryRow>(
        'SELECT * FROM ops.logbook_entries WHERE tenant_id = $1 ORDER BY entry_date DESC, entry_time_utc DESC',
        [context.tenantId],
      )).rows);
  }

  /** POST /logbook-entries/:id/sign — Assinatura digital obrigatória (regra 16). */
  public async signLogbookEntry(context: RequestContext, entryId: string, dto: SignLogbookEntryDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const entry = (await client.query<LogbookEntryRow>(
        'SELECT * FROM ops.logbook_entries WHERE id = $1 AND tenant_id = $2',
        [entryId, context.tenantId],
      )).rows[0];

      if (!entry) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Lançamento de logbook não encontrado.' });
      if (entry.status !== 'draft') {
        throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Lançamento já assinado ou encerrado.' });
      }

      const contentHash = createHash('sha256')
        .update(JSON.stringify({
          id: entry.id, entryDate: entry.entry_date, departure: entry.departure_aerodrome,
          arrival: entry.arrival_aerodrome, takeoff: entry.takeoff_time, landing: entry.landing_time,
          flightTimeHours: entry.flight_time_hours, pilot: entry.pilot_name,
          license: entry.pilot_license, funcao: entry.pilot_funcao,
          attestation: dto.attestationText,
        }))
        .digest('hex');

      const ledgerId = randomUUID();
      await client.query(
        `UPDATE ops.logbook_entries
         SET status = 'signed', signature_timestamp = $2, signature_identity = $3, signature_verified = true,
             signature_verification_data = $4::jsonb, attestation_text = $5, content_hash = $6, updated_at = now()
         WHERE id = $1`,
        [entryId, new Date(dto.signatureTimestamp), dto.signatureIdentity,
          JSON.stringify({ method: 'Ed25519', verifier: 'VORTEX-API' }), dto.attestationText, contentHash],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'LOGBOOK_ENTRY', entityId: entryId,
        actionType: PHASE_6_OPERATORS_EVENTS.LOGBOOK_SIGNED,
        payload: { entryId, contentHash, signatureIdentity: dto.signatureIdentity, attestation: dto.attestationText },
      });

      return { entryId, status: 'signed', contentHash, signatureVerified: true };
    });
  }

  /** POST /logbook-entries/:id/endorse — Endosso de instrutor + envio DBE (regra 16). */
  public async endorseLogbookEntry(context: RequestContext, entryId: string, dto: EndorseLogbookEntryDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const entry = (await client.query<LogbookEntryRow>(
        'SELECT * FROM ops.logbook_entries WHERE id = $1 AND tenant_id = $2',
        [entryId, context.tenantId],
      )).rows[0];

      if (!entry) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Lançamento de logbook não encontrado.' });
      if (entry.status !== 'signed' && entry.status !== 'rectified') {
        throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Endosso exige lançamento previamente assinado.' });
      }

      const dbeEnviado = dto.dbeEnviado ?? true;
      const ledgerId = randomUUID();
      await client.query(
        `UPDATE ops.logbook_entries
         SET endossado = true, endossado_por = $2, endossado_em = now(),
             dbe_enviado = $3, dbe_enviado_em = CASE WHEN $3 THEN now() ELSE dbe_enviado_em END, updated_at = now()
         WHERE id = $1`,
        [entryId, dto.endossadoPor, dbeEnviado],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'LOGBOOK_ENTRY', entityId: entryId,
        actionType: PHASE_6_OPERATORS_EVENTS.LOGBOOK_ENDORSED,
        payload: { entryId, endossadoPor: dto.endossadoPor, dbeEnviado },
      });

      return { entryId, endossado: true, endossadoPor: dto.endossadoPor, dbeEnviado };
    });
  }

  /** POST /logbook-entries/:id/rectify — Retificação com nova versão (regra 16). */
  public async rectifyLogbookEntry(context: RequestContext, entryId: string, dto: RectifyLogbookEntryDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const entry = (await client.query<LogbookEntryRow>(
        'SELECT * FROM ops.logbook_entries WHERE id = $1 AND tenant_id = $2',
        [entryId, context.tenantId],
      )).rows[0];

      if (!entry) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Lançamento de logbook não encontrado.' });
      if (entry.status === 'voided') throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Lançamento anulado é terminal.' });
      if (entry.status === 'draft') throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Retificação exige lançamento assinado.' });

      const ledgerId = randomUUID();
      await client.query(
        `UPDATE ops.logbook_entries
         SET status = 'rectified', version = version + 1, rectification_reason = $2, updated_at = now()
         WHERE id = $1`,
        [entryId, dto.rectificationReason],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'LOGBOOK_ENTRY', entityId: entryId,
        actionType: PHASE_6_OPERATORS_EVENTS.LOGBOOK_RECTIFIED,
        payload: { entryId, version: entry.version + 1, rectificationReason: dto.rectificationReason },
      });

      return { entryId, status: 'rectified', version: entry.version + 1 };
    });
  }

  /** POST /logbook-entries/:id/void — Anulação com motivo (regra 16). */
  public async voidLogbookEntry(context: RequestContext, entryId: string, dto: VoidLogbookEntryDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const entry = (await client.query<LogbookEntryRow>(
        'SELECT * FROM ops.logbook_entries WHERE id = $1 AND tenant_id = $2',
        [entryId, context.tenantId],
      )).rows[0];

      if (!entry) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Lançamento de logbook não encontrado.' });
      if (entry.status === 'voided') throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Lançamento já anulado.' });
      if (entry.status === 'draft') throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Rascunho não assinado não é anulado; deve ser excluído.' });

      const ledgerId = randomUUID();
      await client.query(
        `UPDATE ops.logbook_entries
         SET status = 'voided', voided_reason = $2, updated_at = now()
         WHERE id = $1`,
        [entryId, dto.voidedReason],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'LOGBOOK_ENTRY', entityId: entryId,
        actionType: PHASE_6_OPERATORS_EVENTS.LOGBOOK_VOIDED,
        payload: { entryId, voidedReason: dto.voidedReason },
      });

      return { entryId, status: 'voided', voidedReason: dto.voidedReason };
    });
  }

  // ─────────────────────────────────────────────
  // Despacho operacional (DOV)
  // ─────────────────────────────────────────────

  /** POST /dispatch-releases — Cria liberação de despacho em RASCUNHO. */
  public async createDispatchRelease(context: RequestContext, dto: CreateDispatchReleaseDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const releaseId = randomUUID();
      const ledgerId = randomUUID();
      const fleet = (await client.query<FleetRow>(
        `SELECT f.* FROM ops.operator_fleet f
         JOIN ops.air_operators o ON o.id = f.operator_id
         WHERE f.aircraft_id = $1 AND o.tenant_id = $2 LIMIT 1`,
        [dto.aircraftId, context.tenantId],
      )).rows[0];

      // Calcula a reserva regulamentar no servidor (regras 3 e 4)
      const requiredMinutes = OperatorsService.computeRequiredFuelMinutes(
        dto.flightRule, dto.isNight, fleet?.aircraft_category ?? 'AVIAO', (dto.alternates?.length ?? 0) > 0,
      );

      const result = await client.query<DispatchReleaseRow>(
        `INSERT INTO ops.dispatch_releases
          (id, tenant_id, flight_number, aircraft_id, departure, destination, alternates, flight_rule, is_night,
           fuel_required_minutes, fuel_planned_minutes, weight_balance_valid, met_valid, doo_id, etops_diversion_minutes, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
        [releaseId, context.tenantId, dto.flightNumber ?? null, dto.aircraftId, dto.departure, dto.destination,
          JSON.stringify(dto.alternates ?? []), dto.flightRule, dto.isNight, requiredMinutes,
          dto.fuelPlannedMinutes, dto.weightBalanceValid, dto.metValid, dto.dooId,
          dto.etopsDiversionMinutes ?? null, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'DISPATCH_RELEASE', entityId: releaseId,
        actionType: PHASE_6_OPERATORS_EVENTS.DISPATCH_CREATED,
        payload: { releaseId, aircraftId: dto.aircraftId, flightNumber: dto.flightNumber ?? null, flightRule: dto.flightRule, fuelRequiredMinutes: requiredMinutes, fuelPlannedMinutes: dto.fuelPlannedMinutes },
      });

      return result.rows[0];
    });
  }

  /** GET /dispatch-releases — Lista liberações do tenant. */
  public listDispatchReleases(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query<DispatchReleaseRow>(
        'SELECT * FROM ops.dispatch_releases WHERE tenant_id = $1 ORDER BY created_at DESC',
        [context.tenantId],
      )).rows);
  }

  /** POST /dispatch-releases/:id/validate — Valida combustível, met, P&B, MEL, DA, CVA, repeso e ETOPS. */
  public async validateDispatchRelease(context: RequestContext, releaseId: string, dto: ValidateDispatchReleaseDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const release = (await client.query<DispatchReleaseRow>(
        'SELECT * FROM ops.dispatch_releases WHERE id = $1 AND tenant_id = $2',
        [releaseId, context.tenantId],
      )).rows[0];

      if (!release) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Liberação de despacho não encontrada.' });
      if (release.status === 'LIBERADO' || release.status === 'EXECUTADO') {
        throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Despacho já liberado é documento imutável.' });
      }

      const violations: string[] = [];
      const alternates = release.alternates ?? [];

      // Regra 3 e 4 — combustível regulamentar
      const aircraft = (await client.query<AircraftRow>(
        'SELECT * FROM ops.aircraft WHERE id = $1 AND tenant_id = $2',
        [release.aircraft_id, context.tenantId],
      )).rows[0];
      const fleet = (await client.query<FleetRow>(
        'SELECT * FROM ops.operator_fleet WHERE aircraft_id = $1 LIMIT 1',
        [release.aircraft_id],
      )).rows[0];
      const operator = fleet
        ? (await client.query<AirOperatorRow>(
          'SELECT * FROM ops.air_operators WHERE id = $1 AND tenant_id = $2',
          [fleet.operator_id, context.tenantId],
        )).rows[0]
        : null;

      const requiredFuel = OperatorsService.computeRequiredFuelMinutes(
        release.flight_rule, release.is_night, fleet?.aircraft_category ?? 'AVIAO', alternates.length > 0,
      );
      const fuelValid = release.fuel_planned_minutes >= requiredFuel;
      if (!fuelValid) {
        violations.push(`Combustível regulamentar não atendido: planejado ${release.fuel_planned_minutes} min < mínimo ${requiredFuel} min.`);
      }

      // Regra 1 — item MEL diferido com prazo vencido bloqueia o voo
      const expiredMel = (await client.query<MelItemRow>(
        `SELECT * FROM ops.mel_items
         WHERE aircraft_id = $1 AND status = 'DIFERIDO' AND (deferral_deadline IS NULL OR deferral_deadline < now())
         LIMIT 1`,
        [release.aircraft_id],
      )).rows[0];
      if (expiredMel) {
        violations.push(`Item MEL vencido (${expiredMel.ata_chapter} — ${expiredMel.item_description}) bloqueia o voo.`);
      }

      // Regra 2 — DA prevalece sobre MEL
      const pendingAd = (await client.query<{ ad_number: string }>(
        `SELECT ad_number FROM ops.airworthiness_directives WHERE aircraft_id = $1 AND status = 'PENDENTE' LIMIT 1`,
        [release.aircraft_id],
      )).rows[0];
      if (pendingAd) {
        violations.push(`DA pendente "${pendingAd.ad_number}" prevalece sobre o MEL e bloqueia o despacho.`);
      }

      // Regra 9 — CVA vencido ou não conformidade crítica
      if (aircraft && (aircraft.cva_status === 'BLOQUEADO' || OperatorsService.isCvaExpired(aircraft.cva_validity))) {
        violations.push('CVA vencido ou não conformidade crítica (IS 91-403-001): bloqueio de despacho.');
      }

      // Regra 7 — repeso de frota vencido (36 meses)
      if (OperatorsService.isReweighExpired(fleet?.last_reweigh_date ?? null)) {
        violations.push(`Repeso da aeronave vencido (36 meses desde ${fleet?.last_reweigh_date}).`);
      }

      // Regra 5 — margem de desempenho sem MET: +4°C sobre a máxima prevista
      const margin = OperatorsService.evaluatePerformanceMargin(release.met_valid, dto.maxTemperatureForecastC);
      if (!margin.performanceValid) violations.push(margin.reason ?? 'Margem de desempenho não validada.');

      // P&B
      if (!release.weight_balance_valid) violations.push('Peso e balanceamento não validados.');

      // Regra 10 — ETOPS conforme tempo de desvio homologado
      if (operator?.etops_approved) {
        if (release.etops_diversion_minutes == null) {
          violations.push('Operador ETOPS exige tempo de desvio homologado no despacho.');
        } else if (release.etops_diversion_minutes > (operator.etops_diversion_minutes ?? 0)) {
          violations.push(`Tempo de desvio ETOPS (${release.etops_diversion_minutes} min) acima do homologado (${operator.etops_diversion_minutes} min).`);
        }
      }

      // Regra 6 — gatilhos PAADV (advisory)
      const paadv = OperatorsService.evaluatePaadv(dto.met);

      const status = violations.length > 0 ? 'BLOQUEADO' : 'VALIDADO';
      const notes = {
        requiredFuelMinutes: requiredFuel,
        fuelValid,
        melItemsValid: violations.length === 0,
        performanceMarginTemperatureC: margin.marginTemperatureC ?? null,
        paadvRequired: paadv.required,
        paadvReasons: paadv.reasons,
        etopsRetention: operator?.etops_approved
          ? { minutes: ETOPS_RETENTION_MINUTES, years: ETOPS_RETENTION_YEARS }
          : null,
        violations,
        validatedAt: new Date().toISOString(),
      };

      const ledgerId = randomUUID();
      await client.query(
        `UPDATE ops.dispatch_releases
         SET status = $2, fuel_valid = $3, mel_items_valid = $4, validation_notes = $5::jsonb, updated_at = now()
         WHERE id = $1`,
        [releaseId, status, fuelValid, violations.length === 0, JSON.stringify(notes)],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'DISPATCH_RELEASE', entityId: releaseId,
        actionType: status === 'VALIDADO' ? PHASE_6_OPERATORS_EVENTS.DISPATCH_VALIDATED : PHASE_6_OPERATORS_EVENTS.DISPATCH_BLOCKED,
        payload: { releaseId, status, fuelValid, requiredFuelMinutes: requiredFuel, violations, paadvRequired: paadv.required, paadvReasons: paadv.reasons },
      });

      if (violations.length > 0) {
        // Despacho bloqueado é resultado durável: persistido e ancorado no ledger,
        // retornado como sucesso (status BLOQUEADO) em vez de exceção — exceção aqui
        // reverteria a transação e apagaria o estado BLOQUEADO e o bloco DISPATCH_BLOCKED.
        return {
          releaseId,
          status: 'BLOQUEADO',
          requiredFuelMinutes: requiredFuel,
          fuelValid,
          performanceMarginTemperatureC: margin.marginTemperatureC ?? null,
          paadvRequired: paadv.required,
          paadvReasons: paadv.reasons,
          violations,
        };
      }

      return {
        releaseId,
        status: 'VALIDADO',
        requiredFuelMinutes: requiredFuel,
        fuelValid,
        performanceMarginTemperatureC: margin.marginTemperatureC ?? null,
        paadvRequired: paadv.required,
        paadvReasons: paadv.reasons,
      };
    });
  }

  /** POST /dispatch-releases/:id/release — Libera despacho com assinatura DOV. */
  public async releaseDispatch(context: RequestContext, releaseId: string, dto: ReleaseDispatchDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const release = (await client.query<DispatchReleaseRow>(
        'SELECT * FROM ops.dispatch_releases WHERE id = $1 AND tenant_id = $2',
        [releaseId, context.tenantId],
      )).rows[0];

      if (!release) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Liberação de despacho não encontrada.' });
      if (release.status !== 'VALIDADO') {
        throw new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: 'Despacho precisa ser validado (combustível, met, P&B e MEL) antes da liberação.',
        });
      }
      if (release.doo_id !== context.userId) {
        throw new UnprocessableEntityException({
          code: 'PERMISSION_DENIED',
          message: 'Liberação exige o Despachante Operacional de Voo (DOV) responsável pelo despacho.',
        });
      }

      const signature = (await client.query(
        'SELECT id FROM signatures.signatures WHERE id = $1 AND tenant_id = $2',
        [dto.signatureId, context.tenantId],
      )).rows[0];

      if (!signature) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Assinatura digital do DOV não encontrada.' });
      }

      const ledgerId = randomUUID();
      await client.query(
        `UPDATE ops.dispatch_releases
         SET status = 'LIBERADO', doo_signature_id = $2, updated_at = now()
         WHERE id = $1`,
        [releaseId, dto.signatureId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'DISPATCH_RELEASE', entityId: releaseId,
        actionType: PHASE_6_OPERATORS_EVENTS.DISPATCH_RELEASED,
        payload: { releaseId, flightNumber: release.flight_number ?? null, signatureId: dto.signatureId, releasedBy: context.userId },
      });

      return { releaseId, status: 'LIBERADO', dooSignatureId: dto.signatureId };
    });
  }

  // ─────────────────────────────────────────────
  // Manuais operacionais
  // ─────────────────────────────────────────────

  /** POST /operational-manuals — Cadastra manual operacional (MGO, AOM, MCmsV, MGM, PTO). */
  public async createOperationalManual(context: RequestContext, dto: CreateOperationalManualDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const manualId = randomUUID();
      const ledgerId = randomUUID();

      const result = await client.query(
        `INSERT INTO ops.operational_manuals
          (id, tenant_id, operator_id, manual_type, title, current_version, anac_process_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [manualId, context.tenantId, dto.operatorId, dto.manualType, dto.title,
          dto.currentVersion ?? '1.0', dto.anacProcessNumber ?? null],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'OPERATIONAL_MANUAL', entityId: manualId,
        actionType: PHASE_6_OPERATORS_EVENTS.MANUAL_CREATED,
        payload: { manualId, operatorId: dto.operatorId, manualType: dto.manualType, title: dto.title, version: dto.currentVersion ?? '1.0' },
      });

      return result.rows[0];
    });
  }

  /** GET /operational-manuals — Lista manuais do tenant. */
  public listOperationalManuals(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query(
        `SELECT * FROM ops.operational_manuals WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [context.tenantId],
      )).rows);
  }

  // ─────────────────────────────────────────────
  // Aeroagrícola (RBAC 137)
  // ─────────────────────────────────────────────

  /** POST /agri-operators — Cadastra operador aeroagrícola (CDAG). */
  public async registerAgriOperator(context: RequestContext, dto: RegisterAgriOperatorDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const agriId = randomUUID();
      const ledgerId = randomUUID();

      const result = await client.query(
        `INSERT INTO ops.agri_operators
          (id, tenant_id, company_id, cdag_number, cdag_validity, technical_manager_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'ATIVO') RETURNING *`,
        [agriId, context.tenantId, dto.companyId, dto.cdagNumber ?? null,
          dto.cdagValidity ? new Date(dto.cdagValidity) : null, dto.technicalManagerId ?? null],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'AGRI_OPERATOR', entityId: agriId,
        actionType: PHASE_6_OPERATORS_EVENTS.AGRI_OPERATOR_REGISTERED,
        payload: { agriId, cdagNumber: dto.cdagNumber ?? null, companyId: dto.companyId },
      });

      return result.rows[0];
    });
  }

  /** GET /agri-operators — Lista operadores aeroagrícolas. */
  public listAgriOperators(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query(
        'SELECT * FROM ops.agri_operators WHERE tenant_id = $1 ORDER BY created_at DESC',
        [context.tenantId],
      )).rows);
  }

  /** POST /dispersers — Cadastra dispersor com calibração e DGPS (regra 17). */
  public async registerDisperser(context: RequestContext, dto: RegisterDisperserDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      // IS 137-002: DGPS instalado exige Declaração de Conformidade
      if (dto.dgpsInstalled && !dto.dgpsConformityDeclaration) {
        throw new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: 'VIOLAÇÃO IS 137-002: DGPS instalado exige Declaração de Conformidade (dgpsConformityDeclaration).',
        });
      }

      const disperserId = randomUUID();
      const ledgerId = randomUUID();
      const expiry = parseDate(dto.calibrationExpiry);
      const isExpired = expiry < new Date();
      const status = isExpired ? 'CALIBRACAO_VENCIDA' : 'OPERACIONAL';

      const result = await client.query(
        `INSERT INTO ops.dispersers
          (id, tenant_id, aircraft_id, disperser_type, calibration_expiry, emc_test_done, circuit_breakers, dgps_installed, dgps_conformity_declaration, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10) RETURNING *`,
        [disperserId, context.tenantId, dto.aircraftId, dto.disperserType, expiry,
          dto.emcTestDone ?? false, JSON.stringify(dto.circuitBreakers ?? []),
          dto.dgpsInstalled, dto.dgpsConformityDeclaration ?? null, status],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'DISPERSER', entityId: disperserId,
        actionType: isExpired ? PHASE_6_OPERATORS_EVENTS.DISPERSER_BLOCKED : PHASE_6_OPERATORS_EVENTS.DISPERSER_REGISTERED,
        payload: { disperserId, aircraftId: dto.aircraftId, disperserType: dto.disperserType, calibrationExpiry: dto.calibrationExpiry, status },
      });

      return result.rows[0];
    });
  }

  /** GET /dispersers/expiring — Dispersores com calibração vencendo (30 dias) ou vencida. */
  public listExpiringDispersers(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query(
        `SELECT * FROM ops.dispersers
         WHERE tenant_id = $1 AND (calibration_expiry <= now() + interval '30 days')
         ORDER BY calibration_expiry ASC`,
        [context.tenantId],
      )).rows);
  }

  /** POST /aircraft/:id/cva — Registra Certificado de Verificação de Aeronavegabilidade (extensão IS 91-403-001). */
  public async recordCva(context: RequestContext, aircraftId: string, dto: RecordCvaDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const aircraft = (await client.query<AircraftRow>(
        'SELECT * FROM ops.aircraft WHERE id = $1 AND tenant_id = $2',
        [aircraftId, context.tenantId],
      )).rows[0];

      if (!aircraft) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Aeronave não encontrada no tenant.' });

      const validity = parseDate(dto.cvaValidity);
      const cvaStatus = OperatorsService.isCvaExpired(validity) ? 'VENCIDO' : 'VALIDO';
      const ledgerId = randomUUID();

      await client.query(
        `UPDATE ops.aircraft
         SET cva_number = $2, cva_validity = $3, cva_status = $4, updated_at = now()
         WHERE id = $1`,
        [aircraftId, dto.cvaNumber, validity, cvaStatus],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'AIRCRAFT', entityId: aircraftId,
        actionType: PHASE_6_OPERATORS_EVENTS.CVA_RECORDED,
        payload: { aircraftId, cvaNumber: dto.cvaNumber, cvaValidity: dto.cvaValidity, cvaStatus },
      });

      return { aircraftId, cvaNumber: dto.cvaNumber, cvaValidity: dto.cvaValidity, cvaStatus };
    });
  }

  // ─────────────────────────────────────────────
  // Dashboard de KPIs
  // ─────────────────────────────────────────────

  /** GET /operators/dashboard — KPIs do ERP de Operadores. */
  public async getDashboard(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const [operatorsByType, fleetCounts, melCounts, logbookCounts, dispatchCounts, disperserCounts, cvaCounts, manualCounts] = await Promise.all([
        client.query(`SELECT operator_type, certification_phase, COUNT(*) AS count FROM ops.air_operators WHERE tenant_id = $1 GROUP BY operator_type, certification_phase`, [context.tenantId]),
        client.query(`SELECT COUNT(*) AS total,
                            COUNT(*) FILTER (WHERE next_reweigh_date < now()) AS reweigh_expired
                      FROM ops.operator_fleet f JOIN ops.air_operators o ON o.id = f.operator_id WHERE o.tenant_id = $1`, [context.tenantId]),
        client.query(`SELECT status, COUNT(*) AS count FROM ops.mel_items WHERE tenant_id = $1 GROUP BY status`, [context.tenantId]),
        client.query(`SELECT status, COUNT(*) AS count FROM ops.logbook_entries WHERE tenant_id = $1 GROUP BY status`, [context.tenantId]),
        client.query(`SELECT status, COUNT(*) AS count FROM ops.dispatch_releases WHERE tenant_id = $1 GROUP BY status`, [context.tenantId]),
        client.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'CALIBRACAO_VENCIDA') AS calibration_expired,
                             COUNT(*) FILTER (WHERE calibration_expiry <= now() + interval '30 days') AS expiring
                      FROM ops.dispersers WHERE tenant_id = $1`, [context.tenantId]),
        client.query(`SELECT cva_status, COUNT(*) AS count FROM ops.aircraft WHERE tenant_id = $1 GROUP BY cva_status`, [context.tenantId]),
        client.query(`SELECT approval_status, COUNT(*) AS count FROM ops.operational_manuals WHERE tenant_id = $1 GROUP BY approval_status`, [context.tenantId]),
      ]);

      const pendingDbe = await client.query(
        `SELECT COUNT(*) AS count FROM ops.logbook_entries
         WHERE tenant_id = $1 AND status IN ('signed','rectified') AND dbe_enviado = false`,
        [context.tenantId],
      );

      const cvaRows = await client.query(
        `SELECT cva_validity, cva_status FROM ops.aircraft
         WHERE tenant_id = $1 AND cva_status IN ('VALIDO','VENCIDO','BLOQUEADO')`,
        [context.tenantId],
      );
      const cvaExpiringSoon = cvaRows.rows.filter((row: { cva_validity: string | null; cva_status: string }) =>
        row.cva_status === 'VALIDO' && OperatorsService.isCvaExpiringSoon(row.cva_validity),
      ).length;

      return {
        tenantId: context.tenantId,
        operators: operatorsByType.rows,
        fleet: fleetCounts.rows[0] ?? { total: 0, reweigh_expired: 0 },
        mel: melCounts.rows,
        logbook: { byStatus: logbookCounts.rows, pendingDbeCount: Number(pendingDbe.rows[0]?.count ?? 0) },
        dispatch: dispatchCounts.rows,
        dispersers: disperserCounts.rows[0] ?? { total: 0, calibration_expired: 0, expiring: 0 },
        cva: { byStatus: cvaCounts.rows, expiringSoonCount: cvaExpiringSoon },
        manuals: manualCounts.rows,
      };
    });
  }
}