import {
  recordDiagnostic,
  type CaptureDiagnostic,
  type Dimensions,
  type PassDiagnostic,
} from '../captureDiagnostics'
import { exifOrientation, jpegDimensions, normaliseForOcr, pngDimensions } from './normalise'
import type { ParsedReceipt } from './parseReceipt'
import { readReceiptWith, type Recogniser } from './read'
import { recogniseNormalised } from './recognise'
import { describeFirstPassFailure, explainChoice } from './secondPass'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * READ ONE CAPTURE AND RECORD WHAT EVERY STAGE HANDED THE NEXT (Gate 59).
 *
 * REACHED ONLY WHEN `?diag=1` WAS ON THE URL AT LOAD, and only by dynamic
 * import from `extract.ts`, so it is its own lazy chunk and a session without
 * the flag never fetches it.
 *
 * IT OBSERVES AND DOES NOT DECIDE. The reading itself is `readReceiptWith`, the
 * pipeline's own trigger-and-choose, handed a recogniser that is the pipeline's
 * own two halves — `normaliseForOcr` then `recogniseNormalised` — with timing
 * and measurement between them. Nothing it measures is fed back: the image the
 * engine receives is the Blob the normaliser returned, untouched.
 *
 * TWO THINGS IT DOES THAT THE PLAIN PATH DOES NOT, BOTH READ-ONLY: it hashes the
 * source bytes (SHA-256, so the same file on two devices can be proven the same
 * file), and it decodes the received image once to learn the dimensions THIS
 * browser decodes it to. That decode is closed immediately; it is extra memory
 * for a moment on a flagged session, and nothing on an unflagged one.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function errorText(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}

/**
 * SHA-256 of a byte buffer, as lowercase hex — the one digest routine every
 * hash on this page shares, so the source hash, the passed-through pixel
 * hash and the decoded pixel hash cannot drift into three implementations of
 * the same six lines.
 */
async function digestHex(bytes: ArrayBufferLike): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', bytes as ArrayBuffer)
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // `crypto.subtle` exists only in a secure context. The deploy is https and
    // localhost counts as secure, so this is for a LAN-address dev server.
    return null
  }
}

async function sha256Hex(blob: Blob): Promise<string | null> {
  return digestHex(await blob.arrayBuffer())
}

function headerDimensions(bytes: Uint8Array): Dimensions | null {
  return jpegDimensions(bytes) ?? pngDimensions(bytes)
}

/**
 * A SHA-256 of the normalised image's DECODED RGBA PIXELS, or the passed-
 * through blob's own bytes when normalisation did nothing — see the field's
 * doc comment in `captureDiagnostics.ts` for why the two paths differ.
 *
 * PNG, NOT JPEG, IS WHAT MAKES THE DECODE TRUSTWORTHY. `normaliseForOcr`
 * always encodes its redrawn output as PNG, which is lossless — so decoding
 * it back with `createImageBitmap` recovers the EXACT pixel buffer the canvas
 * encoded, unlike a JPEG re-decode, which is exactly the decoder-dependent
 * hazard this whole module exists to detect rather than to reintroduce.
 *
 * `null` ON FAILURE, NEVER THROWN — the same discipline every other
 * diagnostic field in this file follows: a hashing failure is one blank row,
 * not a broken capture.
 */
// EXPORTED FOR THE TEST ONLY — same reason `secondPass.ts` exports its own
// internals (`chooseReading`, `firstPassFailed`, …): `diagnoseExtraction` is
// the one production entry point, and this lets a fixture-level test target
// the hashing mechanism directly rather than through a whole capture.
export async function pixelHashOf(blob: Blob, passedThrough: boolean): Promise<string | null> {
  if (passedThrough) return sha256Hex(blob)
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(blob)
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height)
    return await digestHex(pixels.data.buffer)
  } catch {
    return null
  } finally {
    bitmap?.close()
  }
}

async function decodedDimensions(blob: Blob): Promise<Dimensions | null> {
  try {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
    const dims = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return dims
  } catch {
    return null
  }
}

