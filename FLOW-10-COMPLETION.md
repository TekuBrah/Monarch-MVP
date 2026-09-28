# Flow 10 — completion record

**Flow 10 is budgets: see each budget's spend against its limit, drill into one to see where the
money went, and create, edit or delete a budget.** It was built across four tagged MVP gates
(`mvp-gate67`, `mvp-gate69`, `mvp-gate71`, `mvp-gate71b`) and three DS releases (v2.5.0, v2.5.1,
v2.6.0, from DS Gates 66, 68 and 70). The last build gate is `mvp-gate71b` at
`86619312eca70583e9b1d1e99f089a3b85120469`. This file records where the flow stands at that commit.
Gate 72 (this document) changed no code.

Every figure below was derived at Gate 72 from the repository, the DS checkout or the specs' own
derivations. Where a figure came from the review thread, or from Figma as recorded by an earlier
gate, and could not be re-derived this session, the text says so. §9 lists every premise of the
Gate 72 brief that disk contradicted.

The per-gate detail lives in `CLAUDE.md`, one section per gate (Gates 67, 69, 71, 71-B), and in
the DS repo's own `CLAUDE.md` (Gates 66, 68, 70). This file is the summary to read first.

**Rule for this file:** it holds no text, figure or hash taken from a receipt. The money figures
below come from the seeded ledger (`src/data/transactions.ts`), which is a fixture, not personal
data. No merchant name appears.

---

## Contents

