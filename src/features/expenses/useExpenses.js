// ─── Zustand der Ausgabenseite ────────────────────────────────────────────────
// Alles, was der Bereich an Zustand braucht, an einer Stelle: die Vorgänge, die
// Konten, der Monat im Blick, das Formular und der Rückgängig-Streifen.
//
// Der Haken wird im Rumpf von App aufgerufen, damit der `+`-Knopf in der
// Seitenleiste das Formular öffnen kann, ohne dass App die Ausgaben kennt.

import { useState, useCallback, useRef, useEffect } from 'react';
import { useT } from '../../lib/i18n';
import { monthKey, shiftMonth } from '../../lib/dates';
import { createExpenseStore } from '../../lib/expenseStore';
import { createAccountStore } from '../../lib/accountStore';
import { createBudgetStore } from '../../lib/budget';
import * as documentStore from '../../lib/documentStore';

const expenseStore = createExpenseStore(window.localStorage);
const accountStore = createAccountStore(window.localStorage);
const budgetStore  = createBudgetStore(window.localStorage);

// So lange bleibt ein gelöschter Vorgang zurückholbar — wie auf der Vertragsseite
const UNDO_MS = 5000;

export const useExpenses = ({ onDocsChange } = {}) => {
  const t = useT();

  const [transactions, setTransactions] = useState(() => expenseStore.list());
  const [accounts,     setAccounts]     = useState(() => accountStore.list());
  const [budgets,      setBudgets]      = useState(() => budgetStore.all());
  const [month,        setMonth]        = useState(() => monthKey(new Date()));

  const [modalOpen,    setModalOpen]    = useState(false);
  const [editing,      setEditing]      = useState(null);
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
    setModalOpen(true);
  }, [ensureAccounts]);

  const openEdit = useCallback((transaction) => {
    ensureAccounts();
    setEditing(transaction);
    setModalOpen(true);
  }, [ensureAccounts]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
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
    editing,
    openAdd,
    openEdit,
    closeModal,
    save,

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
