import { expect, test } from '@playwright/test'
import { parseReceipt } from '../src/data/ocr/parseReceipt'
import type { OcrLine, OcrResult } from '../src/data/ocr/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE PARSER, ON LINES THE REAL ENGINE ACTUALLY PRODUCED (Gate 54).
 *
 * `parseReceipt` is PURE — it takes an `OcrResult` and returns a value, touching
 * no browser API, no clock and no network — so it can be exercised directly in
 * Playwright's Node context with no dev server, no engine and no image. That is
 * what makes these tests milliseconds rather than the ~4s an OCR run costs, and
 * it is why `automatch.spec.ts` can do the same thing with `autoMatch.ts`.
 *
 * ───────── WHY THE INPUT IS TEXT RATHER THAN THE DEVICE PHOTOGRAPHS ─────────
 *
 * Gate 54 was opened by two real photographs of paper receipts, and THOSE
 * IMAGES ARE DELIBERATELY NOT IN THIS REPO: between them they show a cashier's
 * full name, a member name, partial card numbers (`467851XXXXXX9472`, `MYDEBIT
 * 9472`) and e-invoice QR codes. They are held as local evidence only.
 *
 * WHAT IS REPRODUCED HERE IS THEIR TEXT, AND ONLY THE LINES THE RULES UNDER
 * TEST ACTUALLY READ. Every string below was copied from the engine's measured
 * output for those two receipts — including its misreads, which is the whole
 * point — with every line carrying personal data left out. Nothing here was
 * invented to make a rule pass: where the engine read "Tolal" for "Total" or
 * "11,08" for "11.08", that is what it read.
 *
 * SO THESE ARE PARSER TESTS, NOT ENGINE TESTS, and the distinction is stated
 * rather than blurred. `ocr.spec.ts` is what proves the engine still reads a
 * real image; this proves what the parser does with the lines it is handed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Build an `OcrResult` from plain text.
 *
 * CONFIDENCE IS A CONSTANT, because none of the rules under test reads it —
 * `parseReceipt` reports confidence but never branches on it. A varying value
 * here would imply a dependency that does not exist.
 */
function ocr(...text: string[]): OcrResult {
  const lines: OcrLine[] = text.map((t) => ({
    text: t,
    words: t
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => ({ text: w, confidence: 80 })),
  }))
  return { lines, confidence: 80 }
}

test.describe('the grand total is chosen by the label next to the figure', () => {
  /*
    THE TWO-COLUMN ROW IS THE CASE THAT BROKE THE OLD RULE, and it cannot be
    fixed by looking at whole lines. A receipt prints two labelled figures on one
    physical row, so the row carrying the real total ALSO carries the word
    "Saving", and the row carrying the subtotal ALSO carries the word "Total".
    Judging either as a unit gets the wrong answer.
  */
  test('a two-column layout: Sub Total is skipped, Total is taken', () => {
    const parsed = parseReceipt(
      ocr(
        'Total Item 6 Sub Total 70.84',
        'Total Qty © Rounding 0.01',
        'Total Saving 1.51 Total 70.85',
      ),
    )
    // 70.84 is the SUBtotal and was what the previous rule returned, because it
    // matched `/\btotal\b/i` on the first line and took the last amount.
    expect(parsed.total).toBe(70.85)
  })

  test('a rounding line labelled "Total Rounding" is not the total', () => {
    /*
      MEASURED ON THE iFRUITS RECEIPT, where the engine reads the two genuine
      total rows as "Tolal" — a t/l misread — so the only line matching
      `/\btotal\b/i` with an amount was the RM 0.00 rounding row. The old rule
      returned 0, which is exactly what the device reported: "Subtotal RM 0.00,
      Total RM 0.00".

      THE FIGURE IS RECOVERED FROM THE TENDER LINE, which `parseReceipt` has
      always used as its fallback, and is a real statement of the same amount.
      No OCR-tolerant spelling of "total" was added — that would be fitting the
      parser to one receipt.
    */
    const parsed = parseReceipt(
      ocr(
        'Sub Tolal RM 38.60',
        'Total Rounding RM 0.00',
        'Tolal Payment (Rounding) RM 38.60',
        'Card(MYDEBIT) RM 38.60',
        'Total Cash Paid RM0.00 7)',
      ),
    )
    expect(parsed.total).toBe(38.6)
  })

  test('an ordinary single-column receipt is unchanged', () => {
    // THE REGRESSION ARM. This is the AEON shape, which ten seeded receipts
    // share and which the previous rule already read correctly.
    const parsed = parseReceipt(
      ocr('Subtotal 404.90', 'SST (6%) 24.29', 'Total (RM) 429.19', 'Card (TNG) 429.19'),
    )
    expect(parsed.total).toBe(429.19)
    expect(parsed.tax).toBe(24.29)
  })
})

test.describe('the printed date', () => {
  test('a two-digit year is read as 20xx', () => {
    // The ST Rosyam receipt prints DD/MM/YY. Requiring four digits read its
    // date as `null`, which is why auto-match could not see it at all.
    const parsed = parseReceipt(ocr('ice No: R00201202609120263 12/09/26'))
    expect(parsed.capturedAt).toBe('2026-09-12T00:00:00')
  })

  test('a time with seconds is read, and the seconds are dropped', () => {
    // "16:13:02" matched neither the old pattern nor anything else, so the time
    // silently fell back to midnight on a line where it had been read perfectly.
    const parsed = parseReceipt(ocr('| Date: 12/09/2026 16:13:02'))
    expect(parsed.capturedAt).toBe('2026-09-12T16:13:00')
  })

  test('a four-digit year with HH:MM is unchanged', () => {
    // THE REGRESSION ARM — the shape every seeded receipt uses.
    const parsed = parseReceipt(ocr('Date 04/09/2025 13:45'))
    expect(parsed.capturedAt).toBe('2025-09-04T13:45:00')
  })
})

