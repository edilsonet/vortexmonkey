import '@vortex/ui-core/styles.css';
import { Badge, Button, Card, EmptyState, Table } from '@vortex/ui-core';
import { ArrowRight, BadgeCheck, Building2, Fingerprint, ShieldCheck, Users } from 'lucide-react';
import AuditWorkspace from './AuditWorkspace';
import ProtocolWorkspace from './ProtocolWorkspace';

const metrics = [
  { label: 'Pessoas canônicas', value: '1.284', delta: '+32', icon: Users },
  { label: 'Empresas vinculadas', value: '186', delta: '+7', icon: Building2 },
  { label: 'Licenças ativas', value: '2.941', delta: '98,7%', icon: BadgeCheck },
  { label: 'Credenciamentos', value: '312', delta: '14 alertas', icon: ShieldCheck },
];
const rows = [
  { name: 'Marina Costa', type: 'PILOTO', document: 'PC · IFRA/MLTE', status: 'Ativo' },
  { name: 'Roberto Alves', type: 'MMA', document: 'MMA · CEL/GMP', status: 'Ativo' },
  { name: 'Ana Martins', type: 'EXAMINADOR', document: 'PCA · Grupo B', status: 'Vence em 42 dias' },
];

export default function App(): React.JSX.Element {
  const path = window.location.pathname;
  if (path.startsWith('/protocolos')) return <ProtocolWorkspace />;
  if (path.startsWith('/auditoria')) return <AuditWorkspace />;
  return <Overview />;
}

function Overview(): React.JSX.Element {
  return <section aria-labelledby="rconta-title">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><Badge tone="success">MDM operacional</Badge><h1 id="rconta-title" className="mt-3 text-3xl font-bold tracking-tight">Rconta</h1><p className="mt-2 max-w-2xl text-[var(--vtx-text-muted)]">Identidade única, protocolo eletrônico e trilha imutável para o ecossistema VORTEX.</p></div><Button><Fingerprint size={17}/>Cadastrar pessoa</Button></div>
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, delta, icon: Icon }) => <Card key={label}><div className="mb-4 flex items-center justify-between"><span className="grid size-10 place-items-center rounded-lg bg-[var(--vtx-primary-soft)] text-[var(--vtx-primary)]"><Icon size={19}/></span><Badge tone={delta.includes('alertas') ? 'warning' : 'success'}>{delta}</Badge></div><div className="text-2xl font-black">{value}</div><div className="mt-1 text-sm text-[var(--vtx-text-muted)]">{label}</div></Card>)}</div>
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]"><Card className="p-0"><div className="flex items-center justify-between border-b border-[var(--vtx-border)] p-5"><div><h2 className="font-bold">Perfis recentes</h2><p className="text-sm text-[var(--vtx-text-muted)]">Fonte canônica do ecossistema</p></div><Button variant="ghost">Ver todos<ArrowRight size={16}/></Button></div><div className="p-5"><Table><thead><tr className="border-b border-[var(--vtx-border)] text-xs uppercase text-[var(--vtx-text-muted)]"><th className="p-3">Pessoa</th><th className="p-3">Tipo</th><th className="p-3">Documento</th><th className="p-3">Estado</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name} className="border-b border-[var(--vtx-border)] last:border-0"><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.type}</td><td className="p-3">{row.document}</td><td className="p-3"><Badge tone={row.status === 'Ativo' ? 'success' : 'warning'}>{row.status}</Badge></td></tr>)}</tbody></Table></div></Card><Card><h2 className="mb-1 font-bold">Integridade e conformidade</h2><p className="mb-5 text-sm text-[var(--vtx-text-muted)]">Estado dos vergalhões regulatórios.</p><div className="grid gap-3"><Status label="RLS PostgreSQL"/><Status label="Ledger SHA-256 + Ed25519"/><Status label="Protocolo eletrônico"/><Status label="Auditoria imutável"/></div><div className="mt-5"><EmptyState title="Nenhum bloqueio crítico" description="Cadeia íntegra no contexto atual."/></div></Card></div>
  </section>;
}

function Status({ label }: { label: string }) { return <div className="flex items-center justify-between rounded-lg border border-[var(--vtx-border)] px-3 py-2"><span className="text-sm font-medium">{label}</span><Badge tone="success">Ativo</Badge></div>; }
