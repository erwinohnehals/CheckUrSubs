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

/**
 * Zerlegt CSV in Zeilen aus Feldern. Versteht Anführungszeichen, verdoppelte
 * Anführungszeichen als Escape und Umbrüche innerhalb eines Feldes.
 */
export const parseRows = (text) => {
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
    if (char === ',')  { endField(); i += 1; continue; }
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
export const parseCSV = (text) => {
  const rows = parseRows(text).filter(row => row.some(cell => cell.trim() !== ''));
  if (rows.length === 0) return [];

  const headers = rows[0].map(header => header.trim());

  return rows.slice(1).map(cells => Object.fromEntries(
    headers.map((header, index) => [header, (cells[index] ?? '').trim()]),
  ));
};
