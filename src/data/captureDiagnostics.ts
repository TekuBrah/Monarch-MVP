/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CAPTURE DIAGNOSTICS (Gate 59). THE FLAG, THE SHAPE AND THE SESSION STORE.
 *
 * WHY IT EXISTS. Four times now a receipt has read differently on the phone
 * than on the desktop, and the only evidence anyone ever had was two rendered
 * screens. This records what each stage of the capture path actually handed the
 * next one — the file the picker gave, what the browser decoded, what the
 * normaliser produced, what the engine returned and how long it took, and what
 * was parsed — so the next divergence is diagnosable from one capture, on the
 * device, with no devtools.
 *
 * IT ANSWERS THE TRANSIT QUESTION DIRECTLY. A file carried between devices (a
 * cloud drive, a chat app) may be re-encoded on the way, in which case the two
 * engines were handed different images and nothing is wrong with either. The
 * source byte length, the decoded dimensions and the SHA-256 of the source bytes
 * are recorded for exactly that comparison: equal digests on both devices mean
 * the same bytes reached both engines, and the divergence is the engine's.
 *
 * ─────────────── OFF UNLESS THE URL SAYS `?diag=1`, AND LATCHED AT LOAD ────────
 *
 * The flag is read ONCE, when this module is evaluated — which is at app start,
 * because it is reached through static imports from the entry chunk. That is
 * deliberate: in-app navigation drops the query string, so a flag read at the
 * moment of capture would be gone by the time a user reached the Receipts tab.
 * Nothing persists it (D3): a reload without the query turns it off.
 *
 * WITH THE FLAG ABSENT, THE ONLY THING THAT RUNS IS THE CONSTANT BRANCH at each
 * of the three sites that consult it — `extract.ts` (whether to observe the
 * engine), `receiptCapture.ts` (whether to bind a record to its receipt) and
 * `ReceiptViewer.tsx` (whether to render the disclosure). The observing code
 * lives in the lazy `ocr/diagnose.ts` chunk and is never fetched.
 *
 * ─────────────── NOT A FIELD ON `Receipt` (D5), AND HELD IN MEMORY ONLY ───────
 *
 * Records live in this module for the current session and nowhere else. The
 * raw engine text is held here so the viewer can show it; it is never written
 * to a file, a log, a test fixture or the copied JSON — see `diagnosticJson`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** `?diag=1` exactly. Any other value, or none, is off. Pure, so it can be tested. */
export function diagnosticsFlag(search: string): boolean {
  return new URLSearchParams(search).get('diag') === '1'
}

export const CAPTURE_DIAGNOSTICS =
  typeof window !== 'undefined' && diagnosticsFlag(window.location.search)

export interface Dimensions {
  width: number
  height: number
}

export interface PassDiagnostic {
  preparation: 'plain' | 'photo'
  /**
   * What the normaliser handed the engine. `passedThrough` means the identical
   * Blob.
   *
   * `pixelHash` IS A SHA-256 OF THE NORMALISED RGBA PIXEL BUFFER — the pixels
   * as the engine will decode them (Gate 64) — computed and shown ONLY under
   * `?diag=1`. It answers whether two devices' capture pipelines produced the
   * SAME pixels for the same source file, which byte length and dimensions
   * alone cannot: two canvases can differ in file size and still agree on
   * every pixel, or agree on both and still disagree on a pixel. Equal hashes
   * on both devices prove the pixels agree; unequal hashes prove they do not
   * and point at the resampler, not the engine.
   *
   * ON THE PASSED-THROUGH PATH THIS IS THE SOURCE HASH, NOT A DECODE. When
   * `normaliseForOcr` returns the identical Blob unchanged, hashing its own
   * encoded bytes is exact — the pixels a decode would recover are, by
   * definition, whatever that Blob's bytes already encode — so nothing is
   * decoded a second time for a case where normalisation did no work.
   *
   * REGISTERED LIMITATION: this proves whether two devices' pixels DIFFER; it
   * does not make them AGREE. Making the resampler deterministic across
   * backings is not decided here.
   */
  normalised: {
    width: number | null
    height: number | null
    bytes: number
    type: string
    passedThrough: boolean
    pixelHash: string | null
  } | null
  normaliseMs: number | null
  /** Worker start, recognition and terminate — the engine's own wall clock. */
  engineMs: number | null
  /** Characters in the engine's lines joined by "\n" — the text the parser reads. */
  rawTextLength: number | null
  engineConfidence: number | null
  lineCount: number | null
  /** SCREEN ONLY. Never copied, logged or written anywhere. */
  rawText: string | null
  error: string | null
}

export interface CaptureDiagnostic {
  source: { name: string; type: string; bytes: number; sha256: string | null }
  /** True when the source was a PDF and its first page was rasterised first. */
  pdf: boolean
  /** The image the reading pipeline received, before any normalisation. */
  received: {
    bytes: number
    type: string
    /** From the file header (JPEG SOF / PNG IHDR), i.e. as STORED, before EXIF. */
    stored: Dimensions | null
    /** As this browser decoded it, EXIF orientation applied. */
    decoded: Dimensions | null
    exifOrientation: number | null
  } | null
  passes: PassDiagnostic[]
  secondPass: { ran: boolean; trigger: string | null; kept: 'plain' | 'photo' | null; why: string | null }
  result: { items: number; total: number | null; subtotal: number | null; tax: number | null } | null
  error: string | null
  totalMs: number | null
}

const byFile = new WeakMap<File, CaptureDiagnostic>()
const byReceipt = new Map<string, CaptureDiagnostic>()

/** Called by `ocr/diagnose.ts` once a capture has been read (or has failed). */
export function recordDiagnostic(file: File, diagnostic: CaptureDiagnostic): void {
  byFile.set(file, diagnostic)
}

/** Called by `capturedToReceipt` once the receipt's id exists. */
export function bindDiagnostic(file: File, receiptId: string): void {
  const diagnostic = byFile.get(file)
  if (diagnostic) byReceipt.set(receiptId, diagnostic)
}

export function diagnosticFor(receiptId: string): CaptureDiagnostic | undefined {
  return byReceipt.get(receiptId)
}

/**
 * The copyable form: every field EXCEPT the raw engine text. The text can carry
 * a card fragment, a name or a phone number off the paper, and a clipboard is a
 * step from a note, a chat or a ticket. It stays on the screen.
 */
export function diagnosticJson(diagnostic: CaptureDiagnostic): string {
  const passes = diagnostic.passes.map(({ rawText: _omitted, ...rest }) => rest)
  return JSON.stringify({ ...diagnostic, passes }, null, 2)
}
