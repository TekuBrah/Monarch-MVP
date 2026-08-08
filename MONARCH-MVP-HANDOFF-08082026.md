# Monarch MVP — Handoff, 2026-08-08

**Phase 5, Step 5.3 — Flow Build Loop. Flow 7 of 12: `Finance_Overview`.
PART A COMPLETE. PART B NOT STARTED.**

Continues `MONARCH-MVP-HANDOFF-08072026.md` (the DS v1.1.0 catch-up) and
`MONARCH-MVP-HANDOFF-08052026.md` (Flow 1 — Homepage). Both stand as written;
neither is restated here except where this session closed one of their items.

**Nothing was built this session.** Reconnaissance, measurement and decisions
only. The branch exists and is empty.

Every figure below comes from a command run fresh at close — `git status`,
`git branch`, `git log`, `git rev-list`, `package.json`, `package-lock.json`,
`npm run lint:tokens`, `npm run build` — plus live `getComputedStyle` /
`get_design_context` reads. Nothing is carried from session memory.

---

## CURRENT STATE — verified fresh

| Check | Result |
|---|---|
| Branch | `phase/5-flow07-finance-overview` |
| Created off | `main`, this session. **The only git write made.** |
| Working tree | **CLEAN** — `git status --porcelain` returned empty |
| Commits on the branch | **ZERO** — `git rev-list --count main..HEAD` = `0` |
| HEAD | `36681b5` — "New handoff 8072026" |
| `git rev-parse HEAD` vs `main` | **identical** (`36681b589ee084b4730fd9a959ac4d995bcafedb`) |
| Branches on disk | `main` · `fix/flow01-trend-direction` · `phase/5-flow01-homepage` · `phase/5-flow07-finance-overview` |
| DS dependency (spec) | `github:TekuBrah/Monarch-Design-System#v1.1.0` |
| DS dependency (resolved) | `git+ssh://…#e4df2df2cdb7d26acb5a14c2fa5680186287e653` |
| `npm run lint:tokens` | ✅ PASS — 25 files, exit 0 |
| `npm run build` | ✅ exit 0, 3.64s |

**The branch is a pure fork point.** It carries no changes at all. A fresh
session starts Part B against a tree byte-identical to `main`.

`fix/flow01-trend-direction` is still on disk and still redundant (open item 10
of the previous handoff). Teku's to delete; not touched here.

---

## 🔴 1. FIRST ACTION OF THE NEXT SESSION — the v1.2.0 bump

**Part B cannot build until the design system ships two capabilities this
session established are missing.** Both are decided as DS work, not MVP
workarounds (§4). The DS session that adds them is what `v1.2.0` is.

**This repo is still on `v1.1.0`. The bump has NOT been executed here.**
Verified above from `package.json` and `package-lock.json`, not assumed.

> ⚠️ **This handoff cannot confirm that `v1.2.0` exists yet.** The MVP repo has
> no visibility into the DS repo's tags. Check the DS repo's own handoff before
> running the bump; if the tag is not there, the DS session has not happened and
> Part B is still blocked.

### The bump procedure, and why the obvious version of it fails

`MONARCH-MVP-HANDOFF-08072026.md` §1 documents this failure in full and it will
recur. Editing `package.json` from `#v1.1.0` to `#v1.2.0` and running
`npm install` reports:

```
up to date, audited 115 packages
NPM INSTALL EXIT: 0
```

…and installs **nothing**. npm sees an existing lockfile entry for the git
dependency and does not re-resolve it. **Exit zero is not evidence.**

What actually works — an explicit, targeted install of that one dependency:

```bash
npm install "github:TekuBrah/Monarch-Design-System#v1.2.0"
```

It takes ~1 minute (fetches from GitHub, runs the DS's `prepare` script to
rebuild `dist/`).

### Verify with a probe, never with the exit code

Four independent checks, all of which must pass:

1. **`package-lock.json` pins a NEW commit hash** — it must no longer read
   `e4df2df2cdb7d26acb5a14c2fa5680186287e653`. This is the single most
   important check.
2. **`dist/index.css` contains the scroll affordance** — grep `.mn-tabs` for
   `overflow-x` and for `scrollbar-width` / `::-webkit-scrollbar`.
