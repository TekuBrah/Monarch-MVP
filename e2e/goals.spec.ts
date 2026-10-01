import { expect, test } from '@playwright/test'

import { COMMITMENTS } from '../src/data/commitments'
import { goalContributions } from '../src/data/derive'
import { GOALS } from '../src/data/goals'
import { TRANSACTIONS } from '../src/data/transactions'
import type { Goal } from '../src/data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FLOW 11 — THE GOAL AND COMMITMENT SEEDS (Gate 75).
 *
 * A PURE IMPORT, NO PAGE, following `budgets.spec.ts` and `parse-receipt.spec.ts`.
 * NOTHING RENDERS EITHER COLLECTION YET — the Plans tab arrives at Gate 76 — so
 * there is no browser test here and no baseline.
 *
 * WHAT IT IS FOR: the seeds carry authored detail beside transcribed totals, and
 * the constraint `holdings.ts` states for its line lists is that authored detail
 * must never contradict the sourced figure.
 *
 * GATE 77 MOVED THE CONTRIBUTIONS INTO THE LEDGER, so the three tests below that
 * used to read `goal.contributions` now read `goalContributions(TRANSACTIONS,
 * id)`. They were REWRITTEN IN PLACE rather than added beside, because leaving
 * both would have left the suite asserting an embedded array that no longer
 * exists and a ledger join that does.
 *
 * ONE ASSERTION WAS DELETED OUTRIGHT AND ITS ABSENCE IS DELIBERATE: that the
 * contributions sum to `savedAmount`. They still do - 5,040 and 11,040 - but
 * NOTHING MAY DEPEND ON IT. `savedAmount` is stored and a Top-Up keeps the two
 * in step only by writing both, so a test asserting the identity would fail the
 * first time a user contributed through the UI, which is correct behaviour.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const byId = (id: string): Goal => {
  const found = GOALS.find((g) => g.id === id)
  if (!found) throw new Error(`no goal ${id}`)
  return found
}

const BALI = byId('goal-bali-trip')
const EMERGENCY = byId('goal-emergency-funds')

/** Whole sen, the reason `budgetSpent` uses them: floats do not sum reliably. */
const toSen = (amount: number) => Math.round(amount * 100)

test('the two transcribed goal figures are Figma’s own and reconcile', () => {
  expect(GOALS).toHaveLength(2)

  // Inventory §6: "Bali Trip: 5,040 / 9,000 = 56.0% ✓ as shown".
  expect(BALI.savedAmount).toBe(5040)
  expect(BALI.targetAmount).toBe(9000)
  expect(Math.floor((5040 / 9000) * 100)).toBe(56)

  // Inventory §6: "Emergency Funds: 11,040 / 12,000 = 92.0% ✓ as shown".
  expect(EMERGENCY.savedAmount).toBe(11040)
  expect(EMERGENCY.targetAmount).toBe(12000)
  expect(Math.floor((11040 / 12000) * 100)).toBe(92)

  // 5,040 + 11,040 = 16,080 — the figure Gate 76's combined card must show, and
  // the amount net worth rises by AT THAT GATE.
  expect(toSen(BALI.savedAmount) + toSen(EMERGENCY.savedAmount)).toBe(toSen(16080))
})

/**
 * THE COMPOSITION OF EACH SET, WHICH IS WHAT SURVIVED THE MOVE.
 *
 * GATE 75 ASSERTED THAT THESE ROWS SUM TO `savedAmount`. THAT ASSERTION IS GONE
 * ON PURPOSE - see the header. What is still worth pinning is that the 28 rows
 * came across intact: the counts and the two subtotals per goal, which is what a
 * dropped or duplicated row during the relocation would have moved.
 *
 * IT READS THE LEDGER, SO IT ALSO PROVES THE JOIN. `goalContributions` filtering
 * on `goalId` is the only way these rows are reachable now; a row that lost its
 * `goalId` in the move fails here rather than silently vanishing from a screen
 * nobody has built yet.
 */
