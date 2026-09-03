import type { TrendDirection } from '@monarch/design-system'
import { TODAY, addMonths, addYears, daysInMonth, yearsBetween } from './today'
import type {
  Amount,
  CryptoHolding,
  FixedDepositHolding,
  GoldHolding,
  Holding,
  Transaction,
  TransactionCategoryId,
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
 * The five Groceries rows return exactly 1800 — the figure that appears
 * independently in two unrelated Sections of the design and is the only
 * hand-authored total in the file that survives being recomputed.
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
 * NET WORTH = `sum(holdings)` AND NOTHING ELSE.
 *
 * This is the figure the whole flow is built to make honest. Figma draws
 * RM 450,958.84 beside eight cards that sum to RM 449,958.84 and a ninth account
 * it does not draw at all; deriving is what makes that visible instead of
 * shipping a hand-typed hero number that quietly stops matching its own cards.
 */
export function netWorth(
  holdings: Holding[],
  cryptoHoldings: CryptoHolding[],
): Amount {
  return sum(holdings.map((h) => holdingValue(h, cryptoHoldings)))
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
 * The filter `Finance_Transaction01` opens with — Figma's four applied chips.
 *
 * Payee All, Type All, This Month, RM 0-500. Applied to the ledger this returns
 * 15 rows, which is the number Figma's own button prints ("Apply Filter (15)",
 * inventory A14 — recorded there as unverifiable from a static frame, and now
 * computed), and whose first nine ARE the nine rows the frame draws.
 */
export const TRANSACTION_FILTER_APPLIED: TransactionFilter = {
  payees: null,
  methods: null,
  dateRange: 'this-month',
  amountMin: 0,
  amountMax: 500,
}

/**
 * The instant the date facet measures back from.
 *
 * IT IS THE LEDGER'S NEWEST ROW, NOT `TODAY`, AND THAT IS A DELIBERATE
 * DIVERGENCE FROM B5 rather than an oversight. Every other date in this app is
 * an offset from `TODAY` so nothing goes stale; the transaction ledger is the
 * one place that CANNOT be, because inventory SYS-7 fixes these rows to
 * September 2025 and Flow 1's Homepage reconciles against "15 Sept 22:03"
 * literally.
 *
 * So the two clocks genuinely disagree, and by a lot: the harness pins `TODAY`
 * to 2026-08-15 (`PINNED_NOW` in `e2e/harness.ts`, chosen so the fixed deposit
 * and the net-worth chart derive sensibly), while the ledger's present is
 * 2025-09-15. A "This Month" facet measured against `TODAY` would ask for
 * August 2026 and match ZERO of the 23 rows — a filter that is technically
 * correct, silently empty, and impossible to tell apart from a broken predicate.
 *
 * Measuring from the newest row keeps the facet DERIVED — move the ledger
 * forward a year and the window follows it, with no literal to update. The
 * alternative was a hardcoded September 2025 boundary, which is the thing this
 * file exists to avoid.
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
 *
 * 2 · A FACET AT ITS DEFAULT STILL SHOWS A CHIP, so the model is NOT
 *     one-chip-per-non-default-facet. Type, date and amount are all at their
 *     defaults in `TRANSACTION_FILTER_APPLIED` and Figma draws a chip for each
 *     of them; under a non-default-only rule the row would be EMPTY in all
 *     three frames, and it is not.
 *
 * 3 · THE PAYEE CHIP IS THE ONE THAT COMES AND GOES, and the evidence is one
 *     node in two states rather than two different nodes: `825:5389` carries
 *     `label="Watson"` and is `hidden` in Transaction01, visible in _all rows,
 *     and absent entirely from Transaction02 — whose own `Select` reads
 *     `Watson`, i.e. picked in the sheet but not yet applied.
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
  return chips
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
