import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  THEME_STORAGE_KEY,
  parseThemePreference,
  readThemePreference,
  resolveTheme,
  themeAttribute,
  writeThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from './themePreference'

/** The painted theme. Kept under this name for `useStatusBarColor`. */
export type Theme = ResolvedTheme

interface ThemeContextValue {
  /** What the user chose (stored on this device). */
  preference: ThemePreference
  /** What the page paints, `resolveTheme(preference)`. */
  theme: Theme
  setPreference: (preference: ThemePreference) => void
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
 *
 * GATE 87 — THE PREFERENCE IS STORED, AND IT WAS ALREADY APPLIED BEFORE THIS
 * RENDERS. `index.html`'s inline script painted the stored choice before the
 * bundle ran (see `themePreference.ts`); the initialiser below reads the same
 * stored value through the same validator, so the first layout effect writes
 * the attribute the page already has. Writes happen in `setPreference` — an
 * event handler, never a state updater (StrictMode double-invokes updaters).
 * Another tab's change arrives through the `storage` event, which fires in
 * every OTHER same-origin tab and never in the writer.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference)
  const theme = resolveTheme(preference)

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
    document.documentElement.setAttribute('data-theme', themeAttribute(theme))
  }, [theme])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      // `key` is null when another tab cleared storage outright.
      if (event.key !== null && event.key !== THEME_STORAGE_KEY) return
      setPreferenceState(parseThemePreference(event.newValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setPreference = useCallback((next: ThemePreference) => {
    writeThemePreference(next)
    setPreferenceState(next)
  }, [])

  const value = useMemo(
    () => ({ preference, theme, setPreference }),
    [preference, theme, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside a ThemeProvider')
  return ctx
}
