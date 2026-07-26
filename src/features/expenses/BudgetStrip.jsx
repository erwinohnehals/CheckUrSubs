// ─── Der Budgetstreifen über dem Monat ────────────────────────────────────────
// Eine Zeile, kein zweiter Budget-Reiter: wie weit die gesetzten Grenzen in
// diesem Monat aufgebraucht sind, und was gerade drückt. Wer mehr wissen will,
// tippt darauf und ist im Budget.
//
// Ohne Grenzen erscheint der Streifen nicht. Ein Hinweis auf eine Funktion, die
// man nicht benutzt, ist über dem Monat nur Grundrauschen.

import { ChevronRight } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { CARD } from '../../ui';
import { BudgetMeter } from './BudgetMeter';
import { CATEGORY_ICONS } from './icons';

// So viele Kategorien passen daneben, ohne dass die Zeile zur Liste wird
const TIGHT_MAX = 3;

export const BudgetStrip = ({ rows, fmt, onOpen, className = '' }) => {
  const t = useT();
  const { budgeted, totals } = rows;

  if (budgeted.length === 0) return null;

  // budgeted ist bereits nach Anteil sortiert — was oben steht, drückt am meisten
  const tight = budgeted.filter((row) => row.tone !== 'neutral').slice(0, TIGHT_MAX);

  return (
    <button type="button" onClick={onOpen} data-group
      aria-label={t.budget_strip_open}
      className={`${CARD} w-full text-left px-4 py-3 space-y-2.5 hover:bg-surface-3 transition ${className}`}>
      <div className="flex items-center gap-3">
        <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em] shrink-0">{t.nav_budget}</p>

        <p className={`ml-auto text-sm font-semibold tabular-nums shrink-0
          ${totals.over > 0 ? 'text-error' : ''}`}>
          {t.budget_of(fmt(totals.spent), fmt(totals.available))}
        </p>
        <ChevronRight className="w-4 h-4 text-ink-3 shrink-0" />
      </div>

      <BudgetMeter ratio={totals.ratio} tone={totals.tone} thin />

      <div className="flex items-center gap-3 flex-wrap">
        {tight.length === 0 ? (
          <p className="text-xs text-ink-3">
            {totals.remaining >= 0 ? t.budget_left(fmt(totals.remaining)) : t.budget_in_range}
          </p>
        ) : tight.map((row) => {
          const Icon = CATEGORY_ICONS[row.id] || CATEGORY_ICONS.other;
          return (
            <span key={row.id} className="inline-flex items-center gap-1.5 text-xs text-ink-3 min-w-0">
              <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{t[row.labelKey]}</span>
              <span className={`tabular-nums ${row.over ? 'text-error' : 'text-warning'}`}>
                {row.over ? t.budget_over_by(fmt(Math.abs(row.remaining))) : t.budget_left(fmt(row.remaining))}
              </span>
            </span>
          );
        })}
      </div>
    </button>
  );
};
