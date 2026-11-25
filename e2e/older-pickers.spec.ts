import { expect, test, type Locator, type Page } from '@playwright/test'

import { gotoRoute } from './harness'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * THE OLDER PICKERS HOLD STILL, FOCUS RETURNS, AND G32's BACK BUTTON — Gate 113.
 *
 * NO BASELINE. Four walk states photograph the picker views (`create-category`,
 * `merchant`, `add-goal-source`, the receipt viewer's `view-*`); everything here
 * is a RELATION a single screenshot cannot state — "the card did not move
 * between views", "focus came back", "the list scrolls inside the held box".
 *
 *  R4  the Budget form's Category picker keeps the form view's box (Create and
 *      Edit), and "Add N Categories" sits exactly where "Save Budget" sat
 *      (R112-2). The list is out of flow and scrolls inside that box.
 *  R5  the filter sheet's Merchant view keeps the filters view's height
 *      (R112-3); its 23-row list scrolls inside.
 *  R6  focus moves into a picker on open and back to its trigger on Back and on
 *      a commit, pointer-aware (Gate 89-B), and holds (R92-24's window).
 *  G32 the receipt viewer's sub-views use `Modal`'s own back control.
 *
 * THE RELOAD RULE: every test stays on one page and uses the app's own controls.
 * ═════════════════════════════════════════════════════════════════════════════
 */

const box = async (locator: Locator) => {
  const b = await locator.boundingBox()
  if (!b) throw new Error('element has no box')
  return b
}
const near = (a: number, b: number, message: string) =>
  expect(Math.abs(a - b), `${message}: ${a} vs ${b}`).toBeLessThanOrEqual(1)
const focusVisible = (l: Locator) => l.evaluate((e) => e.matches(':focus-visible'))

/** Press `key` until `target` has focus — the keyboard's own route to it. */
async function keyTo(page: Page, target: Locator, key = 'Tab'): Promise<void> {
  for (let i = 0; i < 25; i++) {
    if (await target.evaluate((e) => e === document.activeElement)) return
    await page.keyboard.press(key)
  }
  throw new Error(`${key} never reached the control`)
}

/**
 * R92-24's HOLD WINDOW. `toBeFocused` returns the moment focus lands, so a later
 * loss would be invisible; a `focusout` counter over 400 ms is what catches it.
 */
async function holdsFocus(page: Page, target: Locator, message: string): Promise<void> {
  await expect(target, `${message}: focus landed`).toBeFocused()
  await target.evaluate((e) => {
    ;(window as unknown as { __losses: number }).__losses = 0
    e.addEventListener('focusout', () => {
      ;(window as unknown as { __losses: number }).__losses++
    })
  })
  await page.waitForTimeout(400)
  expect(
    await page.evaluate(() => (window as unknown as { __losses: number }).__losses),
    `${message}: focus held for 400 ms`,
  ).toBe(0)
  await expect(target, `${message}: still focused after the window`).toBeFocused()
}

const card = (page: Page) => page.locator('.mn-modal__card')
const header = (page: Page) => page.locator('.mn-overlay-header')
const dialog = (page: Page, name: string) => page.getByRole('dialog', { name })

/* ─────────────────────────────── the Budget form ─────────────────────────── */

type BudgetMode = 'create' | 'edit'
const BUDGET_TITLE = { create: 'Create A Budget', edit: 'Edit Budget' } as const
const BUDGET_SAVE = { create: 'Save Budget', edit: 'Save Changes' } as const
const budgetTrigger = (page: Page) => page.locator('.mvp-budget-form .mn-select__input')
const budgetCommit = (page: Page) => page.locator('.mvp-budget-footer__commit .mn-btn')

async function openBudget(page: Page, mode: BudgetMode): Promise<void> {
  if (mode === 'create') {
    await gotoRoute(page, '/finance', 'light')
    await page.getByRole('tab', { name: 'Budget' }).click()
    await page.getByRole('button', { name: 'Add New Budget' }).click()
  } else {
    await gotoRoute(page, '/finance/budget/budget-monthly', 'light')
    await page.getByRole('link', { name: 'Edit' }).click()
  }
  await expect(dialog(page, BUDGET_TITLE[mode])).toBeVisible()
}

async function openBudgetPicker(page: Page): Promise<void> {
  await budgetTrigger(page).click()
  await expect(dialog(page, 'Select category')).toBeVisible()
  await expect(page.locator('[role="option"]').first()).toBeVisible()
}

for (const width of [375, 430]) {
  test(`R4 the Category picker keeps the form's box, its header, and Save's slot [${width}]`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 812 })
    for (const mode of ['create', 'edit'] as const) {
      await openBudget(page, mode)
      const formCard = await box(card(page))
      const formHeader = await box(header(page))
      const save = await box(page.getByRole('button', { name: BUDGET_SAVE[mode] }))
      /*
        THE FORM WITH ITS TRIGGER FOCUSED, which is where Back leaves it (R6). The
        DS `Select` draws its focused state with a 2px border and no padding
        compensation (`Select.css:120-125`), so a focused, unselected trigger is
        2px taller than a resting one — register 2bc. Measured here so the
        after-Back comparison attributes that delta to the DS state.
      */
      await budgetTrigger(page).focus()
      const focusedCard = await box(card(page))
      expect(focusedCard.height - formCard.height, `${mode}: the DS focus border's growth`).toBeLessThanOrEqual(2)

      await openBudgetPicker(page)
      const pickerCard = await box(card(page))
      const pickerHeader = await box(header(page))

      near(pickerCard.height, formCard.height, `${mode}: card height`)
      near(pickerCard.y, formCard.y, `${mode}: card top`)
      near(pickerCard.x, formCard.x, `${mode}: card left`)
      near(pickerCard.width, formCard.width, `${mode}: card width`)
      near(pickerHeader.y, formHeader.y, `${mode}: header top`)
      near(pickerHeader.height, formHeader.height, `${mode}: header height`)
      const title = await box(page.locator('.mn-overlay-header__title'))
      near(title.x + title.width / 2, pickerHeader.x + pickerHeader.width / 2, `${mode}: title centre`)
      const back = await box(page.getByRole('button', { name: 'Back to the budget form' }))
      const close = await box(page.getByRole('button', { name: 'Close' }))
      expect(back.x + back.width, `${mode}: back is left of the title`).toBeLessThanOrEqual(title.x)
      expect(close.x, `${mode}: close is right of the title`).toBeGreaterThanOrEqual(title.x + title.width)

      // R112-2: THE COMMIT SITS EXACTLY WHERE THE FORM'S PRIMARY SAT.
      const commit = await box(budgetCommit(page))
      near(commit.x, save.x, `${mode}: Add N Categories left vs Save`)
      near(commit.y, save.y, `${mode}: Add N Categories top vs Save`)
      near(commit.width, save.width, `${mode}: Add N Categories width vs Save`)
      near(commit.height, save.height, `${mode}: Add N Categories height vs Save`)

      await page.getByRole('button', { name: 'Back to the budget form' }).click()
      await expect(dialog(page, BUDGET_TITLE[mode])).toBeVisible()
      const again = await box(card(page))
      near(again.height, focusedCard.height, `${mode}: card height after Back (trigger focused)`)
      near(again.y, focusedCard.y, `${mode}: card top after Back (trigger focused)`)
    }
  })
}

