import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page } from '@playwright/test'
import { HOLDINGS } from '../src/data/holdings'

/**
 * Shared harness for the Gate 7 specs, extended at Gate 9 to cover tab state.
 *
 * Everything here is DERIVED, never transcribed. The route list comes from the
 * router source and the holdings data; the tab list comes from the screen
 * sources; the themes come from the app's own toggle. A test that hardcodes
 * what it is supposed to be checking is a test that passes after the thing it
 * checks has been deleted.
 */

/** The two themes `ThemeProvider` can be in. */
export const THEMES = ['light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

/* ═══════════════════════════════════════════════════════════════════════════
   SOURCE DERIVATION
   ═══════════════════════════════════════════════════════════════════════════

   Gate 7 derived ROUTES from the router by READING App.tsx and transcribing
   the result into a literal. Gate 9 needs the same trick for tabs, and a
   transcribed tab list has exactly the failure mode CLAUDE.md names for a
   transcribed route list: it goes quietly green the day a tab is renamed.

   So the router table and the tab tables are both PARSED from source at
   collection time. Playwright generates its test list synchronously, before a
   browser exists, so a runtime enumeration (asking the DOM what tabs it has)
   cannot produce the test list — but it CAN check it, and it does:
   `assertTabEnumerationMatchesDom` compares this parse against the rendered
   `[role="tab"]` set on every route in the walk. A parse that drifts fails
   loudly there rather than silently shrinking the suite.
   ═══════════════════════════════════════════════════════════════════════════ */

const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src')

function readSource(absPath: string): string {
  try {
    return readFileSync(absPath, 'utf8')
  } catch (cause) {
    throw new Error(
      `harness: could not read ${absPath}. The source derivation is anchored at ` +
        `${SRC_DIR}; if the tree moved, fix the anchor rather than hand-writing the lists.`,
      { cause },
    )
  }
}

/**
 * Block and line comments removed.
 *
 * App.tsx and the screen files are heavily commented, and those comments talk
 * about routes and tabs in prose. Parsing them would invent entries.
 * `(^|[^:])` guards the line-comment strip against `https://` inside a string.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** `'./flows/homepage/HomepageScreen'` (as imported by src/App.tsx) -> abs path. */
function resolveLocalModule(specifier: string): string | null {
  if (!specifier.startsWith('.')) return null
  const base = resolve(SRC_DIR, specifier)
  for (const candidate of [`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`]) {
    try {
      readFileSync(candidate, 'utf8')
      return candidate
    } catch {
      /* try the next extension */
    }
  }
  return null
}

/** Named + default imports of a module, mapped local-name -> module specifier. */
function parseImports(source: string): Map<string, string> {
  const map = new Map<string, string>()
  const re = /import\s+(?:type\s+)?(?:(\w+)\s*(?:,\s*)?)?(?:\{([^}]*)\})?\s*from\s*'([^']+)'/g
  for (const [, defaultName, namedList, specifier] of source.matchAll(re)) {
    if (defaultName) map.set(defaultName, specifier)
    for (const raw of (namedList ?? '').split(',')) {
      const name = raw.trim().split(/\s+as\s+/).pop()?.trim()
      if (name) map.set(name, specifier)
    }
  }
  return map
}

interface RouteEntry {
  /** The router path, leading slash added; `:param` segments still present. */
  path: string
  /** The component rendered as this route's `element`. */
  component: string
  /** Absolute path of that component's source file, when it is a local module. */
  sourceFile: string | null
}

/**
 * THE ROUTER TABLE, parsed from `src/App.tsx`.
 *
 * Split on `<Route`, then for each declaration read `path="…"` / `index` out of
 * the head and the first capitalised JSX tag out of `element={…}`. The pathless
 * layout route (`<Route element={<AppShell />}>`) has neither, so it drops out
 * on its own.
 */
