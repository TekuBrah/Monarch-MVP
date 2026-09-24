# Flow 9 — completion record

**Flow 9 is receipts: capture a receipt, read it, link it to a transaction, and correct it.**
It was built across twenty-two tagged gates, from `mvp-gate48` to `mvp-gate64`. The last build gate
is `mvp-gate64` at `5a89774763e057208f522f411c413bb33c2809d3`. This file records where the flow
stands at that commit. Gate 65 (this document) changed no code.

Every figure below was re-derived from the repository and the corpus harness at Gate 65. Where a
figure came from the review thread and could not be derived from disk, the text says so. §9 lists
every premise of the Gate 65 brief that disk contradicted.

The per-gate detail lives in `CLAUDE.md`, one section per gate. This file is the summary to read
first. `CLAUDE.md` holds the evidence behind each claim.

**Rule for this file:** it holds no text from any receipt photograph. That means no merchant
names, no amounts, no dates and no receipt lines, and that covers the seeded receipts too. The
OCR accuracy figures are aggregates only.

---

## Contents

1. [State at a glance](#1-state-at-a-glance)
2. [What Flow 9 is — the user-visible surfaces](#2-what-flow-9-is--the-user-visible-surfaces)
3. [The architecture, with the reason attached](#3-the-architecture-with-the-reason-attached)
4. [What it measurably does and does not do](#4-what-it-measurably-does-and-does-not-do)
5. [Diagnostics — `?diag=1`](#5-diagnostics--diag1)
6. [Personal-data discipline](#6-personal-data-discipline)
7. [Deferred and closed items](#7-deferred-and-closed-items)
8. [The gate list](#8-the-gate-list)
9. [Premises of the Gate 65 brief that disk contradicted](#9-premises-of-the-gate-65-brief-that-disk-contradicted)

---

## 1. State at a glance

| | at Flow 9 start (`mvp-gate46`, before Gate 48) | at `mvp-gate64` |
|---|---|---|
| tests | 218 | **523**, in 22 spec files |
| visual baselines | 104 | **172** |
| walk states (\|WALK\|) | 26 | **43** — 14 routes + 7 non-default tabs + 22 overlay states |
| DS pin | v2.2.0 | **v2.4.1** (`820736e8a869`) |
| persistence | none | **none** (no receipt data survives a reload) |

**⚠ THE WEAKEST NUMBER, STATED FIRST: on unseen receipts photographed with a phone camera, the
app reads 11 of 39 printed line items (28%) and lands the total on 1 of 5 receipts.** Those are
the blind-camera figures in §4. Every other capability in this file sits on top of that ceiling.

---

## 2. What Flow 9 is — the user-visible surfaces

Enumerated from `src/flows/finance/` and `src/flows/finance/components/`.

| surface | where | what it does |
|---|---|---|
| **Receipts tab** | `ReceiptsTab.tsx`, on `/finance` | Shows the receipt library as cards, grouped by month. It has a search box and two decorative chips. The **sort control** switches between *Date added* (the default) and *Receipt date*. Under *Receipt date*, receipts whose date was never read go in one trailing "No receipt date" group. |
| **Receipt card** | `components/ReceiptCard.tsx` | One receipt per card: thumbnail, display name, date and total. A linked card also shows a "Linked" pill and the transaction's row. An unreadable capture shows a one-line caption instead. The card is a button that opens the viewer. |
| **"Add new receipt" (bulk add)** | `components/AddReceiptsModal.tsx` | One screen-level button that opens a `Modal` with three phases. Empty: *Photo Gallery* and *Camera*. Populated: a grid of staged thumbnails, each with a remove button, plus Save. Saving: a loader while each file is read **one at a time**. Save is absent when nothing is staged. |
| **Capture paths** | `components/ReceiptFileInput.tsx` | *Camera* is a file input with `capture="environment"` and takes one file. *Gallery* takes several files and adds `multiple`. Both accept `image/*,application/pdf`. |
| **Source picker** | `components/ReceiptSourcePicker.tsx`, from the transaction detail sheet | An action sheet with three sources — Photo Gallery, Camera, Receipt library — and Cancel set apart below them. *Receipt library* swaps in place to a list of unlinked receipts, newest-added first. Choosing one links it to the transaction, with no confirmation. |
| **Transaction detail sheet — receipt block** | `components/TransactionDetailSheet.tsx`, from any ledger row | **Linked:** thumbnail, line items, a derived subtotal, tax and total, plus *View* and *Unlink receipt*. **Unlinked:** a prompt to add a receipt, which opens the source picker. An unreadable capture shows the advisory here, unframed. |
| **Receipt viewer** | `components/ReceiptViewer.tsx` | A `Modal`. It shows the image, the "Linked" pill and transaction row when linked, a "Receipt details" block (merchant, date, total, with *Edit*) and a mismatch line when the receipt total and transaction amount differ. Footer: *Unlink receipt* or *Link to transaction*, plus *Delete receipt*. It opens from a card or from *View*. A PDF shows a file glyph in place of the image. |
| **Manual link picker** | `components/TransactionPicker.tsx`, inside the viewer | A search box, then *Suggested* (ranked by the auto-match rule's own predicates, and omitted when empty), then *Everything else* grouped by month. Credits are never listed. Picking a transaction that already has a receipt asks before the link moves (the Replace confirmation). |
| **Field editor** | `components/ReceiptEditor.tsx`, inside the viewer | Edits merchant, date, time and total using native inputs inside the DS `Field`. Save stays disabled until the form is both valid and changed. Line items and tax cannot be edited. |
| **Auto-match** | `src/data/autoMatch.ts`, run on Save from the Receipts tab | Links a new receipt only when exactly one receipt-less outflow agrees on all three: total (to the cent), date (within 3 days either way) and merchant (fuzzy match). It never moves an amount and never displaces an existing link. It runs once, when the receipt is added. |
| **Advisory + retake** | `advisoryCopy.ts`, `useReceiptRetake.tsx` | A reading counts as failed when it produced **no line items or no total**. A failed reading shows the DS `InlineMessage` (warning tone) with a *Retake* button carrying the `photo_camera` glyph. Retake reopens the same source for one file. The new receipt replaces the old one and inherits its link. |
| **Delete** | viewer footer -> confirmation `Modal` | Asks first, then removes the receipt and releases its image. A "Receipt deleted." toast appears. The ledger amount does not move. |
| **Unlink** | viewer and detail sheet | Clears the link and nothing else, with no confirmation. The surface re-renders in place. |

**Ledger integration.** Every ledger row shows the receipt glyph exactly when it has a linked
receipt. This is derived from the receipt data, never stored on the row. It holds on the
Transactions tab, the Homepage slice, the bank holding screen and the link picker, and
`e2e/receipt-glyph.spec.ts` checks all of them.

---

## 3. The architecture, with the reason attached

### 3.1 OCR runs on the device: Tesseract.js in WebAssembly, plus `pdfjs-dist`

- **Why:** there is no backend, no API key and no per-token cost, and **the image never leaves
  the device** (roadmap decision D9). `e2e/ocr.spec.ts` counts every network request from load to
  reading and asserts that none goes to another origin.
- **The engine build that ships is `tesseract-core-simd-lstm.wasm.js`**, and it is the only one.
  `corePath` names that one file, which stops Tesseract's own feature detection from choosing a
  build at runtime. WASM SIMD needs Safari 16.4 or later.
- **The language model is `eng` `4.0.0_best_int`, LSTM only, 2,952,873 bytes gzipped.** It is
  served from `/ocr/` on this origin.
- **The whole OCR path is lazy.** The engine, the model and the parser live in separate chunks,
  and the entry chunk statically imports none of them. `index.html` carries **0**
  `modulepreload` entries, so a visitor who never adds a receipt downloads none of it.
- **PDFs are drawn to an image (`rasterise.ts`), page one only, at a 2000px long edge.** The
  engine then reads that image. There is no text-layer shortcut: one pipeline means one parser
  and one set of failure modes.
- **All four library defaults that would fetch from a CDN are overridden:** `workerPath`,
  `corePath`, `langPath`, and pdfjs's `workerSrc`.

### 3.2 What is read, and what is derived

**Line items are read. The subtotal is derived from them. Tax and total are taken as printed.**
The subtotal is `receiptSubtotal()`, the sum of the line items. Tax and total are whatever the
parser read off the paper, or whatever the user typed in the editor. This is deliberate. A
receipt is a transcription of a photograph, and a total computed as subtotal plus tax would put a
figure on screen that the paper does not show. So when some line items are dropped, the derived
subtotal does not add up to the printed total. **The app shows that disagreement rather than
hiding it.** (The Gate 65 brief described all three as derived; see §9.)

A figure that was never read shows as an em dash (`—`), never as `0.00` (Gate 58). The rules:

- A stored total of `0` means unread. The parser never returns 0, and the editor refuses 0.
- A receipt with no line items has no subtotal.
- On a captured receipt, `tax: null` means unread. It is told apart from a transcribed "no tax
  line" by using `sourceUrl` as a stand-in for "this was captured".

### 3.3 Monarch's own parser, not a hosted service

`src/data/ocr/parseReceipt.ts` is a pure function from word positions to fields. It is regex and
heuristics, hand-written, with no LLM and no service. It works in six steps:

1. Normalise each amount token.
2. Rebuild rows from word boxes, correcting for skew.
3. Find the price column.
4. Classify each row as purchase, summary, tender, meta or discount.
5. Pick the item region.
6. Choose the total, tax and date.

Every rule describes receipts in general, and none names a shop. **Why not a hosted service:** it
would send the text of a user's receipt to a third party, which breaks D9 in spirit. It would also
make the output non-deterministic and impossible to assert on.

### 3.4 Normalisation, and a second pass triggered by the outcome

- **`normaliseForOcr` scales every decodable image to a 1600px long edge,** up or down (Gate 56).
  It also applies the JPEG EXIF orientation, which the app parses itself in both byte orders,
  flattens the image onto white and encodes it as PNG. **Size was the only preprocessing that
  helped.** Binarisation, page-segmentation modes and other long edges were each measured and
  each was worse.
- **An image that is already upright and already 1600px is passed through as the identical
  `Blob`.** This is required for correctness. A 1:1 redraw was measured costing one seeded
  receipt its letterhead.
- **The second pass runs only when the first reading has no line items or no total** (Gate 58).
  It reads the image again with the 'photo' preparation (high-quality smoothing plus greyscale)
  and keeps the better reading. The trigger is the outcome, never the engine's confidence score,
  because Gate 57 measured confidence as useless for this. Of the 30 corpus images, 8 trigger it.

### 3.5 The camera is a file input

A web app cannot own the device camera. `<input capture="environment">` hands the user to the
phone's own camera app. **So the designed full-screen camera screen (Figma `1266:14282`) was
retired at Gate 50.** It could never show a live viewfinder. A `getUserMedia` feed was also ruled
out, because a live frame can never hold a visual baseline. The OS file picker has no baseline
either, permanently; the suite covers the surfaces on either side of it.

### 3.6 How the visual suite stays deterministic

- **`extractReceipt(file)` (`src/data/extract.ts`) is the one entry point to reading.** It checks
  `window.__monarchExtractReceipt` at call time.
- **The harness installs a stub that never settles on every walk state**
  (`installExtractionStub`), so no walk state runs the real engine. A state that needs a read
  result supplies a fixed one through `OverlayState.extraction` (Gate 60).
- **Staging uses a committed fixture, `e2e/fixtures/receipt-capture.jpg`.** It is picked through
  the real button, with the `filechooser` event intercepted. `receipt-capture-rotated.jpg`
  covers the EXIF-orientation path.
- **Only `e2e/ocr.spec.ts` runs the real engine**, and it asserts the engine's actual reading of
  the fixture, including the engine's known misreads.

### 3.7 State lives only for the session

Nothing about receipts is persisted. `AccountsProvider` holds `transactions` and `receipts` in
`useState`, and a reload restores the seed. A captured receipt's image is a `blob:` URL, which
cannot outlive the document that created it anyway.

Some facts about a capture are not stored on the `Receipt` record. They live in **in-memory side
stores keyed by receipt id**:

| store | file | holds | why it is not a field |
|---|---|---|---|
| `sourceByFile` (a `WeakMap`) and `sourceByReceipt` | `src/flows/finance/receiptCapture.ts` | camera or gallery, which retake reads | only retake reads it; the record's shape stays narrow (Gate 58 ruling 2) |
| `dateReadByReceipt` | `receiptCapture.ts` | whether the printed date was actually read | the fallback date looks exactly like a read one; only the "No receipt date" group needs to tell them apart |
| `byReceipt` | `src/data/captureDiagnostics.ts` | the per-capture diagnostic record (`?diag=1` only) | a developer instrument, created at extraction time before a receipt id exists |

They are kept in memory because persistence is out of scope (D2 and D3), and because a stored
field would widen the record for facts that only one surface reads.

---

## 4. What it measurably does and does not do

Measured at Gate 65 with `npm run ocr:corpus`, then scored with
`npm run ocr:corpus:score -- <out> --reparse`. The run used the real engine, a fresh page per
image, and the app's own one-or-two-pass reading. The corpus has three sets:

- **development:** 20 receipts, 97 printed items. These are 10 seeded receipts and 10 phone photos.
  The parser was written against all 20.
- **blind gallery:** 5 receipts nobody here had seen before Gate 57, supplied as gallery images.
- **blind camera:** the same 5 receipts, photographed with the phone's camera.

Since Gate 57 the blind set counts as development data, so a future test on truly unseen receipts
needs new paper.

| set | line items | totals exact | tax | date | junk rows | advisory fires | mean / max per receipt |
|---|---|---|---|---|---|---|---|
| **development** (20) | **79 / 97 = 81.4%** | **18 / 20** | 17 / 20 | 17 / 20 | 6 | 1 / 20 | 2.0 s / 4.6 s |
| **blind gallery** (5) | **26 / 39 = 66.7%** | **3 / 5** | 1 / 5 | 4 / 5 | 2 | 2 / 5 | 3.0 s / 5.0 s |
| **blind camera** (5) | **11 / 39 = 28.2%** | **1 / 5** | **0 / 5** | 2 / 5 | 8 | **4 / 5** | 6.2 s / **7.5 s** |
| all 30 | 116 / 175 = 66.3% | 22 / 30 | 18 / 30 | 23 / 30 | 16 | **7 / 30** | 2.9 s / 7.5 s |

All four aggregate rows match the Gate 58, 63 and 64 records exactly. The advisory count comes
from applying the app's own failure rule (no line items, or no total) to the reading the pipeline
kept for each image. By set it fires on 0 of 10 seeded receipts, 1 of 10 device photos, 2 of 5
blind gallery images and 4 of 5 blind camera photos. The second pass triggered on 8 images.

**The time ceiling is not met.** Gate 58 set 6 seconds as the per-receipt ceiling. Camera
photographs that trigger both passes take up to 7.5 s. Gate 58 found that recognition itself is the cost. It reported
the choice to Teku as a conflict: accept about 7.6 s on a bad photograph, or drop the second pass. No later gate records a ruling,
and the second pass still ships.

> **RULED 2026-09-24 (Teku, Flow 9 Decision 1; shipped at MVP Gate 67).** The 6 s figure is
> **retired as a limit** and kept only as a **measurement**. A read runs to completion. While it
> runs, a caption under "Reading your receipt…" changes with elapsed time: empty until 6 s, then
> "This one's taking a little longer…", then at 12 s "Photos can take a bit longer to read. Still
> working…", then at 20 s "Still working — thanks for your patience." The captions are
> deliberately time-based. They never name a reading stage, because only 8 of 30 corpus images
> trigger the second pass. A **30 s cutoff** catches a stuck engine only; it is not a speed target.
> At 30 s the capture resolves as a read that produced nothing, and the existing advisory and
> retake take over. A read that finishes after the cutoff is ignored. The Gate 58 text above is
> kept as the record of what was measured then.

**What those numbers mean, plainly.**

- **On receipts the parser was developed against, it reads most line items** (about four in five)
  and nearly all totals.
- **On unseen receipts supplied as clean images, it reads about two thirds of the items** and the
  total on three receipts in five.
- **On unseen receipts photographed with a phone camera, it reads roughly a quarter of the items
  and the total on one receipt in five.** That is the case a real user is most likely to hit, and
  it is the weakest number here.
- The camera gap is **capture quality**: focus, blur, glare and paper that is not flat. It is not
  resolution. Gate 57 measured the photographed text as *larger* than the gallery images' text,
  and it still read worse.
- The remaining misses are **reading failures** (the engine's text does not contain the figure or
  the name), not parsing failures. Gate 57 classified them mechanically, and Gate 58 checked the
  flagged cases by hand.
- **No figure here is proven on truly unseen receipts.**

**What the app does about it, so a failure is visible rather than silent:**

1. **An unread figure shows as `—`, never `0.00`** (Gate 58).
2. **The advisory** (Gate 60, moved to the DS `InlineMessage` at Gate 63) fires on any reading
   with no line items or no total. It says which half is missing and offers **Retake**, which
   replaces the unreadable receipt (Gate 61).
3. **Manual correction.** The field editor fixes merchant, date, time and total (Gate 51-B). The
   manual link picker recovers any missed auto-match. Its ranking puts the correct transaction
   first for 10 of 10 seeded receipts (Gate 51-B, re-measured at Gate 54-B).
4. **Auto-match never links wrongly on the corpus.** Leave-one-out on the seeded receipts gives
   9 correct, 0 wrong and 1 unlinked (Gate 58). A missed link costs the user one pick. A wrong
   link would be silent.

**What the advisory cannot see.** A reading that returned *some* items and *a* total looks
successful even when the total is wrong or half the items are missing. The corpus contains
exactly that case, and the advisory stays silent on it. Nothing in the app knows what the paper
printed. No confidence threshold is used, because Gate 50-B measured one and it did not work
(AUC 0.642).

---

## 5. Diagnostics — `?diag=1`

Load any route with `?diag=1`, add a receipt, then open it in the viewer. A collapsed "Capture
diagnostics" section appears at the bottom of the viewer body (Gate 59). The flag is read once
when the page loads and is never persisted. With the flag absent, the diagnostic module is never
fetched.

**Per capture it shows:**

- **Source:** name, MIME type, bytes, and the SHA-256 of the source bytes.
- **Decoding:** whether a PDF was rasterised, the stored and decoded dimensions, and the EXIF
  orientation.
- **Per pass:** the preparation used, the normalised size, bytes and type, whether the image was
  passed through, normalise time, engine time, raw-text length, line count, engine confidence,
  any error, and — **added at Gate 64 — the pixel hash**. On the redraw path that is the SHA-256
  of the decoded RGBA pixels of the normalised image. On the pass-through path it is the SHA-256
  of the source bytes.
- **The second pass:** whether it ran, what triggered it, which reading was kept and why.
- **The result:** item count, total, subtotal, tax, whole-capture time, and any error.

**Copy as JSON** copies every field except the raw engine text, which stays on screen only.

**The one question the pixel hash answers: did two devices (or two runs) hand the engine the same
pixels?** The engine build is fixed and WebAssembly is deterministic, so the same pixels mean the
same reading. Different pixels point at the canvas resampler in `normaliseForOcr`, whose output
depends on how the browser draws the canvas (GPU or CPU). The hash **shows** that two devices
differ. **It does not make them agree.**

**The phone-versus-desktop comparison, 22–23 Sept.** Recorded from the review thread. The repo
holds only part of it, and says so:

- **Reported:** the same receipt produced an identical source hash and the same total on both
  devices, but different normalised output and different raw text.
- **In the repo:** `CLAUDE.md` (Gate 64, §2.3) records only that the "same hash, different
  totals" condition for a special divergence branch **was never met, so that branch was dropped**,
  and that the general pixel hash shipped instead. The "different normalised output and raw text"
  half is not written down anywhere on disk.
- **Deterministic resampling across devices is not implemented and not scheduled.**

---

## 6. Personal-data discipline

- **The standing rule: no text taken from a receipt enters the repository.** That covers product
  names, amounts, dates, barcodes, invoice numbers, staff and member names, phone numbers,
  addresses and card fragments. Generic till labels ("Total", "Subtotal", "Rounding") are
  vocabulary and may appear.
- **Corpus file stems are the one allowed kind of reference.** They are allowed in `CLAUDE.md` so
  a measurement stays traceable to its image. This file uses none of them.
- **The device and blind photographs live outside the repo** in `D:\Claude\_assets\`, along with
  their `TRUTH.md` transcriptions. The corpus harness refuses to write inside the repo
  (`assertOutsideRepo`).
- **How the audit works:**
  1. Collect every added diff line and every untracked file, and split them into tokens. A
     decimal such as `12.49` stays one token. (Splitting it in two let a Gate 57 audit report a
     false all-clear.)
  2. Intersect those tokens with the tokens of both corpus `TRUTH.md` files.
  3. Subtract every token already in the previous tag's tree, and the corpus stems.
  4. The expected result is 0 hits.
- **It is negative-controlled every gate:** inject one corpus decimal and one corpus word that
  appear nowhere in the tree, confirm the audit reports exactly those two, restore the file by
  hash, and confirm 0 again.
- **Forward-only scrubs.** Gates 55 and 56 replaced device-derived strings in the tree with
  invented values of the same shape. Git history still holds the originals.
- **One documented exception still stands:** `e2e/parse-receipt.spec.ts` (from Gate 54) carries
  device-derived fixture text — an item name and its prices from one device receipt. Gate 55
  reported it, and Gate 64 found it again. It predates the audit's baseline tag, so the audit
  does not flag it. Whether to scrub it is Teku's call, and history keeps it either way.

---

## 7. Deferred and closed items

Format: **where** — **the problem** — **the decision**.

| item | where | the problem | the decision |
|---|---|---|---|
| **UI-1 / G34** | `src/flows/finance/TransactionFilterSheet.tsx`, its `'merchant'` view. Screen: Transactions tab -> filter sheet -> "Select merchant". (This is Flow 8's surface; the gap register files G34 under flow 9.) | The DS `Menu` paints its own card inside the `Sheet` card, so it reads as a box within a box. `Menu` has no unframed option. | **Solution agreed, fix deferred.** The items sit directly on the sheet surface, through an unframed `Menu` option in the DS (the `InlineMessage` `isFramed` precedent). No MVP override. Teku's decision, 23 Sept. Deferred to the DS round after Flow 9, together with G21–G23 on the same picker. |
| **UI-3** | the Android status strip, installed app. `index.html` `theme-color` plus `src/shell/useStatusBarColor.ts`. Screens: every route. | Wanted: a transparent status strip. An installed web app on Android cannot have one; Gate 44-B showed the `theme_color` alpha is discarded and `standalone` keeps Chrome's strip. What ships is a matched per-route colour, the ceiling for a web app. | **Solution chosen, deferred.** Package the app as a native Android app rather than accept a compromise (Teku, 23 Sept). Deferred until the remaining flows are built. **The packaging route is not chosen yet**, and it must be decided against D1 (React DOM). |
| **UI-2** | Home (`/`), the Monarch Academy card | The card was cut off behind the bottom navigation. | **Closed.** The nav-bar scrim with enough runway fixed it. Teku confirmed on the live app at `8f91e5e`, 23 Sept. |
| **G33** | `src/flows/finance/finance.css` (two rules scoped to `.mvp-receipt-viewer-modal`) and `src/flows/finance/components/ReceiptViewer.tsx` (the `className` prop). Screen: the receipt viewer. | The DS `Modal` gives its card no height cap and no scroll region. A tall viewer card overflows the viewport and pushes its primary action off screen. | **Workaround in place; still open at v2.4.1.** The `Modal.css` diff is empty across the re-pin. The workaround is the only MVP rule that targets a DS component's internals. **Delete both rules, the class and the prop at the first re-pin after the DS closes G33.** `grep -rn "mvp-receipt-viewer-modal" src/` finds exactly two files. |
| **Two contrast figures** | the DS tokens. Screens: the receipt advisory, and `PromptBlock`'s body line in the detail sheet. | `--mapped-text-warning-default` on the advisory card measures **2.34:1** light and **4.22:1** dark. `--mapped-text-subtle-default` on `--mapped-surface-subtlest-default` measures **4.33:1** light. All three are below AA 4.5:1. | **For the DS round, not the MVP.** Re-measured at Gate 64 under v2.4.1 and unchanged to the hundredth (gap register §2m, Ruling A). The advisory avoids the warning token for text. The second pairing is not worked around. |
| **Showcase site and QR code** | not yet built. The origin does not exist; `netlify.toml` is the file that will change. | A design-system showcase with a tokens tab, a components tab, and an MVP tab that embeds the live app in a phone bezel, plus a QR code that opens the app on a phone. | **Solution agreed, built after the flows.** Leave `frame-ancestors` unwritten until the showcase origin exists. The exact one-header change is recorded in `CLAUDE.md` under "Deploy hygiene (Gate 24)". |
| **`tesseract.js-core` not listed** | `package.json`. It is imported directly at `src/data/ocr/recognise.ts:2`. | The app imports it directly, but it arrives only as a dependency of `tesseract.js` 7.0.0 (`^7.0.0`, resolving to 7.0.0 in the lockfile). | **Hygiene, not a bug. Deferred.** List it explicitly, pinned exact, at a future gate. |
| **Deterministic cross-device resampling** | `src/data/ocr/normalise.ts` (the canvas redraw) | Two devices can hand the engine different pixels from the same source bytes. | **Not attempted and not decided.** The `?diag=1` pixel hash detects the case; nothing makes devices agree. |

**Also still open, carried from the gates rather than raised here:** G13, G14 (no background
scroll lock; the receipt viewer inherits it), G17's prop half, G19–G23, G28–G30, G32 (gap
register: 33 entries, 11 closed, 22 open). There is no MVP-local override for any of them. The
Receipts-tab card still draws a broken thumbnail for a captured PDF (reported at Gate 51, not
fixed). The confidence-based "take another photo" affordance was not built (Gate 50-B). A
conditional second preprocessing pass was measured and not shipped as the default (Gate 57).

---

## 8. The gate list

Derived from `git tag -l` and the gate sections of `CLAUDE.md`. The dates are the tagged commits'
dates.

| gate | tag | commit | date | what it changed |
|---|---|---|---|---|
| 48 | `mvp-gate48` | `230d51a` (merge) | 09-08 | Receipts data model and the Receipts tab. `hasReceipt` became derived. Linked amounts were reconciled to their receipts. |
| 49 | `mvp-gate49` | `880192c` | 09-09 | Transaction detail sheet, linked and unlinked states. `unlinkReceipt`. |
| 50-A | `mvp-gate50a` | `361f480` | 09-09 | DS v2.3.0 re-pin, three glyphs, and a harness that expects a list of dialogs. |
| 50 | `mvp-gate50` | `e7692e1` | 09-09 | Capture surfaces: source picker, bulk modal, the `extractReceipt()` seam. Camera screen retired. |
| 50-B | `mvp-gate50b` | `5884822` | 09-11 | Real client-side OCR (Tesseract.js, pdfjs) behind the seam. |
| 50-C | `mvp-gate50c` | `b9923c3` | 09-11 | Auto-match at add time. The seam may now return nulls. |
| 51 | `mvp-gate51` | `02d7818` | 09-12 | Receipt viewer, delete with confirmation and toast, one screen-level add, capture time in local time. |
| 51-B | `mvp-gate51b` | `9118424` | 09-12 | Manual link picker, field editor, completed viewer. G33 workaround. |
| 52 | `mvp-gate52` | `b01567e` | 09-12 | Gallery bulk-add data loss fixed (sequential reads). Receipt-library source. G31 mitigations. |
| 53 | `mvp-gate53` | `1aa34a9` | 09-15 | Merchant photos on transactions. Two seed rows dated to their paper. Applied filter re-anchored. Picker spacing. |
| 53-B | `mvp-gate53b` | `1da2ea8` | 09-16 | Holding-screen receipt glyph derived. Two Figma divergences registered. |
| 54 | `mvp-gate54` | `c21b810` | 09-16 | Real-paper OCR: EXIF byte order fixed. Capture names from the clock (Decision 7B). |
| 54-B | `mvp-gate54b` | `7ad26ea` | 09-16 | A seed payee renamed so a real receipt auto-links (Decision 8A). |
| 55 | `mvp-gate55` | `4678f65` | 09-17 | Layout-aware parser over word boxes, plus the corpus harness. |
| 56 | `mvp-gate56` | `2feb8dc` | 09-18 | Images sized to a 1600px long edge before OCR. Personal strings scrubbed. |
| 57 | `mvp-gate57` | `c84a98e` | 09-18 | Blind test. Five general parsing shapes. Reading measured as the ceiling. |
| 58 | `mvp-gate58` | `be2bacd` | 09-19 | Outcome-triggered second pass. Receipts ordered by date added. Em dash for unread figures. |
| 59 | `mvp-gate59` | `1ee8431` | 09-19 | `?diag=1` capture diagnostic. |
| 60 | `mvp-gate60` | `61cfa45` | 09-20 | Advisory and retake for unreadable photographs. |
| 61 | `mvp-gate61` | `7fa326a` | 09-20 | A retake replaces the receipt it retakes. |
| 62 | — | — | — | **No tag and no section in `CLAUDE.md`.** There is no Gate 62 commit on `main` between `mvp-gate61` and `mvp-gate63`. The number is simply absent from this repo. |
| 63 | `mvp-gate63` | `8f91e5e` | 09-23 | DS v2.4.1 re-pin. `InlineMessage` adopted for the advisory. G31 closed. |
| 64 | `mvp-gate64` | `5a89774` | 09-23 | Receipts sort control, source-picker order, pixel hash, a duplicate PDF check removed. G34 opened. |
| 65 | *(Teku's to tag)* | — | 09-23 | This record. No code change. |

Gates 50-A and 63 are DS re-pins that also carry Flow 9 work, so they are listed. Gate 46 is the
last tagged Flow 8 gate.

---

## 9. Premises of the Gate 65 brief that disk contradicted

1. **"Line items are read; subtotal, tax and total are derived from the items, never
   transcribed."** Wrong for two of the three. Only the subtotal is derived. Tax and total are
   stored as read or as typed, and have been since Gates 48–50-B (see §3.2). Deriving them would
   put figures on screen that the paper does not print.
2. **The 22–23 Sept comparison "different normalised output and raw text".** Not on disk. The repo
   records only that the "same hash, different totals" condition was never met. §5 labels the
   rest as coming from the review thread.
3. **`CLAUDE.md` plus `git tag -l` give the whole gate list without guessing.** True, with one
   hole. There is no
   `mvp-gate62`, no Gate 62 section and no Gate 62 commit. `mvp-gate48` is a merge commit, unlike
   the others.
4. **G34 is a Flow 9 surface.** Its screen is the Transactions filter sheet's merchant view, which
   Flow 8 built. The gap register files it under flow 9 because it was raised during Flow 9.

**Checked and confirmed, the three attacked hardest:**

- **The tag count (57).** `git tag -l | wc -l` returned 57, from `mvp-gate6` to `mvp-gate64`, with
  gaps at 28, 32, 34–37, 40, 42, 45, 47 and 62.
- **The baseline digest (`eab5f2d7…c174eade0`).** Reproduced with the standing manifest command
  over 172 files.
- **That the harness still reproduces every aggregate.** See §4; it was re-run at Gate 65, not
  quoted.
