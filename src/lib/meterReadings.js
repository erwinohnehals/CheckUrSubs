// ─── Zählerstände ─────────────────────────────────────────────────────────────
// Ein Zähler wird nicht einmal abgelesen, sondern immer wieder: beim Einzug, zur
// Jahresabrechnung, vor dem Anbieterwechsel. Gespeichert wird darum eine Reihe
// von Ständen mit Datum. Der Verbrauch selbst steht nirgends im Speicher — er
// ist die Differenz zweier Stände und wird hier gerechnet.
//
// Ein Zählwerk läuft aufwärts. Fällt der Stand zurück, wurde der Zähler
// getauscht; über die Strecke dazwischen sagt die Reihe dann nichts aus. Diese
// Lücke bleibt offen, statt einen negativen Verbrauch zu behaupten.

import { toISODate } from './dates.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Zählerstände sind keine Geldbeträge: Gas wird auf drei Nachkommastellen
// abgelesen, Strom auf eine. Mehr als drei speichert kein deutscher Zähler.
const round3 = (value) => Math.round(value * 1000) / 1000;

// Die Sprachkennung steht hier noch einmal, statt sie aus money.js zu holen —
// money.js hängt am entryStore, der wiederum an dieser Datei.
const LOCALES = { de: 'de-DE', en: 'en-US' };

// ─── Welche Verträge einen Zähler haben ───────────────────────────────────────
export const hasMeter = (category) => category === 'energy' || category === 'water';

/**
 * Die Einheit des Zählwerks — nicht die der Abrechnung. Der Gaszähler misst
 * Kubikmeter, abgerechnet werden daraus Kilowattstunden; abgelesen wird, was
 * am Zähler steht.
 */
export const meterUnit = (category, fields = {}) => {
  if (category === 'water') return 'm³';
  if (category !== 'energy') return '';
  return fields?.energy_type === 'gas' ? 'm³' : 'kWh';
};

/**
 * Ein abgelesener Stand aus dem Formular, einer alten Fassung oder einer
 * Sicherung. Am Telefon tippt man „12.345,6“, eine englische Datei schreibt
 * „12,345.6“ — endet der Text auf Trennzeichen plus ein bis drei Ziffern, ist
 * es das Dezimaltrennzeichen. Was keine Zahl ist, ergibt null statt 0: ein
 * Zählerstand von 0 ist eine Aussage, ein leeres Feld nicht.
 */
export const parseReadingValue = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? round3(value) : null;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = /,\d{1,3}$/.test(trimmed)
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed.replace(/,/g, '');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? round3(parsed) : null;
};

/** Chronologisch, ältester Stand zuerst — die Rechenrichtung der Reihe. */
export const sortReadings = (readings) =>
  [...(Array.isArray(readings) ? readings : [])]
    .sort((a, b) => a.date.localeCompare(b.date) || a.value - b.value);

/**
 * Was sich rechnen lässt: Stände mit Datum und Zahl, chronologisch. Das
 * Formular reicht Rohes herein („12.480,5“, ein halb ausgefülltes Feld), der
 * Speicher fertige Zahlen — beides kommt hier auf dieselbe Form. Was kein
 * Datum oder keinen Wert hat, ist kein Stand und fällt weg; sonst rechnete die
 * Reihe gegen ein Loch.
 */
const usable = (readings) => sortReadings(
  (Array.isArray(readings) ? readings : []).reduce((list, reading) => {
    const date  = toISODate(reading?.date);
    const value = parseReadingValue(reading?.value);
    if (!date || value === null || value < 0) return list;
    return [...list, { ...reading, date, value }];
  }, []),
);

/** Die gespeicherte Form: [{ id, date, value, note }], jeder Stand mit eigener ID. */
export const normalizeReadings = (input, createId) =>
  usable(input).map((reading) => ({
    id:    (typeof reading.id === 'string' && reading.id) ? reading.id : createId?.() || '',
    date:  reading.date,
    value: reading.value,
    note:  typeof reading.note === 'string' ? reading.note.trim() : '',
  }));

/** Ganze Tage zwischen zwei Kalendertagen. */
const daysBetween = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);

const perYearFrom = (perDay) => (perDay === null ? null : Math.round(perDay * 365));

/**
 * Die Reihe zum Anzeigen: neuester Stand zuerst, jeder mit dem Verbrauch seit
 * dem vorigen. `used`, `days`, `perDay` und `perYear` sind null, wo sich nichts
 * sagen lässt — beim ersten Stand, bei zwei Ständen am selben Tag und nach
 * einem Zählerwechsel.
 */
export const meterSeries = (readings = []) => {
  const sorted = usable(readings);

  return sorted.map((reading, index) => {
    const previous = index > 0 ? sorted[index - 1] : null;
    const changed  = Boolean(previous && reading.value < previous.value);

    const days   = previous && !changed ? daysBetween(previous.date, reading.date) : null;
    const used   = previous && !changed ? round3(reading.value - previous.value) : null;
    const perDay = used !== null && days > 0 ? round3(used / days) : null;

    return {
      ...reading,
      days,
      used,
      perDay,
      perYear: perYearFrom(perDay),
      meterChanged: changed,
    };
  }).reverse();
};

/**
 * Der Blick über die ganze Reihe: Summe der Verbräuche und daraus die
 * Hochrechnung aufs Jahr. Strecken über einen Zählerwechsel hinweg zählen
 * nicht mit — gemessen wird nur, was gemessen wurde.
 */
export const meterSummary = (readings = []) => {
  const sorted = usable(readings);
  if (sorted.length < 2) return null;

  let used = 0;
  let days = 0;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current  = sorted[index];
    if (current.value < previous.value) continue;

    const span = daysBetween(previous.date, current.date);
    if (span <= 0) continue;

    used += current.value - previous.value;
    days += span;
  }

  if (days <= 0) return null;

  const perDay = round3(used / days);

  return {
    from:    sorted[0].date,
    to:      sorted[sorted.length - 1].date,
    count:   sorted.length,
    used:    round3(used),
    days,
    perDay,
    perYear: perYearFrom(perDay),
  };
};

/** Ein Zählwerk oder ein Verbrauch in der Anzeige — mit Einheit, wenn es eine gibt. */
export const fmtQuantity = (value, lang, unit = '', digits = 1) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '';

  const number = Number(value);
  const text = new Intl.NumberFormat(LOCALES[lang] || LOCALES.de, {
    maximumFractionDigits: digits,
  }).format(number);

  return unit ? `${text} ${unit}` : text;
};
