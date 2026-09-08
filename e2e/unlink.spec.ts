import { expect, test } from '@playwright/test'
import { THEMES, activateTab, gotoRoute } from './harness'

/**
 * THE UNLINK WRITE, END TO END — Gate 49.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS SPEC EXISTS AT ALL, WHEN THE GATE ALREADY ADDED TWO VISUAL STATES.
 *
 * The two new walk states prove the sheet RENDERS in each of its two forms. They
 * cannot prove the thing this gate is actually about: that unlinking a receipt
 * makes a DIFFERENT SCREEN change, with nothing written to that screen. A
 * screenshot is taken at one instant of one state and has no way to express
 * "and then this other row stopped drawing its glyph".
 *
 * IT IS THE DERIVED RULING'S ONLY LOAD TEST. Gate 48 deleted
 * `Transaction.hasReceipt` and replaced it with `transactionHasReceipt(receipts,
 * id)` on the argument that one fact stored twice will eventually disagree with
 * itself. Nothing exercised that argument, because nothing wrote to `receipts`
 * — `unlinkReceipt` is the first writer, so this is the first moment the ruling
 * could be either vindicated or shown to be theatre. Under the old stored flag
 * this test would fail unless the mutator also wrote the ledger.
 * ─────────────────────────────────────────────────────────────────────────────
 * NO BASELINE AND NO WALK STATE. It asserts behaviour, not pixels, so it adds
 * nothing to `visual.spec.ts` and nothing to the snapshot directory — the same
 * shape as `frame-cap.spec.ts` and `tile-fill.spec.ts`.
 *
 * IT RUNS AT THE DEFAULT VIEWPORT ONLY, in both themes. Width cannot change what
 * a write does, and the two-viewport axis is `visual.spec.ts`'s alone (Gate A:
 * folding it into every spec was measured and rejected). Both themes are kept
 * because reaching dark requires a click, and a state reached by clicking is
 * exactly where this app has historically found ordering bugs.
 */

/** `txn-aeon-0904`, linked to `receipt-aeonbig01`. Its amount is unique in the ledger. */
const LINKED_ROW = 'RM 429.19'
/** `txn-aeon-0915`, the same merchant with no receipt — the untouched control. */
const UNLINKED_ROW = 'RM 250.75'

/**
 * How many ledger rows currently draw the receipt glyph.
 *
 * READ OFF THE RENDERED SVG, NOT OFF A CLASS. `ListItem` renders
 * `<Icon name="receipt_long" size="s" />` as the first child of
 * `.mn-list-item__amount-row` and gives it no class of its own, so the honest
 * question is "does that row's amount group contain a graphic". A class-based
 * probe would be asserting DS internals that carry no such name.
 */
async function glyphRowCount(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(
    () =>
      [...document.querySelectorAll('.mvp-transactions__list .mn-list-item__amount-row')].filter(
        (row) => row.querySelector('svg') !== null,
      ).length,
  )
}

for (const theme of THEMES) {
  test(`unlinking a receipt clears that row's glyph and nothing else — ${theme}`, async ({
    page,
  }) => {
    await gotoRoute(page, '/finance', theme)
    await activateTab(page, { id: 'transactions', label: 'Transactions' })

    const rows = page.locator('.mvp-transactions__list > li')
    const linked = page.locator(
      `.mvp-transactions__list > li:has-text("${LINKED_ROW}") .mn-list-item`,
    )
    const unlinked = page.locator(
      `.mvp-transactions__list > li:has-text("${UNLINKED_ROW}") .mn-list-item`,
    )

    // ── BEFORE ──────────────────────────────────────────────────────────────
    // TEN OF THE TWENTY-THREE ROWS CARRY A RECEIPT, and that 10 is `receipts.ts`'s
    // own record count rather than a number chosen here. Asserting the total —
    // not just the one row — is what makes the "and nothing else" half real.
    await expect(rows).toHaveCount(23)
    expect(await glyphRowCount(page), 'ten seeded receipts, ten glyphs').toBe(10)
    await expect(
      linked.locator('.mn-list-item__amount-row svg'),
      'the linked row draws its receipt glyph before the unlink',
    ).toHaveCount(1)
    await expect(
      unlinked.locator('.mn-list-item__amount-row svg'),
      'the same-merchant unlinked row draws none, before or after',
    ).toHaveCount(0)

    // ── THE WRITE ───────────────────────────────────────────────────────────
    // THROUGH THE REAL CONTROL. Nothing here calls `unlinkReceipt` or pokes
    // React state — the row is clicked, the sheet opens, its button is pressed.
    await linked.click()
    const dialog = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(dialog).toHaveCount(1)
    await expect(dialog).toHaveAccessibleName('Transaction details')
    await expect(
      dialog.getByText('Linked', { exact: true }),
      'the sheet opened on its LINKED state',
    ).toHaveCount(1)

    await dialog.getByRole('button', { name: 'Unlink receipt' }).click()

    // ── THE SHEET FLIPS IN PLACE ────────────────────────────────────────────
    // IT DOES NOT CLOSE, DELIBERATELY. `TransactionsLedger` re-resolves the
    // receipt from the live collection on every render, so the open sheet
    // becomes the no-receipt state and the user sees what their click did. A
    // sheet that dismissed itself would leave them guessing.
    await expect(
      dialog,
      'the open sheet re-rendered as the no-receipt state',
    ).toContainText('Add a receipt to track what you bought')
    await expect(dialog.getByText('Linked', { exact: true })).toHaveCount(0)
    await expect(
      dialog,
      'THE AMOUNT DOES NOT REVERT — the receipt corrected the ledger at Gate 48 ' +
        'and unlinking does not un-correct it',
    ).toContainText('-RM 429.19')

    // ── AFTER, ON THE LEDGER BEHIND IT ──────────────────────────────────────
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)

    await expect(
      linked.locator('.mn-list-item__amount-row svg'),
      'the glyph is gone from the row, with nothing written to the row',
    ).toHaveCount(0)
    expect(await glyphRowCount(page), 'exactly one glyph went, not zero and not two').toBe(9)
    await expect(rows, 'no row was added or removed').toHaveCount(23)
    await expect(
      linked,
      'the row still prints the receipt-corrected amount and its own date',
    ).toHaveText(/RM 429\.19/)

    // ── AND THE RECEIPT IS STILL IN THE LIBRARY ─────────────────────────────
    // UNLINKING IS NOT DELETING. The capture keeps its image, its name and its
    // line items; what it loses is the "Linked" pill and the nested row, which
    // is `ReceiptCard`'s already-typed `Linked=No` variant rendering for the
    // first time — no record in `receipts.ts` ships unlinked.
    await activateTab(page, { id: 'receipts', label: 'Receipts' })
    const card = page.locator('.mvp-receipt-card:has-text("IMG_4806.jpg")')
    await expect(card, 'the receipt is still in the library').toHaveCount(1)
    await expect(
      card.locator('.mn-chips'),
      'and it no longer claims to be linked',
    ).toHaveCount(0)
    await expect(
      card.locator('.mn-list-item'),
      'and it no longer nests the transaction row',
    ).toHaveCount(0)
  })
}
