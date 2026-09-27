import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CommunicationModule } from './communication/communication.module';
import { HealthController } from './health.controller';
import { MroModule } from './mro/mro.module';
import { AuthModule } from './platform/auth/auth.module';
import { BusModule } from './platform/bus/bus.module';
import { DatabaseModule } from './platform/database/database.module';
import { RequestContextMiddleware } from './platform/http/request-context.middleware';
import { RateLimitModule } from './platform/http/rate-limit.module';
import { LedgerModule } from './platform/ledger/ledger.module';
import { NotificationsModule } from './platform/notifications/notifications.module';
import { ProtocolModule } from './platform/protocol/protocol.module';
import { RedisModule } from './platform/redis/redis.module';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    LedgerModule,
    AuthModule,
    ProtocolModule,
    BusModule,
    MroModule,
    CommunicationModule,
    NotificationsModule,
    RateLimitModule,
  ],
  controllers: [HealthController],
  providers: [RequestContextMiddleware],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
