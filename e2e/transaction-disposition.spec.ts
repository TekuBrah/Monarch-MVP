import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { OVERLAY_STATES, THEMES, activateTab, gotoRoute, gotoState } from './harness'
import type { Theme } from './harness'
import { CRYPTO_WALLETS, FIAT_ACCOUNTS } from '../src/data/accounts'
import { BUDGETS } from '../src/data/budgets'
import {
  accountDisplayName,
  budgetSpent,
  canCarryReceipt,
  contributionSourceLabel,
  goalContributions,
  goalSavedAfter,
  movementParties,
  transactionDisposition,
} from '../src/data/derive'
import { formatMyr, formatSignedMyr, formatTimestamp } from '../src/data/format'
import { GOALS } from '../src/data/goals'
import { buildHoldings } from '../src/data/holdings'
import { TRANSACTIONS } from '../src/data/transactions'
import type { Goal, Transaction } from '../src/data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TRANSACTION DISPOSITIONS — Gate 79, and the closure of `MODEL-2`.
 *
 * The detail sheet stopped being one body and became three, discriminated by
 * what kind of money movement the row is: a purchase keeps the receipt loop, a
 * transfer and an income row get a summary of where the money went, and the
 * manual link picker offers purchases only.
 *
 * NO BASELINE HERE. One walk state — `[overlay:detail-transfer]` — photographs
 * the transfer summary, and it lives in `visual.spec.ts`.
 *
 * ⚠ WHAT THIS SPEC EXISTS TO CATCH IS AN ORDERING, NOT A VALUE. The rule tests
 * `kind` BEFORE the sign of `amount`, and three seeded rows are credits that are
 * transfers — so swapping the two tests silently reclassifies them as income and
 * every count still adds to 53. That mutation is what the ordering tests below
 * are aimed at.
 *
 * THE SEEDED LEDGER IS A FIXTURE, NOT PERSONAL DATA.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const HOLDINGS = buildHoldings(FIAT_ACCOUNTS)

const byId = (id: string): Transaction => {
  const t = TRANSACTIONS.find((x) => x.id === id)
  if (!t) throw new Error(`no seeded transaction ${id}`)
  return t
}

const goalById = (id: string): Goal => {
  const g = GOALS.find((x) => x.id === id)
  if (!g) throw new Error(`no seeded goal ${id}`)
  return g
}

const BALI = goalById('goal-bali-trip')
const EMERGENCY = goalById('goal-emergency-funds')

/** A synthetic row, since the seed cannot produce an income one. */
function synthetic(over: Partial<Transaction>): Transaction {
  return {
    ...byId('txn-aeon-0915'),
    id: 'synthetic',
    ...over,
  }
}

/* ── THE RULE ────────────────────────────────────────────────────────────── */

test.describe('the disposition rule', () => {
  test('every seeded row falls into exactly one disposition, and the counts close', () => {
    const counts = { purchase: 0, transfer: 0, income: 0 }
    for (const t of TRANSACTIONS) counts[transactionDisposition(t)] += 1

    expect(counts.purchase).toBe(20)
    expect(counts.transfer).toBe(33)
    /*
      ZERO, AND IT IS A MEASUREMENT RATHER THAN AN OVERSIGHT. All three of this
      ledger's credits are `kind: 'transfer'` (Gate 75 Decision 1 = A), so the
      transfer branch claims them and the income branch is unreachable from the
      seed. It is asserted at 0 so that the day a seed gains an income row, this
      fails and whoever added it has to come and look at the render that has no
      walk state.
    */
    expect(counts.income).toBe(0)
    expect(counts.purchase + counts.transfer + counts.income).toBe(TRANSACTIONS.length)
  })

  test('a CREDIT that is a transfer stays a transfer — the rule order, on real rows', () => {
    /*
      THE THREE SEEDED CREDITS. If the sign were tested before `kind`, all three
      would become income — the counts would still close and the picker would
      still be right, which is exactly why this is asserted on the rows and not
      on the totals.
    */
    const credits = TRANSACTIONS.filter((t) => t.amount >= 0)
    expect(credits.map((t) => t.id).sort()).toEqual([
      'txn-maybank-0828',
      'txn-maybank-0907',
      'txn-rachum-0911',
    ])
    for (const t of credits) {
      expect(transactionDisposition(t), `${t.id} is a credit AND a transfer`).toBe('transfer')
    }
  })

  test('a payment with a non-negative amount is income — the branch the seed cannot reach', () => {
    expect(transactionDisposition(synthetic({ kind: 'payment', amount: 42 }))).toBe('income')
    // ZERO IS NOT AN OUTFLOW, matching `countsToward`'s own `>= 0` boundary.
    expect(transactionDisposition(synthetic({ kind: 'payment', amount: 0 }))).toBe('income')
    // ...and the ordinary case, for contrast.
    expect(transactionDisposition(synthetic({ kind: 'payment', amount: -1 }))).toBe('purchase')
  })

  test('canCarryReceipt admits exactly the purchases', () => {
    const admitted = TRANSACTIONS.filter(canCarryReceipt)
    expect(admitted).toHaveLength(20)
    for (const t of admitted) expect(transactionDisposition(t)).toBe('purchase')
    // AND NO CONTRIBUTION IS AMONG THEM — the `MODEL-2` finding, inverted.
    expect(admitted.filter((t) => t.goalId !== undefined)).toEqual([])
  })

  test('no transfer and no income row can reach a budget figure', () => {
    /*
      THE BUDGETS LINE THE SUMMARY PRINTS IS TRUE, AND IT IS CHECKED AGAINST
      `budgetSpent` RATHER THAN ASSUMED. `countsToward` is private, so this
      measures the thing the user sees: removing every non-purchase row from the
      ledger must not move any budget's spent figure.
    */
    const purchasesOnly = TRANSACTIONS.filter(canCarryReceipt)
    for (const b of BUDGETS) {
      expect(budgetSpent(b, purchasesOnly), `${b.id} spent`).toBeCloseTo(
        budgetSpent(b, TRANSACTIONS),
        2,
      )
    }
  })
})

