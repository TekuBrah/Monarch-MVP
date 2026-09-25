import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { activateTab, gotoRoute } from './harness'

import { BUDGETS } from '../src/data/budgets'
import { budgetLegend, budgetSpent, transactionHasReceipt } from '../src/data/derive'
import { formatMyr, formatSignedMyr } from '../src/data/format'
import { RECEIPTS } from '../src/data/receipts'
import { TRANSACTIONS, TRANSACTION_CATEGORIES } from '../src/data/transactions'
import type { Budget } from '../src/data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BUDGET DRILLDOWN — Gate 69 (`/finance/budget/:budgetId`, Figma
 * `1266:14337`).
 *
 * The first three tests are a pure import (the `budgets.spec.ts` precedent);
 * the rest drive the screen through its own controls. No baseline — the four
 * walk states that photograph it live in `visual.spec.ts`.
 *
 * THE VERIFIED FIGURES ARE WRITTEN OUT, NOT RECOMPUTED: Groceries RM 1,118.46
 * over five rows was checked by hand against the seeded ledger. The browser
 * tests DO derive their expectations from `budgetLegend`, because what they
 * assert is that the screen draws the derivation, not what the derivation is.
 *
 * THE LEDGER'S FIGURES ARE NOT PERSONAL DATA: they are the seeded fixture.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const byId = (id: string): Budget => {
  const found = BUDGETS.find((b) => b.id === id)
  if (!found) throw new Error(`no seeded budget ${id}`)
  return found
}

const MONTHLY = byId('budget-monthly')
const ENTERTAINMENT = byId('budget-entertainment')

test('the legend orders by spend, and Monthly opens on Groceries: RM 1,118.46 over 5 rows', () => {
  const legend = budgetLegend(MONTHLY, TRANSACTIONS)
  expect(legend.map((e) => e.category)).toEqual([
    'groceries',
    'shopping',
    'others',
    'bills',
    'dining',
    'transport',
    'healthcare',
  ])
  expect(legend[0].spent).toBe(1118.46)
  expect(legend[0].rows).toHaveLength(5)
  // Newest first, every row an outflow inside the range.
  const dates = legend[0].rows.map((t) => t.occurredAt)
  expect(dates).toEqual([...dates].sort().reverse())
  expect(legend[0].rows.every((t) => t.amount < 0)).toBe(true)
})

test('the legend is every category in the budget, and its rows are exactly what budgetSpent sums', () => {
  for (const budget of BUDGETS) {
    const legend = budgetLegend(budget, TRANSACTIONS)
    expect([...legend.map((e) => e.category)].sort()).toEqual([...budget.categories].sort())
    const sen = legend.reduce((s, e) => s + Math.round(e.spent * 100), 0)
    expect(sen / 100).toBe(budgetSpent(budget, TRANSACTIONS))
    const rowSen = legend.flatMap((e) => e.rows).reduce((s, t) => s - Math.round(t.amount * 100), 0)
    expect(rowSen / 100).toBe(budgetSpent(budget, TRANSACTIONS))
  }
  expect(budgetLegend(ENTERTAINMENT, TRANSACTIONS)[0]).toMatchObject({
    category: 'dining',
    spent: 123.76,
  })
})

test('ties break in TRANSACTION_CATEGORIES order, and a zero-spend category has no rows and a 0 share', () => {
  // Nothing in the seed ties or spends zero, so a window with no rows is used:
  // every category ties at zero and the order must be the table's own.
  const empty: Budget = { ...MONTHLY, from: '2030-01-01', to: '2030-01-31' }
  const legend = budgetLegend(empty, TRANSACTIONS)
  expect(legend.map((e) => e.category)).toEqual(TRANSACTION_CATEGORIES.map((c) => c.id))
  expect(legend.every((e) => e.spent === 0 && e.rows.length === 0 && e.share === 0)).toBe(true)
})

async function openDrilldown(page: Page, budget: Budget): Promise<void> {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'budget', label: 'Budget' })
  await page.getByRole('button', { name: `Details for ${budget.name}` }).click()
  await expect(page).toHaveURL(new RegExp(`/finance/budget/${budget.id}$`))
  await expect(page.locator('.mn-header-default__title')).toHaveText(budget.name)
}

for (const budget of BUDGETS) {
  test(`Details opens ${budget.name}'s drilldown, and Back lands on the Budget tab`, async ({ page }) => {
    await openDrilldown(page, budget)
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/finance$/)
    await expect(page.locator('#tab-budget')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.mn-card-monthly-budget').first()).toBeVisible()
  })
}

