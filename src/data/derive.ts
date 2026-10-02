import type { IconName, TrendDirection } from '@monarch/design-system'
import {
  TODAY,
  addMonths,
  addYears,
  daysInMonth,
  formatDayMonth,
  formatDayMonthYear,
  yearsBetween,
} from './today'
import { TRANSACTION_CATEGORIES } from './transactions'
import { firstPassFailed } from './ocr/secondPass'
import type {
  Amount,
  ContributionSource,
  CryptoHolding,
  FixedDepositHolding,
  GoldHolding,
  Holding,
  BankHolding,
  Budget,
  Commitment,
  CommitmentOffer,
  CryptoWallet,
  FiatAccount,
  Goal,
  Receipt,
  Transaction,
  TransactionCategory,
  TransactionCategoryId,
  TransactionDisposition,
  TransactionMethod,
} from './types'

/**
 * Every computed figure in the app.
 *
 * The inventory's §6 rule: record Figma values faithfully in the inventory, but
 * in the typed data DERIVE every total, percentage and delta from one source of
 * truth. A percentage is a function of two amounts; it is not a datum.
 *
 * Each function below is one row of the inventory's §6b formula table. Screens
 * call these; screens never add up an array themselves, or the rule leaks.
 */

/** Sum any amounts. Kept explicit so the reduce is written once. */
function sum(amounts: Amount[]): Amount {
  return amounts.reduce((total, amount) => total + amount, 0)
}

/**
 * §6b — "Wallet total = sum(holdings)".
 *
 * The Homepage displays RM 102,354.02. This returns RM 97,236.32 from the five
 * holdings the file records. That RM 5,117.70 difference is not an error here:
 * it is the file's own contradiction, surfaced. Padding it away with a phantom
 * holding would copy the defect forward.
 */
export function cryptoWalletTotal(holdings: CryptoHolding[]): Amount {
  return sum(holdings.map((h) => h.valueMyr))
}

/**
 * The wallet's movement, derived from the per-holding moves rather than stored.
 *
 * Each holding's previous value is `value / (1 + pct/100)`; the wallet's delta
 * is the sum of the differences, and its percentage is that delta over the
 * previous total. Holdings with `changePct: 0` contribute nothing, which is the
 * honest treatment of "the file records no move for this token".
 *
 * Figma shows "+ RM 1568" and "2.49%" side by side on this card. Those two do
 * not reconcile with each other or with any total in the file, and 2.49% is
 * character-for-character Ethereum's move on the row below — the signature of a
 * paste. Deriving is what makes that visible.
 */
export function cryptoWalletChange(holdings: CryptoHolding[]): {
  amount: Amount
  pct: number
} {
  const current = cryptoWalletTotal(holdings)
  const previous = sum(
    holdings.map((h) => h.valueMyr / (1 + h.changePct / 100)),
  )
  const amount = current - previous
  return { amount, pct: previous === 0 ? 0 : (amount / previous) * 100 }
}

/**
 * §6d — the data spine. Transactions roll up to their category total.
 *
 * THE FIVE GROCERIES ROWS RETURNED EXACTLY 1800 UNTIL GATE 48 AND NOW RETURN
 * 1118.46. That figure appears independently in two unrelated Sections of the
 * design and was the only hand-authored total in the file that survived being
 * recomputed — until the receipt reconciliation moved four of the five rows to
 * follow their own photographed totals (see `transactions.ts`).
 *
 * IT IS RETIRED, NOT BROKEN, AND THIS FUNCTION HAS NO RUNTIME CONSUMER — it is
 * exported and read by no screen. Do not chase 1,800 by editing an amount away
 * from its receipt.
 *
 * Returned as a positive magnitude: a category total is "how much was spent",
 * while the ledger stores outflows as negative.
 */
export function categoryTotal(
  transactions: Transaction[],
  category: TransactionCategoryId,
): Amount {
  return Math.abs(
    sum(
      transactions
        .filter((t) => t.category === category && t.amount < 0)
        .map((t) => t.amount),
    ),
  )
}

/** Newest first. The Homepage's "Transactions" section is the first N of this. */
export function recentTransactions(
  transactions: Transaction[],
  limit: number,
): Transaction[] {
  return [...transactions]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit)
}

/**
 * Which way a change went, derived from the SAME number the label formats.
 *
 * This exists so the arrow and the percentage cannot disagree. Passing a
 * direction per call site would be a second source of truth for a fact the data
 * already states — precisely the pattern §6 exists to prevent, and precisely how
 * the DS's old `ListItem` got it wrong (it drew a green up-triangle
 * unconditionally, so a decline rendered as a rise).
 *
 * `0` is `'flat'`, never `'up'`. Three of the seeded holdings — Tether, Stellar
 * and Uniswap — sit at exactly `changePct: 0`, and a stablecoin showing a green
 * up-arrow on no movement is wrong in an obvious way. That state is why the DS
 * shipped `'flat'`.
 */
export function trendOf(changePct: number): TrendDirection {
  if (changePct > 0) return 'up'
  if (changePct < 0) return 'down'
  return 'flat'
}

/**
 * The tokens belonging to one wallet.
 *
 * Flow 1 shipped before a second wallet was ever drawn, so its crypto card
 * summed EVERY holding while naming a single wallet. Flow 7 splits the wallets
 * onto separate cards, which makes that visible — so both screens now go through
 * this filter and the Homepage's card finally shows Marge's own RM 102,354.02
 * rather than both wallets added together.
 */
export function walletHoldings(
  holdings: CryptoHolding[],
  walletId: string,
): CryptoHolding[] {
  return holdings.filter((h) => h.walletId === walletId)
}

/** Holdings ranked by value — what "My Tokens" shows before "See all". */
export function topHoldings(
  holdings: CryptoHolding[],
  limit: number,
): CryptoHolding[] {
  return [...holdings].sort((a, b) => b.valueMyr - a.valueMyr).slice(0, limit)
}

// ============================================================ Flow 7 — net worth

/**
 * What one holding is worth. THE ONLY PLACE A HOLDING BECOMES A NUMBER.
 *
 * Note how little is stored: Gold multiplies out, an investment sums its lines,
 * a wallet sums its tokens. Only the fixed deposit and the two cash accounts
 * store a figure, and each of those is a genuine source value rather than a
 * total — the same reason `FiatAccount.balance` is stored (a partial ledger
 * cannot reconstruct a balance, so it must not be asked to).
 */
export function holdingValue(
  holding: Holding,
  cryptoHoldings: CryptoHolding[],
): Amount {
  switch (holding.type) {
    case 'fixed-deposit':
      return holding.currentValue
    case 'bank':
    case 'joint':
      return holding.balance
    case 'stocks':
    case 'unit-trust':
    case 'prs':
      return sum(holding.lines.map((line) => line.valueMyr))
    case 'gold':
      return goldValue(holding)
    case 'crypto-wallet':
      return cryptoWalletTotal(
        cryptoHoldings.filter((h) => h.walletId === holding.walletId),
      )
  }
}

/** Gold is grams times a price, never a stored ringgit figure. */
export function goldValue(holding: GoldHolding): Amount {
  return holding.grams * holding.pricePerGram
}

/**
 * NET WORTH = `sum(holdings)` PLUS `sum(goals)`, AND NOTHING ELSE.
 *
 * This is the figure the whole flow is built to make honest. Figma draws
 * RM 450,958.84 beside eight cards that sum to RM 449,958.84 and a ninth account
 * it does not draw at all; deriving is what makes that visible instead of
 * shipping a hand-typed hero number that quietly stops matching its own cards.
 *
 * GOALS ARE A SEPARATE TERM, NOT A `Holding` — Gate 76, on Gate 75's ruling.
 * Goal money is the user's and belongs in the total, but a goal is not an
 * account: it has no `holdingValue`, no drill-down at `/finance/holding/...`,
 * and it must never appear in Gate 79's Top-Up source picker. Summing the
 * collection HERE rather than widening `Holding` is what makes all three true by
 * construction rather than by a filter somebody has to remember. See `Goal` in
 * `types.ts` for the three reasons in full.
 *
 * `goals` IS REQUIRED RATHER THAN DEFAULTED TO `[]`, for the reason
 * `Transaction.kind` is a required field: a default lets a call site omit it and
 * silently UNDERSTATE net worth by the whole goal balance, with nothing
 * reporting it. There is exactly one production call site, and it is a compile
 * error until it decides.
 */
export function netWorth(
  holdings: Holding[],
  cryptoHoldings: CryptoHolding[],
  goals: Goal[],
): Amount {
  return sum(holdings.map((h) => holdingValue(h, cryptoHoldings))) + goalsTotal(goals)
}

/**
 * A holding's recent move.
 *
 * Wallets derive theirs from their own tokens — the same function the Homepage's
 * crypto card already uses, so the two screens cannot disagree. Everything else
 * reports what it carries, which for the equity and fund holdings is nothing,
 * i.e. `'flat'`.
 */
export function holdingChangePct(
  holding: Holding,
  cryptoHoldings: CryptoHolding[],
): number {
  if (holding.type === 'crypto-wallet') {
    return cryptoWalletChange(
      cryptoHoldings.filter((h) => h.walletId === holding.walletId),
    ).pct
  }
  return holding.changePct ?? 0
}

/** Which holding types the design gives a trend to. FD, cash and gold do not move. */
export function hasTrend(holding: Holding): boolean {
  switch (holding.type) {
    case 'stocks':
    case 'unit-trust':
    case 'prs':
    case 'crypto-wallet':
      return true
    case 'fixed-deposit':
    case 'bank':
    case 'joint':
    case 'gold':
      return false
  }
}

// ------------------------------------------------------- fixed deposit (B3)

/**
 * The FD's dates, computed from `TODAY` rather than transcribed (B5).
 *
 * Maturity is `remainingMonths` ahead; the start is `termYears` before maturity.
 * So "15 Months remaining" is true on every day the app is opened, which is the
 * whole point — the three dates Figma prints agreed only on the day it was drawn.
 */
export function fixedDepositDates(holding: FixedDepositHolding): {
  start: Date
  maturity: Date
} {
  const maturity = addMonths(TODAY, holding.remainingMonths)
  return { start: addYears(maturity, -holding.termYears), maturity }
}

/**
 * B3 — THE PRINCIPAL IS DERIVED, AND THIS IS THE INTERESTING DIRECTION.
 *
 *     principal = currentValue / (1 + rate * elapsedYears)
 *
 * RM 150,000.00 is authoritative: it is what the overview card and the hero both
 * draw, and it is what net worth is built from. Figma's "Principal Amount
 * RM 125,000" cannot be reconciled with it — 125,000 at 3.5% would need over
 * five and a half years to reach 150,000, on a deposit the same screen says has
 * a three-year term. And Figma's "Accrued Interest RM 3,750" is exactly
 * 125,000 x 3% x 1 year, a third rate on a fourth period. Three of the four
 * figures contradict each other, so only the value survives and the rest are
 * recomputed. FIX IN FIGMA, both of them.
 */
