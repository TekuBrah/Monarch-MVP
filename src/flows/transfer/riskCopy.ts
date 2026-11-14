import type { TransferRisk, TransferRiskReason } from '../../data/transferRisk'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE HIGH-RISK ALERT'S WORDS — Gate 103, Decision 36 (honest copy) and R103-11.
 * Pure, so every branch is pinned in Node (`e2e/transfer-risk.spec.ts`).
 *
 * HONEST MEANS TWO THINGS HERE. The alert lists ONLY the reasons that fired, so a
 * young but busy account is never called "low activity"; and nothing claims an
 * "AI risk engine" — Figma's "Flagged as unusual by AI risk engine" describes a
 * rule as a model, so the fixed last line says what it is.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The drawn headline (`1266:14382`), used when the account fires both (a) and (b). */
export const HEADLINE_DRAWN = 'New Account with low activity. Possible Scam.'
export const HEADLINE_NEW_ACCOUNT = 'Newly opened account. Possible Scam.'
export const HEADLINE_LOW_ACTIVITY = 'Account with low activity. Possible Scam.'
export const HEADLINE_LARGE_FIRST = 'Unusually large first payment. Possible Scam.'

/** The Details box's fixed last line. */
export const FLAGGED_BY = "Flagged by Monarch's transfer checks"
/** (c)'s Details line. */
export const LARGER_THAN_BEFORE = "Larger than any payment you've sent before"

/**
 * R103-11: the headline names only what fired. When (c) fires with (a) and/or
 * (b), the account headline wins; the Details box still lists (c).
 */
export function riskHeadline(reasons: readonly TransferRiskReason[]): string {
  const a = reasons.includes('newAccount')
  const b = reasons.includes('lowActivity')
  if (a && b) return HEADLINE_DRAWN
  if (a) return HEADLINE_NEW_ACCOUNT
  if (b) return HEADLINE_LOW_ACTIVITY
  if (reasons.includes('largeFirst')) return HEADLINE_LARGE_FIRST
  throw new Error('riskHeadline: no reason fired, so there is no alert to name')
}

/** (a)'s line. R103-10: 0 days reads "Account opened today". */
export function accountAgeLine(days: number): string {
  if (days === 0) return 'Account opened today'
  if (days === 1) return 'Account opened 1 day ago'
  return `Account opened ${days} days ago`
}

/** (b)'s line, with its singular and zero forms. */
export function transactionCountLine(count: number): string {
  if (count === 0) return 'No transactions recorded'
  if (count === 1) return 'Only 1 transaction recorded'
  return `Only ${count} transactions recorded`
}

/**
 * The Details box, one line per fired reason in the order (a), (b), (c), then the
 * fixed last line. A figure the directory did not give is never printed (R103-2).
 */
export function riskDetailLines(risk: TransferRisk): string[] {
  const lines: string[] = []
  if (risk.reasons.includes('newAccount') && risk.ageDays !== undefined) lines.push(accountAgeLine(risk.ageDays))
  if (risk.reasons.includes('lowActivity') && risk.txCount !== undefined) lines.push(transactionCountLine(risk.txCount))
  if (risk.reasons.includes('largeFirst')) lines.push(LARGER_THAN_BEFORE)
  lines.push(FLAGGED_BY)
  return lines
}
