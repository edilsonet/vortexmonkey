import { FormEvent, useState } from "react";
import { api } from "../lib/api.ts";

type Result = {
  valid: boolean;
  verificationCode: string;
  crc: string;
  level: string;
  method: string;
  signedAt: string;
  documentHash: string;
  documentName: string;
};

export function VerificarPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").trim();
    const res = await api<Result>(`/api/verify/${encodeURIComponent(code)}`);
    if (!res.success) {
      setResult(null);
      setError(res.error?.message ?? "Codigo invalido");
      return;
    }
    setError(null);
    setResult(res.data);
  };

  return (
    <section className="mx-auto max-w-lg rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
      <h2 className="mb-1 text-sm font-semibold">Verificar assinatura</h2>
      <p className="mb-3 text-[12px] text-[var(--muted)]">Codigo publico VRTX-XXXX-XXXX. Nao exige login.</p>
      <form onSubmit={onSubmit} className="mb-3 flex gap-2">
        <input name="code" required placeholder="VRTX-XXXX-XXXX" className="h-9 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 font-mono text-sm" />
        <button className="h-9 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Verificar</button>
      </form>
      {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
      {result && (
        <dl className="grid gap-1 text-[13px]">
          <Row label="Valido" value={result.valid ? "sim" : "nao"} />
          <Row label="Documento" value={result.documentName} />
          <Row label="Nivel" value={result.level} />
          <Row label="Metodo" value={result.method} />
          <Row label="CRC" value={result.crc} />
          <Row label="Hash" value={result.documentHash} />
          <Row label="Quando" value={result.signedAt} />
        </dl>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
      <div className="mono break-all text-[12px]">{value}</div>
    </div>
  );
}
