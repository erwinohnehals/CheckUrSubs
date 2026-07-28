// ─── Schrittschalter ──────────────────────────────────────────────────────────
// Zurück · Wert · Vor als ein Kasten, nicht als drei über die Breite verteilte
// Teile: die Pfeile gehören zum Wert, also fassen sie ihn ein. Form und Maße
// wie beim Segmented Control (§4.4) — 4px Innenabstand, 12px außen, 8px innen.

import { ChevronDown } from 'lucide-react';
import { btn } from './tokens';

const STEP_BTN = 'w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-3 transition';

export const Stepper = ({
  label, onPrev, onNext, prevLabel, nextLabel,
  onReset, resetLabel, resetClass = '',
  // Feste Mindestbreite, sonst rücken die Pfeile zwischen „Mai“ und
  // „September“ hin und her
  labelClass = 'min-w-[7.5rem] lg:min-w-[9rem]',
}) => (
  <div className="flex items-center gap-2">
    <div className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-surface-2 p-1">
      <button type="button" onClick={onPrev} aria-label={prevLabel} className={STEP_BTN}>
        <ChevronDown className="w-4 h-4 rotate-90" />
      </button>
      <p className={`text-center text-sm font-semibold tracking-tight lg:text-base ${labelClass}`}>
        {label}
      </p>
      <button type="button" onClick={onNext} aria-label={nextLabel} className={STEP_BTN}>
        <ChevronDown className="w-4 h-4 -rotate-90" />
      </button>
    </div>
    {onReset && (
      <button type="button" onClick={onReset} className={btn('ghost', 'sm', `text-xs ${resetClass}`)}>
        {resetLabel}
      </button>
    )}
  </div>
);
