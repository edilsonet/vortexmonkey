import { useEffect, useState } from "react";
import { api } from "../lib/api.ts";

type Row = { id: string; number: string; subject: string; status: string; created_at: string };

export function ProtocoloPage() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    api<Row[]>("/api/protocols").then((r) => r.data && setRows(r.data));
  }, []);
  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)]">
      <table className="w-full text-left text-[13px]">
        <thead className="text-[11px] uppercase text-[var(--muted)]">
          <tr><th className="p-3">Protocolo</th><th className="p-3">Assunto</th><th className="p-3">Status</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[var(--border)]">
              <td className="mono p-3">{r.number}</td>
              <td className="p-3">{r.subject}</td>
              <td className="p-3">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="p-4 text-[12px] text-[var(--muted)]">Nenhum protocolo. Cadastros de escrita geram AAAA-NNNNNN.</p>}
    </section>
  );
}
