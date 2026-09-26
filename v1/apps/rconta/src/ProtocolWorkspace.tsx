import type { ApiResponse } from '@vortex/types';
import { Badge, Button, Card, Checkbox, Field, Input, Select, Table, Toast } from '@vortex/ui-core';
import { Eye, FileCheck2, ListTree, LockKeyhole, Search, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ApiContextCard, useVortexClient } from './api-context';

interface PublicProtocol { protocol_number: string; subject: string; entity_type: string; created_at: string }
interface CreatedProtocol { id: string; protocol_number: string; subject: string; access_level: string; created_at: string }
interface TimelineEvent { id: string; event_type: string; description: string; access_level: string; occurred_at: string }
interface ViewRequest { id: string; status: string; response_due_at: string; granted_until?: string }

type AccessLevel = 'PUBLIC' | 'RESTRICTED' | 'PRIVATE';
type RestrictionBasis = 'LGPD_PERSONAL_DATA' | 'BUSINESS_CONFIDENTIALITY' | 'NATIONAL_SECURITY' | 'ONGOING_PROCESS';

export default function ProtocolWorkspace(): React.JSX.Element {
  const context = useVortexClient();
  const [query, setQuery] = useState('');
  const [publicRows, setPublicRows] = useState<PublicProtocol[]>([]);
  const [subject, setSubject] = useState('');
  const [entityId, setEntityId] = useState<string>(() => crypto.randomUUID());
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('RESTRICTED');
  const [restrictionBasis, setRestrictionBasis] = useState<RestrictionBasis>('LGPD_PERSONAL_DATA');
  const [personalData, setPersonalData] = useState(true);
  const [created, setCreated] = useState<CreatedProtocol | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [protocolId, setProtocolId] = useState('');
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [justification, setJustification] = useState('Necessidade de análise técnica e documental do processo.');
  const [viewId, setViewId] = useState('');
  const [decisionReason, setDecisionReason] = useState('Decisão registrada pela empresa proprietária.');

  const search = async () => {
    const result = await context.client.publicSearch<PublicProtocol[]>(query);
    if (result.success) setPublicRows(result.data);
    else setMessage({ tone: 'error', text: result.error.message });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      entityId,
      entityType: 'REGULATORY_PROCESS',
      subject,
      accessLevel,
      containsPersonalData: personalData,
      ...(accessLevel === 'PUBLIC' ? {} : { restrictionBasis }),
    };
    const result: ApiResponse<CreatedProtocol> = await context.client.createProtocol(payload);
    if (result.success) {
      setCreated(result.data);
      setProtocolId(result.data.id);
      setEntityId(crypto.randomUUID());
      setSubject('');
      setMessage({ tone: 'success', text: `Protocolo ${result.data.protocol_number} criado e ancorado no ledger.` });
    } else setMessage({ tone: 'error', text: result.error.message });
  };

  const loadTimeline = async () => {
    const result = await context.client.timeline<TimelineEvent[]>(protocolId);
    if (result.success) setTimeline(result.data); else setMessage({ tone: 'error', text: result.error.message });
  };

  const requestView = async () => {
    const result = await context.client.requestProtocolView<ViewRequest>(protocolId, justification);
    if (result.success) { setViewId(result.data.id); setMessage({ tone: 'success', text: `Vista solicitada. Resposta até ${new Date(result.data.response_due_at).toLocaleString('pt-BR')}.` }); }
    else setMessage({ tone: 'error', text: result.error.message });
  };

  const decideView = async (decision: 'GRANTED' | 'DENIED') => {
    const result = await context.client.decideProtocolView<ViewRequest>(viewId, decision, decisionReason);
    if (result.success) setMessage({ tone: 'success', text: decision === 'GRANTED' ? `Vista concedida até ${new Date(result.data.granted_until ?? '').toLocaleString('pt-BR')}.` : 'Pedido de vista negado.' });
    else setMessage({ tone: 'error', text: result.error.message });
  };

  return <section aria-labelledby="protocol-title" className="grid gap-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><Badge tone="info">Resolução ANAC 520/2019</Badge><h1 id="protocol-title" className="mt-3 text-3xl font-bold tracking-tight">Protocolo eletrônico</h1><p className="mt-2 max-w-3xl text-[var(--vtx-text-muted)]">Numeração atômica AAAA-NNNNNN, timeline imutável, níveis de acesso e vista de processo.</p></div>
      <div className="flex gap-2"><Badge tone="success"><ShieldCheck size={14} className="mr-1"/>Ledger ativo</Badge><Badge tone="neutral"><LockKeyhole size={14} className="mr-1"/>RLS</Badge></div>
    </header>
    {message && <Toast tone={message.tone}>{message.text}</Toast>}
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <Card><div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[var(--vtx-primary-soft)] text-[var(--vtx-primary)]"><FileCheck2 size={20}/></span><div><h2 className="font-bold">Abrir processo</h2><p className="text-sm text-[var(--vtx-text-muted)]">A criação gera protocolo, timeline, ledger e outbox na mesma transação.</p></div></div>
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Assunto"><Input required minLength={3} maxLength={255} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Descreva o objeto do processo" /></Field>
          <Field label="Entidade vinculada" hint="UUID da solicitação, documento ou registro de origem."><Input required value={entityId} onChange={(event) => setEntityId(event.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Nível de acesso"><Select value={accessLevel} onChange={(event) => setAccessLevel(event.target.value as AccessLevel)}><option value="PUBLIC">Público</option><option value="RESTRICTED">Restrito</option><option value="PRIVATE">Privado</option></Select></Field>{accessLevel !== 'PUBLIC' && <Field label="Hipótese legal"><Select value={restrictionBasis} onChange={(event) => setRestrictionBasis(event.target.value as RestrictionBasis)}><option value="LGPD_PERSONAL_DATA">Dados pessoais — LGPD</option><option value="BUSINESS_CONFIDENTIALITY">Sigilo empresarial</option><option value="NATIONAL_SECURITY">Segurança nacional</option><option value="ONGOING_PROCESS">Processo em andamento</option></Select></Field>}</div>
          <label className="flex items-center gap-2 text-sm font-semibold"><Checkbox checked={personalData} onChange={(event) => { setPersonalData(event.target.checked); if (event.target.checked && accessLevel === 'PUBLIC') setAccessLevel('RESTRICTED'); }} />Contém dado pessoal</label>
          <Button type="submit" disabled={!context.token || !context.tenantId || !context.companyId}>Gerar protocolo</Button>
        </form>
        {created && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><div className="text-xs font-semibold uppercase tracking-wider">Número oficial</div><div className="mt-1 font-mono text-2xl font-black">{created.protocol_number}</div><div className="mt-2 text-sm">{created.subject} · {created.access_level}</div></div>}
      </Card>
      <ApiContextCard context={context}/>
    </div>
    <div className="grid gap-6 xl:grid-cols-2">
      <Card><div className="mb-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[var(--vtx-primary-soft)] text-[var(--vtx-primary)]"><ListTree size={20}/></span><div><h2 className="font-bold">Timeline imutável</h2><p className="text-sm text-[var(--vtx-text-muted)]">Consulte a evolução cronológica autorizada do processo.</p></div></div>
        <div className="flex gap-2"><Input value={protocolId} onChange={(event) => setProtocolId(event.target.value)} placeholder="UUID do protocolo"/><Button variant="secondary" disabled={!protocolId || !context.token} onClick={() => void loadTimeline()}>Carregar</Button></div>
        <div className="mt-4 grid gap-3">{timeline.map((event) => <div key={event.id} className="rounded-lg border border-[var(--vtx-border)] p-3"><div className="flex items-center justify-between gap-3"><Badge tone="info">{event.event_type}</Badge><time className="text-xs text-[var(--vtx-text-muted)]">{new Date(event.occurred_at).toLocaleString('pt-BR')}</time></div><p className="mt-2 text-sm">{event.description}</p></div>)}{timeline.length === 0 && <p className="rounded-lg border border-dashed border-[var(--vtx-border)] p-4 text-sm text-[var(--vtx-text-muted)]">Informe um protocolo autorizado para ver a timeline.</p>}</div>
      </Card>
      <Card><div className="mb-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[var(--vtx-primary-soft)] text-[var(--vtx-primary)]"><Eye size={20}/></span><div><h2 className="font-bold">Vista de processo</h2><p className="text-sm text-[var(--vtx-text-muted)]">Resposta em 5 dias. Acesso concedido por 10 dias.</p></div></div>
        <div className="grid gap-3"><Field label="Justificativa"><Input value={justification} onChange={(event) => setJustification(event.target.value)} /></Field><Button variant="secondary" disabled={!protocolId || !context.token || justification.length < 10} onClick={() => void requestView()}>Solicitar vista</Button><Field label="ID do pedido"><Input value={viewId} onChange={(event) => setViewId(event.target.value)} placeholder="Preenchido após a solicitação" /></Field><Field label="Fundamento da decisão"><Input value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} /></Field><div className="grid grid-cols-2 gap-2"><Button disabled={!viewId} onClick={() => void decideView('GRANTED')}>Conceder</Button><Button variant="danger" disabled={!viewId} onClick={() => void decideView('DENIED')}>Negar</Button></div></div>
      </Card>
    </div>
    <Card><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-bold">Consulta pública</h2><p className="text-sm text-[var(--vtx-text-muted)]">Somente processos `PUBLIC` sem dados pessoais.</p></div><div className="flex min-w-72 gap-2"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Número ou assunto"/><Button onClick={() => void search()}><Search size={16}/>Pesquisar</Button></div></div>
      <Table><thead><tr className="border-b border-[var(--vtx-border)] text-xs uppercase text-[var(--vtx-text-muted)]"><th className="p-3">Protocolo</th><th className="p-3">Assunto</th><th className="p-3">Entidade</th><th className="p-3">Abertura</th></tr></thead><tbody>{publicRows.map((row) => <tr key={row.protocol_number} className="border-b border-[var(--vtx-border)] last:border-0"><td className="p-3 font-mono font-bold">{row.protocol_number}</td><td className="p-3">{row.subject}</td><td className="p-3">{row.entity_type}</td><td className="p-3">{new Date(row.created_at).toLocaleString('pt-BR')}</td></tr>)}{publicRows.length === 0 && <tr><td className="p-6 text-center text-[var(--vtx-text-muted)]" colSpan={4}>Faça uma pesquisa para consultar processos públicos.</td></tr>}</tbody></Table>
    </Card>
  </section>;
}
