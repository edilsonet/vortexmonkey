import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { vortexAuthInterceptor } from './auth/auth.interceptor';
import { VORTEX_CORE_CONFIG, type VortexCoreConfig } from './config';

/**
 * Providers do nucleo do frontend. Registra o `HttpClient` com o interceptor de
 * credencial/idempotencia e publica a configuracao da API.
 *
 *   providers: [provideVortexCore({ apiBaseUrl: '/api' })]
 */
export function provideVortexCore(config: VortexCoreConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(withInterceptors([vortexAuthInterceptor])),
    { provide: VORTEX_CORE_CONFIG, useValue: config },
  ]);
}
