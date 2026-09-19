import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import {
  diagnosticJson,
  diagnosticsFlag,
  type CaptureDiagnostic,
} from '../src/data/captureDiagnostics'
import { jpegDimensions, OCR_LONG_EDGE, pngDimensions } from '../src/data/ocr/normalise'
import type { ParsedReceipt } from '../src/data/ocr/parseReceipt'
import {
  chooseReading,
  describeFirstPassFailure,
  explainChoice,
  firstPassFailed,
} from '../src/data/ocr/secondPass'
import { capturedImageName, FIXTURE, RECEIPTS_TAB, saveOneCapture } from './capture'
import { activateTab, PINNED_NOW } from './harness'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CAPTURE DIAGNOSTIC (Gate 59) — NO BASELINE, NO WALK STATE.
 *
 * `?diag=1` is on no walk state's URL, so the visual suite cannot see this and
 * nothing here mints a screenshot. What is asserted instead:
 *
 *   OFF   the diagnostic chunk is never fetched and the viewer draws nothing
 *         extra — the flag costs a constant branch and nothing more;
 *   ON    every recorded field is what the pipeline actually did, and the
 *         parsed result is IDENTICAL to the same file read with the flag off —
 *         so observing the pipeline does not change it;
 *   COPY  the copied JSON carries every field except the raw engine text.
 *
 * THE BROWSER TESTS RUN THE REAL ENGINE, so they do their own navigation rather
 * than `gotoRoute`, which installs the never-settling extraction stub.
 *
 * NO EXPECTED FIGURE IS WRITTEN DOWN. The fixture is a seeded receipt, so its
 * printed figures are corpus content; every expectation below is DERIVED — from
 * the fixture's own bytes in Node, or from a flag-off extraction of the same
 * file in the same test. The invented parses in the Node tests are item counts
 * and small integers, and carry no name or figure from any receipt.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ROTATED_FIXTURE = 'e2e/fixtures/receipt-capture-rotated.jpg'

function reading(items: number, total: number | null): ParsedReceipt {
  const lineItems = Array.from({ length: items }, (_, i) => ({
    name: `Item ${String.fromCharCode(65 + i)}`,
    quantity: '1',
    price: 1 + i,
  }))
  return {
    merchant: '',
    capturedAt: null,
    total,
    tax: null,
    currency: 'MYR',
    lineItems,
    confidence: { merchant: null, capturedAt: null, total: null, tax: null, lineItems: lineItems.map(() => 0) },
  }
}

interface ExtractedShape {
  merchant: string | null
  capturedAt: string | null
  total: number | null
  tax: number | null
  currency: string
  lineItems: { name: string; quantity: string; price: number }[]
}

interface InPageRead {
  extracted: ExtractedShape
  /** The copyable JSON, parsed — null when no diagnostic was recorded. */
  diagnostic: Record<string, unknown> | null
  /** The raw text's length per pass, read off the in-memory record. */
  rawLengths: number[]
}

/**
 * Read one file through the app's own seam, in a page loaded at `url`, and hand
 * back what extraction returned plus the diagnostic recorded for that file.
 * Module paths are strings passed in, so the type-check gate never tries to
 * resolve a dev-server URL — the same construction `ocr.spec.ts` uses.
 */
