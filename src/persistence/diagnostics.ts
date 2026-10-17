/**
 * ─────────────── THE PERSISTENCE DIAGNOSTICS LOG — Gate 85 ───────────────
 *
 * Where the storage layer records what it did that a user cannot see: a store
 * it could not open, a write it had to drop, a store it quarantined or reset.
 *
 * GATE 85 REPORTED THESE HERE AND NOWHERE ELSE (product decision 2). GATE 87
 * ADDS THE USER-FACING NOTICES: `shell/notices.ts` subscribes below and maps
 * each kind to a notice (or to none — `rehydrated` is ordinary sync). Nothing here
 * writes to the console either: the route walk fails on `console.warn` and
 * `console.error` (`e2e/harness.ts`, `watchForProblems`), and a storage event
 * is not a defect in the page.
 *
 * IN MEMORY, PER TAB, BOUNDED. A ring of the most recent entries, readable by a
 * spec that imports this module in the page (the `ocr.spec.ts` precedent) and,
 * later, by the settings modal.
 *
 * NOT THE `?diag=1` CAPTURE DIAGNOSTICS (`data/captureDiagnostics.ts`). That
 * store describes one OCR read and is gated on a query flag; this one describes
 * the store and is always on, because the failures it records happen on every
 * device, not only on the one someone is debugging.
 */

export type PersistenceEventKind =
  | 'unavailable'
  | 'open-failed'
  | 'open-timeout'
  | 'blocked'
  | 'newer-schema'
  | 'quarantined'
  | 'seed-changed'
  | 'write-failed'
  | 'stale-write-dropped'
  | 'rehydrated'
  | 'reset'
  /** Gate 87: ANOTHER tab reset the demo data, and this tab re-hydrated to it. */
  | 'remote-reset'

export interface PersistenceEvent {
  /** `Date.now()` when it happened. */
  at: number
  kind: PersistenceEventKind
  detail?: string
}

const LIMIT = 50
const entries: PersistenceEvent[] = []
const listeners = new Set<(event: PersistenceEvent) => void>()

export function logPersistence(kind: PersistenceEventKind, detail?: string): void {
  const event: PersistenceEvent = { at: Date.now(), kind, ...(detail === undefined ? {} : { detail }) }
  entries.push(event)
  if (entries.length > LIMIT) entries.splice(0, entries.length - LIMIT)
  for (const listener of listeners) listener(event)
}

/**
 * Gate 87: hear every event as it is logged. Returns the unsubscribe. A
 * listener runs synchronously inside `logPersistence`, so it must not throw and
 * must not write to the store; the notice feed only sets its own state.
 */
export function subscribePersistence(listener: (event: PersistenceEvent) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** A copy of the log, oldest first. */
export function persistenceLog(): PersistenceEvent[] {
  return entries.slice()
}
