import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api.ts";
import { AppDashboardPage } from "../AppDashboardPage.tsx";
import { APP_DEFS, type NavChild, type NavGroup } from "../../shell/nav.ts";

type Company = { id: string; corporate_name: string };
type Me = { person: { id: string } | null; companies: Company[] };
type Center = {
  id: string;
  center_type: string;
  ciac_type: string | null;
  certificate_number: string | null;
  status: string;
  s141_status: string | null;
  corporate_name: string;
};
type Course = { id: string; center_id: string; course_type: string; title: string; duration_months: number; sell_on_rloja: boolean };
type Student = {
  id: string;
  enrollment_code: string;
  course_type: string;
  status: string;
  enrollment_date: string;
  max_duration_months: number;
  theory_valid_until: string | null;
  certificate_due: string | null;
  full_name: string;
};
type Fstd = { id: string; device_type: string; qualification_level: string; qualification_expiry: string | null; status: string };
type Instructor = { id: string; instructor_type: string; pedagogical_hours: number; status: string; full_name: string };
type Overview = {
  counts: { centers: number; courses: number; students: number; fstd: number };
  centers: Center[];
  courses: Course[];
  students: Student[];
  fstd: Fstd[];
  instructors: Instructor[];
};

const TR = APP_DEFS.find((a) => a.id === "tr")!;

function useTr() {
  const [data, setData] = useState<Overview | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    void api<Overview>("/api/training").then((r) => r.data && setData(r.data));
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
  return { data, me, error, post };
}

function Cards({ data }: { data: Overview | null }) {
  const cards = [
    ["Centros", data?.counts.centers ?? "—"],
    ["Cursos", data?.counts.courses ?? "—"],
    ["Matriculados", data?.counts.students ?? "—"],
    ["FSTD", data?.counts.fstd ?? "—"],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-3">
          <div className="text-[11px] text-[var(--muted)]">{label}</div>
          <div className="mono mt-1 text-2xl font-semibold">{value}</div>
        </div>
      ))}
    </div>
  );
}

