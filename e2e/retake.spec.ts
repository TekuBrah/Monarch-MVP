import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { PINNED_NOW, activateTab, gotoRoute } from './harness'
import {
  FIXTURE,
  RECEIPTS_TAB,
  TRANSACTIONS_TAB,
  capturedImageName,
  installResolvingExtraction,
  printedMagnitude,
  saveOneCapture,
} from './capture'
import { receiptReadFailed } from '../src/data/derive'
import { firstPassFailed } from '../src/data/ocr/secondPass'
import { autoMatchBatch, type MatchFields } from '../src/data/autoMatch'
import { RECEIPTS } from '../src/data/receipts'
import { TRANSACTIONS } from '../src/data/transactions'
import type { Receipt, Transaction } from '../src/data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE FAILED-READING ADVISORY AND THE RETAKE — Gate 60, RESHAPED AT GATE 61.
 *
 * The three walk states `add-unread`, `view-unread` and `detail-unread`
 * photograph the advisory. What a screenshot cannot say is WHEN it appears,
 * what a retake OPENS, and — since Gate 61 — what a retake REPLACES. So those
 * are here.
 *
 * ─────── TWO TESTS WERE REWRITTEN IN PLACE, NOT ADDED BESIDE ────────────────
 *
 * Gate 60's retake ADDED a receipt and left the original alone, and two tests
 * asserted exactly that: "original untouched" and "leaves the original linked".
 * Decision 1 reverses it, so those two assert replacement now. They were
 * REWRITTEN rather than left passing beside new ones — a suite that asserts
 * both behaviours at once is how a contradiction survives a green run.
 *
 * NO FIGURE FROM ANY RECEIPT. The readable extraction below is invented, and was
 * checked against the token set of every corpus image before it was used.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** An extraction that read nothing — the shape a failed page produces. */
const UNREAD = {
  merchant: null,
  capturedAt: null,
  total: null,
  tax: null,
  currency: 'MYR',
  lineItems: [],
}

/**
 * An extraction that read — INVENTED values. The total matches no ledger row,
 * so auto-match leaves it unlinked, which is what isolates the retake's own
 * linking behaviour from auto-match's: a replacement that comes back LINKED can
 * only have INHERITED the link.
 */
const READ = {
  merchant: 'Kedai Contoh',
  capturedAt: '2026-08-14T10:47:00',
  total: 61.37,
  tax: null,
  currency: 'MYR',
  lineItems: [{ name: 'Sample widget', quantity: '1', price: 61.37 }],
}

/** A stored receipt with this many line items and this total (`null` = unread). */
function asRecord(lineItems: number, total: number | null): Receipt {
  return {
    ...RECEIPTS[0],
    lineItems: Array.from({ length: lineItems }, (_, i) => ({
      name: `line ${i}`,
      quantity: '1',
      price: 1,
    })),
    // THE STORED SHAPE: `capturedToReceipt` writes an unread total as 0.
    total: total ?? 0,
    sourceUrl: 'blob:probe',
  }
}

test.describe('the rule — Node, no browser', () => {
  test('the advisory rule IS the second-pass trigger, applied to the stored record', () => {
    for (const items of [0, 1, 3]) {
      for (const total of [null, 0.07, 12.5]) {
        expect(
          receiptReadFailed(asRecord(items, total)),
          `${items} item(s), total ${total}: the stored record and the reading disagree`,
        ).toBe(firstPassFailed({ lineItems: asRecord(items, total).lineItems, total }))
      }
    }
  })

  test('no transcribed receipt can show the advisory', () => {
    expect(RECEIPTS.filter(receiptReadFailed).map((r) => r.id)).toEqual([])
  })
})

async function openReceipts(page: Page): Promise<void> {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, RECEIPTS_TAB)
}

/** The top card is the newest ADDED (Gate 58), i.e. the one just saved. */
function newestCard(page: Page) {
  return page.locator('.mvp-receipt-card').first()
}

const viewer = (page: Page) => page.locator('[role="dialog"][aria-modal="true"]')

/**
 * THE NEWEST RECEIPT-LESS MERCHANT OUTFLOW — `automatch.spec.ts`'s derivation,
 * repeated here rather than exported from a spec file. It is the row a fresh
 * photograph can legitimately be matched to.
 */
