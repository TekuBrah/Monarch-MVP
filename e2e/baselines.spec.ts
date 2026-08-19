import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type TestInfo } from '@playwright/test'
import { THEMES, VIEWPORTS, WALK, stateSlug } from './harness'

/**
 * THE BASELINE GUARD — Gate 10.
 *
 * WHY THIS EXISTS. `updateSnapshots: 'none'` in playwright.config.ts stops the
 * suite WRITING a baseline nobody asked for, and that is the bigger half of the
 * fix. It does not, however, see a baseline file that is ALREADY on disk: one
 * written before the option landed, one copied in by hand, or one orphaned by a
 * rename. Playwright only ever looks up the names its tests ask for, so a file
 * no test asks for is invisible to it — and an untracked file is exactly what a
 * blanket "Stage All" sweeps into a commit without comment. This project has
 * been bitten by untracked files three times (Gate 4 logo_monarch.svg, Gate 6
 * SectionHeader.css, Gate 7 the baseline batch).
 *
 * So this spec compares TWO LISTS OF FILENAMES: what is in the snapshot
 * directories on disk, and what git tracks there. It reads no image, writes
 * nothing, and takes no browser — which is also why it cannot depend on having
 * run before or after any other spec.
 *
 * The directories are DISCOVERED, from both sides, not transcribed: any
 * `*-snapshots` directory under e2e/ counts, whether it exists on disk, in the
 * index, or only in one of the two. A second spec file that starts minting
 * screenshots is covered the day it appears.
 */

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const E2E_DIR = resolve(REPO_ROOT, 'e2e')

/** Repo-relative, forward slashes — the shape `git ls-files` prints. */
function toRepoPath(absPath: string): string {
  return absPath.slice(REPO_ROOT.length + 1).replace(/\\/g, '/')
}

/** Is this path inside a Playwright snapshot directory? */
function isSnapshotPath(repoPath: string): boolean {
  return /(^|\/)[^/]+-snapshots\//.test(repoPath)
}

/**
 * Every file living under an `e2e/**\/*-snapshots/` directory on disk.
 *
 * Walked recursively rather than read flat: `snapshotPathTemplate` can be
 * configured to nest by project, and a guard that only looks one level deep
 * would quietly stop covering the files it exists for.
 */
function baselinesOnDisk(): string[] {
  const found: string[] = []

  const walk = (absDir: string, insideSnapshots: boolean): void => {
    let entries
    try {
      entries = readdirSync(absDir, { withFileTypes: true })
    } catch {
      return // the directory does not exist; the git side will report it
    }
    for (const entry of entries) {
      const abs = resolve(absDir, entry.name)
      if (entry.isDirectory()) {
        walk(abs, insideSnapshots || entry.name.endsWith('-snapshots'))
      } else if (insideSnapshots) {
        found.push(toRepoPath(abs))
      }
    }
  }

  walk(E2E_DIR, false)
  return found.sort()
}

/**
 * Every file git TRACKS under a snapshot directory.
 *
 * `git ls-files` reads the INDEX, so a baseline deleted from the working tree
 * is still listed here — which is precisely the "tracked but missing" case this
 * guard has to catch. `-z` because a filename is not a line.
 *
 * A failure to run git is raised, never swallowed: a guard that silently
 * degrades to "no tracked files" would pass on an empty list and be worse than
 * no guard at all.
 */
