import { expect, test } from '@playwright/test'
import {
  DATE_RANGES,
  RECEIPT_FILTER_ALL,
  RECEIPT_FILTER_APPLIED,
  RECEIPT_LINK_STATES,
  clearReceiptFacet,
  filterReceipts,
  isReceiptFacetDefault,
  receiptFilterChips,
  receiptsNow,
} from '../src/data/derive'
import { RECEIPTS } from '../src/data/receipts'
import type { Receipt } from '../src/data/types'
import { PINNED_NOW, activateTab, gotoRoute } from './harness'
import { RECEIPTS_TAB, openReceiptFilter } from './capture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RECEIPTS FILTER (Gate 80-B).
 *
 * Flow 9 shipped this tab with the filter ICON wired to nothing — a real
 * `<button>` with a real accessible name and no `onClick` at all — and with two
 * DECORATIVE chips and a "Sort by" pair sitting inline on the page, pushing
 * "Add new receipt" down the screen. This spec covers the model and the wiring
 * that replaced all of that.
 *
 * TWO HALVES, the shape `receipt-order.spec.ts` already uses. The Node tests
 * assert the RULES against the real seed and against invented records; the
 * browser tests assert the WIRING through real controls only.
 *
 * NO RECEIPT TEXT IS INVENTED. Every invented record is a seeded one with its
 * dates or its link replaced.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ───────────────────────────────────────────────────────────── the rules ── */

