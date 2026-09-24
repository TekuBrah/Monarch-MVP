import { expect, test } from '@playwright/test'
import { activateTab, gotoRoute } from './harness'

import { BUDGETS } from '../src/data/budgets'
import {
  budgetAvailable,
  budgetPercentLeft,
  budgetPeriodLabel,
  budgetSpent,
  budgetSpentByCategory,
} from '../src/data/derive'
import { TRANSACTIONS } from '../src/data/transactions'
import type { Budget, Transaction } from '../src/data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BUDGET DERIVATIONS — Gate 67, Decision 2A.
 *
 * THE DERIVATION TESTS ARE A PURE IMPORT, NO PAGE — the `parse-receipt.spec.ts`
 * precedent. The one browser test is the last in the file. Everything
 * here is a function of `(budget, transactions)`, so a browser would add nothing
 * but time.
 *
 * THE EXPECTED FIGURES ARE WRITTEN OUT, NOT RECOMPUTED. They were verified by
 * hand against the seeded ledger at Gate 67 (and by the review thread against a
 * clone of `6601637` before it). A test that re-derived them with the same
 * filter as `derive.ts` would only prove the function agrees with itself.
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

/** A synthetic outflow, dated by its first 10 characters like every real row. */
function row(id: string, occurredAt: string, amount: number, category: Transaction['category']): Transaction {
  return {
    id,
    accountId: 'main',
    merchant: id,
    method: 'Card Payment',
    amount,
    currency: 'MYR',
    occurredAt,
    category,
    logo: { kind: 'person', initials: 'XX' },
  }
}

test('the seeded ledger is the shape the budgets are derived over', () => {
  expect(TRANSACTIONS).toHaveLength(25)
  const byMonth = new Map<string, number>()
  for (const t of TRANSACTIONS) {
    const month = t.occurredAt.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1)
  }
  expect(Object.fromEntries(byMonth)).toEqual({ '2026-09': 2, '2025-09': 18, '2025-08': 5 })
})

test('Monthly Budget: spent 3,359.67, available 4,140.33, 55% left', () => {
  expect(budgetSpent(MONTHLY, TRANSACTIONS)).toBe(3359.67)
  // 7,500.00 − 3,359.67 = 4,140.33
  expect(budgetAvailable(MONTHLY, TRANSACTIONS)).toBe(4140.33)
  // floor(4,140.33 / 7,500 × 100) = floor(55.204) = 55
  expect(budgetPercentLeft(MONTHLY, TRANSACTIONS)).toBe(55)
})

test('Monthly Budget: spent by category is the seven verified figures, 16 rows', () => {
  expect(budgetSpentByCategory(MONTHLY, TRANSACTIONS)).toEqual([
    { category: 'bills', spent: 143.9, count: 2 },
    { category: 'groceries', spent: 1118.46, count: 5 },
    { category: 'dining', spent: 123.76, count: 2 },
    { category: 'healthcare', spent: 26.29, count: 1 },
    { category: 'transport', spent: 100, count: 1 },
    { category: 'shopping', spent: 968.42, count: 2 },
    { category: 'others', spent: 878.84, count: 3 },
  ])
})

test('Entertainment: spent 123.76, available 876.24, 87% left', () => {
  expect(budgetSpent(ENTERTAINMENT, TRANSACTIONS)).toBe(123.76)
  // 1,000.00 − 123.76 = 876.24
  expect(budgetAvailable(ENTERTAINMENT, TRANSACTIONS)).toBe(876.24)
  // floor(87.624) = 87
  expect(budgetPercentLeft(ENTERTAINMENT, TRANSACTIONS)).toBe(87)
})

test('credits are excluded — the window holds +350.00 and +1,500.00 and neither counts', () => {
  const credits = TRANSACTIONS.filter((t) => {
    const day = t.occurredAt.slice(0, 10)
    return t.amount > 0 && day >= MONTHLY.from && day <= MONTHLY.to
  }).map((t) => t.amount)
  expect(credits.sort((a, b) => a - b)).toEqual([350, 1500])

  // Both credits are `others`. The category's spent is its three outflows only.
  const others = budgetSpentByCategory(MONTHLY, TRANSACTIONS).find((c) => c.category === 'others')
  expect(others).toEqual({ category: 'others', spent: 878.84, count: 3 })
})

