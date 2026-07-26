// ─── Ausgabe erfassen / bearbeiten ────────────────────────────────────────────
// Drei Reiter entlang der Fragen, die ein Einkauf beantwortet: Was hat es
// gekostet · Woraus bestand es · Was liegt dazu. Der zweite bleibt meistens leer,
// und das ist in Ordnung — er kostet einen Griff, wenn man ihn braucht.
//
// Der Betrag folgt den Positionen, sobald es welche gibt. Deshalb wird das
// Betragsfeld dann zur Anzeige: zwei Wahrheiten über dieselbe Zahl wären eine
// zu viel, und der Store würde die getippte ohnehin verwerfen.

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Check, ListTree, Paperclip, Wallet, X,
} from 'lucide-react';
import { useLang, useT } from '../../lib/i18n';
import { todayISO } from '../../lib/dates';
import { fmtMoney, getCurrency } from '../../lib/money';
import { newId, parseAmount, sumAmounts } from '../../lib/expenseStore';
import { DURATION } from '../../lib/motion';
import * as documentStore from '../../lib/documentStore';
import {
  INPUT_CLASS, btn, Overlay, ConfirmDialog, Segmented, Switch, SelectInput, DatePicker,
  CurrencySelect, DocumentsPanel, useDirty, useCloseGuard,
} from '../../ui';
import { CategoryPicker } from './CategoryPicker';
import { ItemsEditor } from './ReceiptItems';

const MODAL_TABS = [
  { id: 'amount',  labelKey: 'exp_tab_amount',  icon: Wallet },
  { id: 'items',   labelKey: 'exp_tab_items',   icon: ListTree },
  { id: 'receipt', labelKey: 'exp_tab_receipt', icon: Paperclip },
];

// Bewusst ein div und kein label: ein <label> um einen Knopf herum schickt den
// Klick ein zweites Mal los, und die Auswahl ginge auf und gleich wieder zu.
const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <p className="text-[11px] text-ink-3 px-1 uppercase tracking-[0.1em]">{label}</p>
    {children}
  </div>
);

const GroupTitle = ({ children }) => (
  <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em] px-1">{children}</p>
);

// Aus der gespeicherten Fassung wird Formularzustand: Beträge als Text, damit
// „12," beim Tippen nicht sofort zu 12 wird.
const toFormItems = (transaction) =>
  (transaction?.items || []).map((item) => ({
    id:       item.id || newId(),
    label:    item.label || '',
    amount:   item.amount ? String(item.amount) : '',
    category: item.category || '',
  }));

