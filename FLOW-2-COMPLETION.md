# Flow 2 — completion record

**Flow 2 is the Monarch Academy: from Home's "Monarch Academy" band, open a learning hub with two tabs — App Guide
(a level card, six Essential Tasks, a New Feature Spotlight and sixteen feature tiles, each of which opens the screen
it names or says "Coming soon.") and Wealth Wisdom (a level card, a green nudge, three "Start here" tiles, three short
courses and a row of category chips).** (Figma Section `1266:14273`, frames `1266:14274` App Guide and `1266:14275`
Wealth Wisdom, file `v9MI8jxTaXiJA234Hkanlf`.) It was built in one MVP gate, `mvp-gate109`, after an MVP investigation
(Gate 107) and two DS releases, **v2.16.0** (DS Gate 108) and **v2.17.0** (DS Gate 110). **There is no MVP Gate 108,
no MVP Gate 110 and no MVP Gate 107 commit: 108 and 110 are the DS gates, and 107 was investigation only.** The last
build gate is `mvp-gate109` at `ec8039d628477a5fb54ada4de03cdd8900464a58`. This file records where the flow stands at
that commit. Gate 111 (this document) changed no code.

Every figure below carries one of three labels. **[disk]** — derived at Gate 111 from the repository (`git`, the source,
the committed baselines, `npx playwright test --list`, `npm run lint:tokens`) or read from a file named in the same
sentence. **[verified]** — Teku's own terminal, screenshot or walk, as the Gate 111 brief states it. **[reported]** — a
session or hand-over said so and it could not be re-derived without running the suite, a build or Figma. Where a
number is on no file other than this one, the sentence says so. §15 lists every premise of the Gate 111 brief that disk
qualified.

