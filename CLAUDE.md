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
npm run dev      # dev server, port 5174
npm run build    # tsc -b && vite build
npm run preview  # serve the production build
```

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

- Verify with `getComputedStyle` and DOM assertions **in both themes**
  (`document.documentElement.dataset.theme = 'dark'`), not screenshots — the
  screenshot tool has been unreliable throughout this project and failed again
  in Phase 4.
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
