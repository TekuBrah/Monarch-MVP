import { expect, test, type Page } from '@playwright/test'
import { activateTab, gotoRoute } from './harness'
import {
  RECEIPTS_TAB,
  TRANSACTIONS_TAB,
  glyphRowCount,
  installResolvingExtraction,
  openDialogNames,
  printedMagnitude,
  saveOneCapture,
} from './capture'
import { RECEIPTS } from '../src/data/receipts'
import { TRANSACTIONS } from '../src/data/transactions'
import type { Transaction } from '../src/data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RECEIPT VIEWER, ITS TWO WRITES, AND THE SCREEN-LEVEL ADD (Gate 51).
 *
 * THE THREE WALK STATES PROVE THE VIEWER RENDERS — linked, unlinked, and under
 * its delete confirmation. They cannot prove what a write does to a DIFFERENT
 * screen, or that Cancel wrote nothing: a screenshot is one instant of one
 * state. That is what this file is for, the same division `unlink.spec.ts`
 * drew at Gate 49.
 *
 * NO BASELINE. Light theme and the default viewport only: neither changes what
 * a write does, and the two-viewport axis is `visual.spec.ts`'s alone (Gate A).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The receipt the viewer walk states open, and the row it is linked to. */
const VIEWED = RECEIPTS.find((r) => r.id === 'receipt-aeonbig01')!
const VIEWED_ROW = TRANSACTIONS.find((t) => t.id === VIEWED.transactionId)!
const VIEWED_AMOUNT = printedMagnitude(VIEWED_ROW.amount)

const cards = (page: Page) => page.locator('.mvp-receipt-card')
const cardFor = (page: Page, displayName: string) =>
  page.locator(`.mvp-receipt-card:has-text("${displayName}")`)
const ledgerRow = (page: Page, amount: string) =>
  page.locator(`.mvp-transactions__list > li:has-text("${amount}")`)

/** Open the viewer by tapping a card — the Receipts-tab entry point. */
async function openFromCard(page: Page, displayName: string) {
  const card = cardFor(page, displayName)
  await expect(card).toHaveCount(1)
  await expect(card, 'the card is a button named by its file').toHaveAccessibleName(displayName)
  await card.click()
  await expect.poll(() => openDialogNames(page)).toEqual([displayName])
  return page.getByRole('dialog', { name: displayName })
}

/** The newest receipt-less merchant OUTFLOW in the seed — derived, not typed. */
function receiptLessRow(): Transaction {
  const linked = new Set(RECEIPTS.map((r) => r.transactionId))
  const [newest] = TRANSACTIONS.filter(
    (t) => !linked.has(t.id) && t.amount < 0 && t.logo.kind === 'merchant',
  ).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  if (!newest) throw new Error('the seed has no receipt-less merchant outflow')
  return newest
}

test.describe('the receipt viewer — entry points', () => {
  test('opens from a Receipts-tab card, in its linked state', async ({ page }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)
    const viewer = await openFromCard(page, VIEWED.displayName)

    await expect(viewer.locator('img.mvp-receipt-viewer__image')).toHaveAttribute(
      'src',
      new RegExp(`${VIEWED.filename.replace('.', '\\.')}$`),
    )
    await expect(viewer.getByText('Linked', { exact: true })).toHaveCount(1)
    const row = viewer.locator('.mn-list-item')
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(VIEWED_ROW.merchant)
    await expect(row).toContainText(`-${VIEWED_AMOUNT}`)
    await expect(viewer.getByRole('button', { name: 'Unlink receipt' })).toHaveCount(1)
    await expect(viewer.getByRole('button', { name: 'Delete receipt' })).toHaveCount(1)
  })

  test('opens from "View" in the detail sheet, REPLACING the sheet', async ({ page }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, TRANSACTIONS_TAB)
    await ledgerRow(page, VIEWED_AMOUNT).locator('.mn-list-item').click()
    await expect.poll(() => openDialogNames(page)).toEqual(['Transaction details'])

    await page
      .getByRole('dialog', { name: 'Transaction details' })
      .getByRole('button', { name: 'View' })
      .click()

    // ONE SURFACE AT A TIME (ruling 7). The list is exactly the viewer — the
    // sheet did not stay open underneath it.
    await expect.poll(() => openDialogNames(page)).toEqual([VIEWED.displayName])

    await page.getByRole('dialog', { name: VIEWED.displayName }).getByRole('button', { name: 'Close' }).click()
    await expect.poll(() => openDialogNames(page), 'closing returns to the ledger').toEqual([])
    await expect(page.locator('.mvp-transactions__list > li')).toHaveCount(TRANSACTIONS.length)
  })
})

