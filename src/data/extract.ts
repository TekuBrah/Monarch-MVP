import type { Amount, CurrencyCode, ReceiptLineItem } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE EXTRACTION SEAM (Gate 50).
 *
 * Everything a capture surface needs to know about turning a photographed
 * receipt into a `Receipt` record lives behind ONE function. Gate 50 shipped a
 * stub behind it; GATE 50-B REPLACED THAT WITH REAL OCR AND A REAL PARSER, and
 * touched no screen and moved no baseline doing it. The signature below is
 * character-for-character the one Gate 50 wrote.
 *
 * THAT PROPERTY IS THE WHOLE POINT AND IT IS WORTH STATING PLAINLY: the two
 * capture surfaces (`AddReceiptsModal`, and the detail sheet's "Add Receipt")
 * both `await extractReceipt(file)` and neither knows or cares whether an OCR
 * engine, a network call or a `setTimeout` answered. A gate that finds itself
 * editing a component in order to change extraction has lost the seam.
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THE INDIRECTION THROUGH `window`, WHICH LOOKS LIKE A TEST BACKDOOR.
 *
 * It is one, deliberately, and the alternative is worse. The visual suite has to
 * photograph the PROCESSING moment — a surface that by definition exists only
 * while extraction has not answered yet. Against a real implementation that is a
 * race: the capture either wins or loses depending on how fast the machine is,
 * which is precisely the timing dependence this project refuses everywhere else
 * (see the Gate 17 raster work, where a `waitForTimeout` was named as "a
 * tolerance wearing a fix's clothes").
 *
 * With the seam readable at CALL TIME from `window`, the harness installs a
 * deterministic implementation in an init script before the app's first render,
 * and the processing state is a fact rather than a race. See
 * `installExtractionStub` in `e2e/harness.ts`.
 *
 * IT IS READ AT CALL TIME, NOT CAPTURED AT MODULE LOAD. A module-level
 * `const impl = window.__monarchExtractReceipt ?? fallback` would bake in
 * whatever was present when this module first evaluated, and an init script that
 * ran later — or a Gate 50-B implementation registered after mount — would be
 * silently ignored. That is the same substitution-at-declaration hazard
 * `--mvp-gutter` records for custom properties: where a value is READ is not
 * where it is DECLARED.
 *
 * IT IS NOT A FEATURE FLAG AND MUST NOT BECOME ONE. Nothing in `src/` writes
 * `window.__monarchExtractReceipt`, and nothing should: production takes the
 * fallback, always — and as of Gate 50-B that fallback is the real engine.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * What extraction yields for one captured image.
 *
 * IT IS DELIBERATELY NOT A `Receipt`. A `Receipt` carries an `id`, a
 * `transactionId` and a `displayName` — three facts extraction cannot know:
 * identity is the caller's, linkage is the CAPTURE CONTEXT's (a receipt
 * captured from a transaction is linked to it by definition; one captured from
 * the Receipts tab lands unlinked and auto-match decides, which is Gate 50-C),
 * and the display name comes from the file the user chose. Returning a
 * `Receipt` would have forced this function to invent all three.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ GATE 50-C WIDENED THIS TYPE, AND THAT IS A SEAM CHANGE EVEN THOUGH THE
 * SIGNATURE OF `extractReceipt` BELOW IS CHARACTER-FOR-CHARACTER UNCHANGED.
 *
 * `merchant`, `capturedAt` and `total` are `null` when the page did not yield
 * them. Until Gate 50-C they were never null: `ocrExtractReceipt` replaced an
 * unread merchant with the file's name, an unread date with `new Date()` and
 * an unread total with `0`, so every consumer received a value it could not
 * tell apart from a read one.
 *
 * AUTO-MATCH IS WHY THAT STOPPED BEING ACCEPTABLE. Its rule is that a field
 * extraction could not read cannot satisfy it — and a date filled in from the
 * device clock is exactly a value that looks read and is not. A file named
 * `IKEA.jpg` standing in for an unread merchant is the same hazard in another
 * field. So the seam now says "unread" out loud, and the DISPLAY fallbacks —
 * the same three, unchanged on screen — moved to `capturedToReceipt` in
 * `flows/finance/receiptCapture.ts`, which is where a `Receipt` (whose fields
 * are not nullable) is built. Auto-match reads THIS value, never the filled
 * `Receipt`. See `src/data/autoMatch.ts`.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface ExtractedReceipt {
  /** The merchant as the letterhead prints it, or `null` when unread. */
  merchant: string | null
  /**
   * ISO 8601 local timestamp from the receipt's own printed date, or `null`
   * when the page shows no readable date. NEVER FILLED FROM A CLOCK HERE.
   */
  capturedAt: string | null
  /** The printed TOTAL, positive, or `null` when unread. Never summed. */
  total: Amount | null
  /** The printed SST line, or `null` where the paper prints none. */
  tax: Amount | null
  currency: CurrencyCode
  /** As printed. The subtotal is DERIVED from these, never stored. */
  lineItems: ReceiptLineItem[]
}

export type ReceiptExtractor = (file: File) => Promise<ExtractedReceipt>

declare global {
  interface Window {
    /**
     * TEST SEAM. Installed by `e2e/harness.ts` only. Never written by `src/`.
     */
    __monarchExtractReceipt?: ReceiptExtractor
  }
}

/**
 * Is this file a PDF rather than an image?
 *
 * BOTH THE MIME TYPE AND THE EXTENSION ARE CHECKED, because neither is reliable
 * alone. `File.type` is whatever the picker chose to report and comes back as
 * the empty string from some Android providers; the extension is missing
 * entirely from others (which is why `fileTypeLabel` in `receiptCapture.ts`
 * already has an "img" fallback). Either signal is enough to route to the
 * rasteriser, and a false positive is cheap — `getDocument` rejects and the
 * error surfaces — where a false negative silently OCRs a blank page.
 */
function looksLikePdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

/**
 * The shipped implementation: real OCR, real parsing, on this device.
 *
 * ─────────────── THE ENGINE IS LOADED LAZILY AND THAT IS ENFORCED HERE ───────
 *
 * Every import below is DYNAMIC, and none of those modules is reachable from a
 * static import anywhere in `src/`. That is what keeps Tesseract, the
 * WebAssembly engine and the 2.82 MB language model out of the entry chunk.
 *
 * MEASURED THROUGH `npm run build:package` AT THIS GATE, which is the only
 * command that compiles what production compiles. The entry chunk went
 * 5,782,571 -> 5,784,337 bytes: it grew by 1,766, and that 1,766 is the
 * dynamic-import glue plus `looksLikePdf` — NOT the engine. What proves the
 * engine is elsewhere is that the entry chunk names none of the four heavy
 * assets (`tesseract-core-simd-lstm`, `eng.traineddata`, `worker.min`,
 * `pdf.worker`), each of which sits in its own file and is fetched only when a
 * user actually reads a receipt.
 *
 * A REFACTOR THAT TURNS ANY OF THESE INTO A TOP-LEVEL `import` WOULD UNDO THAT
 * SILENTLY, because nothing about the app's behaviour would change — only every
 * visitor's first paint would get slower. The check is a chunk listing, never a
 * grep of the source.
 *
 * ─────────────── WHAT IT DOES WITH A FIELD IT COULD NOT READ ─────────────────
 *
 * IT RETURNS `null`, AS OF GATE 50-C. OCR can fail to produce the merchant, the
 * timestamp or the total, and each unread one comes back `null` — see the note
 * on `ExtractedReceipt` for why. `lineItems` is whatever parsed and nothing
 * more, so the derived subtotal is honest about how much of the page was read.
 *
 * THE HONEST DISPLAY FALLBACKS STILL EXIST AND STILL READ THE SAME ON SCREEN —
 * the file's own name, the moment of capture, and 0 — but they are applied by
 * `capturedToReceipt` in `flows/finance/receiptCapture.ts` when a `Receipt` is
 * built, not here. Until Gate 50-C they were applied here, which is how a date
 * read off the device clock became indistinguishable from one read off paper.
 *
 * NO FIELD IS EVER INVENTED TO MAKE THE ARITHMETIC CLOSE. Six of the ten seeded
 * receipts already print subtotals their own line items do not sum to, and the
 * detail sheet has shown that disagreement since Gate 49. A parser that quietly
 * balanced the books would be hiding the one thing worth seeing.
 */
const ocrExtractReceipt: ReceiptExtractor = async (file) => {
  const [{ recognise }, { parseReceipt }] = await Promise.all([
    import('./ocr/recognise'),
    import('./ocr/parseReceipt'),
  ])

  // A PDF IS DRAWN BEFORE IT IS READ. See `rasterise.ts` — the engine reads
  // pixels, and a PDF carries none until something renders it.
  const image: Blob = looksLikePdf(file)
    ? await (await import('./ocr/rasterise')).rasterisePdfFirstPage(file)
    : file

  const parsed = parseReceipt(await recognise(image))

  // RAW, NOT FILLED. `parseReceipt` reports an unread merchant as the empty
  // string and an unread date or total as `null`; all three reach the caller as
  // `null`. The display fallbacks live in `capturedToReceipt`.
  return {
    merchant: parsed.merchant.length > 0 ? parsed.merchant : null,
    capturedAt: parsed.capturedAt,
    total: parsed.total,
    tax: parsed.tax,
    currency: parsed.currency,
    lineItems: parsed.lineItems,
  }
}

/**
 * Extract one captured receipt image.
 *
 * The ONE entry point. Both capture surfaces call this and nothing else.
 */
export function extractReceipt(file: File): Promise<ExtractedReceipt> {
  const installed =
    typeof window !== 'undefined' ? window.__monarchExtractReceipt : undefined
  return (installed ?? ocrExtractReceipt)(file)
}
