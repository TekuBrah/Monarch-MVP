import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Step 4.1 scaffold only.
// The dual-mode design-system linkage (conditional source alias +
// resolve.dedupe: ['react','react-dom'] + vite-plugin-svgr) is Step 4.2.
export default defineConfig({
  plugins: [react()],
  server: {
    // Pinned off the design system's default 5173. From step 4.4 onward both dev
    // servers run at once — the acceptance test is editing a token in the DS and
    // watching this app hot-reload — so a collision is the normal case, not an edge.
    // strictPort fails loudly instead of silently sliding to another port.
    port: 5174,
    strictPort: true,
  },
})
