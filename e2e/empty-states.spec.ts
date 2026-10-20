import { expect, test, type Locator, type Page } from '@playwright/test'
import { BUDGETS } from '../src/data/budgets'
import { COMMITMENTS } from '../src/data/commitments'
import { listPresence } from '../src/data/derive'
import { GOALS } from '../src/data/goals'
import { RECEIPTS } from '../src/data/receipts'
import type { AppState } from '../src/persistence/seed'
import {
  EMPTIED_BUDGETS,
  EMPTIED_GOALS,
  EMPTIED_RECEIPTS,
  NEW_GOAL,
  PINNED_NOW,
  WITH_NEW_GOAL,
  activateTab,
  gotoRoute,
  installStorePreset,
  type StorePreset,
} from './harness'
import {
  RECEIPTS_TAB,
  TRANSACTIONS_TAB,
  capturedImageName,
  installResolvingExtraction,
  openReceiptFilter,
  saveOneCapture,
} from './capture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE EMPTY STATES, AND THE LINE BETWEEN EMPTY AND NO-RESULTS — Gate 88.
 *
 * The four store walk states photograph each empty state as a tester reopens
 * it. A screenshot cannot say how the list GOT empty, that a filtered list is
 * NOT empty, that the state leaves when a record arrives, or that a reload keeps
 * it — which is what this file is for.
 *
 * EVERY LIST IS EMPTIED THROUGH ITS REAL DELETE CONTROLS where a test is about
 * emptying (F8), and a test about what happens AT zero starts from a store
 * preset — the harness's `installStorePreset`, the walk's own mechanism, so the
 * two cannot disagree about what an emptied store is.
 *
 * THE RELOAD RULE (Gate 85): a cross-screen assertion navigates through the
 * app's own controls; a persistence assertion waits for the write queue, then
 * reloads ON PURPOSE and asserts the data was KEPT.
 *
 * NO BASELINE. Light theme, default viewport: structure is not a colour fact.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const STORE_MODULE = '/src/persistence/store.ts'

/** Wait for every write the app has queued so far (the module the app runs). */
async function storeIdle(page: Page): Promise<void> {
  await page.evaluate(async (path) => {
    const store: { whenIdle: () => Promise<void> } = await import(path)
    await store.whenIdle()
  }, STORE_MODULE)
}

/** Select a tab that may ALREADY be selected — after a reload, for instance. */
async function showTab(page: Page, id: string): Promise<void> {
  const control = page.locator(`[role="tab"][id="tab-${id}"]`)
  if ((await control.getAttribute('aria-selected')) !== 'true') await control.click()
  await expect(control).toHaveAttribute('aria-selected', 'true')
}

/** Start from a prepared store: the preset first, then the route. */
async function gotoWithStore(page: Page, route: string, preset: StorePreset): Promise<void> {
  await installStorePreset(page, preset)
  await gotoRoute(page, route, 'light')
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
}

const cards = (page: Page) => page.locator('.mvp-receipt-card')
const emptyState = (page: Page) => page.locator('.mvp-empty-state')
const noResults = (page: Page) => page.locator('.mvp-no-results')
const searchField = (page: Page) => page.getByRole('textbox', { name: 'Search receipts' })
const filterButton = (page: Page) => page.getByRole('button', { name: 'Filter receipts' })
const receiptChips = (page: Page) => page.locator('.mvp-receipts__chips li')
const addReceipt = (page: Page) => page.getByRole('button', { name: 'Add new receipt' })
const goalCards = (page: Page) => page.locator('.mvp-plans__goals > li')
const goalsAddNew = (page: Page) =>
  page.locator('.mvp-plans__section').first().getByRole('link', { name: 'Add New' })
const budgetCards = (page: Page) =>
  page.locator('.mvp-budget .mn-card-monthly-budget:not(.mn-card-monthly-budget--add-new)')
const deleteToast = (page: Page) => page.locator('.mvp-finance-detail__toast [role="status"]')

