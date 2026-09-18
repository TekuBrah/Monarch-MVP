import type { OcrPreparation } from './normalise'
import type { ParsedReceipt } from './parseReceipt'
import { chooseReading, firstPassFailed } from './secondPass'
import type { OcrResult } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * READ A RECEIPT IMAGE, ONCE OR TWICE (Gate 58).
 *
 * The first pass is the Gate 56 pipeline. When it FAILS — no line items or no
 * total, see `secondPass.ts` — the image is read once more with the 'photo'
 * preparation and the better of the two readings is kept.
 *
 * SEQUENTIAL, ONE WORKER PER CALL. Each `recognise` creates its own worker and
 * terminates it before returning, so the second pass starts only after the
 * first worker is gone: at most one engine and one 1600px canvas are resident
 * at a time, which is the property Gate 52's sequential save exists to keep.
 *
 * A SECOND PASS THAT THROWS COSTS NOTHING. The first reading is already in
 * hand, so a failure there is logged and the first reading returned. The first
 * pass's own failure still propagates, exactly as before, to the one catch in
 * `extractCapture` — which is why that function still never rejects.
 *
 * LAZY LIKE EVERYTHING ELSE UNDER `ocr/`. `recognise` and `parseReceipt` are
 * reached by dynamic import so they stay in their own chunks; only the pure
 * rules are imported statically.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ReceiptPass {
  preparation: OcrPreparation
  ocr: OcrResult
  parsed: ParsedReceipt
}

export interface ReceiptReading {
  /** The reading kept. */
  parsed: ParsedReceipt
  /** Every pass run, in order: one, or two when the first failed. */
  passes: ReceiptPass[]
  /** Index into `passes` of the reading kept. */
  chosen: number
}

export async function readReceipt(image: Blob): Promise<ReceiptReading> {
  const [{ recognise }, { parseReceipt }] = await Promise.all([
    import('./recognise'),
    import('./parseReceipt'),
  ])
  const pass = async (preparation: OcrPreparation): Promise<ReceiptPass> => {
    const ocr = await recognise(image, preparation)
    return { preparation, ocr, parsed: parseReceipt(ocr) }
  }

  const first = await pass('plain')
  if (!firstPassFailed(first.parsed)) return { parsed: first.parsed, passes: [first], chosen: 0 }

  let second: ReceiptPass
  try {
    second = await pass('photo')
  } catch (error) {
    console.warn('the second OCR pass failed; keeping the first reading', error)
    return { parsed: first.parsed, passes: [first], chosen: 0 }
  }
  const chosen = chooseReading(first.parsed, second.parsed) === 'second' ? 1 : 0
  return { parsed: [first, second][chosen].parsed, passes: [first, second], chosen }
}
