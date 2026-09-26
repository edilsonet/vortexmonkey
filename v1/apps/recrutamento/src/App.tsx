import '@vortex/ui-core/styles.css';
import { Badge, Card } from '@vortex/ui-core';
import { ArrowUpRight, Clock3, ShieldCheck } from 'lucide-react';

export default function App(): React.JSX.Element {
  return <section aria-labelledby="module-title">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><Badge tone="info">Remote federado isolado</Badge><h1 id="module-title" className="mt-3 text-3xl font-bold tracking-tight">Recrutamento</h1><p className="mt-2 max-w-2xl text-[var(--vtx-text-muted)]">Capital humano técnico e elegibilidade regulatória.</p></div><Badge tone="warning">Planejado para fase posterior</Badge></div>
    <div className="grid gap-4 md:grid-cols-3"><Card><ShieldCheck className="mb-3 text-[var(--vtx-primary)]"/><h2 className="font-bold">Limite de domínio</h2><p className="mt-2 text-sm text-[var(--vtx-text-muted)]">Código e rotas permanecem isolados neste remote.</p></Card><Card><ArrowUpRight className="mb-3 text-[var(--vtx-primary)]"/><h2 className="font-bold">API central</h2><p className="mt-2 text-sm text-[var(--vtx-text-muted)]">O módulo consumirá contratos versionados da API VORTEX.</p></Card><Card><Clock3 className="mb-3 text-[var(--vtx-primary)]"/><h2 className="font-bold">Próxima entrega</h2><p className="mt-2 text-sm text-[var(--vtx-text-muted)]">As regras de domínio serão implementadas na parte canônica correspondente.</p></Card></div>
  </section>;
}
