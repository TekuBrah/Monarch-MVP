import type { Goal } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FLOW 11 — THE TWO SEEDED SAVINGS GOALS (Gate 75).
 *
 * THE TWO HEADLINE FIGURES ARE FIGMA'S OWN AND THEY RECONCILE, which is why they
 * are transcribed rather than authored. Inventory §6 records both as verified
 * against the frame: Bali Trip 5,040 / 9,000 = 56.0% and Emergency Funds
 * 11,040 / 12,000 = 92.0%. A floored percentage lands on both printed integers
 * exactly.
 *
 * COMBINED SAVED IS RM 16,080.00 (5,040 + 11,040). Gate 76's "Savings Goals"
 * card shows that, and net worth rises by it AT GATE 76, not here — goals are a
 * separate collection precisely so this seed cannot move a figure before a screen
 * explains it. See `Goal` in `types.ts` for the three reasons.
 *
 * ───────────────────── WHAT IS TRANSCRIBED, WHAT IS AUTHORED ─────────────────
 *
 * TRANSCRIBED from the inventory: both names, both saved amounts, both target
 * amounts, and Bali's RM 250/month auto-save figure (§A7, and the Academy task
 * note at §11).
 *
 * AUTHORED, because no source on disk carries it: every contribution row, both
 * target dates, both image filenames, and Emergency's auto-save amount. Authored
 * under the same constraint `holdings.ts` states for its line lists — the
 * authored detail must never contradict the sourced figure — which here means the
 * contributions sum EXACTLY to `savedAmount`, asserted in `e2e/goals.spec.ts`.
 *
 * ⚠ THE CONTRIBUTIONS SUM TO `savedAmount`, NOT TO A "SINCE OPENING" DELTA, AND
 * THAT SUPERSEDES THE FLOW 11 PLAN'S OPENING-BALANCE MODEL. That plan described
 * Bali as "opens at RM 3,840 plus four drawn contributions of RM 1,200". That
 * shape cannot also satisfy Gate 75's rule that the list sums to the stored
 * figure, so the opening balance is carried as the list's oldest rows rather than
 * as an implicit starting value. `savedAmount` remains the stored authority and
 * is still never summed at read time — see its docstring — but the seed is
 * written so the two agree, because a seed whose own rows contradict its own
 * total is the defect the receipts already taught this repo to avoid.
 *
 * ⚠ NEITHER IMAGE FILE EXISTS YET, AND THAT IS DELIBERATE RATHER THAN AN
 * OVERSIGHT. Figma's goal cards carry photographs (inventory §F: "Goal card
 * imagery — photographs, one badged 'AI Image'") and this repo has no source for
 * them; fabricating artwork is not a build step. The filenames below NAME WHAT IS
 * NEEDED, in the Gate 24 icon-census pattern, so Gate 76 is one step and not a
 * research task:
 *
 *   public/media/goals/goal_bali_trip.jpg
 *   public/media/goals/goal_emergency_funds.jpg
 *
 * NOTHING RENDERS THEM AT THIS GATE, so nothing is broken today — `Goal.image`
 * has no reader, and no `goalImageUrl()` resolver was added because a resolver
 * with no consumer is the dead-code shape this repo rejects. GATE 76 MUST SUPPLY
 * BOTH FILES ALONGSIDE THE RESOLVER, or `settleImages` in `e2e/harness.ts` will
 * fail the walk on `naturalWidth === 0` the moment a goal card renders.
 *
 * DATES ARE TYPED DATA, EXEMPT FROM B5, and they are placed against the harness
 * clock (`PINNED_NOW` = 2026-08-15) so both goals read as in progress: every
 * contribution is in the past and both target dates are in the future.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const GOALS: Goal[] = [
  {
    id: 'goal-bali-trip',
    name: 'Bali Trip',
    targetAmount: 9000,
    // TRANSCRIBED (inventory §6): 5,040 / 9,000 = 56.0%, as the frame prints.
    savedAmount: 5040,
    targetDate: '2026-12-20',
    image: 'goal_bali_trip.jpg',
    // TRANSCRIBED: RM 250/mth, the figure the drill-down draws beside the toggle.
    autoSave: { isEnabled: true, amount: 250 },
    /**
     * SIXTEEN ROWS, NEWEST FIRST, SUMMING TO EXACTLY 5,040.00: twelve monthly
     * automatic transfers of 250 (= 3,000) and four manual top-ups
     * (1,000 + 500 + 340 + 200 = 2,040). 3,000 + 2,040 = 5,040.
     *
     * THE LENGTH IS THE POINT, not the individual figures. Gate 77's "See All"
     * bottom sheet must scroll a list whose length it does not know, and a
     * three-row seed would let a sheet that silently caps at its own height pass.
     */
    contributions: [
      { id: 'goal-bali-c16', amount: 250, date: '2026-08-15', source: 'automatic' },
      { id: 'goal-bali-c15', amount: 250, date: '2026-07-15', source: 'automatic' },
      { id: 'goal-bali-c14', amount: 500, date: '2026-07-02', source: 'manual' },
      { id: 'goal-bali-c13', amount: 250, date: '2026-06-15', source: 'automatic' },
      { id: 'goal-bali-c12', amount: 340, date: '2026-05-18', source: 'manual' },
      { id: 'goal-bali-c11', amount: 250, date: '2026-05-15', source: 'automatic' },
      { id: 'goal-bali-c10', amount: 250, date: '2026-04-15', source: 'automatic' },
      { id: 'goal-bali-c09', amount: 250, date: '2026-03-15', source: 'automatic' },
      { id: 'goal-bali-c08', amount: 1000, date: '2026-03-10', source: 'manual' },
      { id: 'goal-bali-c07', amount: 250, date: '2026-02-15', source: 'automatic' },
      { id: 'goal-bali-c06', amount: 250, date: '2026-01-15', source: 'automatic' },
      { id: 'goal-bali-c05', amount: 250, date: '2025-12-15', source: 'automatic' },
      { id: 'goal-bali-c04', amount: 250, date: '2025-11-15', source: 'automatic' },
      { id: 'goal-bali-c03', amount: 250, date: '2025-10-15', source: 'automatic' },
      { id: 'goal-bali-c02', amount: 200, date: '2025-10-05', source: 'manual' },
      { id: 'goal-bali-c01', amount: 250, date: '2025-09-15', source: 'automatic' },
    ],
  },
  {
    id: 'goal-emergency-funds',
    name: 'Emergency Funds',
    targetAmount: 12000,
    // TRANSCRIBED (inventory §6): 11,040 / 12,000 = 92.0%, as the frame prints.
    savedAmount: 11040,
    targetDate: '2027-06-30',
    image: 'goal_emergency_funds.jpg',
    /**
     * AUTO-SAVE IS OFF HERE AND ON FOR BALI, SO BOTH STATES ARE SEEDED. Gate 78's
     * Academy task reads whether it is enabled, and a seed in which every goal
     * agreed would let a reader that ignores the flag pass.
     *
     * THE AMOUNT SURVIVES THE TOGGLE BEING OFF, which is `GoalAutoSave`'s stated
     * contract: the automatic rows below are history from when it was on.
     */
    autoSave: { isEnabled: false, amount: 900 },
    /**
     * TWELVE ROWS, NEWEST FIRST, SUMMING TO EXACTLY 11,040.00: ten monthly
     * automatic transfers of 900 (= 9,000) and two manual top-ups
     * (1,500 + 540 = 2,040). 9,000 + 2,040 = 11,040.
     */
    contributions: [
      { id: 'goal-emerg-c12', amount: 900, date: '2026-08-01', source: 'automatic' },
      { id: 'goal-emerg-c11', amount: 1500, date: '2026-07-20', source: 'manual' },
      { id: 'goal-emerg-c10', amount: 900, date: '2026-07-01', source: 'automatic' },
      { id: 'goal-emerg-c09', amount: 900, date: '2026-06-01', source: 'automatic' },
      { id: 'goal-emerg-c08', amount: 900, date: '2026-05-01', source: 'automatic' },
      { id: 'goal-emerg-c07', amount: 540, date: '2026-04-22', source: 'manual' },
      { id: 'goal-emerg-c06', amount: 900, date: '2026-04-01', source: 'automatic' },
      { id: 'goal-emerg-c05', amount: 900, date: '2026-03-01', source: 'automatic' },
      { id: 'goal-emerg-c04', amount: 900, date: '2026-02-01', source: 'automatic' },
      { id: 'goal-emerg-c03', amount: 900, date: '2026-01-01', source: 'automatic' },
      { id: 'goal-emerg-c02', amount: 900, date: '2025-12-01', source: 'automatic' },
      { id: 'goal-emerg-c01', amount: 900, date: '2025-11-01', source: 'automatic' },
    ],
  },
]
