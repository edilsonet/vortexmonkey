import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api.ts";

type Company = {
  id: string;
  relationship_id: string;
  corporate_name: string;
  trade_name: string | null;
  cnpj: string;
  role: string;
  status: string;
  person_confirmed: boolean;
  company_confirmed: boolean;
  address: { street: string; number: string | null; neighborhood: string | null; city: string; state: string; cep: string } | null;
};

export function EmpresarialPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = () => api<{ companies: Company[] }>("/api/identity/me").then((r) => r.data && setCompanies(r.data.companies));
  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await api("/api/identity/companies", {
      method: "POST",
      body: JSON.stringify({ cnpj: fd.get("cnpj"), corporateName: fd.get("name") }),
    });
    if (!res.success) {
      setError(res.error?.message ?? "Falha");
      return;
    }
    setError(null);
    e.currentTarget.reset();
    await load();
  };

  const confirm = async (id: string, side: "PERSON" | "COMPANY") => {
    await api(`/api/identity/relationships/${id}/confirm`, {
      method: "POST",
      body: JSON.stringify({ side }),
    });
    await load();
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <form id="cadastro" onSubmit={onSubmit} className="scroll-mt-16 rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Nova empresa</h2>
        {error && <p className="mb-2 text-[12px] text-[var(--danger)]">{error}</p>}
        <input name="cnpj" placeholder="CNPJ" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="name" placeholder="Razao social" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Cadastrar</button>
        <p className="mt-3 text-[12px] text-[var(--muted)]">Vinculo nasce PENDING. ACTIVE so com dupla confirmacao.</p>
      </form>
      <section id="vinculos" className="scroll-mt-16 rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Vinculos</h2>
        {companies.map((c) => (
          <div key={c.relationship_id} className="border-b border-[var(--border)] py-2 text-[13px]">
            <div className="font-medium">{c.corporate_name}</div>
            {c.trade_name && <div className="text-[12px] text-[var(--muted)]">{c.trade_name}</div>}
            <div className="mono text-[11px] text-[var(--muted)]">
              {c.cnpj} · {c.role} · {c.status} · pessoa {c.person_confirmed ? "ok" : "pendente"} · empresa {c.company_confirmed ? "ok" : "pendente"}
            </div>
            {c.address && (
              <div className="mt-1 text-[12px] text-[var(--muted)]">
                {c.address.street}, {c.address.number ?? "S/N"} · {c.address.neighborhood} · {c.address.city}/{c.address.state} · {c.address.cep}
              </div>
            )}
            {c.status === "PENDING" && (
              <div className="mt-2 flex gap-2">
                {!c.person_confirmed && (
                  <button type="button" onClick={() => void confirm(c.relationship_id, "PERSON")} className="h-7 rounded border border-[var(--border)] px-2 text-[11px]">
                    Confirmar pessoa
                  </button>
                )}
                {!c.company_confirmed && (
                  <button type="button" onClick={() => void confirm(c.relationship_id, "COMPANY")} className="h-7 rounded border border-[var(--border)] px-2 text-[11px]">
                    Confirmar empresa
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
