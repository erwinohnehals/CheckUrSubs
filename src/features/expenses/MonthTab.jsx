// ─── Monat ────────────────────────────────────────────────────────────────────
// Der Reiter, der die Ausgabenseite brauchbar macht: ein Monat, seine Summe, und
// darunter die Liste nach Tagen. Die Tageskopfzeile bleibt beim Scrollen stehen —
// wer weit unten ist, weiß sonst nicht mehr, welchen Tag er ansieht. Der
// Monatsschalter bleibt aus demselben Grund oben stehen: der Tag allein sagt
// nicht, in welchem Monat man gerade liest.
//
// Gesucht wird über dieselbe Liste. Der Bereichsschalter der Leiste entscheidet,
// ob der angezeigte Monat der Vorrat ist oder alles — und die Zahlen oben
// beschreiben immer genau das, was darunter steht.

import { useMemo, useState } from 'react';
import { List, Plus, Search, Wallet, Settings2 } from 'lucide-react';
import { useLang, useT } from '../../lib/i18n';
import { fmtDateFromISO, fmtDateFromISOWithYear, todayISO } from '../../lib/dates';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../lib/expenseCategories';
import { CARD, btn, StatusPill } from '../../ui';
import { groupByDay, monthSummary } from './summary';
import { ALL_MONTHS, applyFilter, availableFacets, isFilterActive } from './filter';
import { ExpenseFilters } from './ExpenseFilters';
import { ExpenseRow } from './ExpenseRow';
import { MonthStepper } from './MonthStepper';
import { BudgetStrip } from './BudgetStrip';

// Über alle Monate hinweg wäre die Liste sonst so lang, dass das Blättern
// zäh wird. Wer mehr als das sucht, sucht genauer.
const MAX_ROWS = 200;

const LABEL_KEY_BY_CATEGORY = new Map(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((category) => [category.id, category.labelKey]),
);

// „Heute" und „Gestern" statt eines Datums, das man erst nachrechnen muss.
// Über mehrere Monate hinweg trägt der Tag sein Jahr mit — sonst stünden
// zwei „14. März" untereinander und meinten verschiedene.
const useDayLabel = (withYear) => {
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
    const shown   = withYear
      ? fmtDateFromISOWithYear(date, lang, t.months_short)
      : fmtDateFromISO(date, lang, t.months_short);
    return `${weekday}, ${shown}`;
  };
};

export const MonthTab = ({
  month, onStep, onToday, atCurrent,
  transactions, amountUSD, fmt, fmtAmountIn, accountLabelOf, docCounts = {},
  budgetRows, onOpenBudget,
  filter, onFilterChange,
  onAdd, onEdit, onRepeat, onDelete, onManageAccounts, isDesktop,
}) => {
  const t = useT();
  const [expanded, setExpanded] = useState(() => new Set());

  const allMonths = filter.scope === ALL_MONTHS;
  const active    = isFilterActive(filter);
  const dayLabel  = useDayLabel(allMonths);

  // Beschriftungen für den Heuhaufen: „Lebensmittel" soll sich finden lassen,
  // nicht nur der Schlüssel `groceries`.
  const labels = useMemo(() => ({
    categoryLabel: (id) => t[LABEL_KEY_BY_CATEGORY.get(id)] || '',
    accountLabel:  accountLabelOf,
  }), [t, accountLabelOf]);

  const facets = useMemo(() => availableFacets(transactions), [transactions]);

  const { days, summary, count, capped } = useMemo(() => {
    const rows = applyFilter(transactions, filter, labels, month);
    const grouped = groupByDay(rows, amountUSD);

    // Gekappt wird die Anzeige, nicht die Rechnung — die Summe oben bleibt die
    // Summe aller Treffer, sonst stimmte sie nicht mit der Zeile darunter überein.
    let shown = grouped;
    let cut = false;
    if (rows.length > MAX_ROWS) {
      shown = [];
      let taken = 0;
      for (const day of grouped) {
        if (taken >= MAX_ROWS) { cut = true; break; }
        shown.push(day);
        taken += day.transactions.length;
      }
    }

    return {
      days:    shown,
      summary: monthSummary(rows, amountUSD),
      count:   rows.length,
      capped:  cut,
    };
  }, [transactions, filter, labels, month, amountUSD]);

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
      {/* Bleibt oben stehen: der Tag darunter klebt schon, und ein Tag ohne
          seinen Monat ist eine halbe Angabe. Über alle Monate hinweg hat er
          nichts zu sagen und tritt ab. */}
      {!allMonths && (
        <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-surface/90 backdrop-blur-sm lg:-mx-8 lg:px-8">
          <MonthStepper month={month} onStep={onStep} onToday={onToday} atCurrent={atCurrent} />
        </div>
      )}

      <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
        {/* ── Budget, sofern es welches gibt — es gilt für einen Monat ── */}
        {!allMonths && (
          <BudgetStrip rows={budgetRows} fmt={fmt} onOpen={onOpenBudget} className="lg:col-span-3" />
        )}

        {/* ── Kopfzahlen ── */}
        <section data-group className={`${CARD} p-6 lg:col-span-3 lg:flex lg:items-center lg:gap-10 lg:p-8`}>
          <div className="lg:flex-1 lg:min-w-0">
            <p className="text-ink-3 uppercase text-[11px] tracking-[0.18em] font-medium mb-2">
              {active || allMonths ? t.exp_results_sum : t.exp_month_out}
            </p>
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

        {/* ── Suchen und Einschränken ── */}
        {/* Auf einer Seite, auf der noch nie etwas stand, wäre die Leiste nur
            ein Versprechen auf nichts. */}
        {everUsed && (
          <section data-group className="lg:col-span-3">
            <ExpenseFilters filter={filter} onChange={onFilterChange} facets={facets}
              resultCount={count} resultSum={fmt(summary.expense)} active={active} />
          </section>
        )}

        {/* ── Die Liste ── */}
        <section data-group className="space-y-3 lg:col-span-3">
          {days.length === 0
            ? (active
              ? <NoResults />
              : <EmptyMonth everUsed={everUsed} onAdd={onAdd} />)
            : (
              <>
                <div className="flex items-center gap-2 px-1">
                  <List className="w-4 h-4 text-ink-3" strokeWidth={2} />
                  <h3 className="font-semibold text-base tracking-tight">
                    {active ? t.exp_results_title : t.exp_list_title}
                  </h3>
                  <span className="ml-auto text-xs text-ink-3">{t.exp_count(count)}</span>
                </div>

                <div className="space-y-4">
                  {days.map((day) => (
                    <div key={day.date}>
                      {/* Bleibt stehen, solange der Tag läuft — unter dem Monatsschalter */}
                      <div className="sticky top-14 z-10 flex items-baseline justify-between gap-3
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
                            onRepeat={() => onRepeat(transaction)}
                            onDelete={() => onDelete(transaction)}
                            isDesktop={isDesktop} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {capped && (
                  <p className="text-[11px] text-ink-3 text-center px-4">{t.exp_results_capped(MAX_ROWS)}</p>
                )}
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

// Nichts gefunden ist kein leerer Monat — der Weg hier heraus ist die Leiste
// darüber, nicht ein neuer Vorgang.
const NoResults = () => {
  const t = useT();

  return (
    <div className={`${CARD} flex flex-col items-center gap-2 px-4 py-12 text-center`}>
      <Search className="w-5 h-5 text-ink-3" />
      <p className="text-sm text-ink-2">{t.exp_results_empty}</p>
      <p className="text-[11px] text-ink-3 max-w-[280px] leading-relaxed">{t.exp_results_hint}</p>
    </div>
  );
};
