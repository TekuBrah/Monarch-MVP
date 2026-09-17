import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE GATE 56 PREPROCESSING SWEEP. NOT PART OF THE SUITE.
 *
 *   OCR_SWEEP_CONFIGS=<configs.json> OCR_CORPUS_OUT=<dir> \
 *     npx playwright test -c scripts/ocr-corpus/playwright.config.mjs sweep
 *
 * For every configuration and every image: a FRESH PAGE (the Gate 54-B rule),
 * `probe.js`'s preprocessing, then the engine. Output goes to
 * `<OCR_CORPUS_OUT>/<config name>/<set>-<stem>.json` in the shape
 * `corpus.spec.mjs` writes, so `score.mjs` scores a configuration directory
 * unchanged. A file already present is skipped, so an interrupted sweep resumes.
 *
 * A configuration with `app: true` calls the app's own `recognise` on the raw
 * file — today's pipeline, the control every other row is measured against.
 *
 * `size.mode: 'text'` needs each image's median word height, measured from the
 * control run's own word boxes and passed in as `OCR_SWEEP_HEIGHTS` (a JSON map
 * of stem -> height in the upright ORIGINAL frame).
 *
 * ⚠️ PERSONAL DATA: as `corpus.spec.mjs`. Output must be outside the repo.
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

const listJpegs = (dir, set) =>
  fs
    .readdirSync(dir)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort()
    .map((f) => ({ set, stem: f.replace(/\.[^.]+$/, ''), file: path.join(dir, f) }))

const CORPUS = [...listJpegs(SEEDED_DIR, 'seeded'), ...listJpegs(DEVICE_DIR, 'device')].filter(
  (e) => !ONLY || ONLY.has(e.stem),
)

test('preprocessing sweep', async ({ browser }) => {
  test.setTimeout(6 * 60 * 60_000)
  assertOutsideRepo(OUT)
  const configs = JSON.parse(fs.readFileSync(process.env.OCR_SWEEP_CONFIGS, 'utf8'))
  const heights = process.env.OCR_SWEEP_HEIGHTS
    ? JSON.parse(fs.readFileSync(process.env.OCR_SWEEP_HEIGHTS, 'utf8'))
    : {}

  for (const cfg of configs) {
    const dir = path.join(OUT, cfg.name)
    fs.mkdirSync(dir, { recursive: true })
    for (const entry of CORPUS) {
      const target = path.join(dir, `${entry.set}-${entry.stem}.json`)
      if (fs.existsSync(target)) continue
      const page = await browser.newPage()
      const pageErrors = []
      page.on('pageerror', (e) => pageErrors.push(String(e)))
      await page.goto('/more', { waitUntil: 'networkidle' })
      const base64 = fs.readFileSync(entry.file).toString('base64')
      const started = Date.now()
      const result = await page.evaluate(
        async ({ base64, cfg, height }) => {
          const binary = atob(base64)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
          const file = new File([bytes], 'capture.jpg', { type: 'image/jpeg' })
          const { parseReceipt } = await import('/src/data/ocr/parseReceipt.ts')
          const heapBefore = performance.memory?.usedJSHeapSize ?? null
          let ocr
          let prep = null
          if (cfg.app) {
            const { recognise } = await import('/src/data/ocr/recognise.ts')
            ocr = await recognise(file)
          } else if (cfg.appImage) {
            // The app's own image path, but the probe's engine — so engine
            // parameters are varied with the image held exactly as today.
            const { normaliseForOcr } = await import('/src/data/ocr/normalise.ts')
            const probe = await import('/scripts/ocr-corpus/probe.js')
            ocr = await probe.recogniseWith(await normaliseForOcr(file), cfg)
          } else {
            const probe = await import('/scripts/ocr-corpus/probe.js')
            const p = await probe.preprocess(file, cfg, height)
            prep = { width: p.width, height: p.height, scale: p.scale, clamped: p.clamped, prepMs: p.prepMs }
            ocr = await probe.recogniseWith(p.blob, cfg)
          }
          const heapAfter = performance.memory?.usedJSHeapSize ?? null
          return { ocr, parsed: parseReceipt(ocr), prep, heapBefore, heapAfter }
        },
        { base64, cfg, height: heights[entry.stem] ?? null },
      )
      const ms = Date.now() - started
      fs.writeFileSync(
        target,
        JSON.stringify({ ...entry, file: path.basename(entry.file), config: cfg, ms, pageErrors, ...result }, null, 1),
      )
      await page.close()
    }
    console.log(`config ${cfg.name} done`)
  }
  expect(configs.length).toBeGreaterThan(0)
})
