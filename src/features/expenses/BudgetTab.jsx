// ─── Budget ───────────────────────────────────────────────────────────────────
// Eine stehende Obergrenze je Kategorie, kein Monatsplan. Was der Februar übrig
// lässt, steht im März zusätzlich zur Verfügung; wer im Februar darüber liegt,
// hat im März entsprechend weniger. Gerechnet wird das in lib/budget.js, sortiert
// in budgetRows.js — hier wird es nur gezeigt.
//
// Der Balken ist die einzige Farbe auf dieser Seite: ruhige Tinte im Rahmen,
// Warnton kurz davor, Fehlerton darüber. Wer nichts Rotes sieht, ist im Plan.

import { useCallback, useState } from 'react';
import { Check, Info, MoreHorizontal, Pencil, PiggyBank, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { shiftMonth } from '../../lib/dates';
import { getCurrency } from '../../lib/money';
import { parseAmount } from '../../lib/expenseStore';
import { CARD, INPUT_CLASS, btn, Note, PopMenu, MenuItem, StatusPill, useDismiss } from '../../ui';
import { CATEGORY_ICONS } from './icons';
import { BudgetMeter } from './BudgetMeter';
import { MonthStepper } from './MonthStepper';

// Der Ton eines Balkens kennt „neutral“ als Abwesenheit von Farbe; die Pille
// nennt dasselbe „muted“
const PILL_TONE = { neutral: 'muted', warning: 'warning', error: 'error' };

// Der Monatsname, aus dem der Übertrag kommt — „aus Februar“ liest sich schneller
// als „aus 2026-02“
const useMonthName = () => {
  const t = useT();
  return (month) => t.months_full[Number(String(month).split('-')[1]) - 1] || '';
};

// ── Die Grenze eintippen ──────────────────────────────────────────────────────
// Eingetippt wird in der Anzeigewährung; gespeichert wird genau das, zusammen mit
// ihrem Code. Eine Grenze von 400 € ist in einem halben Jahr immer noch eine von
// 400 € — umgerechnet wird erst beim Vergleich.
const CapEditor = ({ initial, symbol, onSave, onCancel }) => {
  const t = useT();
  const [draft, setDraft] = useState(initial ? String(initial) : '');

  const save = () => onSave(parseAmount(draft));

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 min-w-0">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2 text-sm pointer-events-none">{symbol}</span>
        <input autoFocus value={draft} inputMode="decimal" placeholder="0,00"
          aria-label={t.budget_cap_hint}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter')  save();
            if (event.key === 'Escape') onCancel();
          }}
          className={`${INPUT_CLASS} bg-surface-2 pl-8 py-2 tabular-nums`} />
      </div>
      <button type="button" title={t.modal_save} onClick={save}
        className="w-9 h-9 shrink-0 rounded-lg border border-border flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface-3 transition">
        <Check className="w-4 h-4" />
      </button>
      <button type="button" title={t.modal_cancel} onClick={onCancel}
        className="w-9 h-9 shrink-0 rounded-lg border border-border flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-3 transition">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const RowMenu = ({ label, onEdit, onReset, onRemove, canReset }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  const pick = (action) => { close(); action(); };

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="menu" aria-expanded={open} aria-label={`${t.budget_cap} · ${label}`}
        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-3 transition">
        <MoreHorizontal className="w-4 h-4" />
      </button>

      <PopMenu open={open} role="menu" className="top-full right-0 mt-1" origin="top right">
        <MenuItem icon={Pencil} onClick={() => pick(onEdit)}>{t.budget_edit}</MenuItem>
        {canReset && <MenuItem icon={RotateCcw} onClick={() => pick(onReset)}>{t.budget_reset}</MenuItem>}
        <MenuItem icon={Trash2} onClick={() => pick(onRemove)}
          className="hover:text-error">{t.budget_remove}</MenuItem>
      </PopMenu>
    </div>
  );
};