3. **`dist/components/Card/CardBalance.d.ts` declares `onClick`.**
4. **`tsc` sees the new types** — a temporary root-level `__typeprobe.ts` that
   imports and constructs the changed props, then
   `npx tsc --noEmit --skipLibCheck --strict __typeprobe.ts`, then delete it.
   This is the method that proved the v1.1.0 types; reuse it verbatim.

> **`CLAUDE.md`'s standing tsc/Vite split condition applies.** Vite compiles DS
> **source** via the local alias; `tsc` reads the installed **dist** types. They
> agree only while the installed tag matches the local `../Design system test`
> checkout. **After bumping the tag, the local DS checkout must also be on
> v1.2.0**, or Vite renders new source against old types — or worse, renders
> *old source* while tsc reports new types, with a completely green build.

---

## 2. Flow 7 Part A — reconnaissance, complete

Both screens read from Figma via the **local desktop MCP only**
(`http://127.0.0.1:3845/mcp`), reachability proven by an authenticated
`whoami` round-trip returning real user data — not an open-port check.

- Section `1266:14330` · `Finance_Overview01` `1266:14331` (main component
  `1128:12398`) · `Finance_Overview02` `1266:14332`
- Also re-pulled for the arithmetic: `1266:14396` (Flow 5 select-token, main
  `1128:12400`) and `1266:14403` (Flow 1 Homepage_Crypto)

Full derivations live in this session's chat history. Conclusions only below.

### A1 — DS component mapping: clean

Flow 7 is the first Section with **zero detached instances**, and that holds.
Every `<instance>` maps to a shipped DS component:

| Figma | DS |
|---|---|
| `Header` (screen 01, 112 tall) | **`HeaderBg variant="compact"`** — verified from DS *source*: renders avatar + centred title + notification button with dot badge over a `background` slot and a scrim. Node-for-node what Figma draws. |
| `header` (screen 02, 68 tall) | `HeaderDefault` — `title` / `subtitle` / `hasSubtitle` / `onBack` |
| `Status Bar` | `StatusBar mode="Light"` (screen 02 only; `HeaderBg` includes its own) |
| `Tabs` / `Tab` | `Tabs` — **capability gap, see A2** |
| `card/balance` ×8 | `CardBalance` — **no `onClick`, see §4** |
| `card/data display` ×4 | `CardDataDisplay` (`info` / `content`; all four leave `content2` off) |
| `icon object` (in cards) | `IconObject` |
| `icon object` (FAB) | shell-owned, already built |
| `Label` · `❖ Link` · `<divider 1px>` · `button` ×2 | `Label` · `Link` · `Divider weight={1}` · `Button` |
| `navbar/mobile/section` | shell chrome (`BottomNavigation`) |
| trend chart (raw vectors) | `LineChart` — G3 closed DS-side at v1.1.0 |

**Four things Figma does NOT author as components** — all are MVP rule-4
compositions, none is a rule-3 gap: the net-worth hero card, the FD hero card,
the trend chart's container, and the three label/value rows on screen 02.

**The eight balance cards, verbatim:**

| type | name | amount | `IconObjectColor` | glyph |
|---|---|---|---|---|
| Bank Account | Fixed Deposit | RM 150,000.00 | **teal** | `Icon_bank` |
| Bank Account | Main | RM 27,978.59 | **teal** | `Icon_bank` |
| Investment | Stocks | RM 98,476.23 | green | `icon_stocks` |
| Investment | Unit Trust | RM 52,150.00 | green | `icon_stocks` |
| Investment | PRS | RM 12,000.00 | green | `icon_stocks` |
| Assets | Gold | RM 2,000.00 | **yellow** | `icon_gold` |
| Crypto Wallet | Marge's Wallet | RM 102,354.02 | orange | `icon_crypto` |
| Crypto Wallet | Fun Wallet | RM 5,000.00 | orange | `icon_crypto` |

⚠️ **Category colours are teal / green / yellow / orange — not "bank/blue,
assets/gold".** All four resolve exactly to `--brand-{hue}-400` and all four are
legal `IconObjectColor` values.

