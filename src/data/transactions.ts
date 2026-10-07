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
 *     (b) IT TOOK `TRANSACTION_FILTER_APPLIED` FROM 15 ROWS TO 16. Jaya Grocer
 *         fell from 529.75 to 263.20 and crossed under that filter's RM 500 cap,
 *         entering a set it used to sit just outside. Figma's own button prints
 *         "Apply Filter (15)", so the correspondence between the code and the
 *         frame broke here — and the frame is the out-of-date party, not the
 *         code. The harness ladder in `e2e/harness.ts` moved to the derived 16
 *         with it.
 *
 *         THE 16 IS GATE 48'S FIGURE AND IS NOT CURRENT. Gate 53 re-anchored
 *         that constant off the date facet — see the block on it in
 *         `derive.ts` — and it now matches 14 of 53 rows.
 *
 *     THE HEADLINE ABOVE — "15 satisfy Flow 8's applied filter" — IS THEREFORE
 *     ALSO STALE AND HAS BEEN CORRECTED. Do not restore either number by editing
 *     an amount away from its receipt.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  { id: 'bills', label: 'Bills & Utilities', icon: 'icon_bills', hue: 'red' },
  { id: 'groceries', label: 'Groceries', icon: 'icon_grocery', hue: 'purple' },
  { id: 'dining', label: 'Dining & Leisure', icon: 'icon_food', hue: 'blue' },
  { id: 'healthcare', label: 'Healthcare', icon: 'icon_healthcare', hue: 'cyan' },
  { id: 'transport', label: 'Transport', icon: 'icon_car', hue: 'lime' },
  { id: 'shopping', label: 'Shopping', icon: 'icon_shopping', hue: 'yellow' },
  { id: 'others', label: 'Others / Misc', icon: 'more_horiz', hue: 'orange' },
]

/**
 * 53 rows. FOURTEEN satisfy `TRANSACTION_FILTER_APPLIED` and 39 are outside it.
 * They exist so that clearing the filter is a visible act rather than a no-op: a
 * filter whose input equals its output is not a filter.
 *
 * THAT SPLIT HAS MOVED THREE TIMES AND THE HISTORY MATTERS, because two of the
 * three were amount changes and the third was not: 15/8 from Gate 41, 16/7 at
 * Gate 48 (which reconciled every receipt-linked amount to its receipt's printed
 * total, dropping Jaya Grocer under the RM 500 cap), and 14/11 at Gate 53 —
 * which added two rows AND re-anchored the filter itself off the date facet.
 * The derivation is on `TRANSACTION_FILTER_APPLIED`; re-derive rather than
 * trusting this sentence.
 *
 * Ordered by date descending, which is also the order the ledger renders in —
 * so the two 2026 rows below come FIRST.
 */
