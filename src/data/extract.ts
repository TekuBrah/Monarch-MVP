import type { Amount, CurrencyCode, ReceiptLineItem } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE EXTRACTION SEAM (Gate 50).
 *
 * Everything a capture surface needs to know about turning a photographed
 * receipt into a `Receipt` record lives behind ONE function. This gate ships a
 * STUB behind it; Gate 50-B replaces what is behind it and touches no screen.
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
 * fallback, always. Gate 50-B replaces `stubExtractReceipt` itself.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * What extraction yields for one captured image.
 *
 * IT IS DELIBERATELY NOT A `Receipt`. A `Receipt` carries an `id`, a
 * `transactionId` and a `displayName` — three facts extraction cannot know:
 * identity is the caller's, linkage is the CAPTURE CONTEXT's (a receipt
 * captured from a transaction is linked to it by definition; one captured from
 * the Receipts tab lands unlinked and auto-match decides later, which is Gate
 * 50-C), and the display name comes from the file the user chose. Returning a
 * `Receipt` would have forced this function to invent all three.
 */
export interface ExtractedReceipt {
  /** The merchant as the letterhead prints it. */
  merchant: string
  /** ISO 8601 local timestamp, from the receipt's own printed date. */
  capturedAt: string
  /** The printed TOTAL, positive. Never summed — see `Receipt.total`. */
  total: Amount
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
 * How long the stub pretends to work.
 *
 * A REAL DELAY, NOT A ZERO ONE, and the reason is that a seam which resolves
 * synchronously cannot be told apart from no seam at all: every consumer would
 * appear to work while never once rendering the processing state it is supposed
 * to render, and the first real implementation would be the first time anyone
 * discovered the surface was wrong. 900ms is long enough for a human to see the
 * loader and short enough not to read as a hang.
 *
 * THE SUITE NEVER WAITS THIS OUT. The harness replaces the whole function.
 */
const STUB_DELAY_MS = 900

/**
 * The placeholder extraction.
 *
 * EVERY FIELD HERE IS A PLACEHOLDER AND NOT A TRANSCRIPTION, which is the
 * opposite of `src/data/receipts.ts` where every figure was read off a
 * photograph. Nothing here was read off anything, so nothing here may be quoted
 * as data — in particular `total` is `0`, deliberately, rather than a plausible
 * amount: a fabricated total is a number that could be believed, and this gate
 * has no authority to produce one.
 *
 * `lineItems` IS EMPTY FOR THE SAME REASON. Inventing "Nestle Milo 2kg" would
 * put a purchase on a user's screen that they did not make. An empty list makes
 * `receiptSubtotal()` return 0, which is honest: nothing has been read yet.
 *
 * NO WALK STATE RENDERS THIS. The four capture walk states all photograph the
 * surface BEFORE extraction answers, so none of these values reaches a baseline
 * — checked, and it is why the placeholder is allowed to be this bare.
 */
function stubExtraction(file: File): ExtractedReceipt {
  return {
    merchant: file.name,
    // NOT `TODAY` and not a literal: the capture is happening now, and the
    // harness pins the clock, so this is deterministic under test without a
    // second source of "now" existing in the app.
    capturedAt: new Date().toISOString().slice(0, 19),
    total: 0,
    tax: null,
    currency: 'MYR',
    lineItems: [],
  }
}

/** The shipped implementation. Gate 50-B replaces THIS, not the export below. */
const stubExtractReceipt: ReceiptExtractor = (file) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(stubExtraction(file)), STUB_DELAY_MS)
  })

/**
 * Extract one captured receipt image.
 *
 * The ONE entry point. Both capture surfaces call this and nothing else.
 */
export function extractReceipt(file: File): Promise<ExtractedReceipt> {
  const installed =
    typeof window !== 'undefined' ? window.__monarchExtractReceipt : undefined
  return (installed ?? stubExtractReceipt)(file)
}
