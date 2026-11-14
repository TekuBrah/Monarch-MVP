import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  STORED_DELPHINE,
  STORED_ORRIN,
  STORED_RECIPIENT,
  STORED_WREN,
  WITH_NEW_RECIPIENT,
  WITH_RISK_PAYEES,
  gotoRoute,
  installStorePreset,
  type StorePreset,
} from './harness'
import { BANK_DIRECTORY } from '../src/data/bankDirectory'
import { RECIPIENTS } from '../src/data/recipients'
import { TRANSACTIONS } from '../src/data/transactions'
import {
  LOW_ACTIVITY_COUNT,
  NEW_ACCOUNT_DAYS,
  largestPreviousOutflowSen,
  transferRisk,
  type TransferRisk,
} from '../src/data/transferRisk'
import type { DirectoryAccount, Transaction, UserRecipient } from '../src/data/types'
import {
  FLAGGED_BY,
  HEADLINE_DRAWN,
  HEADLINE_LARGE_FIRST,
  HEADLINE_LOW_ACTIVITY,
  HEADLINE_NEW_ACCOUNT,
  LARGER_THAN_BEFORE,
  accountAgeLine,
  riskDetailLines,
  riskHeadline,
  transactionCountLine,
} from '../src/flows/transfer/riskCopy'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GATE 103 (Flow 6, part 2) — THE HIGH-RISK TRANSFER ALERT.
 *
 * Node tests pin Decision 35's rule and Decision 36's copy on synthetic rows
 * (and, where named, the real seed). Browser tests drive the alert through the
 * app's own controls on stored recipients: the draft and the alert's history
 * entries are in-memory, so they are only tested through the UI.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────── synthetic rows ──────────────────────────────

const DIR: DirectoryAccount[] = [
  { bankCode: 'AFFIN', accountNo: '1000000001', name: 'Young Quiet', kind: 'person', accountAgeDays: 10, transactionCount: 2 },
  { bankCode: 'RHB', accountNo: '1000000002', name: 'Young Busy', kind: 'person', accountAgeDays: 12, transactionCount: 38 },
  { bankCode: 'PBB', accountNo: '1000000003', name: 'Old Quiet', kind: 'person', accountAgeDays: 1460, transactionCount: 4 },
  { bankCode: 'MBB', accountNo: '1000000004', name: 'Old Busy', kind: 'person', accountAgeDays: 2190, transactionCount: 846 },
  { bankCode: 'MBB', accountNo: '1000000005', name: 'Edge', kind: 'person', accountAgeDays: NEW_ACCOUNT_DAYS, transactionCount: LOW_ACTIVITY_COUNT },
  { bankCode: 'MBB', accountNo: '1000000006', name: 'Just Under', kind: 'person', accountAgeDays: NEW_ACCOUNT_DAYS - 1, transactionCount: LOW_ACTIVITY_COUNT - 1 },
]

function payee(i: number): UserRecipient {
  const d = DIR[i]
  return {
    id: `recipient-test-${i}`,
    name: d.name,
    kind: d.kind,
    accountNo: d.accountNo,
    bankCode: d.bankCode,
    mark: { kind: 'placeholder' },
    addedAt: '2026-08-15T09:41:00',
  }
}
const USERS = DIR.map((_, i) => payee(i))

function row(over: Partial<Transaction> & Pick<Transaction, 'id' | 'amount'>): Transaction {
  return {
    merchant: 'Somewhere',
    logo: { kind: 'merchant', name: 'aeon' },
    method: 'Card Payment',
    kind: 'payment',
    currency: 'MYR',
    occurredAt: '2025-09-01T10:00:00',
    category: 'others',
    accountId: 'main',
    ...over,
  } as Transaction
}

/** A ledger whose largest outflow to another party is RM 500.00. */
const LEDGER: Transaction[] = [
  row({ id: 't1', amount: -120.5 }),
  row({ id: 't2', amount: -500 }),
  row({ id: 't3', amount: 900 }), // a credit — never counts
]

const risk = (i: number, amountSen: number, transactions: readonly Transaction[] = LEDGER, users = USERS) =>
  transferRisk({ recipient: USERS[i], userRecipients: users, directory: DIR, transactions, amountSen })

// ─────────────────────────────── Node: the rule ──────────────────────────────

test('N1 (c) today: the largest previous outflow over the seed is RM 2,647.67, from txn-ikea-0815', () => {
  expect(largestPreviousOutflowSen(TRANSACTIONS)).toBe(264767)
  const largest = TRANSACTIONS.filter((t) => t.amount < 0 && t.goalId === undefined).sort((a, b) => a.amount - b.amount)[0]
  expect(largest.id).toBe('txn-ikea-0815')
})

