import test from 'node:test';
import assert from 'node:assert/strict';

import { suggestCategory, merchantKey, rulesFromDecisions } from './autoCategorize.js';
import {
  existingRefsOf, groupByMonth, importSummary, prepareImport, toTransaction,
} from './bankImport.js';
import { createBankRuleStore } from './bankRules.js';
import { createExpenseStore } from './expenseStore.js';
import { readZip, looksLikeZip } from './zip.js';

const memoryStorage = () => {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
};

const bankRow = (attributes = {}) => ({
  ref: 'r1', format: 'camt-v2', date: '2026-03-14', value_date: '2026-03-14',
  direction: 'expense', amount: 12.5, currency_code: 'EUR',
  merchant: 'LIDL', title: 'Einkauf', purpose: '', booking_text: '',
  counterparty_iban: '', creditor_id: '', mandate_ref: '', family: '',
  account_key: 'DE66', internal: false, internal_reason: '', note: '',
  ...attributes,
});

// ─── Vorschlag ────────────────────────────────────────────────────────────────

test('bekannte Ketten werden erkannt', () => {
  assert.equal(suggestCategory(bankRow({ merchant: 'LIDL' })).category, 'groceries');
  assert.equal(suggestCategory(bankRow({ merchant: 'DM Drogerie' })).category, 'household');
  assert.equal(suggestCategory(bankRow({ merchant: 'nextbike GmbH' })).category, 'transport');
});

test('Wohnkosten und gewerbliche Miete bleiben getrennt', () => {
  const row = (attributes) => bankRow({ merchant: 'Anna Vogel', title: '', ...attributes });

  assert.equal(suggestCategory(row({ purpose: 'Miete Maerz' })).category, 'housing');
  assert.equal(suggestCategory(bankRow({ merchant: 'Stadtwerke Leipzig' })).category, 'housing');
  assert.equal(suggestCategory(row({ purpose: 'Gewerbemiete Q1' })).category, 'commercial_rent');
  // Der Arbeitsraum schlägt die Wohnung, obwohl „Miete" in beiden Zeilen steht
  assert.equal(suggestCategory(row({ purpose: 'Miete Atelier Maerz' })).category, 'commercial_rent');
  // Ein Paket ist keine Wohnkost
  assert.equal(suggestCategory(bankRow({ merchant: 'DHL Paket' })).category, 'household');
});

test('durchlaufende Posten gehen beiden Richtungen vor', () => {
  const out = suggestCategory(bankRow({ merchant: 'Anna Vogel', title: '', purpose: 'Mietkaution Atelier' }));
  assert.equal(out.category, 'pass_through');

  const back = suggestCategory(bankRow({
    direction: 'income', merchant: 'Anna Vogel', title: '', purpose: 'Kaution zurueck',
  }));
  assert.equal(back.category, 'income_pass_through');
});

test('„Miete" auf der Einnahmenseite wird keine Wohnkost', () => {
  // Was zur Miete hereinkommt, ist nicht die Miete. Die Stichwortliste der
  // Ausgaben darf hier gar nicht erst greifen — sonst hinge eine Überweisung
  // unter „Wohnkosten" und ginge als Ausgabe in die Auswertung.
  const result = suggestCategory(bankRow({
    direction: 'income', merchant: 'Anna Vogel', title: '', purpose: 'Miete Maerz',
  }));

  assert.equal(result.category, 'income_other');
});

test('Mobilfunk, Geräte und Software liegen nicht mehr in einem Topf', () => {
  assert.equal(suggestCategory(bankRow({ merchant: 'Vodafone GmbH' })).category, 'connectivity');
  assert.equal(suggestCategory(bankRow({ merchant: 'Telekom Deutschland' })).category, 'connectivity');
  assert.equal(suggestCategory(bankRow({ merchant: 'MediaMarkt Leipzig' })).category, 'devices');
  assert.equal(suggestCategory(bankRow({ merchant: 'ADOBE SYSTEMS' })).category, 'software');
  assert.equal(suggestCategory(bankRow({ merchant: 'APPLE.COM/BILL' })).category, 'software');
});

