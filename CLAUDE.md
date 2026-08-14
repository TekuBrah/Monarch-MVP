# CLAUDE.md — Monarch MVP

## Project

The MVP application built **on top of** the Monarch Design System. This repo is
the consumer; the design system is the library. It is a mobile-first React DOM
app (roadmap decision D1 — not React Native, so the DS's components and CSS
cascade are reused at 100%).

**This is not the design system.** The DS lives in a separate repo with its own
remote and its own Vercel project (D2), and the dependency runs one direction
only: **MVP imports DS, never the reverse** (D3).

The locked plan — phases, steps, and decisions D1–D8 — lives in
`MONARCH-BUILD-ROADMAP.md` at the root of the design-system repo. Read it before
any work that references a phase or step number.

## Stack

Vite + React 19 + TypeScript. Dev server on port **5174** (`strictPort`), pinned
off the DS's 5173 so both can run at once — which is the normal case, not an edge.

```
npm run dev             # dev server, port 5174
npm run build           # tsc -b && vite build
npm run preview         # serve the production build
npm run lint:tokens     # token guardrail — scripts/check-tokens.mjs
npm run test:e2e        # Playwright browser suite (Gate 7)
npm run test:e2e:update # rewrite the visual baselines — deliberate act, see below
```

**THE MVP HAS A TEST SUITE AS OF GATE 7.** Any earlier instruction that this
repo has no test script and that one must not be created is superseded and
wrong — do not act on it, and do not report it as a conflict.

## The five rules

1. **Never define a component here that duplicates a Monarch component.** Import
   it from `@monarch/design-system`.
2. **Never write a raw color, radius, spacing, or font value.** Only
   `var(--mapped-*)` / `var(--responsive-*)`.
3. **If a screen needs a primitive Monarch doesn't have — STOP and report.** Do
   not build it here. It either gets added to the DS properly, or the design gets
   adjusted.
4. **MVP-local components are allowed only for *composition*** — screen layouts,
   feature-specific arrangements of DS components — **never for *primitives***.
5. **Never push, never open PRs, never touch remotes.** Teku pushes manually via
   Sourcetree.

Rule 3 is the one that preserves the system: it converts "the MVP diverged" into
"the DS grew a component," which is both the correct outcome and the better
case-study story.

**A component owns its stylesheet.** Promoting a component to `src/components/`
always brings its CSS with it, whether or not the files were previously
co-located — leaving the rule behind in a flow's stylesheet makes the shared
component silently dependent on that flow being in the bundle. This is a
relocation, not new MVP CSS, and does not breach the no-new-CSS constraint.
Precedents: `ComingSoon` (Flow 7), `SectionHeader` (Gate 6).

## Known conditions of this setup

Everything below was established and verified during Phase 4. None of it is
obvious from reading the code, and each item has a silent failure mode. Do not
rediscover these the hard way.

### The DS folder is literally named `Design system test`

Not `Monarch-Design-System`. That name exists only as the GitHub remote. The
alias in `vite.config.ts` hardcodes the real local name, by explicit decision —
no multi-path probe, no fallback search.

### `tsc` and Vite resolve the specifier differently in local-alias mode

- **Vite** → DS **source** (`../Design system test/src/index.ts`)
- **TypeScript** → the pinned **`v1.0.0` dist types** in
  `node_modules/@monarch/design-system/dist/index.d.ts`

Proven with `tsc --traceResolution`; there is no `paths` mapping. They agree
today because both are v1.0.0. They stop agreeing the moment DS source changes a
**type**: the MVP then compiles against stale types while rendering new source.
Harmless for CSS/token changes. If this ever bites, the fix is a `paths` entry in
`tsconfig.app.json` pointing at DS source — decide deliberately, don't add it
reflexively, since it also means typechecking unbuilt source.

### Local-alias mode requires the DS's `node_modules` to be installed

The DS's `Icon` imports 101 SVGs from `@material-design-icons/svg`, resolved by
walking **up from the DS source file's own location** — i.e. into the DS's
`node_modules`, not this repo's. A DS checkout without `npm install` produces a
confusing resolution error that appears to come from the MVP.

### The `styles.css` subpath alias hardcodes an internal DS path

`vite.config.ts` maps `@monarch/design-system/styles.css` →
`../Design system test/src/styles/package.css`. The DS's `exports` map only
describes **dist** mode (`"./styles.css" -> "./dist/index.css"`), so source mode
needs this second, more-specific alias — ordered *before* the bare specifier,
because Vite matches string aliases by prefix.

If the DS ever moves `src/styles/package.css`, **this goes stale silently** — no
build error, just missing tokens.

### New DS Vite transforms must be mirrored here

