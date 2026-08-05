# Monarch MVP — Handoff, 2026-08-05

**Phase 5, Step 5.3 — Flow Build Loop. Flow 1 of 12: `Homepage`. COMPLETE.**

Branch: `phase/5-flow01-homepage`, created off `main` this session. **Nothing is
staged and nothing is committed** — the working tree is left exactly as built,
per the corrected git workflow (see §1). Branch creation was the only git write.

This flow carried the shared foundation the other eleven inherit. §8 is the part
a fresh session should read first.

Every command quoted below was run fresh at close, not recalled.

---

## 0. Environment confirmations (§2 of the brief)

| # | Check | Result |
|---|---|---|
| 1 | Figma MCP on `http://127.0.0.1:3845/mcp` | ✅ **UP.** `HTTP 400` to a bare GET (the expected MCP response), `Get-NetTCPConnection -LocalPort 3845` → **LISTENING pid=12376 proc=Figma**. Confirmed with real calls: `get_metadata` on `1266:14402` and `1266:14403` both returned. Its last recorded state (2026-08-02) was down; it is up now. |
| 2 | DS checkout at `../Design system test` | ✅ **PRESENT**, with `node_modules` installed and `@material-design-icons/svg` resolvable. `src/styles/package.css` still where `vite.config.ts` expects it. Checked by existence only; nothing in the DS repo was read further, and nothing was written to it. No DS allowlist entry was requested or added. |
| 3 | `npm run lint:tokens` on the incoming tree | ✅ **PASS** — 10 files, exit 0 |
| 4 | Dev server on 5174 | ✅ **STARTED** (`strictPort`), served throughout |
| 5 | Branch off clean `main` | ✅ `git status --porcelain` on `main` showed **one untracked file**, `MONARCH-MVP-PHASE5-FLOW-INVENTORY.md` — Teku's, not this session's. No tracked modifications. Branch created. |

---

## 1. Files created and changed

### Foundation (inherited by all remaining flows)

| File | Status | What it is |
|---|---|---|
| `src/data/types.ts` | **new** | The domain model. Grown for Flow 1 only — see §8. |
| `src/data/accounts.ts` | **new** | `FIAT_ACCOUNTS`, `CRYPTO_WALLETS`, `CRYPTO_HOLDINGS` (5 tokens) |
| `src/data/transactions.ts` | **new** | `TRANSACTIONS` (6 rows), `TRANSACTION_CATEGORIES` (7) |
| `src/data/market.ts` | **new** | `FEATURED_COINS` — a watchlist, not holdings |
| `src/data/insights.ts` | **new** | `SMART_INSIGHTS`, `ACADEMY_PROMO`, `FEATURE_CARDS` |
| `src/data/derive.ts` | **new** | Every computed figure. One function per §6b formula row. |
| `src/data/format.ts` | **new** | One formatter per shape — money, signed money, split balance, quantity, percent, timestamp |
| `src/accounts/AccountsProvider.tsx` | **new** | App-level provider + `useAccounts()` |
| `src/shell/chrome.ts` | **new** | Per-route chrome config — `present`/`suppressed`/`repurposed` × FAB |
| `src/shell/navItems.ts` | **changed** | Home · Transfer · Finance · More, replacing Home/Search/Settings |
| `src/shell/AppShell.tsx` | **changed** | Consumes chrome config; owns the Steward FAB; theme switch repositioned |
| `src/shell/AppShell.css` | **changed** | Fixed nav + FAB (they are siblings of the scroll frame in Figma, not children); shell padding removed so screens are full-bleed |
| `src/App.tsx` | **changed** | Real route table |
| `src/main.tsx` | **changed** | Mounts `AccountsProvider` above the router |
| `src/screens/PlaceholderScreen.tsx` | **deleted** | Superseded by `ComingSoon` |
| `CLAUDE.md` | **changed** | Git workflow corrected — see below |

