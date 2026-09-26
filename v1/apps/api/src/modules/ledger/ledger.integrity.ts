import { createHash, verify as verifySignature, type KeyLike } from 'node:crypto';
import { stableStringify } from '@vortex/utils';

export interface LedgerRow {
  id: string;
  version: number;
  previous_hash: string;
  hash: string;
  timestamp: Date | string;
  tenant_id: string;
  user_id: string;
  company_id: string | null;
  entity_type: string;
  entity_id: string;
  action_type: string;
  payload: unknown;
  changes: unknown;
  created_by: string;
  signature: string;
}

export interface LedgerVerification {
  valid: boolean;
  status: 'VALID' | 'TAMPERED';
  blocks: number;
  totalBlocks: number;
  firstBrokenBlock: string | null;
  first_broken_block: string | null;
  lastHash: string;
  issues: string[];
}

export interface FieldChange { field_path: string; old_value: unknown; new_value: unknown }

export const canonicalLedgerBlock = (previousHash: string, entityType: string, entityId: string, actionType: string, payload: unknown): string =>
  [previousHash, entityType, entityId, actionType, stableStringify(payload)].join('|');

export const verifyLedgerRows = (rows: readonly LedgerRow[], publicKey: KeyLike): LedgerVerification => {
  const children = new Map<string, LedgerRow[]>();
  for (const row of rows) children.set(row.previous_hash, [...(children.get(row.previous_hash) ?? []), row]);
  const visited = new Set<string>();
  const issues: string[] = [];
  let expectedPrevious = '0'.repeat(64);
  let firstBrokenBlock: string | null = null;

  while (visited.size < rows.length) {
    const candidates = (children.get(expectedPrevious) ?? []).filter((row) => !visited.has(row.id));
    if (candidates.length !== 1) {
      const affected = candidates[0]?.id ?? rows.find((row) => !visited.has(row.id))?.id ?? null;
      if (!firstBrokenBlock) firstBrokenBlock = affected;
      issues.push(candidates.length > 1 ? `${affected ?? 'unknown'}: bifurcação da cadeia` : `${affected ?? 'unknown'}: bloco desconectado`);
      break;
    }
    const block = candidates[0]!;
    const recomputed = createHash('sha256').update(canonicalLedgerBlock(block.previous_hash, block.entity_type, block.entity_id, block.action_type, block.payload)).digest('hex');
    const blockIssues: string[] = [];
    if (block.hash !== recomputed) blockIssues.push('hash divergente');
    if (!verifySignature(null, Buffer.from(block.hash, 'hex'), publicKey, Buffer.from(block.signature, 'base64'))) blockIssues.push('assinatura Ed25519 inválida');
    if (blockIssues.length && !firstBrokenBlock) firstBrokenBlock = block.id;
    issues.push(...blockIssues.map((issue) => `${block.id}: ${issue}`));
    visited.add(block.id);
    expectedPrevious = block.hash;
  }

  return {
    valid: issues.length === 0 && visited.size === rows.length,
    status: issues.length === 0 && visited.size === rows.length ? 'VALID' : 'TAMPERED',
    blocks: rows.length,
    totalBlocks: rows.length,
    firstBrokenBlock,
    first_broken_block: firstBrokenBlock,
    lastHash: expectedPrevious,
    issues,
  };
};

export const reconstructEntity = (events: readonly Pick<LedgerRow, 'action_type' | 'payload' | 'changes'>[]): Record<string, unknown> => {
  const state: Record<string, unknown> = {};
  for (const event of events) {
    if (event.action_type === 'INSERT' && isRecord(event.payload)) Object.assign(state, event.payload);
    const changes = Array.isArray(event.changes) ? event.changes.filter(isFieldChange) : [];
    for (const change of changes) setAtPath(state, change.field_path, change.new_value);
  }
  return state;
};

export const createMerkleProof = (rows: readonly { id: string; hash: string }[]) => {
  const empty = createHash('sha256').update('').digest('hex');
  if (!rows.length) return { rootHash: empty, leaves: [] as Array<{ blockId: string; hash: string; proof: Array<{ position: 'LEFT' | 'RIGHT'; hash: string }> }> };
  const proofs = rows.map(() => [] as Array<{ position: 'LEFT' | 'RIGHT'; hash: string }>);
  let level = rows.map((row, index) => ({ hash: row.hash, members: [index] }));
  while (level.length > 1) {
    const next: typeof level = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index]!;
      const right = level[index + 1] ?? left;
      for (const member of left.members) proofs[member]!.push({ position: 'RIGHT', hash: right.hash });
      for (const member of right.members) if (right !== left) proofs[member]!.push({ position: 'LEFT', hash: left.hash });
      next.push({
        hash: createHash('sha256').update(Buffer.concat([Buffer.from(left.hash, 'hex'), Buffer.from(right.hash, 'hex')])).digest('hex'),
        members: right === left ? [...left.members] : [...left.members, ...right.members],
      });
    }
    level = next;
  }
  return { rootHash: level[0]!.hash, leaves: rows.map((row, index) => ({ blockId: row.id, hash: row.hash, proof: proofs[index]! })) };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isFieldChange = (value: unknown): value is FieldChange => isRecord(value) && typeof value.field_path === 'string' && 'new_value' in value;
const setAtPath = (root: Record<string, unknown>, path: string, value: unknown): void => {
  const parts = path.split('.').filter(Boolean);
  if (!parts.length) return;
  let target = root;
  for (const part of parts.slice(0, -1)) {
    if (!isRecord(target[part])) target[part] = {};
    target = target[part] as Record<string, unknown>;
  }
  target[parts.at(-1)!] = value;
};
