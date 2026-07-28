import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasMeter, meterUnit, parseReadingValue, normalizeReadings,
  meterSeries, meterSummary, fmtQuantity,
} from './meterReadings.js';

test('only metered categories carry readings', () => {
  assert.equal(hasMeter('energy'), true);
  assert.equal(hasMeter('water'), true);
  assert.equal(hasMeter('housing'), false);
});

test('the unit follows the meter, not the bill', () => {
  assert.equal(meterUnit('energy', { energy_type: 'strom' }), 'kWh');
  assert.equal(meterUnit('energy', { energy_type: 'gas' }), 'm³');
  assert.equal(meterUnit('energy'), 'kWh');
  assert.equal(meterUnit('water'), 'm³');
  assert.equal(meterUnit('mobile'), '');
});

test('reads German and English decimal separators, empty stays empty', () => {
  assert.equal(parseReadingValue('12.345,6'), 12345.6);
  assert.equal(parseReadingValue('12,345.6'), 12345.6);
  assert.equal(parseReadingValue('4711'), 4711);
  assert.equal(parseReadingValue(4711.1234), 4711.123);
  assert.equal(parseReadingValue('0'), 0);
  assert.equal(parseReadingValue(''), null);
  assert.equal(parseReadingValue('rund 4000'), null);
  assert.equal(parseReadingValue(undefined), null);
});

test('normalizing drops what is not a reading and sorts chronologically', () => {
  let next = 0;
  const readings = normalizeReadings([
    { date: '2026-03-01', value: '4200' },
    { date: '2025-01-15', value: '1000,5', note: '  Einzug  ' },
    { date: '', value: '999' },
    { date: '2026-01-01', value: 'unleserlich' },
    { date: '2026-01-01', value: -5 },
  ], () => `r-${++next}`);

  assert.deepEqual(readings, [
    { id: 'r-1', date: '2025-01-15', value: 1000.5, note: 'Einzug' },
    { id: 'r-2', date: '2026-03-01', value: 4200,   note: '' },
  ]);
});

test('normalizing keeps existing ids and accepts timestamps as dates', () => {
  const [reading] = normalizeReadings(
    [{ id: 'keep-me', date: '2026-02-03T22:30:00.000Z', value: 12 }],
    () => 'fresh',
  );

  assert.equal(reading.id, 'keep-me');
  assert.equal(reading.date, '2026-02-03');
});

test('the series counts consumption between readings, newest first', () => {
  const series = meterSeries([
    { id: 'a', date: '2025-01-01', value: 1000 },
    { id: 'b', date: '2025-01-31', value: 1090 },   // 90 in 30 Tagen
  ]);

  assert.deepEqual(series.map(row => row.id), ['b', 'a']);

  const [latest, first] = series;
  assert.equal(latest.used, 90);
  assert.equal(latest.days, 30);
  assert.equal(latest.perDay, 3);
  assert.equal(latest.perYear, 1095);

  // Der erste Stand hat keinen Vorgänger, gegen den er sich rechnen ließe
  assert.equal(first.used, null);
  assert.equal(first.days, null);
  assert.equal(first.perDay, null);
});

test('the series copes with what the form hands over', () => {
  const series = meterSeries([
    { id: 'b', date: '2026-01-31', value: '9.010,5' },
    { id: 'fresh', date: '', value: '' },            // gerade hinzugefügt, noch leer
    { id: 'a', date: '2026-01-01', value: '9000' },
  ]);

  // Als Text stünde „9.010,5“ vor „9000“ — sortiert und gerechnet wird als Zahl
  assert.deepEqual(series.map(row => row.id), ['b', 'a']);
  assert.equal(series[0].used, 10.5);
  assert.equal(series[0].days, 30);
});

test('a meter that goes backwards is a swapped meter, not negative consumption', () => {
  const [after] = meterSeries([
    { id: 'a', date: '2025-01-01', value: 9000 },
    { id: 'b', date: '2025-06-01', value: 40 },
  ]);

  assert.equal(after.meterChanged, true);
  assert.equal(after.used, null);
  assert.equal(after.perYear, null);
});

test('two readings on the same day say nothing about a rate', () => {
  const [second] = meterSeries([
    { id: 'a', date: '2025-01-01', value: 1000 },
    { id: 'b', date: '2025-01-01', value: 1002 },
  ]);

  assert.equal(second.used, 2);
  assert.equal(second.days, 0);
  assert.equal(second.perDay, null);
  assert.equal(second.perYear, null);
});

test('the summary spans the whole series and skips the meter change', () => {
  const summary = meterSummary([
    { id: 'a', date: '2025-01-01', value: 1000 },
    { id: 'b', date: '2025-01-11', value: 1100 },  // 100 in 10 Tagen
    { id: 'c', date: '2025-01-21', value: 50 },    // Zählerwechsel
    { id: 'd', date: '2025-01-31', value: 150 },   // 100 in 10 Tagen
  ]);

  assert.equal(summary.from, '2025-01-01');
  assert.equal(summary.to, '2025-01-31');
  assert.equal(summary.count, 4);
  assert.equal(summary.used, 200);
  assert.equal(summary.days, 20);
  assert.equal(summary.perDay, 10);
  assert.equal(summary.perYear, 3650);
});

test('a single reading is not yet consumption, so there is no summary', () => {
  assert.equal(meterSummary([{ id: 'a', date: '2025-01-01', value: 1000 }]), null);
  assert.equal(meterSummary([]), null);
  assert.deepEqual(meterSeries([]), []);
});

test('quantities are formatted with unit, nothing without a number', () => {
  assert.equal(fmtQuantity(1234.56, 'de', 'kWh'), '1.234,6 kWh');
  assert.equal(fmtQuantity(1234.56, 'en', 'kWh'), '1,234.6 kWh');
  assert.equal(fmtQuantity(12, 'de'), '12');
  assert.equal(fmtQuantity(null, 'de', 'kWh'), '');
});
