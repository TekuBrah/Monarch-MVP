/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT RECOGNITION HANDS THE PARSER.
 *
 * ───────── WHY THESE LIVE IN THEIR OWN FILE, AS OF GATE 54 ──────────────────
 *
 * They were declared in `recognise.ts`, and `parseReceipt.ts` imported them
 * from there — which made the PURE parser depend, at type level, on the module
 * that loads a 3.9 MB WebAssembly engine. At runtime that coupling is nothing,
 * because `import type` erases. AT TYPECHECK TIME IT IS NOT NOTHING: reaching
 * `recognise.ts` means reaching its two `?url` imports, and those resolve only
 * in a project that carries Vite's ambient client types. `tsconfig.app.json`
 * does, through `src/vite-env.d.ts`; `tsconfig.e2e.json` does not.
 *
 * SO THE COUPLING WAS WHAT STOPPED A SPEC TESTING THE PARSER DIRECTLY, and it
 * would have stopped any other non-Vite consumer too. Splitting the types out
 * costs one file and buys `e2e/parse-receipt.spec.ts`, which exercises the
 * whole parser in milliseconds with no engine, no image and no dev server.
 *
 * `recognise.ts` RE-EXPORTS THEM, so every existing importer is unchanged and
 * there is no second spelling of where these types come from.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Where on the page the engine found something, in the pixels of the image it
 * was handed (after `normaliseForOcr`), origin top-left.
 *
 * ───────── WHY THE BOXES ARE KEPT, AS OF GATE 55 ────────────────────────────
 *
 * `recognise` has always asked the engine for `blocks`, and the engine has
 * always returned a box on every line and every word — and until Gate 55 every
 * one of them was thrown away. The engine's LINE split is a guess about layout,
 * and on a receipt it is wrong in a specific, repeated way: a price printed in
 * a right-hand column is often placed in a different block from the name it
 * belongs to, and a centred label is placed on a different line from the figure
 * at the right margin of the same printed row. Only the geometry can put those
 * back together. See `parseReceipt.ts`, "rows".
 *
 * OPTIONAL, AND THAT IS LOAD-BEARING. Every committed text fixture in
 * `e2e/parse-receipt.spec.ts` was written without boxes, and the parser falls
 * back to the engine's own line order when they are absent — so those fixtures
 * stay valid and a box-less caller still gets a parse.
 */
export interface OcrBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** One recognised word, with the engine's own confidence in it, 0-100. */
export interface OcrWord {
  text: string
  confidence: number
  bbox?: OcrBox
}

/**
 * One recognised line.
 *
 * THE PARSER WORKS ON LINES-OF-WORDS RATHER THAN ON A TEXT BLOB, and that is
 * what makes a per-field confidence exact instead of a guess. Given only the
 * newline-joined text, "which word produced this number" has to be answered by
 * searching for the token, which is ambiguous the moment a page prints the same
 * figure twice — and every one of the ten seeded receipts prints its total
 * twice, once on the Total row and once on the tender row.
 */
export interface OcrLine {
  text: string
  words: OcrWord[]
  bbox?: OcrBox
}

export interface OcrResult {
  lines: OcrLine[]
  /** The engine's overall confidence in the page, 0-100. */
  confidence: number
}
