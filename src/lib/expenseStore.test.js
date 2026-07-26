import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createExpenseStore, categoryBreakdown, parseAmount, isCounted, repeatTransactionDraft,
} from './expenseStore.js';

const createMemoryStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
};

const createStore = (storage = createMemoryStorage()) => {
  let nextId = 0;
  return createExpenseStore(storage, () => `local-${++nextId}`);
};

test('repeat drafts use today and shed identities from the old transaction', () => {
  const original = {
    id: 'expense-1',
    direction: 'income',
    title: 'Refund',
    date: '2026-07-01',
    amount: 12,
    items: [{ id: 'item-1', label: 'Part', amount: 12, category: null }],
    refund_for: 'purchase-1',
    created_at: '2026-07-01T08:00:00.000Z',
    archived_at: '2026-07-02T08:00:00.000Z',
  };

  const draft = repeatTransactionDraft(original, new Date('2026-07-26T14:00:00Z'));

  assert.equal(draft.id, undefined);
  assert.equal(draft.date, '2026-07-26');
  assert.equal(draft.items[0].id, undefined);
  assert.equal(draft.amount, 12);
  assert.equal(draft.refund_for, null);
  assert.equal(draft.created_at, undefined);
  assert.equal(draft.archived_at, null);
  assert.equal(original.items[0].id, 'item-1');
});

test('starts empty when no local data exists', () => {
  assert.deepEqual(createStore().list(), []);
});

test('creates and reloads a normalized transaction', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);

  const created = store.create({
    title: 'OBI',
    merchant: 'OBI Baumarkt',
    amount: '24,90',
    date: '2026-07-04',
    category: 'garden',
  });

  assert.equal(created.id, 'local-1');
  assert.equal(created.direction, 'expense');
  assert.equal(created.amount, 24.9);
  assert.equal(created.currency_code, 'EUR');
  assert.deepEqual(created.items, []);
  assert.equal(created.archived_at, null);

  assert.deepEqual(createStore(storage).list(), [created]);
});

test('reads amounts the way they are typed on either side of the channel', () => {
  assert.equal(parseAmount('12,50'), 12.5);
  assert.equal(parseAmount('12.50'), 12.5);
  assert.equal(parseAmount('1.234,56'), 1234.56);
  assert.equal(parseAmount('1,234.56'), 1234.56);
  assert.equal(parseAmount('1,234'), 1234);
  assert.equal(parseAmount(7), 7);
  assert.equal(parseAmount(''), 0);
  assert.equal(parseAmount('keine Zahl'), 0);
  assert.equal(parseAmount(undefined), 0);
});

test('keeps a date as a plain calendar day, whatever the input looked like', () => {
  const store = createStore();

  assert.equal(store.create({ title: 'A', date: '2026-03-08' }).date, '2026-03-08');
  assert.equal(store.create({ title: 'B', date: '2026-03-08T23:30:00.000Z' }).date, '2026-03-08');
  assert.equal(
    store.create({ title: 'C', created_at: '2025-12-24T10:00:00.000Z' }).date,
    '2025-12-24',
  );
});

test('recomputes the amount from the line items on every write', () => {
  const store = createStore();

  const created = store.create({
    title: 'Wocheneinkauf',
    amount: 999,                       // gelogen — die Positionen entscheiden
    category: 'groceries',
    items: [
      { label: 'Brot',  amount: '2,49' },
      { label: 'Käse',  amount: '5,90' },
      { label: 'Blumenerde', amount: '9,99', category: 'garden' },
    ],
  });

  assert.equal(created.amount, 18.38);

  const updated = store.update(created.id, {
    amount: 1,
    items: [...created.items, { label: 'Pfand', amount: '-0,25' }],
  });

  assert.equal(updated.amount, 18.13);
  assert.equal(store.list()[0].amount, 18.13);
});

test('drops line items that carry neither a label nor an amount', () => {
  const store = createStore();
  const created = store.create({
    title: 'Bon',
    items: [{ label: 'Brot', amount: 2 }, { label: '', amount: '' }, {}],
  });

  assert.equal(created.items.length, 1);
  assert.equal(created.amount, 2);
});

test('adds up the cents instead of the floats', () => {
  const store = createStore();
  const created = store.create({
    title: 'Kiosk',
    items: [{ label: 'a', amount: 0.1 }, { label: 'b', amount: 0.2 }],
  });

  assert.equal(created.amount, 0.3);
});

test('falls back to the transaction category and lets an item override it', () => {
  const single = { category: 'groceries', amount: 12, items: [] };
  assert.deepEqual(categoryBreakdown(single), [{ category: 'groceries', amount: 12 }]);

  const receipt = {
    category: 'groceries',
    amount: 20,
    items: [
      { label: 'Brot',       amount: 5,  category: null },
      { label: 'Milch',      amount: 5,  category: null },
      { label: 'Blumenerde', amount: 10, category: 'garden' },
    ],
  };

  assert.deepEqual(categoryBreakdown(receipt), [
    { category: 'groceries', amount: 10 },
    { category: 'garden',    amount: 10 },
  ]);
});

