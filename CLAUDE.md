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

## Scrims and `--gradient-surface` — a rule, not a navbar anecdote

**ANY SCRIM THIS APP PAINTS MUST OVERRIDE `--gradient-surface`, UNLESS THE
ELEMENT GENUINELY SITS ON THE PAGE SURFACE.** This is general. The navbar is
simply the first component to surface it, and the next one will hit it too.

The DS ships two scrim tokens, `--mapped-gradient-subtle` and
`--mapped-gradient-default`. Both fade into `--gradient-surface`, which the DS
seeds to `--mapped-surface-page`. **That seed is correct for the DS showcase,
which sits on the page surface, and wrong for most MVP screens, which do
not** — `.mvp-home` and `.mvp-finance` both paint
`--mapped-surface-subtlest-default`. Fading to the page colour over a
subtlest-surface screen leaves a visible step where the scrim's solid end
meets the surface: measured Δ6/channel light, Δ19/channel dark.

So the rule for a new scrim anywhere in this app:

1. Find what is ACTUALLY painted behind the element, by measurement — not by
   reading which container it is nested in. A screen div can extend past the
   viewport and cover the page background for the scrim's whole height, which
   is exactly what happens under the navbar (`.mvp-home` runs to y=943
   against an 812 viewport).
2. Set `--gradient-surface` on the scrim element to that surface.
3. Consume `var(--mapped-gradient-subtle)` (or `-default`) as the background.

**`--mapped-gradient-*` CANNOT BE OVERRIDDEN AT AN ANCESTOR.** DS v1.5.0
declares the pair on `*`, so every element recomputes its own and an ancestor
override does not inherit down. Verified in the browser, both themes: an
ancestor override of `--mapped-gradient-subtle` does NOT reach the child, and
an ancestor override of `--gradient-surface` DOES. `--gradient-surface` is the
supported seam; overriding it is using the DS as designed, not working around
it.

**The token dark-flips unaided,** because `--mapped-surface-page` and
`--mapped-surface-subtlest-default` both flip. A scrim therefore needs no
dark-theme design spec of its own.

### A scrim needs RUNWAY, and the runway is the part that gets forgotten

**A GRADIENT CONFINED TO THE ELEMENT IT DECORATES USUALLY CANNOT DISSOLVE
ANYTHING.** `--mapped-gradient-subtle` ramps from opaque to transparent across
the WHOLE height of the box that carries it. If that box is short, or if most
of it is covered by something opaque, the alpha reached at the point where
content actually disappears is tiny, and the result reads as a hard cut even
though the gradient is provably correct.

The arithmetic, which generalises to any scrim over any occluder: for
`linear-gradient(0deg, S 0%, transparent 100%)` of height H anchored to the
bottom, the alpha accumulated at a point D above the bottom is `(H - D) / H`.
Put the occluder's top edge in for D and that is how faded content is at the
moment it disappears.

The navbar is the worked example. Its band is 99px and the pill covers 64 of
them, so D = 90 and a scrim confined to the band reached **~9%** — content was
91% visible when it met the pill. Measured against the algebra in both themes:
99px -> 9%, 128px -> 30%, 256px -> 65%, 512px -> 83%, with dark tracking the
prediction to within a percentage point.

**SO THE SCRIM IS ITS OWN LAYER, NOT A BACKGROUND ON THE THING IT FADES.**
Sizing the decorated element to suit the gradient would change hit-testing and
layout; a separate `position: fixed` layer with `pointer-events: none`, one
z-index below, changes neither. Verified: hit-testing inside the layer returns
the content beneath it, not the layer.

**THE NEW FAILURE MODE IS A SEAM AT THE LAYER'S TOP EDGE, AND IT MUST BE
MEASURED WITH A CONTROL.** Sample a column across that edge with and without
the layer: the row-to-row step is natural content variation and will be large,
so the number that matters is the DIFFERENCE between the two. For the navbar
scrim that difference is **0 per channel** in both themes (step 245 light /
231 dark, identical either way). A gradient whose top stop is `transparent`
reaches alpha 0 continuously and so has no hard edge at any height — which is
also why "make the layer tall enough that its top edge is imperceptible" is
not a usable sizing criterion. It is satisfied at every height. Size the layer
by the alpha it must reach at the occluder, not by its own top edge.

### Open question for the design system

Should `Gradient/subtle` seed the PAGE surface at all, or should the DS seed
the surface a component is placed on? Today every consumer whose screens sit
off the page surface must override, which makes the default the exception
rather than the rule. Logged from the MVP side for a future DS gate; do not
act on it from this repo.

## The content column (Gate 12)

**`--mvp-gutter` IS THE SINGLE SOURCE OF TRUTH FOR THE HORIZONTAL CONTENT
EDGE.** It is declared once, in `src/index.css`:

```css
:root { --mvp-gutter: var(--spacing-400); }
```

A new site that establishes a content edge **derives from `--mvp-gutter`, not
from a spacing token directly**. Writing `var(--spacing-400)` at a new gutter
site is the thing this convention exists to stop: it was re-declared
independently at every site before this gate, which is why the parked
frame-max-width decision had no single object to cap.

`--spacing-400` is still correct for a component's OWN interior padding — a
card's inset is not the content column, and conflating the two is how the
column stops meaning anything. The test is whether the declaration positions
the element against the SCREEN edge or pads content inside an already-placed
box.

**WHY THE INDIRECTION IS SAFE, AND WHAT WOULD BREAK IT.** A custom property
that references another custom property is substituted where it is DECLARED,
not where it is used — the hazard that killed a DS gradient mechanism that had
been approved on paper. Here that baking is harmless *and load-bearing*: it is
what makes the migration inert. But it holds only while `--spacing-400` never
varies by scope. It is declared exactly once, at bare `:root` in the DS
`globals.css`, resolving to `--brand-scale-400` which is likewise declared once
at bare `:root` — neither sits in `[data-theme="dark"]`, a media query or a
container query. **If a future DS release scopes `--spacing-400`, this
indirection freezes at the `:root` value and silently ignores the override.**
Re-check that before trusting the column across a DS upgrade.

### Four mechanisms, one value

The app establishes a horizontal edge four different ways, and the convention
serves each differently. This is not untidiness to be normalised away — the
mechanism is forced by what the element is.

| Mechanism | Served by | Why |
|---|---|---|
| `padding-left`/`padding-right` pair | **`.mvp-column`** | Exact match: same two properties, same box. The class is applied in markup. |
| `padding` shorthand | the property, at the site | The shorthand also carries vertical values; splitting it to adopt the class would add declarations and a cascade dependency for no gain. |
| `margin` shorthand | the property, at the site | Same reason. `margin: 0 var(--mvp-gutter)` is doing two jobs; a `margin-right`/`margin-left` class can only do one, and `margin: 0` alongside it would win on source order and collapse the gutter. |
| `left`/`right` on fixed chrome | the property, at the site | **A fixed inset cannot be expressed as padding at all.** Padding insets content within a box; `left`/`right` positions the box itself against the viewport. There is no class that could serve this without changing which box owns the edge. |

