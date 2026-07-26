// ─── Ausgaben und Einnahmen ───────────────────────────────────────────────────
// Ein Datensatz ist ein Vorgang: ein Einkauf, eine Rechnung, ein Gehaltseingang.
// Wahlweise als ein Betrag oder in Positionen aufgeteilt — der Kassenbon vom
// Baumarkt ist eine Zeile in der Liste, aber drei Kategorien in der Auswertung.
//
// Drei Regeln tragen den ganzen Entwurf:
//
//   1. Gibt es Positionen, ist `amount` ihre Summe — bei jedem Schreiben neu
//      gerechnet, nie aus der Eingabe übernommen.
//   2. Die wirksame Kategorie einer Position ist `item.category || transaction
//      .category`. Das ist die ganze Regel „der Bon setzt sie, Positionen dürfen
//      abweichen“.
//   3. Jede Aufschlüsselung — Kategoriesummen, Budgets, Jahresbericht — läuft
//      über categoryBreakdown(). Ein Fehler dort wäre überall und lautlos.
//
// Anders als Verträge speichern Ausgaben ein echtes ISO-Datum: ein Vertrag wird
// am 14. jedes Monats abgebucht, ein Einkauf ist an einem bestimmten Tag
// passiert. Zwischen beiden Seiten wird kein Datumscode geteilt.

import { toISODate, todayISO } from './dates.js';
import { defaultCategoryFor, resolveCategory } from './expenseCategories.js';

const STORAGE_KEY     = 'goldgeld.expenses';
const STORAGE_VERSION = 1;

export const DIRECTIONS = ['expense', 'income'];

export const newId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const asString = (value, fallback = '') =>
  typeof value === 'string' ? value : fallback;

// Geld rechnet in Cent. Ohne das Runden summieren sich 0.1 + 0.2 zu
// 0.30000000000000004, und die Positionssumme stimmt nicht mit dem Bon überein.
const roundCents = (value) =>
  Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;

/**
 * Ein Betrag aus dem Formular, aus einer CSV oder aus einer Sicherung.
 *
 * Am Telefon tippt man „12,50“, eine englische Datei schreibt „1,234.56“ und
 * eine deutsche „1.234,56“. Endet der Text auf Komma plus ein bis zwei Ziffern,
 * ist das Komma das Dezimaltrennzeichen; sonst trennt es Tausender.
 */
export const parseAmount = (value) => {
  if (typeof value === 'number') return roundCents(value);
  if (typeof value !== 'string') return 0;

  const trimmed = value.trim();
  if (!trimmed) return 0;

  const normalized = /,\d{1,2}$/.test(trimmed)
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed.replace(/,/g, '');

  return roundCents(Number(normalized));
};

export const sumAmounts = (values) =>
  roundCents(values.reduce((sum, value) => sum + value, 0));

const normalizeTags = (input) => {
  if (!Array.isArray(input)) return [];
  const seen = new Set();

  for (const tag of input) {
    const trimmed = asString(tag, String(tag ?? '')).trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
};

// Eine leere Zeile im Positionsblock ist kein Beleg für nichts — sie ist ein
// Versehen und fliegt raus. Alles mit Beschriftung oder Betrag bleibt.
const normalizeItems = (input, direction, createId) => {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => ({
      id:     asString(item?.id) || createId(),
      label:  asString(item?.label).trim(),
      amount: parseAmount(item?.amount),
      // null heißt ausdrücklich „nimm die des Vorgangs“
      category: item?.category ? resolveCategory(asString(item.category), direction) : null,
    }))
    .filter((item) => item.label || item.amount);
};

const normalize = (input, createId = newId) => {
  const direction = DIRECTIONS.includes(input?.direction) ? input.direction : 'expense';
  const items     = normalizeItems(input?.items, direction, createId);
  const createdAt = asString(input?.created_at) || new Date().toISOString();

  return {
    id: asString(input?.id) || createId(),
    direction,
    title:    asString(input?.title).trim(),
    merchant: asString(input?.merchant).trim(),
    // Ohne Datum wäre der Vorgang in keinem Monat sichtbar
    date: toISODate(input?.date) || toISODate(createdAt) || todayISO(),
    category: input?.category
      ? resolveCategory(asString(input.category), direction)
      : defaultCategoryFor(direction),
    account_id:    asString(input?.account_id) || null,
    currency_code: asString(input?.currency_code, 'EUR') || 'EUR',

    // Regel 1 — mit Positionen zählt die Summe, nicht die Eingabe
    amount: items.length ? sumAmounts(items.map((item) => item.amount)) : parseAmount(input?.amount),
    items,

    tags: normalizeTags(input?.tags),
    note: asString(input?.note),

    // Eine Erstattung zeigt auf die Ausgabe, die sie ausgleicht. Auf einer
    // Ausgabe hätte der Verweis keine Bedeutung.
    refund_for: direction === 'income' ? (asString(input?.refund_for) || null) : null,

    created_at:  createdAt,
    archived_at: asString(input?.archived_at) || null,
  };
};

