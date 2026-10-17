import type { ToastAppearance } from '@monarch/design-system'
import {
  persistenceLog,
  subscribePersistence,
  type PersistenceEventKind,
} from '../persistence/diagnostics'

/**
 * ─────────────────────── THE APP-LEVEL NOTICES — Gate 87 ───────────────────────
 *
 * Gate 85 logged what the storage layer did and showed the user nothing
 * (product decision 2). This is the user-facing half: one slot, shown by
 * `NoticeHost` in the shell. UNDESIGNED WORK — no Figma frame draws a storage
 * notice; the component is the DS `ToastMobile` the app already uses for its
 * screen toasts, and every copy line below is Claude's.
 *
 * ── ONE SLOT, ORDERED BY SEVERITY ──
 *
 * error > warning > information > success. A notice replaces the one shown only
 * if it is at least as severe, so "changes aren't being saved" can never be
 * covered by a later, milder message. The same kind raised twice is one notice.
 *
 * ── NO TIMER ──
 *
 * Every toast in this app stays until its ✕ (no `setTimeout` in any toast
 * path), and a timer would make a baseline depend on how busy the machine is.
 *
 * ── `role="alert"` ONLY FOR "NOT BEING SAVED" ──
 *
 * Assertive interrupts; it is reserved for the message that means the user is
 * losing work. Everything else is a polite status. Focus never moves.
 *
 * ── THE FEED IS WIRED AT MODULE EVALUATION, ON PURPOSE ──
 *
 * This module is imported (through `AppShell`) by `main.tsx`'s static import
 * chain, which evaluates BEFORE `main.tsx` calls `hydrate()`. So the boot-time
 * events — a store that could not open, a quarantine, a changed seed — are heard
 * live, though React has not rendered yet. The existing log is replayed too, in
 * case anything was logged before this evaluated.
 */

export type NoticeKind =
  | 'not-saving'
  | 'out-of-date'
  | 'replaced'
  | 'unreadable'
  | 'seed-updated'
  | 'remote-reset'
  | 'reset-done'

export interface NoticeSpec {
  title: string
  /** Optional second line, the toast's description slot. */
  body?: string
  appearance: ToastAppearance
  role: 'alert' | 'status'
}

export const NOTICES: Record<NoticeKind, NoticeSpec> = {
  'not-saving': {
    title: "Changes aren't being saved",
    body: "This device can't save right now. What you change will be lost when you close the app.",
    appearance: 'error',
    role: 'alert',
  },
  'out-of-date': {
    title: "This tab can't save",
    body: 'A newer version of the app is open. Reopen the app to keep your changes.',
    appearance: 'warning',
    role: 'alert',
  },
  replaced: {
    title: 'Your last change was replaced',
    body: 'A newer change from another tab was kept instead.',
    appearance: 'warning',
    role: 'status',
  },
  unreadable: {
    title: "Saved data couldn't be read",
    body: 'The app started again from the demo data.',
    appearance: 'warning',
    role: 'status',
  },
  'seed-updated': {
    title: 'The demo data was updated',
    body: 'Your earlier changes were reset to match it.',
    appearance: 'information',
    role: 'status',
  },
  'remote-reset': {
    title: 'The demo data was reset in another tab.',
    appearance: 'information',
    role: 'status',
  },
  'reset-done': {
    title: 'Demo data restored.',
    appearance: 'success',
    role: 'status',
  },
}

const SEVERITY: Record<ToastAppearance, number> = {
  error: 4,
  warning: 3,
  information: 2,
  discovery: 2,
  ai: 2,
  success: 1,
}

/** Which notice a storage event raises, if any. Exhaustive by construction. */
export function noticeForPersistenceEvent(kind: PersistenceEventKind): NoticeKind | null {
  switch (kind) {
    case 'unavailable':
    case 'open-failed':
    case 'open-timeout':
    case 'write-failed':
      return 'not-saving'
    case 'newer-schema':
    case 'blocked':
      return 'out-of-date'
    case 'stale-write-dropped':
      return 'replaced'
    case 'quarantined':
      return 'unreadable'
    case 'seed-changed':
      return 'seed-updated'
    case 'remote-reset':
      return 'remote-reset'
    // Ordinary sync, and the local reset — whose notice the settings screen
    // raises once the write has committed, not when it is logged.
    case 'rehydrated':
    case 'reset':
      return null
  }
}

let current: NoticeKind | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function raiseNotice(kind: NoticeKind): void {
  if (current === kind) return
  if (current !== null) {
    const shown = SEVERITY[NOTICES[current].appearance]
    if (SEVERITY[NOTICES[kind].appearance] < shown) return
  }
  current = kind
  emit()
}

export function dismissNotice(): void {
  if (current === null) return
  current = null
  emit()
}

/** The snapshot for `useSyncExternalStore`. */
export function currentNotice(): NoticeKind | null {
  return current
}

export function subscribeNotices(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function feed(kind: PersistenceEventKind): void {
  const notice = noticeForPersistenceEvent(kind)
  if (notice !== null) raiseNotice(notice)
}

for (const event of persistenceLog()) feed(event.kind)
subscribePersistence((event) => feed(event.kind))