// ── Eine Kategorie mit Grenze ─────────────────────────────────────────────────
const BudgetRow = ({
  row, index, fmt, toDisplay, symbol, monthName, previousMonth,
  editing, onStartEdit, onCancelEdit, onSave, onReset, onRemove,
}) => {
  const t    = useT();
  const Icon = CATEGORY_ICONS[row.id] || CATEGORY_ICONS.other;

  // Ein Übertrag von 0 ist keine Nachricht — dann steht dort die Grenze selbst
  const subtitle = row.carry !== 0
    ? t.budget_carry_from(`${row.carry > 0 ? '+' : '−'}${fmt(Math.abs(row.carry))}`, monthName(previousMonth))
    : t.budget_cap_of(fmt(row.cap));

  return (
    <div className="px-4 py-3.5 bg-surface-2 space-y-2.5">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-ink-2" strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{t[row.labelKey]}</p>
          <p className="text-xs text-ink-3 truncate">{subtitle}</p>
        </div>

        {!editing && (
          <>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold tabular-nums">
                {t.budget_of(fmt(row.spent), fmt(row.available))}
              </p>
              <p className={`text-xs tabular-nums ${row.over ? 'text-error' : 'text-ink-3'}`}>
                {row.over ? t.budget_over_by(fmt(Math.abs(row.remaining))) : t.budget_left(fmt(row.remaining))}
              </p>
            </div>
            <RowMenu label={t[row.labelKey]} canReset={row.carry !== 0}
              onEdit={onStartEdit} onReset={onReset} onRemove={onRemove} />
          </>
        )}
      </div>

      {editing
        // Am Telefon ist neben der Zeile kein Platz für ein Feld — es bekommt
        // eine eigene, und der Balken tritt so lange zurück
        ? <CapEditor initial={toDisplay(row.cap)} symbol={symbol}
            onSave={onSave} onCancel={onCancelEdit} />
        : <BudgetMeter ratio={row.ratio} tone={row.tone} index={index} />}
    </div>
  );
};

// ── Eine Kategorie ohne Grenze ────────────────────────────────────────────────
const UnbudgetedRow = ({
  row, fmt, symbol, monthName, editing, onStartEdit, onCancelEdit, onSave,
}) => {
  const t    = useT();
  const Icon = CATEGORY_ICONS[row.id] || CATEGORY_ICONS.other;

  return (
    <div className="px-4 py-2.5 bg-surface-2 space-y-2.5">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-ink-3" strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{t[row.labelKey]}</p>
          <p className="text-xs text-ink-3 truncate">
            {row.startsAt ? t.budget_starts(monthName(row.startsAt)) : t.budget_none}
          </p>
        </div>

        {!editing && (
          <>
            {row.spent > 0 && (
              <span className="text-sm text-ink-2 tabular-nums shrink-0">{fmt(row.spent)}</span>
            )}
            <button type="button" onClick={onStartEdit} className={btn('secondary', 'sm', 'shrink-0')}>
              <Plus className="w-3.5 h-3.5" />{t.budget_set}
            </button>
          </>
        )}
      </div>

      {editing && <CapEditor initial="" symbol={symbol} onSave={onSave} onCancel={onCancelEdit} />}
    </div>
  );
};

