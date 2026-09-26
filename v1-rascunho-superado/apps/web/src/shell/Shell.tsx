import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  ClipboardList,
  Fingerprint,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  Package,
  Plane,
  ScrollText,
  Search,
  Settings,
  Shield,
  Sparkles,
  Store,
  UserRound,
  Users,
  Wrench,
  Briefcase,
  Link2,
  FileText,
  Moon,
  Mail,
  MessageSquare,
  Megaphone,
  PanelLeft,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../lib/auth.tsx";
import { api } from "../lib/api.ts";
import { VortexBrand } from "./Brand.tsx";
import {
  APPS,
  COMM_ITEMS,
  appFromPath,
  appTarget,
  childActive,
  groupsFor,
  groupMatches,
  isAdminRole,
  pageTitle,
  persistApp,
  type NavGroup,
} from "./nav.ts";
import { cycleTheme } from "../pages/PersonalizacaoPage.tsx";

const icons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  pessoal: UserRound,
  profissional: Briefcase,
  empresarial: Building2,
  estoque: Package,
  documentos: FileText,
  protocolo: ScrollText,
  ledger: Link2,
  recrutamento: Users,
  assinaturas: Sparkles,
  ppsp: ShieldAlert,
  personalizacao: Moon,
  seguranca: Shield,
  configuracoes: Settings,
  busca: Search,
  insercao: Package,
  classificacao: ClipboardList,
  vitrine: Store,
  pedidos: ScrollText,
  comissoes: Sparkles,
  banners: Megaphone,
  vagas: Briefcase,
  candidaturas: Users,
  curriculos: FileText,
  comercial: Store,
  rh: Users,
  financeiro: Landmark,
  contabilidade: ScrollText,
  compras: Package,
  biblioteca: BookOpen,
  suprimentos: Wrench,
  registros: ClipboardList,
  oficina: Wrench,
  qualidade: Shield,
  relatorios: FileText,
  config: Settings,
  operacoes: Plane,
  frota: Plane,
  manutencao: Wrench,
  aeroagricola: Plane,
  cursos: GraduationCap,
  fstd: GraduationCap,
  certificados: FileText,
  s141: BookOpen,
  pista: Plane,
  sescinc: ShieldAlert,
  fauna: Shield,
  infra: Building2,
  sgso: Shield,
};

function iconFor(id: string): LucideIcon {
  const key = id.includes("-") ? id.slice(id.lastIndexOf("-") + 1) : id;
  return icons[id] ?? icons[key] ?? LayoutDashboard;
}

const COLLAPSE_KEY = "vortex.nav.collapsed";
const OPEN_KEY = "vortex.nav.open";

