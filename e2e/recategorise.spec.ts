import { expect, test, type Locator, type Page } from '@playwright/test'
import { activateTab, gotoRoute } from './harness'
import { BUDGETS } from '../src/data/budgets'
import {
  TRANSACTION_FILTER_ALL,
  TRANSACTION_FILTER_APPLIED,
  budgetAvailable,
  budgetLegend,
  budgetPercentLeft,
  budgetSpent,
  canRecategorise,
  filterTransactions,
  recategorised,
  transactionDisposition,
} from '../src/data/derive'
import { formatMyr, formatSignedMyr } from '../src/data/format'
import { TRANSACTIONS, TRANSACTION_CATEGORIES } from '../src/data/transactions'
import type { Budget, Transaction, TransactionCategoryId } from '../src/data/types'
import { seedState } from '../src/persistence/seed'

/**
 * ─────────────────── RECATEGORISATION — Gate 89 ───────────────────
 *
 * One purchase's category changes through the detail sheet's Category row, and
 * every figure that reads it follows. The writer changes that one row only
 * (Decision 11 = A) and marks nothing (Decision 12 = A).
 *
 * THE DEMO ROW IS `txn-aeon-0915` — Aeon Big, −RM 250.75, 15 Sept 2025,
 * Groceries — the `detail` walk state's row, moved to Dining & Leisure. It moves
 * BOTH kinds of budget figure: Entertainment (dining only) gains it, and
 * Monthly (all seven categories) keeps its totals but reorders its legend.
 *
 * Node tests import the app's own derivations and seed. Browser tests run one
 * theme: nothing here is a colour fact, and dark is covered by the walk states.
 * `readStore` and `storeIdle` are copied from `persistence-writers.spec.ts`
 * (Gate 85-B ruling R1: importing a spec would register its tests twice).
 */

const DB = 'monarch-mvp'
const STORE_MODULE = '/src/persistence/store.ts'

const DEMO_ID = 'txn-aeon-0915'
const DEMO = TRANSACTIONS.find((t) => t.id === DEMO_ID)!
const TO: TransactionCategoryId = 'dining'
const LINKED_AMOUNT = 'RM 429.19'
const DEMO_AMOUNT = 'RM 250.75'
const MONTHLY = BUDGETS.find((b) => b.id === 'budget-monthly')!
const ENTERTAINMENT = BUDGETS.find((b) => b.id === 'budget-entertainment')!

const label = (id: TransactionCategoryId) => TRANSACTION_CATEGORIES.find((c) => c.id === id)!.label
const recategorisedLedger = (ledger: Transaction[]) =>
  ledger.map((t) => (t.id === DEMO_ID ? recategorised(t, TO) : t))
const AFTER = recategorisedLedger(TRANSACTIONS)
const availableLabel = (b: Budget, ledger: Transaction[]) => {
  const a = budgetAvailable(b, ledger)
  return a < 0 ? formatSignedMyr(a) : formatMyr(a)
}

// ═══════════════════════════════════ Node ═══════════════════════════════════

test('only a purchase can be recategorised', () => {
  const purchases = TRANSACTIONS.filter((t) => transactionDisposition(t) === 'purchase')
  const others = TRANSACTIONS.filter((t) => transactionDisposition(t) !== 'purchase')
  expect(purchases).toHaveLength(220)
  expect(others).toHaveLength(34) // 33 transfers + the IKEA refund
  expect(TRANSACTIONS.filter(canRecategorise).map((t) => t.id)).toEqual(purchases.map((t) => t.id))
  expect(others.filter(canRecategorise)).toEqual([])
})

test('recategorising changes the category and nothing else', () => {
  const next = recategorised(DEMO, TO)
  expect(next).toEqual({ ...DEMO, category: TO })
  expect(next).not.toBe(DEMO)
  expect(DEMO.category).toBe('groceries') // the seed row is not mutated
  // Picking the current category returns THE SAME OBJECT, so a no-op writes nothing.
  expect(recategorised(DEMO, DEMO.category)).toBe(DEMO)
})

test('recategorising a transfer or a refund throws', () => {
  const transfer = TRANSACTIONS.find((t) => t.id === 'txn-bali-c16')!
  const refund = TRANSACTIONS.find((t) => t.id === 'txn-ikea-refund-260117')!
  expect(transactionDisposition(transfer)).toBe('transfer')
  expect(transactionDisposition(refund)).toBe('income')
  expect(() => recategorised(transfer, 'groceries')).toThrow(/not a purchase/)
  expect(() => recategorised(refund, 'groceries')).toThrow(/not a purchase/)
})

