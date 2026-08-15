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

#### The hole this used to have — measured, and why the guard exists

**AN ORDINARY RUN CREATED A MISSING BASELINE. `--update` WAS NOT THE ONLY WAY
IN.** This was measured, not assumed (Gate 9 addendum, control Y2): a tracked
baseline was deleted from the working tree and `npm run test:e2e` — no
`--update` anywhere — was run twice.

- Run 1: **1 failed / 128 passed**, reporting `Error: A snapshot doesn't exist
  at …\steward-light-chromium-win32.png, writing actual.` **And it wrote the
  file.**
- Run 2: **129 passed.** Green, on a baseline nobody reviewed.

(The re-created file happened to be byte-identical to the committed one —
`ABE5883A…C240A` both sides — but that is a fact about this screen, not
reassurance about the mechanism. Had the app regressed, the regression is what
would have been written, and it would reproduce byte-identically too.)

**THE CONSEQUENCE WAS: A NEW `toHaveScreenshot` NAME GOT AN UNREVIEWED BASELINE
ON ITS SECOND ORDINARY RUN.** The failure was announced exactly once and never
again, so "the suite is green" did not mean "every baseline was reviewed".
Gate 10 replaced the instruction that guarded this with a mechanism. **The
measurement above is kept because it is the reason the mechanism exists** — do
not delete it on the grounds that it no longer describes the behaviour.

#### The mechanism (Gate 10) — two parts, because one door was not enough

**PART 1 — `updateSnapshots: 'none'` in `playwright.config.ts`.** Playwright's
default is `'missing'`, which is the hole in as many words: `npx playwright test
--help` says *"Running tests without the flag defaults to `missing`"*. With
`'none'`, **an ordinary run never writes a snapshot** — a missing baseline is a
hard failure on every run until a human deals with it. Writing a baseline
becomes a deliberate named act rather than a side effect of running the suite.

**THE `-u` OVERRIDE IS MEASURED, NOT ASSUMED (Gate 10a).** Gate 10 *asserted*
that `npm run test:e2e:update` still works because the command-line flag beats
the config value, but its own prompt forbade running that command, so the claim
shipped untested — and if it were wrong, Flow 8 could not mint a baseline at
all. It was then run, once, deliberately: `steward-light-chromium-win32.png`
(`ABE5883A…C240A`) was deleted and `npm run test:e2e:update` was run.

- Playwright printed exactly **one** `A snapshot doesn't exist at
  …\steward-light-chromium-win32.png, writing actual.` — the `, writing actual.`
  that `updateSnapshots: 'none'` suppresses on an ordinary run is back, so **the
  flag does override the config**.
- The file existed again (`Test-Path` → `True`) and re-hashed to
  `ABE5883A…C240A` — **byte-identical**.
- **`-u` REWROTE ONLY THE MISSING FILE, NOT THE SET.** This is the operationally
  useful half and it is a direct read, not an inference from hashes being equal:
  all 42 files were re-hashed (0 differed) *and* `LastWriteTime` was read on all
  42 — only `steward-light` carried a timestamp from the update run; the other
  41 kept theirs, some from the previous day. So **Flow 8 can safely run
  `test:e2e:update` with existing baselines present**: names that already match
  are not touched.
- `npm run test:e2e` with no flag afterwards: **131 passed**.

The one wrinkle worth knowing: on that run the guard's *tracked-but-missing*
test failed (`1 failed / 130 passed`). That is correct, not a false positive —
`baselines.spec.ts` sorts first, so at the moment it ran the tracked file really
was absent; the visual spec wrote it later in the same run. Minting genuinely
NEW baselines does not hit this, because a new name is not tracked yet.

**PART 2 — the baseline guard, `e2e/baselines.spec.ts` (3 tests).** Part 1 stops
new strays being *written*; it cannot see a baseline file that is **already on
disk**, because Playwright only ever looks up the names its tests ask for. Its
first two tests compare two lists of filenames — every file under an
`e2e/**/*-snapshots/` directory on disk, and every file `git ls-files` tracks
there — and fail naming each offender and what to do with it:

- **untracked-on-disk** → `git add` it if you minted and reviewed it, delete it
  if it is a stray;
- **tracked-but-missing** → `git checkout --` it to restore the *reviewed* bytes,
  or `git rm` it if the baseline is genuinely retired.

