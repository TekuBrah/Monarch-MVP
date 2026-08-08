# Monarch MVP — Design System Gap Register

**Date:** 2026-08-09
**Scope:** Phase 5, Flows 8–12 (`Finance_transaction`, `Receipt add and link`,
`Finance_Budget`, `Finance_Plan`, `Onboarding`)
**Status:** reconnaissance complete. Nothing in either repo was modified.

---

## 1. Method

### What this document is for

Flow 7 needed **two** design-system bumps, not one. Part A found `CardBalance`
was missing `onClick`; that shipped as v1.2.0; then the build found
`CardBalance` *also* hard-codes `<IconObject color="slate">` with no prop to
override it. The miss was structural: Part A asked "does a DS component exist
for this Figma instance?" and stopped once the answer was yes.

Five flows remained. At one gap discovered per build that is up to five more
bump cycles. This register exists to collapse them into one, and it is
organised **by component, not by screen**.

### What was read

| Stage | Work |
|---|---|
| **A** | 9 of 28 screens read from Figma; component-keyed demand map built |
| **A.2** | the remaining **19 screens** read; demand map extended; two `📄` rows left open |
| **B** | those two rows closed, then **the DS source read against the demand map** |

**Screen coverage: 28 of 28.** Every screen in Flows 8–12 was read directly
from Figma. Nothing in the demand map is inferred from the flow inventory.

### Sources

- **Figma** — local desktop MCP only (`http://127.0.0.1:3845/mcp`). Reachability
  proven by an **authenticated `whoami` round-trip returning real user data**
  (`Teku Cheong` / `tekucheong@gmail.com` / plan `team::1142871351349340621`,
  pro tier, Full seat), re-proven at the start of Stage A.2 and Stage B. Never
  an open-port check. File key `v9MI8jxTaXiJA234Hkanlf`.
- **Design system** — `D:\Claude\Design system test`, **source only**. Every
  component's `.tsx` *and* `.css` were read. Not `dist/`, not the `.d.ts`
  alone. That distinction is the whole point: `CardBalance`'s
  `<IconObject color="slate">` is invisible in the type declaration and
  invisible in `dist/`, and is findable only in source.
- **MVP** — `D:\Claude\Monarch-MVP` @ `main` `183b412`, clean tree.

### Scale

**40 DS components** are touched by Flows 8–12. Every one was read.

---

## 2. The register

Ten entries. Tags are exactly as defined in the sweep brief.

| # | Component | Demand | Tag | Flows | Evidence |
|---|---|---|---|---|---|
| **G1** | *(none exists)* | A **bottom-anchored, full-width sheet**. F8's filter sheet is 375×609 at y=203; F9's transaction sheet 375×649 at y=163 and 375×897 at y=69. All flush to the frame bottom. | `component-gap` | **8, 9** | `grep -rniE "bottomsheet\|bottom-sheet\|actionsheet\|drawer" src/components/` → **zero matches**. `Modal.css:6-7` is hard-centred `align-items: center; justify-content: center` with no variant |
| **G2** | *(none exists)* | The **iOS action sheet** on F9 `add receipt` — Photo Gallery / Camera joined by a hairline, Cancel separated. Drawn entirely as `Group 2/3/4/5`, `Rectangle 3/4`, `Line 1` and bare `text`. The only fully uncomponentised interactive surface in the five flows. | `component-gap` | **9** | Figma `1266:14281` `0:598`–`0:610`; no DS primitive composes it (see G1 evidence) |
| **G3** | `CardBalance` | Per-category badge tint (teal / green / yellow / orange). | `prop-gap` | **7** (shipped) | `Card/CardBalance.tsx:19` — `<IconObject color="slate" size="l">`. **Both `color` *and* `size` are hard-coded.** v1.2.0 added `onClick` and did not close this |
| **G4** | `SummaryItem` | Same per-category tint, inside `card/monthly budget`'s `item/summary` rows (`icon_wallet`, `icon_Spend`). | `prop-gap` | **10** | `Item/SummaryItem.tsx:22` — `<IconObject color="slate" size="l">`, character-identical to G3. **A second instance of the reference defect** |
| **G5** | `CardDataDisplay` | A **wide 311×56 label-left / value-right row** (F11 "Savings · RM 600/year"), alongside the 147.5×112 and 163.5×80 tiles. | `prop-gap` | **11** | `Card/CardDataDisplay.css:3` `flex-direction: column` with no orientation prop; `:10` `max-width: 300px` also blocks 311. Figma **detached** the node to build it |
| **G6** | `DatePicker` | A **visible title caption above the date** — Figma's `Date range picker` renders `title` + `date` (`title="Date (From)"`, `"Date (To)"`, target date, DOB). | `prop-gap` | **10, 11, 12** | `DatePicker/DatePicker.tsx` — has `ariaLabel`, documented "this component has no visible label". No `label`/`title` prop exists |
| **G7** | `IconObject` | **16×16**, ×6 on F11 `education`'s check/cross checklist. | `prop-gap` | **11** | `IconObject.tsx:19` ramp is `'s'\|'m'\|'l'\|'xl'\|'xxl'`; `IconObject.css:21-25` = 20/24/32/40/56. **16px is `--brand-scale-400`, which already exists** — an `xs` step is token-backed and additive, not a new token |
| **G8** | `Modal` | Reuse as a sheet needs the header and its ✕ suppressible. | `prop-gap` | 8, 9 | `Modal/Modal.tsx:109` renders `<div className="mn-modal__header">` **unconditionally**, and `:119` hard-codes the close `IconButton`. Compounds G1 |
| **G9** | `Chips` | *(latent — met for these flows)* The leading glyph is fixed. | `prop-gap` | — | `Chips/Chips.tsx:15` — `<Icon name="done" size="s" />` always renders. Harmless for F9's `success`/"Linked" demand; a `removed` chip would still show a checkmark |
| **G10** | `FilterChip` | *(latent — not triggered)* Both-icons padding. | `token-gap` | — | `FilterChip.css` FAIL-LOUD literal `padding-left: 10px` when `iconLeft` **and** `iconRight` are set — 10px is off the `--brand-scale` ramp. F8's chips carry no icons |

