import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { OVERLAY_STATES, activateTab, gotoRoute, gotoState } from './harness'
import { RECEIPTS } from '../src/data/receipts'
import { TRANSACTIONS } from '../src/data/transactions'
import { transactionHasReceipt } from '../src/data/derive'
import { formatSignedMyr } from '../src/data/format'

/**
 * THE RECEIPT GLYPH IS DERIVED AT EVERY CALL SITE — Gate 53-B.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS SPEC EXISTS.
 *
 * `ListItem.hasReceiptIcon` DEFAULTS TO `true` (`ListItem.tsx:51`), so the
 * failure mode is an OMISSION rather than a wrong value — and an omission is
 * invisible in a diff, in a type, and in a review. Gate 48 deleted the stored
 * `Transaction.hasReceipt` flag and wired the derived call at two of the three
 * sites that render a ledger row; `HoldingDetailScreen` was missed, and drew a
 * `receipt_long` mark on all 21 rows of `/finance/holding/main` against the 8
 * that have a receipt. It shipped that way from Gate 48 to Gate 53-B, through
 * five gates and a committed baseline of the wrong render.
 *
 * WHAT THE SUITE ALREADY HAD, AND WHY IT WAS NOT ENOUGH. `unlink.spec.ts`
 * asserts the glyph COUNT on the Transactions ledger and follows one row
 * through an unlink. That is a strong test of one surface and says nothing
 * about the other five. A visual baseline is worse than nothing here: it
 * records whatever the screen drew on the day it was minted, so a wrong glyph
 * becomes the reference.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ASSERTION IS SITE-AGNOSTIC, WHICH IS THE WHOLE DESIGN.
 *
 * It does NOT restate which rows each screen chooses to show — that logic lives
 * in `holdingFields`, `recentTransactions` and `filterTransactions`, and copying
 * it here would be a second definition to keep in step. It asks a narrower
 * question of whatever happens to be on screen: FOR EVERY RENDERED LEDGER ROW,
 * does it draw the glyph exactly when its own transaction has a receipt?
 *
 * So a new surface that renders transaction rows is covered the moment someone
 * points this helper at it, and no surface's row-selection rule can drift out
 * of step with a copy kept here, because there is no copy.
 *
 * THE JOIN KEY IS THE FORMATTED AMOUNT, and its uniqueness is asserted rather
 * than assumed (`AMOUNT_KEY_IS_UNIQUE` below). An index would have been the
 * obvious key and is the wrong one: it silently addresses a different row the
 * day a transaction is added above it — the Gate 49 lesson about `nth-child`.
 *
 * NO BASELINE AND NO WALK STATE. It asserts structure, not pixels, so it adds
 * nothing to `visual.spec.ts` and nothing to the snapshot directory — the same
 * shape as `frame-cap.spec.ts`, `tile-fill.spec.ts` and `unlink.spec.ts`.
 *
 * ONE THEME, DELIBERATELY. Whether an `<svg>` is in the DOM is not a colour
 * fact, and no rule in either repo makes the glyph conditional on
 * `[data-theme]` — so a dark pass would re-assert the identical structure and
 * double the cost of the spec for no new information. `unlink.spec.ts` runs
 * both themes because it exercises a WRITE reached by clicking, which is where
 * this app has historically found ordering bugs; nothing here writes.
 *
 * IMPORTING `src/data` IN A SPEC IS ESTABLISHED — `automatch.spec.ts` and
 * `unlink.spec.ts` both do it, in Playwright's Node context, because nothing in
 * those modules reaches the DS runtime or a browser API.
 */

/** Every formatted amount in the seed is distinct, so it addresses one row. */
const AMOUNT_KEY_IS_UNIQUE =
  new Set(TRANSACTIONS.map((t) => formatSignedMyr(t.amount))).size === TRANSACTIONS.length

/** formatted amount -> whether that transaction has a receipt, from the seed. */
const TRUTH = new Map(
  TRANSACTIONS.map((t) => [formatSignedMyr(t.amount), transactionHasReceipt(RECEIPTS, t.id)]),
)

/**
 * `[amount, drawsGlyph]` for every `ListItem` inside `container`.
 *
 * READ OFF THE RENDERED `<svg>`, NOT OFF A CLASS. `ListItem` renders
 * `<Icon name="receipt_long" size="s" />` as the first child of
 * `.mn-list-item__amount-row` and gives it no class of its own — the glyph is
 * the only graphic that block can contain (`ListItem.tsx:85`), so "does this
 * row's amount group contain an svg" is exactly the question `hasReceiptIcon`
 * answers. Same probe idiom as `unlink.spec.ts`.
 */
