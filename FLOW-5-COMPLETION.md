# Flow 5 — completion record

**Flow 5 is the crypto transfer: open the Transfer action from the bottom bar, pick a crypto contact, choose which
token to send, enter an amount in ringgit, choose a network-fee tier, review the whole sum in place, send, and see
the wallet move.** (Figma Section `1266:14394`, `Homepage_transfer_Crypto`, file `v9MI8jxTaXiJA234Hkanlf`.) It was
built across two MVP gates, `mvp-gate96` and `mvp-gate98`, with one DS release between them, **v2.13.0** (DS Gate 97).
**There is no MVP Gate 97: DS Gate 97 shipped the four DS parts Flow 5's amount screen needed and the MVP did not
change.** The last build gate is `mvp-gate98` at `a0264c9b929aa78ab296c7250cb08384767f7a74`. This file records where
the flow stands at that commit. Gate 99 (this document) changed no code.

Every figure below was derived at Gate 99 from the repository (`git`, the source, the committed baselines,
`npx playwright test --list`, `npm run lint:tokens`, `npm run lint:linkage`). Where a figure came from an earlier
gate's record and could not be re-derived without running the suite or a build, it is labelled **[reported]**; where
it came from the review thread or the Gate 99 brief and is on no other file, **[carried]**; where Teku confirmed it
himself, **[verified]**. §14 lists every premise of the Gate 99 brief that disk contradicted.

The per-gate detail lives in `CLAUDE.md` (the Gate 96 and Gate 98 sections) and in the gap register §2as (Gate 96),
§2at (Gate 98) and §2au (this gate). The DS side lives in the DS repo's `CLAUDE.md` ("Gate 97 DS") and `CHANGELOG.md`
(v2.13.0). This file is the summary to read first.

**Rule for this file:** it holds no text, figure or hash taken from a receipt photograph. Money figures, names and
addresses below come from the seeded fixtures (`src/data/*.ts`), which are not personal data.

**Where a ruling is attributed, the attribution is the source's own.** Rulings numbered `R9x-n` are the review
thread's (overturnable by Teku); decisions numbered without an `R` are Teku's unless the source says otherwise. §5
condenses the wording the records use; where this file and §2as–§2au differ, the register governs.

---

## Contents

