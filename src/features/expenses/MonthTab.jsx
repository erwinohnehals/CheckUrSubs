// ─── Monat ────────────────────────────────────────────────────────────────────
// Der Reiter, der die Ausgabenseite brauchbar macht: ein Monat, seine Summe, und
// darunter die Liste nach Tagen. Die Tageskopfzeile bleibt beim Scrollen stehen —
// wer weit unten ist, weiß sonst nicht mehr, welchen Tag er ansieht.

import { useMemo, useState } from 'react';
import { List, Plus, Wallet, Settings2 } from 'lucide-react';
import { useLang, useT } from '../../lib/i18n';
import { fmtDateFromISO, todayISO } from '../../lib/dates';
import { CARD, btn, StatusPill } from '../../ui';
import { inMonth, groupByDay, monthSummary } from './summary';
import { ExpenseRow } from './ExpenseRow';
import { MonthStepper } from './MonthStepper';
import { BudgetStrip } from './BudgetStrip';

// „Heute" und „Gestern" statt eines Datums, das man erst nachrechnen muss
const useDayLabel = () => {
  const t    = useT();
  const lang = useLang();

  const today = todayISO();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = todayISO(yesterday);

  return (date) => {
    if (date === today)        return t.exp_today;
    if (date === yesterdayKey) return t.exp_yesterday;

    const parsed  = new Date(`${date}T00:00:00`);
    const weekday = t.days_short[(parsed.getDay() + 6) % 7];
    return `${weekday}, ${fmtDateFromISO(date, lang, t.months_short)}`;
  };
};

