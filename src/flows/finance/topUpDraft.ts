import { toSen } from '../../data/derive'
import type { Amount, FiatAccount } from '../../data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TOP-UP FORM'S DRAFT — Flow 11, Gate 81. Pure: no React, no DOM, no clock.
 *
 * Kept out of the modal for `budgetDraft.ts`'s reason, which this file mirrors
 * function for function: the rules can be read and tested on their own, and the
 * ONE definition of "invalid" is read both by the fields' red (through
 * `useTouchedValidation`) and by the save attempt, so what shows red and what
 * blocks the write cannot disagree.
 *
 * THE DRAFT IS STRINGS, because that is what an `<input>` holds — except the
 * source, which is an account id.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface TopUpDraft {
  /** Plain decimal, no currency symbol and no separators. */
  amount: string
  /** A `FiatAccount.id`. Never a goal id — a goal is not a spendable account. */
  sourceId: string
}

/** Two decimals at most, digits only — `budgetDraft`'s `AMOUNT_PATTERN`. */
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

/**
 * An empty draft, pre-selecting a source.
 *
 * ⚠ THE SOURCE DEFAULTS TO THE FIRST CASH ACCOUNT, NOT TO "THE GOAL'S FUNDING
 * ACCOUNT", AND THAT IS A CORRECTION RATHER THAN A SIMPLIFICATION. The Flow 11
 * plan recorded in `CLAUDE.md` says the From field defaults "to the goal's
 * funding account" — and `Goal` CARRIES NO SUCH FIELD (`types.ts`: id, name,
 * targetAmount, savedAmount, targetDate, image, autoSave). Figma's Add-a-Goal
 * form captures a "Funding Source", so the field arrives with THAT form, which
 * is Gate 81-B's. Inventing it here would be a model change with no writer.
 *
 * `primaryAccount` IS ALREADY THE APP'S WORD FOR "the first cash account" —
 * `AccountsProvider` exposes it and throws if there is none — so the default is
 * the app's existing notion rather than a new one.
 */
export function emptyTopUpDraft(sourceId: string): TopUpDraft {
  return { amount: '', sourceId }
}

export interface TopUpDraftErrors {
  amount: boolean
  sourceId: boolean
}

/**
 * Which fields are invalid, each on its own terms.
 *
 * THE AMOUNT IS CHECKED AS TEXT FIRST, for `ReceiptEditor`'s reason: `Number`
 * accepts `1e3`, ` 12 ` and `0x10`, and a top-up is none of those. The pattern
 * also enforces the two-decimal rule, which a numeric check could not.
 *
 * ⚠ `> 0` IS THE ZERO GUARD, AND IT IS DELIBERATELY HERE RATHER THAN IN
 * `transactionDisposition`. That predicate classifies a non-transfer row of
 * exactly 0 as income (`amount >= 0`), and its boundary is aligned ON PURPOSE
 * with `countsToward`'s identical test so the two can never disagree about a
 * zero row — moving it would desynchronise them to fix a value that cannot
 * reach them. A zero top-up is not a classification problem: it is a form
 * accepting nonsense, so the guard belongs where the nonsense enters. (It could
 * not reach the income branch in any case — every row this writer creates is
 * `kind: 'transfer'`, which `transactionDisposition` tests FIRST.) What a zero
 * would actually produce is a ledger row of RM 0.00 that debits nothing and
 * credits nothing while appearing in the ledger and in Recent Contributions.
 *
 * THE CAP IS THE SOURCE ACCOUNT'S OWN BALANCE, compared in whole sen. There is
 * no overdraft in this app and no credit facility, so a top-up larger than the
 * account holding it is not a thing the data can represent. A source that does
 * not resolve is invalid rather than uncapped — failing open here would let an
 * unknown id through the one check that bounds the write.
 */
export function topUpDraftErrors(
  draft: TopUpDraft,
  accounts: FiatAccount[],
): TopUpDraftErrors {
  const source = accounts.find((a) => a.id === draft.sourceId)
  const amount = draft.amount.trim()
  const sen = Math.round(Number(amount) * 100)
  const amountOk =
    AMOUNT_PATTERN.test(amount) &&
    sen > 0 &&
    source !== undefined &&
    sen <= toSen(source.balance)
  return { amount: !amountOk, sourceId: source === undefined }
}

export function isTopUpDraftValid(draft: TopUpDraft, accounts: FiatAccount[]): boolean {
  return !Object.values(topUpDraftErrors(draft, accounts)).some(Boolean)
}

/** The draft's amount as a positive `Amount`. Call only on a valid draft. */
export function topUpAmount(draft: TopUpDraft): Amount {
  return Math.round(Number(draft.amount.trim()) * 100) / 100
}
