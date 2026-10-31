import { expect, test, type Page } from '@playwright/test'
import { PINNED_NOW, gotoRoute } from './harness'
import { FIAT_ACCOUNTS } from '../src/data/accounts'
import {
  accountNumberLine,
  bankHoldingFor,
  buildSend,
  cashAccountLine,
  maskedAccountNo,
  recentRecipients,
  sendAmountInput,
  sendCategory,
  sendKind,
  sendRowProblem,
  transactionDisposition,
  transferAmountError,
} from '../src/data/derive'
import { formatMyr } from '../src/data/format'
import { HOLDINGS } from '../src/data/holdings'
import { RECIPIENTS } from '../src/data/recipients'
import { TRANSACTIONS } from '../src/data/transactions'
import type { Recipient, Transaction } from '../src/data/types'
import { MIGRATIONS, SCHEMA_VERSION, isStoredTransaction } from '../src/persistence/schema'

/**
 * GATE 93 — Flow 4 part 2: the amount screen, the review, the send and the
 * success page. No baseline; the ten walk states photograph the surfaces.
 *
 * Node tests pin the pure rules (`derive.ts`); browser tests reach every screen
 * through the app's own controls, and never assert a written row's random id or
 * reference by value — only by shape.
 */

const MAIN = FIAT_ACCOUNTS[0]!
const JOINT = FIAT_ACCOUNTS[1]!
const byId = (id: string): Recipient => RECIPIENTS.find((r) => r.id === id)!
const AEON = byId('recipient-aeon-big')
const CARING = byId('recipient-caring-pharmacy')
const RACHUM = byId('recipient-rachum-greene')
const PERRY = byId('recipient-perry-matthew')
const REFERENCE = /^MNRC\d{8}[0-9A-HJKMNP-TV-Z]{6}$/

const amountField = (page: Page) => page.getByRole('combobox', { name: 'Transfer Amount' })
const fromTrigger = (page: Page) => page.getByRole('button', { name: /^From / })
const toTrigger = (page: Page) => page.getByRole('button', { name: /^To / })
const fromMenu = (page: Page) => page.locator('.mn-select-wallet-account__menu')
const review = (page: Page) => page.getByRole('dialog', { name: 'Review transfer' })
const errorLine = (page: Page) => page.locator('.mvp-send .mn-field-message--error')

/** The picker, then a recipient — the in-app way onto the amount screen. */
async function openSend(page: Page, recipient: Recipient): Promise<void> {
  await gotoRoute(page, '/transfer', 'light')
  await page.locator('.mvp-transfer__list > li', { hasText: recipient.name }).getByRole('button').click()
  await expect(page).toHaveURL(new RegExp(`/transfer/send/${recipient.id}$`))
}

async function send(page: Page, amount: string): Promise<void> {
  await amountField(page).fill(amount)
  await page.getByRole('button', { name: 'Transfer money' }).click()
  await expect(review(page)).toBeVisible()
  await review(page).getByRole('button', { name: 'Transfer now' }).click()
  await expect(page).toHaveURL(/\/transfer\/done\/txn-send-[0-9a-f-]{36}$/)
}

// ═══════════════════════════════ Node: the rules ════════════════════════════

test('N1 the amount field keeps the digits and the first decimal point', () => {
  expect(sendAmountInput('RM 2550.00')).toBe('2550.00')
  expect(sendAmountInput('RM 1,234.5')).toBe('1234.5')
  expect(sendAmountInput('1.2.3')).toBe('1.23')
  expect(sendAmountInput('abc')).toBe('')
  expect(sendAmountInput('')).toBe('')
})

test('N2 the amount rule and its three messages, compared in sen', () => {
  for (const empty of ['', '.', '0', '0.00']) expect(transferAmountError(empty, MAIN.balance)).toBe('Enter an amount')
  expect(transferAmountError('1.234', MAIN.balance)).toBe('Up to 2 decimal places')
  expect(transferAmountError('27978.60', MAIN.balance)).toBe('More than your balance of RM 27,978.59')
  expect(transferAmountError('27978.59', MAIN.balance)).toBeNull()
  expect(transferAmountError('2550', MAIN.balance)).toBeNull()
  expect(transferAmountError('0.01', MAIN.balance)).toBeNull()
})

