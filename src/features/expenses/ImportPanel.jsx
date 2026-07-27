// ─── Kontoauszug prüfen ───────────────────────────────────────────────────────
// Die Ansicht zwischen Datei und Büchern. Sie hat eine Aufgabe: aus achthundert
// Zeilen die zwanzig heraussuchen, bei denen der Nutzer wirklich gebraucht wird.
//
// Deshalb steht „Zu prüfen" vorn und nicht „Alle". Wer eine Jahresdatei einliest
// und zuerst achthundert Zeilen sieht, macht das Fenster wieder zu. Was sicher
// zugeordnet ist, ist bereits entschieden; gezeigt wird, was unklar blieb.
//
// Eine Entscheidung wirkt auf den ganzen Händler, nicht auf die eine Zeile: wer
// „LIDL" einmal auf Lebensmittel setzt, meint alle vierzig LIDL-Zeilen der
// Datei. Das ist der Unterschied zwischen einer Prüfung und einer Strafarbeit.

import { useMemo, useState } from 'react';
import {
  AlertCircle, ArrowLeftRight, Check, CheckCheck, ChevronDown, CopyCheck,
  ChevronsDownUp, ChevronsUpDown, FileUp, Landmark, X,
} from 'lucide-react';
import { useLang, useT } from '../../lib/i18n';
import { fmtDateFromISO } from '../../lib/dates';
import { fmtMoney } from '../../lib/money';
import { merchantKey } from '../../lib/autoCategorize';
import { entryLinkKey } from '../../lib/bankRules';
import { groupByMonth, importSummary } from '../../lib/bankImport';
import { btn, Badge, INPUT_CLASS, Overlay, SelectInput } from '../../ui';
import { CategoryPicker } from './CategoryPicker';
import { ContractPicker } from './ContractPicker';

const FILTERS = ['review', 'all', 'excluded'];

const Stat = ({ label, value, tone = '' }) => (
  <div className="min-w-0">
    <p className="text-[11px] text-ink-3 uppercase tracking-[0.14em] truncate">{label}</p>
    <p className={`text-sm font-semibold tabular-nums mt-0.5 ${tone}`}>{value}</p>
  </div>
);

