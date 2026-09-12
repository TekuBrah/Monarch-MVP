import { Field } from '@monarch/design-system'
import type { ReceiptEdit } from '../../../accounts/AccountsProvider'
import type { Receipt } from '../../../data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RECEIPT EDITOR — Gate 51-B, item E. NOT DRAWN.
 *
 * NO FIGMA FRAME EXISTS, and Teku ruled (decision 1B, 11 Sept) that this is
 * designed from the app's own UI behaviour. Every choice below carries its
 * reason for that reason.
 *
 * IT IS WHAT REPLACED PER-FIELD CONFIDENCE MARKING, and that is the whole
 * argument for building it. The standing ruling was option B — flag the fields
 * OCR was unsure of and offer an inline edit — and it rested on one falsifiable
 * assumption: that Tesseract's per-word confidence discriminates correct reads
 * from incorrect ones. Gate 50-B measured it over all ten seeded receipts and it
 * does not: AUC 0.642 over 486 pairs, precision never above 0.231, and a
 * threshold catching all nine errors flags 51 of 63 fields. The decisive case is
 * on this repo's own fixture — `receipt_ikea02`'s SST reads 7.19 where the paper
 * prints 7.79, and it scores 77, the EXACT MEDIAN of the correct population.
 *
 * So: parse everything, mark nothing, and let a human correct any field. That
 * is option A, the recorded fallback, and this is it.
 * ─────────────────────────────────────────────────────────────────────────────
 * NATIVE INPUT TYPES INSIDE DS `Field`s, AND **NOT** DS `DatePicker` /
 * `TimePicker` — a deliberate composition choice with a measured reason.
 *
 * Both components ship. Each takes its calendar grid or its time list as an
 * APP-PROVIDED SLOT (`DatePicker.calendarSlot`, `TimePicker.timesSlot`) and
 * gates opening on it — `const showCalendar = open && !!calendarSlot`. THE DS
 * SHIPS NEITHER, and no calendar component exists anywhere in it (checked: 49
 * components, none of them a calendar or a date grid). Using them would mean the
 * MVP inventing a calendar grid with no Figma frame to draw it from, which is
 * far more invented UI than this gate should carry — and the register already
 * records the generalised decision that "the DS ships no calendar and none is
 * built" (§2, Gate 46 sweep). No new gap number was opened for it; G6 already
 * carries `DatePicker`'s prop gap.
 *
 * `Field` FORWARDS `type` STRAIGHT TO ITS `<input>` (`Field.tsx:107`), so
 * `type="date"` and `type="time"` give the PLATFORM's own picker on a device
 * while keeping the DS's box, label, focus ring and invalid treatment. That
 * composes without a single DS change.
 *
 * `Field` EXPOSES NO `inputMode` PROP. `type="number"` is what gives a numeric
 * keypad; if its spinner ever reads wrong inside the DS box, that is reported
 * and shipped short, never patched with an MVP rule reaching into `.mn-field`.
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS NOT EDITABLE: `tax` and `lineItems`. Neither is surfaced here at all.
 * Correcting a line item is transcription work rather than correction of a
 * misread, there is no drawn surface for it, and `receiptSubtotal` derives from
 * the lines — so an edited line would silently move a figure the detail sheet
 * prints beside a total the paper does print.
 * ─────────────────────────────────────────────────────────────────────────────
 * IT WRITES THE RECEIPT ONLY (principle P6), AND IT NEVER RE-RUNS AUTO-MATCH.
 * Auto-match is locked to once, at add time (Gate 50-C); re-running it after an
 * edit would find an unlinked receipt's transaction receipt-less and re-link the
 * very receipt the user had just taken away from it.
 */

/** The editor's four controls as strings, which is what an `<input>` holds. */
export interface EditorDraft {
  merchant: string
  /** `YYYY-MM-DD`, the shape `<input type="date">` reads and writes. */
  date: string
  /** `HH:mm`, the shape `<input type="time">` reads and writes. */
  time: string
  /** Plain decimal, no currency symbol and no separators. */
  total: string
}

/**
 * A stored `capturedAt` split into the two controls.
 *
 * BY STRING SLICE, NOT BY `new Date()`. `capturedAt` is a zone-less local
 * wall-clock string, so parsing it into a `Date` and formatting it back would
 * route the value through the device's zone for no reason — the exact
 * round-trip Gate 51's item T removed from the capture path. A slice cannot
 * shift an hour.
 */
export function draftFrom(receipt: Receipt): EditorDraft {
  return {
    merchant: receipt.merchant,
    date: receipt.capturedAt.slice(0, 10),
    time: receipt.capturedAt.slice(11, 16),
    total: receipt.total.toFixed(2),
  }
}

/** `2` decimals at most, and a real positive number. */
const TOTAL_PATTERN = /^\d+(\.\d{1,2})?$/

