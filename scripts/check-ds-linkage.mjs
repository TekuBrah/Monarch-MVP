#!/usr/bin/env node
/**
 * DS linkage guard — mechanical enforcement of the thing that has drifted three
 * times on this project and complained zero times.
 *
 * THE HISTORY THIS EXISTS FOR:
 *  1. CLAUDE.md claimed the pin was v1.0.0 while disk carried v1.4.0, across two
 *     DS releases. Found only because a gate went looking.
 *  2. `npm install` reported "up to date" TWICE on a git-tag re-pin and changed
 *     nothing, because the lockfile entry still carried an explicit `resolved`
 *     commit SHA. The fix is a targeted install, printed below on failure.
 *  3. The lock's *spec* line updated while its *resolution* line did not — a
 *     half-updated lock that must never be committed.
 *
 * WHAT IT COMPARES, all read at run time, nothing hardcoded:
 *   A. the ref in package.json's DS dependency          (e.g. v1.5.0)
 *   B. the version in the installed node_modules package (e.g. 1.5.0)
 *   C. the ref and resolved SHA in package-lock.json
 *   D. the DS working tree's HEAD and its tag — ONLY when the alias is active
 *
 * WHY D IS CONDITIONAL: `vite.config.ts` aliases to the sibling DS checkout only
 * when that folder exists. On CI it does not, and that is the NORMAL state, not
 * an error. A guard that fails in CI gets disabled, so the absent-folder case
 * exits 0 with the working-tree checks reported as skipped.
 *
 * Run: npm run lint:linkage        (exits non-zero on any disagreement)
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = path.resolve(import.meta.dirname, '..')
const DS_PKG = '@monarch/design-system'
// Kept in step with vite.config.ts's DS_SRC. If that path moves, move this too.
const DS_SRC = path.resolve(ROOT, '../Design system test/src')
const DS_REPO = path.resolve(DS_SRC, '..')

const problems = []
const notes = []
const fail = (id, detail, hint) => problems.push({ id, detail, hint })

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

/* ── A · the pin ───────────────────────────────────────────────────────── */
const pkg = readJson(path.join(ROOT, 'package.json'))
const pinSpec = pkg.dependencies?.[DS_PKG]
if (!pinSpec) {
  console.log(`FAIL — ${DS_PKG} is not a dependency of package.json.`)
  process.exit(1)
}
// "github:Owner/Repo#v1.5.0" -> "v1.5.0"
const pinRef = pinSpec.includes('#') ? pinSpec.slice(pinSpec.lastIndexOf('#') + 1) : null
if (!pinRef) {
  fail('pin-has-no-ref', `package.json pins ${DS_PKG} as "${pinSpec}" with no #ref`,
    'pin an explicit tag, e.g. github:TekuBrah/Monarch-Design-System#v1.5.0')
}
const pinVersion = pinRef?.replace(/^v/, '') ?? null

/* ── B · what is actually installed ────────────────────────────────────── */
const installedPkgPath = path.join(ROOT, 'node_modules', DS_PKG, 'package.json')
let installedVersion = null
if (!fs.existsSync(installedPkgPath)) {
  fail('not-installed', `${DS_PKG} is not present in node_modules`,
    'run: npm install')
} else {
  installedVersion = readJson(installedPkgPath).version
  if (pinVersion && installedVersion !== pinVersion) {
    fail('pin-vs-installed',
      `package.json pins ${pinRef} but node_modules holds ${installedVersion}`,
      `npm install is known to no-op here. Run it by name:\n` +
      `        npm install ${DS_PKG}@${pinSpec}\n` +
      `      then VERIFY — grep the dist for something only the new version has.`)
  }
}

