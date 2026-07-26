// ─── Vertrag einer Ausgabe zuordnen ──────────────────────────────────────────
// Vertragsnamen sind nicht eindeutig: zwei Wohnungen können beide einen
// „Stromvertrag“ haben, zwei Rufnummern beide „Mobilfunk“. Die Auswahl zeigt
// deshalb die Merkmale, die den richtigen Vertrag identifizieren, statt nur den
// Namen in eine native Select-Zeile zu schreiben.

import { useCallback, useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useLang, useT } from '../../lib/i18n';
import { fmtDateFromISOWithYear } from '../../lib/dates';
import { fmtMoney } from '../../lib/money';
import { INPUT_CLASS, PopMenu, useDismiss, useDropUp } from '../../ui';

const IDENTIFIER_FIELDS = [
  'contract_number',
  'customer_number',
  'policy_number',
  'phone_number',
  'license_plate',
  'zaehlernummer',
  'beitragsnummer',
  'member_number',
];

const identifierOf = (entry) => {
  for (const id of IDENTIFIER_FIELDS) {
    const value = String(entry?.fields?.[id] || '').trim();
    if (value) return value;
  }
  return '';
};

const entryName = (entry) => entry?.name || entry?.provider || '—';

const statusLabel = (entry, t) => {
  if (entry.archived_at) return t.archive_badge;
  return t[`modal_status_${entry.status || 'active'}`] || entry.status || '';
};

const priceLabel = (entry, lang, t) =>
  `${fmtMoney(entry.price || 0, entry.currency_code || 'EUR', lang)} / ${
    entry.period === 'yearly' ? t.sub_per_year : t.sub_per_month
  }`;

const ContractOption = ({ entry, active, onPick, lang, t }) => {
  const provider = entry.provider && entry.provider !== entry.name ? entry.provider : '';
  const context = [provider, entry.location].filter(Boolean);
  const identifier = identifierOf(entry);
  const end = entry.contract_end
    ? fmtDateFromISOWithYear(entry.contract_end, lang, t.months_short)
    : '';
  const facts = [
    identifier ? t.exp_entry_number(identifier) : '',
    end ? t.exp_entry_ends(end) : '',
    statusLabel(entry, t),
  ].filter(Boolean);

  return (
    <button type="button" role="option" aria-selected={active} data-menu-item
      onClick={() => onPick(entry.id)}
      className={`w-full px-3 py-2.5 rounded-lg text-left transition
        ${active ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:bg-surface-3 hover:text-ink'}`}>
      <span className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink truncate">{entryName(entry)}</span>
          {context.length > 0 && (
            <span className="block text-xs text-ink-3 truncate mt-0.5">{context.join(' · ')}</span>
          )}
          {facts.length > 0 && (
            <span className="block text-[11px] text-ink-3 truncate mt-1">{facts.join(' · ')}</span>
          )}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium tabular-nums text-ink">
            {priceLabel(entry, lang, t)}
          </span>
          <Check className={`w-4 h-4 shrink-0 ${active ? '' : 'invisible'}`} />
        </span>
      </span>
    </button>
  );
};

export const ContractPicker = ({
  value, onChange, entries = [], placeholder, compact = false,
}) => {
  const t = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const [up, measure] = useDropUp(360);

  // Neue Ausgaben sollen nicht an archivierte Verträge gehängt werden. Beim
  // Bearbeiten bleibt ein bereits verknüpfter archivierter Vertrag aber sichtbar
  // und wählbar, damit der bestehende Bezug nicht scheinbar verschwindet.
  const choices = useMemo(
    () => entries.filter((entry) => !entry.archived_at || entry.id === value),
    [entries, value]);
  const selected = choices.find((entry) => entry.id === value);
  const selectedContext = selected
    ? [
        selected.provider && selected.provider !== selected.name ? selected.provider : '',
        priceLabel(selected, lang, t),
      ].filter(Boolean).join(' · ')
    : '';

  const pick = (id) => {
    onChange(id);
    close();
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => {
        if (open) return close();
        measure(ref.current);
        setOpen(true);
      }}
        aria-haspopup="listbox" aria-expanded={open}
        className={`${INPUT_CLASS} flex items-center gap-3 text-left hover:bg-surface-3
          ${compact ? 'px-3 py-2 text-xs' : ''}`}>
        <span className="min-w-0 flex-1">
          <span className={`block truncate ${selected ? 'text-ink' : 'text-ink-3'}`}>
            {selected ? entryName(selected) : placeholder}
          </span>
          {!compact && selectedContext && (
            <span className="block text-[11px] text-ink-3 truncate mt-0.5">{selectedContext}</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-ink-3 shrink-0 transition-transform
          ${open ? 'rotate-180' : ''}`} />
      </button>

      <PopMenu open={open} role="listbox" width="" origin={up ? 'bottom left' : 'top left'}
        className={`left-0 right-0 min-w-[280px] ${up ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
        <button type="button" role="option" aria-selected={!value} data-menu-item
          onClick={() => pick('')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 mb-1 border-b border-border
            rounded-lg text-sm text-left transition
            ${!value ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:bg-surface-3 hover:text-ink'}`}>
          <span className="flex-1">{placeholder}</span>
          {!value && <Check className="w-4 h-4 shrink-0" />}
        </button>

        <div className="max-h-[300px] overflow-y-auto desktop-scroll">
          {choices.map((entry) => (
            <ContractOption key={entry.id} entry={entry} active={entry.id === value}
              onPick={pick} lang={lang} t={t} />
          ))}
        </div>
      </PopMenu>
    </div>
  );
};
