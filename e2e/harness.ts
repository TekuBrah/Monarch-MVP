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

/**
 * THE VIEWPORT AXIS — a peer of THEMES, deliberately NOT folded into WALK.
 *
 * Folding the viewport into `WALK` was the obvious-looking design and it is
 * the wrong one: `WALK` is consumed by `routes.spec.ts` and
 * `section-headers.spec.ts` too, and neither has anything to say about width.
 * They would have doubled along with it, taking the suite from 174 tests to
 * 264 to learn nothing. As a peer axis, only `visual.spec.ts` iterates it.
 *
 * ONE PLAYWRIGHT PROJECT, NOT TWO. A second project would have been the other
 * obvious design, and it decorates the baseline filename with the project name
 * for free. It also breaks the baseline guard: a spec with no project filter
 * runs ONCE PER PROJECT, so `baselines.spec.ts` would run twice, each run
 * deriving only its own project's names and seeing the other project's files
 * as orphans. Both runs fail. With one project that failure mode cannot arise.
 *
 * HEIGHT IS HELD CONSTANT AT 812 ON PURPOSE. This gate adds a WIDTH, and a
 * baseline difference has to be attributable to the one thing that changed.
 * 430x932 is the real device size, but varying both axes at once would make
 * every diff ambiguous. Height was separately measured to leave the scrim
 * runway invariant (D=89, alpha 65.2% at 812/844/932/1024).
 *
 * WHY 430 AND NOT 390. Figma authors this app exclusively at 375 — there is no
 * 390 frame anywhere in the file — and the width axis has exactly two regimes,
 * because the DS ships exactly one breakpoint at 768. Every width from 376 to
 * 767 therefore exercises the same facts, so 390 buys nothing 430 does not.
 *
 * 430 wins on two counts that 390 cannot match:
 *
 *   1. It is the PROPOSED FRAME WIDTH, so when the frame cap lands there is
 *      already a baseline at exactly the width where the cap engages.
 *   2. It KEEPS THE CAROUSEL OVERFLOWING. Measured: the Smart Insights
 *      scroller has scrollWidth 543 against clientWidth 375/390/430, but at
 *      768 it is 768 against 768 — it fits, the snap goes inert, and
 *      `scroll-padding-left` is never exercised. A viewport at or above 768
 *      would SILENTLY STOP COVERING Gate 14's fix, which is the opposite of
 *      what adding coverage is for.
 *
 * Fix 3c is also invisible at 375 and visible here: three tiles cap at 109px
 * and already fill the 343px column exactly, which is an arithmetic accident
 * of 375. At 430 they render 127.33/127.34/127.33.
 */
export const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 430, height: 812 },
] as const
export type Viewport = (typeof VIEWPORTS)[number]

/**
 * The viewport every NON-visual spec runs at, and the one `playwright.config`
 * declares. Exported so the config and the honesty guard read the SAME object
 * rather than two literals that agree today.
 */
export const DEFAULT_VIEWPORT = VIEWPORTS[0]

/** Pinned DPR. The guard exists mostly to catch this being silently lost. */
export const DEVICE_SCALE_FACTOR = 2

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

/* ───────────────────────────────────────────────────────────────────────────
   OVERLAYS
   ─────────────────────────────────────────────────────────────────────────── */

/**
 * AN OVERLAY IS NOT AN AXIS. It is an explicit, enumerated addition to `WALK`.
 *
 * The viewport became a first-class axis at Gate A because every state
 * genuinely exists at every viewport — the cross product is TOTAL, and every
 * cell of it is reachable. Overlays are the opposite case, and the distinction
 * is not stylistic:
 *
 *   - MOST STATES HAVE NO OVERLAY. 21 of the 23 states below open nothing.
 *   - THE ONES THAT DO HAVE *SPECIFIC* OVERLAYS. "Set Maturity Reminder" exists
 *     on the fixed deposit and nowhere else: `holdingFields` returns
 *     `actions: NO_ACTIONS` for five of the nine holding types, and
 *     `HoldingDetailScreen` does not render the bottom action bar at all when
 *     both flags are false.
 *
 * So `WALK x OVERLAYS` would multiply 21 states by every overlay in the app and
 * produce a large set of cells that CANNOT BE REACHED — a control that is not
 * on the screen cannot be clicked — and that should never be rendered. Every
 * one of them would then have to be excluded by hand, which is the list below
 * with the sign flipped and a great deal more machinery around it.
 *
 * THE TEST FOR A FUTURE SESSION: if you find yourself writing a nested loop
 * over overlays, you have taken the wrong turn. Write the state down.
 */