test('N3 a send to a business is a payment in its latest category; to a person, a transfer in others (22A)', () => {
  expect(sendKind(AEON)).toBe('payment')
  expect(sendKind(RACHUM)).toBe('transfer')
  expect(sendCategory(AEON, TRANSACTIONS)).toBe('groceries')
  expect(sendCategory(CARING, TRANSACTIONS)).toBe('healthcare')
  expect(sendCategory(RACHUM, TRANSACTIONS)).toBe('others')
  expect(sendCategory(AEON, [])).toBe('others')
})

test('N4 buildSend writes the row the screen sends, with a new id and reference', () => {
  const row = buildSend({ recipient: AEON, accountId: MAIN.id, amountSen: 1230, now: PINNED_NOW, transactions: TRANSACTIONS })
  expect(row).toMatchObject({
    accountId: MAIN.id,
    merchant: 'Aeon Big',
    logo: AEON.mark,
    method: 'Fund Transfer',
    kind: 'payment',
    amount: -12.3,
    currency: 'MYR',
    occurredAt: '2026-08-15T09:41:00',
    category: 'groceries',
    recipientId: AEON.id,
  })
  expect(row.id).toMatch(/^txn-send-[0-9a-f-]{36}$/)
  expect(row.reference).toMatch(REFERENCE)
  expect(transactionDisposition(row)).toBe('purchase')
  const person = buildSend({ recipient: RACHUM, accountId: MAIN.id, amountSen: 1, now: PINNED_NOW, transactions: TRANSACTIONS })
  expect(transactionDisposition(person)).toBe('transfer')
})

test('N5 sendRowProblem refuses every malformed row and accepts a good one', () => {
  const good = buildSend({ recipient: RACHUM, accountId: MAIN.id, amountSen: 255000, now: PINNED_NOW, transactions: TRANSACTIONS })
  expect(sendRowProblem(good, FIAT_ACCOUNTS, RECIPIENTS)).toBeNull()
  const bad: [string, Partial<Transaction>][] = [
    ['zero', { amount: 0 }],
    ['a credit', { amount: 5 }],
    ['over the balance', { amount: -27978.6 }],
    ['an unknown account', { accountId: 'nope' }],
    ['the wrong method', { method: 'Card Payment' }],
    ['an unknown recipient', { recipientId: 'nope' }],
    ['the wrong kind', { kind: 'payment' }],
    ['no reference', { reference: undefined }],
  ]
  for (const [why, change] of bad) {
    expect(sendRowProblem({ ...good, ...change }, FIAT_ACCOUNTS, RECIPIENTS), why).not.toBeNull()
  }
  expect(sendRowProblem({ ...good, amount: -27978.59 }, FIAT_ACCOUNTS, RECIPIENTS)).toBeNull()
})

test('N6 recents: everyone sent to first, newest send first, then Figma order', () => {
  expect(recentRecipients(RECIPIENTS, TRANSACTIONS).map((r) => r.id)).toEqual(RECIPIENTS.map((r) => r.id))
  const at = (recipient: Recipient, occurredAt: string): Transaction => ({
    ...buildSend({ recipient, accountId: MAIN.id, amountSen: 100, now: PINNED_NOW, transactions: [] }),
    occurredAt,
  })
  const ledger = [...TRANSACTIONS, at(PERRY, '2026-08-15T09:00:00'), at(CARING, '2026-08-15T10:00:00')]
  expect(recentRecipients(RECIPIENTS, ledger).map((r) => r.name)).toEqual([
    'Caring Pharmacy',
    'Perry Matthew',
    'Aeon Big',
    'Rachum Greene',
    'Fiona Hammock',
  ])
})

test('N7 ruling 23: the account number lives on the holding and the masked form is derived', () => {
  const main = bankHoldingFor(HOLDINGS, 'main')!
  const joint = bankHoldingFor(HOLDINGS, 'joint')!
  expect(main.accountNumber).toBe('6235474597')
  expect(main.bankCode).toBe('MN')
  expect(accountNumberLine(main)).toBe('6235474597 • MN')
  expect(maskedAccountNo(main.accountNumber)).toBe('•••• 4597')
  expect(maskedAccountNo(joint.accountNumber)).toBe('•••• 3160')
  expect(cashAccountLine(HOLDINGS, JOINT)).toBe(`${joint.accountNumber} • MN`)
  expect(Object.keys(MAIN)).not.toContain('accountNumber')
})

