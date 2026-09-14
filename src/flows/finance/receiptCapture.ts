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
 * WHICH DEVICE SURFACE A FILE CAME FROM.
 *
 * IT LIVES HERE, NOT IN `ReceiptFileInput`, AS OF GATE 53. It was that
 * component's type while it was only an instruction to an `<input>` — which
 * `multiple` and `capture` to set. It is now a recorded FACT ABOUT A CAPTURE
 * that `capturedToReceipt` reads, so it belongs beside the record it shapes and
 * the dependency runs the way every other one in this flow does: components
 * import from `receiptCapture`, never the reverse.
 */
export type ReceiptSource = 'camera' | 'gallery'

/**
 * A camera-roll-style name for a photograph the user just took.
 *
 * ───────────── WHY A CAMERA CAPTURE NEEDS A NAME GENERATED AT ALL ────────────
 *
 * `displayName` is documented as "what a phone's camera roll would have called
 * the capture" — `IMG_4821.jpg`. For a GALLERY pick that is exactly what
 * `File.name` already is: the user browsed their own camera roll and chose a
 * file they can see the name of. For a CAMERA capture it is not. The photograph
 * did not exist until the shutter fired, the user has never seen a name for it,
 * and what `File.name` carries is whatever the OS camera intent happened to
 * hand back — which is a name nobody chose and nobody recognises. Gate 53 was
 * opened on a real device report where that value reached the card as
 * `"ESPEN EER BCs rf 42. i EH EER eer Spates Le"`.
 *
 * SO THIS IS NOT A WORKAROUND FOR ONE BAD STRING. Even a well-behaved device
 * name is meaningless to a user who never saw it, and the generated stamp is
 * what Android's own camera would have produced. The fix is scoped to
 * `'camera'` precisely so a gallery name — which IS user-recognisable — is
 * never discarded.
 *
 * THE STAMP IS DERIVED FROM `localWallClock`, NOT FORMATTED AGAIN. One
 * definition of "the local wall-clock moment", reshaped — so a camera-roll name
 * and the `capturedAt` beside it on the same card can never disagree about what
 * time it is. Formatting the date a second time here is how they would. That
 * also inherits Gate 51 item T for free: a UTC stamp would name a capture taken
 * at 18:34 in Malaysia `IMG_20260912_103400`, which is not what the phone's
 * own camera roll would have called it.
 *
 * THE EXTENSION IS THE FILE'S OWN, NOT A HARDCODED `.jpg`. `capture` is a HINT
 * that a desktop browser ignores entirely — it opens an ordinary file dialog —
 * and `accept` admits `application/pdf`, so the camera row CAN return a PDF.
 * The staged tile's badge already reads `fileTypeLabel(file.name)`, so a
 * hardcoded `.jpg` would put a name ending `.jpg` next to a badge reading
 * "pdf". A name with no dot at all falls back to `jpg`, which is the only
 * guess here and is the format a camera actually produces.
 */
export function cameraRollName(file: File, now: Date): string {
  const stamp = localWallClock(now).replace(/[-:]/g, '').replace('T', '_')
  const dot = file.name.lastIndexOf('.')
  const ext =
    dot > 0 && dot < file.name.length - 1 ? file.name.slice(dot + 1).toLowerCase() : 'jpg'
  return `IMG_${stamp}.${ext}`
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
  /**
   * Which device surface produced it — `capturedToReceipt` needs it to decide
   * the display name, and only the `<input>` that set `capture` knows it.
   */
  source: ReceiptSource
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
  source: ReceiptSource,
): Promise<CapturedFile> {
  try {
    return { file, sourceUrl, source, extracted: await extractReceipt(file) }
  } catch (error) {
    console.error(`receipt extraction failed for ${file.name}`, error)
    return { file, sourceUrl, source, extracted: UNREAD }
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
  const { file, sourceUrl, extracted, source } = capture
  return {
    id: `receipt-capture-${(captureSeq += 1)}`,
    // WHERE THE BYTES CAME FROM, UNTOUCHED BY GATE 53. `filename` and
    // `displayName` are two different facts (see `Receipt` in `types.ts`) and
    // only the second one moved: this stays the device's own name, because it is
    // the honest record of the file that was handed over — including when that
    // name is unusable.
    filename: file.name,
    /*
      CAMERA-ROLL STYLE — AND FOR A CAMERA CAPTURE THAT MEANS A GENERATED ONE.

      THIS WAS `file.name` FOR BOTH SOURCES UNTIL GATE 53, and the defect it
      produced is worth stating because the mechanism is NOT the obvious one.
      A card printed `"ESPEN EER BCs rf 42. i EH EER eer Spates Le"` — which
      reads exactly like OCR output, so the natural diagnosis is that extraction
      leaked into this field. IT DID NOT: `displayName` has exactly ONE writer
      in `src/`, this line, and it has never read `extracted`. That garbled
      string WAS `File.name`, handed over by the device's own camera intent.

      SO THE SPLIT IS BY SOURCE, NOT BY WHETHER THE NAME LOOKS SENSIBLE. There
      is no predicate for "this filename is rubbish" that is not a guess, and a
      gallery pick's name is one the user chose and can recognise — discarding it
      would be a regression. A camera capture has no such name to protect.
    */
    displayName:
      source === 'camera' ? cameraRollName(file, new Date()) : file.name,
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
  source: ReceiptSource,
): Promise<Receipt> {
  return capturedToReceipt(await extractCapture(file, sourceUrl, source), transactionId)
}
