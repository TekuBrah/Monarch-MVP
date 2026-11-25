import { useEffect, useRef } from 'react'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WHERE FOCUS GOES WHEN A FORM'S PICKER VIEW OPENS AND CLOSES — Gate 113 (R6).
 * Shared by the three dropdown-in-form pickers: the Budget form's Category
 * (`BudgetFormModal`), the filter sheet's Merchant (`TransactionFilterSheet`)
 * and the Goal form's Funding Source (`GoalFormModal`).
 *
 * BEFORE THIS GATE FOCUS FELL TO `body` BOTH WAYS. The trigger is hidden (or was
 * unmounted) the moment its picker opens, and the picker's own back control is
 * gone the moment it closes, so in all three pickers the focused element went
 * away with the view and the document was what was left — measured at Gate 112
 * Phase A and again here. A keyboard user then had nowhere to continue from,
 * and Tab from `body` leaves a modal for the page behind it (the DS focus trap
 * acts only on its first and last stops).
 *
 * THE RULE, the transaction detail sheet's (Gate 89 B7, Gate 89-B):
 *  - ON OPEN, focus moves to the selected option, or the first option when none
 *    is selected, without scrolling the page; the option is then revealed inside
 *    the picker's own scroll box only (never the document).
 *  - ON RETURN — Back, or a commit — focus goes back to the trigger that opened
 *    the view.
 *  - POINTER-AWARE. After a pointer activation the focus is moved with
 *    `focusVisible: false` (Chromium 145, Safari 18.4, Firefox 104), so no
 *    `:focus-visible` ring is carried by the script focus; after a keyboard
 *    activation the platform's own heuristic decides, which rings it.
 *
 * HOW "POINTER" IS KNOWN — THE ACTIVATION'S OWN CLICK, as Gate 89-B reads the
 * pick's. A capture-phase `click` listener on the document records whether the
 * most recent click came from a pointer (`detail > 0`); a keyboard activation of
 * a button dispatches a click with `detail` 0, and a keyboard pick in an
 * `OptionList` dispatches none. The flag is READ for the open focus and then
 * CLEARED, so inside the picker only a click made there can set it — a keyboard
 * pick after a pointer open still rings on return. Needed because the DS back
 * control's `onBack` is typed `() => void` and the closing click is not handed
 * over (Gate 89-B declined to rely on the untyped argument; so does this).
 *
 * ⚠ THE DS `Select` PAINTS ITS FOCUS WITH `:focus-within`, NOT `:focus-visible`
 * (`Select.css:120-134`). So `focusVisible: false` withholds the `:focus-visible`
 * match, but a focused trigger still draws the field's own focused border after
 * a pointer return — the same state as just after clicking it. Registered as a
 * DS finding (gap register 2bc); not overridden here.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function usePickerFocus(isPicking: boolean) {
  /** Wraps the trigger; its first input or button is what focus returns to. */
  const trigger = useRef<HTMLDivElement>(null)
  /** Wraps the picker's options; also the box an option is revealed within. */
  const picker = useRef<HTMLDivElement>(null)
  const byPointer = useRef(false)
  const wasPicking = useRef(false)

  useEffect(() => {
    const record = (event: MouseEvent) => {
      byPointer.current = event.detail > 0
    }
    document.addEventListener('click', record, true)
    return () => document.removeEventListener('click', record, true)
  }, [])

  useEffect(() => {
    // TypeScript 5.8's DOM lib does not declare `focusVisible` yet.
    const options = (): FocusOptions & { focusVisible?: boolean } =>
      byPointer.current ? { preventScroll: true, focusVisible: false } : { preventScroll: true }

    if (isPicking) {
      wasPicking.current = true
      const pane = picker.current
      const target =
        pane?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]') ??
        pane?.querySelector<HTMLElement>('[role="option"]')
      if (pane && target) {
        target.focus(options())
        const box = pane.getBoundingClientRect()
        const row = target.getBoundingClientRect()
        if (row.bottom > box.bottom) pane.scrollTop += row.bottom - box.bottom
        else if (row.top < box.top) pane.scrollTop -= box.top - row.top
      }
      byPointer.current = false
    } else if (wasPicking.current) {
      wasPicking.current = false
      trigger.current?.querySelector<HTMLElement>('input, button')?.focus(options())
      byPointer.current = false
    }
  }, [isPicking])

  return { trigger, picker }
}