async function readRows(page: Page, container: string): Promise<[string, boolean][]> {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel)
    if (!root) return [] as [string, boolean][]
    return [...root.querySelectorAll('.mn-list-item')].map((row): [string, boolean] => [
      (row.querySelector('.mn-list-item__amount')?.textContent ?? '').trim(),
      row.querySelector('.mn-list-item__amount-row svg') !== null,
    ])
  }, container)
}

/**
 * Every rendered ledger row draws the glyph exactly when its transaction has a
 * receipt.
 *
 * `discriminating` is the anti-vacuity guard, and it is the load-bearing half.
 * A surface whose rows all happen to fall on one side of the question passes
 * this check even if the prop were hard-coded — `/finance/holding/joint` shows
 * two rows and BOTH have receipts, so it rendered correctly by coincidence
 * throughout the whole period the defect was live. Where a surface shows both
 * kinds we assert that it does, so a hard-coded `true` and a hard-coded `false`
 * each fail somewhere.
 */
async function expectDerivedGlyphs(
  page: Page,
  container: string,
  where: string,
  { discriminating, unlinked = [] }: { discriminating: boolean; unlinked?: string[] },
): Promise<void> {
  expect(
    AMOUNT_KEY_IS_UNIQUE,
    'two seed rows now share a formatted amount — the join key of this spec is ambiguous, and the assertions below would silently address the wrong row',
  ).toBe(true)

  const rows = await readRows(page, container)
  expect(
    rows.length,
    `${where}: no ledger rows rendered — this check would pass vacuously`,
  ).toBeGreaterThan(0)

  const wrong: string[] = []
  for (const [amount, drawsGlyph] of rows) {
    const seeded = TRUTH.get(amount)
    expect(
      seeded,
      `${where}: rendered a row for ${amount}, which matches no seed transaction`,
    ).toBeDefined()
    // `unlinked` is the live page's divergence from the seed — see the picker
    // test for the one state that has any.
    const expected = unlinked.includes(amount) ? false : seeded
    if (drawsGlyph !== expected) {
      wrong.push(`${amount} draws=${drawsGlyph} expected=${expected}`)
    }
  }
  expect(
    wrong,
    `${where}: ${wrong.length} of ${rows.length} rendered rows disagree with transactionHasReceipt()`,
  ).toEqual([])

  if (discriminating) {
    const withGlyph = rows.filter(([, g]) => g).length
    expect(
      withGlyph,
      `${where} is declared discriminating but no row draws a glyph`,
    ).toBeGreaterThan(0)
    expect(
      rows.length - withGlyph,
      `${where} is declared discriminating but every row draws a glyph`,
    ).toBeGreaterThan(0)
  }
}

/* ── the sites that render a ledger row ───────────────────────────────────── */

test('HoldingDetailScreen — /finance/holding/main', async ({ page }) => {
  await gotoRoute(page, '/finance/holding/main', 'light')
  // The site Gate 48 missed. 21 rows, 8 with a receipt — both kinds present, so
  // this one surface rejects a hard-coded value in either direction.
  await expectDerivedGlyphs(page, '.mvp-finance-detail__list', '/finance/holding/main', {
    discriminating: true,
  })
})

test('HoldingDetailScreen — /finance/holding/joint', async ({ page }) => {
  await gotoRoute(page, '/finance/holding/joint', 'light')
  // The SAME call site, second instance. Not discriminating: both of its rows
  // have receipts, which is exactly why it looked right while `main` did not.
  await expectDerivedGlyphs(page, '.mvp-finance-detail__list', '/finance/holding/joint', {
    discriminating: false,
  })
})

test('TransactionsLedger — /finance [tab:transactions]', async ({ page }) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'transactions', label: 'Transactions' })
  await expectDerivedGlyphs(page, '.mvp-transactions__list', '/finance [tab:transactions]', {
    discriminating: true,
  })
})

test('HomepageFiat — the recent-transactions slice', async ({ page }) => {
  await gotoRoute(page, '/', 'light')
  // Two rows, and WHICH two is a property of the fixture's newest timestamps
  // rather than of this spec — so it is deliberately not declared
  // discriminating. Gate 53 dated two rows to 2026 and both now land here.
  await expectDerivedGlyphs(page, '.mvp-home__list', '/', { discriminating: false })
})

