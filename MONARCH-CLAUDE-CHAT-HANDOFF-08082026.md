# Monarch — Seed for the next Claude.ai review chat (2026-08-08)

Short context file for starting a **fresh Claude.ai thread** — the review and
prompting layer, not Claude Code. Enough to pick up Flow 7's build without
re-deriving anything.

## Where things stand

**Flow 7 (Finance Overview) Part A is complete. Nothing has been built.** The
branch `phase/5-flow07-finance-overview` exists off `main` with **zero commits
and a clean working tree** — a pure fork point. Part A read both screens from
Figma, mapped every component to the DS, measured the `Tabs` overflow behaviour
and the `--brand-*-400` contrast live in both themes, re-pulled Flow 5's and
Flow 1's crypto token lists, and closed the crypto-wallet arithmetic that was
blocking the build. Two capability gaps were found and assigned to the design
system rather than worked around: `Tabs` cannot scroll horizontally, and
`CardBalance` has no `onClick`. Every decision Part A raised is now closed;
the Part B prompt (B1–B10) is fully specified and ready to execute.

## What's next

1. **Bump the DS dependency to `v1.2.0`** — this repo is still on `v1.1.0`
   (`package.json` and the lockfile both confirm it). `v1.2.0` is the DS session
   carrying the `Tabs` scroll affordance, `CardBalance onClick`, and the
   scrollbar-hiding rule. **Part B is blocked until it lands.**
2. **Verify the bump with a probe, not npm's exit code.** `npm install` reports
   "up to date" and installs nothing when only a git tag changes — this already
   happened once at v1.1.0. Check the **resolved commit hash in
   `package-lock.json`** changed away from `e4df2df2…`, that the new props are
   present in `dist/`, and that `tsc` sees them. Also put the local
   `../Design system test` checkout on v1.2.0, or Vite and `tsc` disagree
   silently.
3. **Then execute Part B.**

## Read first, in full

**`MONARCH-MVP-HANDOFF-08082026.md`** (this repo's root). It is the technical
handoff and it carries everything: the component mapping, the arithmetic and its
resolution, the contrast table with its qualification, the four follow-up
checks, all thirteen closed decisions, and the bump procedure. Do not start
prompting from this file alone.

Behind it, unchanged and still valid: `MONARCH-MVP-HANDOFF-08072026.md` (DS
v1.1.0 catch-up, and §10 on what Flow 7 inherits),
`MONARCH-MVP-HANDOFF-08052026.md` (Flow 1's foundation, §8 in particular),
`MONARCH-MVP-PHASE5-FLOW-INVENTORY.md`, `CLAUDE.md`.

## Division of labour — unchanged

- **Claude Code builds.** One flow at a time, **one STOP per flow** in the MVP.
  The design system's three-gate discipline does *not* apply here — MVP screens
  are compositions of already-verified parts. Getting this backwards is the
  stated risk.
- **This chat reviews and writes the prompts.**
- **Teku does all git writes except branch creation.** Claude Code creates the
  flow branch and nothing else — no staging, no committing, no pushing, no
  tagging.
- **Anything landing in the design system is a separate session in the DS repo.**
  Never written from the MVP repo.

## ⛔ Do NOT re-litigate these — closed 2026-08-08

A fresh reviewer will be tempted to reopen several of these because they look
like judgment calls. They were, and they were decided.

| Item | Decision |
|---|---|
| Marge's Wallet shortfall | **Add Solana as a sixth holding, RM 15,353.10**, derived from the file's own RM 4,465/SOL price (3.438 SOL). Restating Tether was rejected — it makes one holding a plug reverse-engineered from the total. Confirmed by Figma: **no sixth holding is drawn anywhere in the file.** |
| Fun Wallet | **Stellar and Uniswap both RM 2,500.00.** Keeping either at RM 5,117.70 forces the other to −117.70, which is impossible. |
| Wallet naming | **`Marge's Wallet` / `Fun Wallet`** — Flow 7's spelling. Closes F5 A6. |
| Net worth | **RM 464,958.84**, derived as `sum(holdings)`. Figma's RM 450,958.84 is not reproduced. |
| Ninth card | **Bank Account / Joint Account, RM 15,000.00**, from Flow 4's picker. A design decision, not a transcription. |
| `Tabs` overflow | **The DS gains the scroll affordance.** Not an MVP wrapper — a wrapper cannot scroll the selected tab into view on arrow-key navigation, and fails silently with a green build. Three Sections need it. |
| `CardBalance` tappability | **The DS gains `onClick`.** Flow 1 set no precedent, and the four sibling cards all have one. |
| Scrollbars | **Never visible, anywhere, ever.** Hide the bar, never the scrolling; keyboard access must survive. Applies to `.mvp-home__carousel` too — folded into Flow 7's diff. |
| Gradients | **Nearest `--brand-*` steps with recorded divergence**, per the `#0caaff` precedent. The `--gradient-*` tier was checked: it holds two white scrim tokens and covers neither card. |
| Drill-down detail rows | **The template carries BOTH idioms** — `CardDataDisplay` tiles *and* label/value rows — because that is what the screen draws. |
| Reminder / statement pickers | **Presets, no calendar.** The DS ships no `DateRangePicker` and no calendar grid, and none is built. |
| Card grid | **A wrapping flex row, not a CSS grid** — matching Figma. |
| `--brand-*-400` contrast | **Measured and qualified.** All four Flow 7 hues PASS on dark and fail on light against the page surface; the white glyph is low-contrast in 10/12 hues in both themes. **These are legibility observations, not AA failures** — every card writes its category in text, so colour is redundant with the label. Do not escalate this as a blocker. |

Also settled and easy to re-raise by accident: **inventory A10 is a non-defect**
(the gridlines read `left-0 … w-[343px]` — a metadata artifact, confirmed by
direct read); **E-3 and E-4 will visibly affect Flow 7** — no area fill on the
net-worth card, near-black axis labels in dark mode — and **neither is Flow 7's
to fix**. Use the right tokens and let the gaps show.

## Two loose ends worth a minute of Teku's time

- **The Litecoin ticker now reads `LTC` in Figma.** Flow 1's handoff recorded it
  as `SOL`. Either it was fixed at source or the earlier read hit a different
  node. Open item 5's first half may be closable.
- **`CLAUDE.md` still has no instruction to read the newest handoff.** Grepped
  fresh: zero matches for `handoff` / `newest` / `latest`. There are now six
  handoff-shaped files at the repo root with `MMDDYYYY` names that give no
  ordering hint, and a fresh session reads `CLAUDE.md` before any prompt. One
  line fixes it. The scrollbar rule should go in at the same time.

## Standing patterns — unchanged, still load-bearing

- **Ground truth is disk and git, never session memory.**
- **Derive, never transcribe.** Every total, percentage and delta is a function
  of a source value. This is what exposed the crypto arithmetic in the first
  place.
- **Read Figma from the main components, not the Section placements** — file-wide,
  56 of 56 screens. And establish what a node is from **what it renders**, never
  from what it is called.
- **Verification is `getComputedStyle` in both themes**, never screenshots.
  Finish animations with the `try/catch` guard before reading any transitioned
  property. Read token values from a freshly-inserted probe.
- **`npm install` can silently no-op on a git dependency tag change.** Verify
  what was actually resolved.
- **A green build proves nothing about DS source transforms** — `?react` imports
  degrade to asset URL strings silently. Verify at render.
- **Local Figma MCP only** (`http://127.0.0.1:3845/mcp`); the remote server
  returns viewer-access errors on this file. Prove reachability with an
  authenticated `whoami` round-trip, never an open-port check.