export function fixedDepositPrincipal(holding: FixedDepositHolding): Amount {
  const { start } = fixedDepositDates(holding)
  const elapsedYears = yearsBetween(start, TODAY)
  return holding.currentValue / (1 + (holding.ratePct / 100) * elapsedYears)
}

/** What the deposit has earned so far. The complement of the principal, exactly. */
export function fixedDepositAccrued(holding: FixedDepositHolding): Amount {
  return holding.currentValue - fixedDepositPrincipal(holding)
}

/** Value at maturity, if it runs the full term at the stated rate. */
export function fixedDepositAtMaturity(holding: FixedDepositHolding): Amount {
  return (
    fixedDepositPrincipal(holding) * (1 + (holding.ratePct / 100) * holding.termYears)
  )
}

// ------------------------------------------------------------ the trend chart

/**
 * Month-to-date net worth, one point per elapsed day.
 *
 * B6 — DERIVED, NOT TRANSCRIBED. Figma's chart is two flattened `<img>` vectors;
 * no series, point count or curve is recoverable from it. So the series is
 * computed from the holdings themselves, and it moves when they do:
 *
 *  - A holding with a recorded move is walked back to its start-of-window value
 *    and COMPOUNDED forward at a constant daily rate. Compounding rather than
 *    interpolating is what gives the line its shape: Bitcoin at +10.2% and
 *    Ethereum at -2.49% curve in opposite directions, and their sum is not a
 *    straight line.
 *  - The fixed deposit ACCRUES, on the same simple-interest rule its principal
 *    is derived from.
 *  - Everything else is flat, because nothing in the file says otherwise.
 *
 * ONE INTERPRETATION IS BEING MADE AND IT IS WORTH NAMING: the file records one
 * percentage per token with NO PERIOD attached. Spending that move across the
 * month-to-date window is a choice. It is the only choice that yields a series
 * at all, and it is stated here rather than buried.
 *
 * The window is live — `points.length` is today's day of month and the domain is
 * the month's length, so on the 1st the chart is a single point and on the 31st
 * it fills the axis. Figma drew the 15th of a 31-day month; a pinned `TODAY` on
 * such a day reproduces it.
 */
export function netWorthSeries(
  holdings: Holding[],
  cryptoHoldings: CryptoHolding[],
): number[] {
  const days = TODAY.getDate()
  const startOfMonth = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)

  return Array.from({ length: days }, (_, dayIndex) =>
    sum(
      holdings.map((holding) =>
        holdingValueOnDay(holding, cryptoHoldings, dayIndex, days, startOfMonth),
      ),
    ),
  )
}

function holdingValueOnDay(
  holding: Holding,
  cryptoHoldings: CryptoHolding[],
  dayIndex: number,
  days: number,
  startOfMonth: Date,
): Amount {
  const current = holdingValue(holding, cryptoHoldings)

  // The deposit accrues rather than moves. Its value on a given day is its
  // principal grown by the interest earned up to that day.
  if (holding.type === 'fixed-deposit') {
    const { start } = fixedDepositDates(holding)
    const day = new Date(startOfMonth.getTime())
    day.setDate(startOfMonth.getDate() + dayIndex)
    const principal = fixedDepositPrincipal(holding)
    return principal * (1 + (holding.ratePct / 100) * yearsBetween(start, day))
  }

  const pct = holdingChangePct(holding, cryptoHoldings)
  if (pct === 0 || days < 2) return current

  // Walk back to the window's opening value, then compound forward to `dayIndex`.
  const opening = current / (1 + pct / 100)
  const dailyRate = Math.pow(current / opening, 1 / (days - 1)) - 1
  return opening * Math.pow(1 + dailyRate, dayIndex)
}

/** Month-to-date change — the chart's callout. The last point minus the first. */
export function netWorthChange(series: number[]): Amount {
  if (series.length < 2) return 0
  return series[series.length - 1] - series[0]
}

/** Total x slots for the chart — the whole month, even before it has elapsed. */
export function chartDomain(): number {
  return daysInMonth(TODAY)
}

// ------------------------------------------------------- Flow 8: the filter

/**
 * The four facets of Flow 8's filter sheet, as a value.
 *
 * `null` means "All" on the two list facets — an ABSENT constraint, not an empty
 * selection. The distinction matters because an empty array would otherwise have
 * to mean "match everything", which reads backwards at the call site and makes
 * "the user deselected every payee" unexpressible.
 */
export interface TransactionFilter {
  /** Merchant/person names to keep. `null` = All. */
  payees: string[] | null
  /** Payment kinds to keep. `null` = All. */
  methods: TransactionMethod[] | null
  dateRange: TransactionDateRangeId
  /** Inclusive MAGNITUDE bounds — see `filterTransactions`. */
  amountMin: Amount
  amountMax: Amount
}

export type TransactionDateRangeId = 'all' | 'this-month' | 'last-7' | 'last-30'

/**
 * The four facets, as an identity a chip can carry.
 *
 * THE AMOUNT FACET IS ONE MEMBER DESPITE BEING TWO FIELDS. `amountMin` and
 * `amountMax` are one control in the sheet and one chip in the row, so
 * splitting them here would let a caller clear half a range.
 */
export type TransactionFacet = 'type' | 'date' | 'payee' | 'amount'

/**
 * One applied-filter chip: the facet it summarises, and the text it prints.
 *
 * THE FACET IS WHAT MAKES A CHIP DISMISSIBLE. A bare label cannot say what to
 * clear — two facets can print the same string (`All` is both the type
 * default and, at a different range, nothing else), so the row would have to
 * infer identity from position, which is exactly the coupling that breaks the
 * day the payee chip appears and shifts every index after it.
 */
export interface TransactionFilterChip {
  facet: TransactionFacet
  label: string
}

/**
 * The date-range options, with A8's capitalization FIXED IN CODE.
 *
 * Figma writes "This Month", "last 7 days" and "Last 30 days" — three different
 * capitalizations in one control (inventory A8, dispositioned FIX IN CODE in the
 * gap register). One casing is applied here; "This Month" is the spelling kept,
 * because it is the one the applied chip on `Finance_Transaction01` renders.
 */
export const TRANSACTION_DATE_RANGES: { id: TransactionDateRangeId; label: string }[] = [
  { id: 'all', label: 'All Time' },
  { id: 'this-month', label: 'This Month' },
  { id: 'last-7', label: 'Last 7 Days' },
  { id: 'last-30', label: 'Last 30 Days' },
]

/**
 * The Type facet's options, as a RUNTIME list the sheet can map over.
 *
 * `TransactionMethod` is a type union, which erases at compile time — a chip
 * row cannot iterate it. The list therefore has to exist as a value, and the
 * only question is whether adding a fourth method to the union can leave this
 * behind. It cannot: the keys are declared through a
 * `Record<TransactionMethod, true>`, so an unlisted member is a TYPE ERROR at
 * `npx tsc -b --force` rather than a chip that silently stops being offered.
 *
 * DERIVING IT FROM THE LEDGER'S ROWS WAS THE OTHER OPTION AND `types.ts`
 * ALREADY REJECTED IT, in the note above `TransactionMethod`: a facet built
 * from whatever happens to be present "silently loses an option when the last
 * row using it is deleted". This keeps the closed set closed.
 *
 * THE THREE VALUES ARE THE DISPLAY STRINGS, so there is no lookup table and
 * none is wanted — the ledger already renders `method` unmodified as
 * `titleInfo`.
 */
const TRANSACTION_METHOD_KEYS: Record<TransactionMethod, true> = {
  'Card Payment': true,
  'Fund Transfer': true,
  'Crypto Transfer': true,
}

export const TRANSACTION_METHODS = Object.keys(
  TRANSACTION_METHOD_KEYS,
) as TransactionMethod[]

/** The slider's own bounds — the full range the amount facet can express. */
export const TRANSACTION_AMOUNT_FLOOR = 0
export const TRANSACTION_AMOUNT_CEILING = 10000

/** Everything, i.e. what the screen shows once all four facets are cleared. */
export const TRANSACTION_FILTER_ALL: TransactionFilter = {
  payees: null,
  methods: null,
  dateRange: 'all',
  amountMin: TRANSACTION_AMOUNT_FLOOR,
  amountMax: TRANSACTION_AMOUNT_CEILING,
}

/**
 * A DEMONSTRATION FILTER — one applied filter the suite can photograph.
 *
 * Payee All, **Type Card Payment**, **All Time**, RM 0-500. Over the 53-row
 * ledger it returns **14 rows**.
 *
 * THE COUNT DID NOT MOVE WHEN THE LEDGER MORE THAN DOUBLED AT GATE 77, and that
 * is the Type facet doing the work: all 28 relocated contributions are 'Fund
 * Transfer', so the 'Card Payment' chip excludes every one of them before the
 * amount cap is reached. The `[overlay:applied]` ladder is unmoved for the same
 * reason - 16 after the chip, 14 after the cap, both measured.
 *
 * ──────────── IT IS NO LONGER FIGMA'S FILTER, AND THAT IS GATE 53 ────────────
 *
 * IT WAS `Finance_Transaction01`'s FOUR DRAWN CHIPS — Payee All, Type All,
 * **This Month**, RM 0-500 — from Gate 41 to Gate 53, returning 15 rows and
 * then 16. Gate 53 replaced the DATE facet with the TYPE facet. The RM 0-500
 * half is still Figma's own, literally.
 *
 * THE REASON IS THAT THE DATE FACET IS ANCHORED TO THE NEWEST ROW AND THE
 * NEWEST ROW MOVED A YEAR. Gate 53 added two rows dated 2026-09-12 (the date
 * printed on the paper they were captured from), so `ledgerNow()` — which is
 * the newest `occurredAt`, see below — is now September 2026. "This Month"
 * therefore means September 2026 and matches **exactly those two rows**:
 * measured, this constant collapsed from 16 rows to **2**.
 *
 * THAT IS NOT A BROKEN PREDICATE, WHICH IS PRECISELY WHY IT HAD TO BE CHANGED.
 * "This month" genuinely does contain two rows; the filter is correct and
 * useless. Its one consumer is the `[overlay:applied]` walk state, whose whole
 * job is to be the suite's ONLY photograph of an applied filter and its ONLY
 * non-empty chip row (Gate 44). A screenshot of 2 rows out of 25 demonstrates
 * almost nothing about a filtered ledger.
 *
 * ─────────────────── WHY THESE TWO FACETS AND NOT OTHERS ─────────────────────
 *
 * NEITHER IS ANCHORED TO THE NEWEST ROW, which was the requirement: `dateRange`
 * is `'all'`, so nothing here moves when a row is added to either end of the
 * ledger. Every other candidate was measured over the same 25 rows before this
 * one was chosen:
 *
 *   RM 0-500 alone             21 of 25   too weak — excludes only 4
 *   Card Payment alone         16 of 25   one chip only
 *   RM 0-100 alone             11 of 25   one chip only
 *   **Card Payment + RM 0-500  14 of 25   chosen**
 *   Card Payment + RM 0-100     9 of 25
 *   Fund Transfer + RM 0-500    5 of 25
 *
 * TWO FACETS, BECAUSE THE CHIP ROW IS HALF OF WHAT THE STATE COVERS. Gate 44
 * built `[overlay:applied]` as the only state that renders a chip at all, and
 * a two-chip row exercises `filterChipLabels`' joining and the row's own
 * layout where a single chip would not. The old filter drew two; this draws
 * two — `["Card Payment", "RM 0 - 500"]`.
 *
 * BOTH FACETS ARE LOAD-BEARING, MEASURED, so a facet that silently stopped
 * working changes the count rather than being masked by the other: of the 11
 * excluded rows, **7 are excluded by the method facet alone** and **2 by the
 * amount facet alone** (`txn-ikea-0908` at -830.83 and `txn-ikea-0815` at
 * -2647.67, both Card Payments over the cap). The remaining 2 are excluded by
 * both.
 *
 * IT ALSO COVERS A FACET NOTHING COVERED BEFORE. The old ladder operated the
 * date and amount controls; no walk state had ever selected a transaction TYPE.
 * So this is a coverage gain rather than a like-for-like swap.
 *
 * BOTH GATE 53 ROWS FALL INSIDE IT — they are Card Payments of 38.60 and 70.85
 * — which is deliberate: they are the rows every add-and-link path is
 * hand-tested against, so they should be visible on the one filtered screen.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FIGMA'S "Apply Filter (15)" NOW CORRESPONDS TO NOTHING HERE, AND THE DRIFT IS
 * TWO GATES DEEP. Gate 48 broke it first (reconciling receipt-linked amounts
 * moved Jaya Grocer under the cap, 15 -> 16); Gate 53 replaced a facet outright.
 * THE FRAME IS THE STALE PARTY. Do not restore 15 by moving an amount away from
 * its receipt, by re-dating a row away from its receipt's printed date, or by
 * narrowing the cap to exclude a row that genuinely falls inside it.
 */
