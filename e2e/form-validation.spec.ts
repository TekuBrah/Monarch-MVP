import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import {
  RECEIPTS_TAB,
  capturedImageName,
  installResolvingExtraction,
  openDialogNames,
  saveOneCapture,
} from './capture'
import { PINNED_NOW, activateTab, gotoRoute } from './harness'

import { BUDGETS } from '../src/data/budgets'
import { RECEIPTS } from '../src/data/receipts'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WHEN A FORM SHOWS ITS ERRORS, AND THE SCHEME ITS NATIVE CONTROLS ARE DRAWN IN
 * — Gate 71-B, decision 2C and the `color-scheme` fix.
 *
 * A NEW FILE, not an extension of `budget-writers.spec.ts`. That file is the
 * budget WRITERS; this one is `useTouchedValidation`, which is shared by the
 * budget form AND the receipt editor, so its tests sit with each other rather
 * than being split across two feature specs. `color-scheme` is here for the
 * same reason — it is a property of the forms' native controls in every theme,
 * not of budgets.
 *
 * "RED" IS READ TWO WAYS, because each can pass alone while the other fails:
 * the control's `aria-invalid` (what assistive technology is told), and the
 * box's COMPUTED border colour against the DS's own
 * `--mapped-border-error-default`, resolved on a probe element rather than
 * restated (what a sighted user sees). The DS transitions border colour, so
 * every running animation is FINISHED before the read — a mid-transition value
 * is neither colour.
 *
 * No baseline. The invalid appearance is photographed by the
 * `[overlay:create-attempt]` walk state.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MONTHLY = BUDGETS.find((b) => b.id === 'budget-monthly')!
const SEEDED = RECEIPTS.find((r) => r.id === 'receipt-aeonbig01')!

const dialog = (page: Page, name: string): Locator => page.getByRole('dialog', { name })

async function openCreate(page: Page): Promise<Locator> {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'budget', label: 'Budget' })
  await page.getByRole('button', { name: 'Add New Budget' }).click()
  const modal = dialog(page, 'Create A Budget')
  await expect(modal).toBeVisible()
  return modal
}

/** Every control in `scope` announcing itself invalid. */
const invalidControls = (scope: Locator) => scope.locator('[aria-invalid="true"]')

/**
 * The boxes in `scope` whose computed border is the error token. `.mn-field`
 * carries its own border; `Select` draws it on `.mn-select__control`.
 */
async function redBoxes(scope: Locator): Promise<string[]> {
  return scope.evaluate((root) => {
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {
        // an infinite animation cannot finish; none is on a field border
      }
    })
    const probe = document.createElement('div')
    probe.style.borderTop = '2px solid var(--mapped-border-error-default)'
    document.body.appendChild(probe)
    const error = getComputedStyle(probe).borderTopColor
    probe.remove()
    return Array.from(root.querySelectorAll<HTMLElement>('.mn-field, .mn-select__control'))
      .filter((box) => getComputedStyle(box).borderTopColor === error)
      .map((box) => box.textContent?.trim() ?? '')
  })
}

/** Move focus off the current control without touching another field. */
const leave = (modal: Locator) => modal.getByRole('heading').click()

// ─────────────────────────────────────────────────────────── the budget form

test('a pristine Create form shows nothing invalid, by aria-invalid and by computed border', async ({
  page,
}) => {
  const modal = await openCreate(page)
  await expect(invalidControls(modal)).toHaveCount(0)
  expect(await redBoxes(modal)).toEqual([])
  await expect(modal.getByRole('button', { name: 'Save Budget' })).toBeEnabled()
})

test('leaving an invalid field turns it red, and only that field', async ({ page }) => {
  const modal = await openCreate(page)
  await modal.getByLabel('Name').click()
  await leave(modal)
  await expect(modal.getByLabel('Name')).toHaveAttribute('aria-invalid', 'true')
  await expect(invalidControls(modal)).toHaveCount(1)
  expect(await redBoxes(modal)).toEqual(['Name *'])
})

test('a red field clears as soon as its value is valid, with no second blur', async ({ page }) => {
  const modal = await openCreate(page)
  const name = modal.getByLabel('Name')
  await name.click()
  await leave(modal)
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await name.fill('Weekend')
  await expect(name).toBeFocused()
  await expect(name).not.toHaveAttribute('aria-invalid', 'true')
  expect(await redBoxes(modal)).toEqual([])
})

test('a Save attempt on the empty form saves nothing, marks all five fields and focuses the first', async ({
  page,
}) => {
  const modal = await openCreate(page)
  await modal.getByRole('button', { name: 'Save Budget' }).click()
  await expect(modal).toBeVisible()
  await expect(invalidControls(modal)).toHaveCount(5)
  for (const control of [
    modal.getByLabel('Name'),
    modal.getByRole('combobox', { name: 'Category' }),
    modal.getByLabel('Amount (RM)'),
    modal.getByLabel('Date (From)'),
    modal.getByLabel('Date (To)'),
  ]) {
    await expect(control).toHaveAttribute('aria-invalid', 'true')
  }
  await expect(modal.getByLabel('Name')).toBeFocused()
  // Focused Name paints the DS focus border; the other four paint red.
  expect(await redBoxes(modal)).toHaveLength(4)

  await modal.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.locator('.mvp-budget .mn-card-monthly-budget:not(.mn-card-monthly-budget--add-new)')).toHaveCount(
    BUDGETS.length,
  )
})

