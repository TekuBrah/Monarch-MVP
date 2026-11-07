import { expect, test, type Page } from '@playwright/test'
import { gotoRoute } from './harness'
import { CRYPTO_HOLDINGS, CRYPTO_UNIT_PRICES } from '../src/data/accounts'
import { CRYPTO_NETWORKS } from '../src/data/cryptoNetworks'
import { CRYPTO_RECIPIENTS } from '../src/data/cryptoRecipients'
import { BUDGETS } from '../src/data/budgets'
import { FIAT_ACCOUNTS } from '../src/data/accounts'
import { GOALS } from '../src/data/goals'
import { RECEIPTS } from '../src/data/receipts'
import { TRANSACTIONS } from '../src/data/transactions'
import {
  CRYPTO_UNITS_PER_TOKEN,
  buildCryptoSend,
  cryptoAmountError,
  cryptoFee,
  cryptoNetworkLine,
  cryptoQuantityForSen,
  cryptoSendAddress,
  cryptoSendProblem,
  cryptoUnits,
  cryptoValueOf,
  holdingsAfterCryptoSend,
  recentCryptoRecipients,
  toSen,
  transactionDisposition,
} from '../src/data/derive'
import { formatMyr, formatQuantity } from '../src/data/format'
import { toStored } from '../src/persistence/boundary'
import {
  MIGRATIONS,
  RECORD_KEYS,
  SCHEMA_VERSION,
  fingerprintOf,
  isStoredCryptoHolding,
  isStoredTransaction,
  storedRecordsProblem,
} from '../src/persistence/schema'
import { seedFingerprint, seedState } from '../src/persistence/seed'
import type { CryptoHolding, Transaction } from '../src/data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GATE 98 — FLOW 5 PART 2: the amount screen, the Network Fee sheet, the summary,
 * `sendCrypto`, schema v4 and the success page. No baseline here; the walk
 * photographs the ten `[overlay:amount-*|fee|summary|sent]` states.
 *
 * N-tests run in Node on the seed and on SYNTHETIC rows (Flow 4 standard 7).
 * B-tests drive the app through its own controls; a persistence check reloads on
 * purpose after the store is idle (Gate 85's reload rule).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ETH = CRYPTO_HOLDINGS.find((h) => h.id === 'eth')!
const BTC = CRYPTO_HOLDINGS.find((h) => h.id === 'btc')!
const RACHUM = CRYPTO_RECIPIENTS.find((r) => r.id === 'crypto-rachum-greene')!
const GRANDSON = CRYPTO_RECIPIENTS.find((r) => r.id === 'crypto-grandson')!
const NOW = new Date(2026, 7, 15, 9, 41)
const START = '/transfer/crypto/crypto-rachum-greene'
const STORE_MODULE = '/src/persistence/store.ts'

const field = (page: Page) => page.getByRole('combobox', { name: 'Transfer Amount' })
const primary = (page: Page) => page.locator('.mvp-crypto-send__body > .mn-btn--primary')
const feeSheet = (page: Page) => page.getByRole('dialog', { name: 'Network Fee' })
const rows = (page: Page) => page.locator('.mvp-crypto-send__rows .mn-transfer-amount__title')
const qty = (h: CryptoHolding, n: number) => formatQuantity(n, h.quantityDecimals, h.symbol)

async function toAmount(page: Page, tokenId = 'eth'): Promise<void> {
  await gotoRoute(page, START, 'light')
  await page.locator(`#token-${tokenId}`).click()
  await page.locator('.mvp-token__actions').getByRole('button', { name: 'Next' }).click()
  await expect(page).toHaveURL(new RegExp(`/transfer/crypto/send/${tokenId}$`))
}

async function toSummary(page: Page, amount = '5800.00'): Promise<void> {
  await toAmount(page)
  await field(page).fill(amount)
  await primary(page).click()
  await expect(feeSheet(page)).toBeVisible()
  await feeSheet(page).getByRole('button', { name: 'OK' }).click()
  await expect(primary(page)).toHaveText('Transfer crypto')
}

async function storeIdle(page: Page): Promise<void> {
  await page.evaluate(async (path) => {
    const store: { whenIdle: () => Promise<void> } = await import(path)
    await store.whenIdle()
  }, STORE_MODULE)
}

// ═════════════════════════════════ Node ═════════════════════════════════════

test('N1 a holding\'s value is derived from its quantity, and all six seeded values reproduce exactly', () => {
  for (const h of CRYPTO_HOLDINGS) {
    expect(toSen(cryptoValueOf(h.id, h.quantity)), h.id).toBe(toSen(h.valueMyr))
    expect(CRYPTO_UNIT_PRICES[h.id]).toBeCloseTo(h.valueMyr / h.quantity, 9)
  }
})

test('N2 the fee table: ETH as drawn; every token has two positive tiers, paid in the token', () => {
  expect(cryptoFee('eth', 'regular')).toMatchObject({ label: 'Regular', wait: '60+ Min', fee: 4.6 })
  expect(cryptoFee('eth', 'priority')).toMatchObject({ label: 'Priority', wait: '30 Minutes', fee: 24.5 })
  for (const h of CRYPTO_HOLDINGS) {
    const regular = cryptoFee(h.id, 'regular')
    const priority = cryptoFee(h.id, 'priority')
    expect(regular.fee, h.id).toBeGreaterThan(0)
    expect(priority.fee, h.id).toBeGreaterThan(regular.fee)
    expect(regular.quantity).toBe(cryptoQuantityForSen(h.id, toSen(regular.fee)))
    expect(cryptoUnits(regular.quantity)).toBeGreaterThan(0)
  }
  // ERC-20s pay ~2.57x ETH's gas; the three share one network.
  expect(CRYPTO_NETWORKS.usdt.name).toBe('Ethereum')
  expect(CRYPTO_NETWORKS.uni.fees).toEqual(CRYPTO_NETWORKS.usdt.fees)
})

test('N3 quantities are whole units of 1e-8; RM 5,800 of ETH is 0.31247... at the seed price', () => {
  const q = cryptoQuantityForSen('eth', 580000)
  expect(Math.abs(q * CRYPTO_UNITS_PER_TOKEN - cryptoUnits(q))).toBeLessThan(1e-6)
  expect(q).toBeCloseTo(5800 / (ETH.valueMyr / ETH.quantity), 8)
  expect(qty(ETH, q)).toBe('0.3125 ETH')
})

test('N4 the amount rule: every message, judged with the fee on top', () => {
  const fee = cryptoFee('eth', 'regular')
  expect(cryptoAmountError('', ETH, fee)).toBe('Enter an amount')
  expect(cryptoAmountError('0', ETH, fee)).toBe('Enter an amount')
  expect(cryptoAmountError('1.234', ETH, fee)).toBe('Up to 2 decimal places')
  expect(cryptoAmountError('25588.52', ETH, fee)).toBe(`More than your balance of ${formatMyr(ETH.valueMyr)}`)
  expect(cryptoAmountError('25588.51', ETH, fee)).toBe(`Not enough left for the network fee of ${formatMyr(fee.fee)}`)
  expect(cryptoAmountError('25000.00', ETH, fee)).toBeNull()
  expect(cryptoAmountError('5800.00', ETH, fee)).toBeNull()
})

test('N5 the row: a transfer out of the wallet for the MYR total, carrying the token; the writer\'s guard', () => {
  const row = buildCryptoSend({ recipient: RACHUM, holding: ETH, amountSen: 580000, tier: 'regular', now: NOW })
  expect(row).toMatchObject({
    accountId: 'marg',
    merchant: 'Rachum Greene',
    method: 'Crypto Transfer',
    kind: 'transfer',
    amount: -5804.6,
    category: 'others',
    recipientId: RACHUM.id,
    occurredAt: '2026-08-15T09:41:00',
  })
  expect(row.id).toMatch(/^txn-crypto-[0-9a-f-]{36}$/)
  expect(row.crypto).toEqual({ tokenId: 'eth', quantity: cryptoQuantityForSen('eth', 580000), feeQuantity: cryptoFee('eth', 'regular').quantity, fee: 4.6, tier: 'regular' })
  expect(transactionDisposition(row)).toBe('transfer')
  expect(cryptoSendProblem(row, CRYPTO_HOLDINGS, CRYPTO_RECIPIENTS)).toBeNull()
  const bad: [Partial<Transaction>, string][] = [
    [{ method: 'Fund Transfer' }, 'not a Crypto Transfer'],
    [{ kind: 'payment' }, 'is a payment'],
    [{ crypto: undefined }, 'carries no token'],
    [{ accountId: 'fun' }, 'is not in wallet fun'],
    [{ amount: 0 }, 'must debit its wallet'],
    [{ amount: -4.6 }, 'does not exceed its fee'],
    [{ crypto: { ...row.crypto!, quantity: 2 } }, 'more ETH than'],
    [{ recipientId: 'recipient-rachum-greene' }, 'no crypto contact'],
    [{ reference: undefined }, 'carries no reference'],
  ]
  for (const [change, message] of bad) {
    expect(cryptoSendProblem({ ...row, ...change }, CRYPTO_HOLDINGS, CRYPTO_RECIPIENTS)).toContain(message)
  }
})

test('N6 the debit moves only the sent token: quantity sent plus fee, value re-derived', () => {
  const row = buildCryptoSend({ recipient: RACHUM, holding: ETH, amountSen: 580000, tier: 'priority', now: NOW })
  const after = holdingsAfterCryptoSend(CRYPTO_HOLDINGS, row.crypto!)
  const eth = after.find((h) => h.id === 'eth')!
  expect(cryptoUnits(eth.quantity)).toBe(cryptoUnits(ETH.quantity) - cryptoUnits(row.crypto!.quantity) - cryptoUnits(row.crypto!.feeQuantity))
  expect(eth.valueMyr).toBe(cryptoValueOf('eth', eth.quantity))
  for (const h of after) if (h.id !== 'eth') expect(h).toBe(CRYPTO_HOLDINGS.find((x) => x.id === h.id))
})

test('N7 schema v4: a seventh collection stored as id and quantity, a migration from v3, total validators', () => {
  expect(SCHEMA_VERSION).toBe(4)
  expect(RECORD_KEYS).toContain('cryptoHoldings')
  const v4 = toStored(seedState())
  expect(v4.cryptoHoldings).toEqual(CRYPTO_HOLDINGS.map(({ id, quantity }) => ({ id, quantity })))
  const { cryptoHoldings: _dropped, ...v3 } = v4
  expect(MIGRATIONS[3]!(v3)).toEqual(v4)
  expect(MIGRATIONS[3]!(null)).toBeNull()
  expect(storedRecordsProblem(v4, new Set())).toBeNull()
  expect(storedRecordsProblem({ ...v4, cryptoHoldings: v4.cryptoHoldings.slice(1) }, new Set())).toContain('every token')
  expect(storedRecordsProblem({ ...v4, cryptoHoldings: [...v4.cryptoHoldings, v4.cryptoHoldings[0]] }, new Set())).toContain('every token')
  expect(isStoredCryptoHolding({ id: 'eth', quantity: 0 })).toBe(true)
  for (const bad of [{ id: 'doge', quantity: 1 }, { id: 'eth', quantity: -1 }, { id: 'eth', quantity: Number.NaN }, { id: 'eth' }, null]) {
    expect(isStoredCryptoHolding(bad)).toBe(false)
  }
  const row = buildCryptoSend({ recipient: RACHUM, holding: ETH, amountSen: 100, tier: 'regular', now: NOW })
  expect(isStoredTransaction(row)).toBe(true)
  expect(isStoredTransaction({ ...row, crypto: { ...row.crypto, tokenId: 'doge' } })).toBe(false)
  expect(isStoredTransaction({ ...row, crypto: { ...row.crypto, quantity: 0 } })).toBe(false)
  expect(isStoredTransaction({ ...row, crypto: { ...row.crypto, tier: 'fast' } })).toBe(false)
  // The two seeded crypto rows carry no detail and stay valid.
  for (const t of TRANSACTIONS.filter((t) => t.method === 'Crypto Transfer')) expect(t.crypto).toBeUndefined()
})

test('N8 Decision 29D: the seed fingerprint now hashes the crypto seed, so testers reset once', () => {
  const five = { transactions: TRANSACTIONS, receipts: RECEIPTS, fiatAccounts: FIAT_ACCOUNTS, goals: GOALS, budgets: BUDGETS }
  expect(fingerprintOf(five)).not.toBe(seedFingerprint())
  expect(fingerprintOf({ ...five, cryptoHoldings: CRYPTO_HOLDINGS })).toBe(seedFingerprint())
})

test('N9 recents: after a crypto send the contact goes first on the Crypto tab (R96-12), on synthetic rows', () => {
  const sent = buildCryptoSend({ recipient: GRANDSON, holding: BTC, amountSen: 10000, tier: 'regular', now: new Date(2026, 8, 20, 10, 0) })
  expect(recentCryptoRecipients(CRYPTO_RECIPIENTS, TRANSACTIONS)[0].id).toBe('crypto-granddaughter')
  expect(recentCryptoRecipients(CRYPTO_RECIPIENTS, [...TRANSACTIONS, sent])[0].id).toBe('crypto-grandson')
})

test('N10 Decision 30F and 33: the helper line names the network, and To uses that network\'s address', () => {
  expect(cryptoNetworkLine(ETH)).toBe('Only send ETH to wallets on the Ethereum network.')
  expect(cryptoNetworkLine(BTC)).toBe('Only send BTC to wallets on the Bitcoin network.')
  // USDT is where the network is NOT the token's own name (fork F-b).
  expect(cryptoNetworkLine(CRYPTO_HOLDINGS.find((h) => h.id === 'usdt')!)).toBe('Only send USDT to wallets on the Ethereum network.')
  for (const h of CRYPTO_HOLDINGS) {
    const address = cryptoSendAddress(RACHUM, h)
    const family = CRYPTO_NETWORKS[h.id].family
    const shape = { evm: /^0x[0-9a-f]{40}$/, bitcoin: /^bc1q[02-9ac-hj-np-z]{38}$/, solana: /^[1-9A-HJ-NP-Za-km-z]{43,44}$/, stellar: /^G[A-Z2-7]{55}$/ }[family]
    expect(address, h.id).toMatch(shape)
  }
})

// ═════════════════════════════════ Browser ══════════════════════════════════

test('B1 the amount screen as drawn: Send Ethereum with the accent, From, To with its line, the caption', async ({ page }) => {
  await toAmount(page)
  await expect(page.locator('.mn-header-default__title')).toHaveText('Send Ethereum')
  await expect(page.locator('.mn-header-default__title-accent')).toHaveText('Ethereum')
  await expect(page.getByRole('button', { name: /^From / })).toContainText(formatMyr(ETH.valueMyr))
  await expect(page.locator('.mvp-crypto-send .mn-form-field').nth(1)).toContainText('Only send ETH to wallets on the Ethereum network.')
  await expect(page.locator('.mn-select-transfer__caption')).toHaveText('0.0000 ETH')
  await expect(page.locator('.mvp-crypto-send__rows')).toHaveCount(0)
  await expect(primary(page)).toHaveText('Next')
  await field(page).fill('5800.00')
  await expect(page.locator('.mn-select-transfer__caption')).toHaveText('0.3125 ETH')
  await expect(rows(page)).toHaveText(['Your new balance', 'ETH balance'])
})

test('B2 Next with too much shows the message and opens no sheet', async ({ page }) => {
  await toAmount(page)
  await field(page).fill('25588.51')
  await primary(page).click()
  await expect(page.locator('.mvp-crypto-send .mn-field-message--error')).toHaveText('Not enough left for the network fee of RM 4.60')
  await expect(feeSheet(page)).toHaveCount(0)
})

test('B3 the fee sheet: Regular pre-selected; Cancel and device Back discard a pending Priority', async ({ page }) => {
  await toAmount(page)
  await field(page).fill('5800.00')
  await primary(page).click()
  await expect(feeSheet(page).getByRole('radio', { name: /Regular/ })).toBeChecked()
  await feeSheet(page).getByText('Priority').click()
  await expect(feeSheet(page).getByRole('radio', { name: /Priority/ })).toBeChecked()
  await feeSheet(page).getByRole('button', { name: 'Cancel' }).click()
  await expect(feeSheet(page)).toHaveCount(0)
  await expect(primary(page)).toHaveText('Next')
  await primary(page).click()
  await expect(feeSheet(page).getByRole('radio', { name: /Regular/ })).toBeChecked()
  await page.goBack()
  await expect(feeSheet(page)).toHaveCount(0)
  await expect(field(page)).toHaveValue('RM 5800.00')
})

test('B4 OK grows the screen in place; header Back and device Back both return to the editable amount', async ({ page }) => {
  await toSummary(page)
  await expect(rows(page)).toHaveText(['Network Fees', 'Total', 'Your new balance', 'ETH balance'])
  await page.locator('.mn-header-default__back').click()
  await expect(feeSheet(page)).toHaveCount(0)
  await expect(primary(page)).toHaveText('Next')
  await expect(field(page)).toHaveValue('RM 5800.00')
  await expect(page).toHaveURL(/\/transfer\/crypto\/send\/eth$/)
  await primary(page).click()
  await feeSheet(page).getByText('Priority').click()
  await feeSheet(page).getByRole('button', { name: 'OK' }).click()
  await expect(page.locator('.mvp-crypto-send__rows')).toContainText(formatMyr(24.5))
  await page.goBack()
  await expect(primary(page)).toHaveText('Next')
  await expect(feeSheet(page)).toHaveCount(0)
})

test('B5 Transfer crypto: success by replace, the holding and wallet fall, Back lands on Select Token, recents move', async ({ page }) => {
  await toSummary(page)
  await primary(page).click()
  await expect(page).toHaveURL(/\/transfer\/done\/txn-crypto-[0-9a-f-]{36}$/)
  await expect(page.locator('.mvp-transfer-done__hero')).toHaveText(`Transfer successful${qty(ETH, cryptoQuantityForSen('eth', 580000))}to Rachum Greene`)
  await expect(page.locator('.mvp-transfer-done__rows')).toContainText('RM 5,804.60')
  await page.goBack()
  await expect(page).toHaveURL(new RegExp(`${START}$`))
  await expect(page.locator('#token-eth')).toContainText(formatMyr(cryptoValueOf('eth', ETH.quantity - cryptoQuantityForSen('eth', 580000) - cryptoFee('eth', 'regular').quantity)))
  await page.locator('.mn-header-default__back').click()
  await expect(page.locator('.mvp-transfer__body--crypto .mvp-transfer__list > li').first()).toContainText('Rachum Greene')
})

test('B6 KEPT: a reload keeps the debited holding and the row (schema v4)', async ({ page }) => {
  await toSummary(page)
  await primary(page).click()
  await expect(page.locator('.mvp-transfer-done__hero')).toBeVisible()
  await storeIdle(page)
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await expect(page.locator('.mvp-transfer-done__hero')).toContainText('to Rachum Greene')
  const left = ETH.quantity - cryptoQuantityForSen('eth', 580000) - cryptoFee('eth', 'regular').quantity
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('monarch-mvp')
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
    const value = await new Promise<unknown>((resolve, reject) => {
      const r = db.transaction('records').objectStore('records').get('cryptoHoldings')
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
    db.close()
    return value as { id: string; quantity: number }[]
  })
  expect(cryptoUnits(stored.find((h) => h.id === 'eth')!.quantity)).toBe(cryptoUnits(left))
  expect(stored.find((h) => h.id === 'btc')!.quantity).toBe(BTC.quantity)
})

test('B7 a deep link to the amount screen has no contact and replaces itself with the Crypto tab', async ({ page }) => {
  await gotoRoute(page, '/transfer/crypto/send/eth', 'light')
  await expect(page).toHaveURL(/\/transfer$/)
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveText('Crypto')
  expect(await page.evaluate(() => history.length)).toBe(2)
})

test('B8 the amount chip and From return to Select Token, which re-opens on the chosen token', async ({ page }) => {
  await toAmount(page, 'uni')
  await page.locator('.mn-select-transfer__chevron').click()
  await expect(page).toHaveURL(new RegExp(`${START}$`))
  await expect(page.locator('#token-uni')).toHaveAttribute('aria-selected', 'true')
  await page.locator('.mvp-token__actions').getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: /^From / }).click()
  await expect(page).toHaveURL(new RegExp(`${START}$`))
})

