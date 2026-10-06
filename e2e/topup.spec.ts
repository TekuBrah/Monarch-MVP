import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { THEMES, gotoRoute } from './harness'
import { FIAT_ACCOUNTS } from '../src/data/accounts'
import { BUDGETS } from '../src/data/budgets'
import {
  budgetAvailable,
  budgetPercentLeft,
  budgetSpent,
  canCarryReceipt,
  goalPercent,
  goalsTotal,
  netWorth,
  newReference,
  referenceFor,
  toSen,
  transactionDisposition,
} from '../src/data/derive'
import { formatMyr } from '../src/data/format'
import { GOALS } from '../src/data/goals'
import { buildHoldings } from '../src/data/holdings'
import { CRYPTO_HOLDINGS, CRYPTO_WALLETS } from '../src/data/accounts'
import { TRANSACTIONS } from '../src/data/transactions'
import type { Transaction } from '../src/data/types'
import {
  emptyTopUpDraft,
  isTopUpDraftValid,
  topUpAmount,
  topUpDraftErrors,
} from '../src/flows/finance/topUpDraft'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TOP-UP WRITER — Gate 81, and THE FIRST CODE IN THIS APP THAT MOVES MONEY.
 *
 * Every gate before this one built a read surface over a fixed seed, so a wrong
 * figure was a wrong RENDER. From here a wrong figure is a wrong WRITE, and the
 * two fail differently: a render that is wrong is wrong every time and a
 * screenshot catches it, while a write that is wrong is right until someone
 * performs it. That is what this file is for.
 *
 * THE ONE THING A BASELINE CANNOT DO IS NOTICE A FIGURE THAT DID NOT MOVE. A
 * balance that failed to change is still a well-formed number in the right
 * place and the right font; it is only wrong relative to a figure that is not
 * in the picture. `[overlay:topped-up]` pins the goal screen after a write, and
 * everything else is asserted here, against arithmetic derived from the seed
 * rather than transcribed.
 *
 * NO BASELINE IS MINTED BY THIS FILE — `frame-cap`, `tile-fill`, `unlink` and
 * `receipt-glyph`'s shape.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const GOAL = GOALS.find((g) => g.id === 'goal-bali-trip')!
const MAIN = FIAT_ACCOUNTS.find((a) => a.id === 'main')!
const JOINT = FIAT_ACCOUNTS.find((a) => a.id === 'joint')!

const GOAL_ROUTE = `/finance/plans/goals/${GOAL.id}`
const TOPUP = '[role="dialog"]'

