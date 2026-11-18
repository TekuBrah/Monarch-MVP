import { expect, test, type Page } from '@playwright/test'
import { gotoRoute, installStorePreset, STORED_RECIPIENT, WITH_NEW_RECIPIENT } from './harness'
import { FIAT_ACCOUNTS } from '../src/data/accounts'
import { BANK_DIRECTORY } from '../src/data/bankDirectory'
import {
  buildRecipient,
  buildSend,
  mergeRecipients,
  sendRowProblem,
  transferDetailsFrom,
  transferDetailsProblem,
} from '../src/data/derive'
import { RECIPIENTS } from '../src/data/recipients'
import { TRANSACTIONS } from '../src/data/transactions'
import type { Transaction } from '../src/data/types'
import { OTHER_DETAILS_MAX, REFERENCE_OPTIONS } from '../src/data/newRecipientOptions'
import {
  MIGRATIONS,
  SCHEMA_VERSION,
  canonicalJson,
  isStoredTransaction,
  isTransferDetails,
} from '../src/persistence/schema'
import { seedFingerprint, seedState } from '../src/persistence/seed'
import { toStored } from '../src/persistence/boundary'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GATE 106 — DECISION 40 = B: THE RECIPIENT REFERENCE AND OTHER PAYMENT DETAILS
 * TYPED ON THE NEW-RECIPIENT FORM RIDE ON THAT RECIPIENT'S FIRST SEND.
 *
 * Node tests pin the rules (the validator, the builder, the scope check, schema
 * v6, the fingerprint). Browser tests drive the whole journey through the app's
 * own controls — the values live in an in-memory draft, so the UI is the only
 * way to reach them — and read the stored row straight from IndexedDB.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const FLORIST = BANK_DIRECTORY.find((a) => a.name === 'Lumen & Larch Florist')!
const DELPHINE = BANK_DIRECTORY.find((a) => a.name === 'Delphine Marrow')!
const NOTE = 'Flowers for Mum, 12th birthday'
const LONG_NOTE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcd'
const DB = 'monarch-mvp'
const STORE_MODULE = '/src/persistence/store.ts'
const DIAGNOSTICS_MODULE = '/src/persistence/diagnostics.ts'
/** `seedFingerprint()` at `mvp-gate105` — no seed module changes at Gate 106. */
const GATE_105_FINGERPRINT = '047c16cbf5461b'

// ─────────────────────────────── Node: the rules ─────────────────────────────

test('N1 the validator: a preset reference, an optional trimmed note within the cap, nothing else', () => {
  expect(REFERENCE_OPTIONS.map((o) => o.id)).toEqual([
    'fund-transfer',
    'family-support',
    'rent',
    'bill-payment',
    'loan-repayment',
    'gift',
  ])
  expect(OTHER_DETAILS_MAX).toBe(40)
  for (const o of REFERENCE_OPTIONS) expect(isTransferDetails({ recipientReference: o.id })).toBe(true)
  expect(isTransferDetails({ recipientReference: 'rent', otherPaymentDetails: NOTE })).toBe(true)
  expect(isTransferDetails({ recipientReference: 'rent', otherPaymentDetails: LONG_NOTE })).toBe(true)
  // Refused: a wrong type, an off-list reference (including the LABEL), a note
  // that is empty, untrimmed, over the cap, or not a string.
  for (const bad of [
    null,
    'rent',
    [],
    {},
    { recipientReference: 'Rent' },
    { recipientReference: 'school-fees' },
    { recipientReference: 7 },
    { recipientReference: 'rent', otherPaymentDetails: '' },
    { recipientReference: 'rent', otherPaymentDetails: ' padded' },
    { recipientReference: 'rent', otherPaymentDetails: `${LONG_NOTE}x` },
    { recipientReference: 'rent', otherPaymentDetails: 40 },
  ]) {
    expect(isTransferDetails(bad), JSON.stringify(bad)).toBe(false)
  }
  const row: Transaction = { ...TRANSACTIONS[0], recipientId: 'recipient-x' }
  expect(isStoredTransaction(row)).toBe(true)
  expect(isStoredTransaction({ ...row, transferDetails: { recipientReference: 'gift' } })).toBe(true)
  expect(isStoredTransaction({ ...row, transferDetails: { recipientReference: 'gift', otherPaymentDetails: 'x'.repeat(41) } })).toBe(false)
  expect(isStoredTransaction({ ...row, transferDetails: 'gift' })).toBe(false)
})

