import test from 'node:test';
import assert from 'node:assert/strict';
import { createBudgetStore, createCarryover, spendIndex, foldStart } from './budget.js';
import { createExpenseStore } from './expenseStore.js';

const createMemoryStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
};

// Ausgaben als { '2026-02': { groceries: 380 } } — kürzer als echte Vorgänge,
// solange es nur um die Faltung geht
const spentFrom = (table) => (category, month) => table[month]?.[category] ?? 0;

const groceries = (amount, since = '2026-01', reset = null) =>
  ({ groceries: { amount, currency: 'EUR', since, reset } });

test('the first month has no carryover — the cap is all there is', () => {
  const fold = createCarryover(groceries(400), spentFrom({ '2026-01': { groceries: 312 } }));
  const status = fold.statusFor('groceries', '2026-01');

  assert.equal(status.cap, 400);
  assert.equal(status.carry, 0);
  assert.equal(status.available, 400);
  assert.equal(status.spent, 312);
  assert.equal(status.remaining, 88);
});

test('what is left over rolls into the next month', () => {
  const fold = createCarryover(groceries(400), spentFrom({
    '2026-01': { groceries: 362 },
  }));

  const february = fold.statusFor('groceries', '2026-02');
  assert.equal(february.carry, 38);
  assert.equal(february.available, 438);
  assert.equal(february.remaining, 438);
});

test('overspending eats into the following month', () => {
  const fold = createCarryover(groceries(400), spentFrom({
    '2026-01': { groceries: 470 },
  }));

  const february = fold.statusFor('groceries', '2026-02');
  assert.equal(february.carry, -70);
  assert.equal(february.available, 330);
});

test('the fold runs across every month in between, not just the last one', () => {
  const fold = createCarryover(groceries(400), spentFrom({
    '2026-01': { groceries: 350 },   // 400 verfügbar, 50 übrig
    '2026-02': { groceries: 300 },   // 450 verfügbar, 150 übrig
    '2026-03': { groceries: 500 },   // 550 verfügbar, 50 übrig
  }));

  assert.equal(fold.statusFor('groceries', '2026-02').available, 450);
  assert.equal(fold.statusFor('groceries', '2026-03').available, 550);
  assert.equal(fold.statusFor('groceries', '2026-04').available, 450);
});

test('the fold does not reset in January', () => {
  const fold = createCarryover(groceries(100, '2025-11'), spentFrom({
    '2025-11': { groceries: 0 },
    '2025-12': { groceries: 0 },
  }));

  assert.equal(fold.statusFor('groceries', '2026-01').available, 300);
});

test('months before the cap was set have no budget at all', () => {
  const fold = createCarryover(groceries(400, '2026-03'), () => 0);

  assert.equal(fold.statusFor('groceries', '2026-02'), null);
  assert.equal(fold.statusFor('groceries', '2026-03').available, 400);
  assert.equal(fold.statusFor('dining', '2026-03'), null);
});

test('a manual reset starts the carryover over without touching the cap', () => {
  const spent = spentFrom({ '2026-01': { groceries: 0 }, '2026-02': { groceries: 0 } });

  assert.equal(createCarryover(groceries(400), spent).statusFor('groceries', '2026-03').available, 1200);

  const afterReset = createCarryover(groceries(400, '2026-01', '2026-03'), spent);
  assert.equal(afterReset.statusFor('groceries', '2026-03').available, 400);
  assert.equal(afterReset.statusFor('groceries', '2026-02'), null);
  assert.equal(foldStart({ since: '2026-01', reset: '2026-03' }), '2026-03');
});

test('reports how much of the available amount is already gone', () => {
  const fold = createCarryover(groceries(400), spentFrom({ '2026-01': { groceries: 300 } }));

  assert.equal(fold.statusFor('groceries', '2026-01').ratio, 0.75);
  assert.equal(fold.statusFor('groceries', '2026-04').ratio, 0);
});

test('answers repeatedly without recomputing the chain', () => {
  let calls = 0;
  const fold = createCarryover(groceries(400, '2020-01'), () => { calls += 1; return 100; });

  fold.statusFor('groceries', '2026-01');
  const afterFirst = calls;
  fold.statusFor('groceries', '2026-01');

  assert.equal(calls, afterFirst + 1);   // nur noch der Monat selbst
});

test('counts what was spent per category and month, income excluded', () => {
  const store = createExpenseStore(createMemoryStorage(), (() => {
    let n = 0;
    return () => `local-${++n}`;
  })());

  store.create({
    title: 'Wocheneinkauf', date: '2026-02-03', category: 'groceries',
    items: [
      { label: 'Brot',       amount: 12 },
      { label: 'Blumenerde', amount: 30, category: 'garden' },
    ],
  });
  store.create({ title: 'REWE',   date: '2026-02-17', category: 'groceries', amount: 40 });
  store.create({ title: 'REWE',   date: '2026-03-02', category: 'groceries', amount: 25 });
  store.create({ title: 'Gehalt', date: '2026-02-28', direction: 'income',
    category: 'income_salary', amount: 2400 });

  const archived = store.create({ title: 'Storniert', date: '2026-02-20',
    category: 'groceries', amount: 500 });
  store.update(archived.id, { archived_at: '2026-02-21T09:00:00.000Z' });

  const spend = spendIndex(store.list());

  assert.equal(spend.at('groceries', '2026-02'), 52);
  assert.equal(spend.at('garden',    '2026-02'), 30);
  assert.equal(spend.at('groceries', '2026-03'), 25);
  assert.equal(spend.at('income_salary', '2026-02'), 0);
  assert.deepEqual(spend.months(), ['2026-02', '2026-03']);
});

test('income never moves a budget', () => {
  const store = createExpenseStore(createMemoryStorage());
  store.create({ title: 'Gehalt', date: '2026-01-31', direction: 'income',
    category: 'income_salary', amount: 2400 });
  store.create({ title: 'REWE', date: '2026-01-05', category: 'groceries', amount: 380 });

  const fold = createCarryover(groceries(400), spendIndex(store.list()).at);
  assert.equal(fold.statusFor('groceries', '2026-02').carry, 20);
});

test('stores a cap, keeps its start month across edits, and drops it at zero', () => {
  const storage = createMemoryStorage();
  const budgets = createBudgetStore(storage);

  budgets.set('groceries', { amount: '400' }, '2026-01');
  assert.equal(budgets.get('groceries').amount, 400);
  assert.equal(budgets.get('groceries').since, '2026-01');

  budgets.set('groceries', { amount: 450 }, '2026-06');
  assert.equal(budgets.get('groceries').since, '2026-01');
  assert.equal(budgets.get('groceries').amount, 450);

  assert.equal(budgets.set('groceries', { amount: 0 }), null);
  assert.deepEqual(createBudgetStore(storage).all(), {});
});

test('records a carryover reset on the stored budget', () => {
  const budgets = createBudgetStore(createMemoryStorage());
  budgets.set('dining', { amount: 120 }, '2026-01');

  budgets.resetCarryover('dining', '2026-05');
  assert.equal(budgets.get('dining').reset, '2026-05');
  assert.equal(budgets.get('dining').amount, 120);
  assert.equal(budgets.resetCarryover('travel', '2026-05'), null);
});

test('treats malformed persisted budgets as none', () => {
  assert.deepEqual(
    createBudgetStore(createMemoryStorage({ 'goldgeld.budgets': '{not-json' })).all(),
    {},
  );
  assert.deepEqual(
    createBudgetStore(createMemoryStorage({ 'goldgeld.budgets': '[1,2]' })).all(),
    {},
  );
});