/* ── FROM AND TO ─────────────────────────────────────────────────────────── */

test.describe('movementParties', () => {
  const parties = (t: Transaction) => movementParties(t, HOLDINGS, CRYPTO_WALLETS, GOALS)

  test('an OUTFLOW leaves the account and goes to the counterparty', () => {
    // A goal contribution: out of Main, into the goal.
    expect(parties(byId('txn-bali-c16'))).toEqual({ from: 'Main', to: 'Bali Trip' })
    // A crypto send to a person, out of a WALLET rather than a bank account.
    expect(parties(byId('txn-granddaughter-0911'))).toEqual({
      from: "Marge's Wallet",
      to: 'Granddaughter',
    })
  })

  test('a CREDIT arrives from the counterparty into the account', () => {
    expect(parties(byId('txn-maybank-0828'))).toEqual({ from: 'Maybank', to: 'Main' })
    expect(parties(byId('txn-rachum-0911'))).toEqual({ from: 'Rachum Greene', to: 'Main' })
  })

  test('the goal is LOOKED UP, not taken from the row’s merchant string', () => {
    /*
      THE 28 SEEDED CONTRIBUTIONS CARRY THE GOAL'S NAME IN `merchant` TOO, so
      against the seed alone a `merchant` read and a lookup are indistinguishable.
      A renamed goal separates them, and the lookup is what lets a rename move its
      own 16 rows with it instead of leaving them stale.
    */
    const renamed: Goal[] = GOALS.map((g) =>
      g.id === BALI.id ? { ...g, name: 'Bali Trip 2027' } : g,
    )
    const row = byId('txn-bali-c16')
    expect(row.merchant).toBe('Bali Trip')
    expect(movementParties(row, HOLDINGS, CRYPTO_WALLETS, renamed).to).toBe('Bali Trip 2027')
  })

  test('a goalId naming no goal falls back to the merchant rather than failing', () => {
    const orphan = synthetic({ kind: 'transfer', amount: -10, goalId: 'goal-gone' })
    expect(parties(orphan).to).toBe(orphan.merchant)
  })

  test('accountDisplayName names the ACCOUNT, where transactionAccount names the institution', () => {
    expect(accountDisplayName(HOLDINGS, CRYPTO_WALLETS, 'main')).toBe('Main')
    expect(accountDisplayName(HOLDINGS, CRYPTO_WALLETS, 'joint')).toBe('Joint Account')
    expect(accountDisplayName(HOLDINGS, CRYPTO_WALLETS, 'marg')).toBe("Marge's Wallet")
    expect(accountDisplayName(HOLDINGS, CRYPTO_WALLETS, 'nope')).toBeUndefined()
  })
})

/* ── THE PROGRESS SERIES ─────────────────────────────────────────────────── */

