import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Blanket, Icon, IconButton } from '@monarch/design-system'
import type { Receipt } from '../../../data/types'
import { ReceiptCard } from './ReceiptCard'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CAPTURE SOURCE PICKER — Figma `I1266:14281;1033:11135` (Gate 50).
 *
 * REBUILT IN MONARCH'S SYSTEM RATHER THAN TRANSCRIBED, and rather than filed as
 * a DS gap. Teku's decision C, settled: register G2 is CLOSED as MVP-LOCAL and
 * U3 is answered. Do not reopen either.
 *
 * WHAT THE FIGMA NODE ACTUALLY IS, measured not assumed: `get_variable_defs` on
 * the whole overlay `1033:11135` returns EXACTLY ONE binding —
 * `Blanket/default/default` — and on the grouped rows `1033:11226` it returns
 * `{}`, nothing at all. Every fill, radius, font, and colour in that node is a
 * raw literal. It is a pasted iOS action sheet, and a design system does not
 * ship a pasted Apple asset.
 *
 * SO THE SHAPE SURVIVES AND THE SKIN DOES NOT. Grouped-and-separated — the
 * source rows joined by hairlines, then a gap, then Cancel standing alone — is
 * a real design decision that distinguishes a SOURCE PICKER from a sheet: the
 * gap is what says "this one is not one of the choices". That is kept.
 *
 * ⚠️ IT DREW TWO SOURCE ROWS UNTIL GATE 52 AND DRAWS THREE NOW — "Receipt
 * library" joined Photo Gallery and Camera inside the same box, and choosing it
 * swaps this panel to a list of unlinked receipts. The GROUPING RULE is what
 * decided where it went: the box answers "where is this receipt coming from",
 * and the library is a third answer to that question rather than a new kind of
 * thing. Cancel stays outside it, which is the whole point of the shape. The font,
 * the colour and the radius are Apple's, and SF Pro Text does not exist on the
 * Android device this app is actually tested on, so it is not even a faithful
 * transcription there — it is a silent fallback to whatever Android has.
 *
 * ─────────────── THE SUBSTITUTIONS, each with what it replaced ───────────────
 *
 *   font        SF Pro Text 17    -> Poppins via `type-body-m` / `-semibold`
 *   tint        #007aff           -> `--mapped-text-primary-default`
 *   panel       rgba(255,255,255, -> `--mapped-surface-elevation-default`
 *               0.8 / 0.9) plus
 *               backdrop-blur(25px)
 *   radius      10                -> `--brand-scale-200` (8)
 *   hairline    a 1px SVG line    -> a real border, `--brand-scale-25` (1px)
 *
 * THE TINT IS NOT `#046eff`, AND THAT IS A DELIBERATE DEPARTURE FROM THE BRIEF.
 * `#046eff` is `--brand-blue-500`, a RAW brand primitive: writing it would
 * breach rule 2, and — the substantive objection — a raw brand value CANNOT
 * DARK-FLIP, so the picker would paint mid-blue text on a near-black panel in
 * dark mode. `--mapped-text-primary-default` is the semantic token for
 * primary-tinted text (it is what `.mn-link--default` binds) and it resolves to
 * `--brand-blue-600` in light and `--brand-blue-300` in dark since DS v1.15.0.
 * The intent — "Monarch blue, not Apple blue" — is honoured; the mechanism is
 * the one that survives a theme.
 *
 * NO BACKDROP BLUR. The DS ships no blur token and blurs nothing anywhere; an
 * MVP-local `backdrop-filter` would be inventing a treatment, which is rule 3's
 * territory rather than a taste call.
 *
 * ─────────────────────────── GEOMETRY, DERIVED ───────────────────────────────
 *
 * Read from `get_metadata` on the frame, in a 375 frame:
 *
 *   Group 3 (the pair)  x=10  y=584  355 x 123
 *     Photo Gallery     x=10  y=584  355 x 61
 *     hairline          x=10  y=646  355 x ~0
 *     Camera            x=10  y=646  355 x 61
 *   Group 2 (Cancel)    x=10  y=717  355 x 61
 *
 * so: 10px each side (355 = 375 - 20), rows 61, a 1px rule between the pair,
 * a 10px gap before Cancel, and 34px from Cancel's foot to the frame bottom.
 *
 * THE ROWS ARE 64 HERE, NOT 61, AND EVERY NUMBER IN THAT IS A TOKEN OR A TYPE
 * METRIC. 61 decomposes as 20 + 21 + 20: SF Pro Text's 21px line box between
 * 20px paddings. 20 IS a ramp step (`--brand-scale-500`), so the padding is
 * transcribed EXACTLY; Poppins' `body/m` line box is 24 rather than 21, so the
 * row hugs to 64. The +3 is the type substitution showing through, not a
 * rounding, and there is no literal anywhere in it.
 *
 * 10 IS A REAL TOKEN — `--brand-scale-250` — so the side margins and the
 * separating gap are transcribed exactly rather than rounded. (The ramp has no
 * 44 and no 50, but it does have 10 and 20; check before assuming.)
 *
 * THE 34 IS ROUNDED TO 32 (`--brand-scale-800`), plus the safe-area inset. 34 is
 * iOS's home-indicator zone and is off the ramp; rounding to the nearest step is
 * the DS's own established move (StatusBar 5->4, BottomNavigation 62->64, Sheet
 * 44->48) rather than adding a permanent literal. `env(safe-area-inset-bottom)`
 * then adds the real inset back on a device that grants one — 0 in the harness,
 * per Gate 44.
 *
 * ─────────────────────── WHY IT IS A `role="dialog"` ─────────────────────────
 *
 * It is modal: it has a scrim, it takes focus, Escape dismisses it, and nothing
 * behind it is operable. Declaring it as anything else would be describing it
 * inaccurately to a screen reader AND would put it outside the harness's overlay
 * invariant, which reads `[role="dialog"]` — a modal surface the suite cannot
 * see is exactly the leak that invariant exists to catch.
 *
 * IT CARRIES `aria-label` RATHER THAN `aria-labelledby`, because Figma draws no
 * title on it. `readOpenDialogs` in the harness falls back to `aria-label` for
 * precisely this case, so the state declares "Add a receipt" and the assertion
 * is exact.
 *
 * IT IS NOT BUILT ON DS `Modal`. Modal centres vertically, always renders a ✕,
 * and paints one card; this is bottom-anchored, has no header at all, and paints
 * two separated groups. Passing that through Modal would mean overriding its
 * position, hiding its close button and defeating its card — four overrides to
 * borrow a scrim. `Blanket` is the DS piece that actually applies, and it is
 * used directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ReceiptSourcePickerProps {
  /** Take a new photo. Fires the file input with `capture="environment"`. */
  onCamera: () => void
  /** Choose existing images. Fires the file input with `multiple`. */
  onGallery: () => void
  /**
   * Every receipt with no transaction — the library view's whole content.
   *
   * PASSED IN, NOT LOOKED UP. `ReceiptCard` takes a transaction rather than
   * resolving one itself, and this follows it: the screen already holds
   * `useAccounts()`, and a presentational overlay that reached for a context
   * would be a second place deciding what "unlinked" means.
   */
  unlinkedReceipts: Receipt[]
  /** Link that receipt to the transaction this picker was opened from. */
  onPickReceipt: (receiptId: string) => void
  /** Dismiss — the Cancel row, the scrim, and Escape all route here. */
  onClose: () => void
}