test('N2 the form becomes a row field: the preset as chosen, the note trimmed, an empty note absent', () => {
  expect(transferDetailsFrom({ reference: 'fund-transfer', otherDetails: '' })).toEqual({ recipientReference: 'fund-transfer' })
  expect(transferDetailsFrom({ reference: 'gift', otherDetails: '   ' })).toEqual({ recipientReference: 'gift' })
  expect(transferDetailsFrom({ reference: 'rent', otherDetails: `  ${NOTE}  ` })).toEqual({
    recipientReference: 'rent',
    otherPaymentDetails: NOTE,
  })
  expect('otherPaymentDetails' in transferDetailsFrom({ reference: 'rent', otherDetails: '' })).toBe(false)
  for (const input of ['', ' ', NOTE, LONG_NOTE, `${LONG_NOTE}zz`, `  ${LONG_NOTE}`]) {
    expect(isTransferDetails(transferDetailsFrom({ reference: 'rent', otherDetails: input })), input).toBe(true)
  }
})

test('N3 only a first send to a recipient the user added may carry them, and buildSend adds no key otherwise', () => {
  const now = new Date(2026, 7, 15, 9, 41)
  const added = buildRecipient({ account: FLORIST, now })
  const recipients = mergeRecipients([added], RECIPIENTS)
  const details = transferDetailsFrom({ reference: 'family-support', otherDetails: NOTE })
  const base = { accountId: 'main', amountSen: 10000, now, transactions: TRANSACTIONS, rules: [] }

  const plain = buildSend({ recipient: added, ...base })
  expect('transferDetails' in plain, 'no details means no key at all').toBe(false)
  const first = buildSend({ recipient: added, ...base, details })
  expect(first.transferDetails).toEqual(details)
  expect(sendRowProblem(first, FIAT_ACCOUNTS, recipients)).toBeNull()
  expect(transferDetailsProblem(plain, [added], TRANSACTIONS)).toBeNull()
  expect(transferDetailsProblem(first, [added], TRANSACTIONS)).toBeNull()

  // A second payment: the ledger already names this recipient.
  expect(transferDetailsProblem(first, [added], [...TRANSACTIONS, plain])).toMatch(/second payment/)
  // A seeded recipient is not one the user added.
  const seeded = buildSend({ recipient: RECIPIENTS[0], ...base, details })
  expect(transferDetailsProblem(seeded, [added], TRANSACTIONS)).toMatch(/did not add/)
  // A crypto send never carries them.
  expect(transferDetailsProblem({ ...first, method: 'Crypto Transfer' }, [added], TRANSACTIONS)).toMatch(/crypto/)
  // An off-list reference and an over-long note.
  expect(transferDetailsProblem({ ...first, transferDetails: { recipientReference: 'Rent' } }, [added], TRANSACTIONS)).toMatch(/preset/)
  expect(
    transferDetailsProblem({ ...first, transferDetails: { recipientReference: 'rent', otherPaymentDetails: 'x'.repeat(41) } }, [added], TRANSACTIONS),
  ).toMatch(/other payment details/)
})

test('N4 schema v6: an identity step from v5 keeps every row byte for byte, and the seed fingerprint is unchanged', () => {
  expect(SCHEMA_VERSION).toBe(6)
  const v5 = toStored(seedState())
  const v6 = MIGRATIONS[5]!(v5)
  expect(v6, 'the identity: the same snapshot comes back').toBe(v5)
  expect(canonicalJson(v6)).toBe(canonicalJson(toStored(seedState())))
  expect(MIGRATIONS[5]!(null), 'a non-object passes through, never throws').toBeNull()
  // No seed row carries the field, so no seeded row changes shape.
  expect(TRANSACTIONS.filter((t) => 'transferDetails' in t)).toEqual([])
  expect(seedFingerprint(), 'no tester is reset').toBe(GATE_105_FINGERPRINT)
})

