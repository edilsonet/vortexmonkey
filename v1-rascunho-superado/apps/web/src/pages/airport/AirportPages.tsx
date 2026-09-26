import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api.ts";
import { AppDashboardPage } from "../AppDashboardPage.tsx";
import { APP_DEFS, type NavChild, type NavGroup } from "../../shell/nav.ts";

type Company = { id: string; corporate_name: string };
type Aerodrome = { id: string; icao_code: string; name: string; fire_category: string | null; status: string; corporate_name: string };
type Pavement = { id: string; runway_designator: string; pcn: string | null; iri_m_km: string | null; macrotexture_mm: string | null; icao_code: string };
type Rcr = { id: string; runway_designator: string; rwycc_t1: number; rwycc_t2: number; rwycc_t3: number; rcr_message: string; sent_to_twr: boolean; icao_code: string };
type Fire = { id: string; incident_type: string; response_time_seconds: number; within_limit: boolean; icao_code: string };
type Fauna = { id: string; event_type: string; species: string | null; count: number; risk_grade: string; sent_to_sigra: boolean; icao_code: string };
type Maint = { id: string; area: string; notes: string | null; icao_code: string };
type Overview = {
  counts: { aerodromes: number; fire_deviations: number; fauna: number };
  nextSgso: string;
  aerodromes: Aerodrome[];
  pavement: Pavement[];
  rcr: Rcr[];
  fire: Fire[];
  fauna: Fauna[];
  maintenance: Maint[];
};

const AP = APP_DEFS.find((a) => a.id === "ap")!;

function useAp() {
  const [data, setData] = useState<Overview | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    void api<Overview>("/api/airport").then((r) => r.data && setData(r.data));
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

export function ApDashboardPage() {
  const { data, error } = useAp();
  return (
    <div className="space-y-3">
      {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Aerodromos", data?.counts.aerodromes ?? "—"],
          ["SESCINC desvios", data?.counts.fire_deviations ?? "—"],
          ["Fauna", data?.counts.fauna ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-3">
            <div className="text-[11px] text-[var(--muted)]">{label}</div>
            <div className="mono mt-1 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-2 text-sm font-semibold">ERP Aerodromos 153</h2>
        <p className="text-[13px] text-[var(--muted)]">Proximo SGSO quadrimestral: {data?.nextSgso ?? "—"}</p>
      </section>
    </div>
  );
}

export function ApPistaPage() {
  const { data, companies, error, post } = useAp();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/airport/aerodromes", {
            companyId: fd.get("companyId"),
            icaoCode: fd.get("icaoCode"),
            name: fd.get("name"),
            fireCategory: fd.get("fireCategory") || undefined,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Aerodromo</h2>
        <select name="companyId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.corporate_name}</option>
          ))}
        </select>
        <input name="icaoCode" required placeholder="SBSP" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="name" required placeholder="Nome" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <select name="fireCategory" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>CAT_5</option>
          <option>CAT_6</option>
          <option>CAT_7</option>
          <option>CAT_8</option>
        </select>
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Registrar</button>
        <div className="mt-3">
          {(data?.aerodromes ?? []).map((a) => (
            <div key={a.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {a.icao_code} · {a.name} · {a.fire_category}
            </div>
          ))}
        </div>
      </form>
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/airport/pavement", {
            aerodromeId: fd.get("aerodromeId"),
            runwayDesignator: fd.get("runwayDesignator"),
            pcn: fd.get("pcn") || undefined,
            iri: Number(fd.get("iri")),
            macrotexture: Number(fd.get("macrotexture")),
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">PCN / IRI / macrotextura</h2>
        <select name="aerodromeId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.aerodromes ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.icao_code}</option>
          ))}
        </select>
        <input name="runwayDesignator" required defaultValue="09/27" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="pcn" placeholder="PCN" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="iri" type="number" step="0.1" defaultValue={2.0} className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="macrotexture" type="number" step="0.01" defaultValue={0.7} className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Incluir</button>
        <div className="mt-3">
          {(data?.pavement ?? []).map((p) => (
            <div key={p.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {p.icao_code} {p.runway_designator} · IRI {p.iri_m_km} · mac {p.macrotexture_mm}
            </div>
          ))}
        </div>
      </form>
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4 lg:col-span-2"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/airport/rcr", {
            aerodromeId: fd.get("aerodromeId"),
            runwayDesignator: fd.get("runwayDesignator"),
            rwyccT1: Number(fd.get("rwyccT1")),
            rwyccT2: Number(fd.get("rwyccT2")),
            rwyccT3: Number(fd.get("rwyccT3")),
            contaminant: fd.get("contaminant") || undefined,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">RWYCC / RCR</h2>
        <div className="grid gap-2 sm:grid-cols-5">
          <select name="aerodromeId" className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
            {(data?.aerodromes ?? []).map((a) => (
              <option key={a.id} value={a.id}>{a.icao_code}</option>
            ))}
          </select>
          <input name="runwayDesignator" defaultValue="09/27" className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
          <input name="rwyccT1" type="number" defaultValue={6} className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
          <input name="rwyccT2" type="number" defaultValue={6} className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
          <input name="rwyccT3" type="number" defaultValue={5} className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        </div>
        <select name="contaminant" className="mt-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option value="">Contaminante (opcional RCAM)</option>
          <option>SECO</option>
          <option>UMIDO</option>
          <option>MOLHADO</option>
          <option>GELO</option>
        </select>
        <button className="mt-3 h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Emitir RCR</button>
        <div className="mt-3">
          {(data?.rcr ?? []).map((r) => (
            <div key={r.id} className="border-t border-[var(--border)] py-2 font-mono text-[12px]">
              {r.rcr_message} {r.sent_to_twr ? "TWR" : ""}
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}

export function ApSescincPage() {
  const { data, error, post } = useAp();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/airport/sescinc", {
            aerodromeId: fd.get("aerodromeId"),
            incidentType: fd.get("incidentType"),
            responseTimeSeconds: Number(fd.get("responseTimeSeconds")),
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">SESCINC &lt;= 3 min</h2>
        <select name="aerodromeId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.aerodromes ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.icao_code}</option>
          ))}
        </select>
        <input name="incidentType" defaultValue="EXERCICIO" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="responseTimeSeconds" type="number" defaultValue={120} className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Registrar</button>
      </form>
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Respostas</h2>
        {(data?.fire ?? []).map((f) => (
          <div key={f.id} className="border-t border-[var(--border)] py-2 text-[13px]">
            {f.icao_code} · {f.incident_type} · {f.response_time_seconds}s · {f.within_limit ? "OK" : "DESVIO"}
          </div>
        ))}
      </section>
    </div>
  );
}

