import { expect, test, type Page } from '@playwright/test'
import { THEMES, activateTab, gotoRoute } from './harness'
import {
  RECEIPTS_TAB,
  TRANSACTIONS_TAB,
  installResolvingExtraction,
  openDialogNames,
  saveOneCapture,
} from './capture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE MANUAL LINK PICKER AND THE RECEIPT EDITOR, END TO END — Gate 51-B.
 *
 * WHY THIS SPEC EXISTS WHEN THE GATE ALSO ADDED THREE VISUAL STATES. Those
 * prove the three views RENDER. They cannot prove what this gate is actually
 * about, because every one of its claims is about a state CHANGE that a
 * screenshot has no way to express:
 *
 *   - linking writes the receipt and NOT the transaction (P6);
 *   - a swap displaces the incumbent INTO THE LIBRARY rather than deleting it;
 *   - Cancel swaps nothing;
 *   - the editor's stored timestamp is a zone-less LOCAL wall-clock string;
 *   - editing does not re-run auto-match;
 *   - the mismatch line appears and disappears with a CONDITION.
 *
 * Each of those is "and then a different thing did or did not change", which is
 * the shape `unlink.spec.ts` was written for at Gate 49 and the same reason it
 * is a spec rather than a baseline.
 * ─────────────────────────────────────────────────────────────────────────────
 * NO BASELINE AND NO WALK STATE. Behaviour, not pixels — the same shape as
 * `frame-cap.spec.ts`, `tile-fill.spec.ts` and `unlink.spec.ts`.
 *
 * DEFAULT VIEWPORT ONLY, BOTH THEMES, for the reason `unlink.spec.ts` records:
 * width cannot change what a write does, the two-viewport axis belongs to
 * `visual.spec.ts` alone (Gate A), and dark is reached by clicking — which is
 * where this app has historically found ordering bugs.
 */

/** `receipt-aeonbig01` — the receipt three walk states already open. */
const RECEIPT = 'IMG_4806.jpg'
/** `txn-aeon-0904`, its transaction. Unique magnitude in the ledger. */
const LINKED_ROW = 'RM 429.19'
/** `txn-aeon-0915` — same merchant, NO receipt. Linking here needs no confirm. */
const FREE_ROW = 'RM 250.75'
/** `txn-caring-0913` — carries `receipt-caring01`, so linking here DOES confirm. */
const TAKEN_ROW = 'RM 26.29'
/** `receipt-caring01`'s card, the one a swap displaces. */
const TAKEN_RECEIPT = 'IMG_4903.jpg'

const CARD = (name: string) => `.mvp-receipt-card:has-text("${name}")`
const PICKER_ROW = (amount: string) => `.mvp-link-picker .mn-list-item:has-text("${amount}")`

/** Open the Receipts tab and then one receipt's viewer, through real controls. */
async function openViewer(page: Page, theme: 'light' | 'dark', name = RECEIPT) {
  await gotoRoute(page, '/finance', theme)
  await activateTab(page, RECEIPTS_TAB)
  await page.locator(CARD(name)).click()
  await expect(page.locator('[role="dialog"]')).toHaveCount(1)
}

/** Unlink the open receipt, then open the picker. Both through real controls. */
async function openPicker(page: Page) {
  await page.locator('.mn-modal__footer .mn-btn:has-text("Unlink receipt")').click()
  await page.locator('.mn-modal__footer .mn-btn:has-text("Link to transaction")').click()
  await expect(page.locator('.mvp-link-picker__context')).toHaveCount(1)
}

/** Every receipt in the library, with its link — read out of the rendered tab. */
async function libraryLinks(page: Page): Promise<Record<string, boolean>> {
  return page.evaluate(() => {
    const out: Record<string, boolean> = {}
    for (const card of document.querySelectorAll('.mvp-receipt-card')) {
      const name = card.querySelector('.mvp-receipt-card__name')?.textContent ?? '?'
      out[name] = card.textContent?.includes('Linked') ?? false
    }
    return out
  })
}