test('a moved row moves exactly the budget figures that read it', () => {
  // Entertainment lists dining only, so it GAINS the row.
  expect(budgetSpent(ENTERTAINMENT, TRANSACTIONS)).toBe(123.76)
  expect(budgetSpent(ENTERTAINMENT, AFTER)).toBe(374.51)
  expect(budgetAvailable(ENTERTAINMENT, AFTER)).toBe(625.49)
  expect(budgetPercentLeft(ENTERTAINMENT, AFTER)).toBe(62)
  // Monthly lists all seven, so its totals cannot move...
  expect(budgetSpent(MONTHLY, AFTER)).toBe(2608.83)
  expect(budgetAvailable(MONTHLY, AFTER)).toBe(4891.17)
  expect(budgetPercentLeft(MONTHLY, AFTER)).toBe(65)
  // ...but its legend reorders: Shopping now leads, so it is the default-open row.
  const legend = budgetLegend(MONTHLY, AFTER)
  expect(legend[0].category).toBe('shopping')
  expect(legend.find((e) => e.category === 'groceries')!.spent).toBe(867.71)
  expect(legend.find((e) => e.category === 'dining')!.spent).toBe(374.51)
  expect(budgetLegend(MONTHLY, TRANSACTIONS)[0].category).toBe('groceries')
})

test("the ledger's filter and search never read a category", () => {
  const searches = ['', 'aeon', 'card', 'groceries', 'dining', 'shopping', 'bills', 'dining & leisure']
  const filters = [TRANSACTION_FILTER_ALL, TRANSACTION_FILTER_APPLIED]
  const ids = (ledger: Transaction[], filter: typeof TRANSACTION_FILTER_ALL, search: string) =>
    filterTransactions(ledger, filter, search).map((t) => t.id)
  for (const { id: to } of TRANSACTION_CATEGORIES) {
    const moved = TRANSACTIONS.map((t) => (canRecategorise(t) ? recategorised(t, to) : t))
    for (const filter of filters) {
      for (const search of searches) {
        expect(ids(moved, filter, search), `${to} / "${search}"`).toEqual(ids(TRANSACTIONS, filter, search))
      }
    }
  }
})

// ═══════════════════════════════ store access ═══════════════════════════════

type Rec = Record<string, unknown>

/** The `records` store, read straight from IndexedDB. `null` when the database does not exist. */
async function readRecords(page: Page): Promise<Rec | null> {
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

/** Wait for every write the app has queued so far. */
async function storeIdle(page: Page): Promise<void> {
  await page.evaluate(async (path) => {
    const store: { whenIdle: () => Promise<void> } = await import(path)
    await store.whenIdle()
  }, STORE_MODULE)
}

// ═══════════════════════════════ screen helpers ═════════════════════════════

const TRANSACTIONS_TAB = { id: 'transactions', label: 'Transactions' }
const sheetNamed = (page: Page, name: string) => page.getByRole('dialog', { name })
const categoryControl = (page: Page) => page.getByRole('button', { name: /^Change category, / })
const option = (page: Page, id: TransactionCategoryId) =>
  page.getByRole('option', { name: label(id), exact: true })

async function openLedger(page: Page): Promise<void> {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, TRANSACTIONS_TAB)
}

async function openRow(page: Page, text: string): Promise<void> {
  await page.locator(`.mvp-transactions__list > li:has-text("${text}") .mn-list-item`).click()
  await expect(sheetNamed(page, 'Transaction details')).toBeVisible()
}

async function pick(page: Page, id: TransactionCategoryId): Promise<void> {
  await categoryControl(page).click()
  await expect(sheetNamed(page, 'Select category')).toBeVisible()
  await option(page, id).click()
  await expect(sheetNamed(page, 'Transaction details')).toBeVisible()
}

/** Click a Finance tab whether or not it is already selected. */
async function tab(page: Page, name: string): Promise<void> {
  await page.getByRole('tab', { name }).click()
  await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true')
}

const box = async (locator: Locator) => {
  const b = await locator.boundingBox()
  if (!b) throw new Error('element has no box')
  return b
}
const near = (a: number, b: number, message: string) =>
  expect(Math.abs(a - b), `${message}: ${a} vs ${b}`).toBeLessThanOrEqual(1)

// ═════════════════════════════════ browser ══════════════════════════════════

test('the Category row changes the category through the app\'s own controls', async ({ page }) => {
  await openLedger(page)
  await openRow(page, DEMO_AMOUNT)
  await expect(categoryControl(page)).toHaveAccessibleName('Change category, Groceries')
  await pick(page, TO)
  await expect(sheetNamed(page, 'Select category')).toHaveCount(0)
  await expect(categoryControl(page)).toHaveText('Dining & Leisure')
  await expect(categoryControl(page)).toHaveAccessibleName('Change category, Dining & Leisure')
})

