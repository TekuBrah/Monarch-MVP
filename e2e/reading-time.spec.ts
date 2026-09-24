import { expect, test, type Page } from '@playwright/test'
import { PINNED_NOW, activateTab, gotoRoute } from './harness'
import { FIXTURE, RECEIPTS_TAB } from './capture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * READ TIME — THE ELAPSED-TIME CAPTION AND THE 30 s CUTOFF (Gate 67).
 *
 * Flow 9 Decision 1: Gate 58's 6 s ceiling is retired as a LIMIT and kept as a
 * measurement. A read runs to completion. While it runs, `CapturingBlock` shows
 * a caption that changes with elapsed time. A 30 s cutoff catches a stuck engine
 * only: at 30 s the capture resolves as a read that produced nothing, and the
 * existing advisory and retake take over.
 *
 * ─────────── WHY THIS SPEC INSTALLS FAKE TIMERS, AND THE WALK DOES NOT ─────────
 *
 * `gotoRoute` pins the clock with `setFixedTime`, which fixes `Date` and leaves
 * timers REAL. That is right for the walk. Here the timers are the subject, so
 * `clock.install()` runs first and every second is advanced by `runFor`. Nothing
 * waits 30 real seconds.
 *
 * THE EXTRACTION SEAM IS THE WALK'S. `gotoRoute` installs a never-settling
 * `extractReceipt()`, which is exactly a stuck engine. The late-resolution test
 * replaces it with one it can resolve by hand.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const CAPTION_6 = "This one's taking a little longer…"
const CAPTION_12 = 'Photos can take a bit longer to read. Still working…'
const CAPTION_20 = 'Still working — thanks for your patience.'

async function openReceiptsOnFakeTimers(page: Page): Promise<void> {
  await page.clock.install({ time: PINNED_NOW })
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, RECEIPTS_TAB)
  // AN INSTALLED CLOCK STILL TICKS IN REAL TIME UNTIL IT IS PAUSED — measured:
  // without this the caption appeared before `runFor(5999)` had finished. So
  // pause a minute ahead (nothing is scheduled yet), and from here only
  // `runFor` moves time.
  await page.clock.pauseAt(new Date(PINNED_NOW.getTime() + 60_000))
}

/** Stage `count` copies of the fixture through the real gallery path, then Save. */
async function stageAndSave(page: Page, count: number) {
  await page.locator('.mvp-receipts__add .mn-btn').click()
  const dialog = page.locator('[role="dialog"][aria-modal="true"]')
  await expect(dialog).toHaveAccessibleName('Add receipts')
  const gallery = dialog.locator('.mvp-add-receipts__sources .mn-btn:has-text("Photo Gallery")')
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), gallery.click()])
  await chooser.setFiles(Array.from({ length: count }, () => FIXTURE))
  await dialog.locator('.mn-btn:has-text("Save")').click()
  await expect(dialog.locator('.mvp-capturing')).toBeVisible()
  return dialog
}

/** The caption, read from inside the live region so an announcement is implied. */
function caption(page: Page) {
  return page.locator('.mvp-capturing[role="status"][aria-live="polite"] .mvp-capturing__caption')
}

test('the caption is empty before 6 s, then changes at 6, 12 and 20 s', async ({ page }) => {
  await openReceiptsOnFakeTimers(page)
  await stageAndSave(page, 1)

  await expect(caption(page)).toHaveCount(0)
  await page.clock.runFor(5999)
  await expect(caption(page)).toHaveCount(0)

  await page.clock.runFor(1)
  await expect(caption(page)).toHaveText(CAPTION_6)
  await expect(caption(page)).toHaveClass(/\btype-body-caption\b/)

  await page.clock.runFor(6000)
  await expect(caption(page)).toHaveText(CAPTION_12)

  await page.clock.runFor(8000)
  await expect(caption(page)).toHaveText(CAPTION_20)
})

test('a bulk read counts elapsed time from the start of the CURRENT read', async ({ page }) => {
  await openReceiptsOnFakeTimers(page)
  await stageAndSave(page, 2)

  // The first read never answers, so the cutoff ends it at 30 s.
  await page.clock.runFor(20000)
  await expect(caption(page)).toHaveText(CAPTION_20)
  await page.clock.runFor(10000)

  // The second read has just started: its caption starts again from empty.
  await expect(page.locator('.mvp-capturing')).toBeVisible()
  await expect(caption(page)).toHaveCount(0)
  await page.clock.runFor(6000)
  await expect(caption(page)).toHaveText(CAPTION_6)
})

test('a read that never answers becomes the failed-read advisory at 30 s', async ({ page }) => {
  await openReceiptsOnFakeTimers(page)
  const cards = page.locator('.mvp-receipt-card')
  const before = await cards.count()
  const dialog = await stageAndSave(page, 1)

  await page.clock.runFor(29999)
  await expect(dialog.locator('.mvp-capturing'), 'still reading at 29.999 s').toBeVisible()

  await page.clock.runFor(1)
  await expect(dialog).toHaveCount(0)
  await expect(cards).toHaveCount(before + 1)
  await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(1)
  await expect(page.locator('.mvp-receipt-card__advisory')).toHaveText("Couldn't read this photo")
})

test('a read that answers AFTER the cutoff changes nothing', async ({ page }) => {
  await openReceiptsOnFakeTimers(page)
  // A read the test resolves by hand, after the cutoff has already fired.
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    w.__monarchExtractReceipt = () =>
      new Promise((resolve) => {
        w.__resolveLateRead = resolve
      })
  })
  const cards = page.locator('.mvp-receipt-card')
  const before = await cards.count()
  await stageAndSave(page, 1)

  await page.clock.runFor(30000)
  await expect(cards).toHaveCount(before + 1)
  await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(1)
  const html = await page.locator('.mvp-receipts').innerHTML()

  // Invented values: a readable result that would have linked or renamed.
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__resolveLateRead({
      merchant: 'Late Read Sample Store',
      capturedAt: '2030-01-02T03:04:00',
      total: 12.34,
      tax: null,
      currency: 'MYR',
      lineItems: [{ quantity: '1', name: 'Late sample item', price: 12.34 }],
    })
  })
  await page.clock.runFor(1000)

  await expect(cards).toHaveCount(before + 1)
  await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(1)
  await expect(page.getByText('Late Read Sample Store')).toHaveCount(0)
  expect(await page.locator('.mvp-receipts').innerHTML(), 'the library did not move').toBe(html)
})
