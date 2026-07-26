// ─── XML, so viel wie CAMT braucht ────────────────────────────────────────────
// Der Browser hat DOMParser, node hat ihn nicht. Ein Modul unter lib/ soll aber
// unter `node --test` laufen wie jedes andere — sonst bleibt ausgerechnet der
// Teil ungetestet, der fremde Dateien liest.
//
// Deshalb ein eigener, kleiner Leser. Er kann, was maschinell erzeugtes CAMT
// enthält: Elemente, Attribute, Text, Entities, selbstschließende Tags. Er kann
// bewusst kein CDATA, keine Namensräume und keine DTD — käme das vor, wäre die
// Datei kein Kontoauszug.

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ',
};

export const decodeEntities = (text) => String(text ?? '').replace(
  /&(#x?[0-9a-f]+|[a-z]+);/gi,
  (whole, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    const named = ENTITIES[body.toLowerCase()];
    return named === undefined ? whole : named;
  });

const node = (name) => ({ name, attrs: {}, children: [], text: '' });

const readAttrs = (source) => {
  const attrs = {};
  const pattern = /([\w:.-]+)\s*=\s*"([^"]*)"|([\w:.-]+)\s*=\s*'([^']*)'/g;
  let match;
  while ((match = pattern.exec(source))) {
    const key = match[1] ?? match[3];
    attrs[key] = decodeEntities(match[2] ?? match[4]);
  }
  return attrs;
};

/**
 * XML-Text → Baum. Der Namensraum wird vom Namen abgeschnitten: CAMT trägt ihn
 * als Vorsatz am Wurzelelement, und `<Ntry>` heißt in jeder Datei `Ntry`.
 */
export const parseXML = (text) => {
  const input = String(text ?? '');
  const root  = node('#root');
  const stack = [root];

  // Deklaration, Kommentare und Verarbeitungsanweisungen tragen keine Daten
  const pattern = /<(\/)?([\w:.-]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/)?>|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<![^>]*>/g;

  let cursor = 0;
  let match;

  while ((match = pattern.exec(input))) {
    const [whole, closing, rawName, rawAttrs, selfClosing, cdata] = match;

    // Text zwischen zwei Tags gehört dem offenen Element
    const between = input.slice(cursor, match.index);
    if (between) stack[stack.length - 1].text += decodeEntities(between);
    cursor = match.index + whole.length;

    if (cdata !== undefined) {
      stack[stack.length - 1].text += cdata;
      continue;
    }
    if (!rawName) continue;

    const name = rawName.includes(':') ? rawName.slice(rawName.indexOf(':') + 1) : rawName;

    if (closing) {
      // Ein unpassendes Ende ignorieren, statt den Baum zu verlieren
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].name === name) { stack.length = i; break; }
      }
      continue;
    }

    const element = node(name);
    element.attrs = rawAttrs ? readAttrs(rawAttrs) : {};
    stack[stack.length - 1].children.push(element);
    if (!selfClosing) stack.push(element);
  }

  return root;
};

/** Das erste Kind mit diesem Namen. */
export const child = (parent, name) =>
  parent?.children.find((item) => item.name === name) || null;

/** Absteigen über einen Pfad: path(node, 'Refs/AcctSvcrRef'). */
export const at = (parent, path) =>
  String(path).split('/').reduce((current, name) => child(current, name), parent);

/** Der Textinhalt an einem Pfad, getrimmt — oder ''. */
export const textAt = (parent, path) => {
  const found = path ? at(parent, path) : parent;
  return found ? found.text.trim() : '';
};

/** Alle Nachfahren mit diesem Namen, in Dokumentreihenfolge. */
export const findAll = (parent, name) => {
  const found = [];
  const walk = (current) => {
    for (const item of current.children) {
      if (item.name === name) found.push(item);
      else walk(item);
    }
  };
  if (parent) walk(parent);
  return found;
};
