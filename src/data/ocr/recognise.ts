import workerUrl from 'tesseract.js/dist/worker.min.js?url'
import coreUrl from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE OCR ENGINE (Gate 50-B). TESSERACT.JS, IN THE BROWSER, ON THIS ORIGIN.
 *
 * WHAT TESSERACT.JS IS, because the name suggests three wrong things. It is an
 * ordinary npm package that carries Google's Tesseract OCR engine compiled to
 * WebAssembly. It is NOT a plugin, NOT a wrapper around a hosted API, and NOT a
 * service with a key. Everything it needs — the engine, the language model, the
 * worker script — is a file, and this module makes every one of those files come
 * from this app's own origin.
 *
 * THE IMAGE NEVER LEAVES THE DEVICE. Locked roadmap decision D9, and the whole
 * case-study argument for doing OCR this way at all. There is no upload, no API
 * call, no key, no proxy and no telemetry on this path: the bytes go from the
 * `File` the user picked into a Web Worker in the same tab and nowhere else.
 * A future gate that adds a network hop here breaks D9 — it is not a
 * performance tuning decision to be taken quietly.
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS MODULE MUST NEVER BE STATICALLY IMPORTED. `extract.ts` reaches it with
 * `await import('./ocr/recognise')` and that is load-bearing, not stylistic:
 * a static import would pull the engine into the entry chunk and every visitor
 * would pay for it whether or not they ever photograph a receipt.
 *
 * The three `?url` imports above are what keeps that promise honest while still
 * serving from this origin. `?url` makes Vite EMIT each file as a content-hashed
 * asset and hand back its path — so the bytes are in `dist/assets/`, not in any
 * JavaScript chunk, and only the short URL strings travel in this module.
 * ─────────────────────────────────────────────────────────────────────────────
 * NO THIRD-PARTY RUNTIME FETCH. ALL THREE DEFAULTS ARE OVERRIDDEN.
 *
 * Tesseract.js reaches for a CDN three separate times if you let it, and each
 * one is a different default in a different file:
 *
 *   workerPath  cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/dist/worker.min.js
 *                 — `src/worker/browser/defaultOptions.js`
 *   corePath    cdn.jsdelivr.net/npm/tesseract.js-core@v7.0.0
 *                 — `src/worker-script/browser/getCore.js`
 *   langPath    cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int
 *                 — `src/worker-script/index.js`
 *
 * OVERRIDING TWO OF THREE WOULD LOOK LIKE IT WORKED. The remaining one would
 * still fetch, the OCR would still succeed on a connected device, and the third
 * party would still see a request every time a user reads a receipt. So all
 * three are closed, and `e2e/ocr.spec.ts` proves it by counting requests rather
 * than by reading this comment — the shipped bundle still CONTAINS all three
 * CDN strings, because they are the library's own defaults.
 *
 * WHY NOT A CDN, stated for the record: it exposes the fact that a receipt is
 * being read to a party the user did not choose, and it adds a domain that can
 * fail or change independently of this deploy.
 *
 * NOT "SO IT WORKS OFFLINE" — this comment claimed that and it was false.
 * THERE IS NO SERVICE WORKER in this app, measured at the Gate 50-B correction
 * round, so with no network nothing loads at all and OCR is no exception. What
 * own-origin delivery buys is privacy, independence, and the PRECONDITION for
 * offline should a service worker ever arrive; a CDN dependency could not be
 * precached from this origin and would foreclose it.
 *
 * `resolvePaths` (`src/utils/resolvePaths.js`) absolutises `workerPath`,
 * `corePath` and `langPath` against `window.location.href`, so root-relative
 * paths are safe to hand over as-is — which matters because the worker is
 * spawned from a `blob:` URL by default and a relative path would resolve
 * against the blob rather than the origin.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE LANGUAGE MODEL COMES FROM `public/`, NOT FROM A `?url` ASSET, AND THAT
 * ASYMMETRY IS FORCED — DO NOT "TIDY" IT INTO LINE WITH THE OTHER TWO.
 *
 * `langPath` is a DIRECTORY that Tesseract appends `<lang>.traineddata.gz` to.
 * A `?url` asset carries a CONTENT HASH in its filename, so no directory in
 * `dist/` ever holds a file by the name the worker asks for.
 *
 * THE DOCUMENTED WAY ROUND THAT IS BROKEN UPSTREAM IN 7.0.0, and it was tried
 * first. `createWorker` accepts `Lang[]` — `{ code, data }` — which needs no
 * path at all. `loadLanguage` reads `l.code` and loads the model correctly;
 * `initialize`, forty lines away in the same file, reads `l.data`. So the
 * engine is initialised with the raw `Uint8Array` stringified as its language
 * NAME. Measured in the browser at this gate: `Error opening data file
 * ./24,0,0,0,255,255,...`, then `Tesseract couldn't load any languages!`, and
 * `createWorker` rejects with `initialization failed`.
 *
 * So the model is copied to a stable path by `scripts/sync-ocr-lang.mjs` —
 * gitignored, generated from the pinned `@tesseract.js-data/eng`, and wired to
 * run before every dev server start and every build. See that script for why it
 * is not committed. If a future Tesseract release fixes `initialize`, the
 * `Lang[]` route becomes available again and this script can go.
 *
 * IT IS GZIPPED AND STAYS GZIPPED. Tesseract sniffs the gzip magic bytes and
 * inflates in the worker, so the 2.82 MB on the wire is the compressed model —
 * uncompressed it is roughly four times that. Do not decompress it here.
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THE SIMD CORE, AND THE ONE FLOOR IT RAISES.
 *
 * `tesseract.js-core` ships six engine builds. Only the three `-lstm` ones can
 * ever be requested here (LSTM_ONLY below), and they are within 0.1% of each
 * other in size, so the choice is purely about which instruction set the device
 * must support:
 *
 *   tesseract-core-lstm             plain WebAssembly, works everywhere
 *   tesseract-core-simd-lstm        needs WASM SIMD          <- shipped
 *   tesseract-core-relaxedsimd-lstm needs WASM relaxed SIMD
 *
 * ONE IS SHIPPED, NOT THREE, and pointing `corePath` at a specific FILE is what
 * makes that possible — Tesseract only runs its own feature detection when
 * `corePath` names a directory, and a directory would have to hold all three or
 * 404 on the devices whose variant is missing.
 *
 * THE HONEST COST, since it is a compatibility decision: WASM SIMD needs Safari
 * 16.4, and this app's existing `:has()` rule (`src/index.css:270`) needs only
 * Safari 15.4 — so on Safari alone this raises the floor by about a year. On
 * Chrome and Firefox it raises nothing, because `:has()` already requires
 * Chrome 105 and Firefox 121, both later than SIMD's 91 and 89. Relaxed SIMD
 * would raise the floor much further on every engine and is deliberately not
 * used. If the Safari year ever matters, the fallback is this file's second
 * import line and nothing else.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** One recognised word, with the engine's own confidence in it, 0-100. */
