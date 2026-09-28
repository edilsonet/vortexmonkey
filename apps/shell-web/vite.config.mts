/// <reference types='vitest' />
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

/**
 * Em testes nao existe Module Federation: o specifier `mro-web/Routes` usado no
 * `loadChildren` do host precisa ser mapeado para o arquivo real das rotas do
 * remote. Sem isso o `import()` do router resolve para um modulo vazio e o
 * TestBed quebra ao compilar `undefined`.
 *
 * `enforce: 'pre'` garante que o hook rode antes do resolver do Vite, cobrindo
 * tambem o `import()` dinamico escrito dentro de `app.routes.ts`.
 * Este arquivo so e carregado pelo target `test`.
 */
const mroRoutesAlias: Plugin = {
  name: 'vx-mro-routes-alias',
  enforce: 'pre',
  resolveId(id: string) {
    if (id === 'mro-web/Routes') {
      return resolve(__dirname, '../mro-web/src/app/mro/mro.routes.ts');
    }
    return null;
  },
};

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/shell-web',
  plugins: [
    mroRoutesAlias,
    // `tsconfig.vitest.json` estende o do spec e AINDA inclui as fontes do
    // remote: o compilador do @analogjs emite modulo vazio para arquivos que
    // nao estao no program dele.
    angular({ tsconfig: 'tsconfig.vitest.json' }),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
  ],
  test: {
    name: 'shell-web',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/shell-web',
      provider: 'v8' as const,
    },
  },
}));
