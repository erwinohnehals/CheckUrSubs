import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoriesFor, getExpenseCategory,
  resolveCategory, defaultCategoryFor,
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

test('a category from the wrong side falls back instead of leaking through', () => {
  assert.equal(resolveCategory('garden'), 'garden');
  assert.equal(resolveCategory('income_salary'), 'other');
  assert.equal(resolveCategory('erfunden'), 'other');
  assert.equal(resolveCategory('income_salary', 'income'), 'income_salary');
  assert.equal(resolveCategory('garden', 'income'), 'income_other');
});