### `not-a-gap` — verified met, so these are never re-checked

| Component | Demand | How it is met |
|---|---|---|
| **`Tabs`** | 5 tabs, 428 natural in 343 → scroll | `isScrollable` (v1.2.0). `TabsProps.tabs` has no count constraint; roving tabindex computes from `tabs.length` |
| **`ListItem`** | one leading slot for merchant logos **and** person avatars; receipt glyph left of the amount; signed amounts with no colour split | `leading?: ReactNode` (docstring: "company logo, Avatar, or crypto mark"). `ListItem.tsx:85` puts `receipt_long` inside `.mn-list-item__amount-row` before the amount — exactly Figma's position. `amount` is one pre-formatted string in one class, so `+RM 1200.15` renders in the default colour, matching Figma |
| **`RangeSlider`** | two handles, tooltip, `RM` formatting, paired currency inputs | `minValue`/`maxValue`/`formatValue`/`showTooltip`/`showInputs` — all four demands are named props |
| **`DonutChart`** | 7 segments + centre label | `segments: DonutSegment[]` with `ChartHue` names; `innerRadius` **default 0.648, measured from Figma's `Pie Chart` `0:379`** — the exact Flow 10 node |
| **`ProgressStepper`** | 7 × 24×4 pills, current/past vs future | `ProgressStepper.css` — 24×4, `--brand-scale-1800` pill radius, `--mapped-surface-default-default` (future) vs `--mapped-icon-primary-default` (active). `totalSteps` defaults to 7 |
| **`CardMonthlyBudget`** | two heights (343×208, 343×96) | `state?: 'default' \| 'addNew'` plus `percentage`/`amountLeft`/`totalAmount`/`availableAmount`/`spentAmount` |
| **`CardGoals`** | image header, title, pct, saved/target | `image?` slot + `title`/`percentage`/`current`/`total` |
| **`ProgressBar`** / **`ProgressRing`** | nested and standalone; `amountLeft`/`left`/`totalAmount` | `showLabels`, `percentageLabel`, `current`/`total`; ring has `caption`/`amount`/`total` |
| **`FilterChip`** | `label` + selected, fill `rgba(4,110,255,0.1)` | `isSelected`; fill is `color-mix(in srgb, var(--mapped-border-primary-default) 10%, transparent)` — the exact value, derived from a real token |
| **`Field`** | search with leading glyph + trailing filter button | `leadingIcon` + `trailingIcon`; also `isCompact`, `isInvalid`, `isRequired` |
| **`Menu` / `MenuItem`** | 7-row multi-select with checkboxes | `slotContent` + `isOptionList` (roving tabindex); `MenuItemType` includes `'checkbox'` |
| **`Tag`** | 28×18 badge on a photo thumbnail | `appearance="overlay"`, `size="s"`, `iconBefore`/`iconAfter` |
| **`Divider`** | horizontal **and** rotated vertical | `orientation?: 'horizontal' \| 'vertical'` |
| **`Slider`**, **`Toggle`**, **`Radio`**, **`Checkbox`**, **`Avatar`**, **`Badge`**, **`Label`**, **`IconButton`**, **`Select`**, **`HeaderBg`**, **`BottomNavigation`**, **`StatusBar`**, **`Button`**, **`Icon`**, **`Logo`**, **`ElementWrapper`** | as mapped in Stage A/A.2 | prop surfaces cover the demand with no hard-coded internal in the way |
| **`HeaderDefault`** | F8 sheet header with a "Reset" action; F12 header carrying the stepper | `actionLabel`/`onAction`; `isProgressStepper`/`currentStep`/`totalSteps` |

