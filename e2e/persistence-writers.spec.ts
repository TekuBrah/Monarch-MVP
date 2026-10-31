import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { PINNED_NOW, activateTab, gotoRoute } from './harness'
import {
  FIXTURE,
  RECEIPTS_TAB,
  TRANSACTIONS_TAB,
  capturedImageName,
  installResolvingExtraction,
  saveOneCapture,
  setReceiptSort,
} from './capture'
import { CRYPTO_HOLDINGS, FIAT_ACCOUNTS } from '../src/data/accounts'
import { BUDGETS } from '../src/data/budgets'
import {
  budgetAvailable,
  budgetLegend,
  budgetPercentLeft,
  budgetPeriodLabel,
  budgetSpent,
  goalsTotal,
  netWorth,
  toSen,
} from '../src/data/derive'
import { formatMyr, formatSignedMyr } from '../src/data/format'
import { GOALS } from '../src/data/goals'
import { buildHoldings } from '../src/data/holdings'
import { RECEIPTS } from '../src/data/receipts'
import { TRANSACTIONS, TRANSACTION_CATEGORIES } from '../src/data/transactions'
import type { Budget, TransactionCategoryId } from '../src/data/types'
import { seedFingerprint, seedState } from '../src/persistence/seed'
import { toStored } from '../src/persistence/boundary'
import { SCHEMA_VERSION } from '../src/persistence/schema'

/**
 * ──────────────── PERSISTENCE, WRITER BY WRITER — Gate 85-B ────────────────
 *
 * Gate 85 proved the storage layer: the Top-Up, a created goal and its first
 * uploaded image, a capture, and every failure path. It did NOT prove the
 * other writers. This file does, one writer per test, and adds the image
 * reference rule (1d) and the two capture facts' complements (1e).
 *
 * EVERY TEST HERE HAS THE SAME SHAPE:
 *
 *   1. act through the app's own controls (the reload rule's first half);
 *   2. wait for the write queue (`whenIdle`) and read the store STRAIGHT FROM
 *      IndexedDB — never through the app's own store module, so a defect in
 *      that module cannot vouch for itself (`persistence.spec.ts`'s rule);
 *   3. assert the stored change, AND that the records the writer must not
 *      touch are equal to the seed;
 *   4. reload ON PURPOSE and assert the screen shows the change was KEPT.
 *
 * Every test starts from an empty store: each Playwright test has its own
 * browser context, and so its own IndexedDB (proved on disk by
 * `persistence.spec.ts`'s first browser test).
 *
 * `readStore` and `storeIdle` are copied from `persistence.spec.ts` rather
 * than imported, because importing a spec file would register its tests a
 * second time.
 *
 * NO STRING HERE COMES FROM A RECEIPT PHOTOGRAPH. The readable extractions are
 * invented values already in this tree (`retake.spec.ts`, `link-editor.spec.ts`).
 */

const DB = 'monarch-mvp'
const STORE_MODULE = '/src/persistence/store.ts'
const ROTATED = 'e2e/fixtures/receipt-capture-rotated.jpg'

const SEED = seedState()
const MAIN = FIAT_ACCOUNTS[0]!
const JOINT = FIAT_ACCOUNTS[1]!
const BALI = GOALS.find((g) => g.id === 'goal-bali-trip')!
const EMERGENCY = GOALS.find((g) => g.id === 'goal-emergency-funds')!
const goalRoute = (id: string) => `/finance/plans/goals/${id}`
const SEED_NET_WORTH = netWorth(buildHoldings(FIAT_ACCOUNTS), CRYPTO_HOLDINGS, GOALS)

/** The receipt three walk states open, and the transaction it carries. */
const AEON_RECEIPT = RECEIPTS.find((r) => r.displayName === 'IMG_4806.jpg')!
const AEON_ROW = TRANSACTIONS.find((t) => t.id === AEON_RECEIPT.transactionId)!
/** Same merchant, NO receipt — linking here needs no confirmation. */
const FREE_ROW = TRANSACTIONS.find((t) => t.amount === -250.75)!
/** Carries `receipt-caring01`, so linking here DOES confirm (the swap). */
const CARING_RECEIPT = RECEIPTS.find((r) => r.displayName === 'IMG_4903.jpg')!
const TAKEN_ROW = TRANSACTIONS.find((t) => t.id === CARING_RECEIPT.transactionId)!

/** An extraction that reads nothing — the capture lands unlinked, with the advisory. */
const UNREAD = { merchant: null, capturedAt: null, total: null, tax: null, currency: 'MYR', lineItems: [] }
/**
 * An extraction that reads — `retake.spec.ts`'s invented values, with the date
 * moved to 19 Sept 2025 at midnight: the shape Teku saw on a device on 12 Oct
 * ("19 Sept, 00:00"). Its total matches no ledger row, so auto-match links nothing.
 */
const READ = {
  merchant: 'Kedai Contoh',
  capturedAt: '2025-09-19T00:00:00',
  total: 61.37,
  tax: null,
  currency: 'MYR',
  lineItems: [{ name: 'Sample widget', quantity: '1', price: 61.37 }],
}

/** A Top-Up figure no seeded row carries, so a figure locator finds only the written row. */
const TOP_UP = 37.21

// ─────────────────────────────── store access ───────────────────────────────

interface StoreDump {
  records: Record<string, unknown>
  imageIds: string[]
}

type Rec = Record<string, unknown>

/** The whole store, read straight from IndexedDB. `null` when the database does not exist. */
async function readStore(page: Page): Promise<StoreDump | null> {
  return page.evaluate(async (name) => {
    const databases = await indexedDB.databases()
    if (!databases.some((d) => d.name === name)) return null
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const all = (store: string) =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const tx = db.transaction(store)
        const keys = tx.objectStore(store).getAllKeys()
        const values = tx.objectStore(store).getAll()
        tx.oncomplete = () =>
          resolve(Object.fromEntries(keys.result.map((k, i) => [String(k), values.result[i]])))
        tx.onerror = () => reject(tx.error)
      })
    const records = await all('records')
    const images = await all('images')
    db.close()
    return { records, imageIds: Object.keys(images).sort() }
  }, DB)
}

/** Wait for every write the app has queued so far. */
async function storeIdle(page: Page): Promise<void> {
  await page.evaluate(async (path) => {
    const store: { whenIdle: () => Promise<void> } = await import(path)
    await store.whenIdle()
  }, STORE_MODULE)
}

/** Settle the queue, then read the store; fails if nothing was ever written. */
async function settled(page: Page): Promise<StoreDump> {
  await storeIdle(page)
  const dump = await readStore(page)
  expect(dump, 'the app opened its database').not.toBeNull()
  return dump!
}

