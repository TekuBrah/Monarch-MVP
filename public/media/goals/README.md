# `public/media/goals/` — savings-goal photographs

Two images, one per `Goal` record in `src/data/goals.ts`. Vite copies `public/`
verbatim, so these are served from `/media/goals/<file>` with no import
statement and no bundler processing — the same arrangement `receipts`,
`transactions`, `academy`, `banner` and `profile` already use.

| file | goal |
|---|---|
| `goal_bali_trip.jpg` | `goal-bali-trip` |
| `goal_emergency_funds.jpg` | `goal-emergency-funds` |

## THESE ARE FIGMA'S OWN ARTWORK, NOT PLACEHOLDERS

Gate 75 seeded both filenames with no files behind them and recorded that Figma
carries photographs this repo had no source for (`Goal.image`: *"fabricating
artwork is not a build step"*). Gate 76 had Figma access and took the real image
fills out of the frame, so no placeholder was invented.

Provenance, so a later session can re-derive them rather than guess:

- file `v9MI8jxTaXiJA234Hkanlf`, frame `Finance_Plan` (`1266:14339`);
- the goal cards' image slots are `img/goal01` (`868:6834`) and `img/goal02`
  (`868:11743`), and their fills came back through `download_assets`' `rawImages`.

**THE NODE `export` RENDER IS USELESS HERE AND WAS TRIED FIRST.** Asking
`download_assets` for an export of either image slot returns a **blank white**
600x204 JPEG, and — the tell — the two nodes return a **byte-identical** file.
The photographs are image FILLS on a nested layer, which that export did not
rasterise. Use `rawImages`, not `export`.

## WHY 600 x 204, AND WHY THAT IS NOT OVERSUPPLY

`.mn-card-goals` is a hard `width: 200px` at every viewport and
`.mn-card-goals__image` is `height: 68px`, so the slot is **200 x 68 CSS px at
every width this app ships**. 600 x 204 is that slot at **DPR 3**, which is the
target device — `object-fit: cover` then has nothing to crop, because the file's
aspect ratio already equals the box's.

That is deliberate against the Gate 25 asset census, which found the academy PNG
shipping 128,696 bytes for a 221 x 152 render. Here:

| file | bytes | natural | rendered @DPR3 |
|---|---|---|---|
| `goal_bali_trip.jpg` | 34,628 | 600 x 204 | 600 x 204 |
| `goal_emergency_funds.jpg` | 17,960 | 600 x 204 | 600 x 204 |

**RE-CHECK THIS IF A GOAL IMAGE IS EVER SHOWN LARGER THAN THE CARD.** Gate 77's
goal detail screen is the first place that could happen; a full-bleed header
there would need a re-export from the Figma fills above, not an upscale of these.

## HOW THEY WERE PRODUCED

The raw fills are 960 x 686 (Bali) and 1081 x 772 (Emergency), both PNG, both
~1.4:1 — far taller than the 2.94:1 slot. Each was **centre-cropped to cover**
and encoded JPEG at quality 0.82 through a headless Chromium canvas, which
needed no new dependency. A centre crop is what `object-fit: cover` would have
done at render time anyway; doing it at build time is what removes the bytes
that would never have been painted.

## NO PLACEHOLDER AND NO FALLBACK

`goalImageUrl()` in `src/config/media.ts` owns the `/media/goals/` prefix so no
component writes a literal `/media/...` path, and it resolves a missing file to
a broken image rather than to a substitute. That is `receiptUrl()`'s rule for
`receiptUrl()`'s reason: a goal whose file is missing is a DATA DEFECT, and
`settleImages` in `e2e/harness.ts` fails the walk on `naturalWidth === 0` rather
than photographing an empty box.

## A PHOTO PICKER IS NOT HERE YET

`Goal.image` is a bare filename precisely so a future picker stores a reference
rather than a `blob:` that cannot survive the document that made it. That waits
for persistence's image storage, which lands after Flow 11.
