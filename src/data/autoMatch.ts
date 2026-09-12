import type { Amount, Receipt, Transaction } from './types'
import { transactionHasReceipt } from './derive'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTO-MATCH (Gate 50-C). DOES A RECEIPT JUST READ OFF A PHOTO LINK ITSELF?
 *
 * PURE. It takes the three fields extraction read, the ledger and the receipt
 * library, and returns a transaction id or `null`. It reads no clock, no
 * browser API and no network, and it writes nothing — the caller decides what
 * to do with the answer. That is what lets `e2e/automatch.spec.ts` import it
 * straight into Playwright's Node context.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RULE, AS IMPLEMENTED. A receipt links automatically ONLY when EXACTLY ONE
 * candidate transaction agrees on all three:
 *
 *   total     exact to the sen, compared in integer cents. The ledger is
 *             signed and a receipt total is not: on every linked row in the
 *             seed the amount is the receipt's total NEGATED (`receipts.ts`,
 *             Gate 48). So only an OUTFLOW can match, and it matches when
 *             `-amount === total`. A credit whose magnitude equals the total is
 *             NOT a candidate — linking one would mean the amount no longer
 *             follows the receipt without flipping its sign.
 *   date      the transaction's calendar date is within 3 days of the
 *             receipt's printed date, BOTH WAYS, INCLUSIVE: day 3 matches and
 *             day 4 does not. Compared as WALL-CLOCK calendar dates — see
 *             `wallClockDay` for the frame and why the time of day is ignored.
 *   merchant  fuzzy, hand-written — see `merchantMatches`.
 *
 * Zero candidates, or two or more, and the receipt stays unlinked. Unlinked is
 * never an error and nothing is shown for it.
 *
 * A FALSE LINK IS WORSE THAN A MISSED ONE, and every choice below leans that
 * way. A miss costs the user one manual link. A false link silently attaches a
 * purchase to the wrong ledger row, and nothing on screen warns anyone.
 * ─────────────────────────────────────────────────────────────────────────────
 * WHO IS A CANDIDATE: a transaction that does NOT already have a receipt.
 *
 * Auto-match must never displace a receipt the user already linked; replacing
 * one is a deliberate user action. So a second photo of an already-linked
 * receipt stays unlinked — its own transaction is not a candidate.
 *
 * WHAT IS NEVER READ: "now". Every comparison here is between two RECORDED
 * dates — the receipt's printed one and the ledger row's — so no clock enters
 * at all, neither `Date.now()` nor `ledgerNow()`. An unread date is `null` and
 * fails the rule; it is never filled from a clock (`extract.ts`, Gate 50-C).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The three fields the rule reads, exactly as extraction produced them. */
export interface MatchFields {
  /** `null` — or an empty string — when the letterhead was not read. */
  merchant: string | null
  /** ISO 8601 local timestamp, or `null` when no date was read. */
  capturedAt: string | null
  /** The printed total, positive, or `null` when unread. */
  total: Amount | null
}

/** Inclusive. A transaction 3 calendar days away matches; 4 does not. */
export const MATCH_WINDOW_DAYS = 3

/** The shortest token a one-letter misread is forgiven in. See `tokensAgree`. */
const FUZZY_MIN_LENGTH = 6

function toCents(value: number): number {
  return Math.round(value * 100)
}

/**
 * The calendar day of an ISO local timestamp, as a whole-number day index — or
 * `null` when the string is not a real `YYYY-MM-DD…` date.
 *
 * WALL-CLOCK, NOT INSTANTS. Both timestamps are written without a zone — the
 * receipt's is what the paper printed, the ledger's is what the account
 * recorded — so neither can be placed on the global timeline, and parsing
 * either with `new Date(iso)` would put it in whatever zone the VIEWER's device
 * happens to be in. Reading the date fields directly and indexing them with
 * `Date.UTC` treats both as the same naive calendar, so the answer cannot move
 * with the device's zone or a daylight-saving boundary. `Date.UTC` is pure
 * arithmetic here; it reads no clock.
 *
 * THE TIME OF DAY IS IGNORED, DELIBERATELY. A card payment can post to the
 * ledger at a different hour, or on a later day, than the till printed; "within
 * 3 days" is a statement about dates, and measuring it in hours would make a
 * receipt printed at 23:50 fall out of a window that one printed at 00:10 on
 * the same day falls into.
 *
 * AN IMPOSSIBLE DATE IS UNREAD. OCR can compose `2025-13-45` from a misread
 * `45/13/2025`; `Date.UTC` would silently roll that into a real day, so the
 * round trip is checked and a date that does not survive it is `null`.
 */
