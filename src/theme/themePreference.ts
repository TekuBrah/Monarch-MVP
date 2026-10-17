/**
 * ─────────────────── THE THEME PREFERENCE — Gate 87 ───────────────────
 *
 * The user's appearance choice, kept on this device. It is a PREFERENCE, not
 * application data: it lives in `localStorage` under its own key, outside the
 * IndexedDB store (`persistence/store.ts`), outside the seed fingerprint, and
 * Reset data never touches it.
 *
 * ── PREFERENCE AND RESOLVED THEME ARE TWO CONCEPTS (RESUME ruling) ──
 *
 * Today both have exactly two values, and they are kept apart anyway:
 *  - `ThemePreference` is what the user CHOSE and what is stored.
 *  - `ResolvedTheme` is what the page PAINTS (`data-theme` on <html>).
 * `resolveTheme` is the one pure function between them. A future "System"
 * option, or the onboarding flow's Standard / Dimmed / High Contrast set
 * (Figma `I1266:14353;892:8440`), is a value added to `THEME_PREFERENCES` and a
 * branch added to `resolveTheme` — not a rewrite. Do NOT add a value here
 * without that product decision.
 *
 * ── THE PRE-PAINT SCRIPT RESTATES THIS LOGIC, AND A TEST HOLDS THEM TOGETHER ──
 *
 * `index.html` carries a classic inline script that runs before first paint
 * (the app renders only after `hydrate()`, up to 4 s later — `main.tsx`), so a
 * dark-mode tester never sees a light page. An HTML script cannot import this
 * module, so it repeats the same three steps — validate, resolve, apply — in
 * ES5. `e2e/settings.spec.ts` evaluates that script for every candidate stored
 * value and asserts it lands where `resolveTheme(parseThemePreference(v))`
 * does, and that it reads `THEME_STORAGE_KEY`. Change one, change both.
 */

/** The stored key. Namespaced like the store's database (`monarch-mvp`). */
export const THEME_STORAGE_KEY = 'monarch-mvp:theme'

/** Every value a preference may hold. The validator reads this list. */
export const THEME_PREFERENCES = ['light', 'dark'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

/** What the page paints. */
export type ResolvedTheme = 'light' | 'dark'

/** A missing, unknown or unreadable preference means this. */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'light'

/** Total: anything not on the list is the default. Never throws. */
export function parseThemePreference(raw: unknown): ThemePreference {
  return (THEME_PREFERENCES as readonly unknown[]).includes(raw)
    ? (raw as ThemePreference)
    : DEFAULT_THEME_PREFERENCE
}

/** The one place a preference becomes a painted theme. */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  switch (preference) {
    case 'light':
      return 'light'
    case 'dark':
      return 'dark'
  }
}

/**
 * The `data-theme` value for a resolved theme. The DS keys its dark tokens off
 * `[data-theme="dark"]` and its light ones off bare `:root`, so light is ''.
 */
export function themeAttribute(theme: ResolvedTheme): string {
  return theme === 'dark' ? 'dark' : ''
}

/** Reading storage can throw (blocked site data, some private modes). */
export function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME_PREFERENCE
  }
}

/**
 * Writing can throw too. The choice still applies for the session; it is just
 * not kept. Nothing is logged: the route walk fails on a console warning.
 */
export function writeThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // not kept on this device; the session keeps it
  }
}
