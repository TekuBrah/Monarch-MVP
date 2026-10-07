/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE FINANCE TAB HANDOFF — Gate 69.
 *
 * The Finance tabs are in-screen `useState` and never reach the URL (Flow 7
 * B7). A drill-down that must return to a NON-default tab — the budget
 * drilldown's Back, which lands on Budget rather than Overview — hands the tab
 * id over in ROUTER LOCATION STATE, and `FinanceScreen`'s `useState`
 * initialiser reads it once, at mount. Nothing else about how tabs work
 * changes: the URL stays `/finance`, and switching tabs still writes nothing.
 *
 * VALIDATED, NOT TRUSTED. Location state is whatever a caller wrote (or the
 * browser restored from history), so an unknown id falls back to the caller's
 * default rather than selecting a tab that does not exist.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const FINANCE_TAB_STATE_KEY = 'financeTab'

/**
 * THE "BUDGET DELETED" NOTICE — Gate 71. Delete happens on the drilldown, which
 * then unmounts, so the toast has to be raised by the screen it lands on. The
 * delete navigation carries this flag beside the tab id; the Budget tab reads it
 * once, shows the toast, and REPLACES the location state without it, so a reload
 * or a Back/Forward onto that history entry cannot raise the toast a second time.
 */
export const BUDGET_DELETED_STATE_KEY = 'budgetDeleted'

/**
 * THE SAME ONE-SHOT FLAG FOR A DELETED GOAL. The goal drill-down unmounts as
 * it navigates, so the Plans tab is what raises the toast — exactly the split
 * the budget pair already makes, and for the same reason.
 */
export const GOAL_DELETED_STATE_KEY = 'goalDeleted'

export function goalDeletedNotice(state: unknown): boolean {
  return typeof state === 'object' && state !== null
    ? (state as Record<string, unknown>)[GOAL_DELETED_STATE_KEY] === true
    : false
}

export function budgetDeletedNotice(state: unknown): boolean {
  return typeof state === 'object' && state !== null
    ? (state as Record<string, unknown>)[BUDGET_DELETED_STATE_KEY] === true
    : false
}

export function requestedFinanceTab(state: unknown, tabIds: readonly string[]): string | null {
  if (typeof state !== 'object' || state === null) return null
  const requested = (state as Record<string, unknown>)[FINANCE_TAB_STATE_KEY]
  return typeof requested === 'string' && tabIds.includes(requested) ? requested : null
}
