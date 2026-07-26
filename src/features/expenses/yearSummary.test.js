import test from 'node:test';
import assert from 'node:assert/strict';
import { buildYearReport, recurringInMonth } from './yearSummary.js';

const entry = (attributes = {}) => ({
  id: 'contract',
  price: 10,
  period: 'monthly',
  date: '5',
  status: 'active',
  created_at: '2025-01-01T00:00:00.000Z',
  archived_at: null,
  ...attributes,
});

const transaction = (attributes = {}) => ({
  id: 'transaction',
  direction: 'expense',
  title: 'Purchase',
  date: '2026-03-04',
  category: 'other',
  amount: 0,
  items: [],
  archived_at: null,
  ...attributes,
});

test('recurringInMonth places monthly and yearly charges in their actual months', () => {
  const entries = [
    entry({ id: 'monthly', price: 20 }),
    entry({ id: 'yearly', price: 120, period: 'yearly', date: '8 Mar' }),
  ];

  assert.equal(recurringInMonth(entries, 2026, 1), 20);
  assert.equal(recurringInMonth(entries, 2026, 2), 140);
});

test('recurringInMonth respects lifecycle, billing status and usable dates', () => {
  const entries = [
    entry({ id: 'started', price: 10, contract_start: '2026-06-12' }),
    entry({ id: 'ended', price: 20, contract_end: '2026-03-31', auto_renew: false }),
    entry({ id: 'paused', price: 30, status: 'paused' }),
    entry({ id: 'undated', price: 40, date: '' }),
  ];

  assert.equal(recurringInMonth(entries, 2026, 1), 20);
  assert.equal(recurringInMonth(entries, 2026, 6), 10);
});

test('buildYearReport reconciles its totals against the twelve displayed months', () => {
  const report = buildYearReport({
    year: 2026,
    entries: [
      entry({ id: 'monthly', price: 10 }),
      entry({ id: 'yearly', price: 60, period: 'yearly', date: '2 Jul' }),
    ],
    transactions: [
      transaction({ id: 'food', amount: 25 }),
      transaction({ id: 'salary', direction: 'income', amount: 500 }),
      transaction({ id: 'later', date: '2027-03-04', amount: 999 }),
      transaction({ id: 'archived', amount: 999, archived_at: '2026-04-01T00:00:00.000Z' }),
    ],
  });

  const fromMonths = report.months.reduce((sum, month) => ({
    fixed: sum.fixed + month.fixed,
    oneOff: sum.oneOff + month.oneOff,
    income: sum.income + month.income,
  }), { fixed: 0, oneOff: 0, income: 0 });

  assert.deepEqual(fromMonths, {
    fixed: report.totals.fixed,
    oneOff: report.totals.oneOff,
    income: report.totals.income,
  });
  assert.deepEqual(report.totals, {
    fixed: 180,
    oneOff: 25,
    income: 500,
    out: 205,
    left: 295,
  });
});

test('buildYearReport uses item category overrides and converted amounts', () => {
  const split = transaction({
    amount: 30,
    currency_code: 'CHF',
    category: 'household',
    items: [
      { id: 'a', label: 'Paint', amount: 20, category: null },
      { id: 'b', label: 'Plant', amount: 10, category: 'garden' },
    ],
  });

  const report = buildYearReport({
    year: 2026,
    transactions: [
      split,
      transaction({ id: 'large', title: 'Laptop', amount: 80 }),
    ],
    transactionAmount: (amount) => amount * 2,
  });

  assert.deepEqual(report.categories, [
    { category: 'other', amount: 160 },
    { category: 'household', amount: 40 },
    { category: 'garden', amount: 20 },
  ]);
  assert.deepEqual(report.purchases.map(({ transaction: row, amount }) => [row.id, amount]), [
    ['large', 160],
    ['transaction', 60],
  ]);
});