const ItemRow = ({ item, months, lang, last, contractEntries, onToggle, onCategory, onEntryLink }) => {
  const t = useT();
  const { row } = item;
  const income = row.direction === 'income';

  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 bg-surface transition
      ${last ? 'rounded-b-xl' : ''} ${item.include ? '' : 'opacity-55'}`}>

      <button type="button" onClick={onToggle} role="checkbox" aria-checked={item.include}
        aria-label={item.include ? t.imp_exclude : t.imp_include}
        className={`w-5 h-5 mt-0.5 shrink-0 rounded border flex items-center justify-center transition
          ${item.include
            ? 'bg-ink border-ink text-surface'
            : 'border-border text-transparent hover:border-border-strong'}`}>
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-medium truncate flex-1">{item.title || row.merchant || '—'}</p>
          <p className={`text-sm font-semibold tabular-nums shrink-0 ${income ? 'text-success' : ''}`}>
            {income ? '+' : '−'}{fmtMoney(row.amount, row.currency_code, lang)}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-ink-3 tabular-nums">
            {fmtDateFromISO(row.date, lang, months)}
          </span>
          {row.merchant && item.title !== row.merchant && (
            <span className="text-[11px] text-ink-3 truncate max-w-[220px]">{row.merchant}</span>
          )}
          {item.exclusion === 'already_imported' && <Badge>{t.imp_badge_duplicate}</Badge>}
          {item.exclusion === 'internal' && <Badge>{t.imp_badge_internal}</Badge>}
          {item.confidence === 'low' && !item.overridden && item.include && (
            <span className="inline-flex items-center gap-1 text-[11px] text-warning">
              <AlertCircle className="w-3 h-3" />{t.imp_badge_unsure}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <div className="max-w-[280px]">
            <CategoryPicker value={item.category} direction={row.direction} compact
              onChange={(category) => onCategory(category)} />
          </div>
          {!income && contractEntries.length > 0 && (
            <div className="max-w-[220px]">
              <ContractPicker value={item.entry_id || ''} onChange={onEntryLink}
                placeholder={t.exp_entry_none} entries={contractEntries} compact />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MonthSection = ({
  group, open, onOpen, lang, months, fmt, contractEntries, onToggle, onCategory, onEntryLink,
}) => {
  const t = useT();
  const [year, month] = group.month.split('-');
  const label = `${months?.[Number(month) - 1] ?? month} ${year}`;

  // Kein overflow-hidden: das Kategoriemenü einer Zeile darf über den Rand des
  // Monats hinausragen, sonst wird es abgeschnitten. Die Ecken runden deshalb
  // Kopf und letzte Zeile selbst.
  return (
    <section className="rounded-xl border border-border">
      <button type="button" onClick={onOpen} aria-expanded={open}
        className={`w-full flex items-center gap-3 px-3 py-2.5 bg-surface-2 hover:bg-surface-3 transition
          text-left rounded-t-xl ${open ? '' : 'rounded-b-xl'}`}>
        <ChevronDown className={`w-4 h-4 text-ink-3 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
        <span className="text-sm font-medium flex-1">{label}</span>
        <span className="text-[11px] text-ink-3">{t.imp_count_selected(group.included, group.items.length)}</span>
        {/* Ein Monat, in dem nur Geld hereinkam, zeigt „−0 €" — das liest sich wie
            eine Ausgabe von null und nicht wie eine Einnahme. Dann steht sie da. */}
        {group.expense > 0 ? (
          <span className="text-sm font-semibold tabular-nums">−{fmt(group.expense)}</span>
        ) : group.income > 0 ? (
          <span className="text-sm font-semibold tabular-nums text-success">+{fmt(group.income)}</span>
        ) : (
          <span className="text-sm text-ink-3">—</span>
        )}
      </button>

      {open && (
        <div className="divide-y divide-border">
          {group.items.map((item, i) => (
            <ItemRow key={item.key} item={item} lang={lang} months={months}
              last={i === group.items.length - 1} contractEntries={contractEntries}
              onToggle={() => onToggle(item.key)}
              onCategory={(category) => onCategory(item, category)}
              onEntryLink={(entryId) => onEntryLink(item, entryId)} />
          ))}
        </div>
      )}
    </section>
  );
};

