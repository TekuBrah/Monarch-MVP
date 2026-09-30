import type { Commitment } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FLOW 11 — THE SEEDED COMMITMENTS (Gate 75). Read-only; nothing writes these.
 *
 * ⚠ FIVE, NOT SEVEN — AND GATE 76 SETTLED THE COUNT: FIGMA DRAWS SEVEN.
 *
 * `MONARCH-MVP-PHASE5-FLOW-INVENTORY.md` §2 states the Plans tab holds "2 goal
 * cards + 5 commitments", and the document names exactly five entities across
 * §2, §A6 and §F: Mortgage, Car Payment, Internet (U-Mobile), Netflix and
 * Anytime Fitness. Gate 75 could not reach Figma — the local MCP refused the
 * connection and the remote was unauthenticated — so it seeded the inventory's
 * five as the choice that invents least, and asked a later gate to re-read.
 *
 * ⚠ GATE 76 RE-READ `1266:14339` AND FIGMA DRAWS SEVEN ROWS. It adds
 * **Golf Lesson** (RM 20.00) and **Phone Plan** (RM 35.00), and FOUR of the five
 * seeded amounts also disagree with the frame:
 *
 *   Mortgage        Figma 1,200.00   seeded 2,450.00
 *   Car Payment     Figma   500.00   seeded 1,180.00
 *   Internet        Figma   120.00   seeded   120.00  ← the only agreement
 *   Netflix         Figma    20.00   seeded    54.90
 *   Anytime Fitness Figma   160.00   seeded   128.00
 *
 * **NOTHING WAS CHANGED, ON GATE 76's OWN INSTRUCTION**: adding the two rows or
 * moving any amount is a seed change and Teku's call, not a silent fix inside a
 * gate scoped to rendering. The frame also nests a `System message` promotion
 * banner under the Internet row, which is Gate 78's.
 *
 * SO THE FIVE BELOW ARE A DELIBERATE SUBSET, NOT AN UNVERIFIED GUESS. That is
 * the one thing that changed: the count is no longer unknown.
 *
 * ───────────────────── WHAT IS TRANSCRIBED, WHAT IS AUTHORED ─────────────────
 *
 * TRANSCRIBED: all five names, the two provider brands the inventory names
 * (U-Mobile, Netflix), the icon-versus-logo split (§F: "grayscale icons
 * (Mortgage, Car Payment) and brand logos (U-Mobile, Netflix)"), and Internet's
 * RM 120.00 — the figure §A1 calls the smart-insight panel's "Current".
 *
 * SOURCED FROM THIS REPO'S OWN LEDGER: Netflix RM 54.90 and Anytime Fitness
 * RM 128.00, taken from `txn-netflix-0905` and `txn-anytimefitness-0903`. Figma's
 * own figures for these two were NOT readable this session, so the ledger is used
 * as the best available source rather than a number being invented. That makes
 * these two AGREE with the ledger where `CLAUDE.md` predicts a disagreement —
 * see the warning below.
 *
 * AUTHORED, because no source carries them: Mortgage's and Car Payment's
 * amounts, every `nextDueOn`, and every `category`.
 *
 * ⚠ THE LEDGER LINK IS NOT MODELLED, AND THE AGREEMENT ABOVE IS A COINCIDENCE OF
 * SOURCING RATHER THAN A JOIN. Nothing here points at a transaction and nothing
 * derives a commitment from one (Claude, delegated: 4I). Linking a bill to its
 * charges needs merchant rules this app does not have, and inventing the join
 * would put a false relationship on screen. `Internet` is the case that shows the
 * gap plainly: the commitment is RM 120.00 while the ledger's `txn-umobile-0820`
 * row is RM 75.00, and neither figure is wrong — they are a plan and a charge,
 * and nothing reconciles them yet.
 *
 * ⚠ NO OFFER, NO SMART-INSIGHT DATA, AND NO SAVINGS FIGURE IS SEEDED HERE. Gate
 * 78 owns it, and it needs a ruling first: §A1 records THREE contradictory
 * savings figures for one promotion, and its stated disposition is FIX IN FIGMA
 * at RM 50/month (120 − 70), while `CLAUDE.md`'s later ruling 3H takes RM 51
 * (120 − 69) because RM 69 matches the promo artwork. Whichever wins, the saving
 * must be DERIVED from the two prices and never typed.
 *
 * DATES ARE TYPED DATA, EXEMPT FROM B5, and `nextDueOn` is placed after the
 * harness clock (`PINNED_NOW` = 2026-08-15) so every commitment reads as
 * upcoming. §A5 records Figma's own commitment date as "Oct 7, 2025", which is in
 * the past relative to that clock and is a format note rather than a spec.
 *
 * NP1: EVERY FIELD IS PLAIN SERIALISABLE DATA.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const COMMITMENTS: Commitment[] = [
  {
    id: 'commitment-mortgage',
    name: 'Mortgage',
    // §F: a grayscale ICON, not a brand mark — a mortgage has no logo to ship.
    // TRANSCRIBED (Gate 76, `1266:14339`): Figma paints this badge `Color=Teal`.
    logo: { kind: 'icon', name: 'icon_home', tint: 'teal' },
    // AUTHORED. No source on disk carries a figure for this row.
    amount: 2450,
    cadence: 'monthly',
    nextDueOn: '2026-09-01',
    category: 'bills',
  },
  {
    id: 'commitment-car-payment',
    name: 'Car Payment',
    // §F: a grayscale ICON. `icon_car` is also the `transport` category's glyph.
    // TRANSCRIBED (Gate 76, `1266:14339`): Figma paints this badge `Color=Gray`,
    // which is the "grayscale icon" §F describes in as many words.
    logo: { kind: 'icon', name: 'icon_car', tint: 'gray' },
    // AUTHORED. No source on disk carries a figure for this row.
    amount: 1180,
    cadence: 'monthly',
    nextDueOn: '2026-08-28',
    category: 'transport',
  },
  {
    id: 'commitment-internet',
    name: 'Internet',
    // §2 names U-Mobile as this commitment's provider.
    logo: { kind: 'brand', name: 'umobile' },
    // TRANSCRIBED (§A1): the smart-insight panel's "Current (RM 120.00)". This is
    // the row Gate 78's offer attaches to, and the one that disagrees with the
    // ledger's RM 75.00 U Mobile charge.
    amount: 120,
    cadence: 'monthly',
    nextDueOn: '2026-09-07',
    category: 'bills',
  },
  {
    id: 'commitment-netflix',
    name: 'Netflix',
    logo: { kind: 'brand', name: 'netflix' },
    // SOURCED from this repo's ledger: `txn-netflix-0905` is −54.90.
    amount: 54.9,
    cadence: 'monthly',
    nextDueOn: '2026-09-05',
    category: 'bills',
  },
  {
    id: 'commitment-anytime-fitness',
    name: 'Anytime Fitness',
    logo: { kind: 'brand', name: 'anytimefitness' },
    // SOURCED from this repo's ledger: `txn-anytimefitness-0903` is −128.00, and
    // that row's own category is `others`, which this row follows.
    amount: 128,
    cadence: 'monthly',
    nextDueOn: '2026-09-03',
    category: 'others',
  },
]
