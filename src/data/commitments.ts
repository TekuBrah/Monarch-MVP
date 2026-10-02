import type { Commitment } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FLOW 11 — THE SEEDED COMMITMENTS. Read-only; nothing writes these.
 *
 * SEVEN ROWS, AND EVERY FIGURE IS FIGMA'S (Gate 80).
 *
 * Gate 75 seeded the inventory's FIVE with no Figma access. Gate 76 re-read
 * `1266:14339` and found SEVEN but was scoped to rendering, so it recorded the
 * disagreement and changed nothing. Gate 80 read all seven rows itself, with
 * both sources named, under the standing ruling that FIGMA IS THE SOURCE OF
 * TRUTH here — it is the thing Teku drew, and the flow inventory is older.
 *
 *   row              FIGMA        was seeded   mark (Figma)
 *   Mortgage         1,200.00     2,450.00     icon `home`, Teal
 *   Car Payment        500.00     1,180.00     icon `icon_car`, Gray
 *   Internet           120.00       120.00     logo `umobile`   <- the only agreement
 *   Netflix             20.00        54.90     logo `netflix`
 *   Golf Lesson         20.00        ABSENT    icon `golf_course`, Green
 *   Anytime Fitness    160.00       128.00     logo `anytimefitness`
 *   Phone Plan          35.00        ABSENT    logo `celcom`
 *
 * THE DS CORROBORATES THE FRAME INDEPENDENTLY: `golf_course` shipped in the
 * icon registry at v2.7.0, and it exists only because Figma draws that row.
 * `celcom` has been in `LogoName` throughout.
 *
 * ⚠ MORTGAGE'S GLYPH IS THE MATERIAL `home`, NOT THE CUSTOM `icon_home` the
 * Gate 75 seed carried, and that was settled by GEOMETRY rather than by the
 * layer name — a Figma component description carries Material keyword lists
 * even for icons the DS ships as custom assets, so the keywords prove nothing.
 * Figma's rendered 32x32 path `M13.3304 25.77 V19.1033 H18.6637 V25.77` is the
 * Material round `home` (`M10 19v-5h4v5`) scaled 4/3 with a +0.437 y-shift; the
 * custom `icon_home` starts `M3 19.8437V9.71875` and is unrelated. The same 4/3
 * check confirms `golf_course` IS the DS custom asset.
 *
 * ───────────────────────────── THE DUE DATES ────────────────────────────────
 *
 * ALL SEVEN MOVED TO OCTOBER, WHICH IS WHAT FIGMA DRAWS: 1, 1, 7, 2, 2, 5, 5 Oct.
 * The Gate 75 seed placed them in Aug/Sept because it had no frame to read.
 *
 * THE YEAR IS 2026 AND FIGMA SAYS 2025, DELIBERATELY. The detail frame prints
 * "Oct 7, 2025" while the list row beside it says "next on 7 Oct" — and 2025 is
 * in the PAST relative to the harness clock (`PINNED_NOW` = 2026-08-15), so the
 * frame's own year contradicts its own "next on" framing. 2026 is the only year
 * that keeps every row upcoming, which is the invariant `goals.spec.ts` holds.
 *
 * DATES ARE TYPED DATA, EXEMPT FROM B5 — the same standing exemption budget and
 * goal dates carry.
 *
 * ─────────────────── WHAT IS TRANSCRIBED, WHAT IS AUTHORED ──────────────────
 *
 * TRANSCRIBED from `1266:14339`: all seven names, amounts, cadences and due
 * dates, every brand logo, every icon name and every badge tint. From
 * `1266:14343`: Internet's `provider`, `planName` and `contractEndsOn`.
 *
 * AUTHORED, because no source carries them: every `category`, and
 * `paymentAccountId` — attributed to `main` wholesale, the Gate 77 precedent.
 *
 * ⚠ SIX OF THE SEVEN HAVE NO `provider`, `planName` OR `contractEndsOn`, AND
 * THAT IS THE POINT. Figma draws ONE commitment detail. Inventing a plan name
 * and a contract end date for six undrawn rows would be eighteen fabrications
 * to fill three fields; each is optional and its row simply omits it.
 *
 * ⚠ THE LEDGER LINK IS NOT MODELLED. Nothing here points at a transaction
 * (Claude, delegated: 4I). Internet shows the gap plainly: the commitment is
 * RM 120.00 while `txn-umobile-0820` is RM 75.00, and neither is wrong — they
 * are a plan and a charge. Netflix and Anytime Fitness no longer agree with
 * their ledger rows either, because Gate 80 took Figma's figures over the
 * ledger-sourced ones Gate 75 used as the best source then available.
 *
 * NP1: EVERY FIELD IS PLAIN SERIALISABLE DATA.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const COMMITMENTS: Commitment[] = [
  {
    id: 'commitment-mortgage',
    name: 'Mortgage',
    // §F calls this a grayscale ICON — a mortgage has no brand mark to ship.
    // Figma paints the badge `Color=Teal` and draws the MATERIAL `home` glyph.
    logo: { kind: 'icon', name: 'home', tint: 'teal' },
    amount: 1200,
    cadence: 'monthly',
    nextDueOn: '2026-10-01',
    category: 'bills',
    paymentAccountId: 'main',
  },
  {
    id: 'commitment-car-payment',
    name: 'Car Payment',
    // `Color=Gray`, the "grayscale icon" §F describes in as many words.
    logo: { kind: 'icon', name: 'icon_car', tint: 'gray' },
    amount: 500,
    cadence: 'monthly',
    nextDueOn: '2026-10-01',
    category: 'transport',
    paymentAccountId: 'main',
  },
  {
    id: 'commitment-internet',
    name: 'Internet',
    // THE ONLY ROW FIGMA DRAWS A DETAIL FOR (`1266:14343`), so the only one
    // carrying a provider, a plan name and a contract end date — all three
    // transcribed from that frame. It is also the only row with an offer.
    logo: { kind: 'brand', name: 'umobile' },
    amount: 120,
    cadence: 'monthly',
    nextDueOn: '2026-10-07',
    category: 'bills',
    provider: 'U-Mobile',
    planName: 'U120 Plan',
    contractEndsOn: '2026-12-15',
    paymentAccountId: 'main',
  },
  {
    id: 'commitment-netflix',
    name: 'Netflix',
    // RM 20.00 is FIGMA'S. Gate 75 seeded RM 54.90 from `txn-netflix-0905`,
    // which was the best source available with no Figma access; it is not now.
    logo: { kind: 'brand', name: 'netflix' },
    amount: 20,
    cadence: 'monthly',
    nextDueOn: '2026-10-02',
    category: 'bills',
    paymentAccountId: 'main',
  },
  {
    id: 'commitment-golf-lesson',
    name: 'Golf Lesson',
    // NEW AT GATE 80. `golf_course` is a CUSTOM Monarch asset that shipped in
    // the DS registry at v2.7.0 — it exists only because Figma draws this row.
    logo: { kind: 'icon', name: 'golf_course', tint: 'green' },
    amount: 20,
    cadence: 'monthly',
    nextDueOn: '2026-10-02',
    category: 'others',
    paymentAccountId: 'main',
  },
  {
    id: 'commitment-anytime-fitness',
    name: 'Anytime Fitness',
    // RM 160.00 is FIGMA'S, over the RM 128.00 Gate 75 took from the ledger.
    logo: { kind: 'brand', name: 'anytimefitness' },
    amount: 160,
    cadence: 'monthly',
    nextDueOn: '2026-10-05',
    category: 'others',
    paymentAccountId: 'main',
  },
  {
    id: 'commitment-phone-plan',
    name: 'Phone Plan',
    // NEW AT GATE 80. Its provider brand is CELCOM, which no handoff carried
    // and which has been in the DS `LogoName` registry throughout.
    logo: { kind: 'brand', name: 'celcom' },
    amount: 35,
    cadence: 'monthly',
    nextDueOn: '2026-10-05',
    category: 'bills',
    paymentAccountId: 'main',
  },
]
