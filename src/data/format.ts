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

/**
 * A money figure the app did NOT read — Gate 58. An em dash, never "RM 0.00".
 *
 * A receipt printing a confident zero it never read is worse than one printing
 * nothing: it reads as a free bill. `null` is "not read"; the three derivations
 * in `derive.ts` (`receiptTotalRead`, `receiptSubtotalRead`, `receiptTaxRead`)
 * decide when a receipt's figure is `null`, and this only draws the answer.
 */
export const UNREAD_FIGURE = '—'

/** `formatMyr`, or `UNREAD_FIGURE` for a figure that was not read. */
export function formatMyrOrUnread(amount: Amount | null): string {
  return amount === null ? UNREAD_FIGURE : formatMyr(amount)
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

// ------------------------------------------------------------ dates (Gate 90)

/*
 * THIS IS THE ONE MODULE THAT TURNS A DATE INTO A STRING (Gate 90). Until then
 * date formatters lived in three files — here, `today.ts` (`formatDate`,
 * `formatDayMonth`, `formatDayMonthYear`, `formatDayOfMonth`) and
 * `derive.ts` (`monthLabel`) — and none of them could print a year on a row.
 * They were MOVED here, not rewritten: each produces exactly the string it
 * produced before for every input it was given before.
 *
 * THE YEAR RULE — Teku's Decision 14B, 23 Oct 2026. A date shows its year only
 * when the year differs from the REFERENCE YEAR its caller passes: under a month
 * heading, the heading's year; anywhere else, `TODAY.getFullYear()`. No function
 * here reads a clock. The caller names the reference, so the rule is a pure
 * function of the data plus one number, and the harness (which pins `TODAY` to
 * 2026-08-15) prints the same strings on every run.
 *
 * `en-GB` AND AN EXPLICIT LOCALE EVERYWHERE, NOT THE HOST DEFAULT: the app also
 * runs in a real browser whose default is the visitor's, and a month name that
 * changed language per visitor would be a baseline that agrees only by luck.
 */

const DAY = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' })
const DAY_YEAR = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})
const TIME = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/**
 * en-GB abbreviates September as "Sep" in some ICU builds; the design writes
 * "Sept". ICU 78 (Node 24.17) already writes "Sept", so this is a no-op there;
 * Chromium's bundled ICU was not measured, so it stays (Gate 90 F9).
 */
function sept(formatted: string): string {
  return formatted.replace(/\bSep\b/, 'Sept')
}

/**
 * THE PREDICATE — Decision 14B. A date shows its year exactly when its year is
 * not the reference year. Every other function here asks this one question, so
 * the rule lives in one line.
 */
export function showsYear(dateYear: number, referenceYear: number): boolean {
  return dateYear !== referenceYear
}

/** `"15 Sept"` or `"15 Sept 2025"`, by `showsYear`. */
function dayLabel(date: Date, referenceYear: number): string {
  return sept((showsYear(date.getFullYear(), referenceYear) ? DAY_YEAR : DAY).format(date))
}

/**
 * A typed `'YYYY-MM-DD'` (or the first ten characters of a timestamp) as a LOCAL
 * date built from its three numbers, so no timezone can move the day.
 */
