import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { RequestContext } from '@vortex/types';
import { DatabaseService } from '../../platform/database/database.service';
import { RegulatoryParameterService } from '../regulatory/regulatory-parameter.service';
import { LedgerService } from './ledger.service';

interface VerificationContextRow { tenant_id: string; user_id: string; company_id: string | null }

@Injectable()
export class LedgerIntegrityMonitor implements OnModuleInit {
  private readonly logger = new Logger(LedgerIntegrityMonitor.name);

  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
    private readonly parameters: RegulatoryParameterService,
  ) {}

  public async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') await this.runScheduledVerification();
  }

  public async ensurePartitions(): Promise<number> {
    const monthsAhead = await this.parameters.getNumber('ledger.partition.months_ahead');
    const result = await this.database.query<{ ensure_monthly_partitions: number }>('SELECT ledger.ensure_monthly_partitions($1)', [monthsAhead]);
    return result.rows[0]?.ensure_monthly_partitions ?? 0;
  }

  @Cron('0 2 * * *', { name: 'ledger-daily-integrity', timeZone: 'UTC', waitForCompletion: true })
  public async runScheduledVerification(): Promise<void> {
    try {
      await this.ensurePartitions();
      const contexts = await this.database.query<VerificationContextRow>('SELECT * FROM ledger.verification_contexts()');
      for (const row of contexts.rows) {
        const context: RequestContext = { requestId: crypto.randomUUID(), userId: row.user_id, tenantId: row.tenant_id, roles: ['SYSTEM'], scopes: ['ledger:read'] };
        if (row.company_id) context.companyId = row.company_id;
        const result = await this.ledger.verifyAndPersist(context, 'SCHEDULED');
        if (!result.valid) this.logger.error({ tenantId: row.tenant_id, firstBrokenBlock: result.firstBrokenBlock }, 'Ledger violado');
      }
    } catch (error) {
      this.logger.error(error, 'Falha na verificação programada do ledger');
    }
  }
}
