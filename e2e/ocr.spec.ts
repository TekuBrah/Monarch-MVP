import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { PINNED_NOW } from './harness'

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
})
