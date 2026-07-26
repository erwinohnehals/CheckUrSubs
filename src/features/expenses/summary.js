// ─── Monatsauswertung ─────────────────────────────────────────────────────────
// Was der Monatsreiter anzeigt, gerechnet ohne React: welcher Vorgang in welchen
// Monat fällt, wie die Liste nach Tagen zerfällt und was oben als Summe steht.
//
// Beträge kommen durch `amountOf` herein statt aus `tx.amount`. Ein Einkauf in
// Franken und einer in Euro dürfen nicht stumpf addiert werden — den Umweg über
// die Rechengröße kennt lib/money.js, nicht dieses Modul. Ohne die Funktion wird
// der rohe Betrag genommen, was Tests einwährungsfrei macht.

import { toISODate, monthKey } from '../../lib/dates.js';
import { countsAsMoney, isCounted } from '../../lib/expenseStore.js';

const roundCents = (value) =>
  Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;

const rawAmount = (transaction) => Number(transaction?.amount) || 0;

/**
 * Alles, was in diesem Monat steht — Archiviertes bleibt draußen.
 *
 * Umbuchungen bleiben drin, obwohl sie in keine Summe eingehen: sie gehören in
 * die Liste, denn sie erklären einen Kontostand. Wer summiert, fragt hier nicht
 * noch einmal nach, sondern lässt monthSummary und groupByDay rechnen.
 */
export const inMonth = (transactions = [], month) =>
  transactions.filter((transaction) =>
    isCounted(transaction) && monthKey(transaction.date) === month);

/**
 * Die Liste, wie sie auf dem Schirm steht: Tage von heute nach hinten, innerhalb
 * eines Tages das zuletzt Erfasste oben.
 *
 * Aus- und Einnahmen bleiben je Tag getrennt. Eine Kopfzeile, die „−12 €" zeigt,
 * weil an dem Tag Gehalt kam, wäre kein Tagesumsatz, sondern ein Rätsel.
 */
export const groupByDay = (transactions = [], amountOf = rawAmount) => {
  const days = new Map();

  for (const transaction of transactions) {
    const date = toISODate(transaction?.date);
    if (!date) continue;
    if (!days.has(date)) days.set(date, []);
    days.get(date).push(transaction);
  }

  return [...days.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, rows]) => ({
      date,
      transactions: [...rows].sort((a, b) =>
        String(b.created_at || '').localeCompare(String(a.created_at || ''))),
      expense: roundCents(rows
        .filter((row) => countsAsMoney(row) && row.direction !== 'income')
        .reduce((sum, row) => sum + amountOf(row), 0)),
      income: roundCents(rows
        .filter((row) => countsAsMoney(row) && row.direction === 'income')
        .reduce((sum, row) => sum + amountOf(row), 0)),
    }));
};

/**
 * Kopfzahlen des Monats: hinaus, herein, und was davon übrig bleibt.
 *
 * Umbuchungen bleiben draußen — sonst stünde über einem Monat, in dem Erspartes
 * aufs Girokonto kam, ein Einkommen, das niemand verdient hat.
 */
export const monthSummary = (transactions = [], amountOf = rawAmount) => {
  let expense = 0;
  let income  = 0;

  for (const transaction of transactions) {
    if (!countsAsMoney(transaction)) continue;

    if (transaction.direction === 'income') income += amountOf(transaction);
    else expense += amountOf(transaction);
  }

  return {
    expense: roundCents(expense),
    income:  roundCents(income),
    net:     roundCents(income - expense),
  };
};

/**
 * Bisher verwendete Schlagwörter, häufigste zuerst — die Vorschlagsliste im
 * Formular. Freier Text braucht keinen Verwaltungsschirm, aber eine Erinnerung
 * daran, dass es „Urlaub" schon gibt und nicht noch „urlaub" dazukommen muss.
 */
export const knownTags = (transactions = []) => {
  const counts = new Map();

  for (const transaction of transactions) {
    for (const tag of transaction?.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
};
