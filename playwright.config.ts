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

    // THE RASTER PATH IS PINNED, AND THIS IS THE THIRD AXIS THAT HAD TO BE.
    //
    // Chromium's PARTIAL RASTER re-rasterises only the invalidated region of a
    // tile and reuses the rest. Whether any given repaint takes the partial or
    // the full path depends on invalidation history, and that varies BETWEEN
    // BROWSER PROCESSES. An antialiased edge re-rastered by the two paths can
    // round to different coverage — hence a +/-1 per channel difference on the
    // same geometry.
    //
    // MEASURED AT GATE 17, n=40 fresh browser processes per configuration,
    // on `/finance/holding/fd` dark:
    //   default                      2 render populations, 22.5% mismatch
    //   + finish all animations      2 populations, 30.0%   <- H1 REFUTED
    //   + inject transition:none     2 populations, 60.0%   <- made it WORSE
    //   --disable-gpu                2 populations, 17.5%
    //   --disable-partial-raster     1 population, 40/40, matching the
    //                                committed baseline exactly
    //
    // The layout was identical in both populations — box [16,690,60.5,716] to
    // four decimals, same fonts, same text — so this was never a layout, font
    // or transition problem. Only the raster differed.
    //
    // DO NOT ADD `--disable-lcd-text` HERE. It was tested and it INTRODUCES a
    // second population of its own (bimodal at n=40, both alone and combined
    // with --disable-gpu). More flags is not safer.
    //
    // This changes how the app is MEASURED, never how it renders for a user;
    // no app CSS was touched and no tolerance was widened. `threshold`,
    // `maxDiffPixels` and `maxDiffPixelRatio` all remain 0.
    launchOptions: {
      args: ['--disable-partial-raster'],
    },

    trace: 'retain-on-failure',
  },

  expect: {
    toHaveScreenshot: {
      // STRICT — AND `threshold` IS THE LOAD-BEARING THIRD SETTING.
      //
      // The two maxDiff* settings alone do NOT mean "a single changed pixel is
      // a finding", which is what this comment used to claim. They bound HOW
      // MANY pixels may be counted as different; they do not decide WHAT counts
      // as different. That is `threshold`'s job, and Playwright's default is
      // 0.2 — pixelmatch only counts a pixel once its YIQ delta exceeds
      // `35215 * threshold * threshold`, i.e. 1408.6 at the default. See
      // playwright-core/lib/coreBundle.js:6659 (the maxDelta formula) and :7551
      // (`threshold: options.threshold ?? 0.2`). Any colour shift under that bar
      // was invisible to this suite, however many pixels carried it.
      //
      // MEASURED, NOT THEORISED. With `threshold` unset, 20 of the 42 committed
      // baselines were stale against what the dev server actually rendered —
      // the entire DS v1.5.0 dark token shift — and the suite reported 132
      // passed. Ground truth: the committed `index-dark` baseline holds the
      // balance-card switch label at rgb(3,88,204) (--alias-primary-600, the
      // v1.4.0 mapping) where the live render paints rgb(4,110,255)
      // (--alias-primary-500, the v1.5.0 mapping).
      //
      // WHAT THE THREE SETTINGS NOW GUARANTEE TOGETHER: a pixel counts as
      // different if ANY channel differs by any amount (threshold), and zero
      // such pixels are tolerated (maxDiffPixels / maxDiffPixelRatio). A real
      // change is re-minted deliberately with `npm run test:e2e:update`, never
      // absorbed here — and none of the three may be loosened to make a red
      // suite green.
      threshold: 0,
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