test.describe('the rules', () => {
  test('the cleared filter returns every receipt, and both facets report themselves defaulted', () => {
    expect(filterReceipts(RECEIPTS, '', RECEIPT_FILTER_ALL)).toHaveLength(RECEIPTS.length)
    expect(isReceiptFacetDefault(RECEIPT_FILTER_ALL, 'date')).toBe(true)
    expect(isReceiptFacetDefault(RECEIPT_FILTER_ALL, 'link')).toBe(true)
    // AND THE ROW IS EMPTY, which is what `:empty { display: none }` acts on.
    expect(receiptFilterChips(RECEIPT_FILTER_ALL)).toEqual([])
  })

  test('the date facet is anchored to the newest printed date, NOT to TODAY — which would match nothing', () => {
    /*
      THE MEASUREMENT THAT DECIDED THE ANCHOR, as an executable assertion.

      The harness pins the app clock to 2026-08-15 while every seeded receipt is
      printed Aug-Sept 2025, so "This Month" measured against `TODAY` matches
      ZERO of the ten: correct, useless, and indistinguishable from a broken
      predicate. That is Gate 41's finding about `ledgerNow`, re-measured here
      for a second collection rather than carried across.
    */
    const anchor = receiptsNow(RECEIPTS)
    expect(anchor.getFullYear()).toBe(2025)
    expect(anchor.getMonth()).toBe(8) // September, 0-indexed

    // The anchor is a YEAR behind the pinned clock. If this ever stops being
    // true the seed moved, and the numbers below must be re-derived.
    expect(anchor.getFullYear()).toBeLessThan(PINNED_NOW.getFullYear())
    const inPinnedMonth = RECEIPTS.filter(
      (r) =>
        new Date(r.capturedAt).getFullYear() === PINNED_NOW.getFullYear() &&
        new Date(r.capturedAt).getMonth() === PINNED_NOW.getMonth(),
    )
    expect(inPinnedMonth).toHaveLength(0)

    // Against the real anchor all four windows are live. 10 / 8 / 3 / 10.
    const count = (id: (typeof DATE_RANGES)[number]['id']) =>
      filterReceipts(RECEIPTS, '', { ...RECEIPT_FILTER_ALL, dateRange: id }).length
    expect(count('all')).toBe(10)
    expect(count('this-month')).toBe(8)
    expect(count('last-7')).toBe(3)
    expect(count('last-30')).toBe(10)
  })

  test('the link facet splits on transactionId, and null is the reachable half', () => {
    const linked = (id: (typeof RECEIPT_LINK_STATES)[number]['id']) =>
      filterReceipts(RECEIPTS, '', { ...RECEIPT_FILTER_ALL, linkState: id })

    // ALL TEN SEEDED RECEIPTS ARE LINKED. Asserted rather than assumed, because
    // every other number in this test is relative to it.
    expect(RECEIPTS.filter((r) => r.transactionId === null)).toHaveLength(0)
    expect(linked('all')).toHaveLength(10)
    expect(linked('linked')).toHaveLength(10)
    expect(linked('unlinked')).toHaveLength(0)

    // AND THE OTHER HALF IS REACHABLE — the state the viewer's Unlink writes.
    const unlinked: Receipt = { ...RECEIPTS[0], id: 'r-unlinked', transactionId: null }
    const mixed = [...RECEIPTS, unlinked]
    expect(filterReceipts(mixed, '', { ...RECEIPT_FILTER_ALL, linkState: 'unlinked' })).toEqual([
      unlinked,
    ])
    expect(
      filterReceipts(mixed, '', { ...RECEIPT_FILTER_ALL, linkState: 'linked' }),
    ).toHaveLength(10)
  })

  test('a facet at its default renders no chip; one away from it renders exactly one', () => {
    expect(receiptFilterChips({ ...RECEIPT_FILTER_ALL, dateRange: 'last-7' })).toEqual([
      { facet: 'date', label: 'Last 7 Days' },
    ])
    expect(receiptFilterChips({ ...RECEIPT_FILTER_ALL, linkState: 'linked' })).toEqual([
      { facet: 'link', label: 'Linked' },
    ])
    // BOTH, IN FACET ORDER — date then link, which is the order the row renders
    // and the order `[overlay:applied]` photographs.
    expect(receiptFilterChips(RECEIPT_FILTER_APPLIED)).toEqual([
      { facet: 'date', label: 'This Month' },
      { facet: 'link', label: 'Unlinked' },
    ])
  })

  test('clearing a facet restores it from RECEIPT_FILTER_ALL and leaves the other alone', () => {
    const both = RECEIPT_FILTER_APPLIED
    const noDate = clearReceiptFacet(both, 'date')
    expect(noDate.dateRange).toBe(RECEIPT_FILTER_ALL.dateRange)
    expect(noDate.linkState).toBe(both.linkState)

    const noLink = clearReceiptFacet(both, 'link')
    expect(noLink.linkState).toBe(RECEIPT_FILTER_ALL.linkState)
    expect(noLink.dateRange).toBe(both.dateRange)

    // `isReceiptFacetDefault` IS DERIVED FROM THIS, so the two cannot disagree
    // about what cleared means.
    expect(isReceiptFacetDefault(noDate, 'date')).toBe(true)
    expect(isReceiptFacetDefault(noDate, 'link')).toBe(false)
  })

  test('the demonstration filter puts two chips on the row and matches nothing, and each facet excludes alone', () => {
    // BOTH FACETS LOAD-BEARING: neither is masked by the other, so a facet that
    // silently stopped working changes the count.
    expect(
      filterReceipts(RECEIPTS, '', { ...RECEIPT_FILTER_ALL, dateRange: 'this-month' }),
    ).toHaveLength(8)
    expect(
      filterReceipts(RECEIPTS, '', { ...RECEIPT_FILTER_ALL, linkState: 'unlinked' }),
    ).toHaveLength(0)
    expect(filterReceipts(RECEIPTS, '', RECEIPT_FILTER_APPLIED)).toHaveLength(0)
    expect(receiptFilterChips(RECEIPT_FILTER_APPLIED)).toHaveLength(2)
  })

  test('the search needle and the filter compose — both are applied, neither replaces the other', () => {
    const ikea = RECEIPTS.filter((r) => r.merchant === 'IKEA')
    expect(ikea.length).toBeGreaterThan(1)

    // Search alone.
    expect(filterReceipts(RECEIPTS, 'ikea')).toHaveLength(ikea.length)

    // Search AND a date window. The IKEA receipts straddle the month boundary —
    // asserted, because that is what makes this test discriminate at all.
    const ikeaThisMonth = ikea.filter(
      (r) => r.capturedAt.slice(0, 7) === '2025-09',
    )
    expect(ikeaThisMonth.length).toBeGreaterThan(0)
    expect(ikeaThisMonth.length).toBeLessThan(ikea.length)
    expect(
      filterReceipts(RECEIPTS, 'ikea', { ...RECEIPT_FILTER_ALL, dateRange: 'this-month' }),
    ).toHaveLength(ikeaThisMonth.length)
  })
})