/** Open the first receipt card and delete it through the viewer's own controls. */
async function deleteFirstReceipt(page: Page): Promise<void> {
  await cards(page).first().click()
  await page.getByRole('button', { name: 'Delete receipt' }).click()
  await page
    .getByRole('dialog', { name: 'Delete receipt?' })
    .getByRole('button', { name: 'Delete', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

/** The Receipts tab at zero: the empty state, and nothing that acts on the list. */
async function expectReceiptsEmpty(page: Page): Promise<void> {
  await expect(cards(page)).toHaveCount(0)
  await expect(emptyState(page)).toHaveCount(1)
  await expect(emptyState(page).getByRole('heading', { level: 2 })).toHaveText('No receipts')
  await expect(emptyState(page)).toContainText(
    'Photograph a receipt or add an image or PDF, and it appears here.',
  )
  await expect(noResults(page), 'an emptied library is not a filtered one').toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Show all receipts' })).toHaveCount(0)
  await expect(searchField(page)).toHaveCount(0)
  await expect(filterButton(page)).toHaveCount(0)
  await expect(page.locator('.mvp-receipts__chips')).toHaveCount(0)
  await expect(addReceipt(page), 'the writer stays').toHaveCount(1)
}

/** What a readable capture extracts — invented, matching no ledger row. */
const READABLE = {
  merchant: 'Test Merchant',
  capturedAt: '2026-08-14T10:00:00',
  total: 12.34,
  tax: null,
  currency: 'MYR',
  lineItems: [],
}

/** One seeded receipt left, so a test can delete the LAST one through the UI. */
const ONE_RECEIPT: StorePreset = {
  id: 'one-receipt',
  edit: (state: AppState) => ({ ...state, receipts: state.receipts.slice(0, 1) }),
}

const ALL_EMPTIED: StorePreset = {
  id: 'all-emptied',
  edit: (state: AppState) => ({ ...state, receipts: [], goals: [], budgets: [] }),
}

// ─────────────────────────────────────────────────────────────────────── Node

test('listPresence: empty whenever the stored list is empty, no-results only for a filtered non-empty one', () => {
  expect(listPresence(0, 0)).toBe('empty')
  // A total of zero is empty WHATEVER the visible count says — the rule R88-2
  // turns on; `visible` can never exceed `total` in the app, but the function
  // must not let it decide.
  expect(listPresence(0, 3)).toBe('empty')
  expect(listPresence(10, 0)).toBe('no-results')
  expect(listPresence(1, 0)).toBe('no-results')
  expect(listPresence(10, 4)).toBe('list')
  expect(listPresence(1, 1)).toBe('list')
})

// ─────────────────────────────────────────────────────────────────── receipts

test('receipts: deleting all ten through the viewer shows the empty state, hides the list controls, and a reload keeps it', async ({
  page,
}) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, RECEIPTS_TAB)
  await expect(cards(page)).toHaveCount(RECEIPTS.length)

  for (let left = RECEIPTS.length; left > 0; left--) {
    await deleteFirstReceipt(page)
    await expect(cards(page)).toHaveCount(left - 1)
  }
  await expectReceiptsEmpty(page)

  await storeIdle(page)
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await showTab(page, 'receipts')
  await expectReceiptsEmpty(page)
})

test('receipts: a NON-empty library filtered to zero shows NoResults, never the empty state', async ({
  page,
}) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, RECEIPTS_TAB)
  await searchField(page).fill('no receipt is called this')

  await expect(cards(page)).toHaveCount(0)
  await expect(noResults(page)).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Show all receipts' })).toHaveCount(1)
  await expect(emptyState(page), 'a filtered library is not an empty one').toHaveCount(0)
  await expect(searchField(page), 'the search that caused it stays').toHaveCount(1)

  // And its action genuinely recovers, which is why it is kept for this case.
  await page.getByRole('button', { name: 'Show all receipts' }).click()
  await expect(cards(page)).toHaveCount(RECEIPTS.length)
})

test('receipts: from an emptied store, adding one brings a card back and the controls with it', async ({
  page,
}) => {
  await gotoWithStore(page, '/finance', EMPTIED_RECEIPTS)
  await activateTab(page, RECEIPTS_TAB)
  await expectReceiptsEmpty(page)

  await installResolvingExtraction(page, READABLE)
  await saveOneCapture(page)

  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page)).toHaveAccessibleName(capturedImageName(PINNED_NOW))
  await expect(emptyState(page)).toHaveCount(0)
  await expect(searchField(page)).toHaveCount(1)
  await expect(filterButton(page)).toHaveCount(1)
})

