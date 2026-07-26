// ─── Vom Auszug zur Ausgabe ───────────────────────────────────────────────────
// Zwischen „Datei gelesen" und „steht in den Büchern" liegt eine Prüfung, und
// die ist Absicht. Ein Kontoauszug ist nicht die Wahrheit über das eigene Leben,
// sondern eine Liste von Abbuchungen: die Hälfte davon ist eine Ausgabe, ein
// Teil ist Geld zwischen eigenen Töpfen, und was welche Kategorie hat, weiß nur
// der Mensch davor. Deshalb wird nichts stillschweigend übernommen.
//
// Was hier entsteht, ist ein Vorschlag je Zeile: eingeschlossen oder nicht,
// Kategorie, Konto. Die Ansicht zeigt ihn, der Nutzer ändert ihn, und erst dann
// wird geschrieben.

import { suggestCategory } from './autoCategorize.js';
import { accountKey } from './bankRules.js';
import { suggestEntryLink } from './contractLink.js';
import { monthKey } from './dates.js';

/** Nullbeträge sind Mitteilungen der Bank („Abrechnung siehe Anlage"), kein Geld. */
const carriesMoney = (row) => Math.abs(Number(row?.amount) || 0) > 0;

/**
 * Warum eine Zeile nicht vorausgewählt ist. Ausgeschlossen heißt nie
 * „verschwunden": jede Zeile bleibt sichtbar und lässt sich von Hand
 * einschließen — die Automatik darf irren, aber nicht heimlich.
 */
export const EXCLUSION_REASONS = ['already_imported', 'internal', 'zero'];

// Kunden-, Rechnungs- und Mandatsnummern. Sie stehen im Verwendungszweck, weil
// die Bank sie transportieren muss — gelesen werden sie von einem System, nicht
// von einem Menschen.
const MACHINE_TEXT = /\d{6,}|\bKd\.|\bRG-?Nr|\bRechnung(s)?nr|\bKunden(nr|nummer)|\bMandat/i;

const titleFor = (row) => {
  const title = String(row?.title ?? '').trim();
  const merchant = String(row?.merchant ?? '').trim();
  if (!merchant) return title;
  if (!title) return merchant;

  // „Kd.1208906497 Wir sagen Danke. RG-Nr.M26047179100 26,96 EUR" ist kein
  // Titel, sondern eine Belegzeile. „freenet DLS GmbH" sagt mehr in weniger.
  if (title.length > 40 || MACHINE_TEXT.test(title)) return merchant;
  return title;
};

/**
 * Bankzeilen → prüfbare Posten.
 *
 * `existingRefs` sind die Referenzen, die schon in den Büchern stehen. Sie sind
 * der Grund, warum man dieselbe Datei zweimal einlesen darf, ohne Schaden
 * anzurichten — der zweite Durchlauf fügt genau die Zeilen hinzu, die beim
 * ersten noch nicht in der Datei standen.
 */
export const prepareImport = ({
  rows = [],
  learned = {},
  accountMap = {},
  existingRefs = new Set(),
  defaultAccountId = null,
  entries = [],
  learnedEntries = {},
} = {}) => rows.map((row) => {
  const suggestion   = suggestCategory(row, learned);
  const entrySuggestion = suggestEntryLink(row, entries, learnedEntries);
  const known        = existingRefs.has(row.ref);

  const exclusion = known ? 'already_imported'
    : row.internal ? 'internal'
    : !carriesMoney(row) ? 'zero'
    : null;

  return {
    row,
    key: row.ref,
    include: !exclusion,
    exclusion,
    category: suggestion.category,
    confidence: suggestion.confidence,
    reason: suggestion.reason,
    // Der Nutzer hat noch nichts geändert — was hier steht, ist der Vorschlag
    overridden: false,
    entry_id: entrySuggestion?.entryId || null,
    entryConfidence: entrySuggestion?.confidence || null,
    entryOverridden: false,
    title: titleFor(row),
    account_id: accountMap[accountKey(row.account_key)] || defaultAccountId || null,
  };
});

/**
 * Ein geprüfter Posten → der Datensatz, den der Ausgabenspeicher erwartet.
 *
 * Erkannte Umbuchungen sind vorab abgewählt und kommen normalerweise nicht in
 * die Bücher. Wer eine trotzdem einschließt — die Überweisung vom Sparkonto will
 * man sehen, die PayPal-Deckung nicht —, bekommt sie mit gesetzter Flagge:
 * sichtbar in der Liste, in keiner Summe. Sie stumm zur Ausgabe zu machen wäre
 * das Gegenteil dessen, was der Import gerade erkannt hat.
 */
export const toTransaction = (item) => {
  const { row } = item;

  return {
    direction: row.direction,
    internal: Boolean(row.internal),
    date: row.date,
    title: item.title,
    merchant: row.merchant,
    amount: row.amount,
    currency_code: row.currency_code,
    category: item.category,
    account_id: item.account_id || null,
    entry_id: item.entry_id || null,
    note: [row.purpose && row.purpose !== item.title ? row.purpose : '', row.note]
      .filter(Boolean).join('\n'),
    source: {
      ref: row.ref,
      format: row.format,
      account_key: row.account_key,
      counterparty: row.merchant,
      creditor_id: row.creditor_id,
      mandate_ref: row.mandate_ref,
      booking_text: row.booking_text || row.family,
    },
  };
};

/**
 * Die Posten, nach Monat gebündelt — neueste zuerst, innerhalb des Monats nach
 * Datum absteigend. Ein Jahr Kontoauszug sind achthundert Zeilen; ungegliedert
 * ist das keine Prüfung, sondern eine Zumutung.
 */
export const groupByMonth = (items = []) => {
  const months = new Map();

  for (const item of items) {
    const key = monthKey(item.row.date);
    if (!key) continue;
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(item);
  }

  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, entries]) => ({
      month,
      items: entries.sort((a, b) => b.row.date.localeCompare(a.row.date)),
      included: entries.filter((item) => item.include).length,
      expense: entries
        .filter((item) => item.include && item.row.direction === 'expense')
        .reduce((sum, item) => sum + item.row.amount, 0),
      income: entries
        .filter((item) => item.include && item.row.direction === 'income')
        .reduce((sum, item) => sum + item.row.amount, 0),
    }));
};

/** Die Kopfzahlen über der Prüfansicht. */
export const importSummary = (items = []) => {
  const included = items.filter((item) => item.include);

  return {
    total: items.length,
    included: included.length,
    duplicates: items.filter((item) => item.exclusion === 'already_imported').length,
    internal: items.filter((item) => item.exclusion === 'internal').length,
    unsure: included.filter((item) => item.confidence === 'low' && !item.overridden).length,
    expense: included.filter((item) => item.row.direction === 'expense')
      .reduce((sum, item) => sum + item.row.amount, 0),
    income: included.filter((item) => item.row.direction === 'income')
      .reduce((sum, item) => sum + item.row.amount, 0),
  };
};

/** Die Referenzen, die schon in den Büchern stehen. */
export const existingRefsOf = (transactions = []) =>
  new Set(transactions.map((transaction) => transaction?.source?.ref).filter(Boolean));
