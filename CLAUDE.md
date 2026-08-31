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

**A `G`-NUMBER IS MEANINGLESS WITHOUT NAMING ITS DOCUMENT.** Two files at this
repo's root both number their entries `G1`, `G2`, `G3`, and they mean entirely
different things: `MONARCH-MVP-DS-GAP-REGISTER.md` G1 is the **bottom-anchored
sheet**, G2 the **iOS action sheet**, G3 **`CardBalance`'s hard-coded badge
tint**, while `MONARCH-MVP-PHASE5-FLOW-INVENTORY.md` G1 is the **donut/pie
chart**, G2 the **chat message bubble**, G3 the **line/area trend chart**. The
ranges differ too — the register runs G1–G10, the inventory G1–G3 — so a
G-number can also be valid in one file and absent from the other. **This
ambiguity has already produced a phantom "G11", which exists in neither file**
(grep: zero matches in both). Always write "gap-register G1" or "inventory G1";
never a bare G-number.

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

Fixes 3b, 3c (Gate 13) and 4, 5 (this gate) are all landed. One thing
deliberately remains:

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

**`token-exempt` IS LINE-SCOPED, AND GATE D WALKED INTO IT.** The marker must
sit on the SAME physical line as the literal — the script reads it from
`rawLines[i]` and skips that line. Gate D's first attempt put the comment on
the line ABOVE `--mvp-frame-max: 430px` and the linter **correctly still
failed**, reporting the exemption in force at one line and the violation at the
next. That is the Gate 18 scoping working exactly as intended, not a bug. Move
the marker onto the declaration; **do not widen an allowance to get around
it.**

One thing deliberately NOT widened: the allowance covers `@media` only.
`@container` and `@supports` conditions have the same CSS limitation and would
be flagged today. Neither appears in `src/`; widen it when one actually does,
with a fixture, rather than pre-emptively.

## The frame cap (Gate D)

**THE APP CAPS AT 430px, CENTRED, PLAIN.** Above the cap the surrounding area
is page background — no device frame, no shadow, no surrounding treatment. Two
custom properties in `src/index.css` carry it:

```css
--mvp-frame-max: 430px;   /* token-exempt — no DS token backs 430 */
--mvp-frame-inset: max(0px, (100% - var(--mvp-frame-max)) / 2);
```

`.mvp-shell` caps by ordinary `max-width` plus auto margins. **THE FIVE
`position: fixed` ELEMENTS DO NOT INHERIT THAT**, because they take the
VIEWPORT as their containing block rather than the shell — which is the entire
reason this gate existed. Each takes the inset explicitly: as
`var(--mvp-frame-inset)` where the inset was `0` (nav, scrim), and as
`calc(var(--mvp-gutter) + var(--mvp-frame-inset))` where a gutter already
existed (FAB, theme switch, toast). One property, one mechanism, five sites.

**`max()` NOT `clamp()`, and the reason is that only a FLOOR is needed.** Below
the cap `(100% - 430px) / 2` is negative and must read as zero, so nothing
moves at 375 or 430. Above it the inset correctly grows without limit as the
window widens, so there is no upper bound to supply and `clamp()` would have
demanded one.

### Never `100vw` on fixed chrome — understand this, do not merely obey it

**`100vw` INCLUDES THE CLASSIC SCROLLBAR GUTTER. THE INITIAL CONTAINING BLOCK
DOES NOT** — and the ICB is what a percentage resolves against for a
`position: fixed` element. The two are not synonyms for "the width of the
window", and on any desktop browser painting a classic scrollbar they differ.

Measured on the live Netlify deploy in real Windows Chrome:

| | value |
|---|---|
| `innerWidth - document.documentElement.clientWidth` | **15** |
| `.mvp-shell` `getBoundingClientRect().width` | **652.8** |

So on that window `100vw` is 667.8 where `100%` is 652.8, and an inset derived
from `100vw` centres the chrome **7.5px off — on every desktop visitor,
forever**.

**HEADLESS CHROMIUM REPORTS A ZERO-WIDTH SCROLLBAR AT EVERY WIDTH.** In
headless `innerWidth === clientWidth`, so a `100vw` implementation and a `100%`
implementation are INDISTINGUISHABLE to the entire visual harness — every
screenshot compares green either way, and so does every computed-geometry
assertion. **No screenshot can catch this**, which is why the ban lives in the
linter rather than in a spec.

At Gate D `src/` contained **zero `vw` units and zero `vh`**. The only viewport
unit in the app is `100dvh` on `.mvp-shell`.

### Two guards, and neither alone is sufficient

- **Guard A — `e2e/frame-cap.spec.ts`**, 2 tests at 1280x812, no baseline. Cap
  and gutter are read from the computed custom properties and the frame edges
  derived from `clientWidth`; nothing on the right-hand side of a comparison is
  transcribed. It also asserts that `position: fixed` SURVIVES, that each
  element lies within the viewport, and that the FAB is hit-testable via
  `elementFromPoint` — because the three fatal mechanisms below leave
  horizontal geometry correct while un-fixing the element. **It refuses to run
  below the cap**, so it cannot pass for the degenerate reason that the inset
  clamped to zero.
- **Guard B — the `viewport-width-unit` rule in `scripts/check-tokens.mjs`.**
  Banned BLANKET rather than scoped to fixed chrome, deliberately: a line-based
  check cannot know whether the rule it is reading carries `position: fixed`,
  and a check that is fragile about WHERE it applies fails open on the very
  case it exists for. A justified future `vw` takes the same
  `token-exempt: <reason>` marker as any other exception.

**THEY CHECK DIFFERENT THINGS AND NEITHER SUBSUMES THE OTHER.** Guard A cannot
catch a `100vw` implementation — in headless it satisfies every assertion
exactly. Guard B cannot tell whether the inset actually REACHES the five
elements — it only reads source text. The defect and the delivery are checked
by different instruments because no single instrument sees both.

### Three mechanisms are fatal, measured — do not reach for them

`transform`, `contain: layout paint` and `filter` each align the chrome to the
frame and then **un-fix it**. Each establishes a containing block, so the tops
relocate to the bottom of the document, the nav sits **171-185px below the
viewport at rest**, and `elementFromPoint` on the FAB returns `null`. **This
happens even at 430, where the horizontal geometry is otherwise unchanged, so a
width-only inspection would ship it.** `container-type: inline-size` does
nothing at all.

### `.mvp-finance-detail__actions` is `sticky` and needs no inset

It resolves against its scroll container and therefore follows a capped frame
for free. Gate D added a spec assertion that it stays `sticky`, specifically so
a later session cannot "finish the job" by converting it — adding the frame
inset there would double-count and pull it inward by 425px at 1280.

### Baseline impact was zero, and was re-derived through the package build

Not by runtime injection — Gate 16's whole finding is that the local build is
not the shipped build. At 375 the cap does not bind and the inset clamps to
`max(0px, -27.5px)` = 0; at 430 it binds exactly and the inset is
`max(0px, 0px)` = 0. **All 92 baselines byte-identical by SHA-256**, with the
suite at **194 passed / 0 failed**. The cap was also confirmed present in the
shipped `dist/assets/*.css`, where `grep -c 100vw` returns **0**.

## Deploy hygiene (Gate 24)

Three consequences of the app being live at `https://monarchmvp.netlify.app`.
The Netlify mechanics themselves — build command, publish dir, the SPA rewrite,
the `prepare` hazard — are under "The deploy" in Known conditions below; this
section is what sits on top of them.

### The constraint that drives the crawler work

**NETLIFY FREE HAS A HARD FAILURE MODE, NOT A THROTTLE.** 300 credits/month,
bandwidth at 20 credits/GB (~15 GB), shared with deploys, compute and requests.
When credits run out **every project on the team is paused** and visitors get
"Site not available". Credits cannot be bought on Free.

The shipped JS is **5.75 MB** (7.28 MB total) — roughly **2,500 uncached
visits** to the cap. A crawler re-fetching that bundle is a real draw against
it, which is why this is a bandwidth measure rather than an SEO one.

### Two crawler mechanisms, and they do different jobs

**NEITHER REPLACES THE OTHER, AND THE DISTINCTION IS FETCH vs INDEX.**

| mechanism | where | governs |
|---|---|---|
| `robots.txt`, `Disallow: /` | `public/robots.txt` | **fetching** — the bandwidth half |
| `X-Robots-Tag: noindex, nofollow` | `netlify.toml` `[[headers]]` | **indexing** — for crawlers that fetch anyway |

A crawler that OBEYS `robots.txt` never fetches, so it never sees the header —
the header exists for the ones that do not. Conversely a URL blocked by
`robots.txt` can still be INDEXED from inbound links alone, content unseen, and
only a `noindex` on a response the crawler actually received suppresses that.

**BOTH ARE TEMPORARY** — until the DS logo assets are fixed and the case study
is ready to share. The intent is recorded in a comment in each file so a later
session removing them is not guessing.

**`public/` IS THE VERBATIM-COPY DIRECTORY, CONFIRMED RATHER THAN ASSUMED.**
`vite.config.ts` declares no `publicDir`, so Vite's default applies; measured
through `npm run build:package`, `robots.txt` lands at `dist/robots.txt`
byte-identical to the source (`9d695f5f…36e846` both sides), alongside the
`media/` tree.

#### The SPA rewrite is why this had to be a real file — and why it works

**BEFORE THIS GATE, `GET /robots.txt` RETURNED 200 WITH THE APP'S HTML.**
Measured on the live deploy: `Content-Type: text/html; charset=UTF-8`, 750
bytes, the `index.html` shell. The `/*` -> `/index.html` rule caught it. Most
crawlers read that as "no robots.txt" and proceed to fetch the bundle.

`public/robots.txt` fixes it because **Netlify serves a file that EXISTS in the
publish directory BEFORE it applies a non-forced rewrite**. That precedence is
the entire mechanism, and it has one hazard: appending `!` to the redirect
status (`200!`, a FORCED rewrite) inverts it, and `robots.txt` would silently
start serving HTML again with nothing failing. **Do not force that rule.**

**THE DEFINITIVE CHECK IS POST-DEPLOY, NOT LOCAL.** `vite preview` serves the
static file directly and never evaluates `netlify.toml`, so a green local check
does not exercise the precedence at all. Re-fetch
`https://monarchmvp.netlify.app/robots.txt` after the next deploy and confirm
`Content-Type: text/plain`.

### Framing is deliberately left OPEN — the decision is the absence of a policy

Teku intends a DS showcase page with an MVP tab that **iframes this deployed
app** inside a phone bezel. That requires this origin to permit framing.

**MEASURED ON THE LIVE DEPLOY AT GATE 24: no `X-Frame-Options`, no
`Content-Security-Policy`, therefore no `frame-ancestors`.** Framing is
permitted today BY DEFAULT rather than by decision. The comment in
`netlify.toml` is what converts it into a decision; nothing was implemented.

**DO NOT ADD `frame-ancestors` UNTIL THE SHOWCASE ORIGIN EXISTS.** A policy
written against a guessed domain breaks the thing it is meant to enable, and
the failure mode is silent and badly timed — a blank iframe on the day the
showcase is demoed, with the block visible only in the console.

**WHEN THE ORIGIN EXISTS, the change is exactly one header:**

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "frame-ancestors 'self' https://<showcase-origin>"
```

`frame-ancestors` and not `X-Frame-Options`: the latter has no portable
allow-list form, because `ALLOW-FROM` was never implemented in Chromium.

### The PWA manifest is BLOCKED on icon artwork, and nothing was shipped

**SUPERSEDED AT GATE 38 — THE APP IS INSTALLABLE NOW.** The manifest, the four
icons, the two favicons and the iOS tags all landed; see "The icon set" under
Gate 38 below for the measured artwork, including the maskable safe-zone
derivation. What follows is Gate 24 as written, kept because its census and its
requirements table are what the Gate 38 work was built from.

**THE APP IS NOT INSTALLABLE TODAY AND THIS GATE DID NOT CHANGE THAT.**
`index.html`'s viewport comment cites roadmap D1's "PWA-installable" as
*intent*; there is no manifest, no `<link rel="icon">` and no
`apple-touch-icon`. Phase 3 stopped at the census, deliberately — **icon
artwork is Teku's decision and this gate did not generate any.**

**THE CENSUS, stated exactly.** `git ls-files` matching
`icon|logo|favicon|apple-touch|manifest|robots` returned **zero** before this
gate. `public/` holds only `media/{academy,banner,profile}` — photographic and
illustrative content, no app icon and no favicon. The DS has two brand marks in
`Assets/logo/brand/`, and they are clean vector rather than the base64 bloat
that afflicts the company and crypto sets (measured: brand **1,999 bytes / 0
files containing base64**, against company 2.58 MB / 18 files and crypto
2.76 MB / 10 — which is the ~5.3 MB logged DS-side):

| file | viewBox | fill | why it is not an app icon |
|---|---|---|---|
| `Monarch logo, Style = Thick.svg` | 24x14 | `#046eff` | **not square** |
| `Monarch logo, Style = Thin.svg` | 24x24 | `#046eff` | square, but transparent ground and no maskable safe zone |

Both are single-colour marks on transparent, in the DS repo. Rasterising either
into an app icon requires an opaque plate, padding and a safe-zone decision —
that is artwork, not a build step.

**WHAT IS NEEDED, so the next session is one step and not a research task:**

| file | size | notes |
|---|---|---|
| `icon-192.png` | 192x192 | manifest `purpose: "any"` |
| `icon-512.png` | 512x512 | manifest `purpose: "any"` |
| `icon-maskable-512.png` | 512x512 | `purpose: "maskable"` — mark inside the central 80%-diameter safe circle, i.e. >=10% padding a side, on an opaque plate |
| `apple-touch-icon.png` | **180x180** | **opaque — iOS does not honour alpha and renders transparent pixels black.** Square, no rounded corners; iOS applies its own mask |

192 and 512 are the Chromium installability floor. 180 is the safe single size
for every current iPhone and iPad.

**THE iOS TAGS ARE THE HALF THAT MATTERS MOST HERE**, because the QR-scanning
audience is overwhelmingly on iPhones, and Safari uses the `apple-touch-icon`
link rather than the manifest's `icons` array for Add to Home Screen. Current
guidance splits: MDN marks `apple-mobile-web-app-capable` deprecated in favour
of the standard `mobile-web-app-capable`, while removing it has been reported to
break iOS splash screens. **Ship both spellings plus the manifest's
`display: "standalone"`**, rather than choosing between them:

```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

**THE COLOURS ARE ALREADY DERIVED — do not re-invent them.** Both traced to
their brand values in the DS `globals.css`, not picked.

**THE `theme_color` ROW BELOW WAS CORRECTED AT GATE 38, AND THE STALE VALUE IS
LEFT VISIBLE BECAUSE IT IS THE WHOLE POINT.** Gate 24 recorded `#046eff` via
`--alias-primary-500`. **DS v1.7.0 rebound `--mapped-surface-primary-default`
from `--alias-primary-500` to `--alias-primary-600`** — re-derived at Gate 38
across the tags rather than taken on trust: v1.6.0 reads `--alias-primary-500`,
v1.7.0 reads `--alias-primary-600`, and it has read 600 at every tag since,
through v1.15.0. The manifest is invisible to `scripts/check-tokens.mjs` (see
below), so nothing reported the drift: the value was correct when written,
became wrong at v1.7.0, and has been wrong at every tag from v1.7.0 through
v1.15.0. The values below are re-resolved against the pinned **v1.15.0**
`globals.css`:

| manifest member | value | derivation, re-resolved at v1.15.0 |
|---|---|---|
| `theme_color` | **`#0358cc`** | `--mapped-surface-primary-default` (`:431` `:root`, `:626` `[data-theme="dark"]`, **identical in both**) -> `--alias-primary-600` (`:199`, declared once at bare `:root`) -> `--brand-blue-600` (`:24`) = `#0358cc` |
| `background_color` | `#ffffff` | `--mapped-surface-page` (`:438`) -> `--alias-foundations-white` (`:272`) -> `--brand-white` (`:97`) |

**AND THE CLAUSE THAT CAME WITH THE OLD ROW IS NOW FALSE, WHICH MATTERS MORE
THAN THE HEX.** Gate 24 wrote that `theme_color` *"cross-checks against the
brand logo's own fill"*. It no longer does, and that was a genuine
cross-check being quietly lost: both DS brand marks still fill `#046eff`
(`--brand-blue-500`), measured at v1.15.0, while `theme_color` is now
`#0358cc` (`--brand-blue-600`). **The two are one ramp step apart and that is
correct, not a defect** — `theme_color` is a SURFACE token and the logo fill is
artwork — but the coincidence that once validated the value is gone, so the
chain above is the only check left. Do not "fix" either one to make them agree.

