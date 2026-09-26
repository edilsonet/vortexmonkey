import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { type ShellNavLink, VortexShell } from '@vortex/shell';

const NAV: readonly ShellNavLink[] = [
  { label: 'Conformidade', link: '/conformidade' },
  { label: 'Aeronaves', link: '/aeronaves' },
];

/**
 * Shell do app standalone: envolve as rotas de dominio com o chrome
 * compartilhado (`@vortex/shell`). Quando o app roda como MFE, o chrome vem do
 * host e este componente nao entra em cena.
 */
@Component({
  selector: 'vx-mro-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, VortexShell],
  template: `
    <vx-vortex-shell
      subtitle="ERP Manuten&ccedil;&atilde;o &middot; 43/145"
      brandLink="/conformidade"
      [nav]="nav"
    >
      <router-outlet />
    </vx-vortex-shell>
  `,
})
export class MroShell {
  protected readonly nav = NAV;
}
