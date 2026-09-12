import { extractReceipt, type ExtractedReceipt } from '../../data/extract'
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
 * GATE 50-C SPLIT IT IN TWO: EXTRACT, THEN BUILD.
 *
 * Auto-match has to read what extraction ACTUALLY returned — including which
 * fields came back unread — and a `Receipt` cannot say that, because its
 * fields are not nullable. So the Receipts tab extracts every staged file
 * first (`extractCapture`), decides every link from the raw fields together,
 * and only then builds each `Receipt` (`capturedToReceipt`). The detail sheet
 * still goes through `captureToReceipt`, which is the two halves back to back.
 * ─────────────────────────────────────────────────────────────────────────────
 */

let captureSeq = 0

/**
 * `YYYY-MM-DDTHH:mm:ss` IN LOCAL WALL-CLOCK TIME — the zone-less shape every
 * timestamp in this app is written in. Gate 51, item T.
 *
 * `toISOString()` IS NOT THAT, AND IT WAS USED HERE UNTIL GATE 51. It returns
 * UTC fields; slicing off the `Z` leaves a zone-less string, and every reader —
 * `formatTimestamp`, `groupReceiptsByMonth` — reads a zone-less string as LOCAL.
 * So a receipt captured at 18:34 in Malaysia was recorded, printed and grouped
 * as 10:34, and one captured between 00:00 and 08:00 local on the 1st landed in
 * the previous month. Found on Teku's phone, not by a test.
 *
 * BUILT FROM THE DATE'S LOCAL GETTERS, so the string names the same wall-clock
 * moment the device shows. It was the only site in `src/` producing a UTC one:
 * `toISOString` had exactly one occurrence.
 */
function localWallClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

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

/** One chosen file, read but not yet a `Receipt`. */
export interface CapturedFile {
  file: File
  /** `URL.createObjectURL(file)` — becomes the receipt's `sourceUrl`. */
  sourceUrl: string
  /** Exactly what extraction returned, unread fields still `null`. */
  extracted: ExtractedReceipt
}

/**
 * WHAT EXTRACTION RETURNS WHEN THE ENGINE COULD NOT READ THE FILE AT ALL.
 *
 * Every field `null`, which is the SAME shape `ocrExtractReceipt` returns for a
 * page it read but could not understand — so nothing downstream needs a second
 * notion of failure. `capturedToReceipt` then applies its three honest display
 * fallbacks (the file's own name, the moment of capture, 0), and auto-match
 * cannot link it, because all three of the fields its rule reads are `null`.
 *
 * `currency` IS THE ONE FIELD THAT IS NOT NULLABLE, and 'MYR' is not a guess
 * here: `parseReceipt` hardcodes it as the single-currency statement of the
 * model, so this is the same value a successful read would have produced.
 */
const UNREAD: ExtractedReceipt = {
  merchant: null,
  capturedAt: null,
  total: null,
  tax: null,
  currency: 'MYR',
  lineItems: [],
}

/**
 * Extract one chosen file. Builds nothing and decides nothing.
 *
 * ───────────────── IT CANNOT REJECT, AND THAT IS LOAD-BEARING (Gate 52) ──────
 *
 * Nothing in the chain below it catches — not `extractReceipt`, not
 * `recognise`, not `rasterise` — so before this gate a worker that failed to
 * start, a model fetch that 404'd or an image the engine could not decode threw
 * straight through both capture surfaces. Measured: one rejection left the bulk
 * modal on its loader FOREVER, with `onSave` and `onClose` never called, the
 * Save button already gone, nothing added, and — the part that makes it a data
 * loss rather than a hang — the captures that HAD succeeded discarded with it.
 *
 * SO A FAILED READ IS AN UNREAD RECEIPT, NOT A LOST ONE. The user's photograph
 * is still theirs; it lands in the library with the fallbacks above and Gate
 * 51-B's editor is how they correct it. That is the same answer this app
 * already gives for a field the engine read but could not parse, which is why
 * it needs no new state and no new copy.
 *
 * IT IS LOGGED RATHER THAN SWALLOWED. `routes.spec.ts` fails on any console
 * error, so a walk state that ever starts failing here reddens the suite
 * instead of quietly minting a library of blank receipts.
 *
 * IT SITS HERE, NOT IN THE BULK MODAL, BECAUSE BOTH SURFACES REACH IT.
 * `captureToReceipt` — the transaction detail sheet's path — is
 * `capturedToReceipt(await extractCapture(...))`, so the sheet had the same
 * strand (`setIsCapturing(false)` never running) and one catch closes both.
 */
export async function extractCapture(
  file: File,
  sourceUrl: string,
): Promise<CapturedFile> {
  try {
    return { file, sourceUrl, extracted: await extractReceipt(file) }
  } catch (error) {
    console.error(`receipt extraction failed for ${file.name}`, error)
    return { file, sourceUrl, extracted: UNREAD }
  }
}

/**
 * Build the `Receipt` for one extracted capture.
 *
 * `transactionId` IS THE CAPTURE CONTEXT AND IS THE CALLER'S TO SUPPLY — the
 * settled ruling. A receipt captured FROM a transaction is linked to it by
 * definition, so the detail sheet passes that transaction's id; one captured
 * from the Receipts tab passes whatever auto-match decided, which is `null`
 * unless exactly one transaction matched. Nothing here guesses, because nothing
 * here can know which surface called it.
 *
 * ─────────────── THE DISPLAY FALLBACKS LIVE HERE AS OF GATE 50-C ─────────────
 *
 * A `Receipt` requires a merchant, a timestamp and a total, and extraction
 * reports an unread one as `null`. Each is filled with something HONEST rather
 * than something plausible — the same three `extract.ts` applied until Gate
 * 50-C, moved here unchanged so nothing on screen moved with them:
 *
 *   merchant    the file's own name — what the user picked, and recognisably
 *               not a merchant, so it reads as "unread" rather than as a claim
 *   capturedAt  the moment of capture, which is a real fact about this receipt
 *               even when the printed date is unreadable — in LOCAL wall-clock
 *               time, like every other timestamp here (`localWallClock`, Gate 51)
 *   total       0, never a guess
 *
 * THESE ARE FOR THE SCREEN ONLY. Auto-match has already run on the raw fields
 * by the time this is called, so a filled date or merchant can never make a
 * receipt link itself.
 *
 * THE ID IS A COUNTER, NOT A TIMESTAMP. The harness pins the clock
 * (`page.clock.setFixedTime`), so `Date.now()` returns the SAME value for every
 * capture in a test and two receipts saved together would collide on their key.
 */
export function capturedToReceipt(
  capture: CapturedFile,
  transactionId: string | null,
): Receipt {
  const { file, sourceUrl, extracted } = capture
  return {
    id: `receipt-capture-${(captureSeq += 1)}`,
    filename: file.name,
    // CAMERA-ROLL STYLE, matching what the ten seeded records print — the
    // file's own name is what the user will recognise it by.
    displayName: file.name,
    capturedAt: extracted.capturedAt ?? localWallClock(new Date()),
    merchant: extracted.merchant ?? file.name,
    total: extracted.total ?? 0,
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

/**
 * Extract one captured image and build its `Receipt` — the detail sheet's path,
 * where the link is known before extraction starts and auto-match never runs.
 */
export async function captureToReceipt(
  file: File,
  sourceUrl: string,
  transactionId: string | null,
): Promise<Receipt> {
  return capturedToReceipt(await extractCapture(file, sourceUrl), transactionId)
}