test.describe('the receipt viewer — Unlink', () => {
  test('flips the viewer in place and clears the row glyph, not its amount', async ({ page }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)
    const viewer = await openFromCard(page, VIEWED.displayName)

    await viewer.getByRole('button', { name: 'Unlink receipt' }).click()

    // THE UNLINKED STATE, AND THE VIEWER IS STILL OPEN.
    await expect.poll(() => openDialogNames(page)).toEqual([VIEWED.displayName])
    await expect(viewer.getByText('Linked', { exact: true })).toHaveCount(0)
    await expect(viewer.locator('.mn-list-item')).toHaveCount(0)
    await expect(viewer.getByRole('button', { name: 'Unlink receipt' })).toHaveCount(0)
    await expect(viewer.getByRole('button', { name: 'Delete receipt' })).toHaveCount(1)

    await viewer.getByRole('button', { name: 'Close' }).click()
    await expect(cardFor(page, VIEWED.displayName).locator('.mn-chips')).toHaveCount(0)

    await activateTab(page, TRANSACTIONS_TAB)
    expect(await glyphRowCount(page)).toBe(RECEIPTS.length - 1)
    const row = ledgerRow(page, VIEWED_AMOUNT)
    await expect(row.locator('.mn-list-item__amount-row svg')).toHaveCount(0)
    await expect(row).toContainText(`-${VIEWED_AMOUNT}`)
  })
})

