import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api.ts";
import { AppDashboardPage } from "../AppDashboardPage.tsx";
import { APP_DEFS, type NavChild, type NavGroup } from "../../shell/nav.ts";

type Item = { id: string; sku: string; name: string; status: string; quantity: string; kind: string };
type Listing = {
  id: string;
  title: string;
  category: string;
  origin: string;
  price: string;
  status: string;
  admin_approved: boolean;
  sku: string;
  item_name: string;
};
type Order = { id: string; amount: string; commission_amount: string; buyer_charge: string; status: string; title: string };
type Overview = {
  counts: { listings: number; published: number; orders: number };
  listings: Listing[];
  orders: Order[];
  items: Item[];
};

const RL = APP_DEFS.find((a) => a.id === "rl")!;

function useRl() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    void api<Overview>("/api/rloja").then((r) => r.data && setData(r.data));
  };
  useEffect(() => {
    load();
  }, []);
  const post = async (path: string, body: unknown) => {
    const res = await api(path, { method: "POST", body: JSON.stringify(body) });
    if (!res.success) {
      setError(res.error?.message ?? "Falha");
      return;
    }
    setError(null);
    load();
  };
  return { data, error, post };
}

export function RlDashboardPage() {
  const { data, error } = useRl();
  return (
    <div className="space-y-3">
      {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Anuncios", data?.counts.listings ?? "—"],
          ["Publicados", data?.counts.published ?? "—"],
          ["Pedidos", data?.counts.orders ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-3">
            <div className="text-[11px] text-[var(--muted)]">{label}</div>
            <div className="mono mt-1 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-2 text-sm font-semibold">RLoja</h2>
        <p className="text-[13px] text-[var(--muted)]">Anuncio e visao do estoque. Comissao 3% do vendedor. Comprador isento.</p>
      </section>
    </div>
  );
}

export function RlVitrinePage() {
  const { data, error, post } = useRl();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/rloja/listings", {
            inventoryItemId: fd.get("inventoryItemId"),
            origin: fd.get("origin"),
            category: fd.get("category"),
            title: fd.get("title"),
            price: Number(fd.get("price")),
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Anunciar (visao do estoque)</h2>
        <select name="inventoryItemId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.items ?? []).map((i) => (
            <option key={i.id} value={i.id}>{i.sku} · {i.name}</option>
          ))}
        </select>
        <select name="origin" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>PARTICULAR</option>
          <option>EMPRESA</option>
        </select>
        <select name="category" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>PECA</option>
          <option>CONSUMIVEL</option>
          <option>MOTOR</option>
          <option>AERONAVE</option>
        </select>
        <input name="title" required placeholder="Titulo" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="price" type="number" step="0.01" required placeholder="Preco" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Criar rascunho</button>
      </form>
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Vitrine</h2>
        {(data?.listings ?? []).map((l) => (
          <div key={l.id} className="border-t border-[var(--border)] py-2 text-[13px]">
            {l.title} · {l.category} · R$ {l.price} · {l.status}
            {l.status === "RASCUNHO" && (
              <button type="button" onClick={() => void post(`/api/rloja/listings/${l.id}/approve`, {})} className="ml-2 h-7 rounded border border-[var(--border)] px-2 text-[11px]">
                Aprovar/publicar
              </button>
            )}
            {l.status === "PUBLICADO" && (
              <button type="button" onClick={() => void post("/api/rloja/orders", { listingId: l.id })} className="ml-2 h-7 rounded border border-[var(--border)] px-2 text-[11px]">
                Comprar
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

export function RlPedidosPage() {
  const { data, error } = useRl();
  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
      {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
      <h2 className="mb-3 text-sm font-semibold">Pedidos</h2>
      {(data?.orders ?? []).map((o) => (
        <div key={o.id} className="border-t border-[var(--border)] py-2 text-[13px]">
          {o.title} · R$ {o.amount} · comissao {o.commission_amount} · comprador {o.buyer_charge} · {o.status}
        </div>
      ))}
      {(data?.orders ?? []).length === 0 && <p className="text-[12px] text-[var(--muted)]">Nenhum pedido.</p>}
    </section>
  );
}

export function RlComissoesPage() {
  const { data } = useRl();
  const total = (data?.orders ?? []).reduce((s, o) => s + Number(o.commission_amount), 0);
  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
      <h2 className="mb-2 text-sm font-semibold">Politica 3%</h2>
      <p className="text-[13px] text-[var(--muted)]">Cobrada do vendedor. Comprador isento. Extrato: R$ {total.toFixed(2)}</p>
    </section>
  );
}

export function rlojaElement(path: string, group?: NavGroup, child?: NavChild) {
  if (path === "/rl") return <RlDashboardPage />;
  if (path.startsWith("/rl/vitrine") || path.startsWith("/rl/banners")) return <RlVitrinePage />;
  if (path.startsWith("/rl/pedidos")) return <RlPedidosPage />;
  if (path.startsWith("/rl/comissoes")) return <RlComissoesPage />;
  return <AppDashboardPage app={RL} group={group} child={child} />;
}
