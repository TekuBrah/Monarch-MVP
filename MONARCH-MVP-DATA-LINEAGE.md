# Monarch MVP — data lineage map

**What this is.** A map of where the MVP's data lives, who writes it, what reads it and what is
derived from it, at `main@b4d7b641512821670a04e6fe5b1a1c8a6751d988` (tag `mvp-gate83`). It was
written at Gate 84 for the persistence gate that follows, so that storage can be attached without
rediscovering the app. It describes what IS. Recommendations are kept to §10 and nowhere else.

**How to read the labels.** **[disk]** means the claim was established from the repository at the
pinned commit, and the `path:line` beside it was opened and says what the claim says. **[reported]**
means an earlier record said it and this gate did not re-derive it. **[carried]** means it came from
the review thread. Line numbers drift: a `path:line` here is an address at `b4d7b64`, not a promise.
Re-derive before trusting one in a later gate.

**What it rests on.** A read-only inventory script (`D:\Claude\_handoffs\gate84\inventory.mjs`,
outside the repo) enumerated every export, state atom, context, setter call, clock reader, object
URL, storage and network site, route and harness walk state. Every item was then opened and read.
`D:\Claude\_handoffs\gate84\COVERAGE.md` maps each inventory item to the section that carries it,
or states why it is excluded.

**Not in scope.** No code, test, baseline or design-system file was changed. No suite was run.

---

## Contents

