import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { activateTab, gotoRoute } from './harness'

import {
  contributionSourceLabel,
  goalContributions,
  goalPercent,
  goalTargetLabel,
} from '../src/data/derive'
import { formatMyr } from '../src/data/format'
import { GOALS } from '../src/data/goals'
import { buildHoldings } from '../src/data/holdings'
import { FIAT_ACCOUNTS } from '../src/data/accounts'
import { formatDayMonth } from '../src/data/today'
import { TRANSACTIONS } from '../src/data/transactions'
import type { Goal } from '../src/data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE GOAL DRILLDOWN AND ITS CONTRIBUTIONS SHEET — Gate 78
 * (`/finance/plans/goals/:goalId`, Figma `1266:14344`).
 *
 * `budget-detail.spec.ts`' shape: a few pure-import tests, then browser tests
 * that drive the screen through its own controls. NO BASELINE — the twelve walk
 * states that photograph these surfaces live in `visual.spec.ts`.
 *
 * EXPECTATIONS ARE DERIVED, NOT TRANSCRIBED. Every figure below comes from the
 * same function the screen calls, because what these assert is that the screen
 * draws the derivation — not what the derivation is. `goals.spec.ts` is where
 * the seed's own figures are pinned.
 *
 * THE SEEDED LEDGER IS A FIXTURE, NOT PERSONAL DATA.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const byId = (id: string): Goal => {
  const goal = GOALS.find((g) => g.id === id)
  if (!goal) throw new Error(`no seeded goal ${id}`)
  return goal
}

const BALI = byId('goal-bali-trip')
const EMERGENCY = byId('goal-emergency-funds')

const route = (goal: Goal) => `/finance/plans/goals/${goal.id}`

/*
  THE SLICE SIZE IS NEVER WRITTEN DOWN HERE, AND THAT WAS THE THIRD ANSWER.

  A local `const SLICE = 4` was the first draft: the screen could move to 6 and
  every assertion would still pass against 4, so the test would be checking its
  own copy. Importing the screen's constant was the second, and it does not
  compile — `tsconfig.e2e.json` sets no `jsx`, so a spec cannot import a `.tsx`
  at all.

  So the browser tests READ THE RENDERED ROW COUNT and assert the PROPERTY
  instead: that the screen shows a newest-first PREFIX of the list, and that the
  prefix is strictly shorter than the whole. That is stronger than pinning 4 —
  it catches a slice taken from the wrong end, a slice that is not a prefix, and
  a slice long enough to make "See All" meaningless — and it cannot drift.
*/

/* ───────────────────────────── pure, no page ────────────────────────────── */

/*
  A GOAL MUST NEVER ACQUIRE A HOLDING DRILL-DOWN ROUTE, and the first line of
  that defence is structural rather than behavioural: goals are their own
  collection, so a goal id is not an id the holdings route can resolve. The
  browser half is below.
*/
test('no goal id appears in holdings or fiat accounts', () => {
  const holdingIds = buildHoldings(FIAT_ACCOUNTS).map((h) => h.id)
  const accountIds = FIAT_ACCOUNTS.map((a) => a.id)
  for (const goal of GOALS) {
    expect(holdingIds, `${goal.id} must not be a holding`).not.toContain(goal.id)
    expect(accountIds, `${goal.id} must not be an account`).not.toContain(goal.id)
  }
})

/*
  THE TWO SPELLINGS ARE A CHOICE FIGMA DOES NOT MAKE. Inventory A7 records the
  drill-down drawing "Manual Top Up" on one row and "Manual Top-Up" on another;
  one stored source cannot print two, so the hyphenated form wins and is pinned
  here. A switch with no `default` means a third source is a compile error.
*/
test('a contribution is titled by its source, hyphenated', () => {
  expect(contributionSourceLabel('automatic')).toBe('Auto Save')
  expect(contributionSourceLabel('manual')).toBe('Manual Top-Up')
})

/*
  THE TARGET ROW IS A MONTH AND A YEAR, through the SAME `monthLabel` the
  Receipts and Transactions month headings use. Inventory A5 records three date
  formats inside this one Section; a fourth expression of a format the app
  already owns is how that becomes four.
*/
test('the target label is the month and year of the stored target date', () => {
  expect(goalTargetLabel(BALI)).toBe('December 2026')
  expect(goalTargetLabel(EMERGENCY)).toBe('June 2027')
  // A month name and a four-digit year, and nothing else — so the stored day is
  // provably discarded. An earlier version of this asserted the label did not
  // CONTAIN the day, which is wrong: "20" sits inside "2026".
  for (const goal of GOALS) {
    expect(goalTargetLabel(goal)).toMatch(/^[A-Z][a-z]+ \d{4}$/)
  }
})

