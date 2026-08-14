import { expect, test } from '@playwright/test'
import {
  ROUTES,
  THEMES,
  assertHarnessIsHonest,
  gotoRoute,
  watchForProblems,
} from './harness'

/**
 * THE ROUTE WALK — every reachable route, in both themes, clean.
 *
 * "Clean" is three things, and all three are hard failures:
 *   - zero console errors AND zero console warnings (allowlist in harness.ts;
 *     it is three entries long and every one of them is the dev server or
 *     React's dev build talking, never the app)
 *   - zero failed network requests
 *   - the harness's own viewport/DPR guard
 *
 * THE GUARD IS THE POINT OF THE WHOLE FILE. Gates 1–6 measured through an
 * uncontrolled devicePixelRatio and one inertness proof came out ambiguous
 * because of it. `deviceScaleFactor: 2` in playwright.config.ts is a claim; the
 * assertion below is the check on the claim. Set it to 1 and this fails, which
 * is exactly the behaviour that makes the pin worth anything.
 */

test.describe('route walk', () => {
  test('the derived route list is not empty', () => {
    // A vacuous walk is the failure mode a data-derived list invites: if
    // HOLDINGS ever came back empty, every test below would pass by looping
    // zero times.
    expect(ROUTES.length).toBeGreaterThanOrEqual(6)
    expect(new Set(ROUTES).size).toBe(ROUTES.length)
    console.log(`route walk covers ${ROUTES.length} route(s):\n  ${ROUTES.join('\n  ')}`)
  })

  for (const theme of THEMES) {
    for (const route of ROUTES) {
      test(`${route} [${theme}] renders clean`, async ({ page }) => {
        const problems = watchForProblems(page)

        await gotoRoute(page, route, theme)
        await assertHarnessIsHonest(page)

        // Something must actually have rendered. Without this the checks above
        // would pass on a blank page.
        await expect(page.locator('.mvp-shell__main')).not.toBeEmpty()

        expect(problems.console, `console output on ${route} [${theme}]`).toEqual([])
        expect(problems.network, `network failures on ${route} [${theme}]`).toEqual([])
      })
    }
  }
})
