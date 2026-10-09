import { expect, test } from '@playwright/test'
import {
  DATE_RANGES,
  RECEIPT_FILTER_ALL,
  RECEIPT_FILTER_APPLIED,
  TRANSACTION_FILTER_ALL,
  TRANSACTION_METHODS,
  filterReceipts,
  filterTransactions,
} from '../src/data/derive'
import { RECEIPTS } from '../src/data/receipts'
import { TRANSACTIONS } from '../src/data/transactions'
import { activateTab, gotoRoute } from './harness'
import {
  RECEIPTS_TAB,
  TRANSACTIONS_TAB,
  applySheetChips,
  openReceiptFilter,
  openTransactionFilter,
} from './capture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE NO-RESULTS STATE (Gate 80-C).
 *
 * Before this gate, a filter that excluded every row rendered NOTHING on either
 * filtered list. Measured on the `[tab:receipts] [overlay:applied]` walk state
 * at 375: zero `.mvp-receipts__month` sections, the root box ending at y=326,
 * and 403px of blank space down to the nav band — with the chips and the add
 * button above it and no statement anywhere that the filter was the cause.
 *
 * ONE COMPONENT, TWO SURFACES. `NoResults` is wired to the Receipts tab and to
 * the ledger, with the copy parameterised and the structure not.
 *
 * ONE THEME, DELIBERATELY. Whether a block is in the DOM, whether the chips
 * survive beside it and whether an action restores the list are not colour
 * facts, and no rule in either repo makes any of them conditional on
 * `[data-theme]`. `receipt-glyph.spec.ts` records the same reasoning for the
 * same reason. The four `[overlay:empty]` baselines and the four re-minted
 * `[tab:receipts] [overlay:applied]` ones cover the rendering in both themes.
 *
 * THE RULES HALF RUNS IN NODE, the shape `receipt-filter.spec.ts` and
 * `receipt-order.spec.ts` already use: it pins the PREMISES the two walk states
 * depend on, so a seed change that made either state stop being a zero result
 * fails here by name instead of silently minting a baseline of a populated list.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The block, its three parts, and the chip row that must survive beside it. */
const BLOCK = '.mvp-no-results'

/* ───────────────────────────────────────────────────── the premises ── */

test.describe('the premises the two walk states rest on', () => {
  test('the ledger can be filtered to nothing through the FACETS ALONE, with no search term', () => {
    /*
      THE MEASUREMENT THAT CHOSE THE LADDER, as an executable assertion.

      `[overlay:empty]` reaches zero in two chip taps and types nothing, which is
      what keeps it a test of the FILTER rather than of the search box. That is
      only possible because the facets alone can reach zero over this seed — so
      the sweep that established it is pinned here rather than described in a
      comment.
    */
    const zeroPairs: string[] = []
    for (const range of DATE_RANGES) {
      for (const method of TRANSACTION_METHODS) {
        const n = filterTransactions(
          TRANSACTIONS,
          { ...TRANSACTION_FILTER_ALL, dateRange: range.id, methods: [method] },
          '',
        ).length
        if (n === 0) zeroPairs.push(`${range.id} + ${method}`)
      }
    }
    expect(zeroPairs).toContain('this-month + Fund Transfer')

    // AND THE TWO RUNGS OF THE LADDER, each asserted as the harness asserts the
    // Apply button's own text. A rung that stopped changing the count would mint
    // a baseline of a filter nobody asked for.
    const unfiltered = filterTransactions(TRANSACTIONS, TRANSACTION_FILTER_ALL, '')
    const afterDate = filterTransactions(
      TRANSACTIONS,
      { ...TRANSACTION_FILTER_ALL, dateRange: 'this-month' },
      '',
    )
    const afterType = filterTransactions(
      TRANSACTIONS,
      { ...TRANSACTION_FILTER_ALL, dateRange: 'this-month', methods: ['Fund Transfer'] },
      '',
    )
    expect([unfiltered.length, afterDate.length, afterType.length]).toEqual([254, 9, 0]) // Gate 82: was [53, 2, 0]
  })

  test('the receipts applied filter matches nothing, which is what makes its state a zero result', () => {
    /*
      `[tab:receipts] [overlay:applied]` has applied This Month + Unlinked since
      Gate 80-B, and that combination matching ZERO is the whole reason its four
      baselines move at this gate. All ten seeded receipts ship LINKED, so the
      link facet alone excludes every one of them — which is also why no
      two-facet receipts filter can demonstrate a non-empty narrowing.
    */
    // THE SHIPPED CONSTANT, NOT A RECONSTRUCTION OF IT.
    // `RECEIPT_FILTER_APPLIED` IS This Month + Unlinked, and it is what the walk
    // state applies, so asserting a hand-built lookalike here would pin a
    // premise the state does not actually rest on.
    expect(filterReceipts(RECEIPTS, '', RECEIPT_FILTER_APPLIED)).toHaveLength(0)
    expect(RECEIPT_FILTER_APPLIED.dateRange).toBe('this-month')
    expect(RECEIPT_FILTER_APPLIED.linkState).toBe('unlinked')
    expect(filterReceipts(RECEIPTS, '', RECEIPT_FILTER_ALL)).toHaveLength(10)
  })
})

