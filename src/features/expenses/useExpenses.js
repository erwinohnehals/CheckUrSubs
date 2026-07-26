// ─── Zustand der Ausgabenseite ────────────────────────────────────────────────
// Alles, was der Bereich an Zustand braucht, an einer Stelle: die Vorgänge, die
// Konten, der Monat im Blick, das Formular und der Rückgängig-Streifen.
//
// Der Haken wird im Rumpf von App aufgerufen, damit der `+`-Knopf in der
// Seitenleiste das Formular öffnen kann, ohne dass App die Ausgaben kennt.

import { useState, useCallback, useRef, useEffect } from 'react';
import { useT } from '../../lib/i18n';
import { monthKey, shiftMonth } from '../../lib/dates';
import { createExpenseStore, repeatTransactionDraft } from '../../lib/expenseStore';
import { createAccountStore } from '../../lib/accountStore';
import { createBudgetStore } from '../../lib/budget';
import { createBankRuleStore, entryLinkKey } from '../../lib/bankRules';
import { readBankUpload } from '../../lib/bankFormats';
import { existingRefsOf, prepareImport, toTransaction } from '../../lib/bankImport';
import * as documentStore from '../../lib/documentStore';

export const expenseStore = createExpenseStore(window.localStorage);
export const accountStore = createAccountStore(window.localStorage);
export const budgetStore  = createBudgetStore(window.localStorage);
export const bankRuleStore = createBankRuleStore(window.localStorage);

// So lange bleibt ein gelöschter Vorgang zurückholbar — wie auf der Vertragsseite
const UNDO_MS = 5000;

