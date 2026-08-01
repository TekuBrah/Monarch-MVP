import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Design-system token + component CSS. In local-alias mode this resolves to the
// DS's src/styles/package.css (source), in CI to its dist/index.css.
import '@monarch/design-system/styles.css'
import './index.css'
import App from './App'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found in index.html')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
