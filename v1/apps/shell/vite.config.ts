import { federation } from '@module-federation/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss(), federation({
    name: 'vortex_shell',
    remotes: {
      rconta: { type: 'module', name: 'rconta', entry: 'http://rconta.vortex.localhost:8080/remotes/rconta/remoteEntry.js' },
      catalogo: { type: 'module', name: 'catalogo', entry: 'http://catalogo.vortex.localhost:8080/remotes/catalogo/remoteEntry.js' },
      rloja: { type: 'module', name: 'rloja', entry: 'http://market.vortex.localhost:8080/remotes/rloja/remoteEntry.js' },
      recrutamento: { type: 'module', name: 'recrutamento', entry: 'http://recruta.vortex.localhost:8080/remotes/recrutamento/remoteEntry.js' },
      mro: { type: 'module', name: 'mro', entry: 'http://mro.vortex.localhost:8080/remotes/mro/remoteEntry.js' },
      ops: { type: 'module', name: 'ops', entry: 'http://ops.vortex.localhost:8080/remotes/ops/remoteEntry.js' },
      training: { type: 'module', name: 'training', entry: 'http://training.vortex.localhost:8080/remotes/training/remoteEntry.js' },
      airport: { type: 'module', name: 'airport', entry: 'http://airport.vortex.localhost:8080/remotes/airport/remoteEntry.js' },
    },
    shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
  })],
  server: { port: 5100, host: '0.0.0.0' },
  build: { target: 'chrome89' },
});