function baselinesInGit(): string[] {
  let stdout: string
  try {
    stdout = execFileSync('git', ['ls-files', '-z', '--', 'e2e'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
  } catch (cause) {
    throw new Error(
      `baseline guard: could not run \`git ls-files\` in ${REPO_ROOT}. The guard compares ` +
        `the snapshot directory against the git index, so it cannot report anything ` +
        `without it. Do not disable this test — fix the git invocation.`,
      { cause },
    )
  }

  return stdout
    .split('\0')
    .filter((p) => p !== '' && isSnapshotPath(p))
    .sort()
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE THIRD ARM — Gate 10a. THE ORPHAN.
   ═══════════════════════════════════════════════════════════════════════════

   The two tests above compare disk against git. A baseline that is BOTH tracked
   AND present is in both lists and passes them — even when no test asks for it
   any more. Gate 9's tab-rename control produced exactly that: `index-cards-*`
   became a name nothing requested, while `index-plastic-*` was the name the
   suite now wanted. Committed, it would have sat there asserting nothing.

   So this arm brings a THIRD list: the names the suite actually requests. It is
   DERIVED from the same source `visual.spec.ts` builds them from — `WALK`,
   `THEMES` and `stateSlug` are IMPORTED from harness.ts, never re-implemented —
   and the platform decoration comes from Playwright's own path resolver rather
   than from a hardcoded `-chromium-win32`.

   IT DOES NOT FAIL ON EXPECTED-BUT-ABSENT. That case already fails twice over:
   at `every baseline git tracks is present on disk` above, and at the visual
   test itself under `updateSnapshots: 'none'`. One problem shouting three times
   teaches people to skim.
   ═══════════════════════════════════════════════════════════════════════════ */

/** The spec that owns the baselines this arm can derive names for. */
const VISUAL_SPEC = 'visual.spec.ts'
const VISUAL_SNAPSHOT_DIR = `e2e/${VISUAL_SPEC}-snapshots`

/**
 * The exact expression `visual.spec.ts` hands to `toHaveScreenshot`.
 *
 * `stateSlug` is imported, so the SLUG cannot drift. What is left is the join —
 * slug, theme, extension — and reproducing that below would be re-implementing
 * naming logic, which is how a guard quietly starts auditing a name nobody
 * uses. So the join is checked against the source text rather than trusted.
 */
const NAME_EXPRESSION = 'toHaveScreenshot(`${stateSlug(state, viewport)}-${theme}.png`'

function assertNamingMatchesVisualSpec(): void {
  const specPath = resolve(E2E_DIR, VISUAL_SPEC)
  const source = readFileSync(specPath, 'utf8')

  expect(
    source.includes(NAME_EXPRESSION),
    `baseline guard: e2e/${VISUAL_SPEC} no longer builds its screenshot name as\n` +
      `    ${NAME_EXPRESSION}\n` +
      'so the expected-name set this test derives is no longer the set the suite asks ' +
      'for. Re-derive it here to match the spec — do NOT relax this check, and do not ' +
      'hand-write the names.',
  ).toBe(true)
}

/**
 * The ON-DISK FILENAME for a screenshot name — RESOLVED BY PLAYWRIGHT, not
 * assembled here.
 *
 * `testInfo.snapshotPath(name, { kind: 'screenshot' })` is documented as
 * returning the very path `toHaveScreenshot(name)` expects, so it applies the
 * whole transformation: `-chromium` from the project name, `-win32` from the
 * platform suffix, and the SANITISATION of the name itself.
 *
 * THAT LAST PART IS NOT THEORETICAL, and it is why this does not build the
 * filename by hand. A first attempt here extracted the `-chromium-win32`
 * decoration with a probe named `__baseline_guard_probe__.png` and concatenated
 * it onto the slug; the probe came back as `-baseline-guard-probe--chromium-
 * win32.png`. Playwright had rewritten the underscores. The current walk's
 * slugs are all `[a-z0-9-]` so nothing would have differed today — the guard
 * would have been right by luck, and wrong the day a slug carried a character
 * Playwright rewrites.
 *
 * Resolving a path creates nothing on disk. Only the basename is used: called
 * from this spec the directory component points at this spec's own snapshot
 * directory, while the filename transformation is per-project and identical for
 * both.
 */
function expectedFileName(testInfo: TestInfo, screenshotName: string): string {
  const resolved = basename(testInfo.snapshotPath(screenshotName, { kind: 'screenshot' }))

  if (!resolved.endsWith('.png')) {
    throw new Error(
      `baseline guard: Playwright resolved the screenshot name "${screenshotName}" to ` +
        `"${resolved}", which is not a .png. snapshotPathTemplate has been customised in a ` +
        `way this derivation cannot follow — fix the derivation; do not guess at filenames.`,
    )
  }

  return resolved
}

test.describe('baseline guard', () => {
  test('every baseline on disk is tracked by git', () => {
    const tracked = new Set(baselinesInGit())
    const untracked = baselinesOnDisk().filter((p) => !tracked.has(p))

    expect(
      untracked,
      'BASELINE GUARD — these baseline files exist on disk but git does NOT track them:\n\n' +
        untracked.map((p) => `    ${p}`).join('\n') +
        '\n\n' +
        'A baseline git does not track is a baseline nobody reviewed. Untracked files are ' +
        'what a blanket "Stage All" commits without comment, and a wrong baseline committed ' +
        'that way asserts the regression forever.\n\n' +
        'Deal with each file, by name:\n' +
        '  • `git add <file>` — if it is a baseline you meant to mint AND have looked at.\n' +
        '  • delete it — if it is a stray: a leftover from a renamed test, a copy, or a ' +
        'screenshot no test asks for.\n\n' +
        'Nothing here is fixed by re-running the suite, and NOT by ' +
        '`npm run test:e2e:update` — that writes baselines, it does not review them.',
    ).toEqual([])
  })

  test('every baseline git tracks is present on disk', () => {
    const onDisk = new Set(baselinesOnDisk())
    const missing = baselinesInGit().filter((p) => !onDisk.has(p))

    expect(
      missing,
      'BASELINE GUARD — git tracks these baseline files but they are NOT on disk:\n\n' +
        missing.map((p) => `    ${p}`).join('\n') +
        '\n\n' +
        'A baseline missing from the working tree is asserting nothing. Before Gate 10 the ' +
        'suite would simply write it back on the next run and go green on a file nobody ' +
        'reviewed; `updateSnapshots: \'none\'` now makes that a hard failure instead, and ' +
        'this test names the file.\n\n' +
        'Deal with each file, by name:\n' +
        '  • `git checkout -- <file>` — if it was deleted by accident. This restores the ' +
        'REVIEWED bytes, which re-running the suite does not.\n' +
        '  • `git rm <file>` — if the baseline is genuinely retired, e.g. a renamed tab or ' +
        'route orphaned it. Retiring one is a deliberate act that belongs in the commit ' +
        'message.',
    ).toEqual([])
  })

  // `{}` rather than `_`: Playwright requires the fixtures argument to be an
  // object destructuring pattern, and destructuring nothing out of it is what
  // keeps this test from pulling in a browser.
  test('every baseline on disk is a name the suite asks for', ({}, testInfo) => {
    assertNamingMatchesVisualSpec()

    const expected = new Set<string>()
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        for (const state of WALK) {
          const screenshotName = `${stateSlug(state, viewport)}-${theme}.png`
          expected.add(`${VISUAL_SNAPSHOT_DIR}/${expectedFileName(testInfo, screenshotName)}`)
        }
      }
    }

    // Sanitisation is many-to-one, so two distinct walk states could in principle
    // resolve to one filename — which would make a real baseline look like an
    // orphan. Cheap to rule out, and impossible to notice if it ever happened.
    expect(
      expected.size,
      `baseline guard: ${WALK.length} walk state(s) x ${VIEWPORTS.length} viewport(s) x ` +
        `${THEMES.length} theme(s) collapsed to ${expected.size} distinct filename(s). Two ` +
        'states share a baseline file, so one of them is asserting nothing. Fix the naming ' +
        'in e2e/harness.ts.',
    ).toBe(WALK.length * VIEWPORTS.length * THEMES.length)

    const onDisk = baselinesOnDisk()

    // A snapshot directory belonging to some OTHER spec is not an orphan — it is
    // a region this arm has no expected-name set for. Saying so is the honest
    // failure; calling those files orphans would send a reader hunting for a
    // deleted test that never existed.
    const foreign = onDisk.filter((p) => !p.startsWith(`${VISUAL_SNAPSHOT_DIR}/`))
    expect(
      foreign,
      'BASELINE GUARD — these baseline files live outside the one snapshot directory this ' +
        `check knows how to derive names for (${VISUAL_SNAPSHOT_DIR}):\n\n` +
        foreign.map((p) => `    ${p}`).join('\n') +
        '\n\n' +
        'A second spec has started minting screenshots, and the orphan check below is ' +
        'silently not covering it. EXTEND THIS TEST to derive that spec\'s expected names ' +
        'too — do not delete the files, and do not narrow the check to make this pass.',
    ).toEqual([])

    const orphans = onDisk.filter(
      (p) => p.startsWith(`${VISUAL_SNAPSHOT_DIR}/`) && !expected.has(p),
    )
    expect(
      orphans,
      'BASELINE GUARD — these baseline files are ORPHANS: they exist on disk, but no test ' +
        'in the suite asks for them:\n\n' +
        orphans.map((p) => `    ${p}`).join('\n') +
        '\n\n' +
        `The suite asks for exactly ${expected.size} names, built from ${WALK.length} walk ` +
        `state(s) x ${VIEWPORTS.length} viewport(s) x ${THEMES.length} theme(s) by ` +
        `e2e/${VISUAL_SPEC}. A file outside that set ` +
        'is asserting nothing: it is never compared against anything, it can never fail, and ' +
        'it will still be sitting there a year from now looking like coverage.\n\n' +
        'This is what a renamed tab, a renamed route or a deleted screen leaves behind — ' +
        'Gate 9 renamed one tab id and orphaned two baselines exactly this way.\n\n' +
        'The fix is `git rm <file>` if the test that owned it is gone. RE-RUNNING THE SUITE ' +
        'WILL NOT CLEAR IT, and neither will `npm run test:e2e:update` — nothing asks for ' +
        'the name, so nothing will ever write to it or notice it again. If instead the name ' +
        'looks like one the suite SHOULD be asking for, the walk is what is wrong: re-derive ' +
        'it in e2e/harness.ts rather than keeping the file.',
    ).toEqual([])
  })
})
