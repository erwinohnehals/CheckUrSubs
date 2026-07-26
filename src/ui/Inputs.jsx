import { useState, useCallback } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useLang, useT } from '../lib/i18n';
import { STANDARD_EASE } from '../lib/motion';
import { fmtDateFromISO } from '../lib/dates';
import { INPUT_CLASS } from './tokens';
import { PopMenu } from './PopMenu';
import { useDismiss } from './hooks';

// Der Ein-Zustand ist eine der wenigen Stellen, an denen der Akzent auftaucht (§2)
export const Switch = ({ checked, onChange, label }) => (
  <button type="button" role="switch" aria-checked={checked} data-no-press
    onClick={() => onChange(!checked)}
    className="w-full flex items-center gap-3 text-left group">
    <span className={`w-9 h-5 rounded-full p-0.5 shrink-0 transition-colors duration-200
      ${checked ? 'bg-accent' : 'bg-border-strong'}`}>
      <span className="block w-4 h-4 rounded-full bg-surface-2 shadow-sm transition-transform duration-300"
        style={{ transform: `translateX(${checked ? 16 : 0}px)`, transitionTimingFunction: STANDARD_EASE }} />
    </span>
    <span className="text-xs text-ink-2 group-hover:text-ink transition-colors">{label}</span>
  </button>
);

export const SelectInput = ({ value, onChange, placeholder, options }) => (
  <div className="relative">
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`${INPUT_CLASS} appearance-none pr-10 ${value ? 'text-ink' : 'text-ink-3'}`}>
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value} className="text-ink">{option.label}</option>
      ))}
    </select>
    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
  </div>
);

// ─── DatePicker ───────────────────────────────────────────────────────────────
export const DatePicker = ({ value, onChange, label }) => {
  const t    = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const today = new Date();
  const parsed = value ? new Date(value) : null;
  const [viewYear,  setViewYear]  = useState(parsed?.getFullYear()  ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth()     ?? today.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const offset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const selectDay = (d) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0);  setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const selectedDay   = parsed?.getDate();
  const selectedMonth = parsed?.getMonth();
  const selectedYear  = parsed?.getFullYear();

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)} data-no-press
        className={`${INPUT_CLASS} bg-surface-2 flex items-center gap-3 text-left hover:bg-surface-3`}>
        <CalendarDays className="w-4 h-4 text-ink-3 shrink-0" />
        <span className="text-xs text-ink-3">{label}</span>
        <span className="ml-auto text-sm">
          {parsed
            ? <span className="text-ink">{fmtDateFromISO(value, lang, t.months_short)}</span>
            : <span className="text-ink-3">{t.datepicker_choose}</span>}
        </span>
      </button>

      <PopMenu open={open} className="top-full right-0 mt-2 w-full max-w-[360px]" width="">
        <div className="p-2.5">
          {/* Monatsnavigation */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} aria-label="←"
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-ink-2 hover:bg-surface-3 transition">
              <ChevronDown className="w-4 h-4 rotate-90" />
            </button>
            <span className="text-sm font-medium">{t.months_full[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} aria-label="→"
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-ink-2 hover:bg-surface-3 transition">
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </button>
          </div>
          {/* Wochentage */}
          <div className="grid grid-cols-7 mb-1">
            {t.days_short.map(d => <div key={d} className="text-center text-[11px] text-ink-3 uppercase py-1">{d}</div>)}
          </div>
          {/* Tage */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const isSelected = day === selectedDay && viewMonth === selectedMonth && viewYear === selectedYear;
              const isToday    = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              return (
                <button key={day} type="button" onClick={() => selectDay(day)} data-no-press
                  className={`h-9 rounded-lg text-xs font-medium transition
                    ${isSelected ? 'bg-ink text-surface'
                      : isToday   ? 'bg-surface-sunken text-ink'
                      : 'text-ink-2 hover:bg-surface-3'}`}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </PopMenu>
    </div>
  );
};
