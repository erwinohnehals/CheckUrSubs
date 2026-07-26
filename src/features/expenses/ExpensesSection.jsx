// ─── Bereich Ausgaben ─────────────────────────────────────────────────────────
// Die drei Reiter des Bereichs und alles, was über ihnen liegt: Formular,
// Kontenverwaltung, Rückgängig-Streifen. App gibt die Hüllen der Ansichten als
// `paneProps` herein — die Animation beim Wechseln gehört dem Rahmen, nicht dem
// Bereich, und beide Bereiche wechseln gleich.
//
// Hier wird auch gerechnet, was Monat und Budget gemeinsam brauchen: die
// Budgetzeilen des Monats. Beide Reiter zeigen dieselben Zahlen, und zweimal
// gefaltet wären es zwei Gelegenheiten, sie auseinanderlaufen zu lassen.
//
import { useCallback, useMemo, useState } from 'react';
import { CalendarRange, PiggyBank, Wallet, Settings2 } from 'lucide-react';
import { useLang, useT } from '../../lib/i18n';
import { fmtMoney, toUSD, DEFAULT_RATES } from '../../lib/money';
import { createCarryover, spendIndex } from '../../lib/budget';
import { btn, PageHeader, MobilePageHeader, Toast } from '../../ui';
import { MonthTab } from './MonthTab';
import { BudgetTab } from './BudgetTab';
import { YearTab } from './YearTab';
import { ExpenseModal } from './ExpenseModal';
import { AccountsPanel } from './AccountsPanel';
import { knownTags } from './summary';
import { budgetRows, convertBudgets } from './budgetRows';
import { buildYearReport } from './yearSummary';

const PANE_BODY = 'p-4 pt-6 space-y-5 lg:p-8 lg:pt-7 lg:space-y-7 lg:max-w-[1180px]';

