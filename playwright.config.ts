import { defineConfig } from '@playwright/test'
import { SCREENSHOT_CAPTURE_OPTIONS } from './e2e/exact-pixels'
import { DEFAULT_VIEWPORT, DEVICE_SCALE_FACTOR } from './e2e/harness'

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
    // IMPORTED, NOT REPEATED. `e2e/harness.ts` owns these two values, and the
    // honesty guard asserts against the same objects — so the declared
    // viewport and the asserted viewport cannot drift apart. Writing `375`
    // here again would recreate exactly the hole Gate A closed.
    viewport: { width: DEFAULT_VIEWPORT.width, height: DEFAULT_VIEWPORT.height },
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
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
      // WHAT THE THREE SETTINGS GUARANTEE TOGETHER — AND WHERE THAT GUARANTEE
      // STOPS. Among the pixels the comparator COUNTS, one counts as different
      // if any channel differs by any amount (threshold), and zero such pixels
      // are tolerated (maxDiffPixels / maxDiffPixelRatio).
      //
      // THAT QUALIFIER IS LOAD-BEARING, AND AN EARLIER REVISION OF THIS COMMENT
      // OMITTED IT. It claimed flatly that "a pixel counts as different if ANY
      // channel differs by any amount", and that is FALSE. Playwright calls
      // pixelmatch WITHOUT `includeAA` (coreBundle.js:7550 forwards `threshold`
      // and nothing else; :6623 defaults `includeAA: false`), so at :6666 every
      // pixel the antialiasing heuristic flags is discarded AFTER the threshold
      // test and BEFORE the count. None of the three settings below can reach a
      // pixel that is never counted.
      //
      // WHAT THAT COST: twelve committed baselines recorded a button border the
      // app had stopped drawing, and the suite reported green for an entire
      // release. MAGNITUDE IS NOT THE DISCRIMINATOR, THINNESS IS — a 1px ring
      // changing by up to 51 per channel across ~773 px passed, while a 20x20
      // solid block shifted by ONE unit on ONE channel fails.
      //
      // THE HOLE IS CLOSED BY `expectExactPixels` (e2e/exact-pixels.ts), not by
      // anything here — there is no supported way to reach `includeAA`. These
      // three stay at zero: they are still the right settings for the coarse
      // check, and none of them may be loosened to make a red suite green.
      threshold: 0,
      maxDiffPixels: 0,
      maxDiffPixelRatio: 0,
      // THE CAPTURE SETTINGS ARE IMPORTED, NOT REPEATED — same reason as the
      // viewport above. `expectExactPixels` passes this very object to
      // `page.screenshot()`, so the baseline capture and the exact-check capture
      // cannot be taken under different settings. `scale: 'css'` keeps the
      // baselines 375px wide rather than 750px; DPR still governs how the page
      // is rasterised before the downscale, so a DPR change still shows up.
      ...SCREENSHOT_CAPTURE_OPTIONS,
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