1. [State at a glance](#1-state-at-a-glance)
2. [What Flow 5 is — screens and writers](#2-what-flow-5-is--screens-and-writers)
3. [The money model and the write path](#3-the-money-model-and-the-write-path)
4. [The data](#4-the-data)
5. [The decisions and rulings](#5-the-decisions-and-rulings)
6. [Standards established](#6-standards-established)
7. [Figma-to-code lineage](#7-figma-to-code-lineage)
8. [Deviations from Figma](#8-deviations-from-figma)
9. [Deferred and open items](#9-deferred-and-open-items)
10. [Open decisions — Teku's](#10-open-decisions--tekus)
11. [Corrections to the record](#11-corrections-to-the-record)
12. [What Flow 5 hands on](#12-what-flow-5-hands-on)
13. [The gate list](#13-the-gate-list)
14. [Premises of the Gate 99 brief that disk contradicted](#14-premises-of-the-gate-99-brief-that-disk-contradicted)

---

## 1. State at a glance

| | at `mvp-gate95` (Flow 5 start) | at `mvp-gate98` |
|---|---|---|
| tests | 1395 in 48 files (`FLOW-4-COMPLETION.md` §1) | **1576 in 50 files** (`--list`, Gate 99) |
| visual baselines | 420 | **492**, all tracked (digest below) |
| walk states (\|WALK\|) | 105 = 31 routes + 8 tabs + 57 overlays + 9 stores | **123** = **36** + 8 + **70** + 9 (sweep order routes, tabs, overlays, stores; `CLAUDE.md` Gates 96 and 98) |
| routes (`ROUTES`) | 31 | 36 (`src/App.tsx:42-43`: `transfer/crypto/:recipientId`, `transfer/crypto/send/:tokenId`) |
| DS pin | v2.12.0 (`fbc6e2f2…`) | **v2.13.0** (`11349b8a9dccf682ce4b15e94ee1cd8c75e14f5a`), `lint:linkage` PASS at Gate 99 |
| stored schema | v3 | **v4** (`SCHEMA_VERSION = 4`, `src/persistence/schema.ts:59`) |
| mutators in the `AccountsProvider` context | 15 | **16** (re-counted at Gate 99 from `AccountsContextValue`); 14 with a caller — `addTransaction` and `adjustFiatBalance` still have none outside the provider |
| `lint:tokens` | 121 files, 4 exemptions | **127 files, 4 exemptions** (run at Gate 99) |
| entry chunk / CSS | 5,979,569 / 200,664 (Gate 94 Phase B) [reported] | 5,994,986 / 202,882 (Gate 98 Phase B, `build:package`, 0 `modulepreload`) [reported] |

Baseline digest at `mvp-gate98`, standing command, re-derived at Gate 99:
`efd3d4a8702196a5c77a840e7fcd666639eaeb676f1d55e5ff81ba5234e13535` (492 files; filesystem and git-blob forms agree —
all 492 are tracked). Netlify served `main@a0264c9` as Published [verified by Teku, 7 Nov 2026; not re-derivable
here]. DS CI #75 green on `v2.13.0` [carried].

**Flow 5's own footprint:** 72 baselines added (32 at Gate 96, 40 at Gate 98), 4 changed (the `transfer-crypto-*`
captures of the old `ComingSoon` stub, Gate 96), 0 deleted; 181 tests added (1395 → 1475 → 1576); two spec files
(`crypto-transfer.spec.ts` 16 tests, `crypto-send.spec.ts` 21). `git diff --stat mvp-gate95 mvp-gate98` outside the
baselines reads 32 files, +2354 / −52.

**The thing to know first.** Flow 5 is the app's first flow whose money is not in ringgit. A crypto holding is stored
as a **quantity** and its ringgit value is derived from a fixed unit price (§3.3); a send moves a token, not a cash
balance, and the fee is paid in the token being sent. It is also the second flow, after Flow 4, that ends in a write
whose other end is somebody else, and the second schema bump since persistence landed that **reset every tester's saved
data once** (Decision 29D, §3.7). The next flow to move money should start from §6.

---

## 2. What Flow 5 is — screens and writers

Figma Section `1266:14394` holds six frames (inventory Flow 5 §2): `1266:14400` the Homepage Crypto tab with the
Transfer sheet open, `1266:14395` the recipient picker, `1266:14396` "Select Token", `1266:14397` "Send Ethereum"
(amount entry), `1266:14399` the same screen with the Network Fee sheet, `1266:14398` the same screen grown into the
review. **The inventory records that the flow is incomplete (A2 / GD1): no success screen exists in Figma.** Teku
decided the writer exists and that the missing screen is built in the MVP (inventory GD1: "build it in the MVP, do not
wait on Figma"); the success page is shared with Flow 4 (§2.1).

### 2.1 Screens

| surface | where | Figma | gate | what it does |
|---|---|---|---|---|
| **Transfer sheet** | `src/shell/TransferSheet.tsx` | `1266:14400` | 92 (Flow 4) | The sheet over Home; Send goes to `/transfer`. Flow 5 changed nothing here. |
| **Crypto recipient picker** | `src/flows/transfer/CryptoRecipientList.tsx`, mounted by `TransferScreen.tsx` as the Crypto tab of `/transfer` | `1266:14395` | 96 | Header "Send Crypto"; "Recent recipients" as the search field's label; five contacts with photos and shortened addresses; search with a no-results state; "New recipient". |
| **Select Token** | `SelectTokenScreen.tsx`, `/transfer/crypto/:recipientId` | `1266:14396` | 96 | "Select Token" / "Enter Transfer Details"; the six real holdings grouped by wallet in a selectable list; Next. |
| **Send Ethereum** (the amount screen) | `CryptoSendScreen.tsx`, `/transfer/crypto/send/:tokenId` | `1266:14397` | 98 | From (the token), To (the contact), Transfer Amount in RM with the token quantity as its caption, the 30F helper line, new-balance rows, Next. One screen for all six tokens. |
| **Network Fee sheet** | `NetworkFeeSheet.tsx` | `1266:14399` | 98 | A `Sheet` "Network Fee": Regular / Priority as `Radio layout="row"`, OK / Cancel. |
| **Summary** | `CryptoSendScreen.tsx`, its third state | `1266:14398` | 98 | The same screen grown in place: Network Fees, Total, the new balances, "Transfer crypto". |
| **Transfer successful** | `TransferDoneScreen.tsx`, `/transfer/done/:transactionId` | **not drawn** | 98 | The one success page, shared with Flow 4, branching on the row's `method`. |
| **Detail sheet rows** | `TransactionDetailSheet.tsx` | **not drawn** | 98 | A written crypto send adds Amount, Network fee and Network after Date. |

"Coming soon." still answers New recipient (`CryptoRecipientList.tsx:101`) and the bar's Scan QR (R96-4), and, from Flow 4,
Receive in the sheet. **Select Token's Next raised "Coming soon." at Gate 96 and navigates to the amount
screen since Gate 98.**

### 2.2 Writer

| writer | gate | writes | moves money |
|---|---|---|---|
| `sendCrypto(row)` | 98 | one ledger row and the sent token's stored quantity | yes — the wallet loses the quantity sent plus the fee; no cash account moves; the row is a transfer, so no budget moves |

`sendCrypto` is the 16th mutator and the second writer (after `sendMoney`) whose argument is the whole row. Flow 5
added no other writer: Select Token and the picker write nothing, and a writer never lands before its caller
(Gate 96's rule).

---

## 3. The money model and the write path

### 3.1 History: the confirm is its own entry (Decision 28A)

Measured at Gate 98 by Phase A and re-measured by Phase B in the repo (`D:\Claude\_handoffs\gate98-phaseB\REPORT.md` §2):

- **Next** pushes the *same path* with `{ fee: true }` (length 3 → 4 in Phase B's sequence): the Network Fee sheet is
  its own entry, so Cancel, ✕, the scrim and device Back pop it.
- **OK** **replaces** that entry with `{ summary: true }` (length unchanged), so the summary is its own entry and Back
  from it — the header's or the device's — lands on the *editable* amount screen (`history.state.usr` null, the button
  reads "Next", no sheet), never on the sheet.
- The summary is *derived from the draft*: the field stays live, an edit recomputes the rows, and an amount that no
  longer fits shows its error and "Transfer crypto" refuses.
- **Transfer crypto** writes, pops the summary, then **replaces** the amount entry with `/transfer/done/txn-crypto-<uuid>`
  (length unchanged). Back from the success page lands on Select Token (`/transfer/crypto/crypto-rachum-greene`), so the
  same money can never be re-offered.
- A reload — or a deep link — anywhere on the amount screen has no contact in the draft and **replaces itself with the
  Crypto tab** (`/transfer`, `{ transferTab: 'crypto' }`), Gate 93's R93-7 rule.
- **The `history.length` reading that once looked like a shrink (7 → 4) was a script artefact.** Phase B replayed the
  prototype's script and a clean sequence: the length is 4 at the fee sheet, 4 at the summary and 4 after both Backs; the
  7 and the 4 came from two different runs of one helper writing a fixed key. No app behaviour is involved (§11).

### 3.2 The draft

`TransferDraftProvider` (`transferDraft.tsx`, mounted around the `Outlet` in `AppShell`) gained a crypto part at Gate 98
(R96-9): the chosen contact, token, amount and fee tier. It is not stored — an unsent draft is not a record — and it
clears when the path leaves `/transfer*` and after a send, as Flow 4's did. Because the contact lives only in the draft,
the amount route (`/transfer/crypto/send/:tokenId`) **cannot be walked by URL**: a cold navigation replaces to the
Crypto tab. The harness therefore expands `:tokenId` over nothing and walks the screen through ten overlay states (§7).

### 3.3 Holdings are quantities; value is derived (R96-1)

- A `CryptoHolding` stores its **quantity**. Its ringgit value is `CRYPTO_UNIT_PRICES[id] × quantity` to the sen
  (`cryptoValueOf`, `derive.ts`), where `CRYPTO_UNIT_PRICES` is `valueMyr / quantity` of each seeded holding
  (`src/data/accounts.ts:189`). **All six seeded values reproduce exactly** (`crypto-send.spec.ts` N1), so making the
  value derived moved nothing.
- Token arithmetic is in **units of 1e-8** (`CRYPTO_UNITS_PER_TOKEN = 100_000_000`, `cryptoUnits`), because floats cannot
  add `0.098279` and `0.00024782` exactly; ringgit arithmetic stays in sen. Eight places is finer than any token's
  display, so a figure the screen shows is never where rounding happens.
- The amount is **typed in RM** and the token quantity is its caption (R96-5; Figma's `0.313 ETH` over `RM 5800.00`).
  `cryptoQuantityForSen` converts at the unit price, to a unit.

### 3.4 The rule for an amount (`cryptoAmountError`)

One function, read by the screen and by the writer's guard so they cannot disagree by a rounding unit. **Total =
amount + fee**, judged in units against the holding:

| condition | message |
|---|---|
| amount ≤ 0 | "Enter an amount" |
| more than two decimals | "Up to 2 decimal places" |
| amount alone exceeds the holding | "More than your balance of RM …" |
| amount fits but amount + fee does not | "Not enough left for the network fee of RM …" |

Zero is not an amount, so no exactly-zero row can be written.

### 3.5 The fee table and the network rule (`src/data/cryptoNetworks.ts`)

A **committed table, not a live quote** (Monarch has no backend). Two tiers, as drawn; the fee is paid **in the sent
token** (R96-2). Ethereum is copied from the frame (`1266:14399`); every other row is that anchor scaled by what the
network actually charges, in MYR at the seed's own unit prices (basis: the file's header comment and Gate 98 Phase A F-a):

| token | network | Regular | Priority | basis |
|---|---|---|---|---|
| BTC | Bitcoin | RM 6.56 · 60+ Min | RM 19.68 · 10 Minutes | 140 vB at 10 / 30 sat/vB = 1,400 / 4,200 sats at RM 468,659/BTC |
| ETH | Ethereum | **RM 4.60 · 60+ Min** | **RM 24.50 · 30 Minutes** | drawn, `1266:14399` |
| USDT | Ethereum | RM 11.82 · 60+ Min | RM 62.96 · 30 Minutes | ERC-20 ≈ 2.57× ETH gas (median 53,966 against 21,000) |
| UNI | Ethereum | RM 11.82 · 60+ Min | RM 62.96 · 30 Minutes | ERC-20, as USDT |
| SOL | Solana | RM 0.01 · Under 1 Min | RM 0.05 · Seconds | 5,000 lamports/signature, a fraction of a sen, floored to RM 0.01 |
| XLM | Stellar | RM 0.01 · Under 1 Min | RM 0.02 · Seconds | 100 stroops, floored to RM 0.01 |

A fee below RM 0.01 is charged as RM 0.01, the smallest amount the app moves. **USDT and UNI travel on Ethereum, not
Tron** (R98-2): the contacts' drawn addresses are 0x (EVM) addresses and Tron's begin with T. The network is what
Decision 30F's grey line names under To: `Only send <SYMBOL> to wallets on the <Network> network.`
(`cryptoNetworkLine`). The sources behind the basis column are web pages cited in Gate 98 Phase A §3 F-a
(`D:\Claude\_handoffs\gate98-phaseA\REPORT.md`); the Stellar figure rests on secondary sources only.

### 3.6 The row and the writer

`buildCryptoSend` (`derive.ts`) builds the row: `id` `txn-crypto-<uuid>`; `accountId` the holding's **wallet**;
`merchant` the contact's name; `logo` the contact's mark; `method` `'Crypto Transfer'`; **`kind` `'transfer'`**
(R96-3 — a crypto transfer is never a purchase, Teku 30 Sept); `amount` the **negative MYR total**,
`−(amountSen + feeSen) / 100`; `category` `'others'`; `recipientId`; `reference` `newReference(occurredAt)`; and
**`crypto: { tokenId, quantity, feeQuantity, fee, tier }`**, which carries what the ringgit figure cannot.

`sendCrypto(row)` calls `cryptoSendProblem(row, cryptoHoldings, CRYPTO_RECIPIENTS)` **before any setter**, throws at the
call site with the problem, then runs two sibling pure updaters: append the row, and `holdingsAfterCryptoSend` on the
holdings. It never nests setters and never calls `addTransaction` or `adjustFiatBalance`. `cryptoSendProblem` refuses a
row that is not a `Crypto Transfer`, not a `transfer`, carries no `crypto`, names no holding, names a holding that is not
in `accountId`'s wallet, does not debit (`amount < 0` strictly), sends a non-positive quantity, whose total does not
exceed its fee, whose quantity plus fee exceeds the holding, names no crypto contact, or carries no reference.
`holdingsAfterCryptoSend` is also what the screen's "Your new balance" preview uses, so the preview and the write
cannot drift. **No fiat account moves**; net worth falls by the amount plus the fee. A crypto send is a transfer, so no
budget moves.

### 3.7 Schema v4 and the one-time reset (Decision 29D)

- `SCHEMA_VERSION = 4`. The new record key is **`cryptoHoldings`** (seventh, last), stored as `{ id, quantity }` only —
  name, symbol, logo and wallet are the seed's and the value is derived, so nothing derived and nothing constant is stored.
  `isStoredCryptoHolding` (known id, finite quantity ≥ 0); `storedRecordsProblem` requires every seeded token exactly
  once; `Transaction.crypto?` is one optional validated object; `MIGRATIONS[3]` adds the seeded quantities.
- **29D's consequence is in `store.ts`: the seed fingerprint is compared *before* migrating**, and the fingerprint now
  covers `CRYPTO_HOLDINGS`. So every stored v3 snapshot classifies `seed-changed` and **resets once**; `MIGRATIONS[3]`
  runs only for a v3 store that already carries the new fingerprint (tests), and must still exist or such a store is
  quarantined. **No MIGRATED-in-the-browser test was added** — a real v3 store resets by design (N8 proves why).
- `DB_VERSION` did not move (the harness parses it). **The provider must report the `cryptoHoldings` atom to
  `usePersistence`, or `reportState` never completes and all persistence stops** (the Gate 94 lesson, again).
- Phase B's mutation M8 (the stored quantity is not restored) is pinned by B6, "KEPT across a reload".

### 3.8 What the rest of the app shows

- **Detail sheet** (R98-5): a written crypto send adds Amount (`0.3125 ETH`), Network fee (`0.0002 ETH • RM 4.60`) and
  Network (`Ethereum`) after Date; From is the wallet, To the contact (existing `movementParties`). The two *seeded*
  crypto rows carry no `crypto` detail and render exactly as before — no existing baseline moved.
- **Recents** (R98-7): `recentCryptoRecipients` already read `recipientId`, so a written send puts its contact first on
  the Crypto tab.
- **Success page** (R98-4): one route, one layout, branching on `method === 'Crypto Transfer'`; prints the token quantity
  as the headline, "to <name>", From (wallet), To (address on the token's network), Network fee (token • RM), Total (RM)
  and Date. No reference. View transaction lands on the row's detail, as Flow 4's does.

---

## 4. The data

- **Crypto contacts** are a constant (`src/data/cryptoRecipients.ts`, five, Figma's drawn set), **outside the seed
  fingerprint** and not stored (R92-5, R96-4). Each carries a `mark`, one 0x `address` and, since Decision 33, an
  `addresses` record for Bitcoin, Solana and Stellar.
- **Addresses.** Figma prints only the two ends of each 0x address (`0x92fa...1ae3`), both valid hex; each address keeps
  the drawn first and last four hex digits and fills the 32 between with the first 32 hex digits of SHA-256 of the
  contact's name, written as literals so nothing computes an address at runtime. **Decision 33 = A** adds one well-formed
  address per network on each contact; the 0x address serves every EVM token (ETH, USDT, UNI).
- **Order on screen** is the Bank tab's rule applied to crypto sends (`recentCryptoRecipients`, R96-12): newest send first,
  the rest in Figma's order. The two seeded crypto rows carry no `recipientId`, so a row with none is matched by its
  `merchant` naming the contact exactly — no seed edit. Over today's seed that reads Granddaughter, Rachum Greene,
  Grandson, Jonathan Llango, Tobey Jibriani, where Figma draws Granddaughter, Grandson, Rachum Greene (§8).
- **Photos** (Decision 31H: Teku supplied the four, 256 × 256 PNGs exported at 4× from `1266:14395`; converted outside
  the repo with headless Chromium, no dependency added):

  | file | bytes |
  |---|---|
  | `public/media/transactions/granddaughter.jpg` | 11,392 |
  | `grandson.jpg` | 4,766 |
  | `jonathan-llango.jpg` | 13,296 |
  | `tobey-jibriani.jpg` | 13,392 |

  `rachum-greene.jpg` is the Bank contact's file, shared (Gate 92). The largest render is `Avatar l` = 40 CSS px, so 256 is
  6.4× CSS and above the 3× floor; sha256 per file is in `public/media/transactions/README.md` (R96-16).
- **Holdings and wallets:** six holdings (Bitcoin, Ethereum, Tether, Stellar, Uniswap, Solana) in Flow 7's "Marge's Wallet"
  and "Fun Wallet"; the crypto wallet total reads RM 102,354.02 at the seed, Flow 1's authoritative figure (inventory
  §G; the arithmetic Gate 98 Phase A used for "Your new balance"). Select Token lists all six (R96-8, R96-13).

---

## 5. The decisions and rulings

### 5.1 Teku's decisions, as worded on disk

| # | decision | source |
|---|---|---|
| **28A** | The crypto confirm follows the drawing: the amount screen grows in place after the Network Fee sheet; the summary state is its own history entry so device Back returns to the editable amount. Built at Gate 98. 4 Nov 2026 | register §2as, `CLAUDE.md` Gate 96 |
| **29D** | `CRYPTO_HOLDINGS` is hashed into `seedFingerprint` when crypto holdings become stored, resetting testers once. Built at Gate 98. 4 Nov 2026 | §2as |
| **30F** | A grey helper line under To: "Only send <TOKEN> to wallets on the <network> network." Built at Gate 98. 4 Nov 2026. (The text exists only in the older iteration of the frames, §7.) | §2as |
| **31H** | Teku supplies the four recipient photos. Built at Gate 96. 4 Nov 2026 | §2as |
| **32A** | "Ethereum" in a two-tone title uses `text/primary/default` (`--mapped-text-primary-default`; `#0358cc` light, `#68a8ff` dark). Figma's raw `#627eea` is no token and measures 3.69:1 on white; the token measures 6.42:1 light and 8.63:1 dark. Teku, 4 Nov 2026, "Follow your decision A" | DS `CLAUDE.md` Gate 97 §0 |
| **33A** | One well-formed address per network on each contact; the drawn 0x address stays. 6 Nov 2026. **Teku delegated the choice to the review thread after research:** Coinbase's wallet API says an address is meaningful only with its network and its address-book entries carry one; Binance's entries are label, coin, address and network | §2at |
| **34D** | The To field reuses Flow 4's contact field — photo, name, address; a tap returns to the Crypto tab keeping the amount; no QR icon. 6 Nov 2026. **Teku delegated the choice to the review thread after research:** address-poisoning research recommends named saved contacts over truncated hex, and the DS `Field` has no read-only state. A recorded divergence from `1266:14397`. (Option E would have needed a DS read-only `Field` first.) | §2at |

Decisions 28–31 were given together: Teku, 4 Nov 2026, *"Decision follow yours, Great recommendations"* (register §2as).
The letters name the option in Phase A's decision brief that Teku took ("follow yours" meant the thread's
recommendation; e.g. 28's Option A is "follow the drawing", Gate 96 Phase A F1). **The next free Teku decision number is
35.**

### 5.2 DS rulings behind the flow (DS Gate 97, v2.13.0)

From the DS repo's `CLAUDE.md` "Gate 97 DS" §0 unless noted:

| | ruling |
|---|---|
| **R97-1** (G64) | `SelectTransfer` gains `caption?: string`: the label slot, same position and per-appearance type class, inside or outside a `FormField`; a `<span id>`, never a `<label>`; its id appended to `aria-describedby` after the FormField's error and helper ids. Outside a FormField, with `label` and `caption`, the caption takes the slot and `label` names the input through `aria-label` |
| **R97-2** (G66) | `Radio` gains `layout?: 'inline' \| 'row'` (default `'inline'`), `description` and `trailingLabel`; `row` keeps ONE `<label>` around the whole row, 343 × 56 as ramp steps. The new props do nothing in `inline` |
| **R97-3** | In `row` the keyboard ring surrounds the whole row, only under `:focus-visible` on the input; never after a pointer press |
| **R97-4** | No hover, pressed or selected tint on the row: none is drawn |
| **R97-5** (G61) | `LogoSize` gains `'fill'`: `.mn-logo--fill { height: 100% }`, a HEIGHT fill unrelated to `sizing`; `xs` / `s` / `m` / `l` untouched |
| **R97-6** | v2.13.0, minor; every existing render path pinned before the first source edit; 0 moved |
| **G65 + Decision 32** | `HeaderDefault` gains `titleAccent?: string`, rendered `{title} <span class="mn-header-default__title-accent">` in Decision 32's token; the ellipsis covers the whole line; the stepper variant ignores it |
| **R97-7** | MVP-side record, nothing built: Flow 5's Network Fee sheet uses the DS's centred `OverlayHeader`, a recorded divergence from the case study's older frame header (`Header` `1088:11599`: left-aligned title, close right, padding 24/16/16) |
| **R97-8** | DS-round records, nothing built: (1) `HeaderDefault`'s title is a `<span>`, not a heading; (2) the case-study Bottom Sheet fill (`1063:13765`) binds a foreign `neutral01`; (3) the row radio's dot binding differs (`icon/primary/on-color` against `--mapped-text-primary-on-color`, both white); (4) the fee row's 8px padding, 16px gap and 8px radius come out of codegen as raw literals that land on ramp steps |
| **R97-9, R97-10** | *Fix before commit, from the DS commit message and `D:\Claude\_handoffs\gate97-ds\fix\REPORT.md` — in neither DS document.* R97-9: the caption file's `caption={undefined}` guard compared `undefined` with an omitted prop (the same value), so it could not fail; it now renders each of the 28 pinned `SelectTransfer` paths with `caption={undefined}` and compares it with the v2.9.0 hash pinned in `SelectTransfer.formField.test.tsx` (read from that file, not copied). R97-10: a new test pins the `formField ? undefined : …` arm of the caption's `aria-label` expression |

**The DS release.** v2.13.0 is additive: of 339 pinned existing render paths, 0 moved in markup and 0 of 678 light and
dark computed rows moved; 17 new-prop cases (34 rows) are reported separately. 43 tests were added by the build and one by
the fix: **1,004 → 1,048 in 77 files** (the commit message's figure; the DS `CLAUDE.md` and `CHANGELOG.md` still read 1,047,
§11). `dist/index.js` 5,616,326 B, `dist/index.css` 159,960 B. DS Phase B ran 51 proofs, two negative controls (both NO
PROOF, as required) and one mutation (R12f) that survived its target and was killed by its whole file.

### 5.3 Thread rulings, by gate (each overturnable)

The wording is `CLAUDE.md`'s.

**Gate 96, R96-1 to R96-19.**

- **R96-1** holdings stored as quantity; value = a fixed per-token price × quantity.
- **R96-2** a per-token two-tier fee table anchored on the drawn ETH figures; the fee in the sent token; total = amount + fee.
- **R96-3** a crypto send is `kind: 'transfer'`, and the row carries the token and its quantities.
- **R96-4** saved contacts as drawn; New recipient and Scan QR say "Coming soon."; each recipient has its own valid address.
- **R96-5** the amount is entered in RM, with the token quantity as the caption.
- **R96-6** G64 / G65 / G66 are fixed in a DS gate (97) before the amount screen, following Figma.
- **R96-7** the fee sheet's OK commits; Cancel / ✕ / the scrim discard.
- **R96-8** the token chip returns to Select Token; the OS keyboard; "Your new balance" = the wallet total plus a per-token
  row; the token list from the six real holdings (a recorded divergence).
- **R96-9** routes `/transfer/crypto/:recipientId` (Select Token) and `/transfer/crypto/send/:tokenId` (amount, Gate 98).
- **R96-10** sequence: Gate 96 MVP picker + Select Token → Gate 97 DS G64–G66 → Gate 98 MVP amount / fee / summary / send /
  schema v4 / success → Gate 99 record.
- **R96-11** register G64–G66 plus the two notes.
- **R96-12** the crypto contacts follow the Bank tab's newest-send ordering, so Rachum Greene sits second where Figma
  draws Grandson (a recorded divergence).
- **R96-13** Select Token lists the six real holdings, where Figma draws five.
- **R96-14** Next stays in the page flow instead of pinned to the bottom, under the drill-down "action bars stay in flow"
  standard (Gate 80).
- **R96-15** after a failed Next, focus moves to the first token row so the DS row's own ring applies. Checked live at
  Phase B after a pointer tap: no ring (mouse and touch), a ring under Tab+Enter — as Gate 89-B requires.
- **R96-16** the photo folder's README gains the four new files (insert-only), which adds one path to the closed list.
- **R96-17** *(first on disk at Gate 98)*: Select Token's invalid-state 14 px scroll at 375 × 812 (826 px against 812) is
  accepted; the message and Next are fully inside the viewport and the button is not covered. The 160 px shell bottom
  reserve is what turns the +24 px message into a scroll. The 826 px `…-invalid-*` baselines stand.
- **R96-18** *(first on disk at Gate 98)*: Select Token's B6 holds focus over a 400 ms observation window, using the
  `focusout`-counter mechanism of `transfer.spec.ts` B2, so a handler that focuses the option and drops it later fails.
- **R96-19** *(first on disk at Gate 98)*: new Node test N6 on synthetic rows pins that only rows naming a recipient by id
  reach the Bank recipient order; rows that merely carry a recipient's name as merchant do not.

**Gate 98, R98-1 to R98-12.**

- **R98-1** the fee table (§3.5): ETH as drawn, the others scaled; anything below RM 0.01 charged as RM 0.01. "Estimated" is
  not shown — the drawn copy has no place for it (a recorded gap).
- **R98-2** USDT and UNI travel on Ethereum; BTC on Bitcoin, SOL on Solana, XLM on Stellar.
- **R98-3** schema v4 (§3.7). **R98-4** one shared success page at `/transfer/done/:transactionId`, branching on `method`; no
  reference is shown. **R98-5** the detail sheet adds Amount, Network fee and Network for a written crypto send; the
  seeded crypto rows are unchanged. **R98-6** history (§3.1). **R98-7** a crypto send puts its contact first on the Crypto tab.
- **R98-8** the amount route has an empty expansion: 10 overlay states, +40 baselines, +80 walk tests, +21 spec tests.
- **R98-9** one gate, no split. **R98-10** From's chevron returns to Select Token (one place chooses a token).
- **R98-11** the summary's 833 px capture is accepted as R96-17 was. **R98-12** B4 and B9 were strengthened by the M9 and
  M11 proofs; B9 enters and leaves only through the app's own controls.

**Phase A's other forks** (Gate 96 Phase A F1–F14, `D:\Claude\_handoffs\gate96-phaseA\REPORT.md` §6) are the source of the
above; where a fork reached Teku it is a numbered decision in §5.1, otherwise it is an R96 ruling.

---

## 6. Standards established

These are for later flows to reuse. Each cites the gate that set it.

1. **The in-place confirm with its own history entry** (Gate 98, Decision 28A). When the frame draws the confirm as the
   same screen grown rather than a separate sheet: the sub-state that is a sheet (the fee sheet) is a pushed entry of the
   *same path*; its OK **replaces** that entry with the summary state; the summary is derived from the draft, so Back from
   it lands on the editable amount; the write pops the summary and **replaces** the amount entry with the success page.
   Nothing is re-offerable and no Back loops.
2. **One saved address per network** (Decision 33). A crypto address is only meaningful with its network, so a contact
   carries one per address family and the To line shows the one for the token being sent; the helper line states the network.
3. **Named recipients over truncated hex** (Decision 34). Where the design shows a bare address, the MVP reuses the
   contact field (photo, name, address) rather than build a read-only input the DS cannot express.
4. **One success page for every transfer.** `TransferDoneScreen` branches on `method`; the `:transactionId` route and the
   Done / View-transaction rules are shared (R98-4).
5. **DS-first fixes for drawn capabilities** (R96-6, DS Gate 97). When a frame draws something the DS cannot express, the
   DS gets an additive release *before* the MVP gate that needs it — new optional props or one new value, every existing
   render path hash-pinned before the first edit and proved unmoved — and the MVP never overrides DS geometry meanwhile.
   Gate 97's four parts moved 0 of 339 paths.
6. **A test-only fix before commit when a mutation survives.** Gate 96: B6's focus check survived a handler that dropped
   focus later (M9b, M9c) and N6 was added for the Bank order (M13b) — R96-18, R96-19. Gate 97 DS: the `caption={undefined}`
   guard could not fail (C6i) — R97-9, R97-10. Gate 98 Phase A: B4 and B9 were strengthened by M9 and M11 — R98-12. In each
   case only a test file changed, the proofs were re-run against the staged tree, and the fix is recorded as a ruling.
7. **An in-memory draft can only be tested by entering and leaving through the app's own controls** (Gate 98 B9). A page load
   empties the draft whatever the provider does, so a test that re-enters with `gotoRoute` proves nothing about it.
8. **Money in the unit it cannot lose.** Ringgit in sen, tokens in 1e-8 units; a derived value (`cryptoValueOf`) is never
   stored. The amount rule, the writer's guard and the balance preview share one function each, so they cannot drift.
9. **A required argument that is the whole instruction, judged before any setter** (Flow 4's standard 2, reused):
   `cryptoSendProblem(row, committedState)` throws at the call site; two sibling pure updaters follow; no nested setters.
10. **A selectable list of rich rows built from `MenuItem` outside `Menu`** (Gate 96). Figma draws no selected state for the
    token rows; `MenuItem type="crypto"` carries exactly the drawn four labels and a selected treatment, and `Menu` itself
    paints a floating panel the page must not have, so the screen supplies the `role="listbox"` and `Menu`'s roving keyboard
    model (about 25 lines). Register §2as notes this is the shape G66's fix would serve.
11. **`git apply` writes patched files through `.gitattributes`.** Applying Phase A's measured diff with
    `core.autocrlf=false` still wrote `package.json` and `package-lock.json` back as CRLF (they are LF in the working copy and
    `text=auto` governs the write-back). The fix is to copy the prototype's bytes back and then byte-compare all paths.
12. **Mutation proofs:** the negative control typechecks, runs and reports NO PROOF; a mutation must typecheck; signatures
    come from a failing log (Flow 4's standard 11, unchanged).

---

## 7. Figma-to-code lineage

| frame | what it is | route | component files | walk states |
|---|---|---|---|---|
| `1266:14400` | Homepage Crypto tab with the Transfer sheet | any (the sheet is shell-level) | `src/shell/TransferSheet.tsx` (Flow 4) | `/ [overlay:transfer]` (Flow 4) |
| `1266:14395` | "Send Crypto" recipient picker | `/transfer` Crypto tab | `CryptoRecipientList.tsx`, `TransferScreen.tsx`, `src/data/cryptoRecipients.ts` | `/transfer [tab:crypto]` (`transfer-crypto`), `[overlay:no-match]` (`transfer-crypto-no-match`) |
| `1266:14396` | "Select Token" | `/transfer/crypto/:recipientId` | `SelectTokenScreen.tsx` | the route × 5 contacts, plus `[overlay:selected]`, `[overlay:invalid]` |
| `1266:14397` | "Send Ethereum", amount entry, keypad | `/transfer/crypto/send/:tokenId` | `CryptoSendScreen.tsx`, `transferDraft.tsx`, `cryptoNetworks.ts` | `[overlay:amount-{btc,eth,usdt,sol,xlm,uni}]`, `[overlay:amount-invalid]` |
| `1266:14399` | the same screen with the Network Fee sheet | same | `NetworkFeeSheet.tsx` | `[overlay:fee]` |
| `1266:14398` | the same screen grown into the review | same | `CryptoSendScreen.tsx` | `[overlay:summary]` |
| *(undrawn)* | Transfer successful | `/transfer/done/:transactionId` | `TransferDoneScreen.tsx` | `[overlay:sent]` (the route itself cannot be walked: its id is random) |
| *(undrawn)* | crypto rows in the detail sheet | the Transactions tab | `TransactionDetailSheet.tsx` | none (covered by `crypto-send.spec.ts` B10) |

The ten amount-screen states hang off `/transfer/crypto/crypto-rachum-greene` (the contact is in the draft). Distinct
Flow 5 baseline names on disk: 19 (`transfer-crypto`, `transfer-crypto-no-match`, five contact routes, and the Rachum
Greene states `selected`, `invalid`, `amount-*` ×7, `fee`, `summary`, `sent`).

**The three "success" frames.** Page "Screens x MasterCard" (`298:13`) still holds three raw frames — not instances, not
main components — that Phase A read at Gate 96: `343:5966` ("…Crypto_success01", a recipient picker titled "Transfer" with
the same five people), `345:6407` ("…Crypto_success02": "New Transfer" / "Enter Transfer Details", From = Ethereum, To = an
**empty "Enter address or domain" field** with a QR glyph and the helper text **"Only send ETH to wallets on the Ethereum
network."**, Next) and `345:6944` (also named "…Crypto_success02": a "Select Token" list). They are an older iteration, not
live; none is the main component of a live frame. **They are the only place the network warning (Decision 30F) and free
address entry exist; the live flow picks a saved contact and shows a read-only address.** The six live frames carry the
same family of old names (`…Crypto_success01`, `…Crypto_success02` and three `Homepage_transfer_Bank_success03`) until
Teku's 2026-08-04 rename; **none of those names ever denoted a success screen** (inventory A1–A3).

**Flow 5 baselines.** Gate 96 added 32 (eight states) and changed 4 (the old `transfer-crypto-*` `ComingSoon` stub — a
replaced stub changes baselines and adds none, Gate 48's rule). Gate 98 added 40 (ten states) and changed 0; the DS v2.13.0
re-pin alone moved 0. Total: **72 added, 4 changed, 0 deleted.** Specs: `crypto-transfer.spec.ts` 16, `crypto-send.spec.ts`
21 (`--list`, Gate 99).

---

## 8. Deviations from Figma

| Figma | shipped | who |
|---|---|---|
| contacts drawn Granddaughter, Grandson, Rachum Greene, … | Granddaughter, Rachum Greene, Grandson, … — the Bank tab's newest-send rule over the two seeded crypto rows | R96-12 |
| Select Token draws five rows ("Marg's Wallet" / "Fun Tokens", RM 5,117.70 for Stellar and Uniswap) | six rows with Solana, "Marge's Wallet" / "Fun Wallet", RM 2,500.00 each — the real holdings | R96-8, R96-13 |
| Next pinned to the bottom (`Frame 464` at y=665 over a fade) | Next in the page flow, sticky (y 604) | R96-14, Gate 80 precedent |
| the Network Fee sheet's header left-aligned (case-study `Header` `1088:11599`) | the DS `OverlayHeader`, centred | R97-7 |
| the To field a bare field with address text and a QR glyph (not a `Select / Wallet Account`) | Flow 4's contact field (photo, name, address); a tap returns to the Crypto tab; no QR icon | Decision 34 = D |
| one 0x address (`0x9dj6…0fgm`, not valid hex, matching none of the five contacts, inventory A7 / A8) | each contact's own well-formed address per network; the 0x address serves every EVM token | Decision 33 = A |
| "Ethereum" in the title a raw `#627eea` range fill | the DS primary token (6.42:1 light, 8.63:1 dark against 3.69:1) | Decision 32 = A |
| "Transfer cypto" on the button (inventory A4) | "Transfer crypto" | inventory call, fix in code |
| the figures 0.313 / 0.0003 / RM 4.50 / 0.317 / RM 96,553.20 / 1.0642 (they do not reconcile, inventory §G) | computed from the unit price and the fee table: at RM 18,561.23 per ETH, RM 5,800 is 0.3125 ETH; RM 5,800 + RM 4.60 = RM 5,804.60 | R96-1, R96-2 |
| no "estimated" wording on the fee (there is no place for it in the copy) | none; `cryptoNetworks.ts:10` still says the sheet carries it (§11) | R98-1 |
| the OTP keypad (iPhone) | the OS keyboard; the amount input is `inputMode="decimal"` | R96-8 |
| Crypto tab rows 48 tall (pitch 72) | the DS `ListItem`'s own 44 (pitch 68), so the body sits 2–5 px higher and "New recipient" lands at y 605 against 628 (Figma's own adjacent screens already disagree on row height, inventory A13) | R92-15 class: findings, no override |
| the amount flag at 20px | `Logo size="fill"` in `ElementWrapper m`, 20 × 20 (G61 closed). **Flow 4's flag is not retrofitted** — it keeps `Logo size="xs"` (14px) | Gate 98 |
| no success page, no review sheet | the shared success page; the review is the drawn in-place summary | inventory GD1; Decision 28A |
| header "Select Token" under a subtitle "Enter Transfer Details" (inventory A5) | built as drawn | inherited Figma quirk |

---

## 9. Deferred and open items

### 9.1 Gaps (register §2as, §2at)

| gap | what | state |
|---|---|---|
| **G61** | no `Logo` size fits the 20px flag slot | **closed** by DS v2.13.0 (`'fill'`); Flow 4's flag not retrofitted |
| **G64** | `SelectTransfer` inside a `FormField` never rendered its caption | **closed** by v2.13.0 (`caption`) |
| **G65** | `HeaderDefault.title` was a plain string; Flow 5 draws a two-colour title | **closed** by v2.13.0 (`titleAccent`) |
| **G66** | no single-choice row with a sub-line and a trailing value | **closed** by v2.13.0 (`Radio layout="row"`) |
| **G67** | a deep-linked Select Token leaves the app on Back — it replaces itself with `/transfer`, and Back from there goes to `about:blank` because the replaced entry no longer carries the "opened directly" key; two Backs leave the app | **open, MVP, Gate 96 code, not fixed**; the UI integration round |

The tally after Gate 98 is 66 entries, 38 closed, 28 open, highest G67 (register §2at); Gate 99 does not move it (§2au).
Still open from Flow 4, untouched by Flow 5: G58, G60, G62, G63.

### 9.2 Deferred — MVP side

- **The 160 px shell bottom reserve** turns small content-driven overflows into scrolls (Select Token's invalid state at
  826 px, the summary's 833 px). Accepted twice (R96-17, R98-11); the reserve itself is for the UI integration round.
- **Flow 4's MYR flag can now go to 20px** with `Logo size="fill"`; not done. UI integration round.
- **The DS findings recorded at Gate 97** (R97-8): the title is a `<span>`, not a heading; the case-study Bottom Sheet fill
  binds a foreign `neutral01`; the row radio's dot binding; the fee row's raw literals. DS round; none blocks.
- **A "estimated" fee label** has no place in the drawn copy (R98-1). A design call if wanted.
- **`npm audit`** reported three high-severity advisories at Gate 98's install (Gate 85 recorded two): the hygiene round.
- **Rachum Greene's two records** (Bank and Crypto) share one photo and are not joined (Flow 4's F12).
- **The `cryptoNetworks.ts` header comment is stale** (§11) — a source comment, not touched at a documents-only gate.

---

## 10. Open decisions — Teku's

1. **The zero-amount predicate** (`transactionDisposition`, `src/data/derive.ts`, a non-transfer row of exactly 0 reads as
   income) is still open and unowned (Gate 83). Flow 5's writer cannot emit such a row: the row is a `transfer`, and
   `cryptoSendProblem` requires `amount < 0` strictly.
2. **A real-phone walk of Flow 5 is unconfirmed.** Teku walked the live site on 7 Nov 2026 and reported "all tests good"
   [verified as his words]; whether that was on a phone is not stated. The standing instrument is the Playwright harness
   (375 and 430 at DPR 2); iOS focus behaviour (G58) can only be seen on a device.
3. **Whether the fee sheet should say "estimated".** Teku drew none; the committed table is a mimic, not a quote (R98-1).
4. **G63's input method** (Flow 4) is still unestablished.

---

## 11. Corrections to the record

All insert-only; the earlier text is left as written.

- **The Gate 96 section of `CLAUDE.md` says 1474 tests; it was 1475** after N6 (Gate 96 Phase B / fix). Corrected at Gate 98
  (`CLAUDE.md`); the Gate 96 commit message already reads 1475.
- **R96-17, R96-18 and R96-19 were on no repo file until Gate 98.** `CLAUDE.md` Gate 96 and §2as stop at R96-16; the rulings
  were in the Gate 96 commit message and the fix/Phase B reports only.
- **The `history.length` "7 → 4" is explained.** Gate 98's `CLAUDE.md` section and §2at both call it "unexplained … Phase B
  re-measures it". Phase B measured it: a script artefact (§3.1). **No record on disk carried the explanation until this
  file.**
- **The Gate 96 mutation count.** The thread said "35 proved plus 2 NCs"; the fix session could reach 33 proved plus 2
  negative controls (Phase B's 30 + M9b, M9c, M13b), and the Gate 96 commit message says 33.
- **DS R97-9 and R97-10 are in the DS commit message only.** The DS `CLAUDE.md` "Gate 97 DS" §0 table stops at R97-8, and the
  DS `CHANGELOG.md` and `CLAUDE.md` §4 still read "1,004 → 1,047", where the tag carries 1,048 tests in 77 files (caption 16).
- **R97-7 and R97-8 were in no MVP file.** They are MVP-side and DS-round records; they are reproduced in §5.2.
- **`src/data/cryptoNetworks.ts:10` says the sheet "says so (\"Estimated network fee\")".** Nothing under `src/flows/transfer`
  carries the word (grep: no hits); R98-1 records that the drawn copy has no place for it. The comment predates that ruling.
- **§2as said "next free Teku decision 32"; DS Gate 97 used 32A the same day.** §2at corrected the next free number to 35.
- **§2at is dated 2026-11-06; the commit and tag are dated 2026-11-07.** The build ran on the 6th; Teku committed on the 7th.
- **`FLOW-4-COMPLETION.md` §12 said Flow 5 would need to decide "what a crypto review shows that Figma does not draw".** Figma
  does draw it — the Network Fee sheet and the grown summary (Gate 96 Phase A §2).
- **The Gate 98 build's `git apply` wrote two LF files back as CRLF** (§6 item 11). Content was identical modulo CR; the
  prototype's bytes were copied back and all 66 paths then matched.
- **The DS Gate 97 investigation's own corrections** stand: the accent in Figma is not primary (a raw `#627eea`); Flow 4's
  frame draws the MYR flag in the 20px slot, so 14px was the MVP's divergence; there is no "R92-15" in the DS `CLAUDE.md`
  (the R92D table ends at R92D-14); `Radio` also takes `isInvalid`, `isRequired`, `isDisabled` and `id`.

---

## 12. What Flow 5 hands on

- **Flow 6 (`Homepage_transfer_Ai Alert`)** owns "New recipient", Scan QR and the AI alert. "New recipient" and Scan QR say
  "Coming soon." today on both tabs; any change to who can be in `RECIPIENTS` or `CRYPTO_RECIPIENTS` is Flow 6's.
- **Undrawn actions stay "Coming soon."** (the MVP scope rule): New recipient, Scan QR, Receive, Add crypto.
- **Persistence:** `cryptoHoldings` and `Transaction.crypto` are stored; any later schema bump follows §3.7 — and any change
  to a seed that feeds the fingerprint resets every tester once, so a seed gate checks that consequence.
- **The next flow that moves money** should start from §6 items 1, 5, 8 and 9 and from Flow 4's §6.
- **The UI integration round** picks up G67, the 160 px reserve and Flow 4's flag (§9.2).

---

## 13. The gate list

Dates: the commit's author date from `git`, with the register's status date in brackets where it differs.

| gate | repo | what | tag / SHA | date |
|---|---|---|---|---|
| **96** | MVP | Crypto recipient picker, Select Token; Phase B stopped on a surviving mutation, the fix session added B6's window and N6 | `mvp-gate96` `16c943473cb02e8085165d3c74f99c47acac65d4` (tag object `1e2c3d6944743ec1c42c3e56d14561703d5f636d`) | 2026-11-04 |
| 97 DS | DS | `SelectTransfer` caption, `HeaderDefault` title accent, `Radio` row, `Logo` fill (§1 investigation, build, Phase B, fix) | `v2.13.0` `11349b8a9dccf682ce4b15e94ee1cd8c75e14f5a` (tag object `5889cb64aaa30a33b25938eceaa72f914c60d1b7`) | 2026-11-05 |
| **98** | MVP | amount screen, Network Fee sheet, summary, `sendCrypto`, shared success page; schema v4; re-pin to v2.13.0 | `mvp-gate98` `a0264c9b929aa78ab296c7250cb08384767f7a74` (tag object `b269d9da8b43c62a13b72697eb6ffe6aa63ad7c7`) | 2026-11-07 [register 2026-11-06] |
| 99 | MVP | this record (documents only) | `mvp-gate99` (Teku tags) | 2026-11-07 |

There is no MVP Gate 97. The MVP's last Flow 4 gate (`mvp-gate95`, `8cab71a92898e8e7b36edfe172f5a6c6ccfd5f1c`, the Flow 4
record, tag object `b1e770fdea487e18a833c60d2ca4bd78823f94e2`) is the last gate before Flow 5 and is not part of it.

---

## 14. Premises of the Gate 99 brief that disk contradicted

1. **"Its rulings are R96-1…R96-19, DS R97-1…R97-10 and R98-1…R98-12."** All exist, but not all on a repo file: R96-17 to
   R96-19 reached disk only at Gate 98; R97-9 and R97-10 are in the DS commit message and the Gate 97 fix and Phase B reports
   and in neither DS document; R97-1 to R97-8 are in the DS `CLAUDE.md` and in **no MVP file** before this one (§5.2, §11).
2. **"The three 'success'-named old frames."** The live frames' old names include five containing "success" (`…_Crypto_success01`,
   `…_Crypto_success02` and three `Homepage_transfer_Bank_success03`, inventory §2). The three *old frames still in the file*
   are `343:5966`, `345:6407` and `345:6944` on page `298:13` (§7); this record treats those as the brief's three.
3. **"The `history.length` reading, explained by Gate 98 Phase B as a script artefact."** True of the Phase B report; **no
   file in the repo said so** — `CLAUDE.md` and §2at still call it unexplained (§11).
4. **"Teku's walk: 'all tests good' [verified as his words]."** Cannot be re-derived from disk; recorded as his words. Whether
   it was on a real phone is not stated (§10 item 2). **DS CI #75 green** is likewise [carried]: `gh` is not available here.
5. **No premise in §0 disagreed.** `main`, `origin/main` and `mvp-gate98^{}` all read `a0264c9b…`, 92 tags, clean tree; DS
   `main` = `v2.13.0^{}` = `11349b8a…`, 35 tags; 1576 tests in 50 files; 492 baselines at the quoted digest;
   `SCHEMA_VERSION = 4`; pin `#v2.13.0`.
