import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { activateTab, gotoRoute } from './harness'

import { BUDGETS } from '../src/data/budgets'
import {
  budgetAvailable,
  budgetLegend,
  budgetPercentLeft,
  budgetPeriodLabel,
  budgetSpent,
} from '../src/data/derive'
import { formatMyr, formatSignedMyr } from '../src/data/format'
import { TRANSACTIONS, TRANSACTION_CATEGORIES } from '../src/data/transactions'
import type { Budget, TransactionCategoryId } from '../src/data/types'
import {
  BUDGET_AMOUNT_CAP_SEN,
  budgetDraftErrors,
  draftFromBudget,
  draftToBudgetInput,
  EMPTY_BUDGET_DRAFT,
  isBudgetDraftValid,
  type BudgetDraft,
} from '../src/flows/finance/budgetDraft'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CREATE, EDIT AND DELETE A BUDGET — Gate 71.
 *
 * A NEW FILE, not an extension of `budgets.spec.ts` (the model's pure
 * derivations) or `budget-detail.spec.ts` (the read-only drilldown). These are
 * the WRITERS and the modals that call them, and each test here changes the
 * library — so they sit together, apart from the specs that read a fixed seed.
 *
 * EVERY EXPECTED FIGURE IS COMPUTED HERE FROM `derive.ts` over the seeded
 * ledger, never typed in: the budget a test creates is built as a `Budget`
 * object first, the derivations are run on it, and the screen must print what
 * they return. The budgets the tests invent are invented; the ledger is the
 * seeded fixture, not personal data.
 *
 * No baseline. The modals' pixels are the five Gate 71 walk states in
 * `visual.spec.ts`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MONTHLY = BUDGETS.find((b) => b.id === 'budget-monthly')!
const ENTERTAINMENT = BUDGETS.find((b) => b.id === 'budget-entertainment')!

const label = (id: TransactionCategoryId) => TRANSACTION_CATEGORIES.find((c) => c.id === id)!.label

const availableLabel = (b: Budget) => {
  const a = budgetAvailable(b, TRANSACTIONS)
  return a < 0 ? formatSignedMyr(a) : formatMyr(a)
}

/** A valid draft to mutate one field at a time. */
const VALID: BudgetDraft = {
  name: 'Weekend',
  categories: ['groceries'],
  amount: '250.00',
  from: '2025-09-01',
  to: '2025-09-10',
  autoRenew: false,
}

// ─────────────────────────────────────────────────────────── the rules, pure

test('validation: each rule on its own terms, and the amount cap is RM 999,999.99', () => {
  expect(isBudgetDraftValid(VALID)).toBe(true)
  expect(isBudgetDraftValid(EMPTY_BUDGET_DRAFT)).toBe(false)

  const cases: [string, Partial<BudgetDraft>, keyof ReturnType<typeof budgetDraftErrors> | null][] = [
    ['empty name', { name: '' }, 'name'],
    ['whitespace name', { name: '   ' }, 'name'],
    ['no category', { categories: [] }, 'categories'],
    ['amount 0', { amount: '0' }, 'amount'],
    ['amount 0.00', { amount: '0.00' }, 'amount'],
    ['amount 999,999.99', { amount: '999999.99' }, null],
    ['amount 1,000,000.00', { amount: '1000000.00' }, 'amount'],
    ['three decimals', { amount: '10.123' }, 'amount'],
    ['exponent', { amount: '1e3' }, 'amount'],
    ['empty From', { from: '' }, 'from'],
    ['empty To', { to: '' }, 'to'],
    ['To before From', { from: '2025-09-10', to: '2025-09-09' }, 'to'],
    ['To equal to From', { from: '2025-09-10', to: '2025-09-10' }, null],
  ]
  for (const [name, change, field] of cases) {
    const errors = budgetDraftErrors({ ...VALID, ...change })
    const flagged = Object.entries(errors).filter(([, v]) => v).map(([k]) => k)
    expect(flagged, name).toEqual(field ? [field] : [])
  }
  expect(BUDGET_AMOUNT_CAP_SEN).toBe(99_999_999)
})

