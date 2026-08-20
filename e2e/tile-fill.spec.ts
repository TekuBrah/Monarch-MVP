import { expect, test } from '@playwright/test'
import { VIEWPORTS, assertHarnessIsHonest, finishAnimations, gotoRoute } from './harness'

/**
 * THE QUICK-ACTION TILE ROW FILLS THE CONTENT COLUMN — Gate 20.
 *
 * WHY THIS SPEC EXISTS. Gate 13 shipped `sizing='fill'` on
 * `CardFeaturesAndEducation` and proved it took effect BY DECLARATION only:
 * `mn-card-features--fill` applied, and computed `max-width` moving `109px` ->
 * `none`. It could not be proved geometrically, because at 375 the filled width
 * and the pre-fill constant COINCIDE EXACTLY — three tiles at their 109px cap
 * plus two 8px gaps come to 343, which is the whole content column at that
 * width. The prop landed on the same three integers and no screenshot could see
 * it. Gate A added the 430 viewport, which separates them: measured, the tiles
 * render 127.33/127.34/127.33 there with the prop and 109/109/109 without it,
 * leaving 55px of the column empty.
 *
 * THE EXPECTED WIDTH IS DERIVED AT RUN TIME, NOT TRANSCRIBED. A test asserting
 * `127.33` would be a transcription of one measurement, and it would also pass
 * at 375 for entirely the wrong reason. Everything on the right-hand side of
 * the comparison — the row's content width, the gap and the tile count — is
 * read out of the live DOM, so this spec follows a gutter change, a gap change
 * or a fourth tile without being edited.
 *
 * WHAT FAILS WHERE, and why both halves are kept:
 *
 *   - THE DECLARATIONS (`--fill`, `max-width: none`, `flex: 1 1 0`) regress at
 *     BOTH widths. They are the instrument Gate 13 had.
 *   - THE GEOMETRY regresses ONLY at 430. It is the instrument Gate 13 lacked,
 *     and it is what makes this gate's coverage real rather than a restatement
 *     of Gate 13: a DS change that kept the class but stopped it widening
 *     anything would pass the declaration half and fail here.
 *
 * VIEWPORT IS A PEER AXIS (Gate A), iterated here exactly the way
 * `visual.spec.ts` iterates it — one `test.use` per describe block, and the
 * SAME `viewport` object handed to `assertHarnessIsHonest`, so the set width
 * and the asserted width cannot drift apart. THEME IS DELIBERATELY NOT AN AXIS:
 * nothing measured here is a colour, and doubling a non-visual spec per theme
 * is the cost Gate A declined to pay for `routes.spec.ts` and
 * `section-headers.spec.ts`.
 */

/**
 * Chromium's layout quantum: widths are snapped to 1/64 of a CSS pixel.
 *
 * MEASURED, NOT GUESSED AT. At 430 the numerator is not divisible by the tile
 * count — 382px is 24448/64, and 24448 = 3 x 8149 + 1 — so two tiles take 8149
 * units (127.328125) and one takes 8150 (127.34375). The remainder is
 * DISTRIBUTED rather than dropped: the three widths sum to exactly 382, and the
 * spread between them is exactly one unit.
 *
 * So the honest bound on any single tile is one quantum from the ideal, and
 * that is what is asserted. It is NOT a tolerance to be widened — the
 * regression this spec exists to catch is 18.33px per tile, three orders of
 * magnitude outside it.
 *
 * THE BOUND ON THE SUM IS ZERO, NOT ONE QUANTUM. Distribution is precisely
 * what makes the total exact: the children's used widths are integer
 * LayoutUnits chosen to add back up to the available space, so the sum is
 * asserted as an EQUALITY rather than against any tolerance. A decimal
 * `toBeCloseTo` precision would be neither of these bounds — 1/64 is a dyadic
 * quantity and does not correspond to a digit count.
 */
const LAYOUT_QUANTUM_PX = 1 / 64

