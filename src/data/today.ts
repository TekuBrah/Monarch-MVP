/**
 * The app's notion of "now", and every date operation derived from it.
 *
 * B5 — NO DATE IS TRANSCRIBED. Figma writes fixed dates ("15 Dec 2023",
 * "15 Dec 2026", "15 Months") that were true on the day the file was drawn and
 * are wrong on every day after it. A demo whose fixed deposit matured in the
 * past reads as broken, so every date in this app is an OFFSET from `TODAY` and
 * recomputes on each load.
 *
 * PINNING IS A ONE-LINE CHANGE, deliberately — replace the expression below
 * with `new Date('2026-08-08T00:00:00')` and the whole app freezes to that day.
 * That is the property B5 asks for: reproducible screenshots without a second
 * date system.
 *
 * ────────── ONE EXEMPTION: DATES THE USER TYPED (Gate 67, Flow 10) ──────────
 *
 * A budget's `from` and `to` are NOT offsets from `TODAY`. They are dates a
 * person entered, the same kind of fact as a receipt's printed date, and they
 * mean the same day whatever day the app is opened on. So the seeded budgets
 * carry literal `'YYYY-MM-DD'` strings (`data/budgets.ts`), and B5 does not
 * apply to them. Everything the app COMPUTES about "now" still derives from
 * `TODAY`.
 *
 * UNDER THE PLAYWRIGHT HARNESS `TODAY` IS 2026-08-15, 09:41 LOCAL. `gotoRoute`
 * calls `page.clock.setFixedTime(PINNED_NOW)` BEFORE navigation, `PINNED_NOW` is
 * `2026-08-15T01:41:00.000Z`, and the config pins `Asia/Kuala_Lumpur` (UTC+8).
 * The expression below is unchanged; the harness pins the clock underneath it.
 *
 *   export const TODAY = new Date('2026-08-08T00:00:00')   // pinned
 */
export const TODAY = new Date()

/** Whole-month offset. Clamps the day when the target month is shorter. */
export function addMonths(date: Date, months: number): Date {
  const out = new Date(date.getTime())
  const day = out.getDate()
  out.setDate(1)
  out.setMonth(out.getMonth() + months)
  out.setDate(Math.min(day, daysInMonth(out)))
  return out
}

/** Whole-year offset, via `addMonths` so leap-day clamping is written once. */
export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12)
}

export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/**
 * Whole months from `from` to `to`, rounded down.
 *
 * "Remaining tenure" is a countdown, and a countdown rounds down: 14 months and
 * 29 days is still "14 Months" left, never 15.
 */
export function monthsBetween(from: Date, to: Date): number {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  return to.getDate() < from.getDate() ? months - 1 : months
}

/**
 * Fractional years between two dates.
 *
 * 365.25 rather than 365 — an interest calculation that ignores leap years
 * drifts by a day every four years, and this one runs against a live clock.
 */
export function yearsBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  return (to.getTime() - from.getTime()) / MS_PER_DAY / 365.25
}

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/**
 * en-GB abbreviates September as "Sep"; the design writes "Sept" (format.ts
 * makes the same correction for timestamps). Written once here and used by both
 * date formatters below.
 */
function sept(formatted: string): string {
  return formatted.replace(/\bSep\b/, 'Sept')
}

/** `"15 Dec 2026"` — the form the design writes on the fixed-deposit screen. */
export function formatDate(date: Date): string {
  return sept(DATE.format(date))
}

const DAY_MONTH = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' })

/**
 * `'2025-08-30'` -> `"30 Aug"`, `'2025-09-20'` -> `"20 Sept"` — the two ends of
 * a budget's period (Figma `1266:14334`). It takes the typed `'YYYY-MM-DD'`
 * string and builds a LOCAL date from its three numbers, so no timezone can
 * move the day. The day has two digits, matching the app's other dates
 * ("04 Sept"). Figma draws only two-digit days, so it does not settle this.
 */
export function formatDayMonth(isoDay: string): string {
  const [year, month, day] = isoDay.split('-').map(Number)
  return sept(DAY_MONTH.format(new Date(year, month - 1, day)))
}

/** `"01"`, `"15"` — zero-padded day, for the chart's x axis. */
export function formatDayOfMonth(day: number): string {
  return String(day).padStart(2, '0')
}