async function readInPage(
  page: Page,
  url: string,
  file: { base64: string; name: string; type: string } | 'blank-png',
): Promise<InPageRead> {
  await page.clock.setFixedTime(PINNED_NOW)
  await page.goto(url, { waitUntil: 'networkidle' })
  return page.evaluate(
    async ({ file, extractPath, diagPath }) => {
      const extract: { extractReceipt: (f: File) => Promise<unknown> } = await import(extractPath)
      const diag: {
        bindDiagnostic: (f: File, id: string) => void
        diagnosticFor: (id: string) => { passes: { rawText: string | null }[] } | undefined
        diagnosticJson: (d: unknown) => string
      } = await import(diagPath)

      let input: File
      if (file === 'blank-png') {
        // AN INVENTED PAGE: plain white, no ink, so the engine reads nothing and
        // the first pass fails on both counts.
        const canvas = new OffscreenCanvas(400, 600)
        const context = canvas.getContext('2d')!
        context.fillStyle = 'white'
        context.fillRect(0, 0, 400, 600)
        input = new File([await canvas.convertToBlob({ type: 'image/png' })], 'blank.png', {
          type: 'image/png',
        })
      } else {
        const binary = atob(file.base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
        input = new File([bytes], file.name, { type: file.type })
      }

      const extracted = await extract.extractReceipt(input)
      diag.bindDiagnostic(input, 'probe')
      const record = diag.diagnosticFor('probe')
      return {
        extracted,
        diagnostic: record ? JSON.parse(diag.diagnosticJson(record)) : null,
        rawLengths: record ? record.passes.map((p) => p.rawText?.length ?? -1) : [],
      }
    },
    { file, extractPath: '/src/data/extract.ts', diagPath: '/src/data/captureDiagnostics.ts' },
  ) as Promise<InPageRead>
}

function fixtureArg(path: string, name: string) {
  return { base64: fs.readFileSync(path).toString('base64'), name, type: 'image/jpeg' }
}

const cents = (items: { price: number }[]) =>
  items.reduce((sum, item) => sum + Math.round(item.price * 100), 0) / 100

test.describe('the rules, in Node', () => {
  test('the flag is ?diag=1 exactly, and nothing else turns it on', () => {
    expect(diagnosticsFlag('?diag=1')).toBe(true)
    expect(diagnosticsFlag('?a=2&diag=1')).toBe(true)
    for (const off of ['', '?diag=0', '?diag=true', '?diag=11', '?diag=', '?diag', '?x=1']) {
      expect(diagnosticsFlag(off), `"${off}" must leave the diagnostic off`).toBe(false)
    }
  })

  test('the stated reason for the choice agrees with chooseReading on every branch', () => {
    let compared = 0
    for (const a of [0, 1, 2]) {
      for (const b of [0, 1, 2]) {
        for (const ta of [null, 5]) {
          for (const tb of [null, 5]) {
            const first = reading(a, ta)
            const second = reading(b, tb)
            const explained = explainChoice(first, second)
            expect(explained.pick, `items ${a}/${b}, totals ${ta}/${tb}`).toBe(chooseReading(first, second))
            expect(explained.why.length).toBeGreaterThan(0)
            compared += 1
          }
        }
      }
    }
    expect(compared).toBe(36)
  })

  test('the stated trigger is present exactly when firstPassFailed is true', () => {
    for (const items of [0, 1, 3]) {
      for (const total of [null, 5]) {
        const parsed = reading(items, total)
        const described = describeFirstPassFailure(parsed)
        expect(described !== null, `items ${items}, total ${total}`).toBe(firstPassFailed(parsed))
        if (items === 0) expect(described).toContain('no line items')
        if (total === null) expect(described).toContain('no total')
      }
    }
  })

  test('pngDimensions reads the IHDR chunk, and reads nothing else as a PNG', () => {
    const header = new Uint8Array(24)
    header.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13], 0)
    header.set([0x49, 0x48, 0x44, 0x52], 12) // "IHDR"
    const view = new DataView(header.buffer)
    view.setUint32(16, 321)
    view.setUint32(20, 654)
    expect(pngDimensions(header)).toEqual({ width: 321, height: 654 })
    expect(pngDimensions(new Uint8Array(fs.readFileSync(FIXTURE)))).toBeNull()
    expect(pngDimensions(header.subarray(0, 20))).toBeNull()
  })

  test('the copied JSON carries every field except the raw engine text', () => {
    const marker = 'RAW-TEXT-MARKER'
    const record: CaptureDiagnostic = {
      source: { name: 'a.jpg', type: 'image/jpeg', bytes: 10, sha256: null },
      pdf: false,
      received: null,
      passes: [
        {
          preparation: 'plain',
          normalised: null,
          normaliseMs: 1,
          engineMs: 2,
          rawTextLength: marker.length,
          engineConfidence: 3,
          lineCount: 1,
          rawText: marker,
          error: null,
        },
      ],
      secondPass: { ran: false, trigger: null, kept: 'plain', why: 'x' },
      result: null,
      error: null,
      totalMs: 4,
    }
    const json = diagnosticJson(record)
    expect(json).not.toContain(marker)
    expect(json).not.toContain('rawText"')
    const parsed = JSON.parse(json)
    expect(parsed.passes[0].rawTextLength).toBe(marker.length)
    expect(parsed.passes[0].engineMs).toBe(2)
    // AND THE RECORD ITSELF IS UNTOUCHED — the viewer still has the text to show.
    expect(record.passes[0].rawText).toBe(marker)
  })
})

