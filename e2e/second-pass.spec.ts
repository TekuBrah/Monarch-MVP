import { expect, test } from '@playwright/test'
import type { ParsedReceipt } from '../src/data/ocr/parseReceipt'
import { chooseReading, firstPassFailed } from '../src/data/ocr/secondPass'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SECOND READING PASS — THE TRIGGER AND THE CHOICE (Gate 58).
 *
 * NODE CONTEXT, NO BROWSER, NO ENGINE. Both rules are pure functions of two
 * parses (`src/data/ocr/secondPass.ts`), so they are asserted directly. What
 * the rules DO to the corpus is measured by `npm run ocr:corpus` and
 * `score.mjs --reparse`, which apply these same two functions to cached engine
 * output — never by this spec, which holds no receipt text.
 *
 * THE FIXTURES ARE INVENTED. A parse here is a count of line items and a
 * total; no name, figure or merchant in this file comes from any receipt.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function reading(items: number, total: number | null): ParsedReceipt {
  const lineItems = Array.from({ length: items }, (_, i) => ({
    name: `Item ${String.fromCharCode(65 + i)}`,
    quantity: '1',
    price: 1 + i,
  }))
  return {
    merchant: '',
    capturedAt: null,
    total,
    tax: null,
    currency: 'MYR',
    lineItems,
    confidence: { merchant: null, capturedAt: null, total: null, tax: null, lineItems: lineItems.map(() => 0) },
  }
}

test.describe('the trigger is the outcome of the first pass', () => {
  test('a reading with items AND a total does not trigger', () => {
    expect(firstPassFailed(reading(3, 12.5))).toBe(false)
    expect(firstPassFailed(reading(1, 4.4))).toBe(false)
  })

  test('no line items triggers, even with a total', () => {
    expect(firstPassFailed(reading(0, 12.5))).toBe(true)
  })

  test('no total triggers, even with items — a photograph that reads two junk rows is still caught', () => {
    expect(firstPassFailed(reading(2, null))).toBe(true)
  })

  test('nothing read at all triggers', () => {
    expect(firstPassFailed(reading(0, null))).toBe(true)
  })
})

test.describe('the choice keeps whichever reading is better, and cannot lose a first pass that read more', () => {
  test('more line items wins, in either direction', () => {
    expect(chooseReading(reading(0, null), reading(3, null))).toBe('second')
    expect(chooseReading(reading(4, null), reading(2, 7.7))).toBe('first')
  })

  test('equal item counts: the reading with a total wins', () => {
    expect(chooseReading(reading(2, null), reading(2, 7.7))).toBe('second')
    expect(chooseReading(reading(2, 7.7), reading(2, null))).toBe('first')
  })

  test('a full tie keeps the FIRST pass', () => {
    expect(chooseReading(reading(2, 5), reading(2, 7))).toBe('first')
    expect(chooseReading(reading(1, null), reading(1, null))).toBe('first')
  })

  test('both readings empty: the first pass is kept', () => {
    expect(chooseReading(reading(0, null), reading(0, null))).toBe('first')
  })
})
