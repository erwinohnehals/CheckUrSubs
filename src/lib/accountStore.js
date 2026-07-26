// ─── Konten ───────────────────────────────────────────────────────────────────
// Ein Konto beschriftet, wohin das Geld gegangen ist: Bargeld, DKB Giro, PayPal.
// Es führt bewusst keinen Saldo — dafür müsste die App jede Bewegung kennen,
// auch die, die sie nie sieht, und wäre ein Kontobuch statt eines Überblicks.

const STORAGE_KEY     = 'goldgeld.accounts';
const STORAGE_VERSION = 1;

export const ACCOUNT_KINDS = ['cash', 'bank', 'card', 'online'];

// Beim ersten Öffnen steht etwas da, statt einer leeren Auswahl. Die Namen
// kommen aus der Übersetzung — deshalb IDs hier, Beschriftungen von außen.
export const SEED_ACCOUNTS = [
  { id: 'cash', kind: 'cash', labelKey: 'account_seed_cash' },
  { id: 'bank', kind: 'bank', labelKey: 'account_seed_bank' },
];

export const newId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const asString = (value, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const normalize = (input, createId = newId) => ({
  id:    asString(input?.id) || createId(),
  label: asString(input?.label).trim(),
  kind:  ACCOUNT_KINDS.includes(input?.kind) ? input.kind : 'bank',
  created_at:  asString(input?.created_at) || new Date().toISOString(),
  archived_at: asString(input?.archived_at) || null,
});

const uniqueById = (rows) =>
  [...new Map(rows.map((row) => [row.id, row])).values()];

export const createAccountStore = (storage, createId = newId) => {
  const write = (rows) => {
    const normalized = uniqueById(rows.map((row) => normalize(row, createId)))
      // Ein Konto ohne Namen ist in der Auswahl nicht zu unterscheiden
      .filter((account) => account.label);

    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      accounts: normalized,
    }));

    return normalized;
  };

  const list = () => {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed) ? parsed : parsed?.accounts;
      if (!Array.isArray(rows)) return [];

      return uniqueById(rows.map((row) => normalize(row, createId)))
        .filter((account) => account.label)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    } catch {
      return [];
    }
  };

  return Object.freeze({
    list,

    /** Nur die, die man noch auswählen können soll. */
    active() {
      return list().filter((account) => !account.archived_at);
    },

    /**
     * Legt beim ersten Mal Bargeld und ein Bankkonto an. `labels` bildet die
     * Seed-IDs auf übersetzte Namen ab; wer schon Konten hat, merkt nichts.
     */
    ensureSeeded(labels = {}) {
      const existing = list();
      if (existing.length) return existing;

      return write(SEED_ACCOUNTS.map(({ id, kind, labelKey }) => ({
        id, kind, label: asString(labels[id]).trim() || labelKey,
      })));
    },

    create(attributes) {
      const created = normalize(attributes, createId);
      if (!created.label) return null;
      write([...list(), created]);
      return created;
    },

    update(id, attributes) {
      let updated = null;
      const rows = list().map((account) => {
        if (account.id !== id) return account;
        updated = normalize({ ...account, ...attributes, id }, createId);
        return updated;
      });

      if (!updated) return null;
      write(rows);
      return updated;
    },

    // Konten werden archiviert, nicht gelöscht: sonst zeigen alte Vorgänge auf
    // eine ID, die es nicht mehr gibt.
    archive(id) {
      return this.update(id, { archived_at: new Date().toISOString() });
    },

    restore(id) {
      return this.update(id, { archived_at: null });
    },

    remove(id) {
      const rows = list();
      const removed = rows.find((account) => account.id === id);
      if (!removed) return null;
      write(rows.filter((account) => account.id !== id));
      return removed;
    },

    replaceAll(rows) {
      return write(Array.isArray(rows) ? rows : []);
    },
  });
};
