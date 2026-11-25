import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { gotoRoute } from './harness'
import { CRYPTO_HOLDINGS, FIAT_ACCOUNTS } from '../src/data/accounts'
import { cryptoFee } from '../src/data/derive'
import { TRANSACTIONS } from '../src/data/transactions'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GATE 112 — THE SEND GUARDS (Decision 60 = A; G76 and G77).
 *
 * `sendMoney` and `sendCrypto` each judge their row against the COMMITTED state
 * before writing (`sendRowProblem`, `cryptoSendProblem`). Neither guard can be
 * reached through the UI as shipped: the amount screens re-derive their own
 * check from live data (`transferAmountError`, `cryptoAmountError`) and refuse
 * first. So a skip of either CALL SITE survived every test (G76), and the one
 * guard whose refusal was never handled (G77) could not be exercised at all.
 *
 * THE TECHNIQUE. The spec serves the dev server's `/src/data/derive.ts` to ONE
 * tab with the UI-side amount check neutralised (a browser-only rewrite through
 * `page.route`; nothing on disk changes). A real two-tab drain then gets past
 * the screen and reaches the writer's own check: tab A holds a draft that was
 * valid when it was made, tab B spends the money, tab A re-hydrates and confirms.
 *
 * THE REWRITE MUST MATCH EXACTLY ONCE, AND EVERY TEST ASSERTS THAT IT DID. A
 * renamed function would otherwise leave the real check in place, the drain
 * would be refused by the screen, and the guard tests would test nothing while
 * (for the refusal handling) failing for the wrong reason. `rewrite.counts` is
 * the per-fetch match count; G0 pins the technique on its own.
 *
 * ⚠ DEV SERVER ONLY, like `ocr.spec.ts`: the sources are not served as modules
 * by `vite preview`, so under Gate 22's dual-build comparison no fetch of
 * `/src/data/derive.ts` happens and the first assertion fails with the message
 * below rather than the test silently passing.
 *
 * No baseline. Every assertion is its own `expect`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DB = 'monarch-mvp'
const STORE_MODULE = '/src/persistence/store.ts'
const DERIVE_MODULE = '/src/data/derive.ts'
const DIAGNOSTICS_MODULE = '/src/persistence/diagnostics.ts'
const DERIVE_URL = /\/src\/data\/derive\.ts(\?.*)?$/
const MAIN = FIAT_ACCOUNTS[0]!
const ETH = CRYPTO_HOLDINGS.find((h) => h.id === 'eth')!

const NOTICE_TITLE = "That transfer wasn't sent"
const NOTICE_BODY = 'Something changed since you opened it. Nothing was sent. Enter the amount to try again.'

// ─────────────────────────────── the technique ───────────────────────────────

interface Rewrite {
  /** One entry per fetch of the module: how many times the pattern matched. */
  counts: number[]
}

/**
 * Serve `/src/data/derive.ts` to `page` with `functionName` returning `null`
 * first thing. Browser-only: the file on disk is never touched.
 */
async function neutralise(page: Page, functionName: string): Promise<Rewrite> {
  const rewrite: Rewrite = { counts: [] }
  const pattern = new RegExp(`(export function ${functionName}\\([^)]*\\)\\s*\\{)`, 'g')
  await page.route(DERIVE_URL, async (route) => {
    const response = await route.fetch()
    let body = await response.text()
    rewrite.counts.push([...body.matchAll(pattern)].length)
    body = body.replace(pattern, '$1 return null;')
    await route.fulfill({ response, body })
  })
  return rewrite
}

/** Asserts the rewrite took, once per fetch — and says why when it did not. */
function expectMatchedOnce(rewrite: Rewrite, functionName: string): void {
  expect(
    rewrite.counts.length,
    `/src/data/derive.ts was never fetched through the rewrite — this spec needs the Vite dev server ` +
      '(playwright.config.ts starts `npm run dev`); it cannot run against a `vite preview` build, ' +
      'where the sources are bundled.',
  ).toBeGreaterThan(0)
  expect(
    rewrite.counts,
    `the rewrite of ${functionName} must match the served module exactly once per fetch — a renamed function leaves the real check in place`,
  ).toEqual(rewrite.counts.map(() => 1))
}