**`CLAUDE.md` git workflow, corrected.** It read *"Staging and committing locally
with clear messages is fine."* That no longer holds and left stale would
guarantee the drift recurs, since a fresh session reads it before any prompt. It
now reads: branch creation is Claude Code's when a step calls for it; **staging,
committing and pushing are Teku's alone, via Sourcetree**; branch creation is
therefore the only git write Claude Code makes.

### Screens (Flow 1)

| File | What it is |
|---|---|
| `src/flows/homepage/HomepageScreen.tsx` | The route. Owns `HeaderBg`, `Tabs`, and the selected-tab state. |
| `src/flows/homepage/HomepageFiat.tsx` | `Homepage_Fiat` (`1266:14402`) body |
| `src/flows/homepage/HomepageCrypto.tsx` | `Homepage_Crypto` (`1266:14403`) body |
| `src/flows/homepage/components/BalanceCard.tsx` | The balance hero, shared by both screens |
| `src/flows/homepage/components/SectionHeader.tsx` | Label + "See all" row, used 4× |
| `src/flows/homepage/components/ComingSoon.tsx` | The coming-soon mechanism |
| `src/flows/homepage/homepage.css` | Colocated layout |

**Accounts/Crypto is Tabs state, not a route** (Flow 1 §3). One route, four tab
states; the URL never changes.

---

## 2. `lint:tokens` and `build` — actual output

Both run fresh at close from `D:\Claude\Monarch-MVP`.

```
> monarch-mvp@0.0.0 lint:tokens
> node scripts/check-tokens.mjs

token guardrail — scanned 25 file(s) in MVP source

PASS — no raw color, px, or font literals found.
LINT EXIT: 0
```

**Zero exemptions in force.** No `token-exempt` marker was written anywhere —
the guardrail prints exemptions in its summary and printed none.

```
dist/assets/index-Cz6UBYIc.css     144.88 kB │ gzip:  15.61 kB
dist/assets/index-D0hsE7OX.js    5,711.36 kB │ gzip: 3,771.40 kB
✓ built in 5.56s
BUILD EXIT: 0
```

The 500 kB chunk warning is pre-existing (the DS's 101 inlined SVGs in dev-source
mode) and not introduced here.

> ⚠️ **A green build proves nothing about DS source transforms** — `?react` SVG
> imports degrade to asset URL strings silently. Verified at render instead: see
> §3.

---

## 3. Verification results

Method per the standing discipline: `getComputedStyle` + DOM assertions in both
themes, animations finished with the `try/catch` guard first, token values read
from a freshly-inserted probe element. **The screenshot tool failed again**
("the Browser pane is not displayed, so the page is not compositing frames"),
exactly as `CLAUDE.md` predicts — which is why none of the below rests on one.

Run at 375×812 in a fresh tab (**clean console: `[vite] connected`, React
DevTools notice, no errors**).

### 3a. Structure and DS integration

| Assertion | Result |
|---|---|
| svgr transform live through DS source | **36 inline `<svg>`, 0 `<img>`.** Every `.mn-logo` / `.mn-icon-object` host contains a real `<svg>` element. No `?react` degradation. |
| Poppins registered | `document.fonts.size` = **9** (matches the 4.7 post-fix value; `document.fonts.check()` deliberately not used) |
| Balance renders | `RM 27,978.59` |
| Transaction rows | `Aeon Big / Card Payment / -RM 250.75 / 15 Sept, 22:03` and `Caring Pharmacy / Card Payment / -RM 25.50 / 13 Sept, 18:50` — **derived by sorting the one ledger newest-first and taking two**, not a second hand-authored list |
| Nav labels | `["Home","Transfer","Finance","More"]` |
| Tab labels | `["Accounts","Crypto","Cards","Stocks"]` |

### 3b. The fix register, asserted rather than assumed

