// ─── Die Leiste über der Monatsliste ──────────────────────────────────────────
// Ein Feld und zwei Auswahlen. Die Verträge haben dieselbe Leiste (FilterBar in
// App.jsx) — hier stehen andere Achsen, aber dieselbe Mechanik und dasselbe
// Aussehen, damit die Hand nicht umlernt.
//
// Der Bereichsschalter steht rechts und ist der eigentliche Grund für die
// Leiste: die Frage „wofür gingen im März achtzig Euro weg“ endet fast nie im
// gerade angezeigten Monat.

import { useCallback, useState } from 'react';
import { Check, ChevronDown, Layers, Search, Tag, X } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { EXPENSE_CATEGORIES } from '../../lib/expenseCategories';
import { INPUT_CLASS, MenuItem, PopMenu, Segmented, useDismiss } from '../../ui';
import { ALL_MONTHS } from './filter';

// Knopf mit Auswahlliste — dasselbe Rezept wie FilterSelect bei den Verträgen
const FilterSelect = ({ icon: Icon, label, active, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu" aria-expanded={open}
        className={`inline-flex h-10 items-center gap-1.5 max-w-[190px] border rounded-lg px-3 text-xs font-medium transition
          ${active
            ? 'bg-surface-sunken text-ink border-border shadow-sm'
            : 'bg-surface border-border text-ink-2 hover:bg-surface-3 hover:text-ink'}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <PopMenu open={open} role="menu" className="top-11 left-0"
        width="w-[240px] max-w-[calc(100vw-2.5rem)]">
        <div className="max-h-[260px] overflow-y-auto desktop-scroll">
          {options.map((option) => (
            <MenuItem key={option.value || '__any'}
              onClick={() => { onChange(option.value); close(); }}
              className={value === option.value ? 'text-ink' : ''}>
              <span className="flex-1 truncate">{option.label}</span>
              {value === option.value && <Check className="w-4 h-4 shrink-0" />}
            </MenuItem>
          ))}
        </div>
      </PopMenu>
    </div>
  );
};

export const ExpenseFilters = ({ filter, onChange, facets, resultCount, resultSum, active }) => {
  const t = useT();

  const set = (patch) => onChange({ ...filter, ...patch });

  const categoryLabelOf = (id) =>
    EXPENSE_CATEGORIES.find((category) => category.id === id)?.labelKey;

  const categoryOptions = [
    { value: '', label: t.exp_filter_any },
    ...facets.categories
      .map((id) => ({ value: id, label: t[categoryLabelOf(id)] || t.xcat_other }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];

  const tagOptions = [
    { value: '', label: t.exp_filter_any },
    ...facets.tags.map((tag) => ({ value: tag, label: tag })),
  ];

  const categoryLabel = filter.category
    ? (t[categoryLabelOf(filter.category)] || t.xcat_other)
    : t.exp_filter_category;

  return (
    <div className="space-y-2 px-1">
      {/* Das Feld trägt die Leiste — es ist der Griff, nach dem gesucht wird */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
        <input value={filter.query} type="search" data-expense-search
          onChange={(event) => set({ query: event.target.value })}
          placeholder={t.exp_search} aria-label={t.exp_search}
          className={`${INPUT_CLASS} bg-surface-2 pl-10 ${filter.query ? 'pr-10' : ''}`} />
        {filter.query && (
          <button type="button" onClick={() => set({ query: '' })} aria-label={t.filter_reset}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {facets.categories.length > 0 && (
          <FilterSelect icon={Layers} label={categoryLabel} active={Boolean(filter.category)}
            value={filter.category} options={categoryOptions}
            onChange={(value) => set({ category: value })} />
        )}

        {facets.tags.length > 0 && (
          <FilterSelect icon={Tag} label={filter.tag || t.exp_filter_tag} active={Boolean(filter.tag)}
            value={filter.tag} options={tagOptions}
            onChange={(value) => set({ tag: value })} />
        )}

        <Segmented
          items={[
            { id: 'month',      label: t.exp_scope_month },
            { id: ALL_MONTHS,   label: t.exp_scope_all },
          ]}
          value={filter.scope} onChange={(scope) => set({ scope })}
          className="ml-auto"
          trackClass="h-10 bg-surface border border-border rounded-lg"
          itemClass="px-3 text-xs" />

        {active && (
          <button type="button" onClick={() => set({ query: '', category: '', tag: '' })}
            title={t.filter_reset} aria-label={t.filter_reset}
            className="inline-flex h-10 items-center gap-1.5 px-2.5 rounded-lg text-xs text-ink-3
              hover:text-ink hover:bg-surface-3 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Was die Auswahl gerade trifft — dieselbe leise Zeile wie bei den Verträgen */}
      {active && (
        <p className="text-[11px] text-ink-3 pt-0.5">
          {t.exp_count(resultCount)} · {resultSum}
        </p>
      )}
    </div>
  );
};
