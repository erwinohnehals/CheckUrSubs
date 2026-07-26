# Ausgaben — Umsetzungsplan

Expanding Gold&Geld from a recurring-cost tracker into a full spending tracker:
one-off expenses, purchases split into line items, per-category budgets with
carryover, income, and a month/year report — kept separate from contracts and
subscriptions but comparable against them.

Code identifiers are English (`expenseStore`, `MonthTab`); user-facing strings are
German and English via `lib/i18n.js`, like everything else in this app.

---

## 1. Agreed decisions

| Topic | Decision |
|---|---|
| Bundle | A purchase event (merchant + date), optionally split into line items |
| Item categories | The receipt sets the category; individual items may override it |
| Totals | Recurring and one-off stay separate, compared side by side |
| Categories | Own expense category set; the 19 contract categories stay untouched |
| Budgets | Standing cap per category, with carryover between months |
| Fields | Merchant, payment method, receipt file, note + tags |
| Time | Month view with prev/next stepper, plus a year report |
| Navigation | Second top-level section with its own tabs: Monat / Budget / Jahr |
| Accounts | User-defined named accounts (Bargeld, DKB Giro, PayPal …) |
| Input | Manual entry + "repeat a past expense". Bank CSV import deferred |
| Income | Full entries — dated and categorised |
| Comparison | Mirrored: a card in each section's analytics |

---

## 2. Architecture

### 2.1 Transactions

One new store, `goldgeld.expenses`, built with the same factory shape as
[`lib/entryStore.js`](../src/lib/entryStore.js) — injectable `storage` and
`createId`, a `normalize` pass, `uniqueById`, a versioned payload — so it is
testable under `node --test` exactly like
[`lib/entryStore.test.js`](../src/lib/entryStore.test.js).

A record is one **transaction**, either an expense or income:

```js
{
  id,
  direction: 'expense' | 'income',
  title,                 // "OBI", "Garden Equipment", "Gehalt"
  merchant,
  date,                  // real ISO date
  category,              // expense- or income-category id
  account_id,
  currency_code,
  amount,                // = sum of items when items exist
  items: [{ id, label, amount, category | null }],
  tags: [],
  note,
  refund_for,            // optional: income offsetting an expense
  created_at,
  archived_at,
}
```

Three rules carry the whole design:

1. `items` empty → the transaction is a single amount. `items` non-empty →
   `amount` is **recomputed as the sum on every write**, never trusted from input.
2. An item's **effective category** is `item.category || transaction.category`.
   That single expression is the entire "receipt sets it, items may override"
   behaviour.
3. Every breakdown — category totals, budgets, year report — goes through one
   `categoryBreakdown(transaction)` helper returning `[{ category, amount }]`.
   It is unit-tested, because a bug there is wrong everywhere and silent.

**Dates diverge from contracts deliberately.** A contract stores a display string
(`"14"`, `"8 Mar"`) because it recurs; an expense happened on a specific day and
stores a real ISO date. No date code is shared between the two sides.

### 2.2 Accounts and budgets

- `goldgeld.accounts` — `{ id, label, kind: cash|bank|card|online, archived_at }`,
  seeded with Bargeld and one bank account on first use. No balances.
- `goldgeld.budgets` — `{ [categoryId]: { amount, currency, since: 'YYYY-MM' } }`.

### 2.3 Categories

New set in `lib/expenseCategories.js` with i18n keys `xcat_*`, so they cannot
collide with the existing `cat_*` keys — `health`, `housing`, `education`,
`transport` and `other` exist on both sides.

**Expenses:** Lebensmittel · Restaurant & Café · Haushalt · Garten · Kleidung ·
Gesundheit · Auto & Verkehr · Reisen · Freizeit & Hobby · Geschenke & Spenden ·
Technik · Haustiere · Bildung · Gebühren & Steuern · Sonstiges

**Income:** Gehalt · Bonus · Erstattung · Verkauf · Geschenk · Sonstiges

This list is the one thing not derivable from the codebase — it needs review
before Phase 1 starts.

### 2.4 Budget carryover

For category `c` in month `m`:

```
available(c, m) = cap(c) + carry(c, m)
carry(c, m)     = available(c, m-1) − spent(c, m-1)      // may be negative
```

Folded forward from the budget's `since` month and memoised. Shown as
`Lebensmittel · 312 / 400 · +38 aus Februar`, with the bar taking the `warning`
tone near the cap and `error` past it — colour stays reserved for status, per the
design language. Income never affects budgets.

### 2.5 Navigation

```
section: contracts | expenses          ← segmented switch
  contracts:  Home · Kalender · Auswertung
  expenses:   Monat · Budget · Jahr
```

`TABS` becomes per-section and `useTabSwipe` receives the active section's list,
so swiping stays inside a section. On mobile the bottom bar shows the current
section's three tabs and the section switch sits in the page header; on desktop
the switch sits at the top of `DesktopSidebar` with the tabs beneath. The `+`
button is section-aware. Last section and last tab per section persist.

### 2.6 Plumbing that needs no work

`documentStore` keys documents by an opaque `entryId`, and `createBackup` dumps
every document via `documentStore.all()`. Receipts attached to a transaction id
therefore work, and land in backups, with no changes to either module.
`countsByEntry()` is likewise global.