test('TransactionPicker — the manual link picker', async ({ page }) => {
  const picker = OVERLAY_STATES.find((s) => s.overlay?.id === 'view-picker')
  expect(picker, 'the view-picker overlay state has been renamed or removed').toBeDefined()
  await gotoState(page, picker!, 'light')
  /*
    THIS STATE IS THE ONE WHOSE LIVE DATA DIVERGES FROM THE SEED, AND THE
    DIVERGENCE IS THE POINT RATHER THAN A NUISANCE. Reaching the picker means
    UNLINKING the receipt first — that is what the state's own prepare steps do
    — so the transaction that receipt pointed at genuinely no longer has one,
    and a row still drawing its glyph here would be the derived value failing to
    follow a live write. That is precisely the ruling Gate 48 made when it
    deleted the stored `Transaction.hasReceipt` flag.

    DERIVED FROM THE SEED, NOT WRITTEN DOWN. The state opens the receipt whose
    `displayName` is its `title`; that record names its own transaction, and the
    formatted amount follows. Re-point the state at a different receipt and this
    follows it, with no literal to update.
  */
  const opened = RECEIPTS.find((r) => r.displayName === picker!.overlay!.title)
  expect(opened, `no seed receipt is displayed as ${picker!.overlay!.title}`).toBeDefined()
  const wasLinkedTo = TRANSACTIONS.find((t) => t.id === opened!.transactionId)
  expect(
    wasLinkedTo,
    `${opened!.displayName} ships unlinked, so the picker state no longer unlinks anything and this override is stale`,
  ).toBeDefined()

  await expectDerivedGlyphs(page, '.mvp-link-picker', 'the link picker', {
    discriminating: true,
    unlinked: [formatSignedMyr(wasLinkedTo!.amount)],
  })
})

/* ── the sites that must draw NO glyph, whatever the data says ────────────── */

test('the rows nested inside a receipt card and a receipt viewer draw no glyph', async ({
  page,
}) => {
  // A row nested INSIDE a receipt must not restate the receipt it sits in, so
  // both sites pass `hasReceiptIcon={false}` explicitly. They are the inverse
  // failure: here the DS default is the WRONG answer and the prop is what
  // suppresses it, so an omission would show up as a glyph appearing rather
  // than as one going missing.
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'receipts', label: 'Receipts' })

  const cards = await readRows(page, '.mvp-receipts')
  expect(cards.length, 'no nested transaction rows on the Receipts tab').toBeGreaterThan(0)
  expect(
    cards.filter(([, g]) => g),
    'a row nested inside a receipt card drew a receipt glyph',
  ).toEqual([])
  // NOT VACUOUS: every one of those rows IS a linked transaction, so the DS
  // default would have drawn a glyph on every single one of them.
  expect(
    cards.filter(([amount]) => TRUTH.get(amount) !== true),
    'a nested card row is not a linked transaction — the check above would no longer prove the prop is doing the work',
  ).toEqual([])

  const viewer = OVERLAY_STATES.find((s) => s.overlay?.id === 'view')
  expect(viewer, 'the view overlay state has been renamed or removed').toBeDefined()
  await gotoState(page, viewer!, 'light')
  const inViewer = await readRows(page, '.mn-modal')
  expect(inViewer.length, 'no nested transaction row in the receipt viewer').toBe(1)
  expect(inViewer[0][1], 'the row nested in the receipt viewer drew a receipt glyph').toBe(false)
  expect(
    TRUTH.get(inViewer[0][0]),
    'the viewer row is a linked transaction, so the DS default would have drawn a glyph',
  ).toBe(true)
})

/* ── the structural exemption, asserted rather than assumed ───────────────── */

test('crypto-typed rows cannot draw the glyph', async ({ page }) => {
  /*
    `HomepageCrypto` and the four non-bank holding screens render
    `type="crypto"`, and the glyph lives inside `ListItem`'s `isDefault` block
    (`ListItem.tsx:85`) — so the prop is unreachable there and those call sites
    are exempt BY CONSTRUCTION rather than by having been checked.

    That is an argument about DS internals, which is exactly the kind of claim
    this project keeps finding to have gone stale. Asserting it here means a DS
    release that moved the glyph out of the `isDefault` branch reddens this spec
    instead of quietly putting a receipt mark on a list of crypto tokens.
  */
  for (const route of ['/finance/holding/stocks', '/finance/holding/wallet-marg']) {
    await gotoRoute(page, route, 'light')
    const rows = await readRows(page, '.mvp-finance-detail__list')
    expect(rows.length, `${route}: no rows rendered`).toBeGreaterThan(0)
    expect(
      rows.filter(([, g]) => g),
      `${route}: a crypto-typed row drew a receipt glyph`,
    ).toEqual([])
  }

  await gotoRoute(page, '/', 'light')
  await activateTab(page, { id: 'crypto', label: 'Crypto' })
  const tokens = await readRows(page, '.mvp-home__list')
  expect(tokens.length, '/ [tab:crypto]: no rows rendered').toBeGreaterThan(0)
  expect(
    tokens.filter(([, g]) => g),
    '/ [tab:crypto]: a crypto-typed row drew a receipt glyph',
  ).toEqual([])
})
