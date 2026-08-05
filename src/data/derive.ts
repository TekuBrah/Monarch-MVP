import type {
  Amount,
  CryptoHolding,
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

/** Holdings ranked by value — what "My Tokens" shows before "See all". */
export function topHoldings(
  holdings: CryptoHolding[],
  limit: number,
): CryptoHolding[] {
  return [...holdings].sort((a, b) => b.valueMyr - a.valueMyr).slice(0, limit)
}
