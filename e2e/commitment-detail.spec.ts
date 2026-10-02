import { expect, test } from '@playwright/test'

import { COMMITMENTS } from '../src/data/commitments'
import {
  commitmentDateLabel,
  commitmentOffer,
  commitmentPaymentLabel,
  commitmentProviderName,
  offerMonthlySaving,
  offerYearlySaving,
} from '../src/data/derive'
import { COMMITMENT_OFFERS } from '../src/data/offers'
import type { Commitment, FiatAccount } from '../src/data/types'
import { activateTab, DEFAULT_VIEWPORT, gotoRoute } from './harness'

/**
 * FLOW 11 - THE COMMITMENT DRILL-DOWN, THE SMART INSIGHT AND THE EDUCATION
 * PANEL (Gate 80). No baseline; every assertion here is structural or
 * behavioural, so it adds nothing to `visual.spec.ts`.
 */

const INTERNET = COMMITMENTS.find((c) => c.id === 'commitment-internet')!
const MORTGAGE = COMMITMENTS.find((c) => c.id === 'commitment-mortgage')!

/* ───────────────────────────── the model, in Node ────────────────────────── */

test('one offer is seeded, against Internet, and it stores no saving', () => {
  expect(COMMITMENT_OFFERS).toHaveLength(1)
  const [offer] = COMMITMENT_OFFERS
  expect(offer.commitmentId).toBe(INTERNET.id)
  expect(offer.provider).toBe('Maxis')
  expect(offer.amount).toBe(70)

  // THE CURRENT PRICE IS NOT STORED ON THE OFFER - it is the commitment's own
  // `amount`, so the two cannot disagree. Nothing resembling a saving is stored
  // either; both figures are functions of the two prices.
  expect(Object.keys(offer).sort()).toEqual([
    'amount',
    'commitmentId',
    'id',
    'image',
    'provider',
  ])

  // EVERY OTHER COMMITMENT HAS NONE, which is what makes the "no banner" branch
  // reachable from the seed rather than only from a synthetic fixture.
  const withOffers = COMMITMENTS.filter((c) => commitmentOffer(COMMITMENT_OFFERS, c.id))
  expect(withOffers.map((c) => c.name)).toEqual(['Internet'])
})

test('the savings derive from the two prices and follow them', () => {
  const offer = commitmentOffer(COMMITMENT_OFFERS, INTERNET.id)!

  // TEKU'S RULING, 30 SEPT: 120 and 70, so 50 a month and 600 a year. Both
  // frames print exactly this.
  expect(offerMonthlySaving(INTERNET, offer)).toBe(50)
  expect(offerYearlySaving(INTERNET, offer)).toBe(600)

  // THEY FOLLOW BOTH PRICES. A stored saving could drift from them, which is
  // precisely what Figma's education underlay does - it prints "Save RM
  // 51/month" beside "RM 600/year", and 51 x 12 is 612.
  expect(offerMonthlySaving({ ...INTERNET, amount: 130 }, offer)).toBe(60)
  expect(offerYearlySaving({ ...INTERNET, amount: 130 }, offer)).toBe(720)
  expect(offerMonthlySaving(INTERNET, { ...offer, amount: 60 })).toBe(60)

  // SUMMED IN SEN, so a two-decimal price cannot be lost to float drift.
  expect(offerMonthlySaving({ ...INTERNET, amount: 120.1 }, { ...offer, amount: 70.05 })).toBe(
    50.05,
  )
})

test('the provider name falls back to the commitment name', () => {
  // Internet is the one row Figma draws a detail for, so the one row with a
  // provider distinct from its name.
  expect(commitmentProviderName(INTERNET)).toBe('U-Mobile')
  expect(commitmentProviderName(MORTGAGE)).toBe('Mortgage')
  expect(MORTGAGE.provider).toBeUndefined()
})

test('the payment label names the ACCOUNT, and is null when it cannot', () => {
  const accounts = [
    { id: 'main', name: 'Main' },
    { id: 'joint', name: 'Joint Account' },
  ] as FiatAccount[]

  expect(commitmentPaymentLabel(accounts, INTERNET)).toBe('Bank Acc - Main')
  expect(
    commitmentPaymentLabel(accounts, { ...INTERNET, paymentAccountId: 'joint' } as Commitment),
  ).toBe('Bank Acc - Joint Account')

  // A commitment pointing at an account that does not exist is a DATA DEFECT,
  // so the card is omitted rather than dashed - the Gate 79 rule.
  expect(
    commitmentPaymentLabel(accounts, { ...INTERNET, paymentAccountId: 'nope' } as Commitment),
  ).toBeNull()
})

