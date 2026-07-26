import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountStore } from './accountStore.js';

const createMemoryStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
};

const createStore = (storage = createMemoryStorage()) => {
  let nextId = 0;
  return createAccountStore(storage, () => `local-${++nextId}`);
};

test('starts empty and seeds cash plus a bank account once', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  assert.deepEqual(store.list(), []);

  const seeded = store.ensureSeeded({ cash: 'Bargeld', bank: 'Girokonto' });
  assert.deepEqual(seeded.map(({ id, label, kind }) => ({ id, label, kind })), [
    { id: 'cash', label: 'Bargeld',   kind: 'cash' },
    { id: 'bank', label: 'Girokonto', kind: 'bank' },
  ]);

  store.update('bank', { label: 'DKB Giro' });
  store.ensureSeeded({ cash: 'Cash', bank: 'Current account' });
  assert.deepEqual(createStore(storage).list().map(({ label }) => label), ['Bargeld', 'DKB Giro']);
});

test('renames, archives and restores', () => {
  const store = createStore();
  const created = store.create({ label: 'PayPal', kind: 'online' });

  assert.equal(store.update(created.id, { label: 'PayPal privat' }).label, 'PayPal privat');

  store.archive(created.id);
  assert.deepEqual(store.active(), []);
  assert.equal(store.list().length, 1);

  store.restore(created.id);
  assert.deepEqual(store.active().map(({ label }) => label), ['PayPal privat']);
});

test('refuses an account without a name and falls back to a known kind', () => {
  const store = createStore();

  assert.equal(store.create({ label: '   ' }), null);
  assert.equal(store.create({ label: 'Sparkasse', kind: 'erfunden' }).kind, 'bank');
  assert.deepEqual(store.list().map(({ label }) => label), ['Sparkasse']);
});

test('treats malformed persisted data as empty', () => {
  assert.deepEqual(
    createStore(createMemoryStorage({ 'goldgeld.accounts': '{not-json' })).list(),
    [],
  );
});
