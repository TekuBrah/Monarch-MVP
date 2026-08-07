# Monarch MVP — Handoff, 2026-08-07

**Continues `MONARCH-MVP-HANDOFF-08052026.md` (Flow 1 — Homepage).** That file
stands as written; nothing in it is restated here except where this session
closed one of its open items. Read it first for the foundation — `types.ts`, the
accounts provider, the chrome config, the `ComingSoon` API. This file covers
only what changed since.

**This session was short and single-purpose: catch Flow 1 up to design system
v1.1.0.** No new flow was built.

Every figure below comes from a command run fresh at close — `git log`,
`git status`, `git branch`, `git show`, `npm ls`, `package.json`,
`npm run lint:tokens`, `npm run build`. Nothing is carried from session memory.

---

## CURRENT STATE — verified fresh

| Check | Result |
|---|---|
| Branch | `main` |
| Working tree | **clean** (`git status --porcelain` empty) |
| HEAD | `5525069` — "8/7/2026 commit" |
| HEAD contents | `package.json` · `package-lock.json` · `src/data/derive.ts` · `src/flows/homepage/HomepageCrypto.tsx` — 4 files, +38 / −12 |
| Branches on disk | `main` · `fix/flow01-trend-direction` · `phase/5-flow01-homepage` |
| DS dependency (spec) | `github:TekuBrah/Monarch-Design-System#v1.1.0` |
| DS dependency (resolved) | `git+ssh://…#e4df2df2cdb7d26acb5a14c2fa5680186287e653` |
| `npm run lint:tokens` | ✅ PASS — 25 files, exit 0 |
| `npm run build` | ✅ clean, 15.15s, exit 0 |

**This session's work is committed.** Teku committed it as `5525069` while the
session was still running; `trendOf` is present in HEAD at `derive.ts:109` and
both call sites at `HomepageCrypto.tsx:71` and `:94`. The
`fix/flow01-trend-direction` branch still exists locally and is now redundant.

---

## 1. The v1.1.0 bump — and a silent failure worth remembering

**⚠️ `npm install` reported success and installed nothing.**

After editing `package.json` from `#v1.0.0` to `#v1.1.0`:

```
up to date, audited 115 packages in 3s
NPM INSTALL EXIT: 0
```

Exit zero, no warning, no error. But **nothing had happened**:

- the lockfile still pinned `6248fb0e…` — the v1.0.0 commit
- `node_modules/@monarch/design-system/dist/components/` contained **no**
  `TrendIndicator`, `DonutChart` or `LineChart`
- `dist/index.d.ts` exported none of them

npm saw an existing lockfile entry for the git dependency and did not
re-resolve it. **A changed tag in `package.json` is not enough on its own.**

**What actually resolved it** — an explicit, targeted install of that one
dependency:

```bash
npm install "github:TekuBrah/Monarch-Design-System#v1.1.0"
```

56 seconds (it fetches from GitHub and runs the DS's `prepare` script to rebuild
`dist/`). Afterwards the lockfile pinned `e4df2df2…`.

**How the result was confirmed — four independent checks, not the exit code:**

1. `package-lock.json` pins the new commit hash.
2. `dist/components/TrendIndicator`, `DonutChart`, `LineChart` all **PRESENT**.
3. `dist/index.d.ts` exports all three (lines 48, 12, 22).
4. `dist/index.css` contains the new `mn-trend` / `mn-donut` / `mn-line-chart`
   class names.

> **This will recur at every future tag bump.** Do not trust `npm install`'s
> exit code after changing a git tag. Check the lockfile hash and the presence
> of whatever the new tag was supposed to add, or delete the lockfile entry and
> reinstall.

---

## 2. Type confirmation — and the tsc/Vite split is now benign

`CLAUDE.md`'s standing condition: **Vite** resolves `@monarch/design-system` to
DS *source* via the local alias, **TypeScript** resolves it to the installed
*dist* types. They agree only when the installed tag matches the local source.
This bump is what brought them back into agreement.

**Confirmed, not assumed.** A temporary root-level probe (`__typeprobe.ts`,
deleted immediately after) imported and constructed values of:

