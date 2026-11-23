import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import {
  ESSENTIALS_DONE,
  RECATEGORISED_ID,
  RECATEGORISED_TO,
  STORED_RECIPIENT,
  WITH_NEW_RECIPIENT,
  gotoRoute,
  installStorePreset,
  type StorePreset,
} from './harness'
import {
  ACADEMY_CHIPS,
  ACADEMY_COURSES,
  ACADEMY_LEVELS,
  ACADEMY_START_TILES,
  ACADEMY_TILES,
  ACADEMY_TILE_GROUPS,
  ESSENTIAL_TASKS,
  type AcademyDestination,
} from '../src/data/academy'
import {
  essentialTaskDone,
  essentialTasks,
  filterAcademyCategory,
  filterAcademyTileGroups,
  masteryLevel,
  recategorised,
  thousandsOfRinggit,
} from '../src/data/derive'
import { FEATURE_CARDS } from '../src/data/insights'
import { FIAT_ACCOUNTS } from '../src/data/accounts'
import { chromeFor } from '../src/shell/chrome'
import { seedState, type AppState } from '../src/persistence/seed'
import type { Transaction } from '../src/data/types'

/**
 * Flow 2 — Monarch Academy (Gate 109). The pure rules in Node over synthetic
 * stores; then the screen, entered through the app's own controls wherever a
 * test is about navigation. No baseline: the five walk states photograph it.
 */

const notice = (page: Page) => page.locator('.mvp-notice .mn-toast-mobile')
const appGuideTile = (page: Page, label: string) =>
  page.locator('.mvp-academy__tiles button.mn-card-features', { hasText: label })
const selectedTab = (page: Page, root: string) =>
  page.locator(`${root} [role="tab"][aria-selected="true"]`)

/** Where Decision 42 sends each destination, and which tab must be selected there. */
const LANDING: Record<AcademyDestination, { path: string; root?: string; tab?: string }> = {
  transfer: { path: '/transfer', root: '.mvp-transfer', tab: 'Bank' },
  'transfer-crypto': { path: '/transfer', root: '.mvp-transfer', tab: 'Crypto' },
  'new-recipient': { path: '/transfer/new' },
  'finance-overview': { path: '/finance', root: '.mvp-finance', tab: 'Overview' },
  'finance-transactions': { path: '/finance', root: '.mvp-finance', tab: 'Transactions' },
  'finance-budget': { path: '/finance', root: '.mvp-finance', tab: 'Budget' },
  'finance-plans': { path: '/finance', root: '.mvp-finance', tab: 'Plans' },
  'finance-receipts': { path: '/finance', root: '.mvp-finance', tab: 'Receipts' },
  settings: { path: '/settings' },
}

async function expectLanded(page: Page, destination: AcademyDestination): Promise<void> {
  const land = LANDING[destination]
  await expect(page).toHaveURL(new RegExp(`${land.path}$`))
  if (land.root) await expect(selectedTab(page, land.root)).toHaveText(land.tab!)
}

/** Home's Accounts tab, then the promo band — the in-app way into the Academy. */
async function openFromHome(page: Page): Promise<void> {
  await gotoRoute(page, '/', 'light')
  await page.locator('.mvp-home__promo-title').click()
  await expect(page).toHaveURL(/\/academy$/)
  await expect(selectedTab(page, '.mvp-academy')).toHaveText('App Guide')
}

async function gotoWithStore(page: Page, preset: StorePreset): Promise<void> {
  await installStorePreset(page, preset)
  await gotoRoute(page, '/academy', 'light')
}

const SEED = seedState()
const without = (state: AppState, edit: Partial<AppState>): AppState => ({ ...state, ...edit })
/** The seed with tasks 1, 3, 4 and 5 undone: no outgoing transfer, no budget,
    no auto-save, no receipt. Tasks 2 and 6 are undone on the seed already. */
const NONE_DONE = without(SEED, {
  transactions: SEED.transactions.filter((t) => !(t.kind === 'transfer' && t.amount < 0 && t.goalId === undefined)),
  budgets: [],
  goals: SEED.goals.map((g) => ({ ...g, autoSave: { ...g.autoSave, isEnabled: false } })),
  receipts: [],
})

