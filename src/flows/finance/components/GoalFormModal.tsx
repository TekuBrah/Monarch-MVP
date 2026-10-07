import { useState } from 'react'
import { Button, Field, Icon, Modal, OptionList, Select, Toggle } from '@monarch/design-system'

import { formatMyr } from '../../../data/format'
import type { FiatAccount, Goal } from '../../../data/types'
import {
  autoSaveAmountError,
  draftFromGoal,
  emptyGoalDraft,
  goalDraftErrors,
  goalDraftToSettings,
  isGoalDraftChanged,
  type GoalDraft,
  type GoalSettings,
} from '../goalDraft'
import { useTouchedValidation } from '../useTouchedValidation'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * THE GOAL'S FORMS — Flow 11, Gate 81-B. Create, Edit, the delete confirmation
 * and the auto-save amount editor.
 *
 * ONE FILE FOR ALL FOUR because they are one subject and they share one set of
 * draft rules; `BudgetFormModal.tsx` holds its own form and its own delete
 * confirmation together for the same reason.
 *
 * ──────────────────────────── WHAT FIGMA DRAWS ───────────────────────────────
 *
 * `1266:14340` `Finance_Plan_add goal` is the ONE drawn surface in this gate.
 * Read at Gate 81-B through the remote connector (`figma-local` refused with
 * ECONNREFUSED — the same split as Gates 78 to 81, so do not predict which path
 * works; establish an authenticated round trip instead).
 *
 * ITS INNER NODE IS NAMED "Bottom Sheet" AND IT IS A `Modal`. x=16, 343 wide,
 * all four corners rounded, no home-indicator region — the geometry decides,
 * and the layer name has now pointed the wrong way FIVE times in this file
 * (Flow 9 hit it three times, Gate 80 once). The outer frame is even named
 * "Modal", wrapping the inner one that is not.
 *
 * THE FIVE FIELDS, measured off the frame and read off its render:
 *
 *   Goal Name                  `Field`                311x58   "New Phone"
 *   Target Amount              `Select / Transfer`    311x58   "RM 5000.00"
 *   Target date                `Date range picker`    311x56   "30/05/2026"
 *   Auto-Save Amount / Month   `Field` + `Toggle`     311x58   "RM250"
 *   Funding Source             `Select` + chevron     311x54   "Bank Account - Main"
 *
 * Footer `Frame 445`, 343x152: "Save Goal" primary over "Cancel" secondary.
 *
 * ⚠ THERE IS NO INITIAL-DEPOSIT FIELD, AND THAT SETTLES A QUESTION THE GATE
 * BRIEF LEFT OPEN. The amount is the TARGET. So a created goal starts at
 * `savedAmount: 0`, nothing here moves money, and `topUpGoal` remains the ONE
 * way money enters a goal. If a deposit is ever drawn it routes through that.
 *
 * ⚠ THERE IS NO IMAGE FIELD EITHER, which is why a created goal takes
 * `GOAL_PLACEHOLDER_IMAGE` at `imageOrigin: 'placeholder'` and draws no
 * "Ai Image" badge. The drill-down's pencil is where an image is chosen.
 *
 * ──────────────────────── WHAT IS NOT DRAWN AT ALL ───────────────────────────
 *
 * The Flow 11 section (`1266:14338`) holds SIX frames and this is the only one
 * of them this gate implements. There is no Edit frame, no delete confirmation,
 * no auto-save-off state, no monthly-amount editor and no Funding Source picker
 * view anywhere in the file. All of those are UNDESIGNED WORK under Teku's
 * 21 Sept ruling — what he designed is followed exactly, and what he did not
 * follows Claude's judgement — and each is built from parts this app already
 * ships rather than invented.
 *
 * ─────────────────────── THREE DIVERGENCES, DELIBERATE ───────────────────────
 *
 * 1. TARGET AMOUNT IS A `Field type="number"`, NOT `SelectTransfer`. G49: that
 *    component renders its currency picker unconditionally with no prop to
 *    suppress it, so it would put a "Choose currency" chevron on a field that
 *    offers one currency. The register already records this form as the reason
 *    G49 was opened.
 *
 * 2. THE LABELS CARRY THE CURRENCY — "Target Amount (RM)" where Figma writes
 *    "Target Amount" and puts "RM" inside the value. A number input cannot hold
 *    "RM 5000.00". `ReceiptEditor`'s "Total (RM)" and `BudgetFormModal`'s
 *    "Amount (RM)" made this call twice before; a third spelling would be the
 *    divergence, not this.
 *
 * 3. TARGET DATE IS A `Field type="date"`, not the DS `DatePicker`. That
 *    component takes its calendar grid as an app-provided slot and the DS ships
 *    no calendar, so using it would mean the MVP inventing one. The receipt
 *    editor and the budget form both already take the platform's own picker.
 *    Its DISPLAY format follows the browser UI language rather than the pinned
 *    locale, which Gate 51-B measured and recorded — the committed baselines
 *    show the harness's format, not a Kuala Lumpur device's.
 * ═════════════════════════════════════════════════════════════════════════════
 */

