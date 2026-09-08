import type { Receipt } from './types'

/**
 * The receipt collection — Flow 9's source of truth for what has been captured.
 *
 * A PEER OF `transactions.ts`, READ THE SAME WAY. `AccountsProvider` imports
 * this and exposes it as `receipts`; every screen reads `useAccounts()` and
 * never this file, exactly as the ledger already works. There is one receipt
 * collection in `src/` and one ledger, and they join on `transactionId`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE PAIRING WAS DERIVED FROM THE IMAGES, NOT TRANSCRIBED FROM A TABLE.
 *
 * A provisional receipt-to-transaction mapping was supplied with the artwork and
 * explicitly flagged as not ground truth. It was NOT used as input. What was
 * used is the receipts themselves: every one of the ten prints its own DATE AND
 * TIME, and every one matches its transaction's `occurredAt` to the MINUTE.
 *
 *   receipt_aeonbig01    04/09/2025 13:45  ->  txn-aeon-0904      2025-09-04T13:45
 *   receipt_aia01        25/08/2025 11:20  ->  txn-aia-0825       2025-08-25T11:20
 *   receipt_caring01     13/09/2025 18:50  ->  txn-caring-0913    2025-09-13T18:50
 *   receipt_giant01      02/09/2025 12:56  ->  txn-giant-0902     2025-09-02T12:56
 *   receipt_ikea01       08/09/2025 15:20  ->  txn-ikea-0908      2025-09-08T15:20
 *   receipt_ikea02       06/09/2025 08:00  ->  txn-ikea-0906      2025-09-06T08:00
 *   receipt_ikea03       15/08/2025 16:40  ->  txn-ikea-0815      2025-08-15T16:40
 *   receipt_jayagrocer01 01/09/2025 14:36  ->  txn-jaya-0901      2025-09-01T14:36
 *   receipt_lotus01      05/09/2025 17:12  ->  txn-lotus-0905     2025-09-05T17:12
 *   receipt_tonyroma02   10/09/2025 07:21  ->  txn-tonyroma-0910  2025-09-10T07:21
 *
 * Timestamp plus merchant is a far stronger key than the amount, and the ledger
 * contains the case that proves why: `txn-caring-0913` and `txn-kfc-0912` were
 * BOTH exactly -25.50, so any matcher keyed on amount would have had a coin
 * toss between a pharmacy and a fried-chicken shop. Nothing here matches on
 * amount, and nothing that does should be written.
 *
 * THE THREE IKEA RECEIPTS COULD NOT BE TOLD APART FROM THEIR FILENAMES, and
 * were not guessed. `receipt_ikea01/02/03` carry no merchant-side information
 * beyond the ordinal. They are separated by the printed DATE: 08 Sept, 06 Sept
 * and 15 Aug respectively, matching the ledger's three IKEA rows one-for-one.
 * That the resulting order happens to agree with the provisional table is a
 * check ON the table, not the derivation.
 *
 * RECONCILIATION AGAINST THE OLD STORED FLAG: the ledger carried
 * `hasReceipt: true` on exactly 10 rows, and they are exactly the 10 above.
 * ZERO disagreements in either direction — no receipt without a flagged row, no
 * flagged row without a receipt. The flag has since been deleted (see
 * `types.ts`); this collection is now the only statement of that fact.
 * ─────────────────────────────────────────────────────────────────────────────
 * `total` IS TRANSCRIBED, AND SIX OF THE TEN DO NOT ADD UP.
 *
 * Each record's `total` is the figure the paper prints on its `Total (RM)` line.
 * NINE of the ten also print a subtotal (AIA prints one premium and one total
 * and nothing else). Of those nine, THREE have line items summing to the printed
 * subtotal exactly — Caring Pharmacy, and IKEA 01 and 02 — and SIX do not, every
 * one of them UNDER, by margins from RM 0.10 to RM 200.10:
 *
 *   receipt-aeonbig01     204.80 vs   404.90   -200.10
 *   receipt-ikea03      2,496.80 vs 2,497.80     -1.00
 *   receipt-giant01        74.60 vs    74.70     -0.10
 *   receipt-jayagrocer01  248.20 vs   248.30     -0.10
 *   receipt-lotus01        90.60 vs    90.70     -0.10
 *   receipt-tonyroma02     92.60 vs    92.70     -0.10
 *
 * Those are artifacts of the mock artwork and they are RECORDED RATHER THAN
 * CORRECTED. Nothing in the app sums `lineItems`, so no screen can surface the
 * discrepancy; inventing line items to close it would be inventing product data,
 * and adjusting a total would break the ledger reconciliation below.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE LEDGER FOLLOWS THE RECEIPT, NOT THE OTHER WAY ROUND (Gate 48).
 *
 * On a LINKED row the transaction amount is the receipt's total, negated. The
 * receipt is a photograph of what was actually paid; the ledger figures were
 * authored at Gate 41 before any receipt existed, so where they disagreed the
 * receipt won. Nine of the ten rows moved; `txn-aia-0825` was already -320.00
 * and did not.
 *
 * TWO THINGS MOVED WITH THEM, both stated because neither is obvious:
 *
 *  1. `categoryTotal('groceries')` WAS 1800.00 AND IS NOW 1118.46. That figure
 *     was the one hand-authored Figma total that survived recomputation, and it
 *     no longer does. It has NO RUNTIME CONSUMER — `categoryTotal` is exported
 *     and read by no screen — so nothing renders differently; what changed is
 *     that a documented invariant is retired. Do not "restore" it by editing an
 *     amount away from its receipt.
 *
 *  2. `TRANSACTION_FILTER_APPLIED` NOW RETURNS 16 ROWS, NOT 15. `txn-jaya-0901`
 *     fell from 529.75 to 263.20 and crossed under that filter's RM 500 cap, so
 *     it entered a set it used to sit just outside. Figma's own button prints
 *     "Apply Filter (15)", so that correspondence is now broken — see the note
 *     on the constant in `derive.ts`, and the harness ladder in
 *     `e2e/harness.ts`, both of which were updated to the derived 16. It is a
 *     real loss and it is the price of the reconciliation, not an oversight.
 *
 * WHAT DID NOT MOVE: merchant, category, payment method, account, date, and
 * therefore ledger position. The date-descending order of all 23 rows is
 * identical before and after — verified, not assumed.
 * ─────────────────────────────────────────────────────────────────────────────
 * `displayName` IS NOT DERIVED FROM `filename` AND CANNOT BE. See `Receipt` in
 * `types.ts`. The `IMG_48xx` numbers below are authored to sit in capture order
 * — a camera roll numbers monotonically — so the oldest receipt (15 Aug) is
 * IMG_4703 and the newest (13 Sept) is IMG_4903. That ordering is the only
 * constraint on them; the exact digits carry no meaning and join to nothing.
 */
