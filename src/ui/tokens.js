// ─── Klassenrezepte ───────────────────────────────────────────────────────────
// Die Rezepte aus design-language.html §5 und §6 an einem Ort. Wer eine Fläche,
// einen Knopf oder einen Status einfärbt, holt ihn hier — nicht aus dem Kopf.

// Radien-Leiter: 8px Bedienelemente · 12px Karten · 16px Modale · voll für Pillen
export const CARD       = 'bg-surface-2 border border-border rounded-xl';
export const PANEL      = 'bg-surface-2 border border-border-strong rounded-xl shadow-xl';
export const INPUT_CLASS = 'w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-border-strong transition';

const BTN_VARIANT = {
  // Primär ist massive Tinte — bewusst nicht der Akzent
  primary:   'bg-ink text-surface hover:bg-ink-2 disabled:hover:bg-ink',
  secondary: 'bg-surface-2 text-ink border border-border hover:bg-surface-3',
  ghost:     'text-ink-2 hover:bg-surface-3 hover:text-ink',
  danger:    'bg-error text-white hover:opacity-90',
};
const BTN_SIZE = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};
export const btn = (variant = 'primary', size = 'md', extra = '') =>
  `inline-flex items-center justify-center gap-2 rounded-lg font-medium
   disabled:opacity-50 disabled:cursor-not-allowed
   ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${extra}`;

// Status ist der einzige Ort, an dem Farbe getragen wird
export const TONE = {
  success: 'text-success bg-success/10 border-success/25',
  warning: 'text-warning bg-warning/10 border-warning/25',
  error:   'text-error   bg-error/10   border-error/25',
  muted:   'text-ink-3   bg-surface-3  border-border',
};
export const DOT = { success: 'bg-success', warning: 'bg-warning', error: 'bg-error', muted: 'bg-ink-3' };

// Anteile in einer Liste werden über die Deckkraft einer einzigen Tintenfläche
// unterschieden — kein Farbkreis, aber jede Zeile bleibt auseinanderzuhalten.
const RANK_OPACITY = [1, 0.82, 0.66, 0.54, 0.44, 0.36, 0.3, 0.25];
export const rankOpacity = (i) => RANK_OPACITY[Math.min(i, RANK_OPACITY.length - 1)];
