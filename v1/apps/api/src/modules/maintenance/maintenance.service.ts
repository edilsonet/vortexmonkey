import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  PHASE_5_MAINTENANCE_EVENTS,
  WORK_ORDER_STEPS,
  type PartCondition,
  type PartTag,
  type WorkOrderType,
} from '@vortex/contracts-be';
import type { RequestContext } from '@vortex/types';
import { DatabaseService } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';
import type {
  AddWorkOrderTaskDto,
  CloseWorkOrderDto,
  ComplyAirworthinessDirectiveDto,
  CreateAircraftDto,
  CreateMaintenanceOrgDto,
  CreateWorkOrderDto,
  LogNdtTestDto,
  RegisterPartDto,
  RegisterToolDto,
} from './maintenance.dto';

interface AircraftRow {
  id: string; tenant_id: string; registration: string; model: string;
  manufacturer: string; total_hours: number; total_cycles: number;
  airworthiness_status: string; created_at: Date;
}

interface WorkOrderRow {
  id: string; tenant_id: string; work_order_number: string; aircraft_id: string;
  step: number; status: string; work_type: WorkOrderType; is_major: boolean;
  requires_segvoo: boolean; crs_issued: boolean; crs_signature_id: string | null;
  ledger_block_id: string; created_at: Date;
}

interface ToolRow {
  id: string; tenant_id: string; identification: string; calibration_required: boolean;
  calibration_expiry: Date | null; status: string;
}

interface PartRow {
  id: string; tenant_id: string; part_number: string; serial_number: string | null;
  condition: PartCondition; tag: PartTag; form_8130_3: string | null; status: string;
}

