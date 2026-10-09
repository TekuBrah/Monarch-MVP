import { expect, test } from '@playwright/test'
import { activateTab, gotoRoute } from './harness'

import { BUDGETS } from '../src/data/budgets'
import {
  budgetAvailable,
  budgetPercentLeft,
  budgetPeriodLabel,
  budgetSpent,
  budgetSpentByCategory,
} from '../src/data/derive'
import { formatMyr } from '../src/data/format'
import { TRANSACTIONS } from '../src/data/transactions'
import type { Budget, Transaction } from '../src/data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BUDGET DERIVATIONS — Gate 67, Decision 2A.
 *
 * THE DERIVATION TESTS ARE A PURE IMPORT, NO PAGE — the `parse-receipt.spec.ts`
 * precedent. The one browser test is the last in the file. Everything
 * here is a function of `(budget, transactions)`, so a browser would add nothing
 * but time.
 *
 * THE EXPECTED FIGURES ARE WRITTEN OUT, NOT RECOMPUTED. They were verified by
 * hand against the seeded ledger at Gate 67 (and by the review thread against a
 * clone of `6601637` before it). A test that re-derived them with the same
 * filter as `derive.ts` would only prove the function agrees with itself.
 *
 * THE LEDGER'S FIGURES ARE NOT PERSONAL DATA: they are the seeded fixture.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const byId = (id: string): Budget => {
  const found = BUDGETS.find((b) => b.id === id)
  if (!found) throw new Error(`no seeded budget ${id}`)
  return found
}

const MONTHLY = byId('budget-monthly')
const ENTERTAINMENT = byId('budget-entertainment')

/** A synthetic outflow, dated by its first 10 characters like every real row. */
function row(id: string, occurredAt: string, amount: number, category: Transaction['category']): Transaction {
  return {
    id,
    accountId: 'main',
    merchant: id,
    method: 'Card Payment',
    // A synthetic row is a PAYMENT, so it counts — the transfer case is
    // exercised by its own test below rather than by the shared builder.
    kind: 'payment',
    amount,
    currency: 'MYR',
    occurredAt,
    category,
    logo: { kind: 'person', initials: 'XX' },
  }
}

test('the seeded ledger is the shape the budgets are derived over', () => {
  expect(TRANSACTIONS).toHaveLength(254)
  const byMonth = new Map<string, number>()
  for (const t of TRANSACTIONS) {
    const month = t.occurredAt.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1)
  }

  /*
    GATE 77 TOOK THIS LEDGER FROM 25 ROWS IN THREE MONTHS TO 53 IN FOURTEEN,
    and the SHAPE is the finding rather than the count. The 25 spending rows
    sit in two clusters - 23 in Aug/Sept 2025 and the two Gate 53 rows in Sept
    2026 - and the 28 relocated contributions span the whole gap between them.

    SO TEN MONTHS OF THIS LEDGER ARE SAVINGS AND NOTHING ELSE: Oct 2025
    through Jul 2026 contain no spending at all. That is a property of the
    SPENDING seed, not of the contributions, and adjusting it is a product
    call nobody has made - recorded here rather than fixed.
  */
  // GATE 82 FILLED THE GAP: 201 rows dated 21 Sept 2025 – 11 Sept 2026.
  expect(Object.fromEntries(byMonth)).toEqual({
    '2026-09': 9,
    '2026-08': 19,
    '2026-07': 22,
    '2026-06': 18,
    '2026-05': 20,
    '2026-04': 20,
    '2026-03': 21,
    '2026-02': 18,
    '2026-01': 21,
    '2025-12': 20,
    '2025-11': 19,
    '2025-10': 18,
    '2025-09': 24,
    '2025-08': 5,
  })

  // `ledgerNow()` IS UNMOVED, WHICH IS WHAT COULD HAVE BROKEN THE DATE FACET.
  // The newest row is still the Gate 53 pair; the newest contribution is
  // 2026-08-15, a month behind it.
  const newest = [...TRANSACTIONS].sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt),
  )[0]
  expect(newest?.occurredAt).toBe('2026-09-12T16:13:00')
})

/**
 * THESE THREE FIGURES MOVED AT GATE 75 AND THE OLD ONES ARE NAMED ON PURPOSE.
 * Before transfers were excluded by kind this read 3,359.67 / 4,140.33 / 55%.
 * The two crypto rows the exclusion removes are `others` outflows of 350.69 and
 * 400.15 inside this window: 3,359.67 − 750.84 = 2,608.83.
 */
test('Monthly Budget: spent 2,608.83, available 4,891.17, 65% left', () => {
  expect(budgetSpent(MONTHLY, TRANSACTIONS)).toBe(2608.83)
  // 7,500.00 − 2,608.83 = 4,891.17
  expect(budgetAvailable(MONTHLY, TRANSACTIONS)).toBe(4891.17)
  // floor(4,891.17 / 7,500 × 100) = floor(65.2156) = 65
  expect(budgetPercentLeft(MONTHLY, TRANSACTIONS)).toBe(65)
})

