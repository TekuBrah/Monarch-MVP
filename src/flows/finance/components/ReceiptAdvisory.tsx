import { Button } from '@monarch/design-system'
import { receiptTotalRead } from '../../../data/derive'
import type { Receipt } from '../../../data/types'
import { captureSourceFor, fileTypeLabel, type ReceiptSource } from '../receiptCapture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * "WE COULDN'T READ THIS PHOTO" — Gate 60. NOT DRAWN.
 *
 * WHY IT EXISTS. A reading that failed looked exactly like one that succeeded
 * with empty fields: a card, a dash where the total should be, no items. The
 * engine is not the next lever — Gate 58 attributed the remaining misses to
 * READING, not parsing — but a better photograph is, and a receipt the engine
 * cannot read is one the user can re-shoot in five seconds if the app says so.
 *
 * WHEN IT SHOWS: `receiptReadFailed` — the kept reading has no line items, or
 * no total. That is Gate 58's second-pass trigger applied once more to the
 * final result, CALLED rather than restated, and derived from the record rather
 * than stored. It cannot catch a reading that got SOME of the paper: see that
 * function for what it does not see.
 *
 * ADVISORY, NOT BLOCKING. The receipt is already saved when this appears; the
 * user may ignore it, edit the receipt by hand, or link it as it is. Nothing
 * here stands between them and any of that.
 *
 * WORDED IN THE USER'S TERMS. It says the picture was too hard to make out and
 * which of the two things that matter did not come through — never "no line
 * items parsed", which is the engine's vocabulary rather than theirs.
 *
 * ─────────────── COMPOSED, LIKE THE DETAIL SHEET'S PROMPT BLOCK ──────────────
 *
 * The DS ships no inline-message or banner primitive, and this does not invent
 * one: it is `PromptBlock`'s own composition — a title line, a body line and a
 * `Button` — on the same surface and border. `framed` is off inside the detail
 * sheet's receipt card, which already paints that surface; a framed box there
 * would be a card on an identical ground, the Gate 52 finding.
 *
 * NO GLYPH ON THE BUTTON. The registry has no camera glyph (`photo_camera` is
 * absent under v2.3.0), and G16 is the standing precedent for not substituting
 * a near miss. `secondary` rather than `tertiary` so a text-only button still
 * reads as a button (the G25 device finding).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** What the retake control is called, by the surface it reopens. */
export function retakeLabel(receipt: Receipt): string {
  if (isPdf(receipt)) return 'Choose another file'
  return retakeSource(receipt) === 'camera' ? 'Retake photo' : 'Choose another photo'
}

/**
 * THE SURFACE A RETAKE REOPENS — the one the receipt came from.
 *
 * A receipt with no recorded source is a seeded one, and those never show the
 * advisory; the camera is the answer only because a retake must open SOMETHING.
 */
export function retakeSource(receipt: Receipt): ReceiptSource {
  return captureSourceFor(receipt.id) ?? 'camera'
}

function isPdf(receipt: Receipt): boolean {
  return fileTypeLabel(receipt.filename) === 'pdf'
}

/** The noun the copy uses: a PDF is a file, not a photo. */
function subject(receipt: Receipt): 'photo' | 'file' {
  return isPdf(receipt) ? 'file' : 'photo'
}

/** The card's one-line form. */
export function advisoryCaption(receipt: Receipt): string {
  return `Couldn't read this ${subject(receipt)}`
}

/**
 * WHICH HALF DID NOT COME THROUGH, from the same two record facts
 * `receiptReadFailed` reads — so the sentence can never name a half the rule
 * did not fire on.
 */
function whatWasMissed(receipt: Receipt): string {
  const noItems = receipt.lineItems.length === 0
  const noTotal = receiptTotalRead(receipt) === null
  if (noItems && noTotal) return 'no items or total came through'
  if (noItems) return 'no items came through'
  return "the total didn't come through"
}

export function advisoryBody(receipt: Receipt): string {
  const tip = isPdf(receipt)
    ? 'Try another copy of the receipt'
    : 'Try again with the receipt flat, in good light and in focus'
  return (
    `It was too hard to make out, so ${whatWasMissed(receipt)}. ` +
    `${tip} — or keep this one and edit it by hand.`
  )
}

export function ReceiptAdvisory({
  receipt,
  onRetake,
  framed,
}: {
  receipt: Receipt
  onRetake: () => void
  framed: boolean
}) {
  return (
    <div className={framed ? 'mvp-receipt-advisory mvp-receipt-advisory--framed' : 'mvp-receipt-advisory'}>
      <p className="mvp-receipt-advisory__title type-body-m-semibold">
        {`We couldn't read this ${subject(receipt)}`}
      </p>
      <p className="mvp-receipt-advisory__body type-body-sm">{advisoryBody(receipt)}</p>
      <Button variant="secondary" size="m" label={retakeLabel(receipt)} onClick={onRetake} />
    </div>
  )
}
