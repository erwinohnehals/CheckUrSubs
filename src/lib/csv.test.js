import test from 'node:test';
import assert from 'node:assert/strict';
import {
  csvCell, toCSV, parseRows, parseCSV,
  EXPENSE_CSV_HEADERS, expenseCSVRows, expensesToCSV,
} from './csv.js';

test('quotes only the values that need it', () => {
  assert.equal(csvCell('Strom'), 'Strom');
  assert.equal(csvCell(''), '');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(12.5), '12.5');
  assert.equal(csvCell('Hauptstraße 5, Berlin'), '"Hauptstraße 5, Berlin"');
  assert.equal(csvCell('sagt "hallo"'), '"sagt ""hallo"""');
  assert.equal(csvCell('zwei\nZeilen'), '"zwei\nZeilen"');
});

test('reads a plain table', () => {
  const rows = parseCSV('name,price\nStrom,42\nInternet,30');

  assert.deepEqual(rows, [
    { name: 'Strom', price: '42' },
    { name: 'Internet', price: '30' },
  ]);
});

test('keeps commas inside quoted fields', () => {
  const rows = parseCSV('name,location\nStrom,"Hauptstraße 5, Berlin"');

  assert.deepEqual(rows, [{ name: 'Strom', location: 'Hauptstraße 5, Berlin' }]);
});

test('unescapes doubled quotes', () => {
  const rows = parseCSV('name,notes\nStrom,"sagt ""hallo"""');

  assert.equal(rows[0].notes, 'sagt "hallo"');
});

test('keeps line breaks inside quoted fields', () => {
  const rows = parseCSV('name,location\nStrom,"Hauptstraße 5\n10115 Berlin"\nGas,Berlin');

  assert.equal(rows.length, 2);
  assert.equal(rows[0].location, 'Hauptstraße 5\n10115 Berlin');
  assert.equal(rows[1].name, 'Gas');
});

test('survives CRLF, a trailing newline and blank lines', () => {
  const rows = parseCSV('name,price\r\nStrom,42\r\n\r\nGas,30\r\n');

  assert.deepEqual(rows, [
    { name: 'Strom', price: '42' },
    { name: 'Gas', price: '30' },
  ]);
});

test('strips the byte order mark Excel writes', () => {
  const rows = parseCSV('﻿name,price\nStrom,42');

  assert.deepEqual(Object.keys(rows[0]), ['name', 'price']);
});

test('pads rows that end early and ignores an empty file', () => {
  assert.deepEqual(parseCSV('name,price,url\nStrom,42'), [
    { name: 'Strom', price: '42', url: '' },
  ]);
  assert.deepEqual(parseCSV(''), []);
  assert.deepEqual(parseCSV('   '), []);
});

test('an empty quoted field stays empty', () => {
  assert.deepEqual(parseRows('a,"",c'), [['a', '', 'c']]);
});

// Der eigentliche Punkt: was der Export schreibt, muss der Import zurücklesen.
test('round-trips an export through the parser', () => {
  const headers = ['name', 'provider', 'price', 'location', 'notes'];
  const entries = [
    { name: 'Strom', provider: 'E.ON', price: 42, location: 'Hauptstraße 5, Berlin', notes: '' },
    { name: 'Haftpflicht', provider: 'HUK', price: 7.9, location: '', notes: 'sagt "hallo"' },
    { name: 'Miete', provider: '', price: 900, location: 'Hauptstraße 5\n10115 Berlin', notes: 'a,b' },
  ];

  const parsed = parseCSV(toCSV(headers, entries));

  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].location, 'Hauptstraße 5, Berlin');
  assert.equal(parsed[1].notes, 'sagt "hallo"');
  assert.equal(parsed[2].location, 'Hauptstraße 5\n10115 Berlin');
  assert.equal(parsed[2].notes, 'a,b');
  assert.equal(parsed[2].price, '900');
});

test('expense export emits one row per item and keeps the receipt identity', () => {
  const rows = expenseCSVRows([{
    id: 'receipt-1',
    direction: 'expense',
    date: '2026-07-26',
    title: 'Weekly shop',
    merchant: 'Market',
    account_id: 'bank',
    currency_code: 'EUR',
    amount: 12.5,
    category: 'groceries',
    items: [
      { id: 'item-1', label: 'Bread', amount: 2.5, category: null },
      { id: 'item-2', label: 'Pan', amount: 10, category: 'household' },
    ],
    tags: ['weekly', 'home'],
    note: 'Used a coupon',
    refund_for: null,
    archived_at: null,
  }]);

  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(row => row.receipt_id), ['receipt-1', 'receipt-1']);
  assert.deepEqual(rows.map(row => row.category), ['groceries', 'household']);
  assert.equal(rows[0].tags, 'weekly | home');

  const parsed = parseCSV(expensesToCSV([{
    ...rows[0],
    id: 'single-1',
    items: [],
    category: 'groceries',
    tags: ['weekly'],
  }]));
  assert.deepEqual(Object.keys(parsed[0]), EXPENSE_CSV_HEADERS);
  assert.equal(parsed[0].receipt_id, 'single-1');
});

test('the export says which rows are transfers', () => {
  const [transfer] = expenseCSVRows([{
    id: 'receipt-3', direction: 'income', date: '2026-07-20',
    title: 'Mein Geld', amount: 800, category: 'income_other',
    items: [], tags: [], internal: true,
  }]);
  const [purchase] = expenseCSVRows([{
    id: 'receipt-4', direction: 'expense', date: '2026-07-21',
    amount: 8, category: 'groceries', items: [], tags: [],
  }]);

  assert.equal(transfer.internal, 'true');
  assert.equal(purchase.internal, '');
});

test('an unsplit expense remains one CSV row', () => {
  const [row] = expenseCSVRows([{
    id: 'receipt-2',
    direction: 'expense',
    date: '2026-07-26',
    amount: 8,
    category: 'restaurant',
    items: [],
    tags: [],
  }]);

  assert.equal(row.receipt_id, 'receipt-2');
  assert.equal(row.item_id, '');
  assert.equal(row.amount, 8);
  assert.equal(row.category, 'restaurant');
});