test('Monthly Budget: spent by category is the seven figures, 14 rows', () => {
  expect(budgetSpentByCategory(MONTHLY, TRANSACTIONS)).toEqual([
    { category: 'bills', spent: 143.9, count: 2 },
    { category: 'groceries', spent: 1118.46, count: 5 },
    { category: 'dining', spent: 123.76, count: 2 },
    { category: 'healthcare', spent: 26.29, count: 1 },
    { category: 'transport', spent: 100, count: 1 },
    { category: 'shopping', spent: 968.42, count: 2 },
    // 878.84 OVER 3 ROWS BEFORE GATE 75. The two crypto transfers left, so the
    // one remaining row is `txn-anytimefitness-0903` at 128.00.
    { category: 'others', spent: 128, count: 1 },
  ])
  // Six categories are untouched by the exclusion; only `others` held transfers.
  const total = budgetSpentByCategory(MONTHLY, TRANSACTIONS).reduce((n, c) => n + c.count, 0)
  expect(total).toBe(14)
})

test('Entertainment: spent 123.76, available 876.24, 87% left', () => {
  expect(budgetSpent(ENTERTAINMENT, TRANSACTIONS)).toBe(123.76)
  // 1,000.00 − 123.76 = 876.24
  expect(budgetAvailable(ENTERTAINMENT, TRANSACTIONS)).toBe(876.24)
  // floor(87.624) = 87
  expect(budgetPercentLeft(ENTERTAINMENT, TRANSACTIONS)).toBe(87)
})

test('credits are excluded — the window holds +350.00 and +1,500.00 and neither counts', () => {
  const credits = TRANSACTIONS.filter((t) => {
    const day = t.occurredAt.slice(0, 10)
    return t.amount > 0 && day >= MONTHLY.from && day <= MONTHLY.to
  }).map((t) => t.amount)
  expect(credits.sort((a, b) => a - b)).toEqual([350, 1500])

  // Both credits are `others`, and since Gate 75 both are also `kind: 'transfer'`
  // — so they are excluded twice over. The category's one remaining counted row
  // is `txn-anytimefitness-0903`, a 128.00 card payment.
  const others = budgetSpentByCategory(MONTHLY, TRANSACTIONS).find((c) => c.category === 'others')
  expect(others).toEqual({ category: 'others', spent: 128, count: 1 })
})

test('an overspent budget has NEGATIVE available and 0% left', () => {
  const tight: Budget = { ...MONTHLY, id: 'synthetic-tight', limit: 100, categories: ['groceries'] }
  // 100.00 − 1,118.46 = −1,018.46
  expect(budgetAvailable(tight, TRANSACTIONS)).toBe(-1018.46)
  expect(budgetPercentLeft(tight, TRANSACTIONS)).toBe(0)
})

test('both boundary dates are inclusive, and the day after `to` is excluded', () => {
  const span: Budget = {
    id: 'synthetic-window',
    name: 'Window',
    categories: ['transport'],
    limit: 100,
    from: '2030-01-10',
    to: '2030-01-20',
    autoRenew: false,
  }
  const rows = [
    row('on-from-at-midnight', '2030-01-10T00:00:00', -1, 'transport'),
    row('on-to-last-minute', '2030-01-20T23:59:00', -2, 'transport'),
    row('day-after-to', '2030-01-21T00:00:00', -4, 'transport'),
    row('day-before-from', '2030-01-09T23:59:00', -8, 'transport'),
    row('other-category', '2030-01-15T12:00:00', -16, 'dining'),
  ]
  expect(budgetSpent(span, rows)).toBe(3)
  expect(budgetSpentByCategory(span, rows)).toEqual([{ category: 'transport', spent: 3, count: 2 }])
})

test('the period label matches Figma, and every budget field survives JSON', () => {
  // Figma `1266:14334`, both cards: "30 Aug - 20 Sept" — space, U+002D, space.
  expect(budgetPeriodLabel(MONTHLY)).toBe('30 Aug - 20 Sept')
  expect(budgetPeriodLabel(ENTERTAINMENT)).toBe('30 Aug - 20 Sept')
  // NP1: plain serialisable data, so persistence later is an adapter.
  expect(JSON.parse(JSON.stringify(BUDGETS))).toEqual(BUDGETS)
})