`TrendIndicatorProps` · `TrendDirection` · `DonutChartProps` · `DonutSegment` ·
`LineChartProps` · `LineChartColor` · `ChartHue`

and imported the three components as values. Then:

```
npx tsc --noEmit --skipLibCheck --strict __typeprobe.ts
TSC PROBE EXIT: 0
```

`--traceResolution` on a real source file then reported:

```
Module name '@monarch/design-system' was successfully resolved to
'D:/Claude/Monarch-MVP/node_modules/@monarch/design-system/dist/index.d.ts'
```

So tsc reads the installed dist types, exactly as documented — and those types
now describe the same code Vite compiles from source. The split is dormant
again. **It reopens the moment DS source changes a type without a tag bump.**

---

## 3. `trendOf()` — `src/data/derive.ts`

```ts
export function trendOf(changePct: number): TrendDirection {
  if (changePct > 0) return 'up'
  if (changePct < 0) return 'down'
  return 'flat'
}
```

**Why it lives in `derive.ts` and not at the call site.** A direction passed per
row would be a *second source of truth* for a fact the data already states — the
same shape of bug the DS had just fixed, where `ListItem` asserted "up"
independently of the number beside it. The arrow and the percentage now come
from one input, so they cannot disagree. This is the §6 derive-don't-copy rule
applied to a non-numeric derivation.

It imports `TrendDirection` from the DS as a type — consistent with `types.ts`
already importing `LogoName` and `IconName`. The DS's vocabulary, not a local
re-declaration.

**The `-0` edge case matters and is handled.** `-0 > 0` is false and `-0 < 0` is
also false, so `-0` falls through to `'flat'`. A naive `changePct < 0 ? 'down' :
'up'` would have rendered negative zero as a rise. Verified:
`trendOf(0)` → `flat`, `trendOf(-0)` → `flat`, `trendOf(0.0001)` → `up`,
`trendOf(-0.0001)` → `down`.

---

## 4. Call sites fixed, and the verification

Two, both in `HomepageCrypto.tsx` — My Tokens (line 71) and Featured Coin
(line 94). Both now pass `trendDirection={trendOf(x.changePct)}`.

**Verified on the running app, both themes, computed styles, animations
finished with the `try/catch`, token values from a freshly-inserted probe.**

| Row | value | direction | glyph token | label token |
|---|---|---|---|---|
| Bitcoin | +10.2% | up | success ✅ | success ✅ |
| **Ethereum** | **−2.49%** | **down** | **error ✅** | **error ✅** |
| Solana | +250.68% | up | success ✅ | success ✅ |
| Litecoin | +225.72% | up | success ✅ | success ✅ |
| Polygon | +175.37% | up | success ✅ | success ✅ |

`directionMatchesSign: true` on every row in **both** themes. Ethereum's glyph
and label both compute `rgb(235,79,82)` light / `rgb(188,63,66)` dark — the error
token, not green.

**The label colour follows direction**, confirmed rather than assumed: every
row's label matches its direction's *text* token exactly. That is the DS's
intended v1.1.0 change (the label used to stay gray), and it did happen.

**Geometry survived the crossing exactly** — 12px glyph at offset 0, label at
offset 16, 4px gap, 16px row height, glyph vertically centred at offset 0.00,
identical in both themes. `.mn-trend` computes `display: flex` because its parent
is a flex container, which is the condition the DS flagged as the one that would
change the box model if it ever failed.

Console: no errors.

---

## 5. `flat` is correct end to end — but has no call site that shows it

**Flow 1's Homepage never renders `flat` today.** "My Tokens" shows
`topHoldings(cryptoHoldings, 2)` — Bitcoin and Ethereum. The three zero-change
holdings (Tether, Stellar, Uniswap, all `changePct: 0`) sit behind "See all".

Rather than report that as verified, it was proven in **two halves, and the
method is reusable** whenever a state has no live instance:

**a. The derivation** — Vite serves the real modules, so the *shipped* code was
imported in the browser and run against the *shipped* seed data:

```js
const derive   = await import('/src/data/derive.ts')
const accounts = await import('/src/data/accounts.ts')
accounts.CRYPTO_HOLDINGS.map(h => derive.trendOf(h.changePct))
```

Result: Bitcoin `up` · Ethereum `down` · **Tether / Stellar / Uniswap all
`flat`** · no zero returned `up`.

**b. The rendering** — a live `.mn-trend` node was cloned, switched from
`mn-trend--up` to `mn-trend--flat`, and measured, so the **DS's own shipped CSS**
answered: glyph and label both resolve `--mapped-icon-subtle-default` /
`--mapped-text-subtle-default` in both themes.

So `flat` works; it is simply not reachable from this screen. **It becomes
visible the moment "See all" or Flow 5 lands** — neither needs new work to make
it correct.

---

## 6. The removed selector — zero references

The DS deleted `.mn-list-item__trend` from `ListItem.css` in v1.1.0.

```
grep -rn "mn-list-item__trend" src/   →  ZERO
grep -rn "mn-list-item"        src/   →  ZERO
```

**This repo targets no `.mn-list-item*` selector at all.** Nothing to clean up,
and nothing broke. Worth keeping true: MVP CSS should keep styling its own
composition classes and never reach into DS internals.

---

## 7. A comment that became false with the bump

`HomepageCrypto.tsx`'s C1 note previously read:

> *"The DS ships no charting primitive — and `ListItem` proves the point,
> because it exposes a `miniChart` slot with nothing in the library to fill
> it."*

v1.1.0 ships `LineChart`, so that was false the moment the dependency moved. It
now records that **C1 is resolved DS-side**, that a sparkline is `LineChart` with
its chrome switched off sized for the `miniChart` slot, and that it is
**deliberately not adopted here** because charts land with Flow 7 and Flow 1 is
not being reopened for them.

---

## 8. DS `package.json` still reads `version: 1.0.0`

The git tag moved to `v1.1.0`; the DS's own `package.json` `version` field did
not. npm resolves git dependencies **by tag**, so nothing breaks and the correct
code is installed — but `npm ls` will keep printing:

```
`-- @monarch/design-system@1.0.0 (git+ssh://…#e4df2df2…)
```

**Cosmetic, and recorded for a future DS session. Do not fix it from this repo.**
The hash is the thing to check when verifying a bump, not the version string.

---

## 9. DECIDED — signed percentage labels stay

Flow 1 renders `+10.2%` / `−2.49%`. Figma renders them unsigned.

**Decision: the signs stay.** This closes the open question raised at the end of
the last session.

Reason: with an unsigned label, **colour is the only thing distinguishing a
decline** at 12px — and the DS has a registered, accepted contrast gap on exactly
those status tokens (`--mapped-text-error-default` measures 3.64:1 light /
3.93:1 dark against 4.5:1). Leaning on colour alone for meaning is the weaker
choice regardless of that, and the gap makes it weaker still.

There is no doubling: the DS's `TrendIndicator` **strips a leading sign when
composing its announcement**, so `−2.49%` is voiced "Decrease, 2.49%" — verified
live on the Ethereum row. The sign is visual reinforcement only.

Recorded as a deliberate divergence from Figma, not an oversight.

---

## 10. 🔴 WHAT FLOW 7 INHERITS — read this before starting Finance Overview

Flow 7's Total Networth card is the hero use of `LineChart`. Four of these are
constraints to design around, not bugs to fix.

**a. The card will render WITHOUT its area fill.** No on-color area-fill token
exists — the mapped alpha surfaces resolve fully transparent, and the `-100`
ramp step that tints the twelve hues has no white equivalent. Registered DS-side
as **work item E-4**. Figma's card has an area fill; the MVP's will not.

**b. That card's axis labels will go near-black in dark mode.** Three on-color
tokens still dark-flip — `--mapped-text-on-color-caption`, `-label` and
`-placeholder` all go `#e7eaed` → `#0d0f11` on a surface that does not itself
flip. Registered DS-side as **work item E-3**.

> **Neither is an MVP defect and neither is Flow 7's to fix.** Flow 7 should use
> the correct tokens and **let the gaps show**. Do not substitute a different
> token, do not add a `token-exempt`, do not work around either in MVP CSS. They
> are token-layer decisions awaiting a DS session.

**c. `LineChart` takes an explicit `domain`.** It defaults to
`points.length` ("data fills the width"). Figma's chart is **month-to-date
through the 15th on a full-month axis** — gridlines span the full width while the
line stops at the `15` tick, with the marker and the `+ RM 8,768.35` callout at
that point. Flow 7 must pass `domain={31}` with ~15 points, not let the data
stretch to the axis end.

**d. `LineChart` takes `chromeTone`.** The Total Networth card is a coloured
card, so it passes `chromeTone="onColor"` and `color="onColor"` (a white line).
The default `'default'` tone is for charts on the page surface.

**e. ⚠️ Inventory A10 is NOT a defect — do not inherit it as one.** The flow
inventory flagged `Line 7` / `Line 8` as suspicious at *"x=343 with width 343"*.
Design context reads `left-0 … w-[343px]` — **correct full-width gridlines**. The
inventory's reading was a metadata artifact. Nothing to fix, and no time should
be spent on it.

---

## 11. What is on disk now that was not at the last handoff

**The design system is at v1.1.0 — 48 components**, three of them new:

| Component | Purpose | Adopted here? |
|---|---|---|
| `TrendIndicator` | Directional change indicator; `up` / `down` / `flat` | ✅ **Yes** — via `ListItem`'s `trendDirection` |
| `DonutChart` | Segmented donut / pie (`innerRadius={0}` = pie) | ❌ **No — deliberately** |
| `LineChart` | Line / area, and the sparkline with chrome off | ❌ **No — deliberately** |

`DonutChart` and `LineChart` **exist for Flow 7** (Total Networth) and Flow 10
(Budget). They are not used anywhere in this repo. Flow 1's Featured Coin rows
still pass no `miniChart`, by decision — Flow 1 is closed and is not being
reopened to add a sparkline.

Also newly available and unused: `ChartLegendItem` gained an
`iconColor?: IconObjectColor` prop, which is what makes it usable as a real
chart legend beside `DonutChart` (its badge used to be hardcoded gray).

---

## Open items — updated from the last handoff

Four of the last handoff's seven are now **CLOSED** by the DS v1.1.0 session:

| # | Item | Status |
|---|---|---|
| 1 | `#0caaff` has no backing token | ✅ **DECIDED** — no new token; `--brand-teal-500` stays and Figma gets updated to match. **Teku's Figma edit has not happened yet**, so Figma and code diverge by design until it does |
| 2 | `ListItem type="crypto"` cannot render a decline | ✅ **CLOSED** — `TrendIndicator` shipped; this session adopted it |
| 3 | White-on-`--brand-*-400` fails AA | ✅ **DECIDED, not fixed** — the card moved to `-500`; the residual gap is accepted and recorded DS-side with the decision attached |
| 4 | G1 + G3 + C1 — one charting decision | ✅ **CLOSED** — `DonutChart` + `LineChart` shipped |
| 5 | Litecoin ticker, receipt-glyph discrepancy | 🔸 Open — fix register |
| 6 | Dark-mode Figma reference has no node ID | 🔸 Open — Teku |
| 7 | Desktop max-width | 🔸 Parked, unchanged |

**New, carried forward:**

| # | Item | Owner |
|---|---|---|
| 8 | **E-3 / E-4 will visibly affect Flow 7** — see §10a/b | DS token session |
| 9 | DS `package.json` version field still `1.0.0` | DS session, cosmetic |
| 10 | `fix/flow01-trend-direction` branch is now redundant (merged into `5525069`) | Teku — delete when convenient |

---

## NEXT

**Flow 7 — Finance Overview**, where the trend chart is the hero card. Read §10
before starting: two of its visual shortfalls are already known, already
decided, and are not Flow 7's to fix.

Flow 1 is closed. Nothing in this session reopened it beyond the call-site
catch-up.
