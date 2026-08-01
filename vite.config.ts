import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// Step 4.2 — dual-mode design-system linkage.
//
// The sibling folder's literal name is "Design system test" (the repo is named
// Monarch-Design-System on GitHub, but the local clone is not). Locked in during
// 4.1: direct path only, no multi-path probe or fallback search.
//
// Locally the sibling exists -> alias to DS *source* -> instant HMR on token edits.
// In CI it does not -> falls through to the pinned git dependency in package.json.
// One specifier, two modes.
const DS_SRC = path.resolve(__dirname, '../Design system test/src')
const DS_LOCAL = fs.existsSync(DS_SRC)

export default defineConfig({
  // svgr is required because the DS barrel re-exports Icon, whose icons.ts
  // imports 101 SVGs in `?react` form. In local-alias mode this app's Vite
  // transforms that DS source itself, so the DS's own vite.config.lib.ts svgr
  // setup is not in play. Without svgr the `?react` query falls back to asset
  // handling, the default export becomes a URL string, and the failure surfaces
  // at render as "Element type is invalid" — not as a build error.
  plugins: [react(), svgr()],
  resolve: {
    // Order matters: Vite matches string aliases by prefix, so the specific
    // subpath must come before the bare specifier or `/styles.css` would be
    // appended to DS_SRC and resolve to a file that does not exist.
    alias: DS_LOCAL
      ? {
          // Hardcodes the DS's internal file location, because the DS's exports
          // map only defines the dist-mode path ("./styles.css" -> "./dist/index.css").
          // If the DS ever moves src/styles/package.css, this alias goes stale
          // SILENTLY — no build error — and must be updated here.
          '@monarch/design-system/styles.css': path.resolve(
            DS_SRC,
            'styles/package.css',
          ),
          '@monarch/design-system': DS_SRC,
        }
      : {},
    // Two React copies is *the* classic failure mode when linking a React
    // component library from source; it surfaces as "Invalid hook call" with a
    // stack trace that points nowhere useful.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    // Pinned off the design system's default 5173. From step 4.4 onward both dev
    // servers run at once — the acceptance test is editing a token in the DS and
    // watching this app hot-reload — so a collision is the normal case, not an edge.
    // strictPort fails loudly instead of silently sliding to another port.
    port: 5174,
    strictPort: true,
  },
})