/*
  THE ONE BROWSER TEST IN THIS FILE. It checks the Budget tab draws what the
  derivations above return, through the DS card. A screenshot shows the digits,
  but it cannot say they came from the ledger.
*/
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FLOW 11 (GATE 75) — A TRANSFER DOES NOT COUNT, EVEN IN ITS OWN CATEGORY.
 *
 * THIS IS THE ONE BEHAVIOUR `kind` MADE ASSERTABLE, and it is written so that
 * every plausible wrong implementation fails it:
 *
 *   - a `countsToward` that ignores `kind` fails assertion 2;
 *   - one filtering on `method` instead fails assertion 3, because a
 *     `Fund Transfer` bill payment MUST still count;
 *   - one excluding by CATEGORY rather than by kind fails assertion 4, because
 *     `others` still has a counted row.
 *
 * THE ROWS ARE THE REAL SEED, NOT SYNTHETIC. The claim is that the shipped
 * ledger's own transfers are excluded, and a constructed row cannot establish it.
 * ─────────────────────────────────────────────────────────────────────────────
 */
test('a transfer does not count toward a budget that lists its own category', () => {
  const transfers = TRANSACTIONS.filter((t) => t.kind === 'transfer')
  // 5 original transfers + the 28 goal contributions Gate 77 relocated.
  expect(transfers).toHaveLength(33)

  // The two that would otherwise count: outflows, in category, in range.
  const wouldCount = transfers.filter(
    (t) =>
      t.amount < 0 &&
      MONTHLY.categories.includes(t.category) &&
      t.occurredAt.slice(0, 10) >= MONTHLY.from &&
      t.occurredAt.slice(0, 10) <= MONTHLY.to,
  )
  /*
    A CONTRIBUTION JOINED THIS SET AT GATE 77 AND IT STRENGTHENS THE TEST.
    `txn-bali-c01` is an outflow of -250 dated 2025-09-15 in category `others`,
    which this budget lists, inside this budget’s window - every condition
    `countsToward` tests EXCEPT `kind`. It is excluded for exactly one reason,
    and that reason is the field this whole test exists to pin.
  */
  expect(wouldCount.map((t) => t.id).sort()).toEqual([
    'txn-bali-c01',
    'txn-granddaughter-0911',
    'txn-rachum-0910',
  ])

  // 1 — both are 'others', a category this budget DOES list. So nothing about
  // the category is what removes them.
  expect(wouldCount.every((t) => t.category === 'others')).toBe(true)
  expect(MONTHLY.categories).toContain('others')

  // 2 — and 1,000.84 is out of spent. 750.84 of that is the two crypto
  // transfers, which is what took this budget from the 3,359.67 it reported
  // until Gate 75 down to 2,608.83; the remaining 250.00 is Gate 77’s
  // `txn-bali-c01`, which never counted because it never existed here before.
  const excluded = wouldCount.reduce((sen, t) => sen - Math.round(t.amount * 100), 0) / 100
  expect(excluded).toBe(1000.84)
  expect(budgetSpent(MONTHLY, TRANSACTIONS)).toBe(2608.83)
  expect(budgetSpent(MONTHLY, TRANSACTIONS) + excluded).toBe(3609.67)

  // 3 — A FUND TRANSFER BILL PAYMENT STILL COUNTS. This is what separates
  // reading 'kind' from reading 'method': four Fund Transfer rows are ordinary
  // purchases, and 'dining' holds one of them.
  const fundPayments = TRANSACTIONS.filter(
    (t) => t.method === 'Fund Transfer' && t.kind === 'payment',
  )
  expect(fundPayments.map((t) => t.id).sort()).toEqual([
    'txn-aia-0825',
    'txn-ikea-0906',
    'txn-tonyroma-0910',
    'txn-touchngo-0909',
  ])
  const counted = budgetSpentByCategory(MONTHLY, TRANSACTIONS)
  const dining = counted.find((c) => c.category === 'dining')
  // txn-tonyroma-0910 is a Fund Transfer of −98.26 and is inside this figure.
  expect(dining).toEqual({ category: 'dining', spent: 123.76, count: 2 })

  // 4 — AND THE EXCLUSION IS BY KIND, NOT BY CATEGORY: 'others' is not dropped,
  // it keeps the one payment it still has.
  const others = counted.find((c) => c.category === 'others')
  expect(others).toEqual({ category: 'others', spent: 128, count: 1 })
})

