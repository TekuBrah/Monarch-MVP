import { useEffect, useRef, useState } from 'react'
import { Button, Field, Icon, Menu, MenuItem, Modal, Select, Toggle } from '@monarch/design-system'
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

/** The checkbox glyph — `TransactionFilterSheet`'s `boxGlyph`, same two shipped assets. */
function boxGlyph(isSelected: boolean): 'check_box' | 'check_box_outline_blank' {
  return isSelected ? 'check_box' : 'check_box_outline_blank'
}

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
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)

  /*
    A PRESS ANYWHERE OUTSIDE THE CATEGORY CONTROL CLOSES ITS MENU. `Select` has
    no outside-press handling of its own — only its chevron toggles — so without
    this the open menu would sit over the Amount and date fields until the user
    found the chevron. Capture phase, so it runs before the pressed control's
    own handler. Escape is NOT handled here: the DS `Modal` owns Escape and
    closes the whole modal, which discards the draft like every other dismissal.
  */
  useEffect(() => {
    if (!isPickerOpen) return
    const onPress = (event: PointerEvent) => {
      if (!categoryRef.current?.contains(event.target as Node)) setIsPickerOpen(false)
    }
    document.addEventListener('pointerdown', onPress, true)
    return () => document.removeEventListener('pointerdown', onPress, true)
  }, [isPickerOpen])

  const errors = budgetDraftErrors(draft)
  const validation = useTouchedValidation(errors)

  const set = <K extends keyof BudgetDraft>(key: K) => (value: BudgetDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const toggleCategory = (id: TransactionCategoryId) =>
    setDraft((current) => ({
      ...current,
      categories: orderCategories(
        current.categories.includes(id)
          ? current.categories.filter((c) => c !== id)
          : [...current.categories, id],
      ),
    }))

  const save = () => {
    if (!validation.attempt()) return
    if (props.mode === 'edit' && !isBudgetDraftChanged(props.budget, draft)) {
      onClose()
      return
    }
    onSave(draftToBudgetInput(draft))
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={mode === 'create' ? 'Create A Budget' : 'Edit Budget'}
      footer={
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
      }
    >
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
        <div ref={categoryRef} className="mvp-budget-form__category" data-field="categories">
          <Select
            label="Category"
            ariaLabel="Category"
            sizing="fill"
            searchable={false}
            value={categoriesLabel(draft.categories)}
            isSelected={draft.categories.length > 0}
            isInvalid={validation.isShown('categories')}
            isOpen={isPickerOpen}
            onOpenChange={setIsPickerOpen}
            menuSlot={
              /* `--menu-width` is the DS's own seam (`.mn-menu`'s 426px default is
                 wider than the card), set by `.mvp-budget-form__menu`. */
              <div className="mvp-budget-form__menu">
                <Menu
                  searchBar={false}
                  listAriaLabel="Category"
                  slotContent={TRANSACTION_CATEGORIES.map((category) => {
                    const isPicked = draft.categories.includes(category.id)
                    return (
                      <MenuItem
                        key={category.id}
                        label={category.label}
                        isSelected={isPicked}
                        iconSlot={<Icon name={boxGlyph(isPicked)} size="m" />}
                        onSelect={() => toggleCategory(category.id)}
                      />
                    )
                  })}
                />
              </div>
            }
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
