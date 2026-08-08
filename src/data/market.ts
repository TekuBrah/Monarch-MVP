import type { Amount, FeaturedCoin } from './types'

/**
 * Homepage_Crypto's "Featured Coin" rows — a market watchlist, not holdings.
 * They carry a price and a move, no quantity, and are NOT part of the wallet
 * total.
 *
 * The percentages are opaque input (inventory §6c): a single percentage with no
 * second data point behind it is not computable from anything, so it is
 * recorded as given rather than derived.
 *
 * Figma labels the Litecoin row's ticker "SOL" — copied from the Solana row
 * above it. `LTC` is used here on the same reasoning the inventory applied to
 * F5 A7's invalid hex address: the row already names the coin, and shipping a
 * demonstrably wrong ticker beside it reads as carelessness to exactly the
 * audience this artifact is for. Recorded as a divergence from source.
 */
export const FEATURED_COINS: FeaturedCoin[] = [
  {
    id: 'sol',
    name: 'Solana',
    symbol: 'SOL',
    logo: 'solana',
    priceMyr: 4465,
    changePct: 250.68,
  },
  {
    id: 'ltc',
    name: 'Litecoin',
    symbol: 'LTC',
    logo: 'litecoin',
    priceMyr: 4129,
    changePct: 225.72,
  },
  {
    id: 'matic',
    name: 'Polygon',
    symbol: 'MATIC',
    logo: 'polygon',
    priceMyr: 2004,
    changePct: 175.37,
  },
]

/**
 * A quoted price, by coin id. Throws rather than returning a fallback — a
 * missing price would otherwise silently value a holding at zero.
 *
 * THIS EXISTS TO STOP A LITERAL BEING WRITTEN TWICE. Solana has two roles in
 * this app: a market quote on `Homepage_Crypto`'s Featured Coin list (Flow 1)
 * and, from Flow 7, a holding in Marge's Wallet. Both must read the SAME price,
 * so the holding derives its quantity from this function instead of restating
 * RM 4,465.00 in `accounts.ts`. Update the quote above and the holding's value
 * follows on its own.
 */
export function coinPrice(id: string): Amount {
  const coin = FEATURED_COINS.find((c) => c.id === id)
  if (!coin) throw new Error(`No quoted price for coin "${id}"`)
  return coin.priceMyr
}