test('an overspent budget has NEGATIVE available and 0% left', () => {
  const tight: Budget = { ...MONTHLY, id: 'synthetic-tight', limit: 100, categories: ['groceries'] }
  // 100.00 − 1,118.46 = −1,018.46
  expect(budgetAvailable(tight, TRANSACTIONS)).toBe(-1018.46)
  expect(budgetPercentLeft(tight, TRANSACTIONS)).toBe(0)
})

test('both boundary dates are inclusive, and the day after `to` is excluded', () => {
  const span: Budget = {
    id: 'synthetic-window',
    name: 'Window',
    categories: ['transport'],
    limit: 100,
    from: '2030-01-10',
    to: '2030-01-20',
    autoRenew: false,
  }
  const rows = [
    row('on-from-at-midnight', '2030-01-10T00:00:00', -1, 'transport'),
    row('on-to-last-minute', '2030-01-20T23:59:00', -2, 'transport'),
    row('day-after-to', '2030-01-21T00:00:00', -4, 'transport'),
    row('day-before-from', '2030-01-09T23:59:00', -8, 'transport'),
    row('other-category', '2030-01-15T12:00:00', -16, 'dining'),
  ]
  expect(budgetSpent(span, rows)).toBe(3)
  expect(budgetSpentByCategory(span, rows)).toEqual([{ category: 'transport', spent: 3, count: 2 }])
})

test('the period label matches Figma, and every budget field survives JSON', () => {
  // Figma `1266:14334`, both cards: "30 Aug - 20 Sept" — space, U+002D, space.
  expect(budgetPeriodLabel(MONTHLY)).toBe('30 Aug - 20 Sept')
  expect(budgetPeriodLabel(ENTERTAINMENT)).toBe('30 Aug - 20 Sept')
  // NP1: plain serialisable data, so persistence later is an adapter.
  expect(JSON.parse(JSON.stringify(BUDGETS))).toEqual(BUDGETS)
})

/*
  THE ONE BROWSER TEST IN THIS FILE. It checks the Budget tab draws what the
  derivations above return, through the DS card. A screenshot shows the digits,
  but it cannot say they came from the ledger.
*/
test('the Budget tab draws each seeded budget from its derived figures', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'budget', label: 'Budget' })

  const cards = page.locator('.mvp-budget .mn-card-monthly-budget:not(.mn-card-monthly-budget--add-new)')
  await expect(cards).toHaveCount(2)
  await expect(page.locator('.mvp-budget .mn-card-monthly-budget--add-new')).toHaveCount(1)
  await expect(page.locator('.mvp-coming-soon')).toHaveCount(0)

  const monthly = cards.nth(0)
  await expect(monthly.locator('.mn-card-monthly-budget__header-title')).toHaveText('Monthly Budget')
  await expect(monthly).toContainText('30 Aug - 20 Sept')
  await expect(monthly).toContainText('55%')
  await expect(monthly).toContainText('RM 4,140.33')
  await expect(monthly).toContainText('RM 7,500.00')
  await expect(monthly).toContainText('RM 3,359.67')
  await expect(monthly.getByRole('button', { name: 'Details for Monthly Budget' })).toHaveCount(1)

  const entertainment = cards.nth(1)
  await expect(entertainment.locator('.mn-card-monthly-budget__header-title')).toHaveText('Entertainment')
  await expect(entertainment).toContainText('87%')
  await expect(entertainment).toContainText('RM 876.24')
  await expect(entertainment).toContainText('RM 1,000.00')
  await expect(entertainment).toContainText('RM 123.76')

  // Every card fills the content column (G36, `sizing="fill"`).
  for (const card of await page.locator('.mvp-budget .mn-card-monthly-budget').all()) {
    await expect(card).toHaveClass(/\bmn-card-monthly-budget--fill\b/)
  }
})
