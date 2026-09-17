import type { Amount, CurrencyCode, ReceiptLineItem } from '../types'
import type { OcrBox, OcrLine, OcrResult, OcrWord } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RECEIPT PARSER. HAND-WRITTEN, AND LAYOUT-AWARE AS OF GATE 55.
 *
 * NOT AN LLM, AND THAT IS A RULING RATHER THAN A COST DECISION. An LLM parser
 * would need an API key, would send the OCR text of a user's receipt to a third
 * party, and would make the extraction non-deterministic — so it would break
 * roadmap D9 (the image never leaves the device) in spirit even though it is the
 * text and not the image that travels, and it could not hold a baseline. There
 * is no key anywhere in this repo and none is to be added for this. Decision 9
 * (Gate 55) re-ruled it, together with Python OCR libraries and per-shop
 * configuration files, and it is not to be re-opened.
 *
 * IT IS PURE, AND DELIBERATELY SO. It takes an `OcrResult` and returns a value;
 * it touches no browser API, no clock and no network. That is what lets a spec
 * assert on it, and what lets the engine be swapped without touching it.
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT GATE 55 REPLACED, AND WHY.
 *
 * Gates 50-B and 54 read line items through THREE LINE SHAPES — a leading
 * quantity, a quantity between the name and a unit/total pair, and an
 * article-number line under its name — each written against the text of a
 * particular receipt. On the phone (Gate 55, deploy `7ad26ea`) that meant
 * iFruits 0 of 3 items, Watsons 0 of 6 plus a promotion read as an item, and
 * Giant 0 of 7, because Giant matched none of the three shapes.
 *
 * THE REPLACEMENT DESCRIBES RECEIPTS, NOT RECEIPTS WE HAVE SEEN. No rule below
 * names a shop, a product or a string from any receipt. It works in six steps:
 *
 *   1. AMOUNTS   normalise every token before judging whether it is money
 *   2. ROWS      rebuild printed rows from the engine's word boxes
 *   3. COLUMN    find the right-hand price column the amounts align in
 *   4. KINDS     classify each row by its vocabulary: summary, tender, meta,
 *                discount, or a candidate purchase
 *   5. ITEMS     read purchases from the item region, including two-row items
 *   6. FIELDS    choose the total, the tax and the date without guessing
 *
 * WITHOUT BOXES IT STILL WORKS. Every committed text fixture was written before
 * the engine's geometry was kept; with no boxes the engine's own lines are the
 * rows and the price column is simply the rightmost amount on the row.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE STRICTNESS RULE, UNCHANGED SINCE GATE 50-B.
 *
 * A PRICE IS ONLY A PRICE IF THE PAGE SHOWS EXACTLY TWO DECIMALS. So "2890" is
 * not read as 28.90, and the item carrying it is DROPPED rather than guessed at.
 * Gate 55 widened what counts as showing two decimals — a decimal comma, a
 * currency mark, a trailing tax code, an O read for a 0 — but never what counts
 * as a decimal. Treating a bare "2890" as 28.90 would put a number on a user's
 * screen that the paper does not show, and it would be wrong exactly when a
 * receipt genuinely prints a whole-currency price.
 * ─────────────────────────────────────────────────────────────────────────────
 * THERE IS AN HONEST CEILING (Decision 9, ruling 5). Much of what a free,
 * on-device engine gets wrong is READING — a lost decimal point, a 6 read as an
 * 8, a row it never segmented — and no parser recovers a figure the text does
 * not contain. The Gate 55 corpus measurement attributes every miss to reading
 * or parsing; see CLAUDE.md. The receipt editor covers what is left.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * What the parser read, plus how confident the engine was about each field.
 *
 * IT IS NOT AN `ExtractedReceipt` AND THE DIFFERENCE IS THE `confidence` HALF.
 * The extraction seam's shape is fixed (`extract.ts`), so the confidences live
 * here, internal to OCR, where a measurement can reach them without the seam
 * widening. `extract.ts` projects this down. See the Gate 50-B section of
 * CLAUDE.md for the measurement that decided they are not yet rendered.
 *
 * UNCHANGED BY GATE 55, BY RULING. Decision 9 ruling 4: this type and
 * `ReceiptLineItem` do not widen. The GBP and USD receipts in the development
 * corpus still report `currency: 'MYR'`, because `CurrencyCode` has one member.
 */