**THE LIGHT VALUE IS THE RIGHT ONE, AND IT IS NOT A COIN TOSS.** A manifest
carries ONE `background_color`, used for the splash screen before any CSS or JS
runs. `ThemeProvider` initialises to `'light'` unconditionally — it reads no
stored preference and no `prefers-color-scheme` — so the app's first paint is
always the light page surface. The dark counterpart exists
(`--mapped-surface-page` `:633` -> `--alias-foundations-black` `:273` ->
`--brand-black` `:98` -> `#000000`)
and is not what the splash should use.

#### The guardrail sees `index.html` but NOT the manifest

**A LANDMINE FOR WHOEVER SHIPS THIS.** `scripts/check-tokens.mjs` collects
`SCAN_DIRS = ['src']` plus `SCAN_FILES = ['index.html']`, and its rules apply
to `.html` as much as to `.css`. Two consequences pointing opposite ways:

- **`<meta name="theme-color" content="#0358cc">` WILL BE FLAGGED** by
  `raw-hex-color` and needs a same-line `token-exempt: <reason>` marker — and
  per Gate 18 the marker must sit on the SAME physical line as the literal.
- **`public/manifest.webmanifest` WILL NOT BE SCANNED AT ALL**, because
  `public/` is in neither list. Its hex values escape the guardrail silently, so
  they must be derived by hand from the table above and re-checked against the
  DS by hand across a DS upgrade. Nothing will tell you they drifted.

### What this gate did not touch

`index.html` is unchanged, `src/` is unchanged, and no spec was added. **All 92
baselines byte-identical by SHA-256** and the suite at **194 passed / 0
failed** — the predicted result, since a header, a static text file and a
`netlify.toml` comment cannot reach a rendered pixel.

## Cleanup — contrast, dead code, line endings (Gate 25)

Four items off the logged-not-fixed list. **Exactly one had user consequence**
and it turned out to be a DS gap rather than an MVP defect; the rest is hygiene.
**No pixel moved: all 92 baselines byte-identical, suite 194 passed / 0 failed.**

### The promo band fails AA, and NO SHIPPED TOKEN CAN FIX IT

**THE 2.69:1 FIGURE THAT WAS CARRIED FOR SEVERAL GATES IS SUPERSEDED. THE
MEASURED WORST IS 2.64:1.** Gate 3d sampled a centre point and a corner; this
gate sweeps EVERY background pixel under each text box, which is what finds the
true extremum. Both numbers describe the same defect — the point is that a
sample is not a bound, and the stale one must not be quoted again.

The band is the Monarch Academy promo on `HomepageFiat`, i.e. the DEFAULT
`accounts` tab of `/`. It is the only place it renders.

**METHOD, because a colour read the wrong way is not evidence.** Animations
finished first (`getAnimations().forEach(a => a.finish())`), then the glyphs
hidden with `visibility: hidden` — which preserves layout exactly — so the
sampled screenshot under each box is PURE BACKGROUND rather than a blend of
background and antialiased glyph. WCAG 2.x, `(L1 + 0.05) / (L2 + 0.05)` on
linearised sRGB. 375x812 at DPR 2, both themes.

| element | fg | size/weight | large-scale? | needs | **worst measured** |
|---|---|---|---|---|---|
| link | `#ffffff` | 16px/400 | no | 4.5:1 | **2.64:1** |
| subtitle | `#ffffff` | 12px/400 | no | 4.5:1 | **2.73:1** |
| title | `#ffffff` | 16px/600 | no | 4.5:1 | **2.83:1** |

Nothing qualifies as WCAG large-scale, so the 3:1 allowance does not apply:
that needs >=24px, or >=18.66px at weight >=700. **Gate 3d recorded the link as
14px; measured, it is 16px/400.**

**THE BAND IS THEME-INVARIANT AND THAT IS WHY BOTH THEMES REPORT IDENTICAL
NUMBERS.** Both gradient stops are raw `--brand-*` values, which do not flip.

The chain, identical in both themes:

```
background  .mvp-home__promo
  linear-gradient(141deg, var(--brand-blue-500) 20%, var(--brand-teal-500) 97%)
    --brand-blue-500 -> #046eff   (raw brand token — there is NO --mapped-* hop)
    --brand-teal-500 -> #00ace5
foreground  title    -> --mapped-text-primary-on-color -> --alias-foundations-white -> #ffffff
            subtitle -> --mapped-text-on-color-body    -> --alias-foundations-white -> #ffffff
            link     -> Link appearance="inverse"                                   -> #ffffff
```

#### The ruling: the surface is the defect, so the fix is the DS's

**THE MVP DID NOT PICK THE WRONG TOKEN, AND THIS WAS ENUMERATED RATHER THAN
ARGUED.** All 54 `--mapped-text-*` tokens the DS ships were measured against
every band pixel: **0 of 54 clear 4.5:1**, in either theme.

**THE ARITHMETIC SAYS WHY, AND IT GENERALISES.** The band spans L=0.183 at the
blue end to L=0.352 at the teal end. Clearing AA against BOTH ends requires a
foreground of **L <= 0.00184**. The darkest shipped text token (`#0d0f11`,
L=0.00468) reaches only 4.27:1 — it misses. And a LIGHTER foreground would need
**L >= 1.000**, which white already is, and white still fails at 2.61:1. So no
member of the family can work, and no future member could either without being
essentially pure black.

That makes it Case B: **the DS cannot do what this screen needs, so work stopped
here.** No MVP-local value was invented, no `token-exempt` added, no hex nudged.

**A SIDE-FINDING THAT BELONGS IN THE SAME DS ITEM: white on `--brand-blue-500`
alone measures 4.49:1** — the DS's own on-colour contract misses AA by 0.01 even
on its intended SOLID surface, before any gradient is involved.

**THE CANDIDATE SURFACES ARE MEASURED so the v1.6.0 decision is one step and not
a research task.** White text, worst point over the whole interpolated ramp:

| gradient | worst | |
|---|---|---|
| `blue-500 -> teal-500` | 2.61:1 | fail — shipped today |
| `blue-600 -> teal-600` | 3.95:1 | fail |
| **`blue-600 -> teal-700`** | **6.34:1** | **PASS — minimal change on the existing ramp** |
| `blue-700 -> teal-700` | 6.36:1 | PASS |
| `blue-700 -> teal-800` | 9.37:1 | PASS |

Logged for **DS v1.6.0**, alongside the dark-mode error tokens, the logo assets
and `G11`/`G12`. Do not act on it from this repo.

### Two dead class names, deleted — and the search that justified it

`.mvp-finance-detail__list-section` and `.mvp-finance__row-group` were both
Flow 7 leftovers. **THE CLAIM THAT THEY WERE DEAD WAS VERIFIED BEFORE ANYTHING
WAS DELETED, and the DS leg is the one that could have made it wrong** — a class
with no rule in the MVP but a rule in the DS package is NOT dead.

| location | `list-section` | `row-group` |
|---|---|---|
| MVP `src/` CSS rule | **0** | **0** |
| MVP `src/` markup | 1 (`HoldingDetailScreen.tsx:106`) | 1 (`DetailRows.tsx:32`) |
| `e2e/` specs | 0 | 0 |
| DS package `dist/` (shipped CSS) | **0** | **0** |
| DS working-tree `src/` | **0** | **0** |

Searched on the PARTIAL string (`list-section`, `row-group`) rather than the
full class name, so a BEM-style rule built by concatenation would still have
been caught, and both TSX files were confirmed to use static `className`
literals only — no template strings, no `clsx`.

**THE `<div>` IN `DetailRows` STAYS; ONLY ITS CLASS ATTRIBUTE GOES.** It groups
the `Divider` with the row and carries the React `key`. Removing the element
would change the DOM; removing a class that styles nothing cannot.

#### One orphan found in the reverse direction — CLOSED AT GATE 39

The same sweep run backwards — every class selector in the MVP's own CSS
checked against all MVP TSX/TS — found **1 of 74** with no usage:

- **`.mvp-finance__hero-category`**, whose sole declaration was
  `color: var(--mapped-text-on-color-caption)`. Its sibling
  `.mvp-finance__hero-names` IS used, so this was a rule that outlived its
  markup — the INVERSE of the two above, which were markup that outlived their
  rules. Out of scope at Gate 25 by instruction; **deleted at Gate 39.**

**GATE 25 CITED IT AS `finance.css:210` AND BY GATE 39 IT WAS AT `:356`.** The
file grew underneath the reference. That is why the re-derivation was run rather
than the line number trusted, and it is the general reason a `file:line` in this
document is a starting point rather than an address.

**THE DELETION WAS PROVED ON FIVE LEGS BEFORE IT WAS MADE**, searching the
PARTIAL string `hero-category` so a BEM name built by concatenation would still
have been caught: **0** in MVP `src/` TS/TSX, **0** in `e2e/`, **0** in the DS's
shipped `dist/index.css`, **0** in the DS working tree's `src/`, and every
`className` in `src/flows/finance/` confirmed a static literal — no template
strings, no `clsx`. The only other occurrence anywhere in the repo was this
paragraph describing it.

**IT MOVED NO PIXELS, WHICH IS THE POINT OF DELETING A RULE NOTHING SELECTS.**
All 96 baselines byte-identical by SHA-256 across the gate.

**THE SWEEP IS NOW 73 OF 73 CLEAN IN BOTH DIRECTIONS.** Re-run at Gate 39 over
6 MVP CSS files and 40 TS/TSX files: zero declared-but-unused, and zero
used-but-undeclared. The count is 73 rather than Gate 25's 74 because this rule
is the one that went.

### `.gitattributes` — and the measurement that made it safe

`core.autocrlf` is `true` both locally and globally, so line endings were being
decided per-machine and any recorded line-ending state went stale on clone.

**THE FILE WAS MEASURED BEFORE IT WAS WRITTEN.** `git ls-files --eol` reported
the index as 80 `i/lf`, 95 `i/-text`, 3 `i/none` — and decisively **ZERO files
stored with CRLF in the index**. So `* text=auto` renormalises nothing; it
codifies the state the repo is already in. That is the whole reason it was safe
to declare broadly, and it is the check to re-run before ever widening it.

**THE 95 BINARIES ARE DECLARED EXPLICITLY AND THAT IS THE LOAD-BEARING HALF.**
93 PNGs (92 baselines + `monarchacademy_img.png`) and 2 WebPs. A `text` rule
that ever caught the baselines would rewrite bytes inside a compressed stream
and corrupt the entire visual net, silently, on the next checkout. Git already
infers all 95 as `-text`, so the lines change nothing today — they exist so a
future broadening cannot reach them by accident.

**`*.svg` IS DELIBERATELY NOT DECLARED BINARY.** SVG is XML, i.e. genuinely
text; forcing `binary` would lose diffs for no benefit. The 4 tracked SVGs are
left to `text=auto`.

**`git add --renormalize` WAS DELIBERATELY NOT RUN.** Adding the file changes
how git treats FUTURE checkouts; renormalising rewrites the working tree NOW.
Doing both in one commit would bury a whole-tree line-ending rewrite alongside
ordinary code changes where no reviewer could separate them. If it is ever
wanted, it is its own gate with its own diff.

**VERIFIED AFTER WRITING:** all 95 tracked binaries SHA-256-identical (manifest
digest `7549567...458742` before and after), `git status --porcelain` listing
`.gitattributes` as the only addition and no unrelated file as modified.

### The asset census — REPORT ONLY, nothing re-exported

"Asset re-exports" had no definition on the cleanup list. It means: an asset
shipped far larger than it is ever displayed — the same defect class as the DS
logos. Measured through the browser at both viewports, animations finished:

| asset | format | natural | rendered @430 | needs @DPR2 | on disk |
|---|---|---|---|---|---|
| `banner/imgbg01.webp` | WebP VP8 | 3515x843 | 430x90 | 860x180 | 67,326 B |
| `academy/monarchacademy_img.png` | PNG | 436x368 | 110.02x76 | 221x152 | **128,696 B** |
| `profile/user_margaret.webp` | WebP VP8 | 200x200 | 32x32 | 64x64 | 1,832 B |

The banner's oversupply is already documented and already explained in
`public/media/banner/README.md`: the extra resolution is EMPTY — downscaling to
1125 wide and re-upscaling reproduces the native file at r=0.9991, so nothing
beyond 1125 is real detail. **The academy PNG is the interesting unaddressed
case**: it is the largest WIRED asset in the repo, it is lossless PNG carrying
illustrative artwork, and it is rendered at 221x152 device pixels.

**THE BIGGER FINDING IS NOT AN IMAGE AT ALL — IT IS WHAT `public/` PUBLISHES.**
Vite copies `public/` verbatim, so everything in it deploys:

- **`public/` totals 1,001,541 bytes, and 799,701 of that — 79.8% — is content
  the app never requests.** That is the 782,951-byte `imgbg01.svg` plus three
  developer `README.md` files (16,750 B).
- `imgbg01.svg` is a base64 raster wrapped in SVG, **kept unwired ON PURPOSE**
  (its README says so: retained so the two can be compared after a corrected
  Figma export). It is not an oversight — but it and the three READMEs are
  confirmed present in `dist/media/`, i.e. served from the CDN.
- Practical bandwidth draw is ~0 because nothing links to them and `robots.txt`
  now disallows crawling, so this is a deploy-hygiene note rather than a repeat
  of the Gate 24 credit problem.

**NOTHING WAS CHANGED.** Re-exporting an image changes bytes, bytes change
baselines, and this gate was required to predict its baseline set in advance.
Keep the re-export separate.

## The DS v1.6.0 re-pin (Gate 26)

The pin moved `v1.5.0` (`4a82572b`) -> `v1.6.0` (`92091572411f`). A token
release: 11 changed declarations, 3 in `:root` (light error text, `--alias-error`
500/600/700 -> 600/700/800) and 8 in `[data-theme="dark"]` (3 error text
600/500/400 -> 500/400/300, and 5 `on-color` neutral-950/800/700 ->
neutral-100/200/300). **26 of 92 baselines were re-minted**, and the suite runs
194 passed / 0 failed on the minted set.

**ONLY 2 OF THE 11 TOKENS HAVE ANY CONSUMER AT ALL** —
`--mapped-text-error-default` and `--mapped-text-on-color-caption`. The other six
(`-error-default-hover`, `-error-default-press`, `-on-color-placeholder`,
`-on-color-label`, `-label-hover`, `-label-pressed`) have **zero rules** in the
entire loaded stylesheet set, MVP and DS alike. They are declared and never read.
`Chips` renders **0 instances across all 92 states**, so all six `--subtle`
changes are inert here; `Badge` renders 36 times but only as
`mn-badge--dot mn-badge--important` inside the DS `HeaderBg` notify dot, bound to
`--mapped-surface-error-default`, a SURFACE token v1.6.0 did not touch.

### The runtime-composed token is a blind spot, and TWO instruments share it

**THIS IS THE ITEM THAT COST THE GATE ITS PREDICTION. READ IT BEFORE PREDICTING A
TOKEN RELEASE AGAIN.**

Gate 26 predicted 22 changed baselines and got **26**. The four misses were
`index-{375,430}-{light,dark}` — the Homepage's DEFAULT accounts tab — and they
were caused by a token the gate had correctly identified as changing, reaching an
element through a path neither instrument could see.

The mechanism, concretely, in three files:

| step | file | what it holds |
|---|---|---|
| 1 | `src/data/insights.ts:43` | `titleToken: 'mapped-text-error-default'` — a token name as a plain string, **with no leading `--`** |
| 2 | `src/flows/homepage/HomepageFiat.tsx:102` | composes the `var()` at runtime from a template literal (below) |
| 3 | DS `Card/CardSmartInsights.tsx:27` | `style={titleColor ? { color: titleColor } : undefined}` — applies it as an **inline style** |

Step 2 in full, since it is the join that defeats both instruments:

```jsx
titleColor={insight.titleToken ? `var(--${insight.titleToken})` : undefined}
```

Verified live: the rendered element carries
`style="color: var(--mapped-text-error-default);"`.

**A USAGE GREP AND A CSSOM RULE CENSUS ARE NOT INDEPENDENT INSTRUMENTS AGAINST
THIS.** They look independent — one reads source text, the other reads the
browser's own stylesheet objects — and they fail together, for two different
reasons that happen to coincide:

- `grep -rn -- "--mapped-text-error" src/` misses step 1, because the string in
  the data file **does not contain `--`**. The `--` only exists after step 2
  concatenates it.
- A CSSOM walk over `document.styleSheets` misses step 3, because an inline
  `style` attribute is **not a `CSSStyleRule`** and appears in no stylesheet.

So two passes agreeing that a token has no consumer is worth much less than it
looks. This gate's pair reported 5 consumers of `--mapped-text-error-default`;
there were 6, and the sixth was the only one rendering on the default Homepage
tab.

