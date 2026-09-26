import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  IRI_MAX_M_KM,
  MACROTEXTURE_MIN_MM,
  PHASE_7_AERODROMES_EVENTS,
  RCAM_CONTAMINANT_RWYCC,
  SESCINC_MAX_RESPONSE_SECONDS,
  SGSO_QUARTERLY_REPORT_DATES,
  type RwyccValue,
} from '@vortex/contracts-be';
import type { RequestContext } from '@vortex/types';
import { DatabaseService } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';
import type {
  CreateAerodromeDto,
  CreateFaunaEventDto,
  CreateFireResponseLogDto,
  CreateRunwayConditionReportDto,
  CreateRunwayPavementDto,
} from './aerodromes.dto';

/**
 * Converte data: strings 'YYYY-MM-DD' são ancoradas ao meio-dia UTC para evitar
 * deslocamento de fuso (meia-noite UTC vira o dia anterior em UTC-3).
 */
const parseDate = (value: string): Date => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value));

interface AerodromeRow {
  id: string; tenant_id: string; company_id: string; icao_code: string;
  name: string; fire_category: string | null; fire_category_validity: string | null;
  status: string;
}

interface RunwayPavementRow {
  id: string; aerodrome_id: string; runway_designator: string; pcn: string | null;
  iri_m_km: number | null; macrotexture_mm: number | null; friction_coefficient: number | null;
}

interface RcrRow {
  id: string; aerodrome_id: string; runway_designator: string; report_time: string;
  rwycc_t1: number; rwycc_t2: number; rwycc_t3: number;
  contaminants: string[] | null; rcr_message: string; sent_to_twr: boolean;
}