test('ALDI TALK ist kein Einkauf', () => {
  assert.equal(suggestCategory(bankRow({ merchant: 'ALDI TALK Aufladung' })).category, 'connectivity');
  assert.equal(suggestCategory(bankRow({ merchant: 'ALDI SAGT DANKE' })).category, 'groceries');
});

test('Kaufhäuser, die alles verkaufen, sagen nichts', () => {
  // Kein Vorschlag ist besser als „Geräte", wenn dieselbe Zeile auch das
  // Katzenfutter sein kann
  assert.equal(suggestCategory(bankRow({ merchant: 'AMZN Mktp DE' })).confidence, 'low');
  assert.equal(suggestCategory(bankRow({ merchant: 'eBay GmbH' })).confidence, 'low');
});

test('eine gelernte Regel überlebt die Umbenennung ihrer Kategorie', () => {
  const learned = { [merchantKey('Elektro Vogel')]: 'tech' };
  const result  = suggestCategory(bankRow({ merchant: 'Elektro Vogel' }), learned);

  assert.equal(result.category, 'devices');
  assert.equal(result.reason, 'learned');
  assert.equal(result.confidence, 'high');
});

test('ein angehängtes s bricht die Erkennung nicht', () => {
  assert.equal(suggestCategory(bankRow({ merchant: 'McDonalds 01597' })).category, 'dining');
});

test('kurze Namen treffen nicht mitten im Wort', () => {
  // „dm" ist Drogerie, „Dmitri Schuster" ist ein Mensch
  assert.equal(suggestCategory(bankRow({ merchant: 'Dmitri Schuster' })).confidence, 'low');
  assert.equal(suggestCategory(bankRow({ merchant: 'dm-drogerie markt' })).category, 'household');
});

test('was die Bank über die Zahlungsart sagt, schlägt das Stichwort', () => {
  const row = bankRow({ merchant: 'Sparkasse', family: 'MDOP/CHRG' });
  const result = suggestCategory(row);

  assert.equal(result.category, 'fees');
  assert.equal(result.confidence, 'high');
  assert.equal(result.reason, 'payment_type');
});

test('Gelerntes schlägt jede Regel', () => {
  const learned = { [merchantKey('LIDL')]: 'household' };
  const result = suggestCategory(bankRow({ merchant: 'LIDL' }), learned);

  assert.equal(result.category, 'household');
  assert.equal(result.confidence, 'high');
  assert.equal(result.reason, 'learned');
});

test('eine Einnahme bekommt nie eine Ausgabenkategorie', () => {
  const learned = { [merchantKey('Firma')]: 'groceries' };
  const row = bankRow({ merchant: 'Firma', direction: 'income' });

  assert.equal(suggestCategory(row, learned).category, 'income_other');
});

test('Unbekanntes wird als unsicher gekennzeichnet, nicht als „Sonstiges" verkauft', () => {
  const result = suggestCategory(bankRow({ merchant: 'Im Angebot OHG', title: '', purpose: '' }));
  assert.equal(result.confidence, 'low');
  assert.equal(result.reason, 'default');
});

test('gelernt wird nur aus Widerspruch, nie aus dem eigenen Vorschlag', () => {
  const learned = rulesFromDecisions([
    { merchant: 'LIDL',  category: 'household', overridden: true },
    { merchant: 'REWE',  category: 'groceries', overridden: false },
  ]);

  assert.deepEqual(Object.keys(learned), [merchantKey('LIDL')]);
});

// ─── Vorbereitung ─────────────────────────────────────────────────────────────

test('Umbuchungen und Nullbeträge sind vorab abgewählt, aber sichtbar', () => {
  const items = prepareImport({ rows: [
    bankRow({ ref: 'a' }),
    bankRow({ ref: 'b', internal: true, internal_reason: 'paypal_collection' }),
    bankRow({ ref: 'c', amount: 0 }),
  ] });

  assert.equal(items.length, 3, 'nichts verschwindet');
  assert.deepEqual(items.map((item) => item.include), [true, false, false]);
  assert.deepEqual(items.map((item) => item.exclusion), [null, 'internal', 'zero']);
});

