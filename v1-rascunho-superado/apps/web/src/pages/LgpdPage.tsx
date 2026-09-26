import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api.ts";

type Row = { id: string; request_type: string; status: string; created_at: string };

export function LgpdPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = () => api<Row[]>("/api/compliance/lgpd").then((r) => r.data && setRows(r.data));
  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await api("/api/compliance/lgpd", {
      method: "POST",
      body: JSON.stringify({ requestType: fd.get("requestType"), notes: fd.get("notes") }),
    });
    if (!res.success) {
      setError(res.error?.message ?? "Falha");
      return;
    }
    setError(null);
    e.currentTarget.reset();
    await load();
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <form onSubmit={onSubmit} className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Solicitacao LGPD</h2>
        {error && <p className="mb-2 text-[12px] text-[var(--danger)]">{error}</p>}
        <select name="requestType" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option value="EXPORT">Exportar meus dados</option>
          <option value="ERASURE">Anonimizar cadastro</option>
          <option value="CONSENT_REVOKE">Revogar consentimento</option>
        </select>
        <input name="notes" placeholder="Notas" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Enviar</button>
      </form>
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Historico</h2>
        {rows.length === 0 && <p className="text-[12px] text-[var(--muted)]">Nenhuma solicitacao.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex justify-between border-b border-[var(--border)] py-2 text-[13px]">
            <span>{r.request_type}</span>
            <span className="mono text-[11px] text-[var(--muted)]">{r.status}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