test('N2 each reason alone: (a) young but busy, (b) old but quiet, (c) a large first payment', () => {
  expect(risk(1, 10000)).toEqual({ flagged: true, reasons: ['newAccount'], ageDays: 12, txCount: 38 })
  expect(risk(2, 10000)).toEqual({ flagged: true, reasons: ['lowActivity'], ageDays: 1460, txCount: 4 })
  expect(risk(3, 60000)).toEqual({ flagged: true, reasons: ['largeFirst'], ageDays: 2190, txCount: 846 })
  // The same long-standing payee under the maximum: nothing fires.
  expect(risk(3, 10000)).toEqual({ flagged: false, reasons: [] })
})

test('N3 all three: Gunther at RM 10,000 over the real seed and directory', () => {
  const gunther = BANK_DIRECTORY.find((a) => a.name === 'Gunther Cenperk')!
  const user: UserRecipient = { ...STORED_RECIPIENT }
  expect(user.accountNo).toBe(gunther.accountNo)
  const got = transferRisk({
    recipient: user,
    userRecipients: [user],
    directory: BANK_DIRECTORY,
    transactions: TRANSACTIONS,
    amountSen: 1_000_000,
  })
  expect(got).toEqual({ flagged: true, reasons: ['newAccount', 'lowActivity', 'largeFirst'], ageDays: 10, txCount: 2 })
})

test('N4 never flagged: a seeded recipient, and a second payment to a user-added one', () => {
  const seeded = RECIPIENTS[0]
  expect(
    transferRisk({ recipient: seeded, userRecipients: USERS, directory: DIR, transactions: LEDGER, amountSen: 100_000_000 }),
  ).toEqual({ flagged: false, reasons: [] })
  // One ledger row already carries the recipient's id: not a first payment.
  const paid = [...LEDGER, row({ id: 't4', amount: -50, recipientId: USERS[0].id })]
  expect(risk(0, 100_000_000, paid)).toEqual({ flagged: false, reasons: [] })
  // ...and the same payee before that payment flags on all three.
  expect(risk(0, 100_000_000).reasons).toEqual(['newAccount', 'lowActivity', 'largeFirst'])
})

test('N5 the boundaries: 30 days and 10 transactions do not fire; (c) equal to the maximum does not fire', () => {
  expect(risk(4, 100)).toEqual({ flagged: false, reasons: [] })
  expect(risk(5, 100).reasons).toEqual(['newAccount', 'lowActivity'])
  expect(risk(3, 50000)).toEqual({ flagged: false, reasons: [] })
  expect(risk(3, 50001).reasons).toEqual(['largeFirst'])
})

test('N6 what (c) counts: a goal row is ignored, a crypto row is counted, a credit is ignored', () => {
  const withGoal = [...LEDGER, row({ id: 'g1', amount: -9000, goalId: 'goal-bali-trip', kind: 'transfer' })]
  expect(largestPreviousOutflowSen(withGoal)).toBe(50000)
  expect(risk(3, 60000, withGoal).reasons).toEqual(['largeFirst'])
  const withCrypto = [...LEDGER, row({ id: 'c1', amount: -9000, method: 'Crypto Transfer', kind: 'transfer', accountId: 'marg' })]
  expect(largestPreviousOutflowSen(withCrypto)).toBe(900000)
  expect(risk(3, 60000, withCrypto)).toEqual({ flagged: false, reasons: [] })
  const withCredit = [...LEDGER, row({ id: 'r1', amount: 9000 })]
  expect(largestPreviousOutflowSen(withCredit)).toBe(50000)
  // An empty ledger: any first payment fires (c).
  expect(largestPreviousOutflowSen([])).toBe(0)
  expect(risk(3, 1, []).reasons).toEqual(['largeFirst'])
})

test('N7 a user-added recipient missing from the directory is judged on (c) alone (R103-2)', () => {
  const unknown: UserRecipient = { ...USERS[0], id: 'recipient-test-unknown', accountNo: '9999999999' }
  const users = [...USERS, unknown]
  const judge = (amountSen: number) =>
    transferRisk({ recipient: unknown, userRecipients: users, directory: DIR, transactions: LEDGER, amountSen })
  expect(judge(100)).toEqual({ flagged: false, reasons: [] })
  const flagged = judge(60000)
  expect(flagged).toEqual({ flagged: true, reasons: ['largeFirst'], ageDays: undefined, txCount: undefined })
  expect(riskDetailLines(flagged)).toEqual([LARGER_THAN_BEFORE, FLAGGED_BY])
})

