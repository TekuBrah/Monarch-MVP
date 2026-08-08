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

/** `"15 Dec 2026"` — the form the design writes on the fixed-deposit screen. */
export function formatDate(date: Date): string {
  // en-GB abbreviates September as "Sep"; the design writes "Sept" (format.ts
  // makes the same correction for timestamps — one rule, applied twice).
  return DATE.format(date).replace(/\bSep\b/, 'Sept')
}

/** `"01"`, `"15"` — zero-padded day, for the chart's x axis. */
export function formatDayOfMonth(day: number): string {
  return String(day).padStart(2, '0')
}
