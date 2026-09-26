import { Badge, Button, Card, Table, Toast } from '@vortex/ui-core';
import { Blocks, FileDown, ScanSearch, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { ApiContextCard, useVortexClient } from './api-context';

interface AuditRow { id: string; action: string; entity_type: string; outcome: 'SUCCESS' | 'FAILURE'; status_code: number; occurred_at: string; ledger_block_id: string }
interface Verification { valid: boolean; status: string; totalBlocks: number; firstBrokenBlock: string | null; lastHash: string; issues: string[] }
interface Merkle { blockCount: number; rootHash: string; rootSignature: string; generatedAt: string }

export default function AuditWorkspace(): React.JSX.Element {
  const context = useVortexClient();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    const result = await context.client.audit<AuditRow[]>('limit=100');
    if (result.success) setRows(result.data); else setMessage({ tone: 'error', text: result.error.message });
  };
  const verify = async () => {
    const result = await context.client.verifyLedger<Verification>();
    if (result.success) { setVerification(result.data); setMessage({ tone: result.data.valid ? 'success' : 'error', text: result.data.valid ? 'Cadeia íntegra e assinaturas válidas.' : `Violação no bloco ${result.data.firstBrokenBlock ?? 'desconhecido'}.` }); }
    else setMessage({ tone: 'error', text: result.error.message });
  };
  const exportMerkle = async () => {
    const result = await context.client.exportMerkle<Merkle>();
    if (!result.success) { setMessage({ tone: 'error', text: result.error.message }); return; }
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = href; anchor.download = `vortex-merkle-${Date.now()}.json`; anchor.click(); URL.revokeObjectURL(href);
    setMessage({ tone: 'success', text: `Prova Merkle exportada para ${result.data.blockCount} blocos.` });
  };

  return <section aria-labelledby="audit-title" className="grid gap-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><Badge tone="success">Resolução ANAC 458/2017</Badge><h1 id="audit-title" className="mt-3 text-3xl font-bold tracking-tight">Auditoria e integridade</h1><p className="mt-2 max-w-3xl text-[var(--vtx-text-muted)]">Cada ação autenticada registra usuário, contexto, IP, resultado e bloco criptográfico.</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => void load()}><ScanSearch size={16}/>Atualizar trilha</Button><Button onClick={() => void verify()}><ShieldCheck size={16}/>Verificar cadeia</Button><Button variant="secondary" onClick={() => void exportMerkle()}><FileDown size={16}/>Exportar Merkle</Button></div></header>
    {message && <Toast tone={message.tone}>{message.text}</Toast>}
    <ApiContextCard context={context}/>
    {verification && <div className="grid gap-4 sm:grid-cols-3"><Card><div className="text-sm text-[var(--vtx-text-muted)]">Estado</div><div className="mt-2 text-2xl font-black">{verification.status}</div></Card><Card><div className="text-sm text-[var(--vtx-text-muted)]">Blocos verificados</div><div className="mt-2 text-2xl font-black">{verification.totalBlocks}</div></Card><Card><div className="text-sm text-[var(--vtx-text-muted)]">Último hash</div><div className="mt-2 truncate font-mono text-sm">{verification.lastHash}</div></Card></div>}
    <Card><div className="mb-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[var(--vtx-primary-soft)] text-[var(--vtx-primary)]"><Blocks size={20}/></span><div><h2 className="font-bold">Trilha imutável</h2><p className="text-sm text-[var(--vtx-text-muted)]">Filtrável pela API por entidade, usuário e período.</p></div></div>
      <Table><thead><tr className="border-b border-[var(--vtx-border)] text-xs uppercase text-[var(--vtx-text-muted)]"><th className="p-3">Data/hora</th><th className="p-3">Ação</th><th className="p-3">Entidade</th><th className="p-3">Resultado</th><th className="p-3">Ledger</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-[var(--vtx-border)] last:border-0"><td className="p-3">{new Date(row.occurred_at).toLocaleString('pt-BR')}</td><td className="p-3 font-medium">{row.action}</td><td className="p-3">{row.entity_type}</td><td className="p-3"><Badge tone={row.outcome === 'SUCCESS' ? 'success' : 'danger'}>{row.status_code} · {row.outcome}</Badge></td><td className="max-w-48 truncate p-3 font-mono text-xs">{row.ledger_block_id}</td></tr>)}{rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-[var(--vtx-text-muted)]">Carregue a trilha do contexto autenticado.</td></tr>}</tbody></Table>
    </Card>
  </section>;
}
