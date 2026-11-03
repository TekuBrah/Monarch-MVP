import { expect, test, type Page } from '@playwright/test'
import { activateTab, gotoRoute } from './harness'
import { BUDGETS } from '../src/data/budgets'
import {
  budgetPercentLeft,
  budgetSpent,
  merchantRecategorisations,
  recategorisedAllFrom,
  sendCategory,
  withCategoryRule,
} from '../src/data/derive'
import { formatMyr } from '../src/data/format'
import { RECIPIENTS } from '../src/data/recipients'
import { TRANSACTIONS } from '../src/data/transactions'
import type { CategoryRule, Transaction } from '../src/data/types'
import { toStored } from '../src/persistence/boundary'
import {
  MIGRATIONS,
  RECORD_KEYS,
  SCHEMA_VERSION,
  isStoredCategoryRule,
  storedRecordsProblem,
} from '../src/persistence/schema'
import { seedState } from '../src/persistence/seed'

/**
 * MERCHANT RULES — Gate 94 (11A's second half, reached through 22A).
 *
 * After a category pick on a purchase the sheet asks "Which transactions?":
 * "Only this transaction" (one row, no rule — Gate 89's behaviour) or "All from
 * this merchant" (every purchase from that merchant, and a stored rule that a
 * later send reads first). The seed is UNIFORM — every merchant's purchases share
 * one category — so the rules are proved on synthetic rows where that matters.
 *
 * Store helpers are copied from `recategorise.spec.ts` (Gate 85-B ruling R1).
 */

const DB = 'monarch-mvp'
const STORE_MODULE = '/src/persistence/store.ts'
const AEON = RECIPIENTS.find((r) => r.id === 'recipient-aeon-big')!
const RACHUM = RECIPIENTS.find((r) => r.id === 'recipient-rachum-greene')!
const DEMO_AMOUNT = 'RM 250.75' // txn-aeon-0915, Groceries
const OTHER_AEON_AMOUNT = 'RM 429.19' // txn-aeon-0904, Groceries, linked
const ENTERTAINMENT = BUDGETS.find((b) => b.id === 'budget-entertainment')!
const MONTHLY = BUDGETS.find((b) => b.id === 'budget-monthly')!
const aeonPurchases = TRANSACTIONS.filter((t) => t.merchant === 'Aeon Big' && t.kind === 'payment' && t.amount < 0)

const row = (over: Partial<Transaction>): Transaction => ({
  ...TRANSACTIONS.find((t) => t.id === 'txn-aeon-0915')!,
  ...over,
})

// ═════════════════════════════════ Node ════════════════════════════════════

test('N1 All from this merchant moves purchases only, and nothing when nothing changes', () => {
  const ikea = TRANSACTIONS.filter((t) => t.merchant === 'IKEA')
  const refund = ikea.find((t) => t.amount > 0)!
  const moved = merchantRecategorisations(TRANSACTIONS, 'IKEA', 'others')
  expect(moved.map((t) => t.id).sort()).toEqual(ikea.filter((t) => t.amount < 0).map((t) => t.id).sort())
  const after = recategorisedAllFrom(TRANSACTIONS, 'IKEA', 'others')
  expect(after.find((t) => t.id === refund.id), 'the refund is income and never moves').toBe(refund)
  for (const t of after) {
    if (t.merchant !== 'IKEA') expect(t, `${t.id} is another merchant's`).toBe(TRANSACTIONS.find((s) => s.id === t.id))
  }
  expect(recategorisedAllFrom(TRANSACTIONS, 'IKEA', 'shopping'), 'already all shopping: same array').toBe(TRANSACTIONS)
})

test('N2 the count skips rows already in the category and rows that are not purchases', () => {
  const a = row({ id: 'a', category: 'groceries' })
  const b = row({ id: 'b', category: 'dining' })
  const c = row({ id: 'c', kind: 'transfer', category: 'others' })
  const d = row({ id: 'd', merchant: 'Giant', category: 'groceries' })
  expect(merchantRecategorisations([a, b, c, d], 'Aeon Big', 'dining').map((t) => t.id)).toEqual(['a'])
  const after = recategorisedAllFrom([a, b, c, d], 'Aeon Big', 'dining')
  expect(after.map((t) => t.category)).toEqual(['dining', 'dining', 'others', 'groceries'])
  expect(after[1]).toBe(b)
  expect(after[2]).toBe(c)
})

