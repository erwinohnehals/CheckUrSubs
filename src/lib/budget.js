// ─── Budgets mit Übertrag ─────────────────────────────────────────────────────
// Ein Budget ist eine stehende Obergrenze je Kategorie, kein Monatsplan. Was im
// Februar übrig bleibt, steht im März zusätzlich zur Verfügung; wer im Februar
// darüber liegt, hat im März entsprechend weniger:
//
//   verfügbar(c, m) = grenze(c) + übertrag(c, m)
//   übertrag(c, m)  = verfügbar(c, m-1) − ausgegeben(c, m-1)      // darf negativ sein
//
// Gefaltet wird ab dem Monat, in dem die Grenze gesetzt wurde (`since`), oder ab
// dem letzten manuellen Zurücksetzen (`reset`). Einnahmen bleiben außen vor —
// ein Gehaltseingang macht die Lebensmittel des Monats nicht billiger.

import { monthKey, shiftMonth, monthsBetween } from './dates.js';
import { categoryBreakdown, countsAsMoney } from './expenseStore.js';
import { migrateCategory } from './expenseCategories.js';

const STORAGE_KEY     = 'goldgeld.budgets';
const STORAGE_VERSION = 1;

// Ein Übertrag, der über Jahrzehnte gefaltet würde, ist ein Datenfehler und
// keine Absicht. Die Grenze hält die Faltung endlich.
const MAX_FOLD_MONTHS = 600;

const roundCents = (value) =>
  Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;

// Gerechnet wird in der gemeinsamen Rechengröße, angezeigt in der Anzeige-
// währung — auf Cent gerundet wird deshalb erst beim Anzeigen. Hier wird nur das
// Rauschen der Fließkommazahlen weggeschnitten: zwei Kategorien, je auf Cent
// gerundet und zurückgerechnet, ergäben sonst „214,99 €“ neben der Monatssumme,
// die dieselben zwei Ausgaben als „215 €“ zeigt.
const roundAmount = (value) =>
  Number.isFinite(value) ? Math.round(value * 1e6) / 1e6 : 0;

const asString = (value, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const asMonth = (value) => {
  const key = /^\d{4}-\d{2}$/.test(asString(value)) ? value : monthKey(value);
  return /^\d{4}-\d{2}$/.test(key) ? key : '';
};

export const normalizeBudget = (input, fallbackMonth) => {
  const amount = roundCents(Number(input?.amount));

  return {
    // Eine negative Obergrenze ergibt keinen Sinn und würde jeden Übertrag
    // in die falsche Richtung ziehen
    amount: amount > 0 ? amount : 0,
    currency: asString(input?.currency, 'EUR') || 'EUR',
    since: asMonth(input?.since) || asMonth(fallbackMonth) || monthKey(new Date()),
    reset: asMonth(input?.reset) || null,
  };
};

/** Ab wann gefaltet wird: das Setzen der Grenze oder das letzte Zurücksetzen. */
export const foldStart = (budget) =>
  budget?.reset && budget.reset > budget.since ? budget.reset : budget?.since;

export const createBudgetStore = (storage) => {
  const write = (budgets) => {
    const normalized = {};
    for (const [category, budget] of Object.entries(budgets)) {
      const clean = normalizeBudget(budget);
      // Grenze 0 heißt „kein Budget“ — dann verschwindet der Eintrag
      if (clean.amount > 0) normalized[category] = clean;
    }

    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      budgets: normalized,
    }));

    return normalized;
  };

  const all = () => {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return {};

      const parsed = JSON.parse(raw);
      const rows = parsed?.budgets ?? parsed;
      if (!rows || typeof rows !== 'object' || Array.isArray(rows)) return {};

      const budgets = {};
      for (const [category, budget] of Object.entries(rows)) {
        const clean = normalizeBudget(budget);
        if (clean.amount <= 0) continue;

        // Eine Grenze auf einer abgelösten Kategorie zeigt sonst auf nichts: der
        // Reiter läuft über die heutige Liste und fände sie nie wieder. Eine
        // Grenze, die es unter dem neuen Namen schon gibt, bleibt unangetastet —
        // sie ist die jüngere Entscheidung. Beim nächsten Schreiben ist der alte
        // Schlüssel weg.
        const key = migrateCategory(category);
        if (key !== category && budgets[key]) continue;

        budgets[key] = clean;
      }
      return budgets;
    } catch {
      return {};
    }
  };

  return Object.freeze({
    all,

    get(category) {
      return all()[category] || null;
    },

    /** Setzt oder ändert eine Grenze. `since` bleibt beim Ändern erhalten. */
    set(category, attributes, month) {
      const budgets = all();
      const existing = budgets[category];
      const budget = normalizeBudget(
        { ...existing, ...attributes },
        existing?.since || month,
      );

      if (budget.amount <= 0) {
        delete budgets[category];
        write(budgets);
        return null;
      }

      budgets[category] = budget;
      return write(budgets)[category];
    },

    /** Übertrag von vorne beginnen lassen, ohne die Grenze anzufassen. */
    resetCarryover(category, month) {
      const budget = all()[category];
      if (!budget) return null;
      return this.set(category, { reset: asMonth(month) || monthKey(new Date()) });
    },

    remove(category) {
      const budgets = all();
      if (!budgets[category]) return null;
      delete budgets[category];
      write(budgets);
      return true;
    },

    replaceAll(budgets) {
      return write(budgets && typeof budgets === 'object' ? budgets : {});
    },
  });
};

