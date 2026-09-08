import { FormEvent, useState } from "react";
import { useAuth } from "../lib/auth.tsx";
import { decodeJwt } from "../lib/jwt.ts";
import { api } from "../lib/api.ts";

export function SegurancaPage() {
  const { token, logout } = useAuth();
  const payload = decodeJwt(token);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get("currentPassword") ?? "");
    const newPassword = String(fd.get("newPassword") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (newPassword !== confirm) {
      setOk(null);
      setError("Confirmacao diferente da nova senha.");
      return;
    }
    const res = await api("/api/auth/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.success) {
      setOk(null);
      setError(res.error?.message ?? "Falha ao alterar senha.");
      return;
    }
    setError(null);
    setOk("Senha atualizada.");
    e.currentTarget.reset();
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <section id="sessao" className="scroll-mt-16 rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4 text-[13px]">
        <h2 className="mb-3 text-sm font-semibold">Sessao</h2>
        <p className="mb-3 text-[var(--muted)]">Login ativo (JWT 15 min). Troque a senha aqui quando quiser.</p>
        <dl className="grid gap-2">
          <Row label="Person" value={payload?.personId ?? "—"} />
          <Row label="Tenant" value={payload?.tenantId ?? "—"} />
          <Row label="Papeis" value={(payload?.roles ?? []).join(", ") || "—"} />
          <Row label="Expira" value={payload?.exp ? new Date(payload.exp * 1000).toISOString() : "—"} />
        </dl>
        <button type="button" onClick={logout} className="mt-4 h-8 rounded-md border border-[var(--border)] px-3 text-[12px]">
          Encerrar sessao
        </button>
      </section>
      <form id="senha" onSubmit={onSubmit} className="scroll-mt-16 rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Alterar senha</h2>
        {error && <p className="mb-2 text-[12px] text-[var(--danger)]">{error}</p>}
        {ok && <p className="mb-2 text-[12px] text-[var(--accent)]">{ok}</p>}
        <label className="mb-2 block text-[12px] text-[var(--muted)]">
          Senha atual
          <input name="currentPassword" type="password" required minLength={8} className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        </label>
        <label className="mb-2 block text-[12px] text-[var(--muted)]">
          Nova senha
          <input name="newPassword" type="password" required minLength={8} className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        </label>
        <label className="mb-3 block text-[12px] text-[var(--muted)]">
          Confirmar nova senha
          <input name="confirm" type="password" required minLength={8} className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        </label>
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Salvar senha</button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
      <div className="mono break-all text-[12px]">{value}</div>
    </div>
  );
}