export const MonthTab = ({
  month, onStep, onToday, atCurrent,
  transactions, amountUSD, fmt, fmtAmountIn, accountLabelOf, docCounts = {},
  budgetRows, onOpenBudget,
  onAdd, onEdit, onDelete, onManageAccounts, isDesktop,
}) => {
  const t = useT();
  const dayLabel = useDayLabel();
  const [expanded, setExpanded] = useState(() => new Set());

  const { days, summary, count } = useMemo(() => {
    const rows = inMonth(transactions, month);
    return {
      days:    groupByDay(rows, amountUSD),
      summary: monthSummary(rows, amountUSD),
      count:   rows.length,
    };
  }, [transactions, month, amountUSD]);

  const toggle = (id) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  // Hat der Monat überhaupt schon einmal etwas gesehen? Ein leerer März sieht
  // anders aus als eine Seite, auf der noch nie etwas erfasst wurde.
  const everUsed = transactions.length > 0;

  return (
    <div className="space-y-5 lg:space-y-6">
      <MonthStepper month={month} onStep={onStep} onToday={onToday} atCurrent={atCurrent} />

      <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
        {/* ── Budget, sofern es welches gibt ── */}
        <BudgetStrip rows={budgetRows} fmt={fmt} onOpen={onOpenBudget} className="lg:col-span-3" />

        {/* ── Kopfzahlen ── */}
        <section data-group className={`${CARD} p-6 lg:col-span-3 lg:flex lg:items-center lg:gap-10 lg:p-8`}>
          <div className="lg:flex-1 lg:min-w-0">
            <p className="text-ink-3 uppercase text-[11px] tracking-[0.18em] font-medium mb-2">{t.exp_month_out}</p>
            <h2 className="text-5xl font-semibold tracking-tight mb-4 lg:text-6xl">{fmt(summary.expense)}</h2>
            <div className="flex items-center flex-wrap gap-2">
              <StatusPill label={t.exp_count(count)} />
            </div>
          </div>
          <div className="grid grid-cols-2 mt-6 text-left border-t border-border pt-5
            lg:grid-cols-2 lg:gap-10 lg:mt-0 lg:pt-0 lg:border-t-0 lg:border-l lg:pl-10 lg:w-[320px] lg:shrink-0">
            <div>
              <p className="text-xl font-semibold tracking-tight lg:text-2xl">{fmt(summary.income)}</p>
              <p className="text-ink-3 text-[11px] uppercase tracking-[0.12em] mt-1">{t.exp_month_in}</p>
            </div>
            <div className="text-right lg:text-left">
              <p className="text-xl font-semibold tracking-tight lg:text-2xl">{fmt(summary.net)}</p>
              <p className="text-ink-3 text-[11px] uppercase tracking-[0.12em] mt-1">{t.exp_month_net}</p>
            </div>
          </div>
        </section>

        {/* Am Desktop sitzt der Knopf in der Seitenleiste */}
        <div data-group className="flex items-center gap-2 lg:hidden">
          <button type="button" onClick={onAdd} className={btn('primary', 'md', 'flex-1 py-3')}>
            <Plus className="w-4 h-4" />{t.exp_add}
          </button>
          <button type="button" onClick={onManageAccounts} title={t.accounts_manage} aria-label={t.accounts_manage}
            className={btn('secondary', 'md', 'shrink-0 px-3 py-3')}>
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {/* ── Die Liste ── */}
        <section data-group className="space-y-3 lg:col-span-3">
          {days.length === 0
            ? <EmptyMonth everUsed={everUsed} onAdd={onAdd} />
            : (
              <>
                <div className="flex items-center gap-2 px-1">
                  <List className="w-4 h-4 text-ink-3" strokeWidth={2} />
                  <h3 className="font-semibold text-base tracking-tight">{t.exp_list_title}</h3>
                  <span className="ml-auto text-xs text-ink-3">{t.exp_count(count)}</span>
                </div>

                <div className="space-y-4">
                  {days.map((day) => (
                    <div key={day.date}>
                      {/* Bleibt stehen, solange der Tag läuft */}
                      <div className="sticky top-0 z-10 flex items-baseline justify-between gap-3
                        px-3 py-2 -mx-1 rounded-lg bg-surface/90 backdrop-blur-sm">
                        <span className="text-xs font-semibold tracking-tight text-ink-2">{dayLabel(day.date)}</span>
                        <span className="text-xs text-ink-3 tabular-nums whitespace-nowrap">
                          {day.expense > 0 && fmt(day.expense)}
                          {day.expense > 0 && day.income > 0 && ' · '}
                          {day.income > 0 && `+${fmt(day.income)}`}
                        </span>
                      </div>

                      <div className="mt-1 rounded-xl border border-border overflow-hidden divide-y divide-border">
                        {day.transactions.map((transaction) => (
                          <ExpenseRow key={transaction.id}
                            transaction={transaction}
                            fmtAmount={fmtAmountIn(transaction.currency_code)}
                            accountLabel={accountLabelOf(transaction.account_id)}
                            docCount={docCounts[transaction.id] || 0}
                            expanded={expanded.has(transaction.id)}
                            onToggle={() => toggle(transaction.id)}
                            onEdit={() => onEdit(transaction)}
                            onDelete={() => onDelete(transaction)}
                            isDesktop={isDesktop} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {!isDesktop && <p className="text-[11px] text-ink-3 text-center px-4">{t.exp_swipe_hint}</p>}
              </>
            )}
        </section>
      </div>
    </div>
  );
};

// Leer bleibt leise: gedämpfte Schrift, keine Farbe
const EmptyMonth = ({ everUsed, onAdd }) => {
  const t = useT();

  return (
    <div className={`${CARD} flex flex-col items-center text-center px-6 py-12 space-y-5 lg:py-16`}>
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <Wallet className="w-8 h-8 text-ink-3" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center">
          <Plus className="w-4 h-4 text-ink-3" />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-lg font-semibold tracking-tight">
          {everUsed ? t.exp_empty_month_title : t.exp_empty_title}
        </p>
        <p className="text-sm text-ink-3 leading-relaxed max-w-[280px]">
          {everUsed ? t.exp_empty_month_subtitle : t.exp_empty_subtitle}
        </p>
      </div>
      <button type="button" onClick={onAdd} className={btn('primary', 'lg')}>
        <Plus className="w-4 h-4" />{everUsed ? t.exp_add : t.exp_add_first}
      </button>
    </div>
  );
};
