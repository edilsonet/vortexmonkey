import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { type ShellNavLink, VortexShell } from '@vortex/shell';

const NAV: readonly ShellNavLink[] = [
  { label: 'Cockpit', link: '/app', exact: true },
  { label: 'Manutenção', link: '/app/mro' },
];

/** Chrome do cockpit logado (antes “Portal”). Landing e login não usam este shell. */
@Component({
  selector: 'vx-portal-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, VortexShell],
  template: `
    <vx-vortex-shell subtitle="Cockpit · app.vortex.com" brandLink="/app" [nav]="nav">
      <router-outlet />
    </vx-vortex-shell>
  `,
})
export class PortalShell {
  protected readonly nav: readonly ShellNavLink[] = NAV;
}
