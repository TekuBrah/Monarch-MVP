import { expect, test } from '@playwright/test'
import {
  ROUTES,
  TABBED_SCREENS,
  THEMES,
  WALK,
  assertHarnessIsHonest,
  assertOverlayMatchesState,
  assertTabEnumerationMatchesDom,
  expectedTabIds,
  gotoState,
  stateTitle,
  watchForProblems,
} from './harness'

/**
 * THE WALK — every reachable route, every tab state of every route, in both
 * themes, clean.
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
 *
 * GATE 9 added the tab axis. Until then this walk saw each screen in its
 * DEFAULT tab only, because tabs are `useState` and never reach the URL — so a
 * console error on the Crypto tab was invisible to a green suite.
 */

test.describe('route walk', () => {
  test('the derived walk is not empty', () => {
    // A vacuous walk is the failure mode a data-derived list invites: if
    // HOLDINGS ever came back empty, every test below would pass by looping
    // zero times.
    expect(ROUTES.length).toBeGreaterThanOrEqual(6)
    expect(new Set(ROUTES).size).toBe(ROUTES.length)

    // Same floor for the tab axis. Two tabbed screens are on record (the
    // Homepage and Finance); if the parse ever returns none, the tab coverage
    // this gate bought would evaporate without a single test failing.
    expect(
      TABBED_SCREENS.length,
      'zero tabbed screens parsed out of the router — the derivation is broken, ' +
        'and the tab coverage is silently gone',
    ).toBeGreaterThanOrEqual(2)
    expect(WALK.length).toBeGreaterThan(ROUTES.length)
    // THE OVERLAY IS PART OF A STATE'S IDENTITY, so it is part of this key.
    // Gate alpha's two overlay states sit on a route that is already walked with
    // `tab: null`; without the overlay term all three would collapse to one key
    // and this uniqueness check would fail on a correct walk.
    expect(
      new Set(WALK.map((s) => `${s.route}#${s.tab?.id ?? ''}#${s.overlay?.id ?? ''}`)).size,
    ).toBe(WALK.length)

    console.log(
      `walk covers ${WALK.length} state(s) over ${ROUTES.length} route(s):\n  ` +
        WALK.map(stateTitle).join('\n  '),
    )
    console.log(
      `tabbed screens (derived from source):\n  ` +
        TABBED_SCREENS.map(
          (s) =>
            `${s.route} <- ${s.source} (${s.constName}, ${s.tabs.length} tabs: ` +
            `${s.tabs.map((t) => t.id).join(', ')}; default "${s.defaultTabId}")`,
        ).join('\n  '),
    )
  })

  for (const theme of THEMES) {
    for (const state of WALK) {
      test(`${stateTitle(state)} [${theme}] renders clean`, async ({ page }) => {
        const problems = watchForProblems(page)

        await gotoState(page, state, theme)
        await assertHarnessIsHonest(page)

        // The parse-vs-DOM cross-check. Runs on every state, including the
        // ones with no tabs at all — a tab bar appearing on a screen the parse
        // thinks has none fails here, which is what keeps a source-text
        // derivation honest.
        await assertTabEnumerationMatchesDom(page, state)

        // The same cross-check for the overlay axis, in both directions: the
        // declared overlay is open, or — on the 21 states that declare none —
        // nothing is.
        await assertOverlayMatchesState(page, state)

        // Something must actually have rendered. Without this the checks above
        // would pass on a blank page.
        await expect(page.locator('.mvp-shell__main')).not.toBeEmpty()

        // On a tab state, the requested tab must be the selected one — proof
        // that the panel below is the one this test claims to be walking.
        if (state.tab) {
          await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveAttribute(
            'id',
            `tab-${state.tab.id}`,
          )
          expect(expectedTabIds(state.route)).toContain(state.tab.id)
        }

        expect(
          problems.console,
          `console output on ${stateTitle(state)} [${theme}]`,
        ).toEqual([])
        expect(
          problems.network,
          `network failures on ${stateTitle(state)} [${theme}]`,
        ).toEqual([])
      })
    }
  }
})
