import { receiptTotalRead } from '../../data/derive'
import type { Receipt } from '../../data/types'
import { captureSourceFor, fileTypeLabel, type ReceiptSource } from './receiptCapture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * "WE COULDN'T READ THIS PHOTO": THE ADVISORY'S WORDS AND ITS RETAKE SOURCE.
 * Gate 60's copy, moved out of `ReceiptAdvisory.tsx` at Gate 63.
 *
 * WHY THIS IS A MODULE OF STRINGS AND NOT A COMPONENT. The advisory used to be
 * hand-rolled because the DS had no inline-message component. DS v2.4.0 shipped
 * `InlineMessage`, so the viewer and the detail sheet now render that directly,
 * and `ReceiptAdvisory.tsx` was deleted when its last importer went. What stayed
 * app-owned is only what the DS cannot know: the copy, and which picker a
 * retake reopens. The card's caption, the viewer, the sheet and the retake hook
 * all read it from here, so the four cannot drift apart.
 *
 * WHEN IT SHOWS is still `receiptReadFailed` (in `derive.ts`), which delegates
 * to `firstPassFailed`. Nothing here decides that.
 *
 * WORDED IN THE USER'S TERMS. It says the picture was too hard to make out and
 * which of the two things that matter did not come through. It never says "no
 * line items parsed", which is the engine's vocabulary rather than theirs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** A PDF capture is a file, not a photo. The copy and the retake glyph both ask. */
export function isPdfCapture(receipt: Receipt): boolean {
  return fileTypeLabel(receipt.filename) === 'pdf'
}

/** The noun the copy uses. */
function subject(receipt: Receipt): 'photo' | 'file' {
  return isPdfCapture(receipt) ? 'file' : 'photo'
}

/**
 * THE SURFACE A RETAKE REOPENS: the one the receipt came from.
 *
 * A receipt with no recorded source is a seeded one, and those never show the
 * advisory. The camera is the answer only because a retake must open SOMETHING.
 */
export function retakeSource(receipt: Receipt): ReceiptSource {
  return captureSourceFor(receipt.id) ?? 'camera'
}

/** The retake control's label, named for the surface it reopens. */
export function retakeLabel(receipt: Receipt): string {
  if (isPdfCapture(receipt)) return 'Choose another file'
  return retakeSource(receipt) === 'camera' ? 'Retake photo' : 'Choose another photo'
}

/** The card's one-line form. A caption, not a message block (Gate 63). */
export function advisoryCaption(receipt: Receipt): string {
  return `Couldn't read this ${subject(receipt)}`
}

/** The message's title. It also names the DS `InlineMessage`'s group. */
export function advisoryTitle(receipt: Receipt): string {
  return `We couldn't read this ${subject(receipt)}`
}

/**
 * WHICH HALF DID NOT COME THROUGH, from the same two record facts
 * `receiptReadFailed` reads, so the sentence can never name a half the rule did
 * not fire on.
 */
function whatWasMissed(receipt: Receipt): string {
  const noItems = receipt.lineItems.length === 0
  const noTotal = receiptTotalRead(receipt) === null
  if (noItems && noTotal) return 'no items or total came through'
  if (noItems) return 'no items came through'
  return "the total didn't come through"
}

export function advisoryBody(receipt: Receipt): string {
  const tip = isPdfCapture(receipt)
    ? 'Try another copy of the receipt'
    : 'Try again with the receipt flat, in good light and in focus'
  return (
    `It was too hard to make out, so ${whatWasMissed(receipt)}. ` +
    `${tip} — or keep this one and edit it by hand.`
  )
}
