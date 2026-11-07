import type { Amount } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE NETWORK EACH TOKEN IS SENT ON, AND WHAT IT COSTS — Gate 98 (Flow 5;
 * R96-2, Decision 30F, fork F-a / F-b).
 *
 * A COMMITTED TABLE, NOT A LIVE QUOTE. Real apps estimate the network fee live
 * (Coinbase, Luno, MetaMask); Monarch has no backend, so it mimics an estimate
 * and the sheet says so ("Estimated network fee"). Two tiers, as drawn.
 *
 * ETHEREUM IS THE ANCHOR AND IS COPIED FROM THE FRAME (`1266:14399`): Regular
 * RM 4.60 · 60+ Min, Priority RM 24.50 · 30 Minutes. Every other row is that
 * anchor scaled by what the network actually charges, in MYR at the seed's own
 * unit prices (`CRYPTO_UNIT_PRICES`):
 *
 *   - USDT and UNI are ERC-20 tokens ON Ethereum. A token transfer runs the
 *     token contract, about 2.57x the gas of a plain ETH transfer (median
 *     53,966 against 21,000), so both tiers are ETH's x 2.57.
 *   - Bitcoin: a 140 vB transaction at 10 sat/vB (regular) and 30 sat/vB
 *     (priority) is 1,400 and 4,200 sats; at the seed's RM 468,659/BTC that is
 *     RM 6.56 and RM 19.68. Priority is the next block (~10 minutes).
 *   - Solana's base fee is 5,000 lamports and Stellar's 100 stroops — fractions
 *     of a sen. A fee below RM 0.01 is charged as RM 0.01, the smallest amount
 *     this app moves; priority is a small multiple.
 *
 * The NETWORK is what Decision 30F's helper line names. USDT is on ETHEREUM,
 * not Tron: the contacts' drawn addresses are 0x (EVM) addresses, and Tron's
 * begin with T.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type FeeTier = 'regular' | 'priority'

/** Drawn order: Regular first, pre-selected (R96-7). */
export const FEE_TIERS: readonly FeeTier[] = ['regular', 'priority']

export const FEE_TIER_LABELS: Readonly<Record<FeeTier, string>> = {
  regular: 'Regular',
  priority: 'Priority',
}

/** Which address family a network uses — what the To field shows (Decision 33). */
export type AddressFamily = 'evm' | 'bitcoin' | 'solana' | 'stellar'

export interface CryptoNetwork {
  /** Decision 30F names it: "Only send ETH to wallets on the Ethereum network." */
  name: string
  family: AddressFamily
  fees: Readonly<Record<FeeTier, { fee: Amount; wait: string }>>
}

export const CRYPTO_NETWORKS: Readonly<Record<string, CryptoNetwork>> = {
  btc: {
    name: 'Bitcoin',
    family: 'bitcoin',
    fees: { regular: { fee: 6.56, wait: '60+ Min' }, priority: { fee: 19.68, wait: '10 Minutes' } },
  },
  eth: {
    name: 'Ethereum',
    family: 'evm',
    fees: { regular: { fee: 4.6, wait: '60+ Min' }, priority: { fee: 24.5, wait: '30 Minutes' } },
  },
  usdt: {
    name: 'Ethereum',
    family: 'evm',
    fees: { regular: { fee: 11.82, wait: '60+ Min' }, priority: { fee: 62.96, wait: '30 Minutes' } },
  },
  sol: {
    name: 'Solana',
    family: 'solana',
    fees: { regular: { fee: 0.01, wait: 'Under 1 Min' }, priority: { fee: 0.05, wait: 'Seconds' } },
  },
  xlm: {
    name: 'Stellar',
    family: 'stellar',
    fees: { regular: { fee: 0.01, wait: 'Under 1 Min' }, priority: { fee: 0.02, wait: 'Seconds' } },
  },
  uni: {
    name: 'Ethereum',
    family: 'evm',
    fees: { regular: { fee: 11.82, wait: '60+ Min' }, priority: { fee: 62.96, wait: '30 Minutes' } },
  },
}
