import { expect, test } from '@playwright/test'
import {
  ROUTES,
  TABBED_SCREENS,
  THEMES,
  WALK,
  finishAnimations,
  gotoState,
  stateTitle,
  type Theme,
} from './harness'

/**
 * THE SECTION-HEADER INVARIANT — the ruling on record, encoded.
 *
 * ALL SECTION HEADERS BIND text/subtle/default. Gate 6 found one that did not:
 * `HoldingDetailScreen` was hand-rolling its list heading as a bare
 * `<Label size="s">`, so it rendered text/default/default. Nothing swept for
 * it, so it survived in the codebase until a human happened to look. This file
 * is that sweep.
 *
 * TWO ASSERTIONS, and the second is the one that would have caught Gate 6:
 *
 *   1. POSITIVE — every `.mvp-section-header` carries `mn-label--subtle` and
 *      computes to the subtle text colour, in both themes.
 *
 *   2. BYPASS COUNT IS ZERO — no `.mn-label` exists outside a
 *      `.mvp-section-header` wrapper except the enumerated exceptions below.
 *      Assertion 1 alone can never catch a heading that escaped the component,
 *      because an escaped heading is not a `.mvp-section-header` and so is not
 *      in the set being checked.
 *
 * SCOPE — THE SWEEP IS TOTAL OVER RENDERED DOM, AND AS OF GATE 9 THE WALK
 * REACHES EVERY TAB STATE. Within a page this walk visits, nothing escapes:
 * `Label` is used by no other DS component (the DS's own source has `.mn-label`
 * in Label.tsx/.css/.test.tsx and nowhere else), so every `.mn-label` in the DOM
 * comes from an MVP call site and is either checked or explicitly excepted.
 *
 * Gate 7 walked ROUTES only, and tabs are in-screen `useState` rather than
 * routes, so two `SectionHeader` call sites behind the Homepage's Crypto tab —
 * HomepageCrypto.tsx "My Tokens" and "Featured Coin" — were never visited: 6
 * call sites in `src/`, 4 of them swept. `WALK` adds every non-default tab
 * state, so all 6 are now reached.
 *
 * GATE alpha ADDED THE OVERLAY AXIS, AND IT BUYS THE POSITIVE HALF NOTHING YET
 * — say so rather than claim the gap closed. `WALK` now visits the two
 * `HoldingDetailScreen` preset modals, so a heading inside an open modal WOULD
 * be swept. Measured, neither modal renders one: `ReminderModal` is a `Radio`
 * group and `StatementModal` a `Select`, and the fixed deposit's own screen
 * has no `.mvp-section-header` at all (`holdingFields` returns no `list` for
 * that type). The instance count below is therefore UNCHANGED by the two new
 * states, which is the prediction and not a failure.
 *
 * What the axis does buy here is the BYPASS half. An open modal is new
 * rendered DOM, and it was measured to add ZERO `.mn-label` outside
 * `SectionHeader` — no DS component other than the MVP's own call sites
 * renders one, `Radio` and `Select` included. That is now asserted on every
 * run rather than having been checked once.
 *
 * The remaining scope limit is narrower still, and worth naming: this sweeps
 * rendered DOM, so a heading behind in-screen state the walk does not open —
 * an expanded row, a menu, a modal not enumerated in `OVERLAY_STATES` — is
 * still only seen if that state happens to be open.
 */

/**
 * The subtle text colour, per theme.
 *
 * These are the resolved values of `--mapped-text-subtle-default`. They are
 * cross-checked at runtime against a freshly-inserted probe element (see
 * below), so a DS token change and a broken binding fail with different
 * messages instead of both reading as "the header is wrong".
 */
const SUBTLE: Record<Theme, string> = {
  light: 'rgb(107, 119, 134)',
  dark: 'rgb(134, 149, 167)',
}

/**
 * KNOWN-CORRECT `.mn-label` USES THAT ARE NOT SECTION HEADINGS.
 *
 * Encoded as exceptions rather than passed silently — the list is the record of
 * what was reviewed, and anything not on it fails. Each entry is the nearest
 * identifying ancestor of the allowed Label.
 */
const BYPASS_EXCEPTIONS: { selector: string; why: string }[] = [
  {
    selector: '.mvp-coming-soon',
    why: 'ComingSoon’s "Coming soon" status chip — a state chip, not a section heading',
  },
  {
    selector: '.mvp-finance__hero-head',
    why: 'HoldingHero card identity <header> row',
  },
  {
    selector: '.mvp-finance__networth-head',
    why: 'NetWorthCard card identity <header> row',
  },
  {
    selector: '.mvp-balance-card__identity',
    why: 'BalanceCard card identity <header> row',
  },
]

/**
 * Read the resolved token from a probe node inserted at assertion time.
 *
 * Verification discipline (CLAUDE.md): a fresh node has no transition to
 * freeze, so its computed colour cannot be a mid-flight value — which is
 * exactly the trap a themed page sets for anything read off a live element.
 */
async function probeSubtleToken(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--mapped-text-subtle-default)'
    document.body.appendChild(probe)
    const value = getComputedStyle(probe).color
    probe.remove()
    return value
  })
}

let totalHeaders = 0
/** Distinct heading texts seen, so the count can be DECOMPOSED, not just quoted. */
const headingsSeen = new Map<string, Set<string>>()

