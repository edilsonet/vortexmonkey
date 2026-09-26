import { federation } from '@module-federation/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
export default defineConfig({
  base: '/remotes/mro/',
  plugins: [react(), tailwindcss(), federation({ name: 'mro', filename: 'remoteEntry.js', exposes: { './App': './src/App.tsx' }, shared: { react: { singleton: true }, 'react-dom': { singleton: true } } })],
  server: { port: 5105, host: '0.0.0.0' }, build: { target: 'chrome89' },
});