// ─────────────────────────────── shared helpers ──────────────────────────────

const historyIdx = (page: Page) => page.evaluate(() => (history.state as { idx: number }).idx)

async function storeIdle(page: Page): Promise<void> {
  await page.evaluate(async (path) => {
    const store: { whenIdle: () => Promise<void> } = await import(path)
    await store.whenIdle()
  }, STORE_MODULE)
}

/** Settle the write queue, then read the two collections these tests compare. */
async function readStored(page: Page): Promise<{
  transactions: { id: string; amount: number }[]
  fiatAccounts: { id: string; balance: number }[]
  cryptoHoldings: { id: string; quantity: number }[]
}> {
  await storeIdle(page)
  return page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const get = (key: string) =>
      new Promise<unknown>((resolve, reject) => {
        const request = db.transaction('records').objectStore('records').get(key)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    const out = {
      transactions: ((await get('transactions')) ?? []) as { id: string; amount: number }[],
      fiatAccounts: ((await get('fiatAccounts')) ?? []) as { id: string; balance: number }[],
      cryptoHoldings: ((await get('cryptoHoldings')) ?? []) as { id: string; quantity: number }[],
    }
    db.close()
    return out
  }, DB)
}

/** The persistence log's kinds — `rehydrated` is how a tab says it heard another tab write. */
const persistenceKinds = (page: Page) =>
  page.evaluate(async (path) => {
    const d: { persistenceLog: () => { kind: string }[] } = await import(path)
    return d.persistenceLog().map((e) => e.kind)
  }, DIAGNOSTICS_MODULE)

/** Listen BEFORE the click: an uncaught error and every console warning. */
function watch(page: Page): { errors: string[]; warnings: string[] } {
  const seen = { errors: [] as string[], warnings: [] as string[] }
  page.on('pageerror', (e) => seen.errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'warning') seen.warnings.push(m.text())
  })
  return seen
}

const notice = (page: Page) => page.locator('.mvp-notice')

// ───────────────────────────────── bank ──────────────────────────────────────

const bankAmount = (page: Page) => page.locator('.mvp-send input[role="combobox"]')
const transferMoney = (page: Page) => page.locator('.mvp-send__body > .mn-btn--primary')
const reviewSheet = (page: Page) => page.getByRole('dialog', { name: 'Review transfer' })
const transferNow = (page: Page) => page.locator('.mn-sheet__actions .mn-btn--primary')

/** From the picker to an open review sheet, through the app's own controls. */
async function toBankReview(page: Page, name: string, amount: string): Promise<void> {
  await gotoRoute(page, '/transfer', 'light')
  await page.locator('.mvp-transfer__list > li', { hasText: name }).getByRole('button').click()
  await bankAmount(page).fill(amount)
  await transferMoney(page).click()
  await expect(reviewSheet(page)).toBeVisible()
}

// ──────────────────────────────── crypto ─────────────────────────────────────

const cryptoAmount = (page: Page) => page.getByRole('combobox', { name: 'Transfer Amount' })
const cryptoPrimary = (page: Page) => page.locator('.mvp-crypto-send__body > .mn-btn--primary')
const feeSheet = (page: Page) => page.getByRole('dialog', { name: 'Network Fee' })

async function toCryptoAmount(page: Page): Promise<void> {
  await gotoRoute(page, '/transfer/crypto/crypto-rachum-greene', 'light')
  await page.locator('#token-eth').click()
  await page.locator('.mvp-token__actions').getByRole('button', { name: 'Next' }).click()
  await expect(page).toHaveURL(/\/transfer\/crypto\/send\/eth$/)
}

async function amountToSummary(page: Page, amount: string): Promise<void> {
  await cryptoAmount(page).fill(amount)
  await cryptoPrimary(page).click()
  await expect(feeSheet(page)).toBeVisible()
  await feeSheet(page).getByRole('button', { name: 'OK' }).click()
  await expect(cryptoPrimary(page)).toHaveText('Transfer crypto')
}

