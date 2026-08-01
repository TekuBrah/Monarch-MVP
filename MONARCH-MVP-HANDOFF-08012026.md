# Monarch MVP — Chat Handoff (2026-08-01)

Every claim below is grounded in commands run fresh at the end of this session —
`git status`, `git log --oneline -5`, `git remote -v`, `npm run build`,
`npm run lint:tokens`, plus live browser readings taken during the steps
themselves. Nothing is carried forward from session memory.

**This session created this repository and completed Phase 4 (MVP Scaffold +
Linkage Proof), steps 4.1 through 4.7.**

This is the **MVP** repo. The design system is a separate repo with its own
remote, its own Vercel project, and its own handoff files. Per decision D3 the
dependency runs one direction only: MVP imports DS, never the reverse.

## Who / goal / rules — pointer only

Standing rules for this repo live in **`CLAUDE.md`** at this root: the five MVP
rules, the known conditions of the linkage, verification discipline, and open
items. Read that file directly — it is the source of truth, not this handoff.

Phase/step structure and locked decisions D1–D8 live in
**`MONARCH-BUILD-ROADMAP.md`**, at the root of the **design-system** repo.

## CURRENT STATE — verified fresh this session

| Check | Result |
|---|---|
| Repo | `Monarch-MVP` · `https://github.com/TekuBrah/Monarch-MVP.git` |
| Branch | `main` |
| HEAD | `50b70de` — "Phase 4 close out" |
| Earlier commits | `18e2230` "First commit" · `bd94e4d` "Phase 4.1: scaffold Monarch-MVP (Vite + React + TS, mobile-first)" |
| Working tree | **clean** — all Phase 4 work committed |
| `npm run build` | ✅ clean, exit 0, built in 2.73s |
| `npm run lint:tokens` | ✅ **PASS** — 10 files scanned, 0 violations |
| Dev server | port **5174** (`strictPort`), pinned off the DS's 5173 |

### Commit history

| Commit | Contents |
|---|---|
| `bd94e4d` | Step 4.1 — the scaffold |
| `18e2230` | Steps 4.2–4.5 — linkage, tokens + Button, `CLAUDE.md` |
| `50b70de` | Steps 4.6–4.7 + closeout — guardrail, app shell, this handoff pair |

Working tree clean at `50b70de`. Teku commits via Sourcetree; Claude Code never
pushes.

### Design-system repo state, as observed from here

`D:\Claude\Design system test` — HEAD `c5e0279` "Handoff update", working tree
**clean**, tag `v1.0.0` present. That commit added only the two DS handoff files.
**The MVP's pinned dependency is unaffected**: `#v1.0.0` resolves to `6248fb0`,
which `c5e0279` does not touch.

## THE LOAD-BEARING RESULTS — 4.4 and 4.5 Part A

These two are the reason Phase 4 exists. Both **PASS**, both proven live.

| Mechanism | Step | Result |
|---|---|---|
| CSS token → running app | 4.4 | ✅ **PASS** |
| React Fast Refresh across the alias | 4.5 Part A | ✅ **PASS** |

**4.4** — `--brand-scale-200` changed `8px → 40px` in DS source
(`src/styles/globals.css:169`, confirmed as Button's actual radius token by
reading `Button.css:8`, not assumed). The Button's computed `border-radius`
followed to `40px` on the live page.

**4.5 Part A** — `data-fastrefresh-probe="1"` added to the `<button>` in the DS's
`Button.tsx`. It appeared in the live DOM.

Neither needed a reload, rebuild, reinstall, or server restart.

### The sentinel method — why these claims are auditable

A page reload would *also* show the new value, and would prove nothing beyond
what 4.2 already established. So both tests stamped a value on `window` before
the edit:

```js
window.__HMR_SENTINEL__ = 'sentinel-' + Date.now()
```

A reload destroys it. Every post-change read returned the **same sentinel
string**, with `performance.getEntriesByType('navigation').length` pinned at
**1** throughout. "It updated" therefore cannot be confused with "the page
reloaded."

Both DS edits were reverted and confirmed **byte-identical by SHA256**
before/after, with `git diff --stat` empty afterwards.

**Reuse this method.** Any future propagation claim without it is unfalsifiable.

## Phase 4 — what each step actually did

- **4.1 — Scaffold.** Vite + React + TS, mobile-first viewport
  (`viewport-fit=cover`, pinch-zoom deliberately preserved). Hand-rolled rather
  than `npm create vite`, so the toolchain could be pinned to match the DS
  exactly (`react ^19.1.0`, `vite ^6.3.5`, `@vitejs/plugin-react ^4.5.2`,
  `typescript ~5.8.3`) — 4.2 aliases DS *source*, so this app's Vite compiles it,
  and matching versions is what makes `resolve.dedupe` meaningful.
