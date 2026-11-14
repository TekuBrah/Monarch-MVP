import { expect, test, type Page } from '@playwright/test'
import { gotoRoute, installStorePreset, WITH_NEW_RECIPIENT, STORED_RECIPIENT } from './harness'
import { CRYPTO_HOLDINGS, FIAT_ACCOUNTS } from '../src/data/accounts'
import { BANK_DIRECTORY } from '../src/data/bankDirectory'
import { BANKS } from '../src/data/banks'
import { BUDGETS } from '../src/data/budgets'
import {
  ACCOUNT_NUMBER_MAX,
  ACCOUNT_NUMBER_MIN,
  accountNumberInput,
  accountNumberProblem,
  bankGroups,
  buildRecipient,
  lookupAccount,
  mergeRecipients,
  recentRecipients,
  recipientProblem,
} from '../src/data/derive'
import { GOALS } from '../src/data/goals'
import { RECEIPTS } from '../src/data/receipts'
import { RECIPIENTS } from '../src/data/recipients'
import { TRANSACTIONS } from '../src/data/transactions'
import type { Transaction, UserRecipient } from '../src/data/types'
import {
  MIGRATIONS,
  RECORD_KEYS,
  SCHEMA_VERSION,
  fingerprintOf,
  isStoredRecipient,
  isStoredTransaction,
  storedRecordsProblem,
} from '../src/persistence/schema'
import { seedFingerprint, seedState } from '../src/persistence/seed'
import { toStored } from '../src/persistence/boundary'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GATE 101 (Flow 6, part 1) — ADD A NEW BANK RECIPIENT, THEN SEND THROUGH FLOW 4.
 *
 * Node tests pin the rules (the directory, the account number, the record, the
 * merge, schema v5, the fingerprint) on the real constants and synthetic rows.
 * Browser tests drive everything through the app's own controls: the steps'
 * draft is in-memory, so it is only ever tested through the UI.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const GUNTHER = BANK_DIRECTORY.find((a) => a.name === 'Gunther Cenperk')!
const FLORIST = BANK_DIRECTORY.find((a) => a.kind === 'business')!
const DB = 'monarch-mvp'
const STORE_MODULE = '/src/persistence/store.ts'

// ─────────────────────────────── Node: the rules ─────────────────────────────

test('N1 the bank list and the mock directory', () => {
  // Figma `1266:14386` draws these twelve; each appears (casing slips corrected).
  const drawn = [
    'Aeon Bank', 'Affin Bank', 'Agrobank', 'Al Rajhi Banking & Investment Corp',
    'Alliance Bank Malaysia Berhad', 'AmBank/AmFinance Berhad', 'Bangkok Bank Berhad',
    'Bank Islam Malaysia Berhad', 'Bank Kerjasama Rakyat Malaysia', 'Bank of America',
    'Bank of China', 'Bank Simpanan Nasional',
  ]
  const names = BANKS.map((b) => b.name)
  for (const name of drawn) expect(names, name).toContain(name)
  expect(new Set(BANKS.map((b) => b.code)).size, 'short codes are unique').toBe(BANKS.length)
  // The seeded recipients' codes are banks in the list.
  for (const r of RECIPIENTS) expect(BANKS.map((b) => b.code)).toContain(r.bankCode)
  // A and B as drawn, in order (Bank Muamalat is the one recorded insertion).
  const groups = bankGroups(BANKS)
  expect(groups[0]!.letter).toBe('A')
  expect(groups[0]!.banks.map((b) => b.name)).toEqual(drawn.slice(0, 6))
  expect(groups[1]!.banks.map((b) => b.name).slice(0, 6)).toEqual([
    'Bangkok Bank Berhad', 'Bank Islam Malaysia Berhad', 'Bank Kerjasama Rakyat Malaysia',
    'Bank Muamalat Malaysia Berhad', 'Bank of America', 'Bank of China',
  ])
  // Gunther is Figma's drawn payee, ten days and two transactions.
  expect(GUNTHER).toMatchObject({ bankCode: 'AFFIN', accountNo: '6451352078', kind: 'person', accountAgeDays: 10, transactionCount: 2 })
  for (const a of BANK_DIRECTORY) {
    expect(BANKS.map((b) => b.code), `${a.name}'s bank is listed`).toContain(a.bankCode)
    expect(a.accountNo).toMatch(new RegExp(`^\\d{${ACCOUNT_NUMBER_MIN},${ACCOUNT_NUMBER_MAX}}$`))
    expect(RECIPIENTS.some((r) => r.accountNo === a.accountNo), `${a.name} is not a seeded account`).toBe(false)
  }
  // Each Decision 35 case is reachable: (a) alone, (b) alone, both, neither, and a business.
  const young = (a: (typeof BANK_DIRECTORY)[number]) => a.accountAgeDays < 30
  const quiet = (a: (typeof BANK_DIRECTORY)[number]) => a.transactionCount < 10
  expect(BANK_DIRECTORY.some((a) => young(a) && quiet(a))).toBe(true)
  expect(BANK_DIRECTORY.some((a) => young(a) && !quiet(a))).toBe(true)
  expect(BANK_DIRECTORY.some((a) => !young(a) && quiet(a))).toBe(true)
  expect(BANK_DIRECTORY.some((a) => !young(a) && !quiet(a) && a.kind === 'person' && a.bankCode !== 'AFFIN')).toBe(true)
  expect(BANK_DIRECTORY.some((a) => !young(a) && a.kind === 'business')).toBe(true)
})

