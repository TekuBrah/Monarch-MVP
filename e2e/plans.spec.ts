import { expect, test } from '@playwright/test'
import { activateTab, gotoRoute } from './harness'

import { CRYPTO_HOLDINGS, FIAT_ACCOUNTS } from '../src/data/accounts'
import { COMMITMENTS } from '../src/data/commitments'
import {
  commitmentCadenceLabel,
  commitmentDueLabel,
  goalPercent,
  goalsTotal,
  netWorth,
} from '../src/data/derive'
import { formatMyr } from '../src/data/format'
import { GOALS } from '../src/data/goals'
import { buildHoldings } from '../src/data/holdings'
import type { Goal } from '../src/data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FLOW 11 — THE PLANS TAB AND THE SAVINGS GOALS CARD (Gate 76).
 *
 * THE DERIVATION TESTS ARE A PURE IMPORT, NO PAGE — `budgets.spec.ts`' shape,
 * and for its reason: nothing here touches a browser API, so a browser would
 * add nothing but time.
 *
 * THE BROWSER TESTS ASSERT WHAT A BASELINE CANNOT. A screenshot records that
 * the Plans tab looks a certain way; it cannot express that the goal money
 * reaching net worth is the SAME figure the card prints, that a goal is absent
 * from every collection an account picker enumerates, or that a tap changes a
 * tab without changing the route.
 *
 * THE SEEDED FIGURES ARE NOT PERSONAL DATA — they are the fixture.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const byId = (id: string): Goal => {
  const found = GOALS.find((g) => g.id === id)
  if (!found) throw new Error(`no seeded goal ${id}`)
  return found
}

const BALI = byId('goal-bali-trip')
const EMERGENCY = byId('goal-emergency-funds')

/** A synthetic goal, for the rules the two seeded ones cannot exercise. */
function goal(savedAmount: number, targetAmount: number): Goal {
  return { ...BALI, id: 'synthetic', savedAmount, targetAmount }
}

test.describe('the goal derivations', () => {
  test('goalsTotal sums savedAmount over the collection', () => {
    // 5,040 + 11,040 = 16,080. Written out rather than recomputed with the same
    // reduce the function uses — that would only prove it agrees with itself.
    expect(goalsTotal(GOALS)).toBe(16080)
    expect(goalsTotal([])).toBe(0)
  })

  test('goalPercent floors, and lands on the two integers Figma prints', () => {
    expect(goalPercent(BALI)).toBe(56)
    expect(goalPercent(EMERGENCY)).toBe(92)

    // THE RULE THE SEED CANNOT SHOW. Both seeded goals are exact integers, so
    // floor and round agree on them; these are the cases that separate the two.
    expect(goalPercent(goal(999, 1000))).toBe(99) // Math.round would say 100
    expect(goalPercent(goal(1, 1000))).toBe(0)
  })

  test('goalPercent clamps, and never divides by a non-positive target', () => {
    expect(goalPercent(goal(2000, 1000))).toBe(100)
    expect(goalPercent(goal(-50, 1000))).toBe(0)
    expect(goalPercent(goal(500, 0))).toBe(0)
  })

  test('the two seeded goals carry the figures Figma draws', () => {
    expect(BALI.savedAmount).toBe(5040)
    expect(BALI.targetAmount).toBe(9000)
    expect(EMERGENCY.savedAmount).toBe(11040)
    expect(EMERGENCY.targetAmount).toBe(12000)
  })
})

test.describe('goals are a separate term, not a holding', () => {
  const holdings = buildHoldings(FIAT_ACCOUNTS)

  test('net worth is sum(holdings) plus sum(goals), exactly', () => {
    const withoutGoals = netWorth(holdings, CRYPTO_HOLDINGS, [])
    const withGoals = netWorth(holdings, CRYPTO_HOLDINGS, GOALS)

    // The Gate 75 figure, and Gate 76's stop condition:
    // 464,958.84 + 16,080.00 = 481,038.84.
    expect(withoutGoals).toBeCloseTo(464958.84, 2)
    expect(withGoals).toBeCloseTo(481038.84, 2)
    expect(withGoals - withoutGoals).toBeCloseTo(goalsTotal(GOALS), 2)
  })

  test('no goal is a holding or an account, so no picker can offer one', () => {
    // THE STRUCTURAL HALF of "a goal never appears in an account picker": every
    // such picker enumerates `holdings` or `fiatAccounts`, and a goal is in
    // neither. The route half is asserted in the browser below.
    expect(holdings).toHaveLength(9)
    for (const g of GOALS) {
      expect(holdings.map((h) => h.id)).not.toContain(g.id)
      expect(FIAT_ACCOUNTS.map((a) => a.id)).not.toContain(g.id)
    }
  })
})

