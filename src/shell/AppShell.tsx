import { BottomNavigation, Icon, IconObject } from '@monarch/design-system'
import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../theme/ThemeProvider'
import { chromeFor } from './chrome'
import { NAV_ITEMS, REPURPOSED_NAV } from './navItems'
import { NoticeHost } from './NoticeHost'
import { currentNotice, dismissNotice, raiseNotice } from './notices'
import { TransferSheet } from './TransferSheet'
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
    isSelected: path !== null && path === pathname,
  }))

  const [isTransferOpen, setTransferOpen] = useState(false)
  const closeTransfer = useCallback(() => setTransferOpen(false), [])

  // A shell "Coming soon." belongs to the screen it was raised over.
  useEffect(() => {
    if (currentNotice() === 'coming-soon') dismissNotice()
  }, [pathname])

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
      {chrome.nav !== 'suppressed' && <div className="mvp-shell__scrim" aria-hidden="true" />}

      {chrome.nav === 'present' && (
        <div className="mvp-shell__nav mvp-column">
          <BottomNavigation
            items={items}
            barWidth="fill"
            onSelect={(id) => {
              if (id === 'transfer') {
                setTransferOpen(true)
                return
              }
              const target = NAV_ITEMS.find((n) => n.id === id)
              if (target?.path) navigate(target.path)
            }}
          />
        </div>
      )}

      {/*
        Gate 92, R92-11: the bar repurposed on the recipient picker follows
        Figma `1266:14391` — the HUG pill, passed explicitly though it is the DS
        default. With "Recipients" marked `width: 'hug'` in `REPURPOSED_NAV`
        (R92-21, Decision 25 C, DS v2.11.1) it renders 191.672 wide (Figma draws
        190) with both labels on one line (register G59, closed).
      */}
      {chrome.nav === 'repurposed' && (
        <div className="mvp-shell__nav mvp-column">
          <BottomNavigation
            items={REPURPOSED_NAV[pathname] ?? []}
            barWidth="hug"
            onSelect={(id) => {
              if (id === 'scan-qr') raiseNotice('coming-soon')
            }}
          />
        </div>
      )}

      <TransferSheet
        isOpen={isTransferOpen}
        onClose={closeTransfer}
        onReceive={() => {
          setTransferOpen(false)
          raiseNotice('coming-soon')
        }}
        onSend={() => {
          setTransferOpen(false)
          navigate('/transfer')
        }}
      />

      {/*
        Gate 87: the app-level notices (storage failures, resets). It takes the
        slot of the old shell theme switch — a demo affordance not in the Figma
        design, removed here; dark mode is now a setting on `/settings`, reached
        from the header avatar.
      */}
      <NoticeHost aboveChrome={chrome.nav !== 'suppressed'} />
    </div>
  )
}