// ─────────────────────────────── browser helpers ─────────────────────────────

const subtitle = (page: Page) => page.locator('.mvp-new-recipient .mn-header-default__subtitle')
const next = (page: Page) => page.locator('.mvp-new-recipient__actions').getByRole('button', { name: 'Next' })
const amountField = (page: Page) => page.locator('.mvp-send input[role="combobox"]')
const transferMoney = (page: Page) => page.locator('.mvp-send__body > .mn-btn--primary')
const review = (page: Page) => page.getByRole('dialog', { name: 'Review transfer' })
const reviewRow = (page: Page, label: string) =>
  review(page).locator('.mvp-review__row').filter({ has: page.locator(`dt:text-is("${label}")`) })
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Transaction details' })
const sheetRow = (page: Page, label: string) =>
  sheet(page).locator('.mvp-txn-detail__row').filter({ has: page.locator(`dt:text-is("${label}")`) })
const historyIdx = (page: Page) => page.evaluate(() => (history.state as { idx: number }).idx)

/** Add a recipient through the form, choosing a reference and typing a note. */
async function addRecipient(
  page: Page,
  bank: string,
  accountNo: string,
  reference: string | null,
  note: string,
): Promise<void> {
  await page.getByRole('button', { name: 'New recipient' }).click()
  await page.getByRole('button', { name: 'Account Number', exact: true }).click()
  await page.getByRole('button', { name: bank, exact: true }).click()
  await expect(subtitle(page)).toHaveText('Enter recipient details')
  await page.locator('.mvp-new-recipient__form input[name="accountNo"]').fill(accountNo)
  if (reference) {
    await page.locator('.mvp-new-recipient__select[data-select="reference"] .mn-select__input').click()
    await page.locator('.mvp-new-recipient__picker').getByRole('option', { name: reference }).click()
    await expect(subtitle(page)).toHaveText('Enter recipient details')
  }
  await page.locator('.mvp-new-recipient__form input[name="otherDetails"]').fill(note)
  await next(page).click()
  await expect(page).toHaveURL(/\/transfer\/send\/recipient-[0-9a-f-]{36}$/)
}

async function openReview(page: Page, amount: string): Promise<void> {
  await amountField(page).fill(amount)
  await transferMoney(page).click()
  await expect(review(page)).toBeVisible()
}

async function readTransactions(page: Page): Promise<Transaction[]> {
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
      const request = db.transaction('records').objectStore('records').get('transactions')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return (value ?? []) as Transaction[]
  }, DB)
}

const sends = (rows: Transaction[]) => rows.filter((t) => t.id.startsWith('txn-send-'))

// ─────────────────────────────── browser ─────────────────────────────────────

