import type { ModuleFederationConfig } from '@nx/module-federation';

/**
 * `shell-web` e o host federado do VORTEX (`app.vortex.com`).
 *
 * Ele proprio o chrome da Shell (`@vortex/shell`) e monta os MFEs dos dominios
 * em subcaminhos. Em producao cada remote aponta para o seu subdominio — ver
 * `webpack.prod.config.ts`. Em desenvolvimento o Nx resolve as portas locais.
 */
const config: ModuleFederationConfig = {
  name: 'shell-web',
  remotes: ['mro-web'],
};

export default config;
