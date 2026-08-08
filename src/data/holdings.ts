import { FIAT_ACCOUNTS } from './accounts'
import type { Holding } from './types'

/**
 * The nine holdings the Finance Overview sums to net worth.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PROVENANCE — what is Figma's and what is not. B2: Figma is the seed, not the
 * spec, and every divergence is recorded at the line it happens.
 *
 *   8 cards read from `Finance_Overview01`, verbatim, in Figma's own order:
 *     Fixed Deposit 150,000.00 · Main 27,978.59 · Stocks 98,476.23 ·
 *     Unit Trust 52,150.00 · PRS 12,000.00 · Gold 2,000.00 ·
 *     Marge's Wallet 102,354.02 · Fun Wallet 5,000.00
 *
 *   1 card AUTHORED — Joint Account RM 15,000.00, from Flow 4's picker. It is
 *   an account the app tells you that you have, so leaving it out of net worth
 *   would be the bigger error. Marked here and in `accounts.ts`.
 *
 * NET WORTH IS RM 464,958.84 AND IS NEVER STORED. It is `sum(holdings)` and
 * nothing else. Figma prints RM 450,958.84 on the same screen as the eight
 * cards, which is exactly RM 14,000.00 short of its OWN cards' sum — the hero
 * figure was not recomputed when the cards changed. That figure is not
 * reproduced. (450,958.84 + 14,000.00 = 464,958.84; the ninth card adds the
 * remaining 15,000.00 against the 14,000.00 discrepancy, so neither number is
 * derivable from the other and only the sum survives.)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ THE BADGE COLOURS ARE CARRIED BUT NOT RENDERED ON THE OVERVIEW.
 *
 * Figma tints each card's badge by category — teal / green / yellow / orange,
 * all resolving to `--brand-{hue}-400`, all legal `IconObjectColor` values. The
 * shipped `CardBalance` hard-codes `<IconObject color="slate">` and exposes no
 * prop for it, so all nine cards render slate badges today.
 *
 * This is NOT worked around here. Overriding the DS component's internals from
 * MVP CSS would violate the "never style a DS component's internals" rule and
 * would break the next time `CardBalance`'s markup changes; rebuilding the card
 * locally would violate rule 1. It is a DS prop gap of exactly the same class as
 * the `onClick` gap that v1.2.0 just closed, and it is reported as such. The
 * measured values stay in the data so the DS session has them, and so the
 * drill-down hero — which composes `IconObject` directly and therefore CAN
 * honour them — is already correct.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ON `invested` AND THE LINE LISTS. The file records no cost basis and no
 * per-line breakdown anywhere; the drill-down's field map requires both. They
 * are AUTHORED, with two constraints held deliberately:
 *
 *   1. Every line list SUMS EXACTLY to the card's authoritative total, so the
 *      authored detail can never contradict the sourced figure.
 *   2. No line carries an authored MOVE. `changePct: 0` renders as `'flat'`,
 *      which is the honest state and the reason the DS ships that direction.
 *      Composition is authored because the screen demands rows; movement is not,
 *      because nothing demands it and inventing it would be inventing product
 *      data (the rule `CryptoHolding.changePct` already set in Flow 1).
 */

/** The Main and Joint balances come from the cash accounts, not restated here. */
function bankBalance(id: string): number {
  const account = FIAT_ACCOUNTS.find((a) => a.id === id)
  if (!account) throw new Error(`No fiat account "${id}"`)
  return account.balance
}

/**
 * B5 — the fixed deposit's term, stated as offsets rather than dates.
 *
 * Figma prints "Start Date 15 Dec 2023", "Maturity Date 15 Dec 2026" and
 * "Remaining Tenure 15 Months". Those three agreed on the day the file was
 * drawn and cannot all be true on any other day. What survives is the SHAPE — a
 * three-year term with fifteen months left — so that is what is stored, and the
 * dates are computed from `TODAY` in `derive.ts`. On a pinned `TODAY` of a 15th
 * of December, this reproduces Figma exactly.
 */
const FD_REMAINING_MONTHS = 15
const FD_TERM_YEARS = 3