**`.mvp-column--outset` WAS PROPOSED AND DELIBERATELY NOT SHIPPED.** It would
have served the `margin` sites, and it had **zero** adopters that met the bar:
every margin site uses the shorthand, so adoption would have meant splitting it
into longhands purely to justify the class. An unadopted class is a claim the
migration did not support. If a future site genuinely writes
`margin-left`/`margin-right` as longhands, add it then.

### Two standing exclusions — do not "finish the job"

- **`.mvp-coming-soon` is NOT on the column.** Its inset is `--spacing-600`
  (24px), not the gutter, and it is a centred placeholder — `text-align:
  center` with the description capped at `max-width: 75%` — rather than a
  content column. It renders on `/transfer`, `/more`, `/steward` and two
  Homepage tabs. **Migrating it to the gutter changes pixels on five screens.**
- **`.mvp-shell__nav` WAS excluded here and is now a column site (Gate 13).**
  It was excluded from the Gate 12 migration because it was a FIX, not a
  rename: at that point it had no gutter at all (`left: 0; right: 0`, zero
  padding), so giving it one was a pixel change and Gate 12 was required to be
  inert. It took the gutter in Gate 13 via `.mvp-column` in `AppShell.tsx`,
  together with `barWidth='fill'` — see the half-fix note below. The element is
  still deliberately full-bleed; what changed is that its CONTENT is inset.

Both were measured, not assumed. They are the control group that proves the
migration was inert rather than globally shifted: they did not move either.

### `.mvp-column--bleed` is deferred, on purpose

The full-bleed scroller — the Smart Insights carousel — spans the viewport and
carries the gutter as padding. It wants a `--bleed` variant, and that variant's
reason for existing is `scroll-padding-left`: without it, `scroll-snap-align:
start` aligns the first card to the scrollport edge and **eats the declared
inset**, which is a real defect, visible at rest, not only after scrolling.

That is fix 5, and it CHANGES PIXELS. Declaring the class in this gate would
have shipped dead CSS whose only consumer arrives later. It lands in Gate 3
together with its adoption and its fix, so the class and the behaviour it
exists for arrive in one reviewable change. The carousel's gutter VALUE is
already migrated; only the scroll behaviour is outstanding.

### What this gate proved

The convention's deciding test was that migration is **visually inert**, and it
was measured two independent ways rather than asserted: a computed-value census
over every census site in both themes (element box, content box and every
horizontal property — zero deltas, including on the renamed nodes matched by
DOM position rather than by selector), and **all 42 baselines byte-identical by
SHA-256** with the suite green at `threshold: 0`. That test was not runnable
before Gate 1 closed the per-pixel tolerance.

## The v1.5.0 component props (Gate 13)

### Both fixes are half-inert, and the halves must never be split

**THIS IS THE NOTE THAT STOPS A FUTURE SESSION SHIPPING DEAD CODE.** Each fix
has a half that changes nothing on its own and a half that does the work. Ship
the inert half alone and the change looks finished while doing nothing.

| Fix | Inert half | Effective half |
|---|---|---|
| **3b — nav width** | the gutter on `.mvp-shell__nav` | `barWidth='fill'` on `BottomNavigation` |
| **3c — tiles** | `sizing='fill'` at the pinned 375px | nothing, at 375px — see below |

**WHY THE NAV GUTTER IS INERT ALONE, measured not assumed.** A hug-width bar
centres itself in whatever box it is given. The bar is `4 items x 64 + 3 gaps x
16 + 2 x 16 padding = 336`, and it centred at `(375 - 336) / 2 = 19.5` from each
viewport edge. Add the gutter and it centres at `(343 - 336) / 2 = 3.5` inside a
343px content box — which is `3.5 + 16 = 19.5` from the viewport. The same
number. This was then confirmed by reverting `barWidth` alone and re-running:
`/more` came back **byte-identical** to its baseline, 0 differing pixels.

Only `barWidth='fill'` moves anything: `align-self` goes `auto` -> `stretch`,
the bar becomes the full 343px content width at a 16px inset, and the items
divide it — `(343 - 32 padding - 48 gaps) / 4 = 65.75` each, up from a fixed 64.
Item flex goes `0 1 auto` -> `1 1 0px`, which is the DS rule scoped inside the
fill modifier.

### The tile row cannot be verified at 375px

`sizing='fill'` on `CardFeaturesAndEducation` is REAL and it is INVISIBLE here.
Three tiles at their 109px cap plus two 8px gaps come to `3 x 109 + 2 x 8 = 343
= 375 - 32` — they already fill the content column exactly, by arithmetic
coincidence of this viewport. So the prop lands on the same three integers and
the visual suite cannot see it.

**PIXELS ARE THE WRONG INSTRUMENT FOR THIS PROP; DECLARATIONS ARE THE RIGHT
ONE.** What proves it took effect is that `mn-card-features--fill` is applied to
each tile and each tile's computed `max-width` moves `109px` -> `none`. The
rendered widths staying at 109 is the PREDICTION, not a failure. **A second
viewport is the only instrument that can see this** — that is what the 390px
gate is for.

### The MVP's flex override was removed, on measurement

`.mvp-home__feature-row > * { flex: 1 1 0 }` is gone. Once `sizing='fill'` is in
use the DS supplies `flex: 1 1 0` itself, and the MVP rule was an
equal-specificity override sitting on top of a prop whose whole purpose is to
let the DS own the geometry — invisible while the values agree, and a silent
mask over any future DS change.

Removal was PROVEN inert before it was kept: with the rule and without it, each
tile's computed `flex-grow`, `flex-shrink`, `flex-basis`, `max-width` and
rendered width were identical in both themes. Had they differed, the rule would
have stayed and the difference would have been a DS finding — the DS not
supplying what the prop claims — rather than something to paper over here.

### Two rasterisation artifacts, and they are NOT the same thing

Both are +/-1 per channel and both became visible only when Gate 1 set
`threshold: 0`. They are logged separately because measurement says they are
different: **one is on a gradient and deterministic; the other is on antialiased
edges and is not.**

**1. THE FAB RE-DITHERS WHEN THE NAV REPAINTS — deterministic, attributed.**
Widening the bar changes 806 pixels inside `.mvp-shell__fab`, at a maximum
channel delta of exactly 1 (histogram: `{1: 806}`), identically in both themes.
The FAB does not move — its box is byte-identical before and after. It is
`IconObject color="ai"`, whose `.mn-icon-object--ai` carries
`linear-gradient(132.61deg, ...)`; it and the nav are `position: fixed` siblings
sharing a composited layer whose size changed, so the gradient re-rasterises.
It is inseparable from fix 3b: the bar cannot widen without it. Attribution was
complete — every differing pixel fell inside `(bar + 28px shadow extent) U (FAB
box)`, with **zero pixels anywhere else**, and reverting `barWidth` alone
returned a byte-identical render.

