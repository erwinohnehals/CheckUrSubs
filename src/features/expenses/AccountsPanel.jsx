// ─── Konten verwalten ─────────────────────────────────────────────────────────
// Anlegen, umbenennen, archivieren. Gelöscht wird nicht: alte Vorgänge zeigen
// auf eine Konto-ID, und ein Einkauf, dessen Konto verschwunden ist, wäre für
// immer „ohne Konto“.
//
// Salden gibt es hier keine. Ein Konto beschriftet, wohin das Geld gegangen ist —
// alles darüber hinaus wäre ein Kontobuch und nicht dieser Überblick.

import { useState } from 'react';
import { Archive, Check, Plus, RefreshCw, Pencil, X } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { ACCOUNT_KINDS } from '../../lib/accountStore';
import { INPUT_CLASS, btn, Overlay, SelectInput, Badge } from '../../ui';
import { ACCOUNT_ICONS } from './icons';

const AccountRow = ({ account, renaming, onRename, onStartRename, onCancelRename, onArchive, onRestore }) => {
  const t = useT();
  const Icon = ACCOUNT_ICONS[account.kind] || ACCOUNT_ICONS.bank;
  const archived = Boolean(account.archived_at);
  const [draft, setDraft] = useState(account.label);

  if (renaming) return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-surface">
      <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onRename(draft);
          if (event.key === 'Escape') onCancelRename();
        }}
        className={`${INPUT_CLASS} bg-surface-2 flex-1 py-2`} />
      <button type="button" title={t.modal_save} onClick={() => onRename(draft)}
        className="w-9 h-9 shrink-0 rounded-lg border border-border flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface-3 transition">
        <Check className="w-4 h-4" />
      </button>
      <button type="button" title={t.modal_cancel} onClick={onCancelRename}
        className="w-9 h-9 shrink-0 rounded-lg border border-border flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-3 transition">
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 bg-surface">
      <span className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-ink-2" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm font-medium truncate ${archived ? 'text-ink-3' : ''}`}>{account.label}</p>
          {archived && <Badge>{t.account_archived}</Badge>}
        </div>
        <p className="text-[11px] text-ink-3">{t[`account_kind_${account.kind}`]}</p>
      </div>

      {archived ? (
        <button type="button" title={t.account_restore} onClick={onRestore}
          className="w-9 h-9 shrink-0 rounded-lg border border-border flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-3 transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" title={t.account_rename} onClick={onStartRename}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-3 transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" title={t.account_archive} onClick={onArchive}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-3 transition">
            <Archive className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export const AccountsPanel = ({
  open, accounts = [], onCreate, onRename, onArchive, onRestore, onClose, isDesktop,
}) => {
  const t = useT();
  const [renamingId, setRenamingId] = useState(null);
  const [newLabel,   setNewLabel]   = useState('');
  const [newKind,    setNewKind]    = useState('bank');

  const active   = accounts.filter((account) => !account.archived_at);
  const archived = accounts.filter((account) => Boolean(account.archived_at));

  const create = () => {
    if (!newLabel.trim()) return;
    onCreate({ label: newLabel, kind: newKind });
    setNewLabel('');
    setNewKind('bank');
  };

  const rename = (id, label) => {
    if (label.trim()) onRename(id, { label });
    setRenamingId(null);
  };

  const list = (rows) => (
    <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
      {rows.map((account) => (
        // Der Schlüssel trägt den Bearbeitungszustand: so beginnt das Feld mit
        // dem Namen, der gerade dasteht, und nicht mit einem alten Entwurf
        <AccountRow key={`${account.id}${renamingId === account.id ? '-edit' : ''}`} account={account}
          renaming={renamingId === account.id}
          onStartRename={() => setRenamingId(account.id)}
          onCancelRename={() => setRenamingId(null)}
          onRename={(label) => rename(account.id, label)}
          onArchive={() => onArchive(account.id)}
          onRestore={() => onRestore(account.id)} />
      ))}
    </div>
  );

  return (
    <Overlay open={open} onClose={onClose} sheet={!isDesktop} labelledBy="accounts-title"
      panelClass={isDesktop
        ? 'inset-0 m-auto h-fit w-[520px] max-h-[84vh] flex flex-col overflow-hidden bg-surface-2 rounded-2xl border border-border shadow-2xl'
        : 'inset-x-3 bottom-3 top-20 flex flex-col overflow-hidden bg-surface-2 rounded-2xl border border-border max-w-[450px] mx-auto shadow-2xl'}>

      <header data-stagger className="shrink-0 border-b border-border px-5 pt-5 pb-4 lg:px-7 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="accounts-title" className="text-lg font-semibold tracking-tight">{t.accounts_title}</h2>
          <p className="text-xs text-ink-3 mt-0.5">{t.accounts_hint}</p>
        </div>
        <button type="button" onClick={onClose} title={t.detail_close} aria-label={t.detail_close}
          className="w-9 h-9 -mt-1 -mr-2 shrink-0 rounded-lg flex items-center justify-center
            text-ink-3 hover:text-ink hover:bg-surface-3 transition">
          <X className="w-4 h-4" />
        </button>
      </header>

      <div data-stagger className="flex-1 min-h-0 overflow-y-auto desktop-scroll px-5 py-5 lg:px-7 space-y-6">
        {active.length === 0
          ? <p className="text-sm text-ink-3 text-center py-6">{t.accounts_empty}</p>
          : list(active)}

        {archived.length > 0 && (
          <section className="space-y-3">
            <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em] px-1">{t.archive_title}</p>
            {list(archived)}
          </section>
        )}

        <section className="space-y-3">
          <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em] px-1">{t.account_new}</p>
          <input value={newLabel} placeholder={t.account_name_hint}
            onChange={(event) => setNewLabel(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') create(); }}
            className={INPUT_CLASS} />
          <SelectInput value={newKind} onChange={setNewKind} placeholder={t.account_kind}
            options={ACCOUNT_KINDS.map((kind) => ({ value: kind, label: t[`account_kind_${kind}`] }))} />
          <button type="button" onClick={create} disabled={!newLabel.trim()}
            className={btn('secondary', 'md', 'w-full')}>
            <Plus className="w-4 h-4" />{t.account_add}
          </button>
        </section>
      </div>
    </Overlay>
  );
};