/**
 * THE FUNDING SOURCE IS A DROPDOWN, AS FIGMA DRAWS IT — Teku's 6 Oct ruling,
 * taken knowing it needs a picker view Figma has not drawn. (It REPLACES an
 * earlier Radio-group ruling for this field; the Top-Up modal's Radio group is
 * untouched and stays, because its two balances are the decision input and a
 * dropdown shows one at a time.)
 *
 * SO THE FORM'S OWN CONTENT BECOMES THE PICKER — the Gate 74-B pattern, which
 * `BudgetFormModal` and `TransactionFilterSheet` already implement: the title
 * becomes the task, a back control appears on the left, close stays on the
 * right, and the rows are a flat full-bleed `OptionList` with no inner
 * container and no second shadow.
 *
 * ⚠ AND IT TAKES NO FOOTER, WHICH IS THE DS'S OWN RULE RATHER THAN A CHOICE
 * HERE. `OptionList` at `selectionMode="single"` fires `onChange` and
 * `onDismiss` in ONE action — its own prop doc says so, verbatim: "the user
 * returns to the form on one tap, and there is no confirm button". A multiple
 * picker needs a footer because it has no natural done moment; a single one is
 * committed by the tap. That also means no pending draft is needed: the tap IS
 * the commit, exactly as the merchant picker has worked since Gate 74-B.
 */
type View = 'form' | 'source'

export type GoalFormModalProps = {
  accounts: FiatAccount[]
  onClose: () => void
  onSave: (settings: GoalSettings) => void
} & (
  | { mode: 'create' }
  | { mode: 'edit'; goal: Goal; onDelete: () => void }
)

/**
 * THE SELECT'S COLLAPSED VALUE IS THE ACCOUNT'S NAME, where Figma prints
 * "Bank Account - Main".
 *
 * THE PREFIX NAMES A KIND THE DATA DOES NOT CARRY. Both cash accounts are
 * `group: 'Account'`, so there is no field to derive "Bank Account" from, and
 * spelling it as a literal would print "Bank Account - Joint Account" on the
 * other one. The name alone is unambiguous between exactly two accounts.
 */
const accountLabel = (accounts: FiatAccount[], id: string): string =>
  accounts.find((a) => a.id === id)?.name ?? ''

/**
 * THE PICKER'S ROWS CARRY THE BALANCE, where the collapsed value does not.
 *
 * Same reading the Top-Up modal's Radio labels take and for the same reason:
 * the funding account is where top-ups come FROM and where a deleted goal's
 * money goes BACK TO, so the two balances are the decision input. In the
 * collapsed trigger a balance would be noise — the question there is only which
 * account, and it is already answered.
 */
const sourceOptions = (accounts: FiatAccount[]) =>
  accounts.map((a) => ({ id: a.id, label: `${a.name} · ${formatMyr(a.balance)}` }))

