import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import {
  PINNED_NOW,
  YEAR_APART,
  YEAR_APART_ID,
  activateTab,
  gotoRoute,
  installStorePreset,
} from './harness'
import { applySheetChips, openTransactionFilter, setReceiptSort } from './capture'
import { BUDGETS } from '../src/data/budgets'
import { GOALS } from '../src/data/goals'
import { RECEIPTS } from '../src/data/receipts'
import { TRANSACTIONS } from '../src/data/transactions'
import {
  TRANSACTION_FILTER_ALL,
  budgetLegend,
  budgetPeriodLabel,
  filterTransactions,
  goalContributions,
  groupTransactionsByMonth,
} from '../src/data/derive'
import {
  formatDay,
  formatDayMonthYear,
  formatMonthYear,
  formatMyr,
  formatPeriod,
  formatTimestamp,
  headingYear,
  showsYear,
} from '../src/data/format'

/**
 * GATE 90 — YEARS ON DATES.
 *
 * Teku's Decision 14B (23 Oct 2026): a date shows its year only when the year
 * differs from the year it is read against — under a month heading, the
 * heading's year; anywhere else, this calendar year (`TODAY.getFullYear()`,
 * passed in by the caller). Decision 15A: the receipt card's date is the printed
 * day with its year, never a time, whatever heading it sits under; R90R-2 gives
 * the detail sheet's linked-receipt head the same form. Ruling 2C: the
 * Transactions ledger groups under month headings that carry the year.
 *
 * NODE TESTS pin the pure functions in `format.ts`; BROWSER TESTS drive the app
 * through its own controls, one theme (a year is not a colour fact), and assert
 * each derived claim on the screen that shows it. Every expectation that names a
 * seed row is derived from the seed, not retyped.
 *
 * THE HARNESS YEAR IS 2026 (`PINNED_NOW`, 15 Aug 2026), and every year the rule
 * reads is either a heading's year (data) or that one number, so nothing here
 * moves with the real date.
 */

const YEAR = PINNED_NOW.getFullYear()
const TRANSACTIONS_TAB = { id: 'transactions', label: 'Transactions' }
const RECEIPTS_TAB = { id: 'receipts', label: 'Receipts' }
const SHEET = '[role="dialog"][aria-modal="true"]'

const byId = (id: string) => {
  const row = TRANSACTIONS.find((t) => t.id === id)
  if (!row) throw new Error(`no seed transaction ${id}`)
  return row
}
const receiptById = (id: string) => {
  const receipt = RECEIPTS.find((r) => r.id === id)
  if (!receipt) throw new Error(`no seed receipt ${id}`)
  return receipt
}

/** A 2025 purchase and a 2026 purchase, named by id so the spec cannot drift. */
const AEON_2025 = byId('txn-aeon-0915')
const IFRUITS_2026 = byId('txn-ifruits-0912')
const AEON_LINKED = byId('txn-aeon-0904')
const AEON_RECEIPT = receiptById('receipt-aeonbig01')

async function openLedger(page: Page): Promise<void> {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, TRANSACTIONS_TAB)
}

/** A ledger row by its formatted amount — the Gate 49 locator convention. */
function ledgerRow(page: Page, amount: number): Locator {
  return page.locator(`.mvp-transactions__list > li:has-text("${formatMyr(amount)}") .mn-list-item`)
}

