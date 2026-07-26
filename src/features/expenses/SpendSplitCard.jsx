// ─── Laufend gegen einmalig ───────────────────────────────────────────────────
// Dieselben zwei Zahlen stehen in beiden Auswertungen. Nur die Blickrichtung
// wechselt: Verträge nennen laufende Kosten zuerst, Ausgaben die Einmalkäufe.

import { useT } from '../../lib/i18n';
import { CARD } from '../../ui';

export const SpendSplitCard = ({
  fixed = 0,
  oneOff = 0,
  fmt,
  perspective = 'contracts',
  className = '',
}) => {
  const t = useT();
  const total = fixed + oneOff;
  const fixedShare = total > 0 ? (fixed / total) * 100 : 0;
  const rows = perspective === 'expenses'
    ? [
      { id: 'oneOff', label: t.split_one_off, value: oneOff, share: 100 - fixedShare },
      { id: 'fixed', label: t.split_fixed, value: fixed, share: fixedShare },
    ]
    : [
      { id: 'fixed', label: t.split_fixed, value: fixed, share: fixedShare },
      { id: 'oneOff', label: t.split_one_off, value: oneOff, share: 100 - fixedShare },
    ];

  return (
    <section data-group className={`${CARD} p-5 space-y-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">
            {perspective === 'expenses' ? t.split_expenses_title : t.split_contracts_title}
          </p>
          <p className="text-xs text-ink-3 mt-1">{t.split_current_month}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-semibold tracking-tight">{fmt(total)}</p>
          <p className="text-[11px] text-ink-3">{t.split_total}</p>
        </div>
      </div>

      <div className="h-2.5 rounded-full overflow-hidden bg-surface-3 flex"
        role="img"
        aria-label={`${t.split_fixed}: ${fmt(fixed)}; ${t.split_one_off}: ${fmt(oneOff)}`}>
        {fixed > 0 && (
          <span className="h-full bg-ink"
            style={{ width: `${fixedShare}%` }} />
        )}
        {oneOff > 0 && (
          <span className="h-full bg-ink opacity-40"
            style={{ width: `${100 - fixedShare}%` }} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg bg-surface px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-sm bg-ink ${row.id === 'oneOff' ? 'opacity-40' : ''}`} />
              <span className="text-xs text-ink-3">{row.label}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <span className="text-sm font-semibold">{fmt(row.value)}</span>
              <span className="text-[11px] text-ink-3">{total > 0 ? `${row.share.toFixed(0)}%` : '—'}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
