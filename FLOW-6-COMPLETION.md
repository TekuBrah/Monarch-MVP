# Flow 6 — completion record

**Flow 6 is adding a new bank recipient and the high-risk transfer alert: from the Bank tab's "+ New recipient",
choose how to reach the payee, pick the bank, enter the account details, have the account looked up, land on the
amount screen with the new payee filled in, and — on a first payment that looks risky — be stopped by a warning,
an explainer and a second confirm before Flow 4's review sheet.** (Figma Section `1266:14356`,
`Homepage_transfer_Ai Alert`, file `v9MI8jxTaXiJA234Hkanlf`.) It was built across two MVP gates, `mvp-gate101` and
`mvp-gate103`, with two DS releases before them, **v2.14.0** (DS Gate 102) and **v2.15.0** (DS Gate 104). **There is
no MVP Gate 102 or MVP Gate 104: those numbers are the DS gates.** The last build gate is `mvp-gate103` at
`b21c9837d79782bccf88a2b0713220cb46996698`. This file records where the flow stands at that commit. Gate 105 (this
document) changed no code.

Every figure below was derived at Gate 105 from the repository (`git`, the source, the committed baselines,
`npx playwright test --list`, `npm run lint:tokens`). Where a figure came from an earlier gate's record or hand-over
report and could not be re-derived without running the suite or a build, it is labelled **[reported]**; where it came
from the review thread or the Gate 105 brief and is on no other file, **[carried]**; where Teku confirmed it himself,
**[verified]**. §14 lists every premise of the Gate 105 brief that disk contradicted.