/* ──────────────────────────────────────────────────────────── the wiring ── */

test.describe('the wiring', () => {
  test('the filter icon opens the sheet — the defect Gate 80-B fixes', async ({ page }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)

    // NOTHING IS OPEN YET, so the assertion below cannot pass vacuously.
    await expect(page.getByRole('dialog', { name: 'Filter receipts' })).toHaveCount(0)

    const sheet = await openReceiptFilter(page)

    // THREE GROUPS, NAMED. `legend` is what gives an `aria-pressed` chip row an
    // accessible group name, so this also asserts the markup rather than only
    // the copy.
    await expect(sheet.locator('.mvp-receipt-filter__legend')).toHaveText([
      'Date Range',
      'Link Status',
      'Sort by',
    ])
    // 4 date + 3 link + 2 sort.
    await expect(sheet.locator('.mn-toggle-chip')).toHaveCount(
      DATE_RANGES.length + RECEIPT_LINK_STATES.length + 2,
    )
    await expect(sheet.getByRole('button', { name: 'Reset' })).toBeVisible()
    await expect(sheet.locator('.mn-sheet__actions .mn-btn')).toHaveText(
      'Apply Filter · 10 results',
    )
  })

  test('the chip row is empty at rest and takes no space, so the add button sits directly under the search field', async ({
    page,
  }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)

    const row = page.locator('.mvp-receipts__chips')
    await expect(row.locator('li')).toHaveCount(0)
    // `display: none` RATHER THAN A ZERO HEIGHT — the only spelling that takes
    // the parent's 8px flex gap with it.
    await expect(row).toBeHidden()

    const geometry = await page.evaluate(() => {
      const box = (s: string) => {
        const el = document.querySelector(s)
        return el ? el.getBoundingClientRect() : null
      }
      const search = box('.mvp-receipts__search')!
      const add = box('.mvp-receipts__add')!
      return {
        gap: Math.round(add.top - search.bottom),
        chipsDisplay: getComputedStyle(
          document.querySelector('.mvp-receipts__chips')!,
        ).display,
      }
    })
    expect(geometry.chipsDisplay).toBe('none')
    // 8px parent gap + the add row's own 16px margin-top, and NOT one pixel of
    // chip row or sort fieldset. Before Gate 80-B this measured 134.
    expect(geometry.gap).toBe(24)
  })

  test('applying a filter draws its chips, and dismissing one clears exactly that facet', async ({
    page,
  }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)

    const sheet = await openReceiptFilter(page)
    await sheet.locator('.mn-toggle-chip:has-text("Last 7 Days")').click()
    /*
      `exact: true` ON THE ACCESSIBLE NAME, NOT `:has-text` — measured.

      `:has-text()` is a SUBSTRING match, so `:has-text("Linked")` resolves to
      BOTH the "Linked" and the "Unlinked" chip and fails strict mode. That is
      the other half of Gate 44's selector finding: `:text-is` returns zero on a
      `ToggleChip` because the label sits in a child <span>, and `:has-text` is
      over-broad whenever one chip's label contains another's. This facet is the
      first place in the app where that pair exists.
    */
    await sheet.getByRole('button', { name: 'Linked', exact: true }).click()
    const apply = sheet.locator('.mn-sheet__actions .mn-btn')
    // 3 receipts in the last 7 days, all of them linked.
    await expect(apply).toHaveText('Apply Filter · 3 results')
    await apply.click()
    await expect(sheet).toBeHidden()

    const row = page.locator('.mvp-receipts__chips')
    await expect(row).toBeVisible()
    await expect(row.locator('.mn-filter-chip')).toHaveCount(2)
    await expect(row).toHaveText('Last 7 DaysLinked')
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(3)

    // DISMISS THE DATE CHIP ONLY. The link chip must survive, which is what a
    // per-facet key buys over an index.
    await row
      .locator('li:has-text("Last 7 Days")')
      .getByRole('button')
      .click()
    await expect(row.locator('.mn-filter-chip')).toHaveCount(1)
    await expect(row).toHaveText('Linked')
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(10)

    // DISMISSING THE LAST CHIP EMPTIES THE ROW and hides it again.
    await row.locator('li').getByRole('button').click()
    await expect(row.locator('li')).toHaveCount(0)
    await expect(row).toBeHidden()
  })

  test('Reset restores both facets AND the sort, and writes only the draft', async ({
    page,
  }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)

    const sheet = await openReceiptFilter(page)
    await sheet.locator('.mn-toggle-chip:has-text("This Month")').click()
    await sheet.locator('.mn-toggle-chip:has-text("Unlinked")').click()
    await sheet.locator('.mn-toggle-chip:has-text("Receipt date")').click()
    await expect(sheet.locator('.mn-sheet__actions .mn-btn')).toHaveText(
      'Apply Filter · No results',
    )

    await sheet.getByRole('button', { name: 'Reset' }).click()

    // ALL THREE GROUPS ARE BACK AT THEIR DEFAULTS — the sort included, because
    // Reset sits above every group in the sheet.
    await expect(sheet.locator('.mn-toggle-chip[aria-pressed="true"]')).toHaveText([
      'All Time',
      'All',
      'Date added',
    ])
    await expect(sheet.locator('.mn-sheet__actions .mn-btn')).toHaveText(
      'Apply Filter · 10 results',
    )

    // RESET WROTE THE DRAFT, NOT THE SCREEN. Nothing was in force before, so the
    // list behind the scrim is untouched either way — asserted after applying so
    // the reset is observed through the screen rather than only through the sheet.
    await sheet.locator('.mn-sheet__actions .mn-btn').click()
    await expect(page.locator('.mvp-receipts__chips').locator('li')).toHaveCount(0)
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(10)
  })

  test('dismissing the sheet discards the pending edit', async ({ page }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)

    const sheet = await openReceiptFilter(page)
    await sheet.locator('.mn-toggle-chip:has-text("Last 7 Days")').click()
    await expect(sheet.locator('.mn-sheet__actions .mn-btn')).toHaveText(
      'Apply Filter · 3 results',
    )

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()

    // NOTHING APPLIED, so no chip and no narrowing.
    await expect(page.locator('.mvp-receipts__chips').locator('li')).toHaveCount(0)
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(10)

    // AND THE DRAFT WAS DISCARDED RATHER THAN REMEMBERED — a fresh mount re-seeds
    // from the applied filter, which is why the sheet is mounted conditionally.
    const reopened = await openReceiptFilter(page)
    await expect(reopened.locator('.mn-sheet__actions .mn-btn')).toHaveText(
      'Apply Filter · 10 results',
    )
    await expect(reopened.locator('.mn-toggle-chip[aria-pressed="true"]')).toHaveText([
      'All Time',
      'All',
      'Date added',
    ])
  })

  test('the filter and the search box compose on screen, and the count the button promised is the count delivered', async ({
    page,
  }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)

    await page.getByRole('textbox', { name: 'Search receipts' }).fill('ikea')
    const ikea = RECEIPTS.filter((r) => r.merchant === 'IKEA').length
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(ikea)

    // THE BUTTON'S N INCLUDES THE LIVE SEARCH, which is the whole reason it is
    // the same call the screen makes.
    const sheet = await openReceiptFilter(page)
    await expect(sheet.locator('.mn-sheet__actions .mn-btn')).toHaveText(
      `Apply Filter · ${ikea} results`,
    )

    await sheet.locator('.mn-toggle-chip:has-text("This Month")').click()
    const expected = RECEIPTS.filter(
      (r) => r.merchant === 'IKEA' && r.capturedAt.slice(0, 7) === '2025-09',
    ).length
    const apply = sheet.locator('.mn-sheet__actions .mn-btn')
    await expect(apply).toHaveText(
      `Apply Filter · ${expected} ${expected === 1 ? 'result' : 'results'}`,
    )
    await apply.click()

    // PROMISED AND DELIVERED AGREE.
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(expected)
  })
})
