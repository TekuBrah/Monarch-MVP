import { extractReceipt } from '../../data/extract'
import type { Receipt } from '../../data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TURNING A CHOSEN FILE INTO A `Receipt` (Gate 50).
 *
 * Both capture surfaces do the same three things — extract, name, decide
 * linkage — so they do them through here rather than each writing their own
 * version. Two implementations of "what a captured receipt looks like" is how
 * the bulk grid and the transaction sheet come to disagree about it.
 *
 * IT LIVES IN THE FLOW, NOT IN `src/data/`, DELIBERATELY. `data/derive.ts` is
 * pure functions over the seeded collections; this reaches a browser API
 * (`File`) and produces a record with a blob url in it. Putting it beside its
 * two callers keeps `data/` free of anything that needs a DOM.
 * ─────────────────────────────────────────────────────────────────────────────
 */

let captureSeq = 0

/**
 * The badge text on a staged tile — "jpg", "png", "heic".
 *
 * FROM THE FILE'S OWN NAME, NOT FROM ITS MIME TYPE. The badge is telling the
 * user which of THEIR files this is, and what they recognise is the extension
 * they see in their camera roll; `image/jpeg` would print "jpeg" for a file
 * called `.jpg`. Lower case, as the mockup draws it.
 *
 * A NAME WITH NO DOT FALLS BACK TO "img" RATHER THAN TO THE WHOLE NAME. Some
 * Android pickers hand over extensionless names, and a badge that printed the
 * entire filename would overflow its own tile.
 */
export function fileTypeLabel(filename: string): string {
  const dot = filename.lastIndexOf('.')
  if (dot < 0 || dot === filename.length - 1) return 'img'
  return filename.slice(dot + 1).toLowerCase()
}

/**
 * Extract one captured image and build its `Receipt`.
 *
 * `transactionId` IS THE CAPTURE CONTEXT AND IS THE CALLER'S TO SUPPLY — the
 * settled ruling. A receipt captured FROM a transaction is linked to it by
 * definition, so the detail sheet passes that transaction's id; one captured
 * from the Receipts tab passes `null` and auto-match decides later (Gate 50-C).
 * Nothing here guesses, because nothing here can know which surface called it.
 *
 * THE ID IS A COUNTER, NOT A TIMESTAMP. The harness pins the clock
 * (`page.clock.setFixedTime`), so `Date.now()` returns the SAME value for every
 * capture in a test and two receipts saved together would collide on their key.
 */
export async function captureToReceipt(
  file: File,
  sourceUrl: string,
  transactionId: string | null,
): Promise<Receipt> {
  const extracted = await extractReceipt(file)
  return {
    id: `receipt-capture-${(captureSeq += 1)}`,
    filename: file.name,
    // CAMERA-ROLL STYLE, matching what the ten seeded records print — the
    // file's own name is what the user will recognise it by.
    displayName: file.name,
    capturedAt: extracted.capturedAt,
    merchant: extracted.merchant,
    total: extracted.total,
    tax: extracted.tax,
    currency: extracted.currency,
    lineItems: extracted.lineItems,
    transactionId,
    // THE BYTES ARE IN MEMORY, SO THE RECORD CARRIES THEIR URL. See
    // `Receipt.sourceUrl` for why this is an optional override rather than a
    // tagged union, and `receiptImageUrl()` for the one place that reads it.
    sourceUrl,
  }
}