/* ──────────────────────────────── the screen ────────────────────────────── */

const openGoal = async (page: Page, goal: Goal, theme: 'light' | 'dark' = 'light') => {
  await gotoRoute(page, route(goal), theme)
}

for (const goal of [BALI, EMERGENCY]) {
  test(`${goal.name}: every figure on the screen is the derivation, not a literal`, async ({
    page,
  }) => {
    await openGoal(page, goal)

    await expect(page.locator('.mn-header-default')).toContainText(goal.name)
    await expect(page.locator('.mvp-goal-detail__target-date')).toHaveText(goalTargetLabel(goal))
    await expect(page.locator('.mn-progress-bar__pct')).toHaveText(`${goalPercent(goal)}%`)
    await expect(page.locator('.mn-progress-bar__current')).toHaveText(formatMyr(goal.savedAmount))
    await expect(page.locator('.mn-progress-bar__total')).toHaveText(formatMyr(goal.targetAmount))

    /*
      THE AMOUNT SURVIVES THE TOGGLE BEING OFF — `GoalAutoSave`'s stated
      contract, and Emergency Funds is the seeded goal that exercises it. A
      reader that showed the amount only when enabled would pass on Bali alone.
    */
    await expect(page.locator('.mvp-goal-detail__autosave-amount')).toContainText(
      `${formatMyr(goal.autoSave.amount)}/mth`,
    )
    await expect(page.locator('.mvp-goal-detail__autosave [role="switch"]')).toHaveAttribute(
      'aria-checked',
      String(goal.autoSave.isEnabled),
    )
  })

  test(`${goal.name}: the screen shows a newest-first PREFIX, shorter than the whole list`, async ({
    page,
  }) => {
    await openGoal(page, goal)

    const all = goalContributions(TRANSACTIONS, goal.id)
    const rows = page.locator('.mvp-goal-detail__body .mn-chart-legend-item')
    const shown = await rows.count()

    /*
      THE SLICE IS LOAD-BEARING: strictly fewer rows than the whole list, or
      "See All" opens a sheet repeating the rows directly above it — and the
      suppression rule would hide the link, taking the overlay walk state with
      it.
    */
    expect(shown).toBeGreaterThan(0)
    expect(shown).toBeLessThan(all.length)

    // ...and it is the NEWEST `shown` of them, in order — not the oldest end,
    // and not shuffled.
    const expected = all.slice(0, shown)

    for (const [i, t] of expected.entries()) {
      const row = rows.nth(i)
      await expect(row).toContainText(contributionSourceLabel(t.contributionSource!))
      await expect(row).toContainText(formatDayMonth(t.occurredAt.slice(0, 10)))
      /*
        THE MAGNITUDE, UNSIGNED. The ledger row is NEGATIVE — a contribution
        debits `main` — and Figma prints "RM 250.00". A row printing the debit's
        sign here would be describing the account, not the goal.
      */
      await expect(row).toContainText(formatMyr(Math.abs(t.amount)))
      await expect(row).not.toContainText('-RM')
      await expect(row).not.toContainText('+RM')
    }
  })
}

/*
  `hasIcon={false}` IS PASSED, NOT OMITTED. `ChartLegendItem` defaults `icon` to
  a `question_mark` glyph and `hasIcon` to `true`, and on the `contribution`
  variant `showIcon` is exactly `hasIcon` — so omitting both draws a grey
  question-mark badge on every row. Figma draws no leading badge at all.
*/
test('a contribution row draws no leading badge', async ({ page }) => {
  await openGoal(page, BALI)
  const rows = page.locator('.mvp-goal-detail__body .mn-chart-legend-item')
  await expect(rows.first()).toBeVisible()
  expect(await rows.locator('.mn-icon-object').count()).toBe(0)
  expect(await rows.locator('svg').count()).toBe(0)
})

/*
  THE VARIANT IS `contribution`, NOT THE `legend` DEFAULT. The class is what
  carries the medium weight and drops the chevron; a row that had silently
  fallen back to `legend` would look almost right and draw a trailing chevron.
*/
test('the rows use the contribution variant, so no chevron', async ({ page }) => {
  await openGoal(page, BALI)
  const rows = page.locator('.mvp-goal-detail__body .mn-chart-legend-item')
  await expect(rows.first()).toHaveClass(/mn-chart-legend-item--contribution/)
  expect(await rows.locator('.mn-icon').count()).toBe(0)
})

test('Back lands on the Plans tab', async ({ page }) => {
  await openGoal(page, BALI)
  await page.locator('.mn-header-default button').first().click()
  await expect(page).toHaveURL(/\/finance$/)
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveText('Plans')
})