const records = (dump: StoreDump, key: string): Rec[] => {
  const value = dump.records[key]
  expect(Array.isArray(value), `${key} is stored`).toBe(true)
  return value as Rec[]
}

/** The stored collection, minus the records whose ids are given. */
const without = (rows: readonly { id: string }[], ...ids: string[]) =>
  rows.filter((r) => !ids.includes(r.id))

async function reload(page: Page): Promise<void> {
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
}

// ─────────────────────────────── screen helpers ─────────────────────────────

/** Click a Finance tab whether or not it is already selected (`activateTab` refuses a no-op). */
async function tab(page: Page, name: string): Promise<void> {
  await page.getByRole('tab', { name }).click()
  await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true')
}

const card = (page: Page, name: string) => page.locator(`.mvp-receipt-card:has-text("${name}")`)
const viewer = (page: Page) => page.locator('[role="dialog"][aria-modal="true"]')
const closeViewer = (page: Page) =>
  page.locator('.mn-overlay-header__side--end .mn-overlay-header__control').click()
const ledgerRow = (page: Page, text: string) =>
  page.locator('.mvp-transactions__list > li').filter({ hasText: text })
const glyphOf = (row: Locator) => row.locator('.mn-list-item__amount-row svg')

async function openReceipts(page: Page): Promise<void> {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, RECEIPTS_TAB)
}

async function openViewerFor(page: Page, name: string): Promise<void> {
  await card(page, name).click()
  await expect(viewer(page)).toHaveCount(1)
}

/** Unlink the open receipt, then open the link picker. */
async function unlinkAndOpenPicker(page: Page): Promise<void> {
  await page.locator('.mn-modal__footer .mn-btn:has-text("Unlink receipt")').click()
  await page.locator('.mn-modal__footer .mn-btn:has-text("Link to transaction")').click()
  await expect(page.locator('.mvp-link-picker__context')).toHaveCount(1)
}

const pickerRow = (page: Page, amount: number) =>
  page.locator(`.mvp-link-picker .mn-list-item:has-text("${formatMyr(-amount)}")`)

/** The SHA-256 of the bytes an `<img>` is showing, once it has decoded. */
async function shownHash(img: Locator): Promise<string> {
  await expect(img).toHaveAttribute('src', /^blob:/)
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
  return img.evaluate(async (el: HTMLImageElement) => {
    const bytes = await (await fetch(el.src)).arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  })
}

const fileHash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')

async function topUp(page: Page, amount: number): Promise<void> {
  await page.locator('.mvp-finance-detail__actions .mn-btn--primary').click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input[name="amount"]').fill(amount.toFixed(2))
  await dialog.getByRole('button', { name: 'Confirm Top-Up' }).click()
  await expect(dialog).toHaveCount(0)
}

async function uploadGoalImage(page: Page, file: string): Promise<string> {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Edit image' }).click(),
  ])
  await chooser.setFiles(file)
  const img = page.locator('.mvp-goal-detail__image img')
  await shownHash(img)
  return (await img.getAttribute('src'))!
}

async function deleteOpenGoal(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Edit Goals' }).click()
  await page.getByRole('button', { name: 'Delete goal' }).click()
  await page.getByRole('dialog', { name: 'Delete goal?' }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('.mvp-plans')).toBeVisible()
}