test('an unknown budget id redirects to the Budget tab, replacing the history entry', async ({ page }) => {
  await gotoRoute(page, '/finance/budget/no-such-budget', 'light')
  await expect(page).toHaveURL(/\/finance$/)
  await expect(page.locator('#tab-budget')).toHaveAttribute('aria-selected', 'true')
  // A fresh page's history is `about:blank` then the goto: 2 entries. A redirect
  // WITHOUT `replace` would push a third, and Back would return to the dead URL.
  expect(await page.evaluate(() => history.length)).toBe(2)
})

for (const budget of BUDGETS) {
  test(`${budget.name}: only the largest-spend category starts open, with correct ARIA`, async ({
    page,
  }) => {
    await gotoRoute(page, `/finance/budget/${budget.id}`, 'light')
    const legend = budgetLegend(budget, TRANSACTIONS)
    const rows = page.locator('.mvp-budget-detail__legend-entry > .mn-chart-legend-item')
    await expect(rows).toHaveCount(legend.length)

    for (const [i, entry] of legend.entries()) {
      const row = rows.nth(i)
      const label = TRANSACTION_CATEGORIES.find((c) => c.id === entry.category)!.label
      await expect(row.locator('.mn-chart-legend-item__title')).toHaveText(label)
      await expect(row.locator('.mn-chart-legend-item__amount')).toHaveText(formatMyr(entry.spent))
      await expect(row).toHaveAttribute('aria-expanded', i === 0 ? 'true' : 'false')
      const controls = await row.getAttribute('aria-controls')
      expect(controls).toBe(`budget-legend-${entry.category}`)
      await expect(page.locator(`#${controls}`)).toHaveCount(1)
      await expect(page.locator(`#${controls}`)).toBeVisible({ visible: i === 0 })
    }
  })
}

test('disclosures are independent: opening a second row leaves the first open', async ({ page }) => {
  await gotoRoute(page, `/finance/budget/${MONTHLY.id}`, 'light')
  const rows = page.locator('.mvp-budget-detail__legend-entry > .mn-chart-legend-item')
  await rows.nth(1).click()
  await expect(rows.nth(0)).toHaveAttribute('aria-expanded', 'true')
  await expect(rows.nth(1)).toHaveAttribute('aria-expanded', 'true')
  await rows.nth(0).click()
  await expect(rows.nth(0)).toHaveAttribute('aria-expanded', 'false')
  await expect(rows.nth(1)).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#budget-legend-groceries')).toBeHidden()
  await expect(page.locator('#budget-legend-shopping')).toBeVisible()
})

test('the donut centre is the sum of the legend amounts, and equals budgetSpent', async ({ page }) => {
  await gotoRoute(page, `/finance/budget/${MONTHLY.id}`, 'light')
  const amounts = await page.locator('.mn-chart-legend-item__amount').allTextContents()
  const sen = amounts.reduce((s, a) => s + Math.round(Number(a.replace(/[^0-9.]/g, '')) * 100), 0)
  const centre = page.locator('.mn-donut__centre-label')
  await expect(centre).toHaveText(formatMyr(sen / 100))
  await expect(centre).toHaveText(formatMyr(budgetSpent(MONTHLY, TRANSACTIONS)))
  // One wedge per category with spend.
  await expect(page.locator('.mn-donut__segment')).toHaveCount(
    budgetLegend(MONTHLY, TRANSACTIONS).filter((e) => e.spent > 0).length,
  )
})

test('receipt glyphs appear only on rows with a linked receipt', async ({ page }) => {
  await gotoRoute(page, `/finance/budget/${MONTHLY.id}`, 'light')
  const expected = budgetLegend(MONTHLY, TRANSACTIONS)[0].rows
  const linked = expected.filter((t) => transactionHasReceipt(RECEIPTS, t.id))
  // The guard: a hard-coded prop passes a surface where every row is one kind.
  expect(linked.length).toBeGreaterThan(0)
  expect(linked.length).toBeLessThan(expected.length)

  const items = page.locator('#budget-legend-groceries .mn-list-item')
  await expect(items).toHaveCount(expected.length)
  for (const [i, txn] of expected.entries()) {
    const item = items.nth(i)
    await expect(item).toContainText(formatSignedMyr(txn.amount))
    await expect(item.locator('.mn-list-item__amount-row svg')).toHaveCount(
      transactionHasReceipt(RECEIPTS, txn.id) ? 1 : 0,
    )
  }
})

test('the info card draws no pencils, and every value takes one colour', async ({ page }) => {
  await gotoRoute(page, `/finance/budget/${MONTHLY.id}`, 'light')
  const info = page.locator('.mvp-budget-detail__info')
  await expect(info.locator('dt')).toHaveText(['Budget', 'Duration', 'Available', 'Spent'])
  // Decision 6: no edit affordance of any kind inside the card.
  await expect(info.locator('button, a, [role="button"]')).toHaveCount(0)
  const colours = await info
    .locator('dd')
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).color))
  expect(new Set(colours).size).toBe(1)
})
