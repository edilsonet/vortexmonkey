import { lazy, Suspense, useMemo, useState } from 'react';
import { Bell, Building2, ChevronDown, Command, HelpCircle, LayoutDashboard, Menu, PanelLeftClose, Search, Settings, ShieldCheck, Users } from 'lucide-react';
import { FEDERATED_APPS, getAppFromHostname, type AppId, type FederatedAppRegistration } from '@vortex/contracts-fe';
import { Avatar, Badge, Button, Input, Spinner, ThemeToggle, Tooltip, VortexLogo } from '@vortex/ui-core';
import { RemoteErrorBoundary } from './ErrorBoundary';

const cn = (...classes: ReadonlyArray<string | false | null | undefined>): string => classes.filter(Boolean).join(' ');

const remoteLoaders: Record<AppId, () => Promise<{ default: import('react').ComponentType }>> = {
  rconta: () => import('rconta/App'), catalogo: () => import('catalogo/App'), rloja: () => import('rloja/App'), recrutamento: () => import('recrutamento/App'),
  mro: () => import('mro/App'), ops: () => import('ops/App'), training: () => import('training/App'), airport: () => import('airport/App'),
};
const navigationIcons = { LayoutDashboard, Users, Building2, ShieldCheck } as const;
const appGlyphs: Record<AppId, string> = { rconta: 'RC', catalogo: 'CC', rloja: 'RL', recrutamento: 'RH', mro: 'MR', ops: 'OP', training: 'TR', airport: 'AP' };

export function App(): React.JSX.Element {
  const [compact, setCompact] = useState(false);
  const activeApp = getAppFromHostname(window.location.hostname);
  const RemoteApp = useMemo(() => lazy(remoteLoaders[activeApp.id]), [activeApp.id]);
  return <div className="min-h-screen bg-[var(--vtx-bg)]">
    <aside className={cn('fixed inset-y-0 left-0 z-30 hidden border-r border-[var(--vtx-border)] bg-[#071B36] text-white transition-all lg:block', compact ? 'w-20' : 'w-64')}>
      <div className="flex h-18 items-center gap-3 border-b border-white/10 px-5"><VortexLogo className="size-9 shrink-0" variant="white"/>{!compact && <div><strong className="tracking-[.18em]">VORTEX</strong><div className="text-[10px] text-blue-200">AVIAÇÃO CIVIL</div></div>}</div>
      <nav className="p-3" aria-label={`Navegação de ${activeApp.name}`}><div className={cn('mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-blue-200', compact && 'vtx-sr-only')}>Módulo ativo</div>{activeApp.navigation.map((item) => { const Icon = navigationIcons[item.icon as keyof typeof navigationIcons] ?? Command; return <a key={item.id} href={item.href} className="mb-1 flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-blue-50 transition hover:bg-white/10"><Icon size={18}/>{!compact && item.label}</a>; })}</nav>
      <button className="absolute bottom-4 right-3 grid size-9 place-items-center rounded-lg text-blue-100 hover:bg-white/10" onClick={() => setCompact((value) => !value)} aria-label="Recolher barra lateral"><PanelLeftClose size={18}/></button>
    </aside>
    <div className={cn('transition-all', compact ? 'lg:pl-20' : 'lg:pl-64')}>
      <header className="sticky top-0 z-20 border-b border-[var(--vtx-border)] bg-[color:var(--vtx-surface)]/95 backdrop-blur">
        <div className="flex min-h-16 items-center gap-3 px-4 lg:px-6"><Button variant="ghost" className="lg:hidden" aria-label="Abrir menu"><Menu/></Button><div className="hidden min-w-64 md:block"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><Input className="pl-10" placeholder="Buscar pessoas, empresas, protocolos…"/></div></div><div className="mx-auto flex min-w-0 items-center gap-1" aria-label="Aplicativos VORTEX">{FEDERATED_APPS.map((app) => <AppLauncher key={app.id} app={app} active={app.id === activeApp.id}/>)}</div><div className="flex items-center gap-1"><ThemeToggle/><Tooltip label="Ajuda"><Button variant="ghost" aria-label="Ajuda"><HelpCircle size={18}/></Button></Tooltip><Tooltip label="3 alertas"><Button variant="ghost" className="relative" aria-label="Notificações"><Bell size={18}/><span className="absolute right-1 top-1 size-2 rounded-full bg-red-500"/></Button></Tooltip><Avatar name="Edilson Silva"/></div></div>
        <div className="flex items-center justify-between border-t border-[var(--vtx-border)] px-4 py-2 lg:px-6"><div className="flex items-center gap-2 text-sm"><span className="font-semibold">Organização VORTEX</span><ChevronDown size={15}/><Badge tone="info">Ambiente de desenvolvimento</Badge></div><Button variant="ghost" className="hidden sm:inline-flex"><Settings size={16}/>Configurações</Button></div>
      </header>
      <main className="min-h-[calc(100vh-113px)] p-4 lg:p-6"><RemoteErrorBoundary appName={activeApp.name}><Suspense fallback={<div className="grid min-h-96 place-items-center"><Spinner label={`Carregando ${activeApp.name}`}/></div>}><RemoteApp/></Suspense></RemoteErrorBoundary></main>
      <footer className="border-t border-[var(--vtx-border)] px-6 py-4 text-xs text-[var(--vtx-text-muted)]"><div className="flex justify-between"><span>VORTEX Parte 1 · Design System v1.0.0</span><span>Trilha auditável · Tenant como contexto</span></div></footer>
    </div>
  </div>;
}

function AppLauncher({ app, active }: { app: FederatedAppRegistration; active: boolean }) {
  return <Tooltip label={app.name}><a href={`http://${app.subdomain}.vortex.localhost:8080`} aria-current={active ? 'page' : undefined} aria-label={app.name} className={cn('grid size-9 shrink-0 place-items-center rounded-lg text-[10px] font-black transition', active ? 'bg-[var(--vtx-primary)] text-white shadow-md' : 'text-[var(--vtx-text-muted)] hover:bg-[var(--vtx-primary-soft)]')} style={active ? { backgroundColor: app.accent } : undefined}>{appGlyphs[app.id]}</a></Tooltip>;
}