// ═══════════════════════════════ Node: the rules ════════════════════════════

test('N1 the 16 tiles, their groups, labels and destinations (Decisions 42, 49, 55)', () => {
  expect(ACADEMY_TILE_GROUPS.map((g) => [g.label, g.variant])).toEqual([
    ['Essentials', 'blue'],
    ['Crypto & Assets', 'orange'],
    ['Plan & Manage', 'green'],
    ['Safety & Support', 'purple'],
  ])
  expect(ACADEMY_TILES.map((t) => [t.label, t.destination])).toEqual([
    ['Add Money', null],
    ['Instant Transfers', 'transfer'],
    ['Scheduled Payments', null],
    ['Managing Accounts', null],
    ['Buy and Sell Crypto', null],
    ['Crypto Transfers', 'transfer-crypto'],
    ['Buy and Sell Stocks', null],
    ['Monitor Asset Performance', 'finance-overview'],
    ['Track Spending', 'finance-transactions'],
    ['Budgets', 'finance-budget'],
    ['Savings Goals', 'finance-plans'],
    ['Automated Savings', 'finance-plans'],
    ['Fraud Protection', null],
    ['Smart Insights', null],
    ['Spending Alerts', null],
    ['Account Controls', 'settings'],
  ])
  // Decision 43: Home's three tiles are App Guide tiles, by id and by label.
  for (const card of FEATURE_CARDS) {
    const tile = ACADEMY_TILES.find((t) => t.id === card.id)
    expect(tile, card.id).toBeDefined()
    expect(card.title).toBe(tile!.label)
  }
  expect(FEATURE_CARDS.map((c) => c.title)).toEqual(['Buy and Sell Stocks', 'Track Spending', 'Smart Insights'])
})

test('N2 the level table: 0–1 Lv1, 2–3 Lv2, 4–5 Lv3, 6 Lv4 (Decision 45)', () => {
  expect([0, 1, 2, 3, 4, 5, 6].map((d) => `${masteryLevel(d).level} ${masteryLevel(d).name}`)).toEqual([
    '1 Getting Started', '1 Getting Started', '2 Explorer', '2 Explorer', '3 Pro User', '3 Pro User', '4 Monarch Master',
  ])
  expect(ACADEMY_LEVELS.map((l) => l.minDone)).toEqual([0, 2, 4, 6])
})

test('N3 on the seed, 4 of 6 are done and the next task is "Add a recipient"', () => {
  const p = essentialTasks(SEED)
  expect(p.tasks.map((t) => [t.task.id, t.done])).toEqual([
    ['transfer', true], ['recipient', false], ['budget', true], ['auto-save', true], ['receipt', true], ['recategorise', false],
  ])
  expect(p.done).toBe(4)
  expect(p.next?.title).toBe('Add a recipient')
  expect(essentialTasks(NONE_DONE).done).toBe(0)
  expect(essentialTasks(NONE_DONE).next?.title).toBe('Make a transfer')
  expect(ESSENTIAL_TASKS.map((t) => t.title)).toEqual([
    'Make a transfer', 'Add a recipient', 'Set a budget', 'Turn on auto-save for a goal', 'Capture a receipt', 'Recategorise a transaction',
  ])
})