test('breaks a transaction down into as much as it is worth, and no more', () => {
  const receipt = {
    category: 'household',
    items: [
      { label: 'a', amount: 3.33, category: 'tech' },
      { label: 'b', amount: 3.33 },
      { label: 'c', amount: 3.34 },
    ],
  };

  const total = categoryBreakdown(receipt).reduce((sum, row) => sum + row.amount, 0);
  assert.equal(Math.round(total * 100) / 100, 10);
  assert.deepEqual(categoryBreakdown(null), []);
});

test('keeps expense and income categories on their own side', () => {
  const store = createStore();

  assert.equal(store.create({ title: 'Bon', category: 'groceries' }).category, 'groceries');
  assert.equal(store.create({ title: 'Bon', category: 'income_salary' }).category, 'other');
  assert.equal(store.create({ title: 'Bon' }).category, 'other');

  const income = store.create({ direction: 'income', title: 'Gehalt', category: 'income_salary' });
  assert.equal(income.category, 'income_salary');
  assert.equal(store.create({ direction: 'income', title: 'X', category: 'groceries' }).category, 'income_other');
});

test('links a refund to the purchase it offsets, but only on the income side', () => {
  const store = createStore();

  const purchase = store.create({ title: 'Schuhe', amount: 89, category: 'clothing' });
  const refund = store.create({
    direction: 'income',
    title: 'Rücksendung',
    amount: 89,
    category: 'income_refund',
    refund_for: purchase.id,
  });

  assert.equal(refund.refund_for, purchase.id);
  assert.equal(store.create({ title: 'X', refund_for: purchase.id }).refund_for, null);
});

test('updates, removes, and restores through the storage interface', () => {
  const store = createStore();
  const created = store.create({ title: 'Kino', amount: 14, category: 'leisure' });

  const updated = store.update(created.id, { amount: 16, note: 'mit Popcorn' });
  assert.equal(updated.amount, 16);
  assert.equal(store.list()[0].note, 'mit Popcorn');

  const removed = store.remove(created.id);
  assert.equal(removed.id, created.id);
  assert.deepEqual(store.list(), []);

  store.restore(removed);
  assert.equal(store.list()[0].id, created.id);
});

test('archives without losing the transaction', () => {
  const store = createStore();
  const created = store.create({ title: 'Alt', amount: 5 });

  const archived = store.update(created.id, { archived_at: '2026-07-25T12:00:00.000Z' });
  assert.equal(isCounted(archived), false);
  assert.equal(isCounted(store.update(created.id, { archived_at: null })), true);
});

test('keeps tags trimmed, unique and free of blanks', () => {
  const store = createStore();
  const created = store.create({ title: 'Reise', tags: ['  Urlaub ', 'Urlaub', '', 'Bahn'] });

  assert.deepEqual(created.tags, ['Urlaub', 'Bahn']);
});

test('sorts by the day the money moved', () => {
  const store = createStore();
  store.create({ title: 'C', date: '2026-07-20' });
  store.create({ title: 'A', date: '2026-07-01' });
  store.create({ title: 'B', date: '2026-07-14' });

  assert.deepEqual(store.list().map(({ title }) => title), ['A', 'B', 'C']);
});

test('returns a transaction ID only once when the same save is repeated', () => {
  const store = createStore();
  const row = { id: 'same', title: 'REWE', amount: 32.4, date: '2026-07-02' };

  store.create(row);
  store.create(row);

  assert.deepEqual(store.list().map(({ id }) => id), ['same']);
});

test('repairs duplicate IDs already present in storage', () => {
  const repeated = { id: 'same', title: 'REWE', amount: 32.4, date: '2026-07-02' };
  const storage = createMemoryStorage({
    'goldgeld.expenses': JSON.stringify({ version: 1, transactions: [repeated, repeated] }),
  });

  assert.deepEqual(createStore(storage).list().map(({ id }) => id), ['same']);
  assert.equal(JSON.parse(storage.getItem('goldgeld.expenses')).transactions.length, 1);
});

test('imports new rows while skipping duplicates', () => {
  const store = createStore();
  store.create({ title: 'REWE', merchant: 'REWE', amount: 32.4, date: '2026-07-02' });

  const imported = store.importRows([
    { title: 'REWE', merchant: 'REWE', amount: 32.4, date: '2026-07-02' },
    { title: 'DM',   merchant: 'DM',   amount: 8.5,  date: '2026-07-03' },
  ]);

  assert.equal(imported.length, 1);
  assert.equal(imported[0].title, 'DM');
  assert.deepEqual(store.list().map(({ title }) => title), ['REWE', 'DM']);
});

test('replaces everything with the state of a backup', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  store.create({ title: 'Weg damit', amount: 1 });

  store.replaceAll([{ id: 'from-backup', title: 'Gehalt', direction: 'income', amount: 2400 }]);

  assert.deepEqual(createStore(storage).list().map(({ id }) => id), ['from-backup']);
});

test('treats malformed persisted data as empty', () => {
  assert.deepEqual(
    createStore(createMemoryStorage({ 'goldgeld.expenses': '{not-json' })).list(),
    [],
  );
});
