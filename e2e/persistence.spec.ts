import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { activateTab, gotoRoute, watchForProblems } from './harness'
import {
  FIXTURE,
  RECEIPTS_TAB,
  installResolvingExtraction,
  saveOneCapture,
  setReceiptSort,
} from './capture'
import { CRYPTO_HOLDINGS, FIAT_ACCOUNTS } from '../src/data/accounts'
import { BUDGETS } from '../src/data/budgets'
import { backfillAddedAt, backfillReferences, goalsTotal, netWorth, toSen } from '../src/data/derive'
import { formatMyr } from '../src/data/format'
import { GOALS } from '../src/data/goals'
import { buildHoldings } from '../src/data/holdings'
import { RECEIPTS } from '../src/data/receipts'
import { TRANSACTIONS } from '../src/data/transactions'
import {
  RECORD_KEYS,
  SCHEMA_VERSION,
  canonicalJson,
  fingerprintOf,
  isStoredBudget,
  isStoredFiatAccount,
  isStoredGoal,
  isStoredMeta,
  isStoredReceipt,
  isStoredTransaction,
  storedRecordsProblem,
} from '../src/persistence/schema'
import { seedFingerprint, seedState } from '../src/persistence/seed'

/**
 * ─────────────────────── PERSISTENCE — Gate 85 ───────────────────────
 *
 * Testers close and reopen the MVP and keep their data. These tests prove it,
 * and prove the failure paths end in a working app.
 *
 * ── THE RELOAD RULE, SECOND HALF ──
 *
 * A cross-screen assertion about a write still navigates through the app's own
 * controls — that proves the in-memory state. A persistence test ALSO reloads,
 * ON PURPOSE, and asserts the data was KEPT. A write is durable only once its
 * transaction commits, so a test waits for the store (`whenIdle`, or a poll of
 * the stored value) BEFORE it reloads; reloading straight after the click
 * would race the asynchronous write.
 *
 * ── ISOLATION ──
 *
 * Every test starts with an EMPTY store because Playwright gives every test
 * its own browser context, and a context's IndexedDB is its own. That was
 * proven before this spec was written, with a throwaway probe outside the repo
 * (a write in one test, absent in the next); the first test below re-states it
 * for this app.
 *
 * ── HOW THE STORE IS READ ──
 *
 * Directly, through IndexedDB in the page — never through the app's own store
 * module, so a defect in that module cannot vouch for itself. The app's module
 * is imported in the page (`ocr.spec.ts`'s precedent, dev server only) only to
 * WAIT on it (`whenIdle`), read its diagnostics log, or call `resetToSeed`.
 */

const DB = 'monarch-mvp'
const BALI = GOALS.find((g) => g.id === 'goal-bali-trip')!
const BALI_ROUTE = `/finance/plans/goals/${BALI.id}`
const MAIN = FIAT_ACCOUNTS[0]
const SEED_NET_WORTH = netWorth(buildHoldings(FIAT_ACCOUNTS), CRYPTO_HOLDINGS, GOALS)
/*
  THE APP'S OWN MODULES, AS THE DEV SERVER SERVES THEM. Passed into the page as
  strings: a literal `import('/src/…')` would make TypeScript resolve the
  specifier at compile time and fail the type-check gate (`ocr.spec.ts`'s note).
*/
const STORE_MODULE = '/src/persistence/store.ts'
const DIAGNOSTICS_MODULE = '/src/persistence/diagnostics.ts'
const UNREAD = { merchant: null, capturedAt: null, total: null, tax: null, currency: 'MYR', lineItems: [] }

interface StoreDump {
  records: Record<string, unknown>
  imageIds: string[]
  quarantine: Record<string, unknown>
}

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
    const quarantine = await all('quarantine')
    db.close()
    return { records, imageIds: Object.keys(images), quarantine }
  }, DB)
}

/** Put raw values into the records store, as another build of the app might have left them. */
async function writeRecords(page: Page, entries: Record<string, unknown>): Promise<void> {
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
    { name: DB, entries },
  )
}

/** Wait for every write the app has queued so far. */
async function storeIdle(page: Page): Promise<void> {
  await page.evaluate(async (path) => {
    const store: { whenIdle: () => Promise<void> } = await import(path)
    await store.whenIdle()
  }, STORE_MODULE)
}

