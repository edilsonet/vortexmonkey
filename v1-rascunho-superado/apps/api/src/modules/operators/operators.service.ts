import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import { ProtocolService } from "../protocol/protocol.service.ts";
import {
  assertDaDoesNotBlockDeferral,
  assertLogbookSignable,
  cvaStatusOn,
  fuelReserveMinutes,
  isReweighExpired,
  melDeferralDeadline,
  nextReweighDate,
  PHASE_6_EVENTS,
  validateDispatch,
  type AircraftCategory,
  type FlightRule,
  type MelCategory,
  type LogbookStatus,
  type DisperserStatus,
} from "./operators.policy.ts";
import type {
  AddFleetDto,
  CreateAgriDto,
  CreateDaDto,
  CreateDispatchDto,
  CreateDisperserDto,
  CreateLogbookDto,
  CreateManualDto,
  CreateMelDto,
  CreateOperatorDto,
  CreateOpsAircraftDto,
  RecordCvaDto,
} from "./operators.dto.ts";

@Injectable()
export class OperatorsService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService,
  ) {}

  public overview(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const operators = await client.query(
        `SELECT o.id, o.operator_type, o.coa_number, o.eo_number, o.certification_phase, o.status, c.corporate_name
         FROM ops.air_operators o JOIN identity.companies c ON c.id = o.company_id
         ORDER BY o.created_at DESC`,
      );
      const aircraft = await client.query(
        `SELECT id, registration, model, aircraft_category, last_reweigh_date, next_reweigh_date,
                cva_number, cva_status, status
         FROM ops.aircraft ORDER BY registration`,
      );
      const fleet = await client.query(
        `SELECT f.id, f.operator_id, f.aircraft_id, f.status, a.registration
         FROM ops.operator_fleet f JOIN ops.aircraft a ON a.id = f.aircraft_id
         ORDER BY a.registration`,
      );
      const mel = await client.query(
        `SELECT m.id, m.ata_chapter, m.item_description, m.category, m.status, m.deferral_deadline,
                m.da_applicable, a.registration
         FROM ops.mel_items m JOIN ops.aircraft a ON a.id = m.aircraft_id
         ORDER BY m.created_at DESC LIMIT 50`,
      );
      const das = await client.query(
        `SELECT d.id, d.da_number, d.status, d.description, a.registration
         FROM ops.da_items d JOIN ops.aircraft a ON a.id = d.aircraft_id
         ORDER BY d.created_at DESC LIMIT 50`,
      );
      const logbook = await client.query(
        `SELECT l.id, l.departure_aerodrome, l.arrival_aerodrome, l.flight_time_hours, l.pilot_name,
                l.status, a.registration
         FROM ops.logbook_entries l JOIN ops.aircraft a ON a.id = l.aircraft_id
         ORDER BY l.created_at DESC LIMIT 50`,
      );
      const dispatches = await client.query(
        `SELECT d.id, d.flight_number, d.departure, d.destination, d.flight_rule, d.status,
                d.fuel_required_minutes, d.fuel_planned_minutes, a.registration
         FROM ops.dispatch_releases d JOIN ops.aircraft a ON a.id = d.aircraft_id
         ORDER BY d.created_at DESC LIMIT 50`,
      );
      const manuals = await client.query(
        `SELECT id, manual_type, title, current_version, approval_status FROM ops.operational_manuals
         ORDER BY created_at DESC LIMIT 50`,
      );
      const agri = await client.query(
        `SELECT a.id, a.cdag_number, a.status, c.corporate_name
         FROM ops.agri_operators a JOIN identity.companies c ON c.id = a.company_id
         ORDER BY a.created_at DESC`,
      );
      const dispersers = await client.query(
        `SELECT d.id, d.disperser_type, d.status, d.calibration_expiry, d.dgps_installed, ac.registration
         FROM ops.dispersers d JOIN ops.aircraft ac ON ac.id = d.aircraft_id
         ORDER BY d.created_at DESC LIMIT 50`,
      );
      const counts = await client.query<{
        operators: number;
        aircraft: number;
        dispatches_open: number;
        mel_deferred: number;
        da_pending: number;
      }>(
        `SELECT
           (SELECT count(*)::int FROM ops.air_operators) AS operators,
           (SELECT count(*)::int FROM ops.aircraft) AS aircraft,
           (SELECT count(*)::int FROM ops.dispatch_releases WHERE status IN ('RASCUNHO','VALIDADO','BLOQUEADO')) AS dispatches_open,
           (SELECT count(*)::int FROM ops.mel_items WHERE status = 'DIFERIDO') AS mel_deferred,
           (SELECT count(*)::int FROM ops.da_items WHERE status = 'PENDENTE') AS da_pending`,
      );
      return {
        counts: counts.rows[0],
        operators: operators.rows,
        aircraft: aircraft.rows,
        fleet: fleet.rows,
        mel: mel.rows,
        das: das.rows,
        logbook: logbook.rows,
        dispatches: dispatches.rows,
        manuals: manuals.rows,
        agri: agri.rows,
        dispersers: dispersers.rows,
      };
    });
  }

  public createOperator(ctx: RequestContext, dto: CreateOperatorDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO ops.air_operators(tenant_id, company_id, operator_type, coa_number, eo_number, classification)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [ctx.tenantId, dto.companyId, dto.operatorType, dto.coaNumber ?? null, dto.eoNumber ?? null, dto.classification ?? null],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_OPERATOR",
        entityId: id,
        actionType: PHASE_6_EVENTS.OPERATOR_REGISTERED,
        payload: dto,
      });
      await client.query("UPDATE ops.air_operators SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      const proto = await this.protocol.issue(client, ctx, {
        subject: `Operador ${dto.operatorType}`,
        entityType: "OPS_OPERATOR",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, protocol: proto.number };
    });
  }

  public createAircraft(ctx: RequestContext, dto: CreateOpsAircraftDto) {
    this.requireTenant(ctx);
    const last = dto.lastReweighDate ? new Date(`${dto.lastReweighDate}T00:00:00Z`) : null;
    const next = last ? nextReweighDate(last) : null;
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO ops.aircraft(tenant_id, registration, model, aircraft_category, max_passengers, last_reweigh_date, next_reweigh_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
          ctx.tenantId,
          dto.registration.toUpperCase(),
          dto.model,
          dto.aircraftCategory,
          dto.maxPassengers ?? null,
          dto.lastReweighDate ?? null,
          next ? next.toISOString().slice(0, 10) : null,
        ],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_AIRCRAFT",
        entityId: id,
        actionType: PHASE_6_EVENTS.FLEET_ADDED,
        payload: dto,
      });
      await client.query("UPDATE ops.aircraft SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, nextReweighDate: next ? next.toISOString().slice(0, 10) : null };
    });
  }

  public addFleet(ctx: RequestContext, dto: AddFleetDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO ops.operator_fleet(tenant_id, operator_id, aircraft_id) VALUES ($1,$2,$3) RETURNING id`,
        [ctx.tenantId, dto.operatorId, dto.aircraftId],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_FLEET",
        entityId: id,
        actionType: PHASE_6_EVENTS.FLEET_ADDED,
        payload: dto,
      });
      await client.query("UPDATE ops.operator_fleet SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  public recordCva(ctx: RequestContext, aircraftId: string, dto: RecordCvaDto) {
    return this.db.withContext(ctx, async (client) => {
      const row = await client.query<{ id: string }>("SELECT id FROM ops.aircraft WHERE id = $1", [aircraftId]);
      if (!row.rowCount) throw new NotFoundException({ code: "NOT_FOUND", message: "Aeronave nao encontrada." });
      const now = new Date();
      const status = cvaStatusOn(now, now, dto.critical === true);
      const stored = status === "ALERTA" ? "VALIDO" : status;
      await client.query(
        `UPDATE ops.aircraft SET cva_number = $2, cva_issued_at = now(), cva_status = $3 WHERE id = $1`,
        [aircraftId, dto.cvaNumber, stored],
      );
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_AIRCRAFT",
        entityId: aircraftId,
        actionType: PHASE_6_EVENTS.CVA_RECORDED,
        payload: dto,
      });
      await client.query("UPDATE ops.aircraft SET ledger_block_id = $2 WHERE id = $1", [aircraftId, block.id]);
      return { id: aircraftId, cvaStatus: stored };
    });
  }

  public createMel(ctx: RequestContext, dto: CreateMelDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO ops.mel_items(tenant_id, aircraft_id, ata_chapter, item_description, category, procedure_o, procedure_m)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [ctx.tenantId, dto.aircraftId, dto.ataChapter, dto.itemDescription, dto.category, dto.procedureO ?? null, dto.procedureM ?? null],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_MEL",
        entityId: id,
        actionType: PHASE_6_EVENTS.MEL_ITEM_CREATED,
        payload: dto,
      });
      await client.query("UPDATE ops.mel_items SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  public deferMel(ctx: RequestContext, id: string) {
    return this.db.withContext(ctx, async (client) => {
      const row = await client.query<{ id: string; aircraft_id: string; category: MelCategory; status: string }>(
        "SELECT id, aircraft_id, category, status FROM ops.mel_items WHERE id = $1",
        [id],
      );
      const item = row.rows[0];
      if (!item) throw new NotFoundException({ code: "NOT_FOUND", message: "MEL nao encontrado." });
      const da = await client.query(
        "SELECT 1 FROM ops.da_items WHERE aircraft_id = $1 AND status = 'PENDENTE' LIMIT 1",
        [item.aircraft_id],
      );
      try {
        assertDaDoesNotBlockDeferral((da.rowCount ?? 0) > 0);
      } catch (error) {
        throw new UnprocessableEntityException({
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "DA prevalece.",
        });
      }
      const deadline = melDeferralDeadline(item.category, new Date());
      await client.query(
        `UPDATE ops.mel_items SET status = 'DIFERIDO', deferral_deadline = $2, da_applicable = false, updated_at = now() WHERE id = $1`,
        [id, deadline],
      );
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_MEL",
        entityId: id,
        actionType: PHASE_6_EVENTS.MEL_ITEM_DEFERRED,
        payload: { deadline },
      });
      await client.query("UPDATE ops.mel_items SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, status: "DIFERIDO", deadline };
    });
  }

  public repairMel(ctx: RequestContext, id: string) {
    return this.db.withContext(ctx, async (client) => {
      const row = await client.query("SELECT id FROM ops.mel_items WHERE id = $1", [id]);
      if (!row.rowCount) throw new NotFoundException({ code: "NOT_FOUND", message: "MEL nao encontrado." });
      await client.query("UPDATE ops.mel_items SET status = 'REPARADO', updated_at = now() WHERE id = $1", [id]);
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_MEL",
        entityId: id,
        actionType: PHASE_6_EVENTS.MEL_ITEM_REPAIRED,
        payload: {},
      });
      await client.query("UPDATE ops.mel_items SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, status: "REPARADO" };
    });
  }

  public createDa(ctx: RequestContext, dto: CreateDaDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO ops.da_items(tenant_id, aircraft_id, da_number, description) VALUES ($1,$2,$3,$4) RETURNING id`,
        [ctx.tenantId, dto.aircraftId, dto.daNumber, dto.description ?? null],
      );
      const id = inserted.rows[0]!.id;
      await client.query("UPDATE ops.mel_items SET da_applicable = true WHERE aircraft_id = $1 AND status = 'DIFERIDO'", [
        dto.aircraftId,
      ]);
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_DA",
        entityId: id,
        actionType: "DA_REGISTERED",
        payload: dto,
      });
      await client.query("UPDATE ops.da_items SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  public createLogbook(ctx: RequestContext, dto: CreateLogbookDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO ops.logbook_entries(
           tenant_id, aircraft_id, departure_aerodrome, arrival_aerodrome, flight_time_hours,
           pilot_name, pilot_license, pilot_funcao
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [
          ctx.tenantId,
          dto.aircraftId,
          dto.departure.toUpperCase(),
          dto.arrival.toUpperCase(),
          dto.flightTimeHours ?? 0,
          dto.pilotName,
          dto.pilotLicense,
          dto.pilotFuncao ?? "PIC",
        ],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_LOGBOOK",
        entityId: id,
        actionType: PHASE_6_EVENTS.LOGBOOK_ENTRY_CREATED,
        payload: dto,
      });
      await client.query("UPDATE ops.logbook_entries SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, status: "draft" };
    });
  }

  public signLogbook(ctx: RequestContext, id: string) {
    return this.db.withContext(ctx, async (client) => {
      const row = await client.query<{ id: string; status: LogbookStatus }>(
        "SELECT id, status FROM ops.logbook_entries WHERE id = $1",
        [id],
      );
      const entry = row.rows[0];
      if (!entry) throw new NotFoundException({ code: "NOT_FOUND", message: "Logbook nao encontrado." });
      try {
        assertLogbookSignable(entry.status);
      } catch (error) {
        throw new UnprocessableEntityException({
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Assinatura invalida.",
        });
      }
      await client.query(
        "UPDATE ops.logbook_entries SET status = 'signed', signed_at = now(), updated_at = now() WHERE id = $1",
        [id],
      );
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_LOGBOOK",
        entityId: id,
        actionType: PHASE_6_EVENTS.LOGBOOK_SIGNED,
        payload: {},
      });
      await client.query("UPDATE ops.logbook_entries SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, status: "signed" };
    });
  }

  public createDispatch(ctx: RequestContext, dto: CreateDispatchDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const ac = await client.query<{ aircraft_category: AircraftCategory }>(
        "SELECT aircraft_category FROM ops.aircraft WHERE id = $1",
        [dto.aircraftId],
      );
      const aircraft = ac.rows[0];
      if (!aircraft) throw new NotFoundException({ code: "NOT_FOUND", message: "Aeronave nao encontrada." });
      const required = fuelReserveMinutes({
        rule: dto.flightRule as FlightRule,
        category: aircraft.aircraft_category,
        night: dto.isNight === true,
        hasAlternate: dto.hasAlternate === true,
      });
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO ops.dispatch_releases(
           tenant_id, aircraft_id, flight_number, departure, destination, flight_rule, is_night, has_alternate,
           fuel_required_minutes, fuel_planned_minutes, met_valid, weight_balance_valid
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [
          ctx.tenantId,
          dto.aircraftId,
          dto.flightNumber ?? null,
          dto.departure.toUpperCase(),
          dto.destination.toUpperCase(),
          dto.flightRule,
          dto.isNight === true,
          dto.hasAlternate === true,
          required,
          dto.fuelPlannedMinutes,
          dto.metValid === true,
          dto.weightBalanceValid === true,
        ],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_DISPATCH",
        entityId: id,
        actionType: PHASE_6_EVENTS.DISPATCH_CREATED,
        payload: { ...dto, fuelRequiredMinutes: required },
      });
      await client.query("UPDATE ops.dispatch_releases SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, fuelRequiredMinutes: required, status: "RASCUNHO" };
    });
  }

  public validateDispatchRelease(ctx: RequestContext, id: string) {
    return this.db.withContext(ctx, async (client) => {
      const row = await client.query<{
        id: string;
        aircraft_id: string;
        fuel_required_minutes: number;
        fuel_planned_minutes: number;
        met_valid: boolean;
        weight_balance_valid: boolean;
        status: string;
      }>(
        `SELECT id, aircraft_id, fuel_required_minutes, fuel_planned_minutes, met_valid, weight_balance_valid, status
         FROM ops.dispatch_releases WHERE id = $1`,
        [id],
      );
      const dispatch = row.rows[0];
      if (!dispatch) throw new NotFoundException({ code: "NOT_FOUND", message: "Despacho nao encontrado." });
      const ac = await client.query<{ last_reweigh_date: string | null; cva_status: string }>(
        "SELECT last_reweigh_date, cva_status FROM ops.aircraft WHERE id = $1",
        [dispatch.aircraft_id],
      );
      const aircraft = ac.rows[0]!;
      const now = new Date();
      const melExpired = await client.query(
        `SELECT 1 FROM ops.mel_items
         WHERE aircraft_id = $1 AND status = 'DIFERIDO' AND deferral_deadline IS NOT NULL AND deferral_deadline < now()
         LIMIT 1`,
        [dispatch.aircraft_id],
      );
      const daPending = await client.query(
        "SELECT 1 FROM ops.da_items WHERE aircraft_id = $1 AND status = 'PENDENTE' LIMIT 1",
        [dispatch.aircraft_id],
      );
      const result = validateDispatch({
        fuelPlannedMinutes: dispatch.fuel_planned_minutes,
        fuelRequiredMinutes: dispatch.fuel_required_minutes,
        metValid: dispatch.met_valid,
        weightBalanceValid: dispatch.weight_balance_valid,
        melExpired: (melExpired.rowCount ?? 0) > 0,
        daPending: (daPending.rowCount ?? 0) > 0,
        cvaBlocked: aircraft.cva_status === "BLOQUEADO" || aircraft.cva_status === "VENCIDO",
        reweighExpired: aircraft.last_reweigh_date
          ? isReweighExpired(new Date(`${aircraft.last_reweigh_date}T00:00:00Z`), now)
          : false,
      });
      await client.query(
        `UPDATE ops.dispatch_releases
         SET status = $2, fuel_valid = $3, validation_notes = $4, updated_at = now()
         WHERE id = $1`,
        [id, result.status, result.status === "VALIDADO", JSON.stringify({ reasons: result.reasons })],
      );
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_DISPATCH",
        entityId: id,
        actionType: result.status === "VALIDADO" ? PHASE_6_EVENTS.DISPATCH_VALIDATED : PHASE_6_EVENTS.DISPATCH_BLOCKED,
        payload: result,
      });
      await client.query("UPDATE ops.dispatch_releases SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, status: result.status, reasons: result.reasons };
    });
  }

  public releaseDispatch(ctx: RequestContext, id: string) {
    return this.db.withContext(ctx, async (client) => {
      const row = await client.query<{ id: string; status: string }>(
        "SELECT id, status FROM ops.dispatch_releases WHERE id = $1",
        [id],
      );
      const dispatch = row.rows[0];
      if (!dispatch) throw new NotFoundException({ code: "NOT_FOUND", message: "Despacho nao encontrado." });
      if (dispatch.status !== "VALIDADO") {
        throw new UnprocessableEntityException({
          code: "VALIDATION_ERROR",
          message: "Despacho so libera apos validacao.",
        });
      }
      await client.query("UPDATE ops.dispatch_releases SET status = 'LIBERADO', updated_at = now() WHERE id = $1", [id]);
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_DISPATCH",
        entityId: id,
        actionType: PHASE_6_EVENTS.DISPATCH_RELEASED,
        payload: {},
      });
      const proto = await this.protocol.issue(client, ctx, {
        subject: `Despacho ${id}`,
        entityType: "OPS_DISPATCH",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, status: "LIBERADO", protocol: proto.number };
    });
  }

  public createManual(ctx: RequestContext, dto: CreateManualDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO ops.operational_manuals(tenant_id, operator_id, manual_type, title) VALUES ($1,$2,$3,$4) RETURNING id`,
        [ctx.tenantId, dto.operatorId, dto.manualType, dto.title],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_MANUAL",
        entityId: id,
        actionType: PHASE_6_EVENTS.MANUAL_CREATED,
        payload: dto,
      });
      await client.query("UPDATE ops.operational_manuals SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  public createAgri(ctx: RequestContext, dto: CreateAgriDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO ops.agri_operators(tenant_id, company_id, cdag_number) VALUES ($1,$2,$3) RETURNING id`,
        [ctx.tenantId, dto.companyId, dto.cdagNumber ?? null],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_AGRI",
        entityId: id,
        actionType: PHASE_6_EVENTS.AGRI_OPERATOR_REGISTERED,
        payload: dto,
      });
      await client.query("UPDATE ops.agri_operators SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      const proto = await this.protocol.issue(client, ctx, {
        subject: `CDAG ${dto.cdagNumber ?? id}`,
        entityType: "OPS_AGRI",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, protocol: proto.number };
    });
  }

  public createDisperser(ctx: RequestContext, dto: CreateDisperserDto) {
    this.requireTenant(ctx);
    const expired = dto.calibrationExpiry ? new Date(`${dto.calibrationExpiry}T00:00:00Z`) < new Date() : false;
    const status: DisperserStatus = expired ? "CALIBRACAO_VENCIDA" : "OPERACIONAL";
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO ops.dispersers(tenant_id, aircraft_id, disperser_type, calibration_expiry, dgps_installed, dgps_conformity_declaration, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
          ctx.tenantId,
          dto.aircraftId,
          dto.disperserType,
          dto.calibrationExpiry ?? null,
          dto.dgpsInstalled === true,
          dto.dgpsConformity ?? null,
          status,
        ],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "OPS_DISPERSER",
        entityId: id,
        actionType: PHASE_6_EVENTS.DISPERSER_REGISTERED,
        payload: { ...dto, status },
      });
      await client.query("UPDATE ops.dispersers SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, status };
    });
  }

  private requireTenant(ctx: RequestContext): void {
    if (!ctx.tenantId) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Tenant ausente." });
    }
  }
}