**2. A PRE-EXISTING +/-1 FLAKE, NOT CAUSED BY THIS GATE.** Across four full-suite
runs on identical code, a handful of pixels moved between runs — 26 px on the
`.mvp-shell__theme-switch` Button (box `[16, 690, 60.5, 716]`) and 2 px on a
selected `.mn-tab` whose box starts at the fractional x **104.9**. Neither is
gradient-rendered (`background-image: none` on both); these are antialiased
borders, corners and glyphs at subpixel origins. **The same instability
reproduces on a clean tree at `mvp-gate12` with none of this gate's changes
applied** — there on `/finance/holding/*` dark screens, which have neither nav
nor FAB. So Gate 1 EXPOSED this; it did not create it. At `threshold: 0.2` a
+/-1 delta was absorbed as noise.

**MEASURED AND CLOSED AT GATE 17 — see "The raster flake" below.** The rate is
**22.5% of browser processes** on the worst state, the cause is Chromium's
partial raster, and the fix is one launch flag. The paragraph that used to sit
here said no rate had been measured; that is no longer true.

**THE HYPOTHESIS THAT THEY SHARE A ROOT CAUSE WAS TESTED AND CONTRADICTED.** If
both artifacts sat on gradient-rendered elements they would likely be one
finding. They do not: the FAB is a `linear-gradient`, while both flake sites
report `background-image: none` and are antialiased edges. Same +/-1 magnitude,
different mechanism, different determinism.

### Open question for the design system

`IconObject color="ai"` paints a CSS `linear-gradient` on a `position: fixed`
element. Its rasterisation is not stable against a sibling fixed element
repainting — a size change in the shared composited layer shifts the gradient by
+/-1 per channel. Worth asking whether the "ai" treatment should be rendered in a
way that is stable under sibling repaints. Logged from the MVP side; not a
defect this repo can fix, and not blocking.

## The nav scrim and the carousel inset (Gate 14)

### The scrim: which element was actually opaque

`.mvp-shell__nav` was an opaque band that guillotined content scrolling
beneath it. It now paints `var(--mapped-gradient-subtle)` with
`--gradient-surface` overridden to `--mapped-surface-subtlest-default` — see
the scrim rule above for why the override is mandatory rather than a taste
call.

**THE DS COMPONENT WAS MEASURED, NOT ASSUMED, AND IT PAINTS NOTHING.**
`.mn-bottom-nav` has no `background` declaration at all
(`BottomNavigation.css:1-10`), and its own comment at `:8` records that
Figma's gradient overlay is deliberately omitted. Confirmed three further
ways: computed `rgba(0, 0, 0, 0)` in the MVP in both themes; the same in the
DS showcase independently of the MVP container; and a controlled experiment
that nulled each background in turn — `.mvp-shell__nav` moved ~3,800 band
pixels, `.mn-bottom-nav` moved **0** in light. That last one doubles as the
noise floor: nulling an already-transparent background is a no-op, so its 3
dark pixels bound the measurement error and prove the pill's 3 dark pixels
are noise too.

**THE DS OMISSION IS AN ABSENCE, NOT A DEFECT.** The scrim belongs to the
consumer because only the consumer knows which surface its screens sit on.
Do not file it as a DS bug; the open question above is the useful version.

**THE PILL STAYS OPAQUE.** `.mn-bottom-nav__bar` keeps its own
`--mapped-surface-page` background. Only the section band fades. If a future
change makes the pill translucent, the nav stops reading as a floating
control.

### `.mvp-column--bleed`: why the scroll half is inseparable

A full-bleed box still owns the content column — it just carries it as
padding rather than as an outer edge. `.mvp-column--bleed` is that variant,
and it is `padding-right` + `padding-left` + **`scroll-padding-left`**.

**THE PADDING ALONE IS DECLARED BUT NEVER PAINTED.** On a scroll container
whose children carry `scroll-snap-align: start`, the snapport defaults to the
scrollport, so a snapped child aligns to the padding-box edge and eats the
inset. Measured on the Smart Insights carousel before the fix: `scrollLeft`
settled at 16 with the first card at viewport **x=0**, and forcing
`scrollLeft = 0` re-snapped it straight back to 16. After: `scrollLeft` 0,
first card at **x=16**, and forcing 0 holds. `scroll-padding-left` insets the
snapport so the declared gutter survives a snap.

**A `padding` SHORTHAND ON THE ADOPTING ELEMENT WOULD SILENTLY UNDO IT.** The
class supplies longhands; a shorthand on the element is equal specificity and
later in source order, so it wins and collapses the gutter. The carousel
therefore keeps only `padding-bottom` of its own.

That is why the class was deferred out of Gate 12 rather than declared early:
its reason for existing is the scroll half, and the scroll half changes
pixels. Declaring it in an inert gate would have shipped dead CSS.

### The four layout fixes are closed. What is still open.

Fixes 3b, 3c (Gate 13) and 4, 5 (this gate) are all landed. Two things
deliberately remain:

- **The quick-action tile row is still unverifiable at 375px.** `sizing='fill'`
  is real but invisible here, because three 109px tiles plus two 8px gaps
  already fill the 343px column exactly. Only a second viewport can see it.
- **The frame max-width is still deferred.** No token backs ~430px; it falls
  between `--brand-scale-1700` (256px) and `-1800` (512px). Capping the frame
  also re-anchors the fixed chrome, which is its own measurable consequence.

## The scrim runway (Gate 15)

`.mvp-shell__scrim` is a `position: fixed` layer, full width, anchored to the
bottom, `height: var(--brand-scale-1700)` (256px), `z-index: 1` against the
nav's 2, `pointer-events: none`. It carries the scrim; `.mvp-shell__nav`
now paints nothing at all.

**WHY THE NAV STOPPED PAINTING IT.** Gate 14 put the gradient on the nav
itself, which was correct in colour and wrong in geometry: the band is 99px,
the pill covers 64 of them, and the fade only reached ~9% before content hit
the pill. Gate 14's paint proof did not catch this because it sampled the
band at x=6, in the left margin — where the pill's 24px shadow reaches and no
content ever passes. **That sample could not distinguish a working scrim from
an opaque band painted in the surface colour, and it was reported as proof.**
The lesson is in the scrim rule above: sample where content actually is.