test('N4 each task reads only its own stored fact (R109-1, R109-2)', () => {
  const row = (over: Partial<Transaction>): Transaction => ({ ...SEED.transactions[0], id: 'txn-test', ...over })
  const done = (id: Parameters<typeof essentialTaskDone>[0], edit: Partial<AppState>) =>
    essentialTaskDone(id, without(NONE_DONE, edit))
  const base = NONE_DONE.transactions
  // Task 1: a written send, or an outgoing transfer that is not into a goal.
  expect(done('transfer', { transactions: [...base, row({ recipientId: 'recipient-x', kind: 'payment', amount: -5 })] })).toBe(true)
  expect(done('transfer', { transactions: [...base, row({ kind: 'transfer', amount: -5, goalId: undefined })] })).toBe(true)
  expect(done('transfer', { transactions: [...base, row({ kind: 'transfer', amount: -5, goalId: 'goal-bali-trip' })] })).toBe(false)
  expect(done('transfer', { transactions: [...base, row({ kind: 'transfer', amount: 5, goalId: undefined })] })).toBe(false)
  // Task 2, 3, 4, 5.
  expect(done('recipient', { userRecipients: [STORED_RECIPIENT] })).toBe(true)
  expect(done('budget', { budgets: SEED.budgets.slice(0, 1) })).toBe(true)
  expect(done('auto-save', { goals: SEED.goals })).toBe(true)
  expect(done('receipt', { receipts: SEED.receipts.slice(0, 1) })).toBe(true)
  // Task 6: a merchant rule, or a seeded row whose live category moved.
  expect(done('recategorise', { categoryRules: [{ merchant: 'Aeon Big', category: 'dining' }] })).toBe(true)
  const moved = SEED.transactions.map((t) => (t.id === RECATEGORISED_ID ? recategorised(t, RECATEGORISED_TO) : t))
  expect(done('recategorise', { transactions: moved })).toBe(true)
  // A row the seed does not hold cannot count, whatever its category.
  expect(done('recategorise', { transactions: [...SEED.transactions, row({ id: 'txn-new', category: 'dining' })] })).toBe(false)
  expect(essentialTasks(ESSENTIALS_DONE.edit(SEED)).next).toBeNull()
  expect(essentialTasks(WITH_NEW_RECIPIENT.edit(SEED)).next?.title).toBe('Recategorise a transaction')
})

test('N5 the nudge figure rounds DOWN to whole thousands (Decision 44)', () => {
  expect(thousandsOfRinggit(FIAT_ACCOUNTS[0].balance)).toBe(27)
  expect([999.99, 1000, 26999.99, 27000, 0].map(thousandsOfRinggit)).toEqual([0, 1, 26, 27, 0])
})

test('N6 the feature search matches tile labels and group names, ignoring case (R107-3)', () => {
  const shown = (q: string) => filterAcademyTileGroups(ACADEMY_TILE_GROUPS, q).map((g) => [g.label, g.tiles.map((t) => t.label)])
  expect(shown('')).toHaveLength(4)
  expect(shown('  BUDG ')).toEqual([['Plan & Manage', ['Budgets']]])
  expect(shown('safety')).toEqual([['Safety & Support', ['Fraud Protection', 'Smart Insights', 'Spending Alerts', 'Account Controls']]])
  expect(shown('transfers')).toEqual([['Essentials', ['Instant Transfers']], ['Crypto & Assets', ['Crypto Transfers']]])
  expect(shown('zzz')).toEqual([])
})

test('N7 each chip keeps only its topic; Taxes has none (R107-2)', () => {
  const ids = (chip: (typeof ACADEMY_CHIPS)[number]['id']) => [
    filterAcademyCategory(ACADEMY_START_TILES, chip).map((t) => t.id),
    filterAcademyCategory(ACADEMY_COURSES, chip).map((c) => c.id),
  ]
  expect(ids('all')).toEqual([['inflation', 'diversification', 'ways-to-save'], ['investing-101', 'retirement-planning', 'crypto-risks']])
  expect(ids('investing')).toEqual([['inflation', 'diversification'], ['investing-101']])
  expect(ids('crypto')).toEqual([[], ['crypto-risks']])
  expect(ids('taxes')).toEqual([[], []])
  expect(ids('retirement')).toEqual([[], ['retirement-planning']])
})

test('N8 /academy hides the nav and shows the FAB (R107-1); the Spotlight picture is 3x its box', () => {
  expect(chromeFor('/academy')).toEqual({ nav: 'suppressed', fab: true, statusBar: 'page' })
  const png = readFileSync(resolve('public/media/illustrations/spotlight-budgets.png'))
  expect(png.subarray(1, 4).toString()).toBe('PNG')
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([384, 832])
})

// ═══════════════════════════════ Browser ═════════════════════════════════════

