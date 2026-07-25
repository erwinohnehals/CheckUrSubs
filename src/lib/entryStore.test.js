import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntryStore, isBilled } from './entryStore.js';

const createMemoryStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
};

const createStore = (storage = createMemoryStorage()) => {
  let nextId = 0;
  return createEntryStore(storage, () => `local-${++nextId}`);
};

test('starts empty when no local data exists', () => {
  assert.deepEqual(createStore().list(), []);
});

test('creates and reloads a normalized entry', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);

  const created = store.create({
    name: 'Music',
    price: '12.50',
    currency_code: 'EUR',
    date: '24 Jul',
  });

  assert.equal(created.id, 'local-1');
  assert.equal(created.price, 12.5);
  assert.equal(created.period, 'monthly');
  assert.equal(created.auto_renew, true);

  const reloadedStore = createStore(storage);
  assert.deepEqual(reloadedStore.list(), [created]);
});

test('updates, removes, and restores through the storage interface', () => {
  const store = createStore();
  const created = store.create({ name: 'Music', price: 10 });

  const updated = store.update(created.id, { price: 15, status: 'paused' });
  assert.equal(updated.price, 15);
  assert.equal(store.list()[0].status, 'paused');

  const removed = store.remove(created.id);
  assert.equal(removed.id, created.id);
  assert.deepEqual(store.list(), []);

  store.restore(removed);
  assert.equal(store.list()[0].id, created.id);
});

test('keeps known statuses and falls back to active for anything else', () => {
  const store = createStore();
  const canceled = store.create({ name: 'Gym', price: 30, status: 'canceled' });

  assert.equal(canceled.status, 'canceled');
  assert.equal(isBilled(canceled), false);
  assert.equal(store.list()[0].status, 'canceled');

  assert.equal(store.create({ name: 'Water', status: 'cancelled' }).status, 'active');
  assert.equal(store.create({ name: 'Power' }).status, 'active');
  assert.equal(isBilled({ name: 'Power' }), true);
});

test('imports new rows while skipping duplicates', () => {
  const store = createStore();
  store.create({ name: 'Music', price: 10, period: 'monthly' });

  const imported = store.importRows([
    { name: 'Music', price: 10, period: 'monthly' },
    { name: 'Cloud', price: 5, period: 'monthly' },
  ]);

  assert.equal(imported.length, 1);
  assert.equal(imported[0].name, 'Cloud');
  assert.deepEqual(store.list().map(({ name }) => name), ['Music', 'Cloud']);
});

test('keeps contract, access, and custom field data', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);

  store.create({
    name: 'Stromvertrag',
    price: 89,
    category: 'energy',
    provider: 'E.ON',
    contract_end: '2027-03-31',
    notice_period_months: 3,
    auto_renew: false,
    url: 'https://mein.eon.de',
    login_username: 'max@example.de',
    login_secret: 'v1.aaa.bbb',
    fields: { zaehlernummer: '1ESY123', consumption_last_year: 2450, empty: '' },
    custom: [{ label: 'Ableseportal', value: 'portal.eon.de', type: 'url' }],
    notes: 'Abschlag zum 1.',
  });

  const [entry] = createStore(storage).list();

  assert.equal(entry.provider, 'E.ON');
  assert.equal(entry.notice_period_months, 3);
  assert.equal(entry.auto_renew, false);
  assert.equal(entry.login_secret, 'v1.aaa.bbb');
  assert.deepEqual(entry.fields, { zaehlernummer: '1ESY123', consumption_last_year: '2450' });
  assert.equal(entry.custom[0].label, 'Ableseportal');
  assert.equal(entry.custom[0].id, 'local-2');
});

test('migrates subscriptions saved by the previous app version', () => {
  const storage = createMemoryStorage({
    'checkursubs.subscriptions': JSON.stringify({
      version: 1,
      subscriptions: [
        { id: 'old-1', name: 'Vodafone', price: 30, category: 'telecom', created_at: '2024-01-01T00:00:00.000Z' },
      ],
    }),
  });

  const [entry] = createStore(storage).list();

  assert.equal(entry.id, 'old-1');
  assert.equal(entry.category, 'mobile');
  assert.match(storage.getItem('goldgeld.entries'), /"version":3/);
});

test('derives the kind from the category and keeps an explicit override', () => {
  const store = createStore();

  assert.equal(store.create({ name: 'Strom', category: 'energy' }).kind, 'fixed');
  assert.equal(store.create({ name: 'Netflix', category: 'entertainment' }).kind, 'abo');
  assert.equal(store.create({ name: 'Handy', category: 'mobile', kind: 'abo' }).kind, 'abo');
  assert.equal(store.create({ name: 'Sonstiges', kind: 'nonsense' }).kind, 'abo');
});

test('stores the address as a single trimmed line', () => {
  const store = createStore();
  const created = store.create({ name: 'Miete', location: '  Hauptstraße 5\n10115 Berlin ' });

  assert.equal(created.location, 'Hauptstraße 5, 10115 Berlin');
  assert.equal(store.create({ name: 'Netflix' }).location, '');
});

test('takes the address from contract fields when upgrading older data', () => {
  const storage = createMemoryStorage({
    'goldgeld.entries': JSON.stringify({
      version: 2,
      entries: [
        { id: 'a', name: 'Stromvertrag', category: 'energy',
          fields: { supply_address: 'Hauptstraße 5\n10115 Berlin' }, created_at: '2024-01-01T00:00:00.000Z' },
        { id: 'b', name: 'Netflix', category: 'entertainment', created_at: '2024-01-02T00:00:00.000Z' },
      ],
    }),
  });

  const entries = createStore(storage).list();

  assert.equal(entries[0].location, 'Hauptstraße 5, 10115 Berlin');
  assert.equal(entries[1].location, '');
  assert.match(storage.getItem('goldgeld.entries'), /"version":3/);
});

test('treats malformed persisted data as empty', () => {
  const storage = createMemoryStorage({
    'goldgeld.entries': '{not-json',
  });

  assert.deepEqual(createStore(storage).list(), []);
});