**THE CHEAP ADDITION IS A SWEEP OF `[style]` ATTRIBUTES FOR `var(--`.** In the
PAGE, not in source — the attribute is written by React at render time:

```js
Array.from(document.querySelectorAll('[style]'))
  .filter((el) => (el.getAttribute('style') || '').includes('var(--'))
  .map((el) => ({ cls: el.className, style: el.getAttribute('style') }))
```

Run it per walk state alongside the CSSOM census. It is a third instrument with a
genuinely different failure mode, and it would have turned this gate's prediction
from 22 into 26 before the suite ran.

**THE SOURCE-SIDE HALF IS ALREADY BOUNDED, so this does not need re-deriving.**
`titleToken` is the ONLY runtime-composed token mechanism in `src/` — swept and
confirmed — and it has exactly **3 entries**: `brand-cyan-500`,
`mapped-text-default-default`, and `mapped-text-error-default`. A future token
release need only check those three names against its diff. If a fourth
`*Token`-style prop ever appears, it belongs in that list.

**THE 375/430 ASYMMETRY IS WHAT LOCATED IT, and it is a reusable diagnostic
shape.** The diff was 14 px at 375 and 437 px at 430 — the same element, wildly
different counts. That is the signature of a box clipped by the viewport edge:
`.mn-card-smart-insights__title` on the second carousel card starts at x=370, so
5 columns show at 375 and 60 at 430. **A large 375/430 ratio on one baseline pair
means a right-edge clip, not two different defects.**

### `--mapped-text-on-color-caption` — the pre-v1.6.0 dark pass was ACCIDENTAL

**DO NOT LOG THIS AS A v1.6.0 REGRESSION AND DO NOT REVERT THE PIN OVER IT.** The
DS change is correct. What it did was remove an accident that had been masking an
MVP-side surface defect, and that masking is what a future reader will mistake
for the good state.

Two MVP surfaces consume the token, and **both are theme-invariant coloured
bands** — measured by sampling every pixel under the text with the glyphs hidden
(`visibility: hidden`, which preserves layout exactly), animations finished
first:

| consumer | surface, measured | v1.5.0 light / dark | v1.6.0 both |
|---|---|---|---|
| `.mvp-finance__hero-footnote` | finance hero, cyan `rgb(21,179,231)` | 1.97 / **7.58** | **1.97** |
| `.mn-line-chart--chrome-onColor .mn-line-chart__axis-label` | net-worth chart, blue `rgb(85,157,255)` | 2.04 / **6.14** | **2.04** |

The v1.5.0 dark values passed AA only because the token flipped to
`--alias-neutral-950` (near-black `#0d0f11`) — **on a band that does not flip**.
That is precisely the bug v1.6.0 fixed: on-colour text must not swing with the
theme when the colour it sits on cannot. The light column, always `#e7eaed`, was
**already failing at 1.97 and 2.04 before this release** and nobody had flagged
it. v1.6.0 did not create the failure; it made dark tell the same truth light was
already telling.

**SO THE DEFECT IS THE SURFACE, AND THE FIX IS DS-SIDE — the same shape as the
promo band above.** Near-white text on a mid-cyan or mid-blue band cannot reach
4.5:1, exactly as Gate 25 showed for `blue-500 -> teal-500`. Neither consumer
qualifies as WCAG large-scale. Log it with the promo band; do not invent an
MVP-local value and do not re-map the token here — rule 3.

**IT ALSO VINDICATES THE GATE 3c WORKAROUND AND ARGUABLY OBSOLETES IT.**
`homepage.css:426` records moving the promo subtitle OFF this token because it
"swung to near-black on an unchanged blue". That flip is now gone. The comment is
still correct history but **no longer describes current DS behaviour** — do not
read it as such. Reverting the workaround would change pixels and was out of
scope here.

**THE ERROR-TEXT CHANGE IMPROVES EVERY CONSUMER AND STILL MISSES AA IN DARK.**
Measured against the surfaces actually painted behind each:

| consumer | surface | v1.5.0 | v1.6.0 |
|---|---|---|---|
| `.mn-trend--down .mn-trend__label` | page `#f9f9f9` / `#131313` | 4.64 / 2.16 | **8.16** / **3.81** |
| `.mn-card-smart-insights__title` | card `#ffffff` / `#262626` | 4.88 / 1.76 | **8.59** / **3.10** |

Light now clears AA comfortably. Dark improves but does not reach 4.5:1, and the
insight title is `type-body-m-semibold` — 16px at weight 600, which is **not**
WCAG large-scale (that needs >=24px, or >=18.66px at >=700). Carry both dark
numbers into the DS conversation alongside the on-colour item.

### `CardBalance` cannot fill its track, and the cap binds only at 430

Measured on `/finance`, animations finished. The rendered class is
`mn-card-balance`; the DS declares `width: 161px; min-width: 128px;
max-width: 172px` and exposes **no fill or sizing prop**.

| | 375 | 430 |
|---|---|---|
| `.mvp-finance__grid` width | 343 | 398 |
| `.mvp-finance__grid-item` width | 167.5 | **195** |
| card `offsetWidth` | 167.5 | **172** |
| leftover in the track | 0 | **23px** |

At 430 the card is **pinned at the DS's `max-width` ceiling** and 23px collects
in every one of the 9 tracks. That closes the diagnosis as a **DS gap**, not an
MVP layout bug — there is no prop to pass.

**THE CAP DOES NOT BIND AT 375, WHICH IS WHY THIS WAS INVISIBLE UNTIL THE SECOND
VIEWPORT EXISTED.** At 375 the item is 167.5 and the card fills it exactly. Same
shape as the Gate 13 `sizing='fill'` finding — a real geometry fact that one
viewport cannot see, and part of what 430 was added for. Note the chain is FLEX
despite the name: `.mvp-finance__grid` and `.mvp-finance__grid-item` both compute
`display: flex`, `grid-template-columns: none`.

### The DS logo base64 is 92.7% of the MVP's JS bundle

Measured in this repo's own `dist/` after `npm run build`:

| | |
|---|---|
| `data:image/png;base64` payloads in `dist/assets/*.js` | **33** |
| base64 TEXT bytes carried | **5,326,968** |
| JS bundle on disk | **5,744,735** |
| **base64 share of the JS** | **92.7%** |
| decoded weight | ~3,995,226 |
| `dist/` total | 7,276,768 |

**33 PAYLOADS COME FROM 28 SOURCE FILES, AND BOTH NUMBERS ARE RIGHT.** The DS's
`Assets/logo` holds 28 SVGs containing base64 — 18 company, 10 crypto, **0 of 2
brand** — and five of them embed **two** images each: `Jayagrocer`, `netflix`,
`stellar`, `tether`, `uniswap`. Counting files gives 28; counting payloads gives
33. `logos.ts` pulls all three directories with
`import.meta.glob(..., { eager: true })` and re-exports from the barrel, so
nothing tree-shakes.

The 34th occurrence in `dist/` is `media/banner/imgbg01.svg` (782,384 base64
bytes) — the deliberately-unwired asset Gate 25 recorded, not part of the bundle.

**SO THE ASSET WORK IS A ~93% CUT OF THE JS, NOT A NICE-TO-HAVE.** It is DS-side
and was not acted on here.

### What this gate changed

`src/` is untouched, no spec was added, and `index.html` is unchanged. The
working tree is the pin (`package.json`, `package-lock.json`) plus 26 re-minted
baselines — all modifications to already-tracked paths, **zero added and zero
deleted**, which is why all three arms of `baselines.spec.ts` stayed green
throughout. Per the Gate α correction, a pure re-mint with no rename reddens
neither arm 1 nor arm 2.

## The DS v1.10.0 re-pin and the teal rebind (Gate 31)

The pin moved `v1.9.0` (`76a8230314e4`) -> `v1.10.0` (`0cafb111ebde`). **The
re-pin moved ZERO pixels**; all 52 re-minted baselines belong to the teal
rebind, which is a separate, intentional change made in the same gate. Keep the
two apart when reading the diff — one commit, two findings.

### The re-pin: the whole CSS delta is eight rules, and none of them render here

**THE SHIPPED-CSS DIFF IS THE INSTRUMENT, NOT THE CHANGELOG.** `dist/index.css`
was copied before and after the install and diffed rule-by-rule (split on `}`):
147,679 -> 147,883 bytes, **8 rules changed, all Checkbox and Radio, all in
`:hover` / `:active`**. Zero token declarations moved. Zero resting-state rules
moved.

Two kinds of change, and only one is a value change:

- **Scope.** All 8 selectors gained `:not(.mn-checkbox--invalid)` /
  `:not(.mn-radio--invalid)`, so the invalid variant keeps its own border under
  hover and active.
- **Value.** Exactly one: `.mn-checkbox:hover … .mn-checkbox__box:not(--marked)`
  border-color `--mapped-border-disabled-default` ->
  `--mapped-border-subtlest-default`. **CHECKBOX ONLY** — Radio's hover already
  carried `--mapped-border-subtlest-default` in v1.9.0.

**SO THE CARRIED DESCRIPTION "Checkbox/Radio hover borders" IS HALF RIGHT.**
Radio's selectors changed scope but not colour. Do not go looking for a Radio
border-colour change; there isn't one.

**NEITHER CAN REACH A BASELINE HERE, AND THE WALK PROVES IT RATHER THAN THE
ARGUMENT.** `Checkbox` is imported nowhere in `src/`. `Radio` is imported once,
`src/flows/finance/components/PresetModals.tsx:68`, reachable only through the
two Gate α overlay states — and the walk never hovers it, because `openOverlay`
clicks the actions-bar Button and leaves the pointer there. The full suite ran
**202 passed / 0 failed** against baselines minted under v1.9.0. Confirmed
independently in this gate's diff artifacts: on
`finance-holding-fd-reminder-375-dark`, the Radio group inside the open modal is
**unchanged** while the hero card behind it is the only changed region.

`npx tsc -b --force` was clean, so v1.10.0's showcase-only type derivation
surfaces nothing in MVP code.

#### The install had to be by name, and it was

The DS is a **git dependency** (`github:TekuBrah/Monarch-Design-System#v1.10.0`),
so the standing rule under "Known conditions" applies in full: a bare
`npm install` can no-op because the lock's explicit `resolved` SHA already
satisfies the tree. Running

```
npm install @monarch/design-system@github:TekuBrah/Monarch-Design-System#v1.10.0
```

reported **"changed 1 package"** — not a no-op. Verified from the package's own
`node_modules/@monarch/design-system/package.json` (`1.10.0`), not from the
lockfile alone; `lint:linkage` then reported all four sources agreeing.

### `lint:linkage` WAS RED ON A CLEAN TREE AT THE START OF THIS GATE

**READ THIS BEFORE TREATING A RED PRE-FLIGHT AS A BLOCKER.** `git status` was
empty and `tsc` / `lint:tokens` were green, but `lint:linkage` failed
`ds-worktree-vs-pin`: the sibling DS checkout had been left at `v1.10.0` by the
preceding DS session while this repo still pinned `v1.9.0`.

**THAT IS THE GUARD DOING ITS JOB, AND IT HAS A CONSEQUENCE PEOPLE WILL MISS:
the alias was ACTIVE, so Vite was already compiling v1.10.0.** A "before-state"
suite run at that moment would have measured the AFTER state and reported it as
the before.

**THE HONEST BEFORE-STATE CAME FROM THE PACKAGE PATH, NOT FROM TOUCHING THE DS
REPO.** `node_modules` genuinely held 1.9.0, so a dev server started with
`MONARCH_DS_FROM_PACKAGE=1` renders true v1.9.0 with the alias off. The
resolution path was **positively verified** rather than assumed — the served
modules referenced `/node_modules/.vite/deps/@monarch_design-system.js` and
`/node_modules/@monarch/design-system/dist/index.css`, with no
`/@fs/…/Design system test/` anywhere. `npx playwright test` attached to it
(Gate 22's `reuseExistingServer` precedent) and reported **202 passed**.

That deliberately bypassed `pretest:e2e`, which is the only way to run the suite
while the linkage guard is legitimately red. Do it only to establish a control,
and say so when you do.

### The teal rebind: two call sites, thirteen walk states — SUPERSEDED for the net-worth card, see item 3 below

**READ THIS SECTION AS HISTORY FOR `.mvp-finance__networth`.** It documents the
binding item 2 shipped and the reasoning behind it; item 3, immediately below,
reverted that card to a different pair on a design ruling. `.mvp-finance__hero`
was untouched by item 3 and everything in this section still describes it
exactly. Do not read the "both sites took the same pair" line below as still
true — it was true for the few hours between items 2 and 3 and is recorded
because the reasoning that produced it (parity with the shipped primary
gradient) is why item 3 had to argue against it explicitly rather than just
pick a different colour.

**"TWO SITES" IS NOT "TWO STATES", AND THE FACTOR IS 26.** The two rules sit on
components that render across most of the finance flow:

| rule | renders on | states |
|---|---|---|
| `.mvp-finance__networth` | `/finance` — `NetWorthCard` is inside `FinanceOverview`, i.e. the default `overview` tab only; the other four finance tabs are `ComingSoon` | 1 |
| `.mvp-finance__hero` | every holding-detail route — `HoldingDetailScreen` renders `HoldingHero` unconditionally — plus the three extra `fd` states | 12 |

13 states x 2 viewports x 2 themes = **52 baselines**, which is exactly what the
suite reported (52 failed / 150 passed) and exactly what was re-minted.

**BOTH SITES TOOK THE SAME TOKEN PAIR, AND THE NET-WORTH CARD CHANGED HUE.** It
was `brand-blue-400 -> brand-blue-300` and is now the same teal endpoints as the
hero. That is the settled ruling — parity with the shipped primary gradient's
teal end — not an oversight, and it is the one user-visible consequence of this
gate worth naming out loud.

**THE COMPOSITION DID NOT MOVE; ONLY THE COLOURS DID** — the precedent the promo
band set at Gate 29. Each card keeps its own Figma angle and stops (109deg and
127deg, both 0%/100%). Do not normalise the two angles to match; they are
consumer geometry.

#### The token name carries `-default-`

**THERE IS NO `--mapped-surface-information-pressed`.** The shipped name is
**`--mapped-surface-information-default-pressed`**, and a grep for the bare form
against v1.10.0's dist matches nothing. Both chains:

```
--mapped-surface-information-default          -> --alias-information-700 -> --brand-teal-700  #006789
--mapped-surface-information-default-pressed  -> --alias-information-900 -> --brand-teal-900  #00222e
```

**THERE IS ALSO NO `--mapped-gradient-information-*` PAIR** to copy the promo
band's mechanism exactly. The DS ships only `--mapped-gradient-primary-from` /
`-to` (plus the two scrims), so these two rules consume the surface tokens
directly. If the DS ever adds an information gradient pair, these are its
adopters.

#### Theme-invariant by binding — and the mechanism is not the one carried

The carried claim was that the tokens are "emitted once on `*` with no dark
override". **They are not.** Both are declared **twice** — once at `:root` and
once at `[data-theme=dark]` — with **identical values**, and their alias hops
(`--alias-information-700/900`) are declared once at bare `:root`. Same outcome,
different mechanism; the outcome was confirmed in this app's rendered output
rather than cited from the DS: every figure below is **identical in light and
dark**, at both viewports, at both sites.

#### Rendered contrast — measured in the browser, and the instrument is biased UP

**ARITHMETIC ACROSS A GRADIENT IS NOT A BOUND ON WHAT IS PAINTED**, so these
come from decoding a real Chromium screenshot. Method: `gotoRoute` +
`finishAnimations`, then **every descendant of the card** hidden with
`visibility: hidden` (which preserves layout exactly) so the sampled pixels are
the painted gradient and nothing else — glyphs, icons, divider and chart all
gone — then `page.screenshot({ clip, scale: 'device' })` at DPR 2, decoded
in-page via `createImageBitmap` + `OffscreenCanvas.getImageData`. WCAG 2.x,
`(L1 + 0.05) / (L2 + 0.05)` on linearised sRGB, over every pixel inside the
rounded rect.

| site | computed | rendered @375 | rendered @430 |
|---|---|---|---|
| `.mvp-finance__networth` before, blue-400 -> blue-300 | 2.4323 | 2.4323 | 2.4323 |
| `.mvp-finance__hero` before, teal-500 -> teal-400 | 2.1857 | 2.1869 | 2.1857 |
| **`.mvp-finance__networth` after, teal-700 -> teal-900** | **6.3611** | **6.4495** | **6.3721** |
| **`.mvp-finance__hero` after, teal-700 -> teal-900** | **6.3611** | **6.4495** | **6.4495** |

**QUOTE 6.3611. THE RENDERED FIGURE IS THE OPTIMISTIC ONE, AND THE REASON IS THE
INSTRUMENT RATHER THAN THE RASTERISER.** The sampler insets 2px (x DPR) from the
card edge and excludes the border-radius corners, so the exact teal-700 endpoint
pixel is never sampled; the nearest pixel it reaches is already one step down
the ramp — `rgb(0,102,136)` against the endpoint's `rgb(0,103,137)`. Contrast
against white rises monotonically as the ramp darkens, so the inset can only
push the measured worst UP. The two agree to within 1.4%.

**THIS ALSO CONTRADICTS THE CARRIED DS-SIDE RENDERED FIGURE OF 6.3025, AND THAT
IS EXPECTED.** A rendered extremum depends on the box, the angle and the
sampling rule; it does not transfer between repos. Re-measure rather than cite.

**EVERY TEXT ROLE ON BOTH CARDS NOW CLEARS AA 4.5:1**, worst **6.2832** (the
rightmost chart axis label at 430). None qualifies as WCAG large-scale — that
needs >=24px, or >=18.66px at weight >=700 — so 4.5:1 is the right bar and it is
met with margin everywhere.

**THIS CLOSES THE GATE 26 ON-COLOUR FINDING FROM THE SURFACE SIDE.**
`.mvp-finance__hero-footnote` on `--mapped-text-on-color-caption` measured
**1.83** rendered before and **6.65** after, with the token itself untouched —
exactly what rule 3 predicted: the defect was the SURFACE, so the fix was to
change what the text sits on. The net-worth chart's
`.mn-line-chart--chrome-onColor .mn-line-chart__axis-label`, the other consumer
named at Gate 26, went **2.04 -> 6.28** the same way. **The DS-side item can be
closed for these two consumers**; the token's own contract is unchanged.

#### What the comparator saw, and what was confirmed by eye

52 failed / 150 passed, with **nothing failing outside the 13 states** — `/`,
`/more`, `/steward`, `/transfer` and all four non-default finance tabs stayed
green, so nothing leaked. Diff artifacts were opened rather than trusted from
the pixel count: on `finance-holding-fd-375-light`, `finance-375-light` and
`finance-holding-fd-reminder-375-dark`, **the changed region is exactly the card
rectangle and nothing else on the screen moved.**

Re-minted with `npm run test:e2e:update`, which maps to `--update-snapshots=all`
— the only form that decides by `Buffer.compare` rather than routing through the
comparator. **Bounded by hashing all 96 baselines before and after: exactly 52
changed, 44 byte-identical, 96 total, zero added and zero deleted.** All three
arms of `baselines.spec.ts` therefore stayed green throughout, per the Gate α
correction.

#### One flake, on the re-mint run only, attributed and not reproduced

The re-mint run reported **2 failed / 200 passed** — both
`section-headers.spec.ts` "not vacuous" guards, both failing at `harness.ts:796`
where `gotoRoute` asserts `data-theme` is `''` in light and found the attribute
**absent** (`null`). Neither writes a baseline, and all 52 files were still
regenerated.

**IT IS A MOUNT-TIMING RACE IN THE HARNESS, EXPOSED BY LOAD, NOT SOMETHING THIS
GATE CAUSED** — two CSS colour endpoints and a package pin cannot change when
React sets an attribute. The signature is the Gate A outlier's: that run took
**10.9 minutes** against 6.8-7.0 for every other run in this gate. Over 100
other light states passed the identical assertion in the same run, and the two
subsequent clean runs were **202 passed / 0 failed** each. Recorded rather than
closed: if it recurs off-load, `gotoRoute`'s light-theme assertion is where to
look.

### Item 3 — the net-worth card reverted to blue-to-teal, on a design ruling

The information binding above shipped, passed AA with margin, and was reverted
within the same gate. `.mvp-finance__networth` now reads:

```css
background-image: linear-gradient(
  109deg,
  var(--alias-primary-700) 0%,
  var(--brand-teal-600) 100%
);
```

`--alias-primary-700` -> `--brand-blue-700` `#024299` at 0%; `--brand-teal-600`
`#008ab7` at 100%. Composition unchanged — still 109deg, still 0%/100%, this
card's Figma geometry through all three states of this rule (D10 raw brand ->
item 2 information pair -> item 3 this pair). `.mvp-finance__hero` was
explicitly not touched and keeps the item-2 information-pair teal binding.

