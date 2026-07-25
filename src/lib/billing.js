// ─── Abbuchungstermine ────────────────────────────────────────────────────────
// Ein Abbuchungsdatum liegt als Anzeigetext gespeichert: "14" für monatlich,
// "8 Mar" für jährlich. Hier steht alles, was daraus ein echtes Datum macht.
//
// Der wunde Punkt sind die kurzen Monate: wer am 31. abgebucht wird, hat im
// Februar keinen 31. Wird der Tag dann nicht auf das Monatsende gestaucht,
// rutscht der Termin in den Folgemonat — und der Eintrag verschwindet aus dem
// Kalender, während die Monatssumme ihn weiter mitzählt.

// Kanonische Monatskürzel — so liegen jährliche Abbuchungsdaten gespeichert.
// Angezeigt wird immer die übersetzte Variante aus t.months_short.
export const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Erster Ziffernblock des Textes, sofern er ein gültiger Monatstag ist. */
export const extractBillingDay = (raw) => {
  if (!raw) return null;
  const match = String(raw).match(/\d+/);
  if (!match) return null;
  const day = parseInt(match[0], 10);
  return (Number.isFinite(day) && day >= 1 && day <= 31) ? day : null;
};

/** "8 Mar" → 2 (nullbasiert wie Date.getMonth()); monatliche liefern null. */
export const extractBillingMonth = (raw) => {
  if (!raw) return null;
  const parts = String(raw).trim().split(/\s+/);
  if (parts.length < 2) return null;
  const index = MONTHS_SHORT.indexOf(parts[1]);
  return index >= 0 ? index : null;
};

/** Letzter Tag des Monats. Tag 0 rollt im Date-Konstruktor auf den Vormonat. */
export const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

/** Der 31. wird im Februar zum 28. — nie zum 3. März. */
export const clampDay = (year, month, day) => Math.min(day, daysInMonth(year, month));

/** Das tatsächliche Abbuchungsdatum in einem bestimmten Monat. */
export const billingDateIn = (year, month, day) =>
  new Date(year, month, clampDay(year, month, day));

export const startOfToday = (now = new Date()) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate());

/**
 * Steht die nächste Abbuchung innerhalb der nächsten `days` Tage an?
 * Jährliche zählen nur in ihrem Abbuchungsmonat.
 */
export const isDueWithinDays = (entry, days = 7, now = new Date()) => {
  const billingDay = entry.billingDay ?? extractBillingDay(entry.date);
  if (!billingDay) return false;

  if (entry.period === 'yearly') {
    const billingMonth = extractBillingMonth(entry.date);
    if (billingMonth === null || billingMonth !== now.getMonth()) return false;
  }

  const today = startOfToday(now);
  const thisMonth = billingDateIn(today.getFullYear(), today.getMonth(), billingDay);
  // Der Folgemonat kann kürzer sein — dort wird erneut gestaucht
  const target = thisMonth >= today
    ? thisMonth
    : billingDateIn(today.getFullYear(), today.getMonth() + 1, billingDay);

  const diff = Math.round((target - today) / 86400000);
  return diff >= 0 && diff <= days;
};

/**
 * War der Vertrag in diesem Monat in Kraft?
 *
 * Ohne diese Frage zeigt der Kostenverlauf zwölf Monate Strom für einen Vertrag,
 * der seit gestern erfasst ist, und bucht ausgelaufene Verträge weiter ab.
 * Der Beginn ist der Vertragsbeginn, ersatzweise der Tag der Erfassung. Als Ende
 * zählt das Vertragsende nur ohne automatische Verlängerung — sonst ist es bloß
 * das Ende der laufenden Periode und rollt weiter.
 */
export const wasActiveIn = (entry, year, month) => {
  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month + 1, 0);

  const startsAt = entry.contract_start || entry.created_at;
  if (startsAt) {
    const start = new Date(startsAt);
    if (!isNaN(start) && start > monthEnd) return false;
  }

  if (entry.contract_end && entry.auto_renew === false) {
    const end = new Date(entry.contract_end);
    if (!isNaN(end) && end < monthStart) return false;
  }

  return true;
};