@Injectable()
export class AerodromesService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
  ) {}

  // ─────────────────────────────────────────────
  // Regras puras (testáveis)
  // ─────────────────────────────────────────────

  /** RWYCC por terço via matriz RCAM: contaminante → valor 0-6 (IS 153.133-001). */
  public static rwyccForContaminant(contaminant: string): RwyccValue {
    return RCAM_CONTAMINANT_RWYCC[contaminant?.toUpperCase()] ?? 5;
  }

  /** Mensagem RCR padronizada por terço (T1/T2/T3). */
  public static buildRcrMessage(runwayDesignator: string, t1: number, t2: number, t3: number): string {
    return `RCR ${runwayDesignator} T1/${t1} T2/${t2} T3/${t3} RWYCC ${Math.min(t1, t2, t3)}`;
  }

  /** SESCINC: tempo-resposta máximo de 3 minutos (180s). */
  public static isFireResponseWithinLimit(responseTimeSeconds: number): boolean {
    return responseTimeSeconds <= SESCINC_MAX_RESPONSE_SECONDS;
  }

  /** Fauna (SIGRA): risco R = log(x). */
  public static computeFaunaRisk(sightings: number): number {
    return Number(Math.log10(sightings).toFixed(4));
  }

  /** SGSO: próxima data de relatório quadrimestral (20/01, 20/05, 20/09 — IS 153.51-001). */
  public static nextSgsoReportDue(from: Date = new Date()): Date {
    const candidates = SGSO_QUARTERLY_REPORT_DATES
      .map(({ month, day }) => new Date(from.getFullYear(), month - 1, day))
      .filter((candidate) => candidate >= from);
    const next = candidates[0];
    if (next) return next;
    return new Date(from.getFullYear() + 1, 0, 20); // 20/01 do ano seguinte
  }

  public static isSgsoReportDue(date: Date): boolean {
    return SGSO_QUARTERLY_REPORT_DATES.some(({ month, day }) => date.getMonth() === month - 1 && date.getDate() === day);
  }

  /** IRI ≤ 2,5 m/km e macrotextura ≥ 0,60 mm (IS 153.203-001/205-001). */
  public static validatePavement(iriMKm: number | undefined, macrotextureMm: number | undefined): string[] {
    const violations: string[] = [];
    if (iriMKm !== undefined && iriMKm > IRI_MAX_M_KM) violations.push(`IRI ${iriMKm} m/km > limite ${IRI_MAX_M_KM} m/km.`);
    if (macrotextureMm !== undefined && macrotextureMm < MACROTEXTURE_MIN_MM) violations.push(`Macrotextura ${macrotextureMm} mm < mínimo ${MACROTEXTURE_MIN_MM} mm.`);
    return violations;
  }

  // ─────────────────────────────────────────────
  // Aeródromo e infraestrutura
  // ─────────────────────────────────────────────

  /** POST /aerodromes — Cadastra aeródromo. */
  public async registerAerodrome(context: RequestContext, dto: CreateAerodromeDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const aerodromeId = randomUUID();
      const ledgerId = randomUUID();

      const result = await client.query<AerodromeRow>(
        `INSERT INTO ops.aerodromes
          (id, tenant_id, company_id, icao_code, name, fire_category, fire_category_validity, status)
         VALUES ($1, $2, $3, UPPER($4), $5, $6, $7, 'OPERACIONAL') RETURNING *`,
        [aerodromeId, context.tenantId, dto.companyId, dto.icaoCode, dto.name,
          dto.fireCategory ?? null, dto.fireCategoryValidity ? new Date(dto.fireCategoryValidity) : null],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'AERODROME', entityId: aerodromeId,
        actionType: PHASE_7_AERODROMES_EVENTS.AERODROME_REGISTERED,
        payload: { aerodromeId, icaoCode: dto.icaoCode, name: dto.name, fireCategory: dto.fireCategory ?? null },
      });

      return result.rows[0];
    });
  }

  /** GET /aerodromes — Lista aeródromos do tenant. */
  public listAerodromes(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query<AerodromeRow>(
        'SELECT * FROM ops.aerodromes WHERE tenant_id = $1 ORDER BY created_at DESC',
        [context.tenantId],
      )).rows);
  }

  /** POST /runway-pavement — Cadastra pavimento validando IRI e macrotextura. */
  public async registerRunwayPavement(context: RequestContext, dto: CreateRunwayPavementDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const aerodrome = (await client.query<AerodromeRow>(
        'SELECT * FROM ops.aerodromes WHERE id = $1 AND tenant_id = $2',
        [dto.aerodromeId, context.tenantId],
      )).rows[0];

      if (!aerodrome) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Aeródromo não encontrado no tenant.' });

      const violations = AerodromesService.validatePavement(dto.iriMKm, dto.macrotextureMm);
      if (violations.length > 0) {
        throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: violations.join(' ') });
      }

      const pavementId = randomUUID();
      const ledgerId = randomUUID();

      const result = await client.query<RunwayPavementRow>(
        `INSERT INTO ops.runway_pavement
          (id, aerodrome_id, runway_designator, pcn, iri_m_km, macrotexture_mm, friction_coefficient, last_inspection)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [pavementId, dto.aerodromeId, dto.runwayDesignator, dto.pcn ?? null,
          dto.iriMKm ?? null, dto.macrotextureMm ?? null, dto.frictionCoefficient ?? null,
          dto.lastInspection ? parseDate(dto.lastInspection) : null],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'RUNWAY_PAVEMENT', entityId: pavementId,
        actionType: PHASE_7_AERODROMES_EVENTS.RUNWAY_PAVEMENT_REGISTERED,
        payload: { pavementId, aerodromeId: dto.aerodromeId, runwayDesignator: dto.runwayDesignator, iriMKm: dto.iriMKm ?? null, macrotextureMm: dto.macrotextureMm ?? null },
      });

      return result.rows[0];
    });
  }

  /** GET /runway-pavement — Lista pavimentos do tenant. */
  public listRunwayPavement(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query<RunwayPavementRow>(
        `SELECT p.* FROM ops.runway_pavement p
         JOIN ops.aerodromes a ON a.id = p.aerodrome_id
         WHERE a.tenant_id = $1 ORDER BY p.created_at DESC`,
        [context.tenantId],
      )).rows);
  }

  // ─────────────────────────────────────────────
  // RWYCC / RCR (IS 153.133-001)
  // ─────────────────────────────────────────────

  /** POST /runway-condition-reports — Emite RCR por terço e envia à TWR. */
  public async createRunwayConditionReport(context: RequestContext, dto: CreateRunwayConditionReportDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const aerodrome = (await client.query<AerodromeRow>(
        'SELECT * FROM ops.aerodromes WHERE id = $1 AND tenant_id = $2',
        [dto.aerodromeId, context.tenantId],
      )).rows[0];

      if (!aerodrome) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Aeródromo não encontrado no tenant.' });

      const reportId = randomUUID();
      const ledgerId = randomUUID();
      const rcrMessage = AerodromesService.buildRcrMessage(dto.runwayDesignator, dto.rwyccT1, dto.rwyccT2, dto.rwyccT3);
      const sentToTwr = dto.sendToTwr ?? true;

      const result = await client.query<RcrRow>(
        `INSERT INTO ops.runway_condition_reports
          (id, aerodrome_id, runway_designator, report_time, rwycc_t1, rwycc_t2, rwycc_t3, contaminants, rcr_message, sent_to_twr, sent_to_twr_at, created_by, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, CASE WHEN $10 THEN now() ELSE NULL END, $11, $12) RETURNING *`,
        [reportId, dto.aerodromeId, dto.runwayDesignator, new Date(dto.reportTime),
          dto.rwyccT1, dto.rwyccT2, dto.rwyccT3, JSON.stringify(dto.contaminants ?? []),
          rcrMessage, sentToTwr, context.userId, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'RUNWAY_CONDITION_REPORT', entityId: reportId,
        actionType: sentToTwr ? PHASE_7_AERODROMES_EVENTS.RCR_SENT_TO_TWR : PHASE_7_AERODROMES_EVENTS.RCR_ISSUED,
        payload: { reportId, aerodromeId: dto.aerodromeId, runwayDesignator: dto.runwayDesignator, rwyccT1: dto.rwyccT1, rwyccT2: dto.rwyccT2, rwyccT3: dto.rwyccT3, rcrMessage, sentToTwr },
      });

      return result.rows[0];
    });
  }

  /** GET /runway-condition-reports — Lista RCRs do tenant. */
  public listRunwayConditionReports(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query<RcrRow>(
        `SELECT r.* FROM ops.runway_condition_reports r
         JOIN ops.aerodromes a ON a.id = r.aerodrome_id
         WHERE a.tenant_id = $1 ORDER BY r.report_time DESC`,
        [context.tenantId],
      )).rows);
  }

  // ─────────────────────────────────────────────
  // SESCINC (contraincêndio)
  // ─────────────────────────────────────────────

  /** POST /fire-response-logs — Registra resposta; desvio > 3 min gera alerta no ledger. */
  public async createFireResponseLog(context: RequestContext, dto: CreateFireResponseLogDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const aerodrome = (await client.query<AerodromeRow>(
        'SELECT * FROM ops.aerodromes WHERE id = $1 AND tenant_id = $2',
        [dto.aerodromeId, context.tenantId],
      )).rows[0];

      if (!aerodrome) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Aeródromo não encontrado no tenant.' });

      const alarmTime = new Date(dto.alarmTime);
      const agentTime = new Date(dto.agentApplicationTime);
      const responseTimeSeconds = Math.max(0, Math.round((agentTime.getTime() - alarmTime.getTime()) / 1000));
      const withinLimit = AerodromesService.isFireResponseWithinLimit(responseTimeSeconds);

      const logId = randomUUID();
      const ledgerId = randomUUID();

      const result = await client.query(
        `INSERT INTO ops.fire_response_logs
          (id, aerodrome_id, incident_type, alarm_time, agent_application_time, response_time_seconds, within_limit, fire_vehicles, extinguishing_agents, observer_present, notes, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12) RETURNING *`,
        [logId, dto.aerodromeId, dto.incidentType, alarmTime, agentTime, responseTimeSeconds,
          withinLimit, JSON.stringify(dto.fireVehicles ?? []), JSON.stringify(dto.extinguishingAgents ?? []),
          dto.observerPresent ?? false, dto.notes ?? null, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'FIRE_RESPONSE_LOG', entityId: logId,
        actionType: withinLimit ? PHASE_7_AERODROMES_EVENTS.FIRE_RESPONSE_RECORDED : PHASE_7_AERODROMES_EVENTS.FIRE_RESPONSE_DEVIATION,
        payload: { logId, aerodromeId: dto.aerodromeId, responseTimeSeconds, withinLimit, maxAllowedSeconds: SESCINC_MAX_RESPONSE_SECONDS },
      });

      return result.rows[0];
    });
  }

  /** GET /fire-response-logs — Lista respostas de incêndio. */
  public listFireResponseLogs(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query(
        `SELECT f.* FROM ops.fire_response_logs f
         JOIN ops.aerodromes a ON a.id = f.aerodrome_id
         WHERE a.tenant_id = $1 ORDER BY f.alarm_time DESC`,
        [context.tenantId],
      )).rows);
  }

  // ─────────────────────────────────────────────
  // Fauna (SIGRA)
  // ─────────────────────────────────────────────

  /** POST /fauna-events — Registra avistamento/colisão com risco R = log(x) e envio ao SIGRA. */
  public async createFaunaEvent(context: RequestContext, dto: CreateFaunaEventDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const aerodrome = (await client.query<AerodromeRow>(
        'SELECT * FROM ops.aerodromes WHERE id = $1 AND tenant_id = $2',
        [dto.aerodromeId, context.tenantId],
      )).rows[0];

      if (!aerodrome) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Aeródromo não encontrado no tenant.' });

      const riskGrade = dto.sightings !== undefined ? AerodromesService.computeFaunaRisk(dto.sightings) : null;
      const sentToSigra = dto.sendToSigra ?? true;
      const eventId = randomUUID();
      const ledgerId = randomUUID();

      const result = await client.query(
        `INSERT INTO ops.fauna_events
          (id, aerodrome_id, event_type, species, location, date, risk_grade, sent_to_sigra, sent_to_sigra_at, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8 THEN now() ELSE NULL END, $9) RETURNING *`,
        [eventId, dto.aerodromeId, dto.eventType, dto.species ?? null, dto.location ?? null,
          new Date(dto.date), riskGrade, sentToSigra, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'FAUNA_EVENT', entityId: eventId,
        actionType: sentToSigra ? PHASE_7_AERODROMES_EVENTS.FAUNA_SENT_TO_SIGRA : PHASE_7_AERODROMES_EVENTS.FAUNA_EVENT_RECORDED,
        payload: { eventId, aerodromeId: dto.aerodromeId, eventType: dto.eventType, riskGrade, sentToSigra },
      });

      return result.rows[0];
    });
  }

  /** GET /fauna-events — Lista eventos de fauna. */
  public listFaunaEvents(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query(
        `SELECT f.* FROM ops.fauna_events f
         JOIN ops.aerodromes a ON a.id = f.aerodrome_id
         WHERE a.tenant_id = $1 ORDER BY f.date DESC`,
        [context.tenantId],
      )).rows);
  }

  // ─────────────────────────────────────────────
  // Dashboard
  // ─────────────────────────────────────────────

  /** GET /aerodromes/dashboard — KPIs do ERP 153. */
  public async getAerodromesDashboard(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const [aerodromes, rcr, fire, fauna] = await Promise.all([
        client.query(`SELECT status, fire_category, COUNT(*) AS count FROM ops.aerodromes WHERE tenant_id = $1 GROUP BY status, fire_category`, [context.tenantId]),
        client.query(`SELECT COUNT(*) AS count, MIN(rwycc_t1) AS min_rwycc FROM ops.runway_condition_reports r JOIN ops.aerodromes a ON a.id = r.aerodrome_id WHERE a.tenant_id = $1`, [context.tenantId]),
        client.query(`SELECT within_limit, COUNT(*) AS count FROM ops.fire_response_logs f JOIN ops.aerodromes a ON a.id = f.aerodrome_id WHERE a.tenant_id = $1 GROUP BY within_limit`, [context.tenantId]),
        client.query(`SELECT event_type, COUNT(*) AS count FROM ops.fauna_events f JOIN ops.aerodromes a ON a.id = f.aerodrome_id WHERE a.tenant_id = $1 GROUP BY event_type`, [context.tenantId]),
      ]);

      const fireDeviationCount = fire.rows.find((row: { within_limit: boolean }) => row.within_limit === false);
      const sgsoNextDue = AerodromesService.nextSgsoReportDue();

      return {
        tenantId: context.tenantId,
        aerodromes: aerodromes.rows,
        rcr: { totalCount: Number(rcr.rows[0]?.count ?? 0), minRwycc: rcr.rows[0]?.min_rwycc ?? null },
        fireResponse: { byLimit: fire.rows, deviationCount: Number(fireDeviationCount?.count ?? 0) },
        fauna: fauna.rows,
        sgsoNextReportDue: sgsoNextDue.toISOString(),
        sgsoReportDates: ['20/01', '20/05', '20/09'],
        maxFireResponseSeconds: SESCINC_MAX_RESPONSE_SECONDS,
      };
    });
  }
}