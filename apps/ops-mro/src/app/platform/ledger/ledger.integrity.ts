import { createHash } from 'node:crypto';

/**
 * Serializacao canonica e estavel: chaves de objeto ordenadas e recursivas.
 * O hash do bloco depende disso; qualquer divergencia de ordem quebraria a
 * cadeia sem que o conteudo tivesse mudado.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(',')}}`;
}

/** Conteudo canonico do bloco: e exatamente o que entra no SHA-256. */
export const canonicalLedgerBlock = (
  previousHash: string,
  entityType: string,
  entityId: string,
  actionType: string,
  payload: unknown,
): string => [previousHash, entityType, entityId, actionType, stableStringify(payload)].join('|');

export const blockHash = (
  previousHash: string,
  entityType: string,
  entityId: string,
  actionType: string,
  payload: unknown,
): string =>
  createHash('sha256')
    .update(canonicalLedgerBlock(previousHash, entityType, entityId, actionType, payload))
    .digest('hex');

export const GENESIS_HASH = '0'.repeat(64);
