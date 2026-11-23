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

## `academy-mark.svg` — the Academy level cards' watermark (Gate 109)

| | |
|---|---|
| file | `academy-mark.svg` |
| dimensions | **111 x 75.5646** (its own `width` / `height` attributes; viewBox the same) |
| bytes | 862 |
| sha256 | `327ca0ff782e41d271c34da5618dce8cc0fc2084e243f9f0a79c52e59baef8a9` |
| consumer | `AcademyScreen.tsx`, both level cards (Figma `1266:14274` and `1266:14275`, vector `Group 279`, `logo_monarch_L`) |
| rendered | at its own size, 20 % opacity, `mix-blend-mode: overlay`, 12 from the card's top and 10 from its left |

**PROVENANCE: the vector exactly as the Figma remote connector serves it** for `Group 279` (read 20 Nov 2026),
saved byte for byte. White fill (`fill="white"`). The DS has no white Monarch mark at this size; the Gate 109 record
carries that as a fork for Teku (ship the Figma vector here, or add a mark to the DS).

**DECORATIVE**, so `alt=""`.

## `spotlight-budgets.png` — the New Feature Spotlight picture (Gate 109)

| | |
|---|---|
| file | `spotlight-budgets.png` |
| dimensions | **384 x 832**, RGB (PNG colour type 2, 8 bit), no alpha |
| bytes | 179,194 |
| sha256 | `92b418e934869422e3a046111baf31bdd637f3a68a8f41fa15cb36d929152aef` |
| consumer | `AcademyScreen.tsx`, the App Guide's "New Feature Spotlight" card (Figma `1266:14274`) |
| rendered | 128 CSS px wide (`--brand-scale-1600`), so 384 device px at DPR 3 — **exactly 3x**, no oversupply |

**PROVENANCE — Decision 48: a screenshot of Monarch's own Budget tab**, taken by the census harness (Gate 109
Phase A2, 20 Nov 2026) at 375 x 812, DPR 3, light theme, with the harness clock pinned to 15 Aug 2026 and the seed
data: `/finance` with the Budget tab selected through its own control, animations finished, pointer parked.
No device frame. It shows the Monarch Budget and Entertainment cards, Add New Budget, the FAB and the nav bar.

**RESAMPLED (R109-5, 21 Nov 2026).** The 1125 x 2436 capture (678,643 bytes, sha256 `f6b53457…ab226`) was reduced to
**384 x 832** with Lanczos (`sharp` 0.35.5, `kernel: 'lanczos3'`, `fit: 'fill'`), no sharpening and no crop; the aspect
is 0.4615 against the capture's 0.4618 (832 against 831.5, within 1 px). The `pHYs` density chunk was removed, so the
file holds only `IHDR`, `IDAT` and `IEND`. 128 CSS px x DPR 3 = 384, so the file is the size the slot needs at the
largest device pixel ratio the harness measures; a 4x display would see a slight upscale. Re-capture at 1125 x 2436 and
resample again if the Budget tab's design changes.

**DECORATIVE**, so `alt=""`: the card's own line, "Introducing budgets", says what it shows.

**IT DOES NOT FOLLOW THE APP.** It is a picture of the seed's Budget tab on 15 Aug 2026; a tester who edits their
budgets sees different figures on the real tab. Re-capture it if the Budget tab's design changes.
