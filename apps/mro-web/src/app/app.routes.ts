import type { Route } from '@angular/router';
import { authGuard, guestGuard } from '@vortex/core';
import { mroRoutes } from './mro/mro.routes';

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
    loadComponent: () => import('./layout/mro-shell').then((m) => m.MroShell),
    children: mroRoutes,
  },
  { path: '**', redirectTo: '' },
];
