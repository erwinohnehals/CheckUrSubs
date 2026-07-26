import test from 'node:test';
import assert from 'node:assert/strict';
import { inMonth, groupByDay, monthSummary, knownTags } from './summary.js';

const transaction = (attributes) => ({
  id: 'x',
  direction: 'expense',
  title: '',
  merchant: '',
  date: '2026-07-04',
  category: 'other',
  currency_code: 'EUR',
  amount: 0,
  items: [],
  tags: [],
  created_at: '2026-07-04T10:00:00.000Z',
  archived_at: null,
  ...attributes,
});

test('inMonth keeps only the given month', () => {
  const rows = [
    transaction({ id: 'a', date: '2026-06-30' }),
    transaction({ id: 'b', date: '2026-07-01' }),
    transaction({ id: 'c', date: '2026-07-31' }),
    transaction({ id: 'd', date: '2026-08-01' }),
  ];

  assert.deepEqual(inMonth(rows, '2026-07').map(({ id }) => id), ['b', 'c']);
});

test('inMonth drops archived transactions', () => {
  const rows = [
    transaction({ id: 'a' }),
    transaction({ id: 'b', archived_at: '2026-07-05T00:00:00.000Z' }),
  ];

  assert.deepEqual(inMonth(rows, '2026-07').map(({ id }) => id), ['a']);
});

test('groupByDay orders days newest first and entries newest within a day', () => {
  const rows = [
    transaction({ id: 'a', date: '2026-07-02', created_at: '2026-07-02T08:00:00.000Z' }),
    transaction({ id: 'b', date: '2026-07-04', created_at: '2026-07-04T08:00:00.000Z' }),
    transaction({ id: 'c', date: '2026-07-04', created_at: '2026-07-04T19:00:00.000Z' }),
  ];

  const days = groupByDay(rows);
  assert.deepEqual(days.map(({ date }) => date), ['2026-07-04', '2026-07-02']);
  assert.deepEqual(days[0].transactions.map(({ id }) => id), ['c', 'b']);
});

test('groupByDay keeps spending and income apart', () => {
  const rows = [
    transaction({ id: 'a', amount: 24.9 }),
    transaction({ id: 'b', amount: 12.1 }),
    transaction({ id: 'c', direction: 'income', amount: 100 }),
  ];

  const [day] = groupByDay(rows);
  assert.equal(day.expense, 37);
  assert.equal(day.income, 100);
});

test('groupByDay converts through amountOf', () => {
  const rows = [transaction({ amount: 10, currency_code: 'CHF' })];
  const [day] = groupByDay(rows, (row) => row.amount * 2);

  assert.equal(day.expense, 20);
});

test('groupByDay ignores rows without a usable date', () => {
  const rows = [transaction({ id: 'a' }), transaction({ id: 'b', date: '' })];

  const days = groupByDay(rows);
  assert.equal(days.length, 1);
  assert.deepEqual(days[0].transactions.map(({ id }) => id), ['a']);
});

test('monthSummary reports out, in and what is left', () => {
  const rows = [
    transaction({ amount: 0.1 }),
    transaction({ amount: 0.2 }),
    transaction({ direction: 'income', amount: 1000 }),
  ];

  // Ohne Rundung stünde hier 999.6999999999999
  assert.deepEqual(monthSummary(rows), { expense: 0.3, income: 1000, net: 999.7 });
});

test('knownTags ranks by use, then alphabetically', () => {
  const rows = [
    transaction({ tags: ['Urlaub', 'Bar'] }),
    transaction({ tags: ['Urlaub'] }),
    transaction({ tags: ['Auto'] }),
  ];

  assert.deepEqual(knownTags(rows), ['Urlaub', 'Auto', 'Bar']);
});
