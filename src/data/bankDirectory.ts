import type { DirectoryAccount } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE MOCK NAME ENQUIRY — Gate 101 (Flow 6), R100-1.
 *
 * The drawn form (`1266:14387`) asks for no name, yet the next screen
 * (`1266:14388`) prints "Gunther Cenperk". A real DuitNow send gets the name the
 * same way: the sender's bank runs a Name Enquiry against the payee's bank and
 * DISPLAYS the registered name before the sender confirms. This constant stands
 * in for that answer. A number it does not hold is "We couldn't find this
 * account." and Next refuses.
 *
 * A COMMITTED CONSTANT, NEVER STORED, OUTSIDE THE SEED FINGERPRINT. Every name
 * here is fictional.
 *
 * `accountAgeDays` AND `transactionCount` ARE THE PAYEE BANK'S FIXED ANSWER AT
 * LOOKUP, stored as plain numbers with NO DATE ARITHMETIC. That is deliberate:
 * a mock enquiry response is a fact handed back by another bank, not something
 * this app derives from a clock, so the walk states, the harness's pinned clock
 * and a real device all read the same figures and nothing drifts day to day.
 * Decision 35 (Gate 103) reads both: under 30 days, or fewer than 10
 * transactions.
 *
 * THE ROWS, AND WHICH CASE EACH EXISTS FOR:
 *   Gunther Cenperk  — Figma's drawn payee: 10 days, 2 transactions (both (a) and (b))
 *   Wren Halloway    — a young but busy account: (a) alone
 *   Orrin Teale      — an old but quiet account: (b) alone
 *   Delphine Marrow  — a long-standing, busy person at another bank (neither)
 *   Lumen & Larch Florist — a long-standing business, so 22A's business ->
 *                      payment path is reachable from a new recipient
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const BANK_DIRECTORY: DirectoryAccount[] = [
  { bankCode: 'AFFIN', accountNo: '6451352078', name: 'Gunther Cenperk', kind: 'person', accountAgeDays: 10, transactionCount: 2 },
  { bankCode: 'RHB', accountNo: '21430005678124', name: 'Wren Halloway', kind: 'person', accountAgeDays: 12, transactionCount: 38 },
  { bankCode: 'PBB', accountNo: '3109876543', name: 'Orrin Teale', kind: 'person', accountAgeDays: 1460, transactionCount: 4 },
  { bankCode: 'MBB', accountNo: '512345678901', name: 'Delphine Marrow', kind: 'person', accountAgeDays: 2190, transactionCount: 846 },
  { bankCode: 'CIMB', accountNo: '8001234567', name: 'Lumen & Larch Florist', kind: 'business', accountAgeDays: 3285, transactionCount: 5120 },
]
