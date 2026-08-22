#!/usr/bin/env node
/**
 * Production-path build — the one command that compiles what Netlify compiles.
 *
 * `vite.config.ts` aliases `@monarch/design-system` to the sibling DS *source*
 * whenever `../Design system test/src` exists, which is every local machine and
 * no CI machine. The consequence, proven by sourcemap at the content-column
 * Gate 2: a local `npm run build` draws 169 of its 210 sources from the DS
 * working tree and ZERO from `node_modules/@monarch`. Production does the
 * opposite. So no local command exercised the path production takes, and a
 * dist-only breakage would surface first on deploy.
 *
 * This forces `MONARCH_DS_FROM_PACKAGE`, which flips the alias off and lets the
 * specifier resolve through the DS package's `exports` map instead.
 *
 * WHY A WRAPPER RATHER THAN AN INLINE ENV ASSIGNMENT: npm runs scripts through
 * `cmd.exe /d /s /c` on Windows, where `VAR=value cmd` is a syntax error, so
 * `"build:package": "MONARCH_DS_FROM_PACKAGE=1 vite build"` would work on POSIX
 * and fail here. The alternative is a `cross-env` dependency for one variable
 * this repo does not otherwise need.
 *
 * Arguments are passed through, so the sourcemap comparison the gates use is:
 *   node scripts/build-from-package.mjs --sourcemap --outDir <dir> --emptyOutDir
 *
 * Run: npm run build:package        (typechecks first, as `npm run build` does)
 */

import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)

console.log('building with MONARCH_DS_FROM_PACKAGE=1 — DS resolves through the')
console.log('package `exports` map, not the sibling working tree.\n')

const result = spawnSync('npx', ['vite', 'build', ...args], {
  stdio: 'inherit',
  // The variable is the whole point; everything else is inherited unchanged.
  env: { ...process.env, MONARCH_DS_FROM_PACKAGE: '1' },
  // Required on Windows: `npx` is a .cmd shim and is not directly executable.
  shell: true,
})

if (result.error) {
  console.error('\nFAIL — could not spawn the build: ' + result.error.message)
  process.exit(1)
}
process.exit(result.status ?? 1)
