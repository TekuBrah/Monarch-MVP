import { expect, type FileChooser, type Page } from '@playwright/test'

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
 * What Decision 7B names an IMAGE capture taken at `now` — Gate 54.
 *
 * ───────── WHY EVERY SPEC THAT SAVES A CAPTURE NOW NEEDS THIS ──────────────
 *
 * Until Gate 54 a gallery pick kept `File.name`, so five specs located the card
 * they had just created with `:has-text("receipt-capture.jpg")` — the fixture's
 * own name. Decision 7B names every image from the clock instead, and those
 * five went red together. They are updated to the rule rather than the rule
 * bent back to them: a gallery name is frequently not a name at all on a real
 * device, which is the finding 7B exists for.
 *
 * ONE DERIVATION, SHARED, so the specs cannot disagree about it. It takes `now`
 * because `capture-time.spec.ts` deliberately re-pins the clock mid-test.
 *
 * LOCAL TIME, COMPUTED AS UTC+8 RATHER THAN READ FROM A FORMATTER.
 * `playwright.config.ts` pins `Asia/Kuala_Lumpur`, which has no DST, so the
 * offset is constant — and doing the arithmetic here rather than asking
 * `Intl` keeps this an INDEPENDENT statement of the expected value instead of
 * a second run of the same conversion the app performs.
 */
export function capturedImageName(now: Date, ordinal = 1): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const stamp =
    `${local.getUTCFullYear()}${pad(local.getUTCMonth() + 1)}${pad(local.getUTCDate())}_` +
    `${pad(local.getUTCHours())}${pad(local.getUTCMinutes())}${pad(local.getUTCSeconds())}`
  // The suffix goes BEFORE the extension, as a file manager would write it.
  return ordinal === 1 ? `IMG_${stamp}.jpg` : `IMG_${stamp}_${ordinal}.jpg`
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
 * picker, so a spec has to be able to choose. DECISION 7B ENDED THAT DEPENDENCE
 * — every image is named from the clock and only a PDF keeps its own filename —
 * but the parameter stays, because `capture-name.spec.ts` still has to prove
 * the two rows now agree, and proving that needs the ability to pick one.
 *
 * THE TWO ROWS DIFFER ONLY IN THEIR LABEL HERE, AND THAT IS THE POINT: both
 * reach the same `<input>`, and what distinguishes them is the `capture`
 * attribute that `ReceiptFileInput.open()` sets. Clicking the real button is
 * therefore the only way a test can exercise the source at all.
 *
 * ─────────── `files` STAGES A WHOLE SELECTION, AND DEFAULTS TO ONE ───────────
 *
 * Decision 7B de-duplicates display names ACROSS one selection, so a spec has
 * to be able to stage more than one file in a single pick — which is a
 * different thing from calling this twice, and is exactly the difference the
 * `_2` suffix exists for. Playwright's `setFiles` takes in-memory descriptors
 * as well as paths, so a second file needs no second committed fixture.
 */
export async function saveOneCapture(
  page: Page,
  via: 'Photo Gallery' | 'Camera' = 'Photo Gallery',
  files: Parameters<FileChooser['setFiles']>[0] = FIXTURE,
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
  await chooser.setFiles(files)
  // FIRST TILE ONLY — a selection may now stage several, and what this arm
  // checks is that the pick reached the grid at all.
  await expect(dialog.locator('.mvp-add-receipts__badge').first()).toHaveText(/^(jpg|pdf)$/)

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
