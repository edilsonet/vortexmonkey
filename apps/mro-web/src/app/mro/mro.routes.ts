import type { Route } from '@angular/router';

/**
 * Rotas do dominio Manutencao (43/145). Sao relativas de proposito: o app
 * standalone as monta na raiz e o host federado as monta sob `/mro`. Todo link
 * interno usa o prefixo `APP_BASE_PATH` para funcionar nos dois modos.
 */
export const mroRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'conformidade' },
  {
    path: 'conformidade',
    title: 'Conformidade · VORTEX',
    loadComponent: () =>
      import('../features/compliance/compliance-dashboard-page').then(
        (m) => m.ComplianceDashboardPage,
      ),
  },
  {
    path: 'conformidade/:aircraftId',
    title: 'Aeronave · VORTEX',
    loadComponent: () =>
      import('../features/compliance/aircraft-compliance-page').then(
        (m) => m.AircraftCompliancePage,
      ),
  },
  {
    path: 'aeronaves',
    title: 'Aeronaves · VORTEX',
    loadComponent: () =>
      import('../features/aircraft/aircraft-list-page').then((m) => m.AircraftListPage),
  },
];