### 2.7 Target file layout

`src/App.jsx` is 5,243 lines. Adding this feature inline would make it
unworkable.

```
lib/expenseStore.js       + test      lib/expenseCategories.js
lib/accountStore.js                   lib/budget.js + test
features/expenses/  ExpensesSection · MonthTab · BudgetTab · YearTab
                    ExpenseModal · ExpenseRow · ReceiptItems
ui/                 CARD, btn, Overlay, Segmented, MeterRow, StatusPill,
                    useSwipeRow, Toast … moved out of App.jsx
```

---

## 3. Phases

Each phase ends in a state worth committing. Phase 2 is the first one that is
actually usable day to day.

### Phase 1 — Foundation

Shared UI extraction and the complete data layer. No new screens.

- Move the shared primitives out of `App.jsx` into `ui/`: `CARD`, `PANEL`,
  `INPUT_CLASS`, `btn`, `Segmented`, `Overlay`, `PopMenu`, `MenuItem`,
  `StatusPill`, `Badge`, `MeterRow`, `Note`, `Switch`, `DatePicker`,
  `SelectInput`, `useSwipeRow`, `useDismiss`, `Toast`. Mechanical move and
  import, no behaviour change — its own commit.
- Lift the recurring monthly total (`totalMonthlyUSD`) out of the `App` body so
  both sections can read it later.
- `lib/expenseStore.js` — normalize, item-sum invariant, `categoryBreakdown`,
  CRUD, `replaceAll`, `importRows`.
- `lib/expenseCategories.js`, `lib/accountStore.js`, `lib/budget.js`
  (carryover fold).
- Tests for the store and the budget fold, run by `npm test`.
- i18n keys for categories and accounts in `de` and `en`.

**Done when:** `npm test`, `npm run lint` and `npm run build` pass, and the app
looks and behaves exactly as before.

### Phase 2 — Section shell and the Monat tab

The milestone that makes the feature usable.

- Two-section navigation: segmented switch, per-section tab lists, section-aware
  swipe, bottom bar, `DesktopSidebar` and `+` button. Persist last section and
  tab.
- **Monat tab** — month stepper, month total, list grouped by day with sticky day
  headers. A receipt with line items shows a count chip and expands inline.
  Swipe-to-delete via `useSwipeRow` with the existing `Toast` undo. Empty state.
- **Add/edit modal** — reuses `Overlay` and `Segmented`. Tabs: *Betrag* (amount,
  date, category, account, merchant), *Positionen* (line items, only when
  splitting), *Beleg & Notiz* (file via `documentStore`, note, tags).
  `inputMode="decimal"` on the amount. An "Als Einnahme" toggle flips the form to
  income mode with income categories.
- Account management: create, rename, archive.

**Done when:** a shop trip can be logged as one amount or split into items with
per-item category overrides, a receipt photo attaches, income records, and
everything survives a reload.

### Phase 3 — Budget and carryover

- **Budget tab** — every budgeted category with cap, spent, carryover and
  remaining; unbudgeted categories listed below with a "set a cap" affordance.
  Inline cap editing.
- Compact budget strip at the top of the Monat tab, tapping through to the tab.
- Warning and over-budget tones; manual "reset carryover" action.

**Done when:** caps set in one month visibly roll their unspent remainder into
the next, and overspending eats into the following month.

### Phase 4 — Jahr report and the mirrored comparison

- **Jahr tab** — year stepper, twelve months stacked as fixed vs one-off with
  income as a line, category shares, biggest single purchases, and total
  in / out / left over.
- One `SpendSplitCard` component rendered twice with different labelling: from
  the contracts side in Auswertung, from the expenses side in Jahr. This is what
  consumes the total lifted in Phase 1.

**Done when:** both analytics surfaces show the same split from their own point
of view, and the year total reconciles against the sum of the twelve months.

### Phase 5 — Repeat, backup and polish

- "Erneut erfassen" on any transaction: opens the modal prefilled with today's
  date, amount editable.
- Extend `backup.js` with `expenses`, `accounts` and `budgets`; bump
  `BACKUP_VERSION` to 2 while still reading v1 files. Documents need no change.
- A separate expenses CSV export, one row per line item with a receipt id
  column. Merging both domains into one CSV would produce a file that is wrong
  for both.
- Onboarding copy for the new section; README update.

**Done when:** a full backup round-trips expenses, receipts, accounts and budgets
onto a clean profile.

**Deferred by decision:** bank CSV import. Nothing in the data model blocks it.

---

## 4. Assumptions

1. **The category list in §2.3** needs review before Phase 1.
2. **Accounts carry no balances.** They label where money went; tracking balances
   would make this a ledger, which was not asked for.
3. **Carryover** starts the month a cap is first set, does not reset in January,
   and has a manual reset action.
4. **Refund linking** (`refund_for`) lets an income entry point at an expense so
   the purchase can be shown net. It is the first thing to cut if it complicates
   the budget fold.
5. **Deleting a receipt** deletes its line items and attached files, with undo.
6. **Tags** are free text with autocomplete from past values; no management
   screen.