**WHY THE PASSING BINDING WAS REVERTED: THE INFORMATION PAIR IS A COMPLIANCE
PAIR, NOT A DISPLAY PAIR.** `--mapped-surface-information-default` /
`-default-pressed` is a resting/pressed interaction couple, not two ends of a
gradient meant to be looked at. Used as a gradient it runs teal-700 into
near-black teal-900 (`#00222e`), which reads as a dark slab rather than the
brand's blue-to-teal sweep — and it collided visually with the hero card
directly beneath it on the same screen, two adjacent cards flattened onto the
same dark ramp. **Contrast was never the objection; AA compliance is not
sufficient justification for a token pair that looks wrong**, and Teku ruled
display over compliance here, explicitly declining to hold the gate for the AA
misses this reintroduces (see below).

**WHY teal-600 SPECIFICALLY CANNOT BE REACHED THROUGH THE MAPPED-SURFACE
TIER, WHICH IS WHY THE COMPLIANCE PAIR COULDN'T EXPRESS THIS LOOK EITHER.**
`--mapped-surface-information-*` ships exactly three members — `-default`
(700), `-default-hover` (800), `-default-pressed` (900) — so 700 is the
LIGHTEST teal that tier offers. `--alias-information-600` does exist and does
resolve to `var(--brand-teal-600)` (verified in v1.10.0's dist), but it is
bound at the mapped tier only to border/icon/text roles, never to a surface. So
this exact look was unreachable from the surface tier regardless of which pair
was chosen there; `--brand-teal-600` (equivalently `--alias-information-600`,
byte-identical) is the correct place to reach for it, matching the raw-`--brand-*`
precedent already in this file (`.mvp-finance__header-bg`,
`.mvp-home__header-bg`).

**MEASURED — real Chromium screenshot, same method as item 2**: all
descendants `visibility: hidden`, animations finished, DPR 2, sampled inside
the rounded rect. Worst point is the teal-600 (100%) endpoint in every case,
identical light/dark:

| | computed | rendered @375 | rendered @430 |
|---|---|---|---|
| whole card vs white | **3.9480** | 3.9480 | 3.9470 |

**Unlike item 2, rendered and computed agree almost exactly here — 0.0000 to
0.0010 apart — and that is geometry, not a change of instrument.** The sampler
still insets 2px x DPR and still excludes the radius corners; item 2's worst
point sat in a corner (t=0, top-left) where that inset under-reads, while this
pair's worst point sits at t=1 along the bottom-right straight edge, which the
inset still reaches. The "rendered reads high" caveat from item 2 is specific
to a corner-seated worst point and does not generalise to this pair.

**THREE TEXT ROLES ON THIS CARD NO LONGER CLEAR AA 4.5:1, AND THAT IS ACCEPTED
RATHER THAN MISSED**, per Teku's ruling on the number below (`#008ab7` vs
white computes to 3.9480, under the 4.5 floor, at the bottom-right endpoint —
the figure Teku supplied and this measurement confirms exactly):

| role | fg | @375 | @430 | |
|---|---|---|---|---|
| `.mvp-finance__networth-label` | `#ffffff` | 7.2725 | 7.5394 | pass |
| `.mvp-finance__networth-amount` | `#ffffff` | 4.5371 | 4.4305 | **fails @430** |
| axis label 1 (leftmost) | `#e7eaed` | 6.2433 | 6.4001 | pass |
| axis label 2 | `#e7eaed` | 5.3292 | 5.3899 | pass |
| axis label 3 | `#e7eaed` | 4.5526 | 4.6044 | pass |
| axis label 4 | `#e7eaed` | 3.9344 | 3.9344 | **fails, both widths** |
| axis label 5 (rightmost) | `#e7eaed` | 3.3817 | 3.3817 | **fails, both widths** |

None qualifies as WCAG large-scale. The axis labels sit on
`--mapped-text-on-color-caption` (`#e7eaed`, not white), which is why their
figures run ~0.68 worse than the endpoint-vs-white number: `#008ab7` is 3.9480
against white but only 3.2693 against `#e7eaed`, so the rightmost label's
ceiling is set by the teal-600 endpoint itself and cannot be raised without
darkening that endpoint — which is the slab problem again. **Do not
re-open this as a fresh AA finding and do not quietly re-bind the rule to chase
the number; the trade was made deliberately and Teku declined to hold the gate
on it.**

**Theme-invariant, confirmed rendered, by the pre-item-2 mechanism**: raw
`--brand-*` values cannot flip, and `--alias-primary-700` is declared once at
bare `:root`. Every figure above is identical light/dark, at both viewports.

**Isolation, measured not assumed.** The suite reported exactly **4 failed /
198 passed** — `/finance` at both viewports, both themes, and nothing else.
Note this is **1 walk state, not the 26 baselines a flat multiply against item
2's 13-state, two-site count would suggest**: `NetWorthCard` renders in exactly
one place, `FinanceOverview`, which is `/finance`'s default `overview` tab —
confirmed by grep, one import site. The diff artifact
(`finance-375-light-diff.png`) was opened, not inferred from the pixel count:
the changed region is exactly the card rectangle, nothing else on the screen
moved, and — critically — **no `finance-holding-*` baseline appears among the
4 failures**, which is the direct proof that `.mvp-finance__hero` was not
touched.

Re-minted with `npm run test:e2e:update`. **Hashed all 96 baselines before and
after: exactly 4 changed, 92 byte-identical, 96 total, zero added, zero
deleted.** All four changed files are `finance-{375,430}-{light,dark}`.

**Two consecutive clean full runs: 202 passed / 0 failed each** (6.4m, then
the second logged in the gates table below).

### Final measured state, both cards, at Gate 31 close

| card | binding | worst vs white, computed | AA status |
|---|---|---|---|
| `.mvp-finance__hero` | `--mapped-surface-information-default` -> `-default-pressed` (teal-700 -> teal-900) | 6.3611 | passes, every role, margin |
| `.mvp-finance__networth` | `--alias-primary-700` -> `--brand-teal-600` (blue-700 -> teal-600) | **3.9480** | **fails on 3 of 7 text roles — accepted per Teku's ruling** |

The two cards **no longer share a binding**, which is a deliberate, visible
asymmetry: the hero optimises for compliance, the net-worth card for display
match to Figma's blue-to-teal intent. Do not "fix" this by re-unifying them —
that was tried (item 2) and reverted (item 3) in this same gate.

### The MVP does not version itself, and that is the convention

**DO NOT BUMP `package.json`'s `version` HERE.** It reads `"0.0.0"` and has read
`"0.0.0"` since the initial scaffold (`bd94e4d`). `git log -p -- package.json`
shows the line **added once and never modified** across every commit that has
touched the manifest since — including five DS re-pins (v1.5.0, v1.6.0, v1.7.0,
v1.8.0, v1.9.0) and Gate 30. It is the Vite scaffold default.

**THE MVP'S ACTUAL VERSIONING MECHANISM IS THE `mvp-gateN` GIT TAG**, which is
Teku's to create. Bumping the manifest would break the pattern rather than
follow it, and would invent a version number nothing consumes — this package is
never published and nothing resolves it.

## The DS v1.11.0 re-pin and the balance-grid fill (Gate 33)

The pin moved `v1.10.0` (`0cafb111ebde`) -> `v1.11.0` (`ec9ffe05ff32`). **The
re-pin moved ZERO pixels**; all four re-minted baselines belong to the fill
change, which is a separate, intentional change made in the same gate. One
commit, two findings — keep them apart when reading the diff.

### The defect, derived in this repo rather than carried

`CardBalance` renders at **exactly one site**, `FinanceOverview.tsx:45` — found
by grepping `.tsx`/`.ts`/`.css` outside `node_modules` (seven hits, six of them
prose) and cross-checked against the whole router table in `App.tsx:23-72`.
**There is no "See all" balances screen**; the "See all" strings in `src/` are
inert `SectionHeader` labels carrying no route. So `/finance`'s default
`overview` tab is the entire blast radius, and it is 1 walk state, not a family.

**THE CONTAINER IS A WRAPPING FLEX ROW, NOT A CSS GRID**, despite every name in
it saying "grid". `grid-template-columns` computes to `none` at both viewports;
the analogue of a track is the flex item's resolved width. Do not go looking for
track sizing.

Measured at DPR exactly 2 through a Playwright-launched browser, animations
finished:

| | 375 before | 375 after | 430 before | 430 after |
|---|---|---|---|---|
| container content box | 16 -> 359 (343) | unchanged | 16 -> 414 (398) | unchanged |
| net-worth card, border box | 16 -> 359 (343) | unchanged | 16 -> 414 (398) | unchanged |
| column-gap / row-gap | 8 / 8 | 8 / 8 | 8 / 8 | 8 / 8 |
| flex item width | 167.5 | 167.5 | **195** | 195 |
| paired card width | 167.5 | 167.5 | **172** (capped) | **195** |
| lone 9th card width | **172** | **167.5** | **172** | **195** |
| leftover, card to item right | 0 | 0 | **23 per card** | **0** |
| card right edge vs net-worth right | 0 | 0 | **-23** | **0** |

**THE CAP BOUND ONLY AT 430, WHICH IS WHY ONE VIEWPORT COULD NOT SEE IT.** At
375 the two-column arithmetic lands at 167.5, under the DS's `max-width: 172px`,
so the cap never engaged. At 430 it lands at 195, the cap clamped every card to
172, and 23px collected on the right of all eight. Same shape as the Gate 13
`sizing='fill'` finding — a real geometry fact invisible at the pinned viewport,
and part of what 430 was added for.

**FIGURES WITHDRAWN AND THEN RE-DERIVED.** 195 and 23 had been circulating from
a review thread with no measurement behind them; both are **confirmed** above.
172 is confirmed as the DS `max-width` and as the pre-fix rendered width at 430.
**161 is real as the DS's declared `width` but never renders here**, because
`.mvp-finance__grid-item > * { width: 100% }` overrides it. **191 could not be
reproduced at either viewport** and appears to be a corruption of 195.

### Two halves, and only the second one moves anything

| half | what it is | effect alone |
|---|---|---|
| the re-pin | `package.json` + lockfile to v1.11.0 | **zero pixels** — see the alias note below for why this is nearly tautological locally |
| `sizing="fill"` | one prop at `FinanceOverview.tsx:45` | the whole change |

The prop is declared `sizing?: 'fixed' or 'fill'` (a union of the two string
literals) and defaults to `"fixed"`, and the new CSS rule is
`.mn-card-balance--fill{width:auto;max-width:none;flex:1 1 0}` — a class nothing
applies until the prop is passed. **`min-width: 128px` is NOT released by the
fill class** and still holds on every card; the narrowest rendered card is 167.5.

Note the prop also arrived on `CardFeaturesAndEducation` in the same release,
with the same `"fixed"` default, and is not passed there.

### The lone ninth card is held to one column — Teku's ruling

**THE FILL PROP ALONE STRETCHES THE UNPAIRED FINAL CARD ACROSS THE WHOLE ROW**
(172 -> 343 at 375, 172 -> 398 at 430), because releasing `max-width` lets the
item's `flex: 1 1 0` consume the remainder. That was shipped, measured, and
**reverted within the same gate on a design ruling from a reference screenshot**:
a lone trailing card stays one column wide, left-aligned, with empty space to
its right.

```css
.mvp-finance__grid-item:last-child:nth-child(odd) {
  flex: 0 1 calc((100% - var(--spacing-200)) / 2);
}
```

**THE CONSTRAINT BELONGS ON THE CONTAINER, NOT ON THE COMPONENT, AND THAT IS THE
POINT RATHER THAN A COMPROMISE.** `sizing="fill"` means the CONTAINER decides
the width. A container that decides its lone item is one column wide is using
the prop as intended; it is not an override, and it is not a breach of rule 1 or
rule 4. The prop stays on all nine cards.

**KEYED TO PARITY, NOT TO A COUNT.** `:last-child:nth-child(odd)` matches only
when the final card is unpaired and matches nothing at all on an even number of
holdings, so it survives the fixture growing or shrinking. **An earlier
recommendation argued against this rule on the grounds that it "rots when the
holdings count changes" — that was wrong, and it was the deciding point in a
recommendation that has since been overturned.** Only a rule keyed to a literal
count would rot.

**`flex-grow: 0` IS THE LOAD-BEARING HALF.** Left at the `1` inherited from
`.mvp-finance__grid-item`, the item consumes the whole row whatever basis is
set, and the rule looks applied while doing nothing. Ship the basis without the
grow reset and the change is invisible.

