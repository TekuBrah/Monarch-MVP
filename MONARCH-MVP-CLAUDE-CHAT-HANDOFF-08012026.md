# Monarch MVP — Seed for the next Claude.ai review chat (2026-08-01)

Short context file for starting a **fresh Claude.ai thread** (the review/prompting
layer — not Claude Code). Enough to pick up Phase 5 without reading the full
technical handoff first.

## Where things stand

**Phase 4 (MVP Scaffold + Linkage Proof) is complete — steps 4.1 through 4.7.**
The `Monarch-MVP` repo now exists, on `main`, with a working app shell: theme
provider, router, mobile frame, and the design system's `BottomNavigation`.
`npm run build` and `npm run lint:tokens` both pass.

**The result that matters: the pipe works.** Editing a token in the design
system's source propagates into the *running* MVP with no rebuild, no reinstall,
no restart — and so does a change to a DS component's TSX. Both were proven live,
not inferred. That was the roadmap's *"STOP. If this fails, nothing after it
matters"* gate, and it is cleared.

One characterisation worth carrying: **Phase 4 was mostly about proving things
that a green build cannot prove.** Three separate times, something compiled
cleanly while being wrong or unproven — the token CSS subpath that resolved to a
nonexistent file, the dependency-branch build that passed only because nothing
imported the specifier yet, and a guardrail that passed because its source was
clean rather than because its regexes worked. Each was caught by testing the
negative case explicitly. Expect to keep doing that.

## Read these, in this order

1. **`MONARCH-MVP-HANDOFF-08012026.md`** (this repo root) — the full technical
   handoff. Verified-fresh state, what each Phase 4 step did, the load-bearing
   4.4/4.5 results and the sentinel method behind them, the known conditions of
   the linkage, and open items. Read before prompting any build work.
2. **`CLAUDE.md`** (this repo root) — the five MVP rules and the known conditions,
   in the form Claude Code actually loads.
3. **`MONARCH-BUILD-ROADMAP.md` → "Phase 5 — MVP Flows"** — in the
   **design-system** repo, not this one. Also re-read locked decisions **D1–D8**;
   those are settled and shouldn't be relitigated without a stated reason.

## What's next

**Phase 5, starting at step 5.1 — flow inventory from Figma.** One branch per
flow.

**The gate discipline deliberately changes here.** The design system uses three
gates per component because those are primitives. MVP screens are compositions of
already-verified parts, so the leash loosens for screens. The roadmap says
plainly that getting this backwards — tight on the MVP, loose on the DS — is the
real risk.

**Rule 3 is the one to hold the line on:** if a screen needs a primitive Monarch
doesn't have, Claude Code stops and reports. It does not build the primitive in
the MVP. It either gets added to the design system properly, or the design gets
adjusted. That converts "the MVP diverged" into "the DS grew a component," which
is both the correct outcome and the better case-study story.

## Division of labour — unchanged

- **Claude Code builds** — one step at a time, reporting between steps.
- **This chat reviews and writes the prompts** — reads the reports, decides
  scope, catches drift, issues the next instruction.
- **Teku pushes, manually, via Sourcetree.** Claude Code never pushes, never
  opens PRs, never touches remotes. This is rule 5 in the MVP `CLAUDE.md`.

## Things worth knowing up front

- **The design-system folder is literally named `Design system test`** on this
  machine, not `Monarch-Design-System` — that's only the GitHub remote name. The
  Vite alias hardcodes the real name. The roadmap's linkage snippet has the wrong
  path; following it verbatim would have silently broken the whole gate.
- **Two decisions are recorded as deliberate, so they don't get re-argued:** the
  `react-router-dom` RSC advisories are not applicable (client-only SPA, no RSC),
  and the shell has no desktop max-width because ~430px has no backing token.
- **Two design-system findings are parked** in the technical handoff under
  "DS-side, for a future DS session": `ElementWrapper` uses an inline style
  object the DS's own rules ban, and the DS's `CLAUDE.md` still points at
  `src/main.tsx`, which moved to `showcase/` in Phase 2.
- **All Phase 4 work is committed** — `50b70de` "Phase 4 close out" is HEAD, tree
  clean. Teku commits via Sourcetree; Claude Code never pushes.
