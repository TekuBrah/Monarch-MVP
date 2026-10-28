/** Gate 92 — the picker's tab handed over in router location state (the Home crypto card's Send). */
export const TRANSFER_TAB_STATE_KEY = 'transferTab'

export function requestedTransferTab(state: unknown, tabIds: readonly string[]): string | null {
  if (typeof state !== 'object' || state === null) return null
  const requested = (state as Record<string, unknown>)[TRANSFER_TAB_STATE_KEY]
  return typeof requested === 'string' && tabIds.includes(requested) ? requested : null
}
