import { expect, type Page } from '@playwright/test'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RECEIPTS-TAB CAPTURE PATH, SHARED BY THE SPECS THAT DRIVE IT (Gate 51).
 *
 * `automatch.spec.ts` wrote these helpers at Gate 50-C. Gate 51 added two more
 * specs that need exactly the same path — `receipt-viewer.spec.ts` and
 * `capture-time.spec.ts` — so they moved here rather than being copied twice.
 * One path means one place to change when the add control moves, which is
 * exactly what happened this gate: the per-month "+ Add Receipts" link became a
 * single screen-level "Add new receipt" button.
 *
 * NOT A SPEC FILE, so Playwright's `testMatch` never collects it, and it adds
 * nothing to the test count. `harness.ts` stays the home of the WALK machinery;
 * this is behaviour-spec plumbing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const TRANSACTIONS_TAB = { id: 'transactions', label: 'Transactions' }
export const RECEIPTS_TAB = { id: 'receipts', label: 'Receipts' }

/** The same committed fixture the capture walk states stage. */
export const FIXTURE = 'e2e/fixtures/receipt-capture.jpg'

/** "RM 250.75" — the magnitude as a ledger row prints it. */
export function printedMagnitude(amount: number): string {
  return `RM ${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
}

/**
 * Replace the walk's never-settling stub with one that answers at once — FOR
 * THIS TEST'S PAGE ONLY, AFTER `gotoRoute` HAS INSTALLED THE STUB.
 *
 * `extract.ts` reads `window.__monarchExtractReceipt` at CALL time, so writing
 * it after navigation is enough, and `installExtractionStub` stays exactly as
 * Gate 50 wrote it. Nothing navigates after this, so nothing re-runs the stub's
 * init script over the top.
 */
export async function installResolvingExtraction(
  page: Page,
  extracted: Record<string, unknown>,
): Promise<void> {
  await page.evaluate((value) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__monarchExtractReceipt = async () => value
  }, extracted)
}

/**
 * Stage the fixture in the bulk modal and press Save — through the real
 * buttons. The OS picker is INTERCEPTED via `filechooser`, never bypassed with
 * `setInputFiles` on the hidden input, because the wiring between the source
 * button and that input is part of what is under test.
 *
 * THE CONTROL IS THE SCREEN-LEVEL "Add new receipt" (Gate 51). Until then it
 * was the first month heading's "+ Add Receipts" link, resolved with
 * `.mvp-receipts__month:first-of-type .mn-link` because it repeated per month.
 * There is one now, so no `:first-of-type` is needed to pick between copies.
 *
 * ─────────── `via` SELECTS THE SOURCE ROW, AND DEFAULTS TO GALLERY ───────────
 *
 * Gate 53 made the receipt's `displayName` depend on which row opened the
 * picker, so a spec has to be able to choose. It defaults to 'Photo Gallery' so
 * every caller written before that gate is unchanged — and so the walk states,
 * which stage through `openOverlay`'s own `chooseFiles` step rather than
 * through here, keep matching what these helpers do.
 *
 * THE TWO ROWS DIFFER ONLY IN THEIR LABEL HERE, AND THAT IS THE POINT: both
 * reach the same `<input>`, and what distinguishes them is the `capture`
 * attribute that `ReceiptFileInput.open()` sets. Clicking the real button is
 * therefore the only way a test can exercise the source at all.
 */
export async function saveOneCapture(
  page: Page,
  via: 'Photo Gallery' | 'Camera' = 'Photo Gallery',
): Promise<void> {
  const add = page.locator('.mvp-receipts__add .mn-btn')
  await expect(add).toHaveAccessibleName('Add new receipt')
  await add.click()

  const dialog = page.locator('[role="dialog"][aria-modal="true"]')
  await expect(dialog).toHaveCount(1)
  await expect(dialog).toHaveAccessibleName('Add receipts')

  const source = dialog.locator(`.mvp-add-receipts__sources .mn-btn:has-text("${via}")`)
  await expect(source, `the "${via}" row resolved to exactly one control`).toHaveCount(1)
  // Armed BEFORE the click — Chromium raises the event synchronously with it.
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), source.click()])
  await chooser.setFiles(FIXTURE)
  await expect(dialog.locator('.mvp-add-receipts__badge')).toHaveText('jpg')

  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog, 'Save resolved and the modal closed').toHaveCount(0)
}

/** How many ledger rows draw the receipt glyph — `unlink.spec.ts`'s probe. */
export async function glyphRowCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      [...document.querySelectorAll('.mvp-transactions__list .mn-list-item__amount-row')].filter(
        (el) => el.querySelector('svg') !== null,
      ).length,
  )
}

/**
 * Every `[role="dialog"]` open, by accessible name, in DOM order — the same
 * aria read `harness.ts`'s `readOpenDialogs` makes, so a behaviour spec and the
 * walk agree about what a dialog is called.
 */
export async function openDialogNames(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="dialog"]')).map((el) => {
      const labelledBy = el.getAttribute('aria-labelledby')
      const labelled = labelledBy ? document.getElementById(labelledBy)?.textContent : null
      return labelled ?? el.getAttribute('aria-label') ?? '(no title)'
    }),
  )
}