test('a goal card opens its drilldown', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'plans', label: 'Plans' })

  const card = page.locator('.mn-card-goals').first()
  /* `CardGoals` renders a <button> only when given `onClick` — Gate 76 shipped
     these inert, and the tap is what Gate 78 wires. */
  await expect(card).toHaveJSProperty('tagName', 'BUTTON')
  await card.click()
  await expect(page).toHaveURL(new RegExp(`${route(GOALS[0])}$`))
})

test('an unknown goal id redirects to the Plans tab, replacing the history entry', async ({
  page,
}) => {
  await gotoRoute(page, '/finance/plans/goals/goal-does-not-exist', 'light')
  await expect(page).toHaveURL(/\/finance$/)
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveText('Plans')
  /* `replace`, so Back cannot return to the dead URL: a fresh page's history is
     `about:blank` plus this one goto. */
  expect(await page.evaluate(() => history.length)).toBe(2)
})

/*
  THE BROWSER HALF OF THE "never a holding drill-down" RULE IS NOT HERE, AND
  THAT IS DELIBERATE. `plans.spec.ts` has carried "a goal is not reachable as a
  holding route" since Gate 76; a second test driving the same URL to the same
  conclusion would be two tests for one claim. Gate 78 strengthened that one in
  place with a `.mvp-goal-detail` assertion — which only became meaningful once
  this screen existed — rather than adding a near-duplicate beside it.

  What IS new here is the structural half at the top of this file: no goal id is
  in `holdings` or `fiatAccounts` at all, so the route has nothing to resolve.
*/

/* ───────────────────────────────── the sheet ────────────────────────────── */

const openSheet = async (page: Page, goal: Goal, theme: 'light' | 'dark' = 'light') => {
  await openGoal(page, goal, theme)
  await page.locator('.mvp-goal-detail__contributions .mn-link').click()
  await expect(page.locator('[role="dialog"]')).toBeVisible()
}

test('"See All" opens a sheet holding EVERY contribution, not the slice', async ({ page }) => {
  await openSheet(page, BALI)

  const all = goalContributions(TRANSACTIONS, BALI.id)
  const onScreen = await page.locator('.mvp-goal-detail__body .mn-chart-legend-item').count()
  expect(all.length).toBeGreaterThan(onScreen)

  const sheetRows = page.locator('.mn-sheet__content .mn-chart-legend-item')
  await expect(sheetRows).toHaveCount(all.length)

  for (const [i, t] of all.entries()) {
    await expect(sheetRows.nth(i)).toContainText(formatMyr(Math.abs(t.amount)))
  }
})

/*
  TEKU FLAGGED THE RESERVED EMPTY SLOT AS VERY IMPORTANT, so it is asserted in
  the RENDERED DOM rather than inferred from the props. `OverlayHeader` is a
  three-column grid whose two side tracks are a fixed, identical width; the
  leading slot here is empty (no back control on this sheet) and must still
  occupy its track, or the title would drift off centre.
*/
test('the sheet header reserves its empty icon slot and centres the title', async ({ page }) => {
  await openSheet(page, BALI)

  const geometry = await page.evaluate(() => {
    const header = document.querySelector('.mn-overlay-header')!
    const sides = [...header.querySelectorAll('.mn-overlay-header__side')]
    const title = header.querySelector('.mn-overlay-header__title')!
    const box = (el: Element) => el.getBoundingClientRect()
    return {
      sides: sides.map((s) => ({
        width: box(s).width,
        children: s.children.length,
        ariaHidden: s.getAttribute('aria-hidden'),
      })),
      titleCentre: box(title).x + box(title).width / 2,
      headerCentre: box(header).x + box(header).width / 2,
      textOverflow: getComputedStyle(title).textOverflow,
      whiteSpace: getComputedStyle(title).whiteSpace,
    }
  })

  expect(geometry.sides).toHaveLength(2)
  // The EMPTY one still holds its track, and says so to AT.
  expect(geometry.sides[0].children).toBe(0)
  expect(geometry.sides[0].ariaHidden).toBe('true')
  expect(geometry.sides[0].width).toBe(geometry.sides[1].width)
  expect(geometry.sides[0].width).toBeGreaterThan(0)
  // Centred by arithmetic, not by a balance that happens to hold.
  expect(geometry.titleCentre).toBeCloseTo(geometry.headerCentre, 5)
  // A long title truncates rather than pushing the header out of shape.
  expect(geometry.textOverflow).toBe('ellipsis')
  expect(geometry.whiteSpace).toBe('nowrap')
})

