import { defineConfig } from '@playwright/test'

/**
 * Gate 7 — the browser test harness.
 *
 * WHY THIS EXISTS. Every verification in Gates 1–6 was hand-measured through a
 * browser, one value at a time. That cost three specific things:
 *
 *  1. An UNCONTROLLED devicePixelRatio made an inertness proof ambiguous and
 *     took two round-trips to resolve. `deviceScaleFactor` below is pinned for
 *     exactly that reason, and `e2e/routes.spec.ts` re-asserts it AT RUNTIME —
 *     a config value nobody checks is a value that can silently drift.
 *  2. A section-header bypass survived in the codebase because nothing swept
 *     for it. `e2e/section-headers.spec.ts` is that sweep.
 *  3. There was no screenshot capability at all, so visual regressions were
 *     invisible. `e2e/visual.spec.ts` is the net.
 *
 * DETERMINISM IS THE WHOLE POINT, so every axis that could drift is nailed
 * down here rather than per-spec: viewport, DPR, timezone, locale, worker
 * count, retry count. A harness that measures a moving target measures nothing.
 */
export default defineConfig({
  testDir: './e2e',

  // One target, one worker, no retries. Parallel workers would share the one
  // dev server and interleave console output across pages; a retry would
  // silently paper over exactly the flakiness this harness exists to surface.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,

  reporter: [['list']],

  // GATE 10 — THE SILENT-BASELINE HOLE, CLOSED AT THE SOURCE.
  //
  // Playwright's default is `'missing'`: a `toHaveScreenshot` name with no
  // baseline on disk is WRITTEN, announced as a failure exactly once, and green
  // on every run after that. Gate 9 measured it — a tracked baseline was deleted
  // and the suite run twice with no `--update` anywhere: run 1 failed and wrote
  // the file, run 2 reported 129 passed. `npx playwright test --help` states the
  // default in as many words: "Running tests without the flag defaults to
  // 'missing'".
  //
  // `'none'` means no snapshot is ever written by an ordinary run, so a missing
  // baseline fails EVERY run until a human deals with it. `npm run
  // test:e2e:update` still works — the `-u` flag on the command line overrides
  // this — which is the correct split: writing a baseline becomes a deliberate,
  // named act rather than a side effect of running the suite.
  //
  // This also closes the same hole on a non-Windows machine: every baseline
  // here is suffixed `-chromium-win32`, so elsewhere every name resolves to a
  // file that does not exist. That used to write a fresh, unreviewed set and
  // pass; it now fails 42 times.
  updateSnapshots: 'none',

  use: {
    baseURL: 'http://localhost:5174',

    // 375 x 812 is the frame every Figma screen is drawn at, and the width the
    // MVP's CSS is authored against. DPR 2 is NOT optional and NOT cosmetic —
    // see note 1 above.
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: true,

    // The app derives every date from `TODAY = new Date()` (src/data/today.ts),
    // and formats money with `Intl.NumberFormat('en-MY')`. Pinning the zone and
    // locale removes the two remaining machine-dependent inputs; the SPECS pin
    // the instant itself with `page.clock.setFixedTime()`.
    timezoneId: 'Asia/Kuala_Lumpur',
    locale: 'en-GB',

    trace: 'retain-on-failure',
  },

  expect: {
    toHaveScreenshot: {
      // Strict. A single changed pixel is a finding, not noise — if a real
      // change lands, the baseline is updated deliberately with
      // `npm run test:e2e:update`, never loosened here.
      maxDiffPixels: 0,
      maxDiffPixelRatio: 0,
      // CSS-pixel output keeps the baselines at 375px wide rather than 750px.
      // DPR still governs how the page is rasterised before the downscale, so
      // a DPR change still shows up as a diff — this only controls file size.
      scale: 'css',
      animations: 'disabled',
      caret: 'hide',
    },
  },

  projects: [
    {
      // Chromium only. We ship one target; a Firefox/WebKit baseline would be
      // three times the pixels for a browser nothing is verified against.
      //
      // DELIBERATELY NOT `...devices['Desktop Chrome']`. A project's `use`
      // OVERRIDES the top-level `use`, and that device descriptor carries its
      // own `viewport: 1280x720` and `deviceScaleFactor: 1` — spreading it here
      // would silently undo both pins above, which is precisely the defect this
      // harness was built to eliminate.
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    // Locally the dev server is normally already up (and `strictPort` in
    // vite.config.ts means a second one would hard-fail rather than slide to
    // another port). In CI, always start a clean one.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
