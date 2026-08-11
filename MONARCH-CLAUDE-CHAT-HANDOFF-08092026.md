# Monarch — Seed for the next Claude.ai review chat (2026-08-09)

Short context file for starting a **fresh Claude.ai thread** — the review and
prompting layer, not Claude Code.

**Thread pairing.** This thread is the review side of the Claude Code session
named *"8/9/26 DS gap — Resolving detached & modified components in screens"*.
Name this Claude.ai thread to match. Both sides migrate together when Flow 8
starts.

---

## Where things stand

**Flow 7 (Finance Overview) is built, verified, merged to `main`, and pushed**
(`183b412`). Phase 5 is 7 flows of 12 complete.

**We are not building a flow right now.** We are between flows, closing a batch
of design-system gaps so Flows 8–12 build without interruption.

### Why the detour exists

Flow 7 needed **two** DS bumps, not one. Part A found `CardBalance` missing
`onClick` → shipped as v1.2.0 → then the build found `CardBalance` *also*
hard-codes `<IconObject color="slate" size="l">` with no override. The miss was
structural: Part A asked "does a component exist for this?" and stopped once the
answer was yes.

Five flows remained. At one gap discovered per build that is up to five more
bump cycles. So a **capability sweep** ran first, organised **by component, not
by screen**.

### The sweep — complete

Three sessions, all read-only:

| Stage | Work |
|---|---|
| A | 9 of 28 screens read; component-keyed demand map built |
| A.2 | remaining 19 screens read; two `📄` rows left open |
| B | those closed, then all 40 DS components read in **source** (`.tsx` *and* `.css`, not `dist/`, not `.d.ts`) |

Output: **`MONARCH-MVP-DS-GAP-REGISTER.md`**, committed at the MVP repo root.
**28 of 28 screens read. 40 components read.** 10 register entries — 2
`component-gap`, 7 `prop-gap`, 1 `token-gap` — plus 6 `figma-defect` families,
8 `shape-mismatch` design calls, 10 carried-forward items, 6 open.

**It paid for itself immediately:** the same `<IconObject color="slate"
size="l">` defect was found a *second* time at `SummaryItem.tsx:22`, landing on
Flow 10. That copy would otherwise have been discovered mid-build, exactly as
the first one was.

---

## What's next — 6 steps to Flow 8

1. **Finish the `Sheet` build** — Gates 2 and 3, in the paired Claude Code
   session. *(in progress)*
2. **Commit `Sheet`** — Teku, Sourcetree.
3. **DS session 2** — everything else in the register.
4. **Commit and tag `v1.3.0`** — Teku.
5. **Bump the MVP to v1.3.0** — targeted install + four probes.
6. **Flow 8 Part A** — much lighter than usual; the sweep already mapped it.

### Step 3 needs deliberate sequencing

It is the largest remaining chunk and the likeliest place for scope creep —
~20 items, several touching shared token files. **Do not hand Claude Code the
whole register at once.** Contents:

- **Two verification reads first** — G6 (`DatePicker` may not need a `title`
  prop at all; `Field` already has `label`, and Figma's "Date range picker" is
  a titled date *field*, not a calendar) and S8 (`SelectTransfer` used as a
  category picker on F10 and a funding-source picker on F11 — neither is an
  amount; plain `Select` likely fits). Either could shrink the session.
- **Prop additions** — G3/G4 (`iconColor` + `size` on `CardBalance` *and*
  `SummaryItem`), G7 (`IconObject` gains `xs` = 16px, backed by the existing
  `--brand-scale-400`), G8 (`Modal`'s header made optional), G9/G10 (latent,
  cheap).
- **U1** — one `getComputedStyle` read per theme on `Tab`'s selected underline.
  Statically airtight but never measured live.
- **The ten carried-forward items** — mostly token work (E-3, E-4, gradient
  dark-flip, the `-400` ramp question, `ElementWrapper`'s inline style, two
  stale-doc fixes).

---

## Session 1 — `Sheet` — state at migration

**Branch `feat/sheet-v1.3.0` off `main`.** Gate 1 complete and ruled on; Gate 2
next. Building from Figma main component **`159:1856`** in the **design-system
file `xhA5ARVgSeD3gA41lYDqST`**.

⚠️ **Two Figma files.** DS = `xhA5ARVgSeD3gA41lYDqST`. MVP flows =
`v9MI8jxTaXiJA234Hkanlf`. Node IDs are not interchangeable — a DS ID looked up
in the flows file returns "not in this file," which already happened once
during the sweep.

**Decided: a separate `Sheet` primitive, not a `Modal` variant.** Two distinct
shapes are well-represented — bottom-anchored full-width (F8 ×1, F9 ×3) and
centred inset (F9 ×2, F10 ×1, F11 ×2). A `position` prop on `Modal` would
invalidate its header props half the time.

**The four sheets in Flows 8/9 are detached copies — resized to fit content,
not extended in capability.** `159:1856` is the specification; they are evidence
of demand only.

### Gate 1 rulings, all approved