1. [State at a glance](#1-state-at-a-glance)
2. [What Flow 10 is — the user-visible surfaces](#2-what-flow-10-is--the-user-visible-surfaces)
3. [The architecture, with the reason attached](#3-the-architecture-with-the-reason-attached)
4. [Deviations from Figma](#4-deviations-from-figma)
5. [The DS releases Flow 10 required](#5-the-ds-releases-flow-10-required)
6. [What it measurably does and does not do](#6-what-it-measurably-does-and-does-not-do)
7. [Deferred and closed items](#7-deferred-and-closed-items)
8. [The gate list](#8-the-gate-list)
9. [Premises of the Gate 72 brief that disk contradicted](#9-premises-of-the-gate-72-brief-that-disk-contradicted)

---

## 1. State at a glance

| | at Flow 10 start (`mvp-gate65`) | at `mvp-gate71b` |
|---|---|---|
| tests | 523, in 22 spec files | **635**, in 27 spec files |
| visual baselines | 172 | **204** |
| walk states (\|WALK\|) | 43 — 14 routes + 7 non-default tabs + 22 overlays | **51** — 16 routes + 7 non-default tabs + 28 overlays |
| DS pin | v2.4.1 (`820736e8a869`) | **v2.6.0** (`64873993c7f8`) |
| Flow 10 routes | the Budget tab was a `ComingSoon` stub | `/finance` Budget tab, and `/finance/budget/:budgetId` |
| persistence | none | **none** (NP1 — a reload restores the two seeded budgets) |

204 = 51 walk states × 2 viewports × 2 themes. The two added routes are the two seeded budgets,
expanded from `:budgetId` over `BUDGETS` by the harness.

**The state is the flow's, not the ledger's.** Flow 10 adds no transaction, moves no amount and
stores no figure. Every number it shows is computed from the ledger on each render.

---

## 2. What Flow 10 is — the user-visible surfaces

Figma: Section `1266:14333` (`Finance_Budget`), file `v9MI8jxTaXiJA234Hkanlf`.

| surface | where | Figma | what it does |
|---|---|---|---|
| **Budget tab** | `src/flows/finance/BudgetTab.tsx`, on `/finance` | `1266:14334` | One DS `CardMonthlyBudget` per budget, in library order, then the "Add New Budget" card. Each card shows the ring (percent left), available, spent, limit and the period. **Details** opens the drilldown; **Add New** opens Create. |
| **Budget drilldown** | `BudgetDetailScreen.tsx`, route `/finance/budget/:budgetId` | `1266:14337` | `HeaderDefault` with Back and **Edit**. A large `ProgressRing` ("Left to Spend"). An info card of four rows: Budget, Duration, Available, Spent. A `DonutChart` of spend by category, centred on the total spent. A legend with one `ChartLegendItem` per category, each an independent disclosure holding that category's transactions as ledger rows. |
| **Create A Budget** | `BudgetFormModal.tsx` `mode="create"`, from Add New | `1266:14335` (category `Select` reference `1266:14336`) | A DS `Modal`: Name, Category (multi-select dropdown of the seven categories), Amount (RM), Date (From), Date (To), Auto-Renew Each Month. Save Budget appends the budget; the new card is the feedback. |
| **Edit Budget** | `BudgetFormModal.tsx` `mode="edit"`, from the drilldown's Edit | not drawn | The Create form, pre-filled. Save Changes writes only when something changed; every figure on the drilldown re-derives. Adds **Delete budget**. |
| **Delete budget?** | `BudgetDeleteConfirm`, stacked over Edit | not drawn | Cancel returns to Edit; Delete removes the budget and returns to the Budget tab. |
| **"Budget deleted." toast** | on the Budget tab after a delete | not drawn | Shown once, on landing. It reuses the receipts toast's fixed element. |

**Validation, both forms (Gate 71-B, decision 2C).** A field shows invalid only after it has been
left holding a bad value, or after a Save attempt. Save is never disabled. An invalid Save writes
nothing, reveals every invalid field and focuses the first.

---

## 3. The architecture, with the reason attached

### 3.1 Every figure is derived from the ledger, never transcribed (Decision 2A, Gate 67)

- **Spent** is every OUTFLOW in the budget's categories whose date falls inside its range,
  inclusive at both ends. **Credits are excluded**: a refund or an incoming transfer is not
  spending. **Available** is limit − spent. **Percent left** is available ÷ limit. Nothing about
  spent is seeded. (`src/data/derive.ts`, `countsToward`, `budgetSpent`, `budgetAvailable`,
  `budgetPercentLeft`, `budgetSpentByCategory`, `budgetLegend`.)
- **Why: Figma's own figures contradict themselves** (flow inventory, Flow 10 A1 and A2).
  - The Monthly Budget gauge prints **18%** where its own figures give 700 ÷ 7,500 = **9.33%**. The
    Entertainment gauge computes correctly (35%), so the Monthly one is a hand-authored figure.
  - The drilldown donut's centre prints **RM 6,800** (spent), while its seven segments sum to
    **RM 7,500** (the budget). The segments show allocations; the centre shows spend.
  Both are pure functions of data already on screen, so a computed model cannot produce either.
- **One derivation, split three ways.** The legend amounts, the donut's segments and the budget's
  spent all read the same `countsToward` filter, so they cannot disagree. The donut centre is the
  sum of its segments.

### 3.2 The budget model

- **A `Budget`** (`types.ts`) is an id, a name, a non-empty category list, a limit, `from` and `to`
  as `'YYYY-MM-DD'` strings, and `autoRenew`.
- **The dates are exempt from B5** (the rule that every date is an offset from `TODAY`). A budget's
  dates are data a person typed, like a receipt's printed date. `today.ts` records the exemption.
- **Dates compare as strings.** `occurredAt` has no zone, so its first 10 characters are the local
  calendar day. A `Date` would bring the device's timezone into the answer.
- **Overlap is allowed (Teku, 24 Sept 2026).** Any transaction in a budget's categories reduces
  that budget, whatever other budget it also reduces. Nothing checks one budget against another.
  Teku also accepted the seeded pair, which overlaps on dining: Monthly includes Dining & Leisure
  over the same dates as Entertainment, so the same two rows count toward both. (Recorded from the
  review thread; this file is the ruling's first record on disk.)
- **The seed (Decision 4, Gate 67):** Monthly Budget (all seven categories, RM 7,500.00) and
  Entertainment (Dining & Leisure, RM 1,000.00), both 2025-08-30 to 2025-09-20, both
  `autoRenew: false`. Figma supplied the limits and the period; the categories are the review
  thread's choice, delegated by Teku.

### 3.3 Money

- **Summed in whole sen.** Float additions do not reliably land on a two-decimal figure.
- **Always shown with two decimals**, through `format.ts`. Figma prints "RM 700" only because its
  figures were whole.
- **Percent left is `Math.floor`, clamped 0–100**, because "left to spend" must never overstate
  what is left. The ring and its label take the same integer.
- **Overspend:** available prints negative through `formatSignedMyr`, used only below zero, so a
  positive balance never reads as "+RM". The ring shows 0. No warning colour, because
  `--mapped-text-warning-default` fails contrast. Figma draws no overspent state.
- **The limit is capped at RM 999,999.99** (compared in sen), which is `ProgressRing`'s design
  ceiling (DS `amountFit.ts`) — the drilldown prints the limit inside the ring.

### 3.4 `BudgetsProvider` holds records only

`src/budgets/BudgetsProvider.tsx` holds the budget records as `useState`, seeded from `BUDGETS`,
mounted inside `AccountsProvider` above the router. **It stores no derived figure**; every screen
calls the pure derivations in `derive.ts` against `useAccounts().transactions`. It had no writers
at Gate 67 or 69. **Its three writers arrived at Gate 71** with their first callers:
`createBudget` (appends; id `budget-${crypto.randomUUID()}`), `updateBudget` and `deleteBudget`,
each one functional `setBudgets`.

### 3.5 NP1 — no persistence (ruled 2026-09-24)

A reload restores the seed: a created budget disappears, a deleted one returns. Persistence comes
after all flows, as a storage layer under the providers. Every budget field is plain serialisable
data, and `budgets.spec.ts` round-trips `BUDGETS` through JSON so that stays true. NP1 is the name
for the no-persistence ruling; **D2 and D3 still mean the repo split**.

### 3.6 Routing — B7, B8, and Back to the tab through router state

- **B7:** the Finance tabs are in-screen `useState` and never reach the URL. **B8:** a route reads
  its data from the app-level provider, with no route-scoped provider.
- **Back returns to the Budget tab**, not to Overview. Back calls
  `navigate('/finance', { state: { financeTab: 'budget' } })`, and `FinanceScreen`'s lazy
  `useState` initialiser reads it once through `requestedFinanceTab` (`financeTabs.ts`), validated
  against the tab ids. Tab switching still writes nothing to the URL or history.
- **An unknown `:budgetId` redirects to `/finance` with `replace`**, landing on the Budget tab. A
  deleted budget's id takes this path if the user reaches it again.

### 3.7 The one-shot delete flag, and the race it needed guarding against

- The delete navigates `navigate('/finance', { replace: true, state: { financeTab: 'budget',
  budgetDeleted: true } })`, then calls `deleteBudget`. **The toast is raised by the screen it
  lands on**, because the drilldown unmounts and cannot show it.
- `BudgetTab` reads `budgetDeleted` once into state, then replaces the location state without it,
  so a reload or Back/Forward onto that entry cannot raise the toast again.
- **The race:** React Router runs `navigate` as a transition, but the provider write is an ordinary
  update and committed first. The drilldown rendered once with no budget, and its unknown-id
  redirect — which carries no toast flag — won. An `isDeleting` ref now makes that one render
  return `null`. The redirect still serves every other unknown id.

### 3.8 Category hues — wedges `/500`, badges `/400`

- `TransactionCategory` carries a `hue: ChartHue`, read from each Figma legend badge's binding.
  A category's donut wedge and its legend badge take the same hue name.
- **They are one ramp step apart, deliberately (Teku, 25 Sept 2026, DS Gate 70).** DS v2.6.0 paints
  wedges at `--brand-<hue>-500`, as Figma draws them; `IconObject` badges stay at `/400`, also as
  Figma draws them. Do not "fix" the two back into agreement.

### 3.9 The 200px donut, and its lint exemption

The DS makes `DonutChart` size-agnostic ("the parent owns the box"). Figma's box is 200px, and no
ramp step backs 200 (`--brand-scale-1600` is 128, `-1700` is 256). So the MVP sets 200px with a
same-line `token-exempt` marker — **the fourth exemption in the tree**, added at Gate 69. It is a
judgement call: the alternative is `--brand-scale-1700`, 56px larger than the frame.

### 3.10 Amount fit — by string length, never by DOM measurement (DS v2.5.1, DS Gate 68)

The MVP's two-decimal figures ("RM 4,140.33") did not fit a DS layout sized for "RM 700". DS v2.5.1
fixed it with no API change:

- **`ProgressRing` rests at Figma's size** (medium h6, large h5) and steps its centre amount down
  one style **by the formatted string's length**, via an internal `fitAmountClass()`. The
  thresholds are derived from Poppins 600's glyph advances; a font change invalidates them.
- **`CardMonthlyBudget` goes compact on narrow cards** by a container query (below 359px of card
  width), so summary amounts under RM 10,000 stay on one line at 375.

The length rule is what makes the result deterministic and testable in jsdom, and it is why
RM 999,999.99 is the form's ceiling.

### 3.11 Shared validation, and `color-scheme` (Gate 71-B)

- **`useTouchedValidation`** (`src/flows/finance/`) is one mechanism serving both the budget form
  and the receipt editor. It owns the touched set, an attempt counter and `isShown(key)`. It does
  not own the rules: each form passes its error record from one function (`budgetDraftErrors`,
  `receiptDraftErrors`), so what shows red and what blocks the write cannot disagree. "Left" is
  detected from the container's bubbling blur, naming the field by `data-field` or the input's
  `name`, because DS `Field` and `Select` take no `onBlur`.
- **`color-scheme`** is declared on `<html>`, keyed to the same `data-theme` attribute as the DS's
  dark tokens: `light` by default, `dark` under `[data-theme='dark']`. Before it, native date and
  time picker glyphs drew black on the dark field. It moved only the six dark captures that show a
  visible date or time input.

---

## 4. Deviations from Figma

Each row is deliberate. **Who ruled** names the ruling as `CLAUDE.md` or the register records it;
"brief" means the gate brief's own ruling, and a dash means disk records no owner.

| # | Figma draws | what shipped | why | who ruled |
|---|---|---|---|---|
| 1 | hand-authored figures (18%, RM 700, RM 6,800, allocation slices) | every figure derived from the ledger | Figma's figures contradict themselves (§3.1) | Decision 2A (Teku, Gate 67) |
| 2 | "RM 700" | two decimals everywhere ("RM 4,140.33") | one formatter for all money | standing `format.ts` rule |
| 3 | pencil glyphs and blue values on the info rows (historical) | no pencils, one value colour | the info card is read-only; Edit is the header action. `1266:14337` no longer draws them in either source | Decision 6 |
| 4 | no Edit surface | "Edit Budget", the Create form pre-filled | a budget must be changeable | Decision 6 |
| 5 | no delete, confirmation or toast | all three | a budget must be removable, and removal cannot be undone | Decision 7A |
| 6 | a red "Delete" treatment on no budget surface | red deletes, `tone="error"`, **tertiary only** (borderless red text and bin) | `tone` only takes effect on tertiary. Dark contrast falls short (label 4.16, icon 2.83, measured at DS Gate 66) and is accepted | 1A (Teku) |
| 7 | — (no rule drawn) | overlapping budgets allowed; a transaction reduces every budget whose categories include it | budgets are views over the ledger, not partitions of it; the seeded pair overlaps on dining | Teku, 24 Sept 2026 |
| 8 | an Auto-Renew toggle | stored and shown, **no behaviour** | nothing renews a budget yet | brief (Gate 71) |
| 9 | ring amount at Figma's size, sized for "RM 700" | DS v2.5.1 amount fit: rests at h6/h5, steps down by length; compact card below 359px | two-decimal figures did not fit | Ruling A (Teku, DS Gate 68) |
| 10 | Back not wired | Back returns to the **Budget tab**, through router state | the user came from that tab | Gate 69 |
| 11 | a donut with a hole | a one-category donut was a solid disc until v2.6.0 (G42); now a ring | a CSS `fill` outranked the SVG attribute | DS Gate 70 (Teku's ruling) |
| 12 | wedges `<Hue>/500`, badges `<Hue>/400` | the same, since v2.6.0 (Gate 69 painted both at `/400`) | follow Figma | Teku, 25 Sept 2026 |
| 13 | a 200px donut box | 200px, `token-exempt` | no ramp step backs 200 | Gate 69 judgement |
| 14 | Amount label "Amount", value "RM 3200.00" | label "Amount (RM)", value "3200.00" | a number input cannot hold "RM"; `ReceiptEditor`'s "Total (RM)" precedent | Gate 71 |
| 15 | dates printed `15/09/2025` | the platform's own format (`mm/dd/yyyy` in the harness) | native `type="date"`; the Gate 51-B note applies | Gate 71 |
| 16 | sample values pre-filled ("Golf Lessons" etc.) | an empty Create form | Figma's values are sample data | Gate 71 |
| 17 | card about 594 tall; header 64; footer 152 | Create 544, Edit 604; header 74; footer 140 (Create) / 206 (Edit) | the DS hugs where Figma fixes (G28) | G28, registered |
| 18 | the FAB layer removed under the modal (inventory A9) | the FAB covered: modal z-index 100 above FAB 3 | same visual outcome, no chrome change | Gate 71 |
| 19 | no validation state drawn | invalid shows only after touch or a Save attempt; **Save always enabled** | a pristine form must not open red, and a disabled Save gives no reason | 2C |
| 20 | — | `color-scheme` on `<html>`, per theme | native glyphs were invisible in dark | Gate 71-B |
| 21 | no toast | "Budget deleted." — with a full stop | matches "Receipt deleted." | 3D |
| 22 | no Save behaviour drawn | a valid but **unchanged** Save writes nothing and closes the form | it applies Teku's undesigned-work ruling of 21 Sept 2026 | review thread, Gate 71-B, 28 Sept 2026 |
| 23 | "Expenses Summary" in `text/default/default` | `SectionHeader`'s subtle binding | one heading component everywhere (Gate 6) | Gate 6 standing rule |
| 24 | "Monthly Budget" printed on every card | `CardMonthlyBudget.title` carries each budget's name (G35) | a second budget needs its own name | DS v2.5.0 |
| 25 | a donut with a centre caption (as expected by the Gate 69 brief) | no centre caption | `1266:14337` draws none | Gate 69 |
| 26 | legend shares with two decimals ("24.00%") | `formatPercent` trims trailing zeros ("100%", "33.29%") | one percent formatter | Gate 69 |
| 27 | every nested row with a receipt glyph | the glyph derived per row (Gate 53-B) | a glyph states a linked receipt | Gate 53-B rule |
| 28 | the category chevron turned black when expanded | the collapsed grey kept | Figma's glyph carries an unbound raw black | G37 ruling (DS Gate 66) |

**28 rows.** Rows 1–22 answer the brief's list; rows 23–28 are divergences recorded at Gates 67,
69 and 71 that the brief did not name.

---

## 5. The DS releases Flow 10 required

Read from the DS checkout's `CHANGELOG.md` and `CLAUDE.md`, and from the gap register §2n–§2p.

| release | DS gate | tag commit | what it shipped | why the MVP could not proceed without it |
|---|---|---|---|---|
| **v2.5.0** | 66 | `72f3f2d71cd2` | `CardMonthlyBudget.title` (G35) and `sizing` (G36); `ChartLegendItem.expanded` / `onExpandedChange` / `controlsId` (G37); the Details button named "Details for {title}" (G38); `Button.tone` (G29) | The card hard-coded "Monthly Budget", so a second budget could not have its own name; it could not fill the content column; two cards shared one accessible name for Details; and the legend row had no disclosure state for the nested transactions. `tone` was for the red deletes. |
| **v2.5.1** | 68 | `21259e45124b` | amount fit: `ProgressRing` rests at Figma's size and steps down by string length; `CardMonthlyBudget` compact below 359px. No API change. | At v2.5.0 the ring's centre amount crossed the stroke at every width and the summary amounts wrapped at 375 (G39). The drilldown's large ring prints the limit too. |
| **v2.6.0** | 70 | `64873993c7f8` | `icon_spend` (G41); a one-segment `DonutChart` keeps its hole (G42); wedges at `/500` | The Spent info row drew an empty glyph slot, and the Entertainment donut (one category) was a solid disc with its label on the fill. |

**No DS release is owed to Flow 10's build.** Each was adopted at the next MVP gate (67, 69, 71).
What the DS still owes the flow is in §7.

---

## 6. What it measurably does and does not do

The seed figures below were derived at Gate 72 by running the app's own functions (`budgetSpent`,
`budgetAvailable`, `budgetPercentLeft`, `budgetLegend`, `formatPercent`) over `BUDGETS` and
`TRANSACTIONS` in a Node one-off outside the repo, and checked by hand against
`src/data/transactions.ts`. `e2e/budgets.spec.ts` asserts the same spent, available, percent and
per-category figures. All three agree.

**The ledger:** 25 rows — 18 in September 2025, 5 in August 2025, 2 in September 2026. The budget
window 2025-08-30 to 2025-09-20 holds 16 outflows and 2 credits (+350.00 and +1,500.00); the
credits are excluded.

| budget | limit | spent | rows | available | left |
|---|---|---|---|---|---|
| **Monthly Budget** | 7,500.00 | **3,359.67** | 16 | **4,140.33** | **55%** (floor of 55.20) |
| **Entertainment** | 1,000.00 | **123.76** | 2 | **876.24** | **87%** (floor of 87.62) |

**Monthly Budget by category**, in the legend's order (spend descending, ties in the category
table's order):

| category | spent | rows | share |
|---|---|---|---|
| Groceries | 1,118.46 | 5 | 33.29% |
| Shopping | 968.42 | 2 | 28.82% |
| Others / Misc | 878.84 | 3 | 26.16% |
| Bills & Utilities | 143.90 | 2 | 4.28% |
| Dining & Leisure | 123.76 | 2 | 3.68% |
| Transport | 100.00 | 1 | 2.98% |
| Healthcare | 26.29 | 1 | 0.78% |
| **total** | **3,359.67** | **16** | |

The spent and row columns are asserted by the spec. The share column is `budgetLegend`'s share
through `formatPercent`, from the Node one-off; no spec asserts every share. Entertainment's one
category is 100%.

The largest-spend category opens by default (Decision E): Groceries on Monthly, Dining & Leisure
on Entertainment. The two Dining & Leisure rows count toward both budgets.

**What it does not do — the known limits:**

- **No persistence (NP1).** A reload restores the seed.
- **Auto-Renew is inert.** It is stored and shown; nothing renews a budget when its period ends.
- **No allocation per category.** A budget has one limit. The legend shows each category's share
  of what was spent, never of an allocation — Figma's donut draws allocations the model does not
  hold.
- **The limit ceiling is RM 999,999.99.** RM 1,000,000.00 is rejected by the form.
- **No overspend state is drawn.** Overspend shows a negative available and a 0% ring, with no
  warning colour.
- **A budget follows the ledger's category, not a user's.** There is no way to recategorise a
  transaction yet (§7).

---

## 7. Deferred and closed items

Format: **where** — **the problem** — **the decision**. DS gaps are cited from the gap register,
not re-measured.

### 7.1 Open DS gaps reached by this flow

| gap | where | the problem | the decision |
|---|---|---|---|
| **G44** (new at Gate 72) | DS `Field.css` `:119` against `:136`; every focused invalid `Field` — first seen on the Create form after a Save attempt | the focus rule outranks the invalid rule, so a focused invalid field shows the blue focus border, not the error border | Fix deferred to the DS round (Claude, delegated by Teku, 28 Sept 2026): a focused invalid field keeps the error border and the outer focus ring. Never overridden from the app. Register §2q |
| **G43** (opened Gate 71) | the Create form's category dropdown | a `Select` menu inside a `Modal` is clipped by the card's `overflow: clip` (6px on the empty Create form) | Not worked around; the `finance-budget-create-category-*` baselines are the tripwire. Register §2p |
| **G40** (opened Gate 69) | `CardSmartInsights.titleColor` — the Homepage, not a budget surface | a colour applied inline is invisible to a CSSOM census | An enumerated tone prop, breaking; deferred to the DS round. Register §2o |
| **G28** | both budget modals | the DS `Modal` hugs where Figma fixes: header 74 against 64, footer 140/206 against 152 | Registered `shape-mismatch`; a design question, not a fix |
| **G22** | the category picker | multi-select `Menu` without `aria-multiselectable` | Deferred to the DS round. Register §2p re-measured it |
| **G23** | Edit Budget's category value | a long comma-joined value is clipped mid-glyph, not truncated; at Edit it reaches both viewports | Deferred to the DS round |

**Not reached by this flow, although a list might name them:** **G21** does not apply — the
category `Select` genuinely drops down. **G33** was not spread — both budget modals fit without the
height cap, so the receipt viewer's workaround stays in its two files. Both are recorded in §2p.

### 7.2 Closed during this flow

| gap | closed by | adopted |
|---|---|---|
| G35–G38 | DS v2.5.0 | Gate 67 (G37 at Gate 69) |
| G29 | DS v2.5.0 | Gate 71 (ruling 1A) |
| G39 | DS v2.5.1 | Gate 69, no call-site change |
| **G41** | DS v2.6.0 (`icon_spend`) | Gate 71 |
| **G42** | DS v2.6.0 (`mn-donut__segment--ring`) | Gate 71 — the four Entertainment baselines moved as the tripwire predicted |
| G3, G4, G6 | DS v1.3.0 (recorded late, at Gate 67) | — |

### 7.3 Other deferrals

| item | where | the problem | the decision |
|---|---|---|---|
| **Dark error-red contrast** | `Button tone="error"` in dark: every red delete | label 4.16 and icon 2.83 on the modal's dark elevation, both under AA | Accepted and deferred to the DS round (1A) |
| **`SummaryItem` size prop** | DS `CardMonthlyBudget` in compact | the summary amounts carry `type-body-m-semibold` while computing body-sm's size, so class and style disagree | Deferred by DS Gate 68 "to v2.6.0"; **not in v2.6.0**; still deferred |
| **Retire the Gate 68 hash-pin normalisation** | DS `ProgressRing.test.tsx`, `CardMonthlyBudget.test.tsx` | the markup pins map the new resting class back to the old one before hashing | Trigger: the next DS gate that touches either file. Gate 70 touched neither |

### 7.4 Scheduled next

**Transaction recategorisation.** Budgets need no code of their own for it: spent is derived from
each row's `category` on every render, so a recategorised transaction moves between budgets'
figures automatically. (Scheduled by the review thread; not recorded on disk before this file.)

---

## 8. The gate list

MVP tags are from the repository. DS tags and gate numbers are from the DS checkout's `CHANGELOG.md`
and `CLAUDE.md`. The commit is each tag's peeled SHA (`git rev-parse <tag>^{}`). Commit dates, from
`git log`: v2.5.0 09-24; `mvp-gate67`, v2.5.1, `mvp-gate69` and v2.6.0 09-25; `mvp-gate71` and
`mvp-gate71b` 09-28.

| repo | gate | tag | commit | what it did |
|---|---|---|---|---|
| — | scope session | *(none, by rule)* | — | Read-only; preceded DS Gate 66. Opened G35–G38. Its only on-disk trace is register §2n's heading "G35–G38 — opened by the Flow 10 scope". |
| DS | 66 | `v2.5.0` | `72f3f2d71cd26c31d9d806ca24f9c89e33267729` | The four Flow 10 primitives (G35–G38) and `Button.tone` (G29). |
| MVP | 67 | `mvp-gate67` | `2da6641a61e0308feac202c0af7a33b6f3cfd1f0` | Re-pin v2.5.0; the budget model and derivations; `BudgetsProvider` (records only); the Budget tab; NP1 named; the read-time caption and 30 s cutoff (Flow 9 Decision 1). |
| DS | 68 | `v2.5.1` | `21259e45124ba5009df30e4c5a1b0643463c602e` | Amount text that fits its slot, by string length. |
| MVP | 69 | `mvp-gate69` | `0821bef1ea4b590d073052556a6ceea21a98305a` | Re-pin v2.5.1; the drilldown route, gauge, info card, donut and legend with nested rows; Back-to-tab; hues; G40–G42 opened. |
| DS | 70 | `v2.6.0` | `64873993c7f825e45cf6d3b9779545e5c4d453a8` | The donut keeps its hole (G42), wedges at `/500`, `icon_spend` (G41). |
| MVP | 71 | `mvp-gate71` | `8491c47b940bae57e7d4c76eee4b590a2b58d95d` | Re-pin v2.6.0; Create, Edit and Delete with the confirmation and toast; the three writers; red deletes (1A); G43 opened. |
| MVP | 71-B | `mvp-gate71b` | `86619312eca70583e9b1d1e99f089a3b85120469` | Validation after touch (2C), `color-scheme`, the toast's full stop (3D). |
| MVP | 72 | *(Teku's to tag)* | — | This record, and G44. No code change. |

**There is no `mvp-gate66`, `mvp-gate68` or `mvp-gate70`**; those numbers are the DS gates. The
scope session carries no tag because a read-only session is never tagged.

---

## 9. Premises of the Gate 72 brief that disk contradicted

1. **"Open DS gaps from this flow: G21, G22, G23, G28, G33, G43 and G44."** Two are wrong and one is
   missing. **G21 does not apply** to the category picker and **G33 was not spread** to the budget
   modals — register §2p records both. **G40 was opened during this flow** (Gate 69) and is still
   open, although its surface is the Homepage. §7.1 lists what disk supports.
2. **"Include the scope session if there was one."** There was one, but no gate records it in
   either repo. The register's heading "G35–G38 — opened by the Flow 10 scope" is the only trace,
   and the register records G35–G38 only as closed (§2n), never as opened. The review thread
   confirmed that the session was read-only and untagged, and that it preceded Gate 66. It is now
   the first row of §8.
3. **"Scheduled next: transaction recategorisation."** Not on disk anywhere before this file. It is
   recorded here as the review thread's schedule.
4. **The Figma contradictions (18% against 9.33%; centre spent against slices allocated).**
   Confirmed on disk by the flow inventory, Flow 10 A1 and A2. Figma was not re-read this session.
5. **The dates.** The brief is dated 26 Sept. But `mvp-gate71` and `mvp-gate71b` were committed on
   09-28 (`git log`), and register §2p's heading dates Gate 71 as 2026-09-25. §2q is dated
   2026-09-28 and carries a note correcting §2p's date. G44's decision date is 28 Sept 2026, not the
   brief's 26 Sept (corrected in the Gate 72 correction pass).
6. **"Unchanged-Save behaviour" as a deviation.** Figma draws no Save behaviour, so this is not a
   deviation from a drawing. It was ruled by the review thread at Gate 71-B (28 Sept 2026), applying
   Teku's undesigned-work ruling of 21 Sept, and it is not an open decision.
7. **Gate 62, as `FLOW-9-COMPLETION.md` §8 describes it.** §8 calls Gate 62 absent. That holds for
   this repo only: the DS repo has a Gate 62, which shipped v2.4.0. `FLOW-9-COMPLETION.md` is left
   unedited.

**Checked and confirmed:** the carried seed figures (every one, by hand against the ledger and by
the spec); the `Field.css` line references (`:119` for the focus rule, `:136` for invalid); and
that 2p's tally is 42 entries, 22 closed, 20 open.
