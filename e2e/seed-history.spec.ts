import { expect, test, type Page } from '@playwright/test'
import { activateTab, gotoRoute } from './harness'
import { CRYPTO_HOLDINGS, FIAT_ACCOUNTS } from '../src/data/accounts'
import { rankedSuggestions } from '../src/data/autoMatch'
import { BUDGETS } from '../src/data/budgets'
import {
  backfillReferences,
  budgetPercentLeft,
  budgetSpent,
  canCarryReceipt,
  DATE_RANGES,
  filterTransactions,
  ledgerNow,
  netWorth,
  receiptsNow,
  recentTransactions,
  transactionDisposition,
  TRANSACTION_FILTER_ALL,
} from '../src/data/derive'
import { formatMyr, formatTimestamp } from '../src/data/format'
import { GOALS } from '../src/data/goals'
import { buildHoldings } from '../src/data/holdings'
import { RECEIPTS } from '../src/data/receipts'
import { TRANSACTIONS } from '../src/data/transactions'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GATE 82 — THE SPENDING HISTORY, PINNED.
 *
 * Gate 82 filled the stretch between the last Sept 2025 purchase and the two
 * Sept 2026 rows with 201 rows: 200 purchases and one refund. That stretch is
 * full of figures other screens already photograph, so this file pins the ones
 * the new rows must NOT move, and the bounds that keep them from moving.
 *
 * THE NEW ROWS ARE IDENTIFIED BY WHAT THEY ARE, NOT BY A LIST OF IDS: every
 * non-contribution row dated after the last Sept 2025 purchase and before the
 * 12 Sept 2026 pair. Nothing else in the seed lives there.
 *
 * Every browser figure is reached through the app's own controls after one
 * navigation: nothing is persisted (NP1), so a second `page.goto` would reseed
 * the app and prove nothing about what it shows.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const EARLIEST = '2025-09-21T00:00:00'
const LATEST = '2026-09-11T23:59:00'
const REFUND_ID = 'txn-ikea-refund-260117'
const REFUNDED_ID = 'txn-ikea-260110'
const REFERENCE = /^MNRC\d{8}[0-9A-HJKMNP-TV-Z]{6}$/

const HISTORY = TRANSACTIONS.filter(
  (t) =>
    t.goalId === undefined &&
    t.occurredAt > '2025-09-15T22:03:00' &&
    t.occurredAt < '2026-09-12T00:00:00',
)
const byId = (id: string) => {
  const t = TRANSACTIONS.find((r) => r.id === id)
  if (!t) throw new Error(`no seeded row ${id}`)
  return t
}

