import { useEffect, useState } from "react";
import { api } from "../lib/api.ts";

type Block = { id: string; seq: string; entity_type: string; action_type: string; hash: string; created_at: string };

export function LedgerPage() {
  const [rows, setRows] = useState<Block[]>([]);
  const [verify, setVerify] = useState<string>("");
  useEffect(() => {
    api<Block[]>("/api/ledger").then((r) => r.data && setRows(r.data));
  }, []);
  const run = async () => {
    const r = await api<{ valid: boolean; checked: number }>("/api/ledger/verify");
    setVerify(r.success ? `integra · ${r.data?.checked} blocos` : r.error?.message ?? "falha");
  };
  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] text-[var(--muted)]">Append-only · SHA-256 encadeado · Ed25519. Apps so filtram, nao duplicam historico.</p>
        <button onClick={run} className="h-8 rounded-md border border-[var(--border)] px-3 text-[12px]">Verificar cadeia</button>
      </div>
      {verify && <p className="mb-3 mono text-[12px] text-[var(--accent)]">{verify}</p>}
      <div className="max-h-[480px] overflow-auto">
        {rows.map((r) => (
          <div key={r.id} className="border-b border-[var(--border)] py-2 text-[12px]">
            <span className="mono text-[var(--muted)]">#{r.seq}</span> {r.entity_type}/{r.action_type}
            <div className="mono truncate text-[11px] text-[var(--muted)]">{r.hash}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