export const TRANSACTION_FILTER_APPLIED: TransactionFilter = {
  payees: null,
  methods: ['Card Payment'],
  dateRange: 'all',
  amountMin: 0,
  amountMax: 500,
}

/**
 * The instant the date facet measures back from.
 *
 * IT IS THE LEDGER'S NEWEST ROW, NOT `TODAY`, AND THAT IS A DELIBERATE
 * DIVERGENCE FROM B5 rather than an oversight. Every other date in this app is
 * an offset from `TODAY` so nothing goes stale; the transaction ledger is the
 * one place that CANNOT be, because inventory SYS-7 fixes most of these rows to
 * September 2025 and Flow 1's Homepage reconciles against "15 Sept 22:03"
 * literally.
 *
 * So the clocks genuinely disagree, and by a lot: the harness pins `TODAY` to
 * 2026-08-15 (`PINNED_NOW` in `e2e/harness.ts`, chosen so the fixed deposit and
 * the net-worth chart derive sensibly). A "This Month" facet measured against
 * `TODAY` would ask for August 2026 and match 2 of the 53 rows — a filter that
 * is technically correct, all but empty, and impossible to tell apart from a
 * broken predicate.
 *
 * IT MATCHED ZERO UNTIL GATE 77 AND NOW MATCHES TWO, WHICH IS WORSE. The two
 * are savings contributions dated 2026-08-01 and 2026-08-15; an empty result at
 * least looks broken, while a plausible two-row month does not. The argument
 * for measuring from the newest row is unchanged and is now stronger.
 *
 * Measuring from the newest row keeps the facet DERIVED — move the ledger
 * forward a year and the window follows it, with no literal to update. The
 * alternative was a hardcoded September 2025 boundary, which is the thing this
 * file exists to avoid.
 *
 * ────────── GATE 53 MADE THIS THREE CLOCKS, AND IT COST A FILTER ────────────
 *
 * THE LEDGER'S PRESENT IS NO LONGER 2025-09-15. Gate 53 added two rows dated
 * 2026-09-12 — the date printed on the paper they were captured from — so this
 * function now returns September 2026 while 24 of the 53 rows remain in
 * September and August 2025. The clocks are `TODAY` (Aug 2026), the newest row
 * (Sept 2026), and the bulk of the SPENDING fixture (Sept 2025).
 *
 * GATE 77 DID NOT ADD A FOURTH CLOCK AND IT WIDENED THE THIRD. The 28 relocated
 * contributions span 2025-09-15 to 2026-08-15 - every month between the two
 * spending clusters - so ten months of this ledger now hold savings and nothing
 * else. `ledgerNow()` itself is unmoved: the newest contribution is a month
 * behind the newest spending row.
 *
 * THE "DERIVED, SO IT FOLLOWS" PROPERTY WORKED EXACTLY AS DESIGNED AND THAT WAS
 * THE PROBLEM. The window followed the newest row, as promised — straight past
 * every other row in the ledger. Measured: "This Month" went from matching 18
 * rows to matching **2**, namely those two, and `TRANSACTION_FILTER_APPLIED`
 * went 16 -> 2 with it. Nothing was broken; the predicate was correct and the
 * result was useless.
 *
 * SO THE LESSON IS NOT "DON'T DERIVE" — a hardcoded boundary would have gone
 * silently empty instead, which is worse. It is that A WINDOW ANCHORED TO AN
 * EXTREMUM IS ONLY AS REPRESENTATIVE AS THAT EXTREMUM. Gate 53's answer was to
 * stop the one consumer that needed a representative subset from depending on
 * the date facet at all: `TRANSACTION_FILTER_APPLIED` is now anchored on type
 * and amount, neither of which moves when a row is added at either end. This
 * function is UNCHANGED and is still the right anchor for a user-chosen date
 * facet, where "this month" relative to the data they are looking at is exactly
 * what a user means.
 */
export function ledgerNow(transactions: Transaction[]): Date {
  const newest = transactions.reduce(
    (latest, t) => (t.occurredAt > latest ? t.occurredAt : latest),
    transactions[0]?.occurredAt ?? '',
  )
  return new Date(newest)
}

/** Every payee in the ledger, once each, alphabetical — the Payee facet's options. */
export function transactionPayees(transactions: Transaction[]): string[] {
  return [...new Set(transactions.map((t) => t.merchant))].sort((a, b) =>
    a.localeCompare(b),
  )
}

/** Whether one row falls inside a named window, measured back from `ledgerNow`. */
function withinRange(
  transaction: Transaction,
  range: TransactionDateRangeId,
  now: Date,
): boolean {
  if (range === 'all') return true

  const at = new Date(transaction.occurredAt)

  if (range === 'this-month') {
    return (
      at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth()
    )
  }

  const days = range === 'last-7' ? 7 : 30
  const floor = new Date(now.getTime())
  floor.setDate(floor.getDate() - days)
  return at > floor && at <= now
}

/**
 * Apply all four facets, plus the search box, and return newest-first.
 *
 * A REAL PREDICATE OVER THE WHOLE LEDGER, never a hand-picked list. Flow 8's
 * nine drawn rows are the OUTPUT of this function against
 * `TRANSACTION_FILTER_APPLIED`, not an input to it — which is the only way the
 * screen can honour a filter the user then changes.
 *
 * THE AMOUNT FACET BOUNDS MAGNITUDE, NOT SIGNED VALUE. Figma's control is an
 * "RM 0 - 500" range over a 0-10,000 slider, and a ledger that stores outflows
 * as negative would otherwise exclude every debit at a floor of 0 — i.e. the
 * whole list. `Math.abs` is therefore load-bearing rather than defensive, and
 * `txn-maybank-0907` (+RM 1,500) is the row that proves it: it is a CREDIT
 * excluded by the cap, so dropping the `Math.abs` would let it back in while
 * every debit vanished.
 *
 * The search box matches merchant OR method, case-insensitively, so typing
 * "crypto" narrows to the two Crypto Transfers.
 */
