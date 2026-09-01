# Monarch MVP — Phase 5 Flow Inventory

# ✅ INVENTORY COMPLETE — 2026-08-05

**12 flows · 56 screens · 5 non-screen children · zero chrome-classification
failures out of 56.**

Flow 11 (`Finance_Plan`) was the Plans Section — P1's target. Nothing remains to
walk. **The close-out summary is at the end of this document.**

One Section is deliberately **not** inventoried: the dark-mode visualization of
Homepage. It is a design-reference / QA artifact, not a flow — the same category
distinction as Phase 3's Foundations tab. See **§ Dark-mode reference** in the
close-out.

**This file is the 5.3 input. Chat is not.**

Figma file: `v9MI8jxTaXiJA234Hkanlf` — `casestudy_02`
Source: **local desktop Figma MCP** (`http://127.0.0.1:3845/mcp`), authenticated
as Teku Cheong. No remote server used at any point.

Inventory only. No build order, no DS component mapping, no code. Findings are
**recorded faithfully, never corrected on the fly** — standing project
convention.

## Standing note — the limit of detach triage

Figma records no detach history. Any MCP call can prove *"this is not currently
an instance"* and can match a node to a likely origin by name, geometry, and
paired-sibling comparison. **No MCP call can distinguish *detached* from
*hand-built to look identical*.** Where evidence supports a verdict it is stated
with its confidence; where it does not, the item is flagged for Teku rather than
guessed.

## Standing note — component names in this file are unreliable

**Carried forward file-wide from Flow 2's A11.** Component names in this file do
**not** reliably describe what they render: `list/chart legend` renders course
rows in Academy, spending-category rows in Assistant04, and search-result rows
in Assistant05 — none of them a chart legend. `icon object` names three
different things at three sizes.

**Never treat a name as evidence of a missing primitive.** A Rule-3 gap must be
established from what the node actually renders, not what it is called.

## Standing note — the 2026-08-04 rename, and what it did NOT change

**Teku renamed screens in Figma rather than working around the collisions in
code. Recorded as RESOLVED AT SOURCE — the correct outcome.**

**Scope of the rename, verified by re-pulling all five Sections:**

| Flow | Section node | Renamed? |
|---|---|---|
| 1 — Homepage | `1266:14401` | **No — unchanged** |
| 2 — Monarch Academy | `1266:14273` | **No — unchanged** |
| 3 — Monarch Assistant | `1266:14407` | **No — unchanged** |
| 4 — Homepage_bank transfer | `1266:14389` | **Yes — 3 of 4 screens** |
| 5 — Homepage_transfer_Crypto | `1266:14394` | **Yes — 5 of 6 screens** |

Only the two transactional flows changed. Flows 1–3 are byte-identical to their
original capture, so their tables were left alone.

**What the rename fixed:** the `01/03/03` numbering (Flow 4 A2), the
names-misdescribe-content defect in both flows (Flow 4 A5, Flow 5 A3), and the
single string that identified five different screens across two Sections
(Flow 5 A1). All are annotated **SUPERSEDED BY RENAME** in place, never deleted
— several findings are *about* those names and must stay legible.

**What the rename did NOT fix:**

- **GD1 — neither transfer flow has a success screen.** A design gap, untouched
  by naming. The screens no longer *claim* to be success screens, which makes
  the gap more visible, not less.
- **`Homepage_Fiat` and `Homepage_Crypto` still collide across Sections** —
  `1266:14390` vs `1266:14402`, and `1266:14400` vs `1266:14403`.
- **Flow 1 A2** — the tab reads "Accounts" while the frame is `Homepage_Fiat`.
  Unchanged.
- Flow 4's screens now say **`fiat`** while their Section is still
  `Homepage_bank transfer`.

**Node IDs remain authoritative for 5.3 regardless.** They survived the rename
untouched, which is exactly why this inventory anchors on them. Names are
commentary; IDs are the key.

## Standing note — screens are instances, file-wide

**Promoted from a per-flow observation (Teku, after Flow 3).** Three Sections,
nine screens — Homepage (2), Monarch Academy (2), Monarch Assistant (5) — and
**every one is an `<instance>` node** whose children carry `0:xxx` IDs, the main
components' internal IDs.

**5.3 reads from the main components, not the Section placements.** The Sections
are a presentation layer; the authoritative screen definitions live elsewhere in
the file.

## Standing note — data contradictions get COMPUTED, not copied

**Established after Flow 3 (Teku).** Several figures in this file do not
reconcile, and they are all the same category of problem: **hand-authored
numbers transcribed independently rather than derived from one source.**

Instances found so far — Flow 3 **A17** (allocation total off by RM 269.16),
**A18** (percentages sum to 100.1%), **A19** (Gold 0.6% vs an actual ≈0.44%),
**A20** (crypto balance disagrees with the Homepage by RM 5,000), **A22**
(spending percentages reconcile under no reading).

**The rule going forward:** record the Figma values faithfully as source — that
is what this inventory is for — but in the typed mock data, **derive** every
total, percentage and delta from a single source of truth. Never transcribe a
figure that is computable from another figure. A percentage is a function of two
amounts; it is not a datum.

This is a mock-data shape constraint, and it strengthens the architecture
proposal's §3 preference for typed `.ts` modules over JSON: a `.ts` module can
compute, a JSON fixture can only hold what it was given.

### The worked example — crypto wallet total (DECIDED, Teku)

The clearest case in the file. **Three hand-authored values exist for one
quantity, each wrong in a different direction:**

| Value | Source | Verdict |
|---|---|---|
| RM 97,236.32 | Flow 5 — sum of the five listed tokens | ✗ contradiction |
| **RM 102,354.02** | Flow 1 `Homepage_Crypto`; Flow 5's own transfer arithmetic | ✅ **AUTHORITATIVE** |
| RM 107,354 | Flow 3 Assistant03 "Crypto Wallets" (A20) | ✗ contradiction |

**RM 102,354.02 is the source of truth.** It is the only figure the transfer
arithmetic reconciles against (102,354.02 − 5,800.00 = 96,554.02, exactly as
drawn) and the only one appearing in two independent Sections.

**97,236.32 and 107,354 are to be DERIVED away, not reproduced.** In the mock
data the wallet total is `sum(holdings)` and nothing else. Reproducing either
contradiction would be copying a defect forward.

Note what this implies about the token list: the five listed holdings sum to
97,236.32, which is 5,117.70 short — exactly the value Stellar *and* Uniswap
both carry. Either a sixth holding is missing or one value was pasted over
another. **The derived total will expose it the moment the data is typed**,
which is the point.

## Pending checks — carried across Sections, do not lose

| # | Check | Raised by | Status |
|---|---|---|---|
| P1 | **The goals/savings Section must be examined for a WRITER.** Flow 2's D1 ("Set Up Auto-Save Goal — 3 of 6 completed") implies state written there and read in Academy. | Flow 2 D1 | ⚠️ **PROVISIONALLY CLOSED** — see below. Six Sections walked, none writes it. |

**P1 — my call, recorded (Teku asked for it).** Six Sections inventoried and
**not one contains a goals/savings flow, or any screen that writes progress read
elsewhere.** Academy's "Set Up Auto-Save Goal — 3 of 6 completed" has no writer
anywhere in the file walked so far.

**Therefore: treat Academy's progress as SEEDED MOCK DATA, not live state.** A
static value in `src/data/`, rendered by Academy, mutated by nothing. This is
the correct call because:

- Building a writer for a flow that does not exist in the design would be
  inventing product behaviour, which this inventory has no authority to do.
- It costs nothing to reverse. If a goals/savings Section turns up later, the
  value moves from a constant into the accounts provider — a contained change,
  and the §2.6 named-hook discipline already keeps it contained.
- It keeps the §2.4 analysis clean: **P1 never fires.** The only real writer in
  the inventory is the transfer flows' balance decrement (P3), which is already
  decided and already app-level.

**Caveat, stated plainly: I cannot prove six Sections is the whole file.** See
"Sections remaining" below. If an uninventoried Section turns out to be the
goals flow, P1 reopens — hence *provisionally* closed, not closed.

> **NOTE (Teku, 2026-08-04): the caveat was correct — THE FILE HAS MORE THAN SIX
> SECTIONS. P1 STAYS PROVISIONAL. It is NOT closed.**
>
> The inventory is incomplete and continues Section by Section until the file is
> exhausted. A goals/savings flow may still appear in an uninventoried Section,
> and if it does, P1 reopens as a live §2.4 question.
>
> **Do not treat Academy's "3 of 6 completed" as settled seeded mock data yet.**
> That disposition is the *provisional* reading on current evidence, and it must
> be re-tested against every remaining Section.
| P2 | Confirm the chrome rules. Four Sections now show four different treatments of the bottom nav, and Flow 4 drops the Steward FAB entirely. Is this a stated navigation model or emergent? | Flow 2 A8, Flow 4 E | **OPEN** |
| P3 | **Does completing a bank transfer actually decrement the account balance for the session?** If yes, Flow 4 is a genuine cross-flow writer — the balance is read by Flows 1, 2 and 3. If the success screen is a pure animation, there is no writer. | Flow 4 D1 | ✅ **DECIDED (Teku): YES, it writes.** See Flow 4 D1. |

## Standing note — the detach habit is SELECTIVE, not universal

**Promoted after Flow 4 (Teku).** `Item/list` is **detached in every instance in
Flow 3** (Assistant03 `0:267`–`0:309`, Assistant05 `0:317`–`0:335`) and
**properly instanced in every instance in Flow 4** (`0:202`–`0:238`).

The same component, in the same file, treated both ways depending on the screen.
**Detaching is therefore a deliberate act tied to what a given screen needed, not
entropy or decay.** This strengthens every detach call in Flow 3 — those were
choices, consistent with what Teku confirmed at Flow 1 B2 — and it means a
`<frame>` where an `<instance>` was expected should be read as intent first,
mistake second.

## Gap register

Canonical index. Detail lives in the flow sections referenced.

| # | Gap | Kind | Raised by | Status |
|---|---|---|---|---|
| G1 | **Donut / pie chart** — **three occurrences now**: Flow 3 Assistant03 allocation donut (7 segments), Flow 10 Budget `Pie Chart` (`0:379`, raw `ellipse` + 6 `boolean-operation` subtracts). All raw vector work, no component identity. | **Rule-3 candidate** — strongest so far | Flow 3 A21/G1, **Flow 10 H** | **OPEN** — confirm at 5.3. **Counter-example to respect:** Flow 10's radial gauges ARE a DS component (`Progress ring indicator` instances) — not every circular data display is a gap |
| G2 | **Chat message bubble** — authored as a component inside the Figma Section, which says nothing about whether the DS ships one | Rule-3, unverified | Flow 3 G2 | **OPEN** — verify against DS public API at 5.3 |
| G3 | **Line / area trend chart** — the Total Networth card, built from raw `vector` + `line` + `ellipse` nodes with axis labels and a data-point marker. Not a component, not a misnamed list. | **Rule-3 candidate** — second confirmed real chart | Flow 7 A9/A10, B | **OPEN** — confirm at 5.3 alongside G1; if both hold, the DS charting gap is one decision, not two |
| GV1 | **`Modal`** (Flow 6 `0:159`, `0:178`, `0:162`) — `<frame>`s named `Modal` containing `Blanket` instances; DS ships `Modal` | **Detach, MODERATE confidence** — no instance counterpart anywhere in seven Sections | Flow 6 B1 | **5.3 MUST VERIFY** |
| GV2 | **`Text area`** (Flow 6 `0:179`, `0:201`) — `<frame>`s used as read-only bordered detail boxes, which is *not* what a `TextArea` primitive does | **Detach, MODERATE confidence** — name may mislead, per the standing note | Flow 6 B2 | **5.3 MUST VERIFY** |
| GV3 | **`Tabs` tab-count limit.** Flow 8 detached `Tabs` to **EXTEND** it — a 428-wide 5-tab frame beside a 343-wide 4-tab instance in the same Section. Recurs in Flow 9 (`0:288`). | **Capability question** — either the DS `Tabs` constrains tab count, or the Figma component lacks a 5-tab variant. Different consequences; indistinguishable from MCP data. | Flow 8 B1, Flow 9 B1 | **5.3 MUST VERIFY** against the DS public API |
| GD1 | **Neither transfer flow has a success screen.** Flow 4 ends at amount entry; Flow 5 ends at a review screen. Survived the rename. | **DESIGN gap, not a component gap** | Flow 4 A1, Flow 5 A2 | 📌 **CALL MADE — build it in the MVP, do not wait on Figma.** See below. |

**GD1 — my call, recorded (Teku asked for it).** Both transactional flows stop
one screen short of completion, and Teku already described the intent for
Flow 4: *"Mock page animation of a transfer success … with a button that perhaps
says Done that goes back to main homepage."*

**Recommendation: build one shared success screen in the MVP rather than waiting
for it to be designed.** Reasoning:

- **It is a composition, not a primitive.** A confirmation screen is an icon, a
  headline, a few summary rows and a button — all DS components that exist. Under
  rule 4 that is exactly what MVP-local composition is *for*. **This is not a
  Rule-3 gap and must not be reported as one.**
- **One screen serves both flows.** Fiat and crypto differ only in the summary
  rows and the units. Building it twice would be the mistake.
- **Its content is derivable from state that already exists** — recipient,
  amount, fee, resulting balance are all in the flow provider at that point. No
  new data, and the P3 decrement gives it something true to display.
- **Waiting blocks two of six flows** on a screen whose intent is already known.

**What must NOT be invented here:** any transfer *outcome* other than success —
failure, pending, partial. None is designed, none is described, and inventing
one would be inventing product behaviour. Success only.

**Still open, deliberately:** the visual treatment of the "mock page animation".
Teku said *"up to you to make this nice"*, which is a design latitude grant, not
a specification — and it is the one part that should be confirmed before it is
built rather than after.

> **NOTE (Teku, 2026-08-04) — precise status. NOT READY TO BUILD.**
>
> Two halves, and only one is settled:
>
> | Aspect | Status |
> |---|---|
> | **Where it gets built** | ✅ **Settled** — in the MVP, as rule-4 composition of existing DS components. Not a Rule-3 gap, not a DS-repo job. |
> | **What it contains and how it is laid out** | ⛔ **PENDING TEKU'S SPEC** — content, summary rows, animation treatment, button labelling. |
>
> **Do not begin building GD1.** "Build it in the MVP" answers *where*, not
> *what*. Without a content and layout spec, building it would mean inventing
> the design — exactly what this inventory refuses to do everywhere else.
>
> Blocks completion of Flows 4 and 5 until specified.

---

# Flow 1 — `Homepage`

**Section node:** `1266:14401`
**Section URL:** `https://www.figma.com/design/v9MI8jxTaXiJA234Hkanlf/casestudy_02?node-id=1266-14401`

## 1. What it accomplishes

The signed-in landing screen — a balance-led dashboard where Margaret sees one
account's balance and recent activity, switches asset context by tab, and
reaches primary money actions (Add / Send / more) plus the persistent Steward AI
FAB.

## 2. Screens contained

Two, both direct children of the Section:

| Figma name | Node | Size | Scroll content height |
|---|---|---|---|
| `Homepage_Fiat` | `1266:14402` | 375 × 812 | **952** (`Frame 555`) — 140px below the fold |
| `Homepage_Crypto` | `1266:14403` | 375 × 812 | **770** (`Frame 556`) — fits, but see C2 |

**Structural note:** both are `<instance>` nodes, not frames. Their children
carry `0:xxx` IDs, i.e. the main components' internal IDs — so the authoritative
screen definitions live in main components elsewhere in the file, and these are
placed instances of them. Not a defect, but it means "edit the Homepage" doesn't
mean editing these two nodes.

Non-scrolling chrome confirmed structurally, not just visually: on both screens
`icon object` (the Steward FAB, 56×56 @ y=653) and `navbar/mobile/section`
(375×92 @ y=720) are **siblings of** the scroll frame, not children of it.

**Non-screen content (C):** none in this Section. Both children are real
screens. No standalone spec/property-template frames here. One placeholder
*leaked into* a live screen — logged as A6, not excluded as a non-screen.

## 3. Navigation order

**No prototype wiring is visible from the metadata surface.** `get_metadata`
returns geometry and layer types only — it carries no reactions/interactions.

- **Inferred, not wired** — visual left-to-right: `Homepage_Fiat` (x=63) →
  `Homepage_Crypto` (x=633).
- **Semantically these are not sequential steps.** They are two selected-states
  of one screen; the transition between them is the `Tabs` component, i.e.
  in-screen state, not a route change. Two screens, one destination.

**RESOLVED (Teku):** prototype wiring for this flow is **skipped by decision** —
the Accounts/Crypto transition is Tabs in-screen state, not a route change, so
there is nothing meaningful to pull. The FAB → Steward link belongs to the
Steward Section, not this one.

## A. Figma source inconsistencies — recorded, not corrected

**A1 — Four tabs in the design; only two have screens.** The `Tabs` component
renders **Accounts · Crypto · Cards · Stocks**. This Section contains screens
for Accounts and Crypto only. Cards and Stocks are reachable-looking UI with no
screen here.

> **RESOLVED (Teku):** Cards and Stocks will have **no content for now**.
> Intended behaviour is that tapping either tab shows a **"coming soon"**
> message. Treat as a known, deliberate state — not a missing screen.

**A2 — Tab label vs frame name.** The tab reads **"Accounts"**; the frame is
named **`Homepage_Fiat`**. Two vocabularies for the same thing.

**A3 — `Tabs` instance width differs between screens.** Fiat `343` (full width,
375−32), Crypto `306`. Same component, same x=16, inconsistent width — reads
like fill-container vs hug-contents.

**A4 — Section header built two different ways.** Fiat's "Transactions" is a
**raw `text` node** (`0:419`). Every comparable header — Crypto's "My Tokens"
(`0:371`), "Featured Coin" (`0:420`), Fiat's "Smart Insights" (`0:461`) — is a
**`Label` instance**. One header escaped the component.

**A5 — Duplicate `navbar/mobile/section` on Crypto.** Two instances at identical
position: `0:485` **hidden**, `0:491` visible. Fiat has one. Leftover.

**A6 — Unfilled `{title}` placeholder inside a live screen.** In Fiat's
`❖ System message`, text node `0:569` is literally `{title}`, sitting directly
above real copy "Master Your Money & Monarch". This is a placeholder that
shipped into a screen, not a spec frame.

**A7 — Dead/hidden layers repeated across both screens.** A stray hidden single
`Tab` instance beside the real `Tabs` (`0:358`, `0:302`); hidden raw `"See all"`
text in **every** section (`0:420`, `0:469`, `0:558`, `0:377`, `0:426`)
superseded by `❖ Link` instances; hidden `Frame 288` + `Line 2` pairs
(`0:457/0:458`, `0:384/0:385`); hidden `.02` text (`0:352`); hidden `image 112`
(`0:566`).

**A8 — Missing "See all" affordance, one section only.** In Fiat's
features/education block the `❖ Link` (`0:559`) is **hidden**, while every
sibling section shows one.

**A9 — FAB 1px off between screens.** `icon object` at x=**298** (Fiat) vs
x=**297** (Crypto). Same y.

**A10 — FAB occludes live data on Crypto.** At y=653–709 it sits over the
Litecoin row, covering its price. On Fiat it overlaps the Smart Insights
carousel more benignly. Expected FAB float behaviour, but on Crypto it hides a
value.

**A11 — Stock-art URL as a layer name.** `0:564` is named
`https://www.vecteezy.com/vector-art/47304489-...`. Asset provenance, not a
design defect — noted because it will otherwise become a filename.

**A12 — Horizontal overflow is real, not a clip artifact.** Fiat's Smart
Insights carousel (`Frame 313`) is 375 wide with a third card at x=362 w=165 →
right edge **527**. Deliberate carousel; content, not a mistake.

## B. Detached instances — triaged

**B1 — Fiat "Send" button (`0:408`) → detached copy of the DS button component.
High confidence.**

| | Fiat `0:403` "Add money" | Fiat **`0:408`** "Send" | Crypto `0:360` "Send" |
|---|---|---|---|
| Node type | `instance` | **`frame`** | `instance` |
| Size | 139 × 40 | **92 × 40** | **92 × 40** |

Its sibling on the same row is an instance, and its exact counterpart on the
Crypto screen is an instance of the same size. What differs in the detached
copy: the text layer is still named `"Button"` — the component's default
placeholder name — though it renders "Send". Being a frame, it will not receive
DS updates.

**B2 — `❖ System message` (`0:561`).** It is a `<frame>`, but carries the `❖`
prefix this file uses for library-component instances (every `❖ Link` in both
screens *is* an instance). No component named "System message" appears in the
DS's shipped public API as this repo consumes it. Three readings could not be
separated from MCP data alone: a detached instance of a Figma-library component
never built in code; a detached-and-drifted copy of an existing DS component; or
genuinely custom (a Rule-3 gap).

> **RESOLVED (Teku):** it **was a component, deliberately detached** in order to
> modify it for its specific allocated location and distinct purpose. So:
> **detached copy of an existing component, intentionally modified** — *not* a
> Rule-3 gap. The `{title}` placeholder (A6) remains a separate finding.

**Everything else is properly instanced** — `Header`, `Tabs`, `Tab`, `Label`,
`Item/list`, `icon / button`, `card/smart insights`,
`card/features and education`, `❖ Link`, `<element>`, `icon object`,
`navbar/mobile/section`.

## C. Flagged for 5.3 — not resolved

**C1 — Sparkline charts in Crypto's Featured Coin rows.** The Solana/Litecoin
rows show green line charts. They appear to sit *inside* `Item/list` instances
(`0:434`, `0:451`, `0:468`), whose children metadata doesn't expand. If the
chart is a real sub-layer, it is a **candidate Rule-3 gap** — no charting
primitive is evident in the DS's public API. Verify at 5.3 before treating it as
a gap.

> **DOWNGRADED (Flow 2 A11, confirmed Flow 3).** Do **not** treat "chart" as a
> confirmed missing primitive on name evidence alone. `list/chart legend` was
> found in Flow 2 rendering course rows, and in Flow 3 rendering spending and
> search rows — never a chart. This C1 suspicion rests on a *visual* sparkline,
> which is separate evidence and still stands as a candidate, but the naming
> argument behind it is void.
>
> **Separately: Flow 3 A21 is a confirmed real chart** — a 7-segment donut,
> visually verified. Charting is a genuine need in this file; it just is not
> established by anything called "chart".

**C2 — Crypto's third Featured Coin item is occluded by the bottom nav.** It
lands at ~y=726–770; the navbar starts at y=720. With `Frame 556` at 770 there
is no scroll room to clear it. Either intentional bleed or a layout bug —
recorded, not decided.

## D. Cross-flow state

Not assessed for Flow 1 at the time of capture. The Accounts/Crypto tab
selection is **in-screen state only** and does not persist beyond the screen.

---

# Flow 2 — `Monarch Academy`

**Section node:** `1266:14273`
**Section URL:** `https://www.figma.com/design/v9MI8jxTaXiJA234Hkanlf/casestudy_02?node-id=1266-14273`
**Entry point (per Teku):** tapping the large Monarch Academy card in the
Homepage's Monarch Academy section.

## 1. What it accomplishes

An in-app learning hub — two tabbed tracks (**App Guide** for feature discovery,
**Wealth Wisdom** for financial literacy), each showing a gamified progression
level, a prompted next task, and browsable/filterable content cards.

## 2. Screens contained

Two. The Section has **three** children; the third is chrome, not a screen (C1).

| Figma name | Node | Size | Scroll content height |
|---|---|---|---|
| `Monarch Academy01` — **App Guide** tab | `1266:14274` | 375 × **1868** | `Frame 455` = 1684. **Deliberately unclipped** — the frame is expanded so all content is on canvas (per Teku). |
| `Monarch Academy02` — **Wealth Wisdom** tab | `1266:14275` | 375 × **831** | `Frame 455` = 656 (y=146→802). Fits vertically; **overflows horizontally** (A10). |

**Carry-over 1 — screen node type: the Flow 1 pattern holds.** Both screens are
`<instance>` nodes, not frames, and their children carry `0:xxx` IDs — the main
components' internal IDs. **Two Sections, same pattern: authoritative screen
definitions live in main components elsewhere in the file, and Sections hold
placed instances.** If this holds file-wide it determines where 5.3 reads from.

**Chrome behaviour differs from Flow 1.** On both Academy screens
`navbar/mobile/section` is **hidden** while `icon object` (the Steward FAB,
56×56 @ x=297 y=653) stays **visible**. Academy has no bottom nav; Homepage
does (A8).

## 3. Navigation order

**No wired prototype links verified.** `get_metadata` carries no reaction data,
and no prototype pull was made for this Section. Everything below is **inferred**.

- **Inferred** — visual left-to-right: `Monarch Academy01` (x=83) →
  `Monarch Academy02` (x=495).
- **Semantically not sequential**, same shape as Flow 1: these are two
  selected-states of one screen. The transition is the `Tabs` component
  (**App Guide** ↔ **Wealth Wisdom**) — in-screen state, not a route change.
- **Entry** — from the Homepage Monarch Academy card (Teku's description;
  cross-Section, not verified here).
- **Exit** — `←` back arrow in the header. Inferred from the affordance.
- **Unresolved destinations** — feature cards, "Set up now", "Watch Video
  (2 min)", and the Quick Wins rows all imply detail content. No such screens
  exist in this Section.

## A. Figma source inconsistencies — recorded, not corrected

**A1 — Header composed differently than Flow 1.** Here: `Frame 451` = `Status
Bar` instance (375×44) + `header` instance (375×48) = 92. Flow 1 used a single
`Header` instance (375×112). Two patterns for the same chrome.

**A2 — Third distinct `Tabs` width.** `226` on both Academy screens, vs Flow 1's
`343` (Fiat) and `306` (Crypto). Also positioned at **x=74.5** — a half-pixel.

**A3 — Stray hidden `Tab` instance beside the real `Tabs`** on both screens
(`0:503`, `0:283`). Same dead-layer pattern as Flow 1 A7.

**A4 — Level badge contradicts level text, consistently on both screens.**
Academy01: badge **"Lv3"** with text **"Level 2: Pro User"**. Academy02: badge
**"Lv4"** with text **"Level 3: Savvy Saver"**. The off-by-one is consistent, so
it most likely means "progress *toward* the next level" — but the badge carries
no label saying so. **Verify intent; not recorded as an error.**

**A5 — Progress bar geometry differs by 1px between screens.** `274` (Academy01)
vs `273` (Academy02); the "Lv" text also shifts (x=284 w=27 vs x=283 w=28).

**A6 — `Navbar/home indicator` handled two different ways.** Academy02 has it
**inside** the screen (`0:154` @ y=806). Academy01 does not — instead a
**Section-level sibling** (`1266:14276` @ y=1903) sits under it. Same chrome,
one internal and one external.

**A7 — Academy02 is 831 tall, 19px above the 812 standard** used by every Flow 1
screen. Consistent with extending the frame to seat the internal home indicator
(806 + 25 = 831), but it makes this screen a different height from the rest.

**A8 — Bottom nav hidden throughout Academy while the FAB stays visible.**
`navbar/mobile/section` is hidden on both screens (`0:513`, `0:293`). A
deliberate-looking full-screen sub-page treatment, but hidden layers are
ambiguous between "not in this state" and "leftover" — worth confirming, since
it changes the navigation model between Homepage and Academy.

**A9 — FAB occludes live content on both screens.** Academy01: it sits over the
"Search features" field. Academy02: it cuts the "Retirement planning: Start
ea…" row text. Same class as Flow 1 A10.

**A10 — Horizontal overflow, filter chip row.** Academy02's `Frame 500`
(`0:177`) is **451 wide inside a 375 screen**; inner `Frame 422` is 419 at x=16
→ right edge 435. The "Retirement" chip is clipped. Reads as a scrolling chip
row (same class as Flow 1 A12) — content, not a mistake, but confirm.

**A11 — `list/chart legend` used for course rows.** Instances `0:243`, `0:256`,
`0:269` render the Quick Wins list (icon + "Investing 101: Build portfolio" +
"6 Modules · 15 min"). Nothing about it is a chart legend. Component name and
actual use have diverged.

**A12 — `icon object` name is overloaded.** Used both as the **56×56 Steward
FAB** and as a **40×40 in-card icon with a progress ring** (`0:277`, `0:192`).
Same component name, two roles and two sizes.

**A13 — `card/features and education` sized inconsistently.** Academy01:
108.33 × 108, and the 4th card in each group is **109** rather than 108.33.
Academy02: 109 × **120**. Flow 1 used 109 × 108.

**A14 — Subpixel / irrational geometry throughout.** `Tabs` x=**74.5**; card
widths **108.33333587646484** and **108.33332824707031**; `Group 283`
**135.92822265625 × 280.0718688964844** at x=**103.25**, with children at
**108.85928583145142**, **103.25023185223108**, **100.9462890625**.

**A15 — `Group 283` overflows its parent by ~70px.** The phone mockup is 280.07
tall inside `Frame 414` at 210, so it is clipped by the green card. Looks
intentional (device peeking out of the card) but is unmanaged overflow.

**A16 — Duplicate layer names.** `Frame 455` (`0:245`) contains a child also
named `Frame 455` (`0:318`); `Frame 414` appears at `0:247` and `0:309`;
`Frame 500` names both a 341-wide card grid (`0:345`) and the 451-wide chip row
(`0:177`).

**A17 — `❖ Link` visibility inconsistent between the two smart-insight cards.**
Hidden on Academy02 (`0:204`), visible on Academy01 (`0:294`). Same class as
Flow 1 A8.

**A18 — `button` height 28 on Academy01's "Watch Video (2 min)"** (`0:316`,
311×28) vs 40 for every Flow 1 action button. Confirm whether this is a real
size variant or an ad-hoc resize.

**A19 — Content capitalization inconsistent.** "Smart budgets" and "Buy and sell
stocks" (sentence case) against "Savings Goals", "Track Spending", "Buy and sell
Crypto" (title case) — within the same card grids.

