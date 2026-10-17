import { BottomNavigation, Icon, IconObject } from '@monarch/design-system'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../theme/ThemeProvider'
import { chromeFor } from './chrome'
import { NAV_ITEMS } from './navItems'
import { NoticeHost } from './NoticeHost'
import { useStatusBarColor } from './useStatusBarColor'
import './AppShell.css'

export function AppShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme } = useTheme()

  // EXPLICIT config, never inferred from what the screen renders (§5).
  const chrome = chromeFor(pathname)

  // Installed on Android the platform paints the status strip itself and grants
  // the app no region under it, so matching its colour to whatever this route
  // puts at y=0 is the only continuity available. Inert in a browser tab, by
  // construction — see useStatusBarColor for the full ruling.
  useStatusBarColor(chrome.statusBar, theme)

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

      {/*
        The scrim and the nav are one decision: the scrim exists only to give
        the nav's fade runway, so it appears exactly where the nav does and
        never on a screen whose chrome is suppressed.
      */}
      {chrome.nav === 'present' && <div className="mvp-shell__scrim" aria-hidden="true" />}

      {chrome.nav === 'present' && (
        <div className="mvp-shell__nav mvp-column">
          <BottomNavigation
            items={items}
            barWidth="fill"
            onSelect={(id) => {
              const target = NAV_ITEMS.find((n) => n.id === id)
              if (target) navigate(target.path)
            }}
          />
        </div>
      )}

      {/*
        Gate 87: the app-level notices (storage failures, resets). It takes the
        slot of the old shell theme switch — a demo affordance not in the Figma
        design, removed here; dark mode is now a setting on `/settings`, reached
        from the header avatar.
      */}
      <NoticeHost aboveChrome={chrome.nav === 'present'} />
    </div>
  )
}
