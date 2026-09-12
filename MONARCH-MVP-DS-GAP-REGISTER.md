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
| **G8** | `prop-gap` — `Modal`'s header and ✕ are not suppressible, *"compounds G1"* | **OPEN, but MOOT for Flow 8** | still unconditional — `Modal.tsx:115` renders `<div className="mn-modal__header">` with no guard (**the register cites `:109`; the file grew underneath the reference**). It only ever mattered as a way to fake a sheet out of a `Modal`, and G1 removed the need: Gate 43 composed the real `Sheet` |

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
### Two new entries — G15 and G16, opened at MVP Gate 43 building the filter Sheet

Both were found by BUILDING the sheet rather than by reading either source, and
both are `Select`. Neither was fixed here (rule 3).

| # | Component | Demand | Tag | Flows | Evidence |
|---|---|---|---|---|---|
| **G15** | `Select` | **Fill the content column.** Figma's merchant dropdown is **343 wide** — the whole 375−32 gutter. | `prop-gap` | **8, 9** | `.mn-select` declares a hard `width: 320px` whose own comment calls it *"Figma demo width; caller-controllable"*, and **`SelectProps` exposes neither a `sizing` prop nor a `className`** — so there is no mechanism to control it with, and the comment's claim is not met. Measured live at Gate 43 on `/finance [tab:transactions] [overlay:filter]`: the control renders **320 wide in a 343 column**, 23px short, at 375 AND at 430. **This is B2 again on a different component** — same shape, same tag, same fix |
| **G16** | `Icon` | A **storefront / merchant mark** for the merchant dropdown's leading slot. | `component-gap` | **8** | Figma draws a storefront glyph inside the `Select` trigger before "Watson". The DS `Icon` registry is **102** named assets and contains **no `storefront` and no `store`** (`grep` over `Icon/icons.ts`: zero matches for either). *(**102 CORRECTED FROM 101 AT GATE 46.** The 101 was never measured here — it was quoted from a prose comment in the DS's own `Icon.test.tsx`, written at Gate 4 and stale by the time G16 was opened. The zero-matches claim that decided the gap was always right; only the size was wrong.)* `Select` DOES expose the slot (`leadingSlot`), so this is an ASSET gap, not a prop gap — the composition point exists and there is nothing to put in it |

**G15 SHIPPED UNFIXED AND VISIBLY SHORT, WHICH IS THE B2 PRECEDENT AND NOT AN
OVERSIGHT.** An MVP-local `.mn-select { width: 100% }` is the
equal-specificity override on DS geometry that Gate 13 removed on measurement,
and that `TransactionsLedger`'s own search-field note explicitly forbids. B2
rendered a 240px field in a 343 column for two whole gates before DS v2.0.0
closed it; the same disposition applies here. The call site carries a comment
saying so, so a future session does not "tidy" it into an override.

**G16 WAS NOT FILLED WITH A NEAR-MISS GLYPH.** Substituting an unrelated icon
would be exactly the "do not substitute a control the mockup draws differently"
failure, and it would make the gap invisible. The slot is left empty.

#### Both CLOSED at MVP Gate 46 — DS v2.1.0 shipped both, adopted here at v2.2.0

| # | Status | What closed it | Verified in this repo |
|---|---|---|---|
| **G15** | **CLOSED** | `Select.sizing?: 'fixed' \| 'fill'` plus `.mn-select--fill { width: 100% }` | Adopted in `TransactionFilterSheet.tsx`. Measured live at 375 and 430 through a Playwright-launched Chromium at DPR 2: the trigger renders **343** in the 343 column and **398** in the 398 column, so the 23px shortfall is **0 at both viewports**, and the element carries `mn-select--fill` |
| **G16** | **CLOSED** | `storefront` added to the `Icon` registry, taking it **102 → 103** entries | Present at `dist/components/Icon/icons.d.ts:350` AND in the sibling source `Icon/icons.ts:189` — both paths checked, because the Vite alias compiles the second and the pinned dist is what `tsc` reads. Adopted as `leadingSlot={<Icon name="storefront" size="m" />}`; the trigger now renders two SVGs where it rendered one |

**THE "BEFORE" FIGURE WAS RE-DERIVED AT GATE 46 AND IS 102, NOT THE 101 THIS
ENTRY CARRIED FOR THREE GATES.** Derived by counting the `ICONS` object's own
keys at each tag rather than by trusting any prose:

```bash
git show v2.0.1:src/components/Icon/icons.ts | awk '/^export const ICONS/,/^\}/' | grep -cE "^  [A-Za-z0-9_]+:"   # 102
git show v2.2.0:src/components/Icon/icons.ts | awk '/^export const ICONS/,/^\}/' | grep -cE "^  [A-Za-z0-9_]+:"   # 103
```

and the delta confirmed to be exactly one key by `diff`-ing the two sorted key
lists: `> storefront:`, nothing else.

**A NAIVE PER-LINE GREP UNDERCOUNTS BADLY AND IS THE TRAP TO AVOID HERE.**
`grep -cE "^  [A-Za-z0-9_]+: *[A-Za-z0-9_]+Icon,?$"` returns **66/67** across
the same two tags, because entries carrying a trailing comment or a differently
shaped right-hand side do not match. Count the object's KEYS, not the lines that
happen to look like assignments.

**WHERE 101 CAME FROM, because the propagation is the lesson.** It was a prose
comment in the DS's `Icon.test.tsx`, written at Gate 4 and never re-derived. The
DS has since corrected it in place and its own comment now names this repo as
the victim — G16 quoted the comment as fact rather than measuring, and a number
nobody owned became evidence in two repos. Neither the gap nor its closure ever
depended on it: what decided G16 was `grep` returning **zero** for `storefront`
and `store`, which was true at 101, at 102 and at any other size.

**NO MVP-LOCAL OVERRIDE WAS EVER WRITTEN FOR EITHER, WHICH IS THE POINT.** G15
shipped visibly short for three gates rather than being papered over with
`.mn-select { width: 100% }`, and G16's slot was left EMPTY rather than filled
with a near-miss glyph. Both closed by the DS growing the seam — rule 3 working
as designed, and the reason each closure is one prop and nothing else.

**`Select.sizing` AND `Sheet.sizing` DO NOT SHARE A VALUE UNION, AND MUST NOT BE
ASSUMED TO.** `Select.sizing` is `'fixed' | 'fill'`; `Sheet.sizing` — adopted in
the same file at the same gate — is `'hug' | 'fill'`. The DS's own doc comments
give the reason, and it is not an inconsistency: Select's default is a literal
320px box, so Figma's `hug` would name behaviour it does not have, while Sheet's
default is genuinely hug-height, so `'fixed'` would name behaviour IT does not
have. Read each from its own `.d.ts`; never infer one from the other.
`Sheet.sizing` is additionally the only `sizing` prop in the DS whose axis is
HEIGHT rather than width.

### One new entry — G17, `HeaderBg`, opened at MVP Gate 44 making the app installable-clean

Found by INSTALLING the app rather than by reading either source: standalone on
Android the phone draws its own status bar, and this app draws a second, fake
one underneath it. Not fixed DS-side (rule 3).

| # | Component | Demand | Tag | Flows | Evidence |
|---|---|---|---|---|---|
| **G17** | `HeaderBg` | **Suppressible status bar, and safe-area awareness.** A consumer running standalone must be able to (a) turn off the fake `StatusBar` and (b) put a legibility scrim in the safe-area strip above the header's own content. | `prop-gap` | **1, 7, 8** | `HeaderBg.tsx:74` renders `<StatusBar mode="Dark" …/>` UNCONDITIONALLY. `HeaderBgProps` exposes `statusBarTime` but no `showStatusBar`, and no slot above `.mn-header-bg__content` — so a consumer can change the fake clock's TEXT but cannot remove the clock. Measured at Gate 44: installed standalone the app shows two status bars, the phone's real one and this one. `HoldingDetailScreen` is unaffected by the prop half because it renders `StatusBar` itself and can simply stop — the gap is specifically that `HeaderBg` cannot |

**THE CONSUMER-SIDE ANSWER SHIPPED, AND IT IS A RULE ON DS-OWNED CLASSES —
STATED PLAINLY BECAUSE THAT IS NORMALLY THE THING THIS PROJECT REFUSES TO DO.**
`src/index.css` carries an `@media (display-mode: standalone)` block that
resizes `.mn-status-bar` to the safe-area inset and hides its glyphs, and adds
`.mn-header-bg::before` as the scrim. Three things make this a different act
from the equal-specificity geometry override Gate 13 removed and G15/B2
refused, and all three should be checked before it is ever copied:

1. **THE DS DECLARES NOTHING FOR THIS CONTEXT.** There is no `display-mode`
   query anywhere in the DS, so the block is not contending with a DS opinion —
   it is supplying behaviour for a mode the library does not model.
2. **IT IS ENTIRELY INSIDE THE MEDIA QUERY**, so the browser-tab rendering is
   untouched — measured, ZERO of 104 baselines moved.
3. **THE ALTERNATIVE WAS SHIPPING THE DEFECT.** G15's "ship it visibly short"
   precedent covers a 23px cosmetic shortfall with a working control. This is a
   duplicated piece of OS chrome in the installed app, and there is no prop to
   reach it with at all.

**IT IS STILL A COUPLING AND IT CAN STILL ROT.** The block overrides
`.mn-status-bar`'s `height` and `padding`, so a future `StatusBar` that changes
its own box could interact with it. That is the cost of the missing prop, and
it is the argument for the prop.

#### Gate 44-B — the coupling got LOOSER, and G17 itself is unchanged

**THE PARAGRAPH ABOVE IS GATE 44'S DATED RECORD AND IS ACCURATE FOR GATE 44.**
That block no longer overrides `height` or `padding`: it is now
`visibility: hidden` plus `min-height: env(safe-area-inset-top, 0px)` and
nothing else. `padding: 0`, `min-height: 0`, `height` and `overflow: hidden`
all went, so the MVP no longer contends with `StatusBar`'s own box at all — it
only raises a floor the DS still sets. The coupling that remains is one
direction (the DS may grow the bar; the MVP will never shrink it), which is
strictly less than what Gate 44 shipped.

**THE PROP GAP IS UNCHANGED AND STILL OPEN.** `HeaderBg` still renders
`StatusBar` unconditionally and still exposes no slot above
`.mn-header-bg__content`. G17 is not closed by this.

