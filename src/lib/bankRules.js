// ─── Gedächtnis des Imports ───────────────────────────────────────────────────
// Was der Nutzer beim Einlesen entscheidet, soll er nur einmal entscheiden. Zwei
// Zuordnungen werden gemerkt:
//
//   • Händler → Kategorie. „Loesch-Depot" ist beim ersten Mal eine Vermutung und
//     ab der ersten Korrektur eine Tatsache.
//   • Kontokennung → Konto. Die IBAN aus CAMT, die maskierte Kartennummer der
//     Kreditkarte, die Mailadresse bei PayPal — jede Datei sagt, zu welchem Topf
//     sie gehört, aber nur der Nutzer weiß, wie der Topf heißt.
//
// Gelernt wird ausschließlich aus Widerspruch, nie aus dem eigenen Vorschlag.
// Sonst hielte die App ihre erste Vermutung nach einem Durchlauf für bestätigt
// und würde sie nie wieder in Frage stellen.

import { merchantKey } from './autoCategorize.js';

const STORAGE_KEY     = 'goldgeld.bankrules';
const STORAGE_VERSION = 1;

const asString = (value, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const normalizeMap = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  const map = {};
  for (const [key, value] of Object.entries(input)) {
    const cleanKey   = asString(key).trim();
    const cleanValue = asString(value).trim();
    if (cleanKey && cleanValue) map[cleanKey] = cleanValue;
  }
  return map;
};

/** Kontokennungen sind IBANs, Kartennummern und Mailadressen — Groß-/Klein egal. */
export const accountKey = (value) =>
  asString(value).toLowerCase().replace(/\s+/g, '');

export const createBankRuleStore = (storage) => {
  const read = () => {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return { categories: {}, accounts: {} };

      const parsed = JSON.parse(raw);
      return {
        categories: normalizeMap(parsed?.categories),
        accounts:   normalizeMap(parsed?.accounts),
      };
    } catch {
      return { categories: {}, accounts: {} };
    }
  };

  const write = (state) => {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      categories: state.categories,
      accounts:   state.accounts,
    }));
    return state;
  };

  return Object.freeze({
    all: read,

    categories: () => read().categories,
    accounts:   () => read().accounts,

    /** Das Konto, das zu dieser Dateikennung gehört — oder null. */
    accountFor(key) {
      return read().accounts[accountKey(key)] || null;
    },

    rememberAccount(key, accountId) {
      const clean = accountKey(key);
      if (!clean || !accountId) return;

      const state = read();
      write({ ...state, accounts: { ...state.accounts, [clean]: accountId } });
    },

    /**
     * Merkt sich die Kategorien, die der Nutzer selbst gesetzt hat.
     * `decisions` sind [{ merchant, category, overridden }] aus der Prüfansicht.
     */
    learn(decisions = []) {
      const state = read();
      const categories = { ...state.categories };
      let changed = false;

      for (const { merchant, category, overridden } of decisions) {
        if (!overridden || !category) continue;
        const key = merchantKey(merchant);
        if (!key || categories[key] === category) continue;
        categories[key] = category;
        changed = true;
      }

      if (changed) write({ ...state, categories });
      return categories;
    },

    forget(key) {
      const state = read();
      const categories = { ...state.categories };
      delete categories[merchantKey(key)];
      write({ ...state, categories });
    },

    replaceAll(input) {
      return write({
        categories: normalizeMap(input?.categories),
        accounts:   normalizeMap(input?.accounts),
      });
    },
  });
};
