import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import type { AircraftRecord, Urgency, Utilization } from '@vortex/shared-dto';
import { APP_BASE_PATH, MroService } from '@vortex/core';
import {
  VxCard,
  VxEmptyState,
  VxLoading,
  VxMetricCard,
  VxPageHeader,
  VxUrgencyBadge,
} from '@vortex/ui';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { URGENCY_RANK, errorMessage, hours, worstOf } from '../../shared/format';

interface ComplianceCard {
  readonly aircraft: AircraftRecord;
  readonly worstUrgency: Urgency;
  readonly overdue: number;
  readonly dueSoon: number;
  readonly utilization: Utilization | null;
}

/**
 * Painel de conformidade: para cada aeronave do vinculo, a pior urgencia e as
 * contagens de itens vencidos / a vencer. Cada leitura vem de uma avaliacao
 * calculada no servidor — o frontend nao decide regra regulatoria.
 */
@Component({
  selector: 'vx-compliance-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
    VxCard,
    VxEmptyState,
    VxLoading,
    VxMetricCard,
    VxPageHeader,
    VxUrgencyBadge,
  ],
  template: `
    <vx-page-header
      eyebrow="ERP Manuten&ccedil;&atilde;o &middot; 43/145"
      title="Conformidade da frota"
      subtitle="Avalia&ccedil;&atilde;o de vencimentos calculada no servidor a partir das leituras e itens persistidos."
    >
      <button mat-stroked-button type="button" (click)="toggleForm()">
        {{ showForm() ? 'Fechar' : 'Nova aeronave' }}
      </button>
    </vx-page-header>

    @if (showForm()) {
      <div class="create">
        <vx-card heading="Cadastrar aeronave" hint="O cadastro gera bloco no ledger">
          <form class="create__form" [formGroup]="form" (ngSubmit)="create()">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Matr&iacute;cula</mat-label>
              <input matInput formControlName="registration" placeholder="PP-ABC" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Modelo</mat-label>
              <input matInput formControlName="model" placeholder="C172" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Fabricante</mat-label>
              <input matInput formControlName="manufacturer" placeholder="Cessna" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Horas totais</mat-label>
              <input matInput type="number" formControlName="totalHours" />
            </mat-form-field>
            <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
              Cadastrar
            </button>
          </form>
          @if (formError(); as message) {
            <p class="create__error" role="alert">{{ message }}</p>
          }
        </vx-card>
      </div>
    }

    <div class="metrics">
      <vx-metric-card label="Aeronaves" [value]="cards().length" />
      <vx-metric-card
        label="Itens vencidos"
        [value]="totals().overdue"
        tone="critical"
        hint="A&ccedil;&atilde;o imediata"
      />
      <vx-metric-card
        label="A vencer"
        [value]="totals().dueSoon"
        tone="warning"
        hint="Dentro dos limiares"
      />
      <vx-metric-card
        label="Itens monitorados"
        [value]="totals().items"
        tone="accent"
        hint="Somat&oacute;rio da frota"
      />
    </div>

    @if (loading()) {
      <vx-loading label="Avaliando a frota" />
    } @else if (error(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (cards().length === 0) {
      <vx-empty-state
        title="Nenhuma aeronave no seu v&iacute;nculo"
        message="Cadastre a primeira aeronave para iniciar o acompanhamento de conformidade."
      >
        <button mat-flat-button color="primary" type="button" (click)="toggleForm()">
          Nova aeronave
        </button>
      </vx-empty-state>
    } @else {
      <ul class="grid">
        @for (card of cards(); track card.aircraft.id) {
          <li class="grid__item" [class]="'grid__item--' + card.worstUrgency">
            <a class="ac" [routerLink]="[base + '/conformidade', card.aircraft.id]">
              <div class="ac__top">
                <span class="ac__reg">{{ card.aircraft.registration }}</span>
                <vx-urgency-badge [urgency]="card.worstUrgency" />
              </div>
              <p class="ac__model">
                {{ card.aircraft.manufacturer }} {{ card.aircraft.model }}
              </p>
              <dl class="ac__stats">
                <div>
                  <dt>Horas</dt>
                  <dd>{{ h(card.aircraft.totalHours) }}</dd>
                </div>
                <div>
                  <dt>Ciclos</dt>
                  <dd>{{ card.aircraft.totalCycles }}</dd>
                </div>
                <div>
                  <dt>h/dia</dt>
                  <dd>{{ rate(card.utilization) }}</dd>
                </div>
                <div>
                  <dt>Vencidos</dt>
                  <dd>{{ card.overdue }}</dd>
                </div>
              </dl>
            </a>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .create {
      margin-bottom: var(--vx-space-4);
    }
    .create__form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--vx-space-3);
      align-items: end;
    }
    .create__error,
    .error {
      margin: var(--vx-space-3) 0 0;
      padding: var(--vx-space-2) var(--vx-space-3);
      border-left: 3px solid var(--vx-overdue);
      background: var(--vx-overdue-bg);
      color: var(--vx-overdue);
      font-size: 0.8125rem;
      border-radius: var(--vx-radius-xs);
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: var(--vx-space-3);
      margin-bottom: var(--vx-space-5);
    }
    .grid {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--vx-space-4);
    }
    .grid__item {
      border-left: 3px solid var(--vx-line-strong);
      border-radius: var(--vx-radius-lg);
    }
    .grid__item--overdue {
      border-left-color: var(--vx-overdue);
    }
    .grid__item--due_soon {
      border-left-color: var(--vx-due-soon);
    }
    .grid__item--upcoming {
      border-left-color: var(--vx-upcoming);
    }
    .ac {
      display: block;
      height: 100%;
      padding: var(--vx-space-4);
      text-decoration: none;
      color: inherit;
      background: var(--vx-panel);
      border: 1px solid var(--vx-line);
      border-left: none;
      border-radius: 0 var(--vx-radius-lg) var(--vx-radius-lg) 0;
      box-shadow: var(--vx-shadow-1);
    }
    .ac:hover {
      border-color: var(--vx-accent);
    }
    .ac__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--vx-space-2);
    }
    .ac__reg {
      font-family: var(--vx-font-mono);
      font-size: 1.125rem;
      font-weight: 700;
      letter-spacing: 0.06em;
    }
    .ac__model {
      margin: var(--vx-space-1) 0 var(--vx-space-3);
      font-size: 0.8125rem;
      color: var(--vx-text-muted);
    }
    .ac__stats {
      margin: 0;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--vx-space-2) var(--vx-space-3);
    }
    .ac__stats dt {
      font-size: 0.6875rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--vx-text-faint);
    }
    .ac__stats dd {
      margin: 0;
      font-family: var(--vx-font-mono);
      font-variant-numeric: tabular-nums;
      font-size: 0.9375rem;
    }
  `,
})
export class ComplianceDashboardPage {
  private readonly mro = inject(MroService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly base = inject(APP_BASE_PATH);

  protected readonly cards = signal<readonly ComplianceCard[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly totals = computed(() => {
    const cards = this.cards();
    return {
      overdue: cards.reduce((sum, card) => sum + card.overdue, 0),
      dueSoon: cards.reduce((sum, card) => sum + card.dueSoon, 0),
      items: cards.reduce((sum, card) => sum + card.overdue + card.dueSoon, 0),
    };
  });

  protected readonly form = this.fb.group({
    registration: this.fb.control('', [
      Validators.required,
      Validators.pattern(/^[A-Za-z0-9-]{4,10}$/),
    ]),
    model: this.fb.control('', [Validators.required]),
    manufacturer: this.fb.control('', [Validators.required]),
    totalHours: this.fb.control(0, [Validators.min(0)]),
  });

  constructor() {
    this.load();
  }

  protected h = hours;

  protected rate(utilization: Utilization | null): string {
    return utilization === null ? '--' : utilization.hoursPerDay.toFixed(2);
  }

  protected toggleForm(): void {
    this.formError.set(null);
    this.showForm.update((open) => !open);
  }

  protected create(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    const value = this.form.getRawValue();

    this.mro
      .createAircraft({
        registration: value.registration.toUpperCase(),
        model: value.model,
        manufacturer: value.manufacturer,
        totalHours: value.totalHours,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showForm.set(false);
          this.form.reset({ registration: '', model: '', manufacturer: '', totalHours: 0 });
          this.load();
        },
        error: (cause: unknown) => {
          this.saving.set(false);
          this.formError.set(errorMessage(cause));
        },
      });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.mro
      .listAircraft()
      .pipe(
        switchMap((aircraft) =>
          aircraft.length === 0
            ? of<ComplianceCard[]>([])
            : forkJoin(aircraft.map((item) => this.assess(item))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (cards) => {
          this.cards.set(sortCards(cards));
          this.loading.set(false);
        },
        error: (cause: unknown) => {
          this.loading.set(false);
          this.error.set(errorMessage(cause));
        },
      });
  }

  private assess(aircraft: AircraftRecord): Observable<ComplianceCard> {
    return this.mro.assessAircraft(aircraft.id).pipe(
      map((assessment) => {
        const urgencies = assessment.items.map((item) => item.urgency);
        return {
          aircraft,
          worstUrgency: worstOf(urgencies),
          overdue: urgencies.filter((urgency) => urgency === 'overdue').length,
          dueSoon: urgencies.filter((urgency) => urgency === 'due_soon').length,
          utilization: assessment.utilization,
        } satisfies ComplianceCard;
      }),
      catchError(() =>
        of({
          aircraft,
          worstUrgency: 'none' as Urgency,
          overdue: 0,
          dueSoon: 0,
          utilization: null,
        } satisfies ComplianceCard),
      ),
    );
  }
}

function sortCards(cards: readonly ComplianceCard[]): ComplianceCard[] {
  return [...cards].sort((a, b) => {
    const urgency = URGENCY_RANK[b.worstUrgency] - URGENCY_RANK[a.worstUrgency];
    return urgency !== 0 ? urgency : a.aircraft.registration.localeCompare(b.aircraft.registration);
  });
}
