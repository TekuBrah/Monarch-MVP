#!/usr/bin/env node
/**
 * Token guardrail — mechanical enforcement of CLAUDE.md rule 2:
 * "Never write a raw color, radius, spacing, or font value.
 *  Only var(--mapped-*) / var(--responsive-*)."
 *
 * Scope is MVP source ONLY. node_modules, dist, and the design-system folder
 * are never scanned: the DS has its own discipline and a documented history of
 * deliberate FAIL-LOUD literals, and flagging those here would be noise this
 * script has no business producing.
 *
 * Run: npm run lint:tokens        (exits non-zero on any violation)
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SCAN_DIRS = ['src']
const SCAN_FILES = ['index.html']
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html'])
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.vite', 'coverage'])

/**
 * Escape hatch, mirroring the design system's FAIL-LOUD comment convention.
 * A line carrying this marker is skipped, and the reason is printed in the
 * summary so exemptions stay visible instead of accumulating silently.
 *   e.g.  padding: 3px; /* token-exempt: off-ramp value, needs a Figma var *​/
 */
const EXEMPT = /token-exempt:\s*(.+)/

/**
 * Is `index` inside a media QUERY CONDITION on this line?
 *
 * The condition is the part between `@media` and the `{` that opens its
 * block. With no `{` on the line the condition runs to the end of the line,
 * which is the ordinary multi-line spelling. ANYTHING PAST THAT BRACE IS A
 * DECLARATION BLOCK and gets no allowance — that is the whole point.
 *
 * The brace is searched for FROM the `@media`, not from the start of the
 * line, so a nested `@media` inside an already-open rule still resolves its
 * own condition rather than reading the outer rule's brace.
 *
 * The line is expected to be COMMENT-STRIPPED, so `@media` written inside a
 * comment cannot open a condition.
 */
function inMediaCondition(line, index) {
  const AT = '@media'
  for (let at = line.indexOf(AT); at !== -1; at = line.indexOf(AT, at + AT.length)) {
    const brace = line.indexOf('{', at)
    const end = brace === -1 ? line.length : brace
    if (index >= at && index < end) return true
  }
  return false
}

const RULES = [
  {
    id: 'raw-hex-color',
    // Exactly 3/4/6/8 hex digits, so CSS id selectors like #root don't match.
    re: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g,
    hint: 'use var(--mapped-*) / var(--alias-*)',
  },
  {
    id: 'raw-color-function',
    re: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\s*\(/g,
    hint: 'use var(--mapped-*), or color-mix() on a real token if a tint is needed',
  },
  {
    id: 'raw-px',
    re: /(?<![\w-])(\d*\.?\d+)px\b/g,
    hint: 'use var(--spacing-*) / var(--brand-scale-*)',
    // TWO allowances, and both are MATCH-scoped:
    //
    //   - 0px is dimensionless in effect — no token expresses "nothing".
    //   - a raw px inside a MEDIA CONDITION is unavoidable. CSS custom
    //     properties are INVALID in a media condition — a hard CSS
    //     limitation, not a style preference — so a breakpoint cannot be
    //     written with a token and must be allowed to be a literal.
    //
    // THE MEDIA ALLOWANCE WAS LINE-SCOPED UNTIL GATE 18, and that exempted
    // the whole physical line rather than the condition on it. A single-line
    // `@media (min-width: 768px) { .x { max-width: 430px } }` therefore slid
    // a raw DECLARATION through with no `token-exempt` marker and no report,
    // while the identical declaration written on its own line was flagged.
    // The frame max-width would have been its first user. Proven by fixture,
    // not by reading the regex — see CLAUDE.md.
    allow: (m, line) => parseFloat(m[1]) === 0 || inMediaCondition(line, m.index),
  },
  {
    // ── GUARD B (Gate D) — THE VIEWPORT-WIDTH UNIT IS BANNED AT SOURCE. ──
    //
    // WHY A LINTER RULE AND NOT A TEST. `100vw` INCLUDES the classic scrollbar
    // gutter; the initial containing block — what a percentage resolves
    // against for a `position: fixed` element — does NOT. Measured on the live
    // deploy in real Windows Chrome, `innerWidth - documentElement.clientWidth`
    // is 15, so `100vw` reads 667.8 where `100%` reads 652.8, and a
    // `100vw`-derived inset centres the fixed chrome 7.5px off — on every
    // desktop visitor, forever.
    //
    // HEADLESS CHROMIUM REPORTS A ZERO-WIDTH SCROLLBAR AT EVERY WIDTH. In
    // headless `innerWidth === clientWidth`, so a `100vw` implementation and a
    // `100%` implementation are INDISTINGUISHABLE to the browser harness:
    // every computed-geometry assertion and every screenshot compares green
    // either way. The defect is invisible to the instrument that would
    // otherwise catch it, which is precisely why the ban lives here — in the
    // one check that reads source text rather than a rendered page.
    //
    // THE BAN IS BLANKET RATHER THAN SCOPED TO FIXED CHROME, DELIBERATELY. A
    // line-based check cannot know whether the rule it is looking at carries
    // `position: fixed`; deciding that would mean parsing blocks, and a check
    // that is fragile about WHERE it applies fails open on the very case it
    // exists for. `src/` contained ZERO `vw` units when this shipped, so the
    // blanket form costs nothing, and a genuinely justified one takes the same
    // `token-exempt: <reason>` marker every other deliberate exception here
    // takes. That is the EXISTING escape hatch, not a new one.
    //
    // The dynamic variants are included because they share the mechanism: all
    // of them measure the viewport, and the initial containing block is not
    // the viewport when a classic scrollbar is present.
    id: 'viewport-width-unit',
    re: /(?<![\w-])(?:\d*\.?\d+)(?:vw|svw|lvw|dvw)\b/g,
    hint:
      'use 100% — vw includes the scrollbar gutter and the initial containing ' +
      'block does not, so a vw-derived inset mis-centres fixed chrome by half ' +
      'the scrollbar width, invisibly to a headless harness',
  },
  {
    id: 'raw-font',
    re: /(?:font-family|fontFamily|(?<![\w-])font)\s*:\s*([^;\n}]+)/g,
    hint: 'use var(--font-family-primary) or a .type-* class',
    allow: (m) => /var\(|inherit|unset|initial|revert/.test(m[1]),
  },
]

/** Blank out comments while preserving line/column positions. */
function stripComments(src, ext) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  if (ext === '.html') {
    out = out.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
  }
  if (ext !== '.css' && ext !== '.html') {
    // Line comments, but never the // in a URL scheme.
    out = out.replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length))
  }
  return out
}

