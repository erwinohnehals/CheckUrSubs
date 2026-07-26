// ─── CSV ──────────────────────────────────────────────────────────────────────
// Der Export setzt Anführungszeichen, sobald ein Wert Komma, Anführungszeichen
// oder Umbruch enthält (RFC 4180) — eine Adresse wie „Hauptstraße 5, Berlin“
// tut das immer. Der Import muss sie deshalb auch wieder lesen können, sonst
// zerfällt beim Zurückspielen der eigenen Datei jede Zeile in falsche Spalten.

const QUOTE = '"';

/** Ein Feld für die Ausgabe — mit Anführungszeichen nur dort, wo sie nötig sind. */
export const csvCell = (value) => {
  const text = String(value ?? '');
  return /["\n\r,]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Kopfzeile + Datenzeilen aus Objekten, in der Reihenfolge der Spalten. */
export const toCSV = (headers, rows) => [
  headers.join(','),
  ...rows.map(row => headers.map(header => csvCell(row[header])).join(',')),
].join('\n');

export const EXPENSE_CSV_HEADERS = [
  'receipt_id', 'direction', 'date', 'title', 'merchant',
  'account_id', 'currency_code', 'item_id', 'item_label', 'amount',
  'category', 'receipt_category', 'tags', 'note', 'refund_for', 'archived_at',
];

/**
 * Ein Vorgang bleibt über receipt_id zusammenhängend, während jede Position
 * ihre eigene Zeile bekommt. Vorgänge ohne Aufteilung werden zu genau einer
 * Zeile, damit im Export keine Ausgabe verschwindet.
 */
export const expenseCSVRows = (transactions = []) =>
  transactions.flatMap((transaction) => {
    const common = {
      receipt_id:      transaction.id,
      direction:       transaction.direction,
      date:            transaction.date,
      title:           transaction.title,
      merchant:        transaction.merchant,
      account_id:      transaction.account_id,
      currency_code:   transaction.currency_code,
      receipt_category: transaction.category,
      tags:            (transaction.tags || []).join(' | '),
      note:            transaction.note,
      refund_for:      transaction.refund_for,
      archived_at:     transaction.archived_at,
    };
    const items = Array.isArray(transaction.items) ? transaction.items : [];

    if (!items.length) {
      return [{
        ...common,
        item_id: '',
        item_label: '',
        amount: transaction.amount,
        category: transaction.category,
      }];
    }

    return items.map((item) => ({
      ...common,
      item_id: item.id,
      item_label: item.label,
      amount: item.amount,
      category: item.category || transaction.category,
    }));
  });

export const expensesToCSV = (transactions = []) =>
  toCSV(EXPENSE_CSV_HEADERS, expenseCSVRows(transactions));

/**
 * Zerlegt CSV in Zeilen aus Feldern. Versteht Anführungszeichen, verdoppelte
 * Anführungszeichen als Escape und Umbrüche innerhalb eines Feldes.
 *
 * Das Trennzeichen ist wählbar: der eigene Export schreibt Komma (RFC 4180),
 * deutsche Bankauszüge schreiben Semikolon, weil dort das Komma schon das
 * Dezimaltrennzeichen ist.
 */
export const parseRows = (text, delimiter = ',') => {
  // Byte Order Mark: Excel schreibt ihn voran, sonst trüge die erste Spalte ihn im Namen
  const input = String(text ?? '').charCodeAt(0) === 0xfeff
    ? String(text).slice(1)
    : String(text ?? '');

  const rows  = [];
  let row     = [];
  let field   = '';
  let quoted  = false;
  let i       = 0;

  const endField = () => { row.push(field); field = ''; };
  const endRow   = () => { endField(); rows.push(row); row = []; };

  while (i < input.length) {
    const char = input[i];

    if (quoted) {
      // "" innerhalb eines Feldes ist ein echtes Anführungszeichen
      if (char === QUOTE && input[i + 1] === QUOTE) { field += QUOTE; i += 2; continue; }
      if (char === QUOTE) { quoted = false; i += 1; continue; }
      field += char; i += 1;
      continue;
    }

    // Anführungszeichen zählen nur am Feldanfang
    if (char === QUOTE && field === '') { quoted = true; i += 1; continue; }
    if (char === delimiter) { endField(); i += 1; continue; }
    if (char === '\r') { i += 1; continue; }        // CRLF wie LF behandeln
    if (char === '\n') { endRow();   i += 1; continue; }

    field += char;
    i += 1;
  }

  // Letzte Zeile, wenn die Datei ohne Umbruch endet
  if (field !== '' || row.length > 0) endRow();

  return rows;
};

/**
 * CSV mit Kopfzeile → Objekte. Leerzeilen fallen weg, fehlende Spalten werden
 * zu leeren Zeichenketten — der Eintragsspeicher normalisiert den Rest.
 */
export const parseCSV = (text, delimiter = ',') => {
  const rows = parseRows(text, delimiter).filter(row => row.some(cell => cell.trim() !== ''));
  if (rows.length === 0) return [];

  const headers = rows[0].map(header => header.trim());

  return rows.slice(1).map(cells => Object.fromEntries(
    headers.map((header, index) => [header, (cells[index] ?? '').trim()]),
  ));
};
