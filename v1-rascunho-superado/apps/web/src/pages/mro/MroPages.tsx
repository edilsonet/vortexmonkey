import { FormEvent, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../lib/api.ts";
import { AppDashboardPage } from "../AppDashboardPage.tsx";
import { APP_DEFS, type NavChild, type NavGroup } from "../../shell/nav.ts";

type Company = { id: string; corporate_name: string };
type Aircraft = { id: string; registration: string; model: string; manufacturer: string; airworthiness_status: string };
type WorkOrder = {
  id: string;
  number: string;
  step: number;
  status: string;
  work_type: string;
  requires_segvoo: boolean;
  crs_issued: boolean;
  registration: string;
};
type Part = { id: string; part_number: string; serial_number: string | null; condition: string; tag: string; status: string; form_8130_3: string | null };
type Tool = { id: string; identification: string; description: string | null; status: string; calibration_expiry: string | null };
type Ad = { id: string; ad_number: string; status: string; description: string | null; registration: string };
type Manual = { id: string; title: string; kind: string; revision: string | null };
type Overview = {
  steps: Record<string, string>;
  counts: { aircraft: number; open_os: number; parts: number; tools: number; ads_pending: number };
  organizations: { id: string; com_number: string; status: string; corporate_name: string }[];
  aircraft: Aircraft[];
  workOrders: WorkOrder[];
  parts: Part[];
  tools: Tool[];
  ads: Ad[];
  manuals: Manual[];
};

const MR = APP_DEFS.find((a) => a.id === "mr")!;

function useMro() {
  const [data, setData] = useState<Overview | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    void api<Overview>("/api/mro").then((r) => r.data && setData(r.data));
    void api<{ companies: Company[] }>("/api/identity/me").then((r) => r.data && setCompanies(r.data.companies));
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
  return { data, companies, error, post };
}

function Cards({ data }: { data: Overview | null }) {
  const cards = [
    ["Aeronaves", data?.counts.aircraft ?? "—"],
    ["OS abertas", data?.counts.open_os ?? "—"],
    ["Pecas", data?.counts.parts ?? "—"],
    ["Ferramentas", data?.counts.tools ?? "—"],
    ["ADs pendentes", data?.counts.ads_pending ?? "—"],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-3">
          <div className="text-[11px] text-[var(--muted)]">{label}</div>
          <div className="mono mt-1 text-2xl font-semibold">{value}</div>
        </div>
      ))}
    </div>
  );
}

