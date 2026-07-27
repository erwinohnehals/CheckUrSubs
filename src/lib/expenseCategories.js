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
  // Wohnkosten sind das Dach über dem Kopf — Miete, Nebenkosten, Strom, Wasser,
  // Grundsteuer. Getrennt vom Haushalt, weil das eine jeden Monat gleich hoch
  // wiederkommt und das andere die Einkäufe für die Wohnung sind.
  { id: 'housing',         labelKey: 'xcat_housing'         },
  // Die Miete für Laden, Büro oder Werkstatt gehört nicht in denselben Topf wie
  // die eigene Wohnung: sie ist betrieblich und in der Auswertung getrennt zu
  // sehen.
  { id: 'commercial_rent', labelKey: 'xcat_commercial_rent' },
  { id: 'garden',    labelKey: 'xcat_garden'    },
  { id: 'clothing',  labelKey: 'xcat_clothing'  },
  { id: 'health',    labelKey: 'xcat_health'    },
  { id: 'transport', labelKey: 'xcat_transport' },
  { id: 'travel',    labelKey: 'xcat_travel'    },
  { id: 'leisure',   labelKey: 'xcat_leisure'   },
  { id: 'gifts',     labelKey: 'xcat_gifts'     },
  // „Technik" war ein Sammelbecken: die Handyrechnung, ein neuer Laptop und das
  // Adobe-Abo lagen nebeneinander, obwohl sie nichts miteinander zu tun haben.
  // Das eine ist eine laufende Leitung ins Haus, das zweite eine Anschaffung, das
  // dritte eine Miete auf Zeit. Drei Töpfe statt einem:
  //
  //   connectivity — was monatlich für Mobilfunk und Internet abgeht
  //   devices      — Geräte, einmal gekauft, jahrelang benutzt
  //   software     — Programme, Abos, Server und Domains
  { id: 'connectivity', labelKey: 'xcat_connectivity' },
  { id: 'devices',      labelKey: 'xcat_devices'      },
  { id: 'software',     labelKey: 'xcat_software'     },
  { id: 'pets',      labelKey: 'xcat_pets'      },
  { id: 'education', labelKey: 'xcat_education' },
  { id: 'fees',      labelKey: 'xcat_fees'      },
  // Fremdes Geld, das nur durch das eigene Konto hindurchgeht: eine gezahlte
  // Kaution, eine Auslage für jemand anderen. Es steht kurz vor dem Restposten,
  // weil es keine Art von Ausgabe ist, sondern eine Aussage darüber, wem das
  // Geld gehört. Die Gegenbuchung trägt `income_pass_through`.
  { id: 'pass_through', labelKey: 'xcat_pass_through' },
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
  // Dieselbe Aussage von der anderen Seite: eine erhaltene Kaution, ein Vorschuss
  // für eine Rechnung, die man für jemanden bezahlt. Der Betrag ist da, aber er
  // ist nicht verdient — er wartet nur darauf, wieder hinauszugehen.
  { id: 'income_pass_through', labelKey: 'xcat_income_pass_through' },
  { id: 'income_other',  labelKey: 'xcat_income_other'  },
];

export const DEFAULT_EXPENSE_CATEGORY = 'other';
export const DEFAULT_INCOME_CATEGORY  = 'income_other';

/**
 * Abgelöste IDs. Auf dem Gerät liegen Buchungen, Budgets und gelernte
 * Importregeln, die `tech` tragen — es gibt keinen Server, der sie nachträglich
 * umschreibt. Sie bekommen die Nachfolgerin beim Lesen.
 *
 * `devices` ist die Erbin, weil „Technik" umgangssprachlich der Elektronikmarkt
 * ist. Für alte Handyrechnungen ist das die falsche Schublade — richtiger als
 * der Restposten ist es trotzdem, und wer nachsortiert, sieht sie beisammen.
 */
export const RENAMED_CATEGORIES = { tech: 'devices' };

/** Die heutige ID zu einer gespeicherten — für alles andere die unveränderte. */
export const migrateCategory = (id) =>
  Object.hasOwn(RENAMED_CATEGORIES, id) ? RENAMED_CATEGORIES[id] : id;

export const categoriesFor = (direction) =>
  direction === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

export const defaultCategoryFor = (direction) =>
  direction === 'income' ? DEFAULT_INCOME_CATEGORY : DEFAULT_EXPENSE_CATEGORY;

/**
 * Die Kategorie oder null — nur innerhalb der zur Richtung passenden Liste.
 * Abgelöste IDs werden unterwegs übersetzt, damit eine alte Buchung im Feld
 * ihren Namen zeigt statt gar nichts.
 */
export const getExpenseCategory = (id, direction = 'expense') =>
  categoriesFor(direction).find((category) => category.id === migrateCategory(id)) || null;

/**
 * Eine gespeicherte Kategorie darf bleiben, solange sie zur Richtung passt.
 * Alles andere fällt auf den Restposten zurück — eine Ausgabe mit der Kategorie
 * `income_salary` wäre in jeder Auswertung ein stiller Fehler.
 */
export const resolveCategory = (id, direction = 'expense') =>
  getExpenseCategory(id, direction)?.id || defaultCategoryFor(direction);
