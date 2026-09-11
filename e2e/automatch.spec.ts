import { expect, test } from '@playwright/test'
import { activateTab, gotoRoute } from './harness'
import {
  RECEIPTS_TAB,
  TRANSACTIONS_TAB,
  glyphRowCount,
  installResolvingExtraction,
  printedMagnitude,
  saveOneCapture,
} from './capture'
import { autoMatchBatch, candidatesFor, type MatchFields } from '../src/data/autoMatch'
import { RECEIPTS } from '../src/data/receipts'
import { TRANSACTIONS } from '../src/data/transactions'
import type { Receipt, Transaction } from '../src/data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTO-MATCH (Gate 50-C) — THE RULE, AND THE ONE PLACE IT IS WIRED.
 *
 * NO BASELINE AND NO WALK STATE. Every walk state runs `installExtractionStub`,
 * whose promise never settles, so no walk state ever reaches the point where
 * auto-match runs — that is why this gate could add behaviour without moving a
 * single screenshot. What it adds is asserted here instead, as behaviour.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RULE TESTS IMPORT THE MODULE INTO PLAYWRIGHT'S NODE CONTEXT — NOT INTO A
 * PAGE THE WAY `ocr.spec.ts` DOES — AND THE CHOICE IS FORCED BY WHAT EACH ONE
 * TESTS.
 *
 * `ocr.spec.ts` needs a browser: the engine is a Web Worker running
 * WebAssembly, and only a page can run it. `src/data/autoMatch.ts` needs
 * nothing of the kind. It imports `types.ts` (types only, erased), `derive.ts`
 * and through it `today.ts` and `transactions.ts` — no DS runtime, no
 * `window`, no `File`, no `?url` asset — so it runs in Node as it is. Checked,
 * not assumed: `derive.ts`'s one import from `@monarch/design-system` is
 * `import type`, and `today.ts` reads `new Date()` and nothing else.
 *
 * THREE THINGS THE NODE ROUTE BUYS: the tests take no page and no dev-server
 * module, so they cost milliseconds rather than a navigation each; they run in
 * a `vite preview` configuration too, where the in-page `/src/...` import is
 * impossible (the Gate 22 limitation `ocr.spec.ts` records); and the fixtures
 * are the REAL `TRANSACTIONS` and `RECEIPTS`, imported rather than restated, so
 * a change to the ledger is a change to what these tests check.
 *
 * `ocr.spec.ts` restates its type to avoid a circular check. That argument does
 * not transfer: the thing under test here IS this module, so importing it is
 * the point, not a hazard.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE AMBIGUITY BRANCH IS TESTED ONLY ON CONSTRUCTED DATA, AND HAS TO BE. After
 * Gate 48's reconciliation no two of the 23 rows share a magnitude, so "two
 * candidates" can never arise from the seed. The constructed rows below exist
 * for that reason and no other.
 */

/** What a receipt's own transcription says, as the rule reads it. */
function fieldsOf(receipt: Receipt): MatchFields {
  return { merchant: receipt.merchant, capturedAt: receipt.capturedAt, total: receipt.total }
}

/** The library with one receipt taken out — as if that photo were brand new. */
function libraryWithout(receiptId: string): Receipt[] {
  return RECEIPTS.filter((r) => r.id !== receiptId)
}

function seededReceipt(id: string): Receipt {
  const receipt = RECEIPTS.find((r) => r.id === id)
  if (!receipt) throw new Error(`no seeded receipt ${id}`)
  return receipt
}

function seededRow(id: string | null): Transaction {
  const row = TRANSACTIONS.find((t) => t.id === id)
  if (!row) throw new Error(`no ledger row ${id}`)
  return row
}

/** A constructed ledger row. Only the four fields the rule reads vary. */
function row(id: string, merchant: string, amount: number, occurredAt: string): Transaction {
  return {
    id,
    accountId: 'main',
    merchant,
    logo: { kind: 'merchant', name: 'ikea' },
    method: 'Card Payment',
    amount,
    currency: 'MYR',
    occurredAt,
    category: 'shopping',
  }
}

/** `receipt-ikea02` — IKEA, 06 Sept 08:00, RM 137.59 — the control case. */
const IKEA02 = seededReceipt('receipt-ikea02')
const IKEA02_ROW = seededRow(IKEA02.transactionId)

// ═════════════════════════════════════════════════════════════ THE RULE ════

