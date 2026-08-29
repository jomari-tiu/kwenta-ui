# Conventions

Three cross-cutting contracts. Everything else is in `AGENTS.md`.

---

## 1. Money is integer centavos

`TCentavos` is an integer. ₱1.00 === `100`. The API speaks centavos in JSON,
end to end. Only two places convert:

- **Display** — `lib/money.ts` (`formatPeso`, `formatPeso0`, `formatPesoCompact`,
  `formatPesoSigned`).
- **CSV export** — plain decimal pesos (`1234.50`), because the consumer is
  Excel or a human.

**There is exactly one `formatPeso` in this repo and it lives in `lib/money.ts`,
taking centavos.** `lib/format.ts` deliberately exports no money helper. The
reason: `sqrly-cfe/lib/format.ts` has a `formatPeso(pesos: number)` — same name,
100× different meaning. One copy-paste from that file would be a live money bug
that renders plausibly.

### `parsePesoInput` must not multiply by 100

`parseFloat('8.165') * 100` is `816.5000000000001`, and for other values the
float error rounds the wrong way. Parse **textually**:

1. Strip `₱`, spaces, commas, leading `+`.
2. Reject anything not matching `-?\d*(\.\d*)?`.
3. Split on `.`; pad or truncate the fraction to exactly 2 characters.
4. `sign * (Number(intPart) * 100 + Number(fracPadded))`.

A third decimal **truncates**: `'8.169'` → `816`. Silently rounding a centavo up
is worse than dropping one you can't spend.

---

## 2. A plain date is a string, from the API to the pixel

`TPlainDate` is `'YYYY-MM-DD'`. It becomes a `Date` only to feed a date picker,
and comes back only through `toPlainDate()`.

Why, concretely, at UTC+8:

```js
new Date(2026, 7, 22).toISOString().slice(0, 10); // → "2026-08-21"  WRONG
```

Local midnight Aug 22 is 16:00 UTC Aug 21. Every "I saved it on the 22nd, it
shows the 21st" bug is that line. The mirror bug — `new Date('2026-08-22')`
parsing as UTC midnight and rendering as the 21st at negative offsets — hits the
read path.

**ESLint enforces this.** Outside `lib/date.ts`, these are errors:
`toISOString`, `toLocaleDateString`, and single-argument `new Date(…)`. It is the
highest-value lint rule in the project, because it converts a runtime mystery
that is invisible in your own timezone into a pre-commit error.

Two consequences worth knowing:

- **`isBefore(a, b)` is just `a < b`.** Lexicographic comparison on zero-padded
  ISO strings is exactly chronological. Overdue detection is a string compare.
- **`monthKeyOf(d)` is `d.slice(0, 7)`.** No date math.

Fields named `*At` (e.g. `createdAt`) are *instants*, not plain dates — those go
through `new Date()` and `formatDateTime()` legitimately.

`DATE_FORMAT` is `'MMM d, yyyy'`. Not `'MMM D, YYYY'` — that's Moment syntax; in
date-fns `D` is *day of year* and `YYYY` is *ISO week-year*. date-fns v4 throws
on `YYYY`, but `D` silently renders "Aug 234, 2026".

Weeks start **Monday** (`WEEK_STARTS_ON = 1`). Pass it to every date-fns week
call; `ds/Datepicker.tsx` sets it as a default so no call site can forget.

---

## 3. Query keys and invalidation

Keys live in **one** file, `lib/queryKeys.ts`, deviating from the POS's
module-scoped `<NAME>_KEY` convention. In the POS, modules are independent. Here
the entire product is cross-cutting aggregates — a transaction edit legitimately
touches five other modules' caches — so module-scoped keys would mean five real
import edges between data layers, plus a cycle the moment the calendar
references the transactions key.

`LEDGER_KEYS` is every query whose answer depends on the ledger. Any mutation
that moves money invalidates all of it.

| Mutation | Invalidates |
| --- | --- |
| transaction create / update / delete | `LEDGER_KEYS` |
| installment mark paid / unmark | `LEDGER_KEYS` |
| recurring create / update / pause / delete | `LEDGER_KEYS` |
| plan create / update / delete | installments, calendar, dashboard |
| category create / update / delete | categories + `LABEL_KEYS` |
| account create / update / delete | accounts, transactions, dashboard |
| budget set / delete | budgets, dashboard |

Notes:

- Budget keys are **root-only** (`[BUDGETS_KEY]`, not `[BUDGETS_KEY, month]`)
  because editing a transaction's date and category can move the meter in *two*
  months and *two* categories at once.
- Marking an installment paid creates an expense server-side, so it has the
  identical blast radius as a transaction write. Both use the same constant so
  they cannot drift.