---

## 3. Sequencing view — what blocks which flow

| Blocks | Gaps | Note |
|---|---|---|
| **Flow 8** (earliest) | **G1**, G8 | The filter sheet is the screen. Without a bottom-anchored sheet there is nothing to build the flow's only overlay from |
| **Flow 9** | **G1**, **G2**, G8 | Three bottom-anchored sheets plus the action sheet. G2 is Flow 9 only |
| **Flow 10** | **G4**, G6 | G4 is visible on the Budget tab's three cards; G6 on the add-budget modal |
| **Flow 11** | **G5**, **G7**, G6 | All three are single-screen, low-severity |
| **Flow 12** | G6 | One field caption |
| **Not blocking** | G3, G9, G10 | G3 already ships (slate badges render today); G9/G10 are latent and untriggered |

**The critical path is G1.** It blocks the two earliest flows, it is the
largest single item, and G8 is a strict prerequisite of solving it by extending
`Modal` rather than adding a new primitive.

Everything else can slip a release without stopping a build.

---

## 4. FIX IN FIGMA — the DS is correct

Kept separate from the code gaps because **no DS work is implied by any of it.**

### 4a. The foreign-variable batch — six families, and the DS already handled every one

Stage A.2 found variables and hexes belonging to no Monarch token namespace,
sitting on shared components across four of five flows. The hypothesis under
test was that they were third-party template residue confined to decorative
mockups. **That is false — they sit on real, shared components** (`Tab`,
`Modal`, `card/monthly budget`, the navbar scrim). But so is the worry, because
the shipped DS uses a proper Monarch token in **every** case.

| Figma variable | Value | Where in Figma | What the DS actually ships |
|---|---|---|---|
| `--token('color.border.selected')` | `#0c66e4` | `Code parts / <Tab>` selected underline — **all five flow dumps** | `var(--mapped-border-primary-default)` |
| `--accent02` | `#2d3436` | `item/summary` amount (×7), `HeaderDefault` title | `var(--mapped-text-default-default)` |
| `--neutral01` | white | `Modal` surface | `var(--mapped-surface-elevation-default)` |
| `--neutral02` | `#6b7280` | `Finance_Receipts` group label | mapped text tokens |
| `--mc_primary` | `#046eff` | F11 `Finance_Plan` (×2) | `--mapped-*` primary family |
| `--foundations/white` | white | navbar scrim gradient (×3) | see carried-forward item 4 |
| `--token('space.050' / '.150' / '.200')`, `--token('color.text')`, `--token('elevation.surface.overlay')` | Atlassian | `Select` menu rows, `1266:14336` | `--brand-scale-*` / mapped tokens |

**Proof the DS is clean:** `grep -rniE "accent02|neutral01|neutral02|mc_primary|foundations/white|--token\(" src/` over the whole design system returns **two hits, both comments** —
`Header/HeaderDefault.css:50` and `Item/SummaryItem.css:13` — each explicitly
recording that Figma specifies a raw unmapped `Accent02 #2d3436` with no
brand/alias/mapped equivalent, and that the nearest real semantic token was
used per approval. `#0c66e4` appears **once** in the entire DS, in a `Tab.css`
comment stating the same.

→ **`figma-defect` ×6 families. Zero DS action.**

### 4b. `Tab`'s selected underline — checked hard, and it holds

The brief warned not to let a clean CSS read close this, because `CardBalance`
was right in its type declaration and wrong in the DOM. Three independent
checks:

1. **Exactly one rule** sets the underline, in source and in the shipped
   `dist/index.css`: `.mn-tab--selected::after { background: var(--mapped-border-primary-default) }`.
   `grep -rn "mn-tab--selected" src/**/*.css` finds no competing declaration —
   there is no second rule for a cascade to prefer.
