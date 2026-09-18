import { expect, test } from '@playwright/test'
import { parseReceipt, readMoney } from '../src/data/ocr/parseReceipt'
import type { OcrLine, OcrResult } from '../src/data/ocr/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE LAYOUT-AWARE PARSER, ONE GENERAL PATTERN PER TEST (Gate 55).
 *
 * Every fixture here is SYNTHETIC. No merchant, product, figure, date or line
 * in this file was taken from a photographed receipt — the development corpus
 * that shaped the parser carries names, phone numbers, an address and card
 * fragments, and none of it may be committed (Decision 9). Each fixture is the
 * smallest page that exercises ONE rule, built the way the engine reports a
 * page: lines of words, each word with a box.
 *
 * WHY BOXES. The Gate 54 fixtures in `parse-receipt.spec.ts` are text-only and
 * stay valid — the parser falls back to the engine's own lines when a page
 * carries no boxes. The rules added at Gate 55 (rebuilt rows, the price column,
 * the two-row check against the column) only exist WITH geometry, so they can
 * only be tested with it.
 *
 * PURE, IN NODE, MILLISECONDS. No dev server, no engine, no image.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Word = [text: string, x0: number]

/** Glyph width and height of the synthetic page, in pixels. */
const CHAR = 10
const HEIGHT = 20

/** One engine line: words at the given x positions, all at height `y`. */
function line(y: number, words: Word[]): OcrLine {
  const ws = words.map(([text, x0]) => ({
    text,
    confidence: 80,
    bbox: { x0, y0: y, x1: x0 + text.length * CHAR, y1: y + HEIGHT },
  }))
  return {
    text: ws.map((w) => w.text).join(' '),
    words: ws,
    bbox: {
      x0: Math.min(...ws.map((w) => w.bbox.x0)),
      y0: Math.min(...ws.map((w) => w.bbox.y0)),
      x1: Math.max(...ws.map((w) => w.bbox.x1)),
      y1: Math.max(...ws.map((w) => w.bbox.y1)),
    },
  }
}

const page = (...lines: OcrLine[]): OcrResult => ({ lines, confidence: 80 })

/** Right-align a figure so its right edge sits at x = 500, the column of every fixture. */
const at500 = (text: string): Word => [text, 500 - text.length * CHAR]

const items = (ocr: OcrResult) => parseReceipt(ocr).lineItems.map((i) => [i.name, i.quantity, i.price])

test.describe('figures are normalised before they are judged', () => {
  test('a tax code after the price — glued or separate — does not hide it', () => {
    const parsed = items(
      page(
        line(100, [['1100001', 20], ['TOMATO', 110], ['PASTE', 180], at500('3.49'), ['Z', 520]]),
        line(130, [['1100002', 20], ['RICE', 110], ['VINEGAR', 160], at500('5.10S')]),
        line(160, [['SUBTOTAL', 110], at500('8.59')]),
      ),
    )
    expect(parsed).toEqual([
      ['TOMATO PASTE', '1', 3.49],
      ['RICE VINEGAR', '1', 5.1],
    ])
  })

  test('a decimal comma before two digits is a decimal point', () => {
    const parsed = items(
      page(
        line(100, [['SPINACH', 20], ['250G', 110], at500('3,75')]),
        line(130, [['PEAR', 20], ['1KG', 80], at500('7,25')]),
      ),
    )
    expect(parsed).toEqual([
      ['SPINACH 250G', '1', 3.75],
      ['PEAR 1KG', '1', 7.25],
    ])
  })

  test('a minus printed after the figure makes it negative', () => {
    expect(readMoney('8.40-')).toEqual({ value: 8.4, negative: true })
    expect(readMoney('$2.15-')).toEqual({ value: 2.15, negative: true })
    expect(readMoney('-£0.65')).toEqual({ value: 0.65, negative: true })
    expect(readMoney('1.35')).toEqual({ value: 1.35, negative: false })
  })

  test('a currency symbol before the figure, or a code after it, is not part of it', () => {
    const parsed = items(
      page(
        line(100, [['1', 20], ['COLA', 50], at500('$1.99')]),
        line(130, [['2', 20], ['SCONES', 50], at500('£2.40<')]),
        line(160, [['1', 20], ['KAYA', 50], ['JAR', 110], at500('RM3.10')]),
      ),
    )
    expect(parsed).toEqual([
      ['COLA', '1', 1.99],
      ['SCONES', '2', 2.4],
      ['KAYA JAR', '1', 3.1],
    ])
  })
})

