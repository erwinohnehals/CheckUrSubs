// ─── Kategorien der Ausgabenseite ─────────────────────────────────────────────
// Ein eigener Satz, getrennt von den 19 Vertragskategorien in App.jsx. Ein Kino-
// abend und eine Kfz-Versicherung gehören nicht in denselben Topf, auch wenn
// beide „Mobilität“ heißen könnten.
//
// Die i18n-Schlüssel tragen den Präfix `xcat_`, damit sie nicht mit den `cat_`
// Schlüsseln der Verträge kollidieren — health, transport, education und other
// gibt es auf beiden Seiten mit unterschiedlicher Bedeutung.
//
// Symbole stehen hier bewusst nicht: dieses Modul bleibt frei von React und
// lucide, damit es unter `node --test` läuft wie jedes andere lib/-Modul. Die
// Zuordnung Kategorie → Symbol gehört in die Ansicht.

export const EXPENSE_CATEGORIES = [
  { id: 'groceries', labelKey: 'xcat_groceries' },
  { id: 'dining',    labelKey: 'xcat_dining'    },
  { id: 'household', labelKey: 'xcat_household' },
  { id: 'garden',    labelKey: 'xcat_garden'    },
  { id: 'clothing',  labelKey: 'xcat_clothing'  },
  { id: 'health',    labelKey: 'xcat_health'    },
  { id: 'transport', labelKey: 'xcat_transport' },
  { id: 'travel',    labelKey: 'xcat_travel'    },
  { id: 'leisure',   labelKey: 'xcat_leisure'   },
  { id: 'gifts',     labelKey: 'xcat_gifts'     },
  { id: 'tech',      labelKey: 'xcat_tech'      },
  { id: 'pets',      labelKey: 'xcat_pets'      },
  { id: 'education', labelKey: 'xcat_education' },
  { id: 'fees',      labelKey: 'xcat_fees'      },
  { id: 'other',     labelKey: 'xcat_other'     },
];

// Einnahmen tragen den Präfix auch in der ID. Ohne ihn hießen beide Restposten
// `other`, und ein Budget auf `other` würde stillschweigend Gehalt mitzählen.
export const INCOME_CATEGORIES = [
  { id: 'income_salary', labelKey: 'xcat_income_salary' },
  { id: 'income_bonus',  labelKey: 'xcat_income_bonus'  },
  { id: 'income_refund', labelKey: 'xcat_income_refund' },
  { id: 'income_sale',   labelKey: 'xcat_income_sale'   },
  { id: 'income_gift',   labelKey: 'xcat_income_gift'   },
  { id: 'income_other',  labelKey: 'xcat_income_other'  },
];

export const DEFAULT_EXPENSE_CATEGORY = 'other';
export const DEFAULT_INCOME_CATEGORY  = 'income_other';

export const categoriesFor = (direction) =>
  direction === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

export const defaultCategoryFor = (direction) =>
  direction === 'income' ? DEFAULT_INCOME_CATEGORY : DEFAULT_EXPENSE_CATEGORY;

/** Die Kategorie oder null — nur innerhalb der zur Richtung passenden Liste. */
export const getExpenseCategory = (id, direction = 'expense') =>
  categoriesFor(direction).find((category) => category.id === id) || null;

/**
 * Eine gespeicherte Kategorie darf bleiben, solange sie zur Richtung passt.
 * Alles andere fällt auf den Restposten zurück — eine Ausgabe mit der Kategorie
 * `income_salary` wäre in jeder Auswertung ein stiller Fehler.
 */
export const resolveCategory = (id, direction = 'expense') =>
  getExpenseCategory(id, direction) ? id : defaultCategoryFor(direction);