test('each goal’s contributions came across intact, counted and subtotalled', () => {
  // Bali: 12 automatic x 250 = 3,000, plus 1,000 + 500 + 340 + 200 = 2,040.
  const bali = goalContributions(TRANSACTIONS, BALI.id)
  expect(bali).toHaveLength(16)
  const baliAuto = bali.filter((t) => t.contributionSource === 'automatic')
  const baliManual = bali.filter((t) => t.contributionSource === 'manual')
  expect(baliAuto).toHaveLength(12)
  expect(baliManual).toHaveLength(4)
  expect(baliAuto.reduce((n, t) => n + toSen(Math.abs(t.amount)), 0)).toBe(toSen(3000))
  expect(baliManual.reduce((n, t) => n + toSen(Math.abs(t.amount)), 0)).toBe(toSen(2040))

  // Emergency: 10 automatic x 900 = 9,000, plus 1,500 + 540 = 2,040.
  const emergency = goalContributions(TRANSACTIONS, EMERGENCY.id)
  expect(emergency).toHaveLength(12)
  const emAuto = emergency.filter((t) => t.contributionSource === 'automatic')
  const emManual = emergency.filter((t) => t.contributionSource === 'manual')
  expect(emAuto).toHaveLength(10)
  expect(emManual).toHaveLength(2)
  expect(emAuto.reduce((n, t) => n + toSen(Math.abs(t.amount)), 0)).toBe(toSen(9000))
  expect(emManual.reduce((n, t) => n + toSen(Math.abs(t.amount)), 0)).toBe(toSen(2040))

  // 28 rows and no more: nothing else in the ledger claims a goal.
  expect(TRANSACTIONS.filter((t) => t.goalId !== undefined)).toHaveLength(28)
})

/**
 * THE SHAPE EVERY CONTRIBUTION ROW MUST HAVE, AND THE PAIRED-OPTIONALS GUARD.
 *
 * `goalId` AND `contributionSource` MUST BE SET TOGETHER AND THE TYPE CANNOT SAY
 * SO - two peer optionals admit both-set and neither-set. `Transaction`'s own
 * docstring states that weakness rather than hiding it, and this is where the
 * invariant is enforced. BOTH DIRECTIONS ARE CHECKED: a row with a goal and no
 * source, and a row with a source and no goal.
 *
 * THE ROWS ARE NEGATIVE NOW, WHERE THE EMBEDDED RECORDS WERE POSITIVE. A
 * contribution debits its source account, and this ledger’s sign is relative to
 * `accountId` - the same convention that makes a Maybank credit +5,200 on `main`
 * and a crypto transfer out of a wallet -350.69 on `marg`.
 */
test('every contribution row is a signed, kinded, goal-marked ledger row', () => {
  const rows = TRANSACTIONS.filter((t) => t.goalId !== undefined)

  for (const t of rows) {
    expect(t.kind, `${t.id} kind`).toBe('transfer')
    expect(t.amount, `${t.id} debits its source account`).toBeLessThan(0)
    expect(t.accountId, `${t.id} account`).toBe('main')
    expect(t.logo.kind, `${t.id} mark`).toBe('goal')
    expect(t.contributionSource, `${t.id} has a source`).toBeDefined()

    // Against the harness clock (PINNED_NOW = 2026-08-15) every contribution is
    // history, so both goals read as in progress.
    expect(t.occurredAt.slice(0, 10) <= '2026-08-15', `${t.id} is in the past`).toBe(
      true,
    )
  }

  // The other direction: no row carries a source without a goal.
  expect(
    TRANSACTIONS.filter((t) => t.contributionSource !== undefined && t.goalId === undefined),
    'a row carries contributionSource with no goalId',
  ).toEqual([])

  // Ids stayed unique across the whole ledger after 28 rows were added.
  expect(new Set(TRANSACTIONS.map((t) => t.id)).size).toBe(TRANSACTIONS.length)

  /*
    `goalContributions` SORTS; IT DOES NOT TRUST THE SEED’S FILE ORDER — AND
    THIS IS ASSERTED OVER A REVERSED LEDGER, BECAUSE OVER THE REAL ONE IT
    CANNOT FAIL. The 28 rows are appended to `transactions.ts` as one block,
    already newest first per goal, so filtering preserves that order and a
    `goalContributions` with its `.sort` deleted returns the right answer
    anyway. Measured: that exact mutation PASSED this test until the reversed
    input was added.

    Reversing is enough and shuffling would be worse: a random order makes the
    test non-deterministic for no extra coverage, and reverse is the one
    permutation guaranteed to be wrong if nothing sorts.
  */
  const reversed = [...TRANSACTIONS].reverse()
  for (const goal of GOALS) {
    for (const ledger of [TRANSACTIONS, reversed]) {
      const dates = goalContributions(ledger, goal.id).map((t) => t.occurredAt)
      expect(dates, `${goal.id} newest first`).toEqual([...dates].sort().reverse())
      expect(dates.length).toBeGreaterThan(1)
    }
    expect(goal.targetDate > '2026-08-15').toBe(true)
  }
})

/**
 * BOTH AUTO-SAVE STATES ARE SEEDED, and that is the point of asserting it: a
 * seed where every goal agreed would let Gate 78's Academy reader ignore the flag
 * and still pass.
 */