test('N3 a rule is an upsert keyed on the merchant, and a no-op keeps the array', () => {
  const none: CategoryRule[] = []
  const one = withCategoryRule(none, { merchant: 'Aeon Big', category: 'dining' })
  expect(one).toEqual([{ merchant: 'Aeon Big', category: 'dining' }])
  expect(withCategoryRule(one, { merchant: 'Aeon Big', category: 'dining' })).toBe(one)
  expect(withCategoryRule(one, { merchant: 'Aeon Big', category: 'shopping' })).toEqual([
    { merchant: 'Aeon Big', category: 'shopping' },
  ])
  expect(withCategoryRule(one, { merchant: 'Giant', category: 'others' })).toHaveLength(2)
})

test('N4 sendCategory reads a rule first, then the latest payment; a person ignores both', () => {
  const rules: CategoryRule[] = [{ merchant: 'Aeon Big', category: 'dining' }]
  expect(sendCategory(AEON, TRANSACTIONS, []), 'no rule: the latest payment').toBe('groceries')
  expect(sendCategory(AEON, TRANSACTIONS, rules), 'the rule wins').toBe('dining')
  expect(sendCategory(AEON, TRANSACTIONS, [{ merchant: 'Giant', category: 'others' }])).toBe('groceries')
  expect(sendCategory(RACHUM, TRANSACTIONS, [{ merchant: RACHUM.name, category: 'dining' }])).toBe('others')
})

test('N5 schema v3: a new collection, an empty-collection step from v2, a total validator', () => {
  expect(SCHEMA_VERSION).toBe(3)
  expect(RECORD_KEYS).toContain('categoryRules')
  const v3 = toStored(seedState())
  expect(v3.categoryRules).toEqual([])
  const { categoryRules: _dropped, ...v2 } = v3
  void _dropped
  const migrated = MIGRATIONS[2]!(MIGRATIONS[1]!(v2)) as typeof v3
  expect(migrated.categoryRules).toEqual([])
  expect(storedRecordsProblem(migrated, new Set())).toBeNull()
  expect(MIGRATIONS[2]!(null), 'a non-object passes through, never throws').toBeNull()
  expect(isStoredCategoryRule({ merchant: 'Aeon Big', category: 'dining' })).toBe(true)
  for (const bad of [null, {}, { merchant: '', category: 'dining' }, { merchant: 'Aeon Big', category: 'food' }]) {
    expect(isStoredCategoryRule(bad), JSON.stringify(bad)).toBe(false)
  }
  const twice = { ...v3, categoryRules: [{ merchant: 'Aeon Big', category: 'dining' }, { merchant: 'Aeon Big', category: 'others' }] }
  expect(storedRecordsProblem(twice, new Set())).toBe('categoryRules names a merchant twice')
})

test('N6 All from Aeon Big moves exactly the budget rows it should', () => {
  expect(aeonPurchases).toHaveLength(28)
  const after = recategorisedAllFrom(TRANSACTIONS, 'Aeon Big', 'dining')
  expect(budgetSpent(ENTERTAINMENT, after)).toBe(803.7)
  expect(budgetPercentLeft(ENTERTAINMENT, after)).toBe(19)
  expect(budgetSpent(MONTHLY, after)).toBe(budgetSpent(MONTHLY, TRANSACTIONS))
})

// ═══════════════════════════════ store access ═══════════════════════════════

async function readRecords(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate(async (name) => {
    const databases = await indexedDB.databases()
    if (!databases.some((d) => d.name === name)) return null
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const records = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const tx = db.transaction('records')
      const keys = tx.objectStore('records').getAllKeys()
      const values = tx.objectStore('records').getAll()
      tx.oncomplete = () =>
        resolve(Object.fromEntries(keys.result.map((k, i) => [String(k), values.result[i]])))
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    return records
  }, DB)
}