test.describe('rows are rebuilt from the page, not from the engine line split', () => {
  test('a price the engine put in a separate block is joined to its name', () => {
    /*
      The engine reports the right-hand figure as its own line, AFTER the
      summary rows. Taken as lines, "EGG TART" has no price and "7.80" sits
      below the subtotal — no item at all. Taken as a page, they are one row.
      The figure is drawn two pixels lower than the name, as a photograph is.
    */
    const parsed = items(
      page(
        line(100, [['CURRY', 20], ['PUFF', 90], at500('2.60')]),
        line(130, [['EGG', 20], ['TART', 60]]),
        line(160, [['SUBTOTAL', 20], at500('10.40')]),
        line(132, [at500('7.80')]),
      ),
    )
    expect(parsed).toEqual([
      ['CURRY PUFF', '1', 2.6],
      ['EGG TART', '1', 7.8],
    ])
  })
})

test.describe('the price column', () => {
  test('a figure outside the column is not the price', () => {
    /*
      A promotion row prints the ORIGINAL price mid-row. It is not in the
      right-hand column, so the row carries no price and is not an item — and a
      name-only row above it cannot borrow it either.
    */
    const parsed = items(
      page(
        line(100, [['OAT', 20], ['MILK', 60], ['1L', 110], at500('9.90')]),
        line(130, [['BONUS', 20], ['PACK', 80], ['9.90', 200]]),
        line(160, [['HONEY', 20], at500('11.40')]),
      ),
    )
    expect(parsed).toEqual([
      ['OAT MILK 1L', '1', 9.9],
      ['HONEY', '1', 11.4],
    ])
  })
})

test.describe('rows are classified by their words', () => {
  test('Malay summary labels end the items and supply the total', () => {
    const parsed = parseReceipt(
      page(
        line(100, [['ROTI', 20], ['CANAI', 70], at500('1.35')]),
        line(130, [['TEH', 20], ['TARIK', 60], at500('2.20')]),
        line(160, [['JUMLAH', 20], ['KECIL', 90], at500('3.55')]),
        line(190, [['PEMBUNDARAN', 20], at500('0.00')]),
        line(220, [['JUMLAH', 20], at500('3.55')]),
        line(250, [['TUNAI', 20], at500('5.00')]),
        line(280, [['BAKI', 20], at500('1.45')]),
      ),
    )
    expect(parsed.lineItems.map((i) => i.name)).toEqual(['ROTI CANAI', 'TEH TARIK'])
    expect(parsed.total).toBe(3.55)
  })

  test('a discount row is never an item, whichever side the minus is printed', () => {
    const parsed = items(
      page(
        line(100, [['WHOLEMEAL', 20], ['LOAF', 120], at500('4.20')]),
        line(130, [['MEMBER', 20], ['DEAL', 90], at500('1.10-')]),
        line(160, [['BUTTER', 20], at500('8.40')]),
        line(190, [['BUNDLE', 20], ['OFFER', 90], at500('-0.50')]),
        line(220, [['JAM', 20], ['SALE', 60], ['-', 110], ['15%', 130], at500('1.26')]),
      ),
    )
    expect(parsed).toEqual([
      ['WHOLEMEAL LOAF', '1', 4.2],
      ['BUTTER', '1', 8.4],
    ])
  })
})