test.describe('the receipt viewer — Delete', () => {
  test('Cancel deletes nothing and leaves the viewer open, unchanged', async ({ page }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)
    const viewer = await openFromCard(page, VIEWED.displayName)

    await viewer.getByRole('button', { name: 'Delete receipt' }).click()
    await expect
      .poll(() => openDialogNames(page), 'Delete asks first — over the viewer, not instead of it')
      .toEqual([VIEWED.displayName, 'Delete receipt?'])
    const confirm = page.getByRole('dialog', { name: 'Delete receipt?' })
    await expect(confirm).toContainText(
      "This removes the receipt and its image from your library. It can't be undone.",
    )

    await confirm.getByRole('button', { name: 'Cancel' }).click()

    await expect.poll(() => openDialogNames(page)).toEqual([VIEWED.displayName])
    await expect(viewer.getByText('Linked', { exact: true })).toHaveCount(1)
    await expect(viewer.getByRole('button', { name: 'Unlink receipt' })).toHaveCount(1)
    await expect(page.locator('.mvp-finance-detail__toast'), 'no toast for a cancel').toHaveCount(0)

    await viewer.getByRole('button', { name: 'Close' }).click()
    await expect(cards(page), 'nothing left the library').toHaveCount(RECEIPTS.length)
    await expect(cardFor(page, VIEWED.displayName).locator('.mn-chips')).toHaveText('Linked')
  })

  test('confirming closes the modal and the viewer, then toasts', async ({ page }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)
    const viewer = await openFromCard(page, VIEWED.displayName)
    await viewer.getByRole('button', { name: 'Delete receipt' }).click()
    await page
      .getByRole('dialog', { name: 'Delete receipt?' })
      .getByRole('button', { name: 'Delete', exact: true })
      .click()

    await expect.poll(() => openDialogNames(page), 'both surfaces closed').toEqual([])
    const toast = page.locator('.mvp-finance-detail__toast [role="status"]')
    await expect(toast).toHaveCount(1)
    await expect(toast).toHaveText('Receipt deleted.')

    await toast.getByRole('button', { name: 'Dismiss' }).click()
    await expect(page.locator('.mvp-finance-detail__toast')).toHaveCount(0)
  })

  test('a linked receipt leaves the library; its row loses the glyph, keeps its amount, and a later Save does not relink it', async ({
    page,
  }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)
    await expect(cards(page)).toHaveCount(RECEIPTS.length)

    const viewer = await openFromCard(page, VIEWED.displayName)
    await viewer.getByRole('button', { name: 'Delete receipt' }).click()
    await page
      .getByRole('dialog', { name: 'Delete receipt?' })
      .getByRole('button', { name: 'Delete', exact: true })
      .click()
    await expect.poll(() => openDialogNames(page)).toEqual([])

    await expect(cards(page)).toHaveCount(RECEIPTS.length - 1)
    await expect(cardFor(page, VIEWED.displayName)).toHaveCount(0)

    await activateTab(page, TRANSACTIONS_TAB)
    await expect(page.locator('.mvp-transactions__list > li'), 'no row was removed').toHaveCount(
      TRANSACTIONS.length,
    )
    expect(await glyphRowCount(page)).toBe(RECEIPTS.length - 1)
    const row = ledgerRow(page, VIEWED_AMOUNT)
    await expect(row.locator('.mn-list-item__amount-row svg')).toHaveCount(0)
    await expect(
      row,
      'DELETE MOVES NO AMOUNT — it is unlink plus removal, and unlink never reverted one',
    ).toContainText(`-${VIEWED_AMOUNT}`)

    // ── A LATER SAVE ────────────────────────────────────────────────────────
    // A capture for a DIFFERENT row, so auto-match genuinely runs in this
    // session. A capture whose own fields matched the deleted receipt's row
    // WOULD link to it, correctly — that is a new receipt, not a relink. What
    // must not happen is anything re-matching the library.
    const target = receiptLessRow()
    expect(target.id, 'the later Save targets another row').not.toBe(VIEWED_ROW.id)
    await installResolvingExtraction(page, {
      merchant: target.merchant,
      capturedAt: target.occurredAt,
      total: -target.amount,
      tax: null,
      currency: target.currency,
      lineItems: [],
    })
    await activateTab(page, RECEIPTS_TAB)
    await saveOneCapture(page)

    await activateTab(page, TRANSACTIONS_TAB)
    expect(await glyphRowCount(page), 'the Save linked its own row and nothing else').toBe(
      RECEIPTS.length,
    )
    await expect(ledgerRow(page, VIEWED_AMOUNT).locator('.mn-list-item__amount-row svg')).toHaveCount(0)
  })

  test('an unlinked receipt leaves the library, its image is revoked, and no transaction changes', async ({
    page,
  }) => {
    await gotoRoute(page, '/finance', 'light')
    await installResolvingExtraction(page, {
      merchant: null,
      capturedAt: null,
      total: null,
      tax: null,
      currency: 'MYR',
      lineItems: [],
    })

    await activateTab(page, TRANSACTIONS_TAB)
    const ledgerBefore = await page.locator('.mvp-transactions__list > li').allTextContents()

    await activateTab(page, RECEIPTS_TAB)
    await saveOneCapture(page)
    const capture = cardFor(page, 'receipt-capture.jpg')
    await expect(capture.locator('.mn-chips'), 'an unread capture lands unlinked').toHaveCount(0)

    const viewer = await openFromCard(page, 'receipt-capture.jpg')
    // THE UNLINKED VIEWER: image and Delete only.
    await expect(viewer.getByText('Linked', { exact: true })).toHaveCount(0)
    await expect(viewer.locator('.mn-list-item')).toHaveCount(0)
    await expect(viewer.getByRole('button', { name: 'Unlink receipt' })).toHaveCount(0)

    const blob = await viewer.locator('img.mvp-receipt-viewer__image').getAttribute('src')
    expect(blob, 'a capture renders from its in-memory bytes').toMatch(/^blob:/)
    await page.evaluate(() => {
      const revoke = URL.revokeObjectURL.bind(URL)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any
      w.__revoked = []
      URL.revokeObjectURL = (url: string) => {
        w.__revoked.push(url)
        revoke(url)
      }
    })

    await viewer.getByRole('button', { name: 'Delete receipt' }).click()
    await page
      .getByRole('dialog', { name: 'Delete receipt?' })
      .getByRole('button', { name: 'Delete', exact: true })
      .click()
    await expect.poll(() => openDialogNames(page)).toEqual([])

    await expect(capture).toHaveCount(0)
    await expect(cards(page)).toHaveCount(RECEIPTS.length)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await page.evaluate(() => (window as any).__revoked)).toContain(blob)

    await activateTab(page, TRANSACTIONS_TAB)
    expect(
      await page.locator('.mvp-transactions__list > li').allTextContents(),
      'no transaction changed',
    ).toEqual(ledgerBefore)
    expect(await glyphRowCount(page)).toBe(RECEIPTS.length)
  })
})

test.describe('the screen-level add control', () => {
  test('is present when a search empties the list', async ({ page }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, RECEIPTS_TAB)

    const add = page.getByRole('button', { name: 'Add new receipt' })
    await expect(add).toHaveCount(1)

    await page.getByRole('textbox', { name: 'Search receipts' }).fill('no receipt is called this')
    await expect(page.locator('.mvp-receipts__month'), 'the search emptied the list').toHaveCount(0)
    await expect(cards(page)).toHaveCount(0)

    await expect(add, 'the add control sits outside every month group').toBeVisible()
    await add.click()
    await expect.poll(() => openDialogNames(page)).toEqual(['Add receipts'])
  })
})
