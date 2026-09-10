import type { Amount, CurrencyCode, ReceiptLineItem } from '../types'
import type { OcrLine, OcrResult, OcrWord } from './recognise'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RECEIPT PARSER (Gate 50-B). HAND-WRITTEN, REGEX AND HEURISTICS.
 *
 * NOT AN LLM, AND THAT IS A RULING RATHER THAN A COST DECISION. An LLM parser
 * would need an API key, would send the OCR text of a user's receipt to a third
 * party, and would make the extraction non-deterministic — so it would break
 * roadmap D9 (the image never leaves the device) in spirit even though it is the
 * text and not the image that travels, and it could not hold a baseline. There
 * is no key anywhere in this repo and none is to be added for this.
 *
 * IT IS PURE, AND DELIBERATELY SO. It takes an `OcrResult` and returns a value;
 * it touches no browser API, no clock and no network. That is what lets a spec
 * assert on it, and what lets the engine be swapped without touching it.
 * ─────────────────────────────────────────────────────────────────────────────
 * WRITTEN AGAINST REAL ENGINE OUTPUT, NOT AGAINST THE IMAGES.
 *
 * Every rule below was derived from Tesseract's actual text for all ten seeded
 * receipts, which is why it tolerates the specific ways this engine fails on
 * this artwork rather than the ways a reader of the photographs might expect it
 * to. Measured examples, verbatim from the engine:
 *
 *   "1 BLAHAJ Soft Toy 79.90"          the accent in BLAHAJ is lost
 *   "SST (6%) 7.19"                    the printed figure is 7.79
 *   "Total (RM) 7908 |"                the decimal point is gone, and junk
 *   "1 Dettol Body Wash 950m 2890"     the price lost its decimal point
 *   "3 Subtotal 74.70 o>"              a total line that STARTS WITH A DIGIT
 *   "Die: 02/09/2025 12:55"            the word "Date" is not reliable
 *   "KER Southeast Asi Sen Bh"         the letterhead is not reliable either
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE STRICTNESS RULE, WHICH IS THE ONE DESIGN DECISION WORTH ARGUING ABOUT.
 *
 * A PRICE IS ONLY A PRICE IF THE PAGE SHOWS AN EXPLICIT DECIMAL POINT. So
 * "2890" is not read as 28.90, and the line carrying it is DROPPED rather than
 * guessed at.
 *
 * THE ALTERNATIVE — treating a trailing "2890" as 28.90 — IS THE SAME CLASS OF
 * ERROR AS INVENTING A LINE ITEM. It would put a number on a user's screen that
 * the paper does not show, and it would be wrong exactly when the receipt
 * genuinely prints a whole-ringgit price. The consequence is stated plainly
 * because it is visible: dropped lines make the DERIVED subtotal lower than the
 * printed one. That is already the app's normal condition — six of the ten
 * seeded receipts do not reconcile internally, recorded in `receipts.ts` and
 * surfaced by the detail sheet since Gate 49 — so a parser that under-reads is
 * consistent with a surface that already shows its disagreements rather than
 * hiding them.
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
   * worst-read token: a mean over "Total (RM) 137.59" lets three confident
   * words carry one doubtful number.
   *
   * ───────────────────────────────────────────────────────────────────────────
   * ⚠️ NOTHING RENDERS THIS, AND THAT IS A MEASURED RULING — NOT AN OMISSION.
   *
   * The plan of record was to mark low-confidence fields in the UI and offer an
   * inline edit. That rested on one falsifiable assumption — that per-word
   * confidence discriminates correct reads from incorrect ones — and Gate 50-B
   * measured it over all ten seeded receipts against the ground truth recorded
   * in `receipts.ts`. IT DOES NOT.
   *
   *   63 parsed fields, 54 correct and 9 wrong
   *   correct    n=54  median 77  mean 69.8  min 0   max 96
   *   INCORRECT  n=9   median 72  mean 55.7  min 0   max 89
   *   AUC = 0.642 over 486 pairs (0.5 is chance)
   *
   * The distributions OVERLAP almost completely, and the best threshold reaches
   * a precision of 0.231 — so more than three of every four fields it marks as
   * doubtful are in fact correct. Catching all nine errors needs a threshold of
   * 90, which flags 51 of 63 fields. A marker on four fifths of the page tells
   * the user nothing.
   *
   * THE DECISIVE CASE IS ON THIS REPO'S OWN FIXTURE. `receipt_ikea02` prints an
   * SST of 7.79 and the engine reads `7.19` — a wrong figure in the one field a
   * user is most likely to trust — and it scores **77**, which is exactly the
   * MEDIAN of the correct population. Meanwhile a correct total of 429.19
   * scores 73 and a correct date scores 47. The wrong value is more confident
   * than many right ones. A threshold cannot separate what is not separated.
   *
   * SO THE FALLBACK IS IN FORCE: parse everything, mark nothing, and let a
   * human correct any field. That affordance is a SCREEN change and therefore
   * not this gate's; the field below is kept because it is what makes the
   * question re-measurable rather than re-arguable.
   *
   * WHAT DOES CARRY SIGNAL IS `OcrResult.confidence`, THE PAGE-LEVEL SCORE —
   * but it predicts COVERAGE, not correctness. Against the fraction of
   * ground-truth line items recovered, running from 0 of 5 items at page
   * confidence 58 to 2 of 2 at 85:
   *
   *   n=9,  excluding receipt_aia01   Pearson 0.876   Spearman 0.840
   *   n=10, including it              Pearson 0.719   Spearman 0.788
   *
   * `receipt_aia01` is excluded because it prints no purchase rows at all — its
   * one item is `AIA Vitality Premiun 320.00`, a description and an amount with
   * no leading quantity, which `readLineItems` rejects by construction. That is
   * a SHAPE mismatch rather than a legibility failure. Both figures are quoted
   * because the exclusion flatters the number and the relationship holds either
   * way.
   *
   * So the honest use of confidence in this app is "this photograph is too poor
   * to read — take another", never "this number might be wrong".
   * ───────────────────────────────────────────────────────────────────────────
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