export const BudgetTab = ({
  month, onStep, onToday, atCurrent, rows,
  fmt, toDisplay, currency,
  onSetCap, onResetCarry, onRemoveCap,
}) => {
  const t         = useT();
  const monthName = useMonthName();
  const symbol    = getCurrency(currency).symbol;

  const [editing, setEditing] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const { budgeted, unbudgeted, totals } = rows;
  const previousMonth = shiftMonth(month, -1);

  // Ohne Ausgaben und ohne Grenze hat eine Kategorie hier nichts zu sagen —
  // sichtbar wird sie, sobald jemand eine Grenze setzen will
  const listed = showAll
    ? unbudgeted
    : unbudgeted.filter((row) => row.spent > 0 || row.startsAt);

  const save = (category) => (amount) => {
    setEditing(null);
    onSetCap(category, amount);
  };

  return (
    <div className="space-y-5 lg:space-y-6">
      <MonthStepper month={month} onStep={onStep} onToday={onToday} atCurrent={atCurrent} />

      {budgeted.length === 0 && listed.length === 0 && !showAll ? (
        <EmptyBudget onShowAll={() => setShowAll(true)} />
      ) : (
        <div className="space-y-5 lg:space-y-6">
          {/* ── Kopfzahlen ── */}
          {budgeted.length > 0 && (
            <section data-group className={`${CARD} p-6 lg:p-8 space-y-5`}>
              <div className="lg:flex lg:items-center lg:gap-10">
                <div className="lg:flex-1 lg:min-w-0">
                  {/* Auch überzogen bleibt es „Übrig“ — ein negatives Übrig sagt
                      genau das, und der Ton daneben sagt, wie ernst es ist */}
                  <p className="text-ink-3 uppercase text-[11px] tracking-[0.18em] font-medium mb-2">
                    {t.budget_remaining}
                  </p>
                  <h2 className="text-5xl font-semibold tracking-tight mb-4 lg:text-6xl">
                    {fmt(totals.remaining)}
                  </h2>
                  <div className="flex items-center flex-wrap gap-2">
                    {/* Im Rahmen bleibt es farblos — Farbe trägt hier die Warnung */}
                    <StatusPill tone={totals.over > 0 ? 'error' : PILL_TONE[totals.tone]}
                      label={totals.over > 0 ? t.budget_over_count(totals.over) : t.budget_in_range} />
                  </div>
                </div>
                <div className="grid grid-cols-2 mt-6 text-left border-t border-border pt-5
                  lg:gap-10 lg:mt-0 lg:pt-0 lg:border-t-0 lg:border-l lg:pl-10 lg:w-[320px] lg:shrink-0">
                  <div>
                    <p className="text-xl font-semibold tracking-tight lg:text-2xl">{fmt(totals.spent)}</p>
                    <p className="text-ink-3 text-[11px] uppercase tracking-[0.12em] mt-1">{t.budget_spent}</p>
                  </div>
                  <div className="text-right lg:text-left">
                    <p className="text-xl font-semibold tracking-tight lg:text-2xl">{fmt(totals.available)}</p>
                    <p className="text-ink-3 text-[11px] uppercase tracking-[0.12em] mt-1">{t.budget_available}</p>
                  </div>
                </div>
              </div>

              <BudgetMeter ratio={totals.ratio} tone={totals.tone} />
            </section>
          )}

          {/* ── Die Grenzen ── */}
          {budgeted.length > 0 && (
            <section data-group className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <PiggyBank className="w-4 h-4 text-ink-3" strokeWidth={2} />
                <h3 className="font-semibold text-base tracking-tight">{t.budget_all}</h3>
              </div>

              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                {budgeted.map((row, index) => (
                  <BudgetRow key={row.id} row={row} index={index}
                    fmt={fmt} toDisplay={toDisplay} symbol={symbol}
                    monthName={monthName} previousMonth={previousMonth}
                    editing={editing === row.id}
                    onStartEdit={() => setEditing(row.id)}
                    onCancelEdit={() => setEditing(null)}
                    onSave={save(row.id)}
                    onReset={() => onResetCarry(row.id)}
                    onRemove={() => onRemoveCap(row.id)} />
                ))}
              </div>

              <Note icon={Info}>{t.budget_carry_note}</Note>
            </section>
          )}

          {/* ── Ohne Grenze ── */}
          {/* Eine Überschrift über einer leeren Liste ist keine Überschrift: hat
              jede Kategorie mit Ausgaben schon eine Grenze, bleibt nur der Weg
              zu den übrigen stehen. */}
          <section data-group className="space-y-3">
            {listed.length === 0 ? (
              <button type="button" onClick={() => setShowAll(true)}
                className="w-full text-xs text-ink-3 hover:text-ink transition py-2">
                {t.budget_show_all}
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 px-1">
                  <h3 className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">{t.budget_unbudgeted}</h3>
                  {(unbudgeted.length > listed.length || showAll) && (
                    <button type="button" onClick={() => setShowAll((current) => !current)}
                      className="text-xs text-ink-3 hover:text-ink transition">
                      {showAll ? t.budget_show_less : t.budget_show_all}
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                  {listed.map((row) => (
                    <UnbudgetedRow key={row.id} row={row} fmt={fmt} symbol={symbol} monthName={monthName}
                      editing={editing === row.id}
                      onStartEdit={() => setEditing(row.id)}
                      onCancelEdit={() => setEditing(null)}
                      onSave={save(row.id)} />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

// Leer bleibt leise: gedämpfte Schrift, keine Farbe
const EmptyBudget = ({ onShowAll }) => {
  const t = useT();

  return (
    <div data-group className={`${CARD} flex flex-col items-center text-center px-6 py-12 space-y-5 lg:py-16`}>
      <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center">
        <PiggyBank className="w-8 h-8 text-ink-3" strokeWidth={1.5} />
      </div>
      <div className="space-y-2">
        <p className="text-lg font-semibold tracking-tight">{t.budget_empty_title}</p>
        <p className="text-sm text-ink-3 leading-relaxed max-w-[320px]">{t.budget_empty_subtitle}</p>
      </div>
      <button type="button" onClick={onShowAll} className={btn('primary', 'lg')}>
        <Plus className="w-4 h-4" />{t.budget_set}
      </button>
    </div>
  );
};
