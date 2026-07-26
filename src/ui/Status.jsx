import { AlertTriangle } from 'lucide-react';
import { TONE, DOT } from './tokens';

// ─── Kleinteile ───────────────────────────────────────────────────────────────
export const StatusPill = ({ tone = 'muted', label, pulse = false }) => (
  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${TONE[tone]}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${DOT[tone]} ${pulse ? 'animate-pulse' : ''}`} />
    {label}
  </span>
);

export const Badge = ({ tone = 'muted', icon: Icon, children, title }) => (
  <span title={title}
    className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md border shrink-0 ${TONE[tone]}`}>
    {Icon && <Icon className="w-3 h-3" />}{children}
  </span>
);

// Ruhiger Hinweis — Farbe nur als schmaler Streifen am Rand
export const Note = ({ tone = 'muted', icon: Icon = AlertTriangle, children }) => (
  <div className={`flex gap-2.5 rounded-lg border px-3 py-2.5 ${TONE[tone]}`}>
    <Icon className="w-4 h-4 shrink-0 mt-px" />
    <p className="text-[11px] leading-relaxed">{children}</p>
  </div>
);
