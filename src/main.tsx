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
import App from './App'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found in index.html')

createRoot(rootEl).render(
  <StrictMode>
    <ThemeProvider>
      {/* App-level, above the router: the balance is read by four flows and
          written by three (inventory §4b W1), so it cannot be route-scoped. */}
      <AccountsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AccountsProvider>
    </ThemeProvider>
  </StrictMode>,
)
