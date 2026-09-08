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
 * Two consequences worth stating, because both are checkable:
 *
 * - Sorting this ledger newest-first and taking two rows yields Aeon Big
 *   (15 Sept) and Caring Pharmacy (13 Sept) — exactly the two rows the Homepage
 *   draws. NOTHING FLOW 8 ADDED IS DATED LATER THAN 12 SEPT, so neither can be
 *   displaced; the newest fabricated row is KFC at 12 Sept 08:15. GATE 48 MOVED
 *   NO DATE, so this still holds.
 * - `categoryTotal('groceries')` COMPUTED 1800.00 UNTIL GATE 48 AND NOW COMPUTES
 *   1118.46. That was the one hand-authored total in the design that survived
 *   being recomputed, and the receipt reconciliation below retired it. It has no
 *   runtime consumer. Do not quote 1,800 as a live check on anything.
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
 * button "Apply Filter (15)". Both numbers were REAL rather than decorative when
 * this was written: `filterTransactions()` in `derive.ts` evaluated the four
 * facets over this array and returned 15 rows, whose first nine — under an
 * ordinary date-descending sort — were Figma's nine.
 *
 * GATE 48 TOOK THAT TO 16. See the Gate 48 block below; the nine drawn rows are
 * still the top nine, but a tenth row now falls inside the cap.
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
 * ─────────────────────────────────────────────────────────────────────────────
 * GATE 48 — TWO CHANGES, AND NEITHER TOUCHED A DATE OR A ROW ORDER.
 *
 * 1 · `hasReceipt` IS GONE FROM EVERY ROW. It was a stored boolean on 10 of the
 *     23, and nothing kept it in step with the receipts that are the actual
 *     evidence — two copies of one fact. `src/data/receipts.ts` now states it
 *     once, and `transactionHasReceipt()` in `derive.ts` answers the question.
 *     See the note in `types.ts` where the field used to be declared.
 *
 *     The reconciliation was exact: the 10 rows that carried `true` are the same
 *     10 the receipt collection links to, with ZERO disagreements either way.
 *
 * 2 · NINE AMOUNTS FOLLOW THEIR RECEIPT'S PRINTED TOTAL. On a LINKED row the
 *     amount is now the receipt total, negated. The receipts are photographs of
 *     what was actually paid; these figures were authored at Gate 41 before any
 *     receipt existed, so where they disagreed the receipt won.
 *
 *       txn-caring-0913      -25.50 ->    -26.29
 *       txn-tonyroma-0910    -95.00 ->    -98.26
 *       txn-ikea-0906       -129.00 ->   -137.59
 *       txn-lotus-0905      -310.40 ->    -96.14
 *       txn-aeon-0904       -420.50 ->   -429.19
 *       txn-giant-0902      -288.60 ->    -79.18
 *       txn-ikea-0908       -899.00 ->   -830.83
 *       txn-jaya-0901       -529.75 ->   -263.20
 *       txn-ikea-0815     -1,250.00 -> -2,647.67
 *       txn-aia-0825        -320.00      UNCHANGED — already the receipt total
 *
 *     MERCHANT, CATEGORY, METHOD, ACCOUNT AND DATE ARE ALL UNTOUCHED, so the
 *     date-descending order of all 23 rows is identical before and after. Only
 *     the printed figures moved.
 *
 *     TWO INVARIANTS THIS BROKE ON PURPOSE, both stated so neither is
 *     rediscovered as a bug:
 *
 *     (a) The RM 1,800.00 groceries chain — see above. Four of the five
 *         groceries rows moved; the total is now 1118.46.
 *
 *     (b) `TRANSACTION_FILTER_APPLIED` NOW MATCHES 16 ROWS, NOT 15. Jaya Grocer
 *         fell from 529.75 to 263.20 and crossed under that filter's RM 500 cap,
 *         entering a set it used to sit just outside. Figma's own button prints
 *         "Apply Filter (15)", so the correspondence between the code and the
 *         frame is broken — and the frame is the thing that is now out of date,
 *         not the code. The harness ladder in `e2e/harness.ts` was moved to the
 *         derived 16 with it.
 *
 *     THE HEADLINE ABOVE — "15 satisfy Flow 8's applied filter" — IS THEREFORE
 *     ALSO STALE AND HAS BEEN CORRECTED. Do not restore either number by editing
 *     an amount away from its receipt.
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
 * 23 rows. SIXTEEN satisfy Flow 8's applied filter and 7 are outside it — it was
 * 15 and 8 until Gate 48 reconciled the linked amounts to their receipts. They
 * exist so that clearing the filter is a visible act rather than a no-op: a
 * filter whose input equals its output is not a filter.
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
    // NO RECEIPT. The Homepage draws no receipt glyph on this row and the Budget
    // drilldown draws one on all five; the Homepage won, which is Flow 1's
    // authority. As of Gate 48 that is expressed by this row's ABSENCE from
    // `receipts.ts` rather than by a `hasReceipt: false` here — which is also
    // why its amount did not move.
  },
  {
    id: 'txn-caring-0913', // (2)
    accountId: 'main',
    merchant: 'Caring Pharmacy',
    logo: { kind: 'merchant', name: 'caring' },
    method: 'Card Payment',
    amount: -26.29,
    currency: 'MYR',
    occurredAt: '2025-09-13T18:50:00',
    category: 'healthcare',
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
  },
  {
    id: 'txn-tonyroma-0910', // (7)
    accountId: 'main',
    merchant: "Tony Roma's",
    logo: { kind: 'merchant', name: 'tonyroma' },
    method: 'Fund Transfer',
    amount: -98.26,
    currency: 'MYR',
    occurredAt: '2025-09-10T07:21:00',
    category: 'dining',
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
  },
  {
    // (5) — the earliest of Figma's nine, and the boundary every filler row
    // below must sort under.
    id: 'txn-ikea-0906',
    accountId: 'main',
    merchant: 'IKEA',
    logo: { kind: 'merchant', name: 'ikea' },
    method: 'Fund Transfer',
    amount: -137.59,
    currency: 'MYR',
    occurredAt: '2025-09-06T08:00:00',
    category: 'shopping',
  },

  // Rows 10-15 of the filtered result: inside the filter, below Figma's nine.
  // They are what makes the Apply button's count a computed number rather than a
  // caption, and what puts content below the fold for A6's overflow. That count
  // read 15 and matched Figma's own button until Gate 48; it now reads 16.
  {
    id: 'txn-lotus-0905',
    // Attributed to the Joint account by Flow 7 — see the header note.
    accountId: 'joint',
    merchant: "Lotus's",
    logo: { kind: 'merchant', name: 'lotus_s' },
    method: 'Card Payment',
    amount: -96.14,
    currency: 'MYR',
    occurredAt: '2025-09-05T17:12:00',
    category: 'groceries',
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
  },
  {
    // WAS `txn-aeon-0909` at 2025-09-09T13:45 — moved by Flow 8 so Figma's nine
    // occupy the filtered top nine. See the header note; its category and
    // account are still unchanged. ITS AMOUNT IS NOT: Gate 48 moved it -420.50
    // -> -429.19 to follow `receipt_aeonbig01`, which is part of why the
    // groceries chain no longer sums to RM 1,800.00.
    id: 'txn-aeon-0904',
    accountId: 'main',
    merchant: 'Aeon Big',
    logo: { kind: 'merchant', name: 'aeon' },
    method: 'Card Payment',
    amount: -429.19,
    currency: 'MYR',
    occurredAt: '2025-09-04T13:45:00',
    category: 'groceries',
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
  },
  {
    id: 'txn-giant-0902',
    // Attributed to the Joint account by Flow 7 — see the header note.
    accountId: 'joint',
    merchant: 'Giant',
    logo: { kind: 'merchant', name: 'giant' },
    method: 'Card Payment',
    amount: -79.18,
    currency: 'MYR',
    occurredAt: '2025-09-02T12:56:00',
    category: 'groceries',
  },

  // ===== Outside the applied filter =========================================
  // RE-DERIVED AT GATE 48, because the amount reconciliation moved the boundary.
  // Of the seven rows now excluded: TWO fail on AMOUNT alone and are inside
  // September, THREE fail on DATE alone, and TWO fail on both. It was 3/3/2
  // before — Jaya Grocer left this group entirely (see its row below).
  //
  // The property this grouping exists for SURVIVES: each facet still has at
  // least one row that only IT excludes, so a facet that stopped working would
  // change the count rather than being masked by another facet excluding the
  // same rows.
  //
  // JAYA GROCER IS PHYSICALLY STILL IN THIS BLOCK AND IS NO LONGER EXCLUDED.
  // It was left where it sits so the Gate 48 diff shows an amount changing and
  // nothing else; this file's order is organisational, never rendered — every
  // consumer sorts by date.
  {
    id: 'txn-ikea-0908',
    accountId: 'main',
    merchant: 'IKEA',
    logo: { kind: 'merchant', name: 'ikea' },
    method: 'Card Payment',
    // Excluded by AMOUNT only — inside September. A flatpack run.
    amount: -830.83,
    currency: 'MYR',
    occurredAt: '2025-09-08T15:20:00',
    category: 'shopping',
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
  },
  {
    id: 'txn-jaya-0901',
    accountId: 'main',
    merchant: 'Jaya Grocer',
    logo: { kind: 'merchant', name: 'jayagrocer' },
    method: 'Card Payment',
    // NO LONGER EXCLUDED — AND IT IS THE ROW THAT MOVED THE COUNT. It failed on
    // AMOUNT alone at -529.75; `receipt_jayagrocer01` prints RM 263.20, which is
    // under the filter's RM 500 cap, so Gate 48 pulled it INTO the applied set
    // and `TRANSACTION_FILTER_APPLIED` went 15 -> 16.
    amount: -263.2,
    currency: 'MYR',
    occurredAt: '2025-09-01T14:36:00',
    category: 'groceries',
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
  },
  {
    id: 'txn-ikea-0815',
    accountId: 'main',
    merchant: 'IKEA',
    logo: { kind: 'merchant', name: 'ikea' },
    method: 'Card Payment',
    // Excluded by BOTH facets.
    amount: -2647.67,
    currency: 'MYR',
    occurredAt: '2025-08-15T16:40:00',
    category: 'shopping',
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
  },
]
