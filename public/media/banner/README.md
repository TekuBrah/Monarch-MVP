# `public/media/banner/` — top banner

The full-bleed image behind the app header. Stands in for Figma's `img/bg01`.

Drop a file in here and reference it from `src/config/media.ts`. Nothing else
needs editing: `public/` is copied verbatim by Vite, so a new file is live on
refresh with no import statement anywhere.

| | |
|---|---|
| **Aspect ratio** | **25:6 (≈4.17:1)** at the phone frame — but see "not fixed" below |
| **Rendered box** | viewport width × 90 CSS px |
| **Supply at** | **1125 × 270** (3× of 375 × 90) minimum. **1600 × 384** if desktop matters |
| **Format** | JPG for photos, or WebP. No transparency — the box is fully covered |
| **Placeholder** | `placeholder.svg` (1125 × 270) |

## Where the numbers came from

Measured on `.mn-header-bg__background` in the running app at viewport
375 × 812, `devicePixelRatio` 2:

| Route | `HeaderBg variant` | measured w × h | aspect |
|---|---|---|---|
| `/` | `noSearchBar` | 375 × 90 | 4.1667 |
| `/finance` | `compact` | 375.2 × 90 | 4.1689 |

Both variants land on the **same 90 CSS px height**, so one file serves both
headers — which is why there is one `banner` slot and not two. (The 375.2 is
sub-pixel viewport rounding, not a layout difference.)

`.mn-header-bg__background` is `position: absolute; inset: 0`, so its box is
exactly the header's box.

## The height is not fixed, and the width is not either

Neither number is a hard-coded dimension, so treat both as *current* rather than
guaranteed:

- **Height (90)** is content-derived. DS `HeaderBg.css` sets no height at all —
  it is `StatusBar` + one row + `padding-bottom: var(--brand-scale-250)`. A
  longer greeting that wraps, or a `--brand-scale` change, moves it.
- **Width** is `width: 100%` of the shell, and `AppShell.css` has **no desktop
  max-width and no media query** (a deliberate open item — see `CLAUDE.md`). On a
  wide desktop window the banner stretches to the full window width, well past
  375. That is what the 1600-wide recommendation is for.

## Cropping is already handled — don't pre-crop to exactly 25:6

DS `HeaderBg.css` covers the slot for you:

```css
.mn-header-bg__background > * { display: block; width: 100%; height: 100%; object-fit: cover; }
```

So any child of the slot — `<img>`, `<video>`, a `<div>` gradient — is stretched
to the box and centre-cropped. A source that is *wider* than 25:6 is safe; the
sides get cropped on a phone and revealed on desktop.

**Compose the subject centred and toward the top.** The `compact` variant
(`/finance`) lays a bottom-up black legibility scrim over the lower half of the
image, so detail near the bottom edge is dimmed by design.

---

## How to use

1. **Drop the file into this folder** — `public/media/banner/`.
2. **Edit one line** in [`src/config/media.ts`](../../../src/config/media.ts), in
   the `ACTIVE_MEDIA` constant near the top:

   ```ts
   banner: '/media/banner/your-file.jpg',
   ```

3. **Refresh.** That is the whole workflow — no import statement, no rebuild
   step, no component change.

One line serves **both** headers — the Homepage (`noSearchBar`) and Finance
(`compact`). There is deliberately no second banner slot.

**The path is a URL, not a filesystem path.** It is
`/media/banner/<file>` — **not** `public/media/banner/<file>`. Vite serves
`public/` from the site root, so the `public/` prefix is not part of the URL and
including it 404s.

**Accepted formats:** JPG for photos, or WebP; PNG works; SVG works (including a
Figma export that wraps a raster). No transparency — the box is fully covered.

**A wrong path fails silently — but visibly.** `public/` is copied verbatim and
is **not verified at build time**, so a typo, a rename or a wrong extension gives
you a green `tsc`, a green `vite build`, and at runtime the token **gradient
fallback** shows through instead of your image. That gradient lives on the
`<img>` itself as its `background-image`, so a missing file degrades to the old
brand gradient rather than to a broken-image glyph. If the header suddenly looks
like a blue/violet gradient again, the path is wrong.

**Currently set to:** `imgbg01.webp` — 3515 × 843, 65.7 KB (lossy VP8). That is
3.1× the documented 1125 × 270 target, and the aspect (4.1696) still matches, so
`object-fit` has nothing to crop.

## ⚠️ The rotation defect SURVIVED the WebP conversion

Established in Gate 1c, and it is a **Figma re-export job**, not a code fix:

- `imgbg01.webp` vs `imgbg01.svg` rendered at 1125 × 270 → **Pearson r = 0.9987**,
  mean abs diff 4.54/765 across 6,118 sampled points. **The same image.**
- Against the Gate 1b rotated-slice prediction → **r = 0.952**. Still the same
  rotated band of the original 626 × 487 photo.
- Downscaling the WebP to 1125 × 270 and re-upscaling to 3515 × 843 reproduces
  the native file at **r = 0.9991**. So the extra resolution is empty — the
  3515-wide file carries **no detail beyond 1125**.

Net: the WebP is a ~3.1× rasterisation of the same defective SVG. It is 91.4%
smaller (783 KB → 65.7 KB) and visually identical, including the defect. Only
about **487 × 117 real source pixels** sit behind it, stretched across 3515 × 843.

`imgbg01.svg` has therefore been **kept on disk** for now, unwired, so the two
can be compared after a corrected Figma export. Delete it once that lands.
