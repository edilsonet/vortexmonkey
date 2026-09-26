export type JwtPayload = {
  personId?: string;
  tenantId?: string;
  roles?: string[];
  exp?: number;
};

export function decodeJwt(token: string | null): JwtPayload | null {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as JwtPayload;
  } catch {
    return null;
  }
}
