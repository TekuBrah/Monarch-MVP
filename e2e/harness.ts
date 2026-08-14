import { expect, type Page } from '@playwright/test'
import { HOLDINGS } from '../src/data/holdings'

/**
 * Shared harness for the Gate 7 specs.
 *
 * Everything here is DERIVED, never transcribed. The route list comes from the
 * router source and the holdings data; the themes come from the app's own
 * toggle. A test that hardcodes what it is supposed to be checking is a test
 * that passes after the thing it checks has been deleted.
 */

/** The two themes `ThemeProvider` can be in. */
export const THEMES = ['light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

/**
 * EVERY REACHABLE ROUTE.
 *
 * Derived from `src/App.tsx`'s `<Routes>` table:
 *   index                          -> HomepageScreen
 *   "transfer"                     -> ComingSoon
 *   "finance"                      -> FinanceScreen
 *   "finance/holding/:holdingId"   -> HoldingDetailScreen
 *   "more"                         -> ComingSoon
 *   "steward"                      -> ComingSoon
 *
 * The parameterised one is expanded over `HOLDINGS` (src/data/holdings.ts)
 * rather than listed by hand: `HoldingDetailScreen` redirects any id it cannot
 * find to /finance, so a hand-written list would go quietly green the day a
 * holding is renamed. Add a tenth holding and this walk grows a route by
 * itself.
 *
 * WHAT IS DELIBERATELY NOT A ROUTE, and therefore not walked here: the
 * Homepage's four tabs and the Finance screen's five. Those are in-screen
 * `useState`, by Flow 1 §3 and Flow 7 B7 — the URL never changes — so this
 * walk sees each screen in its DEFAULT tab ('accounts' on the Homepage). That
 * is a known limit of a route walk, not an oversight.
 */
export const ROUTES: string[] = [
  '/',
  '/transfer',
  '/finance',
  ...HOLDINGS.map((h) => `/finance/holding/${h.id}`),
  '/more',
  '/steward',
]

/**
 * The app's notion of "now", pinned.
 *
 * `src/data/today.ts` computes `TODAY = new Date()` AT MODULE LOAD, and the
 * fixed deposit's dates, the remaining-tenure count and the net-worth chart's
 * series length are all offsets from it. Left alone, every one of those changes
 * daily and no screenshot baseline could survive a night.
 *
 * 2026-08-15T09:41:00+08:00 — the 15th so the month-to-date chart has a real
 * series rather than one point, and 09:41 to agree with the `StatusBar` time
 * the screens draw. Expressed as a UTC instant so it does not depend on the
 * machine's zone; the browser's zone is pinned to Asia/Kuala_Lumpur in
 * playwright.config.ts.
 *
 * `setFixedTime` rather than `clock.install()` ON PURPOSE: install() also fakes
 * timers, which would put React's scheduler on a clock nothing advances.
 */
export const PINNED_NOW = new Date('2026-08-15T01:41:00.000Z')

/**
 * Console lines that are the dev server talking, not the app failing.
 *
 * THIS LIST IS THE WHOLE ALLOWLIST. Anything else on `console.error` or
 * `console.warn` fails the route walk. Keep it this short — every entry added
 * here is a class of message the suite stops being able to see.
 */
export const CONSOLE_ALLOWLIST: RegExp[] = [
  // Vite's HMR client handshake, printed on every dev-mode page load.
  /^\[vite\] connecting\.\.\.$/,
  /^\[vite\] connected\.$/,
  // React's development-build nag. Not the app's, and not suppressible.
  /Download the React DevTools/i,
]

/**
 * Requests allowed to fail.
 *
 * `/favicon.ico` — index.html declares no icon, so Chromium asks for one and
 * the dev server 404s. Recorded rather than fixed: Gate 7 is infrastructure and
 * does not touch app files. This is a real (cosmetic) gap, logged as a finding.
 */
export const NETWORK_ALLOWLIST: RegExp[] = [/\/favicon\.ico$/]

export interface PageProblems {
  console: string[]
  network: string[]
}

/**
 * Attaches console + network recorders BEFORE any navigation.
 *
 * Order matters: a listener attached after `goto` misses module-evaluation
 * errors, which are the ones worth catching.
 */
export function watchForProblems(page: Page): PageProblems {
  const problems: PageProblems = { console: [], network: [] }

  page.on('console', (msg) => {
    const type = msg.type()
    if (type !== 'error' && type !== 'warning') return
    const text = msg.text()
    if (CONSOLE_ALLOWLIST.some((re) => re.test(text))) return
    problems.console.push(`[${type}] ${text}`)
  })

  // An uncaught exception never reaches console.error via CDP in every case,
  // so it is recorded separately and counted with the console failures.
  page.on('pageerror', (err) => {
    problems.console.push(`[pageerror] ${err.message}`)
  })

  page.on('requestfailed', (req) => {
    const url = req.url()
    if (NETWORK_ALLOWLIST.some((re) => re.test(url))) return
    problems.network.push(`FAILED ${req.method()} ${url} — ${req.failure()?.errorText}`)
  })

  page.on('response', (res) => {
    if (res.status() < 400) return
    const url = res.url()
    if (NETWORK_ALLOWLIST.some((re) => re.test(url))) return
    problems.network.push(`HTTP ${res.status()} ${url}`)
  })

  return problems
}

/**
 * The harness's own honesty check.
 *
 * If either of these is wrong, nothing measured in this run means anything —
 * the viewport or the DPR was overridden somewhere between the config and the
 * browser. Asserted per route rather than once, because `deviceScaleFactor` is
 * a context property and a spec that opens its own context can lose it.
 */
export async function assertHarnessIsHonest(page: Page): Promise<void> {
  const actual = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    dpr: window.devicePixelRatio,
  }))
  expect(
    actual,
    'harness guard: viewport/DPR were not applied — every measurement in this run is untrustworthy',
  ).toEqual({ clientWidth: 375, dpr: 2 })
}

/**
 * Navigate to a route in a given theme, with time pinned and fonts settled.
 *
 * THEME IS SET THROUGH THE APP'S OWN TOGGLE, not by writing `data-theme` on
 * <html> directly. `ThemeProvider` owns that attribute and rewrites it from
 * React state; a test that pokes the DOM would be verifying a state the app
 * does not think it is in.
 */
export async function gotoRoute(page: Page, route: string, theme: Theme): Promise<void> {
  // Must precede navigation — `TODAY` is evaluated when the module loads.
  await page.clock.setFixedTime(PINNED_NOW)

  await page.goto(route, { waitUntil: 'networkidle' })

  if (theme === 'dark') {
    // The shell's demo affordance. Its label reads "Dark" while the app is in
    // light mode, which is also the assertion that it is the right button.
    const toggle = page.locator('.mvp-shell__theme-switch button')
    await expect(toggle).toHaveText('Dark')
    await toggle.click()
  }

  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    theme === 'dark' ? 'dark' : '',
  )

  // Poppins is loaded by src/main.tsx (@fontsource). Measuring or
  // screenshotting before the faces resolve reads the sans-serif fallback.
  await page.waitForFunction(() => document.fonts.status === 'loaded')
}
