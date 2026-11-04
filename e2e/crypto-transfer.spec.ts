import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { activateTab, gotoRoute } from './harness'
import { CRYPTO_RECIPIENTS } from '../src/data/cryptoRecipients'
import { RECIPIENTS } from '../src/data/recipients'
import { CRYPTO_HOLDINGS, CRYPTO_WALLETS } from '../src/data/accounts'
import { TRANSACTIONS } from '../src/data/transactions'
import {
  cryptoAddressLine,
  filterCryptoRecipients,
  recentCryptoRecipients,
  recentRecipients,
} from '../src/data/derive'
import { formatMyr, formatQuantity } from '../src/data/format'
import type { Transaction } from '../src/data/types'

/**
 * Gate 96 — Flow 5 part 1: the Crypto tab of the recipient picker (Figma
 * `1266:14395`) and Select Token (`1266:14396`). Behaviour only, no baseline;
 * the walk photographs `/transfer [tab:crypto]`, its no-match state, Select
 * Token for every contact, and its selected and invalid states.
 */

const notice = (page: Page) => page.locator('.mvp-notice .mn-toast-mobile')
const cryptoRows = (page: Page) => page.locator('.mvp-transfer__body--crypto .mvp-transfer__list > li')
const tokens = (page: Page) => page.locator('.mvp-token [role="option"]')
const next = (page: Page) => page.locator('.mvp-token__actions').getByRole('button', { name: 'Next' })
const selectedTab = (page: Page) => page.locator('[role="tab"][aria-selected="true"]')

/** The token rows as the screen must print them, derived from the data — never re-typed. */
const EXPECTED_TOKENS = CRYPTO_WALLETS.flatMap((w) =>
  CRYPTO_HOLDINGS.filter((h) => h.walletId === w.id).map((h) => ({
    id: h.id,
    text: `${h.name}${w.name}${formatMyr(h.valueMyr)}${formatQuantity(h.quantity, h.quantityDecimals, h.symbol)}`,
  })),
)

/** A minimal crypto row for the ordering rule. Every field the rule does not read is filler. */
function cryptoRow(over: Partial<Transaction>): Transaction {
  return {
    id: 'txn-test',
    accountId: 'marg',
    merchant: 'Nobody',
    logo: { kind: 'person', initials: 'N' },
    method: 'Crypto Transfer',
    kind: 'transfer',
    amount: -10,
    currency: 'MYR',
    occurredAt: '2025-01-01T00:00:00',
    category: 'others',
    ...over,
  }
}

async function openCryptoTab(page: Page) {
  await gotoRoute(page, '/transfer', 'light')
  await activateTab(page, { id: 'crypto', label: 'Crypto' })
  await expect(cryptoRows(page)).toHaveCount(5)
}

// ─────────────────────────────── Node ───────────────────────────────

test('N1 the five crypto contacts: Figma order, well-formed addresses with the drawn ends, real photos', () => {
  expect(CRYPTO_RECIPIENTS.map((r) => r.name)).toEqual([
    'Granddaughter', 'Grandson', 'Rachum Greene', 'Jonathan Llango', 'Tobey Jibriani',
  ])
  expect(CRYPTO_RECIPIENTS.map(cryptoAddressLine)).toEqual([
    '0x92fa...1ae3', '0xb7c2...49ff', '0xa53b...d92c', '0x7ee8...f391', '0xc19e...71ad',
  ])
  for (const r of CRYPTO_RECIPIENTS) {
    expect(r.address, r.name).toMatch(/^0x[0-9a-f]{40}$/)
    expect(r.mark.kind, r.name).toBe('image')
    if (r.mark.kind === 'image') {
      expect(existsSync(resolve('public/media/transactions', r.mark.filename)), r.mark.filename).toBe(true)
    }
  }
  const ids = [...CRYPTO_RECIPIENTS, ...RECIPIENTS].map((r) => r.id)
  expect(new Set(ids).size, 'no crypto id collides with a bank id').toBe(ids.length)
  // Rachum Greene is in both lists as two records sharing one photo file.
  const bank = RECIPIENTS.find((r) => r.name === 'Rachum Greene')!
  const crypto = CRYPTO_RECIPIENTS.find((r) => r.name === 'Rachum Greene')!
  expect(crypto.id).not.toBe(bank.id)
  expect(crypto.mark).toEqual(bank.mark)
})

test('N2 crypto search matches name or address, ignoring case and spaces at the ends', () => {
  const names = (q: string) => filterCryptoRecipients(CRYPTO_RECIPIENTS, q).map((r) => r.name)
  expect(names('')).toHaveLength(5)
  expect(names('  JON ')).toEqual(['Jonathan Llango'])
  expect(names('0xB7C2')).toEqual(['Grandson'])
  expect(names('71ad')).toEqual(['Tobey Jibriani'])
  expect(names('grand')).toEqual(['Granddaughter', 'Grandson'])
  expect(names('zzz')).toEqual([])
})

