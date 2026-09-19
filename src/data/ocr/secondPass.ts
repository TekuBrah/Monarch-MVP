import type { ParsedReceipt } from './parseReceipt'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SECOND READING PASS — WHEN IT RUNS, AND WHICH READING IS KEPT (Gate 58).
 *
 * PURE, AND IMPORTS NOTHING THAT RUNS. It takes parses and returns a decision,
 * so the rules are tested in Node in milliseconds (`e2e/second-pass.spec.ts`)
 * and a change to either one is measured against the cached corpus without
 * running the engine again. The orchestration — two recognitions, one after
 * the other — is `read.ts`.
 *
 * ─── THE TRIGGER IS THE OUTCOME, NEVER THE CONFIDENCE ────────────────────────
 *
 * A first pass FAILED when it produced NO LINE ITEMS, or NO TOTAL. Either half
 * alone is enough.
 *
 * Why not confidence: Gate 57 measured page confidence separating photographs
 * from everything else by ONE point (43 against 44). A behaviour gated on that
 * would flip on noise.
 *
 * Why "or" and not "and": a photograph that reads badly does not always read
 * NOTHING. On the corpus two of the five photographed receipts produce two junk
 * rows and no total; an "and" trigger would let both escape with nothing usable
 * on screen. A total without items, or items without a total, is equally not a
 * usable receipt.
 *
 * Why this does not re-read good receipts: on the 30-image corpus no receipt
 * that reads both items and a total triggers it, by construction — and none of
 * the 20 development receipts that read correctly lacks either. The eight that
 * trigger are all failures already (Gate 58's report lists them).
 *
 * WHAT IT DOES NOT CATCH, STATED: a receipt that reads a WRONG total, or junk
 * rows plus some total, looks successful and is not re-read. Correctness cannot
 * be judged from the page, which is why the trigger is about absence.
 *
 * ─── THE CHOICE CANNOT LOSE A FIRST PASS THAT READ MORE ──────────────────────
 *
 *   1. more line items wins;
 *   2. equal item counts: a reading WITH a total beats one without;
 *   3. otherwise — including when both read nothing at all — the FIRST pass.
 *
 * The first pass is the tie-breaker because it is the pipeline every other
 * receipt uses and the one the parser was measured against; the second pass has
 * to earn its place by reading strictly more.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Did this reading fail badly enough to earn a second pass?
 *
 * GATE 60 APPLIES IT A SECOND TIME, TO THE READING KEPT — through
 * `receiptReadFailed` in `derive.ts`, which is what decides whether a receipt
 * shows the "we couldn't read this photo" advisory. So the parameter is the two
 * fields the rule reads rather than a whole `ParsedReceipt`: a stored `Receipt`
 * can supply exactly those two, and the advisory can then call THIS function
 * instead of restating the rule beside it. One rule, two moments.
 */
export function firstPassFailed(parsed: Pick<ParsedReceipt, 'lineItems' | 'total'>): boolean {
  return parsed.lineItems.length === 0 || parsed.total === null
}

/** Which of two readings to keep. See the header for the three rules. */
export function chooseReading(first: ParsedReceipt, second: ParsedReceipt): 'first' | 'second' {
  if (second.lineItems.length !== first.lineItems.length) {
    return second.lineItems.length > first.lineItems.length ? 'second' : 'first'
  }
  if (second.total !== null && first.total === null) return 'second'
  return 'first'
}

/**
 * THE SAME TWO DECISIONS, IN WORDS, FOR THE CAPTURE DIAGNOSTIC (Gate 59).
 *
 * DELIBERATELY NOT HOW THE PIPELINE DECIDES. `firstPassFailed` and
 * `chooseReading` above are what `read.ts` runs, untouched, so the diagnostic
 * adds no work to a capture read with the flag off. These restate the rules as
 * sentences, and `e2e/capture-diagnostics.spec.ts` asserts over every branch
 * that each one agrees with the function it describes — so the two cannot drift
 * apart without a test going red.
 */
export function describeFirstPassFailure(parsed: ParsedReceipt): string | null {
  const noItems = parsed.lineItems.length === 0
  const noTotal = parsed.total === null
  if (noItems && noTotal) return 'first pass read no line items and no total'
  if (noItems) return 'first pass read no line items'
  if (noTotal) return 'first pass read no total'
  return null
}

export function explainChoice(
  first: ParsedReceipt,
  second: ParsedReceipt,
): { pick: 'first' | 'second'; why: string } {
  const a = first.lineItems.length
  const b = second.lineItems.length
  if (a !== b) {
    return b > a
      ? { pick: 'second', why: `second pass read more line items (${b} against ${a})` }
      : { pick: 'first', why: `first pass read more line items (${a} against ${b})` }
  }
  if (second.total !== null && first.total === null) {
    return { pick: 'second', why: `equal line items (${a}); only the second pass read a total` }
  }
  return { pick: 'first', why: `equal line items (${a}) and no total gained; the first pass is the tie-breaker` }
}
