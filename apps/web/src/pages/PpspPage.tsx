import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api.ts";

type Program = { id: string; year: number; status: string; company_id: string; corporate_name: string; arso_person_id: string; arso_name: string; members: number };
type Exam = { id: string; person_id: string; collected_at: string; valid_until: string; result: string };
type Draw = { id: string; year: number; pool_size: number; sample_size: number; coverage: string; seed: string };
type Overview = { programs: Program[]; exams: Exam[]; draws: Draw[] };
type Company = { id: string; corporate_name: string };
type Me = { person: { id: string } | null; companies: Company[] };

export function PpspPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    void api<Overview>("/api/ppsp").then((r) => r.data && setData(r.data));
    void api<Me>("/api/identity/me").then((r) => r.data && setMe(r.data));
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

  const personId = me?.person?.id ?? "";

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        id="programa"
        className="scroll-mt-16 rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/ppsp/programs", {
            companyId: fd.get("companyId"),
            year: Number(fd.get("year")),
            arsoPersonId: personId,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Programa PPSP · ARSO</h2>
        <p className="mb-2 text-[12px] text-[var(--muted)]">RBAC 120. ARSO e o usuario autenticado.</p>
        <select name="companyId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(me?.companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.corporate_name}</option>
          ))}
        </select>
        <input name="year" type="number" defaultValue={new Date().getUTCFullYear()} className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Abrir programa</button>
        <div className="mt-3">
          {(data?.programs ?? []).map((p) => (
            <div key={p.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {p.corporate_name} · {p.year} · ARSO {p.arso_name} · {p.members} membros
              <div className="mt-1 flex gap-2">
                <button type="button" onClick={() => void post(`/api/ppsp/programs/${p.id}/members`, { personId })} className="h-7 rounded border border-[var(--border)] px-2 text-[11px]">
                  Incluir-me
                </button>
                <button type="button" onClick={() => void post(`/api/ppsp/programs/${p.id}/draw`, { seed: `${p.year}-vortex` })} className="h-7 rounded border border-[var(--border)] px-2 text-[11px]">
                  Sortear &gt;=25%
                </button>
              </div>
            </div>
          ))}
        </div>
      </form>
      <form
        id="exame"
        className="scroll-mt-16 rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/ppsp/exams", {
            companyId: fd.get("companyId"),
            personId,
            collectedAt: fd.get("collectedAt"),
            result: fd.get("result"),
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Toxicologico 90 dias</h2>
        <select name="companyId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(me?.companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.corporate_name}</option>
          ))}
        </select>
        <input name="collectedAt" type="date" required className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <select name="result" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>NEGATIVE</option>
          <option>POSITIVE</option>
          <option>PENDING</option>
        </select>
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Registrar exame</button>
        <div id="sorteio" className="mt-4 scroll-mt-16">
          <h3 className="mb-2 text-sm font-semibold">Exames e sorteios</h3>
          {(data?.exams ?? []).map((e) => (
            <div key={e.id} className="border-b border-[var(--border)] py-1 text-[12px]">
              {e.result} · colhido {e.collected_at} · valido ate {e.valid_until}
            </div>
          ))}
          {(data?.draws ?? []).map((d) => (
            <div key={d.id} className="border-b border-[var(--border)] py-1 text-[12px]">
              Sorteio {d.year} · {d.sample_size}/{d.pool_size} · cobertura {d.coverage}
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}
