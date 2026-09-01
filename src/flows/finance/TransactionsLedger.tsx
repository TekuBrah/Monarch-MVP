import { useMemo, useState } from 'react'
import { Chips, Field, Icon, ListItem } from '@monarch/design-system'
import { useAccounts } from '../../accounts/AccountsProvider'
import { TransactionMark } from '../../components/TransactionMark'
import {
  TRANSACTION_FILTER_APPLIED,
  filterChipLabels,
  filterTransactions,
} from '../../data/derive'
import { formatSignedMyr, formatTimestamp } from '../../data/format'

/**
 * `Finance_Transaction01` (`1266:14328`) — the Transactions tab's body.
 *
 * THE NINE ROWS FIGMA DRAWS ARE AN OUTPUT, NOT A LIST. The screen opens with
 * Figma's four applied filters in force and computes the result with
 * `filterTransactions()` over the whole 23-row ledger; the nine rows the frame
 * shows are simply the first nine of the 15 that match, under an ordinary
 * date-descending sort. Nothing here is hand-picked, which is what makes the
 * filter a filter rather than a caption over a fixed list.
 *
 * IT READS THE LEDGER THROUGH `useAccounts()`, never by importing
 * `TRANSACTIONS` directly — the same path `HomepageFiat` and `holdingFields`
 * already take. There is exactly one ledger in `src/`, so a row added by any
 * future flow appears here with nothing to update.
 *
 * SORT ORDER DIVERGES FROM FIGMA ON PURPOSE (inventory A16). The frame draws
 * IKEA (6 Sept) fifth, between two 11 Sept rows, so its order is not
 * chronological and cannot be produced by any sort. Date descending is the
 * behaviour; the drawn order is a source artifact.
 *
 * THE FILTER SHEET IS GATE 42 AND IS NOT HERE. The trailing filter control is
 * present with its real hit target and accessible name so that gate replaces a
 * handler rather than restructuring this markup — see the TODO below.
 */
export function TransactionsLedger() {
  const { transactions } = useAccounts()
  const [search, setSearch] = useState('')

  // Figma's four applied chips, as a value. `useState` rather than a constant
  // because Gate 42's sheet writes it; nothing writes it today, and the screen
  // is already correct for whatever it is set to.
  const [filter] = useState(TRANSACTION_FILTER_APPLIED)

  const rows = useMemo(
    () => filterTransactions(transactions, filter, search),
    [transactions, filter, search],
  )
  const chips = useMemo(() => filterChipLabels(filter), [filter])

  return (
    <div className="mvp-transactions">
      <div className="mvp-transactions__search mvp-column">
        <Field
          value={search}
          onChange={setSearch}
          placeholder="Search transactions"
          ariaLabel="Search transactions"
          leadingIcon={<Icon name="search" size="m" />}
          trailingIcon={
            <button
              type="button"
              className="mvp-transactions__filter-btn"
              aria-label="Filter transactions"
              /*
                TODO(Gate 42) — open the filter Sheet. Deliberately a no-op
                rather than an absent control: Figma draws a real affordance
                here, and keeping the button, its hit target and its accessible
                name means Gate 42 supplies an `onClick` body instead of
                rebuilding the search bar around a new element.
              */
              onClick={() => {}}
            >
              <Icon name="filter_list" size="m" />
            </button>
          }
        />
      </div>

      {/*
        A5 — Figma's applied-chip row is 377 wide at x=16 inside a 375 frame, so
        its fourth chip ("RM 0 - 500") is clipped. HANDLED BY SCROLLING, NOT BY
        DROPPING A CHIP OR SHRINKING ONE: the row scrolls horizontally and
        carries the content gutter as padding via `.mvp-column--bleed`, which is
        the same answer A3/A4's five-tab overflow already took in this app
        (`Tabs isScrollable` on `FinanceScreen`). Every chip stays reachable at
        375 and the row does not overflow at all at 430.
      */}
      <ul className="mvp-transactions__chips mvp-column--bleed">
        {chips.map((label) => (
          <li key={label}>
            {/*
              `icon={null}` — an APPLIED filter is not a completed task, and
              `Chips` defaults its leading glyph to a `done` checkmark. Passing
              null is exactly the slot DS v1.16.0's Chips exposes (register G9,
              closed), and it is why no checkmark appears on these four.
            */}
            <Chips label={label} icon={null} />
          </li>
        ))}
      </ul>

      {/*
        A6 — the list runs 78px past the 812 frame in Figma. LEFT AS DRAWN, per
        SYS-8: it is scrolling content, and the shell already reserves 128px at
        the bottom so the last row clears the nav band. Rows 10-15 are reached
        by scrolling, which is the correct behaviour rather than a defect.
      */}
      <ul className="mvp-transactions__list mvp-column">
        {rows.map((txn) => (
          <li key={txn.id}>
            <ListItem
              type="default"
              leading={<TransactionMark mark={txn.logo} size="m" />}
              title={txn.merchant}
              titleInfo={txn.method}
              amount={formatSignedMyr(txn.amount)}
              amountInfo={formatTimestamp(txn.occurredAt)}
              hasReceiptIcon={txn.hasReceipt}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