- **4.2 — Dual-mode linkage.** Conditional source alias + `resolve.dedupe` +
  pinned git dependency `github:TekuBrah/Monarch-Design-System#v1.0.0`. Both
  branches were proven with a throwaway resolver probe, not just a green build.
- **4.3 — Tokens + one component.** 511 custom properties land on `:root` across
  all seven layers. One Button renders, token-matched in both themes, with real
  TypeScript prop types.
- **4.4 — Live propagation.** The gate. See above.
- **4.5 — `CLAUDE.md` guardrails** (+ the Fast Refresh test folded in as Part A).
- **4.6 — Grep guardrail.** `npm run lint:tokens`.
- **4.7 — App shell.** Theme provider, router, mobile frame, `BottomNavigation`.
  Closed the base-layer and font gaps 4.3 found.

### 4.2 — the two things that were not obvious

- **The DS folder is literally named `Design system test`**, not
  `Monarch-Design-System`. That name exists only as the GitHub remote. The
  roadmap's linkage snippet hardcodes the wrong path; following it verbatim
  makes `DS_LOCAL` silently `false`, which resolves the pinned dependency instead
  of source — and **4.4 would have failed with no error to explain why**.
- **`@monarch/design-system/styles.css` does not resolve in source mode.** The
  `exports` map only describes dist. Vite matches string aliases by prefix, so
  the suffix appended to the aliased source directory produced a nonexistent
  path. Fixed with a second, more-specific alias ordered *before* the bare one.

### 4.3 — the near-miss worth knowing