test('a draft round-trips a seeded budget, orders categories and trims the name', () => {
  for (const budget of BUDGETS) {
    const { id, ...rest } = budget
    void id
    expect(draftToBudgetInput(draftFromBudget(budget))).toEqual(rest)
  }
  const input = draftToBudgetInput({ ...VALID, name: '  Weekend  ', categories: ['shopping', 'bills'] })
  expect(input.name).toBe('Weekend')
  expect(input.categories).toEqual(['bills', 'shopping'])
  expect(input.limit).toBe(250)
})

// ─────────────────────────────────────────────────────────────── the browser

async function openBudgetTab(page: Page): Promise<void> {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'budget', label: 'Budget' })
}

const dialog = (page: Page, name: string): Locator => page.getByRole('dialog', { name })

async function fillForm(
  modal: Locator,
  values: { name?: string; categories?: TransactionCategoryId[]; amount?: string; from?: string; to?: string },
): Promise<void> {
  if (values.name !== undefined) await modal.getByLabel('Name').fill(values.name)
  if (values.categories) {
    await modal.getByRole('combobox', { name: 'Category' }).click()
    for (const option of await modal.getByRole('option').all()) {
      const name = (await option.textContent())?.trim() ?? ''
      const wanted = values.categories.some((c) => label(c) === name)
      const picked = (await option.getAttribute('aria-selected')) === 'true'
      if (wanted !== picked) await option.click()
    }
    // A press outside the control closes the menu.
    await modal.getByRole('heading').click()
    await expect(modal.getByRole('option')).toHaveCount(0)
  }
  if (values.amount !== undefined) await modal.getByLabel('Amount (RM)').fill(values.amount)
  if (values.from !== undefined) await modal.getByLabel('Date (From)').fill(values.from)
  if (values.to !== undefined) await modal.getByLabel('Date (To)').fill(values.to)
}

