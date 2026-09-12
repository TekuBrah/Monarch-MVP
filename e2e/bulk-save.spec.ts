import { expect, test, type Page } from '@playwright/test'
import { activateTab, gotoRoute } from './harness'
import { RECEIPTS_TAB } from './capture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BULK SAVE PATH — TWO PROPERTIES A SCREENSHOT CANNOT EXPRESS (Gate 52).
 *
 * Both are about what `AddReceiptsModal.save()` does with a BATCH, and neither
 * is visible in a baseline: one is a concurrency bound and the other is what
 * survives a failure. `[overlay:add-saving]` photographs the moment before
 * either can be observed, because the walk's extraction stub never settles.
 *
 * ─────────────────────── WHY THIS SPEC EXISTS AT ALL ─────────────────────────
 *
 * The reported defect was "Photo Gallery on the Receipts tab never adds the
 * receipt", against a camera path and a detail-sheet gallery path that both
 * worked. The single behavioural difference was that this path — and ONLY this
 * path — could run more than one extraction, and did so with `Promise.all`:
 *
 *   bulk + camera          1 file by construction    -> 1 extraction   works
 *   detail sheet + gallery `files[0]`, only ever one -> 1 extraction   works
 *   bulk + gallery         N files                   -> N at once      FAILED
 *
 * `recognise.ts` spawns a worker per call, each loading a ~3.9 MB WASM engine
 * and a 2.95 MB model, so N at once meant N of those resident simultaneously —
 * measured at peak workers 1/2/4 for 1/2/4 staged files. And `Promise.all` is
 * all-or-nothing, so a single failure threw past `setIsSaving(false)`, `onSave`
 * and `onClose` alike: loader forever, Save button already gone, nothing added,
 * and the captures that HAD succeeded discarded with the one that had not.
 *
 * ─────────── IT ASSERTS AT THE SEAM, NOT ON TESSERACT'S INTERNALS ────────────
 *
 * The concurrency test counts extractions in flight through
 * `window.__monarchExtractReceipt`, not live `Worker` objects. The property
 * that matters is "this surface never asks for two reads at once"; counting
 * workers would tie the assertion to the engine's private choice to use one per
 * call, and would go quietly green the day the engine pooled them while the
 * surface still queued N images of a phone camera's size into memory.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SECOND = 'e2e/fixtures/receipt-capture.jpg'

/** Open the Receipts tab with the walk's never-settling stub still installed. */
async function openReceipts(page: Page): Promise<void> {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, RECEIPTS_TAB)
}

/** Stage `count` copies of the fixture through the real gallery click path. */
async function stage(page: Page, count: number) {
  await page.locator('.mvp-receipts__add .mn-btn').click()
  const dialog = page.locator('[role="dialog"][aria-modal="true"]')
  await expect(dialog).toHaveAccessibleName('Add receipts')

  const gallery = dialog.locator(
    '.mvp-add-receipts__sources .mn-btn:has-text("Photo Gallery")',
  )
  // Armed BEFORE the click — Chromium raises the event synchronously with it.
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    gallery.click(),
  ])
  await chooser.setFiles(Array.from({ length: count }, () => SECOND))
  await expect(
    dialog.locator('.mvp-add-receipts__tile:not(.mvp-add-receipts__tile--more)'),
    `${count} file(s) staged`,
  ).toHaveCount(count)
  return dialog
}

test('the bulk modal extracts one capture at a time', async ({ page }) => {
  await openReceipts(page)

  /*
    AN EXTRACTION THAT TAKES REAL TIME, so overlap is observable at all. An
    instantly-resolving stub would report a peak of 1 even from `Promise.all`,
    because each call would finish before the next began — the test would pass
    against the very code it exists to reject.
  */
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>
    w.__live = 0
    w.__peak = 0
    w.__monarchExtractReceipt = async () => {
      w.__live = (w.__live as number) + 1
      w.__peak = Math.max(w.__peak as number, w.__live as number)
      await new Promise((r) => setTimeout(r, 60))
      w.__live = (w.__live as number) - 1
      return {
        merchant: 'Concurrency Probe',
        capturedAt: '2025-09-04T13:45:00',
        total: 12.34,
        tax: null,
        currency: 'MYR',
        lineItems: [],
      }
    }
  })

  const before = await page.locator('.mvp-receipt-card').count()
  const dialog = await stage(page, 3)
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog, 'Save resolved and the modal closed').toHaveCount(0)

  const peak = await page.evaluate(
    () => (window as unknown as Record<string, number>).__peak,
  )
  expect(
    peak,
    'three staged files must be read ONE AT A TIME — `Promise.all` reports 3',
  ).toBe(1)

  await expect(
    page.locator('.mvp-receipt-card'),
    'all three captures reached the library',
  ).toHaveCount(before + 3)
})

test('a failed extraction strands nothing and discards nothing', async ({
  page,
}) => {
  await openReceipts(page)

  /*
    THE SECOND OF TWO THROWS. The first having already succeeded is the whole
    point: under `Promise.all` its result was thrown away along with the
    failure, so a user lost a photograph the app had already read correctly.
  */
  await page.evaluate(() => {
    let n = 0
    const w = window as unknown as Record<string, unknown>
    w.__monarchExtractReceipt = async () => {
      n += 1
      if (n === 2) throw new Error('simulated extraction failure')
      return {
        merchant: 'Readable Receipt',
        capturedAt: '2025-09-04T13:45:00',
        total: 250.75,
        tax: null,
        currency: 'MYR',
        lineItems: [],
      }
    }
  })

  const before = await page.locator('.mvp-receipt-card').count()
  const dialog = await stage(page, 2)
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(
    dialog,
    'the modal closed rather than holding its loader forever',
  ).toHaveCount(0)
  await expect(
    page.locator('.mvp-receipt-card'),
    'BOTH captures reached the library — the readable one and the unread one',
  ).toHaveCount(before + 2)

  /*
    THE UNREAD ONE IS AN UNREAD RECEIPT, NOT A FABRICATED ONE. `capturedToReceipt`
    applies the same three honest fallbacks it already applies to a field the
    engine read but could not parse, so the file's own name stands in for the
    merchant and the total reads 0 — never a guess. Gate 51-B's editor is how
    the user corrects it, which is why this needs no new state and no new copy.

    IT IS ADDRESSED BY ITS MONTH GROUP, NOT BY POSITION. An unread date falls
    back to the moment of capture, which under the pinned clock is August 2026 —
    strictly newer than every seeded receipt and than the readable capture's own
    2025-09-04. `groupReceiptsByMonth` sorts groups descending, so it is alone in
    the FIRST group, and asserting that count is what makes the click land on it
    by evidence rather than by luck.
  */
  const newest = page.locator('.mvp-receipts__month').first()
  await expect(
    newest.locator('.mvp-receipt-card'),
    'the unread capture is alone in the newest month group',
  ).toHaveCount(1)
  await newest.locator('.mvp-receipt-card').click()

  const viewer = page.locator('[role="dialog"][aria-modal="true"]')
  await expect(viewer).toHaveCount(1)

  const row = (label: string) =>
    viewer
      .locator('.mvp-receipt-details__row', { hasText: label })
      .locator('.mvp-receipt-details__row-value')

  await expect(row('Merchant'), 'merchant falls back to the file name').toHaveText(
    'receipt-capture.jpg',
  )
  await expect(row('Total'), 'an unread total is 0, never a guess').toHaveText(
    'RM 0.00',
  )
})
