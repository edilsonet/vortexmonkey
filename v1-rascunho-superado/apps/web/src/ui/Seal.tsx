const map: Record<string, { label: string; color: string }> = {
  N0: { label: "N0 pendente", color: "var(--n0)" },
  N1: { label: "N1 sistema", color: "var(--n1)" },
  N2: { label: "N2 oficial", color: "var(--n2)" },
  N3: { label: "N3 autentico", color: "var(--n3)" },
};

export function Seal({ level }: { level: string }) {
  const item = map[level] ?? map.N0!;
  return (
    <span className="mono inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]" style={{ borderColor: item.color, color: item.color }}>
      <span className="inline-block size-1.5 rounded-full" style={{ background: item.color }} />
      {item.label}
    </span>
  );
}