export interface ParsedReceipt {
  merchant: string
  /** ISO 8601 local, or `null` when the page shows no readable date. */
  capturedAt: string | null
  /** `null` when no total could be read — the caller decides what to do. */
  total: Amount | null
  tax: Amount | null
  currency: CurrencyCode
  lineItems: ReceiptLineItem[]
  /**
   * The MINIMUM word confidence among the words that produced each field, 0-100,
   * or `null` where the field was not read off the page at all.
   *
   * MINIMUM RATHER THAN MEAN, because a field is only as trustworthy as its
   * worst-read token.
   *
   * ⚠️ NOTHING RENDERS THIS, AND THAT IS A MEASURED RULING — NOT AN OMISSION.
   * Gate 50-B measured whether per-word confidence separates correct reads from
   * incorrect ones over the ten seeded receipts: AUC 0.642, best precision
   * 0.231, and the one genuinely wrong SST figure scored the exact median of the
   * correct population. So the fallback is in force — parse everything, mark
   * nothing, let a human correct any field — and this block is kept because it
   * makes the question re-measurable rather than re-arguable. The full
   * measurement is in the Gate 50-B section of CLAUDE.md.
   */
  confidence: {
    merchant: number | null
    capturedAt: number | null
    total: number | null
    tax: number | null
    /** One per surviving line item, in the same order as `lineItems`. */
    lineItems: number[]
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// VOCABULARY. Every list the parser classifies a row by, in one place, English
// and Malay. A word is matched whole and case-insensitive, after the row's
// parenthesised qualifiers have been removed (see `labelWords`).
// ═════════════════════════════════════════════════════════════════════════════

/**
 * SUMMARY words that mark a row as the bill's arithmetic wherever in the label
 * they fall. Anywhere, not only first, because the engine glues margin noise to
 * the front of a row ("xx ~ SUB-TOTAL : 41.20") and a first-word rule would
 * read that row as a purchase.
 */
const SUMMARY_ANYWHERE: readonly string[] = [
  'total', 'subtotal', 'jumlah', 'rounding', 'pembundaran',
  'sst', 'gst', 'vat', 'cukai', 'discount', 'diskaun', 'saving', 'savings',
  'baki',
]

/**
 * SUMMARY words that mark a row only as its FIRST real word. Each is also an
 * ordinary word a product name can carry — a "Birthday Card", a "Change Purse",
 * a "Tax Free" label — so each counts only where it leads the row.
 */
const SUMMARY_FIRST: readonly string[] = [
  'sub', 'tax', 'service', 'disc', 'change', 'balance', 'net', 'amount', 'grand',
  'round', 'adjustment', 'adj',
]

/** TENDER words: how the bill was paid. First real word only, for the same reason. */
const TENDER_FIRST: readonly string[] = [
  'cash', 'tunai', 'card', 'kad', 'tendered', 'paid', 'bayar', 'visa',
  'mastercard', 'master', 'mydebit', 'debit', 'credit', 'amex', 'ewallet',
  'e-wallet', 'tng', 'grabpay', 'boost', 'shopeepay', 'duitnow', 'loyalty',
]

/** The tender words that name a CARD or wallet rather than cash — see `readTotal`. */
const CARD_TENDER: readonly string[] = [
  'card', 'kad', 'visa', 'mastercard', 'master', 'mydebit', 'debit', 'credit',
  'amex', 'ewallet', 'e-wallet', 'tng', 'grabpay', 'boost', 'shopeepay', 'duitnow',
]

/**
 * META words: the rows around a bill that describe it rather than charge for it.
 * First real word only. `qty`, `item`, `description` and `price` are here
 * because a column-header row leads with them.
 */
const META_FIRST: readonly string[] = [
  'point', 'points', 'mata', 'qty', 'quantity', 'item', 'items', 'invoice',
  'receipt', 'cashier', 'member', 'order', 'table', 'date', 'time', 'tel',
  'phone', 'fax', 'terminal', 'trace', 'approval', 'app', 'ref', 'trans',
  'transaction', 'description', 'desc', 'price', 'reg', 'thank',
  'status', 'salesperson', 'server', 'pax', 'counter', 'pos', 'bill',
]

/**
 * DISCOUNT words, anywhere in the label. A row carrying one is an adjustment to
 * the bill whatever its figure's sign, because the engine often loses the minus.
 */
const DISCOUNT_ANYWHERE: readonly string[] = ['discount', 'diskaun', 'disc', 'promo', 'potongan']

/**
 * GRAND-TOTAL labels. A row is a total candidate when its label (the words next
 * to the figure, parenthesised qualifiers removed) holds one of these and none
 * of `NOT_THE_TOTAL`. `pay` is the payable-amount word ("Balance to Pay",
 * "Amount to Pay"); `paid` and `payment` are deliberately not it — `payment` is
 * admitted only beside `total` ("Total Payment").
 */
const GRAND_TOTAL: readonly string[] = ['total', 'jumlah', 'pay', 'due']

/**
 * Words that, beside a total word, say the figure is NOT the grand total.
 * Carried from Gate 54, where each was put there by a real line, and widened by
 * Gate 55's vocabulary. `rounding` still disqualifies "Total Rounding 0.00";
 * it no longer disqualifies "Total Due (Rounding)", because a parenthesised
 * qualifier is removed before the label is judged.
 */
const NOT_THE_TOTAL: readonly string[] = [
  'sub', 'subtotal', 'kecil', 'rounding', 'round', 'pembundaran',
  'saving', 'savings', 'item', 'items', 'qty', 'quantity', 'change', 'point',
  'points', 'mata', 'discount', 'diskaun', 'disc', 'cash',
  'tunai', 'excl', 'without', 'before', 'tendered', 'paid',
]

/** TAX labels. Only a row whose label holds one of these may supply `tax`. */
const TAX_WORDS: readonly string[] = ['tax', 'sst', 'gst', 'vat', 'cukai']

/**
 * Words that make a tax-labelled row describe an amount GROSS or NET of tax
 * rather than the tax itself: "Total Incl. VAT", "Amount before Tax".
 */
const NOT_THE_TAX: readonly string[] = [
  'total', 'incl', 'inclusive', 'including', 'excl', 'exclusive', 'excluding',
  'without', 'before', 'after', 'amount', 'reg', 'no', 'id',
]

/** SUBTOTAL labels, for the no-grand-total fallback. */
const SUBTOTAL_PHRASES: readonly string[] = ['subtotal', 'sub total', 'jumlah kecil']

/** ROUNDING labels, for the same fallback. */
const ROUNDING_WORDS: readonly string[] = ['rounding', 'pembundaran', 'round']

/**
 * ADDRESS-LIKE words. A row carrying one cannot be the name half of a two-row
 * item — the Gate 54 audit's named overfit, where an address line directly
 * above a priced row was taken for a product name.
 *
 * TWO LISTS, BECAUSE AN ENGLISH STREET WORD IS ALSO A PRODUCT WORD. "Lane
 * cleaner", "Lane cake", "Plaza napkins". The first list is words no product
 * carries and counts anywhere. The second counts only on a row that also
 * carries a comma, which is how an address is printed ("2F, Harbour Mall,").
 */
const ADDRESS_WORDS: readonly string[] = [
  'jalan', 'jln', 'lorong', 'taman', 'persiaran', 'lebuh', 'tel', 'fax',
  'phone', 'www', 'http', 'https',
]
const STREET_WORDS: readonly string[] = [
  'lot', 'road', 'rd', 'street', 'avenue', 'ave', 'lane', 'floor', 'level',
  'lvl', 'mall', 'plaza', 'block', 'blok',
]

// ═════════════════════════════════════════════════════════════════════════════
// 1 · AMOUNTS
// ═════════════════════════════════════════════════════════════════════════════

/** A money figure read off one token. `negative` is the printed sign. */
interface Money {
  value: number
  negative: boolean
}

/**
 * Read one token as money, normalising the ways a printed figure is decorated
 * or misread before judging it. In order:
 *
 *   surrounding brackets and trailing punctuation     "(12.90)" "137.59,"
 *   a leading minus, or a tilde the engine reads for one   "-2.40" "~0.03"
 *   a currency mark before or after                   "RM137.59" "£3.20" "45.00RM"
 *   a trailing minus                                  "3.60-"
 *   ONE trailing tax or flag code                     "7.15Z" "3.20<" "8.05*"
 *   O for 0, and l or I for 1, inside a numeric token "1O.5O" -> 10.50
 *   a decimal comma before exactly two digits         "13,45" -> 13.45
 *
 * and then the Gate 50-B strictness rule: exactly two decimals, or nothing.
 *
 * THE TAX-CODE STRIP IS ONE CHARACTER AND ONLY AFTER A DIGIT. A code printed
 * as its own token ("7.15 Z") never reaches this function as part of the
 * figure; `priceTokenOf` takes the amount token, not the last token, so it
 * steps over it.
 *
 * NO LOOKBEHIND, DELIBERATELY — Safari only gained it at 16.4 (Gate 50-B).
 */
export function readMoney(token: string): Money | null {
  let t = token.trim()
  t = t.replace(/^[([{"'«“‘]+/, '').replace(/[)\]}"'»”’,;:]+$/, '')
  let negative = false
  if (/^[-~−–]/.test(t)) {
    negative = true
    t = t.slice(1)
  }
  t = t.replace(/^(?:RM|MYR|USD|GBP|SGD|EUR|[£$€])/i, '')
  if (/^[-~−–]/.test(t)) {
    negative = true
    t = t.slice(1)
  }
  if (/[-−–]$/.test(t)) {
    negative = true
    t = t.slice(0, -1)
  }
  t = t.replace(/(?:RM|MYR)$/i, '')
  if (/[0-9][A-Za-z*<>§#]$/.test(t)) t = t.slice(0, -1)
  if (/[-−–]$/.test(t)) {
    negative = true
    t = t.slice(0, -1)
  }
  t = t.replace(/\.$/, '')

  // O/l/I only inside a token that is already mostly a number, so no word ever
  // becomes a figure: at least two real digits, and a decimal separator.
  if (/^[0-9OolI,]*[.,][0-9OolI]{2}$/.test(t) && (t.match(/[0-9]/g) ?? []).length >= 2) {
    t = t.replace(/[Oo]/g, '0').replace(/[lI]/g, '1')
  }
  if (/^[0-9]+,[0-9]{2}$/.test(t)) t = t.replace(',', '.')

  const m = /^([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\.([0-9]{2})$/.exec(t)
  if (!m) return null
  const value = Number(`${m[1].replace(/,/g, '')}.${m[2]}`)
  return Number.isFinite(value) ? { value, negative } : null
}

/**
 * A combined unit-and-quantity token: "6.20*1", "4.10%1,250" (the engine reads
 * `*` as `%`), "2x3.40". It carries a UNIT price and a QUANTITY, never the line
 * price, so it is never taken for one — only its quantity is used.
 */
function readUnitQty(token: string): { unit: Money; qty: string } | null {
  const t = token.trim().replace(/[)\]}"',;:]+$/, '')
  const unitFirst = /^(-?[£$€]?[0-9]+[.,][0-9]{2})[*%xX×]{1,2}([0-9]+(?:[.,][0-9]{1,3})?)$/.exec(t)
  if (unitFirst) {
    const unit = readMoney(unitFirst[1])
    if (unit) return { unit, qty: unitFirst[2].replace(',', '.') }
  }
  const qtyFirst = /^([0-9]+(?:[.,][0-9]{1,3})?)[xX×*@]([£$€]?[0-9]+[.,][0-9]{2})$/.exec(t)
  if (qtyFirst) {
    const unit = readMoney(qtyFirst[2])
    if (unit) return { unit, qty: qtyFirst[1].replace(',', '.') }
  }
  return null
}

/** "2" or "12": a small whole number, the shape of a printed quantity. */
const SMALL_INTEGER = /^[0-9]{1,3}$/

// ═════════════════════════════════════════════════════════════════════════════
// 2 · ROWS
// ═════════════════════════════════════════════════════════════════════════════

interface Token {
  text: string
  confidence: number
  box: OcrBox | null
  money: Money | null
  unitQty: { unit: Money; qty: string } | null
}

interface Row {
  tokens: Token[]
  /** The row's own text, tokens joined in reading order. */
  text: string
}

function toToken(word: OcrWord): Token {
  return {
    text: word.text,
    confidence: word.confidence,
    box: word.bbox ?? null,
    money: readMoney(word.text),
    unitQty: readUnitQty(word.text),
  }
}

function rowOf(tokens: Token[]): Row {
  return { tokens, text: tokens.map((t) => t.text).join(' ') }
}

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/**
 * Rebuild the printed rows.
 *
 * ─── WITHOUT BOXES ─── the engine's lines are the rows, in its order.
 *
 * ─── WITH BOXES ─── the engine's lines are only a STARTING POINT. Its line
 * split goes wrong on receipts in two repeated ways, and both are fixed here
 * from geometry alone:
 *
 *   a price in a right-hand column lands in a DIFFERENT line from its name,
 *   because the engine segmented the column as its own block; and
 *
 *   a photographed receipt is never level, so a row's right end sits a few
 *   pixels above or below its left end, and a fixed vertical tolerance
 *   attaches the price to the wrong neighbour.
 *
 * So: estimate the page's SKEW as the median slope of the engine's own longer
 * lines, measure every word's centre on the deskewed page, cut each engine line
 * where consecutive words jump by a whole word height (a line the engine
 * over-merged — a smaller drift is the photograph's own curvature), and then
 * join fragments whose deskewed centres agree to within half a word height and
 * whose words do not overlap horizontally. The last condition is what stops two
 * genuinely separate rows at a tight line pitch collapsing into one.
 */
function buildRows(ocr: OcrResult): Row[] {
  const lines = ocr.lines.filter((l) => l.text.trim().length > 0)
  const wordsOf = (line: OcrLine): OcrWord[] =>
    line.words.length > 0
      ? line.words
      : line.text.split(/\s+/).filter((w) => w.length > 0).map((text) => ({ text, confidence: 0 }))

  const allBoxed = lines.length > 0 && lines.every((l) => wordsOf(l).every((w) => w.bbox))
  if (!allBoxed) return lines.map((l) => rowOf(wordsOf(l).map(toToken)))

  const cx = (b: OcrBox) => (b.x0 + b.x1) / 2
  const cy = (b: OcrBox) => (b.y0 + b.y1) / 2

  // SKEW: the median least-squares slope of lines with three or more words.
  const slopes: number[] = []
  for (const line of lines) {
    const ws = wordsOf(line)
    if (ws.length < 3) continue
    const xs = ws.map((w) => cx(w.bbox!))
    const ys = ws.map((w) => cy(w.bbox!))
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length
    const my = ys.reduce((a, b) => a + b, 0) / ys.length
    let num = 0
    let den = 0
    for (let i = 0; i < xs.length; i += 1) {
      num += (xs[i] - mx) * (ys[i] - my)
      den += (xs[i] - mx) ** 2
    }
    if (den > 0) slopes.push(num / den)
  }
  const slope = Math.max(-0.2, Math.min(0.2, median(slopes)))
  const height = median(lines.flatMap((l) => wordsOf(l).map((w) => w.bbox!.y1 - w.bbox!.y0))) || 1
  const level = (w: OcrWord) => cy(w.bbox!) - slope * cx(w.bbox!)

  // FRAGMENTS: an engine line, cut wherever consecutive words jump vertically.
  type Fragment = { words: OcrWord[]; level: number }
  const fragments: Fragment[] = []
  for (const line of lines) {
    let current: OcrWord[] = []
    for (const word of wordsOf(line)) {
      const prev = current[current.length - 1]
      if (prev && Math.abs(level(word) - level(prev)) > height) {
        fragments.push({ words: current, level: median(current.map(level)) })
        current = []
      }
      current.push(word)
    }
    if (current.length > 0) fragments.push({ words: current, level: median(current.map(level)) })
  }

  // ROWS: join fragments that sit at the same deskewed height without overlapping.
  fragments.sort((a, b) => a.level - b.level)
  const rows: Fragment[] = []
  const overlaps = (a: OcrWord[], b: OcrWord[]) =>
    a.some((p) => b.some((q) => p.bbox!.x0 < q.bbox!.x1 && q.bbox!.x0 < p.bbox!.x1))
  for (const frag of fragments) {
    let best: Fragment | null = null
    for (const row of rows) {
      if (Math.abs(row.level - frag.level) >= 0.5 * height) continue
      if (overlaps(row.words, frag.words)) continue
      if (!best || Math.abs(row.level - frag.level) < Math.abs(best.level - frag.level)) best = row
    }
    if (best) {
      best.words.push(...frag.words)
      best.level = median(best.words.map(level))
    } else {
      rows.push({ words: [...frag.words], level: frag.level })
    }
  }
  rows.sort((a, b) => a.level - b.level)
  return rows.map((r) => rowOf([...r.words].sort((a, b) => a.bbox!.x0 - b.bbox!.x0).map(toToken)))
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · THE PRICE COLUMN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Where the right-hand price column's right edge sits, or `null` without boxes.
 *
 * A receipt right-aligns its figures, so the right edges of each row's
 * RIGHTMOST amount cluster at one x. The column is the densest such cluster —
 * which is also why a unit price printed further left, or a promotion's
 * reference price in the middle of its row, is not in it.
 *
 * THE TOLERANCE IS A FRACTION OF THE PAGE, not a pixel count, because the same
 * receipt reaches the engine at 250 px wide from one source and 1,100 px from
 * another.
 */
function findPriceColumn(rows: Row[]): { x1: number; tolerance: number } | null {
  const edges: number[] = []
  let width = 0
  for (const row of rows) {
    for (const t of row.tokens) if (t.box) width = Math.max(width, t.box.x1)
    const amounts = row.tokens.filter((t) => t.money && t.box)
    if (amounts.length > 0) edges.push(Math.max(...amounts.map((t) => t.box!.x1)))
  }
  if (edges.length < 2 || width === 0) return null
  const tolerance = 0.06 * width
  let best = { x1: 0, count: 0 }
  for (const e of edges) {
    const count = edges.filter((x) => Math.abs(x - e) <= tolerance).length
    if (count > best.count || (count === best.count && e > best.x1)) best = { x1: e, count }
  }
  if (best.count < 2) return null
  return { x1: median(edges.filter((x) => Math.abs(x - best.x1) <= tolerance)), tolerance }
}

type Column = ReturnType<typeof findPriceColumn>

/**
 * The row's figure in the price column: the amount token nearest the column
 * edge within tolerance. Without a column, the rightmost amount on the row —
 * the rightmost AMOUNT, not the last token, so a trailing tax code, a stray
 * quantity or scan noise after the figure no longer hides it.
 */
function priceTokenOf(row: Row, column: Column): Token | null {
  const amounts = row.tokens.filter((t) => t.money)
  if (amounts.length === 0) return null
  if (!column || amounts.some((t) => !t.box)) return amounts[amounts.length - 1]
  let best: Token | null = null
  for (const t of amounts) {
    const d = Math.abs(t.box!.x1 - column.x1)
    if (d > column.tolerance) continue
    if (!best || d < Math.abs(best.box!.x1 - column.x1)) best = t
  }
  return best
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · KINDS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A label as words: lower-case, parenthesised qualifiers removed, every
 * non-alphanumeric character a space.
 *
 * PARENTHESISED TEXT QUALIFIES A LABEL; IT DOES NOT NAME IT. "Total (VAT Incl)"
 * is a total, "Total Due (Rounding)" is a total, "Card (Visa)" is a card.
 * Removing the qualifier is what lets `NOT_THE_TOTAL` keep "Total Rounding"
 * out without also keeping the real "Total Due (Rounding)" out.
 */
function labelWords(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `
}

const hasAny = (label: string, words: readonly string[]) => words.some((w) => label.includes(` ${w} `))

/** A real word: two or more letters and no digit. Not a code, not a stray letter. */
const isWord = (text: string) => /[A-Za-z]{2}/.test(text) && !/[0-9]/.test(text)

/** The first real word of a row, lower-case, or `''`. */
function firstWord(row: Row): string {
  const token = row.tokens.find((t) => isWord(t.text.replace(/\(.*$/, '')))
  return token ? token.text.replace(/\(.*$/, '').toLowerCase().replace(/[^a-z-]/g, '') : ''
}

type Kind = 'summary' | 'tender' | 'meta' | 'discount' | 'candidate'

/**
 * What a row is, by its words and its sign.
 *
 * ORDER MATTERS. A negative figure is a discount before anything else, because
 * a promotion row carries a product word ("PROMO 12.40 -2.40"). A row that
 * reads "- 20%" is a reduction whether or not the engine kept its minus.
 */
function kindOf(row: Row): Kind {
  const label = labelWords(row.text)
  const first = firstWord(row)
  const negative = row.tokens.some((t) => t.money?.negative || t.unitQty?.unit.negative)
  if (negative) return 'discount'
  const tokens = row.tokens.map((t) => t.text)
  const reduction = tokens.some((t, i) => /^-?[0-9]{1,2}%$/.test(t) && (t.startsWith('-') || tokens[i - 1] === '-'))
  if (reduction || hasAny(label, DISCOUNT_ANYWHERE)) return 'discount'
  if (hasAny(label, SUMMARY_ANYWHERE) || SUMMARY_FIRST.includes(first)) return 'summary'
  if (TENDER_FIRST.includes(first)) return 'tender'
  if (META_FIRST.includes(first)) return 'meta'
  return 'candidate'
}

// Header rows: the letterhead and bill metadata above the first purchase.
const DATE_TOKEN = /[0-9]{1,2}[/.-][0-9]{1,2}[/.-](?:[0-9]{4}|[0-9]{2})/
const TIME_TOKEN = /^[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:am|pm)?$/i
const PHONE = /(?:\+?[0-9]{2,4}[- ]?[0-9]{3,4}[- ][0-9]{3,5})|(?:[0-9]{2,4}-[0-9]{6,8})/

/**
 * Does this row look like part of an address, a phone number, a postcode, a
 * date or a web address? Such a row is never the name half of a two-row item.
 */
function looksLikeAddress(row: Row): boolean {
  const label = labelWords(row.text)
  if (hasAny(label, ADDRESS_WORDS)) return true
  if (hasAny(label, STREET_WORDS) && row.text.includes(',')) return true
  if (PHONE.test(row.text) || DATE_TOKEN.test(row.text)) return true
  if (row.tokens.some((t) => TIME_TOKEN.test(t.text))) return true
  if (/www\.|https?:|\.com\b|\.my\b|@[a-z]/i.test(row.text)) return true
  // A postcode: a standalone five-digit number beside words.
  if (row.tokens.some((t) => /^[0-9]{5},?$/.test(t.text)) && row.tokens.some((t) => isWord(t.text))) return true
  return false
}

/** A legal-entity suffix marks the letterhead. */
const HEADER_SUFFIX = /\b(?:s[o0]n\.?\s*bhd|sdn\.?\s*bhd|s[o0]nbhd|sdnbhd|berhad|bhd|ltd|limited|inc|llc|plc)\b/i

function isHeaderRow(row: Row, kind: Kind): boolean {
  return kind === 'meta' || kind === 'tender' || looksLikeAddress(row) || HEADER_SUFFIX.test(row.text)
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · ITEMS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A name has to contain a real word of three letters or more, not bracketed.
 *
 * THREE, NOT TWO. A two-letter scrap is what the engine makes of a smudge or a
 * stamp ("qe", "Kk", "AJ"), and a priced row whose only "word" is one is a
 * misread figure row, not a purchase. A bracketed word is an annotation — a
 * category tag printed beside an article number — and not a name either.
 */
function hasNameWord(tokens: Token[]): boolean {
  return tokens.some((t) => /[A-Za-z]{3}/.test(t.text) && !/[0-9]/.test(t.text) && !/^[[(]/.test(t.text))
}

/**
 * The printed name from a row's tokens left of its price.
 *
 * With boxes, the tokens are first cut into SEGMENTS at every wide gap — a jump
 * wider than four characters — and the name is taken from the first segment
 * that carries a real word. Before the name, that skips a margin scrap the
 * engine glued on; after it, it drops another column the engine could not read
 * as numbers ("1L" … "TRE}"). Without boxes the whole row is one segment.
 *
 * Within the segment the name runs from the first token with two letters that
 * is not itself a figure, to the last token carrying ANY letter that is not a
 * figure — so a pack size ("185g", "2L") stays part of the name, while a
 * leading article number or quantity and a trailing run of bare numbers, codes
 * and unit prices fall away.
 */
function nameOf(tokens: Token[]): string {
  const segments: Token[][] = []
  for (const token of tokens) {
    const segment = segments[segments.length - 1]
    const prev = segment?.[segment.length - 1]
    const gap =
      prev?.box && token.box
        ? token.box.x0 - prev.box.x1 > (4 * (prev.box.x1 - prev.box.x0)) / Math.max(prev.text.length, 1)
        : false
    if (!segment || gap) segments.push([token])
    else segment.push(token)
  }
  const chosen = segments.find(hasNameWord) ?? []
  const figure = (t: Token) => t.money !== null || t.unitQty !== null
  const start = chosen.findIndex((t) => /[A-Za-z]{2}/.test(t.text) && !figure(t))
  if (start < 0) return ''
  let end = start
  for (let i = start; i < chosen.length; i += 1) if (/[A-Za-z]/.test(chosen[i].text) && !figure(chosen[i])) end = i
  return chosen
    .slice(start, end + 1)
    .map((t) => t.text)
    .join(' ')
    .trim()
}

/**
 * The quantity, only where it is printed cleanly. In order: a leading whole
 * number that starts the row; a "unit*qty" or "qty x unit" token; a whole
 * number directly before a unit price in the figures at the row's end.
 * Otherwise "1" — a quantity guessed out of a mangled token is worse than one
 * stated plainly (Gate 54).
 */
function quantityOf(tokens: Token[], price: Token): string {
  const clean = (q: string) => String(Number(q))
  if (tokens.length > 1 && SMALL_INTEGER.test(tokens[0].text) && isWord(tokens[1].text)) {
    return clean(tokens[0].text)
  }
  const combined = tokens.find((t) => t.unitQty)
  if (combined?.unitQty && Number(combined.unitQty.qty) > 0) return clean(combined.unitQty.qty)
  const priceAt = tokens.indexOf(price)
  for (let i = 1; i < priceAt; i += 1) {
    if (tokens[i].money && SMALL_INTEGER.test(tokens[i - 1].text) && Number(tokens[i - 1].text) > 0) {
      return clean(tokens[i - 1].text)
    }
    const spelled = tokens[i].text
    if (/^[xX×]$/.test(spelled) && tokens[i - 1].money && tokens[i + 1]) {
      const q = readMoney(tokens[i - 1].text)
      if (q && q.value > 0 && Number.isInteger(q.value)) return clean(String(q.value))
    }
  }
  return '1'
}

const minConfidence = (tokens: Token[]) =>
  tokens.length === 0 ? 0 : Math.min(...tokens.map((t) => t.confidence))

/**
 * Every purchase, from the item region.
 *
 * ─── THE REGION ─── starts just after the last header row (letterhead,
 * address, phone, date, bill metadata, a column header) above the first priced
 * candidate row, and ends at the first summary row below it. A summary row
 * ends the region if it carries a figure, or if it carries none but an item has
 * already been read — so a column header that names a "Total" column cannot
 * end the region before a single purchase.
 *
 * ─── A ROW IS AN ITEM ─── when it is a candidate, has a figure in the price
 * column, and carries a real word to that figure's left.
 *
 * ─── A TWO-ROW ITEM ─── is a priced row with NO real word (an article number,
 * a unit*qty, a quantity column) directly under a name-only row. The name row
 * must be a candidate inside the region, must not look like an address, phone,
 * postcode, date or web address, and — with boxes — must have no numeric token
 * (digits, and no run of letters) in the price column, because a row that does is a single-row item whose own
 * price the engine could not read, not the first half of the next one.
 *
 * ─── EVERYTHING ELSE IS NOT AN ITEM ─── discounts, summary, tender and meta
 * rows, and unpriced rows under an item, which are that item's components and
 * belong to no item.
 */
function readLineItems(rows: Row[], kinds: Kind[], column: Column) {
  const items: ReceiptLineItem[] = []
  const confidence: number[] = []

  const firstPriced = rows.findIndex(
    (r, i) => kinds[i] === 'candidate' && priceTokenOf(r, column) !== null,
  )
  if (firstPriced < 0) return { items, confidence }

  let start = 0
  for (let i = firstPriced - 1; i >= 0; i -= 1) {
    if (isHeaderRow(rows[i], kinds[i])) {
      start = i + 1
      break
    }
  }

  const usedAsName = new Set<number>()
  for (let i = start; i < rows.length; i += 1) {
    const row = rows[i]
    const kind = kinds[i]
    if (kind === 'summary') {
      if (row.tokens.some((t) => t.money) || items.length > 0) break
      continue
    }
    if (kind !== 'candidate') continue

    const price = priceTokenOf(row, column)
    if (!price) continue
    const left = row.tokens.slice(0, row.tokens.indexOf(price))

    if (hasNameWord(left)) {
      const name = nameOf(left)
      if (name.length === 0) continue
      items.push({ name, quantity: quantityOf(row.tokens, price), price: price.money!.value })
      confidence.push(minConfidence([...left, price]))
      continue
    }

    const a = i - 1
    if (a < start || usedAsName.has(a) || kinds[a] !== 'candidate') continue
    const above = rows[a]
    if (priceTokenOf(above, column) !== null) continue
    if (!hasNameWord(above.tokens) || looksLikeAddress(above)) continue
    if (column) {
      const occupied = above.tokens.some(
        (t) =>
          t.box &&
          /[0-9]/.test(t.text) &&
          !/[A-Za-z]{2}/.test(t.text) &&
          Math.abs(t.box.x1 - column.x1) <= column.tolerance,
      )
      if (occupied) continue
    }
    const name = nameOf(above.tokens)
    if (name.length === 0) continue
    usedAsName.add(a)
    items.push({ name, quantity: quantityOf(row.tokens, price), price: price.money!.value })
    confidence.push(minConfidence([...above.tokens, price]))
  }
  return { items, confidence }
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · FIELDS
// ═════════════════════════════════════════════════════════════════════════════

type Field = { value: number | null; confidence: number | null }
const NONE: Field = { value: null, confidence: null }

/** The rightmost figure on a row and the words between it and the figure before it. */
function lastFigure(row: Row): { token: Token; label: string } | null {
  let last = -1
  for (let i = row.tokens.length - 1; i >= 0; i -= 1) {
    if (row.tokens[i].money) {
      last = i
      break
    }
  }
  if (last < 0) return null
  let start = 0
  for (let i = last - 1; i >= 0; i -= 1) {
    if (row.tokens[i].money) {
      start = i + 1
      break
    }
  }
  return {
    token: row.tokens[last],
    label: labelWords(row.tokens.slice(start, last).map((t) => t.text).join(' ')),
  }
}

const signed = (m: Money) => (m.negative ? -m.value : m.value)
const cents = (n: number) => Math.round(n * 100)

/**
 * The bill's grand total. Chosen, not taken from the first match.
 *
 * CANDIDATES are rows whose label — the words next to the figure, qualifiers
 * removed — holds a grand-total word (`GRAND_TOTAL`) and none of
 * `NOT_THE_TOTAL`. A tax word disqualifies too, unless the label says the tax
 * is INCLUDED ("Total incl. tax"), which is still the total.
 *
 * AMONG CANDIDATES: a 0.00 loses to any non-zero figure ("Total Voucher 0.00"
 * above a real total). Then a candidate CORROBORATED by a card tender of the
 * same amount, or by the items plus tax plus rounding, beats one that is not.
 * Then the first.
 *
 * WITH NO NON-ZERO CANDIDATE: one distinct card-tender amount, which is what
 * was actually charged; else the subtotal plus any rounding. Cash is never a
 * fallback, because cash tendered is routinely more than the bill. A zero
 * candidate is returned only if nothing else was found at all.
 */
function readTotal(rows: Row[], items: ReceiptLineItem[], tax: Field): Field {
  const candidates: { value: number; confidence: number }[] = []
  const cardTenders = new Set<number>()
  let subtotal: number | null = null
  let rounding = 0

  for (const row of rows) {
    const fig = lastFigure(row)
    if (!fig) continue
    const { label, token } = fig
    const value = signed(token.money!)
    const whole = labelWords(row.text)

    if (hasAny(whole, CARD_TENDER) && CARD_TENDER.includes(firstWord(row))) cardTenders.add(cents(value))
    if (subtotal === null && SUBTOTAL_PHRASES.some((p) => whole.includes(` ${p} `))) subtotal = value
    if (hasAny(label, ROUNDING_WORDS)) rounding = value

    if (!hasAny(label, GRAND_TOTAL) && !/ total payment /.test(label)) continue
    if (hasAny(label, NOT_THE_TOTAL)) continue
    if (hasAny(label, TAX_WORDS) && !hasAny(label, ['incl', 'inclusive', 'including'])) continue
    candidates.push({ value, confidence: token.confidence })
  }

  const nonZero = candidates.filter((c) => cents(c.value) !== 0)
  if (nonZero.length > 0) {
    const arithmetic = cents(items.reduce((a, i) => a + i.price, 0) + (tax.value ?? 0) + rounding)
    const byTender = nonZero.find((c) => cardTenders.has(cents(c.value)))
    const byArithmetic = nonZero.find((c) => cents(c.value) === arithmetic)
    const chosen = byTender ?? byArithmetic ?? nonZero[0]
    return { value: chosen.value, confidence: chosen.confidence }
  }

  const tenders = [...cardTenders].filter((c) => c !== 0)
  if (tenders.length === 1) return { value: tenders[0] / 100, confidence: null }
  if (subtotal !== null && subtotal !== 0) return { value: (cents(subtotal) + cents(rounding)) / 100, confidence: null }
  if (candidates.length > 0) return { value: candidates[0].value, confidence: candidates[0].confidence }
  return NONE
}

/**
 * The tax, from a row with a tax label and nowhere else. A figure printed on a
 * total row is never tax, and nor is an amount stated gross or net of tax
 * ("Amount before Tax 41.80"). The rate printed beside it ("(6%)") is
 * a percentage, not money, so the figure is the rightmost amount.
 */
function readTax(rows: Row[]): Field {
  for (const row of rows) {
    const fig = lastFigure(row)
    if (!fig) continue
    const label = labelWords(row.text)
    if (!hasAny(label, TAX_WORDS) || hasAny(label, NOT_THE_TAX)) continue
    return { value: signed(fig.token.money!), confidence: fig.token.confidence }
  }
  return NONE
}

/**
 * The printed date and time, as an ISO 8601 local timestamp.
 *
 * FOUND BY SHAPE, NOT BY THE WORD "Date" — the engine reads that label as
 * "Die:" and "oate". Two-digit years are read as 20xx.
 *
 * DAY-FIRST UNLESS THE PAGE PROVES OTHERWISE, and never a guess past that.
 * These are Malaysian receipts first, so an ambiguous "06/09/2025" is 6
 * September. But a second number above 12 CANNOT be a month, so "03/27/19" is
 * read month-first — that is not a guess, it is the only valid reading. A date
 * with no valid reading either way ("07/41/2020", a misread) is skipped rather
 * than emitted, which the Gate 54 parser did not do: it would print "2020-41-07".
 *
 * THE TIME MAY SIT ON THE NEXT ROW OR THE ONE ABOVE, because receipts print
 * "Date:" and "Time:" as separate lines. Same row first, then adjacent. An
 * invalid time ("07:83") is not a time.
 */
function readDate(rows: Row[]): { value: string | null; confidence: number | null } {
  const timeOn = (row: Row | undefined) => {
    if (!row) return null
    for (const t of row.tokens) {
      const m = /^([0-9]{1,2}):([0-9]{2})(?::[0-9]{2})?(am|pm)?$/i.exec(t.text)
      if (!m) continue
      let hh = Number(m[1])
      const mi = Number(m[2])
      if (m[3]) {
        if (hh < 1 || hh > 12) continue
        hh = (hh % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0)
      }
      if (hh > 23 || mi > 59) continue
      return { hh, mi, token: t }
    }
    return null
  }

  for (let r = 0; r < rows.length; r += 1) {
    for (const token of rows[r].tokens) {
      const m = /^[^0-9]*([0-9]{1,2})([/.-])([0-9]{1,2})\2([0-9]{4}|[0-9]{2})[^0-9]*$/.exec(token.text)
      if (!m) continue
      const a = Number(m[1])
      const b = Number(m[3])
      const year = m[4].length === 4 ? Number(m[4]) : 2000 + Number(m[4])
      const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
      const valid = (d: number, mo: number) =>
        mo >= 1 && mo <= 12 && d >= 1 && d <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1]
      let day: number
      let month: number
      if (valid(a, b)) {
        day = a
        month = b
      } else if (valid(b, a)) {
        day = b
        month = a
      } else continue

      const time = timeOn(rows[r]) ?? timeOn(rows[r + 1]) ?? timeOn(rows[r - 1])
      const pad = (n: number) => String(n).padStart(2, '0')
      const iso = `${year}-${pad(month)}-${pad(day)}T${pad(time?.hh ?? 0)}:${pad(time?.mi ?? 0)}:00`
      const confidences = [token.confidence, ...(time ? [time.token.confidence] : [])]
      return { value: iso, confidence: Math.min(...confidences) }
    }
  }
  return { value: null, confidence: null }
}

// ═════════════════════════════════════════════════════════════════════════════
// THE MERCHANT — UNCHANGED BY GATE 55.
//
// It reads the engine's LINES, not the rebuilt rows, and its rules are exactly
// Gate 54's. The letterhead is centred text above the bill, where the engine's
// own line split is reliable, and the committed merchant fixtures pin this
// behaviour. Decision 9 made the parser layout-aware for items and figures; it
// did not ask for a different merchant.
// ═════════════════════════════════════════════════════════════════════════════

/** Legal-entity suffixes, as the engine actually renders them on this artwork. */
const LEGAL_SUFFIX = /\b(?:s[o0]n\.?\s*bhd|sdn\.?\s*bhd|s[o0]nbhd|sdnbhd|berhad|bhd)\b/i

/** A line that ends the letterhead: the document title or the date row. */
const LETTERHEAD_END = /\b(?:tax\s*inv|invoice|nvoice|wvorce|receipt\s*no|^\s*date\b)/i

/** How many leading lines may be considered part of the letterhead. */
const LETTERHEAD_WINDOW = 6

/** The worst confidence over a whole line, or `null` on a line with no words. */
function confidenceOfLine(line: OcrLine): number | null {
  if (line.words.length === 0) return null
  return Math.min(...line.words.map((w: OcrWord) => w.confidence))
}

/**
 * The merchant, from the letterhead.
 *
 * THE LEGAL-NAME LINE IS PREFERRED OVER THE FIRST LINE, and that is the whole
 * heuristic. A receipt's first line is the logo, and the engine reads a logo as
 * noise — measured: "zon (BIG)", "ri? GROCER", "= LW 2", "al is". The line
 * carrying "Sdn Bhd" is the one the printer set as text, so it is the one that
 * survives OCR. Everything from the suffix rightwards is then cut, which also
 * removes the trailing scan artifacts that sit past it ("... Sdn Bhd hy").
 *
 * IT RETURNS THE LEGAL NAME, NOT THE BRAND, AND THAT IS NOT FIXABLE HERE. The
 * page prints "Giant Hypermarket (Malaysia) Sdn Bhd" where the ledger's payee
 * is "Giant", and no rule reading this page can know to shorten one to the
 * other without a lexicon of merchants — which would be fitting the parser to
 * the ten receipts that happen to be seeded. So the merchant is the field most
 * in need of human correction, which is the concrete argument for the edit
 * affordance rather than an abstract one.
 */
function readMerchant(lines: OcrLine[]): { value: string; confidence: number | null } {
  const window: OcrLine[] = []
  for (const line of lines.slice(0, LETTERHEAD_WINDOW)) {
    if (LETTERHEAD_END.test(line.text)) break
    window.push(line)
  }
  const searched = window.length > 0 ? window : lines.slice(0, 1)

  // THE LEGAL-SUFFIX SEARCH IGNORES `LETTERHEAD_END` AND THE FALLBACK DOES NOT,
  // and the asymmetry is the point. `LETTERHEAD_END` exists to stop the
  // most-letters fallback wandering into the body of the receipt; the legal
  // suffix needs no such protection because "Sdn Bhd" identifies the letterhead
  // on its own, wherever in the opening lines it appears.
  //
  // MEASURED AT GATE 54: the iFruits Market receipt prints "Invoice No:
  // 271828182" ABOVE its letterhead, so the scan stopped one line short of
  // "IFruits Market (M) Sdn Bhd" and the merchant came back as "NX a" — scan
  // noise from the logo. AEON prints the same label BELOW the letterhead, which
  // is why ten seeded receipts never exposed this.
  const legal = lines.slice(0, LETTERHEAD_WINDOW).find((l) => LEGAL_SUFFIX.test(l.text))
  if (legal) {
    const cut = legal.text.search(LEGAL_SUFFIX)
    const cleaned = cleanMerchant(legal.text.slice(0, cut))
    if (cleaned.length > 0) return { value: cleaned, confidence: confidenceOfLine(legal) }
  }

  // FALLBACK: the line with the most letters in it. Used when the engine could
  // not read the legal suffix ("... Sen Bh") or the receipt prints none at all
  // (Tony Roma's letterhead is a wordmark and nothing else).
  let best: OcrLine | null = null
  let bestScore = 0
  for (const line of searched) {
    const score = (line.text.match(/[A-Za-z]/g) ?? []).length
    if (score > bestScore) {
      bestScore = score
      best = line
    }
  }
  if (!best) return { value: '', confidence: null }
  return { value: cleanMerchant(best.text), confidence: confidenceOfLine(best) }
}

/**
 * Tidy a letterhead fragment into a name.
 *
 * Drops parentheticals — they are registration numbers and country codes,
 * "(126926-H)" and "(M)" — then trims the leading and trailing non-letter junk
 * the scan leaves at the page edges, then collapses whitespace.
 */
function cleanMerchant(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^A-Za-z0-9'&.\s-]+/g, ' ')
    .replace(/^[^A-Za-z]+/, '')
    .replace(/[^A-Za-z0-9')]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}


/**
 * Parse one recognised page into receipt fields.
 *
 * EVERY FIELD IS INDEPENDENT AND MAY COME BACK EMPTY. A page whose total is
 * unreadable still yields its line items; a page with no date still yields its
 * total. Nothing here throws on a bad read.
 *
 * THE ORDER IS FORCED IN ONE PLACE: the total is read after the items and the
 * tax, because corroborating a total candidate needs both.
 */
export function parseReceipt(ocr: OcrResult): ParsedReceipt {
  const lines = ocr.lines.filter((l) => l.text.trim().length > 0)
  const merchant = readMerchant(lines)

  const rows = buildRows(ocr)
  const kinds = rows.map(kindOf)
  const column = findPriceColumn(rows)

  const date = readDate(rows)
  const tax = readTax(rows)
  const { items, confidence: itemConfidence } = readLineItems(rows, kinds, column)
  const total = readTotal(rows, items, tax)

  return {
    merchant: merchant.value,
    capturedAt: date.value,
    total: total.value,
    tax: tax.value,
    // MYR IS THE ONLY MEMBER OF `CurrencyCode`, so this is a statement of the
    // model, not a detection — and Decision 9 ruling 4 keeps it that way.
    currency: 'MYR',
    lineItems: items,
    confidence: {
      merchant: merchant.confidence,
      capturedAt: date.confidence,
      total: total.confidence,
      tax: tax.confidence,
      lineItems: itemConfidence,
    },
  }
}
