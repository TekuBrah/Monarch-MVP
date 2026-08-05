import type { CryptoHolding, CryptoWallet, FiatAccount } from './types'

/**
 * Seed accounts.
 *
 * In-memory only, resets on reload (architecture §3.2). Nothing here is
 * persisted, and nothing here is a total — totals are derived in `derive.ts`.
 */

export const FIAT_ACCOUNTS: FiatAccount[] = [
  {
    id: 'main',
    group: 'Account',
    name: 'Main',
    logo: 'flag',
    currency: 'MYR',
    // AUTHORITATIVE (inventory §6a). Reconciles against F4, F6 and F7.
    balance: 27978.59,
  },
]

export const CRYPTO_WALLETS: CryptoWallet[] = [
  { id: 'marg', name: "Marge's Crypto", logo: 'general' },
  { id: 'fun', name: 'Fun Tokens', logo: 'general' },
]

/**
 * The five holdings the file records, read from `Homepage_transfer_Crypto_select
 * token` (`1266:14396`) where quantity and fiat value both appear.
 *
 * These sum to RM 97,236.32. The Homepage displays RM 102,354.02, which the
 * inventory established as authoritative because it is the only figure the
 * transfer arithmetic reconciles against. The RM 5,117.70 gap is exactly the
 * value carried by BOTH Stellar and Uniswap, which is what makes a
 * copy-paste-over-a-sixth-holding the likely cause.
 *
 * The gap is NOT padded here. `derive.ts` computes the wallet total as
 * `sum(holdings)` and the shortfall surfaces on the screen — which is the point
 * of the derive rule (inventory §6). Adding a phantom holding to make the total
 * match would be reproducing the defect, not fixing it.
 */
export const CRYPTO_HOLDINGS: CryptoHolding[] = [
  {
    id: 'btc',
    walletId: 'marg',
    name: 'Bitcoin',
    symbol: 'BTC',
    logo: 'bitcoin',
    quantity: 0.098279,
    quantityDecimals: 6,
    valueMyr: 46059.31,
    changePct: 10.2,
  },
  {
    id: 'eth',
    walletId: 'marg',
    name: 'Ethereum',
    symbol: 'ETH',
    logo: 'ethereum',
    quantity: 1.3786,
    quantityDecimals: 4,
    valueMyr: 25588.51,
    changePct: -2.49,
  },
  {
    id: 'usdt',
    walletId: 'marg',
    name: 'Tether',
    symbol: 'USDT',
    logo: 'tether',
    quantity: 3630,
    quantityDecimals: 2,
    valueMyr: 15353.1,
    // No move recorded in the file for this token — see CryptoHolding.changePct.
    changePct: 0,
  },
  {
    id: 'xlm',
    walletId: 'fun',
    name: 'Stellar',
    symbol: 'XLM',
    logo: 'stellar',
    quantity: 3372,
    quantityDecimals: 0,
    valueMyr: 5117.7,
    changePct: 0,
  },
  {
    id: 'uni',
    walletId: 'fun',
    name: 'Uniswap',
    symbol: 'UNI',
    logo: 'uniswap',
    quantity: 77.15,
    quantityDecimals: 2,
    valueMyr: 5117.7,
    changePct: 0,
  },
]
