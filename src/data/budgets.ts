import type { Budget } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SEEDED BUDGETS — Flow 10, Decision 4 (Gate 67).
 *
 * Figma supplies the LIMITS and the PERIOD (`Finance_Budget`, `1266:14334`).
 * The CATEGORIES are the review thread's choice, delegated by Teku: Figma draws
 * no category list for either card.
 *
 * NOTHING ABOUT SPENT IS SEEDED (Decision 2A). Spent, available and "left to
 * spend" are pure functions of a budget and the ledger (`derive.ts`), so they
 * cannot drift from the transactions they describe. Figma's printed figures
 * (RM 700 / RM 6,800, 18%) come from no ledger and are not reproduced.
 *
 * `from` AND `to` ARE EXEMPT FROM B5. They are dates the user TYPED, like a
 * receipt's printed date, not offsets from `TODAY`. See `today.ts`.
 *
 * NP1 — PLAIN SERIALISABLE DATA ONLY. ISO date strings, numbers, strings,
 * booleans and string arrays: no `Date`, no function, no class instance. So
 * persistence, when it comes after all flows, is a storage adapter under
 * `BudgetsProvider` and not a rewrite.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const BUDGETS: Budget[] = [
  {
    id: 'budget-monthly',
    name: 'Monthly Budget',
    categories: ['bills', 'groceries', 'dining', 'healthcare', 'transport', 'shopping', 'others'],
    limit: 7500,
    from: '2025-08-30',
    to: '2025-09-20',
    autoRenew: false,
  },
  {
    id: 'budget-entertainment',
    name: 'Entertainment',
    categories: ['dining'],
    limit: 1000,
    from: '2025-08-30',
    to: '2025-09-20',
    autoRenew: false,
  },
]
