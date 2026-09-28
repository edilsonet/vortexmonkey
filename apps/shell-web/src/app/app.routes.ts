import type { Route } from '@angular/router';
import { APP_BASE_PATH, authGuard, guestGuard } from '@vortex/core';

/**
 * Rotas da Shell.
 *
 * "/" é a vitrine pública (Cosmic landing) — sem guard. O cockpit e a
 * conformidade vivem sob "/app" protegidos por JWT. Cada MFE entra por
 * `loadChildren` federado e recebe o prefixo de montagem em `APP_BASE_PATH`
 * para que seus links internos resolvam sob o subcaminho correto.
 */
export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    title: 'VORTEX · Conformidade que não apaga',
    loadComponent: () =>
      import('./features/landing/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'entrar',
    title: 'Entrar · VORTEX',
    canActivate: [guestGuard],
    loadComponent: () => import('./layout/login-route').then((m) => m.LoginPage),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/portal-shell').then((m) => m.PortalShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'VORTEX · Cockpit',
        loadComponent: () =>
          import('./features/portal/portal-dashboard-page').then((m) => m.PortalDashboardPage),
      },
      {
        path: 'mro',
        providers: [{ provide: APP_BASE_PATH, useValue: '/app/mro' }],
        loadChildren: () => import('mro-web/Routes').then((m) => m.mroRoutes),
      },
    ],
  },
  // Compat: quem acessava "/mro" direto vai para o novo prefixo dentro do cockpit
  { path: 'mro', redirectTo: 'app/mro' },
  { path: '**', redirectTo: '' },
];
