import { bindDiagnostic, CAPTURE_DIAGNOSTICS } from '../../data/captureDiagnostics'
import { extractReceipt, looksLikePdf, type ExtractedReceipt } from '../../data/extract'
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
 * `localWallClock` TO THE MILLISECOND — the shape of `Receipt.addedAt` (Gate 58).
 *
 * DERIVED FROM `localWallClock`, NOT FORMATTED AGAIN, so the two can never
 * disagree about which second it is. The milliseconds are what separate two
 * saves made within the same second; one selection shares one reading of the
 * clock, and its receipts are ordered among themselves by pick order instead
 * (`receiptsNewestFirst`).
 */
export function localWallClockMs(date: Date): string {
  return `${localWallClock(date)}.${String(date.getMilliseconds()).padStart(3, '0')}`
}

/**
 * WHICH DEVICE SURFACE A FILE CAME FROM.
 *
 * ⚠️ IT IS AN INSTRUCTION TO AN `<input>` AGAIN, AND NOTHING ELSE — GATE 54.
 *
 * Gate 53 moved this type here from `ReceiptFileInput` because it had stopped
 * being only an instruction (which `multiple` and `capture` to set) and had
 * become a recorded fact a `Receipt` was shaped by: the display name was chosen
 * by source. DECISION 7B ENDED THAT — every image is renamed and only a PDF
 * keeps its own name — so nothing downstream of the `<input>` reads it, and the
 * propagation through `CapturedFile` was deleted rather than left as a field
 * with no reader.
 *
 * ⚠ "AND NOTHING ELSE" STOPPED BEING TRUE AT GATE 60 — the retake reads it
 * again, through the side store below. The paragraph above is Gate 54's record.
 *
 * IT STAYS IN THIS FILE ANYWAY, on the dependency-direction argument alone:
 * components in this flow import from `receiptCapture`, never the reverse.
 * Moving it back would invert that for no gain.
 */
export type ReceiptSource = 'camera' | 'gallery'

/**
 * ─────────────── WHICH SURFACE EACH CAPTURE CAME FROM — GATE 60 ───────────────
 *
 * THE SOURCE HAS A READER AGAIN. Gate 54 stopped propagating it because nothing
 * downstream asked; Gate 60's retake has to reopen THE SAME SURFACE a failed
 * receipt came from — the camera for a camera capture, the file picker for an
 * upload — so it needs to know which one that was.
 *
 * NOT A FIELD ON `Receipt`, AND NOT THREADED THROUGH `CapturedFile`. It is a
 * session-only side store in the shape Gate 59's diagnostic store already
 * uses: `ReceiptFileInput` notes the source against the `File` it handed over
 * (the element that set `capture` is the single point of truth for it), and
 * `capturedToReceipt` binds it to the receipt's id once that id exists. In
 * memory only (D3); a reload forgets it, as it forgets the captures themselves.
 *
 * A RECEIPT WITH NO RECORDED SOURCE — every seeded one — answers `undefined`.
 * Those never show the advisory (see `receiptReadFailed`), so the retake never
 * has to guess for them.
 */
const sourceByFile = new WeakMap<File, ReceiptSource>()
const sourceByReceipt = new Map<string, ReceiptSource>()

/** Called by `ReceiptFileInput` for every file a pick hands over. */
export function noteCaptureSource(file: File, source: ReceiptSource): void {
  sourceByFile.set(file, source)
}

/** The surface a captured receipt came from, or `undefined` for a seeded one. */
export function captureSourceFor(receiptId: string): ReceiptSource | undefined {
  return sourceByReceipt.get(receiptId)
}

/**
 * ─────────── WAS THIS RECEIPT'S PRINTED DATE ACTUALLY READ? — GATE 64 ────────
 *
 * A SECOND SIDE STORE, SAME SHAPE AS `sourceByReceipt` ABOVE — session-only,
 * keyed by receipt id, set once at capture time. It exists for the same
 * reason: `Receipt.capturedAt` cannot answer this itself. An unread capture's
 * `capturedAt` falls back to the moment of capture (`capturedToReceipt`,
 * below), which is a real, well-formed local timestamp — nothing about its
 * SHAPE marks it as a fallback rather than a transcription off the paper.
 * `receiptTotalRead` in `derive.ts` gets a sentinel for free because a real
 * total is always positive and the fallback is exactly `0`; a real date has no
 * value that could never occur, so no such sentinel exists for `capturedAt`.
 *
 * NOT A FIELD ON `Receipt`. Widening the stored shape for a fact only the
 * Receipts tab's sort control reads is exactly what Gate 58's ruling 2 (only
 * `addedAt` was permitted) and Gate 50-C's `ExtractedReceipt` boundary argue
 * against — this is the same in-memory, non-persisted shape `sourceByReceipt`
 * already uses for an identical problem.
 *
 * A RECEIPT WITH NO ENTRY — every seeded one, and any capture whose date DID
 * read — answers `true`. Only a capture whose extraction returned `null` for
 * `capturedAt` is ever recorded `false`, so the Receipts tab's "No receipt
 * date" group can only ever hold a receipt that genuinely could not be dated
 * from its photograph.
 */