**Screen 02's field values, verbatim:** Principal Amount `RM 125,000` · Interest
Rate `3.5% p.a` · Start Date `15 Dec 2023` · Maturity Date `15 Dec 2026` ·
Current Value `RM 150,000` · Accrued Interest `RM 3,750` · Remaining Tenure
`15 Months`. Buttons: primary **Set Maturity Reminder**, secondary **Download
Statement**, both 343×48.

**The nine hidden Flow 5 crypto leftovers (F7 A4) were seen and excluded.**
Confirmed present and `hidden="true"` at exactly the recorded IDs — `0:114`,
`0:124`, `0:134` / `0:117`, `0:127`, `0:137` / `0:118`, `0:128`, `0:138`.
Registered FIX IN FIGMA. Do not build them.

### A2 / GV3 — `Tabs`: five tabs YES, overflow scroll NO

Read from DS source and measured live at 375×812 on cloned nodes carrying the
DS's own shipped CSS.

- **Five tabs: supported.** `TabsProps.tabs: TabItem[]` — no count constraint
  anywhere; roving tabindex already computes from `tabs.length`. **GV3 resolves
  in favour of "the Figma component lacks a 5-tab variant", not "the DS
  constrains count".**
- **Horizontal overflow scroll: not supported.** `.mn-tabs` is two lines
  (`display: flex; align-items: center`). No `overflow-x`, no `gap`, no scroll
  affordance.

Measured with the five real labels in a 343px host: natural row width
**426.44px** (Overview 88.92 · Transactions 111.88 · Budget 75.98 · Plans 65.25
· Receipts 84.41), `.mn-tabs` box 343 / `scrollWidth` 426, computed
`overflow-x: visible`, last tab's right edge at **426.44** — **spilling 83px
past the phone frame, unclipped and unreachable.** The tabs cannot shrink:
`flex-shrink: 1` is defeated by `min-width: auto`, and "Transactions" is a single
word, so each tab is floored at its natural width.

**Resolved as DS work (§4).**

### A3 — the crypto wallet arithmetic: RESOLVED FROM EVIDENCE

Flow 5's token list, re-pulled from Figma this session (main `1128:12400`):

| Token | Wallet caption | Value | Quantity |
|---|---|---|---|
| Bitcoin | Marg's Wallet | RM 46,059.31 | 0.098279 BTC |
| Ethereum | Marg's Wallet | RM 25,588.51 | 1.3786 ETH |
| Tether | Marg's Wallet | RM 15,353.10 | 3,630.00 USDT |
| Stellar | **Fun Tokens** | RM 5,117.70 | 3,372 XLM |
| Uniswap | **Fun Tokens** | RM 5,117.70 | 77.15 UNI |

`src/data/accounts.ts` matches this to the cent and to the wallet. Nothing drifted.

```
Marge's drawn:  46,059.31 + 25,588.51 + 15,353.10 = 87,000.92
Marge's required (Flow 7 card)                    = 102,354.02
                                        DEFICIT   =  15,353.10   ← exactly Tether

Fun drawn:       5,117.70 + 5,117.70              = 10,235.40
Fun required (Flow 7 card)                        =  5,000.00
                                        EXCESS    =   5,235.40
```

**Both of the prompt's premises verified independently:**
- Flow 3 A20 is **not** a defect. 102,354.02 + 5,000.00 = **107,354.02** =
  Assistant03's "Crypto Wallets RM 107,354" ✓
- The inventory's derived 444,958.84 + Fun Wallet 5,000.00 = **449,958.84** =
  Assistant03's net worth, to the cent ✓
- Flow 3 A17: 98,746 − 98,476.23 = 269.77; − 0.59 − 0.02 = **269.16** ✓