test('N2 the account number: digits only, each refusal, and the lookup', () => {
  expect(accountNumberInput('6451 3520-78abc')).toBe('6451352078')
  expect(accountNumberInput('1'.repeat(25))).toHaveLength(ACCOUNT_NUMBER_MAX)
  const at = (bankCode: string, accountNo: string) =>
    accountNumberProblem({ bankCode, accountNo }, RECIPIENTS, BANK_DIRECTORY)
  expect(at('AFFIN', '')).toBe('Enter the account number.')
  expect(at('AFFIN', '64513a2078')).toBe('Use digits only.')
  expect(at('AFFIN', '1234')).toBe('Account numbers are 5 to 19 digits.')
  expect(at('AFFIN', '1'.repeat(20))).toBe('Account numbers are 5 to 19 digits.')
  // A seeded recipient's account, at its own bank: already saved, before any lookup.
  expect(at('MBB', RECIPIENTS[0]!.accountNo)).toBe('This account is already in your recipients.')
  // The same number at another bank is a different account.
  expect(at('AFFIN', RECIPIENTS[0]!.accountNo)).toBe("We couldn't find this account.")
  expect(at('AFFIN', '1234567890')).toBe("We couldn't find this account.")
  // Gunther's number at the WRONG bank is not found: the lookup is keyed on both.
  expect(at('MBB', '6451352078')).toBe("We couldn't find this account.")
  expect(at('AFFIN', '6451352078')).toBeNull()
  expect(lookupAccount(BANK_DIRECTORY, 'AFFIN', '6451352078')).toBe(GUNTHER)
  // A recipient the user already added refuses too.
  const saved = buildRecipient({ account: GUNTHER, now: new Date(2026, 7, 15, 9, 41) })
  expect(accountNumberProblem({ bankCode: 'AFFIN', accountNo: '6451352078' }, [saved, ...RECIPIENTS], BANK_DIRECTORY)).toBe(
    'This account is already in your recipients.',
  )
})

