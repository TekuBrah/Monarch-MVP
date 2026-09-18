import { expect, test } from '@playwright/test'
import {
  receiptSubtotalRead,
  receiptTaxRead,
  receiptTotalRead,
} from '../src/data/derive'
import { UNREAD_FIGURE, formatMyrOrUnread } from '../src/data/format'
import { RECEIPTS } from '../src/data/receipts'
import type { Receipt } from '../src/data/types'
import { activateTab, gotoRoute } from './harness'
import { FIXTURE, TRANSACTIONS_TAB, installResolvingExtraction } from './capture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * A FIGURE THAT WAS NEVER READ IS AN EM DASH, NOT "RM 0.00" (Gate 58).
 *
 * The parser returns `null` for a total it could not find, and the display
 * used to turn that into a confident "RM 0.00" — the 7-Eleven "total 0.00"
 * Teku saw on his phone. The row still renders; its figure is `—`. The same
 * holds for a subtotal with no line items under it and a tax the engine did
 * not read. Nothing is invented from the line items.
 *
 * NODE HALF: the three derivations and the formatter, on the real seed and on
 * a seeded record with its figures removed. BROWSER HALF: a capture with
 * nothing read, made through the real detail-sheet path, drawn with dashes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const AIA = RECEIPTS.find((r) => r.id === 'receipt-aia01')!
/** A machine-read capture that read nothing: stored as `capturedToReceipt` stores it. */
const UNREAD_CAPTURE: Receipt = {
  ...RECEIPTS[0],
  id: 'unread',
  sourceUrl: 'blob:invented',
  total: 0,
  tax: null,
  lineItems: [],
}

test.describe('the rules', () => {
  test('every seeded receipt reads all its figures — no seed draws a dash', () => {
    for (const r of RECEIPTS) {
      expect(receiptTotalRead(r), r.id).toBe(r.total)
      expect(receiptSubtotalRead(r), r.id).not.toBeNull()
      expect(receiptTaxRead(r), r.id).not.toBeNull()
    }
  })

  test('an unread capture: total, subtotal and tax are all "not read"', () => {
    expect(receiptTotalRead(UNREAD_CAPTURE)).toBeNull()
    expect(receiptSubtotalRead(UNREAD_CAPTURE)).toBeNull()
    expect(receiptTaxRead(UNREAD_CAPTURE)).toBeNull()
  })

  test('a transcribed receipt with no tax line keeps Gate 49 — no row at all', () => {
    expect(AIA.tax).toBeNull()
    expect(receiptTaxRead(AIA)).toBe('no-row')
  })

  test('not read draws an em dash; a read figure draws money', () => {
    expect(UNREAD_FIGURE).toBe('—')
    expect(formatMyrOrUnread(null)).toBe('—')
    expect(formatMyrOrUnread(12.3)).toBe('RM 12.30')
  })
})

test('a capture with nothing read shows a dash on every money row of the detail sheet', async ({
  page,
}) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, TRANSACTIONS_TAB)
  await installResolvingExtraction(page, {
    merchant: null,
    capturedAt: null,
    total: null,
    tax: null,
    currency: 'MYR',
    lineItems: [],
  })

  // The unlinked Aeon Big row the `detail` walk state opens.
  await page.locator('.mvp-transactions__list > li:has-text("RM 250.75") .mn-list-item').click()
  const sheet = page.locator('[role="dialog"][aria-modal="true"]')
  await sheet.locator('.mvp-txn-detail__prompt .mn-btn').click()
  const gallery = page.locator('.mvp-source-picker__panel button:has-text("Photo Gallery")')
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), gallery.click()])
  await chooser.setFiles(FIXTURE)

  const rows = sheet.locator('.mvp-txn-detail__total-row')
  await expect(rows, 'subtotal, tax and total all render').toHaveCount(3)
  await expect(rows.nth(0)).toHaveText(`Subtotal${UNREAD_FIGURE}`)
  await expect(rows.nth(1)).toHaveText(`Sales Tax (6% SST)${UNREAD_FIGURE}`)
  await expect(rows.nth(2)).toContainText(UNREAD_FIGURE)
  await expect(sheet).not.toContainText('RM 0.00')
})
