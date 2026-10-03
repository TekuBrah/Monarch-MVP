import { useMemo, useState } from 'react'
import { Button, Icon, Sheet, ToggleChip } from '@monarch/design-system'
import {
  DATE_RANGES,
  RECEIPT_FILTER_ALL,
  RECEIPT_LINK_STATES,
  RECEIPT_SORT_MODES,
  filterReceipts,
} from '../../data/derive'
import type { ReceiptFilter, ReceiptSortMode } from '../../data/derive'
import type { Receipt } from '../../data/types'

/**
 * The Receipts filter sheet — Gate 80-B.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FIGMA DRAWS NO SHEET HERE, AND THIS OVERRIDES THE FRAME ON TEKU'S RULING.
 *
 * `Finance_Receipts` (`1266:14283`) draws the filter chips INLINE, at y=52
 * directly beneath the search bar, inside a hug-width `Frame 467`
 * (`I1266:14283;1033:11718`, 167x24). It draws no filter sheet and no sort
 * control anywhere — the whole Flow 9 section (`1266:14277`) is eight frames and
 * none of them is one. Read through the REMOTE connector at this gate; the local
 * MCP server refused the connection.
 *
 * SO THIS SURFACE EXISTS ON TEKU'S 2 OCT RULING THAT THE RECEIPTS FILTER MUST
 * BEHAVE EXACTLY AS THE TRANSACTIONS ONE DOES, not on the file. Registered as an
 * override rather than presented as a transcription.
 *
 * WHAT THE FRAME DOES CORROBORATE IS THE CHIP ROW. Figma's two visible chips are
 * `Field` instances each carrying a CLOSE glyph (`725:3652`), i.e. a dismissible
 * applied-filter row rather than a static label pair — which is exactly what the
 * screen now renders, derived. And its two HIDDEN slots read "Watson" and
 * "RM 0 - 500": the TRANSACTIONS chip row, copy-pasted. "Watson" is a merchant
 * this app's data does not contain and "RM 0 - 500" is literally
 * `TRANSACTION_FILTER_APPLIED`'s amount chip, so those two slots are NOT
 * evidence for a receipts merchant or amount facet. See the model block in
 * `derive.ts` for why neither was built.
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPOSITION, NOT A PRIMITIVE (rule 4). Every control is a DS export — `Sheet`,
 * `ToggleChip`, `Button`, `Icon` — and this file arranges them. It owns no
 * appearance the DS could own; its stylesheet is layout rules in `finance.css`.
 *
 * MODELLED ON `TransactionFilterSheet`, AND THE PARITY IS THE DELIVERABLE: one
 * `Sheet`, a centred title, a tertiary "Reset" in the header trail, a `fieldset`
 * per group, and one primary action carrying a LIVE RESULT COUNT. Two filter
 * sheets in one app that differed in any of those would be the inconsistency
 * this gate exists to remove.
 *
 * NO MERCHANT PICKER AND THEREFORE NO VIEW STATE. The ledger's sheet pushes to a
 * second view because 20 merchant options fit nothing at 375; this sheet's three
 * groups are 4 + 3 + 2 chips and all of them fit. `SheetView` has no analogue
 * here and none was invented.
 */
export interface ReceiptFilterSheetProps {
  receipts: Receipt[]
  /** The filter currently IN FORCE — what the pending copy is seeded from. */
  filter: ReceiptFilter
  /** The sort mode currently IN FORCE. Seeded and applied the same way. */
  sortMode: ReceiptSortMode
  /**
   * The live search box.
   *
   * AN INPUT TO THE COUNT, NOT TO THE FILTER — `TransactionFilterSheet`'s own
   * reasoning. The search stays in force when the sheet closes, so a count that
   * ignored it would be a promise the list then breaks.
   */
  search: string
  onApply: (filter: ReceiptFilter, sortMode: ReceiptSortMode) => void
  onClose: () => void
}