test('B1 Home opens the Academy from the band and from Explore; Back lands on Home', async ({ page }) => {
  await openFromHome(page)
  await page.locator('.mn-header-default button').first().click()
  await expect(page).toHaveURL(/\/$/)
  await expect(selectedTab(page, '.mvp-home')).toHaveText('Accounts')
  await page.getByRole('link', { name: 'Explore' }).click()
  await expect(page).toHaveURL(/\/academy$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
})

test('B2 opened directly, Back REPLACES itself with Home', async ({ page }) => {
  await gotoRoute(page, '/academy', 'light')
  const before = await page.evaluate(() => history.length)
  await page.locator('.mn-header-default button').first().click()
  await expect(page).toHaveURL(/\/$/)
  expect(await page.evaluate(() => history.length)).toBe(before)
})

test('B3 App Guide on the seed: level 3, the next task, the Spotlight, 16 tiles', async ({ page }) => {
  await gotoRoute(page, '/academy', 'light')
  const card = page.locator('.mvp-academy-level')
  await expect(card).toContainText('Your Monarch mastery')
  await expect(card.locator('.mvp-academy-level__badge')).toHaveText('Lv3')
  await expect(card.locator('.mvp-academy-level__line')).toHaveText('Level 3: Pro User')
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67')
  const row = page.locator('.mn-card-smart-insights-row')
  await expect(row.locator('.mn-card-smart-insights-row__title')).toHaveText('Add a recipient')
  await expect(row.locator('.mn-card-smart-insights-row__caption')).toHaveText('4 of 6 completed')
  await expect(row.getByRole('link', { name: 'Set up now' })).toBeVisible()
  await expect(page.locator('.mvp-academy-spotlight__title')).toHaveText('Introducing budgets')
  await expect
    .poll(() => page.locator('.mvp-academy-spotlight__image').evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBe(384)
  await expect(page.locator('.mvp-academy__tiles button.mn-card-features')).toHaveText(ACADEMY_TILES.map((t) => t.label))
  await expect(page.getByText('Smart budgets')).toHaveCount(0)
})

for (const tile of ACADEMY_TILES) {
  test(`B4 App Guide tile "${tile.label}" ${tile.destination ? `opens ${tile.destination}` : 'says Coming soon.'}`, async ({ page }) => {
    await gotoRoute(page, '/academy', 'light')
    await appGuideTile(page, tile.label).click()
    if (tile.destination === null) {
      await expect(notice(page)).toHaveText('Coming soon.')
      await expect(page).toHaveURL(/\/academy$/)
      return
    }
    await expectLanded(page, tile.destination)
    await page.goBack()
    await expect(page).toHaveURL(/\/academy$/)
    await expect(selectedTab(page, '.mvp-academy')).toHaveText('App Guide')
  })
}

test('B5 "Set up now" opens the next task; Back returns to the App Guide', async ({ page }) => {
  await gotoRoute(page, '/academy', 'light')
  await page.getByRole('link', { name: 'Set up now' }).click()
  await expectLanded(page, 'new-recipient')
  await page.goBack()
  await expect(page).toHaveURL(/\/academy$/)
})

test('B6 the Spotlight\'s "See budgets" opens the Budget tab', async ({ page }) => {
  await gotoRoute(page, '/academy', 'light')
  await page.getByRole('button', { name: 'See budgets' }).click()
  await expectLanded(page, 'finance-budget')
})

test('B7 Home\'s three tiles do what the App Guide tile does (Decision 43)', async ({ page }) => {
  await gotoRoute(page, '/', 'light')
  const home = (label: string) => page.locator('.mvp-home__feature-row button.mn-card-features', { hasText: label })
  await expect(page.locator('.mvp-home__feature-row button.mn-card-features')).toHaveCount(3)
  for (const label of ['Buy and Sell Stocks', 'Smart Insights']) {
    await home(label).click()
    await expect(notice(page)).toHaveText('Coming soon.')
    await expect(page).toHaveURL(/\/$/)
  }
  await home('Track Spending').click()
  await expectLanded(page, 'finance-transactions')
  await page.goBack()
  await expect(selectedTab(page, '.mvp-home')).toHaveText('Accounts')
})

test('B8 the search narrows tiles and groups, and clears from no match', async ({ page }) => {
  await gotoRoute(page, '/academy', 'light')
  const search = page.getByRole('textbox', { name: 'Search features' })
  await search.fill('budg')
  await expect(page.locator('.mvp-academy__tiles button.mn-card-features')).toHaveText(['Budgets'])
  await search.fill('SAFETY')
  await expect(page.locator('.mvp-academy__tiles button.mn-card-features')).toHaveCount(4)
  await search.fill('zzz')
  await expect(page.locator('.mvp-no-results h2')).toHaveText('No features match')
  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect(search).toHaveValue('')
  await expect(page.locator('.mvp-academy__tiles button.mn-card-features')).toHaveCount(16)
})

test('B9 Wealth Wisdom: no score, the nudge, Start here, Short courses, no XP', async ({ page }) => {
  await gotoRoute(page, '/academy', 'light')
  await page.getByRole('tab', { name: 'Wealth Wisdom' }).click()
  const card = page.locator('.mvp-academy-level')
  await expect(card).toContainText('Your learning')
  await expect(card.locator('.mvp-academy-level__line')).toHaveText('Lessons are coming soon.')
  await expect(card.locator('.mvp-academy-level__badge')).toHaveCount(0)
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  const nudge = page.locator('.mn-card-smart-insights-row--green')
  await expect(nudge.locator('.mn-card-smart-insights-row__title')).toHaveText('You have RM 27K in Main')
  await expect(nudge.locator('.mn-card-smart-insights-row__caption')).toHaveText('Learn how savings interest works (4 min)')
  await expect(page.getByText('Start here, Margaret')).toBeVisible()
  await expect(page.locator('.mvp-academy__courses .mn-chart-legend-item__subtitle')).toHaveText([
    '6 Modules • 15 min', '3 Modules • 10 min', '4 Modules • 12 min',
  ])
  await expect(page.getByText(/XP|Financial IQ|Savvy Saver|Quick Wins|Personalized/)).toHaveCount(0)
})

test('B10 the chips filter, and Taxes shows the empty line', async ({ page }) => {
  await gotoRoute(page, '/academy', 'light')
  await page.getByRole('tab', { name: 'Wealth Wisdom' }).click()
  const counts = async () => [
    await page.locator('.mvp-academy__tiles .mn-card-features').count(),
    await page.locator('.mvp-academy__courses li').count(),
    await page.locator('.mn-card-smart-insights-row--green').count(),
  ]
  const expected: Record<string, number[]> = {
    Investing: [2, 1, 0], Crypto: [0, 1, 0], Taxes: [0, 0, 0], Retirement: [0, 1, 0], All: [3, 3, 1],
  }
  for (const [label, want] of Object.entries(expected)) {
    const chip = page.locator('.mvp-academy__chips button', { hasText: label })
    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(await counts(), label).toEqual(want)
    await expect(page.locator('.mvp-academy__empty')).toHaveCount(label === 'Taxes' ? 1 : 0)
  }
  await page.locator('.mvp-academy__chips button', { hasText: 'Taxes' }).click()
  await expect(page.locator('.mvp-academy__empty')).toHaveText('Nothing on Taxes yet.')
})

test('B11 every Wealth Wisdom control says Coming soon. and stays put', async ({ page }) => {
  await gotoRoute(page, '/academy', 'light')
  await page.getByRole('tab', { name: 'Wealth Wisdom' }).click()
  const controls = [
    page.locator('button.mn-card-smart-insights-row--green'),
    ...ACADEMY_START_TILES.map((t) => page.locator('.mvp-academy__tiles button', { hasText: t.title })),
    ...ACADEMY_COURSES.map((c) => page.locator('.mvp-academy__courses button', { hasText: c.title })),
  ]
  expect(controls).toHaveLength(7)
  for (const control of controls) {
    await control.click()
    await expect(notice(page)).toHaveText('Coming soon.')
    await expect(page).toHaveURL(/\/academy$/)
    await expect(selectedTab(page, '.mvp-academy')).toHaveText('Wealth Wisdom')
  }
})

const LEVEL_PRESETS: { done: number; preset: StorePreset; badge: string; line: string; next: string | null }[] = [
  {
    done: 1,
    preset: { id: 'one', edit: () => without(NONE_DONE, { receipts: SEED.receipts }) },
    badge: 'Lv1', line: 'Level 1: Getting Started', next: 'Make a transfer',
  },
  {
    done: 2,
    preset: { id: 'two', edit: () => without(NONE_DONE, { receipts: SEED.receipts, budgets: SEED.budgets }) },
    badge: 'Lv2', line: 'Level 2: Explorer', next: 'Make a transfer',
  },
  { done: 5, preset: WITH_NEW_RECIPIENT, badge: 'Lv3', line: 'Level 3: Pro User', next: 'Recategorise a transaction' },
  { done: 6, preset: ESSENTIALS_DONE, badge: 'Lv4', line: 'Level 4: Monarch Master', next: null },
]

for (const level of LEVEL_PRESETS) {
  test(`B12 ${level.done} of 6 done reads ${level.badge}, next ${level.next ?? 'none'}`, async ({ page }) => {
    await gotoWithStore(page, level.preset)
    const card = page.locator('.mvp-academy-level')
    await expect(card.locator('.mvp-academy-level__badge')).toHaveText(level.badge)
    await expect(card.locator('.mvp-academy-level__line')).toHaveText(level.line)
    const row = page.locator('.mn-card-smart-insights-row')
    await expect(row.locator('.mn-card-smart-insights-row__caption')).toHaveText(`${level.done} of 6 completed`)
    await expect(row.locator('.mn-card-smart-insights-row__title')).toHaveText(level.next ?? 'Essentials complete')
    // All done: no link, and the row is no control at all.
    await expect(row.getByRole('link')).toHaveCount(level.next ? 1 : 0)
    await expect(page.locator('button.mn-card-smart-insights-row')).toHaveCount(0)
  })
}

test('B13 the nudge figure moves after a send, reached through the app', async ({ page }) => {
  await gotoRoute(page, '/transfer', 'light')
  await page.locator('.mvp-transfer__list > li', { hasText: 'Perry Matthew' }).getByRole('button').click()
  await page.getByRole('combobox', { name: 'Transfer Amount' }).fill('1000.00')
  await page.getByRole('button', { name: 'Transfer money' }).click()
  await page.getByRole('dialog', { name: 'Review transfer' }).getByRole('button', { name: 'Transfer now' }).click()
  await expect(page).toHaveURL(/\/transfer\/done\//)
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('link', { name: 'Explore' }).click()
  await page.getByRole('tab', { name: 'Wealth Wisdom' }).click()
  await expect(page.locator('.mn-card-smart-insights-row--green .mn-card-smart-insights-row__title')).toHaveText(
    'You have RM 26K in Main',
  )
})

test('B14 keyboard: tiles and chips are buttons, the task link answers Enter', async ({ page }) => {
  await gotoRoute(page, '/academy', 'light')
  const tile = appGuideTile(page, 'Track Spending')
  await tile.focus()
  await expect(tile).toBeFocused()
  await page.keyboard.press('Enter')
  await expectLanded(page, 'finance-transactions')
  await page.goBack()
  await page.getByRole('link', { name: 'Set up now' }).focus()
  await page.keyboard.press('Enter')
  await expectLanded(page, 'new-recipient')
  await page.goBack()
  await page.getByRole('tab', { name: 'Wealth Wisdom' }).click()
  const chip = page.locator('.mvp-academy__chips button', { hasText: 'Crypto' })
  await chip.focus()
  await page.keyboard.press('Space')
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
})

for (const theme of ['light', 'dark'] as const) {
  test(`B15 [${theme}] the bar is the DS green, the button is Inverse, the FAB clears the content`, async ({ page }) => {
    await gotoRoute(page, '/academy', theme)
    const fill = page.locator('.mvp-academy-level .mn-progress-bar__fill')
    await expect(fill).toHaveCSS('background-color', theme === 'light' ? 'rgb(45, 147, 77)' : 'rgb(96, 198, 128)')
    await expect(page.getByRole('button', { name: 'See budgets' })).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    // R107-1: no nav pill, the FAB in its one position, the last tile clear of it.
    await expect(page.locator('.mvp-shell__nav')).toHaveCount(0)
    const fab = await page.locator('.mvp-shell__fab').boundingBox()
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const last = await page.locator('.mvp-academy__tiles button').last().boundingBox()
    expect(last!.y + last!.height).toBeLessThanOrEqual(fab!.y)
    // A notice rises above the FAB rather than across it.
    await appGuideTile(page, 'Spending Alerts').click()
    await expect(notice(page)).toHaveText('Coming soon.')
    const box = await notice(page).boundingBox()
    expect(box!.y + box!.height).toBeLessThanOrEqual(fab!.y)
  })
}
// ═══════════════════════ Gate 109 Phase B: two gaps found by mutation ═════════

// R107-5 (A19). Home's band and its Explore link each push exactly ONE history
// entry. The link's handler stops the click reaching the band, whose own handler
// would navigate again; without that, Back from the Academy lands on a second Home
// entry and the user must press it twice to leave Home. Read the history index,
// not the screen: the two renders are identical.
test('B16 the band and Explore each push exactly ONE history entry (R107-5)', async ({ page }) => {
  await gotoRoute(page, '/', 'light')
  const index = () => page.evaluate(() => (history.state as { idx: number }).idx)
  for (const via of ['link', 'keyboard', 'band'] as const) {
    const before = await index()
    if (via === 'link') await page.getByRole('link', { name: 'Explore' }).click()
    else if (via === 'keyboard') {
      await page.getByRole('link', { name: 'Explore' }).focus()
      await page.keyboard.press('Enter')
    } else await page.locator('.mvp-home__promo-title').click()
    await expect(page).toHaveURL(/\/academy$/)
    expect(await index(), `${via}: one entry pushed`).toBe(before + 1)
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    expect(await index(), `${via}: one Back returns to where it started`).toBe(before)
  }
})

// Decisions 46 and 57 (E1). Each Essential Task's link opens ITS OWN destination.
// The link shown is the first undone task's, so each task is made the next one by
// completing every task before it (cumulatively, from the stored data each reads).
const BEFORE_TASK: Partial<AppState>[] = [
  {},
  { transactions: SEED.transactions },
  { transactions: SEED.transactions, userRecipients: [STORED_RECIPIENT] },
  { transactions: SEED.transactions, userRecipients: [STORED_RECIPIENT], budgets: SEED.budgets },
  { transactions: SEED.transactions, userRecipients: [STORED_RECIPIENT], budgets: SEED.budgets, goals: SEED.goals },
  { transactions: SEED.transactions, userRecipients: [STORED_RECIPIENT], budgets: SEED.budgets, goals: SEED.goals, receipts: SEED.receipts },
]
const TASK_LINKS: [string, AcademyDestination][] = [
  ['Make a transfer', 'transfer'],
  ['Add a recipient', 'new-recipient'],
  ['Set a budget', 'finance-budget'],
  ['Turn on auto-save for a goal', 'finance-plans'],
  ['Capture a receipt', 'finance-receipts'],
  ['Recategorise a transaction', 'finance-transactions'],
]
for (const [i, [title, destination]] of TASK_LINKS.entries()) {
  test(`B17 task "${title}" opens ${destination}`, async ({ page }) => {
    await gotoWithStore(page, { id: `task-${i + 1}`, edit: () => without(NONE_DONE, BEFORE_TASK[i]) })
    await expect(page.locator('.mn-card-smart-insights-row__title')).toHaveText(title)
    await page.getByRole('link', { name: 'Set up now' }).click()
    await expectLanded(page, destination)
    await page.goBack()
    await expect(page).toHaveURL(/\/academy$/)
  })
}
