import { useState } from 'react'
import { Button, Field, Icon, Modal, OptionList, Select, Toggle } from '@monarch/design-system'
import { TRANSACTION_CATEGORIES } from '../../../data/transactions'
import type { Budget, TransactionCategoryId } from '../../../data/types'
import {
  budgetDraftErrors,
  categoriesLabel,
  draftFromBudget,
  draftToBudgetInput,
  EMPTY_BUDGET_DRAFT,
  isBudgetDraftChanged,
  orderCategories,
  type BudgetDraft,
  type BudgetInput,
} from '../budgetDraft'
import { useTouchedValidation } from '../useTouchedValidation'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CREATE / EDIT A BUDGET — Flow 10, Gate 71. Figma `Finance_Budget_add budget`
 * (`casestudy_02` `1266:14335`), and the category reference `Select`
 * (`1266:14336`) drawn expanded beside it.
 *
 * ONE FORM, TWO MODES. Figma draws only Create ("Create A Budget", "Save
 * Budget" / "Cancel"). Edit is Decision 6: the SAME fields, pre-filled, titled
 * "Edit Budget", with "Save Changes" / "Cancel", and — Decision 7A — a
 * borderless red "Delete budget" beneath them. Its confirmation is
 * `BudgetDeleteConfirm` below.
 *
 * A DS `Modal`, which is what Figma's geometry is: a 343-wide inset card, all
 * corners rounded, a header with a centred title and ✕, and a footer that is a
 * full-width vertical button stack. Focus trap, Escape, the scrim and the ✕ are
 * the DS's; ✕, Cancel, Escape and the scrim all DISCARD the draft, because the
 * draft lives in this component and the host unmounts it on close.
 *
 * ─────────────────────────────── THE FIELDS ───────────────────────────────────
 *
 * Name        DS `Field`, required, trimmed on save. No uniqueness rule.
 * Category    DS `Select` whose `menuSlot` is a `Menu` of `MenuItem`s, each with
 *             a checkbox GLYPH in its `iconSlot` — the Gate 46 merchant-picker
 *             composition (see `TransactionFilterSheet.tsx`, `boxGlyph`). Unlike
 *             that picker it DROPS DOWN rather than pushing a view: seven
 *             options fit, and Figma draws it expanded in place. So G21 (a
 *             trigger that navigates announcing `aria-expanded`) does not apply
 *             here — there is a real popup. G22 (no `aria-multiselectable`) and
 *             G23 (no ellipsis on a long joined value) DO apply, as registered.
 * Amount      DS `Field` `type="number"`. THE LABEL CARRIES THE CURRENCY —
 *             "Amount (RM)" — for `ReceiptEditor`'s "Total (RM)" reason: a
 *             number input cannot hold "RM 3200.00", which Figma prints inside
 *             the value. > 0, at most two decimals, at most RM 999,999.99.
 * From / To   DS `Field` `type="date"`, the receipt-editor precedent: the
 *             platform's own picker on a phone, no app-built calendar (the DS
 *             `DatePicker` needs one as a slot). Both required; To >= From.
 * Auto-Renew  DS `Toggle`. STORED AND SHOWN, NO BEHAVIOUR (ruling).
 *
 * ──────────────────────────── WHEN ERRORS SHOW ────────────────────────────────
 *
 * AFTER TOUCH, OR AFTER A SAVE ATTEMPT — Gate 71-B, decision 2C, through the
 * shared `useTouchedValidation` (the receipt editor uses the same hook). A
 * pristine Create form and a pre-filled Edit form open with nothing red; a
 * field turns red once it is left holding an invalid value, and clears live
 * the moment its value becomes valid. There is no message text (`Field` has no
 * helper-text prop), as before.
 *
 * THE PRIMARY BUTTON IS NEVER DISABLED. Pressing it with an invalid field saves
 * nothing, reveals every invalid field and focuses the first. One definition,
 * `budgetDraftErrors`, feeds both the red and that decision, so they cannot
 * disagree. An UNCHANGED, valid Edit form's Save Changes closes the modal
 * without writing — nothing is there to save.
 *
 * Gate 71 opened an empty Create form with five red fields (a live
 * `isInvalid` and a disabled Save). That is what this replaced.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * THE OPTION ROWS, AT MODULE SCOPE. `TRANSACTION_CATEGORIES` is a module
 * constant, so this derives once rather than on every render — and a stable
 * array identity is what keeps `OptionList`'s roving-tabindex effect from
 * re-running for no reason.
 */
const CATEGORY_OPTIONS = TRANSACTION_CATEGORIES.map((category) => ({
  id: category.id,
  label: category.label,
}))

