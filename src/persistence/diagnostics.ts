/**
 * ─────────────── THE PERSISTENCE DIAGNOSTICS LOG — Gate 85 ───────────────
 *
 * Where the storage layer records what it did that a user cannot see: a store
 * it could not open, a write it had to drop, a store it quarantined or reset.
 *
 * IT IS THE ONLY PLACE THESE ARE REPORTED, BY RULING (Gate 85, product
 * decision 2). There is no user-facing notice for a save failure or a reset in
 * this gate — that notice is designed with the settings modal. Nothing here
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

export interface PersistenceEvent {
  /** `Date.now()` when it happened. */
  at: number
  kind: PersistenceEventKind
  detail?: string
}

const LIMIT = 50
const entries: PersistenceEvent[] = []

export function logPersistence(kind: PersistenceEventKind, detail?: string): void {
  entries.push({ at: Date.now(), kind, ...(detail === undefined ? {} : { detail }) })
  if (entries.length > LIMIT) entries.splice(0, entries.length - LIMIT)
}

/** A copy of the log, oldest first. */
export function persistenceLog(): PersistenceEvent[] {
  return entries.slice()
}
