import { Controller, Get } from '@nestjs/common';
import type { BusMetrics, HealthStatus } from '@vortex/shared-dto';
import { BusMetricsService } from './platform/bus/bus-metrics.service';

@Controller()
export class HealthController {
  public constructor(private readonly busMetrics: BusMetricsService) {}

  @Get('health')
  health(): HealthStatus {
    return { status: 'ok', service: 'ops-mro' };
  }

  /**
   * Liveness do bus: atraso do outbox e estado da inbox do consumidor. So
   * contagens agregadas, sem dado de tenant.
   */
  @Get('health/bus')
  bus(): Promise<BusMetrics> {
    return this.busMetrics.snapshot();
  }
}