test('N3 recent crypto contacts: the seeded crypto rows decide the order today', () => {
  expect(recentCryptoRecipients(CRYPTO_RECIPIENTS, TRANSACTIONS).map((r) => r.name)).toEqual([
    'Granddaughter', 'Rachum Greene', 'Grandson', 'Jonathan Llango', 'Tobey Jibriani',
  ])
  // With no crypto row at all, Figma's order stands.
  expect(recentCryptoRecipients(CRYPTO_RECIPIENTS, []).map((r) => r.name)).toEqual(
    CRYPTO_RECIPIENTS.map((r) => r.name),
  )
})

test('N4 recent crypto contacts: which rows count, on synthetic rows', () => {
  const order = (rows: Transaction[]) => recentCryptoRecipients(CRYPTO_RECIPIENTS, rows).map((r) => r.name)
  // A written send names its contact by id and wins on recency.
  expect(
    order([
      cryptoRow({ merchant: 'Granddaughter', occurredAt: '2025-01-01T00:00:00' }),
      cryptoRow({ merchant: 'Whoever', recipientId: 'crypto-tobey-jibriani', occurredAt: '2025-02-01T00:00:00' }),
    ]).slice(0, 2),
  ).toEqual(['Tobey Jibriani', 'Granddaughter'])
  // A bank row naming a crypto contact does not count; nor does a credit; nor
  // does a recipientId that is not a crypto contact's.
  expect(
    order([
      cryptoRow({ merchant: 'Grandson', method: 'Fund Transfer', accountId: 'main' }),
      cryptoRow({ merchant: 'Jonathan Llango', amount: 25 }),
      cryptoRow({ merchant: 'Granddaughter', recipientId: 'recipient-rachum-greene' }),
    ]),
  ).toEqual(CRYPTO_RECIPIENTS.map((r) => r.name))
  // Each contact counts once, at its newest row.
  expect(
    order([
      cryptoRow({ merchant: 'Grandson', occurredAt: '2025-01-01T00:00:00' }),
      cryptoRow({ merchant: 'Granddaughter', occurredAt: '2025-01-02T00:00:00' }),
      cryptoRow({ merchant: 'Grandson', occurredAt: '2025-01-03T00:00:00' }),
    ]).slice(0, 2),
  ).toEqual(['Grandson', 'Granddaughter'])
})

test('N5 the Bank tab order is unchanged: crypto rows matched by name never reach it', () => {
  expect(recentRecipients(RECIPIENTS, TRANSACTIONS).map((r) => r.name)).toEqual(RECIPIENTS.map((r) => r.name))
})

test('N6 the Bank tab order counts only rows that name a recipient by id, on synthetic rows', () => {
  const order = (rows: Transaction[]) => recentRecipients(RECIPIENTS, rows).map((r) => r.name)
  const figma = RECIPIENTS.map((r) => r.name)
  // Rows that carry no recipientId never count, however their merchant reads:
  // a bank row naming the LAST recipient, and a crypto row naming a name both
  // lists share. If either leaked, Fiona Hammock (or Rachum Greene) would jump
  // ahead of Perry Matthew. The seed cannot show this: the three bank
  // recipients that have ledger rows are already its first three.
  const leaks = [
    cryptoRow({ merchant: 'Fiona Hammock', method: 'Fund Transfer', accountId: 'main', occurredAt: '2025-06-01T00:00:00' }),
    cryptoRow({ merchant: 'Rachum Greene', occurredAt: '2025-07-01T00:00:00' }),
  ]
  expect(order(leaks)).toEqual(figma)
  // A row that names a recipient by id does count: Perry Matthew comes first,
  // and the leaking rows, though newer, still do not move anyone.
  const sent = cryptoRow({
    merchant: 'Perry Matthew',
    method: 'Fund Transfer',
    accountId: 'main',
    recipientId: 'recipient-perry-matthew',
    occurredAt: '2025-01-01T00:00:00',
  })
  expect(order([...leaks, sent])).toEqual([
    'Perry Matthew', 'Aeon Big', 'Caring Pharmacy', 'Rachum Greene', 'Fiona Hammock',
  ])
})

// ─────────────────────────────── browser ───────────────────────────────

