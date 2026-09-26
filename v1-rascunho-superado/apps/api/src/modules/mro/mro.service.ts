import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import { ProtocolService } from "../protocol/protocol.service.ts";
import { assertAdvance, canIssueCrs, requiresSegvoo, STEP_LABELS } from "./mro.policy.ts";
import type {
  AdvanceWorkOrderDto,
  ComplyAdDto,
  CreateAdDto,
  CreateAircraftDto,
  CreateManualDto,
  CreateOmDto,
  CreatePartDto,
  CreateToolDto,
  CreateWorkOrderDto,
} from "./mro.dto.ts";

@Injectable()
export class MroService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService,
  ) {}

  public overview(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const orgs = await client.query(
        `SELECT o.id, o.com_number, o.eo_number, o.status, c.corporate_name
         FROM mro.organizations o JOIN identity.companies c ON c.id = o.company_id
         ORDER BY o.created_at DESC`,
      );
      const aircraft = await client.query(
        `SELECT id, registration, model, manufacturer, airworthiness_status, total_hours
         FROM mro.aircraft ORDER BY registration`,
      );
      const orders = await client.query(
        `SELECT w.id, w.number, w.step, w.status, w.work_type, w.requires_segvoo, w.crs_issued,
                a.registration, w.created_at
         FROM mro.work_orders w JOIN mro.aircraft a ON a.id = w.aircraft_id
         ORDER BY w.created_at DESC LIMIT 50`,
      );
      const parts = await client.query(
        `SELECT id, part_number, serial_number, condition, tag, status, form_8130_3
         FROM mro.parts ORDER BY created_at DESC LIMIT 50`,
      );
      const tools = await client.query(
        `SELECT id, identification, description, status, calibration_expiry
         FROM mro.tools ORDER BY identification`,
      );
      const ads = await client.query(
        `SELECT d.id, d.ad_number, d.status, d.description, a.registration
         FROM mro.ads d JOIN mro.aircraft a ON a.id = d.aircraft_id
         ORDER BY d.created_at DESC LIMIT 50`,
      );
      const manuals = await client.query(
        `SELECT id, title, kind, revision FROM mro.manuals ORDER BY created_at DESC LIMIT 50`,
      );
      const counts = await client.query<{
        aircraft: number;
        open_os: number;
        parts: number;
        tools: number;
        ads_pending: number;
      }>(
        `SELECT
           (SELECT count(*)::int FROM mro.aircraft) AS aircraft,
           (SELECT count(*)::int FROM mro.work_orders WHERE status IN ('ABERTA','EM_EXECUCAO')) AS open_os,
           (SELECT count(*)::int FROM mro.parts) AS parts,
           (SELECT count(*)::int FROM mro.tools) AS tools,
           (SELECT count(*)::int FROM mro.ads WHERE status = 'PENDENTE') AS ads_pending`,
      );
      return {
        steps: STEP_LABELS,
        counts: counts.rows[0],
        organizations: orgs.rows,
        aircraft: aircraft.rows,
        workOrders: orders.rows,
        parts: parts.rows,
        tools: tools.rows,
        ads: ads.rows,
        manuals: manuals.rows,
      };
    });
  }

  public createOm(ctx: RequestContext, dto: CreateOmDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO mro.organizations(tenant_id, company_id, com_number, eo_number)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [ctx.tenantId, dto.companyId, dto.comNumber, dto.eoNumber ?? null],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "MRO_OM",
        entityId: id,
        actionType: "OM_REGISTERED",
        payload: dto,
      });
      await client.query("UPDATE mro.organizations SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      const proto = await this.protocol.issue(client, ctx, {
        subject: `OM ${dto.comNumber}`,
        entityType: "MRO_OM",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, protocol: proto.number };
    });
  }

  public createAircraft(ctx: RequestContext, dto: CreateAircraftDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO mro.aircraft(tenant_id, registration, model, manufacturer)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [ctx.tenantId, dto.registration.toUpperCase(), dto.model, dto.manufacturer],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "MRO_AIRCRAFT",
        entityId: id,
        actionType: "AIRCRAFT_REGISTERED",
        payload: dto,
      });
      await client.query("UPDATE mro.aircraft SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  public createWorkOrder(ctx: RequestContext, dto: CreateWorkOrderDto) {
    this.requireTenant(ctx);
    const segvoo = requiresSegvoo(dto.workType);
    return this.db.withContext(ctx, async (client) => {
      const ac = await client.query("SELECT id FROM mro.aircraft WHERE id = $1", [dto.aircraftId]);
      if (!ac.rowCount) throw new NotFoundException({ code: "NOT_FOUND", message: "Aeronave nao encontrada." });
      const seq = await client.query<{ n: number }>(
        "SELECT coalesce(max(substring(number from '[0-9]+')::int), 0) + 1 AS n FROM mro.work_orders WHERE tenant_id = $1",
        [ctx.tenantId],
      );
      const number = `OS-${String(seq.rows[0]!.n).padStart(5, "0")}`;
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO mro.work_orders(
           tenant_id, company_id, number, aircraft_id, work_type, is_major, requires_segvoo, technical_data_ref, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ABERTA') RETURNING id`,
        [
          ctx.tenantId,
          ctx.companyId,
          number,
          dto.aircraftId,
          dto.workType,
          segvoo,
          segvoo,
          dto.technicalDataRef ?? null,
        ],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "MRO_OS",
        entityId: id,
        actionType: "WORK_ORDER_CREATED",
        payload: { ...dto, number, step: 1 },
      });
      await client.query("UPDATE mro.work_orders SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      const proto = await this.protocol.issue(client, ctx, {
        subject: `${number} ${dto.workType}`,
        entityType: "MRO_OS",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, number, step: 1, protocol: proto.number, requiresSegvoo: segvoo };
    });
  }

  public advance(ctx: RequestContext, id: string, dto: AdvanceWorkOrderDto) {
    return this.db.withContext(ctx, async (client) => {
      const row = await client.query<{ id: string; step: number; status: string }>(
        "SELECT id, step, status FROM mro.work_orders WHERE id = $1",
        [id],
      );
      const wo = row.rows[0];
      if (!wo) throw new NotFoundException({ code: "NOT_FOUND", message: "OS nao encontrada." });
      try {
        assertAdvance(wo.step, dto.toStep);
      } catch (error) {
        throw new UnprocessableEntityException({
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Etapa invalida.",
        });
      }
      const status = dto.toStep >= 12 ? "CONCLUIDA" : dto.toStep >= 2 ? "EM_EXECUCAO" : "ABERTA";
      await client.query("UPDATE mro.work_orders SET step = $2, status = $3, updated_at = now() WHERE id = $1", [
        id,
        dto.toStep,
        status,
      ]);
      const block = await this.ledger.append(client, ctx, {
        entityType: "MRO_OS",
        entityId: id,
        actionType: "WORK_ORDER_STEP_UPDATED",
        payload: { from: wo.step, to: dto.toStep, label: STEP_LABELS[dto.toStep] },
      });
      return { id, step: dto.toStep, label: STEP_LABELS[dto.toStep], status, ledgerBlockId: block.id };
    });
  }

  public issueCrs(ctx: RequestContext, id: string) {
    return this.db.withContext(ctx, async (client) => {
      const row = await client.query<{ id: string; step: number; crs_issued: boolean; number: string }>(
        "SELECT id, step, crs_issued, number FROM mro.work_orders WHERE id = $1",
        [id],
      );
      const wo = row.rows[0];
      if (!wo) throw new NotFoundException({ code: "NOT_FOUND", message: "OS nao encontrada." });
      if (!canIssueCrs(wo.step)) {
        throw new UnprocessableEntityException({
          code: "VALIDATION_ERROR",
          message: "APRS/CRS so a partir da etapa 9.",
        });
      }
      await client.query("UPDATE mro.work_orders SET crs_issued = true, updated_at = now() WHERE id = $1", [id]);
      const block = await this.ledger.append(client, ctx, {
        entityType: "MRO_OS",
        entityId: id,
        actionType: "CRS_ISSUED",
        payload: { number: wo.number, step: wo.step },
      });
      const proto = await this.protocol.issue(client, ctx, {
        subject: `CRS ${wo.number}`,
        entityType: "MRO_CRS",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, crsIssued: true, protocol: proto.number };
    });
  }

  public createPart(ctx: RequestContext, dto: CreatePartDto) {
    this.requireTenant(ctx);
    const tag =
      dto.condition === "USADA_NAO_SERVICAVEL" ? "VERMELHA_CONDENADA_NAO_AERONAVEGAVEL" : "VERDE_SERVICAVEL";
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO mro.parts(tenant_id, part_number, serial_number, condition, tag, certification_type, form_8130_3)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [ctx.tenantId, dto.partNumber, dto.serialNumber ?? null, dto.condition, tag, dto.certificationType, dto.form81303 ?? null],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "MRO_PART",
        entityId: id,
        actionType: "PART_REGISTERED",
        payload: { ...dto, tag },
      });
      await client.query("UPDATE mro.parts SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, tag };
    });
  }

  public createTool(ctx: RequestContext, dto: CreateToolDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO mro.tools(tenant_id, identification, description, calibration_standard, calibration_expiry)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [ctx.tenantId, dto.identification, dto.description ?? null, dto.calibrationStandard ?? null, dto.calibrationExpiry ?? null],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "MRO_TOOL",
        entityId: id,
        actionType: "TOOL_REGISTERED",
        payload: dto,
      });
      await client.query("UPDATE mro.tools SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  public createAd(ctx: RequestContext, dto: CreateAdDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO mro.ads(tenant_id, aircraft_id, ad_number, description)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [ctx.tenantId, dto.aircraftId, dto.adNumber, dto.description ?? null],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "MRO_AD",
        entityId: id,
        actionType: "AD_REGISTERED",
        payload: dto,
      });
      await client.query("UPDATE mro.ads SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  public complyAd(ctx: RequestContext, id: string, dto: ComplyAdDto) {
    return this.db.withContext(ctx, async (client) => {
      const row = await client.query("SELECT id FROM mro.ads WHERE id = $1", [id]);
      if (!row.rowCount) throw new NotFoundException({ code: "NOT_FOUND", message: "AD nao encontrada." });
      await client.query("UPDATE mro.ads SET status = 'CUMPRIDA' WHERE id = $1", [id]);
      const block = await this.ledger.append(client, ctx, {
        entityType: "MRO_AD",
        entityId: id,
        actionType: "AD_COMPLIED",
        payload: dto,
      });
      await client.query("UPDATE mro.ads SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, status: "CUMPRIDA" };
    });
  }

  public createManual(ctx: RequestContext, dto: CreateManualDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO mro.manuals(tenant_id, title, kind, revision) VALUES ($1,$2,$3,$4) RETURNING id`,
        [ctx.tenantId, dto.title, dto.kind, dto.revision ?? null],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "MRO_MANUAL",
        entityId: id,
        actionType: "MANUAL_REGISTERED",
        payload: dto,
      });
      await client.query("UPDATE mro.manuals SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  private requireTenant(ctx: RequestContext): void {
    if (!ctx.tenantId) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Tenant ausente." });
    }
  }
}
