import type { BottomNavItem } from '@monarch/design-system'

/**
 * Shell nav — frame only. The real route table is Phase 5's; these three exist
 * to prove routing and the nav pattern work.
 *
 * `icon` values must be real DS IconName keys, which is enforced by
 * BottomNavItem's type — a typo fails the build rather than rendering nothing.
 */
export const NAV_ITEMS: (Omit<BottomNavItem, 'isSelected'> & { path: string })[] = [
  { id: 'home', icon: 'home', label: 'Home', path: '/' },
  { id: 'search', icon: 'search', label: 'Search', path: '/search' },
  { id: 'settings', icon: 'settings', label: 'Settings', path: '/settings' },
]