test.describe('purchase lines', () => {
  test('shape A — a leading quantity — still parses', () => {
    // THE REGRESSION ARM: the only shape that existed before this gate.
    const parsed = parseReceipt(ocr('1 Nestle Milo 2kg 52.90', '1 Ayam Brand Tuna 185g 7.90'))
    expect(parsed.lineItems.map((i) => [i.quantity, i.name, i.price])).toEqual([
      ['1', 'Nestle Milo 2kg', 52.9],
      ['1', 'Ayam Brand Tuna 185g', 7.9],
    ])
  })

  test('shape B — quantity between the name and a unit/total pair', () => {
    /*
      The iFruits layout: name, then qty, unit price and line total. Recognised
      by its TAIL — the last two tokens are amounts and the one before them is a
      small integer — because its head is the name.

      THE MIDDLE ROW IS EXPECTED TO BE MISSED, and that is recorded rather than
      engineered around: the engine read its quantity as "ASIN]", so there is no
      quantity to find. Two of the paper's three items is what this shape
      recovers on this receipt.
    */
    const parsed = parseReceipt(
      ocr(
        '{Konic Abalone Sauce 380gm 1 9.20 9.20',
        'Farm Fresh Milk 2L ASIN] 16.90 16.90',
        'Cara-cara Orange (XL) 5 2.80 12.60',
      ),
    )
    expect(parsed.lineItems.map((i) => [i.quantity, i.price])).toEqual([
      ['1', 9.2],
      ['5', 12.6],
    ])
    expect(parsed.lineItems[0].name).toBe('{Konic Abalone Sauce 380gm')
  })

  test('shape C — an article-number line takes its name from the line above', () => {
    /*
      The ST Rosyam layout: the product name is on its own line and the figures
      are on the next one, led by a barcode or an internal PLU.

      THE FIRST ROW IS EXPECTED TO BE MISSED — the engine read its line total as
      "3 G6)", so there is no amount on that line to take. Four of the paper's
      six items is what this shape recovers here.

      THE QUANTITY IS RECORDED AS "1" AND NOT GUESSED: it is printed inside a
      "unit*qty" token that OCR mangles ("14.701", "19,50%*1"), and a quantity
      guessed out of a mangled token is worse than one stated plainly.
    */
    const parsed = parseReceipt(
      ocr(
        'CHEFFARO PORTUGESE STYLE GRILL FISH PASTE',
        '9557384106381 5.50%1 3 G6)',
        'MYS CHL CHICKEN KEEL (KG)',
        '026019001296010986 11.8%1,098 12.96',
        'TELUR AYAM B 30’S (TRAY)',
        '100682 14.701 14.70',
      ),
    )
    expect(parsed.lineItems.map((i) => [i.quantity, i.name, i.price])).toEqual([
      ['1', 'MYS CHL CHICKEN KEEL (KG)', 12.96],
      ['1', 'TELUR AYAM B 30’S (TRAY)', 14.7],
    ])
  })

  test('a summary row is never a purchase, whatever shape it has', () => {
    /*
      THE ARM THAT GUARDS THE NEW SHAPES AGAINST THEMSELVES. Shape C accepts any
      line led by a five-digit run, and a receipt is full of those — invoice
      numbers, phone numbers, terminal ids. The summary-row text test is what
      keeps them out, and it runs before any shape is tried.
    */
    const parsed = parseReceipt(
      ocr(
        'ST ROSYAM WHOLESALE EXPRESS SDN BHD',
        'Total Item 6 Sub Total 70.84',
        'Total Saving 1.51 Total 70.85',
        'Terminal ID: 60027293',
      ),
    )
    expect(parsed.lineItems).toEqual([])
  })
})

test.describe('the merchant letterhead', () => {
  test('a legal-name line below an invoice number is still found', () => {
    /*
      MEASURED ON THE iFRUITS RECEIPT, which prints "Invoice No:" ABOVE its
      letterhead. `LETTERHEAD_END` stopped the scan at that line, so the real
      "Sdn Bhd" row was never reached and the merchant came back as scan noise
      from the logo — "NX a". AEON prints the same label BELOW the letterhead,
      which is why ten seeded receipts never exposed it.
    */
    const parsed = parseReceipt(
      ocr(
        'a a  \\',
        'NX a. |',
        'Invoice No: 580111174 |',
        'IFruits Market (M) Sdn Bhd ~(1376893-Y) |',
      ),
    )
    expect(parsed.merchant).toBe('IFruits Market')
  })

  test('a letterhead above the invoice number is unchanged', () => {
    // THE REGRESSION ARM — the AEON order, which ten seeded receipts use.
    const parsed = parseReceipt(
      ocr('zon (BIG)', 'AEON BIG (M) SON BHD (126926-H)', 'Receipt No : AB250904-2219'),
    )
    expect(parsed.merchant).toBe('AEON BIG')
  })
})
