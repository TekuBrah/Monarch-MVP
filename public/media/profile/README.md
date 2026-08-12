# `public/media/profile/` — profile picture

Drop a file in here and reference it from `src/config/media.ts`. Nothing else
needs editing: `public/` is copied verbatim by Vite, so a new file is live on
refresh with no import statement anywhere.

| | |
|---|---|
| **Aspect ratio** | **1:1 — square.** Non-negotiable, see below. |
| **Rendered box** | 32 × 32 CSS px |
| **Supply at** | **64 × 64** (2×) minimum; 96 × 96 (3×) is safer |
| **Format** | JPG or PNG. WebP works. Transparency not needed |
| **Placeholder** | `placeholder.svg` (64 × 64) |

## Where the numbers came from

Measured, not guessed — `getBoundingClientRect()` on `.mn-header-bg .mn-avatar`
in the running app at viewport 375 × 812, `devicePixelRatio` 2, on **both**
`/` (Homepage) and `/finance`:

```
width: 32   height: 32   border-radius: 50%   overflow: hidden   aspect: 1.0000
```

Both routes measure identically because `HeaderBg` hard-codes `<Avatar size="m">`
in every variant — it is not a prop. The 32 traces to DS `Avatar.css`:

```css
.mn-avatar--m { width: var(--brand-scale-800);  /* 32px */ }
```

So the box is token-derived, and it changes only if `--brand-scale-800` changes.

**2× / 3× recommendation** comes from the measured `devicePixelRatio` of 2 on
this machine — a 32 × 32 source would be visibly soft on any retina display.

## Why square is non-negotiable

DS `Avatar.css` applies `object-fit: cover` to the `<img>` inside a
`border-radius: 50%` / `overflow: hidden` box. A non-square source is therefore
**centre-cropped to a circle**, silently. Faces near an edge get cut. Crop to a
centred square before dropping the file in.

## Accessibility note

`Avatar` derives its `alt` as `alt ?? name ?? ''`, and `HeaderBg` passes
`avatarName` but exposes no `avatarAlt` prop. The alt text is therefore whatever
`avatarName` is set to at the call site (`"Margaret"` today) — it does **not**
come from `media.ts`, and there is nothing to set here.

---

## How to use

1. **Drop the file into this folder** — `public/media/profile/`.
2. **Edit one line** in [`src/config/media.ts`](../../../src/config/media.ts), in
   the `ACTIVE_MEDIA` constant near the top:

   ```ts
   profile: '/media/profile/your-file.jpg',
   ```

3. **Refresh.** That is the whole workflow — no import statement, no rebuild
   step, no component change.

**The path is a URL, not a filesystem path.** It is
`/media/profile/<file>` — **not** `public/media/profile/<file>`. Vite serves
`public/` from the site root, so the `public/` prefix is not part of the URL and
including it 404s.

**Accepted formats:** JPG or PNG for photos; WebP works; SVG works (including a
Figma export that wraps a raster). Transparency is not needed — the box is
circular via `border-radius` and `overflow: hidden`, not via the alpha channel.

**A wrong path fails silently.** `public/` is copied verbatim and is **not
verified at build time**, so a typo, a rename or a wrong extension produces a
green `tsc`, a green `vite build`, and a broken image at runtime — the avatar
falls back to nothing rather than to the placeholder, because the placeholder is
only used when the slot is *unset* in `ACTIVE_MEDIA`, not when its file is
missing. Set the slot to `null` (or delete the line) to get the placeholder back
deliberately.

**Currently set to:** `user_margaret.webp` — 200 × 200, 1.8 KB (lossy VP8, no
alpha). Square, so no crop. 200 is 3.1× the documented 64 × 64 target and
comfortably over the 64 device px the box needs at dpr 2 — oversized rather than
soft, which is the right way round.

The superseded `user_margaret.svg` (115 KB, a 64 × 64 frame wrapping a 319 × 313
raster) was deleted in Gate 1c. Verified equivalent first: Pearson r = 0.9986
against the WebP, mean abs diff 5.51/765 per pixel.