Local-alias mode compiles **raw DS source**, so this app's Vite config needs any
transform the DS's own build applies. Its `vite.config.lib.ts` is not in play.

`vite-plugin-svgr` is required today for exactly this reason (the `?react` SVG
imports). **Symptom of a missing transform: React's "Element type is invalid" at
render, with a completely green build** — because `?react` silently degrades to
an asset URL string. A passing build proves nothing here.

### The package ships no base layer and no font — CLOSED in the MVP (4.7)

**The DS package still ships neither.** This is permanently an MVP
responsibility, not something to expect the library to start providing.

- `globals.css` styles neither `html` nor `body` — verified, zero matches. With
  no base layer the page background is transparent, which in dark mode renders a
  white button on a still-white page.
  **Supplied by `src/index.css`** (`background: var(--mapped-surface-page)`,
  `color: var(--mapped-text-default-default)`, `font-family:
  var(--font-family-primary)`). Do not delete it.
- `@fontsource/poppins` is loaded by the DS's **own showcase entry**, which is
  not part of the package. `--font-family-primary` resolves to `'Poppins',
  sans-serif`, but with no `@font-face` registered every glyph silently falls
  back to `sans-serif`.
  **Supplied by `src/main.tsx`** — weights 400/500/600, matching the DS.

Verified after the fix: 9 font faces registered (was 0), and text measured at
221.17px under Poppins vs 209.86px under both plain `sans-serif` and a
deliberately bogus family. **`document.fonts.check()` returns a misleading
`true` either way and must not be used** — the honest signals are
`document.fonts.size` and the three-way width comparison.

### `react-router-dom` security advisories — reviewed, not applicable

`npm install` reports **2 high-severity findings: "React Router: RSC Mode CSRF
Bypass Allows Action Execution Before 400 Response."**

**This was assessed and deliberately accepted.** The MVP is a client-only SPA
with no React Server Components, so the vulnerable path does not exist here.
`npm audit fix` offers only `--force`, which is a breaking change for a risk
that does not apply.

Do not re-litigate this at every install, and do not run `npm audit fix --force`.
Revisit only if the MVP ever adopts RSC or a framework that enables it.

### Propagation status — both mechanisms confirmed live

| Mechanism | Status | How verified |
|---|---|---|
| CSS token → running app | ✅ **PASS** (4.4) | `--brand-scale-200` 8px → 40px in DS source; Button's computed `border-radius` followed live |
| React Fast Refresh across the alias | ✅ **PASS** (4.5) | `data-*` attribute added to DS `Button.tsx`; appeared in the live DOM |

Neither required a reload, rebuild, reinstall, or server restart. Both were
verified with a `window` sentinel plus
`performance.getEntriesByType('navigation').length === 1`, so "it updated" cannot
be confused with "the page reloaded". Both DS edits were reverted byte-identical
(SHA256 before/after).

## Open — needs a decision, deliberately not built

### Desktop max-width for the mobile frame

`AppShell.css` has **no desktop max-width and no media query**. On a wide
viewport the shell simply fills the window.

This is unbuilt on purpose, not an oversight. A phone-width frame wants roughly
**430px**, and the `--brand-scale` ramp tops out at **96px** — so there is no
token for it. Writing a raw `430px` would violate rule 2, and curve-fitting it
out of `calc()` on unrelated scale steps is explicitly banned by the DS's
token-gap protocol (that pattern was rejected there once already).

**This needs a DS token decision, not an MVP literal.** It belongs with the
roadmap's parked **motion/elevation token layer** item — the same class of gap,
where real design values have no backing token (`0.12s` transitions, z-index,
some opacity values). Resolve them together.

If it is ever built here as an interim measure, it must use the guardrail's
`token-exempt: <reason>` escape hatch so it stays visible, never a silent
literal.

## Verification discipline

Inherited from the design system, and it applies identically here:

- Verify with `getComputedStyle` and DOM assertions **in both themes**, not
  ad-hoc screenshots — the interactive screenshot tool has been unreliable
  throughout this project and failed again in Phase 4. Playwright's
  `toHaveScreenshot` is a different mechanism and is trustworthy; the two are
  not the same thing.
- **Finish transitions before reading any transitioned property**, or the
  reading is a lie:
  `document.getAnimations().forEach(a => { try { a.finish() } catch (e) {} })`.
  The `try/catch` matters — an infinite animation throws and would abort the
  rest of the check.
- Read token values from a **freshly-inserted probe element** rather than
  comparing against a name you assume — a new node has no transition to freeze.