test('R4 the category list scrolls inside the held box, and its last row is reachable', async ({ page }) => {
  await openBudget(page, 'create')
  await openBudgetPicker(page)
  const pane = page.locator('.mvp-budget-views__pane--list')
  const [scrollHeight, clientHeight] = await pane.evaluate((e) => [e.scrollHeight, e.clientHeight])
  expect(scrollHeight, 'the list is taller than the held box, so it scrolls').toBeGreaterThan(clientHeight)
  await expect(pane).toHaveCSS('overflow-y', 'auto')

  // THE KEYBOARD'S END KEY reaches the last row and the pane scrolls to show it.
  await page.keyboard.press('End')
  const last = page.locator('[role="option"]').last()
  await expect(last).toBeFocused()
  const paneBox = await box(pane)
  const lastBox = await box(last)
  expect(lastBox.y + lastBox.height, 'the last row is inside the held box').toBeLessThanOrEqual(
    paneBox.y + paneBox.height + 1,
  )
  await last.click()
  await expect(last).toHaveAttribute('aria-selected', 'true')
})

test('R4 the form held behind the picker is unreachable — Create and Edit', async ({ page }) => {
  for (const mode of ['create', 'edit'] as const) {
    await openBudget(page, mode)
    await openBudgetPicker(page)
    const picker = dialog(page, 'Select category')
    await expect(picker.getByRole('textbox', { name: 'Name' })).toHaveCount(0)
    await expect(picker.getByRole('spinbutton', { name: 'Amount (RM)' })).toHaveCount(0)
    await expect(picker.getByRole('button', { name: BUDGET_SAVE[mode] })).toHaveCount(0)
    await expect(picker.getByRole('button', { name: 'Cancel' })).toHaveCount(0)
    await expect(picker.getByRole('button', { name: 'Delete budget' })).toHaveCount(0)
    for (const sel of [
      '.mvp-budget-views__pane--form[data-held="true"]',
      '.mvp-budget-footer__actions[data-held="true"]',
    ]) {
      const held = page.locator(sel)
      await expect(held, sel).toHaveCount(1)
      await expect(held, sel).toHaveAttribute('inert', '')
      await expect(held, sel).toHaveAttribute('aria-hidden', 'true')
      await expect(held, sel).toHaveCSS('visibility', 'hidden')
    }
    const strayStops: string[] = []
    for (const key of ['Tab', 'Shift+Tab']) {
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press(key)
        const stray = await page.evaluate(() =>
          document.activeElement?.closest('[data-held="true"]')
            ? (document.activeElement?.getAttribute('aria-label') ??
              document.activeElement?.textContent?.trim().slice(0, 16) ??
              '?')
            : null,
        )
        if (stray) strayStops.push(`${mode} ${key} #${i + 1} -> ${stray}`)
      }
    }
    expect(strayStops, 'no Tab stop lands in the held form or its footer').toEqual([])
  }
})

