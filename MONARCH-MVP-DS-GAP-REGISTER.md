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

Twelve entries. Tags are exactly as defined in the sweep brief. **G11 and G12
were added after the original sweep** — they come from MVP gates (α and D), not
from Flows 8–12, which is why their `Flows` cell is `—`.

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
| **G11** | `Blanket` | **Background scroll lock under an open modal.** The DS `Blanket` does not lock it, so the page behind a modal scrolls. | `prop-gap` | — | *Register `G11` — the flow inventory's `G`-numbers are a different series and run only G1–G3; this is the register's.* Measured at Gate α on `/finance/holding/fd`, both themes, numbers identical in each: `overflow` and `position` on `<html>` and `<body>` compute the same open and closed, and `window.scrollY` moves **0 → 71** under both a scripted `window.scrollTo(0, 200)` and a real `mouse.wheel` gesture. **Not a rendering defect** — the fixed scrim follows the viewport, so hit-testing 10px below the old fold returns `div.mn-blanket` once it is scrolled into view — but scroll-locking is standard modal behaviour and its absence is an accessibility concern. **DS-side; not fixable from the MVP.** Candidate for a single `Blanket` fix in one DS release alongside **G12** and the logo-asset work |
| **G12** | `Blanket` | **Frame awareness.** `Blanket.css` is `position: fixed; inset: 0`, so above the MVP's 430px frame cap it dims the FULL VIEWPORT rather than the capped frame. | `prop-gap` | — | *Register `G12`, same series as G11 and unrelated to the flow inventory's `G1`–`G3`.* Newly visible as of **Gate D**, which capped the app at 430 and centred it; invisible before, because the frame filled the window. **The modal CARD is unaffected**: at 375 wide centred on a 1280 viewport it lands at 452.5, inside the frame's 425–855. So this is the SCRIM overreaching and nothing else. Whether it should is a **design call, not a defect ruling** — the same both-halves shape as G5/G6 in §5. **DS-side; not fixable from the MVP**, and `inset: 0` on a fixed element cannot be bounded by a consumer without a seam the DS chooses to expose. Candidate for a single `Blanket` fix in one DS release alongside **G11** and the logo-asset work |

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
| **Not blocking** | G3, G9, G10, G11, G12 | G3 already ships (slate badges render today); G9/G10 are latent and untriggered; G11/G12 are `Blanket` items from MVP gates, outside Flows 8–12 entirely |

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

## 2a. Status at MVP Gate 41 (2026-09-01) — DS pinned at v1.16.0

**THE REGISTER ABOVE IS DATED 2026-08-09 AND WAS WRITTEN AGAINST v1.2.0. Thirteen
DS releases have shipped since.** Four entries have moved, and they are recorded
here rather than by editing the rows above, so the original sweep stays readable
as the document it was.

Every closure below was re-derived against the **pinned** package in
`node_modules/@monarch/design-system`, never against the DS working tree and
never against a changelog.

| # | Was | Now | How it was checked |
|---|---|---|---|
| **G1** | `component-gap` — no bottom-anchored sheet; *"the critical path… blocking Flows 8 and 9"* | **CLOSED** | `Sheet` ships. `dist/components/Sheet/Sheet.d.ts` exists in the pin; `git ls-tree` on the DS shows `src/components/Sheet/` absent at `v1.2.0` and present at `v1.3.0` (4 files), so **v1.3.0 is the release that closed it**, as carried |
| **G9** | `prop-gap` — `Chips`' leading glyph is a fixed `done` checkmark | **CLOSED** | `dist/components/Chips/Chips.d.ts` declares `icon?: React.ReactNode` and documents *"pass `null` for no glyph at all"*. Present at both `v1.15.0` and `v1.16.0`, so it closed **before** this gate, not because of it. Flow 8's four applied chips are the first MVP consumer to pass `null` |
| **G10** | `token-gap` — `FilterChip.css` FAIL-LOUD literal `padding-left: 10px` when both icons are set | **CLOSED** | zero matches for a `10px` literal in any `.mn-filter-chip` rule of the pinned `dist/index.css` |
| **G8** | `prop-gap` — `Modal`'s header and ✕ are not suppressible, *"compounds G1"* | **OPEN, but MOOT for Flow 8** | still unconditional — `Modal.tsx:115` renders `<div className="mn-modal__header">` with no guard (**the register cites `:109`; the file grew underneath the reference**). It only ever mattered as a way to fake a sheet out of a `Modal`, and G1 removed the need: Gate 42 will compose the real `Sheet` |