export function TrDashboardPage() {
  const { data, error } = useTr();
  return (
    <div className="space-y-3">
      {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
      <Cards data={data} />
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-2 text-sm font-semibold">ERP Cursos 141/142/145-010</h2>
        <p className="text-[13px] text-[var(--muted)]">
          Unico ERP que vende cursos na RLoja. Certificado em 10 dias. S141. FSTD RBAC 60.
        </p>
      </section>
    </div>
  );
}

export function TrCursosPage() {
  const { data, me, error, post } = useTr();
  const companies = me?.companies ?? [];
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/training/centers", {
            companyId: fd.get("companyId"),
            centerType: fd.get("centerType"),
            ciacType: fd.get("ciacType") || undefined,
            certificateNumber: fd.get("certificateNumber") || undefined,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">CIAC / CTAC</h2>
        <select name="companyId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.corporate_name}</option>
          ))}
        </select>
        <select name="centerType" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>CIAC</option>
          <option>CTAC</option>
        </select>
        <select name="ciacType" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option value="">Tipo CIAC</option>
          <option>TIPO_1_PILOTOS</option>
          <option>TIPO_2_COMISSARIOS</option>
          <option>TIPO_3_MECANICOS</option>
        </select>
        <input name="certificateNumber" placeholder="Certificado" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Registrar</button>
        <div className="mt-3">
          {(data?.centers ?? []).map((c) => (
            <div key={c.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {c.corporate_name} · {c.center_type} · {c.status}
            </div>
          ))}
        </div>
      </form>
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/training/courses", {
            centerId: fd.get("centerId"),
            courseType: fd.get("courseType"),
            title: fd.get("title"),
            durationMonths: Number(fd.get("durationMonths")),
            sellOnRloja: true,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Catalogo / venda RLoja</h2>
        <select name="centerId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.centers ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.center_type} · {c.corporate_name}</option>
          ))}
        </select>
        <select name="courseType" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>PP</option>
          <option>PC</option>
          <option>PLA</option>
          <option>IFR</option>
          <option>COMISSARIO</option>
          <option>MMA</option>
          <option>DOV</option>
        </select>
        <input name="title" required placeholder="Titulo" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="durationMonths" type="number" defaultValue={6} className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Publicar curso</button>
        <div className="mt-3">
          {(data?.courses ?? []).map((c) => (
            <div key={c.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {c.course_type} · {c.title} · {c.duration_months}m {c.sell_on_rloja ? "· RLoja" : ""}
            </div>
          ))}
        </div>
      </form>
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4 lg:col-span-2"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/training/students", {
            centerId: fd.get("centerId"),
            courseId: fd.get("courseId") || undefined,
            personId: me?.person?.id,
            courseType: fd.get("courseType"),
            durationMonths: Number(fd.get("durationMonths")),
            theoryEvaluationDate: fd.get("theoryEvaluationDate") || undefined,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Turmas / S141</h2>
        <div className="grid gap-2 sm:grid-cols-4">
          <select name="centerId" className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
            {(data?.centers ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.center_type}</option>
            ))}
          </select>
          <select name="courseId" className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
            <option value="">Curso</option>
            {(data?.courses ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <select name="courseType" className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
            <option>PP</option>
            <option>PC</option>
            <option>PLA</option>
            <option>IFR</option>
          </select>
          <input name="durationMonths" type="number" defaultValue={6} className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        </div>
        <input name="theoryEvaluationDate" type="date" className="mt-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="mt-3 h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Matricular</button>
        <div className="mt-3">
          {(data?.students ?? []).map((s) => (
            <div key={s.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {s.enrollment_code} · {s.full_name} · {s.course_type} · {s.status}
              {s.status === "MATRICULADO" && (
                <button type="button" onClick={() => void post(`/api/training/students/${s.id}/graduate`, {})} className="ml-2 h-7 rounded border border-[var(--border)] px-2 text-[11px]">
                  Certificar
                </button>
              )}
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}

export function TrFstdPage() {
  const { data, me, error, post } = useTr();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/training/fstd", {
            centerId: fd.get("centerId"),
            deviceType: fd.get("deviceType"),
            qualificationLevel: fd.get("qualificationLevel"),
            qualificationExpiry: fd.get("qualificationExpiry") || undefined,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Dispositivos FSTD</h2>
        <select name="centerId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.centers ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.center_type}</option>
          ))}
        </select>
        <select name="deviceType" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>FFS</option>
          <option>FTD</option>
          <option>FNPT</option>
          <option>BITD</option>
        </select>
        <input name="qualificationLevel" defaultValue="LEVEL_D" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="qualificationExpiry" type="date" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Registrar</button>
        <div className="mt-3">
          {(data?.fstd ?? []).map((d) => (
            <div key={d.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {d.device_type} · {d.qualification_level} · {d.status}
              <button type="button" onClick={() => void post("/api/training/fstd/sessions", { fstdId: d.id })} className="ml-2 h-7 rounded border border-[var(--border)] px-2 text-[11px]">
                Sessao
              </button>
            </div>
          ))}
        </div>
      </form>
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/training/instructors", {
            centerId: fd.get("centerId"),
            personId: me?.person?.id,
            instructorType: fd.get("instructorType"),
            pedagogicalHours: Number(fd.get("pedagogicalHours") || 0),
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Instrutores / examinadores</h2>
        <select name="centerId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.centers ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.center_type}</option>
          ))}
        </select>
        <select name="instructorType" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>EXAMINADOR</option>
          <option>VOO</option>
          <option>SIMULADOR</option>
          <option>SOLO</option>
        </select>
        <input name="pedagogicalHours" type="number" defaultValue={8} className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Incluir</button>
        <div className="mt-3">
          {(data?.instructors ?? []).map((i) => (
            <div key={i.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {i.full_name} · {i.instructor_type} · {i.status}
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}

export function TrCertPage() {
  const { data, error } = useTr();
  const issued = (data?.students ?? []).filter((s) => s.status === "APROVADO");
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
      {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
      <h2 className="mb-3 text-sm font-semibold">Certificados &lt;=10 dias</h2>
      {issued.map((s) => (
        <div key={s.id} className="border-t border-[var(--border)] py-2 text-[13px]">
          {s.enrollment_code} · {s.full_name} · vencimento {s.certificate_due ?? "—"}
        </div>
      ))}
      {issued.length === 0 && <p className="text-[12px] text-[var(--muted)]">Nenhum certificado emitido.</p>}
    </div>
  );
}

export function trainingElement(path: string, group?: NavGroup, child?: NavChild) {
  if (path === "/tr") return <TrDashboardPage />;
  if (path.startsWith("/tr/cursos") || path.startsWith("/tr/s141") || path.startsWith("/tr/certificados")) {
    if (path.startsWith("/tr/certificados")) return <TrCertPage />;
    return <TrCursosPage />;
  }
  if (path.startsWith("/tr/fstd")) return <TrFstdPage />;
  return <AppDashboardPage app={TR} group={group} child={child} />;
}
