import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Drives the design system's theming.
 *
 * The mechanism is copied from the DS showcase rather than reinvented: it sets
 * `data-theme` on <html> to 'dark' or '' — see showcase/App.tsx's useTheme.
 * globals.css keys its dark block off `[data-theme="dark"]`, so an empty string
 * and an absent attribute behave identically; matching the DS exactly keeps the
 * two apps from drifting.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  // useLayoutEffect, NOT useEffect, AND THE ORDERING IS THE WHOLE REASON.
  // React runs a child's passive effect BEFORE its parent's, and this provider
  // wraps the entire app — so any descendant reading a theme-dependent token
  // from a passive effect saw the attribute the PREVIOUS theme left behind.
  // Measured at Gate 44-B on the Android status-strip colour: light -> dark
  // read #ffffff and dark -> light read #000000, each exactly one flip stale.
  //
  // A layout effect closes it for every consumer at once, because React
  // completes ALL layout effects before ANY passive effect regardless of tree
  // depth. It also removes a real (if brief) window in which the DOM was
  // committed with the new state and the old theme attribute.
  //
  // A DESCENDANT CANNOT WORK AROUND THIS ITSELF, which is why the fix is here.
  // The DS declares its dark values on [data-theme="dark"] and its light values
  // on bare :root, so a probe element can be stamped INTO dark but never back
  // OUT of it — with <html> still dark, a probe declaring nothing simply
  // inherits dark. There is no selector a descendant can match to obtain the
  // light ramp.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '')
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside a ThemeProvider')
  return ctx
}