1. [Sources of truth](#1-sources-of-truth)
2. [The store](#2-the-store)
3. [Derivations](#3-derivations)
4. [Clocks and date anchors](#4-clocks-and-date-anchors)
5. [Screen-to-data lineage](#5-screen-to-data-lineage)
6. [The receipt and OCR path](#6-the-receipt-and-ocr-path)
7. [Test-side data](#7-test-side-data)
8. [Persistence attachment points and hazards](#8-persistence-attachment-points-and-hazards)
9. [Discrepancies found](#9-discrepancies-found)
10. [Recommendations for the persistence gate](#10-recommendations-for-the-persistence-gate)

---

## 1. Sources of truth

### 1.1 The seed modules

Every seed is a synchronous, typed TypeScript export in `src/data/`. There is no network layer, no
`fetch` of data, and no async loader. Counts below were derived by importing each module in Node
(which strips the types) at `b4d7b64`. **[disk]**

| export | file | rows | shape | imported by (in `src/`) |
|---|---|---|---|---|
| `TRANSACTIONS` | `src/data/transactions.ts:163` | **254** | `Transaction` | `AccountsProvider.tsx:15` |
| `TRANSACTION_CATEGORIES` | `src/data/transactions.ts:134` | 7 | `TransactionCategory` (id, label, icon, hue) | `derive.ts:11`, `budgetDraft.ts`, `BudgetFormModal.tsx` |
| `RECEIPTS` | `src/data/receipts.ts:131` | **10** | `Receipt` | `AccountsProvider.tsx:14` |
| `FIAT_ACCOUNTS` | `src/data/accounts.ts:11` | 2 | `FiatAccount` | `AccountsProvider.tsx:9`, `holdings.ts:1` |
| `CRYPTO_WALLETS` | `src/data/accounts.ts:48` | 2 | `CryptoWallet` | `AccountsProvider.tsx:9`, **`TransactionDetailSheet.tsx:3`** |
| `CRYPTO_HOLDINGS` | `src/data/accounts.ts:105` | 6 | `CryptoHolding` | `AccountsProvider.tsx:9` |
| `buildHoldings(accounts)` / `HOLDINGS` | `src/data/holdings.ts:98` / `:236` | 9 | `Holding` (5-way union) | `AccountsProvider.tsx:13` (`buildHoldings`); **`TransactionDetailSheet.tsx:4`** (`HOLDINGS`) |
| `GOALS` | `src/data/goals.ts:53` | 2 | `Goal` | `AccountsProvider.tsx:12` |
| `COMMITMENTS` | `src/data/commitments.ts:75` | 7 | `Commitment` | `AccountsProvider.tsx:10` |
| `COMMITMENT_OFFERS` | `src/data/offers.ts:60` | 1 | `CommitmentOffer` | `AccountsProvider.tsx:11` |
| `BUDGETS` | `src/data/budgets.ts:25` | 2 | `Budget` | `BudgetsProvider.tsx:2` |
| `SMART_INSIGHTS` | `src/data/insights.ts:22` | 3 | `SmartInsight` | `HomepageFiat.tsx:14` |
| `ACADEMY_PROMO` | `src/data/insights.ts:60` | 1 | `PromoMessage` | `HomepageFiat.tsx:14` |
| `FEATURE_CARDS` | `src/data/insights.ts:67` | 3 | `FeatureCard` | `HomepageFiat.tsx:14` |
| `FEATURED_COINS` | `src/data/market.ts:29` | 3 | `FeaturedCoin`; `coinPrice(id)` at `:73` reads it | `HomepageCrypto.tsx`, `accounts.ts:1` |
| `ACTIVE_MEDIA`, `MEDIA_SLOTS` | `src/config/media.ts:57`, `:97` | 3 slots | image URLs for profile, banner, academy | `mediaUrl` (`:171`) in `HomepageScreen`, `HomepageFiat`, `FinanceScreen` |

**Transactions, by field** (Node over `TRANSACTIONS`) **[disk]**: `kind` payment 221 / transfer 33;
`method` Card Payment 217 / Fund Transfer 35 / Crypto Transfer 2; `accountId` main 250 / joint 2 /
marg 2; `logo.kind` merchant 221 / goal 28 / person 3 / image 2; `goalId` set on 28 (Bali 16,
Emergency 12), and `contributionSource` set on exactly the same 28 (automatic 22, manual 6). **No
seeded row carries `reference`** — every one is backfilled on load (§2.2). Ids and `occurredAt`
values are each unique across all 254. Oldest row 2025-08-08T08:30:00, newest 2026-09-12T16:13:00.

**Receipts** **[disk]**: all 10 are linked, each to a `kind: 'payment'` outflow whose magnitude equals
the receipt's stored `total`; 52 line items in all; one `tax: null` (`receipt-aia01`); **no seeded
receipt carries `sourceUrl` or `addedAt`** (`addedAt` is backfilled on load, §2.2).

### 1.2 Stored versus derived, per entity

"Stored" means the value is a field on the record and is never recomputed. "Derived" means it is a
pure function of stored fields and is recomputed on every read.

| entity | stored | derived (and where) |
|---|---|---|
| `FiatAccount` | `balance` (`src/data/types.ts:52`) — authority, never summed from the ledger | the bank `Holding`'s `balance` is copied from it by `buildHoldings` (`holdings.ts:120`, `:135`) |
| `Transaction` | `amount` (signed relative to `accountId`), `kind`, `method`, `category`, `occurredAt`, `merchant`, `logo`, `accountId`, optional `goalId` / `contributionSource` / `reference` (`src/data/types.ts:273-417`) | disposition (`derive.ts:2110`), "has a receipt" (`:969`), reference when absent (`:2165`, backfill only) |
| `Receipt` | `total`, `tax`, `lineItems`, `merchant`, `capturedAt`, `transactionId`, `displayName`, `filename`, optional `sourceUrl`, optional `addedAt` (`src/data/types.ts:756-856`) | subtotal (`derive.ts:1508`); "read failed" (`:1564`); "total/subtotal/tax read" (`:1533`, `:1572`, `:1592`) |
| `Goal` | `savedAmount` (`src/data/types.ts:920`) — authority, never summed from contributions; `targetAmount`, `targetDate`, `image`, `imageOrigin`, `fundingAccountId`, `autoSave` | percent (`derive.ts:1910`); total across goals (`:1852`); contributions list (`:1883`); "saved after this row" (`:2351`) |
| `Budget` | `limit`, `from`, `to`, `categories`, `autoRenew`, `name` (`src/data/types.ts:105-122`) | spent, available, percent left, per-category spend and legend (`derive.ts:1730-1825`) |
| `Commitment` | `amount`, `cadence`, `nextDueOn`, `paymentAccountId`, optional `provider` / `planName` / `contractEndsOn` (`src/data/types.ts:1043-1104`) | due label, cadence label, payment label (`derive.ts:1968-2031`) |
| `CommitmentOffer` | `amount` (the offer price) only (`src/data/types.ts:1143-1153`) | monthly and yearly saving (`derive.ts:2062`, `:2079`) — the current price is the commitment's own `amount` |
| `Holding` | fixed deposit `currentValue`, `ratePct`, `termYears`, `remainingMonths`; investment `lines`; gold `grams`, `pricePerGram` (`holdings.ts:98-224`) | value (`derive.ts:182`), FD dates and accrual (`:285-323`, read `TODAY`), crypto wallet value from `CRYPTO_HOLDINGS` (`:199`) |
| net worth | — | `netWorth(holdings, cryptoHoldings, goals)` (`derive.ts:232`) = sum of holding values + `goalsTotal` |

**Confirmed against the carried claim [carried → disk]:** `Goal.savedAmount` and
`FiatAccount.balance` are stored; dispositions and net worth are derived. **Also stored, and easy to
miss:** `Receipt.total` and `Receipt.tax` are stored as transcribed (seed) or as read (capture); only
the subtotal is derived (`derive.ts:1508`).

**Holdings are partly a seed and partly derived.** `buildHoldings` (`holdings.ts:98`) is a pure
function of the cash accounts: the two bank cards take their balance from them, and the other seven
cards are literals inside the function. So a write to `fiatAccounts` reaches every holding surface,
while every non-cash holding is fixed seed with no writer. **[disk]**

---

## 2. The store

### 2.1 Providers and their mount order

`src/main.tsx:27-43` mounts, outermost first: `StrictMode` → `ThemeProvider` → `AccountsProvider` →
`BudgetsProvider` → `BrowserRouter` → `App`. Every provider sits **above the router**, so no route
change unmounts application state. Each exposes a hook that throws outside its provider
(`useTheme` `ThemeProvider.tsx:63`, `useAccounts` `AccountsProvider.tsx:918`, `useBudgets`
`BudgetsProvider.tsx:72`). There is **no `useReducer` anywhere in `src/`** (inventory: 0 sites). There
are exactly three contexts (`ThemeProvider.tsx:18`, `AccountsProvider.tsx:539`,
`BudgetsProvider.tsx:46`). **[disk]**

### 2.2 The application state atoms (what a persistence layer would store)

| atom | provider, line | initial value | readers (via the hook) | writers |
|---|---|---|---|---|
| `transactions` | `AccountsProvider.tsx:548` | `backfillReferences(TRANSACTIONS)` — every row gets a deterministic `reference` | `HomepageFiat`, `HoldingDetailScreen`, `TransactionsLedger`, `BudgetTab`, `BudgetDetailScreen`, `GoalDetailScreen`, `ReceiptsTab`, `ReceiptViewer`, `useReceiptRetake` | `addTransaction` (`:558`, **no caller**), `topUpGoal` (`:707`), `deleteGoal` (`:830`) |
| `receipts` | `:553` | `backfillAddedAt(RECEIPTS)` — `addedAt = capturedAt + '.000'` | `HomepageFiat`, `HoldingDetailScreen`, `TransactionsLedger`, `BudgetDetailScreen`, `ReceiptsTab`, `ReceiptViewer`, `useReceiptRetake` | `addReceipt` (`:588`), `unlinkReceipt` (`:592`), `deleteReceipt` (`:602`), `linkReceipt` (`:627`), `updateReceipt` (`:641`), `replaceReceipt` (`:664`) |
| `fiatAccounts` | `:568` | `FIAT_ACCOUNTS` | `PlansTab`, `GoalDetailScreen`, `CommitmentDetailScreen`; and through `holdings` / `netWorth` / `primaryAccount` everywhere those are read | `adjustFiatBalance` (`:570`, **no caller**), `topUpGoal` (`:708`), `createGoal` (`:735`, validation only — returns the array unchanged), `deleteGoal` (`:831`) |
| `goals` | `:681` | `GOALS` | `FinanceOverview`, `PlansTab`, `GoalDetailScreen`, `TransactionsLedger` (passed to the detail sheet) | `topUpGoal` (`:718`), `createGoal` (`:741`), `updateGoal` (`:754`), `deleteGoal` (`:794`) |
| `budgets` | `BudgetsProvider.tsx:49` | `BUDGETS` | `BudgetTab`, `BudgetDetailScreen` | `createBudget` (`:51`), `updateBudget` (`:57`), `deleteBudget` (`:61`) |
| `theme` | `ThemeProvider.tsx:30` | `'light'`, unconditionally | `AppShell.tsx:12` (toggle, status-bar colour) | `toggle` (`ThemeProvider.tsx:54`); also written to `<html data-theme>` by a layout effect (`ThemeProvider.tsx:50-52`) |

**Passed through, never state.** `cryptoWallets`, `cryptoHoldings`, `commitments` and
`commitmentOffers` are the seed constants placed into the context value (`AccountsProvider.tsx:855-880`)
and have no writer. `holdings`, `netWorth`, `netWorthSeries`, `cryptoTotal`, `cryptoChange` and
`primaryAccount` (`fiatAccounts[0]`) are recomputed inside the context's `useMemo` (`:843-911`) on every
change to any of the four atoms. **[disk]**

### 2.3 Every application writer

`AccountsProvider` exposes **12 mutators, 10 with a caller**; `BudgetsProvider` exposes 3, all called;
`ThemeProvider` exposes 1 (`toggle`). Counted from the context types (`AccountsProvider.tsx:227-528`,
`BudgetsProvider.tsx:36-44`) and every call site found by grep over `src/`. **[disk]**

| writer | atoms touched | call site(s) | moves money |
|---|---|---|---|
| `addTransaction(t)` | transactions | **none** (seam) | — |
| `adjustFiatBalance(id, delta)` | fiatAccounts | **none** (seam) | — |
| `topUpGoal(contribution)` | transactions, fiatAccounts, goals | `GoalDetailScreen.tsx:175` | yes; net worth unchanged |
| `createGoal(goal)` | goals (fiatAccounts read-validated) | `PlansTab.tsx:90` | no (starts at 0) |
| `updateGoal(id, changes)` | goals — `changes` is a `GoalEdit` (`AccountsProvider.tsx:133-141`), which has no `id` or `savedAmount` member | `GoalDetailScreen.tsx:264` (edit), `:285` (auto-save switch), `:293` (auto-save amount), `:315` (image) | no |
| `deleteGoal(id, refund \| null)` | goals; if `refund`, transactions and fiatAccounts | `GoalDetailScreen.tsx:257` | yes when the goal held money; net worth unchanged |
| `addReceipt(r)` | receipts | `TransactionsLedger.tsx:237` (detail-sheet capture), `ReceiptsTab.tsx:195` (bulk save) | no |
| `unlinkReceipt(id)` | receipts | `ReceiptViewer.tsx:756`, and the detail sheet via the `onUnlink` prop (`TransactionsLedger.tsx:534`) | no |
| `deleteReceipt(id)` | receipts (revokes a `blob:` `sourceUrl`) | `ReceiptViewer.tsx:603` | no |
| `linkReceipt(id, txnId)` | receipts (also unlinks any receipt already on that row, in the same `map`) | `ReceiptViewer.tsx:637`, `:643`; `TransactionsLedger.tsx:597` | no |
| `updateReceipt(id, edit)` | receipts — `merchant`, `capturedAt`, `total` only (`ReceiptEdit`, `:532-537`) | `ReceiptViewer.tsx:666` | no |
| `replaceReceipt(fromId, r)` | receipts (one pass; revokes the original's `blob:`) | `useReceiptRetake.tsx:138` | no |
| `createBudget(input)` | budgets | `BudgetTab.tsx:118` | no |
| `updateBudget(id, input)` | budgets | `BudgetDetailScreen.tsx:291` | no |
| `deleteBudget(id)` | budgets | `BudgetDetailScreen.tsx:135` | no |
| `toggle()` | theme (`setTheme`, `ThemeProvider.tsx:55`) | `AppShell` | no |

`BudgetsProvider`'s three writers each make exactly one `setBudgets` call (`BudgetsProvider.tsx:53`,
`:58`, `:62`); a created budget is appended with id `budget-${crypto.randomUUID()}` (`:52`).

**The auto-save switch and the amount pencil are ordinary `updateGoal` calls.** They write
`goal.autoSave` and nothing else; they write no ledger row and nothing schedules a transfer
(`GoalDetailScreen.tsx:282-297`). **[carried → disk]**

**No receipt writer touches `transactions` or `fiatAccounts`.** All six write `setReceipts` only
(`AccountsProvider.tsx:588-670`). `setTransactions` has three call sites (`:559`, `:707`, `:830`).
**[disk]**

### 2.4 Atomicity

**Sibling pure updaters, batched by React 18.** `topUpGoal` calls `setTransactions`,
`setFiatAccounts` and `setGoals` as three top-level statements (`AccountsProvider.tsx:707-727`).
`deleteGoal` calls `setGoals` first (`:794`), returns early when there is no refund (`:828`), then
calls `setTransactions` (`:830`) and `setFiatAccounts` (`:831`). React 18 batches updates made in one
event handler (`main.tsx:27` uses `createRoot`), so no render sees a partial write. **[disk]**

**`deleteGoal` takes two arguments** (`:769`) because a goal holding nothing has no row to name it;
`null` means "nothing to return". **[carried → disk]**

**Validation throws, partly before the setters and partly inside the updaters.** Checks on the row
itself run synchronously at the call (`topUpGoal`'s `goalId`, `kind` and sign checks, `:691-699`;
`createGoal`'s zero check, `:732-734`; `updateGoal`'s image pair, `:751-753`). Checks against the
live goal or account sit inside the `setGoals` / `setFiatAccounts` updater functions (`:708-727`,
`:735-746`, `:754-759`, `:794-826`, `:831-840`), which React runs either at the call or during the
next render. **There is no error boundary in `src/`** (grep: 0 sites), so a guard that fires during a
render would unmount the app. No UI path reaches one of these guards today: each caller builds the
row from the same live record the guard checks. **[disk]**

**`linkReceipt` and `replaceReceipt` are single-pass by design**: one `map` (or one
`filter` + append), so "a transaction has at most one receipt" holds at every rendered frame
(`:627-635`, `:664-670`). **[disk]**

**StrictMode double-invokes updaters** (`main.tsx:28`). Every updater must therefore be pure. The
two that revoke object URLs inside the updater (`:605`, `:667`) are safe because revoking twice is a
no-op. **[disk]**

### 2.5 Non-application state

**Module-level state outside React.** Not persisted, lost on reload, and keyed by ids that a
persistence layer would make long-lived. **[disk]**

| state | file:line | what it holds | survives a reload? |
|---|---|---|---|
| `captureSeq` | `src/flows/finance/receiptCapture.ts:31` | counter behind captured receipt ids `receipt-capture-N` (`:461`) | **no — restarts at 1** |
| `sourceByFile` / `sourceByReceipt` | `receiptCapture.ts:110` / `:111` | camera or gallery, per capture; read by `captureSourceFor` (`:119`) → `retakeSource` (`advisoryCopy.ts:43`), falling back to `'camera'` | no |
| `dateReadByReceipt` | `receiptCapture.ts:148` | whether the printed date was read; `receiptDateWasRead` (`:151`) **defaults to `true`** | no |
| `byFile` / `byReceipt` | `src/data/captureDiagnostics.ts:121` / `:122` | `?diag=1` capture diagnostics | no |
| `CAPTURE_DIAGNOSTICS` | `captureDiagnostics.ts:47` | latched from `location.search` once at module load | re-read on reload |
| `currentSource` | `src/config/media.ts:140` | which media URL each slot uses; `setMediaSource` (`:150`) has **no caller** in `src/`, `e2e/` or `scripts/` | n/a |
| `stagedSeq` | `src/flows/finance/components/AddReceiptsModal.tsx:146` | React keys for staged tiles | irrelevant (modal-local) |
| `TODAY` | `src/data/today.ts:31` | `new Date()` evaluated once at module load | re-read on reload |

**Ephemeral UI state (component `useState`).** 62 of the 68 `useState` sites are UI state: open
flags, view switches, drafts, search text, filters, toasts and focus bookkeeping. None of it is
application data. Named by file in `D:\Claude\_handoffs\gate84\INVENTORY.md` (kind `useState`). The
ones that matter to persistence, because they carry state that a user might expect to survive:

| UI state | file:line | note |
|---|---|---|
| the Homepage tab | `HomepageScreen.tsx:38` | always opens on Accounts |
| the Finance tab | `FinanceScreen.tsx:59` | opens on Overview, or on a tab named in router `location.state` (`financeTabs.ts:47`) |
| the Transactions filter and search | `TransactionsLedger.tsx:69`, `:100` | reset to `TRANSACTION_FILTER_ALL` on remount |
| the Receipts filter, search and sort | `ReceiptsTab.tsx:119`, `:120`, `:134` | sort opens on "Date added" |
| the deleted-toast flags | `BudgetTab.tsx:78`, `PlansTab.tsx:64` | read once from `location.state`, which **does** survive a reload in the browser's history entry (asserted at `e2e/budget-writers.spec.ts:390-392`) |

**Refs, memos and form drafts hold no application data.** The 12 `useRef` sites are delete guards
(`isDeleting`, `BudgetDetailScreen.tsx:117`, `GoalDetailScreen.tsx:123`), file-input handles, focus
bookkeeping, the retake's pending id (`useReceiptRetake.tsx:104`) and the file input's chosen source
(`ReceiptFileInput.tsx:138`). The 15 `useMemo` sites memoise derivations from §3 (the context value at
`AccountsProvider.tsx:843`, filtered lists, chip rows, groups). Form drafts live in component state and
are validated by pure modules — `goalDraft.ts`, `budgetDraft.ts`, `topUpDraft.ts`,
`useTouchedValidation.ts` — and reach an atom only through a writer in §2.3. **[disk]**

**Router `location.state` is the one piece of navigation state that already survives a reload**,
because the browser stores it with the history entry. It carries `financeTab`, `budgetDeleted` and
`goalDeleted` (`financeTabs.ts:17`, `:26`, `:33`). **[disk]**

---

## 3. Derivations

### 3.1 The catalogue

All in `src/data/derive.ts` unless stated. "Consumers" are the `src/` modules that import the
function (`D:\Claude\_handoffs\gate84\IMPORTS.txt`). Every function here is pure apart from the four
that read `TODAY` and `newReference` (§3.3). **[disk]**

**Money and holdings**

| figure | function, line | inputs | consumers |
|---|---|---|---|
| crypto total / change | `cryptoWalletTotal` `:59`, `cryptoWalletChange` `:76` | `CryptoHolding[]` | `AccountsProvider`, `HomepageCrypto` |
| holding value | `holdingValue` `:182`; `goldValue` `:206` | holding, crypto holdings | `FinanceOverview`, `HoldingDetailScreen`, `holdingFields` |
| holding change / trend | `holdingChangePct` `:248`, `hasTrend` `:261`, `trendOf` `:141` | holding | `holdingFields`, `HomepageCrypto` |
| fixed deposit dates, principal, accrued, at maturity | `fixedDepositDates` `:285`, `fixedDepositPrincipal` `:307`, `fixedDepositAccrued` `:314`, `fixedDepositAtMaturity` `:319` | FD holding, **`TODAY`** | `holdingFields` |
| **net worth** | `netWorth` `:232` | holdings, crypto holdings, **goals (required)** | `AccountsProvider` |
| net-worth chart series / change / domain | `netWorthSeries` `:353` (via private `holdingValueOnDay` `:369`), `netWorthChange` `:398`, `chartDomain` `:404` | holdings, crypto holdings, **`TODAY`** — **no goal term** | `AccountsProvider`, `FinanceOverview` |
| wallet lines / top lines | `walletHoldings` `:156`, `topHoldings` `:164` | crypto holdings | `holdingFields`, `HomepageCrypto` |
| category total | `categoryTotal` `:104` | transactions | **no consumer in `src/`** |
| `toSen` | `:1705` | an amount | `AccountsProvider`, `TopUpModal`, `topUpDraft` |

**The ledger and its filters**

| figure | function, line | inputs | consumers |
|---|---|---|---|
| the two newest rows | `recentTransactions` `:118` | transactions | `HomepageFiat.tsx:36` |
| the anchor for date chips | `ledgerNow` `:666` | the transactions passed in | `filterTransactions` `:741` |
| date-range membership | `withinDateRange` `:696` | a timestamp, a range id, an anchor | `filterTransactions`, `filterReceipts` |
| the filtered, sorted list | `filterTransactions` `:736` | transactions, filter, search | `TransactionsLedger`, `TransactionFilterSheet` (the "N results" count), `TransactionPicker` |
| payee options | `transactionPayees` `:675` | transactions | `TransactionFilterSheet` |
| chips and their defaults | `filterChips` `:879`, `isFacetDefault` `:872`, `clearFacet` `:915` | filter | `TransactionsLedger` |
| month groups | `groupTransactionsByMonth` `:1128`, `monthLabel` `:1097` | transactions | `TransactionPicker` only |
| disposition | `transactionDisposition` `:2110` | a transaction | `TransactionDetailSheet`, `canCarryReceipt` |
| can carry a receipt | `canCarryReceipt` `:2246` | a transaction | `TransactionPicker`, `autoMatch.ts` |
| the category record | `transactionCategory` `:1608` | a category id | `BudgetDetailScreen`, `TransactionDetailSheet` |
| the institution / account name | `transactionAccount` `:1642`, `accountDisplayName` `:2270` | holdings, wallets, an account id | `TransactionDetailSheet` |
| From / To | `movementParties` `:2307` | a transaction, holdings, wallets, goals | `TransactionDetailSheet` |
| the reference | `referenceFor` `:2165`, `backfillReferences` `:2209`, `newReference` `:2196`, `transactionReference` `:2222` | a transaction or a timestamp | `AccountsProvider` (backfill), `GoalDetailScreen` (new), `TransactionDetailSheet` (read) |

**Receipts**

| figure | function, line | inputs | consumers |
|---|---|---|---|
| has a receipt / which receipt | `transactionHasReceipt` `:969`, `receiptForTransaction` `:977` | receipts, a transaction id | `HomepageFiat`, `HoldingDetailScreen`, `TransactionsLedger`, `BudgetDetailScreen`, `TransactionPicker`, `autoMatch.ts` |
| backfill and order | `backfillAddedAt` `:997`, `receiptsNewestFirst` `:1026` (private `addedAtOf` `:1002` throws on a missing `addedAt`) | receipts | `AccountsProvider`, `TransactionsLedger` (the library list) |
| month groups | `groupReceiptsByMonth` `:1066` (by `addedAt`), `groupReceiptsByCapturedDate` `:1182` (by `capturedAt`, plus an undated group) | receipts, `receiptDateWasRead` | `ReceiptsTab` |
| the anchor and the filter | `receiptsNow` `:1343`, `filterReceipts` `:1371`, `clearReceiptFacet` `:1400`, `isReceiptFacetDefault` `:1424`, `receiptFilterChips` `:1444` | receipts, filter, search | `ReceiptsTab`, `ReceiptFilterSheet` |
| subtotal; what was read | `receiptSubtotal` `:1508`, `receiptTotalRead` `:1533`, `receiptSubtotalRead` `:1572`, `receiptTaxRead` `:1592`, `receiptReadFailed` `:1564` | a receipt | `ReceiptCard`, `ReceiptViewer`, `ReceiptEditor`, `TransactionDetailSheet`, `TransactionPicker`, `advisoryCopy` |
| auto-match | `candidatesFor` `autoMatch.ts:243`, `autoMatchBatch` `:419`, built on `totalMatches` `:111`, `withinWindow` `:117`, `wallClockDay` `:94`, `merchantMatches` `:199`, `merchantTokens` `:136`, `MATCH_WINDOW_DAYS` `:62` | extracted fields, transactions, receipts | `ReceiptsTab.tsx:186`, `useReceiptRetake.tsx:133` |
| link suggestions | `rankedSuggestions` `autoMatch.ts:354` | fields, purchases | `TransactionPicker.tsx:127` |

**Budgets** (all go through the private `countsToward` `:1721`)

| figure | function, line | consumers |
|---|---|---|
| spent | `budgetSpent` `:1730` | `BudgetTab.tsx:104`, `BudgetDetailScreen.tsx:144` |
| available | `budgetAvailable` `:1738` | `BudgetTab.tsx:94`, `BudgetDetailScreen.tsx:143` |
| percent left (floor, clamp 0–100) | `budgetPercentLeft` `:1750` | `BudgetTab.tsx:100`, `BudgetDetailScreen.tsx:195` |
| per category; legend | `budgetSpentByCategory` `:1769` (**no consumer in `src/`**), `budgetLegend` `:1805` | `BudgetDetailScreen.tsx:92` |
| period label | `budgetPeriodLabel` `:1832` | `BudgetTab`, `BudgetDetailScreen` |

**Goals, commitments, the offer**

| figure | function, line | consumers |
|---|---|---|
| goals total | `goalsTotal` `:1852` | `netWorth`, `FinanceOverview.tsx:138` |
| contributions (newest first) | `goalContributions` `:1883` | `GoalDetailScreen.tsx:330`, `goalSavedAfter` |
| percent (floor, clamp) | `goalPercent` `:1910` | `PlansTab`, `GoalDetailScreen.tsx:382` |
| saved after a given row | `goalSavedAfter` `:2351` | `TransactionDetailSheet` |
| labels | `goalTargetLabel` `:1931`, `contributionSourceLabel` `:1950` | `GoalDetailScreen`, `ContributionRow`, `TransactionDetailSheet` |
| commitment labels | `commitmentCadenceLabel` `:1968`, `commitmentDueLabel` `:1989`, `commitmentProviderName` `:2001`, `commitmentDateLabel` `:2010`, `commitmentPaymentLabel` `:2026` | `PlansTab`, `CommitmentDetailScreen`, `SmartInsightModal` |
| the offer and its saving | `commitmentOffer` `:2042`, `offerMonthlySaving` `:2062`, `offerYearlySaving` `:2079` | `CommitmentDetailScreen.tsx:117`, `:282`; `SmartInsightModal.tsx:61` |

**Formatting** (`src/data/format.ts`, `src/data/today.ts`) turns figures into strings and stores
nothing: `formatMyr` `format.ts:19`, `formatMyrOrUnread` `:34` with `UNREAD_FIGURE` `:31`,
`formatSignedMyr` `:39`, `splitMyr` `:50`, `formatQuantity` `:57`, `formatPercent` `:79`,
`formatSignedPercent` `:94`, `formatTrendPercent` `:109`, `formatTimestamp` `:121`,
`goalProgressAfter` `:145`; `formatDate` `today.ts:119`, `formatDayMonth` `:132`,
`formatDayMonthYear` `:150`, `formatDayOfMonth` `:156`, `localWallClock` `:53`, and the date maths
`addMonths` `:62`, `addYears` `:72`, `daysInMonth` `:76`, `monthsBetween` `:86`, `yearsBetween` `:98`.
**[disk]**

### 3.2 Order-sensitive derivations

| derivation | the order | why it matters |
|---|---|---|
| `transactionDisposition` (`derive.ts:2110-2113`) | `kind === 'transfer'` **before** `amount >= 0` | three seeded credits are transfers; testing the sign first would make them income while every count still closes **[carried → disk]** |
| `countsToward` (`:1721-1727`) | `kind !== 'payment'`, then `amount >= 0`, then category, then date | a transfer is rejected by kind, never by category; zero is rejected exactly as `transactionDisposition` calls it income |
| `budgetLegend` (`:1824`) | spend descending, then `TRANSACTION_CATEGORIES` order | the first entry is the one that opens by default (`BudgetDetailScreen.tsx:102-103`) |
| `receiptsNewestFirst` (`:1029`) | `addedAt` descending, then library index | ties keep pick order; a bulk save stamps every receipt with one `addedAt` (`receiptCapture.ts:535`) |
| `goalSavedAfter` (`:2356-2364`) | needs `goalContributions` newest-first | walks back from the stored `savedAmount` |
| `rankedSuggestions` (`autoMatch.ts:406-416`) | score, exact total, smallest day gap, newest | |
| `autoMatchBatch` (`:424-433`) | per receipt, then a whole-batch claim count | order-independent within a batch by construction |

### 3.3 Impure derivations

- **Read the device clock through `TODAY`:** `fixedDepositDates` and `fixedDepositPrincipal`
  (`:289`, `:309`), `netWorthSeries` (`:357-358`), `chartDomain` (`:405`). **[disk]**
- **Random:** `newReference` (`:2196-2200`) uses `crypto.getRandomValues`; it is called only by
  writers (`GoalDetailScreen.tsx:173`, `:240`). **[disk]**
- **Locale:** every formatter fixes its locale (`en-MY` or `en-GB`); `monthLabel` (`:1097`) uses
  `toLocaleDateString('en-GB', …)`. **[disk]**
- **Time zone:** `ledgerNow`, `receiptsNow`, `withinDateRange` and `formatTimestamp` parse zone-less
  timestamps with `new Date(…)` (`:671`, `:1348`, `:703`, `format.ts:122`), so they read them in the
  device's local zone. `wallClockDay` (`autoMatch.ts:94`) deliberately does not. **[disk]**

---

## 4. Clocks and date anchors

### 4.1 The four anchors

| anchor | definition | readers | what moves if it changes |
|---|---|---|---|
| **`TODAY`** | `new Date()` at module load, `src/data/today.ts:31` — the device clock, frozen for the page's life | FD dates and accrual, the net-worth series and chart domain (`derive.ts:289`, `:309`, `:357`, `:405`); the FD maturity footnote (`holdingFields.ts:132-135`) | the FD holding's dates and accrual; the net-worth chart's shape and length. Not net worth itself (the FD's stored `currentValue` is used, `derive.ts:188`) |
| **`ledgerNow(transactions)`** | the newest `occurredAt` in the array passed (`derive.ts:666-672`) | only `filterTransactions` (`:741`) | the Transactions "This Month / Last 7 / Last 30" chips, the filter sheet's result count, and the link picker's search (which calls `filterTransactions` with the default range, so no date effect) |
| **`receiptsNow(receipts)`** | the newest `capturedAt` (`:1343-1349`) | only `filterReceipts` (`:1377`) | the Receipts date chips and the Receipts filter sheet's count |
| **a budget's period** | `t.occurredAt.slice(0, 10)` compared as strings with `from` and `to`, inclusive (`:1725-1726`) | `countsToward` → every budget figure | nothing reads a clock: the two seeded budgets describe 30 Aug – 20 Sept 2025 on any device date (`budgets.ts:31-32`, `:40-41`) |

**The Homepage two-row strip does not read `ledgerNow`.** It sorts and slices
(`recentTransactions`, `derive.ts:118-125`). It shows the same two rows because both look for the
newest timestamp, but the code path is different. **[disk]** (see §9, D2)

### 4.2 The device clock also creates data

Writers read the device clock when they make a record. **[disk]**

| site | what it stamps |
|---|---|
| `GoalDetailScreen.tsx:159` | a Top-Up row's `occurredAt` (and its reference date, `:173`) |
| `GoalDetailScreen.tsx:227` | a goal-delete refund row's `occurredAt` |
| `ReceiptsTab.tsx:195`, `useReceiptRetake.tsx:135`, `receiptCapture.ts:553` | a capture's `addedAt` (to the millisecond) and its `IMG_YYYYMMDD_HHMMSS` display name, read once per selection (`receiptCapture.ts:529-537`) |
| `receiptCapture.ts:499` | a capture's `capturedAt` **when the printed date was not read** |

**Consequence, on a real device:** the seed's newest row is 2026-09-12. A Top-Up or a goal delete made
on any later device date writes a row newer than that, so `ledgerNow` moves forward to the write's
date and the Transactions "This Month" chip then means the device's month, matching only rows written
in it. Likewise a capture whose date was not read stamps `capturedAt` with the device time and moves
`receiptsNow`. **Under the harness the two collections behave differently.** `PINNED_NOW`
(2026-08-15) is earlier than the newest seeded transaction (2026-09-12), so a Top-Up or delete in a
spec does not move `ledgerNow`. It is later than the newest seeded receipt (2025-09-13), so a capture
whose date is unread **does** move `receiptsNow` to 2026-08-15 in a spec. Gate 53 recorded the
ledger version of this effect for the two 2026 rows. **[disk; consequence derived from the code]**

### 4.3 The harness clock versus the device clock

- **The harness pins the browser clock** with `page.clock.setFixedTime(PINNED_NOW)` before navigation
  (`e2e/harness.ts:2896`), `PINNED_NOW = 2026-08-15T01:41Z` (`:685`) — 09:41 local in the pinned
  zone. **[disk]**
- **The time zone and locale are pinned by the config**: `timezoneId: 'Asia/Kuala_Lumpur'`,
  `locale: 'en-GB'` (`playwright.config.ts:78-79`). **[disk]**
- `setFixedTime` fixes `Date` without faking timers (comment at `harness.ts:682-683`), so `TODAY`,
  every writer's `new Date()` and every `Date.now()` inside libraries read 2026-08-15 09:41 in the
  harness. Specs that move time (`reading-time.spec.ts`) install a clock and drive it themselves.
  **[disk]**
- **Nothing in the app reads `PINNED_NOW`.** 15 Aug 2026 is the harness date only; a device shows its
  own date wherever `TODAY` or a writer is involved. **[disk]**

---

## 5. Screen-to-data lineage

### 5.1 Routes

Declared in `src/App.tsx:26-91`, all inside one layout route rendering `AppShell`. Chrome is looked up
by exact path or prefix (`src/shell/chrome.ts:69-134`). **[disk]**

| route | component | reads | writes |
|---|---|---|---|
| `/` | `HomepageScreen` → tab `accounts` `HomepageFiat`, `crypto` `HomepageCrypto`, `cards` and `stocks` `ComingSoon` (`HomepageScreen.tsx:31-34`, `:82-92`) | Fiat: `primaryAccount` (balance card, `HomepageFiat.tsx:41-44`), `transactions` → `recentTransactions(…, 2)` (`:36`), `receipts` (glyph), `SMART_INSIGHTS`, `ACADEMY_PROMO`, `FEATURE_CARDS`, `mediaUrl('academy')`. Crypto: `cryptoWallets`, `cryptoHoldings`, `FEATURED_COINS` | — |
| `/transfer`, `/more`, `/steward` | `ComingSoon` | nothing | — |
| `/finance` | `FinanceScreen`, five in-screen tabs (`FinanceScreen.tsx:40-46`) | `mediaUrl('banner')`, `mediaUrl('profile')` | — |
| `/finance` Overview | `FinanceOverview` | `holdings`, `cryptoHoldings`, `netWorth`, `netWorthSeries`, `goals` (`FinanceOverview.tsx:62`) | — (the Savings Goals card switches tab by callback) |
| `/finance` Transactions | `TransactionsLedger` | `transactions`, `receipts`, `goals` (`TransactionsLedger.tsx:67`) | `addReceipt`, `unlinkReceipt`, `linkReceipt` |
| `/finance` Budget | `BudgetTab` | `budgets`, `transactions` (`BudgetTab.tsx:73-74`) | `createBudget` |
| `/finance` Plans | `PlansTab` | `goals`, `commitments`, `fiatAccounts` (`PlansTab.tsx:51`) | `createGoal` |
| `/finance` Receipts | `ReceiptsTab` | `receipts`, `transactions` (`ReceiptsTab.tsx:118`) | `addReceipt`; and through the viewer host, the receipt writers |
| `/finance/holding/:holdingId` (9) | `HoldingDetailScreen` | `holdings`, `cryptoHoldings`, `transactions`, `receipts` (`HoldingDetailScreen.tsx:50`); the bank drill-down lists rows with `accountId === holding.accountId` (`holdingFields.ts:169-170`) | — (two preset modals end in a toast only, `HoldingDetailScreen.tsx:198`, `:203`) |
| `/finance/budget/:budgetId` (2 seeded) | `BudgetDetailScreen` | `budgets`, `transactions`, `receipts` (`BudgetDetailScreen.tsx:88-89`) | `updateBudget`, `deleteBudget` |
| `/finance/plans/goals/:goalId` (2 seeded) | `GoalDetailScreen` | `goals`, `transactions`, `fiatAccounts` (`GoalDetailScreen.tsx:97`) | `topUpGoal`, `updateGoal`, `deleteGoal` |
| `/finance/plans/commitments/:commitmentId` (7) | `CommitmentDetailScreen` | `commitments`, `commitmentOffers`, `fiatAccounts` (`CommitmentDetailScreen.tsx:78`) | — ("Coming soon." toasts only) |

**An unknown id on any of the four drill-down routes redirects** to `/finance` with `replace`
(`HoldingDetailScreen.tsx:57`, `BudgetDetailScreen.tsx:140`, `GoalDetailScreen.tsx:327`,
`CommitmentDetailScreen.tsx:114`). The budget, goal and commitment redirects carry a tab in
`location.state`; the holding redirect carries none and lands on Overview. **[disk]**

### 5.2 Overlays, sheets and modals

| surface | opened from | reads | can write |
|---|---|---|---|
| `TransactionFilterSheet` | Transactions | `transactions` (for the count and payee list), the applied filter, search | the screen's filter state only |
| `TransactionDetailSheet` | a ledger row | the row, its receipt, `goals`, `transactions`; **`HOLDINGS` and `CRYPTO_WALLETS` imported directly from the seed modules** (`TransactionDetailSheet.tsx:3-4`, used at `:182`, `:508`) | `unlinkReceipt` (via prop) |
| `ReceiptSourcePicker` | the detail sheet's "Add Receipt" | the unlinked receipts, newest first (`TransactionsLedger.tsx:276-279`) | `linkReceipt` (`:597`); or opens the file input → `addReceipt` |
| `ReceiptViewerHost` / `ReceiptViewer` (viewer, picker, editor views) | a receipt card, "View" in the detail sheet | `receipts`, `transactions` (`ReceiptViewer.tsx:526-533`) | `unlinkReceipt`, `deleteReceipt`, `linkReceipt`, `updateReceipt`, and `replaceReceipt` through the retake |
| `TransactionPicker` (inside the viewer) | "Link to transaction" | purchases (`canCarryReceipt`), receipts | via the viewer's `pick` |
| `AddReceiptsModal` | "Add new receipt" | staged files (local state) | none directly; hands `CapturedFile[]` to `ReceiptsTab.saveCaptures` |
| `ReceiptFilterSheet` | Receipts | `receipts` (for the count), the filter, the sort | the screen's filter and sort only |
| `BudgetFormModal` (create / edit, plus the category picker view) | Budget tab "Add New"; drill-down "Edit" | a budget (edit) | `createBudget` / `updateBudget` via the host; "Delete budget" → confirmation → `deleteBudget` |
| `GoalFormModal` (create / edit, plus the Funding Source picker view), `GoalDeleteConfirm`, `AutoSaveAmountModal` | Plans "Add New"; goal "Edit Goals"; the auto-save pencil | a goal, `fiatAccounts` | `createGoal`, `updateGoal`, `deleteGoal` via the hosts |
| `TopUpModal` | goal "Top-Up" | `fiatAccounts`, the goal; default source is `goal.fundingAccountId` (`GoalDetailScreen.tsx:464`) | `topUpGoal` via the host |
| `GoalContributionsSheet` | goal "See All" | the goal's contributions (prop) | — |
| `SmartInsightModal`, `InsightEducationModal` | the Internet commitment's banner | the commitment and its offer | — ("Coming soon." toasts) |
| `ReminderModal`, `StatementModal` (`PresetModals.tsx`) | the fixed deposit drill-down | presets (local) | — (toast) |
| `CaptureDiagnosticsBlock` | the viewer, with `?diag=1` only | `diagnosticFor(receiptId)` | the clipboard ("Copy as JSON") |

### 5.3 Cross-screen effects — end-to-end traces

Each trace names the spec that pins it. **Every one of these specs reaches the second screen through
the app's own controls** (the Gate 81 rule), because `page.goto` reseeds.

**T1 · A goal Top-Up.** Trigger: Top-Up → "Confirm Top-Up" (`TopUpModal`). The host builds one row
(`GoalDetailScreen.tsx:156-178`: `txn-${uuid}`, `kind: 'transfer'`, negative on the chosen source,
`goalId`, `contributionSource: 'manual'`, a new reference) and calls `topUpGoal` (`:175`). Atoms:
transactions (+1 row), fiatAccounts (source −amount), goals (`savedAmount` +amount). Derived figures
that move: the goal's percent, progress bar and Recent Contributions; the Savings Goals card; the
source account's balance on the Homepage balance card (if it is Main) and the Overview bank card; the
Transactions list and its counts. **Net worth does not move**, and no budget moves (a transfer).
Pinned by `e2e/topup.spec.ts:180` (goal, account and ledger together), `:211` (account debited, net
worth unchanged), `:246` (no budget moves), `:265` (the row is a transfer with a reference), `:310`
(the row can never carry a receipt).

**T2 · Add a goal.** `GoalFormModal` → `PlansTab.confirmCreate` builds a goal with
`goal-${uuid}`, `savedAmount: 0`, `image: GOAL_PLACEHOLDER_IMAGE`, `imageOrigin: 'placeholder'`
(`PlansTab.tsx:88-99`) → `createGoal`. Atom: goals (+1). Moves: the Plans tab's cards; the Savings
Goals card and net worth do not change (0 saved). Pinned by `e2e/goal-writers.spec.ts:223`, `:249`.

**T3 · Edit a goal** (settings, auto-save switch, auto-save amount, image). All are `updateGoal` with a
`GoalSettings` object that cannot name `savedAmount` (`goalDraft.ts:136`); the image call adds
`image: URL.createObjectURL(file)` and `imageOrigin: 'upload'` (`GoalDetailScreen.tsx:312-322`).
Moves: the goal's screen and its Plans card; for a rename, every contribution row's From/To label
(looked up by `goalId`, `derive.ts:2314`) but **not** the row's own `merchant` text in the ledger
list. Pinned by `goal-writers.spec.ts:315`, `:341`, `:559`, `:588`, `:610`.

**T4 · Delete a goal.** Host builds a refund row when `savedAmount > 0` (`GoalDetailScreen.tsx:222-242`:
positive, on `fundingAccountId`, `goalId`, a new reference, no `contributionSource`), navigates to
`/finance` with `goalDeleted`, then calls `deleteGoal` (`:252-257`). Atoms: goals (−1); if money,
transactions (+1) and fiatAccounts (+savedAmount). Moves: Plans tab, Savings Goals card, the funding
account's balance, the ledger; **net worth unchanged**, budgets unchanged; the goal's past rows keep
their name through `merchant` (`movementParties`, `derive.ts:2315`). Pinned by
`goal-writers.spec.ts:357`, `:404`, `:462`, `:500`, and `:674` (Node: net worth identity).

**T5 · A budget create, edit or delete.** `BudgetFormModal` → `createBudget` / `updateBudget` /
`deleteBudget` (`BudgetTab.tsx:118`, `BudgetDetailScreen.tsx:291`, `:135`). Atom: budgets only.
Moves: the Budget tab's cards and the drill-down's ring, info rows, donut and legend. Nothing on any
other screen reads `budgets`. Pinned by `e2e/budget-writers.spec.ts:212`, `:230`, `:277`, `:329`,
`:373`.

**T6 · A receipt link or unlink.** Link: the viewer's picker → `linkReceipt` (`ReceiptViewer.tsx:637`,
`:643` after the Replace confirmation) or the detail sheet's library → `linkReceipt`
(`TransactionsLedger.tsx:597`). Unlink: `unlinkReceipt` (`ReceiptViewer.tsx:756`, or the sheet). Atom:
receipts only. Moves: the ledger row's receipt glyph (on the Transactions tab, the Homepage strip, the
Main/Joint drill-downs and the budget legend), the detail sheet's body, the receipt card's "Linked"
state; **no amount moves**. Pinned by `e2e/unlink.spec.ts:91`, `e2e/link-editor.spec.ts:157`, `:190`,
`:215`, `e2e/receipt-viewer.spec.ts:95`.

**T7 · A receipt capture.**
- *From the detail sheet* (`TransactionsLedger.tsx:231-239`): `captureToReceipt(file,
  URL.createObjectURL(file), targetId)` → `addReceipt`. The receipt arrives already linked to that
  row; auto-match is not consulted.
- *From the Receipts tab* (`ReceiptsTab.tsx:185-196`): `AddReceiptsModal` extracts each staged file
  one at a time, then `autoMatchBatch` decides links, then `capturedToReceipts` stamps names and
  `addedAt`, then `addReceipt` per receipt.
- *A retake* (`useReceiptRetake.tsx:112-141`): one capture, the original's link inherited or else
  auto-matched, then `replaceReceipt`.
Atom: receipts only. Moves: the Receipts tab (a new group at the top, by `addedAt`), the ledger glyph
when linked, the Receipts date chips if `receiptsNow` moved. Pinned by
`e2e/automatch.spec.ts:422`, `e2e/bulk-save.spec.ts:76`, `:124`, `:207`, `e2e/retake.spec.ts:160`,
`:247`, `:296`, `:357`, `:404`. The real OCR engine is exercised only by `e2e/ocr.spec.ts` (§6).

**T8 · Delete a receipt.** `deleteReceipt` (`ReceiptViewer.tsx:601-607`) removes it and revokes a
`blob:` source. Moves: the library, the glyph on the row it was linked to; no amount. Pinned by
`receipt-viewer.spec.ts:147`, `:166`, `:221`.

### 5.4 The Transactions list's month headings (ruling 2C, carried)

**Ruling 2C [carried]:** the Transactions list gets month-and-year group headings, as the Receipts tab
has; queued, not built. **Confirmed from the code [disk]:** the list is one flat date-descending list
built by `filterTransactions` (`derive.ts:736-760`, sorted at `:759`) and rendered at
`TransactionsLedger.tsx:420-453`; each row's date label is `formatTimestamp` (`format.ts:121-126`,
day and month only), passed as `amountInfo` at `TransactionsLedger.tsx:429`. **A grouping helper
already exists**: `groupTransactionsByMonth` (`derive.ts:1128-1144`) groups by
`occurredAt.slice(0, 7)` and labels with `monthLabel` ("September 2025"); it is used today only by
`TransactionPicker.tsx:139`. So the headings would be **derived from `occurredAt` with no new stored
field**, as inferred. **Ruling 1A** (the dark picker row as a DS defect) touches no data and is not
mapped further. **[carried]**

---

## 6. The receipt and OCR path

### 6.1 The seam and the pipeline

```
File (from <input type="file">)
  │  URL.createObjectURL(file)  ──────────────►  Receipt.sourceUrl (blob:)   §6.3
  ▼
extractCapture(file, url)              receiptCapture.ts:395  — 30 s cutoff (:364), never rejects
  ▼
extractReceipt(file)                   extract.ts:222  — window.__monarchExtractReceipt ?? ocrExtractReceipt
  ▼
ocrExtractReceipt                      extract.ts:179  — with ?diag=1: diagnoseExtraction (ocr/diagnose.ts:124)
  │  PDF? rasterisePdfFirstPage         ocr/rasterise.ts:71  — pdfjs-dist, page 1, white canvas
  ▼
readReceipt(image)                     ocr/read.ts:48  — first pass 'plain'; second pass 'photo' if firstPassFailed (secondPass.ts:59)
  ▼
recognise(image, preparation)          ocr/recognise.ts:254  — normaliseForOcr (normalise.ts:268), then a tesseract.js worker
  ▼
parseReceipt(ocr)                      ocr/parseReceipt.ts:1251  — pure
  ▼
ExtractedReceipt {merchant|null, capturedAt|null, total|null, tax|null, currency, lineItems}   extract.ts:82
  ▼
capturedToReceipt(s)                   receiptCapture.ts:454 / :529  — id, display name, addedAt, fallbacks
  ▼
addReceipt / replaceReceipt            AccountsProvider.tsx:588 / :664
```

The seam's type is `ReceiptExtractor` (`extract.ts:99`), `(file: File) => Promise<ExtractedReceipt>`;
`window.__monarchExtractReceipt` is declared with it (`:101-107`) and read at call time (`:222-226`).
A PDF is recognised by `looksLikePdf` (`:127-129`): MIME type or `.pdf` extension.

All OCR modules are reached through dynamic `import()` (`extract.ts:185`, `:187`, `:191`, `:196`;
`read.ts:50-51`, `:65`; `recognise.ts:260`, `:297`; `rasterise.ts:72`), so none is in the entry chunk.
**[disk]**

### 6.2 What leaves the device

**Nothing, on this evidence [carried → disk].** The engine, its worker and the language model are
own-origin: `workerPath` and `corePath` are Vite `?url` assets (`recognise.ts:1-2`, `:312-313`),
`langPath` is `/ocr` (`:155`, `:314`), and the pdfjs worker is a `?url` asset (`rasterise.ts:1`,
`:73`). The only `fetch` in `src/` is a `HEAD` to the app's own `/ocr/eng.traineddata.gz`
(`recognise.ts:207-242`). There is no service worker (`navigator.serviceWorker` 0 sites). The image
bytes go from the `File` into a Web Worker and nowhere else. The network census in `e2e/ocr.spec.ts`
asserts zero cross-origin requests during a real recognition (`e2e/ocr.spec.ts:474-479`; not run at this gate). **[disk]**

### 6.3 Where images and parsed results live

| thing | where | lifetime |
|---|---|---|
| a captured image | an object URL in `Receipt.sourceUrl` (`receiptCapture.ts:512`) | the page; revoked by `deleteReceipt` / `replaceReceipt` (`AccountsProvider.tsx:605`, `:667`) |
| a staged image (bulk modal) | an object URL per tile (`AddReceiptsModal.tsx:197`); on Save the same URL is handed to the receipt (`:270`) and the list is emptied first (`setStaged([])`) so the unmount cleanup (`:181-187`) does not revoke it | the page |
| a seeded receipt image | `/media/receipts/<filename>` via `receiptImageUrl` (`media.ts:234-239`) | a shipped file |
| an uploaded goal image | an object URL in `Goal.image` with `imageOrigin: 'upload'` (`GoalDetailScreen.tsx:317-318`); resolved by `goalImageUrl` (`media.ts:319-321`) | the page; **never revoked**, including on replacement or goal delete |
| a goal image copied onto ledger rows | `Transaction.logo = { kind: 'goal', filename: goal.image, origin }` at Top-Up and delete time (`GoalDetailScreen.tsx:164`, `:232`) — for an uploaded image, **the object URL itself** | as long as that URL is not revoked |
| parsed fields | on the `Receipt` record (merchant, capturedAt, total, tax, lineItems) | the page |
| the raw engine text and confidences | only inside `ParsedReceipt` during the read; kept only in the `?diag=1` diagnostic store (`captureDiagnostics.ts:122`) | the page |
| the language model cache | **IndexedDB**, written by tesseract.js itself through `idb-keyval` (`node_modules/tesseract.js/src/worker-script/browser/cache.js:3-8`; the default `cacheMethod` writes, `worker-script/index.js:179`) | **persists across reloads already** |

**The app already has persistent browser storage, and it is not the app's.** The engine caches the
2.9 MB language model in IndexedDB under `idb-keyval`'s default database. `src/` itself never touches
`localStorage`, `sessionStorage` or `indexedDB` (inventory: 0 sites each). **[disk]**

### 6.4 The display fallbacks for an unread field

`capturedToReceipt` (`receiptCapture.ts:454-514`) fills: `merchant ?? displayName` (`:503`),
`capturedAt ?? localWallClock(new Date())` (`:499`), `total ?? 0` (`:504`). Readers recover "not
read" from the stored record alone: total by `total > 0` (`derive.ts:1533`); subtotal by "no line
items" (`:1572`); tax by `tax === null` **and** `sourceUrl !== undefined` (`:1592-1594`, provenance by
proxy); **the date by a side store only** (`receiptDateWasRead`, `receiptCapture.ts:151`), because a
fallback `capturedAt` is a well-formed timestamp. **[disk]**

---

## 7. Test-side data

### 7.1 What the harness pins, stubs and seeds

| item | where | effect |
|---|---|---|
| viewport, DPR, touch, time zone, locale | `playwright.config.ts:70-79` | 375/430 × 812 at DPR 2, `hasTouch`, `Asia/Kuala_Lumpur`, `en-GB` |
| the browser clock | `e2e/harness.ts:685`, `:2896` | `PINNED_NOW` before every navigation |
| the OCR seam | `installExtractionStub`, `harness.ts:2887-2892` | `window.__monarchExtractReceipt` = a promise that never settles, on every walk state |
| a fixed extraction | `harness.ts:3118-3124` | three overlay states (`add-unread`, `view-unread`, `detail-unread`) answer the seam with a fixed value |
| isolation | `playwright.config.ts:30-32`; no `storageState` | one worker, no retries; **each test gets a fresh browser context, so origin storage starts empty** |
| route expansion | `harness.ts:227-255` | `:holdingId` over `HOLDINGS` (9), `:budgetId` over `BUDGETS` (2), `:goalId` over `GOALS` (2), `:commitmentId` over `COMMITMENTS` (7); 5 static routes; **25** in all |
| the walk | `harness.ts:2412` | 25 routes + 7 non-default tab states + **45** `OVERLAY_STATES` = **77** walk states |

**The walk's non-route states.** Seven tab states: `/` crypto, cards, stocks; `/finance`
transactions, budget, plans, receipts. Forty-five overlay states, read off `OVERLAY_STATES`
(`harness.ts`, anchored `awk … | grep -c "^    overlay: {"` = 45). The ones marked **write** perform an
application write inside the walk; `landsOn` marks a confirm that navigates. **[disk]**

| # | route [tab] | overlay ids | writes in the walk |
|---|---|---|---|
| 1–3 | `/finance/holding/fd` | `reminder`, `statement`, `toast` | none (toast only) |
| 4–14 | `/finance` [transactions] | `filter`, `merchant`, `applied`, `empty`, `detail`, `detail-linked`, `detail-transfer`, `detail-income`, `add-source`, `add-library`, `add-library-filled` | `add-library-filled` unlinks a receipt first (**write**: `unlinkReceipt`) |
| 15–28 | `/finance` [receipts] and [transactions] | `filter`, `applied`, `add`, `add-grid`, `add-saving`, `view`, `view-unlinked`, `view-delete`, `view-picker`, `view-editor`, `view-replace`, `add-unread`, `view-unread`, `detail-unread` | `view-unlinked`, `view-picker`, `view-replace` unlink first (**write**: `unlinkReceipt`; `view-replace` then stops at the Replace confirmation, before any link); `add-unread`, `view-unread` and `detail-unread` save a capture with a fixed extraction (**write**: `addReceipt`); `view-delete` stops at the Delete confirmation (no write); `add-saving` presses Save but never completes (the stub never settles) |
| 29–31 | `/finance` [budget] | `create`, `create-category`, `create-attempt` | none (forms only) |
| 32–34 | `/finance/budget/budget-monthly` | `edit`, `edit-delete`, `deleted` | `deleted` (**write**: `deleteBudget`; `landsOn` the Budget tab) |
| 35 | `/finance/plans/goals/goal-bali-trip` | `contributions` | none |
| 36–37 | `/finance/plans/commitments/commitment-internet` | `insight`, `education` | none |
| 38–39 | `/finance/plans/goals/goal-bali-trip` | `topup`, `topped-up` | `topped-up` (**write**: `topUpGoal`, RM 125.50; no `landsOn`) |
| 40–41 | `/finance` [plans] | `add-goal`, `add-goal-source` | none (forms only) |
| 42–45 | `/finance/plans/goals/goal-bali-trip` | `edit-goal`, `goal-delete`, `goal-deleted`, `autosave-edit` | `goal-deleted` (**write**: `deleteGoal`; `landsOn` the Plans tab) |

**So ten walk states photograph the app after an application write** (`add-library-filled`,
`view-unlinked`, `view-picker`, `view-replace`, `add-unread`, `view-unread`, `detail-unread`,
`deleted`, `topped-up`, `goal-deleted`), read off each state's control and prepare labels. Each starts in a fresh
context, so each write begins from the seed. **[disk]**

**The harness imports the seeds directly** (`harness.ts:5-9`: `BUDGETS`, `COMMITMENTS`, `HOLDINGS`,
`GOALS`, `TRANSACTION_CATEGORIES`), and so do the specs: 15 spec files import
`src/data/transactions`, 12 `src/data/receipts`, and 7 each `src/data/accounts`, `src/data/goals` and
`src/data/budgets` (`grep -l` over `e2e/*.spec.ts`). **The suite reads the
seed modules as synchronous values at test-collection time.** **[disk]**

### 7.2 Assertions that depend on seed shape and counts

Gate 82 recorded the full list of seed-derived counts it re-derived (`CLAUDE.md`, Gate 82 table). The
families, by file **[disk]**: ledger length and month histogram (`budgets.spec.ts`); the class (i)
invariants — both budget rings, both stored balances, net worth, both goals, both anchors, the
Homepage strip, no new link suggestion (`seed-history.spec.ts`, 11 tests); disposition counts
(`transaction-disposition.spec.ts`); the applied and empty ladders (`harness.ts` overlay states
`applied`, `empty`; `no-results.spec.ts`); auto-match leave-one-out over all ten receipts
(`automatch.spec.ts:372`); the receipt-glyph join key (`receipt-glyph.spec.ts`); JSON round trips of
the goal and budget seeds (`goals.spec.ts:299`, `budgets.spec.ts:193`).

**Three specs are written around "a reload reseeds" and would invert under persistence** **[disk]**:

| site | what it relies on |
|---|---|
| `e2e/budget-writers.spec.ts:373-397` | asserts that after deleting both budgets, `page.reload()` **restores the seed** (`:388-395`) |
| `e2e/seed-history.spec.ts:39-41` and `e2e/topup.spec.ts:217` | comments: a second `page.goto` would reseed — the reason they navigate once |
| `e2e/goal-writers.spec.ts:28`, `:508`; `e2e/goal-form-views.spec.ts:31` | the same rule stated for the goal writers |

### 7.3 The baseline dependency on seed content

Every one of the 308 baselines renders seeded data or chrome over it. **What a seed change moves is
what is painted from that seed** (Gate 54-B's `elementFromPoint` rule, and Gate 75's caveat that a
full-page capture includes the undimmed tail below the fold). Measured once: adding 201 ledger rows
moved **56** baselines and added none (Gate 82) **[reported]**.

**A provider change moves nothing if the first committed render is identical.** Each test starts in
a fresh context with empty storage (§7.1), so a storage layer that falls back to the seed
synchronously, in the same `useState` initialiser, renders exactly today's first frame. A layer that
renders a loading frame first, or hydrates asynchronously after mount, changes what the harness's
settle sees on every walk state, so its exposure is **all 308** until each settle is shown to wait
for hydration. **[disk-derived reasoning; not measured]**

---

## 8. Persistence attachment points and hazards

Descriptive only. What to do about each is §10.

### 8.1 What would have to be persisted, and what must not be

| atom / field | persist? | why (from the code) |
|---|---|---|
| `transactions` (all rows, including written ones) | **yes** | written by `topUpGoal` and `deleteGoal` |
| `Transaction.reference` | **yes, per row** | random for written rows (`derive.ts:2196`); backfilled deterministically for seed rows (`:2165`) |
| `receipts` | **yes** | six writers |
| `Receipt.addedAt` | **yes** | captures are stamped (`receiptCapture.ts:535`); the seed is backfilled |
| `fiatAccounts[].balance` | **yes** | moved by `topUpGoal` and `deleteGoal` |
| `goals` (including `savedAmount`, `autoSave`, `image`, `imageOrigin`) | **yes** | five writers |
| `budgets` | **yes** | three writers |
| `theme` | optional | starts `'light'` unconditionally (`ThemeProvider.tsx:30`) |
| the capture side stores (`sourceByReceipt`, `dateReadByReceipt`) | **yes, or the facts lose meaning** | after a reload `receiptDateWasRead` returns `true` for every receipt (`receiptCapture.ts:152`), so an unread date silently becomes "read", and `retakeSource` falls back to `'camera'` (`advisoryCopy.ts:44`) |
| `holdings`, `netWorth`, `netWorthSeries`, `cryptoTotal`, `cryptoChange`, `primaryAccount` | **no** | derived in the context memo (`AccountsProvider.tsx:843-911`) |
| dispositions, budget figures, goal percents, offer savings, subtotals, "read" flags, chips, month groups, anchors | **no** | pure derivations (§3) |
| `CRYPTO_WALLETS`, `CRYPTO_HOLDINGS`, the seven non-cash holdings, `COMMITMENTS`, `COMMITMENT_OFFERS`, `SMART_INSIGHTS`, `ACADEMY_PROMO`, `FEATURE_CARDS`, `FEATURED_COINS`, `TRANSACTION_CATEGORIES`, media slots | **no writer today** | constants; persisting them would freeze a seed edit behind stored data |
| UI state (§2.5) | not application data | |

### 8.2 Serialisation hazards

| hazard | where | what breaks |
|---|---|---|
| **object URLs** | `Receipt.sourceUrl` (`receiptCapture.ts:512`); `Goal.image` with `'upload'` (`GoalDetailScreen.tsx:317`); `Transaction.logo.filename` copied from an uploaded goal image (`:164`, `:232`) | a `blob:` URL is dead after a reload; the bytes behind it are not in any store. The ledger rows hold a **copy** of the URL, so an image store must also rewrite or re-resolve those rows' logos |
| **generated ids that restart** | `receipt-capture-${captureSeq}` (`receiptCapture.ts:31`, `:461`) | after a reload the counter restarts at 1, so a new capture's id **collides** with a stored one. Every other generator is a UUID (`BudgetsProvider.tsx:52`, `PlansTab.tsx:91`, `GoalDetailScreen.tsx:161`, `:229`) |
| **references** | `newReference` random; `referenceFor` deterministic | a stored written row must keep its reference; re-running `backfillReferences` is safe only because it skips rows that already have one (`derive.ts:2210`) |
| **`Date`** | no `Date` object is stored in any atom — every timestamp is a zone-less string (`src/data/types.ts:290`, `:795`, `:813`, `:927`, `:1060`) | none for storage; zone-less strings are read in the device zone (§3.3) |
| **`Map` / `Set` in state** | no application atom holds one; `useTouchedValidation.ts:43` and `BudgetDetailScreen.tsx:102` are UI state | none |
| **functions in state** | none in any atom | none |
| **`undefined` versus absent** | optional fields (`goalId`, `contributionSource`, `reference`, `sourceUrl`, `addedAt`, `provider`, …) | JSON drops `undefined`; readers test truthiness or `!== undefined` (`derive.ts:1594` uses `receipt.sourceUrl !== undefined` as provenance), so a round trip must not turn an absent key into `null` |
| **`tax: null`** | `Receipt.tax` | `null` is meaningful (no tax line, or not read); JSON keeps it |
| **floats** | every `Amount` is a JS number; writers re-round through sen (`toSen`, `derive.ts:1705`) | JSON round-trips a double exactly |

### 8.3 Seed versus user data

Today a record is "seed" only by origin, not by any field: written rows have `txn-${uuid}` ids and
always carry a `reference`; captured receipts have `receipt-capture-N` ids and a `sourceUrl`; created
goals and budgets have `goal-`/`budget-${uuid}` ids. Seeded rows are **also mutated** by writers
(a seeded receipt can be relinked, edited or deleted; a seeded goal can be topped up or deleted; a
seeded budget can be edited), so "the user's data" is the whole of each atom after first use, not the
records the user created. **[disk]**

**Seed drift is the hazard the architecture document named** (`MONARCH-MVP-PHASE5-ARCHITECTURE-08022026.md:395-400`,
"the persisted copy wins"): once an atom is stored, an edit to `src/data/*.ts` no longer reaches a
device that already holds data.

### 8.4 What "Reset data" would have to restore

Each atom to its initial value as the provider computes it today: `backfillReferences(TRANSACTIONS)`,
`backfillAddedAt(RECEIPTS)`, `FIAT_ACCOUNTS`, `GOALS`, `BUDGETS`, and `'light'` if the theme is
stored. Plus: the capture side stores; every object URL held by a captured receipt or uploaded goal
image (revoke them); and any stored image bytes. **Not** the engine's IndexedDB model cache, which is
not user data. **[disk]**

**The Reset entry point does not exist yet.** The profile picture is rendered by the DS `HeaderBg`
from `avatarSrc` (`HomepageScreen.tsx:68`, `FinanceScreen.tsx:91`). `HeaderBg`'s props are
`variant, background, greeting, title, avatarSrc, avatarName, statusBarTime, searchValue,
onSearchChange, hasNotification, onNotificationsClick, className`
(`node_modules/@monarch/design-system/dist/components/Header/HeaderBg.d.ts:20`) — **there is no
avatar click handler**. **[disk]**

### 8.5 What a first-run (empty) state would touch

| collection | can it be emptied today? | what renders at zero |
|---|---|---|
| budgets | **yes** — delete both (pinned, `budget-writers.spec.ts:373`) | the Add New card alone |
| goals | **yes** — delete both through the UI | the goals row holds no card; nothing states that it is empty (`PlansTab.tsx:146`) |
| receipts | **yes** — delete all ten, one by one | `NoResults` "No receipts match" with a "Show all receipts" action (`ReceiptsTab.tsx:364-365`), which cannot help |
| transactions | **no** — no writer removes a row | — |
| fiatAccounts | no | `primaryAccount` throws if empty (`AccountsProvider.tsx:845`) |

### 8.6 Module boundaries a storage layer could sit behind

**Can, without touching a screen:**
- **The four `useState` initialisers and setters in `AccountsProvider`** (`:548`, `:553`, `:568`,
  `:681`) and the one in `BudgetsProvider` (`:49`). Every screen reads through `useAccounts()` /
  `useBudgets()` (§5.1); the provider headers record that design intent (`AccountsProvider.tsx:49-52`).
- **`ThemeProvider`'s initialiser** (`:30`).
- **`media.ts`'s resolvers** (`receiptImageUrl` `:234`, `goalImageUrl` `:319`) for turning a stored
  image reference back into a displayable URL.

**Cannot, without touching more than the store:**
- **`TransactionDetailSheet`** reads `HOLDINGS` and `CRYPTO_WALLETS` from the seed modules
  (`TransactionDetailSheet.tsx:3-4`), not from the provider. It uses names only, so today it agrees;
  a stored account rename would not reach it.
- **The capture side stores** live in module scope in `receiptCapture.ts` and `captureDiagnostics.ts`,
  outside any provider.
- **`derive.ts` imports `TRANSACTION_CATEGORIES` from the seed module** (`:11`); categories are a
  constant, so this is a boundary only if categories ever become data (recategorisation, next in the
  plan, writes `Transaction.category`, not the table).
- **The test suite** imports the seed modules directly (§7.1), so the seeds must stay synchronous
  exports.

---

## 9. Discrepancies found

Report only. Nothing was edited.

| # | where | what it says | what the code says |
|---|---|---|---|
| D1 | `FLOW-11-COMPLETION.md:683`, `CLAUDE.md:12166` vs the Gate 84 brief | the map is `MONARCH-MVP-DATA-LINEAGE.md` (the brief expected `DATA-LINEAGE-MAP.md`) | this file follows the on-disk name |
| D2 | `FLOW-11-COMPLETION.md:211-212` | "`ledgerNow()` … drives the Transactions date chips **and the Homepage two-row strip**" | the strip calls `recentTransactions` (`HomepageFiat.tsx:36`, `derive.ts:118`); `ledgerNow` has one reader, `filterTransactions` (`derive.ts:741`) |
| D3 | `FLOW-11-COMPLETION.md:214-215`, `CLAUDE.md:18474` | "only the fixed-deposit accrual and the net-worth month-to-date chart read the device clock" | true of the read-side derivations; **writers** also read it — Top-Up and delete rows, capture `addedAt`, display names and fallback `capturedAt` (§4.2) — and those writes can move `ledgerNow` and `receiptsNow` on a real device |
| D4 | `src/components/NoResults.tsx:12-13`, `CLAUDE.md:16590-16591`, `FLOW-11-COMPLETION.md:554` | "nothing can take either collection to zero records, because there is no delete-all"; "nothing can empty a collection today" | budgets, goals and receipts can each be emptied through the UI (§8.5); a test does it for budgets (`budget-writers.spec.ts:373`). An empty receipt library shows the no-results copy and a reset action that cannot help |
| D5 | `src/data/derive.ts:2193` | `crypto.randomUUID` is used by "the goal and receipt id generators" | receipts use the module counter `receipt-capture-N` (`receiptCapture.ts:31`, `:461`) |
| D6 | `src/accounts/AccountsProvider.tsx:84-90` | "NINE MUTATORS … SEVEN have callers" | twelve mutators, ten with callers (createGoal, updateGoal, deleteGoal added at 81-B) |
| D7 | `AccountsProvider.tsx:101-102` | `setTransactions` "has exactly two call sites — `addTransaction` … and `topUpGoal`" | three: `:559`, `:707`, `:830` (`deleteGoal`) |
| D8 | `AccountsProvider.tsx:110-111` | "a provider holding two arrays" | four state atoms: transactions, receipts, fiatAccounts, goals |
| D9 | `AccountsProvider.tsx:676-678` | Add, Edit, Delete and the auto-save toggle "are Gate 81-B's and are not declared here" | they are declared below it (`:731`, `:750`, `:769`) |
| D10 | `AccountsProvider.tsx:43-45` | the balance is "written by the Flow 4/5 transfers … read by … Academy, the Assistant" | no Flow 4/5 writer, Academy reader or Assistant reader exists; intent, not state |
| D11 | `src/flows/finance/FinanceScreen.tsx:142-143` | "`ComingSoon` is still imported, and since Gate 67 it is used by Plans alone" | the same file's later comment (`:133`) is right: it is not imported, and Plans is no longer a stub |
| D12 | `e2e/harness.ts:1164` | income gets no walk state because the seed has no income row | already recorded as stale (register §2ae); still present |
| D13 | `src/flows/finance/PlansTab.tsx:30` | "Add New" is not rendered on either heading | already recorded as stale (register §2ae); still present |
| D14 | `MONARCH-MVP-PHASE5-ARCHITECTURE-08022026.md:388-391` | "No localStorage, no sessionStorage, no IndexedDB" | true of `src/`; tesseract.js writes the language model to IndexedDB through `idb-keyval` (§6.3) |
| D15 | `GoalDetailScreen.tsx:312-322` (behaviour, not a comment) | — | replacing or deleting an uploaded goal image never revokes its object URL (no `revokeObjectURL` outside `AccountsProvider` and `AddReceiptsModal`); a page-lifetime leak today |
| D16 | `categoryTotal` (`derive.ts:104`), `budgetSpentByCategory` (`:1769`), `setMediaSource` (`media.ts:150`) | — | exported with no consumer in `src/` (`categoryTotal` and `budgetSpentByCategory` are used by specs) |

Everything else checked from `FLOW-11-COMPLETION.md` §2–§4 and the data parts of `CLAUDE.md` agreed
with the code at `b4d7b64`: 12 mutators, 10 with callers; `topUpGoal` one argument and three sibling
updaters; `deleteGoal` two arguments; `savedAmount` and `balance` stored; disposition order; budget
dates compared on the date part, inclusive; the reference format; 254 rows; 10 receipts; 7
commitments; 1 offer at RM 70.

---

## 10. Recommendations for the persistence gate

**These are recommendations, not descriptions.** Each gives its reasoning so Teku can overturn it.
The binding constraints, as carried: no backend, no paid service, no API key; OCR and images stay on
the device; a tester can close and reopen the app and keep their data; a Reset-data control opened
from the Marge profile picture; the visual suite stays deterministic.

**R1 · Persist the five atoms behind the providers, and nothing derived.** Store `transactions`,
`receipts`, `fiatAccounts`, `goals` and `budgets` (and optionally `theme`) by wrapping their
`useState` initialisers and setters (§8.6). *Why:* every screen already reads through the two hooks,
so no screen changes, and §8.1 shows nothing derived needs storing. Storing a derived figure would
create a second source of truth that can disagree with the formula.

**R2 · Hydrate synchronously, falling back to today's initialisers, so the first frame is unchanged.**
*Why:* §7.3. A fresh test context has empty storage, so a synchronous fallback reproduces today's
first render exactly and keeps all 308 baselines still; an async hydration risks a loading frame on
every walk state. `localStorage` is synchronous and holds the structured data easily (the whole state
is a few hundred small records). *Trade-off:* its quota (a few MB) cannot hold image bytes — see R4.

**R3 · Version the stored shape and reset to the seed on a mismatch.** One key holds a schema
version (and, if wanted, a seed hash). *Why:* the drift hazard in §8.3 is real for a demo whose seed
still changes; the Flow 11 plan already ruled that "a change to the saved shape bumps a version and
resets to the seeds" [carried]. A version check turns drift into a deliberate reset rather than a
phantom bug.

**R4 · Store image bytes, not URLs, and in IndexedDB.** Keep a stable key on the record (for example
the receipt id, or a new image key) and keep the bytes as a `Blob` in IndexedDB; create the object URL
at render time through the existing resolvers (`receiptImageUrl`, `goalImageUrl`). *Why:* §8.2 — a
stored `blob:` URL is dead after a reload, and IndexedDB stores `Blob`s natively and has room for
photographs. This keeps images on the device. The ledger rows that copied an uploaded goal image's URL
(§6.3) need the same key, not the URL. *Caution:* use a database name of the app's own — tesseract.js
already uses `idb-keyval`'s **default** store (§6.3), and Reset must not clear the model cache by
accident (or must, deliberately, if that is wanted).

**R5 · Fix the receipt id generator before anything is stored.** Use a UUID as every other generator
does (§8.2). *Why:* `receipt-capture-N` restarts at 1 and would collide with stored ids on the first
capture after a reload. This is a one-line change that must precede persistence.

**R6 · Move the capture side facts onto the record, or persist the side stores with it.** At least
"was the printed date read" and "camera or gallery". *Why:* §8.1 — after a reload the defaults
(`true`, `'camera'`) silently change what the "Receipt date" sort and the retake button show. Moving
them onto `Receipt` is the cleaner shape; it widens the stored record by two optional fields.

**R7 · Reset restores the provider initialisers, revokes object URLs and clears stored images.**
§8.4. *Why:* "Reset" should return the app to exactly what a first visitor sees, which is what the
harness photographs.

**R8 · The Reset entry point needs a DS change or a composed wrapper.** `HeaderBg` has no avatar
click handler (§8.4). *Why it is listed here:* rule 3 — a primitive the DS does not have is reported,
not built in the MVP. The two honest routes are a DS prop (an `onAvatarClick`) or a different entry
(for example the existing `/more` route). This is Teku's call.

**R9 · Decide the first-run states with persistence, not after.** Budgets, goals and receipts can
already reach zero (§8.5), and the receipts case shows misleading copy. *Why:* persistence makes an
empty collection durable; today a reload hides it.

**R10 · Re-point the reload-dependent specs as part of the same gate.** §7.2. `budget-writers.spec.ts:373`
asserts the opposite of what persistence delivers. *Why:* it will fail by design, and the three
"navigate once because a reload reseeds" rules should become "a reload keeps the write", which is a
stronger assertion for every writer.

**R11 · Keep the seed modules synchronous exports.** *Why:* the harness expands routes from them and
up to 15 spec files import them at collection time (§7.1).

**R12 · Make `TransactionDetailSheet` read accounts and wallets from the provider** when the storage
layer lands, or record why it need not. *Why:* §8.6 — it is the one screen-level reader that bypasses
the store.

**R13 · Decide what the device clock means for stored writes.** §4.2: on a real device a write
dated after the seed's newest row moves the Transactions date chips to the device month. Persistence
makes such writes accumulate. Options include leaving it (it is correct behaviour for a live app),
or shifting the seed's dates relative to the first run. *Why it matters now:* testers will reopen
the app on later dates and see "This Month" change meaning.
