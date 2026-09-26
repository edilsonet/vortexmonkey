import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type {
  OutboxRedriveRequest,
  OutboxRedriveResponse,
  RequestContext,
} from '@vortex/shared-dto';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { LedgerService } from '../ledger/ledger.service';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1_000;

/**
 * Devolve a fila eventos abandonados do tenant.
 *
 * O evento nao e apagado nem reescrito: so `abandoned_at`/`attempts`/`last_error`
 * voltam ao estado pendente, para que o worker o publique. O re-drive e auditado
 * no ledger na MESMA transacao, entao fica rastro de quem devolveu o que.
 */
@Injectable()
export class OutboxRedriveService {
  private readonly logger = new Logger(OutboxRedriveService.name);

  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
  ) {}

  public redrive(
    context: RequestContext,
    input: OutboxRedriveRequest,
  ): Promise<OutboxRedriveResponse> {
    const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    return this.database.withContext(context, async (client) => {
      const allowed = await client.query<{ ok: boolean }>(
        'SELECT identity.can_administer($1, $2) AS ok',
        [context.userId, context.tenantId],
      );
      if (allowed.rows[0]?.ok !== true) {
        throw new ForbiddenException({
          code: 'PERMISSION_DENIED',
          message: 'Re-drive exige papel de administracao no tenant.',
        });
      }

      const result = await client.query<{ ids: string[] }>(
        'SELECT ledger.redrive_abandoned_outbox_events($1, $2, $3::uuid[]) AS ids',
        [context.tenantId, limit, input.ids === undefined ? null : [...input.ids]],
      );
      const redriven = result.rows[0]?.ids ?? [];
      if (redriven.length === 0) {
        return { redriven: [] };
      }

      await this.ledger.append(client, context, {
        id: randomUUID(),
        entityType: 'ledger.outbox_events',
        entityId: context.tenantId,
        actionType: 'OUTBOX_REDRIVEN',
        payload: { count: redriven.length, ids: redriven },
      });
      this.logger.log(`Re-drive de ${redriven.length} evento(s) abandonado(s).`);
      return { redriven };
    });
  }
}
