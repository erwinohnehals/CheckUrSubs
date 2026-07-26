import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_MONTHS, EMPTY_FILTER, applyFilter, availableFacets,
  isFilterActive, matchesFilter, matchesQuery, searchHaystack,
} from './filter.js';

// Ein Vorgang, wie ihn der Speicher herausgibt — die Pflichtfelder, mehr nicht
const tx = (over = {}) => ({
  id: over.id || 'x',
  direction: 'expense',
  title: '',
  merchant: '',
  note: '',
  date: '2026-03-14',
  category: '',
  account_id: null,
  amount: 0,
  items: [],
  tags: [],
  archived_at: null,
  internal: false,
  ...over,
});

const labels = {
  categoryLabel: (id) => ({ groceries: 'Lebensmittel', travel: 'Reise' }[id] || ''),
  accountLabel:  (id) => ({ giro: 'Girokonto' }[id] || ''),
};

// ── Der Heuhaufen ─────────────────────────────────────────────────────────────

test('der Heuhaufen sammelt Titel, Händler, Notiz, Stichwörter und Positionen', () => {
  const haystack = searchHaystack(tx({
    title: 'Wocheneinkauf',
    merchant: 'REWE',
    note: 'für die Gäste',
    tags: ['Haushalt'],
    items: [{ label: 'Kaffee', amount: 8 }],
  }), labels);

  for (const word of ['wocheneinkauf', 'rewe', 'gäste', 'haushalt', 'kaffee']) {
    assert.ok(haystack.includes(word), `${word} fehlt im Heuhaufen`);
  }
});

test('Kategorie und Konto kommen als übersetzte Beschriftung mit', () => {
  const haystack = searchHaystack(tx({ category: 'groceries', account_id: 'giro' }), labels);
  assert.ok(haystack.includes('lebensmittel'));
  assert.ok(haystack.includes('girokonto'));
});

test('der Betrag ist durchsuchbar — so erinnert man sich an ihn', () => {
  assert.ok(matchesQuery(tx({ amount: 80 }), '80', labels));
  assert.ok(matchesQuery(tx({ amount: 80.5 }), '80', labels));
  assert.ok(!matchesQuery(tx({ amount: 12 }), '80', labels));
});

// ── Die Eingabe ───────────────────────────────────────────────────────────────

test('ohne Eingabe trifft alles', () => {
  assert.ok(matchesQuery(tx(), '', labels));
  assert.ok(matchesQuery(tx(), '   ', labels));
});

test('Groß- und Kleinschreibung spielt keine Rolle', () => {
  assert.ok(matchesQuery(tx({ merchant: 'REWE' }), 'rewe', labels));
  assert.ok(matchesQuery(tx({ merchant: 'rewe' }), 'REWE', labels));
});

test('mehrere Wörter werden einzeln verlangt, nicht als Wortgruppe', () => {
  const row = tx({ merchant: 'REWE', amount: 80, title: 'Wocheneinkauf' });
  assert.ok(matchesQuery(row, 'rewe 80', labels));
  assert.ok(matchesQuery(row, '80 rewe', labels));
  assert.ok(!matchesQuery(row, 'rewe kino', labels));
});

// ── Kategorie und Stichwort ───────────────────────────────────────────────────

test('die Kategorie schränkt auf genau sie ein', () => {
  assert.ok(matchesFilter(tx({ category: 'travel' }), { ...EMPTY_FILTER, category: 'travel' }, labels));
  assert.ok(!matchesFilter(tx({ category: 'groceries' }), { ...EMPTY_FILTER, category: 'travel' }, labels));
});

test('das Stichwort muss wirklich am Vorgang hängen', () => {
  const row = tx({ tags: ['Urlaub', 'Bar'] });
  assert.ok(matchesFilter(row, { ...EMPTY_FILTER, tag: 'Urlaub' }, labels));
  assert.ok(!matchesFilter(row, { ...EMPTY_FILTER, tag: 'Büro' }, labels));
});

test('Eingabe und Filter gelten zusammen, nicht wahlweise', () => {
  const row = tx({ merchant: 'REWE', category: 'groceries' });
  const filter = { ...EMPTY_FILTER, query: 'rewe', category: 'travel' };
  assert.ok(!matchesFilter(row, filter, labels));
});

// ── Der Bereich ───────────────────────────────────────────────────────────────

const vorrat = [
  tx({ id: 'a', date: '2026-03-14', merchant: 'REWE',  amount: 80 }),
  tx({ id: 'b', date: '2026-01-09', merchant: 'REWE',  amount: 42 }),
  tx({ id: 'c', date: '2026-03-02', merchant: 'Kino',  amount: 15 }),
];

test('im Monatsbereich zählt nur der angezeigte Monat', () => {
  const found = applyFilter(vorrat, { ...EMPTY_FILTER, query: 'rewe' }, labels, '2026-03');
  assert.deepEqual(found.map((row) => row.id), ['a']);
});

test('über alle Monate hinweg wird der Vorrat nicht beschnitten', () => {
  const found = applyFilter(vorrat, { ...EMPTY_FILTER, query: 'rewe', scope: ALL_MONTHS }, labels, '2026-03');
  assert.deepEqual(found.map((row) => row.id).sort(), ['a', 'b']);
});

test('Archiviertes bleibt auch in der Suche draußen', () => {
  const rows = [...vorrat, tx({ id: 'weg', merchant: 'REWE', archived_at: '2026-03-20T10:00:00Z' })];
  const found = applyFilter(rows, { ...EMPTY_FILTER, query: 'rewe', scope: ALL_MONTHS }, labels, '2026-03');
  assert.ok(!found.some((row) => row.id === 'weg'));
});

// ── Was überhaupt angeboten wird ──────────────────────────────────────────────

test('angeboten wird nur, was vorkommt — häufigste Stichwörter zuerst', () => {
  const rows = [
    tx({ tags: ['Urlaub'], category: 'travel' }),
    tx({ tags: ['Urlaub'], category: 'travel' }),
    tx({ tags: ['Bar'],    category: 'groceries' }),
  ];
  const { tags, categories } = availableFacets(rows);

  assert.deepEqual(tags, ['Urlaub', 'Bar']);
  assert.deepEqual(categories.sort(), ['groceries', 'travel']);
});

test('ein Filter ohne Inhalt gilt nicht als gesetzt — der Bereich allein zählt nicht', () => {
  assert.equal(isFilterActive(EMPTY_FILTER), false);
  assert.equal(isFilterActive({ ...EMPTY_FILTER, scope: ALL_MONTHS }), false);
  assert.equal(isFilterActive({ ...EMPTY_FILTER, query: ' ' }), false);
  assert.equal(isFilterActive({ ...EMPTY_FILTER, query: 'rewe' }), true);
  assert.equal(isFilterActive({ ...EMPTY_FILTER, tag: 'Urlaub' }), true);
});
