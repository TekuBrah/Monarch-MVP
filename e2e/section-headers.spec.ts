import { expect, test } from '@playwright/test'
import { ROUTES, THEMES, gotoRoute, type Theme } from './harness'

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
 * SCOPE — THE SWEEP IS TOTAL OVER RENDERED DOM, NOT OVER THE APP. Within a page
 * this walk visits, nothing escapes: `Label` is used by no other DS component
 * (the DS's own source has `.mn-label` in Label.tsx/.css/.test.tsx and nowhere
 * else), so every `.mn-label` in the DOM comes from an MVP call site and is
 * either checked or explicitly excepted. But the walk only reaches each screen
 * in its DEFAULT tab, and tabs are in-screen `useState`, not routes. Two
 * SectionHeader call sites therefore sit behind the Homepage's Crypto tab and
 * are NEVER visited: HomepageCrypto.tsx:89 "My Tokens" and :115 "Featured Coin".
 * 6 call sites exist in `src/`; this sweep sees 4 of them.
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

test.describe('section headers', () => {
  for (const theme of THEMES) {
    for (const route of ROUTES) {
      test(`${route} [${theme}] headers bind text/subtle/default`, async ({ page }) => {
        await gotoRoute(page, route, theme)

        // Transitions must be finished before any transitioned property is
        // read, or the reading is a lie. The try/catch is load-bearing: an
        // infinite animation throws on .finish() and would abort the rest.
        await page.evaluate(() => {
          document.getAnimations().forEach((a) => {
            try {
              a.finish()
            } catch {
              /* infinite animations cannot finish; skip, do not abort */
            }
          })
        })

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
          expect(header.hasLabel, `"${header.heading}" renders no DS Label`).toBe(true)
          // COLOUR FIRST, class second. The ruling is "binds text/subtle/default";
          // `mn-label--subtle` is only the mechanism that delivers it. Reporting
          // the computed colour first means the failure names the rule that
          // broke, with the missing class as the corroborating detail.
          expect(
            header.color,
            `"${header.heading}" on ${route} [${theme}] does not compute to the subtle text colour`,
          ).toBe(SUBTLE[theme])
          expect(
            header.isSubtle,
            `"${header.heading}" on ${route} [${theme}] is missing mn-label--subtle`,
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
          `${route} [${theme}]: DS Label rendered outside SectionHeader and outside the reviewed exception list.\n` +
            `Exceptions on record:\n` +
            BYPASS_EXCEPTIONS.map((e) => `  ${e.selector} — ${e.why}`).join('\n') +
            `\nIf one of these is a legitimate new use, add it to BYPASS_EXCEPTIONS with a reason. ` +
            `If it is a section heading, it belongs in <SectionHeader>.`,
        ).toEqual([])
      })
    }
  }

  test.afterAll(() => {
    console.log(
      `section-header sweep: ${totalHeaders} .mvp-section-header instance(s) checked across ` +
        `${ROUTES.length} route(s) x ${THEMES.length} theme(s)`,
    )
  })

  test('the sweep is not vacuous', async ({ page }) => {
    // If no route rendered a header at all, every assertion above would pass by
    // checking nothing. The Homepage is the guaranteed floor.
    await gotoRoute(page, '/', 'light')
    await expect(page.locator('.mvp-section-header').first()).toBeVisible()
    expect(await page.locator('.mvp-section-header').count()).toBeGreaterThan(0)
  })
})
