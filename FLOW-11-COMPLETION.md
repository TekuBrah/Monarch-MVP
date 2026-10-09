# Flow 11 — completion record

**Flow 11 is Plans: savings goals and commitments, and the money model underneath them — see each
goal's progress and each recurring commitment, drill into either, move money into a goal, and
create, edit or close a goal.** It was built across twelve tagged MVP gates, `mvp-gate75` to
`mvp-gate82` (75, 76, 77, 78, 79, 80, 80-B, 80-C, 81, 81-B, 81-C, 82), on DS v2.8.0 throughout,
after the Gate 74-B re-pin that preceded it. The last build gate is `mvp-gate82` at
`eedfecff8fc35c812370d84aceca90a3874dce35`. This file records where the flow stands at that commit.
Gate 83 (this document) changed no code.

Every figure below was derived at Gate 83 from the repository (`git`, the source, the specs'
own assertions, `npx playwright test --list`). Where a figure came from an earlier gate's record
and could not be re-derived without running the suite, it is labelled **[reported]**; where it came
from the review thread and is not on disk, **[carried]** or "not on disk before this gate";
where Teku confirmed it on his own screen, **[verified]**. §14 lists every premise of the Gate 83
brief that disk contradicted.

The per-gate detail lives in `CLAUDE.md`, one section per gate (Gates 75 to 82), and in the gap
register §2s to §2ad. This file is the summary to read first.

**Rule for this file:** it holds no text, figure or hash taken from a receipt photograph. The
money figures and merchant names below come from the seeded ledger and seeds
(`src/data/*.ts`), which are fixtures, not personal data. No corpus file stem appears.

**Where a ruling is attributed, the attribution is the source's own.** "Author not recorded"
means the source states the decision without saying who made it.

---

## Contents