/** `MNRC` + 8 date digits + 6 Crockford-base32 characters. */
const REFERENCE_SHAPE = /^MNRC\d{8}[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/

// ════════════════════════════════════════════════════════ THE RULES (Node) ══

test.describe('the top-up draft', () => {
  test('rejects everything that is not a positive two-decimal amount', () => {
    const bad = ['', ' ', '0', '0.00', '-5', '1e3', '0x10', '12.345', 'abc', '1,000']
    for (const amount of bad) {
      expect(
        topUpDraftErrors({ amount, sourceId: MAIN.id }, FIAT_ACCOUNTS).amount,
        `"${amount}" must be rejected`,
      ).toBe(true)
    }
    for (const amount of ['1', '0.01', '125.50', '27978.59']) {
      expect(
        topUpDraftErrors({ amount, sourceId: MAIN.id }, FIAT_ACCOUNTS).amount,
        `"${amount}" must be accepted`,
      ).toBe(false)
    }
  })

  /*
    THE ZERO GUARD, PINNED HERE AND NOT IN THE CLASSIFIER. See
    `topUpDraftErrors` for why the predicate's own `amount >= 0` boundary is
    left alone: it is aligned on purpose with `countsToward`'s identical test,
    and a zero top-up is a form problem rather than a classification one.
  */
  test('a zero top-up is refused by the FORM, and could not have been income anyway', () => {
    expect(isTopUpDraftValid({ amount: '0', sourceId: MAIN.id }, FIAT_ACCOUNTS)).toBe(false)
    expect(isTopUpDraftValid({ amount: '0.00', sourceId: MAIN.id }, FIAT_ACCOUNTS)).toBe(false)

    // And the belt to that brace: every row this writer can build is a
    // transfer, which `transactionDisposition` tests BEFORE the sign — so even
    // a zero that reached the ledger could not classify as income.
    const zeroRow: Transaction = {
      id: 'probe',
      accountId: MAIN.id,
      merchant: GOAL.name,
      logo: { kind: 'goal', filename: GOAL.image },
      method: 'Fund Transfer',
      kind: 'transfer',
      amount: 0,
      currency: 'MYR',
      occurredAt: '2026-08-15T09:41:00',
      category: 'others',
      goalId: GOAL.id,
      contributionSource: 'manual',
    }
    expect(transactionDisposition(zeroRow)).toBe('transfer')
    expect(transactionDisposition({ ...zeroRow, kind: 'payment' })).toBe('income')
  })

  test('the cap is the SOURCE account balance, to the sen', () => {
    const atCap = formatSen(toSen(MAIN.balance))
    const overCap = formatSen(toSen(MAIN.balance) + 1)
    expect(topUpDraftErrors({ amount: atCap, sourceId: MAIN.id }, FIAT_ACCOUNTS).amount).toBe(false)
    expect(topUpDraftErrors({ amount: overCap, sourceId: MAIN.id }, FIAT_ACCOUNTS).amount).toBe(true)

    // IT FOLLOWS THE SOURCE, not a fixed figure: the same amount is fine from
    // Main and over the cap from the Joint Account.
    const between = formatSen(toSen(JOINT.balance) + 1)
    expect(topUpDraftErrors({ amount: between, sourceId: MAIN.id }, FIAT_ACCOUNTS).amount).toBe(false)
    expect(topUpDraftErrors({ amount: between, sourceId: JOINT.id }, FIAT_ACCOUNTS).amount).toBe(true)
  })

  test('an unresolvable source is invalid rather than uncapped', () => {
    const errors = topUpDraftErrors({ amount: '10', sourceId: 'nope' }, FIAT_ACCOUNTS)
    expect(errors.sourceId, 'an unknown account must be reported').toBe(true)
    expect(errors.amount, 'and it must not leave the amount unbounded').toBe(true)
  })

  test('the default source is a real cash account, never a goal', () => {
    const draft = emptyTopUpDraft(MAIN.id)
    expect(draft.amount).toBe('')
    expect(FIAT_ACCOUNTS.map((a) => a.id)).toContain(draft.sourceId)
    expect(GOALS.map((g) => g.id)).not.toContain(draft.sourceId)
  })
})

// ═════════════════════════════════════════════════════ THE REFERENCE (Node) ══

test.describe('transaction references', () => {
  test('every seeded row backfills to the shape, and distinctly', () => {
    const refs = TRANSACTIONS.map(referenceFor)
    for (const [i, ref] of refs.entries()) {
      expect(ref, `${TRANSACTIONS[i].id} -> ${ref}`).toMatch(REFERENCE_SHAPE)
    }
    expect(new Set(refs).size, 'two rows must not share a reference').toBe(TRANSACTIONS.length)
  })

  test('it is STABLE for a seeded row and carries that row own date', () => {
    for (const t of TRANSACTIONS.slice(0, 8)) {
      expect(referenceFor(t), 'the backfill must be deterministic').toBe(referenceFor(t))
      expect(referenceFor(t).slice(4, 12)).toBe(t.occurredAt.slice(0, 10).replace(/-/g, ''))
    }
  })

  /*
    AND A WRITTEN ONE IS NOT DERIVABLE — which is what makes the field a RECORD
    rather than a cache of a pure function, and is the reason no walk state
    photographs one.
  */
  test('a written reference is NEW every time, and is not a function of the row', () => {
    const made = new Set(Array.from({ length: 200 }, () => newReference('2026-08-15T09:41:00')))
    expect(made.size, '200 references must not collide').toBe(200)
    for (const ref of made) expect(ref).toMatch(REFERENCE_SHAPE)
    expect([...made][0].slice(4, 12)).toBe('20260815')
  })

  test('the alphabet excludes the characters people misread', () => {
    const suffixes = TRANSACTIONS.map((t) => referenceFor(t).slice(12))
    expect(suffixes.join('')).not.toMatch(/[ILOU]/)
  })
})

// ═══════════════════════════════════════════════ THE WRITE (browser, real) ══

for (const theme of THEMES) {
  test(`a top-up moves the goal, the account and the ledger together — ${theme}`, async ({
    page,
  }) => {
    await gotoRoute(page, GOAL_ROUTE, theme)

    const before = await goalFigures(page)
    expect(before.saved, 'the seed must be where the arithmetic below assumes').toBe(
      formatMyr(GOAL.savedAmount),
    )
    expect(before.pct).toBe(`${goalPercent(GOAL)}%`)

    await topUp(page, '125.50')

    // ── THE GOAL HALF ──────────────────────────────────────────────────────
    const expectedSaved = (toSen(GOAL.savedAmount) + toSen(125.5)) / 100
    const after = await goalFigures(page)
    expect(after.saved, 'savedAmount must have moved by the amount').toBe(
      formatMyr(expectedSaved),
    )
    expect(after.pct).toBe(
      `${goalPercent({ ...GOAL, savedAmount: expectedSaved })}%`,
    )

    // ── THE ROW ────────────────────────────────────────────────────────────
    // NEWEST FIRST, so the contribution the user just made is the top row.
    const rows = page.locator('.mvp-goal-detail__rows > li')
    await expect(rows.first()).toContainText('Manual Top-Up')
    await expect(rows.first()).toContainText('RM 125.50')
  })
}

test('the account is debited and net worth does NOT move', async ({ page }) => {
  await gotoRoute(page, GOAL_ROUTE, 'light')
  await topUp(page, '125.50')

  /*
    BACK THROUGH THE APP'S OWN CONTROL, NEVER `page.goto`. A navigation
    RELOADS, and nothing here is persisted (NP1), so a reload would reset every
    figure to the seed and this test would pass against a writer that did
    nothing at all. That is not a hypothetical: it is how the first manual
    check of this gate read "the balance did not move".
  */
  await page.locator('.mn-header-default button').first().click()
  await page.getByRole('tab', { name: 'Overview' }).click()

  const cards = page.locator('.mvp-finance__grid-item')
  await expect(cards.filter({ hasText: 'Main' })).toContainText(
    formatMyr((toSen(MAIN.balance) - toSen(125.5)) / 100),
  )
  await expect(cards.filter({ hasText: 'Goals' })).toContainText(
    formatMyr((toSen(goalsTotal(GOALS)) + toSen(125.5)) / 100),
  )

  /*
    UNCHANGED, AND THAT IS THE ASSERTION RATHER THAN AN OVERSIGHT. Net worth is
    `sum(holdings) + goalsTotal`; a Top-Up takes 125.50 out of the first term
    and puts it into the second, so the total is the one figure that must NOT
    move. A writer that credited the goal without debiting the account would
    pass every assertion above this one and fail here.
  */
  const seedNetWorth = netWorth(buildHoldings(FIAT_ACCOUNTS), CRYPTO_HOLDINGS, GOALS)
  await expect(page.locator('.mvp-finance__networth-amount')).toHaveText(
    formatMyr(seedNetWorth),
  )
})

test('a top-up moves NO budget figure, because it is a transfer', async ({ page }) => {
  await gotoRoute(page, GOAL_ROUTE, 'light')
  await topUp(page, '125.50')
  await page.locator('.mn-header-default button').first().click()
  await page.getByRole('tab', { name: 'Budget' }).click()

  /*
    `countsToward` rejects on `kind` FIRST, so no amount, category or date can
    bring a contribution into a budget. Derived from the seed rather than
    transcribed, so this follows a seed change.
  */
  for (const budget of BUDGETS) {
    const card = page.locator('.mn-card-monthly-budget').filter({ hasText: budget.name })
    await expect(card).toContainText(formatMyr(budgetSpent(budget, TRANSACTIONS)))
    await expect(card).toContainText(formatMyr(budgetAvailable(budget, TRANSACTIONS)))
    await expect(card).toContainText(`${budgetPercentLeft(budget, TRANSACTIONS)}%`)
  }
})

test('the written row is a transfer: a reference, a movement summary, no receipt', async ({
  page,
}) => {
  await gotoRoute(page, GOAL_ROUTE, 'light')
  await topUp(page, '125.50')
  await page.locator('.mn-header-default button').first().click()
  await page.getByRole('tab', { name: 'Transactions' }).click()

  const rows = page.locator('.mvp-transactions__list > li')
  await expect(rows, 'the ledger must have grown by exactly one').toHaveCount(
    TRANSACTIONS.length + 1,
  )

  const written = rows.filter({ hasText: 'RM 125.50' })
  await expect(written).toHaveCount(1)
  await written.locator('button').click()

  const sheet = page.locator('[role="dialog"]')
  const value = (label: string) =>
    sheet.locator('.mvp-txn-detail__rows dt', { hasText: label }).locator('xpath=following-sibling::dd[1]')

  await expect(value('From')).toHaveText(MAIN.name)
  await expect(value('To')).toHaveText(GOAL.name)
  await expect(value('Type')).toHaveText('Manual Top-Up')

  /*
    THE SHAPE, NOT THE VALUE. A written reference is random by design
    (`newReference`), so there is nothing to transcribe — and asserting the
    shape is what proves the writer assigned one at all rather than leaving the
    field empty for `transactionReference` to throw on.
  */
  await expect(value('Reference')).toHaveText(REFERENCE_SHAPE)
  await expect(
    value('Reference'),
    'and it must not be the internal slug the row used to print',
  ).not.toContainText('txn-')

  await expect(sheet.locator('.mvp-txn-detail__movement-note')).toHaveText(
    "Transfers aren't counted in budgets.",
  )
  // A TRANSFER IS NEVER OFFERED A RECEIPT — Gate 79, and §1a's filter.
  await expect(sheet.locator('.mvp-txn-detail__receipt')).toHaveCount(0)
  await expect(sheet.locator('.mvp-txn-detail__prompt')).toHaveCount(0)
})

test('the written row can never carry a receipt', async ({ page }) => {
  await gotoRoute(page, GOAL_ROUTE, 'light')
  await topUp(page, '125.50')
  await page.locator('.mn-header-default button').first().click()
  await page.getByRole('tab', { name: 'Receipts' }).click()

  /*
    THE LINK PICKER IS THE SURFACE `MODEL-2` CLOSED, and §1a closed the matcher
    behind it. Reaching it means unlinking a receipt first, which is what the
    existing `view-picker` walk state does; here it is enough to assert the
    predicate the picker and `candidatesFor` now share, over a row built exactly
    as the writer builds one.
  */
  const written: Transaction = {
    id: 'probe',
    accountId: MAIN.id,
    merchant: GOAL.name,
    logo: { kind: 'goal', filename: GOAL.image },
    method: 'Fund Transfer',
    kind: 'transfer',
    amount: -125.5,
    currency: 'MYR',
    occurredAt: '2026-08-15T09:41:00',
    category: 'others',
    goalId: GOAL.id,
    contributionSource: 'manual',
    reference: newReference('2026-08-15T09:41:00'),
  }
  expect(canCarryReceipt(written)).toBe(false)
})

// ══════════════════════════════════════════════════════ THE FORM (browser) ══

test('the form opens clean and refuses an empty save', async ({ page }) => {
  await gotoRoute(page, GOAL_ROUTE, 'light')
  await page.locator('.mvp-finance-detail__actions .mn-btn--primary').click()

  const dialog = page.locator(TOPUP)
  await expect(dialog).toHaveCount(1)

  // PRISTINE MEANS NO RED — Gate 71-B's rule, reached by this form too.
  await expect(dialog.locator('.mn-field--invalid')).toHaveCount(0)

  await dialog.getByRole('button', { name: 'Confirm Top-Up' }).click()

  // A failed attempt reveals the field and writes nothing.
  await expect(dialog.locator('.mn-field--invalid')).toHaveCount(1)
  await expect(dialog, 'the modal must stay open').toBeVisible()
  await expect(page.locator('.mn-progress-bar__current')).toHaveText(formatMyr(GOAL.savedAmount))
})

test('an amount over the source balance is refused, and switching source re-judges it', async ({
  page,
}) => {
  await gotoRoute(page, GOAL_ROUTE, 'light')
  await page.locator('.mvp-finance-detail__actions .mn-btn--primary').click()
  const dialog = page.locator(TOPUP)

  // Between the two balances: fine from Main, too much from the Joint Account.
  const between = formatSen(toSen(JOINT.balance) + 100)
  await dialog.locator('input[name="amount"]').fill(between)
  await expect(dialog.locator('.mvp-topup__preview'), 'valid from Main').toHaveCount(1)

  /*
    THE LABEL, NOT THE INPUT. DS `Radio` hides the native control under its own
    `.mn-radio__icon-wrap` circle, so `.check()` on the input times out with the
    span intercepting the pointer — which is what a custom radio looks like from
    the outside. Clicking the `<label>` is both what a user does and what the
    implicit association is for.
  */
  await dialog.locator('.mn-radio').filter({ hasText: JOINT.name }).click()
  await expect(
    dialog.locator('.mvp-topup__preview'),
    'the same figure must become invalid when the source changes',
  ).toHaveCount(0)

  await dialog.getByRole('button', { name: 'Confirm Top-Up' }).click()
  await expect(dialog).toBeVisible()
  await expect(page.locator('.mn-progress-bar__current')).toHaveText(formatMyr(GOAL.savedAmount))
})

test('Cancel and the close control both discard', async ({ page }) => {
  await gotoRoute(page, GOAL_ROUTE, 'light')

  for (const dismiss of ['Cancel', 'close'] as const) {
    await page.locator('.mvp-finance-detail__actions .mn-btn--primary').click()
    const dialog = page.locator(TOPUP)
    await dialog.locator('input[name="amount"]').fill('125.50')
    if (dismiss === 'Cancel') {
      await dialog.getByRole('button', { name: 'Cancel' }).click()
    } else {
      await dialog.locator('.mn-overlay-header__control').click()
    }
    await expect(dialog).toHaveCount(0)
    await expect(
      page.locator('.mn-progress-bar__current'),
      `${dismiss} must write nothing`,
    ).toHaveText(formatMyr(GOAL.savedAmount))
  }

  // AND THE DRAFT IS NOT KEPT: reopening starts empty, because the modal is
  // mounted conditionally and its initialiser runs once per open.
  await page.locator('.mvp-finance-detail__actions .mn-btn--primary').click()
  await expect(page.locator(TOPUP).locator('input[name="amount"]')).toHaveValue('')
})

test('the source options are the cash accounts, with their balances, and no goal', async ({
  page,
}) => {
  await gotoRoute(page, GOAL_ROUTE, 'light')
  await page.locator('.mvp-finance-detail__actions .mn-btn--primary').click()
  const dialog = page.locator(TOPUP)

  const radios = dialog.getByRole('radio')
  await expect(radios).toHaveCount(FIAT_ACCOUNTS.length)
  for (const account of FIAT_ACCOUNTS) {
    /*
      BY ACCESSIBLE NAME, which is the authority for what this control
      announces — DS `Radio` wraps its input in the `<label>` that carries the
      text, so the name is the label and NOT the `value`. (A browser-pane
      accessibility dump reports the `value` here; Playwright's computation is
      the one that matches a screen reader.)
    */
    await expect(
      dialog.getByRole('radio', {
        name: `${account.name} · ${formatMyr(account.balance)}`,
        exact: true,
      }),
    ).toHaveCount(1)
  }
  // The default is pre-selected, so the form is usable without touching it.
  await expect(radios.first()).toBeChecked()
})

// ═══════════════════════════════════════════════════════════════ helpers ════

/** Sen as a plain decimal string — `2797859` -> `"27978.59"`. */
function formatSen(sen: number): string {
  return (sen / 100).toFixed(2)
}

async function goalFigures(page: Page) {
  return {
    saved: await page.locator('.mn-progress-bar__current').innerText(),
    pct: await page.locator('.mn-progress-bar__pct').innerText(),
  }
}

/** Open the modal, enter an amount, confirm, and wait for the modal to go. */
async function topUp(page: Page, amount: string) {
  await page.locator('.mvp-finance-detail__actions .mn-btn--primary').click()
  const dialog = page.locator(TOPUP)
  await dialog.locator('input[name="amount"]').fill(amount)
  await dialog.getByRole('button', { name: 'Confirm Top-Up' }).click()
  await expect(dialog).toHaveCount(0)
}

/*
  REFERENCED SO THE IMPORTS EARN THEIR PLACE. `topUpAmount` is the draft's own
  string-to-Amount step, which the browser tests exercise through the form
  rather than directly; `CRYPTO_WALLETS` is imported for symmetry with the
  net-worth call above, which takes the holdings this app actually holds.
*/
void topUpAmount
void CRYPTO_WALLETS
