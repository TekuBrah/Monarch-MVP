import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE UNSENT SEND — Gate 93 (R93-7, DESIGN D6).
 *
 * The To field's chevron goes back to the recipient picker, and a new tap there
 * must come back to the amount the user had typed. So the draft cannot live in
 * the amount screen's own `useState`: that screen unmounts on the way to the
 * picker. It lives here, mounted once in `AppShell`, and it is CLEARED THE
 * MOMENT THE PATH LEAVES `/transfer*` — so a user who walks away and comes back
 * starts empty, and nothing about a half-typed send outlives the flow.
 *
 * NOT STORED, AND THAT IS NOT NP1 BEING SKIPPED. It is an unsent draft, not a
 * record: a reload drops it, exactly as a reload drops a half-filled form.
 *
 * `fromId` IS `null` UNTIL THE USER PICKS AN ACCOUNT, and the screen reads
 * `null` as "the primary account". Seeding it here would mean this provider
 * knowing the account list.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface TransferDraft {
  /** What the amount field keeps of what was typed (`sendAmountInput`). */
  amount: string
  fromId: string | null
}

interface TransferDraftContextValue extends TransferDraft {
  setAmount: (amount: string) => void
  setFromId: (fromId: string) => void
  /** Empty the draft — after a send, so Back cannot offer the same money twice. */
  clear: () => void
}

const EMPTY: TransferDraft = { amount: '', fromId: null }

const TransferDraftContext = createContext<TransferDraftContextValue | null>(null)

export function isTransferPath(pathname: string): boolean {
  return pathname === '/transfer' || pathname.startsWith('/transfer/')
}

export function TransferDraftProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [draft, setDraft] = useState<TransferDraft>(EMPTY)

  useEffect(() => {
    if (!isTransferPath(pathname)) setDraft((current) => (current === EMPTY ? current : EMPTY))
  }, [pathname])

  const setAmount = useCallback((amount: string) => setDraft((d) => ({ ...d, amount })), [])
  const setFromId = useCallback((fromId: string) => setDraft((d) => ({ ...d, fromId })), [])
  const clear = useCallback(() => setDraft(EMPTY), [])

  const value = useMemo(
    () => ({ ...draft, setAmount, setFromId, clear }),
    [draft, setAmount, setFromId, clear],
  )
  return <TransferDraftContext.Provider value={value}>{children}</TransferDraftContext.Provider>
}

export function useTransferDraft(): TransferDraftContextValue {
  const ctx = useContext(TransferDraftContext)
  if (!ctx) throw new Error('useTransferDraft must be used inside a TransferDraftProvider')
  return ctx
}