export function ReceiptSourcePicker({
  onCamera,
  onGallery,
  unlinkedReceipts,
  onPickReceipt,
  onClose,
}: ReceiptSourcePickerProps) {
  const id = useId()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  /*
    ONE SURFACE, TWO VIEWS (Gate 52) — the shape `AddReceiptsModal` already uses
    for its three phases, and `TransactionFilterSheet` for its filters/merchant
    swap. Choosing the library SWAPS THIS PANEL'S CONTENT; it does not stack a
    second overlay. A stacked surface would give the user two scrims and two
    dismiss gestures for one task, and would put the question "which one am I
    dismissing" in front of them.
  */
  const [view, setView] = useState<'choice' | 'library'>('choice')

  /*
    ESCAPE AND INITIAL FOCUS, patterned on `Modal.tsx` rather than reinvented —
    the same `keydown` capture listener, the same "focus the first focusable,
    else the panel", the same restore on unmount. It is copied deliberately so
    that an MVP-local overlay behaves like a DS one; if the DS ever exposes this
    as a hook, this is its first adopter.

    `stopPropagation` ON ESCAPE IS LOAD-BEARING HERE IN A WAY IT IS NOT IN MODAL.
    This picker opens ON TOP of the transaction detail `Sheet`, which has its own
    document-level Escape listener. Without the stop, one Escape press would
    close both — the picker AND the sheet underneath it — which is not what a
    dismiss gesture on the top surface means.

    IT DEPENDS ON `onClose` ONLY, NOT ON `view`. Escape dismisses the whole
    picker from either view rather than stepping back one, which is what the
    scrim and Cancel also do. Re-running this effect on a view swap would also
    re-focus the panel and undo wherever focus had moved to.
  */
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const focusable = panel?.querySelector<HTMLElement>('button')
    ;(focusable ?? panel)?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      previouslyFocused.current?.focus?.()
    }
  }, [onClose])

  return createPortal(
    <div className="mvp-source-picker">
      <Blanket onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        /*
          THE ACCESSIBLE NAME DOES NOT CHANGE WITH THE VIEW, which is the ruling
          `AddReceiptsModal` already set across its own three phases: a dialog is
          still the same dialog when its content changes. The harness therefore
          declares one name for both walk states and tells them apart by their
          `prepare` steps.
        */
        aria-label="Add a receipt"
        tabIndex={-1}
        id={id}
        className="mvp-source-picker__panel"
      >
        {view === 'choice' ? (
          /*
            THE GROUPED SET. One rounded box, now THREE rows, each rule a
            `border-top` on the row below it rather than a separate element — so
            there is no extra child to keep in step and a rule cannot outlive
            either row it separates.

            "RECEIPT LIBRARY" IS A THIRD SOURCE, NOT A THIRD KIND OF THING. It
            belongs in this box for the same reason Camera does: all three answer
            "where is this receipt coming from". The group below is separated
            because it answers a different question entirely.
          */
          <div className="mvp-source-picker__group">
            <button
              type="button"
              className="mvp-source-picker__row type-body-m"
              onClick={onGallery}
            >
              Photo Gallery
            </button>
            <button
              type="button"
              className="mvp-source-picker__row mvp-source-picker__row--ruled type-body-m"
              onClick={onCamera}
            >
              Camera
            </button>
            <button
              type="button"
              className="mvp-source-picker__row mvp-source-picker__row--ruled type-body-m"
              onClick={() => setView('library')}
            >
              Receipt library
            </button>
          </div>
        ) : (
          <>
            {/*
              THE HEADER ROW IS NOT ITSELF THE BACK CONTROL. Making the whole row
              a button would give it the accessible name "Receipt library", which
              names where the user IS rather than what pressing it DOES. The back
              affordance is its own labelled control and the title sits beside it.
            */}
            <div className="mvp-source-picker__group mvp-source-picker__header">
              <IconButton
                variant="tertiary"
                size="s"
                icon={<Icon name="arrow_back" size="m" />}
                ariaLabel="Back to receipt source"
                onClick={() => setView('choice')}
              />
              <span
                id={titleId}
                className="mvp-source-picker__title type-body-m-semibold"
              >
                Receipt library
              </span>
            </div>

            {unlinkedReceipts.length === 0 ? (
              /*
                A PLAIN EMPTY STATE, AND DELIBERATELY NOT A `ComingSoon`. Nothing
                here is missing or unbuilt — the library genuinely holds no
                unlinked receipt, which is the ordinary state once every capture
                has found its transaction. It offers no action of its own because
                the two actions that would fix it are one tap behind it.
              */
              <p className="mvp-source-picker__group mvp-source-picker__empty type-body-sm">
                Every receipt in your library is already linked to a transaction.
              </p>
            ) : (
              <ul className="mvp-source-picker__library">
                {unlinkedReceipts.map((receipt) => (
                  <li key={receipt.id}>
                    {/*
                      `ReceiptCard` WITH `transaction` OMITTED, WHICH IS THE
                      `Linked=No` VARIANT BY CONSTRUCTION — every row here is
                      unlinked by definition, so there is nothing to pass and no
                      "Linked" pill to suppress. It is already a `<button>`, so
                      it needs no wrapper to be operable, and at 64 tall it is the
                      same row height as the three choices behind it.
                    */}
                    <ReceiptCard
                      receipt={receipt}
                      onOpen={() => onPickReceipt(receipt.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/*
          CANCEL IS ITS OWN GROUP, SEPARATED BY 10px, AND THAT GAP IS THE WHOLE
          POINT OF THE SHAPE. It is what says Cancel is not a source. Merge the
          two groups and the surface stops being a source picker and becomes a
          menu with a strange last item.

          IT IS PRESENT IN BOTH VIEWS. Back steps one view; Cancel dismisses the
          whole picker. Dropping it from the library view would leave the scrim
          and Escape as the only ways out of a view the user reached by choice.

          SEMIBOLD, as drawn — the one weight difference in the surface, and it
          is doing the same job the gap is.
        */}
        <div className="mvp-source-picker__group">
          <button
            type="button"
            className="mvp-source-picker__row type-body-m-semibold"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