async function storeIdle(page: Page): Promise<void> {
  await page.evaluate(async (path) => {
    const store: { whenIdle: () => Promise<void> } = await import(path)
    await store.whenIdle()
  }, STORE_MODULE)
}

// ═════════════════════════════════ screens ══════════════════════════════════

const TRANSACTIONS_TAB = { id: 'transactions', label: 'Transactions' }
const sheetNamed = (page: Page, name: string) => page.getByRole('dialog', { name })
const categoryControl = (page: Page) => page.getByRole('button', { name: /^Change category, / })
const scopeOption = (page: Page, name: 'Only this transaction' | 'All from this merchant') =>
  page.getByRole('option', { name, exact: true })

async function openRow(page: Page, amount: string): Promise<void> {
  await page.locator(`.mvp-transactions__list > li:has-text("${amount}") .mn-list-item`).click()
  await expect(sheetNamed(page, 'Transaction details')).toBeVisible()
}

async function toScope(page: Page, category: string): Promise<void> {
  await categoryControl(page).click()
  await page.getByRole('option', { name: category, exact: true }).click()
  await expect(sheetNamed(page, 'Which transactions?')).toBeVisible()
}

async function openLedger(page: Page): Promise<void> {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, TRANSACTIONS_TAB)
}

test('B1 Only this transaction moves one row and stores no rule', async ({ page }) => {
  await openLedger(page)
  await openRow(page, DEMO_AMOUNT)
  await toScope(page, 'Dining & Leisure')
  await scopeOption(page, 'Only this transaction').click()
  await expect(categoryControl(page)).toHaveText('Dining & Leisure')
  await page.keyboard.press('Escape')
  await openRow(page, OTHER_AEON_AMOUNT)
  await expect(categoryControl(page), 'another Aeon Big row did not move').toHaveText('Groceries')
  await storeIdle(page)
  const records = await readRecords(page)
  expect(records?.categoryRules).toEqual([])
})

test('B2 All from this merchant: the preview, every Aeon Big purchase, a rule, KEPT across a reload', async ({ page }) => {
  await openLedger(page)
  await openRow(page, DEMO_AMOUNT)
  await toScope(page, 'Dining & Leisure')
  await expect(page.locator('.mvp-txn-detail__scope-note')).toHaveText(
    'All from this merchant changes 28 transactions from Aeon Big to Dining & Leisure, and future ones too.',
  )
  await scopeOption(page, 'All from this merchant').click()
  await expect(categoryControl(page)).toHaveText('Dining & Leisure')
  await storeIdle(page)
  const records = await readRecords(page)
  expect(records?.categoryRules).toEqual([{ merchant: 'Aeon Big', category: 'dining' }])
  const stored = records?.transactions as Transaction[]
  const aeon = stored.filter((t) => t.merchant === 'Aeon Big' && t.kind === 'payment' && t.amount < 0)
  expect(aeon).toHaveLength(28)
  expect(new Set(aeon.map((t) => t.category))).toEqual(new Set(['dining']))
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await activateTab(page, TRANSACTIONS_TAB)
  await openRow(page, OTHER_AEON_AMOUNT)
  await expect(categoryControl(page)).toHaveText('Dining & Leisure')
})

test('B3 with no reload, a send to Aeon Big follows the rule even after a one-off change to its newest row', async ({ page }) => {
  const newest = [...aeonPurchases].sort((x, y) => y.occurredAt.localeCompare(x.occurredAt))[0]!
  await openLedger(page)
  await openRow(page, DEMO_AMOUNT)
  await toScope(page, 'Dining & Leisure')
  await scopeOption(page, 'All from this merchant').click()
  await page.keyboard.press('Escape')
  // A one-off back to Groceries on the NEWEST Aeon Big purchase: without the rule,
  // sendCategory would follow that row (the latest payment).
  await openRow(page, formatMyr(-newest.amount))
  await toScope(page, 'Groceries')
  await scopeOption(page, 'Only this transaction').click()
  await expect(categoryControl(page)).toHaveText('Groceries')
  await page.keyboard.press('Escape')
  // Send through the app's own controls: the bar's Transfer item, Send, Aeon Big.
  await page.locator('.mvp-shell__nav .mn-bottom-nav__item', { hasText: 'Transfer' }).click()
  await page.getByRole('dialog', { name: 'Transfer' }).getByRole('button', { name: /Send/ }).click()
  await page.locator('.mvp-transfer__list > li', { hasText: 'Aeon Big' }).getByRole('button').click()
  await page.getByRole('combobox', { name: 'Transfer Amount' }).fill('12.30')
  await page.getByRole('button', { name: 'Transfer money' }).click()
  await page.getByRole('dialog', { name: 'Review transfer' }).getByRole('button', { name: 'Transfer now' }).click()
  await page.getByRole('button', { name: 'View transaction' }).click()
  await expect(sheetNamed(page, 'Transaction details')).toContainText('-RM 12.30')
  await expect(categoryControl(page), 'the rule, not the latest payment').toHaveText('Dining & Leisure')
})

