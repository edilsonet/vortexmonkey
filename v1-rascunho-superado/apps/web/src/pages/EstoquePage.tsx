import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api.ts";

type Holding = {
  id: string;
  kind: string;
  origin_mark: string;
  items: { id: string; sku: string; name: string; quantity: string; status: string }[];
};

export function EstoquePage() {
  const [rows, setRows] = useState<Holding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = () => api<Holding[]>("/api/stock").then((r) => r.data && setRows(r.data));
  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await api("/api/stock/items", {
      method: "POST",
      body: JSON.stringify({
        holdingId: fd.get("holdingId"),
        sku: fd.get("sku"),
        name: fd.get("name"),
        quantity: Number(fd.get("quantity") || 1),
        originMark: fd.get("originMark"),
      }),
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
        <h2 className="mb-3 text-sm font-semibold">Novo item</h2>
        {error && <p className="mb-2 text-[12px] text-[var(--danger)]">{error}</p>}
        <select name="holdingId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {rows.map((h) => (
            <option key={h.id} value={h.id}>{h.kind} · {h.origin_mark}</option>
          ))}
        </select>
        <input name="sku" required placeholder="SKU" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="name" required placeholder="Nome" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="quantity" type="number" defaultValue={1} className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <select name="originMark" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>PERSONAL</option>
          <option>COMPANY</option>
        </select>
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Incluir</button>
      </form>
      {rows.map((h) => (
        <section key={h.id} className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
          <h2 id={h.kind === "PERSONAL" ? "pessoal" : h.kind === "COMPANY" ? "empresarial" : undefined} className="scroll-mt-16 text-sm font-semibold">{h.kind}</h2>
          <p className="mono mb-2 text-[11px] text-[var(--muted)]">origem {h.origin_mark}</p>
          {(h.items ?? []).length === 0 && <p className="text-[12px] text-[var(--muted)]">Sem itens.</p>}
          {(h.items ?? []).map((i) => (
            <div key={i.id} className="flex justify-between border-b border-[var(--border)] py-1 text-[13px]">
              <span>{i.name} <span className="mono text-[11px] text-[var(--muted)]">{i.sku}</span></span>
              <span>{i.quantity} · {i.status}</span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
