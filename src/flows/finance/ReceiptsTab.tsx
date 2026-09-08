import { useMemo, useState } from 'react'
import { Field, FilterChip, Icon } from '@monarch/design-system'
import { useAccounts } from '../../accounts/AccountsProvider'
import { SectionHeader } from '../../components/SectionHeader'
import { ReceiptCard } from './components/ReceiptCard'
import { filterReceipts, groupReceiptsByMonth } from '../../data/derive'

/**
 * Flow 9 — the Receipts tab of `/finance`.
 *
 * A TAB, NOT A ROUTE, and that is the shape Flow 1 established and Flow 7
 * repeated: the five finance tabs are selected-states of one screen, so the
 * selection lives in `FinanceScreen`'s `useState` and never reaches the URL.
 * This component is the fifth tab's body, and it replaces the `ComingSoon` stub
 * that has stood there since Gate 7.
 *
 * BECAUSE THE TAB ALREADY EXISTED, THIS GATE ADDS NO WALK STATE.
 * `/finance [tab:receipts]` has been in `WALK` and has had four committed
 * baselines since the tab list did. Those four baselines CHANGE here; none is
 * added, |WALK| stays 26, and the suite stays at 218 tests. A gate that expected
 * to mint four new files should re-derive before running.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FLOW 9 ADDS NO VIEWPORT-FIXED ELEMENT. THE APP'S FIXED SET STAYS AT FIVE.
 *
 * "+ Add Receipts" is INLINE — the trailing child of the month heading's own
 * row, 16px above the list. It is not a FAB, it is not fixed chrome, and
 * `var(--mvp-frame-inset)` therefore does not arise here: that inset exists
 * because a `position: fixed` element resolves against the viewport rather than
 * the capped shell (Gate D), and nothing on this screen does. If a later gate
 * finds itself writing `position: fixed` in this file, the frame-cap work is
 * what it has just walked into.
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE THINGS THE MOCKUP DOES NOT HAVE, AND THEY ARE NOT BUILT:
 *
 *  - NO EMPTY STATE. Nothing in the frame draws one, and a screen with ten
 *    seeded receipts cannot reach it. Inventing one would be inventing a design.
 *    The search box CAN empty the list, and it renders an empty list — which is
 *    what an unstyled zero-result looks like, and is the honest placeholder for
 *    a state the design has not specified.
 *  - NO SECOND CHIP PAIR. Figma draws two chips, "All" and "This Month", with
 *    two further slots hidden. The hidden ones are not built.
 *  - NO BULK-ADD MODAL. "+ Add Receipts" is INERT this gate — it is wired to
 *    nothing at all, deliberately, and Gate 50 supplies the modal behind it. It
 *    is a real `Link` with a real accessible name so that gate replaces a
 *    handler rather than the markup, which is exactly what Gate 41 did for the
 *    filter button and Gate 43 then benefited from.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CHIPS ARE DECORATIVE THIS GATE, AND THAT IS STATED RATHER THAN HIDDEN.
 *
 * Figma draws `All` and `This Month` on this screen. The Transactions tab's
 * chip row is DERIVED from an applied filter and each chip dismisses its own
 * facet (Gate 44); this screen has no filter model behind it yet, so these two
 * are labels. They are rendered because the design draws them and because
 * leaving the row out would change the layout the rest of the gate is measured
 * against — but nothing reads them and dismissing one does nothing.
 *
 * WHEN A RECEIPT FILTER ARRIVES, these become derived the way the ledger's are.
 * Do not grow them a bespoke filter model here; the ledger already owns that
 * pattern and a second one would be the divergence rule 1 exists to stop.
 */

/**
 * The two chips Figma draws. A plain list because they carry no behaviour yet —
 * see the note above. Declared here rather than in `derive.ts` precisely so that
 * they are not mistaken for part of a filter model.
 */
const RECEIPT_CHIPS = ['All', 'This Month']

export function ReceiptsTab() {
  const { receipts, transactions } = useAccounts()
  const [search, setSearch] = useState('')

  // GROUPED FROM `capturedAt`, NEVER FROM A STORED MONTH — see
  // `groupReceiptsByMonth`. Search narrows BEFORE grouping so a month whose
  // every receipt is filtered out disappears with them rather than leaving an
  // empty heading behind.
  const groups = useMemo(
    () => groupReceiptsByMonth(filterReceipts(receipts, search)),
    [receipts, search],
  )

  // THE JOIN, DONE ONCE. `ReceiptCard` takes a transaction rather than looking
  // one up, so the lookup lives here; a Map keeps it O(1) per card instead of a
  // scan per card inside the render.
  const byId = useMemo(
    () => new Map(transactions.map((t) => [t.id, t])),
    [transactions],
  )

  return (
    <div className="mvp-receipts">
      <div className="mvp-receipts__search mvp-column">
        {/*
          THE SAME CONTROL THE TRANSACTIONS TAB SHIPS, not a second one: `Field`
          at `sizing="fill"`, a leading `search` glyph and a trailing filter
          button. Gate 43's B2 note on `TransactionsLedger` explains why
          `sizing="fill"` rather than an MVP width override, and it applies here
          unchanged.

          THE TRAILING BUTTON IS INERT ON THIS TAB. The Transactions tab's opens
          a filter Sheet; this screen has no filter model (see the header note),
          so the control is present because the design draws it and does nothing.
          It keeps a real accessible name so a later gate wires a handler rather
          than rebuilding the markup.
        */}
        <Field
          value={search}
          onChange={setSearch}
          placeholder="Search"
          ariaLabel="Search receipts"
          sizing="fill"
          leadingIcon={<Icon name="search" size="m" />}
          trailingIcon={
            <button
              type="button"
              className="mvp-receipts__filter-btn"
              aria-label="Filter receipts"
            >
              <Icon name="filter_list" size="m" />
            </button>
          }
        />
      </div>

      <ul className="mvp-receipts__chips mvp-column--bleed">
        {RECEIPT_CHIPS.map((label) => (
          <li key={label}>
            {/*
              `onDismiss` IS OMITTED, NOT STUBBED WITH A NO-OP. A dismiss button
              that is present and does nothing is a control that lies; leaving
              the prop off lets the DS decide whether to render the affordance
              at all. Gate 44 made exactly this argument about the ledger's
              default chips — a drawn, focusable, announced, inert control is
              worse than an absent one.
            */}
            <FilterChip label={label} />
          </li>
        ))}
      </ul>

      {groups.map((group) => (
        <section className="mvp-receipts__month" key={group.key}>
          {/*
            THE ADD AFFORDANCE IS THIS HEADER'S TRAILING CHILD. `SectionHeader`
            already models a heading with a trailing `Link` — it is what "See
            all" uses on the Homepage — so this needs no new component and no
            new rule. `onLinkClick` is deliberately not passed: the `Link`'s own
            handler already calls `preventDefault()`, so the control is inert
            without being broken.

            IT REPEATS PER MONTH, which is what the mockup draws — the frame
            shows one month and one add affordance, and the affordance belongs
            to the heading row rather than to the screen. With two months that
            reads as two adds; if a later gate rules it should be screen-level,
            that is a layout change, not a data one.
          */}
          <SectionHeader label={group.label} linkLabel="+ Add Receipts" />
          <div className="mvp-receipts__list">
            {group.receipts.map((receipt) => (
              <ReceiptCard
                key={receipt.id}
                receipt={receipt}
                transaction={
                  receipt.transactionId
                    ? byId.get(receipt.transactionId)
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
