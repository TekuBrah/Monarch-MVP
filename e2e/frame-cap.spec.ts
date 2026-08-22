import { expect, test } from '@playwright/test'
import { assertHarnessIsHonest, finishAnimations, gotoRoute } from './harness'

/**
 * THE FIXED CHROME FOLLOWS THE FRAME CAP — Gate D.
 *
 * WHY A SPEC AND NOT A BASELINE. `.mvp-shell` caps and centres by ordinary
 * means, but the five `position: fixed` elements take the VIEWPORT as their
 * containing block, not the shell, so they do not follow the cap by
 * inheritance. Each is inset explicitly with `--mvp-frame-inset`, and this is
 * what proves the inset arrives.
 *
 * NO THIRD BASELINE VIEWPORT, DELIBERATELY. Once the cap ships, every width
 * above it renders the same frame, so a third screenshot viewport's whole
 * information content collapses to "does the cap engage" — which is one
 * assertion, not 46 PNGs. Gate A costed a baseline at 2.7s and rising with
 * width; this spec is two tests.
 *
 * ── THIS GUARD IS NOT SUFFICIENT ALONE, AND THAT IS NOT A DEFECT ───────────
 *
 * It CANNOT catch the defect the gate was most at risk of shipping. `100vw`
 * includes the classic scrollbar gutter; the initial containing block — what a
 * percentage resolves against for a fixed element — does not. On real Windows
 * Chrome that is a 15px difference and a 7.5px mis-centring. But HEADLESS
 * CHROMIUM REPORTS A ZERO-WIDTH SCROLLBAR AT EVERY WIDTH, so `innerWidth ===
 * clientWidth` here and a `100vw` implementation satisfies every assertion
 * below EXACTLY. The ban on the unit lives in `scripts/check-tokens.mjs`
 * (`viewport-width-unit`), which reads source text rather than a rendered
 * page. Neither guard subsumes the other: the linter cannot tell whether the
 * inset actually reaches the elements, and this spec cannot tell which unit
 * expressed it.
 *
 * ── WHAT IS ASSERTED BEYOND WIDTH, AND WHY ────────────────────────────────
 *
 * Three mechanisms that align the chrome to the frame are FATAL and measured:
 * `transform`, `contain: layout paint`, and `filter`. Each one establishes a
 * containing block and thereby UN-FIXES the element — the tops relocate to the
 * bottom of the document, the nav lands 171-185px below the viewport at rest,
 * and `elementFromPoint` on the FAB returns null. Critically, this happens even
 * at 430 where the horizontal geometry is unchanged, so a width-only inspection
 * would ship it. That is why `position` is re-asserted as `fixed`, why every
 * element is required to be WITHIN the viewport, and why the FAB is
 * hit-tested rather than merely measured.
 *
 * ── EVERY EXPECTED VALUE IS DERIVED AT RUN TIME ───────────────────────────
 *
 * The cap and the gutter are read from the computed custom properties, and the
 * frame edges from `documentElement.clientWidth`. Nothing on the right-hand
 * side of a comparison is transcribed, so this spec follows a change to the cap
 * or the gutter without being edited — and it cannot pass at a viewport where
 * the cap does not engage, because that case is asserted against explicitly.
 */

/**
 * ONE OBJECT, TWO USES — the Gate A construction. The same `WIDE` is handed to
 * `test.use()` and to `assertHarnessIsHonest`, so the width that is SET and the
 * width that is ASSERTED cannot drift apart without someone editing one and not
 * the other in the same expression.
 *
 * IT IS DELIBERATELY NOT IN `VIEWPORTS`. That list is the BASELINE viewport
 * axis, and adding a member would mint 46 screenshots — see the note above.
 * 1280 is simply a width comfortably above the cap; nothing depends on the
 * specific number, and the spec asserts that it is above the cap rather than
 * assuming it.
 */
const WIDE = { width: 1280, height: 812 }

/**
 * Chromium lays out in 1/64 px LayoutUnits, so a positional tolerance is
 * expressed against 1/64 and never against a round decimal.
 *
 * IT IS NOT A TOLERANCE TO BE WIDENED. The regressions this spec exists to
 * catch are the cap not engaging at all (425px of error at this viewport) and
 * the `100vw` mis-centring (7.5px on a real desktop) — two and three orders of
 * magnitude outside this bound.
 */
const LAYOUT_QUANTUM_PX = 1 / 64

interface FrameGeometry {
  clientWidth: number
  innerHeight: number
  cap: number
  gutter: number
  shell: { left: number; width: number } | null
}

/** Read the frame's own terms out of the live page — never transcribed. */
async function readFrame(page: import('@playwright/test').Page): Promise<FrameGeometry> {
  return page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement)
    const shellEl = document.querySelector('.mvp-shell')
    const shell = shellEl
      ? {
          left: shellEl.getBoundingClientRect().left,
          width: shellEl.getBoundingClientRect().width,
        }
      : null
    return {
      clientWidth: document.documentElement.clientWidth,
      innerHeight: window.innerHeight,
      cap: parseFloat(rootStyle.getPropertyValue('--mvp-frame-max')),
      gutter: parseFloat(rootStyle.getPropertyValue('--mvp-gutter')),
      shell,
    }
  })
}

