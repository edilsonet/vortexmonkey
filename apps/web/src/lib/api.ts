export type Envelope<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
};

const tokenKey = "vortex.token";

export const getToken = (): string | null => localStorage.getItem(tokenKey);
export const setToken = (token: string | null): void => {
  if (token) localStorage.setItem(tokenKey, token);
  else localStorage.removeItem(tokenKey);
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  const token = getToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.method && init.method !== "GET") {
    headers.set("idempotency-key", crypto.randomUUID());
  }
  const res = await fetch(path, { ...init, headers });
  return res.json() as Promise<Envelope<T>>;
}
