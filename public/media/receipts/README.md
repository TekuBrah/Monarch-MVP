# `public/media/receipts/` — receipt photographs

Ten receipt images, one per `Receipt` record in `src/data/receipts.ts`. Vite
copies `public/` verbatim, so these are served from `/media/receipts/<file>`
with no import statement and no bundler processing — the same arrangement the
`academy`, `banner` and `profile` slots already use.

## THIS DIRECTORY IS NOT A MEDIA *SLOT*, AND THAT IS THE ONE THING TO READ

`src/config/media.ts` models a slot as **one logical name resolving to one
URL** — `profile`, `banner`, `academy`. Receipts are ten files whose identity
is product data: each `Receipt` record names its own `filename`. There is no
"the receipt image" to point a slot at, so `MediaSlot` was deliberately NOT
widened.

What the config gained instead is `receiptUrl(filename)`, which owns the
`/media/receipts/` prefix so that no component writes a literal `/media/...`
path. That is the rule `media.ts` states, honoured without bending the slot
union into a shape it does not fit.

## What is actually here — MEASURED, not assumed

Read from each file's JPEG SOF marker, not from a file manager.

| file | pixels | bytes |
|---|---|---|
| `receipt_aeonbig01.jpg` | 292 × 525 | 53,496 |
| `receipt_aia01.jpg` | 292 × 531 | 52,160 |
| `receipt_caring01.jpg` | 297 × 513 | 51,408 |
| `receipt_giant01.jpg` | 297 × 528 | 50,186 |
| `receipt_ikea01.jpg` | 291 × 520 | 50,247 |
| `receipt_ikea02.jpg` | 287 × 517 | 47,696 |
| `receipt_ikea03.jpg` | 291 × 526 | 54,248 |
| `receipt_jayagrocer01.jpg` | 290 × 527 | 54,914 |
| `receipt_lotus01.jpg` | 283 × 517 | 46,502 |
| `receipt_tonyroma02.jpg` | 292 × 522 | 50,697 |
| | | **511,554 B = 499.6 KB** |

**THE LONG EDGE IS ~520px, NOT THE ~1200px THE BRIEF ASSUMED.** That was a
guidance figure that had never been checked against the delivered files, and it
is out by a factor of 2.3. The size guidance (~300 KB each) was met with room
to spare — the largest is 54.9 KB.

## What that resolution is and is not enough for

| use | device px needed @ DPR 2 | supplied | verdict |
|---|---|---|---|
| the 48 × 48 card thumbnail (Gate 48) | 96 × 96 | 287–297 wide | **ample** — ~3× oversupply |
| a full-bleed viewer at 430 CSS px (Gate 50?) | 860 wide | 287–297 wide | **under-resolved ~2.9×** |

Nothing was resized. Downscaling would throw away detail a later viewer needs;
upscaling cannot create detail that was never captured. If Flow 9 later shows a
receipt full-screen, **these files must be re-exported from source at a larger
long edge** — that is an artwork step, not a build step, and it belongs in the
gate that ships the viewer.

## Provenance

Delivered by Teku at `D:\Claude\_assets\receipts\`, copied here byte-identical
(SHA-256 verified on all ten). They are photographs of mock receipts; the
merchant, date, time, line items and total printed on each are the source the
`Receipt` records transcribe and the ledger's linked amounts follow.