**A20 — Category cards are colour-coded by group** — Essentials blue, Crypto &
Assets orange, Plan & Manage green, Safety & Smart Support purple. Recorded
because per-entity colour is precisely the rule-2 risk called out in the
architecture proposal §3.4: these must resolve to token names or DS variant
props, never hex in a data file.

## B. Detached instances — triaged

**B1 — `card/smart insights` is a `<frame>` on both Academy screens → detached
copies. Moderate-high confidence.**

| | Flow 1 Homepage | Academy01 `0:275` | Academy02 `0:190` |
|---|---|---|---|
| Node type | `instance` (`0:477`, `0:497`, `0:522`) | **`frame`** | **`frame`** |
| Size | 165 × 112 | **343 × 56** | **343 × 56** |

Evidence: the name matches a component that *is* instanced elsewhere in the same
file. Caveat lowering confidence from high: the dimensions diverge sharply — a
narrow 165×112 carousel card versus a full-width 343×56 row. That is a large
modification, but it matches exactly the practice Teku confirmed for Flow 1's
B2: **detach in order to modify for a distinct allocated location.** Reading it
as the same deliberate pattern, not a Rule-3 gap.

**B2 — `icon object` inside Academy01's card (`0:277`) → detached copy. High
confidence.** Its direct counterpart one screen over (Academy02 `0:192`) is an
`<instance>` of the same name, same 40×40 size, same role. One detached, one
not.

**B3 — `logo_monarch_L` (`0:250`, `0:161`) → cannot determine. Flagging.** It is
a `<frame>` on both screens, and I have found no `<instance>` counterpart to
compare against within the two Sections walked so far. It could be a detached
copy of a logo component or a one-off art frame. Resolving it would mean either
DS-component mapping (5.3) or Teku's knowledge. **Not guessing.**

> **RESOLVED (Teku + verified).** The DS ships a `Logo` component. Verified
> against the installed package as this repo consumes it — a consumer read of
> `node_modules/@monarch/design-system/dist`, no DS-repo access:
>
> - `dist/index.d.ts` → `export * from './components/Logo';`
> - `dist/components/Logo/Logo.d.ts` → `Logo({ name, size })`, `LogoProps`,
>   `LogoSize = 'xs' | 's' | 'm' | 'l'`
> - `dist/components/Logo/logos.d.ts` → `LogoName` includes
>   **`monarch_logo_style_thick`** and **`monarch_logo_style_thin`**, plus the
>   `brand | company | crypto` categories
> - `.mn-logo` present in the shipped `dist/index.css` (minified, so line
>   context is not meaningful — presence is the signal)
>
> So `logo_monarch_L` is a **detached copy of the DS `Logo`**, **not** custom art
> and **not** a Rule-3 gap. The no-detach-history caveat still applies to the
> word *detached* — what is now settled is that a DS equivalent exists, which
> removes the "genuinely custom" reading entirely.

**Everything else is properly instanced** — `Status Bar`, `header`, `Progress
bar indicator`, `Label`, `Field`, `filter/chips/toggle`, `card/features and
education`, `list/chart legend`, `❖ Link`, `<element>`, `icon object` (FAB),
`navbar/mobile/section`, `Bottom Sheet`, `Navbar/home indicator`, `button`,
`Tabs`, `Tab`.

## C. Non-screen content

**C1 — `Navbar/home indicator` (`1266:14276`), Section-level child, 375×25 @
y=1903.** A chrome fragment placed beside the screens to complete Academy01's
bottom edge. **Excluded from the screen list.** See A6.

**C2 — Hidden `Bottom Sheet` instances (`0:514`, `0:294`), 375×812, on both
screens.** Not a screen in this Section, so excluded — but it evidences a
bottom-sheet state for Academy that this Section does not show.

**C3 — No `{...}` placeholder text found anywhere in this Section**, unlike
Flow 1's `{title}` (A6). Every text node carries real copy.

## D. Cross-flow state — carry-over 2

**The answer is not "none".** Three distinct reads of data produced outside this
flow:

**D1 — Task completion from another flow.** "Essential Tasks → Set Up Auto-Save
Goal — **3 of 6 completed**". Setting up an auto-save goal happens in a savings/
goals flow; Academy reads its completion count.

**D2 — Account balance from the Homepage domain.** Academy02's card reads
"**Your RM 27K** is ready for more" — the Homepage fiat balance is RM 27,978.

**D3 — Progression / XP.** Two independent tracks: "Your Monarch mastery"
(Lv3 / Level 2: Pro User) and "Your Financial IQ" (Lv4 / Level 3: Savvy Saver),
plus "Quiz — Diversification **+100XP**".

**In-screen only** (no persistence beyond the screen): tab selection
(App Guide / Wealth Wisdom), filter chips (All / Investing / Crypto / Taxes /
Retirement), the "Search features" field.

**Assessment for the state-layer decision.** All three are cross-flow **reads**
of derived profile/progress data. A single read-only source in `src/data/`
satisfies every one of them without a store — this does **not** yet trip the
§2.4 trigger, which requires state *mutated* in one flow and observed live in
another. It moves closer: if Academy also **writes** progress (marking a module
complete, awarding XP) and another flow must observe that write without a
reload, the trigger fires. Not evidenced in this Section. **Re-evaluate when the
goals/savings flow is inventoried**, since D1 implies a writer somewhere.

---

# Flow 3 — `Monarch Assistant`

**Section node:** `1266:14407`
**Section URL:** `https://www.figma.com/design/v9MI8jxTaXiJA234Hkanlf/casestudy_02?node-id=1266-14407`

**Not a flow — a scenario set.** Teku's framing, and the structure agrees: five
independent states of one surface, not a sequence. The assistant is **"Monarch
Steward"**, who introduces himself as *"your Steward"*.

## 1. What it accomplishes

A global AI assistant reachable from the Steward FAB on any screen, opening as a
bottom sheet over the current context. The five screens are sampled
conversations: welcome//prompt-starters, investment guidance, spending analysis,
and search.

## 2. Screens contained

Five. The Section has **six** children; the sixth is a component-definition
frame, not a screen (C1).

| Figma name | Node | Size | Sheet geometry |
|---|---|---|---|
| `Monarch_Assistant01` | `1266:14408` | 375 × 812 | **No sheet** — entry state, FAB + navbar over the app |
| `Monarch_Assistant02` | `1266:14409` | 375 × 812 | sheet y=103, 709 tall — welcome + prompt chips |
| `Monarch_Assistant03` | `1266:14412` | 375 × **1056** | sheet y=35, 1021 tall — expanded to show full content |
| `Monarch_Assistant04` | `1266:14410` | 375 × 812 | sheet y=159, 653 tall — spending analysis |
| `Monarch_Assistant05` | `1266:14411` | 375 × **969** | sheet y=108, 861 tall — expanded; search results |

**Carry-over 1 — all five are `<instance>` nodes. That is three Sections out of
three.** Homepage (2 screens), Academy (2), Assistant (5) — nine screens, every
one an instance with `0:xxx` children. **Treat as file-wide:** authoritative
screen definitions live in main components elsewhere; Sections hold placed
instances. 5.3 should read from the main components, not the Section placements.

## 3. Navigation order

**No wired prototype links verified** — `get_metadata` carries no reaction data
and no prototype pull was made.

- **Inferred** — visual left-to-right: `01` (x=63) → `02` (x=490) →
  `03` (x=917) → `04` (x=1344) → `05` (x=1771).
- **These are not sequential steps.** 02, 03, 04 and 05 are four *alternative*
  conversations, each opening from the same 01 entry state. Only `01 → 02` reads
  as a real transition (tap FAB → sheet opens).
- **Entry** — the Steward FAB (`icon object`, 56×56 @ x=297 y=653), present on
  every screen in every Section walked so far.
- **Exit** — `✕` in the sheet header, and the `Blanket` behind it.

## A. Figma source inconsistencies — recorded, not corrected

**A1 — The app behind the sheet is a flattened raster image, not composed UI.**
`image 144` (a 375×812 rounded-rectangle) is the entire underlying screen on all
five (`0:75`, `0:110`, `0:137`, `0:126`, `0:150`). The only live layers are the
FAB, the navbar, and the sheet.

**A2 — A second, hidden background image on all five** — `image 133` (`0:74`,
`0:109`, `0:136`, `0:125`, `0:149`), same 375×812, hidden. Dead duplicate.

**A3 — Layer order does not match visual order.** Children enumerate as 01, 02,
**04, 05, 03**; x-positions place 03 third.

**A4 — Screen heights inconsistent** — 812, 812, **1056**, 812, **969**. 03 and
05 were expanded to show full sheet content; 01/02/04 left at 812.

**A5 — Navbar anchoring follows two different rules on the expanded screens.**
Assistant03: navbar at y=**720** (aligned to the 812 image, so it sits
mid-frame in a 1056 frame). Assistant05: navbar at y=**877** (bottom-aligned to
the 969 frame). Same component, two anchoring models.

**A6 — Assistant05 has 157px of unfilled frame.** The background image ends at
812; the frame is 969. The navbar floats in the gap with nothing behind it.

**A7 — Four different sheet offsets with no evident snap points** — y=103 (02),
y=35 (03), y=159 (04), y=108 (05).

**A8 — `Navbar/home indicator` is 343 wide here** (x=16) inside every sheet
(`0:203`, `0:340`, `0:264`, `0:366`), versus **375** in Academy02. Two widths
for the same component.

**A9 — Fraud-scenario copy left hidden inside the welcome sheet.** In
Assistant02, "This transfer looks unusual based on patterns linked to common
scams, especially with new or inactive accounts." appears **twice** as hidden
text (`0:163`, `0:173`) — copy from an entirely different scenario.

> **ORIGIN FOUND — see Flow 6 A7.** That string is the **visible body copy of
> the education overlay** in Flow 6 `…_HighRiskTransfer01_Education`
> (`1266:14383`, text node `0:199`), under the heading "Why You're seeing this
> alert".
>
> It was pasted from there into the Assistant's welcome sheet and hidden rather
> than deleted. **This Flow 3 occurrence remains a defect; Flow 6 is its
> legitimate home.** Cross-referenced from both ends so the origin is findable
> either way.

**A10 — Stale subtitle duplicated into five unrelated rows.** "Invest safely and
regularly" is hidden in Assistant03 (`0:305`, `0:314`) and Assistant05
(`0:322`, `0:331`, `0:340`), where it belongs to none of them.

**A11 — Hidden `Slot` instance in every `Content` frame** (`0:155`, `0:182`,
`0:319`, `0:171`, `0:243`, `0:195`, `0:345`).

**A12 — Hidden `Frame 445` (375×128) in every sheet** (`0:201`, `0:338`,
`0:262`, `0:364`).

**A13 — TYPO: "Learn more in Monarch *Aacademy*"** (`0:313`, Assistant03).

**A14 — TYPO: lowercase "i" as a pronoun, twice** — "Where should **i** invest
it?" (Assistant03 sent bubble) and "but **i** can help you explore options"
(`0:188`).

**A15 — Stock tickers are swapped** (Assistant05). "Bilibili Inc" is labelled
**BIIB** (Biogen's ticker) and "Biogen Inc" is labelled **BILI** (Bilibili's
ticker).

**A16 — Missing percent signs** (Assistant05). "5.6" (`0:290`) and "7.3"
(`0:307`) carry no `%`, while "10.2%" and "15.9%" in the same list do.

**A17 — Allocation total does not match the sum of its parts** (Assistant03).
Header reads **"Current Allocation: RM 449,958.84"**; the seven line items sum
to **RM 450,228.00** — a discrepancy of **RM 269.16**.

**A18 — Allocation percentages sum to 100.1%** — 33.3 + 21.9 + 23.8 + 11.6 +
6.2 + 2.7 + 0.6.

**A19 — Gold's percentage does not reconcile.** RM 2,000 against a ~RM 450,228
total is ≈**0.44%**, shown as **0.6%**. The other six reconcile to within
rounding.

**A20 — Crypto balance contradicts the Homepage.** Assistant03 shows "Crypto
Wallets: **RM 107,354**"; Homepage_Crypto shows "**RM 102,354.02**" — off by
exactly **RM 5,000**. Note the same screen's "Cash: RM 27,978" *does* match the
Homepage fiat balance, so the data is partly reconciled and partly not.

> **NOTE — a second Flow 3 data defect, surfaced later from Flow 4 (A17 there).**
> Assistant05 lists a transaction "**Big Pharmacy** … RM 250.75". The Homepage
> has "**Aeon Big** −RM 250.75" *and* "**Caring Pharmacy** −RM 25.50". The
> Assistant entry is a **name mashup of the two, carrying Aeon Big's amount**.
>
> Recorded against both flows. Same category as A17–A22 here and as Flow 4's
> A17: hand-authored figures transcribed independently. See the standing note
> **"data contradictions get COMPUTED, not copied"**.

**A21 — A real donut chart, visually confirmed.** Assistant03's `Group 285`
(`0:206`, 100×100) renders a 7-segment ring chart. Unlike everything named
"chart" in this file, this one genuinely is one. See G1.

**A22 — Assistant04's percentages reconcile with nothing.** Dining & Leisure
RM 1,200.00 / +RM420 shown as 10.2% (an increase of ≈53.8%); Shopping RM 350.00
/ +RM165 shown as 8.8% (≈89%); only Groceries RM 1,800.00 / +RM100 = 5.9% works
as a percentage increase. A "% of total spend" reading fails as well. **Ask what
the number means before it is modelled.**

> **RESOLVED (Teku): authoring error, not intent.** Groceries is the only row
> that computes (100 / 1700 ≈ 5.9%), so the intended definition is **"% increase
> vs last month"**. The other two rows were hand-authored and never recalculated.
>
> Record the Figma values faithfully as source — but see the standing note
> **"data contradictions get COMPUTED, not copied"** at the top of this
> document. A17, A18, A19, A20 and A22 are one category, not five separate
> defects, and the fix is structural: derive from a single source of truth in
> the typed mock data rather than transcribing.

> ## ✅ A22 — PARTIALLY RESOLVED by Flow 10's cross-flow match (2026-08-05)
>
> **The diagnosis narrows from "these figures reconcile under no reading" to
> "the amounts are right, the percentages are fabricated."**
>
> Flow 10's Budget drilldown carries the **identical** category totals:
>
> | Category | Flow 3 Assistant04 | Flow 10 Budget drilldown | |
> |---|---|---|---|
> | Dining & Leisure | RM 1,200.00 | RM 1,200.00 | ✓ match |
> | Shopping | RM 350.00 | RM 350.00 | ✓ match |
> | Groceries | RM 1,800.00 | RM 1,800.00 | ✓ match |
>
> **Assistant04's AMOUNTS are therefore confirmed correct.** Only its
> percentages (10.2% / 8.8% / 5.9%) are fabricated — against the budget total of
> RM 7,500 the correct shares are **16.00% / 4.67% / 24.00%**, which Flow 10
> displays and which still do not match Assistant04's.
>
> ### And there is a real data spine underneath
>
> Flow 10's five Groceries transactions sum to **exactly RM 1,800.00**:
>
> ```
> 250.75 + 420.50 + 310.40 + 288.60 + 529.75 = 1,800.00
> ```
>
> **This matters beyond the defect.** Parts of this file are backed by genuine,
> internally consistent data — a transaction ledger that rolls up correctly into
> category totals that appear identically in two unrelated Sections.
>
> **The derive-don't-copy model can BUILD ON that spine rather than invent
> one.** Transactions → category totals → percentages is a real chain that
> already computes; the fabricated figures are decorations on top of it. Modelling
> the chain and deriving the rest reproduces the file's correct values and
> eliminates its wrong ones in the same stroke.

**A23 — `chips_prompt` height varies** — 28 throughout except `0:177`
(Assistant02) at **48**, a two-line chip.

**A24 — `icon object` appears at a third size, 32×32** (`0:186`, `0:204`,
`0:222`). Extends Flow 2's A12: 56 (FAB), 40 (Academy card), 32 (here).

**A25 — Duplicate and nested-duplicate layer names throughout.** `Bottom Sheet`
frames directly containing `Bottom Sheet` frames (`0:141`→`0:143`,
`0:168`→`0:170`, `0:157`→`0:159`, `0:181`→`0:183`); `Frame 482` inside
`Frame 482`; `Frame 570` inside `Frame 570`; `Content` naming both the message
body and the input row. Assistant03's seven identical legend rows are each a
differently-named frame (`Frame 565`–`Frame 571`) rather than repeated
instances.

## B. Detached instances — triaged

**B1 — `chat` (received bubbles) → detached copies of the `chat` component
defined *in this very Section*. Highest confidence in the inventory so far.**

The `Components` frame holds the actual main components as `symbol` nodes:
`Type=Received` and `Type=Sent` (`1266:14416`, `1266:14418`). In every
conversation screen the **sent** bubble is an `<instance>` (`0:184`, `0:174`,
`0:198`) while the **received** bubbles are `<frame>`s (`0:187`, `0:177`,
`0:179`, `0:201`). Main component present in the same Section, instanced
counterpart in the same screen — this is as close to proof as the API allows.

**B2 — `list/chart legend` → detached copies. High confidence.** `<frame>` in
Assistant04 (`0:183`, `0:201`, `0:219`) and Assistant05 (`0:212`, `0:233`,
`0:250`, `0:275`, `0:292`); `<instance>` in Academy02 (`0:243`, `0:256`,
`0:269`). Same file, same widths.

**B3 — `Item/list` → detached copies. High confidence.** `<frame>` in
Assistant03 (`0:267`, `0:278`, `0:289`, `0:300`, `0:309`) and Assistant05
(`0:317`, `0:326`, `0:335`); `<instance>` throughout Flow 1's Homepage.

**B4 — `Bottom Sheet` → detached copies. Moderate-high confidence.** `<frame>`
on 02/03/04/05 (`0:141`, `0:168`, `0:157`, `0:181`); `<instance>` in both
Academy screens at the same 375×812. The detach is plausibly *what enabled* the
four different heights in A7.

**Properly instanced throughout** — `Blanket`, `Header`, `Input`,
`icon / button`, `chips_prompt`, `Label`, `<element>`, `icon object`,
`navbar/mobile/section`, `Navbar/home indicator`, `chat` (sent variant).

**Pattern worth naming.** Across three Sections the detaches are not random:
they are always the *content-bearing repeater* — `chat` received, `Item/list`,
`list/chart legend`, `card/smart insights` — detached so per-instance content
could be edited freely. Consistent with the practice Teku confirmed at Flow 1
B2. It is a workflow habit, not decay.

> **STRENGTHENED by Flow 4 (Teku).** Every `Item/list` in this flow is detached;
> every `Item/list` in Flow 4 is a proper `<instance>`. Same component, same
> file, both treatments — so **the detach habit is selective, not universal.**
>
> That removes the main competing explanation for the calls above. These are not
> a repo-wide drift that happens to have swept up Flow 3; they are per-screen
> decisions. See the standing note **"the detach habit is SELECTIVE, not
> universal"** at the top of this document.
>
> **CLOSED (Teku, after Flow 5).** Flow 5 supplied the third data point —
> `Item/list` fully instanced in Flows 4 *and* 5, fully detached across Flow 3.
> **Promoted from provisional to settled.** No further evidence is needed; the
> detach question is closed for the inventory. A `<frame>` where an `<instance>`
> was expected is read as intent first, mistake second.

## C. Non-screen content

**C1 — `Components` frame (`1266:14413`), 419×287 @ (63, 1227). Excluded from
the screen list.** A component-definition area, not a flow screen. It contains:

- `chips_prompt` — an `<instance>` (`1266:14414`), so its main lives elsewhere
- `chat` (`1266:14415`) — a frame holding two **`symbol`** nodes,
  `Type=Received` (`1266:14416`) and `Type=Sent` (`1266:14418`), both 343×44.
  **`symbol` = a Figma component definition**, so the `chat` component set is
  authored here, inside a flow Section rather than in a library page.

**C2 — No `{...}` placeholder text found in this Section.** Unlike Flow 1's
`{title}`, every text node carries real copy — though A9 and A10 show real copy
belonging to the wrong scenario, which is the same class of problem wearing
different clothes.

## D. Cross-flow state — carry-over 2

**Reads: extensive. Writes: none evidenced. But the surface itself is global,
which is a new consideration.**

**Read-only, from other flows:**
- **D1** — Portfolio allocation across seven asset classes (Assistant03), which
  spans accounts, crypto, stocks and more. Note A20: it does **not** currently
  agree with the Homepage.
- **D2** — Spending by category with month-over-month deltas (Assistant04).
- **D3** — Transactions, token holdings and stock holdings (Assistant05) — the
  same entities Flow 1 renders.
- **D4** — An outbound link into Academy ("Learn more in Monarch Aacademy"),
  making Flow 2 a navigation target.

**No writer evidenced.** Nothing in these five screens sets state another flow
reads. The chat is presentational — five sampled conversations, no state machine.

**⚠️ The new consideration: this surface is global, not flow-scoped.** The
Steward FAB appears on every screen in all three Sections, and the sheet opens
over whatever is behind it. So *if* the conversation must survive navigation —
open the Steward on Homepage, navigate, come back and still see the thread —
that is **app-level state, not flow-level**, and the route-scoped provider
pattern does not express it. A conversation that resets each time the sheet
opens needs nothing.

**This does not decide the state layer, and it is not the §2.4 trigger** (still
P1, the goals/savings writer). It is a distinct question — *lifetime*, not
sharing — and it needs a product answer: **does the Steward conversation persist
across navigation?** Recorded, not resolved.

> **RESOLVED (Teku): the Steward thread persists for the app session.**
>
> The Steward is therefore **APP-level state — a provider mounted above the
> router**, not a route-scoped flow provider.
>
> **This is an amendment to the architecture proposal's §2, not a reversal.**
> Context-per-flow, mounted as a layout route, still stands as the default for
> flow-scoped state; the Steward is a named exception justified by its global
> surface. It joins `ThemeProvider` as the second app-level provider, and it
> follows the same discipline §2.6 requires: consumed through a named hook
> (`useSteward()`), never `useContext` at the call site, so the implementation
> stays swappable.
>
> Note the lifetime is **session**, not persisted — consistent with §3.2's
> in-memory-only recommendation. A reload clears the thread, which is the
> correct demo behaviour.

## E. Chrome model — carry-over 3

Per-Section record, built as Sections are walked:

| Section | Bottom nav | Steward FAB | Home indicator |
|---|---|---|---|
| Homepage | **Visible** | Visible | Inside `navbar/mobile/section` |
| Monarch Academy | **Hidden** | Visible | Internal on 02; external Section sibling for 01 (A6/F2) |
| Monarch Assistant | **Present on all five** — visible on 01, behind the `Blanket` on 02–05 | Visible on all five | Separate 343-wide instance inside each sheet |

**Three Sections, three different treatments.** Assistant is the only one where
the navbar is present but *occluded* rather than shown or hidden. P2 stands
open.

## F. Colour hazard register — carry-over 4

Accumulating the rule-2 / `lint:tokens` exposures in one place, per the
architecture proposal §3.4. **None of these may reach a data file as hex.**

| # | Source | Exposure |
|---|---|---|
| F1 | Academy (Flow 2 A20) | 4 category colours — Essentials blue, Crypto & Assets orange, Plan & Manage green, Safety & Smart Support purple |
| F2 | Assistant03 donut (A21) | **7 series colours**, one per asset class, each rendered twice — as a ring segment *and* as a coloured legend dot (`Ellipse 18` ×7) |
| F3 | Assistant03 legend text | The percentage values are themselves colour-coded to match their series — "33.3%" red, "21.9%" purple, "23.8%" blue, and so on. Colour applied to **type**, not just to a swatch |
| F4 | Assistant04 / 05 | Directional up/down indicators alongside +RM deltas and percentages |

F2 and F3 are the sharp ones: a seven-colour categorical series has no obvious
home in a semantic token set, and F3 means the colour is not confined to a
decorative dot.

## G. Candidate Rule-3 gaps — flagged, not decided

**G1 — Donut / ring chart (Assistant03, `Group 285`).** Visually confirmed as a
real 7-segment chart, not a misnamed list. No charting primitive is evident in
the DS's public API as this repo consumes it. **This is the strongest Rule-3
candidate found so far** — but confirming it is 5.3 work, and if it holds it is
a DS-repo job in a separate session, never built here.

**G2 — Chat message bubble.** The `chat` component is authored **inside this
Figma Section** (C1), which means it exists in Figma but says nothing about
whether the DS ships one. Verify against the DS public API at 5.3.

## H. Teku's implementation note — recorded verbatim, not acted on

> "when i was taking a Scrimba course there was a part where i can make an Ai
> chat thing using some hugging face setup. That's all i remember, most
> importantly about my description is that it is free. I guess the ai is wrapped
> but the output on our app is according to our paramaters and Ui Codebase."

**Recorded as intent, not a decision.** Two things it collides with, flagged now
so they are not discovered late:

1. **It is the first thing in the inventory that implies a network call.** The
   architecture proposal's §3 recommendation — synchronous, in-memory, no
   network layer, no fetch — was written against flows that had none. A live
   inference call means async, loading states, error states, and a key or
   endpoint. That does not invalidate §3 for the other flows, but the Steward
   would be the one exception, and it should be decided deliberately.
2. **A browser-side call needs somewhere to hold a token.** A client-only SPA
   with no backend has no safe place for one. Whether the demo uses a real
   endpoint, a proxy, or scripted canned responses is a **product and security
   decision**, and it belongs to whoever owns the deployment — not to this
   inventory.

Worth noting the design already handles the hardest content risk well: the
Steward explicitly declines to give personalized investment advice (`0:188`)
before offering exploration ideas and pointing to a licensed advisor. Whatever
backs it must preserve that.

> **DECIDED (Teku) — Phase 5 uses SCRIPTED responses driven by the typed mock
> data. No network call, no API token, no inference.**
>
> Reasoning, recorded: a client-only SPA has no safe place for a token, and
> these five screens already define the exact scenarios the demo needs. The
> conversations are authored content, so scripting them costs nothing in
> fidelity.
>
> **Real inference via a serverless proxy is PARKED for Phase 6.** The Hugging
> Face note above stays on record as the Phase 6 starting point, not as a
> Phase 5 requirement.
>
> Consequence for the architecture proposal: **§3's synchronous, in-memory,
> no-network recommendation now holds without exception.** The one flow that
> looked like it would need a fetch does not. No async layer is required for
> Phase 5.
>
> **DELIBERATE BEHAVIOUR TO PRESERVE — not incidental copy.** The Steward's
> refusal to give personalized investment advice, and its deferral to a
> licensed financial advisor, is intended product behaviour. Any scripted
> response set must keep it. Treat it as a functional requirement of this
> flow, not as sample text to be replaced.

---

# Flow 4 — `Homepage_bank transfer`

**Section node:** `1266:14389`
**Section URL:** `https://www.figma.com/design/v9MI8jxTaXiJA234Hkanlf/casestudy_02?node-id=1266-14389`

**Teku's framing: this flow is incomplete.** Confirmed — see A1. The missing
piece is the success/confirmation screen, which does not exist in Figma at all.

## 1. What it accomplishes

Sending money from a Monarch account to a bank recipient — pick the action, pick
the recipient, optionally change the source account, enter an amount, confirm.

## 2. Screens contained

Four, all `<instance>` nodes, all 375 × 812, none clipping.

**Names refreshed 2026-08-04** after Teku renamed in Figma. Node IDs are the
anchor and are unchanged. Original names retained as `was:` because several
findings below are *about* the old names.

| Figma name (current) | Node | Size | What it actually is |
|---|---|---|---|
| `Homepage_Fiat` | `1266:14390` | 375 × 812 | Homepage (flattened raster) with the **Transfer action sheet** open — "Receive" / "Send" |
| `Homepage_transfer_fiat_Select recipient`<br>*was:* `Homepage_transfer_Bank_success01` | `1266:14391` | 375 × 812 | **"Send" — recipient picker.** Bank/Crypto tabs, search, 5 recent recipients, "+ New recipient" |
| `Homepage_transfer_fiat_enter amount`<br>*was:* `Homepage_transfer_Bank_success03` | `1266:14392` | 375 × 812 | **"Send money" — amount entry**, numeric keypad |
| `Homepage_transfer_fiat_view and optional change origin account`<br>*was:* `Homepage_transfer_Bank_success03` | `1266:14393` | 375 × 812 | **Same screen, From-account dropdown open**, QWERTY keyboard |

> **SUPERSEDED BY RENAME — A2 and A5 below.** The broken `01 / 03 / 03`
> numbering and the names-misdescribe-content defect are both fixed at source.
> The findings are kept verbatim as the record of what was there; they no longer
> describe the file. **A1 (no success screen) is NOT superseded** — the design
> gap is real and survives the rename. **A4 is NOT superseded** — `Homepage_Fiat`
> still collides with Flow 1's `1266:14402`.
>
> One new wrinkle: the screens now say **`fiat`** while their Section is still
> named **`Homepage_bank transfer`**. Minor, recorded, not corrected.

Consistent with the file-wide standing note: all four are instances.

## 3. Navigation order

**No wired prototype links verified** — no reaction data in the metadata
surface, no prototype pull made.

**Inferred**, and the logical order differs from the visual order:

1. `Homepage_Fiat` — Transfer action sheet (Receive / Send)
2. → `…success01` — recipient picker; tap a recipient
3. → `…success03` (`1266:14392`) — amount entry, recipient prefilled in "To"
4. `…success03` (`1266:14393`) is **a sub-state of step 3, not a successor** —
   the "From" account dropdown opened over the same screen. It returns to step 3.
5. → **MISSING** — transfer success / confirmation. Undesigned (A1).

Teku's stated intent for the missing step, recorded verbatim: *"Mock page
animation of a transfer success … with a button that perhaps says Done that goes
back to main homepage."*

## A. Figma source inconsistencies — recorded, not corrected

**A1 — There is no success screen, despite three of four screens being named
"…success…".** The flow ends at amount entry. This is the incomplete part Teku
flagged, and it is the single most consequential fact about this Section.

**A2 — Child numbering is broken** — `success01`, `success03`, `success03`.
There is no `02`, and `03` is used twice.

