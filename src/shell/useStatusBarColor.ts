import { useEffect } from 'react'
import type { StatusBarSurface } from './chrome'
import type { Theme } from '../theme/ThemeProvider'

/**
 * ================================================================
 * THE ANDROID STATUS STRIP — COLOUR, BECAUSE COLOUR IS THE CEILING
 * ================================================================
 *
 * WHAT ANDROID ACTUALLY PERMITS, established at Gate 44-B against the
 * documentation rather than assumed:
 *
 *   (i)   genuinely transparent, artwork visible through it  — NOT POSSIBLE
 *   (ii)  a flat colour matched to what is below it          — THE CEILING
 *   (iii) neither; a solid theme colour is all there is      — too pessimistic
 *
 * (i) is refused three separate ways and no combination of them helps.
 * `theme_color`'s alpha channel is discarded — MDN: "Browsers may ignore the
 * alpha component of the color based on the context. In most environments,
 * `theme_color` cannot be transparent." Chrome's own edge-to-edge work reaches
 * the BOTTOM only — "From Chrome 135, the viewport is allowed to extend into
 * Android's gesture navigation bar", with nothing granted at the top. And
 * `display: standalone` is defined as keeping Chrome's own strip: web.dev's PWA
 * guidance, "a standalone PWA experience will create a standard screen that
 * keeps the status bar visible".
 *
 * `display: fullscreen` WOULD hand over the region and is the wrong trade: it
 * removes the clock, signal and battery entirely, and Chromium then forces the
 * bars black regardless of the manifest. The design wants a status bar; it
 * wants it not to be duplicated.
 *
 * SO THE INSET IS 0 ON ANDROID, AND TWO THINGS FOLLOW. The status-bar spacer in
 * `src/index.css` floors at its natural height instead of collapsing (that is
 * the other half of this gate), and `.mn-header-bg::before` — the
 * `surface/Overlay/default` scrim Figma paints over the status row — is INERT
 * here, because it is sized to the inset and the inset is zero. It is kept, not
 * deleted: it is correct and live wherever the region IS granted, which is
 * every edge-to-edge iOS install.
 *
 * ---------------------------------------------------------------
 * WHY THE COLOUR CANNOT BE ONE VALUE
 * ---------------------------------------------------------------
 *
 * The strip abuts viewport y=0, so it is continuous only with whatever that
 * route paints there — and this app paints two different things. Two routes
 * (`/`, `/finance`) put `HeaderBg`'s photograph at y=0; the other twelve put
 * the page surface there, which dark-flips. A single value is therefore wrong
 * on 12 of 14 routes whichever one is chosen, which is why this reads
 * `chromeFor().statusBar` rather than shipping a constant.
 *
 * ---------------------------------------------------------------
 * NOTHING HAPPENS IN A BROWSER TAB — BY CONSTRUCTION
 * ---------------------------------------------------------------
 *
 * The whole effect is behind `matchMedia('(display-mode: standalone)')`. In a
 * tab that is false, no write occurs, and the static `#0358cc` in `index.html`
 * stands exactly as it did. That matters beyond tidiness: on Android a tab's
 * `theme-color` tints the BROWSER toolbar, so writing a page-surface white
 * there would repaint Chrome's own chrome on every route change.
 *
 * It also means the visual suite cannot see any of this. `matchMedia` is false
 * under Playwright — measured — so zero baselines can move, and zero can
 * confirm it either. The geometry half is verifiable by substituting the
 * `env()`; this half is not verifiable off-device at all.
 */

/**
 * The photograph's own colour at the seam.
 *
 * MEASURED, NOT PICKED, and the method is the point. `.mn-header-bg__content`
 * was hidden with `visibility: hidden` (which preserves layout exactly), the
 * animations finished, and the top CSS row of the rendered header captured at
 * DPR 2 through a Playwright-launched Chromium and decoded via
 * `createImageBitmap` + `OffscreenCanvas` — the same instrument Gate 31 used on
 * the gradient cards. The mean of that row:
 *
 *     375 (Figma's authoring width)  rgb(26, 35, 81)  #1a2351
 *     430                            rgb(28, 36, 80)  #1c2450
 *
 * Two channels apart, so one value serves both; 375 wins because Figma authors
 * this app exclusively at 375. `/` and `/finance` measured IDENTICAL at each
 * width — they share one artwork through one `HeaderBg` slot — which is why
 * this is one constant and not two.
 *
 * IT IS A LITERAL AND NO TOKEN CAN BACK IT. It is a pixel out of a photograph,
 * not a palette value: nothing in the DS ramp is `#1a2351` and nothing should
 * be. `scripts/check-tokens.mjs` DOES scan this file — `SCAN_DIRS = ['src']`
 * and `.ts` is in `EXTS` — so it is flagged and carries a same-line
 * `token-exempt` marker, which is the honest outcome. It is the THIRD exemption
 * in the tree, where there were two.
 *
 * THE SEAM IS SOFTENED, NOT ERASED, AND THAT IS THE CEILING'S REAL COST. The
 * row this averages is not flat — it spans rgb(0,8,20) to rgb(159,148,177) —
 * so a flat strip matches it on average and visibly diverges wherever the
 * photograph is bright. White system glyphs are safe on it either way: contrast
 * against the mean is 14.97:1.
 */
const STATUS_BAR_ARTWORK = '#1a2351' /* token-exempt: sampled from the header photograph's top row, not a palette value — see above */

/**
 * `--mapped-surface-page` as the document currently resolves it.
 *
 * READS THE TOKEN RATHER THAN RESTATING ITS TWO HEX VALUES, so the page branch
 * dark-flips for free and cannot drift from what `body` actually paints.
 * `getPropertyValue` on a custom property returns it fully substituted —
 * measured, `#ffffff` in light and `#000000` in dark, not `var(--alias-…)`.
 *
 * THIS IS ONLY CORRECT BECAUSE `ThemeProvider` USES A LAYOUT EFFECT, AND IT WAS
 * NOT, UNTIL THIS GATE. React runs a child's passive effect before its parent's,
 * and that provider wraps the whole app — so with a passive effect there it
 * still held the previous theme's attribute when this read. Measured on
 * `/more`: light -> dark gave `#ffffff` and dark -> light gave `#000000`, each
 * exactly one flip stale. See the note on that effect for why a probe element
 * here could not have fixed it — the DS's light values live on bare `:root`, so
 * a descendant can be stamped INTO dark but never back out of it.
 *
 * `theme` is therefore a dependency rather than an input: it is what makes this
 * re-run, and the value itself comes from the document.
 */
function pageSurface(): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--mapped-surface-page')
    .trim()
}

/**
 * Paint the platform's status strip to match what this route puts beneath it.
 *
 * `theme` is a parameter rather than a `useTheme()` call inside, so the
 * dependency that makes the page-surface branch re-read on a theme flip is
 * visible in the signature instead of hidden in a hook call.
 */
export function useStatusBarColor(surface: StatusBarSurface, theme: Theme): void {
  useEffect(() => {
    if (!window.matchMedia('(display-mode: standalone)').matches) return

    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) return

    const next = surface === 'artwork' ? STATUS_BAR_ARTWORK : pageSurface()

    if (next) meta.setAttribute('content', next)

    // No cleanup. Every path that could change `surface` or `theme` re-runs
    // this and overwrites, and standalone is not a mode a running document
    // leaves — so restoring the previous value would only add a second write
    // to every route change.
  }, [surface, theme])
}
