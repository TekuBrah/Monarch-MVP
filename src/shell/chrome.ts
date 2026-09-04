/**
 * Per-route chrome configuration.
 *
 * The inventory's §5 implementation decision, verbatim: "The app shell takes
 * chrome state as EXPLICIT PER-ROUTE CONFIG — present / suppressed /
 * repurposed — not derived from screen structure." The consequence it draws is
 * the one this file has to honour: "Nothing in the code asks 'does this screen
 * have bottom action buttons?'"
 *
 * So there is no inference here. Not a heuristic, not a lookup on what a screen
 * renders — a table.
 *
 * The three axes are INDEPENDENT, which is why they are three fields and not one
 * enum. F10 A9 is the case that proves it for the first two: the Steward FAB is
 * removed while the navbar is merely covered. A single "has chrome" flag could
 * not express that. `statusBar` (Gate 44-B) proves it again in a third
 * direction — `/steward` and `/finance` agree on nothing else and `/steward`
 * and `/more` agree on it while disagreeing on both others.
 *
 * SUPPRESSED is a user-facing state, not a layer-visibility state (§5's S1
 * insight). A nav that is drawn but covered by an overlay is suppressed, the
 * same as one that is not drawn at all — the user cannot reach it either way.
 */

export type NavState =
  /** Root / tab-level page, nothing overlaid. */
  | 'present'
  /** Unavailable to the user — overlaid, or displaced by the screen's own actions. */
  | 'suppressed'
  /** The nav slot reused as a functional control (F4/F5 select-recipient). */
  | 'repurposed'

/**
 * What is painted at the very top of this route, immediately below the
 * platform's own status strip.
 *
 * A THIRD INDEPENDENT AXIS, for the same reason `fab` is a second one: it does
 * not follow from `nav`, and it must not be inferred from what the screen
 * renders. `/steward` suppresses its nav and drops its FAB yet sits on the page
 * surface exactly as `/more` does, while `/finance` keeps both and sits on
 * artwork.
 *
 * It exists because Android grants no status-bar region to a standalone PWA
 * (see `useStatusBarColor`), so the strip's colour is the only thing that can
 * make the seam disappear — and the right colour depends entirely on this.
 */
export type StatusBarSurface =
  /** `HeaderBg`'s photograph reaches y=0. */
  | 'artwork'
  /** `--mapped-surface-page` reaches y=0 — every screen without `HeaderBg`. */
  | 'page'

export interface ChromeConfig {
  nav: NavState
  /** The persistent Steward AI FAB. Independent of `nav` — see F10 A9. */
  fab: boolean
  /** What abuts the platform status strip. Independent of both — see above. */
  statusBar: StatusBarSurface
}

/**
 * Chrome by route path.
 *
 * Flow 1 covers the four page roots plus the Steward destination. Later flows
 * add their own routes here as they are built; an unlisted route falls back to
 * DEFAULT_CHROME, which is deliberately the conservative choice rather than a
 * guess dressed up as a default.
 */
const CHROME_BY_ROUTE: Record<string, ChromeConfig> = {
  // The Homepage. Both tabs are the same page, so one entry covers both — the
  // Accounts/Crypto switch is in-screen Tabs state, not a route change.
  '/': { nav: 'present', fab: true, statusBar: 'artwork' },

  // The other three page roots. Their flows are not built yet; the chrome they
  // declare is the page-level chrome §5 assigns to a root screen, and it does
  // not change when the real screens land behind them.
  '/transfer': { nav: 'present', fab: true, statusBar: 'page' },
  '/finance': { nav: 'present', fab: true, statusBar: 'artwork' },
  '/more': { nav: 'present', fab: true, statusBar: 'page' },

  // The FAB's own destination. Steward is an overlay surface in the design
  // (§5 S1), so its nav is suppressed and it does not re-offer the FAB that
  // opened it.
  '/steward': { nav: 'suppressed', fab: false, statusBar: 'page' },
}

/**
 * Chrome for route FAMILIES, matched by path prefix — B7 / §5 S2.
 *
 * Flow 7's nine drill-downs are `/finance/holding/<id>`, one per holding, and
 * listing nine identical rows above would be a table that has to be edited every
 * time a holding is added. A prefix rule is still EXPLICIT CONFIG — it is
 * declared here, by path, and nothing inspects what the screen renders. That is
 * the property §5 actually asks for; the ban is on inference, not on families.
 *
 * WHY SUPPRESSED. A drill-down displaces the page's own chrome with its bottom
 * action buttons — "Set Maturity Reminder" and "Download Statement" occupy
 * exactly where the nav pill sits. §5's S1 insight is that suppressed is a
 * USER-FACING state: a nav the user cannot reach is suppressed whether it is
 * covered or simply not drawn. The FAB goes with it, for the same reason.
 *
 * Ordered longest-prefix-first, so a future `/finance/holding/x/y` could not be
 * captured by a shorter rule.
 */
const CHROME_BY_PREFIX: [string, ChromeConfig][] = [
  ['/finance/holding/', { nav: 'suppressed', fab: false, statusBar: 'page' }],
]

export const DEFAULT_CHROME: ChromeConfig = { nav: 'suppressed', fab: false, statusBar: 'page' }

export function chromeFor(pathname: string): ChromeConfig {
  const exact = CHROME_BY_ROUTE[pathname]
  if (exact) return exact

  const prefixed = CHROME_BY_PREFIX.find(([prefix]) => pathname.startsWith(prefix))
  if (prefixed) return prefixed[1]

  return DEFAULT_CHROME
}