function receiptLessRow(): Transaction {
  const linked = new Set(RECEIPTS.map((r) => r.transactionId))
  const [newest] = TRANSACTIONS.filter(
    (t) => !linked.has(t.id) && t.amount < 0 && t.logo.kind === 'merchant',
  ).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  if (!newest) throw new Error('the seed has no receipt-less merchant outflow')
  return newest
}

/** An extraction whose three rule fields are exactly that row's. */
function extractionFor(t: Transaction): Record<string, unknown> {
  return {
    merchant: t.merchant,
    capturedAt: t.occurredAt,
    total: -t.amount,
    tax: null,
    currency: t.currency,
    lineItems: [],
  }
}

/**
 * COLLECT EVERY `URL.revokeObjectURL` THE PAGE MAKES FROM NOW ON —
 * `receipt-viewer.spec.ts`'s delete probe, reused for the same question.
 */
async function watchRevokes(page: Page): Promise<void> {
  await page.evaluate(() => {
    const revoke = URL.revokeObjectURL.bind(URL)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    w.__revoked = []
    URL.revokeObjectURL = (url: string) => {
      w.__revoked.push(url)
      revoke(url)
    }
  })
}

async function revoked(page: Page): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return page.evaluate(() => (window as any).__revoked as string[])
}

test.describe('the advisory and the retake — browser', () => {
  test('a gallery retake REPLACES the receipt it retakes, and releases its image', async ({
    page,
  }) => {
    await openReceipts(page)
    const cards = page.locator('.mvp-receipt-card')
    await expect(cards).toHaveCount(10)
    await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(0)

    await installResolvingExtraction(page, UNREAD)
    await saveOneCapture(page, 'Photo Gallery')
    await expect(cards).toHaveCount(11)

    // THE CARD SAYS SO, AND ONLY THAT CARD.
    await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(1)
    await expect(newestCard(page).locator('.mvp-receipt-card__advisory')).toHaveText(
      "Couldn't read this photo",
    )

    // THE VIEWER CARRIES THE FULL ADVISORY — and every ordinary action still.
    await newestCard(page).click()
    const advisory = viewer(page).locator('.mn-inline-message')
    await expect(advisory.locator('.mn-inline-message__title')).toHaveText(
      "We couldn't read this photo",
    )
    await expect(advisory.locator('.mn-inline-message__body')).toContainText(
      'no items or total came through',
    )
    await expect(viewer(page).getByRole('button', { name: 'Link to transaction' })).toHaveCount(1)
    await expect(viewer(page).getByRole('button', { name: 'Delete receipt' })).toHaveCount(1)

    // THE ORIGINAL'S OWN BYTES, so the revoke below can be attributed to it.
    const original = await viewer(page).locator('img.mvp-receipt-viewer__image').getAttribute('src')
    expect(original, 'a capture renders from its in-memory bytes').toMatch(/^blob:/)
    await watchRevokes(page)

    // THE RETAKE REOPENS THE GALLERY: no `capture`, and one file only.
    const retake = advisory.getByRole('button', { name: 'Choose another photo' })
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), retake.click()])
    expect(await chooser.element().getAttribute('capture'), 'a gallery retake').toBeNull()
    expect(chooser.isMultiple(), 'a retake replaces ONE photograph').toBe(false)

    await installResolvingExtraction(page, READ)
    await chooser.setFiles(FIXTURE)

    // THE VIEWER MOVES TO THE NEW RECEIPT, WHICH READ — so no advisory.
    await expect(viewer(page).locator('.mvp-receipt-details')).toContainText('Kedai Contoh')
    await expect(viewer(page).locator('.mn-inline-message')).toHaveCount(0)

    await viewer(page).getByRole('button', { name: 'Close' }).click()

    /*
      ── THE ORIGINAL IS GONE — Gate 61 ──────────────────────────────────────
      ELEVEN, NOT TWELVE. This is the whole reversal: Gate 60 left the user
      holding both, and asserted 12 here. And ZERO advisories, which is the
      decisive half — the two captures share a display name under the pinned
      clock, so a count alone could not tell them apart, but only the ORIGINAL
      ever carried a caption.
    */
    await expect(cards, 'the replacement took the original’s place').toHaveCount(11)
    await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(0)
    expect(await revoked(page), 'the replaced image was released').toContain(original)

    /*
      AND IT IS AT THE TOP, under `addedAt` ordering (Decision 11). The ten
      seeded receipts are backfilled from `capturedAt` and are all older, so the
      only capture in the library sorts first. Exactly ONE card carries the
      generated name, which is also what says no duplicate survived.
    */
    const named = page.locator(`.mvp-receipt-card:has-text("${capturedImageName(PINNED_NOW)}")`)
    await expect(named).toHaveCount(1)
    await expect(newestCard(page)).toContainText(capturedImageName(PINNED_NOW))
  })

  test('a camera capture that read nothing retakes with the camera', async ({ page }) => {
    await openReceipts(page)
    await installResolvingExtraction(page, UNREAD)
    await saveOneCapture(page, 'Camera')
    await newestCard(page).click()

    const retake = viewer(page)
      .locator('.mn-inline-message')
      .getByRole('button', { name: 'Retake photo' })
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), retake.click()])
    expect(await chooser.element().getAttribute('capture')).toBe('environment')
    expect(chooser.isMultiple()).toBe(false)
  })

  test('an UNLINKED original: the replacement is subject to auto-match', async ({ page }) => {
    /*
      THE OTHER HALF OF THE LINK RULE. The test above retakes an unlinked
      receipt with an extraction that matches nothing, so it cannot distinguish
      "auto-match ran and found nothing" from "auto-match was skipped". This one
      hands the replacement an extraction that matches EXACTLY ONE receipt-less
      row, so the only way it can come back linked is if auto-match ran.
    */
    const target = receiptLessRow()
    const extracted = extractionFor(target)
    // The pure rule agrees BEFORE the browser is asked.
    expect(
      autoMatchBatch([extracted as unknown as MatchFields], TRANSACTIONS, RECEIPTS),
    ).toEqual([target.id])

    await openReceipts(page)
    await installResolvingExtraction(page, UNREAD)
    await saveOneCapture(page, 'Photo Gallery')
    await newestCard(page).click()
    // NOT VACUOUS: the original is unlinked, so there is no link to inherit.
    await expect(viewer(page).getByRole('button', { name: 'Link to transaction' })).toHaveCount(1)

    const retake = viewer(page)
      .locator('.mn-inline-message')
      .getByRole('button', { name: 'Choose another photo' })
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), retake.click()])
    await installResolvingExtraction(page, extracted)
    await chooser.setFiles(FIXTURE)

    // THE REPLACEMENT CAME BACK LINKED, TO THAT ROW.
    await expect(viewer(page).getByRole('button', { name: 'Unlink receipt' })).toHaveCount(1)
    const nested = viewer(page).locator('.mn-list-item')
    await expect(nested).toHaveCount(1)
    await expect(nested).toContainText(target.merchant)
    await viewer(page).getByRole('button', { name: 'Close' }).click()

    // ONE CARD, LINKED, AND THE ORIGINAL GONE.
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(11)
    await expect(newestCard(page).locator('.mn-chips')).toHaveText('Linked')

    // AND THE LEDGER AGREES WITH NOTHING WRITTEN TO IT (P6).
    await activateTab(page, TRANSACTIONS_TAB)
    const amount = printedMagnitude(target.amount)
    const row = page.locator(`.mvp-transactions__list > li:has-text("${amount}")`)
    await expect(row).toHaveCount(1)
    await expect(row.locator('.mn-list-item__amount-row svg')).toHaveCount(1)
    await expect(row).toContainText(`-${amount}`)
  })

  test('a LINKED original: the replacement inherits the link and no amount moves', async ({
    page,
  }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, TRANSACTIONS_TAB)
    // EVERY ROW'S PRINTED TEXT BEFORE ANYTHING HAPPENS — the P6 control.
    const ledgerBefore = await page.locator('.mvp-transactions__list > li').allTextContents()
    await installResolvingExtraction(page, UNREAD)

    const row = page.locator('.mvp-transactions__list > li:has-text("RM 250.75") .mn-list-item')
    await row.click()
    const sheet = page.locator('[role="dialog"]:has-text("Transaction details")')
    await sheet.locator('.mvp-txn-detail__prompt .mn-btn').click()
    const gallery = page.locator('.mvp-source-picker__row:has-text("Photo Gallery")')
    const [first] = await Promise.all([page.waitForEvent('filechooser'), gallery.click()])
    await first.setFiles(FIXTURE)

    // THE SHEET SHOWS THE ORIGINAL, LINKED, WITH THE ADVISORY.
    await expect(sheet.locator('.mn-inline-message__title')).toHaveText(
      "We couldn't read this photo",
    )

    const retake = sheet.getByRole('button', { name: 'Choose another photo' })
    const [second] = await Promise.all([page.waitForEvent('filechooser'), retake.click()])
    await installResolvingExtraction(page, READ)
    await second.setFiles(FIXTURE)

    /*
      THE VIEWER OPENS ON THE REPLACEMENT, AND IT IS LINKED — Gate 61. Gate 60
      asserted the opposite here ("UNLINKED: auto-match never takes a
      transaction that already has a receipt, and the retake moves no link").

      THIS IS THE INHERITANCE ASSERTION AND IT CANNOT PASS BY ACCIDENT: `READ`'s
      total matches no ledger row at all, so auto-match could not have produced
      this link. Only inheritance could.
    */
    await expect(viewer(page).locator('.mvp-receipt-details')).toContainText('Kedai Contoh')
    await expect(viewer(page).getByRole('button', { name: 'Unlink receipt' })).toHaveCount(1)
    await expect(viewer(page).locator('.mn-list-item')).toContainText('RM 250.75')
    await expect(viewer(page).locator('.mn-inline-message')).toHaveCount(0)
    await viewer(page).getByRole('button', { name: 'Close' }).click()

    // THE ROW STILL HAS A RECEIPT, AND IT IS THE REPLACEMENT — no advisory now.
    await row.click()
    await expect(sheet.locator('.mvp-txn-detail__receipt-head')).toHaveCount(1)
    await expect(sheet.locator('.mn-inline-message')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)

    // P6 — NOT ONE ROW'S PRINTED TEXT MOVED.
    expect(
      await page.locator('.mvp-transactions__list > li').allTextContents(),
      'a retake writes the receipt collection and never the ledger',
    ).toEqual(ledgerBefore)

    // AND THE LIBRARY HOLDS ONE CAPTURE, NOT TWO.
    await activateTab(page, RECEIPTS_TAB)
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(11)
    await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(0)
  })

  test('a CANCELLED retake creates nothing and removes nothing', async ({ page }) => {
    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, TRANSACTIONS_TAB)
    await installResolvingExtraction(page, UNREAD)

    const row = page.locator('.mvp-transactions__list > li:has-text("RM 250.75") .mn-list-item')
    await row.click()
    const sheet = page.locator('[role="dialog"]:has-text("Transaction details")')
    await sheet.locator('.mvp-txn-detail__prompt .mn-btn').click()
    const gallery = page.locator('.mvp-source-picker__row:has-text("Photo Gallery")')
    const [first] = await Promise.all([page.waitForEvent('filechooser'), gallery.click()])
    await first.setFiles(FIXTURE)
    await expect(sheet.locator('.mn-inline-message__title')).toHaveText(
      "We couldn't read this photo",
    )

    /*
      OPEN THE PICKER AND DISMISS IT. Never calling `setFiles` is what a
      cancelled OS dialog looks like from the page's side: the input's `change`
      never fires, so `onFiles` never runs. (`ReceiptFileInput` separately
      refuses to call `onFiles` with an empty list, for the browsers that fire
      `change` with zero files instead.)
    */
    const retake = sheet.getByRole('button', { name: 'Choose another photo' })
    await Promise.all([page.waitForEvent('filechooser'), retake.click()])

    /*
      THE SHEET NEVER ENTERED ITS PROCESSING STATE. This is the assertion that
      bites: marking the receipt as "being retaken" when the PICKER opens rather
      than when a FILE arrives is the tempting wrong implementation, and it
      strands the surface on `CapturingBlock` forever when the user backs out.
    */
    await expect(sheet.locator('.mvp-capturing')).toHaveCount(0)
    await expect(sheet.locator('.mn-inline-message__title')).toHaveText(
      "We couldn't read this photo",
    )
    await expect(sheet.locator('.mvp-txn-detail__receipt-head')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)

    // NOTHING CREATED, NOTHING REMOVED, THE ORIGINAL STILL LINKED.
    await activateTab(page, RECEIPTS_TAB)
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(11)
    await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(1)
    await expect(newestCard(page).locator('.mn-chips')).toHaveText('Linked')
  })

  test('a CHAINED retake: the replacement of a replacement, with both earlier ones gone', async ({
    page,
  }) => {
    await openReceipts(page)
    await installResolvingExtraction(page, UNREAD)
    await saveOneCapture(page, 'Photo Gallery')
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(11)
    await newestCard(page).click()

    /*
      RETAKE ONCE INTO ANOTHER UNREADABLE PHOTOGRAPH. The replacement is an
      ORDINARY receipt, so it shows the advisory itself — there is no special
      case for "this one is already a replacement" and no limit on the chain.
    */
    const advisory = () => viewer(page).locator('.mn-inline-message')
    const retakeButton = () => advisory().getByRole('button', { name: 'Choose another photo' })

    const [one] = await Promise.all([page.waitForEvent('filechooser'), retakeButton().click()])
    await installResolvingExtraction(page, UNREAD)
    await one.setFiles(FIXTURE)
    await expect(advisory().locator('.mn-inline-message__title')).toHaveText(
      "We couldn't read this photo",
    )
    // ONE CAPTURE IN THE LIBRARY, NOT TWO — the chain does not accumulate.
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(11)

    // AND AGAIN, THIS TIME INTO A PHOTOGRAPH THAT READS.
    const [two] = await Promise.all([page.waitForEvent('filechooser'), retakeButton().click()])
    await installResolvingExtraction(page, READ)
    await two.setFiles(FIXTURE)
    await expect(viewer(page).locator('.mvp-receipt-details')).toContainText('Kedai Contoh')
    await expect(viewer(page).locator('.mn-inline-message')).toHaveCount(0)
    await viewer(page).getByRole('button', { name: 'Close' }).click()

    // THREE PHOTOGRAPHS TAKEN, ONE RECEIPT KEPT.
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(11)
    await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(0)
    await expect(
      page.locator(`.mvp-receipt-card:has-text("${capturedImageName(PINNED_NOW)}")`),
    ).toHaveCount(1)
  })

  test('a capture that read shows no advisory anywhere', async ({ page }) => {
    await openReceipts(page)
    await installResolvingExtraction(page, READ)
    await saveOneCapture(page, 'Photo Gallery')
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(11)
    await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(0)
    await newestCard(page).click()
    await expect(viewer(page).locator('.mvp-receipt-details')).toContainText('Kedai Contoh')
    await expect(viewer(page).locator('.mn-inline-message')).toHaveCount(0)
  })

  test('half a reading: the advisory names the half that did not come through', async ({
    page,
  }) => {
    await openReceipts(page)

    // ITEMS, NO TOTAL — then A TOTAL, NO ITEMS.
    await installResolvingExtraction(page, { ...READ, total: null })
    await saveOneCapture(page, 'Photo Gallery')
    await installResolvingExtraction(page, { ...READ, lineItems: [] })
    await saveOneCapture(page, 'Photo Gallery')

    /*
      BOTH CARDS, READ WITHOUT ASSUMING WHICH IS ON TOP. The harness pins the
      clock, so both saves carry the same `addedAt` and their order is the
      tie-break (library order, Gate 58) rather than anything this test is
      about. Each flagged card is opened and its sentence collected.
    */
    const flagged = page.locator('.mvp-receipt-card:has(.mvp-receipt-card__advisory)')
    await expect(flagged).toHaveCount(2)
    const bodies: string[] = []
    for (let i = 0; i < 2; i += 1) {
      await flagged.nth(i).click()
      bodies.push(await viewer(page).locator('.mn-inline-message__body').innerText())
      await viewer(page).getByRole('button', { name: 'Close' }).click()
    }
    expect(bodies.some((b) => b.includes("the total didn't come through"))).toBe(true)
    expect(bodies.some((b) => b.includes('no items came through'))).toBe(true)
    expect(bodies.some((b) => b.includes('no items or total'))).toBe(false)
  })

  test('the advisory is the DS InlineMessage: warning in the viewer and the sheet, a caption on the card, and it blocks nothing', async ({
    page,
  }) => {
    /*
      GATE 63. The hand-rolled advisory was replaced by the DS component. What
      this pins, and what a screenshot cannot: WHICH component renders, in WHICH
      tone and frame at each site, WHICH glyph the retake carries (identified by
      its own geometry, never by the prop that asked for it), that the card
      stayed a caption, and that nothing around the message is blocked.
    */
    const cameraPath = /<path d="([^"]+)"/.exec(
      readFileSync('node_modules/@material-design-icons/svg/round/photo_camera.svg', 'utf8'),
    )?.[1]
    expect(cameraPath, 'the photo_camera glyph file carries a path').toBeTruthy()

    await openReceipts(page)
    await installResolvingExtraction(page, UNREAD)
    await saveOneCapture(page, 'Photo Gallery')

    // NON-BLOCKING SAVE: the unreadable capture WAS saved, and the modal closed.
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(11)
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)

    // THE CARD STAYS A CAPTION — never a message block inside a card row.
    const caption = newestCard(page).locator('.mvp-receipt-card__advisory')
    await expect(caption).toHaveText("Couldn't read this photo")
    await expect(caption).toHaveClass(/type-body-caption/)
    await expect(page.locator('.mvp-receipt-card .mn-inline-message')).toHaveCount(0)

    // THE VIEWER: framed, warning, named by its title, glyph shown.
    await newestCard(page).click()
    const inViewer = viewer(page).locator('.mn-inline-message')
    await expect(inViewer).toHaveCount(1)
    await expect(inViewer).toHaveClass(/mn-inline-message--warning/)
    await expect(inViewer).toHaveClass(/mn-inline-message--framed/)
    await expect(viewer(page).getByRole('group', { name: "We couldn't read this photo" })).toHaveCount(1)
    await expect(inViewer.locator('.mn-inline-message__icon svg')).toHaveCount(1)
    const viewerRetake = inViewer.getByRole('button', { name: 'Choose another photo' })
    await expect(viewerRetake.locator('path')).toHaveAttribute('d', cameraPath!)

    // BLOCKS NOTHING: every ordinary action stays operable, and focus is not
    // pulled into the message.
    for (const name of ['Link to transaction', 'Delete receipt', 'Close']) {
      await expect(viewer(page).getByRole('button', { name })).toBeEnabled()
    }
    // The details block's Edit is a `SectionHeader` link, not a button.
    await expect(viewer(page).getByRole('link', { name: 'Edit' })).toBeVisible()
    expect(
      await inViewer.evaluate((el) => el.contains(document.activeElement)),
      'the message never takes focus',
    ).toBe(false)
    await viewer(page).getByRole('button', { name: 'Close' }).click()

    // THE SHEET: unframed, warning, glyph shown.
    await activateTab(page, TRANSACTIONS_TAB)
    await page.locator('.mvp-transactions__list > li:has-text("RM 250.75") .mn-list-item').click()
    const sheet = page.locator('[role="dialog"]:has-text("Transaction details")')
    await sheet.locator('.mvp-txn-detail__prompt .mn-btn').click()
    const gallery = page.locator('.mvp-source-picker__row:has-text("Photo Gallery")')
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), gallery.click()])
    await chooser.setFiles(FIXTURE)
    const inSheet = sheet.locator('.mn-inline-message')
    await expect(inSheet).toHaveCount(1)
    await expect(inSheet).toHaveClass(/mn-inline-message--warning/)
    await expect(inSheet).not.toHaveClass(/mn-inline-message--framed/)
    await expect(inSheet.locator('.mn-inline-message__icon svg')).toHaveCount(1)
    await expect(
      inSheet.getByRole('button', { name: 'Choose another photo' }).locator('path'),
    ).toHaveAttribute('d', cameraPath!)
  })

  test('the seeded library shows no advisory', async ({ page }) => {
    await openReceipts(page)
    await expect(page.locator('.mvp-receipt-card')).toHaveCount(10)
    await expect(page.locator('.mvp-receipt-card__advisory')).toHaveCount(0)
    // One viewer, opened through its card, as the proof the viewer agrees.
    await page.locator('.mvp-receipt-card').first().click()
    await expect(viewer(page).locator('.mvp-receipt-details')).toHaveCount(1)
    await expect(viewer(page).locator('.mn-inline-message')).toHaveCount(0)
  })
})
