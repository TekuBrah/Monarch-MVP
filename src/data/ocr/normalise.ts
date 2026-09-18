/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ORIENT A CAPTURED IMAGE AND SIZE IT FOR THE ENGINE (Gate 54, re-sized Gate 56).
 *
 * WHAT IS DONE NOW, IN FULL: the EXIF orientation is applied, and the image is
 * scaled — UP OR DOWN — so its long edge is `OCR_LONG_EDGE` (1600px), then
 * encoded as PNG on a white ground. Nothing else: no greyscale, no contrast
 * change, no sharpening, no thresholding, no engine parameter. An image that is
 * already upright with a long edge of exactly 1600 is returned untouched.
 *
 * Until Gate 56 this module only ever SHRANK, to a 2000px ceiling, and never
 * enlarged. The ten seeded receipts are ~290x525, so they reached the engine at
 * their native size with a median word-box height of 9-10px — far below what
 * Tesseract reads reliably — and nearly every miss Gate 55 attributed to
 * "reading" (lost decimal points, misread digits, lost first words) was that.
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY 1600, AND WHY NOTHING ELSE — THE GATE 56 SWEEP.
 *
 * Measured over the 20-receipt development corpus (10 seeded + 10 real-paper
 * device photographs, 97 printed items), the real engine and the real parser,
 * varying ONE thing at a time from today's pipeline, then combining. Items are
 * correct items / 97; "tot" is printed totals read exactly, of 20.
 *
 *   configuration                         items  tot  junk  wrong-price  seeded merchant
 *   today (shrink to 2000 only)             52   17     8      7            7/10
 *   long edge 1200                          77   18     7      1           10/10
 *   long edge 1400                          80   18     5      3            9/10
 *   long edge 1600          <- shipped      79   18     6      2           10/10
 *   long edge 1800                          79   18     4      4            9/10
 *   long edge 2000                          79   16     5      4            9/10
 *   long edge 3000                          75   18     6      5            9/10
 *   word height 20 / 30 / 40 / 50px       77/75/75/72  (none better than a fixed edge)
 *   greyscale, native size                  48   16    10      5            5/10
 *   Otsu / Sauvola, native size           33 / 28      (binarising 9px text destroys it)
 *   page segmentation 3 / 4 / 11          42 / 36 / 57   (11 reads more, junk 16)
 *   1600 + greyscale                        78   18     6      3           10/10
 *   1600 + Otsu / Sauvola                 68 / 69      (Tesseract binarises better itself)
 *   1600 + high-quality smoothing           79   18     6      2           10/10
 *   1600 + high smoothing + greyscale       80   17     6      3           10/10
 *   1600 + page segmentation 11             82   17    12      3            9/10
 *
 * The plateau runs from 1200 to 2000 and 1600 is inside it rather than on a
 * spike. The rows that read one or three more items all fail something: 1400,
 * 1800 and 2000 each lose a seeded merchant, segmentation 11 doubles the junk,
 * and smoothing + greyscale reads one more item but one fewer total and makes
 * three receipts worse on items. 1600 is the only configuration measured on
 * which NO receipt reads fewer items or loses a total it had before.
 *
 * THE ONE-ITEM MARGINS IN THAT TABLE ARE INSIDE THE NOISE OF ONE CORPUS. Do not
 * re-tune the edge by a hundred pixels on the strength of a single receipt; the
 * case for 1600 is the whole row, not the item count.
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ THE REDRAW IS NO LONGER AVOIDED — AND THE RISK GATE 54 RECORDED WAS CHECKED.
 *
 * Gate 54 returned an untouched image whenever it could, because a redraw at
 * 1:1 is not neutral: the canvas is filled by Chromium's JPEG decoder where the
 * engine would otherwise use Leptonica's, and `receipt_aia01` fell from
 * confidence 77, letterhead and date read, to 35 with neither. The Gate 56 sweep
 * reproduced that exactly (a 1:1 redraw: aia01 77 -> 35).
 *
 * What changed is that the redraw now ENLARGES, and at 1600 the same receipt
 * reads at confidence 87 with its merchant matching its payee — as do all ten
 * seeded merchants, against seven before. The hazard was the decoder difference
 * at a size too small to survive it, not the redraw as such. The pass-through
 * remains for the one case where it still applies (upright, already 1600).
 * ─────────────────────────────────────────────────────────────────────────────
 * WHICH FORMATS IT APPLIES TO.
 *
 * ORIENTATION IS STILL JPEG-ONLY, as Gate 54 stated: only a JPEG's EXIF is read,
 * so a sideways-stored PNG, WebP or HEIC is not rotated. (`createImageBitmap`
 * applies orientation where the browser knows it, so this is a limit of what is
 * DETECTED as needing work, not of the redraw.)
 *
 * SIZING NOW APPLIES TO ANY IMAGE THE BROWSER CAN DECODE — PNG, WebP, and the
 * rasterised first page of a PDF (a 2000px PNG from `rasterise.ts`, reduced here
 * to 1600). The corpus is all JPEG, so for every other format this is a CHOICE,
 * recorded rather than measured: the benefit comes from text size, which is not
 * a property of the container. An image the browser cannot decode is returned
 * unchanged, which is exactly what it received before this gate.
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THE ENGINE CANNOT DO THIS ITSELF, KEPT FROM GATE 54.
 *
 * Tesseract never uses the browser's decoder: `tesseract.js/src/worker/browser/
 * loadImage.js:63` hands a `File`'s raw bytes to the engine, and its own EXIF
 * reader (`worker-script/utils/setImage.js`) matches the Orientation tag only in
 * BIG-ENDIAN byte order — while every phone camera writes little-endian. Measured
 * at Gate 54, same pixels, varying only the EXIF block: "II" -> confidence 27,
 * "MM" -> 83. `loadImage`'s canvas branches also end in raw bytes, so the only
 * way to hand it upright, correctly-sized pixels is to redraw them here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * The long edge every captured image is scaled to — up or down — before
 * recognition. See the Gate 56 table in the header for how it was chosen.
 *
 * ⚠️ IT IS NOW A TARGET, NOT A CEILING. Gate 54 set a 2000px ceiling and noted
 * it was the opposite of `rasterise.ts`'s `TARGET_LONG_EDGE`; that is no longer
 * true, since both now enlarge. They stay separate constants because the PDF
 * value renders VECTOR text and was not measured here — there is no PDF in the
 * corpus — so unifying them would claim a measurement nobody made.
 *
 * MEMORY: the largest canvas this can produce is 1600x1600 RGBA, 10.24 MB. The
 * transient decode of the source is unchanged from Gate 54 — a 4000x2252 phone
 * photograph is ~36 MB of RGBA, released as soon as it is drawn.
 */
export const OCR_LONG_EDGE = 1600

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
 * it, so the pass-through (long edge already `OCR_LONG_EDGE`) can be tested
 * without decoding.
 *
 * A `null` means "not a JPEG, or one this cannot parse". Since Gate 56 the caller
 * then DECODES to learn the size, rather than reading `null` as "no work" as
 * Gate 54 did — sizing now applies to every decodable format.
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
 * WHICH PREPARATION A READING USES (Gate 58).
 *
 *   'plain'  the Gate 56 pipeline: orient, size, white ground, PNG. The FIRST
 *            pass, and the only one a receipt that reads well ever receives.
 *   'photo'  the same, plus the browser's high-quality resampling and a
 *            luminance greyscale. The SECOND pass, run only when the first one
 *            failed — see `secondPass.ts` for the trigger and for how the two
 *            readings are chosen between.
 *
 * WHY THESE TWO STEPS AND NO OTHERS. Gate 57 measured this exact configuration
 * reading 11 of the 39 items on five photographed receipts where 'plain' reads
 * none — the only preprocessing in any sweep that moved a photograph at all.
 * Gate 56 rejected it as the DEFAULT because it costs a development total and
 * makes three receipts worse; run only on a failed first pass, and kept only
 * when it reads more, that cost cannot reach a receipt that already read.
 *
 * THE LONG EDGE IS THE SAME 1600 AND NO ENGINE PARAMETER IS SET. Rotation and
 * size are shared; only resampling and colour differ.
 */
export type OcrPreparation = 'plain' | 'photo'

/**
 * Orient `image` upright and scale its long edge to `OCR_LONG_EDGE`, or return
 * it as-is when neither is needed. `'photo'` always redraws — see above.
 *
 * THE PASS-THROUGH IS NOW RARE AND STILL EXACT: an upright image whose long edge
 * is already 1600 comes back as the identical `Blob`. For a JPEG that is decided
 * from the bytes without decoding; any other format has to be decoded to learn
 * its size, and is still returned untouched when no work turns out to be needed.
 *
 * AN IMAGE THE BROWSER CANNOT DECODE IS RETURNED UNCHANGED, so the engine
 * receives exactly what it received before this module existed and fails, or
 * succeeds, on its own terms.
 */
export async function normaliseForOcr(
  image: Blob,
  preparation: OcrPreparation = 'plain',
): Promise<Blob> {
  const photo = preparation === 'photo'
  const bytes = new Uint8Array(await image.arrayBuffer())

  const orientation = exifOrientation(bytes)
  // 1 is "upright"; so is a missing tag, and so is anything outside 1-8, which
  // is a malformed file rather than an instruction.
  const needsRotation = orientation !== null && orientation >= 2 && orientation <= 8

  // A SHORTCUT, NOT THE GUARANTEE: a JPEG whose frame header already says 1600
  // skips the decode. The identity itself is guaranteed by the check after the
  // decode below, which also covers every other format — measured at Gate 56 by
  // mutation: disabling this line leaves the pass-through test green, disabling
  // that one turns it red.
  const stored = jpegDimensions(bytes)
  if (
    !photo &&
    stored !== null &&
    !needsRotation &&
    Math.max(stored.width, stored.height) === OCR_LONG_EDGE
  ) {
    return image
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(image, { imageOrientation: 'from-image' })
  } catch {
    return image
  }
  try {
    // `from-image` has ALREADY applied the rotation, so these are the upright
    // dimensions and nothing here transposes them a second time.
    const longEdge = Math.max(bitmap.width, bitmap.height)
    if (!photo && !needsRotation && longEdge === OCR_LONG_EDGE) return image

    const scale = OCR_LONG_EDGE / longEdge
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = new OffscreenCanvas(width, height)
    // `willReadFrequently` ONLY FOR 'photo', which reads its pixels back. It
    // picks a CPU-backed canvas, and the backing decides the resampler — so
    // setting it on 'plain' could move the first pass's pixels, which Gate 56
    // measured and Gate 58 must not change.
    const context = canvas.getContext('2d', photo ? { willReadFrequently: true } : undefined)
    if (!context) throw new Error('could not get a 2d context to normalise the capture')

    // WHITE FIRST, for the reason `rasterise.ts` records: a canvas starts
    // transparent, and transparent pixels flatten to BLACK on encode — which
    // would hand the engine black-on-black wherever the source carries alpha.
    // A token would be wrong here: `--mapped-surface-page` dark-flips.
    if (photo) context.imageSmoothingQuality = 'high'
    context.fillStyle = 'white'
    context.fillRect(0, 0, width, height)
    // The browser's DEFAULT smoothing, deliberately. `imageSmoothingQuality:
    // 'high'` was measured at Gate 56 and read the same 79 items while making
    // three receipts worse; the default is what the shipped numbers describe.
    context.drawImage(bitmap, 0, 0, width, height)

    // 'photo' ONLY: luminance greyscale, Rec. 601 weights, rounded — the same
    // arithmetic the Gate 57 sweep measured (`scripts/ocr-corpus/probe.js`), so
    // the measurement transfers to this code rather than to a lookalike.
    if (photo) {
      const pixels = context.getImageData(0, 0, width, height)
      const d = pixels.data
      for (let p = 0; p < d.length; p += 4) {
        const v = Math.round(0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2])
        d[p] = v
        d[p + 1] = v
        d[p + 2] = v
        d[p + 3] = 255
      }
      context.putImageData(pixels, 0, 0)
    }

    // PNG, NOT JPEG. A second lossy generation would damage exactly the
    // high-frequency edges the engine reads letters from.
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    if (!blob) throw new Error('could not encode the normalised capture')
    return blob
  } finally {
    // Frees the decoded bitmap now rather than at the next GC. A 4000x2252
    // photograph is ~36 MB of RGBA and captures arrive in batches. The canvas
    // is a local and is unreachable once this returns.
    bitmap.close()
  }
}