export interface OverlayState {
  /** Slug component and test-name suffix. Unique within its route + tab. */
  id: string
  /**
   * CSS selector for the control that OPENS it.
   *
   * AN OVERLAY IS OPENED THROUGH ITS OWN CONTROL, never by setting React state
   * and never by writing to the DOM — the same discipline that makes
   * `gotoRoute` click the theme toggle instead of writing `data-theme`, and
   * `activateTab` click the tab instead of poking `selectedId`. `openModal`
   * lives in `useState` inside `HoldingDetailScreen`; a test that poked it
   * would be verifying a state the app may not think it is in.
   */
  control: string
  /** The label that control must carry. Asserted BEFORE the click. */
  controlLabel: string
  /**
   * The dialog's accessible name. Asserted AFTER it opens, which is what makes
   * this a check that the RIGHT overlay opened rather than merely that one did.
   */
  title: string
  /**
   * OPTIONAL SECOND CLICK, and the state it leaves behind.
   *
   * Some surfaces are reachable only THROUGH a dialog rather than IN one. The
   * success toast is the case that forced this: ToastMobile is rendered by
   * HoldingDetailScreen only once a preset modal's footer button has fired
   * onConfirm, and that same handler calls onClose — so the dialog is GONE by
   * the time the toast exists. A state that stopped at the open dialog could
   * never reach it.
   *
   * WHY AN EXTRA STEP ON AN OVERLAY STATE RATHER THAN A NEW AXIS: the same
   * argument that made an overlay an enumerated entry instead of a cross
   * product. A confirm control exists on exactly the states that declare a
   * preset modal; no other screen has anything "confirm" could mean, so a
   * confirm axis would be almost entirely holes.
   *
   * THE SETTLE TARGET IS ASSERTED, NOT ASSUMED. Without settlesOn this would
   * click a button and screenshot whatever happened to be on screen, which is
   * how a silently-broken flow earns a baseline that looks fine.
   */
  confirm?: {
    /** CSS selector for the control that CONFIRMS. Clicked, never simulated. */
    control: string
    /** The label that control must carry. Asserted BEFORE the click. */
    controlLabel: string
    /**
     * What must remain once the dialog has closed. Asserted present EXACTLY
     * once AND the dialog asserted gone — both, because "the toast appeared"
     * and "the modal left" are different failures.
     */
    settlesOn: string
    /**
     * TEXT that surface must carry, so the RIGHT toast is caught.
     *
     * Text and not an accessible name, and that is measured rather than
     * stylistic: ToastMobile renders role="status" aria-live="polite" with NO
     * aria-label, so its accessible name computes EMPTY and toHaveAccessibleName
     * would pass against any toast at all — including the wrong one.
     */
    settlesText: string
  }
}

export interface WalkState {
  route: string
  /**
   * `null` = the screen exactly as it loads: its DEFAULT tab, or no tabs at all.
   * Non-null = a tab that must be activated through its own control first.
   */
  tab: TabState | null
  /**
   * `null` = nothing overlaid. Non-null = an overlay that must be opened
   * through its own control once the route (and tab) have settled.
   *
   * Spelled as an explicit `null` on the 21 states that have none, for the same
   * reason `tab` is: a state that opens nothing should SAY that it opens
   * nothing, so every construction site is forced to have considered it.
   */
  overlay: OverlayState | null
}

