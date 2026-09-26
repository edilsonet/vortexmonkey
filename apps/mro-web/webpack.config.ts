import { withModuleFederation } from '@nx/module-federation/angular';
import type { Configuration } from 'webpack';
import config from './module-federation.config';

const applyModuleFederation = withModuleFederation(config, { dts: false });

/**
 * Mesmo ajuste do host: no serve standalone o MFE roda na raiz do proprio
 * subdominio e `publicPath: 'auto'` gera `import.meta` em `styles.js` (script
 * classico). O build dos remotes estaticos roda com `WEBPACK_SERVE=false` e
 * mantem `auto`, resolvendo cada chunk pelo `remoteEntry.mjs` carregado pelo
 * host.
 */
export default async (webpackConfig: Configuration): Promise<Configuration> => {
  const resolved = await applyModuleFederation;
  const result = (await resolved(webpackConfig)) as Configuration;
  if (process.env.WEBPACK_SERVE !== 'false') {
    result.output = { ...result.output, publicPath: '/' };
  }
  return result;
};
