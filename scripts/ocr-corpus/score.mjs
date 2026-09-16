import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SCORE CACHED ENGINE OUTPUT AGAINST THE DEVELOPMENT TRUTH (Gate 55).
 *
 *   node scripts/ocr-corpus/score.mjs <OCR_CORPUS_OUT> [--reparse] [--detail]
 *
 * PURE, AND RUNS IN NODE. It reads the JSON `corpus.spec.mjs` wrote. With
 * `--reparse` it runs the CURRENT `src/data/ocr/parseReceipt.ts` over the cached
 * `OcrResult` rather than using the parse recorded at capture time — which is
 * how a parser change is measured without running the engine again. The engine
 * output is the same bytes either way; only the parser differs.
 *
 * ─── TRUTH ──────────────────────────────────────────────────────────────────
 * Seeded receipts: `src/data/receipts.ts`, imported (Node strips the types).
 * Device receipts: `TRUTH.md` beside the photographs, parsed below. Nothing in
 * this file restates a string from either.
 *
 * ─── THE SCORING RULES, as TRUTH.md states them ─────────────────────────────
 * An item is CORRECT when a reported item's price matches to the cent AND its
 * name contains the truth name's first real word (the first token carrying two
 * or more letters, so a leading quantity or article number is skipped),
 * case-insensitive. Matching is one-to-one. A reported item matched to nothing
 * is JUNK, unless it matches a TOLERATED line by the same rule. The seeded
 * receipts have no tolerated lines.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const REPO = path.resolve(import.meta.dirname, '..', '..')
const args = process.argv.slice(2)
const OUT = args.find((a) => !a.startsWith('--'))
const REPARSE = args.includes('--reparse')
const DETAIL = args.includes('--detail')
const ATTRIBUTE = args.includes('--attribute')
const DEVICE_DIR = process.env.OCR_CORPUS_DEVICE_DIR ?? 'D:/Claude/_assets/receipts-device'
if (!OUT) throw new Error('usage: score.mjs <OCR_CORPUS_OUT> [--reparse] [--detail]')

const cents = (n) => Math.round(n * 100)

function firstRealWord(name) {
  const token = name.split(/\s+/).find((t) => (t.match(/[A-Za-z]/g) ?? []).length >= 2)
  return (token ?? name).toLowerCase()
}

// ─── seeded truth ────────────────────────────────────────────────────────────
async function seededTruth() {
  const { RECEIPTS } = await import(pathToFileURL(path.join(REPO, 'src', 'data', 'receipts.ts')).href)
  const out = {}
  for (const r of RECEIPTS) {
    out[r.filename.replace(/\.[^.]+$/, '')] = {
      items: r.lineItems.map((i) => ({ name: i.name, price: i.price })),
      tolerated: [],
      total: r.total,
      tax: { values: [r.tax], nullOk: r.tax === null },
      date: { value: r.capturedAt.slice(0, 16), nullOk: false },
    }
  }
  return out
}

