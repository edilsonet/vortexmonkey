import { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { Seal } from "../ui/Seal.tsx";

type Address = {
  kind: string;
  street: string;
  number: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  country: string;
  cep: string;
};

type Me = {
  person: {
    full_name: string;
    cpf: string;
    email: string;
    phone: string | null;
    canac: string | null;
    birth_date: string | null;
    professional_email: string | null;
    professional_phone: string | null;
    validations: { field: string; level: string; source: string }[];
  } | null;
  addresses: Address[];
  roles: string[];
};

const fmtAddr = (a: Address) =>
  `${a.street}, ${a.number ?? "S/N"} · ${a.neighborhood ?? ""} · ${a.city}/${a.state} · ${a.cep}`;

export function PessoalPage() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    api<Me>("/api/identity/me").then((r) => r.data && setMe(r.data));
  }, []);
  const p = me?.person;
  if (!p) return <p className="text-sm text-[var(--muted)]">Carregando cadastro pessoal...</p>;
  const level = (field: string) => p.validations.find((v) => v.field === field)?.level ?? "N0";
  const personal = me?.addresses.find((a) => a.kind === "PERSONAL");
  const professional = me?.addresses.find((a) => a.kind === "PROFESSIONAL");
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card title="Identidade" id="identidade">
        <Row label="Nome" value={p.full_name} level={level("cpf")} />
        <Row label="Nascimento" value={p.birth_date ?? "—"} level="N0" />
        <Row label="CPF" value={p.cpf} level={level("cpf")} />
        <Row label="E-mail pessoal" value={p.email} level={level("email")} />
        <Row label="Telefone pessoal" value={p.phone ?? "—"} level="N0" />
        <Row label="Endereco pessoal" value={personal ? fmtAddr(personal) : "—"} level="N0" />
      </Card>
      <Card title="Contato profissional" id="contato">
        <Row label="E-mail profissional" value={p.professional_email ?? "—"} level="N0" />
        <Row label="Telefone profissional" value={p.professional_phone ?? "—"} level="N0" />
        <Row label="Endereco profissional" value={professional ? fmtAddr(professional) : "—"} level="N0" />
        <Row label="Papeis" value={me?.roles.join(", ") || "RCONTA"} level="N1" />
      </Card>
    </div>
  );
}

function Card({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-16 rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Row({ label, value, level }: { label: string; value: string; level: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] py-2 last:border-0">
      <div>
        <div className="text-[11px] text-[var(--muted)]">{label}</div>
        <div className="text-[13px]">{value}</div>
      </div>
      <Seal level={level} />
    </div>
  );
}