/** Lines whose text is a summary row rather than a purchase, however they start. */
const SUMMARY_ROW =
  /\b(?:sub\s*-?\s*total|subtotal|total|sst|gst|tax|rounding|round\s*off|change|cash|card|balance|amount\s+due|service\s+charge)\b/i

/** Legal-entity suffixes, as the engine actually renders them on this artwork. */
const LEGAL_SUFFIX = /\b(?:s[o0]n\.?\s*bhd|sdn\.?\s*bhd|s[o0]nbhd|sdnbhd|berhad|bhd)\b/i

/** A line that ends the letterhead: the document title or the date row. */
const LETTERHEAD_END = /\b(?:tax\s*inv|invoice|nvoice|wvorce|receipt\s*no|^\s*date\b)/i

/** How many leading lines may be considered part of the letterhead. */
const LETTERHEAD_WINDOW = 6

/**
 * Read one whitespace-separated token as a money amount.
 *
 * REQUIRES A DECIMAL POINT AND EXACTLY TWO DECIMALS — see the strictness rule
 * above. Thousands separators are accepted because the engine reads them
 * correctly ("2,647.67"), and surrounding non-digits are tolerated because
 * "RM137.59" and "137.59," both occur.
 *
 * NO LOOKBEHIND, DELIBERATELY. Tokenising on whitespace and anchoring the
 * pattern to the whole token does the same job, and keeps the browser floor off
 * the lookbehind feature — which Safari only gained at 16.4.
 */
function amountOfToken(token: string): number | null {
  const m = /^[^0-9]*?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\.([0-9]{2})[^0-9]*$/.exec(token)
  if (!m) return null
  const value = Number(`${m[1].replace(/,/g, '')}.${m[2]}`)
  return Number.isFinite(value) ? value : null
}

/** The confidence of the word whose text is `token`, on this line. Worst match. */
function confidenceOfToken(line: OcrLine, token: string): number | null {
  const hits = line.words.filter((w) => w.text === token)
  if (hits.length === 0) return null
  return Math.min(...hits.map((w) => w.confidence))
}

/** The worst confidence over a whole line, or `null` on a line with no words. */
function confidenceOfLine(line: OcrLine): number | null {
  if (line.words.length === 0) return null
  return Math.min(...line.words.map((w: OcrWord) => w.confidence))
}

function tokensOf(line: OcrLine): string[] {
  return line.text.split(/\s+/).filter((t) => t.length > 0)
}

/**
 * The LAST amount on a line, which is the one summary rows put their figure in.
 *
 * LAST AND NOT FIRST, because "SST (6%) 7.19" would otherwise be read as 6 —
 * the rate is printed before the figure on every one of the ten.
 */
function lastAmountOnLine(line: OcrLine): { value: number; token: string } | null {
  const tokens = tokensOf(line)
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const value = amountOfToken(tokens[i])
    if (value !== null) return { value, token: tokens[i] }
  }
  return null
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

  const legal = searched.find((l) => LEGAL_SUFFIX.test(l.text))
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
 * The printed date, as an ISO 8601 local timestamp.
 *
 * FOUND BY SHAPE, NOT BY THE WORD "Date". The engine reads that label as
 * "Die:", "oate" and "oq oate" on this artwork, so requiring it would lose
 * three of the ten. A DD/MM/YYYY token is unmistakable on its own.
 *
 * DAY-FIRST, BECAUSE THESE ARE MALAYSIAN RECEIPTS. "06/09/2025" is 6 September.
 * Both orderings are ambiguous for the first twelve days of a month and there
 * is nothing on the page to disambiguate them, so the locale is the only
 * available evidence and it is stated here rather than left implicit.
 */