**THE SCRIM HALF OF G17 IS NOW KNOWN TO BE INERT ON ANDROID.**
`.mn-header-bg::before` is sized to `env(safe-area-inset-top)`, and Android
Chrome grants a standalone PWA no region above the viewport, so that inset is
0 and the scrim has zero height there. It is kept because it is correct and
live wherever the region IS granted. **So the (b) half of G17's demand is
worth less than it looked when it was written** — a slot above the content
would be usable on iOS edge-to-edge and dead on Android. Weight the (a) half
accordingly when the DS rules on it.

### One new entry — G18, `HeaderBg`, opened at MVP Gate 44-B reading `Header/bg`'s full vertical spec

Found by reading the Figma component's COMPLETE vertical box model rather than
just the three figures an earlier gate had needed. Not fixed DS-side (rule 3),
and deliberately not worked around MVP-side either.

| # | Component | Demand | Tag | Flows | Evidence |
|---|---|---|---|---|---|
| **G18** | `HeaderBg` | **Honour Figma's FIXED row heights, or expose them.** `Header/bg` fixes its status row at `h-44` and its content row at `h-50`; the DS hugs both. | `shape-mismatch` | **1, 7** | Read from node `390:639` (`Type=No search bar`) at Gate 44-B. Figma: status row `h-[44px]`, content row `h-[50px]`, `gap-[8px]`, 10px below the last row — 44+8+50+10 = **112**, which is the frame's declared height. The DS sets no height on either: `.mn-status-bar` hugs `8px` padding around a 24px line box = **40**, and `.mn-header-bg__row` hugs its tallest child, the 32px avatar = **32**. Measured live at 375, both HeaderBg screens: status bar **40**, header **90**, greeting at y=**52**. So the component renders **22px shorter than the design** — 4 in the status row, 18 in the content row — and the two shortfalls are independent. `gap` (8) and `padding-bottom` (10) are both correct and are not part of this |

**IT IS A RULING, NOT A BUG REPORT, WHICH IS WHY IT IS `shape-mismatch`.** The
DS's hug is a deliberate choice and its own comment records the back-solve that
produced the 10px bottom padding, so nobody transcribed a number wrongly. The
open question is whether Monarch wants Figma's fixed 112 or the DS's hugged 90,
and that is Teku's call rather than a defect to fix.

**IT WAS NOT CORRECTED FROM THE MVP, AND THAT WAS THE CONSTRAINT RATHER THAN
THE PREFERENCE.** Gate 44-B's standalone spacer floors at the app's **40**, not
Figma's 44, precisely so the browser-tab render cannot move: honouring 44 would
change pixels on `/`, `/finance` and every `/finance/holding/*` screen, which is
5 screens and a large share of the 104 baselines. **Whoever rules on G18 should
expect a re-mint**, and should note that the MVP's floor is written as
`min-height` against the DS's own natural height rather than as a literal — so
if the DS adopts 44, the MVP follows with no edit.

**THE SEARCH-BAR VARIANT IS OUT OF SCOPE AND WAS NOT READ FOR THIS.**
`HeaderBgVariant` is `'default' | 'noSearchBar' | 'compact'`, and the Figma node
read at Gate 44 was `Type=No search bar` (`390:639`, 375×112), whose own
`Frame 278`/`Field` search row is `hidden`. This app renders `compact` on
Finance and `noSearchBar` on the Homepage; nothing here renders `default`.

#### G18 CLOSED at MVP Gate 46 — DS v2.2.0 honoured both fixed row heights

The DS took the `shape-mismatch` ruling and adopted Figma's geometry. The whole
CSS delta is two declarations, both FAIL-LOUD raw literals with the token gap
named in the comment rather than curve-fitted out of `calc()` between ramp
steps:

| rule | added | closes |
|---|---|---|
| `.mn-status-bar` | `height: 44px` | the 4px status-row shortfall |
| `.mn-header-bg__row` | `height: 50px` | the 18px content-row shortfall |

So `HeaderBg` goes **90 → 112**, which is the frame height Figma declares, and
44+8+50+10 closes exactly as Gate 44-B derived it.

**IT IS THE MOST EXPENSIVE DS CHANGE THIS REPO HAS ABSORBED, AND THE COST IS
BASELINES RATHER THAN CODE.** `src/` needed no edit at all. What it cost was
**92 of 104 baselines**, because the two rules reach every screen that renders
either a `HeaderBg` or a bare `StatusBar` — measured at Gate 46, not estimated
from a filename prefix:

| family | walk states | mechanism | Δ height |
|---|---|---|---|
| `/` + its 3 non-default tabs | 4 | `HeaderBg` | +22 |
| `/finance` + its 4 non-default tabs | 5 | `HeaderBg` | +22 |
| the 9 holding routes | 9 | bare `StatusBar` in flow | +4 |
| `/finance/holding/fd` overlays | 3 | bare `StatusBar` | +4 |
| `/finance [tab:transactions]` overlays | 2 | `HeaderBg` | +22 |
| `/transfer`, `/more`, `/steward` | 3 | **neither** | **0** |

23 of 26 walk states × 2 viewports × 2 themes = **92**, and the suite failed on
exactly those 92 with the other 12 byte-identical. The 12 are the three
`ComingSoon` routes, which render no status bar at all — they are the control
group that proves the attribution.

**THE +4 HALF IS THE ONE THAT WOULD BE MISSED.** `StatusBar` is not only used
inside `HeaderBg`: `HoldingDetailScreen` renders it directly, in flow, above a
`HeaderDefault`. So a change described as "the header grew" in fact reaches
twelve screens that have no `HeaderBg` on them.

**ONE MVP RULE'S FLOOR MOVED, AND IT STILL BEHAVES CORRECTLY.** Gate 44-B's
standalone rule is `min-height: env(safe-area-inset-top, 0px)` on
`.mn-status-bar` with deliberately NO `height`, so the box floors at whatever
the bar naturally occupies and rises to the inset when the inset is larger. The
DS now declares `height: 44px`, so that floor is **44 rather than 40**. The
`max(natural, inset)` behaviour the rule was written for is unchanged, and the
MVP rule needed no edit — but the number it floors at is now the DS's, which is
the outcome G18 was asking for.

#### The Figma provenance for Gate 44's `Header/bg` read

Established by `mcp__figma-local__get_metadata` against the live desktop
selection, before that server disconnected later in the session:

| node | id | box |
|---|---|---|
| `Header/bg` — variant `Type=No search bar` | **`390:639`** | 375 × 112 |
| `img/bg01` — the artwork slot | `390:640` | 375 × 112 at y=0 |
| `Status Bar` | `390:641` | **375 × 44 at y=0** |
| `Frame 442` — the content row group | `390:642` | 375 × 50 at y=52 |
| `header` — avatar + greeting | `390:644` | 197 × 32 |
| `Frame 278` / `Field` — the SEARCH ROW, `hidden` in this variant | `390:648` | 375 × 44 |

**THE ARTWORK AND THE STATUS BAR BOTH START AT y=0 AND THE ARTWORK IS THE FULL
112**, which is the geometric statement that the status bar sits OVER the
artwork rather than above it — the arrangement Gate 44 reproduces with the real
system bar in place of the drawn one.

**THE OVERLAY TOKEN IS `surface/Overlay/default` = `#0d0f1199`**, read from the
same selection via `get_variable_defs`. It resolves to
`--mapped-surface-overlay-default`, declared at BOTH `:root` and
`[data-theme="dark"]` with the same value in the pinned v2.0.1 `globals.css` —
so it is theme-invariant and needs no dark-mode handling. Rendered check:
`rgba(13, 15, 17, 0.6)`, i.e. `#0d0f11` at alpha `0x99`.

#### One deliberate COPY divergence from Figma — the Apply button, Gate 44

**COPY-LEVEL ONLY. THE NUMBER IS IDENTICAL; THE WORDS AROUND IT ARE NOT.**
Recorded here rather than silently resolved, on the same convention as the
`Transaction Merchant` / `Transaction Amount` divergence below.

| | |
|---|---|
| Figma prints | `Apply Filter (15)` |
| the app prints | `Apply Filter · 15 results` |
| what N counts | **unchanged** — rows the pending filter matches |

**THE SEMANTICS WERE VERIFIED AND DELIBERATELY NOT TOUCHED.**
`TRANSACTION_FILTER_APPLIED` over the 23-row ledger returns 15, and the frame
prints 15; a count of facets changed would print 2 and a count of options
selected would print 4. So the number is a ROW COUNT and Figma agrees. Gate 44
changed only the unit.

**WHAT WAS WRONG WITH THE PARENTHESISED FORM.** At the screen's new opening
state the button read `Apply Filter (23)`, which parses as "23 filters" at
least as readily as "23 rows" — and a bare bracketed integer on a button is a
badge convention, i.e. a count of the things the button acts ON, which here
would be filters. Naming the unit is the whole change.

**THE THREE FORMS, ALL MEASURED ON ONE LINE AT BOTH VIEWPORTS** (Poppins
600 14px/16px, longest run 160.77px inside a 343px button at 375 and a 398px
button at 430 — line-box count 1 in every case):

| N | label |
|---|---|
| 0 | `Apply Filter · No results` |
| 1 | `Apply Filter · 1 result` |
| n | `Apply Filter · n results` |

Zero reads as a warning rather than as arithmetic, and the button stays enabled
because applying a filter that matches nothing is still a legal act. `1 result`
is handled rather than left to the plural, which is the classic tell of a count
pasted into a fixed string.

**N INCLUDES THE SEARCH TERM, which Figma cannot adjudicate** — the mockup's
search box is empty, so both readings print 15 there. Gate 43's judgment stands:
including it makes this literally the same `filterTransactions(...)` call the
ledger makes, so N is the number of rows the user will actually see.

#### The Figma provenance for Flow 8's sheet, recorded here because nothing else records it

**THE SHEET'S NODE ID HAD NEVER BEEN WRITTEN DOWN ANYWHERE.** Established at
Gate 43 by `mcp__figma-local__get_metadata` against the live desktop selection:

| node | id | box |
|---|---|---|
| `Finance_Transaction02` — the product frame, a COMPONENT INSTANCE | **`1266:14329`** | 375 × 812 |
| `Bottom Sheet` — the overlay wrapper (scrim + panel) | **`I1266:14329;825:6146`** | 375 × 812 |
| `Bottom Sheet` — the PANEL itself | **`I1266:14329;825:6148`** | 375 × 609 at y=203 |
| `Blanket` | `I1266:14329;825:6147` | 375 × 812 |

**`Finance_Transaction02` IS NOT THE SHEET; IT CONTAINS IT.** The sheet is a
child frame of the product frame, which is what the prompt suspected and what
the metadata confirms.