test.describe('the item region', () => {
  test('an address or phone line above a code-and-price row is not a name', () => {
    const parsed = items(
      page(
        line(40, [['SAMPLE', 20], ['MART', 90], ['SDN', 150], ['BHD', 190]]),
        line(70, [['12,', 20], ['JALAN', 60], ['MAWAR', 120], ['3', 180]]),
        line(100, [['8801234567890', 20], at500('2.50')]),
        line(130, [['TEL', 20], ['03-5555', 60], ['0101', 140]]),
        line(160, [['8801234567891', 20], at500('3.50')]),
        line(190, [['TOTAL', 20], at500('6.00')]),
      ),
    )
    expect(parsed).toEqual([])
  })

  test('a two-row item: a name row, then a code-and-price row', () => {
    const parsed = items(
      page(
        line(100, [['GARLIC', 20], ['NAAN', 90]]),
        line(130, [['8890001112223', 20], ['1x6.50', 300], at500('6.50')]),
        line(160, [['MANGO', 20], ['LASSI', 80]]),
        line(190, [['8890001112224', 20], ['2x3.25', 300], at500('6.50')]),
        line(220, [['TOTAL', 20], at500('13.00')]),
      ),
    )
    expect(parsed).toEqual([
      ['GARLIC NAAN', '1', 6.5],
      ['MANGO LASSI', '2', 6.5],
    ])
  })

  test('a name row whose own price column holds a misread figure is not borrowed', () => {
    /*
      Single-row items, one of whose prices the engine could not read.
      The next row has a price and a name of its own, so nothing pairs — and the
      row with the misread figure ("(4") must not steal the NEXT row's price.
    */
    const parsed = items(
      page(
        line(100, [['3000001', 20], ['MUNG', 110], ['BEANS', 160], ['(4', 480]]),
        line(130, [['3000002', 20], ['7', 110], at500('2.45')]),
        line(160, [['2000003', 20], ['LEEK', 110], at500('2.30')]),
      ),
    )
    expect(parsed).toEqual([['LEEK', '1', 2.3]])
  })

  test('unpriced component lines under an item belong to no item', () => {
    const parsed = items(
      page(
        line(100, [['FAMILY', 20], ['BOX', 90], at500('32.90')]),
        line(130, [['3', 40], ['PC', 60], ['NUGGETS', 90]]),
        line(160, [['GARDEN', 40], ['SALAD', 110]]),
        line(190, [['LEMON', 20], ['TEA', 80], at500('4.70')]),
      ),
    )
    expect(parsed).toEqual([
      ['FAMILY BOX', '1', 32.9],
      ['LEMON TEA', '1', 4.7],
    ])
  })
})

test.describe('the total is chosen, not taken from the first match', () => {
  test('a 0.00 total row before the real total loses to it', () => {
    /*
      THE ITEM'S PRICE IS UNREADABLE ("2210", a lost decimal point), ON PURPOSE.
      With a readable 22.10 the item sum would corroborate the real total and
      pick it on its own, hiding the rule under test — measured: the first draft
      of this fixture passed with the 0.00 rule deleted.
    */
    const parsed = parseReceipt(
      page(
        line(100, [['SOAP', 20], at500('2210')]),
        line(130, [['TOTAL', 20], ['QTY', 80], at500('0.00')]),
        line(160, [['TOTAL', 20], ['VOUCHER', 80], at500('0.00')]),
        line(190, [['TOTAL', 20], at500('22.10')]),
      ),
    )
    expect(parsed.total).toBe(22.1)
  })

  test('with no grand-total label, a card tender is what was charged', () => {
    const parsed = parseReceipt(
      page(
        line(100, [['NOTEBOOK', 20], at500('9.50')]),
        line(130, [['SUBTOTAL', 20], at500('9.50')]),
        line(160, [['SST', 20], ['6%', 70], at500('0.57')]),
        line(190, [['VISA', 20], at500('10.07')]),
      ),
    )
    // Not the subtotal, and not the subtotal plus rounding: what the card paid.
    expect(parsed.total).toBe(10.07)
  })

  test('with no grand-total label and no card, the subtotal plus rounding', () => {
    const parsed = parseReceipt(
      page(
        line(100, [['PENCIL', 20], at500('14.83')]),
        line(130, [['SUB-TOTAL', 20], at500('14.83')]),
        line(160, [['ROUNDING', 20], at500('-0.03')]),
        line(190, [['CASH', 20], at500('20.00')]),
        line(220, [['CHANGE', 20], at500('5.20')]),
      ),
    )
    expect(parsed.total).toBe(14.8)
  })

  test('a figure on a total row is never the tax', () => {
    /*
      NOT PARENTHESISED ON PURPOSE. "TOTAL (VAT INCL)" would lose its tax word
      with the qualifier before the tax rule ever looked, so it could not show
      that the tax rule itself refuses a total row. This row keeps "VAT" in the
      label, and is still the total because it says the tax is included.
    */
    const parsed = parseReceipt(
      page(
        line(100, [['LAMP', 20], at500('31.60')]),
        line(130, [['TOTAL', 20], ['INCL', 90], ['VAT', 150], at500('31.60')]),
      ),
    )
    expect(parsed.tax).toBeNull()
    expect(parsed.total).toBe(31.6)
  })
})

