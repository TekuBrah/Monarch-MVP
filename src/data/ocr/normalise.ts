/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ORIENT AND SIZE A CAPTURED IMAGE BEFORE THE ENGINE READS IT (Gate 54).
 *
 * THE DEFECT THIS EXISTS FOR: THE ENGINE'S OWN EXIF READER IGNORES THE
 * ORIENTATION TAG WHEN THE TIFF HEADER IS LITTLE-ENDIAN — WHICH IS WHAT EVERY
 * PHONE CAMERA WRITES.
 *
 * Tesseract never uses the browser's image decoder. Read from the installed
 * source rather than inferred: `tesseract.js/src/worker/browser/loadImage.js:63`
 * handles a `File` or `Blob` by reading its RAW BYTES (`readFromBlobOrFile`) and
 * handing a `Uint8Array` straight to the engine, which decodes the JPEG itself.
 * That decoder DOES look for an Orientation tag — but only finds it in one of
 * the two byte orders TIFF permits.
 *
 * ⚠️ AN EARLIER VERSION OF THIS NOTE SAID THE TAG WAS IGNORED OUTRIGHT. THAT IS
 * WRONG, AND IT WAS A MUTATION PROOF THAT CAUGHT IT: a fixture built with a
 * BIG-ENDIAN tag read perfectly with this whole module bypassed, so the test
 * meant to guard the fix was passing either way.
 *
 * MEASURED AT GATE 54 ON ONE IMAGE, VARYING ONLY THE EXIF BLOCK — same
 * compressed pixels, same sideways 517x287 frame, same Orientation value of 6:
 *
 *   EXIF block                              engine confidence
 *   "II" little-endian, 36 bytes                  27   <- tag NOT honoured
 *   "MM" big-endian,    34 bytes                  83   <- honoured
 *   "MM" big-endian,    48 KB                     83   <- honoured
 *   "II" little-endian, 48 KB                     27   <- NOT honoured
 *
 * SO IT IS BYTE ORDER, NOT BLOCK SIZE. Size was the first hypothesis — the two
 * device photographs carry 50 KB EXIF blocks with an embedded thumbnail, a
 * MakerNote, XMP in a second APP1 and an MPF segment, against 34 bytes for a
 * hand-built one — and the 48 KB rows above are what refuted it.
 *
 * CONFIRMED ON THE REAL PHOTOGRAPH, PIXELS UNTOUCHED: replacing one device
 * receipt's own 50,363-byte "II" EXIF with a 34-byte "MM" one carrying the same
 * Orientation moved it from confidence 35 (noise, no total, no date) to 69. Both
 * device photographs are "II", as essentially all camera EXIF is.
 * ─────────────────────────────────────────────────────────────────────────────
 * AND ROTATION REALLY IS THE VARIABLE, WHICH IS A SEPARATE CLAIM.
 *
 * Measured on the same two photographs, through an explicit canvas:
 *
 *   variant                       confidence     printed total
 *   raw file, as shipped before    35 / 38       null / null     <- noise
 *   upright, long edge 2000        75 / 55       read  / read
 *   SIDEWAYS, long edge 2000       33 / 34       null / null     <- the control
 *
 * The sideways row takes the identical resize and re-encode and differs only in
 * rotation, and it reproduces the failure exactly. So the defect is orientation
 * reaching the engine unapplied — not scale, and not the re-encode.
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS CANNOT BE FIXED BY PASSING A DIFFERENT KIND OF OBJECT.
 *
 * `loadImage` has branches for `HTMLCanvasElement` and `OffscreenCanvas`, and
 * both end in the same place: the canvas is converted to a blob and read as raw
 * bytes. There is no input type that makes Tesseract ask the browser to decode.
 * The only way to hand it upright pixels is to REDRAW them upright ourselves.
 *
 * SO THIS MODULE READS THE TAG ITSELF, IN BOTH BYTE ORDERS (`exifOrientation`
 * below honours the header rather than assuming one), AND APPLIES THE ROTATION
 * ITSELF. It therefore does not depend on the engine's reader at all, and an
 * upstream fix to that reader would make it redundant rather than wrong.
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ THE REDRAW IS NOT NEUTRAL, AND THAT IS WHY IT IS AVOIDED WHEN IT IS NOT
 * NEEDED. THIS IS THE LOAD-BEARING DESIGN DECISION IN THIS FILE.
 *
 * A first version of this module redrew EVERY image, on the argument that at
 * 1:1 with no rotation a decode -> draw -> encode round-trip is pixel-exact and
 * therefore inert. MEASURED OVER THE TEN SEEDED RECEIPTS, IT IS NOT:
 * `receipt_aia01.jpg` went from confidence 77 with its whole letterhead and its
 * date read to confidence 35 with neither, and `receipt_jayagrocer01.jpg` lost
 * a line item. The round-trip is faithful to the CANVAS, but the canvas was
 * filled by Chromium's JPEG decoder where the engine would otherwise have used
 * Leptonica's — two different IDCT and chroma-upsampling implementations, whose
 * outputs differ slightly everywhere. On a 292x531 photograph of thermal print
 * that is enough to move glyph decisions.
 *
 * SO AN IMAGE THAT NEEDS NO WORK IS RETURNED UNTOUCHED, and the inertness claim
 * stops being an argument about round-trips and becomes an identity: the engine
 * receives the very same bytes it received before this gate. That is what makes
 * the ten seeded receipts, `e2e/fixtures/receipt-capture.jpg` and the whole
 * `ocr.spec.ts` expectation set provably unaffected — and it is why the
 * pass-through is a correctness requirement rather than an optimisation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * The long edge a captured photograph is reduced to before recognition.
 *
 * ⚠️ THIS IS A CEILING, NEVER A TARGET. It is the OPPOSITE of
 * `TARGET_LONG_EDGE` in `rasterise.ts`, which uses `Math.max` and deliberately
 * ENLARGES: a PDF page is vector, so drawing it bigger renders real additional
 * glyph detail. A photograph is a raster, so enlarging it only interpolates —
 * cost with no information. Do not unify the two constants; they express
 * opposite intentions that happen to share a number.
 *
 * IT IS NOT WHAT FIXES THE DEFECT, AND SAYING SO MATTERS. Rotation is. Measured
 * on one device photograph, correctly oriented, varying only the long edge:
 *
 *   800 -> 67    1200 -> 77    1600 -> 77    2000 -> 74    3000 -> 68    4000 -> 67
 *
 * The page reads at every size, so the cap buys a few points of confidence and
 * a much smaller decode — a 4000x2252 frame is ~36 MB of RGBA, and captures
 * arrive in batches — rather than correctness. 2000 sits at the top of the flat
 * part of that curve and matches `rasterise.ts`'s budget, so one number serves
 * both paths. DO NOT TUNE IT TO 1200 ON THE STRENGTH OF ONE RECEIPT: the
 * difference is inside the noise of a single measurement on a single page.
 */