async function createEmptyGoal(page: Page, name: string): Promise<void> {
  await gotoRoute(page, '/finance', 'light')
  await tab(page, 'Plans')
  await page.locator('.mvp-plans__section').first().getByRole('link', { name: 'Add New' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Goal Name').fill(name)
  await modal.getByLabel('Target Amount (RM)').fill('5000.00')
  await modal.getByLabel('Target date').fill('2027-05-30')
  await page.getByRole('button', { name: 'Save Goal' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.locator('.mvp-plans__goals > li', { hasText: name }).getByRole('button').click()
  await expect(page.locator('.mvp-goal-detail')).toContainText(name)
}

/** The Overview tab's hero and two cards, read WITHOUT navigating by URL. */
async function readOverview(page: Page) {
  await tab(page, 'Overview')
  const cards = page.locator('.mvp-finance__grid-item')
  // textContent, not innerText: the hero sets its cents in their own element, so
  // innerText breaks the figure across two lines (found by this test's first run).
  const text = async (l: Locator) => ((await l.textContent()) ?? '').trim()
  return {
    hero: await text(page.locator('.mvp-finance__networth-amount')),
    main: await text(cards.filter({ hasText: MAIN.name }).first()),
    goals: await text(cards.filter({ hasText: 'Goals' }).first()),
  }
}

// ═══════════════════════════════ 1a · receipts ══════════════════════════════

test('KEPT receipt link: a reload keeps the new link, and no other receipt or ledger row moved', async ({
  page,
}) => {
  await openReceipts(page)
  await openViewerFor(page, AEON_RECEIPT.displayName)
  await unlinkAndOpenPicker(page)
  await pickerRow(page, FREE_ROW.amount).click()
  await expect(page.locator('.mvp-receipt-viewer__link .mn-list-item__amount')).toHaveText(
    `-${formatMyr(-FREE_ROW.amount)}`,
  )
  await closeViewer(page)

  const dump = await settled(page)
  const receipts = records(dump, 'receipts') as { id: string; transactionId: string | null }[]
  expect(receipts.find((r) => r.id === AEON_RECEIPT.id)?.transactionId).toBe(FREE_ROW.id)
  expect(without(receipts, AEON_RECEIPT.id), 'every other receipt is the seed').toEqual(
    without(SEED.receipts, AEON_RECEIPT.id),
  )
  expect(records(dump, 'transactions'), 'the ledger did not follow the receipt').toEqual(SEED.transactions)

  await reload(page)
  await activateTab(page, RECEIPTS_TAB)
  await openViewerFor(page, AEON_RECEIPT.displayName)
  await expect(page.locator('.mvp-receipt-viewer__link .mn-chips')).toHaveText('Linked')
  await expect(page.locator('.mvp-receipt-viewer__link .mn-list-item__amount')).toHaveText(
    `-${formatMyr(-FREE_ROW.amount)}`,
  )
  await closeViewer(page)
  await activateTab(page, TRANSACTIONS_TAB)
  await expect(glyphOf(ledgerRow(page, `-${formatMyr(-FREE_ROW.amount)}`))).toHaveCount(1)
  await expect(glyphOf(ledgerRow(page, `-${formatMyr(-AEON_ROW.amount)}`))).toHaveCount(0)
  await expect(ledgerRow(page, `-${formatMyr(-FREE_ROW.amount)}`)).toHaveCount(1)
})

test('KEPT receipt unlink: a reload keeps the receipt unlinked and its old row without a glyph', async ({
  page,
}) => {
  await openReceipts(page)
  await openViewerFor(page, AEON_RECEIPT.displayName)
  await page.locator('.mn-modal__footer .mn-btn:has-text("Unlink receipt")').click()
  await expect(page.locator('.mn-modal__footer .mn-btn:has-text("Link to transaction")')).toHaveCount(1)
  await closeViewer(page)

  const dump = await settled(page)
  const receipts = records(dump, 'receipts') as { id: string; transactionId: string | null }[]
  expect(receipts.find((r) => r.id === AEON_RECEIPT.id)?.transactionId).toBeNull()
  expect(without(receipts, AEON_RECEIPT.id)).toEqual(without(SEED.receipts, AEON_RECEIPT.id))
  expect(records(dump, 'transactions')).toEqual(SEED.transactions)

  await reload(page)
  await activateTab(page, RECEIPTS_TAB)
  await expect(card(page, AEON_RECEIPT.displayName).locator('.mn-chips')).toHaveCount(0)
  await openViewerFor(page, AEON_RECEIPT.displayName)
  await expect(viewer(page).getByRole('button', { name: 'Link to transaction' })).toHaveCount(1)
  await expect(viewer(page).getByRole('button', { name: 'Unlink receipt' })).toHaveCount(0)
  await closeViewer(page)
  await activateTab(page, TRANSACTIONS_TAB)
  await expect(glyphOf(ledgerRow(page, `-${formatMyr(-AEON_ROW.amount)}`))).toHaveCount(0)
})

test('KEPT receipt swap: a reload keeps both halves of a Replace', async ({ page }) => {
  await openReceipts(page)
  await openViewerFor(page, AEON_RECEIPT.displayName)
  await unlinkAndOpenPicker(page)
  await pickerRow(page, TAKEN_ROW.amount).click()
  await page.locator('[role="dialog"]').last().locator('.mn-btn:has-text("Replace")').click()
  await expect(page.locator('.mvp-receipt-viewer__link .mn-list-item__amount')).toHaveText(
    `-${formatMyr(-TAKEN_ROW.amount)}`,
  )
  await closeViewer(page)

  const dump = await settled(page)
  const receipts = records(dump, 'receipts') as { id: string; transactionId: string | null }[]
  const link = (id: string) => receipts.find((r) => r.id === id)?.transactionId
  expect(link(AEON_RECEIPT.id), 'the picked receipt took the row').toBe(TAKEN_ROW.id)
  expect(link(CARING_RECEIPT.id), 'the incumbent was displaced, not deleted').toBeNull()
  expect(without(receipts, AEON_RECEIPT.id, CARING_RECEIPT.id)).toEqual(
    without(SEED.receipts, AEON_RECEIPT.id, CARING_RECEIPT.id),
  )
  expect(records(dump, 'transactions')).toEqual(SEED.transactions)

  await reload(page)
  await activateTab(page, RECEIPTS_TAB)
  await expect(page.locator('.mvp-receipt-card')).toHaveCount(RECEIPTS.length)
  await expect(card(page, CARING_RECEIPT.displayName).locator('.mn-chips')).toHaveCount(0)
  await openViewerFor(page, AEON_RECEIPT.displayName)
  await expect(page.locator('.mvp-receipt-viewer__link .mn-list-item__amount')).toHaveText(
    `-${formatMyr(-TAKEN_ROW.amount)}`,
  )
})

test('KEPT receipt edit: a reload keeps merchant, date, time and total, and the ledger did not follow', async ({
  page,
}) => {
  await openReceipts(page)
  await openViewerFor(page, AEON_RECEIPT.displayName)
  await page.locator('.mvp-receipt-details .mn-link').click()
  await page.locator('.mvp-receipt-editor input[type="text"]').fill('Aeon Big Wangsa Maju')
  await page.locator('.mvp-receipt-editor input[type="date"]').fill('2025-09-03')
  await page.locator('.mvp-receipt-editor input[type="time"]').fill('20:34')
  await page.locator('.mvp-receipt-editor input[type="number"]').fill('431.00')
  await page.locator('.mn-modal__footer .mn-btn').click()
  await expect(page.locator('.mvp-receipt-details__rows')).toContainText('Aeon Big Wangsa Maju')
  await closeViewer(page)

  const dump = await settled(page)
  const receipts = records(dump, 'receipts')
  const edited = receipts.find((r) => r.id === AEON_RECEIPT.id)!
  expect({ merchant: edited.merchant, capturedAt: edited.capturedAt, total: edited.total }).toEqual({
    merchant: 'Aeon Big Wangsa Maju',
    capturedAt: '2025-09-03T20:34:00',
    total: 431,
  })
  // Everything the editor may not touch, untouched.
  const seeded = SEED.receipts.find((r) => r.id === AEON_RECEIPT.id)!
  expect({ ...edited, merchant: seeded.merchant, capturedAt: seeded.capturedAt, total: seeded.total }).toEqual(
    seeded,
  )
  expect(without(receipts as { id: string }[], AEON_RECEIPT.id)).toEqual(
    without(SEED.receipts, AEON_RECEIPT.id),
  )
  expect(records(dump, 'transactions')).toEqual(SEED.transactions)

  await reload(page)
  await activateTab(page, RECEIPTS_TAB)
  await openViewerFor(page, AEON_RECEIPT.displayName)
  await expect(page.locator('.mvp-receipt-details__rows')).toHaveText(
    'MerchantAeon Big Wangsa MajuDate03 Sept 2025, 20:34TotalRM 431.00',
  )
  await expect(page.locator('.mvp-receipt-details__mismatch')).toHaveText(
    `This receipt's total is RM 431.00, and the transaction is ${formatMyr(-AEON_ROW.amount)}.`,
  )
})

test('KEPT receipt delete: a reload keeps a seeded receipt deleted, and its row loses the glyph', async ({
  page,
}) => {
  await openReceipts(page)
  await openViewerFor(page, AEON_RECEIPT.displayName)
  await viewer(page).getByRole('button', { name: 'Delete receipt' }).click()
  await page
    .getByRole('dialog', { name: 'Delete receipt?' })
    .getByRole('button', { name: 'Delete', exact: true })
    .click()
  await expect(page.locator('[role="dialog"]')).toHaveCount(0)

  const dump = await settled(page)
  expect(records(dump, 'receipts')).toEqual(without(SEED.receipts, AEON_RECEIPT.id))
  expect(records(dump, 'transactions')).toEqual(SEED.transactions)

  await reload(page)
  await activateTab(page, RECEIPTS_TAB)
  await expect(page.locator('.mvp-receipt-card')).toHaveCount(RECEIPTS.length - 1)
  await expect(card(page, AEON_RECEIPT.displayName)).toHaveCount(0)
  await activateTab(page, TRANSACTIONS_TAB)
  await expect(ledgerRow(page, `-${formatMyr(-AEON_ROW.amount)}`)).toHaveCount(1)
  await expect(glyphOf(ledgerRow(page, `-${formatMyr(-AEON_ROW.amount)}`))).toHaveCount(0)
})

test('KEPT receipt replace: a reload keeps the replacement, its inherited link and its bytes, and the original bytes are gone', async ({
  page,
}) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, TRANSACTIONS_TAB)
  await installResolvingExtraction(page, UNREAD)
  const row = page.locator(`.mvp-transactions__list > li:has-text("${formatMyr(-FREE_ROW.amount)}") .mn-list-item`)
  await row.click()
  const sheet = page.locator('[role="dialog"]:has-text("Transaction details")')
  await sheet.locator('.mvp-txn-detail__prompt .mn-btn').click()
  const gallery = page.locator('.mvp-source-picker__row:has-text("Photo Gallery")')
  const [first] = await Promise.all([page.waitForEvent('filechooser'), gallery.click()])
  await first.setFiles(FIXTURE)
  await expect(sheet.locator('.mn-inline-message__title')).toHaveText("We couldn't read this photo")

  const before = await settled(page)
  const original = records(before, 'receipts').find((r) => r.transactionId === FREE_ROW.id)!
  expect(original.imageId).toMatch(/^img-/)
  expect(before.imageIds).toEqual([original.imageId])

  const retake = sheet.getByRole('button', { name: 'Choose another photo' })
  const [second] = await Promise.all([page.waitForEvent('filechooser'), retake.click()])
  await installResolvingExtraction(page, READ)
  await second.setFiles(ROTATED)
  await expect(viewer(page).locator('.mvp-receipt-details')).toContainText('Kedai Contoh')

  const after = await settled(page)
  const receipts = records(after, 'receipts')
  expect(receipts.map((r) => r.id), 'the original is gone').not.toContain(original.id)
  const replacement = receipts.find((r) => r.transactionId === FREE_ROW.id)!
  expect(replacement.id).not.toBe(original.id)
  expect(replacement.imageId).toMatch(/^img-/)
  expect(replacement.imageId).not.toBe(original.imageId)
  expect(after.imageIds, "only the replacement's bytes are stored").toEqual([replacement.imageId])
  expect(replacement.captureSource).toBe('gallery')
  expect(replacement.capturedAtRead).toBe(true)
  expect(without(receipts as { id: string }[], replacement.id as string)).toEqual(SEED.receipts)
  expect(records(after, 'transactions')).toEqual(SEED.transactions)

  await reload(page)
  await activateTab(page, TRANSACTIONS_TAB)
  await row.click()
  await expect(sheet.locator('.mvp-txn-detail__receipt-head')).toHaveCount(1)
  await expect(sheet.locator('.mn-inline-message')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await activateTab(page, RECEIPTS_TAB)
  await expect(page.locator('.mvp-receipt-card')).toHaveCount(RECEIPTS.length + 1)
  await page.locator('.mvp-receipt-card').first().click()
  await expect(viewer(page).locator('.mvp-receipt-details')).toContainText('Kedai Contoh')
  await expect(viewer(page).getByRole('button', { name: 'Unlink receipt' })).toHaveCount(1)
  expect(await shownHash(viewer(page).locator('img.mvp-receipt-viewer__image'))).toBe(fileHash(ROTATED))
})

// ═══════════════════════════════ 1b · goals ═════════════════════════════════

test('KEPT goal edit: a reload keeps name, target, target date, auto-save amount and funding source', async ({
  page,
}) => {
  await gotoRoute(page, goalRoute(BALI.id), 'light')
  await page.getByRole('button', { name: 'Edit Goals' }).click()
  const modal = page.getByRole('dialog', { name: 'Edit Goal' })
  await modal.getByLabel('Goal Name').fill('Bali Honeymoon')
  await modal.getByLabel('Target Amount (RM)').fill('6000.00')
  await modal.getByLabel('Target date').fill('2027-03-31')
  await modal.getByLabel('Auto-Save Amount / Month (RM)').fill('300.00')
  await modal.locator('.mvp-goal-form__source .mn-select').click()
  await page.getByRole('dialog', { name: 'Select funding source' }).locator('[role="option"]').nth(1).click()
  const form = page.getByRole('dialog', { name: 'Edit Goal' })
  await expect(form.locator('.mvp-goal-form__source .mn-select__input')).toHaveValue(JOINT.name)
  await form.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const dump = await settled(page)
  const goals = records(dump, 'goals')
  expect(goals.find((g) => g.id === BALI.id)).toEqual({
    ...BALI,
    name: 'Bali Honeymoon',
    targetAmount: 6000,
    targetDate: '2027-03-31',
    fundingAccountId: JOINT.id,
    autoSave: { isEnabled: true, amount: 300 },
  })
  expect(without(goals as { id: string }[], BALI.id)).toEqual(without(GOALS, BALI.id))
  expect(records(dump, 'fiatAccounts'), 'an edit moves no money').toEqual(FIAT_ACCOUNTS)
  expect(records(dump, 'transactions')).toEqual(SEED.transactions)

  await reload(page)
  await expect(page.locator('.mn-header-default')).toContainText('Bali Honeymoon')
  await expect(page.locator('.mn-progress-bar__total')).toHaveText(formatMyr(6000))
  await expect(page.locator('.mn-progress-bar__current')).toHaveText(formatMyr(BALI.savedAmount))
  await expect(page.locator('.mvp-goal-detail__target')).toContainText('March 2027')
  await expect(page.locator('.mvp-goal-detail__autosave-amount')).toContainText('RM 300.00/mth')
  await page.getByRole('button', { name: 'Edit Goals' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Edit Goal' }).locator('.mvp-goal-form__source .mn-select__input'),
  ).toHaveValue(JOINT.name)
})

test('KEPT goal auto-save switch: a reload keeps it off, with its amount', async ({ page }) => {
  await gotoRoute(page, goalRoute(BALI.id), 'light')
  const toggle = page.locator('.mvp-goal-detail__autosave [role="switch"]')
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await page.locator('.mvp-goal-detail__autosave .mn-toggle').click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')

  const dump = await settled(page)
  const goals = records(dump, 'goals')
  expect(goals.find((g) => g.id === BALI.id)).toEqual({
    ...BALI,
    autoSave: { isEnabled: false, amount: BALI.autoSave.amount },
  })
  expect(without(goals as { id: string }[], BALI.id)).toEqual(without(GOALS, BALI.id))
  expect(records(dump, 'transactions'), 'the switch writes no ledger row').toEqual(SEED.transactions)

  await reload(page)
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('.mvp-goal-detail__autosave-amount')).toContainText(
    `${formatMyr(BALI.autoSave.amount)}/mth`,
  )
})

test('KEPT goal auto-save pencil: a reload keeps the new amount, and the switch did not move', async ({
  page,
}) => {
  await gotoRoute(page, goalRoute(EMERGENCY.id), 'light')
  await page.getByRole('button', { name: 'Edit auto-save amount' }).click()
  const modal = page.getByRole('dialog', { name: 'Auto-Save amount' })
  await modal.getByLabel('Auto-Save Amount / Month (RM)').fill('450.00')
  await modal.getByRole('button', { name: 'Save Amount' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const dump = await settled(page)
  const goals = records(dump, 'goals')
  expect(goals.find((g) => g.id === EMERGENCY.id)).toEqual({
    ...EMERGENCY,
    autoSave: { isEnabled: EMERGENCY.autoSave.isEnabled, amount: 450 },
  })
  expect(without(goals as { id: string }[], EMERGENCY.id)).toEqual(without(GOALS, EMERGENCY.id))

  await reload(page)
  await expect(page.locator('.mvp-goal-detail__autosave-amount')).toContainText('RM 450.00/mth')
  await expect(page.locator('.mvp-goal-detail__autosave [role="switch"]')).toHaveAttribute(
    'aria-checked',
    String(EMERGENCY.autoSave.isEnabled),
  )
})

test('KEPT goal delete with a balance: a reload keeps the goal gone, the return row, the credit, and net worth', async ({
  page,
}) => {
  await gotoRoute(page, goalRoute(BALI.id), 'light')
  await deleteOpenGoal(page)

  const dump = await settled(page)
  expect(records(dump, 'goals')).toEqual(without(GOALS, BALI.id))
  const transactions = records(dump, 'transactions')
  expect(transactions, 'exactly one row was written').toHaveLength(SEED.transactions.length + 1)
  expect(transactions.slice(0, SEED.transactions.length)).toEqual(SEED.transactions)
  const refund = transactions[SEED.transactions.length]!
  expect({
    goalId: refund.goalId,
    accountId: refund.accountId,
    kind: refund.kind,
    amount: refund.amount,
  }).toEqual({ goalId: BALI.id, accountId: BALI.fundingAccountId, kind: 'transfer', amount: BALI.savedAmount })
  expect(refund.reference).toMatch(/^MNRC\d{8}[0-9A-HJKMNP-TV-Z]{6}$/)
  const accounts = records(dump, 'fiatAccounts') as { id: string; balance: number }[]
  expect(accounts.find((a) => a.id === MAIN.id)?.balance).toBe((toSen(MAIN.balance) + toSen(BALI.savedAmount)) / 100)
  expect(without(accounts, MAIN.id)).toEqual(without(FIAT_ACCOUNTS, MAIN.id))
  expect(dump.imageIds, 'a seeded goal names no stored image').toEqual([])

  await reload(page)
  await tab(page, 'Plans')
  await expect(page.locator('.mvp-plans__goals > li')).toHaveCount(GOALS.length - 1)
  await expect(page.locator('.mvp-plans__goals')).not.toContainText(BALI.name)
  const overview = await readOverview(page)
  expect(overview.hero, 'net worth did not move').toBe(formatMyr(SEED_NET_WORTH))
  expect(overview.main).toContain(formatMyr((toSen(MAIN.balance) + toSen(BALI.savedAmount)) / 100))
  expect(overview.goals).toContain(formatMyr(goalsTotal([EMERGENCY])))
  await tab(page, 'Transactions')
  await expect(ledgerRow(page, `+${formatMyr(BALI.savedAmount)}`)).toHaveCount(1)
})

test('KEPT goal delete at RM 0: a reload shows the goal gone and no row written', async ({ page }) => {
  await createEmptyGoal(page, 'Spare Fund')
  const created = (records(await settled(page), 'goals') as { id: string; name: string }[]).find(
    (g) => g.name === 'Spare Fund',
  )!
  expect(created).toBeDefined()
  await deleteOpenGoal(page)

  const dump = await settled(page)
  expect(records(dump, 'goals'), 'the created goal is gone, the seed goals untouched').toEqual(GOALS)
  expect(records(dump, 'transactions'), 'no row was written').toEqual(SEED.transactions)
  expect(records(dump, 'fiatAccounts')).toEqual(FIAT_ACCOUNTS)

  await reload(page)
  await tab(page, 'Plans')
  await expect(page.locator('.mvp-plans__goals > li')).toHaveCount(GOALS.length)
  await expect(page.locator('.mvp-plans__goals')).not.toContainText('Spare Fund')
  await tab(page, 'Transactions')
  await expect(page.locator('.mvp-transactions__list > li')).toHaveCount(TRANSACTIONS.length)
})

// ═══════════════════════════════ 1c · budgets ═══════════════════════════════

const MONTHLY = BUDGETS.find((b) => b.id === 'budget-monthly')!
const categoryLabel = (id: TransactionCategoryId) => TRANSACTION_CATEGORIES.find((c) => c.id === id)!.label
const availableLabel = (b: Budget) => {
  const a = budgetAvailable(b, TRANSACTIONS)
  return a < 0 ? formatSignedMyr(a) : formatMyr(a)
}

/** `budget-writers.spec.ts`'s form filler, for the fields this file needs. */
async function fillBudgetForm(
  modal: Locator,
  values: { name: string; categories: TransactionCategoryId[]; amount: string; from: string; to: string },
): Promise<void> {
  await modal.getByLabel('Name').fill(values.name)
  await modal.getByRole('combobox', { name: 'Category' }).click()
  const picker = modal.page().getByRole('dialog', { name: 'Select category' })
  for (const option of await picker.getByRole('option').all()) {
    const name = (await option.textContent())?.trim() ?? ''
    const wanted = values.categories.some((c) => categoryLabel(c) === name)
    const picked = (await option.getAttribute('aria-selected')) === 'true'
    if (wanted !== picked) await option.click()
  }
  const count = values.categories.length
  await picker.getByRole('button', { name: `Add ${count} ${count === 1 ? 'Category' : 'Categories'}` }).click()
  await expect(modal.getByRole('option')).toHaveCount(0)
  await modal.getByLabel('Amount (RM)').fill(values.amount)
  await modal.getByLabel('Date (From)').fill(values.from)
  await modal.getByLabel('Date (To)').fill(values.to)
}

/** Every derived figure the drilldown prints — recomputed from the seed ledger. */
async function expectBudgetDrilldown(page: Page, budget: Budget): Promise<void> {
  await expect(page.locator('.mn-header-default__title')).toHaveText(budget.name)
  await expect(page.locator('.mn-progress-ring__amount')).toHaveText(availableLabel(budget))
  await expect(page.locator('.mn-progress-ring__caption-pct')).toContainText(
    String(budgetPercentLeft(budget, TRANSACTIONS)),
  )
  await expect(page.locator('.mvp-budget-detail__info dd')).toHaveText([
    formatMyr(budget.limit),
    budgetPeriodLabel(budget, PINNED_NOW.getFullYear()),
    availableLabel(budget),
    formatMyr(budgetSpent(budget, TRANSACTIONS)),
  ])
  const legend = budgetLegend(budget, TRANSACTIONS)
  await expect(page.locator('.mn-chart-legend-item__title')).toHaveText(legend.map((e) => categoryLabel(e.category)))
}

const CREATED_BUDGET: Omit<Budget, 'id'> = {
  name: 'Weekend Shop',
  categories: ['groceries', 'shopping'],
  limit: 2000,
  from: '2025-09-01',
  to: '2025-09-10',
  autoRenew: false,
}

test('KEPT budget create: a reload keeps it, with spent, left and percent derived', async ({ page }) => {
  // The guard: the invented budget really does spend something, so the figures are not all zero.
  expect(budgetSpent({ id: 'probe', ...CREATED_BUDGET }, TRANSACTIONS)).toBeGreaterThan(0)
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'budget', label: 'Budget' })
  await page.getByRole('button', { name: 'Add New Budget' }).click()
  const modal = page.getByRole('dialog', { name: 'Create A Budget' })
  await fillBudgetForm(modal, {
    name: CREATED_BUDGET.name,
    categories: CREATED_BUDGET.categories,
    amount: CREATED_BUDGET.limit.toFixed(2),
    from: CREATED_BUDGET.from,
    to: CREATED_BUDGET.to,
  })
  await modal.getByRole('button', { name: 'Save Budget' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const dump = await settled(page)
  const budgets = records(dump, 'budgets') as unknown as Budget[]
  expect(budgets).toHaveLength(BUDGETS.length + 1)
  expect(budgets.slice(0, BUDGETS.length)).toEqual(BUDGETS)
  const created = budgets[BUDGETS.length]!
  expect(created.id).toMatch(/^budget-[0-9a-f-]{36}$/)
  expect(created).toEqual({ id: created.id, ...CREATED_BUDGET })

  await reload(page)
  await tab(page, 'Budget')
  const cards = page.locator('.mvp-budget .mn-card-monthly-budget:not(.mn-card-monthly-budget--add-new)')
  await expect(cards).toHaveCount(BUDGETS.length + 1)
  const last = cards.nth(BUDGETS.length)
  await expect(last.locator('.mn-card-monthly-budget__header-title')).toHaveText(CREATED_BUDGET.name)
  await expect(last).toContainText(`${budgetPercentLeft(created, TRANSACTIONS)}%`)
  await expect(last).toContainText(availableLabel(created))
  await expect(last).toContainText(formatMyr(budgetSpent(created, TRANSACTIONS)))
  await page.getByRole('button', { name: `Details for ${CREATED_BUDGET.name}` }).click()
  await expect(page).toHaveURL(new RegExp(`/finance/budget/${created.id}$`))
  await expectBudgetDrilldown(page, created)
})

test('KEPT budget edit: a reload keeps every edited field, auto-renew included, with figures re-derived', async ({
  page,
}) => {
  const edited: Budget = {
    ...MONTHLY,
    name: 'Monthly Essentials',
    categories: ['bills', 'groceries', 'healthcare'],
    limit: 1500,
    from: '2025-09-01',
    to: '2025-09-15',
    autoRenew: !MONTHLY.autoRenew,
  }
  await gotoRoute(page, `/finance/budget/${MONTHLY.id}`, 'light')
  await page.getByRole('link', { name: 'Edit' }).click()
  const modal = page.getByRole('dialog', { name: 'Edit Budget' })
  await fillBudgetForm(modal, {
    name: edited.name,
    categories: edited.categories,
    amount: edited.limit.toFixed(2),
    from: edited.from,
    to: edited.to,
  })
  await modal.locator('.mvp-budget-form__renew .mn-toggle').click()
  await expect(modal.locator('.mvp-budget-form__renew [role="switch"]')).toHaveAttribute(
    'aria-checked',
    String(edited.autoRenew),
  )
  await modal.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const dump = await settled(page)
  const budgets = records(dump, 'budgets') as unknown as Budget[]
  expect(budgets.find((b) => b.id === MONTHLY.id)).toEqual(edited)
  expect(without(budgets, MONTHLY.id)).toEqual(without(BUDGETS, MONTHLY.id))

  await reload(page)
  await expectBudgetDrilldown(page, edited)
  await page.getByRole('link', { name: 'Edit' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Edit Budget' }).locator('.mvp-budget-form__renew [role="switch"]'),
  ).toHaveAttribute('aria-checked', String(edited.autoRenew))
})

// ═══════════════════════════ 1d · the image reference rule ══════════════════

test('KEPT images i: a capture keeps its bytes through link and edit, and loses them only when deleted', async ({
  page,
}) => {
  await openReceipts(page)
  await installResolvingExtraction(page, UNREAD)
  await saveOneCapture(page, 'Photo Gallery')
  const name = capturedImageName(PINNED_NOW)

  const captured = await settled(page)
  const receiptOf = (dump: StoreDump) => records(dump, 'receipts').find((r) => r.displayName === name)!
  const imageId = receiptOf(captured).imageId as string
  expect(imageId).toMatch(/^img-/)
  expect(captured.imageIds).toEqual([imageId])

  // LINK — a write to the receipt that must not release its bytes.
  await openViewerFor(page, name)
  await page.locator('.mn-modal__footer .mn-btn:has-text("Link to transaction")').click()
  await pickerRow(page, FREE_ROW.amount).click()
  const linked = await settled(page)
  expect(receiptOf(linked).transactionId).toBe(FREE_ROW.id)
  expect(receiptOf(linked).imageId, 'the same bytes, under the same id').toBe(imageId)
  expect(linked.imageIds).toEqual([imageId])

  // EDIT — another write that must not release them.
  await page.locator('.mvp-receipt-details .mn-link').click()
  await page.locator('.mvp-receipt-editor input[type="text"]').fill('Kedai Contoh')
  // An unread capture opens with an EMPTY total (Gate 58), which the editor refuses.
  await page.locator('.mvp-receipt-editor input[type="number"]').fill('61.37')
  await page.locator('.mn-modal__footer .mn-btn').click()
  await expect(page.locator('.mvp-receipt-details__rows')).toContainText('Kedai Contoh')
  const edited = await settled(page)
  expect(receiptOf(edited).merchant).toBe('Kedai Contoh')
  expect(edited.imageIds).toEqual([imageId])

  // DELETE — and only now are the bytes gone.
  await viewer(page).getByRole('button', { name: 'Delete receipt' }).click()
  await page
    .getByRole('dialog', { name: 'Delete receipt?' })
    .getByRole('button', { name: 'Delete', exact: true })
    .click()
  await expect(page.locator('[role="dialog"]')).toHaveCount(0)
  const deleted = await settled(page)
  expect(records(deleted, 'receipts')).toEqual(SEED.receipts)
  expect(deleted.imageIds, 'the bytes left the store with the receipt').toEqual([])

  await reload(page)
  await activateTab(page, RECEIPTS_TAB)
  await expect(page.locator('.mvp-receipt-card')).toHaveCount(RECEIPTS.length)
})

test('KEPT images ii: a deleted goal keeps its uploaded image on the rows that name it, and they decode after a reload', async ({
  page,
}) => {
  expect(TRANSACTIONS.some((t) => toSen(Math.abs(t.amount)) === toSen(TOP_UP)), 'TOP_UP is unique').toBe(false)
  const refund = (toSen(BALI.savedAmount) + toSen(TOP_UP)) / 100
  expect(TRANSACTIONS.some((t) => toSen(Math.abs(t.amount)) === toSen(refund)), 'the refund is unique').toBe(false)

  await gotoRoute(page, goalRoute(BALI.id), 'light')
  await uploadGoalImage(page, FIXTURE)
  await topUp(page, TOP_UP)
  await deleteOpenGoal(page)

  const dump = await settled(page)
  expect(records(dump, 'goals').map((g) => g.id)).not.toContain(BALI.id)
  expect(dump.imageIds, 'the goal is gone but its rows still name the bytes').toHaveLength(1)
  const [imageId] = dump.imageIds
  const named = records(dump, 'transactions').filter(
    (t) => (t.logo as Rec).kind === 'goal' && (t.logo as Rec).origin === 'upload',
  )
  expect(named.map((t) => t.amount).sort()).toEqual([-TOP_UP, refund].sort())
  for (const t of named) expect((t.logo as Rec).filename, 'a row stores the image id').toBe(imageId)

  // IN THIS SESSION FIRST — nothing revoked the URL the rows render.
  await tab(page, 'Transactions')
  expect(await shownHash(ledgerRow(page, `-${formatMyr(TOP_UP)}`).locator('img'))).toBe(fileHash(FIXTURE))

  await reload(page)
  await tab(page, 'Transactions')
  for (const text of [`-${formatMyr(TOP_UP)}`, `+${formatMyr(refund)}`]) {
    const row = ledgerRow(page, text)
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(BALI.name)
    expect(await shownHash(row.locator('img')), `${text} still shows the uploaded image`).toBe(fileHash(FIXTURE))
  }
})

test('KEPT images iii: a replaced goal image keeps its old bytes while a ledger row still names them', async ({
  page,
}) => {
  await gotoRoute(page, goalRoute(BALI.id), 'light')
  await uploadGoalImage(page, FIXTURE)
  await topUp(page, TOP_UP)
  await uploadGoalImage(page, ROTATED)

  const dump = await settled(page)
  const goalImage = records(dump, 'goals').find((g) => g.id === BALI.id)!.image as string
  const row = records(dump, 'transactions').find((t) => t.amount === -TOP_UP)!
  const rowImage = (row.logo as Rec).filename as string
  expect(goalImage).not.toBe(rowImage)
  expect(dump.imageIds, 'both images are named, so both are kept').toEqual([goalImage, rowImage].sort())

  await reload(page)
  expect(await shownHash(page.locator('.mvp-goal-detail__image img')), 'the goal shows the new image').toBe(
    fileHash(ROTATED),
  )
  await page.locator('.mn-header-default button').first().click()
  await tab(page, 'Transactions')
  expect(
    await shownHash(ledgerRow(page, `-${formatMyr(TOP_UP)}`).locator('img')),
    'the earlier row keeps the image it was written with',
  ).toBe(fileHash(FIXTURE))
})

test('KEPT images iv: a replaced goal image nothing else names is released from the store', async ({ page }) => {
  await gotoRoute(page, goalRoute(BALI.id), 'light')
  const first = await uploadGoalImage(page, FIXTURE)
  const once = await settled(page)
  expect(once.imageIds).toHaveLength(1)
  const firstId = once.imageIds[0]

  await page.evaluate(() => {
    const revoke = URL.revokeObjectURL.bind(URL)
    const w = window as unknown as { __revoked: string[] }
    w.__revoked = []
    URL.revokeObjectURL = (url: string) => {
      w.__revoked.push(url)
      revoke(url)
    }
  })
  await uploadGoalImage(page, ROTATED)
  const twice = await settled(page)
  const goalImage = records(twice, 'goals').find((g) => g.id === BALI.id)!.image as string
  expect(goalImage).not.toBe(firstId)
  expect(twice.imageIds, 'only the image the goal names is stored').toEqual([goalImage])
  expect(await page.evaluate(() => (window as unknown as { __revoked: string[] }).__revoked)).toContain(first)

  await reload(page)
  expect(await shownHash(page.locator('.mvp-goal-detail__image img'))).toBe(fileHash(ROTATED))
})

test('KEPT images v: deleting an empty goal with an uploaded image leaves no bytes behind', async ({ page }) => {
  await createEmptyGoal(page, 'Spare Fund')
  await uploadGoalImage(page, FIXTURE)
  expect((await settled(page)).imageIds).toHaveLength(1)
  await deleteOpenGoal(page)

  const dump = await settled(page)
  expect(records(dump, 'goals')).toEqual(GOALS)
  expect(records(dump, 'transactions'), 'an empty goal writes no row to keep the image').toEqual(SEED.transactions)
  expect(dump.imageIds, 'nothing names the bytes, so they are gone').toEqual([])

  await reload(page)
  await tab(page, 'Plans')
  await expect(page.locator('.mvp-plans__goals > li')).toHaveCount(GOALS.length)
})

// ═══════════════════════════════ 1e · capture facts ═════════════════════════

test('KEPT facts: a camera capture stays a camera capture after a reload', async ({ page }) => {
  await openReceipts(page)
  await installResolvingExtraction(page, UNREAD)
  await saveOneCapture(page, 'Camera')

  const dump = await settled(page)
  const stored = records(dump, 'receipts').find((r) => String(r.id).startsWith('receipt-capture-'))!
  expect(stored.captureSource).toBe('camera')
  expect(stored.capturedAtRead).toBe(false)

  await reload(page)
  await activateTab(page, RECEIPTS_TAB)
  await page.locator('.mvp-receipt-card').first().click()
  await expect(viewer(page).getByRole('button', { name: 'Retake photo' })).toHaveCount(1)
  await expect(viewer(page).getByRole('button', { name: 'Choose another photo' })).toHaveCount(0)
})

test('KEPT facts: a capture whose date WAS read stays dated after a reload', async ({ page }) => {
  await openReceipts(page)
  await installResolvingExtraction(page, READ)
  await saveOneCapture(page, 'Photo Gallery')

  const dump = await settled(page)
  const stored = records(dump, 'receipts').find((r) => String(r.id).startsWith('receipt-capture-'))!
  expect(stored.capturedAtRead).toBe(true)
  expect(stored.captureSource).toBe('gallery')
  expect(stored.capturedAt).toBe(READ.capturedAt)

  await reload(page)
  await activateTab(page, RECEIPTS_TAB)
  await setReceiptSort(page, 'Receipt date')
  await expect(page.locator('.mvp-receipts__month').filter({ hasText: 'No receipt date' })).toHaveCount(0)
  const group = page.locator('.mvp-receipts__month').filter({ has: card(page, capturedImageName(PINNED_NOW)) })
  await expect(group.locator('.mvp-section-header')).toHaveText('September 2025')
})

test('KEPT facts: a capture date label and its group heading are the same after a reload', async ({ page }) => {
  await openReceipts(page)
  await installResolvingExtraction(page, READ)
  await saveOneCapture(page, 'Photo Gallery')
  const name = capturedImageName(PINNED_NOW)

  const read = async () => {
    const group = page.locator('.mvp-receipts__month').filter({ has: card(page, name) })
    await expect(group).toHaveCount(1)
    return {
      label: (await card(page, name).locator('.mvp-receipt-card__date').innerText()).trim(),
      heading: (await group.locator('.mvp-section-header').innerText()).trim(),
    }
  }
  const before = await read()
  const stored = records(await settled(page), 'receipts').find((r) => r.displayName === name)!

  /*
    REPORTED, NOT ASSERTED. Under the default "Date added" sort the heading is
    the month the receipt was ADDED (Gate 58, ruling C) and the label is the
    date PRINTED on the paper, so the two can name different months by design.
    Whether they do here is written to the test's annotations for the record.
  */
  test.info().annotations.push({
    type: 'label-vs-heading',
    description: `before reload: label "${before.label}" under heading "${before.heading}"`,
  })

  await reload(page)
  await activateTab(page, RECEIPTS_TAB)
  expect(await read(), 'a reload changed neither the label nor the heading').toEqual(before)
  const after = records(await settled(page), 'receipts').find((r) => r.displayName === name)!
  expect({ capturedAt: after.capturedAt, addedAt: after.addedAt }).toEqual({
    capturedAt: stored.capturedAt,
    addedAt: stored.addedAt,
  })
})

// ═══════════════════════════════ Gate 93 · sends ════════════════════════════

test('KEPT send: a reload keeps the row, its recipient and the debit, and the success page re-reads it', async ({
  page,
}) => {
  await gotoRoute(page, '/transfer', 'light')
  await page.locator('.mvp-transfer__list > li', { hasText: 'Rachum Greene' }).getByRole('button').click()
  await page.getByRole('combobox', { name: 'Transfer Amount' }).fill('100.00')
  await page.getByRole('button', { name: 'Transfer money' }).click()
  await page.getByRole('dialog', { name: 'Review transfer' }).getByRole('button', { name: 'Transfer now' }).click()
  await expect(page).toHaveURL(/\/transfer\/done\/txn-send-[0-9a-f-]{36}$/)

  const dump = await settled(page)
  const sent = records(dump, 'transactions').filter((t) => t.recipientId !== undefined)
  expect(sent, 'exactly one stored row carries a recipient').toHaveLength(1)
  expect(sent[0]).toMatchObject({
    recipientId: 'recipient-rachum-greene',
    accountId: MAIN.id,
    amount: -100,
    kind: 'transfer',
    method: 'Fund Transfer',
  })
  expect(records(dump, 'transactions')).toHaveLength(TRANSACTIONS.length + 1)
  const storedMain = records(dump, 'fiatAccounts').find((a) => a.id === MAIN.id)!
  expect(toSen(storedMain.balance as number)).toBe(toSen(MAIN.balance) - 10000)
  expect((dump.records.meta as { schemaVersion: number }).schemaVersion).toBe(SCHEMA_VERSION)

  await reload(page)
  await expect(page.locator('.mvp-transfer-done__hero')).toHaveText('Transfer successfulRM 100.00to Rachum Greene')
  await page.getByRole('button', { name: 'Done' }).click()
  await page.locator('.mvp-shell__nav').getByRole('button', { name: 'Transfer' }).click()
  await page.getByRole('dialog', { name: 'Transfer' }).getByRole('button', { name: /^Send/ }).click()
  await expect(page.locator('.mvp-transfer__list > li').first(), 'recents survive a reload').toContainText('Rachum Greene')
  await page.locator('.mvp-transfer__list > li', { hasText: 'Rachum Greene' }).getByRole('button').click()
  await expect(page.getByRole('button', { name: /^From / })).toContainText(formatMyr(MAIN.balance - 100))
})

test('MIGRATED: a schema-1 store hydrates through the identity step, unquarantined, and is written back as v2', async ({
  page,
}) => {
  await gotoRoute(page, '/transfer', 'light')
  // A full v1 snapshot of the seed, with one stored edit so the screen can prove
  // it is the STORED data that came back, not a fresh seed.
  const state = { ...SEED, fiatAccounts: SEED.fiatAccounts.map((a) => (a.id === MAIN.id ? { ...a, balance: 1234.56 } : a)) }
  await page.evaluate(
    async ({ name, entries }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('records', 'readwrite')
        for (const [key, value] of Object.entries(entries)) tx.objectStore('records').put(value, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    },
    {
      name: DB,
      entries: { ...toStored(state), meta: { schemaVersion: 1, seedFingerprint: seedFingerprint(), revision: 3 } },
    },
  )
  await reload(page)
  await page.locator('.mvp-transfer__list > li', { hasText: 'Perry Matthew' }).getByRole('button').click()
  await expect(page.getByRole('button', { name: /^From / })).toContainText('RM 1,234.56')
  const quarantined = await page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const count = await new Promise<number>((resolve, reject) => {
      const request = db.transaction('quarantine').objectStore('quarantine').count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return count
  }, DB)
  expect(quarantined, 'a v1 store has a migration path, so nothing was quarantined').toBe(0)

  await page.getByRole('combobox', { name: 'Transfer Amount' }).fill('1.00')
  await page.getByRole('button', { name: 'Transfer money' }).click()
  await page.getByRole('dialog', { name: 'Review transfer' }).getByRole('button', { name: 'Transfer now' }).click()
  const dump = await settled(page)
  expect((dump.records.meta as { schemaVersion: number }).schemaVersion, 'written back whole as v2').toBe(SCHEMA_VERSION)
  expect(SCHEMA_VERSION).toBe(2)
  expect(records(dump, 'fiatAccounts').find((a) => a.id === MAIN.id)!.balance).toBe(1233.56)
  expect(records(dump, 'transactions').filter((t) => t.recipientId === 'recipient-perry-matthew')).toHaveLength(1)
})
