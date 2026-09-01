import type { Transaction, TransactionCategory } from './types'

/**
 * The transaction ledger — the data spine (inventory §6d).
 *
 * ONE ARRAY, ONE READ PATH. `AccountsProvider` imports this and exposes it as
 * `transactions`; the Homepage, the bank drill-downs and Flow 8's Transactions
 * tab all read that context and never this file. A row added here therefore
 * appears on every surface at once, which is the property Flow 8 was required
 * to preserve — there is no second, screen-local ledger anywhere in `src/`.
 *
 * Two consequences worth stating, because both are checkable and both still
 * hold after Flow 8 tripled the row count:
 *
 * - Sorting this ledger newest-first and taking two rows yields Aeon Big
 *   (15 Sept) and Caring Pharmacy (13 Sept) — exactly the two rows the Homepage
 *   draws. NOTHING FLOW 8 ADDED IS DATED LATER THAN 12 SEPT, so neither can be
 *   displaced; the newest fabricated row is KFC at 12 Sept 08:15.
 * - `categoryTotal('groceries')` computes 1800.00 from the five groceries rows.
 *   Flow 8 added NO groceries row, and changed no amount, so the one
 *   hand-authored total in the design that survives being recomputed still does.
 *
 * YEAR: the file states no year on these rows. Inventory SYS-7 / F9 A6 records
 * the September items as 2025 (flagging a stray "15 Sept 2026" as the defect),
 * so 2025 is used throughout. Dates are stored ISO and formatted at render.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FLOW 7 — ACCOUNT ATTRIBUTION, AND WHY IT IS NOT NEW DATA.
 *
 * The Joint Account's drill-down needs transactions, and the file authors none
 * for it anywhere. The two ways to get them are to invent rows or to attribute
 * existing ones; inventing was rejected, so each row below names the account it
 * was spent from and two are attributed to the Joint account.
 *
 * WHICH TWO, AND WHY THOSE. `Lotus's` and `Giant` — both household groceries,
 * which is what a joint account is for. FLOW 8 ADDED NOTHING TO `joint`, so the
 * Joint drill-down renders exactly the two rows it rendered before and its
 * baselines are untouched. That is deliberate, not incidental: it keeps one of
 * the two bank drill-downs as an unchanged control.
 * ─────────────────────────────────────────────────────────────────────────────
 * FLOW 8 — THE LEDGER GREW FROM 6 ROWS TO 23, AND ONE DATE MOVED.
 *
 * Flow 8's Figma frame draws nine rows under four applied filters and labels the
 * button "Apply Filter (15)". Both numbers are now REAL rather than decorative:
 * `filterTransactions()` in `derive.ts` evaluates the four facets over this
 * array and returns 15 rows, whose first nine — under an ordinary
 * date-descending sort — are Figma's nine.
 *
 * THE ONE PRE-EXISTING ROW THAT HAD TO MOVE, AND WHY IT IS A DATE AND NOT AN
 * AMOUNT. `txn-aeon-0909` was Aeon Big −420.50 at 2025-09-09T13:45. It passes
 * the applied filter (September, magnitude ≤ 500) and sat at 9 Sept 13:45 —
 * BETWEEN Tony Roma's (10 Sept 07:21) and Touch N Go (9 Sept 12:55) — so it
 * landed eighth and pushed IKEA out of the top nine. It is now
 * `txn-aeon-0904` at 2025-09-04T13:45, below IKEA's 6 Sept 08:00.
 *
 * The alternative was raising its amount past the 500 cap, which would have
 * broken the RM 1,800.00 groceries chain unless a second amount were lowered to
 * compensate — two fabricated edits to established figures instead of one date.
 * The date was the smaller lie. ITS ORDER ON `/finance/holding/main` IS
 * UNCHANGED (still third of the original four, between Caring and Jaya Grocer);
 * only its printed timestamp moved.
 *
 * WHY THE NEW ROWS CARRY REAL ACCOUNT IDS. Every fabricated fiat row is
 * attributed to `main`, and the two Crypto Transfers to the `marg` wallet,
 * because that is where the money actually moved. The consequence is visible and
 * intended: `/finance/holding/main` now renders the whole of its own ledger
 * rather than four groceries rows, and its four baselines were re-minted for it.
 * Attributing them to an invented account id nothing claims would have kept
 * those baselines still, at the cost of a ledger that disagrees with the account
 * screen it feeds — the exact inconsistency the single-source-of-truth rule
 * exists to prevent.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  { id: 'bills', label: 'Bills & Utilities', icon: 'icon_bills' },
  { id: 'groceries', label: 'Groceries', icon: 'icon_grocery' },
  { id: 'dining', label: 'Dining & Leisure', icon: 'icon_food' },
  { id: 'healthcare', label: 'Healthcare', icon: 'icon_healthcare' },
  { id: 'transport', label: 'Transport', icon: 'icon_car' },
  { id: 'shopping', label: 'Shopping', icon: 'icon_shopping' },
  { id: 'others', label: 'Others / Misc', icon: 'more_horiz' },
]

/**
 * 23 rows. 15 satisfy Flow 8's applied filter; 8 are outside it, and they exist
 * so that clearing the filter is a visible act rather than a no-op — a filter
 * whose input equals its output is not a filter.
 *
 * Ordered by date descending, which is also the order the ledger renders in.
 */
