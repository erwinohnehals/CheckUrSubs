// ─── Kontoauszüge lesen ───────────────────────────────────────────────────────
// Drei Häuser, drei Dateiformate, ein Ergebnis. Was hier herauskommt, ist eine
// „Bankzeile": neutral, ohne Kategorie, ohne Konto — das entscheidet die Ansicht.
//
// Der Entwurf hat einen Angelpunkt: `ref`. Zwei Dateien mit überlappendem
// Zeitraum sind der Normalfall, nicht die Ausnahme — man exportiert im März und
// im April, und der März steckt zweimal da. Ohne stabile Kennung landet jede
// Ausgabe doppelt in den Summen. Zwei der drei Formate liefern eine echte
// Referenz der Bank; CAMT V2 nicht, dort wird sie aus dem Inhalt gebildet.
//
// Der zweite Angelpunkt ist `internal`. Wer Girokonto UND Kreditkarte UND PayPal
// einliest, sieht denselben Einkauf bis zu dreimal: einmal beim Händler, einmal
// als Sammelabbuchung der Kreditkarte, einmal als PayPal-Einzug. Nur die erste
// ist eine Ausgabe, die beiden anderen sind Geld, das zwischen eigenen Töpfen
// wandert. Sie werden erkannt, behalten — und nicht mitgezählt.

import { parseRows } from './csv.js';
import { parseAmount } from './expenseStore.js';
import { isCamt052, readCamt052 } from './camt052.js';
import { transferTextReason } from './internalTransfer.js';
import { looksLikeZip, readZip } from './zip.js';

export const BANK_FORMATS = ['camt-052', 'camt-v2', 'sparkasse-credit', 'paypal'];

// ─── Text ─────────────────────────────────────────────────────────────────────

/**
 * Deutsche Banken schreiben Windows-1252, PayPal UTF-8 mit BOM. Geraten wird
 * nicht: erst streng als UTF-8, und nur wenn das scheitert, ist es 1252. Ohne
 * den Umweg wird aus „Gebührenschlüssel" ein „Geb�hrenschl�ssel" — und die
 * Spalte ist unauffindbar, weil ihr Name selbst kaputt ist.
 */
export const decodeBankFile = (buffer) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
};

// FNV-1a: kurz, stabil, überall gleich. Es geht um Wiedererkennung, nicht um
// Geheimhaltung — eine kryptografische Streuung wäre hier nur langsamer.
const fnv1a = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const squash = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

/**
 * „LIDL SAGT DANKE//Leipzig/DE" ist der Händler, die Filiale und das Land in
 * einem Feld. Für die Wiedererkennung zählt nur der erste Teil — sonst gilt
 * dieselbe Kette in zwei Straßen als zwei verschiedene Händler.
 */