function parseRouteTable(): RouteEntry[] {
  const appPath = resolve(SRC_DIR, 'App.tsx')
  const source = stripComments(readSource(appPath))
  const imports = parseImports(source)

  const entries: RouteEntry[] = []
  for (const chunk of source.split(/<Route\b/).slice(1)) {
    const elementAt = chunk.indexOf('element={')
    const head = elementAt >= 0 ? chunk.slice(0, elementAt) : chunk

    const pathMatch = /\bpath="([^"]+)"/.exec(head)
    const isIndex = /(?:^|\s)index(?:\s|$)/.test(head)
    if (!pathMatch && !isIndex) continue // the pathless layout route

    const component = elementAt >= 0
      ? /<\s*([A-Z][A-Za-z0-9_]*)/.exec(chunk.slice(elementAt))?.[1]
      : undefined
    if (!component) {
      throw new Error(
        `harness: a <Route> in src/App.tsx declares ${pathMatch?.[1] ?? 'index'} with no ` +
          `parseable element component. The derivation is what is wrong — fix it here.`,
      )
    }

    const path = isIndex ? '/' : `/${pathMatch![1].replace(/^\//, '')}`
    const specifier = imports.get(component)
    entries.push({
      path,
      component,
      sourceFile: specifier ? resolveLocalModule(specifier) : null,
    })
  }

  if (entries.length === 0) {
    throw new Error('harness: parsed zero routes out of src/App.tsx — the derivation is broken.')
  }
  return entries
}

export const ROUTE_TABLE: RouteEntry[] = parseRouteTable()

/**
 * EVERY REACHABLE ROUTE.
 *
 * `ROUTE_TABLE` expanded over the data behind its one parameterised path.
 * `HoldingDetailScreen` redirects any id it cannot find to /finance, so a
 * hand-written list would go quietly green the day a holding is renamed. Add a
 * tenth holding and this walk grows a route by itself.
 *
 * WHAT IS NOT A ROUTE, and therefore not expanded here: the Homepage's four
 * tabs and the Finance screen's five. Those are in-screen `useState`, by Flow 1
 * §3 and Flow 7 B7 — the URL never changes. As of Gate 9 they are covered by
 * `WALK` below rather than being a hole in the net.
 */
export const ROUTES: string[] = ROUTE_TABLE.flatMap(({ path }) => {
  if (!path.includes(':')) return [path]
  if (path === '/finance/holding/:holdingId') {
    return HOLDINGS.map((h) => `/finance/holding/${h.id}`)
  }
  throw new Error(
    `harness: parameterised route "${path}" has no expansion. Every :param must be ` +
      `expanded over the data that backs it, or the walk silently skips the screen.`,
  )
})

/* ───────────────────────────────────────────────────────────────────────────
   TABS
   ─────────────────────────────────────────────────────────────────────────── */

export interface TabState {
  id: string
  label: string
}

export interface TabbedScreen {
  /** The route whose element renders this tab bar. */
  route: string
  /** Repo-relative source file the tabs were parsed out of. */
  source: string
  /** The name of the `TabItem[]` constant, checked to be the one passed to `Tabs`. */
  constName: string
  tabs: TabState[]
  defaultTabId: string
}

/**
 * Parse one screen's tab bar, or return null if it has no `Tabs`.
 *
 * Three things must agree or this throws, because each of them silently
 * shrinking the walk is the failure this gate exists to remove:
 *   - the file renders `<Tabs` and declares a `TabItem[]` constant,
 *   - that constant is the one handed to `tabs={…}`,
 *   - the `useState<string>('…')` initialiser names one of its ids.
 */
