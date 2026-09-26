import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api.ts";
import { AppDashboardPage } from "../AppDashboardPage.tsx";
import { APP_DEFS, type NavChild, type NavGroup } from "../../shell/nav.ts";
import { PpspPage } from "../PpspPage.tsx";

type Company = { id: string; corporate_name: string };
type Operator = {
  id: string;
  operator_type: string;
  coa_number: string | null;
  eo_number: string | null;
  certification_phase: string;
  status: string;
  corporate_name: string;
};
type Aircraft = {
  id: string;
  registration: string;
  model: string;
  aircraft_category: string;
  last_reweigh_date: string | null;
  next_reweigh_date: string | null;
  cva_number: string | null;
  cva_status: string;
  status: string;
};
type Mel = {
  id: string;
  ata_chapter: string;
  item_description: string;
  category: string;
  status: string;
  deferral_deadline: string | null;
  da_applicable: boolean;
  registration: string;
};
type Da = { id: string; da_number: string; status: string; description: string | null; registration: string };
type Logbook = {
  id: string;
  departure_aerodrome: string;
  arrival_aerodrome: string;
  flight_time_hours: string;
  pilot_name: string;
  status: string;
  registration: string;
};
type Dispatch = {
  id: string;
  flight_number: string | null;
  departure: string;
  destination: string;
  flight_rule: string;
  status: string;
  fuel_required_minutes: number;
  fuel_planned_minutes: number;
  registration: string;
};
type Agri = { id: string; cdag_number: string | null; status: string; corporate_name: string };
type Disperser = {
  id: string;
  disperser_type: string;
  status: string;
  calibration_expiry: string | null;
  dgps_installed: boolean;
  registration: string;
};
type Overview = {
  counts: { operators: number; aircraft: number; dispatches_open: number; mel_deferred: number; da_pending: number };
  operators: Operator[];
  aircraft: Aircraft[];
  fleet: { id: string; operator_id: string; aircraft_id: string; status: string; registration: string }[];
  mel: Mel[];
  das: Da[];
  logbook: Logbook[];
  dispatches: Dispatch[];
  manuals: { id: string; manual_type: string; title: string; current_version: string; approval_status: string }[];
  agri: Agri[];
  dispersers: Disperser[];
};

const OP = APP_DEFS.find((a) => a.id === "op")!;