async function persistenceKinds(page: Page): Promise<string[]> {
  return page.evaluate(async (path) => {
    const diagnostics: { persistenceLog: () => { kind: string }[] } = await import(path)
    return diagnostics.persistenceLog().map((e) => e.kind)
  }, DIAGNOSTICS_MODULE)
}

const storedGoal = (dump: StoreDump | null, id: string) =>
  (dump?.records.goals as { id: string; savedAmount: number }[] | undefined)?.find((g) => g.id === id)

async function topUp(page: Page, amount: string): Promise<void> {
  await page.locator('.mvp-finance-detail__actions .mn-btn--primary').click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input[name="amount"]').fill(amount)
  await dialog.getByRole('button', { name: 'Confirm Top-Up' }).click()
  await expect(dialog).toHaveCount(0)
}

const baliSaved = (page: Page) => page.locator('.mn-progress-bar__current')

// ─────────────────────────────── Node: the model ───────────────────────────────

test('seedState() is literally the initialisers the providers held before Gate 85', () => {
  const seed = seedState()
  expect(seed.transactions).toEqual(backfillReferences(TRANSACTIONS))
  expect(seed.receipts).toEqual(backfillAddedAt(RECEIPTS))
  expect(seed.fiatAccounts).toBe(FIAT_ACCOUNTS)
  expect(seed.goals).toBe(GOALS)
  expect(seed.budgets).toBe(BUDGETS)
})

test('every seed record passes its validator, and the seed snapshot has no problem', () => {
  const seed = seedState()
  expect(seed.transactions.every(isStoredTransaction)).toBe(true)
  expect(seed.receipts.every(isStoredReceipt)).toBe(true)
  expect(seed.fiatAccounts.every(isStoredFiatAccount)).toBe(true)
  expect(seed.goals.every(isStoredGoal)).toBe(true)
  expect(seed.budgets.every(isStoredBudget)).toBe(true)
  expect(isStoredMeta({ schemaVersion: SCHEMA_VERSION, seedFingerprint: 'x', revision: 0 })).toBe(true)
  expect(storedRecordsProblem(seed, new Set())).toBeNull()
})

test('every field a validator checks rejects a value of the wrong type', () => {
  /*
    BREAK EACH FIELD IN TURN, so "every field they check is covered by a test"
    is enumerated rather than claimed. A wrong-typed value per JS type; an
    absent optional field is broken by giving it a wrong-typed value too.
  */
  const wrong = (v: unknown): unknown =>
    typeof v === 'string' ? 7 : typeof v === 'number' ? 'x' : typeof v === 'boolean' ? 'x' : 7
  const breakEach = (record: Record<string, unknown>, check: (v: unknown) => boolean, extra: string[]) => {
    const failures: string[] = []
    for (const key of [...Object.keys(record), ...extra]) {
      if (check({ ...record, [key]: wrong(record[key]) })) failures.push(key)
    }
    return failures
  }
  const seed = seedState()
  const contribution = seed.transactions.find((t) => t.goalId !== undefined)!
  expect(
    breakEach(contribution as never, isStoredTransaction, []),
    'transaction fields that accepted a wrong type',
  ).toEqual([])
  expect(breakEach(seed.receipts[0] as never, isStoredReceipt, ['imageId', 'captureSource', 'capturedAtRead'])).toEqual([])
  expect(breakEach(FIAT_ACCOUNTS[0] as never, isStoredFiatAccount, [])).toEqual([])
  expect(breakEach(BALI as never, isStoredGoal, [])).toEqual([])
  expect(breakEach(BUDGETS[0] as never, isStoredBudget, [])).toEqual([])
  expect(breakEach({ schemaVersion: 1, seedFingerprint: 'x', revision: 0 }, isStoredMeta, [])).toEqual([])

  // Nested and enumerated values.
  expect(isStoredTransaction({ ...contribution, logo: { kind: 'goal', filename: 'x', origin: 'nope' } })).toBe(false)
  expect(isStoredTransaction({ ...contribution, logo: { kind: 'merchant', name: '' } })).toBe(false)
  expect(isStoredTransaction({ ...contribution, kind: 'refund' })).toBe(false)
  expect(isStoredTransaction({ ...contribution, category: 'pets' })).toBe(false)
  expect(isStoredTransaction({ ...contribution, occurredAt: '15/08/2026' })).toBe(false)
  expect(isStoredTransaction({ ...contribution, amount: Number.NaN })).toBe(false)
  expect(isStoredReceipt({ ...seed.receipts[0], sourceUrl: 'blob:dead' }), 'a stored blob url').toBe(false)
  expect(isStoredReceipt({ ...seed.receipts[0], addedAt: undefined }), 'addedAt is required in storage').toBe(false)
  expect(isStoredReceipt({ ...seed.receipts[0], lineItems: [{ name: 'a', quantity: '1', price: 'x' }] })).toBe(false)
  expect(isStoredReceipt({ ...seed.receipts[0], captureSource: 'scanner' })).toBe(false)
  expect(isStoredGoal({ ...BALI, autoSave: { isEnabled: 'yes', amount: 1 } })).toBe(false)
  expect(isStoredGoal({ ...BALI, autoSave: { isEnabled: true, amount: 'x' } })).toBe(false)
  expect(isStoredGoal({ ...BALI, targetDate: '2026-13' })).toBe(false)
  expect(isStoredBudget({ ...BUDGETS[0], categories: [] })).toBe(false)
  expect(isStoredBudget({ ...BUDGETS[0], categories: ['pets'] })).toBe(false)
  expect(isStoredMeta({ schemaVersion: 1.5, seedFingerprint: 'x', revision: 0 })).toBe(false)
  expect(isStoredMeta({ schemaVersion: 1, seedFingerprint: 'x', revision: -1 })).toBe(false)

  // Snapshot-level checks.
  expect(storedRecordsProblem({ ...seed, fiatAccounts: [] }, new Set())).toBe('no cash account')
  expect(storedRecordsProblem({ ...seed, goals: undefined }, new Set())).toMatch(/goals/)
  const withImage = { ...seed, receipts: [{ ...seed.receipts[0], imageId: 'img-1' }] }
  expect(storedRecordsProblem(withImage, new Set())).toMatch(/img-1/)
  expect(storedRecordsProblem(withImage, new Set(['img-1']))).toBeNull()
})