export const cleanCounterparty = (value) => {
  const text = squash(value);
  if (!text) return '';

  const head = text.split('//')[0].split(/\/(?=[^/]*\d)|\//)[0];

  return squash(head
    .replace(/\bSAGT\s+DANKE\.?/gi, '')
    .replace(/\bWir sagen Danke\.?/gi, '')
    .replace(/\s+\d{4,}\s*$/, ''));
};

/** Kartenzeilen kleben Ort und Land an den Namen: „…LIFENEW YORK    US". */
const cleanCardDescription = (value) => {
  const text = squash(String(value ?? '').replace(/\s{2,}[A-Z]{2}\s*$/, ''));
  return text;
};

// ─── Datum ────────────────────────────────────────────────────────────────────

/**
 * „23.07.26" und „04.01.2022" — beide kommen vor, teils in einer Datei.
 * Zweistellige Jahre unter 70 sind dieses Jahrhundert; ein Kontoauszug von
 * 1969 wird nicht importiert, einer von 2026 dauernd.
 */
export const parseGermanDate = (value) => {
  const match = String(value ?? '').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
  if (!match) return '';

  const [, day, month, rawYear] = match;
  const year = rawYear.length === 4
    ? Number(rawYear)
    : Number(rawYear) + (Number(rawYear) < 70 ? 2000 : 1900);

  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const probe = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(probe.getTime()) ? '' : iso;
};

// ─── Tabelle ──────────────────────────────────────────────────────────────────

const tableOf = (text, delimiter) => {
  const rows = parseRows(text, delimiter).filter(row => row.some(cell => cell.trim() !== ''));
  if (!rows.length) return { headers: [], records: [] };

  const headers = rows[0].map(header => header.trim());
  const records = rows.slice(1)
    // Fußzeilen („Anzahl Umsätze: 152") haben nicht die Spaltenzahl der Tabelle
    .filter(cells => cells.length >= Math.max(2, Math.floor(headers.length * 0.5)))
    .map(cells => Object.fromEntries(
      headers.map((header, index) => [header, (cells[index] ?? '').trim()])));

  return { headers, records };
};

// ─── Erkennung ────────────────────────────────────────────────────────────────

const SIGNATURES = [
  { format: 'camt-v2',          delimiter: ';', required: ['Auftragskonto', 'Buchungstag', 'Verwendungszweck'] },
  { format: 'sparkasse-credit', delimiter: ';', required: ['Belegdatum', 'Buchungsbetrag', 'Transaktionsbeschreibung'] },
  { format: 'paypal',           delimiter: ',', required: ['Transaktionscode', 'Auswirkung auf Guthaben'] },
];

/** Welches Format liegt vor — oder null, wenn keine Signatur passt. */
export const detectFormat = (text) => {
  for (const signature of SIGNATURES) {
    const { headers } = tableOf(text, signature.delimiter);
    if (signature.required.every(name => headers.includes(name))) return signature;
  }
  return null;
};

// ─── Gemeinsame Zeile ─────────────────────────────────────────────────────────

const bankRow = (attributes) => ({
  ref: '',
  format: '',
  date: '',
  value_date: '',
  direction: 'expense',
  amount: 0,
  currency_code: 'EUR',
  merchant: '',
  title: '',
  purpose: '',
  booking_text: '',
  counterparty_iban: '',
  creditor_id: '',
  mandate_ref: '',
  // Der ISO-Code der Zahlungsart, sofern das Format ihn führt: „MDOP/CHRG" ist
  // eine Kontogebühr, „ICDT/STDO" ein Dauerauftrag. Nur CAMT liefert ihn.
  family: '',
  account_key: '',
  internal: false,
  internal_reason: '',
  note: '',
  ...attributes,
});

const signedToRow = (signed) => ({
  direction: signed < 0 ? 'expense' : 'income',
  amount: Math.abs(signed),
});

// ─── CAMT V2 (Sparkasse Giro) ─────────────────────────────────────────────────

// Was kein Kauf ist, sondern Geld zwischen eigenen Töpfen. Die Kreditkarten-
// abrechnung und „Mein Geld" im Verwendungszweck erkennt lib/internalTransfer.js
// — dieselbe Regel gilt für CAMT.052, und sie soll nicht zweimal dastehen.
const camtInternal = (record, merchant) => {
  const reason = transferTextReason(
    squash(record['Buchungstext']), squash(record['Verwendungszweck']));
  if (reason) return reason;

  // PayPal zieht gesammelt ein, was in der PayPal-Datei einzeln steht
  if (/paypal/i.test(merchant)) return 'paypal_collection';

  return '';
};

const fromCamtV2 = (records) => {
  const seen = new Map();

  return records.map((record) => {
    const signed   = parseAmount(record['Betrag']);
    const merchant = cleanCounterparty(record['Beguenstigter/Zahlungspflichtiger']);
    const purpose  = squash(record['Verwendungszweck']);
    const date     = parseGermanDate(record['Buchungstag']);

    // CAMT V2 führt keine eindeutige Referenz. Der Inhalt der Zeile ist der
    // beste Ersatz — plus ein Zähler, damit zwei echte gleiche Buchungen am
    // selben Tag (zweimal 2,50 € beim Bäcker) zwei Zeilen bleiben.
    const seed  = [record['Auftragskonto'], date, record['Betrag'], purpose,
      record['Beguenstigter/Zahlungspflichtiger'], record['Buchungstext']].join('|');
    const count = (seen.get(seed) || 0) + 1;
    seen.set(seed, count);

    const reason = camtInternal(record, merchant);

    return bankRow({
      ref: `camt:${fnv1a(seed)}:${count}`,
      format: 'camt-v2',
      date,
      value_date: parseGermanDate(record['Valutadatum']),
      ...signedToRow(signed),
      currency_code: squash(record['Waehrung']) || 'EUR',
      merchant,
      title: purpose,
      purpose,
      booking_text: squash(record['Buchungstext']),
      counterparty_iban: squash(record['Kontonummer/IBAN']),
      creditor_id: squash(record['Glaeubiger ID']),
      mandate_ref: squash(record['Mandatsreferenz']),
      account_key: squash(record['Auftragskonto']),
      internal: Boolean(reason),
      internal_reason: reason,
    });
  }).filter(row => row.date);
};

// ─── Sparkasse Kreditkarte ────────────────────────────────────────────────────

const fromSparkasseCredit = (records) => records.map((record) => {
  const signed      = parseAmount(record['Buchungsbetrag']);
  const description = cleanCardDescription(record['Transaktionsbeschreibung']);
  const original    = squash(record['Originalwährung']);
  const reference   = squash(record['Buchungsreferenz']);

  // Bei Fremdwährung ist der gebuchte Euro-Betrag die Wahrheit fürs Budget —
  // der Originalbetrag gehört daneben, nicht an seine Stelle.
  const note = original && original !== squash(record['Buchungswährung'])
    ? squash(`${record['Originalbetrag']} ${original} · Kurs ${record['Umrechnungskurs']}`)
    : '';

  return bankRow({
    ref: reference ? `card:${reference}` : `card:${fnv1a(JSON.stringify(record))}`,
    format: 'sparkasse-credit',
    date: parseGermanDate(record['Belegdatum']),
    value_date: parseGermanDate(record['Buchungsdatum']),
    ...signedToRow(signed),
    currency_code: squash(record['Buchungswährung']) || 'EUR',
    merchant: description,
    title: description,
    purpose: squash(record['Transaktionsbeschreibung Zusatz']),
    account_key: squash(record['Umsatz getätigt von']),
    note,
  });
}).filter(row => row.date);

// ─── PayPal ───────────────────────────────────────────────────────────────────

// PayPal bucht jede Zahlung mehrfach: die Zahlung selbst, die Deckung vom
// Bankkonto oder von der Karte, dazu Autorisierungen und deren Rückbuchung.
// Ökonomisch ist nur die Zahlung echt — der Rest ist die Mechanik dahinter und
// würde jede Monatssumme verdoppeln.
const PAYPAL_INTERNAL_TYPES = new Map([
  ['Bankgutschrift auf PayPal-Konto',                                    'funding'],
  ['Allgemeine Gutschrift auf Kreditkarte',                              'funding'],
  ['Allgemeine Abbuchung von Kreditkarte',                               'funding'],
  ['ACH-Überweisung als Zahlungsquelle für Ausgleich von Kontoguthaben', 'funding'],
  ['Rückbuchung von ACH-Gutschrift',                                     'funding'],
  ['Von Nutzer eingeleitete Abbuchung',                                  'withdrawal'],
  ['Allgemeine Abbuchung',                                               'withdrawal'],
  ['Einbehaltung für offene Autorisierung',                              'authorization'],
  ['Rückbuchung allgemeiner Einbehaltung',                               'authorization'],
  ['Allgemeine Währungsumrechnung',                                      'conversion'],
]);

// Nur Abgeschlossenes ist passiert. „Ausstehend" ändert sich noch, „Entfernt"
// und „Abgelehnt" sind nie passiert — importiert wären sie Geisterbuchungen.
const PAYPAL_BOOKED = 'Abgeschlossen';

const fromPayPal = (records) => records
  .filter(record => squash(record['Status']) === PAYPAL_BOOKED)
  .map((record) => {
    // Netto statt Brutto: die Gebühr ist mit abgeflossen und gehört zur Ausgabe
    const signed = parseAmount(record['Netto']);
    const name   = squash(record['Name']);
    const type   = squash(record['Typ']);
    const reason = PAYPAL_INTERNAL_TYPES.get(type) || '';
    const label  = squash(record['Artikelbezeichnung']) || squash(record['Betreff']) || name;

    return bankRow({
      ref: `pp:${squash(record['Transaktionscode'])}`,
      format: 'paypal',
      date: parseGermanDate(record['Datum']),
      value_date: parseGermanDate(record['Datum']),
      ...signedToRow(signed),
      currency_code: squash(record['Währung']) || 'EUR',
      merchant: name,
      title: label,
      purpose: squash(record['Hinweis']),
      booking_text: type,
      account_key: squash(record['Absender E-Mail-Adresse']),
      internal: Boolean(reason),
      internal_reason: reason,
    });
  })
  .filter(row => row.date && row.ref !== 'pp:');

// ─── Eingang ──────────────────────────────────────────────────────────────────

const ADAPTERS = {
  'camt-v2':          fromCamtV2,
  'sparkasse-credit': fromSparkasseCredit,
  'paypal':           fromPayPal,
};

/**
 * Dateiinhalt → Bankzeilen. Wirft nicht: ein unbekanntes Format ist eine
 * Antwort, kein Fehler — die Ansicht sagt es dem Nutzer.
 */
export const readBankFile = (text) => {
  if (isCamt052(text)) return { format: 'camt-052', rows: readCamt052(text) };

  const signature = detectFormat(text);
  if (!signature) return { format: null, rows: [] };

  const { records } = tableOf(text, signature.delimiter);
  const rows = ADAPTERS[signature.format](records);

  return { format: signature.format, rows };
};

/** Wie `readBankFile`, aber ab den rohen Bytes einer Datei. */
export const readBankBuffer = (buffer) => readBankFile(decodeBankFile(buffer));

/**
 * Eine hochgeladene Datei → Bankzeilen, Archiv eingeschlossen.
 *
 * Ein CAMT-Export ist regelmäßig eine ZIP aus mehreren Teilen, die zusammen
 * einen Zeitraum ergeben. Sie werden zu einer Liste zusammengezogen: für den
 * Nutzer war es eine Datei, also ist es ein Import.
 */
export const readBankUpload = async (buffer, name = '') => {
  if (!looksLikeZip(buffer)) {
    const result = readBankBuffer(buffer);
    return { ...result, name, parts: result.format ? 1 : 0 };
  }

  const files = await readZip(buffer);
  const rows  = [];
  let format  = null;
  let parts   = 0;

  for (const file of files) {
    const result = readBankBuffer(file.bytes);
    if (!result.format) continue;
    format = format || result.format;
    parts += 1;
    rows.push(...result.rows);
  }

  return { format, rows, name, parts };
};