test.describe('goalSavedAfter', () => {
  test('the newest contribution lands on the stored total, for both goals', () => {
    for (const goal of [BALI, EMERGENCY]) {
      const rows = goalContributions(TRANSACTIONS, goal.id)
      expect(goalSavedAfter(TRANSACTIONS, goal, rows[0].id), goal.id).toBeCloseTo(
        goal.savedAmount,
        2,
      )
    }
  })

  test('the whole series behaves: inside [0, target], monotonic, oldest = its own magnitude', () => {
    for (const goal of [BALI, EMERGENCY]) {
      const rows = goalContributions(TRANSACTIONS, goal.id)
      expect(rows.length, goal.id).toBeGreaterThan(1)

      const series = rows.map((r) => {
        const after = goalSavedAfter(TRANSACTIONS, goal, r.id)
        expect(after, `${r.id} is a contribution and must resolve`).toBeDefined()
        return after as number
      })

      for (const [i, after] of series.entries()) {
        /*
          NOT CLAMPED, AND THAT IS WHY THIS IS ASSERTED RATHER THAN RELIED ON. A
          figure outside the range would mean the seed and the stored total
          disagree — a seed finding, which clamping would have buried.
        */
        expect(after, `${rows[i].id} is not negative`).toBeGreaterThanOrEqual(0)
        expect(after, `${rows[i].id} is not above target`).toBeLessThanOrEqual(goal.targetAmount)
      }

      // NEWEST FIRST, so the series must DECREASE as it walks back.
      for (let i = 1; i < series.length; i += 1) {
        expect(series[i], `${rows[i].id} is below the row after it`).toBeLessThan(series[i - 1])
      }

      /*
        THE OLDEST ROW LANDS ON ITS OWN MAGNITUDE, i.e. the goal held exactly
        nothing before its first contribution. That is a property of THIS seed
        rather than of the function, and it is pinned here because it is what
        makes the whole series interpretable.
      */
      const oldest = rows[rows.length - 1]
      expect(series[series.length - 1], `${goal.id} opening balance`).toBeCloseTo(
        Math.abs(oldest.amount),
        2,
      )
    }
  })

  test('it subtracts magnitudes, not signed values', () => {
    /*
      CONTRIBUTIONS ARE NEGATIVE — they debit the account the money left. Summing
      the signed values would ADD to the stored total instead of walking back from
      it, so the second-newest row would come out ABOVE the newest.
    */
    const rows = goalContributions(TRANSACTIONS, BALI.id)
    const newest = goalSavedAfter(TRANSACTIONS, BALI, rows[0].id) as number
    const second = goalSavedAfter(TRANSACTIONS, BALI, rows[1].id) as number
    expect(second).toBeCloseTo(newest - Math.abs(rows[0].amount), 2)
  })

  test('a row that is not one of this goal’s contributions returns undefined', () => {
    expect(goalSavedAfter(TRANSACTIONS, BALI, 'txn-aeon-0915')).toBeUndefined()
    // ...including a contribution to the OTHER goal.
    const other = goalContributions(TRANSACTIONS, EMERGENCY.id)[0]
    expect(goalSavedAfter(TRANSACTIONS, BALI, other.id)).toBeUndefined()
  })
})

/* ── THE RENDER ──────────────────────────────────────────────────────────── */

const SHEET = '[role="dialog"][aria-modal="true"]'
const ROWS = `${SHEET} .mvp-txn-detail__row`

/**
 * Open the Transactions tab and the detail sheet on the one row whose text
 * contains `fragment`.
 *
 * THE FRAGMENT IS A FORMATTED AMOUNT OR A FORMATTED TIMESTAMP, never an index
 * — Gate 49’s rule. An nth-child silently opens a different row the day a
 * transaction is added above it; this fails on the strict-mode violation or on
 * the assertion below instead.
 */
async function openRow(page: Page, theme: Theme, fragment: string): Promise<void> {
  await gotoRoute(page, '/finance', theme)
  await activateTab(page, { id: 'transactions', label: 'Transactions' })
  await page
    .locator(`.mvp-transactions__list > li:has-text("${fragment}") .mn-list-item`)
    .click()
  await expect(page.locator(SHEET)).toHaveCount(1)
}

/** Every rendered label/value row in the open sheet, as `label -> value`. */
async function rowMap(page: Page): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  const rows = page.locator(ROWS)
  for (let i = 0; i < (await rows.count()); i += 1) {
    const row = rows.nth(i)
    out[(await row.locator('dt').innerText()).trim()] = (
      await row.locator('dd').innerText()
    ).trim()
  }
  return out
}