/** Everything this spec needs to know about one fixed element. */
async function readFixed(page: import('@playwright/test').Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      position: cs.position,
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      width: r.width,
    }
  }, selector)
}

test.describe(`the fixed chrome follows the frame cap — ${WIDE.width}px`, () => {
  test.use({ viewport: WIDE })

  test(`shell chrome [${WIDE.width}]`, async ({ page }) => {
    await gotoRoute(page, '/', 'light')
    await assertHarnessIsHonest(page, WIDE.width)
    await finishAnimations(page)

    const frame = await readFrame(page)

    // ── GUARDS ON THE DERIVATION ITSELF ─────────────────────────────────────
    // Each of these degenerating would make every assertion below trivially
    // true rather than false, which is exactly how a derived assertion goes
    // quietly green. In particular: if the cap did not engage at this width the
    // inset would be 0, every element would sit at 0, and "left === frameLeft"
    // would hold for the wrong reason.
    expect(frame.cap, '--mvp-frame-max must resolve to a real width').toBeGreaterThan(0)
    expect(frame.gutter, '--mvp-gutter must resolve to a real width').toBeGreaterThan(0)
    expect(
      frame.clientWidth,
      'this spec is only meaningful ABOVE the cap — at or below it the inset clamps to 0 ' +
        'and every assertion here passes without the mechanism doing anything',
    ).toBeGreaterThan(frame.cap)

    const frameLeft = (frame.clientWidth - frame.cap) / 2
    const frameRight = frameLeft + frame.cap

    // ── THE SHELL ITSELF, by ordinary means ────────────────────────────────
    expect(frame.shell, '.mvp-shell must be present').not.toBeNull()
    expect(
      Math.abs(frame.shell!.width - frame.cap),
      `.mvp-shell is ${frame.shell!.width}px wide against a ${frame.cap}px cap`,
    ).toBeLessThanOrEqual(LAYOUT_QUANTUM_PX)
    expect(
      Math.abs(frame.shell!.left - frameLeft),
      `.mvp-shell starts at ${frame.shell!.left}px, derived centre ${frameLeft}px`,
    ).toBeLessThanOrEqual(LAYOUT_QUANTUM_PX)

    // ── THE FIXED ELEMENTS, which do NOT follow the cap by inheritance ─────
    // nav and scrim span the frame; fab and theme switch sit a gutter inside
    // its edges. Both shapes are stated against the SAME derived frameLeft /
    // frameRight, so one mechanism is being checked, not four coincidences.
    const spanning = ['.mvp-shell__nav', '.mvp-shell__scrim']
    for (const selector of spanning) {
      const el = await readFixed(page, selector)
      expect(el, `${selector} must be present on / — this spec is measuring nothing`).not.toBeNull()

      expect(
        el!.position,
        `${selector} must still be position: fixed. transform / contain: layout paint / filter ` +
          `each establish a containing block and UN-FIX it, which a width check cannot see`,
      ).toBe('fixed')
      expect(
        Math.abs(el!.left - frameLeft),
        `${selector} left edge ${el!.left}px, derived ${frameLeft}px ` +
          `((${frame.clientWidth} - ${frame.cap}) / 2)`,
      ).toBeLessThanOrEqual(LAYOUT_QUANTUM_PX)
      expect(
        Math.abs(el!.width - frame.cap),
        `${selector} is ${el!.width}px wide, expected the ${frame.cap}px frame`,
      ).toBeLessThanOrEqual(LAYOUT_QUANTUM_PX)
      // WITHIN THE VIEWPORT AT REST. This is the assertion that catches the
      // un-fixing failure, where the element relocates to the bottom of the
      // document and sits 171-185px below the fold.
      expect(
        el!.bottom,
        `${selector} bottom edge is at ${el!.bottom}px against a ${frame.innerHeight}px ` +
          `viewport — it is no longer fixed to the viewport`,
      ).toBeLessThanOrEqual(frame.innerHeight + LAYOUT_QUANTUM_PX)
    }

    // THE FAB is inset from the frame's RIGHT edge by one gutter.
    const fab = await readFixed(page, '.mvp-shell__fab')
    expect(fab, '.mvp-shell__fab must be present on /').not.toBeNull()
    expect(fab!.position, '.mvp-shell__fab must still be position: fixed').toBe('fixed')
    expect(
      Math.abs(fab!.right - (frameRight - frame.gutter)),
      `.mvp-shell__fab right edge ${fab!.right}px, derived ${frameRight - frame.gutter}px ` +
        `(frame right ${frameRight} minus gutter ${frame.gutter})`,
    ).toBeLessThanOrEqual(LAYOUT_QUANTUM_PX)

    // THE THEME SWITCH is inset from the frame's LEFT edge by one gutter.
    const themeSwitch = await readFixed(page, '.mvp-shell__theme-switch')
    expect(themeSwitch, '.mvp-shell__theme-switch must be present').not.toBeNull()
    expect(themeSwitch!.position, '.mvp-shell__theme-switch must still be fixed').toBe('fixed')
    expect(
      Math.abs(themeSwitch!.left - (frameLeft + frame.gutter)),
      `.mvp-shell__theme-switch left edge ${themeSwitch!.left}px, derived ` +
        `${frameLeft + frame.gutter}px (frame left ${frameLeft} plus gutter ${frame.gutter})`,
    ).toBeLessThanOrEqual(LAYOUT_QUANTUM_PX)

    // ── HIT-TESTING, not measurement ───────────────────────────────────────
    // The fatal mechanisms leave the geometry looking correct while making the
    // element unreachable: `elementFromPoint` on the FAB returns null. A rect
    // is not evidence that a control can be pressed.
    const hit = await page.evaluate(() => {
      const el = document.querySelector('.mvp-shell__fab')
      if (!el) return { ok: false, reason: 'no FAB' }
      const r = el.getBoundingClientRect()
      const target = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return {
        ok: target !== null && (target === el || el.contains(target)),
        reason: target === null ? 'elementFromPoint returned null' : `hit <${target.tagName}>`,
      }
    })
    expect(
      hit.ok,
      `the FAB is not hit-testable at its own centre (${hit.reason}). This is the signature of ` +
        `transform / contain / filter having un-fixed the chrome — geometry can look right ` +
        `while the control cannot be pressed.`,
    ).toBe(true)
  })

  test(`the toast [${WIDE.width}]`, async ({ page }) => {
    // The toast is the one fixed element behind in-screen state. It is reached
    // through its own controls, never by setting React state — the same rule
    // `gotoRoute` follows for the theme and `openOverlay` for a modal.
    // `/finance/holding/fd` is the only holding whose fields grant these
    // actions.
    await gotoRoute(page, '/finance/holding/fd', 'light')
    await assertHarnessIsHonest(page, WIDE.width)

    await page.getByRole('button', { name: 'Set Maturity Reminder' }).click()
    await page.getByRole('button', { name: 'Set reminder' }).click()

    const toast = page.locator('.mvp-finance-detail__toast')
    await expect(
      toast,
      'the toast did not appear after confirming the reminder preset — the path this spec ' +
        'reaches it by has changed, and the assertion below would measure nothing',
    ).toHaveCount(1)
    await finishAnimations(page)

    const frame = await readFrame(page)
    expect(frame.cap, '--mvp-frame-max must resolve to a real width').toBeGreaterThan(0)
    expect(
      frame.clientWidth,
      'this spec is only meaningful ABOVE the cap',
    ).toBeGreaterThan(frame.cap)

    const frameLeft = (frame.clientWidth - frame.cap) / 2
    const frameRight = frameLeft + frame.cap

    const el = await readFixed(page, '.mvp-finance-detail__toast')
    expect(el!.position, '.mvp-finance-detail__toast must still be position: fixed').toBe('fixed')
    expect(
      Math.abs(el!.left - (frameLeft + frame.gutter)),
      `toast left edge ${el!.left}px, derived ${frameLeft + frame.gutter}px`,
    ).toBeLessThanOrEqual(LAYOUT_QUANTUM_PX)
    expect(
      Math.abs(el!.right - (frameRight - frame.gutter)),
      `toast right edge ${el!.right}px, derived ${frameRight - frame.gutter}px`,
    ).toBeLessThanOrEqual(LAYOUT_QUANTUM_PX)

    // THE STICKY ACTION BAR IS DELIBERATELY NOT INSET, and asserting that keeps
    // a future session from "finishing the job" on it. It resolves against its
    // scroll container, so it already follows the capped frame; adding the
    // frame inset there would double-count and pull it inward by 425px at this
    // viewport.
    const actions = await page.evaluate(() => {
      const a = document.querySelector('.mvp-finance-detail__actions')
      if (!a) return null
      const r = a.getBoundingClientRect()
      return { position: getComputedStyle(a).position, left: r.left, right: r.right }
    })
    expect(actions, '.mvp-finance-detail__actions must be present').not.toBeNull()
    expect(
      actions!.position,
      '.mvp-finance-detail__actions is sticky BY DESIGN — if this is ever fixed, it needs the ' +
        'frame inset like the other five and this spec must be extended',
    ).toBe('sticky')
    expect(
      Math.abs(actions!.left - frameLeft),
      `the sticky action bar starts at ${actions!.left}px, expected the frame edge ` +
        `${frameLeft}px — it follows the capped frame through its scroll container, ` +
        `without a frame inset of its own`,
    ).toBeLessThanOrEqual(LAYOUT_QUANTUM_PX)
  })
})
