import { expect, test } from '@playwright/test'

import { COMMITMENTS } from '../src/data/commitments'
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
 * must never contradict the sourced figure. These tests are that constraint made
 * executable. A drifting contribution row is otherwise invisible until Gate 77
 * renders the list beside the total it disagrees with.
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
 * THE INVARIANT THIS FILE EXISTS FOR.
 *
 * `savedAmount` is STORED and is never summed at read time — see its docstring
 * for why, which is `FiatAccount.balance`'s reason. That makes this a constraint
 * on the SEED rather than on the code: the authored rows must add up to the
 * transcribed total, because Gate 77 renders both on one screen.
 */
test('every goal’s contributions sum to exactly its stored savedAmount', () => {
  for (const goal of GOALS) {
    const sum = goal.contributions.reduce((sen, c) => sen + toSen(c.amount), 0)
    expect(sum, `${goal.id} contributions vs savedAmount`).toBe(toSen(goal.savedAmount))
  }

  // The arithmetic written out, so a failure says which half moved.
  // Bali: 12 automatic × 250 = 3,000, plus 1,000 + 500 + 340 + 200 = 2,040.
  const baliAuto = BALI.contributions.filter((c) => c.source === 'automatic')
  const baliManual = BALI.contributions.filter((c) => c.source === 'manual')
  expect(baliAuto).toHaveLength(12)
  expect(baliManual).toHaveLength(4)
  expect(baliAuto.reduce((n, c) => n + toSen(c.amount), 0)).toBe(toSen(3000))
  expect(baliManual.reduce((n, c) => n + toSen(c.amount), 0)).toBe(toSen(2040))

  // Emergency: 10 automatic × 900 = 9,000, plus 1,500 + 540 = 2,040.
  const emAuto = EMERGENCY.contributions.filter((c) => c.source === 'automatic')
  const emManual = EMERGENCY.contributions.filter((c) => c.source === 'manual')
  expect(emAuto).toHaveLength(10)
  expect(emManual).toHaveLength(2)
  expect(emAuto.reduce((n, c) => n + toSen(c.amount), 0)).toBe(toSen(9000))
  expect(emManual.reduce((n, c) => n + toSen(c.amount), 0)).toBe(toSen(2040))
})

test('contributions are newest first, all positive, and all in the past', () => {
  for (const goal of GOALS) {
    const dates = goal.contributions.map((c) => c.date)
    expect(dates, `${goal.id} newest first`).toEqual([...dates].sort().reverse())
    expect(goal.contributions.every((c) => c.amount > 0)).toBe(true)
    expect(new Set(goal.contributions.map((c) => c.id)).size).toBe(goal.contributions.length)

    // Against the harness clock (PINNED_NOW = 2026-08-15) every contribution is
    // history and every target is ahead, so both goals read as in progress.
    for (const c of goal.contributions) expect(c.date <= '2026-08-15').toBe(true)
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
  expect(EMERGENCY.contributions.some((c) => c.source === 'automatic')).toBe(true)
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