export interface OcrWord {
  text: string
  confidence: number
}

/**
 * One recognised line.
 *
 * THE PARSER WORKS ON LINES-OF-WORDS RATHER THAN ON A TEXT BLOB, and that is
 * what makes a per-field confidence exact instead of a guess. Given only the
 * newline-joined text, "which word produced this number" has to be answered by
 * searching for the token, which is ambiguous the moment a page prints the same
 * figure twice — and every one of the ten seeded receipts prints its total
 * twice, once on the Total row and once on the tender row.
 */
export interface OcrLine {
  text: string
  words: OcrWord[]
}

export interface OcrResult {
  lines: OcrLine[]
  /** The engine's overall confidence in the page, 0-100. */
  confidence: number
}

/**
 * LSTM_ONLY. The value is 1 and it is written as a literal because importing
 * `OEM` from the package would mean a static import of the very module this
 * file exists to load lazily.
 *
 * LSTM-ONLY RATHER THAN THE COMBINED ENGINE, because the legacy model is a
 * separate multi-megabyte model that only `worker.detect` needs, and nothing
 * here calls it.
 */
const OEM_LSTM_ONLY = 1

/**
 * The directory `scripts/sync-ocr-lang.mjs` writes the model into.
 *
 * ROOT-RELATIVE AND NOT HASHED, because Tesseract composes the filename itself.
 * Both halves of that name are the library's convention, not this app's: change
 * either and the fetch 404s, and the failure surfaces as
 * "Tesseract couldn't load any languages!" rather than as a missing file.
 */
const LANG_PATH = '/ocr'

