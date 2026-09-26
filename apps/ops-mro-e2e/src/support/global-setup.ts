import { waitForPortOpen } from '@nx/node/utils';

/**
 * O servidor `ops-mro` deve estar em execucao (`nx serve ops-mro`). Este setup
 * apenas aguarda a porta ficar pronta antes dos testes.
 */
export default async function (): Promise<void> {
  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3400;
  await waitForPortOpen(port, { host });
}