test('B1 a first send from the form carries both: the review, the detail sheet, the stored row and a reload', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  await addRecipient(page, 'CIMB Bank', FLORIST.accountNo, 'Family Support', NOTE)
  await openReview(page, '100.00')
  // Between From and the new balance, in that order, under their own labels.
  await expect(review(page).locator('.mvp-review__row dt')).toHaveText([
    'To',
    'From',
    'Recipient Reference',
    'Other Payment Details',
    'Your new balance',
  ])
  await expect(reviewRow(page, 'Recipient Reference').locator('dd')).toHaveText('Family Support')
  await expect(reviewRow(page, 'Other Payment Details').locator('dd')).toHaveText(NOTE)

  await page.locator('.mn-sheet__actions .mn-btn--primary').click()
  await expect(page.locator('.mvp-transfer-done__hero')).toHaveText('Transfer successfulRM 100.00to Lumen & Larch Florist')
  // Not on the success page (Decision 40 names the two sheets only).
  await expect(page.locator('.mvp-transfer-done')).not.toContainText('Family Support')
  await expect(page.locator('.mvp-transfer-done')).not.toContainText('Recipient Reference')

  const [stored] = sends(await readTransactions(page))
  expect(stored.transferDetails).toEqual({ recipientReference: 'family-support', otherPaymentDetails: NOTE })
  expect(stored.reference, "Monarch's own reference is untouched").toMatch(/^MNRC\d{8}[0-9A-HJKMNP-TV-Z]{6}$/)

  // A business send is a purchase: both rows after Payment Method, Monarch's
  // Reference row absent from this body as it always was.
  await page.getByRole('button', { name: 'View transaction' }).click()
  await expect(sheet(page)).toBeVisible()
  await expect(sheet(page).locator('.mvp-txn-detail__rows dt')).toHaveText([
    'Date',
    'Category',
    'Payment Method',
    'Recipient Reference',
    'Other Payment Details',
  ])
  await expect(sheetRow(page, 'Recipient Reference').locator('dd')).toHaveText('Family Support')
  await expect(sheetRow(page, 'Other Payment Details').locator('dd')).toHaveText(NOTE)
  // The reserved glyph slot keeps the label column: these labels start where Date's does.
  const labelX = async (label: string) =>
    sheetRow(page, label).locator('dt').evaluate((dt) => {
      const text = Array.from(dt.childNodes).find((n) => n.nodeType === Node.TEXT_NODE)!
      const range = document.createRange()
      range.selectNodeContents(text)
      return range.getBoundingClientRect().left
    })
  expect(await labelX('Recipient Reference')).toBeCloseTo(await labelX('Date'), 1)

  // KEPT across a reload, reached again through the app's own controls.
  await page.reload()
  await page.getByRole('tab', { name: 'Transactions' }).click()
  await page.locator('.mvp-transactions__list > li:has-text("Lumen & Larch Florist") .mn-list-item').click()
  await expect(sheetRow(page, 'Recipient Reference').locator('dd')).toHaveText('Family Support')
  await expect(sheetRow(page, 'Other Payment Details').locator('dd')).toHaveText(NOTE)
})

test('B2 Recipient Reference alone when no note is typed; a person send is a transfer, before Monarch\'s Reference', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  // Spaces only: nothing is left after trimming, so no note row.
  await addRecipient(page, 'Maybank', DELPHINE.accountNo, null, '   ')
  await openReview(page, '100.00')
  await expect(reviewRow(page, 'Recipient Reference').locator('dd')).toHaveText('Fund Transfer')
  await expect(reviewRow(page, 'Other Payment Details')).toHaveCount(0)
  await page.locator('.mn-sheet__actions .mn-btn--primary').click()
  const [stored] = sends(await readTransactions(page))
  expect(stored.transferDetails).toEqual({ recipientReference: 'fund-transfer' })
  await page.getByRole('button', { name: 'View transaction' }).click()
  await expect(sheet(page).locator('.mvp-txn-detail__rows dt')).toHaveText([
    'From',
    'To',
    'Date',
    'Recipient Reference',
    'Reference',
  ])
  await expect(sheetRow(page, 'Recipient Reference').locator('dd')).toHaveText('Fund Transfer')
  await expect(sheetRow(page, 'Reference').locator('dd')).toHaveText(stored.reference!)
})

test('B3 a second payment to the same payee carries none', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  await addRecipient(page, 'CIMB Bank', FLORIST.accountNo, 'Gift', NOTE)
  await openReview(page, '100.00')
  await page.locator('.mn-sheet__actions .mn-btn--primary').click()
  // Back from the success page lands on the picker, the florist first.
  await page.goBack()
  await expect(page).toHaveURL(/\/transfer$/)
  await page.locator('.mvp-transfer__list > li').first().getByRole('button').click()
  await openReview(page, '50.00')
  await expect(reviewRow(page, 'Recipient Reference')).toHaveCount(0)
  await expect(reviewRow(page, 'Other Payment Details')).toHaveCount(0)
  await page.locator('.mn-sheet__actions .mn-btn--primary').click()
  const rows = sends(await readTransactions(page))
  expect(rows).toHaveLength(2)
  expect(rows.filter((t) => t.transferDetails !== undefined)).toHaveLength(1)
  expect(rows.find((t) => t.amount === -50)!.transferDetails).toBeUndefined()
})

