/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE HOME TAB HANDOFF — Gate 87.
 *
 * The Homepage tabs are in-screen `useState` and never reach the URL (Flow 1
 * §3). Tapping the header photo pushes `/settings`; going Back through history
 * REMOUNTS this screen, which would otherwise reset it to Accounts. So, before
 * pushing, the screen REPLACES its own history entry's state with the tab in
 * force, and its `useState` initialiser reads it once at mount — the same seam
 * the Finance tabs use (`flows/finance/financeTabs.ts`, Gate 69).
 *
 * VALIDATED, NOT TRUSTED. Location state is whatever a caller wrote (or the
 * browser restored from history), so an unknown id falls back to the default.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const HOME_TAB_STATE_KEY = 'homeTab'

export function requestedHomeTab(state: unknown, tabIds: readonly string[]): string | null {
  if (typeof state !== 'object' || state === null) return null
  const requested = (state as Record<string, unknown>)[HOME_TAB_STATE_KEY]
  return typeof requested === 'string' && tabIds.includes(requested) ? requested : null
}