It reads no image, writes nothing, and takes no browser, so it cannot depend on
run order. The snapshot directories are **discovered from both sides**, not
transcribed — a second spec file that starts minting screenshots is covered the
day it appears.

**PROVEN BY THREE CONTROLS at Gate 10, each restored and hash-verified after:**

| Control | Result |
|---|---|
| (a) delete a tracked baseline (`steward-light`, `ABE5883A…C240A`), run twice with no `--update` | Run 1 **2 failed / 129 passed** and **did not write the file**; run 2 **2 failed / 129 passed** — where Gate 9 measured 129 passed, green |
| (b) an untracked stray (`index-plastic-light-chromium-win32.png`, a copy) | **1 failed / 130 passed**, the guard naming that exact file |
| (c) clean tree, all 42 baselines tracked and present | **131 passed** — the guard does not fire on a correct tree |

Control (a) is the load-bearing one: the run-1 message was `A snapshot doesn't
exist at …\steward-light-chromium-win32.png.` with **no `, writing actual.`**,
and `Test-Path` confirmed the file was still absent afterwards.

**THE WINDOWS-ONLY BASELINE CASE IS COVERED — by Part 1, not by the guard.**
Every baseline is suffixed `-chromium-win32`, so on macOS or Linux every name
resolves to a file that does not exist. That used to write a fresh unreviewed
set and pass on the next run; under `updateSnapshots: 'none'` it is now 42 hard
failures instead. This is the *same code path* control (a) exercised — a missing
file for the name being asked for — so it is proven by the same measurement, not
by a separate one. The guard proper would stay green there, because disk and git
still agree; Part 1 is what catches it.

#### The third arm (Gate 10a) — the orphan

**A BASELINE THAT IS BOTH TRACKED AND PRESENT PASSED BOTH TESTS ABOVE, EVEN WITH
NO TEST ASKING FOR IT.** Gate 10 recorded that correctly as still open. It is
closed by a third test, `every baseline on disk is a name the suite asks for`,
which brings a THIRD list: the names the suite actually requests.

**IT IS DERIVED, AND FROM THE SAME SOURCE `visual.spec.ts` USES.** `WALK`,
`THEMES` and `stateSlug` are **imported** from `harness.ts` — not
re-implemented, and harness.ts is not touched — giving 21 walk states × 2 themes
= **42** names, which is exactly the file count on disk. Anything on disk and
outside that set is named as an orphan, with `git rm` as the fix and the warning
that re-running the suite (or `test:e2e:update`) will never clear it, because
nothing asks for the name. It deliberately does **not** fail on
expected-but-absent: that already fails at the tracked-but-missing test and
again at the visual test itself.

**THE FILENAME IS RESOLVED BY PLAYWRIGHT, NOT ASSEMBLED — and that distinction
was forced by a measurement.** The first attempt read the `-chromium-win32`
decoration by resolving a probe named `__baseline_guard_probe__.png` and
stripping the parts it supplied. **The probe came back as
`-baseline-guard-probe--chromium-win32.png`**: Playwright SANITISES the
screenshot name, and the underscores had been rewritten. Today's slugs are all
`[a-z0-9-]`, so a hand-assembled name would have been right by luck and wrong
the day a slug carried a character Playwright rewrites. The arm now calls
`testInfo.snapshotPath(name, { kind: 'screenshot' })` — documented as returning
the very path `toHaveScreenshot(name)` expects — and uses its basename, so
sanitisation, project name and platform suffix all come from Playwright. A
collision check (42 names must stay 42 distinct filenames) covers sanitisation
being many-to-one.

Like the other two it reads no image, writes nothing, takes no browser and needs
no dev server, so it cannot depend on run order.

**PROVEN BY TWO CONTROLS at Gate 10a:**

| Control | Result |
|---|---|
| (a) a plausible orphan (`index-plastic-light-chromium-win32.png`, a copy) **`git add`-ed** so it is tracked AND present | **1 failed / 131 passed** — ONLY the third arm fired; the other two stayed green, which is what proves it catches something they cannot |
| (b) clean tree, 42 baselines, all tracked and all expected | **132 passed** — it does not fire on a correct tree |

Control (a) is the load-bearing one: `git status` showed the file staged as `A`
before the run, i.e. invisible to both older tests by construction. It was then
`git reset`, deleted, and the index re-verified empty.

**WHAT STILL NEEDS A HUMAN.** One thing:

- **The CONTENT of a baseline.** Nothing here reviews pixels. A deliberate
  `test:e2e:update` still writes what the app currently renders, and the
  discipline at the top of this section is what governs that.

**NAMING (Gate 9).** A default-tab state keeps the unsuffixed Gate 7 name —
`index-light` is still the Homepage's Accounts tab — and a non-default tab state
takes the tab id as a suffix: `index-crypto-light`, `finance-budget-dark`. The
name comes from `stateSlug()` in `e2e/harness.ts`, which builds it from the
route and, only when a tab had to be clicked, the tab id. That is why `WALK`
expresses the default state as `tab: null` rather than as the default `TabState`:
the two are the same screen, but only one of them clicks anything.

**THE EXISTING 28 WERE DELIBERATELY NOT RENAMED,** and the reason is the update
run itself. `--update-snapshots` regenerates any baseline whose name it cannot
match, so a rename would have rewritten all 28 — and byte-identity across those
28 is the ONLY thing bounding an update run. Renaming them would have destroyed
the single check that says "adding tab coverage did not alter a default-tab
render."

**`npm run test:e2e:update` HAS BEEN RUN EXACTLY ONCE IN THIS PROJECT'S HISTORY
— at Gate 9.** It was justified because new baselines were the intended output:
14 tab states had no baseline to diff against, so there was nothing to regress.
It was bounded by hashing all 28 pre-existing baselines before the run and
re-hashing after: **28 re-hashed, 0 changed**, and Playwright reported exactly 14
"snapshot doesn't exist, writing actual" lines and no updates. The suite was then
run twice more without `--update` — 129 passed, 0 diffs, both times. Any
pre-existing baseline changing on an update run is a finding that stops the gate,
not a result to accept.

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

### Tab coverage (Gate 9)

**THE TAB GAP IS CLOSED.** The walk is no longer route-only: it is every route
**× every tab state**. The Homepage's four tabs and the Finance screen's five are
still in-screen `useState` and still never reach the URL (Flow 1 §3, Flow 7 B7) —
what changed is that the suite now activates them.

**THE WALK IS 21 STATES, AND IT IS DERIVED.** 14 routes + 7 non-default tab
states (Homepage 4 tabs − 1 default = 3; Finance 5 − 1 = 4). `e2e/harness.ts`
parses `src/App.tsx` for the router table, resolves each route's element to its
source file through that file's own import list, and parses a
`const X: TabItem[] = [...]` out of it — so a renamed tab, a reordered tab or a
new tabbed screen is picked up without anyone editing the harness. **Do not
hand-write the tab list**; it has the same failure mode a hand-written route list
has.

**A SOURCE-TEXT PARSE CANNOT SEE WHAT IT DID NOT THINK TO LOOK FOR, so it is
checked against the DOM.** `assertTabEnumerationMatchesDom()` runs on every state
in the route walk — including states on screens the parse believes have no tabs —
and compares the parsed ids, labels and default selection against the actual
`[role="tab"]` set. A tab bar nested deeper than the route's own file would fail
there rather than silently shrinking the suite. That cross-check is what makes it
safe to build the test list from a parse; Playwright enumerates tests
synchronously, before a browser exists, so the DOM cannot produce the list — only
audit it.

**TABS ARE ACTIVATED THROUGH THEIR OWN CONTROL,** never by setting React state or
writing to the DOM — the same rule that makes `gotoRoute` click the theme toggle
instead of writing `data-theme`. Settle is detected on `aria-selected` flipping
to `true`, which `Tab` renders directly off the `selectedId` state being reached,
so it is the state transition itself rather than a proxy for it; then exactly one
selected tab, then image decode, then fonts. No timers. Clicking also avoids the
one animation in `Tabs` — `scrollIntoView({ behavior: 'smooth' })` is on the
`focusTab` path, i.e. arrow keys, not `onClick`.

**ALL SIX `SectionHeader` CALL SITES ARE NOW SWEPT.** The two that Gate 7 could
not reach — `HomepageCrypto.tsx` **"My Tokens"** and **"Featured Coin"**, behind
the Homepage's Crypto tab — are reached by the walk. The sweep totals **24
`.mvp-section-header` instances** across 21 states × 2 themes, decomposing into 9
distinct headings: "Transactions", "Smart Insights", "Monarch Academy", "My
Tokens", "Featured Coin" (2 state/theme pairs each), "Stocks held" (2), and
"Recent transactions", "Funds held", "Token holdings" (4 each, being on more than
one holding screen). Four of those 24 are Crypto-tab-only and were invisible
before this gate.

