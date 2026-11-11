import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { FeeTier } from '../../data/cryptoNetworks'

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
  /** Gate 98 (Flow 5, R96-9): the crypto send in progress. Its own part, so a
      bank amount and a crypto amount never leak into each other. */
  crypto: CryptoDraft
  /** Gate 101 (Flow 6): the bank recipient being added, across its three steps. */
  newRecipient: NewRecipientDraft
}

/**
 * GATE 101 — WHAT THE NEW-RECIPIENT STEPS HAVE CHOSEN SO FAR. Its own part, so it
 * never leaks into a send's amount. Cleared with the rest when the path leaves
 * `/transfer*`, and on its own after a save, so Back can never re-offer it.
 *
 * The three undrawn choices start at Figma's drawn values (`1266:14387`):
 * Current/Savings, DuitNow, Fund Transfer. Ids, not labels (`newRecipientOptions.ts`).
 */
export interface NewRecipientDraft {
  /** Set on Select recipient bank. `null` until then. */
  bankCode: string | null
  /** What the field keeps of what was typed (`accountNumberInput`). */
  accountNo: string
  accountType: string
  transferType: string
  reference: string
  otherDetails: string
}

export interface CryptoDraft {
  /** Set by Select Token's Next. The amount screen's URL names only the token. */
  recipientId: string | null
  /** The token last chosen for that contact, so Select Token re-opens on it. */
  tokenId: string | null
  /** In RM (R96-5), as `sendAmountInput` keeps it. */
  amount: string
  /** Committed by the Network Fee sheet's OK; Regular until then (R96-7). */
  tier: FeeTier
}

interface TransferDraftContextValue extends TransferDraft {
  setAmount: (amount: string) => void
  setFromId: (fromId: string) => void
  /** Empty the draft — after a send, so Back cannot offer the same money twice. */
  clear: () => void
  /** Gate 98. A DIFFERENT contact starts a fresh crypto send; the same one keeps its amount. */
  setCryptoSend: (recipientId: string, tokenId: string) => void
  setCryptoAmount: (amount: string) => void
  setCryptoTier: (tier: FeeTier) => void
  /** Gate 101: merge into the new-recipient draft. */
  setNewRecipient: (patch: Partial<NewRecipientDraft>) => void
  /** Gate 101: empty it — after a save. */
  clearNewRecipient: () => void
}

const EMPTY_CRYPTO: CryptoDraft = { recipientId: null, tokenId: null, amount: '', tier: 'regular' }
const EMPTY_NEW_RECIPIENT: NewRecipientDraft = {
  bankCode: null,
  accountNo: '',
  accountType: 'current-savings',
  transferType: 'duitnow',
  reference: 'fund-transfer',
  otherDetails: '',
}
const EMPTY: TransferDraft = {
  amount: '',
  fromId: null,
  crypto: EMPTY_CRYPTO,
  newRecipient: EMPTY_NEW_RECIPIENT,
}

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
  const setCryptoSend = useCallback(
    (recipientId: string, tokenId: string) =>
      setDraft((d) => ({
        ...d,
        crypto:
          d.crypto.recipientId === recipientId
            ? { ...d.crypto, tokenId }
            : { ...EMPTY_CRYPTO, recipientId, tokenId },
      })),
    [],
  )
  const setCryptoAmount = useCallback(
    (amount: string) => setDraft((d) => ({ ...d, crypto: { ...d.crypto, amount } })),
    [],
  )
  const setCryptoTier = useCallback(
    (tier: FeeTier) => setDraft((d) => ({ ...d, crypto: { ...d.crypto, tier } })),
    [],
  )

  const setNewRecipient = useCallback(
    (patch: Partial<NewRecipientDraft>) =>
      setDraft((d) => ({ ...d, newRecipient: { ...d.newRecipient, ...patch } })),
    [],
  )
  const clearNewRecipient = useCallback(
    () => setDraft((d) => ({ ...d, newRecipient: EMPTY_NEW_RECIPIENT })),
    [],
  )

  const value = useMemo(
    () => ({
      ...draft,
      setAmount,
      setFromId,
      clear,
      setCryptoSend,
      setCryptoAmount,
      setCryptoTier,
      setNewRecipient,
      clearNewRecipient,
    }),
    [draft, setAmount, setFromId, clear, setCryptoSend, setCryptoAmount, setCryptoTier, setNewRecipient, clearNewRecipient],
  )
  return <TransferDraftContext.Provider value={value}>{children}</TransferDraftContext.Provider>
}

export function useTransferDraft(): TransferDraftContextValue {
  const ctx = useContext(TransferDraftContext)
  if (!ctx) throw new Error('useTransferDraft must be used inside a TransferDraftProvider')
  return ctx
}