test.describe('the commitment labels', () => {
  test('cadence and due date read as Figma writes them, bar the padded day', () => {
    const mortgage = COMMITMENTS[0]
    expect(mortgage.name).toBe('Mortgage')
    expect(commitmentCadenceLabel(mortgage)).toBe('Monthly')
    // TWO-DIGIT DAY, DELIBERATELY. Figma writes "next on 1 Oct"; this app has
    // one day formatter and it pads — see `commitmentDueLabel`. The MONTH is
    // Figma’s as of Gate 80, which read all seven due dates off the frame.
    expect(commitmentDueLabel(mortgage)).toBe('next on 01 Oct')
    expect(commitmentDueLabel({ ...mortgage, nextDueOn: '2026-08-28' })).toBe(
      'next on 28 Aug',
    )
  })

  test('cadence is exhaustive over the union', () => {
    expect(commitmentCadenceLabel({ ...COMMITMENTS[0], cadence: 'yearly' })).toBe(
      'Yearly',
    )
  })
})

test.describe('the Plans tab', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`renders both goals and every commitment [${theme}]`, async ({ page }) => {
      await gotoRoute(page, '/finance', theme)
      await activateTab(page, { id: 'plans', label: 'Plans' })

      const cards = page.locator('.mn-card-goals')
      await expect(cards).toHaveCount(GOALS.length)

      for (const [i, g] of GOALS.entries()) {
        const card = cards.nth(i)
        await expect(card).toContainText(g.name)
        await expect(card).toContainText(`${goalPercent(g)}%`)
        await expect(card).toContainText(formatMyr(g.savedAmount))
        await expect(card).toContainText(formatMyr(g.targetAmount))

        // TAPPABLE AS OF GATE 78. `CardGoals` renders a <button> only when it
        // is given `onClick`, so the root element IS the assertion that the
        // card is focusable and announced as a control. It read 'DIV' from
        // Gate 76 until the goal drilldown existed to tap through to; that
        // assertion was REWRITTEN here rather than a second one added beside
        // it, which would have left the suite asserting both.
        await expect(card).toHaveJSProperty('tagName', 'BUTTON')
      }

      const rows = page.locator('.mvp-plans__commitments .mn-list-item')
      await expect(rows).toHaveCount(COMMITMENTS.length)

      for (const [i, c] of COMMITMENTS.entries()) {
        const row = rows.nth(i)
        await expect(row).toContainText(c.name)
        await expect(row).toContainText(formatMyr(c.amount))
        await expect(row).toContainText(commitmentDueLabel(c))
        // `hasReceiptIcon` DEFAULTS TO TRUE — the omitted-prop trap this repo
        // has hit four times. One glyph per row is the leading mark; a second
        // would be `receipt_long`.
        await expect(row.locator('svg')).toHaveCount(1)

        // TAPPABLE AS OF GATE 80, and the root element IS the assertion:
        // `ListItem` renders a <button> only when it is given `onClick`, so
        // this is what says the row is focusable and announced as a control.
        // The Gate 78 precedent on the goal cards above.
        await expect(row).toHaveJSProperty('tagName', 'BUTTON')
      }

      // Neither heading offers "Add New": both writers belong to later gates,
      // and a control that cannot act is worse than none (Gate 44).
      await expect(page.locator('.mvp-plans .mn-link')).toHaveCount(0)
    })
  }
})

