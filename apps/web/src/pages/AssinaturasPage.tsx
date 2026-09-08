import { useEffect, useState } from "react";
import { api } from "../lib/api.ts";

type Product = { id: string; code: string; name: string; kind: string; price_brl: string };
type Sub = { id: string; status: string; current_period_end: string; code: string; name: string; price_brl: string };
type Commission = { id: string; source: string; gross_brl: string; amount_brl: string; buyer_exempt: boolean; created_at: string };
type Mine = { subscriptions: Sub[]; ads: boolean; productCodes: string[] };

export function AssinaturasPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [mine, setMine] = useState<Mine | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    void api<Product[]>("/api/billing/products").then((r) => r.data && setProducts(r.data));
    void api<Mine>("/api/billing/me").then((r) => r.data && setMine(r.data));
    void api<Commission[]>("/api/billing/commissions").then((r) => r.data && setCommissions(r.data));
  };

  useEffect(() => {
    load();
  }, []);

  const subscribe = async (productCode: string) => {
    const res = await api("/api/billing/subscribe", { method: "POST", body: JSON.stringify({ productCode }) });
    if (!res.success) {
      setError(res.error?.message ?? "Falha");
      return;
    }
    setError(null);
    load();
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section id="produtos" className="scroll-mt-16 rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-1 text-sm font-semibold">Seis produtos</h2>
        <p className="mb-3 text-[12px] text-[var(--muted)]">Catalogo Central nao e vendido. Comprador isento; comissao 3% do vendedor.</p>
        {error && <p className="mb-2 text-[12px] text-[var(--danger)]">{error}</p>}
        <ul className="grid gap-2">
          {products.map((p) => {
            const active = mine?.productCodes.includes(p.code);
            return (
              <li key={p.id} className="flex items-center justify-between rounded border border-[var(--border)] px-3 py-2">
                <div>
                  <div className="text-[13px]">{p.name}</div>
                  <div className="mono text-[11px] text-[var(--muted)]">{p.code} · R$ {p.price_brl}</div>
                </div>
                {active ? (
                  <span className="text-[11px] text-[var(--accent)]">ativa</span>
                ) : (
                  <button type="button" onClick={() => void subscribe(p.code)} className="h-7 rounded-md bg-[var(--accent)] px-2 text-[11px] font-semibold text-black">
                    Assinar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section id="minhas" className="scroll-mt-16 rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Minhas assinaturas</h2>
        <p className="mb-2 text-[12px] text-[var(--muted)]">
          Anuncios na Rconta: {mine?.ads === false ? "ocultos (VIP ou ERP)" : "visiveis (conta gratuita)"}
        </p>
        {(mine?.subscriptions ?? []).length === 0 && <p className="text-[12px] text-[var(--muted)]">Nenhuma assinatura.</p>}
        {(mine?.subscriptions ?? []).map((s) => (
          <div key={s.id} className="border-b border-[var(--border)] py-2 text-[13px]">
            {s.name} · {s.status}
            <div className="mono text-[11px] text-[var(--muted)]">ate {s.current_period_end}</div>
          </div>
        ))}
        <h3 id="comissoes" className="mb-2 mt-4 text-sm font-semibold">Comissoes 3%</h3>
        {commissions.length === 0 && <p className="text-[12px] text-[var(--muted)]">Nenhuma comissao.</p>}
        {commissions.map((c) => (
          <div key={c.id} className="border-b border-[var(--border)] py-1 text-[12px]">
            {c.source} · bruto R$ {c.gross_brl} · taxa R$ {c.amount_brl}
            {c.buyer_exempt && <span className="text-[var(--muted)]"> · comprador isento</span>}
          </div>
        ))}
      </section>
    </div>
  );
}

export function useAdsHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    api<Mine>("/api/billing/me").then((r) => {
      if (r.data) setHidden(!r.data.ads);
    });
  }, []);
  return hidden;
}
