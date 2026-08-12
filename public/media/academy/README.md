# `public/media/academy/` — Monarch Academy illustration

> **✅ WIRED as of Gate 3b.** It renders in the `❖ System message` promo band on
> the Homepage's Accounts tab — `.mvp-home__promo`, which is MVP-owned
> composition. It was never the three `card/features and education` tiles; that
> mis-attribution is what made this look like a DS gap for two gates. The DS gap
> below is real and still open, but it does not block this slot.

| | |
|---|---|
| **Aspect ratio** | box is **94.08 : 65** (≈1.447) from Figma; the artwork itself need not match — see below |
| **Rendered box** | 28.8% of the band's content width × that ratio (≈91.9 × 63.5 at a 375 frame) |
| **Supply at** | 2× the box or better. Current asset is 436 × 368 |
| **Format** | **PNG or lossless WebP with a real alpha channel.** Not JPG, not lossy WebP |
| **Placeholder** | `placeholder.svg` (218 × 184) |

## ⚠️ Transparency is a hard requirement, not a preference

The illustration is a **cut-out that sits on the band's gradient**, so the file
must carry a genuine alpha channel. Two things are checked before wiring, because
an alpha channel can be present and still fully opaque:

- the PNG's IHDR `colorType` is 6 (RGBA), **and**
- decoded pixels actually include transparent ones.

The current asset passes both: **47.33% fully transparent, 6.91% partial** (real
anti-aliased edges), all four corners `rgba(0,0,0,0)`, and only 0.13% near-white
opaque — so it is not flattened onto white. A lossy WebP export **cannot** carry
alpha and silently flattens; that is exactly how the previous
`monarchacademy_img.webp` failed and why it was deleted.

The box uses `object-fit: contain`, never `cover` — cropping would clip the
artwork, and the surplus box space is meant to stay transparent so the gradient
shows through.

## The DS gap that is still open (and is not about this slot)

The Monarch Academy section on the Homepage is built from two things, and
**neither can take an image**:

**1. `CardFeaturesAndEducation`** — the three DS tiles ("Buy and sell stocks",
"Track Spending", "Smart Insights"). Its entire prop surface is:

```ts
variant?: 'blue' | 'orange' | 'green' | 'purple' | 'outline'
icon: React.ReactNode
title: string
onClick?: () => void
className?: string
```

There is no `image` prop. Confirmed against DS **source**, not just the `.d.ts`
— the component renders exactly two children, `<span class="mn-card-features__icon">`
and `<span class="mn-card-features__title">`, and its CSS defines no media
region. (Reading source matters here: the gap register's `CardBalance` finding
was invisible in `dist/`.)

`icon` accepts any `ReactNode`, so an `<img>` *would* technically render inside
the 40 × 40 icon span — but that is forcing a media asset through an icon slot,
which is exactly what CLAUDE.md rule 3 forbids. Not done.

**2. The promo band** (`.mvp-home__promo`) — the gradient "Monarch Academy /
Master Your Money & Monarch" strip. **This is the real host, and it is where the
illustration now renders.** MVP-local composition, so it needed no DS change at
all. Gate 2 established this from Figma (`1266:14402`): the illustration is
`Group 284`, 94.08 × 65 at x=0, with the text column 224.92 wide at x=102.08
inside a 327-wide content frame.

So the tile gap above is genuine but irrelevant here — it only matters if those
three tiles ever need their own imagery.

## In-DS precedent for the fix

`CardGoals` — same `Card` family, same DS version — already has exactly the slot
this card lacks:

```ts
/** Full-bleed banner image — swappable slot. */
image?: React.ReactNode
```

So the shape of the fix is already established in the DS. That makes this an
*inconsistency within the Card family*, which is a stronger argument than a
brand-new primitive request.

## Candidate target boxes (measured, for whoever specs the DS slot)

Measured in the running app at viewport 375 × 812, `devicePixelRatio` 2:

| Element | measured w × h | aspect | radius | padding |
|---|---|---|---|---|
| `.mn-card-features` (the DS tile) | 109 × 92 | 1.1848 | 8 | 8 |
| `.mn-card-features__icon` (icon span inside it) | 40 × 40 | 1.0 | 0 | 4 / 0 |
| `.mvp-home__promo` (MVP promo band) | 343 × 66 | 5.197 | 8 | 12 |
| `.mvp-home__promo-text` (its text column) | 182.66 × 42 | 4.349 | 0 | 0 |

The tile width of 109 is *derived*, not fixed — `.mvp-home__feature-row > *` is
`flex: 1 1 0` across three tiles in a 343-wide inset, so it changes with the
frame width and the tile count.

The `placeholder.svg` here is 218 × 184, sized against the tile back when the
tile was thought to be the target. It is **the wrong ratio for the real box**
(1.184 vs 1.447) and is only ever seen if the slot is unset — left as-is rather
than re-cut, since it exists to be obviously a placeholder.

---

## How to use

1. **Drop the file into this folder** — `public/media/academy/`.
2. **Edit one line** in [`src/config/media.ts`](../../../src/config/media.ts), in
   the `ACTIVE_MEDIA` constant near the top:

   ```ts
   academy: '/media/academy/your-file.png',
   ```

3. **Refresh.** The illustration appears in the promo band on the Accounts tab.

**The path is a URL, not a filesystem path.** It is
`/media/academy/<file>` — **not** `public/media/academy/<file>`. Vite serves
`public/` from the site root, so the `public/` prefix is not part of the URL and
including it 404s.

**Accepted formats:** PNG (or lossless WebP) **with alpha**. See the transparency
section above — this is the one slot where format choice can silently break the
design, because a lossy export flattens the cut-out onto a solid background and
the failure looks like a rectangle rather than an error.

**A wrong path fails silently.** `public/` is copied verbatim and is **not
verified at build time** — a typo gives a green `tsc` and a green `vite build`,
and at runtime the `<img>` simply fails to decode. There is no gradient fallback
here as there is on the banner: the band's own gradient shows through the empty
box, so a broken path reads as "the illustration is missing", not as an error.

**Currently set to:** `monarchacademy_img.png` — **436 × 368**, 126 KB, 8-bit
RGBA (IHDR colourType 6), 47.33% fully transparent. A 2× Figma export.

Its aspect (1.1848) is **narrower than the 94.08 : 65 box** (1.4474), so
`object-fit: contain` fits it to height and leaves transparent letterboxing on
the left and right. That surplus is transparent, so the gradient shows through
and it reads as intended spacing — but an export at the box ratio would use the
full width. Worth doing on the next pass; not a defect.

### Two predecessors, both deleted

- `monarchacademy_img.svg` (1.8 MB, a 218 × 184 frame wrapping two rasters) —
  deleted in Gate 1c after verifying the WebP was equivalent (Pearson r = 0.9993
  on a white matte).
- `monarchacademy_img.webp` (681 × 575, 17.1 KB, lossy VP8) — deleted in Gate 3b.
  **Lossy VP8 carries no alpha channel**, so converting the 47.6%-transparent SVG
  to it flattened the cut-out onto white. It was never rendered, so nothing broke
  visibly; it was simply unusable for this slot. That is the cautionary case the
  transparency section above exists for.
