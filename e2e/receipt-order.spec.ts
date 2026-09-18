import { expect, test, type Page } from '@playwright/test'
import { backfillAddedAt, groupReceiptsByMonth, receiptsNewestFirst } from '../src/data/derive'
import { RECEIPTS } from '../src/data/receipts'
import type { Receipt } from '../src/data/types'
import { PINNED_NOW, activateTab, gotoRoute } from './harness'
import { RECEIPTS_TAB, installResolvingExtraction, saveOneCapture } from './capture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RECEIPTS TAB ORDERS BY WHEN A RECEIPT WAS ADDED (Gate 58).
 *
 * Teku's ruling, option C: group and order on `Receipt.addedAt`, newest first,
 * so old till paper no longer files under its printed month and sinks below the
 * fold. The printed date stays on the card and stays auto-match's only date.
 *
 * TWO HALVES. The Node tests assert the rules — backfill, order, the
 * millisecond, the tie — on the real seed and on invented records. The browser
 * tests assert the wiring: a real capture, stamped by the real save path, lands
 * where the rules say.
 *
 * NO RECEIPT TEXT. Every invented record here is built from a seeded one with
 * its dates replaced; the dates are invented.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SEED = backfillAddedAt(RECEIPTS)

function added(id: string, addedAt: string, capturedAt = '2025-09-01T10:00:00'): Receipt {
  return { ...RECEIPTS[0], id, addedAt, capturedAt }
}
const ids = (receipts: Receipt[]) => receipts.map((r) => r.id)

test.describe('the rules', () => {
  test('backfill stamps every seeded receipt from its printed date, and keeps one already stamped', () => {
    for (const r of SEED) expect(r.addedAt, r.id).toBe(`${r.capturedAt}.000`)
    const stamped = added('stamped', '2026-01-02T03:04:05.678')
    expect(backfillAddedAt([stamped])[0].addedAt).toBe('2026-01-02T03:04:05.678')
  })

  test('the ten seeded receipts keep the order they had — printed date, newest first', () => {
    // DERIVED INDEPENDENTLY: the pre-Gate-58 rule, written out here, not called.
    const before = [...RECEIPTS].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
    expect(ids(receiptsNewestFirst(SEED))).toEqual(ids(before))
    expect(new Set(RECEIPTS.map((r) => r.capturedAt)).size, 'no two seeds share a date').toBe(RECEIPTS.length)
  })

  test('a receipt added now sits above every seed, whatever year its paper prints', () => {
    const old = added('old-paper', '2026-08-15T09:41:00.000', '2011-03-01T10:00:00')
    const ordered = receiptsNewestFirst([...SEED, old])
    expect(ordered[0].id).toBe('old-paper')
    const groups = groupReceiptsByMonth([...SEED, old])
    expect(groups[0].label).toBe('August 2026')
    expect(ids(groups[0].receipts)).toEqual(['old-paper'])
  })

  test('two adds in the same second are ordered by the millisecond', () => {
    const earlier = added('earlier', '2026-08-15T09:41:00.100')
    const later = added('later', '2026-08-15T09:41:00.400')
    expect(ids(receiptsNewestFirst([earlier, later]))).toEqual(['later', 'earlier'])
  })

  test('an exact tie — one selection — keeps library order, which is pick order', () => {
    const batch = ['first', 'second', 'third'].map((id) => added(id, '2026-08-15T09:41:00.000'))
    expect(ids(receiptsNewestFirst(batch))).toEqual(['first', 'second', 'third'])
  })

  test('a receipt with no addedAt is refused rather than guessed at', () => {
    const unstamped: Receipt = { ...RECEIPTS[0], addedAt: undefined }
    expect(() => receiptsNewestFirst([unstamped])).toThrow(/has no addedAt/)
  })
})

/* ──────────────────────────────────────────────────────────────── the wiring */

/** An unreadable-but-dated capture: no merchant and no total, so it never links. */
const printedOn = (capturedAt: string) => ({
  merchant: null,
  capturedAt,
  total: null,
  tax: null,
  currency: 'MYR',
  lineItems: [],
})

async function openReceipts(page: Page): Promise<void> {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, RECEIPTS_TAB)
}

test.describe('the wiring', () => {
  test('a capture of old paper lands at the top, under the month it was added, printing its own date', async ({ page }) => {
    await openReceipts(page)
    await installResolvingExtraction(page, printedOn('2011-03-01T10:00:00'))
    await saveOneCapture(page)

    const first = page.locator('.mvp-receipts__month').first()
    await expect(first.locator('.mvp-section-header')).toHaveText('August 2026')
    const cards = first.locator('.mvp-receipt-card')
    await expect(cards).toHaveCount(1)
    await expect(cards.first().locator('.mvp-receipt-card__date')).toHaveText('01 Mar, 10:00')
    // The ten seeds are still there, below it, in their own months.
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(RECEIPTS.length + 1)
  })

  test('of two saves 400 ms apart, the later one is on top', async ({ page }) => {
    await openReceipts(page)
    // The earlier save's paper is the NEWER print, so printed date and added
    // time disagree — the order can only come from `addedAt`.
    await installResolvingExtraction(page, printedOn('2012-04-02T10:00:00'))
    await saveOneCapture(page)
    await page.clock.setFixedTime(new Date(PINNED_NOW.getTime() + 400))
    await installResolvingExtraction(page, printedOn('2011-03-01T10:00:00'))
    await saveOneCapture(page)

    const cards = page.locator('.mvp-receipts__month').first().locator('.mvp-receipt-card')
    await expect(cards).toHaveCount(2)
    await expect(cards.nth(0).locator('.mvp-receipt-card__date')).toHaveText('01 Mar, 10:00')
    await expect(cards.nth(1).locator('.mvp-receipt-card__date')).toHaveText('02 Apr, 10:00')
  })
})