for (const viewport of VIEWPORTS) {
  test.describe(`quick-action tiles fill the column — ${viewport.width}px`, () => {
    // ONE OBJECT, TWO USES. Same construction as visual.spec.ts.
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test(`.mvp-home__feature-row [${viewport.width}]`, async ({ page }) => {
      // The row is rendered by HomepageFiat, the Homepage's default tab, so no
      // tab activation is needed to reach it.
      await gotoRoute(page, '/', 'light')
      await assertHarnessIsHonest(page, viewport.width)
      await finishAnimations(page)

      const row = page.locator('.mvp-home__feature-row')
      await expect(
        row,
        'the quick-action tile row is not on the Homepage default tab — this spec is ' +
          'measuring nothing. Re-derive where the row lives; do not delete the assertion.',
      ).toHaveCount(1)

      const measured = await row.evaluate((el: HTMLElement) => {
        const cs = getComputedStyle(el)
        const px = (v: string) => parseFloat(v) || 0

        // THE CONTENT BOX, FROM THE ELEMENT. Not viewport-minus-an-assumed-
        // gutter: the whole point of `--mvp-gutter` is that the column's width
        // is a property of the box, and an assumption here would silently
        // survive the gutter changing underneath it.
        const contentWidth =
          el.getBoundingClientRect().width -
          px(cs.paddingLeft) -
          px(cs.paddingRight) -
          px(cs.borderLeftWidth) -
          px(cs.borderRightWidth)

        return {
          display: cs.display,
          contentWidth,
          gap: px(cs.columnGap),
          tiles: Array.from(el.children).map((child) => {
            const tcs = getComputedStyle(child)
            return {
              classes: Array.from(child.classList),
              width: child.getBoundingClientRect().width,
              maxWidth: tcs.maxWidth,
              flexGrow: tcs.flexGrow,
              flexShrink: tcs.flexShrink,
              flexBasis: tcs.flexBasis,
            }
          }),
        }
      })

      const n = measured.tiles.length

      // GUARDS ON THE DERIVATION ITSELF. Each of these degenerating would make
      // the arithmetic below trivially true rather than false, which is how a
      // derived assertion goes quietly green.
      expect(measured.display, 'the row must be a flex container for the gap to apply').toBe(
        'flex',
      )
      expect(
        n,
        'a fill row needs at least two tiles for the gap term to mean anything',
      ).toBeGreaterThanOrEqual(2)
      expect(measured.gap, 'the row must resolve a real column-gap').toBeGreaterThan(0)
      expect(measured.contentWidth, 'the row must have a real content width').toBeGreaterThan(0)

      // ── The declaration half — regresses at BOTH widths ──────────────────
      for (const [i, tile] of measured.tiles.entries()) {
        expect(
          tile.classes,
          `tile ${i}: sizing='fill' is not reaching CardFeaturesAndEducation`,
        ).toContain('mn-card-features--fill')
        expect(tile.maxWidth, `tile ${i}: the fill modifier must lift the 109px cap`).toBe('none')
        expect(
          { grow: tile.flexGrow, shrink: tile.flexShrink, basis: tile.flexBasis },
          `tile ${i}: the DS must supply flex: 1 1 0 under the fill modifier — the MVP's own ` +
            `override was removed at Gate 13 precisely so the DS owns this geometry`,
        ).toEqual({ grow: '1', shrink: '1', basis: '0px' })
      }

      // ── The geometry half — regresses ONLY at 430 ────────────────────────
      const derived = (measured.contentWidth - measured.gap * (n - 1)) / n

      for (const [i, tile] of measured.tiles.entries()) {
        expect(
          Math.abs(tile.width - derived),
          `tile ${i}: measured ${tile.width}px, derived ${derived}px ` +
            `((${measured.contentWidth} - ${measured.gap} x ${n - 1}) / ${n}), ` +
            `difference ${Math.abs(tile.width - derived)}px, bound ${LAYOUT_QUANTUM_PX}px ` +
            `(one 1/64 LayoutUnit). A miss of ~18px at 430 is sizing='fill' having ` +
            `stopped taking effect.`,
        ).toBeLessThanOrEqual(LAYOUT_QUANTUM_PX)
      }

      // THE ROW IS FULLY CONSUMED, EXACTLY — and "exactly" is meant literally.
      // This is the assertion the per-tile one cannot make: it is immune to how
      // the sub-pixel remainder happens to be distributed, because the
      // distribution sums back to the whole. Every term is an integer number of
      // 1/64 units, so the addition is exact in IEEE 754 too — no tolerance is
      // needed and none is given.
      //
      // IF THIS EVER FAILS BY A HAIR rather than by a tile's width, the cause to
      // check first is the reconstruction of `contentWidth`: padding and border
      // are parsed from SERIALISED computed-style strings, which need not
      // round-trip exactly if they are ever fractional. They are all 0px today.
      const consumed =
        measured.tiles.reduce((total, t) => total + t.width, 0) + measured.gap * (n - 1)
      expect(
        consumed,
        `the ${n} tiles plus ${n - 1} gaps consume ${consumed}px of a ${measured.contentWidth}px ` +
          `content column — difference ${measured.contentWidth - consumed}px, bound 0 ` +
          `(flex remainder distribution makes the sum exact)`,
      ).toBe(measured.contentWidth)
    })
  })
}
