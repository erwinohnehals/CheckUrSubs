import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractBillingDay, extractBillingMonth,
  daysInMonth, clampDay, billingDateIn,
  isDueWithinDays, wasActiveIn,
} from './billing.js';

test('reads the day out of a stored billing date', () => {
  assert.equal(extractBillingDay('14'), 14);
  assert.equal(extractBillingDay('8 Mar'), 8);
  assert.equal(extractBillingDay('—'), null);
  assert.equal(extractBillingDay(''), null);
  assert.equal(extractBillingDay(null), null);
  assert.equal(extractBillingDay('99'), null);
  assert.equal(extractBillingDay('0'), null);
});

test('reads the month only from yearly dates', () => {
  assert.equal(extractBillingMonth('8 Mar'), 2);
  assert.equal(extractBillingMonth('1 Jan'), 0);
  assert.equal(extractBillingMonth('31 Dec'), 11);
  assert.equal(extractBillingMonth('14'), null);
  assert.equal(extractBillingMonth('8 Foo'), null);
});

test('knows how long each month is, including leap years', () => {
  assert.equal(daysInMonth(2026, 0), 31);   // Januar
  assert.equal(daysInMonth(2026, 1), 28);   // Februar
  assert.equal(daysInMonth(2024, 1), 29);   // Februar im Schaltjahr
  assert.equal(daysInMonth(2026, 3), 30);   // April
});

// Der Kern des Fehlers: der 31. darf nicht in den Folgemonat rutschen.
test('clamps a billing day to the end of a short month', () => {
  assert.equal(clampDay(2026, 1, 31), 28);  // Februar
  assert.equal(clampDay(2024, 1, 31), 29);  // Schaltjahr
  assert.equal(clampDay(2026, 3, 31), 30);  // April
  assert.equal(clampDay(2026, 0, 31), 31);  // Januar bleibt der 31.
  assert.equal(clampDay(2026, 1, 15), 15);  // kurze Monate stören kurze Tage nicht
});

test('builds a real date that stays inside its month', () => {
  const february = billingDateIn(2026, 1, 31);
  assert.equal(february.getMonth(), 1, 'bleibt im Februar');
  assert.equal(february.getDate(), 28);

  // Dezember + 1 rollt sauber ins nächste Jahr
  const january = billingDateIn(2026, 12, 31);
  assert.equal(january.getFullYear(), 2027);
  assert.equal(january.getMonth(), 0);
  assert.equal(january.getDate(), 31);
});

test('finds a payment due in the next few days', () => {
  const now = new Date(2026, 6, 20);   // 20. Juli 2026

  assert.equal(isDueWithinDays({ date: '22', period: 'monthly' }, 7, now), true);
  assert.equal(isDueWithinDays({ date: '20', period: 'monthly' }, 7, now), true, 'heute zählt');
  assert.equal(isDueWithinDays({ date: '19', period: 'monthly' }, 7, now), false, 'nächster Monat ist zu weit');
  assert.equal(isDueWithinDays({ date: '—', period: 'monthly' }, 7, now), false);
});

test('a payment on the 31st is still found in February', () => {
  const now = new Date(2026, 1, 25);   // 25. Februar 2026 — kein 31.

  // Gestaucht auf den 28.: drei Tage hin, also innerhalb einer Woche
  assert.equal(isDueWithinDays({ date: '31', period: 'monthly' }, 7, now), true);
});

test('yearly entries only count in their billing month', () => {
  const july = new Date(2026, 6, 20);

  assert.equal(isDueWithinDays({ date: '22 Jul', period: 'yearly' }, 7, july), true);
  assert.equal(isDueWithinDays({ date: '22 Aug', period: 'yearly' }, 7, july), false);
});

test('a contract counts only in the months it ran', () => {
  const entry = { created_at: '2026-05-10T00:00:00.000Z', auto_renew: true };

  assert.equal(wasActiveIn(entry, 2026, 5), true,  'Juni, nach der Erfassung');
  assert.equal(wasActiveIn(entry, 2026, 4), true,  'Mai, im Monat der Erfassung');
  assert.equal(wasActiveIn(entry, 2026, 3), false, 'April, davor');
});

test('the contract start beats the day it was entered', () => {
  const entry = {
    created_at:     '2026-07-01T00:00:00.000Z',
    contract_start: '2020-01-01',
    auto_renew:     true,
  };

  assert.equal(wasActiveIn(entry, 2026, 2), true, 'lief lange vor der Erfassung');
});

test('an expired fixed-term contract stops counting', () => {
  const ended = {
    contract_start: '2024-01-01',
    contract_end:   '2026-03-31',
    auto_renew:     false,
  };

  assert.equal(wasActiveIn(ended, 2026, 2), true,  'März, im letzten Monat');
  assert.equal(wasActiveIn(ended, 2026, 3), false, 'April, danach');
});

test('an auto-renewing contract keeps counting past its end date', () => {
  const renewing = {
    contract_start: '2024-01-01',
    contract_end:   '2026-03-31',
    auto_renew:     true,
  };

  assert.equal(wasActiveIn(renewing, 2026, 6), true, 'verlängert sich stillschweigend');
});
