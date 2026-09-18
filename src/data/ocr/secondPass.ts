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

/** Did this reading fail badly enough to earn a second pass? */
export function firstPassFailed(parsed: ParsedReceipt): boolean {
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
