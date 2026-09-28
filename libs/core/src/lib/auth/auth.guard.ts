import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { SessionStore } from './session.store';

/** Bloqueia rota protegida quando nao ha sessao valida. */
export const authGuard: CanActivateFn = (_route, state) => {
  const store = inject(SessionStore);
  if (store.isAuthenticated()) {
    return true;
  }
  return inject(Router).createUrlTree(['/entrar'], {
    queryParams: { redirectTo: state.url },
  });
};

/** Mantem o usuario autenticado fora da tela de login (host leva ao cockpit). */
export const guestGuard: CanActivateFn = () => {
  if (inject(SessionStore).isAuthenticated()) {
    return inject(Router).createUrlTree(['/']);
  }
  return true;
};