**THE BASIS SHARES THE CONTAINER'S TOKEN RATHER THAN COPYING ITS LITERAL.** It
reads `var(--spacing-200)`, the same token the container's `gap` shorthand uses.
**CSS cannot read a value back out of a `gap` shorthand**, so sharing the token
is as close to a single source as this can be expressed; it computes to
`calc(50% - 4px)`. Move the token and both move.

**THE LIVE HOLDING COUNT IS NINE**, established three ways: nine top-level `id:`
entries in `HOLDINGS` (`src/data/holdings.ts:73`), passed through unfiltered by
`AccountsProvider.tsx:82`, and nine rendered `.mvp-finance__grid-item` nodes.
Nine is odd, so the rule is live rather than dormant.

### The four acceptance criteria, measured after

Identical at 375 and 430, all four met, every delta exactly 0:

| criterion | 375 | 430 |
|---|---|---|
| two cards per row | 2,2,2,2,1 | 2,2,2,2,1 |
| column-gap = row-gap | 8 = 8 | 8 = 8 |
| paired right edge = net-worth right edge | 0 | 0 |
| lone card width = paired card width | 0 (167.5) | 0 (195) |
| lone card left edge = left column | 0 (x=16) | 0 (x=16) |

**CRITERION 2 WAS NEVER BROKEN AND CANNOT BE.** Both gaps come from one `gap:`
shorthand, so they cannot diverge. **Criterion 3's container half was also
already correct before the gate** — the grid's right CONTENT edge equalled the
net-worth card's right BORDER edge at both viewports, before and after. What was
broken was the CARD's right edge inside its item. Comparing against the
net-worth card's *content* edge (343 / 398) instead would be comparing against
the inside of that card's own padding, which is not a page margin.

### Baselines: four, predicted and bounded

Predicted from the single-site list before running —
`finance-{375,430}-{light,dark}` — and the actual failing set matched exactly,
twice (once for the fill change, once for the lone-card revert). Re-minted with
`--update-snapshots=all`; all 96 baselines hashed before and after, **exactly 4
changed, 92 byte-identical, 96 total, zero added and zero deleted**, so all three
arms of `baselines.spec.ts` stayed green throughout.

### Two protocol changes, and they carry forward

**1 · `npm run build:package` IS NOW A STANDING GATE ON EVERY RE-PIN.**
`vite.config.ts:30-57` aliases `@monarch/design-system` to the sibling DS
**source** checkout whenever that folder exists, so **`node_modules` IS NOT IN
THE LOCAL RENDER PATH** — not for `npm run dev`, and not for `npm run build`.

**THE CONSEQUENCE IS THAT A RE-PIN'S "ZERO PIXELS MOVED" RESULT IS NEARLY
TAUTOLOGICAL LOCALLY, AND IT LOOKS LIKE EVIDENCE.** At this gate the DS working
tree was already at v1.11.0 before the pin moved, so the pre-re-pin build —
nominally v1.10.0 — **already contained `.mn-card-balance--fill` and emitted a
byte-identical bundle** (`index-Mrdm5WvD.css`, 161,223 bytes, same content hash
before and after the install). The three package-path checks the gate ran
(installed `package.json` version, the rule in `dist/index.css`, the prop in the
`.d.ts`) all verify the path that is NOT being exercised.

Nothing here is wrong — the alias is deliberate and is the DS iteration loop —
but a re-pin gate must run `npm run build:package` to exercise what production
compiles. It did, exit 0, with the fill rule present exactly once in that bundle
too. **Both paths confirmed consumable; neither result substitutes for the
other.**

**2 · AN `--update-snapshots=all` RUN IS NEVER ITSELF A VERIFICATION.** It
overwrites the very files it compares against, so its green is unfalsifiable —
it reported 202 passed while rewriting four baselines. **A separate clean
`npm run test:e2e` afterwards is mandatory**, and that run is the real green.
Both were done here; the clean run reported 202 passed with baselines
byte-stable across it.

### What this gate changed

`package.json` + `package-lock.json` (the pin), one prop at
`FinanceOverview.tsx:45`, one new rule plus two corrected comment blocks in
`finance.css`, one corrected comment in `visual.spec.ts`, and four re-minted
baselines. No spec was added, no CSS rule was deleted, and `index.html` is
untouched.

**TWO STALE COMMENTS WERE CORRECTED RATHER THAN LEFT BESIDE THE NEW CODE.** Both
`finance.css` and `FinanceOverview.tsx` asserted that the lone ninth card
"sitting alone on the final row is correct wrapping behaviour", and
`finance.css` further claimed "the cap is still `CardBalance`'s own
`max-width: 172px`". After this gate the cap is gone and the lone card is held
by an explicit rule, so both assertions had become the opposite of the code.

## The DS v1.15.0 re-pin, the pointer park and the icon set (Gate 38 / 38B)

Three changes, one branch, and they must be read apart. The pin moved
`v1.11.0` (`ec9ffe05ff32`) -> `v1.15.0` (`c6c7f2f1cd73`), **crossing four
releases** — v1.12.0, v1.13.0, v1.14.0 and v1.15.0 all exist as tags, so this
is not a single-release step and its delta is correspondingly wider than the
re-pins before it. Gate 38 landed the pin plus the icon/manifest set; Gate 38B
added the harness pointer park and re-minted. **All 96 baselines changed.**

`lint:linkage` PASS with all four sources agreeing: manifest pin
`github:TekuBrah/Monarch-Design-System#v1.15.0`, `node_modules` 1.15.0, lock
`resolved` `c6c7f2f1cd73`, DS working tree HEAD `c6c7f2f1cd73` (tag v1.15.0).

### The resting-state token moved in BOTH themes

**THE DECLARATION DELTA IN `globals.css` IS EXACTLY ONE FAMILY —
`--mapped-text-primary-*` — AND ONLY ONE OF ITS THREE MEMBERS IS A RESTING
STATE.** Derived by diffing the DS's own `src/styles/globals.css` across the
two tags, not from a changelog:

| token | light `:root` | dark `[data-theme="dark"]` |
|---|---|---|
| **`--mapped-text-primary-default`** | `--alias-primary-500` -> **`-600`** | `--alias-primary-500` -> **`-300`** |
| `-default-hover` | `-600` -> `-700` | `-400` -> `-200` |
| `-default-pressed` | `-700` -> `-800` | `-300` -> `-150` |

Resolved to brand values at v1.15.0 (`--alias-primary-N` -> `--brand-blue-N`,
each declared once at bare `:root`):

| | before | after |
|---|---|---|
| light resting | `#046eff` (blue-500) | **`#0358cc`** (blue-600) — darker |
| dark resting | `#046eff` (blue-500) | **`#68a8ff`** (blue-300) — lighter |

The hover and pressed members changed too and **neither can reach a baseline**:
hover is unreachable by construction (below), and no walk state captures a
pressed control.

#### What the resting token recolours — 12 rules, and one is on every screen

Twelve consuming rules, found by walking the shipped DS `dist/index.css`
rule-by-rule plus a grep of MVP `src/`:

- `.mn-btn--secondary` and `.mn-btn--tertiary`, via `--btn-text`
- `.mn-bottom-nav__item--selected .mn-bottom-nav__label`
- `.mn-card-balance__name`
- `.mn-link--default:not(.mn-link--visited)`
- `.mn-badge--inverted`
- `.mn-card-monthly-budget__details`
- `.mn-filter-chip--selected`
- `.mn-menu-item--selected` (two rules: label/crypto-name/trailing-label, and crypto-sub)
- `.mn-side-nav__tab--selected .mn-side-nav__tab-label`
- MVP `src/flows/homepage/homepage.css:131`

**`.mn-btn--secondary` IS WHY ALL 96 BASELINES MOVED RATHER THAN A SUBSET.**
The shell's theme-switch affordance renders as
`button.mn-btn.mn-btn--secondary.mn-btn--s` — read off the live DOM in this
gate's hover census, not inferred from the JSX — and `.mvp-shell__theme-switch`
is in `AppShell`, so it is present on **every one of the 24 walk states, in both
themes**. Its label colour is `--btn-text`, i.e. the token that moved.

**THE PER-BASELINE PIXEL ATTRIBUTION WAS NOT DONE, AND THAT IS STATED RATHER
THAN GLOSSED.** Content-column Gate 1 proved its 20 stale baselines to 100%
pixel coverage with zero orphan pixels. This gate did not do that for 96. What
was measured is (a) the declaration delta is this one family, (b) a consumer of
it renders on every state, and (c) exactly 96 baselines changed. That is
consistent, and it is weaker than attribution. If a future session needs the
stronger claim, the instrument is Gate 1's, and per Gate 26 it must include the
`[style]` sweep for runtime-composed tokens — `titleToken` in
`src/data/insights.ts` still holds the only three, and **none of them is
`mapped-text-primary-default`**, so that path is clear here.

### The suite has ZERO hover coverage, BY CONSTRUCTION

**THIS IS THE MOST IMPORTANT THING v1.15.0 CHANGED ABOUT WHAT THE HARNESS CAN
SEE, AND IT IS INVISIBLE IN THE PIXEL COUNT.**

`playwright.config.ts:72` sets `hasTouch: true`. Chromium then reports
`hover: none` for the primary pointer, so **every rule behind
`@media (hover: hover)` is dead inside this suite** — not merely un-hovered,
but unreachable at any pointer position.

Measured across the tags with `git grep` in the DS, and the transition is
abrupt rather than gradual:

| DS tag | `hover: hover` guards in `src/**/*.css` |
|---|---|
| v1.11.0 – v1.14.0 | **0** |
| **v1.15.0** | **39** |

And in the artefact this app actually ships — the single `dist/assets/index-*.css`
emitted by `npm run build:package` — measured by brace-matching each guard's
block rather than by grepping lines:

```
@media(hover: hover) blocks : 39
:hover inside a guard       : 87
:hover OUTSIDE any guard    : 0
```


**THE FILENAME IS DELIBERATELY NOT WRITTEN OUT, AND THAT IS A CORRECTION MADE
AT GATE 39.** Gate 38 recorded this measurement against `index-SvxPQyoN.css`.
That name is a Vite CONTENT HASH: it renames on any change to the emitted CSS —
a DS re-pin, an MVP rule, a token move — so quoting it dates the measurement to
a build rather than to a release. Worse, it is not even stable across this
repo's two build paths on identical source: at Gate 39, `npm run build` emitted
`index-CyFurvJV.css` while `npm run build:package` emitted `index-SvxPQyoN.css`,
because the two feed Rollup different module graphs (see "Two resolution paths"
under Known conditions). The glob plus the command that produced it identifies
the artefact without rotting. Re-derive the three counts with the brace-matching
walk rather than trusting them across a DS upgrade; they were re-confirmed at
Gate 39 under the pinned v1.15.0 as 39 / 87 / 0, unchanged.
MVP `src/` contributes **zero** `:hover` of its own.

**SO 87 OF 87 HOVER RULES ARE UNTESTABLE HERE, AND THE SUITE WILL NEVER GO RED
FOR ANY OF THEM.** That is the correct trade for a mobile banking app — the
target device has no hover — but it must be written down, because the failure
mode is a future session reading "202 passed" as covering the DS hover layer.
It does not cover one rule of it. If hover ever needs coverage it needs a
SECOND context with `hasTouch: false`, which is a new axis and a new baseline
set; **do not get it by flipping `hasTouch`**, which would silently re-render
every existing baseline.

**IT ALSO DATES THE HAZARD THE PARK REMOVES.** Before v1.15.0 those hover rules
were unguarded, and an unguarded `:hover` applies whenever the element is
hovered regardless of the device's pointer capability. So a pointer left
resting on a control COULD paint into a baseline at v1.11.0–v1.14.0 and cannot
at v1.15.0. The park's hover benefit is now **prospective**: it protects
against the guards being removed, against `hasTouch` being changed, and against
an MVP-local hover rule being written.

### The pointer was never parked, and it was not only the theme toggle

Playwright leaves the virtual pointer where it clicked. Nothing in the harness
moved it, so every control the harness operated stayed hovered for the rest of
its test — **mouse position encoded as if it were app state**.

**THE CARRIED DIAGNOSIS WAS "`gotoRoute` LEAVES THE POINTER ON THE THEME
SWITCH, SO DARK CAPTURES ARE AFFECTED". THAT IS ONE OF THREE RESIDUES AND IT
COVERS LESS THAN HALF THE DAMAGE.** Censused over all 24 walk states x 2
viewports x 2 themes by reading `document.querySelectorAll(':hover')` at each:

| residue | interaction site | states | themes |
|---|---|---|---|
| `.mvp-shell__theme-switch button` | `gotoRoute` theme click | **14** | dark only |
| `.mn-tab--selected` | `activateTab` | **7** | **both** |
| `.mn-blanket` (x2), `.mvp-finance__row` (x1) | `openOverlay` | **3** | **both** |

14 + 7 + 3 = 24, i.e. every walk state carried exactly one residue. In
state/theme pairs that is **34 of 48**, and **10 of the 24 states carried stale
hover in LIGHT** — a theme the carried diagnosis said was unaffected. A park
placed only after the theme click would have cleared 14 of 34 and looked
finished: the Gate 13 half-fix shape, in a new place.

**SO THE PARK IS CALLED FROM ALL FOUR INTERACTION EXITS**, not one:

1. `gotoRoute`, after the theme click
2. `activateTab`, after the `aria-selected` settle
3. `openOverlay`, at its **no-confirm** exit (pointer on the opening control)
4. `openOverlay`, at its **confirm** exit (pointer on the confirm button)

Exits 3 and 4 are separate calls deliberately: one park at the end of the
function would miss the no-confirm states, and one at the top would be undone by
the confirm click.

#### `(-1, -1)`, and why `(0, 0)` was measured and rejected

`POINTER_PARK` is `(-1, -1)` — outside the initial containing block on **both**
axes, so the hit test has no target and `:hover` matches **nothing at all**,
not even `html`. Confirmed empty in all 96 states.

**IT IS INERT BY CONSTRUCTION, WHICH IS THE ENTIRE REASON FOR THE NEGATIVE
COORDINATE.** An in-viewport park would have to be argued against the layout of
24 states at two widths and re-argued whenever a screen changed. A point off
the top-left corner cannot be covered at any viewport size, so no width is
plumbed in and there is no second literal to drift out of step with `VIEWPORTS`
— the hazard Gate A's `DEFAULT_VIEWPORT` import exists to prevent.

**`(0, 0)` IS THE OBVIOUS CHOICE AND IT IS WRONG, MEASURED.** It is INSIDE the
viewport and lands on real content in **all 96** states: `.mn-status-bar` on the
home and finance screens, `.mvp-coming-soon` on `/transfer`, `/more` and
`/steward`, and `.mn-blanket` on the two modal states. A far-outside point —
`(width + 500, height + 500)` — also reads empty, but it must be derived from
the viewport, which reintroduces exactly the drift the negative coordinate
avoids.

#### `assertPointerIsParked` — and its negative control

The assertion runs in `gotoState`, after every interaction a walk state
performs, and reads `document.querySelectorAll(':hover')`, permitting only
`html` and `body`. No new dependency: the selector is CSS the browser already
implements.

**IT IS STATED IN `gotoState` RATHER THAN IN `visual.spec.ts`** so it also
covers `routes.spec.ts` and `section-headers.spec.ts`, which read computed
styles a hover could move.

**IT IS EXPRESSED AS "WHAT DOES THE PAGE THINK IS HOVERED", NOT "WHERE IS THE
POINTER".** The second is what a coordinate check would answer; the first is
what reaches the pixels, and it is the one that breaks when a future
interaction site is added with no park.

**PROVEN BY NEGATIVE CONTROL, NOT ASSUMED.** Disabling the `activateTab` park
alone — leaving the other three in place — turned `routes.spec.ts` red at
**14 failed / 35 passed**, naming exactly the 7 tab states in **both** themes.
The harness was then restored and hash-verified byte-identical
(`22ea5d85…630387`).

### The 5 divergent baselines were a STALE COMPOSITED FRAME, not a hover style

**READ THIS BEFORE CONCLUDING THE PARK IS A HOVER FIX. IT IS NOT.**

The park is provably unable to change a hover style here — 0 of 87 hover rules
are reachable under `hasTouch`. Yet it moved exactly five baselines, and the
control that isolates them is a suite run with the park reverted:

| | visual tests |
|---|---|
| without the park | **91 failed / 5 passed** |
| with the park | **96 failed / 0 passed** |

The failing set with the park is a **strict superset**, adding precisely:

```
finance-holding-main-375-dark        finance-holding-main-430-dark
finance-holding-joint-375-dark       finance-holding-joint-430-dark
finance-holding-unit-trust-375-dark
```