function parseTabbedScreen(route: string, absPath: string): TabbedScreen | null {
  const raw = readSource(absPath)
  const source = stripComments(raw)
  const rendersTabs = /<Tabs[\s/>]/.test(source)

  const arrayMatch = /const\s+(\w+)\s*:\s*TabItem\[\]\s*=\s*\[([\s\S]*?)\n\]/.exec(source)
  if (!arrayMatch) {
    if (rendersTabs) {
      throw new Error(
        `harness: ${absPath} renders <Tabs> but no "const X: TabItem[] = [...]" could be ` +
          `parsed out of it. The tab walk would silently skip this screen.`,
      )
    }
    return null
  }
  const [, constName, body] = arrayMatch

  const tabs: TabState[] = Array.from(
    body.matchAll(/\{\s*id:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'\s*\}/g),
    ([, id, label]) => ({ id, label }),
  )
  if (tabs.length < 2) {
    throw new Error(
      `harness: parsed ${tabs.length} tab(s) out of ${constName} in ${absPath}. ` +
        `A tab bar has at least two; the derivation is what is wrong.`,
    )
  }

  if (!new RegExp(`tabs=\\{${constName}\\}`).test(source)) {
    throw new Error(
      `harness: ${constName} in ${absPath} is never passed as tabs={${constName}} — ` +
        `the parsed list is not the list the screen renders.`,
    )
  }

  const defaultTabId = Array.from(
    source.matchAll(/useState<string>\(\s*'([^']+)'\s*\)/g),
    ([, id]) => id,
  ).find((id) => tabs.some((t) => t.id === id))
  if (!defaultTabId) {
    throw new Error(
      `harness: no useState<string>('<tabId>') in ${absPath} initialises to one of ` +
        `${tabs.map((t) => t.id).join(', ')}. The default tab cannot be identified.`,
    )
  }

  if (route.includes(':')) {
    throw new Error(
      `harness: tabbed screen on parameterised route "${route}". The tab walk would ` +
        `cover one expansion only — expand it explicitly before relying on this.`,
    )
  }

  return {
    route,
    source: relative(resolve(SRC_DIR, '..'), absPath).replace(/\\/g, '/'),
    constName,
    tabs,
    defaultTabId,
  }
}

/**
 * EVERY TABBED SCREEN IN THE ROUTER, derived.
 *
 * Note the reach of this: it finds tab bars declared in the file a route
 * renders directly. A tab bar nested deeper (inside a panel component) would
 * not be parsed — and would be caught anyway by
 * `assertTabEnumerationMatchesDom`, which compares this list against the actual
 * `[role="tab"]` set in the DOM on every route the walk visits.
 */
export const TABBED_SCREENS: TabbedScreen[] = ROUTE_TABLE.flatMap((entry) =>
  entry.sourceFile ? (parseTabbedScreen(entry.path, entry.sourceFile) ?? []) : [],
)

/** The tab ids a given route is expected to render, `[]` when it has no tabs. */
export function expectedTabIds(route: string): string[] {
  return TABBED_SCREENS.find((s) => s.route === route)?.tabs.map((t) => t.id) ?? []
}

export interface WalkState {
  route: string
  /**
   * `null` = the screen exactly as it loads: its DEFAULT tab, or no tabs at all.
   * Non-null = a tab that must be activated through its own control first.
   */
  tab: TabState | null
}

/**
 * THE FULL WALK — every route, plus every NON-DEFAULT tab state of every route.
 *
 * The default state is deliberately expressed as `tab: null` rather than as the
 * default `TabState`, and that distinction is what protects the 28 baselines
 * committed at Gate 7: `stateSlug` gives it the unsuffixed name it already had,
 * and nothing clicks a control on the run that produces it.
 */
export const WALK: WalkState[] = ROUTES.flatMap((route) => {
  const screen = TABBED_SCREENS.find((s) => s.route === route)
  const nonDefault = (screen?.tabs ?? []).filter((t) => t.id !== screen?.defaultTabId)
  return [
    { route, tab: null } as WalkState,
    ...nonDefault.map((tab): WalkState => ({ route, tab })),
  ]
})

/**
 * Baseline / test name for a walk state.
 *
 * `/finance/holding/wallet-marg` -> `finance-holding-wallet-marg`
 * `/` + Crypto tab               -> `index-crypto`
 *
 * THE DEFAULT STATE KEEPS ITS GATE 7 NAME. Renaming the existing 28 would
 * regenerate them on the update run, which would destroy the byte-identity
 * check that is the only thing bounding that run.
 */
export function stateSlug(state: WalkState): string {
  const base = state.route === '/' ? 'index' : state.route.replace(/^\//, '').replace(/\//g, '-')
  return state.tab ? `${base}-${state.tab.id}` : base
}

/** Human-readable title for a walk state, used in test names. */
export function stateTitle(state: WalkState): string {
  return state.tab ? `${state.route} [tab:${state.tab.id}]` : state.route
}

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
 * THE CHECK ON THE PARSE.
 *
 * `TABBED_SCREENS` is read out of source text, which is fast and works at
 * collection time but cannot see a tab bar it did not think to look for. This
 * compares it against what the browser actually rendered: the ids, the labels
 * and the count of `[role="tab"]`, plus which one is selected on load.
 *
 * A tab bar added anywhere on a walked route — nested in a panel, renamed,
 * reordered — fails here. That is what makes the static parse safe to build the
 * test list from.
 *
 * The selection check is stated against the WALK STATE, not against the
 * default: on a `tab: null` state the app must have booted into the parsed
 * default, and on a tab state the clicked tab must be the one selected. Both
 * directions matter, so both are asserted rather than the check being skipped
 * once a click has happened.
 */
export async function assertTabEnumerationMatchesDom(
  page: Page,
  state: WalkState,
): Promise<void> {
  const { route } = state
  const rendered = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="tab"]')).map((el) => ({
      id: (el.id || '').replace(/^tab-/, ''),
      label: el.textContent ?? '',
      selected: el.getAttribute('aria-selected') === 'true',
    })),
  )

  const screen = TABBED_SCREENS.find((s) => s.route === route)
  const expected = screen?.tabs ?? []

  expect(
    rendered.map((t) => t.id),
    `${route}: the tab bar rendered in the browser disagrees with the list parsed from ` +
      `source. THE DERIVATION IS WHAT IS WRONG — re-derive it in e2e/harness.ts; do not ` +
      `hand-write the tab list.`,
  ).toEqual(expected.map((t) => t.id))

  expect(
    rendered.map((t) => t.label),
    `${route}: tab labels in the DOM disagree with the parsed labels`,
  ).toEqual(expected.map((t) => t.label))

  if (screen) {
    const shouldBeSelected = state.tab?.id ?? screen.defaultTabId
    expect(
      rendered.filter((t) => t.selected).map((t) => t.id),
      state.tab
        ? `${route}: exactly one tab must be selected, and it must be the activated "${shouldBeSelected}"`
        : `${route}: exactly one tab must be selected on load, and it must be the parsed default`,
    ).toEqual([shouldBeSelected])
  }
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