**DOCUMENT IDENTITY — SETTLED, AND THE TAB LABEL IS A RED HERRING.** The Figma
desktop tab reads `casestudy_tekucheong_Mas…` while the supplied URL says
`casestudy_02`, which raised the question of whether two different documents
were in play. They are the same document, and **no file key was needed to show
it** — no local tool returns one, so the identification is by content:

- **The sheet's box matches this register's own §2 `G1` row exactly.** `G1` was
  written from an earlier Figma read and records *"F8's filter sheet is 375×609
  at y=203"*. The Gate 43 metadata read returns `I1266:14329;825:6148` at
  **375 × 609, y=203** — the same three numbers, independently arrived at.
- **The node id resolves.** `1266:14329` exists in the open document and is
  named `Finance_Transaction02`, which is the id the supplied URL names.
- **The variable namespace matches** the one this register was built against —
  `Scale/*`, `Border Radius/*`, `text/*/*`, `surface/*/*`, `body/*`,
  `Dropshadow_*`, `Neutral01`/`Neutral02`.

§1 of this document records the file key as **`v9MI8jxTaXiJA234Hkanlf`**, which
is the key in the supplied URL. That is consistent, but it is EVIDENCE ONLY: it
was recorded in an earlier session and no Gate 43 tool call re-derived it. The
content match above is the load-bearing part.

**FIGMA'S OWN INSTANCE-VS-MAIN-COMPONENT WARNING, RESOLVED.** The Inspect panel
flags that *"the text in this instance differs from the main component"*. What
differs is **the fourth facet's label**. Figma layer names on an instance come
from the MAIN COMPONENT while the rendered text is the instance's override, and
the two disagree at exactly one node:

| node | layer NAME (main component) | rendered TEXT (instance) | width |
|---|---|---|---|
| `I1266:14329;826:7210` | `Transaction Merchant` | "Transaction Merchant" | 136 |
| **`I1266:14329;826:7475`** | **`Transaction Merchant`** | **"Transaction Amount"** | **126** |

So the main component labels BOTH the third and fourth groups "Transaction
Merchant" — a copy-paste in the main component — and the mockup instance
corrects the fourth to "Transaction Amount". The 10px width difference is
consistent with the shorter string. **Per standing convention the instance
wins**, so the app ships "Transaction Amount"; the divergence is reported here
rather than silently resolved. Every other text node's name and content agree.

This was established from layer-name provenance, not by opening the main
component — the local tools cannot address it without Teku selecting it, per the
addressing limitation noted above.

**THE `I…;…` FORM CANNOT BE ADDRESSED BY THE LOCAL FIGMA TOOLS.** Every
`mcp__figma-local__*` tool constrains `nodeId` to `^\d+[:-]\d+$`, which rejects
instance-child ids; only the remote server's schema accepts them, and the remote
is prohibited by standing instruction. So sub-node reads must go through the
DESKTOP SELECTION (call the tool with no `nodeId`), and a request to read one
specific child of an instance requires Teku to select it. Worth knowing before
planning a Figma read around child ids.

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

### Two further entries — G19 and G20, landed at MVP Gate 46

**BOTH WERE FOUND DS-SIDE AND REGISTERED IN THE DS DOCS AT GATE 45. THEY LAND
HERE SO THE `G`-SERIES IS NOT SPLIT ACROSS TWO REPOS.** The register is this
repo's document — see the CLAUDE.md warning about bare `G`-numbers — and a
G-number that exists only in the DS repo is a number nobody here can look up.
**NEITHER IS FIXED AT THIS GATE**, and the reason differs for each.

| # | Component | Demand | Tag | Flows | Evidence |
|---|---|---|---|---|---|
| **G19** | `SelectTransfer`, `SelectWalletAccount` | **Fill the content column** — the same demand G15 made of `Select`. | `prop-gap` | *(none yet)* | Both declare an identical hard `width: 320px` carrying the identical comment *"Figma demo width; caller-controllable"* — `SelectTransfer.css:9` and `SelectWalletAccount.css:16` — and **neither exposes `sizing` nor `className`**, so the comment's claim is unmet on both. Verified at Gate 46 against the pinned v2.2.0 `.d.ts`: zero matches for either prop on either component. **Neither composes `Select`**, so G15's fix did NOT reach them by inheritance — confirmed, zero imports from `../Select` in either `.tsx` |
| **G20** | `HeaderBg` | **The `default` (search-bar) variant is ~7px short** — renders **166** against Figma's **173**. | `shape-mismatch` | *(none yet)* | Registered DS-side at Gate 45; the shortfall lives in the search `Field`'s own box model rather than in either row height, so **G18's two fixed heights did not close it**. Pre-existing and deferred to the hygiene round |

**G19 IS DELIBERATELY NOT FIXED, AND THE REASON IS THAT IT HAS NO VICTIM YET.**
`grep` over MVP `src/` returns **zero** consumers of either component, so no
consumer has reported them short. G15 was fixed because a real screen rendered
23px short at both viewports and the shortfall was measurable; fixing G19 now
would be shipping a prop ahead of its adopter — the same trap as declaring
`.mvp-column--bleed` before the carousel needed it. The entry exists so that
the day a transfer flow renders one of these, the diagnosis is already written.

**THE PAIR IS ONE ENTRY, NOT TWO, BECAUSE THE DEFECT IS ONE COPY-PASTE.**
Identical declaration, identical comment, identical missing pair of props. A DS
fix that closes one and not the other would be a half-fix of exactly the shape
CLAUDE.md warns about, so they are registered together to make that visible.

**G20 WAS NOT RE-MEASURED IN THIS REPO, AND THAT IS STATED RATHER THAN
GLOSSED.** `HeaderBgVariant` is `'default' | 'noSearchBar' | 'compact'`, and
this app renders `noSearchBar` on the Homepage and `compact` on Finance —
**zero instances of `default`**, verified at Gate 46 by reading both call
sites. So the variant G20 concerns is unreachable from the MVP's walk, no
baseline can see it, and the 166/173 figures are carried from the DS-side Gate
45 measurement rather than confirmed here. Re-derive them in the DS repo before
acting on them.

### One further entry — G21, `Select`, opened at MVP Gate 46 building the merchant push

Found by BUILDING the push, not by reading either source: the trigger works and
announces itself wrongly.

| # | Component | Demand | Tag | Flows | Evidence |
|---|---|---|---|---|---|
| **G21** | `Select` | **A trigger mode that NAVIGATES rather than expands** — or, minimally, a way to suppress the combobox expansion semantics when no `menuSlot` is supplied. | `prop-gap` | **8** | `Select.tsx:122` renders `aria-expanded={open}` UNCONDITIONALLY on the input, and `open` is `isOpen ?? uncontrolledOpen`. At `TransactionFilterSheet.tsx` the merchant trigger pins `isOpen={false}` and intercepts `onOpenChange` to push the sheet's second view, so the control **navigates and never expands** — yet it permanently announces `aria-expanded="false"`, i.e. "there is a popup here, currently collapsed". There is no popup. `SelectProps` exposes no `role`, no `aria-*` passthrough and no `className`, so a consumer cannot correct the announcement from outside |

**IT IS A LIE OF PRESENCE, NOT OF STATE, WHICH IS WHY `aria-expanded={true}`
WOULD NOT FIX IT.** The attribute's presence is itself the claim that this
control owns a collapsible popup. A trigger that opens a different view of the
same dialog owns none, and the honest markup is no `aria-expanded` at all —
which is exactly what the component cannot be told to emit.

**THE DS COULD EXPRESS THIS TODAY WITHOUT A NEW PROP, AND THAT IS WORTH SAYING
IN THE ENTRY.** `Select` already computes `showMenu = open && !!menuSlot`
(`Select.tsx:80`), so it knows when no dropdown can ever render. Deriving
`aria-expanded` from that same condition — emitting the attribute only when a
`menuSlot` exists — would close this with no API surface added. Recorded as the
cheapest candidate fix, not as a demand for a particular one.

**NO MVP-LOCAL WORKAROUND WAS WRITTEN, DELIBERATELY.** The available hacks are
all worse than the gap: reaching into the rendered DOM to strip the attribute
from a DS node, or wrapping the control in a `role`-overriding element, both put
this repo in the business of correcting DS accessibility from outside — which is
the same class of act as `.mn-select { width: 100% }`, and would hide the gap
rather than register it. Deferred to the hygiene round.

### Two further entries — G22 and G23, opened at MVP Gate 46 building the multi-select picker

Both found by BUILDING the multi-select merchant picker. **G23 was not
anticipated by the gate's own brief** — it surfaced only when the trigger was
measured with two long names in it, which is why it is here rather than in a
report.

| # | Component | Demand | Tag | Flows | Evidence |
|---|---|---|---|---|---|
| **G22** | `Menu` | **Express multi-select.** A listbox whose options can be selected together must say so. | `prop-gap` | **8** | `Menu.tsx:125-126` emits `role="listbox"` and `aria-label={listAriaLabel}` and **nothing else** — no `aria-multiselectable`, and `MenuProps` exposes no prop that would produce one. The merchant picker is genuinely multi-select (two rows carry `aria-selected="true"` simultaneously, measured), so the listbox currently announces single-select semantics while behaving as multi-select. `MenuItem` is fine: it already emits `role="option"` + `aria-selected` (`MenuItem.tsx:74-75`), so only the container's declaration is missing |
| **G23** | `Select` | **Ellipsis, or a seam to add one.** A trigger whose value can exceed its box must truncate legibly. | `prop-gap` | **8** | `.mn-select__input` (`Select.css:73-82`) sets `width`, `min-width`, `border`, `background`, `outline`, `padding`, `color`, `caret-color`, `font-family` — and **no `text-overflow`**, so the computed value is `clip`. Measured at Gate 46 with two payees selected ("Bio Lab Laboratories, Caring Pharmacy"): at **375** the input is `scrollWidth` **309** against `clientWidth` **259**, i.e. **50px overflowing and cut mid-glyph with no ellipsis**; at **430** it is 314 against 314 and fits. `SelectProps` exposes no `className` and no style passthrough, so a consumer cannot add `text-overflow` from outside |

**G22 WAS NOT WORKED AROUND BY INJECTING THE ATTRIBUTE, DELIBERATELY.** Setting
`aria-multiselectable` onto a DS-rendered node from MVP code — by ref, by effect
or by wrapper — is this repo correcting DS accessibility from outside, the same
class of act as `.mn-select { width: 100% }`. It would also be invisible to the
DS's own tests, so the gap would stop being reportable while still being real.
**The behaviour ships regardless**: selection is announced per row through
`aria-selected`, which is correct and is what a screen reader reads on focus;
what is missing is only the container's up-front declaration that more than one
may be chosen.