**ALL FIVE DARK, AND ALL FIVE DIFFER IN THE SAME PLACE.** Decoding each new
capture against its committed baseline:

| | |
|---|---|
| differing bbox | **`[16, 690, 60, 715]`** on all five |
| differing pixels | 1120 – 1122 |
| max channel delta | **25** |
| committed baseline, fill plateau | **242** |
| with the park, fill plateau | **255** |

THE PLATEAU STEP IS 13 AND THE MAX DELTA IS 25, SO THEY ARE TWO FIGURES AND NOT
ONE. 242 -> 255 is the flat fill; the 25 is the worst pixel anywhere in the box,
on the antialiased edge, where the two renders diverge further than the flat
fill does. Do not subtract one from the other and expect them to agree.

That bbox is the theme-switch Button, recorded elsewhere in this file as
`[16, 690, 60.5, 716]` — the same element the Gate 17 raster flake sat on.

**THE MECHANISM IS THE COMPOSITE, AND A CONTROL SEPARATES IT FROM HOVER.**
Sampling the button after parking and then again after deliberately hovering it
returns the **same** painted value both ways. Hover is not the variable. The
variable is whether **any** pointer move followed the click: without one the
capture keeps the frame composited at click time (242); any mousemove forces the
recomposite and the button settles to its resting 255. These five states are
simply the ones where v1.15.0 changed nothing else, so the stale frame was the
only difference left to see.

**NO SLEEP AND NO TIMER WAS ADDED, AND NONE WAS NEEDED.** The park alone clears
it. A `waitForTimeout` here would have been the Gate 17 mistake — a tolerance
wearing a fix's clothes.

### The re-mint, bounded by hash

`npm run test:e2e:update`, which is `--update-snapshots=all` at
`package.json:16` — **never the bare flag**, whose `changed` preset routes the
decision through the comparator and would rewrite nothing on a baseline the
comparator calls green (Gate 30).

All 96 baselines were SHA-256'd before and after into a scratch manifest
outside the repo:

| | |
|---|---|
| hashed before | **96** |
| changed | **96** |
| byte-identical | **0** |
| added / deleted | **0 / 0** |

Every one is a modification to an already-tracked path, so **all three arms of
`baselines.spec.ts` stayed green throughout**, per the Gate α correction.

**THE UPDATE RUN IS NOT THE VERIFICATION.** It reported 202 passed while
rewriting all 96 files it was comparing against. The real green is the separate
clean runs afterwards: **202 passed / 0 failed, twice**, with all 96 baselines
byte-identical across both — and a third clean 202 after a late comment-only
edit. The standalone baseline guard reports **3 passed**, with 96 derived
expected names = 96 on disk = 96 tracked and **zero orphans**.

### The icon set — measured, not assumed

Gate 24 stopped at a census and said the manifest was blocked on artwork. It is
no longer blocked. Seven files were added under `public/` and `index.html`
gained 29 lines.

**ARTWORK PROVENANCE.** `public/favicon.svg` is a 24x24 viewBox whose first
path is **character-identical to the first path of the DS's
`Assets/logo/brand/Monarch logo, Style = Thin.svg`**, fill `#046EFF`, over an
added opaque `<rect width="24" height="24" fill="#ffffff"/>`. That plate is the
thing Gate 24 named as missing.

**THE FOUR PNGs, read from the IHDR and decoded scanline-by-scanline:**

| file | size | colour type | plate | mark | bytes |
|---|---|---|---|---|---|
| `icon-192.png` | 192x192 | **2 = RGB, no alpha** | `#ffffff` | `rgb(4,110,255)` | 3,554 |
| `icon-512.png` | 512x512 | 2 = RGB, no alpha | `#ffffff` | `rgb(4,110,255)` | 10,014 |
| `icon-maskable-512.png` | 512x512 | 2 = RGB, no alpha | `#ffffff` | `rgb(4,110,255)` | 8,635 |
| `apple-touch-icon.png` | **180x180** | 2 = RGB, no alpha | `#ffffff` | `rgb(4,110,255)` | 3,460 |

**COLOUR TYPE 2 IS THE LOAD-BEARING MEASUREMENT, NOT A CURIOSITY.** These PNGs
carry no alpha channel at all, so the iOS requirement Gate 24 flagged — *iOS
does not honour alpha and renders transparent pixels black* — cannot be
violated by `apple-touch-icon.png`. It is opaque by encoding, not by
convention.

The mark is `rgb(4,110,255)` = `#046eff` = `--brand-blue-500`, i.e. the DS
brand logo's own fill — **which is one ramp step away from the manifest's
`theme_color`**. See the correction under Deploy hygiene: that is correct, not a
drift.

Ink aspect ratio is **~1.82 on all four** (360x198, 288x158, 136x74, 126x70),
which is what confirms one artwork source rather than four independent exports.

**THE MASKABLE DERIVATION, against the 80%-diameter safe circle** (the mark must
sit inside a circle of radius 40% of the icon width, i.e. >=10% padding a side):

| | min padding | as % of width | max ink radius | safe radius | ink / safe |
|---|---|---|---|---|---|
| `icon-maskable-512` | **112 px** | **21.9%** | 161.2 px | 204.8 px | **78.7%** |
| `icon-512` | 76 px | 14.8% | 201.9 px | 204.8 px | **98.6%** |
| `icon-192` | 28 px | 14.6% | 75.8 px | 76.8 px | 98.7% |
| `apple-touch-icon` | 27 px | 15.0% | 70.4 px | 72.0 px | 97.8% |

**THIS IS WHY THE MASKABLE IS A SEPARATE FILE AND NOT THE `any` ICON REUSED.**
The `any` icons clear the 10% padding rule comfortably, but their ink reaches
**97.8–98.7% of the safe radius** — inside the circle by well under two percent,
which is no margin at all once a launcher applies its own mask inset. The
maskable variant pads to 21.9% and lands at 78.7%. Declaring `icon-512` as
`purpose: "maskable"` would satisfy the padding rule on paper and clip the mark
on a real device.

`favicon.ico` is 2,319 bytes and `favicon.svg` 988 bytes.

**THE GUARDRAIL NOW CARRIES A SECOND EXEMPTION, AND IT IS NEW AT THIS GATE.**
`lint:tokens` scans 39 files and reports 2 exemptions: the pre-existing frame
width at `src/index.css:93`, and **`index.html:30`, the `theme-color` meta**.
The committed `index.html` carries zero `token-exempt` markers, so this one
arrived here. Gate 24 predicted both the flag and the need for the marker; the
marker sits on the same physical line as the literal, per Gate 18.

**`public/manifest.webmanifest` IS STILL INVISIBLE TO THE GUARDRAIL** —
`SCAN_DIRS = ['src']`, `SCAN_FILES = ['index.html']` — which is exactly how the
`theme_color` value in the Gate 24 table stayed wrong from v1.7.0 through
v1.15.0 without anything reporting it. See the corrected table under Deploy hygiene
above; the two hex values in the manifest must be re-derived by hand on every DS
re-pin.

### What this gate changed

**THE FIGURES BELOW ARE THE COMMIT'S, NOT A WORKING TREE'S — anchored at Gate
39.** Gate 38 wrote them while its own tree was still dirty, which made them
unfalsifiable the moment it was committed. They are now stated against the
commit that carries them, `6d074f8` (tag `mvp-gate38`), and re-derivable at any
time with:

```bash
git show --numstat --format="" mvp-gate38 | grep -v visual.spec.ts-snapshots
```

`package.json` + `package-lock.json` (the pin), `index.html` (**+29, -0**),
seven new files in `public/`, `e2e/harness.ts` (**+114, -0** — the park, the
assertion and their four call sites), and 96 re-minted baselines. No spec was
added, no CSS rule was touched, and `src/` is untouched — the token change is
entirely DS-side. Re-derived at Gate 39 against `6d074f8`: all three numbers
confirmed exactly, with `CLAUDE.md` itself at +396/-7 and `package-lock.json` at
+3/-3 as the only other non-baseline paths.

### Deliberately not in scope

The DS repo (working tree clean at `c6c7f2f`, untouched); the stale remote
branches; the `nanoid` advisory (`npm audit fix` NOT run); the Playwright pin
(still `^1.62.1`, resolving 1.62.1); `hasTouch`, the viewport list, the theme
list, the device scale factor and the state walk (all unchanged); Flow 8; and
the three AA shortfalls on the net-worth card ruled on at Gate 31.

## Cleanup — deps, manifest Content-Type, dead code (Gate 39)

**NO PIXEL MOVED, AND THAT WAS THE GATE'S HARD CONSTRAINT RATHER THAN ITS
RESULT.** All 96 baselines byte-identical by SHA-256 across the whole gate,
bounded by a manifest written OUTSIDE the repo before the first change. Nothing
in scope here can legitimately reach a rendered pixel, so a single differing
baseline would have been a finding and a halt — never a re-mint.

Four items, unrelated to each other except by being small. The dependency work
is written up under "npm audit" and "The Playwright specifier" in Known
conditions below, because that is where a future session will look for it; this
section carries the rest.

### `/manifest.webmanifest` was served as `application/octet-stream`

Measured post-deploy, not locally. All six icon assets returned correct types;
only the manifest fell through, because Netlify's CDN maps Content-Type from the
file extension and has no entry for `.webmanifest`. Chromium is lenient and
installed the app anyway, which is exactly why nothing looked broken for the
whole of Gate 38.

Fixed by a **second** `[[headers]]` block in `netlify.toml`, `for =
"/manifest.webmanifest"`, setting `Content-Type = "application/manifest+json"`.

**IT IS A SECOND BLOCK AND NOT AN EDIT TO THE FIRST, AND THAT IS THE ONLY
INTERESTING THING ABOUT IT.** Netlify applies EVERY matching `[[headers]]` rule
cumulatively rather than letting the most specific path win, so the manifest
still receives `X-Robots-Tag: noindex, nofollow` from the `/*` rule. **Do not
narrow the `/*` rule to "everything except the manifest" to make room** — that
would drop the noindex from the manifest for no reason. The change is a pure
36-line insertion; the existing rule is byte-identical and still first.

**IT IS NOT VERIFIED, AND MUST NOT BE REPORTED AS VERIFIED.** `vite preview`
serves the file straight off disk and never evaluates `netlify.toml`, so no
local check exercises any of this — the same limitation Gate 24 recorded for the
`robots.txt` precedence rule. The check is post-deploy:

```
curl -sSI https://monarchmvp.netlify.app/manifest.webmanifest
```

PASS = `content-type: application/manifest+json` **and** `x-robots-tag: noindex,
nofollow` on the same response. The second half is the one worth reading: it is
what proves the `/*` rule still reaches this path.

### The dead-file derivation found ZERO, and the method is the point

**A GREP FOR A BASENAME IS NOT A NON-REFERENCE PROOF**, because a file can be
reached through a barrel re-export or a dynamic path. What was run instead is a
reachability walk: resolve every relative specifier from a fixed set of entry
points — `index.html`, `vite.config.ts`, `playwright.config.ts`, the three
`scripts/*.mjs` the npm scripts invoke, and every `e2e/*.spec.ts` Playwright's
`testMatch` collects — following static imports, bare `import '...'`, dynamic
`import()`, `require()`, CSS `@import` and `url()`, HTML `src`/`href`,
`import.meta.glob`, and `readFileSync` of repo-relative paths (which is how
`harness.ts` reaches `src/App.tsx`).

Result: **51 modules reached, 49 tracked source files considered, 1 unreached**
— `src/vite-env.d.ts`, which is **not dead**. It is a one-line
`/// <reference types="vite/client" />` consumed by TypeScript through
`tsconfig.app.json`'s `"include": ["src"]`, never by an import, so no
import-graph walk can reach it by construction. It stays.

**THE WALK ALSO REPORTED ZERO FILES CONTAINING A NON-LITERAL `import()`**, which
is what bounds the method: a computed dynamic path would have been the one thing
a static parse could miss, and there are none.

**ALL SIX SPEC FILES ARE LIVE**, checked with `--list` rather than assumed from
the file names: `baselines` 3, `frame-cap` 2, `routes` 49, `section-headers` 50,
`tile-fill` 2, `visual` 96 = **202**.

### One dead CSS rule, deleted — see the Gate 25 orphan entry above

`.mvp-finance__hero-category`. The evidence, the five-leg search and the stale
`:210` line reference are written up where Gate 25 left the finding, so the
history reads in one place.

### One stale comment, corrected rather than deleted

`src/flows/homepage/homepage.css` carried a Gate 3c comment making **two
present-tense claims that had both become false**, on a block whose conclusion
is still correct:

| claim | status |
|---|---|
| `--mapped-text-on-color-caption` "the DS deliberately FLIPS: `--alias-neutral-100` in light, `--alias-neutral-950` in dark" | **false since DS v1.6.0** — measured on the pinned v1.15.0 `dist/index.css`, the token is emitted in both blocks with the same value, `--alias-neutral-100` |
| "this band's gradient is built from raw `--brand-*-500` tokens" | **false since Gate 29** — it is `--mapped-gradient-primary-from` / `-to`, as the block 100 lines above it in the same file already says |

**THE DECLARATION WAS NOT TOUCHED.** `.mvp-home__promo-subtitle` still binds
`--mapped-text-on-color-body`, and the comment now rests that on the semantic
argument (it is the right member of the on-colour family for body copy, and it
is static white in both blocks) rather than on a bug that no longer exists.
Reverting to the caption token would move pixels and buy nothing.

**GATE 26 ALREADY FLAGGED THIS COMMENT** as "still correct history but no longer
describes current DS behaviour". That was a note telling future readers not to
believe a comment — strictly worse than fixing the comment, because it only
works for readers who happen to have read the note.

### Zero TODO / FIXME / XXX / HACK

Swept across `src`, `e2e`, `scripts`, `index.html`, `netlify.toml`,
`vite.config.ts`, `playwright.config.ts` and `package.json`. None. Recorded
because "no TODOs" is a fact that has to be re-measured to stay true, and
because its absence is what made the stale-comment sweep the whole of the job.

### Two figures made durable, and why each rotted

Both were real measurements. Neither was wrong. Both were written in a form that
could stop being true without anything reporting it — the failure mode this
document is most exposed to.

| figure | why it rotted | what it says now |
|---|---|---|
| `dist/assets/index-SvxPQyoN.css` | a Vite **content hash** — renames on any emitted-CSS change, and is not even stable across this repo's two build paths on identical source (Gate 39 measured `index-CyFurvJV.css` from `npm run build` against `index-SvxPQyoN.css` from `npm run build:package`) | the single `dist/assets/index-*.css` emitted by `npm run build:package` |
| `e2e/harness.ts` **+114 lines, 0 deletions** | described an **uncommitted working tree**, so it became unfalsifiable the moment Gate 38 was committed | anchored to `6d074f8` (tag `mvp-gate38`) with the `git show --numstat` command that re-derives it |

Both were re-derived at Gate 39 before rewording: the hover-guard counts are
still **39 / 87 / 0** under the pinned v1.15.0, and the diffstat is confirmed
exactly at `+114/-0` on `e2e/harness.ts` and `+29/-0` on `index.html`.

### The branch census — a REPORT, not a task

**26 remote branches besides `main`, and ALL 26 are merged into `origin/main`.
Zero unmerged.** Local and remote `main` agree at `6d074f8`. There are **27**
tags, `mvp-gate6` through `mvp-gate38` with gaps (no 28, 32, 34–37, and none for
gates A, B, D or α).

A review thread carried the branch figure as 23, then 25, then 27 at different
times. All three are explainable and only one is an error: **27** counts every
remote ref including `main`, **26** is the deletable set, and **23** was a pager
truncating `git tag -l`. Say which you mean.

Branch deletion is Teku's, in Sourcetree. Nothing was deleted here.

### Deliberately not in scope

The DS repo entirely; deleting any branch, local or remote; the commit author
name (a git config, Teku's); the icon and manifest ASSETS (verified untouched by
SHA-256, not regenerated); the 96 baselines; Flow 8; the three AA shortfalls on
the net-worth card ruled on at Gate 31; the ungated-`:hover` regression guard,
which belongs to the DS; and every other Netlify setting — no redirect, no build
command, no plugin was changed.

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
working tree and **zero** from `node_modules/@monarch`. On Netlify the sibling
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
(158,397 bytes) and decompose into the same **849 rule fragments as a
multiset**, every census identical across the two: 541 custom properties
declared, 1,774 `var()` references over 319 distinct, 1,643 class-selector
occurrences over 595 distinct, 11 at-rules. They are NOT byte-identical,
because rule ORDER differs: source mode follows `package.css`'s
hand-maintained `@import` list, dist mode follows the DS lib build's import
graph. First divergence at byte 44,403, where one build emits
`.mn-breadcrumbs` and the other `.mn-avatar`. Order decides ties between
equal-specificity rules, so it could have changed rendering.