test('receipts: reaching zero clears the search and the filter, so the next receipt is not hidden behind controls that were gone', async ({
  page,
}) => {
  await gotoWithStore(page, '/finance', ONE_RECEIPT)
  await activateTab(page, RECEIPTS_TAB)
  const last = RECEIPTS[0]
  expect(last.transactionId, 'the remaining receipt is linked, so "Linked" keeps it').not.toBeNull()

  // A search term AND a facet, both still matching the last receipt.
  await searchField(page).fill(last.merchant)
  const sheet = await openReceiptFilter(page)
  await sheet.getByRole('button', { name: 'Linked', exact: true }).click()
  await sheet.getByRole('button', { name: /^Apply Filter/ }).click()
  await expect(receiptChips(page)).toHaveCount(1)
  await expect(cards(page)).toHaveCount(1)

  await deleteFirstReceipt(page)
  await expectReceiptsEmpty(page)

  // An UNLINKED capture whose merchant does not match the old search term:
  // either one surviving would hide it.
  await installResolvingExtraction(page, READABLE)
  await saveOneCapture(page)

  await expect(noResults(page), 'nothing stale filtered the new receipt out').toHaveCount(0)
  await expect(cards(page)).toHaveCount(1)
  await expect(searchField(page)).toHaveValue('')
  await expect(receiptChips(page)).toHaveCount(0)
})

test('receipt library: at zero receipts it says the library is empty, not that every receipt is linked', async ({
  page,
}) => {
  // THE OTHER SENTENCE IS PINNED ALREADY: the `[overlay:add-library]` walk
  // state settles on 'Every receipt in your library is already linked to a
  // transaction.' (harness.ts), with ten receipts in the library. This test is
  // the zero case, which no walk state reaches — and it needs its own browser
  // context, because the emptied store persists across a reload.
  await gotoWithStore(page, '/finance', EMPTIED_RECEIPTS)
  await activateTab(page, TRANSACTIONS_TAB)
  await page.locator('button.mn-list-item:has-text("RM 250.75")').click()
  await page.getByRole('button', { name: 'Add Receipt' }).click()
  await page.getByRole('button', { name: 'Receipt library' }).click()
  await expect(page.locator('.mvp-source-picker__empty')).toHaveText('Your receipt library is empty.')
})

// ────────────────────────────────────────────────────────────────────── goals

async function deleteGoalFromPlans(page: Page): Promise<void> {
  await goalCards(page).first().getByRole('button').click()
  await page.getByRole('button', { name: 'Edit Goals' }).click()
  await page.getByRole('button', { name: 'Delete goal' }).click()
  await page.getByRole('dialog', { name: 'Delete goal?' }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('.mvp-finance-detail__toast')).toContainText('Goal deleted.')
}

async function expectGoalsEmpty(page: Page): Promise<void> {
  await expect(goalCards(page)).toHaveCount(0)
  await expect(page.locator('.mvp-plans__goals')).toHaveCount(0)
  const empty = page.locator('.mvp-plans__section').first().locator('.mvp-empty-state')
  await expect(empty).toHaveCount(1)
  await expect(empty).toHaveText('No savings goalsAdd a goal to start saving towards it.')
  await expect(goalsAddNew(page), 'the writer stays').toHaveCount(1)
  await expect(page.locator('.mvp-plans__commitments > li'), 'Commitments untouched').toHaveCount(
    COMMITMENTS.length,
  )
}

test('goals: deleting both through the UI shows the section empty state, and a reload keeps it', async ({
  page,
}) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'plans', label: 'Plans' })
  await expect(goalCards(page)).toHaveCount(GOALS.length)

  for (let left = GOALS.length; left > 0; left--) {
    await deleteGoalFromPlans(page)
    await expect(goalCards(page)).toHaveCount(left - 1)
  }
  await expectGoalsEmpty(page)

  await storeIdle(page)
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await showTab(page, 'plans')
  await expectGoalsEmpty(page)
})