**WHY 256px AND NOT A ROUND NUMBER.** Derived twice, independently, landing on
the same ramp step. By alpha: `(H - 90) / H` gives 65% at the pill's top edge,
against 30% at `--brand-scale-1600` and 83% at `-1800` (which would start the
fade above the screen's midpoint). By contrast: the worst-case content behind
the band measures max |S - B| = 249 light / 236 dark, and 256 is the smallest
ramp step exceeding both. It is a real token, so no `token-exempt` is needed.

**THE BOX OF `.mvp-shell__nav` IS UNCHANGED AND MUST STAY THAT WAY.** It has
been `[0, 713, 375, 812]` since Gate 13, along with the bar `[16, 723, 359,
787]`, the home indicator and the 65.75px items. Growing it to give the
gradient room would have changed hit-testing; that is the whole reason the
scrim is a separate layer.

**THE 128px BOTTOM RESERVE ON `.mvp-shell__main` IS NOT PART OF THIS.** It
holds the lowest content 52.9px clear of the band at rest, which is why the
resting state shows no fade — there is nothing behind the band to dissolve.
That is deliberate (Flow 1 C2: without it the last row sits under the nav with
nowhere to scroll) and changing it carries a reachability risk. It is a
separate concern and it is not what made the band read as opaque.

### Figma divergence, deliberate

`navbar/mobile/section` is 92px tall with `Navbar/mobile` at y=5 — **5px** of
runway, LESS than the 10px this app had before the fix. The file's own
geometry cannot produce the dissolve its own gradient implies, so matching it
more faithfully would make the effect worse, not better. The gradient's SHAPE
is honoured exactly (`0deg`, opaque at the bottom stop, transparent at the
top); only the height it is given diverges.

### Open question for the design system

Should `navbar/mobile/section` specify a taller scrim region than the 92px
nav band — or should the scrim be a separate layer in the file too, as it now
is in code? As drawn, the gradient cannot achieve its evident intent at the
size it is given. Logged from the MVP side; do not act on it from this repo.

## The raster flake — measured and closed (Gate 17)

**THE CAUSE IS CHROMIUM'S PARTIAL RASTER, AND THE FIX IS ONE LAUNCH FLAG.**
`playwright.config.ts` passes `--disable-partial-raster` in `use.launchOptions`.

Partial raster re-rasterises only the invalidated region of a tile and reuses
the rest. Whether a given repaint takes the partial or the full path depends on
invalidation history, and that varies BETWEEN BROWSER PROCESSES. An antialiased
edge rastered by the two paths rounds to different coverage — which is exactly
a +/-1 per channel difference on identical geometry.

It also explains the shape of the thing. The theme toggle click invalidates the
Button's colours, which is what gives partial raster something to do — so the
flake appeared on DARK states (reached by clicking) and never on the light
control, which needs no click. The `.mn-btn` border is antialiased
(`border-radius: var(--brand-scale-200)`) and its right edge sits at the
fractional x **60.5**, which is where AA rounding is visible.

### The measurement, and why the method mattered

**A FRESH BROWSER PROCESS PER SAMPLE IS THE WHOLE EXPERIMENT.** The first probe
reused one browser across 20 iterations and reproduced NOTHING — 0 of 20. The
render is stable WITHIN a process and bimodal ACROSS processes, so any probe
that reuses a browser measures the wrong thing and reports a clean bill of
health. Re-running with `chromium.launch()` per iteration reproduced it
immediately.

**THE HONEST METRIC IS THE POPULATION SPLIT, NOT "DIFFERS FROM THE FIRST
CAPTURE".** The render is bimodal: two hashes, always the same two. Measuring
each sample against sample #0 makes the rate depend on which population sample
#0 landed in, which is how a first pass here produced 22.5% / 30% / 60% for
configurations that were barely different. Count instead how many samples match
the COMMITTED BASELINE — that is the rate the suite actually experiences.

**RATES, n=40 fresh processes each, `/finance/holding/fd` dark:**

| configuration | render populations | mismatching the baseline |
|---|---|---|
| default | 2 | **22.5%** |
| + finish all animations | 2 | 30.0% |
| + inject `transition: none` at capture | 2 | 60.0% |
| `--disable-gpu` | 2 | 17.5% |
| **`--disable-partial-raster`** | **1** | **0%** (40/40) |

After the fix, all four probed states report a single render population and
20/20 matching their committed baseline.

**PROBE AND SUITE ARE DIFFERENT INSTRUMENTS AND THEIR NUMBERS MUST NOT BE
POOLED.** `toHaveScreenshot` re-screenshots until two consecutive captures
agree before comparing; a single-shot probe does not. The retry gives no
protection here — the render is stable within a process, so both captures agree
with each other and with the wrong population. That is why the flake reached the
suite at all.

### Hypotheses that were REFUTED — do not re-investigate these

These cost the most to test and are the most tempting to try again:

- **Unsettled transitions.** Both flake sites carry one (`Button.css:12`,
  `Tab.css:13`, both `0.12s`), and 20 of 20 samples had transitions in flight at
  capture, so the correlation looked compelling. But explicitly calling
  `getAnimations().forEach(a => a.finish())` before capture did NOT eliminate it
  (still 2 populations), and injecting `transition: none !important` at capture
  made it **worse** (60%). Transitions supply the invalidation; they are not the
  nondeterminism.
- **Fractional box geometry.** The box was identical in both populations —
  `[16, 690, 60.5, 716]`, width 44.5, to four decimal places. The fractional
  edge is WHERE the difference shows, not WHY it happens.
- **Font rasterisation.** Same font, same size, same weight, `document.fonts`
  loaded with 9 faces in both populations, and the differing pixels sit on the
  border and corner arc rather than on glyph strokes. Adding
  `--disable-lcd-text` INTRODUCED a second population of its own, alone and
  combined with `--disable-gpu` — **more flags is not safer**.

### Why the fix lives in the harness

It changes how the app is MEASURED, never how it renders for a user. No app CSS
was touched, no geometry moved, and **no tolerance was widened** — `threshold`,
`maxDiffPixels` and `maxDiffPixelRatio` all remain 0, which is the whole point
of the Gate 1 work and is not negotiable. Nudging the 60.5 edge to 61 would have
been a design change wearing a test fix's clothes.

### The fix has three costs. Write them down before trusting it.

**1 · THE BASELINES ARE NOW MINTED UNDER A RASTERISATION NO USER'S BROWSER
USES.** `--disable-partial-raster` is a browser launch flag, so it pins the
raster path for the HARNESS only. Nothing about the app changed, and nothing
about what a real browser paints changed. But the reference PNGs are now the
full-raster rendering, and a real browser using partial raster will differ from
them by a few pixels on antialiased edges.

That is acceptable — **a reference render is a reference, not a claim about
production** — but it must be written down, because the failure mode is a
future session opening a baseline next to a real browser, finding a ~6px
discrepancy, and concluding something regressed. It did not. Compare baselines
against the harness, never against a hand-driven browser.

**2 · TWO BASELINES WERE RE-MINTED, AND THEY ARE NOW A TRIPWIRE.**
`finance-holding-fd-light` and `finance-holding-main-light` were **stable
before the fix** — measured, 40/40 matching their baselines across fresh
processes — and the flag shifted them by 6 px each at delta 1, on the
theme-switch button's antialiased bottom edge (bbox `{21, 52, 714, 715}`).
Proven by control through the shipped path, not by correlation: with the flag
reverted those two tests PASS, with it re-applied they FAIL with exactly that
delta, repeatably.

Because they were re-minted UNDER the flag, they now fail deterministically if
the flag ever stops taking effect. That is a loud canary, and a better one than
the flake it replaced.

**3 · THE FLAG CAN BE SILENTLY DROPPED BY A CHROMIUM UPGRADE.** Two different
durability questions, with different answers:

- **The Playwright side is type-checked.** It is passed as
  `use.launchOptions.args` in `playwright.config.ts`, and that file IS covered
  by `tsconfig.e2e.json`, which `npx tsc -b --force` builds. A Playwright API
  rename would fail gate 1. (Do not check this with `tsconfig.node.json` — that
  project includes only `vite.config.ts`.)
- **The Chromium side is not.** Command-line switches are not a stable API, and
  Chromium IGNORES UNKNOWN SWITCHES SILENTLY. Playwright bundles its own
  Chromium, so a Playwright upgrade is also a Chromium upgrade. If
  `--disable-partial-raster` is removed upstream, nothing errors.

What would surface it: the two re-minted baselines above start failing on every
run, and the +/-1 flake returns at ~22.5% on the dark states. Both signatures
are documented here, so the symptom is diagnosable rather than mysterious.
Recorded at the time of the fix: Playwright **1.62.1**, bundled Chromium
**151.0.7922.34** (revision 1234).

### Logged, not acted on

- **The JS bundle is 5.75 MB** (3.78 MB gzipped), driven by the DS
  `dist/index.js` at 5.59 MB — most likely the 101 icons bundled rather than
  tree-shaken. Worth a DS-side look; not an MVP fix.
- **`npm run dev` leaves orphaned Vite servers — THREE of the last four gate
  pre-flights.** DS on 5173 at Gate 4; MVP on 5174 at Gate 16; MVP on 5174 at
  the second-viewport archaeology (pid 22200, started **17:49:03, 46 seconds
  after** the reflog's `checkout: moving from main to
  phase/gate17-harness-flake`). That last one is traceable rather than
  mysterious: it was **Gate 17's own dev server outliving Gate 17**. This is
  not bad luck, it is what a gate does by default.

  **THE MECHANISM, AND WHY IT DECIDES THE CHECK.** The npm wrapper exits and the
  `vite` child SURVIVES, re-parented onto a bare `cmd.exe` shim. Nothing in the
  process tree then links it back to the session that started it — walking its
  parents finds a stub, or a pid that is already gone. **So a PORT check catches
  these and a process-tree check does not.** Check 5173 and 5174 at pre-flight,
  and **stop your own server at close** — that second half is what breaks the
  chain, and skipping it is how the next gate inherits one.

## The second viewport (Gate A)

**THE SUITE NOW CAPTURES EVERY BASELINE AT TWO WIDTHS, 375 AND 430**, both at
height 812. `VIEWPORTS` in `e2e/harness.ts` is the list, and it is a PEER OF
`THEMES`, not a member of `WALK`.

### Why the viewport is a peer axis and not part of `WALK`

**FOLDING IT INTO `WALK` IS THE OBVIOUS DESIGN AND IT IS THE WRONG ONE.**
Someone will propose it, because `WALK` is already the list of things the suite
visits and a viewport looks like one more dimension of that. The problem is
that `WALK` has three consumers, and two of them have nothing to say about
width: `routes.spec.ts` (43 tests) and `section-headers.spec.ts` (44) would
have doubled along with `visual.spec.ts`. Measured on the derivation: the suite
would go to **264 tests** instead of **174**, and the extra 90 would re-assert
console cleanliness and header token bindings at a width that cannot change
either.

As a peer axis only `visual.spec.ts` iterates it. Confirmed on disk after the
change: `routes.spec.ts` 43 and `section-headers.spec.ts` 44, both unchanged,
with `visual.spec.ts` going 42 -> 84.

### ONE Playwright project. Not two.

A second project is the other obvious design, and it looks free: Playwright
decorates the baseline filename with the project name, so the two sets would
not collide without anyone writing naming code.

**IT BREAKS THE BASELINE GUARD, AND THE MECHANISM IS MEASURED.** A spec with no
project filter runs ONCE PER PROJECT — verified by running a two-project config
over a probe spec — and `testInfo.snapshotPath` resolves only the RUNNING
project's decoration: `index-light-chromium-win32.png` under project
`chromium`, `index-light-chromium-430-win32.png` under project `chromium-430`.
So `baselines.spec.ts` would run twice, each run deriving 42 expected names
against 84 files on disk, and each would report the other project's 42 as
orphans. Both runs fail, 84 orphan reports, on a correct tree.

With one project that failure mode cannot arise, which is why it needed no fix
and no proof beyond not choosing it.

### The naming scheme

`stateSlug(state, viewport)` appends the width LAST, so the Gate 9 state name
survives intact as a prefix:

```
index-375-light-chromium-win32.png
index-crypto-430-dark-chromium-win32.png
finance-holding-wallet-marg-375-light-chromium-win32.png
```

**A BASELINE FILENAME IS SELF-DESCRIBING BY DESIGN.** Route, tab, width, theme,
browser and platform are all readable without opening a config file. That is
the concrete advantage over encoding the width in a Playwright project name,
where the reader has to go and find out what `chromium-430` was configured to
mean.

### The honesty guard is parameterised and MUST NOT become a range

`assertHarnessIsHonest(page, expectedWidth)` took a hardcoded 375 and was the
first hard blocker on a second viewport, because it runs on every walk state.

**IT WAS NOT SOFTENED TO A RANGE OR A TOLERANCE, AND IT NEVER MAY BE.** The
reason it is an exact equality is that a range would have accepted the
uncontrolled `devicePixelRatio` the guard exists to catch — the same trap as
`threshold: 0.2` looking like a tolerance while actually being a blindfold.

**THE EXPECTED WIDTH COMES FROM THE SAME OBJECT THAT SET THE VIEWPORT**, which
is what makes drift impossible rather than merely unlikely:

- `visual.spec.ts` holds one `viewport` per describe block and passes it BOTH
  to `test.use({ viewport })` and to `assertHarnessIsHonest(page, 
  viewport.width)`. One variable, one closure — there is no second literal that
  could fall out of step.
- Callers that set no viewport default to `DEFAULT_VIEWPORT.width`, and
  `playwright.config.ts` **imports** `DEFAULT_VIEWPORT` and
  `DEVICE_SCALE_FACTOR` from `e2e/harness.ts` for its own `use` block. The
  config no longer spells `375` or `2` at all.

That import is the load-bearing half. Without it the config and the guard would
hold two literals that agree today, which is the shape of every drift this
project has been bitten by.

### Why 430, and why NOT a viewport at or above 768

Figma authors this app **exclusively at 375** — MCP-verified, there is no 390
frame anywhere in the file — and the DS ships **exactly one breakpoint**,
`@media (min-width: 768px)`. So the width axis has two regimes and every width
from 376 to 767 exercises the same facts. 390 buys nothing 430 does not.

430 wins on two counts 390 cannot match:

1. **It is the proposed frame width.** When the frame cap lands there is
   already a baseline at exactly the width where the cap engages.
2. **It keeps the carousel overflowing.** Measured: the Smart Insights
   scroller is scrollWidth 543 against clientWidth 375 / 390 / 430 — but at
   768 it is **768 against 768**. It fits, the snap goes inert, and
   `scroll-padding-left` is never exercised. **A viewport at or above 768 would
   SILENTLY STOP COVERING Gate 14's fix**, which is the opposite of what
   adding coverage is for.

430 also makes fix 3c visible for the first time. At 375 three tiles cap at
109px and already fill the 343px column exactly — an arithmetic accident of
that viewport — so `sizing='fill'` lands on the same three integers. At 430
they render 127.33 / 127.34 / 127.33.

### Minting new baselines is a TWO-PARTY act, by design

**THE BASELINE GUARD CANNOT GO GREEN ON A RENAME OR AN ADDITION UNTIL A HUMAN
STAGES IT.** Arms 1 and 2 compare the snapshot directory against the GIT INDEX,
so with 42 files renamed and 42 added but nothing staged, arm 1 sees 84
untracked and arm 2 sees 42 tracked-but-missing. The suite reports **2 failed /
172 passed** and that is CORRECT, not a defect.

This is the first gate to add baseline FILES since the guard existed — Gate 13
re-minted 22, but those were modifications to already-tracked paths, so both
lists still agreed. Do not read the 2 failures as a regression, and do not
"fix" them by relaxing the guard: "a baseline git does not track is a baseline
nobody reviewed" is the whole point, and the review is the human's.

### What it costs — measured, over ten clean runs

| | before Gate A | after |
|---|---|---|
| visual baselines | 42 | **84** |
| suite tests | 132 | **174** |
| suite wall-clock | 236 s | **350 s mean** (range 320-395) |

**THE MARGINAL COST OF A BASELINE IS 2.7 s, NOT THE 1.9 s THE ARCHAEOLOGY
PROJECTED.** Derived rather than transcribed: (350 - 236) / 42 = 2.71 s per
added baseline. The archaeology timed `visual.spec.ts` alone at 1.93 s per
baseline at 375 only. The gap is not measurement error — **a 430-wide full-page
screenshot is a bigger image**, so it costs more to capture, encode and compare
than a 375 one. Use 2.7 s when costing a future viewport, and expect it to rise
again with width.

The five-run standard inherited from Gate 17 therefore costs **~29 minutes**,
still inside the hour. A THIRD baseline viewport would take the suite to 216
tests and the standard past 37 minutes — and per the carousel measurement above
it would have to sit below 768 to be worth having, where it would re-measure a
regime 430 already covers. If the frame cap needs proving above 430, do it with
computed-value assertions at one wide viewport, not with 42 more screenshots.

### One unattributed outlier, recorded because it was not explained

**ELEVEN RUNS OF THE 174-TEST SUITE WERE MADE AT THIS GATE. TEN WERE
IDENTICAL** — 172 passed / 2 failed (the unstaged-baseline arms), zero pixel
diffs, zero timeouts, 320-395 s. **ONE WAS NOT: 846 s and 5 failed**, i.e.
three failures beyond the two guard arms. It was the first run of the first
batch and it has not recurred in ten subsequent runs.

**ITS EVIDENCE WAS DESTROYED BY THE INSTRUMENT, WHICH IS THE REAL LESSON.**
The probe kept only greps of each run and discarded the output, and its
failing-name grep matched `baselines|visual` only — so three failures in
`routes.spec.ts` or `section-headers.spec.ts` were counted but never named. A
probe that discards the artifact cannot characterise what it caught. Keep the
full log per run.

**ONE HYPOTHESIS WAS TESTED AND REFUTED — do not re-run it.** Vite's dependency
cache was rebuilt at 23:48 during that window, and `routes.spec.ts` fails on any
response >= 400 with only `/favicon.ico` allowlisted — so a Vite `504 Outdated
Optimize Dep` mid-run looked like a clean explanation. Deleting
`node_modules/.vite` and re-running reproduced NOTHING: 331 s, 2 failed, zero
error signatures, and Vite rebuilt the whole cache in **4 seconds**. Far too
fast to cost 500 s. The cold-cache story is wrong.

What remains likely is host contention rather than anything in this repo — 846 s
against a 350 s mean is a 2.4x slowdown across the whole run, which is the shape
of the machine being busy, not of a rendering defect. **Stated as unresolved
rather than closed.** If it recurs, the full logs will now exist to name it.

## The token guardrail's `@media` allowance (Gate 18)

**A RAW PX IS LEGITIMATE INSIDE A MEDIA CONDITION, AND NOWHERE ELSE ON THE
LINE.** `scripts/check-tokens.mjs`'s `raw-px` rule permits a literal in the one
place CSS leaves no alternative: **custom properties are INVALID in a media
condition.** `@media (min-width: var(--brand-scale-1800))` does not work in any
browser, so a breakpoint has to be written as a literal.

**DO NOT "FIX" THAT ALLOWANCE AWAY.** Deleting it would make the linter fail on
the first breakpoint this app ships, and a linter that blocks correct CSS gets
disabled rather than corrected. The allowance is right; only its SCOPE was wrong.

### What passes and what does not

The allowance is now MATCH-scoped: a `px` is allowed if it sits between `@media`
and the `{` that opens its block. Past that brace it is a declaration and gets
no allowance.

```css
/* ALLOWED - the literal is in the condition, where no token can go */
@media (min-width: 768px) {
  .frame { max-width: var(--brand-scale-1800); }
}

/* FLAGGED - 430px is a declaration, and it is flagged whether or not it
   shares a line with the @media that contains it */
@media (min-width: 768px) { .frame { max-width: 430px; } }
```

So the frame max-width, when it comes, still needs a real token or an explicit
`token-exempt: <reason>` marker. **It cannot be smuggled in by putting it on the
same line as a breakpoint**, which is exactly what it could have done before
this gate.

### The bug was the scope, and it had no victims yet

The allowance was LINE-scoped — `allowLine: (line) => /@media/.test(line)` — so
it skipped every rule-match on any physical line containing the text `@media`.
A single-line media query therefore carried a raw declaration through **with no
`token-exempt` marker and no report**, while the identical declaration written
on its own line was flagged.

There were **zero `@media` declarations anywhere in `src/`** when this was
closed, so nothing regressed: the real-tree lint output was **byte-identical**
before and after — 39 files, PASS, zero violations, zero exemptions — and all
42 baselines were unchanged by SHA-256 and by git independently.

**PROVEN BY FIXTURE AGAINST THE REAL SCRIPT, NOT BY READING THE REGEX.** Both
the old and the new script were run over one byte-identical seven-case fixture
in a scratchpad. Only two cases moved, and both moved from escaped to flagged:

| case | old | new |
|---|---|---|
| A - multi-line `@media`, px in the condition | allowed | allowed |
| **B - single-line `@media { ... 430px ... }`** | **ESCAPED** | **flagged 6:45** |
| C - px with no media query | flagged 8:17 | flagged 8:17 |
| D - `@media` only inside a comment | flagged 10:17 | flagged 10:17 |
| E - single-line `@media`, condition only | allowed | allowed |
| **F - px in BOTH condition and declaration** | **ESCAPED** | **flagged 16:45** |
| G - case B plus `token-exempt:` | exempt | exempt |

Case F is the one that proves the SCOPE rather than the outcome: on
`@media (min-width: 900px) { .f { max-width: 430px; } }` the reported column is
**45**, which is the `430px` at index 44 — past the brace at index 26 — while
the condition's `900px` at column 20 is not reported at all. One line, one
allowed literal, one flagged literal.

### No other rule carries this shape — enumerated, not assumed

`allowLine` existed in exactly one rule and one call site, and it is now gone
entirely. The other three rules were checked for the same bug and do not have
it:

| rule | allowance | scope |
|---|---|---|
| `raw-hex-color` | none | - |
| `raw-color-function` | none | - |
| `raw-px` | `0px`, and the media condition | **match** |
| `raw-font` | `var()` / `inherit` / `unset` / `initial` / `revert` | match |

**`token-exempt` BEHAVIOUR IS UNCHANGED AND MUST STAY THAT WAY.** It is read
from the **raw** line (comment-stripping would erase it) and it suppresses
**every** rule on that line, not just `raw-px`. The fix did not touch it, and
fixture case G confirms it still fires on a line the fix newly flags.

One thing deliberately NOT widened: the allowance covers `@media` only.
`@container` and `@supports` conditions have the same CSS limitation and would
be flagged today. Neither appears in `src/`; widen it when one actually does,
with a fixture, rather than pre-emptively.

## Known conditions of this setup

Everything below was established and verified during Phase 4. None of it is
obvious from reading the code, and each item has a silent failure mode. Do not
rediscover these the hard way.

### The DS folder is literally named `Design system test`

Not `Monarch-Design-System`. That name exists only as the GitHub remote. The
alias in `vite.config.ts` hardcodes the real local name, by explicit decision —
no multi-path probe, no fallback search.

### Two resolution paths, and the one command that exercises the second

**THE SAME SPECIFIER RESOLVES TO DIFFERENT FILES DEPENDING ON WHETHER A
FOLDER EXISTS.** `vite.config.ts` sets
`DS_LOCAL = !process.env.MONARCH_DS_FROM_PACKAGE && fs.existsSync(DS_SRC)`,
evaluated once at config load. `defineConfig` is given a plain object — there
is no `mode`/`command` branch, and the condition is not about dev vs build.

| | `@monarch/design-system` | `…/styles.css` |
|---|---|---|
| **alias active** (folder present) | `../Design system test/src` | `…/src/styles/package.css` |
| **package path** (folder absent, or override set) | `dist/index.js` via `exports` | `dist/index.css` via `exports` |

Those are the only two specifiers the MVP uses to reach the DS, and both have
an `exports` entry, so neither is a local-only build. Verified at Gate 16.

**WHY THE ALIAS EXISTS AT ALL — do not "simplify" it away.** Editing a token
in the DS and watching this app hot-reload IS the DS iteration loop. Resolving
to the built package would mean a DS rebuild plus a reinstall per change.
Speed here is the whole reason the two-repo split is workable.

**THE COST: THE LOCAL BUILD IS NOT THE SHIPPED BUILD.** Proven by sourcemap,
twice. A default `npm run build` draws **169 of 210** sources from the DS
working tree and **zero** from `node_modules/@monarch`. On Vercel the sibling
folder does not exist, so production compiles the pinned `dist` instead.

**SO EXERCISE THE PRODUCTION PATH BEFORE TRUSTING A DEPLOY:**

```
npm run build:package
```

That forces `MONARCH_DS_FROM_PACKAGE=1`, which flips the alias off even though
the folder is present. Measured at Gate 16: **0** sources from the working
tree, and the DS arriving as one pre-bundled `dist/index.js`. With the
variable unset, `npm run dev` and `npm run build` are byte-for-byte the
behaviour they always had.

**THE TWO BUILDS EMIT THE SAME CSS IN A DIFFERENT ORDER, AND THAT IS FINE —
BUT ONLY BECAUSE IT WAS MEASURED.** The emitted stylesheets are the same size
(158,397 bytes), carry the same 589 classes and the same 541 custom
properties, and hold every v1.5.0 and scrim marker in equal counts — but they
are NOT byte-identical, because rule order differs: source mode follows
`package.css`'s hand-maintained `@import` list, dist mode follows the DS lib
build's import graph. Order decides ties between equal-specificity rules, so
it could have changed rendering. It does not: **all 42 walk states render
byte-identically across the two builds**, compared through `vite preview` on
both outputs under the harness pins. Re-run that comparison if the DS ever
restructures its CSS entry points.

### The linkage guard — `npm run lint:linkage`

`scripts/check-ds-linkage.mjs` fails when the four things that must agree do
not. It exists because none of these states announces itself, and each has
happened here:

| Failure id | What it means | What to do |
|---|---|---|
| `pin-vs-installed` | the manifest pins one version, `node_modules` holds another — the `npm install` no-op | re-install BY NAME (below), then verify the dist |
| `ds-worktree-vs-pin` | the DS checkout is at a different tag than the pin — **this is what you are actually rendering**, since Vite compiles the working tree | `git checkout <pin>` in the DS, or re-pin deliberately |
| `lock-resolved-vs-pin` | the lock's spec moved but its `resolved` SHA did not — a half-updated lock | re-install by name; never commit the half-updated state |
| `lock-spec-vs-pin` / `lock-version-vs-pin` | the lock disagrees with the manifest | re-install by name |

The re-install that actually works, because plain `npm install` has reported
"up to date" and changed nothing twice:

```
npm install @monarch/design-system@github:TekuBrah/Monarch-Design-System#v1.5.0
```

**IT DOES NOT FAIL WHEN THE DS FOLDER IS ABSENT.** That is the normal CI
state, not an error: the working-tree checks are reported as skipped and the
manifest/lockfile/`node_modules` checks still run. A guard that fails in CI
gets disabled, which is worse than no guard. Both halves were proven by
construction at Gate 16 — absent folder alone passes; absent folder plus a
genuine version drift still fails.

**WIRED AS A `pre` HOOK ON BOTH SUITE SCRIPTS**, `pretest:e2e` and
`pretest:e2e:update`, as well as standalone. The historical failure was not a
red suite — it was a GREEN one, run against a linkage nobody had checked, with
20 stale baselines. Blocking the suite is the point; blocking a re-mint
doubly so.

### `tsc` and Vite resolve the specifier differently in local-alias mode

- **Vite** → DS **source**, served as `/@fs/D:/Claude/Design system test/src/index.ts`
- **TypeScript** → the **pinned dist types** in
  `node_modules/@monarch/design-system/dist/index.d.ts`

Both re-verified at the content-column Gate 1: `tsc --traceResolution` reports
`Package ID '…/dist/index.d.ts@1.5.0'`, and the dev server serves
`/@fs/…/Design system test/src/index.ts` — no `paths` mapping exists in either
tsconfig, and no served module references `node_modules/@monarch` at all.

**THEY BOTH READ v1.5.0 TODAY. STATE THE MECHANISM, NOT THE NUMBER** — an
earlier revision of this file recorded "both are v1.0.0", which was two releases
stale by the time anyone read it. The number rots; the mechanism does not:

- Vite reads the DS **working tree**, whatever is checked out in
  `../Design system test` right now. No install, no rebuild.
- `tsc` reads **`node_modules`**, whatever `package.json` pins and `npm` has
  actually materialised.

So the two agree only while **the pin matches the DS checkout**, and either side
can drift alone: `git checkout` in the DS moves Vite and not `tsc`; editing the
pin moves `tsc` and not Vite. **Check the pin against the DS's `HEAD` rather than
trusting this paragraph's version number.**

While they disagree, the MVP compiles against stale types and renders new source.
Harmless for CSS/token changes; a **type** change is what bites. Gate 1 hit
exactly that: `barWidth` and `sizing` rendered correctly through the alias while
`tsc` could not see them, because the dist was still v1.4.0.

**`npm install` SILENTLY NO-OPS ON A GIT-TAG RE-PIN.** Measured twice at Gate 1:
editing the tag in `package.json` and running `npm install` reported "up to date"
in 2s and 875ms and changed nothing, because the lockfile entry still carried an
explicit `resolved` commit SHA and npm considered the tree satisfying. It updated
the lock's *spec* line but not its *resolution* line — a half-updated lock that
must not be committed. The fix that worked was naming the package explicitly:
`npm install @monarch/design-system@github:TekuBrah/Monarch-Design-System#vX.Y.Z`,
which reported "changed 1 package". **Never trust npm's output here — verify by
grepping `node_modules/.../dist` for something only the new version contains.**

If the split ever needs closing, the fix is a `paths` entry in
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

### The visual net had a per-pixel tolerance — CLOSED at content-column Gate 1

**WHAT THE INSTRUMENT CLAIMED.** `playwright.config.ts` set `maxDiffPixels: 0`
and `maxDiffPixelRatio: 0` under the comment *"A single changed pixel is a
finding, not noise."*

**WHAT IT ACTUALLY DID.** Those two settings bound how many pixels may be counted
as different. They do not decide **what counts as different** — `threshold` does,
and it was never set, so Playwright's default of **0.2** applied. pixelmatch only
counts a pixel once its YIQ delta exceeds `35215 * threshold * threshold`, i.e.
**1408.6** at the default (`playwright-core/lib/coreBundle.js:6659` for the
formula, `:7551` for `threshold: options.threshold ?? 0.2`). Any colour shift
under that bar was invisible, on any number of pixels.

**WHAT IT COST.** The whole DS v1.5.0 dark token shift. **20 of the 42 committed
baselines were stale against what the dev server rendered, and the suite reported
132 passed.** Ground truth at the time: the committed `index-dark` baseline held
the balance-card switch label at `rgb(3,88,204)` (`--alias-primary-600`, the
v1.4.0 mapping) where the live render painted `rgb(4,110,255)`
(`--alias-primary-500`, the v1.5.0 mapping).

**WHAT PROVES IT IS NOW TRUE.** `threshold: 0` is set explicitly. With it, the
same unchanged tree that reported 132 passed reported **20 failed / 112 passed**,
and the failing set was exactly the 20 dark baselines — **zero light**, and
`steward-dark` correctly clean because `/steward` is the one walked route that is
both `nav: 'suppressed'` and a `ComingSoon` body, so it paints no changed token.
Attribution was then proven exhaustively rather than sampled: every differing
pixel on all 20 was shown to fall inside an element binding a declaration that
changed between DS v1.4.0 and v1.5.0 — **100% coverage, 0 orphan pixels**.

**THE RULE THIS LEAVES.** Three settings, not two, and none of them may be
loosened to make a red suite green. If a baseline diff is real, re-mint it
deliberately; if it is not, the change that caused it is the bug.

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
**430px**, and **there is no token for it** — but not for the reason this file
used to give. An earlier revision claimed the `--brand-scale` ramp "tops out at
**96px**". It does not. Re-read from the DS's `globals.css` at the content-column
Gate 1, the ramp runs to **512px**:

```
--brand-scale-1500:  96px      <- what was mistaken for the ceiling
--brand-scale-1600: 128px
--brand-scale-1700: 256px
--brand-scale-1800: 512px      <- the actual ceiling
```

**THE CONCLUSION SURVIVES, THE REASON DID NOT.** 430 is not above the ramp; it
falls **between steps 1700 and 1800**, and `430px` appears nowhere in the DS
(grep: zero matches). So there is still no token, and writing a raw `430px` would
still violate rule 2 — but anyone re-deriving this from the old "96px" claim would
have concluded the ramp was an order of magnitude too small and designed around a
gap that is not there. Curve-fitting it out of `calc()` on unrelated scale steps
remains explicitly banned by the DS's token-gap protocol (that pattern was
rejected there once already).

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
npm run lint:linkage
npm run test:e2e
```

`lint:linkage` also runs automatically before `test:e2e` and
`test:e2e:update`. Before a deploy, add `npm run build:package` — it is the
only command that compiles what production compiles.

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
