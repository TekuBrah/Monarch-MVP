/**
 * ─────────── TWO FACTS ABOUT A CAPTURE THAT THE RECEIPT CANNOT STATE ──────────
 *
 * Which surface a capture came from (camera or gallery), and whether its
 * printed date was actually read. Both used to live in module-scope maps inside
 * `flows/finance/receiptCapture.ts` (Gates 60 and 64) and both were lost on a
 * reload — after which a gallery capture retook from the CAMERA, and an undated
 * capture silently became "dated" and left the Receipts tab's "No receipt
 * date" group.
 *
 * GATE 85 (D-10) PUTS THEM ON THE STORED RECORD — `StoredReceipt.captureSource`
 * and `StoredReceipt.capturedAtRead` in `schema.ts` — and keeps them HERE at
 * runtime, keyed by receipt id. The runtime `Receipt` type is unchanged, by
 * ruling (Gate 85 §3: "screens and the runtime types do not change"); the
 * storage boundary copies these facts onto the stored record and back.
 *
 * WHY THIS MODULE AND NOT `receiptCapture.ts`: the storage layer reads and
 * restores them, and the dependency must run flows -> persistence, never the
 * other way. `receiptCapture.ts` keeps its three exported functions and now
 * delegates to these, so no call site moved.
 *
 * A RECEIPT WITH NO ENTRY — every seeded one — answers `undefined` for its
 * source and `true` for its date, exactly as before.
 */

/**
 * WHICH SURFACE A CAPTURE CAME FROM. Declared HERE and aliased by
 * `receiptCapture.ts` as `ReceiptSource`, so there is one definition and the
 * dependency runs flows -> persistence. Importing it the other way would drag
 * the OCR modules' `?url` imports into the e2e type-check (Gate 55's trap).
 */
export type CaptureSource = 'camera' | 'gallery'

const sourceByReceipt = new Map<string, CaptureSource>()
const dateReadByReceipt = new Map<string, boolean>()

export interface CaptureFacts {
  captureSource?: CaptureSource
  capturedAtRead?: boolean
}

export function setCaptureSource(receiptId: string, source: CaptureSource): void {
  sourceByReceipt.set(receiptId, source)
}

export function setCapturedAtRead(receiptId: string, read: boolean): void {
  dateReadByReceipt.set(receiptId, read)
}

export function captureSourceOf(receiptId: string): CaptureSource | undefined {
  return sourceByReceipt.get(receiptId)
}

export function capturedAtReadOf(receiptId: string): boolean {
  return dateReadByReceipt.get(receiptId) ?? true
}

/** What the storage boundary writes onto a stored receipt. Absent keys stay absent. */
export function captureFactsOf(receiptId: string): CaptureFacts {
  const facts: CaptureFacts = {}
  const source = sourceByReceipt.get(receiptId)
  if (source !== undefined) facts.captureSource = source
  const read = dateReadByReceipt.get(receiptId)
  if (read !== undefined) facts.capturedAtRead = read
  return facts
}

/** Hydration's half: restore the facts a stored receipt carried. */
export function restoreCaptureFacts(receiptId: string, facts: CaptureFacts): void {
  if (facts.captureSource !== undefined) sourceByReceipt.set(receiptId, facts.captureSource)
  if (facts.capturedAtRead !== undefined) dateReadByReceipt.set(receiptId, facts.capturedAtRead)
}

/** Reset and rehydration start from nothing. */
export function clearCaptureFacts(): void {
  sourceByReceipt.clear()
  dateReadByReceipt.clear()
}
