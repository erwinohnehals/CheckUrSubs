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
  scope:    'month',   // 'month' | ALL_MONTHS
};

/** Schränkt gerade irgendetwas ein? Der Bereich allein zählt nicht als Filter. */
export const isFilterActive = (filter = EMPTY_FILTER) =>
  Boolean(filter.query?.trim() || filter.category || filter.tag);

const text = (value) => String(value ?? '').toLowerCase();

/**
 * Alles, worin gesucht wird, als ein Streifen Text.
 *
 * Der Betrag kommt roh mit: „80“ soll den Einkauf über 80,00 finden, denn genau
 * so erinnert man sich an ihn — nicht am Titel, sondern an der Zahl.
 */
export const searchHaystack = (transaction, { categoryLabel, accountLabel } = {}) => [
  transaction?.title,
  transaction?.merchant,
  transaction?.note,
  ...(transaction?.tags || []),
  ...(transaction?.items || []).map((item) => item?.label),
  categoryLabel?.(transaction?.category) || '',
  accountLabel?.(transaction?.account_id) || '',
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
 * Welche Schlagwörter und Kategorien in einem Vorrat überhaupt vorkommen.
 *
 * Ein Filter, der auf nichts zeigt, ist eine Sackgasse — angeboten wird nur,
 * was auch etwas trifft.
 */
export const availableFacets = (transactions = []) => {
  const tags = new Map();
  const categories = new Set();

  for (const transaction of transactions) {
    if (!isCounted(transaction)) continue;
    if (transaction.category) categories.add(transaction.category);
    for (const tag of transaction.tags || []) {
      tags.set(tag, (tags.get(tag) || 0) + 1);
    }
  }

  return {
    tags: [...tags.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag),
    categories: [...categories],
  };
};
