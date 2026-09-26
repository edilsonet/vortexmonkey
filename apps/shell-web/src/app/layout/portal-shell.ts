import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { type ShellNavLink, VortexShell } from '@vortex/shell';

const NAV: readonly ShellNavLink[] = [
  { label: 'Portal', link: '/', exact: true },
  { label: 'Manutenção', link: '/mro' },
];

/** Chrome da Shell do host, com a navegacao entre os MFEs federados. */
@Component({
  selector: 'vx-portal-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, VortexShell],
  template: `
    <vx-vortex-shell subtitle="Shell federada &middot; subdom&iacute;nios" [nav]="nav">
      <router-outlet />
    </vx-vortex-shell>
  `,
})
export class PortalShell {
  protected readonly nav = NAV;
}