test('B4 a send to a seeded recipient carries none, even straight after adding one', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  await addRecipient(page, 'CIMB Bank', FLORIST.accountNo, 'Rent', NOTE)
  // The To field goes back to the picker; pick Rachum Greene (seeded).
  await page.locator('.mvp-send__parties .mn-form-field').nth(1).locator('.mn-select-wallet-account__control').click()
  await expect(page).toHaveURL(/\/transfer$/)
  await page.locator('.mvp-transfer__list > li:has-text("Rachum Greene")').getByRole('button').click()
  await openReview(page, '25.00')
  await expect(reviewRow(page, 'Recipient Reference')).toHaveCount(0)
  await page.locator('.mn-sheet__actions .mn-btn--primary').click()
  const [stored] = sends(await readTransactions(page))
  expect(stored.recipientId).toBe('recipient-rachum-greene')
  expect(stored.transferDetails).toBeUndefined()
})

test('B5 a different user-added recipient carries none, and the just-added one still does in the same journey', async ({ page }) => {
  await installStorePreset(page, WITH_NEW_RECIPIENT)
  await gotoRoute(page, '/transfer', 'light')
  await addRecipient(page, 'CIMB Bank', FLORIST.accountNo, 'Bill Payment', NOTE)
  const floristUrl = page.url()
  await page.locator('.mvp-send__parties .mn-form-field').nth(1).locator('.mn-select-wallet-account__control').click()
  await page.locator(`.mvp-transfer__list > li:has-text("${STORED_RECIPIENT.name}")`).getByRole('button').click()
  // Gunther is flagged (Decision 35); the alert is the first surface. The
  // details do not belong to him, wherever the review is reached from.
  await amountField(page).fill('10000.00')
  await transferMoney(page).click()
  await page.getByRole('dialog', { name: 'High-Risk Transfer' }).getByRole('button', { name: 'Proceed Anyway' }).click()
  await page.getByRole('dialog', { name: 'Proceed with high-risk transfer' }).getByRole('button', { name: 'Proceed Anyway' }).click()
  await expect(review(page)).toBeVisible()
  await expect(reviewRow(page, 'Recipient Reference')).toHaveCount(0)
  // Back out, return to the florist: nothing has been sent, so its details are still there.
  await page.goBack()
  await page.locator('.mvp-send__parties .mn-form-field').nth(1).locator('.mn-select-wallet-account__control').click()
  await page.locator('.mvp-transfer__list > li:has-text("Lumen & Larch Florist")').getByRole('button').click()
  expect(page.url()).toBe(floristUrl)
  await openReview(page, '100.00')
  await expect(reviewRow(page, 'Recipient Reference').locator('dd')).toHaveText('Bill Payment')
})

test('B6 the high-risk path keeps them through warning, confirm and review, with history as R103-3 shapes it', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  await addRecipient(page, 'Affin Bank', '6451352078', 'Loan Repayment', NOTE)
  await amountField(page).fill('10000.00')
  const base = await historyIdx(page)
  await transferMoney(page).click()
  const warning = page.getByRole('dialog', { name: 'High-Risk Transfer' })
  await expect(warning).toBeVisible()
  expect(await historyIdx(page), 'the warning is pushed').toBe(base + 1)
  // Cancel goes BACK one entry, with the draft kept.
  await warning.getByRole('button', { name: 'Cancel Transfer' }).click()
  await expect(warning).toHaveCount(0)
  expect(await historyIdx(page), 'Cancel went back').toBe(base)
  await transferMoney(page).click()
  await page.getByRole('dialog', { name: 'High-Risk Transfer' }).getByRole('button', { name: 'Proceed Anyway' }).click()
  await expect(page.getByRole('dialog', { name: 'Proceed with high-risk transfer' })).toBeVisible()
  expect(await historyIdx(page), 'the confirm REPLACES the warning').toBe(base + 1)
  await page.getByRole('dialog', { name: 'Proceed with high-risk transfer' }).getByRole('button', { name: 'Proceed Anyway' }).click()
  await expect(review(page)).toBeVisible()
  expect(await historyIdx(page), 'the review REPLACES the confirm').toBe(base + 1)
  await expect(reviewRow(page, 'Recipient Reference').locator('dd')).toHaveText('Loan Repayment')
  await expect(reviewRow(page, 'Other Payment Details').locator('dd')).toHaveText(NOTE)
  // Device Back from the review returns to the amount screen, and the details survive another round.
  await page.goBack()
  await expect(review(page)).toHaveCount(0)
  expect(await historyIdx(page)).toBe(base)
  await transferMoney(page).click()
  await page.getByRole('dialog', { name: 'High-Risk Transfer' }).getByRole('button', { name: 'Proceed Anyway' }).click()
  await page.getByRole('dialog', { name: 'Proceed with high-risk transfer' }).getByRole('button', { name: 'Proceed Anyway' }).click()
  await expect(reviewRow(page, 'Other Payment Details').locator('dd')).toHaveText(NOTE)
  await page.locator('.mn-sheet__actions .mn-btn--primary').click()
  const [stored] = sends(await readTransactions(page))
  expect(stored.transferDetails).toEqual({ recipientReference: 'loan-repayment', otherPaymentDetails: NOTE })
})

