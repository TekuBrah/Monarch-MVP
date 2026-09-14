import { expect, test } from '@playwright/test'
import { PINNED_NOW, activateTab, gotoRoute } from './harness'
import { RECEIPTS_TAB, installResolvingExtraction, saveOneCapture } from './capture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * A CAMERA CAPTURE GETS A CAMERA-ROLL NAME; A GALLERY PICK KEEPS ITS OWN.
 * Gate 53, item 3.
 *
 * A card on a real device printed
 *
 *   "ESPEN EER BCs rf 42. i EH EER eer Spates Le"
 *
 * where `Receipt.displayName` is documented to hold "what a phone's camera roll
 * would have called the capture".
 *
 * THE OBVIOUS DIAGNOSIS WAS WRONG, AND THAT IS WHY THIS SPEC EXISTS. That string
 * reads exactly like OCR output, so the natural conclusion is that extraction
 * leaked into `displayName`. It had not: `displayName` has exactly ONE writer in
 * `src/` — `capturedToReceipt` — and it has never read `extracted`. The garbled
 * value WAS `File.name`, handed over by the device's own camera intent.
 *
 * WHAT THIS SPEC CAN AND CANNOT PROVE, stated rather than left implied. It
 * cannot reproduce an Android camera's `File.name`: `capture` is a hint a
 * desktop browser ignores, so on this harness the camera row and the gallery row
 * receive the SAME `File` from `setFiles` — one fixture, one name. That is
 * precisely what makes it the right instrument for the FIX: the two rows differ
 * here in NOTHING except which source they report, so a difference in what the
 * card prints can only have come from the source. The device's own naming is not
 * under test and cannot be.
 *
 * NO BASELINE AND NO WALK STATE. `openOverlay`'s `chooseFiles` step stages
 * through "Photo Gallery", so no committed baseline photographs a camera
 * capture and item 3 could not move one. Behaviour, default viewport, light — a
 * filename cannot differ by theme or width.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The fixture's own name, as `e2e/fixtures/receipt-capture.jpg` is committed. */
const FIXTURE_NAME = 'receipt-capture.jpg'

/**
 * What the pinned clock makes a camera-roll name.
 *
 * DERIVED FROM `PINNED_NOW`, NEVER TRANSCRIBED, so the two cannot drift — and
 * the derivation is deliberately the LOCAL-TIME one, because that is the half of
 * this the app could get wrong. `PINNED_NOW` is 2026-08-15T01:41Z, which is
 * 09:41 in `Asia/Kuala_Lumpur`; a UTC stamp would name the file
 * `IMG_20260815_014100.jpg`. Gate 51 item T is the same trap one field over.
 */
function expectedCameraName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000) // UTC+8, no DST
  const y = local.getUTCFullYear()
  const stamp =
    `${y}${pad(local.getUTCMonth() + 1)}${pad(local.getUTCDate())}_` +
    `${pad(local.getUTCHours())}${pad(local.getUTCMinutes())}${pad(local.getUTCSeconds())}`
  return `IMG_${stamp}.jpg`
}

/** An extraction that read nothing — so nothing can auto-link and nothing renames. */
const UNREADABLE = {
  merchant: null,
  capturedAt: null,
  total: null,
  tax: null,
  currency: 'MYR',
  lineItems: [],
}

test('a CAMERA capture is named camera-roll style, in LOCAL time', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')

  // NOT VACUOUS: the expected name is only correct if the app reads local time,
  // and this instant has a different UTC and local DATE-hour.
  expect(PINNED_NOW.toISOString()).toBe('2026-08-15T01:41:00.000Z')
  expect(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe(
    'Asia/Kuala_Lumpur',
  )
  const expected = expectedCameraName(PINNED_NOW)
  expect(expected).toBe('IMG_20260815_094100.jpg')

  await installResolvingExtraction(page, UNREADABLE)
  await activateTab(page, RECEIPTS_TAB)
  await saveOneCapture(page, 'Camera')

  const named = page.locator(`.mvp-receipt-card:has-text("${expected}")`)
  await expect(named, 'the camera capture is named from the clock').toHaveCount(1)

  // AND THE DEVICE NAME IS GONE FROM THE CARD. This is the arm that fails if the
  // fix is wired for gallery instead of camera, or not wired at all.
  await expect(
    page.locator(`.mvp-receipt-card:has-text("${FIXTURE_NAME}")`),
    'no card prints the raw device filename',
  ).toHaveCount(0)
})

test('a GALLERY pick keeps the name the user chose', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')
  await installResolvingExtraction(page, UNREADABLE)
  await activateTab(page, RECEIPTS_TAB)
  await saveOneCapture(page, 'Photo Gallery')

  // THE REGRESSION ARM. A gallery name is one the user browsed to and can
  // recognise, so item 3 must not touch it — and a fix applied to both sources
  // would replace it with the generated stamp and fail here.
  await expect(
    page.locator(`.mvp-receipt-card:has-text("${FIXTURE_NAME}")`),
    'the gallery pick still prints its own filename',
  ).toHaveCount(1)
  await expect(
    page.locator('.mvp-receipt-card:has-text("IMG_2026")'),
    'no generated name reached a gallery pick',
  ).toHaveCount(0)
})
