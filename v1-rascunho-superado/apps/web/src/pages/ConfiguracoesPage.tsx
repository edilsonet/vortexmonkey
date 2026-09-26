import { useEffect, useState } from "react";
import { api } from "../lib/api.ts";

type Me = { person: { tenant_id: string; email: string; full_name: string } | null; roles: string[] };

export function ConfiguracoesPage() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    api<Me>("/api/identity/me").then((r) => r.data && setMe(r.data));
  }, []);
  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4 text-[13px]">
      <p className="mb-3 text-[var(--muted)]">Tenant e contexto, nunca dono do dado. RLS ativo. Segredos apenas em env.</p>
      <div className="mono text-[12px]">tenant {me?.person?.tenant_id ?? "—"}</div>
      <div className="mt-1 text-[13px]">{me?.person?.full_name} · {me?.person?.email}</div>
      <div className="mt-1 text-[12px] text-[var(--muted)]">{me?.roles.join(", ")}</div>
    </section>
  );
}
