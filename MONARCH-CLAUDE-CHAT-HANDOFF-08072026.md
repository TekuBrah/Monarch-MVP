# Monarch — Seed for the next Claude.ai review chat (2026-08-07)

Short context file for starting a **fresh Claude.ai thread** — the review and
prompting layer, not Claude Code. Enough to pick up Flow 7 without reading the
full technical handoffs first.

## Where things stand

**Flow 1 (Homepage) is built, merged and pushed.** Both screens, plus the shared
foundation the other eleven flows inherit: `src/data/` with the derivation layer,
the app-level accounts provider, per-route chrome config, the real nav
(Home · Transfer · Finance · More) and route table.

**Design system Step 5.4 (gap resolution) is complete, merged, tagged `v1.1.0`
and pushed.** Four work items:

| Item | Outcome |
|---|---|
| **A** — contrast | Card synced to Figma's `-500` across four filled variants, plus a tier fix. Measurement swept all twelve hues at 400/500/600/700/800. |
| **B** — trend indicator | New `TrendIndicator` component (up/down/flat), wired into `ListItem` via `trendDirection`. |
| **C** — charting | New `DonutChart` and `LineChart`. `LineChart` covers the trend chart and the sparkline; chrome toggles off for the latter. |
| **D** — housekeeping | Eleven false claims corrected across `CLAUDE.md` and `docs/component-tokens.md`. |

**The MVP is on `v1.1.0`** — dependency bumped, lockfile re-pinned, types confirmed
visible to `tsc` via a probe. Flow 1's crypto call sites now pass `trendDirection`,
derived from `changePct` through a new `trendOf()` in `src/data/derive.ts`.

## What's next

**Flow 7 — Finance Overview.** Two screens. Its hero is the Total Networth card,
which is what `LineChart` was built for. This is the first test of whether a
primitive designed from a flow inventory description actually satisfies the screen
it was designed for.

Read, in this order:

1. **`CLAUDE.md`** (MVP repo root) — the five rules and the known conditions.
2. **`MONARCH-MVP-PHASE5-ARCHITECTURE-08022026.md`** — folders, state layer,
   mock data.
3. **`MONARCH-MVP-PHASE5-FLOW-INVENTORY.md`** — Flow 7's section, plus the
   close-out registers. Long; read it fully.
4. **`MONARCH-MVP-HANDOFF-08052026.md`** — Flow 1's technical handoff, including
   §8 on what later flows inherit.
5. **`MONARCH-CHAT-HANDOFF-08072026.md`** (design system repo root) — the 5.4
   session, including the four work item E findings.

## Two things Flow 7 will hit, both registered, neither its fault

The Total Networth card renders on a coloured surface, which is where the
design system's on-color token family is weakest:

- **No on-color area-fill token exists (E-4).** `--mapped-surface-alpha-*`
  resolves fully transparent in both themes; the alias tier is unusable in a
  component; the `-100` ramp step that solves this for the twelve hues has no
  white equivalent. **Flow 7's card will render without its area fill**, which
  the design has.
- **Three on-color tokens still dark-flip (E-3).** `caption`, `label` and
  `placeholder` flip `neutral-100` → `neutral-950` on surfaces that by definition
  do not flip. **The card's axis labels will go near-black in dark mode.**

Both are token-layer, both parked to work item E. Flow 7 should not attempt to
work around either — it uses the correct tokens and the gaps show.

## Also carried into Flow 7

**Inventory A10 is a non-defect.** `Line 7` / `Line 8` were flagged as suspicious
at "x=343 width 343". The design context reads `left-0 … w-[343px]` — correct
full-width gridlines. A metadata-reading artifact. Do not inherit it as a problem.

**`LineChart` needs an explicit domain.** Figma's chart is month-to-date through
the 15th on a full-month axis — data ends at x=176, gridlines run to 343, and the
marker and callout cluster at the data's end. The component takes `domain`,
defaulting to `points.length`.

**`chromeTone`** is `'default' | 'onColor'`. Flow 7's card passes `'onColor'`.

## Work item E — four token findings, all parked

| # | Finding |
|---|---|
| E-1 | `--mapped-text-success-default` and `-error-default` fail 4.5:1 in three of four theme combinations; dark maps to the *darker* `-600` step on a black page. |
| E-2 | Figma reports Success as `#4ecd76`; the pipeline resolves `#38b860`. **`#4ecd76` is lighter**, so a straight re-export makes light contrast *worse*. E-1 and E-2 pull against each other and must be decided together. |
| E-3 | Three on-color tokens still dark-flip (above). |
| E-4 | No on-color area-fill token (above). |

Also recorded, not in E: the seven-hue budget palette has **every adjacent pair
below 3:1**, with `lime | yellow` at **1.07** — `IconObject`'s hues are an
icon-badge palette, not a categorical scale. `DonutChart` therefore ships **no
default palette**; callers supply colour per segment.

## Decided but not yet in Figma

Both are Teku's edits, recorded so the divergence is not later read as an
oversight:

- **`flat`** on `TrendIndicator` — approved as a designed addition; no Figma
  source exists.
- **`#0caaff`** — the system-message gradient's second stop has no backing token;
  `--brand-teal-500` stays and Figma gets updated to match.

## Decided this session

- **Signed percentage labels stay** (`-2.49%`), diverging from Figma's unsigned.
  Reason: accessibility — with an unsigned label, colour is the only thing
  distinguishing a decline at 12px. The design system already strips the sign when
  composing the announcement, so there is no doubling.
- **The design system's `package.json` still reads `version: 1.0.0`** though the
  tag is `v1.1.0`. Cosmetic; npm resolves by tag. Fix at the start of the next
  design system session.
- **Device preview frame**: use browser DevTools device mode during Flows 7–12.
  The polished version is roadmap **Phase 6.2** and belongs in the design system
  showcase, not the MVP.

## Division of labour — unchanged

- **Claude Code builds.** One flow at a time, **one STOP per flow** in the MVP.
  The design system's three-gate discipline does *not* apply here — MVP screens
  are compositions of already-verified parts. Getting this backwards is the stated
  risk.
- **This chat reviews and writes the prompts.**
- **Teku does all git writes except branch creation.** Claude Code creates the
  flow branch and nothing else — no staging, no committing, no pushing, no
  tagging.

## Standing patterns worth carrying

- **Ground truth is disk and git, never session memory.**
- **Derive, never transcribe.** Every total, percentage and delta is a function of
  a source value. Flow 1's derived crypto total exposed a real RM 5,117.70
  shortfall, which was the intended outcome.
- **Verification is `getComputedStyle` in both themes**, never screenshots. Finish
  animations with the `try/catch` before reading any transitioned property. Read
  token values from a freshly-inserted probe.
- **The canary census** — count every painted element before and after a change
  and report the full delta. It converts "nothing else shifted" from a claim into
  a measurement, and it caught a real anomaly in 5.4.
- **A green test suite does not prove a consumable package.** `npm run build` is
  the gate that does — it caught a missing barrel export that vitest passed over.
- **`npm install` can silently no-op on a git dependency tag change.** It reported
  "up to date" while the lockfile still pinned the old commit. Verify what was
  actually resolved.
- **Documentation asserting something is fine is exactly why nobody re-checks it.**
  Eleven false claims were corrected in 5.4, nine of them unprompted.
