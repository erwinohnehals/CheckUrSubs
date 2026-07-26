// ─── Kopfzeilen einer Seite ───────────────────────────────────────────────────
// Am Desktop eine große Überschrift mit Unterzeile, am Telefon eine schmale
// Zeile mit Symbol. Beide Bereiche — Verträge wie Ausgaben — setzen sie gleich.

export const PageHeader = ({ title, subtitle, children, className = '' }) => (
  <header className={`hidden lg:flex items-end justify-between gap-6 ${className}`}>
    <div className="min-w-0">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-ink-3 mt-1.5">{subtitle}</p>}
    </div>
    {children && <div className="shrink-0 flex items-center gap-2">{children}</div>}
  </header>
);

// Links ausgerichtet wie am Desktop, kein zentriertes Symbol
export const MobilePageHeader = ({ icon: Icon, title, children }) => (
  <header className="flex items-center justify-between gap-3 px-1 pt-1 pb-1 lg:hidden">
    <div className="flex items-center gap-2.5 min-w-0">
      <Icon className="w-5 h-5 text-ink-3 shrink-0" strokeWidth={2} />
      <h2 className="text-lg font-semibold tracking-tight truncate">{title}</h2>
    </div>
    {children}
  </header>
);
