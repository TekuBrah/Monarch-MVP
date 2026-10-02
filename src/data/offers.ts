import type { CommitmentOffer } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FLOW 11 — THE SEEDED COMMITMENT OFFERS (Gate 80). Read-only; nothing writes
 * these.
 *
 * ONE OFFER, AGAINST ONE COMMITMENT, BECAUSE FIGMA DRAWS ONE. The promotion
 * banner appears under the Internet row on the Plans tab (`1266:14339`) and on
 * the Internet commitment detail (`1266:14343`); the smart insight panel
 * (`1266:14341`) is that offer opened. No other commitment carries one, which
 * is what makes the "a commitment without an offer draws no banner" branch
 * reachable from the seed rather than only from a synthetic fixture.
 *
 * ───────────────────────────── THE FIGURES ──────────────────────────────────
 *
 * TEKU'S RULING, 30 SEPT 2026: the current plan is RM 120/month and the offer
 * RM 70/month. EVERYTHING ELSE DERIVES — RM 50/month and RM 600/year — and
 * nothing here stores a saving.
 *
 * `1266:14341` AND `1266:14343` BOTH ALREADY PRINT EXACTLY THAT, measured at
 * Gate 80: "Current / U-Mobile / RM 120.00", "Suggested / Maxis / RM 70.00",
 * "Save RM 50/month on your Internet bill", "Savings / RM 600/year", and the
 * banner's "RM 50/month Potential Savings.". Earlier handoffs recorded the
 * frames as still printing RM 69 and RM 51; they no longer do.
 *
 * ⚠ ONE STALE FIGURE SURVIVES IN THE FIGMA FILE AND MUST NOT BE RECONCILED
 * BACK. `1266:14342` (education) draws its own underlying copy of the insight
 * panel, and THAT copy still reads "Save RM 51/month" — while still showing
 * "RM 600/year" beside it. 51 × 12 is 612, so the layer contradicts itself; it
 * is an error, not a second opinion. Teku's ruling, 30 Sept.
 *
 * THE CURRENT PRICE IS NOT STORED HERE. It is the commitment's own `amount`,
 * so the two can never disagree — see `CommitmentOffer` in `types.ts`.
 *
 * ──────────────────────────── THE ARTWORK ───────────────────────────────────
 *
 * ⚠ `offer_maxis_5g_home_wifi.webp` IS A CORRECTED DERIVATIVE, NOT THE RASTER
 * FIGMA HOLDS, AND THAT IS THE WHOLE POINT OF IT. Figma's image fill on
 * `883:7868` is genuine marketing material advertising RM99 → RM69, and the
 * first build of Gate 80 shipped it — printing "Now Only RM99 69" directly
 * above a panel reading "Current RM 120.00 / Suggested RM 70.00". Teku caught
 * it and supplied a corrected file; the shipped raster now reads "5G Home WiFi
 * 120 Bundle", "Rebate RM50 x 24 months", "Now Only RM120 70/month" and "Offer
 * Period: 1 - 31 October 2026", so the picture and the derived copy finally
 * agree. If it is ever revised again, the numbers in it come to the ruling —
 * never the other way round.
 *
 * 900×371, 39,838 bytes, WebP q85 through a headless Chromium canvas (the Gate
 * 75 method for the goal images, no new dependency). The slot is 311×128 CSS,
 * i.e. 622×256 at DPR 2 and 933×384 at DPR 3, so 900 wide is right and nothing
 * was upscaled. At 2.4259 the file is very nearly the slot's own 2.4297 ratio,
 * so `object-fit: cover` crops 0.2% where the original 900×506 cropped 26.8%.
 * Full provenance, including both sources and the measured encodings, is in
 * `public/media/promotions/README.md`.
 *
 * NP1: EVERY FIELD IS PLAIN SERIALISABLE DATA.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const COMMITMENT_OFFERS: CommitmentOffer[] = [
  {
    id: 'offer-maxis-internet',
    commitmentId: 'commitment-internet',
    provider: 'Maxis',
    amount: 70,
    image: 'offer_maxis_5g_home_wifi.webp',
  },
]