**G11 and G12 are unchanged and still open.** Both are `Blanket` items and
neither is fixable from this repo.

### Two new entries — G13 and G14, both `Sheet` (renumbered at Gate 43)

**THESE WERE `U1` AND `U2` UNTIL GATE 43, AND THAT WAS A CATEGORISATION ERROR AS
WELL AS A COLLISION.** They were lettered `U` for **U**pcoming Flow 8/9 sheet
work, which put them in the same namespace as §7 "Unverifiable / needs Teku"
U1–U6 — so `U1` and `U2` each meant two different things depending on which
section you were in, and `U3`/`U4` were taken by §7 alone.

**THE FIX IS NOT A FIFTH LETTER; IT IS PUTTING THEM IN THE SERIES THEY ALWAYS
BELONGED TO.** These are ordinary register entries — a named component, a
concrete demand, a tag, affected flows and evidence — which is exactly what
`G1`–`G12` are. §7's `U` series is a different KIND of thing: open questions
nobody can answer from code. Extending `G` is also the established precedent
rather than an innovation: **`G11` and `G12` were themselves added at MVP Gates
α and D, after the original sweep**, by the same mechanism.

Four letters (`E`, `H`, `T`, `V`) were measured free across all three numbered
documents and all four were rejected: inventing a fifth series to hold two rows
compounds the ambiguity this renumber exists to remove.

**§7's U1–U6 WERE DELIBERATELY NOT TOUCHED.** They are the original 2026-08-09
sweep, and §1 states that sweep "stays readable as the document it was". The
newer pair moves; the original does not.

| # | Component | Demand | Tag | Flows | Evidence |
|---|---|---|---|---|---|
| **G13** | `Sheet` | **Frame awareness.** The panel should cap at the app's frame width rather than spanning the window. | `prop-gap` | **8, 9** | **MEASURED at Gate 43** (was: derived from shipped CSS only). `.mn-sheet` is `position:fixed; inset:0` and `.mn-sheet__panel` is `width:100%` with **no `max-width` in any `.mn-sheet*` rule** — computed `max-width` reads `none`. Contrast `.mn-modal__card`, `width:100%; max-width:375px`, already frame-safe. Rendered widths below |
| **G14** | `Sheet` | **Background scroll lock** while the sheet is open. | `prop-gap` | **8, 9** | **MEASURED at Gate 43** by behaviour, not by reading CSS. `Sheet.tsx` portals to `document.body` and never touches `overflow` on `<html>` or `<body>`; with the sheet open the page behind scrolls its full extent. Same defect class as **G11**, which is scoped to `Blanket`/`Modal` and does not name `Sheet` |

#### G13 — the measurement, taken at Gate 43

**THE "NOT MEASURED" CAVEAT THAT STOOD HERE IS DISCHARGED.** It read that no
`Sheet` consumer existed yet so there was nothing to measure, and directed a
later gate to measure above 430 before treating the width as established. That
has now been done.

Measured through a Playwright-launched Chromium at `deviceScaleFactor: 2` with
`--disable-partial-raster`, against a throwaway `Sheet` mounted on the
Transactions tab and reverted byte-identical afterwards. The app was compiled
through the LIVE source alias, i.e. DS `v2.0.1`.

| viewport | panel rect | `.mvp-shell` rect | overhang per side |
|---|---|---|---|
| 375 | `left 0, right 375`, **width 375** | `left 0, right 375`, width 375 | **0** |
| 430 | `left 0, right 430`, **width 430** | `left 0, right 430`, width 430 | **0** |
| 768 | `left 0, right 768`, **width 768** | `left 169, right 599`, width 430 | **169** |
| 1280 | `left 0, right 1280`, **width 1280** | `left 425, right 855`, width 430 | **425** |

Computed `max-width: none` and `position: fixed` on `.mn-sheet` at every width;
the panel's portal parent is `document.body`, confirmed, which is why the
shell's `max-width: 430px` cannot contain it.

