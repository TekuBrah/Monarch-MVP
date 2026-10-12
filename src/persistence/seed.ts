import { FIAT_ACCOUNTS } from '../data/accounts'
import { BUDGETS } from '../data/budgets'
import { backfillAddedAt, backfillReferences } from '../data/derive'
import { GOALS } from '../data/goals'
import { RECEIPTS } from '../data/receipts'
import { TRANSACTIONS } from '../data/transactions'
import type { Budget, FiatAccount, Goal, Receipt, Transaction } from '../data/types'
import { fingerprintOf } from './schema'

/** Every piece of application data the app persists, in its RUNTIME shape. */
export interface AppState {
  transactions: Transaction[]
  receipts: Receipt[]
  fiatAccounts: FiatAccount[]
  goals: Goal[]
  budgets: Budget[]
}

/**
 * THE STATE A FIRST VISITOR SEES — literally the initialisers the providers
 * held before Gate 85, moved here unchanged so that hydration's fallback and
 * `resetToSeed()` can never drift from each other or from what the harness
 * photographs:
 *
 *   transactions  `backfillReferences(TRANSACTIONS)`   (was AccountsProvider)
 *   receipts      `backfillAddedAt(RECEIPTS)`          (was AccountsProvider)
 *   fiatAccounts  `FIAT_ACCOUNTS`                      (was AccountsProvider)
 *   goals         `GOALS`                              (was AccountsProvider)
 *   budgets       `BUDGETS`                            (was BudgetsProvider)
 *
 * The seed modules stay synchronous exports; the suite imports them at
 * collection time.
 */
export function seedState(): AppState {
  return {
    transactions: backfillReferences(TRANSACTIONS),
    receipts: backfillAddedAt(RECEIPTS),
    fiatAccounts: FIAT_ACCOUNTS,
    goals: GOALS,
    budgets: BUDGETS,
  }
}

let cached: string | undefined

/**
 * ───────────── THE SEED FINGERPRINT — Gate 85, product decision 1 ─────────────
 *
 * A stable hash of the five seeds AS AUTHORED — before the load-time backfills,
 * so no generated or runtime-only field (a backfilled reference, a backfilled
 * `addedAt`) takes part. It is stored with the data; on load, a mismatch means
 * the seed was edited since this device saved, and the stored data is
 * DISCARDED in favour of the new seed. That is intentional, so it is not a
 * quarantine.
 *
 * WHY A FINGERPRINT RATHER THAN A HAND-BUMPED VERSION: nobody has to remember
 * to bump it. This repo's record is full of literals that were right when
 * written and stale a gate later.
 *
 * COMPUTED ONCE PER PAGE and cached — the seeds are constants.
 */
export function seedFingerprint(): string {
  cached ??= fingerprintOf({
    transactions: TRANSACTIONS,
    receipts: RECEIPTS,
    fiatAccounts: FIAT_ACCOUNTS,
    goals: GOALS,
    budgets: BUDGETS,
  })
  return cached
}