| Fix | Assertion | Result |
|---|---|---|
| **A9** — FAB 298 vs 297 | FAB rect on Fiat **and** Crypto | `rightInset: 16, bottomInset: 96, 56×56` on **both**. One shell-owned rule; it cannot disagree with itself. |
| **SYS-11 / A3** — Tabs 343 vs 306 | `.mn-tabs` width on both tabs | **343 on both**, `x=16`, row width 375. One instance, fill-container. |
| **SYS-10** — header height 44/48/68 | One `HeaderBg` at screen level | Rendered once, above the tab switch; no per-tab header exists to vary. |
| **SYS-3 / A4** — "Transactions" as raw text | `.mvp-section-header` children | `[true, true, true]` — **every** section header contains a `.mn-label`. There is no code path that renders one as raw text. |
| **B1** — detached "Send" button | Buttons on the page | `Add money` and `Send` are both `.mn-btn` DS instances, each with one inline icon svg. The detached frame has no expression in code. |
| **A6** — `{title}` placeholder | Promo title text | `Monarch Academy` — see §6. |
| **SYS-5** — subpixel geometry | All layout | Flow layout on the token ramp; no transcribed offsets. FAB insets rounded to `--spacing-400` / `--brand-scale-1500`. |
| **A12 / SYS-9** — carousel overflow (LEAVE) | `.mvp-home__carousel` | `scrollWidth 543 > clientWidth 375`, `overflows: true` — intentional horizontal scroll **preserved**, not "fixed" |
| **A5** — duplicate navbar (LEAVE) | Nav ownership | Nav is shell chrome; a duplicate is structurally impossible |

### 3c. Chrome config

| Route | `nav` rendered | `fab` rendered | Expected |
|---|---|---|---|
| `/` | ✅ | ✅ | present / true |
| `/transfer` | ✅ (Transfer selected) | ✅ | present / true |
| `/steward` | ❌ | ❌ | suppressed / false |

Read from the DOM, not asserted from the config object. Deep-linking straight to
`/steward` renders **styled** (`text-align: center`), confirming the CSS import
in `ComingSoon` covers the case where `HomepageScreen` never mounts.

### 3d. Two-theme assertions

Set with `document.documentElement.dataset.theme = 'dark'`.

| Property | Light | Dark |
|---|---|---|
| `body` background | `rgb(255,255,255)` | `rgb(0,0,0)` |
| Screen surface (`.mvp-home`) | `rgb(249,249,249)` | `rgb(19,19,19)` |
| Balance card surface | `rgb(255,255,255)` | `rgb(38,38,38)` |
| Balance text on card | 11.15:1 | 10.24:1 |
| Subtle text on card | 4.56:1 | 4.95:1 |
| List title on card | — | 10.24:1 |

**The dark layer engages on every surface.** No transparent-page failure.

**One near-miss avoided, on the record.** In dark mode the primary `Add money`
button computes to `background: rgb(255,255,255)` with `color: rgb(3,88,204)` —
white on blue text, the inverse of light mode. That is `[data-theme="dark"]
.mn-btn--primary` deliberately re-mapping to the on-color treatment (Figma's
"Inverse" appearance), exactly the false positive Phase 4 nearly filed. **Checked
the component's CSS before judging it. Not a bug** — and it measures 6.42:1.

### 3e. `--brand-*-400` contrast — close-out open item 5

**RESOLVED, and the answer inverts the expectation.** Ratios computed from
rendered `getComputedStyle` values via the WCAG relative-luminance formula.

The close-out predicted the risk was *the swatch against the dark page surface*.
It is not. **Dark is where they pass. Light is where they fail — and the real
problem is on the swatch, in both themes.**

**The three in use on the Homepage (feature-and-education tiles):**

| Tile | `-400` swatch | vs light screen | vs dark screen | White title **on** swatch (both themes) |
|---|---|---|---|---|
| Buy and sell stocks | `--brand-orange-400` | **1.89** ❌ | **9.35** ✅ | **1.99** ❌ |
| Track Spending | `--brand-green-400` | **2.02** ❌ | **8.75** ✅ | **2.12** ❌ |
| Smart Insights | `--brand-purple-400` | **3.97** ✅ | **4.44** ✅ | **4.18** ❌ |