test('R4 the draft survives Back, and opening the picker does not mark Category touched', async ({ page }) => {
  await openBudget(page, 'create')
  const form = dialog(page, 'Create A Budget')
  await form.getByLabel('Name').fill('Held draft')
  await form.getByLabel('Amount (RM)').fill('640.25')
  await form.getByLabel('Date (From)').fill('2026-09-01')
  await form.getByLabel('Date (To)').fill('2026-09-30')

  await openBudgetPicker(page)
  await page.locator('[role="option"]').filter({ hasText: 'Groceries' }).click()
  await page.getByRole('button', { name: 'Back to the budget form' }).click()

  await expect(form.getByLabel('Name')).toHaveValue('Held draft')
  await expect(form.getByLabel('Amount (RM)')).toHaveValue('640.25')
  await expect(form.getByLabel('Date (From)')).toHaveValue('2026-09-01')
  await expect(form.getByLabel('Date (To)')).toHaveValue('2026-09-30')
  // BACK DISCARDS THE PICKER DRAFT (Gate 74-B), so Category is still empty...
  await expect(budgetTrigger(page)).toHaveValue('')
  // ...AND IT IS NOT RED: opening the field's own picker is not leaving it.
  await expect(page.locator('.mvp-budget-form__category .mn-select')).not.toHaveClass(/mn-select--invalid/)
  await expect(budgetTrigger(page)).not.toHaveAttribute('aria-invalid', 'true')
})

test('R4 "Add N Categories" is disabled at zero and commits at one or more', async ({ page }) => {
  await openBudget(page, 'create')
  await openBudgetPicker(page)
  await expect(budgetCommit(page)).toHaveText('Add 0 Categories')
  await expect(budgetCommit(page)).toBeDisabled()
  await page.locator('[role="option"]').filter({ hasText: 'Dining & Leisure' }).click()
  await expect(budgetCommit(page)).toHaveText('Add 1 Category')
  await expect(budgetCommit(page)).toBeEnabled()
  await page.locator('[role="option"]').filter({ hasText: 'Shopping' }).click()
  await expect(budgetCommit(page)).toHaveText('Add 2 Categories')
  await budgetCommit(page).click()
  await expect(dialog(page, 'Create A Budget')).toBeVisible()
  await expect(budgetTrigger(page)).toHaveValue('Dining & Leisure, Shopping')
})

/* ──────────────────────────── the Merchant picker ────────────────────────── */

