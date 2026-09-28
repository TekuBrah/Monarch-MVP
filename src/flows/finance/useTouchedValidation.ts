import { useCallback, useEffect, useRef, useState, type FocusEvent } from 'react'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WHEN A FORM SHOWS ITS ERRORS — Gate 71-B, decision 2C. One mechanism, shared
 * by the budget form (`BudgetFormModal`) and the receipt editor
 * (`ReceiptEditor`, whose Save lives in `ReceiptViewerHost`'s footer).
 *
 * THE RULE. A field shows invalid only once it has been LEFT (blurred) holding
 * an invalid value, or after a Save attempt. A pristine form shows no red, and
 * neither does a pre-filled valid one. Once a field is red it is re-evaluated
 * LIVE, so it clears the moment its value becomes valid — no second blur.
 *
 * SAVE IS NEVER DISABLED. Pressing it with any invalid field saves nothing,
 * reveals every invalid field at once, and moves focus to the first of them in
 * DOM order. A disabled Save with no red would give the user a dead button and
 * no reason; a disabled button also gives assistive technology none.
 *
 * WHAT THIS HOOK DOES NOT OWN: the rules. Each form passes in its own per-field
 * error record, computed by one function (`budgetDraftErrors`,
 * `receiptDraftErrors`), and `attempt()` decides from that same record whether
 * the save may proceed — so what shows red after an attempt and what blocks the
 * save cannot disagree.
 *
 * HOW A FIELD IS "LEFT". DS `Field` and `Select` take no `onBlur`, so the form's
 * container listens for `focusout` (React's bubbling `onBlur`) and names the
 * field from the element that lost focus: its nearest `[data-field]` ancestor if
 * there is one, else the input's own `name`. A `[data-field]` wrapper is a
 * SCOPE — focus moving between elements inside it (the category `Select`'s
 * input, its chevron and its menu options) is not leaving the field.
 *
 * WHY IT LIVES HERE, beside `useReceiptRetake`: both consumers are finance-flow
 * forms and nothing outside the flow uses it. `src/components/` holds
 * promoted COMPONENTS; a hook with two callers in one flow is the flow's.
 *
 * RESETTING. The budget form is mounted per open, so its state resets with the
 * draft by construction. The receipt editor is a VIEW of an always-mounted host,
 * so the host calls `reset()` whenever it seeds or drops the draft.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function useTouchedValidation<K extends string>(errors: Readonly<Record<K, boolean>>) {
  const formRef = useRef<HTMLDivElement>(null)
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set())
  /*
    A COUNTER, NOT A FLAG. The focus move below must happen on EVERY failed
    attempt, including a second one after the user tabbed away, and an effect
    keyed on a boolean that is already `true` would not re-run.
  */
  const [attempts, setAttempts] = useState(0)

  /*
    FOCUS THE FIRST INVALID FIELD, AFTER THE COMMIT THAT MARKED IT. The attempt
    and the red land in one render, so by the time this effect runs every
    invalid control carries `aria-invalid="true"` — and `querySelector` returns
    the first in document order, which is the order the user reads the form.
  */
  useEffect(() => {
    if (attempts === 0) return
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attempts])

  const isShown = (key: K): boolean => errors[key] && (attempts > 0 || touched.has(key))

  const onBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    const scope = target.closest<HTMLElement>('[data-field]')
    const key = scope?.dataset.field ?? target.getAttribute('name')
    if (!key) return
    const next = event.relatedTarget
    if (scope && next instanceof Node && scope.contains(next)) return
    setTouched((previous) => (previous.has(key) ? previous : new Set(previous).add(key)))
  }, [])

  /** True when the form may save. False reveals every invalid field and focuses the first. */
  const attempt = (): boolean => {
    const isValid = !(Object.values(errors) as boolean[]).some(Boolean)
    if (!isValid) setAttempts((n) => n + 1)
    return isValid
  }

  const reset = useCallback(() => {
    setTouched(new Set())
    setAttempts(0)
  }, [])

  return { formRef, onBlur, isShown, attempt, reset }
}