test.describe('dates are read without guessing', () => {
  test('a second number above 12 is read month-first', () => {
    expect(parseReceipt(page(line(10, [['03/27/19', 20]]))).capturedAt).toBe('2019-03-27T00:00:00')
  })

  test('a date with no valid reading is left unread, not invented', () => {
    expect(parseReceipt(page(line(10, [['07/41/2020', 20]]))).capturedAt).toBeNull()
  })

  test('the time may be printed on the next row', () => {
    const parsed = parseReceipt(
      page(line(10, [['DATE:', 20], ['21/04/2023', 80]]), line(40, [['TIME:', 20], ['19:07:33', 80]])),
    )
    expect(parsed.capturedAt).toBe('2023-04-21T19:07:00')
  })
})

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * GATE 57. Five shapes the blind test exposed, each stated as a rule about
 * receipts in general and each given the smallest page that exercises it.
 *
 * EVERY FIGURE, NAME AND CODE BELOW IS INVENTED, like every other fixture in
 * this file. The first draft of this block was written straight off the
 * development corpus and carried its barcodes, its PLU codes, two product names
 * and a dozen of its amounts; an audit of the diff against the OCR tokens of
 * all thirty images caught them, and they were replaced. Only the SHAPES come
 * from real paper — which is the whole of what these rules are about.
 * ─────────────────────────────────────────────────────────────────────────────
 */

test.describe('a rounded total is the amount paid', () => {
  test('a rounded total outranks the total it rounds', () => {
    /*
      The till prints the bill, then the adjustment, then the rounded bill. All
      three rows carry a rounding word, so the word cannot tell them apart —
      only the figures can.
    */
    const parsed = parseReceipt(
      page(
        line(100, [['PILLOW', 20], at500('44.71')]),
        line(130, [['Sub', 20], ['Total', 60], at500('44.71')]),
        line(160, [['Total:', 20], at500('44.71')]),
        line(190, [['Rnd', 20], ['Adj', 60], at500('0.05-')]),
        line(220, [['Ttl', 20], ['Aft', 60], ['Rnd', 110], at500('44.66')]),
      ),
    )
    expect(parsed.total, 'the ROUNDED figure is what the customer paid').toBe(44.66)
  })

  test('a rounding adjustment is never mistaken for the total', () => {
    /*
      The same vocabulary with no rounded total printed: the only rounding row
      states the adjustment, and it is nowhere near the bill.
    */
    const parsed = parseReceipt(
      page(
        line(100, [['TOWEL', 20], at500('61.23')]),
        line(130, [['Sub', 20], ['Total', 60], at500('61.23')]),
        line(160, [['Rounding', 20], at500('0.03')]),
        line(190, [['Total', 20], at500('61.26')]),
      ),
    )
    expect(parsed.total).toBe(61.26)
  })

  test('a rounded total alone on the page is still the total', () => {
    const parsed = parseReceipt(
      page(
        line(100, [['MUG', 20], at500('18.72')]),
        line(130, [['Total', 20], ['After', 70], ['Rounding', 130], at500('18.75')]),
      ),
    )
    expect(parsed.total).toBe(18.75)
  })
})

test.describe('a total of zero is not a total', () => {
  test('with no non-zero figure anywhere the total is unread, not zero', () => {
    /*
      THE ITEM'S PRICE IS UNREADABLE ON PURPOSE (a lost decimal point), so
      nothing else on the page can stand in for the total. Before Gate 57 this
      returned 0 and the card read "RM 0.00" as though the bill had been free.
    */
    const parsed = parseReceipt(
      page(
        line(100, [['NOTEBOOK', 20], at500('4416')]),
        line(130, [['Total', 20], at500('0.00')]),
      ),
    )
    expect(parsed.total, 'unread, not a bill of nothing').toBeNull()
  })
})