function collectFiles() {
  const files = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name))
      } else if (EXTS.has(path.extname(e.name))) {
        files.push(path.join(dir, e.name))
      }
    }
  }
  for (const d of SCAN_DIRS) {
    const p = path.join(ROOT, d)
    if (fs.existsSync(p)) walk(p)
  }
  for (const f of SCAN_FILES) {
    const p = path.join(ROOT, f)
    if (fs.existsSync(p)) files.push(p)
  }
  return files
}

const violations = []
const exemptions = []
const files = collectFiles()

for (const file of files) {
  const ext = path.extname(file)
  const raw = fs.readFileSync(file, 'utf8')
  const rawLines = raw.split(/\r?\n/)
  const lines = stripComments(raw, ext).split(/\r?\n/)
  const rel = path.relative(ROOT, file).replace(/\\/g, '/')

  lines.forEach((line, i) => {
    // Read the marker from the RAW line — comment stripping would erase it.
    const ex = EXEMPT.exec(rawLines[i])
    if (ex) {
      const reason = ex[1].replace(/\*\/.*$/, '').replace(/-->.*$/, '').trim()
      exemptions.push(`${rel}:${i + 1}  ${reason}`)
      return
    }
    for (const rule of RULES) {
      rule.re.lastIndex = 0
      let m
      while ((m = rule.re.exec(line)) !== null) {
        // `line` is passed so an allowance can be position-aware. It is the
        // COMMENT-STRIPPED line, which is what makes `@media` in a comment
        // unable to grant anything.
        if (rule.allow && rule.allow(m, line)) continue
        violations.push({
          loc: `${rel}:${i + 1}:${m.index + 1}`,
          id: rule.id,
          text: m[0].trim(),
          hint: rule.hint,
        })
      }
    }
  })
}

console.log(`token guardrail — scanned ${files.length} file(s) in MVP source\n`)

if (exemptions.length) {
  console.log(`${exemptions.length} exemption(s) in force:`)
  for (const e of exemptions) console.log(`  ${e}`)
  console.log('')
}

if (violations.length === 0) {
  console.log('PASS — no raw color, px, or font literals found.')
  process.exit(0)
}

console.log(`FAIL — ${violations.length} violation(s):\n`)
for (const v of violations) {
  console.log(`  ${v.loc}  [${v.id}]  ${v.text}`)
  console.log(`      -> ${v.hint}`)
}
console.log('\nCLAUDE.md rule 2: only var(--mapped-*) / var(--responsive-*).')
console.log('Deliberate exception? Add a `token-exempt: <reason>` comment on the line.')
process.exit(1)
