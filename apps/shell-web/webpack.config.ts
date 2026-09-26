import { withModuleFederation } from '@nx/module-federation/angular';
import type { Configuration } from 'webpack';
import config from './module-federation.config';

const applyModuleFederation = withModuleFederation(config, { dts: false });

/**
 * O host roda na raiz do proprio subdominio. O helper do Nx fixa
 * `publicPath: 'auto'`, que injeta `import.meta.url` no runtime; o dev-server
 * carrega `runtime.js`/`styles.js` como scripts classicos e o parse quebra.
 * Fixar a raiz elimina o `import.meta` sem afetar os chunks do host.
 * O build dos remotes estaticos roda com `WEBPACK_SERVE=false`; nesse caso
 * mantemos `auto` para os chunks resolverem pelo `remoteEntry.mjs`.
 */
export default async (webpackConfig: Configuration): Promise<Configuration> => {
  const resolved = await applyModuleFederation;
  const result = (await resolved(webpackConfig)) as Configuration;
  if (process.env.WEBPACK_SERVE !== 'false') {
    result.output = { ...result.output, publicPath: '/' };
  }
  return result;
};
