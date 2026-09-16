import { defineConfig } from '@playwright/test'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE OCR CORPUS HARNESS (Gate 55). NOT PART OF THE SUITE.
 *
 * `playwright.config.ts` sets `testDir: './e2e'`, so nothing under `scripts/`
 * is ever collected by `npm run test:e2e`. This config is the only way in, and
 * it is reached through `npm run ocr:corpus`.
 *
 * WHY IT IS NOT A SPEC IN THE SUITE: it reads photographs that are NOT in this
 * repo and must never be — the device receipts carry names, phone numbers,
 * addresses and card fragments — and it runs the real engine twenty times,
 * which is minutes, not seconds. It is an instrument for measuring the parser,
 * not a regression gate.
 *
 * THE BROWSER IS PINNED THE SAME WAY THE SUITE PINS IT (viewport, DPR, zone,
 * locale, the raster flag), so a number measured here is a number the suite's
 * own browser would produce. The viewport cannot affect recognition — the
 * engine never sees the page — but a second set of launch options is a second
 * thing to drift, so they are restated rather than invented.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default defineConfig({
  testDir: '.',
  testMatch: /corpus\.spec\.mjs$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 20 * 60_000,
  use: {
    baseURL: 'http://localhost:5174',
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    timezoneId: 'Asia/Kuala_Lumpur',
    locale: 'en-GB',
    launchOptions: { args: ['--disable-partial-raster'] },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