export function MroDashboardPage() {
  const { data, error } = useMro();
  return (
    <div className="space-y-3">
      {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
      <Cards data={data} />
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-2 text-sm font-semibold">ERP Manutencao 43/145</h2>
        <p className="text-[13px] text-[var(--muted)]">Oficina em 12 etapas. APRS/CRS a partir da etapa 9. SEGVOO em grande reparo/alteracao.</p>
      </section>
    </div>
  );
}

export function MroOficinaPage() {
  const { data, error, post } = useMro();
  const location = useLocation();
  const stepFromPath = (): number | null => {
    const map: Record<string, number> = {
      "/mr/oficina/recebimento": 1,
      "/mr/oficina/inspecao": 2,
      "/mr/oficina/planejamento": 3,
      "/mr/oficina/desmontagem": 4,
      "/mr/oficina/reparos": 5,
      "/mr/oficina/montagem": 6,
      "/mr/oficina/testes": 7,
      "/mr/oficina/inspecao-final": 8,
      "/mr/oficina/documentacao": 9,
      "/mr/oficina/liberacao": 10,
      "/mr/oficina/entrega": 11,
      "/mr/oficina/pos": 12,
    };
    return map[location.pathname] ?? null;
  };
  const focus = stepFromPath();
  const orders = (data?.workOrders ?? []).filter((o) => (focus ? o.step === focus : true));
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/mro/work-orders", {
            aircraftId: fd.get("aircraftId"),
            workType: fd.get("workType"),
            technicalDataRef: fd.get("technicalDataRef") || undefined,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Abrir OS</h2>
        <select name="aircraftId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.aircraft ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.registration} · {a.model}
            </option>
          ))}
        </select>
        <select name="workType" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>PREVENTIVA</option>
          <option>CORRETIVA</option>
          <option>INSPECAO</option>
          <option>REVISAO</option>
          <option>GRANDE_REPARO</option>
          <option>GRANDE_ALTERACAO</option>
        </select>
        <input name="technicalDataRef" placeholder="AMM/SRM/CMM" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Abrir</button>
      </form>
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">{focus ? `Etapa ${focus} · ${data?.steps[String(focus)] ?? ""}` : "Oficina 12 etapas"}</h2>
        {orders.map((o) => (
          <div key={o.id} className="border-t border-[var(--border)] py-2 text-[13px]">
            {o.number} · {o.registration} · {o.work_type} · etapa {o.step} {data?.steps[String(o.step)]}
            {o.requires_segvoo ? " · SEGVOO" : ""}
            {o.crs_issued ? " · CRS" : ""}
            <div className="mt-1 flex flex-wrap gap-1">
              {o.step < 12 && (
                <button
                  type="button"
                  onClick={() => void post(`/api/mro/work-orders/${o.id}/advance`, { toStep: o.step + 1 })}
                  className="h-7 rounded border border-[var(--border)] px-2 text-[11px]"
                >
                  Avancar
                </button>
              )}
              {o.step >= 9 && !o.crs_issued && (
                <button
                  type="button"
                  onClick={() => void post(`/api/mro/work-orders/${o.id}/crs`, {})}
                  className="h-7 rounded border border-[var(--border)] px-2 text-[11px]"
                >
                  Emitir APRS/CRS
                </button>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-[12px] text-[var(--muted)]">Nenhuma OS nesta etapa.</p>}
      </section>
    </div>
  );
}

export function MroRegistrosPage() {
  const { data, companies, error, post } = useMro();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/mro/organizations", { companyId: fd.get("companyId"), comNumber: fd.get("comNumber"), eoNumber: fd.get("eoNumber") || undefined });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">OM / COM</h2>
        <select name="companyId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.corporate_name}</option>
          ))}
        </select>
        <input name="comNumber" required placeholder="COM" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="eoNumber" placeholder="EO" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Registrar OM</button>
        <div className="mt-3">
          {(data?.organizations ?? []).map((o) => (
            <div key={o.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {o.corporate_name} · COM {o.com_number} · {o.status}
            </div>
          ))}
        </div>
      </form>
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/mro/aircraft", { registration: fd.get("registration"), model: fd.get("model"), manufacturer: fd.get("manufacturer") });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Aeronave</h2>
        <input name="registration" required placeholder="PP-XXX" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="model" required placeholder="Modelo" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="manufacturer" required placeholder="Fabricante" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Registrar</button>
        <div className="mt-3">
          {(data?.aircraft ?? []).map((a) => (
            <div key={a.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {a.registration} · {a.manufacturer} {a.model} · {a.airworthiness_status}
            </div>
          ))}
        </div>
      </form>
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4 lg:col-span-2">
        <h2 className="mb-2 text-sm font-semibold">OS / FORM 8130-3 / SEGVOO</h2>
        {(data?.workOrders ?? []).map((o) => (
          <div key={o.id} className="border-t border-[var(--border)] py-2 text-[13px]">
            {o.number} · {o.registration} · {o.work_type} · etapa {o.step}
            {o.requires_segvoo ? " · SEGVOO 001" : ""}
            {o.crs_issued ? " · CRS emitido" : ""}
          </div>
        ))}
        {(data?.parts ?? []).filter((p) => p.form_8130_3).map((p) => (
          <div key={p.id} className="border-t border-[var(--border)] py-2 text-[13px]">
            FORM 8130-3 {p.form_8130_3} · PN {p.part_number}
          </div>
        ))}
      </section>
    </div>
  );
}

export function MroSuprimentosPage() {
  const { data, error, post } = useMro();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/mro/parts", {
            partNumber: fd.get("partNumber"),
            serialNumber: fd.get("serialNumber") || undefined,
            condition: fd.get("condition"),
            certificationType: fd.get("certificationType"),
            form81303: fd.get("form81303") || undefined,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Estoque tecnico</h2>
        <input name="partNumber" required placeholder="PN" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="serialNumber" placeholder="SN" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <select name="condition" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>NOVA</option>
          <option>USADA_SERVICAVEL</option>
          <option>REVISADA</option>
          <option>REPARADA</option>
          <option>USADA_NAO_SERVICAVEL</option>
        </select>
        <select name="certificationType" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>PMA</option>
          <option>TSO</option>
          <option>TC</option>
          <option>STC</option>
          <option>OTP</option>
          <option>PADRAO</option>
        </select>
        <input name="form81303" placeholder="FORM 8130-3" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Incluir peca</button>
        <div className="mt-3">
          {(data?.parts ?? []).map((p) => (
            <div key={p.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {p.part_number} · {p.condition} · {p.tag} · {p.status}
            </div>
          ))}
        </div>
      </form>
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/mro/tools", {
            identification: fd.get("identification"),
            description: fd.get("description") || undefined,
            calibrationStandard: fd.get("calibrationStandard") || undefined,
            calibrationExpiry: fd.get("calibrationExpiry") || undefined,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Ferramentaria</h2>
        <input name="identification" required placeholder="ID" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="description" placeholder="Descricao" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <select name="calibrationStandard" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option value="">Sem calibracao</option>
          <option>RBC_INMETRO</option>
          <option>FABRICANTE_OEM</option>
          <option>PADRAO_RASTREAVEL_INTERNACIONAL</option>
        </select>
        <input name="calibrationExpiry" type="date" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Incluir ferramenta</button>
        <div className="mt-3">
          {(data?.tools ?? []).map((t) => (
            <div key={t.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {t.identification} · {t.status}
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}

export function MroBibliotecaPage() {
  const { data, error, post } = useMro();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/mro/manuals", { title: fd.get("title"), kind: fd.get("kind"), revision: fd.get("revision") || undefined });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Manuais</h2>
        <input name="title" required placeholder="Titulo" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <select name="kind" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>AMM</option>
          <option>SRM</option>
          <option>CMM</option>
          <option>IPC</option>
          <option>SB</option>
        </select>
        <input name="revision" placeholder="Revisao" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Incluir</button>
        <div className="mt-3">
          {(data?.manuals ?? []).map((m) => (
            <div key={m.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {m.kind} · {m.title} {m.revision ?? ""}
            </div>
          ))}
        </div>
      </form>
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/mro/ads", { aircraftId: fd.get("aircraftId"), adNumber: fd.get("adNumber"), description: fd.get("description") || undefined });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">ADs</h2>
        <select name="aircraftId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.aircraft ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.registration}</option>
          ))}
        </select>
        <input name="adNumber" required placeholder="AD-XXXX" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="description" placeholder="Descricao" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Registrar AD</button>
        <div className="mt-3">
          {(data?.ads ?? []).map((d) => (
            <div key={d.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {d.ad_number} · {d.registration} · {d.status}
              {d.status === "PENDENTE" && (
                <button type="button" onClick={() => void post(`/api/mro/ads/${d.id}/comply`, {})} className="ml-2 h-7 rounded border border-[var(--border)] px-2 text-[11px]">
                  Cumprir
                </button>
              )}
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}

export function mroElement(path: string, group?: NavGroup, child?: NavChild) {
  if (path === "/mr") return <MroDashboardPage />;
  if (path.startsWith("/mr/oficina")) return <MroOficinaPage />;
  if (path.startsWith("/mr/registros")) return <MroRegistrosPage />;
  if (path.startsWith("/mr/suprimentos")) return <MroSuprimentosPage />;
  if (path.startsWith("/mr/biblioteca")) return <MroBibliotecaPage />;
  return <AppDashboardPage app={MR} group={group} child={child} />;
}