**THE JS DIFFERS BY 35 BYTES, AND THAT IS ATTRIBUTED RATHER THAN WAVED
THROUGH.** 5,745,663 against 5,745,628. The first divergence is at byte
**386**, inside Vite's own module-preload polyfill preamble — before any app
or DS code — and it is a minifier identifier rename, `function i(l)` ->
`function v(l)`. The distinct short-identifier count is **2712 in both**.
That is what a different module graph feeding Rollup's name allocator looks
like: 169 DS source modules on one side, one pre-bundled `dist/index.js` on
the other.

**NEITHER DIFFERENCE REACHES A PIXEL — MEASURED AT 92 BASELINES, WHICH
SUPERSEDES GATE 16'S 42.** Gate 16 compared 42 walk states at ONE viewport,
before Gate A added 430 and before Gates 20–21 added states, so the 430 half
had never been checked against the package build at all. At Gate 22 each
build was served through `vite preview` and run against the committed
baselines: **192 passed, 0 pixel diffs, both times**, at `threshold: 0` /
`maxDiffPixels: 0`, across both viewports, both themes, and both overlay
states.

**THAT IS STRICTLY STRONGER THAN COMPARING THE TWO BUILDS TO EACH OTHER.**
The baselines were minted from the DEV SERVER, so matching them proves all
three renders identical — dev-versus-production inertness is proven, not
merely the two production paths against one another.

**NO RIG WAS INVENTED, AND THE NEXT SESSION SHOULD NOT INVENT ONE EITHER.**
`scripts/build-from-package.mjs` forwards `--outDir`, so the two builds go to
`dist-default/` and `dist-package/` (both gitignored since Gate 22), and
`playwright.config.ts` sets `reuseExistingServer: !process.env.CI` — so
`npm run test:e2e` ATTACHES to a `vite preview --port 5174` that is already
listening instead of starting a dev server. Re-run that comparison if the DS
ever restructures its CSS entry points.

### The deploy — Netlify, and the `prepare` hazard (Gate 22)

**THE HOST IS NETLIFY, AND THE CHOICE WAS DELIBERATE.** Netlify Database is
included on the Free plan, and Vercel's Hobby plan restricts users to
non-commercial personal use. `netlify.toml` at the repo root holds four
things, each derived rather than assumed:

| key | value | why |
|---|---|---|
| `command` | `npm run build:package` | forces the pinned-package path |
| `publish` | `dist` | measured — `dist/` was deleted, the build run, and `dist/` reappeared; no `build.outDir` in `vite.config.ts` and no `--outDir` in the script |
| `[[redirects]]` | `/*` -> `/index.html`, status 200 | the SPA rewrite |
| `NODE_VERSION` | `24` | local at Gate 22 was Node 24.17.0, npm 11.13.0 |

**`build:package` RATHER THAN `build`, AND THE DIFFERENCE IS NOT COSMETIC.**
Plain `npm run build` would take the package path on the host *by accident* —
correct only for as long as the sibling DS folder happens to be absent. The
override forces it, so the deploy compiles what the gates measured rather
than what the environment left out.

**THE SPA REWRITE IS NOT OPTIONAL AND NOT BOILERPLATE.** `src/main.tsx`
mounts `<BrowserRouter>`, `src/App.tsx` declares
`finance/holding/:holdingId`, and `vite.config.ts` sets no `base` — so the
built `index.html` references `/assets/…` absolutely and every route is a
real path. Without the rule, the root URL works and EVERY DEEP LINK 404s:
any bookmark of `/finance/holding/fd`, and any refresh on a non-root path,
asks the CDN for a file that does not exist. Status 200, not 301/302, so the
URL the router reads is the one the user asked for.

**THE DS DOES NOT COMMIT `dist`, SO npm BUILDS IT DURING INSTALL — AND THAT
IS THE HAZARD.** `git ls-files dist` in the DS returns zero files, and its
`package.json` carries `"prepare": "npm run build:lib"`. npm therefore clones
the DS, installs ITS devDependencies, and runs the lib build before packing.
Two consequences for any build environment:

- it **must install devDependencies** (vite, typescript and tsc are all
  devDeps here, and the DS needs its own to build at all);
- it **must never run with `--ignore-scripts`**, which would install a DS
  with no `dist` at all.

**THE FAILURE MODE IS A MODULE-RESOLUTION ERROR AT BUILD TIME, NOT AN
INSTALL ERROR.** The install reports success and the build then fails on a
specifier it cannot resolve — it reads like a code bug and is not one. Same
shape as the missing-svgr-transform trap above: a clean earlier step proves
nothing about the later one.

**A `git+ssh` RESOLVED URL IS NOT EVIDENCE THAT CREDENTIALS ARE REQUIRED.**
`package-lock.json` records `resolved` as
`git+ssh://git@github.com/TekuBrah/Monarch-Design-System.git#<sha>`, which
looks like a hard blocker for a credential-less CI. It is not: the repo is
PUBLIC and npm falls back to HTTPS. Measured at Gate 22, not reasoned —
`package.json` and `package-lock.json` were copied to a scratch directory and
`npm ci` run with `GIT_SSH_COMMAND="exit 1"`, `GIT_TERMINAL_PROMPT=0`, and
both global and system git config pointed at nonexistent files. Result: **117
packages added, exit 0**, with the DS at 1.5.0 and a complete `dist/`. Re-run
that probe rather than reasoning from the lockfile if the DS is ever made
private.

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

**WHAT PROVES THE `threshold` HALF WAS FIXED.** `threshold: 0` is set explicitly. With it, the
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

**AND THE CORRECTION THIS SECTION NEEDED — READ IT BEFORE QUOTING THE RULE
ABOVE.** This section used to end by asserting that the three settings together
mean a pixel counts as different if any channel differs by any amount. **THAT IS
FALSE, and it was false when it was written.** It holds only among the pixels the
comparator COUNTS, and Playwright discards every pixel its antialiasing heuristic
flags before the count — see "The comparator's antialiasing blind spot" under
Visual baselines. Gate 1 fixed a real hole and it fixed ONE OF TWO. The second
one cost twelve baselines and a whole release, and it is closed by
`expectExactPixels`, not by any setting here.

**THE GENERAL LESSON, WHICH IS THE DURABLE PART: A CONFIG SETTING NAMED AFTER A
GUARANTEE IS NOT THE GUARANTEE.** Both holes had the same shape — a comment
describing what the author believed the settings meant, never checked against the
library that implements them. Both were found by reading `node_modules`. Read the
implementation before writing down what an instrument proves.

### npm audit — CLEAN as of Gate 39

**`npm audit` REPORTS ZERO VULNERABILITIES.** Measured at Gate 39 on a COLD
tree — `node_modules` deleted, `npm ci` from the lockfile — which is the only
state in which the number means anything:

```
added 117 packages, and audited 118 packages
found 0 vulnerabilities
```

**WHAT CLOSED IT, AND WHY IT WAS CHEAP.** The single finding was `nanoid
<3.3.18` (high, GHSA-2v37-7h3g-55p8, "custom generators can loop indefinitely
when size is zero"), reached only as
`vite@6.4.3 -> postcss@8.5.25 -> nanoid@3.3.16`. `npm audit fix` moved exactly
one version — **nanoid 3.3.16 -> 3.3.18** — with no direct dependency changing
major and no other package in the lockfile moving at all. Verified by
diffing every resolved version in `package-lock.json` before and after: one
line changed out of 170.

**IT NEVER REACHED PRODUCTION CODE.** `vite` is a devDependency and `postcss`
uses `nanoid` at build time; `grep -c nanoid dist/assets/*.js` returned **0**.
So this was hygiene, not exposure — worth recording, because the severity label
would otherwise suggest the opposite.

**THE REASONING THAT SURVIVES, because it is about the app and not the advisory
database:** the MVP is a client-only SPA with **no React Server Components**, so
any RSC-mode advisory against `react-router-dom` does not describe a path that
exists here. (Gate 26 corrected an earlier entry that had recorded 2 findings
against React Router; those advisories no longer appear.) That assessment stands
and would apply again if such an advisory returns. Revisit only if the MVP ever
adopts RSC or a framework that enables it.

**AND THE GENERAL LESSON: AN AUDIT PARAGRAPH ROTS FASTER THAN ALMOST ANYTHING
ELSE IN THIS FILE.** Advisories are withdrawn, re-scored and re-attributed
upstream, and the dependency tree moves under a DS re-pin. "Zero" above is a
measurement of one moment, not a property of the repo. Re-run `npm audit`
rather than trusting this section's count; what is durable is the RSC reasoning
above and the cold-tree method, not the number.

### The Playwright specifier is EXACT, and that is load-bearing (Gate 39)

`package.json` declares `"@playwright/test": "1.62.1"` — no caret. It was
`^1.62.1` from Gate 7 until Gate 39.

**THE CARET WAS NOT A STYLE PROBLEM; IT WAS A LIVE HAZARD WITH TWO NAMED
VICTIMS ALREADY DOCUMENTED IN THIS FILE**, and pinning it is what makes both of
them impossible to trigger by accident:

- **The Gate 30 source offsets.** That section reads specific line numbers out
  of the installed `playwright-core` (`coreBundle.js:7550`, `:6666`, `:6623`)
  to prove the comparator discards antialiased pixels. Those are true of
  **1.62.1** and nothing pinned it, so an ordinary `npm install` could have
  moved the minor version and quietly invalidated the proof.
- **The Gate 17 launch flag.** `--disable-partial-raster` is a Chromium switch,
  and **Chromium ignores unknown switches silently**. Playwright bundles its own
  Chromium, so a Playwright upgrade is also a Chromium upgrade — and a
  rasteriser or PNG-encoder change arriving that way can redden up to all 96
  visual tests at once, or silently re-open the ±22.5% flake.

**GATE 30 DOCUMENTED THE HAZARD; IT DID NOT RULE THAT THE SPECIFIER SHOULD BE
EXACT.** A review thread carried it as an existing ruling — it was not one, and
this section is the ruling arriving. Gate 30's prescription was the weaker "on
any Playwright upgrade, re-read `:7550`", which depends on someone noticing that
an upgrade happened.

**PINNING CHANGED NOTHING THAT RESOLVES.** Before and after, `@playwright/test`,
`playwright` and `playwright-core` all read **1.62.1**, confirmed from each
package's own `package.json` in `node_modules` after a cold `npm ci` — not from
install output. This is a specifier change, not an upgrade, and the whole
lockfile diff for it is one line.

**A PLAYWRIGHT UPGRADE IS NOW A DELIBERATE EDIT**, which is the point. When one
is wanted: change the literal, re-read Gate 30's offsets against the new
`playwright-core`, confirm `--disable-partial-raster` is still honoured, and
expect a baseline re-mint. Name the version in the commit message.

**IT IS THE ONLY EXACT SPECIFIER IN THE MANIFEST, AND THAT ASYMMETRY IS
DELIBERATE.** The other eleven npm entries keep their ranges; none of them has
documentation reading line numbers out of its installed source, and none bundles
a browser. `@monarch/design-system` is a git-tag pin, which is stricter still
and guarded by `lint:linkage`.

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

### Desktop max-width for the mobile frame — CLOSED at Gate D

**IT SHIPPED, AT 430px, CENTRED, PLAIN.** See "The frame cap (Gate D)" above
for the mechanism, the two guards and the three fatal mechanisms. What follows
is kept because the DERIVATION is still the reason 430 carries a
`token-exempt` marker rather than a token.

There is still **no token for 430**, and not for the reason this file once
gave. An earlier revision claimed the `--brand-scale` ramp "tops out at
**96px**". It does not. Re-read from the DS's `globals.css` at the
content-column Gate 1, the ramp runs to **512px**:

```
--brand-scale-1500:  96px      <- what was mistaken for the ceiling
--brand-scale-1600: 128px
--brand-scale-1700: 256px
--brand-scale-1800: 512px      <- the actual ceiling
```

**THE CONCLUSION SURVIVES, THE REASON DID NOT.** 430 is not above the ramp; it
falls **between steps 1700 and 1800**, and `430px` appears nowhere in the DS
(grep: zero matches). Anyone re-deriving this from the old "96px" claim would
have concluded the ramp was an order of magnitude too small and designed around
a gap that is not there. Curve-fitting it out of `calc()` on unrelated scale
steps remains explicitly banned by the DS's token-gap protocol (that pattern
was rejected there once already).

**A DS TOKEN DECISION IS STILL OPEN, and it is now the only open half.** It
belongs with the roadmap's parked **motion/elevation token layer** item — the
same class of gap, where real design values have no backing token (`0.12s`
transitions, z-index, some opacity values). Resolve them together. Until then
the literal stays visible through the guardrail's `token-exempt: <reason>`
escape hatch, which is exactly what that hatch is for.

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
- **Chromium lays out in 1/64 px LayoutUnits, so a width tolerance is expressed
  against 1/64 and never against a round decimal.** A flex row DISTRIBUTES the
  remainder across its children, so an individual child differs from the ideal
  derived width by at most one quantum while the sum stays exact. Measured at
  Gate B: three tiles across a 382px span resolved to 8149/8149/8150 units —
  spread exactly 0.015625, total exactly 382.
- **A spec that asserts both a declaration and a geometry derived from that
  declaration cannot be negative-controlled in one pass.** Reverting the change
  fails the DECLARATION assertion first and the geometry assertion is never
  reached, so the half that matters goes unproven. The control must disable the
  earlier assertion to reach the later one. Gate B's first control was
  inconclusive for exactly this reason; the isolated one was the deciding test.
- **THE BROWSER PANE CAN RUN AT A FRACTIONAL DPR AND A FRACTIONAL LAYOUT
  VIEWPORT, AND THE TWO OBVIOUS SANITY CHECKS DO NOT CATCH IT.** Observed at
  Gate 33: `devicePixelRatio` **2.0000000298023224** and
  `visualViewport.width` **375.2**, while `innerWidth` and
  `document.documentElement.clientWidth` BOTH still reported a clean **375**.
  Card widths came back 167.6 against a true 167.5, and a right edge 359.2
  against a true 359 — wrong in the first decimal, on every absolute figure.

  **RELATIVE DELTAS ARE SCALE-INVARIANT AND SURVIVE THIS.** Every
  edge-alignment and equal-width check at that gate read exactly 0 through the
  pane and exactly 0 through the harness, which is why the pane is still fine
  for structure, for alignment and for before/after comparison.

  **ABSOLUTE GEOMETRY MUST BE TAKEN THROUGH A PLAYWRIGHT-LAUNCHED CHROMIUM** at
  a pinned viewport and `deviceScaleFactor`, never through the pane. **The tells
  are `visualViewport.width` and the fractional `devicePixelRatio` — `innerWidth`
  is NOT a tell**, because it rounds and will agree with the harness while the
  layout box does not. This is the same class of trap as the harness-honesty
  guard above: a number that looks right is not the same as a number that is.
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

Five, all green before a step is done — six on a DS re-pin, see below:

```
npx tsc -b --force
npm run build
npm run lint:tokens
npm run lint:linkage
npm run test:e2e
```

`lint:linkage` also runs automatically before `test:e2e` and
`test:e2e:update`.

**`npm run build:package` IS A SIXTH GATE ON ANY DS RE-PIN, not just before a
deploy.** `vite.config.ts` aliases the DS to a sibling SOURCE checkout, so
`node_modules` is not in the local render path and a re-pin's "zero pixels
moved" result can be true for the wrong reason. It is the only command that
compiles what production compiles. See Gate 33 for the measurement that forced
this.

**AN `--update-snapshots=all` RUN IS NOT A VERIFICATION.** It overwrites the
files it compares against, so it reports green whatever it wrote. Always follow
a re-mint with a separate clean `npm run test:e2e`; that run is the real green.

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

#### The comparator's antialiasing blind spot — MEASURED AND CLOSED (Gate 30)

**PLAYWRIGHT'S SCREENSHOT COMPARATOR CANNOT SEE THIN FEATURES, AT ANY SETTING
THIS CONFIG EXPOSES.** Borders, dividers, focus rings, hairlines, underlines and
1px separators were outside the net entirely. This is not a tuning question and
it was never fixable by `threshold`.

**THE MECHANISM, from the installed playwright-core 1.62.1.** Playwright calls
pixelmatch **without passing `includeAA`**:

```
coreBundle.js:7550   count = pixelmatch(expected.data, actual.data, diff.data,
                       w, h, { threshold: options.threshold ?? 0.2 })
                       ^ the ONLY option forwarded
coreBundle.js:6623   includeAA: false,          <- so the default applies
coreBundle.js:6666   if (Math.abs(delta) > maxDelta) {
                       if (!options.includeAA && (antialiased(img1, ...) ||
                                                  antialiased(img2, ...))) {
                         // painted yellow in the diff, and NOT counted
                       } else { diff2++ }
                     }
```