/**
 * THE THREE OVERLAY STATES, WRITTEN DOWN ONE AT A TIME.
 *
 * Both live on `/finance/holding/fd`, and that is not a convenience: the fixed
 * deposit is the ONLY holding type whose `holdingFields` entry returns
 * `actions: { reminder: true, statement: true }`. `bank`/`joint` return
 * `{ reminder: false, statement: true }` and the remaining five return
 * `NO_ACTIONS`, so the reminder control exists on exactly one route.
 *
 * WHY THESE MODALS AND NOT SOMETHING NEWER. They are ALREADY BUILT (Flow 7 B9),
 * so the axis is proven against something that exists and its correctness does
 * not depend on any future flow existing. The beneficiary of a mechanism and
 * the test case for it are deliberately different things here.
 *
 * CHROME STAYS PRESENT AND OCCLUDED, and on this route family it is thinner
 * than it looks. `chromeFor('/finance/holding/...')` is `nav: 'suppressed',
 * fab: false`, so `.mvp-shell__nav`, `.mvp-shell__fab` and `.mvp-shell__scrim`
 * are NOT RENDERED here — measured, overlay open and closed alike. What IS
 * present is `.mvp-shell__theme-switch` at z-index 3, plus the screen's own
 * bottom action bar. `Blanket` is `position: fixed; inset: 0` at z-index 100
 * with the card at 101, so both are occluded WITHOUT ANYTHING IN THE CHROME
 * MODEL CHANGING: hit-testing the centre of each returns `div.mn-blanket` with
 * the overlay open and the element itself with it closed, at both viewports in
 * both themes.
 */
export const OVERLAY_STATES: WalkState[] = [
  {
    route: '/finance/holding/fd',
    tab: null,
    overlay: {
      id: 'reminder',
      control: '.mvp-finance-detail__actions .mn-btn--primary',
      controlLabel: 'Set Maturity Reminder',
      title: 'Set Maturity Reminder',
    },
  },
  {
    route: '/finance/holding/fd',
    tab: null,
    overlay: {
      id: 'statement',
      control: '.mvp-finance-detail__actions .mn-btn--secondary',
      controlLabel: 'Download Statement',
      title: 'Download Statement',
    },
  },
  // THE SUCCESS TOAST — reached THROUGH the reminder modal, not inside it.
  //
  // It opens the SAME control as the 'reminder' state above and then confirms,
  // which is why its id is the thing that distinguishes them rather than its
  // selector. ToastMobile was a real user-facing surface with ZERO baseline
  // coverage: no walk state clicked a modal's footer, so nothing in the suite
  // had ever rendered it.
  //
  // NO PRODUCT CHANGE WAS NEEDED. Both preset modals already call onConfirm and
  // then onClose, so confirming leaves the toast alone on screen with the
  // dialog gone — measured, not assumed: [role="dialog"] count is 0 afterwards.
  //
  // STABLE TO SCREENSHOT, measured in the DS: ToastMobile.css declares no
  // transition, no animation and no @keyframes, and ToastMobile.tsx starts no
  // timer, so the toast neither fades in nor auto-dismisses. There is nothing
  // here to fast-forward and no timer to wait out.
  //
  // '1 week before' is REMINDER_PRESETS[0], which ReminderModal seeds into
  // useState, so confirming without touching the radios is the default path.
  {
    route: '/finance/holding/fd',
    tab: null,
    overlay: {
      id: 'toast',
      control: '.mvp-finance-detail__actions .mn-btn--primary',
      controlLabel: 'Set Maturity Reminder',
      title: 'Set Maturity Reminder',
      confirm: {
        control: '.mn-modal__footer .mn-btn--primary',
        controlLabel: 'Set reminder',
        settlesOn: '.mvp-finance-detail__toast .mn-toast-mobile',
        settlesText: 'Reminder set for 1 week before maturity.',
      },
    },
  },
]

/**
 * THE FULL WALK — every route, plus every NON-DEFAULT tab state of every route.
 *
 * The default state is deliberately expressed as `tab: null` rather than as the
 * default `TabState`, and that distinction is what protects the 28 baselines
 * committed at Gate 7: `stateSlug` gives it the unsuffixed name it already had,
 * and nothing clicks a control on the run that produces it.
 */
