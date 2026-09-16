import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { PINNED_NOW } from './harness'
import { exifOrientation, jpegDimensions, normaliseForOcr } from '../src/data/ocr/normalise'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE REAL ENGINE, RUN ONCE (Gate 50-B).
 *
 * Every other spec in this suite runs against `installExtractionStub` — a
 * never-settling promise installed before the app's first render, on all 32 walk
 * states. That is correct and must stay that way: `[overlay:add-saving]`
 * photographs a surface that exists only WHILE extraction is outstanding, and
 * against anything that eventually answers the capture is a race.
 *
 * THIS SPEC IS THE ONE PLACE THE STUB IS NOT INSTALLED, and that is why it does
 * its own navigation instead of calling `gotoRoute`. Without it, the entire OCR
 * path — three own-origin assets, a Web Worker, a WebAssembly engine and the
 * parser — would ship with nothing exercising it, and the suite's 268 green
 * tests would be 268 green tests about a code path nobody had run.
 *
 * NO BASELINE, AND NO PIXEL ASSERTION OF ANY KIND. It asserts on parsed
 * structure and on which hosts were contacted. Both are facts about the
 * extraction, not about a render.
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE TEST, BECAUSE ONE OCR RUN.
 *
 * The structural assertions and the network census both describe the SAME
 * recognition, so splitting them into two tests would run the engine twice —
 * doubling the cost of the slowest thing in the suite to assert the same two
 * things. They are one test with two groups of expectations.
 * ─────────────────────────────────────────────────────────────────────────────
 * IT REQUIRES THE VITE DEV SERVER, AND THAT IS A REAL LIMITATION, STATED.
 *
 * The assertions below need the extractor's RETURN VALUE, and `Receipt.merchant`
 * is rendered NOWHERE in this app — checked at this gate: the only reader in
 * `src/` is the receipt search predicate at `derive.ts:899`. So a DOM-only
 * assertion on the parsed merchant is not possible, and the spec reaches the
 * seam by importing the module the way the app does.
 *
 * `playwright.config.ts` starts `npm run dev`, so `/src/data/extract.ts` is a
 * module the page can import. It is NOT importable from a `vite preview` build,
 * where the sources are bundled — so Gate 22's dual-build comparison, which
 * attaches the suite to `vite preview`, will fail this one test with the
 * message below rather than mysteriously. That is the intended behaviour: a
 * loud, explained failure beats a silent skip that quietly stops covering the
 * engine.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * The fixture, and why it lives outside `public/`.
 *
 * Byte-identical to `public/media/receipts/receipt_ikea02.jpg` (sha256
 * 0da248910a8bd380d727b2809267091af324a42533f105136f02c8f0acd13289, 47,696
 * bytes) but kept as test input rather than product data, so no future decision
 * about the seeded receipt set can change what this spec reads. Gate 50 chose
 * that duplication deliberately and it is what makes the expectations below
 * stable.
 *
 * REPO-RELATIVE, matching the two `chooseFiles` steps in `e2e/harness.ts` that
 * name the same file. Playwright runs with the project root as its working
 * directory, so one convention serves both and there is no second spelling of
 * this path to drift.
 */
const FIXTURE = 'e2e/fixtures/receipt-capture.jpg'

/**
 * The same receipt, stored sideways. See the Gate 54 test at the foot of this
 * file for how it is built and why it is a synthetic rotation rather than one
 * of the two real device photographs.
 */
const ROTATED_FIXTURE = 'e2e/fixtures/receipt-capture-rotated.jpg'

/** The seam, as the dev server serves it. See the `import()` note below. */
const MODULE_PATH = '/src/data/extract.ts'

/**
 * `ExtractedReceipt`, restated rather than imported.
 *
 * IMPORTING THE REAL TYPE FROM `src/` WOULD PUT AN APP MODULE IN THIS SPEC'S
 * OWN GRAPH, which is the thing that would make the check circular: the spec
 * would then be asserting that the module agrees with itself.
 *
 * ⚠️ CORRECTED AT GATE 50-C. This note used to claim that restating the shape
 * "means a change to the seam's signature shows up here as a type error". It
 * does not: nothing ties this interface to `ExtractedReceipt`, and Gate 50-C
 * widened three of the seam's fields to `| null` while this file went on
 * type-checking unchanged. What would catch a change is the RUNTIME assertions
 * below, which require the merchant, date and total all to have been read.
 */
