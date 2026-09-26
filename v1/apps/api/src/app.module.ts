import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from './platform/database/database.module';
import { RedisModule } from './platform/redis/redis.module';
import { RequestIdMiddleware } from './platform/http/request-id.middleware';
import { ApiExceptionFilter } from './platform/http/api-exception.filter';
import { ApiResponseInterceptor } from './platform/http/api-response.interceptor';
import { IdempotencyInterceptor } from './platform/http/idempotency.interceptor';
import { JwtAuthGuard } from './platform/security/jwt-auth.guard';
import { PermissionGuard } from './platform/security/permission.guard';
import { RateLimitGuard } from './platform/security/rate-limit.guard';
import { SecurityModule } from './platform/security/security.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { IdentityModule } from './modules/identity/identity.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { RegulatoryModule } from './modules/regulatory/regulatory.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuditTrailInterceptor } from './modules/audit/audit-trail.interceptor';
import { ProtocolModule } from './modules/protocol/protocol.module';
import { SignaturesModule } from './modules/signatures/signatures.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PpspModule } from './modules/ppsp/ppsp.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { OperatorsModule } from './modules/operators/operators.module';
import { TrainingModule } from './modules/training/training.module';
import { AerodromesModule } from './modules/aerodromes/aerodromes.module';
import { RlojaModule } from './modules/rloja/rloja.module';
import { BreModule } from './modules/bre/bre.module';

@Module({
  imports: [
    LoggerModule.forRoot({ pinoHttp: { level: process.env.NODE_ENV === 'production' ? 'info' : 'debug', redact: ['req.headers.authorization', 'req.headers.cookie'], genReqId: (req) => req.headers['x-request-id']?.toString() ?? randomUUID() } }),
    CqrsModule,
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    SecurityModule,
    AuthModule,
    RegulatoryModule,
    LedgerModule,
    ProtocolModule,
    AuditModule,
    IdentityModule,
    HealthModule,
    MetricsModule,
    OutboxModule,
    SignaturesModule,
    DocumentsModule,
    ComplianceModule,
    SubscriptionsModule,
    PpspModule,
    AlertsModule,
    MaintenanceModule,
    OperatorsModule,
    TrainingModule,
    AerodromesModule,
    RlojaModule,
    BreModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    { provide: APP_INTERCEPTOR, useExisting: AuditTrailInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void { consumer.apply(RequestIdMiddleware).forRoutes('*'); }
}
