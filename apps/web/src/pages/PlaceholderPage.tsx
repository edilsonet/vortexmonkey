export function PlaceholderPage({ title, note }: { title: string; note: string }) {
  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
      <h2 className="mb-1 text-sm font-semibold">{title}</h2>
      <p className="text-[13px] text-[var(--muted)]">{note}</p>
      <p className="mono mt-3 text-[11px] text-[var(--muted)]">Central exibe filtro. Nao duplica historico. Fase posterior.</p>
    </section>
  );
}
