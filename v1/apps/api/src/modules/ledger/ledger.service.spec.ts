import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { stableStringify } from '@vortex/utils';
import { canonicalLedgerBlock, createMerkleProof, reconstructEntity, verifyLedgerRows, type LedgerRow } from './ledger.service';

const signedRow = (payload: unknown): { row: LedgerRow; publicKey: ReturnType<typeof generateKeyPairSync>['publicKey'] } => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const previousHash = '0'.repeat(64);
  const hash = createHash('sha256').update(canonicalLedgerBlock(previousHash, 'PROTOCOL', '10000000-0000-4000-8000-000000000001', 'INSERT', payload)).digest('hex');
  return {
    publicKey,
    row: {
      id: '10000000-0000-4000-8000-000000000002', version: 1, previous_hash: previousHash, hash,
      timestamp: new Date('2026-09-05T00:00:00Z'), tenant_id: '10000000-0000-4000-8000-000000000003',
      user_id: '10000000-0000-4000-8000-000000000004', company_id: null, entity_type: 'PROTOCOL',
      entity_id: '10000000-0000-4000-8000-000000000001', action_type: 'INSERT', payload, changes: null,
      created_by: '10000000-0000-4000-8000-000000000004', signature: sign(null, Buffer.from(hash, 'hex'), privateKey).toString('base64'),
    },
  };
};

describe('ledger da Fase 2', () => {
  it('retorna TAMPERED e o primeiro bloco violado quando o payload muda', () => {
    const signed = signedRow({ status: 'OPEN' });
    expect(verifyLedgerRows([signed.row], signed.publicKey)).toMatchObject({ valid: true, status: 'VALID' });
    const tampered = { ...signed.row, payload: { status: 'CLOSED' } };
    expect(verifyLedgerRows([tampered], signed.publicKey)).toMatchObject({ valid: false, status: 'TAMPERED', firstBrokenBlock: signed.row.id });
  });

  it('verifica a cadeia pela relação de hashes, não pela ordem física', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const first = signedRow({ order: 1 }).row;
    first.signature = sign(null, Buffer.from(first.hash, 'hex'), privateKey).toString('base64');
    const secondHash = createHash('sha256').update(canonicalLedgerBlock(first.hash, 'PROTOCOL', first.entity_id, 'STATUS_CHANGE', { order: 2 })).digest('hex');
    const second = { ...first, id: '10000000-0000-4000-8000-000000000009', previous_hash: first.hash, hash: secondHash, action_type: 'STATUS_CHANGE', payload: { order: 2 }, signature: sign(null, Buffer.from(secondHash, 'hex'), privateKey).toString('base64') };
    expect(verifyLedgerRows([second, first], publicKey)).toMatchObject({ valid: true, totalBlocks: 2, lastHash: secondHash });
  });

  it('reconstrói a evolução da entidade a partir de INSERT e changes', () => {
    const initial = signedRow({ status: 'OPEN', nested: { value: 1 } }).row;
    const changed = { ...initial, action_type: 'STATUS_CHANGE', payload: {}, changes: [{ field_path: 'status', old_value: 'OPEN', new_value: 'CLOSED' }, { field_path: 'nested.value', old_value: 1, new_value: 2 }] };
    expect(reconstructEntity([initial, changed])).toEqual({ status: 'CLOSED', nested: { value: 2 } });
  });

  it('gera raiz e prova Merkle determinísticas', () => {
    const rows = [{ id: 'a', hash: createHash('sha256').update('a').digest('hex') }, { id: 'b', hash: createHash('sha256').update('b').digest('hex') }, { id: 'c', hash: createHash('sha256').update('c').digest('hex') }];
    const first = createMerkleProof(rows);
    const second = createMerkleProof(rows);
    expect(stableStringify(first)).toBe(stableStringify(second));
    expect(first.rootHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.leaves.every((leaf) => leaf.proof.length === 2)).toBe(true);
  });
});