1. [State at a glance](#1-state-at-a-glance)
2. [What Flow 11 is — screens and writers](#2-what-flow-11-is--screens-and-writers)
3. [The money model and the write path](#3-the-money-model-and-the-write-path)
4. [The data and the seed](#4-the-data-and-the-seed)
5. [The rulings](#5-the-rulings)
6. [Standards established, and the retrofit list](#6-standards-established-and-the-retrofit-list)
7. [Deviations from Figma](#7-deviations-from-figma)
8. [Deferred and closed items](#8-deferred-and-closed-items)
9. [Open decisions — Teku's](#9-open-decisions--tekus)
10. [Corrections to the record](#10-corrections-to-the-record)
11. [Residuals, known limits, and what Flow 11 did not do](#11-residuals-known-limits-and-what-flow-11-did-not-do)
12. [What follows](#12-what-follows)
13. [The gate list](#13-the-gate-list)
14. [Premises of the Gate 83 brief that disk contradicted](#14-premises-of-the-gate-83-brief-that-disk-contradicted)

---

## 1. State at a glance

| | at Flow 11 start (`mvp-gate74b`) | at `mvp-gate82` |
|---|---|---|
| tests | 643 [reported] | **1001**, in **38** spec files (`npx playwright test --list`) |
| spec files | 27 (`git ls-tree`) | **38** |
| visual baselines | 208 (`git ls-tree`) | **308**, all tracked |
| walk states (\|WALK\|) | 52 — 16 routes + 7 non-default tabs + 29 overlays | **77** — 25 routes + 7 + **45** overlays |
| ledger rows | 25 | **254** |
| DS pin | v2.8.0 (`b5b7b297…`) | **v2.8.0** (`b5b7b2975e5eef14257abd86c5ba34f20c70f949`), unchanged |
| `lint:tokens` | 77 files, 4 exemptions [reported] | **95 files, 4 exemptions** (run at Gate 83) |
| net worth | RM 464,958.84 | **RM 481,038.84** (+ RM 16,080.00 goal money) |
| persistence | none | **none** (NP1 — a reload restores every seed) |

Overlay counts are derived per tag from `e2e/harness.ts` with the anchored command
`awk '/^export const OVERLAY_STATES/,/^\]/' e2e/harness.ts | grep -c "^    overlay: {"`. The
baseline digest at `mvp-gate82` is `735974705ab0ed2947f2afe2f773df2e2047052596b89bedf3111a4df7405cc9`
by the standing command, identical in its filesystem and git-blob forms (re-derived at Gate 83).
Netlify served `main@eedfecf` as Published [verified by Teku, 9 Oct 2026; not re-derivable here].

**The flow's first money writer is the thing to know first.** Until Gate 81 every gate built a read
surface over a fixed seed. From Gate 81 on, the app writes: a Top-Up debits a cash account, credits
a goal and writes a ledger row, and closing a goal writes the reverse. Nothing is persisted, so
every write is lost on reload — and a spec that navigates by URL cannot observe a write at all
(§6, S7).

---

## 2. What Flow 11 is — screens and writers

Figma: Section `1266:14338` (`Finance_Plan`), file `v9MI8jxTaXiJA234Hkanlf` — six frames: the Plans
tab `1266:14339`, Add a Goal `1266:14340`, smart insight `1266:14341`, education `1266:14342`,
view-commitment `1266:14343`, goal drill-down `1266:14344`.

### 2.1 Screens

| surface | where | Figma | gate | what it does |
|---|---|---|---|---|
| **Savings Goals card** | `FinanceOverview.tsx`, `/finance` Overview tab | not drawn | 76 | A tenth balance-grid card summing every goal (`goalsTotal`). It is the only card in the grid that is not a `Holding`. Its tap switches to the Plans tab by callback. |
| **Plans tab** | `PlansTab.tsx`, `/finance` | `1266:14339` | 76 | Two `CardGoals` in a horizontally scrolling row (Figma's own row overflows), then seven commitments as `ListItem` rows. The goal cards became buttons that open the drill-down at Gate 78 (zero pixels moved). "Add New" on Goals only (since 81-B). |
| **Goal drill-down** | `GoalDetailScreen.tsx`, `/finance/plans/goals/:goalId` | `1266:14344` | 78 | Image with an "Ai Image" tag (only on AI artwork since 81-B), target row, progress bar, auto-save card with switch and pencil (the amount survives the switch being off), four Recent Contributions, "See All", and Top-Up / Edit Goals. An unknown id redirects to the Plans tab with `replace`. |
| **Contributions sheet** | `GoalContributionsSheet.tsx` | not drawn (a hidden empty `Bottom Sheet` `873:6583` is not a spec) | 78 | Every contribution, newest first, at the sheet's height cap; scrolls. "See All" is suppressed when the four rows are the whole list. |
| **Transaction detail — three dispositions** | `TransactionDetailSheet.tsx` | purchase drawn; transfer and income not | 79 | Purchase: the receipt block, unchanged. Transfer and income: a movement summary (From, To, Date, Type, Reference, a budgets line, and for a contribution a progress line). Type and the progress line are omitted, not drawn as an em dash, when the row has no source. |
| **Commitment drill-down** | `CommitmentDetailScreen.tsx`, `/finance/plans/commitments/:commitmentId` | `1266:14343` | 80 | Hero, three or four fact cards, and — for Internet only — the configured AI promotion banner. |
| **Smart insight** | `SmartInsightModal.tsx` | `1266:14341` | 80 | Offer artwork, current vs suggested price, derived monthly and yearly saving. |
| **Education panel** | `InsightEducationModal.tsx`, stacked over the insight | `1266:14342` | 80 | `icon_aiinsights` in an `IconObject color="ai"` badge (Decision 1 = B), title in the body. |
| **Receipts filter sheet** | `ReceiptFilterSheet.tsx`, from the Receipts filter icon | not drawn (Figma draws inline chips) | 80-B | Date range, link status and sort, committed on Apply; the chip row above the list is derived from the filter. Before 80-B the filter icon had no `onClick` at all and the chips were string literals. |
| **No-results state** | `src/components/NoResults.tsx`, on both filtered lists | not drawn | 80-C | Shown when a filter or search matches nothing; one action clears both. |
| **Ledger filter sheet chip rows** | `TransactionFilterSheet.tsx` | `1266:14329` draws them scrolling | 80-C | Wrap to two lines (overrides Figma; Teku, 3 Oct). |
| **Top-Up** | `TopUpModal.tsx`, from the drill-down | not drawn | 81 | Amount (RM) and a two-option `Radio` "From" labelled with balances; preview line; "Confirm Top-Up". No toast: the goal screen under the closing modal is the feedback. |
| **Add a Goal / Edit Goal** | `GoalFormModal.tsx` `mode="create"` / `"edit"` | Add drawn (`1266:14340`); Edit not | 81-B | Goal Name, Target Amount (RM), Target date, Auto-Save Amount / Month + switch, Funding Source (a dropdown that opens a picker view). Edit adds "Delete goal". |
| **Funding Source picker view** | inside `GoalFormModal.tsx` | not drawn | 81-B, height 81-C | `OptionList` single-select, rows carry balances; the card holds the form view's height. |
| **Delete goal? / "Goal deleted." toast** | stacked over Edit; Plans tab | not drawn | 81-B | Names the money being returned; the toast is raised on the tab it lands on. |
| **Auto-save amount editor** | `GoalDetailScreen.tsx` | not drawn | 81-B | One `Field` in a `Modal`. |

### 2.2 Writers

All are in `src/accounts/AccountsProvider.tsx`, which now exposes **12** mutators (counted from its
context type), **10** with a caller. The two without one are still `addTransaction` (Gate 48's seam)
and `adjustFiatBalance` (Gate 75's seam) — re-derived at Gate 83: neither has a call site in `src/`.

| writer | gate | writes | moves money |
|---|---|---|---|
| `topUpGoal(contribution)` | 81 | one ledger row, the source account's balance, the goal's `savedAmount` | yes — net worth unchanged |
| `createGoal(goal)` | 81-B | one goal, `savedAmount: 0` | no |
| `updateGoal(goalId, changes)` | 81-B | name, target, date, auto-save, funding account, image — **never `savedAmount`** | no |
| `deleteGoal(goalId, refund \| null)` | 81-B | removes the goal; if it held money, one credit row and the funding account's balance | yes — net worth unchanged |
| auto-save switch / pencil | 81-B | `updateGoal` only — no ledger row, nothing scheduled | no |
| image picker | 81-B | `updateGoal` with `imageOrigin: 'upload'` and an object URL | no |

**"Coming soon." toasts (MVP scope rule).** Four controls: "Edit Commitment", "Set Reminder", and the
insight's "View Promotion" and "Remind Me Later" (`CommitmentDetailScreen.tsx:62`). The two inside
the modal close it first, because a toast under a `Modal` would be hidden by its blanket.

---

## 3. The money model and the write path

### 3.1 `Transaction.kind`, and dispositions derived from it

- **`kind: 'payment' | 'transfer'` is required on every row** (Gate 75), stored and never derived
  from `method`: a Fund Transfer is a payment rail ordinary purchases use, and a Crypto Transfer is
  never a purchase (Teku, 30 Sept). There is deliberately no `'income'` value; direction is the sign.
- **Budgets count payments only.** `countsToward` (`src/data/derive.ts:1721`) tests, in order,
  `kind !== 'payment'` (`:1722`), `amount >= 0` (`:1723`), the category, then the date part
  inclusive at both ends (`:1725-1726`). Transfers are excluded **by kind, never by category**.
- **The disposition is derived, never stored** (Gate 79), `derive.ts:2110`:
  `kind === 'transfer'` → transfer; `amount >= 0` → income (`:2112`); otherwise purchase.
  **`kind` is tested before the sign, and the seed exercises it**: three seeded credits are
  transfers, and swapping the tests turns them into income while every count still closes.
  Zero is income, matching `countsToward`'s own boundary.
- **Only a purchase can carry a receipt.** `canCarryReceipt(t)` is `disposition === 'purchase'`. It
  gates the manual link picker and its Suggested block (Gate 79, closing MODEL-2) and auto-match's
  `candidatesFor` (Gate 81).
- **From / To are decided by the sign**, which in this ledger is relative to `accountId`: an
  outflow runs account → counterparty, a credit the reverse. A goal is looked up by `goalId`, not
  read off `merchant`, so renaming a goal renames its history.

### 3.2 Goals are their own collection, and net worth sums them as a separate term

- Goals are **not** a `Holding` (Gate 75): so a goal has no `holdingValue`, no holding drill-down
  route, and can never appear in the Top-Up source picker.
- `holdings` is derived from account state (`buildHoldings(accounts)`, Gate 75), closing a
  module-load trap that would have frozen net worth while the Homepage balance card moved.
- `netWorth(holdings, cryptoHoldings, goals)` takes **a required third argument** (Gate 76), so an
  omitted goal set is a compile error rather than a silent RM 16,080 shortfall.
- **The net-worth chart series is not given the goal term.** A goal carries no per-day value, and
  `series[last]` was already RM 9.41 below the hero before Flow 11 (the fixed deposit's accrual).
  The chart's accessible summary describes the series by its own endpoints since Gate 77.

### 3.3 `Goal.savedAmount` is stored, never derived

It is the stored authority, like `FiatAccount.balance`. The contribution rows are a slice of
history and are never summed into it; Gate 77 **deleted** the assertion that they sum to it,
because a Top-Up keeps the two in step only by writing both. The seeded rows do sum exactly
(Bali 16 rows = RM 5,040.00; Emergency 12 rows = RM 11,040.00), and `goalSavedAfter` (Gate 79)
walks back from the stored total to place a past row: both goals reach **RM 0.00** before their
oldest row, so the contributions account for the whole of each total. That supersedes the Flow 11
plan's "Bali opens at RM 3,840" model (§5.4).

### 3.4 The write path

- **The row is the instruction** (Gate 81). `topUpGoal(contribution: Transaction)` takes one
  argument: the account comes from `accountId`, the goal from `goalId`, both balances move by
  `amount`. Ledger, account and goal agree by construction. It throws on a malformed row rather
  than writing half of one.
- **Three sibling pure updaters, never one nested in another** (Gate 81-B). React 18 batches them
  because they share one event handler; that is what makes a write atomic. A first `deleteGoal`
  nested two setters inside the `setGoals` updater; StrictMode double-invoked it and credited the
  funding account twice (net worth RM 481,038 → RM 486,078). Only the net-worth assertion in
  `goal-writers.spec.ts` caught it; no baseline could.
- **`deleteGoal(goalId, refund | null)` takes two arguments** because a goal that holds nothing has
  no row to name it. With money, one credit row (`kind: 'transfer'`, positive, on the funding
  account, carrying `goalId`, a real reference, no receipt section, no Type row) returns exactly
  `savedAmount`. Net worth and both budgets do not move. A zero-balance goal writes no row.
- **A deleted goal's history needs nothing new.** Every contribution row already carries the goal's
  name in `merchant` and its photograph in `logo`; `movementParties` falls back to them when the
  `goalId` names no goal.
- **Edit never writes `savedAmount`** (`GoalEdit` has no such member), and a target below the saved
  amount is permitted, because Top-Up already produces overshoot.
- **A created goal starts at RM 0.00.** Figma draws no initial-deposit field, so Top-Up is the one
  way money enters a goal. Top-Up defaults to the goal's own funding account.
- **What a RM 125.50 top-up into Bali moves** (Gate 81, measured): Bali RM 5,040.00 → 5,165.50 and
  56% → 57%; Main RM 27,978.59 → 27,853.09; Savings Goals RM 16,080.00 → 16,205.50; ledger +1 row;
  **net worth unchanged at RM 481,038.84**; both budgets unchanged.

### 3.5 Routing

- The Plans tab is in-screen state (B7). Both drill-downs read app-level state (B8) and return with
  `{ financeTab: 'plans' }`.
- **The Savings Goals card's tap is a callback, not a `navigate`**: `/finance` → `/finance` would not
  remount `FinanceScreen`, so the tab would never change.
- An unknown goal or commitment id redirects to the Plans tab with `replace`. A goal id on the
  holdings route resolves to nothing, by construction.

### 3.6 Dates, magnitudes and the anchors

- Goal target dates, contribution dates and commitment due dates are typed data, exempt from B5.
  Commitment due dates are October 2026 (Figma prints 2025, which is in the past relative to the
  harness clock).
- `goalPercent` floors and clamps 0–100. A contribution row shows the magnitude (Figma prints it
  unsigned); in the ledger it is a debit on Main.
- The anchors, re-confirmed at Gate 82: `ledgerNow()` (`derive.ts:666`, read at `:741`) drives the
  Transactions date chips and the Homepage two-row strip; `receiptsNow()` (`:1343`, read at `:1377`)
  drives the Receipts date chips (Gate 80-B; measuring from `TODAY` matched 0 of 10). **15 Aug 2026
  is the harness clock only** (`PINNED_NOW`); only the fixed-deposit accrual and the net-worth
  month-to-date chart read the device clock.
- `TransactionLogo` gained a fourth case, `goal` (Gate 77), because goal images live in
  `/media/goals`; its `origin` is required since 81-B so an uploaded image resolves as a URL.

### 3.7 `Transaction.reference`

`MNRC` + `YYYYMMDD` + six Crockford base32 characters, 18 in all — e.g. `MNRC20260815XR2A7S`
(Gate 81, collecting Gate 79's request that a real format belong on the record, not in a display
helper). The 254 seeded rows are **backfilled deterministically** (FNV-1a over the id) so baselines
are stable; a **written** row's is random, which is what makes it a record rather than a function of
the id. `transactionReference` throws on a row with none rather than falling back to the slug.

---

## 4. The data and the seed

### 4.1 Goals, commitments, the offer

| goal | target | saved | percent | auto-save | funding | image |
|---|---|---|---|---|---|---|
| Bali Trip | RM 9,000.00 | RM 5,040.00 | 56% | on, RM 250.00 | Main | `goal_bali_trip.jpg`, `ai` |
| Emergency Funds | RM 12,000.00 | RM 11,040.00 | 92% | off, RM 900.00 | Main | `goal_emergency_funds.jpg`, `ai` |

`src/data/goals.ts`; asserted in `goals.spec.ts`. Gate 75 seeded the two filenames with no files behind them; the photographs are Figma's own image fills
(Gate 76: the node export returns a blank render; use `rawImages`). A created goal takes
`goal_placeholder.jpg` with `imageOrigin: 'placeholder'` (Gate 81-B).

**Seven commitments** (Gate 80, read row by row from `1266:14339`; Gate 75 had seeded the
inventory's five with no Figma access): Mortgage 1,200, Car Payment 500, Internet 120, Netflix 20,
Golf Lesson 20, Anytime Fitness 160, Phone Plan 35 (`src/data/commitments.ts`). Read-only, no link
to the ledger; their amounts disagree with the ledger's subscription rows, which is accepted
(ruling 4I). Mortgage draws the Material `home`, proven by path geometry, not by layer name.

**One offer** (`src/data/offers.ts`): Maxis, Internet, **RM 70.00**. Only the offer price is
stored; the current price is the commitment's own RM 120.00, so **RM 50.00/month and RM 600.00/year
are derived** (Teku, 30 Sept). Figma's education underlay still prints "Save RM 51/month" beside
"RM 600/year" (51 × 12 = 612) — one panel disagreeing with itself, which is the argument for
deriving.

### 4.2 The 28 contributions (Gate 77)

Moved out of `Goal` into the one ledger, none invented and none discarded: `kind: 'transfer'`,
`goalId`, `contributionSource` (`Auto Save` / `Manual Top-Up`, which Figma uses as the row title),
**negative on Main** (a past top-up debits its source), 09:00:00, `category: 'others'` (inert —
`countsToward` rejects on kind first). The ledger went 25 → 53 rows.

### 4.3 The spending history (Gate 82)

**200 purchases and 1 refund**, 2025-09-21 to 2026-09-11 inclusive, committed as 201 literal rows
generated by a deterministic script outside the repo (no clock, no `Math.random`). The ledger went
53 → **254**.

- Only the **14 merchants that ship a DS logo**; every row a **Card Payment on Main**; a weekly,
  fortnightly and monthly rhythm with payday-sized shops; fixed-date public holidays only.
- **Boundary cases on purpose:** first and last day of the window; one row at RM 499.90 inside the
  RM 500 preset and one at RM 501.35 outside it.
- **Collision guards:** no magnitude a receipt total, a spec locator or a typed fixture uses; every
  timestamp and id unique; no merchant repeats a timestamp label (`seed-history.spec.ts`).
- **AIA is absent** — its premium already carries a receipt, and a repeat would make the
  receipt-glyph test's amount key ambiguous.
- **The refund** `txn-ikea-refund-260117`, **+RM 129.00** of the RM 486.40 IKEA row: `kind:
  'payment'`, positive, so **income** — the first seeded row to reach that branch. No receipt, no
  budget, balance or net-worth effect. Walk state `detail-income`.
- **No receipt was added** (Teku, ruling labelled 1B). Amounts on receipt-eligible rows are
  **provisional**: when a receipt arrives its printed total wins. 129 of 200 are eligible and 89
  proposed (`D:\Claude\_handoffs\gate82-phaseA\RECEIPT-ELIGIBLE.md`, outside the repo).

Spend by month (the 200 purchases, RM 25,599.97 in total) and by category are tabled in the Gate 82
section of `CLAUDE.md`; every month is under the Monthly Budget's RM 7,500.

### 4.4 The invariants

**Class (i) — must not move, and did not** (pinned in `e2e/seed-history.spec.ts`):

| figure | value |
|---|---|
| Monthly Budget | spent RM 2,608.83, 65% left |
| Entertainment | spent RM 123.76, 87% left |
| stored balances | Main RM 27,978.59, Joint RM 15,000.00 |
| net worth | RM 481,038.84 |
| goals | Bali RM 5,040.00, Emergency RM 11,040.00 |
| `ledgerNow` | `txn-ifruits-0912`, 2026-09-12T16:13 |
| `receiptsNow` | 2025-09-13T18:50 |
| Homepage strip | iFruits Market, Rosyam Wholesale Express |
| receipt suggestions | no seeded receipt gains a suggestion from a new row |

**The budgets moved once in Flow 11, by design, at Gate 75:** Monthly 3,359.67 → **2,608.83** spent,
55% → **65%**, when the two crypto rows became transfers. Entertainment cannot move (it lists only
`dining`). Gate 77 (contributions) and Gate 82 (history) were each predicted and measured to move no
budget figure.

**Class (ii) — moved by design at Gate 82:**

| figure | before | after |
|---|---|---|
| ledger rows | 53 | 254 |
| `/finance/holding/main` rows | 49 | 250 |
| purchases / income | 20 / 0 | 220 / 1 |
| This Month / Last 7 / Last 30 | 2 / 2 / 3 | 9 / 4 / 19 |
| applied ladder (open → Card Payment → RM 500) | 53 → 16 → 14 | 254 → 217 → 213 |
| empty-state ladder | 2 → no results | 9 → no results |

### 4.5 Assertions edited, and what the screenshots now weigh

Gate 82 re-derived — never loosened — the seed-derived counts in `budgets.spec.ts`,
`transaction-disposition.spec.ts`, `no-results.spec.ts`, `link-editor.spec.ts` (the test the pre-mint run reported at `:128`; at
`mvp-gate82` it starts at `:129`) and the harness ladders (full before/after table in `CLAUDE.md`, Gate 82). **Its pre-mint run failed 62, not 60**:
60 visual plus that `link-editor.spec.ts` test in both themes, which counted month headings under a
Netflix search and was not predicted. Full-page captures of the 254-row list are **18,658 px tall
and about 2 MB**; the snapshot folder went 48 MB to 126 MB (§8.3).

---

## 5. The rulings

### 5.1 Teku's rulings

Verbatim where the source quotes him; otherwise as the source states the ruling.

| date | ruling | source |
|---|---|---|
| 21 Sept | **Undesigned work** (as `CLAUDE.md` states it, not a verbatim quote): what Teku designed in Figma is followed exactly; what he did not design follows Claude's judgement. | `CLAUDE.md` "The undesigned-work ruling" |
| 28 Sept | **MVP scope rule:** everything drawn in the 12 inventoried flows is MVP; a feature with no drawn flow is not; an undrawn action inside a scoped flow is built when another flow reads its data, otherwise it renders as drawn with a "Coming soon." toast. | "The MVP scope rule" |
| 28 Sept | **Top-Up debits the source account** (Claude designed the screen). | Flow 11 plan |
| 29 Sept | **Decision 1 = A:** v2.7.0 is skipped in the record. | Gate 74-B |
| 30 Sept | **A Crypto Transfer is never a purchase.** | Gate 75 |
| 30 Sept | **Decision 1 = A (Gate 75):** the three seeded credits are transfers — the field measures whether money was SPENT. | Gate 75 |
| 30 Sept | **"Bill payments to named merchants" means outflows to named merchants** (confirmed). | Gate 75 |
| 30 Sept | **The four Flow 11 rulings:** a Top-Up is a ledger row; crypto rows are transfers; a combined Savings Goals card; "See All" is a bottom sheet. The heading carries no author; per item, the crypto ruling is Teku's (Gate 75) and the sheet is "Teku's ruling" (Gate 78). | Gate 75 "The four Flow 11 rulings" |
| 30 Sept | **MODEL-1 is out of scope.** | Gate 75; register §2s |
| 30 Sept | **The Internet offer is RM 120 current and RM 70 offer; the saving is derived (RM 50/month, RM 600/year); the 51 is an error not to be reconciled back.** | register §2w; Gate 80 |
| 1 Oct | **Decision 1 = B:** the education hero is MVP-only — `icon_aiinsights` in the DS `ai` badge, and the gradient must be the DS's own token sequence, never hand-mixed. | Gate 80; register §2w |
| 2 Oct | **Receipts filter parity:** the Receipts filter is a sheet behind the icon (overriding Figma's inline chips). | Gate 80-B |
| 2 Oct | **The offer artwork:** Teku caught the shipped raster contradicting the panel and supplied a corrected file; the corrected raster ships as the banner. See §5.3 for what is not on disk. | Gate 80 |
| 3 Oct | **The ledger filter's chip rows wrap** (overriding Figma's scrolling rows). | Gate 80-C |
| 6 Oct | **The Funding Source is a dropdown with a picker view**, replacing an earlier Radio-group ruling for that field; **the Top-Up Radio group stays.** This is the one Teku-ruled exception to the app's "≤ three items is a Radio group" threshold (`PresetModals.tsx` `ReminderModal`). | Gate 81-B |
| 7 Oct | **Delete returns the money:** closing a goal returns its remaining `savedAmount` to its funding account as one ledger row; a zero-balance goal writes none. | Gate 81-B |
| 7 Oct | **One image source plus a provenance field** ("Teku's requirement, literally"); the "Ai Image" badge only on AI artwork. | Gate 81-B |
| 7 Oct | **The observation behind Gate 81-C**, verbatim: *"When changing funding source the whole modal become squeezed and relatively smaller size in height than the original edit or create goal modal. I'm not sure if this is the best UI/UX, perhaps the modal should stay the same height? just that it contains the two menu items? You may do your research to figure the best way to do this."* | Gate 81-C |
| date not recorded (before 8 Oct) | **No receipt for the new history rows** (labelled "1B" in Gate 82; this "1B" is not the Flow 11 plan's "1B"). A transaction can exist without a receipt and a receipt without a transaction. | Gate 82 |
| 8 Oct | **Accepted Claude's seed window** (see §5.2 and §5.3). | Gate 82 |

### 5.2 Claude's rulings — overturnable

Each stands until Teku says otherwise.

| date | ruling, and the reason | source |
|---|---|---|
| 28 Sept | **Decision 1 = B (delegated):** after Flow 11 — the data lineage map, persistence with the settings modal, recategorisation, then Flows 4, 5, 6, 2, 3 and 12. Each feature ships as a vertical slice. | Flow 11 rulings |
| 28 Sept | **6N:** a combined Savings Goals card, on the Joint Account precedent of an undrawn card. **4I:** commitments seeded and read-only. **1B:** the writers built (with the "Coming soon." list). **5L:** images as a reference string. | Flow 11 plan |
| 28 Sept | **Three clean runs stay the standard even past an hour.** | Flow 11 plan |
| 28 Sept | **Routes:** goal detail `/finance/plans/goals/:goalId`, commitment detail `/finance/plans/commitments/:commitmentId`, explicit `chrome.ts` prefixes, Back with `{ financeTab: 'plans' }`; Top-Up, Add a Goal, the insight and education as modals; Finance keeps five tabs. | Flow 11 plan |
| 30 Sept → 1 Oct | **Contributions are real ledger rows** with `goalId` and `kind: 'transfer'`, and `savedAmount` stays stored. Gate 77 records the change; the source does not name its author or the 30 Sept date. The review thread calls it Claude's ruling, exposed for overturn. | Gate 77; review thread |
| 1 Oct | **All 28 contributions debit Main**, negative — "Teku's own Top-Up ruling applied to a past top-up", with `main` "the one authored choice", reversible in one edit. | Gate 77 |
| 1 Oct | **Dispositions** (`kind` before sign; the movement summary replaces both the receipt block and Transaction info on a transfer). Author not recorded; the second half is "this gate's own call". | Gate 79 |
| 30 Sept | **The Savings Goals card's `cyan` tint** — a new category needs a tint no other holds; stated as a choice. | Gate 76 |
| 1 Oct | **Undesigned contributions sheet:** ✕ kept, title "Contributions", four recent rows, "See All" suppressed when the slice is the whole list. | Gate 78 |
| 2 Oct | **All seven commitment routes in the walk** (the plan had two). | Gate 80 |
| 2 Oct | **Two receipt filter axes** (date, link); merchant, total and read-state not built. | Gate 80-B |
| 3 Oct | **No-results:** `IconObject` + `filter_list`, the action clears search and facets, `aria-live` on the block. | Gate 80-C |
| 5 Oct | **The Top-Up source is a Radio group** — two cash accounts, below the app's own three-item threshold; balances are the decision input. "The one decision worth overturning if Teku disagrees." | Gate 81 |
| 7 Oct | **A target below the saved amount is permitted** ("a ruling on measurement"; author not recorded). | Gate 81-B |
| 7 Oct | **The picker view holds the form view's height** — Claude's judgement under the 21 Sept ruling; "Teku may overturn it." | Gate 81-C |
| 8 Oct | **The seed window is 21 Sept 2025 to 11 Sept 2026**, bounded by the budget rings (30 Aug – 20 Sept 2025) and by the newest-row anchor. Teku accepted. | Gate 82 |

### 5.3 Supplied by the review thread — not on disk before this gate

**Teku, 8 Oct 2026, on receipts** — verbatim, his spelling:

> "a transactrion can exists withhout a receipt and a receipt can exist without a transaction. The Receipt upload is an important feature to really sell Monarch cause then AI can read the line items and get user spending data very specifically. BUT making transaction without receipt and vice versa should not be a problem"

*Mechanism, noted beside the quote and not as an edit to it:* the line items are read on the device
by Monarch's own parser over Tesseract.js output (Decision 9), with no model at runtime — see
`FLOW-9-COMPLETION.md` §3.

**Teku, 8 Oct 2026, on the seed window** — verbatim, his spelling:

> "I accept your Decision as long as it's best industry standard practice for data scalability and arcitecture and the est UX according to your research"

*What that research was:* published seed-data guidance supports committing a static fixture
literally, with fixed dates and no runtime randomness, at a few hundred rows at most, with deliberate
boundary cases (Gate 82 records the first three as "engineering practice, not a measurement of any
product"). **The UX half of the ruling — which window — is Claude's reasoning from the app's own date
anchors, and was NOT backed by published research.**

**Teku's 1 Oct brief.** Only the fragment *"as if you're about to present this to investors for a
demo"* is a verbatim quote; the rest of the brief (fill the empty stretch with mock outflows of the
kind that carry receipts, content delegated to Claude) is a paraphrase. Gate 82's section now
carries both, labelled "as carried in the review thread"; before Gate 82 it was not on disk at all.

**Also carried, and not on disk:**

- **"Keep it a dropdown"** — the verbatim words of the 6 Oct Funding Source ruling. The ruling is on
  disk (Gate 81-B); the quote is not.
- **"Goal images stay modular"** (1 Oct). Not on disk as such. What is on disk: 5L (images as a
  reference string) and the 7 Oct provenance requirement.
- **The offer-artwork ruling's second half** (2 Oct): Claude raised objections to shipping the
  corrected raster; they stand on record in the review thread and are not reopened. Gate 80
  records only that Teku supplied the corrected file and that it ships.
- **"Exposed for overturn"** on the contributions ruling (above, §5.2).
- **Seed quality (1 Oct)** as a ruling: on disk only as Gate 77's "scheduled as a seed-quality pass
  after Flow 11" and Gate 82's brief.

### 5.4 Where sources conflict — both carried

| subject | source A | source B | what shipped |
|---|---|---|---|
| **The Internet offer** | Flow 11 plan, "Teku: 3H" (28 Sept): suggested RM 69, saving RM 51/month, RM 612/year | Teku, 30 Sept (register §2w; Gate 80): RM 120 / RM 70, RM 50 / RM 600, "the 51 is an error" | B — 120 / 70 |
| **A goal's saved amount** | plan (28 Sept): "the account's balance"; "Bali opens at RM 3,840" | Gates 75, 77, 79: `savedAmount` stored; the seed's rows sum to it from RM 0.00 | B |
| **The Top-Up source control** | plan (28 Sept): "From is a dropdown" | Gate 81 (Claude): a Radio group; Teku, 6 Oct: the Top-Up Radio stays | B |
| **The image pencil** | plan (28 Sept): a "Coming soon." toast; picker "with persistence's image storage" | Gate 81-B: a working image picker with provenance | B |
| **State** | plan: a new `PlansProvider`; `AccountsProvider` becomes a reducer at Top-Up | Gate 76: goals live in `AccountsProvider`, commitments as a constant; no `PlansProvider` exists; `AccountsProvider` has no `useReducer` (checked at Gate 83) | B |
| **Harness commitments** | plan: two commitments | Gate 80: all seven | B |
| **Smart insight entry points** | plan: "both drawn entry points" | Gate 80: the Plans-tab banner is unconfigured in Figma, so only the commitment detail opens it | B |
| **Merchant picker footer** | Gate 74-B: "flagged for Teku rather than settled" | register §2s (Gate 75): "a RULED EXCEPTION … permanent", ruler not named | ships with no footer |
| **The two Figma deviations at 81-B** (trigger reads "Main"; no Commitments "Add New") | Gate 81-B: "ruled by Teku, 7 Oct" | Gate 81-C: Claude proposed both; Teku saw them on device and did not object | shipped; deviations stand until Teku says otherwise |
| **Horizontal overflow rows** | brief: a 28–30 Sept ruling on rows with no visible scrollbar | disk: the Gate 44 standing convention "no visible scrollbar, anywhere, ever", and Teku's 3 Oct ruling that the ledger rows wrap | wrap (3 Oct) |
| **The Flow 11 gate plan** | plan: 75 model, 76 goal detail, 77 commitments, 78 writers, 79 record | disk: twelve gates 75–82, record at 83 | twelve gates |

---

## 6. Standards established, and the retrofit list

**Earlier surfaces do not all use these standards.** A designated retrofit session comes after the
priority flows; nothing older is changed opportunistically.

| # | standard | established |
|---|---|---|
| S1 | **A dropdown inside a Modal or Sheet becomes a dedicated selection view**: the overlay retitles to the task, back left, close right, flat full-bleed option rows, nothing else. A multi-select picker commits through a footer "verb + count", disabled at zero; a single-select picker commits on tap with no footer (the DS `OptionList` prop doc). The merchant picker is a permanent exception (its zero state is the "All merchants" row). The header is the DS `OverlayHeader` (v2.8.0): two fixed, identical side tracks, so the title stays centred and an absent icon still holds its slot (verified in the rendered DOM, Gate 78 — Teku flagged it as very important); the close glyph is neutral, not blue. | 74-B, 75, 78, 81-B |
| S2 | **The picker view holds the form view's height**, as a floor, never a fixed value — both views in one grid cell; the held form `visibility: hidden` + `inert` + `aria-hidden`; **the footer slot is part of the floor**. Header, title, back and close do not move. | 81-C |
| S3 | **The row is the instruction; one argument where possible; three sibling pure updaters, never nested.** | 81, 81-B |
| S4 | **Never omit a defaulted DS prop the design wants off** (`hasReceiptIcon={false}`, `hasIcon={false}`, `hasSubtitle={false}`). | 76, 78 |
| S5 | **A seed change is checked against seven things** — budget ranges, both anchors, `candidatesFor` / `rankedSuggestions`, the chip counts and ladders, screenshot height, and every assertion that counts something. A row count is a value: grep the suite for the old figure. | 77, 82 (register §2ad) |
| S6 | **A seed is committed as literal rows**: fixed dates, no runtime randomness, a few hundred at most, deliberate boundary cases. | 82 |
| S7 | **A cross-screen assertion about a write navigates through the app's own controls**, never by URL — a reload reseeds and a URL-navigating spec passes against a writer that does nothing. Binds every writer until persistence. | 81 |
| S8 | **Sweep before predicting; predict in writing; reconcile against a manifest outside the repo; open every minted PNG.** A picture is content and is reviewed by reading it. Regenerate the reference manifest after every mint. Predict which baselines move by what is PAINTED at the coordinates, and remember `elementFromPoint` sees only the viewport while a full-page capture includes the undimmed tail below the fold. | 75, 77, 79, 80 |
| S9 | **Mutation proofs**: run exactly one test by a `$`-anchored regex-escaped title, no shell; the mutated tree must typecheck; the failure must be an assertion with its expected signature; restore SHA-identical; a negative control runs first. A mutation must change behaviour and stay type-valid (five were refused at 81 for deleting an identifier's only use); needles are matched with CRLF normalised. A mutation that survives exposes a test that cannot fail. | 78, 80-B, 80-C, 81, 81-B |
| S10 | **Scope an assertion to the element that should produce the value** — a name check the surrounding chrome also satisfies cannot see a broken fallback. | 81-B |
| S11 | **Poll a load-dependent read** (`naturalWidth`) rather than reading it once; cold caches only appear under full-suite load. | 81-B |
| S12 | **Locators:** `Field` and `Select` are named by their visible label; a `Select`'s value is an `<input value>`; a `Toggle` and a DS `Radio` are operated by their `<label>`; `:has-text()` is a substring match; `getByLabel` ignores `aria-hidden`, so use role queries to prove a control is unreachable; the dialog's name changes when a view retitles; select a row by a unique field (twelve contributions share −RM 250.00, so Gate 79 selects by timestamp); a row written during a test is not the newest row (the seed runs past the harness clock). | 74-B, 79, 80-B, 81, 81-B, 81-C |
| S13 | **A throwaway probe spec is allowed in a read-only phase** if it is deleted, the tree verified clean, and it is reported. | 75 |
| S14 | **Three clean runs, sequential, are the standard**, even past an hour. | plan, 28 Sept |
| S15 | **Figma is reached by an authenticated round trip, not a port check**; the remote connector worked and `figma-local` refused at every Flow 11 gate that read Figma. A layer named "Bottom Sheet" has been a `Modal` four times — geometry wins. | 78–81-B |
| S16 | **A comment that restates a derived count is deleted, not corrected** (the WALK arithmetic comment, Gate 81). Byte-scan line endings; `grep -c $'\r$'` is not a CRLF detector; compare record growth by `git diff --numstat` (lines), never by bytes against `git show`. | 75, 78, 81 |
| S17 | **When a new screen uses a DS primitive the app normally wraps, check the guard that asserts on the wrapper.** `section-headers.spec.ts` fails on a DS `Label` outside `.mvp-section-header`; Gate 78 added one reasoned `BYPASS_EXCEPTIONS` entry, and `NoResults` renders no `Label` so needs none. A live region goes on the block that appears, not on the results region. | 78, 80-C |

### The retrofit list (register §2ac)

| site | host | what the retrofit owes |
|---|---|---|
| `BudgetFormModal.tsx:179` — Category picker | `Modal` | S2 — the same shape; the card collapses to a list with no footer, so the footer slot must be held |
| `TransactionFilterSheet.tsx:372` — Merchant picker | `Sheet` | its own ruling: the merchant view already sits at the 764 cap and grows rather than shrinks |
| all three pickers | — | a focus return to the trigger on Back (focus lands on `body` today) |
| `GoalFormModal.tsx` — Funding Source | `Modal` | the reference implementation; nothing owed |

---

## 7. Deviations from Figma

| # | Figma draws | what shipped | why | who |
|---|---|---|---|---|
| 1 | no Savings Goals card | a tenth balance-grid card, `cyan` tint | net worth must show goal money | 6N; tint Claude (76) |
| 2 | two goal cards overflowing a 343 column | the same, as a scrolling row | Figma's own row overflows; the Smart Insights disposition | Gate 76 |
| 3 | commitment tints teal / gray | transcribed, not derived from category (which gives red / lime) | follow the frame | Gate 76 |
| 4 | "next on 1 Oct" | "next on 01 Oct" | one date formatter | Gate 76 |
| 5 | due dates in 2025 | October 2026 | 2025 is past relative to the harness clock | Gate 80 |
| 6 | a hidden empty `Bottom Sheet` on the drill-down | an undesigned contributions sheet | the node specifies nothing | Gate 78 (Claude) |
| 7 | "Manual Top Up" and "Manual Top-Up" in one list; "Edit Goals" plural; three date formats in one Section | hyphenated everywhere; "Edit Goals" as drawn; one formatter per date shape | inventory A4 / A5 / A7 | Gate 78 |
| 8 | `body/sm` at 20px line height | 16px (rows 4px shorter) | a deliberate DS responsive token | — (DS) |
| 9 | the image pencil on raw `rgba(0,0,0,0.4)` | `--mapped-surface-overlay-default` | two chips on one photograph share a surface | Gate 78 |
| 10 | contribution title in default text | subtle text (G48) | shipped as the DS paints it; DS round | G48 |
| 11 | no transfer or income detail | a movement summary replacing the receipt block and Transaction info | undesigned | Gate 79 |
| 12 | Mortgage glyph (layer suggests custom) | Material `home` | proven by path geometry | Gate 80 |
| 13 | a 43px multi-colour bulb | `icon_aiinsights` in a 40px `ai` badge | Decision 1 = B | Teku |
| 14 | education title in the header | title in the body | `1266:14342` draws no header title | Gate 80 |
| 15 | an action bar pinned to the bottom | in flow (pinning was built and reverted) | two drill-down bars agreeing outranks one frame | Gate 78 precedent |
| 16 | the receipt filter chips inline; no sort control | a sheet behind the icon; sort inside it; no ✕ (parity with the ledger sheet) | Receipts filter parity | Teku, 2 Oct |
| 16a | two hidden chip slots reading "Watson" and "RM 0 - 500" | not built | copy-pasted from the Transactions row; not evidence for a receipts merchant or amount facet | Gate 80-B |
| 17 | receipt chips 8px apart in the MVP | 12px | Figma's `Frame 467` | Gate 80-B |
| 18 | ledger chip rows scrolling (458 and 454 in 343) | wrapped, two lines | Teku, 3 Oct | Teku |
| 19 | no empty / no-results state | `NoResults` on both lists; the derived chips stay visible above it; its action is `secondary` (a primary "Add new receipt" sits above it) | undesigned | Gate 80-C |
| 20 | no Top-Up | Top-Up modal, `Radio` source | undesigned | Gate 81 (Claude) |
| 21 | Target Amount as `Select / Transfer` | `Field type="number"`, "(RM)" in the label | `SelectTransfer`'s currency picker cannot be suppressed (G49) | Gate 81 |
| 22 | Funding Source value "Bank Account - Main" | "Main" in the trigger; the picker rows carry the balance ("Main · RM 27,978.59") | no field backs the prefix; the balance is the decision input, the trigger only names the account | proposed by Claude, not objected to |
| 23 | "Add New" on both Plans headings | Goals only | no commitment writer exists | proposed by Claude, not objected to |
| 24 | no Edit, delete, picker view, amount editor or auto-save-off state | all built from shipped parts | undesigned | Gate 81-B |
| 25 | no initial deposit; no image field | a created goal starts at 0; image chosen on the drill-down | as drawn | Gate 81-B |

---

## 8. Deferred and closed items

Format: **where** — **the problem** — **the decision**. "Paused" means no solution is chosen;
"solution concluded, fix put off" means it is chosen and waits.

### 8.1 Open DS gaps reached by this flow

| gap | where | the problem | the decision |
|---|---|---|---|
| **G48** (opened 78) | `ChartLegendItem` `variant="contribution"`; the drill-down and the sheet | the title paints subtle where Figma binds default | **Paused.** Shipped as the DS paints it; the DS round reads the component set first |
| **G49** (opened 81) | `SelectTransfer`; Add a Goal and Top-Up | its currency picker cannot be suppressed | **Solution concluded, fix put off:** a `showCurrency` prop, DS round. The MVP uses `Field` instead |
| **G21** | `Select`; the category and Funding Source triggers | `aria-expanded` announced on a trigger that navigates | Paused, DS round. Two adopters now |
| **G22** | `Menu` | no `aria-multiselectable` | Gone from the app (both pickers use `OptionList`); entry open against `Menu` |
| **G32** | `ReceiptViewer` back control | `Modal.onBack` now exists | One-prop change; moves **12** baselines; retrofit session |
| **G33** | `.mvp-receipt-viewer-modal` | `Modal` has no height cap | Workaround in place with its removal condition; the goal forms fit without it, and the Funding Source picker and its form are equally uncapped (asserted at 375 × 560) |
| **DS focus trap** | `Modal.tsx` `getFocusable` | ignores `inert` and `visibility`; already leaks in the picker view | Recorded, not registered; DS round |
| **Dark `OptionList` row** | the Funding Source picker, dark | an unselected row paints the page surface on the elevated card | **OPEN — §9** |

Every other open entry carries forward unchanged (G6, G13, G14, G17's prop half, G19–G23, G28–G33,
G44). **Tally, derived incrementally:** 46 entries, 29 closed, 17 open at Gate 74-B (§2r); G48 opened
(§2u); G49 opened (§2z); nothing else moved — **48 entries, 29 closed, 19 open; highest G49**.

### 8.2 Closed during this flow

| item | closed by |
|---|---|
| UI-1 (merchant picker panel-in-panel) | Gate 74-B |
| UI-2 (Academy card under the nav) | **already closed at Gate 64** (Teku confirmed on device, 23 Sept); listed here only because the Gate 83 brief listed it as deferred |
| UI-4 (ledger chips off-screen) | Gate 80-C (Teku, 3 Oct); cost 4 baselines, not the 12 estimated |
| MODEL-2 (link picker offers transfers) | Gate 79; residual (`candidatesFor`) Gate 81 |
| `NetWorthCard` summary used the hero figure | Gate 77 |
| "Ai Image" badge unconditional | Gate 81-B (`imageOrigin`) |
| the reference printed as a slug | Gate 81 (`Transaction.reference`) |
| ten months of savings-only ledger | Gate 82 |
| income disposition unphotographed | Gate 82 (`detail-income`) |
| Receipts tab with no empty state | Gate 80-C (`NoResults`) |
| the WALK arithmetic comment | Gate 81 (deleted) |

### 8.3 Deferred — MVP side

| item | where | the problem | the decision |
|---|---|---|---|
| **UI-3** — carried every time until resolved on device | the Android status strip, installed app (`index.html` `theme-color`, `src/shell/useStatusBarColor.ts`) | an installed web app cannot paint a transparent status strip | **Solution concluded, fix put off:** package as a native Android app (Teku, 23 Sept), after the remaining flows; the route is not chosen and must be decided against D1 |
| **MODEL-1** — unowned | `countsToward`, `derive.ts:1721` | a budget has no account scope; residual RM 175.32 of Monthly from Joint | **Paused** (Teku: out of scope, 30 Sept); no gate owns it. The Top-Up writer cannot widen it. No `G` number by design (no DS release can close it); the name is Claude's and Teku may rename it |
| **The zero-amount predicate** — OPEN | `transactionDisposition`, `derive.ts:2112` | a non-transfer row of exactly 0 classifies as income | **OPEN.** Gate 81 put a `sen > 0` guard in the Top-Up form and handed the predicate to 81-B; **Gate 81-B's record does not address it.** No writer today emits a non-transfer zero |
| **Contrast findings** | DS tokens | warning text 2.34:1 light / 4.22:1 dark; subtle-on-subtlest 4.33:1 light (`FLOW-9-COMPLETION.md` §7); the net-worth card's three AA shortfalls (Gate 31) | DS round; the net-worth card is a ruled trade |
| **Red delete buttons** | `tone="error"` tertiary: "Delete goal" (`GoalFormModal.tsx:267`, `:431`), budgets, receipts | dark-mode contrast short of AA (label 4.16, icon 2.83) | Accepted and deferred to the DS round (1A, Flow 10) |
| **Plans-tab promotion banner** | Figma `I1266:14339;870:6776` | unconfigured in Figma (placeholder body and action) | Out of scope; the Plans tab draws no banner. Configuring it is a Figma edit, Teku's |
| **Masked account number** | the transfer summary's From row | `BankHolding.accountNo` exists and is not printed | Teku's call; two of five non-contribution transfers move through a wallet with no number |
| **First-run empty state** | both collections | nothing can empty a collection today | Arrives with persistence |
| **`NoResults` promotion** | `src/components/NoResults.tsx` | two consumers in two flows | DS round candidate; stays in `src/components/` if declined |
| **Funding Source picker view** | `GoalFormModal.tsx` | undesigned in Figma | **The first thing Teku should draw**, so the app follows a frame instead of a precedent |
| **Commitments "Add New"** | `PlansTab.tsx` | not rendered (Figma draws it) | No commitment writer exists; a "Coming soon." toast is ~15 lines and no extra baseline if wanted |
| **Funding Source trigger text** | `GoalFormModal.tsx` | "Main" where Figma prints "Bank Account - Main" | Stands until Teku says otherwise |
| **`ariaLabel` sites** | `GoalFormModal` 8, `BudgetFormModal` 7, `ReceiptEditor` 4, `TopUpModal` 1 = **20 sites** (counted at Gate 83) | `Field`/`Select` take the visible label as the name, so a different `ariaLabel` is inert there | **How many of the 20 are dead is UNESTABLISHED** (a `Toggle`'s is live). Tidy-up, Teku's |
| **Auto-save** | `GoalDetailScreen.tsx` | the switch and pencil store a value and nothing reads it on a schedule; nothing persists; the off state has no treatment | No scheduler; Academy reads the flag later; persistence first |
| **Goal placeholder image provenance** | `public/media/goals/goal_placeholder.jpg` | recorded only in `CLAUDE.md` Gate 81-B (600×204, 1,501 B, flat `#cfd5dc` = `--brand-slate-200`); `public/media/goals/README.md` still says "Two images" and does not list it | A one-line README addition at the next gate that touches that folder |
| **Uploaded goal image** | the image picker | an object URL dies on reload; no generation path exists, so the "generated → `ai`" contract is unexercised | Persistence's image storage |
| **Sort commits on Apply** | `ReceiptFilterSheet.tsx` | a sort tap no longer applies live | Flagged for Teku at Gate 80-B; no ruling on disk |
| **Screenshot weight and capture height** | every `/finance [tab:transactions]` state, `/finance/holding/main`, the two link-picker states | 18,658 px, ~2 MB each; folder 48 → 126 MB | **Solution concluded, fix put off:** cap the capture height or capture viewport + one scroll; hygiene or retrofit session (moves the same 56 baselines) |
| **Harness clock precedes the newest row** | `PINNED_NOW` 15 Aug 2026 vs `txn-ifruits-0912` 12 Sept 2026 | a reader can mistake the harness date for "today" | **Paused**; nothing reads it for ledger dates |
| **Card-payment-only seed** | the 201 Gate 82 rows | one method, one account | Shipped; revisit when a flow introduces other methods |
| **Merchants without a logo** | the seed — no TNB, no water | a utility-bill history is missing | Deferred: logos are Teku's outstanding work, and no fallback rendering exists |
| **AIA absent from the history** | the seed | an annual premium would be realistic | Omitted on purpose (receipt-glyph key) |
| **The 16–20 Sept 2025 hole** | the seed | five empty days inside both budget ranges | Known residual: filling them moves both rings |
| **Stale harness comment** | `e2e/harness.ts:1164` | "INCOME GETS NO WALK STATE BECAUSE THE SEED CONTAINS NO INCOME ROW" — false since Gate 82 | Comment-only fix at the next harness edit |
| **Receipt-eligible rows** | `D:\Claude\_handoffs\gate82-phaseA\RECEIPT-ELIGIBLE.md` | 129 eligible, 89 proposed; amounts provisional | When receipts are added, the printed total wins |
| **Stale `PlansTab.tsx` header** | `PlansTab.tsx:30` | says "Add New" is rendered on neither heading and "Add a Goal is Gate 79's" — false since 81-B | Comment-only fix at the next edit (found at Gate 83) |
| **Gate 31 mount race** | `gotoRoute`, `e2e/harness.ts` | fired 1 in 7 full runs at Gate 80-C, not since | Recorded, not closed |

### 8.4 Named in the Gate 83 brief, not on disk

**UI-5** does not exist on disk — the register and `CLAUDE.md` know UI-1 to UI-4 only. If it was
raised in the review thread, it needs writing down before it can be carried.

---

## 9. Open decisions — Teku's

**Both are OPEN.** No ruling was pasted with the Gate 83 brief.

**1 · The dark picker's black second row.** In dark mode the Funding Source picker's unselected
`OptionList` row paints the page surface (near-black) on the modal's elevated card. It is the DS
component's behaviour and is already in the pre-Gate-81-C baselines
(`finance-plans-add-goal-source-*-dark`); register §2ac records it, not caused by 81-C. **Options:**
log it as a DS-round defect, or accept it as intended.

**2 · Transactions date labels carry no year.** The label is built by `formatTimestamp`
(`src/data/format.ts:121-126`, with `DAY` at `:113` formatting `{ day, month }` only) and rendered as
the row's `amountInfo` at `src/flows/finance/TransactionsLedger.tsx:429`. With the ledger now spanning
September 2025 to September 2026 in one flat date-descending list with no month headings, "03 Sept"
appears for both years. Seen on Teku's device, 9 Oct (review thread). **Options:** leave as designed;
add the year to rows older than the current year; or add month-and-year headings as the Receipts tab
does. (The exact pair in the brief needs a note: the 2026 Anytime Fitness row reads "03 Sept, 07:48"
and its 2025 counterpart reads "03 Sept, 07:45" — `seed-history.spec.ts` pins that no merchant
repeats a label — so the two rows differ by three minutes, not at all by year. See §14.)

---

## 10. Corrections to the record

Committed text is never edited; these stand here instead.

| # | what an earlier record or message says | what is true | how established |
|---|---|---|---|
| 1 | Gate 81 commit message: "Baselines 280 → 280" | **272 → 280** (8 added, 4 changed) | `git ls-tree` at `mvp-gate80c` and `mvp-gate81`; already corrected in 81-B's message and section |
| 2 | Gate 81 commit message: reference "YYMMDD + 8 random" | **`MNRC` + `YYYYMMDD` + 6**, 18 characters | the code; 81-B |
| 3 | "74 tags after the re-tag" (review thread) | 74 local tags existed **before** the stray `mvp-gate82` was deleted, **73** after (Gate 81-B); **76** today (`git tag -l \| wc -l`) | 81-B section; `git` |
| 4 | "20 mutation proofs" at 81-B | the negative control plus 19; the final set is NC + M1–M26 (27) | 81-B section |
| 5 | `derive.ts:1737` cited for a budget clause (review thread) | `:1737` is `budgetAvailable`'s doc comment; the `amount >= 0` sites are **`:1723`** (`countsToward`) and **`:2112`** (`transactionDisposition`) | opened at Gate 83 |
| 6 | Gate 77: "October 2025 through July 2026 contain no spending" | spending was empty **16 Sept 2025 to 11 Sept 2026** | Gate 82 date check |
| 7 | (any text treating budgets as current) | the rings describe the **fixed period 30 Aug – 20 Sept 2025** (`src/data/budgets.ts`) and read no clock | Gate 82 |
| 8 | (any text treating 15 Aug 2026 as "today") | it is the **harness clock only**; Transactions chips anchor on the newest ledger row, Receipts chips on the newest receipt; only the fixed-deposit accrual and the net-worth month-to-date chart read the device clock | Gate 82 |
| 9 | (any text saying a receipt's tax and total are derived) | seeded receipts store tax and total **as transcribed**; only the subtotal is derived | Gate 82; `FLOW-9-COMPLETION.md` §3.2 |
| 10 | "Gate 82's pre-mint failed 60" | **62**: 60 visual + the `link-editor.spec.ts` "Suggested is omitted" test in both themes (reported at `:128`; `:129` at `mvp-gate82`) | Gate 82 run log, as recorded |
| 11 | Gate 76: the Plans-tab banner reads "RM69/month Potential Savings." | the banner is **unconfigured**; no figure appears on it | Gate 80 re-read; corrected in place on Teku's instruction |
| 12 | Gate 81-B: two Figma deviations "ruled by Teku, 7 Oct" | Claude proposed both; Teku saw them and did not object | Gate 81-C |
| 13 | Gate 75 seeded **five** commitments as the count | Figma draws **seven** | Gate 80 |
| 14 | Gates 75, 76, 78: `e2e/harness.ts` is wholly LF | wholly **CRLF** by byte scan | Gate 81-B |
| 15 | Gate 76 commit message: "Flow 11's writers are Gate 79's" | the writers shipped at **81** and **81-B** | `git log` |
| 16 | Gate 77 commit message: "Gate 80 makes the source user-chosen" | **Gate 81** did | `git log` |
| 17 | Flow 11 plan: "Bali opens at RM 3,840" | the seed's contributions account for the whole RM 5,040 from **RM 0.00** | Gate 79 `goalSavedAfter` |
| 18 | Gate 80-C: Teku's 3 Oct ruling premised on the fourth chip being absent | 28.39px and 23.28px of it **were** visible; the ruling stands on the sliver being unreadable and the rows wrapping to exactly two lines | Gate 80-C measurement |
| 19 | Gate 64: the receipts sort control's provenance "provisional" | **settled**: Figma draws no sort control | Gate 80-B re-read |
| 20 | Gate 80-B: UI-4's fix "moves 12 baselines" | it moved **4** | Gate 80-C |
| 20a | `useStatusBarColor.ts` ("wrong on 12 of 14 routes") and a `finance.css` gate reference | stale by two routes since Gate 69; corrected at Gate 78 | Gate 78 |
| 20b | Gate 81 record: the digest is "the filesystem form, not the git-blob form" | every baseline is tracked now and the two forms agree (`735974…05cc9` at `mvp-gate82`) | re-derived at Gate 83 |
| 21 | Gate 81 record: the zero predicate "will be re-examined in 81-B" | 81-B's record **does not mention it**; it is open and unowned | `CLAUDE.md` Gate 81-B (searched) |

---

## 11. Residuals, known limits, and what Flow 11 did not do

**Known limits:**

- **No persistence (NP1).** A reload restores every seed: a top-up, a created or deleted goal, an
  uploaded image and a receipt are all lost.
- **Nothing is scheduled.** Auto-save stores a flag and an amount; nothing ever moves money on a
  timer.
- **Commitments are read-only** and unlinked from the ledger; the commitment amounts disagree with
  the ledger's subscription rows by design (4I).
- **`goalId` on the delete-return row is held by a code guard only**; after the delete, the UI
  cannot tell it from the `merchant` fallback, so no spec pins it distinctly.
- **`goalId` and `contributionSource` are two peer optionals** that must be set together; the type
  cannot say so, and `goals.spec.ts` asserts it both ways instead.
- **The chart's last point is not the hero figure** (goal money, and the fixed deposit's accrual).
- **`min-height: 100%` on the drill-down screen roots is inert** (Gate 80).
- **The Gate 33 lone-card rule is dormant** at ten balance-grid cards; the same parity rule holds the commitment detail's lone third fact card to one column (Gate 80).
- **The receipt-glyph test's join key is the formatted amount**, unambiguous only because every row sharing an amount gives the same answer (twelve contributions share −RM 250.00); uniqueness was sufficient, not necessary (Gate 77).
- **The empty ledger list collapses by `:empty`**, the mechanism the chip rows already use (Gate 80-C).
- **The Receipts applied walk state matches zero** — every seeded receipt is linked, so no two-chip filter over the seed can do better; it photographs the no-results state.
- **Money moved by a write is asserted, not photographed:** no walk state shows the source balance, the Savings Goals card or the written ledger row after a write (Gates 81, 81-B).
- **"This Month" measured from `TODAY` would match two rows**, both savings contributions — the
  reason the date facet anchors on the newest row.
- **The theme switch overlaps the last contribution row** in full-page goal-detail captures (fixed
  chrome over a tall capture; pre-existing).
- **The section-headers mount race** (Gate 31) recurred once in seven runs at 80-C and has not
  appeared since; recorded, not closed.
- **The DS was adequate for every undesigned surface** in the flow; no DS release was needed after
  the v2.8.0 re-pin (v2.7.0 had already added `CardDataDisplay` orientation and `InlineMessage ai`
  for this flow).

**What Flow 11 did not do:**

- no commitment writer (add, edit, reminders), no offer writer ("View Promotion", "Remind Me Later");
- no scheduled auto-save, no initial deposit, no account picker for creating an account;
- no image generation, no persisted images;
- no change to MODEL-1, the zero predicate, or the Plans-tab banner;
- no receipt for any new history row; no OCR change;
- no retrofit of earlier pickers or surfaces;
- no DS change after the v2.8.0 re-pin.

---

## 12. What follows

The agreed order after Flow 11 (Decision 1 = B, Claude delegated by Teku, 28 Sept 2026):

1. **The data lineage map** — `MONARCH-MVP-DATA-LINEAGE.md`.
2. **Persistence**, with the settings modal and the first-run empty states. From persistence on, a
   flow gate's definition of done includes saving its own records and updating the lineage map.
3. **Transaction recategorisation.**
4. **Flows 4, 5, 6, 2, 3 and 12.**

After the priority flows: **the designated retrofit session** (§6), the DS round (§8.1), and the
native Android packaging that resolves UI-3.

---

## 13. The gate list

Commit SHAs are `git rev-parse <tag>^{commit}`; dates are the commit dates. Baselines, spec files
and overlay states are derived per tag from `git ls-tree` and `git show <tag>:e2e/harness.ts`; test
counts are **[reported]** from each gate's record (the suite was not run at old tags).

| gate | tag | commit | date | tests | baselines | specs | overlays | what it did |
|---|---|---|---|---|---|---|---|---|
| 74-B | `mvp-gate74b` | `7a5ea0cc94139c39557851b9d8f323e044884186` | 09-29 | 643 | 208 | 27 | 29 | DS v2.8.0 re-pin; both pickers rebuilt; UI-1 closed (context) |
| 75 | `mvp-gate75` | `1e3f3258eeb9320d2ebc9498067c12f815d1d27d` | 09-30 | 653 | 208 | 28 | 29 | `Transaction.kind`; goals and commitments seeded; `holdings` derived; MODEL-1 |
| 76 | `mvp-gate76` | `43a83ab66a490ec48d53d2ee582a7cf389d9971d` | 09-30 | 666 | 208 | 29 | 29 | Plans tab; Savings Goals card; net worth includes goals |
| 77 | `mvp-gate77` | `4c8c0f7882cbddb09f7e963066ad4411cac2eac4` | 10-01 | 667 | 208 | 29 | 29 | contributions become ledger rows; MODEL-2 opened |
| 78 | `mvp-gate78` | `3cfe605328193df0f3053fc9a68678804ba6d209` | 10-01 | 709 | 220 | 30 | 30 | goal drill-down; contributions sheet; G48 |
| 79 | `mvp-gate79` | `2276557e0d5b558a14b11d54cbc09d5ba8fa96c4` | 10-01 | 738 | 224 | 31 | 31 | dispositions; MODEL-2 closed |
| 80 | `mvp-gate80` | `e58cedaf5808eb51b023a823b2f0088d4dabf658` | 10-02 | 823 | 260 | 32 | 33 | commitment detail; smart insight; education; seven commitments |
| 80-B | `mvp-gate80b` | `4429bf31db4ea59d784365e97586858083267494` | 10-03 | 852 | 268 | 33 | 35 | Receipts filter sheet |
| 80-C | `mvp-gate80c` | `e99db9af01f09b7f8ce40530087dadc1561d9858` | 10-05 | 870 | 272 | 34 | 36 | chip rows wrap; `NoResults`; UI-4 closed |
| 81 | `mvp-gate81` | `31237cca4929f56f46fdb58b7bd04be054822dbb` | 10-06 | 907 | 280 | 35 | 38 | Top-Up; `Transaction.reference`; G49 |
| 81-B | `mvp-gate81b` | `c616e663e95646a5b4e1e03580faf67952fb25b0` | 10-07 | 976 | 304 | 36 | 44 | goal lifecycle: add, edit, delete, auto-save, image |
| 81-C | `mvp-gate81c` | `92f6a36cf607502fbaf2b9b8439fe66e478b6831` | 10-08 | 982 | 304 | 37 | 44 | picker view holds the form's height |
| 82 | `mvp-gate82` | `eedfecff8fc35c812370d84aceca90a3874dce35` | 10-09 | 1001 | 308 | 38 | 45 | 200 purchases and a refund |
| 83 | *(Teku's to tag)* | — | 10-09 | 1001 | 308 | 38 | 45 | this record; no code change |

`mvp-gate82` is an annotated tag (tag object `a155284398a17578da250f2e864f39bbec628d99`) peeling to
`eedfecff…` locally and on the remote. There are **76** tags. **There is no `mvp-gate74`** (Gate 74
stopped without committing; its documents are parked at `D:\Claude\_handoffs\gate74-parked\`) and
**no `mvp-gate73`** (DS-only). The Flow 11 plan scheduled five gates, 75–79; the flow took twelve.

---

## 14. Premises of the Gate 83 brief that disk contradicted

See also §5.3 (what is not on disk) and §10 (corrections).

1. **"FLOW-9-COMPLETION.md is the named precedent … follow its line endings."** The two precedents
   disagree: `FLOW-9-COMPLETION.md` is wholly CRLF (423 lines) and `FLOW-10-COMPLETION.md` is wholly
   LF (417 lines), by byte scan. This file follows the named precedent, CRLF.
2. **UI-2 as a deferred item.** It was closed at Gate 64 (Teku confirmed on device, 23 Sept).
3. **UI-5.** No such item exists on disk.
4. **"The 20 dead `ariaLabel` sites."** There are 20 sites (8 + 7 + 4 + 1, counted); how many are
   dead is unestablished (a `Toggle`'s is live).
5. **"03 Sept, 07:48 appears for 2026 and again … for 2025."** The 2025 Anytime Fitness row reads
   "03 Sept, 07:45" (`src/data/transactions.ts:451`); "03 Sept, 07:48" exists only for 2026
   (`:1146`). The year-less label is still ambiguous (§9 decision 2), but the two strings are not
   identical.
6. **"Teku's 1 Oct brief … is not recorded anywhere on disk."** It is on disk now, in the Gate 82
   section, labelled "as carried in the review thread" (fragment quoted, rest paraphrased). It was
   not on disk before Gate 82.
7. **"`derive.ts` — the real sites are 1723 and 2112."** Confirmed; and no on-disk record cites
   `:1737` — that citation lived in the review thread only.
8. **The 1b checklist's dates for some rulings.** "Contributions are ledger rows" is dated 30 Sept in
   the brief; disk records it at Gate 77 (1 Oct) with no date or author. "Horizontal overflow rows
   with no visible scrollbar" is dated 28–30 Sept in the brief; disk has it only as the Gate 44
   convention and Teku's 3 Oct wrap ruling.
9. **"The zero-amount predicate … do not mark it resolved."** Agreed, and stronger: Gate 81 handed it
   to 81-B and 81-B's record never mentions it, so it is open and unowned.
10. **The 1b checklist's "1B".** Two different rulings carry that label — the Flow 11 plan's
    "Writers built (Claude, delegated: 1B)" and Gate 82's "Receipts — Teku, 1B". This record keeps
    them apart.
11. **"74 tags after the re-tag was wrong"** — not on disk as a statement; disk says 74 before the
    stray delete and 73 after.

**Checked and confirmed:** `main` = `origin/main` = `eedfecff…`; `mvp-gate82` annotated, tag object
`a1552843…`, peeling to `eedfecff…` on the remote; 76 tags locally and on the remote; no
`mvp-gate83` either side; a clean tree; 308 baselines with digest `73597470…05cc9` in both forms;
1001 tests in 38 files; 45 overlay states; `lint:tokens` 95 files / 4 exemptions and `lint:linkage`
PASS (both run at Gate 83); DS v2.8.0 at `b5b7b297…` in the manifest and the lock.