export const WALK: WalkState[] = [
  ...ROUTES.flatMap((route): WalkState[] => {
    const screen = TABBED_SCREENS.find((s) => s.route === route)
    const nonDefault = (screen?.tabs ?? []).filter((t) => t.id !== screen?.defaultTabId)
    return [
      { route, tab: null, overlay: null },
      ...nonDefault.map((tab): WalkState => ({ route, tab, overlay: null })),
    ]
  }),
  // APPENDED, NOT MULTIPLIED IN — see `OverlayState` above for why an overlay is
  // an enumerated entry rather than an axis. 14 routes (one `tab: null` state
  // each, from ROUTES) + 7 non-default tab states + 3 OVERLAY_STATES = 24.
  ...OVERLAY_STATES,
]

/**
 * Baseline / test name for a walk state.
 *
 * `/finance/holding/wallet-marg` -> `finance-holding-wallet-marg`
 * `/` + Crypto tab               -> `index-crypto`
 * `/finance/holding/fd` + the reminder overlay
 *                                -> `finance-holding-fd-reminder`
 *
 * THE VIEWPORT IS PART OF THE NAME (Gate A). `index` + 375 -> `index-375`,
 * and with a tab, `index-crypto-375`. It is appended LAST so the Gate 9 state
 * name survives intact as a prefix.
 *
 * THE OVERLAY GOES BETWEEN THE TAB AND THE WIDTH, for the same reason: it
 * leaves every name minted before this gate untouched as a prefix, so the 84
 * committed baselines keep the filenames they already had.
 *
 * A BASELINE FILENAME IS SELF-DESCRIBING BY DESIGN. Reading
 * `index-crypto-430-dark-chromium-win32.png` tells you the route, the tab, the
 * width, the theme, the browser and the platform without opening a config. The
 * alternative — a width encoded only in a Playwright project name — pushes that
 * knowledge into a file the reader has to go and find.
 */
export function stateSlug(state: WalkState, viewport: Viewport): string {
  const base = state.route === '/' ? 'index' : state.route.replace(/^\//, '').replace(/\//g, '-')
  const withTab = state.tab ? `${base}-${state.tab.id}` : base
  const withOverlay = state.overlay ? `${withTab}-${state.overlay.id}` : withTab
  return `${withOverlay}-${viewport.width}`
}

/** Human-readable title for a walk state, used in test names. */
export function stateTitle(state: WalkState): string {
  const parts = [state.route]
  if (state.tab) parts.push(`[tab:${state.tab.id}]`)
  if (state.overlay) parts.push(`[overlay:${state.overlay.id}]`)
  return parts.join(' ')
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
 *
 * PARAMETERISED AT GATE A, AND STILL AN EXACT EQUALITY. The width was a
 * hardcoded 375, which made it the first hard blocker on a second viewport.
 * IT WAS NOT SOFTENED TO A RANGE OR A TOLERANCE, and it must never be: the
 * whole reason it is an exact literal is that a range would have accepted the
 * uncontrolled devicePixelRatio this guard was built to catch.
 *
 * THE EXPECTED WIDTH COMES FROM THE SAME OBJECT THAT SET THE VIEWPORT.
 * `visual.spec.ts` passes `viewport.width` from the very `viewport` it hands
 * to `test.use()`, in one closure — so the assertion and the setting cannot
 * disagree without someone editing one and not the other IN THE SAME
 * EXPRESSION. Callers that do not set a viewport get `DEFAULT_VIEWPORT.width`,
 * which is the same object `playwright.config.ts` imports for `use.viewport`.
 */
export async function assertHarnessIsHonest(
  page: Page,
  expectedWidth: number = DEFAULT_VIEWPORT.width,
): Promise<void> {
  const actual = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    dpr: window.devicePixelRatio,
  }))
  expect(
    actual,
    'harness guard: viewport/DPR were not applied — every measurement in this run is untrustworthy',
  ).toEqual({ clientWidth: expectedWidth, dpr: DEVICE_SCALE_FACTOR })
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
 * Open an overlay THROUGH ITS OWN CONTROL, and wait for it to settle.
 *
 * Deliberately the same shape as `activateTab` rather than a parallel
 * mechanism: assert the control is there and is the one named, assert the state
 * is NEW, click, then wait on a signal React renders straight off the state
 * being reached.
 *
 * SETTLE DETECTION, signal by signal:
 *
 *  1. NO DIALOG BEFORE THE CLICK. `Modal` returns `null` when `isOpen` is
 *     false, so an already-present dialog means this walk state is not the new
 *     state it claims to be — the overlay-open case of `activateTab`'s
 *     "already selected" guard.
 *  2. `[role="dialog"][aria-modal="true"]` present, and EXACTLY ONE of them.
 *     `Modal` renders its portal only from `isOpen`, so the node existing IS
 *     the proof React committed, not a proxy for it. Two would mean a second
 *     overlay was left open by an earlier step.
 *  3. THE ACCESSIBLE NAME MATCHES. This is the assertion that distinguishes
 *     "an overlay opened" from "the RIGHT overlay opened", and it is not
 *     decorative here: the two controls sit in the same bar and differ only by
 *     `mn-btn--primary` / `mn-btn--secondary`, so a swapped selector would open
 *     a real dialog and settle cleanly.
 *  4. Every `<img>` complete, and fonts still loaded — same reasoning as
 *     `activateTab`. `Modal` mounts fresh content into a portal.
 *
 * `Blanket` and `Modal` carry no CSS transition or animation of their own
 * (measured: `Blanket.css` is four declarations, `Modal.css` none), so there is
 * nothing here to fast-forward and no timer is waited on.
 */
