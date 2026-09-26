import { InjectionToken } from '@angular/core';

/** Configuracao do nucleo compartilhado do frontend VORTEX. */
export interface VortexCoreConfig {
  /**
   * Raiz da API. Em desenvolvimento o dev-server faz proxy de `/api` para o
   * `ops-mro` (porta 3400); em producao o mesmo prefixo e servido pelo gateway.
   */
  readonly apiBaseUrl: string;
  /** Chave de `localStorage` da sessao. */
  readonly storageKey?: string;
}

export const VORTEX_CORE_CONFIG = new InjectionToken<VortexCoreConfig>('VORTEX_CORE_CONFIG');

/**
 * Prefixo de montagem quando o app roda como MFE federado dentro de um host
 * (ex.: `/mro`). Vazio quando roda standalone na raiz. Os links internos do app
 * sao construidos sobre esse prefixo para que o mesmo build sirva aos dois
 * modos (raiz propria ou subcaminho do host).
 */
export const APP_BASE_PATH = new InjectionToken<string>('APP_BASE_PATH', {
  providedIn: 'root',
  factory: () => '',
});
