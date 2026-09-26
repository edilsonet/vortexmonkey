import { withModuleFederation } from '@nx/module-federation/angular';

/**
 * Remotes de producao: cada MFE publicado no proprio subdominio.
 * O host nao precisa ser reconstruido quando um MFE sobe uma nova versao.
 */
export default withModuleFederation(
  {
    name: 'shell-web',
    remotes: [['mro-web', 'https://mro.vortex.com']],
  },
  { dts: false },
);
