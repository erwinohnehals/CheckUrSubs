// ─── Eine Zeile der Monatsliste ───────────────────────────────────────────────
// Am Telefon wird gewischt: nach links löschen, nach rechts bearbeiten, Tippen
// öffnet das Formular. Am Desktop wird geklickt, die Aktionen kommen bei
// Berührung. Dasselbe Muster wie bei den Verträgen, damit die Hand es kennt.
//
// Einnahmen tragen ein Vorzeichen und einen Pfeil, keine Farbe: Farbe bleibt dem
// Status vorbehalten, und „Geld kam herein" ist kein Status.

import { ArrowDownLeft, ChevronRight, CopyPlus, Link2, Paperclip, Pencil, Trash2 } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { getExpenseCategory } from '../../lib/expenseCategories';
import { Badge, useSwipeRow } from '../../ui';
import { CATEGORY_ICONS } from './icons';
import { ReceiptItems } from './ReceiptItems';

const ItemChip = ({ count, open, onToggle, label }) => (
  <button type="button" onClick={(event) => { event.stopPropagation(); onToggle(); }}
    aria-expanded={open} title={label}
    className="inline-flex items-center gap-0.5 h-6 pl-1.5 pr-1 shrink-0 rounded-md border border-border
      bg-surface-3 text-[11px] font-medium text-ink-2 hover:text-ink hover:border-border-strong transition">
    {count}
    <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
  </button>
);

export const ExpenseRow = ({
  transaction, fmtAmount, accountLabel, entryLabel = '', docCount = 0,
  expanded = false, onToggle, onEdit, onRepeat, onDelete, isDesktop,
}) => {
  const t = useT();

  const category = getExpenseCategory(transaction.category, transaction.direction);
  const Icon     = CATEGORY_ICONS[transaction.category] || CATEGORY_ICONS.other;
  const income   = transaction.direction === 'income';
  const items    = transaction.items.length;

  // Das Symbol bleibt das der Kategorie: der Doppelpfeil gehört schon den
  // durchlaufenden Posten, und zwei Bedeutungen auf einem Zeichen wären eine zu
  // viel. Dass diese Zeile nicht mitzählt, sagt das Abzeichen.
  const internal = Boolean(transaction.internal);

  const title = transaction.title
    || transaction.merchant
    || (category ? t[category.labelKey] : t.exp_item_untitled);

  const meta = [
    transaction.merchant && transaction.merchant !== title ? transaction.merchant : null,
    category ? t[category.labelKey] : null,
    accountLabel || null,
    transaction.tags.length ? transaction.tags.join(' · ') : null,
  ].filter(Boolean).join(' · ');

  const amount = (
    <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums whitespace-nowrap">
      {income && <ArrowDownLeft className="w-3.5 h-3.5 text-ink-3" />}
      {income ? '+' : ''}{fmtAmount(transaction.amount)}
    </span>
  );

  const badges = (
    <>
      {internal && <Badge title={t.exp_internal_hint}>{t.exp_badge_internal}</Badge>}
      {/* Der Vertrag steht als eigenes Zeichen da, nicht in der Zeile darunter:
          „freenet DLS GmbH" ist ein Händler, „Internet" ist der Vertrag — in
          einer Reihe mit Händler und Kategorie wäre nicht zu sehen, welches
          von beidem gemeint ist. */}
      {entryLabel && (
        <Badge icon={Link2} title={t.exp_entry_linked(entryLabel)}>
          <span className="max-w-[110px] truncate">{entryLabel}</span>
        </Badge>
      )}
      {items > 0 && (
        <ItemChip count={items} open={expanded} onToggle={onToggle} label={t.exp_items_count(items)} />
      )}
      {docCount > 0 && <Badge icon={Paperclip} title={t.docs_count(docCount)}>{docCount}</Badge>}
    </>
  );

  const details = expanded && items > 0
    ? <ReceiptItems transaction={transaction} fmtAmount={fmtAmount} />
    : null;

  // Blass, nicht versteckt: die Zeile gehört in den Tag, an dem sie passiert ist,
  // aber sie trägt nicht zu den Zahlen darüber bei.
  const muted = internal ? 'opacity-60' : '';

  // ── Desktop ──
  if (isDesktop) return (
    <div data-row>
      <div onClick={onEdit} title={t.exp_modal_edit}
        className={`group flex items-center gap-4 px-5 py-3 bg-surface-2 hover:bg-surface-3 transition cursor-pointer ${muted}`}>
        <span className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-ink-2" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">{title}</p>
            {badges}
          </div>
          {meta && <p className="text-xs text-ink-3 truncate mt-0.5">{meta}</p>}
        </div>
        <div className="shrink-0 text-right">{amount}</div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
          <button type="button" title={t.exp_repeat}
            onClick={(event) => { event.stopPropagation(); onRepeat(); }}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition">
            <CopyPlus className="w-4 h-4" />
          </button>
          <button type="button" title={t.exp_modal_edit}
            onClick={(event) => { event.stopPropagation(); onEdit(); }}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" title={t.exp_delete}
            onClick={(event) => { event.stopPropagation(); onDelete(); }}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-ink-3 hover:text-error hover:border-error/40 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {details}
    </div>
  );

  return <MobileExpenseRow
    title={title} meta={meta} amount={amount} badges={badges} muted={muted}
    Icon={Icon} details={details} onEdit={onEdit} onRepeat={onRepeat} onDelete={onDelete} />;
};

// Eigene Komponente, weil useSwipeRow ein Haken ist und am Desktop nicht laufen soll
const MobileExpenseRow = ({
  title, meta, amount, badges, muted = '', Icon, details, onEdit, onRepeat, onDelete,
}) => {
  const t = useT();
  const { ref, handlers } = useSwipeRow({ onLeft: onDelete, onRight: onEdit, onTap: onEdit });

  return (
    <div data-row>
      <div className="relative overflow-hidden">
        {/* Was unter der Zeile liegt */}
        <div className="absolute inset-0 flex text-white">
          <div className="flex-1 bg-success flex items-center pl-6 text-xs font-medium gap-2">
            <Pencil className="w-4 h-4" /> {t.exp_modal_edit}
          </div>
          <div className="flex-1 bg-error flex items-center justify-end pr-6 text-xs font-medium gap-2">
            {t.exp_delete} <Trash2 className="w-4 h-4" />
          </div>
        </div>

        <div ref={ref} data-no-tab-swipe {...handlers}
          className={`relative flex items-center px-4 py-3 gap-3 bg-surface-2 touch-pan-y cursor-pointer ${muted}`}>
          <span className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-ink-2" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate">{title}</p>
              {badges}
            </div>
            {meta && <p className="text-xs text-ink-3 truncate mt-0.5">{meta}</p>}
          </div>
          <button type="button" title={t.exp_repeat} aria-label={t.exp_repeat}
            onClick={(event) => { event.stopPropagation(); onRepeat(); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-ink-3
              hover:text-ink hover:bg-surface-3 transition">
            <CopyPlus className="w-4 h-4" />
          </button>
          <div className="shrink-0">{amount}</div>
        </div>
      </div>
      {details}
    </div>
  );
};