function readDate(lines: OcrLine[]): { value: string | null; confidence: number | null } {
  for (const line of lines) {
    const dateToken = tokensOf(line).find((t) => /^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/.test(t))
    if (!dateToken) continue
    const [dd, mm, yyyy] = dateToken.split('/')

    const timeToken = tokensOf(line).find((t) => /^[0-9]{1,2}:[0-9]{2}$/.test(t))
    const [hh, mi] = timeToken ? timeToken.split(':') : ['00', '00']

    const confidences = [confidenceOfToken(line, dateToken)]
    if (timeToken) confidences.push(confidenceOfToken(line, timeToken))
    const known = confidences.filter((c): c is number => c !== null)

    return {
      value: `${yyyy}-${mm}-${dd}T${hh.padStart(2, '0')}:${mi}:00`,
      confidence: known.length > 0 ? Math.min(...known) : null,
    }
  }
  return { value: null, confidence: null }
}

/** A summary figure — the last amount on the first line matching `label`. */
function readSummary(
  lines: OcrLine[],
  label: RegExp,
): { value: number | null; confidence: number | null } {
  for (const line of lines) {
    if (!label.test(line.text)) continue
    const hit = lastAmountOnLine(line)
    if (hit) return { value: hit.value, confidence: confidenceOfToken(line, hit.token) }
  }
  return { value: null, confidence: null }
}

/**
 * Every purchase line: an integer quantity, a name, and a price with a decimal.
 *
 * SUMMARY ROWS ARE REJECTED BY THEIR TEXT, NOT BY THEIR SHAPE, and one measured
 * line is why: "3 Subtotal 74.70 o>" begins with a digit and would otherwise
 * parse as three Subtotals at RM 74.70. Reading the words is the only reliable
 * way to tell a purchase from a total.
 */
function readLineItems(lines: OcrLine[]): { items: ReceiptLineItem[]; confidence: number[] } {
  const items: ReceiptLineItem[] = []
  const confidence: number[] = []

  for (const line of lines) {
    if (SUMMARY_ROW.test(line.text)) continue
    const tokens = tokensOf(line)
    if (tokens.length < 3) continue

    if (!/^[0-9]{1,3}$/.test(tokens[0])) continue
    const price = amountOfToken(tokens[tokens.length - 1])
    if (price === null) continue

    const name = tokens.slice(1, -1).join(' ').trim()
    // A name needs real letters in it. "1 3 12.90" is a misread, not an item.
    if ((name.match(/[A-Za-z]/g) ?? []).length < 2) continue

    items.push({ name, quantity: tokens[0], price })
    const worst = confidenceOfLine(line)
    confidence.push(worst ?? 0)
  }

  return { items, confidence }
}

/**
 * Parse one recognised page into receipt fields.
 *
 * EVERY FIELD IS INDEPENDENT AND MAY COME BACK EMPTY. A page whose total is
 * unreadable still yields its line items; a page with no date still yields its
 * total. Nothing here throws on a bad read, because a partially-read receipt
 * with a marker on the bad field is more useful than an exception.
 */
export function parseReceipt(ocr: OcrResult): ParsedReceipt {
  const lines = ocr.lines.filter((l) => l.text.trim().length > 0)

  const merchant = readMerchant(lines)
  const date = readDate(lines)
  const tax = readSummary(lines, /\b(?:sst|gst)\b/i)
  const { items, confidence: itemConfidence } = readLineItems(lines)

  let total = readSummary(lines, /\btotal\b/i)
  if (total.value === null) {
    // THE PAYMENT LINE IS THE FALLBACK, and it is a real reading rather than a
    // guess: "Card (Visa) 79.18" is what was actually charged, so when the
    // Total row is unreadable — measured, "Total (RM) 7908 |" — the tender row
    // is the best statement of the same figure the page has left. It is second
    // and not first because a receipt can tender less than the total (a
    // part-payment) or more (cash, with change printed separately).
    total = readSummary(lines, /\b(?:card|cash|paid|tendered)\b/i)
  }

  return {
    merchant: merchant.value,
    capturedAt: date.value,
    total: total.value,
    tax: tax.value,
    // MYR IS THE ONLY MEMBER OF `CurrencyCode`, so this is not a detection but a
    // statement of the model. If a second currency is ever added, the "RM" on
    // these pages is what would distinguish it, and this is where that goes.
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