test('B1 the Crypto tab as drawn: title, label above the search, derived order, photos, no chevrons', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  await expect(page.locator('.mn-header-default')).toContainText('Send')
  await expect(page.locator('.mn-header-default')).not.toContainText('Send Crypto')
  await activateTab(page, { id: 'crypto', label: 'Crypto' })
  await expect(page.locator('.mn-header-default')).toContainText('Send Crypto')
  await expect(page.locator('.mvp-coming-soon')).toHaveCount(0)

  const heading = page.locator('.mvp-transfer__search .mvp-section-header')
  const field = page.getByRole('textbox', { name: 'Search recipients' })
  await expect(heading).toHaveText('Recent recipients')
  const hb = (await heading.boundingBox())!
  const fb = (await field.boundingBox())!
  expect(hb.y + hb.height, 'the heading sits above the search').toBeLessThanOrEqual(fb.y)

  const expected = recentCryptoRecipients(CRYPTO_RECIPIENTS, TRANSACTIONS)
  await expect(cryptoRows(page)).toHaveCount(5)
  for (const [i, r] of expected.entries()) {
    await expect(cryptoRows(page).nth(i)).toHaveText(`${r.name}${cryptoAddressLine(r)}`)
  }
  const imgs = page.locator('.mvp-transfer__body--crypto .mvp-transfer__list img')
  await expect(imgs).toHaveCount(5)
  for (let i = 0; i < 5; i++) {
    await expect.poll(() => imgs.nth(i).evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  }
  await expect(page.locator('.mvp-transfer__body--crypto .mn-list-item > :not(.mn-list-item__leading-group)')).toHaveCount(0)
})

test('B2 crypto search: a match narrows, no match shows NoResults, Clear search restores', async ({ page }) => {
  await openCryptoTab(page)
  const field = page.getByRole('textbox', { name: 'Search recipients' })
  await field.fill('0x7ee8')
  await expect(cryptoRows(page)).toHaveCount(1)
  await expect(cryptoRows(page).first()).toContainText('Jonathan Llango')
  await field.fill('zzz')
  await expect(page.locator('.mvp-no-results')).toHaveText('No recipients matchTry a name or wallet address.Clear search')
  await expect(page.locator('.mvp-transfer__search .mvp-section-header')).toHaveText('Recent recipients')
  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect(cryptoRows(page)).toHaveCount(5)
  await expect(field).toHaveValue('')
})

test('B3 New recipient and Scan QR say Coming soon. on the Crypto tab', async ({ page }) => {
  await openCryptoTab(page)
  await page.locator('.mvp-transfer__body--crypto').getByRole('button', { name: 'New recipient' }).click()
  await expect(notice(page)).toHaveText('Coming soon.')
  await notice(page).getByRole('button').click()
  await expect(notice(page)).toHaveCount(0)
  await page.locator('.mvp-shell__nav').getByRole('button', { name: 'Scan QR' }).click()
  await expect(notice(page)).toHaveText('Coming soon.')
  expect(new URL(page.url()).pathname).toBe('/transfer')
})

test('B4 a contact opens Select Token: six derived rows, nothing selected; Back returns to the Crypto tab', async ({ page }) => {
  await openCryptoTab(page)
  await cryptoRows(page).filter({ hasText: 'Granddaughter' }).getByRole('button').click()
  await expect(page).toHaveURL(/\/transfer\/crypto\/crypto-granddaughter$/)
  await expect(page.locator('.mn-header-default')).toContainText('Select Token')
  await expect(page.locator('.mn-header-default')).toContainText('Enter Transfer Details')
  await expect(tokens(page)).toHaveCount(EXPECTED_TOKENS.length)
  for (const [i, t] of EXPECTED_TOKENS.entries()) {
    await expect(tokens(page).nth(i)).toHaveText(t.text)
    await expect(tokens(page).nth(i)).toHaveAttribute('aria-selected', 'false')
  }
  await expect(page.getByRole('listbox', { name: 'Tokens' })).toHaveCount(1)
  await expect(page.locator('.mvp-shell__nav')).toHaveCount(0)

  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/transfer$/)
  await expect(selectedTab(page)).toHaveText('Crypto')

  // Device Back from Select Token lands on the Crypto tab too.
  await cryptoRows(page).filter({ hasText: 'Grandson' }).getByRole('button').click()
  await expect(page).toHaveURL(/\/transfer\/crypto\/crypto-grandson$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/transfer$/)
  await expect(selectedTab(page)).toHaveText('Crypto')
})

