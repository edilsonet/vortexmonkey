import { useEffect, useState } from "react";
import { api } from "../lib/api.ts";

type Alert = {
  id: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | "BLOCKING";
  source: string;
  title: string;
  body: string | null;
  status: string;
  created_at: string;
};

const tone: Record<Alert["severity"], string> = {
  INFO: "text-[var(--info)]",
  WARNING: "text-[var(--warn)]",
  CRITICAL: "text-[var(--danger)]",
  BLOCKING: "text-[var(--danger)]",
};

export function AlertasPage() {
  const [rows, setRows] = useState<Alert[]>([]);
  const load = () => api<Alert[]>("/api/alerts").then((r) => r.data && setRows(r.data));
  useEffect(() => {
    void load();
  }, []);

  const ack = async (id: string) => {
    await api(`/api/alerts/${id}/ack`, { method: "POST" });
    await load();
  };

  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
      <p className="mb-3 text-[12px] text-[var(--muted)]">Hub preditivo. Central so exibe; eventos vao ao ledger.</p>
      {rows.length === 0 && <p className="text-[13px] text-[var(--muted)]">Nenhum alerta.</p>}
      {rows.map((a) => (
        <div key={a.id} className="flex items-start justify-between gap-3 border-b border-[var(--border)] py-2">
          <div>
            <div className={`mono text-[11px] ${tone[a.severity]}`}>{a.severity} · {a.source}</div>
            <div className="text-[13px]">{a.title}</div>
            {a.body && <div className="text-[12px] text-[var(--muted)]">{a.body}</div>}
          </div>
          {a.status === "OPEN" ? (
            <button type="button" onClick={() => void ack(a.id)} className="h-7 shrink-0 rounded border border-[var(--border)] px-2 text-[11px]">
              Reconhecer
            </button>
          ) : (
            <span className="mono text-[11px] text-[var(--muted)]">{a.status}</span>
          )}
        </div>
      ))}
    </section>
  );
}
