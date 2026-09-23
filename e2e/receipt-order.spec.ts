import { expect, test, type Page } from '@playwright/test'
import {
  backfillAddedAt,
  groupReceiptsByCapturedDate,
  groupReceiptsByMonth,
  receiptsNewestFirst,
} from '../src/data/derive'
import { RECEIPTS } from '../src/data/receipts'
import type { Receipt } from '../src/data/types'
import { PINNED_NOW, activateTab, gotoRoute } from './harness'
import {
  RECEIPTS_TAB,
  TRANSACTIONS_TAB,
  capturedImageName,
  installResolvingExtraction,
  saveOneCapture,
} from './capture'

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

/* ──────────────────────────────────── the sort control's second mode (Gate 64) */

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * "RECEIPT DATE" — THE SORT CONTROL'S SECOND MODE, GROUPING BY `capturedAt`.
 *
 * `groupReceiptsByCapturedDate` is a SIBLING of `groupReceiptsByMonth`, added
 * rather than substituted, so every test above this line still exercises the
 * unchanged default. These are its own rules, plus the wiring that lets a user
 * reach it.
 *
 * NO RECEIPT TEXT, as above — every fixture is `RECEIPTS[0]` with its id and
 * dates replaced.
 * ─────────────────────────────────────────────────────────────────────────────
 */

