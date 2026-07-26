import test from 'node:test';
import assert from 'node:assert/strict';
import { createCarryover } from '../../lib/budget.js';
import { budgetRows, budgetTone, convertBudgets, NEAR_CAP } from './budgetRows.js';

const CATEGORIES = [
  { id: 'groceries', labelKey: 'xcat_groceries' },
  { id: 'dining',    labelKey: 'xcat_dining'    },
  { id: 'garden',    labelKey: 'xcat_garden'    },
];

// Standardmäßig beginnt die Grenze im betrachteten Monat — dann steht in der
// Zeile die Grenze selbst und kein Übertrag aus dem Nichts
const budget = (amount, since = '2026-02', reset = null) =>
  ({ amount, currency: 'EUR', since, reset });

const spentFrom = (table) => (category, month) => table[month]?.[category] ?? 0;

const rowsFor = (budgets, spent, month = '2026-02') => {
  const spentAt = spentFrom(spent);
  return budgetRows({
    budgets,
    carryover: createCarryover(budgets, spentAt),
    spentAt,
    month,
    categories: CATEGORIES,
  });
};

test('splits the categories into budgeted and unbudgeted', () => {
  const { budgeted, unbudgeted } = rowsFor(
    { groceries: budget(400) },
    { '2026-02': { groceries: 120, dining: 60 } },
  );

  assert.deepEqual(budgeted.map((row) => row.id), ['groceries']);
  assert.deepEqual(unbudgeted.map((row) => row.id), ['dining', 'garden']);
  assert.equal(budgeted[0].spent, 120);
  assert.equal(budgeted[0].remaining, 280);
});

test('a budgeted row carries the stored cap, not the folded one', () => {
  const { budgeted } = rowsFor(
    { groceries: budget(400, '2026-01') },
    { '2026-01': { groceries: 300 } },
  );

  assert.equal(budgeted[0].carry, 100);
  assert.equal(budgeted[0].available, 500);
  // Zum Ändern zählt, was eingetippt wurde — nicht das Verfügbare des Monats
  assert.equal(budgeted[0].budget.amount, 400);
  assert.equal(budgeted[0].budget.currency, 'EUR');
});

test('categories without a cap come along even without spending', () => {
  const { unbudgeted } = rowsFor({}, {});

  assert.equal(unbudgeted.length, 3);
  assert.deepEqual(unbudgeted.map((row) => row.spent), [0, 0, 0]);
});

test('a cap that only starts later is not a missing cap', () => {
  const { budgeted, unbudgeted } = rowsFor(
    { groceries: budget(400, '2026-05') },
    { '2026-02': { groceries: 90 } },
  );

  assert.equal(budgeted.length, 0);
  const row = unbudgeted.find((entry) => entry.id === 'groceries');
  assert.equal(row.startsAt, '2026-05');
  assert.equal(row.spent, 90);
});

test('a manual reset moves the start, and the month before it has no row', () => {
  const { unbudgeted } = rowsFor(
    { groceries: budget(400, '2026-01', '2026-06') },
    {},
    '2026-03',
  );

  assert.equal(unbudgeted.find((entry) => entry.id === 'groceries').startsAt, '2026-06');
});

test('the tightest budget sorts first, unbudgeted by what was spent', () => {
  const { budgeted, unbudgeted } = rowsFor(
    { groceries: budget(400), dining: budget(100) },
    { '2026-02': { groceries: 100, dining: 95, garden: 40 } },
  );

  assert.deepEqual(budgeted.map((row) => row.id), ['dining', 'groceries']);
  assert.deepEqual(unbudgeted.map((row) => row.id), ['garden']);
});

test('totals add up across the budgeted categories only', () => {
  const { totals } = rowsFor(
    { groceries: budget(400), dining: budget(100) },
    { '2026-02': { groceries: 300, dining: 120, garden: 500 } },
  );

  assert.equal(totals.count, 2);
  assert.equal(totals.available, 500);
  assert.equal(totals.spent, 420);
  assert.equal(totals.remaining, 80);
  assert.equal(totals.over, 1);           // dining liegt 20 darüber
  assert.equal(totals.ratio, 0.84);
});

test('an empty month has totals that do not divide by zero', () => {
  const { totals } = rowsFor({}, {});

  assert.equal(totals.count, 0);
  assert.equal(totals.ratio, 0);
  assert.equal(totals.tone, 'neutral');
});

test('the tone stays quiet until it gets tight', () => {
  assert.equal(budgetTone(0),            'neutral');
  assert.equal(budgetTone(0.5),          'neutral');
  assert.equal(budgetTone(NEAR_CAP),     'warning');
  assert.equal(budgetTone(0.99),         'warning');
  assert.equal(budgetTone(1),            'error');
  assert.equal(budgetTone(1.4),          'error');
  // Übertrag ins Minus: nichts verfügbar, trotzdem ausgegeben
  assert.equal(budgetTone(Infinity),     'error');
});

test('an over-budget row is marked, and its bar takes the error tone', () => {
  const { budgeted } = rowsFor(
    { groceries: budget(400) },
    { '2026-02': { groceries: 470 } },
  );

  assert.equal(budgeted[0].over, true);
  assert.equal(budgeted[0].tone, 'error');
  assert.equal(budgeted[0].remaining, -70);
});

test('caps move into the common unit without touching the stored ones', () => {
  const rate      = (currency) => (currency === 'CHF' ? 0.88 : 0.92);
  const stored    = { groceries: budget(400), dining: { amount: 100, currency: 'CHF', since: '2026-01' } };
  const converted = convertBudgets(stored, (amount, currency) => amount / rate(currency));

  // Nicht auf Cent gerundet: der Rückweg muss die Grenze auf weniger als einen
  // halben Cent genau treffen, sonst stünde eine Grenze von 400 € als
  // „399,99 €“ auf dem Schirm — das ist die Schwelle, ab der fmtMoney rundet
  const backInEuro = (row, currency) => Math.abs(row.amount * rate(currency) - row.expected);
  assert.ok(backInEuro({ ...converted.groceries, expected: 400 }, 'EUR') < 0.005);
  assert.ok(backInEuro({ ...converted.dining,    expected: 100 }, 'CHF') < 0.005);
  assert.equal(converted.dining.since, '2026-01');
  assert.equal(stored.groceries.amount, 400);
});
