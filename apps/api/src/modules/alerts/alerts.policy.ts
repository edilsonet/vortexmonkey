export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL" | "BLOCKING";

export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  INFO: 1,
  WARNING: 2,
  CRITICAL: 3,
  BLOCKING: 4,
};

export type AlertBadge = { severity: AlertSeverity; count: number };

export function badgeSummary(rows: readonly { severity: AlertSeverity; status?: string }[]): AlertBadge[] {
  const open = rows.filter((r) => (r.status ?? "OPEN") === "OPEN");
  const counts: Record<AlertSeverity, number> = { INFO: 0, WARNING: 0, CRITICAL: 0, BLOCKING: 0 };
  for (const row of open) counts[row.severity] += 1;
  return (Object.keys(counts) as AlertSeverity[])
    .filter((s) => counts[s] > 0)
    .map((severity) => ({ severity, count: counts[severity] }));
}

export function highestSeverity(badges: readonly AlertBadge[]): AlertSeverity | null {
  let best: AlertSeverity | null = null;
  for (const b of badges) {
    if (!best || SEVERITY_RANK[b.severity] > SEVERITY_RANK[best]) best = b.severity;
  }
  return best;
}

export function fingerprint(source: string, entityType: string, entityId: string, title: string): string {
  return `${source}:${entityType}:${entityId}:${title}`.slice(0, 80);
}