/* ── C · the lockfile, both lines ──────────────────────────────────────── */
const lockPath = path.join(ROOT, 'package-lock.json')
let lockResolvedSha = null
if (!fs.existsSync(lockPath)) {
  fail('no-lockfile', 'package-lock.json is missing', 'run: npm install')
} else {
  const lock = readJson(lockPath)
  const lockSpec = lock.packages?.['']?.dependencies?.[DS_PKG]
  if (lockSpec && lockSpec !== pinSpec) {
    fail('lock-spec-vs-pin',
      `package.json pins "${pinSpec}" but the lock's spec line says "${lockSpec}"`,
      'the lock is out of step with the manifest — re-install by name (see above)')
  }
  const entry = lock.packages?.[`node_modules/${DS_PKG}`]
  const resolved = entry?.resolved ?? null
  lockResolvedSha = resolved && resolved.includes('#') ? resolved.slice(resolved.lastIndexOf('#') + 1) : null
  if (entry?.version && pinVersion && entry.version !== pinVersion) {
    fail('lock-version-vs-pin',
      `package.json pins ${pinRef} but the lock records version ${entry.version}`,
      're-install by name (see above)')
  }
}

/* ── D · the DS working tree — only when the alias is active ───────────── */
const aliasActive = fs.existsSync(DS_SRC)
if (!aliasActive) {
  notes.push(
    `alias INACTIVE — "${path.relative(ROOT, DS_SRC)}" does not exist, so Vite resolves ` +
    `${DS_PKG} through the package exports map. This is the normal CI state; ` +
    `working-tree checks skipped.',`.replace(/',$/, ''),
  )
} else {
  const git = (...args) => {
    try {
      return execFileSync('git', ['-C', DS_REPO, ...args], { encoding: 'utf8' }).trim()
    } catch {
      return null
    }
  }
  const head = git('rev-parse', 'HEAD')
  if (!head) {
    fail('ds-not-a-repo', `the DS folder exists at ${DS_REPO} but git could not read a HEAD there`,
      'the alias points at something that is not a checkout — fix the path or remove the folder')
  } else {
    const headTag = git('describe', '--tags', '--exact-match', 'HEAD')
    notes.push(`alias ACTIVE — DS working tree HEAD ${head.slice(0, 12)}` +
      (headTag ? ` (tag ${headTag})` : ' (NOT at a tag)'))

    // The working tree is what Vite actually compiles in dev and in a default
    // build, so it disagreeing with the pin means local != what the pin claims.
    if (pinRef && headTag !== pinRef) {
      fail('ds-worktree-vs-pin',
        `package.json pins ${pinRef} but the DS working tree is at ` +
        (headTag ? `tag ${headTag}` : `${head.slice(0, 12)}, which is not a tag`),
        `Vite compiles the WORKING TREE, so this is what you are actually running.\n` +
        `        cd "${DS_REPO}" && git checkout ${pinRef}\n` +
        `      or re-pin package.json to the tag you meant.`)
    }

    // The lock's resolution should be the commit the pinned tag points at.
    if (pinRef && lockResolvedSha) {
      const pinSha = git('rev-parse', `${pinRef}^{commit}`)
      if (pinSha && pinSha !== lockResolvedSha) {
        fail('lock-resolved-vs-pin',
          `the lock resolves to ${lockResolvedSha.slice(0, 12)} but ${pinRef} is ${pinSha.slice(0, 12)}`,
          'a half-updated lock: the spec moved and the resolution did not.\n' +
          `        npm install ${DS_PKG}@${pinSpec}`)
      }
    }
  }
}

/* ── report, in check-tokens.mjs's shape ───────────────────────────────── */
console.log('DS linkage guard — MVP manifest, lockfile, node_modules, DS checkout\n')
console.log(`  package.json pin    ${pinSpec ?? '(none)'}`)
console.log(`  node_modules        ${installedVersion ?? '(not installed)'}`)
console.log(`  lock resolved       ${lockResolvedSha ? lockResolvedSha.slice(0, 12) : '(none)'}`)
for (const n of notes) console.log(`  ${n}`)
console.log('')

if (problems.length === 0) {
  console.log('PASS — pin, lockfile, node_modules and DS checkout all agree.')
  process.exit(0)
}

console.log(`FAIL — ${problems.length} disagreement(s):\n`)
for (const p of problems) {
  console.log(`  [${p.id}]  ${p.detail}`)
  console.log(`      -> ${p.hint}`)
}
console.log('\nThis guard exists because none of these states announces itself:')
console.log('a stale pin renders the wrong tokens, and the suite goes green anyway.')
process.exit(1)