/**
 * Was in welchem Monat auf welche Kategorie entfällt.
 *
 * Läuft ausschließlich über categoryBreakdown — der Bon setzt die Kategorie,
 * einzelne Positionen dürfen abweichen, und das steht nur an einer Stelle.
 *
 * `amountIn(betrag, vorgang)` bringt den Betrag in die Größe, in der gerechnet
 * wird. Ein Einkauf in Franken und eine Grenze in Euro dürfen nicht stumpf
 * verglichen werden; den Umweg über die Rechengröße kennt lib/money.js. Ohne die
 * Funktion wird der rohe Betrag genommen, was Tests einwährungsfrei macht.
 */
export const spendIndex = (transactions = [], amountIn = (amount) => amount) => {
  const totals = new Map();

  for (const transaction of transactions) {
    if (!countsAsMoney(transaction) || transaction.direction !== 'expense') continue;

    const month = monthKey(transaction.date);
    if (!month) continue;

    for (const { category, amount } of categoryBreakdown(transaction)) {
      const key   = `${month}|${category}`;
      const value = Number(amountIn(amount, transaction)) || 0;
      totals.set(key, (totals.get(key) || 0) + value);
    }
  }

  return {
    at: (category, month) => roundAmount(totals.get(`${month}|${category}`) || 0),
    /** Alle Monate mit Ausgaben, aufsteigend — Grundlage des Jahresberichts. */
    months: () => [...new Set([...totals.keys()].map((key) => key.split('|')[0]))].sort(),
  };
};

/**
 * Die Faltung. `spentAt(category, month)` liefert das Ausgegebene, üblicherweise
 * spendIndex(...).at. Zwischenergebnisse werden gemerkt: der Budget-Reiter fragt
 * denselben Monat für ein Dutzend Kategorien, und jede Antwort zieht die ganze
 * Kette hinter sich her.
 */
export const createCarryover = (budgets = {}, spentAt = () => 0) => {
  const memo = new Map();

  // Verfügbar in `month`, inklusive Übertrag aus allen Monaten davor
  const availableIn = (category, month) => {
    const budget = budgets[category];
    if (!budget) return null;

    const start = foldStart(budget);
    if (!start || month < start) return null;

    const key = `${category}|${month}`;
    if (memo.has(key)) return memo.get(key);

    const distance = monthsBetween(start, month);
    const span = Math.min(distance, MAX_FOLD_MONTHS);
    // Bei absurd altem `since` wird nur das jüngste Fenster gefaltet, damit die
    // Antwort für `month` stimmt, statt irgendwo in der Vergangenheit zu enden
    const from = distance > MAX_FOLD_MONTHS ? shiftMonth(month, -MAX_FOLD_MONTHS) : start;

    let available = budget.amount;

    // Vom Startmonat nach vorne: jeder Rest — auch ein negativer — geht mit
    for (let step = 0; step < span; step += 1) {
      const previous = shiftMonth(from, step);
      available = roundAmount(budget.amount + available - spentAt(category, previous));
      memo.set(`${category}|${shiftMonth(from, step + 1)}`, available);
    }

    memo.set(key, available);
    return available;
  };

  return {
    /**
     * Stand einer Kategorie in einem Monat, oder null, wenn dort keine Grenze
     * gilt. `carry` ist der Übertrag aus dem Vormonat, `ratio` der Anteil des
     * Verfügbaren, den der Monat schon aufgebraucht hat.
     */
    statusFor(category, month) {
      const available = availableIn(category, month);
      if (available === null) return null;

      const budget = budgets[category];
      const spent  = roundAmount(spentAt(category, month));

      return {
        cap:       budget.amount,
        currency:  budget.currency,
        carry:     roundAmount(available - budget.amount),
        available,
        spent,
        remaining: roundAmount(available - spent),
        ratio:     available > 0 ? spent / available : (spent > 0 ? Infinity : 0),
      };
    },
  };
};
