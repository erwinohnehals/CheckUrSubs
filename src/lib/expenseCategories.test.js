import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, RENAMED_CATEGORIES, categoriesFor,
  getExpenseCategory, migrateCategory, resolveCategory, defaultCategoryFor,
} from './expenseCategories.js';
import { translations, LANGS } from './i18n.js';

const ALL = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

test('every category is translated in every language', () => {
  for (const lang of LANGS) {
    for (const { id, labelKey } of ALL) {
      assert.equal(
        typeof translations[lang][labelKey], 'string',
        `${labelKey} (${id}) fehlt in ${lang}`,
      );
    }
  }
});

test('the keys stay out of the way of the contract categories', () => {
  for (const { labelKey } of ALL) assert.match(labelKey, /^xcat_/);
});

test('no ID appears on both sides', () => {
  const ids = ALL.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length);
});

test('picks the list and the fallback that belong to the direction', () => {
  assert.equal(categoriesFor('income'), INCOME_CATEGORIES);
  assert.equal(categoriesFor('expense'), EXPENSE_CATEGORIES);
  assert.equal(defaultCategoryFor('income'), 'income_other');
  assert.equal(defaultCategoryFor('expense'), 'other');

  assert.equal(getExpenseCategory('garden')?.labelKey, 'xcat_garden');
  assert.equal(getExpenseCategory('garden', 'income'), null);
});

test('every renamed ID points at a category that exists today', () => {
  for (const [old, replacement] of Object.entries(RENAMED_CATEGORIES)) {
    assert.ok(
      EXPENSE_CATEGORIES.some(({ id }) => id === replacement),
      `${old} → ${replacement} zeigt ins Leere`,
    );
    assert.ok(
      !EXPENSE_CATEGORIES.some(({ id }) => id === old),
      `${old} steht noch in der Liste und wird trotzdem umgeleitet`,
    );
  }
});

test('a stored `tech` keeps its meaning instead of falling into the leftovers', () => {
  assert.equal(migrateCategory('tech'), 'devices');
  assert.equal(migrateCategory('groceries'), 'groceries');
  // Nichts geerbtes vom Prototyp: `toString` ist keine umbenannte Kategorie
  assert.equal(migrateCategory('toString'), 'toString');

  assert.equal(resolveCategory('tech'), 'devices');
  assert.equal(getExpenseCategory('tech')?.id, 'devices');
  // Auf der Einnahmenseite gab es `tech` nie — dort bleibt es der Restposten
  assert.equal(resolveCategory('tech', 'income'), 'income_other');
});

test('a category from the wrong side falls back instead of leaking through', () => {
  assert.equal(resolveCategory('garden'), 'garden');
  assert.equal(resolveCategory('income_salary'), 'other');
  assert.equal(resolveCategory('erfunden'), 'other');
  assert.equal(resolveCategory('income_salary', 'income'), 'income_salary');
  assert.equal(resolveCategory('garden', 'income'), 'income_other');
});