Thresholds: **3:1** non-text/UI, **4.5:1** text.

**All twelve `-400` hues, swatch against the page surface:**

| | Light page (#fff) | Dark page (#000) |
|---|---|---|
| Pass 3:1 | **2 of 12** — purple 4.18, blue 3.34 | **12 of 12** — lowest is purple at **5.02** |
| Range | 1.41 (yellow) – 4.18 (purple) | 5.02 (purple) – 14.92 (yellow) |

**Three findings, stated separately because they have different owners:**

1. **The close-out's theme-independence claim is VERIFIED.** `glyphOnSwatch` is
   *identical* to two decimals in both themes for all twelve hues — the dark
   layer re-maps only the semantic tier, never `--brand-*`. Confirmed
   empirically, not assumed.
2. **On dark, the mid-tones are safe.** Every `-400` clears 3:1 against the dark
   page with margin. The concern the close-out parked does not materialise.
3. **⚠️ The genuine failure is white text/glyph ON the `-400` background, and no
   theme change can help it.** It fails 4.5:1 for text in **12 of 12** hues, and
   fails even 3:1 for a non-text glyph in **8 of 12**. This affects the DS's own
   `IconObject` treatment (fixed `-400` behind a white `currentColor` glyph) and
   `CardFeaturesAndEducation`'s white title. **This is a DS accessibility
   finding, not an MVP one** — the MVP only chooses variant names. It belongs
   with the DS session, not this branch.

Also measured, same class: the Academy promo's white title reads **4.49:1** over
its first gradient stop (`--brand-blue-500`, a hair under AA) and **2.61:1** over
its last (`--brand-teal-500`). Its subtitle: 3.72 / 2.16.

### 3f. Dark-mode Figma reference (§9) — not located

The close-out records it as **"pointer only"** with **no node ID**, and
`get_metadata` on the page root (`0:1`) failed to return (SSE parse error on an
oversized payload), so there is no cheap way to find it. **Left for Teku to point
at.** The computed-style assertions above are the stated actual verification and
they pass in both themes; the reference is a cross-check, not the check.

---

## 4. C1 verdict — **RAW VECTOR GEOMETRY. Rule-3 candidate. Sparklines NOT built.**

The discrimination rule was applied as §3a demands — from what the node renders,
never from what it is called, never from it being a chart-shaped thing.

**Evidence, four independent strands:**

1. **Figma emits it as a single flattened asset.** Inside each Featured Coin
   `Item/list`, node `153:1943` is named `graph` and renders as one
   `<img src={imgGraph}>`, absolutely positioned 80×40. Not a nested structure —
   a flat image.
2. **The asset is an SVG export**, not a component:
   `https://www.figma.com/api/mcp/asset/229f7019-…-2deed9d6cc65.svg`
3. **All three rows share the SAME asset constant.** Solana, Litecoin and
   Polygon — three different price series — point at one identical `imgGraph`. A
   data-driven chart component cannot do that. This is the strongest strand.
4. **The DS ships no charting primitive.** Grepped the full 45-component public
   API: zero matches for `chart`, `graph`, `spark`, `sparkline`.

**And the DS itself confirms the gap rather than contradicting it.** `ListItem`
exposes `miniChart?: React.ReactNode` — documented as *"`crypto` only —
sparkline slot"*. The library has modelled the slot and ships nothing to fill
it. That is a gap the DS has already acknowledged in its own type signature.

**Disposition:** joins **G1** (donut, 3 occurrences) and **G3** (trend line) as
**ONE charting decision for a DS session.** `Homepage_Crypto` ships without
sparklines; `miniChart` is left `undefined`, which is the exact slot they will
occupy once the DS has a chart. The rows still render logo, token, ticker, price
and move — **nothing else was lost, and no chart primitive was built here.**

---

## 5. The RM 5,117.70 crypto shortfall — exposed as intended

`cryptoWalletTotal()` computes `sum(holdings)` and the screen renders it.

**Derived total: `RM 97,236.32`.** Figma's Homepage draws `RM 102,354.02`.
**Shortfall: `RM 5,117.70`.**

Read from `Homepage_transfer_Crypto_select token` (`1266:14396`), the one screen
carrying both quantity and value:

| Token | Wallet | Quantity | Value |
|---|---|---|---|
| Bitcoin | Marg's Wallet | 0.098279 BTC | RM 46,059.31 |
| Ethereum | Marg's Wallet | 1.3786 ETH | RM 25,588.51 |
| Tether | Marg's Wallet | 3,630.00 USDT | RM 15,353.10 |
| Stellar | Fun Tokens | 3,372 XLM | RM 5,117.70 |
| Uniswap | Fun Tokens | 77.15 UNI | RM 5,117.70 |
| | | **sum** | **RM 97,236.32** |

**The shortfall is exactly the value carried by both Stellar and Uniswap**,
which is what makes a paste over a sixth holding the likely cause. **Not padded.**
No phantom holding was added; adding one would reproduce the defect rather than
expose it.

### A second contradiction the derive rule surfaced, not previously registered

Deriving the wallet's **movement** from the per-holding moves gives
**`+RM 3,609.78` / `+3.86%`**. Figma draws **"+ RM 1568"** and **"2.49%"** side
by side on that card.

Those two do not reconcile with each other, with the drawn total, or with the
derived one. And **`2.49%` is character-for-character Ethereum's move on the row
directly below** — the signature of a paste, the same failure mode as the
Stellar/Uniswap duplication. Recorded for the register; nothing was invented to
paper over it.

### The §6d chain — confirmed computing

`categoryTotal(TRANSACTIONS, 'groceries')` returns **exactly `1800.00`** from
250.75 + 420.50 + 310.40 + 288.60 + 529.75. The five rows were read from the
Budget drilldown (`1266:14337`), with merchants and timestamps intact — Aeon Big
×2, Lotus's, Giant, Jaya Grocer.

**And the chain validates itself:** sorting that same ledger newest-first and
taking two yields Aeon Big (15 Sept, 22:03) and Caring Pharmacy (13 Sept, 18:50)
— **precisely the two rows the Homepage draws**, in order. The Homepage's
transaction list is a slice of the ledger, not a parallel hand-authored set.
Asserted live in §3a.

---

## 6. Judgement calls the inventory did not settle

**A6 — the `{title}` placeholder. Replacement copy: "Monarch Academy". Not
written by me.** The Section placement (`0:569`) renders a literal `{title}`;
the **main component it instances** (`934:8630`) renders **"Monarch Academy"** in
that same slot, in on-color text. Per the standing note that 5.3 reads from main
components rather than Section placements, the real copy already existed in the
file and did not have to be invented. *Observation, recorded not acted on:* it
duplicates the section `Label` immediately above it. That is what the file says.

**C2 — Crypto's third Featured Coin under the navbar. What I did:** nothing
targeted, and no fix invented. `.mvp-shell__main` reserves
`padding-bottom: var(--brand-scale-1600)` for the fixed nav and FAB — a shell-wide
rule that exists because *every* screen needs its last row scrollable, not
because of C2. On the web the document scrolls, so the row clears naturally;
Figma's `Frame 556` had no scroll room because a fixed 770px frame has none.
Measured: `document.scrollHeight` 870 at a 812 viewport, so the row is
reachable. **The recorded-and-undecided status stands** — I did not decide
whether the bleed was intentional.

**Litecoin's ticker.** Figma labels the Litecoin row `SOL`, copied from the
Solana row above. Shipped as **`LTC`**, on the reasoning the inventory itself
applied to F5 A7's invalid hex address: the row already names the coin, and a
demonstrably wrong ticker beside it reads as carelessness to exactly this
audience. **Divergence from source, recorded** — not in the register, and worth
adding.

**Percentage direction.** See §7 — the DS crypto row cannot render a decline, so
the number is signed (`-2.49%`) to carry direction the triangle cannot.

**Transaction year: 2025.** The rows state no year. SYS-7 / F9 A6 records the
September items as 2025 (flagging a stray "15 Sept 2026" as the defect), so 2025
throughout, stored ISO and formatted at render.

**Receipt glyph, minor discrepancy found.** The Homepage draws no receipt icon on
Aeon Big (15 Sept) but the Budget drilldown draws one on all five Groceries rows.
Modelled per the Homepage, this flow's authority. **Not in the register** — one
line for the fix list.

**HeaderBg background.** Figma fills it with a photograph (`img/bg01`). A token
gradient stands in, so the repo ships no binary asset and no colour literal.
`HeaderBg` documents `background` as a swappable slot, so this is a supported
fill, not a workaround. Swapping the real image in later is one prop.

**Theme switch.** Not in the design at all. Kept from the 4.7 shell because the
artifact needs a way to reach dark mode, repositioned to a fixed control mirroring
the FAB on the opposite edge so it collides with neither the FAB nor the nav pill.

**Data files split five ways** (`accounts` / `transactions` / `market` /
`insights` + `derive` + `format`) rather than the architecture doc's illustrative
three. Same shape, finer grain; `types.ts` is unaffected.

---

## 7. Things that pushed against a rule

**⚠️ The one place a raw colour was genuinely tempting — `❖ System message`.**
Figma paints it `linear-gradient(141.39deg, rgb(4,110,255) 19.571%,
rgb(12,170,255) 97.357%)`. The first stop is `--brand-blue-500` exactly. **The
second, `#0caaff`, has NO backing token anywhere in the DS ramp** — nearest step
is `--brand-teal-500` (`#00ace5`). Written with **both stops as real tokens** and
the divergence recorded in the CSS and here. No literal, no `token-exempt`.
**This is a token gap and belongs on the register.**

**⚠️ A DS capability gap found at render — `ListItem type="crypto"` cannot show a
decline.** It draws a green up-triangle **unconditionally** and exposes no
direction prop. Verified from the live DOM: Bitcoin (+10.2%) and Ethereum
(−2.49%) both render `.mn-list-item__trend` at `rgb(56,184,96)` — success green,
up. Figma's own `Homepage_Crypto` draws `icon_triangle down` for Ethereum, **so
the design uses a state the shipped component cannot express.**

*This is NOT a Rule-3 gap* — the component exists; it lacks a variant. So I did
**not** stop, and did **not** hand-build a row (that would have duplicated a DS
component, breaking rule 1). Fixed the half the MVP owns: `formatSignedPercent`
puts the sign on the number, so a decline reads `-2.49%`. **The triangle and its
colour still need a DS change.** For the DS session.

**Rule-4 trap, navigated.** `ComingSoon` was the likeliest place to accidentally
write a primitive. Live DOM check inside it: `mn-icon-object`, `mn-label`,
`mn-label__text`. It composes three DS components; §1.2's "raw DOM with no DS
import" shape was avoided. It sits in `src/flows/homepage/components/`, **not**
`src/components/` — which stays **empty**, exactly as §1.2 wants.

**Scope pressure, resolved by reading rather than guessing.** Seeding
`sum(holdings)` needed Tether's value, which the inventory does not record. Two
targeted Figma reads (`1266:14396`, `1266:14337`) got the real figures instead of
back-solving Tether from `97,236.32` — which would have been circular, since that
figure is itself a contradiction §6 says to derive away.

**Not built, deliberately:** the desktop max-width (parked — the shell still
fills the viewport), any persistence, the Steward flow, GD1's success screen
(⛔ pending Teku's spec), and the sparklines.

---

## 8. What the next flow inherits

### `types.ts` as built

`FiatAccount` · `Transaction` + `TransactionCategory` + `TransactionCategoryId` ·
`CryptoWallet` · `CryptoHolding` · `FeaturedCoin` · `SmartInsight` ·
`FeatureCard` · `PromoMessage` · `Amount` · `CurrencyCode`

**Grown for Flow 1 only.** No receipts, plans, budgets or academy progress —
those are their own flows' to add. Two invariants that must survive:

- **Amounts are numbers, never formatted strings.** Outflows negative.
- **No colour literal reaches `src/data/`.** Identity is a `LogoName`, an
  `IconName`, a DS variant enum, or — for `SmartInsight.titleToken` — a token
  **name** as a string, which the screen wraps in `var(--…)`.

### Provider and hook signature

```tsx
// mounted in main.tsx, ABOVE the router, inside ThemeProvider
<AccountsProvider>

const {
  fiatAccounts,    // FiatAccount[]
  primaryAccount,  // FiatAccount
  cryptoWallets,   // CryptoWallet[]
  cryptoHoldings,  // CryptoHolding[]
  cryptoTotal,     // DERIVED — sum(holdings)
  cryptoChange,    // DERIVED — { amount, pct }
  transactions,    // Transaction[]
} = useAccounts()
```

Follows `ThemeProvider` exactly: `createContext<T | null>(null)`, `useMemo`'d
value, named hook that throws outside the provider. **Consume `useAccounts()`,
never `useContext(...)` at a call site** (§2.6) — that boundary is what keeps a
future store swap a one-file change.

**No writers yet.** Flow 1 only reads. W1's balance decrement arrives with the
transfer flows and widens this value object without touching a call site.
**In-memory only; reload resets** (§3.2).

### Chrome config schema

```ts
type NavState = 'present' | 'suppressed' | 'repurposed'
interface ChromeConfig { nav: NavState; fab: boolean }
chromeFor(pathname: string): ChromeConfig   // falls back to DEFAULT_CHROME
```

**Two independent fields, not one flag** — F10 A9 proves they vary separately
(FAB removed while the nav is merely covered). **A new flow adds its routes to
`CHROME_BY_ROUTE` in `src/shell/chrome.ts`.** Nothing infers chrome from screen
structure, and nothing may start to.

### `ComingSoon` API

```tsx
interface ComingSoonProps {
  title: string
  description?: string
  icon?: IconName   // default 'icon_more'
}
```

At `src/flows/homepage/components/ComingSoon.tsx`. **Promote it to
`src/components/` the moment a second flow needs it — and not before** (§1.1
rule 3). Flow 2 is the likely trigger. It imports `../homepage.css` itself, so it
renders styled even when the Homepage never mounts.

### Also inherited

- **`derive.ts`** — `cryptoWalletTotal`, `cryptoWalletChange`, `categoryTotal`,
  `recentTransactions`, `topHoldings`. **Screens must not add up an array
  themselves**, or the §6 rule leaks back out.
- **`format.ts`** — `formatMyr`, `formatSignedMyr`, `splitMyr`, `formatQuantity`,
  `formatPercent`, `formatSignedPercent`, `formatTimestamp`. Four registered
  formatting defects (F9 A1, F3 A16, F11 A6, F5 A9) are structurally fixed by
  routing through these.
- **`SectionHeader`** and **`BalanceCard`** — flow-local, same promotion rule.
- **The route table** in `App.tsx` is central and every flow branch touches it.
  Sequential branches make that one appended line.

### Open, carried forward

| # | Item | Owner |
|---|---|---|
| 1 | **`#0caaff` has no backing token** (system-message gradient) | DS / token register |
| 2 | **`ListItem type="crypto"` cannot render a decline** — no direction prop | DS session |
| 3 | **White-on-`--brand-*-400` fails AA in 12/12 hues, both themes** (§3e) | DS session — accessibility |
| 4 | **G1 + G3 + C1 — one charting decision** | DS session |
| 5 | Litecoin ticker, receipt-glyph discrepancy | Fix register |
| 6 | Dark-mode Figma reference has no recorded node ID | Teku |
| 7 | Desktop max-width | Parked, unchanged |

---

**STOP. Nothing staged, nothing committed, nothing pushed. Do not start Flow 2 —
the sequence beyond this flow is not settled.**
