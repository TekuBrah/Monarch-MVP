import { expect, test, type Locator, type Page } from '@playwright/test'

import { FIAT_ACCOUNTS } from '../src/data/accounts'
import { goalsTotal, netWorth, toSen } from '../src/data/derive'
import { formatMyr } from '../src/data/format'
import { GOALS } from '../src/data/goals'
import { buildHoldings } from '../src/data/holdings'
import { CRYPTO_HOLDINGS } from '../src/data/accounts'
import {
  autoSaveAmountError,
  draftFromGoal,
  emptyGoalDraft,
  goalDraftErrors,
  goalDraftToSettings,
  isGoalDraftChanged,
  type GoalDraft,
} from '../src/flows/finance/goalDraft'
import { gotoRoute } from './harness'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * THE GOAL LIFECYCLE — Gate 81-B. Create, Edit, Delete, auto-save, image.
 *
 * NO BASELINE. Everything here is a FIGURE or a STRUCTURE, and the six walk
 * states carry the pixels.
 *
 * ⚠ THE RELOAD RULE GOVERNS EVERY BROWSER TEST IN THIS FILE. Nothing is
 * persisted (NP1), so `page.goto` discards the write and a spec that navigated
 * by URL would pass against a writer that did nothing at all — Gate 81 reported
 * exactly that near-miss. EVERY cross-screen assertion below therefore moves
 * through the app's own controls: the header's Back, the tab bar's own tabs.
 * ═════════════════════════════════════════════════════════════════════════════
 */

const BALI = GOALS[0]!
const EMERGENCY = GOALS[1]!
const MAIN = FIAT_ACCOUNTS[0]!
const JOINT = FIAT_ACCOUNTS[1]!

const goalRoute = (id: string) => `/finance/plans/goals/${id}`

/* ────────────────────────────── the rules, in Node ───────────────────────── */

test('the seeded goals carry a funding account and an AI image origin', () => {
  for (const goal of GOALS) {
    /*
      BACKFILLED, NOT INVENTED: every seeded contribution debits Main, so Main
      is the account that has in fact been funding both goals.
    */
    expect(goal.fundingAccountId).toBe(MAIN.id)
    expect(FIAT_ACCOUNTS.map((a) => a.id)).toContain(goal.fundingAccountId)
    // Both seeded images ARE the AI artwork Figma ships — the claim Gate 78
    // made unconditionally and this gate now stores and checks.
    expect(goal.imageOrigin).toBe('ai')
  }
})

test('a target BELOW the saved amount is permitted — the overshoot ruling', () => {
  /*
    THE RULE IS CONSISTENCY WITH A WRITER THAT ALREADY SHIPS. `topUpDraftErrors`
    caps a top-up at the SOURCE ACCOUNT'S balance and not at the goal's
    remaining need, so overshoot is already reachable and `goalPercent` already
    clamps to 100 for it. A form stricter than the writer that makes the same
    state would trap the one user who most needs the control.
  */
  const draft: GoalDraft = {
    ...draftFromGoal(BALI),
    targetAmount: '1.00', // far below the stored 5,040
  }
  expect(goalDraftErrors(draft, FIAT_ACCOUNTS).targetAmount).toBe(false)
  expect(goalDraftToSettings(draft).targetAmount).toBe(1)
})