test('goals: Add New from the emptied section creates one, and the empty state leaves', async ({
  page,
}) => {
  await gotoWithStore(page, '/finance', EMPTIED_GOALS)
  await activateTab(page, { id: 'plans', label: 'Plans' })
  await expectGoalsEmpty(page)

  await goalsAddNew(page).click()
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Goal Name').fill('New Phone')
  await modal.getByLabel('Target Amount (RM)').fill('5000.00')
  await modal.getByLabel('Target date').fill('2026-05-30')
  await page.getByRole('button', { name: 'Save Goal' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await expect(goalCards(page)).toHaveCount(1)
  await expect(page.locator('.mvp-plans .mvp-empty-state')).toHaveCount(0)
})

// ──────────────────────────────────────────────────────────────────── budgets

async function expectBudgetsEmpty(page: Page): Promise<void> {
  await expect(budgetCards(page)).toHaveCount(0)
  const empty = page.locator('.mvp-budget > .mvp-empty-state')
  await expect(empty).toHaveCount(1)
  await expect(empty).toHaveText(
    'No budgetsSet a spending limit for a date range and the categories it covers.',
  )
  await expect(
    page.locator('.mvp-budget > .mn-card-monthly-budget--add-new:last-child'),
    'the DS Add New card stays, last',
  ).toHaveCount(1)
}

test('budgets: deleting both shows the text above the Add New card, and a reload keeps it', async ({
  page,
}) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'budget', label: 'Budget' })
  for (const budget of BUDGETS) {
    await page.getByRole('button', { name: `Details for ${budget.name}` }).click()
    await page.getByRole('link', { name: 'Edit' }).click()
    await page.getByRole('dialog', { name: 'Edit Budget' }).getByRole('button', { name: 'Delete budget' }).click()
    await page.getByRole('dialog', { name: 'Delete budget?' }).getByRole('button', { name: 'Delete' }).click()
    await expect(page).toHaveURL(/\/finance$/)
  }
  await expectBudgetsEmpty(page)

  await storeIdle(page)
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await showTab(page, 'budget')
  await expectBudgetsEmpty(page)
})

test('budgets: Add New from the emptied tab creates one, and the text leaves', async ({ page }) => {
  await gotoWithStore(page, '/finance', EMPTIED_BUDGETS)
  await activateTab(page, { id: 'budget', label: 'Budget' })
  await expectBudgetsEmpty(page)

  await page.getByRole('button', { name: 'Add New Budget' }).click()
  const modal = page.getByRole('dialog', { name: 'Create A Budget' })
  await modal.getByLabel('Name').fill('Groceries')
  await modal.getByRole('combobox', { name: 'Category' }).click()
  const picker = page.getByRole('dialog', { name: 'Select category' })
  await picker.getByRole('option', { name: 'Groceries' }).click()
  await picker.getByRole('button', { name: 'Add 1 Category' }).click()
  await modal.getByLabel('Amount (RM)').fill('800.00')
  await modal.getByLabel('Date (From)').fill('2025-09-01')
  await modal.getByLabel('Date (To)').fill('2025-09-30')
  await modal.getByRole('button', { name: 'Save Budget' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await expect(budgetCards(page)).toHaveCount(1)
  await expect(page.locator('.mvp-budget > .mvp-empty-state')).toHaveCount(0)
})

// ────────────────────────────────────────────────────────────── contributions

async function topUp(page: Page, amount: string): Promise<void> {
  await page.locator('.mvp-finance-detail__actions .mn-btn--primary').click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input[name="amount"]').fill(amount)
  await dialog.getByRole('button', { name: 'Confirm Top-Up' }).click()
  await expect(dialog).toHaveCount(0)
}

const contributions = (page: Page): Locator => page.locator('.mvp-goal-detail__contributions')

test('contributions: a goal with none says so; one Top-Up brings a row, and a reload keeps it', async ({
  page,
}) => {
  await gotoWithStore(page, `/finance/plans/goals/${NEW_GOAL.id}`, WITH_NEW_GOAL)
  await expect(contributions(page).locator('.mvp-empty-state')).toHaveText(
    'No contributions yetTop-ups and auto-save transfers into this goal appear here.',
  )
  await expect(contributions(page).locator('.mvp-goal-detail__rows')).toHaveCount(0)

  await topUp(page, '12.34')
  await expect(contributions(page).locator('.mvp-goal-detail__rows > li')).toHaveCount(1)
  await expect(contributions(page).locator('.mvp-empty-state')).toHaveCount(0)

  await storeIdle(page)
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await expect(contributions(page).locator('.mvp-goal-detail__rows > li')).toHaveCount(1)
  await expect(contributions(page).locator('.mvp-empty-state')).toHaveCount(0)
})

// ─────────────────────────────────────────────────────────────────────── reset

test('Reset data from a fully emptied store restores the seed, and every empty state leaves', async ({
  page,
}) => {
  await gotoWithStore(page, '/finance', ALL_EMPTIED)
  await activateTab(page, RECEIPTS_TAB)
  await expectReceiptsEmpty(page)

  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page).toHaveURL(/\/settings$/)
  await page.locator('.mvp-settings__action .mn-btn').click()
  const confirm = page.getByRole('dialog', { name: 'Reset demo data?' })
  await confirm.locator('.mn-modal__footer .mn-btn--error').click()
  await expect(page.locator('.mvp-notice .mn-toast-mobile')).toHaveText('Demo data restored.')

  // Back through the app's own control, to the tab it came from.
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/finance$/)
  await showTab(page, 'receipts')
  await expect(cards(page)).toHaveCount(RECEIPTS.length)
  await expect(emptyState(page)).toHaveCount(0)
  await showTab(page, 'plans')
  await expect(goalCards(page)).toHaveCount(GOALS.length)
  await expect(page.locator('.mvp-plans .mvp-empty-state')).toHaveCount(0)
  await showTab(page, 'budget')
  await expect(budgetCards(page)).toHaveCount(BUDGETS.length)
  await expect(page.locator('.mvp-budget .mvp-empty-state')).toHaveCount(0)
})