@Injectable()
export class MaintenanceService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
  ) {}

  /** POST /maintenance-organizations — Cadastra OM (RBAC 145) */
  public async registerMaintenanceOrg(context: RequestContext, dto: CreateMaintenanceOrgDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const omId = randomUUID();
      const ledgerId = randomUUID();

      const existing = (await client.query(
        'SELECT id FROM ops.maintenance_organizations WHERE com_number = $1',
        [dto.comNumber],
      )).rows[0];

      if (existing) {
        throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Certificado de OM (COM) já cadastrado.' });
      }

      const result = await client.query(
        `INSERT INTO ops.maintenance_organizations
          (id, tenant_id, company_id, com_number, categories, eo_number, status)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'ATIVO') RETURNING *`,
        [omId, context.tenantId, dto.companyId, dto.comNumber, JSON.stringify(dto.categories), dto.eoNumber ?? null],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'MAINTENANCE_ORGANIZATION', entityId: omId,
        actionType: PHASE_5_MAINTENANCE_EVENTS.OM_REGISTERED,
        payload: { omId, comNumber: dto.comNumber, companyId: dto.companyId, categories: dto.categories },
      });

      return result.rows[0];
    });
  }

  /** POST /aircraft — Cadastra aeronave e inicializa cadernetas digitais */
  public async registerAircraft(context: RequestContext, dto: CreateAircraftDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const aircraftId = randomUUID();
      const ledgerId = randomUUID();

      const result = await client.query<AircraftRow>(
        `INSERT INTO ops.aircraft
          (id, tenant_id, registration, model, manufacturer, serial_number, total_hours, total_cycles, airworthiness_status)
         VALUES ($1, $2, UPPER($3), $4, $5, $6, $7, $8, 'AERONAVEGAVEL') RETURNING *`,
        [aircraftId, context.tenantId, dto.registration, dto.model, dto.manufacturer,
          dto.serialNumber ?? null, dto.totalHours ?? 0, dto.totalCycles ?? 0],
      );

      // Inicializa as 3 cadernetas obrigatórias (Célula, Motor, Hélice)
      const logbookTypes = ['CELULA', 'MOTOR', 'HELICE'];
      for (const lbType of logbookTypes) {
        await client.query(
          `INSERT INTO ops.aircraft_logbooks (aircraft_id, logbook_type, entries)
           VALUES ($1, $2, '[]'::jsonb)`,
          [aircraftId, lbType],
        );
      }

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'AIRCRAFT', entityId: aircraftId,
        actionType: PHASE_5_MAINTENANCE_EVENTS.AIRCRAFT_REGISTERED,
        payload: { aircraftId, registration: dto.registration, model: dto.model },
      });

      return result.rows[0];
    });
  }

  /** POST /work-orders — Cria Ordem de Serviço em Etapa 1 (Pedido de Cotação) */
  public async createWorkOrder(context: RequestContext, dto: CreateWorkOrderDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const aircraft = (await client.query<AircraftRow>(
        'SELECT * FROM ops.aircraft WHERE id = $1 AND tenant_id = $2',
        [dto.aircraftId, context.tenantId],
      )).rows[0];

      if (!aircraft) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Aeronave não encontrada no tenant.' });
      }

      const woId = randomUUID();
      const ledgerId = randomUUID();
      const woNumber = `OS-${aircraft.registration}-${Date.now().toString().slice(-6)}`;

      const result = await client.query<WorkOrderRow>(
        `INSERT INTO ops.work_orders
          (id, tenant_id, work_order_number, aircraft_id, step, status, work_type, is_major, requires_segvoo, technical_data_ref, ledger_block_id)
         VALUES ($1, $2, $3, $4, 1, 'ABERTA', $5, $6, $7, $8, $9) RETURNING *`,
        [woId, context.tenantId, woNumber, dto.aircraftId, dto.workType, dto.isMajor, dto.requiresSegvoo, dto.technicalDataRef ?? null, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'WORK_ORDER', entityId: woId,
        actionType: PHASE_5_MAINTENANCE_EVENTS.WORK_ORDER_CREATED,
        payload: { woId, woNumber, aircraftId: dto.aircraftId, workType: dto.workType, isMajor: dto.isMajor },
      });

      return result.rows[0];
    });
  }

  /** POST /work-orders/:id/tasks — Adiciona tarefa à OS (com Trava 2 e Trava 3) */
  public async addWorkOrderTask(context: RequestContext, woId: string, dto: AddWorkOrderTaskDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const wo = (await client.query<WorkOrderRow>(
        'SELECT * FROM ops.work_orders WHERE id = $1 AND tenant_id = $2',
        [woId, context.tenantId],
      )).rows[0];

      if (!wo) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Ordem de Serviço não encontrada.' });
      if (wo.status === 'CONCLUIDA' || wo.status === 'CANCELADA') {
        throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'OS já encerrada.' });
      }

      // Trava 2 (IS 43.13-005): Ferramenta com calibração vencida bloqueia uso na tarefa
      if (dto.usedToolId) {
        const tool = (await client.query<ToolRow>(
          'SELECT * FROM ops.tools WHERE id = $1 AND tenant_id = $2',
          [dto.usedToolId, context.tenantId],
        )).rows[0];

        if (tool) {
          const isExpired = tool.status === 'CALIBRACAO_VENCIDA' ||
            (tool.calibration_expiry && new Date(tool.calibration_expiry) < new Date());

          if (isExpired) {
            throw new UnprocessableEntityException({
              code: 'VALIDATION_ERROR',
              message: `VIOLAÇÃO IS 43.13-005: Ferramenta "${tool.identification}" com calibração vencida não pode ser utilizada na OS.`,
            });
          }
        }
      }

      // Trava 3 (IS 43-001): Peça com etiqueta VERMELHA ou em QUARENTENA bloqueia instalação
      if (dto.installedPartId) {
        const part = (await client.query<PartRow>(
          'SELECT * FROM ops.parts_inventory WHERE id = $1 AND tenant_id = $2',
          [dto.installedPartId, context.tenantId],
        )).rows[0];

        if (part) {
          if (part.tag === 'VERMELHA_CONDENADA_NAO_AERONAVEGAVEL' || part.status === 'QUARENTENA') {
            throw new UnprocessableEntityException({
              code: 'VALIDATION_ERROR',
              message: `VIOLAÇÃO IS 43-001: Peça "${part.part_number}" não aeronavegável (Etiqueta ${part.tag} / Status ${part.status}) não pode ser instalada.`,
            });
          }
        }
      }

      const taskId = randomUUID();
      const result = await client.query(
        `INSERT INTO ops.work_order_tasks
          (id, work_order_id, task_number, description, ata_chapter, manual_ref, status, performed_by, performed_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'CONCLUIDA', $7, now()) RETURNING *`,
        [taskId, woId, dto.taskNumber, dto.description, dto.ataChapter ?? null, dto.manualRef ?? null, context.userId],
      );

      return result.rows[0];
    });
  }

  /** POST /work-orders/:id/step — Avança máquina de estados das 12 Etapas */
  public async advanceStep(context: RequestContext, woId: string, nextStep: number): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const wo = (await client.query<WorkOrderRow>(
        'SELECT * FROM ops.work_orders WHERE id = $1 AND tenant_id = $2',
        [woId, context.tenantId],
      )).rows[0];

      if (!wo) throw new NotFoundException({ code: 'NOT_FOUND', message: 'OS não encontrada.' });
      if (nextStep < 1 || nextStep > 12) {
        throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'Etapa deve estar entre 1 e 12.' });
      }

      const ledgerId = randomUUID();
      const stepName = WORK_ORDER_STEPS[nextStep] ?? `Etapa ${nextStep}`;

      await client.query(
        'UPDATE ops.work_orders SET step = $2, status = \'EM_EXECUCAO\', updated_at = now() WHERE id = $1',
        [woId, nextStep],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'WORK_ORDER', entityId: woId,
        actionType: PHASE_5_MAINTENANCE_EVENTS.WORK_ORDER_STEP_UPDATED,
        payload: { woId, previousStep: wo.step, nextStep, stepName },
      });

      return { woId, previousStep: wo.step, currentStep: nextStep, stepName };
    });
  }

  /** POST /work-orders/:id/close — Emite CRS/APRS e encerra a OS (Travas 1, 4 e 5) */
  public async closeWorkOrder(context: RequestContext, woId: string, dto: CloseWorkOrderDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const wo = (await client.query<WorkOrderRow>(
        'SELECT * FROM ops.work_orders WHERE id = $1 AND tenant_id = $2',
        [woId, context.tenantId],
      )).rows[0];

      if (!wo) throw new NotFoundException({ code: 'NOT_FOUND', message: 'OS não encontrada.' });
      if (wo.status === 'CONCLUIDA') throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'OS já concluída.' });

      // Trava 1 (RBAC 43.7): Assinatura digital de profissional habilitado (RT ou INSPETOR da OM)
      const personnel = (await client.query(
        `SELECT * FROM ops.maintenance_organization_personnel p
         JOIN ops.maintenance_organizations o ON o.id = p.organization_id
         WHERE o.tenant_id = $1 AND p.person_id = $2 AND p.role IN ('RT','INSPETOR') AND p.status = 'ATIVO'`,
        [context.tenantId, dto.inspectorId],
      )).rows[0];

      if (!personnel) {
        throw new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: 'VIOLAÇÃO RBAC 43.7: CRS exige assinatura digital de Responsável Técnico ou Inspetor habilitado com CHT ativa.',
        });
      }

      // Trava 4 (RBAC 39): Diretriz de Aeronavegabilidade (DA) pendente impede retorno ao serviço
      const pendingAd = (await client.query(
        `SELECT * FROM ops.airworthiness_directives WHERE aircraft_id = $1 AND status = 'PENDENTE'`,
        [wo.aircraft_id],
      )).rows[0];

      if (pendingAd) {
        throw new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: `VIOLAÇÃO RBAC 39: DA pendente "${pendingAd.ad_number}" impede emissão de CRS e retorno ao serviço da aeronave.`,
        });
      }

      // Trava 5 (IS 43.9-001): Grande reparo/alteração exige formulário SEGVOO 001 prévio
      if ((wo.is_major || wo.requires_segvoo) && !dto.segvoo001Id) {
        throw new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: 'VIOLAÇÃO IS 43.9-001: Grande Reparo/Alteração exige formulário SEGVOO 001 gerado antes da emissão do CRS.',
        });
      }

      const ledgerId = randomUUID();

      // Atualiza OS para CONCLUIDA, Etapa 12 (Liquidação) e registra CRS
      await client.query(
        `UPDATE ops.work_orders
         SET status = 'CONCLUIDA', step = 12, crs_issued = true, crs_signature_id = $2, closed_at = now(), updated_at = now()
         WHERE id = $1`,
        [woId, dto.signatureId],
      );

      // Escrituração nas Cadernetas Digitais da Aeronave (IS 43.9-003)
      const entry = {
        woNumber: wo.work_order_number,
        closedAt: new Date().toISOString(),
        inspectorId: dto.inspectorId,
        signatureId: dto.signatureId,
        workType: wo.work_type,
      };

      await client.query(
        `UPDATE ops.aircraft_logbooks
         SET entries = entries || $2::jsonb
         WHERE aircraft_id = $1`,
        [wo.aircraft_id, JSON.stringify([entry])],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'WORK_ORDER', entityId: woId,
        actionType: PHASE_5_MAINTENANCE_EVENTS.CRS_ISSUED,
        payload: { woId, woNumber: wo.work_order_number, inspectorId: dto.inspectorId, crsSignatureId: dto.signatureId },
      });

      return {
        woId,
        status: 'CONCLUIDA',
        crsIssued: true,
        crsSignatureId: dto.signatureId,
        logbookUpdated: true,
      };
    });
  }

  /** POST /parts-inventory — Cadastra peça e realiza triagem por etiquetas */
  public async registerPart(context: RequestContext, dto: RegisterPartDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const partId = randomUUID();
      const ledgerId = randomUUID();

      // Regra IS 43-001: Se a peça for Amarela ou não tiver Form 8130-3 (em peça não nova), entra em QUARENTENA
      const initialStatus = (dto.tag === 'AMARELA_REPARAVEL_INSPECAO' || (!dto.form81303 && dto.condition !== 'NOVA'))
        ? 'QUARENTENA'
        : 'EM_ESTOQUE';

      const result = await client.query<PartRow>(
        `INSERT INTO ops.parts_inventory
          (id, tenant_id, part_number, serial_number, manufacturer, condition, tag, certification_type, form_8130_3, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [partId, context.tenantId, dto.partNumber, dto.serialNumber ?? null, dto.manufacturer ?? null,
          dto.condition, dto.tag, dto.certificationType, dto.form81303 ?? null, initialStatus],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'PART_INVENTORY', entityId: partId,
        actionType: initialStatus === 'QUARENTENA' ? PHASE_5_MAINTENANCE_EVENTS.PART_QUARANTINED : PHASE_5_MAINTENANCE_EVENTS.PART_REGISTERED,
        payload: { partId, partNumber: dto.partNumber, tag: dto.tag, status: initialStatus },
      });

      return result.rows[0];
    });
  }

  /** POST /tools — Cadastra e monitora calibração de ferramentas */
  public async registerTool(context: RequestContext, dto: RegisterToolDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const toolId = randomUUID();
      const ledgerId = randomUUID();

      const expiryDate = dto.calibrationExpiry ? new Date(dto.calibrationExpiry) : null;
      const isExpired = expiryDate && expiryDate < new Date();
      const status = isExpired ? 'CALIBRACAO_VENCIDA' : 'OPERACIONAL';

      const result = await client.query<ToolRow>(
        `INSERT INTO ops.tools
          (id, tenant_id, identification, description, calibration_required, calibration_standard, calibration_expiry, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [toolId, context.tenantId, dto.identification, dto.description ?? null,
          dto.calibrationRequired, dto.calibrationStandard ?? null, expiryDate, status],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'TOOL', entityId: toolId,
        actionType: status === 'CALIBRACAO_VENCIDA' ? PHASE_5_MAINTENANCE_EVENTS.TOOL_CALIBRATION_EXPIRED : PHASE_5_MAINTENANCE_EVENTS.TOOL_CALIBRATED,
        payload: { toolId, identification: dto.identification, status, expiryDate },
      });

      return result.rows[0];
    });
  }

  /** POST /non-destructive-tests — Emite laudo END com qualificação Nível I/II/III (IS 43.13-004) */
  public async logNdtTest(context: RequestContext, dto: LogNdtTestDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const ndtId = randomUUID();
      const ledgerId = randomUUID();

      const result = await client.query(
        `INSERT INTO ops.non_destructive_tests
          (id, tenant_id, work_order_id, method, inspector_id, inspector_level, result, report_hash, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [ndtId, context.tenantId, dto.workOrderId, dto.method, dto.inspectorId, dto.inspectorLevel, dto.result, dto.reportHash, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'NON_DESTRUCTIVE_TEST', entityId: ndtId,
        actionType: PHASE_5_MAINTENANCE_EVENTS.NDT_REPORTED,
        payload: { ndtId, workOrderId: dto.workOrderId, method: dto.method, level: dto.inspectorLevel, result: dto.result },
      });

      return result.rows[0];
    });
  }

  /** POST /airworthiness-directives/:id/comply — Cumpre Diretriz de Aeronavegabilidade (FCDA/RBAC 39) */
  public async complyAirworthinessDirective(context: RequestContext, adId: string, dto: ComplyAirworthinessDirectiveDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const ad = (await client.query(
        'SELECT * FROM ops.airworthiness_directives WHERE id = $1 AND tenant_id = $2',
        [adId, context.tenantId],
      )).rows[0];

      if (!ad) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Diretriz de Aeronavegabilidade não encontrada.' });

      const ledgerId = randomUUID();

      await client.query(
        `UPDATE ops.airworthiness_directives
         SET status = 'CUMPRIDA', amoc_approved = $2, fcda_hash = $3, updated_at = now()
         WHERE id = $1`,
        [adId, dto.amocApproved, dto.fcdaHash],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'AIRWORTHINESS_DIRECTIVE', entityId: adId,
        actionType: PHASE_5_MAINTENANCE_EVENTS.AD_COMPLIED,
        payload: { adId, adNumber: dto.adNumber, amocApproved: dto.amocApproved, fcdaHash: dto.fcdaHash },
      });

      return { adId, status: 'CUMPRIDA', amocApproved: dto.amocApproved, fcdaHash: dto.fcdaHash };
    });
  }

  /** GET /maintenance/dashboard — KPIs do ERP 43+145 */
  public async getDashboard(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const [woCounts, expiredTools, quarantineParts, pendingAds] = await Promise.all([
        client.query(`SELECT status, COUNT(*) AS count FROM ops.work_orders WHERE tenant_id = $1 GROUP BY status`, [context.tenantId]),
        client.query(`SELECT COUNT(*) AS count FROM ops.tools WHERE tenant_id = $1 AND status = 'CALIBRACAO_VENCIDA'`, [context.tenantId]),
        client.query(`SELECT COUNT(*) AS count FROM ops.parts_inventory WHERE tenant_id = $1 AND status = 'QUARENTENA'`, [context.tenantId]),
        client.query(`SELECT COUNT(*) AS count FROM ops.airworthiness_directives WHERE tenant_id = $1 AND status = 'PENDENTE'`, [context.tenantId]),
      ]);

      return {
        tenantId: context.tenantId,
        workOrders: woCounts.rows,
        expiredToolsCount: Number(expiredTools.rows[0]?.count ?? 0),
        quarantinePartsCount: Number(quarantineParts.rows[0]?.count ?? 0),
        pendingAirworthinessDirectivesCount: Number(pendingAds.rows[0]?.count ?? 0),
      };
    });
  }
}