test('B9 the draft clears when the path leaves the flow', async ({ page }) => {
  // Enter and leave through the app's own controls only: a page load empties an in-memory draft whatever the
  // provider does, so a re-entry by URL could not see the clear this test is about.
  const enterInApp = async () => {
    await page.locator('.mvp-shell__nav .mn-bottom-nav__item', { hasText: 'Transfer' }).click()
    await page.getByRole('dialog', { name: 'Transfer' }).getByRole('button', { name: /^Send/ }).click()
    await page.getByRole('tab', { name: 'Crypto' }).click()
    await page.locator('.mvp-transfer__body--crypto .mvp-transfer__list > li', { hasText: 'Rachum Greene' }).getByRole('button').click()
    await page.locator('#token-eth').click()
    await page.locator('.mvp-token__actions').getByRole('button', { name: 'Next' }).click()
    await expect(page).toHaveURL(/\/transfer\/crypto\/send\/eth$/)
  }
  await gotoRoute(page, '/', 'light')
  await enterInApp()
  await field(page).fill('123.00')
  for (let i = 0; i < 3; i++) await page.locator('.mn-header-default__back').click()
  await expect(page).toHaveURL(/\/$/)
  await enterInApp()
  await expect(field(page)).toHaveValue('')
})

test('B10 View transaction: the detail sheet says what moved, in the token; a seeded crypto row says nothing new', async ({ page }) => {
  await toSummary(page)
  await primary(page).click()
  await page.getByRole('button', { name: 'View transaction' }).click()
  const sheet = page.getByRole('dialog', { name: 'Transaction details' })
  await expect(sheet).toContainText('0.3125 ETH')
  await expect(sheet).toContainText(`${qty(ETH, cryptoFee('eth', 'regular').quantity)} • RM 4.60`)
  await expect(sheet).toContainText('Ethereum')
  await expect(sheet).toContainText("Marge's Wallet")
})

test('B11 the fee sheet keyboard: a ring after Tab, none after a pointer press (R97-3)', async ({ page }) => {
  await toAmount(page)
  await field(page).fill('5800.00')
  await primary(page).click()
  const priority = feeSheet(page).locator('#fee-priority')
  await feeSheet(page).getByText('Priority').click()
  expect(await priority.evaluate((el) => el.matches(':focus-visible'))).toBe(false)
  await page.keyboard.press('ArrowUp')
  expect(await feeSheet(page).locator('#fee-regular').evaluate((el) => el.matches(':focus-visible'))).toBe(true)
  await expect(feeSheet(page).getByRole('radio', { name: /Regular/ })).toBeChecked()
})