2. **The token dark-flips.** `--mapped-border-primary-default` → `--alias-primary-500`
   (`globals.css:476`, light) and `--alias-primary-600` (`:670`, inside
   `[data-theme="dark"]` at `:522`) → `--brand-blue-500` / `--brand-blue-600`.
3. **`#0c66e4` reaches no stylesheet** — its single occurrence is a comment.

⚠️ **The live-DOM confirmation was NOT run**, and I am not claiming it was. No
dev server was running (`curl localhost:5174` → no listener) and starting one
was out of scope for this session. What closes it completely is one
`getComputedStyle(tab, '::after').backgroundColor` read per theme against a
rendered `Tab`. I judge the risk low — the DOM failure mode requires a
competing declaration, and there is none — but it is stated as outstanding
rather than papered over.

### 4c. Other Figma-side defects observed, not investigated further

- F8 `A1` — the filter sheet is titled **"Network Fee"**, lifted from Flow 5's
  gas-fee sheet. A visible heading, not hidden text.
- F8 `A2` — **"Transaction Merchant"** labels both the merchant `Select` and the
  RM range slider. The second should read "Transaction Amount".
- F11/F10/F9 — `❖ Link` instances present but **hidden**, replaced by raw
  `text` nodes (F10 ×1, F11 ×3). Same class as Flow 1 A4.
- F12 `_09` — the theme preview cards carry literal `#f7f7f7`, `#555`, `#222`,
  `#4895ff`. Decorative mockup art; see carried-forward item 10.

---

## 5. `shape-mismatch` — design calls, not code fixes

**These do not resolve by reading a prop surface.** Each asks whether the design
system *should* support the usage at all. They need Teku, not a DS session.

| # | Usage | The question it actually is |
|---|---|---|
| **S1** | `Field` rendered as a 24-tall applied filter chip (F8, F9) | `Field` renders an `<input>`. The DS already ships `Chips`, `Tag` **and** `FilterChip`, any of which fits a dismissible applied-filter pill. Is this a Figma component-choice error, or is an applied-filter chip a distinct thing that needs its own answer? |
| **S2** | `Blanket` 812 tall over a 966-tall screen (F9 `Receipt added`) | The scrim does not cover its own frame. Authoring slip, or is the sheet meant to extend past the scrim? |
| **S3** | `Field` **detached** to embed a country-code selector inside itself (F12 `_06` `0:282`) | Code-side this is already possible — `leadingIcon` takes a `ReactNode`. So the Figma component could not do what the code can. Should the Figma component gain a leading slot, closing the detach at source? **Second detach-to-extend in the file, after `Tabs`.** |
| **S4** | `list/chart legend` as key-value metadata rows (F9, detached ×3 across two screens) | Fourth distinct purpose for this component, and **never once an actual chart legend**. Does the DS need a key-value row primitive, or is `ChartLegendItem` simply misnamed for what it has become? |
| **S5** | `card/data display` at three aspect ratios, one detached into a wide row (F11) | Also has a concrete code fix — **see G5**. The design question is whether one component should span a 147×112 tile and a 311×56 row, or whether those are two components |
| **S6** | `IconObject` at 16×16 (F11 `education` ×6) | Also has a concrete code fix — **see G7**. The design question is whether the ramp gains an `xs` step or the design steps up to the existing 20px |
| **S7** | `Tabs` detached frame positioned at **`x=-69`** (F9 `View receipt`) | Horizontal scroll simulated by hand in Figma. Not a code question at all — v1.2.0's `isScrollable` already covers it. It is evidence of the demand, and the Figma frames should be re-instanced once the component is trusted |
| **S8** | `Select / Transfer` used as a **category picker** (F10) and a **funding-source picker** (F11) | *Found in Stage B.* `SelectTransfer` is an amount-plus-currency control (`onAmountChange`, `currencyFlag`, `currencyMenuSlot`). Neither use is an amount. Plain `Select` fits both. Wrong component chosen in Figma, or does the name simply lag its use? |

S5 and S6 appear in both this section and the register: they have a real code
fix **and** a design question behind it, and closing only one leaves the other
open.

---

## 6. Carried forward — already-known DS items

Transcribed, **not re-derived and not re-investigated** this session. They
belong here so the DS session has one document.

