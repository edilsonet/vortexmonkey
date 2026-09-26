import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { BusController } from './bus.controller';
import { BusMetricsService } from './bus-metrics.service';
import { BusMonitor } from './bus-monitor.service';
import { EventConsumer } from './event-consumer.service';
import { EventHandlerRegistry } from './event-handler';
import { OutboxRedriveService } from './outbox-redrive.service';
import { OutboxPublisher } from './outbox-publisher.service';
import { EVENT_BUS, RabbitMqEventBus } from './rabbitmq.service';

@Global()
@Module({
  controllers: [BusController],
  imports: [DatabaseModule],
  providers: [
    RabbitMqEventBus,
    { provide: EVENT_BUS, useExisting: RabbitMqEventBus },
    OutboxPublisher,
    EventHandlerRegistry,
    EventConsumer,
    BusMetricsService,
    BusMonitor,
    OutboxRedriveService,
  ],
  exports: [
    EVENT_BUS,
    OutboxPublisher,
    EventHandlerRegistry,
    BusMetricsService,
    OutboxRedriveService,
  ],
})
export class BusModule {}