// ─────────────────────────────── Node: the copy ──────────────────────────────

test('N8 the headline names only what fired, and the account headline wins over (c) (R103-11)', () => {
  expect(riskHeadline(['newAccount', 'lowActivity'])).toBe(HEADLINE_DRAWN)
  expect(riskHeadline(['newAccount', 'lowActivity', 'largeFirst'])).toBe(HEADLINE_DRAWN)
  expect(riskHeadline(['newAccount'])).toBe(HEADLINE_NEW_ACCOUNT)
  expect(riskHeadline(['newAccount', 'largeFirst'])).toBe(HEADLINE_NEW_ACCOUNT)
  expect(riskHeadline(['lowActivity'])).toBe(HEADLINE_LOW_ACTIVITY)
  expect(riskHeadline(['lowActivity', 'largeFirst'])).toBe(HEADLINE_LOW_ACTIVITY)
  expect(riskHeadline(['largeFirst'])).toBe(HEADLINE_LARGE_FIRST)
  expect(() => riskHeadline([])).toThrow()
  // The four strings, exactly (Decision 36).
  expect([HEADLINE_DRAWN, HEADLINE_NEW_ACCOUNT, HEADLINE_LOW_ACTIVITY, HEADLINE_LARGE_FIRST]).toEqual([
    'New Account with low activity. Possible Scam.',
    'Newly opened account. Possible Scam.',
    'Account with low activity. Possible Scam.',
    'Unusually large first payment. Possible Scam.',
  ])
})

test('N9 the Details lines: order, singular and zero forms, and the fixed last line', () => {
  expect(accountAgeLine(0)).toBe('Account opened today')
  expect(accountAgeLine(1)).toBe('Account opened 1 day ago')
  expect(accountAgeLine(10)).toBe('Account opened 10 days ago')
  expect(transactionCountLine(0)).toBe('No transactions recorded')
  expect(transactionCountLine(1)).toBe('Only 1 transaction recorded')
  expect(transactionCountLine(2)).toBe('Only 2 transactions recorded')
  const all: TransferRisk = { flagged: true, reasons: ['newAccount', 'lowActivity', 'largeFirst'], ageDays: 10, txCount: 2 }
  expect(riskDetailLines(all)).toEqual([
    'Account opened 10 days ago',
    'Only 2 transactions recorded',
    "Larger than any payment you've sent before",
    "Flagged by Monarch's transfer checks",
  ])
  // Only the reasons that fired, even when the directory gave both figures.
  expect(riskDetailLines({ ...all, reasons: ['lowActivity'] })).toEqual(['Only 2 transactions recorded', FLAGGED_BY])
  expect(riskDetailLines({ ...all, reasons: ['newAccount'] })).toEqual(['Account opened 10 days ago', FLAGGED_BY])
})

// ─────────────────────────────── browser helpers ─────────────────────────────

const amountField = (page: Page) => page.locator('.mvp-send input[role="combobox"]')
const transferMoney = (page: Page) => page.locator('.mvp-send__body > .mn-btn--primary')
const warning = (page: Page) => page.getByRole('dialog', { name: 'High-Risk Transfer' })
const education = (page: Page) => page.getByRole('dialog', { name: 'Smart Fraud Protection' })
const confirm = (page: Page) => page.getByRole('dialog', { name: 'Proceed with high-risk transfer' })
const review = (page: Page) => page.getByRole('dialog', { name: 'Review transfer' })
const closeOf = (dialog: Locator) => dialog.locator('.mn-overlay-header__control')
const dialogs = (page: Page) => page.locator('[role="dialog"]')
/**
 * React Router's own history index (`history.state.idx`). Closing an alert view goes BACK (R103-3), which
 * restores the index; replacing the entry instead looks the same on screen but leaves it one higher.
 */
const historyIdx = (page: Page) => page.evaluate(() => (window.history.state as { idx?: number } | null)?.idx)

/** The store preset must be installed BEFORE the page's first navigation (see `installStorePreset`). */
async function openSend(page: Page, preset: StorePreset, recipientId: string, amount: string) {
  await installStorePreset(page, preset)
  await openSendOn(page, recipientId, amount)
}
async function openSendOn(page: Page, recipientId: string, amount: string) {
  await gotoRoute(page, `/transfer/send/${recipientId}`, 'light')
  await amountField(page).fill(amount)
  await expect(page.locator('.mvp-send__balance')).toBeVisible()
}

/**
 * FOCUS MUST ARRIVE AND STAY (R92-24). A retrying `toBeFocused` returns the
 * moment the element holds focus, so a later loss is invisible to it; the
 * focusout listener records a loss whenever it happens inside the 400 ms
 * observation window.
 */