const merchantTrigger = (page: Page) => page.locator('.mvp-txn-filter .mn-select__input')
const panel = (page: Page) => page.locator('.mn-sheet__panel')

async function openFilter(page: Page): Promise<void> {
  await gotoRoute(page, '/finance', 'light')
  await page.getByRole('tab', { name: 'Transactions' }).click()
  await page.locator('.mvp-transactions__filter-btn').click()
  await expect(dialog(page, 'Filter transactions')).toBeVisible()
}

async function openMerchant(page: Page): Promise<void> {
  await merchantTrigger(page).click()
  await expect(dialog(page, 'Select merchant')).toBeVisible()
  await expect(page.locator('[role="option"]').first()).toBeVisible()
}

for (const width of [375, 430]) {
  test(`R5 the Merchant view keeps the filters view's height and header [${width}]`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await openFilter(page)
    const filters = await box(panel(page))
    const filtersHeader = await box(header(page))
    // The sheet with its trigger focused — where Back leaves it (see R4's note).
    await merchantTrigger(page).focus()
    const focused = await box(panel(page))
    expect(focused.height - filters.height, 'the DS focus border\'s growth').toBeLessThanOrEqual(2)
    await openMerchant(page)
    const merchant = await box(panel(page))
    const merchantHeader = await box(header(page))
    near(merchant.height, filters.height, 'panel height')
    near(merchant.y, filters.y, 'panel top')
    near(merchantHeader.y, filtersHeader.y, 'header top')
    near(merchantHeader.height, filtersHeader.height, 'header height')
    const title = await box(page.locator('.mn-overlay-header__title'))
    near(title.x + title.width / 2, merchantHeader.x + merchantHeader.width / 2, 'title centre')
    const back = await box(page.getByRole('button', { name: 'Back to filters' }))
    expect(back.x + back.width, 'back is left of the title').toBeLessThanOrEqual(title.x)

    await page.getByRole('button', { name: 'Back to filters' }).click()
    await expect(dialog(page, 'Filter transactions')).toBeVisible()
    near((await box(panel(page))).y, focused.y, 'panel top after Back (trigger focused)')
  })
}

test('R5 the merchant list scrolls inside the held box, and the last merchant is reachable', async ({
  page,
}) => {
  await openFilter(page)
  await openMerchant(page)
  const pane = page.locator('.mvp-txn-filter-views__pane--list')
  const [scrollHeight, clientHeight] = await pane.evaluate((e) => [e.scrollHeight, e.clientHeight])
  expect(scrollHeight, 'the list is taller than the held box, so it scrolls').toBeGreaterThan(clientHeight)
  await expect(pane).toHaveCSS('overflow-y', 'auto')

  await page.keyboard.press('End')
  const last = page.locator('[role="option"]').last()
  await expect(last).toBeFocused()
  const paneBox = await box(pane)
  const lastBox = await box(last)
  expect(lastBox.y + lastBox.height, 'the last merchant is inside the held box').toBeLessThanOrEqual(
    paneBox.y + paneBox.height + 1,
  )
  await last.click()
  await expect(last).toHaveAttribute('aria-selected', 'true')
})

