import test from 'node:test';
import assert from 'node:assert/strict';
import { translations, LANGS } from './i18n.js';

// Die Sprachtabellen werden von Hand gepflegt. Ohne Prüfung fällt ein
// vergessener Eintrag erst auf, wenn in der Oberfläche der Schlüsselname
// statt des Textes steht — oder wenn t.more_count(3) kein Aufruf ist,
// sondern undefined.

const kindOf = (value) => (Array.isArray(value) ? 'array' : typeof value);

const REFERENCE = 'de';
const OTHERS = LANGS.filter((lang) => lang !== REFERENCE);

test('jede Sprache kennt genau dieselben Schlüssel', () => {
  const expected = Object.keys(translations[REFERENCE]).sort();

  for (const lang of OTHERS) {
    const actual = Object.keys(translations[lang]).sort();

    const missing = expected.filter((key) => !actual.includes(key));
    const extra = actual.filter((key) => !expected.includes(key));

    assert.deepEqual(missing, [], `fehlt in ${lang}: ${missing.join(', ')}`);
    assert.deepEqual(extra, [], `nur in ${lang} vorhanden: ${extra.join(', ')}`);
  }
});

test('gleicher Schlüssel hat überall dieselbe Form', () => {
  for (const key of Object.keys(translations[REFERENCE])) {
    const reference = translations[REFERENCE][key];

    for (const lang of OTHERS) {
      const value = translations[lang][key];

      assert.equal(
        kindOf(value), kindOf(reference),
        `${key}: ${REFERENCE} ist ${kindOf(reference)}, ${lang} ist ${kindOf(value)}`,
      );

      // Eine Funktion, die in einer Sprache ein Argument nimmt und in der
      // anderen keines, verschluckt still den eingesetzten Wert.
      if (typeof reference === 'function') {
        assert.equal(
          value.length, reference.length,
          `${key}: erwartet ${reference.length} Argument(e), ${lang} nimmt ${value.length}`,
        );
      }

      // months_full mit 11 Einträgen wäre ein Fehler, den erst der Dezember zeigt.
      if (Array.isArray(reference)) {
        assert.equal(
          value.length, reference.length,
          `${key}: ${reference.length} Einträge erwartet, ${lang} hat ${value.length}`,
        );
      }
    }
  }
});

test('kein Text ist leer', () => {
  for (const lang of LANGS) {
    for (const [key, value] of Object.entries(translations[lang])) {
      const texts = Array.isArray(value) ? value : [value];

      for (const text of texts) {
        if (typeof text !== 'string') continue;
        assert.ok(text.trim().length > 0, `${key} ist in ${lang} leer`);
      }
    }
  }
});