| # | Ruling |
|---|---|
| **D1** | Header built as `Sheet`'s internal markup, matching `Modal`'s precedent. Left-aligned. `headerIconLeft?: ReactNode` (a slot, not Figma's boolean). **Header optional** — omitting renders no region at all. This is the fix for `Modal`'s G8 class of defect and G2 depends on it. |
| **D2** | Home indicator as local markup + `showHomeIndicator` (default `true`). `HomeIndicator` extraction logged for later; `BottomNavigation` not refactored. |
| **D3** | **Token gap, resolved with approval.** Top inset = `--brand-scale-1100` (48px). `StatusBar` is 44px, off-ramp; 48 is the nearest step above. Same call as `BottomNavigation` 62→64 and `StatusBar` 5→4. The 44px measurement and 4px overshoot are recorded in the CSS comment. |
| **D4** | `max-height: calc(100dvh - var(--brand-scale-1100))` approved. Not the banned `calc()` pattern — that ban is on curve-fitting *between* unrelated steps. `dvh` over `vh` (mobile chrome collapses). First viewport unit and first `max-height` in the codebase. |
| **D5** | Root fill normalised `Neutral01` → `--mapped-surface-elevation-default`, matching `Modal`. Seventh member of the register's §4a foreign-variable family. |
| **D6** | `Content` (`158:193`) is the sole scroll region — **amended**, see below. |

### D6's two amendments

**(a) The actions region is optional, exactly like the header.** Teku's
reference screens show header + content + home indicator with **no actions row**,
and a form field inside the scrolling content rather than pinned.

| Region | Presence |
|---|---|
| Header | optional |
| Content | **always present, always the sole scroll region** |
| Actions | optional |
| Home indicator | optional (default on) |

Must render correctly in any combination — no empty regions, no residual
padding where a region is absent.

**(b) Bottom padding inside the scroll region.** The intended affordance is
content **sliced mid-element** at the cap. That works only when the cap lands
mid-element; if it lands cleanly between rows the sheet looks finished when it
is not. Padding makes it reliable rather than lucky. Must use an existing
`--brand-scale` token — STOP if none fits.

### Height behaviour, confirmed against three reference renders

**Hug-height, growing with content, capped.** Short content = short sheet
partway up the screen. It does **not** open at the cap.

**No fade, no gradient, no scroll hint beyond the padding** — the gradient tier
has no dark-flipping token (carried-forward item 4) and a decoration is not
worth a token gap.

### Logged, not built

**A scroll-position shadow under the header.** Real UX value on a tall sheet,
but Figma authors no such state and inferred interaction states are never added
silently. Design question for Teku.

### At Gate 2, watch for

- An omitted region leaving **residual padding** or a collapsed gap
- The scroll region still reachable by **keyboard and wheel after the bar is
  hidden** — measured, not assumed. `.mvp-home__carousel` is the standing case
  of hiding an indicator and removing an affordance
- **G2 not built.** Feasibility assessment only; verdict at Gate 3

---

## `shape-mismatch` items — resolved by Teku, 6 of 8 closed

| Item | Outcome |
|---|---|
| S1 — `Field` as a filter chip | **Closed.** It should be `Chip`, which already ships. Figma naming error, not a gap |
| S2 — `Blanket` 812 over 966 | **Closed.** The 966 height is presentation framing; real screens follow device height. No action |
| S3 — country-code `Field` detach | **Closed as `figma-defect`.** Code-side `leadingIcon` already takes a `ReactNode` — the *Figma* component can't do what the code can. No DS work |
| S4 — `list/chart legend` reuse | **Closed.** Deliberate reuse because it fits |
| S5 — `card/data display` wide row | **Closed.** MVP composition per Flow 7's D11 precedent. **G5 drops from the DS session** |
| S6 — `IconObject` 16px | **→ DS session.** Add `xs`; 16px is `--brand-scale-400`, already exists |
| S7 — `Tabs` at `x=-69` | **Closed.** An authored *scrolled state* — the user has dragged the row to reveal Receipts. v1.2.0's `isScrollable` covers it. Default on Finance: Overview selected, scroll at 0, Receipts overflowing right |
| S8 — `SelectTransfer` misuse | **Open** — verification read at the start of DS session 2 |

---

## Division of labour — unchanged

- **Claude Code builds.** DS work gets the **three-gate discipline**; MVP flows
  get **one STOP per flow**. Getting this backwards is the stated risk.
- **This chat reviews and writes the prompts.**
- **Teku does all git writes except branch creation.** No staging, no
  committing, no pushing, no tagging by Claude Code.
- **DS and MVP are separate sessions in separate repos.** Nothing is written to
  the DS from the MVP repo, or the reverse.

## Standing patterns — still load-bearing

- **Ground truth is disk, git, and Figma — never session memory.**
- **Derive, never transcribe.** Every total is a function of a source value.
- **Read Figma from main components, not Section placements.** Establish what a
  node is from **what it renders**, never from what it is called. *(This is what
  turned "Date range picker" from a calendar into a titled date field, and
  collapsed the sweep's largest apparent `component-gap` into one prop.)*
- **When a component is flagged for any missing prop, read its full prop
  surface in the same pass.** The rule the badge gap produced.
- **Verification is `getComputedStyle` in both themes**, never screenshots.
  Finish animations with the `try/catch` guard first. Read token values from a
  freshly-inserted probe.
- **No visible scrollbars anywhere, ever** — hide the bar, never the scrolling;
  keyboard access must survive.
- **Token-source gap protocol:** explicit approval before any non-`var()`
  solution. `calc()` curve-fits between unrelated tokens are banned.
- **A green Vitest suite does not prove a consumable package** — `build:lib`
  is the gate that does.
- **`npm install` can silently no-op on a git dependency tag change.** Verify
  the resolved commit hash, not the exit code.
- **Local Figma MCP only** (`http://127.0.0.1:3845/mcp`); prove reachability
  with an authenticated `whoami` round-trip.

## Two small standing items, still unfixed

- **`CLAUDE.md` has no instruction to read the newest handoff.** Seven
  handoff-shaped files now sit at the MVP repo root with `MMDDYYYY` names that
  give no ordering hint. One line fixes it.
- **The scrollbar rule is not in `CLAUDE.md`** either. Both should go in
  together.