test('B7 a reload mid-journey drops the in-memory draft: that send carries none (stated, Gate 85)', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  await addRecipient(page, 'CIMB Bank', FLORIST.accountNo, 'Family Support', NOTE)
  await page.reload()
  // The recipient is stored, so the amount screen still opens; the draft is gone.
  await expect(page.locator('.mvp-send__parties .mn-form-field').nth(1)).toContainText('Lumen & Larch Florist')
  await openReview(page, '100.00')
  await expect(reviewRow(page, 'Recipient Reference')).toHaveCount(0)
  await page.locator('.mn-sheet__actions .mn-btn--primary').click()
  const [stored] = sends(await readTransactions(page))
  expect(stored.transferDetails).toBeUndefined()
})

test('B8 a 40-character note with no space wraps on both sheets and is never truncated', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  await addRecipient(page, 'CIMB Bank', FLORIST.accountNo, null, LONG_NOTE)
  await openReview(page, '100.00')
  const fits = async (dd: ReturnType<Page['locator']>, container: ReturnType<Page['locator']>) => {
    await expect(dd).toHaveText(LONG_NOTE)
    const [box, outer, scroll, client] = await Promise.all([
      dd.boundingBox(),
      container.boundingBox(),
      dd.evaluate((el) => el.scrollWidth),
      dd.evaluate((el) => el.clientWidth),
    ])
    expect(scroll, 'no horizontal overflow inside the value').toBeLessThanOrEqual(client)
    expect(box!.x + box!.width).toBeLessThanOrEqual(outer!.x + outer!.width + 0.5)
    expect(box!.height, 'it wrapped onto more than one line').toBeGreaterThan(30)
  }
  await fits(reviewRow(page, 'Other Payment Details').locator('dd'), review(page).locator('.mvp-review__rows'))
  await page.locator('.mn-sheet__actions .mn-btn--primary').click()
  await page.getByRole('button', { name: 'View transaction' }).click()
  await fits(sheetRow(page, 'Other Payment Details').locator('dd'), sheet(page).locator('.mvp-txn-detail__rows'))
})

test('B9 leaving the transfer flow after the save drops them: back in, the first send carries none', async ({ page }) => {
  const transferItem = page.locator('.mvp-shell__nav .mn-bottom-nav__item', { hasText: 'Transfer' })
  const transferSheet = page.getByRole('dialog', { name: 'Transfer' })
  await gotoRoute(page, '/', 'light')
  await transferItem.click()
  await transferSheet.getByRole('button', { name: /^Send/ }).click()
  await expect(page).toHaveURL(/\/transfer$/)
  await addRecipient(page, 'CIMB Bank', FLORIST.accountNo, 'Family Support', NOTE)
  // To the picker, then out of /transfer* to Home: the draft is emptied.
  await page.locator('.mvp-send__parties .mn-form-field').nth(1).locator('.mn-select-wallet-account__control').click()
  await expect(page).toHaveURL(/\/transfer$/)
  await page.goBack()
  await expect.poll(() => new URL(page.url()).pathname).toBe('/')
  await transferItem.click()
  await transferSheet.getByRole('button', { name: /^Send/ }).click()
  await page.locator('.mvp-transfer__list > li:has-text("Lumen & Larch Florist")').getByRole('button').click()
  await openReview(page, '100.00')
  await expect(reviewRow(page, 'Recipient Reference')).toHaveCount(0)
  await expect(reviewRow(page, 'Other Payment Details')).toHaveCount(0)
})