/** Tab B: a whole real crypto send, to the success page. */
async function sendEthElsewhere(context: BrowserContext, amount: string): Promise<Page> {
  const other = await context.newPage()
  await toCryptoAmount(other)
  await amountToSummary(other, amount)
  await cryptoPrimary(other).click()
  await expect(other.locator('.mvp-transfer-done')).toBeVisible()
  await storeIdle(other)
  return other
}

// ═══════════════════════════════ G0 — the technique ══════════════════════════

test('G0 bank: the rewrite matches transferAmountError exactly once, and the served module no longer refuses', async ({ page }) => {
  const rewrite = await neutralise(page, 'transferAmountError')
  await gotoRoute(page, '/transfer', 'light')
  expectMatchedOnce(rewrite, 'transferAmountError')
  // The page's own copy of the module is the rewritten one: an amount no balance covers is accepted.
  const bankProbe = (target: Page) =>
    target.evaluate(async (path) => {
      // The specifier is DATA, not a literal: TypeScript would otherwise resolve it at compile time.
      const mod: { transferAmountError: (amount: string, balance: number) => string | null } = await import(path)
      return mod.transferAmountError('99999999.00', 1)
    }, DERIVE_MODULE)
  const served = await bankProbe(page)
  expect(served, 'the UI-side check is neutralised in the rewritten tab').toBeNull()
  // Control: a tab with no rewrite still refuses the same amount.
  const control = await page.context().newPage()
  await gotoRoute(control, '/transfer', 'light')
  const real = await bankProbe(control)
  expect(real, 'the real check refuses it').toMatch(/More than your balance/)
})

test('G0 crypto: the rewrite matches cryptoAmountError exactly once, and the served module no longer refuses', async ({ page }) => {
  const rewrite = await neutralise(page, 'cryptoAmountError')
  await gotoRoute(page, '/transfer', 'light')
  expectMatchedOnce(rewrite, 'cryptoAmountError')
  const args = { holding: ETH, fee: cryptoFee('eth', 'regular'), path: DERIVE_MODULE }
  const run = (target: Page) =>
    target.evaluate(async ({ holding, fee, path }) => {
      const mod: {
        cryptoAmountError: (amount: string, holding: unknown, fee: unknown) => string | null
      } = await import(path)
      return mod.cryptoAmountError('99999999.00', holding, fee)
    }, args)
  expect(await run(page), 'the UI-side check is neutralised in the rewritten tab').toBeNull()
  const control = await page.context().newPage()
  await gotoRoute(control, '/transfer', 'light')
  expect(await run(control), 'the real check refuses it').toMatch(/More than your balance/)
})

// ═══════════════════════════════ G76 — bank ══════════════════════════════════

test('G76 bank: sendMoney runs its own check — a drained account refuses the send, nothing is written, the user is told', async ({ page, context }) => {
  // TAB A is at the review of RM 20,000.00 to Rachum Greene, its screen check neutralised.
  const rewrite = await neutralise(page, 'transferAmountError')
  await toBankReview(page, 'Rachum Greene', '20000.00')
  expectMatchedOnce(rewrite, 'transferAmountError')

  // TAB B (same context: the same store and channel) drains Main into Perry Matthew.
  const other = await context.newPage()
  await toBankReview(other, 'Perry Matthew', '20000.00')
  await transferNow(other).click()
  await expect(other.locator('.mvp-transfer-done')).toBeVisible()
  await storeIdle(other)

  // TAB A hears it and re-hydrates; its review stays up (the screen check is off).
  await expect.poll(() => persistenceKinds(page)).toContain('rehydrated')
  await expect(reviewSheet(page)).toBeVisible()
  const before = await readStored(page)
  expect(before.transactions, 'tab B\'s send is the only write so far').toHaveLength(TRANSACTIONS.length + 1)
  const mainBefore = before.fiatAccounts.find((a) => a.id === MAIN.id)!.balance
  expect(mainBefore, 'Main was drained').toBeCloseTo(MAIN.balance - 20000, 2)

  const seen = watch(page)
  await transferNow(page).click()

  // Nothing is written: the guard refused at the call site.
  const after = await readStored(page)
  expect(after.transactions, 'no row was written').toHaveLength(before.transactions.length)
  expect(after.fiatAccounts.find((a) => a.id === MAIN.id)!.balance, 'Main did not move').toBe(mainBefore)

  // The refusal is told, not thrown (Gate 106, R106-10).
  await expect(notice(page).locator('.mn-toast-mobile__title')).toHaveText(NOTICE_TITLE)
  await expect(notice(page).locator('.mn-toast-mobile__desc')).toHaveText(NOTICE_BODY)
  expect(seen.errors, 'the refusal is caught, not an uncaught page error').toEqual([])
  expect(seen.warnings.some((w) => /Transfer refused:.*sendMoney: txn-send-/s.test(w))).toBe(true)
  await expect(reviewSheet(page)).toHaveCount(0)
})