test('N3 the record a save writes, and every reason addRecipient refuses one', () => {
  const r = buildRecipient({ account: GUNTHER, now: new Date(2026, 7, 15, 9, 41, 7) })
  expect(r.id).toMatch(/^recipient-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  expect(r).toMatchObject({ name: 'Gunther Cenperk', kind: 'person', accountNo: '6451352078', bankCode: 'AFFIN', mark: { kind: 'placeholder' }, addedAt: '2026-08-15T09:41:07' })
  expect(buildRecipient({ account: GUNTHER, now: new Date() }).id, 'every save mints a new id').not.toBe(r.id)
  expect(buildRecipient({ account: FLORIST, now: new Date() }).kind, 'the kind comes from the bank (22A)').toBe('business')

  expect(recipientProblem(r, RECIPIENTS, BANK_DIRECTORY)).toBeNull()
  expect(recipientProblem({ ...r, id: 'gunther' }, RECIPIENTS, BANK_DIRECTORY)).toMatch(/has no recipient id/)
  expect(recipientProblem(r, [r], BANK_DIRECTORY)).toMatch(/reuses the id/)
  expect(recipientProblem({ ...r, id: 'recipient-other' }, [r], BANK_DIRECTORY)).toBe('This account is already in your recipients.')
  expect(recipientProblem({ ...r, accountNo: '1234567890' }, RECIPIENTS, BANK_DIRECTORY)).toBe("We couldn't find this account.")
  expect(recipientProblem({ ...r, name: 'Someone Else' }, RECIPIENTS, BANK_DIRECTORY)).toMatch(/does not match/)
  expect(recipientProblem({ ...r, kind: 'business' }, RECIPIENTS, BANK_DIRECTORY)).toMatch(/does not match/)
  expect(recipientProblem({ ...r, mark: { kind: 'person', initials: 'GC' } }, RECIPIENTS, BANK_DIRECTORY)).toMatch(/placeholder/)
})

test('N4 the merge, and a saved recipient counts as recent activity (R101-6)', () => {
  const older = { ...buildRecipient({ account: GUNTHER, now: new Date() }), id: 'recipient-a', addedAt: '2026-08-01T10:00:00' } as UserRecipient
  const newer = { ...buildRecipient({ account: FLORIST, now: new Date() }), id: 'recipient-b', addedAt: '2026-08-10T10:00:00' } as UserRecipient
  const all = mergeRecipients([older, newer], RECIPIENTS)
  expect(all.map((r) => r.id)).toEqual(['recipient-a', 'recipient-b', ...RECIPIENTS.map((r) => r.id)])
  // No user recipient: Figma's order, untouched.
  expect(recentRecipients(mergeRecipients([], RECIPIENTS), TRANSACTIONS).map((r) => r.id)).toEqual(RECIPIENTS.map((r) => r.id))
  // Two saves and no sends: newest save first, then the seeded five in Figma's order.
  expect(recentRecipients(all, TRANSACTIONS).map((r) => r.id)).toEqual(['recipient-b', 'recipient-a', ...RECIPIENTS.map((r) => r.id)])
  // A later send to a seeded recipient overtakes both saves.
  const send = { id: 'x', recipientId: RECIPIENTS[4]!.id, occurredAt: '2026-08-12T09:00:00' } as Transaction
  expect(recentRecipients(all, [send]).map((r) => r.id).slice(0, 3)).toEqual([RECIPIENTS[4]!.id, 'recipient-b', 'recipient-a'])
  // A send to the older save after the newer save puts it first.
  const toOlder = { id: 'y', recipientId: 'recipient-a', occurredAt: '2026-08-11T09:00:00' } as Transaction
  expect(recentRecipients(all, [toOlder]).map((r) => r.id).slice(0, 2)).toEqual(['recipient-a', 'recipient-b'])
})

test('N5 schema v5: a new collection, an empty step from v4, a total validator, the silhouette logo', () => {
  expect(SCHEMA_VERSION).toBe(5)
  expect(RECORD_KEYS).toContain('userRecipients')
  const v4 = toStored(seedState()) as unknown as Record<string, unknown>
  delete v4.userRecipients
  const v5 = MIGRATIONS[4]!(v4) as Record<string, unknown>
  expect(v5.userRecipients).toEqual([])
  expect(storedRecordsProblem(v5, new Set()), 'a migrated v4 snapshot is valid').toBeNull()
  expect(MIGRATIONS[4]!(null), 'a non-object passes through, never throws').toBeNull()

  const r = buildRecipient({ account: GUNTHER, now: new Date(2026, 7, 15, 9, 41) })
  expect(isStoredRecipient(r)).toBe(true)
  for (const broken of [
    { ...r, id: 'gunther' }, { ...r, name: '' }, { ...r, kind: 'friend' }, { ...r, accountNo: '12a45' },
    { ...r, accountNo: '1234' }, { ...r, bankCode: 'NOPE' }, { ...r, mark: { kind: 'nope' } }, { ...r, addedAt: 'today' },
    null, 'x',
  ]) {
    expect(isStoredRecipient(broken), JSON.stringify(broken)).toBe(false)
  }
  const withTwo = { ...v5, userRecipients: [r, r] }
  expect(storedRecordsProblem(withTwo, new Set())).toBe('userRecipients names an id twice')
  const sameAccount = { ...v5, userRecipients: [r, { ...r, id: 'recipient-other' }] }
  expect(storedRecordsProblem(sameAccount, new Set())).toBe('userRecipients names an account twice')
  // A send to a new recipient copies the silhouette onto its row; storage accepts it.
  const row = { ...TRANSACTIONS[0]!, logo: { kind: 'placeholder' } }
  expect(isStoredTransaction(row)).toBe(true)
})

test('N6 the seed fingerprint is unchanged — it hashes the six seeds and no recipient', () => {
  expect(seedState().userRecipients).toEqual([])
  expect(seedFingerprint()).toBe(
    fingerprintOf({
      transactions: TRANSACTIONS,
      receipts: RECEIPTS,
      fiatAccounts: FIAT_ACCOUNTS,
      goals: GOALS,
      budgets: BUDGETS,
      cryptoHoldings: CRYPTO_HOLDINGS,
    }),
  )
})

// ─────────────────────────────── browser helpers ─────────────────────────────

const subtitle = (page: Page) => page.locator('.mvp-new-recipient .mn-header-default__subtitle')
const accountField = (page: Page) => page.locator('.mvp-new-recipient__form input[name="accountNo"]')
const errorLine = (page: Page) => page.locator('.mvp-new-recipient__form .mn-field-message--error')
const next = (page: Page) => page.locator('.mvp-new-recipient__actions').getByRole('button', { name: 'Next' })
const selectInput = (page: Page, key: string) =>
  page.locator(`.mvp-new-recipient__select[data-select="${key}"] .mn-select__input`)
const notice = (page: Page) => page.locator('.mvp-notice .mn-toast-mobile')

async function toDetails(page: Page, bank = 'Affin Bank'): Promise<void> {
  await gotoRoute(page, '/transfer', 'light')
  await page.getByRole('button', { name: 'New recipient' }).click()
  await expect(subtitle(page)).toHaveText('Select Transfer Type')
  await page.getByRole('button', { name: 'Account Number', exact: true }).click()
  await expect(subtitle(page)).toHaveText('Select recipient bank')
  await page.getByRole('button', { name: bank, exact: true }).click()
  await expect(subtitle(page)).toHaveText('Enter recipient details')
}

/** Focus is on `el` and stays there across a 400 ms observation window (R92-24, R96-18). */
async function expectFocusHeld(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeFocused()
  await page.evaluate((sel) => {
    const el = document.querySelector(sel)!
    ;(window as unknown as { __losses: number }).__losses = 0
    el.addEventListener('focusout', () => {
      ;(window as unknown as { __losses: number }).__losses += 1
    })
  }, selector)
  await page.evaluate(() => new Promise<void>((done) => setTimeout(done, 400)))
  expect(await page.evaluate(() => (window as unknown as { __losses: number }).__losses), 'focus losses in the window').toBe(0)
  await expect(page.locator(selector)).toBeFocused()
}

async function readUserRecipients(page: Page): Promise<Record<string, unknown>[] | null> {
  await page.evaluate(async (path) => {
    const store: { whenIdle: () => Promise<void> } = await import(path)
    await store.whenIdle()
  }, STORE_MODULE)
  return page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction('records').objectStore('records').get('userRecipients')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return (value ?? null) as Record<string, unknown>[] | null
  }, DB)
}

