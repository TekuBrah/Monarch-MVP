import { expect, test, type Locator, type Page } from '@playwright/test'

import { FIAT_ACCOUNTS } from '../src/data/accounts'
import { gotoRoute } from './harness'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * THE GOAL MODAL'S TWO VIEWS HOLD ONE HEIGHT — Gate 81-C.
 *
 * NO BASELINE. The Add picker view is photographed by `[overlay:add-goal-source]`;
 * everything here is a GEOMETRY or a STRUCTURE the screenshot cannot state:
 * "the card did not move between views" is a relation between two captures, and
 * the Edit picker view has no walk state at all.
 *
 * THE RULING (Teku, 7 Oct 2026, from device): the Funding Source picker is a
 * VIEW inside one modal, so the card keeps the FORM view's height; the items sit
 * at the top, directly under the header, and the remaining space stays empty.
 *
 * ⚠ THE HEIGHT IS PER MODE, NOT ONE NUMBER. Add holds 572 and Edit 638, because
 * Edit's footer carries "Delete goal". Every assertion below therefore compares
 * the picker view with THE SAME MODE'S form view, never with a literal.
 *
 * ⚠ THE CAP. `Modal` declares no `max-height` (register G33), so nothing here
 * can be capped and the "at the viewport cap" half of the ruling is argued, not
 * measured: with two accounts the picker is never the taller view, and the form
 * is as capped as the DS lets it be, which is not at all. The short-viewport
 * test asserts the consequence that IS measurable — the two views are equally
 * (un)capped — and a longer list is reasoned about in the register entry rather
 * than invented as a fixture.
 *
 * THE RELOAD RULE applies: nothing is persisted (NP1), and every test here
 * stays on one page and uses only the app's own controls.
 * ═════════════════════════════════════════════════════════════════════════════
 */

type Mode = 'add' | 'edit'

const MAIN = FIAT_ACCOUNTS[0]!
const JOINT = FIAT_ACCOUNTS[1]!

const openModal = async (page: Page, mode: Mode, theme: 'light' | 'dark' = 'light') => {
  if (mode === 'add') {
    await gotoRoute(page, '/finance', theme)
    await page.getByRole('tab', { name: 'Plans' }).click()
    await page.locator('.mvp-plans__section').first().getByRole('link', { name: 'Add New' }).click()
    await expect(page.getByRole('dialog', { name: 'Add a Goal' })).toBeVisible()
  } else {
    await gotoRoute(page, '/finance/plans/goals/goal-bali-trip', theme)
    await page.getByRole('button', { name: 'Edit Goals' }).click()
    await expect(page.getByRole('dialog', { name: 'Edit Goal' })).toBeVisible()
  }
}

const openPicker = async (page: Page) => {
  await page.locator('.mvp-goal-form__source .mn-select').click()
  await expect(page.getByRole('dialog', { name: 'Select funding source' })).toBeVisible()
  await expect(page.locator('[role="option"]').first()).toBeVisible()
}

const box = async (locator: Locator) => {
  const b = await locator.boundingBox()
  if (!b) throw new Error('element has no box')
  return b
}

const card = (page: Page) => page.locator('.mn-modal__card')

const near = (a: number, b: number, message: string) =>
  expect(Math.abs(a - b), `${message}: ${a} vs ${b}`).toBeLessThanOrEqual(1)

/* ───────────────────────── (a) + (b): height and header ───────────────────── */