- **Check the component's CSS before calling a mismatch a bug.** Phase 4 nearly
  filed a false positive against Button in dark mode: `[data-theme="dark"]
  .mn-btn--primary` deliberately re-maps to the on-color treatment (Figma's
  "Inverse" appearance), so comparing against `--mapped-surface-primary-default`
  produced a real-looking mismatch that was entirely an incorrect expectation.
- **Ground truth is disk and git, never session memory.**
- **Type-check gate is `npx tsc -b --force`, never bare `tsc -b`** — the
  incremental cache can report success having checked nothing, which is exactly
  the case when files move between directories.
- **Before starting work, check whether a dev server is already listening on the
  project port.** If one is and it belongs to another session, STOP and report.
  Never attach to another session's server: two sessions on one working tree can
  edit each other's files, and measurements taken through a server you do not own
  are not trustworthy.

## The gates

Four, all green before a step is done:

```
npx tsc -b --force
npm run build
npm run lint:tokens
npm run test:e2e
```

`test:e2e` starts its own dev server on 5174 and reuses one that is already
listening, so the port rule above still applies — check first.

## The browser harness (Gate 7)

`playwright.config.ts` + `e2e/`. Chromium only, headless, one worker, zero
retries. It exists because Gates 1–6 were hand-measured one value at a time, and
that cost three specific things: an ambiguous inertness proof, a section-header
bypass nothing swept for, and no screenshot capability at all.

**THE VIEWPORT AND THE DPR ARE PINNED BY THE HARNESS — 375 x 812 at
`deviceScaleFactor: 2`.** An uncontrolled devicePixelRatio is the specific
defect this harness was built to eliminate, so the pin is asserted at runtime in
`e2e/routes.spec.ts` as well as declared in the config. **Any measurement that
disagrees with 375 / DPR 2 means the harness was bypassed** — it was taken
through some other browser — and it is not evidence of anything until it is
re-taken through the suite.

Two more axes are pinned for the same reason and must not be loosened: the
browser's timezone/locale (config) and the app's clock (`page.clock.setFixedTime`
in `e2e/harness.ts`, because `src/data/today.ts` reads `new Date()` at module
load and the fixed-deposit dates and net-worth chart derive from it).

Do not spread a Playwright `devices[...]` descriptor into the project's `use`
block. A project's `use` overrides the top-level one, and every desktop
descriptor carries its own viewport and `deviceScaleFactor: 1` — it would
silently undo both pins.

### Visual baselines

Committed on purpose, in `e2e/visual.spec.ts-snapshots/`. `.gitignore` excludes
Playwright's *output* (`test-results/`, `playwright-report/`) and nothing else.

Update them with `npm run test:e2e:update`, and only for a change you intended
and can name in the commit message. **An unexplained baseline change is a
finding, not a chore** — regenerating one to make the suite green is how the net
stops catching anything.

### Proving a CSS deletion is inert (Gate 8)

**A GREEN SUITE ALONE DOES NOT DISTINGUISH "INERT" FROM "BLIND."** A deletion
that changes nothing and a deletion in a region the suite cannot see produce the
identical result: 28 baselines, zero diffs. So an inertness claim needs two
things, and the second is the one that is easy to skip:

1. Run `npm run test:e2e` with an **expected zero diff** on all 28 baselines.
   Never `test:e2e:update` — there is no intended visual change, so there is
   nothing to update. **A diff means the inertness claim was wrong**, and the
   deletion stops there.
2. Pair it with a **negative control at the same site**: break something that
   definitely paints on the very element the deletion touched, confirm the
   visual spec goes red with a real pixel count, then restore and hash-verify
   byte-identical. That is what proves the zero-diff in step 1 was a
   measurement rather than a blind spot.

Geometry read through the harness (`getBoundingClientRect`, computed values, in
both themes, transitions finished) is a useful second instrument, because a
matching screenshot could in principle hide a compensating change.

**`.mvp-finance-detail__list-section` was deleted this way.** Its sole
declaration was `gap: var(--spacing-300)`, and every element carrying that class
also carries `.mvp-finance-detail__section`, which sets the same token. Equal
specificity, so source order decided it — but both resolved to `12px`, in both
themes, on all 7 instances. Evidence: 86 passed / 0 baseline diffs, 0 geometric
delta across 14 element-theme pairs, and a negative control at the same element
producing a 5,708-pixel diff.

**`gap: var(--spacing-200)` on `.mvp-section-header` was also deleted — after
the gate's own stop condition was measured to be wrong.** The claim on record
was that `justify-content: space-between` on a *two-child* row makes gap inert,
and Gate 8 was told to halt if any instance had a child count other than two,
because "a one-child header is the case where gap could matter."

