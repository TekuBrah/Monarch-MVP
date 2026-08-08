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
