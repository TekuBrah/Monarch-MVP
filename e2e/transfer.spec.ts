import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { activateTab, gotoRoute } from './harness'
import { RECIPIENTS } from '../src/data/recipients'
import { filterRecipients, recipientAccountLine } from '../src/data/derive'
import { NAV_ITEMS, REPURPOSED_NAV } from '../src/shell/navItems'
import { chromeFor } from '../src/shell/chrome'

/**
 * Gate 92 — Flow 4 part 1: the Transfer sheet and the recipient picker.
 * Behaviour only, no baseline. The three walk states (`/ [overlay:transfer]`,
 * `/transfer [tab:crypto]`, `/transfer [overlay:no-match]`) photograph it.
 */

const transferItem = (page: Page) =>
  page.locator('.mvp-shell__nav .mn-bottom-nav__item', { hasText: 'Transfer' })
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Transfer' })
const notice = (page: Page) => page.locator('.mvp-notice .mn-toast-mobile')

test('N1 the five recipients, in Figma order, each with an existing image', () => {
  expect(RECIPIENTS.map((r) => r.name)).toEqual([
    'Aeon Big', 'Caring Pharmacy', 'Rachum Greene', 'Perry Matthew', 'Fiona Hammock',
  ])
  expect(RECIPIENTS.map(recipientAccountLine)).toEqual([
    '6542645894 • MBB', '6790354865 • PBB', '4597623547 • CIMB', '5134650975 • RHB', '2731640973 • HLB',
  ])
  expect(new Set(RECIPIENTS.map((r) => r.id)).size).toBe(RECIPIENTS.length)
  for (const r of RECIPIENTS) {
    if (r.mark.kind === 'image') {
      expect(existsSync(resolve('public/media/transactions', r.mark.filename)), r.mark.filename).toBe(true)
    }
  }
  expect(RECIPIENTS.filter((r) => r.kind === 'business').map((r) => r.name)).toEqual(['Aeon Big', 'Caring Pharmacy'])
})

test('N2 search matches name, account number or bank code, ignoring case and spaces at the ends', () => {
  const names = (q: string) => filterRecipients(RECIPIENTS, q).map((r) => r.name)
  expect(names('')).toHaveLength(5)
  expect(names('  perry ')).toEqual(['Perry Matthew'])
  expect(names('6790')).toEqual(['Caring Pharmacy'])
  expect(names('cimb')).toEqual(['Rachum Greene'])
  expect(names('zzz')).toEqual([])
})

test('N3 the Transfer item is an action, and /transfer repurposes the bar', () => {
  expect(NAV_ITEMS.find((n) => n.id === 'transfer')?.path).toBeNull()
  expect(chromeFor('/transfer')).toEqual({ nav: 'repurposed', fab: false, statusBar: 'page' })
  expect(REPURPOSED_NAV['/transfer'].map((i) => i.label)).toEqual(['Recipients', 'Scan QR'])
})

for (const route of ['/', '/finance', '/more']) {
  test(`B1 the bar's Transfer opens the sheet over ${route} without a route change`, async ({ page }) => {
    await gotoRoute(page, route, 'light')
    const selectedBefore = await page.locator('.mvp-shell__nav [aria-current="page"]').textContent()
    await transferItem(page).click()
    await expect(sheet(page)).toBeVisible()
    expect(new URL(page.url()).pathname).toBe(route)
    await expect(page.locator('.mvp-shell__nav [aria-current="page"]')).toHaveText(selectedBefore!)
    await expect(transferItem(page)).not.toHaveAttribute('aria-current', 'page')
  })
}

test('B2 closing the sheet returns focus to the Transfer item — close, Escape, scrim', async ({ page }) => {
  await gotoRoute(page, '/', 'light')
  for (const close of ['button', 'escape', 'scrim'] as const) {
    await transferItem(page).click()
    await expect(sheet(page)).toBeVisible()
    // Focus has left the item and is inside the dialog. Only now is a focusout
    // on the item a loss of the focus the close restores (the open itself fires
    // one), so the listener is installed here and its counter reset.
    await expect
      .poll(() => page.evaluate(() => !!document.querySelector('[role="dialog"]')?.contains(document.activeElement)))
      .toBe(true)
    await transferItem(page).evaluate((el) => {
      const w = window as unknown as { __transferFocusLost?: number }
      w.__transferFocusLost = 0
      el.addEventListener('focusout', () => {
        w.__transferFocusLost = (w.__transferFocusLost ?? 0) + 1
      })
    })
    if (close === 'button') await sheet(page).getByRole('button', { name: 'Close' }).click()
    if (close === 'escape') await page.keyboard.press('Escape')
    if (close === 'scrim') await page.locator('.mn-blanket').click({ position: { x: 10, y: 10 } })
    await expect(sheet(page)).toHaveCount(0)
    await expect(transferItem(page)).toBeFocused()
    // Focus must also STAY. A retrying toBeFocused returns the moment the item
    // holds focus, so a blur that lands later (a deferred one) is invisible to
    // it. Absence of an event can only be observed over a bounded window, so
    // this is an observation window, not a tolerance: the focusout listener
    // above records a loss whenever it happens inside it. 400 ms is longer than
    // any deferred blur a close handler would plausibly schedule.
    await page.evaluate(() => new Promise<void>((done) => setTimeout(done, 400)))
    expect(await page.evaluate(() => (window as unknown as { __transferFocusLost?: number }).__transferFocusLost)).toBe(0)
    await expect(transferItem(page)).toBeFocused()
  }
})

