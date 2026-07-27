// ─── Suchen und Einschränken ──────────────────────────────────────────────────
// Die Ausgabenseite konnte bisher nur blättern. Wer wissen wollte, wofür im März
// achtzig Euro weggingen, ist Monat für Monat zurückgegangen und hat gelesen.
// Schlagwörter wurden sogar erfasst und vorgeschlagen — nur nie wieder gefunden.
//
// Ohne React, damit es sich prüfen lässt. Beschriftungen kommen als Funktionen
// herein: Kategorie und Konto heißen je nach Sprache anders, und dieses Modul
// soll weder i18n noch den Kontenspeicher kennen.

import { monthKey } from '../../lib/dates.js';
import { isCounted } from '../../lib/expenseStore.js';

export const ALL_MONTHS = 'all';

export const EMPTY_FILTER = {
  query:    '',
  category: '',
  tag:      '',
  entry:    '',        // die ID des Vertrags, nicht sein Name
  scope:    'month',   // 'month' | ALL_MONTHS
};

/** Schränkt gerade irgendetwas ein? Der Bereich allein zählt nicht als Filter. */
export const isFilterActive = (filter = EMPTY_FILTER) =>
  Boolean(filter.query?.trim() || filter.category || filter.tag || filter.entry);

const text = (value) => String(value ?? '').toLowerCase();

/**
 * Alles, worin gesucht wird, als ein Streifen Text.
 *
 * Der Betrag kommt roh mit: „80“ soll den Einkauf über 80,00 finden, denn genau
 * so erinnert man sich an ihn — nicht am Titel, sondern an der Zahl.
 */
export const searchHaystack = (
  transaction, { categoryLabel, accountLabel, entryLabel } = {},
) => [
  transaction?.title,
  transaction?.merchant,
  transaction?.note,
  ...(transaction?.tags || []),
  ...(transaction?.items || []).map((item) => item?.label),
  categoryLabel?.(transaction?.category) || '',
  accountLabel?.(transaction?.account_id) || '',
  // Der Vertrag heißt oft anders als der Händler: „freenet DLS GmbH" steht auf
  // dem Auszug, gesucht wird nach „Internet".
  entryLabel?.(transaction?.entry_id) || '',
  transaction?.amount,
].filter(Boolean).map(text).join(' ');

/**
 * Trifft ein Vorgang die Eingabe?
 *
 * Mehrere Wörter werden einzeln verlangt, nicht als Wortgruppe: „rewe jan“
 * findet den Einkauf bei Rewe im Januar, auch wenn zwischen beidem noch der
 * Betrag steht.
 */
export const matchesQuery = (transaction, query, labels) => {
  const words = text(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const haystack = searchHaystack(transaction, labels);
  return words.every((word) => haystack.includes(word));
};

export const matchesFilter = (transaction, filter = EMPTY_FILTER, labels) => {
  if (filter.category && transaction?.category !== filter.category) return false;
  if (filter.tag && !(transaction?.tags || []).includes(filter.tag)) return false;
  if (filter.entry && transaction?.entry_id !== filter.entry) return false;
  return matchesQuery(transaction, filter.query, labels);
};

/**
 * Die Liste, auf die der Filter zeigt.
 *
 * Der Bereich entscheidet, welcher Vorrat überhaupt betrachtet wird: der
 * angezeigte Monat oder alles. Archiviertes bleibt in beiden Fällen draußen —
 * `inMonth` hielt es bisher schon zurück, und ein Suchergebnis darf nicht
 * plötzlich mehr enthalten als die Liste, aus der es kommt.
 */
export const applyFilter = (transactions = [], filter = EMPTY_FILTER, labels, month) => {
  const scoped = transactions.filter((transaction) => {
    if (!isCounted(transaction)) return false;
    if (filter.scope === ALL_MONTHS) return true;
    return monthKey(transaction.date) === month;
  });

  return scoped.filter((transaction) => matchesFilter(transaction, filter, labels));
};

/**
 * Welche Schlagwörter, Kategorien und Verträge in einem Vorrat vorkommen.
 *
 * Ein Filter, der auf nichts zeigt, ist eine Sackgasse — angeboten wird nur,
 * was auch etwas trifft. Verträge kommen als IDs heraus; wie sie heißen, weiß
 * dieses Modul nicht und soll es nicht wissen.
 */
export const availableFacets = (transactions = []) => {
  const tags = new Map();
  const categories = new Set();
  const entries = new Set();

  for (const transaction of transactions) {
    if (!isCounted(transaction)) continue;
    if (transaction.category) categories.add(transaction.category);
    if (transaction.entry_id) entries.add(transaction.entry_id);
    for (const tag of transaction.tags || []) {
      tags.set(tag, (tags.get(tag) || 0) + 1);
    }
  }

  return {
    tags: [...tags.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag),
    categories: [...categories],
    entries: [...entries],
  };
};