export function wallClockDay(iso: string): number | null {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})(?:T|$)/.exec(iso)
  if (!m) return null
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const ms = Date.UTC(year, month - 1, day)
  const back = new Date(ms)
  if (
    back.getUTCFullYear() !== year ||
    back.getUTCMonth() !== month - 1 ||
    back.getUTCDate() !== day
  ) {
    return null
  }
  return ms / 86_400_000
}

/** Whether a ledger row's amount is exactly this receipt total, as an outflow. */
export function totalMatches(total: Amount, transaction: Transaction): boolean {
  const cents = toCents(total)
  return cents > 0 && transaction.amount < 0 && toCents(-transaction.amount) === cents
}

/** Whether a ledger row falls within the window of a receipt's printed date. */
export function withinWindow(capturedAt: string, transaction: Transaction): boolean {
  const receiptDay = wallClockDay(capturedAt)
  const rowDay = wallClockDay(transaction.occurredAt)
  if (receiptDay === null || rowDay === null) return false
  return Math.abs(rowDay - receiptDay) <= MATCH_WINDOW_DAYS
}

/**
 * A merchant string as comparable tokens.
 *
 * In order: accents are stripped (`BLÅHAJ` and `BLAHAJ` are one word, and OCR
 * drops the ring); everything is lower-cased; a possessive `'s` is dropped
 * (`Lotus's` and `Tony Roma's` are the brands Lotus and Tony Roma); any other
 * apostrophe is dropped; and every run of non-alphanumerics becomes a break.
 *
 * NOTHING HERE KNOWS ANY MERCHANT. There is no list of brands and no table of
 * legal names — a table mapping `IKEA Southeast Asia` to `IKEA` would make the
 * ten seeded receipts pass without the matcher working, and is forbidden.
 */
export function merchantTokens(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
}

/** Levenshtein distance, stopping early once it exceeds `limit`. */
function editDistanceWithin(a: string, b: string, limit: number): boolean {
  if (Math.abs(a.length - b.length) > limit) return false
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
      rowMin = Math.min(rowMin, current[j])
    }
    if (rowMin > limit) return false
    previous = current
  }
  return previous[b.length] <= limit
}

/**
 * Whether one payee token and one receipt token are the same word.
 *
 * EQUAL, OR — ONLY WHEN BOTH ARE AT LEAST SIX LETTERS — ONE EDIT APART. One
 * misread letter in a long word is the commonest OCR error and one edit in six
 * leaves the word recognisable. In a short word it does not: `ikea` is one
 * edit from `idea` and `kea`, `kfc` one from `kfd`. So a brand of five letters
 * or fewer must be read exactly. A dropped LEADING letter on a short brand —
 * `KEA Southeast Asia` for IKEA, measured at Gate 50-B — therefore stays
 * unlinked, which is the asymmetry working rather than a gap in it.
 */
function tokensAgree(payee: string, receipt: string): boolean {
  if (payee === receipt) return true
  if (payee.length < FUZZY_MIN_LENGTH || receipt.length < FUZZY_MIN_LENGTH) return false
  return editDistanceWithin(payee, receipt, 1)
}

/**
 * Whether the merchant read off a receipt names the ledger's payee.
 *
 * THE PAYEE'S WORDS MUST ALL APPEAR IN WHAT THE RECEIPT PRINTS — not the other
 * way round. OCR returns the LEGAL ENTITY off the letterhead ("IKEA Southeast
 * Asia", "Giant Hypermarket") where the ledger carries the BRAND ("IKEA",
 * "Giant"), and a legal name is the brand plus words. Every payee token must
 * agree with some receipt token; extra receipt tokens cost nothing.
 *
 * A SECOND, EQUALLY STRICT PATH: SPACING. The payee with its spaces removed may
 * equal a run of consecutive receipt tokens joined, or one receipt token — so
 * "Touch N Go" names a receipt printing "TouchNGo", and "Aeon Big" one printing
 * "AEONBIG". Letters must still agree exactly; only the gaps are forgiven.
 *
 * AN EMPTY SIDE NEVER MATCHES. A payee or a merchant with no letters or digits
 * left in it names nothing.
 */
