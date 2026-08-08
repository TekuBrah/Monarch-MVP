import type { Transaction, TransactionCategory } from './types'

/**
 * The transaction ledger — the data spine (inventory §6d).
 *
 * The file's Budget drilldown nests five Groceries transactions inside the
 * Groceries category, and they sum to EXACTLY RM 1,800.00 — the same figure
 * that appears independently in the Assistant's spending analysis. That is the
 * one chain in the whole design that already computes, so the model is built on
 * it rather than beside it.
 *
 * Two consequences worth stating, because both are checkable:
 *
 * - Sorting this ledger newest-first and taking two rows yields Aeon Big
 *   (15 Sept) and Caring Pharmacy (13 Sept) — exactly the two rows the Homepage
 *   draws. The Homepage's "Transactions" section is a slice of this list, not a
 *   separate hand-authored set.
 * - `categoryTotal('groceries')` computes 1800.00 from the five rows below.
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
 * existing ones; inventing was rejected, so each row below now names the account
 * it was spent from and two are attributed to the Joint account.
 *
 * WHICH TWO, AND WHY THOSE. `Lotus's` and `Giant` — both household groceries,
 * which is what a joint account is for, and both sit in the MIDDLE of the
 * ledger. That last part is deliberate: the Homepage draws the two NEWEST rows
 * (Aeon Big 15 Sept, Caring Pharmacy 13 Sept), so attributing mid-list rows
 * leaves every Flow 1 screen byte-identical.
 *
 * NOTHING ELSE MOVED. No merchant, amount, date, category or receipt flag
 * changed, and `categoryTotal()` does not filter by account — so the Groceries
 * chain still computes RM 1,800.00, which is the one hand-authored total in the
 * whole design that survives being recomputed. That invariant was checked, not
 * assumed.
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

export const TRANSACTIONS: Transaction[] = [
  // --- the five Groceries rows that sum to RM 1,800.00 ------------------
  {
    id: 'txn-aeon-0915',
    accountId: 'main',
    merchant: 'Aeon Big',
    logo: 'aeon',
    method: 'Card Payment',
    amount: -250.75,
    currency: 'MYR',
    occurredAt: '2025-09-15T22:03:00',
    category: 'groceries',
    // The Homepage draws no receipt glyph on this row; the Budget drilldown
    // draws one on all five. Recorded per the Homepage, which is this flow's
    // authority. Receipt link state becomes writable in Flow 9 (W2).
    hasReceipt: false,
  },
  {
    id: 'txn-aeon-0909',
    accountId: 'main',
    merchant: 'Aeon Big',
    logo: 'aeon',
    method: 'Card Payment',
    amount: -420.5,
    currency: 'MYR',
    occurredAt: '2025-09-09T13:45:00',
    category: 'groceries',
    hasReceipt: true,
  },
  {
    id: 'txn-lotus-0905',
    // Attributed to the Joint account — see the header note. Household spend.
    accountId: 'joint',
    merchant: "Lotus's",
    logo: 'lotus_s',
    method: 'Card Payment',
    amount: -310.4,
    currency: 'MYR',
    occurredAt: '2025-09-05T17:12:00',
    category: 'groceries',
    hasReceipt: true,
  },
  {
    id: 'txn-giant-0902',
    // Attributed to the Joint account — see the header note. Household spend.
    accountId: 'joint',
    merchant: 'Giant',
    logo: 'giant',
    method: 'Card Payment',
    amount: -288.6,
    currency: 'MYR',
    occurredAt: '2025-09-02T12:56:00',
    category: 'groceries',
    hasReceipt: true,
  },
  {
    id: 'txn-jaya-0901',
    accountId: 'main',
    merchant: 'Jaya Grocer',
    logo: 'jayagrocer',
    method: 'Card Payment',
    amount: -529.75,
    currency: 'MYR',
    occurredAt: '2025-09-01T14:36:00',
    category: 'groceries',
    hasReceipt: true,
  },

  // --- the Homepage's second row ---------------------------------------
  {
    id: 'txn-caring-0913',
    accountId: 'main',
    merchant: 'Caring Pharmacy',
    logo: 'caring',
    method: 'Card Payment',
    amount: -25.5,
    currency: 'MYR',
    occurredAt: '2025-09-13T18:50:00',
    category: 'healthcare',
    hasReceipt: true,
  },
]