**G23 IS THE SAME SHAPE AS G15 AND IS NOT CLOSED BY IT.** `sizing="fill"` fixed
how WIDE the control is; it did nothing about what happens when the value inside
exceeds that width. **No MVP-local
`.mn-select__input { text-overflow: ellipsis }` was written**, for the reason
that rule would target a DS internal; and no JS truncation was written either,
because a character budget is a literal that cannot be responsive and would
differ between the two viewports by construction.

**THE VIEWPORT POLARITY IS INVERTED AGAINST EVERY PRIOR FINDING OF THIS SHAPE,
AND THAT IS THE PART TO REMEMBER.** Gates 13, 26 and 33 all established
"375 hides it, 430 reveals it" — the arithmetic accident of the narrow column,
the right-edge clip, the `max-width` cap that only binds when the track is
wide — and 430 was added to the suite substantially for that reason. **G23 runs
the other way: 375 reveals it (309 against 259) and 430 hides it (314 against
314).** A session reaching for the established heuristic and checking the wide
viewport first will conclude there is no defect.

**IT NEEDS TWO SELECTIONS. A SINGLE MERCHANT CANNOT CLIP — MEASURED, NOT
ASSUMED.** All 18 payee names were ranked by rendered width in the input's own
computed font (`normal 400 16px/24px Poppins, sans-serif`) via canvas
`measureText`, and the widest was then VERIFIED by actually selecting it alone:

| | width |
|---|---|
| `Bio Lab Laboratories` — longest of the 18 | **160.88 px** |
| `Caring Pharmacy` — 2nd | 140.70 px |
| `Rachum Greene` — 3rd | 129.90 px |
| the input's `clientWidth` at 375 | **259 px** |

Selected alone, the trigger reports `scrollWidth` **259** against `clientWidth`
**259** — no overflow, at either viewport. So the longest single name clears the
box by ~98px and **no one-merchant selection can clip**. G23 is reachable only
from **two or more** selections at 375, and only when their joined length
exceeds 259px — `Bio Lab Laboratories, Caring Pharmacy` does at 309; two short
names do not. **That makes it an edge case rather than the control's default
state**, which is a materially lower severity than the first measurement alone
suggested and should be weighed when scheduling the fix.

#### The applied-chip row was measured too, and it is NOT a gap — no G24

The chip row carries the same joined string as ONE chip, and Gate 41 measured
that row's overflow behaviour against exactly this case without ever seeing a
real multi-name chip. Measured now, with `Bio Lab Laboratories, Caring Pharmacy`
applied:

| | 375 | 430 |
|---|---|---|
| `.mvp-transactions__chips` `scrollWidth` / `clientWidth` | 375 / 375 | 430 / 430 |
| max reachable `scrollLeft` | **0** | **0** |
| `.mn-filter-chip` width | 273 | 273 |
| `.mn-filter-chip__label` `scrollWidth` / `clientWidth` | 237 / 237 | 237 / 237 |
| row height, one merchant → two | **24 → 24** | **24 → 24** |
| dismiss button count / visible / hit-tested | 1 / true / **true** | 1 / true / **true** |
| dismiss accessible name | `Remove payee filter (Bio Lab Laboratories, Caring Pharmacy)` | identical |

**It neither wraps, scrolls nor clips**: `flex-wrap: nowrap` with the chip at
273 inside a 375 row leaves **102px of headroom**, the row's `overflow-x: auto`
is present but never engaged (`scrollLeft` cannot leave 0), and the row height
is unchanged from the single-merchant case. The dismiss affordance sits fully
inside the viewport at x=268.8 and `elementFromPoint` at its centre returns the
dismiss button itself, with the full "Remove &lt;facet&gt; filter (&lt;value&gt;)"
name intact.