test('a valid Save still creates the budget', async ({ page }) => {
  const modal = await openCreate(page)
  await modal.getByLabel('Name').fill('Weekend')
  await modal.getByRole('combobox', { name: 'Category' }).click()
  // Gate 74-B: the picker is a VIEW, and it retitles the one dialog, so the
  // 'Create A Budget' locator stops matching while it is open.
  const picker = page.getByRole('dialog', { name: 'Select category' })
  await picker.getByRole('option', { name: 'Groceries' }).click()
  await picker.getByRole('button', { name: 'Add 1 Category' }).click()
  await modal.getByLabel('Amount (RM)').fill('250.00')
  await modal.getByLabel('Date (From)').fill('2025-09-01')
  await modal.getByLabel('Date (To)').fill('2025-09-10')
  await modal.getByRole('button', { name: 'Save Budget' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Details for Weekend' })).toHaveCount(1)
})

test('an Edit form opens with nothing red, and an unchanged Save Changes closes without writing', async ({
  page,
}) => {
  await gotoRoute(page, `/finance/budget/${MONTHLY.id}`, 'light')
  await page.getByRole('link', { name: 'Edit' }).click()
  const modal = dialog(page, 'Edit Budget')
  await expect(invalidControls(modal)).toHaveCount(0)
  expect(await redBoxes(modal)).toEqual([])

  await modal.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.mn-header-default__title')).toHaveText(MONTHLY.name)
})

test('Cancel then reopen shows a pristine form — the attempt and the touched fields are discarded', async ({
  page,
}) => {
  const modal = await openCreate(page)
  await modal.getByRole('button', { name: 'Save Budget' }).click()
  await expect(invalidControls(modal)).toHaveCount(5)
  await modal.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Add New Budget' }).click()
  const reopened = dialog(page, 'Create A Budget')
  await expect(reopened).toBeVisible()
  await expect(invalidControls(reopened)).toHaveCount(0)
  expect(await redBoxes(reopened)).toEqual([])
})

// ──────────────────────────────────────────────────────── the receipt editor

async function openEditor(page: Page): Promise<Locator> {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, RECEIPTS_TAB)
  await page.locator(`.mvp-receipt-card:has-text("${SEEDED.displayName}")`).click()
  await page.locator('.mvp-receipt-details .mn-link').click()
  const modal = dialog(page, 'Edit receipt')
  await expect(modal).toBeVisible()
  return modal
}

test('the receipt editor opens pristine — on a seeded receipt, and on an unread capture whose total is empty', async ({
  page,
}) => {
  const modal = await openEditor(page)
  await expect(invalidControls(modal)).toHaveCount(0)
  expect(await redBoxes(modal)).toEqual([])
  await expect(modal.getByRole('button', { name: 'Save changes' })).toBeEnabled()

  /*
    THE TRADE-OFF CASE, ACCEPTED AT GATE 71-B. A seeded receipt has no empty
    field, so it cannot show the difference; an unread capture can. Its total
    was never read, so the editor opens it EMPTY (Gate 58) — invalid, and until
    Gate 71-B red on open. Now it waits for touch or a Save attempt.
  */
  await modal.getByRole('button', { name: 'Close' }).click()
  await installResolvingExtraction(page, {
    merchant: null,
    capturedAt: null,
    total: null,
    tax: null,
    currency: 'MYR',
    lineItems: [],
  })
  await saveOneCapture(page)
  await page.locator(`.mvp-receipt-card:has-text("${capturedImageName(PINNED_NOW)}")`).click()
  await page.locator('.mvp-receipt-details .mn-link').click()
  const unread = dialog(page, 'Edit receipt')
  await expect(unread.getByLabel('Total (RM)')).toHaveValue('')
  await expect(invalidControls(unread)).toHaveCount(0)
  expect(await redBoxes(unread)).toEqual([])
})

test('the receipt editor turns a left, emptied field red — and only that field', async ({ page }) => {
  const modal = await openEditor(page)
  const merchant = modal.getByLabel('Merchant')
  await merchant.fill('')
  await expect(merchant, 'still focused: not left yet').not.toHaveAttribute('aria-invalid', 'true')
  await modal.getByLabel('Total (RM)').click()
  await expect(merchant).toHaveAttribute('aria-invalid', 'true')
  await expect(invalidControls(modal)).toHaveCount(1)
  expect(await redBoxes(modal)).toEqual(['Merchant *'])
})

test('a receipt-editor Save attempt writes nothing, marks the invalid fields and focuses the first', async ({
  page,
}) => {
  const modal = await openEditor(page)
  // Total first, Merchant second — so "the first" is decided by DOM order, not by edit order.
  await modal.getByLabel('Total (RM)').fill('0')
  await modal.getByLabel('Merchant').fill('')
  await modal.getByRole('button', { name: 'Save changes' }).click()

  expect(await openDialogNames(page)).toEqual(['Edit receipt'])
  await expect(invalidControls(modal)).toHaveCount(2)
  await expect(modal.getByLabel('Merchant')).toBeFocused()
  await expect(modal.getByLabel('Total (RM)')).toHaveAttribute('aria-invalid', 'true')

  // Nothing was written: Back, and the details still print the stored merchant.
  await modal.getByRole('button', { name: 'Back to receipt' }).click()
  await expect(page.locator('.mvp-receipt-details')).toContainText(SEEDED.merchant)
})

// ───────────────────────────────────────────────────────────── color-scheme

test('color-scheme follows the theme on <html>: light in light, dark in dark, and inherits to a date input', async ({
  page,
}) => {
  for (const theme of ['light', 'dark'] as const) {
    await gotoRoute(page, `/finance/budget/${MONTHLY.id}`, theme)
    await page.getByRole('link', { name: 'Edit' }).click()
    const schemes = await page.evaluate(() => ({
      html: getComputedStyle(document.documentElement).colorScheme,
      date: getComputedStyle(document.querySelector('input[type="date"]')!).colorScheme,
    }))
    expect(schemes, theme).toEqual({ html: theme, date: theme })
  }
})
