# Commitment offer artwork

One file, for Flow 11's smart insight (Gate 80).

| | |
|---|---|
| file | `offer_maxis_5g_home_wifi.webp` |
| bytes | 39,838 |
| natural | 900 × 371 |
| rendered | 311 × 128 CSS, i.e. 622 × 256 at DPR 2 and 933 × 384 at DPR 3 |
| consumer | `CommitmentOffer.image`, resolved by `offerImageUrl` in `src/config/media.ts` |

## ⚠ THIS IS A CORRECTED DERIVATIVE, NOT THE ARTWORK FIGMA HOLDS

**THE ORIGINAL CONTRADICTED THE RULING THE WHOLE PANEL DERIVES FROM.** Figma's
image fill on `883:7868` is genuine Maxis marketing material advertising a
**RM99 → RM69** offer. Teku's ruling of 30 September 2026 sets this commitment
at **RM 120/month** and the offer at **RM 70/month**, so the app derives
RM 50/month and RM 600/year — and the first build of this gate shipped the
original raster, which printed "Now Only RM99 ~~69~~" directly above a panel
reading "Current RM 120.00 / Suggested RM 70.00". **Teku caught it and supplied
a corrected file**; this is that file.

What was changed, against the original:

| | original | corrected |
|---|---|---|
| bundle title | "Maxis 5G Home WiFi **99** Bundle" | "5G Home WiFi **120** Bundle" |
| rebate line | "Rebate **RM30** x 24 months" | "Rebate **RM50** x 24 months" |
| headline price | "Now Only **RM99** ~~**69**~~/month" | "Now Only **RM120** ~~**70**~~/month" |
| offer period | "31 July - 4 September 2025" | "**1 - 31 October 2026**" |
| dimensions | 900 × 506 | **900 × 371** |

The photograph, the house motif, the UNLIMITED/FREE panel and the small print
are the original's. The Maxis wordmark and the "Maxis 30th Anniversary Mega
Deal" headline band are **not** in the corrected file — it is recomposed, not
merely renumbered. The app still names the provider "Maxis" in its own copy,
from `CommitmentOffer.provider`, so nothing on screen depends on the wordmark
being in the raster.

**THE FILENAME STILL SAYS `maxis` AND THAT IS DELIBERATE** — keeping the path
constant is what made the replacement touch four baselines and nothing else.

### The dimensions changed, and that changes the CROP as well as the numbers

The corrected file is **900 × 371**, where a note accompanying it said 900 × 506.
It was taken as given rather than padded to 506, because padding would invent
pixels. The consequence is worth knowing:

| | ratio | `object-fit: cover` crops |
|---|---|---|
| slot 311 × 128 | 2.4297 | — |
| original 900 × 506 | 1.7787 | **26.8%** off top and bottom |
| corrected 900 × 371 | 2.4259 | **0.2%** |

So the corrected artwork is very nearly the slot's own aspect ratio and is shown
almost whole, where the original was a zoomed centre band. That is a visible
improvement and it is why the four re-minted captures differ by far more than
the four numbers.

At DPR 3 the slot wants 933 × 384 and this file is 371 tall — 3.4% short on the
vertical, which the near-zero crop more than offsets. **Re-export from the
corrected source if it is ever shown larger than 311 CSS px.**

## Provenance

- **Original**: the image fill on Figma `883:7868` ("image 98") in the
  case-study file `v9MI8jxTaXiJA234Hkanlf`, inside the smart-insight panel
  `1266:14341`. Pulled with `rawImages`, **not** with `download_assets`' export
  render — the export of a node whose content is an image FILL is a blank plate,
  and its tell is two different nodes returning a byte-identical file. Figma
  holds it as a 900 × 506 PNG of 393,499 bytes.
- **Corrected source**: `D:\Claude\_assets\offer-120-70.png`, 900 × 371 PNG,
  413,968 bytes, sha256 `96eaa28a…ff46a95b`. Supplied by Teku, 2 October 2026.
- **Encoding**: decoded and re-encoded to WebP q85 through a headless Chromium
  canvas — the Gate 75 method for the goal images, and no new dependency.
  Measured alternatives for the corrected source: JPEG q85 64,064 B, WebP q90
  49,320 B, JPEG q90 78,133 B. WebP q85 is both the smallest and the house
  format for a photographic asset (`media/banner/`, `media/profile/`).

## What it depicts

A telco home-broadband promotion, including a stock photograph of a person. It
is in the repo because Teku designed the flow around it and then corrected it;
it is consistent with the case study's existing use of real-brand material (the
ten photographed receipts, the DS's Netflix / IKEA / Maybank logos).

**THE RASTER AND THE APP NOW AGREE**, which they did not before: both say 120
and 70. The app still stores only those two prices and derives every saving from
them — see `src/data/offers.ts`. If the artwork is ever revised again, the
numbers in it must be brought to the ruling, not the other way round.

The deploy is `noindex` and `Disallow: /` (Gate 24), so this is not published to
search. If the case study is ever made public, the licensing of this image is
Teku's call to revisit.
