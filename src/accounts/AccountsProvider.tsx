import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CRYPTO_HOLDINGS, CRYPTO_WALLETS, FIAT_ACCOUNTS } from '../data/accounts'
import { HOLDINGS } from '../data/holdings'
import { RECEIPTS } from '../data/receipts'
import { TRANSACTIONS } from '../data/transactions'
import {
  cryptoWalletChange,
  cryptoWalletTotal,
  netWorth,
  netWorthSeries,
} from '../data/derive'
import type {
  Amount,
  CryptoHolding,
  CryptoWallet,
  FiatAccount,
  Holding,
  Receipt,
  Transaction,
} from '../data/types'

/**
 * App-level accounts state.
 *
 * Mounted above the router because the inventory's §4b W1 makes the balance a
 * genuine cross-flow value: written by the Flow 4/5 transfers and the Flow 11
 * goal top-up, read by the Homepage, Academy, the Assistant and Finance
 * Overview. A route-scoped provider could not express that.
 *
 * Shape and conventions are copied from `theme/ThemeProvider.tsx` rather than
 * invented: `createContext<T | null>(null)` and a named hook that throws outside
 * the provider. Architecture §2.6 is the reason that matters — screens consume
 * `useAccounts()` and never `useContext(...)`, so if this ever needs to become a
 * store, this file changes and no screen does.
 *
 * NOT PERSISTED (architecture §3.2). Reload returns the seed data.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * GATE 48 — THE LEDGER STOPPED BEING FROZEN, AND THAT IS ALL THAT CHANGED.
 *
 * This was a single `useMemo` over imported constants: it re-EXPOSED
 * `TRANSACTIONS` and could not be written to at all. The ledger is now `useState`
 * seeded from the same import, and `addTransaction` appends to it.
 *
 * NO TRANSACTION-CREATION UI WAS BUILT AND NONE SHOULD BE READ INTO THIS. The
 * seam exists because Flow 9's later gates need somewhere for a created row to
 * go, and because building the writer at the same time as its first caller is
 * how a provider ends up with mutators nobody agreed the shape of. `addTransaction`
 * has ZERO call sites today — that is deliberate and is not an oversight.
 *
 * `receipts` IS A PEER COLLECTION IN THIS SAME PROVIDER, NOT A THIRD PROVIDER.
 * Nearly every Flow 9 surface queries BOTH — the Receipts tab pairs a receipt
 * with its transaction, and every ledger row asks whether a receipt exists for
 * it — so a separate `ReceiptsProvider` would mean two contexts read together at
 * essentially every call site, with no boundary between them that means anything.
 * The two collections join on `Transaction.id`; a provider boundary running
 * through the middle of a join is a boundary in the wrong place.
 *
 * IT IS `useState` TOO, AND THAT BET PAID OFF ONE GATE EARLY. The reason given
 * at Gate 48 was that Gate 51 would need to write `Receipt.transactionId`, so
 * seeding it as state then meant that gate would add a mutator rather than
 * restructure the provider. GATE 49 IS THE GATE THAT NEEDED IT: the detail
 * sheet's "Unlink receipt" writes exactly that field, and it cost one
 * `useCallback` and one line in the value object. Nothing else moved.
 *
 * SO THERE ARE NOW FOUR MUTATORS, AND ONE OF THEM HAS NO CALLER. This line
 * said "two" from Gate 49 and was stale from Gate 50, when `addReceipt`
 * arrived; corrected at Gate 51, which adds `deleteReceipt`. `unlinkReceipt`,
 * `addReceipt` and `deleteReceipt` have callers; `addTransaction` still has
 * none and is still the seam described above. Do not sweep it as dead code.
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS STILL NOT SOLVED, stated so it is not mistaken for solved. This is a
 * provider holding two arrays, not a store. There is no reducer, no action
 * vocabulary, no persistence and no undo. When a flow first needs two collections
 * to change together — creating a transaction AND linking a receipt to it in one
 * user action — that is the day this becomes a reducer, and every screen still
 * reads `useAccounts()` so no screen moves.
 */

interface AccountsContextValue {
  fiatAccounts: FiatAccount[]
  /** The account the Homepage's balance card shows. */
  primaryAccount: FiatAccount
  cryptoWallets: CryptoWallet[]
  cryptoHoldings: CryptoHolding[]
  /** DERIVED — `sum(holdings)`, never a stored constant (inventory §6b). */
  cryptoTotal: Amount
  /** DERIVED — from each holding's own move, not transcribed. */
  cryptoChange: { amount: Amount; pct: number }
  transactions: Transaction[]