/** The value of the open sheet's "Date" row. */
function sheetDate(page: Page): Locator {
  return page
    .locator(`${SHEET} .mvp-txn-detail__row`)
    .filter({ has: page.locator('dt', { hasText: /^Date$/ }) })
    .locator('dd')
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/* ─────────────────────────────────────────────────────── pure functions */

test('N1 showsYear: the same year hides it, a different year shows it', () => {
  expect(showsYear(2025, 2025)).toBe(false)
  expect(showsYear(2026, 2026)).toBe(false)
  expect(showsYear(2025, 2026)).toBe(true)
  expect(showsYear(2027, 2026)).toBe(true)
})

test('N2 formatTimestamp: a row of the reference year has no year; any other year has it', () => {
  expect(formatTimestamp('2026-09-12T16:13:00', 2026)).toBe('12 Sept, 16:13')
  expect(formatTimestamp('2025-09-15T22:03:00', 2026)).toBe('15 Sept 2025, 22:03')
  expect(formatTimestamp('2025-09-15T22:03:00', 2025)).toBe('15 Sept, 22:03')
})

test('N3 the year boundary, read in the pinned zone', async ({ page }) => {
  /*
    RUN IN THE PAGE, NOT IN NODE: the harness pins Asia/Kuala_Lumpur, and this
    machine's own Node zone is a machine-dependent input. 00:00 on 1 Jan in
    Kuala Lumpur is 16:00 on 31 Dec in UTC, so a formatter that read the UTC
    year would put 1 Jan 2026 in 2025 — which only this zone can show.
  */
  await gotoRoute(page, '/', 'light')
  const formatPath = '/src/data/format.ts'
  const out = await page.evaluate(async (path) => {
    const m: { formatTimestamp: (iso: string, ref: number) => string } = await import(path)
    return [
      m.formatTimestamp('2025-12-31T23:59:00', 2025),
      m.formatTimestamp('2025-12-31T23:59:00', 2026),
      m.formatTimestamp('2026-01-01T00:00:00', 2025),
      m.formatTimestamp('2026-01-01T00:00:00', 2026),
    ]
  }, formatPath)
  expect(out).toEqual([
    '31 Dec, 23:59',
    '31 Dec 2025, 23:59',
    '01 Jan 2026, 00:00',
    '01 Jan, 00:00',
  ])
})

test('N4 formatPeriod: this year bare, a past year once at the end, across New Year on both ends', () => {
  expect(formatPeriod('2026-08-01', '2026-08-31', 2026)).toBe('01 Aug - 31 Aug')
  expect(formatPeriod('2025-08-30', '2025-09-20', 2026)).toBe('30 Aug - 20 Sept 2025')
  expect(formatPeriod('2025-08-30', '2025-09-20', 2025)).toBe('30 Aug - 20 Sept')
  expect(formatPeriod('2025-12-15', '2026-01-15', 2026)).toBe('15 Dec 2025 - 15 Jan 2026')
  expect(formatPeriod('2025-12-15', '2026-01-15', 2025)).toBe('15 Dec 2025 - 15 Jan 2026')
})

test('N5 formatDay and formatDayMonthYear: contribution, commitment and receipt days', () => {
  expect(formatDay('2025-09-15', 2026)).toBe('15 Sept 2025')
  expect(formatDay('2026-08-15', 2026)).toBe('15 Aug')
  expect(formatDay('2026-10-01', 2026)).toBe('01 Oct')
  expect(formatDayMonthYear('2026-10-07')).toBe('07 Oct 2026')
  // A full timestamp is accepted: only the day is read, and never a time.
  expect(formatDayMonthYear('2025-09-04T13:45:00')).toBe('04 Sept 2025')
})

test('N6 headingYear: a month key names its year; a key that names no month is NaN', () => {
  expect(headingYear('2025-09')).toBe(2025)
  expect(headingYear('2026-01')).toBe(2026)
  expect(Number.isNaN(headingYear('no-receipt-date'))).toBe(true)
})

test('N7 formatMonthYear: every month key in the seed ledger', () => {
  const keys = [...new Set(TRANSACTIONS.map((t) => t.occurredAt.slice(0, 7)))]
  expect(keys.length).toBeGreaterThan(12)
  for (const key of keys) {
    const expected = `${MONTH_NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`
    expect(formatMonthYear(key), key).toBe(expected)
  }
})

test('N8 the ledger grouping holds every row once, months and rows newest first', () => {
  const rows = filterTransactions(TRANSACTIONS, TRANSACTION_FILTER_ALL, '')
  const months = groupTransactionsByMonth(rows)
  const flat = months.flatMap((m) => m.transactions)
  expect(flat).toHaveLength(TRANSACTIONS.length)
  expect(new Set(flat.map((t) => t.id)).size).toBe(TRANSACTIONS.length)
  const keys = months.map((m) => m.key)
  expect(keys).toEqual([...keys].sort().reverse())
  for (const m of months) {
    const stamps = m.transactions.map((t) => t.occurredAt)
    expect(stamps, m.key).toEqual([...stamps].sort().reverse())
    expect(m.transactions.every((t) => t.occurredAt.startsWith(m.key)), m.key).toBe(true)
  }
})

/* ─────────────────────────────────────────────────────── through the app */

test('B1 the ledger draws one heading per month with its year, and rows under it print none', async ({
  page,
}) => {
  await openLedger(page)
  const expected = groupTransactionsByMonth(TRANSACTIONS).map((m) => m.label)
  await expect(page.locator('.mvp-transactions__month > .mvp-section-header')).toHaveText(expected)

  const dates = await page.locator('.mvp-transactions__month .mn-list-item__amount-info').allTextContents()
  expect(dates).toHaveLength(TRANSACTIONS.length)
  const withYear = dates.filter((d) => !/^\d{2} [A-Z][a-z]+, \d{2}:\d{2}$/.test(d.trim()))
  expect(withYear, 'rows under a heading print no year').toEqual([])

  // A 2025 row, under its own year's heading, prints exactly what Figma draws.
  const sept2025 = page
    .locator('.mvp-transactions__month')
    .filter({ has: page.locator('.mvp-section-header', { hasText: /^September 2025$/ }) })
  await expect(sept2025.locator(`li:has-text("${formatMyr(AEON_2025.amount)}") .mn-list-item__amount-info`)).toHaveText(
    formatTimestamp(AEON_2025.occurredAt, 2025),
  )
})

test('B2 a search spanning two years shows each row under its own year', async ({ page }) => {
  /*
    The 21 Oct walk's finding: two rows on the same day a year apart could not
    be told apart. Netflix bills on 05 Sept in both 2025 and 2026 (the seed has
    no Aeon Big row in September 2026), so a search for it shows both — each
    under its own year's heading.
  */
  await openLedger(page)
  await page.getByRole('textbox', { name: 'Search transactions' }).fill('Netflix')
  const months = groupTransactionsByMonth(filterTransactions(TRANSACTIONS, TRANSACTION_FILTER_ALL, 'Netflix'))
  const labels = months.map((m) => m.label)
  expect(labels).toContain('September 2026')
  expect(labels).toContain('September 2025')
  await expect(page.locator('.mvp-transactions__month > .mvp-section-header')).toHaveText(labels)

  for (const label of ['September 2026', 'September 2025']) {
    const month = months.find((m) => m.label === label)!
    const section = page
      .locator('.mvp-transactions__month')
      .filter({ has: page.locator('.mvp-section-header', { hasText: new RegExp(`^${label}$`) }) })
    await expect(section.locator('.mn-list-item__amount-info')).toHaveText(
      month.transactions.map((t) => formatTimestamp(t.occurredAt, headingYear(month.key))),
    )
  }
})

test('B3 the detail sheet prints a 2025 row with its year and a 2026 row without', async ({ page }) => {
  await openLedger(page)
  await ledgerRow(page, AEON_2025.amount).click()
  await expect(sheetDate(page)).toHaveText(formatTimestamp(AEON_2025.occurredAt, YEAR))
  await expect(sheetDate(page)).toHaveText('15 Sept 2025, 22:03')
  await page.keyboard.press('Escape')
  await expect(page.locator(SHEET)).toHaveCount(0)

  await ledgerRow(page, IFRUITS_2026.amount).click()
  await expect(sheetDate(page)).toHaveText('12 Sept, 16:13')
})

test('B4 the budget card, the Duration row and a nested row carry the 2025 year', async ({ page }) => {
  const monthly = BUDGETS.find((b) => b.id === 'budget-monthly')!
  const period = budgetPeriodLabel(monthly, YEAR)
  expect(period).toBe('30 Aug - 20 Sept 2025')

  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'budget', label: 'Budget' })
  await expect(
    page.locator('.mn-card-monthly-budget').filter({ hasText: monthly.name }).first(),
  ).toContainText(period)

  await gotoRoute(page, `/finance/budget/${monthly.id}`, 'light')
  await expect(page.locator('.mvp-budget-detail__info dd').nth(1)).toHaveText(period)

  // The default-open category's newest counted row prints its year.
  const open = budgetLegend(monthly, TRANSACTIONS)[0]
  const newest = open.rows[0]
  await expect(page.locator(`#budget-legend-${open.category} .mn-list-item__amount-info`).first()).toHaveText(
    formatTimestamp(newest.occurredAt, YEAR),
  )
  expect(formatTimestamp(newest.occurredAt, YEAR)).toContain('2025')
})

