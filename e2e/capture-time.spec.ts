import { expect, test } from '@playwright/test'
import { PINNED_NOW, activateTab, gotoRoute } from './harness'
import { RECEIPTS_TAB, installResolvingExtraction, saveOneCapture } from './capture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CAPTURE MOMENT IS RECORDED IN LOCAL WALL-CLOCK TIME (Gate 51, item T).
 *
 * When extraction cannot read a receipt's printed date, `capturedToReceipt`
 * fills it with the moment of capture. Until Gate 51 that was
 *
 *   new Date().toISOString().slice(0, 19)
 *
 * which yields UTC wall-clock fields with the `Z` cut off — a zone-less string
 * that every reader in this app, `formatTimestamp` and `groupReceiptsByMonth`
 * included, reads as LOCAL. So a receipt captured at 18:34 in Malaysia was
 * recorded, printed and month-grouped as 10:34. Found on a phone, not by a test.
 *
 * WHY NOTHING CAUGHT IT. `playwright.config.ts` pins `Asia/Kuala_Lumpur`, which
 * is exactly the zone that exposes it — but no browser test ever reached the
 * fallback with the date left unread. Every walk state's extraction never
 * settles, and `automatch.spec.ts` resolves a FULL set of fields.
 * ─────────────────────────────────────────────────────────────────────────────
 * NO BASELINE AND NO WALK STATE. Behaviour, at the default viewport, in light —
 * a timestamp cannot differ by theme or width.
 */

/** An extraction that read nothing it could vouch for — the fallback's trigger. */
const UNREADABLE = {
  merchant: null,
  capturedAt: null,
  total: null,
  tax: null,
  currency: 'MYR',
  lineItems: [],
}

test('an unread date records the capture moment in LOCAL time, not UTC', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')

  // NOT VACUOUS: the instant has different UTC and local HOURS, in this zone.
  // 2026-08-15T01:41Z is 09:41 in Kuala Lumpur (UTC+8, no DST); the defect
  // printed 01:41.
  expect(PINNED_NOW.toISOString()).toBe('2026-08-15T01:41:00.000Z')
  expect(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe(
    'Asia/Kuala_Lumpur',
  )

  await installResolvingExtraction(page, UNREADABLE)
  await activateTab(page, RECEIPTS_TAB)
  await saveOneCapture(page)

  const card = page.locator('.mvp-receipt-card:has-text("receipt-capture.jpg")')
  await expect(card, 'the unread capture reached the library').toHaveCount(1)
  await expect(card.locator('.mvp-receipt-card__date')).toHaveText('15 Aug, 09:41')
})

test('a capture across the UTC date line groups under its LOCAL month', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')

  // 2026-08-31T20:00Z is 04:00 ON 1 SEPTEMBER in Kuala Lumpur. The UTC and
  // local CALENDAR DATES differ — and so do the months — so a UTC string
  // mis-files the receipt a month early, not merely eight hours out.
  // `gotoRoute` pinned the clock before navigation; re-pinning after it moves
  // only what `new Date()` returns from here on.
  await page.clock.setFixedTime(new Date('2026-08-31T20:00:00.000Z'))

  await installResolvingExtraction(page, UNREADABLE)
  await activateTab(page, RECEIPTS_TAB)
  await saveOneCapture(page)

  const card = page.locator('.mvp-receipt-card:has-text("receipt-capture.jpg")')
  await expect(card).toHaveCount(1)
  await expect(card.locator('.mvp-receipt-card__date')).toHaveText('01 Sept, 04:00')

  const month = page.locator('.mvp-receipts__month', { has: card })
  await expect(month.locator('.mvp-section-header')).toHaveText('September 2026')
})
