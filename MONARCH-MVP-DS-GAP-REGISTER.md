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
  entry keeps its tag and its number, so **G16** is 1 of the 5 `component-gap`,
  **G15** 1 of the 18 `prop-gap`, and **G18** 1 of the 2 `shape-mismatch`.
  Open by tag: 4 `component-gap`, 17 `prop-gap`, 1 `token-gap`, 1
  `shape-mismatch` = **23 open**, and 23 + 3 closed = 26 ✓.

  **THE `component-gap` COLUMN WENT 2 -> 5 IN ONE GATE, AND ALL THREE ARE
  MISSING ICONS.** That is worth reading as a single item rather than three:
  G25, G26 and G27 are three SVGs, the same shape as the now-closed G16, and one
  DS commit closes all of them. The column's other two members — G1 (a
  bottom-anchored sheet, closed) and G2 (the iOS action sheet, still open and
  blocking Gate 50) — are real components and are not comparable in size.

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
