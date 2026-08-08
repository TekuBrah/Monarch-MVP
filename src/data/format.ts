import type { Amount } from './types'

/**
 * One formatter per shape, used everywhere.
 *
 * The inventory logged four separate formatting defects that all have the same
 * cause — figures formatted by hand, screen by screen: "- RM 250.75.00" (F9 A1),
 * a missing "%" (F3 A16), "RM 5000.00" beside "RM250" in one modal (F11 A6),
 * and "ETH"/"Eth"/"1.0656Eth" (F5 A9). Centralising the rules is the fix, and
 * it is a fix that cannot regress per-screen.
 */

const MYR = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** `27978.59` -> `"RM 27,978.59"`. Always two decimals, always grouped. */
export function formatMyr(amount: Amount): string {
  return `RM ${MYR.format(Math.abs(amount))}`
}

/** `-250.75` -> `"-RM 250.75"`, `1568` -> `"+RM 1,568.00"`. Sign always shown. */
export function formatSignedMyr(amount: Amount): string {
  return `${amount < 0 ? '-' : '+'}${formatMyr(amount)}`
}

/**
 * Splits a balance for the hero treatment Figma uses — a large integer part
 * with the cents set smaller beside it ("RM 27,978" + ".59").
 *
 * Split from ONE formatted string rather than formatted twice, so the two
 * halves cannot disagree.
 */
export function splitMyr(amount: Amount): { main: string; fraction: string } {
  const formatted = formatMyr(amount)
  const dot = formatted.lastIndexOf('.')
  return { main: formatted.slice(0, dot), fraction: formatted.slice(dot) }
}

/** `0.098279`, 6 -> `"0.098279 BTC"`. Precision is the token's, not the caller's. */
export function formatQuantity(
  quantity: number,
  decimals: number,
  symbol: string,
): string {
  const formatted = new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(quantity)
  return `${formatted} ${symbol}`
}

const PCT = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/**
 * `10.2` -> `"10.2%"`, `250.68` -> `"250.68%"`. Up to two decimals, trailing
 * zeros trimmed, which reproduces the design's own varying precision from one
 * rule. The `%` is never the caller's responsibility (F3 A16).
 */
export function formatPercent(pct: number): string {
  return `${PCT.format(Math.abs(pct))}%`
}

/**
 * `-2.49` -> `"-2.49%"`. Used wherever the sign carries meaning that nothing
 * else on the row does.
 *
 * That is the case in the DS `ListItem`'s `crypto` variant: it draws a green
 * up-triangle unconditionally and exposes no prop for direction, so a decline
 * would otherwise render as a rising green row (Figma's own Homepage_Crypto
 * draws `icon_triangle down` for Ethereum, a state the shipped component cannot
 * express). Signing the number is the part the MVP can fix without duplicating
 * a DS component; the triangle and its colour need a DS change. Logged.
 */
export function formatSignedPercent(pct: number): string {
  return `${pct < 0 ? '-' : '+'}${formatPercent(pct)}`
}

/**
 * A trend's label — signed, EXCEPT at zero.
 *
 * `formatSignedPercent(0)` returns "+0%", and a signed zero is a small lie: it
 * claims a direction on a holding that did not move. It never surfaced in Flow 1
 * because the Homepage draws only the top two tokens, both of which move. Flow 7
 * draws every token in a wallet, so Tether and Solana put it on screen — beside
 * a `flat` indicator, which made the contradiction visible.
 *
 * Pairs with `trendOf()`, which returns `'flat'` on exactly the same input.
 */
export function formatTrendPercent(pct: number): string {
  return pct === 0 ? formatPercent(pct) : formatSignedPercent(pct)
}

const DAY = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' })
const TIME = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** `"2025-09-15T22:03:00"` -> `"15 Sept, 22:03"`, matching the design's form. */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  // en-GB abbreviates September as "Sep"; the design writes "Sept".
  const day = DAY.format(date).replace(/\bSep\b/, 'Sept')
  return `${day}, ${TIME.format(date)}`
}
