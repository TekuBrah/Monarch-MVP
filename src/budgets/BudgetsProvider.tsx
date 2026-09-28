import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { BUDGETS } from '../data/budgets'
import type { Budget } from '../data/types'

/**
 * App-level budgets state — Flow 10 (Gate 67).
 *
 * MOUNTED INSIDE `AccountsProvider`, ABOVE THE ROUTER (`main.tsx`), so a budget
 * outlives a Finance tab switch and Gate 69's drilldown route. It sits inside
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
 * THREE WRITERS, ADDED AT GATE 71 WITH THEIR FIRST CALLERS — `createBudget`
 * (the Budget tab's Create modal), `updateBudget` and `deleteBudget` (the
 * drilldown's Edit modal and its delete confirmation). Each is one functional
 * `setBudgets`, so two writes in one event can never read a stale array. They
 * write records only; nothing here derives a figure, and none of them touches
 * the ledger — a budget is a lens over the transactions, never a writer of them.
 *
 * A CREATED BUDGET IS APPENDED, so the seed keeps its order and a new card
 * lands just above Add New. Its id is `budget-${crypto.randomUUID()}`: the app
 * has no general id generator (`receiptCapture.ts`'s `receipt-capture-N` is a
 * module-private counter for captures), and an id that is unique without a
 * counter survives the persistence layer NP1 defers. `randomUUID` needs a
 * secure context — localhost and the https deploy both are.
 *
 * NOT PERSISTED (NP1). A reload returns `BUDGETS`.
 */
interface BudgetsContextValue {
  budgets: Budget[]
  /** Appends a budget and returns its new id. */
  createBudget: (input: Omit<Budget, 'id'>) => string
  /** Replaces every field but the id. An unknown id is a no-op. */
  updateBudget: (id: string, input: Omit<Budget, 'id'>) => void
  /** Removes the budget. Its transactions are untouched — they were never its. */
  deleteBudget: (id: string) => void
}

const BudgetsContext = createContext<BudgetsContextValue | null>(null)

export function BudgetsProvider({ children }: { children: ReactNode }) {
  const [budgets, setBudgets] = useState<Budget[]>(BUDGETS)

  const createBudget = useCallback((input: Omit<Budget, 'id'>) => {
    const id = `budget-${crypto.randomUUID()}`
    setBudgets((current) => [...current, { id, ...input }])
    return id
  }, [])

  const updateBudget = useCallback((id: string, input: Omit<Budget, 'id'>) => {
    setBudgets((current) => current.map((b) => (b.id === id ? { id, ...input } : b)))
  }, [])

  const deleteBudget = useCallback((id: string) => {
    setBudgets((current) => current.filter((b) => b.id !== id))
  }, [])

  const value = useMemo<BudgetsContextValue>(
    () => ({ budgets, createBudget, updateBudget, deleteBudget }),
    [budgets, createBudget, updateBudget, deleteBudget],
  )
  return <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>
}

export function useBudgets(): BudgetsContextValue {
  const ctx = useContext(BudgetsContext)
  if (!ctx) throw new Error('useBudgets must be used inside a BudgetsProvider')
  return ctx
}
