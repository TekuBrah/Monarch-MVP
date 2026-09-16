import { expect, test } from '@playwright/test'
import { PINNED_NOW, activateTab, gotoRoute } from './harness'
import { RECEIPTS_TAB, capturedImageName, installResolvingExtraction, saveOneCapture } from './capture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * EVERY IMAGE CAPTURE IS NAMED FROM THE CLOCK. ONLY A PDF KEEPS ITS OWN NAME.
 * Decision 7B, Gate 54.
 *
 * ⚠️ THIS OVERTURNS GATE 53, AND THE OVERTURNED HALF IS THE GALLERY ONE.
 *
 * Gate 53 split the rule by SOURCE: a camera capture was renamed and a gallery
 * pick kept `File.name`, on the argument — written into this spec as "THE
 * REGRESSION ARM" — that "a gallery name is one the user browsed to and can
 * recognise, so item 3 must not touch it". DEVICE EVIDENCE KILLED THAT
 * PREMISE. A bulk upload from the Receipts tab on a real Android phone produced
 * cards named like
 *
 *   1789492674683328588290775429997...
 *
 * which is what Android's document picker hands back for a media item it
 * exposes by content URI rather than by path. So a gallery name is frequently
 * not a name at all, and it is never one the user typed.
 *
 * THE FIELD'S SINGLE WRITER IS UNCHANGED, AND THAT IS THE POINT WORTH KEEPING.
 * Gate 53 established it by measurement: `displayName` is written in exactly
 * one place and has never read `extracted`, so neither garbled string was OCR
 * leaking into the field — both were `File.name`. 7B changes which VALUE that
 * one writer is given, not where it is written.
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS SPEC CAN AND CANNOT PROVE, stated rather than left implied.
 *
 * It cannot reproduce an Android picker's `File.name`: `capture` is a hint a
 * desktop browser ignores, so on this harness the camera row and the gallery
 * row receive the SAME `File`. That is precisely what makes it the right
 * instrument for the RULE — the two rows differ here in nothing except which
 * source they report, so "both rows produce a generated name" is a claim about
 * the rule and not about any device.
 *
 * NO BASELINE AND NO WALK STATE. No walk state renders a captured receipt card
 * at all: `add-grid` stages without saving, and `add-saving` clicks Save
 * against a stub that never settles, so `onSave` never fires. Behaviour,
 * default viewport, light — a filename cannot differ by theme or width.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The fixture's own name, as `e2e/fixtures/receipt-capture.jpg` is committed. */
const FIXTURE_NAME = 'receipt-capture.jpg'


/** An extraction that read nothing — so nothing can auto-link and nothing renames. */
const UNREADABLE = {
  merchant: null,
  capturedAt: null,
  total: null,
  tax: null,
  currency: 'MYR',
  lineItems: [],
}

/**
 * A PDF, built in memory rather than committed.
 *
 * NOTHING PARSES THESE BYTES. Extraction is stubbed in every test here, so the
 * rasteriser never runs; what is under test is `receiptDisplayName`, which asks
 * `looksLikePdf` — and that reads the MIME type and the extension, both of
 * which this descriptor carries. A committed PDF fixture would add a binary to
 * the repo to exercise a branch that never opens it.
 */
const PDF_FILE = {
  name: 'invoice-september.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n% not parsed by this spec\n'),
}

test('a CAMERA capture is named camera-roll style, in LOCAL time', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')

  // NOT VACUOUS: the expected name is only correct if the app reads local time,
  // and this instant has a different UTC and local DATE-hour.
  expect(PINNED_NOW.toISOString()).toBe('2026-08-15T01:41:00.000Z')
  expect(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe(
    'Asia/Kuala_Lumpur',
  )
  const expected = capturedImageName(PINNED_NOW)
  expect(expected).toBe('IMG_20260815_094100.jpg')

  await installResolvingExtraction(page, UNREADABLE)
  await activateTab(page, RECEIPTS_TAB)
  await saveOneCapture(page, 'Camera')

  await expect(
    page.locator(`.mvp-receipt-card:has-text("${expected}")`),
    'the camera capture is named from the clock',
  ).toHaveCount(1)
  await expect(
    page.locator(`.mvp-receipt-card:has-text("${FIXTURE_NAME}")`),
    'no card prints the raw device filename',
  ).toHaveCount(0)
})