export const ExpenseModal = ({
  open, initial, isEditing = false, isRepeat = false,
  accounts = [], knownTags = [], currency, onSave, onClose, onDocsChange, isDesktop,
}) => {
  const t    = useT();
  const lang = useLang();

  // Belege hängen an einer ID — ein neuer Vorgang braucht sie vor dem Speichern
  const [transactionId] = useState(() => initial?.id || newId());
  const [tab, setTab] = useState('amount');

  const [direction, setDirection] = useState(initial?.direction || 'expense');
  const [title,     setTitle]     = useState(initial?.title    || '');
  const [merchant,  setMerchant]  = useState(initial?.merchant || '');
  const [date,      setDate]      = useState(initial?.date     || todayISO());
  const [category,  setCategory]  = useState(initial?.category || '');
  const [accountId, setAccountId] = useState(initial?.account_id || '');
  const [note,      setNote]      = useState(initial?.note     || '');
  const [internal,  setInternal]  = useState(Boolean(initial?.internal));
  const [tags,      setTags]      = useState(() => (initial?.tags || []).join(', '));
  const [items,     setItems]     = useState(() => toFormItems(initial));

  const [amount, setAmount] = useState(() =>
    initial && !initial.items?.length && initial.amount ? String(initial.amount) : '');

  const [currencyCode, setCurrencyCode] = useState(initial?.currency_code || currency || 'EUR');
  const symbol = getCurrency(currencyCode).symbol;
  const fmtAmount = (value) => fmtMoney(Number(value) || 0, currencyCode, lang);

  const income   = direction === 'income';
  const hasItems = items.length > 0;
  const itemsSum = useMemo(() => sumAmounts(items.map((item) => parseAmount(item.amount))), [items]);
  const total    = hasItems ? itemsSum : parseAmount(amount);

  // Wie viele Belege hängen dran — die Markierung am Reiter
  const [docCount, setDocCount] = useState(0);
  const refreshDocs = useCallback(() => {
    if (!documentStore.isAvailable()) return;
    documentStore.listFor(transactionId).then((rows) => setDocCount(rows.length)).catch(() => {});
  }, [transactionId]);
  useEffect(() => { refreshDocs(); }, [refreshDocs]);

  const amountRef = useRef(null);
  useEffect(() => {
    if (!open || isEditing || !isDesktop) return;
    const id = setTimeout(() => amountRef.current?.focus(), DURATION.modalIn);
    return () => clearTimeout(id);
  }, [open, isEditing, isDesktop]);

  // Die Kategorien der beiden Richtungen sind getrennte Sätze — eine Ausgabe mit
  // der Kategorie „Gehalt" gäbe es nicht, also fällt die Wahl beim Umschalten weg
  const flipDirection = (toIncome) => {
    setDirection(toIncome ? 'income' : 'expense');
    setCategory('');
    setItems((rows) => rows.map((row) => ({ ...row, category: '' })));
  };

  const canSave = total > 0;

  // Belege liegen schon in der Ablage, sobald sie angehängt wurden — was hier
  // verglichen wird, ist allein das, was ein Verwerfen tatsächlich wegwürfe.
  const dirty = useDirty(JSON.stringify([
    direction, title, merchant, date, category, accountId, note, internal,
    tags, items, amount, currencyCode,
  ]));
  const { asking, requestClose, confirmClose, cancelClose } = useCloseGuard(dirty, onClose);

  const submit = () => {
    if (!canSave) return;

    onSave({
      id:            transactionId,
      direction,
      title:         title.trim(),
      merchant:      merchant.trim(),
      date,
      category,
      account_id:    accountId || null,
      currency_code: currencyCode,
      amount:        total,
      items: items.map((item) => ({
        id:       item.id,
        label:    item.label.trim(),
        amount:   parseAmount(item.amount),
        category: item.category || null,
      })),
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      note,
      internal,
      // Ein bearbeiteter Vorgang behält seinen Verweis auf die ausgeglichene Ausgabe
      refund_for: initial?.refund_for || null,
    });
  };

  // ⌘/Strg + Enter speichert — die Hand bleibt auf der Tastatur
  const submitRef = useRef(submit);
  useEffect(() => { submitRef.current = submit; });
  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        submitRef.current?.();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const tabMark = (id) => {
    if (id === 'items' && hasItems)
      return <span className="text-[10px] leading-none text-ink-3 tabular-nums shrink-0">{items.length}</span>;
    if (id === 'receipt' && docCount > 0)
      return <span className="text-[10px] leading-none text-ink-3 tabular-nums shrink-0">{docCount}</span>;
    if (id === 'receipt' && (note || tags.trim()))
      return <span title={t.tab_filled} className="w-1.5 h-1.5 rounded-full bg-ink-3 shrink-0" />;
    return null;
  };

  const accountOptions = accounts.map((account) => ({ value: account.id, label: account.label }));

  return (
    <Overlay open={open} onClose={requestClose} sheet={!isDesktop} labelledBy="expense-modal-title"
      panelClass={isDesktop
        ? 'inset-0 m-auto h-fit w-[620px] max-h-[88vh] flex flex-col overflow-hidden bg-surface-2 rounded-2xl border border-border shadow-2xl'
        : 'inset-x-3 bottom-3 top-14 flex flex-col overflow-hidden bg-surface-2 rounded-2xl border border-border max-w-[450px] mx-auto shadow-2xl'}>

      {/* ── Kopf ── */}
      <header className="shrink-0 border-b border-border px-5 pt-5 pb-3 lg:px-7 lg:pt-6">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-ink-2" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="expense-modal-title" className="text-lg lg:text-xl font-semibold tracking-tight truncate">
              {isEditing
                ? (title.trim() || t.exp_modal_edit)
                : (isRepeat ? t.exp_modal_repeat : (income ? t.exp_modal_new_income : t.exp_modal_new))}
            </h2>
            <p className="text-xs text-ink-3 truncate mt-0.5">
              {total > 0 ? fmtAmount(total) : (income ? t.exp_income : t.exp_spent)}
            </p>
          </div>
          <button type="button" onClick={requestClose} title={t.detail_close} aria-label={t.detail_close}
            data-focus-skip
            className="w-9 h-9 -mt-1 -mr-2 shrink-0 rounded-lg flex items-center justify-center
              text-ink-3 hover:text-ink hover:bg-surface-3 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <Segmented
          items={MODAL_TABS.map(({ id, labelKey, icon }) => ({ id, label: t[labelKey], icon, mark: tabMark(id) }))}
          value={tab} onChange={setTab}
          className="w-full mt-4"
          layout="grid grid-cols-3"
          trackClass="bg-surface border border-border rounded-lg"
          itemClass="flex items-center justify-center gap-1.5 py-2 text-xs"
          renderItem={(item) => (
            <>
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.mark}
            </>
          )} />
      </header>

      {/* ── Rumpf ── */}
      <div className="flex-1 min-h-0 overflow-y-auto desktop-scroll px-5 py-5 lg:px-7 lg:py-6">

        {/* ── Betrag ── */}
        {tab === 'amount' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <GroupTitle>{t.exp_sec_amount}</GroupTitle>

              {/* Beide Schalter beantworten dieselbe Frage — in welche Summe der
                  Betrag geht — und stehen deshalb beieinander. */}
              <div className="rounded-xl border border-border bg-surface divide-y divide-border">
                <div className="px-3 py-2.5">
                  <Switch checked={income} onChange={flipDirection} label={t.exp_as_income} />
                </div>
                <div className="px-3 py-2.5 space-y-2">
                  <Switch checked={internal} onChange={setInternal} label={t.exp_as_internal} />
                  {internal && (
                    <p className="text-[11px] text-ink-3 leading-relaxed">{t.exp_internal_hint}</p>
                  )}
                </div>
              </div>

              <Field label={t.exp_field_amount}>
                {hasItems ? (
                  <div className={`${INPUT_CLASS} flex items-center justify-between gap-3 cursor-default`}>
                    <span className="text-ink font-semibold tabular-nums">{fmtAmount(itemsSum)}</span>
                    <button type="button" onClick={() => setTab('items')}
                      className="text-[11px] text-ink-3 hover:text-ink transition shrink-0">
                      {t.exp_items_count(items.length)}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-2 text-sm pointer-events-none">{symbol}</span>
                      <input ref={amountRef} value={amount} inputMode="decimal" placeholder="0,00"
                        onChange={(event) => setAmount(event.target.value)}
                        className={`${INPUT_CLASS} pl-9 tabular-nums`} />
                    </div>
                    <CurrencySelect value={currencyCode} onChange={setCurrencyCode} />
                  </div>
                )}
              </Field>
              {hasItems && <p className="text-[11px] text-ink-3 px-1">{t.exp_amount_from_items}</p>}

              <DatePicker value={date} onChange={setDate} label={t.exp_field_date} />

              <Field label={t.exp_field_category}>
                <CategoryPicker value={category} onChange={setCategory} direction={direction} />
              </Field>

              <Field label={t.exp_field_account}>
                <SelectInput value={accountId} onChange={setAccountId}
                  placeholder={t.exp_account_none} options={accountOptions} />
              </Field>
            </section>

            <section className="space-y-3">
              <GroupTitle>{t.exp_sec_what}</GroupTitle>

              <Field label={t.exp_field_title}>
                <input value={title} placeholder={income ? t.exp_title_hint_income : t.exp_title_hint}
                  onChange={(event) => setTitle(event.target.value)} className={INPUT_CLASS} />
              </Field>

              <Field label={income ? t.exp_field_payer : t.exp_field_merchant}>
                <input value={merchant} placeholder={income ? t.exp_payer_hint : t.exp_merchant_hint}
                  onChange={(event) => setMerchant(event.target.value)} className={INPUT_CLASS} />
              </Field>
            </section>
          </div>
        )}

        {/* ── Positionen ── */}
        {tab === 'items' && (
          <ItemsEditor items={items} onChange={setItems} direction={direction}
            symbol={symbol} fmtAmount={fmtAmount} />
        )}

        {/* ── Beleg & Notiz ── */}
        {tab === 'receipt' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <GroupTitle>{t.exp_receipt}</GroupTitle>
              <DocumentsPanel entryId={transactionId} hint={t.exp_receipt_hint}
                onChange={() => { refreshDocs(); onDocsChange?.(); }} />
            </section>

            <section className="space-y-3">
              <GroupTitle>{t.exp_sec_note}</GroupTitle>

              <Field label={t.exp_tags}>
                <input value={tags} list="expense-tags" placeholder={t.exp_tags_hint}
                  onChange={(event) => setTags(event.target.value)} className={INPUT_CLASS} />
                <datalist id="expense-tags">
                  {knownTags.map((tag) => <option key={tag} value={tag} />)}
                </datalist>
              </Field>

              <Field label={t.exp_note}>
                <textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)}
                  className={`${INPUT_CLASS} resize-none`} />
              </Field>
            </section>
          </div>
        )}
      </div>

      {/* ── Fuß ── */}
      <footer className="shrink-0 border-t border-border px-5 py-4 lg:px-7 flex items-center justify-end gap-2">
        <button type="button" onClick={requestClose} className={btn('ghost', 'md', 'px-5 py-3')}>
          {t.modal_cancel}
        </button>
        <button type="button" disabled={!canSave} onClick={submit}
          className={btn('primary', 'md', 'flex-1 py-3 lg:flex-none lg:px-10')}>
          <Check className="w-4 h-4" />{isEditing ? t.modal_save : t.modal_add}
        </button>
      </footer>

      <ConfirmDialog open={asking}
        title={t.discard_title} body={t.discard_hint}
        confirmLabel={t.discard_action} cancelLabel={t.discard_keep}
        onConfirm={confirmClose} onCancel={cancelClose} />
    </Overlay>
  );
};
