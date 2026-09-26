export interface AccreditationRules { validityDays: number; renewalAlertDays: number }
export const addUtcDays = (date: string, days: number): string => { const value = new Date(`${date}T00:00:00.000Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };
export const accreditationState = (validUntil: string, rules: AccreditationRules, today = new Date()): 'ACTIVE' | 'EXPIRING' | 'EXPIRED' => {
  const end = new Date(`${validUntil}T23:59:59.999Z`).getTime();
  if (end < today.getTime()) return 'EXPIRED';
  const threshold = new Date(today); threshold.setUTCDate(threshold.getUTCDate() + rules.renewalAlertDays);
  return end <= threshold.getTime() ? 'EXPIRING' : 'ACTIVE';
};