async function holdsFocus(page: Page, target: Locator) {
  await expect(target).toBeFocused()
  await target.evaluate((el) => {
    const w = window as unknown as { __riskFocusLost?: number }
    w.__riskFocusLost = 0
    el.addEventListener('focusout', () => {
      w.__riskFocusLost = (w.__riskFocusLost ?? 0) + 1
    })
  })
  await page.evaluate(() => new Promise<void>((done) => setTimeout(done, 400)))
  expect(await page.evaluate(() => (window as unknown as { __riskFocusLost?: number }).__riskFocusLost)).toBe(0)
  await expect(target).toBeFocused()
}

// ─────────────────────────────── browser ─────────────────────────────────────

test('B1 Gunther at RM 10,000: warning, second confirm, review, success — with the drawn copy and sizes', async ({ page }) => {
  await installStorePreset(page, WITH_NEW_RECIPIENT)
  await gotoRoute(page, '/transfer', 'light')
  await page.locator('.mvp-transfer__list > li').first().getByRole('button').click()
  await expect(page).toHaveURL(new RegExp(`/transfer/send/${STORED_RECIPIENT.id}$`))
  await amountField(page).fill('10000.00')
  await transferMoney(page).click()

  // HighRisk01: one dialog, the red block, the drawn headline, all three reasons.
  await expect(dialogs(page)).toHaveCount(1)
  await expect(warning(page)).toBeVisible()
  await expect(warning(page).locator('.mn-banner')).toHaveText('WarningHigh-Risk Transfer')
  await expect(warning(page).locator('.mn-banner')).not.toHaveAttribute('role', /./)
  await expect(warning(page).locator('.mvp-risk__headline')).toHaveText(HEADLINE_DRAWN)
  await expect(warning(page).locator('.mvp-risk__lines > li')).toHaveText([
    'Account opened 10 days ago',
    'Only 2 transactions recorded',
    "Larger than any payment you've sent before",
    "Flagged by Monarch's transfer checks",
  ])
  // Decision 39 = D: the drawn 56px glyph, from DS v2.15.0.
  const glyph = await warning(page).locator('.mvp-risk__glyph > *').boundingBox()
  expect([glyph!.width, glyph!.height]).toEqual([56, 56])
  // R103-8: the explainer is 12px / 600, opening nothing in a new tab.
  const link = warning(page).locator('.mvp-risk__learn .mn-link')
  await expect(link).toHaveAttribute('target', '_self')
  await expect(link.locator('.mn-link__icon')).toHaveCount(0)
  const font = await link.locator('span').evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).fontWeight])
  expect(font).toEqual(['12px', '600'])
  await expect(warning(page).getByRole('button', { name: 'Cancel Transfer' })).toHaveClass(/mn-btn--primary/)
  await expect(warning(page).getByRole('button', { name: 'Proceed Anyway' })).toHaveClass(/mn-btn--secondary/)
  await holdsFocus(page, closeOf(warning(page)))

  // HighRisk02, replacing the warning.
  await warning(page).getByRole('button', { name: 'Proceed Anyway' }).click()
  await expect(dialogs(page)).toHaveCount(1)
  await expect(confirm(page).locator('.mvp-risk__question')).toHaveText(
    'You are choosing to proceed with a flagged high-risk transfer. Do you still want to continue?',
  )
  await expect(confirm(page).locator('.mvp-risk__question .mvp-risk__error-text')).toHaveText('flagged high-risk transfer.')
  await expect(confirm(page).locator('.mvp-risk__party-text')).toHaveText('Gunther Cenperk6451352078 • AFFIN')
  const avatar = await confirm(page).locator('.mvp-risk__party > .mn-avatar--placeholder').boundingBox()
  expect([avatar!.width, avatar!.height]).toEqual([56, 56])
  await holdsFocus(page, closeOf(confirm(page)))

  // Flow 4's review, then the send.
  await confirm(page).getByRole('button', { name: 'Proceed Anyway' }).click()
  await expect(dialogs(page)).toHaveCount(1)
  await expect(review(page)).toBeVisible()
  await page.locator('.mn-sheet__actions .mn-btn--primary').click()
  await expect(page.locator('.mvp-transfer-done__hero')).toHaveText('Transfer successfulRM 10,000.00to Gunther Cenperk')
  // The alert entries were replaced, never added: Back from success lands on the picker.
  await page.goBack()
  await expect(page).toHaveURL(/\/transfer$/)
})