/**
 * Activate a tab THROUGH ITS OWN CONTROL, and wait for the render to settle.
 *
 * NOT by setting React state and NOT by writing to the DOM. `selected` lives in
 * `useState` inside the screen; a test that pokes it verifies a state the app
 * may not think it is in — the same reasoning that makes `gotoRoute` click the
 * theme toggle instead of writing `data-theme`.
 *
 * SETTLE DETECTION, and why each signal is trustworthy rather than a sleep:
 *
 *  1. `aria-selected="true"` on the clicked control. `Tab` renders that
 *     attribute from `isSelected={t.id === selectedId}`, i.e. straight off the
 *     state we are trying to reach — so the attribute flipping IS the proof
 *     that React committed the new state, not a proxy for it.
 *  2. Exactly one selected tab. Rules out a half-applied render.
 *  3. Every `<img>` complete. A freshly-mounted panel mounts new `Logo` and
 *     banner images; a measurement or screenshot taken before they decode reads
 *     an empty box. (`complete` is also true for a failed image, which is what
 *     we want — the route walk fails that separately, on the network recorder.)
 *  4. Fonts still loaded. Cheap, and a newly-mounted panel can pull a weight
 *     that had not been requested before.
 *
 * The click also avoids the one animation in this component: `Tabs` only calls
 * `scrollIntoView({ behavior: 'smooth' })` from `focusTab`, which is the
 * ArrowLeft/ArrowRight path. A click goes through `onClick` -> `onChange` only.
 */
export async function activateTab(page: Page, tab: TabState): Promise<void> {
  const control = page.locator(`[role="tab"][id="tab-${tab.id}"]`)

  await expect(control, `no tab control #tab-${tab.id} on this screen`).toHaveCount(1)
  await expect(
    control,
    `#tab-${tab.id} is already selected — this walk state is the default one, not a new state`,
  ).toHaveAttribute('aria-selected', 'false')
  await expect(control, `#tab-${tab.id} does not carry its parsed label`).toHaveText(tab.label)

  await control.click()

  await expect(control, `clicking #tab-${tab.id} did not select it`).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(
    page.locator('[role="tab"][aria-selected="true"]'),
    'exactly one tab must be selected after the click',
  ).toHaveCount(1)

  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete))
  await page.waitForFunction(() => document.fonts.status === 'loaded')
}

/**
 * `gotoRoute` plus the tab activation, for a state out of `WALK`.
 *
 * A `tab: null` state is byte-for-byte the Gate 7 path: navigate, set theme,
 * done. Nothing is clicked, so the 28 committed baselines are produced by the
 * same sequence that produced them.
 */
export async function gotoState(page: Page, state: WalkState, theme: Theme): Promise<void> {
  await gotoRoute(page, state.route, theme)
  if (state.tab) await activateTab(page, state.tab)
}

/**
 * Finish every animation before reading a transitioned property.
 *
 * The try/catch is load-bearing: an infinite animation throws on `.finish()`
 * and would abort the rest of the loop.
 */
export async function finishAnimations(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {
        /* infinite animations cannot finish; skip, do not abort */
      }
    })
  })
}