export const TRANSACTIONS: Transaction[] = [
  // ===== September 2025 — inside the applied filter =========================
  // The nine rows Figma draws, in date order. Marked (1)-(9) with the position
  // they occupy in FIGMA'S DRAWN ORDER, which is not chronological: Figma places
  // IKEA (6 Sept) fifth, between two 11 Sept rows. The drawn order is a source
  // artifact; date descending is the behaviour (inventory A16).
  {
    id: 'txn-aeon-0915', // (1)
    accountId: 'main',
    merchant: 'Aeon Big',
    logo: { kind: 'merchant', name: 'aeon' },
    method: 'Card Payment',
    amount: -250.75,
    currency: 'MYR',
    occurredAt: '2025-09-15T22:03:00',
    category: 'groceries',
    // The Homepage draws no receipt glyph on this row; the Budget drilldown
    // draws one on all five. Recorded per the Homepage, which is Flow 1's
    // authority. Receipt link state becomes writable in Flow 9 (W2).
    hasReceipt: false,
  },
  {
    id: 'txn-caring-0913', // (2)
    accountId: 'main',
    merchant: 'Caring Pharmacy',
    logo: { kind: 'merchant', name: 'caring' },
    method: 'Card Payment',
    amount: -25.5,
    currency: 'MYR',
    occurredAt: '2025-09-13T18:50:00',
    category: 'healthcare',
    hasReceipt: true,
  },
  {
    id: 'txn-kfc-0912', // (3)
    accountId: 'main',
    merchant: 'KFC',
    logo: { kind: 'merchant', name: 'kfc' },
    method: 'Card Payment',
    amount: -25.5,
    currency: 'MYR',
    // The newest fabricated row in the file. Anything later would displace
    // Caring Pharmacy from the Homepage's two-row slice.
    occurredAt: '2025-09-12T08:15:00',
    category: 'dining',
    hasReceipt: false,
  },
  {
    id: 'txn-rachum-0911', // (6) in Figma's order — the file's single credit
    accountId: 'main',
    merchant: 'Rachum Greene',
    logo: { kind: 'person', initials: 'RG' },
    method: 'Fund Transfer',
    amount: 350,
    currency: 'MYR',
    occurredAt: '2025-09-11T23:46:00',
    category: 'others',
    hasReceipt: false,
  },
  {
    id: 'txn-granddaughter-0911', // (4)
    // A crypto movement, so it did not come out of a bank account.
    accountId: 'marg',
    merchant: 'Granddaughter',
    logo: { kind: 'person', initials: 'G' },
    method: 'Crypto Transfer',
    amount: -350.69,
    currency: 'MYR',
    occurredAt: '2025-09-11T06:12:00',
    category: 'others',
    hasReceipt: false,
  },
  {
    id: 'txn-rachum-0910', // (8)
    accountId: 'marg',
    merchant: 'Rachum Greene',
    logo: { kind: 'person', initials: 'RG' },
    method: 'Crypto Transfer',
    amount: -400.15,
    currency: 'MYR',
    occurredAt: '2025-09-10T13:33:00',
    category: 'others',
    hasReceipt: false,
  },
  {
    id: 'txn-tonyroma-0910', // (7)
    accountId: 'main',
    merchant: "Tony Roma's",
    logo: { kind: 'merchant', name: 'tonyroma' },
    method: 'Fund Transfer',
    amount: -95,
    currency: 'MYR',
    occurredAt: '2025-09-10T07:21:00',
    category: 'dining',
    hasReceipt: true,
  },
  {
    id: 'txn-touchngo-0909', // (9)
    accountId: 'main',
    merchant: 'Touch N Go',
    logo: { kind: 'merchant', name: 'touchngo' },
    method: 'Fund Transfer',
    amount: -100,
    currency: 'MYR',
    occurredAt: '2025-09-09T12:55:00',
    category: 'transport',
    hasReceipt: false,
  },
  {
    // (5) — the earliest of Figma's nine, and the boundary every filler row
    // below must sort under.
    id: 'txn-ikea-0906',
    accountId: 'main',
    merchant: 'IKEA',
    logo: { kind: 'merchant', name: 'ikea' },
    method: 'Fund Transfer',
    amount: -129,
    currency: 'MYR',
    occurredAt: '2025-09-06T08:00:00',
    category: 'shopping',
    hasReceipt: true,
  },

  // Rows 10-15 of the filtered result: inside the filter, below Figma's nine.
  // They are what makes "Apply Filter (15)" a computed number rather than a
  // caption, and what puts content below the fold for A6's overflow.
  {
    id: 'txn-lotus-0905',
    // Attributed to the Joint account by Flow 7 — see the header note.
    accountId: 'joint',
    merchant: "Lotus's",
    logo: { kind: 'merchant', name: 'lotus_s' },
    method: 'Card Payment',
    amount: -310.4,
    currency: 'MYR',
    occurredAt: '2025-09-05T17:12:00',
    category: 'groceries',
    hasReceipt: true,
  },
  {
    id: 'txn-netflix-0905',
    accountId: 'main',
    merchant: 'Netflix',
    logo: { kind: 'merchant', name: 'netflix' },
    method: 'Card Payment',
    amount: -54.9,
    currency: 'MYR',
    occurredAt: '2025-09-05T09:15:00',
    category: 'bills',
    hasReceipt: false,
  },
  {
    // WAS `txn-aeon-0909` at 2025-09-09T13:45 — moved by Flow 8 so Figma's nine
    // occupy the filtered top nine. See the header note; the amount, category,
    // account and receipt flag are all unchanged, so the groceries chain still
    // sums to RM 1,800.00.
    id: 'txn-aeon-0904',
    accountId: 'main',
    merchant: 'Aeon Big',
    logo: { kind: 'merchant', name: 'aeon' },
    method: 'Card Payment',
    amount: -420.5,
    currency: 'MYR',
    occurredAt: '2025-09-04T13:45:00',
    category: 'groceries',
    hasReceipt: true,
  },
  {
    id: 'txn-celcom-0904',
    accountId: 'main',
    merchant: 'Celcom',
    logo: { kind: 'merchant', name: 'celcom' },
    method: 'Card Payment',
    amount: -89,
    currency: 'MYR',
    occurredAt: '2025-09-04T10:30:00',
    category: 'bills',
    hasReceipt: false,
  },
  {
    id: 'txn-anytimefitness-0903',
    accountId: 'main',
    merchant: 'Anytime Fitness',
    logo: { kind: 'merchant', name: 'anytimefitness' },
    method: 'Card Payment',
    amount: -128,
    currency: 'MYR',
    occurredAt: '2025-09-03T07:45:00',
    category: 'others',
    hasReceipt: false,
  },
  {
    id: 'txn-giant-0902',
    // Attributed to the Joint account by Flow 7 — see the header note.
    accountId: 'joint',
    merchant: 'Giant',
    logo: { kind: 'merchant', name: 'giant' },
    method: 'Card Payment',
    amount: -288.6,
    currency: 'MYR',
    occurredAt: '2025-09-02T12:56:00',
    category: 'groceries',
    hasReceipt: true,
  },

  // ===== Outside the applied filter =========================================
  // Three fail on AMOUNT alone and are inside September, three fail on DATE
  // alone, and two fail on both. Each facet therefore has at least one row that
  // only IT excludes, so a facet that stopped working would change the count
  // rather than being masked by another facet excluding the same rows.
  {
    id: 'txn-ikea-0908',
    accountId: 'main',
    merchant: 'IKEA',
    logo: { kind: 'merchant', name: 'ikea' },
    method: 'Card Payment',
    // Excluded by AMOUNT only — inside September. A flatpack run.
    amount: -899,
    currency: 'MYR',
    occurredAt: '2025-09-08T15:20:00',
    category: 'shopping',
    hasReceipt: true,
  },
  {
    id: 'txn-maybank-0907',
    accountId: 'main',
    merchant: 'Maybank',
    logo: { kind: 'merchant', name: 'maybank' },
    method: 'Fund Transfer',
    // Excluded by AMOUNT only, and it is a CREDIT — the row that proves the
    // amount facet bounds MAGNITUDE rather than signed value. Drop the
    // Math.abs() in `derive.ts` and this row silently re-enters the result.
    amount: 1500,
    currency: 'MYR',
    occurredAt: '2025-09-07T09:30:00',
    category: 'others',
    hasReceipt: false,
  },
  {
    id: 'txn-jaya-0901',
    accountId: 'main',
    merchant: 'Jaya Grocer',
    logo: { kind: 'merchant', name: 'jayagrocer' },
    method: 'Card Payment',
    // Excluded by AMOUNT only. The fifth groceries row — inside the filter's
    // month and outside its amount cap, which is why the filtered ledger does
    // not sum to the RM 1,800.00 groceries total.
    amount: -529.75,
    currency: 'MYR',
    occurredAt: '2025-09-01T14:36:00',
    category: 'groceries',
    hasReceipt: true,
  },
  {
    id: 'txn-maybank-0828',
    accountId: 'main',
    merchant: 'Maybank',
    logo: { kind: 'merchant', name: 'maybank' },
    method: 'Fund Transfer',
    // Excluded by BOTH facets.
    amount: 5200,
    currency: 'MYR',
    occurredAt: '2025-08-28T09:00:00',
    category: 'others',
    hasReceipt: false,
  },
  {
    id: 'txn-aia-0825',
    accountId: 'main',
    merchant: 'AIA',
    logo: { kind: 'merchant', name: 'aia' },
    method: 'Fund Transfer',
    // Excluded by DATE only — well inside the RM 500 cap.
    amount: -320,
    currency: 'MYR',
    occurredAt: '2025-08-25T11:20:00',
    category: 'bills',
    hasReceipt: true,
  },
  {
    id: 'txn-umobile-0820',
    accountId: 'main',
    merchant: 'U Mobile',
    logo: { kind: 'merchant', name: 'umobile' },
    method: 'Card Payment',
    // Excluded by DATE only.
    amount: -75,
    currency: 'MYR',
    occurredAt: '2025-08-20T14:05:00',
    category: 'bills',
    hasReceipt: false,
  },
  {
    id: 'txn-ikea-0815',
    accountId: 'main',
    merchant: 'IKEA',
    logo: { kind: 'merchant', name: 'ikea' },
    method: 'Card Payment',
    // Excluded by BOTH facets.
    amount: -1250,
    currency: 'MYR',
    occurredAt: '2025-08-15T16:40:00',
    category: 'shopping',
    hasReceipt: true,
  },
  {
    id: 'txn-biolab-0808',
    accountId: 'main',
    merchant: 'Bio Lab Laboratories',
    logo: { kind: 'merchant', name: 'bio_lab_laboratories' },
    method: 'Card Payment',
    // Excluded by DATE only.
    amount: -180,
    currency: 'MYR',
    occurredAt: '2025-08-08T08:30:00',
    category: 'healthcare',
    hasReceipt: false,
  },
]