test.describe('the rules — "Receipt date" mode', () => {
  test('groups by the printed month, newest month first, newest receipt first inside it', () => {
    const a = added('a', '2026-01-01T00:00:00.000', '2025-09-05T10:00:00')
    const b = added('b', '2026-01-01T00:00:00.000', '2025-09-10T10:00:00')
    const c = added('c', '2026-01-01T00:00:00.000', '2025-08-20T10:00:00')
    const groups = groupReceiptsByCapturedDate([a, b, c], () => true)
    expect(groups.map((g) => g.label)).toEqual(['September 2025', 'August 2025'])
    expect(ids(groups[0].receipts)).toEqual(['b', 'a'])
    expect(ids(groups[1].receipts)).toEqual(['c'])
  })

  test('a receipt whose date was never read is collected into one trailing "No receipt date" group, never guessed and never dropped', () => {
    const dated = added('dated', '2026-01-01T00:00:00.000', '2025-09-05T10:00:00')
    const undated = added('undated', '2026-01-01T00:00:00.000', '2025-01-01T00:00:00')
    const groups = groupReceiptsByCapturedDate([dated, undated], (r) => r.id === 'dated')
    // NEVER DROPPED: the undated receipt is still present, somewhere.
    expect(groups.flatMap((g) => ids(g.receipts))).toContain('undated')
    // NEVER GUESSED INTO A MONTH: it is not filed under its (invented) 2025-01
    // capturedAt, which would put it in a THIRD group rather than one trailing one.
    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({ label: 'September 2025' })
    expect(ids(groups[0].receipts)).toEqual(['dated'])
    expect(groups[1]).toMatchObject({ key: 'no-receipt-date', label: 'No receipt date' })
    expect(ids(groups[1].receipts)).toEqual(['undated'])
  })

  test('the "No receipt date" group is omitted entirely when every date was read', () => {
    const dated = added('dated', '2026-01-01T00:00:00.000', '2025-09-05T10:00:00')
    const groups = groupReceiptsByCapturedDate([dated], () => true)
    expect(groups.some((g) => g.key === 'no-receipt-date')).toBe(false)
  })

  test('ties in a dated month keep library order, by index — not addedAt, not id', () => {
    const a = added('a', '2026-01-01T00:00:00.000', '2025-09-05T10:00:00')
    const b = added('b', '2026-01-01T00:00:00.000', '2025-09-05T10:00:00')
    const c = added('c', '2026-01-01T00:00:00.000', '2025-09-05T10:00:00')
    expect(ids(groupReceiptsByCapturedDate([a, b, c], () => true)[0].receipts)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  test('inside the undated group, ties keep addedAt order (`receiptsNewestFirst`), never a guess about the paper', () => {
    const earlier = added('earlier', '2026-08-15T09:41:00.100', '2020-01-01T00:00:00')
    const later = added('later', '2026-08-15T09:41:00.400', '2020-01-01T00:00:00')
    const groups = groupReceiptsByCapturedDate([earlier, later], () => false)
    expect(groups).toHaveLength(1)
    expect(ids(groups[0].receipts)).toEqual(['later', 'earlier'])
  })
})

/** An extraction with everything read except the date — never a full advisory. */
function dateUnread(merchant: string, total: number) {
  return {
    merchant,
    capturedAt: null,
    total,
    tax: null,
    currency: 'MYR',
    lineItems: [{ name: 'Item', quantity: '1', price: total }],
  }
}

test.describe('the wiring — the sort control', () => {
  test('defaults to "Date added" and switching mode moves the pressed state', async ({
    page,
  }) => {
    await openReceipts(page)
    const added_ = page.getByRole('button', { name: 'Date added' })
    const date = page.getByRole('button', { name: 'Receipt date' })
    await expect(added_).toHaveAttribute('aria-pressed', 'true')
    await expect(date).toHaveAttribute('aria-pressed', 'false')

    await date.click()
    await expect(date).toHaveAttribute('aria-pressed', 'true')
    await expect(added_).toHaveAttribute('aria-pressed', 'false')
    // Nothing was lost by switching modes.
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(RECEIPTS.length)
  })

  test('a capture whose printed date could not be read sits in its own trailing group under "Receipt date", and nowhere special under "Date added"', async ({
    page,
  }) => {
    await openReceipts(page)
    await installResolvingExtraction(page, dateUnread('Some Shop', 42))
    await saveOneCapture(page)
    // UNDER "Date added" (the default) the capture sorts on `addedAt` alone —
    // its unread `capturedAt` never enters the reckoning, so it lands in the
    // FIRST month exactly as `receiptDateWasRead` predicts a capture with a
    // real date would too.
    const firstGroupUnderAdded = page.locator('.mvp-receipts__month').first()
    await expect(firstGroupUnderAdded.locator('.mvp-receipt-card')).toHaveCount(1)

    await page.getByRole('button', { name: 'Receipt date' }).click()
    const lastGroup = page.locator('.mvp-receipts__month').last()
    await expect(lastGroup.locator('.mvp-section-header')).toHaveText('No receipt date')
    const cards = lastGroup.locator('.mvp-receipt-card')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText(capturedImageName(PINNED_NOW))
    // and it is the ONLY receipt in that trailing group — nothing else was
    // misfiled into it.
    await expect(page.locator('.mvp-receipts__month:has-text("No receipt date")')).toHaveCount(1)
  })

  test('search narrows before grouping, in BOTH sort modes', async ({ page }) => {
    await openReceipts(page)
    const search = page.getByRole('textbox', { name: 'Search receipts' })
    const ikeaCount = RECEIPTS.filter((r) => r.merchant === 'IKEA').length
    expect(ikeaCount, 'the seed must contain more than one IKEA receipt for this to test anything').toBeGreaterThan(1)

    await search.fill('ikea')
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(ikeaCount)
    await expect(page.locator('.mvp-receipt-card:has-text("Aeon")')).toHaveCount(0)

    // SWITCHING MODE WITHOUT CLEARING THE SEARCH — if the 'date' branch grouped
    // the UNFILTERED collection, the count below would jump back to all ten.
    await page.getByRole('button', { name: 'Receipt date' }).click()
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(ikeaCount)
    await expect(page.locator('.mvp-receipt-card:has-text("Aeon")')).toHaveCount(0)
  })
})

/* ──────────────────────────── the source picker's library, Gate 64 (item 2.2) */

test.describe('the wiring — the receipt-library picker orders newest-added-first', () => {
  test('two unlinked captures list newest first, not in library (insertion) order', async ({
    page,
  }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)

    // TWO SEPARATE SELECTIONS, A TICK APART, SO "NEWEST ADDED" AND "LIBRARY
    // (INSERTION) ORDER" AGREE ON NOTHING BUT THE FIRST ONE. Each extraction
    // matches no ledger row (round figures no seeded transaction has), so
    // neither auto-links and both stay in the unlinked library.
    await installResolvingExtraction(page, dateUnread('First Added', 911.11))
    await saveOneCapture(page)
    const secondNow = new Date(PINNED_NOW.getTime() + 1000)
    await page.clock.setFixedTime(secondNow)
    await installResolvingExtraction(page, dateUnread('Second Added', 922.22))
    await saveOneCapture(page)

    await activateTab(page, TRANSACTIONS_TAB)
    // The unlinked row `detail` state is keyed to (Gate 49's rule): a real
    // ledger row that has no receipt of its own.
    const row = page.locator('.mvp-transactions__list > li:has-text("RM 250.75") .mn-list-item')
    await row.click()
    const sheet = page.locator('[role="dialog"]:has-text("Transaction details")')
    await sheet.locator('.mvp-txn-detail__prompt .mn-btn').click()
    await page.locator('.mvp-source-picker__row:has-text("Receipt library")').click()

    const cards = page.locator('.mvp-source-picker__library .mvp-receipt-card')
    await expect(cards).toHaveCount(2)
    // NEWEST ADDED FIRST — `receiptsNewestFirst`, the same comparator the
    // Receipts tab itself uses, not a second, unordered rendering.
    await expect(cards.nth(0)).toContainText(capturedImageName(secondNow))
    await expect(cards.nth(1)).toContainText(capturedImageName(PINNED_NOW))
  })
})
