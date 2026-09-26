import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api.ts";

type Application = { id: string; person_id: string; status: string };
type Vacancy = { id: string; title: string; corporate_name: string; status: string; applications: number; application_rows: Application[] };
type Company = { id: string; corporate_name: string };

export function RecrutamentoPage() {
  const [rows, setRows] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    void api<Vacancy[]>("/api/recruitment").then((r) => r.data && setRows(r.data));
    void api<{ companies: Company[] }>("/api/identity/me").then((r) => r.data && setCompanies(r.data.companies));
  };
  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await api("/api/recruitment/vacancies", {
      method: "POST",
      body: JSON.stringify({ companyId: fd.get("companyId"), title: fd.get("title"), sourceApp: "RCONTA" }),
    });
    if (!res.success) {
      setError(res.error?.message ?? "Falha");
      return;
    }
    setError(null);
    e.currentTarget.reset();
    load();
  };

  const apply = async (vacancyId: string) => {
    await api("/api/recruitment/apply", { method: "POST", body: JSON.stringify({ vacancyId }) });
    load();
  };

  const hire = async (applicationId: string) => {
    const res = await api("/api/recruitment/hire", {
      method: "POST",
      body: JSON.stringify({ applicationId, salaryBrl: 10000 }),
    });
    if (!res.success) setError(res.error?.message ?? "Falha na contratacao");
    load();
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <form id="vagas" onSubmit={onSubmit} className="scroll-mt-16 rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Agregar vaga (ERPs na Fase 5+)</h2>
        {error && <p className="mb-2 text-[12px] text-[var(--danger)]">{error}</p>}
        <select name="companyId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.corporate_name}</option>
          ))}
        </select>
        <input name="title" required placeholder="Titulo da vaga" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Publicar</button>
      </form>
      <section id="candidaturas" className="scroll-mt-16 rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <p className="mb-3 text-[12px] text-[var(--muted)]">Agregador. Curriculos vivem na Rconta.</p>
        {rows.length === 0 && <p className="text-[13px] text-[var(--muted)]">Nenhuma vaga agregada ainda.</p>}
        {rows.map((v) => (
          <div key={v.id} className="border-b border-[var(--border)] py-2 text-[13px]">
            <div className="flex items-center justify-between">
              <span>{v.title} · {v.corporate_name}</span>
              <span className="flex items-center gap-2 text-[var(--muted)]">
                {v.status} · {v.applications} cand.
                <button type="button" onClick={() => void apply(v.id)} className="h-7 rounded border border-[var(--border)] px-2 text-[11px] text-[var(--text)]">
                  Candidatar
                </button>
              </span>
            </div>
            {(v.application_rows ?? []).map((a) => (
              <div key={a.id} className="mt-1 flex items-center justify-between text-[12px] text-[var(--muted)]">
                <span className="mono">{a.status}</span>
                {a.status !== "HIRED" && (
                  <button type="button" onClick={() => void hire(a.id)} className="h-7 rounded border border-[var(--border)] px-2 text-[11px] text-[var(--text)]">
                    Contratar 3%
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