test.describe('a total outranks a subtotal', () => {
  test('a candidate equal to the printed subtotal loses to one that differs', () => {
    /*
      The engine lost the "Sub" from the second label, so BOTH rows read as
      totals and the subtotal's figure prints first. The paper's own subtotal
      line is what breaks the tie — not where on the page a row sits.
    */
    const parsed = parseReceipt(
      page(
        line(100, [['LAMP', 20], at500('5148')]),
        line(130, [['Subtotal', 20], at500('51.48')]),
        line(160, [['total', 20], at500('51.48')]),
        line(190, [['Sales', 20], ['Tax', 80], at500('4.12')]),
        line(220, [['TOTAL', 20], at500('55.60')]),
      ),
    )
    expect(parsed.total).toBe(55.6)
  })
})

test.describe('quantity and weight lines are not items', () => {
  test('a quantity continuation line gives its amount to the name above it', () => {
    /*
      "AT" is two letters and already below the name bar; "FOR" is three, so
      without the connective list this row reads as a product called "AT 1 FOR"
      and takes its item's amount with it.
    */
    const parsed = items(
      page(
        line(100, [['BROWN', 20], ['RICE', 90], ['9911220033441', 220]]),
        line(130, [['4', 20], ['AT', 50], ['1', 80], ['FOR', 100], ['0.55', 160], at500('2.20')]),
        line(160, [['SWEET', 20], ['CORN', 90], ['9911220033442', 220]]),
        line(190, [['2.40', 20], ['kg', 60], ['@', 90], ['1', 110], ['kg', 130], ['/1.75', 170], at500('4.35')]),
        line(220, [['SUBTOTAL', 20], at500('6.55')]),
      ),
    )
    expect(parsed, 'two items, and no product called "AT 1 FOR"').toEqual([
      ['BROWN RICE', '4', 2.2],
      ['SWEET CORN', '1', 4.35],
    ])
  })
})

test.describe('a name and its charge may be several rows apart', () => {
  test('a barcode line and a promotion line between them do not break the pair', () => {
    const parsed = items(
      page(
        line(100, [['Widget', 20], ['Starter', 100], ['Set', 190]]),
        line(130, [['5512340067891', 20], ['K2', 200]]),
        line(160, [['(1', 20], ['@', 50], ['31.98)', 80], ['PROMO', 180], ['50%', 250], ['(15.99)', 320]]),
        line(190, [['(1', 20], ['@', 50], ['15.99)', 80], at500('15.99')]),
        line(220, [['Subtotal', 20], at500('15.99')]),
      ),
    )
    expect(parsed).toEqual([['Widget Starter Set', '1', 15.99]])
  })

  test('the search stops at the first row that could be an item itself', () => {
    /*
      A PRICED ROW ENDS THE WALK. Without that, the unpriced name three rows up
      would be paired with a figure that already belongs to something else.
    */
    const parsed = items(
      page(
        line(100, [['Orphan', 20], ['Name', 110]]),
        line(130, [['Kettle', 20], at500('18.00')]),
        line(160, [['5512340067892', 20]]),
        line(190, [['(1', 20], ['@', 50], ['9.00)', 80], at500('9.00')]),
        line(220, [['Subtotal', 20], at500('27.00')]),
      ),
    )
    expect(parsed, 'the orphan name is not reached past a priced row').toEqual([
      ['Kettle', '1', 18],
    ])
  })
})

test.describe('a bracketed figure is not the charge', () => {
  test('a list price in brackets loses to the charge printed beside it', () => {
    /*
      A "was" price prints to the RIGHT of what was actually charged, so the
      rightmost-amount fallback takes it — and that fallback is what runs
      whenever the engine returns no boxes, which is why this page has none.
    */
    const textLine = (text: string): OcrLine => ({
      text,
      words: text.split(' ').map((t) => ({ text: t, confidence: 80 })),
    })
    const parsed = items({
      lines: [
        textLine('Poster 4.99 (9.49)'),
        textLine('Frame 11.50 (21.50)'),
        textLine('Subtotal 16.49'),
      ],
      confidence: 80,
    })
    expect(parsed).toEqual([
      ['Poster', '1', 4.99],
      ['Frame', '1', 11.5],
    ])
  })
})