test('B5 a receipt added a year after its printed date: the card keeps its year, the nested row follows its heading', async ({
  page,
}) => {
  const receipt = receiptById(YEAR_APART_ID)
  const linked = byId(receipt.transactionId!)
  await installStorePreset(page, YEAR_APART)
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, RECEIPTS_TAB)

  const card = page.locator(`.mvp-receipt-card:has-text("${receipt.displayName}")`)
  const section = (label: string) =>
    page
      .locator('.mvp-receipts__month')
      .filter({ has: page.locator('.mvp-section-header', { hasText: new RegExp(`^${label}$`) }) })

  // "Date added" (the default): the card sits alone under "August 2026".
  await expect(page.locator('.mvp-receipts__month').first().locator('.mvp-section-header')).toHaveText(
    'August 2026',
  )
  await expect(section('August 2026').locator('.mvp-receipt-card')).toHaveCount(1)
  await expect(card.locator('.mvp-receipt-card__date')).toHaveText(formatDayMonthYear(receipt.capturedAt))
  await expect(card.locator('.mvp-receipt-card__date')).toHaveText('13 Sept 2025')
  await expect(card.locator('.mn-list-item__amount-info')).toHaveText('13 Sept 2025, 18:50')
  expect(formatTimestamp(linked.occurredAt, 2026)).toBe('13 Sept 2025, 18:50')

  // "Receipt date": the same card under "September 2025".
  await setReceiptSort(page, 'Receipt date')
  const inSept = section('September 2025').locator(`.mvp-receipt-card:has-text("${receipt.displayName}")`)
  await expect(inSept).toHaveCount(1)
  await expect(inSept.locator('.mvp-receipt-card__date')).toHaveText('13 Sept 2025')
  await expect(inSept.locator('.mn-list-item__amount-info')).toHaveText('13 Sept, 18:50')
})