export function GoalFormModal(props: GoalFormModalProps) {
  const { accounts, mode, onClose, onSave } = props

  /*
    SEEDED ONCE, AT MOUNT. The host mounts this conditionally, so every open
    starts from the stored goal (Edit) or from nothing (Create) — the property
    `BudgetFormModal` and `TransactionFilterSheet` both get the same way.
  */
  const [draft, setDraft] = useState<GoalDraft>(() =>
    props.mode === 'edit'
      ? draftFromGoal(props.goal)
      : emptyGoalDraft(accounts[0]?.id ?? ''),
  )
  const [view, setView] = useState<View>('form')

  const errors = goalDraftErrors(draft, accounts)
  const validation = useTouchedValidation(errors)

  const set =
    <K extends keyof GoalDraft>(key: K) =>
    (value: GoalDraft[K]) =>
      setDraft((current) => ({ ...current, [key]: value }))

  const save = () => {
    if (!validation.attempt()) return
    if (props.mode === 'edit' && !isGoalDraftChanged(props.goal, draft)) {
      onClose()
      return
    }
    onSave(goalDraftToSettings(draft))
  }

  const isSourceView = view === 'source'

  return (
    <Modal
      isOpen
      onClose={onClose}
      /*
        THE TITLE BECOMES THE TASK in the picker view, and the header's own back
        control returns to the form while `onClose` still dismisses the whole
        modal. Two exits, two controls.

        ⚠ THE DIALOG'S ACCESSIBLE NAME THEREFORE CHANGES MID-INTERACTION, which
        breaks a `getByRole('dialog', { name })` locator the moment the picker
        opens — Gate 74-B's finding, and the reason the harness declares
        `dialogs` separately from `opens`.
      */
      title={
        isSourceView
          ? 'Select funding source'
          : mode === 'create'
            ? 'Add a Goal'
            : 'Edit Goal'
      }
      onBack={isSourceView ? () => setView('form') : undefined}
      backLabel="Back to the goal form"
      /* Full-bleed rows — UI-1's rule, the call `BudgetFormModal` already makes. */
      contentPadding={isSourceView ? 'none' : 'default'}
      footer={
        isSourceView ? undefined : (
          <>
            <Button
              variant="primary"
              size="l"
              label={mode === 'create' ? 'Save Goal' : 'Save Changes'}
              onClick={save}
            />
            <Button variant="secondary" size="l" label="Cancel" onClick={onClose} />
            {props.mode === 'edit' && (
              /*
                RED, BORDERLESS, WITH A BIN — the Budget form's own treatment,
                extended here by the red-delete ruling. `tone="error"` is
                honoured on `variant="tertiary"` ONLY, so "a red Delete" is red
                text and a red bin on no fill. The dark-mode contrast shortfall
                of `--mapped-text-error-default` is accepted and deferred to the
                DS round, as it is on the budget form.
              */
              <Button
                variant="tertiary"
                tone="error"
                size="l"
                label="Delete goal"
                leadingIcon={<Icon name="delete" size="l" />}
                onClick={props.onDelete}
              />
            )}
          </>
        )
      }
    >
      {isSourceView ? (
        <OptionList
          selectionMode="single"
          ariaLabel="Funding source"
          options={sourceOptions(accounts)}
          value={[draft.fundingAccountId]}
          onChange={(value) => {
            const picked = value[0]
            if (picked) set('fundingAccountId')(picked)
          }}
          onDismiss={() => setView('form')}
        />
      ) : (
        <div ref={validation.formRef} className="mvp-goal-form" onBlur={validation.onBlur}>
          <Field
            label="Goal Name"
            name="name"
            value={draft.name}
            onChange={set('name')}
            ariaLabel="Goal name"
            sizing="fill"
            isRequired
            isInvalid={validation.isShown('name')}
          />
          <Field
            label="Target Amount (RM)"
            type="number"
            name="targetAmount"
            value={draft.targetAmount}
            onChange={set('targetAmount')}
            ariaLabel="Target amount in ringgit"
            sizing="fill"
            isRequired
            isInvalid={validation.isShown('targetAmount')}
          />
          <Field
            label="Target date"
            type="date"
            name="targetDate"
            value={draft.targetDate}
            onChange={set('targetDate')}
            ariaLabel="Target date"
            sizing="fill"
            isRequired
            isInvalid={validation.isShown('targetDate')}
          />
          {/*
            FIGMA'S `Frame 475`: the amount and the switch on one row, the field
            249 wide and the toggle at x=265. The switch is drawn OFF beside a
            filled amount, which is `GoalAutoSave`'s contract visible in the
            mockup — the figure survives the switch going off.
          */}
          <div className="mvp-goal-form__autosave">
            <Field
              label="Auto-Save Amount / Month (RM)"
              type="number"
              name="autoSaveAmount"
              value={draft.autoSaveAmount}
              onChange={set('autoSaveAmount')}
              ariaLabel="Auto-save amount per month in ringgit"
              sizing="fill"
              isInvalid={validation.isShown('autoSaveAmount')}
            />
            <Toggle
              size="l"
              isChecked={draft.autoSaveEnabled}
              onChange={set('autoSaveEnabled')}
              ariaLabel="Auto-save"
            />
          </div>
          <div className="mvp-goal-form__source" data-field="fundingAccountId">
            {/*
              A TRIGGER THAT NAVIGATES — pinned closed, its open request
              intercepted, exactly as the budget form's category trigger and the
              merchant trigger are. There is no `menuSlot` at all.

              G21 APPLIES HERE TOO: `Select` renders `aria-expanded`
              unconditionally, so this permanently announces a collapsed popup
              that does not exist. Registered, not worked around — `SelectProps`
              exposes no role or aria passthrough.
            */}
            <Select
              label="Funding Source"
              ariaLabel="Funding source"
              sizing="fill"
              searchable={false}
              value={accountLabel(accounts, draft.fundingAccountId)}
              isSelected={draft.fundingAccountId.length > 0}
              isInvalid={validation.isShown('fundingAccountId')}
              isOpen={false}
              onOpenChange={(open) => {
                if (open) setView('source')
              }}
            />
          </div>
        </div>
      )}
    </Modal>
  )
}