// ─────────────────────────────── browser ─────────────────────────────────────

test('B1 add Gunther, send him money: the new recipient flows through Flow 4 unchanged', async ({ page }) => {
  await toDetails(page)
  // The drawn defaults, and the bank from the step before.
  await expect(selectInput(page, 'transferTo')).toHaveValue('Account Number')
  await expect(selectInput(page, 'bank')).toHaveValue('Affin Bank')
  await expect(selectInput(page, 'accountType')).toHaveValue('Current/Savings')
  await expect(selectInput(page, 'transferType')).toHaveValue('DuitNow')
  await expect(selectInput(page, 'reference')).toHaveValue('Fund Transfer')
  // Digits only: spaces and letters a user types are dropped.
  await accountField(page).fill('6451 3520 78')
  await expect(accountField(page)).toHaveValue('6451352078')
  await expect(accountField(page)).toHaveAttribute('inputmode', 'numeric')
  await next(page).click()

  await expect(page).toHaveURL(/\/transfer\/send\/recipient-[0-9a-f-]{36}$/)
  const to = page.locator('.mvp-send__parties .mn-form-field').nth(1)
  await expect(to).toContainText('Gunther Cenperk')
  await expect(to).toContainText('6451352078 • AFFIN')
  await expect(to.locator('.mn-avatar--placeholder')).toHaveCount(1)

  await page.locator('.mvp-send input[role="combobox"]').fill('10000.00')
  await expect(page.locator('.mvp-send__balance')).toHaveText('Your new balanceRM 17,978.59')
  await page.locator('.mvp-send__body > .mn-btn--primary').click()
  // Gate 103: Gunther is Decision 35's drawn case; two Proceeds reach Flow 4's review sheet.
  await page.getByRole('dialog', { name: 'High-Risk Transfer' }).getByRole('button', { name: 'Proceed Anyway' }).click()
  await page.getByRole('dialog', { name: 'Proceed with high-risk transfer' }).getByRole('button', { name: 'Proceed Anyway' }).click()
  await page.locator('.mn-sheet__actions .mn-btn--primary').click()
  await expect(page.locator('.mvp-transfer-done__hero')).toHaveText('Transfer successfulRM 10,000.00to Gunther Cenperk')

  // Back from the success page lands on the picker, Gunther first (R101-6, R93-6).
  await page.goBack()
  await expect(page).toHaveURL(/\/transfer$/)
  await expect(page.locator('.mvp-transfer__list > li').first()).toContainText('Gunther Cenperk')
  await expect(page.locator('.mvp-transfer__list > li')).toHaveCount(6)
})

