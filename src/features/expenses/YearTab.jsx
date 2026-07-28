// ─── Jahr ─────────────────────────────────────────────────────────────────────
// Zwölf Monate in einer gemeinsamen Skala: unten laufende Kosten, darauf
// Einmalausgaben, darüber die Einnahmen als Linie. Die Zahlenkarten und Listen
// kommen aus demselben Reportobjekt, damit nichts unabhängig nachrechnet.

import { ReceiptText, ShoppingBag } from 'lucide-react';
import { useLang, useT } from '../../lib/i18n';
import { fmtDateFromISO } from '../../lib/dates';
import { EXPENSE_CATEGORIES } from '../../lib/expenseCategories';
import { CARD, MeterRow, Stepper } from '../../ui';
import { CATEGORY_ICONS } from './icons';
import { SpendSplitCard } from './SpendSplitCard';

const YearStepper = ({ year, onStep, onToday, atCurrent }) => {
  const t = useT();

  return (
    <Stepper
      label={year}
      onPrev={() => onStep(-1)} prevLabel={t.year_previous}
      onNext={() => onStep(1)} nextLabel={t.year_next}
      onReset={atCurrent ? undefined : onToday} resetLabel={t.year_current}
      // Eine Jahreszahl braucht keine Monatsbreite
      labelClass="min-w-[4.5rem] lg:min-w-[5rem]"
    />
  );
};

const SummaryCard = ({ label, value, tone = '' }) => (
  <div className={`${CARD} px-4 py-4 lg:px-5`}>
    <p className="text-[11px] text-ink-3 uppercase tracking-[0.14em]">{label}</p>
    <p className={`text-xl font-semibold tracking-tight mt-1 ${tone}`}>{value}</p>
  </div>
);

const YearChart = ({ report, fmt }) => {
  const t = useT();
  const ceiling = Math.max(
    ...report.months.map((month) => Math.max(month.fixed + month.oneOff, month.income)),
    0,
  );
  const hasValues = ceiling > 0;
  const points = report.months.map((month, index) => {
    const x = ((index + 0.5) / 12) * 1200;
    const y = hasValues ? 144 - (month.income / ceiling) * 140 : 144;
    return `${x},${Math.max(4, y)}`;
  }).join(' ');

  return (
    <section data-group className={`${CARD} p-5 lg:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">{t.year_chart_title}</p>
          <p className="text-xs text-ink-3 mt-1">{t.year_chart_hint}</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-ink-3">
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-sm bg-ink" />{t.split_fixed}</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-sm bg-ink opacity-40" />{t.split_one_off}</span>
          <span className="flex items-center gap-1.5"><i className="w-3 border-t border-dashed border-ink" />{t.year_income}</span>
        </div>
      </div>

      <div className="relative">
        <div className="h-36 grid grid-cols-12 gap-1.5 sm:gap-2.5">
          {report.months.map((month) => {
            const fixedHeight = hasValues ? (month.fixed / ceiling) * 100 : 0;
            const oneOffHeight = hasValues ? (month.oneOff / ceiling) * 100 : 0;
            return (
              <div key={month.month} className="h-full flex flex-col-reverse rounded-t-sm overflow-hidden"
                title={`${t.months_full[month.month]} · ${t.split_fixed} ${fmt(month.fixed)} · ${t.split_one_off} ${fmt(month.oneOff)} · ${t.year_income} ${fmt(month.income)}`}>
                <span className="w-full bg-ink min-h-0" style={{ height: `${fixedHeight}%` }} />
                <span className="w-full bg-ink opacity-40 min-h-0" style={{ height: `${oneOffHeight}%` }} />
              </div>
            );
          })}
        </div>

        {hasValues && (
          <svg className="absolute inset-0 w-full h-36 text-ink pointer-events-none overflow-visible"
            viewBox="0 0 1200 144" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3"
              strokeDasharray="9 7" vectorEffect="non-scaling-stroke" />
            {report.months.map((month, index) => {
              const x = ((index + 0.5) / 12) * 1200;
              const y = Math.max(4, 144 - (month.income / ceiling) * 140);
              return <circle key={month.month} cx={x} cy={y} r="5" fill="currentColor" />;
            })}
          </svg>
        )}

        {!hasValues && (
          <div className="absolute inset-0 flex items-center justify-center border-b border-border">
            <p className="text-sm text-ink-3">{t.year_empty}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-1.5 sm:gap-2.5 mt-2">
        {report.months.map((month) => (
          <span key={month.month} className="text-[10px] text-ink-3 text-center truncate">
            {t.months_short[month.month]}
          </span>
        ))}
      </div>
    </section>
  );
};

export const YearTab = ({
  report,
  year,
  onStep,
  onToday,
  atCurrent,
  fmt,
  currentFixed,
  currentOneOff,
}) => {
  const t = useT();
  const lang = useLang();
  const categoryById = new Map(EXPENSE_CATEGORIES.map((category) => [category.id, category]));
  const oneOffTotal = report.totals.oneOff;
  const biggest = report.purchases.slice(0, 5);

  return (
    <div className="space-y-5 lg:space-y-6">
      <YearStepper year={year} onStep={onStep} onToday={onToday} atCurrent={atCurrent} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard label={t.year_total_in} value={fmt(report.totals.income)} />
        <SummaryCard label={t.year_total_out} value={fmt(report.totals.out)} />
        <SummaryCard label={t.year_total_left} value={fmt(report.totals.left)}
          tone={report.totals.left < 0 ? 'text-error' : report.totals.left > 0 ? 'text-success' : ''} />
      </div>

      <YearChart report={report} fmt={fmt} />

      <SpendSplitCard perspective="expenses" fixed={currentFixed} oneOff={currentOneOff}
        fmt={fmt} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
        <section data-group className={`${CARD} p-5 space-y-4`}>
          <div className="flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-ink-3" />
            <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">{t.year_categories}</p>
          </div>
          {report.categories.length === 0
            ? <p className="text-sm text-ink-3">{t.year_no_expenses}</p>
            : report.categories.map((row, index) => {
              const category = categoryById.get(row.category);
              const Icon = CATEGORY_ICONS[row.category] || CATEGORY_ICONS.other;
              const share = oneOffTotal > 0 ? (row.amount / oneOffTotal) * 100 : 0;
              return (
                <MeterRow key={row.category} share={share} rank={index} index={index}
                  leading={
                    <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-ink-2" />
                    </div>
                  }
                  title={category ? t[category.labelKey] : t.xcat_other}
                  value={fmt(row.amount)} meta={`${share.toFixed(0)}%`} />
              );
            })}
        </section>

        <section data-group className={`${CARD} p-5 space-y-4`}>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-ink-3" />
            <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">{t.year_biggest}</p>
          </div>
          {biggest.length === 0
            ? <p className="text-sm text-ink-3">{t.year_no_expenses}</p>
            : biggest.map(({ transaction, amount }, index) => (
              <div key={transaction.id} className="flex items-center gap-3">
                <span className="w-7 text-xs text-ink-3 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {transaction.title || transaction.merchant || t.exp_item_untitled}
                  </p>
                  <p className="text-xs text-ink-3 truncate">
                    {[transaction.merchant, fmtDateFromISO(transaction.date, lang, t.months_short)]
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-sm font-semibold shrink-0">{fmt(amount)}</span>
              </div>
            ))}
        </section>
      </div>
    </div>
  );
};