export function filterTransactions(
  transactions: Transaction[],
  filter: TransactionFilter,
  search = '',
): Transaction[] {
  const now = ledgerNow(transactions)
  const needle = search.trim().toLowerCase()

  return transactions
    .filter((t) => {
      if (filter.payees && !filter.payees.includes(t.merchant)) return false
      if (filter.methods && !filter.methods.includes(t.method)) return false
      if (!withinRange(t, filter.dateRange, now)) return false

      const magnitude = Math.abs(t.amount)
      if (magnitude < filter.amountMin || magnitude > filter.amountMax) return false

      if (needle) {
        const haystack = `${t.merchant} ${t.method}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

/**
 * The applied filter as chip labels — what `Finance_Transaction01` draws.
 *
 * DERIVED FROM THE FILTER VALUE, so a facet the user changes is a chip that
 * changes with it.
 *
 * THE MODEL IS ONE CHIP PER FACET, VALUE ONLY, WITH THE PAYEE FACET THE SOLE
 * EXCEPTION — and all three halves of that were READ OFF THE FILE rather than
 * inferred. `Frame 467`, in each of the gate's three frames:
 *
 * | frame | chip row | children |
 * |---|---|---|
 * | `1266:14328` Transaction01 | 281 wide | `All` 52, `This Month` 103, *`Watson` 84 HIDDEN*, `RM 0 - 500` 102 |
 * | `1376:24708` …_all rows | 377 wide | the same four, with `Watson` VISIBLE |
 * | `1266:14329` Transaction02 | 281 wide | three children; no `Watson` node at all |
 *
 * 1 · NO FACET PREFIX. Every label is the VALUE — `All`, never `Type: All`.
 *     THIS HALF IS UNCHANGED and is still exactly what the file draws.
 *
 * 2 · A FACET AT ITS DEFAULT RENDERS NO CHIP — AND THIS REVERSES WHAT FIGMA
 *     DRAWS, DELIBERATELY, AT GATE 44.
 *
 *     What the file shows is not in dispute and the reading above still
 *     stands: type, date and amount all sit at their defaults in
 *     `TRANSACTION_FILTER_APPLIED`, and Figma draws a chip for each. That was
 *     implemented literally, and it is what Gate 44 overturned.
 *
 *     THE REASON IS THAT A DEFAULT CHIP IS A CONTROL THAT CANNOT DO ANYTHING.
 *     Every chip carries a dismiss button, and dismissing a facet already at
 *     its default is a no-op — a control that is drawn, focusable, announced
 *     to a screen reader, and inert. The old note said as much in
 *     `clearFacet` ("dismissing a facet already at its default is a no-op by
 *     construction") and treated it as a curiosity rather than as the defect
 *     it is.
 *
 *     IT ALSO MAKES THE ROW MEAN SOMETHING. A row that prints "All / All Time
 *     / RM 0 - 10000" when nothing is filtered says the same thing as an
 *     empty row, at the cost of three lines of screen and four tap targets;
 *     under this model the presence of ANY chip is exactly the statement that
 *     a filter is in force.
 *
 *     THE "All" OPTIONS STAY INSIDE THE SHEET. They are how a user
 *     affirmatively clears a facet, and they are unaffected — only the
 *     OUTSIDE chip is suppressed.
 *
 * 3 · THE PAYEE CHIP WAS ALREADY THE EXCEPTION, AND IS NOW THE RULE. The
 *     evidence for it is one node in two states rather than two different
 *     nodes: `825:5389` carries `label="Watson"`, is `hidden` in
 *     Transaction01, visible in _all rows, and absent entirely from
 *     Transaction02 — whose own `Select` reads `Watson`, i.e. picked in the
 *     sheet but not yet applied. Gate 44 did not change the payee chip's
 *     behaviour at all; it made the other three behave the way it already
 *     did.
 *
 * THE ORDER IS THE CHIP ROW'S, NOT THE SHEET'S. Chips run type → date →
 * payee → amount; the sheet's sections run date → type → merchant → amount.
 * Do not tidy one into the other — they genuinely differ in the file.
 *
 * SUPERSEDES THE CARRIED "four chips, matching A5's count". A5 measured the
 * elongated exploratory frame, the one frame where a payee IS set. The
 * canonical 375 frame draws THREE.
 *
 * IT RETURNS FACET-TAGGED CHIPS, NOT LABELS, SINCE GATE 41-C. The row became
 * dismissible when DS v2.0.0 shipped a real `FilterChip`, and a dismiss
 * handler has to name the facet it clears — see `TransactionFilterChip` for
 * why position could not stand in for that. The MODEL above is unchanged; only
 * the shape of what this returns is.
 */
/**
 * Field-by-field equality for two filters.
 *
 * IT ITERATES THE VALUE'S OWN KEYS RATHER THAN LISTING THEM. Writing the five
 * field names out here would be a fourth place that has to be updated when
 * `TransactionFilter` grows a field, and the failure would be SILENT — a new
 * field would simply never be compared, so a facet carrying it would report
 * itself at its default forever.
 *
 * ARRAYS ARE COMPARED BY MEMBER because `payees` and `methods` hold arrays,
 * and `===` on two arrays is identity. `clearFacet` returns a NEW object, so
 * an identity comparison would call every list facet non-default.
 */
function sameFilter(a: TransactionFilter, b: TransactionFilter): boolean {
  return (Object.keys(a) as (keyof TransactionFilter)[]).every((key) => {
    const x = a[key]
    const y = b[key]
    if (Array.isArray(x) || Array.isArray(y)) {
      if (!Array.isArray(x) || !Array.isArray(y)) return false
      return x.length === y.length && x.every((v, i) => v === y[i])
    }
    return x === y
  })
}

/**
 * Is this facet sitting at its default — i.e. constraining nothing?
 *
 * IT IS DERIVED FROM `clearFacet`, NOT FROM RESTATED LITERALS, AND THAT IS THE
 * WHOLE POINT. A facet is at its default exactly when clearing it changes
 * nothing, so this asks that question literally: clear the facet, and compare.
 * `clearFacet` already reads its reset values out of `TRANSACTION_FILTER_ALL`,
 * so there is ONE definition of "default" in this file and this reuses it
 * rather than adding a second one that could drift.
 *
 * THE ALTERNATIVE WAS A PER-FACET COMPARISON AGAINST
 * `TRANSACTION_FILTER_ALL`, and it is worse in a specific way: it would have
 * to know that the amount facet is two fields and the list facets are arrays,
 * which is knowledge `clearFacet` already encodes. Two switch statements over
 * the same union, kept in step by hand, is how the chip row and the sheet come
 * to disagree about what "cleared" means.
 */
export function isFacetDefault(
  filter: TransactionFilter,
  facet: TransactionFacet,
): boolean {
  return sameFilter(filter, clearFacet(filter, facet))
}

export function filterChips(filter: TransactionFilter): TransactionFilterChip[] {
  const range = TRANSACTION_DATE_RANGES.find((r) => r.id === filter.dateRange)
  const chips: TransactionFilterChip[] = [
    { facet: 'type', label: filter.methods ? filter.methods.join(', ') : 'All' },
    { facet: 'date', label: range ? range.label : 'All Time' },
  ]
  if (filter.payees) chips.push({ facet: 'payee', label: filter.payees.join(', ') })
  chips.push({
    facet: 'amount',
    label: `RM ${filter.amountMin} - ${filter.amountMax}`,
  })
  /*
    A FACET AT ITS DEFAULT RENDERS NO CHIP — see the model note above for why
    this reverses what Figma draws, and it is the LAST step rather than a set
    of guards on each push so that every facet is judged by one predicate.
  */
  return chips.filter((chip) => !isFacetDefault(filter, chip.facet))
}

/**
 * Clear one facet, returning a NEW filter with that facet at its `ALL` value.
 *
 * IT READS ITS RESET VALUES OUT OF `TRANSACTION_FILTER_ALL` RATHER THAN
 * RESTATING THEM, which is what stops this drifting from the cleared state
 * Gate 43's sheet produces. The amount facet is two fields and is
 * therefore ONE `facet` here, not two — dismissing "RM 0 - 500" restores both
 * bounds, because half a restored range is not a cleared facet.
 *
 * DISMISSING A FACET ALREADY AT ITS DEFAULT IS A NO-OP BY CONSTRUCTION, not by
 * a guard. Type and date chips render at their defaults — that is the chip
 * model, see `filterChips` — so their dismiss writes the value already there
 * and `filterTransactions` returns the same rows. The affordance is still
 * drawn on every chip because Figma draws a close glyph on every chip
 * (register B1); suppressing it on the defaulted ones would make the row's
 * shape depend on the filter value, which the source does not do.
 */
export function clearFacet(
  filter: TransactionFilter,
  facet: TransactionFacet,
): TransactionFilter {
  switch (facet) {
    case 'type':
      return { ...filter, methods: TRANSACTION_FILTER_ALL.methods }
    case 'date':
      return { ...filter, dateRange: TRANSACTION_FILTER_ALL.dateRange }
    case 'payee':
      return { ...filter, payees: TRANSACTION_FILTER_ALL.payees }
    case 'amount':
      return {
        ...filter,
        amountMin: TRANSACTION_FILTER_ALL.amountMin,
        amountMax: TRANSACTION_FILTER_ALL.amountMax,
      }
  }
}

// ============================================================ Flow 9 — receipts

/**
 * Does this transaction have a receipt?
 *
 * THE REPLACEMENT FOR `Transaction.hasReceipt`, WHICH GATE 48 DELETED. The flag
 * was a stored boolean on 10 of the 23 rows and nothing kept it in step with the
 * receipt collection that is the actual evidence — so a receipt deleted from
 * `receipts.ts` left a ledger row still drawing the glyph, and a receipt added
 * left a row that did not. Two copies of one fact, with no reconciler.
 *
 * This is inventory §6's rule ("a figure that is computable from another figure
 * is not stored") applied to a boolean rather than to a total, and it is the
 * same move `categoryTotal` and `netWorth` already make.
 *
 * THE RENDER PATH IS UNCHANGED. `ListItem.hasReceiptIcon` still takes a boolean;
 * it is now computed at the call site instead of read off the row.
 *
 * AND THAT MOVED THE FAILURE MODE FROM A WRONG VALUE TO AN OMITTED ONE, WHICH
 * IS HARDER TO SEE — `hasReceiptIcon` DEFAULTS TO `true` (`ListItem.tsx:51`),
 * so a call site that simply forgets this call draws the glyph on every row and
 * nothing types, lints or reviews as wrong. Gate 48 wired two of the three
 * sites that render a ledger row and missed `HoldingDetailScreen`, which drew a
 * receipt mark on every row of `/finance/holding/main` (21 at the time, 49 since
 * Gate 77) against the 8 that have one, for five gates. `e2e/receipt-glyph.spec.ts`
 * is the guard: it checks every rendered ledger row against this function at
 * every call site, so the next omission reddens the suite instead of minting a baseline of itself.
 *
 * LINEAR SCAN, DELIBERATELY, AND IT IS NOT A PERFORMANCE OVERSIGHT. Ten receipts
 * against 53 rows is 530 comparisons for a whole ledger render. An index would
 * be a second structure to build, memoise and keep in step — the exact shape of
 * the problem this function exists to remove. Build one when a measurement says
 * to, not before.
 */
export function transactionHasReceipt(
  receipts: Receipt[],
  transactionId: string,
): boolean {
  return receipts.some((r) => r.transactionId === transactionId)
}

/** The receipt linked to a transaction, or `undefined`. */
export function receiptForTransaction(
  receipts: Receipt[],
  transactionId: string,
): Receipt | undefined {
  return receipts.find((r) => r.transactionId === transactionId)
}

/**
 * Fill `addedAt` on every receipt that lacks one, from its `capturedAt` — run
 * ONCE, on first load, over the seed (Gate 58).
 *
 * THE SEED PREDATES THE FIELD, and its receipts were "added" when they were
 * authored, which is no fact at all. Their printed date is the ordering they
 * have always had, so backfilling from it keeps all ten exactly where they sit
 * today, and places them below anything added from now on — a capture's
 * `addedAt` is the device clock, and the seed is dated 2025.
 *
 * `.000` IS APPENDED so every `addedAt` has one shape and compares as a string.
 * A receipt that already carries one is returned unchanged.
 */
export function backfillAddedAt(receipts: Receipt[]): Receipt[] {
  return receipts.map((r) => (r.addedAt ? r : { ...r, addedAt: `${r.capturedAt}.000` }))
}

/** A receipt's `addedAt`, which the Receipts tab cannot order without. */
function addedAtOf(receipt: Receipt): string {
  if (!receipt.addedAt) {
    throw new Error(
      `receipt ${receipt.id} has no addedAt — every receipt is backfilled on load ` +
        '(backfillAddedAt) and every capture is stamped (capturedToReceipt)',
    )
  }
  return receipt.addedAt
}

/**
 * Receipts newest-ADDED-first — the order the Receipts tab renders in (Gate 58).
 *
 * SORTED ON `addedAt`, TO THE MILLISECOND, and never on `capturedAt` any more:
 * see `Receipt.addedAt` for Teku's ruling. Nor on `displayName` — the camera-
 * roll numbers are a coincidence, the timestamp is the fact.
 *
 * AN EXACT TIE KEEPS LIBRARY ORDER, EXPLICITLY. Every receipt from one
 * selection shares one `addedAt` (the clock is read once per selection), and
 * `addReceipt` appends them in the order the files were picked — so the
 * earlier library position sorts first and the batch reads in pick order
 * rather than shuffling. The index is compared rather than trusting sort
 * stability, so the rule is written where it can be read and mutated.
 */
export function receiptsNewestFirst(receipts: Receipt[]): Receipt[] {
  return receipts
    .map((receipt, index) => ({ receipt, index, addedAt: addedAtOf(receipt) }))
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.index - b.index)
    .map(({ receipt }) => receipt)
}

/**
 * One month's worth of receipts, with the heading that month prints.
 *
 * Figma's Receipts tab groups by month under a section heading. The groups are
 * DERIVED from `addedAt` (since Gate 58; `capturedAt` until then) rather than
 * stored on the record, for the reason a
 * month is not a property of a receipt: it is a property of how this one screen
 * chooses to slice them, and a second screen slicing by merchant would have to
 * ignore a stored field.
 */
export interface ReceiptMonthGroup {
  /** `2025-09` — stable, sortable, and never rendered. */
  key: string
  /** `September 2025` — what the section heading prints. */
  label: string
  receipts: Receipt[]
}

/**
 * Group receipts into months, newest month first, newest receipt first inside —
 * by when each was ADDED (Gate 58), so the headings read as when things arrived.
 *
 * THE LABEL IS FORMATTED HERE RATHER THAN IN `format.ts` BECAUSE IT IS NOT A
 * MONEY OR TIMESTAMP FORMAT — it is this grouping's own heading, and it has
 * exactly one consumer. If a second surface ever needs "September 2025", move it
 * then.
 *
 * `en-GB` AND AN EXPLICIT LOCALE, NOT THE HOST DEFAULT. The harness pins the
 * browser locale (`playwright.config.ts`), but the app also runs in a real
 * browser where the default is the visitor's; a month name that changed language
 * per visitor would be a baseline that only agrees by luck. Every other formatter
 * in this app already passes a locale for the same reason.
 */
export function groupReceiptsByMonth(receipts: Receipt[]): ReceiptMonthGroup[] {
  const groups = new Map<string, Receipt[]>()
  for (const receipt of receiptsNewestFirst(receipts)) {
    const key = addedAtOf(receipt).slice(0, 7)
    const bucket = groups.get(key)
    if (bucket) bucket.push(receipt)
    else groups.set(key, [receipt])
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => ({
      key,
      label: monthLabel(key),
      receipts: items,
    }))
}

/**
 * `2025-09` → `September 2025` — a month heading, for the two surfaces that
 * draw one.
 *
 * EXTRACTED AT GATE 51-B, WHEN THE SECOND CONSUMER ARRIVED, and not before —
 * `groupReceiptsByMonth`'s own note says to move it then. It is provably the
 * same expression that function carried, moved rather than rewritten, so the
 * Receipts tab's headings cannot have changed.
 *
 * `en-GB` AND AN EXPLICIT LOCALE, NOT THE HOST DEFAULT. The harness pins the
 * browser locale, but the app also runs in a real browser where the default is
 * the visitor's; a month name that changed language per visitor would be a
 * baseline that only agrees by luck.
 */
export function monthLabel(key: string): string {
  return new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
}

/** One month's worth of transactions, with the heading that month prints. */
export interface TransactionMonthGroup {
  /** `2025-09` — stable, sortable, and never rendered. */
  key: string
  /** `September 2025` — what the section heading prints. */
  label: string
  transactions: Transaction[]
}

/**
 * Group transactions into months, newest month first, newest row first inside —
 * the manual link picker's "Everything else" list (Gate 51-B).
 *
 * DERIVED FROM `occurredAt`, never stored, for the same reason
 * `groupReceiptsByMonth` derives from `addedAt`: a month is a property of how
 * one screen slices the rows, not of a row.
 *
 * THE LEDGER ITSELF DOES **NOT** GROUP BY MONTH — it renders one flat
 * date-descending list (`TransactionsLedger.tsx`). This grouping exists because
 * the picker shows the WHOLE ledger at once with no filter chips to narrow it,
 * where the ledger shows a filtered slice. Do not "restore consistency" by
 * grouping the ledger; that would move four committed baselines to make two
 * screens look alike.
 */
export function groupTransactionsByMonth(
  transactions: Transaction[],
): TransactionMonthGroup[] {
  const groups = new Map<string, Transaction[]>()
  const newestFirst = [...transactions].sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt),
  )
  for (const transaction of newestFirst) {
    const key = transaction.occurredAt.slice(0, 7)
    const bucket = groups.get(key)
    if (bucket) bucket.push(transaction)
    else groups.set(key, [transaction])
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => ({ key, label: monthLabel(key), transactions: items }))
}

/**
 * One month's worth of receipts under "Receipt date" ordering, with the
 * heading that month prints — the Receipts tab's sort control, second mode
 * (Gate 64).
 *
 * A SIBLING OF `groupReceiptsByMonth`, NOT A REPLACEMENT. That function's
 * behaviour is untouched — every line of it is exactly as Gate 58 left it —
 * so this is additive rather than a change to what the default sort does.
 *
 * DERIVED FROM `capturedAt`, THE PRINTED DATE, where `groupReceiptsByMonth`
 * derives from `addedAt`. This is the grouping Gate 58 retired as the
 * DEFAULT — filing by the printed date put a fresh bulk add years below the
 * library, under its paper's own month — and it is not gone, it is the
 * second choice a user can pick explicitly.
 *
 * `Receipt.capturedAt` IS NEVER `null`, WHICH IS WHY `dateWasRead` IS A
 * PARAMETER RATHER THAN A CHECK ON THE FIELD. An unread capture's `capturedAt`
 * falls back to the MOMENT OF CAPTURE (`capturedToReceipt`, Gate 51 item T) —
 * a real local timestamp, syntactically indistinguishable from a transcribed
 * one. So "was this date actually read off the paper" is not a fact
 * `capturedAt`'s VALUE can answer; `receiptCapture.ts` tracks it at capture
 * time (`receiptDateWasRead`) and this stays pure over the seeded collection,
 * taking the answer in rather than reaching for a browser-side store the way
 * `derive.ts`'s own boundary note (see its imports) forbids.
 *
 * EVERY RECEIPT `dateWasRead` REPORTS FALSE FOR IS COLLECTED INTO ONE
 * TRAILING GROUP, "No receipt date" — never split into a month of its own
 * (which would be inventing a date the paper never printed), and never
 * dropped (which would hide that the capture exists). Ordered inside itself
 * by `receiptsNewestFirst` — `addedAt`, the one date this app actually knows
 * for a receipt whose printed date it does not, rather than a second ordering
 * rule invented for one group.
 *
 * TIES IN A DATED MONTH KEEP LIBRARY ORDER, BY INDEX — the same rule
 * `receiptsNewestFirst` uses for `addedAt`, applied here to `capturedAt`.
 */
export function groupReceiptsByCapturedDate(
  receipts: Receipt[],
  dateWasRead: (receipt: Receipt) => boolean,
): ReceiptMonthGroup[] {
  const indexed = receipts.map((receipt, index) => ({ receipt, index }))
  const dated = indexed.filter(({ receipt }) => dateWasRead(receipt))
  const undated = indexed.filter(({ receipt }) => !dateWasRead(receipt))

  const newestFirst = [...dated].sort(
    (a, b) => b.receipt.capturedAt.localeCompare(a.receipt.capturedAt) || a.index - b.index,
  )

  const groups = new Map<string, Receipt[]>()
  for (const { receipt } of newestFirst) {
    const key = receipt.capturedAt.slice(0, 7)
    const bucket = groups.get(key)
    if (bucket) bucket.push(receipt)
    else groups.set(key, [receipt])
  }
  const monthGroups: ReceiptMonthGroup[] = [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => ({ key, label: monthLabel(key), receipts: items }))

  if (undated.length === 0) return monthGroups
  return [
    ...monthGroups,
    {
      key: 'no-receipt-date',
      label: 'No receipt date',
      receipts: receiptsNewestFirst(undated.map(({ receipt }) => receipt)),
    },
  ]
}

/**
 * Receipts matching a free-text needle — the Receipts tab's search box.
 *
 * MATCHES `displayName` AND `merchant`, and deliberately NOT `filename`. The
 * filename is a developer path a user has never seen (`receipt_aeonbig01.jpg`);
 * letting it match would make the box find things for reasons the user cannot
 * see on screen. Same shape as the ledger's search, which matches merchant and
 * method — the two things its rows actually print.
 */
export function filterReceipts(receipts: Receipt[], search = ''): Receipt[] {
  const needle = search.trim().toLowerCase()
  if (!needle) return receipts
  return receipts.filter((r) =>
    `${r.displayName} ${r.merchant}`.toLowerCase().includes(needle),
  )
}

/* ────────────────────────────────────────────────────────────── Gate 49 ──
   THE TRANSACTION DETAIL SHEET'S DERIVATIONS.

   Every figure the sheet prints that is not read straight off a record comes
   from this block. None of them is stored anywhere, which is the point: a
   subtotal beside the lines it sums, or an account name beside the account id
   it names, is the same fact written twice.
   ──────────────────────────────────────────────────────────────────────── */

/**
 * A receipt's subtotal — THE SUM OF ITS OWN LINE ITEMS, never a stored figure.
 *
 * SIX OF THE TEN DELIVERED RECEIPTS PRINT A SUBTOTAL THIS DOES NOT EQUAL, and
 * that disagreement is the reason to derive rather than transcribe. See the
 * header of `receipts.ts`, which records every discrepancy to the cent: the
 * printed subtotals are artwork, the line items are the only itemisation the
 * app has, and a screen that showed a subtotal contradicted by the lines
 * directly beneath it would be worse than one that shows an honest sum.
 *
 * ROUNDED TO THE CENT ON THE WAY OUT. Adding 8 float prices produces the usual
 * binary residue — 204.79999999999998 on `receipt-aeonbig01`, measured — and
 * `formatMyr` would render it correctly anyway, but a function that returns an
 * `Amount` should return one a caller can compare. Every price in the data has
 * at most two decimals, so cent-rounding loses nothing real.
 *
 * QUANTITY IS NOT A MULTIPLIER. `ReceiptLineItem.quantity` is a printed string
 * ("1", and one day "0.482 kg @ RM 34.90"), and `price` is the LINE total the
 * till printed — see the note on the type. Multiplying here would double-count
 * every line.
 */
export function receiptSubtotal(receipt: Receipt): Amount {
  const sum = receipt.lineItems.reduce((acc, item) => acc + item.price, 0)
  return Math.round(sum * 100) / 100
}

/**
 * ─────────────── WHICH OF A RECEIPT'S FIGURES WERE ACTUALLY READ (Gate 58) ─────
 *
 * The three money rows a receipt prints — subtotal, tax, total — each render an
 * em dash (`formatMyrOrUnread`) where the figure was never read, instead of a
 * "RM 0.00" that reads as a free bill. The row still renders: an absent row
 * hides that something was expected there, and nothing here is invented from
 * the line items. Each is decided from what the record ALREADY holds — no field
 * was added for it (Gate 58's ruling 2 permits only `addedAt`).
 */

/**
 * The receipt's total, or `null` when it was never read.
 *
 * ZERO IS THE UNREAD MARK, AND IT IS EXACT RATHER THAN A GUESS. A capture whose
 * total was not read is stored as 0 (`capturedToReceipt`, "never a guess");
 * the parser never returns 0 as a total (Gate 57, rule 2 — "a total of zero is
 * not a total"); the editor refuses one (`ReceiptEditor`, `> 0`); and every
 * seeded receipt's total is positive. So a stored 0 has exactly one origin.
 */
export function receiptTotalRead(receipt: Receipt): Amount | null {
  return receipt.total > 0 ? receipt.total : null
}

/**
 * ─────────────── DID THIS RECEIPT'S PHOTOGRAPH FAIL TO READ? (Gate 60) ─────────
 *
 * TRUE WHEN THE READING KEPT HAS NO LINE ITEMS, OR NO TOTAL — Gate 58's
 * `firstPassFailed`, applied once more to the final result. It is CALLED, not
 * restated, so the advisory and the second-pass trigger cannot drift apart.
 *
 * DERIVED FROM THE RECORD, NOT STORED (no field was added). At capture time the
 * two agree exactly: `lineItems` is copied through unchanged, and an unread
 * total is stored as 0, which `receiptTotalRead` reads back as `null` (see
 * above for why 0 has one origin). Measured over the cached readings of all 30
 * corpus images, record and parse agree on every one.
 *
 * IT CANNOT FIRE ON A TRANSCRIBED RECEIPT. All ten seeded receipts carry line
 * items and a positive total; the editor refuses a zero total and does not edit
 * line items, so no user action can make a seeded receipt satisfy this.
 *
 * WHAT IT CANNOT SEE, STATED: a reading that got SOME items and a total. A
 * receipt that came back with fewer lines than the paper printed, or one whose
 * "total" is a fragment of a phone number, looks successful here — nothing in the app knows
 * what the paper printed.
 *
 * IT DOES NOT CLEAR WHEN THE USER CORRECTS THE TOTAL BY HAND. The editor edits
 * merchant, date and total, never the line items, so an edited receipt with no
 * items still reports a failed reading. That is true of the photograph, which
 * is what the advisory talks about.
 */
export function receiptReadFailed(receipt: Receipt): boolean {
  return firstPassFailed({ lineItems: receipt.lineItems, total: receiptTotalRead(receipt) })
}

/**
 * The derived subtotal, or `null` when no line item was read. A sum over no
 * lines is not a subtotal of RM 0.00; it is the absence of one.
 */
export function receiptSubtotalRead(receipt: Receipt): Amount | null {
  return receipt.lineItems.length > 0 ? receiptSubtotal(receipt) : null
}

/**
 * The tax row: the printed figure; `null` for a tax that was not READ; or
 * `'no-row'` for a receipt whose paper prints no tax line at all.
 *
 * `tax: null` MEANS TWO DIFFERENT THINGS, AND ONLY PROVENANCE SEPARATES THEM.
 * On a TRANSCRIBED receipt (the seed) a person read the paper, so `null` is a
 * fact — `receipt-aia01` prints no SST line — and Gate 49's ruling stands: no
 * row. On a MACHINE-READ receipt the engine cannot tell "no tax line" from "a
 * tax line it could not read", so `null` is "not read" and the row renders a
 * dash. A capture is the receipt that carries `sourceUrl` — its bytes are an
 * in-memory upload, and no seeded record has one (see `Receipt.sourceUrl`).
 *
 * THAT IS A PROXY, STATED. Provenance is not a field; `sourceUrl` is where the
 * image lives, which today coincides exactly with who read it. Reported at
 * Gate 58 as a decision for Teku rather than widened (ruling 2).
 */
export function receiptTaxRead(receipt: Receipt): Amount | null | 'no-row' {
  if (receipt.tax !== null) return receipt.tax
  return receipt.sourceUrl !== undefined ? null : 'no-row'
}

/**
 * The category record a transaction belongs to.
 *
 * RETURNS THE RECORD, NOT THE LABEL, because the detail sheet needs both halves
 * — the label for the value column and `icon` for the row's leading glyph. A
 * function per field would look up the same row twice.
 *
 * `TRANSACTION_CATEGORIES` HAD ZERO CONSUMERS UNTIL THIS GATE. It was exported
 * at Gate 41 and read by nothing, which CLAUDE.md recorded as an open thread;
 * the detail sheet is its first.
 */
export function transactionCategory(
  categoryId: TransactionCategoryId,
): TransactionCategory | undefined {
  return TRANSACTION_CATEGORIES.find((c) => c.id === categoryId)
}

/**
 * What the detail sheet's "Payment Method" row prints, and the glyph beside it.
 *
 * FIGMA PRINTS "Monarch Trust", WHICH IS NOT A NAME IN THIS APP'S DATA. Every
 * bank holding here carries `bank: 'Monarch Bank'`; nothing anywhere is called
 * Monarch Trust. So the string is a mockup invention and this derives the real
 * institution instead of transcribing a name the rest of the app would
 * contradict.
 *
 * THREE SOURCES, TRIED IN ORDER, AND THE ORDER IS NOT ARBITRARY:
 *
 *   1. a BANK holding whose `accountId` matches   -> its `bank` + its own `icon`
 *   2. a CRYPTO WALLET whose id matches           -> its `name`
 *   3. nothing matches                            -> `undefined`
 *
 * A bank holding is tried first because it is the only source that knows the
 * INSTITUTION as opposed to the account's nickname ("Main"), and the row is
 * labelled by the institution in the design. The two crypto rows in the ledger
 * (`accountId: 'marg'`) fall to the wallet, which is the wallet's own name.
 *
 * THE GLYPH COMES FROM THE HOLDING'S OWN `icon` FIELD, not from a mapping
 * written here. Figma draws `credit_card`, which the DS registry does not
 * carry (register G27); the bank holding already declares `icon_bank`, so the
 * data answers the question rather than a substitution table guessing at it.
 * Wallets carry a `logo`, not an `icon`, so they take `icon_wallet` — the DS's
 * own name for exactly that thing, and the name `CRYPTO_WALLETS` would use if
 * the type had the field.
 */
export function transactionAccount(
  holdings: Holding[],
  wallets: CryptoWallet[],
  accountId: string,
): { label: string; icon: IconName } | undefined {
  // THE DISCRIMINANT, NOT A DUCK-TYPE CHECK. `BankHolding` is the only member
  // of the `Holding` union carrying `accountId` and `bank`, and `type` is what
  // the union discriminates on — so narrowing on it gives the compiler the
  // same guarantee the predicate asserts, instead of asking it to trust one.
  const bank = holdings.find(
    (h): h is BankHolding =>
      (h.type === 'bank' || h.type === 'joint') && h.accountId === accountId,
  )
  if (bank) return { label: bank.bank, icon: bank.icon }
  const wallet = wallets.find((w) => w.id === accountId)
  if (wallet) return { label: wallet.name, icon: 'icon_wallet' }
  return undefined
}

// ───────────────────────────────────────────────────────────── budgets (Gate 67)

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FLOW 10 — A BUDGET'S FIGURES, ALL DERIVED (Decision 2A).
 *
 * SPENT is every PAYMENT in the budget's categories whose date falls inside its
 * range, inclusive at both ends. CREDITS ARE EXCLUDED: a refund or an incoming
 * transfer is not spending. Nothing about spent is seeded.
 *
 * TRANSFERS ARE EXCLUDED BY KIND, NEVER BY CATEGORY (Flow 11, Gate 75). A row
 * carrying `kind: 'transfer'` is money moving between things the user owns, or
 * between the user and a person, so it is not spending however it is
 * categorised. Reading `kind` rather than `method` is what makes that correct
 * in both directions: a `Fund Transfer` bill payment still counts, and a
 * `Crypto Transfer` never does. The two crypto rows this excludes are
 * `others`-category outflows of RM 350.69 and RM 400.15 inside
 * `budget-monthly`'s window, which is why that budget's spent fell by RM 750.84
 * at that gate.
 *
 * THE PREVIOUS SENTENCE HERE READ "a transfer to a person counts under whatever
 * category the ledger gives it". That was true when written and is now the
 * opposite of the rule — the clause is removed rather than annotated.
 *
 * THE DATE TEST COMPARES STRINGS. `occurredAt` is written without a zone
 * ("2025-09-15T22:03:00"), so its first 10 characters ARE the local calendar
 * day. Turning it into a `Date` would bring the device's timezone into the
 * answer. `'YYYY-MM-DD'` strings order the same way lexically as by date.
 *
 * MONEY IS SUMMED IN WHOLE SEN. Five float additions do not reliably land on a
 * two-decimal figure, and `toBe(2608.83)` should not depend on the order of the
 * rows. (That example read 3359.67 until Gate 75 excluded transfers.)
 * ─────────────────────────────────────────────────────────────────────────────
 */
/**
 * Money as whole sen.
 *
 * EXPORTED AT GATE 75 FOR A SECOND CALLER — `adjustFiatBalance` in
 * `AccountsProvider`, which adds a delta to a stored balance. Two float
 * additions do not reliably land on a two-decimal figure, and a balance that
 * drifts by a hundredth stops matching the ledger it came from. Exported rather
 * than re-declared there, because two definitions of "money in sen" is the
 * two-sources-for-one-fact shape this repo keeps removing.
 */
export function toSen(amount: Amount): number {
  return Math.round(amount * 100)
}

/**
 * Whether a row counts toward a budget: a payment, an outflow, in category, in
 * range.
 *
 * THE KIND TEST COMES FIRST because it is the cheapest and the most decisive;
 * order is otherwise immaterial, since every clause must hold.
 *
 * IT DOES NOT FILTER BY `accountId`, AND THAT IS A KNOWN GAP RATHER THAN AN
 * OVERSIGHT — see `MODEL-1` in the gap register. `Budget` carries no account
 * scope, so a budget is implicitly every account: `budget-monthly`'s counted
 * rows span `main` and `joint`, measured. Out of scope at Gate 75.
 */
function countsToward(budget: Budget, t: Transaction): boolean {
  if (t.kind !== 'payment') return false
  if (t.amount >= 0) return false
  if (!budget.categories.includes(t.category)) return false
  const day = t.occurredAt.slice(0, 10)
  return day >= budget.from && day <= budget.to
}

/** Spent, as a positive magnitude. */
export function budgetSpent(budget: Budget, transactions: Transaction[]): Amount {
  const sen = transactions
    .filter((t) => countsToward(budget, t))
    .reduce((total, t) => total - toSen(t.amount), 0)
  return sen / 100
}

/** `limit − spent`. NEGATIVE when the budget is overspent, never clamped. */
export function budgetAvailable(budget: Budget, transactions: Transaction[]): Amount {
  return (toSen(budget.limit) - toSen(budgetSpent(budget, transactions))) / 100
}

/**
 * "Left to Spend" as a whole percentage: `available / limit`, FLOORED, clamped
 * to 0–100.
 *
 * FLOOR, BECAUSE "LEFT TO SPEND" MUST NEVER OVERSTATE WHAT IS LEFT. 99.6% left
 * must not read as 100% once money has been spent. The ring and its label both
 * take this one integer, so they cannot disagree. Overspent reads 0.
 */
export function budgetPercentLeft(budget: Budget, transactions: Transaction[]): number {
  const limit = toSen(budget.limit)
  if (limit <= 0) return 0
  const exact = (toSen(budgetAvailable(budget, transactions)) * 100) / limit
  return Math.min(100, Math.max(0, Math.floor(exact)))
}

export interface BudgetCategorySpend {
  category: TransactionCategoryId
  spent: Amount
  count: number
}

/**
 * Spent per category, in the budget's own category order, with a row count.
 * A listed category with nothing spent is still returned, at 0. Written at
 * Gate 67 for the drilldown's donut; the drilldown shipped at Gate 69 and reads
 * `budgetLegend` below, which is this plus its rows, order and share.
 */
export function budgetSpentByCategory(
  budget: Budget,
  transactions: Transaction[],
): BudgetCategorySpend[] {
  const rows = transactions.filter((t) => countsToward(budget, t))
  return budget.categories.map((category) => {
    const mine = rows.filter((t) => t.category === category)
    const sen = mine.reduce((total, t) => total - toSen(t.amount), 0)
    return { category, spent: sen / 100, count: mine.length }
  })
}

export interface BudgetLegendEntry {
  category: TransactionCategoryId
  spent: Amount
  /** Percent of the budget's total spent, 0–100; 0 when nothing is spent. */
  share: number
  /** The rows `spent` sums, newest first. Empty for a zero-spend category. */
  rows: Transaction[]
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DRILLDOWN'S LEGEND — Gate 69, Figma `1266:14337`.
 *
 * EVERY CATEGORY IN THE BUDGET, one entry each, zero-spend included.
 *
 * ORDER: spend descending, ties in `TRANSACTION_CATEGORIES` order. So the first
 * entry is the largest-spend category — Decision E's default-open row.
 *
 * THE ROWS ARE THE SAME SET `budgetSpent` SUMS, filtered by `countsToward`, so
 * the legend amounts, the donut's segments and the budget's spent are one
 * derivation split three ways and cannot disagree. Newest first, by comparing
 * the zone-less `occurredAt` strings — the same reason the date test does.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function budgetLegend(budget: Budget, transactions: Transaction[]): BudgetLegendEntry[] {
  const counted = transactions.filter((t) => countsToward(budget, t))
  const totalSen = counted.reduce((total, t) => total - toSen(t.amount), 0)
  const tableOrder = (id: TransactionCategoryId) =>
    TRANSACTION_CATEGORIES.findIndex((c) => c.id === id)

  return budget.categories
    .map((category) => {
      const rows = counted
        .filter((t) => t.category === category)
        .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0))
      const sen = rows.reduce((total, t) => total - toSen(t.amount), 0)
      return {
        category,
        spent: sen / 100,
        share: totalSen > 0 ? (sen * 100) / totalSen : 0,
        rows,
      }
    })
    .sort((a, b) => b.spent - a.spent || tableOrder(a.category) - tableOrder(b.category))
}

/**
 * `"30 Aug - 20 Sept"` — the card's period, exactly as Figma's card text on
 * `1266:14334` writes it: space, hyphen-minus, space. No year is shown, because
 * Figma shows none.
 */
export function budgetPeriodLabel(budget: Budget): string {
  return `${formatDayMonth(budget.from)} - ${formatDayMonth(budget.to)}`
}

// -------------------------------------------------- Flow 11: goals (Gate 76)

/**
 * COMBINED GOAL MONEY — the figure the Overview's "Savings Goals" card shows,
 * and the term `netWorth` adds to `sum(holdings)`.
 *
 * SUMMED IN WHOLE SEN, the move `categoryTotal`, `budgetSpent` and `netWorth`
 * already make: a float sum of two-decimal figures can miss the cent, and this
 * one lands in the app's largest printed number.
 *
 * IT SUMS `savedAmount`, NEVER THE CONTRIBUTION ROWS. That is `Goal.savedAmount`'s
 * own contract, and Gate 77 did not weaken it by moving those rows into the
 * ledger: what a goal can be filtered out of the ledger is a partial slice of
 * history, so it cannot reconstruct a balance and must not be asked to. The
 * seeded rows do happen to sum to the two stored totals; nothing depends on it.
 */
export function goalsTotal(goals: Goal[]): Amount {
  return goals.reduce((total, goal) => total + toSen(goal.savedAmount), 0) / 100
}

/**
 * ONE GOAL'S CONTRIBUTIONS, NEWEST FIRST, OUT OF THE ONE LEDGER (Gate 77).
 *
 * THIS REPLACED AN EMBEDDED ARRAY AND THAT IS THE WHOLE OF THE CHANGE. A `Goal`
 * used to carry its own `contributions`, which made a contribution a second kind
 * of money movement living outside the ledger - invisible to the Transactions
 * tab, to its search and its facets, and to the drill-down of the account the
 * money actually left. Same defect class as the stored `hasReceipt` boolean Gate
 * 48 removed: one fact modelled twice, in two places nothing reconciles.
 *
 * IT RETURNS `Transaction[]` AND NOT A NARROWER SHAPE, deliberately. A
 * contribution IS a ledger row - it has a timestamp, an account, a method and a
 * sign - and projecting it into a smaller record here would rebuild the very
 * thing this gate deleted, one call away from the data.
 *
 * THE ROWS ARE NEGATIVE, because a contribution DEBITS its source account and
 * this ledger's sign is relative to `accountId`. A caller that prints the figure
 * the way Figma does - "RM 250.00", unsigned, node `1266:14344` - takes the
 * magnitude; it does not get a positive number from here, because a positive
 * number here would be a row claiming money arrived in `main`.
 *
 * NEWEST FIRST, SORTED HERE RATHER THAN ASSUMED OF THE SEED. Array order in
 * `transactions.ts` is not display order anywhere - `filterTransactions`,
 * `recentTransactions` and `groupTransactionsByMonth` all sort - and the 28
 * seeded rows are appended as one block rather than interleaved, so a caller
 * relying on file order would be relying on nothing.
 */
export function goalContributions(
  transactions: Transaction[],
  goalId: string,
): Transaction[] {
  return transactions
    .filter((t) => t.goalId === goalId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

/**
 * How far along a goal is, 0-100.
 *
 * `Math.floor`, CLAMPED, ON `budgetPercentLeft`'s RULE — a progress figure must
 * never overstate. 99.6% of the way to a target is not "100%", and a card
 * reading 100% beside an amount short of its target is the kind of disagreement
 * this app derives figures to avoid.
 *
 * THE SEED LANDS ON TWO EXACT INTEGERS, so floor and round agree today: Bali
 * 5,040 / 9,000 = 56.0% and Emergency 11,040 / 12,000 = 92.0%, which are the two
 * percentages Figma's own cards print. `ProgressBar` defaults its own label to
 * `Math.round(value)`, so passing the floored integer is also what stops the
 * label and the bar disagreeing the first time a goal lands off an integer.
 *
 * A ZERO OR NEGATIVE TARGET RETURNS 0 rather than dividing by it. Nothing in the
 * app can create one — `budgetDraftErrors`' equivalent rule requires a positive
 * amount — but a bar is a rendering, not a place to discover a bad record.
 */
export function goalPercent(goal: Goal): number {
  if (goal.targetAmount <= 0) return 0
  const pct = Math.floor((toSen(goal.savedAmount) * 100) / toSen(goal.targetAmount))
  return Math.min(100, Math.max(0, pct))
}

/**
 * `December 2026` — the figure beside "Target" on the goal drill-down.
 *
 * `monthLabel` RATHER THAN A FOURTH DATE FORMATTER. Figma prints "March 2026"
 * (`1266:14344`), which is month-plus-year and exactly what the month headings
 * on the Receipts and Transactions tabs already produce — so this slices the
 * key out of the stored day and hands it to the one function that owns that
 * format. Inventory A5 records THREE date formats inside this Section alone;
 * adding a fourth expression of a format the app already has is how that
 * becomes four.
 *
 * THE DAY IS DELIBERATELY DISCARDED. `Goal.targetDate` is a full `YYYY-MM-DD`
 * because a future gate may want the day, and this row does not: Figma names a
 * month. Slicing here keeps that a rendering decision rather than a stored one.
 */
export function goalTargetLabel(goal: Goal): string {
  return monthLabel(goal.targetDate.slice(0, 7))
}

/**
 * `Auto Save` / `Manual Top-Up` — what a contribution row is titled.
 *
 * A SWITCH WITH NO `default`, so a third `ContributionSource` is a compile
 * error here rather than a row that silently prints nothing. Same construction
 * as `commitmentCadenceLabel` and `TransactionMark`, and the same reason.
 *
 * THE HYPHEN IS A CHOICE FIGMA DOES NOT MAKE, AND IT HAD TO BE MADE HERE.
 * Inventory A7 records the file contradicting itself inside one list: the
 * drill-down draws "Manual Top Up" on its second row and "Manual Top-Up" on its
 * fourth. One stored source cannot print two spellings, so the hyphenated form
 * wins — it is what the footer's own "Top-Up" button says, and the Flow 11 plan
 * spells the writer "Top-Up" throughout. Do not "fix" this back to match
 * whichever row of the frame is being read.
 */
export function contributionSourceLabel(source: ContributionSource): string {
  switch (source) {
    case 'automatic':
      return 'Auto Save'
    case 'manual':
      return 'Manual Top-Up'
  }
}

// -------------------------------------------- Flow 11: commitments (Gate 76)

/**
 * `"Monthly"` / `"Yearly"` — the caption under a commitment's name.
 *
 * A SWITCH WITH NO `default`, so a third `CommitmentCadence` is a compile error
 * here rather than a row that silently prints nothing. Same construction as
 * `TransactionMark`'s, and the same reason.
 */
export function commitmentCadenceLabel(commitment: Commitment): string {
  switch (commitment.cadence) {
    case 'monthly':
      return 'Monthly'
    case 'yearly':
      return 'Yearly'
  }
}

/**
 * `"next on 01 Sept"` — the caption under a commitment's amount.
 *
 * ⚠ THE DAY IS TWO DIGITS AND FIGMA'S IS ONE ("next on 1 Oct"), AND THE
 * DIVERGENCE IS DELIBERATE. It reuses `formatDayMonth`, which is what the budget
 * period and the ledger's own timestamps already print ("30 Aug - 20 Sept",
 * "04 Sept"). One formatter across the app outranks one frame's leading zero —
 * the same call this repo already made on two-decimal money against Figma's
 * "RM 700", and on `formatPercent` trimming zeros against Figma's "24.00%".
 * Adding a second day format to match one caption is how an app ends up with two
 * conventions and no rule.
 */
export function commitmentDueLabel(commitment: Commitment): string {
  return `next on ${formatDayMonth(commitment.nextDueOn)}`
}

/**
 * The hero's name on a commitment detail — Figma's "U-Mobile" under the logo,
 * where the header above it reads "Internet".
 *
 * FALLS BACK TO `name`, because Figma draws ONE commitment detail and the other
 * six heroes are undesigned work. A row with no provider shows what the user
 * calls it, which is true; inventing a provider for six rows would not be.
 */
export function commitmentProviderName(commitment: Commitment): string {
  return commitment.provider ?? commitment.name
}

/**
 * `'2026-10-07'` -> `"07 Oct 2026"`, for the detail's Payment Date and Contract
 * End Date cards. One formatter for both, so the two cards cannot disagree the
 * way the frame does — see `formatDayMonthYear`.
 */
export function commitmentDateLabel(isoDay: string): string {
  return formatDayMonthYear(isoDay)
}

/**
 * The detail's Payment Method card — Figma's "Bank Acc - Main".
 *
 * IT NAMES THE ACCOUNT, NOT THE INSTITUTION, which is why it cannot reuse
 * `transactionAccount`: that one answers "which bank" and returns "Monarch
 * Bank" for BOTH cash accounts, so every commitment would read the same.
 * `accountDisplayName` is the one that distinguishes Main from Joint Account.
 *
 * RETURNS `null` WHEN THE ACCOUNT CANNOT BE RESOLVED, and the card is omitted
 * rather than drawn with a dash — the Gate 79 rule. A commitment pointing at an
 * account that does not exist is a data defect, and a dash would hide it.
 */
export function commitmentPaymentLabel(
  accounts: FiatAccount[],
  commitment: Commitment,
): string | null {
  const account = accounts.find((a) => a.id === commitment.paymentAccountId)
  return account ? `Bank Acc - ${account.name}` : null
}

/**
 * The offer against a commitment, if Monarch has spotted one.
 *
 * THE SEED HOLDS EXACTLY ONE, against Internet, because Figma draws one. Every
 * other commitment returns `undefined` and its detail draws no banner — which
 * is what makes that branch reachable from the seed rather than only from a
 * synthetic fixture.
 */
export function commitmentOffer(
  offers: CommitmentOffer[],
  commitmentId: string,
): CommitmentOffer | undefined {
  return offers.find((o) => o.commitmentId === commitmentId)
}

/**
 * What the offer saves each period — the commitment's own `amount` minus the
 * offer's. RM 120 − RM 70 = RM 50, which is what `1266:14341` and `1266:14343`
 * both print.
 *
 * DERIVED, NEVER STORED, AND FIGMA IS THE ARGUMENT FOR IT. The education
 * frame's underlying insight layer prints "Save RM 51/month" beside "RM
 * 600/year" — two stored figures that disagree, since 51 × 12 is 612. A single
 * stored saving could drift from the two prices the same way.
 *
 * SUMMED IN WHOLE SEN, so a float cannot miss a two-decimal figure — the rule
 * every money derivation in this file follows.
 */
export function offerMonthlySaving(
  commitment: Commitment,
  offer: CommitmentOffer,
): Amount {
  return (toSen(commitment.amount) - toSen(offer.amount)) / 100
}

/**
 * What the offer saves in a year — the monthly saving × 12, so RM 600.
 *
 * ⚠ IT MULTIPLIES BY 12 WHATEVER THE CADENCE SAYS, and that is correct only
 * while every seeded commitment is monthly (`goals.spec.ts` holds that
 * invariant). Figma's panel labels the row "Savings" against "RM 600/year"
 * with no cadence anywhere, so the frame does not settle a yearly commitment.
 * The first `cadence: 'yearly'` row is where this needs a rule, not a
 * speculative one now.
 */
export function offerYearlySaving(
  commitment: Commitment,
  offer: CommitmentOffer,
): Amount {
  return (toSen(offerMonthlySaving(commitment, offer)) * 12) / 100
}
// ─────────────────────────────── transaction dispositions (Gate 79) ──────────

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT KIND OF MONEY MOVEMENT A ROW IS — the discriminator the detail sheet
 * renders three different bodies from. See `TransactionDisposition`.
 *
 * DERIVED FROM FIELDS THAT ALREADY EXIST. No flag was added and nothing is
 * stored: `kind` is required on every row and the sign of `amount` carries
 * direction ("Negative for an outflow", `types.ts`). A third stored copy of a
 * fact the record already states twice is what Gate 48 deleted.
 *
 * ⚠ THE ORDER IS LOAD-BEARING AND IT IS NOT MERELY DEFENSIVE — THE SEED
 * EXERCISES IT. `kind` is tested BEFORE the sign, so a CREDIT that is a transfer
 * still reads as a transfer rather than as income. Three seeded rows are exactly
 * that: `txn-rachum-0911` (+350), `txn-maybank-0907` (+1,500) and
 * `txn-maybank-0828` (+5,200), all ruled transfers at Gate 75 (Decision 1 = A)
 * because the field measures whether money was SPENT and all three answer no.
 * Swap the two tests and those three rows change disposition — which is the
 * mutation `transaction-disposition.spec.ts` proves.
 *
 * ZERO IS NOT AN OUTFLOW. `amount >= 0` is income, matching `countsToward`'s own
 * boundary exactly, so the two cannot disagree about a hypothetical zero row.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function transactionDisposition(t: Transaction): TransactionDisposition {
  if (t.kind === 'transfer') return 'transfer'
  if (t.amount >= 0) return 'income'
  return 'purchase'
}

/**
 * Whether a receipt could belong to this row at all — `'purchase'`, and nothing
 * else.
 *
 * ONE PREDICATE, TWO CALL SITES, WHICH IS THE POINT OF EXPORTING IT. The manual
 * link picker's row list and `rankedSuggestions`' Suggested block both ask this
 * question, and before Gate 79 they each answered it with their own
 * `.filter((t) => t.amount < 0)` — a rule that admits every savings
 * contribution, which is what `MODEL-2` registered. Two copies of a selection
 * rule is how the two groups come to disagree.
 *
 * IT IS NOT "IS THIS AN OUTFLOW". A savings transfer is an outflow and has no
 * receipt; the question is whether anything was ITEMISED.
 */
export function canCarryReceipt(t: Transaction): boolean {
  return transactionDisposition(t) === 'purchase'
}

/**
 * The account's OWN NAME — "Main", "Joint Account", "Marge's Wallet".
 *
 * NOT `transactionAccount`, AND THE DIFFERENCE IS THE WHOLE REASON THIS EXISTS.
 * That function answers "which INSTITUTION" and returns `bank` ("Monarch Bank")
 * for both cash accounts, which is what the detail sheet's Payment Method row
 * prints. A transfer's From/To rows name the ACCOUNT the money moved through, and
 * "Monarch Bank → Bali Trip" would be true of both cash accounts at once.
 *
 * THE WALLET LEG IS NOT DEAD. Two seeded Crypto Transfers carry `accountId:
 * 'marg'` rather than a bank id (`types.ts` records that widening), so a
 * bank-only lookup would return undefined on exactly the rows a transfer summary
 * most needs to name.
 *
 * ⚠ NO MASKED ACCOUNT NUMBER IS RETURNED, AND ONE EXISTS. `BankHolding.accountNo`
 * holds `'•••• 8842'` / `'•••• 3160'`, both AUTHORED and both absent from Figma —
 * and `CryptoWallet` has no counterpart at all, so including it would give the
 * same row two shapes depending on which account it names. Name only. If Teku
 * wants the number, it is one template literal here and four baselines.
 */
export function accountDisplayName(
  holdings: Holding[],
  wallets: CryptoWallet[],
  accountId: string,
): string | undefined {
  // THE DISCRIMINANT, NOT A DUCK-TYPE CHECK — `transactionAccount`'s own
  // reasoning, reused rather than restated.
  const bank = holdings.find(
    (h): h is BankHolding =>
      (h.type === 'bank' || h.type === 'joint') && h.accountId === accountId,
  )
  if (bank) return bank.name
  return wallets.find((w) => w.id === accountId)?.name
}

/**
 * Where the money came FROM and went TO, for a row that moved money without
 * buying anything.
 *
 * ONE RULE SERVES BOTH A TRANSFER AND INCOME, because the question is the same
 * one: which side of this row is the user's own account, and which is the
 * counterparty. THE SIGN DECIDES, and it has to, because the sign in this ledger
 * is relative to `accountId` — `txn-maybank-0828` is `+5,200` ON `main` and
 * `txn-granddaughter-0911` is `−350.69` ON `marg`.
 *
 *   an OUTFLOW   money leaves the account   from = the account, to = the payee
 *   a  CREDIT    money arrives              from = the payer,   to = the account
 *
 * THE COUNTERPARTY IS `merchant`, WHICH IS A WIDER FIELD THAN ITS NAME. It holds
 * a shop for a purchase, a person for a send ("Rachum Greene"), a bank for an
 * inbound transfer ("Maybank") and the goal's own name for a contribution. A
 * GOAL IS LOOKED UP RATHER THAN TAKEN FROM `merchant` ANYWAY, so that a renamed
 * goal moves its own transfer rows with it instead of leaving 28 stale strings.
 *
 * A `goalId` NAMING NO GOAL FALLS BACK TO `merchant` rather than returning
 * undefined. A detail sheet is a rendering, not a place to discover a bad join.
 */
export function movementParties(
  t: Transaction,
  holdings: Holding[],
  wallets: CryptoWallet[],
  goals: Goal[],
): { from: string; to: string } {
  const account = accountDisplayName(holdings, wallets, t.accountId) ?? t.accountId
  const goal = t.goalId === undefined ? undefined : goals.find((g) => g.id === t.goalId)
  const counterparty = goal?.name ?? t.merchant
  return t.amount < 0
    ? { from: account, to: counterparty }
    : { from: counterparty, to: account }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS GOAL HELD IMMEDIATELY AFTER THIS CONTRIBUTION LANDED.
 *
 * `savedAmount − (every later contribution's magnitude)`.
 *
 * IT DERIVES A HISTORICAL POSITION FROM A STORED PRESENT VALUE, AND IT DOES NOT
 * DERIVE `savedAmount`. That distinction is the whole licence for this function:
 * `Goal.savedAmount` is stored and is never summed from the ledger (its own
 * contract, restated at Gate 77), so walking BACKWARDS from it is the only way
 * to place a past row without re-deriving the stored authority. Nothing here
 * asserts that the contributions sum to `savedAmount`, and nothing may.
 *
 * MAGNITUDES, BECAUSE A CONTRIBUTION IS A DEBIT. These rows are negative — they
 * debit the account the money left — while the goal's own screen is showing money
 * arriving, which is why `ContributionRow` also takes `Math.abs`. Summing the
 * signed values would ADD to the stored total instead of walking back from it.
 *
 * WHOLE SEN THROUGHOUT, via `toSen`, so a 28-term subtraction cannot drift by a
 * hundredth and print a figure the ledger it came from does not contain.
 *
 * ⚠ IT IS NOT CLAMPED, DELIBERATELY. A negative figure, or one above the goal's
 * target, would mean the seed and the stored total disagree — and clamping would
 * bury exactly that. Measured over both seeded goals at Gate 79: 28 rows, zero
 * misbehaving, and each goal's OLDEST row lands on its own magnitude, i.e. the
 * opening balance before any contribution is exactly 0.00 for both. If this ever
 * returns something outside [0, target], it is a seed finding and belongs to the
 * seed-quality gate, not to a clamp here.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function goalSavedAfter(
  transactions: Transaction[],
  goal: Goal,
  transactionId: string,
): Amount | undefined {
  const rows = goalContributions(transactions, goal.id)
  const index = rows.findIndex((r) => r.id === transactionId)
  if (index < 0) return undefined
  // `goalContributions` sorts NEWEST FIRST, so everything dated after this row
  // is everything BEFORE it in the array.
  const later = rows
    .slice(0, index)
    .reduce((sen, r) => sen + Math.abs(toSen(r.amount)), 0)
  return (toSen(goal.savedAmount) - later) / 100
}