// ═══════════════════════════ G76 crypto + G77 ════════════════════════════════

test('G77 crypto: sendCrypto runs its own check — a refusal is told, not thrown, the amount is cleared, the contact is kept, nothing is written', async ({ page, context }) => {
  // TAB A is at the summary of RM 5,800.00 of ETH, its screen check neutralised.
  const rewrite = await neutralise(page, 'cryptoAmountError')
  await toCryptoAmount(page)
  expectMatchedOnce(rewrite, 'cryptoAmountError')
  const amountIdx = await historyIdx(page)
  await amountToSummary(page, '5800.00')
  expect(await historyIdx(page), 'the summary is its own entry (Decision 28A)').toBe(amountIdx + 1)

  // TAB B sends RM 20,000.00 of ETH.
  await sendEthElsewhere(context, '20000.00')

  // TAB A hears it and re-hydrates; its summary stays up (the screen check is off).
  await expect.poll(() => persistenceKinds(page)).toContain('rehydrated')
  await expect(cryptoPrimary(page)).toHaveText('Transfer crypto')
  const before = await readStored(page)
  expect(before.transactions, 'tab B\'s send is the only write so far').toHaveLength(TRANSACTIONS.length + 1)
  const ethBefore = before.cryptoHoldings.find((h) => h.id === 'eth')!.quantity
  expect(ethBefore, 'tab B spent ETH').toBeLessThan(ETH.quantity)

  const seen = watch(page)
  await cryptoPrimary(page).click()

  // C5 — nothing is written: the guard refused at the call site.
  const after = await readStored(page)
  expect(after.transactions, 'no row was written').toHaveLength(before.transactions.length)
  expect(after.cryptoHoldings.find((h) => h.id === 'eth')!.quantity, 'the ETH quantity did not move').toBe(ethBefore)

  // C1 — the refusal is told, with its exact title and body.
  await expect(notice(page).locator('.mn-toast-mobile__title')).toHaveText(NOTICE_TITLE)
  await expect(notice(page).locator('.mn-toast-mobile__desc')).toHaveText(NOTICE_BODY)

  // C2 — no uncaught page error; one logged refusal.
  expect(seen.errors, 'the refusal is caught, not an uncaught page error').toEqual([])
  const refusals = seen.warnings.filter((w) => w.startsWith('Transfer refused:'))
  expect(refusals, 'exactly one logged refusal').toHaveLength(1)
  expect(refusals[0]).toMatch(/sendCrypto: txn-crypto-/)

  // C3 — the summary entry closed: back at the amount entry (R103-17 reads `idx`, not the screen).
  await expect.poll(() => historyIdx(page)).toBe(amountIdx)
  await expect(cryptoPrimary(page)).toHaveText('Next')

  // C4 — the amount is cleared; the contact, the token and the tier are kept (R112-1).
  await expect(page).toHaveURL(/\/transfer\/crypto\/send\/eth$/)
  await expect(cryptoAmount(page)).toHaveValue('')
  await expect(page.locator('.mvp-crypto-send__parties .mn-form-field').nth(1)).toContainText('Rachum Greene')
  await expect(page.locator('.mn-header-default__title')).toHaveText('Send Ethereum')

  // C6 — the message belongs to this route: leaving it dismisses it.
  await page.locator('.mn-header-default__back').click()
  await expect(page).toHaveURL(/\/transfer\/crypto\/crypto-rachum-greene$/)
  await expect(notice(page)).toHaveCount(0)
})
