import type { Route } from '@angular/router';
import { APP_BASE_PATH, authGuard, guestGuard } from '@vortex/core';

/**
 * Rotas da Shell. O acesso e o chrome vem do host; cada MFE entra por
 * `loadChildren` federado, recebendo o proprio prefixo de montagem em
 * `APP_BASE_PATH` para que seus links internos resolvam sob o subcaminho.
 */
export const appRoutes: Route[] = [
  {
    path: 'entrar',
    title: 'Entrar · VORTEX',
    canActivate: [guestGuard],
    loadComponent: () => import('./layout/login-route').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/portal-shell').then((m) => m.PortalShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'VORTEX · Portal',
        loadComponent: () =>
          import('./features/portal/portal-home-page').then((m) => m.PortalHomePage),
      },
      {
        path: 'mro',
        providers: [{ provide: APP_BASE_PATH, useValue: '/mro' }],
        loadChildren: () => import('mro-web/Routes').then((m) => m.mroRoutes),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
