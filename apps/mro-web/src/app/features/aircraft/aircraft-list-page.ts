import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import type { AircraftRecord } from '@vortex/shared-dto';
import { APP_BASE_PATH, MroService } from '@vortex/core';
import { VxCard, VxEmptyState, VxLoading, VxPageHeader } from '@vortex/ui';
import { errorMessage, hours } from '../../shared/format';

/** Cadastro de aeronaves do vinculo. */
@Component({
  selector: 'vx-aircraft-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, RouterLink, VxCard, VxEmptyState, VxLoading, VxPageHeader],
  template: `
    <vx-page-header
      eyebrow="Frota"
      title="Aeronaves"
      subtitle="Registro do tenant e da empresa do seu v&iacute;nculo. Cada linha leva ao hist&oacute;rico de conformidade."
    />

    @if (loading()) {
      <vx-loading label="Carregando aeronaves" />
    } @else if (error(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (aircraft().length === 0) {
      <vx-empty-state
        title="Nenhuma aeronave cadastrada"
        message="Use 'Nova aeronave' no painel de conformidade para iniciar a frota."
      >
        <a mat-flat-button color="primary" [routerLink]="base + '/conformidade'"
          >Ir para conformidade</a
        >
      </vx-empty-state>
    } @else {
      <vx-card [heading]="aircraft().length + ' aeronave(s)'" hint="Somente leitura; a escrita gera bloco no ledger">
        <div class="tableWrap">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">Matr&iacute;cula</th>
                <th scope="col">Fabricante</th>
                <th scope="col">Modelo</th>
                <th scope="col">N&ordm; de s&eacute;rie</th>
                <th scope="col" class="num">Horas</th>
                <th scope="col" class="num">Ciclos</th>
                <th scope="col">Aeronavegabilidade</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              @for (item of aircraft(); track item.id) {
                <tr>
                  <td class="mono strong">{{ item.registration }}</td>
                  <td>{{ item.manufacturer }}</td>
                  <td>{{ item.model }}</td>
                  <td class="mono">{{ item.serialNumber ?? '--' }}</td>
                  <td class="num mono">{{ h(item.totalHours) }}</td>
                  <td class="num mono">{{ item.totalCycles }}</td>
                  <td>{{ item.airworthinessStatus }}</td>
                  <td class="right">
                    <a class="link" [routerLink]="[base + '/conformidade', item.id]">Conformidade</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </vx-card>
    }
  `,
  styles: `
    .error {
      margin: 0;
      padding: var(--vx-space-3);
      border-left: 3px solid var(--vx-overdue);
      background: var(--vx-overdue-bg);
      color: var(--vx-overdue);
      border-radius: var(--vx-radius-xs);
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
      white-space: nowrap;
    }
    .table th {
      font-size: 0.6875rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--vx-text-muted);
      font-weight: 600;
    }
    .table tbody tr:hover {
      background: var(--vx-panel-2);
    }
    .mono {
      font-family: var(--vx-font-mono);
      font-variant-numeric: tabular-nums;
    }
    .strong {
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .num {
      text-align: right;
    }
    .right {
      text-align: right;
    }
    .link {
      color: var(--vx-accent);
      text-decoration: none;
      font-weight: 600;
    }
    .link:hover {
      text-decoration: underline;
    }
  `,
})
export class AircraftListPage {
  private readonly mro = inject(MroService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly base = inject(APP_BASE_PATH);

  protected readonly aircraft = signal<readonly AircraftRecord[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.mro
      .listAircraft()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.aircraft.set(rows);
          this.loading.set(false);
        },
        error: (cause: unknown) => {
          this.loading.set(false);
          this.error.set(errorMessage(cause));
        },
      });
  }

  protected h = hours;
}
