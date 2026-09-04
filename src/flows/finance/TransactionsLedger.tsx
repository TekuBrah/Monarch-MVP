import { useMemo, useState } from 'react'
import { Field, FilterChip, Icon, ListItem } from '@monarch/design-system'
import { useAccounts } from '../../accounts/AccountsProvider'
import { TransactionMark } from '../../components/TransactionMark'
import { TransactionFilterSheet } from './TransactionFilterSheet'
import {
  TRANSACTION_FILTER_ALL,
  clearFacet,
  filterChips,
  filterTransactions,
} from '../../data/derive'
import { formatSignedMyr, formatTimestamp } from '../../data/format'

/**
 * `Finance_Transaction01` (`1266:14328`) — the Transactions tab's body.
 *
 * THE NINE ROWS FIGMA DRAWS ARE AN OUTPUT, NOT A LIST, AND THAT IS STILL TRUE —
 * WHAT CHANGED AT GATE 44 IS WHEN THE SCREEN IS IN THAT STATE. Every row here
 * comes from `filterTransactions()` over the whole 23-row ledger, and Figma's
 * nine are simply the first nine of the 15 that match `TRANSACTION_FILTER_APPLIED`
 * under an ordinary date-descending sort. Nothing is hand-picked, which is what
 * makes the filter a filter rather than a caption over a fixed list.
 *
 * BUT THE SCREEN NO LONGER OPENS THERE. Gate 44 reversed the earlier ruling
 * that it should: the initial filter is `TRANSACTION_FILTER_ALL`, all 23 rows
 * show, and the chip row is empty. Figma's frame is a picture of the screen
 * MID-USE — it is what the screen looks like once a filter has been applied,
 * and reproducing it as the initial state made an applied filter look like a
 * property of the screen. See the `useState` below for the full note.
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
 * THE FILTER SHEET LANDED AT GATE 43, and it did replace a handler rather than
 * restructure this markup — the trailing filter control below kept its hit
 * target and its accessible name, and only its `onClick` body changed.
 */