test.describe('the flag, in the browser, with the real engine', () => {
  test('without ?diag=1 the diagnostic chunk is never fetched and the viewer draws nothing extra', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const requested: string[] = []
    page.on('request', (r) => requested.push(new URL(r.url()).pathname))

    await page.clock.setFixedTime(PINNED_NOW)
    await page.goto('/finance', { waitUntil: 'networkidle' })
    await activateTab(page, RECEIPTS_TAB)
    await saveOneCapture(page)

    // THE ENGINE REALLY RAN — otherwise "never fetched" would pass vacuously.
    expect(requested.some((p) => p.includes('/src/data/ocr/recognise.ts'))).toBe(true)
    expect(
      requested.filter((p) => p.includes('diagnose')),
      'the diagnostic module was requested with the flag absent',
    ).toEqual([])

    await page.locator(`.mvp-receipt-card:has-text("${capturedImageName(PINNED_NOW)}")`).click()
    await expect(page.locator('[role="dialog"]')).toHaveCount(1)
    await expect(page.locator('.mvp-receipt-details').first()).toBeVisible()
    await expect(page.getByText('Capture diagnostics')).toHaveCount(0)
    await expect(page.locator('.mvp-capture-diag')).toHaveCount(0)
  })

  test('with ?diag=1 the disclosure is collapsed, then shows every field, and Copy gives JSON without the raw text', async ({
    page,
    context,
    browser,
  }) => {
    test.setTimeout(240_000)
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    // THE CONTROL: the same file read with the flag OFF, in a separate page.
    const offPage = await browser.newPage()
    const off = await readInPage(offPage, '/', fixtureArg(FIXTURE, 'receipt-capture.jpg'))
    await offPage.close()
    expect(off.diagnostic, 'the flag-off page must record nothing').toBeNull()

    await page.clock.setFixedTime(PINNED_NOW)
    await page.goto('/finance?diag=1', { waitUntil: 'networkidle' })
    await activateTab(page, RECEIPTS_TAB)
    await saveOneCapture(page)
    await page.locator(`.mvp-receipt-card:has-text("${capturedImageName(PINNED_NOW)}")`).click()

    const block = page.locator('.mvp-capture-diag')
    await expect(block).toHaveCount(1)
    await expect(block.locator('.mn-link')).toHaveText('Show')
    await expect(block.locator('.mvp-capture-diag__body'), 'collapsed by default').toHaveCount(0)
    await block.locator('.mn-link').click()
    await expect(block.locator('.mn-link')).toHaveText('Hide')

    const row = (label: string) =>
      block.locator(`.mvp-receipt-details__row:has(dt:text-is("${label}")) dd`).first()

    const bytes = fs.readFileSync(FIXTURE)
    const sha = createHash('sha256').update(bytes).digest('hex')
    const stored = jpegDimensions(new Uint8Array(bytes))!
    await expect(row('Source name')).toHaveText('receipt-capture.jpg')
    await expect(row('Source type')).toHaveText('image/jpeg')
    await expect(row('Source bytes')).toHaveText(`${bytes.length.toLocaleString('en-GB')} B`)
    await expect(row('Source SHA-256')).toHaveText(`${sha.slice(0, 16)}…`)
    await expect(row('Stored size')).toHaveText(`${stored.width} × ${stored.height}`)
    await expect(row('Decoded size')).toHaveText(`${stored.width} × ${stored.height}`)
    await expect(row('EXIF orientation')).toHaveText('none')
    await expect(row('Second pass ran')).toHaveText('no')
    await expect(row('Kept')).toHaveText('plain')
    await expect(row('Items')).toHaveText(String(off.extracted.lineItems.length))

    // THE RAW TEXT IS ON SCREEN — asserted by length, never by content.
    const shownText = await block.locator('.mvp-capture-diag__text').first().textContent()
    expect(shownText?.length ?? 0).toBeGreaterThan(0)

    await block.getByRole('button', { name: 'Copy as JSON' }).click()
    await expect(block.getByRole('button', { name: 'Copied' })).toHaveCount(1)
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).not.toContain('rawText"')
    expect(copied).not.toContain(shownText!)
    const json = JSON.parse(copied)

    expect(json.source).toEqual({ name: 'receipt-capture.jpg', type: 'image/jpeg', bytes: bytes.length, sha256: sha })
    expect(json.received.stored).toEqual(stored)
    expect(json.received.decoded).toEqual(stored)
    expect(json.received.exifOrientation).toBeNull()
    expect(json.passes).toHaveLength(1)
    const [pass] = json.passes
    expect(pass.preparation).toBe('plain')
    expect(Math.max(pass.normalised.width, pass.normalised.height)).toBe(OCR_LONG_EDGE)
    expect(pass.normalised.type).toBe('image/png')
    expect(pass.normalised.passedThrough).toBe(false)
    expect(pass.engineMs).toBeGreaterThan(0)
    expect(pass.rawTextLength).toBe(shownText!.length)
    expect(json.secondPass.ran).toBe(false)

    // OBSERVING DID NOT CHANGE THE READING: identical to the flag-off control.
    expect(json.result).toEqual({
      items: off.extracted.lineItems.length,
      total: off.extracted.total,
      subtotal: off.extracted.lineItems.length > 0 ? cents(off.extracted.lineItems) : null,
      tax: off.extracted.tax,
    })
  })

  test('a sideways-stored capture reports its EXIF tag, swapped decoded size, and the unobserved reading', async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000)
    const file = fixtureArg(ROTATED_FIXTURE, 'rotated.jpg')
    const offPage = await browser.newPage()
    const off = await readInPage(offPage, '/', file)
    await offPage.close()

    const on = await readInPage(page, '/?diag=1', file)
    expect(on.extracted, 'observing the pipeline must not change what it returns').toEqual(off.extracted)

    const stored = jpegDimensions(new Uint8Array(fs.readFileSync(ROTATED_FIXTURE)))!
    expect(stored.width).toBeGreaterThan(stored.height) // stored landscape
    const d = on.diagnostic as {
      received: { stored: unknown; decoded: unknown; exifOrientation: number }
      passes: { normalised: { width: number; height: number } }[]
    }
    expect(d.received.exifOrientation).toBe(6)
    expect(d.received.stored).toEqual(stored)
    expect(d.received.decoded).toEqual({ width: stored.height, height: stored.width })
    expect(d.passes[0].normalised.height).toBe(OCR_LONG_EDGE)
    expect(d.passes[0].normalised.width).toBeLessThan(OCR_LONG_EDGE)
  })

  test('a page the engine reads nothing from reports both passes, the trigger, and why the first was kept', async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000)
    const offPage = await browser.newPage()
    const off = await readInPage(offPage, '/', 'blank-png')
    await offPage.close()

    const on = await readInPage(page, '/?diag=1', 'blank-png')
    expect(on.extracted).toEqual(off.extracted)

    const d = on.diagnostic as {
      received: { stored: unknown; exifOrientation: unknown }
      passes: { preparation: string; engineMs: number; error: unknown }[]
      secondPass: { ran: boolean; trigger: string; kept: string; why: string }
      result: { items: number; total: unknown; subtotal: unknown }
    }
    expect(d.received.stored).toEqual({ width: 400, height: 600 })
    expect(d.received.exifOrientation).toBeNull()
    expect(d.passes.map((p) => p.preparation)).toEqual(['plain', 'photo'])
    expect(d.passes.every((p) => p.engineMs > 0 && p.error === null)).toBe(true)
    expect(on.rawLengths).toHaveLength(2)
    expect(d.secondPass.ran).toBe(true)
    expect(d.secondPass.trigger).toBe(describeFirstPassFailure(reading(0, null)))
    expect(d.secondPass.kept).toBe('plain')
    expect(d.secondPass.why).toBe(explainChoice(reading(0, null), reading(0, null)).why)
    expect(d.result).toEqual({ items: 0, total: null, subtotal: null, tax: null })
  })

  test('with ?diag=1 a receipt not read in this session says so rather than showing stale fields', async ({
    page,
  }) => {
    await page.clock.setFixedTime(PINNED_NOW)
    await page.goto('/finance?diag=1', { waitUntil: 'networkidle' })
    await activateTab(page, RECEIPTS_TAB)
    await page.locator('.mvp-receipt-card').first().click()
    const block = page.locator('.mvp-capture-diag')
    await expect(block).toHaveCount(1)
    await expect(block.locator('.mvp-capture-diag__none')).toHaveText(
      'Not read in this session, so there is nothing to show.',
    )
    await expect(block.locator('.mn-link')).toHaveCount(0)
  })
})