function loadOpen(): string[] {
  try {
    const raw = localStorage.getItem(OPEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function Shell() {
  const { logout, roles } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const appId = appFromPath(location.pathname);
  const app = APPS.find((a) => a.id === appId) ?? APPS.find((a) => a.id === "rc")!;
  const groups = useMemo(() => groupsFor(roles, appId), [roles, appId]);
  const admin = isAdminRole(roles);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");
  const [openIds, setOpenIds] = useState<string[]>(loadOpen);
  const [alertTotal, setAlertTotal] = useState(0);

  const title = useMemo(() => pageTitle(location.pathname, groups), [groups, location.pathname]);

  useEffect(() => {
    persistApp(appId);
  }, [appId]);

  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    el?.scrollIntoView({ block: "start" });
  }, [location.pathname, location.hash]);

  useEffect(() => {
    void api<{ total: number }>("/api/alerts/badges").then((r) => {
      if (r.data) setAlertTotal(r.data.total);
    });
  }, [location.pathname]);

  useEffect(() => {
    const match = groups.find((g) => groupMatches(g, location.pathname));
    if (!match?.children?.length) return;
    setOpenIds((prev) => {
      if (prev.includes(match.id)) return prev;
      const next = [...prev, match.id];
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      return next;
    });
  }, [groups, location.pathname]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setOpenIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      <aside
        className={`flex shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elev)] ${collapsed ? "w-14" : "w-[240px]"}`}
        aria-label={`Navegacao ${app.label}`}
      >
        <div
          className={`flex border-b border-[var(--border)] ${
            collapsed ? "h-auto flex-col items-center gap-1 px-1 py-2" : "h-12 items-center gap-2 px-2.5"
          }`}
        >
          <VortexBrand collapsed={collapsed} />
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir" : "Recolher"}
            className={`grid size-8 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-white ${collapsed ? "" : "ml-auto"}`}
          >
            <PanelLeft size={16} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-1.5" aria-label={`Modulos ${app.label}`}>
          {groups.map((group) => (
            <MenuGroup
              key={group.id}
              group={group}
              collapsed={collapsed}
              open={openIds.includes(group.id)}
              pathname={location.pathname}
              hash={location.hash}
              onToggle={() => toggleGroup(group.id)}
              onExpand={() => {
                if (collapsed) {
                  setCollapsed(false);
                  localStorage.setItem(COLLAPSE_KEY, "0");
                }
                if (group.children?.length) {
                  setOpenIds((prev) => {
                    if (prev.includes(group.id)) return prev;
                    const next = [...prev, group.id];
                    localStorage.setItem(OPEN_KEY, JSON.stringify(next));
                    return next;
                  });
                }
              }}
            />
          ))}
        </nav>
        {!collapsed && (
          <div className="border-t border-[var(--border)] p-2 text-[11px] text-[var(--muted)]">
            {app.label} · {admin ? "admin" : "usuario"}
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-elev)]/95 backdrop-blur">
          <div className="flex h-12 items-center gap-2 px-3">
            <div className="relative hidden min-w-40 md:block md:min-w-56">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] pl-7 pr-2 text-[13px] outline-none"
                placeholder="Buscar pessoas, protocolos..."
                aria-label="Buscar"
              />
            </div>
            <div className="mx-auto flex items-center gap-1 overflow-x-auto" aria-label="Aplicativos">
              {APPS.map((item) => {
                const target = appTarget(item);
                const active = item.id === appId;
                return (
                  <button
                    key={item.code}
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      persistApp(item.id);
                      navigate(target);
                    }}
                    className={`grid size-7 shrink-0 place-items-center rounded-md text-[10px] font-bold ${
                      active ? "bg-[var(--accent)] text-black" : "text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-white"
                    }`}
                  >
                    {item.code}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1">
              {COMM_ITEMS.map((item) => {
                const Icon = item.id === "chat" ? MessageSquare : item.id === "alertas" ? Bell : item.id === "emails" ? Mail : Megaphone;
                const active = location.pathname === item.to;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    title={item.label}
                    onClick={() => navigate(item.to)}
                    className={`relative grid size-8 place-items-center rounded-md ${
                      active ? "bg-[var(--bg-hover)] text-white" : "text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-white"
                    }`}
                  >
                    <Icon size={15} />
                    {item.id === "alertas" && alertTotal > 0 && (
                      <span className="absolute right-1 top-1 grid min-w-3.5 place-items-center rounded-full bg-[var(--danger)] px-0.5 text-[8px] font-bold leading-3 text-white">
                        {alertTotal > 9 ? "9+" : alertTotal}
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                aria-label="Tema"
                title="Tema: claro, escuro, personalizado"
                onClick={() => cycleTheme()}
                className="grid size-8 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-white"
              >
                <Moon size={15} />
              </button>
              <button
                type="button"
                onClick={logout}
                className="ml-1 flex h-8 items-center gap-1 rounded-md border border-[var(--border)] px-2 text-[12px] text-[var(--muted)] hover:text-white"
              >
                <Fingerprint size={14} /> Sair
              </button>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">{app.label}</div>
              <h1 className="text-xl font-semibold">{title}</h1>
            </div>
            <span className="mono rounded border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--muted)]">
              {admin ? "ADMIN" : "USUARIO"} · N0-N3
            </span>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function MenuGroup({
  group,
  collapsed,
  open,
  pathname,
  hash,
  onToggle,
  onExpand,
}: {
  group: NavGroup;
  collapsed: boolean;
  open: boolean;
  pathname: string;
  hash: string;
  onToggle: () => void;
  onExpand: () => void;
}) {
  const Icon = iconFor(group.id);
  const active = groupMatches(group, pathname);
  const hasChildren = Boolean(group.children?.length);

  if (collapsed) {
    return (
      <NavLink
        to={group.to}
        end={Boolean(group.exact) || group.to === "/"}
        title={group.label}
        onClick={onExpand}
        className={() =>
          `mb-0.5 flex min-h-9 items-center justify-center rounded-md ${
            active ? "bg-[var(--bg-hover)] text-white" : "text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-white"
          }`
        }
      >
        <Icon size={15} />
      </NavLink>
    );
  }

  return (
    <div className="mb-0.5">
      <div
        className={`flex min-h-9 items-center rounded-md ${
          active ? "bg-[var(--bg-hover)] text-white" : "text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-white"
        }`}
      >
        <NavLink
          to={group.to}
          end={Boolean(group.exact) || group.to === "/"}
          className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-[13px]"
        >
          <Icon size={15} />
          <span className="truncate">{group.label}</span>
        </NavLink>
        {hasChildren && (
          <button
            type="button"
            aria-label={open ? `Recolher ${group.label}` : `Expandir ${group.label}`}
            aria-expanded={open}
            onClick={onToggle}
            className="grid size-8 shrink-0 place-items-center rounded-md hover:text-white"
          >
            <ChevronDown size={14} className={open ? "rotate-180" : ""} />
          </button>
        )}
      </div>
      {hasChildren && open && (
        <div className="ml-4 border-l border-[var(--border)] py-0.5 pl-2">
          {group.children?.map((child) => {
            const on = childActive(child.to, pathname, hash);
            return (
              <NavLink
                key={child.to}
                to={child.to}
                className={`mb-0.5 flex min-h-8 items-center rounded-md px-2 text-[12px] ${
                  on ? "text-white" : "text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-white"
                }`}
              >
                {child.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
