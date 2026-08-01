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
    // 0px is dimensionless in effect — no token expresses "nothing".
    allow: (m) => parseFloat(m[1]) === 0,
    // CSS custom properties are INVALID inside @media conditions. This is a
    // hard CSS limitation, not a style preference, so breakpoints must pass.
    allowLine: (line) => /@media/.test(line),
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
      if (rule.allowLine && rule.allowLine(line)) continue
      rule.re.lastIndex = 0
      let m
      while ((m = rule.re.exec(line)) !== null) {
        if (rule.allow && rule.allow(m)) continue
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