export const TRANSACTIONS: Transaction[] = [
  // ===== September 2026 — THE NEWEST ROWS IN THE LEDGER =====================
  //
  // TWO ROWS DATED A YEAR AHEAD OF EVERY OTHER ROW, AND THAT IS DELIBERATE
  // (Gate 53, Teku's ruling). They are dated from the date printed on the
  // paper receipts they were captured from — 12 Sept 2026 — and were explicitly
  // NOT re-dated into the file's September-2025 block to keep the fixture
  // uniform.
  //
  // ─────────── WHAT THAT COSTS, MEASURED, SO NOTHING IS DISCOVERED LATER ─────
  //
  // `ledgerNow()` is the newest row's timestamp, so these two rows MOVE THE
  // LEDGER'S PRESENT from 2025-09-15 to 2026-09-12. Two consequences, both
  // measured rather than reasoned:
  //
  //   · THE HOMEPAGE'S TWO-ROW STRIP NOW DRAWS THESE TWO. `recentTransactions`
  //     sorts date-descending and slices, so `/` and `/ [tab:crypto]` show
  //     iFruits Market and Rosyam Wholesale Express where Figma's frame
  //     draws Aeon Big (15 Sept) and Caring Pharmacy (13 Sept). That
  //     divergence from the drawn frame is ACCEPTED, not overlooked — see
  //     the Gate 53 section of CLAUDE.md, which names the affected states.
  //   · A DATE-ANCHORED FILTER BECOMES USELESS HERE. "This Month" measured back
  //     from the newest row means September 2026, which matches exactly these
  //     two rows and nothing else. That is why Gate 53 re-anchored
  //     `TRANSACTION_FILTER_APPLIED` onto facets that do not move with the
  //     newest row; the reasoning is on that constant.
  //
  // THEY SHIP WITH NO RECEIPT LINKED, DELIBERATELY. Every add-and-link path —
  // auto-match, the bulk modal, the detail sheet's own capture, and Gate 51-B's
  // manual picker — is hand-tested against them, so a pre-linked row would
  // remove the very state that testing needs.
  //
  // `accountId: 'main'` PER GATE 41'S PRECEDENT: a fabricated fiat row is
  // attributed to the account the money actually moved through, rather than to
  // an invented id that no holding claims. So `/finance/holding/main` goes
  // 19 rows -> 21.
  //
  // `logo: { kind: 'image' }` IS THE THIRD `TransactionLogo` CASE, new at Gate
  // 53. Neither merchant is in the DS's curated `LogoName` registry and neither
  // ever will be — these are photographs of shopfront signage, which is
  // per-record product data. See `TransactionLogo` in `types.ts`.
  {
    id: 'txn-ifruits-0912',
    accountId: 'main',
    merchant: 'iFruits Market',
    logo: { kind: 'image', filename: 'ifruits-market.jpg' },
    method: 'Card Payment',
    kind: 'payment',
    amount: -38.6,
    currency: 'MYR',
    occurredAt: '2026-09-12T16:13:00',
    category: 'groceries',
  },
  //
  // ─────────── THE ROSYAM PAYEE DROPS THE "ST", DELIBERATELY (Gate 54-B) ─────
  //
  // The shopfront and the paper receipt both read "ST ROSYAM WHOLESALE
  // EXPRESS". This row is deliberately named WITHOUT the "ST", and that is a
  // data ruling (Teku, decision 8A) rather than a transcription slip — do not
  // "correct" it back.
  //
  // WHY, MEASURED WITH THE REAL ENGINE ON THE REAL PHOTOGRAPH. Tesseract splits
  // the letterhead across two lines and the leading "ST" lands in the logo
  // noise rather than in the legal-name line:
  //
  //     STH 7. 3 2
  //     ROSYAM WHOLESALE EXPRESS SDN BHD
  //
  // so readMerchant returns "ROSYAM WHOLESALE EXPRESS". Auto-match requires
  // EVERY payee token to appear in the read merchant, and a token of two
  // letters must match exactly — so the payee token "st" had no counterpart and
  // a real capture of this receipt did not link, with totalMatches and
  // withinWindow BOTH TRUE. It was the only one of the three criteria failing.
  //
  // THE FIX IS THE DATA, NOT THE RULE. Loosening merchantMatches to forgive a
  // missing short token would also link "kfc" to a "kfd" and "ikea" to an
  // "idea", and a false link is the worse failure — the rule stands at 0 wrong
  // links and was not touched. See merchantMatches in autoMatch.ts; the
  // regression arm is in e2e/automatch.spec.ts.
  //
  // THE id AND THE PHOTOGRAPH'S FILENAME STILL SAY "rosyam"/"st-rosyam" AND
  // THAT IS CORRECT. `transactionLogoUrl` resolves the image by `filename`, not
  // by payee, so the signage photograph is unaffected by the rename; and the id
  // is an opaque key. Renaming either would be churn with a migration cost and
  // no reader.
  {
    id: 'txn-rosyam-0912',
    accountId: 'main',
    merchant: 'Rosyam Wholesale Express',
    logo: { kind: 'image', filename: 'st-rosyam.jpg' },
    method: 'Card Payment',
    kind: 'payment',
    amount: -70.85,
    currency: 'MYR',
    occurredAt: '2026-09-12T16:05:00',
    category: 'groceries',
  },
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
    kind: 'payment',
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
    kind: 'payment',
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
    kind: 'payment',
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
    kind: 'transfer',
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
    kind: 'transfer',
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
    kind: 'transfer',
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
    kind: 'payment',
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
    kind: 'payment',
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
    kind: 'payment',
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
    kind: 'payment',
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
    kind: 'payment',
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
    kind: 'payment',
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
    kind: 'payment',
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
    kind: 'payment',
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
    kind: 'payment',
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
    kind: 'payment',
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
    kind: 'transfer',
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
    kind: 'payment',
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
    kind: 'transfer',
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
    kind: 'payment',
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
    kind: 'payment',
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
    kind: 'payment',
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
    kind: 'payment',
    // Excluded by DATE only.
    amount: -180,
    currency: 'MYR',
    occurredAt: '2025-08-08T08:30:00',
    category: 'healthcare',
  },

  // ===== SAVINGS-GOAL CONTRIBUTIONS (Gate 77) ==============================
  //
  // TWENTY-EIGHT ROWS RELOCATED OUT OF `goals.ts`, NOT AUTHORED HERE. Until
  // Gate 77 a `Goal` carried its own `contributions` array, which made a
  // contribution a second kind of money movement living outside this ledger:
  // invisible to the Transactions tab, to its search and its facets, and to the
  // account drill-down the money actually left. Every one of these rows existed
  // before this gate; none was invented and none was discarded.
  //
  // THEY ARE APPENDED AS A BLOCK RATHER THAN INTERLEAVED INTO THE MONTH
  // SECTIONS ABOVE, AND THAT COSTS NOTHING because array order is not display
  // order anywhere: `filterTransactions`, `recentTransactions`,
  // `groupTransactionsByMonth` and `holdingFields` all sort date-descending
  // themselves. Keeping the block together is what makes the provenance
  // readable - these 28 came from one place, on one day.
  //
  // ------------------------- WHAT EACH FIELD IS -----------------------------
  //
  //   `kind: 'transfer'`  - money moved between things the user owns, so it is
  //     not spending. `countsToward` rejects by `kind` FIRST, so not one budget
  //     figure moves; measured before and after, both budgets identical.
  //
  //   `amount` NEGATIVE  - a contribution DEBITS its source account. That is
  //     Teku's own Top-Up ruling applied to a past top-up, and it is what keeps
  //     the sign convention this ledger already uses: the sign is relative to
  //     `accountId`, which is why a Maybank credit is +5,200 on `main` and a
  //     crypto transfer out of Marge's wallet is -350.69 on `marg`.
  //
  //   `accountId: 'main'`  - AN ATTRIBUTION, AND THE ONE AUTHORED CHOICE HERE.
  //     Nothing in the old `GoalContribution` recorded a source account. Main is
  //     the primary cash account and the only one with real history, so the 28
  //     rows are attributed to it wholesale, exactly as Flow 7 attributed the
  //     pre-existing ledger. It is what makes `transactionAccount()` resolve to
  //     a real institution on the detail sheet; a goal id there would resolve to
  //     nothing. Reversible in one edit if Teku wants them split or moved.
  //
  //   `occurredAt` TIME  - the other authored detail, and it is authored ONCE.
  //     A `GoalContribution` carried a bare `date`; a `Transaction` requires a
  //     timestamp. Every row takes 09:00:00, a standing-order hour. One repeated
  //     time is the least-invented choice available and it leaves the synthetic
  //     part visible, where 28 fabricated clock readings would hide it.
  //
  //   `category`  - INERT FOR EVERY BUDGET COMPUTATION, because `countsToward`
  //     rejects on `kind` before it reads a category. `'others'` is the existing
  //     catch-all; no new category was invented, which would have widened the
  //     budget form's picker for a row that can never be budgeted.
  //
  //   `logo: { kind: 'goal' }`  - the goal's own photograph. A FOURTH tagged
  //     case rather than a reuse of `image`, because the two resolve through
  //     different directories - see `TransactionLogo` in `types.ts`.
  //
  // ------------------- THE DATE SPAN, REPORTED NOT FIXED ---------------------
  //
  // THESE 28 ROWS SPAN 2025-09-15 TO 2026-08-15 AND THE SPENDING DOESN'T.
  // The 25 pre-existing rows sit in two clusters - 23 in Aug/Sept 2025 and 2 in
  // Sept 2026 - so ten whole months of this ledger (Oct 2025 through Jul 2026)
  // now contain SAVINGS AND NOTHING ELSE. That is a property of the spending
  // seed, not of these rows, and adjusting it is a product call nobody has made.
  //
  // `ledgerNow()` IS UNMOVED, WHICH IS THE ONE THING THAT COULD HAVE BROKEN. It
  // is the newest row, still 2026-09-12T16:13; the newest contribution is
  // 2026-08-15. So the date facet's anchor and the `[overlay:applied]` ladder
  // are both untouched, measured rather than assumed.
  {
    id: 'txn-bali-c16',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'automatic',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -250,
    currency: 'MYR',
    occurredAt: '2026-08-15T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c15',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'automatic',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -250,
    currency: 'MYR',
    occurredAt: '2026-07-15T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c14',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'manual',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -500,
    currency: 'MYR',
    occurredAt: '2026-07-02T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c13',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'automatic',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -250,
    currency: 'MYR',
    occurredAt: '2026-06-15T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c12',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'manual',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -340,
    currency: 'MYR',
    occurredAt: '2026-05-18T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c11',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'automatic',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -250,
    currency: 'MYR',
    occurredAt: '2026-05-15T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c10',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'automatic',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -250,
    currency: 'MYR',
    occurredAt: '2026-04-15T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c09',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'automatic',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -250,
    currency: 'MYR',
    occurredAt: '2026-03-15T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c08',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'manual',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -1000,
    currency: 'MYR',
    occurredAt: '2026-03-10T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c07',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'automatic',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -250,
    currency: 'MYR',
    occurredAt: '2026-02-15T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c06',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'automatic',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -250,
    currency: 'MYR',
    occurredAt: '2026-01-15T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c05',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'automatic',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -250,
    currency: 'MYR',
    occurredAt: '2025-12-15T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c04',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'automatic',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -250,
    currency: 'MYR',
    occurredAt: '2025-11-15T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c03',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'automatic',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -250,
    currency: 'MYR',
    occurredAt: '2025-10-15T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c02',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'manual',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -200,
    currency: 'MYR',
    occurredAt: '2025-10-05T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-bali-c01',
    accountId: 'main',
    goalId: 'goal-bali-trip',
    contributionSource: 'automatic',
    merchant: 'Bali Trip',
    logo: { kind: 'goal', filename: 'goal_bali_trip.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -250,
    currency: 'MYR',
    occurredAt: '2025-09-15T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-emerg-c12',
    accountId: 'main',
    goalId: 'goal-emergency-funds',
    contributionSource: 'automatic',
    merchant: 'Emergency Funds',
    logo: { kind: 'goal', filename: 'goal_emergency_funds.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -900,
    currency: 'MYR',
    occurredAt: '2026-08-01T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-emerg-c11',
    accountId: 'main',
    goalId: 'goal-emergency-funds',
    contributionSource: 'manual',
    merchant: 'Emergency Funds',
    logo: { kind: 'goal', filename: 'goal_emergency_funds.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -1500,
    currency: 'MYR',
    occurredAt: '2026-07-20T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-emerg-c10',
    accountId: 'main',
    goalId: 'goal-emergency-funds',
    contributionSource: 'automatic',
    merchant: 'Emergency Funds',
    logo: { kind: 'goal', filename: 'goal_emergency_funds.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -900,
    currency: 'MYR',
    occurredAt: '2026-07-01T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-emerg-c09',
    accountId: 'main',
    goalId: 'goal-emergency-funds',
    contributionSource: 'automatic',
    merchant: 'Emergency Funds',
    logo: { kind: 'goal', filename: 'goal_emergency_funds.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -900,
    currency: 'MYR',
    occurredAt: '2026-06-01T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-emerg-c08',
    accountId: 'main',
    goalId: 'goal-emergency-funds',
    contributionSource: 'automatic',
    merchant: 'Emergency Funds',
    logo: { kind: 'goal', filename: 'goal_emergency_funds.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -900,
    currency: 'MYR',
    occurredAt: '2026-05-01T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-emerg-c07',
    accountId: 'main',
    goalId: 'goal-emergency-funds',
    contributionSource: 'manual',
    merchant: 'Emergency Funds',
    logo: { kind: 'goal', filename: 'goal_emergency_funds.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -540,
    currency: 'MYR',
    occurredAt: '2026-04-22T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-emerg-c06',
    accountId: 'main',
    goalId: 'goal-emergency-funds',
    contributionSource: 'automatic',
    merchant: 'Emergency Funds',
    logo: { kind: 'goal', filename: 'goal_emergency_funds.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -900,
    currency: 'MYR',
    occurredAt: '2026-04-01T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-emerg-c05',
    accountId: 'main',
    goalId: 'goal-emergency-funds',
    contributionSource: 'automatic',
    merchant: 'Emergency Funds',
    logo: { kind: 'goal', filename: 'goal_emergency_funds.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -900,
    currency: 'MYR',
    occurredAt: '2026-03-01T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-emerg-c04',
    accountId: 'main',
    goalId: 'goal-emergency-funds',
    contributionSource: 'automatic',
    merchant: 'Emergency Funds',
    logo: { kind: 'goal', filename: 'goal_emergency_funds.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -900,
    currency: 'MYR',
    occurredAt: '2026-02-01T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-emerg-c03',
    accountId: 'main',
    goalId: 'goal-emergency-funds',
    contributionSource: 'automatic',
    merchant: 'Emergency Funds',
    logo: { kind: 'goal', filename: 'goal_emergency_funds.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -900,
    currency: 'MYR',
    occurredAt: '2026-01-01T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-emerg-c02',
    accountId: 'main',
    goalId: 'goal-emergency-funds',
    contributionSource: 'automatic',
    merchant: 'Emergency Funds',
    logo: { kind: 'goal', filename: 'goal_emergency_funds.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -900,
    currency: 'MYR',
    occurredAt: '2025-12-01T09:00:00',
    category: 'others',
  },
  {
    id: 'txn-emerg-c01',
    accountId: 'main',
    goalId: 'goal-emergency-funds',
    contributionSource: 'automatic',
    merchant: 'Emergency Funds',
    logo: { kind: 'goal', filename: 'goal_emergency_funds.jpg', origin: 'ai' },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -900,
    currency: 'MYR',
    occurredAt: '2025-11-01T09:00:00',
    category: 'others',
  },
]
