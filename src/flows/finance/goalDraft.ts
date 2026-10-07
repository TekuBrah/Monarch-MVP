import type { FiatAccount, Goal } from '../../data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE GOAL FORM'S DRAFT — Flow 11, Gate 81-B. Pure: no React, no DOM, no clock.
 *
 * Kept out of the modal so the rules can be read and tested on their own, the
 * split `budgetDraft.ts` and `topUpDraft.ts` already make and which this file
 * mirrors function for function.
 *
 * THE DRAFT IS STRINGS, because that is what an `<input>` holds — with two
 * exceptions that are not text at all: the funding account is an id picked from
 * a list, and auto-save's switch is a boolean.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface GoalDraft {
  name: string
  /** Plain decimal, no currency symbol and no separators. */
  targetAmount: string
  /** `YYYY-MM-DD` — the shape `<input type="date">` reads and writes. */
  targetDate: string
  fundingAccountId: string
  autoSaveEnabled: boolean
  /** Plain decimal. May be blank while auto-save is OFF — see below. */
  autoSaveAmount: string
}

/**
 * THE AMOUNT CAP, IN SEN — RM 999,999.99, the figure `budgetDraft.ts` already
 * uses and for its reason: `ProgressRing`'s centre amount is sized for six
 * integer digits (DS `amountFit.ts`) and the goal drill-down prints both the
 * target and the saved figure there. Compared in whole sen so a float cannot
 * miss the boundary.
 */
