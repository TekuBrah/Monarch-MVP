# Flow 4 — completion record

**Flow 4 is the bank transfer: open the Transfer action from the bottom bar, pick a recipient, choose the
source account, enter an amount, review, send, and see the money move — plus, at its end, the
question "Which transactions?" when a purchase's category changes.** (Figma Section `1266:14389`,
`Homepage_bank transfer`, file `v9MI8jxTaXiJA234Hkanlf`.) It was built across three MVP gates, `mvp-gate92`,
`mvp-gate93` and `mvp-gate94`, on top of four DS releases — v2.10.0, v2.11.0, v2.11.1 and v2.12.0. **There is
no MVP Gate 91: DS Gate 91 (v2.10.0) shipped the components and the MVP did not change.** The last build
gate is `mvp-gate94` at `85400044ae3f99bc977707d6b3faaddf9376a0ae`. This file records where the flow stands at that
commit. Gate 95 (this document) changed no code.

Every figure below was derived at Gate 95 from the repository (`git`, the source, the committed baselines,
`npx playwright test --list`, `npm run lint:tokens`, `npm run lint:linkage`). Where a figure came from an
earlier gate's record and could not be re-derived without running the suite, it is labelled **[reported]**;
where it came from the review thread and is on no file, **[carried]**; where Teku confirmed it on his own
screen, **[verified]**. §14 lists every premise of the Gate 95 brief that disk contradicted.

The per-gate detail lives in `CLAUDE.md` (one section per gate) and in the gap register §2ao (Gate 92),
§2ap (Gate 93), §2aq (Gate 94) and §2ar (this gate). This file is the summary to read first.

**Rule for this file:** it holds no text, figure or hash taken from a receipt photograph. Money figures and
names below come from the seeded fixtures (`src/data/*.ts`), which are not personal data.

**Where a ruling is attributed, the attribution is the source's own.** Rulings numbered `R9x-n` are the
review thread's (overturnable by Teku); decisions numbered without an `R` are Teku's unless the source says
otherwise. §5 condenses the register's wording; where this file and §2ao–§2aq differ, the register governs.

---

## Contents