test('B2 the other three headlines, each listing only what fired', async ({ page }) => {
  const cases = [
    { who: STORED_WREN, amount: '100.00', headline: HEADLINE_NEW_ACCOUNT, lines: ['Account opened 12 days ago', FLAGGED_BY] },
    { who: STORED_ORRIN, amount: '100.00', headline: HEADLINE_LOW_ACTIVITY, lines: ['Only 4 transactions recorded', FLAGGED_BY] },
    { who: STORED_DELPHINE, amount: '3000.00', headline: HEADLINE_LARGE_FIRST, lines: [LARGER_THAN_BEFORE, FLAGGED_BY] },
  ]
  await installStorePreset(page, WITH_RISK_PAYEES)
  for (const c of cases) {
    await openSendOn(page, c.who.id, c.amount)
    await transferMoney(page).click()
    await expect(warning(page).locator('.mvp-risk__headline')).toHaveText(c.headline)
    await expect(warning(page).locator('.mvp-risk__lines > li')).toHaveText(c.lines)
  }
})

test('B3 Cancel, the close control, Escape and the scrim leave the warning with the draft kept and focus on Transfer money', async ({ page }) => {
  await openSend(page, WITH_NEW_RECIPIENT, STORED_RECIPIENT.id, '10000.00')
  const amountIdx = await historyIdx(page)
  expect(typeof amountIdx).toBe('number')
  for (const how of ['cancel', 'close', 'escape', 'scrim'] as const) {
    await transferMoney(page).click()
    await expect(warning(page)).toBeVisible()
    if (how === 'cancel') await warning(page).getByRole('button', { name: 'Cancel Transfer' }).click()
    if (how === 'close') await closeOf(warning(page)).click()
    if (how === 'escape') await page.keyboard.press('Escape')
    if (how === 'scrim') await page.locator('.mn-blanket').click({ position: { x: 5, y: 5 } })
    await expect(dialogs(page)).toHaveCount(0)
    await expect(amountField(page)).toHaveValue('RM 10000.00')
    expect(await historyIdx(page), `${how} goes back to the amount entry`).toBe(amountIdx)
    await holdsFocus(page, transferMoney(page))
  }
  // Cancel on the second confirm too.
  await transferMoney(page).click()
  await warning(page).getByRole('button', { name: 'Proceed Anyway' }).click()
  await confirm(page).getByRole('button', { name: 'Cancel Transfer' }).click()
  await expect(dialogs(page)).toHaveCount(0)
  await expect(amountField(page)).toHaveValue('RM 10000.00')
  expect(await historyIdx(page), 'Cancel on the confirm goes back to the amount entry').toBe(amountIdx)
  await holdsFocus(page, transferMoney(page))
})

test('B4 device Back at each step goes one step back (R103-3)', async ({ page }) => {
  await openSend(page, WITH_NEW_RECIPIENT, STORED_RECIPIENT.id, '10000.00')
  const path = new URL(page.url()).pathname
  await transferMoney(page).click()
  await expect(warning(page)).toBeVisible()
  // Warning -> Back -> the amount screen.
  await page.goBack()
  await expect(dialogs(page)).toHaveCount(0)
  await expect(amountField(page)).toHaveValue('RM 10000.00')
  // Warning -> education -> Back -> the warning again.
  await transferMoney(page).click()
  await warning(page).locator('.mvp-risk__learn .mn-link').click()
  await expect(education(page)).toBeVisible()
  await page.goBack()
  await expect(warning(page)).toBeVisible()
  await expect(dialogs(page)).toHaveCount(1)
  // Confirm REPLACED the warning, so Back from it lands on the amount screen.
  await warning(page).getByRole('button', { name: 'Proceed Anyway' }).click()
  await expect(confirm(page)).toBeVisible()
  await page.goBack()
  await expect(dialogs(page)).toHaveCount(0)
  await expect(amountField(page)).toHaveValue('RM 10000.00')
  // The review REPLACED the confirm, so Back from it lands on the amount screen too.
  await transferMoney(page).click()
  await warning(page).getByRole('button', { name: 'Proceed Anyway' }).click()
  await confirm(page).getByRole('button', { name: 'Proceed Anyway' }).click()
  await expect(review(page)).toBeVisible()
  await page.goBack()
  await expect(dialogs(page)).toHaveCount(0)
  expect(new URL(page.url()).pathname).toBe(path)
})