Dark mode looked like a token mismatch: white background, blue text, against
`--mapped-surface-primary-default`. Reading `Button.css` first showed
`[data-theme="dark"] .mn-btn--primary` **deliberately** re-maps to the on-color
treatment (Figma's "Inverse" appearance = dark mode). The button was correct; the
expectation was wrong. **Check the component's CSS before filing a mismatch.**

## Known conditions of this setup

Full detail is in `CLAUDE.md`. Summarised, each has a silent failure mode:

- **`tsc` and Vite resolve the specifier differently.** Vite → DS **source**;
  TypeScript → the pinned **v1.0.0 dist types** (proven with
  `tsc --traceResolution`; there is no `paths` mapping). They agree until DS
  source changes a **type**, at which point the MVP compiles against stale types
  while rendering new source. Harmless for CSS/token changes.
- **Local-alias mode requires the DS's `node_modules` to be installed.** The DS's
  101 icons resolve `@material-design-icons/svg` by walking up from the DS source
  file's own location — into the DS's `node_modules`, not this repo's.
- **The `styles.css` alias hardcodes `src/styles/package.css`.** If the DS moves
  that file, the alias goes stale **silently** — no build error, just missing
  tokens.
- **New DS Vite transforms must be mirrored here.** Source mode compiles raw DS
  source, so this app's Vite needs any transform the DS's own build applies.
  `vite-plugin-svgr` is required today. Symptom of a missing one: React's
  "Element type is invalid" at render, **with a green build**.
- **The package ships no base layer and no font** — now supplied by the MVP's
  `src/index.css` and `src/main.tsx`. The DS still ships neither; this is
  permanently an MVP responsibility.

## The "Invalid hook call" episode — NOT a dedupe failure

**You will see this again if you edit the root render while HMR is live. It is
not the architecture failing.**

During 4.7, the console showed React's *"Invalid hook call… you might have more
than one copy of React"* — the exact failure `resolve.dedupe` exists to prevent,
and the single most alarming error this setup could produce.

It was **not** a duplicate React. Evidence:

- Querying loaded resources for React served out of the **DS's** `node_modules`
  returned `[]`, despite `react@19.2.7` existing there on disk. Only one deduped
  chunk (`.vite/deps/react.js`) was ever fetched.
- `npm ls react react-dom` shows a single `react@19.2.8`, with the DS package and
  `react-router` both deduped onto it.
- **Chronology settled it.** The errors appear exactly once in the console
  buffer, immediately after `[vite] hot updated: /src/App.tsx` — the root render
  had just been structurally rewritten while the old tree was live, which Fast
  Refresh cannot reconcile. Every page load afterwards is clean.
- Hooks demonstrably work: the theme toggle (`useState` + `useEffect` +
  `useContext`) flips `data-theme` and the page background live.

**Diagnostic recipe if it recurs:** check for React URLs served from the DS
folder, check `npm ls react`, and check *where in the console buffer* the error
sits relative to `[vite] hot updated`. A full reload clears a transient one.

## The guardrail — scope and blind spots

`npm run lint:tokens` → `scripts/check-tokens.mjs`. Plain Node, no dependencies,
Windows-native. Exits non-zero with `file:line:col` per hit.

**Scope:** `src/**` (`.ts .tsx .js .jsx .css .html`) plus root `index.html`.
`node_modules`, `dist`, `.git`, `.vite`, `coverage` hard-excluded. **The DS is
never scanned** — it has its own discipline and documented FAIL-LOUD literals.

**Catches:** raw hex, `rgb()/rgba()/hsl()/…`, raw `px`, raw font declarations.

**Allowed:** `0px`; `px` inside `@media` (custom properties are *invalid* in
media conditions — a hard CSS limitation, not a preference); `inherit/unset/
initial/revert`; anything inside a comment; any line carrying a
`token-exempt: <reason>` marker, whose reason is printed in the summary so
exemptions stay visible.

**Deliberately not allowed: raw `1px`.** The DS tokenises it as
`--brand-scale-25`, so allowlisting it would let a real violation through.

### Two blind spots — real, documented, unfixed

1. **Unitless numeric px in JSX inline styles is invisible.** `style={{ width: 16 }}`
   is an implicit 16px with no `px` text to match. Mitigating factor: the DS's own
   convention bans inline style objects.
2. **`@media` suppresses the whole line.** A violation sharing a line with
   `@media` is missed. Harmless with conventional formatting.

It was verified in **both directions** — 12 deliberate violations across all four
categories caught with correct positions, and the full allowlist confirmed not to
fire. A guardrail only ever tested against clean source proves nothing.

## Open items

- **Desktop max-width for the mobile frame** — unbuilt on purpose. ~430px is off
  the `--brand-scale` ramp (tops out at 96px). Needs a DS token decision, not an
  MVP literal. Group with the roadmap's parked **motion/elevation token layer**.
- **`react-router-dom` advisories** — 2 high-severity "RSC Mode CSRF Bypass".
  **Assessed and deliberately accepted**: client-only SPA, no RSC, so the
  vulnerable path does not exist. `npm audit fix` offers only `--force`. Do not
  re-litigate at every install.
- **Fast Refresh was proven for a component *attribute* change.** A change to a
  DS component's *hook usage* or exported *type* is a different case; the
  tsc/Vite type split above is the one to watch.

## DS-side, for a future DS session

**Do not fix these from the MVP repo.** Recorded here so they are not lost.

- **`ElementWrapper` renders via an inline `style={{}}` object.** The DS's
  `CLAUDE.md` bans inline styles precisely because CSS audits work by grepping
  each component's `.css` file — an inline style object is invisible to that
  process and becomes a permanent blind spot. Spotted in 4.3 while inspecting the
  rendered Icon markup.
- **The DS's `CLAUDE.md` points at `src/main.tsx`, which no longer exists.** The
  showcase moved to `showcase/` (`showcase/main.tsx`, `App.tsx`, `AppShell.css`,
  `Section.tsx`) during the Phase 2 repackaging. The Structure section is stale
  and misdirects a fresh session — it cost a failed file read this session.

## NEXT — Phase 5: MVP Flows

Per the roadmap, **starting at 5.1 — flow inventory from Figma**, one branch per
flow.

**Gate discipline changes here.** The DS uses three gates per component because
those components are primitives. MVP *screens* are compositions of
already-verified parts, so the leash loosens. The roadmap's method note is
explicit that getting this backwards — tight on the MVP, loose on the DS — is the
actual risk.

Rule 3 remains the load-bearing one: if a screen needs a primitive Monarch does
not have, **STOP and report**. It gets added to the DS properly, or the design
gets adjusted. That converts "the MVP diverged" into "the DS grew a component."

## Verification standards used throughout Phase 4

- `getComputedStyle` and DOM assertions in **both themes**, never screenshots —
  the screenshot tool failed again this session ("Browser pane is not displayed,
  not compositing frames"), consistent with the DS's standing note.
- **Finish transitions before reading any transitioned property:**
  `document.getAnimations().forEach(a => { try { a.finish() } catch (e) {} })`.
  The `try/catch` matters — an infinite animation throws and would abort the rest.
- **Read token values from a freshly-inserted probe element**, which has no
  transition to freeze, rather than trusting a token name you assumed.
- **Throwaway probes for anything a green build cannot prove** — resolver probes
  in 4.2/4.3, a `tsc` probe for prop types, guardrail violation probes in 4.6.
  All were deleted in the same command that ran them; none were ever staged.
- **Ground truth is disk and git, never session memory.**