export async function openOverlay(page: Page, overlay: OverlayState): Promise<void> {
  const control = page.locator(overlay.control)

  await expect(
    page.locator('[role="dialog"]'),
    `an overlay is already open before "${overlay.id}" was requested — this walk state is ` +
      `not the new state it claims to be`,
  ).toHaveCount(0)
  await expect(control, `no control matching "${overlay.control}" on this screen`).toHaveCount(1)
  await expect(
    control,
    `"${overlay.control}" does not carry its declared label — the selector is opening ` +
      `something other than the control this state names`,
  ).toHaveText(overlay.controlLabel)

  await control.click()

  const dialog = page.locator('[role="dialog"][aria-modal="true"]')
  await expect(
    dialog,
    `clicking "${overlay.controlLabel}" did not open exactly one modal dialog`,
  ).toHaveCount(1)
  await expect(
    dialog,
    `the dialog that opened is not "${overlay.title}" — the control selector reaches a ` +
      `different overlay than this state declares`,
  ).toHaveAccessibleName(overlay.title)

  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete))
  await page.waitForFunction(() => document.fonts.status === 'loaded')

  if (!overlay.confirm) return

  // THE CONFIRM STEP. Same discipline as the open: the control is asserted to
  // exist and to carry its declared label BEFORE it is clicked, so a selector
  // that drifts onto a different button fails loudly rather than confirming
  // something else. The modal footer holds exactly one primary button.
  const confirm = page.locator(overlay.confirm.control)
  await expect(
    confirm,
    `no confirm control matching "${overlay.confirm.control}" inside the "${overlay.id}" dialog`,
  ).toHaveCount(1)
  await expect(
    confirm,
    `"${overlay.confirm.control}" does not carry its declared label — the selector is ` +
      `reaching a different control than this state names`,
  ).toHaveText(overlay.confirm.controlLabel)

  await confirm.click()

  // BOTH HALVES ARE ASSERTED, because "the toast appeared" and "the modal left"
  // are different failures and either one alone would still take a screenshot.
  await expect(
    page.locator('[role="dialog"]'),
    `confirming "${overlay.confirm.controlLabel}" left a dialog open — this state's ` +
      `baseline would record the modal on top of the surface it exists to capture`,
  ).toHaveCount(0)

  const settled = page.locator(overlay.confirm.settlesOn)
  await expect(
    settled,
    `confirming "${overlay.confirm.controlLabel}" did not leave exactly one ` +
      `"${overlay.confirm.settlesOn}" on screen`,
  ).toHaveCount(1)
  await expect(
    settled,
    `the surface that settled is not the one "${overlay.id}" declares`,
  ).toHaveText(overlay.confirm.settlesText)

  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete))
  await page.waitForFunction(() => document.fonts.status === 'loaded')
}