for (const width of [375, 430]) {
  test(`the picker view holds the form view's height and header position [${width}]`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 812 })

    for (const mode of ['add', 'edit'] as const) {
      await openModal(page, mode)
      const formCard = await box(card(page))
      const formHeader = await box(page.locator('.mn-overlay-header'))

      await openPicker(page)
      const pickerCard = await box(card(page))
      const pickerHeader = await box(page.locator('.mn-overlay-header'))

      // (a) THE CARD DID NOT RESIZE OR MOVE.
      near(pickerCard.height, formCard.height, `${mode}: card height`)
      near(pickerCard.y, formCard.y, `${mode}: card top`)
      near(pickerCard.x, formCard.x, `${mode}: card left`)
      near(pickerCard.width, formCard.width, `${mode}: card width`)

      // (b) THE HEADER ROW DID NOT MOVE, AND THE TITLE STAYS CENTRED.
      near(pickerHeader.y, formHeader.y, `${mode}: header top`)
      near(pickerHeader.height, formHeader.height, `${mode}: header height`)
      const title = await box(page.locator('.mn-overlay-header__title'))
      near(title.x + title.width / 2, pickerHeader.x + pickerHeader.width / 2, `${mode}: title centre`)

      // BACK AT THE LEFT, CLOSE AT THE RIGHT.
      const back = await box(page.getByRole('button', { name: 'Back to the goal form' }))
      const close = await box(page.getByRole('button', { name: 'Close' }))
      expect(back.x, `${mode}: back sits in the left half`).toBeLessThan(
        pickerHeader.x + pickerHeader.width / 2,
      )
      expect(close.x, `${mode}: close sits in the right half`).toBeGreaterThan(
        pickerHeader.x + pickerHeader.width / 2,
      )
      expect(back.x + back.width, `${mode}: back is left of the title`).toBeLessThanOrEqual(title.x)

      // THE ROUND TRIP RETURNS TO THE SAME BOX.
      await page.getByRole('button', { name: 'Back to the goal form' }).click()
      await expect(page.getByRole('dialog', { name: mode === 'add' ? 'Add a Goal' : 'Edit Goal' })).toBeVisible()
      const again = await box(card(page))
      near(again.height, formCard.height, `${mode}: card height after Back`)
      near(again.y, formCard.y, `${mode}: card top after Back`)
    }
  })
}

/* ───────────────────────── (c): items at the top, empty below ─────────────── */