test('the validators are TOTAL — they answer false, never throw, on hostile input', () => {
  const validators = [isStoredTransaction, isStoredReceipt, isStoredFiatAccount, isStoredGoal, isStoredBudget, isStoredMeta]
  const hostile: unknown[] = [undefined, null, 0, 'x', true, [], {}, [1, 2], { id: {} }, { logo: null }, { autoSave: null }]
  for (const validator of validators) {
    for (const value of hostile) expect(() => validator(value)).not.toThrow()
    for (const value of hostile) expect(validator(value)).toBe(false)
  }
  for (const value of hostile) {
    expect(() => storedRecordsProblem(value as never, new Set())).not.toThrow()
  }
})

test('the seed fingerprint is stable, key-order-blind, and changes when one seed value changes', () => {
  expect(seedFingerprint()).toBe(seedFingerprint())
  expect(seedFingerprint()).toMatch(/^[0-9a-f]{14}$/)
  // Canonical: the same values written in a different key order hash the same.
  expect(canonicalJson({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(canonicalJson({ a: [{ c: 3, d: 2 }], b: 1 }))
  const raw = { transactions: TRANSACTIONS, receipts: RECEIPTS, fiatAccounts: FIAT_ACCOUNTS, goals: GOALS, budgets: BUDGETS }
  expect(fingerprintOf(raw)).toBe(seedFingerprint())
  const edited = { ...raw, goals: [{ ...GOALS[0], savedAmount: GOALS[0].savedAmount + 0.01 }, ...GOALS.slice(1)] }
  expect(fingerprintOf(edited)).not.toBe(seedFingerprint())
})

// ─────────────────────────────── Browser ───────────────────────────────

test('a fresh context renders the seed and stores NOTHING until the first write', async ({ page }) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await expect(baliSaved(page)).toContainText(formatMyr(BALI.savedAmount))
  await storeIdle(page)
  const dump = await readStore(page)
  expect(dump, 'the app opened its database').not.toBeNull()
  expect(dump!.records, 'no write yet, so nothing stored — not even the seed').toEqual({})
  expect(dump!.imageIds).toEqual([])
})

test('a reload KEEPS a Top-Up — goal, account, Savings Goals, net worth and the ledger agree', async ({
  page,
}) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  await topUp(page, '125.50')
  await storeIdle(page)
  const dump = await readStore(page)
  expect(storedGoal(dump, BALI.id)?.savedAmount).toBe(5165.5)
  expect((dump!.records.meta as { revision: number }).revision).toBe(1)
  expect(RECORD_KEYS.every((key) => key in dump!.records), 'the first write stores every collection').toBe(true)

  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await expect(baliSaved(page)).toContainText('RM 5,165.50')

  // ACROSS SCREENS THROUGH THE APP'S OWN CONTROLS (the reload rule's first half).
  await page.locator('.mn-header-default button').first().click()
  await page.getByRole('tab', { name: 'Overview' }).click()
  const cards = page.locator('.mvp-finance__grid-item')
  await expect(cards.filter({ hasText: 'Main' })).toContainText(
    formatMyr((toSen(MAIN.balance) - toSen(125.5)) / 100),
  )
  await expect(cards.filter({ hasText: 'Goals' })).toContainText(
    formatMyr((toSen(goalsTotal(GOALS)) + toSen(125.5)) / 100),
  )
  await expect(page.locator('.mvp-finance__networth-amount')).toHaveText(formatMyr(SEED_NET_WORTH))

  // THE LEDGER ROW, AND WHAT THE DETAIL SHEET SAYS ABOUT IT (D-18's report).
  await page.getByRole('tab', { name: 'Transactions' }).click()
  const row = page.locator('.mvp-transactions__list > li').filter({ hasText: '-RM 125.50' })
  await expect(row).toHaveCount(1)
  await row.click()
  const sheet = page.getByRole('dialog')
  await expect(sheet).toContainText('Main')
  await expect(sheet).toContainText('Bali Trip: RM 5,165.50 of RM 9,000.00 after this')
})

test('a created goal, its UPLOADED image and a deep link to it all survive a reload', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')
  await page.getByRole('tab', { name: 'Plans' }).click()
  await page.locator('.mvp-plans__section').first().getByRole('link', { name: 'Add New' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Goal Name').fill('New Phone')
  await modal.getByLabel('Target Amount (RM)').fill('5000.00')
  await modal.getByLabel('Target date').fill('2027-05-30')
  await page.getByRole('button', { name: 'Save Goal' }).click()
  await page.locator('.mvp-plans__goals > li').nth(2).getByRole('button').click()
  await expect(page).toHaveURL(/\/finance\/plans\/goals\/goal-[0-9a-f-]{36}$/)
  const deepLink = page.url()

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Edit image' }).click(),
  ])
  await chooser.setFiles(FIXTURE)
  await storeIdle(page)
  const dump = await readStore(page)
  expect(dump!.imageIds).toHaveLength(1)
  const stored = (dump!.records.goals as { name: string; image: string; imageOrigin: string }[]).find(
    (g) => g.name === 'New Phone',
  )
  expect(stored?.imageOrigin).toBe('upload')
  expect(stored?.image, 'the store holds an image id, never a blob url').toBe(dump!.imageIds[0])

  await page.reload()
  expect(page.url(), 'no unknown-id redirect after the reload').toBe(deepLink)
  await expect(page.locator('.mvp-goal-detail')).toContainText('New Phone')
  const img = page.locator('.mvp-goal-detail__image img')
  await expect(img).toHaveAttribute('src', /^blob:/)
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
  // THE BYTES ROUND-TRIP, compared by hash with the fixture on disk.
  const shown = await img.evaluate(async (el: HTMLImageElement) => {
    const bytes = await (await fetch(el.src)).arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  })
  expect(shown).toBe(createHash('sha256').update(readFileSync(FIXTURE)).digest('hex'))
})