export const GOAL_AMOUNT_CAP_SEN = 99_999_999

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface GoalDraftErrors {
  name: boolean
  targetAmount: boolean
  targetDate: boolean
  fundingAccountId: boolean
  autoSaveAmount: boolean
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠ A TARGET BELOW WHAT THE GOAL ALREADY HOLDS IS **PERMITTED**, AND THAT IS A
 * RULING ON MEASUREMENT RATHER THAN A HOLE IN THE VALIDATION.
 *
 * MEASURED FIRST: TOP-UP ALREADY PRODUCES THAT STATE. `topUpDraftErrors` caps
 * the amount at the SOURCE ACCOUNT'S BALANCE and does NOT cap it at the goal's
 * remaining need, so a user may already put RM 5,000 into a goal that needed
 * RM 100 — and `goalPercent` clamps the display to 100 for exactly that reason.
 * Overshoot is a representable, reachable, already-shipped state.
 *
 * SO REFUSING IT HERE WOULD MAKE THE FORM STRICTER THAN THE WRITER THAT MAKES
 * THE SAME STATE, and it would trap the one user who most needs the control:
 * someone whose goal is nearly full and who wants to lower their ambition.
 * There would be no way out of that form except abandoning the edit.
 *
 * IT ALSO MATCHES EVERY COMPARABLE PRODUCT. Monzo Pots, Revolut Vaults and Wise
 * Jars all accept a target at or below the balance and simply show the goal as
 * reached; none refuses the edit, and none quietly moves money to make the two
 * figures agree.
 *
 * WHAT THIS FILE THEREFORE NEVER READS IS `savedAmount`. These rules are about
 * the figures the user typed; the relationship between a target and a balance
 * belongs to the progress bar, not to the form.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE AMOUNT IS CHECKED AS TEXT FIRST, for `ReceiptEditor`'s and `topUpDraft`'s
 * reason: `Number` accepts `1e3`, ` 12 ` and `0x10`, and a target is none of
 * those. The pattern also enforces the two-decimal rule a numeric check could
 * not express.
 *
 * AUTO-SAVE'S AMOUNT IS REQUIRED ONLY WHILE THE SWITCH IS ON. Off, it may be
 * blank: a user who has never set one should not have to invent a figure in
 * order to save a goal whose auto-save they are not using. A blank reads as 0,
 * and a figure typed while the switch is off is KEPT rather than cleared —
 * `GoalAutoSave`'s own stated contract, and the behaviour Emergency Funds
 * seeds.
 */
export function goalDraftErrors(draft: GoalDraft, accounts: FiatAccount[]): GoalDraftErrors {
  const target = draft.targetAmount.trim()
  const targetSen = Math.round(Number(target) * 100)
  const auto = draft.autoSaveAmount.trim()
  const autoSen = Math.round(Number(auto) * 100)

  return {
    name: draft.name.trim().length === 0,
    targetAmount: !(
      AMOUNT_PATTERN.test(target) &&
      targetSen > 0 &&
      targetSen <= GOAL_AMOUNT_CAP_SEN
    ),
    targetDate: !DATE_PATTERN.test(draft.targetDate.trim()),
    fundingAccountId: !accounts.some((a) => a.id === draft.fundingAccountId),
    autoSaveAmount: draft.autoSaveEnabled
      ? !(AMOUNT_PATTERN.test(auto) && autoSen > 0 && autoSen <= GOAL_AMOUNT_CAP_SEN)
      : auto.length > 0 && !(AMOUNT_PATTERN.test(auto) && autoSen <= GOAL_AMOUNT_CAP_SEN),
  }
}

export function isGoalDraftValid(draft: GoalDraft, accounts: FiatAccount[]): boolean {
  return !Object.values(goalDraftErrors(draft, accounts)).some(Boolean)
}

/** An empty Create draft. The funding account starts at the one passed in. */
export function emptyGoalDraft(fundingAccountId: string): GoalDraft {
  return {
    name: '',
    targetAmount: '',
    targetDate: '',
    fundingAccountId,
    autoSaveEnabled: false,
    autoSaveAmount: '',
  }
}

/** An Edit draft, seeded from the stored goal. */
export function draftFromGoal(goal: Goal): GoalDraft {
  return {
    name: goal.name,
    targetAmount: goal.targetAmount.toFixed(2),
    targetDate: goal.targetDate,
    fundingAccountId: goal.fundingAccountId,
    autoSaveEnabled: goal.autoSave.isEnabled,
    autoSaveAmount: goal.autoSave.amount === 0 ? '' : goal.autoSave.amount.toFixed(2),
  }
}

/** Everything the form writes: a `GoalEdit` without the optional image pair. */
export type GoalSettings = Pick<
  Goal,
  'name' | 'targetAmount' | 'targetDate' | 'fundingAccountId' | 'autoSave'
>

/**
 * The draft as the provider writes it. Call only on a valid draft.
 *
 * IT RETURNS THE SETTINGS AND NOT A WHOLE `Goal`, so one function serves both
 * writers: Create spreads an id, a zero balance and an image over it, and Edit
 * hands it straight to `updateGoal`. NEITHER CAN REACH `savedAmount` THROUGH
 * IT — the field is not in the type.
 */
export function goalDraftToSettings(draft: GoalDraft): GoalSettings {
  const auto = draft.autoSaveAmount.trim()
  return {
    name: draft.name.trim(),
    targetAmount: Math.round(Number(draft.targetAmount.trim()) * 100) / 100,
    targetDate: draft.targetDate.trim(),
    fundingAccountId: draft.fundingAccountId,
    autoSave: {
      isEnabled: draft.autoSaveEnabled,
      amount: auto.length === 0 ? 0 : Math.round(Number(auto) * 100) / 100,
    },
  }
}

/**
 * HAS ANYTHING MOVED? Derived by re-seeding the stored goal's own draft and
 * comparing, never by restating the field list — so a field added to
 * `GoalDraft` is compared the day it is added rather than the day somebody
 * remembers to add it here. `isBudgetDraftChanged`'s shape, and the reason
 * `isFacetDefault` is written the same way.
 */
export function isGoalDraftChanged(goal: Goal, draft: GoalDraft): boolean {
  const seeded = draftFromGoal(goal)
  return (Object.keys(seeded) as (keyof GoalDraft)[]).some((k) => seeded[k] !== draft[k])
}

/**
 * THE AUTO-SAVE AMOUNT EDITOR'S OWN RULE. The drill-down's pencil opens a
 * one-field form, so it needs the one-field answer rather than the whole
 * draft's — and it gets it by asking `goalDraftErrors` over a synthetic draft,
 * so there is ONE definition of a valid auto-save figure. A second regex here
 * is exactly how the pencil and the form come to disagree about what they take.
 *
 * IT ASKS WITH THE SWITCH ON, because the pencil edits an amount the user is
 * choosing to set: required and positive, whatever the switch currently says.
 */
export function autoSaveAmountError(amount: string): boolean {
  const probe: GoalDraft = {
    ...emptyGoalDraft(''),
    autoSaveEnabled: true,
    autoSaveAmount: amount,
  }
  return goalDraftErrors(probe, []).autoSaveAmount
}

/**
 * A GOAL'S CURRENT SETTINGS, so a writer that changes ONE of them can hand
 * `updateGoal` a whole `GoalEdit` without restating the other four.
 *
 * IT IS A PROJECTION AND NOT A COPY, which is what keeps the auto-save switch
 * from silently reverting a name the user had just saved: every caller spreads
 * this over its own one change, so the four it is not touching are the four
 * that are currently stored.
 */
export function goalSettingsOf(goal: Goal): GoalSettings {
  return {
    name: goal.name,
    targetAmount: goal.targetAmount,
    targetDate: goal.targetDate,
    fundingAccountId: goal.fundingAccountId,
    autoSave: goal.autoSave,
  }
}
