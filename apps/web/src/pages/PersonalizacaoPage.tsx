import { useEffect, useState } from "react";

const themes = [
  { id: "dark", label: "Escuro", bg: "#0b0d10", elev: "#12151a", hover: "#1a1e25", border: "#2a3038", text: "#e8eaed", muted: "#8b939e", accent: "#3ddc84" },
  { id: "light", label: "Claro", bg: "#f4f6f8", elev: "#ffffff", hover: "#e8ecf1", border: "#d0d5dd", text: "#12151a", muted: "#5c6570", accent: "#1f6b43" },
  { id: "custom", label: "Personalizado", bg: "#10141c", elev: "#161b26", hover: "#1c2433", border: "#2a3344", text: "#e8eaed", muted: "#8b939e", accent: "#5b8def" },
] as const;

export function PersonalizacaoPage() {
  const [theme, setTheme] = useState(localStorage.getItem("vortex.theme") ?? "dark");

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const sync = () => setTheme(localStorage.getItem("vortex.theme") ?? "dark");
    window.addEventListener("vortex:theme", sync);
    return () => window.removeEventListener("vortex:theme", sync);
  }, []);

  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-4">
      <p className="mb-3 text-[13px] text-[var(--muted)]">Tema da Shell. Alterna claro, escuro e personalizado.</p>
      <div className="flex gap-2">
        {themes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              localStorage.setItem("vortex.theme", t.id);
              setTheme(t.id);
            }}
            className={`h-8 rounded-md border px-3 text-[12px] ${theme === t.id ? "border-[var(--accent)] text-white" : "border-[var(--border)] text-[var(--muted)]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function applyTheme(id: string): void {
  const t = themes.find((x) => x.id === id) ?? themes[0];
  const root = document.documentElement;
  root.style.setProperty("--bg", t.bg);
  root.style.setProperty("--bg-elev", t.elev);
  root.style.setProperty("--bg-hover", t.hover);
  root.style.setProperty("--border", t.border);
  root.style.setProperty("--text", t.text);
  root.style.setProperty("--muted", t.muted);
  root.style.setProperty("--accent", t.accent);
}

export function cycleTheme(): string {
  const order = themes.map((t) => t.id);
  const current = localStorage.getItem("vortex.theme") ?? "dark";
  const idx = order.indexOf(current as (typeof order)[number]);
  const next = order[(idx + 1) % order.length] ?? "dark";
  localStorage.setItem("vortex.theme", next);
  applyTheme(next);
  window.dispatchEvent(new Event("vortex:theme"));
  return next;
}