test('a receipt captured AFTER a reload gets an id that does not collide with a stored one', async ({
  page,
}) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, RECEIPTS_TAB)
  await installResolvingExtraction(page, UNREAD)
  await saveOneCapture(page)
  await storeIdle(page)

  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await activateTab(page, RECEIPTS_TAB)
  await expect(page.locator('.mvp-receipt-card')).toHaveCount(RECEIPTS.length + 1)
  await installResolvingExtraction(page, UNREAD)
  await saveOneCapture(page)
  await storeIdle(page)

  const ids = ((await readStore(page))!.records.receipts as { id: string }[]).map((r) => r.id)
  const captured = ids.filter((id) => id.startsWith('receipt-capture-'))
  expect(captured).toHaveLength(2)
  expect(new Set(ids).size, 'every stored receipt id is distinct').toBe(ids.length)
  await expect(page.locator('.mvp-receipt-card')).toHaveCount(RECEIPTS.length + 2)
})

test('a capture keeps its image, its unread date and its gallery source across a reload', async ({
  page,
}) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, RECEIPTS_TAB)
  await installResolvingExtraction(page, UNREAD)
  await saveOneCapture(page, 'Photo Gallery')
  await storeIdle(page)
  const stored = ((await readStore(page))!.records.receipts as Record<string, unknown>[]).find((r) =>
    String(r.id).startsWith('receipt-capture-'),
  )!
  expect(stored.captureSource).toBe('gallery')
  expect(stored.capturedAtRead).toBe(false)
  expect(stored.imageId).toMatch(/^img-/)
  expect('sourceUrl' in stored).toBe(false)

  await page.reload()
  await activateTab(page, RECEIPTS_TAB)
  await setReceiptSort(page, 'Receipt date')
  const undated = page.locator('.mvp-receipts__month').filter({ hasText: 'No receipt date' })
  await expect(undated.locator('.mvp-receipt-card')).toHaveCount(1)
  await undated.locator('.mvp-receipt-card').click()
  const viewerImage = page.locator('img.mvp-receipt-viewer__image')
  await expect.poll(() => viewerImage.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
  // A gallery capture retakes from the gallery — before Gate 85 a reload made it 'camera'.
  await expect(page.getByRole('button', { name: 'Choose another photo' })).toHaveCount(1)
})