The per-gate detail lives in `CLAUDE.md` (the Gate 109 section) and in the gap register §2az. The DS side lives in the
DS repo's `CLAUDE.md` ("Gate 108 DS", "Gate 110 DS") and `CHANGELOG.md` (v2.16.0, v2.17.0). The hand-over reports are in
`D:\Claude\_handoffs\gate107-phaseA\` to `gate110-ds-phaseB\`. This file is the summary to read first.

**Rule for this file:** it holds no text, figure or hash taken from a receipt photograph. Every name, amount and
account number below comes from the seeded fixtures (`src/data/*.ts`) or the drawn frames, and is fictional.

**Where a ruling is attributed, the attribution is the source's own.** Rulings numbered `R10x-n` / `R11x-n` are the
review thread's (overturnable by Teku); decisions numbered without an `R` are Teku's, delegated where the source says
so. §5 gives the wording the records use; where this file and §2az differ, the register governs.

---

## Contents

1. [State at a glance](#1-state-at-a-glance)
2. [What Flow 2 is — scope and screens](#2-what-flow-2-is--scope-and-screens)
3. [How it works — navigation, derivation, chrome](#3-how-it-works--navigation-derivation-chrome)
4. [The data, and the seed's figures](#4-the-data-and-the-seeds-figures)
5. [The decisions and rulings](#5-the-decisions-and-rulings)
6. [Standards established](#6-standards-established)
7. [Figma-to-code lineage](#7-figma-to-code-lineage)
8. [Deviations from Figma](#8-deviations-from-figma)
9. [Deferred and open items](#9-deferred-and-open-items)
10. [Open decisions — Teku's](#10-open-decisions--tekus)
11. [The walk](#11-the-walk)
12. [Corrections to the record](#12-corrections-to-the-record)
13. [Process lessons](#13-process-lessons)
14. [What Flow 2 hands on, and the gate list](#14-what-flow-2-hands-on-and-the-gate-list)
15. [Premises of the Gate 111 brief that disk qualified](#15-premises-of-the-gate-111-brief-that-disk-qualified)

---

## 1. State at a glance

| | at `mvp-gate106` (Flow 2 start) | at `mvp-gate109` |
|---|---|---|
| tests | 1784 in 53 files | **1873 in 54 files** [disk, `--list`, Gate 111] |
| visual baselines | 572 | **592** [disk], all tracked |
| walk states (\|WALK\|) | 143 | **148** = 592 / 4 [disk]; 38 routes + 89 overlays + 12 stores [reported, `CLAUDE.md` Gate 109] + 9 non-default tabs (derived: 148 − 38 − 89 − 12) |
| routes (`ROUTES`) | 37 | **38** (`/academy`) [reported] |
| overlay / store states | 87 / 11 | **89 / 12** [reported] |
| DS pin | v2.15.0 (`ecefba21…`) | **v2.17.0** (`17972f28419d9aad51a634fff34736183acbf9a0`, `package.json:28`) [disk] |
| stored schema | v6 | **v6, unchanged** (`SCHEMA_VERSION = 6`, `src/persistence/schema.ts:79`) [disk] |
| `lint:tokens` | 134 files, 5 exemptions | **138 files, 5 exemptions** [disk, run at Gate 111] |
| git tags | 97 | **98** (`mvp-gate109`) [disk] |
| DS tests / files | 1,213 / 82 (v2.15.0) | **1,568 / 87** (v2.17.0; 1,367 / 86 at v2.16.0) [reported, DS `CLAUDE.md` Gates 108 and 110] |

Baseline digest at `mvp-gate109`, standing command, re-derived at Gate 111 [disk]:
`abb23d6b27f27f41966982deb10cddb84e3de103eca96863aeba21a226bd7869` (592 files; every one tracked).

**Flow 2's own footprint** (`mvp-gate106` to `mvp-gate109`): 20 baselines added, 8 changed, 0 deleted; 89 tests added
(1784 → 1866 at the build → 1873 after Phase B's two test-only fixes); one new spec file (`e2e/academy.spec.ts`, 49
tests); 50 staged paths in the Gate 109 commit (27 added, 23 modified; 29 PNG paths = 21 added + 8 modified, the 21st
added PNG being the Spotlight picture) [reported, Gate 109 Phase B §1 and LANDING.md]. The DS re-pin alone moved 0
baselines [reported].

**The thing to know first.** Flow 2 stores nothing. Every figure on the two screens — the level, the task list, the
nudge's "RM 27K" — is derived from data the app already holds, and the whole of the Academy's content is one data file
(`src/data/academy.ts`) outside the seed fingerprint. A tester is therefore never reset by it, and a later flow that
changes the ledger, the budgets or the recipients moves the Academy's figures with no Academy change. **All learning
content (lessons, quizzes, videos) is deliberately absent; those controls say "Coming soon." (Decision 41).**

---

## 2. What Flow 2 is — scope and screens

### 2.1 Scope

**Built:** two drawn screens on one route, the Home entries into it, the destinations from its tiles and tasks, and the
derived level / task / nudge figures. **Not built, and why:**

- **No lesson, quiz, video or course screen** (Decision 41; Gate 107 F1). The Academy is a hub: every drawn control with
  no destination raises "Coming soon." (the shell's `'coming-soon'` notice).
- **No stored progress** (R107-4): nothing measures learning, so Wealth Wisdom's level card says so (Decision 45).
- **No "+100XP" and no reward** (Decision 47; Gate 107 §5.2's incentive caution).
- **Eight of sixteen App Guide tiles have no screen** and say "Coming soon." (Decision 42; the table is §4.2).

### 2.2 Screens

| screen | route / state | Figma | built from |
|---|---|---|---|
| Academy — App Guide | `/academy` (tab `app-guide`) | `1266:14274` | `AcademyScreen.tsx`, `academy.css`; DS `Tabs`, `Field`, `CardSmartInsightsRow` (v2.16.0), `ProgressIcon` (v2.16.0), `ProgressBar variant="green"` (v2.17.0), `CardFeaturesAndEducation sizing="fill"`, `Button`, `NoResults` |
| Academy — Wealth Wisdom | `/academy` (tab `wealth-wisdom`) | `1266:14275` | the same; `CardSmartInsightsRow variant="green"`, `CardFeaturesAndEducation variant="outline"` with `kicker` / `accent`, `ChartLegendItem`, `ToggleChip` |
| no-match | `/academy` + search `zzz` | undrawn | `NoResults` (glyph `search`) |
| empty chip | Wealth Wisdom + "Taxes" | undrawn | one line, "Nothing on Taxes yet." |
| Home entries | `/` | the Home band | `HomepageFiat.tsx` (band, "Explore" link, three tiles), `HomepageScreen.tsx` |

**Header and chrome.** `HeaderDefault` titled "Monarch Academy"; the route's chrome is `{ nav: 'suppressed', fab: true,
statusBar: 'page' }` (R107-1) — the first route with no bottom bar and the Steward FAB showing.

**What App Guide shows, top to bottom:** the level card ("Your Monarch mastery", a green bar at done ÷ 6, a `Lv{n}`
badge, "Level {n}: {name}"); **Essential Tasks** (one row: the first undone task, "{done} of 6 completed", a "Set up
now" link); the **New Feature Spotlight** ("Introducing budgets", a picture of Monarch's own Budget tab, a white "See
budgets" button); a search field; and **Explore features** — four groups of four tiles.

**What Wealth Wisdom shows:** the level card ("Your learning", empty bar, "Lessons are coming soon.", no badge); a chip
row (All, Investing, Crypto, Taxes, Retirement); the green nudge ("You have RM {N}K in Main" / "Learn how savings
interest works (4 min)"); "Start here, Margaret" (three outline tiles); and "Short courses" (three rows).

---

## 3. How it works — navigation, derivation, chrome

### 3.1 Entries and Back

- **Entries (R107-5, Decision 59).** Home's promo band and its "Explore" link both open `/academy`. The band is a
  pointer target; the link inside it is the announced, keyboard control, so the band is not a second control. Home
  replaces its own history entry with its tab (`homeTab`, the Gate 87 mechanism) before pushing, so Back lands on Home's
  tab. **Phase B's B16 pins that the band, the link and Enter on the link each push exactly one entry** (§12).
- **Back from the Academy.** Opened directly (`location.key === 'default'`) Back replaces itself with `/`; otherwise it
  goes back through history.
- **Back from a tile or task destination (R109-7).** The Academy hands no tab over: only App Guide has destinations, so
  Back always lands on the default tab. The first Wealth Wisdom control that navigates brings the handover back in the
  Gate 87 shape.
- **Destinations select their own tab** through the existing location-state requests: `financeTab`
  (`requestedFinanceTab`), `transferTab` (`requestedTransferTab`), and `homeTab`. `src/flows/academy/academyTabs.ts`
  holds the Academy's own tab list; the literal default stays in the lazy initialiser because the harness parses it.

### 3.2 What is derived (R107-4 — nothing stored)

All six functions are pure and live in `src/data/derive.ts`:

- **`essentialTaskDone(task, store)`** — one rule per task. Task 1 (Make a transfer, **R109-1**): any row carries a
  `recipientId`, or any row is an outgoing (`amount < 0`) `kind: 'transfer'` with no `goalId`; seeded sends count. Task 2 (Add a
  recipient): a user-added recipient exists (`userRecipients.length > 0`). Task 3 (Set a budget): a budget exists. Task 4
  (Turn on auto-save): a goal has auto-save enabled (`autoSave.isEnabled`). Task 5 (Capture a receipt): the receipt
  library is not empty (`receipts.length > 0`; the seed's ten receipts count). Task 6 (Recategorise a transaction, **R109-2**): a
  `categoryRules` entry exists, or a seeded row's live category differs from its `TRANSACTIONS` category.
- **`essentialTasks`** — the six with their state; the card shows the first undone, or "Essentials complete" with no
  link.
- **`masteryLevel(done)`** — Decision 45's table, §4.1.
- **`thousandsOfRinggit(balance)`** — `Math.floor(balance / 1000)` (Decision 44), so "RM 27K" never overstates.
- **`filterAcademyTileGroups`** — the search (R107-3); **`filterAcademyCategory`** — the chips (R107-2).

### 3.3 Chrome and the FAB

`AppShell`'s notice lift now keys on `chrome.nav !== 'suppressed' || chrome.fab` (`AppShell.tsx:140`), so a "Coming
soon." on this route sits above the FAB, not across it. Measured at 375 and 430 [reported, Gate 109 Phase A2]: the FAB
at `[303, 660, 56, 56]` and `[358, 660, 56, 56]`; the last content ends at y 652 when scrolled to the bottom, 8 px
clear.

### 3.4 Tabs and the harness

The Academy's two tabs are in-screen `useState` (B7), so the URL is `/academy` for both. The harness derives
`/academy` and `/academy [tab:wealth-wisdom]` from `AcademyScreen.tsx` itself; `ACADEMY_STATES` adds `[overlay:no-match]`,
`[tab:wealth-wisdom] [overlay:taxes]` and `[store:essentials-done]` (a store preset built with the app's own
`recategorised`).

---

## 4. The data, and the seed's figures

### 4.1 `src/data/academy.ts`

Data only (type-only imports), outside `seedFingerprint` (R107-7). It holds the 16 tiles in 4 groups, the 6 tasks, the
level table, the chips, the start tiles, the courses, and the first name ("Margaret", a literal — R109-4).

| done | level | name |
|---|---|---|
| 0–1 | Lv1 | Getting Started |
| 2–3 | Lv2 | Explorer |
| 4–5 | Lv3 | Pro User |
| 6 | Lv4 | Monarch Master |

### 4.2 The sixteen tiles and their destinations (Decision 42)

| group | tile | opens |
|---|---|---|
| Essentials | Add Money | "Coming soon." |
| | Instant Transfers | `/transfer`, Bank tab |
| | Scheduled Payments | "Coming soon." |
| | Managing Accounts | "Coming soon." |
| Crypto & Assets | Buy and Sell Crypto | "Coming soon." |
| | Crypto Transfers | `/transfer`, Crypto tab |
| | Buy and Sell Stocks | "Coming soon." |
| | Monitor Asset Performance | `/finance`, Overview tab |
| Plan & Manage | Track Spending | `/finance`, Transactions tab |
| | Budgets | `/finance`, Budget tab |
| | Savings Goals | `/finance`, Plans tab |
| | Automated Savings | `/finance`, Plans tab |
| Safety & Support | Fraud Protection | "Coming soon." |
| | Smart Insights | "Coming soon." |
| | Spending Alerts | "Coming soon." |
| | Account Controls | `/settings` |

Eight tiles open a screen and eight raise "Coming soon." (counted from `ACADEMY_TILE_GROUPS`, `academy.ts:57-93`
[disk]). Home's three small tiles share ids with the App Guide's and do what those do (Decision 43): Track Spending →
Transactions; Buy and Sell Stocks and Smart Insights → "Coming soon.".

The six tasks' destinations (`ESSENTIAL_TASKS`, `academy.ts:120-125` [disk]): Make a transfer → `/transfer`; Add a
recipient → `/transfer/new`; Set a budget → Budget tab; Turn on auto-save for a goal → Plans tab; Capture a receipt →
Receipts tab (Decision 57); Recategorise a transaction → Transactions tab. Phase B's B17 pins each from a hard-coded
table, not the data.

### 4.3 What the seed shows

On the seed, tasks 1 (the seeded crypto transfers), 3, 4 (Bali Trip's auto-save) and 5 are done; 2 and 6 are not [disk,
register §2az; Gate 109 Phase B §5]. **4 of 6 → Lv3 "Pro User", card title "Add a recipient", "4 of 6 completed", the bar
at 66.7 %.** Main is RM 27,978.59 → **"You have RM 27K in Main"**; after a RM 1,000.00 send it reads **RM 26K**
[reported, Phase B live check]. After adding a recipient the card reads "5 of 6" and the next task is "Recategorise a
transaction"; recategorising one purchase gives "Essentials complete", **Lv4 Monarch Master**, no link
(`/academy [store:essentials-done]`).

### 4.4 The two pictures and the watermark

- **Spotlight picture** (`public/media/illustrations/spotlight-budgets.png`): **384 × 832**, 179,194 bytes, sha256
  `92b418e9…52aef` — a screenshot of Monarch's own Budget tab on the seed (light, 15 Aug 2026), resampled from a
  1125 × 2436 capture (R109-5). It is a picture of the seed and does not follow the user's budgets.
- **Level-card watermark** (`public/media/illustrations/academy-mark.svg`): 876 bytes, Figma's `Group 279` vector,
  shipped as an illustration (Decision 56 = A; the Decision 37 shield precedent). G84 stays open only as a DS-round
  question.

---

## 5. The decisions and rulings

### 5.1 Teku's decisions 41–59, as the register words them

Teku delegated Flow 2's calls to the review thread (19–21 Nov 2026); each delegated decision is overturnable. **Decision
54 is Teku's own** (20 Nov 2026, his answer to Gate 109's first-start fork, "DS fill option first" — Gate 109 Phase A's
addendum [disk]). The bases are the Gate 107 forks and the DS Gate 108 / 110 records.

| # | decision | date and whose |
|---|---|---|
| **41 = A** | The two hubs as drawn. No lesson, quiz or video screen; every drawn control with no destination raises "Coming soon." | delegated, 19–20 Nov |
| **42 = B** | App Guide tiles with an existing screen open it; the rest say "Coming soon." (§4.2) | delegated, 19–20 Nov |
| **43 = B** | Home's three tiles do what the same App Guide tile does | delegated, 19–20 Nov |
| **44 = B** | The green nudge: "You have RM {N}K in Main" / "Learn how savings interest works (4 min)"; tap → "Coming soon." | delegated, 19–20 Nov |
| **45 = B** | Levels from the Essential Tasks (§4.1); Wealth Wisdom: "Your learning", "Lessons are coming soon.", bar 0, no badge | delegated, 19–20 Nov |
| **46 = B** | The six Essential Tasks, each derived; title = first undone; "{done} of 6 completed"; all done: "Essentials complete" | delegated, 19–20 Nov |
| **47 = A** | No "+100XP" anywhere | delegated, 19–20 Nov |
| **48 = B** | Spotlight "Introducing budgets", Inverse "See budgets" → Budget tab; no device frame; a screenshot of Monarch's own Budget | delegated, 19–20 Nov |
| **49 = A** | "Start here, {first name}"; "Budgets" for "Smart budgets"; "Safety & Support" for "Safety & Smart Support" | delegated, 19–20 Nov |
| **50 = A** | "Short courses" for "Quick Wins (2 min reads)"; course lines without the leading bullet | delegated, 19–20 Nov |
| **51 = B** | The green row's leading slot takes the bare 32 px `insights` glyph; no `IconObject` success colour (no DS change) | delegated, 19 Nov (DS Gate 108) |
| **52 = B** | `.mn-card-features--outline` top-aligns its content (shipped in v2.16.0) | delegated, 19 Nov (DS Gate 108) |
| **53** | App Guide's level-card gradient ends on `--brand-blue-400`; Wealth Wisdom's runs violet-700 → violet-400; composed in MVP CSS | delegated, 19 Nov (DS Gate 108) |
| **54 = B** | The level-card bar is `ProgressBar variant="green"` (green-600 light, green-400 dark) | **Teku's own, 20 Nov** (DS Gate 110, v2.17.0) |
| **55** | Title Case for every tile label, including Home's "Buy and Sell Stocks" | delegated, 20 Nov |
| **56 = A** | Keep Figma's level-card watermark as an illustration; G84 stays open only as a DS-round question | delegated, 21 Nov |
| **57 = A** | Essential task 5 "Capture a receipt" opens the Receipts tab, not the add modal | delegated, 21 Nov |
| **58** | The chip categories and the empty line "Nothing on {topic} yet." as Phase A2 proposed (R107-2) | delegated, 21 Nov |
| **59 = A** | The promo band is a pointer target; the Explore link inside it is the announced control | delegated, 21 Nov |

The Gate 107 investigation's forks F1–F14 (`gate107-phaseA\REPORT.md` §6; F15 and F16 are DS Gate 108's) are the origin of 41–50; the numbering in the
register is the one to cite. **The next free Teku decision is 60.**

### 5.2 DS rulings behind the flow

**DS Gate 108, v2.16.0** (DS `CLAUDE.md` "Gate 108 DS" §0; review thread, 19 Nov 2026, overturnable):

| | ruling |
|---|---|
| R108-1 (F1) | All ten new glyphs are imported as Round (Gate 73 G46). Five are drawn non-Round: `security` Filled; `switch_account`, `tips_and_updates`, `emoji_events`, `smart_display` Outlined. Teku may swap those in Figma later |
| R108-2 (F2) | `Icon.test.tsx`'s registry-count test becomes 121 icons: 83 Material Round and 38 custom. (the build found a second test pinning the count, `Icon.xxxl.test.tsx:62`: one-literal edit) |
| R108-3 (F3 = A) | A new `CardSmartInsightsRow` in the Card family; `CardSmartInsights` untouched |
| R108-4 (F4 = A) | 58 tall for both variants; `green` carries a `--brand-scale-25` border in `--brand-green-500` |
| R108-5 (F5) | The row root is a `<button>` only with `onClick` and no `linkLabel`; with a link the link is the only control and the chevron is `aria-hidden`. A `linkLabel` on `green` is ignored |
| R108-6 (F7 = A + i) | A new `ProgressIcon`, 40 px only; `ariaLabel` makes it a `progressbar` with `aria-valuetext "{value} of {max}"`, else `aria-hidden` |
| R108-7 (F9 = A) | `CardFeaturesAndEducation` gains `kicker` and `accent` (`cyan` / `orange` / `red`); the accent applies on `outline` only; absent props render v2.15.0's markup byte-identically |
| R108-8 (F11 = A) | No Inverse prop; Inverse is the dark context (a `data-theme="dark"` ancestor). Composition documented and demoed |
| R108-9 (F14 = A) | `ChartLegendItem` unchanged; the MVP passes `amount=""` for the short courses |
| R108-10 (F16 = A) | `IconSize` gains `'xxl'` → `ElementWrapper` `xxl` (40 px), the Gate 104 `xxxl` shape |

**DS Gate 110, v2.17.0** (DS `CLAUDE.md` "Gate 110 DS" §0; review thread, 20 Nov 2026, overturnable):

| | ruling |
|---|---|
| Decision 54 = B | (Teku's own) `ProgressBar` gains a fill option so the level card's bar reads in both themes |
| R110-1 | `variant?: 'default' \| 'green'`, default `'default'`, byte-identical to v2.16.0 when omitted; `'green'` adds one class and nothing else |
| R110-2 | Light fill `--brand-green-600` (3.48:1 on the `#f2f2f2` track); dark fill `--brand-green-400` (7.12:1 on `#262626`). **Recorded divergence:** one step darker than Figma's `Green/400` in light, which is 1.90:1 and fails WCAG 1.4.11 |
| R110-3 | The `ProgressBar.css` comment and docs saying the default fill "dark-flips" and is Green/500 were wrong (`--mapped-surface-success-default` is `#226e3a` in both themes). Comment and docs only |
| R110-4 | No other prop, no `tone`, no hex, no new mapped token |

### 5.3 MVP rulings, by gate (review thread; each overturnable)

**Gate 107 — R107-1 to R107-8** (register §2az):

- **R107-1** `/academy` chrome `{ nav: 'suppressed', fab: true, statusBar: 'page' }`; the notice lift keys on `nav !==
  'suppressed' || fab`.
- **R107-2** The chips scroll sideways and filter Wealth Wisdom by category; the categories are Claude's (Inflation? and
  Diversification → Investing; "3 ways to save" and the nudge → All only; Investing 101 → Investing; Retirement planning
  → Retirement; Crypto: Risks & Opportunities → Crypto); Taxes has no item.
- **R107-3** The search matches tile labels and group names, case-insensitive; a group-name match keeps the group. No
  match: `NoResults`, "No features match".
- **R107-4** Nothing stored. Schema stays 6; no migration; no tester reset.
- **R107-5** Home's "Explore" link and the promo band open `/academy`; the link is the keyboard route.
- **R107-6** One DS gate first carries every gap Flow 2 needed — applied as DS Gate 108 (v2.16.0), then DS Gate 110.
  **Only that phrase is on disk;** the 19 Nov brief's fuller wording was not available to Phase A3 (§12).
- **R107-7** Content in `src/data/academy.ts`, data only, outside `seedFingerprint`.
- **R107-8** The stale "Gate 78" comments in `src/data/types.ts` and `goals.ts` now name Gate 109.

**Gate 109 — R109-1 to R109-7** (register §2az):

- **R109-1** Task 1 is done when a row carries a `recipientId`, or is an outgoing `transfer` with no `goalId`. **R109-2**
  Task 6 is done when there is a `categoryRules` entry, or a seeded row's live category differs from its seed category.
- **R109-3** "Start here, {first name}" is one colour (`SectionHeader` takes one string); Figma's second colour is a
  recorded divergence.
- **R109-4** The first name ("Margaret") is a literal in three files (Home, Finance, the Academy) and no profile record
  exists; one `PROFILE` constant read by all three is the retrofit session's work, not here.
- **R109-5** The Spotlight picture is 384 × 832, resampled from the 1125 × 2436 capture. **R109-6** The Spotlight card
  keeps Figma's 343 / 210 proportion (`aspect-ratio`): 210 tall at 375, 243.67 at 430.
- **R109-7** The Academy has no tab handover of its own (§3.1).

R107-1 to R107-8, R109-1 to R109-7, Decisions 41–59 and G77–G87 are in register §2az; R108-1 to R108-10 and R110-1 to
R110-4 are in the DS `CLAUDE.md` sections named above and **not in the MVP register** (this file's §5.2 is their MVP
home).

---

## 6. Standards established

1. **A hub with no content screens is a data file plus derivations, nothing stored** (R107-4, R107-7). Every figure on
   the screen is a pure function of data the app already holds; a flow that changes the data moves the figures for free.
2. **A tile that opens another flow's screen selects its tab through that screen's own location-state request**, never
   by a new route or a shared store; the entry screen replaces its own history entry first, so Back lands where the user
   was (the Gate 87 / R92-3 mechanism, used here for Home → Academy).
3. **"Coming soon." is the shell's one notice for an undrawn destination** (Decision 41), raised above the FAB on any
   route where the FAB shows (§3.3).
4. **A navigation's history shape is pinned by reading `history.state.idx`, not by reading the screen** (R103-17,
   reapplied by B16): "Back works" and "one entry was pushed" render identically.
5. **A "next task" link is pinned by its landing, once per task, from a hard-coded table** (B17), so a destination edit
   in the data fails a test that does not read the data.
6. **DS-first for a drawn capability, twice in one flow** (Decisions 54 and R107-6): DS Gates 108 and 110 shipped before
   MVP Gate 109's build, so its baselines were minted once and the re-pin moved 0.
7. **A mutation survivor is fixed test-only before the commit when a real path reaches the guard** (R106-9's rule,
   applied to A19 and E1; §12).
8. **A decision brief that a fix makes false is corrected in place, with the date** (the register's `2az` R107-6 line was
   edited at Phase A3 for this reason).

---

## 7. Figma-to-code lineage

| frame | what it is | route / state | component files | walk states |
|---|---|---|---|---|
| `1266:14274` | App Guide | `/academy` | `AcademyScreen.tsx`, `academy.css`, `academy.ts`, `derive.ts` | `academy` |
| `1266:14275` | Wealth Wisdom | `/academy` tab `wealth-wisdom` | the same | `academy-wealth-wisdom` |
| `935:8514` | the App Guide level card | in `1266:14274` | `AcademyScreen.tsx`; `ProgressBar variant="green"` | in `academy` |
| `324:372` | `CardFeaturesAndEducation` outline source | Wealth Wisdom "Start here" | DS v2.16.0 | in `academy-wealth-wisdom` |
| — | no-match, empty chip, the all-done card | undrawn | `NoResults`; the chip line; `essentials-done` | `academy-no-match`, `academy-wealth-wisdom-taxes`, `academy-essentials-done` |
| — | Home's band and three tiles | `/` | `HomepageFiat.tsx`, `HomepageScreen.tsx`, `insights.ts` | the eight Home baselines that changed (`index-*`, `index-transfer-*`) |

**Flow 2 baselines.** Gate 109 added 20 and changed 8; the 8 are the Home captures where the first tile's label became
Title Case "Buy and Sell Stocks", every differing pixel inside that label's box [reported, Gate 109 Phase A2]. The 20 added
are the five Academy states × 2 widths × 2 themes. The re-pin alone moved 0.

---

## 8. Deviations from Figma

| Figma | shipped | who |
|---|---|---|
| "Your Financial IQ" / "Level 3: Savvy Saver" / "Lv4"; "Level 2: Pro User" | "Your learning" / "Lessons are coming soon." / no badge on Wealth Wisdom; App Guide's level derived (Lv3 "Pro User" on the seed) | Decision 45 |
| "Set Up Auto-Save Goal / 3 of 6 completed" | the first undone task, derived ("Add a recipient / 4 of 6 completed" on the seed) | Decision 46 |
| "Introducing smart budgets" / "Watch Video (2 min)" | "Introducing budgets" / "See budgets" | Decision 48 |
| "Smart budgets", "Safety & Smart Support" | "Budgets", "Safety & Support" | Decision 49 |
| "Your RM 27K is ready for more" / "Start: High-Yield Basics (4 min)" | "You have RM {N}K in Main" / "Learn how savings interest works (4 min)" | Decision 44 |
| "Personalized for Margaret" in two colours | "Start here, Margaret" in one | Decision 49, R109-3 |
| "+100XP" | removed | Decision 47 |
| "Quick Wins (2 min reads)"; "• 6 Modules • 15 min" | "Short courses"; "6 Modules • 15 min" | Decision 50 |
| "Buy and sell Crypto / stocks", "Monitor asset performance", Home "Buy and sell stocks" | Title Case | Decision 55 |
| a phone device frame around the Spotlight picture | a screenshot of Monarch's own Budget tab, no frame | Decision 48 |
| the level-card fill `Green/400` in light | `green-600`, one step darker (1.90:1 fails WCAG 1.4.11; 3.48:1 passes) | R110-2 |
| the 108 × 108 fixed tiles | tiles hug: 92 tall at 375; at 430 76 or 92, so a row can differ | **G85** (DS) |
| the all-done state | undrawn; keeps the DS row's chevron though it leads nowhere | **G86** (DS) |
| a light track `#f2f2f2` | dark track `#262626` on the theme-invariant gradient cards | **G87** (DS; Figma draws no dark frame) |
| level-card height 100, task title line 20 | 96, 16 | `body/sm` is 16 px below 768 (Gate 78's finding), not a defect |
| the five non-Round glyphs | Round | R108-1 |
| the App Guide gradient end | `--brand-blue-400` | Decision 53 |

---

## 9. Deferred and open items

### 9.1 Gaps (register §2az; none closed by Flow 2)

| gap | what | state |
|---|---|---|
| **G77** | a refused crypto send is uncaught (`CryptoSendScreen.tsx:162`) | open, retrofit session; Gate 109 did not touch the file |
| **G78** | `ProgressIcon`'s arc is 2.12:1 on white; its dark track is invisible | open, DS round (contrast); the row's caption carries the count (R108-6) |
| **G79** | the white focus ring on a `green-500` surface is 2.56:1 (needs 3:1), as Figma draws it; reached by "See budgets" | open, DS round |
| **G80** | text-only `Button size="s"` pads 4 all round; Figma pads 4 / 12 (moves 5 MVP buttons) | open, DS round |
| **G81** | the kicker colours (cyan-600 3.70, orange-500 2.34, red-500 3.64) and the −400 tile glyphs on the light page, as drawn | open, DS round |
| **G82** | Figma resolves `border/default` to `#e7eaed`; the repo's token is `#e5e5e5` | open, DS round |
| **G83** | a `default` `CardSmartInsightsRow` rendered as a `<button>` sets no `color` (a bare `currentColor` glyph shows black in dark); unused by Flow 2 | open, DS round |
| **G84** | the DS has no artwork for the level-card watermark | open, DS round, only as a question (Decision 56 = A keeps the asset) |
| **G85** | the feature tile hugs where Figma fixes 108 × 108 | open, DS round |
| **G86** | `CardSmartInsightsRow` always draws the trailing chevron | open, DS round |
| **G87** | the dark `ProgressBar` track on the theme-invariant level cards | open, DS round |

Still open from earlier flows and reached here: G58, G60, G62, G63, G67, G75 (the "Demo data restored." notice), the 160
px shell reserve (the bottom of both Academy tabs ends at y 652, 8 px above the FAB).

### 9.2 Deferred — MVP side

- **R109-4: the `PROFILE` constant** (the first name in three files) — the retrofit session.
- **G77's fix** (R106-10's pattern on `CryptoSendScreen.tsx`) — the retrofit session.

### 9.3 Teku's Figma tidy-ups (not code)

- **The five non-Round glyphs** (R108-1): `security` Filled; `switch_account`, `tips_and_updates`, `emoji_events`,
  `smart_display` Outlined — Teku may swap them to Round in Figma so the file and the app agree.
- **The App Guide gradient end** to `blue-400` (Decision 53): the app ends on `--brand-blue-400`; the frame's end is
  Teku's to align. [reported — the brief names it as a tidy-up; Decision 53's text is on disk.]
- **The green nudge's leading badge** [reported — named in the Gate 111 brief; Decision 51 = B is the disk fact: the DS has
  no `IconObject` success colour, so the MVP passes the bare 32 px `insights` glyph].

### 9.4 DS round

- **DS records off by one:** the DS `CHANGELOG.md` v2.16.0 and `CLAUDE.md` "Gate 108 DS" §4 say **1,366** tests; the tag
  carries **1,367** (DS Gate 110's build measured it; DS `CLAUDE.md` line 3453 records the discrepancy). Fix in the DS
  records at a DS gate, not here. [disk]
- **G78–G87** as above.

### 9.5 Hygiene

- **The `CLAUDE.md` line "`e2e/academy.spec.ts` is LF, not CRLF as Phase A2's report says"** (line 21176) is true of the
  committed **blob** (0 CR, 502 LF) and **false of the working tree** (502 CR, 502 LF) [disk, Gate 111]. Phase A2's report
  is right about the working tree. The line is left as written (§12).
- **`npm` advisories:** the MVP's `npm ci` prints **3 high-severity** (Gate 109 build and Phase B); the record said 2 at
  Gate 85. The DS's `npm ci` prints **7 (3 moderate, 4 high)** (DS Gate 108 Phase B), where the DS record says 0 at its
  Gate 40. Not Flow 2's; the hygiene round's. [reported]
- **The DS showcase scrolls sideways at 375** (`scrollWidth` 656 against `clientWidth` 375), identically on v2.16.0 and
  v2.17.0 — pre-existing, not introduced by Gate 110 (DS Gate 110 Phase B §6 and §9). [reported]
- **41 DS guard pins live outside the repo:** DS Gate 108's 113 markup pins are in a temporary spec; only the 72
  `CardFeaturesAndEducation` pins are committed (`CardFeaturesAndEducation.kicker.test.tsx`). The other 41
  (`ChartLegendItem`, `Button`, `IconObject`, `CardSmartInsights`) rely on that temporary spec plus those components' own
  tests; nothing in the repo pins them (DS Gate 108 build report §9, item 6). [reported]

### 9.6 Phone walks still owed

A real-phone walk is **outstanding or unstated** for the flows below, as each flow's own record reads at `mvp-gate109`
[disk]. Whether any has been done since is on no file.

| flow | what its record says |
|---|---|
| Flow 4 | "A real-phone walk of Flow 4 is unconfirmed" — Teku's walk was on the live site in a desktop browser at phone width (`FLOW-4-COMPLETION.md` §10) |
| Flow 5 | "unconfirmed" — Teku walked the live site on 7 Nov 2026 and reported "all tests good"; "whether that was on a phone is not stated"; iOS focus (G58) is device-only (`FLOW-5-COMPLETION.md` §10) |
| Flow 6 | "unconfirmed" — Gate 103 Phase B's live check was headless Chromium (`FLOW-6-COMPLETION.md` §10) |
| Flow 11 | **silent** — `FLOW-11-COMPLETION.md` carries no phone-walk statement. Gate 81-C's record says Teku saw two items on his device in a 7 Oct walk (`CLAUDE.md` Gate 81-C), which is not a walk of the flow |
| **Flow 2** | **done — 23 Nov 2026, passed [verified]** (§11) |

---

## 10. Open decisions — Teku's

None is open for Flow 2. Everything the flow needed was decided or delegated (§5.1), and **the next free Teku decision is
60**. Three DS-round questions are recorded as "Decision: none yet" in the register — G85 (does the tile fix its
height), G86 (a DS prop to omit the chevron, or the MVP accepts it) and G87 (the dark track) — and are the DS round's,
not Flow 2's.

---

## 11. The walk

`D:\Claude\_handoffs\gate109-phaseB\WALK.md` is the 17-step script (from Home: the band and Explore, both tabs, four tiles
that open screens and two that say "Coming soon.", "See budgets", "Set up now", a chip and the empty chip, a search with no
match, Back from a destination, dark mode, the nudge before and after a send, the optional Lv4 case) [disk].

**Teku walked it on his phone on 23 Nov 2026 and it passed** [verified — as stated in the Gate 111 brief; no file other
than this record carries the result]. He asked about two behaviours, and **both are as designed** [disk]:

1. **A task link opens Transactions.** Task 6, "Recategorise a transaction", opens the Transactions tab
   (`ESSENTIAL_TASKS`, `academy.ts:125`; **R109-2**; Phase B's B17 pins it). It becomes the card's next task once the
   other five are done — on the seed after adding a recipient (WALK.md step 17).
2. **Eight tiles say "Coming soon."** Exactly eight of the sixteen have no destination (§4.2, **Decision 42**); the other
   eight open a screen.

Phase B's own live check (census dev server, 375 × 812, DPR 2, touch taps, 58 checks, light and dark) passed with 0 console
errors [reported]. Both are headless Chromium, which cannot see iOS focus (G58).

---

## 12. Corrections to the record

All insert-only; the earlier text is left as written.

- **The `CLAUDE.md` line "`e2e/academy.spec.ts` is LF, not CRLF as Phase A2's report says"** (line 21176) was written at
  Gate 109 Phase B from the staged blob. **Re-checked at Gate 111:** the blob is LF (0 CR / 502 LF; `HEAD:e2e/academy.spec.ts`
  = `136c78403e4751d27e0ae4f6cd779e9f1841a843`) and the working-tree file is CRLF (502 CR / 502 LF; `git hash-object` gives the
  same blob). Phase A2's "all new text files are CRLF like their neighbours" is right about the working tree. The Gate 109
  landing report recorded this too (`LANDING.md` §7).
- **Phase B's "42 tests" and "1866 in 54 files" in the Gate 109 section and register §2az** are the Phase A3 figures; the
  committed totals after Phase B's fix are **49** and **1873**. The Phase B record says so in place.
- **A8 and A10 mutate the data B4's titles are built from,** so B4 renames itself and cannot fail; N1 (and B7 for A8) are
  the tests that pin them. And X7 (Home's "Buy and sell stocks") survives B7 because Playwright's `hasText` is
  case-insensitive; N1 asserts the exact title. (Gate 109 Phase B §6, §10.)
- **R107-6's fuller wording is on no file.** Phase A2 had the ruling as missing; Phase A3 recorded the phrase and its
  application (DS Gate 108, then 110). The brief it came from is not on disk.
- **The DS records say 1,366 tests at v2.16.0; the tag has 1,367** (§9.4).
- **A first run of Gate 109 Phase B was voided and killed** (a needle dry-run touched census files while a full run was in
  flight; test 114, `capture-name.spec.ts:102`, failed at that moment). It is not evidence either way; the three clean runs
  that count are of the fixed tree (1873 passed / 0 failed / 0 flaky, 4,369 / 4,506 / 4,673 s) [reported].
- **R108-2 named one existing test that pins the DS icon count; there were two** (`Icon.test.tsx` and
  `Icon.xxxl.test.tsx:62`) — DS `CLAUDE.md` "Gate 108 DS" §3.
- **There is no MVP Gate 108 or 110, and Gate 107 has no tag or commit.** `git tag -l 'mvp-gate10*' 'mvp-gate11*'` lists
  `mvp-gate101`, `103`, `105`, `106`, `109` only [disk].

---

## 13. Process lessons

1. **A census dev server can serve a stale module after files are copied into it.** The Vite watcher missed a copied
   `chrome.ts` and Gate 109's first Home measurement was void and re-taken on a restarted server. After copying into a
   running census, check the served module, not the file on disk (`CLAUDE.md` Gate 109, "Harness, tests and baselines").
   [disk]
2. **Check a census out with `core.autocrlf=false`.** A plain `checkout-index` smudges to CRLF under this machine's global
   `autocrlf=true`; the DS Gate 108 and MVP Gate 109 Phase B censuses both used `git -c core.autocrlf=false checkout-index`
   (DS Gate 108 Phase B §2; Gate 109 Phase B §2). [disk]
3. **A needle dry-run must not overlap a full run.** It touches census files, the Vite watcher reacts, and a test in
   flight fails (Gate 109 Phase B, top and §10). [disk]
4. **A Netlify screenshot can show the previous deploy.** An old-looking screenshot was explained by the deploy having
   been Published before the tag was pushed. [reported — the brief's account; nothing on disk records the screenshot]
5. **A session citation carried forward must be re-read before it is cited.** Two examples: **R97-9** is in the DS commit
   message and the Gate 97 fix report only, in neither DS document (`FLOW-5-COMPLETION.md` §5.2, §11) [disk]; and
   **"Gate 31 item 3"** exists in `CLAUDE.md` only as the heading `### Item 3 — the net-worth card reverted to
   blue-to-teal, on a design ruling` (line 1840), and what claim was carried against it is on no file [reported] — read
   the heading, not the reference.
6. **A mutation that does not typecheck is refused, not run** (the driver's typecheck gate; every Gate 109 proof ran
   exactly one test, failed on an assertion, restored byte-identical and re-passed) [disk]. Two further notes from the
   same phase: the test that proves a mutation must be named after what it checks, not what the mutation edits (A8 and
   A10 above), and a survivor is an instruction, not a statistic (A19 and E1 were real gaps).
7. **The close-check scripts must not go silent for long** (Gate 105; Gate 111's `staged` mode runs the digest in one
   process and prints a progress line before it).

---

## 14. What Flow 2 hands on, and the gate list

### 14.1 Hands on

- **Lessons, quizzes and videos** are the next content work if Teku ever wants them; every control is wired to "Coming
  soon." and replaceable one at a time. The level card for Wealth Wisdom is the place a real measure of learning goes.
- **Anything that changes the ledger, budgets, goals, recipients or receipts moves the Academy's derived figures**
  (levels, the task list, "RM 27K") with no Academy change; later flows should keep `essentialTaskDone`'s six rules in
  mind (§3.2).
- **The retrofit session owns** R109-4 (`PROFILE`) and G77.
- **The DS round owns** G78–G87 and the DS record's 1,366 / 1,367.
- **Persistence:** nothing of Flow 2 is stored; `seedFingerprint` and the schema are unchanged.

### 14.2 The gate list

In opening order. Numbers follow when a gate **opened**.

| gate | repo | what | commit / tag | date | tests at close |
|---|---|---|---|---|---|
| **107** | MVP | Flow 2 investigation, Phase A only; forks F1–F14; **no commit, no tag** | — | report last written 2026-11-18 [disk, file time] | 1784 in 53 (measured) |
| **108 DS** | DS | ten glyphs and `Icon xxl`, `ProgressIcon`, `CardSmartInsightsRow`, `kicker` / `accent`, outline alignment | `v2.16.0` `5c58b77b6c7a2ce14715140334a68049004f0835` (tag object `810bb7abc94057de6beaa62a56dce10f141beac1`) | 2026-11-20 | 1,367 / 86 (DS) — **27 mutations proved** (26 + the added test's M01n) |
| 109 (first start) | MVP | stopped before the census: the level bar's fill differed from Figma and neither fill passed 3:1 in both themes (§8); Teku chose "DS fill option first" (Decision 54 = B, 20 Nov) | — | 2026-11-20 | — |
| **110 DS** | DS | `ProgressBar variant="green"` | `v2.17.0` `17972f28419d9aad51a634fff34736183acbf9a0` (tag object `e3ac097c319476d4fa7b27fea7cda335415f755d`) | 2026-11-20 | 1,568 / 87 (DS) — **31 mutations proved**, 3 expected non-proofs, 0 survivors |
| **109** (restart: Phase A2, A3, build, Phase B, landing, close) | MVP | Flow 2, Monarch Academy; Decisions 41–59; re-pin v2.17.0; Phase B fixed A19 and E1 test-only (49 tests in `academy.spec.ts`) | `mvp-gate109` `ec8039d628477a5fb54ada4de03cdd8900464a58` (tag object `dd50c407b4241238fb316d209a3e25adea52f813`) | A2 2026-11-20/21, A3 and build and Phase B 2026-11-21, landing 2026-11-23, commit 2026-11-23 22:50 +0800 | **1873 in 54** / 592 — **38 mutations proved** |
| 111 | MVP | this record (documents only) | `mvp-gate111` (Teku tags) | 2026-11-23 | 1873 in 54 / 592 |

The last gate before Flow 2 is `mvp-gate106` (`0c7346a5bb3c0cb36cea6f0ad24a2f7c40640f53`, tag object
`59bb442fa51b77d0dea5afb231cc55d3726b935a`). DS commit dates are the commits' own (`5c58b77`: 2026-11-20 01:43 +0800;
`17972f2`: 2026-11-20 18:13 +0800) [disk].

---

## 15. Premises of the Gate 111 brief that disk qualified

1. **Every §0 premise held** — clean tree; `HEAD` = `origin/main` = `mvp-gate109^{}` = `ec8039d6…`; 98 tags; 1873 tests in
   54 files; 592 baselines at the quoted digest; `SCHEMA_VERSION = 6`; pin `#v2.17.0`; DS clean at `v2.17.0^{}` =
   `17972f28…` with 39 tags; register next free `2ba` / `G88` / decision 60. Nothing stopped.
2. **"Decisions 41–59: 54 Teku's own, 20 Nov; the rest delegated 19–21 Nov."** Holds. The register's own phrase is
   "19–20 Nov" for the intro and "Delegated 21 Nov" on 56–59; Decision 55 is "delegated 20 Nov".
3. **"R107-1…8, R108-1…10, R109-1…7, R110-1…4."** All exist by number. R108 and R110 are in the **DS** repo's `CLAUDE.md`,
   not the MVP register (§5.3). R107-6's fuller wording is on no file (§12).
4. **"Mutation counts: DS Gate 108 27; DS Gate 110 31; Gate 109 38."** All three hold. DS Gate 108's table shows 26 proved
   plus the added test's M01n; DS Gate 110's is 31 proved with 3 expected non-proofs; Gate 109's 38 excludes the refused
   negative control and the equivalent X2.
5. **"DS 1,213 → 1,367 → 1,568."** Holds as the tags' counts; the DS records for v2.16.0 say 1,366 (§9.4).
6. **"Phone walks still owed for Flows 4, 5, 6 and 11, if the record shows them outstanding: check, don't assume."**
   Flows 4, 5 and 6 say "unconfirmed" in their own records; **Flow 11's record is silent** (§9.6). Whether any has been
   walked since is on no file.
7. **"The Netlify screenshot"** and the **"Gate 31 item 3"** citation are carried from the brief and could not be
   verified on disk (§13).
8. **The "41 DS guard pins outside the repo"** is DS Gate 108's build report §9 item 6; it is a statement about a
   temporary spec, not a number the DS repo itself holds.
9. **The "task link opening Transactions" question** is about task 6, which is not the first undone task on the seed; the
   seed's first task is "Add a recipient" (`/transfer/new`). It opens Transactions once the other five are done (§11).
