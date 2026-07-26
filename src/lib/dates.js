// ─── Echte Kalenderdaten ──────────────────────────────────────────────────────
// Ein Vertrag speichert einen Anzeigetext ("14", "8 Mar"), weil er wiederkehrt —
// das steht in lib/billing.js. Eine Ausgabe ist an einem bestimmten Tag passiert
// und speichert ein echtes ISO-Datum. Hier liegt alles, was mit echten Daten
// rechnet oder sie anzeigt.

import { MONTHS_SHORT } from './billing.js';

/** ISO-Datum → "14. Mär" (de) bzw. "14 Mar" (en) */
export const fmtDateFromISO = (isoStr, lang, months) => {
  const d = new Date(isoStr);
  if (isNaN(d)) return '';
  const short = months?.[d.getMonth()] ?? MONTHS_SHORT[d.getMonth()];
  return lang === 'de' ? `${d.getDate()}. ${short}` : `${d.getDate()} ${short}`;
};

/**
 * Wie fmtDateFromISO, zusätzlich mit Jahr → "14. Mär 2026" bzw. "14 Mar 2026".
 * Für Vertragsdaten, die auch Jahre in der Zukunft/Vergangenheit liegen können.
 */
export const fmtDateFromISOWithYear = (isoStr, lang, months) => {
  const base = fmtDateFromISO(isoStr, lang, months);
  return base ? `${base} ${new Date(isoStr).getFullYear()}` : '';
};

const pad2 = (n) => String(n).padStart(2, '0');

/** Ein Datum als lokaler Kalendertag "YYYY-MM-DD" — ohne Zeitzonensprung. */
export const toISODate = (value) => {
  if (value instanceof Date) {
    return isNaN(value)
      ? ''
      : `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  if (typeof value !== 'string') return '';

  // "2026-07-26" und "2026-07-26T09:12:00.000Z" liefern beide den Tagesteil.
  // Ihn abzuschneiden statt zu parsen hält den Tag stabil: new Date(…) legt
  // reine Datumsangaben auf UTC-Mitternacht, was östlich von Greenwich zum
  // Vortag wird.
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return match[0];

  const parsed = new Date(value);
  return isNaN(parsed) ? '' : toISODate(parsed);
};

/** Heute als "YYYY-MM-DD" */
export const todayISO = (now = new Date()) => toISODate(now);

/** "2026-07-26" → "2026-07". Monatsschlüssel sortieren sich als Text richtig. */
export const monthKey = (value) => toISODate(value).slice(0, 7);

/** Monatsschlüssel verschieben: shiftMonth('2026-01', -1) → '2025-12' */
export const shiftMonth = (key, delta) => {
  const [year, month] = String(key).split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return '';
  const shifted = new Date(year, month - 1 + delta, 1);
  return `${shifted.getFullYear()}-${pad2(shifted.getMonth() + 1)}`;
};

/** Anzahl Monate von `from` bis `to`; negativ, wenn `to` davor liegt. */
export const monthsBetween = (from, to) => {
  const [fromYear, fromMonth] = String(from).split('-').map(Number);
  const [toYear,   toMonth]   = String(to).split('-').map(Number);
  if ([fromYear, fromMonth, toYear, toMonth].some((n) => !Number.isFinite(n))) return 0;
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
};
