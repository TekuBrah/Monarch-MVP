import { TRANSACTION_CATEGORIES } from '../../data/transactions'
import type { Budget, TransactionCategoryId } from '../../data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BUDGET FORM'S DRAFT — Flow 10, Gate 71. Pure: no React, no DOM, no clock.
 *
 * Kept out of the modal component so the rules can be read, and tested, on their
 * own — the same split `ReceiptEditor.tsx` makes with `draftFrom` / `isValid` /
 * `draftToEdit` / `isChanged`, which this file mirrors function for function.
 *
 * THE DRAFT IS STRINGS, because that is what an `<input>` holds. Categories are
 * the one exception: they are ids, kept in `TRANSACTION_CATEGORIES` order
 * whatever order they were ticked in, so a saved budget and its Select's label
 * read the same way every time.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface BudgetDraft {
  name: string
  categories: TransactionCategoryId[]
  /** Plain decimal, no currency symbol and no separators. */
  amount: string
  /** `YYYY-MM-DD` — the shape `<input type="date">` reads and writes. */
  from: string
  to: string
  autoRenew: boolean
}

/** A budget as the form writes it: everything but the id. */
export type BudgetInput = Omit<Budget, 'id'>

/**
 * THE AMOUNT CAP, IN SEN — RM 999,999.99 (review-thread ruling, Gate 71).
 *
 * It is `ProgressRing`'s design ceiling (DS `amountFit.ts`): the ring's centre
 * amount is sized for figures up to six integer digits, and every budget limit
 * is printed there on the drilldown. Compared in whole sen so a float can never
 * miss the boundary.
 */
export const BUDGET_AMOUNT_CAP_SEN = 99_999_999

/** Two decimals at most, digits only — the `ReceiptEditor` TOTAL_PATTERN. */
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

/** An empty draft — the Create form. Nothing is pre-filled; Figma's values are sample data. */
export const EMPTY_BUDGET_DRAFT: BudgetDraft = {
  name: '',
  categories: [],
  amount: '',
  from: '',
  to: '',
  autoRenew: false,
}

/** A stored budget as the form's strings — the Edit form. */
export function draftFromBudget(budget: Budget): BudgetDraft {
  return {
    name: budget.name,
    categories: [...budget.categories],
    amount: budget.limit.toFixed(2),
    from: budget.from,
    to: budget.to,
    autoRenew: budget.autoRenew,
  }
}

/** Categories in the table's own order, so tick order never shows. */
export function orderCategories(ids: readonly TransactionCategoryId[]): TransactionCategoryId[] {
  return TRANSACTION_CATEGORIES.map((c) => c.id).filter((id) => ids.includes(id))
}

/** The Select's value: the ticked categories' labels, comma-joined, as Figma prints it. */
export function categoriesLabel(ids: readonly TransactionCategoryId[]): string {
  return orderCategories(ids)
    .map((id) => TRANSACTION_CATEGORIES.find((c) => c.id === id)!.label)
    .join(', ')
}

/**
 * Which fields are invalid, each on its own terms. One definition, read both by
 * the fields' `isInvalid` and by `isBudgetDraftValid`, so what shows red and
 * what blocks Save can never disagree.
 *
 * THE AMOUNT IS CHECKED AS TEXT FIRST, for `ReceiptEditor`'s reason: `Number`
 * accepts `1e3`, ` 12 ` and `0x10`, and a budget limit is none of those.
 *
 * DATES COMPARE AS STRINGS. `<input type="date">` yields a well-formed
 * `YYYY-MM-DD` or the empty string, and that shape sorts lexically — the same
 * comparison `derive.ts` makes against `occurredAt`, with no `Date` and so no
 * device timezone.
 */
export interface BudgetDraftErrors {
  name: boolean
  categories: boolean
  amount: boolean
  from: boolean
  to: boolean
}

export function budgetDraftErrors(draft: BudgetDraft): BudgetDraftErrors {
  const amount = draft.amount.trim()
  const amountOk =
    AMOUNT_PATTERN.test(amount) &&
    Math.round(Number(amount) * 100) > 0 &&
    Math.round(Number(amount) * 100) <= BUDGET_AMOUNT_CAP_SEN
  return {
    name: draft.name.trim().length === 0,
    categories: draft.categories.length === 0,
    amount: !amountOk,
    from: draft.from.length === 0,
    // To must be on or after From; an empty To is invalid on its own.
    to: draft.to.length === 0 || (draft.from.length > 0 && draft.to < draft.from),
  }
}

export function isBudgetDraftValid(draft: BudgetDraft): boolean {
  return !Object.values(budgetDraftErrors(draft)).some(Boolean)
}

/**
 * The draft as a budget record, minus its id. Only called on a valid draft, so
 * the non-empty category tuple is safe to assert.
 */
export function draftToBudgetInput(draft: BudgetDraft): BudgetInput {
  const [first, ...rest] = orderCategories(draft.categories)
  return {
    name: draft.name.trim(),
    categories: [first, ...rest],
    limit: Math.round(Number(draft.amount.trim()) * 100) / 100,
    from: draft.from,
    to: draft.to,
    autoRenew: draft.autoRenew,
  }
}

/**
 * Whether an Edit draft differs from the stored budget — Save Changes is
 * disabled until it does, `ReceiptEditor.isChanged`'s rule. Compared against
 * `draftFromBudget`, and the keys are read off the value rather than listed, so
 * a field added later cannot report itself unchanged forever.
 */
export function isBudgetDraftChanged(budget: Budget, draft: BudgetDraft): boolean {
  const original = draftFromBudget(budget)
  return (Object.keys(original) as (keyof BudgetDraft)[]).some((k) =>
    k === 'categories'
      ? orderCategories(original.categories).join() !== orderCategories(draft.categories).join()
      : original[k] !== draft[k],
  )
}