test('B10 a stale draft in a second tab: the first payment went through elsewhere, so the guard refuses this one, nothing is written, and the user is told', async ({ page, context }) => {
  const GUNTHER = BANK_DIRECTORY.find((a) => a.name === 'Gunther Cenperk')!
  const kinds = (p: Page) =>
    p.evaluate(async (path) => {
      const d: { persistenceLog: () => { kind: string }[] } = await import(path)
      return d.persistenceLog().map((e) => e.kind)
    }, DIAGNOSTICS_MODULE)

  // TAB A adds Gunther and stops on his amount screen: the draft holds the form's details.
  await gotoRoute(page, '/transfer', 'light')
  await addRecipient(page, 'Affin Bank', GUNTHER.accountNo, 'Family Support', NOTE)
  await expect(amountField(page)).toBeVisible()
  await readTransactions(page) // waits for the recipient's write to commit

  // TAB B (same context: the same store and channel) pays Gunther his FIRST payment, with no details.
  const other = await context.newPage()
  await gotoRoute(other, '/transfer', 'light')
  await other.locator('.mvp-transfer__list > li:has-text("Gunther Cenperk")').getByRole('button').click()
  await amountField(other).fill('10.00')
  await transferMoney(other).click()
  await other.getByRole('dialog', { name: 'High-Risk Transfer' }).getByRole('button', { name: 'Proceed Anyway' }).click()
  await other.getByRole('dialog', { name: 'Proceed with high-risk transfer' }).getByRole('button', { name: 'Proceed Anyway' }).click()
  await other.locator('.mn-sheet__actions .mn-btn--primary').click()
  await expect(other.locator('.mvp-transfer-done__hero')).toContainText('Gunther Cenperk')
  await readTransactions(other)

  // TAB A hears it and re-hydrates: its ledger now names Gunther, but its draft still carries the details.
  await expect.poll(() => kinds(page)).toContain('rehydrated')
  const errors: string[] = []
  const warnings: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'warning') warnings.push(m.text())
  })
  await amountField(page).fill('20.00')
  await transferMoney(page).click()
  // Not a first payment any more: no high-risk warning, straight to the review, still showing the stale details.
  await expect(review(page)).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'High-Risk Transfer' })).toHaveCount(0)
  await expect(reviewRow(page, 'Recipient Reference').locator('dd')).toHaveText('Family Support')

  // Transfer now: the guard refuses (sendMoney throws at the call site) and nothing is written.
  await page.locator('.mn-sheet__actions .mn-btn--primary').click()
  // The refusal is no longer silent (Gate 106, R106-9 "fix it now"): the review closes, a message
  // says nothing was sent, and the refusal is logged rather than thrown uncaught.
  const notice = page.locator('.mvp-notice')
  await expect(notice).toContainText("That transfer wasn't sent")
  await expect(notice).toContainText('Nothing was sent')
  await expect(notice.getByRole('status')).toBeVisible()
  await expect(review(page)).toHaveCount(0)
  expect(errors, 'the refusal is caught, not an uncaught page error').toEqual([])
  expect(warnings.some((w) => /Transfer refused:.*sendMoney: txn-send-.* a second payment/s.test(w))).toBe(true)
  const rows = sends(await readTransactions(page))
  expect(rows, 'exactly one Gunther send, and it is the other tab\'s').toHaveLength(1)
  expect(rows[0].amount).toBe(-10)
  expect(rows[0].transferDetails, 'the other tab carried no details').toBeUndefined()
  expect(rows.some((t) => t.amount === -20)).toBe(false)
  // The stale draft is dropped (its details would be refused again): still on the amount screen, empty.
  await expect(page).toHaveURL(/\/transfer\/send\/recipient-[0-9a-f-]{36}$/)
  await expect(amountField(page)).toHaveValue('')
  await expect(page.locator('.mvp-transfer-done')).toHaveCount(0)
  // The message belongs to this screen: leaving it dismisses it.
  await page.goBack()
  await expect.poll(() => new URL(page.url()).pathname).toBe('/transfer')
  await expect(page.locator('.mvp-notice')).toHaveCount(0)
})