/**
 * THE DELETE CONFIRMATION — undrawn, and composed exactly as the budget form's
 * `BudgetDeleteConfirm` and the receipt viewer's `ConfirmModal` are, rather
 * than invented as a third shape: a DS `Modal`, one line of body, and a footer
 * of an OUTLINED Cancel (`secondary`, the safe action) and a red Delete. It
 * STACKS over the Edit modal, so Cancel returns to it unchanged.
 *
 * ⚠ THE BODY NAMES THE MONEY, AND THAT IS THE WHOLE REASON THIS COPY IS NOT THE
 * BUDGET'S. Deleting a budget removes a setting; deleting a goal MOVES money
 * back to a real account, and a confirmation that did not say where RM 5,040.00
 * was about to go would be hiding the only consequence worth confirming.
 *
 * A ZERO-BALANCE GOAL GETS THE SHORTER SENTENCE, because there is nothing to
 * return and a "returns RM 0.00 to Main" would be a statement about money that
 * does not exist.
 */
export function GoalDeleteConfirm({
  goal,
  accounts,
  onCancel,
  onConfirm,
}: {
  goal: Goal
  accounts: FiatAccount[]
  onCancel: () => void
  onConfirm: () => void
}) {
  const destination = accountLabel(accounts, goal.fundingAccountId)
  const body =
    goal.savedAmount > 0
      ? `This closes '${goal.name}' and returns ${formatMyr(goal.savedAmount)} to ${destination}. Its past contributions stay in your transactions. This can't be undone.`
      : `This closes '${goal.name}'. It holds nothing, so no money moves. This can't be undone.`

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Delete goal?"
      footer={
        <>
          <Button variant="secondary" size="l" label="Cancel" onClick={onCancel} />
          <Button
            variant="tertiary"
            tone="error"
            size="l"
            label="Delete"
            leadingIcon={<Icon name="delete" size="l" />}
            onClick={onConfirm}
          />
        </>
      }
    >
      <p className="mvp-goal-delete__body type-body-sm">{body}</p>
    </Modal>
  )
}

/**
 * THE AUTO-SAVE AMOUNT EDITOR — the drill-down pencil's destination. Undrawn.
 *
 * A ONE-FIELD `Modal` RATHER THAN THE WHOLE GOAL FORM, because the pencil sits
 * beside one figure and opening a five-field form from it would answer a
 * question the user did not ask. The same reading the receipt viewer takes when
 * its "Edit" opens a focused editor rather than the whole capture flow.
 *
 * ITS RULE IS `autoSaveAmountError`, which asks `goalDraftErrors` over a
 * synthetic draft — so the pencil and the form cannot disagree about what a
 * valid monthly figure is.
 *
 * ⚠ IT WRITES THE AMOUNT AND NOT THE SWITCH. Saving a figure here does not turn
 * auto-save on: the switch is its own control, one row away, and a pencil that
 * silently enabled a monthly transfer would be the most surprising write in
 * this app. `GoalAutoSave`'s contract already says the amount is meaningful
 * independently of the switch.
 */
export function AutoSaveAmountModal({
  goal,
  onClose,
  onSave,
}: {
  goal: Goal
  onClose: () => void
  onSave: (amount: number) => void
}) {
  const [amount, setAmount] = useState(() =>
    goal.autoSave.amount === 0 ? '' : goal.autoSave.amount.toFixed(2),
  )
  const errors = { autoSaveAmount: autoSaveAmountError(amount) }
  const validation = useTouchedValidation(errors)

  const save = () => {
    if (!validation.attempt()) return
    onSave(Math.round(Number(amount.trim()) * 100) / 100)
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Auto-Save amount"
      footer={
        <>
          <Button variant="primary" size="l" label="Save Amount" onClick={save} />
          <Button variant="secondary" size="l" label="Cancel" onClick={onClose} />
        </>
      }
    >
      <div ref={validation.formRef} className="mvp-goal-form" onBlur={validation.onBlur}>
        <Field
          label="Auto-Save Amount / Month (RM)"
          type="number"
          name="autoSaveAmount"
          value={amount}
          onChange={setAmount}
          ariaLabel="Auto-save amount per month in ringgit"
          sizing="fill"
          isRequired
          isInvalid={validation.isShown('autoSaveAmount')}
        />
      </div>
    </Modal>
  )
}
