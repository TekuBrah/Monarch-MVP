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
 * AUTHORED, because no source on disk carries it: both target dates, both image
 * filenames, and Emergency’s auto-save amount.
 *
 * ────────── THE CONTRIBUTIONS LEFT THIS FILE AT GATE 77 ─────────────
 *
 * A `Goal` CARRIED ITS OWN `contributions` ARRAY UNTIL GATE 77 AND NO LONGER
 * DOES. Twenty-eight rows now live in `transactions.ts` as ordinary ledger
 * entries carrying `goalId`, and `goalContributions()` in `derive.ts` is how a
 * goal gets them back. Do not re-add the field - see `Goal` in `types.ts` for
 * why an embedded list was the defect rather than the convenience.
 *
 * WHAT THAT RETIRED, AND IT MATTERS FOR ANYONE READING OLDER NOTES: the rule
 * that the list must sum EXACTLY to `savedAmount`, which Gate 75 asserted in
 * `e2e/goals.spec.ts`. The seeded rows still do sum to 5,040 and 11,040, but
 * NOTHING DEPENDS ON IT AND NO TEST ASSERTS IT, because a Top-Up will keep the
 * two in step only by writing both. `savedAmount` is the stored authority and
 * is still never summed at read time - see its docstring.
 *
 * BOTH IMAGE FILES EXIST, AS OF GATE 76 - `public/media/goals/goal_bali_trip.jpg`
 * and `goal_emergency_funds.jpg`, resolved by `goalImageUrl()`. Gate 75 shipped
 * the filenames with nothing behind them, deliberately, and that census note is
 * discharged. `settleImages` in `e2e/harness.ts` asserts `naturalWidth > 0` on
 * every rendered image, so a missing file fails the walk loudly.
 *
 * DATES ARE TYPED DATA, EXEMPT FROM B5, and both target dates are placed against
 * the harness clock (`PINNED_NOW` = 2026-08-15) so both goals read as in
 * progress: every contribution is in the past and both targets are in the future.
 * ───────────────────────────────────────────────────────────────────────────────
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
     * contract: the automatic contributions in the ledger are history from when
     * it was on.
     */
    autoSave: { isEnabled: false, amount: 900 },
  },
]
