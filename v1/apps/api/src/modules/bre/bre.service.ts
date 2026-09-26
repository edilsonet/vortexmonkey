import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { RequestContext } from '@vortex/types';
import { DatabaseService } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';

/**
 * BRE (Business Rules Engine) — Motor de Regras Declarativo.
 * Centraliza TODAS as regras de negócio do ecossistema VORTEX.
 * Nenhuma regra hardcoded — sempre lida dos seeds/configuração em bre.rules.
 */
@Injectable()
export class BreService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
  ) {}

  /**
   * Lista regras, com filtros opcionais por módulo e severidade.
   */
  public listRules(context: RequestContext, filters: { module?: string; severity?: string }): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      let sql = 'SELECT * FROM bre.rules WHERE 1=1';
      const params: unknown[] = [];
      let idx = 1;

      if (filters.module) {
        sql += ` AND module = $${idx++}`;
        params.push(filters.module);
      }
      if (filters.severity) {
        sql += ` AND severity = $${idx++}`;
        params.push(filters.severity);
      }
      sql += ' ORDER BY code';
      const rows = await client.query(sql, params);
      return rows.rows;
    });
  }

  /**
   * Avalia uma regra contra um contexto fornecido.
   * Retorna ALLOW se a regra está ativa e o contexto atende, ou DENY se bloqueia.
   */
  public evaluateRule(context: RequestContext, ruleCode: string, evalContext: Record<string, unknown>): Promise<{ rule_code: string; result: string; message: string; params_used: Record<string, unknown> }> {
    return this.database.withContext(context, async (client) => {
      const rows = await client.query(
        `SELECT * FROM bre.rules WHERE code = $1`,
        [ruleCode],
      );
      if (rows.rows.length === 0) throw new NotFoundException(`Regra BRE não encontrada: ${ruleCode}`);

      const rule = rows.rows[0];
      if (rule.status !== 'ACTIVE') {
        return {
          rule_code: rule.code,
          result: 'ALLOW',
          message: `Regra ${rule.code} está ${rule.status} — avaliação ignorada`,
          params_used: rule.params,
        };
      }

      // Evaluate rule based on code and context
      let result = 'ALLOW';
      let message = `Regra ${rule.code} avaliada com sucesso`;

      switch (rule.code) {
        case 'ACCREDITATION_EXPIRED': {
          const validYears = (rule.params.validYears as number) ?? 3;
          const accreditedAt = evalContext.accredited_at as string | undefined;
          if (accreditedAt) {
            const yearsDiff = (Date.now() - new Date(accreditedAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
            if (yearsDiff > validYears) {
              result = 'DENY';
              message = `Credenciamento expirado há ${Math.floor(yearsDiff - validYears)} anos`;
            }
          }
          break;
        }
        case 'LICENSE_EXPIRED': {
          const expiresAt = evalContext.license_expires_at as string | undefined;
          if (expiresAt && new Date(expiresAt) < new Date()) {
            result = 'DENY';
            message = 'Licença/CMA/credenciamento vencido';
          }
          break;
        }
        case 'TOXICOLOGICAL_EXPIRED': {
          const validDays = (rule.params.validDays as number) ?? 90;
          const examDate = evalContext.toxicological_exam_date as string | undefined;
          if (examDate) {
            const daysDiff = (Date.now() - new Date(examDate).getTime()) / (24 * 60 * 60 * 1000);
            if (daysDiff > validDays) {
              result = 'DENY';
              message = `Exame toxicológico vencido há ${Math.floor(daysDiff - validDays)} dias`;
            }
          }
          break;
        }
        case 'MEL_ITEM_EXPIRED': {
          const expiresAt = evalContext.mel_expires_at as string | undefined;
          if (expiresAt && new Date(expiresAt) < new Date()) {
            result = 'DENY';
            message = 'Item MEL vencido — voo bloqueado';
          }
          break;
        }
        case 'DA_PENDING': {
          const daPending = evalContext.da_pending as boolean | undefined;
          if (daPending) {
            result = 'DENY';
            message = 'DA aplicável pendente — prevalece sobre a MEL';
          }
          break;
        }
        case 'FUEL_INSUFFICIENT': {
          const fuelMinutes = evalContext.fuel_minutes as number | undefined;
          const isIfr = evalContext.is_ifr as boolean | undefined;
          const minMinutes = isIfr ? ((rule.params.ifrMinutes as number) ?? 45) : ((rule.params.vfrMinutes as number) ?? 30);
          if (fuelMinutes !== undefined && fuelMinutes < minMinutes) {
            result = 'DENY';
            message = `Combustível insuficiente: ${fuelMinutes}min < mínimo ${minMinutes}min`;
          }
          break;
        }
        case 'TOOL_CALIBRATION_EXPIRED': {
          const expiresAt = evalContext.calibration_expires_at as string | undefined;
          if (expiresAt && new Date(expiresAt) < new Date()) {
            result = 'DENY';
            message = 'Calibração de ferramenta vencida — uso bloqueado na OS';
          }
          break;
        }
        case 'PART_RED_TAG': {
          const tag = evalContext.tag as string | undefined;
          if (tag === 'VERMELHA_CONDENADA_NAO_AERONAVEGAVEL') {
            result = 'DENY';
            message = 'Peça com etiqueta vermelha — instalação bloqueada';
          }
          break;
        }
        case 'CRS_WITHOUT_SIGNATURE': {
          const hasSignature = evalContext.has_crs_signature as boolean | undefined;
          if (!hasSignature) {
            result = 'DENY';
            message = 'OS sem assinatura de profissional habilitado';
          }
          break;
        }
        case 'SEGVOO_REQUIRED': {
          const requiresSegvoo = evalContext.requires_segvoo as boolean | undefined;
          const hasSegvoo = evalContext.has_segvoo_001 as boolean | undefined;
          if (requiresSegvoo && !hasSegvoo) {
            result = 'DENY';
            message = 'SEGVOO 001 obrigatório antes do retorno';
          }
          break;
        }
        case 'AIRCRAFT_RAB_MISMATCH': {
          const rabMatch = evalContext.rab_match as boolean | undefined;
          if (rabMatch === false) {
            result = 'DENY';
            message = 'Matrícula divergente do RAB — cadastro bloqueado';
          }
          break;
        }
        case 'LISTING_WITHOUT_INVENTORY': {
          const inventoryExists = evalContext.inventory_item_exists as boolean | undefined;
          if (inventoryExists === false) {
            result = 'DENY';
            message = 'Anúncio requer item de estoque válido';
          }
          break;
        }
        case 'ENROLLMENT_DOUBLE_PERIOD': {
          const periods = evalContext.enrolled_periods as number | undefined;
          const maxPeriods = (rule.params.maxPeriods as number) ?? 2;
          if (periods !== undefined && periods > maxPeriods) {
            result = 'DENY';
            message = `Matrícula no dobro do período (${periods} > ${maxPeriods}) — cancelamento automático`;
          }
          break;
        }
        case 'SESCINC_RESPONSE_OVER_LIMIT': {
          const maxSeconds = (rule.params.maxSeconds as number) ?? 180;
          const responseSeconds = evalContext.response_seconds as number | undefined;
          if (responseSeconds !== undefined && responseSeconds > maxSeconds) {
            result = 'ALERT';
            message = `Tempo-resposta SESCINC ${responseSeconds}s > limite ${maxSeconds}s`;
          }
          break;
        }
        default:
          message = `Regra ${rule.code} sem implementação — ALLOW por padrão`;
      }

      // Ledger: log every evaluation
      const ledgerId = randomUUID();
      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'BRE_RULE', entityId: rule.id,
        actionType: 'EVALUATED',
        payload: { rule_code: rule.code, result, context_summary: { entity_type: evalContext.entity_type, entity_id: evalContext.entity_id } },
      });

      return { rule_code: rule.code, result, message, params_used: rule.params };
    });
  }

  /**
   * Atualiza parâmetros ou severidade de uma regra (admin only).
   */
  public updateRule(context: RequestContext, ruleCode: string, updates: { severity?: string; status?: string; params?: Record<string, unknown> }): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const rows = await client.query(
        `SELECT * FROM bre.rules WHERE code = $1`,
        [ruleCode],
      );
      if (rows.rows.length === 0) throw new NotFoundException(`Regra BRE não encontrada: ${ruleCode}`);

      const rule = rows.rows[0];
      const newSeverity = updates.severity ?? rule.severity;
      const newStatus = updates.status ?? rule.status;
      const newParams = updates.params ?? rule.params;

      await client.query(
        `UPDATE bre.rules SET severity = $1, status = $2, params = $3, updated_at = NOW() WHERE code = $4`,
        [newSeverity, newStatus, JSON.stringify(newParams), ruleCode],
      );

      const ledgerId = randomUUID();
      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'BRE_RULE', entityId: rule.id,
        actionType: 'UPDATED',
        payload: { code: ruleCode, severity: newSeverity, status: newStatus, params: newParams },
        changes: [
          { field_path: 'severity', old_value: rule.severity, new_value: newSeverity },
          { field_path: 'status', old_value: rule.status, new_value: newStatus },
        ],
      });

      return { code: ruleCode, severity: newSeverity, status: newStatus, params: newParams };
    });
  }

  /**
   * Dashboard: resumo das regras ativas por módulo.
   */
  public getDashboard(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const rows = await client.query(
        `SELECT module, severity, COUNT(*) as count FROM bre.rules WHERE status = 'ACTIVE' GROUP BY module, severity ORDER BY module, severity`,
      );
      return { rules_by_module: rows.rows };
    });
  }
}