test('N8 schema v2: an identity step from v1, and recipientId validated', () => {
  expect(SCHEMA_VERSION).toBe(2)
  const snapshot = { transactions: [] }
  expect(MIGRATIONS[1]!(snapshot)).toBe(snapshot)
  const row = buildSend({ recipient: RACHUM, accountId: MAIN.id, amountSen: 100, now: PINNED_NOW, transactions: [] })
  expect(isStoredTransaction(row)).toBe(true)
  expect(isStoredTransaction({ ...row, recipientId: undefined })).toBe(true)
  expect(isStoredTransaction({ ...row, recipientId: '' })).toBe(false)
  expect(isStoredTransaction({ ...row, recipientId: 7 })).toBe(false)
})

// ═══════════════════════════════ browser: the flow ══════════════════════════

test('B1 a recipient opens the amount screen as drawn, with no error before a touch', async ({ page }) => {
  await openSend(page, RACHUM)
  await expect(page.locator('.mvp-send .mn-header-default')).toContainText('Send money')
  await expect(fromTrigger(page)).toContainText('Main')
  await expect(fromTrigger(page)).toContainText('6235474597 • MN')
  await expect(fromTrigger(page)).toContainText(formatMyr(MAIN.balance))
  await expect(toTrigger(page)).toContainText('Rachum Greene')
  await expect(toTrigger(page)).toContainText('4597623547 • CIMB')
  await expect(page.locator('.mvp-shell__nav')).toHaveCount(0)
  await expect(page.locator('.mvp-shell__fab')).toHaveCount(0)
  await expect(errorLine(page)).toHaveCount(0)
  await expect(page.locator('.mvp-send__balance')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Transfer money' })).toBeEnabled()
})

test('B2 an unknown recipient goes back to the picker, replacing itself', async ({ page }) => {
  await gotoRoute(page, '/transfer/send/nope', 'light')
  await expect(page).toHaveURL(/\/transfer$/)
  expect(await page.evaluate(() => history.length)).toBe(2)
})

test('B3 the amount rules: an attempt reveals and focuses; the field echoes; the balance follows', async ({ page }) => {
  await openSend(page, RACHUM)
  await page.getByRole('button', { name: 'Transfer money' }).click()
  await expect(errorLine(page)).toHaveText('Enter an amount')
  await expect(amountField(page)).toBeFocused()
  await expect(review(page)).toHaveCount(0)
  await amountField(page).fill('1.234')
  await expect(errorLine(page)).toHaveText('Up to 2 decimal places')
  await amountField(page).fill('27978.60')
  await expect(errorLine(page)).toHaveText('More than your balance of RM 27,978.59')
  await amountField(page).fill('RM 2,550.00')
  await expect(amountField(page)).toHaveValue('RM 2550.00')
  await expect(errorLine(page)).toHaveCount(0)
  await expect(page.locator('.mvp-send__balance')).toHaveText('Your new balanceRM 25,428.59')
})

test('B4 an amount left invalid shows its error once the field is left', async ({ page }) => {
  await openSend(page, RACHUM)
  await amountField(page).fill('0')
  await expect(errorLine(page)).toHaveCount(0)
  await page.keyboard.press('Tab')
  await expect(errorLine(page)).toHaveText('Enter an amount')
})

test('B5 the From menu: a pick switches the account, closes and STAYS closed, and returns focus', async ({ page }) => {
  await openSend(page, RACHUM)
  await amountField(page).fill('100')
  await fromTrigger(page).click()
  await expect(fromMenu(page)).toHaveCount(1)
  await expect(fromMenu(page).getByRole('option')).toHaveCount(2)
  await fromMenu(page).getByRole('option', { name: /Joint Account/ }).click()
  await expect(fromMenu(page)).toHaveCount(0)
  await page.waitForTimeout(400)
  await expect(fromMenu(page), 'the menu stayed closed through a 400 ms window').toHaveCount(0)
  await expect(fromTrigger(page)).toBeFocused()
  await expect(fromTrigger(page)).toContainText('Joint Account')
  await expect(fromTrigger(page)).toContainText(formatMyr(JOINT.balance))
  await expect(page.locator('.mvp-send__balance')).toHaveText(`Your new balance${formatMyr(JOINT.balance - 100)}`)
  // Escape and an outside press both close it (DS v2.12.0), and neither moves anything.
  await fromTrigger(page).click()
  await page.keyboard.press('Escape')
  await expect(fromMenu(page)).toHaveCount(0)
  await fromTrigger(page).click()
  await page.locator('.mvp-send .mn-header-default').click({ position: { x: 200, y: 20 } })
  await expect(fromMenu(page)).toHaveCount(0)
  await expect(page).toHaveURL(new RegExp(`/transfer/send/${RACHUM.id}$`))
})

test('B6 the To field goes back to the picker, and the amount survives a new pick', async ({ page }) => {
  await openSend(page, RACHUM)
  await amountField(page).fill('42.50')
  await toTrigger(page).click()
  await expect(page).toHaveURL(/\/transfer$/)
  await page.locator('.mvp-transfer__list > li', { hasText: PERRY.name }).getByRole('button').click()
  await expect(toTrigger(page)).toContainText('Perry Matthew')
  await expect(amountField(page)).toHaveValue('RM 42.50')
})

test('B7 a deep-linked amount screen never backs out of the app: To replaces itself with the picker', async ({ page }) => {
  await gotoRoute(page, `/transfer/send/${PERRY.id}`, 'light')
  await toTrigger(page).click()
  await expect(page).toHaveURL(/\/transfer$/)
  expect(await page.evaluate(() => history.length)).toBe(2)
})

test('B8 the review: close, Escape, the scrim and device Back all return with everything kept', async ({ page }) => {
  await openSend(page, RACHUM)
  await amountField(page).fill('2550.00')
  const reopen = async () => {
    await page.getByRole('button', { name: 'Transfer money' }).click()
    await expect(review(page)).toBeVisible()
    await expect(review(page)).toContainText('RM 2,550.00')
    await expect(review(page)).toContainText('Main · 6235474597 • MN')
    await expect(review(page)).toContainText('RM 25,428.59')
  }
  const kept = async () => {
    await expect(review(page)).toHaveCount(0)
    await expect(page).toHaveURL(new RegExp(`/transfer/send/${RACHUM.id}$`))
    await expect(amountField(page)).toHaveValue('RM 2550.00')
    await expect(fromTrigger(page)).toContainText(formatMyr(MAIN.balance))
  }
  await reopen()
  await review(page).getByRole('button', { name: 'Close' }).click()
  await kept()
  await reopen()
  await page.keyboard.press('Escape')
  await kept()
  await reopen()
  await page.mouse.click(187, 60)
  await kept()
  await reopen()
  await page.goBack()
  await kept()
})

test('B9 a send to a person: the success page, Back to the picker, recents, and the debit', async ({ page }) => {
  await openSend(page, RACHUM)
  await send(page, '2550.00')
  await expect(page.locator('.mvp-transfer-done__hero')).toHaveText('Transfer successfulRM 2,550.00to Rachum Greene')
  await expect(page.locator('.mvp-transfer-done__rows')).toContainText('Main · 6235474597 • MN')
  await expect(page.locator('.mvp-transfer-done__rows')).toContainText('15 Aug, 09:41')
  await expect(page.locator('.mvp-transfer-done')).not.toContainText('MNRC')
  await page.goBack()
  await expect(page).toHaveURL(/\/transfer$/)
  await expect(page.locator('.mvp-transfer__list > li').first()).toContainText('Rachum Greene')
  await page.locator('.mvp-transfer__list > li', { hasText: RACHUM.name }).getByRole('button').click()
  await expect(amountField(page), 'the draft was cleared by the send').toHaveValue('')
  await expect(fromTrigger(page)).toContainText('RM 25,428.59')
})

test('B10 a send to a business is a payment in its category, and View transaction opens it once', async ({ page }) => {
  await openSend(page, AEON)
  await send(page, '12.30')
  await page.getByRole('button', { name: 'View transaction' }).click()
  await expect(page).toHaveURL(/\/finance$/)
  await expect(page.getByRole('tab', { name: 'Transactions' })).toHaveAttribute('aria-selected', 'true')
  const sheet = page.getByRole('dialog', { name: 'Transaction details' })
  await expect(sheet).toContainText('Aeon Big')
  await expect(sheet).toContainText('-RM 12.30')
  await expect(sheet).toContainText('Groceries')
  await expect(sheet.getByRole('button', { name: 'Add Receipt' })).toHaveCount(1)
  // One-shot: the request was dropped from history state, so a reload opens nothing.
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await expect(page.getByRole('tab', { name: 'Transactions' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('B11 Done goes home; an id that names no send goes home', async ({ page }) => {
  await openSend(page, RACHUM)
  await send(page, '1.00')
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page).toHaveURL(/\/$/)
  for (const id of ['nope', 'txn-aeon-0915']) {
    await gotoRoute(page, `/transfer/done/${id}`, 'light')
    await expect(page).toHaveURL(/\/$/)
  }
})

test('B12 the currency chevron says Coming soon.', async ({ page }) => {
  await openSend(page, RACHUM)
  await page.getByRole('button', { name: 'Choose currency' }).click()
  await expect(page.locator('.mvp-notice .mn-toast-mobile')).toHaveText('Coming soon.')
})

test('B13 the draft is cleared when the path leaves /transfer', async ({ page }) => {
  await openSend(page, RACHUM)
  await amountField(page).fill('9.99')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/transfer$/)
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.locator('.mvp-shell__nav').getByRole('button', { name: 'Transfer' }).click()
  await page.getByRole('dialog', { name: 'Transfer' }).getByRole('button', { name: /^Send/ }).click()
  await page.locator('.mvp-transfer__list > li', { hasText: RACHUM.name }).getByRole('button').click()
  await expect(amountField(page)).toHaveValue('')
})

// ════════════ Node: sendCategory against rows the seed cannot supply (R93-14) ═══
//
// The seed gives each business ONE category and ONE kind, so N3 cannot tell
// "latest payment" from "any row" or "earliest". These use typed synthetic rows
// built from `buildSend`, so a change to `Transaction` breaks them at compile
// time. Pure and Node-only: no seed, no baseline, no browser.

const synthetic = (recipient: Recipient, change: Partial<Transaction>): Transaction => ({
  ...buildSend({ recipient, accountId: MAIN.id, amountSen: 100, now: PINNED_NOW, transactions: [] }),
  ...change,
})

test('N9 sendCategory: the LATEST payment wins, in whatever order the ledger lists them', () => {
  const older = synthetic(AEON, { id: 'older', kind: 'payment', category: 'shopping', occurredAt: '2026-01-01T10:00:00' })
  const newer = synthetic(AEON, { id: 'newer', kind: 'payment', category: 'dining', occurredAt: '2026-03-01T10:00:00' })
  expect(sendCategory(AEON, [older, newer])).toBe('dining')
  expect(sendCategory(AEON, [newer, older])).toBe('dining')
})

test('N10 sendCategory: only PAYMENTS count, and only this business\'s own', () => {
  const payment = synthetic(AEON, { id: 'payment', kind: 'payment', category: 'transport', occurredAt: '2026-01-01T10:00:00' })
  const newerTransfer = synthetic(AEON, { id: 'transfer', kind: 'transfer', category: 'bills', occurredAt: '2026-03-01T10:00:00' })
  const newerElsewhere = synthetic(CARING, { id: 'elsewhere', kind: 'payment', category: 'healthcare', occurredAt: '2026-04-01T10:00:00' })
  expect(sendCategory(AEON, [payment, newerTransfer, newerElsewhere])).toBe('transport')
  expect(sendCategory(AEON, [newerElsewhere, newerTransfer, payment])).toBe('transport')
})

test('N11 sendCategory: a business with no payment of its own falls back to others', () => {
  const onlyTransfer = synthetic(AEON, { id: 'transfer', kind: 'transfer', category: 'bills', occurredAt: '2026-03-01T10:00:00' })
  const otherBusiness = synthetic(CARING, { id: 'elsewhere', kind: 'payment', category: 'healthcare', occurredAt: '2026-04-01T10:00:00' })
  expect(sendCategory(AEON, [onlyTransfer, otherBusiness])).toBe('others')
  expect(sendCategory(AEON, [])).toBe('others')
})

test('N12 sendCategory: a person is others even when payment rows carry their name', () => {
  const named = synthetic(RACHUM, { id: 'named', kind: 'payment', category: 'shopping', occurredAt: '2026-03-01T10:00:00' })
  expect(sendCategory(RACHUM, [named])).toBe('others')
  expect(sendCategory(PERRY, TRANSACTIONS)).toBe('others')
})