test('a corrupt store is QUARANTINED and the app starts from the seed, with no page error', async ({
  page,
}) => {
  const problems = watchForProblems(page)
  await gotoRoute(page, BALI_ROUTE, 'light')
  await writeRecords(page, {
    meta: { schemaVersion: SCHEMA_VERSION, seedFingerprint: seedFingerprint(), revision: 4 },
    goals: 'corrupt',
  })
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await expect(baliSaved(page)).toContainText(formatMyr(BALI.savedAmount))
  const dump = await readStore(page)
  expect(dump!.records, 'the unreadable snapshot is cleared').toEqual({})
  const slot = dump!.quarantine.latest as { reason: string; records: { goals: unknown } }
  expect(slot.reason).toMatch(/missing or invalid/)
  expect(slot.records.goals, 'the raw value is kept, not lost').toBe('corrupt')
  expect(await persistenceKinds(page)).toContain('quarantined')
  expect(problems.console).toEqual([])
})

test('a stored schema with NO migration path is quarantined, never silently reset', async ({ page }) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  await writeRecords(page, { meta: { schemaVersion: 0, seedFingerprint: seedFingerprint(), revision: 2 } })
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  const slot = (await readStore(page))!.quarantine.latest as { reason: string }
  expect(slot.reason).toBe('no migration from schema 0')
})

test('a store written by NEWER code makes this tab read-only, and it never writes', async ({ page }) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  const newer = { schemaVersion: SCHEMA_VERSION + 1, seedFingerprint: 'from-the-future', revision: 9 }
  await writeRecords(page, { meta: newer, goals: 'shape this tab cannot read' })
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'readonly')
  await expect(baliSaved(page)).toContainText(formatMyr(BALI.savedAmount))

  await topUp(page, '125.50')
  await expect(baliSaved(page)).toContainText('RM 5,165.50')
  await storeIdle(page)
  const dump = await readStore(page)
  expect(dump!.records.meta).toEqual(newer)
  expect(dump!.records.goals).toBe('shape this tab cannot read')
})

test('an EDITED seed (fingerprint mismatch) discards stored data for the new seed — not a quarantine', async ({
  page,
}) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  await topUp(page, '125.50')
  await storeIdle(page)
  const meta = (await readStore(page))!.records.meta as Record<string, unknown>
  await writeRecords(page, { meta: { ...meta, seedFingerprint: '00000000000000' } })

  await page.reload()
  await expect(baliSaved(page)).toContainText(formatMyr(BALI.savedAmount))
  const dump = await readStore(page)
  expect(dump!.records).toEqual({})
  expect(dump!.quarantine).toEqual({})
  expect(await persistenceKinds(page)).toContain('seed-changed')
})

