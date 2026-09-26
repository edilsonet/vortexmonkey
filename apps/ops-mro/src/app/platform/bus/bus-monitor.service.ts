import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { BusMetricsService } from './bus-metrics.service';
import {
  DEFAULT_BUS_ALARM_THRESHOLDS,
  evaluateBusAlarms,
  type BusAlarmThresholds,
} from './bus-alarm';

const DEFAULT_MONITOR_MS = 30_000;

/**
 * Monitor do bus.
 *
 * Compara o estado medido (atraso do outbox, abandonados, dead-letter) com os
 * limiares e sincroniza `notifications.bus_alarms`: abre/atualiza o que passou,
 * resolve o que normalizou. O alarme e ESTADO CORRENTE; o historico fica no log.
 * Sem `RABBITMQ_URL` o monitor nao sobe (outbox local nao tem o que vigiar).
 */
@Injectable()
export class BusMonitor implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(BusMonitor.name);
  private readonly enabled = Boolean(process.env.RABBITMQ_URL);
  private readonly intervalMs = Number(process.env.BUS_MONITOR_MS ?? DEFAULT_MONITOR_MS);
  private readonly thresholds: BusAlarmThresholds = {
    lagWarnSeconds: Number(
      process.env.OUTBOX_LAG_WARN_SECONDS ?? DEFAULT_BUS_ALARM_THRESHOLDS.lagWarnSeconds,
    ),
    lagCriticalSeconds: Number(
      process.env.OUTBOX_LAG_CRITICAL_SECONDS ?? DEFAULT_BUS_ALARM_THRESHOLDS.lagCriticalSeconds,
    ),
  };

  private timer: NodeJS.Timeout | null = null;
  private stopped = false;
  private running = false;

  public constructor(
    private readonly database: DatabaseService,
    private readonly metrics: BusMetricsService,
  ) {}

  public onApplicationBootstrap(): void {
    if (!this.enabled) {
      this.logger.warn('RABBITMQ_URL ausente: monitor do bus desligado.');
      return;
    }
    this.stopped = false;
    this.schedule(0);
  }

  public onApplicationShutdown(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Avalia uma vez e devolve os codigos de alarme ativos (usado nos testes). */
  public async evaluateOnce(): Promise<readonly string[]> {
    const snapshot = await this.metrics.snapshot();
    const alarms = evaluateBusAlarms(snapshot, this.thresholds);
    await this.database.query('SELECT notifications.sync_bus_alarms($1::jsonb)', [
      JSON.stringify(alarms),
    ]);
    return alarms.map((alarm) => alarm.code);
  }

  private schedule(delayMs: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => void this.tick(), delayMs);
    this.timer.unref?.();
  }

  private async tick(): Promise<void> {
    if (this.stopped || this.running) return;
    this.running = true;
    try {
      const active = await this.evaluateOnce();
      if (active.length > 0) {
        this.logger.warn(`Alarmes ativos do bus: ${active.join(', ')}.`);
      }
      this.schedule(this.intervalMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Ciclo do monitor do bus falhou: ${message}`);
      this.schedule(this.intervalMs);
    } finally {
      this.running = false;
    }
  }
}
