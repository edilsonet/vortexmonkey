import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { sha256Hex } from "../lib/hash.ts";

type Doc = {
  id: string;
  name: string;
  mime_type: string;
  hash: string;
  classification: string;
  status: string;
  document_type: string;
  contains_personal_data: boolean;
};

export function DocumentosPage() {
  const [rows, setRows] = useState<Doc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = () => api<Doc[]>("/api/documents").then((r) => r.data && setRows(r.data));
  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const content = String(fd.get("content") ?? "");
    const hash = await sha256Hex(content);
    const res = await api("/api/documents", {
      method: "POST",
      body: JSON.stringify({
        name: fd.get("name"),
        mimeType: "text/markdown",
        sizeBytes: new TextEncoder().encode(content).length,
        hash,
        classification: fd.get("classification"),
        containsPersonalData: fd.get("pii") === "on",
        documentType: fd.get("documentType"),
        content,
      }),
    });
    if (!res.success) {
      setError(res.error?.message ?? "Falha");
      return;
    }
    setError(null);
    e.currentTarget.reset();
    await load();
  };

  const anonymize = async (id: string) => {
    const res = await api(`/api/documents/${id}/anonymize`, { method: "POST" });
    if (!res.success) setError(res.error?.message ?? "Falha");
    await load();
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <form onSubmit={onSubmit} className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Novo documento</h2>
        {error && <p className="mb-2 text-[12px] text-[var(--danger)]">{error}</p>}
        <input name="name" required placeholder="Nome" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <input name="documentType" placeholder="Tipo (OS, SEGVOO_001...)" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <select name="classification" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          <option>RESTRICTED</option>
          <option>PRIVATE</option>
          <option>PUBLIC</option>
        </select>
        <label className="mb-2 flex items-center gap-2 text-[12px] text-[var(--muted)]">
          <input type="checkbox" name="pii" /> Contem dado pessoal
        </label>
        <textarea name="content" required rows={6} placeholder="Conteudo markdown" className="mb-3 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] p-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Registrar</button>
      </form>
      <section id="acervo" className="scroll-mt-16 rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Acervo</h2>
        {rows.length === 0 && <p className="text-[12px] text-[var(--muted)]">Nenhum documento.</p>}
        {rows.map((d) => (
          <div key={d.id} className="border-b border-[var(--border)] py-2 text-[13px]">
            <div className="flex items-center justify-between">
              <span>{d.name}</span>
              <span className="mono text-[11px] text-[var(--muted)]">{d.status}</span>
            </div>
            <div className="mono text-[11px] text-[var(--muted)]">{d.classification} · {d.hash.slice(0, 12)}</div>
            {d.contains_personal_data && (
              <button type="button" onClick={() => void anonymize(d.id)} className="mt-1 text-[11px] text-[var(--danger)]">
                Anonimizar
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
