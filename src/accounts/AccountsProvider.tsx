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
 * IT IS `useState` TOO, AND FOR ONE STATED REASON. Gate 51 unlinks and relinks a
 * receipt, which writes `Receipt.transactionId`. Seeding it as state now costs
 * nothing and means that gate adds a mutator rather than restructuring the
 * provider — the same argument as `addTransaction`, and it is why no receipt
 * mutator is written here either.
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
}

const AccountsContext = createContext<AccountsContextValue | null>(null)

export function AccountsProvider({ children }: { children: ReactNode }) {
  // SEEDED FROM THE IMPORT, NOT COPYING IT. `useState`'s initial value is read
  // once per mount, so `TRANSACTIONS` and `RECEIPTS` remain the single authored
  // source and this holds the live version of each.
  const [transactions, setTransactions] = useState<Transaction[]>(TRANSACTIONS)
  const [receipts] = useState<Receipt[]>(RECEIPTS)

  // `useCallback` so the context value's identity is stable across renders that
  // do not change the ledger — without it the memo below rebuilds every render
  // and every consumer re-renders with it.
  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions((current) => [...current, transaction])
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
    }
  }, [transactions, receipts, addTransaction])

  return (
    <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>
  )
}

export function useAccounts(): AccountsContextValue {
  const ctx = useContext(AccountsContext)
  if (!ctx) throw new Error('useAccounts must be used inside an AccountsProvider')
  return ctx
}