test('a recategorisation is KEPT across a reload', async ({ page }) => {
  await openLedger(page)
  await openRow(page, DEMO_AMOUNT)
  await pick(page, TO)
  await storeIdle(page)

  const records = await readRecords(page)
  const stored = records!.transactions as Transaction[]
  expect(stored.find((t) => t.id === DEMO_ID)!.category).toBe(TO)
  // Nothing else in the ledger moved.
  const seed = seedState().transactions
  expect(stored.filter((t) => t.id !== DEMO_ID)).toEqual(seed.filter((t) => t.id !== DEMO_ID))

  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await activateTab(page, TRANSACTIONS_TAB)
  await openRow(page, DEMO_AMOUNT)
  await expect(categoryControl(page)).toHaveText('Dining & Leisure')
})

test('every derived figure follows, on the screens that show it', async ({ page }) => {
  await openLedger(page)
  await openRow(page, DEMO_AMOUNT)
  await pick(page, TO)
  await page.keyboard.press('Escape')
  await expect(sheetNamed(page, 'Transaction details')).toHaveCount(0)

  // THE BUDGET TAB — reached through the tab bar, never by URL.
  await tab(page, 'Budget')
  const cardFor = (b: Budget) =>
    page.locator('.mvp-budget .mn-card-monthly-budget').filter({
      has: page.locator('.mn-card-monthly-budget__header-title', { hasText: b.name }),
    })
  await expect(cardFor(ENTERTAINMENT)).toContainText(`${budgetPercentLeft(ENTERTAINMENT, AFTER)}%`)
  await expect(cardFor(ENTERTAINMENT)).toContainText(formatMyr(budgetSpent(ENTERTAINMENT, AFTER)))
  await expect(cardFor(MONTHLY)).toContainText(`${budgetPercentLeft(MONTHLY, AFTER)}%`)

  // ENTERTAINMENT'S DRILL-DOWN — three Dining rows, Aeon Big among them.
  await page.getByRole('button', { name: `Details for ${ENTERTAINMENT.name}` }).click()
  // The drill-down has replaced the tab (whose cards carry rings of their own).
  await expect(page.locator('.mn-header-default__title')).toHaveText(ENTERTAINMENT.name)
  await expect(page.locator('.mn-progress-ring__amount')).toHaveText(availableLabel(ENTERTAINMENT, AFTER))
  const dining = page.locator('#budget-legend-dining li')
  await expect(dining).toHaveCount(3)
  await expect(page.locator('#budget-legend-dining')).toContainText('Aeon Big')
  await page.getByRole('button', { name: 'Back' }).click()

  // MONTHLY'S DRILL-DOWN — same totals, legend reordered, Shopping open.
  await page.getByRole('button', { name: `Details for ${MONTHLY.name}` }).click()
  await expect(page.locator('.mn-header-default__title')).toHaveText(MONTHLY.name)
  const legend = budgetLegend(MONTHLY, AFTER)
  const rows = page.locator('.mvp-budget-detail__legend-entry > .mn-chart-legend-item')
  await expect(rows.locator('.mn-chart-legend-item__title')).toHaveText(legend.map((e) => label(e.category)))
  await expect(rows.locator('.mn-chart-legend-item__amount')).toHaveText(legend.map((e) => formatMyr(e.spent)))
  await expect(rows.first()).toHaveAttribute('aria-expanded', 'true')
  await expect(rows.first().locator('.mn-chart-legend-item__title')).toHaveText('Shopping')
  await expect(page.locator('.mn-progress-ring__amount')).toHaveText(availableLabel(MONTHLY, AFTER))
})

