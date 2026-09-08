import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.ts";
import { VortexMark } from "../shell/Brand.tsx";

export function RecoverPage() {
  const [params] = useSearchParams();
  const initialToken = params.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("E-mail obrigatorio.");
      return;
    }
    const res = await api<{ sent: true; token?: string }>("/api/auth/forgot", {
      method: "POST",
      body: JSON.stringify({ email: email.trim() }),
    });
    if (!res.success) {
      setError(res.error?.message ?? "Falha");
      return;
    }
    setError(null);
    if (res.data?.token) setToken(res.data.token);
    setMessage("Se o e-mail existir, enviamos o link de recuperacao.");
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    if (!token.trim() || !password) {
      setError("Token e nova senha obrigatorios.");
      return;
    }
    const res = await api("/api/auth/reset", {
      method: "POST",
      body: JSON.stringify({ token: token.trim(), newPassword: password }),
    });
    if (!res.success) {
      setError(res.error?.message ?? "Falha");
      return;
    }
    setError(null);
    setMessage("Senha alterada. Entre com a nova senha.");
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-[#0e1116] p-5">
        <div className="mb-4 flex items-center gap-2">
          <VortexMark size={32} title="VORTEX" />
          <div className="text-sm font-semibold tracking-[0.16em]">VORTEX</div>
        </div>
        <form onSubmit={request} className="mb-4">
          <label className="mb-3 block text-[12px] text-[var(--muted)]">
            E-mail
            <input className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="username" />
          </label>
          <button className="h-9 w-full rounded-md bg-[var(--accent)] text-sm font-semibold text-black">Enviar link</button>
        </form>
        <form onSubmit={reset}>
          <label className="mb-3 block text-[12px] text-[var(--muted)]">
            Token
            <input className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" value={token} onChange={(e) => setToken(e.target.value)} />
          </label>
          <label className="mb-4 block text-[12px] text-[var(--muted)]">
            Nova senha
            <input className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} autoComplete="new-password" />
          </label>
          {error && <p className="mb-3 text-[12px] text-[var(--danger)]">{error}</p>}
          {message && <p className="mb-3 text-[12px] text-[var(--accent)]">{message}</p>}
          <button className="h-9 w-full rounded-md border border-[var(--border)] text-sm">Definir senha</button>
        </form>
        <Link to="/login" className="mt-3 block text-center text-[12px] text-[var(--muted)] underline">Voltar ao login</Link>
      </div>
    </div>
  );
}
