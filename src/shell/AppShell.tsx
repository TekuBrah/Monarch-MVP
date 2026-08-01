import { BottomNavigation, Button } from '@monarch/design-system'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../theme/ThemeProvider'
import { NAV_ITEMS } from './navItems'
import './AppShell.css'

export function AppShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme, toggle } = useTheme()

  const items = NAV_ITEMS.map(({ path, ...item }) => ({
    ...item,
    isSelected: path === pathname,
  }))

  return (
    <div className="mvp-shell">
      <header className="mvp-shell__header">
        <Button
          variant="tertiary"
          size="s"
          label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          onClick={toggle}
        />
      </header>

      <main className="mvp-shell__main">
        <Outlet />
      </main>

      <div className="mvp-shell__nav">
        <BottomNavigation
          items={items}
          onSelect={(id) => {
            const target = NAV_ITEMS.find((n) => n.id === id)
            if (target) navigate(target.path)
          }}
        />
      </div>
    </div>
  )
}