export const HOLDINGS: Holding[] = [
  {
    id: 'fd',
    type: 'fixed-deposit',
    category: 'Bank Account',
    name: 'Fixed Deposit',
    icon: 'icon_bank',
    badgeColor: 'teal',
    // AUTHORITATIVE. The principal is derived FROM this, not the reverse — B3.
    currentValue: 150000,
    ratePct: 3.5,
    termYears: FD_TERM_YEARS,
    remainingMonths: FD_REMAINING_MONTHS,
  },
  {
    id: 'main',
    type: 'bank',
    category: 'Bank Account',
    name: 'Main',
    icon: 'icon_bank',
    badgeColor: 'teal',
    balance: bankBalance('main'),
    // AUTHORED — the file shows no account number anywhere.
    accountNo: '•••• 8842',
    bank: 'Monarch Bank',
    accountType: 'Savings Account',
    accountId: 'main',
  },
  {
    // AUTHORED CARD — Flow 4's picker, promoted to net worth. See the header.
    id: 'joint',
    type: 'joint',
    category: 'Bank Account',
    name: 'Joint Account',
    icon: 'icon_bank',
    badgeColor: 'teal',
    balance: bankBalance('joint'),
    accountNo: '•••• 3160',
    bank: 'Monarch Bank',
    accountType: 'Joint Savings',
    accountId: 'joint',
  },
  {
    id: 'stocks',
    type: 'stocks',
    category: 'Investment',
    name: 'Stocks',
    icon: 'icon_stocks',
    badgeColor: 'green',
    invested: 85000,
    linesLabel: 'Stocks held',
    // AUTHORED composition; sums to the sourced RM 98,476.23 exactly.
    lines: [
      { id: 'maybank', name: 'Maybank', symbol: 'MAYBANK', valueMyr: 42180.5, changePct: 0 },
      { id: 'tenaga', name: 'Tenaga Nasional', symbol: 'TENAGA', valueMyr: 31295.73, changePct: 0 },
      { id: 'pbbank', name: 'Public Bank', symbol: 'PBBANK', valueMyr: 25000, changePct: 0 },
    ],
  },
  {
    id: 'unit-trust',
    type: 'unit-trust',
    category: 'Investment',
    name: 'Unit Trust',
    icon: 'icon_stocks',
    badgeColor: 'green',
    invested: 48000,
    linesLabel: 'Funds held',
    // AUTHORED composition; sums to the sourced RM 52,150.00 exactly.
    lines: [
      { id: 'ut-apac', name: 'Asia Pacific Dynamic Income', valueMyr: 28900, changePct: 0 },
      { id: 'ut-islamic', name: 'Islamic Equity Growth', valueMyr: 23250, changePct: 0 },
    ],
  },
  {
    id: 'prs',
    type: 'prs',
    category: 'Investment',
    name: 'PRS',
    icon: 'icon_stocks',
    badgeColor: 'green',
    invested: 11000,
    linesLabel: 'Funds held',
    // AUTHORED composition; sums to the sourced RM 12,000.00 exactly.
    lines: [
      { id: 'prs-growth', name: 'PRS Growth Fund', valueMyr: 7200, changePct: 0 },
      { id: 'prs-conservative', name: 'PRS Conservative Fund', valueMyr: 4800, changePct: 0 },
    ],
  },
  {
    id: 'gold',
    type: 'gold',
    category: 'Assets',
    name: 'Gold',
    icon: 'icon_gold',
    badgeColor: 'yellow',
    // Value is `grams * pricePerGram` and is never stored — 4.00 g at RM 500.00
    // is the sourced RM 2,000.00, split into the two facts a gold holding
    // actually has. AUTHORED split; the product is Figma's.
    grams: 4,
    pricePerGram: 500,
    // The drill-down's third tile is "Purchase value". AUTHORED.
    invested: 1750,
  },
  {
    id: 'wallet-marg',
    type: 'crypto-wallet',
    category: 'Crypto Wallet',
    name: "Marge's Wallet",
    icon: 'icon_crypto',
    badgeColor: 'orange',
    invested: 90000,
    walletId: 'marg',
  },
  {
    id: 'wallet-fun',
    type: 'crypto-wallet',
    category: 'Crypto Wallet',
    name: 'Fun Wallet',
    icon: 'icon_crypto',
    badgeColor: 'orange',
    // Deliberately BELOW its current value — not every holding is a gain, and a
    // screen where all five "Invested" tiles show a profit reads as a mock-up.
    invested: 6000,
    walletId: 'fun',
  },
]