test('B6 a rule hydrated after a reload still decides a send', async ({ page }) => {
  // The reload case B3 cannot see: if hydration dropped the stored rules, the
  // send would follow the newest row's one-off Groceries instead.
  const newest = [...aeonPurchases].sort((x, y) => y.occurredAt.localeCompare(x.occurredAt))[0]!
  await openLedger(page)
  await openRow(page, DEMO_AMOUNT)
  await toScope(page, 'Dining & Leisure')
  await scopeOption(page, 'All from this merchant').click()
  await page.keyboard.press('Escape')
  await openRow(page, formatMyr(-newest.amount))
  await toScope(page, 'Groceries')
  await scopeOption(page, 'Only this transaction').click()
  await page.keyboard.press('Escape')
  await storeIdle(page)
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await page.locator('.mvp-shell__nav .mn-bottom-nav__item', { hasText: 'Transfer' }).click()
  await page.getByRole('dialog', { name: 'Transfer' }).getByRole('button', { name: /Send/ }).click()
  await page.locator('.mvp-transfer__list > li', { hasText: 'Aeon Big' }).getByRole('button').click()
  await page.getByRole('combobox', { name: 'Transfer Amount' }).fill('12.30')
  await page.getByRole('button', { name: 'Transfer money' }).click()
  await page.getByRole('dialog', { name: 'Review transfer' }).getByRole('button', { name: 'Transfer now' }).click()
  await page.getByRole('button', { name: 'View transaction' }).click()
  await expect(sheetNamed(page, 'Transaction details')).toContainText('-RM 12.30')
  await expect(categoryControl(page), 'the hydrated rule').toHaveText('Dining & Leisure')
})

test('B4 Back, close and Escape from Which transactions? write nothing', async ({ page }) => {
  await openLedger(page)
  await openRow(page, DEMO_AMOUNT)
  await toScope(page, 'Dining & Leisure')
  await page.getByRole('button', { name: 'Back to transaction details' }).click()
  await expect(sheetNamed(page, 'Select category')).toBeVisible()
  await page.getByRole('option', { name: 'Dining & Leisure', exact: true }).click()
  await expect(sheetNamed(page, 'Which transactions?')).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await openRow(page, DEMO_AMOUNT)
  await toScope(page, 'Dining & Leisure')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await openRow(page, DEMO_AMOUNT)
  await expect(categoryControl(page)).toHaveText('Groceries')
  await storeIdle(page)
  expect(Object.keys((await readRecords(page)) ?? {}), 'nothing was stored').toEqual([])
})

test('B5 Which transactions? holds the detail view\'s height', async ({ page }) => {
  await openLedger(page)
  await openRow(page, DEMO_AMOUNT)
  const panel = page.locator('.mn-sheet__panel')
  const detail = (await panel.boundingBox())!
  await toScope(page, 'Dining & Leisure')
  await expect(scopeOption(page, 'Only this transaction')).toBeFocused()
  const scope = (await panel.boundingBox())!
  expect(Math.abs(scope.height - detail.height), `${scope.height} vs ${detail.height}`).toBeLessThanOrEqual(1)
  expect(Math.abs(scope.y - detail.y)).toBeLessThanOrEqual(1)
})