test('B6 the receipt viewer Date row and the link picker context line print the 2025 year', async ({
  page,
}) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, RECEIPTS_TAB)
  await page.locator(`.mvp-receipt-card:has-text("${AEON_RECEIPT.displayName}")`).click()
  const printed = formatTimestamp(AEON_RECEIPT.capturedAt, YEAR)
  expect(printed).toBe('04 Sept 2025, 13:45')
  await expect(page.locator('.mvp-receipt-details__rows')).toContainText(`Date${printed}`)

  await page.locator('.mn-modal__footer .mn-btn:has-text("Unlink receipt")').click()
  await page.locator('.mn-modal__footer .mn-btn:has-text("Link to transaction")').click()
  await expect(page.locator('.mvp-link-picker__context')).toHaveText(
    `${AEON_RECEIPT.merchant} · ${printed} · ${formatMyr(AEON_RECEIPT.total)}`,
  )
})

test('B7 the contributions sheet prints the year on 2025 rows and not on 2026 rows', async ({ page }) => {
  const bali = GOALS.find((g) => g.id === 'goal-bali-trip')!
  const all = goalContributions(TRANSACTIONS, bali.id)
  const old = all.filter((t) => t.occurredAt.startsWith('2025'))
  const current = all.filter((t) => t.occurredAt.startsWith('2026'))
  expect(old.length).toBeGreaterThan(0)
  expect(current.length).toBeGreaterThan(0)

  await gotoRoute(page, `/finance/plans/goals/${bali.id}`, 'light')
  await page.locator('.mvp-goal-detail__contributions .mn-link').click()
  const rows = page.locator('.mn-sheet__content .mn-chart-legend-item')
  await expect(rows).toHaveCount(all.length)
  for (const [i, t] of all.entries()) {
    const subtitle = rows.nth(i).locator('.mn-chart-legend-item__subtitle')
    if (t.occurredAt.startsWith('2025')) {
      await expect(subtitle, t.id).toHaveText(formatDay(t.occurredAt, YEAR))
      await expect(subtitle, t.id).toContainText('2025')
    } else {
      await expect(subtitle, t.id).toHaveText(formatDay(t.occurredAt, 2026))
      await expect(subtitle, t.id).not.toContainText('2026')
    }
  }
})