interface ExtractedShape {
  merchant: string
  capturedAt: string
  total: number
  tax: number | null
  currency: string
  lineItems: { name: string; quantity: string; price: number }[]
}

interface EvaluateArg {
  base64: string
  modulePath: string
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THE PAGE SHOWS, AND WHAT THE ENGINE ACTUALLY READS OFF IT.
 *
 * `src/data/receipts.ts` records this receipt from the photograph: IKEA,
 * 06/09/2025 08:00, two line items at 79.90 and 49.90, subtotal 129.80, SST
 * 7.79, total 137.59 — and notes it as one of only three of the ten that
 * reconcile exactly.
 *
 * THE ENGINE AGREES ON EVERYTHING EXCEPT THE TAX, AND THE EXPECTATION BELOW
 * RECORDS THE DISAGREEMENT RATHER THAN HIDING IT. Tesseract reads the SST line
 * as `7.19` where the paper prints `7.79`. That is a genuine misread of a real
 * receipt by a real engine, and the honest thing for a test to assert is what
 * the engine produces — so `EXPECTED.tax` is 7.19.
 *
 * IF THIS ASSERTION EVER STARTS FAILING WITH 7.79, THE ENGINE GOT BETTER AND
 * THE FIX IS TO UPDATE THE NUMBER — not to widen the assertion into a range.
 * A tolerance here would stop the spec noticing that OCR quality had moved at
 * all, in either direction, which is most of what it is for.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const EXPECTED = {
  /**
   * The LEGAL name, not the brand. The page's letterhead reads "IKEA Southeast
   * Asia Sdn Bhd" and the parser cuts at the legal suffix; the ledger's payee
   * is "IKEA". Nothing readable on the page could shorten one to the other, so
   * this is the field most in need of human correction — see
   * `parseReceipt.ts`'s `readMerchant`.
   */
  merchant: 'IKEA Southeast Asia',
  /** DD/MM/YYYY read day-first, as a Malaysian receipt prints it. */
  capturedAt: '2025-09-06T08:00:00',
  total: 137.59,
  /** The engine's reading. The paper prints 7.79 — see the note above. */
  tax: 7.19,
  currency: 'MYR',
  itemCount: 2,
  /** DERIVED — the sum of the two line items, never transcribed. */
  subtotal: 129.8,
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE NORMALISER'S PASS-THROUGH IS AN IDENTITY, NOT AN APPROXIMATION.
 * Gate 54.
 *
 * WHY THIS IS WORTH A TEST OF ITS OWN. The first version of `normaliseForOcr`
 * redrew EVERY image, on the reasonable-sounding argument that at 1:1 with no
 * rotation a decode -> draw -> encode round-trip is pixel-exact and therefore
 * inert. MEASURED OVER THE TEN SEEDED RECEIPTS, IT IS NOT: `receipt_aia01` fell
 * from confidence 77 with its whole letterhead and date read to 35 with
 * neither, and `receipt_jayagrocer01` lost a line item. The round-trip is
 * faithful to the canvas, but the canvas is filled by Chromium's JPEG decoder
 * where the engine would otherwise have used Leptonica's.
 *
 * SO THE PASS-THROUGH IS A CORRECTNESS REQUIREMENT, NOT AN OPTIMISATION, and
 * "returns the same bytes" has to be asserted rather than assumed. These run in
 * Node with no page, because the pass-through path reads bytes and never
 * touches a canvas — which is exactly the property under test.
 * ─────────────────────────────────────────────────────────────────────────────
 */
test.describe('the capture normaliser', () => {
  test('an upright, in-budget image is returned UNTOUCHED', async () => {
    const blob = new Blob([fs.readFileSync(FIXTURE)], { type: 'image/jpeg' })
    const out = await normaliseForOcr(blob)
    // THE SAME OBJECT, not merely an equal one. Anything else means a redraw
    // happened, and a redraw is what cost `receipt_aia01` its letterhead.
    expect(out, 'the identical Blob comes back').toBe(blob)
  })

  test('the orientation tag is read from the bytes, and its absence is null', () => {
    expect(exifOrientation(new Uint8Array(fs.readFileSync(ROTATED_FIXTURE)))).toBe(6)
    expect(exifOrientation(new Uint8Array(fs.readFileSync(FIXTURE)))).toBeNull()
  })

  test('stored dimensions come off the frame header, before any rotation', () => {
    // The rotated fixture is stored LANDSCAPE and displays portrait. Reading the
    // stored frame is what lets the long-edge budget be tested without decoding.
    expect(jpegDimensions(new Uint8Array(fs.readFileSync(ROTATED_FIXTURE)))).toEqual({
      width: 517,
      height: 287,
    })
    expect(jpegDimensions(new Uint8Array(fs.readFileSync(FIXTURE)))).toEqual({
      width: 287,
      height: 517,
    })
  })
})

test.describe('real OCR behind the extraction seam', () => {
  // The engine loads a 3.72 MB WebAssembly core and a 2.82 MB language model
  // from the dev server before it recognises anything, and the recognition
  // itself is real work. Generous, and still a hard ceiling rather than a
  // retry — the default 30s would be a coin toss on a busy machine.
  test.setTimeout(180_000)

  test('recognises the fixture, parses it, and contacts no third party', async ({
    page,
    baseURL,
  }) => {
    // Pinned for the same reason every other spec pins it: `extract.ts` falls
    // back to `new Date()` for a receipt whose printed date is unreadable, and a
    // test should not depend on which branch it took.
    await page.clock.setFixedTime(PINNED_NOW)

    /**
     * THE NETWORK CENSUS IS ARMED BEFORE NAVIGATION, and it has to be: the
     * whole point is to catch a fetch nobody intended, and one that happened
     * during page load would be missed by a listener attached afterwards.
     *
     * ON THE CONTEXT, NOT ON THE PAGE, AND THAT IS THE LOAD-BEARING CHOICE.
     * Tesseract does its work in a Web Worker and pulls the engine in with
     * `importScripts`; page-level request events do not reliably cover requests
     * a worker makes. A census that cannot see the worker's own fetches would be
     * blind to precisely the three requests this test exists to check.
     */
    const requested: string[] = []
    page.context().on('request', (r) => requested.push(r.url()))

    // NOT `gotoRoute` — see the header. This is the one page in the suite that
    // must reach the real implementation.
    await page.goto('/', { waitUntil: 'networkidle' })

    const fixtureBase64 = fs.readFileSync(FIXTURE).toString('base64')

    /**
     * The bytes are carried in as base64 and reassembled into a `File`, because
     * the fixture is deliberately not served by the app — it is not under
     * `public/`, so the page cannot fetch it. A `File` is what the real capture
     * surfaces hand to the seam, so it is what this hands over too.
     */
    const extracted = await page.evaluate<ExtractedShape, EvaluateArg>(
      async ({ base64, modulePath }) => {
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
        const file = new File([bytes], 'receipt-capture.jpg', { type: 'image/jpeg' })

        let mod: { extractReceipt: (f: File) => Promise<ExtractedShape> }
        try {
          // THE SPECIFIER IS PASSED IN AS DATA, NOT WRITTEN AS A LITERAL, and
          // that is not a style choice: TypeScript resolves a literal
          // `import()` specifier at compile time and fails the type-check gate
          // on a path that only exists inside the browser. It is a URL the page
          // fetches, not a module this file depends on.
          mod = await import(modulePath)
        } catch (cause) {
          throw new Error(
            `could not import ${modulePath} — this spec needs the Vite dev ` +
              'server (playwright.config.ts starts `npm run dev`). It cannot run ' +
              'against a `vite preview` build, where the sources are bundled. ' +
              `Underlying error: ${String(cause)}`,
          )
        }
        return mod.extractReceipt(file)
      },
      { base64: fixtureBase64, modulePath: MODULE_PATH },
    )

    // ── what the parser read ──────────────────────────────────────────────
    expect(extracted.merchant).toBe(EXPECTED.merchant)
    expect(extracted.capturedAt).toBe(EXPECTED.capturedAt)
    expect(extracted.total).toBe(EXPECTED.total)
    expect(extracted.tax).toBe(EXPECTED.tax)
    expect(extracted.currency).toBe(EXPECTED.currency)

    // ── the line items, and the subtotal DERIVED from them ────────────────
    expect(extracted.lineItems).toHaveLength(EXPECTED.itemCount)
    expect(extracted.lineItems.map((i) => i.price)).toEqual([79.9, 49.9])
    // Both names come off the page. "BLAHAJ" is the engine's reading of
    // "BLÅHAJ" — the accent does not survive OCR, and asserting the real
    // output is the point.
    expect(extracted.lineItems[0].name).toBe('BLAHAJ Soft Toy')
    expect(extracted.lineItems[1].name).toBe('IKEA 365+ Food Container')
    expect(extracted.lineItems[0].quantity).toBe('1')

    const subtotal = extracted.lineItems.reduce((sum, i) => sum + i.price, 0)
    // Two decimal places, because floating-point addition of 79.9 and 49.9 does
    // not land exactly on 129.8. `receiptSubtotal()` in `derive.ts` is the
    // function that does this for real; the sum is repeated here so this spec
    // asserts the ARITHMETIC rather than agreeing with another implementation
    // of it.
    expect(subtotal).toBeCloseTo(EXPECTED.subtotal, 2)

    /**
     * ── THE IMAGE NEVER LEFT THE DEVICE ──────────────────────────────────
     *
     * Roadmap D9, asserted by observation rather than by reading the source.
     * That distinction matters here: the shipped bundle still CONTAINS three
     * `cdn.jsdelivr.net` strings, because they are Tesseract's own defaults for
     * `workerPath`, `corePath` and `langPath`. All three are overridden — the
     * first two with own-origin `?url` assets, the third by pointing `langPath`
     * at `/ocr` on this origin (corrected at Gate 50-C: this said "by handing
     * the model in as bytes", which is the `Lang[]` route `recognise.ts`
     * records as broken upstream in 7.0.0 and did not ship) — so none is ever
     * requested. But "unreachable" read off
     * minified control flow is a claim; a request census is a measurement.
     *
     * EVERY request the page made, from navigation through recognition, must be
     * same-origin. A CDN fetch for the worker, the engine or the language model
     * would appear here — and would still have produced a correct parse above,
     * which is exactly why the structural assertions alone are not enough.
     */
    const origin = new URL(baseURL ?? 'http://localhost:5174').origin
    const foreign = requested.filter((url) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) return false
      return new URL(url).origin !== origin
    })
    expect(
      foreign,
      'the OCR path must fetch its worker, engine and language model from this ' +
        'origin only — a third-party request here means a Tesseract default was ' +
        'not overridden, so reading a receipt would tell a host the user did ' +
        'not choose that they are doing it',
    ).toEqual([])

    // And the three own-origin assets really were fetched, so the census above
    // is not vacuously green on a run where OCR somehow did no loading at all.
    const fetched = (needle: string) => requested.some((u) => u.includes(needle))
    expect(fetched('worker.min'), 'the Tesseract worker was served').toBe(true)
    expect(fetched('tesseract-core'), 'the WebAssembly engine was served').toBe(true)
    expect(fetched('traineddata'), 'the language model was served').toBe(true)
  })

  /**
   * ───────────────────────────────────────────────────────────────────────────
   * A PHOTOGRAPH STORED SIDEWAYS READS THE SAME AS ONE STORED UPRIGHT.
   * Gate 54.
   *
   * THE DEFECT THIS GUARDS: the engine's own EXIF reader honours the
   * Orientation tag only when the TIFF header is BIG-ENDIAN ("MM"), and every
   * phone camera writes LITTLE-ENDIAN ("II"). Tesseract never uses the
   * browser's decoder — `tesseract.js/src/worker/browser/loadImage.js:63` hands
   * a `File`'s raw bytes straight to the engine — so a phone photograph reached
   * it lying on its side and came back as noise. Measured on two real receipts:
   * confidence 35 and 38, no total, no date, no items. `normaliseForOcr` in
   * `src/data/ocr/normalise.ts` reads the tag in both byte orders and applies
   * the rotation itself.
   *
   * ───────── WHY THE FIXTURE IS A ROTATED COPY OF THE ONE ABOVE ─────────────
   *
   * `receipt-capture-rotated.jpg` is `receipt-capture.jpg` with its PIXELS
   * turned 90° anticlockwise and an EXIF Orientation of 6 ("rotate 90°
   * clockwise to display") spliced in — so it is stored 517x287 landscape and
   * displays as the same upright 287x517 receipt.
   *
   * ⚠️ ITS EXIF IS LITTLE-ENDIAN ON PURPOSE, AND THE FIRST VERSION WAS NOT.
   * Built big-endian, this test PASSED WITH THE FIX BYPASSED — the engine
   * honoured the tag by itself, so the fixture proved nothing. That was found
   * by mutation, not by reading it. A fixture for a device defect has to be
   * written the way the device writes it.
   *
   * THE TWO REAL DEVICE PHOTOGRAPHS ARE DELIBERATELY NOT COMMITTED. They carry
   * a cashier's full name, a member name, partial card numbers
   * (`467851XXXXXX9472`) and an e-invoice QR — so they are held as local
   * evidence and this synthetic stand-in guards the mechanism instead. It is
   * also the better instrument: it isolates orientation as the ONLY variable,
   * where a second real receipt would vary in layout, print quality and
   * lighting all at once.
   *
   * IT ASSERTS THE SAME `EXPECTED` AS THE UPRIGHT FIXTURE, FIELD FOR FIELD, and
   * that equality is the whole claim: after the fix, how a capture happens to be
   * stored is invisible to the parser. The fixture is encoded at quality 1.0
   * precisely so the comparison is exact — at 0.95 the second line item read
   * 4.9 rather than 49.9, which would have made this assert a degradation
   * artifact of the fixture rather than a property of the app.
   *
   * BEFORE THE FIX THIS TEST FAILS AT THE FIRST ASSERTION, with a merchant of
   * scan noise and a `null` total.
   * ───────────────────────────────────────────────────────────────────────────
   */
  test('a sideways-stored capture parses identically to the upright one', async ({ page }) => {
    await page.clock.setFixedTime(PINNED_NOW)
    await page.goto('/', { waitUntil: 'networkidle' })

    const base64 = fs.readFileSync(ROTATED_FIXTURE).toString('base64')
    const extracted = await page.evaluate<ExtractedShape, EvaluateArg>(
      async ({ base64, modulePath }) => {
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
        const file = new File([bytes], 'receipt-capture-rotated.jpg', { type: 'image/jpeg' })
        let mod: { extractReceipt: (f: File) => Promise<ExtractedShape> }
        try {
          mod = await import(modulePath)
        } catch (cause) {
          throw new Error(
            `could not import ${modulePath} — this spec needs the Vite dev ` +
              'server (playwright.config.ts starts `npm run dev`). It cannot run ' +
              'against a `vite preview` build, where the sources are bundled. ' +
              `Underlying error: ${String(cause)}`,
          )
        }
        return mod.extractReceipt(file)
      },
      { base64, modulePath: MODULE_PATH },
    )

    expect(extracted.merchant).toBe(EXPECTED.merchant)
    expect(extracted.capturedAt).toBe(EXPECTED.capturedAt)
    expect(extracted.total).toBe(EXPECTED.total)
    expect(extracted.tax).toBe(EXPECTED.tax)
    expect(extracted.currency).toBe(EXPECTED.currency)
    expect(extracted.lineItems).toHaveLength(EXPECTED.itemCount)
    expect(extracted.lineItems.map((i) => i.price)).toEqual([79.9, 49.9])
    expect(extracted.lineItems[0].name).toBe('BLAHAJ Soft Toy')
    expect(extracted.lineItems[1].name).toBe('IKEA 365+ Food Container')

    /*
      ── NOT VACUOUS: THE FIXTURE REALLY IS STORED SIDEWAYS ──────────────────

      Without this, the test would pass just as well if someone quietly
      replaced the fixture with an upright copy — and would then be asserting
      nothing at all about orientation.

      CHECKED FROM THE BYTES AND FROM THE BROWSER, NOT FROM `normalise.ts`.
      Using this app's own `exifOrientation` here would be the module agreeing
      with itself: if it stopped reading the tag, the fix and the check would
      fail together and silently.
    */
    const marker = Buffer.from('Exif\0\0', 'latin1')
    expect(
      fs.readFileSync(ROTATED_FIXTURE).includes(marker),
      'the rotated fixture carries an EXIF segment',
    ).toBe(true)
    expect(
      fs.readFileSync(FIXTURE).includes(marker),
      'the upright fixture carries none — so the two are genuinely different files',
    ).toBe(false)

    // And the browser has to ROTATE it to display it: the stored frame is
    // landscape, so an EXIF-honouring decode comes back portrait.
    const decoded = await page.evaluate(async (b64) => {
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }), {
        imageOrientation: 'from-image',
      })
      return { width: bitmap.width, height: bitmap.height }
    }, base64)
    expect(decoded, 'EXIF turns the stored 517x287 frame into an upright 287x517').toEqual({
      width: 287,
      height: 517,
    })
  })
})
