import test from 'node:test';
import assert from 'node:assert/strict';
import { transferTextReason } from './internalTransfer.js';

test('„Mein Geld" im Verwendungszweck ist eine Umbuchung', () => {
  assert.equal(transferTextReason('Mein Geld'), 'own_transfer');
  assert.equal(transferTextReason('DAUERAUFTRAG', 'mein geld juli'), 'own_transfer');
});

test('die eigene Kreditkartenabrechnung trägt ihren eigenen Grund', () => {
  assert.equal(
    transferTextReason('EIGENE KREDITKARTENABRECHN.'),
    'credit_card_settlement',
  );
});

test('Umbuchung und Übertrag zählen auch ohne Umlaut', () => {
  assert.equal(transferTextReason('Umbuchung'), 'own_transfer');
  assert.equal(transferTextReason('Übertrag'), 'own_transfer');
  assert.equal(transferTextReason('Uebertrag'), 'own_transfer');
});

// Die Regeln laufen über hunderte Zeilen eines Auszugs. Ein Stichwort, das
// mitten in einem Wort trifft, macht aus einem Einkauf stillschweigend eine
// Nicht-Ausgabe — der Fehler, der am schwersten zu bemerken wäre.
test('ein Stichwort mitten im Wort trifft nicht', () => {
  assert.equal(transferTextReason('Saldenübertrag Vorjahr'), '');
  assert.equal(transferTextReason('Meine Geldbörse GmbH'), '');
  assert.equal(transferTextReason('Umbuchungsgebuehr'), '');
});

test('ohne Text keine Vermutung', () => {
  assert.equal(transferTextReason(), '');
  assert.equal(transferTextReason('', null, undefined), '');
  assert.equal(transferTextReason('REWE SAGT DANKE'), '');
});