test('B8 the holding drill-down prints a 2025 row with its year and a 2026 row without', async ({ page }) => {
  await gotoRoute(page, '/finance/holding/main', 'light')
  const row = (merchant: string, amount: number) =>
    page
      .locator('.mvp-finance-detail__list .mn-list-item')
      .filter({ hasText: merchant })
      .filter({ hasText: formatMyr(amount) })
  await expect(row(AEON_2025.merchant, AEON_2025.amount).locator('.mn-list-item__amount-info')).toHaveText(
    '15 Sept 2025, 22:03',
  )
  await expect(row(IFRUITS_2026.merchant, IFRUITS_2026.amount).locator('.mn-list-item__amount-info')).toHaveText(
    '12 Sept, 16:13',
  )
})

test('B9 a filter to zero shows no heading and the no-results block', async ({ page }) => {
  await openLedger(page)
  await applySheetChips(await openTransactionFilter(page), ['This Month', 'Fund Transfer'])
  await expect(page.locator('.mvp-no-results')).toBeVisible()
  await expect(page.locator('.mvp-transactions__month')).toHaveCount(0)
  await expect(page.locator('.mvp-transactions .mvp-section-header')).toHaveCount(0)
})

test('B10 the reference is the device year, not the newest row', async ({ page }) => {
  /*
    The newest ledger row is 12 Sept 2026. With the clock on 2 Jan 2027, a 2026
    row's detail must print 2026 — which a reference taken from the newest row
    (2026) would hide.
  */
  await page.clock.setFixedTime(new Date('2027-01-02T02:00:00.000Z'))
  await page.goto('/finance', { waitUntil: 'networkidle' })
  await expect(page.locator('#root')).toHaveAttribute('data-store', /\w+/)
  await activateTab(page, TRANSACTIONS_TAB)
  await ledgerRow(page, IFRUITS_2026.amount).click()
  await expect(sheetDate(page)).toHaveText('12 Sept 2026, 16:13')
})

test('B11 the detail sheet\'s receipt head is the printed day with its year and no time', async ({ page }) => {
  await openLedger(page)
  await ledgerRow(page, AEON_LINKED.amount).click()
  await expect(page.locator(`${SHEET} .mvp-txn-detail__receipt-date`)).toHaveText(
    formatDayMonthYear(AEON_RECEIPT.capturedAt),
  )
  await expect(page.locator(`${SHEET} .mvp-txn-detail__receipt-date`)).toHaveText('04 Sept 2025')
})
