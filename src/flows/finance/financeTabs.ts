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

export function requestedFinanceTab(state: unknown, tabIds: readonly string[]): string | null {
  if (typeof state !== 'object' || state === null) return null
  const requested = (state as Record<string, unknown>)[FINANCE_TAB_STATE_KEY]
  return typeof requested === 'string' && tabIds.includes(requested) ? requested : null
}