test.describe('auto-match — the rule', () => {
  test('exactly one candidate links', () => {
    const fields = fieldsOf(IKEA02)
    const library = libraryWithout(IKEA02.id)
    expect(candidatesFor(fields, TRANSACTIONS, library).map((t) => t.id)).toEqual([IKEA02_ROW.id])
    expect(autoMatchBatch([fields], TRANSACTIONS, library)).toEqual([IKEA02_ROW.id])
  })

  test('zero candidates stay unlinked', () => {
    // RM 137.60 — one sen off the real total. Exact to the sen means exactly.
    const fields = { ...fieldsOf(IKEA02), total: 137.6 }
    const library = libraryWithout(IKEA02.id)
    expect(candidatesFor(fields, TRANSACTIONS, library)).toEqual([])
    expect(autoMatchBatch([fields], TRANSACTIONS, library)).toEqual([null])
  })

  test('two candidates stay unlinked', () => {
    // CONSTRUCTED — the seed has no duplicate magnitudes (see the header).
    const ledger = [
      row('a', 'IKEA', -99.9, '2025-09-05T10:00:00'),
      row('b', 'IKEA', -99.9, '2025-09-07T18:30:00'),
    ]
    const fields = { merchant: 'IKEA', capturedAt: '2025-09-06T12:00:00', total: 99.9 }
    expect(candidatesFor(fields, ledger, []).map((t) => t.id)).toEqual(['a', 'b'])
    expect(autoMatchBatch([fields], ledger, [])).toEqual([null])
    // The control: take either one away and the other links, so it is the
    // ambiguity — and nothing else — that held the receipt back.
    expect(autoMatchBatch([fields], [ledger[0]], [])).toEqual(['a'])
    expect(autoMatchBatch([fields], [ledger[1]], [])).toEqual(['b'])
  })

  test('the date window is 3 calendar days both ways, inclusive: day 3 links, day 4 does not', () => {
    // The receipt prints 10 Sept at noon. Calendar days, wall-clock frame, the
    // time of day ignored — so 13 Sept 23:59 is day 3 and links although it is
    // 3 days 11 hours 59 minutes away, and 14 Sept 00:00 is day 4 and does not.
    const fields = { merchant: 'IKEA', capturedAt: '2025-09-10T12:00:00', total: 50 }
    const cases: [string, string | null][] = [
      ['2025-09-13T23:59:00', 'r'], // day +3
      ['2025-09-14T00:00:00', null], // day +4
      ['2025-09-07T00:00:00', 'r'], // day -3
      ['2025-09-06T23:59:00', null], // day -4
    ]
    for (const [occurredAt, expected] of cases) {
      expect(
        autoMatchBatch([fields], [row('r', 'IKEA', -50, occurredAt)], []),
        `a row at ${occurredAt} against a receipt printed 2025-09-10`,
      ).toEqual([expected])
    }
  })

  test('a null total stays unlinked', () => {
    const library = libraryWithout(IKEA02.id)
    expect(autoMatchBatch([fieldsOf(IKEA02)], TRANSACTIONS, library)).toEqual([IKEA02_ROW.id])
    expect(autoMatchBatch([{ ...fieldsOf(IKEA02), total: null }], TRANSACTIONS, library)).toEqual([
      null,
    ])
  })

  test('a null date stays unlinked', () => {
    const library = libraryWithout(IKEA02.id)
    expect(autoMatchBatch([fieldsOf(IKEA02)], TRANSACTIONS, library)).toEqual([IKEA02_ROW.id])
    expect(
      autoMatchBatch([{ ...fieldsOf(IKEA02), capturedAt: null }], TRANSACTIONS, library),
    ).toEqual([null])
  })

  test('a null merchant stays unlinked', () => {
    const library = libraryWithout(IKEA02.id)
    expect(autoMatchBatch([fieldsOf(IKEA02)], TRANSACTIONS, library)).toEqual([IKEA02_ROW.id])
    expect(
      autoMatchBatch([{ ...fieldsOf(IKEA02), merchant: null }], TRANSACTIONS, library),
    ).toEqual([null])
  })

  test('a transaction that already has a receipt is not a candidate', () => {
    // A SECOND PHOTO OF AN ALREADY-LINKED RECEIPT. Its own row is linked in the
    // full library, so it is not a candidate and the photo stays unlinked —
    // auto-match never displaces a receipt the user already has.
    expect(candidatesFor(fieldsOf(IKEA02), TRANSACTIONS, RECEIPTS)).toEqual([])
    expect(autoMatchBatch([fieldsOf(IKEA02)], TRANSACTIONS, RECEIPTS)).toEqual([null])
    // The control: the same photo with that receipt out of the library links.
    expect(autoMatchBatch([fieldsOf(IKEA02)], TRANSACTIONS, libraryWithout(IKEA02.id))).toEqual([
      IKEA02_ROW.id,
    ])
  })

  test('two receipts in one batch claiming one transaction link to neither, in both batch orders', () => {
    const ledger = [
      row('x', 'IKEA', -80, '2025-09-10T10:00:00'),
      row('y', 'Giant', -30, '2025-09-10T11:00:00'),
    ]
    const first = { merchant: 'IKEA', capturedAt: '2025-09-10T10:00:00', total: 80 }
    const second = { merchant: 'IKEA Southeast Asia', capturedAt: '2025-09-11T09:00:00', total: 80 }
    const other = { merchant: 'Giant Hypermarket', capturedAt: '2025-09-10T11:00:00', total: 30 }

    // Each alone would link to x — so it is the batch, not the fields, that
    // decides the outcome below.
    expect(autoMatchBatch([first], ledger, [])).toEqual(['x'])
    expect(autoMatchBatch([second], ledger, [])).toEqual(['x'])

    expect(autoMatchBatch([first, second, other], ledger, [])).toEqual([null, null, 'y'])
    expect(autoMatchBatch([other, second, first], ledger, [])).toEqual(['y', null, null])
  })

  test('a legal-entity merchant links to its brand', () => {
    // "IKEA Southeast Asia" is what the real engine reads off this receipt's
    // letterhead (Gate 50-B, `ocr.spec.ts`); the ledger's payee is "IKEA".
    const fields = { ...fieldsOf(IKEA02), merchant: 'IKEA Southeast Asia' }
    expect(IKEA02_ROW.merchant).toBe('IKEA')
    expect(autoMatchBatch([fields], TRANSACTIONS, libraryWithout(IKEA02.id))).toEqual([
      IKEA02_ROW.id,
    ])
  })

  test('a merchant with a dropped leading character stays unlinked', () => {
    // "KEA Southeast Asia" is what the engine read off a rasterised PDF of the
    // same photograph at Gate 50-B. OUTCOME: UNLINKED, BY DESIGN. "ikea" is
    // four letters, and a one-letter misread is forgiven only in words of six
    // or more — so the user links this one by hand, which is the cheap failure.
    const fields = { ...fieldsOf(IKEA02), merchant: 'KEA Southeast Asia' }
    expect(candidatesFor(fields, TRANSACTIONS, libraryWithout(IKEA02.id))).toEqual([])
    expect(autoMatchBatch([fields], TRANSACTIONS, libraryWithout(IKEA02.id))).toEqual([null])
  })

  test('a credit whose magnitude equals the total is not a candidate', () => {
    // The seed's convention is that a linked row's amount is the receipt total
    // NEGATED. Linking a credit would break that — the amount could only follow
    // the receipt by flipping sign — so only outflows are candidates.
    const fields = { merchant: 'Maybank', capturedAt: '2025-09-07T09:30:00', total: 1500 }
    const credit = seededRow('txn-maybank-0907')
    expect(credit.amount).toBe(1500)
    expect(candidatesFor(fields, TRANSACTIONS, RECEIPTS)).toEqual([])
    expect(autoMatchBatch([fields], [{ ...credit, amount: -1500 }], [])).toEqual([credit.id])
  })

  test('leave-one-out: each seeded receipt links to its own row, and moves no amount', () => {
    for (const receipt of RECEIPTS) {
      const [link] = autoMatchBatch([fieldsOf(receipt)], TRANSACTIONS, libraryWithout(receipt.id))
      expect(link, `${receipt.id} as a fresh photo`).toBe(receipt.transactionId)
      // RULE A8. The link needs no write to the ledger, because the amount
      // ALREADY follows the receipt: exact to the sen, negated.
      expect(Math.round(-seededRow(link).amount * 100), `${receipt.id}'s row amount`).toBe(
        Math.round(receipt.total * 100),
      )
      // And with its own receipt still in the library, the same photo is
      // unlinked — rule 3, across all ten rather than one.
      expect(autoMatchBatch([fieldsOf(receipt)], TRANSACTIONS, RECEIPTS)).toEqual([null])
    }
  })
})