**THE SUITE'S TWO VIEWPORTS CANNOT SEE THIS, AND THAT IS THE POINT.** At 375 and
430 the panel width EQUALS the frame width and the overhang is exactly 0 — not
because the panel is frame-aware, but because the Gate D cap does not bind at or
below 430. The defect is latent at every width the visual net covers and only
appears above the cap. This is the same shape as the Gate 13 `sizing='fill'`
finding and the Gate 33 `CardBalance` cap: a real geometry fact that the pinned
viewports are arithmetically incapable of exposing.

**IT IS THE SAME CLASS AS GATE D's FIVE FIXED ELEMENTS.** Gate D found that
`position: fixed` chrome does not inherit the shell's cap and gave the nav,
scrim, FAB, theme switch and toast an explicit `--mvp-frame-inset`. `Sheet` is a
DS component with no such seam, so it is the sixth case and the first that this
repo cannot fix.

**G13 IS DS-SIDE PER RULE 3, AND THE OBVIOUS CONSUMER-SIDE FIX IS KNOWN TO BE
FATAL.** Capping the panel from the MVP would mean wrapping it in a
`transform`, `contain` or `filter` container — and Gate D measured all three:
each establishes a containing block and **un-fixes** the element, relocating it
to the bottom of the document and making it unhittable. The seam has to be
exposed by the DS.

#### G14 — the measurement, taken at Gate 43

**VERIFIED BY BEHAVIOUR, NOT BY READING CSS**, because a missing scroll lock is
an absence, and an absence cannot be confirmed by finding no rule — only by
watching the page move. Same context as G13 above.

With the sheet open, at BOTH 375 and 430, identically:

| probe | result |
|---|---|
| document scrollable extent behind the sheet | 1428 − 812 = **616px** |
| `window.scrollY` before opening | 0 |
| after `window.scrollBy(0, 300)` | **300** — the page moved |
| after a real `mouse.wheel` over the scrim | **616** — scrolled to the very end |
| computed `overflow` on `<html>` / `<body>` | `visible` / `visible` |
| computed `position` on `<body>` | `static` |
| `.mn-sheet` bounding top after scrolling 616px | **0** — the sheet itself correctly stays put |

So the sheet holds its position while the entire page behind it scrolls out from
under it. The last row matters: this is **only** a missing scroll lock, not a
broken `position: fixed`.

**THIS REPRODUCES THE GATE α `Blanket` FINDING IN A SECOND COMPONENT.** Gate α
measured exactly this on the preset modals — `overflow: visible` on both
`<html>` and `<body>` with the overlay open, and a real wheel gesture moving the
background — and logged it as G11.

**WHETHER G14 FOLDS INTO G11 IS THE REVIEW THREAD'S CALL, NOT THIS DOCUMENT'S.**
They are the same defect in two components, and G11 already proposes a single
`Blanket` fix. Listed separately here because G11's evidence names `Blanket` and
`Modal` specifically and a reader checking `Sheet` against it would find nothing.

**NEITHER G13 NOR G14 WAS FIXED, AND NEITHER MAY BE FIXED FROM THIS REPO.**
Rule 3. An MVP-local `max-width` on `.mn-sheet__panel` would be a finding, not a
fix — it is the equal-specificity override on DS geometry that Gate 13 removed
on measurement — and Gate D proved the three container-based alternatives
(`transform`, `contain`, `filter`) each un-fix the element.
### Two further entries — B1 and B2, opened at MVP Gate 41-B

**THE `U` COLLISION THAT FORCED THIS LETTER IS RESOLVED AS OF GATE 43.** This
paragraph originally read that §7 "Unverifiable / needs Teku" runs **U1–U6**
while §2a's "Two new entries" ran **U1–U2** for `Sheet`, so a bare `U`-number
meant two different things depending on the section — and it deferred the
renumber to the review thread on the grounds that renumbering a live series is
not a cosmetic edit. Gate 43 carried out that renumber: the `Sheet` pair is now
**G13/G14**, in the register series it always belonged to.

**`U` NOW MEANS EXACTLY ONE THING — §7, and only §7.** A bare `U`-number is
unambiguous again, so the "always write §2a U1 or §7 U1" instruction that stood
here is retired rather than merely satisfied.

**`B1`/`B2` KEEP THEIR LETTER, DELIBERATELY.** They were opened at Gate 41-B and
closed by DS v2.0.0; renaming a closed pair buys nothing and would break the two
dated gate records that cite them. **`G` is the series a NEW register entry
joins** — that is now the standing rule, set by G11/G12 and confirmed by
G13/G14.