/**
 * The amount a named ledger row prints.
 *
 * IT DOES NOT ACTIVATE THE TAB, AND THAT IS DELIBERATE. `activateTab` asserts
 * the tab is NOT already selected — it refuses a no-op, so a state is always
 * reached by a real transition rather than by asking for one that has already
 * happened. Calling it twice in one test therefore fails, correctly. The caller
 * switches once and then reads as many rows as it likes.
 */
async function ledgerAmount(page: Page, merchant: string, at: string): Promise<string | null> {
  return page.evaluate(
    ([m, t]) => {
      for (const row of document.querySelectorAll('.mvp-transactions__list .mn-list-item')) {
        const text = row.textContent ?? ''
        if (text.includes(m) && text.includes(t)) {
          return row.querySelector('.mn-list-item__amount')?.textContent ?? null
        }
      }
      return null
    },
    [merchant, at],
  )
}

for (const theme of THEMES) {
  /* ─────────────────────────────────────────────────── the picker, item L ── */

  test(`the picker opens from the unlinked viewer and lists no credits — ${theme}`, async ({
    page,
  }) => {
    await openViewer(page, theme)
    await openPicker(page)

    // IT IS ONE DIALOG, RENAMED — not a second stack. P1, asserted.
    expect(await openDialogNames(page)).toEqual(['Link to transaction'])

    /*
      NO CREDIT IS LISTED, IN EITHER GROUP. Read off the rendered amounts rather
      than off the data: the question is what the picker OFFERS, and a data-side
      assertion would pass even if the filter stopped reaching the render.
    */
    const amounts = await page.locator('.mvp-link-picker .mn-list-item__amount').allTextContents()
    expect(amounts.length).toBeGreaterThan(0)
    expect(amounts.filter((a) => !a.trim().startsWith('-'))).toEqual([])

    // THE CORRECT ROW IS THE ONLY SUGGESTION — the ranking, rendered.
    const suggested = page.locator('.mvp-link-picker__group').first()
    await expect(suggested.locator('.mvp-section-header')).toHaveText('Suggested')
    await expect(suggested.locator('.mn-list-item')).toHaveCount(1)
    await expect(suggested.locator('.mn-list-item__amount')).toHaveText(`-${LINKED_ROW}`)
  })

  test(`"Suggested" is omitted entirely when nothing qualifies — ${theme}`, async ({ page }) => {
    await openViewer(page, theme)
    await openPicker(page)
    // The group exists first, so the assertion below cannot pass vacuously.
    await expect(page.locator('.mvp-link-picker .mvp-section-header').first()).toHaveText(
      'Suggested',
    )

    /*
      SEARCHING FOR A ROW THAT CANNOT BE A SUGGESTION EMPTIES THE GROUP, because
      suggestions are ranked over the SEARCHED set rather than over the whole
      ledger. Netflix agrees on nothing — not the total, not the date, not the
      merchant.
    */
    await page.locator('.mvp-link-picker__search input').fill('Netflix')
    const headings = page.locator('.mvp-link-picker .mvp-section-header')
    await expect(headings).toHaveCount(1)
    await expect(headings).not.toHaveText('Suggested')
    // AND NO EMPTY-STATE COPY IN ITS PLACE, which is the other half of the rule.
    await expect(page.locator('.mvp-link-picker__empty')).toHaveCount(0)
  })

  test(`linking a free row flips the viewer and MOVES NO AMOUNT — ${theme}`, async ({ page }) => {
    await openViewer(page, theme)
    const before = await page.evaluate(() => document.body.textContent?.length ?? 0)
    expect(before).toBeGreaterThan(0)

    await openPicker(page)
    await page.locator(PICKER_ROW(FREE_ROW)).click()

    // NO CONFIRMATION — the row was free (P3).
    expect(await openDialogNames(page)).toEqual([RECEIPT])

    // THE VIEWER FLIPPED IN PLACE to its linked state, on the row just picked.
    await expect(page.locator('.mvp-receipt-viewer__link .mn-chips')).toHaveText('Linked')
    await expect(page.locator('.mvp-receipt-viewer__link .mn-list-item__amount')).toHaveText(
      `-${FREE_ROW}`,
    )

    /*
      ── LINKING MOVES NO AMOUNT ──────────────────────────────────────────────
      THE POINT OF THE WHOLE GATE, and the assertion `linkReceipt`'s contract
      rests on. The receipt's total is RM 429.19 and the row it was just linked
      to is RM 250.75; under any implementation that "reconciled" the two, one
      of those figures would have moved.
    */
    await page.locator('.mn-modal__header-side--end .mn-btn').click()
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)
    await activateTab(page, TRANSACTIONS_TAB)
    expect(await ledgerAmount(page, 'Aeon Big', '15 Sept, 22:03')).toBe(`-${FREE_ROW}`)
    expect(await ledgerAmount(page, 'Aeon Big', '04 Sept, 13:45')).toBe(`-${LINKED_ROW}`)
  })

  /* ──────────────────────────────────────────────────────────── the swap ── */

  test(`linking a taken row asks first, and Cancel swaps nothing — ${theme}`, async ({ page }) => {
    await openViewer(page, theme)
    await openPicker(page)
    await page.locator(PICKER_ROW(TAKEN_ROW)).click()

    // TWO STACKS: the picker view, and the confirmation over it.
    expect(await openDialogNames(page)).toEqual([
      'Link to transaction',
      "Replace this transaction's receipt?",
    ])
    await expect(page.locator('.mvp-receipt-delete__body')).toHaveText(
      "Caring Pharmacy's current receipt will move to your library, unlinked.",
    )

    await page.locator('[role="dialog"]').last().locator('.mn-btn:has-text("Cancel")').click()

    // BACK TO THE PICKER, UNCHANGED — and nothing was written.
    expect(await openDialogNames(page)).toEqual(['Link to transaction'])
    await page.locator('.mn-modal__header-side--end .mn-btn').click()
    // ALREADY ON RECEIPTS — `activateTab` refuses a no-op, by design.
    const links = await libraryLinks(page)
    expect(links[TAKEN_RECEIPT], 'Cancel left the incumbent linked').toBe(true)
    expect(links[RECEIPT], 'Cancel linked nothing to the unlinked receipt').toBe(false)
  })

  test(`Replace swaps, and the displaced receipt stays in the library — ${theme}`, async ({
    page,
  }) => {
    await openViewer(page, theme)
    await openPicker(page)
    await page.locator(PICKER_ROW(TAKEN_ROW)).click()
    await page.locator('[role="dialog"]').last().locator('.mn-btn:has-text("Replace")').click()

    // ONE DIALOG AGAIN, back on the viewer, now linked to the taken row.
    expect(await openDialogNames(page)).toEqual([RECEIPT])
    await expect(page.locator('.mvp-receipt-viewer__link .mn-list-item__amount')).toHaveText(
      `-${TAKEN_ROW}`,
    )

    await page.locator('.mn-modal__header-side--end .mn-btn').click()
    const links = await libraryLinks(page)
    // DISPLACED, NOT DELETED — still present, and no longer linked.
    expect(Object.keys(links)).toContain(TAKEN_RECEIPT)
    expect(links[TAKEN_RECEIPT], 'the displaced receipt is unlinked').toBe(false)
    expect(links[RECEIPT], 'the picked receipt is linked').toBe(true)
    expect(Object.keys(links).length, 'nothing left the library').toBe(10)

    // AND THE LEDGER DID NOT MOVE.
    await activateTab(page, TRANSACTIONS_TAB)
    expect(await ledgerAmount(page, 'Caring Pharmacy', '13 Sept, 18:50')).toBe(`-${TAKEN_ROW}`)
  })

  /* ─────────────────────────────────────────────────── the editor, item E ── */

  test(`Save is disabled until the draft is valid AND changed — ${theme}`, async ({ page }) => {
    await openViewer(page, theme)
    await page.locator('.mvp-receipt-details .mn-link').click()
    const save = page.locator('.mn-modal__footer .mn-btn')
    await expect(save).toHaveText('Save changes')

    await expect(save, 'untouched draft').toBeDisabled()

    await page.locator('.mvp-receipt-editor input[type="text"]').fill('Aeon Big Wangsa Maju')
    await expect(save, 'valid and changed').toBeEnabled()

    // INVALID BEATS CHANGED: an empty required field re-disables it.
    await page.locator('.mvp-receipt-editor input[type="text"]').fill('')
    await expect(save, 'changed but invalid').toBeDisabled()

    // A total of zero is invalid too — a receipt for nothing is not a receipt.
    await page.locator('.mvp-receipt-editor input[type="text"]').fill('Aeon Big Wangsa Maju')
    await page.locator('.mvp-receipt-editor input[type="number"]').fill('0')
    await expect(save, 'zero total').toBeDisabled()

    // AND BACK TO THE SEEDED VALUES DISABLES IT AGAIN — `isChanged`, not a flag.
    await page.locator('.mvp-receipt-editor input[type="text"]').fill('Aeon Big')
    await page.locator('.mvp-receipt-editor input[type="number"]').fill('429.19')
    await expect(save, 'edited back to the stored values').toBeDisabled()
  })

  test(`the editor saves all four fields, in LOCAL wall-clock, writing no transaction — ${theme}`, async ({
    page,
  }) => {
    await openViewer(page, theme)
    await page.locator('.mvp-receipt-details .mn-link').click()

    await page.locator('.mvp-receipt-editor input[type="text"]').fill('Aeon Big Wangsa Maju')
    await page.locator('.mvp-receipt-editor input[type="date"]').fill('2025-09-03')
    await page.locator('.mvp-receipt-editor input[type="time"]').fill('20:34')
    await page.locator('.mvp-receipt-editor input[type="number"]').fill('431.00')
    await page.locator('.mn-modal__footer .mn-btn').click()

    // FLIPPED BACK TO THE VIEWER, showing what was saved.
    expect(await openDialogNames(page)).toEqual([RECEIPT])
    await expect(page.locator('.mvp-receipt-details__rows')).toHaveText(
      'MerchantAeon Big Wangsa MajuDate03 Sept, 20:34TotalRM 431.00',
    )

    /*
      ── ZONE-LESS LOCAL WALL-CLOCK, PROVEN THROUGH THE RENDER ────────────────
      `formatTimestamp` parses the stored string with `new Date(iso)`, which
      reads a zone-less string as LOCAL. The browser is pinned to
      Asia/Kuala_Lumpur (UTC+8), so a `toISOString` round trip on the way IN
      would have stored `2025-09-03T12:34:00` and this would print `12:34`.
      Printing `20:34` is the proof that nothing put the value through a zone.
    */

    // THE TOTAL MISMATCH LINE APPEARS, because 431.00 is no longer 429.19.
    await expect(page.locator('.mvp-receipt-details__mismatch')).toHaveText(
      "This receipt's total is RM 431.00, and the transaction is RM 429.19.",
    )

    // AND NO TRANSACTION MOVED.
    await page.locator('.mn-modal__header-side--end .mn-btn').click()
    await activateTab(page, TRANSACTIONS_TAB)
    expect(await ledgerAmount(page, 'Aeon Big', '04 Sept, 13:45')).toBe(`-${LINKED_ROW}`)
  })

  test(`editing does NOT re-run auto-match — ${theme}`, async ({ page }) => {
    /*
      ── THE RUN-ONCE RULING, LOAD-TESTED FROM A SECOND DIRECTION ─────────────
      Auto-match is locked to add time (Gate 50-C), and `automatch.spec.ts`
      proves a re-render and an unlink do not re-run it. AN EDIT IS THE NEW WAY
      IN: `updateReceipt` writes the three fields auto-match reads, so an
      implementation that re-matched "because the fields changed" would look
      entirely reasonable and would silently re-link the receipt the user had
      just taken away from its row.

      THE SETUP IS DELIBERATELY THE WORST CASE. After the unlink,
      `txn-aeon-0904` is receipt-less and this receipt's stored fields match it
      on all three criteria — so a re-run WOULD link it. The test first proves
      that (the picker offers it as the sole suggestion), which is what stops
      the assertion below passing vacuously.
    */
    await openViewer(page, theme)
    await openPicker(page)
    await expect(
      page.locator('.mvp-link-picker__group').first().locator('.mn-list-item__amount'),
      'the receipt WOULD re-link to this row if anything re-ran the matcher',
    ).toHaveText(`-${LINKED_ROW}`)

    // Back out of the picker and edit a field instead.
    await page.locator('.mn-modal__title-group .mn-btn').click()
    await page.locator('.mvp-receipt-details .mn-link').click()
    await page.locator('.mvp-receipt-editor input[type="text"]').fill('Aeon Big Wangsa Maju')
    await page.locator('.mn-modal__footer .mn-btn').click()

    // STILL UNLINKED: no pill, no row, and the footer still offers to link.
    await expect(page.locator('.mvp-receipt-viewer__link')).toHaveCount(0)
    await expect(page.locator('.mn-modal__footer')).toHaveText(
      'Link to transactionDelete receipt',
    )

    // And on the tab behind it, the card is still the unlinked variant.
    await page.locator('.mn-modal__header-side--end .mn-btn').click()
    expect((await libraryLinks(page))[RECEIPT]).toBe(false)
  })

  test(`the mismatch line is absent while the two figures agree — ${theme}`, async ({ page }) => {
    await openViewer(page, theme)
    /*
      THE NEGATIVE HALF, AND IT IS THE ONE THAT COULD PASS VACUOUSLY. Gate 48
      reconciled every linked amount to its receipt's printed total, so the
      seeded state agrees to the sen and the line must NOT render. The test
      above proves the same selector DOES render when they differ, so the two
      together bound the condition rather than only one side of it.
    */
    await expect(page.locator('.mvp-receipt-details')).toHaveCount(1)
    await expect(page.locator('.mvp-receipt-details__mismatch')).toHaveCount(0)
  })

  test(`Back returns to the viewer and discards an unsaved edit — ${theme}`, async ({ page }) => {
    await openViewer(page, theme)
    await page.locator('.mvp-receipt-details .mn-link').click()
    await page.locator('.mvp-receipt-editor input[type="text"]').fill('Typed and abandoned')

    const back = page.locator('.mn-modal__title-group .mn-btn')
    await expect(back).toHaveAccessibleName('Back to receipt')
    await back.click()

    expect(await openDialogNames(page)).toEqual([RECEIPT])
    await expect(page.locator('.mvp-receipt-details__rows')).toContainText('Aeon Big')
    await expect(page.locator('.mvp-receipt-details__rows')).not.toContainText(
      'Typed and abandoned',
    )

    // REOPENING SEEDS FROM WHAT IS STORED, not from the abandoned draft.
    await page.locator('.mvp-receipt-details .mn-link').click()
    await expect(page.locator('.mvp-receipt-editor input[type="text"]')).toHaveValue('Aeon Big')
  })

  /* ───────────────────────────────────────── the fallbacks, item D ── */

  test(`the details block shows the display fallbacks for unread fields — ${theme}`, async ({
    page,
  }) => {
    await gotoRoute(page, '/finance', theme)
    await activateTab(page, RECEIPTS_TAB)

    /*
      A CAPTURE WITH NOTHING READ. `ExtractedReceipt`'s three nullable fields all
      come back `null`, which is exactly what the real engine returns for a
      photograph it cannot parse — measured at Gate 50-B on two of the ten
      seeded receipts' dates. `capturedToReceipt` then fills each with its
      display fallback, and this is the first surface in the app that shows any
      of them.
    */
    await installResolvingExtraction(page, {
      merchant: null,
      capturedAt: null,
      total: null,
      tax: null,
      currency: 'MYR',
      lineItems: [],
    })
    await saveOneCapture(page)

    const captured = page.locator(CARD('receipt-capture.jpg'))
    await expect(captured).toHaveCount(1)
    await captured.click()

    const rows = page.locator('.mvp-receipt-details__rows')
    // THE FILE'S OWN NAME WHERE A MERCHANT SHOULD BE — recognisably not a
    // merchant, which is the point: it reads as "unread", not as a claim.
    await expect(rows).toContainText('receipt-capture.jpg')
    // ZERO, NEVER A GUESS.
    await expect(rows).toContainText('RM 0.00')
    // AND THE CAPTURE MOMENT for the date — the harness pins the clock to
    // 2026-08-15, so a fallback date is that day and a read one could not be.
    await expect(rows).toContainText('15 Aug')
  })
}
