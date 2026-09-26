export function VortexMark({ size = 28, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role={title ? "img" : "presentation"} aria-label={title} aria-hidden={title ? undefined : true}>
      <rect width="32" height="32" rx="8" fill="#3ddc84" />
      <path
        d="M16 5.5c6.2 0 10.5 4 10.5 10.2 0 2.6-1.1 5-3 6.8"
        fill="none"
        stroke="#0b0d10"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M16 26.5c-6.2 0-10.5-4-10.5-10.2 0-2.6 1.1-5 3-6.8"
        fill="none"
        stroke="#0b0d10"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="3.1" fill="#0b0d10" />
      <circle cx="16" cy="16" r="1.15" fill="#3ddc84" />
    </svg>
  );
}

export function VortexBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2"}`} title="VORTEX">
      <VortexMark size={collapsed ? 26 : 28} title="VORTEX" />
      {!collapsed && (
        <div className="min-w-0 leading-none">
          <div className="text-[13px] font-semibold tracking-[0.16em]">VORTEX</div>
          <div className="mono mt-0.5 text-[10px] text-[var(--muted)]">Rconta</div>
        </div>
      )}
    </div>
  );
}