test.describe('the Gate 82 rows', () => {
  test('201 rows, every one inside 21 Sept 2025 – 11 Sept 2026', () => {
    expect(HISTORY).toHaveLength(201)
    for (const t of HISTORY) {
      expect(t.occurredAt >= EARLIEST, `${t.id} is before ${EARLIEST}`).toBe(true)
      expect(t.occurredAt <= LATEST, `${t.id} is after ${LATEST}`).toBe(true)
    }
    const sorted = [...HISTORY].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    // The two boundary rows sit ON the first and last allowed dates.
    expect(sorted[0]?.occurredAt.slice(0, 10)).toBe('2025-09-21')
    expect(sorted.at(-1)?.occurredAt.slice(0, 10)).toBe('2026-09-11')
    // And the 16–20 Sept 2025 hole stays empty of purchases: those days are
    // inside both budget ranges.
    expect(
      TRANSACTIONS.filter((t) => t.occurredAt >= '2025-09-16' && t.occurredAt < '2025-09-21'),
    ).toEqual([])
  })

  test('every row is a Card Payment on main; one is a credit, the rest purchases', () => {
    for (const t of HISTORY) {
      expect(t.kind, t.id).toBe('payment')
      expect(t.method, t.id).toBe('Card Payment')
      expect(t.accountId, t.id).toBe('main')
      expect(t.logo.kind, t.id).toBe('merchant')
      expect(t.amount, `${t.id} has amount 0`).not.toBe(0)
    }
    const credits = HISTORY.filter((t) => t.amount > 0)
    expect(credits.map((t) => t.id)).toEqual([REFUND_ID])
    expect(HISTORY.filter((t) => transactionDisposition(t) === 'purchase')).toHaveLength(200)
  })

  test('every seeded row carries a reference of the stored shape, and none repeats', () => {
    const stamped = backfillReferences(TRANSACTIONS)
    const refs = stamped.map((t) => t.reference ?? '')
    for (const [i, ref] of refs.entries()) {
      expect(ref, stamped[i]!.id).toMatch(REFERENCE)
      // The date half is the row's own date.
      expect(ref.slice(4, 12), stamped[i]!.id).toBe(stamped[i]!.occurredAt.slice(0, 10).replace(/-/g, ''))
    }
    expect(new Set(refs).size).toBe(refs.length)
  })

  test('no timestamp label repeats on the same merchant, and every occurredAt is distinct', () => {
    expect(new Set(TRANSACTIONS.map((t) => t.occurredAt)).size).toBe(TRANSACTIONS.length)
    const labels = TRANSACTIONS.map((t) => `${t.merchant}|${formatTimestamp(t.occurredAt)}`)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

test.describe('figures the history must not move', () => {
  test('both budgets, from rows inside their own ranges only', () => {
    const [monthly, entertainment] = BUDGETS
    expect(budgetSpent(monthly!, TRANSACTIONS)).toBe(2608.83)
    expect(budgetPercentLeft(monthly!, TRANSACTIONS)).toBe(65)
    expect(budgetSpent(entertainment!, TRANSACTIONS)).toBe(123.76)
    expect(budgetPercentLeft(entertainment!, TRANSACTIONS)).toBe(87)
    // No history row is dated inside any budget's range.
    for (const b of BUDGETS) {
      for (const t of HISTORY) {
        const day = t.occurredAt.slice(0, 10)
        expect(day >= b.from && day <= b.to, `${t.id} falls inside ${b.id}`).toBe(false)
      }
    }
  })

  test('stored balances and net worth', () => {
    expect(FIAT_ACCOUNTS.map((a) => a.balance)).toEqual([27978.59, 15000])
    expect(netWorth(buildHoldings(FIAT_ACCOUNTS), CRYPTO_HOLDINGS, GOALS)).toBeCloseTo(481038.84, 2)
  })

  test('the two date anchors and the Homepage strip', () => {
    expect([...TRANSACTIONS].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]?.id).toBe(
      'txn-ifruits-0912',
    )
    expect(ledgerNow(TRANSACTIONS).getTime()).toBe(new Date('2026-09-12T16:13:00').getTime())
    expect(receiptsNow(RECEIPTS).getTime()).toBe(new Date('2025-09-13T18:50:00').getTime())
    expect(recentTransactions(TRANSACTIONS, 2).map((t) => t.id)).toEqual([
      'txn-ifruits-0912',
      'txn-rosyam-0912',
    ])
  })

  test('every receipt still reconciles to its row, and no history row is linked or suggested', () => {
    for (const r of RECEIPTS) {
      const t = byId(r.transactionId!)
      expect(Math.round(-t.amount * 100), r.id).toBe(Math.round(r.total * 100))
    }
    const historyIds = new Set(HISTORY.map((t) => t.id))
    expect(RECEIPTS.filter((r) => historyIds.has(r.transactionId ?? ''))).toEqual([])
    for (const r of RECEIPTS) {
      const suggested = rankedSuggestions(r, TRANSACTIONS).map((s) => s.transaction.id)
      expect(suggested.filter((id) => historyIds.has(id)), r.id).toEqual([])
    }
  })

  test('the empty-state ladder is still reachable: This Month 9, then Fund Transfer none', () => {
    const f = (over: Partial<typeof TRANSACTION_FILTER_ALL>) =>
      filterTransactions(TRANSACTIONS, { ...TRANSACTION_FILTER_ALL, ...over }, '').length
    expect(f({ dateRange: 'this-month' })).toBe(9)
    expect(f({ dateRange: 'this-month', methods: ['Fund Transfer'] })).toBe(0)
    expect(DATE_RANGES.map((r) => [r.id, f({ dateRange: r.id })])).toEqual([
      ['all', 254],
      ['this-month', 9],
      ['last-7', 4],
      ['last-30', 19],
    ])
  })
})

test.describe('the refund', () => {
  test('is income: no receipt, no budget, and it refunds a purchase authored in the window', () => {
    const refund = byId(REFUND_ID)
    const refunded = byId(REFUNDED_ID)
    expect(transactionDisposition(refund)).toBe('income')
    expect(canCarryReceipt(refund)).toBe(false)
    expect(refund.merchant).toBe(refunded.merchant)
    expect(refund.amount).toBeLessThan(-refunded.amount) // partial
    expect(refund.occurredAt > refunded.occurredAt).toBe(true)
    // Removing it moves no budget.
    const without = TRANSACTIONS.filter((t) => t.id !== REFUND_ID)
    for (const b of BUDGETS) expect(budgetSpent(b, without)).toBe(budgetSpent(b, TRANSACTIONS))
  })
})

async function figureOn(page: Page) {
  return {
    hero: ((await page.locator('.mvp-finance__networth-amount').textContent()) ?? '').trim(),
    main: (
      (await page.locator('.mvp-finance__grid-item', { hasText: 'Main' }).first().textContent()) ?? ''
    ).trim(),
  }
}

test('through the app: figures, the 254-row list, and the refund detail', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')
  const before = await figureOn(page)
  expect(before.hero).toBe(formatMyr(481038.84))
  expect(before.main).toContain(formatMyr(27978.59))

  await activateTab(page, { id: 'budget', label: 'Budget' })
  const cards = page.locator('.mvp-budget .mn-card-monthly-budget:not(.mn-card-monthly-budget--add-new)')
  await expect(cards.nth(0)).toContainText('65%')
  await expect(cards.nth(0)).toContainText('RM 2,608.83')
  await expect(cards.nth(1)).toContainText('87%')
  await expect(cards.nth(1)).toContainText('RM 123.76')

  await activateTab(page, { id: 'transactions', label: 'Transactions' })
  await expect(page.locator('.mvp-transactions__list > li')).toHaveCount(254)
  const refundRow = page.locator('.mvp-transactions__list > li:has-text("+RM 129.00")')
  await expect(refundRow).toHaveCount(1)
  await refundRow.locator('.mn-list-item').click()
  const sheet = page.locator('[role="dialog"][aria-modal="true"]')
  await expect(sheet).toHaveCount(1)
  await expect(sheet.locator('.mvp-txn-detail__movement-note')).toHaveText(
    "Money coming in isn't counted in budgets.",
  )
  await expect(sheet.locator('.mvp-txn-detail__prompt')).toHaveCount(0)
  await expect(sheet.locator('.mvp-txn-detail__receipt')).toHaveCount(0)
  const rows = sheet.locator('.mvp-txn-detail__row')
  await expect(rows.filter({ hasText: 'From' }).locator('dd')).toHaveText('IKEA')
  await expect(rows.filter({ hasText: 'To' }).locator('dd')).toHaveText('Main')
  await expect(rows.filter({ hasText: 'Reference' }).locator('dd')).toHaveText(REFERENCE)
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)

  // Back to Overview through the tab bar: nothing moved.
  await activateTab(page, { id: 'overview', label: 'Overview' })
  expect(await figureOn(page)).toEqual(before)
})