test('B2 after a save, Back and the To field both land on the picker — never on a live form', async ({ page }) => {
  await toDetails(page)
  await accountField(page).fill('6451352078')
  await next(page).click()
  await expect(page).toHaveURL(/\/transfer\/send\/recipient-/)
  // The To field goes back (Flow 4's navigate(-1)): the picker, not the bank list.
  await page.locator('.mvp-send__parties .mn-form-field').nth(1).locator('.mn-select-wallet-account__control').click()
  await expect(page).toHaveURL(/\/transfer$/)
  await expect(page.locator('.mvp-new-recipient')).toHaveCount(0)
  // Device Back again: out of the picker (opened directly here), never onto a step of the form.
  await page.goBack()
  await expect.poll(() => page.url()).not.toMatch(/\/transfer\/new/)
  // Adding Gunther a second time refuses.
  await toDetails(page)
  await accountField(page).fill('6451352078')
  await next(page).click()
  await expect(errorLine(page)).toHaveText('This account is already in your recipients.')
  await expect(page).toHaveURL(/\/transfer\/new$/)
})

test('B3 an account the bank cannot find: the row says so, focus holds on it, nothing is saved', async ({ page }) => {
  await toDetails(page)
  await accountField(page).fill('1234567890')
  await next(page).click()
  await expect(errorLine(page)).toHaveText("We couldn't find this account.")
  await expect(accountField(page)).toHaveAttribute('aria-invalid', 'true')
  const describedBy = await accountField(page).getAttribute('aria-describedby')
  expect(describedBy, 'the message is wired to the field').toBeTruthy()
  await expect(page.locator(`[id="${describedBy}"]`)).toHaveText("We couldn't find this account.")
  await expectFocusHeld(page, '.mvp-new-recipient__form input[name="accountNo"]')
  await expect(page).toHaveURL(/\/transfer\/new$/)
  expect(await readUserRecipients(page), 'nothing written').toBeNull()
})

