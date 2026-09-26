import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  PHASE_4_PPSP_EVENTS,
  PPSP_CONSTANTS,
  type ArsoFunction,
  type ArsoStatus,
  type ToxicologicalResult,
} from '@vortex/contracts-be';
import type { RequestContext } from '@vortex/types';
import { DatabaseService } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';
import type { LogToxicologicalExamDto, RegisterArsoDto, TriggerRandomTestDto } from './ppsp.dto';

interface ArsoPersonnelRow {
  id: string; tenant_id: string; user_id: string; arso_function: ArsoFunction;
  status: ArsoStatus; suspension_reason: string | null; suspended_at: Date | null;
  ledger_block_id: string; created_at: Date;
}

interface ToxicologicalExamRow {
  id: string; tenant_id: string; arso_personnel_id: string; exam_date: Date;
  validity_end: Date; result: ToxicologicalResult; laboratory: string;
  report_hash: string; is_random_sample: boolean; ledger_block_id: string; created_at: Date;
}

@Injectable()
export class PpspService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
  ) {}

  /** POST /arso-personnel — Cadastra profissional como ARSO */
  public async registerArso(context: RequestContext, dto: RegisterArsoDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const arsoId = randomUUID();
      const ledgerId = randomUUID();

      const existing = (await client.query<ArsoPersonnelRow>(
        `SELECT * FROM identity.arso_personnel WHERE tenant_id = $1 AND user_id = $2 AND arso_function = $3`,
        [context.tenantId, dto.userId, dto.arsoFunction],
      )).rows[0];

      if (existing) {
        throw new ConflictException({
          code: 'VALIDATION_ERROR',
          message: 'Profissional já está cadastrado para esta função ARSO no tenant.',
        });
      }

      const result = await client.query<ArsoPersonnelRow>(
        `INSERT INTO identity.arso_personnel (id, tenant_id, user_id, arso_function, status, ledger_block_id)
         VALUES ($1, $2, $3, $4, 'ATIVO', $5) RETURNING *`,
        [arsoId, context.tenantId, dto.userId, dto.arsoFunction, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'ARSO_PERSONNEL', entityId: arsoId,
        actionType: PHASE_4_PPSP_EVENTS.ARSO_REGISTERED,
        payload: { arsoId, userId: dto.userId, arsoFunction: dto.arsoFunction },
      });

      return result.rows[0];
    });
  }

  /** GET /arso-personnel — Lista pessoal ARSO do tenant com estado do exame toxicológico */
  public async getArsoPersonnel(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      return (await client.query(
        `SELECT a.*, u.name AS user_name, u.email AS user_email,
                t.validity_end AS last_exam_validity, t.result AS last_exam_result
         FROM identity.arso_personnel a
         JOIN identity.users u ON u.id = a.user_id
         LEFT JOIN LATERAL (
           SELECT validity_end, result FROM identity.toxicological_exams
           WHERE arso_personnel_id = a.id ORDER BY validity_end DESC LIMIT 1
         ) t ON true
         WHERE a.tenant_id = $1
         ORDER BY a.created_at DESC`,
        [context.tenantId],
      )).rows;
    });
  }

  /** POST /toxicological-exams — Registra exame toxicológico de janela longa */
  public async logToxicologicalExam(context: RequestContext, dto: LogToxicologicalExamDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const arso = (await client.query<ArsoPersonnelRow>(
        `SELECT * FROM identity.arso_personnel WHERE id = $1 AND tenant_id = $2`,
        [dto.arsoPersonnelId, context.tenantId],
      )).rows[0];

      if (!arso) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Pessoal ARSO não encontrado.' });
      }

      const examDateObj = new Date(dto.examDate);
      const validityEndObj = new Date(examDateObj.getTime() + PPSP_CONSTANTS.LONG_WINDOW_EXAM_VALIDITY_DAYS * 86400_000);

      const examId = randomUUID();
      const ledgerId = randomUUID();

      await client.query<ToxicologicalExamRow>(
        `INSERT INTO identity.toxicological_exams
          (id, tenant_id, arso_personnel_id, exam_date, validity_end, result, laboratory, report_hash, is_random_sample, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [examId, context.tenantId, dto.arsoPersonnelId, examDateObj, validityEndObj, dto.result,
          dto.laboratory, dto.reportHash, dto.isRandomSample ?? false, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'TOXICOLOGICAL_EXAM', entityId: examId,
        actionType: PHASE_4_PPSP_EVENTS.TOXICOLOGICAL_EXAM_LOGGED,
        payload: { examId, arsoPersonnelId: dto.arsoPersonnelId, result: dto.result, validityEnd: validityEndObj.toISOString() },
      });

      // Regra RBAC 120.23: Resultado POSITIVO -> Afastamento imediato e irrevogável da função ARSO
      if (dto.result === 'POSITIVO') {
        const suspendLedgerId = randomUUID();
        const reason = `AFASTAMENTO IMEDIATO PPSP (RBAC 120): Resultado positivo em exame toxicológico (Exame ID ${examId}).`;

        await client.query(
          `UPDATE identity.arso_personnel
           SET status = 'SUSPENDED', suspension_reason = $2, suspended_at = now()
           WHERE id = $1`,
          [dto.arsoPersonnelId, reason],
        );

        await this.ledger.append(client, context, {
          id: suspendLedgerId, entityType: 'ARSO_PERSONNEL', entityId: dto.arsoPersonnelId,
          actionType: PHASE_4_PPSP_EVENTS.ARSO_SUSPENDED,
          payload: { arsoPersonnelId: dto.arsoPersonnelId, reason, examId },
          changes: [{ field_path: 'status', old_value: arso.status, new_value: 'SUSPENDED' }],
        });

        return {
          examId,
          result: dto.result,
          validityEnd: validityEndObj,
          suspended: true,
          suspensionNote: reason,
        };
      }

      return {
        examId,
        result: dto.result,
        validityEnd: validityEndObj,
        suspended: false,
      };
    });
  }

  /** GET /arso-personnel/expiring — Identifica exames toxicológicos vencidos ou vencendo nos próximos 15 dias */
  public async getExpiringArso(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const rows = (await client.query(
        `SELECT a.id AS arso_id, a.user_id, a.arso_function, a.status,
                u.name AS user_name, u.email AS user_email,
                t.id AS exam_id, t.validity_end,
                (t.validity_end < CURRENT_DATE) AS is_expired,
                (t.validity_end - CURRENT_DATE) AS days_remaining
         FROM identity.arso_personnel a
         JOIN identity.users u ON u.id = a.user_id
         JOIN LATERAL (
           SELECT id, validity_end FROM identity.toxicological_exams
           WHERE arso_personnel_id = a.id ORDER BY validity_end DESC LIMIT 1
         ) t ON true
         WHERE a.tenant_id = $1
           AND (t.validity_end <= CURRENT_DATE + INTERVAL '15 days' OR t.validity_end < CURRENT_DATE)
         ORDER BY t.validity_end ASC`,
        [context.tenantId],
      )).rows;

      // Executa bloqueio automático de qualquer ARSO com exame já vencido
      for (const row of rows) {
        if (row.is_expired && row.status === 'ATIVO') {
          const suspendLedgerId = randomUUID();
          const reason = `BLOQUEIO AUTOMÁTICO RBAC 120: Exame toxicológico de janela longa vencido em ${row.validity_end}.`;

          await client.query(
            `UPDATE identity.arso_personnel SET status = 'SUSPENDED', suspension_reason = $2, suspended_at = now() WHERE id = $1`,
            [row.arso_id, reason],
          );

          await this.ledger.append(client, context, {
            id: suspendLedgerId, entityType: 'ARSO_PERSONNEL', entityId: row.arso_id,
            actionType: PHASE_4_PPSP_EVENTS.ARSO_SUSPENDED,
            payload: { arsoId: row.arso_id, reason, expiredValidityEnd: row.validity_end },
          });

          row.status = 'SUSPENDED';
        }
      }

      return rows;
    });
  }

  /** POST /arso-personnel/random-test — Algoritmo auditável de sorteio aleatório inopinado */
  public async drawRandomTestSample(context: RequestContext, _dto: TriggerRandomTestDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      // Obter profissionais ARSO ativos do tenant
      const activeArso = (await client.query<ArsoPersonnelRow>(
        `SELECT * FROM identity.arso_personnel WHERE tenant_id = $1 AND status = 'ATIVO'`,
        [context.tenantId],
      )).rows;

      if (activeArso.length === 0) {
        throw new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: 'Nenhum profissional ARSO ativo disponível para sorteio.',
        });
      }

      // Sorteio auditável: semente baseada na contagem e timestamp
      const sampleSize = Math.max(1, Math.ceil(activeArso.length * PPSP_CONSTANTS.RANDOM_SAMPLING_ANNUAL_MINIMUM_PERCENT));
      const seedHash = createHash('sha256')
        .update(`${context.tenantId}:${Date.now()}:${activeArso.length}`)
        .digest('hex');

      // Ordenação pseudo-aleatória determinística por hash da semente + ID do ARSO
      const selected = [...activeArso]
        .sort((a, b) => {
          const hashA = createHash('sha256').update(`${seedHash}:${a.id}`).digest('hex');
          const hashB = createHash('sha256').update(`${seedHash}:${b.id}`).digest('hex');
          return hashA.localeCompare(hashB);
        })
        .slice(0, sampleSize);

      const ledgerId = randomUUID();
      const sampleIds = selected.map(s => s.id);

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'PPSP_RANDOM_SAMPLE', entityId: ledgerId,
        actionType: PHASE_4_PPSP_EVENTS.RANDOM_SAMPLE_DRAWN,
        payload: { tenantId: context.tenantId, sampleSize, totalActive: activeArso.length, seedHash, selectedArsoIds: sampleIds },
      });

      return {
        sampleSize,
        totalActive: activeArso.length,
        seedHash,
        selectedPersonnel: selected.map(s => ({ arsoId: s.id, userId: s.user_id, arsoFunction: s.arso_function })),
      };
    });
  }
}
