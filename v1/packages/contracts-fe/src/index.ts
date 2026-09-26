export type AppId = 'rconta' | 'catalogo' | 'rloja' | 'recrutamento' | 'mro' | 'ops' | 'training' | 'airport';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  requiredScopes?: readonly string[];
}

export interface FederatedAppRegistration {
  id: AppId;
  name: string;
  shortName: string;
  subdomain: string;
  remoteName: string;
  remoteEntry: string;
  exposedModule: './App';
  accent: string;
  navigation: readonly NavigationItem[];
}

export const FEDERATED_APPS: readonly FederatedAppRegistration[] = [
  { id: 'rconta', name: 'Rconta', shortName: 'RC', subdomain: 'rconta', remoteName: 'rconta', remoteEntry: 'http://rconta.vortex.localhost:8080/remotes/rconta/remoteEntry.js', exposedModule: './App', accent: '#0B3D91', navigation: [
    { id: 'overview', label: 'Visão geral', href: '/', icon: 'LayoutDashboard' },
    { id: 'people', label: 'Pessoas', href: '/pessoas', icon: 'Users' },
    { id: 'companies', label: 'Empresas', href: '/empresas', icon: 'Building2' },
    { id: 'licenses', label: 'Licenças', href: '/licencas', icon: 'BadgeCheck' },
    { id: 'accreditations', label: 'Credenciamentos', href: '/credenciamentos', icon: 'ShieldCheck' },
    { id: 'protocols', label: 'Protocolos', href: '/protocolos', icon: 'Files' },
    { id: 'audit', label: 'Auditoria', href: '/auditoria', icon: 'FileSearch' },
  ] },
  { id: 'catalogo', name: 'Catálogo Central', shortName: 'CC', subdomain: 'catalogo', remoteName: 'catalogo', remoteEntry: 'http://catalogo.vortex.localhost:8080/remotes/catalogo/remoteEntry.js', exposedModule: './App', accent: '#155E75', navigation: [{ id: 'catalog', label: 'Catálogo', href: '/', icon: 'Library' }] },
  { id: 'rloja', name: 'RLoja', shortName: 'RL', subdomain: 'market', remoteName: 'rloja', remoteEntry: 'http://market.vortex.localhost:8080/remotes/rloja/remoteEntry.js', exposedModule: './App', accent: '#9A3412', navigation: [{ id: 'market', label: 'Marketplace', href: '/', icon: 'Store' }] },
  { id: 'recrutamento', name: 'Recrutamento', shortName: 'RH', subdomain: 'recruta', remoteName: 'recrutamento', remoteEntry: 'http://recruta.vortex.localhost:8080/remotes/recrutamento/remoteEntry.js', exposedModule: './App', accent: '#6B21A8', navigation: [{ id: 'talent', label: 'Talentos', href: '/', icon: 'BriefcaseBusiness' }] },
  { id: 'mro', name: 'ERP 43+145', shortName: 'MRO', subdomain: 'mro', remoteName: 'mro', remoteEntry: 'http://mro.vortex.localhost:8080/remotes/mro/remoteEntry.js', exposedModule: './App', accent: '#991B1B', navigation: [{ id: 'maintenance', label: 'Manutenção', href: '/', icon: 'Wrench' }] },
  { id: 'ops', name: 'ERP Operadores', shortName: 'OPS', subdomain: 'ops', remoteName: 'ops', remoteEntry: 'http://ops.vortex.localhost:8080/remotes/ops/remoteEntry.js', exposedModule: './App', accent: '#1E3A8A', navigation: [{ id: 'operations', label: 'Operações', href: '/', icon: 'Plane' }] },
  { id: 'training', name: 'ERP 141/142', shortName: 'TRN', subdomain: 'training', remoteName: 'training', remoteEntry: 'http://training.vortex.localhost:8080/remotes/training/remoteEntry.js', exposedModule: './App', accent: '#166534', navigation: [{ id: 'training', label: 'Instrução', href: '/', icon: 'GraduationCap' }] },
  { id: 'airport', name: 'ERP 153', shortName: 'APT', subdomain: 'airport', remoteName: 'airport', remoteEntry: 'http://airport.vortex.localhost:8080/remotes/airport/remoteEntry.js', exposedModule: './App', accent: '#334155', navigation: [{ id: 'airport', label: 'Aeródromos', href: '/', icon: 'RadioTower' }] },
] as const;

export const getAppFromHostname = (hostname: string): FederatedAppRegistration => {
  const subdomain = hostname.split('.')[0] ?? 'rconta';
  return FEDERATED_APPS.find((app) => app.subdomain === subdomain) ?? FEDERATED_APPS[0]!;
};
