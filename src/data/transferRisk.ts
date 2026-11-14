import { lookupAccount, toSen } from './derive'
import type { DirectoryAccount, Recipient, Transaction, UserRecipient } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE HIGH-RISK TRANSFER RULE — Gate 103 (Flow 6 part 2), Teku's Decision 35.
 *
 * A bank send is FLAGGED when it is the FIRST payment to a recipient THE USER
 * ADDED (it is in `userRecipients`, and no ledger row yet carries its
 * `recipientId`) AND at least one of:
 *
 *   (a) `newAccount`  — the directory's `accountAgeDays` is under 30;
 *   (b) `lowActivity` — the directory's `transactionCount` is under 10;
 *   (c) `largeFirst`  — the amount is STRICTLY larger than every previous
 *                       outflow to another party.
 *
 * The five seeded `RECIPIENTS` never flag: they are not in `userRecipients`.
 * Crypto sends never reach this (R100-8): only the bank amount screen calls it.
 *
 * PURE, AND IT READS LIVE DATA THE CALLER PASSES. No clock, no stored field, no
 * writer: the alert only reads and routes. A rule that wrote would need a schema
 * change, and this gate has none.
 *
 * (c), R101-13: every row with `amount < 0` and no `goalId`, by MYR magnitude,
 * crypto included (a crypto send is money that left the user). Credits never
 * count; a savings contribution moves money between the user's own accounts, so
 * it is not a payment "to another party". Over the seed today the largest is
 * RM 2,647.67 (`txn-ikea-0815`). An empty ledger gives 0, so any first payment
 * there fires (c).
 *
 * R103-2: a user-added recipient the directory does not know (unreachable today:
 * `recipientProblem` refuses a save the lookup cannot answer) is judged on (c)
 * alone, and `ageDays` / `txCount` are left undefined so the copy never prints a
 * figure it does not have.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type TransferRiskReason = 'newAccount' | 'lowActivity' | 'largeFirst'

export interface TransferRisk {
  flagged: boolean
  /** Only the reasons that fired, always in the order (a), (b), (c). */
  reasons: TransferRiskReason[]
  /** The directory's answer, when it has one. */
  ageDays?: number
  txCount?: number
}

/** (a): an account opened fewer than this many days ago. 30 itself does not fire. */
export const NEW_ACCOUNT_DAYS = 30
/** (b): fewer than this many recorded transactions. 10 itself does not fire. */
export const LOW_ACTIVITY_COUNT = 10

const NOT_FLAGGED: TransferRisk = { flagged: false, reasons: [] }

/** (c)'s threshold, in sen: the largest previous outflow to another party, or 0. */
export function largestPreviousOutflowSen(transactions: readonly Transaction[]): number {
  let max = 0
  for (const t of transactions) {
    if (t.amount < 0 && t.goalId === undefined) max = Math.max(max, toSen(-t.amount))
  }
  return max
}

export function transferRisk(input: {
  recipient: Recipient
  userRecipients: readonly UserRecipient[]
  directory: readonly DirectoryAccount[]
  transactions: readonly Transaction[]
  /** The amount being sent, in sen. */
  amountSen: number
}): TransferRisk {
  const { recipient, userRecipients, directory, transactions, amountSen } = input
  if (!userRecipients.some((r) => r.id === recipient.id)) return NOT_FLAGGED
  if (transactions.some((t) => t.recipientId === recipient.id)) return NOT_FLAGGED

  const account = lookupAccount(directory, recipient.bankCode, recipient.accountNo)
  const reasons: TransferRiskReason[] = []
  if (account && account.accountAgeDays < NEW_ACCOUNT_DAYS) reasons.push('newAccount')
  if (account && account.transactionCount < LOW_ACTIVITY_COUNT) reasons.push('lowActivity')
  if (amountSen > largestPreviousOutflowSen(transactions)) reasons.push('largeFirst')

  if (reasons.length === 0) return NOT_FLAGGED
  return {
    flagged: true,
    reasons,
    ageDays: account?.accountAgeDays,
    txCount: account?.transactionCount,
  }
}