test('every other draft rule', () => {
  const ok: GoalDraft = {
    name: 'New Phone',
    targetAmount: '5000.00',
    targetDate: '2026-05-30',
    fundingAccountId: MAIN.id,
    autoSaveEnabled: false,
    autoSaveAmount: '',
  }
  expect(goalDraftErrors(ok, FIAT_ACCOUNTS)).toEqual({
    name: false,
    targetAmount: false,
    targetDate: false,
    fundingAccountId: false,
    autoSaveAmount: false,
  })

  const e = (d: Partial<GoalDraft>) => goalDraftErrors({ ...ok, ...d }, FIAT_ACCOUNTS)

  expect(e({ name: '   ' }).name).toBe(true)
  expect(e({ targetAmount: '0' }).targetAmount).toBe(true)
  expect(e({ targetAmount: '1e3' }).targetAmount).toBe(true) // `Number` would take it
  expect(e({ targetAmount: '1.234' }).targetAmount).toBe(true)
  expect(e({ targetAmount: '999999.99' }).targetAmount).toBe(false)
  expect(e({ targetAmount: '1000000.00' }).targetAmount).toBe(true)
  expect(e({ targetDate: '30/05/2026' }).targetDate).toBe(true)
  expect(e({ fundingAccountId: 'nope' }).fundingAccountId).toBe(true)

  /*
    AUTO-SAVE'S AMOUNT IS REQUIRED ONLY WHILE THE SWITCH IS ON. Blank is fine
    off and invalid on — the asymmetry is the rule, so both directions assert.
  */
  expect(e({ autoSaveEnabled: false, autoSaveAmount: '' }).autoSaveAmount).toBe(false)
  expect(e({ autoSaveEnabled: true, autoSaveAmount: '' }).autoSaveAmount).toBe(true)
  expect(e({ autoSaveEnabled: true, autoSaveAmount: '250.00' }).autoSaveAmount).toBe(false)
  expect(e({ autoSaveEnabled: false, autoSaveAmount: 'abc' }).autoSaveAmount).toBe(true)
})

test('the pencil and the form agree about a valid monthly figure', () => {
  /*
    ONE DEFINITION. `autoSaveAmountError` asks `goalDraftErrors` over a
    synthetic draft rather than carrying a second regex, so these two can never
    drift apart. Asserted over the whole space the form distinguishes.
  */
  for (const amount of ['', '0', '250', '250.00', '1.234', 'abc', '999999.99', '1000000.00']) {
    const viaForm = goalDraftErrors(
      { ...emptyGoalDraft(MAIN.id), autoSaveEnabled: true, autoSaveAmount: amount },
      FIAT_ACCOUNTS,
    ).autoSaveAmount
    expect(autoSaveAmountError(amount), `"${amount}"`).toBe(viaForm)
  }
})

test('an unchanged edit draft reports unchanged, and one field is enough to move it', () => {
  for (const goal of GOALS) {
    expect(isGoalDraftChanged(goal, draftFromGoal(goal))).toBe(false)
  }
  expect(isGoalDraftChanged(BALI, { ...draftFromGoal(BALI), name: 'Bali Trip ' })).toBe(true)
  expect(isGoalDraftChanged(BALI, { ...draftFromGoal(BALI), fundingAccountId: JOINT.id })).toBe(
    true,
  )
})

test('the settings a form writes cannot name savedAmount', () => {
  const settings = goalDraftToSettings(draftFromGoal(BALI))
  expect(Object.keys(settings).sort()).toEqual([
    'autoSave',
    'fundingAccountId',
    'name',
    'targetAmount',
    'targetDate',
  ])
  expect('savedAmount' in settings).toBe(false)
})

/* ─────────────────────────── the writers, in a browser ───────────────────── */

const openPlans = async (page: Page, theme: 'light' | 'dark' = 'light') => {
  await gotoRoute(page, '/finance', theme)
  await page.getByRole('tab', { name: 'Plans' }).click()
  await expect(page.locator('.mvp-plans')).toBeVisible()
}

/** Reads the Overview tab's hero and Savings Goals card WITHOUT navigating by URL. */
const readOverview = async (page: Page) => {
  await page.getByRole('tab', { name: 'Overview' }).click()
  const hero = await page.locator('.mvp-finance__networth-amount').innerText()
  const savings = await page
    .locator('.mvp-finance__grid-item', { hasText: 'Goals' })
    .first()
    .innerText()
  return { hero: hero.trim(), savings }
}

/** Reads the Budget tab's cards WITHOUT navigating by URL — the reload rule. */
const readBudgets = async (page: Page) => {
  await page.getByRole('tab', { name: 'Budget' }).click()
  const budgets = page.locator('.mvp-budget')
  await expect(budgets).toBeVisible()
  return (await budgets.innerText()).trim()
}

