// @ts-expect-error O runner de `tools/` e JS puro, sem declaracao de tipos.
// eslint-disable-next-line @nx/enforce-module-boundaries
import * as tool from '../../../../../../tools/ledger-integrity.mjs';
import { GENESIS_HASH, blockHash, canonicalLedgerBlock, stableStringify } from './ledger.integrity';

/**
 * Paridade entre o modulo TS (usado pela API) e a copia `.mjs` (usada pelos
 * runners de `tools/`). Se os dois divergirem, um bloco gravado pelo bootstrap
 * nao seria reconstruivel por `LedgerService.verifyChain` - quebra de cadeia.
 */
describe('ledger.integrity (paridade TS <-> tools/ledger-integrity.mjs)', () => {
  const fixtures: readonly unknown[] = [
    null,
    0,
    'texto',
    { b: 1, a: [2, { d: undefined, c: true }] },
    { email: 'admin@vortex.com', tenantName: 'VORTEX', tenantType: 'MANUTENCAO' },
    [{ z: null }, { A: 'maiuscula', a: 'minuscula' }],
  ];

  it('serializa de forma canonica identica', () => {
    for (const fixture of fixtures) {
      expect(tool.stableStringify(fixture)).toBe(stableStringify(fixture));
    }
  });

  it('calcula o mesmo conteudo canonico e o mesmo hash', () => {
    const previous = 'a'.repeat(64);
    for (const fixture of fixtures) {
      expect(tool.canonicalLedgerBlock(previous, 'identity.users', 'id-1', 'ACTION', fixture)).toBe(
        canonicalLedgerBlock(previous, 'identity.users', 'id-1', 'ACTION', fixture),
      );
      expect(tool.blockHash(previous, 'identity.users', 'id-1', 'ACTION', fixture)).toBe(
        blockHash(previous, 'identity.users', 'id-1', 'ACTION', fixture),
      );
    }
  });

  it('compartilha o hash genesis', () => {
    expect(tool.GENESIS_HASH).toBe(GENESIS_HASH);
    expect(GENESIS_HASH).toBe('0'.repeat(64));
  });
});
