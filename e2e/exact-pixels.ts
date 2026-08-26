import { readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { basename, relative } from 'node:path'
import { expect, type Page, type PageScreenshotOptions, type TestInfo } from '@playwright/test'

/**
 * THE EXACT CHECK — Gate 30.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT `toHaveScreenshot` CANNOT SEE, AND WHY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Playwright compares screenshots with pixelmatch, and it calls pixelmatch
 * WITHOUT PASSING `includeAA`. From the installed 1.62.1 sources:
 *
 *   playwright-core/lib/coreBundle.js:7550
 *     count = pixelmatch(expected.data, actual.data, diff.data, w, h, {
 *       threshold: options.threshold ?? 0.2
 *     })                                  <- the ONLY option forwarded
 *
 *   playwright-core/lib/coreBundle.js:6623
 *     includeAA: false,                   <- so the default applies
 *
 *   playwright-core/lib/coreBundle.js:6666
 *     if (Math.abs(delta) > maxDelta) {
 *       if (!options.includeAA && (antialiased(img1, ...) ||
 *                                  antialiased(img2, ...))) {
 *         // painted yellow in the diff, and NOT counted
 *       } else {
 *         diff2++;
 *       }
 *     }
 *
 * The antialiasing heuristic runs AFTER the `threshold` test and BEFORE the
 * count. So a pixel it flags is discarded before `threshold`, `maxDiffPixels`
 * and `maxDiffPixelRatio` ever get a say. Setting all three to zero — which
 * this project did at content-column Gate 1, and which was a real improvement —
 * cannot reach a pixel that is never counted in the first place.
 *
 * `antialiased()` (coreBundle.js:6684) flags a pixel that has AT MOST TWO
 * neighbours identical to itself and has both a darker and a brighter
 * neighbour, where that neighbour has three or more identical siblings in BOTH
 * images. That is a precise description of a THIN FEATURE on a soft edge:
 * borders, dividers, focus rings, hairlines, underlines, 1px separators.
 *
 * MAGNITUDE IS NOT THE DISCRIMINATOR. THINNESS IS. A 1px ring changing colour
 * by up to 51 per channel across ~773 pixels is a real design-system change and
 * it passed invisibly; a 20x20 solid block shifted by ONE unit on ONE channel is
 * trivial and it fails. See CLAUDE.md for the two controls in full.
 *
 * THIS COST REAL CORRECTNESS. Twelve committed baselines recorded a button
 * border the app had stopped drawing, and the suite reported green for an entire
 * release. Gate 29 repaired them with a mechanism that bypassed the comparator
 * entirely. Nothing prevented a recurrence until this file existed.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY THIS IS A SECOND CHECK RATHER THAN A REPLACEMENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * There is NO supported way to reach `includeAA`. `getComparator(mimeType)`
 * (coreBundle.js:7501) is a hard mimeType switch with no registry, and
 * `options.comparator` accepts only `"pixelmatch"` or `"ssim-cie94"` — anything
 * else throws (:7552). So the comparison cannot be swapped in place.
 *
 * Replacing `toHaveScreenshot` outright would mean reimplementing its
 * capture-and-retry loop (coreBundle.js:22224-22247), which is what suppresses
 * flake from fonts, animation settling and lazy rendering — and would forfeit
 * the diff-PNG artifact, the `updateSnapshots: 'none'` missing-baseline
 * failure, and the `-u` write path this project's whole discipline sits on.
 *
 * SO IT RUNS ALONGSIDE, AND THE COST IS ONE EXTRA CAPTURE. That cost is real
 * and it is bounded: it is a capture and a `Buffer.compare`, not a second
 * navigation, theme toggle, tab click, font wait or page load.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT IT DOES AND DOES NOT COVER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * COVERS: any difference between the committed baseline and what the app
 * renders, at any magnitude, on any pixel, thin features included.
 *
 * DOES NOT COVER:
 *  - the CONTENT of a baseline. Nothing here reviews pixels; a deliberate
 *    `test:e2e:update` still writes what the app currently renders.
 *  - states the walk does not visit. This is a stricter comparison of the same
 *    24 states, not more states.
 *  - PNG ENCODING. The predicate is `Buffer.compare`, so two byte streams that
 *    decode to identical pixels would be reported as different. That is the same
 *    predicate `--update-snapshots=all` uses to decide whether to rewrite
 *    (expect.js:12652), so the check and the repair command agree by
 *    construction — and Chromium's PNG output is byte-deterministic for
 *    identical pixels, which the Gate 30 positive control measured.
 */

/**
 * THE CAPTURE OPTIONS, DECLARED ONCE.
 *
 * `playwright.config.ts` spreads this into `expect.toHaveScreenshot` and this
 * module passes the same object to `page.screenshot()`. ONE OBJECT, TWO
 * CONSUMERS — so the baseline capture and the exact-check capture cannot be
 * taken under different settings without someone editing this literal.
 *
 * This is the Gate A `DEFAULT_VIEWPORT` pattern, and it is here for the same
 * reason: two literals that agree today is the shape of every drift this
 * project has been bitten by. If these two captures ever disagreed on
 * `animations`, `caret` or `scale`, the exact check would fail on all 96 states
 * for a reason that has nothing to do with the app.
 *
 * `fullPage` is deliberately NOT here. Playwright lists it in
 * `NonConfigProperties` (playwright/lib/matchers/expect.js:12392) and refuses to
 * read it from config, so it must come from the call site — which is why the
 * call site passes ONE options object to both calls.
 */
export const SCREENSHOT_CAPTURE_OPTIONS = {
  animations: 'disabled',
  caret: 'hide',
  scale: 'css',
} as const satisfies Pick<PageScreenshotOptions, 'animations' | 'caret' | 'scale'>

/** The per-call half of the capture options — what config cannot carry. */
export type ExactPixelOptions = Pick<PageScreenshotOptions, 'fullPage'>

/**
 * Assert the live render is BYTE-IDENTICAL to the committed baseline.
 *
 * Call it AFTER `toHaveScreenshot` with the same name and the same options.
 * The ordering is deliberate: `toHaveScreenshot` runs first so a coarse
 * regression is reported through Playwright's own diff artifacts, and this
 * check only ever speaks up about something the comparator let through.
 *
 * NO RETRY, ON PURPOSE. `retries: 0` and `workers: 1` are this config's stance,
 * for the reason stated there — "a retry would silently paper over exactly the
 * flakiness this harness exists to surface". A flake here is a finding to be
 * diagnosed, not absorbed.
 */
export async function expectExactPixels(
  page: Page,
  testInfo: TestInfo,
  screenshotName: string,
  options: ExactPixelOptions = {},
): Promise<void> {
  // AN UPDATE RUN OWNS THE BASELINE, SO THIS CHECK STANDS ASIDE.
  //
  // Under `--update-snapshots=all` the baseline on disk IS the stabilised
  // capture Playwright just wrote (expect.js:12649-12653, which decides the
  // write with `Buffer.compare`). Re-capturing a third time and asserting
  // against a file written moments ago would make the repair command unable to
  // finish, which is precisely what Item 2 of this gate exists to fix.
  //
  // Under the shipped `updateSnapshots: 'none'` this is never taken.
  if (testInfo.config.updateSnapshots !== 'none') return

  // RESOLVED BY PLAYWRIGHT, NOT ASSEMBLED. The same call `baselines.spec.ts`
  // uses, and for the same reason: Playwright SANITISES the screenshot name,
  // and it supplies the `-chromium` project decoration and the `-win32`
  // platform suffix. A hand-built path is right by luck until a slug carries a
  // character Playwright rewrites.
  const baselinePath = testInfo.snapshotPath(screenshotName, { kind: 'screenshot' })

  let expected: Buffer
  try {
    expected = readFileSync(baselinePath)
  } catch (cause) {
    // Unreachable under `updateSnapshots: 'none'` — `toHaveScreenshot` hard-fails
    // on a missing baseline before this runs. Raised rather than swallowed so a
    // future config change cannot turn this check into a silent no-op.
    throw new Error(
      `exact check: no baseline at ${baselinePath}. This check compares the committed ` +
        'bytes against the live render, so it cannot report anything without the file. ' +
        'Do not skip this — restore the baseline with `git checkout -- <file>`.',
      { cause },
    )
  }

  const actual = await page.screenshot({ ...SCREENSHOT_CAPTURE_OPTIONS, ...options, type: 'png' })

  if (Buffer.compare(actual, expected) === 0) return

  // The bytes differ AND `toHaveScreenshot` passed, which it must have done to
  // reach this line. With `threshold: 0` and `maxDiffPixels: 0` the comparator
  // fails as soon as it COUNTS one pixel, so every differing pixel here was
  // discarded by the antialiasing heuristic. That deduction is why the message
  // can name the cause rather than guess at it.
  //
  // WRITTEN TO A FILE, NOT JUST ATTACHED. `testInfo.attach({ body })` alone
  // leaves the bytes inside trace.zip, and the shipped reporter is `list` — so
  // a message saying "attached" would point at something the reader cannot open
  // without unpacking a trace. Measured: on the Gate 30 negative control the
  // failure directory held only `trace.zip` and `error-context.md`. Writing it
  // next to Playwright's own `-actual`/`-expected`/`-diff` artifacts is what
  // makes it openable.
  const outputPath = testInfo.outputPath(`${screenshotName.replace(/\.png$/, '')}-exact-actual.png`)
  await writeFile(outputPath, actual)
  await testInfo.attach(basename(outputPath), { path: outputPath, contentType: 'image/png' })

  expect(
    Buffer.compare(actual, expected),
    'EXACT PIXEL CHECK — the committed baseline is NOT what the app renders.\n\n' +
      `    baseline  ${relative(process.cwd(), baselinePath).replace(/\\/g, '/')} (${expected.length} bytes)\n` +
      `    rendered  ${actual.length} bytes, written to ${relative(process.cwd(), outputPath).replace(/\\/g, '/')}\n\n` +
      '`toHaveScreenshot` PASSED on this same state moments ago. That is not a contradiction ' +
      'and it is not flake — it is the blind spot this check exists for. Playwright calls ' +
      'pixelmatch without `includeAA`, so every pixel its antialiasing heuristic flags is ' +
      'discarded BEFORE `threshold`, `maxDiffPixels` and `maxDiffPixelRatio` are consulted ' +
      '(playwright-core/lib/coreBundle.js:6666, :7550). With all three set to zero the ' +
      'comparator fails on the first pixel it counts — so if it passed, every differing ' +
      'pixel here is one it discarded. The difference is confined to THIN FEATURES: a ' +
      'border, a divider, a focus ring, a hairline, an underline, a 1px separator.\n\n' +
      'THIS IS A FINDING. Diagnose it before touching the baseline:\n' +
      '  - find what changed. A DS re-pin is the usual cause and a border or divider token ' +
      'is the usual binding. Name the binding.\n' +
      '  - if the change is INTENDED, re-mint with `npm run test:e2e:update` (which runs ' +
      '`--update-snapshots=all`, the only mode that can rewrite a baseline this comparator ' +
      'calls green) and say what changed in the commit message.\n' +
      '  - if it is NOT intended, the app regressed. Fix the app.\n\n' +
      'DO NOT loosen `threshold`, `maxDiffPixels` or `maxDiffPixelRatio` — none of them ' +
      'can affect this check, and widening a tolerance to green a red suite is the exact ' +
      'failure this gate exists to prevent.',
  ).toBe(0)
}