export const ExpensesSection = ({
  expenses, paneProps, settings, sectionSwitch, onOpenBudget,
  fmt, rates, currency, docCounts, onDocsChange, isDesktop,
  contractEntries, recurringMonthly, currentOneOff,
}) => {
  const t    = useT();
  const lang = useLang();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  // Ein Einkauf in Franken und einer in Euro dürfen nicht stumpf addiert werden.
  // Gerechnet wird über die gemeinsame Größe, angezeigt in der Anzeigewährung.
  const amountUSD = useCallback(
    (transaction) => toUSD(transaction.amount, transaction.currency_code, rates),
    [rates]);
  const transactionAmountUSD = useCallback(
    (amount, transaction) => toUSD(amount, transaction.currency_code, rates),
    [rates]);

  // In der Zeile steht dagegen der Betrag, wie er erfasst wurde
  const fmtAmountIn = useCallback(
    (code) => (value) => fmtMoney(Number(value) || 0, code || 'EUR', lang),
    [lang]);

  const accountLabelOf = useCallback((id) => {
    if (!id) return '';
    return expenses.accounts.find((account) => account.id === id)?.label || '';
  }, [expenses.accounts]);

  const tags = useMemo(() => knownTags(expenses.transactions), [expenses.transactions]);

  // ── Budget ─────────────────────────────────────────────────────────────────
  // Gefaltet wird in der Rechengröße: eine Grenze in Euro und ein Einkauf in
  // Franken lassen sich sonst nicht vergleichen. Die gespeicherten Grenzen
  // bleiben davon unberührt — 400 € sind auch nächstes Jahr 400 €.
  const spentAt = useMemo(
    () => spendIndex(expenses.transactions,
      (amount, transaction) => toUSD(amount, transaction.currency_code, rates)).at,
    [expenses.transactions, rates]);

  const carryover = useMemo(
    () => createCarryover(
      convertBudgets(expenses.budgets, (amount, code) => toUSD(amount, code, rates)),
      spentAt),
    [expenses.budgets, rates, spentAt]);

  const rows = useMemo(
    () => budgetRows({ budgets: expenses.budgets, carryover, spentAt, month: expenses.month }),
    [expenses.budgets, carryover, spentAt, expenses.month]);

  const yearReport = useMemo(() => buildYearReport({
    transactions: expenses.transactions,
    entries: contractEntries,
    year,
    transactionAmount: transactionAmountUSD,
    recurringAmount: (entry) =>
      toUSD(entry.price, entry.currency_code || 'EUR', rates),
  }), [expenses.transactions, contractEntries, year, transactionAmountUSD, rates]);

  // Eingetippt wird in der Anzeigewährung, gerechnet wird in der Rechengröße —
  // das Feld braucht den Rückweg
  const rate = rates?.[currency] ?? DEFAULT_RATES[currency] ?? 1;
  const toDisplay = useCallback(
    (usd) => Math.round(usd * rate * 100) / 100, [rate]);

  const setCap = useCallback(
    (category, amount) => expenses.setBudget(category, { amount, currency }),
    [expenses, currency]);

  // Ein archiviertes Konto bleibt in der Auswahl, solange der bearbeitete oder
  // wiederholte Vorgang darauf zeigt — sonst fiele es beim Speichern still weg.
  const modalAccounts = useMemo(() => {
    const active  = expenses.activeAccounts;
    const current = expenses.modalInitial?.account_id;
    if (!current || active.some((account) => account.id === current)) return active;

    const archived = expenses.accounts.find((account) => account.id === current);
    return archived ? [...active, archived] : active;
  }, [expenses.activeAccounts, expenses.accounts, expenses.modalInitial]);

  const manageAccounts = (
    <button type="button" onClick={expenses.openAccounts} className={btn('secondary', 'sm')}>
      <Settings2 className="w-3.5 h-3.5" />{t.accounts_title}
    </button>
  );

  return (
    <>
      {/* ════ MONAT ════ */}
      <div {...paneProps('month')}>
        <div className={PANE_BODY}>
          <PageHeader title={t.nav_month} subtitle={t.month_subtitle}>{manageAccounts}</PageHeader>
          <MobilePageHeader icon={Wallet} title={t.nav_month}>{settings}</MobilePageHeader>
          {sectionSwitch}

          <MonthTab
            month={expenses.month} onStep={expenses.stepMonth} onToday={expenses.thisMonth}
            atCurrent={expenses.atCurrentMonth}
            transactions={expenses.transactions}
            amountUSD={amountUSD} fmt={fmt} fmtAmountIn={fmtAmountIn}
            accountLabelOf={accountLabelOf} docCounts={docCounts}
            budgetRows={rows} onOpenBudget={onOpenBudget}
            onAdd={expenses.openAdd} onEdit={expenses.openEdit}
            onRepeat={expenses.openRepeat} onDelete={expenses.remove}
            onManageAccounts={expenses.openAccounts}
            isDesktop={isDesktop} />
        </div>
      </div>

      {/* ════ BUDGET ════ */}
      <div {...paneProps('budget')}>
        <div className={PANE_BODY}>
          <PageHeader title={t.nav_budget} subtitle={t.budget_subtitle} />
          <MobilePageHeader icon={PiggyBank} title={t.nav_budget}>{settings}</MobilePageHeader>
          {sectionSwitch}

          <BudgetTab
            month={expenses.month} onStep={expenses.stepMonth} onToday={expenses.thisMonth}
            atCurrent={expenses.atCurrentMonth}
            rows={rows} fmt={fmt} toDisplay={toDisplay} currency={currency}
            onSetCap={setCap} onResetCarry={expenses.resetCarryover}
            onRemoveCap={expenses.removeBudget} />
        </div>
      </div>

      {/* ════ JAHR ════ */}
      <div {...paneProps('year')}>
        <div className={PANE_BODY}>
          <PageHeader title={t.nav_year} subtitle={t.year_subtitle} />
          <MobilePageHeader icon={CalendarRange} title={t.nav_year}>{settings}</MobilePageHeader>
          {sectionSwitch}
          <YearTab report={yearReport} year={year}
            onStep={(delta) => setYear((value) => value + delta)}
            onToday={() => setYear(currentYear)} atCurrent={year === currentYear}
            fmt={fmt} currentFixed={recurringMonthly} currentOneOff={currentOneOff} />
        </div>
      </div>

      {/* ── Ausgabe erfassen / bearbeiten ── */}
      <ExpenseModal key={expenses.modalKey}
        open={expenses.modalOpen} initial={expenses.modalInitial}
        isEditing={Boolean(expenses.editing)} isRepeat={expenses.repeating}
        accounts={modalAccounts} knownTags={tags} currency={currency}
        onSave={expenses.save} onClose={expenses.closeModal} onDocsChange={onDocsChange}
        isDesktop={isDesktop} />

      {/* ── Konten ── */}
      <AccountsPanel open={expenses.accountsOpen} accounts={expenses.accounts}
        onCreate={expenses.createAccount} onRename={expenses.updateAccount}
        onArchive={expenses.archiveAccount} onRestore={expenses.restoreAccount}
        onClose={expenses.closeAccounts} isDesktop={isDesktop} />

      {/* ── Rückgängig ── */}
      <Toast open={Boolean(expenses.toast)} title={t.exp_deleted}
        entry={expenses.toast ? { name: expenses.toast.transaction.title || expenses.toast.transaction.merchant } : null}
        onUndo={expenses.undoRemove} />
    </>
  );
};
