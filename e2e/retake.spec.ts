import { expect, test, type Page } from '@playwright/test'
import { PINNED_NOW, activateTab, gotoRoute } from './harness'
import {
  FIXTURE,
  RECEIPTS_TAB,
  TRANSACTIONS_TAB,
  capturedImageName,
  installResolvingExtraction,
  saveOneCapture,
} from './capture'
import { receiptReadFailed } from '../src/data/derive'
import { firstPassFailed } from '../src/data/ocr/secondPass'
import { RECEIPTS } from '../src/data/receipts'
import type { Receipt } from '../src/data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE FAILED-READING ADVISORY AND THE RETAKE — Gate 60. No baseline.
 *
 * The three walk states `add-unread`, `view-unread` and `detail-unread`
 * photograph the advisory. What a screenshot cannot say is WHEN it appears,
 * what a retake OPENS, and what a retake LEAVES ALONE — so those are here.
 *
 * NO FIGURE FROM ANY RECEIPT. The readable extraction below is invented, and was
 * checked against the token set of every corpus image before it was used.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** An extraction that read nothing — the shape a failed page produces. */
const UNREAD = {
  merchant: null,
  capturedAt: null,
  total: null,
  tax: null,
  currency: 'MYR',
  lineItems: [],
}

/**
 * An extraction that read — INVENTED values. The total matches no ledger row,
 * so auto-match leaves it unlinked, which is what isolates the retake's own
 * linking behaviour from auto-match's.
 */
const READ = {
  merchant: 'Kedai Contoh',
  capturedAt: '2026-08-14T10:47:00',
  total: 61.37,
  tax: null,
  currency: 'MYR',
  lineItems: [{ name: 'Sample widget', quantity: '1', price: 61.37 }],
}

/** A stored receipt with this many line items and this total (`null` = unread). */
function asRecord(lineItems: number, total: number | null): Receipt {
  return {
    ...RECEIPTS[0],
    lineItems: Array.from({ length: lineItems }, (_, i) => ({
      name: `line ${i}`,
      quantity: '1',
      price: 1,
    })),
    // THE STORED SHAPE: `capturedToReceipt` writes an unread total as 0.
    total: total ?? 0,
    sourceUrl: 'blob:probe',
  }
}

test.describe('the rule — Node, no browser', () => {
  test('the advisory rule IS the second-pass trigger, applied to the stored record', () => {
    for (const items of [0, 1, 3]) {
      for (const total of [null, 0.07, 12.5]) {
        expect(
          receiptReadFailed(asRecord(items, total)),
          `${items} item(s), total ${total}: the stored record and the reading disagree`,
        ).toBe(firstPassFailed({ lineItems: asRecord(items, total).lineItems, total }))
      }
    }
  })

  test('no transcribed receipt can show the advisory', () => {
    expect(RECEIPTS.filter(receiptReadFailed).map((r) => r.id)).toEqual([])
  })
})

async function openReceipts(page: Page): Promise<void> {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, RECEIPTS_TAB)
}

/** The top card is the newest ADDED (Gate 58), i.e. the one just saved. */
function newestCard(page: Page) {
  return page.locator('.mvp-receipt-card').first()
}

const viewer = (page: Page) => page.locator('[role="dialog"][aria-modal="true"]')

