import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VxCard, VxPageHeader } from '@vortex/ui';

interface FederatedApp {
  readonly name: string;
  readonly route: string | null;
  readonly scope: string;
  readonly description: string;
}

const APPS: readonly FederatedApp[] = [
  {
    name: 'ERP Manutenção',
    route: '/mro',
    scope: '43/145',
    description:
      'Biblioteca técnica, suprimentos, setor de registros e oficina em 12 etapas, federado de mro.vortex.com.',
  },
  {
    name: 'ERP Operadores',
    route: null,
    scope: '91/121/135/137',
    description: 'Operações e manutenção, despacho e diário técnico da aeronave.',
  },
  {
    name: 'ERP Cursos e Treinamentos',
    route: null,
    scope: '141/142/145-010',
    description: 'Catálogo de cursos vendido na RLoja, turmas, FSTD e certificados.',
  },
  {
    name: 'ERP Aeródromos',
    route: null,
    scope: '153',
    description: 'Pista/RWYCC, SESCINC, fauna/SIGRA, SGSO e infraestrutura.',
  },
];

/**
 * Portal da Shell: lista os MFEs disponiveis. Apps sem remote publicado
 * aparecem como planejados — a Shell nao finge um modulo que nao existe.
 */
@Component({
  selector: 'vx-portal-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, VxCard, VxPageHeader],
  template: `
    <vx-page-header
      eyebrow="Shell federada"
      title="Aplicativos"
      subtitle="Um unico acesso, um unico chrome. Cada ERP e carregado do seu subdominio em tempo de execucao."
    />

    <vx-card heading="Módulos" hint="Module Federation: o host não recompila quando um MFE publica">
      <ul class="apps">
        @for (app of apps; track app.name) {
          <li class="apps__item">
            <div class="apps__body">
              <div class="apps__head">
                <h3 class="apps__name">{{ app.name }}</h3>
                <span class="apps__scope">{{ app.scope }}</span>
              </div>
              <p class="apps__text">{{ app.description }}</p>
            </div>
            @if (app.route; as route) {
              <a class="apps__link" [routerLink]="route">Abrir</a>
            } @else {
              <span class="apps__pending">planejado</span>
            }
          </li>
        }
      </ul>
    </vx-card>
  `,
  styles: `
    .apps {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--vx-space-3);
    }
    .apps__item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--vx-space-4);
      padding: var(--vx-space-4);
      border: 1px solid var(--vx-line);
      border-radius: var(--vx-radius-sm);
      background: var(--vx-panel-2);
    }
    .apps__head {
      display: flex;
      align-items: baseline;
      gap: var(--vx-space-3);
    }
    .apps__name {
      margin: 0;
      font-size: 0.9375rem;
    }
    .apps__scope {
      font-family: var(--vx-font-mono);
      font-size: 0.6875rem;
      color: var(--vx-text-muted);
    }
    .apps__text {
      margin: var(--vx-space-2) 0 0;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--vx-text-muted);
      max-width: 68ch;
    }
    .apps__link {
      flex: 0 0 auto;
      padding: var(--vx-space-2) var(--vx-space-4);
      border-radius: var(--vx-radius-sm);
      background: var(--vx-accent);
      color: var(--vx-accent-ink);
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .apps__pending {
      flex: 0 0 auto;
      padding: var(--vx-space-2) var(--vx-space-4);
      border: 1px dashed var(--vx-line-strong);
      border-radius: var(--vx-radius-sm);
      font-size: 0.75rem;
      color: var(--vx-text-faint);
    }
  `,
})
export class PortalHomePage {
  protected readonly apps = APPS;
}
