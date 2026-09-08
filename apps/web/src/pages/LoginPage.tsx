import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth.tsx";
import { VortexMark } from "../shell/Brand.tsx";

export function LoginPage() {
  const { login, register, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("E-mail obrigatorio.");
      return;
    }
    if (!password) {
      setError("Senha obrigatoria.");
      return;
    }
    const err =
      mode === "login"
        ? await login(email.trim(), password)
        : await register({ email: email.trim(), password, fullName, cpf });
    setError(err);
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--bg)] px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-[#0e1116] p-5" autoComplete="on">
        <div className="mb-4 flex items-center gap-2">
          <VortexMark size={32} title="VORTEX" />
          <div>
            <div className="text-sm font-semibold tracking-[0.16em]">VORTEX</div>
            <div className="mono text-[11px] text-[var(--muted)]">Rconta · identidade</div>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 rounded-md border border-[var(--border)] p-0.5 text-[12px]">
          <button type="button" onClick={() => setMode("login")} className={`h-8 rounded ${mode === "login" ? "bg-[var(--bg-hover)] text-white" : "text-[var(--muted)]"}`}>
            Entrar
          </button>
          <button type="button" onClick={() => setMode("register")} className={`h-8 rounded ${mode === "register" ? "bg-[var(--bg-hover)] text-white" : "text-[var(--muted)]"}`}>
            Criar Rconta
          </button>
        </div>
        {mode === "register" && (
          <>
            <label className="mb-3 block text-[12px] text-[var(--muted)]">
              Nome completo
              <input className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>
            <label className="mb-3 block text-[12px] text-[var(--muted)]">
              CPF
              <input className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" value={cpf} onChange={(e) => setCpf(e.target.value)} required />
            </label>
          </>
        )}
        <label className="mb-3 block text-[12px] text-[var(--muted)]">
          E-mail
          <input className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="username" />
        </label>
        <label className="mb-2 block text-[12px] text-[var(--muted)]">
          Senha
          <input className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </label>
        {mode === "login" && (
          <Link to="/recuperar" className="mb-4 block text-[12px] text-[var(--muted)] underline">
            Esqueci a senha
          </Link>
        )}
        {error && <p className="mb-3 text-[12px] text-[var(--danger)]">{error}</p>}
        <button disabled={loading} className="h-9 w-full rounded-md bg-[var(--accent)] text-sm font-semibold text-black disabled:opacity-50">
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar Rconta"}
        </button>
      </form>
    </div>
  );
}