test('R5 the held filters view is unreachable, and the selection survives Back', async ({ page }) => {
  await openFilter(page)
  await openMerchant(page)
  const picker = dialog(page, 'Select merchant')
  await expect(picker.getByRole('button', { name: /^Apply Filter/ })).toHaveCount(0)
  await expect(picker.getByRole('button', { name: 'Reset' })).toHaveCount(0)
  await expect(picker.getByRole('button', { name: 'This Month' })).toHaveCount(0)
  for (const sel of [
    '.mvp-txn-filter-views__pane--filters[data-held="true"]',
    '.mvp-txn-filter__actions[data-held="true"]',
  ]) {
    const held = page.locator(sel)
    await expect(held, sel).toHaveCount(1)
    await expect(held, sel).toHaveAttribute('inert', '')
    await expect(held, sel).toHaveAttribute('aria-hidden', 'true')
    await expect(held, sel).toHaveCSS('visibility', 'hidden')
  }

  await page.locator('[role="option"]').filter({ hasText: 'IKEA' }).click()
  await page.getByRole('button', { name: 'Back to filters' }).click()
  await expect(merchantTrigger(page)).toHaveValue('IKEA')
  await openMerchant(page)
  await expect(page.locator('[role="option"]').filter({ hasText: 'IKEA' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

/* ───────────────────────────── R6: focus, per picker ─────────────────────── */

type Picker = {
  name: string
  open: (page: Page) => Promise<void>
  trigger: (page: Page) => Locator
  openPicker: (page: Page) => Promise<void>
  back: string
  /** The option that should hold focus as the picker opens. */
  firstFocus: string
}

const PICKERS: Picker[] = [
  {
    name: 'Budget Create',
    open: (page) => openBudget(page, 'create'),
    trigger: budgetTrigger,
    openPicker: openBudgetPicker,
    back: 'Back to the budget form',
    firstFocus: 'Bills & Utilities', // nothing selected -> the first option
  },
  {
    name: 'Budget Edit',
    open: (page) => openBudget(page, 'edit'),
    trigger: budgetTrigger,
    openPicker: openBudgetPicker,
    back: 'Back to the budget form',
    firstFocus: 'Bills & Utilities', // the first selected option
  },
  {
    name: 'Merchant',
    open: openFilter,
    trigger: merchantTrigger,
    openPicker: openMerchant,
    back: 'Back to filters',
    firstFocus: 'All merchants', // the cleared state's own row is selected
  },
  {
    name: 'Goal Funding Source',
    open: async (page) => {
      await gotoRoute(page, '/finance/plans/goals/goal-bali-trip', 'light')
      await page.getByRole('button', { name: 'Edit Goals' }).click()
      await expect(dialog(page, 'Edit Goal')).toBeVisible()
    },
    trigger: (page) => page.locator('.mvp-goal-form__source .mn-select__input'),
    openPicker: async (page) => {
      await page.locator('.mvp-goal-form__source .mn-select').click()
      await expect(dialog(page, 'Select funding source')).toBeVisible()
    },
    back: 'Back to the goal form',
    firstFocus: 'Main',
  },
]

for (const p of PICKERS) {
  test(`R6 ${p.name}: opening moves focus to the selected option, with no ring`, async ({ page }) => {
    await p.open(page)
    await p.openPicker(page)
    const first = page.locator('[role="option"]').filter({ hasText: p.firstFocus }).first()
    await expect(first).toBeFocused()
    expect(await focusVisible(first), 'a pointer open paints no ring on the option').toBe(false)
  })

  test(`R6 ${p.name}: keyboard Back returns focus to the trigger with a ring, and it holds`, async ({
    page,
  }) => {
    await p.open(page)
    await p.openPicker(page)
    await keyTo(page, page.getByRole('button', { name: p.back }), 'Shift+Tab')
    await page.keyboard.press('Enter')
    await holdsFocus(page, p.trigger(page), `${p.name} keyboard Back`)
    expect(await focusVisible(p.trigger(page)), 'Back by keyboard rings the trigger').toBe(true)
  })

  test(`R6 ${p.name}: pointer Back returns focus to the trigger with no ring, and it holds`, async ({
    page,
  }) => {
    await p.open(page)
    await p.openPicker(page)
    /*
      THE KEYBOARD FIRST, AND THAT IS THE POINT (Gate 89-B): with an option
      keyboard-focused, Chromium carries `:focus-visible` through a script focus
      unless `focusVisible: false` withholds it. A pointer-only round trip is
      checked after it.
    */
    await page.keyboard.press('ArrowDown')
    expect(
      await page.evaluate(() => document.activeElement?.matches(':focus-visible')),
      'precondition: the option shows a ring',
    ).toBe(true)
    await page.getByRole('button', { name: p.back }).click()
    await holdsFocus(page, p.trigger(page), `${p.name} pointer Back`)
    expect(await focusVisible(p.trigger(page)), 'Back by pointer paints no ring').toBe(false)

    await p.openPicker(page)
    await page.getByRole('button', { name: p.back }).click()
    await expect(p.trigger(page)).toBeFocused()
    expect(await focusVisible(p.trigger(page)), 'a pointer-only round trip paints no ring').toBe(false)
  })
}

test('R6 Budget: a commit returns focus to the trigger — no ring by pointer, a ring by keyboard', async ({
  page,
}) => {
  await openBudget(page, 'create')
  await openBudgetPicker(page)
  await page.keyboard.press('Space') // tick the focused first option by keyboard
  await expect(budgetCommit(page)).toHaveText('Add 1 Category')
  await budgetCommit(page).click()
  await holdsFocus(page, budgetTrigger(page), 'pointer commit')
  expect(await focusVisible(budgetTrigger(page)), 'a pointer commit paints no ring').toBe(false)
  await expect(budgetTrigger(page)).toHaveValue('Bills & Utilities')

  await openBudgetPicker(page)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Space')
  await keyTo(page, budgetCommit(page))
  await page.keyboard.press('Enter')
  await holdsFocus(page, budgetTrigger(page), 'keyboard commit')
  expect(await focusVisible(budgetTrigger(page)), 'a keyboard commit rings the trigger').toBe(true)
  await expect(budgetTrigger(page)).toHaveValue('Bills & Utilities, Groceries')
})

test('R6 Goal: a pick returns focus to the trigger — no ring by pointer, a ring by keyboard', async ({
  page,
}) => {
  const goal = PICKERS[3]!
  await goal.open(page)
  await goal.openPicker(page)
  await page.keyboard.press('ArrowDown') // keyboard-focus Joint, then pick it by pointer
  await page.locator('[role="option"]').filter({ hasText: 'Joint Account' }).click()
  await holdsFocus(page, goal.trigger(page), 'pointer pick')
  expect(await focusVisible(goal.trigger(page)), 'a pointer pick paints no ring').toBe(false)
  await expect(goal.trigger(page)).toHaveValue('Joint Account')

  await goal.openPicker(page)
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await holdsFocus(page, goal.trigger(page), 'keyboard pick')
  expect(await focusVisible(goal.trigger(page)), 'a keyboard pick rings the trigger').toBe(true)
  await expect(goal.trigger(page)).toHaveValue('Main')
})

/* ──────────────────────── G32: the receipt viewer's back ─────────────────── */

const RECEIPT = 'IMG_4806.jpg'

async function openViewer(page: Page): Promise<void> {
  await gotoRoute(page, '/finance', 'light')
  await page.getByRole('tab', { name: 'Receipts' }).click()
  await page.locator(`.mvp-receipt-card:has-text("${RECEIPT}")`).click()
  await expect(dialog(page, RECEIPT)).toBeVisible()
}

const SUB_VIEWS: { name: string; title: string; enter: (page: Page) => Promise<void> }[] = [
  {
    name: 'the link picker',
    title: 'Link to transaction',
    enter: async (page) => {
      await page.locator('.mn-modal__footer .mn-btn:has-text("Unlink receipt")').click()
      await page.locator('.mn-modal__footer .mn-btn:has-text("Link to transaction")').click()
    },
  },
  {
    name: 'the editor',
    title: 'Edit receipt',
    enter: (page) => page.locator('.mvp-receipt-details .mn-link').click(),
  },
]

for (const v of SUB_VIEWS) {
  test(`G32 ${v.name}: the back control is Modal's own — flush left, neutral, named — and returns to the viewer`, async ({
    page,
  }) => {
    await openViewer(page)
    const viewerHeader = await box(header(page))
    await v.enter(page)
    await expect(dialog(page, v.title)).toBeVisible()

    const back = page.getByRole('button', { name: 'Back to receipt' })
    await expect(back).toHaveCount(1)
    // THE DS's OWN CONTROL, IN THE LEADING TRACK — not a button in the title group.
    await expect(page.locator('.mn-overlay-header__side--start .mn-overlay-header__control')).toHaveAccessibleName(
      'Back to receipt',
    )
    await expect(page.locator('.mn-overlay-header__title-group button')).toHaveCount(0)

    const h = await box(header(page))
    const b = await box(back)
    near(b.x, h.x + 16, 'flush left, on the header inset')
    near(h.height, viewerHeader.height, 'the header is the viewer header\'s height')
    // NEUTRAL, the close control's own colour — not the primary blue.
    const close = page.getByRole('button', { name: 'Close' })
    expect(await back.evaluate((e) => getComputedStyle(e).color)).toBe(
      await close.evaluate((e) => getComputedStyle(e).color),
    )

    await back.click()
    await expect(dialog(page, RECEIPT)).toBeVisible()
  })
}
