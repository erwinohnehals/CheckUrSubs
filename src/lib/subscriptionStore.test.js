import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubscriptionStore } from './subscriptionStore.js';

const createMemoryStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
};

const createStore = (storage = createMemoryStorage()) => {
  let nextId = 0;
  return createSubscriptionStore(storage, () => `local-${++nextId}`);
};

test('starts empty when no local data exists', () => {
  assert.deepEqual(createStore().list(), []);
});

test('creates and reloads a normalized subscription', () => {
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

test('treats malformed persisted data as empty', () => {
  const storage = createMemoryStorage({
    'checkursubs.subscriptions': '{not-json',
  });

  assert.deepEqual(createStore(storage).list(), []);
});
