import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "./api.ts";
import { decodeJwt } from "./jwt.ts";

type AuthState = {
  token: string | null;
  roles: string[];
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (input: { email: string; password: string; fullName: string; cpf: string }) => Promise<string | null>;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTok] = useState<string | null>(getToken());
  const [loading, setLoading] = useState(false);
  const roles = decodeJwt(token)?.roles ?? [];

  useEffect(() => {
    setTok(getToken());
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      roles,
      loading,
      login: async (email, password) => {
        setLoading(true);
        try {
          const res = await api<{ accessToken: string }>("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });
          if (!res.success || !res.data) return res.error?.message ?? "Falha no login";
          setToken(res.data.accessToken);
          setTok(res.data.accessToken);
          return null;
        } finally {
          setLoading(false);
        }
      },
      register: async (input) => {
        setLoading(true);
        try {
          const res = await api<{ accessToken: string }>("/api/auth/register", {
            method: "POST",
            body: JSON.stringify(input),
          });
          if (!res.success || !res.data) return res.error?.message ?? "Falha no cadastro";
          setToken(res.data.accessToken);
          setTok(res.data.accessToken);
          return null;
        } finally {
          setLoading(false);
        }
      },
      logout: () => {
        setToken(null);
        setTok(null);
      },
    }),
    [token, roles, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = (): AuthState => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AuthProvider ausente");
  return ctx;
};