  // ------------------------------------------------------------- Flow 7
  /**
   * Everything net worth is a sum of — the nine Finance Overview cards.
   *
   * ADDITIVE. Flow 7 widens this value object and changes NO existing field, so
   * not one Flow 1 call site moved. That is the property §2.6 was set up for.
   */
  holdings: Holding[]
  /** DERIVED — `sum(holdings)`. Never stored, never transcribed (B1). */
  netWorth: Amount
  /** DERIVED — month-to-date, one point per elapsed day (B6). */
  netWorthSeries: number[]

  // ------------------------------------------------------------- Flow 9
  /**
   * Captured receipts. A PEER of `transactions`, joined on `Transaction.id`.
   *
   * This is also the sole statement of which transactions have a receipt —
   * `Transaction.hasReceipt` was deleted at Gate 48. Ask
   * `transactionHasReceipt(receipts, id)` in `derive.ts`, never a field on a row.
   */
  receipts: Receipt[]
  /**
   * Append a transaction to the ledger.
   *
   * THE SEAM, WITH NO CALLER. See the block comment above: Flow 9's later gates
   * need this and building it alongside its first consumer is how a provider
   * grows a mutator nobody designed. It appends and does nothing else — no
   * sorting (every consumer already sorts by date), no id generation (the caller
   * owns identity), no validation.
   */
  addTransaction: (transaction: Transaction) => void
  /**
   * Break a receipt’s link to its transaction. Gate 49.
   *
   * THE FIRST MUTATOR IN THIS PROVIDER WITH A CALLER — `addTransaction` above
   * is still the seam it was built as. The detail sheet’s "Unlink receipt"
   * button is the only call site.
   *
   * IT SETS `transactionId` TO `null` AND DELETES NOTHING. The capture still
   * exists, still has its image and its line items, and still appears on the
   * Receipts tab — as the `Linked=No` variant `ReceiptCard` already draws and
   * `Receipt.transactionId` was already typed for. Unlinking is not deleting.
   *
   * THE TRANSACTION’S AMOUNT DOES NOT MOVE, BY RULING. Gate 48 corrected every
   * linked amount to its receipt’s printed total on the argument that the
   * receipt is a photograph of what was actually paid. Unlinking does not
   * un-photograph it, so reverting the amount would be re-asserting a figure
   * that was authored before any receipt existed and is known to be wrong.
   *
   * WHAT DOES CHANGE, AND IT IS THE WHOLE POINT OF THE DERIVED RULING: every
   * surface that asks `transactionHasReceipt(receipts, id)` re-answers on the
   * next render with nothing else updated. The ledger row’s `receipt_long`
   * glyph disappears because the question is asked of this collection, not of
   * a boolean on the row. Under the pre-Gate-48 stored flag this mutator would
   * have had to write BOTH collections and would have been one forgotten line
   * away from a row claiming a receipt that no longer claims it.
   *
   * NOT PERSISTED. Reload restores the seed, like every other write here.
   */
  unlinkReceipt: (receiptId: string) => void
  /**
   * Add a captured receipt to the library. Gate 50.
   *
   * THE SECOND MUTATOR WITH A CALLER, and `addTransaction` above is STILL the
   * zero-caller seam Gate 48 built — do not sweep it as dead code on the
   * strength of this one arriving.
   *
   * LINKAGE IS THE CALLER'S, NOT THIS FUNCTION'S, and that is the capture-context
   * ruling made concrete: a receipt captured FROM a transaction arrives with
   * `transactionId` already set, because it is linked to that transaction by
   * definition; one captured from the Receipts tab arrives with whatever
   * auto-match decided BEFORE it was built (Gate 50-C) — an id when exactly one
   * transaction matched, `null` otherwise. A mutator that tried to decide would
   * have to guess at the context it was called from.
   *
   * SO AUTO-MATCH NEEDED NO LINK MUTATOR. It decides `transactionId` before the
   * receipt exists and this appends it — writing the receipt collection only,
   * never the ledger, which is why an auto-link cannot move an amount.
   *
   * IT APPENDS AND DOES NOTHING ELSE — no sorting (`groupReceiptsByMonth` sorts),
   * no id generation (the caller owns identity), no validation, no de-duplication.
   * The same contract `addTransaction` documents.
   *
   * NOT PERSISTED. Reload restores the seed — and for a captured receipt that is
   * more than a convention: its image is a blob url that does not survive the
   * document that made it. See `Receipt.sourceUrl`.
   */
  addReceipt: (receipt: Receipt) => void
  /**
   * Remove a receipt from the library. Gate 51.
   *
   * THE THIRD MUTATOR WITH A CALLER — the receipt viewer's "Delete receipt",
   * behind a confirmation modal. `addTransaction` is STILL the zero-caller seam.
   *
   * IT WRITES THE RECEIPT COLLECTION AND NOTHING ELSE, EVER — NEVER THE LEDGER.
   * A linked transaction becomes receipt-less through the derived
   * `transactionHasReceipt` and ITS AMOUNT DOES NOT CHANGE. Delete is unlink plus
   * removal, and `unlinkReceipt` above never reverted an amount (Gate 49's
   * ruling, extended).
   *
   * A CAPTURE'S BLOB URL IS REVOKED, because nothing can show it again once its
   * record is gone and leaving it would hold the image for the life of the tab.
   * Seeded receipts carry no `sourceUrl`, so for them this only removes.
   *
   * AUTO-MATCH DOES NOT RE-RUN. It is locked to once, at add time (Gate 50-C),
   * so the transaction a delete frees stays receipt-less until a NEW capture
   * matches it.
   *
   * NOT PERSISTED. Reload restores the seed — the deleted receipt included.
   */
  deleteReceipt: (receiptId: string) => void
}