export function merchantMatches(receiptMerchant: string, payee: string): boolean {
  const r = merchantTokens(receiptMerchant)
  const p = merchantTokens(payee)
  if (r.length === 0 || p.length === 0) return false

  if (p.every((pt) => r.some((rt) => tokensAgree(pt, rt)))) return true

  const joined = p.join('')
  for (let i = 0; i < r.length; i += 1) {
    let run = ''
    for (let j = i; j < r.length && run.length < joined.length; j += 1) {
      run += r[j]
      if (run === joined) return true
    }
  }
  return false
}

/**
 * Every transaction the rule would accept for one receipt, before the batch is
 * considered.
 *
 * A NULL FIELD ANSWERS AT ONCE WITH NO CANDIDATES — the rule cannot be
 * satisfied by a field extraction did not read. So does an empty merchant, and
 * a date that is not a real date.
 */
export function candidatesFor(
  fields: MatchFields,
  transactions: Transaction[],
  receipts: Receipt[],
): Transaction[] {
  const { merchant, capturedAt, total } = fields
  if (merchant === null || capturedAt === null || total === null) return []
  if (merchant.trim().length === 0 || wallClockDay(capturedAt) === null) return []

  // `transactionHasReceipt` IS REUSED RATHER THAN RESTATED, so "already has a
  // receipt" means here exactly what it means to the ledger row's glyph.
  return transactions.filter(
    (t) =>
      totalMatches(total, t) &&
      withinWindow(capturedAt, t) &&
      !transactionHasReceipt(receipts, t.id) &&
      merchantMatches(merchant, t.merchant),
  )
}

/**
 * Decide the link for every receipt in one Save, together.
 *
 * Returns one entry per input, in input order: the transaction id it links to,
 * or `null`.
 *
 * ONE-TO-ONE IN BOTH DIRECTIONS WITHIN A BATCH. A receipt links only when it
 * has exactly one candidate; and a transaction that more than one receipt in
 * the same batch would claim links to NONE of them. The second half is what
 * makes the result independent of FILE ORDER: a first-come rule would give the
 * transaction to whichever photo the picker happened to list first, and the
 * same Save would link differently depending on how the user tapped. Every step
 * here is a per-receipt test or a count over the whole batch, and neither can
 * see order.
 *
 * `receipts` IS THE LIBRARY BEFORE THIS BATCH IS ADDED. The batch's own
 * receipts are not yet in it, which is why the batch rule above is needed at
 * all.
 *
 * IT RUNS ONCE, WHEN THE BATCH IS ADDED, AND NEVER AGAIN. Nothing re-runs it
 * over the library — not a re-render, not an unlink. Unlinking a receipt makes
 * its transaction receipt-less, so a re-run would find it a candidate and
 * re-link the very receipt the user just unlinked.
 */
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE SUGGESTION FOR THE MANUAL PICKER (Gate 51-B).
 *
 * THE PICKER IS THE RECOVERY PATH FOR EVERY AUTO-LINK THE RULE ABOVE DECLINES,
 * so its ranking is DELIBERATELY LOOSER than the rule. The rule requires all
 * three criteria and exactly one candidate, because a false link is silent; a
 * suggestion is a row the user is about to look at, so a wrong one costs a
 * glance.
 *
 * IT REUSES `totalMatches`, `withinWindow` AND `merchantMatches` RATHER THAN
 * RESTATING THEM. There is ONE definition of "agree" in this app, and a second
 * one here would drift from the rule it exists to recover from — the shape
 * `Transaction.hasReceipt` had before Gate 48 deleted it.
 *
 * WHAT QUALIFIES: an exact total, OR date and merchant together. A single
 * criterion other than the total is not enough — "same day" alone would offer
 * most of the ledger, and a fuzzy merchant alone would offer every IKEA row.
 * The total is sufficient alone because the seed's 23 magnitudes are distinct
 * (measured, Gate 50-C) and a sen-exact total is the strongest single evidence
 * a receipt carries.
 *
 * CREDITS ARE NEVER SUGGESTED, because `totalMatches` and the outflow test both
 * reject them — a receipt records a payment, which is the same reason the rule
 * above requires `-amount === total`. The picker excludes them from its WHOLE
 * list, not just from this group; that is the caller's filter, stated here so
 * the two cannot disagree.
 *
 * A TRANSACTION THAT ALREADY HAS A RECEIPT IS STILL SUGGESTED. That is the one
 * place this deliberately differs from `candidatesFor`, which excludes them:
 * auto-match must never displace a link silently, but a user choosing a row
 * explicitly is exactly the deliberate action that ruling reserved. The picker
 * asks before swapping.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface RankedSuggestion {
  transaction: Transaction
  /** How many of the three criteria agree. At least 1, at most 3. */
  score: number
  totalAgrees: boolean
  dateAgrees: boolean
  merchantAgrees: boolean
  /** Whole calendar days between the two dates, or `null` when either is unread. */
  dayGap: number | null
}

