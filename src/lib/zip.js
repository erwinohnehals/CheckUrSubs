// ─── ZIP auspacken ────────────────────────────────────────────────────────────
// Banken geben CAMT gern als Archiv aus: ein Jahr Kontobericht sind sechs XML-
// Dateien in einer ZIP. Vom Nutzer zu verlangen, sie vorher selbst auszupacken,
// wäre eine Hürde an genau der Stelle, an der er zum ersten Mal etwas von der
// App will.
//
// Ausgepackt wird ohne Bibliothek. `DecompressionStream` gehört seit Jahren zur
// Plattform und beherrscht „deflate-raw" — und genau das steckt in einer ZIP.
// Eine Abhängigkeit für 60 Zeilen wäre in einer App, die offline in einem
// Browser läuft, schlecht bezahlt.
//
// Nicht unterstützt: ZIP64 (über 4 GB) und verschlüsselte Archive. Ein
// Kontoauszug ist weder das eine noch das andere.

const SIGNATURE_EOCD    = 0x06054b50;
const SIGNATURE_CENTRAL = 0x02014b50;
const SIGNATURE_LOCAL   = 0x04034b50;

const METHOD_STORE   = 0;
const METHOD_DEFLATE = 8;

/** Das Ende des Zentralverzeichnisses steht hinten — gesucht wird rückwärts. */
const findEndOfDirectory = (view) => {
  // Hinter dem Satz darf ein Kommentar von bis zu 64 KB stehen
  const earliest = Math.max(0, view.byteLength - 0xffff - 22);

  for (let offset = view.byteLength - 22; offset >= earliest; offset -= 1) {
    if (view.getUint32(offset, true) === SIGNATURE_EOCD) return offset;
  }
  return -1;
};

const inflate = async (bytes, method) => {
  if (method === METHOD_STORE) return bytes;
  if (method !== METHOD_DEFLATE) {
    throw new Error(`Unsupported ZIP compression method ${method}`);
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

/**
 * Archiv → Dateien. Verzeichniseinträge fallen weg; die Reihenfolge ist die des
 * Zentralverzeichnisses, also die, in der die Bank die Teile nummeriert hat.
 */
export const readZip = async (buffer) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view  = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const end = findEndOfDirectory(view);
  if (end < 0) throw new Error('Not a ZIP archive');

  const count  = view.getUint16(end + 10, true);
  let   cursor = view.getUint32(end + 16, true);

  const files = [];

  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(cursor, true) !== SIGNATURE_CENTRAL) break;

    const method         = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength     = view.getUint16(cursor + 28, true);
    const extraLength    = view.getUint16(cursor + 30, true);
    const commentLength  = view.getUint16(cursor + 32, true);
    const localOffset    = view.getUint32(cursor + 42, true);

    const name = new TextDecoder('utf-8').decode(
      bytes.subarray(cursor + 46, cursor + 46 + nameLength));

    cursor += 46 + nameLength + extraLength + commentLength;

    // Ein Verzeichnis hat keinen Inhalt
    if (name.endsWith('/')) continue;

    if (view.getUint32(localOffset, true) !== SIGNATURE_LOCAL) continue;

    // Die Längen im lokalen Kopf weichen von denen im Verzeichnis ab — für den
    // Beginn der Daten zählen sie, für die Größe das Verzeichnis.
    const localNameLength  = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;

    files.push({
      name,
      bytes: await inflate(bytes.subarray(start, start + compressedSize), method),
    });
  }

  return files;
};

/** Sieht der Puffer nach einem Archiv aus? */
export const looksLikeZip = (buffer) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b
    && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07);
};