const AccountsContext = createContext<AccountsContextValue | null>(null)

export function AccountsProvider({ children }: { children: ReactNode }) {
  // SEEDED FROM THE IMPORT, NOT COPYING IT. `useState`'s initial value is read
  // once per mount, so `TRANSACTIONS` and `RECEIPTS` remain the single authored
  // source and this holds the live version of each.
  const [transactions, setTransactions] = useState<Transaction[]>(TRANSACTIONS)
  const [receipts, setReceipts] = useState<Receipt[]>(RECEIPTS)

  // `useCallback` so the context value's identity is stable across renders that
  // do not change the ledger — without it the memo below rebuilds every render
  // and every consumer re-renders with it.
  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions((current) => [...current, transaction])
  }, [])

  // IMMUTABLE UPDATE, AND THE `map` IS NOT STYLE. Mutating the record in place
  // would leave the array identity unchanged, so the `useMemo` below would not
  // rebuild and no consumer would re-render — the write would land in the data
  // and never reach a pixel. Replacing the one record and the array is what
  // makes the ledger row’s glyph disappear.
  // APPEND, SAME SHAPE AS `addTransaction`. The array identity changes, which
  // is what makes the `useMemo` below rebuild and the Receipts tab re-render —
  // see `unlinkReceipt` for the same point made about mutating in place.
  const addReceipt = useCallback((receipt: Receipt) => {
    setReceipts((current) => [...current, receipt])
  }, [])

  const unlinkReceipt = useCallback((receiptId: string) => {
    setReceipts((current) =>
      current.map((r) => (r.id === receiptId ? { ...r, transactionId: null } : r)),
    )
  }, [])

  // REMOVE, AND REVOKE A CAPTURE'S IN-MEMORY IMAGE. `setTransactions` is not
  // touched, and that absence IS the contract — see `deleteReceipt` above.
  // Revoking inside the updater follows `AddReceiptsModal`'s `remove`; StrictMode
  // may run an updater twice, and revoking an already-revoked url is a no-op.
  const deleteReceipt = useCallback((receiptId: string) => {
    setReceipts((current) => {
      const gone = current.find((r) => r.id === receiptId)
      if (gone?.sourceUrl?.startsWith('blob:')) URL.revokeObjectURL(gone.sourceUrl)
      return current.filter((r) => r.id !== receiptId)
    })
  }, [])

  const value = useMemo<AccountsContextValue>(() => {
    const primaryAccount = FIAT_ACCOUNTS[0]
    if (!primaryAccount) throw new Error('No fiat account seeded')

    return {
      fiatAccounts: FIAT_ACCOUNTS,
      primaryAccount,
      cryptoWallets: CRYPTO_WALLETS,
      cryptoHoldings: CRYPTO_HOLDINGS,
      cryptoTotal: cryptoWalletTotal(CRYPTO_HOLDINGS),
      cryptoChange: cryptoWalletChange(CRYPTO_HOLDINGS),
      transactions,
      holdings: HOLDINGS,
      netWorth: netWorth(HOLDINGS, CRYPTO_HOLDINGS),
      netWorthSeries: netWorthSeries(HOLDINGS, CRYPTO_HOLDINGS),
      receipts,
      addTransaction,
      unlinkReceipt,
      addReceipt,
      deleteReceipt,
    }
  }, [transactions, receipts, addTransaction, unlinkReceipt, addReceipt, deleteReceipt])

  return (
    <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>
  )
}

export function useAccounts(): AccountsContextValue {
  const ctx = useContext(AccountsContext)
  if (!ctx) throw new Error('useAccounts must be used inside an AccountsProvider')
  return ctx
}