**A3 — The two `success03` screens are not duplicates.** They are the base state
and the dropdown-open state of one screen. The only structural difference is the
keyboard component: `OTP Keyboard - iPhone` (numeric, `0:319`) versus
`OTP Qwerty keyboard - iPhone` (`0:557`). The QWERTY is **correct** — the
focused field on that screen is "Search accounts", not the amount.

**A4 — `Homepage_Fiat` name collides with Flow 1's `Homepage_Fiat`, but it is a
different main component.** Flow 1's is fully composed (`Frame 555`, children
from `0:327`). This one is a flattened raster (`image 151`) with a `Bottom
Sheet` instance over it. Same name, different thing, different Section.

**A5 — Screen names describe the wrong content.** `…success01` is a recipient
picker with no success state anywhere in it.

**A6 — Keyboard components named "OTP …" are used for non-OTP input** — amount
entry and account search. Another case of the standing name-unreliability note.

**A7 — `navbar/mobile/section` repurposed as an in-screen segmented control.**
On `…success01` (`0:254`) it renders a **2-item pill — "Recipients" / "Scan
QR"** — not the app's 4-item bottom nav. Same component, entirely different
role.

**A8 — Duplicate navbar instances on `…success01`** — `0:252` hidden and `0:254`
visible. Same pattern as Flow 1 A5.

**A9 — Hidden `Bottom Sheet` instances** on `…success01` (`0:253`) and
`…success03` #1 (`0:368`); absent entirely on `…success03` #2. Three different
treatments of the same layer within one Section.

**A10 — Fourth distinct tabs-row geometry.** `Frame 279` is **52** tall with
`Tabs` at y=**10**, versus 58 / y=16 in Flow 1 and Academy. The `Tabs` instance
itself is 343 wide, matching Flow 1's Fiat.

**A11 — Hidden stray `Tab` instance beside the real `Tabs`** (`0:167`) — the
same dead layer found in every Section so far.

**A12 — Hidden raw `"Recent recipients"` text** (`0:194`) superseded by a
`Label` instance (`0:195`). Same pattern as Flow 1 A4/A7.

**A13 — Validation states designed but not shown.** Hidden `<Error message>`
(`0:269`, `0:508`) and `<Helper message>` (`0:270`, `0:509`) instances on both
`success03` screens. The states exist in the design system's component but no
screen demonstrates them.

**A14 — Floating-point coordinate.** `image 151` (`0:46`) sits at
y = `2.2737367544323206e-13`.

**A15 — Half-pixel position.** `<Transfer amount>` (`0:311`, `0:550`) at
x = **68.5**.

**A16 — Merchants used as personal transfer recipients.** "Aeon Big"
(6542645894 • MBB) and "Caring Pharmacy" (6790354865 • PBB) appear under "Recent
recipients" with personal bank accounts, though on the Homepage both are
card-payment merchants. Plausibility note, not a defect — flagging because it
will look odd once modelled as one entity type.

**A17 — Cross-Section data contradiction, surfaced from here.** Assistant05
(Flow 3) lists a transaction "**Big Pharmacy** … RM 250.75". The Homepage has
"**Aeon Big** −RM 250.75" *and* "**Caring Pharmacy** −RM 25.50". The Assistant's
entry is a name mashup of the two carrying Aeon Big's amount. Same category as
the standing data note; recorded against Flow 3 as well.

**A18 — POSITIVE: the transfer arithmetic reconciles.** RM 27,978.59 −
RM 2,550.00 = **RM 25,428.59**, exactly as shown. The source balance
RM 27,978.59 also agrees with the Homepage and with Assistant03's "Cash:
RM 27,978". Recorded deliberately — against the standing data note, this is what
a correctly derived figure looks like, and it is the model the mock data should
follow.

## B. Detached instances — triaged

**B1 — The "To" field (`0:247`, `0:491`) → detached copy of `Input`. High
confidence.** It is a `<frame>` named `Input`, at 343×88, sitting as a direct
sibling of `<instance>` nodes of the same name and the same 343×88 (`0:221` /
`0:412`), inside the same parent frame. It was detached to compose a
`Select / Wallet Account` plus hidden error/helper slots inside it — the same
detach-to-repurpose habit recorded at Flow 1 B2.

**B2 — Contrast worth recording: `Item/list` here are INSTANCES.** `0:202`,
`0:211`, `0:220`, `0:229`, `0:238` — all properly instanced, where every
`Item/list` in Flow 3 was detached. **The detach habit is not universal**, which
strengthens the Flow 3 reading that detaches are deliberate and content-driven
rather than accidental drift.

**Properly instanced throughout** — `Status Bar`, `header`, `Tabs`, `Tab`,
`Input`, `Item/list`, `button`, `Label`, `Select / Wallet Account`,
`<Error message>`, `<Helper message>`, `<Transfer amount>`,
`Navbar/home indicator`, `navbar/mobile/section`, `Bottom Sheet`,
`OTP Keyboard - iPhone`, `OTP Qwerty keyboard - iPhone`.

## C. Non-screen content

**None.** All four Section children are screens. No spec or property-template
frames, and **no `{...}` placeholders leaked into any screen.**

## D. Cross-flow state — carry-over 1

**P1 is NOT resolved by this Section.** This is the bank-transfer flow, not the
goals/savings flow. Academy's "3 of 6 completed" writer is still unlocated —
**P1 remains OPEN.**

**But this Section raises a new, concrete writer candidate — see P3.**

**D1 — A completed transfer mutates an account balance that at least three other
flows read.** The screen states the post-transfer balance explicitly ("Your new
balance RM 25,428.59"). Main Account's balance is read by:
- Flow 1 Homepage — the headline RM 27,978.59
- Flow 2 Academy — "Your RM 27K is ready for more"
- Flow 3 Assistant03 — "Cash: 6.2% • RM 27,978", and it feeds the allocation total

**Whether this is a real writer depends on an unanswered product question:** does
tapping "Transfer money" actually decrement the balance for the rest of the
session, or is the success screen a pure animation that changes nothing? Teku's
description — *"Mock page animation of a transfer success"* — leans toward the
latter, but does not settle it. **Logged as P3, not decided.**

> **DECIDED (Teku): YES — a completed transfer decrements the source account
> balance for the app session.** Not a pure animation. The Figma arithmetic
> already reconciles (27,978.59 − 2,550.00 = 25,428.59, A18), which indicates a
> real decrement was always the intent.
>
> **Architectural consequence, stated explicitly:** account/balance becomes
> **APP-LEVEL state**, the same scope as the Steward thread. The MVP therefore
> has:
>
> | Scope | Provider | Holds |
> |---|---|---|
> | App-level (above the router) | `ThemeProvider` | light/dark |
> | App-level (above the router) | accounts | balances, mutated by transfers, read by Flows 1–4 |
> | App-level (above the router) | steward | conversation thread, session lifetime |
> | Route-scoped (layout route) | per-flow | Flow 4's recipient / amount / from-account (D2) |
>
> **⚠️ This is STILL Context. It is NOT a §2.4 flip to a store.** Recording that
> plainly, because three amendments have now accumulated and could later be
> misread as drift toward a library. §2.4's trigger was *Context becoming
> unwieldy* — selector-based subscriptions earning their keep, provider nesting
> becoming a problem. **Two app-level providers plus per-flow route-scoped
> providers is not that.** It is four providers, at most two of which are
> mounted at any moment, in an app rendering one mobile screen at a time. Every
> argument in §2.2 still holds unchanged.
>
> The §2.6 discipline still applies and is what keeps the decision cheap:
> consume through named hooks (`useAccounts()`, `useSteward()`), never
> `useContext` at the call site.

**D2 — The first genuine multi-step, cross-screen state in the inventory.**
Within this flow: the recipient chosen on `…success01` populates "To" on
`…success03`; the account chosen in the dropdown populates "From". That is
exactly the case the architecture proposal's §2 route-scoped flow provider was
designed for, and it is the first flow to actually need one. Tab selection and
filter chips in Flows 1–2 were in-screen state; this is not.

> **NOTE (Teku): record this as the first actual customer for §2's route-scoped
> provider.** Flows 1–3 produced only in-screen state (tabs, filter chips,
> search fields) and app-level state (the Steward thread). Flow 4 is the first
> flow in the inventory with **genuine flow-scoped multi-step state** — recipient
> chosen on one screen, read on the next, discarded if the flow is abandoned.
>
> That is precisely the shape §2.1 described, and it is worth noting that the
> pattern was proposed before any flow demonstrably needed it. It now has one.

## E. Chrome model — carry-over 2

| Section | Bottom nav | Steward FAB | Home indicator |
|---|---|---|---|
| Homepage | **Visible** | Visible | Inside `navbar/mobile/section` |
| Monarch Academy | **Hidden** | Visible | Internal on 02; external Section sibling for 01 |
| Monarch Assistant | Present on all five — visible on 01, occluded by `Blanket` on 02–05 | Visible on all five | Separate 343-wide instance inside each sheet |
| **Homepage_bank transfer** | **Hidden on 3 of 4**; on `…success01` **repurposed as a 2-item segmented control** (A7) | **ABSENT on all four** | Separate 375-wide instance @ y=787 on screens 2–4 |

**Fourth Section, fourth model — and the first with no Steward FAB anywhere.**
Homepage, Academy and Assistant all carry it. A focused transactional flow drops
it. That reads deliberate, but it is the sort of thing that should be a stated
rule rather than an emergent one. Folds into P2.

## F. Colour hazard register — carry-over 3

**No new entries.** F-numbering stands at F1–F4 from Flows 2–3.

**Positive finding worth recording:** all identity colour in this Section comes
from **logos, not from categorical colour assignments** — merchant marks (Aeon,
Caring), bank codes (MBB, PBB, CIMB, RHB, HLB) and the MYR currency flag. The
DS's `LogoName` union already contains `aeon`, `caring`, `maybank` and `flag`
(verified earlier in the Flow 2 B3 resolution), so these resolve through the DS
`Logo` component and introduce **no raw-colour hazard at all**.

This is the shape the F1–F4 hazards should be pushed toward wherever possible:
identity carried by a component, not by a hex value in a data file.

## G. Data figures — carry-over 4

Checked against the standing "computed, not copied" note:

- **Reconciles ✓** — RM 27,978.59 − RM 2,550.00 = RM 25,428.59 (A18)
- **Reconciles ✓** — source balance agrees across Flows 1, 3 and 4
- **Does not reconcile ✗** — A17, the Assistant05 "Big Pharmacy" mashup
- **New entity, unverified** — "Joint Account RM 15,000.00" appears only here.
  Nothing else in the inventory references a second account, so there is nothing
  to contradict it yet. Watch for it in later Sections.

---

# Flow 5 — `Homepage_transfer_Crypto`

**Section node:** `1266:14394`
**Section URL:** `https://www.figma.com/design/v9MI8jxTaXiJA234Hkanlf/casestudy_02?node-id=1266-14394`

**Canonical Figma name is `Homepage_transfer_Crypto`** (as reported by the MCP).
Recorded because the label given in chat was `Homepage_trasnfer_crypto`; the
transposition is in the label, not in the file.

## 1. What it accomplishes

Sending crypto from a Monarch wallet to an external address — pick the action,
pick the recipient, **select which token**, enter an amount, **choose a network
fee tier**, review. The two bolded steps are what make it differ from Flow 4.

## 2. Screens contained

Six, all `<instance>` nodes. Consistent with the file-wide standing note.

**Names refreshed 2026-08-04** after Teku renamed in Figma. Node IDs are the
anchor and are unchanged. Original names retained as `was:`.

| Figma name (current) | Node | Size | What it actually is |
|---|---|---|---|
| `Homepage_Crypto` | `1266:14400` | 375 × 812 | Homepage Crypto tab (flattened raster) + **Transfer action sheet** |
| `Homepage_transfer_Crypto_Select recipient`<br>*was:* `…_Crypto_success01` | `1266:14395` | 375 × 812 | **"Send Crypto"** — recipient picker, 5 wallet addresses |
| `Homepage_transfer_Crypto_select token`<br>*was:* `…_Crypto_success02` | `1266:14396` | 375 × 812 | **"Select Token"** — 5 holdings |
| `Homepage_transfer_Crypto_confirm transfer detail`<br>*was:* `Homepage_transfer_Bank_success03` | `1266:14397` | 375 × **878** | **"Send Ethereum"** — amount entry, keypad |
| `Homepage_transfer_Crypto_adjust gas fee`<br>*was:* `Homepage_transfer_Bank_success03` | `1266:14399` | 375 × 812 | Same screen + **"Network Fee"** bottom sheet |
| `Homepage_transfer_Crypto_confirm details with gas fee`<br>*was:* `Homepage_transfer_Bank_success03` | `1266:14398` | 375 × 812 | Same screen — **review**, fee breakdown, no keypad |

> **SUPERSEDED BY RENAME — A1 and A3 below.** The three-screens-named-"Bank"-
> inside-the-Crypto-flow collision and the names-misdescribe-content defect are
> both fixed at source. **The one string that identified five screens across two
> Sections no longer exists anywhere in the file.** Findings kept verbatim as
> the record.
>
> **A2 (no success screen) is NOT superseded** — the design gap survives the
> rename and remains open as GD1. The names no longer *claim* a success screen,
> which arguably makes the gap more visible rather than less.
>
> `Homepage_Crypto` (`1266:14400`) still collides with Flow 1's `1266:14403`.

## 3. Navigation order

**No wired prototype links verified** — no reaction data in the metadata
surface, no prototype pull made.

**Inferred**, and here visual order and logical order agree:

1. `Homepage_Crypto` — Transfer action sheet (Receive / Send)
2. → `…Crypto_success01` — "Send Crypto", pick recipient
3. → `…Crypto_success02` — "Select Token", pick holding, **Next**
4. → `…Bank_success03` (`1266:14397`) — "Send Ethereum", enter amount, **Next**
5. → `…Bank_success03` (`1266:14399`) — Network Fee sheet over the same screen;
   **OK** / **Cancel**. A sub-state of step 4, not a successor.
6. → `…Bank_success03` (`1266:14398`) — review with fee breakdown,
   **"Transfer cypto"**
7. → **MISSING** — no success screen. See A3.

## A. Figma source inconsistencies — recorded, not corrected

**A1 — Three screens here are named `Homepage_transfer_Bank_success03` — "Bank",
inside the Crypto flow.** Flow 4 used that exact name for two screens. **That one
string now identifies five different screens across two Sections.**

**A2 — No success screen, again.** Five of six screens carry `success` in their
name; **none is a success screen.** The flow ends at a review screen. Same class
as GD1 in the gap register — logged there, not resolved here.

**A3 — Screen names misdescribe content throughout** (carry-over 5, checked
against rendered output rather than trusted): `…success01` is "Send Crypto"
recipient selection; `…success02` is "Select Token"; the three `Bank_success03`
screens are "Send Ethereum" amount / fee / review.

**A4 — TYPO: "Transfer *cypto*"** on the review screen's primary button.

**A5 — Header title and subtitle disagree on `…success02`.** Title reads "Select
Token"; the subtitle beneath reads "Enter Transfer Details" — which describes
the *next* step.

**A6 — The wallet has two names.** "**Marge's Crypto**" on the Homepage (Flow 1)
and on this Section's screen 1, versus "**Marg's Wallet**" on screens 3–6.
Different possessive spelling *and* a different noun. A third grouping, "**Fun
Tokens**", holds Stellar and Uniswap.

**A7 — The destination address is not valid hex.** `0x9dj6…0fgm` contains `j`,
`g` and `m`, none of which are hexadecimal. The five recipient addresses on
`…success01` (`0x92fa…1ae3`, `0xb7c2…49ff`, `0xa53b…d92c`, and two more) *are*
well-formed hex. One authored carelessly, the rest carefully.

> **CALL MADE (Teku asked): record faithfully here, FIX in the mock data.**
>
> This inventory keeps `0x9dj6…0fgm` verbatim — that is what the file says, and
> the standing convention is to record, not correct.
>
> **But the typed mock data must use a well-formed address.** This is a
> different case from A17–A22 and the crypto totals: those are *derivable*
> figures that a computed model fixes automatically. An address is not derived
> from anything — it is opaque input, so nothing will catch it. A visibly
> invalid hex string in a finance demo reads as carelessness to exactly the
> audience this artifact is for.
>
> The fix is free: generate a valid 0x-prefixed hex string in the same
> truncated `0x…` display format. **Note it as a deliberate divergence from
> Figma in the data file's comments**, so the inventory and the code do not
> silently disagree.
>
> Same treatment applies to the typos recorded elsewhere — "Aacademy",
> "Transfer cypto", "but i can", "this ?" — fix in code, keep the record here.

**A8 — The destination address matches none of the five recipients** chosen from
on the preceding screen.

**A9 — ETH unit casing is inconsistent** — "0.313 ETH" and "1.3786 ETH" against
"0.0003 Eth", "0.317 Eth", and "1.0656Eth" / "1.0642Eth" with no space at all.

**A10 — `header` height varies inside this one Section** — 48 on five screens,
**68** on `…success02` (`0:113`), which makes its `Frame 451` 112 rather than 92.

**A11 — 4px header/content overlaps throughout.** `Frame 455` starts at y=88
beneath a 92-tall `Frame 451` on four screens, and at y=108 beneath a 112-tall
one on `…success02`.

**A12 — Tabs-row geometry differs from Flow 4.** Here `Frame 279` is 58 tall
with `Tabs` at y=16 — matching Flow 1 and Academy. **Flow 4's 52 / y=10 is the
outlier**, now that four Sections use 58/16.

**A13 — `Item/list` heights differ between adjacent screens** — 48 on
`…success01`, **44** on `…success02`.

**A14 — `Input` appears at four different heights** — 74 (`…success01`), and
88 / 68 / 98 across the `success03` screens.

**A15 — `<divider 1px>` is 5px tall** everywhere it appears (`0:313`, `0:288`,
`0:321`, `0:278`, `0:287`, `0:296`). The component name asserts 1px.

**A16 — Two hidden background images** stacked beneath the visible one on
`Homepage_Crypto` — `image 131` and `image 144` under `image 152`. Flow 4 had
one.

**A17 — Hidden stray `Tab` instance beside the real `Tabs`** (`0:246`). This
dead layer has now appeared in **all five Sections**.

**A18 — Hidden leftover "Regular" label inside the *Priority* fee option**
(`0:329`), duplicating the Regular option's own label.

**A19 — Two button rows, one hidden.** `Frame 456` is hidden on screens 5 and 6
(`0:297`, `0:305`) while a duplicate visible button is supplied by
`Frame 464` → `Frame 456` (`0:310`).

**A20 — Hidden `Frame 466`** — the review breakdown — on two of the three
`success03` screens (`0:304`, `0:279`), visible only on the review (`0:270`).

**A21 — Hidden `OTP Keyboard - iPhone`** on the review screen (`0:307`).

**A22 — Screen height 878 on `1266:14397`** — 66px above the 812 standard, to
seat the keyboard at y=601. Flow 4's equivalent screen kept 812 with the keyboard
at y=535. Two different ways of fitting the same component.

## B. Detached instances — triaged

**B1 — `Bottom Sheet` on the Network Fee screen (`0:298`, and its inner
`0:300`) → detached copy. High confidence.** `<frame>` here; `<instance>` in
Academy (`0:514`, `0:294`) and on this Section's own screens 1 and 2 (`0:49`,
`0:257`) at the same 375×812. Detached to be resized to 422 and refilled — the
same pattern as Flow 3 B4.

**B2 — The two fee options (`0:309`, `0:323`) → detached copies of `Field`.
High confidence.** Both are `<frame>`s named `Field`; Academy01 carries a
`Field` **instance** (`0:328`) at 343 wide. The DS ships a `Field` component
(present in its public API). Detached to compose a label/duration/price row with
a `Code parts / <RadioIcon>` instance inside.

**B3 — `Item/list` is fully instanced again** (`0:194`–`0:230`, `0:124`–`0:180`)
— as in Flow 4, and unlike Flow 3. **Third data point for the standing note that
the detach habit is selective**, and the strongest yet: the same component is
instanced in two consecutive Sections and detached throughout a third.

**Properly instanced throughout** — `Status Bar`, `header`, `Tabs`, `Tab`,
`Input`, `Item/list`, `button`, `Blanket`, `Header`, `<Transfer amount>`,
`<divider 1px>`, `Code parts / <RadioIcon>`, `Navbar/home indicator`,
`navbar/mobile/section`, `Bottom Sheet` (screens 1–2), `OTP Keyboard - iPhone`.

## C. Non-screen content

**None.** All six Section children are screens. No spec or property-template
frames, and **no `{...}` placeholders leaked into any screen.**

## D. Cross-flow state — carry-over 1

**P1 is NOT resolved by this Section.** This is the crypto-transfer flow, not
goals/savings. Academy's "3 of 6 completed" writer remains unlocated —
**P1 stays OPEN.**

**D1 — Confirms and extends P3's decision.** A completed crypto transfer
decrements a **per-token holding** and the wallet total, both read by Flow 1's
`Homepage_Crypto` and by Flow 3's Assistant03 (allocation) and Assistant05
(token list). So the app-level accounts state decided at P3 must cover **crypto
holdings per token — quantity *and* fiat value — not just fiat account
balances.** That is a shape requirement, not a scope change.

> **CONFIRMED (Teku).** App-level accounts state must model **per-token holdings
> — quantity *and* fiat value** — alongside fiat account balances. A crypto
> transfer decrements both the token quantity and the derived wallet total.
>
> **Shape requirement only. Still Context, still not a §2.4 flip.** Widening
> what the accounts provider holds does not change how it is provided. The
> provider table under P3 is unchanged; only the type of what sits inside it
> grows. Recorded because this is the third amendment in a row and the
> cumulative reading matters: **none of them moved the state layer toward a
> library.**

**D2 — The longest flow-scoped chain in the inventory: five steps.** recipient →
token → amount → fee tier → review. Flow 4's was three.

**Still comfortably inside §2.4's second trigger**, which set roughly six steps
with back-navigation and branching as the point where a store's ergonomics start
to earn their keep. Five linear steps with no branching does not reach it —
but this is the closest any flow has come, and it is worth noting that the next
transactional flow could.

> **CONFIRMED (Teku): remains within §2.4's threshold.** Five steps —
> recipient → token → amount → fee → review — **linear, no branching, no
> back-navigation complexity.** §2.4's second trigger required roughly six steps
> *with* branching and preserved partial input on back-nav; a straight chain of
> five does not reach it.
>
> Recorded as the high-water mark. If a later flow adds branching to a chain
> this long, re-read §2.4 before building it.

## E. Chrome model — carry-over 2

| Section | Bottom nav | Steward FAB | Home indicator |
|---|---|---|---|
| Homepage | **Visible** | Visible | Inside `navbar/mobile/section` |
| Monarch Academy | **Hidden** | Visible | Internal on 02; external Section sibling for 01 |
| Monarch Assistant | Present on all five — visible on 01, occluded by `Blanket` on 02–05 | Visible on all five | Separate 343-wide instance inside each sheet |
| Homepage_bank transfer | Hidden on 3 of 4; repurposed as a 2-item segmented control on the picker | **ABSENT on all four** | Separate 375-wide instance @ y=787 on screens 2–4 |
| **Homepage_transfer_Crypto** | Hidden on 4 of 6; **repurposed as the same 2-item "Recipients / Scan QR" control** on `…success01` | **ABSENT on all six** | 375-wide on screens 1–4; 343-wide inside the fee sheet |

**This is a REPEAT of Flow 4's model, not a fifth.** Five Sections, four distinct
chrome treatments. The two transactional flows agree with each other exactly —
no Steward FAB, navbar hidden or repurposed — which is the first sign that the
chrome variation is rule-governed rather than incidental. **Strengthens P2 but
does not close it.**

## F. Colour hazard register — carry-over 3

**No new entries. F-numbering stands at F1–F4.**

**The Flow 4 pattern repeats, and more strongly.** All token identity in this
Section comes from **logos, not categorical colour** — Bitcoin, Ethereum,
Tether, Stellar and Uniswap. Every one of those is already in the DS's
`LogoName` union (`bitcoin`, `ethereum`, `tether`, `stellar`, `uniswap`, plus
`solana`, `litecoin`, `polygon`, `binance_coin`, `general`), verified in the
Flow 2 B3 resolution.

**Two consecutive Sections have now introduced zero colour hazard**, because
identity is carried by a component rather than a value. That is the pattern
F1–F4 should be pushed toward.

## G. Data figures — carry-over 4

**Reconciles ✓ — the amount-entry screen is internally sound:**
- ETH after transfer: 1.3786 − 0.313 = **1.0656** ✓ exactly as shown
- Wallet after: 102,354.02 − 5,800.00 = **96,554.02** ✓ exactly as shown
- ETH value after: 25,588.51 − 5,800.00 = 19,788.51 ≈ "RM 19,788" ✓
- Token figures agree with Flow 1's Homepage_Crypto to the decimal — Bitcoin
  RM 46,059.31 / 0.098279 BTC, Ethereum RM 25,588.51 / 1.3786 ETH ✓

**Does not reconcile ✗ — the review screen contradicts the fee sheet and itself:**
- **Network fee RM 4.50** on review versus **RM 4.60** for the *selected*
  Regular tier on the fee sheet
- **Total "0.317 Eth"** versus 0.313 + 0.0003 = **0.3133**
- **New balance RM 96,553.20** versus 102,354.02 − 5,804.50 = **96,549.52**
  (off by RM 3.68)
- **Eth balance "1.0642Eth"** versus 1.3786 − 0.317 = **1.0616**
- **The five listed tokens sum to RM 97,236.32** against a stated wallet total
  of **RM 102,354.02** — short by **RM 5,117.70**
- **Stellar and Uniswap are both exactly RM 5,117.70** — and that duplicated
  value is precisely the shortfall above, which suggests one of them was
  copy-pasted over a sixth holding

**Three different crypto totals now exist across the inventory:**

| Value | Source |
|---|---|
| RM 97,236.32 | Flow 5 — sum of the five listed tokens |
| RM 102,354.02 | Flow 1 Homepage_Crypto, and Flow 5's own arithmetic |
| RM 107,354 | Flow 3 Assistant03 "Crypto Wallets" (A20 there) |

**RM 102,354.02 is the defensible source of truth** — it is the only one the
transfer arithmetic reconciles against, and it appears in two independent
Sections. The other two should be *derived*, per the standing note. This is the
clearest illustration yet of why: three hand-authored totals for one quantity,
each wrong in a different direction.

> **DECIDED (Teku): RM 102,354.02 is authoritative.** 97,236.32 and 107,354 are
> contradictions to be **derived away, not reproduced**. Promoted to the worked
> example under the standing note "data contradictions get COMPUTED, not
> copied" at the top of this document.

---

# Flow 6 — `Homepage_transfer_Ai Alert`

**Section node:** `1266:14356`
**Section URL:** `https://www.figma.com/design/v9MI8jxTaXiJA234Hkanlf/casestudy_02?node-id=1266-14356`

## 1. What it accomplishes

Adding a brand-new bank recipient and transferring to them, where Monarch's AI
flags the destination as high-risk. The alert **warns without blocking** —
the user can cancel or proceed — and a second overlay explains how the detection
works if they tap the explainer link.

## 2. Screens contained

Seven, all `<instance>` nodes, all 375 × 812, none clipping.

**These screens were already well-named** — every name describes its content.
No rename annotation needed.

| Figma name | Node | What it is |
|---|---|---|
| `…_New transfer_transfer type` | `1266:14385` | "New Transfer / Select Transfer Type" — 7 identifier options |
| `…_New transfer_Select bank` | `1266:14386` | "Select recipient bank" — A–Z indexed bank list |
| `…_New transfer_Enter recipient details` | `1266:14387` | 7-field recipient form |
| `…_Confirm transfer details` | `1266:14388` | "Send money" — From/To/amount, keypad |
| `…_HighRiskTransfer01` | `1266:14382` | **Warning modal** — risk detail, Cancel / Proceed Anyway |
| `…_HighRiskTransfer01_Education` | `1266:14383` | **Education overlay** — "Smart Fraud Protection" |
| `…_HighRiskTransfer02` | `1266:14384` | **Second confirmation** — "do you still want to continue?" |

**Layout note:** `…_Education` sits at x=1669 y=954 — directly *below*
`…_HighRiskTransfer01` at the same x, not beside it. The Section uses a second
row to express "overlay state of the screen above", the only Section to do so.

## 3. Navigation order

**No wired prototype links verified** — no reaction data in the metadata
surface, no prototype pull made.

**Inferred:**

1. `…_transfer type` → pick an identifier (Account Number)
2. → `…_Select bank` → pick a bank (Affin Bank)
3. → `…_Enter recipient details` → fill 7 fields, **Next**
4. → `…_Confirm transfer details` → enter RM 10,000.00, **Transfer money**
5. → `…_HighRiskTransfer01` — warning modal fires. **Cancel Transfer** exits;
   **Proceed Anyway** continues
6. `…_HighRiskTransfer01_Education` is a **branch off step 5**, not a successor —
   opened by "How does Monarch detect this ?", dismissed with **Got it**,
   returning to step 5
7. `…_HighRiskTransfer02` ← **Proceed Anyway** from step 5. Second confirmation;
   **Cancel Transfer** / **Proceed Anyway** again
8. → **MISSING** — no success screen, consistent with GD1

**This is the first flow in the inventory with genuine branching** — a
two-stage confirmation plus a dismissable side overlay.

## A. Figma source inconsistencies — recorded, not corrected

**A1 — AI-generated asset filename as a layer name.** `0:191` is named
`ChatGPT Image Jan 4, 2026, 01_29_35 AM 2`. Same class as Flow 1's vecteezy URL
(A11) but more revealing — it will become a filename verbatim unless renamed.

**A2 — The explainer link is a raw `text` node, not a `Link` instance.** On both
modal screens the `❖ Link` instance is **hidden** (`0:186`, `0:251`) and the
visible element is plain text (`0:187` "How does Monarch detect this ?",
`0:252` "Monarch alerts you, but you decide what happens"). Same pattern as
Flow 1 A4 — but here it matters more, because **the hidden-instance element is
the flow's only branch trigger.**

**A3 — The hidden `❖ Link` sits at x = −42.5** on both screens — negative offset
*and* a half-pixel.