test('a GALLERY pick is ALSO named from the clock — Decision 7B', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')
  await installResolvingExtraction(page, UNREADABLE)
  await activateTab(page, RECEIPTS_TAB)
  await saveOneCapture(page, 'Photo Gallery')

  /*
    THE OVERTURNED ARM. Until Gate 54 this asserted the OPPOSITE — that the card
    still printed `receipt-capture.jpg` — and a fix applied to both sources was
    described here as a regression. It is now the rule.

    THE DEVICE FILENAME MUST BE ABSENT, which is the half that fails if 7B is
    wired for camera only, exactly as Gate 53 left it.
  */
  await expect(
    page.locator(`.mvp-receipt-card:has-text("${capturedImageName(PINNED_NOW)}")`),
    'the gallery pick is named from the clock too',
  ).toHaveCount(1)
  await expect(
    page.locator(`.mvp-receipt-card:has-text("${FIXTURE_NAME}")`),
    'the device filename does not reach the card',
  ).toHaveCount(0)
})

test('two images in ONE selection are disambiguated with _2', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')
  await installResolvingExtraction(page, UNREADABLE)
  await activateTab(page, RECEIPTS_TAB)

  /*
    ONE SELECTION, TWO FILES — which is a different thing from two selections,
    and is the case the suffix exists for. Both images are named from the same
    wall-clock second (the clock is pinned, and `capturedToReceipts` reads it
    once per selection by design), so without de-duplication the library would
    hold two cards with one name between them.

    THE SECOND FILE IS AN IN-MEMORY DESCRIPTOR rather than a second committed
    fixture: its BYTES are irrelevant because extraction is stubbed, and what
    matters is only that the selection carries two images.
  */
  await saveOneCapture(page, 'Photo Gallery', [
    { name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff]) },
    { name: 'b.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff]) },
  ])

  const base = capturedImageName(PINNED_NOW)
  const second = capturedImageName(PINNED_NOW, 2)

  await expect(
    page.locator(`.mvp-receipt-card:has-text("${base}")`),
    'the first keeps the bare name',
  ).toHaveCount(1)
  await expect(
    page.locator(`.mvp-receipt-card:has-text("${second}")`),
    'the second takes _2, before the extension',
  ).toHaveCount(1)

  // NOT VACUOUS: two cards arrived, and they are not the same card counted
  // twice. Without the suffix this reads 2 for `base` and 0 for `second`.
  await expect(page.locator('.mvp-receipt-card:has-text("IMG_20260815_094100")')).toHaveCount(2)
})

test('a PDF keeps the filename it arrived with', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')
  await installResolvingExtraction(page, UNREADABLE)
  await activateTab(page, RECEIPTS_TAB)
  await saveOneCapture(page, 'Photo Gallery', PDF_FILE)

  /*
    A PDF IS DIFFERENT IN KIND, NOT IN QUALITY. An emailed invoice is a document
    the user received and may search for by name; it is not a photograph, so a
    camera-roll stamp would be a lie about what it is. This is the arm that
    fails if 7B is implemented as "rename everything".
  */
  await expect(
    page.locator(`.mvp-receipt-card:has-text("${PDF_FILE.name}")`),
    'the PDF still prints its own filename',
  ).toHaveCount(1)
  await expect(
    page.locator('.mvp-receipt-card:has-text("IMG_2026")'),
    'no generated name reached the PDF',
  ).toHaveCount(0)
})


/*
  THE STAGED-TILE BADGE, FOR A NAME WITH NO EXTENSION (Gate 55).

  Android's picker hands over an extensionless digit run, and until Gate 55
  every such file — a PDF included — was badged "img". The MIME type now
  answers when the name cannot: "jpeg" prints "jpg" the camera-roll way, and
  "img" is left only for a file that states neither.

  THROUGH THE REAL UI, NOT BY IMPORTING `fileTypeLabel`. `receiptCapture.ts`
  reaches `extract.ts`, whose lazy imports pull the OCR modules' Vite `?url`
  imports into this project's typecheck — the coupling Gate 54 split
  `ocr/types.ts` out to avoid. Staging a file is a real click path anyway, and
  the badge is what a user sees. Staging extracts nothing, so the walk's
  never-settling stub stays in place.
*/
test('an extensionless file is badged from its MIME type', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, RECEIPTS_TAB)
  await page.locator('.mvp-receipts__add .mn-btn').click()
  const dialog = page.locator('[role="dialog"][aria-modal="true"]')
  await expect(dialog).toHaveAccessibleName('Add receipts')

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    dialog.locator('.mvp-add-receipts__sources .mn-btn:has-text("Photo Gallery")').click(),
  ])
  const bytes = Buffer.from('not decoded by this test')
  await chooser.setFiles([
    { name: '1789000000000000001', mimeType: 'image/jpeg', buffer: bytes },
    { name: '1789000000000000002', mimeType: 'application/pdf', buffer: bytes },
    // No stated type: the browser reports `application/octet-stream`.
    { name: '1789000000000000003', mimeType: '', buffer: bytes },
  ])
  await expect(dialog.locator('.mvp-add-receipts__badge')).toHaveText(['jpg', 'pdf', 'img'])
})