**THE DISCARD RUNS AFTER THE `threshold` TEST AND BEFORE THE COUNT.** So a pixel
the heuristic flags never reaches `threshold`, `maxDiffPixels` or
`maxDiffPixelRatio`. Setting all three to zero — which content-column Gate 1 did,
and which was a real improvement — cannot reach a pixel that is never counted.

**AND THERE IS NO SUPPORTED WAY IN.** `getComparator(mimeType)` (`:7501`) is a
hard mimeType switch with no registry, and `options.comparator` accepts only
`"pixelmatch"` or `"ssim-cie94"` and throws on anything else (`:7552`). The
comparison cannot be swapped in place, which is why the repair is a second check
rather than a replacement.

**EVERY LINE NUMBER ABOVE IS TRUE OF `playwright-core` / `@playwright/test`
1.62.1, AND NOTHING PINS IT.** `package.json` declares exactly one Playwright
entry — `"@playwright/test": "^1.62.1"` — and `playwright` / `playwright-core`
arrive transitively, all three resolving to **1.62.1** today. The caret means an
ordinary `npm install` can move the minor version and these offsets go stale
silently — the same durability shape as the `--disable-partial-raster` flag
recorded at Gate 17.
**On any Playwright upgrade, re-read `:7550` and confirm the options object still
forwards `threshold` and nothing else.** If a future release passes `includeAA`,
or exposes it through config, the second check becomes redundant rather than
load-bearing and this whole subsection needs re-deriving. Nothing will tell you;
the exact check would simply go on quietly agreeing with a comparator that had
started doing its job.

**REPLACING `toHaveScreenshot` OUTRIGHT BUYS NOTHING, AND THE REASON IS A
MEASUREMENT, NOT A PREFERENCE.** The obvious objection to a second check is that
`toHaveScreenshot` earns its keep by retrying the capture until two consecutive
captures agree, and that a bare exact matcher would forfeit that. **It does not
work that way on the passing path.** In the loop at `coreBundle.js:22224-22247`,
iteration 1 sets `expectation = options.expected` and a match breaks out with
`isFirstIteration` still true, returning at `:22251` — **exactly ONE capture, no
stabilisation at all.** The retry-until-two-agree path engages only AFTER a
mismatch. So the green path costs one capture either way, and
`page._expectScreenshot` with `expected: undefined` would cost a MINIMUM of two,
because with no expected the first iteration can never break. A replacement is
equal cost and worse durability — while also forfeiting the diff artifact, the
`updateSnapshots: 'none'` missing-baseline failure and the `-u` write path.

##### MAGNITUDE IS NOT THE DISCRIMINATOR. THINNESS IS.

Two controls, both re-run at Gate 30 against the same comparator Playwright uses.
They are the pair to quote, because between them they rule out the intuitive
reading — "big changes get caught, small ones slip through" — which is backwards:

| control | what really differs | pixelmatch counted | verdict |
|---|---|---|---|
| **1px button ring recoloured**, `/finance/holding/fd` light, 375 | **773 px, max 51 per channel** | **0** | **PASS — GREEN** |
| same, DARK | **774 px, max 251 per channel** | **1** | FAIL, by ONE pixel |
| **20x20 solid block, ONE channel +1** | 400 px, max 1 per channel | 400 | FAIL |

**READ THE SECOND ROW BEFORE CONCLUDING THE NET MOSTLY WORKED.** A change of
**251 per channel** — very nearly a full inversion — across 774 pixels was
**99.9% invisible**. It failed only because `maxDiffPixels: 0` and exactly one
stray pixel escaped the heuristic. Had that pixel been classified as
antialiasing too, the whole thing would have gone green. The eight dark states
the old comparator "caught" were caught by a margin of one pixel out of 774.

Why the heuristic behaves this way is in `antialiased()` (`:6684`): it flags a
pixel with **at most two** neighbours identical to itself that has both a darker
and a brighter neighbour. A 1px line between two fills is exactly that. A solid
block is not — its interior pixels have eight identical neighbours — which is why
the trivial 20x20 case fails and the real one passes.

**THE SPLIT ACROSS THE WHOLE SUITE: 16 OF 24 REAL REGRESSIONS WERE INVISIBLE.**
Run against all 96 states, the injected border produced 24 failures. The old
comparator saw **8** — every one of them a `/finance/holding/fd` DARK state, and
each by the one-pixel margin above. The other **16 were caught only by the exact
check**: every LIGHT `fd` state at both viewports, and `/` and `/ [tab:crypto]` in
**both** themes at both viewports. Two thirds of a real design-system regression
passed a suite whose whole job is to catch it.

##### WHAT IT COST: TWELVE BASELINES AND A WHOLE RELEASE

Twelve committed baselines recorded a button border the app had stopped drawing,
and **the suite reported green for an entire release**. The binding is
`Button.css:83`: DS v1.7.0 moved the primary fill one step deeper
(`--mapped-surface-primary-default` -> `--alias-primary-600`, `#0358cc`) and left
`--btn-border` on `--mapped-border-primary-default` (`--alias-primary-500`,
`#046eff`). v1.8.0 rebound the border to the same token as the fill.

**GATE 29 REPAIRED THE TWELVE WITH `--update-snapshots=all`, AND ONLY THAT FORM
COULD HAVE.** This is recorded here because **`CLAUDE.md` has no Gate 27 and no
Gate 29 section at all** — the repair happened and was never written down, so a
reader looking for it finds nothing. The bare `--update-snapshots` could not have
done it: its preset is `changed`, which passes the baseline in as `expected` and
routes the decision through the comparator, so on twelve baselines the comparator
called green it would have rewritten **nothing** and printed a **clean run** — the
worst possible combination, a command that reports success while repairing
nothing. Only `=all` skips the comparator and decides by `Buffer.compare`. See
"`test:e2e:update` COULD NOT REPAIR THIS CLASS OF STALENESS" below for the source
lines. **Nothing prevented a recurrence until Gate 30.**

##### THE REPAIR — `expectExactPixels`, and what it does NOT cover

`e2e/exact-pixels.ts`. `visual.spec.ts` now runs **two checks per state**:
`toHaveScreenshot` first (coarse regression, with Playwright's diff artifacts),
then a `Buffer.compare` of a second capture against the committed baseline.

**IT COVERS** any difference between the committed baseline and the live render,
at any magnitude, on any pixel, thin features included.

**IT DOES NOT COVER:**

- **The CONTENT of a baseline.** Nothing here reviews pixels. A deliberate
  `test:e2e:update` still writes what the app currently renders, and the
  discipline at the top of this section is still what governs that.
- **States the walk does not visit.** This is a stricter comparison of the same
  24 states, not more states. The in-screen state gap recorded under Tab coverage
  is unchanged.
- **PNG encoding.** The predicate is `Buffer.compare`, so two byte streams that
  decoded to identical pixels would be reported as different. That is deliberate:
  it is the same predicate `--update-snapshots=all` uses to decide whether to
  rewrite, so the check and the repair command agree by construction.
- **Anything during an update run.** The check stands aside when
  `updateSnapshots !== 'none'`, because under `all` the baseline on disk IS the
  capture Playwright just wrote and asserting against it would deadlock the
  repair command.

**THE COST IS ONE EXTRA CAPTURE PER STATE, AND IT WAS MEASURED, NOT ESTIMATED —
see "What the exact check costs" below.**

**THE CAPTURE OPTIONS ARE ONE OBJECT, NOT TWO LITERALS.**
`SCREENSHOT_CAPTURE_OPTIONS` in `e2e/exact-pixels.ts` is spread into
`expect.toHaveScreenshot` by `playwright.config.ts` and passed to
`page.screenshot()` by the check itself. `fullPage` cannot live there —
Playwright lists it in `NonConfigProperties` and refuses to read it from config —
so `visual.spec.ts` declares `SHOT` once and hands it to both calls. Same reason
as the Gate A `DEFAULT_VIEWPORT` import: two captures compared byte-for-byte must
be taken the same way, and two literals that agree today is the shape of every
drift this project has been bitten by.

**THE THIRD ARM OF THE BASELINE GUARD NOW PINS THE WIRING.**
`baselines.spec.ts`'s `NAME_EXPRESSIONS` asserts three exact source lines: how the
name is built, that `toHaveScreenshot` consumes it, and that `expectExactPixels`
consumes the same name with the same options. **An unwired check is worse than no
check** — the suite stays green and looks like it is covering something.

##### `test:e2e:update` COULD NOT REPAIR THIS CLASS OF STALENESS

**AND THAT IS WHY THE SCRIPT CHANGED.** It was `playwright test
--update-snapshots`, and the bare flag's preset is `changed`
(`playwright/lib/program.js:226` — `choices: ["all","changed","missing","none"],
preset: "changed"`). Under `changed`, `toHaveScreenshot` passes the baseline in as
`expected` and **routes through the comparator**: if the comparator says green,
nothing is written. So the obvious command gave a clean run and unrepaired files —
the worst possible combination.

Under `all`, `expectScreenshotOptions.expected` is set to `undefined`
(`expect.js:12646`), **no comparator runs at all**, and the write is decided by
`compareBuffersOrStrings` — i.e. `Buffer.compare` (`:12649-12653`). That is the
only mode that can rewrite a baseline the comparator calls green.

The script is now `playwright test --update-snapshots=all`. **Verified that the
value is validated rather than ignored**: `--update-snapshots=alll` is rejected
with `Allowed choices are all, changed, missing, none`.

##### WHAT THE EXACT CHECK COSTS — measured against controls, not wall clock

**NOT DISTINGUISHABLE FROM ZERO, BOUNDED AT ROUGHLY ±0.05 s PER TEST.** Three full
runs: the clean tree before the change at 376 s, then 353 s and 357 s after.

**WALL CLOCK ALONE SAYS THE SUITE GOT FASTER, WHICH IS NONSENSE, AND THAT IS THE
METHOD LESSON.** The two specs this gate did not touch are the controls:

| spec | before | after (1) | after (2) | mean s/test |
|---|---|---|---|---|
| `visual` — touched | 1.960 | 1.800 | 1.839 | |
| `routes` — untouched | 1.746 | 1.675 | 1.679 | |
| `section-headers` — untouched | 1.776 | 1.702 | 1.698 | |

Both controls moved ~4% too, so the machine — not the change — accounts for the
drop. Scaling `visual` by the controls' ratio predicts 1.874-1.885; it measured
**1.839**, i.e. ~40 ms BELOW expectation, which is impossible for added work. The
honest reading is that the added capture is under the noise floor of this
instrument. **It is a settled-page CDP capture plus a PNG encode, against a ~1.8 s
per-test cost dominated by navigation, theme toggle, font load and image decode** —
which is why doubling the captures does not come close to doubling the run.

##### THE STANDING COST: A ONE-BYTE SHIFT NOW REDDENS UP TO 96 TESTS

**READ THIS FIRST IF THE SUITE HAS JUST GONE MASSIVELY RED AFTER AN UPGRADE.**
The exact check compares bytes, so anything that shifts a single byte of any
baseline fails it — where the old comparator absorbed the same shift silently on
thin features. **A Playwright upgrade is also a Chromium upgrade** (Playwright
bundles its own, and the one declared entry is a caret range, `^1.62.1`), so a
rasteriser or PNG-encoder change arriving that way can redden **up to all 96**
visual tests at once, having previously reddened none.

**THAT IS THE INSTRUMENT WORKING, NOT A DEFECT — but diagnose before repairing.**
If `toHaveScreenshot` is green across the board and only the exact check is red,
the difference is confined to thin features and the cause is almost always the
toolchain rather than the app. Confirm the Chromium version moved, then re-mint
deliberately with `npm run test:e2e:update` — which now maps to
`--update-snapshots=all`, the only form that can rewrite a baseline the comparator
calls green — and name the upgrade in the commit message. **Do not loosen
`threshold`, `maxDiffPixels` or `maxDiffPixelRatio`**; none of them can affect
this check, and the version this happened at belongs in the record.

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

### The overlay axis (Gate α)

**AN OVERLAY IS AN ENUMERATED ADDITION TO `WALK`, NOT AN AXIS.** The viewport
became a first-class axis at Gate A because every state genuinely exists at
every viewport — the cross product is TOTAL and every cell of it is reachable.
Overlay is the opposite case, and the difference is not stylistic: **most states
have no overlay, and the ones that do have SPECIFIC ones.** `WALK × OVERLAYS`
would multiply 21 states by every overlay in the app and produce a large set of
cells that cannot be reached — a control that is not on the screen cannot be
clicked — and that should never be rendered. Every one of them would then have
to be excluded by hand, which is the enumeration below with the sign flipped and
a great deal more machinery around it.

So an overlay state is **written down one at a time** in `OVERLAY_STATES`,
naming the route, the tab and the control that opens it. **If you find yourself
writing a nested loop over overlays, you have taken the wrong turn.**

**THE WALK IS 23 STATES: 14 routes + 7 non-default tab states + 2 enumerated
overlay states.** Both overlay states are `HoldingDetailScreen`'s preset modals
on `/finance/holding/fd`, and that route is not a convenience — the fixed
deposit is the ONLY holding type whose `holdingFields` entry returns
`actions: { reminder: true, statement: true }`.

**OPENED THROUGH ITS OWN CONTROL, never by setting state** — the discipline
`gotoRoute` already follows for the theme and `activateTab` for tabs.
`openOverlay()` asserts the control exists and carries its declared label,
asserts no dialog is open yet, clicks, then settles on exactly one
`[role="dialog"][aria-modal="true"]` carrying the declared accessible name. That
last assertion is not decorative: the two controls sit in the same bar and
differ only by `mn-btn--primary` / `mn-btn--secondary`, so a swapped selector
would open a real dialog and settle cleanly.

**`assertOverlayMatchesState` ASSERTS BOTH DIRECTIONS,** and the second is the
one that earns its keep: an overlay state must have exactly its declared dialog
open, and **the 21 non-overlay states must have none**. A modal left open by an
earlier interaction, or one the app opens on mount, is invisible to every other
assertion in the suite and would appear in a baseline as though it belonged.

**THE `routes.spec.ts` UNIQUENESS KEY IS `route#tab#overlay`.** It was
`route#tab`, which collapses all three `/finance/holding/fd` states into one and
fails the uniqueness check on a CORRECT walk. Latent until a second state
existed on a route already walked.

#### Correction: arm 2 goes red on a RENAME, not on a mint

**THE BLANKET CLAIM THAT "ARMS 1 AND 2 CANNOT GO GREEN AFTER A MINT" IS WRONG.**
Arm 1 (untracked-on-disk) reddens whenever new baselines are unstaged. Arm 2
(tracked-but-missing) reddens only when a tracked baseline is **renamed or
deleted** — a mint alone leaves every tracked file present, so arm 2 stays
GREEN.

Gate A had two red arms because it RENAMED 42 baselines and added 42; its
recorded numbers are correct for that gate and are not what generalises. Gate α
renamed none — the overlay slug is inserted before the width, so all 84 existing
names survive intact as prefixes — and reported **1 failed / 191 passed**, the
one failure being arm 1 naming exactly the 8 unstaged files. Predict the arms
from what the gate does to NAMES, not from the fact that it minted.

#### The undimmed strip below the fold — ARTIFACT, but not for the reason it looks

All 8 new baselines show the region from y=812 to y=883 **undimmed** while the
rest of the page sits under the scrim. `Blanket` is `position: fixed; inset: 0`
so it is 812 tall, `fullPage` captures the whole 883, and the capture stitches
the two.

**THE OBVIOUS DEFENCE — "the page is scroll-locked, so nobody can ever see it" —
IS FALSE, AND IT WAS MEASURED.** With the modal open, `<html>` and `<body>` both
compute `overflow: visible` / `position: static`, **identical to the closed
state**; `window.scrollTo(0, 200)` moves `scrollY` 0 → **71** (the full 883−812
range), and a real `mouse.wheel` gesture reproduces it. The background scrolls
behind an open modal.

**IT IS AN ARTIFACT ANYWAY, because a fixed scrim follows the VIEWPORT.** After
scrolling, the blanket's rect is still `[0, 0, 375, 812]` and the old fold has
moved up to viewport y=741 — hit-testing 10px below it returns `div.mn-blanket`,
as does the viewport bottom. The strip is reachable, and it is covered when it
is reached. **Checked in BOTH themes; every number above is identical in each.**

So the baselines record no defect and must not be re-minted for this. What the
same measurement did surface, separately and minor, is that the DS's `Blanket`
does not lock background scroll — logged from the MVP side for the gap register,
not acted on from this repo.

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