test.describe('the advisory and the retake — browser', () => {
  test('a gallery capture that read nothing: advisory, gallery retake, original untouched', async ({
    page,
  }) => {
    await openReceipts(page)
    const cards = page.locator('.mvp-receipt-card')
    await expect(cards).toHaveCount(10)
    await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(0)

    await installResolvingExtraction(page, UNREAD)
    await saveOneCapture(page, 'Photo Gallery')
    await expect(cards).toHaveCount(11)

    // THE CARD SAYS SO, AND ONLY THAT CARD.
    await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(1)
    await expect(newestCard(page).locator('.mvp-receipt-card__advisory')).toHaveText(
      "Couldn't read this photo",
    )

    // THE VIEWER CARRIES THE FULL ADVISORY — and every ordinary action still.
    await newestCard(page).click()
    const advisory = viewer(page).locator('.mvp-receipt-advisory')
    await expect(advisory.locator('.mvp-receipt-advisory__title')).toHaveText(
      "We couldn't read this photo",
    )
    await expect(advisory.locator('.mvp-receipt-advisory__body')).toContainText(
      'no items or total came through',
    )
    await expect(viewer(page).getByRole('button', { name: 'Link to transaction' })).toHaveCount(1)
    await expect(viewer(page).getByRole('button', { name: 'Delete receipt' })).toHaveCount(1)

    // THE RETAKE REOPENS THE GALLERY: no `capture`, and one file only.
    const retake = advisory.getByRole('button', { name: 'Choose another photo' })
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), retake.click()])
    expect(await chooser.element().getAttribute('capture'), 'a gallery retake').toBeNull()
    expect(chooser.isMultiple(), 'a retake replaces ONE photograph').toBe(false)

    await installResolvingExtraction(page, READ)
    await chooser.setFiles(FIXTURE)

    // THE VIEWER MOVES TO THE NEW RECEIPT, WHICH READ — so no advisory.
    await expect(viewer(page).locator('.mvp-receipt-details')).toContainText('Kedai Contoh')
    await expect(viewer(page).locator('.mvp-receipt-advisory')).toHaveCount(0)

    // THE ORIGINAL IS STILL THERE, STILL SAYING SO. Nothing was deleted.
    await viewer(page).getByRole('button', { name: 'Close' }).click()
    await expect(cards).toHaveCount(12)
    await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(1)
  })

  test('a camera capture that read nothing retakes with the camera', async ({ page }) => {
    await openReceipts(page)
    await installResolvingExtraction(page, UNREAD)
    await saveOneCapture(page, 'Camera')
    await newestCard(page).click()

    const retake = viewer(page)
      .locator('.mvp-receipt-advisory')
      .getByRole('button', { name: 'Retake photo' })
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), retake.click()])
    expect(await chooser.element().getAttribute('capture')).toBe('environment')
    expect(chooser.isMultiple()).toBe(false)
  })

  test('a retake from the detail sheet leaves the original linked and opens the new one', async ({
    page,
  }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, TRANSACTIONS_TAB)
    await installResolvingExtraction(page, UNREAD)

    const row = page.locator('.mvp-transactions__list > li:has-text("RM 250.75") .mn-list-item')
    await row.click()
    const sheet = page.locator('[role="dialog"]:has-text("Transaction details")')
    await sheet.locator('.mvp-txn-detail__prompt .mn-btn').click()
    const gallery = page.locator('.mvp-source-picker__row:has-text("Photo Gallery")')
    const [first] = await Promise.all([page.waitForEvent('filechooser'), gallery.click()])
    await first.setFiles(FIXTURE)

    // THE SHEET SHOWS THE ORIGINAL, LINKED, WITH THE ADVISORY.
    await expect(sheet.locator('.mvp-receipt-advisory__title')).toHaveText(
      "We couldn't read this photo",
    )
    await expect(sheet.locator('.mvp-txn-detail__receipt-name')).toHaveText(
      capturedImageName(PINNED_NOW),
    )

    const retake = sheet.getByRole('button', { name: 'Choose another photo' })
    const [second] = await Promise.all([page.waitForEvent('filechooser'), retake.click()])
    await installResolvingExtraction(page, READ)
    await second.setFiles(FIXTURE)

    // THE VIEWER OPENS ON THE NEW RECEIPT, UNLINKED: auto-match never takes a
    // transaction that already has a receipt, and the retake moves no link.
    await expect(viewer(page).locator('.mvp-receipt-details')).toContainText('Kedai Contoh')
    await expect(viewer(page).getByRole('button', { name: 'Link to transaction' })).toHaveCount(1)
    await viewer(page).getByRole('button', { name: 'Close' }).click()

    // AND THE ORIGINAL IS EXACTLY WHERE IT WAS: still this row's receipt.
    await row.click()
    await expect(sheet.locator('.mvp-receipt-advisory__title')).toHaveText(
      "We couldn't read this photo",
    )
    await expect(sheet.locator('.mvp-txn-detail__receipt-name')).toHaveText(
      capturedImageName(PINNED_NOW),
    )
  })

  test('a capture that read shows no advisory anywhere', async ({ page }) => {
    await openReceipts(page)
    await installResolvingExtraction(page, READ)
    await saveOneCapture(page, 'Photo Gallery')
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(11)
    await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(0)
    await newestCard(page).click()
    await expect(viewer(page).locator('.mvp-receipt-details')).toContainText('Kedai Contoh')
    await expect(viewer(page).locator('.mvp-receipt-advisory')).toHaveCount(0)
  })

  test('half a reading: the advisory names the half that did not come through', async ({
    page,
  }) => {
    await openReceipts(page)

    // ITEMS, NO TOTAL — then A TOTAL, NO ITEMS.
    await installResolvingExtraction(page, { ...READ, total: null })
    await saveOneCapture(page, 'Photo Gallery')
    await installResolvingExtraction(page, { ...READ, lineItems: [] })
    await saveOneCapture(page, 'Photo Gallery')

    /*
      BOTH CARDS, READ WITHOUT ASSUMING WHICH IS ON TOP. The harness pins the
      clock, so both saves carry the same `addedAt` and their order is the
      tie-break (library order, Gate 58) rather than anything this test is
      about. Each flagged card is opened and its sentence collected.
    */
    const flagged = page.locator('.mvp-receipt-card:has(.mvp-receipt-card__advisory)')
    await expect(flagged).toHaveCount(2)
    const bodies: string[] = []
    for (let i = 0; i < 2; i += 1) {
      await flagged.nth(i).click()
      bodies.push(await viewer(page).locator('.mvp-receipt-advisory__body').innerText())
      await viewer(page).getByRole('button', { name: 'Close' }).click()
    }
    expect(bodies.some((b) => b.includes("the total didn't come through"))).toBe(true)
    expect(bodies.some((b) => b.includes('no items came through'))).toBe(true)
    expect(bodies.some((b) => b.includes('no items or total'))).toBe(false)
  })

  test('the seeded library shows no advisory', async ({ page }) => {
    await openReceipts(page)
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(10)
    await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(0)
    // One viewer, opened through its card, as the proof the viewer agrees.
    await page.locator('.mvp-receipt-card').first().click()
    await expect(viewer(page).locator('.mvp-receipt-details')).toHaveCount(1)
    await expect(viewer(page).locator('.mvp-receipt-advisory')).toHaveCount(0)
  })
})