function useOps() {
  const [data, setData] = useState<Overview | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    void api<Overview>("/api/ops").then((r) => r.data && setData(r.data));
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
    ["Operadores", data?.counts.operators ?? "—"],
    ["Aeronaves", data?.counts.aircraft ?? "—"],
    ["Despachos abertos", data?.counts.dispatches_open ?? "—"],
    ["MEL diferidos", data?.counts.mel_deferred ?? "—"],
    ["DA pendentes", data?.counts.da_pending ?? "—"],
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

export function OpsDashboardPage() {
  const { data, error } = useOps();
  return (
    <div className="space-y-3">
      {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
      <Cards data={data} />
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-2 text-sm font-semibold">ERP Operadores 91/119/121/135/137</h2>
        <p className="text-[13px] text-[var(--muted)]">
          Frota com repeso 36 meses. Despacho DOV. MEL/DA. Diario tecnico. Aeroagricola 137.
        </p>
      </section>
    </div>
  );
}

export function OpsFrotaPage() {
  const { data, companies, error, post } = useOps();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/ops/operators", {
            companyId: fd.get("companyId"),
            operatorType: fd.get("operatorType"),
            coaNumber: fd.get("coaNumber") || undefined,
            eoNumber: fd.get("eoNumber") || undefined,
            classification: fd.get("classification") || undefined,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Operador aereo</h2>
        <select name="companyId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.corporate_name}</option>
          ))}
        </select>
        <select name="operatorType" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>RBAC_135</option>
          <option>RBAC_91</option>
          <option>RBAC_121</option>
          <option>RBAC_137</option>
        </select>
        <select name="classification" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option value="">Classificacao 135</option>
          <option>SIMPLES</option>
          <option>PADRAO</option>
        </select>
        <input name="coaNumber" placeholder="COA" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="eoNumber" placeholder="EO" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Registrar</button>
        <div className="mt-3">
          {(data?.operators ?? []).map((o) => (
            <div key={o.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {o.corporate_name} · {o.operator_type} · {o.certification_phase} · COA {o.coa_number ?? "—"}
            </div>
          ))}
        </div>
      </form>
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/ops/aircraft", {
            registration: fd.get("registration"),
            model: fd.get("model"),
            aircraftCategory: fd.get("aircraftCategory"),
            lastReweighDate: fd.get("lastReweighDate") || undefined,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Aeronave / repeso 36 meses</h2>
        <input name="registration" required placeholder="PT-XXX" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="model" required placeholder="Modelo" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <select name="aircraftCategory" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>AVIAO</option>
          <option>HELICOPTERO</option>
          <option>JATO</option>
          <option>TURBOELICE</option>
        </select>
        <input name="lastReweighDate" type="date" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Incluir frota</button>
        <div className="mt-3">
          {(data?.aircraft ?? []).map((a) => (
            <div key={a.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {a.registration} · {a.model} · {a.aircraft_category}
              <div className="text-[11px] text-[var(--muted)]">
                Repeso {a.last_reweigh_date ?? "—"} / prox {a.next_reweigh_date ?? "—"} · CVA {a.cva_status}
              </div>
              <button
                type="button"
                onClick={() => void post(`/api/ops/aircraft/${a.id}/cva`, { cvaNumber: `CVA-${a.registration}` })}
                className="mt-1 h-7 rounded border border-[var(--border)] px-2 text-[11px]"
              >
                Registrar CVA
              </button>
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}

export function OpsDespachoPage() {
  const { data, error, post } = useOps();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/ops/dispatch", {
            aircraftId: fd.get("aircraftId"),
            departure: fd.get("departure"),
            destination: fd.get("destination"),
            flightRule: fd.get("flightRule"),
            fuelPlannedMinutes: Number(fd.get("fuelPlannedMinutes")),
            isNight: fd.get("isNight") === "on",
            hasAlternate: fd.get("hasAlternate") === "on",
            metValid: fd.get("metValid") === "on",
            weightBalanceValid: fd.get("weightBalanceValid") === "on",
            flightNumber: fd.get("flightNumber") || undefined,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Despacho DOV</h2>
        <select name="aircraftId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.aircraft ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.registration} · {a.aircraft_category}</option>
          ))}
        </select>
        <input name="flightNumber" placeholder="Voo" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="departure" required placeholder="SBSP" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="destination" required placeholder="SBRJ" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <select name="flightRule" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>VFR</option>
          <option>IFR</option>
        </select>
        <input name="fuelPlannedMinutes" type="number" required defaultValue={90} className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <label className="mb-1 block text-[12px]"><input type="checkbox" name="isNight" className="mr-1" /> Noite</label>
        <label className="mb-1 block text-[12px]"><input type="checkbox" name="hasAlternate" className="mr-1" /> Alternativa</label>
        <label className="mb-1 block text-[12px]"><input type="checkbox" name="metValid" className="mr-1" defaultChecked /> MET ok</label>
        <label className="mb-3 block text-[12px]"><input type="checkbox" name="weightBalanceValid" className="mr-1" defaultChecked /> P&B ok</label>
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Criar despacho</button>
      </form>
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Liberacoes</h2>
        {(data?.dispatches ?? []).map((d) => (
          <div key={d.id} className="border-t border-[var(--border)] py-2 text-[13px]">
            {d.registration} {d.departure}-{d.destination} · {d.flight_rule} · {d.status}
            <div className="text-[11px] text-[var(--muted)]">
              Combustivel planejado {d.fuel_planned_minutes} / reserva {d.fuel_required_minutes}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {d.status === "RASCUNHO" && (
                <button type="button" onClick={() => void post(`/api/ops/dispatch/${d.id}/validate`, {})} className="h-7 rounded border border-[var(--border)] px-2 text-[11px]">
                  Validar
                </button>
              )}
              {d.status === "VALIDADO" && (
                <button type="button" onClick={() => void post(`/api/ops/dispatch/${d.id}/release`, {})} className="h-7 rounded border border-[var(--border)] px-2 text-[11px]">
                  Liberar
                </button>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export function OpsMelPage() {
  const { data, error, post } = useOps();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/ops/mel", {
            aircraftId: fd.get("aircraftId"),
            ataChapter: fd.get("ataChapter"),
            itemDescription: fd.get("itemDescription"),
            category: fd.get("category"),
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">MEL</h2>
        <select name="aircraftId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.aircraft ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.registration}</option>
          ))}
        </select>
        <input name="ataChapter" required placeholder="ATA" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="itemDescription" required placeholder="Item" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <select name="category" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>CAT_B</option>
          <option>CAT_A</option>
          <option>CAT_C</option>
          <option>CAT_D</option>
        </select>
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Incluir MEL</button>
        <div className="mt-3">
          {(data?.mel ?? []).map((m) => (
            <div key={m.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {m.registration} · ATA {m.ata_chapter} · {m.category} · {m.status}
              <div className="mt-1 flex gap-1">
                {m.status === "OPERACIONAL" && (
                  <button type="button" onClick={() => void post(`/api/ops/mel/${m.id}/defer`, {})} className="h-7 rounded border border-[var(--border)] px-2 text-[11px]">
                    Diferir
                  </button>
                )}
                {m.status === "DIFERIDO" && (
                  <button type="button" onClick={() => void post(`/api/ops/mel/${m.id}/repair`, {})} className="h-7 rounded border border-[var(--border)] px-2 text-[11px]">
                    Reparar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </form>
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/ops/da", {
            aircraftId: fd.get("aircraftId"),
            daNumber: fd.get("daNumber"),
            description: fd.get("description") || undefined,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">DA/FCDA</h2>
        <select name="aircraftId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.aircraft ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.registration}</option>
          ))}
        </select>
        <input name="daNumber" required placeholder="DA-XXXX" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="description" placeholder="Descricao" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Registrar DA</button>
        <div className="mt-3">
          {(data?.das ?? []).map((d) => (
            <div key={d.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {d.da_number} · {d.registration} · {d.status}
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}

export function OpsDiarioPage() {
  const { data, error, post } = useOps();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/ops/logbook", {
            aircraftId: fd.get("aircraftId"),
            departure: fd.get("departure"),
            arrival: fd.get("arrival"),
            pilotName: fd.get("pilotName"),
            pilotLicense: fd.get("pilotLicense"),
            flightTimeHours: Number(fd.get("flightTimeHours") || 0),
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Diario tecnico</h2>
        <select name="aircraftId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.aircraft ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.registration}</option>
          ))}
        </select>
        <input name="departure" required placeholder="SBSP" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="arrival" required placeholder="SBRJ" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="pilotName" required placeholder="Piloto" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="pilotLicense" required placeholder="CANAC" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="flightTimeHours" type="number" step="0.1" defaultValue={1} className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Lancar</button>
      </form>
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Lancamentos</h2>
        {(data?.logbook ?? []).map((l) => (
          <div key={l.id} className="border-t border-[var(--border)] py-2 text-[13px]">
            {l.registration} {l.departure_aerodrome}-{l.arrival_aerodrome} · {l.pilot_name} · {l.status}
            {l.status === "draft" && (
              <button type="button" onClick={() => void post(`/api/ops/logbook/${l.id}/sign`, {})} className="ml-2 h-7 rounded border border-[var(--border)] px-2 text-[11px]">
                Assinar
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

export function OpsAgriPage() {
  const { data, companies, error, post } = useOps();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/ops/agri", { companyId: fd.get("companyId"), cdagNumber: fd.get("cdagNumber") || undefined });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Operador aeroagricola CDAG</h2>
        <select name="companyId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.corporate_name}</option>
          ))}
        </select>
        <input name="cdagNumber" placeholder="CDAG" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Registrar</button>
        <div className="mt-3">
          {(data?.agri ?? []).map((a) => (
            <div key={a.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {a.corporate_name} · CDAG {a.cdag_number ?? "—"} · {a.status}
            </div>
          ))}
        </div>
      </form>
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/ops/dispersers", {
            aircraftId: fd.get("aircraftId"),
            disperserType: fd.get("disperserType"),
            calibrationExpiry: fd.get("calibrationExpiry") || undefined,
            dgpsInstalled: fd.get("dgpsInstalled") === "on",
            dgpsConformity: fd.get("dgpsConformity") || undefined,
          });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Dispersor / DGPS</h2>
        <select name="aircraftId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.aircraft ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.registration}</option>
          ))}
        </select>
        <select name="disperserType" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>LIQUIDOS</option>
          <option>SOLIDOS</option>
          <option>GRANULARES</option>
        </select>
        <input name="calibrationExpiry" type="date" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <label className="mb-2 block text-[12px]"><input type="checkbox" name="dgpsInstalled" className="mr-1" /> DGPS</label>
        <input name="dgpsConformity" placeholder="Declaracao IS 137-002" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Incluir</button>
        <div className="mt-3">
          {(data?.dispersers ?? []).map((d) => (
            <div key={d.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {d.registration} · {d.disperser_type} · {d.status}
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}

export function opsElement(path: string, group?: NavGroup, child?: NavChild) {
  if (path === "/op") return <OpsDashboardPage />;
  if (path.startsWith("/op/frota")) return <OpsFrotaPage />;
  if (path.startsWith("/op/operacoes")) return <OpsDespachoPage />;
  if (path === "/op/manutencao/diario") return <OpsDiarioPage />;
  if (path.startsWith("/op/manutencao")) return <OpsMelPage />;
  if (path.startsWith("/op/aeroagricola")) return <OpsAgriPage />;
  if (path.startsWith("/op/ppsp")) return <PpspPage />;
  return <AppDashboardPage app={OP} group={group} child={child} />;
}
