import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Poppins is NOT shipped by the design-system package — the DS loads it in its
// own showcase entry (showcase/main.tsx), which isn't part of the published
// surface. Without these imports --font-family-primary resolves to
// "'Poppins', sans-serif" with no @font-face registered, and every glyph
// silently falls back to sans-serif. Weights match the DS's: 400/500/600.
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'

// Design-system token + component CSS. In local-alias mode this resolves to the
// DS's src/styles/package.css (source), in CI to its dist/index.css.
import '@monarch/design-system/styles.css'
import './index.css'

import { ThemeProvider } from './theme/ThemeProvider'
import { AccountsProvider } from './accounts/AccountsProvider'
import { BudgetsProvider } from './budgets/BudgetsProvider'
import { hydrate } from './persistence/store'
import App from './App'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found in index.html')

/*
  GATE 85 (D-2): READ THE STORE, THEN RENDER — ONCE. Nothing renders until the
  stored state is known, so there is no frame of seed data to flash and a deep
  link to a user-created goal or budget resolves instead of being redirected
  away by its unknown-id backstop. Until then the page shows only the
  background `index.css` already paints. `hydrate()` never rejects: a missing,
  failing, slow (4 s) or newer-schema store still ends in a working app. When it
  resolves it sets `data-store` on #root — the readiness signal the harness waits
  for. A promise, not top-level await: the Vite build target (es2020) has none.
*/
void hydrate().then(() => {
  createRoot(rootEl).render(
    <StrictMode>
      <ThemeProvider>
        {/* App-level, above the router: the balance is read by four flows and
            written by three (inventory §4b W1), so it cannot be route-scoped. */}
        <AccountsProvider>
          {/* Flow 10 (Gate 67): budgets are derived from the ledger above, and
              must outlive a Finance tab switch and the drilldown route. */}
          <BudgetsProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </BudgetsProvider>
        </AccountsProvider>
      </ThemeProvider>
    </StrictMode>,
  )
})