test('both full dates take ONE formatter, where Figma uses two', () => {
  // The frame prints "Oct 7, 2025" on one card and "15 Dec 2026" on the card
  // beside it. This app has one formatter per shape, so both cards take this.
  expect(commitmentDateLabel('2026-10-07')).toBe('07 Oct 2026')
  expect(commitmentDateLabel('2026-12-15')).toBe('15 Dec 2026')
  // en-GB abbreviates September as "Sep"; the design writes "Sept".
  expect(commitmentDateLabel('2026-09-01')).toBe('01 Sept 2026')
})

/* ────────────────────────────── the screens ──────────────────────────────── */

test.use({ viewport: DEFAULT_VIEWPORT })

test('a Plans row opens its detail, and Back returns to the Plans tab', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'plans', label: 'Plans' })

  await page.locator('.mvp-plans__commitments .mn-list-item', { hasText: 'Golf Lesson' }).click()
  await expect(page).toHaveURL(/\/finance\/plans\/commitments\/commitment-golf-lesson$/)
  await expect(page.locator('.mn-header-default')).toContainText('Golf Lesson')

  await page.locator('.mn-header-default button').first().click()
  await expect(page).toHaveURL(/\/finance$/)
  // Back lands on the PLANS tab, not the default Overview.
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveText('Plans')
})

test('the Internet detail draws four cards and the promotion banner', async ({ page }) => {
  await gotoRoute(page, '/finance/plans/commitments/commitment-internet', 'light')

  await expect(page.locator('.mvp-commitment-detail__provider')).toHaveText('U-Mobile')
  await expect(page.locator('.mvp-commitment-detail__plan')).toHaveText('U120 Plan')

  const cards = page.locator('.mvp-commitment-detail__facts > *')
  await expect(cards).toHaveCount(4)
  await expect(cards.nth(0)).toContainText('RM 120.00')
  await expect(cards.nth(1)).toContainText('07 Oct 2026')
  await expect(cards.nth(2)).toContainText('Bank Acc - Main')
  await expect(cards.nth(3)).toContainText('15 Dec 2026')

  // THE SAVING IS DERIVED, so this is the figure RM 120 - RM 70 produces.
  await expect(page.locator('.mn-inline-message--ai')).toContainText(
    'RM 50.00/month Potential Savings.',
  )
})

test('a commitment with no offer draws no banner, and omits what it lacks', async ({ page }) => {
  await gotoRoute(page, '/finance/plans/commitments/commitment-mortgage', 'light')

  await expect(page.locator('.mn-inline-message')).toHaveCount(0)
  // OMITTED, NOT DASHED - the Gate 79 rule. Mortgage has no plan name and no
  // contract end date, so neither element is in the DOM at all.
  await expect(page.locator('.mvp-commitment-detail__plan')).toHaveCount(0)
  await expect(page.locator('.mvp-commitment-detail__facts > *')).toHaveCount(3)
  await expect(page.locator('.mvp-commitment-detail__provider')).toHaveText('Mortgage')

  // A LONE TRAILING CARD STAYS ONE COLUMN WIDE - the Gate 33 parity ruling. All
  // three are the same width; without the rule the third stretches to the full
  // content column and the app would wrap two different ways.
  const widths = await page
    .locator('.mvp-commitment-detail__facts > *')
    .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width * 100) / 100))
  expect(new Set(widths).size).toBe(1)
})

test('an unknown commitment id redirects to the Plans tab without a history entry', async ({
  page,
}) => {
  await gotoRoute(page, '/finance/plans/commitments/commitment-nope', 'light')

  await expect(page).toHaveURL(/\/finance$/)
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveText('Plans')
  // `replace`, so Back cannot land on the dead URL. A fresh page's history is
  // `about:blank` plus the goto.
  expect(await page.evaluate(() => history.length)).toBe(2)
})

test('the insight opens from the banner and every figure on it is derived', async ({ page }) => {
  await gotoRoute(page, '/finance/plans/commitments/commitment-internet', 'light')
  await page.locator('.mn-inline-message--ai .mn-btn').click()

  const dialog = page.getByRole('dialog', { name: 'Smart insights' })
  await expect(dialog).toBeVisible()

  await expect(page.locator('.mvp-insight__subtitle')).toHaveText(
    'Save RM 50.00/month on your Internet bill',
  )
  const compare = page.locator('.mvp-insight__compare > *')
  await expect(compare.nth(0)).toContainText('U-Mobile')
  await expect(compare.nth(0)).toContainText('RM 120.00')
  await expect(compare.nth(1)).toContainText('Maxis')
  await expect(compare.nth(1)).toContainText('RM 70.00')
  await expect(page.locator('.mvp-insight')).toContainText('RM 600.00/year')

  // THE ARTWORK ACTUALLY DECODED. `settleImages` asserts this across the walk;
  // here it also proves `offerImageUrl` resolved the right directory.
  const natural = await page
    .locator('.mvp-insight__artwork img')
    .evaluate((img: HTMLImageElement) => img.naturalWidth)
  expect(natural).toBeGreaterThan(0)
})