/**
 * Regel 2 und 3: was dieser Vorgang je Kategorie ausmacht.
 *
 * Ohne Positionen ist das eine Zeile. Mit Positionen wird nach der wirksamen
 * Kategorie gruppiert — mehrere Positionen derselben Kategorie ergeben eine
 * Zeile, damit Aufrufer nicht selbst zusammenfassen müssen.
 */
export const categoryBreakdown = (transaction) => {
  if (!transaction) return [];

  const fallback = transaction.category || defaultCategoryFor(transaction.direction);
  const items    = Array.isArray(transaction.items) ? transaction.items : [];

  if (!items.length) {
    return [{ category: fallback, amount: roundCents(Number(transaction.amount) || 0) }];
  }

  const totals = new Map();
  for (const item of items) {
    const category = item?.category || fallback;
    totals.set(category, (totals.get(category) || 0) + (Number(item?.amount) || 0));
  }

  return [...totals].map(([category, amount]) => ({ category, amount: roundCents(amount) }));
};

/** Archiviertes zählt in keiner Summe mit — wie isBilled auf der Vertragsseite. */
export const isCounted = (transaction) =>
  Boolean(transaction) && !transaction.archived_at;

// Dieselbe ID bezeichnet genau einen Vorgang; die letzte Fassung gewinnt
const uniqueById = (rows) =>
  [...new Map(rows.map((row) => [row.id, row])).values()];

// Zwei Einkäufe am selben Tag beim selben Händler über denselben Betrag sind
// beim Import fast immer dieselbe Zeile zweimal.
const duplicateKey = (row) =>
  `${row.direction}|${row.date}|${row.title}|${row.merchant}|${row.amount}`;

const byDate = (a, b) =>
  a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at);

export const createExpenseStore = (storage, createId = newId) => {
  const write = (rows) => {
    const normalized = uniqueById(rows.map((row) => normalize(row, createId))).sort(byDate);

    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      transactions: normalized,
    }));

    return normalized;
  };

  const list = () => {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed) ? parsed : parsed?.transactions;
      if (!Array.isArray(rows)) return [];

      const version    = Array.isArray(parsed) ? 0 : Number(parsed?.version) || 0;
      const normalized = rows.map((row) => normalize(row, createId));
      const repaired   = new Set(normalized.map(({ id }) => id)).size !== normalized.length;

      const transactions = uniqueById(normalized).sort(byDate);

      // Altbestand einmalig im aktuellen Format sichern
      if ((version < STORAGE_VERSION || repaired) && transactions.length) write(transactions);

      return transactions;
    } catch {
      return [];
    }
  };

  return Object.freeze({
    list,

    create(attributes) {
      const created = normalize(attributes, createId);
      write([...list(), created]);
      return created;
    },

    update(id, attributes) {
      let updated = null;
      const rows = list().map((row) => {
        if (row.id !== id) return row;
        updated = normalize({ ...row, ...attributes, id }, createId);
        return updated;
      });

      if (!updated) return null;
      write(rows);
      return updated;
    },

    remove(id) {
      const rows = list();
      const removed = rows.find((row) => row.id === id);
      if (!removed) return null;
      write(rows.filter((row) => row.id !== id));
      return removed;
    },

    restore(transaction) {
      const restored = normalize(transaction, createId);
      write([...list().filter(({ id }) => id !== restored.id), restored]);
      return restored;
    },

    // Wiederherstellung: der Stand der Sicherung gilt, nicht der des Geräts
    replaceAll(rows) {
      return write(Array.isArray(rows) ? rows : []);
    },

    importRows(rows) {
      const existing = list();
      const seen = new Set(existing.map(duplicateKey));
      const imported = [];

      for (const row of rows) {
        const transaction = normalize(row, createId);
        const key = duplicateKey(transaction);
        if (seen.has(key)) continue;
        seen.add(key);
        imported.push(transaction);
      }

      if (imported.length) write([...existing, ...imported]);
      return imported;
    },
  });
};