for (const theme of THEMES) {
  test(`a GOAL CONTRIBUTION renders the whole transfer summary — ${theme}`, async ({
    page,
  }) => {
    const row = byId('txn-bali-c16')
    /*
      BY TIMESTAMP, NOT BY AMOUNT, and for the harness state’s own reason:
      twelve seeded rows render -RM 250.00 since Gate 77 relocated the
      contributions, so an amount locator resolves to twelve and fails strict
      mode. occurredAt is distinct across all 53 rows.
    */
    await openRow(page, theme, formatTimestamp(row.occurredAt))

    /*
      EVERY EXPECTATION IS DERIVED FROM THE SAME FUNCTION THE SCREEN CALLS. What
      this asserts is that the screen draws the derivation, not what the
      derivation is — the pure tests above are where the figures are pinned.
    */
    const expected = movementParties(row, HOLDINGS, CRYPTO_WALLETS, GOALS)
    const savedAfter = goalSavedAfter(TRANSACTIONS, BALI, row.id) as number

    expect(await rowMap(page)).toEqual({
      From: expected.from,
      To: expected.to,
      Date: formatTimestamp(row.occurredAt),
      Type: contributionSourceLabel(row.contributionSource!),
      Reference: row.id,
    })

    await expect(page.locator(`${SHEET} .mvp-txn-detail__movement-note`)).toHaveText(
      "Transfers aren't counted in budgets.",
    )
    await expect(page.locator(`${SHEET} .mvp-txn-detail__movement-progress`)).toHaveText(
      `${BALI.name}: ${formatMyr(savedAfter)} of ${formatMyr(BALI.targetAmount)} after this`,
    )

    // AND NO RECEIPT LOOP OF ANY KIND — the whole point of the disposition.
    await expect(page.locator(`${SHEET} .mvp-txn-detail__prompt`)).toHaveCount(0)
    await expect(page.locator(`${SHEET} .mvp-txn-detail__receipt`)).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Add Receipt' }),
      'a transfer is never offered a receipt',
    ).toHaveCount(0)
  })

  test(`a NON-GOAL transfer OMITS the Type row and the progress line — ${theme}`, async ({
    page,
  }) => {
    const row = byId('txn-granddaughter-0911')
    expect(row.contributionSource, 'this row must carry no source').toBeUndefined()
    await openRow(page, theme, formatSignedMyr(row.amount))

    const expected = movementParties(row, HOLDINGS, CRYPTO_WALLETS, GOALS)
    /*
      OMITTED, NOT PLACEHOLDERED. A row reading "Type —" asserts that the field
      exists and was not read, which is false: this row has no source at all. The
      em dash belongs to `UNREAD_FIGURE` and this is not that case.
    */
    expect(await rowMap(page)).toEqual({
      From: expected.from,
      To: expected.to,
      Date: formatTimestamp(row.occurredAt),
      Reference: row.id,
    })

    await expect(page.locator(`${SHEET} .mvp-txn-detail__movement-note`)).toHaveCount(1)
    await expect(page.locator(`${SHEET} .mvp-txn-detail__movement-progress`)).toHaveCount(0)
  })

  test(`a PURCHASE still gets the receipt loop and Transaction info — ${theme}`, async ({
    page,
  }) => {
    /*
      THE CONTROL THAT PROVES THE PURCHASE PATH IS UNTOUCHED. Without it, a
      disposition rule that returned 'transfer' for everything would pass every
      assertion above.
    */
    const row = byId('txn-aeon-0915')
    await openRow(page, theme, formatSignedMyr(row.amount))

    await expect(page.locator(`${SHEET} .mvp-txn-detail__prompt`)).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Add Receipt' })).toHaveCount(1)
    await expect(page.locator(`${SHEET} .mvp-txn-detail__movement-note`)).toHaveCount(0)

    // Its three glyph rows, and NOT the movement's five.
    expect(Object.keys(await rowMap(page))).toEqual(['Date', 'Category', 'Payment Method'])
  })
}

test('the link picker offers purchases only', async ({ page }) => {
  const picker = OVERLAY_STATES.find((s) => s.overlay?.id === 'view-picker')
  expect(picker, 'the view-picker overlay state has been renamed or removed').toBeDefined()
  await gotoState(page, picker!, 'light')

  /*
    THE EXPECTED COUNT IS DERIVED, AND IT ACCOUNTS FOR THE STATE'S OWN WRITE.
    Reaching the picker means UNLINKING first — that is what the state's prepare
    steps do — but an unlink changes which rows carry a GLYPH, not which rows are
    OFFERED, so the offered set is still every purchase in the seed.
  */
  const rows = page.locator('.mvp-link-picker .mn-list-item')
  await expect(rows).toHaveCount(TRANSACTIONS.filter(canCarryReceipt).length)

  /*
    AND NOT ONE OF THEM IS A MOVEMENT. Asserted on the RENDERED text rather than
    on the data, because the question is what the picker OFFERS — a data-side
    check would pass even if the filter stopped reaching the render. Both goal
    names plus the two crypto counterparties: 30 rows used to be here.
  */
  const text = (await page.locator('.mvp-link-picker').innerText()).toLowerCase()
  for (const name of [...GOALS.map((g) => g.name), 'Granddaughter']) {
    expect(text, `${name} cannot carry a receipt and must not be offered`).not.toContain(
      name.toLowerCase(),
    )
  }
})
