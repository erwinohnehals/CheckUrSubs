// ─── Jahresauswertung ─────────────────────────────────────────────────────────
// Der Bericht hat zwei Quellen: echte Ausgaben mit ISO-Datum und wiederkehrende
// Verträge mit einem Abbuchungstag. Hier treffen sie sich erstmals — weiterhin
// in einer gemeinsamen Rechengröße, die der Aufrufer bestimmt.

import {
  extractBillingDay,
  extractBillingMonth,
  wasActiveIn,
} from '../../lib/billing.js';
import { isBilled } from '../../lib/entryStore.js';
import { categoryBreakdown, isCounted } from '../../lib/expenseStore.js';

const roundCents = (value) =>
  Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;

const rawTransactionAmount = (amount) => Number(amount) || 0;
const rawRecurringAmount = (entry) => Number(entry?.price) || 0;

/**
 * Tatsächlich fällige laufende Kosten in einem Kalendermonat.
 *
 * Monatliche Verträge zählen jeden aktiven Monat, jährliche nur in ihrem echten
 * Abbuchungsmonat. Ein fehlender Abbuchungstag zählt nicht: ohne Termin gibt es
 * keine belastbare Zuordnung zu einem Monat.
 */
export const recurringInMonth = (
  entries = [],
  year,
  month,
  amountOf = rawRecurringAmount,
) => roundCents(entries.reduce((sum, entry) => {
  if (!isBilled(entry) || !wasActiveIn(entry, year, month)) return sum;
  if (!extractBillingDay(entry.date)) return sum;

  if (entry.period === 'yearly') {
    const billingMonth = extractBillingMonth(entry.date);
    return billingMonth === month ? sum + amountOf(entry) : sum;
  }

  return sum + amountOf(entry);
}, 0));

/**
 * Vollständige Rechengrundlage für den Jahr-Reiter.
 *
 * `months` ist die Quelle der Kopfzahlen. Dadurch kann die Summe oben niemals
 * von den zwölf Balken abweichen, auch nicht durch Cent-Rundung.
 */
export const buildYearReport = ({
  transactions = [],
  entries = [],
  year,
  transactionAmount = rawTransactionAmount,
  recurringAmount = rawRecurringAmount,
} = {}) => {
  const numericYear = Number(year);
  const months = Array.from({ length: 12 }, (_, month) => ({
    month,
    fixed: recurringInMonth(entries, numericYear, month, recurringAmount),
    oneOff: 0,
    income: 0,
  }));

  const categories = new Map();
  const purchases = [];

  for (const transaction of transactions) {
    if (!isCounted(transaction)) continue;

    const match = String(transaction.date || '').match(/^(\d{4})-(\d{2})-/);
    if (!match || Number(match[1]) !== numericYear) continue;

    const month = Number(match[2]) - 1;
    if (month < 0 || month > 11) continue;

    const amount = roundCents(transactionAmount(transaction.amount, transaction));
    if (transaction.direction === 'income') {
      months[month].income = roundCents(months[month].income + amount);
      continue;
    }

    months[month].oneOff = roundCents(months[month].oneOff + amount);
    purchases.push({ transaction, amount });

    for (const row of categoryBreakdown(transaction)) {
      const converted = transactionAmount(row.amount, transaction);
      categories.set(row.category, (categories.get(row.category) || 0) + converted);
    }
  }

  const totals = months.reduce((result, month) => ({
    fixed:  roundCents(result.fixed + month.fixed),
    oneOff: roundCents(result.oneOff + month.oneOff),
    income: roundCents(result.income + month.income),
  }), { fixed: 0, oneOff: 0, income: 0 });

  totals.out = roundCents(totals.fixed + totals.oneOff);
  totals.left = roundCents(totals.income - totals.out);

  return {
    year: numericYear,
    months,
    totals,
    categories: [...categories.entries()]
      .map(([category, amount]) => ({ category, amount: roundCents(amount) }))
      .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category)),
    purchases: purchases.sort((a, b) =>
      b.amount - a.amount
      || String(b.transaction.date).localeCompare(String(a.transaction.date))),
  };
};