/**
 * THE CHECK ON THE DECLARATION, in the same style as
 * `assertTabEnumerationMatchesDom`.
 *
 * `OVERLAY_STATES` is hand-enumerated by ruling, so nothing derives it and
 * nothing can catch it drifting — except the DOM. Stated against the WALK
 * STATE and in BOTH directions, exactly as the tab-selection check is: a state
 * that declares an overlay must have exactly that one open, and a state that
 * declares none must have NOTHING open.
 *
 * The second direction is the one that earns its keep. A modal left open by an
 * earlier interaction, or one the app opens by itself on mount, would be
 * invisible to every other assertion in the suite and would quietly appear in a
 * baseline as though it belonged there.
 */
export async function assertOverlayMatchesState(page: Page, state: WalkState): Promise<void> {
  const dialogs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="dialog"]')).map((el) => ({
      ariaModal: el.getAttribute('aria-modal'),
      title: el.querySelector('.mn-modal__title')?.textContent ?? '(no title)',
    })),
  )

  // A CONFIRMED OVERLAY ENDS WITH NO DIALOG. Its dialog is the ROUTE to the
  // surface rather than the surface itself — confirming closes it — so those
  // states expect the same empty list a no-overlay state does, and the surface
  // that must be there instead is asserted separately below.
  const expectsDialog = Boolean(state.overlay && !state.overlay.confirm)

  expect(
    dialogs,
    expectsDialog
      ? `${stateTitle(state)}: exactly one modal dialog must be open, titled ` +
          `"${state.overlay!.title}"`
      : state.overlay
        ? `${stateTitle(state)}: this state confirms its dialog away, so no [role="dialog"] ` +
            `may remain. One is still open, so the confirm step did not close it and this ` +
            `state's baseline would record the modal instead of the surface.`
        : `${stateTitle(state)}: this state declares NO overlay, so no [role="dialog"] may be ` +
            `open. Something opened one — an earlier interaction that did not dismiss, or the ` +
            `app opening it on mount. Either way this state's baseline would record it.`,
  ).toEqual(
    expectsDialog ? [{ ariaModal: 'true', title: state.overlay!.title }] : [],
  )

  // THE SECOND DIRECTION FOR A CONFIRMED STATE. Without it, a confirm that
  // silently produced nothing would satisfy the empty-dialog check above and
  // mint a baseline of a bare screen.
  if (state.overlay?.confirm) {
    await expect(
      page.locator(state.overlay.confirm.settlesOn),
      `${stateTitle(state)}: the surface this state exists to capture ` +
        `("${state.overlay.confirm.settlesOn}") is not present exactly once`,
    ).toHaveCount(1)
  }
}

/**
 * `gotoRoute` plus the tab activation and the overlay, for a state out of
 * `WALK`.
 *
 * A `tab: null, overlay: null` state is byte-for-byte the Gate 7 path:
 * navigate, set theme, done. Nothing is clicked, so the baselines minted before
 * those axes existed are produced by the same sequence that produced them.
 *
 * ORDER IS NOT ARBITRARY. The overlay is opened LAST because its control is
 * rendered by the screen — and on a tabbed screen, by the panel the tab
 * selects. Opening before the tab settles would click into the outgoing panel.
 */
export async function gotoState(page: Page, state: WalkState, theme: Theme): Promise<void> {
  await gotoRoute(page, state.route, theme)
  if (state.tab) await activateTab(page, state.tab)
  if (state.overlay) await openOverlay(page, state.overlay)
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