function localDay(isoDay: string): Date {
  const [year, month, day] = isoDay.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * `"2025-09-15T22:03:00"` -> `"15 Sept, 22:03"` when `referenceYear` is 2025, and
 * `"15 Sept 2025, 22:03"` when it is anything else. The zone-less string is read
 * as LOCAL wall-clock time, as every reader in this app reads it.
 */
export function formatTimestamp(iso: string, referenceYear: number): string {
  const date = new Date(iso)
  return `${dayLabel(date, referenceYear)}, ${TIME.format(date)}`
}

/**
 * `'2025-09-15'` -> `"15 Sept"` or `"15 Sept 2025"` — a day with no time (a
 * contribution row, a commitment's next due day). Replaces `today.ts`'s
 * `formatDayMonth`, which never showed a year; with the reference year equal to
 * the date's year it prints exactly what that function printed.
 */
export function formatDay(isoDay: string, referenceYear: number): string {
  return dayLabel(localDay(isoDay), referenceYear)
}

/**
 * A period, `"30 Aug - 20 Sept"` — Figma's own form (`1266:14334`): space,
 * hyphen-minus, space. When both ends share a year that is not the reference
 * year it is written ONCE, at the end (`"30 Aug - 20 Sept 2025"`, CLDR's own
 * range shape); ends in different years each carry their own
 * (`"15 Dec 2025 - 15 Jan 2026"`), which is also Android's
 * `DateUtils.formatDateRange` rule.
 */
export function formatPeriod(fromDay: string, toDay: string, referenceYear: number): string {
  const from = localDay(fromDay)
  const to = localDay(toDay)
  if (from.getFullYear() !== to.getFullYear()) {
    return `${sept(DAY_YEAR.format(from))} - ${sept(DAY_YEAR.format(to))}`
  }
  return `${sept(DAY.format(from))} - ${dayLabel(to, referenceYear)}`
}

/**
 * `'2026-10-07'` -> `"07 Oct 2026"` — ALWAYS the year, never a time. Moved from
 * `today.ts` (Gate 80, the commitment detail's two date cards). Gate 90 gives it
 * two more callers that follow what Teku DREW: the receipt card's date (Decision
 * 15A, `Item/receipts` `1266:14286`) and the transaction detail sheet's
 * linked-receipt head (`I1266:14279;1046:11195`), both `"15 Sept 2025"`. It reads
 * only the first ten characters, so a full timestamp may be passed.
 */
export function formatDayMonthYear(isoDay: string): string {
  return sept(DAY_YEAR.format(localDay(isoDay)))
}

/**
 * A receipt's printed date, for the two surfaces that draw it as a day
 * (Decision 15A and R90R-2): `formatDayMonthYear` when the date was read off the
 * paper. A receipt whose date was NOT read carries the moment of capture in
 * `capturedAt` (Gate 51 item T), and keeps exactly what it printed before Gate 90
 * — the capture moment with its time, by the 14B rule (R90R-3). Both surfaces
 * call this one chooser so they cannot disagree.
 */
export function formatReceiptDate(
  capturedAt: string,
  dateWasRead: boolean,
  referenceYear: number,
): string {
  return dateWasRead ? formatDayMonthYear(capturedAt) : formatTimestamp(capturedAt, referenceYear)
}

/** `"15 Dec 2026"` — the fixed-deposit dates. Moved from `today.ts`'s `formatDate`. */
export function formatFullDate(date: Date): string {
  return sept(DAY_YEAR.format(date))
}

/**
 * `2025-09` -> `September 2025` — a month heading, always with its year. Moved
 * from `derive.ts`'s `monthLabel` (Gate 51-B), expression for expression.
 */
export function formatMonthYear(key: string): string {
  return new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
}

/**
 * The year a `YYYY-MM` heading key names — the reference year for every row
 * under that heading. `NaN` for a key that names no month (the Receipts tab's
 * `no-receipt-date` group), so a caller must choose its own reference there.
 */
export function headingYear(key: string): number {
  return /^\d{4}-\d{2}$/.test(key) ? Number(key.slice(0, 4)) : Number.NaN
}

/** `"01"`, `"15"` — zero-padded day, for the chart's x axis. Moved from `today.ts`. */
export function formatDayOfMonth(day: number): string {
  return String(day).padStart(2, '0')
}

/**
 * WHERE A GOAL STANDS AFTER ONE CONTRIBUTION — "Bali Trip: RM 5,165.50 of
 * RM 9,000.00 after this".
 *
 * EXTRACTED AT GATE 81 WHEN THE SECOND CONSUMER ARRIVED, which is the
 * `monthLabel` precedent and not a speculative helper. Gate 79 built this
 * sentence inline in `TransactionDetailSheet`'s movement summary, where it
 * states what a PAST contribution left behind; the Top-Up form previews the
 * same fact about the contribution the user is ABOUT to make. One sentence, one
 * meaning, two tenses that happen to read identically — so two inline copies
 * would have been two places for the wording to drift.
 *
 * IT LIVES HERE RATHER THAN IN `derive.ts` BECAUSE IT FORMATS MONEY. That file
 * is deliberately free of `formatMyr` — it derives figures and leaves their
 * rendering to this one — and a sentence with two currency strings in it is a
 * rendering.
 */
export function goalProgressAfter(
  goalName: string,
  savedAfter: Amount,
  targetAmount: Amount,
): string {
  return `${goalName}: ${formatMyr(savedAfter)} of ${formatMyr(targetAmount)} after this`
}
