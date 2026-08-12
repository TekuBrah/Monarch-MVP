# `public/media/academy/` — Monarch Academy card

> **⚠️ NOT WIRED. The directory and the slot exist; no component can consume
> them yet.** This is a suspected design-system gap, not an oversight here — see
> "Why nothing renders" below. Dropping a file in this directory today changes
> nothing on screen.

| | |
|---|---|
| **Aspect ratio** | **not yet decided** — depends on which shape the DS slot takes |
| **Rendered box** | no image box exists in the component today |
| **Supply at** | hold off. Two candidate targets measured below |
| **Format** | PNG or SVG if the slot turns out to be an illustration; JPG if a photo |
| **Placeholder** | `placeholder.svg` (218 × 184) |

## Why nothing renders

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
Master Your Money & Monarch" strip. This one is MVP-local composition, so it
*could* take an image without touching the DS. It was left alone deliberately:
adding a media region to it is a **design decision**, not scaffolding, and the
band is currently a deliberate two-token gradient with a recorded colour
divergence.

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

The `placeholder.svg` here is 218 × 184 — 2× the measured tile — purely so the
file has an honest size. **Treat it as provisional.** If the DS adds a
`CardGoals`-style full-bleed `image` slot, the real target is closer to
`109 × <banner height>` and this number should be re-measured, not trusted.

---

## How to use

> **Still not wired.** Follow these steps and nothing appears on screen yet — the
> DS component has no media slot. The gap is scheduled to close in **DS v1.4.0**;
> until then this slot is configured but rendered nowhere, on purpose.

1. **Drop the file into this folder** — `public/media/academy/`.
2. **Edit one line** in [`src/config/media.ts`](../../../src/config/media.ts), in
   the `ACTIVE_MEDIA` constant near the top:

   ```ts
   academy: '/media/academy/your-file.png',
   ```

3. **Refresh.** Nothing changes visually until `CardFeaturesAndEducation` grows
   an `image` prop (or an equivalent), at which point wiring it is one prop on
   one component — `src/config/media.ts` needs no further change.

**The path is a URL, not a filesystem path.** It is
`/media/academy/<file>` — **not** `public/media/academy/<file>`. Vite serves
`public/` from the site root, so the `public/` prefix is not part of the URL and
including it 404s.

**Accepted formats:** PNG or SVG for illustrations; JPG if it turns out to be a
photo; WebP works. Transparency is fine and may well be wanted, depending on
which shape the DS slot takes.

**A wrong path fails silently.** `public/` is copied verbatim and is **not
verified at build time** — a typo gives a green `tsc` and a green `vite build`.
There is no visible symptom here today because nothing renders the slot, so this
path will stay unverified until v1.4.0 wires it. Re-check it then.

**Currently set to:** `monarchacademy_img.webp` — 681 × 575, 17.1 KB (lossy VP8).
Configured, fetched by nothing.

The superseded `monarchacademy_img.svg` (1.8 MB, a 218 × 184 frame wrapping two
rasters) was deleted in Gate 1c. Verified equivalent first: Pearson r = 0.9993
against the WebP when both are flattened onto white.

**⚠️ Transparency was lost in the conversion.** The SVG was **47.6% transparent**;
the WebP is **0%** — lossy VP8 carries no alpha channel, so it has been flattened
onto white. Nothing renders this slot today so nothing is broken by it, but if
the DS v1.4.0 slot turns out to want a cut-out illustration over a coloured card,
this file will show a white rectangle. Re-export with alpha (lossless WebP or
PNG) at that point.
