import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { AuditTrailInterceptor } from './audit-trail.interceptor';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [LedgerModule],
  controllers: [AuditController],
  providers: [AuditService, AuditTrailInterceptor],
  exports: [AuditService, AuditTrailInterceptor],
})
export class AuditModule {}