/**
 * Whether the draft could be saved — every field valid, on its own terms.
 *
 * THE TOTAL IS CHECKED AS TEXT AND NOT AS `Number(...)`, because `Number`
 * accepts `1e3`, ` 12 ` and `0x10`, and a receipt total is none of those. The
 * pattern also enforces the two-decimal rule, which a numeric check could not.
 */
export function isValid(draft: EditorDraft): boolean {
  if (draft.merchant.trim().length === 0) return false
  // `<input type="date">` and `type="time"` yield either a well-formed value or
  // an empty string, so a length check is the whole of their validity.
  if (draft.date.length === 0 || draft.time.length === 0) return false
  if (!TOTAL_PATTERN.test(draft.total.trim())) return false
  return Number(draft.total) > 0
}

/**
 * The draft as the three fields `updateReceipt` writes.
 *
 * `capturedAt` IS COMPOSED FROM THE TWO CONTROLS DIRECTLY — `${date}T${time}:00`
 * — and never round-tripped through `Date` or `toISOString`. That is the whole
 * of Gate 51's item T convention: every timestamp in this app is a zone-less
 * local wall-clock string, and the only way to keep one is never to put it
 * through something that has an opinion about zones. `:00` seconds because the
 * time control has no second field and a receipt does not print one.
 */
export function draftToEdit(draft: EditorDraft): ReceiptEdit {
  return {
    merchant: draft.merchant.trim(),
    capturedAt: `${draft.date}T${draft.time}:00`,
    total: Number(draft.total),
  }
}

export interface ReceiptEditorProps {
  receipt: Receipt
  /**
   * The draft, lifted to the host — because the SAVE BUTTON LIVES IN THE
   * MODAL'S FOOTER and the footer is the host's slot, not this component's.
   * A `Modal` renders `footer` outside `children`, so a Save button owned here
   * could not reach it; lifting the draft is the alternative to threading a
   * render-prop through the overlay.
   */
  draft: EditorDraft
  onChange: (draft: EditorDraft) => void
}

export function ReceiptEditor({ receipt, draft, onChange }: ReceiptEditorProps) {
  const set = <K extends keyof EditorDraft>(key: K) => (value: string) =>
    onChange({ ...draft, [key]: value })

  return (
    <div className="mvp-receipt-editor">
      {/*
        THE FILE NAME, SO THE USER KNOWS WHICH CAPTURE THEY ARE CORRECTING. The
        editor fills the viewer, so the image is off screen while it is open —
        the same reason the picker carries a context line.
      */}
      <p className="mvp-receipt-editor__context type-body-sm">{receipt.displayName}</p>

      <Field
        label="Merchant"
        value={draft.merchant}
        onChange={set('merchant')}
        ariaLabel="Merchant"
        sizing="fill"
        isRequired
        isInvalid={draft.merchant.trim().length === 0}
      />
      <Field
        label="Date"
        type="date"
        value={draft.date}
        onChange={set('date')}
        ariaLabel="Date"
        sizing="fill"
        isInvalid={draft.date.length === 0}
      />
      <Field
        label="Time"
        type="time"
        value={draft.time}
        onChange={set('time')}
        ariaLabel="Time"
        sizing="fill"
        isInvalid={draft.time.length === 0}
      />
      {/*
        THE LABEL CARRIES THE CURRENCY, NOT THE VALUE. `type="number"` will not
        hold "RM 429.19", and putting the symbol in a prefix slot would mean the
        field's value and what the user sees disagreeing about what is typed.
        Every receipt in this app is MYR (`Receipt.currency`), and the editor
        does not offer to change it — that is not a misread OCR can produce.
      */}
      <Field
        label="Total (RM)"
        type="number"
        value={draft.total}
        onChange={set('total')}
        ariaLabel="Total in ringgit"
        sizing="fill"
        isRequired
        isInvalid={!TOTAL_PATTERN.test(draft.total.trim()) || Number(draft.total) <= 0}
      />
    </div>
  )
}

/**
 * Whether the draft differs from what is stored.
 *
 * SAVE IS DISABLED UNTIL VALID **AND** CHANGED, and this is the second half. A
 * Save that is enabled on an untouched form invites a write that changes
 * nothing — and a write that changes nothing still replaces the record, which
 * re-renders every consumer of `receipts` for no reason.
 *
 * COMPARED AGAINST `draftFrom`, NOT AGAINST THE RECEIPT'S FIELDS. That function
 * is the one definition of "this receipt, as the editor's four strings", so this
 * cannot drift from what the controls were seeded with — the same shape as
 * `isFacetDefault` comparing against `clearFacet` rather than against restated
 * literals.
 *
 * THE KEYS ARE READ OFF THE VALUE RATHER THAN LISTED. A listed field someone
 * forgets to add is not a type error: it is a field that reports itself
 * unchanged forever, so Save stays disabled after the user edits it.
 */
export function isChanged(receipt: Receipt, draft: EditorDraft): boolean {
  const original = draftFrom(receipt)
  return (Object.keys(original) as (keyof EditorDraft)[]).some(
    (k) => original[k] !== draft[k],
  )
}