test('the stored fingerprint is identical across loads and writes, and the revision counts writes', async ({
  page,
}) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  await topUp(page, '125.50')
  await storeIdle(page)
  const first = (await readStore(page))!.records.meta as { seedFingerprint: string; revision: number }
  await page.reload()
  await topUp(page, '10.00')
  await storeIdle(page)
  const second = (await readStore(page))!.records.meta as { seedFingerprint: string; revision: number }
  expect(first.seedFingerprint).toBe(seedFingerprint())
  expect(second.seedFingerprint).toBe(first.seedFingerprint)
  expect([first.revision, second.revision]).toEqual([1, 2])
})

test('two pages in one context stay in sync', async ({ page, context }) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  const other = await context.newPage()
  await gotoRoute(other, BALI_ROUTE, 'light')
  await topUp(page, '125.50')
  await expect(baliSaved(other)).toContainText('RM 5,165.50')
})

test('a STALE tab never overwrites: its write is dropped, logged, and it re-hydrates to the truth', async ({
  page,
  context,
}) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  const stale = await context.newPage()
  // This tab never hears the other one, so it goes stale.
  await stale.addInitScript(() => {
    class Deaf {
      onmessage: unknown = null
      postMessage() {}
      close() {}
    }
    ;(window as unknown as { BroadcastChannel: unknown }).BroadcastChannel = Deaf
  })
  await gotoRoute(stale, BALI_ROUTE, 'light')

  await topUp(page, '125.50')
  await storeIdle(page)
  await expect(baliSaved(stale), 'the stale tab has not heard').toContainText(formatMyr(BALI.savedAmount))

  // The stale tab writes: switch auto-save off.
  const toggle = stale.locator('.mvp-goal-detail__autosave [role="switch"]')
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await stale.locator('.mvp-goal-detail__autosave .mn-toggle').click()
  await storeIdle(stale)

  await expect(baliSaved(stale), 're-hydrated to the store').toContainText('RM 5,165.50')
  await expect(toggle, 'its own dropped write is undone on screen').toHaveAttribute('aria-checked', 'true')
  const goal = ((await readStore(stale))!.records.goals as { id: string; autoSave: { isEnabled: boolean } }[]).find(
    (g) => g.id === BALI.id,
  )
  expect(goal?.autoSave.isEnabled).toBe(true)
  expect(await persistenceKinds(stale)).toEqual(expect.arrayContaining(['stale-write-dropped', 'rehydrated']))
})

test('resetToSeed() restores the seed, revokes object URLs, deletes image bytes, and leaves tesseract alone', async ({
  page,
}) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  // tesseract.js's own cache database, as the OCR worker leaves it.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('keyval-store', 1)
        request.onupgradeneeded = () => request.result.createObjectStore('keyval')
        request.onsuccess = () => {
          const tx = request.result.transaction('keyval', 'readwrite')
          tx.objectStore('keyval').put('model bytes', './eng.traineddata')
          tx.oncomplete = () => {
            request.result.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
  )
  await topUp(page, '125.50')
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Edit image' }).click(),
  ])
  await chooser.setFiles(FIXTURE)
  await storeIdle(page)
  expect((await readStore(page))!.imageIds).toHaveLength(1)
  const uploaded = await page.locator('.mvp-goal-detail__image img').getAttribute('src')

  await page.evaluate(() => {
    const revoke = URL.revokeObjectURL.bind(URL)
    const w = window as unknown as { __revoked: string[] }
    w.__revoked = []
    URL.revokeObjectURL = (url: string) => {
      w.__revoked.push(url)
      revoke(url)
    }
  })
  await page.evaluate(async (path) => {
    const store: { resetToSeed: () => Promise<void> } = await import(path)
    await store.resetToSeed()
  }, STORE_MODULE)

  await expect(baliSaved(page)).toContainText(formatMyr(BALI.savedAmount))
  await expect(page.locator('.mvp-goal-detail__image img')).toHaveAttribute('src', `/media/goals/${BALI.image}`)
  const dump = await readStore(page)
  expect(storedGoal(dump, BALI.id)?.savedAmount).toBe(BALI.savedAmount)
  expect(dump!.imageIds, 'the seed references no stored image').toEqual([])
  expect(await page.evaluate(() => (window as unknown as { __revoked: string[] }).__revoked)).toContain(uploaded)
  const tesseract = await page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        const request = indexedDB.open('keyval-store', 1)
        request.onsuccess = () => {
          // If the database was deleted and re-created by this open, it has no
          // `keyval` store: answer with a value the assertion below can FAIL on,
          // rather than throwing inside this handler and never settling (a hang).
          if (!request.result.objectStoreNames.contains('keyval')) {
            request.result.close()
            resolve('keyval-store was deleted and re-created empty')
            return
          }
          const get = request.result.transaction('keyval').objectStore('keyval').get('./eng.traineddata')
          get.onsuccess = () => resolve(get.result)
        }
      }),
  )
  expect(tesseract).toBe('model bytes')
  expect(await persistenceKinds(page)).toContain('reset')
})

