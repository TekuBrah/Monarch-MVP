import { BottomNavigation, Button, Icon, IconObject } from '@monarch/design-system'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../theme/ThemeProvider'
import { chromeFor } from './chrome'
import { NAV_ITEMS } from './navItems'
import './AppShell.css'

export function AppShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme, toggle } = useTheme()

  // EXPLICIT config, never inferred from what the screen renders (§5).
  const chrome = chromeFor(pathname)

  const items = NAV_ITEMS.map(({ path, ...item }) => ({
    ...item,
    isSelected: path === pathname,
  }))

  return (
    <div className="mvp-shell">
      <main className="mvp-shell__main">
        <Outlet />
      </main>

      {/*
        The Steward AI FAB. One position for every screen that shows it, which
        is F1 A9's fix — Figma has it at x=298 on Fiat and x=297 on Crypto, and
        a shell-owned FAB cannot drift by a pixel between two screens because
        there is only one of it.

        `IconObject color="ai"` is the DS's own gradient treatment, matching
        Figma's blue-400 -> blue-500 -> violet-500 ramp exactly. Nothing here
        names a colour.
      */}
      {chrome.fab && (
        <button
          type="button"
          className="mvp-shell__fab"
          aria-label="Open Steward AI"
          onClick={() => navigate('/steward')}
        >
          <IconObject color="ai" shape="circle" size="xxl">
            <Icon name="logo_monarch" size="xl" />
          </IconObject>
        </button>
      )}

      {chrome.nav === 'present' && (
        <div className="mvp-shell__nav">
          <BottomNavigation
            items={items}
            onSelect={(id) => {
              const target = NAV_ITEMS.find((n) => n.id === id)
              if (target) navigate(target.path)
            }}
          />
        </div>
      )}

      {/*
        Theme switch. NOT in the Figma design — a demo affordance, kept from the
        Phase 4.7 shell because the artifact needs a way to reach dark mode and
        the file's dark-mode reference exists to be compared against. Parked at
        the FAB's height on the opposite edge so it collides with neither the
        FAB nor the nav pill.
      */}
      <div className="mvp-shell__theme-switch">
        <Button
          variant="secondary"
          size="s"
          label={theme === 'dark' ? 'Light' : 'Dark'}
          onClick={toggle}
        />
      </div>
    </div>
  )
}