// ═══════════════════════════════════════════════════════════ THE WIRING ════

/**
 * The newest receipt-less OUTFLOW to a merchant in the seed — the row a fresh
 * photo is built from. Derived, not typed: it is whatever the data says it is.
 */
function receiptLessRow(): Transaction {
  const linked = new Set(RECEIPTS.map((r) => r.transactionId))
  const [newest] = TRANSACTIONS.filter(
    (t) => !linked.has(t.id) && t.amount < 0 && t.logo.kind === 'merchant',
  ).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  if (!newest) throw new Error('the seed has no receipt-less merchant outflow')
  return newest
}

/** An `ExtractedReceipt` whose three rule fields are exactly that row's. */
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

// `printedMagnitude`, `installResolvingExtraction`, `saveOneCapture` and
// `glyphRowCount` were declared here until Gate 51 and now live in `capture.ts`,
// shared with `receipt-viewer.spec.ts` and `capture-time.spec.ts`. Only
// `saveOneCapture` changed on the move: it presses the screen-level
// "Add new receipt" where it pressed the first month's "+ Add Receipts".

test.describe('auto-match — wired into the Receipts tab', () => {
  test('a Receipts-tab Save links a fresh capture to its one matching row', async ({ page }) => {
    const target = receiptLessRow()
    const amount = printedMagnitude(target.amount)
    // The pure rule agrees BEFORE the browser is asked, so what the DOM shows
    // below is the wiring carrying the rule's answer, not a second opinion.
    const extracted = extractionFor(target)
    expect(
      autoMatchBatch([extracted as unknown as MatchFields], TRANSACTIONS, RECEIPTS),
    ).toEqual([target.id])

    await gotoRoute(page, '/finance', 'light')
    await installResolvingExtraction(page, extracted)
    await activateTab(page, RECEIPTS_TAB)
    await saveOneCapture(page)

    const card = page.locator('.mvp-receipt-card:has-text("receipt-capture.jpg")')
    await expect(card, 'the capture reached the library').toHaveCount(1)
    await expect(card.locator('.mn-chips'), 'and claims to be linked').toHaveText('Linked')
    const nested = card.locator('.mn-list-item')
    await expect(nested, 'to exactly one transaction').toHaveCount(1)
    await expect(nested).toContainText(target.merchant)
    await expect(nested).toContainText(amount)

    // AND THE LEDGER BEHIND IT AGREES, WITH NOTHING WRITTEN TO THE LEDGER. The
    // row now draws the glyph because the question is asked of the receipt
    // collection — and its amount is the one it always printed (rule A8).
    await activateTab(page, TRANSACTIONS_TAB)
    expect(await glyphRowCount(page), 'one more row carries a receipt').toBe(RECEIPTS.length + 1)
    const ledgerRow = page.locator(`.mvp-transactions__list > li:has-text("${amount}")`)
    await expect(ledgerRow).toHaveCount(1)
    await expect(ledgerRow.locator('.mn-list-item__amount-row svg')).toHaveCount(1)
    await expect(ledgerRow).toContainText(`-${amount}`)
  })

  test('an unlinked receipt stays unlinked after re-render and a later Save (rule A6)', async ({
    page,
  }) => {
    const unlinked = seededReceipt('receipt-aeonbig01')
    const unlinkedRow = seededRow(unlinked.transactionId)

    // NOT VACUOUS: once unlinked, this receipt's OWN fields match its own row
    // again. So if anything re-ran auto-match over the library, it would re-link.
    const afterUnlink = RECEIPTS.map((r) => (r.id === unlinked.id ? { ...r, transactionId: null } : r))
    expect(autoMatchBatch([fieldsOf(unlinked)], TRANSACTIONS, afterUnlink)).toEqual([unlinkedRow.id])

    await gotoRoute(page, '/finance', 'light')
    await activateTab(page, TRANSACTIONS_TAB)

    // ── UNLINK, THROUGH THE REAL CONTROL ────────────────────────────────────
    await page
      .locator(
        `.mvp-transactions__list > li:has-text("${printedMagnitude(unlinkedRow.amount)}") .mn-list-item`,
      )
      .click()
    const sheet = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(sheet).toHaveAccessibleName('Transaction details')
    await sheet.getByRole('button', { name: 'Unlink receipt' }).click()
    await expect(sheet).toContainText('Add a receipt to track what you bought')
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)

    // ── A LATER SAVE, SO AUTO-MATCH GENUINELY RUNS IN THIS SESSION ──────────
    const target = receiptLessRow()
    await installResolvingExtraction(page, extractionFor(target))
    await activateTab(page, RECEIPTS_TAB)
    await saveOneCapture(page)

    // ── AND THE TAB RE-RENDERS, TWICE ───────────────────────────────────────
    await activateTab(page, TRANSACTIONS_TAB)
    await activateTab(page, RECEIPTS_TAB)

    const card = page.locator(`.mvp-receipt-card:has-text("${unlinked.displayName}")`)
    await expect(card, 'the unlinked receipt is still in the library').toHaveCount(1)
    await expect(card.locator('.mn-chips'), 'and still unlinked').toHaveCount(0)
    await expect(card.locator('.mn-list-item')).toHaveCount(0)

    // The Save DID auto-match — its own capture is linked — so the receipt above
    // stayed unlinked because auto-match ran over the batch, not the library.
    await expect(
      page.locator('.mvp-receipt-card:has-text("receipt-capture.jpg") .mn-chips'),
    ).toHaveText('Linked')
  })
})