// ─────────────────────────────────────────────────────────────── announcement

test('announcement: deleting the last receipt raises the status toast; the empty state is not a live region and takes no focus', async ({
  page,
}) => {
  await gotoWithStore(page, '/finance', ONE_RECEIPT)
  await activateTab(page, RECEIPTS_TAB)
  await deleteFirstReceipt(page)

  await expect(deleteToast(page)).toHaveText('Receipt deleted.')
  await expect(emptyState(page)).toHaveCount(1)
  const empty = emptyState(page)
  await expect(empty).not.toHaveAttribute('role', /.+/)
  await expect(empty).not.toHaveAttribute('aria-live', /.+/)
  await expect(empty.locator('[role], [aria-live]'), 'nor anything inside it').toHaveCount(0)
  expect(
    await empty.evaluate((el) => el.contains(document.activeElement)),
    'focus is not moved into it',
  ).toBe(false)
})

// ───────────────────────────────────────────────────────────── the harness

test('harness: a store preset is what the FIRST paint shows, and a reload keeps a later write', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const seen = { childBeforeReady: false, firstTitle: null as string | null }
    ;(window as unknown as { __flash: typeof seen }).__flash = seen
    new MutationObserver(() => {
      const root = document.getElementById('root')
      if (root?.firstElementChild && !root.hasAttribute('data-store')) seen.childBeforeReady = true
      const title = document.querySelector('.mn-header-default__title')
      if (title && seen.firstTitle === null) seen.firstTitle = title.textContent
    }).observe(document, { subtree: true, childList: true, characterData: true })
  })
  // A deep link to an id ONLY the preset holds: from the seed it would redirect.
  await gotoWithStore(page, `/finance/plans/goals/${NEW_GOAL.id}`, WITH_NEW_GOAL)
  await expect(page).toHaveURL(new RegExp(`/finance/plans/goals/${NEW_GOAL.id}$`))
  const flash = await page.evaluate(
    () => (window as unknown as { __flash: { childBeforeReady: boolean; firstTitle: string | null } }).__flash,
  )
  expect(flash.childBeforeReady, 'nothing rendered before the store was read').toBe(false)
  expect(flash.firstTitle, 'the first screen painted is the preset goal').toBe(NEW_GOAL.name)

  // A later write survives a reload: the preset is written only on the upgrade.
  await topUp(page, '12.34')
  await storeIdle(page)
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await expect(page.locator('.mn-progress-bar__current')).toContainText('RM 12.34')
})