/* ───────────────────────────────────────────────────────── the wiring ── */

test.describe('the wiring', () => {
  test('the RECEIPTS tab renders the block, and the chips and the add control survive beside it', async ({
    page,
  }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)

    // The control is there before the filter, and the block is not.
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(10)
    await expect(page.locator(BLOCK)).toHaveCount(0)

    await applySheetChips(await openReceiptFilter(page), ['This Month', 'Unlinked'])

    await expect(page.locator('.mvp-receipt-card')).toHaveCount(0)
    await expect(page.locator('.mvp-receipts__month')).toHaveCount(0)

    const block = page.locator(BLOCK)
    await expect(block).toBeVisible()
    await expect(block.locator('h2')).toHaveText('No receipts match')
    await expect(block.locator('p')).toHaveText(
      'Try a wider date range, or dismiss a filter above.',
    )
    await expect(block.getByRole('button')).toHaveText('Show all receipts')

    /*
      THE CHIPS STAY, WHICH IS WHAT MAKES THE ZERO EXPLAINABLE. Two chips and
      only two — the row is derived from the filter, so this text is
      simultaneously the proof that the filter is in force and that a user can
      see which facets caused the empty list.
    */
    await expect(page.locator('.mvp-receipts__chips')).toHaveText('This MonthUnlinked')

    // AND THE ADD CONTROL STAYS. Nothing about a zero result makes adding a
    // receipt unavailable, and Gate 51 put that button outside every month group
    // precisely so it survives an emptied list.
    await expect(page.getByRole('button', { name: 'Add new receipt' })).toBeVisible()
  })

  test('the LEDGER renders the block, and the chips survive beside it', async ({ page }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, TRANSACTIONS_TAB)

    await expect(page.locator('.mvp-transactions__list > li')).toHaveCount(254)
    await expect(page.locator(BLOCK)).toHaveCount(0)

    await applySheetChips(await openTransactionFilter(page), [
      'This Month',
      'Fund Transfer',
    ])

    await expect(page.locator('.mvp-transactions__list > li')).toHaveCount(0)

    const block = page.locator(BLOCK)
    await expect(block).toBeVisible()
    await expect(block.locator('h2')).toHaveText('No transactions match')
    await expect(block.locator('p')).toHaveText(
      'Try a wider date range or amount, or dismiss a filter above.',
    )
    await expect(block.getByRole('button')).toHaveText('Show all transactions')

    // Facet order is type, date, payee, amount (`filterChips`), and the payee and
    // amount facets are at their defaults so Gate 44 suppresses them.
    await expect(page.locator('.mvp-transactions__chips')).toHaveText(
      'Fund TransferThis Month',
    )
  })

  test('THE COPY IS PARAMETERISED PER SURFACE and the structure is not', async ({ page }) => {
    /*
      The two surfaces must differ in their three strings and in NOTHING ELSE —
      same mark, same heading level, same element order, same action placement.
      Asserted by reading both renders and comparing them, rather than by
      restating the structure twice.
    */
    const shapeOf = async () =>
      page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement
        const button = el.querySelector('button') as HTMLElement
        return {
          // STRUCTURE — must match across the two surfaces.
          children: Array.from(el.children).map((c) => c.tagName),
          badge: el.querySelector('.mn-icon-object')?.className ?? '(none)',
          glyphs: el.querySelectorAll('svg').length,
          headingTag: el.querySelector('h2') ? 'H2' : '(none)',
          buttonClass: button.className,
          gap: getComputedStyle(el).gap,
          padding: getComputedStyle(el).padding,
          textAlign: getComputedStyle(el).textAlign,
          // COPY — must differ.
          title: el.querySelector('h2')?.textContent ?? '',
          action: button.textContent ?? '',
        }
      }, BLOCK)

    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)
    await applySheetChips(await openReceiptFilter(page), ['This Month', 'Unlinked'])
    const receipts = await shapeOf()

    await activateTab(page, TRANSACTIONS_TAB)
    await applySheetChips(await openTransactionFilter(page), [
      'This Month',
      'Fund Transfer',
    ])
    const ledger = await shapeOf()

    // THE STRUCTURE IS IDENTICAL, field by field.
    expect(ledger.children).toEqual(receipts.children)
    expect(ledger.badge).toBe(receipts.badge)
    expect(ledger.glyphs).toBe(receipts.glyphs)
    expect(ledger.headingTag).toBe(receipts.headingTag)
    expect(ledger.buttonClass).toBe(receipts.buttonClass)
    expect(ledger.gap).toBe(receipts.gap)
    expect(ledger.padding).toBe(receipts.padding)
    expect(ledger.textAlign).toBe(receipts.textAlign)

    // AND THE COPY IS NOT.
    expect(receipts.title).toBe('No receipts match')
    expect(ledger.title).toBe('No transactions match')
    expect(receipts.action).toBe('Show all receipts')
    expect(ledger.action).toBe('Show all transactions')
  })

  test('the recovery action restores the whole RECEIPTS library', async ({ page }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)
    await applySheetChips(await openReceiptFilter(page), ['This Month', 'Unlinked'])
    await expect(page.locator(BLOCK)).toBeVisible()

    await page.getByRole('button', { name: 'Show all receipts' }).click()

    await expect(page.locator(BLOCK)).toHaveCount(0)
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(10)
    // THE CHIP ROW EMPTIES WITH IT, which is the proof the facets really went
    // back to their defaults rather than the list being restored some other way.
    await expect(page.locator('.mvp-receipts__chips').locator('li')).toHaveCount(0)
  })

  test('the recovery action restores the whole LEDGER', async ({ page }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, TRANSACTIONS_TAB)
    await applySheetChips(await openTransactionFilter(page), [
      'This Month',
      'Fund Transfer',
    ])
    await expect(page.locator(BLOCK)).toBeVisible()

    await page.getByRole('button', { name: 'Show all transactions' }).click()

    await expect(page.locator(BLOCK)).toHaveCount(0)
    await expect(page.locator('.mvp-transactions__list > li')).toHaveCount(254)
    await expect(page.locator('.mvp-transactions__chips').locator('li')).toHaveCount(0)
  })

  test('THE ACTION CLEARS THE SEARCH TERM AS WELL AS THE FACETS, so it always recovers', async ({
    page,
  }) => {
    /*
      THE PROPERTY THAT NAMED THE BUTTON. `filterTransactions` takes the facet
      set and the search term as SEPARATE arguments, so either can produce a zero
      result alone — and an action that cleared only the facets could leave the
      user still looking at nothing, which is not a recovery action.

      Both are in force here, and both must go. That is also why the label names
      its OUTCOME ("Show all transactions") rather than a mechanism it exceeds
      ("Clear filters").
    */
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, TRANSACTIONS_TAB)

    const search = page.getByRole('textbox', { name: 'Search transactions' })
    await search.fill('Aeon')
    await applySheetChips(await openTransactionFilter(page), ['Crypto Transfer'])

    // A ZERO CAUSED BY THE TWO TOGETHER: Aeon Big has card payments, and the
    // crypto rows are not Aeon Big, so neither narrowing is empty by itself.
    await expect(page.locator(BLOCK)).toBeVisible()

    await page.getByRole('button', { name: 'Show all transactions' }).click()

    await expect(page.locator(BLOCK)).toHaveCount(0)
    await expect(search).toHaveValue('')
    await expect(page.locator('.mvp-transactions__chips').locator('li')).toHaveCount(0)
    await expect(page.locator('.mvp-transactions__list > li')).toHaveCount(254)
  })

  test('a SEARCH-ONLY zero renders the block too, with no facet in force', async ({
    page,
  }) => {
    /*
      THE BLOCK IS NOT FACET-SPECIFIC. The chip row is empty here, so this is the
      one case where the state is reachable with nothing to dismiss above it —
      which is why the description points at a wider date range as well as at the
      chips, and why the action is named after its outcome.
    */
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, TRANSACTIONS_TAB)

    await page.getByRole('textbox', { name: 'Search transactions' }).fill('zzzznothing')

    await expect(page.locator('.mvp-transactions__list > li')).toHaveCount(0)
    await expect(page.locator(BLOCK)).toBeVisible()
    await expect(page.locator('.mvp-transactions__chips').locator('li')).toHaveCount(0)

    await page.getByRole('button', { name: 'Show all transactions' }).click()
    await expect(page.locator('.mvp-transactions__list > li')).toHaveCount(254)
  })

  test('THE LIVE REGION IS ON THE BLOCK AND NOT ON THE LIST', async ({ page }) => {
    /*
      A live region announces ADDITIONS to its subtree, so wrapping the results
      region would make going from zero back to everything announce all 53 rows —
      the filter change a user makes most often, turned into the longest possible
      utterance. The transition TO zero is the thing worth announcing.

      ASSERTED IN BOTH DIRECTIONS: the block carries the region, and NO ancestor
      of the list does. The second half is what would catch someone "finishing
      the job" by moving the attribute onto the results region.
    */
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, TRANSACTIONS_TAB)

    const liveAncestorsOfList = await page.evaluate(() => {
      const list = document.querySelector('.mvp-transactions__list')
      const found: string[] = []
      for (let el = list; el; el = el.parentElement) {
        if (el.hasAttribute('aria-live') || el.getAttribute('role') === 'status') {
          found.push(el.className || el.tagName)
        }
      }
      return found
    })
    expect(liveAncestorsOfList).toEqual([])

    await applySheetChips(await openTransactionFilter(page), [
      'This Month',
      'Fund Transfer',
    ])

    const block = page.locator(BLOCK)
    await expect(block).toHaveAttribute('role', 'status')
    await expect(block).toHaveAttribute('aria-live', 'polite')
  })
})