export const ImportPanel = ({
  open, onClose, state, accounts = [], entries = [], onPick, onConfirm, isDesktop, fmt, error = '',
}) => {
  const t    = useT();
  const lang = useLang();
  const months = t.months_short;
  const contractEntries = useMemo(
    () => entries.filter((entry) => !entry.archived_at),
    [entries]);

  const [filter, setFilter]   = useState('review');
  const [openMonths, setOpenMonths] = useState(null);
  const [items, setItems]     = useState([]);
  const [accountId, setAcct]  = useState(null);

  // Der Elternteil reicht einen frisch gelesenen Stapel herein. Er ersetzt den
  // bisherigen Zustand vollständig — eine halb geprüfte Datei und eine neue
  // gleichzeitig offen zu haben, wäre eine Quelle stiller Fehler.
  const batchKey = state?.key || '';
  const [seenKey, setSeen] = useState('');
  if (batchKey !== seenKey) {
    setSeen(batchKey);
    setItems(state?.items || []);
    setAcct(state?.accountId || accounts[0]?.id || null);
    setFilter('review');
    setOpenMonths(null);
  }

  const summary = useMemo(() => importSummary(items), [items]);

  const visible = useMemo(() => {
    if (filter === 'excluded') return items.filter((item) => !item.include);
    if (filter === 'all')      return items.filter((item) => item.include);
    return items.filter((item) =>
      item.include && item.confidence === 'low' && !item.overridden);
  }, [items, filter]);

  const groups = useMemo(() => groupByMonth(visible), [visible]);
  // Null preserves the previous default: the first visible month starts open.
  // Once the user acts, the Set is the complete source of truth and can hold
  // any number of open months — including none or all of them.
  const currentOpenMonths = openMonths ?? new Set(groups[0]?.month ? [groups[0].month] : []);
  const allMonthsOpen = groups.length > 0
    && groups.every((group) => currentOpenMonths.has(group.month));

  const toggleMonth = (month) => setOpenMonths((current) => {
    const next = new Set(current ?? (groups[0]?.month ? [groups[0].month] : []));
    if (next.has(month)) next.delete(month);
    else next.add(month);
    return next;
  });

  const toggleAllMonths = () => {
    setOpenMonths(allMonthsOpen
      ? new Set()
      : new Set(groups.map((group) => group.month)));
  };

  const toggle = (key) => setItems((rows) => rows.map((item) =>
    (item.key === key ? { ...item, include: !item.include } : item)));

  // Eine Kategorie gilt dem Händler, nicht der Zeile
  const setCategory = (target, category) => {
    const key = merchantKey(target.row.merchant);

    setItems((rows) => rows.map((item) => {
      const same = key
        ? merchantKey(item.row.merchant) === key
        : item.key === target.key;

      if (!same || item.row.direction !== target.row.direction) return item;
      return { ...item, category, overridden: true };
    }));
  };

  // Derselbe Bezug wie beim Konto: die Zahlungskennung, nicht die einzelne Zeile
  const setEntryLink = (target, entryId) => {
    const key = entryLinkKey(target.row);

    setItems((rows) => rows.map((item) => {
      const same = key
        ? entryLinkKey(item.row) === key
        : item.key === target.key;

      if (!same || item.row.direction !== target.row.direction) return item;
      return { ...item, entry_id: entryId || null, entryOverridden: true };
    }));
  };

  const includeAll = (value) => setItems((rows) => rows.map((item) =>
    (item.exclusion && value ? item : { ...item, include: value })));

  const confirm = () => onConfirm({ items, accountId });

  const formatLabel = state?.format ? t[`imp_format_${state.format.replace(/-/g, '_')}`] : '';

  return (
    <Overlay open={open} onClose={onClose} sheet={!isDesktop} labelledBy="import-title"
      panelClass={isDesktop
        ? 'inset-0 m-auto h-fit w-[760px] max-h-[88vh] flex flex-col overflow-hidden bg-surface-2 rounded-2xl border border-border shadow-2xl'
        : 'inset-x-3 bottom-3 top-12 flex flex-col overflow-hidden bg-surface-2 rounded-2xl border border-border max-w-[560px] mx-auto shadow-2xl'}>

      <header data-stagger className="shrink-0 border-b border-border px-5 pt-5 pb-4 lg:px-7">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="import-title" className="text-lg font-semibold tracking-tight">{t.imp_title}</h2>
            <p className="text-xs text-ink-3 mt-0.5 truncate">
              {state?.name
                ? `${state.name}${formatLabel ? ` · ${formatLabel}` : ''}${state.parts > 1 ? ` · ${t.imp_parts(state.parts)}` : ''}`
                : t.imp_hint}
            </p>
          </div>
          <button type="button" onClick={onClose} title={t.detail_close} aria-label={t.detail_close}
            className="w-9 h-9 -mt-1 -mr-2 shrink-0 rounded-lg flex items-center justify-center
              text-ink-3 hover:text-ink hover:bg-surface-3 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <Stat label={t.imp_stat_selected} value={`${summary.included}/${summary.total}`} />
            <Stat label={t.imp_stat_unsure} value={summary.unsure}
              tone={summary.unsure ? 'text-warning' : ''} />
            <Stat label={t.imp_stat_expense} value={`−${fmt(summary.expense)}`} />
            <Stat label={t.imp_stat_income} value={`+${fmt(summary.income)}`} tone="text-success" />
          </div>
        )}
      </header>

      <div data-stagger className="flex-1 min-h-0 overflow-y-auto desktop-scroll px-5 py-5 lg:px-7 space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-10 space-y-4">
            <FileUp className="w-8 h-8 mx-auto text-ink-3" strokeWidth={1.5} />
            <p className="text-sm text-ink-3 max-w-[380px] mx-auto">{t.imp_empty}</p>
            {error && (
              <p className="text-sm text-error flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </p>
            )}
            <button type="button" onClick={onPick} className={btn('primary', 'md')}>
              <FileUp className="w-4 h-4" />{t.imp_choose_file}
            </button>
            <p className="text-[11px] text-ink-3">{t.imp_formats}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em] px-1">{t.imp_account}</p>
              <SelectInput value={accountId || ''} onChange={setAcct} placeholder={t.imp_account_pick}
                options={accounts.map((account) => ({ value: account.id, label: account.label }))} />
              <p className="text-[11px] text-ink-3 px-1 flex items-center gap-1.5">
                <Landmark className="w-3 h-3 shrink-0" />{t.imp_account_hint}
              </p>
            </div>

            {(summary.duplicates > 0 || summary.internal > 0) && (
              <div className="rounded-xl border border-border bg-surface px-3 py-2.5 space-y-1.5">
                {summary.duplicates > 0 && (
                  <p className="text-[11px] text-ink-3 flex items-center gap-1.5">
                    <CopyCheck className="w-3.5 h-3.5 shrink-0" />{t.imp_note_duplicates(summary.duplicates)}
                  </p>
                )}
                {summary.internal > 0 && (
                  <p className="text-[11px] text-ink-3 flex items-center gap-1.5">
                    <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />{t.imp_note_internal(summary.internal)}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 flex-1">
                {FILTERS.map((id) => (
                  <button key={id} type="button" onClick={() => { setFilter(id); setOpenMonths(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
                      ${filter === id ? 'bg-ink text-surface' : 'text-ink-2 hover:bg-surface-3'}`}>
                    {t[`imp_filter_${id}`]}
                    {id === 'review' && summary.unsure > 0 && ` (${summary.unsure})`}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => includeAll(filter !== 'excluded')}
                className={btn('ghost', 'sm')}>
                <CheckCheck className="w-3.5 h-3.5" />
                {filter === 'excluded' ? t.imp_include_all : t.imp_exclude_all}
              </button>
              {groups.length > 0 && (
                <button type="button" onClick={toggleAllMonths}
                  className={btn('ghost', 'sm')}>
                  {allMonthsOpen
                    ? <ChevronsDownUp className="w-3.5 h-3.5" />
                    : <ChevronsUpDown className="w-3.5 h-3.5" />}
                  {allMonthsOpen ? t.imp_collapse_all : t.imp_expand_all}
                </button>
              )}
            </div>

            {groups.length === 0 ? (
              <div className="text-center py-8">
                <CheckCheck className="w-7 h-7 mx-auto text-success mb-2" strokeWidth={1.5} />
                <p className="text-sm text-ink-3">{t.imp_nothing_to_review}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <MonthSection key={group.month} group={group} lang={lang} months={months} fmt={fmt}
                    contractEntries={contractEntries}
                    open={currentOpenMonths.has(group.month)}
                    onOpen={() => toggleMonth(group.month)}
                    onToggle={toggle} onCategory={setCategory} onEntryLink={setEntryLink} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {items.length > 0 && (
        <footer data-stagger className="shrink-0 border-t border-border px-5 py-4 lg:px-7 flex items-center gap-3">
          <button type="button" onClick={onPick} className={btn('secondary', 'md')}>
            <FileUp className="w-4 h-4" />{t.imp_other_file}
          </button>
          <button type="button" onClick={confirm} disabled={!summary.included}
            className={btn('primary', 'md', 'flex-1')}>
            <Check className="w-4 h-4" />{t.imp_confirm(summary.included)}
          </button>
        </footer>
      )}
    </Overlay>
  );
};