export const MAX_LONG_EDGE = 2000

/**
 * The EXIF Orientation of a JPEG, or `null` for any image that does not say.
 *
 * READ FROM THE BYTES RATHER THAN FROM A DECODE, because the browser gives no
 * way to ask. `createImageBitmap` APPLIES the tag and then reports the result,
 * and its legacy `imageOrientation: 'none'` no longer means "ignore EXIF" —
 * measured at Gate 54, Chromium returned the same upright 2252x4000 bitmap for
 * `'from-image'`, for `'none'` and for the bare call. So comparing two decodes
 * cannot detect a rotation, and the tag has to be parsed.
 *
 * It walks the JPEG marker chain to APP1, checks the `Exif` signature, then
 * reads IFD0 in whichever byte order the TIFF header declares, looking for tag
 * 0x0112. Anything it does not understand — a truncated segment, a PNG, a
 * missing tag — returns `null`, which callers treat as "upright".
 */
export function exifOrientation(bytes: Uint8Array): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.length < 4 || view.getUint16(0) !== 0xffd8) return null // not a JPEG

  let offset = 2
  while (offset + 4 <= bytes.length) {
    if (view.getUint8(offset) !== 0xff) {
      offset += 1
      continue
    }
    const marker = view.getUint8(offset + 1)
    // Standalone markers carry no length. SOS (0xda) begins the entropy-coded
    // scan, past which no metadata segment can appear.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }
    if (marker === 0xda || marker === 0xd9) return null
    const length = view.getUint16(offset + 2)
    if (length < 2 || offset + 2 + length > bytes.length) return null

    if (marker === 0xe1 && length >= 14) {
      const sig = offset + 4
      // "Exif" followed by two zero bytes.
      const isExif = view.getUint32(sig) === 0x45786966 && view.getUint16(sig + 4) === 0x0000
      if (isExif) {
        const tiff = sig + 6
        const byteOrder = view.getUint16(tiff)
        if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return null
        const little = byteOrder === 0x4949
        const ifd0 = tiff + view.getUint32(tiff + 4, little)
        if (ifd0 + 2 > bytes.length) return null
        const count = view.getUint16(ifd0, little)
        for (let i = 0; i < count; i += 1) {
          const entry = ifd0 + 2 + i * 12
          if (entry + 12 > bytes.length) return null
          if (view.getUint16(entry, little) === 0x0112) {
            return view.getUint16(entry + 8, little)
          }
        }
      }
    }
    offset += 2 + length
  }
  return null
}

