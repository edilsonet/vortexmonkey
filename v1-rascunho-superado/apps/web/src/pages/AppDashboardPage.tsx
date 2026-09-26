import { NavLink } from "react-router-dom";
import type { AppDef, NavChild, NavGroup } from "../shell/nav.ts";

function kpis(group?: NavGroup, child?: NavChild) {
  const n = (child?.label ?? group?.label ?? "App").length;
  return [
    ["Itens", String((n % 17) + 3)],
    ["Pendentes N0", String(n % 5)],
    ["Selos N2", String((n % 4) + 1)],
    ["Protocolos", "—"],
  ] as const;
}

export function AppDashboardPage({
  app,
  group,
  child,
}: {
  app: AppDef;
  group?: NavGroup;
  child?: NavChild;
}) {
  const title = child?.label ?? group?.label ?? "Dashboard";
  const cards = kpis(group, child);
  const children = group?.children ?? [];
  return (
    <div className="space-y-3">
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <div className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
          {app.code} · Fase {app.phase}
        </div>
        <h2 className="mt-1 text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-[13px] text-[var(--muted)]">{app.note}</p>
        {child && group && (
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            Menu {group.label} / submenu {child.label}. Dashboard proprio. Dominio na fase {app.phase}.
          </p>
        )}
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-3">
            <div className="text-[11px] text-[var(--muted)]">{label}</div>
            <div className="mono mt-1 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>
      {children.length > 0 && !child && (
        <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-3">
          <div className="mb-2 text-[11px] text-[var(--muted)]">Submenus</div>
          <div className="flex flex-wrap gap-1.5">
            {children.map((c) => (
              <NavLink
                key={c.to}
                to={c.to}
                className="rounded-md border border-[var(--border)] px-2 py-1 text-[12px] text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-white"
              >
                {c.label}
              </NavLink>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