test('the education panel STACKS over the insight, and Got it closes only it', async ({
  page,
}) => {
  await gotoRoute(page, '/finance/plans/commitments/commitment-internet', 'light')
  await page.locator('.mn-inline-message--ai .mn-btn').click()
  await page.locator('.mvp-insight__learn').click()

  // TWO DIALOGS, which is what `1266:14342` draws - the insight is still there
  // behind a second blanket. The walk state declares the same through the Gate
  // 50-A `opens`/`dialogs` split.
  const names = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[role="dialog"]')].map((d) =>
        (
          document.getElementById(d.getAttribute('aria-labelledby') || '')?.textContent ||
          d.getAttribute('aria-label') ||
          ''
        ).trim(),
      ),
    )
  expect(await names()).toEqual(['Smart insights', 'Smart Savings Insights'])

  await page.locator('.mn-modal__footer .mn-btn:has-text("Got it")').click()
  // ONLY THE EDUCATION PANEL CLOSES - the insight is still open beneath it.
  expect(await names()).toEqual(['Smart insights'])
})

test('the four drawn-but-unbuilt controls raise one "Coming soon." toast', async ({ page }) => {
  await gotoRoute(page, '/finance/plans/commitments/commitment-internet', 'light')

  const toast = page.locator('.mvp-finance-detail__toast')

  for (const label of ['Edit Commitment', 'Set Reminder']) {
    await page.locator(`.mvp-finance-detail__actions .mn-btn:has-text("${label}")`).click()
    await expect(toast).toHaveText('Coming soon.')
    await page.locator('.mvp-finance-detail__toast button').first().click()
    await expect(toast).toHaveCount(0)
  }

  for (const label of ['View Promotion', 'Remind Me Later']) {
    await page.locator('.mn-inline-message--ai .mn-btn').click()
    await page.locator(`.mn-modal__footer .mn-btn:has-text("${label}")`).click()
    // THE MODAL CLOSES FIRST. `Modal` renders at z-index 100 and the toast is
    // the app's fifth fixed element at tier 3, so a toast raised under an open
    // modal would sit behind its blanket.
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)
    await expect(toast).toHaveText('Coming soon.')
    await page.locator('.mvp-finance-detail__toast button').first().click()
    await expect(toast).toHaveCount(0)
  }
})

test('all three AI surfaces paint the SAME DS token sequence', async ({ page }) => {
  await gotoRoute(page, '/finance/plans/commitments/commitment-internet', 'light')
  await page.locator('.mn-inline-message--ai .mn-btn').click()
  await page.locator('.mvp-insight__learn').click()

  const read = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const tok = (n: string) => root.getPropertyValue(n).trim()
    const bg = (sel: string) => {
      const el = document.querySelector(sel)
      return el ? getComputedStyle(el).backgroundImage : null
    }
    return {
      blue400: tok('--brand-blue-400'),
      blue500: tok('--brand-blue-500'),
      violet500: tok('--brand-violet-500'),
      banner: bg('.mn-inline-message--ai'),
      hero: bg('.mvp-education__hero .mn-icon-object--ai'),
    }
  })

  // TEKU'S CONDITION, 1 OCTOBER: the gradient must be the DS's own token
  // sequence - Blue/400 -> Blue/500 -> Violet/500 - read from the DS and never
  // hand-mixed, or the AI surfaces drift. Neither the app's CSS nor either
  // component call site writes a gradient; both come from a DS rule.
  const rgb = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16)
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
  }
  for (const surface of [read.banner, read.hero]) {
    expect(surface).toContain(rgb(read.blue400))
    expect(surface).toContain(rgb(read.blue500))
    expect(surface).toContain(rgb(read.violet500))
    // The order matters as much as the membership.
    expect(surface!.indexOf(rgb(read.blue400))).toBeLessThan(surface!.indexOf(rgb(read.blue500)))
    expect(surface!.indexOf(rgb(read.blue500))).toBeLessThan(surface!.indexOf(rgb(read.violet500)))
  }
})