const dateReadByReceipt = new Map<string, boolean>()

/** Whether a receipt's `capturedAt` was read off the paper, never guessed. */
export function receiptDateWasRead(receiptId: string): boolean {
  return dateReadByReceipt.get(receiptId) ?? true
}

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
 * The display name for one capture — Decision 7B.
 *
 * ─────────────── EVERY IMAGE IS RENAMED. ONLY A PDF KEEPS ITS OWN. ───────────
 *
 * GATE 53 SPLIT THIS BY SOURCE — a camera capture was renamed and a gallery
 * pick kept `File.name` — ON THE ARGUMENT THAT "a gallery pick's name is one
 * the user browsed to and can recognise". DEVICE EVIDENCE OVERTURNED THAT.
 * A bulk upload from the Receipts tab on a real Android phone produced cards
 * named like
 *
 *   1789492674683328588290775429997...
 *
 * — an opaque run of digits, which is what Android's document picker hands back
 * for a media item it exposes by content URI rather than by path. The premise
 * was wrong: a gallery name is frequently not a name at all, and it is never a
 * name the user typed.
 *
 * THERE IS STILL NO PREDICATE FOR "THIS FILENAME IS RUBBISH", and that is
 * exactly why the rule is now categorical rather than a heuristic. Gate 53
 * recorded that no such test exists and split by source to avoid needing one;
 * 7B reaches the same conclusion from the other side — since the app cannot
 * tell a good device name from a bad one, it stops depending on the
 * distinction and names every photograph the way a camera roll would.
 *
 * A PDF IS DIFFERENT IN KIND, NOT IN QUALITY. An emailed invoice arrives as a
 * document the user received and may well search for by name, and it is not a
 * photograph, so a camera-roll stamp would be a lie about what it is.
 *
 * `filename` IS UNTOUCHED BY ALL OF THIS. It and `displayName` are two separate
 * facts (see `Receipt` in `types.ts`): `filename` remains the honest record of
 * what the device handed over, INCLUDING when that is an unusable digit run.
 */
export function receiptDisplayName(file: File, now: Date): string {
  return looksLikePdf(file) ? file.name : cameraRollName(file, now)
}

/**
 * Make one selection's display names unique: `_2`, `_3`, … in selection order.
 *
 * WHY COLLISIONS ARE THE NORMAL CASE RATHER THAN AN EDGE ONE. `cameraRollName`
 * is built from a wall-clock stamp accurate to the second, and a bulk selection
 * is named in a single synchronous pass — so every image picked together gets
 * the SAME stamp, and a user adding three photographs would otherwise see three
 * cards with one name between them.
 *
 * THE SUFFIX GOES BEFORE THE EXTENSION, which is what a file manager does and
 * what keeps `fileTypeLabel` reading the real type off the end of the string.
 *
 * IT IS APPLIED IN SELECTION ORDER AND THE FIRST KEEPS THE BARE NAME, so the
 * numbering matches the order the tiles were staged in rather than depending on
 * which extraction finished first.
 *
 * ──────── IT COUNTS STEMS, NOT WHOLE NAMES, AND THAT IS NOT A DETAIL ─────────
 *
 * Until Gate 57 the key was the whole string, extension included. Under
 * Decision 7B every image in one selection is named from the same clock, so two
 * pictures whose source files carried DIFFERENT extensions produced
 * `IMG_20260918_021007.jpg` and `IMG_20260918_021007.jfif` — two distinct
 * strings, neither given a suffix, and two cards a reader sees as one name
 * twice. Measured with a five-image selection off a real gallery, where a
 * `.jfif` and a `.jpg` collided exactly that way.
 *
 * THE EXTENSION IS NOT PART OF THE NAME A USER IS TELLING APART. It records
 * which container the bytes arrived in — `fileTypeLabel` still reads it off the
 * end — so counting it as identity makes the display name unique in a sense
 * nobody can see. Keying on the stem is what makes the numbering mean what the
 * card shows.
 */
export function disambiguateDisplayNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((name) => {
    const dot = name.lastIndexOf('.')
    const stem = dot > 0 ? name.slice(0, dot) : name
    const count = (seen.get(stem) ?? 0) + 1
    seen.set(stem, count)
    if (count === 1) return name
    return dot > 0 ? `${stem}_${count}${name.slice(dot)}` : `${name}_${count}`
  })
}