test('a transfer and a refund offer no category control', async ({ page }) => {
  await openLedger(page)
  for (const row of ['15 Aug, 09:00', '+RM 129.00']) {
    await openRow(page, row)
    const sheet = sheetNamed(page, 'Transaction details')
    await expect(sheet.getByRole('button', { name: /Change category/ })).toHaveCount(0)
    await expect(sheet.locator('dt', { hasText: 'Category' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(sheet).toHaveCount(0)
  }
})

/**
 * THE PICKER HOLDS THE DETAIL VIEW'S HEIGHT, for the no-receipt row AND the
 * linked row (whose content scrolls). Also R89-9: the Category control's hit
 * area is at least 44×44 and does not move the row.
 */
async function expectPickerHolds(page: Page, amount: string): Promise<void> {
  await openRow(page, amount)
  const panel = page.locator('.mn-sheet__panel')
  const control = categoryControl(page)
  await control.scrollIntoViewIfNeeded()

  // R89-9 — the hit area, measured: 24 + 2 × 10 = 44, out of flow.
  const row = control.locator('xpath=ancestor::div[contains(@class, "mvp-txn-detail__row")][1]')
  const rowBox = await box(row)
  const c = await box(control)
  const hit = await control.evaluate((el) => {
    const s = getComputedStyle(el, '::after')
    const r = el.getBoundingClientRect()
    const top = r.top + parseFloat(s.top)
    const bottom = r.bottom - parseFloat(s.bottom)
    const left = r.left + parseFloat(s.left)
    const right = r.right - parseFloat(s.right)
    const hits = (x: number, y: number) =>
      document.elementFromPoint(x, y)?.closest('.mvp-txn-detail__row-action') === el
    return {
      width: right - left,
      height: bottom - top,
      position: s.position,
      reachesOutside: hits(left + 1, (top + bottom) / 2) && hits((left + right) / 2, top + 1) && hits((left + right) / 2, bottom - 1),
    }
  })
  expect(hit.position, `${amount}: the hit area is out of flow`).toBe('absolute')
  expect(hit.height, `${amount}: hit area height`).toBeGreaterThanOrEqual(44)
  expect(hit.width, `${amount}: hit area width`).toBeGreaterThanOrEqual(44)
  expect(hit.reachesOutside, `${amount}: the outset area hits the control`).toBe(true)
  near(rowBox.height, 40, `${amount}: the Category row keeps its height`)
  expect(c.height, `${amount}: the control is the value's own line`).toBeLessThanOrEqual(24)

  const detail = await box(panel)
  await control.click()
  await expect(sheetNamed(page, 'Select category')).toBeVisible()
  const picker = await box(panel)
  near(picker.height, detail.height, `${amount}: panel height`)
  near(picker.y, detail.y, `${amount}: panel top`)

  const header = await box(page.locator('.mn-sheet__panel .mn-overlay-header'))
  const title = await box(page.locator('.mn-sheet__panel .mn-overlay-header__title'))
  near(title.x + title.width / 2, header.x + header.width / 2, `${amount}: title centre`)

  const options = page.getByRole('option')
  await expect(options).toHaveCount(TRANSACTION_CATEGORIES.length)
  const first = await box(options.first())
  near(first.y, header.y + header.height, `${amount}: first option top vs header bottom`)
  for (let i = 0; i < TRANSACTION_CATEGORIES.length; i++) {
    near((await box(options.nth(i))).height, 48, `${amount}: option ${i} height`)
  }
  await expect(option(page, 'groceries')).toBeFocused()

  await page.getByRole('button', { name: 'Close' }).click()
  await expect(panel).toHaveCount(0)
}

test("the picker view holds the detail view's height [375]", async ({ page }) => {
  await openLedger(page)
  await expectPickerHolds(page, DEMO_AMOUNT)
  await expectPickerHolds(page, LINKED_AMOUNT)
})

test("the picker view holds the detail view's height [430]", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 812 })
  await openLedger(page)
  await expectPickerHolds(page, DEMO_AMOUNT)
  await expectPickerHolds(page, LINKED_AMOUNT)
})

test('Back, close and picking the current category change nothing', async ({ page }) => {
  await openLedger(page)
  await openRow(page, DEMO_AMOUNT)

  // BACK
  await categoryControl(page).click()
  await page.getByRole('button', { name: 'Back to transaction details' }).click()
  await expect(categoryControl(page)).toHaveText('Groceries')

  // ✕ AND ESCAPE, from the picker view
  await categoryControl(page).click()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(sheetNamed(page, 'Select category')).toHaveCount(0)
  await openRow(page, DEMO_AMOUNT)
  await categoryControl(page).click()
  await page.keyboard.press('Escape')
  await expect(sheetNamed(page, 'Select category')).toHaveCount(0)
  await openRow(page, DEMO_AMOUNT)
  await expect(categoryControl(page)).toHaveText('Groceries')

  // PICKING THE CURRENT CATEGORY WRITES NOTHING: the store never gains a record.
  await pick(page, 'groceries')
  await expect(categoryControl(page)).toHaveText('Groceries')
  await storeIdle(page)
  const records = await readRecords(page)
  expect(Object.keys(records ?? {}), 'nothing was stored').toEqual([])
})

test('focus moves into the picker and returns to the Category control', async ({ page }) => {
  await openLedger(page)
  await openRow(page, DEMO_AMOUNT)

  await categoryControl(page).click()
  await expect(option(page, 'groceries')).toBeFocused()
  await option(page, TO).click()
  await expect(categoryControl(page)).toBeFocused()
  await expect(categoryControl(page)).toHaveAccessibleName('Change category, Dining & Leisure')

  await categoryControl(page).click()
  await expect(option(page, TO)).toBeFocused()
  await page.getByRole('button', { name: 'Back to transaction details' }).click()
  await expect(categoryControl(page)).toBeFocused()
})
