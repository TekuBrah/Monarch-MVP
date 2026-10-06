import { Button, Field, Modal, Radio } from '@monarch/design-system'
import { useState } from 'react'

import { formatMyr, goalProgressAfter } from '../../../data/format'
import { toSen } from '../../../data/derive'
import type { FiatAccount, Goal } from '../../../data/types'
import { emptyTopUpDraft, topUpAmount, topUpDraftErrors, type TopUpDraft } from '../topUpDraft'
import { useTouchedValidation } from '../useTouchedValidation'
import '../finance.css'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TOP-UP — moving money from a cash account into a savings goal. Gate 81.
 *
 * ⚠ FIGMA DRAWS NO TOP-UP SURFACE OF ANY KIND, so every decision below is made
 * under the 21 Sept ruling (what Teku designed is followed exactly; what he did
 * not follows Claude's judgement) and is justified from this app's own
 * precedents rather than asserted. Established at Gate 81 against the file, not
 * assumed: the `Finance_Plan` section `1266:14338` holds SIX frames — the Plans
 * tab, Add-a-Goal, the goal drill-down, view-commitment, the smart insight and
 * its education panel — and none of them is a Top-Up. The drill-down carries a
 * hidden `Bottom Sheet` (`873:6583`) which has NO CHILDREN and returns `{}` from
 * `get_variable_defs`: an unconfigured instance dropped on the canvas, which is
 * undesigned work rather than a spec. The on-disk inventory agrees — its §E
 * screen table lists the drill-down's footer as "Top-Up / Edit Goals" and gives
 * Top-Up no screen of its own anywhere.
 *
 * A `Modal`, BECAUSE THAT IS WHAT THIS FLOW'S ONLY DRAWN FORM IS. Figma's
 * Add-a-Goal (`1266:14340`) is a card at x=16, 343 wide, all four corners
 * rounded, with a header, a content column and a two-button footer — a Modal by
 * geometry whatever the layer is named. A Top-Up is the same kind of surface
 * doing a smaller job, so it takes the same one.
 *
 * ───────────────── THE SOURCE IS A `Radio` GROUP, NOT A DROPDOWN ─────────────
 *
 * THIS IS THE ONE DECISION WORTH OVERTURNING IF TEKU DISAGREES, so the reasoning
 * is here in full rather than compressed.
 *
 * Figma draws the ANALOGOUS control on Add-a-Goal — "Funding Source", reading
 * "Bank Account - Main" — as a `Select` with a chevron, i.e. a dropdown. Under
 * the Gate 74-B pattern a dropdown inside an overlay must become a DEDICATED
 * SELECTION VIEW, and Figma has drawn no such view for it. Had this form needed
 * a dropdown, that would have been a hard stop: an undrawn picker view is to be
 * designed in Figma before it is built, not improvised.
 *
 * IT DOES NOT NEED ONE, AND THE APP HAD ALREADY WRITTEN THE RULE DOWN.
 * `PresetModals.tsx`'s `ReminderModal` is a `Radio` group "because the three
 * options are mutually exclusive and all three should be visible at once —
 * THREE ITEMS IS BELOW THE THRESHOLD WHERE A DROPDOWN EARNS ITS EXTRA
 * INTERACTION". There are exactly TWO cash accounts (`FIAT_ACCOUNTS`: Main and
 * Joint Account), which is below that threshold, so the Gate 74-B pattern never
 * engages — there is no dropdown for it to apply to. The two pickers that DID
 * earn a view had 7 and 20 options; this has two.
 *
 * THE BALANCE IS IN THE LABEL, which is the second reason a dropdown is the
 * wrong control here. The amount is capped by the chosen account's balance, so
 * the balances are the decision input — and a dropdown shows one at a time,
 * forcing the user to toggle in order to compare the two figures the choice is
 * actually between.
 *
 * NO "add an account" OPTION. The Flow 11 plan says so explicitly, and no flow
 * in this app creates a fiat account.
 *
 * ──────────────────────────── AMOUNT, NOT `SelectTransfer` ───────────────────
 *
 * Figma uses the DS `SelectTransfer` for the AMOUNT on Add-a-Goal, and this form
 * deliberately does not. That component renders its currency picker
 * UNCONDITIONALLY — a `<button aria-label="Choose currency">` with no prop to
 * suppress it — so in a single-currency app it ships a control that is drawn and
 * announced and cannot do anything, which is exactly what Gate 44 ruled is worse
 * than no control. Registered as a DS gap rather than worked around with an
 * MVP-local override (rule 3). `Field` `type="number"` with the currency in the
 * LABEL is this app's settled answer for a money input — `BudgetFormModal`'s
 * "Amount (RM)" and `ReceiptEditor`'s "Total (RM)".
 *
 * ──────────────────────────────── NO TOAST ───────────────────────────────────
 *
 * Gate 51's rule is "toast only when the surface the user acted on disappears",
 * and the goal screen does not: the progress bar, the saved figure and Recent
 * Contributions all move under the closing modal, which is stronger feedback
 * than a toast and is the Gate 71 Create precedent ("the new card is the
 * feedback. Figma draws no toast").
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface TopUpModalProps {
  goal: Goal
  accounts: FiatAccount[]
  /** The pre-selected source — `AccountsProvider`'s `primaryAccount`. */
  defaultSourceId: string
  onClose: () => void
  /** A VALID amount and the chosen account. The screen builds the row. */
  onConfirm: (amount: number, sourceId: string) => void
}

export function TopUpModal({
  goal,
  accounts,
  defaultSourceId,
  onClose,
  onConfirm,
}: TopUpModalProps) {
  /*
    MOUNTED CONDITIONALLY BY THE SCREEN, so this initialiser runs once per OPEN
    and the form starts empty every time — `BudgetFormModal`'s shape, and the
    reason `TransactionFilterSheet` gives for the same choice.
  */
  const [draft, setDraft] = useState<TopUpDraft>(() => emptyTopUpDraft(defaultSourceId))

  const errors = topUpDraftErrors(draft, accounts)
  const validation = useTouchedValidation(errors)

  /*
    WHERE THE GOAL LANDS IF THIS TOP-UP GOES THROUGH.

    ONLY WHEN THE AMOUNT IS VALID, so it never prints a figure derived from a
    half-typed one: "RM 1.00" while the user is on their way to 125.50 is a
    worse statement than no statement. `errors.amount` is the SAME rule the
    Save attempt uses, so the preview appears exactly when the form would
    accept — it cannot promise a figure the write would refuse.

    IT IS THE SENTENCE THE TRANSFER DETAIL SHEET ALREADY PRINTS about a
    contribution that has happened (`goalProgressAfter`), which is the point:
    the form previews the fact, and the ledger states it afterwards, in the
    same words.
  */
  const preview = errors.amount
    ? null
    : goalProgressAfter(
        goal.name,
        (toSen(goal.savedAmount) + toSen(topUpAmount(draft))) / 100,
        goal.targetAmount,
      )

  const save = () => {
    if (!validation.attempt()) return
    onConfirm(topUpAmount(draft), draft.sourceId)
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Top-Up"
      footer={
        <>
          {/*
            "Confirm Top-Up", NOT "Top-Up", AND THE REASON IS PRACTICAL AS WELL
            AS EDITORIAL. The control that OPENS this modal is also labelled
            "Top-Up" and remains in the DOM behind the scrim, so two buttons
            would share one accessible name and every `getByRole` lookup for
            either would be ambiguous. The verb also says what pressing it does,
            which a bare noun does not — `BudgetFormModal`'s "Save Budget".
          */}
          <Button variant="primary" size="l" label="Confirm Top-Up" onClick={save} />
          <Button variant="secondary" size="l" label="Cancel" onClick={onClose} />
        </>
      }
    >
      <div ref={validation.formRef} className="mvp-topup" onBlur={validation.onBlur}>
        {/*
          THE DESTINATION IS STATED, NOT ASSUMED. The modal covers the goal
          screen, so the goal's name is behind the scrim at the moment the user
          is deciding how much to move. One line of text is cheaper than a title
          that has to carry a variable name and truncate.
        */}
        <p className="mvp-topup__destination type-body-sm">
          Moving money into <strong>{goal.name}</strong>
        </p>

        <Field
          label="Amount (RM)"
          type="number"
          name="amount"
          value={draft.amount}
          onChange={(amount: string) => setDraft((d) => ({ ...d, amount }))}
          ariaLabel="Amount in ringgit"
          sizing="fill"
          isRequired
          isInvalid={validation.isShown('amount')}
        />

        {/*
          `role="radiogroup"` WITH AN `aria-label`, exactly as `ReminderModal`
          composes its own — DS `Radio` is one control and the grouping is the
          consumer's. `data-field` makes the whole group ONE field to
          `useTouchedValidation`, so moving focus between the two options is not
          leaving it.
        */}
        <div className="mvp-topup__source" data-field="sourceId">
          <span className="mvp-topup__source-label type-body-caption-semibold">From</span>
          <div role="radiogroup" aria-label="Pay from">
            {accounts.map((account) => (
              <Radio
                key={account.id}
                name="topup-source"
                value={account.id}
                /*
                  THE BALANCE IS PART OF THE OPTION, not a separate readout.
                  See the header: the cap is this figure, so it is what the
                  choice is between.
                */
                label={`${account.name} · ${formatMyr(account.balance)}`}
                isChecked={draft.sourceId === account.id}
                onChange={() => setDraft((d) => ({ ...d, sourceId: account.id }))}
              />
            ))}
          </div>
        </div>

        {/*
          NOT `aria-live`. The preview appears and changes as the user types in
          the field directly above it, so announcing every keystroke would talk
          over them — the opposite of the `NoResults` case (Gate 80-C), where
          the block replaces a list the user is NOT looking at and the change is
          the only signal there is.
        */}
        {preview && <p className="mvp-topup__preview type-body-sm">{preview}</p>}
      </div>
    </Modal>
  )
}