/**
 * The badge text on a staged tile — "jpg", "png", "heic".
 *
 * FROM THE FILE'S OWN NAME, NOT FROM ITS MIME TYPE. The badge is telling the
 * user which of THEIR files this is, and what they recognise is the extension
 * they see in their camera roll; `image/jpeg` would print "jpeg" for a file
 * called `.jpg`. Lower case, as the mockup draws it.
 *
 * A NAME WITH NO EXTENSION IS LABELLED FROM ITS MIME TYPE (Gate 55). Some
 * Android pickers hand over extensionless names — an opaque digit run — and
 * until Gate 55 every one of them printed "img", a PDF included. The MIME
 * subtype is the next-best statement of what the file is, spelled the way a
 * camera roll spells it (`image/jpeg` prints "jpg"). ONLY THE TWO FAMILIES THE
 * INPUT ACCEPTS are read — `image/*` and `application/pdf` — because a generic
 * type says nothing: measured, a file with no stated type arrives as
 * `application/octet-stream`, and the first version of this printed
 * "octet-stream" on the tile. With neither an extension nor one of those types
 * it falls back to "img" — never to the whole name, which would overflow.
 */
export function fileTypeLabel(filename: string, mimeType = ''): string {
  const dot = filename.lastIndexOf('.')
  if (dot >= 0 && dot < filename.length - 1) return filename.slice(dot + 1).toLowerCase()
  const type = mimeType.trim().toLowerCase()
  if (type === 'application/pdf') return 'pdf'
  const image = /^image\/([a-z0-9.+-]+)$/.exec(type)?.[1]
  if (!image) return 'img'
  return image === 'jpeg' ? 'jpg' : image
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
 * ──────────────── THE 30 s SAFETY CUTOFF (Gate 67, Flow 9 Decision 1) ─────────
 *
 * Gate 58's 6 s ceiling was retired as a limit: a read runs to completion. This
 * catches ONE thing, a stuck engine, and it is not a speed target. The slowest
 * corpus read measured 7.6 s, so 30 s sits far above any real read.
 *
 * AT 30 s THE CAPTURE RESOLVES AS A READ THAT PRODUCED NOTHING: `UNREAD`, the
 * same value a failed read already returns. The failed-read advisory and the
 * retake (Gate 60) then take over, so there is no new error surface, no toast
 * and nothing thrown.
 *
 * A READ THAT FINISHES AFTER THE CUTOFF IS IGNORED. `Promise.race` has already
 * settled, so the late value reaches no caller, and the receipt the user was
 * shown is never rewritten. A late REJECTION is handled too: `race` subscribed
 * to it, so it cannot surface as an unhandled rejection.
 *
 * THE WORKER IS NOT TERMINATED ON CUTOFF. `recognise.ts` creates one worker per
 * read and terminates it in its own `finally`, so a slow read still cleans up
 * after itself when it ends. Terminating a truly stuck worker would mean passing
 * an abort signal through `extractReceipt` -> `readReceipt` -> `recognise`,
 * which is OCR-path code this gate does not touch.
 */
const READ_CUTOFF_MS = 30_000
const CUT_OFF = Symbol('read cut off')

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
export async function extractCapture(file: File, sourceUrl: string): Promise<CapturedFile> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const cutoff = new Promise<typeof CUT_OFF>((resolve) => {
    timer = setTimeout(() => resolve(CUT_OFF), READ_CUTOFF_MS)
  })
  try {
    const result = await Promise.race([extractReceipt(file), cutoff])
    if (result === CUT_OFF) {
      // `info`, not `warn` or `error`: a cutoff is an outcome this app handles,
      // not a fault, and `routes.spec.ts` fails a walk state on either of those.
      console.info(`receipt read for ${file.name} passed ${READ_CUTOFF_MS} ms; kept as unread`)
      return { file, sourceUrl, extracted: UNREAD }
    }
    return { file, sourceUrl, extracted: result }
  } catch (error) {
    console.error(`receipt extraction failed for ${file.name}`, error)
    return { file, sourceUrl, extracted: UNREAD }
  } finally {
    clearTimeout(timer)
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
 *   merchant    the receipt's DISPLAY NAME (Decision 7B) — recognisably not a
 *               merchant, so it reads as "unread" rather than as a claim.
 *               Until Gate 55 this was `file.name`, which on an Android gallery
 *               pick is an opaque digit run: 7B renamed `displayName` and left
 *               this fallback behind (reported at Gate 54-B)
 *   capturedAt  the moment of capture, which is a real fact about this receipt
 *               even when the printed date is unreadable — in LOCAL wall-clock
 *               time, like every other timestamp here (`localWallClock`, Gate 51)
 *   total       0, never a guess — and since Gate 58 DRAWN as an em dash, not
 *               "RM 0.00" (`receiptTotalRead` in `derive.ts`): 0 is the mark,
 *               never a figure a user sees
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
  displayName: string,
  addedAt: string,
): Receipt {
  const { file, sourceUrl, extracted } = capture
  const id = `receipt-capture-${(captureSeq += 1)}`
  // Gate 59: the capture diagnostic was recorded against the FILE, because the
  // id did not exist yet. Constant `false` without `?diag=1`; see
  // `data/captureDiagnostics.ts`.
  if (CAPTURE_DIAGNOSTICS) bindDiagnostic(file, id)
  // Gate 60: bind the surface this file came from, for the retake.
  const source = sourceByFile.get(file)
  if (source) sourceByReceipt.set(id, source)
  // Gate 64: record whether the date was actually read, before the fallback
  // below overwrites the evidence that it was not.
  dateReadByReceipt.set(id, extracted.capturedAt !== null)
  return {
    id,
    // WHERE THE BYTES CAME FROM, UNTOUCHED BY GATE 53. `filename` and
    // `displayName` are two different facts (see `Receipt` in `types.ts`) and
    // only the second one moved: this stays the device's own name, because it is
    // the honest record of the file that was handed over — including when that
    // name is unusable.
    filename: file.name,
    /*
      HANDED IN, SO THIS STAYS THE ONLY WRITER OF THE FIELD AND `receiptDisplayName`
      STAYS THE ONLY DECIDER OF ITS VALUE.

      IT IS A PARAMETER RATHER THAN A CALL BECAUSE OF DE-DUPLICATION, which is a
      property of a whole SELECTION and cannot be computed from one capture:
      every image picked together shares a wall-clock stamp, so the `_2`/`_3`
      suffixes have to be assigned across the batch. `capturedToReceipts` below
      is where that happens, and it is the only thing that should call this.

      THE HISTORY IS WORTH KEEPING BECAUSE THE MECHANISM IS NOT THE OBVIOUS ONE.
      A card once printed `"ESPEN EER BCs rf 42. i EH EER eer Spates Le"`, which
      reads exactly like OCR output — so the natural diagnosis was that
      extraction had leaked into this field. IT HAD NOT: `displayName` has never
      read `extracted`, and that garbled string WAS `File.name`, handed over by
      the device's own camera intent. Gate 54 saw the same thing again from the
      gallery, as an opaque digit run.
    */
    displayName,
    capturedAt: extracted.capturedAt ?? localWallClock(new Date()),
    // WHEN IT WAS ADDED, handed in for the same reason `displayName` is: the
    // clock is read once per selection, by `capturedToReceipts`.
    addedAt,
    merchant: extracted.merchant ?? displayName,
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
 * Build every `Receipt` for ONE selection, names de-duplicated across it.
 *
 * THE ONLY CALLER OF `capturedToReceipt`, and the reason that function takes a
 * display name rather than computing one: the `_2`/`_3` suffixes can only be
 * assigned by something that can see the whole batch at once.
 *
 * `now` IS A PARAMETER SO THE CLOCK IS READ EXACTLY ONCE PER SELECTION. Reading
 * it per capture would let a slow batch straddle a second boundary, which would
 * hide collisions in testing and produce them in the field — the worst possible
 * split. One instant per selection also means the stamp records when the user
 * added the receipts, not how long extraction took.
 */
export function capturedToReceipts(
  captures: readonly CapturedFile[],
  links: readonly (string | null)[],
  now: Date,
): Receipt[] {
  const names = disambiguateDisplayNames(captures.map((c) => receiptDisplayName(c.file, now)))
  const addedAt = localWallClockMs(now)
  return captures.map((capture, i) => capturedToReceipt(capture, links[i] ?? null, names[i], addedAt))
}

/**
 * Extract one captured image and build its `Receipt` — the detail sheet's path,
 * where the link is known before extraction starts and auto-match never runs.
 *
 * A SELECTION OF ONE, THROUGH THE SAME FUNCTION AS A SELECTION OF MANY. There
 * is nothing to de-duplicate against, so `disambiguateDisplayNames` is a no-op
 * here — but routing through it means this path cannot drift from the bulk one.
 */
export async function captureToReceipt(
  file: File,
  sourceUrl: string,
  transactionId: string | null,
): Promise<Receipt> {
  const capture = await extractCapture(file, sourceUrl)
  return capturedToReceipts([capture], [transactionId], new Date())[0]
}