test('was schon in den Büchern steht, kommt nicht zweimal hinein', () => {
  const items = prepareImport({
    rows: [bankRow({ ref: 'a' }), bankRow({ ref: 'b' })],
    existingRefs: new Set(['a']),
  });

  assert.equal(items[0].include, false);
  assert.equal(items[0].exclusion, 'already_imported');
  assert.equal(items[1].include, true);
});

test('das gemerkte Konto wird vorbelegt', () => {
  const [item] = prepareImport({
    rows: [bankRow({ account_key: 'DE66' })],
    accountMap: { de66: 'konto-1' },
  });

  assert.equal(item.account_id, 'konto-1');
});

test('ein langer Verwendungszweck weicht dem Händlernamen', () => {
  const long = 'Kd.1208906497 Wir sagen Danke fuer Ihren Auftrag RG-Nr.M26047179100 ueber 26,96 EUR';
  const [item] = prepareImport({ rows: [bankRow({ title: long, merchant: 'freenet DLS GmbH' })] });

  assert.equal(item.title, 'freenet DLS GmbH');
});

// ─── Zusammenfassung und Gliederung ───────────────────────────────────────────

test('die Kopfzahlen zählen nur, was eingeschlossen ist', () => {
  const items = prepareImport({ rows: [
    bankRow({ ref: 'a', amount: 10 }),
    bankRow({ ref: 'b', amount: 5, direction: 'income' }),
    bankRow({ ref: 'c', amount: 99, internal: true }),
  ] });

  const summary = importSummary(items);
  assert.equal(summary.total, 3);
  assert.equal(summary.included, 2);
  assert.equal(summary.internal, 1);
  assert.equal(summary.expense, 10);
  assert.equal(summary.income, 5);
});

test('Monate stehen neueste zuerst', () => {
  const groups = groupByMonth(prepareImport({ rows: [
    bankRow({ ref: 'a', date: '2026-01-15' }),
    bankRow({ ref: 'b', date: '2026-03-02' }),
    bankRow({ ref: 'c', date: '2026-03-28' }),
  ] }));

  assert.deepEqual(groups.map((group) => group.month), ['2026-03', '2026-01']);
  assert.deepEqual(groups[0].items.map((item) => item.row.date), ['2026-03-28', '2026-03-02']);
});

// ─── Übernahme ────────────────────────────────────────────────────────────────

test('ein Posten wird zu einem Vorgang mit Herkunft', () => {
  const [item] = prepareImport({ rows: [bankRow({ creditor_id: 'DE43ZZZ', mandate_ref: 'M-1' })] });
  const transaction = toTransaction({ ...item, account_id: 'konto-1' });

  assert.equal(transaction.amount, 12.5);
  assert.equal(transaction.category, 'groceries');
  assert.equal(transaction.account_id, 'konto-1');
  assert.equal(transaction.source.ref, 'r1');
  assert.equal(transaction.source.creditor_id, 'DE43ZZZ');
});

test('eine eingeschlossene Umbuchung kommt als Umbuchung in die Bücher', () => {
  // Vorab abgewählt ist sie — wer sie trotzdem einschließt, will die Bewegung
  // sehen, nicht eine Ausgabe erfinden.
  const [item] = prepareImport({ rows: [bankRow({
    merchant: 'Joao Carvalho', purpose: 'Mein Geld', amount: 800,
    direction: 'income', internal: true, internal_reason: 'own_transfer',
  })] });

  assert.equal(item.include, false);

  const store = createExpenseStore(memoryStorage());
  const [saved] = store.importRows([toTransaction({ ...item, include: true })]);

  assert.equal(saved.internal, true);
  assert.equal(saved.amount, 800);
});

test('eine gewöhnliche Zeile bleibt gezählt', () => {
  const [item] = prepareImport({ rows: [bankRow()] });
  assert.equal(toTransaction(item).internal, false);
});

