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
import { useCallback, useMemo, useRef, useState } from 'react';
import { CalendarRange, PiggyBank, Wallet, Settings2, FileUp, Trash2 } from 'lucide-react';
import { useLang, useT } from '../../lib/i18n';
import { fmtMoney, toUSD, DEFAULT_RATES } from '../../lib/money';
import { createCarryover, spendIndex } from '../../lib/budget';
import { btn, ConfirmDialog, PageHeader, MobilePageHeader, Toast } from '../../ui';
import { MonthTab } from './MonthTab';
import { BudgetTab } from './BudgetTab';
import { YearTab } from './YearTab';
import { ExpenseModal } from './ExpenseModal';
import { AccountsPanel } from './AccountsPanel';
import { ImportPanel } from './ImportPanel';
import { knownTags } from './summary';
import { EMPTY_FILTER } from './filter';
import { budgetRows, convertBudgets } from './budgetRows';
import { buildYearReport } from './yearSummary';

const PANE_BODY = 'p-4 pt-6 space-y-5 lg:p-8 lg:pt-7 lg:space-y-7 lg:max-w-[1180px]';

// ── Löschen bestätigen ────────────────────────────────────────────────────────
// Nach links wischen heißt bei den Verträgen „archivieren“ und fragt beim
// Löschen nach. Hier hieß dieselbe Geste „weg damit“, ohne Rückfrage — dieselbe
// Hand, zwei Bedeutungen. Jetzt fragt auch diese Seite.
const ConfirmRemove = ({ transaction, onConfirm, onCancel }) => {
  const t = useT();
  const [shown, setShown] = useState(transaction);
  if (transaction && transaction !== shown) setShown(transaction);

  const label = shown?.title || shown?.merchant || t.exp_item_untitled;

  return (
    <ConfirmDialog
      open={Boolean(transaction)}
      title={`${t.exp_delete} «${label}»?`}
      body={t.exp_delete_confirm}
      confirmLabel={t.exp_delete}
      icon={Trash2}
      onConfirm={onConfirm}
      onCancel={onCancel} />
  );
};

export const ExpensesSection = ({
  expenses, paneProps, settings, sectionSwitch, onOpenBudget,
  fmt, rates, currency, docCounts, onDocsChange, isDesktop,
  contractEntries, recurringMonthly, currentOneOff,
}) => {
  const t    = useT();
  const lang = useLang();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  // Was gelöscht werden soll, wartet hier auf die Antwort
  const [pendingRemove, setPendingRemove] = useState(null);
  // Suche und Einschränkung überleben den Monatswechsel: wer nach „Rewe" sucht
  // und einen Monat zurückblättert, sucht immer noch nach „Rewe".
  const [filter, setFilter] = useState(EMPTY_FILTER);

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

  // Der Dateidialog gehört dem Bereich, nicht dem Panel: er wird von zwei
  // Stellen ausgelöst (leerer Zustand und Fußzeile) und darf beim Neuaufbau des
  // Panels nicht verschwinden.
  const fileRef = useRef(null);

  const pickFile = useCallback(() => fileRef.current?.click(), []);

  const onFileChosen = useCallback((event) => {
    const [file] = event.target.files || [];
    // Zurücksetzen, damit dieselbe Datei ein zweites Mal ausgewählt werden kann
    event.target.value = '';
    if (file) expenses.loadImportFile(file);
  }, [expenses]);

  const manageAccounts = (
    <>
      <button type="button" onClick={expenses.openImport} className={btn('secondary', 'sm')}>
        <FileUp className="w-3.5 h-3.5" />{t.imp_open}
      </button>
      <button type="button" onClick={expenses.openAccounts} className={btn('secondary', 'sm')}>
        <Settings2 className="w-3.5 h-3.5" />{t.accounts_title}
      </button>
    </>
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
            filter={filter} onFilterChange={setFilter}
            onAdd={expenses.openAdd} onEdit={expenses.openEdit}
            onRepeat={expenses.openRepeat} onDelete={setPendingRemove}
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
        accounts={modalAccounts} entries={contractEntries} knownTags={tags} currency={currency}
        onSave={expenses.save} onClose={expenses.closeModal} onDocsChange={onDocsChange}
        isDesktop={isDesktop} />

      {/* ── Kontoauszug einlesen ── */}
      <input ref={fileRef} type="file" hidden accept=".csv,.CSV,.xml,.XML,.zip,.ZIP,text/csv,text/xml,application/zip"
        onChange={onFileChosen} />

      <ImportPanel open={expenses.importOpen} onClose={expenses.closeImport}
        state={expenses.importBatch} accounts={expenses.activeAccounts} entries={contractEntries}
        onPick={pickFile} onConfirm={expenses.confirmImport} error={expenses.importError}
        fmt={fmt} isDesktop={isDesktop} />

      {/* ── Konten ── */}
      <AccountsPanel open={expenses.accountsOpen} accounts={expenses.accounts}
        onCreate={expenses.createAccount} onRename={expenses.updateAccount}
        onArchive={expenses.archiveAccount} onRestore={expenses.restoreAccount}
        onClose={expenses.closeAccounts} isDesktop={isDesktop} />

      {/* ── Löschen bestätigen ── */}
      <ConfirmRemove transaction={pendingRemove}
        onConfirm={() => { expenses.remove(pendingRemove); setPendingRemove(null); }}
        onCancel={() => setPendingRemove(null)} />

      {/* ── Rückgängig ── */}
      <Toast open={Boolean(expenses.toast)} title={t.exp_deleted}
        entry={expenses.toast ? { name: expenses.toast.transaction.title || expenses.toast.transaction.merchant } : null}
        onUndo={expenses.undoRemove} />
    </>
  );
};