test('B4 empty and out-of-range numbers: each its own message, shown after the field is left', async ({ page }) => {
  await toDetails(page)
  await expect(errorLine(page), 'a pristine form shows no red').toHaveCount(0)
  await next(page).click()
  await expect(errorLine(page)).toHaveText('Enter the account number.')
  await expectFocusHeld(page, '.mvp-new-recipient__form input[name="accountNo"]')
  await accountField(page).fill('1234')
  await expect(errorLine(page)).toHaveText('Account numbers are 5 to 19 digits.')
  await accountField(page).fill('6451352078')
  await expect(errorLine(page)).toHaveCount(0)
})

test('B5 the type rows, the picker views and the fields that step back', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  await page.getByRole('button', { name: 'New recipient' }).click()
  await expect(page.locator('.mvp-new-recipient__rows > li')).toHaveCount(7)
  // An identifier with no drawn path: Coming soon., and it does not follow to the next step.
  await page.getByRole('button', { name: 'Mobile Number', exact: true }).click()
  await expect(notice(page)).toHaveText('Coming soon.')
  await page.getByRole('button', { name: 'Account Number', exact: true }).click()
  await expect(subtitle(page)).toHaveText('Select recipient bank')
  await expect(page.locator('.mvp-notice')).toHaveCount(0)
  await expect(page.locator('.mvp-new-recipient__letter').first()).toHaveText('A')
  await expect(page.getByRole('button', { name: 'Bank Simpanan Nasional' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Affin Bank', exact: true }).click()
  await accountField(page).fill('6451352078')

  // Account Type: the picker view; an unavailable choice says Coming soon. and changes nothing.
  await selectInput(page, 'accountType').click()
  await expect(subtitle(page)).toHaveText('Select account type')
  await page.getByRole('option', { name: 'Credit Card' }).click()
  await expect(subtitle(page)).toHaveText('Enter recipient details')
  await expect(notice(page)).toHaveText('Coming soon.')
  await expect(selectInput(page, 'accountType')).toHaveValue('Current/Savings')
  // Recipient Reference: a pick lands on the form.
  await selectInput(page, 'reference').click()
  await page.getByRole('option', { name: 'Rent' }).click()
  await expect(selectInput(page, 'reference')).toHaveValue('Rent')
  // Device Back closes a picker view and keeps the draft.
  await selectInput(page, 'transferType').click()
  await expect(subtitle(page)).toHaveText('Select transfer type')
  await page.goBack()
  await expect(subtitle(page)).toHaveText('Enter recipient details')
  await expect(accountField(page)).toHaveValue('6451352078')
  await expect(selectInput(page, 'reference')).toHaveValue('Rent')
  // Recipient Bank goes back to the bank list; another bank keeps the typed number.
  await selectInput(page, 'bank').click()
  await expect(subtitle(page)).toHaveText('Select recipient bank')
  await page.getByRole('button', { name: 'Maybank', exact: true }).click()
  await expect(selectInput(page, 'bank')).toHaveValue('Maybank')
  await expect(accountField(page)).toHaveValue('6451352078')
  // Transfer to goes back to the type list.
  await selectInput(page, 'transferTo').click()
  await expect(subtitle(page)).toHaveText('Select Transfer Type')
})

test('B6 a reload on a later step returns to the first; a cold /transfer/new backs out to the picker', async ({ page }) => {
  // Cold, FIRST, in a fresh page: the first step is the app's first entry, so
  // Back replaces it with the picker rather than leaving the app.
  await gotoRoute(page, '/transfer/new', 'light')
  await expect(subtitle(page)).toHaveText('Select Transfer Type')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/transfer$/)
  // A reload drops the draft; a later step without it returns to the first.
  await page.getByRole('button', { name: 'New recipient' }).click()
  await page.getByRole('button', { name: 'Account Number', exact: true }).click()
  await page.getByRole('button', { name: 'Affin Bank', exact: true }).click()
  await accountField(page).fill('6451352078')
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await expect(subtitle(page)).toHaveText('Select Transfer Type')
})

test('B7 a deep-linked flow still lands on the amount screen with the picker under it', async ({ page }) => {
  await gotoRoute(page, '/transfer/new', 'light')
  await page.getByRole('button', { name: 'Account Number', exact: true }).click()
  await page.getByRole('button', { name: 'Affin Bank', exact: true }).click()
  await accountField(page).fill('6451352078')
  await next(page).click()
  await expect(page).toHaveURL(/\/transfer\/send\/recipient-/)
  await page.goBack()
  await expect(page).toHaveURL(/\/transfer$/)
  await expect(page.locator('.mvp-transfer__list > li').first()).toContainText('Gunther Cenperk')
})

test('B8 KEPT across a reload: the stored record, and the picker and amount screen read it', async ({ page }) => {
  await toDetails(page)
  await accountField(page).fill('6451352078')
  await next(page).click()
  await expect(page).toHaveURL(/\/transfer\/send\/recipient-/)
  const id = page.url().split('/').pop()!
  const stored = await readUserRecipients(page)
  expect(stored).toEqual([
    { id, name: 'Gunther Cenperk', kind: 'person', accountNo: '6451352078', bankCode: 'AFFIN', mark: { kind: 'placeholder' }, addedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/) },
  ])
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await expect(page.locator('.mvp-send__parties .mn-form-field').nth(1)).toContainText('Gunther Cenperk')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/transfer$/)
  await expect(page.locator('.mvp-transfer__list > li').first()).toContainText('Gunther Cenperk')
})