// ─── device truth, from TRUTH.md ─────────────────────────────────────────────
function deviceTruth() {
  const md = fs.readFileSync(path.join(DEVICE_DIR, 'TRUTH.md'), 'utf8')
  const out = {}
  const sections = md.split(/^## /m).slice(1)
  for (const section of sections) {
    const heading = section.split('\n')[0].trim()
    if (!/^[a-z&_]+$/.test(heading)) continue
    const stem = heading.replace(/&/g, '_')
    const lines = section.split('\n')

    const items = []
    let inItems = false
    for (const line of lines) {
      if (/^- \*\*Items/.test(line)) {
        inItems = true
        // One receipt states its single item inline, on the heading line itself.
        const inline = /:\*\* (.+?) — .+? — (-?[0-9]+\.[0-9]{2})\s*$/.exec(line)
        if (inline) items.push({ name: inline[1], price: Number(inline[2]) })
        continue
      }
      if (/^- \*\*/.test(line)) inItems = false
      if (!inItems) continue
      const m = /^\s+- (.+?) — .+? — (-?[0-9]+\.[0-9]{2})\s*$/.exec(line)
      if (m) items.push({ name: m[1], price: Number(m[2]) })
    }

    const tolerated = []
    const tolLine = lines.find((l) => /^- \*\*Tolerated/.test(l))
    if (tolLine) {
      for (const [, text] of tolLine.matchAll(/`([^`]+)`/g)) {
        const amt = /(-?[0-9]+\.[0-9]{2})\s*$/.exec(text)
        if (amt) tolerated.push({ name: text.replace(amt[0], '').trim(), price: Number(amt[1]) })
      }
    }

    const totalsIdx = lines.findIndex((l) => /^- \*\*Totals/.test(l))
    const totalsLine = lines.slice(totalsIdx, totalsIdx + 4).join(" ")
    const total = Number(/\*\*total (-?[0-9]+\.[0-9]{2})\*\*/.exec(totalsLine)[1])
    const taxText = lines.slice(totalsIdx, totalsIdx + 4).join(' ')
    const taxValues = []
    let taxNullOk = false
    const taxIs = /Tax is ([0-9]+\.[0-9]{2})(, or null)?/.exec(taxText)
    const taxInline = /\btax ([0-9]+\.[0-9]{2})/.exec(taxText)
    if (taxIs) { taxValues.push(Number(taxIs[1])); taxNullOk = !!taxIs[2] }
    else if (taxInline) taxValues.push(Number(taxInline[1]))
    else if (/tax null/.test(taxText)) taxNullOk = true
    else throw new Error(`cannot read tax truth for ${stem}`)

    const dateLine = lines.find((l) => /^- \*\*Date/.test(l)) ?? ''
    const dm = /([0-9]{4}-[0-9]{2}-[0-9]{2}) ([0-9]{2}:[0-9]{2})/.exec(dateLine)
    const date = dm
      ? { value: `${dm[1]}T${dm[2]}`, nullOk: /Null is acceptable/.test(dateLine) }
      : { value: null, nullOk: true }

    out[stem] = { items, tolerated, total, tax: { values: taxValues, nullOk: taxNullOk }, date }
  }
  return out
}

/** Case- and diacritic-insensitive: the engine reads `Å` as `A`, and that is a READING loss. */
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * One-to-one item matching.
 *
 *   correct     price to the cent AND name contains the first real word
 *   wrongPrice  name matches a still-unmatched real item, price differs — a
 *               misread figure on a real item, which TRUTH.md DOES list
 *   junk        matches no real item by name (and no tolerated line)
 */
function matchItems(truthItems, reported, tolerated) {
  const used = new Set()
  const correct = []
  const unmatched = []
  for (const t of truthItems) {
    const word = fold(firstRealWord(t.name))
    const idx = reported.findIndex(
      (r, i) => !used.has(i) && cents(r.price) === cents(t.price) && fold(r.name).includes(word),
    )
    if (idx >= 0) { used.add(idx); correct.push(t) } else unmatched.push(t)
  }
  const wrongPrice = []
  const claimed = new Set()
  const junk = []
  const toleratedHits = []
  reported.forEach((r, i) => {
    if (used.has(i)) return
    const tol = tolerated.find(
      (t) => cents(r.price) === cents(t.price) && fold(r.name).includes(fold(firstRealWord(t.name))),
    )
    if (tol) { toleratedHits.push(r); return }
    const real = unmatched.findIndex((t, k) => !claimed.has(k) && fold(r.name).includes(fold(firstRealWord(t.name))))
    if (real >= 0) { claimed.add(real); wrongPrice.push({ reported: r, truth: unmatched[real] }) }
    else junk.push(r)
  })
  return { correct, missed: unmatched, wrongPrice, junk, toleratedHits }
}

const truth = { seeded: await seededTruth(), device: deviceTruth() }
const parseReceipt = REPARSE
  ? (await import(pathToFileURL(path.join(REPO, 'src', 'data', 'ocr', 'parseReceipt.ts')).href)).parseReceipt
  : null

const rows = []
for (const file of fs.readdirSync(OUT).filter((f) => /^(seeded|device)-.+\.json$/.test(f)).sort()) {
  const rec = JSON.parse(fs.readFileSync(path.join(OUT, file), 'utf8'))
  const t = truth[rec.set][rec.stem]
  if (!t) throw new Error(`no truth for ${rec.set}/${rec.stem}`)
  const parsed = REPARSE ? parseReceipt(rec.ocr) : rec.parsed
  const m = matchItems(t.items, parsed.lineItems, t.tolerated)
  const totalOk = parsed.total !== null && cents(parsed.total) === cents(t.total)
  const taxOk =
    parsed.tax === null ? t.tax.nullOk : t.tax.values.some((v) => v !== null && cents(v) === cents(parsed.tax))
  const got = parsed.capturedAt ? parsed.capturedAt.slice(0, 16) : null
  let date
  if (got === null) date = t.date.value === null ? 'correct' : t.date.nullOk ? 'null(ok)' : 'null'
  else if (t.date.value !== null && got === t.date.value) date = 'correct'
  else if (t.date.value !== null && got.slice(0, 10) === t.date.value.slice(0, 10)) date = 'date-only'
  else date = 'wrong'
  rows.push({ set: rec.set, stem: rec.stem, printed: t.items.length, ...m, totalOk, taxOk, date, parsed, t })
}

const pad = (s, n) => String(s).padEnd(n)
console.log(`${pad('set', 7)}${pad('receipt', 22)}${pad('items', 8)}${pad('miss', 5)}${pad('wrong$', 7)}${pad('junk', 5)}${pad('total', 6)}${pad('tax', 5)}date`)
const blank = () => ({ correct: 0, printed: 0, wrongPrice: 0, junk: 0, totals: 0, tax: 0, receipts: 0 })
const sums = {}
for (const r of rows) {
  console.log(
    `${pad(r.set, 7)}${pad(r.stem, 22)}${pad(`${r.correct.length}/${r.printed}`, 8)}${pad(r.missed.length, 5)}${pad(r.wrongPrice.length, 7)}${pad(r.junk.length, 5)}${pad(r.totalOk ? 'Y' : 'N', 6)}${pad(r.taxOk ? 'Y' : 'N', 5)}${r.date}`,
  )
  const s = (sums[r.set] ??= blank())
  s.correct += r.correct.length; s.printed += r.printed; s.wrongPrice += r.wrongPrice.length; s.junk += r.junk.length
  s.totals += r.totalOk ? 1 : 0; s.tax += r.taxOk ? 1 : 0; s.receipts += 1
  if (DETAIL) {
    console.log(`         total got ${r.parsed.total} want ${r.t.total}; tax got ${r.parsed.tax}; date got ${r.parsed.capturedAt}`)
    for (const x of r.missed) console.log(`         MISSED ${x.name} ${x.price}`)
    for (const x of r.wrongPrice) console.log(`         WRONG$ ${x.reported.name} | ${x.reported.price} (paper ${x.truth.price})`)
    for (const x of r.junk) console.log(`         JUNK   ${x.quantity} | ${x.name} | ${x.price}`)
  }
}
const all = blank()
for (const s of Object.values(sums)) for (const k of Object.keys(all)) all[k] += s[k]
for (const [name, s] of [...Object.entries(sums), ['combined', all]]) {
  console.log(
    `${pad(name, 9)} items ${s.correct}/${s.printed} = ${((100 * s.correct) / s.printed).toFixed(1)}%  wrong-price ${s.wrongPrice}  junk ${s.junk}  totals ${s.totals}/${s.receipts}  tax ${s.tax}/${s.receipts}`,
  )
}
fs.writeFileSync(
  path.join(OUT, REPARSE ? 'score-reparse.json' : 'score.json'),
  JSON.stringify(rows.map(({ parsed, t, ...r }) => r), null, 1),
)

// ─── ATTRIBUTION: was each miss a READING or a PARSING failure? ─────────────
//
// For a missed item: PARSING if the engine's words contain BOTH the item's
// first real word (folded) AND its price as a two-decimal figure — read with
// the parser's own `readMoney`, so "3,20<" counts as read and "1290" does not.
// Otherwise READING, naming which half the engine lost. A wrong-price item is
// PARSING only if the right price was also on the page. A junk item is READING
// ("misread name") when its price matches a real item the row was not matched
// to, and otherwise PARSING (a row that is not a purchase was read as one).
if (ATTRIBUTE) {
  const { readMoney } = await import(pathToFileURL(path.join(REPO, 'src', 'data', 'ocr', 'parseReceipt.ts')).href)
  const tally = { reading: 0, parsing: 0 }
  for (const r of rows) {
    const rec = JSON.parse(fs.readFileSync(path.join(OUT, `${r.set}-${r.stem}.json`), 'utf8'))
    const lines = rec.ocr.lines.map((l) => l.words.map((w) => w.text))
    const priceOn = (i, p) => (lines[i] ?? []).some((w) => { const m = readMoney(w); return m && cents(m.value) === cents(p) })
    const wordOn = (i, name) => (lines[i] ?? []).some((w) => fold(w).includes(fold(firstRealWord(name))))
    const hasPrice = (p) => lines.some((_, i) => priceOn(i, p))
    // The name and the price must be on the same engine line or on adjacent
    // lines — a word on one row and a figure on another is not an item the
    // engine read.
    const hasBoth = (name, p) => lines.some((_, i) => wordOn(i, name) && (priceOn(i, p) || priceOn(i + 1, p) || priceOn(i - 1, p)))
    const hasWord = (name) => lines.some((_, i) => wordOn(i, name))
    const say = (cause, what) => { tally[cause.startsWith('reading') ? 'reading' : 'parsing'] += 1; console.log(`${pad(r.stem, 22)}${pad(cause, 28)}${what}`) }
    const wrongTruth = new Set(r.wrongPrice.map((x) => x.truth))
    for (const t of r.missed) {
      if (wrongTruth.has(t)) continue
      const w = hasWord(t.name)
      const p = hasPrice(t.price)
      say(hasBoth(t.name, t.price) ? 'parsing: text was right' : `reading: ${!w && !p ? 'name+price' : !w ? 'name' : !p ? 'price' : 'name+price together'} not read`, `missed ${t.price}`)
    }
    for (const x of r.wrongPrice) say(hasPrice(x.truth.price) ? 'parsing: right price on page' : 'reading: price misread', `wrong-price ${x.reported.price} vs ${x.truth.price}`)
    for (const j of r.junk) {
      const real = r.missed.some((t) => !wrongTruth.has(t) && cents(t.price) === cents(j.price))
      say(real ? 'reading: name misread' : 'parsing: not a purchase', `junk ${j.price}`)
    }
    if (!r.totalOk) say(hasPrice(r.t.total) ? 'parsing: total on page' : 'reading: total not read', `total ${r.parsed.total} vs ${r.t.total}`)
  }
  console.log(`attribution: reading ${tally.reading}, parsing ${tally.parsing}`)
}