/*
  THE SHAPE OF `Transaction.reference`, derived from the generator rather than
  from a worked example: `REFERENCE_ALPHABET` in `src/data/derive.ts` is
  '0123456789ABCDEFGHJKMNPQRSTVWXYZ' — Crockford base32, which leaves out I, L, O
  and U because those are the characters a person misreads off a screen. So the
  class below is exactly that alphabet: 0-9, A-H, J, K, M, N, P-T, V-Z. `MNRC` is
  the brand tag, then YYYYMMDD, then six — 18 in all.
*/
const REFERENCE_SHAPE = /^MNRC\d{8}[0-9A-HJKMNP-TV-Z]{6}$/

/**
 * ONE ROW OF THE MOVEMENT SUMMARY, found by its OWN label.
 *
 * ⚠ THIS EXISTS BECAUSE A NAME CHECK THE SURROUNDING CHROME ALSO SATISFIES
 * CANNOT SEE A FALLBACK. The sheet's title and its note both print the goal's
 * name, so `sheet.toContainText(name)` passed with the From/To fallback broken
 * (mutation M11 proved it) — the assertion was true for a reason that had
 * nothing to do with the row it was written to protect. Scoping to the `<dd>`
 * beside the `<dt>` that says "From" removes every other place the text could
 * come from.
 */
const summaryValue = (sheet: Locator, label: string): Locator =>
  sheet
    .locator('.mvp-txn-detail__row', {
      // `has` is queried RELATIVE to each row, so it must not repeat the
      // dialog prefix — a page-level locator is how Playwright spells that.
      has: sheet.page().locator('dt', { hasText: new RegExp('^' + label + '$') }),
    })
    .locator('dd')

/*
  FIELDS ARE LOCATED BY THEIR VISIBLE LABEL, which is the convention
  `budget-writers.spec.ts` set and the one that actually resolves: DS `Field`
  renders a real <label>, so the control's accessible name is that label (plus
  the required marker) rather than the `ariaLabel` prop. Found by a locator
  built on `ariaLabel` timing out — the convention is not cosmetic.
*/
const fillGoalForm = async (
  page: Page,
  values: { name: string; target: string; date: string },
) => {
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Goal Name').fill(values.name)
  await modal.getByLabel('Target Amount (RM)').fill(values.target)
  await modal.getByLabel('Target date').fill(values.date)
}

test('creating a goal adds a card, starts it empty, and moves no money', async ({ page }) => {
  await openPlans(page)
  const before = await readOverview(page)
  await page.getByRole('tab', { name: 'Plans' }).click()

  await expect(page.locator('.mvp-plans__goals > li')).toHaveCount(2)
  await page.locator('.mvp-plans__section').first().getByRole('link', { name: 'Add New' }).click()
  await fillGoalForm(page, { name: 'New Phone', target: '5000.00', date: '2026-05-30' })
  await page.getByRole('button', { name: 'Save Goal' }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  const cards = page.locator('.mvp-plans__goals > li')
  await expect(cards).toHaveCount(3)
  await expect(cards.nth(2)).toContainText('New Phone')
  // STARTS EMPTY — Figma's form captures no initial deposit.
  await expect(cards.nth(2)).toContainText(formatMyr(0))
  await expect(cards.nth(2)).toContainText('0%')

  /*
    AND NO MONEY MOVED. A created goal holds nothing, so the Savings Goals card
    and the net-worth hero must both be EXACTLY where they were — the assertion
    that would fail if `createGoal` ever grew an initial deposit by accident.
  */
  expect(await readOverview(page)).toEqual(before)
})

test('a created goal takes the placeholder image and wears NO "Ai Image" badge', async ({
  page,
}) => {
  await openPlans(page)
  await page.locator('.mvp-plans__section').first().getByRole('link', { name: 'Add New' }).click()
  await fillGoalForm(page, { name: 'New Phone', target: '5000.00', date: '2026-05-30' })
  await page.getByRole('button', { name: 'Save Goal' }).click()

  await page.locator('.mvp-plans__goals > li').nth(2).getByRole('button').click()
  await expect(page.locator('.mvp-goal-detail')).toBeVisible()

  const img = page.locator('.mvp-goal-detail__image img')
  await expect(img).toHaveAttribute('src', '/media/goals/goal_placeholder.jpg')
  // IT STILL RENDERS — `settleImages` would fail the walk on a 0-width image,
  // and this is the one asset this gate added. POLLED: `naturalWidth` is 0 until
  // the load finishes, so a single read races it (see the upload test below).
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0)
  // NO BADGE: a flat surface is not artwork, so claiming a model made it would
  // be the false claim the gating exists to stop.
  await expect(page.locator('.mvp-goal-detail__image .mn-tag')).toHaveCount(0)
})