export const RECEIPTS: Receipt[] = [
  {
    id: 'receipt-aeonbig01',
    filename: 'receipt_aeonbig01.jpg',
    displayName: 'IMG_4806.jpg',
    capturedAt: '2025-09-04T13:45:00',
    merchant: 'Aeon Big',
    // Printed: Subtotal 404.90, SST (6%) 24.29, Total 429.19.
    // The eight line items sum to 204.80, i.e. 200.10 short of the printed
    // subtotal — the largest discrepancy in the set. Recorded, not corrected.
    total: 429.19,
    currency: 'MYR',
    lineItems: [
      { name: "Munchy's Oat Krunch 416g", quantity: '1', price: 10.5 },
      { name: 'Nestle Milo 2kg', quantity: '1', price: 52.9 },
      { name: 'Ayam Brand Tuna 185g', quantity: '1', price: 7.9 },
      { name: 'Dettol Body Wash 950ml', quantity: '1', price: 28.9 },
      { name: 'Downy Fabric Softener 1.5L', quantity: '1', price: 23.9 },
      { name: 'Fairy Dishwashing 900ml', quantity: '1', price: 12.9 },
      { name: 'Basmathi Rice 5kg', quantity: '1', price: 52.9 },
      { name: 'Mineral Water 6 x 1.5L', quantity: '1', price: 14.9 },
    ],
    transactionId: 'txn-aeon-0904',
  },
  {
    id: 'receipt-aia01',
    filename: 'receipt_aia01.jpg',
    displayName: 'IMG_4776.jpg',
    capturedAt: '2025-08-25T11:20:00',
    merchant: 'AIA',
    // THE ONLY RECEIPT WITH NO SUBTOTAL AND NO SST LINE: one premium, one
    // total, and they agree exactly. Also the only one whose transaction amount
    // did not have to move — it was already -320.00.
    total: 320,
    currency: 'MYR',
    lineItems: [{ name: 'AIA Vitality Premium', quantity: '1', price: 320 }],
    transactionId: 'txn-aia-0825',
  },
  {
    id: 'receipt-caring01',
    filename: 'receipt_caring01.jpg',
    displayName: 'IMG_4903.jpg',
    capturedAt: '2025-09-13T18:50:00',
    merchant: 'Caring Pharmacy',
    // RECONCILES EXACTLY: 12.90 + 11.90 = 24.80 subtotal, SST (6%) 1.49,
    // total 26.29. One of the three that add up.
    total: 26.29,
    currency: 'MYR',
    lineItems: [
      { name: "Panadol 500mg 20's", quantity: '1', price: 12.9 },
      { name: "Strepsils Honey 24's", quantity: '1', price: 11.9 },
    ],
    transactionId: 'txn-caring-0913',
  },
  {
    id: 'receipt-giant01',
    filename: 'receipt_giant01.jpg',
    displayName: 'IMG_4795.jpg',
    capturedAt: '2025-09-02T12:56:00',
    merchant: 'Giant',
    // Printed subtotal 74.70, SST (6%) 4.48, total 79.18. The nine lines sum to
    // 74.60 — 0.10 under.
    total: 79.18,
    currency: 'MYR',
    lineItems: [
      { name: 'Dutch Lady Full Cream Milk 1L', quantity: '1', price: 6.9 },
      { name: 'Gardenia Wholemeal Bread', quantity: '1', price: 3.8 },
      { name: 'Red Apple 1kg', quantity: '1', price: 9.9 },
      { name: 'Chicken Thigh 1kg', quantity: '1', price: 17.5 },
      { name: 'Carrot 1kg', quantity: '1', price: 4.9 },
      { name: 'Onion 1kg', quantity: '1', price: 3.9 },
      { name: "Maggi Mi Goreng 5's", quantity: '1', price: 5.9 },
      { name: 'Colgate Toothpaste 250g', quantity: '1', price: 12.9 },
      { name: "Garbage Bag L 20's", quantity: '1', price: 8.9 },
    ],
    transactionId: 'txn-giant-0902',
  },
  {
    id: 'receipt-ikea01',
    filename: 'receipt_ikea01.jpg',
    displayName: 'IMG_4838.jpg',
    capturedAt: '2025-09-08T15:20:00',
    merchant: 'IKEA',
    // RECONCILES EXACTLY: the four lines sum to 783.80 = the printed subtotal.
    // SST (6%) 47.03, total 830.83.
    total: 830.83,
    currency: 'MYR',
    lineItems: [
      { name: 'KALLAX Shelf Unit', quantity: '1', price: 399 },
      { name: 'DRÖNA Box (White)', quantity: '1', price: 39.9 },
      { name: 'SKADIS Pegboard', quantity: '1', price: 299 },
      { name: 'Mounting Kit', quantity: '1', price: 45.9 },
    ],
    transactionId: 'txn-ikea-0908',
  },
  {
    id: 'receipt-ikea02',
    filename: 'receipt_ikea02.jpg',
    displayName: 'IMG_4821.jpg',
    capturedAt: '2025-09-06T08:00:00',
    merchant: 'IKEA',
    // RECONCILES EXACTLY: 79.90 + 49.90 = 129.80 subtotal, SST (6%) 7.79,
    // total 137.59. The smallest of the three IKEA receipts, and the only one
    // whose ledger row sits inside the applied filter.
    total: 137.59,
    currency: 'MYR',
    lineItems: [
      { name: 'BLÅHAJ Soft Toy', quantity: '1', price: 79.9 },
      { name: 'IKEA 365+ Food Container', quantity: '1', price: 49.9 },
    ],
    transactionId: 'txn-ikea-0906',
  },
  {
    id: 'receipt-ikea03',
    filename: 'receipt_ikea03.jpg',
    displayName: 'IMG_4703.jpg',
    capturedAt: '2025-08-15T16:40:00',
    merchant: 'IKEA',
    // Printed subtotal 2,497.80, SST (6%) 149.87, total 2,647.67. The five
    // lines sum to 2,496.80 — 1.00 under. THE LARGEST RECEIPT IN THE SET, and
    // the one that moves its ledger row furthest: -1250.00 -> -2647.67.
    total: 2647.67,
    currency: 'MYR',
    lineItems: [
      { name: 'MALM Bed Frame (Queen)', quantity: '1', price: 999 },
      { name: 'ÄFJÄLL Mattress', quantity: '1', price: 1199 },
      { name: 'NATTJASMIN Fitted Sheet', quantity: '1', price: 49.9 },
      { name: 'SKOGSRAKET Pillow', quantity: '1', price: 49.9 },
      { name: 'HÖNEFOSS Duvet', quantity: '1', price: 199 },
    ],
    transactionId: 'txn-ikea-0815',
  },
  {
    id: 'receipt-jayagrocer01',
    filename: 'receipt_jayagrocer01.jpg',
    displayName: 'IMG_4788.jpg',
    capturedAt: '2025-09-01T14:36:00',
    merchant: 'Jaya Grocer',
    // Printed subtotal 248.30, SST (6%) 14.90, total 263.20. The eight lines
    // sum to 248.20 — 0.10 under.
    //
    // THIS IS THE ROW THAT CHANGES THE FILTER COUNT. Its transaction fell
    // 529.75 -> 263.20 and crossed under the RM 500 cap, taking
    // `TRANSACTION_FILTER_APPLIED` from 15 rows to 16.
    total: 263.2,
    currency: 'MYR',
    lineItems: [
      { name: 'Australian Ribeye Steak 300g', quantity: '1', price: 89.9 },
      { name: 'Sunkist Orange 1kg', quantity: '1', price: 12.9 },
      { name: 'Avocado 1pc', quantity: '1', price: 8.9 },
      { name: 'Baby Spinach 200g', quantity: '1', price: 9.9 },
      { name: 'Greek Yogurt 1kg', quantity: '1', price: 18.9 },
      { name: 'Almonds 500g', quantity: '1', price: 32.9 },
      { name: 'Extra Virgin Olive Oil 500ml', quantity: '1', price: 45.9 },
      { name: 'Quinoa 1kg', quantity: '1', price: 28.9 },
    ],
    transactionId: 'txn-jaya-0901',
  },
  {
    id: 'receipt-lotus01',
    filename: 'receipt_lotus01.jpg',
    displayName: 'IMG_4812.jpg',
    capturedAt: '2025-09-05T17:12:00',
    merchant: "Lotus's",
    // Printed subtotal 90.70, SST (6%) 5.44, total 96.14. The nine lines sum to
    // 90.60 — 0.10 under.
    total: 96.14,
    currency: 'MYR',
    lineItems: [
      { name: 'Sunquick Orange 840ml', quantity: '1', price: 12.9 },
      { name: 'Gardenia White Bread', quantity: '1', price: 3.5 },
      { name: 'Dutch Lady Fresh Milk 1L', quantity: '1', price: 6.9 },
      { name: "Maggi Kari 5's", quantity: '1', price: 5.9 },
      { name: "Eggs Grade A 10's", quantity: '1', price: 12.5 },
      { name: 'Fresh Chicken 1kg', quantity: '1', price: 20.9 },
      { name: 'Broccoli 1pc', quantity: '1', price: 8.9 },
      { name: 'Apples Fuji 1kg', quantity: '1', price: 18.9 },
      { name: 'Plastic Bag', quantity: '1', price: 0.2 },
    ],
    transactionId: 'txn-lotus-0905',
  },
  {
    id: 'receipt-tonyroma02',
    filename: 'receipt_tonyroma02.jpg',
    displayName: 'IMG_4856.jpg',
    capturedAt: '2025-09-10T07:21:00',
    merchant: "Tony Roma's",
    // Printed subtotal 92.70, SST (6%) 5.56, total 98.26. The four lines sum to
    // 92.60 — 0.10 under.
    //
    // THE ONLY DINE-IN RECEIPT: it prints a table number (12) and a cashier,
    // neither of which the model records, because nothing renders them. The
    // `02` in its filename implies a `receipt_tonyroma01` that was not
    // delivered; there are ten files and ten records, so nothing is missing
    // from this gate's point of view.
    total: 98.26,
    currency: 'MYR',
    lineItems: [
      { name: 'Classic Ribs (Half)', quantity: '1', price: 59.9 },
      { name: 'Mash Potato', quantity: '1', price: 12.9 },
      { name: 'Iced Lemon Tea', quantity: '1', price: 9.9 },
      { name: 'Soup of the Day', quantity: '1', price: 9.9 },
    ],
    transactionId: 'txn-tonyroma-0910',
  },
]
