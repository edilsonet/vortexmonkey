export const TOX_VALIDITY_DAYS = 90;
export const MIN_ANNUAL_COVERAGE = 0.25;

export function toxValidUntil(collectedAt: Date, now = collectedAt): { validUntil: Date; expired: boolean } {
  const validUntil = new Date(collectedAt.getTime());
  validUntil.setUTCDate(validUntil.getUTCDate() + TOX_VALIDITY_DAYS);
  return { validUntil, expired: now.getTime() > validUntil.getTime() };
}

export function sampleSize(poolSize: number, minCoverage = MIN_ANNUAL_COVERAGE): number {
  if (poolSize <= 0) return 0;
  return Math.max(1, Math.ceil(poolSize * minCoverage));
}

export function coverage(drawn: number, poolSize: number): number {
  if (poolSize <= 0) return 0;
  return Number((drawn / poolSize).toFixed(4));
}

export function assertCoverage(drawn: number, poolSize: number): void {
  if (coverage(drawn, poolSize) < MIN_ANNUAL_COVERAGE) {
    throw new Error("Sorteio PPSP exige cobertura minima de 25% ao ano.");
  }
}

export function drawIds(pool: readonly string[], size: number, seed: string): string[] {
  const unique = [...new Set(pool)];
  const n = Math.min(size, unique.length);
  const ranked = unique
    .map((id) => ({ id, rank: hash32(`${seed}:${id}`) }))
    .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
  return ranked.slice(0, n).map((x) => x.id);
}

function hash32(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
