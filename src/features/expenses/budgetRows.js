// ─── Zeilen des Budget-Reiters ────────────────────────────────────────────────
// Was der Reiter anzeigt, gerechnet ohne React: welche Kategorie eine Grenze hat,
// wie weit sie in diesem Monat aufgebraucht ist, und welche Kategorien noch ohne
// dastehen.
//
// Die Faltung selbst steht in lib/budget.js. Hier wird sie nur je Kategorie
// abgefragt, sortiert und in Zeilen gebracht — dieses Modul rechnet nichts, was
// dort nicht schon gerechnet wurde.
//
// Beträge kommen bereits in der Rechengröße herein (siehe ExpensesSection): der
// Vergleich zwischen einer Grenze in Euro und einem Einkauf in Franken hätte
// sonst keinen Boden. Ohne Umrechnung bleibt alles roh, was Tests einwährungs-
// frei macht.

import { EXPENSE_CATEGORIES } from '../../lib/expenseCategories.js';
import { foldStart } from '../../lib/budget.js';

// Wie in lib/budget.js: auf Cent gerundet wird erst in der Anzeige, hier fällt
// nur das Rauschen der Fließkommazahlen weg
const roundAmount = (value) =>
  Number.isFinite(value) ? Math.round(value * 1e6) / 1e6 : 0;

// Ab hier wird es eng. Nicht zu früh warnen: wer am 20. bei 70 % steht, liegt
// im Plan, und eine Warnung, die immer leuchtet, wird nicht mehr gelesen.
export const NEAR_CAP = 0.85;

/**
 * Der Ton eines Balkens. Farbe bleibt dem Status vorbehalten — hier ist der
 * Verbrauch der Status, und `neutral` heißt: die Tintenfläche, keine Farbe.
 */
export const budgetTone = (ratio) => {
  if (!Number.isFinite(ratio)) return 'error';    // nichts verfügbar, trotzdem ausgegeben
  if (ratio >= 1)       return 'error';
  if (ratio >= NEAR_CAP) return 'warning';
  return 'neutral';
};

/**
 * Die Grenzen in die Rechengröße bringen. `convert(betrag, währung)` kommt von
 * lib/money.js; die gespeicherte Fassung bleibt unangetastet, denn eine Grenze
 * von 400 € ist in einem halben Jahr immer noch eine von 400 €.
 */
export const convertBudgets = (budgets = {}, convert = (amount) => amount) => {
  const converted = {};

  for (const [category, budget] of Object.entries(budgets)) {
    converted[category] = {
      ...budget,
      amount: roundAmount(convert(budget.amount, budget.currency)),
    };
  }

  return converted;
};

const EMPTY_TOTALS = {
  cap: 0, carry: 0, available: 0, spent: 0, remaining: 0, ratio: 0,
  tone: 'neutral', count: 0, over: 0,
};

/**
 * Die Zeilen eines Monats.
 *
 * `budgets` sind die *gespeicherten* Grenzen — die Zeile trägt sie mit, damit das
 * Feld beim Ändern den Betrag zeigt, der eingetippt wurde, und nicht den
 * umgerechneten. Gerechnet wird mit `carryover`, der bereits mit umgerechneten
 * Grenzen gebaut wurde.
 *
 * Kategorien ohne Grenze kommen alle mit, auch die ohne Ausgaben: eine Grenze
 * lässt sich sonst erst setzen, nachdem man das Geld schon ausgegeben hat. Was
 * davon zu sehen ist, entscheidet die Ansicht.
 */
export const budgetRows = ({
  budgets = {}, carryover, spentAt = () => 0, month,
  categories = EXPENSE_CATEGORIES,
} = {}) => {
  const budgeted   = [];
  const unbudgeted = [];

  categories.forEach((category, order) => {
    const stored = budgets[category.id] || null;
    const status = carryover?.statusFor(category.id, month) || null;

    if (status) {
      budgeted.push({
        ...status,
        order,
        id:       category.id,
        labelKey: category.labelKey,
        budget:   stored,
        tone:     budgetTone(status.ratio),
        over:     status.remaining < 0,
      });
      return;
    }

    // Eine Grenze, die erst im Mai greift, ist im März keine fehlende Grenze
    const start = stored ? foldStart(stored) : null;

    unbudgeted.push({
      order,
      id:       category.id,
      labelKey: category.labelKey,
      budget:   stored,
      spent:    roundAmount(spentAt(category.id, month)),
      startsAt: start && start > month ? start : null,
    });
  });

  // Was drückt, steht oben. Bei gleichem Anteil entscheidet der Betrag, dann die
  // Reihenfolge der Kategorienliste — damit die Liste zwischen zwei Monaten
  // nicht ohne Grund springt.
  budgeted.sort((a, b) =>
    (b.ratio - a.ratio) || (b.spent - a.spent) || (a.order - b.order));
  unbudgeted.sort((a, b) => (b.spent - a.spent) || (a.order - b.order));

  const totals = budgeted.reduce((sum, row) => ({
    cap:       roundAmount(sum.cap       + row.cap),
    carry:     roundAmount(sum.carry     + row.carry),
    available: roundAmount(sum.available + row.available),
    spent:     roundAmount(sum.spent     + row.spent),
    remaining: roundAmount(sum.remaining + row.remaining),
    ratio:     0,
    tone:      'neutral',
    count:     sum.count + 1,
    over:      sum.over + (row.over ? 1 : 0),
  }), EMPTY_TOTALS);

  totals.ratio = totals.available > 0
    ? totals.spent / totals.available
    : (totals.spent > 0 ? Infinity : 0);
  totals.tone = budgetTone(totals.ratio);

  return { budgeted, unbudgeted, totals };
};
