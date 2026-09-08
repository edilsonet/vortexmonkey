import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api.ts";

type Doc = { id: string; name: string; status: string; hash: string };
type Provider = { code: string; name: string; level: string };
type Sig = { id: string; verification_code: string; crc_code: string; signature_level: string; method: string };

export function AssinarPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [sigs, setSigs] = useState<Sig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const load = async () => {
    const [d, p, s] = await Promise.all([
      api<Doc[]>("/api/documents"),
      api<Provider[]>("/api/signatures/providers"),
      api<Sig[]>("/api/signatures"),
    ]);
    if (d.data) setDocs(d.data);
    if (p.data) setProviders(p.data);
    if (s.data) setSigs(s.data);
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const documentId = String(fd.get("documentId"));
    await api("/api/signatures/requests", {
      method: "POST",
      body: JSON.stringify({ documentId, requiredLevel: "SIMPLE" }),
    });
    const res = await api<{ verificationCode: string }>("/api/signatures/sign", {
      method: "POST",
      body: JSON.stringify({
        documentId,
        providerCode: fd.get("providerCode"),
        credential: fd.get("credential"),
      }),
    });
    if (!res.success) {
      setError(res.error?.message ?? "Falha");
      return;
    }
    setError(null);
    setLastCode(res.data?.verificationCode ?? null);
    await load();
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <form onSubmit={onSubmit} className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">VORTEX Sign</h2>
        {error && <p className="mb-2 text-[12px] text-[var(--danger)]">{error}</p>}
        {lastCode && <p className="mono mb-2 text-[12px] text-[var(--accent)]">{lastCode}</p>}
        <select name="documentId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {docs.map((d) => (
            <option key={d.id} value={d.id}>{d.name} · {d.status}</option>
          ))}
        </select>
        <select name="providerCode" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {providers.map((p) => (
            <option key={p.code} value={p.code}>{p.name} ({p.level})</option>
          ))}
        </select>
        <input name="credential" required placeholder="Senha, 2FA (6 digitos) ou PEM" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Assinar</button>
      </form>
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Assinaturas</h2>
        {sigs.length === 0 && <p className="text-[12px] text-[var(--muted)]">Nenhuma assinatura.</p>}
        {sigs.map((s) => (
          <div key={s.id} className="border-b border-[var(--border)] py-2 text-[13px]">
            <div className="mono">{s.verification_code}</div>
            <div className="text-[11px] text-[var(--muted)]">{s.signature_level} · {s.method} · CRC {s.crc_code}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
