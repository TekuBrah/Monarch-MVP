import { useMemo, useState } from 'react'
import { Field, Icon, ListItem } from '@monarch/design-system'
import { SectionHeader } from '../../../components/SectionHeader'
import { TransactionMark } from '../../../components/TransactionMark'
import { rankedSuggestions } from '../../../data/autoMatch'
import {
  TRANSACTION_FILTER_ALL,
  filterTransactions,
  groupTransactionsByMonth,
  transactionHasReceipt,
} from '../../../data/derive'
import { formatMyr, formatSignedMyr, formatTimestamp } from '../../../data/format'
import type { Receipt, Transaction } from '../../../data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE MANUAL LINK PICKER — Gate 51-B, item L. NOT DRAWN.
 *
 * NO FIGMA FRAME EXISTS FOR THIS SURFACE, and Teku ruled (decision 1B, 11 Sept)
 * that it is designed from the app's own existing UI behaviour rather than from
 * the file. Every element below is therefore justified by a principle and a
 * precedent in this repo, never by a drawing — read the header of
 * `ReceiptViewer.tsx` for the seven principles and this file for how they land.
 *
 * WHY IT EXISTS AT ALL: Gate 50-B measured the real OCR engine auto-linking
 * 5 of the 10 seeded receipts, and the five misses fail on a field the
 * photograph did not yield — two unread dates, one date read six months off,
 * two letterheads read as an address line or a line item. No matcher recovers
 * those. This is the recovery path, and without it a miss is permanent.
 * ─────────────────────────────────────────────────────────────────────────────
 * IT IS A VIEW INSIDE THE VIEWER, NOT A NEW OVERLAY (principle P1). The title
 * changes and a back affordance returns; the precedent is
 * `TransactionFilterSheet`'s `'filters' | 'merchant'` view swap. So this
 * component renders the viewer's CONTENT and its FOOTER is the host's business
 * — it has none of its own, because picking a row IS the action.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE THREE PREDICATES ARE THE RULE'S OWN (principle P7). "Agree" is defined
 * exactly once in this app, in `autoMatch.ts`, and `rankedSuggestions` reuses
 * `totalMatches`, `withinWindow` and `merchantMatches` rather than restating
 * them. A second definition here would drift from the rule this screen exists
 * to recover from — which is the shape `Transaction.hasReceipt` had before
 * Gate 48 deleted it.
 * ─────────────────────────────────────────────────────────────────────────────
 * CREDITS ARE NOT LISTED AT ALL, in either group. A receipt records a payment,
 * which is the same reason auto-match requires `-amount === total`: a link that
 * made the amount follow the receipt only by flipping its sign is not a link.
 * `.filter((t) => t.amount < 0)` is the whole of it, and it is applied ONCE,
 * before the split, so the two groups cannot disagree about it.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ROWS ARE THE LEDGER'S OWN `ListItem` (principle P5) — the same mark,
 * payee, method, amount and timestamp, and the same DERIVED receipt glyph. A
 * row that already carries a receipt SHOWS it, because that is the one fact a
 * user needs before tapping a row that will displace something.
 *
 * `hasReceiptIcon` IS PASSED IN BOTH DIRECTIONS, NEVER OMITTED. The DS defaults
 * it to `true` (`ListItem.tsx:51`), so omitting it draws a glyph on every row —
 * the third instance of that trap in this repo, after `SectionHeader`'s
 * `open_in_new` and the detail sheet's nested row.
 */

/** The receipt's three fields in the shape `rankedSuggestions` reads. */
function matchFieldsFor(receipt: Receipt) {
  return {
    merchant: receipt.merchant,
    capturedAt: receipt.capturedAt,
    total: receipt.total,
  }
}

export interface TransactionPickerProps {
  receipt: Receipt
  transactions: Transaction[]
  receipts: Receipt[]
  /**
   * The user picked a row. The HOST decides whether that needs a confirmation —
   * this reports the choice and nothing more, so the "does it already have a
   * receipt" question has exactly one answer site.
   */
  onPick: (transaction: Transaction) => void
}