| # | Item | Source |
|---|---|---|
| 1 | **`CardBalance` has no `iconColor`** — hard-coded `slate`. Flow 7's STOP-class finding. *(Re-confirmed in source this session as **G3**, and found a second time as **G4**.)* | Flow 7 Part B close-out |
| 2 | **E-3** — no on-color area-fill token. `LineChart`'s `onColor` series renders no area because tinting white needs an opacity, and no mapped alpha token can express it | Flow 7 Part B |
| 3 | **E-4** — dark-mode axis labels near-black. `--mapped-text-on-color-caption` dark-flips to near-black on a coloured card | Flow 7 Part B |
| 4 | **`--gradient-*` tokens never dark-flip** — white scrim over a dark page. *(Note: v1.2.0 shipped `--mapped-gradient-default/subtle`, which do flip; the un-prefixed originals still do not.)* | Handoff 08082026 §7 |
| 5 | **White-on-`--brand-*-400` low contrast, 10 of 12 hues, both themes.** A ramp question — **explicitly NOT an AA blocker**, because every card states its category as text, so colour is redundant with the label | Handoff 08082026 §A4 |
| 6 | **`ElementWrapper` renders via an inline `style={{}}` object**, violating the DS's own `CLAUDE.md` ban | Handoff 08082026 §7 |
| 7 | **DS `package.json` reads `version: 1.0.0`** while tags moved. *(Observed at v1.2.0: now reads `1.2.0` — may already be closed; not re-verified as a register item.)* | Handoff 08082026 §7 |
| 8 | **DS `CLAUDE.md` points at `src/main.tsx`**, deleted in the Phase 2 restructure | Handoff 08082026 §7 |
| 9 | **`Tabs` scroll-into-view uses `behavior: 'smooth'` only** — inert wherever smooth is unavailable, silently. Measured in Flow 7: every smooth scroll no-ops in that browser pane, with `prefers-reduced-motion: false` | Flow 7 Part B |
| 10 | **The three-mode contrast picker** (F12 `_09` — Standard / Dimmed / High Contrast, plus an independent text-scale axis) against the DS's two-theme `--mapped-*` layer. A **token-architecture question, confined to one configuration screen, NOT a blocker.** Stage A.2 confirmed the three modes are authored on `_09` alone; all ten onboarding screens render light | Stage A.2 |

---

## 7. Unverifiable / needs Teku

| # | Item | Why it is open |
|---|---|---|
| **U1** | **`Tab` selected underline — live DOM confirmation** | Statically airtight (§4b), but no `getComputedStyle` read was taken. No dev server was running and starting one was out of session scope. One measurement per theme closes it |
| **U2** | **G1 — one sheet primitive or two?** | The five flows draw **two distinct shapes**: bottom-anchored full-width sheets (F8 ×1, F9 ×3) and centred inset cards (F9 ×2, F10 ×1, F11 ×2). `Modal` already covers the second. Whether the first is a `Modal` variant or a separate `Sheet` is a DS design call |
| **U3** | **G2 — is the action sheet a DS primitive at all?** | It could legitimately be an MVP rule-4 composition over `Blanket`. It appears on exactly one screen. Building a DS primitive for a single use may be the wrong trade |
| **U4** | **All eight `shape-mismatch` items (§5)** | Each is a design decision about whether the DS should support a usage. None is answerable from code |
| **U5** | **Flow 12's `OTP Qwerty keyboard`** (instanced on `_06`, `_07`, `_08`) and the **camera shutter** (`_04`, `_09`, raw ellipses) | Judged OS/device chrome, not DS concerns. Recorded in case Teku disagrees |
| **U6** | **`Select / OTP`** — six 50.5×58 single-digit boxes, authored as `<frame>`s, not instances | No DS component covers a segmented OTP input. Whether that is a `component-gap` or an MVP composition of six `Field`s depends on whether OTP entry recurs beyond Flow 12. **Not filed as a gap** — one flow, one screen |

---

## Summary

- **28 of 28 screens read.** **40 DS components read in source**, `.tsx` and `.css`.
- **10 register entries**: 2 `component-gap`, 7 `prop-gap`, 1 `token-gap`.
- **6 foreign-variable families → `figma-defect`.** The DS is correct on every
  one, and already documents two of them in comments.
- **8 `shape-mismatch` items** needing a design call, not code.
- **The critical path is G1** — a bottom-anchored sheet primitive, blocking
  Flows 8 and 9.
- The single most useful negative result: **`Date range picker` is not a
  calendar.** It is a 56-tall titled date field (`Hydrate`/`Filled`), used as a
  From/To pair on F10 and singly on F11 and F12. Flow 7's "the DS ships no
  calendar and none is built" decision generalises, and what looked like the
  sweep's largest `component-gap` reduces to one missing label prop (**G6**).

**Nothing was fixed. Nothing was staged, committed, pushed or tagged. No branch
was created.**