test('B3 Send in the sheet opens the picker with the repurposed bar and no FAB', async ({ page }) => {
  await gotoRoute(page, '/', 'light')
  await transferItem(page).click()
  await sheet(page).getByRole('button', { name: /^Send/ }).click()
  await expect(page).toHaveURL(/\/transfer$/)
  await expect(sheet(page)).toHaveCount(0)
  await expect(page.locator('.mvp-shell__nav [aria-current="page"]')).toHaveText('Recipients')
  await expect(page.locator('.mvp-shell__fab')).toHaveCount(0)
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveText('Bank')
})

test('B4 Receive closes the sheet and says Coming soon. on the same screen', async ({ page }) => {
  await gotoRoute(page, '/', 'light')
  await transferItem(page).click()
  await sheet(page).getByRole('button', { name: /^Receive/ }).click()
  await expect(sheet(page)).toHaveCount(0)
  await expect(notice(page)).toHaveText('Coming soon.')
  expect(new URL(page.url()).pathname).toBe('/')
})

test('B5 the balance card Send skips the sheet; Back returns to Home', async ({ page }) => {
  await gotoRoute(page, '/', 'light')
  await page.locator('.mvp-balance-card').getByRole('button', { name: 'Send' }).click()
  await expect(page).toHaveURL(/\/transfer$/)
  await expect(sheet(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveText('Accounts')
})

test('B6 the crypto card Send opens the Crypto tab; Back returns to Home Crypto', async ({ page }) => {
  await gotoRoute(page, '/', 'light')
  await activateTab(page, { id: 'crypto', label: 'Crypto' })
  await page.locator('.mvp-balance-card').getByRole('button', { name: 'Send' }).click()
  await expect(page).toHaveURL(/\/transfer$/)
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveText('Crypto')
  await expect(page.locator('.mvp-coming-soon')).toHaveCount(1)
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveText('Crypto')
})

test('B7 Add money and Add crypto say Coming soon.', async ({ page }) => {
  await gotoRoute(page, '/', 'light')
  await page.getByRole('button', { name: 'Add money' }).click()
  await expect(notice(page)).toHaveText('Coming soon.')
  await notice(page).getByRole('button').click()
  await expect(page.locator('.mvp-notice')).toHaveCount(0)
  await activateTab(page, { id: 'crypto', label: 'Crypto' })
  await page.getByRole('button', { name: 'Add crypto' }).click()
  await expect(notice(page)).toHaveText('Coming soon.')
  expect(new URL(page.url()).pathname).toBe('/')
})

test('B8 the picker draws five rows, two logos and three decoded photos, no chevrons', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  const rows = page.locator('.mvp-transfer__list > li')
  await expect(rows).toHaveCount(5)
  await expect(page.locator('.mvp-transfer__list .mn-logo')).toHaveCount(2)
  const photos = page.locator('.mvp-transfer__list .mn-avatar--photo img')
  await expect(photos).toHaveCount(3)
  for (const img of await photos.all()) {
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
  }
  await expect(page.locator('.mvp-transfer__list .mn-list-item > :not(.mn-list-item__leading-group)')).toHaveCount(0)
})

test('B9 search narrows the list; no match shows NoResults; Clear search restores it', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  const field = page.getByRole('textbox', { name: 'Search recipients' })
  await field.fill('HLB')
  await expect(page.locator('.mvp-transfer__list > li')).toHaveCount(1)
  await field.fill('zzz')
  await expect(page.locator('.mvp-no-results')).toHaveCount(1)
  await expect(page.locator('.mvp-transfer__list')).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect(field).toHaveValue('')
  await expect(page.locator('.mvp-transfer__list > li')).toHaveCount(5)
})

test('B10 a recipient, New recipient and Scan QR each say Coming soon.', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  await page.locator('.mvp-transfer__list > li').first().getByRole('button').click()
  await expect(notice(page)).toHaveText('Coming soon.')
  await notice(page).getByRole('button').click()
  await page.getByRole('button', { name: 'New recipient' }).click()
  await expect(notice(page)).toHaveText('Coming soon.')
  await notice(page).getByRole('button').click()
  await page.locator('.mvp-shell__nav').getByRole('button', { name: 'Scan QR' }).click()
  await expect(notice(page)).toHaveText('Coming soon.')
})

test('B11 a Coming soon. notice does not follow the user to another screen', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  await page.getByRole('button', { name: 'New recipient' }).click()
  await expect(notice(page)).toHaveText('Coming soon.')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.locator('.mvp-notice')).toHaveCount(0)
})

/**
 * R92-22 (Decision 25 C, DS v2.11.1): neither repurposed label wraps, and
 * "Recipients" hugs its label where "Scan QR" keeps the fixed 64 item. The DS
 * Phase B measured the hug item at 79.672; this pins it within a pixel.
 */
test('B12 the repurposed bar keeps both labels on one line and hugs Recipients', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  const nav = page.locator('.mvp-shell__nav')
  const item = (label: string) => nav.locator('.mn-bottom-nav__item', { hasText: label })
  for (const label of ['Recipients', 'Scan QR']) {
    // One line box: the label's text node yields exactly one client rect.
    await expect
      .poll(() =>
        item(label)
          .locator('.mn-bottom-nav__label')
          .evaluate((el) => {
            const range = document.createRange()
            range.selectNodeContents(el)
            return range.getClientRects().length
          }),
      )
      .toBe(1)
  }
  const width = (label: string) =>
    item(label).evaluate((el) => el.getBoundingClientRect().width)
  await expect.poll(async () => (await width('Recipients')) - (await width('Scan QR'))).toBeGreaterThanOrEqual(10)
  await expect.poll(async () => Math.abs((await width('Recipients')) - 79.672)).toBeLessThanOrEqual(1)
})