export function TransactionPicker({
  receipt,
  transactions,
  receipts,
  onPick,
}: TransactionPickerProps) {
  const [search, setSearch] = useState('')

  /*
    THE LEDGER'S OWN FILTER, NOT A SECOND ONE. `filterTransactions` at
    `TRANSACTION_FILTER_ALL` applies no facet at all and leaves only the search
    needle, which it matches against `${merchant} ${method}` — exactly what the
    Transactions tab's box does (`TransactionsLedger.tsx:185`). Writing a payee-
    only predicate here would be a second search behaviour for the same rows.
  */
  const outflows = useMemo(
    () =>
      filterTransactions(transactions, TRANSACTION_FILTER_ALL, search).filter(
        (t) => t.amount < 0,
      ),
    [transactions, search],
  )

  /*
    SUGGESTIONS ARE RANKED OVER THE SEARCHED SET, NOT OVER THE WHOLE LEDGER, so
    a search narrows both groups together. A suggestion the search has excluded
    would be a row the user cannot see reappearing above a heading.
  */
  const suggested = useMemo(
    () => rankedSuggestions(matchFieldsFor(receipt), outflows),
    [receipt, outflows],
  )

  const suggestedIds = useMemo(
    () => new Set(suggested.map((s) => s.transaction.id)),
    [suggested],
  )

  // "EVERYTHING ELSE" IS THE REMAINDER, DERIVED BY SUBTRACTION rather than by a
  // second predicate — so a row can never appear in both groups or in neither.
  const rest = useMemo(
    () => groupTransactionsByMonth(outflows.filter((t) => !suggestedIds.has(t.id))),
    [outflows, suggestedIds],
  )

  return (
    <div className="mvp-link-picker">
      {/*
        THE CONTEXT LINE — what the user is matching AGAINST. The picker fills
        the whole viewer, so the receipt's image is off screen while it is open;
        without this the user is choosing a transaction from memory. Merchant,
        date and total, which are the three fields the rule compares.
      */}
      <p className="mvp-link-picker__context type-body-sm">
        <span className="mvp-link-picker__context-merchant type-body-sm-semibold">
          {receipt.merchant}
        </span>
        {` · ${formatTimestamp(receipt.capturedAt)} · ${formatMyr(receipt.total)}`}
      </p>

      {/*
        THE SAME CONTROL BOTH TABS SHIP: `Field` at `sizing="fill"` with a
        leading `search` glyph. No trailing filter button — this surface has no
        filter model, and Gate 44's ruling on default chips applies: a drawn,
        focusable, announced, inert control is worse than an absent one.
      */}
      <div className="mvp-link-picker__search">
        <Field
          value={search}
          onChange={setSearch}
          placeholder="Search"
          ariaLabel="Search transactions to link"
          sizing="fill"
          leadingIcon={<Icon name="search" size="m" />}
        />
      </div>

      {/*
        OMITTED ENTIRELY WHEN EMPTY — no heading, and no "no suggestions" copy.
        A heading over nothing states that the app looked and found none, which
        is true but not worth a row; and empty-state copy here would be the only
        empty state in a list that already has one below it.
      */}
      {suggested.length > 0 && (
        <section className="mvp-link-picker__group">
          <SectionHeader label="Suggested" />
          <ul className="mvp-link-picker__list">
            {suggested.map((s) => (
              <li key={s.transaction.id}>
                <PickerRow
                  transaction={s.transaction}
                  receipts={receipts}
                  onPick={onPick}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {rest.map((group) => (
        <section className="mvp-link-picker__group" key={group.key}>
          <SectionHeader label={group.label} />
          <ul className="mvp-link-picker__list">
            {group.transactions.map((transaction) => (
              <li key={transaction.id}>
                <PickerRow
                  transaction={transaction}
                  receipts={receipts}
                  onPick={onPick}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/*
        THE ONE EMPTY STATE, AND IT IS REACHABLE: a search that matches nothing.
        Without it the picker would show a search box over a blank column with
        no statement of why.
      */}
      {suggested.length === 0 && rest.length === 0 && (
        <p className="mvp-link-picker__empty type-body-sm">
          No transactions match “{search.trim()}”.
        </p>
      )}
    </div>
  )
}

/**
 * One row. The ledger's `ListItem`, with its `onClick` — which is what makes the
 * DS render a real `<button>`, focusable and Enter/Space-activated, rather than
 * a `<div>` with a handler bolted on (Gate 49).
 *
 * NO NESTED CONTROL. The row is one button and contains none; `TransactionMark`
 * renders a `Logo` or an `Avatar`, neither of which is interactive.
 */
function PickerRow({
  transaction,
  receipts,
  onPick,
}: {
  transaction: Transaction
  receipts: Receipt[]
  onPick: (transaction: Transaction) => void
}) {
  return (
    <ListItem
      type="default"
      leading={<TransactionMark mark={transaction.logo} size="m" />}
      title={transaction.merchant}
      titleInfo={transaction.method}
      amount={formatSignedMyr(transaction.amount)}
      amountInfo={formatTimestamp(transaction.occurredAt)}
      /*
        DERIVED, AND PASSED IN BOTH DIRECTIONS. `transactionHasReceipt` is the
        single statement of the fact (Gate 48), and this row is the one place a
        user needs it BEFORE acting: a row carrying the glyph is a row whose
        receipt this link will displace.
      */
      hasReceiptIcon={transactionHasReceipt(receipts, transaction.id)}
      onClick={() => onPick(transaction)}
    />
  )
}
