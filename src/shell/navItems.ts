import type { BottomNavItem } from '@monarch/design-system'

/**
 * The real page-level nav, replacing the Phase 4.7 Home/Search/Settings
 * placeholders.
 *
 * The inventory's §5 chrome rule is precise about what these are: "The bottom
 * nav is PAGE-level chrome. One nav item = one page — Home, Transfer, Finance,
 * More. It belongs to the page, not to individual screens."
 *
 * So this list is four entries and one route each, and a flow's inner screens
 * never add to it. Whether the nav is shown at all on a given route is a
 * separate question, answered by `chrome.ts`.
 *
 * `icon` values must be real DS IconName keys, which is enforced by
 * BottomNavItem's type — a typo fails the build rather than rendering nothing.
 */
export const NAV_ITEMS: (Omit<BottomNavItem, 'isSelected'> & { path: string | null })[] = [
  { id: 'home', icon: 'icon_home', label: 'Home', path: '/' },
  // Gate 92, R92-1: an ACTION, not a destination. It opens the Transfer sheet.
  { id: 'transfer', icon: 'icon_transfer', label: 'Transfer', path: null },
  { id: 'finance', icon: 'icon_finance', label: 'Finance', path: '/finance' },
  { id: 'more', icon: 'icon_more', label: 'More', path: '/more' },
]

/** Gate 92, R92-8: the bar repurposed on the recipient picker (Figma `1266:14391`). */
export const REPURPOSED_NAV: Record<string, BottomNavItem[]> = {
  '/transfer': [
    // R92-21 / Decision 25 C: hug, as Figma draws an 80 px item; Scan QR stays fixed.
    { id: 'recipients', icon: 'people', label: 'Recipients', isSelected: true, width: 'hug' },
    { id: 'scan-qr', icon: 'qr_code_scanner', label: 'Scan QR' },
  ],
}
