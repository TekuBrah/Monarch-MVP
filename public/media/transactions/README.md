# `public/media/transactions` — merchant photographs

Per-record product data for a transaction whose `logo` is
`{ kind: 'image', filename }`. Resolved by `transactionLogoUrl()` in
`src/config/media.ts`; no component writes a literal `/media/...` path.

## NOT A `MediaSlot`, AND NOT A DS ASSET

Two things this directory is deliberately not:

- **Not a media slot.** A `MediaSlot` is ONE logical name resolving to ONE url a
  customisation flow can swap. These are per-record: each transaction names its
  own file. Same argument as `public/media/receipts`, which is the precedent.
- **Not a candidate for the DS.** The DS `Logo` component takes a name from a
  closed `LogoName` registry of curated vector brand marks. A photograph of one
  merchant's shopfront signage is not a registry entry at any point in the
  future, so this is not a gap the DS will close. No gap number was opened.

## Measured, Gate 53

Read from each file's own JPEG SOF marker and APP1 segment, not from its
extension:

| file | format | dimensions | aspect | EXIF orientation | bytes |
|---|---|---|---|---|---|
| `st-rosyam.jpg` | baseline JPEG (SOF0), JFIF/APP0 | **447 x 447** | 1.000 | absent | 13,946 |
| `ifruits-market.jpg` | baseline JPEG (SOF0), JFIF/APP0 | **447 x 447** | 1.000 | absent | 18,954 |

**BOTH ARE EXACTLY SQUARE, AND BOTH SOURCE FILES WERE NAMED `.jpg.jfif`.** JFIF
is the JPEG container, so they are ordinary JPEGs; only the extension was
corrected on copy, and the bytes are **identical to the source** by SHA-256 —
these were copied, never re-exported.

**NO EXIF ORIENTATION TAG ON EITHER.** Nothing has to honour a rotation flag,
which is the one way a photograph can render sideways through an `<img>`.

## NOT DOWNSCALED, AND THE ARITHMETIC IS WHY

`TransactionMark` renders these through DS `Avatar`, whose largest size is
`l` = 40px, i.e. **80 device pixels at DPR 2**. 447 is a ~5.6x oversupply.

It was left alone anyway, because the cost is already negligible: **32,900 bytes
for both files combined**, against the 128,696-byte `academy` PNG this repo
already ships for a 221x152 render and the 67,326-byte banner. Re-exporting
would change bytes for a saving of roughly 25 KB across the whole site, and
this repo has no image pipeline — a re-export is a hand step whose only effect
here would be to put two files out of step with their source. Gate 25's ruling
stands: keep a re-export as its own separate act.

**IF EITHER IS EVER SHOWN LARGER THAN 40px, re-check that.** 447 is ample for a
mark and short for anything full-bleed.

## Cropping is the DS's, and it is verified rather than assumed

`.mn-avatar--photo img` is `object-fit: cover` inside `.mn-avatar`, which is a
fixed square at `border-radius: 50%` with `overflow: hidden`. So an arbitrary
aspect ratio fills the circle and is CROPPED, never distorted — measured at
render in Gate 53 with a deliberately 4:1 control image, because these two
files are square and could therefore never demonstrate it themselves.

**THAT IS WHY THE SQUARE ASPECT IS NOT A REQUIREMENT OF THIS DIRECTORY.** A
future non-square merchant photograph renders correctly; it just loses its
edges. Centre the subject.

## Recipient photographs, Gate 92

The recipient picker's three people (`src/data/recipients.ts`, Figma `1266:14391`) draw through the same
`{ kind: 'image', filename }` mark as the two merchant photographs above, so they live here too.

| file | source (Figma image fill) | export | bytes | sha256 |
|---|---|---|---|---|
| `rachum-greene.jpg` | 588×538 PNG; dark strip 6 rows (mean luminance 33) | **532×532**, crop x=28 y=6 | 52,010 | `b3dad239e17b49ae0772c110a15d411ed440fa32c3dc2935b74013867788674c` |
| `perry-matthew.jpg` | 655×586 PNG; dark strip 2 rows (33) | **584×584**, crop x=35 y=2 (centring is 35.5; 35 left, 36 right) | 44,521 | `1af0d9f7b1ea776aadd7eca998098d61fd62f3a64fd47de31f7743c81282847f` |
| `fiona-hammock.jpg` | 464×446 PNG; no strip | **446×446**, crop x=9 y=0 — byte-identical to Phase A's export | 35,441 | `397f520d0377f4e510f943783772d03d408a0a07707d79a1f7f9cb21aaf8db17` |

**PROVENANCE — Teku's Decision 24A (26 Oct 2026), in his own words: he generated the three photos with AI.**
They ship on that basis. They are not stock and not photographs of real people; if that ever changes, this row
is what must change with it.

**HOW THEY WERE EXPORTED (R92-12).** Figma fills each 40px avatar from a rectangular PNG with a centre-square
crop at the source's short side. Two sources carry a dark capture strip along the top (mean luminance 33):
Rachum 6 rows, Perry 2, Fiona none. Each file is the largest centred square that EXCLUDES the strip — side =
source height minus the strip, centred horizontally, starting below the strip — encoded through headless
Chromium as JPEG q0.9 (`gate92-build\photos\export.cjs`, outside the repo). Perry's centring is 35.5px, so his
square starts at x=35 (35 px left, 36 right). Fiona's file is byte-identical to Phase A's export. All three were
read at 40 and 80 px with no line along the top.

**NOT DOWNSCALED, for the reason given above for the merchant photographs:** `Avatar l` paints 80 device px,
so these are 5.6–7.3× oversupplied, and a common size would upscale Fiona (446). No EXIF orientation tag on any
of the three (Chromium canvas encodes none).
