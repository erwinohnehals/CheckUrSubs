// ─── Kategorieauswahl der Ausgaben ────────────────────────────────────────────
// Zwanzig Kategorien passen in ein zweispaltiges Gitter, ohne dass gesucht
// werden muss — die Vertragsseite braucht ihre Suche erst bei neunzehn Einträgen
// mit langen Namen. Wächst die Liste weiter, ist die Suche hier fällig.
//
// Eine Position darf die Kategorie des Bons erben. Das ist keine leere Auswahl,
// sondern eine eigene, benannte Möglichkeit — deshalb steht sie oben in der
// Liste und nicht als Platzhalter im geschlossenen Feld.

import { useState, useCallback } from 'react';
import { Check, ChevronDown, CornerDownRight } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { categoriesFor, getExpenseCategory } from '../../lib/expenseCategories';
import { INPUT_CLASS, PopMenu, useDismiss, useDropUp } from '../../ui';
import { CATEGORY_ICONS } from './icons';

export const CategoryPicker = ({
  value, onChange, direction = 'expense',
  inherit = false, inheritLabel = '', compact = false,
}) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const [up, measure] = useDropUp();

  const category = getExpenseCategory(value, direction);
  const Icon     = category ? (CATEGORY_ICONS[category.id] || CATEGORY_ICONS.other) : CornerDownRight;
  const label    = category ? t[category.labelKey] : (inherit ? inheritLabel : t.exp_cat_choose);

  const pick = (id) => { onChange(id); close(); };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => {
        if (open) return close();
        measure(ref.current);
        setOpen(true);
      }}
        aria-haspopup="dialog" aria-expanded={open}
        className={`${INPUT_CLASS} flex items-center gap-2.5 text-left hover:bg-surface-3
          ${compact ? 'px-3 py-2 text-xs' : ''}`}>
        <Icon className={`w-4 h-4 shrink-0 ${category ? 'text-ink-2' : 'text-ink-3'}`} />
        <span className={`flex-1 truncate ${category ? 'text-ink' : 'text-ink-3'}`}>{label}</span>
        <ChevronDown className={`w-4 h-4 text-ink-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <PopMenu open={open} width="" origin={up ? 'bottom left' : 'top left'}
        className={`left-0 right-0 min-w-[220px] ${up ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
        {inherit && (
          <button type="button" data-menu-item onClick={() => pick('')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 mb-1 pb-2.5 border-b border-border
              rounded-lg text-sm text-left transition
              ${!category ? 'text-ink' : 'text-ink-2 hover:bg-surface-3 hover:text-ink'}`}>
            <CornerDownRight className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">{inheritLabel}</span>
            {!category && <Check className="w-4 h-4 shrink-0" />}
          </button>
        )}

        <div className="max-h-[260px] overflow-y-auto desktop-scroll">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
            {categoriesFor(direction).map((item) => {
              const ItemIcon = CATEGORY_ICONS[item.id] || CATEGORY_ICONS.other;
              const active   = item.id === value;
              return (
                <button key={item.id} type="button" data-menu-item onClick={() => pick(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition
                    ${active ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:bg-surface-3 hover:text-ink'}`}>
                  <ItemIcon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{t[item.labelKey]}</span>
                  {active && <Check className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </PopMenu>
    </div>
  );
};