test('the picker rows start under the header, flat and unstretched, with the space below left empty', async ({
  page,
}) => {
  await openModal(page, 'add')
  await openPicker(page)

  const header = await box(page.locator('.mn-overlay-header'))
  const cardBox = await box(card(page))
  const options = page.locator('[role="option"]')
  await expect(options).toHaveCount(FIAT_ACCOUNTS.length)

  // THE FIRST ROW STARTS DIRECTLY UNDER THE HEADER — not centred, not offset.
  const first = await box(options.first())
  near(first.y, header.y + header.height, 'first row top vs header bottom')

  // THE ROWS KEEP THEIR OWN HEIGHT: a stretched list would give each of the two
  // rows half of the held space. Both are the same short height.
  const heights = []
  for (let i = 0; i < FIAT_ACCOUNTS.length; i++) heights.push((await box(options.nth(i))).height)
  for (const h of heights) expect(h, 'a row is not stretched').toBeLessThanOrEqual(56)
  near(heights[0]!, heights[1]!, 'rows are equal')

  // THE EMPTY SPACE IS EMPTY: the stack of rows ends far above the card's bottom
  // edge (572 tall, rows end ~100 below the header), and no footer is drawn.
  const last = await box(options.last())
  const stackBottom = last.y + last.height
  expect(
    cardBox.y + cardBox.height - stackBottom,
    'the space below the rows is left empty, not filled',
  ).toBeGreaterThan(300)
  await expect(page.getByRole('button', { name: 'Save Goal' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0)

  // FLAT AND FULL-BLEED — UI-1's rule survives the move into the grid.
  await expect(options.first()).toHaveCSS('box-shadow', 'none')
  near(first.x, cardBox.x, 'rows run the card\'s whole width, left')
  near(first.width, cardBox.width, 'rows run the card\'s whole width')
})

/* ───────────────────────── (d): the held view is unreachable ──────────────── */

test('the form held behind the picker is unreachable until Back — Add and Edit', async ({ page }) => {
  for (const mode of ['add', 'edit'] as const) {
    await openModal(page, mode)
    const dialogName = mode === 'add' ? 'Add a Goal' : 'Edit Goal'
    await openPicker(page)

    const picker = page.getByRole('dialog', { name: 'Select funding source' })
    // ROLE QUERIES — NOT `getByLabel`, which matches label text and ignores the
    // accessibility tree, so it still finds an aria-hidden control. None of the
    // form's controls exist for assistive technology.
    await expect(picker.getByRole('textbox', { name: 'Goal Name' })).toHaveCount(0)
    await expect(picker.getByRole('spinbutton', { name: 'Target Amount (RM)' })).toHaveCount(0)
    await expect(picker.getByRole('button', { name: mode === 'add' ? 'Save Goal' : 'Save Changes' })).toHaveCount(0)
    await expect(picker.getByRole('button', { name: 'Cancel' })).toHaveCount(0)
    await expect(picker.getByRole('button', { name: 'Delete goal' })).toHaveCount(0)

    // THE MARKUP THAT DOES IT: both held regions are inert and aria-hidden, and
    // hidden from paint without leaving layout.
    for (const sel of ['.mvp-goal-views__pane[data-held="true"]', '.mvp-goal-form__actions[data-held="true"]']) {
      const held = page.locator(sel)
      await expect(held).toHaveCount(1)
      await expect(held).toHaveAttribute('inert', '')
      await expect(held).toHaveAttribute('aria-hidden', 'true')
      await expect(held).toHaveCSS('visibility', 'hidden')
    }

    // THE TAB ORDER, both directions, measured on the real keyboard: no stop
    // ever lands inside a held region.
    const strayStops: string[] = []
    for (const key of ['Tab', 'Shift+Tab']) {
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press(key)
        const stray = await page.evaluate(() => {
          const a = document.activeElement
          return !!a?.closest('[data-held="true"]')
            ? `${a.tagName.toLowerCase()}:${a.getAttribute('aria-label') ?? a.textContent?.trim().slice(0, 12)}`
            : null
        })
        if (stray) strayStops.push(`${key} #${i + 1} -> ${stray}`)
      }
    }
    expect(strayStops, 'no Tab stop lands in the held form or its footer').toEqual([])

    // BACK RESTORES EVERYTHING.
    await page.getByRole('button', { name: 'Back to the goal form' }).click()
    const dialog = page.getByRole('dialog', { name: dialogName })
    await expect(dialog.getByRole('textbox', { name: 'Goal Name' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: mode === 'add' ? 'Save Goal' : 'Save Changes' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Delete goal' })).toHaveCount(mode === 'edit' ? 1 : 0)
    await expect(page.locator('[data-held="true"]')).toHaveCount(0)
    await expect(page.locator('[inert]')).toHaveCount(0)
  }
})

/* ───────────────────────── (e): the draft, and focus as it is ─────────────── */

test('the draft survives the round trip, and focus is left on the document exactly as it was before this gate', async ({
  page,
}) => {
  await openModal(page, 'add')
  const dialog = page.getByRole('dialog', { name: 'Add a Goal' })
  await dialog.getByLabel('Goal Name').fill('Draft survives')
  await dialog.getByLabel('Target Amount (RM)').fill('1234.50')
  await dialog.getByLabel('Target date').fill('2027-03-01')
  await dialog.getByLabel('Auto-Save Amount / Month (RM)').fill('75')

  // OUT AND BACK THROUGH THE HEADER'S OWN BACK CONTROL.
  await openPicker(page)
  await page.getByRole('button', { name: 'Back to the goal form' }).click()
  await expect(dialog.getByLabel('Goal Name')).toHaveValue('Draft survives')
  await expect(dialog.getByLabel('Target Amount (RM)')).toHaveValue('1234.50')
  await expect(dialog.getByLabel('Target date')).toHaveValue('2027-03-01')
  await expect(dialog.getByLabel('Auto-Save Amount / Month (RM)')).toHaveValue('75')
  await expect(dialog.locator('.mn-select__input')).toHaveValue(MAIN.name)
  /*
    ⚠ PINNED AS IT IS, NOT AS THE GATE BRIEF ASSUMED. Focus does NOT return to the
    Funding Source trigger on Back: before this gate the trigger was unmounted
    with the form, and it is now only hidden, so in both cases the focused
    element goes away with the view and `document.body` is what is left. Measured
    on the unchanged tree. A focus-return would be a behaviour change (and the
    retrofit session's call), so this assertion records the present state.
  */
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)

  // OUT AND BACK THROUGH A PICK: the choice lands in the form, the rest holds.
  await openPicker(page)
  await page.locator('[role="option"]').nth(1).click()
  await expect(dialog.getByLabel('Goal Name')).toHaveValue('Draft survives')
  await expect(dialog.getByLabel('Target Amount (RM)')).toHaveValue('1234.50')
  await expect(dialog.locator('.mn-select__input')).toHaveValue(JOINT.name)
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
})

/* ───────────────────────── (f): the cap — measured consequence ────────────── */

test('on a short viewport the two views are equally uncapped, so the card still does not change height', async ({
  page,
}) => {
  await openModal(page, 'add')
  // SHORTER THAN THE FORM'S OWN CARD PLUS THE DS PADDING (572 + 2 x 16).
  await page.setViewportSize({ width: 375, height: 560 })
  const formCard = await box(card(page))
  await openPicker(page)
  const pickerCard = await box(card(page))
  near(pickerCard.height, formCard.height, 'card height on a short viewport')
  near(pickerCard.y, formCard.y, 'card top on a short viewport')
})
