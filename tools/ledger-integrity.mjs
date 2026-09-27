/**
 * Integridade do ledger em JS puro (sem build) para os runners de `tools/`.
 *
 * Os runners (`migrate`, `seed`, `bootstrap-admin`) rodam direto no Node, sem
 * passar pelo bundle do NestJS, entao nao podem importar
 * `apps/ops-mro/src/app/platform/ledger/ledger.integrity.ts`. As funcoes aqui
 * sao a COPIA FIEL daquele modulo: a serializacao canonica e o SHA-256 do bloco
 * precisam ser identicos, senao o bloco gravado pelo runner nao seria
 * reconstruivel por `LedgerService.verifyChain`.
 *
 * O teste `ledger.integrity.spec.ts` garante a paridade; qualquer mudanca aqui
 * deve vir acompanhada da mesma mudanca no modulo TS (e vice-versa).
 */
import { createHash } from 'node:crypto';

/** Serializacao canonica e estavel: chaves de objeto ordenadas e recursivas. */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(',')}}`;
}

/** Conteudo canonico do bloco: o que entra no SHA-256. */
export const canonicalLedgerBlock = (previousHash, entityType, entityId, actionType, payload) =>
  [previousHash, entityType, entityId, actionType, stableStringify(payload)].join('|');

export const blockHash = (previousHash, entityType, entityId, actionType, payload) =>
  createHash('sha256')
    .update(canonicalLedgerBlock(previousHash, entityType, entityId, actionType, payload))
    .digest('hex');

export const GENESIS_HASH = '0'.repeat(64);