export function ApFaunaPage() {
  const { data, error, post } = useAp();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/airport/fauna", {
            aerodromeId: fd.get("aerodromeId"),
            eventType: fd.get("eventType"),
            species: fd.get("species") || undefined,
            count: Number(fd.get("count") || 1),
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">SIGRA</h2>
        <select name="aerodromeId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.aerodromes ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.icao_code}</option>
          ))}
        </select>
        <select name="eventType" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>AVISTAMENTO</option>
          <option>COLISAO</option>
        </select>
        <input name="species" placeholder="Especie" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="count" type="number" defaultValue={10} className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Enviar SIGRA</button>
      </form>
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Eventos</h2>
        {(data?.fauna ?? []).map((e) => (
          <div key={e.id} className="border-t border-[var(--border)] py-2 text-[13px]">
            {e.icao_code} · {e.event_type} · {e.species} · R={e.risk_grade}
          </div>
        ))}
      </section>
    </div>
  );
}

export function ApInfraPage() {
  const { data, error, post } = useAp();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/airport/maintenance", {
            aerodromeId: fd.get("aerodromeId"),
            area: fd.get("area"),
            notes: fd.get("notes") || undefined,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Manutencao 8 areas</h2>
        <select name="aerodromeId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.aerodromes ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.icao_code}</option>
          ))}
        </select>
        <select name="area" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>PISTA</option>
          <option>TAXIWAY</option>
          <option>PATIO</option>
          <option>SINALIZACAO</option>
          <option>ILUMINACAO</option>
          <option>ELETRICA</option>
          <option>EQUIPAMENTOS</option>
          <option>VEICULOS</option>
        </select>
        <input name="notes" placeholder="Notas" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Registrar</button>
      </form>
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Areas</h2>
        {(data?.maintenance ?? []).map((m) => (
          <div key={m.id} className="border-t border-[var(--border)] py-2 text-[13px]">
            {m.icao_code} · {m.area} {m.notes ?? ""}
          </div>
        ))}
      </section>
    </div>
  );
}

export function ApSgsoPage() {
  const { data, error } = useAp();
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
      {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
      <h2 className="mb-2 text-sm font-semibold">SGSO quadrimestral</h2>
      <p className="text-[13px] text-[var(--muted)]">Proxima entrega 20/01, 20/05 ou 20/09: {data?.nextSgso ?? "—"}</p>
    </div>
  );
}

export function airportElement(path: string, group?: NavGroup, child?: NavChild) {
  if (path === "/ap") return <ApDashboardPage />;
  if (path.startsWith("/ap/pista")) return <ApPistaPage />;
  if (path.startsWith("/ap/sescinc")) return <ApSescincPage />;
  if (path.startsWith("/ap/fauna")) return <ApFaunaPage />;
  if (path.startsWith("/ap/infra")) return <ApInfraPage />;
  if (path.startsWith("/ap/sgso")) return <ApSgsoPage />;
  return <AppDashboardPage app={AP} group={group} child={child} />;
}
