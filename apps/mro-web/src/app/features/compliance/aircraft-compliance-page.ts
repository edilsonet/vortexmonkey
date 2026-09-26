import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type {
  AircraftComplianceResponse,
  AircraftRecord,
  ComplianceAssessment,
  ComplianceItemRecord,
  Meter,
  MeterReadingRecord,
  RecordComplianceDoneResponse,
  Urgency,
} from '@vortex/shared-dto';
import { APP_BASE_PATH, MroService } from '@vortex/core';
import {
  VxCard,
  VxEmptyState,
  VxLoading,
  VxMetricCard,
  VxPageHeader,
  VxUrgencyBadge,
} from '@vortex/ui';
import { forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { errorMessage, hours, today } from '../../shared/format';

const METER_OPTIONS: readonly { readonly value: Meter; readonly label: string }[] = [
  { value: 'airframe', label: 'Celula (airframe)' },
  { value: 'tach', label: 'Tacometro (tach)' },
  { value: 'hobbs', label: 'Hobbs' },
];

interface AircraftComplianceData {
  readonly aircraft: AircraftRecord;
  readonly assessment: AircraftComplianceResponse;
  readonly items: readonly ComplianceItemRecord[];
  readonly readings: readonly MeterReadingRecord[];
}

/**
 * Ficha de conformidade de uma aeronave: itens, vencimentos, leituras e o
 * registro de execucao — que devolve protocolo `AAAA-NNNNNN` e o bloco do
 * ledger, provando o registro imutavel.
 */
@Component({
  selector: 'vx-aircraft-compliance-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    RouterLink,
    VxCard,
    VxEmptyState,
    VxLoading,
    VxMetricCard,
    VxPageHeader,
    VxUrgencyBadge,
  ],
  template: `
    @if (loading()) {
      <vx-loading label="Carregando a ficha da aeronave" />
    } @else if (error(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (data(); as view) {
      <vx-page-header
        eyebrow="Ficha de conformidade"
        [title]="view.aircraft.registration"
        [subtitle]="view.aircraft.manufacturer + ' ' + view.aircraft.model + '  ·  série ' + (view.aircraft.serialNumber ?? '--')"
      >
        <a mat-stroked-button [routerLink]="base + '/conformidade'">Voltar</a>
        <button mat-flat-button color="primary" type="button" (click)="reload()">Atualizar</button>
      </vx-page-header>

      <div class="metrics">
        <vx-metric-card label="Horas totais" [value]="h(view.aircraft.totalHours)" unit="h" tone="accent" />
        <vx-metric-card label="Ciclos totais" [value]="view.aircraft.totalCycles" />
        <vx-metric-card
          label="Utiliza&ccedil;&atilde;o"
          [value]="rate(view.assessment)"
          unit="h/dia"
          [hint]="utilizationHint(view.assessment)"
        />
        <vx-metric-card
          label="Pior urg&ecirc;ncia"
          [value]="urgencyText(view.assessment.worstUrgency)"
          [tone]="urgencyTone(view.assessment.worstUrgency)"
        />
      </div>

      @if (receipt(); as done) {
        <div class="receipt" role="status">
          <div class="receipt__head">
            <span class="receipt__tag">Registrado</span>
            <button class="receipt__close" type="button" (click)="dismissReceipt()">Fechar</button>
          </div>
          <dl class="receipt__grid">
            <div>
              <dt>Protocolo</dt>
              <dd class="mono big">{{ done.protocolNumber }}</dd>
            </div>
            <div>
              <dt>Novo vencimento</dt>
              <dd class="mono">
                {{ done.nextDue.hours !== null ? h(done.nextDue.hours) + ' h' : (done.nextDue.date ?? done.nextDue.cycles + ' ciclos') }}
              </dd>
            </div>
            <div>
              <dt>Bloco do ledger</dt>
              <dd class="mono small">{{ done.ledgerBlockId }}</dd>
            </div>
            <div>
              <dt>Hash SHA-256</dt>
              <dd class="mono small">{{ done.ledgerHash }}</dd>
            </div>
          </dl>
        </div>
      }

      <vx-card heading="Itens de conformidade" [hint]="view.items.length + ' item(ns)'">
        @if (view.items.length === 0) {
          <vx-empty-state
            title="Nenhum item de conformidade"
            message="Cadastre abaixo o primeiro item (por exemplo, inspe&ccedil;&atilde;o de 100 h) para acompanhar o vencimento."
          />
        } @else {
          <div class="tableWrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Intervalo</th>
                  <th scope="col">Pr&oacute;ximo</th>
                  <th scope="col">Urg&ecirc;ncia</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                @for (item of view.items; track item.id) {
                  <tr>
                    <td>
                      <span class="mono strong">{{ item.kind }}</span>
                      <span class="muted"> · {{ item.label }}</span>
                    </td>
                    <td class="mono">{{ intervalText(item) }}</td>
                    <td class="mono">{{ dueText(item.id) }}</td>
                    <td>
                      <vx-urgency-badge [urgency]="urgencyOf(item.id)" />
                    </td>
                    <td class="right">
                      <button mat-stroked-button type="button" (click)="pick(item)">
                        Registrar
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </vx-card>

      <div class="cols">
        <vx-card heading="Executar conformidade" hint="Gera protocolo e bloco no ledger">
          <form class="form" [formGroup]="doneForm" (ngSubmit)="submitDone()">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Item</mat-label>
              <mat-select formControlName="complianceItemId">
                @for (item of view.items; track item.id) {
                  <mat-option [value]="item.id">{{ item.kind }} — {{ item.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <div class="row">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Data</mat-label>
                <input matInput type="date" formControlName="doneDate" />
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Horas</mat-label>
                <input matInput type="number" formControlName="doneHours" />
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Ciclos</mat-label>
                <input matInput type="number" formControlName="doneCycles" />
              </mat-form-field>
            </div>
            @if (doneError(); as message) {
              <p class="error" role="alert">{{ message }}</p>
            }
            <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
              Registrar execu&ccedil;&atilde;o
            </button>
          </form>
        </vx-card>

        <vx-card heading="Leituras de medidor" [hint]="view.readings.length + ' leitura(s)'">
          @if (view.readings.length === 0) {
            <p class="muted">Sem leituras. A primeira leitura define a hora canônica da aeronave.</p>
          } @else {
            <ul class="reads">
              @for (reading of view.readings; track reading.id) {
                <li>
                  <span class="mono">{{ reading.readingDate }}</span>
                  <span class="mono">af {{ h(reading.airframe) }}</span>
                  <span class="mono">tach {{ h(reading.tach) }}</span>
                  <span class="mono">hobbs {{ h(reading.hobbs) }}</span>
                </li>
              }
            </ul>
          }
          <form class="form form--tight" [formGroup]="readingForm" (ngSubmit)="submitReading()">
            <div class="row">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Data</mat-label>
                <input matInput type="date" formControlName="readingDate" />
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Airframe</mat-label>
                <input matInput type="number" formControlName="airframe" />
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Tach</mat-label>
                <input matInput type="number" formControlName="tach" />
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Hobbs</mat-label>
                <input matInput type="number" formControlName="hobbs" />
              </mat-form-field>
            </div>
            @if (readingError(); as message) {
              <p class="error" role="alert">{{ message }}</p>
            }
            <button mat-stroked-button type="submit" [disabled]="saving()">Registrar leitura</button>
          </form>
        </vx-card>
      </div>

      <vx-card heading="Novo item de conformidade" hint="Base do plano de manuten&ccedil;&atilde;o">
        <form class="form" [formGroup]="itemForm" (ngSubmit)="submitItem()">
          <div class="row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>C&oacute;digo</mat-label>
              <input matInput formControlName="kind" placeholder="INSPECAO_100H" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Descri&ccedil;&atilde;o</mat-label>
              <input matInput formControlName="label" placeholder="Inspe&ccedil;&atilde;o de 100 horas" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Intervalo (h)</mat-label>
              <input matInput type="number" formControlName="intervalHours" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Medidor</mat-label>
              <mat-select formControlName="meter">
                @for (option of meterOptions; track option.value) {
                  <mat-option [value]="option.value">{{ option.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Horas na &uacute;ltima execu&ccedil;&atilde;o</mat-label>
              <input matInput type="number" formControlName="lastDoneHours" />
            </mat-form-field>
          </div>
          @if (itemError(); as message) {
            <p class="error" role="alert">{{ message }}</p>
          }
          <button mat-stroked-button type="submit" [disabled]="saving()">Adicionar item</button>
        </form>
      </vx-card>
    }
  `,
  styles: `
    .error {
      margin: 0 0 var(--vx-space-2);
      padding: var(--vx-space-2) var(--vx-space-3);
      border-left: 3px solid var(--vx-overdue);
      background: var(--vx-overdue-bg);
      color: var(--vx-overdue);
      font-size: 0.8125rem;
      border-radius: var(--vx-radius-xs);
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--vx-space-3);
      margin-bottom: var(--vx-space-5);
    }
    vx-card {
      display: block;
      margin-bottom: var(--vx-space-5);
    }
    .cols {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: var(--vx-space-5);
    }
    .cols vx-card {
      margin-bottom: 0;
    }
    .receipt {
      border: 1px solid var(--vx-upcoming);
      border-left-width: 4px;
      border-radius: var(--vx-radius-md);
      background: var(--vx-upcoming-bg);
      padding: var(--vx-space-3) var(--vx-space-4);
      margin-bottom: var(--vx-space-5);
    }
    .receipt__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--vx-space-3);
    }
    .receipt__tag {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--vx-upcoming);
    }
    .receipt__close {
      border: none;
      background: transparent;
      color: var(--vx-upcoming);
      font: inherit;
      font-size: 0.75rem;
      cursor: pointer;
      text-decoration: underline;
    }
    .receipt__grid {
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--vx-space-3);
    }
    .receipt__grid dt {
      font-size: 0.6875rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--vx-text-muted);
    }
    .receipt__grid dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .mono {
      font-family: var(--vx-font-mono);
      font-variant-numeric: tabular-nums;
    }
    .big {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: 0.06em;
    }
    .small {
      font-size: 0.75rem;
    }
    .strong {
      font-weight: 700;
    }
    .muted {
      color: var(--vx-text-muted);
    }
    .tableWrap {
      overflow-x: auto;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .table th,
    .table td {
      text-align: left;
      padding: var(--vx-space-2) var(--vx-space-3);
      border-bottom: 1px solid var(--vx-line);
    }
    .table th {
      font-size: 0.6875rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--vx-text-muted);
      font-weight: 600;
      white-space: nowrap;
    }
    .table tbody tr:hover {
      background: var(--vx-panel-2);
    }
    .right {
      text-align: right;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: var(--vx-space-3);
    }
    .form--tight {
      margin-top: var(--vx-space-3);
      padding-top: var(--vx-space-3);
      border-top: 1px solid var(--vx-line);
    }
    .row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: var(--vx-space-3);
      align-items: end;
    }
    .reads {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--vx-space-1);
      font-size: 0.8125rem;
    }
    .reads li {
      display: flex;
      gap: var(--vx-space-3);
      flex-wrap: wrap;
      padding: var(--vx-space-1) 0;
      border-bottom: 1px solid var(--vx-line);
      color: var(--vx-text-muted);
    }
  `,
})
export class AircraftCompliancePage {
  private readonly mro = inject(MroService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly base = inject(APP_BASE_PATH);

  protected readonly meterOptions = METER_OPTIONS;
  protected readonly data = signal<AircraftComplianceData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly receipt = signal<RecordComplianceDoneResponse | null>(null);
  protected readonly doneError = signal<string | null>(null);
  protected readonly readingError = signal<string | null>(null);
  protected readonly itemError = signal<string | null>(null);

  private readonly assessmentIndex = computed(() => {
    const map = new Map<string, ComplianceAssessment>();
    for (const item of this.data()?.assessment.items ?? []) {
      map.set(item.itemId, item);
    }
    return map;
  });

  protected readonly readingForm = this.fb.group({
    readingDate: this.fb.control(today(), [Validators.required]),
    airframe: this.fb.control<number | null>(null),
    tach: this.fb.control<number | null>(null),
    hobbs: this.fb.control<number | null>(null),
  });

  protected readonly doneForm = this.fb.group({
    complianceItemId: this.fb.control('', [Validators.required]),
    doneDate: this.fb.control(today(), [Validators.required]),
    doneHours: this.fb.control<number | null>(null),
    doneCycles: this.fb.control<number | null>(null),
  });

  protected readonly itemForm = this.fb.group({
    kind: this.fb.control('', [Validators.required]),
    label: this.fb.control('', [Validators.required]),
    intervalHours: this.fb.control<number | null>(null),
    meter: this.fb.control<Meter>('airframe'),
    lastDoneHours: this.fb.control<number | null>(null),
  });

  private aircraftId = '';

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('aircraftId');
      if (id) {
        this.aircraftId = id;
        this.load();
      }
    });

    this.doneForm.controls.complianceItemId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((itemId) => {
        const aircraft = this.data()?.aircraft;
        if (itemId && aircraft && this.doneForm.controls.doneHours.value === null) {
          this.doneForm.controls.doneHours.setValue(aircraft.totalHours);
        }
      });
  }

  protected h = hours;

  protected reload(): void {
    if (this.aircraftId) {
      this.load();
    }
  }

  protected rate(assessment: AircraftComplianceResponse): string {
    return assessment.utilization === null
      ? '--'
      : assessment.utilization.hoursPerDay.toFixed(2);
  }

  protected utilizationHint(assessment: AircraftComplianceResponse): string {
    const utilization = assessment.utilization;
    if (utilization === null) {
      return 'Sem amostras suficientes';
    }
    return `${utilization.sampleCount} leitura(s) · ${utilization.spanDays} dia(s) · confiança ${utilization.confidence}`;
  }

  protected urgencyOf(itemId: string): Urgency {
    return this.assessmentIndex().get(itemId)?.urgency ?? 'none';
  }

  protected dueText(itemId: string): string {
    return this.assessmentIndex().get(itemId)?.dueText ?? '--';
  }

  protected intervalText(item: ComplianceItemRecord): string {
    const parts: string[] = [];
    if (item.interval.hours !== null) {
      parts.push(`${item.interval.hours} h`);
    }
    if (item.interval.cycles !== null) {
      parts.push(`${item.interval.cycles} ciclos`);
    }
    if (item.interval.months !== null) {
      parts.push(`${item.interval.months} meses`);
    }
    return parts.length > 0 ? parts.join(' / ') : '--';
  }

  protected urgencyText(urgency: Urgency): string {
    switch (urgency) {
      case 'overdue':
        return 'Vencido';
      case 'due_soon':
        return 'A vencer';
      case 'upcoming':
        return 'Programado';
      default:
        return 'Sem prazo';
    }
  }

  protected urgencyTone(urgency: Urgency): 'critical' | 'warning' | 'ok' | 'neutral' {
    switch (urgency) {
      case 'overdue':
        return 'critical';
      case 'due_soon':
        return 'warning';
      case 'upcoming':
        return 'ok';
      default:
        return 'neutral';
    }
  }

  protected pick(item: ComplianceItemRecord): void {
    this.doneError.set(null);
    this.doneForm.controls.complianceItemId.setValue(item.id);
    const aircraft = this.data()?.aircraft;
    this.doneForm.controls.doneHours.setValue(aircraft ? aircraft.totalHours : null);
    this.doneForm.controls.doneCycles.setValue(null);
  }

  protected dismissReceipt(): void {
    this.receipt.set(null);
  }

  protected submitDone(): void {
    if (this.saving()) {
      return;
    }
    if (this.doneForm.invalid) {
      this.doneForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.doneError.set(null);
    const value = this.doneForm.getRawValue();

    this.mro
      .recordComplianceDone({
        complianceItemId: value.complianceItemId,
        doneDate: value.doneDate,
        doneHours: value.doneHours,
        doneCycles: value.doneCycles,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.saving.set(false);
          this.receipt.set(result);
          this.load();
        },
        error: (cause: unknown) => {
          this.saving.set(false);
          this.doneError.set(errorMessage(cause));
        },
      });
  }

  protected submitReading(): void {
    if (this.saving()) {
      return;
    }
    const value = this.readingForm.getRawValue();
    if (value.airframe === null && value.tach === null && value.hobbs === null) {
      this.readingError.set('Informe ao menos um medidor.');
      return;
    }
    this.saving.set(true);
    this.readingError.set(null);

    this.mro
      .recordMeterReading(this.aircraftId, value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.readingForm.patchValue({ airframe: null, tach: null, hobbs: null });
          this.load();
        },
        error: (cause: unknown) => {
          this.saving.set(false);
          this.readingError.set(errorMessage(cause));
        },
      });
  }

  protected submitItem(): void {
    if (this.saving()) {
      return;
    }
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.itemError.set(null);
    const value = this.itemForm.getRawValue();

    this.mro
      .createComplianceItem(this.aircraftId, {
        kind: value.kind.toUpperCase(),
        label: value.label,
        intervalHours: value.intervalHours,
        meter: value.intervalHours === null ? null : value.meter,
        lastDoneHours: value.lastDoneHours,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.itemForm.reset({
            kind: '',
            label: '',
            intervalHours: null,
            meter: 'airframe',
            lastDoneHours: null,
          });
          this.load();
        },
        error: (cause: unknown) => {
          this.saving.set(false);
          this.itemError.set(errorMessage(cause));
        },
      });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.mro
      .listAircraft()
      .pipe(
        switchMap((aircraft) => {
          const found = aircraft.find((item) => item.id === this.aircraftId);
          if (found === undefined) {
            return throwError(() => new Error('NOT_FOUND'));
          }
          return forkJoin({
            aircraft: of(found),
            assessment: this.mro.assessAircraft(found.id),
            items: this.mro.listComplianceItems(found.id),
            readings: this.mro.listMeterReadings(found.id),
          });
        }),
        map(
          (view): AircraftComplianceData => ({
            aircraft: view.aircraft,
            assessment: view.assessment,
            items: view.items,
            readings: [...view.readings].reverse(),
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (view) => {
          this.data.set(view);
          this.loading.set(false);
        },
        error: (cause: unknown) => {
          this.loading.set(false);
          this.error.set(
            cause instanceof Error && cause.message === 'NOT_FOUND'
              ? 'Aeronave nao encontrada no seu vinculo.'
              : errorMessage(cause),
          );
        },
      });
  }
}