test('B5 the education overlay: one dialog, the shield as drawn, and Got it, close and Escape return to the warning', async ({ page }) => {
  await openSend(page, WITH_NEW_RECIPIENT, STORED_RECIPIENT.id, '10000.00')
  await transferMoney(page).click()
  await expect(warning(page)).toBeVisible()
  const warningIdx = await historyIdx(page)
  expect(typeof warningIdx).toBe('number')
  for (const how of ['got-it', 'close', 'escape'] as const) {
    await warning(page).locator('.mvp-risk__learn .mn-link').click()
    await expect(dialogs(page)).toHaveCount(1)
    await expect(education(page)).toBeVisible()
    await holdsFocus(page, closeOf(education(page)))
    if (how === 'got-it') await education(page).getByRole('button', { name: 'Got it' }).click()
    if (how === 'close') await closeOf(education(page)).click()
    if (how === 'escape') await page.keyboard.press('Escape')
    await expect(warning(page)).toBeVisible()
    await expect(dialogs(page)).toHaveCount(1)
    expect(await historyIdx(page), `${how} goes back to the warning entry`).toBe(warningIdx)
    await holdsFocus(page, closeOf(warning(page)))
  }
  // The content, as decided (Decision 36, drawn typos fixed).
  await warning(page).locator('.mvp-risk__learn .mn-link').click()
  await expect(education(page).locator('.mvp-risk-education__list').first().locator('li')).toHaveText([
    'Account age (newly opened accounts)',
    'Transaction history (very low activity)',
    'Unusual payment size for you',
  ])
  await expect(education(page).locator('.mvp-risk-education__list').nth(1).locator('li')).toHaveText([
    'Move or block money automatically',
    'Share your data with third parties',
    'Make decisions without your approval',
  ])
  await expect(education(page)).toContainText("Why you're seeing this alert")
  await expect(education(page).locator('.mvp-risk-education__nsrc')).toHaveText(
    'If someone is telling you to ignore this warning, cancel the transfer and call the National Scam Response Centre on 997.',
  )
  // Decision 37: decorative, decoded, and framed as Figma frames it (R103-13):
  // the visible art at (141.42, 71.81) in the card, 68.24 x 66.15, within 1px.
  const shield = education(page).locator('.mvp-risk-education__shield')
  await expect(shield).toHaveAttribute('alt', '')
  await expect.poll(() => shield.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(512)
  const card = (await education(page).boundingBox())!
  const img = (await shield.boundingBox())!
  const k = img.width / 512
  expect(Math.abs(img.x + 68 * k - card.x - 141.42)).toBeLessThanOrEqual(1)
  expect(Math.abs(img.y + 55 * k - card.y - 71.81)).toBeLessThanOrEqual(1)
  expect(Math.abs(426 * k - 68.24)).toBeLessThanOrEqual(1)
  expect(Math.abs(413 * k - 66.15)).toBeLessThanOrEqual(1)
  // Visible source pixels per rendered CSS pixel: at least 3.
  expect(426 / (426 * k)).toBeGreaterThanOrEqual(3)
})

test('B6 a second send to Gunther is not flagged: Transfer money opens the review directly', async ({ page }) => {
  await installStorePreset(page, WITH_NEW_RECIPIENT)
  await gotoRoute(page, '/transfer', 'light')
  await page.locator('.mvp-transfer__list > li').first().getByRole('button').click()
  await amountField(page).fill('10.00')
  await transferMoney(page).click()
  await warning(page).getByRole('button', { name: 'Proceed Anyway' }).click()
  await confirm(page).getByRole('button', { name: 'Proceed Anyway' }).click()
  await page.locator('.mn-sheet__actions .mn-btn--primary').click()
  await expect(page.locator('.mvp-transfer-done__hero')).toHaveText('Transfer successfulRM 10.00to Gunther Cenperk')
  await page.goBack()
  await page.locator('.mvp-transfer__list > li').first().getByRole('button').click()
  await amountField(page).fill('10000.00')
  await transferMoney(page).click()
  await expect(review(page)).toBeVisible()
  await expect(dialogs(page)).toHaveCount(1)
})

test('B7 an unflagged send is untouched, and a restored alert entry with no draft shows nothing', async ({ page }) => {
  await installStorePreset(page, WITH_NEW_RECIPIENT)
  // A seeded recipient never flags, at any amount: Flow 4 exactly.
  await gotoRoute(page, '/transfer/send/recipient-rachum-greene', 'light')
  await amountField(page).fill('10000.00')
  await transferMoney(page).click()
  await expect(review(page)).toBeVisible()
  await expect(dialogs(page)).toHaveCount(1)
  expect(await page.evaluate(() => (history.state as { usr?: Record<string, unknown> }).usr)).toEqual({ review: true })

  // A reload drops the in-memory draft: the restored alert entry shows nothing.
  await openSendOn(page, STORED_RECIPIENT.id, '10000.00')
  await transferMoney(page).click()
  await expect(warning(page)).toBeVisible()
  await page.reload()
  await expect(page.locator('.mvp-send')).toBeVisible()
  await expect(dialogs(page)).toHaveCount(0)
})

// ─────────────── R103-19 — the three views cap to the Modal's box ───────────────

/**
 * Every view's card stays inside the `Modal`'s own padded box (the DS's padding is READ, not restated),
 * its close control and every footer button are whole on the screen with no page scroll and nothing over
 * them, and the content area reaches its last element by scrolling itself. `overflows` reports what was
 * measured so the caller can assert which views are expected to scroll at a viewport.
 */
async function expectCapped(
  page: Page,
  dialog: Locator,
  lastElement: Locator,
  vp: { width: number; height: number },
  footerButtons: number,
) {
  const pad = await page.locator('.mn-modal').evaluate((el) => parseFloat(getComputedStyle(el).paddingTop))
  expect(pad, 'the DS own padding is read from the Modal').toBeGreaterThan(0)
  const card = (await dialog.boundingBox())!
  expect(card.x, 'card left inside the padded box').toBeGreaterThanOrEqual(pad - 0.5)
  expect(card.x + card.width, 'card right inside the padded box').toBeLessThanOrEqual(vp.width - pad + 0.5)
  expect(card.y, 'card top inside the padded box').toBeGreaterThanOrEqual(pad - 0.5)
  expect(card.y + card.height, 'card bottom inside the padded box').toBeLessThanOrEqual(vp.height - pad + 0.5)
  expect(await page.evaluate(() => window.scrollY), 'no page scroll').toBe(0)

  // The close control and every footer button: fully on the screen, and nothing painted over them.
  const controls = [closeOf(dialog), ...(await dialog.locator('.mn-modal__footer .mn-btn').all())]
  expect(controls.length, 'the close control and the view footer buttons').toBe(1 + footerButtons)
  for (const control of controls) {
    const box = (await control.boundingBox())!
    expect(box.y, 'a control top is on the screen').toBeGreaterThanOrEqual(0)
    expect(box.y + box.height, 'a control bottom is on the screen').toBeLessThanOrEqual(vp.height)
    const covered = await control.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return !(hit && (hit === el || el.contains(hit)))
    })
    expect(covered, 'nothing is painted over a control').toBe(false)
  }

  // THE CARD FITS when the cap did not engage: it is shorter than the padded box. A card that fits has NOTHING to
  // scroll: the content's scrollHeight equals its clientHeight EXACTLY (no tolerance), in both axes, and no
  // element of the content extends past the content box (an ancestor that clips counts as the edge).
  const content = dialog.locator('.mn-modal__content')
  const fits = card.height < vp.height - 2 * pad - 0.5
  if (fits) {
    const stray = await content.evaluate((el) => {
      const c = el.getBoundingClientRect()
      const out: string[] = []
      for (const n of Array.from(el.querySelectorAll('*'))) {
        let { left, top, right, bottom } = n.getBoundingClientRect()
        if (right === left && bottom === top) continue
        for (let p = n.parentElement; p && p !== el; p = p.parentElement) {
          const s = getComputedStyle(p)
          if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
            const q = p.getBoundingClientRect()
            left = Math.max(left, q.left)
            top = Math.max(top, q.top)
            right = Math.min(right, q.right)
            bottom = Math.min(bottom, q.bottom)
          }
        }
        if (right <= left || bottom <= top) continue
        if (left < c.left - 0.01 || top < c.top - 0.01 || right > c.right + 0.01 || bottom > c.bottom + 0.01) {
          out.push(`${n.tagName}.${(n as HTMLElement).className} [${left}, ${top}, ${right}, ${bottom}] outside [${c.left}, ${c.top}, ${c.right}, ${c.bottom}]`)
        }
      }
      return out
    })
    expect(stray, 'no element of the content extends past the content box').toEqual([])
  }
  // The content scrolls itself; the last element is reachable by scrolling it.
  const metrics = await content.evaluate((el) => {
    const m = { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
    el.scrollTop = el.scrollHeight
    return m
  })
  expect(metrics.scrollWidth, 'nothing scrolls sideways').toBe(metrics.clientWidth)
  if (fits) expect(metrics.scrollHeight, 'a card that fits has nothing to scroll').toBe(metrics.clientHeight)
  else expect(metrics.scrollHeight, 'a capped card scrolls its content').toBeGreaterThan(metrics.clientHeight)
  const contentBox = (await content.boundingBox())!
  const lastBox = (await lastElement.boundingBox())!
  expect(lastBox.y + lastBox.height, 'the last element ends inside the content area').toBeLessThanOrEqual(
    contentBox.y + contentBox.height + 1,
  )
  expect(lastBox.y, 'the last element starts inside the content area').toBeGreaterThanOrEqual(contentBox.y - 1)
  await content.evaluate((el) => (el.scrollTop = 0))
  return { ...metrics, overflows: !fits }
}