test('B5 a tap selects one token; Next then says Coming soon. and stays', async ({ page }) => {
  await gotoRoute(page, '/transfer/crypto/crypto-rachum-greene', 'light')
  await page.locator('#token-eth').click()
  await expect(page.locator('#token-eth')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#token-eth')).toHaveClass(/mn-menu-item--selected/)
  await expect(page.locator('.mvp-token [aria-selected="true"]')).toHaveCount(1)
  await expect(page.locator('#token-eth')).toHaveAttribute('tabindex', '0')
  await expect(page.locator('.mvp-token [role="option"][tabindex="0"]')).toHaveCount(1)
  await page.locator('#token-sol').click()
  await expect(page.locator('#token-eth')).toHaveAttribute('aria-selected', 'false')
  await expect(page.locator('#token-sol')).toHaveAttribute('aria-selected', 'true')
  await next(page).click()
  await expect(notice(page)).toHaveText('Coming soon.')
  await expect(page.locator('.mvp-token__message')).toHaveCount(0)
  expect(new URL(page.url()).pathname).toBe('/transfer/crypto/crypto-rachum-greene')
})

test('B6 Next with nothing chosen: the message, focus on the first token, and a choice clears it', async ({ page }) => {
  await gotoRoute(page, '/transfer/crypto/crypto-rachum-greene', 'light')
  await expect(page.locator('.mvp-token__message')).toHaveCount(0)
  await expect(next(page)).toBeEnabled()
  // Count every focusout that leaves the first token, from before the press. It is
  // a capture listener on the document so it survives a re-render of the row.
  await page.evaluate(() => {
    const w = window as unknown as { __tokenFocusLost?: number }
    w.__tokenFocusLost = 0
    document.addEventListener(
      'focusout',
      (event) => {
        if ((event.target as HTMLElement | null)?.id === 'token-btc') w.__tokenFocusLost = (w.__tokenFocusLost ?? 0) + 1
      },
      true,
    )
  })
  await next(page).click()
  await expect(page.locator('.mvp-token__message')).toHaveText('Choose a token to send.')
  const list = page.getByRole('listbox', { name: 'Tokens' })
  await expect(list).toHaveAttribute('aria-invalid', 'true')
  await expect(list).toHaveAttribute('aria-describedby', 'select-token-message')
  await expect(page.locator('#token-btc')).toBeFocused()
  // Focus must also STAY. A retrying toBeFocused returns the moment the option
  // holds focus, so a blur that lands later (a deferred one) is invisible to it.
  // Absence of an event can only be observed over a bounded window, so this is an
  // observation window, not a tolerance (the mechanism of transfer.spec.ts B2,
  // R92-24): the listener above records a loss whenever it happens inside it.
  await page.evaluate(() => new Promise<void>((done) => setTimeout(done, 400)))
  expect(await page.evaluate(() => (window as unknown as { __tokenFocusLost?: number }).__tokenFocusLost)).toBe(0)
  await expect(page.locator('#token-btc')).toBeFocused()
  await expect(notice(page)).toHaveCount(0)
  await page.locator('#token-usdt').click()
  await expect(page.locator('.mvp-token__message')).toHaveCount(0)
  await expect(list).toHaveAttribute('aria-invalid', 'false')
})

test('B7 leaving the list without choosing shows the message (the touched rule)', async ({ page }) => {
  await gotoRoute(page, '/transfer/crypto/crypto-rachum-greene', 'light')
  await page.locator('#token-btc').focus()
  await expect(page.locator('.mvp-token__message')).toHaveCount(0)
  await page.keyboard.press('Tab')
  await expect(page.locator('#token-btc')).not.toBeFocused()
  await expect(page.locator('.mvp-token__message')).toHaveText('Choose a token to send.')
})

test('B8 keyboard: one tab stop; arrows, Home and End move; Enter selects', async ({ page }) => {
  await gotoRoute(page, '/transfer/crypto/crypto-rachum-greene', 'light')
  await expect(page.locator('.mvp-token [role="option"][tabindex="0"]')).toHaveCount(1)
  await expect(page.locator('#token-btc')).toHaveAttribute('tabindex', '0')
  await page.locator('#token-btc').focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('#token-eth')).toBeFocused()
  await page.keyboard.press('End')
  await expect(page.locator('#token-uni')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('#token-uni')).toBeFocused()
  await page.keyboard.press('Home')
  await expect(page.locator('#token-btc')).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(page.locator('#token-btc')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.locator('#token-eth')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#token-eth')).toHaveAttribute('tabindex', '0')
  await expect(page.locator('#token-btc')).toHaveAttribute('tabindex', '-1')
})

test('B9 an unknown contact id replaces itself with the Crypto tab', async ({ page }) => {
  await gotoRoute(page, '/transfer/crypto/crypto-nobody', 'light')
  await expect(page).toHaveURL(/\/transfer$/)
  await expect(selectedTab(page)).toHaveText('Crypto')
  // `about:blank` plus the goto: the redirect replaced, it did not push.
  expect(await page.evaluate(() => history.length)).toBe(2)
})

test('B10 opened directly, Back replaces Select Token with the Crypto tab', async ({ page }) => {
  await gotoRoute(page, '/transfer/crypto/crypto-tobey-jibriani', 'light')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/transfer$/)
  await expect(selectedTab(page)).toHaveText('Crypto')
  expect(await page.evaluate(() => history.length)).toBe(2)
})