export function TransactionsLedger() {
  const { transactions } = useAccounts()
  const [search, setSearch] = useState('')

  // THE SCREEN OPENS UNFILTERED, AS OF GATE 44. This was
  // `TRANSACTION_FILTER_APPLIED` — Figma's applied filter — and that decision
  // was recorded as settled ("Transactions opens pre-filtered, matching Figma
  // exactly. No unfiltered view is built"). Teku reopened and reversed it.
  //
  // WHAT THE REVERSAL BUYS: a screen that opens showing a SUBSET of the user's
  // own transactions, with no action having been taken to ask for that, is
  // a screen that lies about what it holds. Figma's frame is a picture of the
  // screen mid-use, and it was implemented as the screen's initial state.
  //
  // `TRANSACTION_FILTER_APPLIED` IS NOT DELETED and is still exercised: it is
  // the value the harness's filtered walk state applies, which is what keeps
  // a filtered ledger — and, under Gate 44's chip model, the chip row itself —
  // inside the visual net. See OVERLAY_STATES in `e2e/harness.ts`.
  //
  // The chip row writes this state through `clearFacet` as of Gate 41-C, and
  // Gate 43's sheet writes it too — THROUGH THIS SAME SETTER. There is one
  // filter state in this screen and there stays one: a sheet holding its own
  // copy is how the row and the list start disagreeing about what is in force.
  // The sheet's `pending` value is not a second state — it is a draft that
  // exists only while the sheet is mounted and reaches this setter exactly
  // once, on Apply.
  const [filter, setFilter] = useState(TRANSACTION_FILTER_ALL)

  // Whether the sheet is on screen. It holds NO filter value of its own.
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const rows = useMemo(
    () => filterTransactions(transactions, filter, search),
    [transactions, filter, search],
  )
  const chips = useMemo(() => filterChips(filter), [filter])

  return (
    <div className="mvp-transactions">
      <div className="mvp-transactions__search mvp-column">
        <Field
          value={search}
          onChange={setSearch}
          /*
            "Search" is Figma's literal placeholder (`I1376:24708;824:5785`,
            `body/m` on `--text/subtle/default`) — not a shortening of ours, so
            it stays whatever the field's width becomes.

            THE SECOND HALF OF THIS NOTE WAS TRUE AND IS NOT ANY MORE. It read
            that the longer string "also did not fit", because `.mn-field` was
            a hard-coded 240px with no sizing prop. DS v2.0.0 closed that
            (register B2) and the field now fills the 343 column, so width is no
            longer a reason for the short placeholder — Figma is. Do not read
            the fit argument back in to justify changing it.

            `ariaLabel` KEEPS THE LONG FORM, so the accessible name does not
            change — a placeholder is not an accessible name, and "Search"
            alone would not say what is being searched.
          */
          placeholder="Search"
          ariaLabel="Search transactions"
          /*
            B2, CLOSED BY DS v2.0.0. Figma's search field is 343 wide — the
            whole 375-32 gutter — and `.mn-field` shipped a hard `width: 240px`
            with no escape, so this rendered 240 in a 343 column at BOTH
            viewports. `sizing="fill"` is the DS's own prop for it, the same
            shape as `CardBalance.sizing` (Gate 33).

            NO MVP-LOCAL WIDTH OVERRIDE, deliberately. `.mn-field { width: 100% }`
            from this repo would be an equal-specificity rule sitting on top of
            DS geometry — invisible while the values agree and a silent mask
            over any future DS change. That is the exact rule Gate 13 removed
            on measurement.
          */
          sizing="fill"
          leadingIcon={<Icon name="search" size="m" />}
          trailingIcon={
            <button
              type="button"
              className="mvp-transactions__filter-btn"
              aria-label="Filter transactions"
              /*
                Gate 43 supplied this body and changed nothing else about the
                control — the button, its hit target and its accessible name
                are the ones Gate 41 left here for exactly that purpose. The
                e2e overlay state opens the sheet through THIS control rather
                than by setting state, which is why it had to stay a real
                button with a real name.
              */
              onClick={() => setIsFilterOpen(true)}
            >
              <Icon name="filter_list" size="m" />
            </button>
          }
        />
      </div>

      {/*
        A5 — AND IT DOES NOT REPRODUCE. A5 records this row as 377 wide at
        x=16 in a 375 frame, clipping a fourth chip. Re-read at Gate 41-B, that
        377 is ONE frame — `1376:24708`, the elongated exploratory copy, and the
        only one where the payee facet is set so a fourth chip exists at all.
        Both canonical 375 frames draw a 281-wide row of THREE chips and do not
        overflow.

        THE ROW STILL SCROLLS, for a prospective overflow rather than a current
        one: `filterChips` joins selected payees with commas, so Gate 43's
        sheet makes a long payee chip the moment two are picked. The gutter
        arrives as padding via `.mvp-column--bleed` — the same answer A3/A4's
        five-tab overflow already took here (`Tabs isScrollable` on
        `FinanceScreen`).
      */}
      {/*
        B1, CLOSED BY DS v2.0.0. This row rendered `Chips` — a 16-tall status
        pill with a leading glyph and no trailing slot, reached for because
        nothing in the pinned DS could draw an applied filter. v2.0.0 ships the
        real thing: `FilterChip` is Figma `filter/chips` (228:1296) at 24 tall
        on elevation with a dropshadow and a trailing dismiss BUTTON.

        THE NAME `FilterChip` MEANT A DIFFERENT COMPONENT BEFORE v2.0.0 — the
        40-tall bordered sheet toggle, now `ToggleChip`. This repo never
        imported that one, so nothing here had to be renamed; a repo that did
        would have resolved silently to the wrong component, since v2.0.0 ships
        no deprecation alias.

        `key` IS THE FACET, NOT THE LABEL. Labels are not unique — the type and
        date facets can both print "All" — and a duplicate React key silently
        drops a chip.
      */}
      <ul className="mvp-transactions__chips mvp-column--bleed">
        {chips.map((chip) => (
          <li key={chip.facet}>
            <FilterChip
              label={chip.label}
              /*
                THE DS DEFAULTS THIS NAME TO `Remove <label>`, WHICH IS
                AMBIGUOUS HERE. The type chip prints "All" at its default, so
                the default name reads "Remove All" — indistinguishable, spoken
                aloud, from a control that clears every filter. And labels are
                not unique across facets — the same reason `key` is the facet
                and not the label — so two chips could announce the same name.
                The DS declined a clickable chip ROOT on jest-axe grounds;
                leaving ambiguous names on the buttons it DID model would be
                inconsistent with that.

                THE FACET WORD IS DERIVED FROM `chip.facet`, NOT WRITTEN OUT
                PER CHIP. `TransactionFacet` is the four ids `type`, `date`,
                `payee` and `amount`, which are already the display words, so
                a lookup table would restate all four literals and could drift
                from the union. Deriving is also what covers the PAYEE chip,
                which does not render at the default filter and would be the
                one a per-chip literal forgot.
              */
              dismissLabel={`Remove ${chip.facet} filter (${chip.label})`}
              /*
                Dismiss clears THAT facet, through the screen's one filter
                state. `clearFacet` reads its reset values out of
                `TRANSACTION_FILTER_ALL`, so this cannot drift from the cleared
                state Gate 43's sheet produces.

                The functional update form is not decoration: two dismisses in
                one React batch would otherwise both read the pre-batch filter
                and the second would discard the first.
              */
              onDismiss={() => setFilter((f) => clearFacet(f, chip.facet))}
            />
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

      {/*
        MOUNTED ONLY WHILE OPEN, WHICH IS WHAT SEEDS IT.

        `TransactionFilterSheet` seeds its pending copy from `filter` in a
        `useState` initialiser, and an initialiser runs once per MOUNT. Keeping
        the sheet mounted and toggling its `isOpen` would run it once per
        SCREEN and the draft would go stale the moment a chip was dismissed
        behind it — the classic stale-copy bug this app has an explicit rule
        against. Conditional mounting makes "the draft starts from what is in
        force" true by construction, with no effect to keep in step.

        `Sheet` also restores focus to the previously-focused element on
        unmount, so closing returns the user to the filter button they opened
        it from.
      */}
      {isFilterOpen && (
        <TransactionFilterSheet
          transactions={transactions}
          filter={filter}
          search={search}
          onApply={(next) => setFilter(() => next)}
          onClose={() => setIsFilterOpen(false)}
        />
      )}
    </div>
  )
}