**WHAT IS STILL NOT COVERED, stated as a gap.** The sweep is total over RENDERED
DOM, and tab state is now part of what gets rendered — but other in-screen state
is not. A heading behind a modal, an expanded row or any other `useState` that
this walk does not toggle is still only seen if that state happens to be open.
`HoldingDetailScreen`'s two preset modals are the concrete case today.

**THE ROUTE COUNT IS 14, AND IT IS DERIVED.** `e2e/harness.ts` builds `ROUTES`
from `src/App.tsx`'s `<Routes>` table, expanding the one parameterised route
(`finance/holding/:holdingId`) over `HOLDINGS` — 5 static URLs + 9 holdings. As
of Gate 9 that table is **parsed** rather than transcribed, and an unexpandable
`:param` throws instead of walking a path with a literal colon in it. An earlier
hand-measured record of **16 routes is SUPERSEDED** and must not be used to
contradict the derived count. Three checks back the 14, all re-verified at
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

**THE TAB COVERAGE IS PROVEN, NOT ASSUMED.** New coverage that never goes red is
decorative, so **FOUR** controls were run at Gate 9 — three that break a thing
the suite should catch, and a fourth that breaks the STATE LIST ITSELF. Each was
restored and hash-verified byte-identical afterwards.

The first three each broke something on a TAB-ONLY target and confirmed the
failure lands there:

- `tone="subtle"` removed from `SectionHeader`'s internal `Label` → the sweep
  failed on **"My Tokens" on `/ [tab:crypto]`**, `rgb(54,60,67)` vs expected
  `rgb(107,119,134)` light and `rgb(207,213,220)` vs `rgb(134,149,167)` dark.
- a `console.error` in `HomepageCrypto` → **exactly 2 route-walk tests failed**
  (`/ [tab:crypto]` in both themes) and the other 41 passed, including `/` on its
  default tab. The precision is the evidence: only the tab axis could see it.
- `.mvp-balance-card__change`'s `gap` widened `--spacing-200` → `--spacing-600`
  — that row renders only when `BalanceCard` gets a `change` prop, which only
  `HomepageCrypto` passes → the visual spec failed on **`index-crypto-light`
  (172 pixels)** and **`index-crypto-dark` (115 pixels)**, with all 40 other
  baselines green.

**THE FOURTH CONTROL TESTED THE ENUMERATION ITSELF,** because the three above all
PRESUPPOSE it. Every one of them proves the coverage catches things at the states
the suite visits; none of them checks that the state list is the right list. A
hand-written list wearing a convincing parse would pass all three. So the
Homepage's `cards` tab **id** was renamed to `plastic` at its declaration in
`HomepageScreen.tsx` (the id, not the label).

**The enumeration FOLLOWED the rename with no harness edit.** `npx playwright
test --list` reported `/ [tab:plastic]` where it had reported `/ [tab:cards]`, in
both themes, and the totals held — **129 tests, 21 walk states, 4 tabs** — which
is correct, because the source still declares four tabs and only one id moved.
The run's own derivation log read `4 tabs: accounts, crypto, plastic, stocks`.
The route walk and the section-header sweep both stayed green on the renamed id
(**127 passed**) — correctly, because the DOM really does render `tab-plastic` —
which is the parse and `assertTabEnumerationMatchesDom` agreeing rather than
either one being bypassed.

**IT ALSO EXPOSED A COUPLING A FUTURE RENAME WILL HIT: BASELINE FILENAMES ARE
KEYED TO TAB IDS.** `stateSlug()` builds the name from the tab id, so renaming a
tab orphans its baselines — the suite went looking for `index-plastic-light` /
`index-plastic-dark`, found neither, **wrote both automatically** (2 failed), and
left `index-cards-light` / `index-cards-dark` on disk asserted by nothing. That
writing behaviour is not specific to tabs and is recorded as a standing property
of the net under **Visual baselines** above — read it there.

So when a tab id is deliberately renamed: rename its two baseline files to match
in the same commit, and account for strays with `git ls-files --others
--exclude-standard -- e2e/visual.spec.ts-snapshots`. In this control the two
strays were deleted, the id was reverted (`HomepageScreen.tsx` back to
`A084D933…3272`), and the count returned to 42.

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