**SO THE ROW IS FINE AND THE TRIGGER IS NOT, ON THE SAME STRING — WHICH IS THE
USEFUL COMPARISON.** The chip renders in `type-body-caption-semibold` (smaller
than the trigger's 16px body) inside a box free to size to its content, where
the trigger is a fixed-width `<input>` in 16px. Same text, 237px in one place
and 309px in the other. Gate 41's scroll provision is real and simply is not
needed at two payees; it would engage at a higher count, which is not a defect
today and was not fabricated into one.

---

### Three further entries — G25, G26 and G27, all `Icon`, opened at MVP Gate 49 building the transaction detail sheet

**ALL THREE ARE THE SAME SHAPE AS G16 — AN ASSET GAP, NOT A PROP GAP.** The
composition point exists in every case; there is simply nothing in the registry
to put in it. G16 (`storefront`) is the precedent and it closed in one DS
release by adding one SVG.

**THE REGISTRY WAS COUNTED, NOT QUOTED.** 103 entries at the pinned v2.2.0,
derived by counting the `ICONS` object's own assignment-shaped keys rather than
trusting a prose figure — the correction G16 already records against its own
stale 101/102:

```bash
git show v2.2.0:src/components/Icon/icons.ts | awk '/^export const ICONS/,/^\}/' | grep -cE "^  [A-Za-z0-9_]+:"
```

| # | Component | Demand | Tag | Flows | Evidence |
|---|---|---|---|---|---|
| **G25** | `Icon` | **`link_off`** — the "Unlink receipt" affordance's leading glyph. | `component-gap` | **9** | Figma draws `link_off` on the second of the two buttons on the receipt card (`1266:14279`, Frame 544). The registry carries **`link` and no `link_off`** (grep over `Icon/icons.ts`: 1 and 0). **`link` MUST NOT BE SUBSTITUTED** — it is not a near-miss, it states the OPPOSITE of what the button does, which is worse on a destructive-ish control than no glyph at all. Shipped TEXT-ONLY at Gate 49; the sibling "View" button keeps its `visibility` glyph, which does exist |
| **G26** | `Icon` | **`list_alt`** — the Transaction info block's Category row. | `component-gap` | **9** | Figma binds it at `I1266:14278;1028:10035`, read directly as main-component node `1028:10035` -> child `list_alt`. Zero matches in the registry. **WORKED AROUND FROM DATA, NOT SUBSTITUTED**: the row draws the CATEGORY'S OWN glyph off `TRANSACTION_CATEGORIES[].icon` (`icon_grocery` for the walked row), which this app already stores for exactly this purpose. The divergence is that Figma's glyph names the FIELD and this one names the VALUE |
| **G27** | `Icon` | **`credit_card`** — the Transaction info block's Payment Method row. | `component-gap` | **9** | Figma binds it at `I1266:14278;1028:10048` -> `1028:10048` -> child `credit_card`. Zero matches. Worked around the same way as G26: the row draws the bank holding's own `icon` field, which is `icon_bank`. Note the same row's VALUE also diverges — Figma prints "Monarch Trust", a name that exists nowhere in this app's data, and the app derives `bank` (`"Monarch Bank"`) instead. That half is a Figma-side copy defect, not a DS gap |

#### The reason all three are `component-gap` and none is `prop-gap`

`Icon` exposes `name` and `size` and nothing else, and `IconName` is
`keyof typeof ICONS` — so an absent asset is not a prop that is missing, it is a
NAME THAT DOES NOT TYPE-CHECK. There is no seam a consumer could take, and no
`className`, `style` or slot through which one could be supplied from here.
That is what makes the MVP-side answer "leave it out or derive a real one",
never "inject one".

#### Two dispositions, and the difference is deliberate

**G25 SHIPS WITH THE SLOT EMPTY. G26 AND G27 SHIP WITH A DERIVED GLYPH.** That
is not inconsistency; the two cases differ in whether the app already holds a
true answer.

- For **G25** there is no other glyph in the app that means "unlink". Anything
  put there would be a guess, and the nearest candidate actively misleads.
- For **G26** and **G27** the app already stores an icon for the thing the row
  is about — `TRANSACTION_CATEGORIES[].icon` and `BankHolding.icon` — so the row
  can be drawn from data rather than from a substitution table. That is the
  distinction G16 drew when it refused a "near-miss glyph": what is forbidden is
  picking a lookalike for the DRAWN one, not deriving a correct one from the
  record the row describes.

**WHEN THE THREE ASSETS SHIP, ONLY G25 CHANGES THE MVP.** G26 and G27 would then
be a design call — keep the data-derived glyph, which names the VALUE, or switch
to Figma's generic one, which names the FIELD.

**THAT PREDICTION WAS HALF RIGHT AND THE ASSETS HAVE NOW SHIPPED — see the
closure block immediately below.** G25 did change the MVP, as predicted. The
design call on G26/G27 was put to Teku at the Gate 49 close and answered
"Figma's generic one", so **all three changed the MVP**, not one. The prediction
was not wrong about the mechanics; it simply could not know which way the call
would go, and it should not have implied the default was to keep what shipped.

#### All three CLOSED at MVP Gate 50-A — DS v2.3.0 shipped all three, adopted here at v2.3.0

| # | Status | What closed it | Verified in this repo |
|---|---|---|---|
| **G25** | **CLOSED** | `link_off` added to the `Icon` registry | Present in BOTH resolution paths, checked separately because the Vite alias compiles the sibling SOURCE while `tsc` reads the pinned DIST: sibling `src/components/Icon/icons.ts:179`, and `dist/components/Icon/icons.d.ts:326`. Adopted as `leadingIcon={<Icon name="link_off" size="m" />}` on the "Unlink receipt" `Button` in `TransactionDetailSheet.tsx` — the ONE render call site, established by grepping `src/` rather than taken from a carried list. The slot was EMPTY before, never filled with `link` |
| **G26** | **CLOSED** | `list_alt` added to the `Icon` registry | Sibling source `icons.ts:180`, dist `icons.d.ts:332`. Adopted as a LITERAL `icon="list_alt"` on the Transaction info Category row, replacing the data-derived `category.icon` (`icon_grocery` on the walked rows) |
| **G27** | **CLOSED** | `credit_card` added to the `Icon` registry | Sibling source `icons.ts:187`, dist `icons.d.ts:362`. Adopted as a LITERAL `icon="credit_card"` on the Payment Method row, replacing the data-derived `account.icon` (`icon_bank`). The row's VALUE divergence is UNCHANGED and is not closed by this — Figma still prints "Monarch Trust" and the app still derives `bank` (`"Monarch Bank"`), which was always a Figma-side copy defect rather than a DS gap |

**THE REGISTRY WENT 103 → 106, COUNTED IN BOTH PATHS AND NOT QUOTED.** The
sibling source and the pinned dist agree, and the dist count is over DISTINCT
keys so a duplicated entry could not inflate it:

```bash
git show v2.2.0:src/components/Icon/icons.ts | awk '/^export const ICONS/,/^\}/' | grep -cE "^  [A-Za-z0-9_]+:"   # 103
git show v2.3.0:src/components/Icon/icons.ts | awk '/^export const ICONS/,/^\}/' | grep -cE "^  [A-Za-z0-9_]+:"   # 106
grep -oE "^\s+readonly [A-Za-z0-9_]+:" node_modules/@monarch/design-system/dist/components/Icon/icons.d.ts | sort -u | wc -l   # 106
```

**THE MATERIAL SUBSET WENT 67 → 70, AND IT IS A DIFFERENT COMMAND.** All three
new glyphs are `@material-design-icons/svg/round/*`, so the custom-asset count is
unmoved at 36 and 106 − 70 = 36 closes. Conflating the two counts is a real trap
that had propagated into `CLAUDE.md`; it is corrected there at this gate.

**G26 AND G27 WERE THE DESIGN CALL, AND IT WENT TO THE FIELD READING.** Teku
ruled at the Gate 49 close that the three info rows are ONE GRAMMAR — a calendar,
a list, a card, each naming its FIELD — and that a shopping cart beside
"Category" breaks the pattern the calendar sets one row above. So the workaround
was not merely replaced, it was REVERSED: the rows now pass literals where they
passed expressions reading the record. **Do not reintroduce value glyphs.**

**THE WORKAROUND WAS STILL THE RIGHT CALL WHILE IT STOOD**, and that is worth
keeping rather than tidying away. It drew a correct glyph from data the app
already held, which is categorically different from picking a lookalike for the
drawn one — the distinction G16 established. A gap worked around from data
leaves nothing misleading on screen while it is open.

**PIXEL CONSEQUENCE, MEASURED RATHER THAN ASSUMED, AND IT SPLIT BY STATE.** The
adoptions moved exactly 8 of 112 baselines, and decoding each capture against its
predecessor shows the three glyphs do NOT all reach both states:

| baselines | differing px | bbox @375 | cause |
|---|---|---|---|
| `finance-transactions-detail-{375,430}-{light,dark}` | 446 / 444 | `[17, 678, 34, 734]`, two row runs | **G26 + G27 only.** An 18px-wide column at the left gutter, in two runs — the two glyph slots. The unchanged Date calendar sits above and is correctly absent |
| `finance-transactions-detail-linked-{375,430}-{light,dark}` | 1066 / 1069 | `[209, 669, 330, 685]`, ONE row run | **G25 only.** The info-row glyph column (x 17–34) does not appear in this diff at all, because the linked panel is at its viewport cap and the info rows sit BELOW the scroll fold — so `list_alt` and `credit_card` are not in that capture |

That second row is the non-obvious one: a state can adopt a glyph and not
photograph it. The single row run also proves the Unlink label did not wrap when
the button gained a leading icon — a wrap would have produced two runs and a
taller bbox.

**THAT CALL IS RECORDED IN `CLAUDE.md`, NOT IN THE FLOW INVENTORY.** Gate 49 wrote
it into `MONARCH-MVP-PHASE5-FLOW-INVENTORY.md` and the edit was REVERTED IN FULL:
that document records what the Figma says, not what was built, and is ruled left
alone permanently. A divergence between the mockup and the code belongs in
`CLAUDE.md`.

#### Not registered, because it is not a gap

**`Sheet` NEEDED NOTHING FOR THE 966-TALL FRAME.** Figma's linked state is drawn
897 of panel on an 812 Blanket (register **S2**), and the ruling was to cap at
the viewport and scroll internally. `Sheet` already does both, with no prop
passed: `.mn-sheet__panel` caps at `calc(100dvh - var(--brand-scale-1100))` and
`.mn-sheet__content` is the one scroll region with the bar hidden in both
spellings. Measured at Gate 49 through a Playwright-launched Chromium at DPR 2,
identical in both themes and at both viewports — panel **764** (= 812 − 48, the
cap exactly), content `clientHeight` **641** against `scrollHeight` **775**,
`scrollTop = 200` clamping to **134**, and `offsetWidth − clientWidth` = **0**.
The unlinked state hugs at **614** (375) / **590** (430) and does not overflow.

**`ListItem` NEEDED NOTHING TO BECOME A BUTTON EITHER.** `onClick` already
switches the root element, and `.mn-list-item` already carries the whole reset —
`background: none`, `border: none`, `padding: 0`, `font-family: inherit`,
`text-align: left`, `width: 100%` — plus a `:focus-visible` ring. Proven by
negative control at Gate 49: with and without `onClick`, every geometric and
painted property of the row was identical at both viewports in both themes, the
sole delta being the container's computed `font-size` (16px -> 13.333px), which
paints nothing because every text node inside carries an explicit `type-*` class.
An MVP-local `width: 100%` was written, measured against `ListItem.css:5`, found
redundant and deleted.

## Summary

- **28 of 28 screens read.** **40 DS components read in source**, `.tsx` and `.css`.
- **DATED RECORD, GATE 43: 14 register entries** — 2 `component-gap`,
  11 `prop-gap`, 1 `token-gap`. (G11 and G12 were added at MVP Gates α and D,
  and **G13/G14 at Gate 43** — the latter pair renumbered there out of a
  colliding `U1`/`U2`, see §2a — all after the original sweep, which reported
  12.)
- **DATED RECORD, GATE 44: 17 register entries** — 2 `component-gap`,
  **14** `prop-gap`, 1 `token-gap`. G15 and G16 were added at Gate 43 building
  the filter sheet, and **G17 at Gate 44** making the app installable-clean.
  G16 is the second `component-gap`; G15 and G17 are `prop-gap`.
- **DATED RECORD, GATE 44-B: 18 register entries** — 2 `component-gap`,
  14 `prop-gap`, 1 `token-gap`, **1 `shape-mismatch`**. **G18 was added at Gate
  44-B**, reading `Header/bg`'s full vertical spec. It is the first register
  entry tagged `shape-mismatch`; the 8 `shape-mismatch` items counted two
  bullets below are sweep findings that were never given G-numbers, and G18 is
  not one of them.
- **CURRENT, GATE 46: 23 register entries, of which 3 are CLOSED and 20 are
  open.** **G19–G23 landed** — G19/G20 from the DS docs so the series is not
  split across repos, G21 found building the merchant push, G22/G23 found
  building the multi-select picker; **G15, G16 and G18 were marked CLOSED** by
  DS v2.1.0 and v2.2.0 and adopted at this gate.

  **THE ARITHMETIC, from the Gate 44-B baseline of 18:**

  | | entries | `component-gap` | `prop-gap` | `token-gap` | `shape-mismatch` |
  |---|---|---|---|---|---|
  | Gate 44-B | 18 | 2 | 14 | 1 | 1 |
  | + G19 (`prop-gap`) | 19 | 2 | 15 | 1 | 1 |
  | + G20 (`shape-mismatch`) | 20 | 2 | 15 | 1 | 2 |
  | + G21 (`prop-gap`) | 21 | 2 | 16 | 1 | 2 |
  | + G22 (`prop-gap`) | 22 | 2 | 17 | 1 | 2 |
  | + G23 (`prop-gap`) | **23** | **2** | **18** | **1** | **2** |
  | + G25 (`component-gap`), Gate 49 | 24 | 3 | 18 | 1 | 2 |
  | + G26 (`component-gap`), Gate 49 | 25 | 4 | 18 | 1 | 2 |
  | + G27 (`component-gap`), Gate 49 | **26** | **5** | **18** | **1** | **2** |

  5 + 18 + 1 + 2 = **26** ✓. Closures do not decrement these columns — a closed
  entry keeps its tag and its number, so **G16** is 1 of the `component-gap`,
  **G15** 1 of the `prop-gap`, and **G18** 1 of the 2 `shape-mismatch`.

  **TWO OF THE NUMBERS IN THAT TABLE ARE WRONG, AND THE TABLE'S OWN PROSE IS
  WHAT CONTRADICTS THEM — found at Gate 50-A by deriving from the entry set
  rather than continuing the tally.** The `component-gap` column reads 5 while
  the paragraph two below it names **six** members: G16, plus G1 and G2 ("the
  column's other two members"), plus G25/G26/G27. `prop-gap` absorbs the missing
  one and reads 18 against a derived 17. The SUM was right at every step, which
  is exactly why it survived: a running tally that is checked only against its
  own total cannot see a unit moved between two of its columns.

  The error predates the three additions — it is already present in the Gate
  44-B baseline row, which reads `component-gap` 2 when G1, G2 and G16 were all
  open and all tagged `component-gap`. **The rows above are left as written**,
  because they are the record of what each gate believed; the corrected figures
  are below.

  ### GATE 50-A, DERIVED FROM THE ENTRY SET

  Not carried forward from the tally. Every `| **Gn** |` row that is an ENTRY
  row (i.e. not a `**CLOSED**` closure row), deduplicated by G-number, with its
  tag read out of the same row:

  | | count | which |
  |---|---|---|
  | **entries** | **26** | G1–G23 and G25–G27 |
  | `component-gap` | **6** | G1, G2, G16, G25, G26, G27 |
  | `prop-gap` | **17** | G3–G9, G11–G15, G17, G19, G21, G22, G23 |
  | `token-gap` | **1** | G10 |
  | `shape-mismatch` | **2** | G18, G20 |

  6 + 17 + 1 + 2 = **26** ✓.

  **CLOSED IS 9, NOT THE 6 A GATE-49-PLUS-THREE COUNT GIVES.** Derived by
  collecting every G-number carrying a `**CLOSED**` marker, across BOTH table
  shapes the document uses plus the one closure written as a heading:

  | closed | where the closure is recorded | shape |
  |---|---|---|
  | **G1**, **G9**, **G10** | the §2a closure table | `\| **Gn** \| tag — summary \| **CLOSED** \|` |
  | **G15**, **G16** | the Gate 46 closure table | `\| **Gn** \| **CLOSED** \| what closed it \|` |
  | **G18** | a `####` heading, no table row at all | heading |
  | **G25**, **G26**, **G27** | the Gate 50-A closure table above | `\| **Gn** \| **CLOSED** \| … \|` |

  **THE THREE SHAPES ARE WHY A SINGLE GREP UNDERCOUNTS**, and both plausible
  greps undercount differently: one anchored on `\| **Gn** \| **CLOSED**` returns
  **5** (it misses the §2a shape, where CLOSED is in the THIRD column, and misses
  G18 entirely), and one that only reads tables returns **8** (it misses G18's
  heading). The number is **9**, and it is only reachable by enumerating the
  shapes first. The count-KEYS-not-lines rule again, on a document instead of on
  a state list.

  **SUPERSEDED AT GATE 50: THERE ARE NOW FOUR CLOSURE SHAPES AND THE NUMBER IS
  10.** §2h closes **G2** in a shape none of the three rows above describes — a
  key/value block whose G-number sits on an `\| entry \|` row while `**CLOSED**`
  sits on a *different* row, `\| status \|`. **Every anchor named above misses
  it**, because all three assume the G-number and the CLOSED marker share a
  line. Re-derived at Gate 50 by enumerating shapes first, as this block
  instructs: A -> G15 G16 G25 G26 G27, B -> G1 G9 G10, C -> G18 (plus the five
  from A), **D -> G2**. Union = **10**.

  **AND THERE IS NOW A SECOND *ENTRY* SHAPE TOO, WHICH THIS BLOCK NEVER HAD TO
  CONSIDER.** §2h declares **G28** in the same key/value form, so its tag lives
  on a following `\| tag \|` row rather than in a tag CELL of the entry row. A
  census that reads the tag out of the entry row finds 26 entries and stops at
  G27 — measured, that is exactly what a first pass at Gate 50 returned before
  the shape was accounted for.

  **THE GATE 50-A FIGURES ABOVE ARE LEFT AS THE DATED RECORD** — they were right
  when written. What rotted is that they sit under `## Summary`, which reads as a
  statement of the CURRENT state; this note is the correction, and §2h's own
  count section carries the live numbers.

  So, **AT GATE 50-A: 26 entries, 9 closed, 17 open.** Open by tag: 1
  `component-gap` (G2), 15 `prop-gap`, 0 `token-gap`, 1 `shape-mismatch` (G20) =
  **17 open**, and 17 + 9 = 26 ✓. **Superseded at Gate 50 — see the note above
  and §2h: 27 / 10 / 17.** The open TOTAL is unchanged at 17 by coincidence, not
  by nothing having happened: G2 closed and G28 opened in the same gate.

  **`token-gap` IS NOW ZERO OPEN**, which no previous tally could show, because
  its only member G10 has been closed since §2a and the running tally never
  counted the §2a closures at all. The Gate 46 line "3 are CLOSED and 20 are
  open" was an undercount for the same reason: G1, G9 and G10 are closures of
  register entries recorded in this document, and there were six, not three.

  **G2 IS THE ONLY OPEN `component-gap` LEFT**, and it is the iOS action sheet
  blocking Gate 50's capture flow. The column went 2 → 5 → 6 and is now back to
  1 open in a single gate, because all three additions were missing SVGs and one
  DS release closed all three.

  **THE `component-gap` COLUMN WENT 2 -> 5 IN ONE GATE, AND ALL THREE ARE
  MISSING ICONS.** That is worth reading as a single item rather than three:
  G25, G26 and G27 are three SVGs, the same shape as the now-closed G16, and one
  DS commit closes all of them. The column's other two members — G1 (a
  bottom-anchored sheet, closed) and G2 (the iOS action sheet, still open and
  blocking Gate 50) — are real components and are not comparable in size.

  **THAT PREDICTION WAS TESTED AND HELD EXACTLY: DS v2.3.0 CLOSED ALL THREE IN
  ONE RELEASE**, whose entire delta outside tests and showcase is six lines in
  `src/components/Icon/icons.ts`. It is the strongest evidence yet for the
  register's own thesis — that an asset gap is cheap to close and expensive only
  to notice. It is also the paragraph whose arithmetic ("2 -> 5") is off by one;
  see the derived census above.

  **THE ENTRY COUNT IS 26 AND THE HIGHEST NUMBER IS G27, BECAUSE 24 IS A
  PERMANENT HOLE.** G24 was reserved at Gate 46 for the applied-chip row, on the
  expectation that a two-merchant chip would overflow it; **it was measured and
  it does not** — 375/375 and 430/430, `scrollLeft` capped at 0, row height
  unchanged, dismiss affordance hit-tested and fully named. That evidence is
  written up under G23 above, and the paragraph four sections up recording that
  there is no G24 STAYS TRUE.

  **GATE 49 FIRST TOOK G24 AND THAT WAS REVERTED.** Re-using a released number
  looks tidy and is not: the sentence explaining why 24 is absent is itself the
  evidence that the chip row was checked and cleared, and re-allocating the
  number deletes that evidence. So the numbering skips it, the entry count and
  the highest number differ by one from here on, and **the next entry opened is
  G28**.

  **FIVE OF THE SIX ENTRIES ADDED THIS GATE ARE `Select` OR ITS RELATIVES** —
  G19 (`SelectTransfer`/`SelectWalletAccount` width), G21 (`aria-expanded`),
  G23 (value clipping), plus the now-closed G15. That concentration is worth
  stating rather than leaving to be noticed: `Select` is the DS component this
  app leans on hardest and the one whose seams are thinnest. A single
  `Select` round in the hygiene gate would close four of them.
  **THE THREE CLOSURES ARE NOT SYMMETRICAL AND SHOULD NOT BE READ AS ONE
  EVENT.** G15 and G16 needed an MVP adoption to close — a prop and a slot fill
  — and were verified by measuring the rendered control. G18 needed **no `src/`
  edit at all** and closed the moment the pin moved; what it cost instead was
  92 of 104 baselines. A closure that changes no code can still be the most
  expensive one in the gate.
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

---

## 2h. Status at MVP Gate 50 (2026-09-09) — the capture surfaces

**Two entries move and one is opened. The register goes 26 entries -> 27, with
`component-gap` reaching ZERO OPEN for the first time in this document's
history.**

### G2 is CLOSED — as MVP-LOCAL COMPOSITION, not as a DS component

**AND THAT IS A DIFFERENT KIND OF CLOSURE FROM EVERY OTHER ONE IN THIS
REGISTER.** G25–G27 closed because the DS grew three SVGs; G15 and G16 closed
because the DS grew a prop and a glyph; G18 closed on a re-pin. **G2 closes
because the answer to "should the DS ship this?" turned out to be NO.**

| | |
|---|---|
| entry | **G2** — the iOS action sheet on F9 `add receipt` |
| status | **CLOSED — built MVP-local at Gate 50** |
| where | `src/flows/finance/components/ReceiptSourcePicker.tsx` |
| ruling | Teku's decision C, settled. Do not reopen |

**THE EVIDENCE THAT DECIDED IT WAS A VARIABLE READ, AND IT IS DECISIVE.**
`get_variable_defs` on the whole overlay `1033:11135` returns **exactly one**
binding — `Blanket/default/default` — and on the grouped rows `1033:11226` it
returns **`{}`**, nothing at all. Every fill, radius, font and colour in that
node is a raw literal. G2's own original entry already said as much
structurally ("drawn entirely as `Group 2/3/4/5`, `Rectangle 3/4`, `Line 1` and
bare `text`"); the variable read confirms it at the token level. **It is a
pasted Apple asset, and a design system does not ship one.**

**WHAT SURVIVED AND WHAT DID NOT.** The SHAPE is a real design decision and was
kept: two source rows joined by a hairline, then a **gap**, then Cancel standing
alone — the gap is what says Cancel is not a third source, and it is what
distinguishes a source picker from a menu. The SKIN is Apple's and was replaced:

| | Figma (raw literal) | shipped (token) |
|---|---|---|
| font | SF Pro Text 17 | Poppins, `type-body-m` / `-semibold` |
| tint | `#007aff` | `--mapped-text-primary-default` |
| panel | `rgba(255,255,255,.8/.9)` + `backdrop-blur(25px)` | `--mapped-surface-elevation-default`, no blur |
| radius | 10 | `--brand-scale-200` (8) |
| hairline | a 1px SVG line | `--brand-scale-25` border |

**THE TINT IS NOT `#046eff`, WHICH THE GATE BRIEF ASKED FOR.** `#046eff` is
`--brand-blue-500`, a RAW brand primitive: it breaches rule 2, and — the
substantive objection — **a raw brand value cannot dark-flip**, so the picker
would have painted mid-blue text on a near-black panel. `--mapped-text-primary-default`
is the semantic token for primary-tinted text and resolves to blue-600 light /
blue-300 dark. The intent survives; the mechanism is the one that survives a
theme.

**SF PRO TEXT DOES NOT EXIST ON THE ANDROID DEVICE THIS APP IS TESTED ON**, so
transcribing the font was never even faithful there — it was a silent fallback
to whatever Android has.

**MEASURED, at 375, DPR 2, through the harness:** panel `x=10, w=355` —
**exactly** Figma's 10/355 — rows **64** against Figma's 61, group
`64 + 1 + 64 = 129`, gap 10, panel bottom 32 from the viewport foot. The rows
are the only divergence and every number in it is a token or a type metric: 61
decomposes as `20 + 21 + 20`, and **20 IS a ramp step** (`--brand-scale-500`),
so the padding is transcribed exactly while Poppins' `body/m` line box is 24
where SF Pro Text's is 21. **The +3 is the type substitution showing through,
not a rounding.**

Two values WERE rounded to the ramp, and both are named: Figma's **34** at the
foot -> **32** (`--brand-scale-800`), and the tile insets **3** -> **4**
(`--brand-scale-100`). Rounding to the nearest step is the DS's own established
move (StatusBar 5->4, BottomNavigation 62->64, Sheet 44->48).

**THE RAMP HAS NO 44 AND NO 50 BUT IT DOES HAVE 10 AND 20** — `--brand-scale-250`
and `-500`. Both were checked before use rather than assumed absent, which is why
the two 10px figures are exact rather than rounded.

### U3 is ANSWERED, and the answer is the one it proposed

> **U3** — G2: is the action sheet a DS primitive at all? It could legitimately
> be an MVP rule-4 composition over `Blanket`. It appears on exactly one screen.
> Building a DS primitive for a single use may be the wrong trade.

**YES — it is a rule-4 composition over `Blanket`, and that is exactly what
shipped.** The question anticipated the ruling a full four gates before it was
made, on the "one screen" argument alone; the variable read then supplied a
second, independent reason that the original question did not have.

### G28 is OPENED — `Modal` hugs where Figma fixes, twice over

| | |
|---|---|
| **G28** | `Modal` — header and footer heights |
| tag | **`shape-mismatch`** — a design call, not a code fix |
| flow | 9 |

**MEASURED at 375, DPR 2, animations settled, against Figma `1048:10593`:**

| | Figma | rendered | |
|---|---|---|---|
| card | x=16, w=343 | **x=16, w=343** | ✓ exact |
| content inset | 16 | **16** | ✓ exact |
| header | 64 | **74** | ✗ **+10** |
| footer | 152 | **128** (74 when empty) | ✗ **−24** |

**THE TWO THAT MATCH ARE THE TWO THAT SETTLE THE MODAL-VERSUS-SHEET QUESTION**,
and they are exact to the pixel. The inner Figma node is NAMED "Bottom Sheet";
its geometry says Modal — 343 wide at x=16, all four corners rounded, no home
indicator — and geometry wins. **The name is the trap**, and this is the second
time in Flow 9 that a Figma layer name has pointed the wrong way.

**ONE CAUSE, TWO DIRECTIONS: Figma FIXES both heights and the DS HUGS them.**
The header is TALLER because the DS's close `IconButton` renders 34 where
Figma's 64-tall header allows a 24px line box; the footer is SHORTER because
`Button` renders ~34 (~38 with a leading icon) where Figma draws 48.

**NO PROP CLOSES IT — enumerated rather than assumed.** `ButtonSize` is
`'s' | 'm' | 'l'` at paddings 4 / 8 / 12, so `l` tops out around 42 and cannot
reach 48. `Modal` exposes no header or footer height.

**THIS IS G18's QUESTION A SECOND TIME.** G18 records `Header/bg` rendering 22px
shorter for exactly this reason. Two instances make it a systemic question —
which geometry does Monarch want, Figma's fixed rows or the DS's hugs? — rather
than two transcription slips. Register them together.

**NOT FIXED HERE, AND NO OVERRIDE WAS WRITTEN.** Forcing either height would be
an MVP-local geometry override on a DS component — the equal-specificity
override Gate 13 removed on measurement.

### One more measured divergence, deliberately NOT registered

**`.mn-modal__card` CAPS AT `max-width: 375px`, so at the 430 viewport the card
renders 375 wide at x=27.5 rather than 398 at x=16.** Measured both ways.

It is not a gap, for two reasons that G15 did not have: **the DS names the
override itself** — `Modal.css`'s own comment reads "Figma frame width;
caller-controllable via className/style" — so a supported seam exists, where
`.mn-select`'s hard 320px had none. And **Figma authors this app exclusively at
375**, so there is no drawn authority for what the card should be at 430;
picking 398 would be inventing a number. Left as the DS ships it, recorded so
the next reader knows it was measured rather than missed.

### The count

**27 entries, 10 closed, 17 open.** `component-gap` **0 open** — G2 was the
last, and it closed by being ruled out of the DS rather than into it.
`shape-mismatch` goes 1 open -> 2 (G20, G28). `prop-gap` unchanged at 15.
`token-gap` still 0. 17 + 10 = 27 ✓.

| tag | total | closed | **open** |
|---|---|---|---|
| `component-gap` | 6 | 6 | **0** |
| `prop-gap` | 17 | 2 | **15** |
| `shape-mismatch` | 3 | 1 (G18) | **2** — G20, G28 |
| `token-gap` | 1 | 1 | **0** |
| | **27** | **10** | **17** |

**DERIVED FROM THE ENTRY SET BY ENUMERATING SHAPES FIRST, NOT BY CONTINUING THE
PREVIOUS TALLY** — and this gate is the reason that instruction exists, because
§2h introduced **two new shapes at once** and a census written against the old
ones silently returns *26 entries, 9 closed, highest G27*:

- a fourth CLOSURE shape — the `\| entry \|` / `\| status \| **CLOSED** \|`
  key/value block that closes **G2**, where the G-number and the CLOSED marker
  are on DIFFERENT rows;
- a second ENTRY shape — the same key/value form declaring **G28**, whose tag
  sits on a following `\| tag \|` row instead of in a tag cell.

Both are recorded against the `## Summary` shape table above, which enumerated
three closure shapes and one entry shape and is now annotated rather than
rewritten. **A count that agrees with the previous count is not evidence; a
count that re-enumerates the shapes is.**

**THE HIGHEST NUMBER IS G28 AND 24 IS STILL A PERMANENT HOLE.** G28 follows G27
directly; the released G24 was not re-used, for the reason recorded at Gate 49.

---

## 2i. MVP Gate 51 — the receipt viewer (`1266:14285`)

Two entries opened, both found building `Finance_Receipts_View receipt`. **Both
ship WITHOUT a workaround** — nothing was faked, overridden or substituted.

### G29 is OPENED — `Button` has no error / destructive appearance

| | |
|---|---|
| **G29** | `Button` — an error (destructive) appearance |
| tag | **`prop-gap`** |
| flow | 9 |

Figma draws the viewer's second footer button, "Delete receipt" (`1045:11001`),
BORDERLESS — i.e. `variant="tertiary"` — with its label bound to
`text/error/default` and its glyph to `icon/error/default` (`get_variable_defs`
on `1044:10853`: `#eb4f52` for both). The DS ships `ButtonVariant =
'primary' | 'secondary' | 'tertiary'` (`Button.tsx:4`) and every variant maps
`--btn-text` to a primary or on-colour token; there is no error map and no
`appearance` prop.

**SHIPPED AS `tertiary`, WHICH RENDERS PRIMARY BLUE** — measured
`rgb(3, 88, 204)` at 375 and 430. The Gate 51 prompt ruled the variant ("take it
from the viewer's own second button … the DS `Button` has no destructive variant,
so do not invent one"); the colour is what this entry asks for. The same
button is reused, whole, as "Delete" in the undrawn confirmation modal.

**NOT A RULE ON `.mn-btn`.** Recolouring it from the MVP would be an
equal-specificity override on DS appearance — the Gate 13 shape.

### G30 is OPENED — no mapped surface for a dark media well

| | |
|---|---|
| **G30** | a mapped surface for the image well behind a photograph |
| tag | **`token-gap`** |
| flow | 9 |

Figma's image well (`1044:10855`, the `Content` frame around the photo) fills
`Gray/900` = `#262626` — a RAW PRIMITIVE binding, not a mapped token. No
`--mapped-surface-*` token resolves to `--brand-gray-900` in light
(enumerated in the pinned v2.3.0 `globals.css`; it appears only in dark, as
`--mapped-surface-subtle-default` and siblings), and the MVP writes no raw
brand primitive (Gate 51 ruling 10).

**SHIPPED WITH NO FILL** — the well is the card's own surface. Invisible on the
receipts as delivered, because the photograph fills the width; visible as
letterboxing either side of a narrow receipt, since the viewer uses
`object-fit: contain` (a receipt is ~0.56 against the well's 3:4, and `cover`
would crop it).

**THE QUESTION FOR THE DS:** should a media well be a theme-invariant dark
surface (Figma's evident intent), or follow the page? Either way it needs a
token the file can bind.

### The count — INCREMENTAL, NOT RE-ENUMERATED

**29 entries, 10 closed, 19 open.** Stated as the Gate 50 tally plus these two,
and **not** re-derived by enumerating entry and closure shapes from scratch — so
by this register's own rule it is weaker evidence than the Gate 50 count. Both
new entries use the Gate 50 key/value ENTRY shape (tag on a following row), so a
census that already knows that shape finds them.

| tag | total | closed | **open** |
|---|---|---|---|
| `component-gap` | 6 | 6 | **0** |
| `prop-gap` | 18 | 2 | **16** — + G29 |
| `shape-mismatch` | 3 | 1 (G18) | **2** — G20, G28 |
| `token-gap` | 2 | 1 | **1** — G30 |
| | **29** | **10** | **19** |

**G28 APPLIES TO THE VIEWER UNCHANGED** and was not re-opened: header 74 against
Figma 64, footer 156 against 152 (two `size="l"` buttons with 24px glyphs render
50 tall against Figma's 48 — `l` with a 24px glyph DOES exceed 48, so G28's
"`l` tops out around 42" holds only for a 20px glyph).

**THE HIGHEST NUMBER IS G30.** 24 is still a permanent hole.

**Nothing was fixed DS-side. Nothing was staged, committed, pushed or tagged.**

---

## 2k. Status at MVP Gate 51-B (2026-09-12) — the picker, the editor, the completed viewer

Three entries opened, **none fixed**, and one number deliberately NOT opened.
No DS re-pin — **v2.3.0 throughout**, `lint:linkage` PASS with all four sources
agreeing.

**THE NEXT FREE NUMBER WAS DERIVED, NOT CARRIED.** The highest entry in this
file before this gate was **G30** (grep over every `G<n>` occurrence, max 30),
so the next is G31. **24 remains a permanent hole** — reserved at Gate 46 for
the applied-chip row, measured, found not to be a gap, and RELEASED; the
sentence explaining its absence is itself the evidence that the row was checked,
so re-using the number would delete that evidence.

### G31 is OPENED — `Sheet` and `Modal` restore focus on CALLBACK IDENTITY

| | |
|---|---|
| **G31** | an overlay's focus-restore effect keyed to CLOSING, not to `onClose` changing |
| tag | **`prop-gap`** |
| flow | 8, 9 |

**READ FROM SOURCE AT THE PINNED v2.3.0, BOTH COMPONENTS.** `Modal.tsx:98` and
`Sheet.tsx:203` both declare the open effect's dependencies as
`[isOpen, onClose]`, and both CLEANUPS end with
`previouslyFocused.current?.focus?.()` (`Modal.tsx:96`, `Sheet.tsx:201`). So the
effect tears down and re-runs whenever `onClose` changes IDENTITY — which, for
any consumer passing an inline arrow, is **every render while the overlay is
open** — and each teardown moves focus to the element that opened the overlay.

**MEASURED AT GATE 51, ON `Modal`, NOT INFERRED: the page behind the overlay
scrolled 770px after pressing Unlink and 808px after opening the delete
confirmation**, both themes, because `focus()` scrolls its target into view and
that target is a card far down the Receipts tab. Both numbers were minted into
committed baselines under a **green 319-passed run** and were caught only by a
human opening the PNGs.

**⚠️ THE `Sheet` HALF IS NO LONGER UNEXERCISED — IT WAS MEASURED AT GATE 52.**
This paragraph read "Read from source, not measured", and said the behaviour
had not surfaced "only because a sheet’s opener is usually already in view".
That was exactly right, and Gate 52 built the walk state that stops it being
true: `add-library-filled` opens the detail sheet on the **fourteenth** ledger
row — below the fold — and unlinks from it.

**MEASURED: the document scrolled to 790px behind the open sheet**, in both
themes, caught by the Gate 51-B scroll assertion rather than by a human opening
a PNG. 790 is the same order as the 770/808 measured on `Modal`, and the
mechanism is identical — the unlink re-renders `TransactionsLedger`, the inline
`onClose` changes identity, the open effect tears down, and its cleanup focuses
the ledger row under the scrim.

**SO BOTH COMPONENTS ARE NOW MEASURED, NOT ONE.** The gap is unchanged and
still DS-side; what changed is that no half of it rests on reading source any
more.

**GATE 52 CLOSED THE THREE REMAINING MVP SITES** — `closeDetail`, `closeFilter`
and `closePicker` in `TransactionsLedger`, alongside the viewer’s own from Gate
51-B. Mutation-proved: restoring any one of them to an inline arrow reproduces
the 790px scroll and turns the suite red with that exact message.

**THE MVP MITIGATES IT WITH `useCallback` AT EVERY LEVEL THE CALLBACK CROSSES**
— `ReceiptViewerHost`'s `close`, `cancelDelete`, `cancelReplace` and `back`,
each screen's `closeViewer`, and (Gate 52) `TransactionsLedger`'s `closeDetail`,
`closeFilter` and `closePicker`. Stabilising only the innermost one is not
enough, because it depends on the screen's. The harness now asserts
`window.scrollY === 0` after every prepare step, which is the tripwire — and it
is what caught the `Sheet` half above.

**ALL THREE LEDGER SITES WERE DONE TOGETHER, NOT JUST THE ONE THAT WENT RED.**
Only `closeDetail` was measured scrolling the page; the filter sheet and the
source picker take the same identity-keyed effect and would surface the same way
the day a walk state re-renders while either is open. Fixing only the measured
one would leave two live instances of a mechanism this register documents.

**THE QUESTION FOR THE DS:** should the focus-restore fire on `onClose` changing
at all? Restoring focus is a CLOSE behaviour; keying it to a callback's identity
makes correct consumer code depend on memoisation the API does not document.

### G32 is OPENED — `Modal` has no leading-edge header slot

| | |
|---|---|
| **G32** | a header slot at the LEADING edge, for a back control |
| tag | **`prop-gap`** |
| flow | 9 |

`Modal.tsx` renders a three-track header grid (`Modal.css:29`,
`grid-template-columns: 1fr auto 1fr`). The leading track holds
`<span className="mn-modal__header-side" aria-hidden="true" />` with **no
children and no slot** (`Modal.tsx:113`); the trailing track holds the ✕. The
only app-provided header node is `headerIconLeft`, and it renders INSIDE the
centred `mn-modal__title-group` (`Modal.tsx:115`) — `Modal.css:40` records that
placement as deliberate, so the icon and title centre as one unit.

**SO A MULTI-VIEW MODAL CANNOT PUT A BACK CONTROL WHERE A BACK CONTROL GOES.**
Measured at 375 in the shipped viewer: the leading `header-side` span sits at
**x=32** and is 0 tall; the back `IconButton` renders at **x=93.25** on the
picker view and **x=122.91** on the editor, immediately left of the centred
title. It moves with the title's width, which is the other half of the problem —
the control's position depends on how long the heading is.

**SHIPPED VISIBLY SHORT, AND DELIBERATELY NOT MOVED.** An MVP rule repositioning
`.mn-modal__title-group`'s child would be writing over DS geometry that the DS's
own comment says is intentional.

### G33 is OPENED — `Modal` bounds its card to nothing

| | |
|---|---|
| **G33** | a viewport cap on the card and a scrolling content region |
| tag | **`prop-gap`** |
| flow | 9 |

**THIS IS THE ONE THAT BLOCKED A GATE.** `.mn-modal` is
`position: fixed; inset: 0` with `padding: var(--brand-scale-400)` and
`align-items: center` (`Modal.css:1-9`); `.mn-modal__card` declares `max-width`
but **no `max-height`** (`:14-25`), and `.mn-modal__content` declares neither
`overflow` nor `min-height` (`:64-72`). A card taller than the padded box
therefore centres and hangs off BOTH ends.

**`Sheet` HAS HAD BOTH SINCE IT SHIPPED**, and its own CSS records them as an
**instructed addition Figma does not draw**: `max-height: calc(100dvh -
var(--brand-scale-1100))` on `.mn-sheet__panel` (`Sheet.css:39`), and
`flex: 0 1 auto; min-height: 0` plus a scrolling `overflow` on
`.mn-sheet__content` (`:112-120`), described there as "the sole scrolling
region". `Modal` never received the equivalent.

**IT IS PRE-EXISTING AND GATE 51-B MADE IT ACUTE — measured both ways.** At 430
the **Gate 51** linked viewer already rendered **787.33 tall in a 780 padded
box**, i.e. 3.66px off each end, before one line of Gate 51-B's content existed.
Adding the undrawn Receipt details block took it to **872.66 at 375**, putting
the card top at **y = -30.33** and the "Delete receipt" button **30px below the
viewport**. A screen whose primary action is off screen is not shippable, so
this could not be registered and left.

**THE MVP WORKS AROUND IT THROUGH THE DS'S OWN `className` SEAM**, and this is
the only place in the app that reaches inside a DS component's internals:

```css
.mvp-receipt-viewer-modal .mn-modal__card    { max-height: 100%; }
.mvp-receipt-viewer-modal .mn-modal__content { min-height: 0; overflow-y: auto; }
```

`className` lands on `.mn-modal` (`Modal.tsx:100`), and `Modal.css:21` names
`className` as the supported way a caller controls the card's size ("Figma frame
width; caller-controllable via className/style"). So this is a SCOPED,
higher-specificity rule through a documented escape hatch, supplying a value the
DS leaves UNSET — not the equal-specificity override on declared DS geometry
that Gate 13 removed on measurement. **It is still a workaround.** Measured
after: the card is exactly `[16, 16, 343, 780]` at 375 with the footer fully on
screen.

**THE QUESTION FOR THE DS:** `Modal` should mirror `Sheet` — a viewport cap on
the card and one scrolling content region, with the same bottom affordance
`Sheet.css` argues for so content never ends flush at the clip boundary.

#### ⚠ THE REMOVAL CONDITION — for the DS round AND the re-pin that follows it

**THE MVP WORKAROUND IS DELETED AT THE FIRST MVP RE-PIN AFTER A DS RELEASE
CLOSES G33.** It is a workaround with a removal condition, not a convention, and
both halves of the work need to find it without reading any CSS — so the exact
text and its three locations are written out here.

**THE DS SIDE — what closing G33 means:** `Modal.css` gains a viewport cap on
`.mn-modal__card` and a scrolling region on `.mn-modal__content`, mirroring
`Sheet.css`'s `.mn-sheet__panel` `max-height` and `.mn-sheet__content`
`min-height: 0` + `overflow`. No MVP change is needed for the DS round itself.

**THE MVP SIDE — exactly three deletions, at the re-pin:**

| # | file | what goes |
|---|---|---|
| 1 | `src/flows/finance/finance.css` | both rules below, **and** the comment block above them |
| 2 | `src/flows/finance/finance.css` | nothing else — no other selector carries the class |
| 3 | `src/flows/finance/components/ReceiptViewer.tsx` | the `className="mvp-receipt-viewer-modal"` prop on the viewer's `Modal`, and its comment block |

The two rules, verbatim, so a grep for either selector finds this entry:

```css
.mvp-receipt-viewer-modal .mn-modal__card {
  max-height: 100%;
}

.mvp-receipt-viewer-modal .mn-modal__content {
  min-height: 0;
  overflow-y: auto;
}
```

`.mvp-receipt-viewer-modal` appears in exactly **two** files — that stylesheet
and that component — so `grep -rn "mvp-receipt-viewer-modal" src/` is the whole
removal checklist.

**WHY IT MUST NOT BE LEFT IN PLACE ONCE THE DS FIXES THIS.** After the DS
release these rules would be MVP CSS sitting on top of DS geometry that now
agrees with them — invisible while the values match, and a silent mask over any
later DS change to the cap or the scroll region. That is precisely the shape
Gate 13 removed on measurement, and it is worse than the original defect because
nothing would report it.

**HOW TO VERIFY THE REMOVAL.** Delete all three, then re-run the suite: the
twelve `finance-receipts-view*` baselines are the ones that would move if the
DS's cap differs from `max-height: 100%` in any way. A clean run means the DS
fix and this workaround produce the same geometry; a diff on those twelve is the
DS's cap being measurably different, which is a finding to report rather than a
re-mint.

### NOT OPENED — the absent calendar and time grids

`DatePicker.calendarSlot` and `TimePicker.timesSlot` are app-provided
(`DatePicker.tsx:21`, `TimePicker.tsx:17`), each gated on its own presence
(`const showCalendar = open && !!calendarSlot`), and **the DS ships neither** —
there is no calendar or date-grid component among its 49 (`ls
src/components/`). The receipt editor therefore composes native `type="date"` and
`type="time"` inputs inside DS `Field`s, which `Field` supports directly
(`Field.tsx:107` forwards `type` to its `<input>`).

**NO NEW NUMBER WAS OPENED, because this register already carries it.** §2's
Gate 46 sweep records the generalised ruling in as many words — *"`Date range
picker` is not a calendar … Flow 7's 'the DS ships no calendar and none is built'
decision generalises"* — and **G6** already holds `DatePicker`'s one remaining
prop gap. Opening a fourth entry would restate a decision this file has made.

### The count — INCREMENTAL, NOT RE-ENUMERATED

**32 entries, 10 closed, 22 open.** Stated as the Gate 51 tally plus these three,
and **not** re-derived by enumerating entry and closure shapes from scratch — so
by this register's own rule it is weaker evidence than the Gate 50 count. All
three new entries use the Gate 50 key/value ENTRY shape, so a census that knows
that shape finds them.

| tag | total | closed | **open** |
|---|---|---|---|
| `component-gap` | 6 | 6 | **0** |
| `prop-gap` | 21 | 2 | **19** — + G31, G32, G33 |
| `shape-mismatch` | 3 | 1 (G18) | **2** — G20, G28 |
| `token-gap` | 2 | 1 | **1** — G30 |
| | **32** | **10** | **22** |

**G28 AND G29 APPLY TO THE COMPLETED VIEWER UNCHANGED** and neither was
re-opened. G29's measurement is also the reconciliation Gate 51's report owed:
the Delete button IS `variant="tertiary"` **and** renders primary blue
`rgb(3, 88, 204)` — one finding stated two ways, not two conflicting claims.

**THE HIGHEST NUMBER IS G33.** 24 is still a permanent hole.

**Nothing was fixed DS-side. Nothing was staged, committed, pushed or tagged.**