test('the funding source is a picker VIEW, and the choice comes back to the form', async ({
  page,
}) => {
  await openPlans(page)
  await page.locator('.mvp-plans__section').first().getByRole('link', { name: 'Add New' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toHaveAccessibleName('Add a Goal')
  /*
    A `Select`'S VALUE IS AN <input value>, NOT TEXT CONTENT. `toContainText`
    over `.mn-select` reads only the floating caption label — found by that
    assertion receiving "Funding Source" where it expected "Main".
  */
  await expect(dialog.locator('.mn-select__input')).toHaveValue(MAIN.name)

  await dialog.locator('.mvp-goal-form__source .mn-select').click()

  /*
    ONE DIALOG, RENAMED — not a second stack. The Modal's accessible name is its
    title and the title becomes the task, which is why a `getByRole('dialog',
    { name })` locator has to be re-acquired here.
  */
  const picker = page.getByRole('dialog', { name: 'Select funding source' })
  await expect(picker).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  // THE ROWS CARRY THE BALANCE — the decision input, the Top-Up precedent.
  const options = picker.locator('[role="option"]')
  await expect(options).toHaveCount(2)
  await expect(options.nth(0)).toHaveText(`${MAIN.name} · ${formatMyr(MAIN.balance)}`)
  await expect(options.nth(1)).toHaveText(`${JOINT.name} · ${formatMyr(JOINT.balance)}`)
  // FLAT ON THE SHEET SURFACE — UI-1's rule: no box within a box.
  await expect(options.first()).toHaveCSS('box-shadow', 'none')

  // SINGLE SELECT COMMITS ON TAP and returns in one action — the DS's own rule
  // for `selectionMode="single"`, which is why this picker has no footer.
  await options.nth(1).click()
  await expect(page.getByRole('dialog', { name: 'Add a Goal' })).toBeVisible()
  await expect(page.locator('.mvp-goal-form__source .mn-select__input')).toHaveValue(
    JOINT.name,
  )
})

test('editing a goal re-derives every figure, and never touches savedAmount', async ({ page }) => {
  await gotoRoute(page, goalRoute(BALI.id), 'light')

  await expect(page.locator('.mn-progress-bar__current')).toHaveText(formatMyr(BALI.savedAmount))
  await page.getByRole('button', { name: 'Edit Goals' }).click()

  const modal = page.getByRole('dialog', { name: 'Edit Goal' })
  // PREFILLED FROM THE STORED GOAL.
  await expect(modal.getByLabel('Goal Name')).toHaveValue(BALI.name)
  await expect(modal.getByLabel('Target Amount (RM)')).toHaveValue(
    BALI.targetAmount.toFixed(2),
  )

  await modal.getByLabel('Goal Name').fill('Bali Honeymoon')
  await modal.getByLabel('Target Amount (RM)').fill('6000.00')
  await modal.getByRole('button', { name: 'Save Changes' }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.mn-header-default')).toContainText('Bali Honeymoon')
  await expect(page.locator('.mn-progress-bar__total')).toHaveText(formatMyr(6000))
  // THE BALANCE DID NOT MOVE — `GoalSettings` cannot name it.
  await expect(page.locator('.mn-progress-bar__current')).toHaveText(formatMyr(BALI.savedAmount))
  // 5,040 / 6,000 = 84%, floored.
  await expect(page.locator('.mn-progress-bar__pct')).toHaveText('84%')
})

test('a target below the balance saves, and the ring clamps rather than refusing', async ({
  page,
}) => {
  await gotoRoute(page, goalRoute(BALI.id), 'light')
  await page.getByRole('button', { name: 'Edit Goals' }).click()
  const modal = page.getByRole('dialog', { name: 'Edit Goal' })
  await modal.getByLabel('Target Amount (RM)').fill('1000.00')
  await modal.getByRole('button', { name: 'Save Changes' }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.mn-progress-bar__total')).toHaveText(formatMyr(1000))
  await expect(page.locator('.mn-progress-bar__current')).toHaveText(formatMyr(BALI.savedAmount))
  // CLAMPED, NOT 504%.
  await expect(page.locator('.mn-progress-bar__pct')).toHaveText('100%')
})

test('DELETING A GOAL RETURNS ITS BALANCE TO THE FUNDING ACCOUNT', async ({ page }) => {
  await openPlans(page)
  const before = await readOverview(page)
  // BOTH BUDGETS, read through the Budget tab's own cards (the reload rule).
  const budgetsBefore = await readBudgets(page)
  await page.getByRole('tab', { name: 'Plans' }).click()

  await page.locator('.mvp-plans__goals > li').first().getByRole('button').click()
  await page.getByRole('button', { name: 'Edit Goals' }).click()
  await page.getByRole('button', { name: 'Delete goal' }).click()
  await page.getByRole('dialog', { name: 'Delete goal?' }).getByRole('button', { name: 'Delete' }).click()

  // LANDS ON THE PLANS TAB WITH THE TOAST, and the card is gone.
  await expect(page.locator('.mvp-finance-detail__toast')).toContainText('Goal deleted.')
  await expect(page.locator('.mvp-plans__goals > li')).toHaveCount(1)
  await expect(page.locator('.mvp-plans__goals')).not.toContainText(BALI.name)

  /*
    ⚠ THE MONEY, WHICH NO BASELINE SHOWS. The Savings Goals card falls by the
    balance, the funding account rises by it, and NET WORTH DOES NOT MOVE —
    `netWorth` adds `sum(holdings)` and `goalsTotal(goals)`, and this takes the
    balance out of the second term and puts it into the first. That identity is
    the one assertion a writer that credited the goal's money nowhere would
    still fail.
  */
  const after = await readOverview(page)
  expect(after.hero).toBe(before.hero)
  expect(after.savings).toContain(formatMyr(goalsTotal([EMERGENCY])))
  expect(after.savings).not.toContain(before.savings.split('\n').pop())

  // The funding account's own card carries the returned money.
  const expectedMain = (toSen(MAIN.balance) + toSen(BALI.savedAmount)) / 100
  await expect(
    page.locator('.mvp-finance__grid-item', { hasText: MAIN.name }).first(),
  ).toContainText(formatMyr(expectedMain))

  /*
    NO BUDGET MOVED, and this is the assertion that says so. The refund is a
    `transfer`, a credit, and dated outside both seeded windows — three
    independent reasons, so a regression that wrote it as a purchase is the only
    thing this can catch (mutation M22 writes exactly that). It reads the
    rendered Budget cards rather than `budgetSpent`, so a screen that printed a
    stale figure could not make both agree.
  */
  expect(await readBudgets(page)).toBe(budgetsBefore)
})

test('the returned money is ONE ledger row: a transfer, a credit, never income', async ({
  page,
}) => {
  await gotoRoute(page, goalRoute(BALI.id), 'light')
  await page.getByRole('button', { name: 'Edit Goals' }).click()
  await page.getByRole('button', { name: 'Delete goal' }).click()
  await page.getByRole('dialog', { name: 'Delete goal?' }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('.mvp-plans')).toBeVisible()

  await page.getByRole('tab', { name: 'Transactions' }).click()
  /*
    ⚠ THE REFUND IS NOT THE NEWEST ROW, AND ASSUMING IT WAS COST AN
    ASSERTION. The ledger sorts date-descending and the seed runs to
    2026-09-12, while the harness clock is pinned to 2026-08-15 — so a row
    written now sorts BELOW two seeded ones. It is located by its figure,
    which is unique: no seeded row carries +RM 5,040.00.
  */
  const row = page.locator('.mvp-transactions__list > li', {
    hasText: `+${formatMyr(BALI.savedAmount)}`,
  })
  await expect(row).toHaveCount(1)
  await expect(row).toContainText(BALI.name)

  await row.getByRole('button').click()
  const sheet = page.getByRole('dialog')
  /*
    IT IS A TRANSFER, SO IT GETS THE MOVEMENT SUMMARY AND NEVER A RECEIPT
    SECTION — Gate 79's disposition rule, which `kind: 'transfer'` reaches
    before the sign is ever read.
  */
  await expect(sheet).toContainText("Transfers aren't counted in budgets.")
  await expect(sheet.getByRole('button', { name: 'Add Receipt' })).toHaveCount(0)
  /*
    FROM THE GOAL, TO THE ACCOUNT — and the goal's name survives its deletion
    because `movementParties` falls back to the row's own `merchant`.

    ⚠ EACH IS ASSERTED INSIDE ITS OWN ROW. This was `sheet.toContainText(name)`
    and it passed with the fallback broken, because the sheet's title carries the
    same name (mutation M11 proved it: it PASSED under mutation). The `<dd>`
    beside the "From" label can only read the goal's name through the fallback,
    and the one beside "To" only through the account lookup.
  */
  await expect(summaryValue(sheet, 'From')).toHaveText(BALI.name)
  await expect(summaryValue(sheet, 'To')).toHaveText(MAIN.name)
  /*
    A REAL REFERENCE, not a slug — Gate 81's rule, now collected on by the second
    writer that creates a row. A seeded row's is stamped by `backfillReferences`;
    this one is random, so it is asserted by SHAPE. `txn-` is checked separately
    because it is the exact string a `t.reference ?? t.id` fallback would print.
  */
  const reference = (await summaryValue(sheet, 'Reference').innerText()).trim()
  expect(reference).toMatch(REFERENCE_SHAPE)
  expect(reference).not.toContain('txn-')
  // NO "Type" ROW: a refund is neither an automatic nor a manual contribution.
  await expect(sheet).not.toContainText('Auto Save')
  await expect(sheet).not.toContainText('Manual Top-Up')
})

test('a deleted goal leaves its history readable, and Back never reaches it', async ({
  page,
}) => {
  /*
    REACHED THROUGH THE APP so the history has a real previous entry: the
    delete navigates with `replace`, which swaps the goal's own entry for
    `/finance`. Arriving by URL would leave `about:blank` behind it and the
    Back assertion would be about the harness rather than about the app.
  */
  await openPlans(page)
  await page.locator('.mvp-plans__goals > li').first().getByRole('button').click()
  await expect(page.locator('.mvp-goal-detail')).toBeVisible()
  await page.getByRole('button', { name: 'Edit Goals' }).click()
  await page.getByRole('button', { name: 'Delete goal' }).click()
  await page.getByRole('dialog', { name: 'Delete goal?' }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('.mvp-plans')).toBeVisible()

  // BACK NEVER LANDS ON THE DEAD ROUTE — the navigation replaced the entry,
  // so the goal screen is not in the history at all any more.
  await page.goBack()
  await expect(page.locator('.mvp-goal-detail')).toHaveCount(0)
  await expect(page.locator('.mvp-finance')).toBeVisible()

  await page.getByRole('tab', { name: 'Transactions' }).click()
  /*
    THE 16 SEEDED CONTRIBUTIONS STILL READ AS THEMSELVES. They carry the goal's
    name in `merchant` and its image in `logo` — both since Gate 77 — so nothing
    about them depended on the goal record existing. NO snapshot field, no
    tombstone and no stored label were added for this.
  */
  const rows = page.locator('.mvp-transactions__list > li', { hasText: BALI.name })
  expect(await rows.count()).toBeGreaterThan(1)
  await expect(rows.first().locator('img')).toHaveAttribute(
    'src',
    `/media/goals/${BALI.image}`,
  )
})

test('a goal that holds nothing closes without writing a row', async ({ page }) => {
  /*
    NEITHER SEEDED GOAL IS EMPTY, so the zero-balance path was reachable only by
    CREATING a goal — which starts at 0 — and deleting it, and nothing did. Until
    this test it was held by code alone: `confirmDelete` builds no row when
    `held` is 0, and `deleteGoal` throws if one arrives for an empty goal.

    EVERYTHING IS DONE THROUGH THE APP'S OWN CONTROLS. `page.goto` discards the
    write (NP1), so a spec that navigated by URL would pass against a writer
    that did nothing at all.
  */
  await openPlans(page)
  await page.getByRole('tab', { name: 'Transactions' }).click()
  const rows = page.locator('.mvp-transactions__list > li')
  const ledgerBefore = await rows.count()
  expect(ledgerBefore).toBeGreaterThan(0)
  const overviewBefore = await readOverview(page)

  await page.getByRole('tab', { name: 'Plans' }).click()
  await page.locator('.mvp-plans__section').first().getByRole('link', { name: 'Add New' }).click()
  await fillGoalForm(page, { name: 'New Phone', target: '5000.00', date: '2026-05-30' })
  await page.getByRole('button', { name: 'Save Goal' }).click()

  const cards = page.locator('.mvp-plans__goals > li')
  await expect(cards).toHaveCount(3)
  await cards.nth(2).getByRole('button').click()
  // SCOPED TO THE DRILL-DOWN: the Plans tab's three cards carry the same class
  // and are still in the DOM until the navigation lands.
  await expect(page.locator('.mvp-goal-detail .mn-progress-bar__current')).toHaveText(
    formatMyr(0),
  )

  await page.getByRole('button', { name: 'Edit Goals' }).click()
  await page.getByRole('button', { name: 'Delete goal' }).click()
  await page.getByRole('dialog', { name: 'Delete goal?' }).getByRole('button', { name: 'Delete' }).click()

  await expect(page.locator('.mvp-finance-detail__toast')).toContainText('Goal deleted.')
  await expect(page.locator('.mvp-plans__goals > li')).toHaveCount(2)

  // NO ROW WAS WRITTEN: the ledger has exactly the rows it had.
  await page.getByRole('tab', { name: 'Transactions' }).click()
  await expect(rows).toHaveCount(ledgerBefore)
  // AND NOTHING MOVED: an empty goal returns nothing, so the net-worth hero and
  // the Savings Goals card read exactly as they did.
  expect(await readOverview(page)).toEqual(overviewBefore)
})

test('cancelling the confirmation deletes nothing and returns to the form', async ({ page }) => {
  await gotoRoute(page, goalRoute(BALI.id), 'light')
  await page.getByRole('button', { name: 'Edit Goals' }).click()
  await page.getByRole('button', { name: 'Delete goal' }).click()
  await page.getByRole('dialog', { name: 'Delete goal?' }).getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByRole('dialog', { name: 'Edit Goal' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(page.locator('.mvp-goal-detail')).toBeVisible()
  await expect(page.locator('.mn-progress-bar__current')).toHaveText(formatMyr(BALI.savedAmount))
})

test('the auto-save switch writes immediately, and the amount survives it', async ({ page }) => {
  await gotoRoute(page, goalRoute(EMERGENCY.id), 'light')
  /*
    THE CONTROL IS THE <label>, NOT THE INPUT. DS `Toggle` paints a
    `.mn-toggle__track` over a visually-hidden checkbox, so clicking the input
    is intercepted by the track — found by exactly that interception. The
    label is what a user taps and what forwards the click.
  */
  const control = page.locator('.mvp-goal-detail__autosave .mn-toggle')
  const toggle = page.locator('.mvp-goal-detail__autosave [role="switch"]')
  await expect(toggle).toHaveAttribute('aria-checked', 'false')

  await control.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  // NO CONFIRMATION AND NO TOAST: reversible in one tap, and it moves no money.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.mvp-finance-detail__toast')).toHaveCount(0)
  // THE AMOUNT IS CARRIED THROUGH — `GoalAutoSave`'s contract.
  await expect(page.locator('.mvp-goal-detail__autosave-amount')).toContainText(
    `${formatMyr(EMERGENCY.autoSave.amount)}/mth`,
  )

  await control.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('.mvp-goal-detail__autosave-amount')).toContainText(
    `${formatMyr(EMERGENCY.autoSave.amount)}/mth`,
  )
})

test('the pencil edits the amount and deliberately does NOT touch the switch', async ({ page }) => {
  await gotoRoute(page, goalRoute(EMERGENCY.id), 'light')
  await page.getByRole('button', { name: 'Edit auto-save amount' }).click()

  const modal = page.getByRole('dialog', { name: 'Auto-Save amount' })
  const amount = modal.getByLabel('Auto-Save Amount / Month (RM)')
  await expect(amount).toHaveValue(EMERGENCY.autoSave.amount.toFixed(2))
  await amount.fill('450.00')
  await modal.getByRole('button', { name: 'Save Amount' }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.mvp-goal-detail__autosave-amount')).toContainText('RM 450.00/mth')
  /*
    THE SWITCH IS UNMOVED. A pencil beside a figure that silently enabled a
    monthly transfer would be the most surprising write in this app.
  */
  await expect(page.locator('.mvp-goal-detail__autosave [role="switch"]')).toHaveAttribute(
    'aria-checked',
    'false',
  )
})

test('choosing an image replaces it and REMOVES the "Ai Image" badge', async ({ page }) => {
  await gotoRoute(page, goalRoute(BALI.id), 'light')

  const badge = page.locator('.mvp-goal-detail__image .mn-tag')
  await expect(badge).toHaveText('Ai Image')
  await expect(page.locator('.mvp-goal-detail__image img')).toHaveAttribute(
    'src',
    `/media/goals/${BALI.image}`,
  )

  /*
    THROUGH THE REAL CONTROL, intercepting the picker the click raises —
    `setInputFiles` on the hidden input would assert the handler while bypassing
    the button meant to invoke it (Gate 50's reasoning). The listener is armed
    BEFORE the click, because Chromium raises the event synchronously.
  */
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Edit image' }).click(),
  ])
  await chooser.setFiles('e2e/fixtures/receipt-capture.jpg')

  // THE BADGE IS GONE — the gating Gate 78 asked for, in writing.
  await expect(badge).toHaveCount(0)
  const src = await page.locator('.mvp-goal-detail__image img').getAttribute('src')
  // AN OBJECT URL, RETURNED UNCHANGED rather than prefixed with the media dir.
  expect(src).toMatch(/^blob:/)
  /*
    POLLED, NOT READ ONCE. This read ran straight after `setFiles` and failed once
    with `Received: 0` in a first full-file run (Gate 81-B): the object URL had
    been written to `src` but the image had not loaded yet. Same assertion, same
    default timeout — an image that never loads still fails here.
  */
  await expect
    .poll(() =>
      page
        .locator('.mvp-goal-detail__image img')
        .evaluate((el: HTMLImageElement) => el.naturalWidth),
    )
    .toBeGreaterThan(0)
})

test('an invalid form keeps the modal open and writes nothing', async ({ page }) => {
  await openPlans(page)
  await page.locator('.mvp-plans__section').first().getByRole('link', { name: 'Add New' }).click()

  /*
    A PRISTINE FORM OPENS WITH NOTHING RED — Gate 71-B decision 2C, through the
    shared `useTouchedValidation`.
  */
  await expect(page.locator('.mvp-goal-form .mn-field--invalid')).toHaveCount(0)

  // SAVE IS NEVER DISABLED. Pressing it reveals every invalid field instead.
  const save = page.getByRole('button', { name: 'Save Goal' })
  await expect(save).toBeEnabled()
  await save.click()

  await expect(page.getByRole('dialog', { name: 'Add a Goal' })).toBeVisible()
  expect(await page.locator('.mvp-goal-form .mn-field--invalid').count()).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.locator('.mvp-plans__goals > li')).toHaveCount(2)
})

test('net worth is unmoved by a delete, derived rather than read off the screen', () => {
  /*
    THE ARITHMETIC THE BROWSER TEST ABOVE OBSERVES, stated independently so a
    screen that printed a stale figure could not make both pass.
  */
  const holdings = buildHoldings(FIAT_ACCOUNTS)
  const before = netWorth(holdings, CRYPTO_HOLDINGS, GOALS)

  const afterAccounts = FIAT_ACCOUNTS.map((a) =>
    a.id === BALI.fundingAccountId
      ? { ...a, balance: (toSen(a.balance) + toSen(BALI.savedAmount)) / 100 }
      : a,
  )
  const after = netWorth(buildHoldings(afterAccounts), CRYPTO_HOLDINGS, [EMERGENCY])

  expect(after).toBeCloseTo(before, 2)
})