**BOTH WERE FOUND BY READING FIGMA, NOT BY READING THE DS**, which is why the
original sweep missed them: that sweep asked whether each component had the
SLOTS a flow demanded, and both of these are about a component's own GEOMETRY.

| # | Component | Demand | Tag | Flows | Evidence |
|---|---|---|---|---|---|
| **B1** | *(none exists)* | An **applied-filter chip**: a dismissible pill summarising one facet — `label` plus a trailing ✕. | `component-gap` | **8** | Figma draws it at `888:10849` — white ground, `Dropshadow_default`, `pl 12 / pr 8 / py 4`, `gap 4`, radius 8, `body/caption-semibold` on `Neutral02` `#6b7280`, trailing 12px `close` glyph, **24px tall**. **No pinned DS component can render it.** `Chips`: `icon` is documented "leading glyph" and renders BEFORE the label — no trailing slot and no `onClick` — and `.mn-chips` is `padding: 0 var(--brand-scale-100)`, i.e. **16px** tall against 24. `FilterChip` HAS `iconRight` + `onClick` but is the SHEET's toggle (`filter/chips/toggle`): `padding: 12px 16px` = **40px** tall, bordered and transparent. `Tag` has `iconAfter` + `onClick` but is `padding: 4px 2px`, radius 4 |
| **B2** | `Field` | **Fill the content column.** Figma's search field is **343 wide** — the whole 375−32 gutter. | `prop-gap` | **8** | `.mn-field` declares a hard `width: 240px`, and `FieldProps` exposes no `sizing` / `isFullWidth` / `width`. Measured live on `/finance [tab:transactions]`: the field renders `[16, 158, 256, 204]` — **240 wide in a 343 column, at 375 AND at 430**. The only `width` escape in any `.mn-field*` rule is `.mn-field--compact { width: auto }`, which also forces `justify-content: center` and is documented as the "square, icon-only field (no text/label)" — it cannot carry a placeholder |

**B1 IS NOT "FIGMA USED THE WRONG COMPONENT", AND THAT DECIDES HOW IT GETS
FIXED.** Inventory **A9** already records that Figma builds these chips out of
`Field` instances. Read together with this entry, that says the DESIGNER was
improvising too — the Figma library has no applied-filter chip either, so the
frame reached for the nearest available pill. The fix is therefore a genuinely
NEW component on both sides, not a re-binding of an existing one.

**MVP GATE 41-B SHIPPED THE MODEL AND STOPPED AT THE APPEARANCE, PER RULE 3.**
The chip COUNT, ORDER and LABELS now match Figma exactly — three chips,
`All` / `This Month` / `RM 0 - 500`, no facet prefixes, payee appearing only
when set — because that is data and needs no primitive. The white pill and the
dismiss ✕ were NOT approximated in MVP CSS, because that would be defining a
primitive here.

**B2 IS THE SAME SHAPE AS THE `CardBalance` FINDING, AND THE PRECEDENT IS
BINDING.** MVP Gate 26 recorded `CardBalance` as pinned at its own
`max-width: 172px` with "no fill or sizing prop", declined to override it from
the consumer, and waited for **DS v1.11.0** to add `sizing="fill"` — which Gate
33 then adopted. `Field` wants the identical prop for the identical reason. An
MVP-side `.mn-field { width: 100% }` override is precisely what Gate 13 REMOVED
on measurement, on the grounds that it masks the DS's ownership of geometry.

**NEITHER RE-LITIGATES `not-a-gap`.** That table clears `Field` for "search with
leading glyph + trailing filter button" — SLOTS — and `Chips` was only ever
examined for its LEADING glyph (**G9**). Width and a trailing dismiss were never
asked of either.

---

## Summary

- **28 of 28 screens read.** **40 DS components read in source**, `.tsx` and `.css`.
- **14 register entries**: 2 `component-gap`, 11 `prop-gap`, 1 `token-gap`.
  (G11 and G12 were added at MVP Gates α and D, and **G13/G14 at Gate 43** —
  the latter pair renumbered there out of a colliding `U1`/`U2`, see §2a — all
  after the original sweep, which reported 12.)
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