export const useExpenses = ({ onDocsChange, entries = [] } = {}) => {
  const t = useT();

  const [transactions, setTransactions] = useState(() => expenseStore.list());
  const [accounts,     setAccounts]     = useState(() => accountStore.list());
  const [budgets,      setBudgets]      = useState(() => budgetStore.all());
  const [month,        setMonth]        = useState(() => monthKey(new Date()));

  const [modalOpen,    setModalOpen]    = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [repeatDraft,  setRepeatDraft]  = useState(null);
  const [modalKey,     setModalKey]     = useState(0);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [toast,        setToast]        = useState(null);

  // Bargeld und Girokonto entstehen bei der ersten Benutzung, nicht beim Laden
  // der App: wer nie eine Ausgabe erfasst, findet auch keine Konten vor.
  const seedRef = useRef(false);
  const ensureAccounts = useCallback(() => {
    if (seedRef.current) return;
    seedRef.current = true;
    setAccounts(accountStore.ensureSeeded({
      cash: t.account_seed_cash,
      bank: t.account_seed_bank,
    }));
  }, [t]);

  // Ein hängender Streifen darf das Löschen der Belege nicht überleben
  const toastRef = useRef(null);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  useEffect(() => () => {
    if (toastRef.current?.timeoutId) clearTimeout(toastRef.current.timeoutId);
  }, []);

  const openAdd = useCallback(() => {
    ensureAccounts();
    setEditing(null);
    setRepeatDraft(null);
    setModalKey((value) => value + 1);
    setModalOpen(true);
  }, [ensureAccounts]);

  const openEdit = useCallback((transaction) => {
    ensureAccounts();
    setRepeatDraft(null);
    setEditing(transaction);
    setModalKey((value) => value + 1);
    setModalOpen(true);
  }, [ensureAccounts]);

  const openRepeat = useCallback((transaction) => {
    ensureAccounts();
    setEditing(null);
    setRepeatDraft(repeatTransactionDraft(transaction));
    setModalKey((value) => value + 1);
    setModalOpen(true);
  }, [ensureAccounts]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setRepeatDraft(null);
  }, []);

  const openAccounts = useCallback(() => {
    ensureAccounts();
    setAccountsOpen(true);
  }, [ensureAccounts]);

  const save = useCallback((payload) => {
    const { id, ...attributes } = payload;

    // Der Store rechnet die Positionssumme und räumt die Eingabe auf — was
    // zurückkommt, ist der Stand, der auf der Platte liegt.
    const saved = editing
      ? expenseStore.update(editing.id, attributes)
      : expenseStore.create({ ...attributes, id });

    if (saved) {
      setTransactions((rows) => {
        const without = rows.filter((row) => row.id !== saved.id);
        return [...without, saved];
      });
      // Ein Vorgang, der am 3. März gebucht wurde, gehört auch in dessen Monat
      setMonth(monthKey(saved.date));
    }

    onDocsChange?.();
    closeModal();
  }, [editing, closeModal, onDocsChange]);

  const remove = useCallback((transaction) => {
    // Hing noch ein Streifen — den einfach schließen
    if (toast?.timeoutId) clearTimeout(toast.timeoutId);

    setTransactions((rows) => rows.filter((row) => row.id !== transaction.id));
    expenseStore.remove(transaction.id);

    // Die Belege fallen erst, wenn das Rückgängig-Fenster zu ist
    const timeoutId = window.setTimeout(() => {
      setToast(null);
      documentStore.removeAllFor(transaction.id)
        .then(() => onDocsChange?.())
        .catch(() => {});
    }, UNDO_MS);

    setToast({ transaction, timeoutId });
  }, [toast, onDocsChange]);

  const undoRemove = useCallback(() => {
    if (!toast) return;

    clearTimeout(toast.timeoutId);
    const restored = expenseStore.restore(toast.transaction);
    setTransactions((rows) =>
      rows.some((row) => row.id === restored.id) ? rows : [...rows, restored]);
    setToast(null);
  }, [toast]);

  // ── Kontoauszug einlesen ───────────────────────────────────────────────────
  // Der Stapel lebt im Zustand, bis er bestätigt wird. Nichts davon berührt die
  // Bücher: erst `confirmImport` schreibt, und zwar genau das, was in der
  // Prüfansicht steht.
  const [importOpen,  setImportOpen]  = useState(false);
  const [importBatch, setImportBatch] = useState(null);
  const [importError, setImportError] = useState('');

  const openImport = useCallback(() => {
    ensureAccounts();
    setImportError('');
    setImportOpen(true);
  }, [ensureAccounts]);

  const closeImport = useCallback(() => {
    setImportOpen(false);
    setImportBatch(null);
    setImportError('');
  }, []);

  const loadImportFile = useCallback(async (file) => {
    setImportError('');

    try {
      const buffer = await file.arrayBuffer();
      const { format, rows, parts } = await readBankUpload(buffer, file.name);

      if (!format || !rows.length) {
        setImportBatch(null);
        setImportError(t.imp_unknown);
        return;
      }

      const rules = bankRuleStore.all();
      const list  = accountStore.active();
      const items = prepareImport({
        rows,
        learned: rules.categories,
        accountMap: rules.accounts,
        existingRefs: existingRefsOf(expenseStore.list()),
        entries,
        learnedEntries: rules.entries,
      });

      // Die Datei sagt, zu welchem Konto sie gehört; gemerkt wurde es vielleicht
      // schon einmal. Sonst steht das erste Konto da, und der Nutzer korrigiert.
      const known = rows.map((row) => bankRuleStore.accountFor(row.account_key)).find(Boolean);

      setImportBatch({
        key: `${file.name}:${Date.now()}`,
        name: file.name,
        format,
        parts,
        items,
        accountId: known || list[0]?.id || null,
      });
    } catch {
      setImportBatch(null);
      setImportError(t.imp_failed);
    }
  }, [t, entries]);

  const confirmImport = useCallback(({ items = [], accountId = null }) => {
    const chosen = items.filter((item) => item.include);

    const imported = expenseStore.importRows(
      chosen.map((item) => ({ ...toTransaction(item), account_id: accountId })));

    // Gelernt wird aus Widerspruch: was der Nutzer selbst gesetzt hat, gilt beim
    // nächsten Auszug als bekannt.
    bankRuleStore.learn(chosen.map((item) => ({
      merchant: item.row.merchant,
      category: item.category,
      overridden: item.overridden,
    })));

    if (accountId) {
      const keys = new Set(chosen.map((item) => item.row.account_key).filter(Boolean));
      for (const key of keys) bankRuleStore.rememberAccount(key, accountId);
    }

    // Ebenso beim Vertrag: gelernt wird nur, was der Nutzer selbst gesetzt hat —
    // sonst hielte die App einen zweideutigen oder falschen Vorschlag für bestätigt.
    for (const item of chosen) {
      if (!item.entryOverridden || !item.entry_id) continue;
      const key = entryLinkKey(item.row);
      if (key) bankRuleStore.rememberEntry(key, item.entry_id);
    }

    if (imported.length) {
      setTransactions(expenseStore.list());
      // Dorthin springen, wo der Auszug endet — sonst steht die App im leeren
      // aktuellen Monat, während die Vorgänge zwei Monate zurück liegen.
      const latest = imported.map((row) => row.date).sort().pop();
      if (latest) setMonth(monthKey(latest));
    }

    closeImport();
    return imported.length;
  }, [closeImport]);

  const createAccount = useCallback((attributes) => {
    const created = accountStore.create(attributes);
    if (created) setAccounts(accountStore.list());
    return created;
  }, []);

  const updateAccount = useCallback((id, attributes) => {
    const updated = accountStore.update(id, attributes);
    if (updated) setAccounts(accountStore.list());
    return updated;
  }, []);

  const archiveAccount = useCallback((id) => {
    accountStore.archive(id);
    setAccounts(accountStore.list());
  }, []);

  const restoreAccount = useCallback((id) => {
    accountStore.restore(id);
    setAccounts(accountStore.list());
  }, []);

  // Eine Grenze beginnt in dem Monat, in dem sie gesetzt wurde — und das ist der
  // Monat, den der Reiter gerade zeigt, nicht zwingend der heutige. Wer im März
  // blättert und dort eine Grenze setzt, meint den März.
  const setBudget = useCallback((category, attributes) => {
    const values = typeof attributes === 'object' && attributes !== null
      ? attributes
      : { amount: attributes };

    budgetStore.set(category, values, month);
    setBudgets(budgetStore.all());
  }, [month]);

  const removeBudget = useCallback((category) => {
    budgetStore.remove(category);
    setBudgets(budgetStore.all());
  }, []);

  const resetCarryover = useCallback((category) => {
    budgetStore.resetCarryover(category, month);
    setBudgets(budgetStore.all());
  }, [month]);

  return {
    transactions,
    accounts,
    activeAccounts: accounts.filter((account) => !account.archived_at),

    month,
    setMonth,
    // Beide Reiter stehen über demselben Monat, also auch über demselben „Heute“
    atCurrentMonth: month === monthKey(new Date()),
    stepMonth: useCallback((delta) => setMonth((current) => shiftMonth(current, delta) || current), []),
    thisMonth: useCallback(() => setMonth(monthKey(new Date())), []),

    modalOpen,
    modalKey,
    editing,
    modalInitial: editing || repeatDraft,
    repeating: Boolean(repeatDraft),
    openAdd,
    openEdit,
    openRepeat,
    closeModal,
    save,

    importOpen,
    importBatch,
    importError,
    openImport,
    closeImport,
    loadImportFile,
    confirmImport,

    accountsOpen,
    openAccounts,
    closeAccounts: useCallback(() => setAccountsOpen(false), []),
    createAccount,
    updateAccount,
    archiveAccount,
    restoreAccount,

    budgets,
    setBudget,
    removeBudget,
    resetCarryover,

    toast,
    remove,
    undoRemove,
  };
};