test.describe('section headers', () => {
  for (const theme of THEMES) {
    for (const state of WALK) {
      test(`${stateTitle(state)} [${theme}] headers bind text/subtle/default`, async ({
        page,
      }) => {
        await gotoState(page, state, theme)

        // Transitions must be finished before any transitioned property is
        // read, or the reading is a lie.
        await finishAnimations(page)

        expect(
          await probeSubtleToken(page),
          `--mapped-text-subtle-default moved in ${theme} — this is a DS token change, not a header defect`,
        ).toBe(SUBTLE[theme])

        // ---- 1. POSITIVE ------------------------------------------------
        const headers = await page
          .locator('.mvp-section-header')
          .evaluateAll((nodes) =>
            nodes.map((node) => {
              const label = node.querySelector('.mn-label')
              const text = node.querySelector('.mn-label__text')
              return {
                heading: text?.textContent ?? '(no .mn-label__text)',
                hasLabel: !!label,
                isSubtle: !!label?.classList.contains('mn-label--subtle'),
                color: text ? getComputedStyle(text).color : '(no text node)',
              }
            }),
          )

        totalHeaders += headers.length
        for (const header of headers) {
          const where = headingsSeen.get(header.heading) ?? new Set<string>()
          where.add(`${stateTitle(state)} [${theme}]`)
          headingsSeen.set(header.heading, where)
        }

        for (const header of headers) {
          expect(header.hasLabel, `"${header.heading}" renders no DS Label`).toBe(true)
          // COLOUR FIRST, class second. The ruling is "binds text/subtle/default";
          // `mn-label--subtle` is only the mechanism that delivers it. Reporting
          // the computed colour first means the failure names the rule that
          // broke, with the missing class as the corroborating detail.
          expect(
            header.color,
            `"${header.heading}" on ${stateTitle(state)} [${theme}] does not compute to the subtle text colour`,
          ).toBe(SUBTLE[theme])
          expect(
            header.isSubtle,
            `"${header.heading}" on ${stateTitle(state)} [${theme}] is missing mn-label--subtle`,
          ).toBe(true)
        }

        // ---- 2. BYPASS COUNT IS ZERO ------------------------------------
        const bypasses = await page.evaluate(
          (exceptions: string[]) =>
            Array.from(document.querySelectorAll('.mn-label'))
              .filter((el) => !el.closest('.mvp-section-header'))
              .filter((el) => !exceptions.some((sel) => el.closest(sel)))
              .map((el) => {
                const text = el.querySelector('.mn-label__text')?.textContent ?? ''
                const parent = el.parentElement
                const where = parent
                  ? `${parent.tagName.toLowerCase()}.${parent.className || '(no class)'}`
                  : '(detached)'
                return `"${text}" in ${where}`
              }),
          BYPASS_EXCEPTIONS.map((e) => e.selector),
        )

        expect(
          bypasses,
          `${stateTitle(state)} [${theme}]: DS Label rendered outside SectionHeader and outside the reviewed exception list.\n` +
            `Exceptions on record:\n` +
            BYPASS_EXCEPTIONS.map((e) => `  ${e.selector} — ${e.why}`).join('\n') +
            `\nIf one of these is a legitimate new use, add it to BYPASS_EXCEPTIONS with a reason. ` +
            `If it is a section heading, it belongs in <SectionHeader>.`,
        ).toEqual([])
      })
    }
  }

  test.afterAll(() => {
    const tabStates = WALK.filter((s) => s.tab).length
    const overlayStates = WALK.filter((s) => s.overlay).length
    console.log(
      `section-header sweep: ${totalHeaders} .mvp-section-header instance(s) checked across ` +
        `${WALK.length} walk state(s) (${ROUTES.length} route(s) + ${tabStates} non-default tab ` +
        `state(s) over ${TABBED_SCREENS.length} tabbed screen(s) + ${overlayStates} overlay ` +
        `state(s)) x ${THEMES.length} theme(s)`,
    )
    console.log(
      `distinct headings seen (${headingsSeen.size}):\n  ` +
        Array.from(headingsSeen.entries())
          .map(([heading, where]) => `"${heading}" — ${where.size} state/theme pair(s)`)
          .join('\n  '),
    )
  })

  test('the sweep is not vacuous', async ({ page }) => {
    // If no route rendered a header at all, every assertion above would pass by
    // checking nothing. The Homepage is the guaranteed floor.
    await gotoState(page, { route: '/', tab: null, overlay: null }, 'light')
    await expect(page.locator('.mvp-section-header').first()).toBeVisible()
    expect(await page.locator('.mvp-section-header').count()).toBeGreaterThan(0)
  })

  test('the tab axis is not vacuous', async ({ page }) => {
    // The whole point of Gate 9: at least one section header must be reachable
    // ONLY through a tab. If this ever passes by finding zero, the new coverage
    // is decorative and the two Crypto-tab call sites are unswept again.
    const homeTabs = TABBED_SCREENS.find((s) => s.route === '/')
    expect(homeTabs, 'the Homepage no longer parses as a tabbed screen').toBeTruthy()

    await gotoState(page, { route: '/', tab: null, overlay: null }, 'light')
    const onDefault = await page.locator('.mvp-section-header').count()

    const crypto = homeTabs!.tabs.find((t) => t.id !== homeTabs!.defaultTabId)!
    await gotoState(page, { route: '/', tab: crypto, overlay: null }, 'light')
    const onTab = await page.locator('.mvp-section-header').count()

    expect(
      onTab,
      `no .mvp-section-header renders on the Homepage's "${crypto.id}" tab — either the ` +
        `tab did not activate, or the headings moved and this check is now vacuous`,
    ).toBeGreaterThan(0)
    console.log(
      `tab axis: Homepage default tab renders ${onDefault} header(s); ` +
        `"${crypto.id}" tab renders ${onTab}`,
    )
  })
})
