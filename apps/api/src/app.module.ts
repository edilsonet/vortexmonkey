import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { loadConfig } from "@vortex/config";
import { DatabaseModule } from "./platform/database/database.module.ts";
import { RedisModule } from "./platform/redis/redis.module.ts";
import { ApiExceptionFilter } from "./platform/http/api-exception.filter.ts";
import { ApiResponseInterceptor } from "./platform/http/api-response.interceptor.ts";
import { IdempotencyInterceptor } from "./platform/http/idempotency.interceptor.ts";
import { RequestIdMiddleware } from "./platform/http/request-id.middleware.ts";
import { JwtAuthGuard } from "./platform/security/jwt-auth.guard.ts";
import { HealthModule } from "./modules/health/health.module.ts";
import { AuthModule } from "./modules/auth/auth.module.ts";
import { IdentityModule } from "./modules/identity/identity.module.ts";
import { ProfessionalModule } from "./modules/professional/professional.module.ts";
import { StockModule } from "./modules/stock/stock.module.ts";
import { RecruitmentModule } from "./modules/recruitment/recruitment.module.ts";
import { LedgerModule } from "./modules/ledger/ledger.module.ts";
import { ProtocolModule } from "./modules/protocol/protocol.module.ts";
import { StorageModule } from "./platform/storage/storage.module.ts";
import { DocumentsModule } from "./modules/documents/documents.module.ts";
import { SignaturesModule } from "./modules/signatures/signatures.module.ts";
import { ComplianceModule } from "./modules/compliance/compliance.module.ts";
import { BillingModule } from "./modules/billing/billing.module.ts";
import { PpspModule } from "./modules/ppsp/ppsp.module.ts";
import { AlertsModule } from "./modules/alerts/alerts.module.ts";
import { MroModule } from "./modules/mro/mro.module.ts";
import { OperatorsModule } from "./modules/operators/operators.module.ts";
import { TrainingModule } from "./modules/training/training.module.ts";
import { AerodromesModule } from "./modules/aerodromes/aerodromes.module.ts";
import { MarketModule } from "./modules/market/market.module.ts";
import { CommunicationModule } from "./modules/communication/communication.module.ts";
import { BreModule } from "./modules/bre/bre.module.ts";

const config = loadConfig();

@Module({
  imports: [
    JwtModule.register({ global: true, secret: config.jwtSecret, signOptions: { expiresIn: "15m" } }),
    DatabaseModule,
    RedisModule,
    StorageModule,
    HealthModule,
    LedgerModule,
    ProtocolModule,
    AuthModule,
    IdentityModule,
    ProfessionalModule,
    StockModule,
    RecruitmentModule,
    DocumentsModule,
    SignaturesModule,
    ComplianceModule,
    BillingModule,
    PpspModule,
    AlertsModule,
    MroModule,
    OperatorsModule,
    TrainingModule,
    AerodromesModule,
    MarketModule,
    CommunicationModule,
    BreModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