export type BudgetFormModalProps =
  | {
      mode: 'create'
      onClose: () => void
      onSave: (input: BudgetInput) => void
    }
  | {
      mode: 'edit'
      budget: Budget
      onClose: () => void
      onSave: (input: BudgetInput) => void
      /** Opens the delete confirmation. The host owns it, so it can stack. */
      onDelete: () => void
    }

export function BudgetFormModal(props: BudgetFormModalProps) {
  const { mode, onClose, onSave } = props
  /*
    SEEDED ONCE, AT MOUNT. The host mounts this conditionally, so every open
    starts from the stored budget (Edit) or from nothing (Create) — the property
    `TransactionFilterSheet` gets the same way.
  */
  const [draft, setDraft] = useState<BudgetDraft>(() =>
    props.mode === 'edit' ? draftFromBudget(props.budget) : EMPTY_BUDGET_DRAFT,
  )
  /**
   * THE CATEGORY PICKER IS A VIEW, NOT A DROPDOWN — Gate 74-B.
   *
   * It was a `Select` whose `menuSlot` dropped a `Menu` panel over the
   * Amount and date fields, and it needed a capture-phase `pointerdown`
   * listener to close on an outside press, because `Select` has none of its
   * own. Both are gone: the trigger now switches the MODAL'S OWN CONTENT to a
   * selection view, so there is no floating panel to dismiss and no second
   * surface stacked on the form.
   *
   * THE DRAFT IS A DRAFT. `pickerDraft` is seeded from the form when the view
   * opens and reaches `draft.categories` only through "Add N Categories", so
   * Back discards. That is the `TransactionFilterSheet` pending-copy shape, and
   * it is what a footer commit REQUIRES: without it, Back would silently keep
   * whatever had been tapped.
   */
  const [view, setView] = useState<'form' | 'categories'>('form')
  const [pickerDraft, setPickerDraft] = useState<TransactionCategoryId[]>([])

  const openCategories = () => {
    setPickerDraft(draft.categories)
    setView('categories')
  }

  const commitCategories = () => {
    setDraft((current) => ({ ...current, categories: orderCategories(pickerDraft) }))
    setView('form')
  }

  const errors = budgetDraftErrors(draft)
  const validation = useTouchedValidation(errors)

  const set = <K extends keyof BudgetDraft>(key: K) => (value: BudgetDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  /** The picker's own toggle. It writes the DRAFT, never the form. */
  const toggleCategory = (ids: string[]) => setPickerDraft(orderCategories(ids as TransactionCategoryId[]))

  const save = () => {
    if (!validation.attempt()) return
    if (props.mode === 'edit' && !isBudgetDraftChanged(props.budget, draft)) {
      onClose()
      return
    }
    onSave(draftToBudgetInput(draft))
  }

  const isCategoryView = view === 'categories'

  /**
   * PLURALISED FROM THE COUNT, never from a stored string. Zero still renders
   * a label rather than an empty button: the control is disabled, and a
   * disabled button with no words is a control that explains nothing.
   */
  const addCategoriesLabel = `Add ${pickerDraft.length} ${pickerDraft.length === 1 ? 'Category' : 'Categories'}`

  return (
    <Modal
      isOpen
      onClose={onClose}
      /*
        THE TITLE BECOMES THE TASK in the selection view, and the header's own
        back control returns to the form while `onClose` still dismisses the
        whole modal. Two different exits, two different controls — which is
        what the single hand-rolled affordance could not express.
      */
      title={isCategoryView ? 'Select category' : mode === 'create' ? 'Create A Budget' : 'Edit Budget'}
      onBack={isCategoryView ? () => setView('form') : undefined}
      backLabel="Back to the budget form"
      /* R6 — full-bleed rows; see TransactionFilterSheet for the same call. */
      contentPadding={isCategoryView ? 'none' : 'default'}
      footer={
        isCategoryView ? (
          /*
            VERB PLUS COUNT, DISABLED AT ZERO. The verb follows the
            destination: these go back INTO a form field, so "Add". Zero is a
            genuinely invalid budget (`budgetDraftErrors` requires at least one
            category), which is what makes disabling honest here rather than a
            dead end.
          */
          <Button
            variant="primary"
            size="l"
            label={addCategoriesLabel}
            isDisabled={pickerDraft.length === 0}
            onClick={commitCategories}
          />
        ) : (
        <>
          <Button
            variant="primary"
            size="l"
            label={mode === 'create' ? 'Save Budget' : 'Save Changes'}
            onClick={save}
          />
          <Button variant="secondary" size="l" label="Cancel" onClick={onClose} />
          {props.mode === 'edit' && (
            /*
              DECISION 7A: borderless, red, with a bin. `tone="error"` is honoured
              on `variant="tertiary"` ONLY (`Button.tsx:40` — the only
              combination Figma draws: a Tertiary instance whose label and icon
              are overridden to the error tokens). The dark-mode contrast
              shortfall of `--mapped-text-error-default` is accepted and deferred
              to the DS round (Gate 26 records it on the card surface).
            */
            <Button
              variant="tertiary"
              tone="error"
              size="l"
              label="Delete budget"
              leadingIcon={<Icon name="delete" size="l" />}
              onClick={props.onDelete}
            />
          )}
        </>
        )
      }
    >
      {isCategoryView ? (
        <OptionList
          selectionMode="multiple"
          ariaLabel="Category"
          options={CATEGORY_OPTIONS}
          value={pickerDraft}
          onChange={toggleCategory}
        />
      ) : (
      <div ref={validation.formRef} className="mvp-budget-form" onBlur={validation.onBlur}>
        <Field
          label="Name"
          name="name"
          value={draft.name}
          onChange={set('name')}
          ariaLabel="Name"
          sizing="fill"
          isRequired
          isInvalid={validation.isShown('name')}
        />
        <div className="mvp-budget-form__category" data-field="categories">
          {/*
            A TRIGGER THAT NAVIGATES. It is pinned closed and its open request
            is intercepted, exactly as the merchant trigger has been since Gate
            46 — so the control opens the selection view instead of a popup,
            and there is no `menuSlot` at all.

            G21 IS STILL OPEN AND NOW APPLIES HERE TOO. `Select` renders
            `aria-expanded` unconditionally, so this control permanently
            announces a collapsed popup that does not exist. Registered, not
            worked around: `SelectProps` exposes no role or aria passthrough.
          */}
          <Select
            label="Category"
            ariaLabel="Category"
            sizing="fill"
            searchable={false}
            value={categoriesLabel(draft.categories)}
            isSelected={draft.categories.length > 0}
            isInvalid={validation.isShown('categories')}
            isOpen={false}
            onOpenChange={(open) => {
              if (open) openCategories()
            }}
          />
        </div>
        <Field
          label="Amount (RM)"
          type="number"
          name="amount"
          value={draft.amount}
          onChange={set('amount')}
          ariaLabel="Amount in ringgit"
          sizing="fill"
          isRequired
          isInvalid={validation.isShown('amount')}
        />
        {/* Figma's `Frame 471`: the two dates side by side, 10px apart. */}
        <div className="mvp-budget-form__dates">
          <Field
            label="Date (From)"
            type="date"
            name="from"
            value={draft.from}
            onChange={set('from')}
            ariaLabel="Date from"
            sizing="fill"
            isRequired
            isInvalid={validation.isShown('from')}
          />
          <Field
            label="Date (To)"
            type="date"
            name="to"
            value={draft.to}
            onChange={set('to')}
            ariaLabel="Date to"
            sizing="fill"
            isRequired
            isInvalid={validation.isShown('to')}
          />
        </div>
        {/* Figma's `Frame 404`: the label left, the toggle right. */}
        <div className="mvp-budget-form__renew">
          <span className="mvp-budget-form__renew-label type-body-caption-semibold">
            Auto-Renew Each Month
          </span>
          <Toggle
            isChecked={draft.autoRenew}
            onChange={set('autoRenew')}
            ariaLabel="Auto-Renew Each Month"
          />
        </div>
      </div>
      )}
    </Modal>
  )
}

/**
 * THE DELETE CONFIRMATION — Decision 7A. Not drawn; composed exactly as the
 * receipt viewer's `ConfirmModal` is (`ReceiptViewer.tsx`): a DS `Modal`, one
 * line of body, and a footer of an OUTLINED Cancel (`secondary`, the safe
 * action) and a red Delete. It STACKS over the Edit modal, so Cancel returns to
 * it unchanged.
 *
 * THE RED DELETE IS `tertiary` + `tone="error"`, because that is the only
 * pairing `Button` honours — there is no filled or outlined red. So "a red
 * Delete" here is red TEXT and a red bin on no fill, the same as the Edit
 * modal's "Delete budget".
 */
export function BudgetDeleteConfirm({
  name,
  onCancel,
  onConfirm,
}: {
  name: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Delete budget?"
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
      <p className="mvp-budget-delete__body type-body-sm">
        {`This removes '${name}' and its settings. Your transactions aren't affected. This can't be undone.`}
      </p>
    </Modal>
  )
}
