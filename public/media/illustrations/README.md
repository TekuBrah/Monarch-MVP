# Illustrations

Decorative artwork drawn by the app's own surfaces (not a transaction mark, not a promotion). Resolved by
`illustrationUrl` in `src/config/media.ts`. Gate 103, R103-12.

## `shield.png` — the high-risk alert's education overlay (Gate 103)

| | |
|---|---|
| file | `shield.png` |
| dimensions | **512 x 512**, RGBA (PNG colour type 6), transparent corners |
| bytes | 15,841 |
| sha256 | `f0e45047a4830a63e3cc76f1315fa99e36993d730c4ba106aaf4df74cf8e1678` |
| visible art | (68, 55)–(494, 468), i.e. 426 x 413 px |
| consumer | `HighRiskTransferAlert.tsx`, the education view (Figma `1266:14383`, image node `895:8677`) |
| rendered | 82 x 82 CSS px, so the visible art is 68.23 x 66.15 CSS px — **6.24x** source px per CSS px |

**PROVENANCE — Decision 37 (Teku, Nov 2026): Teku's own export of the shield and sparkle**, supplied after Gate 103's
first Phase A found the Figma fill to be a 1.92x crop of a mockup. Committed exactly as given: not re-encoded,
cropped or resized (byte-identical to `D:\Claude\_assets\shield\shield-512.png`). Its original name was
`shield-512.png`; only the name changed.

**DECORATIVE**, so `alt=""`. The words beside it carry the meaning.

**FRAMING (R103-13).** Figma's 81 x 80 slot shows the art at (10.42, 7.81), 68.24 x 66.15. An 82 x 82 square centred
on the slot reproduces that to within 0.03 px; see `transfer.css`.

**DARK MODE — measured, no white outline shows.** The gap between the sparkle and the shield is a TRANSPARENT
cut-out in the artwork, not a white stroke, so on the dark card it reads as the card surface. Rendered at 375, DPR 2:
0 near-white pixels in the 60 x 50 device-px region around the sparkle in dark, 1,900 in light (the white card).