test('derselbe Auszug zweimal eingelesen legt nichts doppelt an', () => {
  const store = createExpenseStore(memoryStorage());
  const rows  = [bankRow({ ref: 'a' }), bankRow({ ref: 'b', amount: 3 })];
  const build = () => prepareImport({ rows, existingRefs: existingRefsOf(store.list()) })
    .filter((item) => item.include)
    .map(toTransaction);

  assert.equal(store.importRows(build()).length, 2);
  assert.equal(store.importRows(build()).length, 0, 'der zweite Durchlauf fügt nichts hinzu');
  assert.equal(store.list().length, 2);
});

test('zwei echte gleiche Zahlungen am selben Tag bleiben zwei Vorgänge', () => {
  const store = createExpenseStore(memoryStorage());

  // Gleicher Händler, gleicher Betrag, gleicher Tag — aber zwei Referenzen
  const imported = store.importRows([
    toTransaction(prepareImport({ rows: [bankRow({ ref: 'x1' })] })[0]),
    toTransaction(prepareImport({ rows: [bankRow({ ref: 'x2' })] })[0]),
  ]);

  assert.equal(imported.length, 2);
});

// ─── Gedächtnis ───────────────────────────────────────────────────────────────

test('der Regelspeicher merkt sich Korrekturen und Konten', () => {
  const store = createBankRuleStore(memoryStorage());

  store.learn([
    { merchant: 'Loesch-Depot Leipzig', category: 'groceries', overridden: true },
    { merchant: 'REWE', category: 'groceries', overridden: false },
  ]);
  store.rememberAccount('DE66 8505 0300', 'konto-1');

  assert.equal(store.categories()[merchantKey('Loesch-Depot Leipzig')], 'groceries');
  assert.equal(store.categories()[merchantKey('REWE')], undefined);
  assert.equal(store.accountFor('de6685050300'), 'konto-1');
});

test('der Regelspeicher merkt sich Vertragsverknüpfungen', () => {
  const store = createBankRuleStore(memoryStorage());

  store.rememberEntry('cid:de43zzz001', 'vertrag-1');

  assert.equal(store.entryFor('cid:de43zzz001'), 'vertrag-1');
  assert.equal(store.entryFor('cid:unbekannt'), null);
});

test('ein kaputter Regelspeicher wirft nicht, er ist einfach leer', () => {
  const storage = memoryStorage();
  storage.setItem('goldgeld.bankrules', '{kaputt');

  assert.deepEqual(createBankRuleStore(storage).all(), { categories: {}, accounts: {}, entries: {} });
});

// ─── ZIP ──────────────────────────────────────────────────────────────────────

test('ein Archiv wird an seiner Signatur erkannt', () => {
  assert.equal(looksLikeZip(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0])), true);
  assert.equal(looksLikeZip(new TextEncoder().encode('Auftragskonto;')), false);
});

test('gespeicherte und gepackte Einträge kommen unversehrt heraus', async () => {
  const { deflateRawSync, crc32 } = await import('node:zlib');
  const content = new TextEncoder().encode('Auftragskonto;Buchungstag\nDE66;23.07.26\n'.repeat(40));
  const packed  = deflateRawSync(content);
  const name    = new TextEncoder().encode('teil.csv');

  // Ein Archiv mit genau einem Eintrag, von Hand gesetzt
  const local = new Uint8Array(30 + name.length + packed.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint16(8, 8, true);
  lv.setUint32(14, crc32(content) >>> 0, true);
  lv.setUint32(18, packed.length, true);
  lv.setUint32(22, content.length, true);
  lv.setUint16(26, name.length, true);
  local.set(name, 30);
  local.set(packed, 30 + name.length);

  const central = new Uint8Array(46 + name.length);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint16(10, 8, true);
  cv.setUint32(20, packed.length, true);
  cv.setUint32(24, content.length, true);
  cv.setUint16(28, name.length, true);
  cv.setUint32(42, 0, true);
  central.set(name, 46);

  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, 1, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(12, central.length, true);
  ev.setUint32(16, local.length, true);

  const archive = new Uint8Array(local.length + central.length + end.length);
  archive.set(local, 0);
  archive.set(central, local.length);
  archive.set(end, local.length + central.length);

  const files = await readZip(archive);
  assert.equal(files.length, 1);
  assert.equal(files[0].name, 'teil.csv');
  assert.deepEqual(files[0].bytes, content);
});
