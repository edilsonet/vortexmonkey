import { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { useAdsHidden } from "./AssinaturasPage.tsx";

type Dash = { people: number; companies: number; pendingLinks: number; protocols: number; ledgerBlocks: number };

export function DashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  useEffect(() => {
    api<Dash>("/api/identity/dashboard").then((r) => r.data && setData(r.data));
  }, []);
  const adsHidden = useAdsHidden();
  const cards = [
    ["Pessoas", data?.people ?? "—"],
    ["Empresas", data?.companies ?? "—"],
    ["Vinculos pendentes", data?.pendingLinks ?? "—"],
    ["Protocolos", data?.protocols ?? "—"],
    ["Blocos ledger", data?.ledgerBlocks ?? "—"],
  ] as const;
  return (
    <div>
      {!adsHidden && (
        <div className="mb-3 rounded-md border border-[var(--border)] bg-[#14120a] px-3 py-2 text-[12px] text-[var(--warn)]">
          Rconta gratuita exibe avisos. VIP ou qualquer ERP remove apenas na Rconta do comprador.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-3">
            <div className="text-[11px] text-[var(--muted)]">{label}</div>
            <div className="mono mt-1 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