**A4 — TYPO: "How does Monarch detect this ?"** — space before the question mark.

**A5 — GRAMMAR: "Make decision without your approval"** — should be "decisions"
(`0:249`).

**A6 — "Why You're seeing this alert"** — mid-sentence capital on "You're"
(`0:198`).

**A7 — Flow 3's orphaned copy has found its home.** The string *"This transfer
looks unusual based on patterns linked to common scams, especially with new or
inactive accounts."* is the **visible body copy of the education overlay**
(`0:199`). It was logged in Flow 3 A9 as fraud-scenario copy left *hidden* in the
Assistant's welcome sheet. **Flow 3 A9 is now explained: it was pasted from
here.** The Flow 3 occurrence remains a defect; this is its origin.

**A8 — `Modal` wraps a frame named `Bottom Sheet` that is not one.** On all
three modal screens (`0:161`, `0:180`, `0:164`) the inner frame is inset at
x=16 with a width of 343 — a centred dialog card, not a full-width bottom sheet.
Every other Section's `Bottom Sheet` is 375 wide and edge-anchored. Another
name/behaviour divergence.

**A9 — A different header component inside the modals.** `<header>` (`0:162`,
`0:181`, `0:165`) — lowercase, angle-bracketed — where every other Section uses
`Header`. Two distinct components.

**A10 — Modal heights all differ** — 664 (`HighRisk01`), 770 (`Education`), 580
(`HighRisk02`), at y-offsets 66, 21 and 108. No shared snap points, same as
Flow 5 A7.

**A11 — `<divider 1px>` is 5px again**, and once at
`5.000000000000014` (`0:225`).

**A12 — `icon object` at a fourth size — 16×16** (`0:206`, `0:213`, `0:220`,
`0:231`, `0:238`, `0:245`). The register is now 56 (FAB), 40 (Academy card),
32 (Assistant row), 16 (here).

**A13 — Bank code inconsistent between screens.** `…_Confirm transfer details`
shows "6451352078 • **AFFIN**"; all three modal screens show "6451352078 •
**AFFIN 003**".

**A14 — Bank-list capitalization.** "Bank **Of** America", "Bank **Of** China"
(capital "Of"), and "AL-RaJhi Banking & Investment Corp" — the real institution
is *Al Rajhi*.

**A15 — Identifier-list capitalization.** "Business **r**egistration Number"
against "Account Number", "Mobile Number", "IC Number".

**A16 — Spaces inside parentheses** — "Other Payment Details **( Optional )**",
and "How does Monarch detect this ?" above.

**A17 — Hidden second button on the Education overlay** (`0:256`) positioned at
y=80 inside an 88-tall frame — it would overflow if shown. The other two modals
show two buttons; this one shows one.

**A18 — Hidden `Frame 326`** (`0:150`, `0:169`, `0:153`) beneath the visible
`Frame 458` on all three modal screens — a superseded amount row.

**A19 — Content overlaps its container on `HighRiskTransfer02`.** `Frame 294`
(`0:179`) sits at y=56 inside `Frame 291` (`0:178`), which starts at y=136 in a
364-tall `Content` — the recipient block renders below the question text with no
managed spacing between them.

## B. Detached instances — triaged

**B1 — `Modal` (`0:159`, `0:178`, `0:162`) → detached copy of the DS `Modal`.
Moderate confidence.** All three are `<frame>`s named `Modal`, each containing a
`Blanket` **instance**. The DS ships both `Modal` and `Blanket` in its public
API (verified in the Flow 2 B3 consumer read). Confidence is moderate rather
than high because **no `Modal` instance exists anywhere in the six Sections
walked**, so there is no same-file counterpart to compare against — the strongest
evidence type used elsewhere in this inventory is unavailable here.

**B2 — `Text area` (`0:179`, `0:201`) → detached copy of the DS `TextArea`.
Moderate confidence.** `<frame>`s named `Text area`, used as bordered content
containers rather than editable inputs. The DS ships `TextArea`. Same caveat as
B1: no instance counterpart in the file walked so far, and **the standing note
warns that names are unreliable** — the rendered use here is a read-only detail
box, which is not what a `TextArea` primitive does. **Flagging rather than
asserting; worth confirming at 5.3.**

**B3 — `Bottom Sheet` inside each `Modal` → detached.** `<frame>` at 343 wide
(A8); `<instance>` at 375 wide elsewhere in the same Section (`0:194`, `0:258`,
hidden). Consistent with the now-settled selective-detach note.

**Properly instanced throughout** — `Status Bar`, `header`, `<header>`,
`Blanket`, `Select`, `<Transfer amount>`, `<divider 1px>`, `<element>`,
`icon object`, `button`, `❖ Link` (hidden), `Navbar/home indicator`,
`navbar/mobile/section`, `Bottom Sheet` (the hidden 375-wide ones).

## C. Non-screen content

**None.** All seven Section children are screens. No spec or property-template
frames, and **no `{...}` placeholders leaked into any screen.**

## D. Cross-flow state — carry-over 1

**P1 is NOT resolved by this Section.** Not the goals/savings flow, and **nothing
here writes progress read elsewhere.** See the provisional closure of P1 in the
pending-checks section above — six Sections walked, no writer found.

**D1 — Same writer as Flows 4 and 5, already covered by P3.** A completed
transfer decrements Main Account. Nothing new architecturally.

**D2 — A new recipient is created here, and that is a second writer.** The
`…_Enter recipient details` form produces a recipient (Gunther Cenperk,
6451352078, Affin Bank) that then appears as the transfer target. Whether a
newly-added recipient should persist into the **"Recent recipients" list read by
Flow 4** is undecided — the Figma does not show Gunther in Flow 4's list.

**Recorded, not decided.** If recipients persist, they join accounts as
app-level state; if the demo treats each run as fresh, the recipient list stays
seeded mock data. **Lower stakes than P3** — either way it is Context, and
either way the §2.6 named-hook discipline contains the change.

**D3 — The longest branching chain in the inventory.** Seven screens with a
two-stage confirmation and a dismissable side overlay. Flow-scoped state:
identifier type → bank → recipient details → amount → risk-acknowledgement.

**Five steps with branching.** Flow 5 was five steps *linear*; this adds
branching, which is the second half of §2.4's trigger 2. **It still does not
fire** — trigger 2 needed roughly six steps *and* branching *and* preserved
partial input across back-navigation, and the branch here is a dismissable
overlay that discards nothing. **But this is now the high-water mark, and it is
close enough that the next transactional flow should be measured against §2.4
before it is built.**

## E. Chrome model — carry-over 2

| Section | Bottom nav | Steward FAB | Home indicator |
|---|---|---|---|
| Homepage | **Visible** | Visible | Inside `navbar/mobile/section` |
| Monarch Academy | **Hidden** | Visible | Internal on 02; external Section sibling for 01 |
| Monarch Assistant | Present on all five — occluded by `Blanket` on 02–05 | Visible on all five | 343-wide instance inside each sheet |
| Homepage_bank transfer | Hidden on 3 of 4; repurposed as a 2-item segmented control | **ABSENT** | 375-wide @ y=787 |
| Homepage_transfer_Crypto | Hidden on 4 of 6; same 2-item repurpose | **ABSENT** | 375-wide; 343-wide inside the fee sheet |
| **Homepage_transfer_Ai Alert** | **Hidden on all seven** (`0:193`, `0:257`, and equivalents) | **ABSENT on all seven** | 375-wide @ y=787 on all seven |

**Repeats the transactional model — no fifth model.** Six Sections, four
distinct treatments. **Three consecutive transactional Sections now agree
exactly**: navbar hidden, no Steward FAB, 375-wide home indicator.

> **NOTE (Teku, 2026-08-04): P2 STRENGTHENS BUT STAYS OPEN.**
>
> Record as a **strong provisional rule**: *transactional flows suppress app
> chrome — no Steward FAB, navbar hidden or repurposed as the 2-item
> "Recipients / Scan QR" control.* Three consecutive transactional Sections
> agree exactly, which is good evidence.
>
> **It is not settled.** The file has more than six Sections, and any later
> transactional Section that contradicts this collapses the rule. Do not encode
> it as an app-shell behaviour until the inventory is exhausted.

> ## ⚠️ P2 HAS NOW BEEN FALSIFIED ONCE. Recorded plainly.
>
> **Formulation history:**
>
> | # | Formulation | Fate |
> |---|---|---|
> | 1 | *Transactional flows suppress app chrome* | Superseded by Flow 7 — a non-transactional drill-down also suppressed it |
> | 2 | *Root/tab-level screens show chrome; drill-downs and transactional flows suppress it* (hierarchy-based) | ❌ **FALSIFIED by Flow 8** |
> | 3 | *Overlay-open governs*, with Assistant the present-but-occluded exception | **CURRENT — provisional** |
>
> **What falsified formulation 2:** Flow 8's `Finance_Transaction02`
> (`1266:14329`) is a **tab-level screen** — the same Transactions tab, one
> interaction later — and it **suppresses chrome** (`navbar/mobile/section`
> `0:636` hidden, no FAB). Hierarchy position is therefore **not** the
> governing variable.
>
> **Current best formulation, provisional:**
>
> > Chrome is shown on root/tab-level screens with no overlay open. It is
> > suppressed on drill-downs, throughout transactional flows, and **whenever an
> > overlay is open** — with the **Assistant Section the sole exception**,
> > keeping the navbar present-but-occluded behind its `Blanket`.
>
> **⛔ DO NOT PROMOTE P2 AGAIN BEFORE THE FILE IS EXHAUSTED — regardless of how
> many Sections conform.** A rule that has already been falsified once earns no
> credit from further confirmations; only an exhaustive pass can close it.
> Conforming Sections are recorded, not treated as evidence of settlement.

---

# ✅ P2 — RESOLVED by design intent (Teku, 2026-08-04)

**Resolved by the designer stating the rule, not by inference from observation.**
All three prior formulations are superseded and retained above as history.

**The reason observation kept failing: every formulation assumed the nav has TWO
states. It has THREE.**

## The rule

**The bottom nav is PAGE-level chrome. One nav item = one page — Home, Transfer,
Finance, More. It belongs to the page, not to individual screens.**

| State | When | Mechanism |
|---|---|---|
| **1. PRESENT** | Root / tab-level pages | The page owns a nav item; the nav is shown and usable |
| **2. SUPPRESSED** | (a) Anything overlaid covers it — bottom sheets, modals, the Steward sheet. (b) Full-page drill-downs (Monarch Academy; Finance → Overview → account detail) | **Reason for (b) is a LAYOUT CONFLICT, not hierarchy** — those screens carry primary/secondary action buttons at the bottom, occupying the nav's position |
| **3. REPURPOSED** | The nav **slot** is reused as a functional control rather than hidden | Confirmed: the transfer flows' select-recipient screen holds a 2-item **Recipients / Scan QR** control, while the page's own **Bank / Crypto** tabs sit at the top |

**Flow 4's inventory recorded the repurpose and filed it as a curiosity (A7). It
is in fact the third state — and it is precisely what kept falsifying the
two-state formulations.**

## The insight that dissolves the Flow 3 / Flow 9 "anomaly"

**SUPPRESSED is a user-facing state, not a layer-visibility state.** A navbar
*hidden* and a navbar *visible but covered by a `Blanket`* are **the same state**
— in both cases the nav is unavailable to the user. The inventory had been
treating them as different because the metadata distinguishes them.

**That was an artifact of reading layer flags instead of reading the interface.**
Flows 3 and 9 were never exceptions.

## Supersedes an earlier MVP decision

This **supersedes "MVP hides chrome under any overlay, uniformly"** — correct
for overlays, **incomplete overall**, because it has no account of the
REPURPOSED state.

---

# P2 re-walk — all nine inventoried Sections re-classified

Every screen, classified PRESENT / SUPPRESSED / REPURPOSED under the resolved
rule.

| Flow | Screen | Node | State | Basis |
|---|---|---|---|---|
| 1 | `Homepage_Fiat` | `1266:14402` | **PRESENT** | Tab-level page, no overlay |
| 1 | `Homepage_Crypto` | `1266:14403` | **PRESENT** | Tab-level page (`0:491` visible; `0:485` is a hidden duplicate leftover) |
| 2 | `Monarch Academy01` | `1266:14274` | **SUPPRESSED** | Full-page drill-down — ⚠️ see N1 |
| 2 | `Monarch Academy02` | `1266:14275` | **SUPPRESSED** | Full-page drill-down — ⚠️ see N1 |
| 3 | `Monarch_Assistant01` | `1266:14408` | **PRESENT** | Entry state, no sheet open |
| 3 | `Monarch_Assistant02–05` | `…09/10/11/12` | **SUPPRESSED** | Steward sheet + `Blanket` covers it. Layer visible ≠ state present |
| 4 | `Homepage_Fiat` | `1266:14390` | **SUPPRESSED** | Transfer action sheet overlaid |
| 4 | `…_fiat_Select recipient` | `1266:14391` | **REPURPOSED** | 2-item Recipients / Scan QR in the nav slot; Bank/Crypto tabs at top |
| 4 | `…_fiat_enter amount` | `1266:14392` | **SUPPRESSED** | Keypad + bottom action button |
| 4 | `…_fiat_view/change origin account` | `1266:14393` | **SUPPRESSED** | Dropdown + keyboard + bottom button |
| 5 | `Homepage_Crypto` | `1266:14400` | **SUPPRESSED** | Transfer action sheet overlaid |
| 5 | `…_Crypto_Select recipient` | `1266:14395` | **REPURPOSED** | Same 2-item control (`0:258`) — confirms it is systematic, not one-off |
| 5 | `…_Crypto_select token` | `1266:14396` | **SUPPRESSED** | Bottom **Next** button occupies the slot |
| 5 | `…_Crypto_confirm transfer detail` | `1266:14397` | **SUPPRESSED** | Keypad + bottom button |
| 5 | `…_Crypto_adjust gas fee` | `1266:14399` | **SUPPRESSED** | Network Fee sheet overlaid |
| 5 | `…_Crypto_confirm details with gas fee` | `1266:14398` | **SUPPRESSED** | Bottom button |
| 6 | all seven screens | `1266:14382–14388` | **SUPPRESSED** ×7 | Four form pages with bottom buttons; three modal overlays |
| 7 | `Finance_Overview01` | `1266:14331` | **PRESENT** | Tab-level page |
| 7 | `Finance_Overview02` | `1266:14332` | **SUPPRESSED** | Drill-down with **Set Maturity Reminder / Download Statement** at the bottom — the stated layout-conflict reason holds **exactly** |
| 8 | `Finance_Transaction01` | `1266:14328` | **PRESENT** | Tab-level page |
| 8 | `Finance_Transaction02` | `1266:14329` | **SUPPRESSED** | Filter sheet overlaid |
| 9 | `…_Transaction details` | `1266:14278` | **SUPPRESSED** | Sheet + `Blanket` (`0:493` visible but covered) |
| 9 | `…_add receipt` | `1266:14281` | **SUPPRESSED** | Action sheet overlaid |
| 9 | `…_Camera` | `1266:14282` | **SUPPRESSED** | ⚠️ see N2 |
| 9 | `…_Receipt added` | `1266:14279` | **SUPPRESSED** | Sheet overlaid |
| 9 | `Finance_Receipts` | `1266:14283` | **PRESENT** | Tab-level page |
| 9 | `…_View receipt` | `1266:14285` | **SUPPRESSED** | Overlay |
| 9 | `Finance_Add Receipts` | `1266:14284` | **SUPPRESSED** | Modal overlaid (nav layer visible but covered) |

**Result: 28 screens, zero classification failures. Every screen fits one of the
three states.**

## Screens that do not fit *cleanly* — two rationale nuances, no breaks

**N1 — Monarch Academy is SUPPRESSED, but the stated REASON does not apply.**
The rule attributes drill-down suppression to a layout conflict: *"those screens
carry primary/secondary action buttons at the bottom."* **Neither Academy screen
has bottom action buttons.** Academy01 ends in category card grids, Academy02 in
a Quick Wins list. The classification is right; the rationale is not what drives
it there.

Either drill-downs suppress the nav for a second reason (full-page takeover in
its own right), or Academy is suppressed by convention rather than necessity.
**Recorded, not resolved — it does not change the classification.**

> ## ✅ N1 — CLOSED (Teku, 2026-08-05). A scope clarification, not a defect.
>
> **The app shell will take chrome state as EXPLICIT PER-ROUTE CONFIG** —
> `present` / `suppressed` / `repurposed` — **not derive it from screen
> structure.**
>
> That makes the rationale gap **immaterial to implementation.** Nothing in the
> code ever needs to ask *"does this screen have bottom action buttons?"*; the
> route declares its chrome state and the shell obeys.
>
> **The classification stands; the "why" is authoring intent and does not need
> to be derivable.** Both nuance cases — Monarch Academy (Flow 2) and the Budget
> drilldown (Flow 10 E) — are simply routes configured `suppressed`.
>
> **N2 (`Camera`, full-screen takeover) closes on the same terms** — another
> route configured `suppressed`, whatever the mechanism that motivated it.
>
> **Consequence worth noting:** this also removes any need to settle *why*
> Assistant keeps its navbar layer visible under the `Blanket` while other
> Sections hide it. Both are `suppressed` routes; the layer-flag difference is
> Figma authoring noise with no code meaning.

**N2 — `Camera` is SUPPRESSED by a mechanism the rule does not name.** It is
neither an overlay over a page nor a drill-down with bottom buttons — it is a
**full-screen capture takeover** with its own `← Add receipt` header and a
shutter control. It clearly belongs in SUPPRESSED, but via a third mechanism.

**Caveat:** this classification is from the render only — `1266:14282`'s
metadata was not pulled.

**Neither nuance is a fourth state.** Both are SUPPRESSED screens whose *reason*
sits outside the two named mechanisms. Flagged because the instruction asked,
and because if the app shell ever encodes *why* rather than *what*, these two
are where the rationale runs out.

## F. Colour hazard register — carry-over 3

**F5 — NEW, but a different and lower-risk kind.** This Section introduces
**semantic risk colour**, not categorical identity colour:

- A filled red warning banner ("Warning / High-Risk Transfer")
- Red body emphasis ("New Account with low activity. Possible Scam.", "flagged
  high-risk transfer")
- The recipient's **name rendered in red** on `HighRiskTransfer02`
- Paired affirmative/negative icons — blue checkboxes for "What Monarch Checks",
  red crosses for "What Monarch does NOT do"

**Unlike F1–F4 this should map cleanly to existing DS semantic tokens**
(danger/critical text and surface roles), because it encodes *meaning* rather
than identity. It is a rule-2 item to verify at 5.3, not a token-gap candidate.

**The Flow 4/5 logo pattern does not repeat here** — the bank list is plain
text with no logos at all, so no identity colour is introduced either way.

## G. Data figures — carry-over 4

**Reconciles ✓**
- RM 27,978.59 − RM 10,000.00 = **RM 17,978.59**, exactly as drawn
- Source balance RM 27,978.59 agrees with Flows 1, 3 and 4
- Recipient account 6451352078 + Affin Bank on the form matches "6451352078 •
  AFFIN" on the confirm screen ✓
- The risk detail is internally coherent — "Account opened 10 days ago" / "Only
  2 transactions recorded" supports "New Account with low activity"

**Does not reconcile ✗**
- **"AFFIN" vs "AFFIN 003"** for the same account across screens (A13)

**Notable:** this is the **cleanest Section in the inventory for data**. One
figure, correctly derived, consistent with every other Section. A useful
contrast with Flow 5.

## H. Screen names vs content — carry-over 5

**All seven names accurately describe their screens.** `transfer type`,
`Select bank`, `Enter recipient details`, `Confirm transfer details`,
`HighRiskTransfer01`, `HighRiskTransfer01_Education`, `HighRiskTransfer02` — each
matches what it renders.

**This is the first Section requiring no naming correction**, and it is the
naming convention Flows 4 and 5 were renamed *into*. Worth recording as the
house style.

## Sections remaining — CORRECTED 2026-08-04

> ⚠️ **THE SPECULATION BELOW WAS WRONG. Teku confirmed the file has MORE than
> six Sections, and Flow 7 (`Finance_Overview`, `1266:14330`) was found
> immediately afterwards at x −4903 — continuing the same y −1451 row, to the
> right of Ai Alert.**
>
> **The node-ID-range argument was the faulty part.** `Finance_Overview` is
> `1266:14330`, which sits *inside* the `14273`–`14418` range I called
> potentially complete — the range was never evidence of completeness, because
> Section IDs interleave with their own children's IDs. It was labelled a weak
> signal; it was in fact no signal at all. **Disregard it.**
>
> A whole-page render (`0:1`, 18207 × 15372) also showed the canvas holds
> substantial **non-flow case-study material** — slide decks, research, personas,
> a pain-point matrix, a layout-grid cheatsheet, a colour reference panel. That
> material is not flow Sections, but it means canvas size cannot be used to
> estimate Section count either.
>
> **The inventory is INCOMPLETE and continues Section by Section until the file
> is exhausted.** The original text is kept below as the record of what was
> claimed.

**Six Sections have been inventoried. I cannot prove that is all of them.**

What is verified: the document has exactly **one page** (`0:1`, "Page 1"), and
these six Sections live on it:

| Section | Node | Canvas position |
|---|---|---|
| Homepage | `1266:14401` | x −15723, y −1451 |
| Monarch Academy | `1266:14273` | x −14541, y −1451 |
| Monarch Assistant | `1266:14407` | x −13467, y −1451 |
| Homepage_bank transfer | `1266:14389` | x −10574, y −1451 |
| Homepage_transfer_Ai Alert | `1266:14356` | x −8196, y −1451 |
| Homepage_transfer_Crypto | `1266:14394` | x −10574, **y 716** |

Five occupy one row at y −1451 spanning x −15723 → −5692; one sits on a second
row at y 716.

**Why I cannot enumerate the rest:** `get_metadata` on a page returns the full
depth-first XML of the entire subtree. For this file that is every Section, every
screen and every child node — it would be truncated long before reaching any
later Section, so it cannot answer the question reliably.

**Weak signal, labelled as such:** every Section node ID falls in
`1266:14273`–`1266:14418`, and the highest ID seen anywhere is `1266:14418`.
If the Sections were created in one batch, that range is complete. Figma does
not guarantee contiguous or ordered IDs, and a Section added later would carry a
higher ID — **so this is suggestive, not proof.**

**The cheap answer is Teku's layers panel**, which shows the Section count at a
glance. If the answer is six, the inventory is complete and P1's provisional
closure becomes final.

---

# Flow 7 — `Finance_Overview`

**Section node:** `1266:14330`
**Section URL:** `https://www.figma.com/design/v9MI8jxTaXiJA234Hkanlf/casestudy_02?node-id=1266-14330`
**Entry point (per Teku):** the **3rd item of the bottom navigation**.

## 1. What it accomplishes

The Finance tab — a net-worth headline with a trend chart over a grid of balance
cards, where tapping a card drills into a full-page detail view for that
holding.

## 2. Screens contained

Two, both `<instance>` nodes, both 375 × 812, neither clipping.

| Figma name | Node | What it is |
|---|---|---|
| `Finance_Overview01` | `1266:14331` | **"Finance"** — Overview tab: Total Networth + trend chart + 8 balance cards |
| `Finance_Overview02` | `1266:14332` | **"Bank Account / Fixed deposit"** — drill-down detail for one holding |

## 3. Navigation order

**No wired prototype links verified** — no reaction data in the metadata
surface, no prototype pull made.

**Inferred:** `Finance_Overview01` → tap a `card/balance` → `Finance_Overview02`.
Back via the `←` in the detail header.

**Only one drill-down exists** for eight balance cards. The Fixed Deposit detail
is the single worked example; the other seven destinations are undesigned.

## A. Figma source inconsistencies — recorded, not corrected

**A1 — "Total Networth"** should be "Net Worth" (or "Net worth"). "Networth" is
not a word.

**A2 — Four tabs, one screen.** The tab bar reads **Overview · Transactions ·
Budget · Plans**; only Overview has a screen in this Section. Same shape as
Flow 1 A1 (Cards/Stocks), which Teku resolved there as "coming soon". **See D2 —
"Plans" is a live lead for P1.**

**A3 — Screen name misdescribes content.** `Finance_Overview02` is not an
overview — it is a **detail drill-down** for a single holding. Mild, but it is
the naming pattern Flows 4 and 5 were renamed away from.

**A4 — Crypto-flow copy pasted into a fixed-deposit detail view.** All three
label/value rows carry hidden leftovers: **"Marg's Wallet"** (`0:114`, `0:124`,
`0:134`), **"3 Sept, 18:50"** (`0:117`, `0:127`, `0:137`) and **"1.3786 ETH"**
(`0:118`, `0:128`, `0:138`). Nine hidden nodes belonging to Flow 5's Ethereum
screens. Same class as Flow 3 A10 and Flow 6 A7.

**A5 — `header` height 68 on the detail screen** (`0:65`), making `Frame 451`
112. Matches Flow 5's `…select token` variant, not the 48/92 used elsewhere.

**A6 — 4px header/content overlap again** — `Frame 455` starts at y=108 beneath
a 112-tall `Frame 451`.

**A7 — `card/data display` is 165.5 wide** (`0:91`, `0:95`, `0:99`, `0:103`) —
a half-pixel, ×4.

**A8 — `<divider 1px>` is 5px** (`0:85`). Now recorded in four Sections.

**A9 — Floating-point junk in the chart geometry.** `Line 6` (`0:258`) has width
`0.000006119594218034763`; `Vector 2` (`0:257`) is `175.99990844726562` wide.

**A10 — Suspicious chart line positions.** `Line 7` (`0:254`) and `Line 8`
(`0:255`) are both placed at **x = 343 with width 343**, which puts them
entirely outside the 343-wide plot area unless a transform is applied. Recorded
as-is.

**A11 — Hidden stray `Tab` instance** (`0:213`) beside the real `Tabs`. Now in
**all seven Sections**.

**A12 — Hidden `See all` raw text** (`0:269`) superseded by a `❖ Link` instance
(`0:270`). Same as Flow 1 A7.

**A13 — Duplicate nested layer names** — `Frame 284` inside `Frame 284`
(`0:226`→`0:227`); `Frame 292` inside `Frame 292`; `Frame 293` naming both a
value column and a hidden row.

**A14 — Several hidden orphan frames** — `Frame 285` twice (`0:241`, `0:243`),
`Frame 295` (`0:260`), `Frame 289` (`0:234`), `Frame` (`0:240`), `Line 11`
(`0:108`), `Frame 293` (`0:139`).

## B. Detached instances — triaged

**NONE. This is the first Section in the inventory with zero detached
instances.**

Every component node on both screens is a proper `<instance>`: `Header`,
`Status Bar`, `header`, `Tabs`, `Tab`, `Label`, `❖ Link`, `card/balance` (×8),
`card/data display` (×4), `<element>`, `<divider 1px>`, `button` (×2),
`navbar/mobile/section`, `Navbar/home indicator`, `Bottom Sheet`, `icon object`.

**Further reinforces the settled selective-detach note.** Seven Sections now:
Flow 3 detaches heavily, Flows 4/5/6 detach selectively, Flow 7 not at all. The
variable is the screen's authoring need, not the file's health.

The trend chart is **raw vectors, lines and an ellipse** — not a component and
not a detach question. See G1.

## C. Non-screen content

**None** — both Section children are screens.

**But a placeholder HAS leaked into a live screen, and it is a visible one:**

**C1 — The bottom navigation's first item reads "Label".** On
`Finance_Overview01` the nav renders **Label · Transfer · Finance · More**,
where Flow 1's Homepage renders **Home · Transfer · Finance · More**. The first
item is an unfilled component property placeholder shipped into a screen — the
same class as Flow 1 A6's `{title}`, but more visible because it sits in
persistent chrome.

> **RESOLVED AT SOURCE (Teku, 2026-08-04).** The bottom nav's unfilled `Label`
> property now reads **"Home"** across all instances. Fixed in Figma rather than
> worked around in code — the same disposition as the 2026-08-04 rename.
>
> Original finding kept as the record. **Re-verify on each newly inventoried
> Section**, since the fix had to reach every instance independently.

## D. Cross-flow state — carry-over 1

**P1 is NOT resolved by this Section** — no goals/savings flow, and nothing here
writes state read elsewhere.

**D1 — Read-only, extensively.** This screen aggregates every holding in the
app: bank accounts, investments, crypto, assets. It is the widest *reader* in
the inventory and contradicts several sources — see G.

**D2 — ⚠️ A LIVE LEAD FOR P1: the "Plans" tab.** The tab bar exposes
**Budget** and **Plans**, neither of which has a screen in this Section.
**"Plans" is the most plausible home yet found for the goals/savings flow whose
writer P1 has been hunting** — Academy's "Set Up Auto-Save Goal — 3 of 6
completed" would sit naturally behind it.

**Recorded as a lead, not a finding.** If an uninventoried Section turns out to
be the Plans/goals flow, **P1 reopens as a live §2.4 question**. Check the
remaining Sections for it specifically.

> **CONFIRMED (Teku): "Plans" is a SEPARATE SECTION in the file**, not a missing
> screen inside Finance_Overview. The lead was right about *where*, wrong about
> *what kind of thing* it is.
>
> **Recorded as a KNOWN-PENDING SECTION.** When it is inventoried, check it
> **directly against Academy's "Set Up Auto-Save Goal — 3 of 6 completed"**.
> That is where **P1 most likely closes** — either it writes that progress
> (P1 becomes a live §2.4 question) or it does not (Academy's progress is
> confirmed seeded mock data).
>
> Until then P1 stays **PROVISIONAL**. This is now the single highest-value
> Section remaining for the state-layer decision.

**D3 — A minor candidate writer: "Set Maturity Reminder"** (`0:144`). A button
implying persisted user state, with no destination screen and no evidence of
what it writes. Recorded only.

**D4 — Flow-scoped step count: two, no branching.** Overview → detail, with the
selected holding as the only carried state — arguably a route param rather than
flow state.

**Far below Flow 6's high-water mark of five steps with branching. §2.4 does not
fire, and is not close to firing here.**

## E. Chrome model — carry-over 2

**This is the first Section to use TWO chrome models internally.**

| Screen | Bottom nav | Steward FAB | Home indicator |
|---|---|---|---|
| `Finance_Overview01` | **VISIBLE** (`0:391`) | **VISIBLE** (`0:416`) | Inside `navbar/mobile/section` |
| `Finance_Overview02` | **Hidden** (`0:140`) | **ABSENT** | Separate 375-wide instance |

`Overview01` repeats the **Homepage model**. `Overview02` repeats the
**transactional model** — despite not being transactional at all.

**This refines P2 rather than contradicting it.** The rule is better stated as:

> **Root / tab-level screens show app chrome; drill-downs and transactional
> flows suppress it.**

That formulation covers all seven Sections without exception — Homepage and
Finance-Overview are tab roots and show chrome; Academy, both transfer flows,
Ai Alert and this detail view are sub-pages and suppress it. **Assistant remains
the special case** (chrome present but occluded by its own `Blanket`).

**P2 stays OPEN**, per the standing note — but it is now a better-formed rule
than the transactional-only version, and it survived its first non-transactional
test.

## F. Colour hazard register — carry-over 3

**F6 — NEW, and it is a categorical hazard.** The balance cards colour-code by
**asset category**: Bank Account **blue**, Investment **green**, Assets
**gold/yellow**. This is identity-by-category, exactly the F1 (Academy) shape —
**not** the Flow 4/5 logo pattern that introduced zero hazard.

**The Flow 4/5 zero-hazard streak ends here.** Bank identity on this screen is
carried by a coloured category icon, not by a DS `Logo` instance, even though
`maybank`, `aeon` and friends exist in `LogoName`.

> ## F6 — RESOLVED. NOT A HAZARD. I was wrong to file it.
>
> **Teku confirmed from the deployed showcase: `IconObject` is a real DS
> component** — 13 colours × circle/square × 5 sizes, with a
> `--brand-[color]-400` background and a white icon via `currentColor`.
>
> **The category colour is a token-backed PROP, not a literal.** Flow 7's
> colour-coded balance cards therefore carry **no rule-2 risk** and cannot
> trip `lint:tokens` — the colour never appears in MVP source at all, only a
> variant name.
>
> **Corroborated from the shipped CSS** (`node_modules/@monarch/design-system/
> dist/index.css`, consumer read, no DS-repo access): exactly **13**
> `--brand-*-400` declarations, matching the 13 colours described —
> `slate`, `blue`, `gray`, `red`, `orange`, `green`, and seven more.
>
> **This retroactively supports Flow 2's B2 detach call.** There is a real
> `IconObject` component behind that name, so "detached copy of `icon object`"
> holds — it was never a candidate custom primitive.
>
> ### Follow-up asked: do `--brand-*-400` adapt to dark mode?
>
> **No. They are static across themes.** What the shipped CSS says, and nothing
> beyond it:
>
> - **4** `[data-theme…]` blocks exist in `dist/index.css`
> - **None of the 4 contains a single `--brand-` declaration**
> - **All 4 contain `--mapped-` declarations**
>
> So the dark-theme layer re-maps only the semantic `--mapped-*` tier. The
> `--brand-*` primitive tier is declared once and never re-declared — exactly
> the behaviour the MVP `CLAUDE.md` describes for the primitive layer.
>
> **What follows from that, and what does not.** The icon-on-background pair is
> theme-independent by construction: a fixed `-400` background with a white
> `currentColor` glyph keeps identical internal contrast in both themes. What
> *does* change is the **background against the page surface**, since
> `--mapped-surface-page` flips and the `-400` swatch does not.
>
> **A decision for Teku, not a defect.** Static categorical colour is the
> conventional choice — a category's identity colour arguably *should* stay
> constant so it stays recognisable across themes. The open question is purely
> whether the mid-tone `-400` swatches hold acceptable contrast against the dark
> page surface. **Not concluding either way: this needs the two-theme
> `getComputedStyle` check that the verification discipline requires, and that
> is 5.3 work, not inventory work.**

Also present, lower risk: decorative gradients on the net-worth card (blue) and
the Fixed Deposit card (teal), and a single-series white chart line — no
categorical palette in the chart itself.

## G. Data figures — carry-over 4

**Reconciles ✓ against established sources of truth**
- **Bank Account / Main = RM 27,978.59** ✓ exactly the established fiat truth
- **Fixed Deposit = RM 150,000.00** ✓ matches Assistant03's "Fixed Deposit"
- **Unit Trust = RM 52,150.00** ✓ matches Assistant03
- Detail-screen tenure is internally consistent: Start 15 Dec 2023 → Maturity
  15 Dec 2026 with "15 Months" remaining implies ~Sept 2025, matching the "Sep"
  chart axis and Flow 1's "15 Sept" transactions ✓

**Does not reconcile ✗**

- **A digit transposition.** Finance shows **Stocks RM 98,476.23**; Assistant03
  shows **Stocks RM 98,746**. The **4 and 7 are swapped.**
- **The Fixed Deposit detail contradicts itself three ways.** Principal
  RM 125,000 + Accrued Interest RM 3,750 = **RM 128,750**, but Current Value and
  the headline both read **RM 150,000**. Separately, 3.5% p.a. on RM 125,000
  over the 21 elapsed months would be ≈ **RM 7,656**, not RM 3,750.
- **Two net-worth totals, and a third that neither matches.** Finance shows
  **RM 450,958.84**; Assistant03 showed **RM 449,958.84** — exactly RM 1,000
  apart.

**The RM 1,000 gap resolves in Assistant03's favour — and that matters.**
Summing the seven known holdings using this Section's own card values:

```
150,000.00  Fixed Deposit
 98,476.23  Stocks          (Finance's value, not Assistant03's 98,746)
107,354.00  Crypto Wallets  (Assistant03)
 52,150.00  Unit Trust
 27,978.59  Bank Account / Main
 12,000.00  PRS             (Assistant03)
  2,000.00  Gold            (Assistant03)
─────────────
449,958.82  ≈ RM 449,958.84 ✓ (2 cents, rounding)
```

**So RM 449,958.84 is the arithmetically coherent total and Finance's headline
RM 450,958.84 is RM 1,000 too high.** It also confirms Finance's
`Stocks 98,476.23` as the correct value and Assistant03's `98,746` as the
transposition.

**⚠️ But the crypto error is load-bearing, and it propagates.** That sum only
works with Crypto = **RM 107,354** — the value already established as a
**contradiction** (the crypto source of truth is **RM 102,354.02**, per Flow 5).
Substituting the correct crypto figure:

```
150,000.00 + 98,476.23 + 102,354.02 + 52,150.00 + 27,978.59 + 12,000.00 + 2,000.00
= RM 444,958.84
```

**The correctly derived net worth is RM 444,958.84 — a figure no screen in the
file displays.** Both drawn totals inherit the RM 5,000 crypto error.

**Caveat, stated:** this assumes the seven asset classes from Assistant03 are
the complete set. **This Section shows EIGHT balance cards**, two of which are
occluded by the nav and FAB, so an eighth class may exist. The figure above is
therefore the best derivation from established truths, **not** a confirmed
total.

**This is the strongest argument in the inventory for the derive-don't-copy
rule.** One quantity, three drawn values, none correct, and the error only
became visible by computing across two Sections.

## H. Screen names vs content — carry-over 5

`Finance_Overview01` ✓ accurate. `Finance_Overview02` ✗ — it is a detail
drill-down, not an overview (A3).

---

# Flow 8 — `Finance_transaction`

**Section node:** `1266:14327`
**Section URL:** `https://www.figma.com/design/v9MI8jxTaXiJA234Hkanlf/casestudy_02?node-id=1266-14327`

## 1. What it accomplishes

The Transactions tab inside Finance — a searchable, filterable transaction
ledger. Tapping the filter icon in the search bar opens a bottom sheet of filter
controls; applying them writes chips beneath the search bar.

## 2. Screens contained

Two, both `<instance>` nodes, both 375 × 812. **Both clip** — see A6.

| Figma name | Node | Size | Content height | What it is |
|---|---|---|---|---|
| `Finance_Transaction01` | `1266:14328` | 375 × 812 | `Frame 449` = **720 at y=170 → 890**, 78px past the frame | Transactions ledger, **4 applied filter chips**, 9 rows |
| `Finance_Transaction02` | `1266:14329` | 375 × 812 | same 720 → 890 | Same ledger with **3 chips**, filter **bottom sheet open** |

## 3. Navigation order

**No wired prototype links verified** — no reaction data, no prototype pull.

**Inferred**, and the logical order is the reverse of the visual order:

- Visual left-to-right: `Transaction01` (x=41) → `Transaction02` (x=499).
- **Interaction order is `02` → `01`.** Per Teku: tap the filter icon → sheet
  opens (`02`) → **Apply Filter** → sheet closes and the applied settings appear
  as chips (`01`). The chip counts corroborate this — **3 chips on `02`, 4 on
  `01`** (A7).

Not a multi-screen flow: one screen and one dismissable overlay.

## A. Figma source inconsistencies — recorded, not corrected

**A1 — The filter sheet is titled "Network Fee".** `0:535`'s header on
`Transaction02` reads **"Network Fee"** with a "Reset" action — copied wholesale
from **Flow 5's gas-fee sheet** (`1266:14399`). It should say something like
"Filter". The most consequential copy-paste error found so far, because it is a
**visible heading**, not hidden leftover text.

**A2 — "Transaction Merchant" is used as a label twice.** `0:580` labels the
merchant `Select` (correct). `0:596` labels the **RM range slider** — which is
an amount control, showing "RM", a 0–500 range and two currency inputs.
**It should read "Transaction Amount".**

**A3 — Tab count grew to five, and the fifth is clipped.** The bar now reads
**Overview · Transactions · Budget · Plans · Receipts**. Flow 7 showed four —
`Receipts` is new, and it renders past the right edge of the frame.

**A4 — The `Tabs` frame is 428 wide inside a 375 screen** (`0:266`), the direct
cause of A3's clipping. Its five `Code parts / <Tab>` children measure
89 + 112 + 76 + 66 + 85 = **428**.

**A5 — The applied-chip row overflows.** `Frame 467` (`0:291`) is **377 wide at
x=16** → right edge 393 in a 375 screen. The fourth chip, "RM 0 – 500", is
clipped.

**A6 — The list overflows the screen by 78px.** `Frame 449` is 720 tall at
y=170 → bottom edge **890** in an 812-tall frame, on **both** screens. The last
two transaction rows sit below the visible area, behind and beneath the nav.

**A7 — The two screens disagree on applied-filter count** — 4 chips on `01`,
3 on `02`. Consistent with `02` being the pre-apply state, but it means the
Section's left-to-right layout runs opposite to the interaction (see §3).

**A8 — Date-range chip capitalization is inconsistent** — "This Month",
"**l**ast 7 days", "**L**ast 30 days".

**A9 — Filter chips are `Field` instances** (`0:292`, `0:297`, `0:302`,
`0:307`, and `0:346`/`0:351`/`0:356`), not `FilterChip` or `Chips` — both of
which the DS ships. Recorded per the standing name-unreliability note; **this is
an observation, not a mapping call**, which is 5.3's job.

**A10 — Third distinct height for `Header`.** `0:535` is **68** tall inside the
sheet; Flow 1/7 use 112, Flow 3 uses 64.

**A11 — Hidden second `button` that would overflow.** `0:632` sits at y=80
inside a 64-tall `Frame 445`. Identical pattern to Flow 6 A17.

**A12 — TWO hidden stray `Tab` instances on one screen** — `0:265` outside the
`Tabs` frame and `0:267` inside it. This dead layer now appears in **all eight
Sections**, and here it has duplicated.

**A13 — Both in-sheet chip rows overflow their container.** `Frame 422` is
**458** wide (Date Range) and **454** wide (Transaction Type) inside a 343-wide
parent. The last chip in each row is clipped.

**A14 — "Apply Filter (15)" against 9 visible rows.** The count may refer to
matching results rather than rows drawn, and the list clips (A6), so this is
**not verifiable from a static frame.** Recorded, not called a defect.

**A15 — KFC −RM 25.50 exactly duplicates Caring Pharmacy's −RM 25.50.**
Possible in real data, but noted alongside Flow 5's identical-value duplicate
(Stellar/Uniswap at RM 5,117.70), which turned out to matter.

**A16 — the nine ledger rows are NOT drawn in date order, and no sort produces
the drawn order.** Added at MVP Gate 41, when the rows were first implemented as
the output of a real filter rather than transcribed. Figma's drawn sequence is
Aeon Big (15 Sept) · Caring Pharmacy (13) · KFC (12) · Granddaughter (11 06:12) ·
IKEA (**6** Sept) · Rachum Greene (11 23:46) · Tony Roma's (10 07:21) ·
Rachum Greene (10 13:33) · Touch N Go (9). **IKEA sits fifth, between two
11 Sept rows**, and the two 11 Sept rows are themselves inverted against each
other — so the order is neither ascending nor descending by date, and is not
grouped by payee, type or amount either.

**Disposition: FIX IN CODE — the MVP sorts date-descending**, which is ordinary
ledger behaviour and the only order a filter can produce over a changing result
set. The consequence is visible and intended: the same nine rows appear, in a
different order from the frame. Not a data defect — the rows and figures
reconcile exactly (§G) — so this is a LAYOUT artifact of the mockup, in the same
class as A5 and A13's overflowing rows rather than as A2's mislabel.

## B. Detached instances — triaged

**B1 — `Transaction01`'s `Tabs` (`0:266`) → detached copy. High confidence, and
the cleanest illustration of the selective-detach rule in the inventory.**

| | `Transaction01` `0:266` | `Transaction02` `0:322` |
|---|---|---|
| Node type | **`frame`** | `instance` |
| Width | **428** | 343 |
| Tabs | **5** (`Code parts / <Tab>` ×5) | 4 (component default) |

**Same component, same Section, adjacent screens — one detached, one not.** The
detached one is precisely the one that needed a fifth tab the component does not
provide. This is detach-to-extend, caught in the act.

> **NOTE (Teku): the MOTIVE here is distinct from every earlier detach, and that
> distinction matters.**
>
> | Flows | Motive | Signal |
> |---|---|---|
> | 3–6 | **detach to EDIT CONTENT** — free-text a repeater's copy | Authoring convenience. No implication for the component. |
> | **8** | **detach to EXTEND** — a **428-wide 5-tab frame** beside a **343-wide 4-tab instance** in the same Section | **The component could not do what the screen needed.** |
>
> **Latent signal for 5.3, logged as GV3.** Two readings, and this inventory
> does **not** resolve which:
>
> 1. The **DS `Tabs` component constrains tab count** (a real capability limit
>    that would surface as a Rule-3-adjacent question), or
> 2. The **Figma component simply lacks a 5-tab variant** (a Figma-side gap with
>    no code implication at all).
>
> These have completely different consequences and cannot be told apart from
> MCP data. **Verify at 5.3 against the DS public API.**

**B2 — `Bottom Sheet` (`0:532`, and inner `0:534`) → detached copy. High
confidence.** `<frame>` here; `<instance>` at the same 375×812 in Academy
(`0:514`, `0:294`) and Flow 5 (`0:49`, `0:257`). Consistent with Flow 3 B4,
Flow 5 B1 and Flow 6 B3 — `Bottom Sheet` is detached in every Section that
resizes it.

**Properly instanced throughout** — `Header`, `Tabs` (on `02`), `Tab`,
`Code parts / <Tab>`, `Field`, `Item/list` (×9 on both screens), `Blanket`,
`Select`, `Range slider`, `filter/chips/toggle` (×9), `button`,
`Navbar/home indicator`, `navbar/mobile/section`, `icon object`.

## C. Non-screen content

**None** — both Section children are screens, no spec frames, no `{...}`
placeholders.

**Carry-over 7 — persistent-chrome placeholders: CLEAN, and the C1 fix is
confirmed landed.** The bottom navigation on `Transaction01` renders
**Home · Transfer · Finance · More**. Flow 7's unfilled `Label` property now
reads "Home" here. **No other unfilled properties found in chrome on either
screen.**

## D. Cross-flow state — carry-over 1

**Not Plans, and not a writer. P1 unchanged and still PROVISIONAL.**

This Section is a **pure reader**. It renders the transaction ledger and filter
state; nothing here is read by another flow.

**D1 — Filter state is in-screen only.** Search text, the four filter groups
(date range, transaction type, merchant, amount range) and the applied chips all
live and die with the screen. Even the chips are a *display* of filter state, not
state shared outward.

**D2 — Flow-scoped step count: one screen plus one dismissable overlay.**

**§2.4 does not fire, and is nowhere near firing.** The high-water mark remains
**Flow 6 at five steps with branching**. This is the shallowest Section
inventoried apart from Flow 7.

**D3 — Worth noting for the mock-data shape.** The ledger mixes transaction
kinds in one list — `Card Payment`, `Fund Transfer`, `Crypto Transfer` — with
both negative and positive amounts (`Rachum Greene +RM 1200.15`). One
transaction type covering fiat and crypto movements, signed rather than
directional.

## E. Chrome model — carry-over 2

**⚠️ THE REFINED P2 RULE BREAKS HERE. Saying so plainly, as asked — this is more
informative than a confirmation would have been.**

| Screen | Bottom nav | Steward FAB | Verdict |
|---|---|---|---|
| `Transaction01` | **VISIBLE** (`0:469`) | **VISIBLE** (`0:494`) | ✅ conforms — tab root shows chrome |
| `Transaction02` | **Hidden** (`0:636`) | **ABSENT** | ❌ **breaks** — a tab root that suppresses chrome |

Flow 7's formulation was *"root/tab-level screens show chrome; drill-downs and
transactional flows suppress it."* `Transaction02` **is** a tab-level screen — the
same Transactions tab, one interaction later — and it suppresses chrome.
**Hierarchy position is not the governing variable.**

**What the evidence actually supports: the variable is whether an OVERLAY is
open.** Re-reading every Section against that:

| Section | Overlay-open screen | Chrome under the overlay |
|---|---|---|
| Flow 3 Assistant | `Assistant02–05` | **PRESENT** (`0:116` visible), occluded by `Blanket` |
| Flow 4 bank transfer | `Homepage_Fiat` + Transfer sheet | Hidden (`0:47`) |
| Flow 5 crypto | `…adjust gas fee` | Hidden |
| Flow 6 Ai Alert | all three modals | Hidden (`0:193`, `0:257`) |
| **Flow 8** | `Transaction02` | **Hidden** (`0:636`) |

**Best current formulation — still provisional:**

> Chrome is shown on root/tab-level screens with no overlay open. It is
> suppressed on drill-downs, throughout transactional flows, and whenever an
> overlay is open — **with the Assistant Section the sole exception**, keeping
> the navbar present-but-occluded.

**P2 stays OPEN, and this Section is the reason it should have.** Closing it
after Flow 7 would have encoded a rule that the very next Section falsifies.

## F. Colour hazard register — carry-over 3

**No new entries. Register stands at F1–F5, with F6 resolved as not-a-hazard.**

Identity on the ledger comes from **merchant logos and person photographs** —
Aeon Big, Caring Pharmacy, KFC, IKEA, Tony Roma's, Touch N Go, plus avatar
photos for individuals. **The Flow 4/5 zero-hazard pattern, not the Flow 7
categorical pattern.**

Everything else is state colour on the filter controls — selected chips in the
accent, unselected outlined — which is semantic and token-territory, the F5
class rather than a categorical palette.

**Whether every merchant mark exists in the DS `LogoName` union is a 5.3
question**, not answered here; `aeon` and `caring` are known present from the
Flow 2 B3 read, the others are unverified.

## G. Data figures — carry-over 4

**Reconciles ✓ against established truths**
- **Aeon Big −RM 250.75, 15 Sept 22:03** ✓ matches Flow 1's Homepage exactly
- **Caring Pharmacy −RM 25.50, 13 Sept 18:50** ✓ matches Flow 1 exactly

**Nothing to test against the balance truths.** Neither screen displays an
account balance, a wallet total or a net-worth figure, so there is **no
opportunity here to reconcile with — or contradict — RM 27,978.59,
RM 102,354.02, RM 98,476.23, or the derived RM 444,958.84.**

**Nothing reconciles with a drawn total but not the derived one** — the specific
trap flagged in the carry-over. It simply does not arise in this Section.

**Useful corroboration for an earlier defect:** this ledger confirms the correct
entities behind Flow 4 A17's "Big Pharmacy" mashup — **Aeon Big = RM 250.75**
and **Caring Pharmacy = RM 25.50** are two separate merchants with two separate
amounts. Assistant05 fused the names and took Aeon Big's figure.

**Unverifiable, recorded:** "Apply Filter (**15**)" against 9 drawn rows (A14).

## H. Screen names vs content — carry-over 5

Both names are accurate as far as they go — `Finance_Transaction01` and `02` are
the Transactions tab. **Neither name distinguishes the filter-sheet state**,
which is the only real difference between them, and the numbering runs opposite
to the interaction order (A7, §3). Minor by this file's standards, and nothing
like the Flow 4/5 defects the rename fixed.

---

# Flow 9 — `Receipt add and link | 28 Jan 2026`

**Section node:** `1266:14277`
**Section URL:** `https://www.figma.com/design/v9MI8jxTaXiJA234Hkanlf/casestudy_02?node-id=1266-14277`

**First Section carrying a date in its name.** Recorded as-is.

## 1. What it accomplishes

The receipt feature — Teku's flagship. Drilling into a transaction reveals its
line-item breakdown; where none exists the user scans a receipt and AI extracts
the items. Receipts can be viewed, unlinked or deleted, and the Receipts tab
stores all of them with linked/unlinked state.

## 2. Screens contained

**Seven screens.** The Section has nine children; two are not screens (§C).

| Figma name | Node | Size | What it is |
|---|---|---|---|
| `Finance_Transactions_Transaction details` | `1266:14278` | 375 × 812 | Transaction sheet, **no receipt yet** — "Add Receipt" prompt |
| `Finance_Transactions_add receipt` | `1266:14281` | 375 × 812 | Action sheet — **Photo Gallery / Camera / Cancel** |
| `Finance_Transactions_Camera` | `1266:14282` | 375 × 812 | Camera capture view with shutter |
| `Finance_Transactions_Receipt added` | `1266:14279` | 375 × **966** | Transaction sheet **with receipt linked** — line items, subtotal, tax, total |
| `Finance_Receipts` | `1266:14283` | 375 × 812 | **Receipts tab** — grouped list, linked/unlinked states |
| `Finance_Receipts_View receipt` | `1266:14285` | 375 × 812 | Full receipt image + **Unlink** / **Delete** |
| `Finance_Add Receipts` | `1266:14284` | 375 × 812 | **Bulk upload** modal — thumbnail grid, Save / cancel |

## 3. Navigation order

**No wired prototype links verified.** **Inferred. Two entry paths, and visual
order matches interaction order** (unlike Flow 8):

**Path A — attach a receipt to a transaction**
1. `Transaction details` (x=49) — tap **Add Receipt**
2. → `add receipt` (x=468) — **branch: Photo Gallery | Camera | Cancel**
3. → `Camera` (x=888) — capture
4. → `Receipt added` (x=1308) — items extracted, **View** / **Unlink receipt**

**Path B — manage receipts from the Receipts tab**
5. `Finance_Receipts` (x=1742) → `View receipt` (x=2176), with **Unlink
   receipt** / **Delete receipt**
6. `Finance_Receipts` → **+ Add Receipts** → `Add Receipts` (x=2601) — bulk
   upload, **Save** / **cancel**

The Photo Gallery half of step 2's branch is undesigned — the annotation node
(§C1) describes it in words instead.

## A. Figma source inconsistencies — recorded, not corrected

**A1 — Malformed amount: "− RM 250.75.00".** Two decimal groups, on
`Transaction details` (`0:539`) **and** on `add receipt`. The same value renders
correctly as "− RM 250.75" on `Receipt added`. **Inconsistent within one
Section**, and the malformed form is what the user sees first.

**A2 — The receipt's own arithmetic does not reconcile, at three levels.**

| Figure | Shown | Computed | |
|---|---|---|---|
| Line items (12.50 + 24.90 + 85.90 + 27.90) | — | **151.20** | |
| Subtotal | **RM 162.10** | 151.20 | ✗ off by 10.90 |
| Sales Tax (6% SST) | **RM 9.72** | 6% of 162.10 = 9.726 | ✓ consistent with its own subtotal |
| Total incl 6% SST | **RM 174.20** | 162.10 + 9.72 = 171.82 | ✗ off by 2.38 |
| Linked transaction amount | **RM 250.75** | receipt total 174.20 | ✗ off by 76.55 |

**A3 — And the photographed receipt contradicts the extracted values.** The
image on `Camera` shows the same four items with **Sub-total 224.20** and
**Total 250.75** — matching the *transaction* but neither matching the app's
parsed 162.10 / 174.20, nor reconciling 224.20 with the items' own 151.20.
**Both the source image and the extracted breakdown are internally
inconsistent.**

**A4 — Wrong merchant on a linked receipt.** On `Finance_Receipts`,
`CaringPharma…32025.pdf` is linked to a transaction labelled **"Aeon Big"** —
but the amount, **−RM 25.50 at 13 Sept 18:50**, is Caring Pharmacy's (confirmed
against Flows 1 and 8). Merchant name wrong; figure right.

**A5 — Section header says "January", every item is dated September 2025.**
`Finance_Receipts` groups under **"January"** while showing 15 Sept 2025 and
13 Sept 2025 entries. The Section name also carries "28 Jan 2026".

**A6 — Date year drift.** The component-definition frame's `Linked=Yes` sample
reads **"15 Sept 2026"**; every screen shows **"15 Sept 2025"**.

**A7 — Button label casing.** `Add Receipts` pairs **"Save"** with
**"cancel"**.

**A8 — The `Tabs` detach recurs.** `0:288` is again a **428-wide `<frame>` with
five `Code parts / <Tab>` children**, identical to Flow 8 B1. See **GV3**.

**A9 — The list overflow recurs.** `Frame 449` (`0:301`) is 720 tall at y=170 →
bottom **890** in an 812 frame; `Frame 467` (`0:313`) is **377 wide at x=16** →
393. Identical to Flow 8 A5/A6.

**A10 — Stale layer names, NOT rendered placeholders.** `0:557` is named
**"Title"** but renders "Date & Time"; `0:558`, `0:570`, `0:582` are named
**"Subtitle"** and are hidden. **Recorded precisely: layer-name artifacts, not
unfilled properties visible to a user.** A naming-hygiene item, not a C1-class
defect — the distinction matters.

**A11 — `list/chart legend` used for a FOURTH distinct purpose.** Here it renders
Transaction-info label/value rows (`0:550`, `0:562`, `0:574`). Across the file:
Academy course rows, Assistant spending rows, Assistant search results, and now
key-value metadata. **Never once a chart legend.**

**A12 — Hidden `Frame 445`** (`0:594`, 375×128) inside the sheet — the same dead
layer found in every Flow 3 sheet.

**A13 — TWO hidden stray `Tab` instances again** — `0:287` outside the `Tabs`
frame, `0:289` inside it, exactly as in Flow 8. **Present in all nine Sections;
duplicated in the two most recent.**

**A14 — Hidden date text** `0:540` ("15 Sept, 22:03") beneath the visible amount
row, superseded by the Transaction-info block below.

## B. Detached instances — triaged

**B1 — `Tabs` (`0:288`) → detached to EXTEND. High confidence.** 428-wide
`<frame>` holding five `Code parts / <Tab>` instances where the component
instance is 343 wide with four. **Second occurrence of the Flow 8 motive** —
logged as **GV3**, not resolved here.

**B2 — `Bottom Sheet` (`0:518`, inner `0:520`) → detached. High confidence.**
`<frame>` here; `<instance>` at 375×812 in Academy, Flow 5 and Flow 8.
Consistent with Flow 3 B4, Flow 5 B1, Flow 6 B3, Flow 8 B2 — **`Bottom Sheet` is
detached in every Section that resizes it, without exception.**

**B3 — `list/chart legend` (`0:550`, `0:562`, `0:574`) → detached. High
confidence.** `<instance>`s in Academy02. Detached to repurpose as key-value
rows (A11) — the **edit-content** motive, not the extend motive.

**Properly instanced throughout** — `Header`, `Field`, `Item/list` (×9),
`Blanket`, `button`, `<element>`, `Code parts / <Tab>`,
`navbar/mobile/section`, `Navbar/home indicator`, `Slot`.

## C. Non-screen content

**Two of nine children are not screens. Both excluded from the screen list.**

**C1 — Annotation text node** `1266:14280` at x=2601 y=36:
**"In gallery multi select > multi added > Save"**. A designer's note describing
the undesigned Photo Gallery branch in words — a written spec fragment on the
canvas, not a screen.

**C2 — Component-definition frame** `Item/receipts` (`1266:14286`), 383×249,
containing two **`symbol`** nodes — **`Linked=No`** (`1266:14287`, 343×64) and
**`Linked=Yes`** (`1266:14298`, 343×124). Component definitions authored inside
a flow Section, exactly as Flow 3's `Components` frame. Its sample data carries
the A6 year drift.

**⚠️ Carry-over 7 — an unfilled property IS present, and the C1 fix is
INCOMPLETE.** On `Finance_Add Receipts` (`1266:14284`) the bottom navigation
renders **"Label · Transfer · Finance · More"**. On `Finance_Receipts`
(`1266:14283`) the same nav renders **"Home · Transfer · Finance · More"**.

**The Flow 7 C1 fix reached some instances and not others** — which is exactly
why that resolution was annotated "re-verify on each newly inventoried Section".
Needs another pass in Figma.

## D. Cross-flow state — carry-over 1

**Not Plans. P1 unchanged and still PROVISIONAL.**

**⚠️ D1 — This Section contains the inventory's SECOND genuine cross-flow
writer.**

- **Written here:** linking a receipt (Path A), **Unlink receipt** and **Delete
  receipt** (`View receipt`), bulk **Save** (`Add Receipts`).
- **Read elsewhere:** transaction rows in **Flow 8's ledger** and **Flow 1's
  Homepage** carry a receipt indicator — Caring Pharmacy and IKEA show it in
  Flow 8, Caring Pharmacy on the Homepage.