for (const vp of [
  { width: 375, height: 667 },
  { width: 375, height: 812 },
  { width: 430, height: 812 },
]) {
  test.describe(`B8 at ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp })

    test(`B8 all three alert views stay inside the Modal's box with their buttons in place, and the content scrolls (R103-19)`, async ({
      page,
    }) => {
      await openSend(page, WITH_NEW_RECIPIENT, STORED_RECIPIENT.id, '10000.00')
      await transferMoney(page).click()

      await expect(warning(page)).toBeVisible()
      await holdsFocus(page, closeOf(warning(page)))
      const w = await expectCapped(page, warning(page), warning(page).locator('.mvp-risk__learn .mn-link'), vp, 2)

      await warning(page).locator('.mvp-risk__learn .mn-link').click()
      await expect(education(page)).toBeVisible()
      await holdsFocus(page, closeOf(education(page)))
      const e = await expectCapped(page, education(page), education(page).locator('.mvp-risk-education__nsrc'), vp, 1)
      // The shield's visible art stays within 0.5px of Figma's framing: 68.24 x 66.15, 71.81 below the card's top (and
      // 141.42 from its left in the 343 card). The art is at (68, 55)-(494, 468) of the 512px export.
      {
        const eduCard = (await education(page).boundingBox())!
        const img = (await education(page).locator('.mvp-risk-education__shield').boundingBox())!
        const k = img.width / 512
        // Figma's slot is 80 tall, so the title lands where Figma puts it: the slot is exactly 80, not the image's 81 margin box.
        expect((await education(page).locator('.mvp-risk-education__shield-slot').boundingBox())!.height, 'the shield slot is 80 tall').toBe(80)
        expect(Math.abs(413 * k - 66.15), 'art height').toBeLessThanOrEqual(0.5)
        expect(Math.abs(426 * k - 68.24), 'art width').toBeLessThanOrEqual(0.5)
        expect(Math.abs(img.y + 55 * k - eduCard.y - 71.81), 'art top in the card').toBeLessThanOrEqual(0.5)
        if (vp.width === 375) {
          expect(Math.abs(img.x + 68 * k - eduCard.x - 141.42), 'art left in the card').toBeLessThanOrEqual(0.5)
        }
        test.info().annotations.push({
          type: 'art',
          description: `top ${(img.y + 55 * k - eduCard.y).toFixed(2)} left ${(img.x + 68 * k - eduCard.x).toFixed(2)} ${(426 * k).toFixed(2)}x${(413 * k).toFixed(2)}`,
        })
      }

      await education(page).getByRole('button', { name: 'Got it' }).click()
      await expect(warning(page)).toBeVisible()
      await warning(page).getByRole('button', { name: 'Proceed Anyway' }).click()
      await expect(confirm(page)).toBeVisible()
      await holdsFocus(page, closeOf(confirm(page)))
      const c = await expectCapped(page, confirm(page), confirm(page).locator('.mvp-risk__party-line'), vp, 2)

      // What scrolls, by viewport. The education card is the tallest (790 at 375 wide), the confirm the shortest.
      if (vp.height === 667) {
        expect(w.overflows, 'at 375x667 the warning card (710) overflows the box and scrolls').toBe(true)
        expect(e.overflows, 'at 375x667 the education card (790) overflows the box and scrolls').toBe(true)
        expect(c.overflows, 'at 375x667 the confirm card (580) fits').toBe(false)
      } else if (vp.width === 375) {
        expect(e.scrollHeight, 'at 375x812 the education content is taller than its area').toBeGreaterThan(e.clientHeight)
        expect(e.overflows, 'at 375x812 the education content scrolls').toBe(true)
        expect(w.overflows, 'at 375x812 the warning card (710) fits').toBe(false)
        expect(c.overflows, 'at 375x812 the confirm card (580) fits').toBe(false)
      } else {
        expect(e.overflows, 'at 430x812 the education card (742) fits: the content does not scroll').toBe(false)
        expect(w.overflows, 'at 430x812 the warning card (686) fits').toBe(false)
        expect(c.overflows, 'at 430x812 the confirm card (580) fits').toBe(false)
      }
    })
  })
}
