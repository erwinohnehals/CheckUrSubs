// ─── Der Monat im Blick ───────────────────────────────────────────────────────
// Monat und Budget stehen über demselben Monat: wer im Monatsreiter zum März
// blättert und dann zum Budget wechselt, erwartet dort den März. Deshalb ein
// Stepper und ein Zustand für beide.

import { ChevronDown } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { btn } from '../../ui';

export const MonthStepper = ({ month, onStep, onToday, atCurrent }) => {
  const t = useT();
  const [year, index] = month.split('-').map(Number);

  return (
    <div className="flex items-center justify-between px-1">
      <button type="button" onClick={() => onStep(-1)} aria-label={t.month_previous}
        className="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface-3 transition">
        <ChevronDown className="w-4 h-4 rotate-90" />
      </button>
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold tracking-tight lg:text-lg">
          {t.months_full[index - 1]} {year}
        </p>
        {!atCurrent && (
          <button type="button" onClick={onToday} className={btn('ghost', 'sm', 'text-xs')}>
            {t.today}
          </button>
        )}
      </div>
      <button type="button" onClick={() => onStep(1)} aria-label={t.month_next}
        className="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface-3 transition">
        <ChevronDown className="w-4 h-4 -rotate-90" />
      </button>
    </div>
  );
};