/**
 * Fail fast, and by NAME, if the language model is not being served.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS: A MISSING MODEL HANGS TESSERACT FOREVER RATHER THAN
 * REJECTING, AND THAT WAS MEASURED, NOT ANTICIPATED.
 *
 * `loadLanguage` does throw on a bad response — `Network error while fetching
 * <url>` — but that rejection does not propagate out of `createWorker`, so the
 * returned promise simply never settles. Measured at the Gate 50-B correction
 * round by starting a dev server outside npm (so `predev` never ran the sync)
 * and pointing the spec at it: **the test died on Playwright's 180-second
 * timeout with no diagnosis at all**, and the trace named `page.evaluate` — a
 * line that has nothing to do with the real cause.
 *
 * A `HEAD` turns three opaque minutes into one sentence naming the file and the
 * script that produces it. It is one request against a 2.82 MB download that is
 * about to follow, and the browser will already have the connection open.
 *
 * IT IS NOT A TIMER, AND THAT DISTINCTION MATTERS HERE. Racing `createWorker`
 * against a `setTimeout` would have produced the same red with less certainty —
 * the "tolerance wearing a fix's clothes" this project refuses everywhere. This
 * asks the one question that actually decides the outcome: is the file there.
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ IT CHECKS THE CONTENT TYPE, NOT `response.ok`, AND THE FIRST VERSION OF
 * THIS GUARD CHECKED `ok` AND CAUGHT NOTHING.
 *
 * A MISSING MODEL DOES NOT 404. It returns **200 with this app's own HTML**, in
 * BOTH environments, by two different mechanisms that happen to agree:
 *
 *   dev         Vite's SPA fallback serves index.html for an unknown path
 *   production  netlify.toml's `/*` -> `/index.html` rewrite, status 200
 *
 * Measured on the dev server with the file deleted: `HTTP/1.1 200 OK`,
 * `Content-Type: text/html`, body `<!doctype html>`. So `resp.ok` is TRUE and
 * the guard passed straight through — the second run still died on the same
 * 180-second timeout.
 *
 * THIS IS THE GATE 24 `robots.txt` FINDING IN A NEW PLACE. That gate measured
 * `GET /robots.txt` returning 200 with the app shell for exactly this reason,
 * and fixed it by making the file real. The lesson generalises: under an SPA
 * rewrite, **"the response was OK" is not evidence that the file exists**, and
 * any check that treats it as such is inert.
 *
 * ONLY THE SYNC SCRIPT CAN CAUSE THIS. `public/ocr/` is gitignored and
 * generated, and six `pre` hooks cover every npm entry point (`dev`, `build`,
 * `build:package`, `preview` and both suite scripts). The single uncovered path
 * is a server started outside npm — `npx vite` — which is exactly the case
 * above.
 */
async function assertLanguageModelIsServed(): Promise<void> {
  const url = `${LANG_PATH}/eng.traineddata.gz`
  let served = false
  let detail = 'the request failed'
  try {
    const response = await fetch(url, { method: 'HEAD' })
    const type = response.headers.get('content-type') ?? ''
    // TWO CONDITIONS, AND IT IS A DENYLIST RATHER THAN AN ALLOWLIST.
    //
    // `response.ok` alone is not enough — an SPA rewrite answers 200 with HTML
    // (see the note above), so the content type has to be looked at too. But
    // the test is "is this the app's index page", NOT "is this one of the types
    // I expected".
    //
    // AN ALLOWLIST HERE WOULD BE A LATENT PRODUCTION BUG. Nothing in the suite
    // loads the deployed build, so if Netlify's CDN served the `.gz` under a
    // type that was not on the list, this guard would reject a perfectly good
    // model and OCR would fail for every user with nothing going red. Measured:
    // Vite's dev server sends NO content-type at all for this file, so even the
    // obvious allowlist entry (`application/gzip`) would already be wrong today.
    served = response.ok && !/^text\/html/i.test(type)
    detail = `${response.status} ${type || '(no content-type)'}`
  } catch {
    served = false
  }
  if (!served) {
    throw new Error(
      `the OCR language model is not being served at ${url} — got ${detail}. ` +
        'It is generated into the gitignored public/ocr/ by ' +
        'scripts/sync-ocr-lang.mjs, which runs from the predev / prebuild / ' +
        'prebuild:package / prepreview / pretest:e2e hooks. Run ' +
        '`npm run sync:ocr-lang` — a dev server started outside npm (npx vite) ' +
        'is the one entry point those hooks do not cover.',
    )
  }
}

/**
 * Recognise one image.
 *
 * A WORKER PER CALL, TERMINATED IN `finally`. A long-lived pooled worker would
 * be faster across several receipts, and it would also hold the inflated
 * language model in memory for the rest of the session on a phone. Extraction
 * happens a handful of times in a sitting, so the memory is worth more than the
 * milliseconds — and a leaked worker surviving a failed parse is the harder bug
 * to find of the two.
 */
export async function recognise(image: Blob): Promise<OcrResult> {
  const { createWorker } = await import('tesseract.js')

  await assertLanguageModelIsServed()

  const worker = await createWorker('eng', OEM_LSTM_ONLY, {
    workerPath: workerUrl,
    corePath: coreUrl,
    langPath: LANG_PATH,
    // EXPLICIT, THOUGH IT IS ALSO THE DEFAULT. The worker destructures
    // `gzip = true`, so leaving it out works today — but it is what decides
    // whether the fetched filename ends `.traineddata` or `.traineddata.gz`,
    // and the file this app ships is the gzipped one. Stating it means a change
    // to that default cannot silently turn the fetch into a 404.
    gzip: true,
    // SILENT BY DEFAULT. The engine's own logger writes a line per progress
    // tick, and `routes.spec.ts` fails the whole suite on any console output.
    logger: () => {},
  })

  try {
    const { data } = await worker.recognize(image, {}, { text: true, blocks: true })

    const lines: OcrLine[] = []
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          lines.push({
            text: line.text.replace(/\s+$/, ''),
            words: line.words.map((w) => ({ text: w.text, confidence: w.confidence })),
          })
        }
      }
    }

    return { lines, confidence: data.confidence }
  } finally {
    await worker.terminate()
  }
}
