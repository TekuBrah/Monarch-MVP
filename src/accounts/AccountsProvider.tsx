import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { CRYPTO_HOLDINGS, CRYPTO_WALLETS, FIAT_ACCOUNTS } from '../data/accounts'
import { TRANSACTIONS } from '../data/transactions'
import { cryptoWalletChange, cryptoWalletTotal } from '../data/derive'
import type {
  Amount,
  CryptoHolding,
  CryptoWallet,
  FiatAccount,
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
 * invented: `createContext<T | null>(null)`, a `useMemo`'d value, and a named
 * hook that throws outside the provider. Architecture §2.6 is the reason that
 * matters — screens consume `useAccounts()` and never `useContext(...)`, so if
 * this ever needs to become a store, this file changes and no screen does.
 *
 * NOT PERSISTED (architecture §3.2). Reload returns the seed data.
 *
 * No writers yet — Flow 1 only reads. The mutators W1 needs arrive with the
 * transfer flows; adding them here later widens this value object without
 * touching a single call site.
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
}

const AccountsContext = createContext<AccountsContextValue | null>(null)

export function AccountsProvider({ children }: { children: ReactNode }) {
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
      transactions: TRANSACTIONS,
    }
  }, [])

  return (
    <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>
  )
}

export function useAccounts(): AccountsContextValue {
  const ctx = useContext(AccountsContext)
  if (!ctx) throw new Error('useAccounts must be used inside an AccountsProvider')
  return ctx
}