test('a store that cannot be opened at all leaves a working app in memory', async ({ page }) => {
  await page.addInitScript(() => {
    indexedDB.open = () => {
      throw new DOMException('storage is blocked', 'SecurityError')
    }
  })
  await gotoRoute(page, BALI_ROUTE, 'light')
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'memory')
  await topUp(page, '125.50')
  await expect(baliSaved(page)).toContainText('RM 5,165.50')
  expect(await persistenceKinds(page)).toContain('open-failed')
})

test('an open that never answers times out into memory, and the app still renders', async ({ page }) => {
  // Hold the database open at version 1 and ignore versionchange, then send the
  // app's own open to version 2: it is blocked for as long as the page lives.
  await page.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB)
    const hold = open('monarch-mvp', 1)
    hold.onupgradeneeded = () => {
      hold.result.createObjectStore('records')
      hold.result.createObjectStore('images')
      hold.result.createObjectStore('quarantine')
    }
    indexedDB.open = (name: string, version?: number) =>
      name === 'monarch-mvp' ? open(name, 2) : open(name, version)
  })
  const started = Date.now()
  await page.goto(BALI_ROUTE)
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'memory', { timeout: 15_000 })
  expect(Date.now() - started, 'the timeout, not an immediate failure').toBeGreaterThanOrEqual(4000)
  await expect(baliSaved(page)).toContainText(formatMyr(BALI.savedAmount))
  expect(await persistenceKinds(page)).toContain('open-timeout')
})

test('hydration shows NO seed flash — the first frame is already the stored state', async ({ page }) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  await topUp(page, '125.50')
  await storeIdle(page)
  await page.addInitScript(() => {
    const seen = { childBeforeReady: false, firstFigure: null as string | null }
    ;(window as unknown as { __flash: typeof seen }).__flash = seen
    new MutationObserver(() => {
      const root = document.getElementById('root')
      if (root?.firstElementChild && !root.hasAttribute('data-store')) seen.childBeforeReady = true
      const figure = document.querySelector('.mn-progress-bar__current')
      if (figure && seen.firstFigure === null) seen.firstFigure = figure.textContent
    }).observe(document, { subtree: true, childList: true, characterData: true })
  })
  await page.reload()
  await expect(baliSaved(page)).toContainText('RM 5,165.50')
  const flash = await page.evaluate(
    () => (window as unknown as { __flash: { childBeforeReady: boolean; firstFigure: string | null } }).__flash,
  )
  expect(flash.childBeforeReady, 'nothing rendered before the store was read').toBe(false)
  expect(flash.firstFigure, 'the first figure painted is the stored one').toContain('RM 5,165.50')
})

test('a write that fails part-way stores NOTHING of a Top-Up — the transaction is atomic', async ({
  page,
}) => {
  // Fail the goals half of the write after the ledger half has been issued.
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (this.name === 'records' && key === 'goals') throw new DOMException('injected', 'QuotaExceededError')
      return put.call(this, value, key)
    }
  })
  await gotoRoute(page, BALI_ROUTE, 'light')
  await topUp(page, '125.50')
  await storeIdle(page)
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'memory')
  // The screen keeps the Top-Up in memory; the store holds none of its three parts.
  await expect(baliSaved(page)).toContainText('RM 5,165.50')
  expect((await readStore(page))!.records).toEqual({})
  expect(await persistenceKinds(page)).toContain('write-failed')
})