**Measurement inverted that rationale.** Of the 10 instances, **8 have ONE
child** — so the original two-child claim described only 2 of them — but `gap`
creates space *between* adjacent flex items, so a single flex item has **zero**
gaps and the declaration cannot paint at all. One child makes the deletion more
trivially inert, not less. The two-child cases were checked separately and are
inert too: `scrollWidth === clientWidth` on every instance, with 172–265px of
slack, so gap is never the binding constraint. The condition was lifted
deliberately on that evidence, not waived.

Same two-instrument proof as above: 86 passed / 0 baseline diffs on all 28, and
**0 geometric delta across 20 element-theme pairs** — every rect, container
height and following-sibling rect byte-identical, with computed `gap` moving
`8px` → `normal` (the declaration gone, with no consequence). Control B had
already produced diffs of 2,237 / 671 / 671 / 496 / 480 pixels at that exact
element, so the region is proven visible.

**THE LESSON IS THE INVERTED STOP CONDITION, NOT THE GAP.** A stop condition is
only as good as its rationale, and this one would have preserved a dead
declaration forever. Measure the rationale, not just the threshold.

### What the suite does not cover

The route walk sees each screen in its DEFAULT tab. The Homepage's four tabs and
the Finance screen's five are in-screen `useState`, not routes (Flow 1 §3, Flow 7
B7), so nothing behind a non-default tab is walked, swept or screenshotted. A
known limit, not an oversight.

**THE ROUTE COUNT IS 14, AND IT IS DERIVED.** `e2e/harness.ts` builds `ROUTES`
from `src/App.tsx`'s `<Routes>` table, expanding the one parameterised route
(`finance/holding/:holdingId`) over `HOLDINGS` — 5 static URLs + 9 holdings. An
earlier hand-measured record of **16 routes is SUPERSEDED** and must not be used
to contradict the derived count. Three checks back the 14, all re-verified at
Gate 7 close:

- there is **no catch-all `"*"` route**;
- **no `<Route>` is declared outside `src/App.tsx`** (grep for
  `<Route|Routes|path=|createBrowserRouter|useRoutes` across `src/` returns
  `App.tsx` and nothing else);
- there is **one pathless layout route** (`<Route element={<AppShell />}>`) with
  **six children**, and none of those six has children of its own.

If a future session finds a route the walk misses, **the DERIVATION is what is
wrong** and must be re-derived from the router. Do not patch the route list by
hand — a hand-written list is exactly what goes quietly green when a route is
renamed.

**SIX `SectionHeader` CALL SITES EXIST IN `src/`; THE SWEEP REACHES FOUR.** The
two it does not reach are `HomepageCrypto.tsx:89` **"My Tokens"** and
`HomepageCrypto.tsx:115` **"Featured Coin"**. Both sit behind the Homepage's
Crypto tab, which is `useState` in `HomepageScreen.tsx` — the URL is byte-identical
before and after the tab is clicked (measured), so **no route walk can reach
them**. The sweep is total over RENDERED DOM, not over the app.

**THE GAP, STATED AS A GAP: a section header added behind a non-default tab will
NOT be caught by this suite.** Tab coverage was deliberately deferred at Gate 7
close — the gate bought route-level cover, not state-level cover. **It must be
closed BEFORE tabbed screens ship.** Until it is, a green suite is not evidence
that a new heading binds `text/subtle/default`; it is only evidence that every
heading on a default tab does.

## Git workflow

**Branch creation is Claude Code's, when a step calls for it.** Phase 5 runs one
branch per flow, and creating that branch off `main` is the first action of the
flow — e.g. `git checkout -b phase/5-flow01-homepage`.

**Staging, committing and pushing are Teku's alone, via Sourcetree.** Not
"pushing only" — *all three*. Claude Code leaves the working tree dirty at the
end of a step so the diff can be reviewed whole, and Teku decides how to split
it into commits.

**Never push, never open PRs, never touch remotes** — see rule 5.

Branch creation is therefore the only git write Claude Code makes. This
supersedes the earlier "staging and committing locally is fine."

**MVP HISTORY IS INTENDED TO BE LINEAR, AND THE TAG IS WHAT MATTERS.** Gate
branches are meant to be single-commit and to fast-forward into `main`, and a
closed gate is marked with an `mvp-gateN` tag.

**THE DURABLE CONVENTION IS THE TAG, NOT THE SHAPE OF THE HISTORY.** `main`
already contains a real merge commit — `b1f7b7f "Merge branch
'phase/gate7-playwright-harness'"`, from the Gate 7 close — and `mvp-gate7`
points at the tip regardless. **A merge commit is not a defect**: do not report
one as a finding, do not rebase or rewrite history to remove one, and do not
treat the absence of merge commits as something to verify either. Find the gate
by its tag.
