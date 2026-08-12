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
/**
 * Each `series` is AUTHORED MOCK DATA — the file records no price history, and
 * the sparklines it draws are one flattened vector shared by all three rows
 * (the C1 note in `HomepageCrypto.tsx`), so no real series was recoverable.
 *
 * Authored against the two invariants stated on `FeaturedCoin.series`: the last
 * point is the quoted price, and `last / first` reproduces `changePct`. Each
 * carries one interior dip so it reads as a price history rather than a ramp.
 * Every row here moves UP, so every line rises — see `TREND_HUE` at the render
 * site for how direction picks the colour.
 */
export const FEATURED_COINS: FeaturedCoin[] = [
  {
    id: 'sol',
    name: 'Solana',
    symbol: 'SOL',
    logo: 'solana',
    priceMyr: 4465,
    changePct: 250.68,
    // 4465 / 1273 = 3.5075 -> +250.75%, against a stated +250.68%.
    series: [1273, 1495, 1402, 1888, 2340, 3105, 4465],
  },
  {
    id: 'ltc',
    name: 'Litecoin',
    symbol: 'LTC',
    logo: 'litecoin',
    priceMyr: 4129,
    changePct: 225.72,
    // 4129 / 1267 = 3.2581 -> +225.81%, against a stated +225.72%.
    series: [1267, 1340, 1288, 1720, 2410, 3180, 4129],
  },
  {
    id: 'matic',
    name: 'Polygon',
    symbol: 'MATIC',
    logo: 'polygon',
    priceMyr: 2004,
    changePct: 175.37,
    // 2004 / 728 = 2.7527 -> +175.27%, against a stated +175.37%.
    series: [728, 690, 812, 1010, 1288, 1640, 2004],
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