test('B9 a hydrated recipient (store preset, no form) is sendable, and a business send is a payment (22A)', async ({ page }) => {
  await installStorePreset(page, WITH_NEW_RECIPIENT)
  await gotoRoute(page, `/transfer/send/${STORED_RECIPIENT.id}`, 'light')
  await expect(page.locator('.mvp-send__parties .mn-form-field').nth(1)).toContainText('Gunther Cenperk')
  // Now add a business through the form and send to it.
  await gotoRoute(page, '/transfer', 'light')
  await page.getByRole('button', { name: 'New recipient' }).click()
  await page.getByRole('button', { name: 'Account Number', exact: true }).click()
  await page.getByRole('button', { name: 'CIMB Bank', exact: true }).click()
  await accountField(page).fill(FLORIST.accountNo)
  await next(page).click()
  await page.locator('.mvp-send input[role="combobox"]').fill('25.00')
  await page.locator('.mvp-send__body > .mn-btn--primary').click()
  await page.locator('.mn-sheet__actions .mn-btn--primary').click()
  await expect(page.locator('.mvp-transfer-done__hero')).toContainText(FLORIST.name)
  const rows = await page.evaluate(async ([name, path]) => {
    const store: { whenIdle: () => Promise<void> } = await import(path)
    await store.whenIdle()
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open(name)
      request.onsuccess = () => resolve(request.result)
    })
    const value = await new Promise<unknown>((resolve) => {
      const request = db.transaction('records').objectStore('records').get('transactions')
      request.onsuccess = () => resolve(request.result)
    })
    db.close()
    return value as { merchant: string; kind: string; logo: unknown }[]
  }, [DB, STORE_MODULE] as const)
  const row = rows.find((r) => r.merchant === FLORIST.name)!
  expect(row.kind).toBe('payment')
  expect(row.logo).toEqual({ kind: 'placeholder' })
})