test('auto-save is seeded on and off, and the amount survives the toggle', () => {
  expect(BALI.autoSave).toEqual({ isEnabled: true, amount: 250 })
  expect(EMERGENCY.autoSave.isEnabled).toBe(false)

  // NOT CLEARED when disabled — `GoalAutoSave`'s stated contract.
  expect(EMERGENCY.autoSave.amount).toBeGreaterThan(0)

  // Emergency's automatic rows are history from when it was on, which is why a
  // disabled goal legitimately holds them.
  expect(
    goalContributions(TRANSACTIONS, EMERGENCY.id).some(
      (t) => t.contributionSource === 'automatic',
    ),
  ).toBe(true)
})

test('goal images are bare filenames, never a URL or a blob', () => {
  for (const goal of GOALS) {
    // `src/config/media.ts` owns the directory — the rule `Receipt.filename` and
    // `TransactionLogo`'s `image` case already set.
    expect(goal.image).not.toContain('/')
    expect(goal.image).not.toMatch(/^(https?|blob|data):/)
    expect(goal.image).toMatch(/\.(jpg|jpeg|png|webp)$/)
  }
})

/**
 * FIVE, NOT SEVEN, AND THE TEST SAYS SO OUT LOUD.
 *
 * `MONARCH-MVP-PHASE5-FLOW-INVENTORY.md` §2 states "2 goal cards + 5
 * commitments" and names exactly these five; `CLAUDE.md`'s Flow 11 plan records
 * that Figma draws seven. Gate 75 had no Figma access to settle it, so this
 * asserts what the inventory says and will FAIL LOUDLY if a later gate adds the
 * missing two without revisiting the record — which is the outcome wanted, not a
 * nuisance.
 */
test('the five inventory-named commitments are seeded, with Internet at RM 120', () => {
  expect(COMMITMENTS.map((c) => c.name)).toEqual([
    'Mortgage',
    'Car Payment',
    'Internet',
    'Netflix',
    'Anytime Fitness',
  ])

  const internet = COMMITMENTS.find((c) => c.name === 'Internet')
  // TRANSCRIBED (§A1): the smart-insight panel's "Current (RM 120.00)".
  expect(internet?.amount).toBe(120)
  expect(internet?.logo).toEqual({ kind: 'brand', name: 'umobile' })

  // THE LEDGER LINK IS NOT MODELLED, and Internet is where that shows: the plan
  // is RM 120.00 while the U Mobile charge is RM 75.00. Neither is wrong.
  const umobile = TRANSACTIONS.find((t) => t.id === 'txn-umobile-0820')
  expect(umobile?.amount).toBe(-75)
  expect(internet?.amount).not.toBe(Math.abs(umobile?.amount ?? 0))
})

test('the icon-versus-brand split is the one the inventory records', () => {
  // §F: "grayscale icons (Mortgage, Car Payment) and brand logos (U-Mobile,
  // Netflix)". A mortgage has no brand mark to ship, so an icon is correct
  // rather than a substitute for a missing logo — this is not a DS gap.
  const icons = COMMITMENTS.filter((c) => c.logo.kind === 'icon').map((c) => c.name)
  expect(icons).toEqual(['Mortgage', 'Car Payment'])

  const brands = COMMITMENTS.filter((c) => c.logo.kind === 'brand').map((c) => c.name)
  expect(brands).toEqual(['Internet', 'Netflix', 'Anytime Fitness'])

  expect(new Set(COMMITMENTS.map((c) => c.id)).size).toBe(COMMITMENTS.length)
  expect(COMMITMENTS.every((c) => c.amount > 0)).toBe(true)
  // Every seeded row is monthly; `'yearly'` has no instance yet, by design.
  expect(COMMITMENTS.every((c) => c.cadence === 'monthly')).toBe(true)
  // `nextDueOn` is placed after the harness clock so each reads as upcoming.
  expect(COMMITMENTS.every((c) => c.nextDueOn > '2026-08-15')).toBe(true)
})

/**
 * NP1 — EVERY FIELD IS PLAIN SERIALISABLE DATA, so the persistence that arrives
 * after Flow 11 is a storage adapter rather than a rewrite. A `Date`, a function
 * or a class instance anywhere in either seed fails this.
 */
test('both seeds survive a JSON round-trip unchanged (NP1)', () => {
  expect(JSON.parse(JSON.stringify(GOALS))).toEqual(GOALS)
  expect(JSON.parse(JSON.stringify(COMMITMENTS))).toEqual(COMMITMENTS)
})
