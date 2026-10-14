import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { gotoRoute } from './harness'
import { FIXTURE } from './capture'
import { FIAT_ACCOUNTS } from '../src/data/accounts'
import { toSen } from '../src/data/derive'
import { formatMyr } from '../src/data/format'
import { GOALS } from '../src/data/goals'
import { TRANSACTIONS } from '../src/data/transactions'

/**
 * ─────────── THE IN-MEMORY IMAGE GUARD, WITHOUT A RELOAD — Gate 85-C ───────────
 *
 * Gate 85-B closed with one finding, I3b: removing the RUNTIME half of the
 * image-reference rule is caught by no test, because every persistence test
 * reloads before it looks at a picture, and a reload rebuilds the registry
 * from the stored bytes (which the STORED half of the rule keeps).
 *
 * THE GUARD UNDER TEST is `referencedImageUrls` in `src/persistence/boundary.ts`
 * (lines 73-75, the loop over `state.transactions`). It tells the in-memory
 * image registry which object URLs a committed snapshot still names. Without
 * that loop, replacing a goal's image makes the registry REVOKE the old URL
 * while ledger rows written under it still render it: those rows then show a
 * broken image until the app is reopened.
 *
 * ── HOW THIS TEST GUARANTEES THE OLD ROWS MOUNT FOR THE FIRST TIME AFTER THE
 * REPLACE ──
 *
 * An `<img>` that has already decoded keeps its pixels after its object URL is
 * revoked, so an old row that was already on screen would pass this test with
 * the guard removed. Two things rule that out:
 *
 *   1. The test enters through `gotoRoute` on the goal's own route, so the
 *      Finance screen — and with it the Transactions tab and every ledger
 *      row — has never been mounted in this page. The goal screen's
 *      contribution rows draw no image (`ContributionRow` passes
 *      `hasIcon={false}`).
 *   2. Immediately before navigating, the test reads every `<img>` in the
 *      document and asserts that none of them has the old image's URL. The
 *      only element that ever showed it was the goal-image slot, which now
 *      shows the new one.
 *
 * NO RELOAD APPEARS ANYWHERE IN THIS FILE. The reload rule's other half —
 * navigate through the app's own controls — is what carries the test from the
 * goal screen to the ledger.
 */

const STORE_MODULE = '/src/persistence/store.ts'
const ROTATED = 'e2e/fixtures/receipt-capture-rotated.jpg'

const BALI = GOALS.find((g) => g.id === 'goal-bali-trip')!
const MAIN = FIAT_ACCOUNTS[0]!

/** Two Top-Up figures no seeded row carries, so a figure locator finds only a written row. */
const FIRST_TOP_UP = 37.21
const SECOND_TOP_UP = 12.34

const fileHash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')

/** Wait for every write the app has queued so far (the release happens in that queue). */
async function storeIdle(page: Page): Promise<void> {
  await page.evaluate(async (path) => {
    const store: { whenIdle: () => Promise<void> } = await import(path)
    await store.whenIdle()
  }, STORE_MODULE)
}

/** Click a Finance tab whether or not it is already selected. */
async function tab(page: Page, name: string): Promise<void> {
  await page.getByRole('tab', { name }).click()
  await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true')
}

const ledgerRow = (page: Page, text: string) =>
  page.locator('.mvp-transactions__list > li').filter({ hasText: text })

/** Poll until an `<img>` has decoded to a real picture. */
async function expectDecoded(img: Locator, what: string): Promise<void> {
  await expect(img, what).toHaveAttribute('src', /^blob:/)
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth), { message: what })
    .toBeGreaterThan(0)
}

/** The SHA-256 of the bytes an already-decoded `<img>` is showing. */
async function shownHash(img: Locator): Promise<string> {
  return img.evaluate(async (el: HTMLImageElement) => {
    const bytes = await (await fetch(el.src)).arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  })
}

async function topUp(page: Page, amount: number): Promise<void> {
  await page.locator('.mvp-finance-detail__actions .mn-btn--primary').click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input[name="amount"]').fill(amount.toFixed(2))
  await dialog.getByRole('button', { name: 'Confirm Top-Up' }).click()
  await expect(dialog).toHaveCount(0)
}

/** Choose a goal image through the pencil; returns the object URL now shown. */
async function chooseGoalImage(page: Page, file: string): Promise<string> {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Edit image' }).click(),
  ])
  await chooser.setFiles(file)
  const img = page.locator('.mvp-goal-detail__image img')
  await expectDecoded(img, 'the chosen goal image decodes')
  return (await img.getAttribute('src'))!
}

test('RUNTIME images: a replaced goal image keeps its old ledger rows showing a picture in the same session, with no reload', async ({
  page,
}) => {
  for (const amount of [FIRST_TOP_UP, SECOND_TOP_UP]) {
    expect(
      TRANSACTIONS.some((t) => toSen(Math.abs(t.amount)) === toSen(amount)),
      `${amount} is unique among seeded rows`,
    ).toBe(false)
  }
  expect(BALI.fundingAccountId, 'both Top-Ups draw on a funded account').toBe(MAIN.id)

  // 1. Enter on the goal's own route, so the ledger has never been mounted.
  await gotoRoute(page, `/finance/plans/goals/${BALI.id}`, 'light')
  const oldUrl = await chooseGoalImage(page, FIXTURE)

  // 2. Two ledger rows now name the uploaded image.
  await topUp(page, FIRST_TOP_UP)
  await topUp(page, SECOND_TOP_UP)

  // 3. Replace the image, then let the write queue (where the release runs) drain.
  const newUrl = await chooseGoalImage(page, ROTATED)
  expect(newUrl, 'the replacement is a different image').not.toBe(oldUrl)
  await storeIdle(page)

  // The goal shows the NEW image's bytes.
  expect(await shownHash(page.locator('.mvp-goal-detail__image img')), 'the goal shows the new image').toBe(
    fileHash(ROTATED),
  )

  // First-mount guarantee: nothing in the document is showing the old URL, and the
  // ledger rows have not been rendered at all.
  const shown = await page.evaluate(() => [...document.images].map((img) => img.src))
  expect(shown, 'no <img> still holds the old URL').not.toContain(oldUrl)
  await expect(page.locator('.mvp-transactions__list')).toHaveCount(0)

  // 4. Navigate through the app's own controls — NO reload — to the ledger.
  await page.locator('.mn-header-default button').first().click()
  await expect(page.locator('.mvp-plans')).toBeVisible()
  await tab(page, 'Transactions')

  for (const amount of [FIRST_TOP_UP, SECOND_TOP_UP]) {
    const row = ledgerRow(page, `-${formatMyr(amount)}`)
    await expect(row, `the ${amount} row is in the ledger`).toHaveCount(1)
    await expect(row).toContainText(BALI.name)
    const img = row.locator('img')
    await expectDecoded(img, `the ${amount} row still shows a picture`)
    expect(await shownHash(img), `the ${amount} row shows the image it was written with`).toBe(fileHash(FIXTURE))
  }
})