async function createBudget(page: Page, budget: Budget): Promise<void> {
  await page.getByRole('button', { name: 'Add New Budget' }).click()
  const modal = dialog(page, 'Create A Budget')
  await expect(modal).toBeVisible()
  await fillForm(modal, {
    name: budget.name,
    categories: budget.categories,
    amount: budget.limit.toFixed(2),
    from: budget.from,
    to: budget.to,
  })
  await modal.getByRole('button', { name: 'Save Budget' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

const budgetCards = (page: Page) =>
  page.locator('.mvp-budget .mn-card-monthly-budget:not(.mn-card-monthly-budget--add-new)')

async function expectCard(card: Locator, budget: Budget): Promise<void> {
  await expect(card.locator('.mn-card-monthly-budget__header-title')).toHaveText(budget.name)
  await expect(card).toContainText(budgetPeriodLabel(budget))
  await expect(card).toContainText(`${budgetPercentLeft(budget, TRANSACTIONS)}%`)
  await expect(card).toContainText(availableLabel(budget))
  await expect(card).toContainText(formatMyr(budget.limit))
  await expect(card).toContainText(formatMyr(budgetSpent(budget, TRANSACTIONS)))
}

/** Every derived figure the drilldown prints, for one budget. */
async function expectDrilldown(page: Page, budget: Budget): Promise<void> {
  await expect(page.locator('.mn-header-default__title')).toHaveText(budget.name)
  await expect(page.locator('.mn-progress-ring__amount')).toHaveText(availableLabel(budget))
  await expect(page.locator('.mn-progress-ring__caption-pct')).toContainText(
    String(budgetPercentLeft(budget, TRANSACTIONS)),
  )
  await expect(page.locator('.mvp-budget-detail__info dd')).toHaveText([
    formatMyr(budget.limit),
    budgetPeriodLabel(budget),
    availableLabel(budget),
    formatMyr(budgetSpent(budget, TRANSACTIONS)),
  ])
  const legend = budgetLegend(budget, TRANSACTIONS)
  await expect(page.locator('.mn-donut__centre-label')).toHaveText(
    formatMyr(budgetSpent(budget, TRANSACTIONS)),
  )
  await expect(page.locator('.mn-donut__segment')).toHaveCount(legend.filter((e) => e.spent > 0).length)
  await expect(page.locator('.mn-chart-legend-item__title')).toHaveText(legend.map((e) => label(e.category)))
  await expect(page.locator('.mn-chart-legend-item__amount')).toHaveText(legend.map((e) => formatMyr(e.spent)))
}

const CREATED: Budget = {
  id: '(assigned by the app)',
  name: 'Weekend Shop',
  categories: ['groceries', 'shopping'],
  limit: 2000,
  from: '2025-09-01',
  to: '2025-09-10',
  autoRenew: false,
}

test('a created budget is appended to the Budget tab, drawn from derive.ts, with no toast', async ({ page }) => {
  // The guard: the invented budget really does spend something in the seed.
  expect(budgetSpent(CREATED, TRANSACTIONS)).toBeGreaterThan(0)

  await openBudgetTab(page)
  await createBudget(page, CREATED)

  const cards = budgetCards(page)
  await expect(cards).toHaveCount(BUDGETS.length + 1)
  await expect(cards.nth(0).locator('.mn-card-monthly-budget__header-title')).toHaveText(MONTHLY.name)
  await expect(cards.nth(1).locator('.mn-card-monthly-budget__header-title')).toHaveText(ENTERTAINMENT.name)
  await expectCard(cards.nth(2), CREATED)
  // The new card is the feedback; no toast.
  await expect(page.locator('.mn-toast-mobile')).toHaveCount(0)
  // Add New is still last.
  await expect(page.locator('.mvp-budget > *').last()).toHaveClass(/mn-card-monthly-budget--add-new/)
})

test('"Details" works on a created budget, and every drilldown figure is derived', async ({ page }) => {
  await openBudgetTab(page)
  await createBudget(page, CREATED)
  await page.getByRole('button', { name: `Details for ${CREATED.name}` }).click()
  await expect(page).toHaveURL(/\/finance\/budget\/budget-[0-9a-f-]{36}$/)
  await expectDrilldown(page, CREATED)
})

test('a one-category created budget draws a RING WITH A HOLE, by computed fill and hit-test', async ({
  page,
}) => {
  const single: Budget = {
    ...CREATED,
    name: 'Pharmacy',
    categories: ['healthcare'],
    limit: 100,
    from: '2025-08-30',
    to: '2025-09-20',
  }
  expect(budgetLegend(single, TRANSACTIONS).filter((e) => e.spent > 0)).toHaveLength(1)

  await openBudgetTab(page)
  await createBudget(page, single)
  await page.getByRole('button', { name: `Details for ${single.name}` }).click()
  await expectDrilldown(page, single)

  const ring = page.locator('circle.mn-donut__segment')
  await expect(ring).toHaveCount(1)
  const probe = await page.evaluate(() => {
    const circle = document.querySelector('circle.mn-donut__segment') as SVGCircleElement
    const style = getComputedStyle(circle)
    const swatch = document.createElement('span')
    swatch.style.color = 'var(--brand-cyan-500)'
    document.body.appendChild(swatch)
    const cyan500 = getComputedStyle(swatch).color
    swatch.remove()
    // A point INSIDE the hole and clear of the centre label: 45px below the
    // centre, where the hole's radius is ~65px at the 200px box.
    const box = (document.querySelector('.mn-donut') as HTMLElement).getBoundingClientRect()
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2 + 45)
    return { fill: style.fill, stroke: style.stroke, cyan500, hitIsCircle: hit === circle }
  })
  expect(probe.fill).toBe('none')
  expect(probe.stroke).toBe(probe.cyan500)
  expect(probe.hitIsCircle).toBe(false)
})

test('Edit re-derives every figure — ring, info rows, donut and legend — and stays on the drilldown', async ({
  page,
}) => {
  const edited: Budget = {
    ...MONTHLY,
    name: 'Monthly Essentials',
    categories: ['bills', 'groceries', 'healthcare'],
    limit: 1500,
    from: '2025-09-01',
    to: '2025-09-15',
  }
  await gotoRoute(page, `/finance/budget/${MONTHLY.id}`, 'light')
  await page.getByRole('link', { name: 'Edit' }).click()
  const modal = dialog(page, 'Edit Budget')
  // Pre-filled from the stored budget.
  await expect(modal.getByLabel('Name')).toHaveValue(MONTHLY.name)
  await expect(modal.getByLabel('Amount (RM)')).toHaveValue(MONTHLY.limit.toFixed(2))
  await expect(modal.getByLabel('Date (From)')).toHaveValue(MONTHLY.from)
  await expect(modal.getByLabel('Date (To)')).toHaveValue(MONTHLY.to)
  const save = modal.getByRole('button', { name: 'Save Changes' })
  // Save Changes is disabled until something changes.
  await expect(save).toBeDisabled()

  await fillForm(modal, {
    name: edited.name,
    categories: edited.categories,
    amount: edited.limit.toFixed(2),
    from: edited.from,
    to: edited.to,
  })
  await save.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(new RegExp(`/finance/budget/${MONTHLY.id}$`))
  await expectDrilldown(page, edited)
})

test('✕, Cancel and Escape each discard an unsaved edit', async ({ page }) => {
  await gotoRoute(page, `/finance/budget/${MONTHLY.id}`, 'light')
  for (const dismiss of ['Close', 'Cancel', 'Escape'] as const) {
    await page.getByRole('link', { name: 'Edit' }).click()
    const modal = dialog(page, 'Edit Budget')
    await modal.getByLabel('Name').fill('Discarded')
    if (dismiss === 'Escape') await page.keyboard.press('Escape')
    else await modal.getByRole('button', { name: dismiss }).click()
    await expect(page.getByRole('dialog'), dismiss).toHaveCount(0)
    await expect(page.locator('.mn-header-default__title'), dismiss).toHaveText(MONTHLY.name)
  }
  await page.getByRole('link', { name: 'Edit' }).click()
  await expect(dialog(page, 'Edit Budget').getByLabel('Name')).toHaveValue(MONTHLY.name)
})

test('Delete asks first; Cancel returns to Edit; Delete lands on the Budget tab with a toast, and Back never reaches the dead route', async ({
  page,
}) => {
  await openBudgetTab(page)
  await page.getByRole('button', { name: `Details for ${MONTHLY.name}` }).click()
  await page.getByRole('link', { name: 'Edit' }).click()
  const edit = dialog(page, 'Edit Budget')
  await edit.getByRole('button', { name: 'Delete budget' }).click()

  const confirm = dialog(page, 'Delete budget?')
  await expect(confirm).toContainText(
    `This removes '${MONTHLY.name}' and its settings. Your transactions aren't affected. This can't be undone.`,
  )
  // It stacks: two dialogs, Edit beneath.
  await expect(page.getByRole('dialog')).toHaveCount(2)
  await confirm.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(edit).toBeVisible()

  await edit.getByRole('button', { name: 'Delete budget' }).click()
  await dialog(page, 'Delete budget?').getByRole('button', { name: 'Delete' }).click()

  await expect(page).toHaveURL(/\/finance$/)
  await expect(page.locator('#tab-budget')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.mn-toast-mobile')).toContainText('Budget deleted')
  await expect(budgetCards(page)).toHaveCount(BUDGETS.length - 1)
  await expect(page.getByRole('button', { name: `Details for ${MONTHLY.name}` })).toHaveCount(0)
  // The transactions are not affected.
  // (The ledger is not a budget; nothing in this app writes it on delete.)

  // Back: the drilldown entry was REPLACED, so Back goes to what preceded it.
  await page.goBack()
  await expect(page).not.toHaveURL(new RegExp(`/finance/budget/${MONTHLY.id}$`))

  // And if the dead URL is reached anyway, in-app, the unknown-id redirect is the backstop.
  await page.evaluate((id) => {
    history.pushState({}, '', `/finance/budget/${id}`)
    dispatchEvent(new PopStateEvent('popstate'))
  }, MONTHLY.id)
  await expect(page).toHaveURL(/\/finance$/)
  await expect(page.locator('#tab-budget')).toHaveAttribute('aria-selected', 'true')
})

test('deleting every budget leaves only the Add New card, and a reload restores the seed', async ({
  page,
}) => {
  await openBudgetTab(page)
  for (const budget of BUDGETS) {
    await page.getByRole('button', { name: `Details for ${budget.name}` }).click()
    await page.getByRole('link', { name: 'Edit' }).click()
    await dialog(page, 'Edit Budget').getByRole('button', { name: 'Delete budget' }).click()
    await dialog(page, 'Delete budget?').getByRole('button', { name: 'Delete' }).click()
    await expect(page).toHaveURL(/\/finance$/)
  }
  await expect(budgetCards(page)).toHaveCount(0)
  await expect(page.locator('.mvp-budget > *')).toHaveCount(1)
  await expect(page.locator('.mn-card-monthly-budget--add-new')).toHaveCount(1)

  // NP1: nothing is persisted.
  await page.reload()
  // The history entry still carries `{ financeTab: 'budget' }` (Gate 69's
  // handoff survives a reload), so the Budget tab is already selected.
  await expect(page.locator('#tab-budget')).toHaveAttribute('aria-selected', 'true')
  await expect(budgetCards(page)).toHaveCount(BUDGETS.length)
  await expect(page.locator('.mn-toast-mobile')).toHaveCount(0)
  for (const [i, budget] of BUDGETS.entries()) await expectCard(budgetCards(page).nth(i), budget)
})

test('the form validates in the browser: Save stays disabled and the offending field is invalid', async ({
  page,
}) => {
  await openBudgetTab(page)
  await page.getByRole('button', { name: 'Add New Budget' }).click()
  const modal = dialog(page, 'Create A Budget')
  const save = modal.getByRole('button', { name: 'Save Budget' })
  await expect(save).toBeDisabled()

  await fillForm(modal, {
    name: VALID.name,
    categories: VALID.categories,
    amount: VALID.amount,
    from: VALID.from,
    to: VALID.to,
  })
  await expect(save).toBeEnabled()

  const invalid = (field: string) => modal.getByLabel(field)
  const check = async (field: string, bad: string, good: string) => {
    await invalid(field).fill(bad)
    await expect(save, `${field}=${bad}`).toBeDisabled()
    await expect(invalid(field), `${field}=${bad}`).toHaveAttribute('aria-invalid', 'true')
    await invalid(field).fill(good)
    await expect(save).toBeEnabled()
    await expect(invalid(field)).not.toHaveAttribute('aria-invalid', 'true')
  }
  await check('Name', '', VALID.name)
  await check('Amount (RM)', '0', VALID.amount)
  await check('Amount (RM)', '1000000.00', '999999.99')
  await check('Amount (RM)', '10.123', VALID.amount)
  await check('Date (To)', '2025-08-31', VALID.to)

  // No category.
  await fillForm(modal, { categories: [] })
  await expect(save).toBeDisabled()
  await expect(modal.getByRole('combobox', { name: 'Category' })).toHaveAttribute('aria-invalid', 'true')
})

test('the open modal covers the FAB (A9) — z-index 100 against 3, and the hit-test agrees', async ({
  page,
}) => {
  await openBudgetTab(page)
  await page.getByRole('button', { name: 'Add New Budget' }).click()
  await expect(dialog(page, 'Create A Budget')).toBeVisible()
  const probe = await page.evaluate(() => {
    const fab = document.querySelector('.mvp-shell__fab') as HTMLElement
    const r = fab.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return {
      fabZ: getComputedStyle(fab).zIndex,
      modalZ: getComputedStyle(document.querySelector('.mn-modal')!).zIndex,
      hitInsideFab: fab.contains(hit),
    }
  })
  expect(probe).toEqual({ fabZ: '3', modalZ: '100', hitInsideFab: false })
})

test('red deletes (1A): "Delete budget", both confirmations\' Delete, and "Delete receipt" carry tone="error"', async ({
  page,
}) => {
  await gotoRoute(page, `/finance/budget/${MONTHLY.id}`, 'light')
  await page.getByRole('link', { name: 'Edit' }).click()
  const deleteBudget = dialog(page, 'Edit Budget').getByRole('button', { name: 'Delete budget' })
  await expect(deleteBudget).toHaveClass(/\bmn-btn--tertiary\b.*\bmn-btn--error\b/)
  await deleteBudget.click()
  await expect(dialog(page, 'Delete budget?').getByRole('button', { name: 'Delete' })).toHaveClass(
    /\bmn-btn--error\b/,
  )
  await expect(dialog(page, 'Delete budget?').getByRole('button', { name: 'Cancel' })).toHaveClass(
    /\bmn-btn--secondary\b/,
  )

  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'receipts', label: 'Receipts' })
  await page.locator('.mvp-receipt-card').first().click()
  const deleteReceipt = page.getByRole('button', { name: 'Delete receipt' })
  await expect(deleteReceipt).toHaveClass(/\bmn-btn--tertiary\b.*\bmn-btn--error\b/)
  await deleteReceipt.click()
  await expect(dialog(page, 'Delete receipt?').getByRole('button', { name: 'Delete' })).toHaveClass(
    /\bmn-btn--error\b/,
  )
})