Teku states it explicitly: unlinking *"will reflect on item in transaction tab"*.

**Architectural consequence — the same shape as P3, not a new problem.** Receipts
and their link state join **app-level state** alongside accounts and the Steward
thread: a third app-level provider, or a widening of accounts. **That shaping
call belongs to 5.3.**

**⚠️ Still Context. §2.4 still does not fire.** This is trigger 1's shape
(mutated in one flow, read in others) — already answered for the balance
decrement at P3 with an app-level Context provider and named-hook access per
§2.6. Nothing about receipts is harder than balances. **Recorded so the
accumulating writers are not later mistaken for a case for a store.**

**D2 — Flow-scoped step count: four, with a two-way branch.** Transaction
details → add receipt → *(Photo Gallery | Camera)* → Camera → Receipt added.
**Below the high-water mark; Flow 6 retains it at five steps with branching.**

## E. Chrome model — carry-over 2

**⚠️ THE CURRENT FORMULATION BREAKS TOO. Saying so plainly — and this is the
most informative break yet.**

Formulation 3 held that *overlay-open suppresses chrome, **with Assistant the
sole exception***. This Section falsifies the exception clause:

| Screen | Overlay | `navbar/mobile/section` | Verdict |
|---|---|---|---|
| `Transaction details` | Bottom Sheet + `Blanket` | **VISIBLE** (`0:493`) | ❌ **breaks** |
| `Finance_Add Receipts` | modal | **VISIBLE** (renders "Label") | ❌ **breaks** |
| `Finance_Receipts` | none | **VISIBLE** + FAB | ✅ conforms |

**Assistant is no longer the sole exception.**

| Behaviour under an open overlay | Sections |
|---|---|
| Chrome **hidden** | Flows 4, 5, 6, 8 |
| Chrome **present, occluded by `Blanket`** | Flows 3, **9** |

**Honest reading: P2 may not be a rule at all.** Three formulations falsified —
transactional-based (Flow 7), hierarchy-based (Flow 8), overlay-with-single-
exception (Flow 9). What remains looks less like a design system and more like
**per-Section authoring variance in whether the designer bothered to hide a
layer that a `Blanket` covers anyway.**

**P2 stays OPEN and PROVISIONAL per the standing instruction.** The stronger
conclusion — *that there may be no rule to find* — is recorded as the current
best reading, to be tested by the remaining Sections, **not promoted now.**

## F. Colour hazard register — carry-over 3

**No new entries. Register stands at F1–F5, F6 resolved as not-a-hazard.**

Identity comes from **merchant logos** (Aeon, Caring Pharmacy, IKEA) and
**photographic receipt thumbnails** — the Flow 4/5/8 zero-hazard pattern.
Everything else is **semantic status colour**, the F5 class: green "Linked"
badge, red "Delete receipt", accent primary button.

## G. Data figures — carry-over 4

**Reconciles ✓**
- **Aeon Big −RM 250.75, 15 Sept 22:03** ✓ matches Flows 1 and 8 exactly
- **Caring Pharmacy −RM 25.50, 13 Sept 18:50** ✓ matches Flows 1 and 8 (the
  *amount*; the merchant label is wrong — A4)

**Does not reconcile ✗** — A2 and A3: the receipt breakdown fails against its own
line items, its own subtotal, its linked transaction, **and** the photographed
source. **Four separate mismatches on one artifact.**

**Nothing to test against the balance truths.** No screen here displays an
account balance, wallet total or net worth, so **RM 27,978.59, RM 102,354.02,
RM 98,476.23 and the derived RM 444,958.84 do not arise** — and the
reconciles-with-a-drawn-total-but-not-the-derived-one trap does not occur.

**For the derive-don't-copy register: this is the clearest case in the file.**
Subtotal, tax and total are all functions of the line items; all three were
hand-authored and all three are wrong. **A typed model with
`subtotal = sum(items)` makes A2 impossible.**

## H. Product intent — recorded verbatim, not inventoried as behaviour

Teku's stated purpose, kept because it explains *why* line-item extraction
matters — **but none of it is designed in this Section and none of it is a
finding:**