export function ReceiptFilterSheet({
  receipts,
  filter,
  sortMode,
  search,
  onApply,
  onClose,
}: ReceiptFilterSheetProps) {
  /*
    TWO PENDING COPIES, DISCARDED ON CLOSE. Editing a chip must not re-filter the
    list behind the scrim — the whole point of an Apply button is that the change
    is not in force until it is pressed. Both are `useState` initialisers, which
    run once per MOUNT, so `ReceiptsTab` mounting this conditionally is what
    guarantees the seed is current with no effect to keep in step (Gate 43).
  */
  const [pending, setPending] = useState<ReceiptFilter>(filter)
  const [pendingSort, setPendingSort] = useState<ReceiptSortMode>(sortMode)

  /*
    ── THE SORT MODE IS PENDING TOO, AND THAT IS THE ONE BEHAVIOURAL CONSEQUENCE
    OF MOVING IT (Gate 80-B) ────────────────────────────────────────────────────

    On the page it applied on tap. Inside a sheet, "applies on tap" and "applies
    on Apply" are INDISTINGUISHABLE during the interaction, because the list is
    behind an opaque panel and a scrim — so the only observable difference is on
    DISMISSAL: a live control would keep a sort change the user then cancelled.

    A SHEET WHERE THREE CONTROLS ARE PENDING AND ONE IS LIVE IS STRICTLY WORSE,
    because nothing on screen says which is which, and it would make Reset
    ambiguous about whether it touches the sort.

    THE SORT'S SEMANTICS ARE UNTOUCHED, which is the ruling that matters: the two
    ids, the two labels, the default and both grouping functions are byte-identical
    to what `ReceiptsTab` declared before the move. Receipts still group and sort
    by the date they were ADDED, newest first; the printed date is still on every
    card and still drives auto-match.
  */

  /**
   * WHAT THE APPLY BUTTON COUNTS — the receipts the PENDING filter matches.
   *
   * IT IS LITERALLY THE CALL THE SCREEN MAKES, search included, so N is the
   * number of cards the user will actually see. `TransactionFilterSheet` reaches
   * the same conclusion for the same reason.
   *
   * THE SORT MODE IS NOT AN INPUT, and cannot be: sorting changes order, never
   * membership, so a count that varied with it would be wrong in one of the two
   * modes.
   */
  const matchCount = useMemo(
    () => filterReceipts(receipts, search, pending).length,
    [receipts, search, pending],
  )

  /*
    THE SAME COPY AS THE LEDGER'S, TO THE CHARACTER. Gate 44 replaced
    `Apply Filter (23)` — which reads as "23 filters" — with the unit named, and
    handles zero and one rather than leaving them to the common case: "1 results"
    is the classic tell of a count pasted into a fixed string, and "0 results" on
    a button the user is about to press says the same thing as a warning instead
    of as arithmetic. Applying a filter that matches nothing is still a legal
    act, so the button stays enabled and simply says so.
  */
  const applyLabel =
    matchCount === 0
      ? 'Apply Filter · No results'
      : `Apply Filter · ${matchCount} ${matchCount === 1 ? 'result' : 'results'}`

  return (
    <Sheet
      isOpen
      onClose={onClose}
      title="Filter receipts"
      /*
        NO ✕, FOR PARITY WITH THE LEDGER'S SHEET. That one suppresses it on
        Figma's authority (title-left, Reset-right, nothing else); this one has
        no frame to defer to, so the deciding argument is that two filter sheets
        differing in the header is the inconsistency this gate removes.
        Dismissal is still fully available — `Sheet` supplies Escape and a scrim
        click unconditionally.
      */
      showCloseButton={false}
      headerAction={
        /*
          RESET WRITES THE PENDING COPIES, NOT THE APPLIED STATE. Figma gives a
          filter sheet one primary action; making Reset apply immediately would
          give it two and would make "Reset then dismiss" a destructive act the
          user never confirmed.

          IT RESTORES THE SORT AS WELL AS THE FACETS, because it sits in the
          header above every group in the sheet and a whole-form Reset that
          silently skipped one group would be lying about its scope. The reset
          values are READ OUT OF `RECEIPT_FILTER_ALL` and `RECEIPT_SORT_MODES[0]`
          rather than written as literals, so this cannot drift from what a
          dismissed chip produces.
        */
        <Button
          variant="tertiary"
          size="s"
          label="Reset"
          onClick={() => {
            setPending(RECEIPT_FILTER_ALL)
            setPendingSort(RECEIPT_SORT_MODES[0].id)
          }}
        />
      }
      actions={
        <Button
          variant="primary"
          label={applyLabel}
          trailingIcon={<Icon name="tune" size="m" />}
          onClick={() => {
            onApply(pending, pendingSort)
            onClose()
          }}
        />
      }
    >
      <div className="mvp-receipt-filter">
        {/*
          A `fieldset` PER GROUP, because each is a named group of controls and
          that is what the element is for. `ToggleChip` renders an
          `aria-pressed` button, so a `legend` is what gives the group its
          accessible name — a bare `<p>` would leave three unlabelled chip rows.
        */}
        <fieldset className="mvp-receipt-filter__group">
          <legend className="mvp-receipt-filter__legend type-body-caption-semibold">
            Date Range
          </legend>
          {/*
            BUILT FROM THE SHARED `DATE_RANGES` (4), NOT FROM FIGMA'S TWO.

            Figma draws "All" and "This Month". The data offers "All Time",
            "This Month", "Last 7 Days" and "Last 30 Days" — the same four
            windows the ledger's sheet offers, from the one definition that was
            renamed out of `TRANSACTION_DATE_RANGES` for this second consumer.
            Figma's "All" is "All Time" under a shorter casing; its other two
            slots are the transactions merchant and amount chips rather than two
            more date options. Registered as a mockup/data mismatch; built from
            the data.

            IT MEASURES BACK FROM THE NEWEST `capturedAt`, NOT FROM `TODAY` —
            see `receiptsNow`, where the alternative is measured at 0 of 10.
          */}
          <div className="mvp-receipt-filter__chips">
            {DATE_RANGES.map((range) => (
              <ToggleChip
                key={range.id}
                label={range.label}
                isSelected={pending.dateRange === range.id}
                onClick={() => setPending((f) => ({ ...f, dateRange: range.id }))}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mvp-receipt-filter__group">
          <legend className="mvp-receipt-filter__legend type-body-caption-semibold">
            Link Status
          </legend>
          {/*
            THE AXIS THE RECEIPT RECORD SERVES BEST AND FIGMA NEVER DREW.
            `transactionId` is `string | null` and `null` is a REAL, REACHABLE
            state rather than a placeholder: the viewer's Unlink writes it, the
            source picker's "Receipt library" lists exactly those rows, and the
            walk already photographs one.

            ALL TEN SEEDED RECEIPTS ARE LINKED, so "Unlinked" matches nothing at
            rest. That is the point of the facet rather than an argument against
            it — the reason to filter for unlinked receipts is to find the ones
            that still need attaching.
          */}
          <div className="mvp-receipt-filter__chips">
            {RECEIPT_LINK_STATES.map((state) => (
              <ToggleChip
                key={state.id}
                label={state.label}
                isSelected={pending.linkState === state.id}
                onClick={() => setPending((f) => ({ ...f, linkState: state.id }))}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mvp-receipt-filter__group">
          <legend className="mvp-receipt-filter__legend type-body-caption-semibold">
            Sort by
          </legend>
          {/*
            THE GATE 64 CONTROL, MOVED RATHER THAN REBUILT. Same `fieldset` /
            `legend` / `ToggleChip` shape it already had on the page — which was
            itself taken from this sheet's sibling — and the same two ids and
            labels, now read from `RECEIPT_SORT_MODES` in `derive.ts`.

            IT IS LAST, BELOW THE FACETS, because it answers a different question
            from the two above it: those decide which receipts are shown, this
            decides the order they are shown in. A sort sitting between two
            facets would read as a third facet.
          */}
          <div className="mvp-receipt-filter__chips">
            {RECEIPT_SORT_MODES.map((mode) => (
              <ToggleChip
                key={mode.id}
                label={mode.label}
                isSelected={pendingSort === mode.id}
                onClick={() => setPendingSort(mode.id)}
              />
            ))}
          </div>
        </fieldset>
      </div>
    </Sheet>
  )
}