/**
 * Rank the transactions worth offering first for one receipt.
 *
 * ORDER: criteria agreed (descending), then an exact total ahead of one
 * without, then the closest date, then newest. Every tie-break is total before
 * date before recency, so the ordering is a function of the data alone and
 * cannot depend on the input array's order.
 *
 * AN EMPTY RESULT MEANS THE GROUP IS OMITTED ENTIRELY — the caller draws no
 * heading and no "no suggestions" copy. A heading over nothing is a statement
 * the app cannot support.
 */
export function rankedSuggestions(
  fields: MatchFields,
  transactions: Transaction[],
): RankedSuggestion[] {
  const { merchant, capturedAt, total } = fields
  const receiptDay = capturedAt === null ? null : wallClockDay(capturedAt)

  return transactions
    .filter((t) => t.amount < 0)
    .map((transaction) => {
      const totalAgrees = total !== null && totalMatches(total, transaction)
      const dateAgrees = capturedAt !== null && withinWindow(capturedAt, transaction)
      const merchantAgrees =
        merchant !== null &&
        merchant.trim().length > 0 &&
        merchantMatches(merchant, transaction.merchant)

      const rowDay = wallClockDay(transaction.occurredAt)
      const dayGap =
        receiptDay === null || rowDay === null ? null : Math.abs(rowDay - receiptDay)

      return {
        transaction,
        score: Number(totalAgrees) + Number(dateAgrees) + Number(merchantAgrees),
        totalAgrees,
        dateAgrees,
        merchantAgrees,
        dayGap,
      }
    })
    .filter((s) => s.totalAgrees || (s.dateAgrees && s.merchantAgrees))
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
      if (a.totalAgrees !== b.totalAgrees) return a.totalAgrees ? -1 : 1
      // AN UNREAD DATE SORTS LAST RATHER THAN FIRST. `null` means "no evidence",
      // and treating it as gap 0 would rank a row with no date agreement above
      // one measured to be a day away.
      const ga = a.dayGap ?? Number.POSITIVE_INFINITY
      const gb = b.dayGap ?? Number.POSITIVE_INFINITY
      if (ga !== gb) return ga - gb
      return b.transaction.occurredAt.localeCompare(a.transaction.occurredAt)
    })
}

export function autoMatchBatch(
  batch: MatchFields[],
  transactions: Transaction[],
  receipts: Receipt[],
): (string | null)[] {
  const proposals = batch.map((fields) => {
    const candidates = candidatesFor(fields, transactions, receipts)
    return candidates.length === 1 ? candidates[0].id : null
  })

  const claims = new Map<string, number>()
  for (const id of proposals) {
    if (id !== null) claims.set(id, (claims.get(id) ?? 0) + 1)
  }
  return proposals.map((id) => (id !== null && claims.get(id) === 1 ? id : null))
}
