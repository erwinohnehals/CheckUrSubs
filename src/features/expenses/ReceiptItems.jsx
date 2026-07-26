// ─── Positionen eines Bons ────────────────────────────────────────────────────
// Der Einkauf beim Baumarkt ist eine Zeile in der Liste und drei Kategorien in
// der Auswertung. Hier stehen beide Seiten davon: die Aufklappung in der Liste
// und der Block im Formular.
//
// Die wirksame Kategorie einer Position ist `item.category || bon.category` —
// dieselbe Regel wie in lib/expenseStore.js, nur einmal für das Auge.

import { Plus, Trash2 } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { getExpenseCategory } from '../../lib/expenseCategories';
import { parseAmount, sumAmounts, newId } from '../../lib/expenseStore';
import { INPUT_CLASS } from '../../ui';
import { CATEGORY_ICONS } from './icons';
import { CategoryPicker } from './CategoryPicker';

// ─── In der Liste: aufgeklappt unter der Zeile ────────────────────────────────
export const ReceiptItems = ({ transaction, fmtAmount }) => {
  const t = useT();
  const fallback = transaction.category;

  return (
    <ul className="bg-surface border-t border-border divide-y divide-border">
      {transaction.items.map((item) => {
        const categoryId = item.category || fallback;
        const category   = getExpenseCategory(categoryId, transaction.direction);
        const Icon       = CATEGORY_ICONS[categoryId] || CATEGORY_ICONS.other;

        return (
          <li key={item.id} className="flex items-center gap-3 pl-6 pr-4 py-2">
            <Icon className="w-3.5 h-3.5 text-ink-3 shrink-0" />
            <span className="text-xs text-ink-2 truncate flex-1">
              {item.label || (category ? t[category.labelKey] : t.exp_item_untitled)}
            </span>
            {item.category && category && (
              <span className="text-[11px] text-ink-3 truncate hidden sm:inline">{t[category.labelKey]}</span>
            )}
            <span className="text-xs tabular-nums text-ink shrink-0">{fmtAmount(item.amount)}</span>
          </li>
        );
      })}
    </ul>
  );
};

// ─── Im Formular: Zeilen anlegen, beschriften, abweichend einordnen ───────────
export const ItemsEditor = ({ items, onChange, direction, symbol, fmtAmount }) => {
  const t = useT();

  const patch = (id, attributes) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...attributes } : item)));

  const addRow = () =>
    onChange([...items, { id: newId(), label: '', amount: '', category: '' }]);

  const total = sumAmounts(items.map((item) => parseAmount(item.amount)));

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-ink-3 px-1 leading-relaxed">{t.exp_items_hint}</p>

      {items.length === 0
        ? <p className="text-sm text-ink-3 text-center py-6">{t.exp_items_empty}</p>
        : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-border bg-surface p-2.5 space-y-2">
                <div className="flex items-start gap-2">
                  <input value={item.label} placeholder={`${t.exp_item_label} ${index + 1}`}
                    onChange={(event) => patch(item.id, { label: event.target.value })}
                    className={`${INPUT_CLASS} bg-surface-2 flex-1 min-w-0 py-2`} />

                  <div className="relative w-[108px] shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-xs pointer-events-none">
                      {symbol}
                    </span>
                    <input value={item.amount} inputMode="decimal" placeholder="0"
                      onChange={(event) => patch(item.id, { amount: event.target.value })}
                      className={`${INPUT_CLASS} bg-surface-2 pl-8 pr-2 py-2 text-right tabular-nums`} />
                  </div>

                  <button type="button" title={t.exp_item_remove} aria-label={t.exp_item_remove}
                    onClick={() => onChange(items.filter((row) => row.id !== item.id))}
                    className="w-9 h-[38px] shrink-0 rounded-lg border border-border flex items-center justify-center
                      text-ink-3 hover:text-error hover:border-error/40 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <CategoryPicker compact inherit inheritLabel={t.exp_item_category_inherit}
                  direction={direction} value={item.category}
                  onChange={(category) => patch(item.id, { category })} />
              </div>
            ))}
          </div>
        )}

      <button type="button" onClick={addRow}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-border-strong
          text-xs font-medium text-ink-2 hover:text-ink hover:bg-surface-3 transition">
        <Plus className="w-4 h-4" />{t.exp_item_add}
      </button>

      {items.length > 0 && (
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-xs text-ink-3">{t.exp_items_count(items.length)}</span>
          <span className="text-sm font-semibold tabular-nums">{fmtAmount(total)}</span>
        </div>
      )}
    </div>
  );
};