test('every seeded row carries an explicit kind, and the transfers are classified', () => {
  // A MISSING 'kind' IS A COMPILE ERROR, not a runtime one — so this asserts the
  // CLASSIFICATION, which the compiler cannot hold.
  /*
    LISTED WITHOUT THE CONTRIBUTIONS, WHICH IS WHY THIS FILTERS ON `goalId`.
    Gate 77 added 28 more transfers, and naming all 33 here would turn a
    classification assertion into a transcription of the seed. The five below
    are the ones a reader has to think about; the 28 are transfers by
    construction and are pinned in `goals.spec.ts`.
  */
  const classified = TRANSACTIONS.filter(
    (t) => t.kind === 'transfer' && t.goalId === undefined,
  )
  expect(classified.map((t) => t.id)).toEqual([
    'txn-rachum-0911',
    'txn-granddaughter-0911',
    'txn-rachum-0910',
    'txn-maybank-0907',
    'txn-maybank-0828',
  ])
  expect(TRANSACTIONS.filter((t) => t.goalId !== undefined)).toHaveLength(28)
  expect(TRANSACTIONS.filter((t) => t.kind === 'payment')).toHaveLength(221) // Gate 82: 20 + 201

  // BOTH CRYPTO TRANSFERS ARE TRANSFERS (Teku, 30 Sept 2026): crypto in Monarch
  // is an investment move or money sent to a person, never a purchase.
  const crypto = TRANSACTIONS.filter((t) => t.method === 'Crypto Transfer')
  expect(crypto).toHaveLength(2)
  expect(crypto.every((t) => t.kind === 'transfer')).toBe(true)

  // THE THREE INBOUND CREDITS ARE TRANSFERS TOO, and there is deliberately no
  // 'income' kind: direction is carried by the sign, which countsToward reads.
  // GATE 82: the refund txn-ikea-refund-260117 is the one credit that is a
  // PAYMENT (income), so the three transfer credits are now filtered by kind.
  const allCredits = TRANSACTIONS.filter((t) => t.amount > 0)
  expect(allCredits.filter((t) => t.kind === 'payment').map((t) => t.id)).toEqual([
    'txn-ikea-refund-260117',
  ])
  const credits = allCredits.filter((t) => t.kind === 'transfer')
  expect(credits.map((t) => t.id).sort()).toEqual([
    'txn-maybank-0828',
    'txn-maybank-0907',
    'txn-rachum-0911',
  ])

  // AND FOUR OF THE SEVEN NON-CONTRIBUTION FUND TRANSFERS ARE PAYMENTS —
  // 'Fund Transfer' is a payment rail, not a movement type. Gate 77's 28
  // contributions ride the same rail, which is why they are excluded here:
  // counting them would restate their own classification rather than test this
  // one.
  expect(
    TRANSACTIONS.filter(
      (t) => t.method === 'Fund Transfer' && t.goalId === undefined,
    ),
  ).toHaveLength(7)
  expect(TRANSACTIONS.filter((t) => t.method === 'Fund Transfer')).toHaveLength(35)
})

test('the Budget tab draws each seeded budget from its derived figures', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'budget', label: 'Budget' })

  const cards = page.locator('.mvp-budget .mn-card-monthly-budget:not(.mn-card-monthly-budget--add-new)')
  await expect(cards).toHaveCount(2)
  await expect(page.locator('.mvp-budget .mn-card-monthly-budget--add-new')).toHaveCount(1)
  await expect(page.locator('.mvp-coming-soon')).toHaveCount(0)

  const monthly = cards.nth(0)
  await expect(monthly.locator('.mn-card-monthly-budget__header-title')).toHaveText('Monthly Budget')
  await expect(monthly).toContainText('30 Aug - 20 Sept')
  // THE THREE FIGURES MOVED AT GATE 75 — they read 55%, RM 4,140.33 and
  // RM 3,359.67 before transfers stopped counting. They are DERIVED here rather
  // than restated, so the next change to the rule moves the assertion with it:
  // the literals above are what this test existed to catch drifting.
  await expect(monthly).toContainText(`${budgetPercentLeft(MONTHLY, TRANSACTIONS)}%`)
  await expect(monthly).toContainText(formatMyr(budgetAvailable(MONTHLY, TRANSACTIONS)))
  await expect(monthly).toContainText(formatMyr(MONTHLY.limit))
  await expect(monthly).toContainText(formatMyr(budgetSpent(MONTHLY, TRANSACTIONS)))
  // Pinned too, so a derivation that silently returned 0 could not pass.
  await expect(monthly).toContainText('65%')
  await expect(monthly).toContainText('RM 2,608.83')
  await expect(monthly.getByRole('button', { name: 'Details for Monthly Budget' })).toHaveCount(1)

  const entertainment = cards.nth(1)
  await expect(entertainment.locator('.mn-card-monthly-budget__header-title')).toHaveText('Entertainment')
  // UNCHANGED BY GATE 75, and asserted as literals because that is the claim:
  // this budget lists only `dining`, which held no transfer.
  await expect(entertainment).toContainText('87%')
  await expect(entertainment).toContainText('RM 876.24')
  await expect(entertainment).toContainText('RM 1,000.00')
  await expect(entertainment).toContainText('RM 123.76')

  // Every card fills the content column (G36, `sizing="fill"`).
  for (const card of await page.locator('.mvp-budget .mn-card-monthly-budget').all()) {
    await expect(card).toHaveClass(/\bmn-card-monthly-budget--fill\b/)
  }
})
