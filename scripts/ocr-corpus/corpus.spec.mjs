import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RUN THE REAL ENGINE OVER THE DEVELOPMENT CORPUS (Gate 55).
 *
 * For every image: a FRESH PAGE, the real `recognise` and the real
 * `parseReceipt`, imported from the dev server exactly as the app imports them.
 * The raw `OcrResult` and the parse are written to `OCR_CORPUS_OUT`, which MUST
 * be outside this repository — see `assertOutsideRepo`. Scoring is a separate,
 * pure step (`score.mjs`), so a parser change can be re-scored against the
 * cached engine output in milliseconds without running the engine again.
 *
 * A FRESH DOCUMENT PER EXTRACTION IS A STANDING RULE FROM GATE 54-B. A long run
 * of 4000px captures through one document is not what a user does, and it is
 * the configuration under which the out-of-memory probe was observed.
 *
 * ⚠️ PERSONAL DATA. The device photographs carry people's names, a phone
 * number, a home address and card fragments, and so does their OCR text. None
 * of it may be written inside the repo, staged, or committed. This file holds
 * no string taken from any of them.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const REPO = path.resolve(import.meta.dirname, '..', '..')
const SEEDED_DIR = path.join(REPO, 'public', 'media', 'receipts')
const DEVICE_DIR = process.env.OCR_CORPUS_DEVICE_DIR ?? 'D:/Claude/_assets/receipts-device'
const OUT = process.env.OCR_CORPUS_OUT
const ONLY = process.env.OCR_CORPUS_ONLY ? new Set(process.env.OCR_CORPUS_ONLY.split(',')) : null

function assertOutsideRepo(dir) {
  if (!dir) throw new Error('set OCR_CORPUS_OUT to a directory OUTSIDE the repository')
  const rel = path.relative(REPO, path.resolve(dir))
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
    throw new Error(`OCR_CORPUS_OUT resolves inside the repository (${dir}) — refusing to write OCR text there`)
  }
}

function listJpegs(dir, set) {
  return fs
    .readdirSync(dir)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort()
    .map((f) => ({ set, stem: f.replace(/\.[^.]+$/, ''), file: path.join(dir, f) }))
}

const CORPUS = [...listJpegs(SEEDED_DIR, 'seeded'), ...listJpegs(DEVICE_DIR, 'device')].filter(
  (e) => !ONLY || ONLY.has(e.stem),
)

test('recognise and parse the development corpus', async ({ browser }) => {
  assertOutsideRepo(OUT)
  fs.mkdirSync(OUT, { recursive: true })
  const run = []

  for (const entry of CORPUS) {
    const page = await browser.newPage()
    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(String(e)))
    await page.goto('/more', { waitUntil: 'networkidle' })

    const base64 = fs.readFileSync(entry.file).toString('base64')
    const started = Date.now()
    const result = await page.evaluate(async ({ base64 }) => {
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
      const file = new File([bytes], 'capture.jpg', { type: 'image/jpeg' })
      const heapBefore = performance.memory?.usedJSHeapSize ?? null
      const { recognise } = await import('/src/data/ocr/recognise.ts')
      const { parseReceipt } = await import('/src/data/ocr/parseReceipt.ts')
      const ocr = await recognise(file)
      const parsed = parseReceipt(ocr)
      const heapAfter = performance.memory?.usedJSHeapSize ?? null
      return { ocr, parsed, heapBefore, heapAfter }
    }, { base64 })
    const ms = Date.now() - started

    fs.writeFileSync(
      path.join(OUT, `${entry.set}-${entry.stem}.json`),
      JSON.stringify({ ...entry, file: path.basename(entry.file), ms, pageErrors, ...result }, null, 1),
    )
    const boxed = result.ocr.lines.filter((l) => l.bbox).length
    run.push({
      set: entry.set,
      stem: entry.stem,
      ms,
      lines: result.ocr.lines.length,
      boxedLines: boxed,
      pageConfidence: result.ocr.confidence,
      heapBefore: result.heapBefore,
      heapAfter: result.heapAfter,
      pageErrors: pageErrors.length,
    })
    await page.close()
  }

  fs.writeFileSync(path.join(OUT, 'run.json'), JSON.stringify(run, null, 1))
  console.log(JSON.stringify(run))
  expect(run.length).toBe(CORPUS.length)
})
