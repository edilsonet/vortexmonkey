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
 *
 * O `historyApiFallback` e reativado com `index` para o SPA servir a landing
 * (`/`), o login (`/entrar`) e o cockpit (`/app`) direto do dev-server do
 * Module Federation — sem ele, rotas do Angular devolvem `Cannot GET /x`.
 *
 * O `allowedHosts: 'all'` e necessario porque o preview/degustacao acessa o
 * dev-server por tunel (dominio variavel, ex. `*.e2b.app`); com a lista fixa
 * o webpack devolve `403 Invalid Host header` aesses hosts.
 */
export default async (webpackConfig: Configuration): Promise<Configuration> => {
  const resolved = await applyModuleFederation;
  const result = (await resolved(webpackConfig)) as Configuration;
  if (process.env.WEBPACK_SERVE !== 'false') {
    result.output = { ...result.output, publicPath: '/' };
    result.devServer = {
      ...result.devServer,
      historyApiFallback: { index: '/', disableDotRule: true },
      allowedHosts: 'all',
    };
  }
  return result;
};
