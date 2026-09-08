export function assertCredentials(email: string, password: string): void {
  if (!email.trim()) throw new Error("E-mail obrigatorio.");
  if (!password) throw new Error("Senha obrigatoria.");
}

export function resetExpiresAt(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + 60 * 60 * 1000);
}

export function isResetExpired(now: Date, expiresAt: Date): boolean {
  return now.getTime() > expiresAt.getTime();
}