test.describe('the Savings Goals card', () => {
  test('shows the combined total, and the hero is holdings plus it', async ({
    page,
  }) => {
    await gotoRoute(page, '/finance', 'light')

    const card = page.locator('.mn-card-balance', { hasText: 'Goals' })
    await expect(card).toHaveCount(1)
    await expect(card).toContainText(formatMyr(goalsTotal(GOALS)))

    // The card and the hero are the same derivation, so they cannot disagree.
    const holdings = buildHoldings(FIAT_ACCOUNTS)
    const expected = formatMyr(netWorth(holdings, CRYPTO_HOLDINGS, GOALS))
    await expect(page.locator('.mvp-finance__networth-amount')).toHaveText(expected)

    // Ten cards now, so Gate 33's `:last-child:nth-child(odd)` is dormant — by
    // design, because it is keyed to parity rather than to a count.
    await expect(page.locator('.mvp-finance__grid-item')).toHaveCount(10)
  })

  /**
 * THE CHART'S ACCESSIBLE SUMMARY DESCRIBES THE SERIES, NOT THE HERO (Gate 77).
   *
   * IT ENDED ON THE HERO FIGURE UNTIL THIS GATE, which made the sentence claim
   * the line finishes somewhere it visibly does not. Gate 76 put goal money into
   * `netWorth` and deliberately NOT into `netWorthSeries` - a goal carries no
   * per-day value, so a flat term added to every point would invent a savings
   * history the data does not have - and the summary was reading one from each.
   *
   * ASSERTED AS A RELATION, NOT AS A STRING. `netWorthSeries` reads `TODAY`,
   * which in a spec's Node context is the real clock rather than the browser's
   * pinned one, so an exact expected figure computed here would be computed for
   * the wrong day. What is stable is that the two figures MUST differ while any
   * goal holds money, and that the gap is at least the whole of that money.
   *
   * THE SUMMARY PAINTS NOTHING - it is an `aria-label` - so this moves no
   * baseline. That was measured, not assumed.
   */
  test('the chart summary ends on the series, not on the hero', async ({ page }) => {
    await gotoRoute(page, '/finance', 'light')

    const chart = page.locator('.mvp-finance__networth-chart [aria-label]')
    const summary = (await chart.getAttribute('aria-label')) ?? ''
    expect(summary, 'the chart lost its accessible summary').toContain(
      'Net worth month to date',
    )

    // "…, RM A to RM B" - B is the figure this gate moved onto the series.
    const figures = summary.match(/RM [\d,]+\.\d{2}/g) ?? []
    expect(figures, 'the summary no longer names two figures').toHaveLength(2)
    const summaryEnd = figures[1]

    const hero = (await page.locator('.mvp-finance__networth-amount').textContent()) ?? ''

    // 1 - THE HALF THAT FAILS ON A REVERT. Reading `amount` here puts the hero
    //     figure back into the sentence and these two become equal.
    expect(
      summaryEnd,
      'the summary ends on the hero figure again - it must describe the series',
    ).not.toBe(hero.trim())

    // 2 - and the gap is at least the whole of the goal money, because the
    //     series omits all of it. (It is larger: the fixed deposit accrues.)
    const toNumber = (text: string) => Number(text.replace(/[^\d.]/g, ''))
    expect(toNumber(hero) - toNumber(summaryEnd)).toBeGreaterThanOrEqual(
      goalsTotal(GOALS),
    )
  })
  test('tapping it shows the Plans tab, and changes no route', async ({ page }) => {
    await gotoRoute(page, '/finance', 'light')
    const before = page.url()

    await page.locator('.mn-card-balance', { hasText: 'Goals' }).click()

    await expect(page.locator('.mvp-plans')).toBeVisible()
    await expect(page.locator('[role="tab"][id="tab-plans"]')).toHaveAttribute(
      'aria-selected',
      'true',
    )
    // THE TABS NEVER REACH THE URL (B7) — which is exactly why this is a
    // callback and not a `navigate`.
    expect(page.url()).toBe(before)
  })

  test('a goal is not reachable as a holding route', async ({ page }) => {
    await gotoRoute(page, `/finance/holding/${BALI.id}`, 'light')

    // `HoldingDetailScreen` redirects an unknown id to /finance with `replace`.
    await expect(page.locator('.mvp-finance__networth')).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/finance')
    // STRENGTHENED AT GATE 78, when there was finally a goal screen to NOT get.
    // Before it existed this could only say "not the holding screen"; now it can
    // say the holdings route does not reach the goal drill-down either.
    await expect(page.locator('.mvp-goal-detail')).toHaveCount(0)
  })
})