/*
  THE CLOSE CONTROL IS DARK GREY, NOT PRIMARY BLUE — the shared `OverlayHeader`
  rule, and the thing the DS changed at v2.8.0. Blue is reserved for controls
  that change data.
*/
test('the sheet close control is the neutral icon colour', async ({ page }) => {
  await openSheet(page, BALI)
  const control = page.locator('.mn-overlay-header__control')
  await expect(control).toHaveAttribute('aria-label', 'Close')
  const colour = await control.evaluate((el) => getComputedStyle(el).color)
  // `--mapped-icon-default-default`, which is NOT `--mapped-icon-primary-default`.
  const primary = await control.evaluate((el) =>
    getComputedStyle(el).getPropertyValue('--mapped-icon-primary-default').trim(),
  )
  expect(colour).not.toBe(primary)
  expect(colour).toBe('rgb(54, 60, 67)')
})

/*
  UI-1's RULE: rows sit FLAT on the sheet surface — no inner container, no
  second shadow, no box within a box. `.mn-chart-legend-item` paints nothing of
  its own, which is why `contentPadding` is left at its default rather than
  released: there is no tint that needs to reach the panel edges.
*/
test('the sheet rows are flat on the sheet surface', async ({ page }) => {
  await openSheet(page, BALI)
  const row = page.locator('.mn-sheet__content .mn-chart-legend-item').first()
  const paint = await row.evaluate((el) => {
    const s = getComputedStyle(el)
    return { bg: s.backgroundColor, shadow: s.boxShadow, border: s.borderWidth, radius: s.borderRadius }
  })
  expect(paint.bg).toBe('rgba(0, 0, 0, 0)')
  expect(paint.shadow).toBe('none')
  expect(paint.border).toBe('0px')
  expect(paint.radius).toBe('0px')
  // And nothing wraps them in a panel of its own.
  expect(await page.locator('.mn-sheet__content .mn-menu, .mn-sheet__content .mn-card').count()).toBe(0)
})

/*
  THE LIST SCROLLS AND ITS SCROLLBAR IS HIDDEN — the standing no-visible-
  scrollbar convention, which `src/index.css` declares once on `*`. The gutter
  check is what distinguishes "hidden" from "absent": headless Chromium reserves
  no gutter either way, so the DECLARATION is the thing worth asserting.

  IT READS TWO ELEMENTS, AND THE SECOND IS THE LOAD-BEARING ONE. A first draft
  read only `.mn-sheet__content` — and its mutation proof PASSED, because
  `Sheet.css` carries a `scrollbar-width: none` of its OWN. So that assertion
  was pinning the DS's suppression and said nothing about this app's global
  rule; deleting `src/index.css`'s declaration left it green. The `<ul>` inside
  the sheet is an MVP element the DS does not style, so it can only be `none`
  because of the rule on `*`.
*/
test('the sheet scrolls internally with no visible scrollbar', async ({ page }) => {
  await openSheet(page, BALI)
  const metrics = await page.evaluate(() => {
    const content = document.querySelector('.mn-sheet__content') as HTMLElement
    const appList = content.querySelector('.mvp-goal-detail__rows') as HTMLElement
    content.scrollTop = 10_000
    const clamped = content.scrollTop
    content.scrollTop = 0
    return {
      scrollHeight: content.scrollHeight,
      clientHeight: content.clientHeight,
      clamped,
      gutter: content.offsetWidth - content.clientWidth,
      scrollbarWidth: getComputedStyle(content).scrollbarWidth,
      appListScrollbarWidth: getComputedStyle(appList).scrollbarWidth,
    }
  })
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight)
  expect(metrics.clamped).toBe(metrics.scrollHeight - metrics.clientHeight)
  expect(metrics.clamped).toBeGreaterThan(0)
  expect(metrics.gutter).toBe(0)
  // The DS's own suppression on its scroll region...
  expect(metrics.scrollbarWidth).toBe('none')
  // ...and the app's global rule, on an element the DS never styles.
  expect(metrics.appListScrollbarWidth).toBe('none')
})

/*
  `sizing="fill"` OPENS THE PANEL AT ITS EXISTING CAP, so the sheet's height is
  not a function of how many contributions a goal happens to have. Without it,
  Bali's 16 rows and a future one-row goal would produce different surfaces from
  the same control.
*/
test('the sheet opens at the panel cap rather than hugging its content', async ({ page }) => {
  await openSheet(page, BALI)
  const panel = page.locator('[role="dialog"]')
  await expect(panel).toHaveClass(/mn-sheet__panel--fill/)
  const measured = await panel.evaluate((el) => ({
    height: el.getBoundingClientRect().height,
    maxHeight: getComputedStyle(el).maxHeight,
  }))
  expect(`${measured.height}px`).toBe(measured.maxHeight)
})
