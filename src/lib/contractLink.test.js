import test from 'node:test';
import assert from 'node:assert/strict';

import { entryLinkKey } from './bankRules.js';
import { chargeDrift, lastLinkedCharge, suggestEntryLink } from './contractLink.js';

const row = (attributes = {}) => ({
  merchant: 'freenet DLS GmbH', creditor_id: '', ...attributes,
});

const entry = (attributes = {}) => ({
  id: 'e1', name: 'Internet Zuhause', provider: 'freenet DLS GmbH',
  price: 37.99, currency_code: 'EUR', archived_at: null, ...attributes,
});

test('ein eindeutiger Anbietertreffer wird vorgeschlagen', () => {
  const result = suggestEntryLink(row(), [entry()]);
  assert.equal(result.entryId, 'e1');
  assert.equal(result.confidence, 'medium');
  assert.equal(result.reason, 'provider');
});

test('zwei Verträge desselben Anbieters bleiben unverknüpft', () => {
  const result = suggestEntryLink(row(), [
    entry({ id: 'e1' }),
    entry({ id: 'e2', name: 'Mobilfunk' }),
  ]);
  assert.equal(result, null);
});

test('ohne Anbieterfeld greift der eigene Name des Vertrags', () => {
  const result = suggestEntryLink(row({ merchant: 'Vodafone GmbH' }), [
    entry({ id: 'e2', name: 'Vodafone GmbH', provider: '' }),
  ]);
  assert.equal(result.entryId, 'e2');
  assert.equal(result.reason, 'name');
});

test('Gelerntes schlägt den Namenstreffer', () => {
  const learned = { [entryLinkKey(row({ creditor_id: 'DE43ZZZ001' }))]: 'e9' };
  const result = suggestEntryLink(
    row({ creditor_id: 'DE43ZZZ001' }),
    [entry({ id: 'e9' }), entry({ id: 'e1' })],
    learned,
  );

  assert.equal(result.entryId, 'e9');
  assert.equal(result.confidence, 'high');
  assert.equal(result.reason, 'learned');
});

test('ein gelöschter Vertrag hinterlässt keinen Geisterbezug', () => {
  const learned = { [entryLinkKey(row())]: 'e-gone' };
  const result = suggestEntryLink(row(), [entry({ id: 'e1' })], learned);
  assert.equal(result.entryId, 'e1');
  assert.equal(result.reason, 'provider');
});

test('archivierte Verträge werden nicht mehr vorgeschlagen', () => {
  const result = suggestEntryLink(row(), [entry({ archived_at: '2026-01-01' })]);
  assert.equal(result, null);
});

test('ohne Händlernamen gibt es keinen Vorschlag', () => {
  assert.equal(suggestEntryLink(row({ merchant: '' }), [entry()]), null);
});

test('die jüngste verknüpfte Ausgabe gewinnt', () => {
  const transactions = [
    { entry_id: 'e1', date: '2026-05-14', amount: 37.99, archived_at: null, internal: false },
    { entry_id: 'e1', date: '2026-06-14', amount: 39.99, archived_at: null, internal: false },
    { entry_id: 'e2', date: '2026-07-14', amount: 9.99,  archived_at: null, internal: false },
  ];

  const charge = lastLinkedCharge('e1', transactions);
  assert.equal(charge.date, '2026-06-14');
  assert.equal(charge.amount, 39.99);
});

test('eine Umbuchung zählt nicht als Abbuchung des Vertrags', () => {
  const transactions = [
    { entry_id: 'e1', date: '2026-06-14', amount: 39.99, archived_at: null, internal: true },
  ];
  assert.equal(lastLinkedCharge('e1', transactions), null);
});

test('eine Preisabweichung wird erkannt', () => {
  const diff = chargeDrift(entry({ price: 37.99 }), { amount: 39.99, currency_code: 'EUR' });
  assert.equal(diff, 2);
});

test('unterschiedliche Währungen werden nicht verglichen', () => {
  const diff = chargeDrift(entry({ currency_code: 'EUR' }), { amount: 39.99, currency_code: 'CHF' });
  assert.equal(diff, null);
});

test('kein Unterschied ist keine Abweichung', () => {
  const diff = chargeDrift(entry({ price: 37.99 }), { amount: 37.99, currency_code: 'EUR' });
  assert.equal(diff, null);
});
