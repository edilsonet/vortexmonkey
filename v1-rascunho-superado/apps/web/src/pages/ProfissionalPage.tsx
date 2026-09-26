import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api.ts";

type Overview = {
  profile: { professional_type: string; summary: string | null } | null;
  civ: { civ_number: string; hours_total: string }[];
  cma: { cma_class: string; valid_until: string }[];
  experiences: { company_name: string; role_title: string }[];
};

export function ProfissionalPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => api<Overview>("/api/professional").then((r) => r.data && setData(r.data));
  useEffect(() => {
    void load();
  }, []);

  const post = async (path: string, body: unknown, form: HTMLFormElement) => {
    const res = await api(path, { method: "POST", body: JSON.stringify(body) });
    if (!res.success) {
      setError(res.error?.message ?? "Falha");
      return;
    }
    setError(null);
    form.reset();
    await load();
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
      <section id="perfil" className="scroll-mt-16 rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Perfil, CIV, CMA</h2>
        {error && <p className="mb-2 text-[12px] text-[var(--danger)]">{error}</p>}
        {data?.profile ? (
          <p className="text-[13px]">{data.profile.professional_type} · {data.profile.summary || "sem resumo"}</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void post("/api/professional/profile", { professionalType: fd.get("type"), summary: fd.get("summary") }, e.currentTarget);
            }}
            className="grid gap-2"
          >
            <select name="type" className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
              {["PILOTO", "COMISSARIO", "MECANICO_VOO", "MMA", "DOV", "INSTRUTOR", "EXAMINADOR", "OUTRO"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input name="summary" placeholder="Resumo curricular" className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
            <button className="h-8 w-fit rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Salvar perfil</button>
          </form>
        )}
        <div id="civ" className="scroll-mt-16">
          <List title="CIV" items={(data?.civ ?? []).map((c) => `${c.civ_number} · ${c.hours_total}h`)} />
        </div>
        <div id="cma" className="scroll-mt-16">
          <List title="CMA" items={(data?.cma ?? []).map((c) => `${c.cma_class} · ${c.valid_until}`)} />
        </div>
        <div id="experiencia" className="scroll-mt-16">
          <List title="Experiencia" items={(data?.experiences ?? []).map((c) => `${c.role_title} @ ${c.company_name}`)} />
        </div>
      </section>
      <section className="grid gap-3">
        <FormCard
          title="Novo CIV"
          onSubmit={(e) => {
            const fd = new FormData(e.currentTarget);
            return post("/api/professional/civ", {
              civNumber: fd.get("civNumber"),
              hoursTotal: Number(fd.get("hoursTotal")),
              issuedAt: fd.get("issuedAt") || undefined,
            }, e.currentTarget);
          }}
        >
          <input name="civNumber" required placeholder="Numero CIV" className={inputCls} />
          <input name="hoursTotal" required type="number" step="0.1" placeholder="Horas" className={inputCls} />
          <input name="issuedAt" type="date" className={inputCls} />
        </FormCard>
        <FormCard
          title="Novo CMA"
          onSubmit={(e) => {
            const fd = new FormData(e.currentTarget);
            return post("/api/professional/cma", {
              cmaClass: fd.get("cmaClass"),
              validUntil: fd.get("validUntil"),
              clinicName: fd.get("clinicName") || undefined,
            }, e.currentTarget);
          }}
        >
          <input name="cmaClass" required placeholder="Classe (1, 2, 3)" className={inputCls} />
          <input name="validUntil" required type="date" className={inputCls} />
          <input name="clinicName" placeholder="Clinica" className={inputCls} />
        </FormCard>
        <FormCard
          title="Experiencia"
          onSubmit={(e) => {
            const fd = new FormData(e.currentTarget);
            return post("/api/professional/experiences", {
              companyName: fd.get("companyName"),
              roleTitle: fd.get("roleTitle"),
              startedAt: fd.get("startedAt"),
            }, e.currentTarget);
          }}
        >
          <input name="companyName" required placeholder="Empresa" className={inputCls} />
          <input name="roleTitle" required placeholder="Funcao" className={inputCls} />
          <input name="startedAt" required type="date" className={inputCls} />
        </FormCard>
      </section>
    </div>
  );
}

const inputCls = "h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm";

function FormCard({
  title,
  children,
  onSubmit,
}: {
  title: string;
  children: React.ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(e);
      }}
      className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
    >
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="grid gap-2">{children}</div>
      <button className="mt-3 h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Incluir</button>
    </form>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--muted)]">{title}</div>
      {items.length === 0 ? <div className="text-[12px] text-[var(--muted)]">Nenhum registro.</div> : items.map((i) => <div key={i} className="border-b border-[var(--border)] py-1 text-[13px]">{i}</div>)}
    </div>
  );
}
