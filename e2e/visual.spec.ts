import { expect, test } from '@playwright/test'
import { ROUTES, THEMES, assertHarnessIsHonest, gotoRoute } from './harness'

/**
 * VISUAL BASELINES — one full-page screenshot per route per theme.
 *
 * Before Gate 7 there was no screenshot capability at all, so a visual
 * regression could only be found by a human noticing it. These baselines are
 * committed deliberately (see .gitignore — `test-results/` and
 * `playwright-report/` are ignored, `*-snapshots/` is not).
 *
 * AN UNEXPLAINED BASELINE CHANGE IS A FINDING, NOT A CHORE. The update path is
 * `npm run test:e2e:update`, and it is for changes you intended and can name.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS NON-DETERMINISTIC HERE, AND HOW EACH IS HANDLED
 *
 * 1. THE CLOCK — handled by PINNING, not masking. `src/data/today.ts` sets
 *    `TODAY = new Date()` at module load, and three separate things derive from
 *    it: the fixed deposit's start/maturity dates and remaining tenure
 *    (`derive.ts`), and the net-worth chart's series length + x-axis domain
 *    (one point per ELAPSED day of the current month). Masking all of that
 *    would blank out most of two screens; `page.clock.setFixedTime()` in
 *    harness.ts freezes it instead, so the pixels stay real.
 *
 * 2. ANIMATIONS — `animations: 'disabled'` in playwright.config.ts, which
 *    Playwright applies by fast-forwarding finite animations to their end state
 *    and freezing infinite ones at their first frame.
 *
 * 3. THE CARET — `caret: 'hide'`, so a blinking text cursor cannot land in a
 *    frame.
 *
 * 4. WEBFONTS — `document.fonts.status === 'loaded'` is awaited in
 *    `gotoRoute()`. Poppins comes from @fontsource via src/main.tsx, and a
 *    screenshot taken mid-load records the sans-serif fallback.
 *
 * NOTHING IS MASKED. Every region on these screens is deterministic once the
 * clock is pinned — there is no live ticker, no random data and no network
 * content in the app. A `mask` list is deliberately absent rather than empty:
 * masking is how a baseline quietly stops covering the thing it names.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** `/finance/holding/wallet-marg` -> `finance-holding-wallet-marg`. */
function slug(route: string): string {
  return route === '/' ? 'index' : route.replace(/^\//, '').replace(/\//g, '-')
}

test.describe('visual baselines', () => {
  for (const theme of THEMES) {
    for (const route of ROUTES) {
      test(`${route} [${theme}]`, async ({ page }) => {
        await gotoRoute(page, route, theme)
        await assertHarnessIsHonest(page)

        await expect(page).toHaveScreenshot(`${slug(route)}-${theme}.png`, {
          fullPage: true,
        })
      })
    }
  }
})
