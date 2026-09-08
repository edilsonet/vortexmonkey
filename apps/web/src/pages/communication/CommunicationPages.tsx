import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api.ts";

type Thread = { id: string; title: string; kind: string; messages: number };
type Message = { id: string; thread_id: string; body: string; full_name: string; created_at: string };
type Email = { id: string; template: string; subject: string; kind: string; status: string };
type Announcement = { id: string; title: string; body: string; full_name: string };
type Overview = { threads: Thread[]; messages: Message[]; emails: Email[]; announcements: Announcement[] };

function useComm() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    void api<Overview>("/api/communication").then((r) => r.data && setData(r.data));
  };
  useEffect(() => {
    load();
  }, []);
  const post = async (path: string, body: unknown) => {
    const res = await api(path, { method: "POST", body: JSON.stringify(body) });
    if (!res.success) {
      setError(res.error?.message ?? "Falha");
      return;
    }
    setError(null);
    load();
  };
  return { data, error, post };
}

export function ChatPage() {
  const { data, error, post } = useComm();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/communication/threads", { title: fd.get("title"), kind: "COMPANY" });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Nova conversa</h2>
        <input name="title" required placeholder="Titulo" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Abrir</button>
        <div className="mt-3">
          {(data?.threads ?? []).map((t) => (
            <div key={t.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {t.title} · {t.kind} · {t.messages} msgs
            </div>
          ))}
        </div>
      </form>
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/communication/messages", { threadId: fd.get("threadId"), body: fd.get("body") });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Mensagem</h2>
        <select name="threadId" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm">
          {(data?.threads ?? []).map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
        <input name="body" required placeholder="Texto" className="mb-3 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Enviar</button>
        <div className="mt-3">
          {(data?.messages ?? []).map((m) => (
            <div key={m.id} className="border-t border-[var(--border)] py-2 text-[13px]">
              {m.full_name}: {m.body}
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}

export function EmailsPage() {
  const { data, error } = useComm();
  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
      {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
      <h2 className="mb-3 text-sm font-semibold">Caixa transacional</h2>
      {(data?.emails ?? []).map((e) => (
        <div key={e.id} className="border-t border-[var(--border)] py-2 text-[13px]">
          {e.kind} · {e.template} · {e.subject} · {e.status}
        </div>
      ))}
      {(data?.emails ?? []).length === 0 && <p className="text-[12px] text-[var(--muted)]">Nenhum e-mail.</p>}
    </section>
  );
}

export function ComunicadosPage() {
  const { data, error, post } = useComm();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error && <p className="col-span-full text-[12px] text-[var(--danger)]">{error}</p>}
      <form
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void post("/api/communication/announcements", { title: fd.get("title"), body: fd.get("body") });
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">Novo comunicado</h2>
        <input name="title" required placeholder="Titulo" className="mb-2 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm" />
        <textarea name="body" required placeholder="Corpo" className="mb-3 min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-sm" />
        <button className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-black">Publicar</button>
      </form>
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Oficiais</h2>
        {(data?.announcements ?? []).map((a) => (
          <div key={a.id} className="border-t border-[var(--border)] py-2 text-[13px]">
            <div className="font-semibold">{a.title}</div>
            <div className="text-[var(--muted)]">{a.body}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