**Fun Tokens: both drawn values are wrong, provably.** If either row's
RM 5,117.70 were correct the other would have to be **−117.70** to reach
5,000.00. A negative holding is impossible, so Flow 1's shipped "one row was
pasted over the other" explanation cannot survive the two-wallet split. Neither
drawn value has authority. RM 5,000.00 is corroborated twice (Flow 7's card,
Assistant03's total); RM 10,235.40 zero times.

**Marge's: no individual value is wrong.** BTC and ETH are cross-confirmed;
Tether's implied rate is **RM 4.2295 / USDT**, a correct USD/MYR for a dollar
stablecoin. Closing the deficit by restating Tether alone would imply
RM 8.459 / USDT — not defensible.

**Check 1 settled it.** Flow 1's `Homepage_Crypto` "My Tokens" section contains
**exactly two `Item/list` instances** (Bitcoin, Ethereum). Its only other
children are `Frame 288` (`0:384`) and `Line 2` (`0:385`), both hidden — and
`Frame 288` returns from `get_metadata` as a **self-closing element with zero
children**, an empty 311×44 leftover at y=92 overlapping the Ethereum row. It
carries no text, no logo, no value. **There is no concealed sixth holding
anywhere in the file.** The file draws five crypto holdings in total.

→ **Resolution: M2 + F1** (§4).

### A4 — `--brand-*-400` contrast, both themes

Token read from a freshly-inserted probe, animations finished with the
`try/catch` guard, `document.documentElement.dataset.theme` flipped between
reads. Ratios are WCAG relative luminance.

**Correction to the standing premise:** the swatches do not sit on
`--mapped-surface-page`. Figma puts each `IconObject` inside a `card/balance` on
`surface/elevation/default`, and that grid on `surface/subtlest/default`.

**Swatch vs surface — the parked concern points at the wrong theme:**

| Category | Hue | Light (page / subtlest / elevation) | Dark (page / subtlest / elevation) |
|---|---|---|---|
| Bank Account | teal `#33bdea` | 2.19 / 2.08 / 2.19 ❌ | 9.61 / 8.50 / **6.92** ✅ |
| Investment | green `#60c680` | 2.12 / 2.02 / 2.12 ❌ | 9.89 / 8.75 / **7.12** ✅ |
| Assets | yellow `#ffd633` | 1.41 / 1.34 / 1.41 ❌ | 14.92 / 13.20 / **10.75** ✅ |
| Crypto | orange `#ffa16c` | 1.99 / 1.89 / 1.99 ❌ | 10.57 / 9.35 / **7.61** ✅ |

**All four PASS on dark with margin. All four fail on light.** The close-out
parked this as a dark-mode risk; it is not one.

**White glyph on the `-400` swatch — identical to two decimals in both themes**
(verified by measuring both), because `IconObject` pairs a fixed `-400` fill
with a white `currentColor` glyph and the dark layer re-maps only `--mapped-*`:

| Hue | Ratio | ≥3:1 | ≥4.5:1 | | Hue | Ratio | ≥3:1 | ≥4.5:1 |
|---|---|---|---|---|---|---|---|---|
| purple | 4.18 | ✅ | ❌ | | gray | 1.64 | ❌ | ❌ |
| blue | 3.34 | ✅ | ❌ | | slate | 2.36 | ❌ | ❌ |
| red | 2.86 | ❌ | ❌ | | violet | 2.46 | ❌ | ❌ |
| **teal** | 2.19 | ❌ | ❌ | | cyan | 2.03 | ❌ | ❌ |
| **green** | 2.12 | ❌ | ❌ | | lime | 1.50 | ❌ | ❌ |
| **orange** | 1.99 | ❌ | ❌ | | **yellow** | 1.41 | ❌ | ❌ |

**Counts: 2 of 12 clear 3:1 (purple, blue); 10 of 12 do not. 0 of 12 clear
4.5:1.** All four Flow 7 hues are in the failing set.

> ⚠️ **VERDICT, QUALIFIED — do not triage this as an AA blocker.** SC 1.4.11
> covers graphics *required to understand the content*. Every balance card
> writes its category as text beside the badge — "Bank Account", "Investment",
> "Assets", "Crypto Wallet" — so glyph and colour are **redundant with the
> label**, not sole carriers. **These are legibility observations, not AA
> failures on this screen.** The finding worth the DS session's attention is
> narrower: the white-on-`-400` pairing is low-contrast in 10/12 hues in both
> themes and no theme change can help it, which matters only where the glyph
> ever becomes the sole carrier of meaning (icon-only control, unlabelled
> legend swatch). A ramp question (`-500`, as work item A already did for
> `Card`), not a conformance blocker. **Flow 7 is unaffected either way.**

### A5 — inherited scaffolding

- **`chrome.ts` supports `suppressed`** (`NavState` at `chrome.ts:22`) and
  `AppShell.tsx:50` gates on `chrome.nav === 'present'`, so anything else
  renders no nav. **Flow 7 is NOT its first consumer** — `/steward` already uses
  it (`chrome.ts:59`), verified live in Flow 1 §3c. Flow 7 is the first consumer
  *with a real screen behind it*.
- **Accounts provider** is `{ fiatAccounts, primaryAccount, cryptoWallets,
  cryptoHoldings, cryptoTotal, cryptoChange, transactions }` — one `FiatAccount`,
  five `CryptoHolding`s, no writers. Needs a `Holding` union across
  bank / investment / asset / crypto-wallet with per-type field sets for B4,
  plus `netWorth` and per-holding series. **Additive; no call site changes.**
- **`TrendIndicator`** is available (DS v1.1.0, `dist/index.d.ts:48`) but
  **imported nowhere in MVP source**. It reaches the DOM only through
  `ListItem`'s `trendDirection` at `HomepageCrypto.tsx:71` and `:94`. Flow 7
  would be the first direct call site.
- **`src/components/` does not exist.** The promotion bucket is still empty.

### The four follow-up checks

**Check 1 — Flow 1's `Homepage_Crypto` token list.** Answered under A3. No sixth
holding exists. Featured Coin names **Solana SOL RM 4,465 (+250.68%)**,
**Litecoin LTC RM 4,129 (+225.72%)**, **Polygon MATIC RM 2,004 (+175.37%)** —
these are *prices*, not holdings (`types.ts:142` already draws that line).
*Incidental:* the file now reads **`LTC`** on the Litecoin row. Flow 1's handoff
§6 recorded Figma as labelling it `SOL`. Either it was fixed at source or the
earlier read hit a different node — **open item 5's first half looks closable,
Teku to confirm.**

**Check 2 — the MVP already has a horizontal scroll row.**
`.mvp-home__carousel` at `homepage.css:195` (`overflow-x: auto`,
`scroll-snap-type: x proximity`, `-webkit-overflow-scrolling: touch`, children
`flex: 0 0 auto`). Measured live: `scrollWidth 543` vs `clientWidth 375`,
`maxScrollLeft 168`. **It does NOT implement the scrollbar rule** — computed
`scrollbar-width: auto`, **zero** `::-webkit-scrollbar` rules in any loaded
stylesheet (MVP or DS). No bar is visible today only because this environment
paints overlay scrollbars; on a classic-scrollbar platform it would take ~15px
of row height. **Also: `tabIndex: -1`** — the region is not keyboard-focusable,
so a keyboard user already cannot scroll it. Both fold into Flow 7's diff (§4).

**Check 3 — Flow 1 made no DS card tappable.** `CardSmartInsights` is rendered
without `onLinkClick`; `CardFeaturesAndEducation` without `onClick`; the Academy
promo's `Link` has `onClick={(e) => e.preventDefault()}`, an explicit no-op.
**There is no precedent governing `CardBalance`.** The one adjacent precedent is
the shell's FAB (`AppShell.tsx:37`) wrapping a non-interactive `IconObject` in an
MVP `<button>` with an MVP-owned `:focus-visible` ring (`AppShell.css:67`) —
narrow, one control, in the shell. It does not scale to nine cards.

**Check 4 — the gradient tier does not cover either card.** The complete
`--gradient-*` family is **two tokens**, neither redeclared in any
`[data-theme…]` block:

| Token | Value |
|---|---|
| `--gradient-default` | `linear-gradient(0deg, #ffffff 10%, #ffffff80 100%)` |
| `--gradient-subtle` | `linear-gradient(0deg, #ffffff 0%, #ffffff00 100%)` |

Both are vertical white-to-transparent **scrims**. The net-worth card is a
109.36° blue ramp; the FD hero a 126.85° teal ramp. Different kind of object —
**no match**, so the `#0caaff` precedent applies (§4).

*Positive finding worth keeping:* the two tokens match Flow 7's scrims **exactly,
to the value** — screen 01's nav scrim is `--gradient-subtle`, screen 02's bottom
action scrim is `--gradient-default`, and Figma's own style list names them
`Gradient/subtle` and `Gradient/default`. ⚠️ Both hardcode `#ffffff` and never
dark-flip, so screen 02's action scrim will be a **white fade over a dark page**
in dark mode. Same family as E-3 / E-4. **Not Flow 7's to fix** — flagged so it
is not later mistaken for a build error.

---

## 3. Corrections this session made to the incoming brief

Recorded so a fresh session does not re-derive them or trust the stale version.

1. **Category colours are teal / yellow**, not blue / gold.
2. **`suppressed` already has a consumer** (`/steward`). Flow 7 is the first with
   a screen behind it.
3. **`CardBalance` has no `onClick`** — B4's "all nine tappable" needs the DS.
4. **The FD hero has no `TrendIndicator` in Figma.** It draws caption + `edit`
   icon + divider + value + `Maturity: 15 Dec 2026`. Trend fits Stocks / Unit
   Trust / PRS / Crypto; it does not fit FD, Bank, Joint or Gold.
5. **Screen 02 has TWO detail-row idioms, not one** — four `CardDataDisplay`
   tiles *and* three raw label/value rows. See §4.
6. **SYS-5 here is a flex artifact, not an authored literal.** The four
   `card/data display` are `flex: 1 0 0; min-width: 128px` in a wrapping row with
   `gap: 12`. 165.5 is the *computed* result — implementing with flex reproduces
   it and rounds naturally. Nothing to chase.
7. **The card grid is a wrapping flex row, not a two-column grid** —
   `flex-wrap; gap: 8px; w-161px; min-w-128px; max-w-172px`.
8. **The DS ships no `DateRangePicker` and no calendar grid.** `DatePicker`'s
   `calendarSlot` is explicitly app-provided and the DS documents Figma's own
   calendar as "not a reusable slot component yet (deferred)". Flow 10 instances
   `Date range picker` ×2 at 150.5 wide — i.e. a From/To pair. Resolved by §4's
   presets decision; no calendar is built.
9. **Two more untokenised gradients** (§ check 4).
10. **Confirmed, not contradicted:** inventory A10 is a non-defect (`left-0 …
    w-[343px]` on both gridlines, read directly); C1's nav "Label" placeholder
    **is fixed at source** — screen 01 renders `Home · Transfer · Finance ·
    More`; Flow 4's Joint Account RM 15,000.00 is real and appears nowhere else;
    Finance is the 3rd nav item and `/finance` is already
    `{ nav: 'present', fab: true }`.

---

## 4. DECISIONS CLOSED THIS SESSION

**All of these are settled. Do not relitigate them.** Flag only if evidence
contradicts one.

| # | Decision |
|---|---|
| **D1** | **A3 Marge's — M2.** Add a **sixth holding, Solana, RM 15,353.10**, anchored on the file's own quoted price (RM 4,465/SOL → **3.438 SOL**, derived not invented). **M1 rejected**: restating Tether to close a gap makes one holding a plug reverse-engineered from the total, which defeats `sum(holdings)`. Check 1 confirmed no sixth holding is drawn anywhere, so this is an **authored addition** and must carry a B2 comment saying so. |
| **D2** | **A3 Fun Wallet — F1.** Stellar and Uniswap both to **RM 2,500.00**. F2 is arithmetically impossible; F3 contradicts a decided total and Assistant03. |
| **D3** | **Wallet naming — `Marge's Wallet` / `Fun Wallet`.** Flow 7's spelling, the only screen where both appear together. Closes F5 A6's "pick one". `accounts.ts` currently says `"Marge's Crypto"` / `"Fun Tokens"` and must change. |
| **D4** | **Net worth = RM 464,958.84**, derived as `sum(holdings)` and nothing else. Figma's RM 450,958.84 is not reproduced. |
| **D5** | **Joint Account added as a ninth card** — Bank Account / Joint Account, **RM 15,000.00**, from Flow 4's picker. A deliberate design decision, not a transcription; comment it as such. |
| **D6** | **A2 Tabs — the DS gains the scroll affordance.** Not an MVP wrapper. Rationale, for the DS session: (a) Flows 8 and 9 both **detached `Tabs` to extend it** — the close-out flags this as categorically different from every other detach, *"the component could not do what the screen needed"*; three Sections need this and a wrapper gets written three times. (b) **Keyboard correctness a wrapper structurally cannot reach** — a scrollable tab row must scroll the selected tab **into view** on arrow-key selection or focus lands off-screen, and only `Tabs` knows which tab is selected; an outer `overflow-x` div fails this **silently, with a green build**. (c) The DS side is clean — `.mn-tabs` is two lines, `TabsProps.tabs` has no count constraint, roving tabindex already computes from `tabs.length`. |
| **D7** | **`CardBalance` gains `onClick` in the DS.** Check 3 found no governing precedent, and the four sibling cards all ship one. |
| **D8** | **Scrollbars are never visible anywhere, ever** — a standing rule from here on (§5). |
| **D9** | **Carousel fixes fold into Flow 7's diff** — apply the scrollbar rule to `.mvp-home__carousel`, and give it a keyboard path (`tabIndex: -1` today means it cannot be scrolled by keyboard at all). |
| **D10** | **Gradients — nearest `--brand-*` steps with recorded divergence**, per the `#0caaff` precedent. Net-worth card: `--brand-blue-400` → `--brand-blue-300`. FD hero: `--brand-teal-500` → `--brand-teal-400`. Divergence recorded in the CSS comment and the data file; Figma catches up later. **No literal, no `token-exempt`.** |
| **D11** | **B4's drill-down template carries BOTH detail-row idioms** — a `CardDataDisplay` tile group *and* a label/value row group, because that is what screen 02 draws. One screen component, typed field sets per holding type, populating whichever groups that type uses. |
| **D12** | **B9 uses presets, no calendar.** *Set Maturity Reminder:* 1 week / 2 weeks / 1 month before → confirm → toast. *Download Statement:* Last 30 days / Last 3 months / This year → toast. No `DatePicker`, no `DateRangePicker`, no calendar grid, no file generated, no notification system. |
| **D13** | **The card grid is a wrapping flex row, not a CSS grid** — matching Figma's own `flex-wrap`. |

**Everything landing in the design system (D6, D7, and the scrollbar rule's
component-side implementation) is a separate session in the DS repo.** Nothing
is written to the DS from this repo, ever.

---

## 5. The scrollbar rule — standing, from here on

**Teku's instruction: no visible scrollbars anywhere, ever.** Native apps do not
show them; a visible bar is a browser artifact that breaks the mobile illusion.

It belongs in the **DS component**, not patched per consumer:

```css
scrollbar-width: none;                   /* Firefox */
-ms-overflow-style: none;                /* legacy Edge */
&::-webkit-scrollbar { display: none; }  /* Chrome, Safari */
```

Two constraints on how it is applied:

- **Hide the bar, never the scrolling.** `overflow-x: auto` stays; only the
  indicator is suppressed. Do not reach for `overflow: hidden`.
- **Keyboard and wheel access must survive.** Verify the region still scrolls by
  keyboard *after* the bar is hidden. Hiding an indicator must not remove an
  affordance — and `.mvp-home__carousel` shows exactly how that goes wrong, since
  it is already unreachable by keyboard today.

**This rule is not yet in `CLAUDE.md` and should be added** — see §7.

---

## 6. Part B — fully specified, ready to execute

**The Part B prompt is B1–B10 plus the acceptance criteria, and it is complete.**
It is **not reproduced here** — it lives in this session's chat history, in the
message that opens `# PART A — reconnaissance and report` and continues through
`## Acceptance`. Read it there in full, then apply §3's ten corrections and §4's
thirteen decisions on top of it. Where the two disagree, **§3 and §4 win** —
they are later and measured.

Shape, for orientation only:

| | |
|---|---|
| **B1** | Nine balance cards; net worth RM 464,958.84 = `sum(holdings)` |
| **B2** | Figma is the seed, not the spec; every divergence gets a data-file comment |
| **B3** | FD principal derived from `currentValue / (1 + rate × elapsedYears)`; RM 150,000 authoritative, RM 125,000 becomes FIX IN FIGMA |
| **B4** | One drill-down template, typed field sets, all nine cards route to it |
| **B5** | Every date an offset from a live `TODAY`; pinning it must stay a one-line change |
| **B6** | `LineChart`, `chromeTone="onColor"`, explicit `domain`; series derived not transcribed; **E-3 and E-4 will show and must not be worked around** |
| **B7** | Chrome: `Finance_Overview01` PRESENT, all nine drill-downs SUPPRESSED (S2) |
| **B8** | No route-scoped provider; selected holding is a route param; `useAccounts()` only |
| **B9** | Bottom actions — see D12 |
| **B10** | SYS-10, SYS-12, SYS-5 are FIX IN CODE |

**Two DS-side items block the build**: D6 (`Tabs` scroll) and D7 (`CardBalance
onClick`). Both must be in `v1.2.0` and verified per §1 before B starts.

---

## 7. Open items entering the Part B build

**No decisions are open.** Every question raised in Part A is closed in §4.

What remains is either deferred to build time by the Part B prompt itself, or
belongs to someone else:

| # | Item | Owner / status |
|---|---|---|
| 1 | **`v1.2.0` bump not executed; tag existence unverified from this repo** | **Next session, first action** (§1) |
| 2 | **Ninth card alone on its row** — B1 says check it in the browser and report if it needs a layout call | Deferred to build by the prompt |
| 3 | **Joint Account has no authored transactions anywhere** — B4 says propose seeded / derived / empty, don't invent silently | Deferred to build by the prompt |
| 4 | **FD hero `TrendIndicator` applicability** (§3.4) — the field map decides it per type; FD/Bank/Joint/Gold have no market move | Build-time consequence of D11, not an open decision |
| 5 | **Litecoin ticker** — the file now reads `LTC`; open item 5's first half may be closable | **Teku** |
| 6 | **E-3 / E-4 will visibly affect Flow 7** — no area fill, dark-mode axis labels near-black | DS token session. **Use the right tokens and let the gaps show.** |
| 7 | **`--gradient-*` tokens never dark-flip** (§ check 4) | DS token session, same family as E-3/E-4 |
| 8 | **White-on-`--brand-*-400`, 10/12 hues** — a ramp question, **not** an AA blocker (§ A4) | DS session |
| 9 | **Dark-mode Figma reference has no recorded node ID** | Teku, unchanged |
| 10 | **Desktop max-width** | Parked, unchanged |
| 11 | **DS `package.json` still reads `version: 1.0.0`** while the tag moved | DS session, cosmetic |
| 12 | **`fix/flow01-trend-direction` branch is redundant** | Teku — delete when convenient |
| 13 | **`CLAUDE.md` has no instruction to find the newest handoff** — see below | **Still unfixed** |
| 14 | **The scrollbar rule (§5) is not in `CLAUDE.md`** | Should be added |

### ⚠️ `CLAUDE.md` still lacks a "read the newest handoff" instruction

**Confirmed fresh, not assumed.** `CLAUDE.md` was grepped case-insensitively for
`handoff` / `newest` / `latest`: **zero matches.**

There are now **six** handoff-shaped files at this repo's root, and a fresh
session reads `CLAUDE.md` before any prompt:

```
MONARCH-CLAUDE-CHAT-HANDOFF-08072026.md
MONARCH-MVP-CLAUDE-CHAT-HANDOFF-08012026.md
MONARCH-MVP-HANDOFF-08012026.md
MONARCH-MVP-HANDOFF-08052026.md
MONARCH-MVP-HANDOFF-08072026.md
MONARCH-MVP-HANDOFF-08082026.md   ← this file
```

Nothing tells a new session which is current, and the filename dates are
`MMDDYYYY` with no ordering hint. **This is still unfixed and it is the single
cheapest thing to fix** — one line in `CLAUDE.md` pointing at the newest
`MONARCH-MVP-HANDOFF-*.md`, or naming this file explicitly. Not written here
because `CLAUDE.md` edits were not in this session's scope.

---

**STOP. Nothing staged, nothing committed, nothing pushed. Branch created, tree
clean, zero commits. Part B has not begun.**