/**
 * Stored pixel dimensions from a JPEG's frame header, or `null` for anything
 * this cannot read.
 *
 * "STORED" IS THE POINT: these are the dimensions before EXIF rotation. A
 * rotation cannot change which number is the LONG edge, only which axis carries
 * it, so the budget can be tested without decoding.
 *
 * A `null` means "not a JPEG, or one this cannot parse", and the caller reads
 * that as "no shrink needed". THE CONSERVATIVE DIRECTION IS DELIBERATE: an
 * unrecognised image then passes through to the engine exactly as it did before
 * this gate, so a format this does not understand cannot be made worse by it.
 */
export function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.length < 4 || view.getUint16(0) !== 0xffd8) return null

  let offset = 2
  while (offset + 4 <= bytes.length) {
    if (view.getUint8(offset) !== 0xff) {
      offset += 1
      continue
    }
    const marker = view.getUint8(offset + 1)
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }
    if (marker === 0xda || marker === 0xd9) return null
    const length = view.getUint16(offset + 2)
    if (length < 2 || offset + 2 + length > bytes.length) return null

    // SOF0-SOF15 carry the frame header. DHT (0xc4), JPG (0xc8) and DAC (0xcc)
    // share that marker range and do not.
    const isFrameHeader =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isFrameHeader && length >= 7) {
      return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) }
    }
    offset += 2 + length
  }
  return null
}

/**
 * Orient `image` upright and shrink it to `MAX_LONG_EDGE`, or return it as-is.
 *
 * THE PASS-THROUGH IS THE COMMON CASE AND IT IS EXACT — see the header. An
 * image already upright and already within budget comes back as the identical
 * `Blob`, so the engine reads the same bytes it always did.
 *
 * ⚠️ ONLY JPEG IS INSPECTED, AND THAT IS A STATED LIMITATION RATHER THAN AN
 * OVERSIGHT. Both readers below return `null` for anything else, so a PNG, WebP
 * or HEIC capture passes straight through — neither rotated nor shrunk. That is
 * EXACTLY the behaviour every capture had before this gate, so no format can be
 * made worse by this module; what it means is that the defect would return for a
 * non-JPEG photograph carrying an orientation tag. It has not been seen: the
 * device photographs that opened Gate 54 are JPEG, as camera output almost
 * always is. Widen it when a real capture needs it, with a fixture — not
 * pre-emptively.
 */
export async function normaliseForOcr(image: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await image.arrayBuffer())

  const orientation = exifOrientation(bytes)
  // 1 is "upright"; so is a missing tag, and so is anything outside 1-8, which
  // is a malformed file rather than an instruction.
  const needsRotation = orientation !== null && orientation >= 2 && orientation <= 8

  const stored = jpegDimensions(bytes)
  const needsShrink = stored !== null && Math.max(stored.width, stored.height) > MAX_LONG_EDGE

  if (!needsRotation && !needsShrink) return image

  const bitmap = await createImageBitmap(image, { imageOrientation: 'from-image' })
  try {
    // `from-image` has ALREADY applied the rotation, so these are the upright
    // dimensions and nothing here transposes them a second time.
    const longEdge = Math.max(bitmap.width, bitmap.height)
    const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('could not get a 2d context to normalise the capture')

    // WHITE FIRST, for the reason `rasterise.ts` records: a canvas starts
    // transparent, and transparent pixels flatten to BLACK on encode — which
    // would hand the engine black-on-black wherever the source carries alpha.
    // A token would be wrong here: `--mapped-surface-page` dark-flips.
    context.fillStyle = 'white'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)

    // PNG, NOT JPEG. This runs on an image the camera has already JPEG-encoded
    // once; re-encoding would add a second generation of loss to exactly the
    // high-frequency edges the engine reads letters from.
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    if (!blob) throw new Error('could not encode the normalised capture')
    return blob
  } finally {
    // Frees the decoded bitmap now rather than at the next GC. A 4000x2252
    // photograph is ~36 MB of RGBA and captures arrive in batches.
    bitmap.close()
  }
}