- **Six invalidations is not expensive.** `invalidateQueries` only *refetches*
  mounted queries; the rest are marked stale and refetch lazily on next mount.
  On the calendar with the day panel open, exactly two queries are mounted — so
  a transaction edit costs **two requests, not six**. Do not "optimize" this
  into narrow keys that then go stale.
- Use `toKeyPart()` for every optional key part. `useGet`'s key is `string[]`, so
  if one call site passes `undefined` and another passes `''`, you get two cache
  entries for identical data and a UI that flickers between them.

**Every money-moving mutation is defined exactly once, in the module that owns
the entity.** The calendar's `_hooks/api.ts` holds queries only; the day panel
imports its mutations from `pages/transactions/_hooks/api`. Two copies would
mean two invalidation lists, and the day someone updates one and not the other
is the day the dashboard goes quietly stale.

---

## 4. Charts and colour

`recharts` is used for **one** thing: the grouped income-vs-expense bar chart,
wrapped in `ds/IncomeExpenseChart.tsx` behind a library-agnostic prop so it can
be swapped in one file. The other two dashboard visuals are not charts:
spend-by-category is a **ranked bar list**, budget progress is a **meter**.

### The palette is computed, not eyeballed

`--chart-income: #1f8a5b` and `--chart-expense: #dc2626` pass all six checks on
both the light (`#ffffff`) and dark (`#163052`) surfaces: lightness band, chroma
floor, CVD separation (worst adjacent ΔE **8.6** deutan), normal-vision floor
(ΔE **30.8**), and the 3:1 mark contrast — with one WARN: `#dc2626` is
**2.75:1** on dark.

**Do not lighten the pair for dark mode.** This is the well-meaning change that
breaks it:

```
#2fb37a + #f2645f on dark:  CVD FAIL  ΔE 5.0
#34c48a + #fb7185 on dark:  CVD FAIL  ΔE 1.6   ← indistinguishable, deuteranopia
```

Lightening green and red collapses their colourblind separation. The chart mark
tokens are therefore **not overridden** in `.dark`, by design.

The dark WARN is discharged by two **required** reliefs: a direct value label on
the current group, and `ChartFrame`'s mandatory "View as table" toggle. That
toggle is not a nicety.

### Text ink is a separate family

Text clears WCAG 4.5:1, not the 3:1 mark floor, and the mark colours miss it:

| Token | on `#ffffff` | on `#163052` |
| --- | --- | --- |
| `#1f8a5b` | 4.33 ✗ | 3.07 ✗ |
| `#dc2626` | 4.83 ✓ | 2.75 ✗ |
| `--ink-income` light `#15734b` | **5.86 ✓** | — |
| `--ink-expense` light `#b91c1c` | **6.47 ✓** | — |
| `--ink-income` dark `#4ade80` | — | **7.63 ✓** |
| `--ink-expense` dark `#f87171` | — | **4.81 ✓** |

So: `bg-chart-income` for marks, `text-ink-income` for text. Never mix them.

### Three mark rules

1. **The `+` / `−` sign prefix on every amount is the CVD fallback.** Never a
   bare coloured number. Use U+2212 minus, not a hyphen.
2. **Text never wears the series colour.** Axis ticks, group labels and legend
   text are `text-text-muted`; the coloured dot beside a legend label carries
   identity.
3. **`CategoryBreakdownCard` paints every bar one hue** (`--chart-neutral`), with
   the category's own colour as an 8px dot beside its label. Painting each bar
   its category colour spends the identity channel re-encoding what bar length
   already shows, and past ~7 hues adjacent classes blur under CVD regardless.
   Cap at 8 rows plus a folded "Other (n)".

---

## 5. Installment schedule — the shared algorithm

The client generates the preview; the server generates the real schedule. Two
implementations of one algorithm in two languages **will** diverge, so the
algorithm is specified here once and `_schedule.test.ts` is its executable spec,
mirrored case-for-case by the API's `installments.split.test.ts`.

**Money split** — remainder on the **last** payment, matching how PH lenders
amortize:

```
base = floor(total / months)
payments 1..n-1 = base
payment n       = total − base × (n − 1)
```

Invariant: `sum(payments) === total`, exactly, for every input.

**Date clamping** — `dayOfMonth: 31` clamps to the month's last day, and
clamping **must not move the anchor**: Jan 31 → Feb 28 → **Mar 31**. Generate
each due date independently from `startMonth + i`, **never** by iterating from
the previous date. `addMonths(Jan 31, 1)` is Feb 28 in date-fns, and `addMonths`
from *that* is Mar 28 — the day silently drifts for the rest of the plan. That
drift is the specific bug this function exists to not have.

Safety net: after a successful create, compare the returned payment count and
total against what was previewed, and `toast.warning` on mismatch.
