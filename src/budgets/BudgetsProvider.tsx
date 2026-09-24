import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { BUDGETS } from '../data/budgets'
import type { Budget } from '../data/types'

/**
 * App-level budgets state — Flow 10 (Gate 67).
 *
 * MOUNTED INSIDE `AccountsProvider`, ABOVE THE ROUTER (`main.tsx`), so a budget
 * outlives a Finance tab switch and Gate 68's drilldown route. It sits inside
 * rather than beside `AccountsProvider` because every budget figure is derived
 * from the ledger that provider owns.
 *
 * The shape is `AccountsProvider`'s: `createContext<T | null>(null)` and a named
 * hook that throws outside the provider, so screens call `useBudgets()` and
 * never `useContext(...)`.
 *
 * IT HOLDS ONLY THE RECORDS. Spent, available and percent-left are derived at
 * the call site from `(budget, transactions)` in `derive.ts` and never stored.
 *
 * NO WRITERS YET, DELIBERATELY. Gate 69 adds create, edit and delete alongside
 * their first caller. An unused writer is dead code a reviewer has to reason
 * about. It is `useState` anyway, so that gate adds functions and does not
 * restructure this file.
 *
 * NOT PERSISTED (NP1). A reload returns `BUDGETS`.
 */
interface BudgetsContextValue {
  budgets: Budget[]
}

const BudgetsContext = createContext<BudgetsContextValue | null>(null)

export function BudgetsProvider({ children }: { children: ReactNode }) {
  const [budgets] = useState<Budget[]>(BUDGETS)
  const value = useMemo<BudgetsContextValue>(() => ({ budgets }), [budgets])
  return <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>
}

export function useBudgets(): BudgetsContextValue {
  const ctx = useContext(BudgetsContext)
  if (!ctx) throw new Error('useBudgets must be used inside a BudgetsProvider')
  return ctx
}