1. [State at a glance](#1-state-at-a-glance)
2. [What Flow 4 is — screens and writers](#2-what-flow-4-is--screens-and-writers)
3. [The money flow and the write path](#3-the-money-flow-and-the-write-path)
4. [The data](#4-the-data)
5. [The decisions and rulings](#5-the-decisions-and-rulings)
6. [Standards established](#6-standards-established)
7. [Figma-to-code lineage](#7-figma-to-code-lineage)
8. [Deviations from Figma](#8-deviations-from-figma)
9. [Deferred and open items](#9-deferred-and-open-items)
10. [Open decisions — Teku's](#10-open-decisions--tekus)
11. [Corrections to the record](#11-corrections-to-the-record)
12. [What Flow 4 hands on](#12-what-flow-4-hands-on)
13. [The gate list](#13-the-gate-list)
14. [Premises of the Gate 95 brief that disk contradicted](#14-premises-of-the-gate-95-brief-that-disk-contradicted)

---

## 1. State at a glance

| | at `mvp-gate90` (Flow 4 start) | at `mvp-gate94` |
|---|---|---|
| tests | 1219 in 45 files [reported; `CLAUDE.md` Gate 90] | **1395 in 48 files** (`--list`, Gate 95) |
| visual baselines | 360 [reported] | **420**, all tracked (digest below) |
| walk states (\|WALK\|) | 90 = 26 routes + 7 tabs + 49 overlays + 8 stores (Gate 90 Phase B sweep) | **105** = 31 + 8 + **57** + **9** (`CLAUDE.md` Gate 94; sweep order routes, tabs, overlays, stores) |
| routes | 26 | 31 |
| DS pin | v2.9.0 (`4806dd73…`) | **v2.12.0** (`fbc6e2f215194909f5afbc77c7fb83832f82992b`), `lint:linkage` PASS at Gate 95 |
| stored schema | v1 | **v3** (`SCHEMA_VERSION = 3`, `src/persistence/schema.ts:45`) |
| mutators in `AccountsProvider` | 13 (`git show mvp-gate90:…`) | **15**, 13 with a caller (`addTransaction` and `adjustFiatBalance` still have none) |
| `lint:tokens` | 111 files, 4 exemptions [reported] | **121 files, 4 exemptions** (run at Gate 95) |
| entry chunk / CSS | 5,954,033 / 196,158 [reported] | 5,979,569 / 200,664 (Gate 94 Phase B, `build:package`) [reported] |

Baseline digest at `mvp-gate94`, standing command, re-derived at Gate 95:
`254a1aab4a0692904ccfaa0fe7978e5d5f516f37bde8acac5a5837d4a4e5b737` (420 files). Netlify served `main@8540004`
as Published [verified by Teku, 4 Nov 2026; not re-derivable here].

**The thing to know first.** Flow 4 is the app's first flow that moves money out of the user's account on a
tap. Gate 81's Top-Up was a move between the user's own accounts and a goal; Gate 93's send is the first
write whose other end is somebody else. That is why it ended up with a confirmation step the inventory never
drew (§2) and why the next flow to move money (Flow 5, crypto) should start from §6, not from the screens.

---

## 2. What Flow 4 is — screens and writers

Figma Section `1266:14389` holds four frames (inventory Flow 4 §2): `1266:14390` the Transfer action sheet
over Home, `1266:14391` the recipient picker, `1266:14392` "Send money", `1266:14393` the same screen with the
From dropdown open. **The inventory records that the flow is incomplete (A1): no success or confirmation screen
exists in Figma.** Teku decided the writer exists (inventory P3: "YES, it writes") and that the missing screen
is built in the MVP (inventory GD1: "build it in the MVP, do not wait on Figma").

### 2.1 Screens

| surface | where | Figma | gate | what it does |
|---|---|---|---|---|
| **Transfer sheet** | `src/shell/TransferSheet.tsx` | `1266:14390` | 92 | A DS `Sheet` "Transfer" with two `CardAction`s, Receive and Send, opened by the bottom bar's Transfer item over whatever screen is showing, with no route change. Send goes to `/transfer`; Receive says "Coming soon." |
| **Repurposed bottom bar** | `AppShell.tsx`, `navItems.ts` (`REPURPOSED_NAV`) | `1266:14391` | 92 | On `/transfer` the bar is Recipients (selected) / Scan QR, the drawn hug pill; no FAB. |
| **Recipient picker** | `src/flows/transfer/TransferScreen.tsx`, `/transfer` | `1266:14391` | 92 | "Send" header, Bank / Crypto tabs, a search field, "Recent recipients" (five rows), "New recipient". A no-match search shows `NoResults`. The Crypto tab shows `ComingSoon`. |
| **Send money** | `SendScreen.tsx`, `/transfer/send/:recipientId` | `1266:14392`, `…14393` | 93 | From (`FormField` + `SelectWalletAccount`, the drawn account menu), To (the recipient; the whole control goes back to the picker), Transfer Amount, a new-balance line, "Transfer money". |
| **Review transfer** | `ReviewTransferSheet.tsx` | **not drawn** | 93 | A DS `Sheet` over the amount screen: the amount, To, From, the new balance, "Transfer now". |
| **Transfer successful** | `TransferDoneScreen.tsx`, `/transfer/done/:transactionId` | **not drawn** | 93 | The amount, From / To / Date, Done (home) and View transaction (the Transactions tab with that row's detail sheet open). No reference is shown. |
| **Which transactions?** | `TransactionDetailSheet.tsx` (third view) | **not drawn** | 94 | After a category pick on a purchase: "Only this transaction" / "All from this merchant", with a live preview line. |

"Coming soon." (a shell notice kind added at Gate 92, cleared when the route changes) answers every undrawn
action: Receive, Add money, Add crypto, Scan QR, New recipient, and the currency chevron.

### 2.2 Writers

| writer | gate | writes | moves money |
|---|---|---|---|
| `sendMoney(row)` | 93 | one ledger row and the source account's balance | yes — net worth falls by the amount |
| `recategoriseMerchant(transactionId, category)` | 94 | every purchase from that row's merchant, and one `CategoryRule` | no |

`sendMoney` is the 14th mutator and the first one that creates a *purchase* (§3.3), so it is also the one
place a stored rule has to be read (Gate 94). `AccountsProvider` is still not a reducer.

---

## 3. The money flow and the write path

### 3.1 History: the review is an entry of its own

"Transfer money" pushes **the same path** with `{ review: true }` in location state; the review sheet is open
while that entry is current. So ✕, Escape, the scrim and device Back all pop back to the amount screen with the
draft kept (R93-5). "Transfer now" builds the row, calls `sendMoney`, clears the draft, records the new id and
pops the review entry; the screen then renders `<Navigate to="/transfer/done/<id>" replace />` on its **own**
entry. So Back from the success page lands on the picker (measured at Gate 93 Phase B: 20 of 20 contexts), and
the same money can never be re-offered. A reload that restores `{ review: true }` with no draft behind it shows
no sheet.

### 3.2 The draft

`TransferDraftProvider` (`transferDraft.tsx`, mounted around the `Outlet` in `AppShell`) holds `{ amount,
fromId }` and clears when the path leaves `/transfer*` and after a send. It is not stored: an unsent draft is
not a record. The To control is `navigate(-1)` when the screen was reached in-app (`location.key !== 'default'`)
and `navigate('/transfer', { replace: true })` from a deep link, so a deep link never backs out of the app
(R93-7).

### 3.3 `sendMoney` and the row

The argument is the whole instruction — the row (`topUpGoal`'s shape). `sendRowProblem` (`derive.ts`, pure,
Node-tested) judges the row against the **committed** accounts before any setter, so a refusal throws at the
call site and writes nothing (R89-8). Then two sibling pure updaters: append the row, debit the account in sen.
It never calls `addTransaction` or `adjustFiatBalance`, and it does **not** copy `topUpGoal`'s throw inside
`setFiatAccounts`' updater (R93-11).

The row (`buildSend`, `derive.ts`): `id` `txn-send-<uuid>`; `merchant` the recipient's name; `method`
`'Fund Transfer'`; **`kind` `payment` for a business, `transfer` for a person (Decision 22A)**; `amount`
negative (`sendRowProblem` requires `amount < 0` strictly, so the writer cannot emit the exactly-zero row the
open predicate would call income — §10); `occurredAt` the local wall clock; `category` — for a business the
stored rule for that merchant, else its latest `payment` row's category, else `others`; for a person
always `others` (`sendCategory`, whose `rules` parameter is required — R94-7); `recipientId`; `reference`
`newReference(occurredAt)`. A send to a business is therefore a *purchase* by disposition: its detail sheet
offers a receipt and a category control.

### 3.4 Stored shape: schema v1 → v2 → v3, and no tester reset

- **v2 (Gate 93):** `Transaction.recipientId?`; `MIGRATIONS[1]` is the identity (the step must still exist or a
  v1 store is quarantined).
- **v3 (Gate 94):** `categoryRules` becomes the sixth record key; `MIGRATIONS[2]` adds `categoryRules: []` and
  passes a non-object through; `isStoredCategoryRule` validates; `storedRecordsProblem` rejects a merchant named
  twice. **The provider must report the `categoryRules` atom to `usePersistence`, or `reportState` never completes
  and all persistence stops** (Gate 94 mutation B2b).
- `DB_VERSION` did not move (the harness parses it). `seedFingerprint()` hashes the five raw seeds and none of
  them changed, so **neither bump reset any tester's data**: a stored v1 or v2 snapshot hydrates as `migrated`
  and is written back whole on the next commit. A newer-schema store opened by older code is read-only
  (Gate 85's mechanism, unchanged).

### 3.5 Merchant rules (Gate 94)

A `CategoryRule { merchant, category }` keys on the exact `Transaction.merchant` string, one per merchant
(R94-5). `recategorisedAllFrom` moves **purchases only** (through `canRecategorise`), so a refund or a transfer
carrying the merchant's name never moves; it returns the same array when nothing moves. `withCategoryRule` is an
upsert. `recategoriseMerchant` reads the merchant off the committed row (a caller cannot name an arbitrary one),
validates outside the updaters, then commits two sibling pure updaters. "Only this transaction" (Gate 89's
writer) leaves an existing rule alone (R94-6). Because `sendMoney` is the only writer that creates a purchase,
`buildSend` reading the rule is the whole of "future rows" today.

---

## 4. The data

- **Recipients** are a constant (`src/data/recipients.ts`, five, Figma's order, fictional account numbers as
  drawn), **outside the seed fingerprint** and not stored (R92-5). `Recipient.kind` (`person` / `business`) is
  what Decision 22A reads. Recents are derived (`recentRecipients`): everyone sent to first, newest send first,
  then Figma's order. No seeded row carries a `recipientId`, so the picker is unchanged until the first send.
- **Photos** (Decision 24A: Teku generated them with AI): `public/media/transactions/rachum-greene.jpg`
  (532×532), `perry-matthew.jpg` (584×584), `fiona-hammock.jpg` (446×446); Aeon Big and Caring Pharmacy use the
  DS logos. A capture strip two of the sources carried along the top is trimmed out (R92-12).
- **Account numbers** live on the bank holding (Ruling 23 / R93-2): `BankHolding` gained `accountNumber` and
  `bankCode`; the masked `accountNo` field is gone and `maskedAccountNo` derives it. Main reads `6235474597` /
  `MN` → `•••• 4597`; Joint `7718203160` → `•••• 3160`. `FiatAccount` was **not** widened (inside the seed
  fingerprint); moving the number there is registered for the next seed re-dating.
- **Marks:** Main's is Margaret's profile photo; Joint's is a byte copy of the DS export of `192:8180` at
  `public/media/profile/joint-account.svg` (R93-3), drawn through `Avatar src` with `alt=""` passed.
- **The account prints "Main" everywhere** (Decision 26 = B), not Figma's "Main Account".

---

## 5. The decisions and rulings

### 5.1 Teku's decisions, as worded on disk

| # | decision | source |
|---|---|---|
| **18A** | The bottom bar's Transfer item opens the "Transfer" sheet with Receive and Send. "Teku's own words, 24 Oct 2026" — **the words themselves are on no file** | register §2ao |
| **19B** | A confirmation step, then a "Transfer successful" page. 24 Oct 2026, "taking the review thread's recommendation" | §2ao |
| **20** | The From account picker follows Figma's drawn dropdown. **Not put to Teku; ruled by the review thread on his behalf, overturnable** | §2ao |
| **21** | No "Today" / "Yesterday" anywhere; 16B stands. Ruled as **R93-1** ("Decision 21 = A"); held at Gate 92 for research under Teku's standing instruction of 24 Oct | §2ao, §2ap |
| **22A** | A send to a business is a purchase; to a person, a transfer. 24 Oct 2026, taking the thread's recommendation. (The Gate 92 prompt and the conversation called it "20A"; on disk it is Decision 22.) | §2ao |
| **23** | Main's account number is the drawn `6235474597` everywhere; Joint keeps `•••• 3160`. **Not put to Teku; thread ruling, overturnable** | §2ao |
| **24A** | The recipient photos ship (Teku generated them with AI), 26 Oct 2026 | §2ao |
| **25 = C** | Fix the repurposed bar in the DS first, then re-pin: DS v2.11.0 makes bar labels never wrap and adds a per-item `width: 'hug'`; the MVP pins v2.11.1. 27 Oct 2026 | §2ao |
| **26 = B** | The account prints "Main" everywhere, including the transfer screens (Teku, 29 Oct 2026, "follow yours") | §2ap |
| **27 = A** | Every change to a new category on a purchase goes through "Which transactions?", including shops with one purchase. 2 Nov 2026. Anchor: Revolut's help page | §2aq |

Also in force, from before the flow: **Decision 11 = A** (Gate 89) read "one recategorisation changes that
transaction only; no merchant-wide prompt and no rules store". Gate 94 **reverses its second sentence** and
discharges the obligation 11A recorded; it does not "complete" 11A (§2aq). **The next free Teku decision number
is 28.**

### 5.2 DS rulings behind the flow

| | ruling |
|---|---|
| **R91D-1…8** (DS Gate 91, v2.10.0) | one minor release; all four `TransferAmount` variants; Material Round package glyphs only; nothing beyond the closed list; token colours only from Teku's Figma bindings; messages belong to the form row (`FormField`, `FieldMessage`); no existing default render changes (82 render paths pinned). There is no R91D-3. |
| **R92D-5…7** (DS Gate 92, v2.11.0) | bar labels never wrap (`white-space: nowrap`); per-item `BottomNavItem.width` `'fixed'` (default) or `'hug'`; no effect in a `fill` bar. v2.11.1 is a documentation-only patch. |
| **R93D-1, R93D-4** (DS Gate 93, v2.12.0) | `192:8180` is image content (the raw `#77c3cc` fill is not a token violation); `SelectWalletAccount` owns its Escape / outside-press dismissal and focus return. **Only these two are cited on this repo's disk; the DS Gate 93 record is in the DS repo.** |

### 5.3 Thread rulings by gate (condensed; each overturnable)

- **Gate 92, R92-1 to R92-27.** The Transfer item is an action, never selected (R92-1); the sheet title is centred
  by `OverlayHeader` (R92-2); a balance card's Send skips the sheet (R92-3); "Coming soon." for undrawn actions
  (R92-4); recipients are a constant (R92-5); photos drawn through the `image` mark, Rachum's seeded ledger rows
  keep their initials (R92-6); picker search by name, account number or bank code (R92-7); `/transfer` uses the
  repurposed bar and no FAB (R92-8); scope (R92-10); **the repurposed bar is the drawn hug pill** (R92-11, R92-21);
  strip trimmed from the photos (R92-12); ship without `aria-haspopup` / `aria-expanded` and register G58
  (R92-13); DS-owned size differences are findings, not overrides (R92-15); the mutation negative control must
  typecheck, run, leave its target passing and report NO PROOF (R92-16); B12 pins the hug pill (R92-22);
  B2's focus check strengthened with a `focusout` observation window (R92-24); R92-18 corrected (R92-25);
  signatures come from a failing log (R92-26). Forks X1–X13 accepted (X5, Back after the sheet's Send lands on
  the default tab, is a finding).
- **Gate 93, R93-1 to R93-13.** No Today / Yesterday (R93-1); account number on the holding (R93-2); Joint's
  mark is a photo (R93-3); the From menu's dismissal is the DS's (R93-4); the review is a `Sheet` over the amount
  screen (R93-5); the success page is a route reached by replace (R93-6); the draft and the To chevron (R93-7);
  **`settleImages` at the end of `gotoRoute`** (R93-8); the currency chevron says "Coming soon." (R93-9); the
  `:recipientId` expansion is total (R93-10); `sendMoney`, the row, the schema, the category and recents
  (R93-11); the amount field is the DS's own text input, a finding against G49 (R93-12); records (R93-13).
  **R93-14** was never recorded where it was made; Gate 94 recorded it (§11).
- **Gate 94, R94-1 to R94-13.** The choice is a third view holding the height (R94-1); Revolut's labels verbatim
  (R94-2); "Only this transaction" first and focused, nothing pre-selected, a tap commits (R94-3); the current
  category writes nothing (R94-4); exact-string merchant match (R94-5); "Only this transaction" leaves a rule
  alone (R94-6); `sendCategory`'s `rules` parameter is required (R94-7); two walk states (R94-8); no undo surface,
  re-picking replaces a rule, Reset data clears them (R94-9); the Reset copy is unchanged (R94-10); schema v3
  (R94-11); B3 uses the bottom-nav locator because a role-name match is a substring match (R94-12); records
  (R94-13).

---

## 6. Standards established

These are for later flows to reuse. Each cites the gate that set it.

1. **The multi-step money flow** (Gate 93): amount screen → review `Sheet` as its own history entry (same path +
   `{ review: true }`) → writer → success page by `replace` → Done / View transaction (both `replace`). The draft
   lives in a provider cleared when the path leaves the flow and after a send. Back from the end lands before the
   flow; nothing is re-offerable.
2. **A one-argument writer whose argument is the row, judged before any setter** (Gate 93, from `topUpGoal`):
   a pure `…Problem(row, committedState)` function throws at the call site; two sibling pure updaters follow; the
   writer never nests setters and never copies a throw into an updater (the Gate 81-B `deleteGoal` defect).
3. **Account marks are photographs** drawn through `Avatar src`, with `alt=""` *passed* (the omitted-prop trap),
   served from `public/media/`; a DS export copied byte for byte is image content, not a token violation (R93D-1).
4. **A DS control that owns its own dismissal is left to** (Gate 93, DS v2.12.0): the screen adds no Escape or
   outside-press listener to `SelectWalletAccount`.
5. **`settleImages` runs at the end of `gotoRoute`** (R93-8). A missing image otherwise passes: the dev server
   answers it `200 text/html`. (Gate 51-B's record said it was already there; it never was.)
6. **A scope question is a view inside the one overlay** ("Which transactions?", Gate 94): the detail pane stays
   mounted, hidden, `inert` and `aria-hidden` so the card holds its height; nothing is pre-selected; the least
   destructive option is first and takes focus; the preview line states the effect with a count read from the live
   ledger.
7. **Synthetic-row tests for data rules.** The seed is uniform (every merchant's 220 purchases share one category,
   so a rule cannot be told from the status quo), so `sendCategory` (N9–N12, Gate 93) and the merchant rules
   (N1, N2, Gate 94) are proved on constructed rows.
8. **A bar item can be an action, not a destination** (Gate 92): `path: null`, selected never true, the sheet opens
   over the screen without a route change; chrome for a flow's own bar is data (`REPURPOSED_NAV`), rendered by
   `AppShell`.
9. **Undrawn work says "Coming soon."** through one shell notice kind that clears when the route changes (the MVP
   scope rule).
10. **A required parameter on a rule function** (`sendCategory`'s `rules`, R94-7): the compiler finds every caller,
    which is the point.
11. **Mutation proofs:** the negative control typechecks, runs and reports NO PROOF; signatures are taken from a
    failing log, not from memory (R92-16, R92-26); the driver tests each signature as a literal substring.
12. **A "Which tab was I on?" limit is a finding, not a bug to patch from the shell** (X5): a shell-level sheet
    cannot read a screen's in-screen tab.

---

## 7. Figma-to-code lineage

| frame | what it is | route | component files | walk states |
|---|---|---|---|---|
| `1266:14390` | Home with the Transfer sheet open | any (the sheet is shell-level) | `src/shell/TransferSheet.tsx`, `TransferSheet.css`, `navItems.ts`, `AppShell.tsx`, `chrome.ts` | `/ [overlay:transfer]` (`index-transfer-*`) |
| `1266:14391` | recipient picker | `/transfer` | `src/flows/transfer/TransferScreen.tsx`, `transfer.css`, `transferTabs.ts`; `src/data/recipients.ts` | `/transfer`, `/transfer [tab:crypto]`, `/transfer [overlay:no-match]` |
| `1266:14392` | Send money | `/transfer/send/:recipientId` | `SendScreen.tsx` | the route × 5 recipients, plus `[overlay:amount]`, `[overlay:invalid]` |
| `1266:14393` | Send money, From open | same | `SendScreen.tsx` | `[overlay:from]` |
| *(undrawn)* | Review transfer | same, `{ review: true }` | `ReviewTransferSheet.tsx` | `[overlay:review]` |
| *(undrawn)* | Transfer successful | `/transfer/done/:transactionId` | `TransferDoneScreen.tsx` | `[overlay:sent]` (the route itself cannot be walked: its id is random) |
| *(undrawn)* | Which transactions? | the Transactions tab and the Budget drill-downs | `TransactionDetailSheet.tsx`, `finance.css` | `[overlay:category-scope]`, `/finance/budget/budget-entertainment [store:recategorised-all]` |

**Flow 4 baselines.** Gate 92 added 12 (three states) and changed 4 (the old `transfer-*` `ComingSoon` stub the
picker replaced — a replaced stub changes baselines and adds none, Gate 48's rule). Gate 93 added 40 (ten states)
and changed 4 (`finance-holding-main-*`, the account-number tile). Gate 94 added 8 (two states). Total: **60
added, 8 changed, 0 deleted.** Specs: `transfer.spec.ts` 17, `send.spec.ts` 25, `merchant-rules.spec.ts` 12,
`recategorise.spec.ts` 17 (`--list`, Gate 95).

---

## 8. Deviations from Figma

| Figma | shipped | who |
|---|---|---|
| "Main Account" | "Main" everywhere | Teku, Decision 26 = B |
| Transfer sheet title left-aligned | centred by `OverlayHeader` | R92-2 (the shared-header standard) |
| bar pill 190 / "Recipients" 80 / "Scan QR" 62 | 191.672 / 79.672 / 64 — the approved 62 → 64 item rounding | R92-21, Decision 25 = C |
| rows 48, heading 20, field 44, button 48, sheet panel 313 with cards 92 | 44, 16, 46, 50, 333 with cards 94 — the DS's own heights and the 16px `body/sm` line height below 768 | R92-15: findings, no override |
| currency flag 20px | `Logo size="xs"` (14px) in the 20px wrapper — no `Logo` size is 20 | G61 |
| the To field draws a chevron on `1266:14392` and none on `…14393`; it is a detached frame named "Input" | built with the chevron; the whole control goes back to the picker | §2ap (Figma-internal disagreement) |
| no success page, no review, no scope question | all three built | inventory GD1; Decisions 19B, 27 |
| "Main" From mark | Margaret's profile photo | as drawn |
| the amount field | the DS `SelectTransfer`'s own text input, not a `Field type="number"` | R93-12 (a finding against G49) |

---

## 9. Deferred and open items

### 9.1 Open DS gaps reached by this flow (register §2ao–§2ar)

| gap | what | state |
|---|---|---|
| **G58** | `BottomNavItem` cannot say it opens a dialog (`aria-haspopup` / `aria-expanded`); WebKit does not focus a tapped button, so on iOS the sheet's focus restore lands on the page | open, DS round |
| **G60** | Escape in an open `Select` inside a `Modal` closes the whole `Modal` (`PresetModals`) | open, DS round |
| **G61** | no `Logo` size fits the 20px flag slot | open, DS round |
| **G62** | the To field's recipient mark overflows its slot (`TransactionMark size="l"` gives a business `Logo` 56px in a 40px slot) | **opened at Gate 95**, §2ar |
| **G63** | a focus ring on the detail sheet's ✕ after View transaction | **opened at Gate 95 as UNCONFIRMED**; not reproduced with a pointer, §2ar |

G54–G57 and G59 entered the register closed (DS v2.10.0 and v2.11.0). The DS names every bottom bar
`aria-label="Primary"` and the To control announces a listbox it never opens — both recorded beside G58, neither
opened as its own entry.

### 9.2 Deferred — MVP side

- **A rules list in Settings** (R94-9): paused. No help page sources one.
- **Moving the account number onto `FiatAccount`:** next seed re-dating.
- **Rachum Greene's seeded ledger rows keep their initials** (F12); the recipient constant and the ledger are
  not joined.
- **The `category-scope` captures are 19,054 px tall** (the whole ledger behind the sheet, about 2 MB each):
  the known capped-capture item (§2ad).
- **`npm audit`** reports three high findings (`js-yaml`, `source-map-js`, `vite`), all dev-time, none reaches
  `dist`: the hygiene round.

---

## 10. Open decisions — Teku's

1. **The zero-amount predicate** (`transactionDisposition`, `src/data/derive.ts`, a non-transfer row of exactly 0
   reads as income) is still open and unowned (Gate 83). Flow 4's writer cannot emit such a row (§3.3).
2. **The dark `OptionList` unselected row paints black** — a DS `OptionList` behaviour seen on the Funding Source,
   category and now "Which transactions?" pickers (§2ac, §2aq); log it as a DS-round defect or accept it.
3. **G63's input method.** Whether Teku's ring came from the keyboard or from a pointer on a different Chrome
   build is unestablished (§2ar).
4. **A real-phone walk of Flow 4 is unconfirmed.** Teku's walk was on the live site in a desktop browser at phone
   width [carried]; the standing instrument is the Playwright harness (375 and 430 at DPR 2).

---

## 11. Corrections to the record

All insert-only; the earlier text is left as written.

- **R93-14** (the Gate 93 fix-before-commit: `sendCategory`'s tests N9–N12 on synthetic rows, written after Phase B's
  survivors S4b and S4c) was never recorded where it was made. The Gate 93 record should read `send.spec.ts` **25**
  tests and the suite **1367 in 47 files**, not 21 and 1363 (§2aq).
- **`settleImages` was never at the end of `gotoRoute`** before Gate 93, whatever Gate 51-B's record says (R93-8).
- **R92-25's "line 138"** is line 160 at `mvp-gate92`, and its finding no longer describes the tree once
  `settleImages` moved (§2ap).
- **The Gate 92 resume prompt's "plus the arm-1 checkpoint test"** was wrong: arm 1 is green until a new PNG exists.
- **Gate 94's "Decision 13 = A"** (Teku, 21 Oct 2026, shipped at Gate 90); the thread's "13 B deferred" was wrong.
- **Neither the Gate 93 nor the Gate 94 Phase B record had been inserted** into the register or `CLAUDE.md`
  (Gate 90's was, in §2ao). Both are summarised in §2ar.
- **The Gate 92 section said G59 was opened and that the pill ships 176 wide;** corrected by the re-pin (R92-21).

---

## 12. What Flow 4 hands on

- **Flow 5 (crypto):** the Crypto tab on `/transfer` shows `ComingSoon` and the Home Crypto card's Send opens the
  picker on that tab. Flow 5 should start from §6 items 1–4 — the money-flow shape, the one-argument writer, the
  DS-owned dismissal — and from the open question of what a crypto "review" shows that Figma does not draw.
- **Flow 6:** owns "New recipient" and Scan QR (both "Coming soon." today) and any change to who can be in
  `RECIPIENTS`.
- **"Coming soon." today:** Receive, Add money, Add crypto, the currency chevron.
- **Flow 12 / persistence work:** `categoryRules` and `Transaction.recipientId` are stored; any later schema bump
  follows §3.4.

---

## 13. The gate list

Dates: the register's status dates, with the commit's author date from `git` in brackets where it differs.

| gate | repo | what | tag / SHA | date |
|---|---|---|---|---|
| 91 | DS | transfer components (`FormField`, `FieldMessage`, `TransferAmount`, `SelectWalletAccount.leadingSlot`, `people`, `qr_code_scanner`) | `v2.10.0` `49550d56a8837078f31bc62a512abcaf60aa382f` (tag object `79e9298d…`) | 2026-10-26 |
| 92 DS | DS | one-line bar labels, per-item hug | `v2.11.0` `926b9936c9e9c4dc1d3be12d7645935c1245de35` | 2026-10-28 |
| 92 DS-B | DS | record corrections | `v2.11.1` `c644746ccebc899f19fb10e5b4ba6d6a5393e17a` (tag object `52b45042…`) | 2026-10-28 |
| **92** | MVP | Transfer sheet, recipient picker, repurposed bar; re-pinned to v2.11.1 | `mvp-gate92` `cf33a262c98d6e289066570d55ee7cc5b70019e6` (tag object `0c102425…`) | 2026-10-27, re-pinned 10-28 [commit 10-29] |
| 93 DS | DS | `SelectWalletAccount` dismissal and focus return | `v2.12.0` `fbc6e2f215194909f5afbc77c7fb83832f82992b` (tag object `f578fdaf…`) | 2026-10-30 |
| **93** | MVP | amount, review, send, success; schema v2 | `mvp-gate93` `ee780f91843cd4181baae80f08ac68a6535f6dce` (tag object `70f01619…`) | 2026-10-30 [commit 10-31] |
| **94** | MVP | merchant-wide recategorisation; schema v3 | `mvp-gate94` `85400044ae3f99bc977707d6b3faaddf9376a0ae` (tag object `0c338226…`) | 2026-11-02 [commit 11-04] |
| 95 | MVP | this record (documents only) | `mvp-gate95` (Teku tags) | 2026-11-04 |

There is no MVP Gate 91. The MVP's own Gate 90 (`mvp-gate90`, `17d6ba643c2c23fbf2bcc375dded4bf68dbb4b68`, years on dates) is
the last gate before Flow 4 and is not part of it.

---

## 14. Premises of the Gate 95 brief that disk contradicted

1. **"Frames `1266:14389`–`14393`".** `1266:14389` is the **Section** node; the four screens are `1266:14390`–`14393`
   (inventory Flow 4 §2).
2. **"R93D" rulings.** Only R93D-1 and R93D-4 are cited anywhere on this repo's disk; the rest of the DS Gate 93
   record is in the DS repo.
3. **G62: "overlapping the To field's left border".** Measured on the committed 375 baseline: the Aeon Big disc is
   56 × 56 at x 21–76, y 245–300, against a field border at x = 16 (top y = 242, bottom y = 303) — it is 5px *inside*
   the left border, 2px inside the top and bottom, and overflows its 40px **slot**, not the border. Caring Pharmacy
   (the other business) does the same; the three photo recipients do not.
4. **G63: "a mouse or touch tap … Gate 89-B's rule is no ring after a pointer action".** Not reproduced: a probe in
   the harness's Chromium 151 shows no ring after a mouse or touch tap (nor after typing the amount then clicking),
   and a ring after a keyboard activation. The Gate 89-B rule governs the MVP's own focus returns; the sheet's
   open-time focus is the DS's (`Sheet.tsx:203`).
5. **The review thread's walk step said to pick an "Entertainment" category.** There are seven categories and none
   is called that (`TRANSACTION_CATEGORIES`, `src/data/transactions.ts:135-141`); the seeded Entertainment
   *budget* counts `dining`, labelled Dining & Leisure (`src/data/budgets.ts:38`). A correction to the walk
   instructions, not a product change.
6. **No premise in §0 disagreed.** `main`, `origin/main` and `mvp-gate94^{}` all read `85400044…`, 89 tags, 1395 tests in
   48 files, 420 baselines at the quoted digest, `SCHEMA_VERSION = 3`.
