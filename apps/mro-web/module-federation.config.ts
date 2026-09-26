import type { ModuleFederationConfig } from '@nx/module-federation';

/**
 * `mro-web` como remote federado do ERP Manutencao.
 *
 * Expoe apenas as rotas de dominio (`./Routes`). O chrome da Shell vem do host
 * (ou do `mro-shell` quando roda standalone) — assim o mesmo modulo serve ao
 * subdominio `mro.vortex.com` e ao host `app.vortex.com`.
 *
 * `name` e o nome do projeto no Nx (exigencia do plugin); o container federado
 * sai como `mro_web` (nome normalizado).
 */
const config: ModuleFederationConfig = {
  name: 'mro-web',
  exposes: {
    './Routes': 'apps/mro-web/src/app/mro/mro.routes.ts',
  },
};

export default config;