function summarise(parsed: ParsedReceipt): NonNullable<CaptureDiagnostic['result']> {
  const cents = parsed.lineItems.reduce((sum, item) => sum + Math.round(item.price * 100), 0)
  return {
    items: parsed.lineItems.length,
    total: parsed.total,
    // DERIVED THE WAY `receiptSubtotalRead` DERIVES IT: a sum over no lines is
    // the absence of a subtotal, not zero.
    subtotal: parsed.lineItems.length > 0 ? cents / 100 : null,
    tax: parsed.tax,
  }
}

export async function diagnoseExtraction(
  file: File,
  rasterise: (file: File) => Promise<Blob>,
  isPdf: boolean,
): Promise<ParsedReceipt> {
  const started = performance.now()
  const diagnostic: CaptureDiagnostic = {
    source: { name: file.name, type: file.type, bytes: file.size, sha256: null },
    pdf: isPdf,
    received: null,
    passes: [],
    secondPass: { ran: false, trigger: null, kept: null, why: null },
    result: null,
    error: null,
    totalMs: null,
  }
  // RECORDED BEFORE ANYTHING CAN THROW, and mutated in place from here on, so a
  // capture that fails part-way still shows every stage it did reach.
  recordDiagnostic(file, diagnostic)

  try {
    diagnostic.source.sha256 = await sha256Hex(file)

    const image: Blob = isPdf ? await rasterise(file) : file
    const bytes = new Uint8Array(await image.arrayBuffer())
    diagnostic.received = {
      bytes: image.size,
      type: image.type,
      stored: headerDimensions(bytes),
      decoded: await decodedDimensions(image),
      exifOrientation: exifOrientation(bytes),
    }

    const observed: Recogniser = async (input, preparation) => {
      const pass: PassDiagnostic = {
        preparation,
        normalised: null,
        normaliseMs: null,
        engineMs: null,
        rawTextLength: null,
        engineConfidence: null,
        lineCount: null,
        rawText: null,
        error: null,
      }
      diagnostic.passes.push(pass)
      try {
        const t0 = performance.now()
        const normalised = await normaliseForOcr(input, preparation)
        const t1 = performance.now()
        pass.normaliseMs = Math.round(t1 - t0)
        const header = headerDimensions(new Uint8Array(await normalised.arrayBuffer()))
        const dims = header ?? (await decodedDimensions(normalised))
        const passedThrough = normalised === input
        pass.normalised = {
          width: dims?.width ?? null,
          height: dims?.height ?? null,
          bytes: normalised.size,
          type: normalised.type,
          passedThrough,
          pixelHash: await pixelHashOf(normalised, passedThrough),
        }

        const t2 = performance.now()
        const ocr = await recogniseNormalised(normalised)
        pass.engineMs = Math.round(performance.now() - t2)
        const text = ocr.lines.map((line) => line.text).join('\n')
        pass.rawText = text
        pass.rawTextLength = text.length
        pass.engineConfidence = ocr.confidence
        pass.lineCount = ocr.lines.length
        return ocr
      } catch (error) {
        pass.error = errorText(error)
        throw error
      }
    }

    const reading = await readReceiptWith(image, observed)

    // "RAN" MEANS ATTEMPTED. A second pass that threw is kept out of
    // `reading.passes` by `read.ts`, but it did run, and its error is on its row.
    const firstParsed = reading.passes[0].parsed
    diagnostic.secondPass.trigger = describeFirstPassFailure(firstParsed)
    diagnostic.secondPass.ran = diagnostic.passes.length > 1
    diagnostic.secondPass.kept = reading.passes[reading.chosen].preparation
    if (reading.passes.length > 1) {
      diagnostic.secondPass.why = explainChoice(firstParsed, reading.passes[1].parsed).why
    } else if (diagnostic.secondPass.ran) {
      diagnostic.secondPass.why = 'second pass failed; the first reading was kept'
    } else {
      diagnostic.secondPass.why = 'first pass read line items and a total; no second pass'
    }

    diagnostic.result = summarise(reading.parsed)
    return reading.parsed
  } catch (error) {
    diagnostic.error = errorText(error)
    throw error
  } finally {
    diagnostic.totalMs = Math.round(performance.now() - started)
  }
}