The per-gate detail lives in `CLAUDE.md` (the Gate 101 and Gate 103 sections) and in the gap register §2av (Gate 101),
§2aw (Gate 103) and §2ax (this gate). The DS side lives in the DS repo's `CLAUDE.md` ("Gate 102 DS", "Gate 104 DS") and
`CHANGELOG.md` (v2.14.0, v2.15.0). The hand-over reports are in `D:\Claude\_handoffs\gate100-phaseA\` to `gate104-ds\`.
This file is the summary to read first.

**Rule for this file:** it holds no text, figure or hash taken from a receipt photograph. Every name, bank and account
number below comes from the seeded fixtures (`src/data/*.ts`) or the drawn frames, and is fictional.

**Where a ruling is attributed, the attribution is the source's own.** Rulings numbered `R10x-n` are the review
thread's (overturnable by Teku); decisions numbered without an `R` are Teku's, delegated where the source says so. §5
gives the wording the records use; where this file and §2av–§2ax differ, the register governs.

---

## Contents

1. [State at a glance](#1-state-at-a-glance)
2. [What Flow 6 is — screens and the writer](#2-what-flow-6-is--screens-and-the-writer)
3. [The write path and the alert path](#3-the-write-path-and-the-alert-path)
4. [The data, and the test accounts](#4-the-data-and-the-test-accounts)
5. [The decisions and rulings](#5-the-decisions-and-rulings)
6. [Standards established](#6-standards-established)
7. [Figma-to-code lineage](#7-figma-to-code-lineage)
8. [Deviations from Figma](#8-deviations-from-figma)
9. [Deferred and open items](#9-deferred-and-open-items)
10. [Open decisions — Teku's](#10-open-decisions--tekus)
11. [Corrections to the record](#11-corrections-to-the-record)
12. [What Flow 6 hands on](#12-what-flow-6-hands-on)
13. [The gate list](#13-the-gate-list)
14. [Premises of the Gate 105 brief that disk contradicted](#14-premises-of-the-gate-105-brief-that-disk-contradicted)

---

## 1. State at a glance

| | at `mvp-gate99` (Flow 6 start) | at `mvp-gate103` |
|---|---|---|
| tests | 1576 in 50 files (`FLOW-5-COMPLETION.md` §1) | **1746 in 52 files** (`--list`, Gate 105) |
| visual baselines | 492 | **560**, all tracked (digest below) |
| walk states (\|WALK\|) | 123 = 36 routes + 8 tabs + 70 overlays + 9 stores | **140** = **37** + 8 + **84** + **11** (the section-header sweep's own counts, Gate 103 Phase B, all three runs) [reported] |
| routes (`ROUTES`) | 36 | **37** (`/transfer/new`) |
| DS pin | v2.13.0 (`11349b8a…`) | **v2.15.0** (`ecefba210dbec3aee6ad7db36500f68133819c46`, `package.json:28`, lock `ecefba210dbe`) |
| stored schema | v4 | **v5** (`SCHEMA_VERSION = 5`, `src/persistence/schema.ts:68`) |
| `lint:tokens` | 127 files, 4 exemptions | **134 files, 5 exemptions** (run at Gate 105; the fifth is the shield slot's 82 px) |
| entry chunk / CSS | 5,994,986 / 202,882 (Gate 98) [reported] | **6,014,946 / 207,742** (Gate 103 Phase B, `build:package`, 0 `modulepreload`) [reported] |

Baseline digest at `mvp-gate103`, standing command, re-derived at Gate 105:
`63fe1401c56717b4a918cab1302c436038ffcad8bc8da57a3a79b6adcc39ba80` (560 files; every one tracked). Netlify served
`main@b21c983` as Published [verified by Teku's screenshot, 14 Nov 2026; not re-derivable here].

**Flow 6's own footprint:** 68 baselines added (44 at Gate 101, 24 at Gate 103), 0 changed, 0 deleted; 170 tests added
(1576 → 1679 → 1746); two new spec files (`new-recipient.spec.ts`, `transfer-risk.spec.ts`). Both DS re-pins moved
0 baselines on their own (Gate 101 Phase A2; Gate 103 Phase A2) [reported].

**The thing to know first.** Flow 6 adds the first user-created record that is not money (`userRecipients`) and the
app's first rule that interrupts a payment. The rule is three comparisons, **not a model** — the copy says so
(Decision 36). Its third clause, (c), compares against the user's own history, so **any send larger than RM 2,647.67
moves the threshold** (§4.2): reset the demo data before every walk.

---

## 2. What Flow 6 is — screens and the writer

### 2.1 Screens

| screen | route / state | Figma | built from |
|---|---|---|---|
| Select Transfer Type | `/transfer/new`, step `type` | `1266:14385` | `NewRecipientScreen.tsx`, `newRecipientOptions.ts` (seven identifier types; only Account Number is available) |
| Select recipient bank | step `bank` | `1266:14386` | the 37-bank list (`src/data/banks.ts`) |
| Enter recipient details | step `details` | `1266:14387` | five DS `Select`s pinned closed + two DS `Field`s (Account Number with v2.14.0's `error`) |
| Account Type / Transfer Type / Recipient Reference pickers | step `details` + `{ picker }` | undrawn | DS `OptionList` on a page (the Gate 74-B pattern, R101-8) |
| Send money with the new recipient | `/transfer/send/:recipientId` | `1266:14388` | Flow 4's `SendScreen.tsx`, unchanged except the alert hook |
| High-Risk Transfer (warning) | `{ alert: 'warning' }` | `1266:14382` | `HighRiskTransferAlert.tsx`: DS `Modal`, `Banner` (v2.14.0), `Icon xxxl` (v2.15.0), `Link m semibold` (v2.15.0) |
| Smart Fraud Protection (education) | `{ alert: 'education' }` | `1266:14383` | the same component; the shield PNG (Decision 37) |
| Proceed with high-risk transfer (confirm) | `{ alert: 'confirm' }` | `1266:14384` | the same component; `Avatar xl` placeholder (v2.15.0) |
| Review transfer, success | Flow 4's | undrawn | `ReviewTransferSheet.tsx`, `TransferDoneScreen.tsx`, unchanged |

### 2.2 Writer

**One writer: saving a recipient** (Gate 101). Next on the details step builds a `UserRecipient` from the directory's
answer (`id` `recipient-<uuid>`, the directory's `name` and `kind`, the typed `accountNo`, the chosen `bankCode`, the
`placeholder` mark, `addedAt` the local wall clock), appends it to the `userRecipients` atom and lands on the amount
screen. **The alert writes nothing** (Gate 103): it reads the draft, the directory and the ledger, and routes. The
payment itself is Flow 4's `sendMoney`, unchanged. Undrawn actions still say "Coming soon.": Scan QR, the six other
identifier types, Credit Card and Loan/Financing account types, and Interbank GIRO.

---

## 3. The write path and the alert path

### 3.1 History: every step is its own entry (R101-1)

One route, `/transfer/new`; each step is a history entry carrying `{ newRecipientStep }` (and `{ picker }` for the three
option lists), so device Back closes one step or one picker. **Next** saves, pops back to the first step's entry and
**replaces** it with the amount screen. So Back from the amount screen, and Flow 4's To field (`navigate(-1)`), land on
the recipient picker, never on a live form. A deep-linked first step puts `/transfer` under the amount screen. Every
step starts at the top (R101-10); a "Coming soon." raised on a step is dismissed when the step changes (R101-11).

### 3.2 The draft

The form lives in Flow 4's `TransferDraftProvider` (`transferDraft.tsx`), widened with a `NewRecipientDraft`
(`bankCode`, `accountNo`, `accountType`, `transferType`, `reference`, `otherDetails`; `transferDraft.tsx:43`). Defaults:
Current/Savings, DuitNow, Fund Transfer; the identifier type is Account Number, the only available one. **Account Type, Transfer Type, Recipient Reference and Other
Payment Details are validated and then discarded at save** (R101-9; register G71; §9.1). Decision 40 = B (§10): Gate 106
carries Recipient Reference and Other Payment Details onto the first send's ledger row; Account Type and Transfer Type
stay discarded.

### 3.3 The account check (`accountNumberProblem`, `src/data/derive.ts:2788`)

One function the row shows and the save refuses on, in this order: empty; not digits; outside 5–19 digits; already a
recipient (seeded or saved, same bank and number); not in the directory. The input keeps digits only as you type
(`accountNumberInput`), so "Use digits only." is reachable through the pure rule, not by typing (§4.3).

### 3.4 Schema v5 and the reader merge

`SCHEMA_VERSION = 5`; `RECORD_KEYS` gains `userRecipients` (eighth, last); `isStoredRecipient` validates it;
`MIGRATIONS[4]` adds `userRecipients: []`. **`seedFingerprint()` is unchanged, so no tester was reset**: a v4 snapshot
classifies `migrated` and is written back whole on the next commit. `RECIPIENTS` (the five seeded Bank recipients) is
read in one place, `mergeRecipients(userRecipients, RECIPIENTS)` in the provider; every reader takes the merged list,
so a saved recipient is never "unknown". `recentRecipients` counts `addedAt` as activity (R101-6).

### 3.5 The rule (Decision 35, `src/data/transferRisk.ts`)

A bank send is flagged when it is the **first payment to a recipient the user added** (in `userRecipients`, and no
ledger row carries its `recipientId`) **and** at least one of:

- **(a)** the directory's `accountAgeDays < 30` (30 itself does not fire);
- **(b)** the directory's `transactionCount < 10` (10 itself does not fire);
- **(c)** the amount is **strictly** larger than every previous outflow — `amount < 0`, no `goalId`, by MYR magnitude,
  crypto included (R101-13), from the **live** ledger.

A payee the directory does not know is judged on (c) alone (R103-2). Crypto sends never reach the rule (R100-8). The
rule is pure and reads no clock.

### 3.6 The alert's history, focus and cap

- **History** (R103-3): a flagged "Transfer money" pushes `{ alert: 'warning' }`; "How does Monarch detect this?" pushes
  `{ alert: 'education' }`; Got it goes back; Proceed Anyway **replaces** the warning with `{ alert: 'confirm' }`, and
  Proceed Anyway there **replaces** it with Flow 4's `{ review: true }`; Cancel Transfer / ✕ / Escape / the scrim /
  device Back go **back**, draft kept. An unflagged send is unchanged.
- **Derived every render** (R103-14): a restored alert entry with no draft, or one the rule no longer flags, shows
  nothing.
- **One dialog at a time** (R103-4): each view is its own `Modal`, keyed by view. Focus opens on each view's ✕ and
  returns to "Transfer money" on close, held over a 400 ms window in the spec. **"Back" and "replace with the previous
  entry" render identically, so the spec reads `history.state.idx`** (R103-17).
- **The cap** (R103-19): all three views cap to the `Modal`'s padded box (`.mvp-risk-modal .mn-modal__card
  { max-height: 100% }`, `.mn-modal__content { min-height: 0; overflow-y: auto }`). When the card is taller than the
  box the content scrolls and the ✕ and the buttons stay. Measured [reported, Gate 103 Phase B]: at 375 × 812 the
  education card is capped at 780 and scrolls 10 px; at 375 × 667 the warning and the education scroll with the
  buttons in place. `min-height: 0` is redundant there (M45b, the accepted equivalent mutant).

### 3.7 The copy (Decision 36, `src/flows/transfer/riskCopy.ts`)

The headline names only what fired, and an account headline wins over (c):

| fired | headline |
|---|---|
| (a) and (b) | "New Account with low activity. Possible Scam." (drawn) |
| (a) | "Newly opened account. Possible Scam." |
| (b) | "Account with low activity. Possible Scam." |
| (c) only | "Unusually large first payment. Possible Scam." |

The Details box lists one line per fired reason, in the order (a) (b) (c), then "Flagged by Monarch's transfer checks";
0 days reads "Account opened today", 0 transactions "No transactions recorded" (R103-10).

---

## 4. The data, and the test accounts

### 4.1 The directory (`src/data/bankDirectory.ts`) and the bank list (`src/data/banks.ts`)

The directory is a mock name enquiry (R100-1): five fictional accounts with an age and a transaction count. The bank
list is 37 banks from UOB Malaysia's participating-bank table (read 9 Nov 2026, undated); Bangkok Bank is kept as drawn
although the table gives it no DuitNow code, and Bank Muamalat is inserted alphabetically (§8).

### 4.2 The test accounts (Teku asked for this table)

Add each one from the Bank tab's "+ New recipient" → Account Number → its bank → its number → Next. **Reset the demo
data first** (Home → avatar → Settings → Reset data): (c) compares against the live ledger.

| payee | bank | account number | `accountAgeDays` | `transactionCount` | kind | first payment, at any amount | first payment, only above (c) |
|---|---|---|---|---|---|---|---|
| **Gunther Cenperk** (Figma's own) | Affin Bank (`AFFIN`) | `6451352078` | 10 | 2 | person | **alerts: (a) + (b)**, "New Account with low activity. Possible Scam." | adds the (c) Details line |
| **Wren Halloway** | RHB Bank (`RHB`) | `21430005678124` | 12 | 38 | person | **alerts: (a)**, "Newly opened account. Possible Scam." | adds the (c) line |
| **Orrin Teale** | Public Bank (`PBB`) | `3109876543` | 1,460 | 4 | person | **alerts: (b)**, "Account with low activity. Possible Scam." | adds the (c) line |
| **Delphine Marrow** | Maybank (`MBB`) | `512345678901` | 2,190 | 846 | person | **no alert** | **alerts: (c)**, "Unusually large first payment. Possible Scam." |
| **Lumen & Larch Florist** | CIMB Bank (`CIMB`) | `8001234567` | 3,285 | 5,120 | business | **no alert** | **alerts: (c)**, the same (c) headline; the send is a purchase (Decision 22A) |

**Today's (c) figure is RM 2,647.67** (`txn-ikea-0815`, IKEA, 15 Aug 2025), re-derived at Gate 105 over the 254-row
seed; the next largest outflows are RM 1,249.30, 830.83 and 501.35. "Above (c)" means **strictly more than RM
2,647.67**: RM 2,647.67 itself does not fire. **It rises after any larger send — Flow 4's, Flow 5's crypto sends (a
drawn RM 5,800 ETH send counts) and a Flow 6 send included.** After the drawn RM 10,000 to Gunther, (c) is RM 10,000
until a reset, so walks reset first.

### 4.3 What never alerts, and the refusals

- **The five seeded Bank-tab recipients never alert** (Aeon Big, Caring Pharmacy, Rachum Greene, Perry Matthew, Fiona
  Hammock): they are not in `userRecipients`.
- **A second payment to anyone never alerts**: once a ledger row carries the recipient's id, the rule returns early.
- **Crypto sends never alert** (R100-8).
- **The refusals on the Account Number row**, in the order the rule checks:

| typed | message |
|---|---|
| nothing | "Enter the account number." |
| letters or spaces | **stripped as you type** (`accountNumberInput`): "12AB" leaves "12" and shows the length message. "Use digits only." is reachable only through the pure rule (`new-recipient.spec.ts` N2) |
| fewer than 5 or more than 19 digits (19 is also the field's `maxLength`) | "Account numbers are 5 to 19 digits." |
| a number already saved at the same bank — any of the five above once added, or a seeded recipient's number at its bank | "This account is already in your recipients." |
| any other number, or one of the five above at a different bank | "We couldn't find this account." |

### 4.4 The data model

`UserRecipient` extends `Recipient` with `addedAt`; the stored record is `id, name, kind, accountNo, bankCode, mark,
addedAt`. A new `TransactionLogo` member, `{ kind: 'placeholder' }`, draws the DS `Avatar`'s `person` glyph (Figma's
grey silhouette) and is copied onto a stored row on send. `RECIPIENTS`, `BANK_DIRECTORY` and `BANKS` are constants
outside the seed fingerprint.

---

## 5. The decisions and rulings

### 5.1 Teku's decisions, as worded on disk

| # | decision | source |
|---|---|---|
| **35** | The high-risk rule: first payment to a user-added payee AND an account under 30 days OR under 10 transactions OR an amount above any previous payment to another party; the reasons listed are only those that fired. **Teku delegated it to the review thread after research, 7 Nov 2026** | register §2av, `CLAUDE.md` Gate 101 |
| **36** | Honest copy, no "AI" claim for a rule (FTC guidance on AI claims). Delegated, 7 Nov 2026 | §2av |
| **37** | The shield image ships as drawn. Delegated, 7 Nov 2026 | §2av |
| **38 = A** | The field-error line is DS-first (shipped in v2.14.0). Delegated, 7 Nov 2026. Basis: Material's text-field anatomy; WCAG 3.3.1 / ARIA21 | §2av; DS `CLAUDE.md` Gate 102 DS §0 |
| **39 = D** | The sizes the high-risk alert draws are added in the DS first, so its baselines are minted once (R96-6; the Gate 101 → DS Gate 102 precedent). **Delegated by Teku, 11 Nov 2026** | §2aw; DS `CLAUDE.md` Gate 104 DS §0 |
| **40 = B** | G71: the Recipient Reference and Other Payment Details typed on the new-recipient form are carried onto that first send's ledger row. **Delegated** (Teku's standing Flow 6 delegation of 7 Nov 2026, applied by the review thread 15 Nov 2026); built at Gate 106. Full text in §10 | §2ax; §10 |

The Gate 100 investigation proposed these as Decisions 35–45 (forks F1–F14, `gate100-phaseA\REPORT.md` §6); the ones
that reached Teku were renumbered 35–39 as above, and G71's became 40. **The next free Teku decision is 41.**

### 5.2 DS rulings behind the flow

**DS Gate 102, v2.14.0** (DS `CLAUDE.md` "Gate 102 DS" §0; R102-1 to R102-7 were the brief's, R102-8 to R102-12 the
review thread's, 7 Nov 2026, overturnable):

| | ruling |
|---|---|
| R102-1 | `Field` gains `error`, `helper` (a line below the box; `error` sets `aria-invalid` and replaces `helper`), a merged caller `aria-describedby`, and pass-through `inputMode`, `maxLength`, `autoComplete` |
| R102-2 | Inside a `FormField` the wrapper owns the messages; a Field's own `error`/`helper` are ignored there, with no double wiring |
| R102-3 | The line is the existing `FieldMessage`, unchanged. Its `id` pass-through already allowed it |
| R102-4 | No default render changes. The guard compares against the v2.13.0 hashes, never undefined-vs-omitted in the new build |
| R102-5 | `InlineMessage tone="error"` if its anatomy fits the drawn block; otherwise propose, recommend, prototype. It does not fit: see R102-8 |
| R102-6 | Token values untouched. Figma resolves `surface/error/default` to `#eb4f52`; the DS maps it to `#bc3f42`. A DS-round note |
| R102-7 | v2.14.0, minor, hash-pinned on the Gate 97 model; one subject |
| R102-8 | The banner is a new component, `Banner` (`tone: 'error'`, `title`, `description`), not an `InlineMessage` tone |
| R102-9 | The undrawn bare-Field line copies the DS `Input`'s presentation: `FieldMessage`, `Scale/100` below the box. `error` does not repaint the box; the consumer passes `isInvalid` |
| R102-10 | The prop is `ariaDescribedBy`. Caller ids first, then the Field's line, or the FormField's ids inside one |
| R102-11 | A compact Field ignores the message props |
| R102-12 | Banner pads 16px on all sides; Figma draws 16 vertical and none horizontal, because its text never wraps |

**DS Gate 104, v2.15.0** (DS `CLAUDE.md` "Gate 104 DS" §0):

| | ruling |
|---|---|
| R104-1 | `IconSize` gains `'xxxl'` → `ElementWrapper` `xxxl` (56px, `--brand-scale-1200`). Drawn: `<element>` `Size=XXXL 56`, `178:6041`. `xxl` (40) is not exposed |
| R104-2 | `AvatarSize` gains `'xl'` (56px). Undrawn as an Avatar variant: the alert scales `Size=L 40` (`102:3010`) into the `<element>` 56 slot (`801:4611`) |
| R104-3 | Placeholder glyph at `xl` = `Icon` `xl` (32px) |
| R104-4 | Initials at `xl` = `type-body-lg-semibold` (20px / 600) |
| R104-5 = **L1** | Ruled by the review thread, 11 Nov 2026: `Link` `m` + `semibold` → `type-body-caption-semibold`. An explicit exception to R91D-8 / R93D-10, for the 16 `m` + `semibold` render paths only; the path was a documented no-op no component passed; the two existing `Link` test edits accepted (the R101-12 precedent) |

**The DS releases.** v2.14.0: tests 1,048 / 77 → **1,163 / 79**; 0 existing render paths moved. v2.15.0: tests 1,163 /
79 → **1,213 / 82** (DS `CLAUDE.md` lines 3172, 3261) [reported].

### 5.3 Thread rulings, by gate (each overturnable)

**Gate 100, R100-1 to R100-10.** The investigation's forks were ruled in the thread; **before Gate 105 no file carried
the R100 list in full** — R100-5 and R100-10 had no wording on disk. Eight are cited from disk below; the two missing
ones are carried from the review thread and labelled so:

- **R100-1** the mock name enquiry: the payee bank's record or none, and the Account Number row's "We couldn't find
  this account." (`bankDirectory.ts:5`, `derive.ts:2769`; Gate 101 Phase A §0).
- **R100-2** keep Figma's drawn 10-digit Affin number; the length range is loose because the lookup is the real check
  (`derive.ts:2751`).
- **R100-3** the five seeded `RECIPIENTS` stay constants and the user's own come first through one merge; the seed
  fingerprint does not hash recipients (`derive.ts:2739`, `types.ts:1276`, `schema.ts:64`, `seed.ts:60`).
- **R100-4** an unavailable identifier type or option raises "Coming soon."; only Account Number has a drawn path
  (`newRecipientOptions.ts:5`, `:18`).
- **R100-6 to R100-9** "as ruled 11 Nov" (Gate 103 Phase A2 §5.5); of these, **R100-7** the alert opens on "Transfer
  money", before Flow 4's review sheet (fork F10 A; `SendScreen.tsx:105`), **R100-8** crypto sends are not checked
  (`transferRisk.ts:18`), **R100-9** the red block is the DS `Banner` (`HighRiskTransferAlert.tsx:97`). R100-6 is cited
  only as part of the range (`HighRiskTransferAlert.tsx:42`).
- **R100-5** [carried: review thread, wording as held 14 Nov; date not recorded]: Crypto "+ New recipient" and Scan QR
  stay "Coming soon." (undrawn; scope rule).
- **R100-10** [carried: review thread, wording as held 14 Nov; date not recorded]: the sequence, amended after Gate 101's
  first Phase A stopped: 101 → 102 DS → 101 restart → 103 → 104. **Superseded:** DS Gate 104 took the number 104, and
  the record became Gate 105.
- Disk had no wording for R100-5 or R100-10 before Gate 105 (§11, §14).

**Gate 101, R101-1 to R101-13** (review thread, 9 Nov 2026; register §2av, `CLAUDE.md` Gate 101):

- **R101-1** one route `/transfer/new`, each step its own history entry; Next saves, pops to the first step and replaces
  it with the amount screen.
- **R101-2** a field whose value came from an earlier step returns to that step.
- **R101-3** account number: digits only (input sanitised), 5 to 19 digits (UOB and BNP tables).
- **R101-4** duplicate wording "This account is already in your recipients.", checked before the lookup against seeded
  and stored recipients at the same bank and number (Monzo's payee rework shows an error on a duplicate account).
- **R101-5** option lists: Account Type (Current/Savings, Credit Card, Loan/Financing), Transfer Type (DuitNow,
  Interbank GIRO), Recipient Reference (Fund Transfer, Family Support, Rent, Bill Payment, Loan Repayment, Gift; no free
  text). The unavailable options (Credit Card, Loan/Financing, IBG) raise "Coming soon."; every Recipient Reference
  preset is selectable.
- **R101-6** a never-paid saved recipient ranks by its `addedAt`.
- **R101-7** Other Payment Details capped at 40 characters (Standard Chartered Malaysia for DuitNow). *(See §11: HSBC
  documents 140.)*
- **R101-8** the three pickers are the Gate 74-B pattern on a page: the header keeps "New Transfer" with a subtitle
  naming the task, flat full-bleed `OptionList` rows, no close control, no height holding.
- **R101-9** Account Type, Transfer Type, Recipient Reference and Other Payment Details are collected and validated but
  not carried onto the transaction — accepted for the gate, filed as **G71** (OPEN, paused). Decision 40 = B (§10) carries
  the two text fields onto the first send at Gate 106.
- **R101-10** every step starts at the top.
- **R101-11** a "Coming soon." raised on a step is dismissed when the step changes.
- **R101-12** six existing-test edits accepted: four `SCHEMA_VERSION` 4 → 5 assertions (`crypto-send`,
  `merchant-rules`, `persistence-writers`, `send`), and `transfer.spec.ts` B10 and B11. The original stop clause was
  the review thread's error: unsatisfiable given what the prompt required.
- **R101-13** Decision 35 (c) derivation: count every outflow (`amount < 0`) except rows with a `goalId`, by MYR
  magnitude, crypto included; credits never count. RM 2,647.67 today.

**Gate 103, R103-1 to R103-19** (R103-1 to R103-11 ruled 11 Nov 2026; R103-12 to R103-17 proposed by Phase A2 and taken
at the build; R103-18 withdrawn and replaced by R103-19, 13 Nov 2026). Wording from `gate103-phaseA\REPORT.md` §2–§4,
`gate103-phaseA2\REPORT.md` §5.5 and `CLAUDE.md` Gate 103:

- **R103-1** `new-recipient.spec.ts` B1 is edited: two clicks between "Transfer money" and "Transfer now", because
  Gunther's drawn send is exactly Decision 35's case and no implementation can leave B1 unedited.
- **R103-2** a user-added recipient the directory no longer knows is judged on (c) alone; the copy never prints an age
  or a count it does not have.
- **R103-3** the history shape (§3.6).
- **R103-4** one dialog at a time, by key; focus on each view's ✕; closing returns focus to "Transfer money".
- **R103-5** the three modals are title-less, named by `ariaLabel`: "High-Risk Transfer", "Smart Fraud Protection",
  "Proceed with high-risk transfer".
- **R103-6** the Banner gets no `role="alert"`: the dialog's opening announces it.
- **R103-7** the National Scam Response Centre line in `type-body-sm`, default colour, centred, after the caption.
- **R103-8** the explainer link is `Link size="m"` with `iconBefore={null}`, `iconAfter={null}`, `target="_self"` and
  `preventDefault` (the omitted-prop trap, twice).
- **R103-9** the Details box has no fill: Figma's `default-subtle` is white and would not flip in dark.
- **R103-10** "Account opened today" for 0 days (and "No transactions recorded" for 0).
- **R103-11** [carried: review thread, wording as held 14 Nov; ruled 11 Nov]: headlines by what fired, an account
  headline winning over (c): (a) + (b) "New Account with low activity. Possible Scam." (drawn); (a) only "Newly opened
  account. Possible Scam."; (b) only "Account with low activity. Possible Scam."; (c) only "Unusually large first
  payment. Possible Scam.". It matches the shipped copy (§3.7, `riskCopy.ts`). Disk had no wording for R103-11 by
  number before Gate 105.
- **R103-12** the shield at `public/media/illustrations/shield.png`, via `illustrationUrl()`, with a README.
- **R103-13** an 82 × 82 square, `aspect-ratio: 1`, `token-exempt` (the fifth); refined by R103-19's condition (1) to a
  clipped 82 × 80 slot.
- **R103-14** the alert is derived each render from the live draft and the live rule.
- **R103-15** the walk reaches Wren, Orrin and Delphine through a harness store preset `risk-payees` built from
  `BANK_DIRECTORY` (no directory, seed or schema change).
- **R103-16** six walk states: three of Gunther's (warning, education, confirm) and one warning for each other headline.
- **R103-17** B3 and B5 assert React Router's own history index after every close (`history.state.idx`).
- **R103-18** *withdrawn*: "the education modal keeps the `Modal`'s own height; the 10 px overflow at 375 × 812 is
  Teku's call".
- **R103-19** cap all three views to the `Modal`'s box, content scrolls, ✕ and buttons stay (Material pins title and
  buttons when dialog content scrolls); condition (1): nothing in the education content may extend past the content
  box, the visible art within 0.5 px of Figma's framing, the PNG untouched. Measured: within 0.03 px.

---

## 6. Standards established

1. **A user-created non-money record** (Gate 101): a new atom stored whole, outside the seed fingerprint, with a
   `MIGRATIONS` step that adds it empty — so the bump resets no tester — and **one merge** that every reader goes
   through. The provider must report the atom to `usePersistence`, or all persistence stops (the Gate 94 lesson).
2. **A multi-step form on one route, each step a history entry** (R101-1): device Back closes a step; the save
   **replaces** the first step's entry, so nothing lands back on a live form.
3. **A rule that interrupts a payment is pure, derived each render, and written in honest copy** (Decisions 35, 36;
   R103-14). It reads the live ledger, the directory and the draft; it is never stored; the copy names what fired.
4. **An interruption is a history entry too** (R103-3): explainers push, "proceed" replaces, every dismissal goes back.
   The spec reads `history.state.idx`, because back and replace render identically (R103-17).
5. **DS-first for drawn capabilities, twice in one flow** (Decisions 38 and 39; R96-6): DS Gate 102 then MVP Gate 101's
   restart; DS Gate 104 then MVP Gate 103's restart. Each MVP gate stopped once rather than override DS geometry.
6. **Cap a tall `Modal` to its own box, scoped** (R103-19): the receipt viewer's G33 pair, under the consumer's class,
   deleted when the DS closes G33.
7. **A scroll container re-rasters antialiased edges even when nothing scrolls** (Gate 103): predict baselines with that
   in mind (20 of 24 moved at the A3 delta).
8. **A close-check must not go silent for long** (Gate 105, §11): one process for a digest, a progress line before slow
   steps, and an `EXIT` trap that names where it stopped.

---

## 7. Figma-to-code lineage

| frame | what it is | route / state | component files | walk states |
|---|---|---|---|---|
| `1266:14385` | Select Transfer Type | `/transfer/new` `type` | `NewRecipientScreen.tsx`, `newRecipientOptions.ts` | `transfer-new` |
| `1266:14386` | Select recipient bank | `bank` | `NewRecipientScreen.tsx`, `banks.ts` | `transfer-new-bank` |
| `1266:14387` | Enter recipient details | `details` | `NewRecipientScreen.tsx`, `transferDraft.tsx`, `derive.ts` (`accountNumberProblem`) | `transfer-new-details`, `-filled`, `-invalid`, `-not-found`, and the undrawn pickers `-account-type`, `-transfer-type`, `-reference` |
| `1266:14388` | Send money with Gunther | `/transfer/send/:recipientId` | `SendScreen.tsx` | `transfer-send-recipient-stored-gunther-new-recipient` (`/transfer/send/recipient-stored-gunther [store:new-recipient]`); the picker with Gunther saved is `transfer-new-recipient` (`/transfer [store:new-recipient]`) |
| `1266:14382` | the warning | `{ alert: 'warning' }` | `HighRiskTransferAlert.tsx`, `riskCopy.ts`, `transferRisk.ts`, `transfer.css` | Gunther `[overlay:risk-warning]`; Wren, Orrin, Delphine `[store:risk-payees] [overlay:risk-warning]` |
| `1266:14383` | the education overlay | `{ alert: 'education' }` | the same, `shield.png` | Gunther `[overlay:risk-education]` |
| `1266:14384` | the second confirm | `{ alert: 'confirm' }` | the same | Gunther `[overlay:risk-confirm]` |

**Flow 6 baselines.** Gate 101 added 44 and changed 0; Gate 103 added 24 and changed 0; both re-pins moved 0. Total:
**68 added, 0 changed, 0 deleted** (register §2av, §2aw).

---

## 8. Deviations from Figma

| Figma | shipped | who |
|---|---|---|
| the alert drawn over an **older** amount screen (`801:4274`: "Transfer money to", RM 2,550, "AFFIN 003") | the alert over the live amount screen (`1266:14388`: "Send money", RM 10,000, "6451352078 • AFFIN") | Gate 100 §3.2; R100-7 |
| the confirm's account line "6451352078 • AFFIN 003" | "6451352078 • AFFIN" (`recipientAccountLine`, the same line as everywhere else) | Gate 100 §3.2 |
| the warning card 664 tall, three Details lines | **710** at 375: four lines (the decided copy adds "Flagged by Monarch's transfer checks" as its own line), two wrap | Decision 36; §2aw |
| every alert footer 152 | **140**: the DS hugs where Figma fixes | G28 (unchanged) |
| the education card fits the frame | capped to the `Modal`'s box; its content scrolls 10 px at 375 × 812 and more at 375 × 667 | R103-19 |
| "How does Monarch detect this ?", "Make decision without your approval", "Why You're seeing this alert" (inventory Flow 6 A4–A6) | "How does Monarch detect this?", "Make decisions without your approval", "Why you're seeing this alert" | Gate 100 F2 A; Decision 36 |
| "Flagged as unusual by AI risk engine" | "Flagged by Monarch's transfer checks"; three headlines Figma does not draw for the single-reason cases | Decision 36 |
| six identifier types besides Account Number (Mobile Number, IC Number, Army ID, Police ID, Passport Number, Business registration Number) | drawn, and each raises "Coming soon." | R100-4; R101-5 |
| no Bank Muamalat; Bangkok Bank listed | Bank Muamalat added; Bangkok Bank kept although it has no DuitNow code | Gate 101 |
| the two `Field`s 343 × 58 | 60: a labelled DS `Field` | G70 |
| the five `Select`s in the Selected state | the Filled state: `isSelected` is focus, not "has a value" | Gate 101 Phase A2 |
| the education title "Smart Fraud Protection" in a header | title-less modals named by `ariaLabel` | R103-5 |

---

## 9. Deferred and open items

### 9.1 Gaps (register §2av–§2ax)

| gap | what | state |
|---|---|---|
| **G68** | no DS component painted the red warning block | **closed** by v2.14.0 `Banner` |
| **G69** | a bare `Field` could not carry an accessible message | **closed** by v2.14.0 `Field.error` |
| **G70** | a labelled `Field` is 60 against Figma's 58 | open, DS round, pre-existing |
| **G71** | the form's four transfer details are validated and discarded | **open; investigated at Gate 105** (§2ax); **Decision 40 = B** recorded (§10); stays open until Gate 106 closes |
| **G72–G74** | `Avatar` placeholder silhouette, initials border, initials surface | open, DS round |
| **G75** | the "Demo data restored." notice stays over "+ New recipient" after leaving Settings | **opened at Gate 105**, UI integration round |

Still open from earlier flows and reached here: G28 (footers), G33 (the workaround class now has two consumers), G58,
G60, G62, G63, G67.

### 9.2 Deferred — MVP side

- **The receipt viewer's G33 comment** (`finance.css`) calls `min-height: 0` load-bearing; M45b shows it is not.
  Hygiene round.
- **The 160 px shell bottom reserve**, the **thousands separator** in the amount field, and **Flow 4's flag** still at
  `Logo xs`: UI integration round.
- **A mobile-number (DuitNow proxy) lookup** was offered and is not scheduled (§12).
- **`npm audit`**: the hygiene round.

---

## 10. Open decisions — Teku's

1. **G71 — Decision 40 = B, delegated** (Teku's standing Flow 6 delegation of 7 Nov 2026, applied by the review thread
   15 Nov 2026). **No longer open as a decision; recorded here.** Options and costs are in the Gate 105 report
   (`D:\Claude\_handoffs\gate105\REPORT.md` §4.4).
   - **What:** the Recipient Reference and Other Payment Details typed on the new-recipient form are carried onto that
     first send's ledger row, and shown on the review sheet and the detail sheet only when present.
   - **Labels:** the rows read "Recipient Reference" and "Other Payment Details", kept distinct from the detail sheet's
     existing "Reference" row (Monarch's `MNRC…` bank reference, Gate 81).
   - **Account Type and Transfer Type stay discarded** (one working option each).
   - **Basis:** the Gate 105 report §4.3 — CIMB, BNP Paribas Malaysia and HSBC Malaysia document a per-transfer
     reference shown to the payee; it uses only drawn inputs; 0 existing baselines move; no tester reset.
   - **Rejected:** A (the form keeps asking for something it discards), C (needs an undrawn field on a drawn screen,
     which is Teku's call), D (overrides the drawing).
   - **Recorded divergence:** a second payment has no reference entry, because Figma draws none; a drawn field would be
     Teku's call.
   - **Implementation:** Gate 106 (schema v6, `MIGRATIONS[5]`). **G71 stays OPEN until Gate 106 closes.** The next free
     Teku decision is 41.
2. **The zero-amount predicate** (`transactionDisposition`, Gate 83) is still open and unowned; Flow 6 writes no row.
3. **A real-phone walk of the alert is unconfirmed.** Gate 103 Phase B's live check ran in headless Chromium at DPR 2
   (152 checks, 152 PASS) [reported]. iOS focus (G58) can only be seen on a device.

---

## 11. Corrections to the record

All insert-only; the earlier text is left as written.

- **Gate 100 is named nowhere in `CLAUDE.md`'s Gate 101 section.** It was the Flow 6 investigation (7 Nov 2026, no
  commit); its forks F1–F14 became Decisions 35–39 and the R100 rulings.
- **R100-5 and R100-10 had no wording on disk, and R103-11 none by number, before Gate 105.** Their wording is now
  carried from the review thread and labelled as such (§5.3); R100-10 is superseded.
- **`mvp-gate103`'s tag message carries only its first line** — Sourcetree's tag box dropped the pasted second line,
  so the Gate 103 `close-check.sh tag` printed FAIL on the message [verified 14 Nov]. The tag stays as published.
- **The close-check scripts did not die; they went silent.** Teku's MinTTY runs at Gate 101 (`commit`) and Gate 103
  (`staged`, `commit`) ended after the last check before the baseline digest with no final line. At Gate 105 the same
  Gate 103 script, run in Git for Windows' own MinTTY, with `--login`, `LC_ALL=C` and an ISO-8859-1 locale, **reached
  its final line every time, after 74–96 s** — of which the digest step alone is 51–80 s of no output, 1,680 child
  processes (one `git`, one `sha256sum`, one `cut` per PNG). Stopping it from outside (SIGINT, SIGHUP) in that window
  reproduces the reported output exactly. What stopped Teku's runs is not established. Register §2ax.
- **R101-7's 40-character limit for Other Payment Details** cites Standard Chartered; HSBC Malaysia documents 140
  characters for the DuitNow recipient reference since 21 March 2021, and a bank DuitNow format lists Other Payment
  Details at 140 (Gate 105 report §4). A finding, not a fix.
- **Gate 103 Phase B's walk text corrections** (§8 of that report): "Total Balance" does not exist anywhere in `src/` or
  `e2e/` (Home shows "Hi, Margaret" and the Main card); the "Demo data restored." toast must be dismissed before
  tapping "+ New recipient" (G75); from the amount screen after Cancel Transfer the next payee is reached by tapping the
  **To** field; step 15's reset starts by going back to Home, because the picker has no Settings avatar.
- **The detail sheet's "Reference" row is Monarch's own `MNRC…` bank reference** (Gate 81), not the form's "Recipient
  Reference". The two share a word; G71's options must not merge them.
- **Register §2av is dated 2026-11-09; the `mvp-gate101` commit is dated 2026-11-11.** The build ran on the 9th, Phase B
  on the 10th–11th, and Teku committed on the 11th.
- **The anchored `OVERLAY_STATES` grep has under-counted since Gate 98** (spread arrays); use the sweep's counts.

---

## 12. What Flow 6 hands on

- **The offered option, not scheduled:** "build mobile number" — a DuitNow proxy lookup (Mobile Number) against the mock
  directory, one undrawn screen. Only if Teku says so.
- **Scan QR** still says "Coming soon." on both tabs.
- **G71 → Gate 106** (Decision 40 = B): the reference and payment details travel with the first send — Flow 4's review
  sheet, the ledger row and the detail sheet, under their own labels — and that is a schema bump (v6, `MIGRATIONS[5]`).
- **Persistence:** `userRecipients` is stored; any change to who is in `RECIPIENTS` stays outside the fingerprint.
- **Every walk resets first** (§4.2).

---

## 13. The gate list

In opening order. Numbers follow when a gate **opened**, not when it closed: Gate 101 opened before DS Gate 102 and
closed after it; Gate 103 opened before DS Gate 104 and closed after it.

| gate | repo | what | commit / tag | date | tests / baselines at close |
|---|---|---|---|---|---|
| **100** | MVP | Flow 6 investigation, Phase A; forks F1–F14; **no commit** | — | 2026-11-07 | — |
| 101 (first Phase A) | MVP | stopped: a bare floating-label `Field` could not carry its error line (a DS gap) | — | 2026-11-07 | — |
| **102 DS** | DS | `Field` message line, `Banner` | `v2.14.0` `723b02f117249a983bdf0795a6f5ecf4d4fb9061` (tag object `970afab37be2fa22945bf31e8f2a881742c8bf18`) | 2026-11-09 | 1,163 / 79 (DS) |
| **101** (restart, Phase A2, build, Phase B, close) | MVP | add a new bank recipient; schema v5; re-pin v2.14.0 | `mvp-gate101` `d9f46128d3ee6d359d81b42e23a521827b9f8abe` (tag object `3ce8a0240f98ec45d06036b20fdbaea12b88d1ac`) | 2026-11-11 [register 2026-11-09] | 1679 in 51 / 536 |
| 103 (first Phase A) | MVP | stopped: B1 needed an edit, the DS lacked the drawn sizes, the shield was not yet supplied | — | 2026-11-11 | — |
| **104 DS** | DS | `Icon xxxl`, `Avatar xl`, `Link m semibold` | `v2.15.0` `ecefba210dbec3aee6ad7db36500f68133819c46` (tag object `3c2dc5a4cf821bc2fb7ba057007d5ee62bcb28c5`) | 2026-11-12 | 1,213 / 82 (DS) |
| **103** (restart, Phase A2, A3 delta, build, Phase B, close) | MVP | the high-risk alert; re-pin v2.15.0 | `mvp-gate103` `b21c9837d79782bccf88a2b0713220cb46996698` (tag object `168fda528f4562eb12fea83530e82d1a40cb2b01`) | 2026-11-14 | 1746 in 52 / 560 |
| 105 | MVP | this record (documents only) | `mvp-gate105` (Teku tags) | 2026-11-15 | 1746 in 52 / 560 |

The last gate before Flow 6 is `mvp-gate99` (`bb7c5d9add60ada5cde350088e01ae94e34e7302`, the Flow 5 record, tag object
`b5584a04057e42c729a0495d6f450bf2f846fe34`). Test counts at 101 and 103 are each gate's own Phase B `--list` [reported];
the 103 figure was re-derived at Gate 105.

---

## 14. Premises of the Gate 105 brief that disk contradicted

1. **"R100-1–10".** Only R100-1, -2, -3, -4, -6, -7, -8 and -9 are cited anywhere on disk (source comments and reports);
   R100-5 and R100-10 had no wording on any file (§5.3; now carried from the review thread).
2. **"R103-1–17 and R103-19".** All exist by number except that **R103-11's wording was on no file** (now carried, §5.3);
   R103-1 to R103-10 are worded in the Gate 103 first Phase A report as proposals, then ruled 11 Nov.
3. **"Both ended right after the last PASS before the baseline PNG count and digest check".** At Gate 103 the last line
   before the digest in `staged` mode is the `tags` check; in `commit` mode it is `HEAD:package.json pin`. Either way the
   output stops where the digest begins (§11).
4. **"Root cause: §5" (a silent exit).** No silent exit was reproduced; the script finished in every condition tried. The
   reproduced cause of the symptom is a long silent step plus an outside stop (§11).
5. **No premise in §0 disagreed.** `HEAD` = `origin/main` = `mvp-gate103^{}` = `b21c9837…`, 95 tags, clean tree; DS
   `v2.15.0^{}` = `ecefba21…`, 37 tags, clean; 1746 tests in 52 files; 560 baselines at the quoted digest;
   `SCHEMA_VERSION = 5`; pin `#v2.15.0`; register last section `2aw`, next free G75 and Decision 40.