> AI processes transaction *and* line-item activity to **suggest** financial
> advice (Teku's emphasis on *suggests*), report spending behaviour ("You spent
> 30% less this month"), and detect frequently-bought items — with a possible
> business model in brand partnerships ("There is a promotion on rice at Tesco"
> after noticing repeated rice purchases).

**Three things this inventory will not do with it:** treat it as designed
behaviour, scope it, or let it expand Phase 5. It connects to the Flow 3
decision that the Steward runs on **scripted responses driven by typed mock
data** — any "AI noticed…" copy in Phase 5 is authored content, not inference.
Teku's *suggests*-not-advises framing matches the compliance behaviour already
flagged as deliberate in Flow 3 H, and should be preserved the same way.

## I. Screen names vs content — carry-over 5

**All seven names accurately describe their screens**, and they are descriptive
rather than numbered — so **Flow 8's numbering-runs-opposite-to-interaction
problem does not recur.** Visual order matches interaction order in both paths.

Only wobble: `…_Transaction details` versus `…_Receipt added` are the *same*
sheet in two states, and only the second name says so.

## J. Copy-paste content lifted from elsewhere — carry-over 8

**No cross-flow copy-paste found** — nothing lifted from another flow in the
manner of Flow 8's "Network Fee" heading or Flow 6 A7 ↔ Flow 3 A9.

**One within-Section copy-paste defect: A4**, the Caring Pharmacy receipt
carrying Aeon Big's merchant name while keeping Caring Pharmacy's amount and
timestamp. Same failure mode, shorter distance.

---

# Flow 10 — `Finance_Budget`

**Section node:** `1266:14333`
**Section URL:** `https://www.figma.com/design/v9MI8jxTaXiJA234Hkanlf/casestudy_02?node-id=1266-14333`

## 1. What it accomplishes

The Finance → Budget tab. Monthly budgets with spend-vs-remaining gauges;
drilling into one opens a full-page breakdown by expense category, with the
actual transactions nested inside each category. A modal creates new budgets.

## 2. Screens contained

**Three screens.** The Section has four children; one is a reference component
(§C1).

| Figma name | Node | Size | What it is |
|---|---|---|---|
| `Finance_Budget` | `1266:14334` | 375 × 812 | **Budget tab** — 2 budget cards + "Add New Budget" |
| `Finance_Budget_drilldown` | `1266:14337` | 375 × **1697** | **Budget detail** — gauge, info rows, donut, 7 category rows with nested transactions. Deliberately unclipped |
| `Finance_Budget_add budget` | `1266:14335` | 375 × 812 | **"Create A Budget"** modal over the Budget tab |

## 3. Navigation order

**No wired prototype links verified.** **Inferred — a branch, not a sequence:**

1. `Finance_Budget` (x=79) — the tab page
2. → **Details** on a budget card → `Finance_Budget_drilldown` (x=501)
3. → **Add New Budget** → `Finance_Budget_add budget` (x=923)

Steps 2 and 3 are **siblings reached from step 1**, not consecutive. Visual
left-to-right therefore reads as a sequence but is not one — recorded because
Flow 8 had the reverse problem.

Inside the drilldown, expanding a category row to reveal its transactions is
**in-screen state**, not navigation.

## A. Figma source inconsistencies — recorded, not corrected

**A1 — The gauge percentage does not match its own numbers, on the main budget
only.**

| Budget | Available | Spent | Total | Shown "% Left to Spend" | Computed |
|---|---|---|---|---|---|
| Monthly Budget | RM 700 | RM 6,800 | RM 7,500 ✓ | **18%** | 700 / 7,500 = **9.33%** ✗ |
| Entertainment | RM 350 | RM 650 | RM 1,000 ✓ | **35%** | 350 / 1,000 = **35%** ✓ |

**Entertainment computes exactly; Monthly Budget does not.** The same wrong 18%
is repeated on the drilldown's large gauge. Textbook hand-authored figure
sitting beside a correct one.

**A2 — The donut's centre label contradicts its own segments.** The centre reads
**RM 6,800** (= Spent), but the seven category amounts sum to **RM 7,500**
(= the total Budget):

```
2,500.00  Bills & Utilities      33.33%
1,800.00  Groceries              24.00%
1,200.00  Dining & Leisure       16.00%
  800.00  Healthcare             10.67%
  500.00  Transport               6.67%
  350.00  Shopping                4.67%
  350.00  Others / Misc           4.67%
─────────
7,500.00  ← segments total       100.01% (rounding)
```

**Every percentage is computed against 7,500 and is individually correct.** So
the segments and percentages are coherent with each other and with the *budget*
— only the centre label is wrong, showing *spent* where the chart shows
*allocated*.

**A3 — `card/fixed deposit info` used for budget rows.** `0:324` is named for
Flow 7's fixed-deposit detail but renders Budget / Duration / Available / Spent.
Component name and use have fully diverged — the standing name-unreliability
note again.

**A4 — Four hidden "Budget" text leftovers** inside that card (`0:333`, `0:347`,
`0:361`, `0:372`), one per row, plus two more on the drilldown (`0:378` under
"Expenses Summary", `0:401` "Spent" inside the donut). Six stale duplicates of a
single word.

**A5 — Tab set differs from the other Finance Sections.** Here `Tabs` is the
**343-wide 4-tab instance** — Overview · Transactions · Budget · Plans.
**Flows 8 and 9 use a 428-wide detached 5-tab frame** including **Receipts**.
Two different tab sets inside one Finance page.

**A6 — 4px header/content overlap** on the drilldown — `Frame 455` starts at
y=108 beneath a 92-tall `Frame 451`. Recurs from Flows 5 and 7.

**A7 — Subpixel geometry.** `Date range picker` ×2 at **150.5** wide (`0:506`,
`0:514`); the category legend rows at **x=17.5** (`0:405` and six siblings); the
`Pie Chart` ellipse at x=**0.693359375** with boolean children at
**200.00003051757812**.

**A8 — Only ONE hidden stray `Tab` per screen here** (`0:252`, `0:305`) — not
the duplicated pair seen in Flows 8 and 9. **Present in all ten Sections**,
count varying.

**A9 — The FAB is removed rather than covered when the modal opens.**
`Finance_Budget` carries `icon object` (`0:415`); `Finance_Budget_add budget`
has **no FAB layer at all**, while its navbar *is* present and merely covered.
Two different mechanisms for the same visual outcome, on the same page.

## B. Detached instances — triaged

**B1 — `card/fixed deposit info` (`0:324`) → detached. MODERATE confidence.**
A `<frame>` with a `card/…` component-style name. **No instance counterpart
found anywhere in ten Sections** — Flow 7's fixed-deposit detail uses
`card/data display` instances instead. Same evidential caveat as Flow 6 B1/B2:
the name implies a component, but nothing in the file proves one exists.
**Flagging, not asserting.**

**B2 — `Modal` (`0:468`) → detached. MODERATE confidence.** `<frame>` named
`Modal` containing a `Blanket` instance; the DS ships `Modal`. Identical to
Flow 6 B1, including the caveat that no `Modal` instance exists anywhere in the
file walked so far.

**B3 — `Bottom Sheet` (`0:470`) → detached. HIGH confidence.** `<frame>` at
343×594 inset at x=16; `<instance>` at 375×812 in Academy, Flows 5, 8, 9.
**`Bottom Sheet` is now detached in every Section that resizes it — six for
six.**

**B4 — `Pie Chart` (`0:379`) is NOT a detach question.** It is raw geometry —
one `ellipse`, six `boolean-operation` subtractions and a `vector` — with no
component identity at all. See G.

**Not detached, and worth recording:**
- **`Tabs` is a proper instance here** (`0:253`, `0:306`) — where Flows 8 and 9
  detached it to extend. Consistent with the settled selective-detach note, and
  it narrows GV3: the detach happens only where a **fifth tab** is needed.
- **`list/chart legend` is fully instanced** — seven of them (`0:405`, `0:423`,
  `0:521`, `0:538`, `0:555`, `0:572`, `0:589`) — where Flows 3, 5 and 9 detached
  it.
- **`Progress ring indicator` is an instance** (`0:307`). **The radial gauge is
  a DS component, not a charting gap** — a useful negative result given G1/G3.

**Properly instanced throughout** — `Header`, `Status Bar`, `header`, `Tabs`,
`Tab`, `card/monthly budget` (×3), `Progress ring indicator`, `icon object`,
`list/chart legend` (×7), `Item/list` (×5), `Field`, `Select`,
`Select / Transfer`, `Date range picker` (×2), `❖ Toggle`, `<header>`,
`Blanket`, `button` (×2), `<element>`, `navbar/mobile/section`,
`Navbar/home indicator`, `Bottom Sheet` (the hidden 375-wide one).

## C. Non-screen content

**C1 — `Select` (`1266:14336`), 311×58, at x=1345.** A **component instance
placed on the canvas as a reference**, not a screen. Teku: *"the little drop
down category selector component on the right end of the section is for
reference as to what type of expenses they can set into the budget they
created."*

Rendered expanded it shows the seven categories with checkboxes — **Bills &
Utilities, Groceries, Dining & Leisure ☑, Healthcare, Transport, Shopping ☑,
Others / Misc** — matching the modal's "Dining & Leisure, Shopping" ✓ and the
drilldown's seven expense categories ✓ exactly.

**Excluded from the screen list.** A different kind of non-screen from Flow 3's
`Components` frame (definitions) and Flow 9's annotation text (a written note) —
this is a **live instance used as documentation**.

**Carry-over 7 — nav labels CLEAN in this Section.** Both nav instances render
**Home · Transfer · Finance · More** — `Finance_Budget` (`0:390`) and, behind the
`Blanket`, `Finance_Budget_add budget` (`0:443`). **No user-visible unfilled
properties anywhere.** The hidden "Budget" leftovers (A4) are stale *content*,
not unfilled properties, and the `Tab` strays are hidden layers — neither is a
C1-class defect.

## D. Cross-flow state — carry-over 1

**Not Plans. P1 unchanged and still PROVISIONAL** — the "Plans" tab is visible
here and remains a separate, uninventoried Section.

**D1 — A third writer, and it is the most clearly scoped one yet.** "Create A
Budget" (Name, Category, Amount, date range, Auto-Renew) **writes a budget**.
Teku: *"they are free to set any type of budget details and settings."*

**Whether it is CROSS-flow is undetermined.** Budgets are read on this page and
its drilldown; no other Section inventoried so far displays a budget. **Unlike
P3 (balances) and Flow 9 (receipt links), no cross-Section reader has been
found.** If none appears, budgets are flow-local state; if the Plans Section
reads them, they join app-level state.

**Recorded, not decided.** Either way it is Context — the P3 precedent covers
both shapes.

**D2 — But the drilldown READS across flows, and it reconciles.** Its category
totals are the same figures Flow 3's Assistant04 displays. See G.

**D3 — Flow-scoped step count: two, with a two-way branch.** Budget tab →
*(drilldown | add-budget modal)*. Category expansion inside the drilldown is
in-screen state.

**Well below the high-water mark. Flow 6 retains it at five steps with
branching. §2.4 does not fire.**

## E. Chrome — carry-over 2, classified under the resolved rule

| Screen | Node | State | Basis |
|---|---|---|---|
| `Finance_Budget` | `1266:14334` | **PRESENT** | Tab-level page; navbar `0:390` visible, FAB present |
| `Finance_Budget_drilldown` | `1266:14337` | **SUPPRESSED** | Full-page drill-down; navbar `0:608` hidden |
| `Finance_Budget_add budget` | `1266:14335` | **SUPPRESSED** | `Modal` + `Blanket` overlaid; navbar `0:443` visible **but covered** |

**All three fit cleanly. Nothing to flag.**

Two points worth recording:

- **`add budget` is a textbook confirmation of the rule's occlusion clause** —
  the navbar layer is *visible* in metadata and *unavailable* to the user. Layer
  flags and interface state differ, exactly as the resolved rule anticipates.
- ⚠️ **The drilldown suppresses without the stated layout conflict.** It has **no
  bottom action buttons** — it ends in category rows, with only a home
  indicator at y=1672. **This is the same nuance as N1 (Monarch Academy):**
  classification correct, stated rationale absent. **Second occurrence** —
  logged because two instances make it a pattern rather than a one-off.

## F. Colour hazard register — carry-over 3

**F7 — NEW, but lower-risk than F2, and it needs stating precisely.**

Two colour systems on the drilldown, and they are **not** the same kind of thing:

| Element | Source | Hazard |
|---|---|---|
| The seven **category icons** | **DS `IconObject` with a token-backed colour prop** | ✅ **None** — resolved by F6; the colour is a variant name, never a literal |
| The seven **donut segments** | **Raw vector fills** — `Pie Chart` is not a component (B4) | ⚠️ **F7** — the fills have to come from somewhere |

**Why F7 is lower-risk than F2 (Assistant03's donut):** the categorical palette
**already exists** as token-backed category colours via `IconObject`. The chart
can reuse the same token names rather than inventing literals. **The hazard is
only realised if someone hardcodes hex for the chart** instead of reading the
category's existing colour token.

Register now: **F1, F2, F3, F4, F5, F7** live; **F6 resolved as not-a-hazard.**

Also present, no hazard: the blue→red gradient arcs on the budget gauges, which
are `Progress ring indicator` **instances** — DS-owned.

## G. Data figures — carry-over 4

**Reconciles ✓ — and one result here is genuinely valuable**

- **Groceries transactions sum EXACTLY to their category total:**
  ```
  250.75 + 420.50 + 310.40 + 288.60 + 529.75 = 1,800.00
  ```
  matching "Groceries RM 1,800.00" to the cent. **The best-computed figure found
  anywhere in the inventory.**
- **Aeon Big −RM 250.75, 15 Sept 22:03** ✓ matches Flows 1, 8 and 9 exactly
- Entertainment budget: 350 + 650 = 1,000 ✓, and 35% ✓ (A1)
- Every category percentage is correct against 7,500 (A2)

**⚠️ A cross-flow result that advances Flow 3 A22.** The drilldown's category
totals are **identical** to those in Flow 3's Assistant04 spending analysis:

| Category | Flow 10 drilldown | Flow 3 Assistant04 | |
|---|---|---|---|
| Dining & Leisure | RM 1,200.00 | RM 1,200.00 | ✓ match |
| Shopping | RM 350.00 | RM 350.00 | ✓ match |
| Groceries | RM 1,800.00 | RM 1,800.00 | ✓ match |

**So Assistant04's AMOUNTS are confirmed correct — it is only its percentages
that are wrong.** Flow 3 A22 recorded that its 10.2% / 8.8% / 5.9% reconciled
under no reading; against the budget total of 7,500 the correct shares are
**16.00% / 4.67% / 24.00%**, which still do not match. **A22 narrows from "these
figures are unexplained" to "the amounts are right, the percentages are
fabricated."**

**Does not reconcile ✗** — A1 (18% vs 9.33%) and A2 (donut centre RM 6,800 vs
segments totalling RM 7,500).

**Nothing to test against the balance truths.** No account balance, wallet total
or net-worth figure appears, so **RM 27,978.59, RM 102,354.02, RM 98,476.23 and
the derived RM 444,958.84 do not arise.** The reconciles-with-a-drawn-total-but-
not-the-derived-one trap does not occur.

**For the derive-don't-copy register:** A1 and A2 are both quantities that are
pure functions of data already present — `pctLeft = available / total` and
`donutCentre = sum(segments)`. **Both are structurally impossible in a computed
model.** The Groceries sum shows what the same data looks like when it *is*
derived.

## H. Charts — third confirmed instance

**The `Pie Chart` (`0:379`) is a real chart built from raw geometry** — one
`ellipse`, six `boolean-operation` subtractions, a `vector` ring and a centre
label. Not a component, not a misnamed list.

**Third confirmed real chart in the file**, after G1 (Assistant03's allocation
donut) and G3 (Finance_Overview's net-worth trend line). **All three are raw
vector work.**

**Recorded against G1 in the gap register as a recurrence, not a new entry** —
it is the same underlying need, and the case for treating charting as one
decision rather than three is now stronger.

**Useful counter-example in the same Section:** the radial budget gauges are
`Progress ring indicator` **instances** (B4) — a DS component. **Not every
circular data display is a gap**, which is exactly the discrimination 5.3 will
need to make.

## I. Screen names vs content — carry-over 5

**All three names accurate.** `Finance_Budget`, `Finance_Budget_drilldown`,
`Finance_Budget_add budget` — descriptive, unnumbered, each matching what it
renders.

**No numbering, so no interaction-order mismatch** in the Flow 8 sense. The only
subtlety is §3's: visual left-to-right *looks* sequential but steps 2 and 3 are
siblings.

## J. Copy-paste content — carry-over 8

**No text lifted from another flow.** Nothing in the class of Flow 8's "Network
Fee" heading or Flow 6 A7 ↔ Flow 3 A9.

**Two component-level reuse artifacts instead:**

- **A3** — `card/fixed deposit info` rendering budget rows.
- **`Select / Transfer`** (`0:498`) used as the Budget modal's category picker —
  a component named for the transfer flow, reused here. Not a defect; the
  component name is simply stale relative to its uses.

**Within-Section:** the six hidden "Budget" text leftovers (A4) are duplicates
of one label pasted across rows and then superseded.

---

# Flow 11 — `Finance_Plan`  ⭐ **This is the Plans Section — P1's target**

**Section node:** `1266:14338`
**Section URL:** `https://www.figma.com/design/v9MI8jxTaXiJA234Hkanlf/casestudy_02?node-id=1266-14338`

## 1. What it accomplishes

Finance → Plans. Two halves: **Goals** (saving toward something, with images to
visualise them) and **Commitments** (recurring obligations). The USP is
commitment insights — Monarch scans the market for equivalent-spec deals and
surfaces a better offer, with an education overlay explaining how.

## 2. Screens contained

**Six screens**, all `<instance>` nodes. No non-screen children.

| Figma name | Node | Size | What it is |
|---|---|---|---|
| `Finance_Plan` | `1266:14339` | 375 × 812 | **Plans tab** — 2 goal cards + 5 commitments |
| `Finance_Plan_drilldown` | `1266:14344` | 375 × **864** | **Goal detail** ("Bali Trip") — auto-save, contributions |
| `Finance_Plan_add goal` | `1266:14340` | 375 × 812 | **"Add a Goal"** modal |
| `Finance_Plan_view commitment` | `1266:14343` | 375 × 812 | **Commitment detail** ("Internet" / U-Mobile) |
| `Finance_Plan_view commitment_smart insight` | `1266:14341` | 375 × 812 | **Smart insights** promo modal |
| `Finance_Plan_view commitment_smart insight_ education` | `1266:14342` | 375 × 812 | **Education** overlay |

## 3. Navigation order

**No wired prototype links verified.** **Inferred — a mix of siblings and a
chain**, which carry-over 5 asked to be distinguished:

**Siblings off the tab page**
1. `Finance_Plan` → tap a goal card → `…_drilldown`
2. `Finance_Plan` → **Add New** (Goals) → `…_add goal`

**A genuine chain**
3. `Finance_Plan` → tap a commitment → `…_view commitment` → **View** →
   `…_smart insight` → **How Monarch find savings ›** → `…_ education`

**Two entry points to the same modal.** Teku: the promo can be opened either by
tapping the banner *in the commitments list* (skipping `view commitment`) or by
drilling into the commitment first. Recorded because it means `smart insight`
has two predecessors.

Visual left-to-right matches the logical order in both branches.

## A. Figma source inconsistencies — recorded, not corrected

**A1 — Three different savings figures for one promotion.**

| Where | Figure |
|---|---|
| Commitments-list banner + commitment detail banner | **"RM69/month Potential Savings"** |
| Smart insights modal subtitle | **"Save RM 51/month on your internet bill"** |
| Smart insights Current (RM 120.00) − Suggested (RM 70.00) | **RM 50/month** |
| Smart insights "Savings" row | **RM 600/year** = RM 50/month ✓ |

**The arithmetic reconciles: 120 − 70 = 50, × 12 = 600 ✓.** Both prose figures —
RM 69 and RM 51 — contradict it and each other. **Two fabricated numbers sitting
on top of a correct calculation.**

> ## 📌 FIX REGISTER — A1 is **FIX IN FIGMA**, not FIX IN CODE (Teku, 2026-08-05)
>
> **This is the exception to the file's usual pattern, and the reason matters.**
>
> Almost every data contradiction in this inventory is **derivable** — the
> correct value is a function of data already present, so a computed model
> produces it automatically and the wrong drawn value simply never appears.
> `subtotal = sum(items)`, `walletTotal = sum(holdings)`,
> `pctLeft = available / total` all work that way.
>
> **A1 does not.** The displayed copy — **"RM69/month Potential Savings"** and
> **"Save RM 51/month"** — has **no correct fallback to derive from.** Only the
> underlying arithmetic (120 − 70 = 50) is right. **There is nothing to compute
> that would produce "RM69" or "RM51" correctly**, because those numbers are not
> functions of anything in the design; they are simply wrong.
>
> | | |
> |---|---|
> | **Disposition** | **FIX IN FIGMA** — correct the banner and modal copy at source to RM 50 |
> | **Why not FIX IN CODE** | Deriving the banner text from `current − suggested` would silently *replace* the designed copy rather than implement it. That is a design decision, not a data-modelling one. |
>
> **Contrast worth keeping:** the derive-don't-copy rule fixes contradictions
> where a right answer is recoverable. Where it is not, the fix belongs at
> source. **Do not let the standing note absorb this case.**

**A2 — Screen name has a stray space:**
`Finance_Plan_view commitment_smart insight_ education` — note `_ education`.

**A3 — GRAMMAR: "How Monarch find savings ›"** — should be "finds".

**A4 — "Edit Goals" (plural) on a single-goal detail page.** Should be "Edit
Goal".

**A5 — Three date formats in one Section** — "Oct 7, 2025" (US, commitment
detail), "15 Dec 2026" and "March 2026" (long), "30/05/2026" (numeric,
add-goal), plus "next on 1 Oct" and "11 Sept" in lists.

**A6 — Currency formatting inconsistent within one modal.** `add goal` shows
Target Amount **"RM 5000.00"** but Auto-Save Amount **"RM250"** — no space, no
decimals.

**A7 — Hyphenation inconsistent within one list.** Recent Contributions shows
**"Manual Top Up"** (05 Sept) and **"Manual Top-Up"** (last row).

**A8 — "Add New" is a raw `text` node, not a `❖ Link` instance** — `0:317`
(Goals) and `0:370` (Commitments). Every comparable affordance elsewhere in the
file uses `❖ Link`. Same pattern as Flow 1 A4 and Flow 6 A2.

**A9 — Duplicate layer name `Frame 473`** — `0:363` (the Commitments header row)
and `0:402` (the commitment-plus-promo group).

**A10 — The list overflows the screen by 78px.** `Frame 449` (`0:308`) is 720
tall at y=170 → bottom **890** in an 812 frame. Identical to Flows 8, 9 and 10.
The last commitment ("Anytime Fitness") sits under the nav.

**A11 — "Why You're seeing this alert"** — mid-sentence capital on "You're",
**identical to Flow 6 A6.** Carried across with the copied pattern (see J).

**A12 — Hidden `Frame 301`** (`0:362`) beneath the visible Commitments header.

**A13 — Only one hidden stray `Tab`** (`0:296`), as in Flow 10. **Present in all
eleven Sections.**

## B. Detached instances — triaged

**⚠️ B1 — `❖ System message` is a PROPER INSTANCE here (`0:417`), and that
retroactively confirms Flow 1 B2.**

Flow 1 recorded `❖ System message` as a `<frame>` and could not tell whether it
was a detached copy or a genuinely custom element — Teku resolved it as
"detached to modify for its allocated location". **This Section supplies the
missing evidence: a real `❖ System message` component exists and is instanced at
343×64 to render the promo banner.** Flow 1 B2's verdict is now supported by
same-file instance evidence, not just Teku's recollection.

**Nothing else is detached in this Section.** `Tabs` is a proper 343-wide 4-tab
instance (`0:297`), matching Flow 10 and **not** the 5-tab detached frame of
Flows 8–9.

**Properly instanced throughout** — `Header`, `Tabs`, `Tab`, `Label` (×2),
`card/goals` (×2), `Item/list` (×6), `❖ System message`,
`navbar/mobile/section`, `icon object`.

**Second Section with zero detaches**, after Flow 7.

## C. Non-screen content

**None.** All six Section children are screens — no spec frames, no annotations,
no reference components.

**Carry-over 7 — nav labels CLEAN.** `Finance_Plan` renders **Home · Transfer ·
Finance · More** (`0:514`), and the nav behind each modal's `Blanket` renders
the same. **No user-visible unfilled properties.** The hidden `Frame 301`
(A12) and the stray `Tab` (A13) are hidden layers, not unfilled properties.

## D. Cross-flow state — carry-over 1 ⭐ **P1 examined directly**

**This IS the Plans Section. P1's target has been inventoried — and the answer
is more interesting than either expected outcome.**

**The ACTION Academy references exists here. The COUNTER does not.**

Academy's Essential Task reads *"Set Up Auto-Save Goal — 3 of 6 completed"*.
This Section contains auto-save in two places: the goal drilldown's **"Auto-Save
RM 250/mth"** with an enable toggle, and the add-goal modal's **"Auto-Save
Amount / Month"** field with its own toggle. **So "set up an auto-save goal" is
a real, designed action, and it lives here.**

**But there is no onboarding checklist, no task list, and no "N of 6" progress
counter anywhere in these six screens.** Nothing writes the value Academy
displays.

### Recommended reading — and it fits the standing derive-don't-copy note

**"3 of 6 completed" is best modelled as a DERIVED value, not stored state** — a
count over six specific setup actions the app already knows about (has an
auto-save goal, has linked a receipt, has made a transfer, …). Under that
reading there is no missing writer to find: the counter is a function of state
that other flows already own.

**That is consistent with everything the inventory has established** — it is the
same *compute, don't transcribe* principle as `subtotal = sum(items)` and
`walletTotal = sum(holdings)`.

**⚠️ P1 STAYS PROVISIONAL.** The Section that most plausibly held the writer has
now been walked and does not contain one, which **strengthens** the seeded/derived
reading considerably — but the file is still not exhausted, and the standing
instruction is not to promote before it is. **Do not close P1 here.**

> ## ✅ P1 — Teku ENDORSES the derived-value reading (2026-08-05)
>
> **"3 of 6 completed" computes from six real setup actions** — goal created,
> Auto-Save toggled, and so on — **rather than being stored state.** Same
> compute-don't-transcribe principle as `subtotal = sum(items)` and
> `walletTotal = sum(holdings)`.
>
> **No writer needs to be built for this.** There was never a missing writer;
> there was a value that should be computed.
>
> **Status: formally PROVISIONAL** per the standing rule until the file is
> exhausted — **but Teku has approved building against the derived reading with
> confidence.** The distinction that matters for later Sections:
>
> | Evidence found later | Effect on P1 |
> |---|---|
> | Goal-adjacent content, more setup actions, another progress display | **No change** — consistent with the derived model |
> | A screen that **stores and mutates a task-completion counter** as its own state, read elsewhere | **Reopens P1** as a live §2.4 question |
>
> **A later Section would need strong contrary evidence to change this, not just
> goal-adjacent content.** Do not treat every mention of goals or progress as
> grounds to revisit.

**D2 — A fourth writer, of the P3 shape.** "Top-Up" on a goal, funded by
**"Bank Account - Main"**, would **debit the Main account balance** — the same
app-level accounts state P3 already decided. Also writing: Add a Goal, Edit
Goals, the Auto-Save toggle, Edit Commitment, Set Reminder.

**Still Context. §2.4 still does not fire.** Goals and commitments join the
app-level shape; the P3 precedent covers it.

**D3 — Flow-scoped step count: three, with branching.** The longest chain is
Plans → view commitment → smart insight → education, and `smart insight` has
**two predecessors** (banner tap, or commitment drill-down).

**Below the high-water mark. Flow 6 retains it at five steps with branching.**

## E. Chrome — carry-over 2

| Screen | Node | State | Basis |
|---|---|---|---|
| `Finance_Plan` | `1266:14339` | **PRESENT** | Tab-level page; navbar `0:514` visible, FAB present |
| `…_drilldown` | `1266:14344` | **SUPPRESSED** | Drill-down; **Top-Up / Edit Goals** at the bottom |
| `…_add goal` | `1266:14340` | **SUPPRESSED** | Modal + `Blanket`; nav visible but covered |
| `…_view commitment` | `1266:14343` | **SUPPRESSED** | Drill-down; **Edit Commitment / Set Reminder** at the bottom |
| `…_smart insight` | `1266:14341` | **SUPPRESSED** | Modal overlaid |
| `…_ education` | `1266:14342` | **SUPPRESSED** | Modal overlaid |

**All six fit cleanly. Nothing to flag. Running total: 34 screens, zero
classification failures.**

Worth noting: **both drill-downs here carry bottom action buttons**, so the
rule's stated layout-conflict rationale **holds exactly** — unlike the N1 cases
(Academy, Budget drilldown). N1 is closed on config grounds regardless, but this
Section is a clean positive example.

## F. Colour hazard register — carry-over 3

**No new entries. Register stands at F1, F2, F3, F4, F5, F7; F6 resolved.**

- **Commitment icons** — a mix of **`IconObject` with token-backed colour props**
  (Mortgage, Car Payment) and **brand logos** (U-Mobile, Netflix). Both are
  zero-hazard categories per F6 and the Flow 4/5 logo pattern.
- **Goal card imagery** — photographs, one badged **"AI Image"**.
- **The promo banner's purple→magenta gradient** — decorative, on a
  `❖ System message` **instance**, so DS-owned. No literal in MVP source.
- **Smart-insights check/cross icons** — F5-class semantic colour.

## G. Data figures — carry-over 4

**Reconciles ✓ — both goal percentages are exact**
- **Bali Trip: 5,040 / 9,000 = 56.0%** ✓ as shown
- **Emergency Funds: 11,040 / 12,000 = 92.0%** ✓ as shown
- **Savings arithmetic: 120 − 70 = 50/month; × 12 = RM 600/year** ✓ internally
  consistent

**Does not reconcile ✗** — A1's RM 69 and RM 51, both contradicting the RM 50
the same modal computes.

**Nothing to test against the balance truths.** No account balance, wallet
total, net worth or budget category total appears, so **RM 27,978.59,
RM 102,354.02, RM 98,476.23, the derived RM 444,958.84, and the
Dining/Shopping/Groceries totals do not arise.**

**Consistent naming ✓** — "Bank Account - Main" (add-goal funding source) and
"Bank Acc - Main" (commitment payment method) both reference the Main account,
matching Flows 4 and 7. **The abbreviation differs between the two screens**,
which is a minor formatting inconsistency rather than a data conflict.

**For the derive-don't-copy register:** the goal percentages are the *correct*
pattern — `pct = saved / target`, computed and right in both cards. A1's savings
figure is the wrong pattern — a prose number authored beside the calculation
that contradicts it.

## H. Charts and data displays — carry-over 9

**No raw-geometry charts in this Section.** Nothing here resembles G1's donuts
or G3's trend line.

The data displays are **progress bars** — on the goal cards and the goal detail.
The DS ships `ProgressBar`, and Flow 2 used `Progress bar indicator` as an
instance, so this is very likely covered.

**Stated honestly: unverified.** The goal progress bars sit **inside
`card/goals` instances** (`0:319`, `0:340`), whose internals `get_metadata` does
not expand. **I cannot confirm from this Section's data whether they are DS
component instances or raw geometry** — only that the card wrapper is a proper
instance. Flagged rather than assumed, per Flow 10's lesson that circular
indicators split both ways.

## I. Screen names vs content — carry-over 5

**All six names accurately describe their screens**, descriptive and unnumbered,
so **no interaction-order mismatch** in the Flow 8 sense.

**Siblings vs sequence, as asked:** screens 2 and 3 are **siblings** off the tab
page (goal detail, add-goal modal); screens 4→5→6 are a **genuine chain**. This
Section contains both patterns, and the naming reflects it — the chain's names
nest progressively (`…view commitment` → `…_smart insight` → `…_ education`)
while the siblings do not.

Only defect: A2's stray space.

## J. Copy-paste content — carry-over 8

**⚠️ The education overlay is lifted from Flow 6 — and this one is deliberate
pattern reuse, not a defect.**

`Finance_Plan_view commitment_smart insight_ education` is structurally
identical to Flow 6's `…_HighRiskTransfer01_Education`:

| Element | Flow 6 (fraud) | Flow 11 (savings) |
|---|---|---|
| Heading | "Why You're seeing this alert" | **"Why You're seeing this alert"** |
| Positive list | "What Monarch Checks" ×3 ☑ | "What Monarch Checks" ×3 ☑ |
| Negative list | "What Monarch does NOT do" ×3 ✕ | "What Monarch does NOT do" ×3 ✕ |
| Footer line | "Monarch alerts you, but you decide what happens" | "Monarch suggests and you decide." |
| Dismiss | "Got it" | "Got it" |

**This is a reusable explain-the-AI pattern applied consistently to two
different AI features** — good design system behaviour, and worth recording as
such rather than as duplication.

**But the defect travelled with it: A11's "Why You're seeing this alert"
capitalization quirk is identical in both.** Fixing it means fixing both
instances.

> ## 📌 FIX REGISTER — ONE entry, not two (Teku, 2026-08-05)
>
> **The "Why You're seeing this alert" capitalization error is a SINGLE
> fix-register entry covering both instances.**
>
> | | |
> |---|---|
> | **Instances** | Flow 6 `…_HighRiskTransfer01_Education` (`1266:14383`, text `0:198`) · Flow 11 `…_smart insight_ education` (`1266:14342`) |
> | **Disposition** | **FIX IN FIGMA** |
> | **Why one entry** | Reuse is **confirmed deliberate** (see the pattern table above). Fixing the source pattern fixes both. |
>
> **Do not file it as two defects.** Counting it twice would misrepresent both
> the effort and the nature of the problem — it is one authoring error in one
> reused pattern, not two independent mistakes.

**Also consistent with Flow 3 H and Flow 9 H:** the footer "Monarch **suggests**
and you decide" preserves the suggests-not-advises framing already flagged as
deliberate product behaviour.

---

# Flow 12 — `Onboarding`  ⚠️ **The §2.4 test case**

**Section node:** `1266:14345`
**Section URL:** `https://www.figma.com/design/v9MI8jxTaXiJA234Hkanlf/casestudy_02?node-id=1266-14345`

## 1. What it accomplishes

First-launch sign-up: country → IC scan → selfie/ID authentication → auto-filled
details → contact info → phone verification → password → accessibility settings
→ permissions → straight to Homepage.

## 2. Screens contained

**Ten screens**, all `<instance>` nodes. No non-screen children.

| Figma name | Node | Size | What it is |
|---|---|---|---|
| `Onboarding_01` | `1266:14346` | 375 × 812 | Splash — logo, tagline, **Sign Up / Log In** |
| `Onboarding_02` | `1266:14347` | 375 × 812 | **Country Of Residence** — `Select` |
| `Onboarding_03` | `1266:14354` | 375 × 812 | **Scan your IC** — instructions + checklist |
| `Onboarding_04` | `1266:14355` | 375 × 812 | **Camera** — capture front of IC |
| `Onboarding_05` | `1266:14348` | 375 × 812 | **Does everything look right?** — 5 auto-filled fields |
| `Onboarding_06` | `1266:14350` | 375 × 812 | **Add Your Contact Info** — phone + email |
| `Onboarding_07` | `1266:14351` | 375 × 812 | **Verify Your Phone** — 6-digit OTP |
| `Onboarding_08` | `1266:14352` | 375 × 812 | **Create A Password** — 2 fields |
| `Onboarding_09` | `1266:14353` | 375 × **1007** | **Make the app easier for you** — text size, contrast/theme, voice |
| `Onboarding_10` | `1266:14349` | 375 × 812 | **App permissions** — 4 toggles, **Finish Setup** |

## 3. Navigation order

**No wired prototype links verified.**

**A single genuine chain, no siblings, no branching** — the first Section in the
inventory that is purely linear.

`01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → Homepage`

**Visual order matches numbering exactly** — x = 108, 524, 940, 1356, 1772,
2188, 2604, 3020, 3436, 3852, a uniform 416px pitch. **The first Section where
numbered names, layout order and interaction order all agree.** (Flow 8's ran
opposite; Flow 10's looked sequential but were siblings.)

## ⚠️ 4. THE §2.4 ASSESSMENT — read this before the findings

**The numeric threshold IS crossed. The reasoning behind it is NOT. Both stated
plainly, because this is the most consequential state-layer question since P3.**

§2.4's trigger 2 was written as: *"A single flow exceeding ~6 steps with
back-navigation preserving partial input, particularly with branching step
order."*

| Condition | This flow | |
|---|---|---|
| More than ~6 steps | **10 screens / 8 declared steps** | ✅ **met** |
| Back-navigation preserving partial input | Every screen `02`–`09` has a back arrow; a sign-up wizard must not discard entered data | ✅ **met** |
| Branching step order | **None — perfectly linear** | ❌ not met |

**So the trigger fires on the letter of §2.4.** Recording that without hedging.

**But the condition the threshold was a proxy for does not hold.** §2.4's stated
rationale was *"the reducer gets big enough that a store's ergonomics start to
earn their keep."* What actually makes a wizard painful is **branching and
cross-step validation**, not linear length. This flow accumulates **one object
with roughly fifteen fields** — country, five IC fields, phone, email, OTP,
password, three accessibility settings, four permissions — filled in a fixed
order, with no conditional paths and no cross-step dependencies.

**A single form object in a route-scoped Context is exactly as tractable as the
same object in a store.** Zustand's real advantages — selector subscriptions,
no provider nesting — still do not bind: one provider, one screen mounted at a
time, ~15 fields.

**My reading: §2.4 should NOT flip on this.** The onboarding provider is one more
route-scoped Context, mounted as a layout route over the ten screens and
unmounted on completion — the D2 pattern from Flow 4, longer.

**⚠️ This is flagged for Teku's decision, not resolved here.** It is the one item
in the inventory where a stated trigger fires and the recommendation is to not
act on it. **That disagreement should be an explicit call, not a quiet
judgement.** Recorded either way:

- **If Teku accepts the reading:** Context, one onboarding flow provider. No
  change to any prior decision.
- **If Teku prefers to honour the trigger:** the §2.6 named-hook discipline
  already makes the swap contained — `useOnboarding()` changes implementation,
  screens do not change at all.

**New high-water mark: Flow 12 at 10 screens / 8 steps, linear.** Flow 6 retains
the record for *branching* complexity at five steps.

## A. Figma source inconsistencies — recorded, not corrected

**A1 — Date of Birth is in the FUTURE: "30/05/2026".** On `Onboarding_05`, an
auto-filled DOB dated 2026 — the file's own present. Impossible as a birth date,
and doubly wrong for a persona the case study presents as a senior.

**A2 — …and it is copy-pasted from Flow 11.** `30/05/2026` is the **exact value**
of Flow 11's add-goal **"Target date"**. A savings-goal target and a date of
birth have no reason to share a value. See J — **accidental leftover**, not
deliberate reuse.

**A3 — The phone number changes between consecutive screens.**
`Onboarding_06` captures **+60 198728300**; `Onboarding_07` states *"We've sent a
6-digit code to **+60175413564**"*. Two different numbers, one step apart, in the
flow whose entire purpose is verifying that number.

**A4 — The IC number does not encode the stated date of birth.** Malaysian IC
numbers begin with `YYMMDD`. The value shown is **764213034679** → `76-42-13`,
a **month of 42**. It is neither internally valid nor consistent with the DOB
field. *(Domain-plausibility observation, clearly labelled as such — not an
internal contradiction of the kind A1–A3 are.)*

**A5 — The progress indicator does not advance on the final screen.**
`Onboarding_09` and `Onboarding_10` show the same 8-of-8 state.

**A6 — Fourth distinct height for `header`.** `0:97` is **44** tall. The file now
uses 44 (here), 48 (Academy, Flows 5/6/7), 68 (Flow 5 select-token, Flow 7
detail), and `Header` at 64 and 112.

**A7 — 1px width inconsistency.** `Frame 325` (`0:126`) is **344** wide at x=16
where its sibling `Frame 324` is 343.

**A8 — Names are numeric, not descriptive** — `Onboarding_01`…`_10`. Flows 9, 10
and 11 all use descriptive names. **The file has two naming conventions**, and
this Section uses the one the Flow 4/5 rename moved *away* from. *(Recorded as an
inconsistency, not a defect — see I, where the numbering is otherwise exemplary.)*

## B. Detached instances — triaged

**⚠️ Scope limitation, stated up front: metadata was pulled for `Onboarding_01`
and `Onboarding_02` only.** The other eight screens were assessed from the render.
**This is a partial triage and should not be read as a clean bill for the
Section.**

**In the two screens examined: zero detaches.** Every component node is a proper
`<instance>` — `Status Bar`, `header`, `logo_monarch_L`, `Select`, `button`,
`Navbar/home indicator`, `navbar/mobile/section`, `Bottom Sheet`.

**⚠️ B1 — `logo_monarch_L` is a proper INSTANCE here (`0:45`, 150×150), which
further supports Flow 2 B3.** Flow 2 found it as a `<frame>` and could not
resolve detached-vs-custom from MCP data; Teku resolved it against the DS `Logo`
component. **This Section supplies same-file instance evidence** — the second
retroactive confirmation of this kind, after Flow 11 B1 did the same for
`❖ System message`.

## C. Non-screen content

**None.** All ten Section children are screens.

**Carry-over 7 — no nav labels to check, and the reason is structural.**
`navbar/mobile/section` is present-but-hidden on both examined screens (`0:55`,
`0:140`). **Onboarding is pre-authentication: there is no page for a nav item to
belong to yet.** No unfilled properties were visible on any of the ten renders,
and no stale layer names were found in the two screens examined.

## D. Cross-flow state — carry-over 1

**Does not contradict the endorsed derived reading of P1.** No task-completion
counter, no progress-tracking state, nothing that stores "N of 6".

**D1 — But this Section CREATES the data every other flow reads.** Name
(**"Margaret Consuella"** — consistent with the Homepage's "Hi, Margaret" ✓),
IC number, gender, DOB, address, phone, email, password, accessibility
preferences, permissions. **The user profile originates here.**

**Architecturally that is a WRITE to app-level state**, of the same shape as P3
and Flow 9 — but with a distinguishing property: it writes **once**, at the end
of the flow, and is thereafter read-only for the rest of the session.

**Still Context.** A route-scoped onboarding provider accumulates the form; on
**Finish Setup** it commits to the app-level profile. **No new mechanism.**

**D2 — Accessibility settings are the interesting write.** Text size, contrast/
theme and voice assistance are set here and would affect **every screen in every
flow** — genuinely global, and closer in kind to `ThemeProvider` than to
accounts. See F for the theme-mode observation.

**D3 — Flow-scoped step count: ten screens, eight declared steps, linear.** See
§4 above.

## E. Chrome — carry-over 2

**All ten screens: SUPPRESSED.** Confirmed by metadata on `01` and `02`
(`navbar/mobile/section` hidden), and by render on the remaining eight — none
displays a bottom nav.

| Screen | State | Basis |
|---|---|---|
| `Onboarding_01` | **SUPPRESSED** | `0:55` hidden; **Sign Up / Log In** occupy the slot |
| `Onboarding_02`–`_08` | **SUPPRESSED** | `0:140` hidden; **Next** button at the bottom |
| `Onboarding_09` | **SUPPRESSED** | **Save and Continue** at the bottom |
| `Onboarding_10` | **SUPPRESSED** | **Finish Setup** at the bottom |

**All fit cleanly. Running total: 44 screens, zero classification failures.**

**A distinct rationale worth recording.** Every other SUPPRESSED screen is
suppressed *despite* belonging to a page that owns a nav item. **These ten are
pre-authentication — there is no page for the nav to belong to yet.** Under the
rule's own framing ("one nav item = one page"), the nav is not merely hidden here
but **meaningless**. A clean fit, by a third route: not overlay, not layout
conflict, but **absence of the page concept entirely**.

## F. Colour hazard register — carry-over 3

**No new entries. Register stands at F1, F2, F3, F4, F5, F7; F6 resolved.**

Colour here is brand and semantic only — the splash's blue gradient with a white
`logo_monarch_L` instance, accent progress and toggles, and small permission
icons on `Onboarding_10` consistent with `IconObject`.

**⚠️ But one observation with real consequences, recorded here because it is a
theming finding rather than a colour hazard:**

**`Onboarding_09` offers THREE contrast/theme modes — Standard, Dimmed, High
Contrast — plus a user-controlled text-size slider (Small / Medium / Large).**

The MVP's `ThemeProvider` implements **light/dark only**, and the DS's dark layer
re-maps `--mapped-*` for exactly two themes (verified in the F6 CSS read: four
`[data-theme…]` blocks, all `--mapped-`).

**"Dimmed" and "High Contrast" are not the same axis as light/dark, and
user-controlled text scaling is a third axis again.** Whether the DS's token
layers can express these is **a 5.3 question, not an inventory answer** —
flagging it because it is the first evidence in the file that the app's theming
model may be wider than the DS's, and it surfaced in the very flow that
configures it.

## G. Data figures — carry-over 4

**Nothing to test against the balance truths.** No account balance, wallet total,
net worth or budget category total appears anywhere in this Section, so
**RM 27,978.59, RM 102,354.02, RM 98,476.23, the derived RM 444,958.84 and the
Dining/Shopping/Groceries totals do not arise.**

**Reconciles ✓ — identity data is consistent with the rest of the file**
- **"Margaret Consuella"** ✓ matches the Homepage's "Hi, Margaret" and Flow 3's
  "Personalized for Margaret"; plausibly the source of Flow 5's "Marge's Crypto"
- Email "Marcon@gmail.com" ✓ consistent as a contraction of the name

**Does not reconcile ✗** — A1 (future DOB), A3 (phone number changes between
consecutive screens), A4 (IC does not encode the DOB).

**For the derive-don't-copy register — and this Section splits the two cases
cleanly:**

| Defect | Derivable? | Disposition |
|---|---|---|
| **A3** phone mismatch | ✅ Yes — the verification screen's number is **by definition** the number entered one screen earlier. `otpTarget = contactInfo.phone` makes A3 structurally impossible. | **FIX IN CODE** (model it) |
| **A1 / A4** DOB and IC | ❌ No — a birth date and an IC number are **opaque input**, not functions of anything. Nothing computes them. | **FIX IN FIGMA** (correct the values at source) — same class as Flow 11 A1 and Flow 5 A7's invalid hex address |

## H. Data displays where internals do not expand — carry-over 9

**Flagged, not assumed.** Three displays whose identity cannot be determined from
the metadata pulled:

1. **The step progress indicator** (top of `02`–`10`). It sits **inside the
   `header` instance** (`0:97`, 375×44), whose internals `get_metadata` does not
   expand. It could be a **`ProgressStepper`** — which the DS does ship — or a
   `header` variant, or raw geometry. **Unverified.**
2. **The OTP entry boxes** on `Onboarding_07` — six segmented inputs. Not
   examined.
3. **The contrast/theme preview cards and text-size slider** on `Onboarding_09` —
   the previews render miniature UI mockups. Not examined.

**Per Flow 10's lesson** — `Progress ring indicator` was a DS component while
`Pie Chart` was raw geometry — **none of these is called either way here.**

## I. Screen names vs content — carry-over 5

**Numbering, layout order and interaction order agree perfectly** — the first and
only Section in the inventory where all three align. `01`→`10` at a uniform
416px pitch, matching the exact sequence a user walks.

**A genuine chain end to end, with no siblings** — also a first.

**The one weakness is A8:** the names are purely numeric and describe nothing.
`Onboarding_07` is "Verify Your Phone" but its name does not say so. **The
ordering is exemplary; the descriptiveness is not** — and those are separable
qualities, which Flows 9 and 11 achieved together.

## J. Copy-paste content — carry-over 8

**One accidental leftover, and it is distinguishable from deliberate reuse.**

**A2 — `30/05/2026` appears as both Flow 11's savings-goal Target date and this
Section's Date of Birth.**

**How I can tell it is accidental rather than deliberate**, per the instruction:

| Signal | Flow 11/6 education overlay (deliberate) | This (accidental) |
|---|---|---|
| Shared **structure**? | Yes — whole layout, list pattern, dismiss button | No — a single field value |
| Does the value **make sense** in both places? | Yes — both explain an AI feature | **No** — 2026 is a valid goal target and an impossible birth year |
| Adapted to context? | Yes — footer reworded per feature | No — copied verbatim |

**Deliberate reuse adapts; accidental leftover does not.** A2 fails every test
that Flow 11's overlay passes.

**No cross-flow text lifted otherwise**, and nothing in the class of Flow 8's
"Network Fee" heading.

> ## ✅ §2.4 — DECIDED (Teku, 2026-08-05): DO NOT FLIP
>
> **The rule's own rationale is branching / cross-step-validation complexity,
> not step count. This flow is linear with none of that.**
>
> **Onboarding stays Context** — one route-scoped provider over ten screens,
> unmounted on completion.
>
> **§2.6's named-hook discipline is the insurance.** If onboarding ever grows
> branching — per-persona paths, conditional KYC steps — `useOnboarding()`
> changes implementation and no screen changes at all.
>
> **This closes the only case in the inventory where a stated trigger fired and
> the recommendation was to not act on it.** Recorded as an explicit decision,
> not a quiet judgement.

> ## 📋 A1/A2 — grep result: NOT systemic for that string, but part of a cluster
>
> **Searched the full inventory for `30/05/2026`. Exactly two occurrences:**
>
> | Flow | Where |
> |---|---|
> | 11 | `…_add goal` — savings-goal **Target date** |
> | 12 | `Onboarding_05` — **Date of Birth** |
>
> **So it is NOT one systemic placeholder-date issue in the sense of appearing
> file-wide.** Two flows, one shared value.
>
> **However, a wider search for 2025/2026 dates shows it belongs to a
> DATE-HYGIENE CLUSTER of four related defects:**
>
> | ID | Defect |
> |---|---|
> | Flow 9 A5 | "January" section header over items dated **September 2025** |
> | Flow 9 A6 | Component sample reads **"15 Sept 2026"**; every screen shows **"15 Sept 2025"** |
> | Flow 11 A5 | **Three date formats** in one Section — "Oct 7, 2025", "15 Dec 2026", "30/05/2026" |
> | Flow 12 A1/A2 | DOB **30/05/2026** — future-dated, and shared with Flow 11's goal target |
>
> **Grouped as ONE fix-register cluster (SYS-7)** — they share a root cause
> (hand-authored dates with no single reference "today") and a single fix
> approach (pick one reference date and one format, derive the rest).

---
---

# 🏁 CLOSE-OUT SUMMARY

*Everything below compiles the twelve flow sections above. Findings are not
restated or reworded — they are indexed and dispositioned. **Original findings
stay exactly as written.***

---

## 1. Inventory status

| | |
|---|---|
| **Status** | ✅ **COMPLETE** |
| **Flows** | **12** |
| **Screens** | **56** |
| **Non-screen children** | **5** — Flow 2's stray home indicator, Flow 3's `Components` frame, Flow 9's annotation node + `Item/receipts` definitions, Flow 10's `Select` reference instance |
| **Chrome classifications** | **56 of 56 classified · ZERO failures** |
| **Sections deliberately excluded** | 1 — the dark-mode Homepage reference (§9) |

**Screens per flow:** Homepage 2 · Academy 2 · Assistant 5 · Bank transfer 4 ·
Crypto transfer 6 · Ai Alert 7 · Finance Overview 2 · Finance Transaction 2 ·
Receipts 7 · Budget 3 · Plans 6 · Onboarding 10.

> **Correction, recorded rather than quietly fixed:** running totals stated
> during the walk (28 after Flow 9, 34 after Flow 11, 44 after Flow 12) were
> **undercounts**. They were tallied from table *rows*, and several rows covered
> multiple screens — Assistant02–05 as one row, Flow 6's seven screens as one
> row. **The correct total is 56, and every one of the 56 classified cleanly.**
> The conclusion is unchanged; the arithmetic was wrong.

**File-wide structural facts, all verified:**
- **Every screen is an `<instance>`** — 56 of 56. 5.3 reads from main
  components, not Section placements.
- **Component names are unreliable** — `list/chart legend` never once rendered a
  chart legend across four different uses; `icon object` names four sizes and
  three roles.
- **Detaching is selective and deliberate**, with two distinct motives:
  detach-to-**edit-content** (Flows 3, 5, 9) and detach-to-**extend** (Flows 8,
  9 — `Tabs` needing a fifth tab).

---

## 2. FIGMA FIX REGISTER

**Teku's worklist. Nothing here has been acted on.**

**Grouping principle:** a defect that recurs identically across Sections is
**one** entry listing its occurrences, not one entry per occurrence — the same
reasoning applied to the shared education-overlay typo. Counting recurrences
separately would misrepresent both the effort and the nature of the work.

### 2a. Systemic entries — recur across multiple Sections

| ID | Description | Disposition |
|---|---|---|
| **SYS-1** | **Hidden stray `Tab` instance** beside the real `Tabs` — present in **all 12 Sections**, duplicated in Flows 8 and 9 | **FIX IN FIGMA** — delete; pure dead weight |
| **SYS-2** | **Hidden superseded text** — `"See all"` raw text under `❖ Link` instances, hidden `Frame 288`/`Line 2` pairs, hidden `Frame 445`, hidden `Slot`, hidden duplicate backgrounds. Flows 1, 2, 3, 5, 8, 9, 10, 11 | **FIX IN FIGMA** — cleanup pass |
| **SYS-3** | **Raw `text` where a component exists** — "Transactions" header (F1 A4), "Add New" ×2 (F11 A8), "How does Monarch detect this" (F6 A2), "See all" throughout | **FIX IN CODE** — the MVP uses the DS component regardless; Figma-side is optional hygiene |
| **SYS-4** | **`<divider 1px>` renders 5px** — Flows 5, 6, 7, 9 | **FIX IN FIGMA** — component name asserts a value it does not honour |
| **SYS-5** | **Subpixel / floating-point geometry** — `x=74.5`, `108.33333587646484`, `165.5`, `150.5`, `x=17.5`, `x=−42.5`, `2.27e-13`, `5.000000000000014`, `0.000006119594218034763`. Flows 2, 4, 5, 6, 7, 9, 10 | **FIX IN CODE** — round in implementation; not worth chasing in Figma |
| **SYS-6** | **Duplicate + nested-duplicate layer names** — `Bottom Sheet` inside `Bottom Sheet`, `Frame 455` inside `Frame 455`, `Frame 482` inside `Frame 482`, `Content` for two roles, `Frame 473` twice. Flows 2, 3, 5, 6, 7, 11 | **LEAVE** — Figma hygiene only; no code consequence |
| **SYS-7** | **DATE-HYGIENE CLUSTER** — F9 A5 ("January" over Sept-2025 items), F9 A6 ("15 Sept 2026" vs 2025), F11 A5 (three formats in one Section), F12 A1/A2 (future DOB `30/05/2026`, shared with F11's goal target) | **FIX IN FIGMA** — pick one reference "today" and one format; the values are opaque input, so nothing derives them |
| **SYS-8** | **Content overflowing the 812 frame by 78px** — `Frame 449` at 720/y=170 → 890. Flows 8, 9, 11 | **LEAVE** — scrolling content, correct behaviour |
| **SYS-9** | **Horizontal overflow rows** — carousels and chip rows exceeding 375 (F1 A12, F2 A10, F5 A10, F8 A5/A13) | **LEAVE** — intentional horizontal scroll |
| **SYS-10** | **`header` / `Header` height varies** — 44, 48, 68 / 64, 112 | **FIX IN CODE** — one component, size prop |
| **SYS-11** | **`Tabs` width varies** — 343, 306, 226, 428 | **FIX IN CODE** — fill-container |
| **SYS-12** | **4px header/content overlap** — `Frame 455` at y=88 or 108 beneath a 92- or 112-tall header. Flows 5, 7, 10 | **FIX IN CODE** |
| **SYS-13** | **Shared education-overlay typo** — "Why **Y**ou're seeing this alert" in **both** F6 and F11 overlays (deliberate pattern reuse) | **FIX IN FIGMA** — one fix at source corrects both |
| **SYS-14** | **AI/stock-asset filenames as layer names** — F1 A11 (vecteezy URL), F6 A1 (`ChatGPT Image Jan 4, 2026…`) | **FIX IN FIGMA** — will become filenames verbatim |

### 2b. Per-flow entries

| ID | Description | Disposition |
|---|---|---|
| **F1 A1** | Four tabs, only two have screens | **LEAVE** — resolved: Cards/Stocks show "coming soon" |
| **F1 A2** | Tab reads "Accounts", frame named `Homepage_Fiat` | **LEAVE** — node IDs authoritative |
| **F1 A5** | Duplicate `navbar/mobile/section` on Crypto (one hidden) | **FIX IN FIGMA** |
| **F1 A6** | **`{title}` placeholder in a live screen** | **FIX IN FIGMA** |
| **F1 A8** | `❖ Link` hidden on one section only | **FIX IN FIGMA** — decide intent |
| **F1 A9** | FAB 1px apart between screens (298 / 297) | **FIX IN CODE** |
| **F1 A10** | FAB occludes the Litecoin price | **FIX IN FIGMA** — layout decision |
| **F2 A1** | Header composed differently than Flow 1 | **FIX IN CODE** |
| **F2 A4** | Level badge "Lv3" over "Level 2: Pro User" | **FIX IN FIGMA** — verify intent |
| **F2 A5** | Progress bar 274 vs 273 | **FIX IN CODE** |
| **F2 A6** | Home indicator internal on 02, external sibling for 01 | **FIX IN FIGMA** |
| **F2 A7** | Screen 831 tall vs the 812 standard | **FIX IN CODE** — canvas artifact |
| **F2 A9** | FAB occludes search field / row text | **FIX IN FIGMA** |
| **F2 A11** | `list/chart legend` renders course rows | **LEAVE** — name only; code names it properly |
| **F2 A12** | `icon object` overloaded across sizes/roles | **LEAVE** — resolved: DS `IconObject` has size variants |
| **F2 A13** | `card/features and education` sized 3 ways | **FIX IN CODE** |
| **F2 A15** | Phone mockup overflows its parent by 70px | **LEAVE** — intentional |
| **F2 A17** | `❖ Link` visible on one card, hidden on its twin | **FIX IN FIGMA** |
| **F2 A18** | Button height 28 vs 40 | **FIX IN FIGMA** — confirm variant vs ad-hoc |
| **F2 A19** | Card-title capitalization inconsistent | **FIX IN FIGMA** |
| **F2 A20** | Category colour-coding | **LEAVE** — resolved as F6, token-backed prop |
| **F3 A1** | App behind the sheet is a flattened raster | **LEAVE** — mockup convention |
| **F3 A9** | Fraud copy hidden in the welcome sheet | **FIX IN FIGMA** — origin found (F6 A7) |
| **F3 A10** | "Invest safely and regularly" stale in 5 rows | **FIX IN FIGMA** |
| **F3 A13** | TYPO "Monarch **Aacademy**" | **FIX IN CODE** — copy corrected in implementation |
| **F3 A14** | TYPO lowercase "i" ×2 | **FIX IN CODE** |
| **F3 A15** | **Stock tickers swapped** — Bilibili↔Biogen | **FIX IN FIGMA** — opaque input, nothing derives it |
| **F3 A16** | Missing `%` on 5.6 / 7.3 | **FIX IN CODE** — formatter |
| **F3 A17** | Allocation total off by RM 269.16 | **FIX IN CODE** — derive (see §6) |
| **F3 A18** | Percentages sum to 100.1% | **FIX IN CODE** — derive |
| **F3 A19** | Gold 0.6% vs actual ≈0.44% | **FIX IN CODE** — derive |
| **F3 A20** | Crypto RM 107,354 vs RM 102,354.02 | **FIX IN CODE** — derive from source of truth |
| **F3 A22** | Spending percentages fabricated (amounts confirmed correct) | **FIX IN CODE** — derive |
| **F3 A23/A24** | `chips_prompt` height 48 vs 28; `icon object` third size | **LEAVE** |
| **F4 A1** | **No success screen** despite the naming | → **GD1** (§3) |
| **F4 A4** | `Homepage_Fiat` name collides across Sections | **LEAVE** — node IDs authoritative |
| **F4 A6** | "OTP" keyboards used for non-OTP input | **LEAVE** — Figma naming |
| **F4 A7** | Navbar repurposed as a 2-item control | **LEAVE** — resolved: this is the REPURPOSED state |
| **F4 A9** | `Bottom Sheet` handled 3 ways in one Section | **FIX IN FIGMA** |
| **F4 A13** | Error/helper states designed but never shown | **LEAVE** — states exist in the component |
| **F4 A16** | Merchants used as personal transfer recipients | **FIX IN FIGMA** — plausibility |
| **F4 A17** | "Big Pharmacy" name mashup | **FIX IN FIGMA** — opaque input |
| **F5 A1** | Three screens named `…Bank…` in the Crypto flow | **LEAVE** — superseded by rename |
| **F5 A2** | **No success screen** | → **GD1** (§3) |
| **F5 A4** | TYPO "Transfer **cypto**" | **FIX IN CODE** |
| **F5 A5** | Title "Select Token", subtitle describes the next step | **FIX IN FIGMA** |
| **F5 A6** | Wallet named "Marge's Crypto" vs "Marg's Wallet" | **FIX IN FIGMA** — pick one |
| **F5 A7** | **`0x9dj6…0fgm` is not valid hex** | **FIX IN CODE** — generate a valid address; note the divergence |
| **F5 A8** | Destination matches no listed recipient | **FIX IN FIGMA** |
| **F5 A9** | ETH unit casing "ETH"/"Eth"/"1.0656Eth" | **FIX IN CODE** — formatter |
| **F5 A16–A21** | Fee RM 4.50 vs 4.60; total 0.317 vs 0.3133; balance off RM 3.68; ETH 1.0642 vs 1.0616; tokens sum 5,117.70 short; Stellar = Uniswap | **FIX IN CODE** — all derivable (§6) |
| **F5 A22** | Screen 878 tall to seat the keyboard | **LEAVE** |
| **F6 A2** | Explainer link is raw text, and it is the flow's only branch trigger | **FIX IN CODE** |
| **F6 A4** | TYPO "detect this **?**" (space before `?`) | **FIX IN CODE** |
| **F6 A5** | GRAMMAR "Make **decision**" | **FIX IN CODE** |
| **F6 A8** | `Modal` wraps a "Bottom Sheet" that is a centred dialog | **LEAVE** — naming |
| **F6 A13** | "AFFIN" vs "AFFIN 003" | **FIX IN FIGMA** |
| **F6 A14/A15/A16** | "Bank **Of** America", "AL-RaJhi"; "Business **r**egistration"; `( Optional )` spacing | **FIX IN CODE** — copy |
| **F6 A19** | Recipient block overlaps its container | **FIX IN FIGMA** |
| **F7 A1** | "Total **Networth**" | **FIX IN CODE** — copy |
| **F7 A2** | Four tabs, one screen (Budget/Plans empty here) | **LEAVE** — both exist as their own Sections |
| **F7 A3** | `Finance_Overview02` is a detail, not an overview | **LEAVE** — naming |
| **F7 A4** | Crypto-flow copy hidden in a fixed-deposit view (9 nodes) | **FIX IN FIGMA** |
| **F7 A10** | Chart gridlines at x=343 with width 343 | **FIX IN FIGMA** |
| **F7 G** | **Stocks 98,476.23 vs 98,746** (digit transposition); FD principal + interest ≠ current value; two net-worth totals | **FIX IN CODE** — derive (§6) |
| **F8 A1** | **Filter sheet titled "Network Fee"** — lifted from Flow 5 | **FIX IN FIGMA** — visible heading |
| **F8 A2** | "Transaction Merchant" labels the **amount** slider | **FIX IN FIGMA** |
| **F8 A3/A4** | Fifth tab "Receipts" clipped; `Tabs` frame 428 wide | → **GV3** (§3) |
| **F8 A7** | Screens disagree on applied-filter count (4 vs 3) | **LEAVE** — different states |
| **F8 A8** | "This Month" / "last 7 days" / "Last 30 days" | **FIX IN CODE** — copy |
| **F8 A9** | Filter chips are `Field` instances | **LEAVE** — 5.3 mapping call |
| **F8 A14** | "Apply Filter (15)" vs 9 rows | **LEAVE** — unverifiable statically |
| **F8 A15** | KFC −RM 25.50 duplicates Caring Pharmacy | **FIX IN FIGMA** — plausibility |
| **F9 A1** | **"− RM 250.75.00"** — two decimal groups | **FIX IN CODE** — formatter |
| **F9 A2/A3** | Receipt fails against its items, subtotal, transaction **and** its photographed source | **FIX IN CODE** for the breakdown (derive); **FIX IN FIGMA** for the photo |
| **F9 A4** | CaringPharmacy receipt labelled "Aeon Big" | **FIX IN FIGMA** |
| **F9 A7** | "Save" paired with lowercase "cancel" | **FIX IN CODE** |
| **F9 A10** | Layer named "Title" renders "Date & Time" | **LEAVE** — stale layer name, not a visible placeholder |
| **F9 C** | **Nav renders "Label"** on `Finance_Add Receipts` — C1 fix incomplete | **FIX IN FIGMA** |
| **F10 A1** | **18% Left to Spend** vs computed 9.33% (Entertainment's 35% is correct) | **FIX IN CODE** — derive |
| **F10 A2** | **Donut centre RM 6,800 vs segments totalling RM 7,500** | **FIX IN CODE** — derive |
| **F10 A3** | `card/fixed deposit info` renders budget rows | **LEAVE** — naming |
| **F10 A4** | Six hidden "Budget" text leftovers | **FIX IN FIGMA** |
| **F10 A5** | 4-tab set here vs 5-tab in Flows 8/9 | **FIX IN FIGMA** — decide the tab set |
| **F10 A9** | FAB removed while navbar is merely covered | **LEAVE** — per-route config handles both |
| **F11 A1** | **RM69 banner / RM51 subtitle / RM50 computed** | **FIX IN FIGMA** — no correct value to derive |
| **F11 A2** | Screen name `…_ education` (stray space) | **FIX IN FIGMA** |
| **F11 A3** | GRAMMAR "How Monarch **find** savings" | **FIX IN CODE** |
| **F11 A4** | "Edit **Goals**" on a single-goal page | **FIX IN CODE** |
| **F11 A6** | "RM 5000.00" vs "RM250" in one modal | **FIX IN CODE** — formatter |
| **F11 A7** | "Manual Top Up" vs "Manual Top-Up" | **FIX IN CODE** |
| **F12 A3** | **Phone number changes between consecutive screens** | **FIX IN CODE** — `otpTarget = contactInfo.phone` |
| **F12 A4** | IC number encodes month 42 | **FIX IN FIGMA** — opaque input |
| **F12 A5** | Progress indicator does not advance on the final screen | **FIX IN FIGMA** |
| **F12 A7** | `Frame 325` 344 wide vs sibling 343 | **FIX IN CODE** |
| **F12 A8** | Numeric screen names vs descriptive elsewhere | **LEAVE** — ordering is exemplary |

**Disposition tally:** FIX IN FIGMA ≈ 40 · FIX IN CODE ≈ 45 · LEAVE ≈ 30.

---

## 3. GAP REGISTER — final form

### 3a. Rule-3 candidates

| ID | Gap | Occurrences | Status |
|---|---|---|---|
| **G1** | **Donut / pie chart family** | **3** — F3 Assistant03 allocation donut (7 segments) · F10 Budget `Pie Chart` (`0:379`) · plus **G3** below, which is the same decision | **OPEN — the strongest Rule-3 candidate in the inventory.** Confirm at 5.3; if it holds, it is DS-repo work in a separate session |
| **G3** | **Line / area trend chart** — F7's Total Networth card, raw `vector` + `line` + `ellipse` with axis labels and a data-point marker | 1 | **OPEN** — resolve **together with G1**; one charting decision, not two |
| **G2** | **Chat message bubble** — authored as a `symbol` inside F3's own Section, which says nothing about whether the DS ships one | 1 | **OPEN** — verify against DS public API at 5.3 |

> ### ⚠️ The DS-vs-raw-geometry discrimination rule — carry this into 5.3
>
> **Not every data display is a gap, and the name never tells you.**
>
> | Display | Verdict |
> |---|---|
> | F10 radial budget gauges | **`Progress ring indicator` INSTANCES — a DS component.** Not a gap |
> | F2 mastery progress bar | **`Progress bar indicator` INSTANCE.** Not a gap |
> | F3 / F10 donuts, F7 trend line | **Raw vector geometry.** Genuine candidates |
> | Anything called `list/chart legend` | **Never once rendered a chart** across four uses |
>
> **Establish a gap from what a node actually renders — never from what it is
> called, and never from it being circular.**

### 3b. Design gaps

| ID | Gap | Status |
|---|---|---|
| **GD1** | **Neither transfer flow has a success screen.** Flow 4 ends at amount entry; Flow 5 ends at review. Survived the rename. | **WHERE: settled** — build in the MVP as rule-4 composition of existing DS components. **Not a Rule-3 gap.** ⛔ **WHAT: pending Teku's spec** — content, summary rows, animation treatment, button labelling. **Not ready to build.** Blocks completion of Flows 4 and 5. |

### 3c. GV — 5.3 must verify

| ID | Item | Why unresolved |
|---|---|---|
| **GV1** | **`Modal`** — F6 (`0:159`, `0:178`, `0:162`) and F10 (`0:468`): `<frame>`s named `Modal` containing `Blanket` instances; the DS ships `Modal` | **No `Modal` instance anywhere in 12 Sections** — no same-file counterpart to compare against |
| **GV2** | **`Text area`** — F6 (`0:179`, `0:201`): used as read-only bordered detail boxes | That is **not** what a `TextArea` primitive does; the name may mislead |
| **GV3** | **`Tabs` tab-count constraint** — detached to **extend** to five tabs in F8 (`0:266`) and F9 (`0:288`), while F10/F11 use the 4-tab instance | Either the DS `Tabs` constrains count, or the Figma component lacks a 5-tab variant. **Different consequences; indistinguishable from MCP data** |
| **GV4** | **`card/goals` internals** — F11's goal progress bars | Sit **inside instances**; `get_metadata` does not expand them. DS component or raw geometry: **unknown** |
| **GV5** | **Onboarding step indicator** — inside the `header` instance (`0:97`) | Could be **`ProgressStepper`** (which the DS ships), a `header` variant, or raw geometry |
| **GV6** | **Onboarding OTP boxes** (`_07`) and **theme preview cards / text-size slider** (`_09`) | Not examined; internals unknown |
| **GV7** | **`card/fixed deposit info`** — F10 (`0:324`), a `<frame>` with a component-style name | **No instance counterpart in 12 Sections** |

---

## 4. STATE-LAYER SUMMARY — final form

### 4a. The shape

| Scope | Provider | Holds |
|---|---|---|
| **App-level** (above the router) | `ThemeProvider` | light / dark |
| **App-level** | **accounts** | fiat balances **and per-token crypto holdings — quantity *and* fiat value** |
| **App-level** | **steward** | conversation thread, **session lifetime**, not persisted |
| **App-level** | **receipts** *(or a widening of accounts — 5.3's call)* | receipt records and their link state |
| **Route-scoped** (layout route) | per-flow | F4 recipient/amount/from-account · F5 recipient/token/amount/fee · F6 identifier/bank/details/amount · **F12 onboarding form** |

### 4b. Writers and readers

| # | Writer | Written in | Read in |
|---|---|---|---|
| **W1** | **Account balance decrement** (P3) | F4, F5 transfers; F11 goal Top-Up | F1 Homepage · F2 Academy ("Your RM 27K") · F3 Assistant03 allocation · F7 Finance Overview |
| **W2** | **Receipt link state** | F9 link / unlink / delete / bulk save | F8 ledger indicators · F1 Homepage transaction rows |
| **W3** | **User profile + accessibility settings** | F12 Onboarding, committed once on Finish Setup | Every flow (name, avatar); accessibility affects all screens |
| **W4** | **Recipients** | F6 new-recipient form | F4 "Recent recipients" — *undetermined whether it persists* |
| **W5** | **Goals, commitments, budgets** | F10, F11 | Their own pages only — **no cross-Section reader found** |

**Non-writer, resolved:** **P1 — Academy's "3 of 6 completed" is a DERIVED value**,
computed from six real setup actions (goal created, Auto-Save toggled, …), not
stored state. **No writer needs to be built.** Formally provisional per the
standing rule; **Teku has approved building against this with confidence.**

### 4c. §2.4 — the Onboarding decision

**The trigger fired on the letter of the rule and was deliberately not acted on.**

| Condition | Flow 12 | |
|---|---|---|
| More than ~6 steps | 10 screens / 8 declared steps | ✅ met |
| Back-nav preserving partial input | back arrow on `02`–`09` | ✅ met |
| **Branching step order** | **none — perfectly linear** | ❌ **not met** |

**DECIDED: do not flip.** §2.4's rationale is *branching and cross-step-validation
complexity*, not step count. Ten linear steps accumulate **one object with ~15
fields** in a fixed order — as tractable in a Context as in a store. §2.6's
named-hook discipline (`useOnboarding()`) is the insurance if per-persona or
conditional-KYC branching ever appears.

### 4d. The conclusion that matters

> **⭐ NO FLOW IN THE INVENTORY EVER REQUIRED A STORE.**
>
> Twelve flows, 56 screens, five writers, four app-level providers and a
> route-scoped provider per transactional flow — **all of it Context + hooks.**
>
> Four amendments accumulated along the way (app-level accounts at P3, per-token
> holdings at F5 D1, receipts at F9 D1, the Onboarding decision at F12) and
> **not one moved the decision toward a library.** Each widened *what* is held or
> *where* a provider mounts; none changed *how* state is provided.
>
> The architecture proposal's §2.2 reasoning holds unchanged: the re-render and
> provider-nesting objections are load-dependent, and this load never came close.

---

## 5. CHROME RULE — final form

**Resolved by Teku's design intent, not inferred. Three formulations were
falsified by observation first** (transactional-based → hierarchy-based →
overlay-with-single-exception); all are retained as history above.

**The bottom nav is PAGE-level chrome. One nav item = one page — Home, Transfer,
Finance, More. It belongs to the page, not to individual screens.**

| State | Screens | Trigger |
|---|---|---|
| **PRESENT** | 7 | Root / tab-level page, nothing overlaid |
| **REPURPOSED** | 2 | The nav **slot** is reused as a functional control — F4 and F5 select-recipient, holding a 2-item **Recipients / Scan QR** control while the page's own Bank/Crypto tabs sit at the top |
| **SUPPRESSED** | 47 | Three distinct rationales below |

### The three SUPPRESSED rationales

| # | Rationale | Examples |
|---|---|---|
| **S1** | **Overlay coverage** — a bottom sheet, modal or the Steward sheet covers it. **Hiding the layer and covering it with a `Blanket` are the SAME state**; the nav is unavailable either way | F3 Assistant02–05 (layer visible, covered) · F8 filter sheet (layer hidden) · F9, F10, F11 modals |
| **S2** | **Layout conflict** — the screen carries primary/secondary action buttons at the bottom, occupying the nav's position | F7 account detail (Set Maturity Reminder / Download Statement) · F11 both drill-downs · F5, F6 form screens |
| **S3** | **Pre-authentication meaninglessness** — there is no page for a nav item to belong to yet | F12 Onboarding, all 10 screens |

> **The S1 insight is what dissolved three failed formulations.** SUPPRESSED is a
> **user-facing state, not a layer-visibility state.** The inventory had been
> reading layer flags instead of reading the interface, which made Flows 3 and 9
> look like exceptions. They never were.

### Implementation decision

**The app shell takes chrome state as EXPLICIT PER-ROUTE CONFIG —
`present` / `suppressed` / `repurposed` — not derived from screen structure.**

**Consequences, all recorded:**
- Nothing in the code asks *"does this screen have bottom action buttons?"*
- **N1 closes** — Academy and the Budget drilldown are SUPPRESSED **without** the
  S2 layout conflict. Classification right, rationale absent, **immaterial**.
- **N2 closes** — `Camera`'s full-screen takeover needs no named mechanism.
- The Assistant-vs-others layer-flag difference is **Figma authoring noise with
  no code meaning.**

---

## 6. DERIVE-DON'T-COPY TABLE — final form

**The rule:** record Figma values faithfully in this inventory; in the typed mock
data, **derive** every total, percentage and delta from one source of truth.
**Never transcribe a figure that is computable from another figure.**

**Why `.ts` over JSON:** a module can compute; a fixture can only hold what it
was given.

### 6a. Authoritative source values

| Quantity | Authoritative value | Established by | Contradicted by |
|---|---|---|---|
| **Fiat balance (Main)** | **RM 27,978.59** | F1 Homepage; F4 transfer arithmetic (27,978.59 − 2,550.00 = 25,428.59 ✓); F6 (− 10,000 = 17,978.59 ✓); F7 balance card | F3 "RM 27,978" (rounded) |
| **Crypto wallet total** | **RM 102,354.02** | F1 Homepage; F5 transfer arithmetic (102,354.02 − 5,800 = 96,554.02 ✓) | F5 token sum **97,236.32** ✗ · F3 **107,354** ✗ |
| **Stocks** | **RM 98,476.23** | F7 balance card | F3 **98,746** ✗ (digit transposition) |
| **Net worth** | **RM 444,958.84 — DERIVED, displayed on NO screen** | Sum of 7 holdings using each authoritative value | F7 **450,958.84** ✗ · F3 **449,958.84** ✗ (both inherit the RM 5,000 crypto error) |
| **Budget total** | **RM 7,500** | F10, reconciles as 700 + 6,800 ✓ and as the sum of 7 categories ✓ | F10 donut centre **RM 6,800** ✗ |
| **Groceries category** | **RM 1,800.00** | F10 — **five transactions sum EXACTLY**: 250.75 + 420.50 + 310.40 + 288.60 + 529.75 | — ✓ no contradiction |
| **Dining & Leisure** | **RM 1,200.00** | F10 and F3 Assistant04 **agree** ✓ | — |
| **Shopping** | **RM 350.00** | F10 and F3 Assistant04 **agree** ✓ | — |

### 6b. Every figure that must be computed

| Figure | Formula | Fixes |
|---|---|---|
| Wallet total | `sum(holdings)` | F5 token-sum shortfall; F3 A20 |
| Net worth | `sum(all holdings)` | F7 vs F3 disagreement |
| Allocation % | `holding / netWorth` | F3 A18, A19 |
| Allocation total | `sum(lineItems)` | F3 A17 |
| Receipt subtotal | `sum(items)` | F9 A2 — **makes it structurally impossible** |
| Receipt tax | `subtotal × rate` | F9 A2 |
| Receipt total | `subtotal + tax` | F9 A2 |
| Transfer new balance | `balance − amount` | already correct in F4/F5/F6 ✓ |
| Transfer total | `amount + fee` | F5 A17 |
| Budget % left | `available / total` | F10 A1 |
| Donut centre | `sum(segments)` | F10 A2 |
| Category % | `category / budgetTotal` | F3 A22 |
| Goal % | `saved / target` | already correct in F11 ✓ |
| Savings/year | `(current − suggested) × 12` | already correct in F11 ✓ |
| OTP target | `contactInfo.phone` | **F12 A3** |
| Spend delta % | `delta / previous` | F3 A22 |

### 6c. ⚠️ The exceptions — opaque input, NOT derivable

**These have no correct value to compute from. They belong at source.**

| Item | Flow | Disposition |
|---|---|---|
| `0x9dj6…0fgm` — invalid hex address | F5 A7 | **FIX IN CODE** (generate valid; note divergence) |
| Bilibili↔Biogen ticker swap | F3 A15 | **FIX IN FIGMA** |
| RM69 / RM51 promo copy | F11 A1 | **FIX IN FIGMA** — only the arithmetic is right |
| DOB `30/05/2026`; IC month 42 | F12 A1/A4 | **FIX IN FIGMA** |
| Merchant names on receipts/recipients | F4 A17, F9 A4 | **FIX IN FIGMA** |

> **Do not let the derive rule absorb these.** It fixes contradictions where a
> right answer is recoverable. Where none is, the fix is at source.

### 6d. The data spine

**Parts of this file are backed by genuine, internally consistent data.** F10's
five Groceries transactions roll up **exactly** to a category total that appears
identically in two unrelated Sections. Transactions → category totals →
percentages is a **real chain that already computes**.

**The fabricated figures are decorations on top of a working spine.** Modelling
the chain reproduces the file's correct values and eliminates its wrong ones in
the same stroke — **build on it rather than invent one.**

---

## 7. COLOUR REGISTER — final form

| ID | Source | Kind | Verdict |
|---|---|---|---|
| **F1** | Academy — 4 category card colours (Essentials blue, Crypto & Assets orange, Plan & Manage green, Safety purple) | Categorical | ⚠️ **HAZARD** — must resolve to token names or DS variant props, never hex in a data file |
| **F2** | Assistant03 donut — **7 asset-class series colours**, each rendered twice (ring segment + legend dot) | Categorical series | ⚠️ **HAZARD — the sharpest.** A 7-colour categorical series has no obvious home in a semantic token set |
| **F3** | Assistant03 legend — **the percentage TEXT is colour-coded** to match its series | Categorical, applied to type | ⚠️ **HAZARD** — colour is not confined to a decorative swatch |
| **F4** | Assistant04/05 — directional up/down indicators | Semantic | ⚠️ Low — maps to semantic tokens |
| **F5** | Ai Alert — red warning banner, red emphasis text, red recipient name, blue check / red cross pairs; recurring across Flows 8–11 as status colour | **Semantic**, not identity | ⚠️ **LOW** — encodes *meaning*, should map cleanly to DS danger/critical roles. Verify at 5.3 |
| **F6** | Finance Overview — balance-card category colours | **Token-backed prop** | ✅ **RESOLVED — NOT A HAZARD.** `IconObject` is a real DS component: 13 colours × circle/square × 5 sizes, `--brand-[color]-400` background, white icon via `currentColor`. **The colour is a variant name, never a literal** — it cannot reach MVP source or trip `lint:tokens`. Corroborated: exactly **13** `--brand-*-400` declarations in the shipped CSS |
| **F7** | Budget donut — 7 segment fills on a **raw-vector** `Pie Chart` (not a component) | Categorical series | ⚠️ **HAZARD, but LOWER than F2** — the palette **already exists** as token-backed category colours via `IconObject`. The chart can reuse those token names. **The hazard is only realised if someone hardcodes hex for the chart** |

### Zero-hazard patterns worth preserving

**Flows 4, 5, 8, 9 and 11 introduced NO colour hazard at all**, because identity
was carried by a **component** rather than a value:

- **DS `Logo`** — merchant marks (`aeon`, `caring`), bank codes, the MYR flag,
  and every crypto token (`bitcoin`, `ethereum`, `tether`, `stellar`, `uniswap`,
  `solana`, `litecoin`, `polygon`, `binance_coin`)
- **DS `IconObject`** with a token-backed colour prop
- **Photographs** — receipts, avatars, goal imagery

> **This is the shape F1, F2, F3 and F7 should be pushed toward: identity
> carried by a component, not by a hex value in a data file.**

### Theme-mode note

`--brand-*-400` are **static across themes** — verified from the shipped CSS:
four `[data-theme…]` blocks, **none** containing a `--brand-` declaration, all
four containing `--mapped-`. The dark layer re-maps only the semantic tier.

Icon-on-background contrast is therefore theme-independent by construction
(fixed `-400` behind a white `currentColor` glyph). What changes is the swatch
against the page surface. **Whether the mid-tones hold contrast on dark needs
the two-theme `getComputedStyle` check — 5.3 work, deliberately not concluded
here.**

---

## 8. PARKED FOR PHASE 6

| Item | Why parked |
|---|---|
| **Theme axis — Standard / Dimmed / High Contrast + user text scaling** (F12 `Onboarding_09`) | The DS token layers support **exactly two themes**. Expressing a third contrast axis is a **token-architecture decision, not Phase 5 build scope**. **Phase 5 ships light/dark only.** Recorded here rather than in the gap register — it is not a missing component |
| **Real AI inference via a serverless proxy** (F3 H) | Phase 5 uses **scripted responses driven by typed mock data** — no network call, no API token. The Hugging Face note stays on record as the Phase 6 starting point |
| **Desktop max-width for the mobile frame** | Inherited from `CLAUDE.md` — needs a DS token decision, grouped with the parked motion/elevation token layer |

---

## 9. Dark-mode reference — pointer only

**Section node: the dark-mode visualization of Homepage.**

**This is NOT a flow and has deliberately NOT been run through the inventory
format** — it is a **design-reference / QA artifact**, the same category
distinction as Phase 3's Foundations tab.

**Its only use: visual verification when building Homepage's dark theme at
5.3.** Compare rendered output against it in dark mode, per the standing
verification discipline (`getComputedStyle` and DOM assertions in both themes,
never screenshots).

**Nothing further is recorded about it, by decision.**

---

## 10. Open items entering 5.3

| # | Item | Owner |
|---|---|---|
| 1 | **GD1 content + layout spec** for the shared success screen — blocks Flows 4 and 5 | **Teku** |
| 2 | **G1 + G3 charting decision** — one decision, not two; DS-repo work if confirmed | 5.3, then a DS session |
| 3 | **GV1–GV7 verification** against the DS public API | 5.3 |
| 4 | **F1/F2/F3/F7 colour hazards** — resolve to token names or DS variant props | 5.3 |
| 5 | **`--brand-*-400` contrast on dark** — two-theme computed check | 5.3 |
| 6 | **Fix register** — ~40 FIX IN FIGMA items | **Teku** |
| 7 | **Receipts provider shaping** — own provider or a widening of accounts | 5.3 |
| 8 | **W4 recipients persistence** — do new recipients survive into F4's list? | **Teku** |

**STOP. Build order comes after Teku has read this close-out.**
