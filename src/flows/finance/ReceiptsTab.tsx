import { useCallback, useMemo, useState } from 'react'
import { Button, Field, FilterChip, Icon } from '@monarch/design-system'
import { useAccounts } from '../../accounts/AccountsProvider'
import { SectionHeader } from '../../components/SectionHeader'
import { NoResults } from '../../components/NoResults'
import { ReceiptCard } from './components/ReceiptCard'
import { AddReceiptsModal } from './components/AddReceiptsModal'
import { ReceiptViewerHost } from './components/ReceiptViewer'
import { capturedToReceipts, receiptDateWasRead, type CapturedFile } from './receiptCapture'
import {
  RECEIPT_FILTER_ALL,
  clearReceiptFacet,
  filterReceipts,
  groupReceiptsByCapturedDate,
  groupReceiptsByMonth,
  receiptFilterChips,
} from '../../data/derive'
import type { ReceiptFilter, ReceiptSortMode } from '../../data/derive'
import { ReceiptFilterSheet } from './ReceiptFilterSheet'
import { autoMatchBatch } from '../../data/autoMatch'

/**
 * Flow 9 — the Receipts tab of `/finance`.
 *
 * A TAB, NOT A ROUTE, and that is the shape Flow 1 established and Flow 7
 * repeated: the five finance tabs are selected-states of one screen, so the
 * selection lives in `FinanceScreen`'s `useState` and never reaches the URL.
 * This component is the fifth tab's body, and it replaces the `ComingSoon` stub
 * that has stood there since Gate 7.
 *
 * GATE 48 ADDED NO WALK STATE, BECAUSE THE TAB ALREADY EXISTED.
 * `/finance [tab:receipts]` has been in `WALK` and has had four committed
 * baselines since the tab list did, drawing `ComingSoon`. Those four baselines
 * CHANGED at Gate 48; none was added, and the suite stayed at 218 tests. The
 * general rule, which Budget and Plans will hit next: REPLACING A `ComingSoon`
 * STUB CHANGES BASELINES AND ADDS NONE.
 *
 * GATE 50 IS THE OPPOSITE CASE AND ADDS TWO — `[overlay:add]` and
 * `[overlay:add-grid]` — because an overlay on this tab is a state the walk did
 * not previously visit. The RESTING tab is unchanged and its four baselines did
 * not move: the modal is mounted conditionally, so nothing of it is in the DOM
 * while it is closed, and `SectionHeader` already passed an `onClick` to its
 * `Link` whether or not `onLinkClick` was supplied — so wiring the affordance
 * changed no attribute and no class.
 *
 * GATE 51 MOVED THE RESTING TAB'S FOUR BASELINES, AND THE THREE ADD STATES'
 * TWELVE WITH THEM. The per-month "+ Add Receipts" link became ONE screen-level
 * "Add new receipt" button (Teku's redesign of `1266:14283`, 11 Sept), and every
 * card became a button that opens the receipt viewer. The add states photograph
 * this tab behind their modal at full page height, so they see the new row too.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ADD CONTROL IS ONE PER SCREEN, NOT ONE PER MONTH (Gate 51 ruling 3).
 *
 * Figma `1266:14283` now draws `Frame 456` — a full-width `button`, "Add new
 * receipt" with a leading `add` glyph — between the chip row and the first
 * month, and hides the heading row's old `Frame 530` link. With two months on
 * screen the old design read as two identical adds.
 *
 * IT SITS OUTSIDE EVERY MONTH GROUP, so it renders when a search empties the
 * list and when the library is empty — which Gate 51's Delete makes reachable.
 *
 * IT FILLS THE COLUMN BY COMPOSITION, NOT BY A RULE ON `.mn-btn`. `Button` ships
 * no fill prop and renders `display: inline-flex`; as the only item of a column
 * flex container it is blockified and takes `align-items: stretch`'s width. So
 * the width comes from the parent's layout and no MVP rule reaches into the DS.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE APP'S FIXED SET STAYS AT FIVE.
 *
 * The add row is in flow. The one fixed element this screen can now show is
 * Delete's toast, and it renders the EXISTING `.mvp-finance-detail__toast` rule
 * — the fifth of the five — with a modifier that moves only its `bottom` and
 * `z-index`. `var(--mvp-frame-inset)` therefore still arises nowhere new. If a
 * later gate finds itself writing `position: fixed` in this file, the frame-cap
 * work is what it has just walked into.
 * ─────────────────────────────────────────────────────────────────────────────
 * THINGS THE MOCKUP DOES NOT HAVE:
 *
 *  - NO EMPTY STATE. Nothing in the frame draws one. The search box can empty
 *    the list, and so — since Gate 51 — can deleting every receipt; both render
 *    an empty list under the add control, which is the honest placeholder for a
 *    state the design has not specified.
 *  - NO SECOND CHIP PAIR. Figma draws two chips, "All" and "This Month", with
 *    two further slots hidden. The hidden ones are not built.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CHIP ROW IS DERIVED, AND THE FILTER LIVES BEHIND THE ICON — Gate 80-B.
 *
 * UNTIL THIS GATE THE CHIPS WERE DECORATIVE AND THE FILTER ICON WAS WIRED TO
 * NOTHING: the trailing `<button>` in the search field carried an
 * `aria-label` and NO `onClick` at all — not a stubbed no-op, no handler —
 * while "All" and "This Month" were a two-string literal that nothing read and
 * whose dismiss affordance was deliberately omitted. This header said what to do
 * about it: "WHEN A RECEIPT FILTER ARRIVES, these become derived the way the
 * ledger's are. Do not grow them a bespoke filter model here."
 *
 * THAT IS WHAT HAPPENED. The model is `ReceiptFilter` in `derive.ts`, built in
 * the ledger's own shape, and this row is `receiptFilterChips(filter)` with each
 * chip dismissing its own facet through `clearReceiptFacet`.
 *
 * THE ROW IS EMPTY AT REST AND TAKES NO SPACE THERE. A facet at its default
 * renders no chip (Gate 44), so with nothing applied the `<ul>` has no children
 * and `.mvp-receipts__chips:empty` removes it from flex layout — which is the
 * only spelling that takes the parent's 8px gap with it. So the two bullets this
 * gate was given are one mechanism: the controls moved into the sheet, and
 * "Add new receipt" reclaims the space.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SORT CONTROL MOVED INTO THE SHEET AND ITS SEMANTICS DID NOT CHANGE.
 *
 * `SORT_MODES` and `SortMode` were declared in this file at Gate 64 and now
 * live in `derive.ts` as `RECEIPT_SORT_MODES` / `ReceiptSortMode`, beside the
 * two grouping functions the mode selects between. Same two ids, same two
 * labels, same default. The ONE behavioural consequence of the move — a tap now
 * commits on Apply rather than immediately — is argued where it is caused, in
 * `ReceiptFilterSheet`.
 */

export function ReceiptsTab() {
  const { receipts, transactions, addReceipt } = useAccounts()
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<ReceiptSortMode>('added')

  /*
    ── THE FILTER (Gate 80-B) ────────────────────────────────────────────────

    ONE APPLIED FILTER FOR THE SCREEN, SEEDED AT EVERYTHING. The sheet holds a
    pending copy and hands it back exactly once, on Apply — so this is the only
    filter state and the list behind the scrim never re-filters mid-edit.

    MOUNTED CONDITIONALLY, which is what seeds that copy correctly: a `useState`
    initialiser runs once per MOUNT, so a sheet kept mounted and merely hidden
    would hold a draft that went stale the moment a chip was dismissed behind it
    (Gate 43).
  */
  const [filter, setFilter] = useState<ReceiptFilter>(RECEIPT_FILTER_ALL)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const closeFilter = useCallback(() => setIsFilterOpen(false), [])

  /*
    ── THE BULK ADD MODAL (Gate 50) ──────────────────────────────────────────

    ONE boolean for the whole screen — and since Gate 51 one CONTROL for the
    whole screen too. The modal is a way to add receipts to the library, not to
    a particular month, and its captures are dated by extraction rather than by
    where the button sits.

    CAPTURES FROM HERE ARRIVE UNLINKED AND AUTO-MATCH DECIDES (Gate 50-C).
    There is no transaction in view to link them to, which is the whole
    difference from the detail sheet's entry point. A capture that does not
    match renders as `ReceiptCard`'s `Linked=No` variant — the variant Gate 49
    first reached by UNLINKING, and which no seeded record ships in.
  */
  const [isAddOpen, setIsAddOpen] = useState(false)

  /*
    ── THE RECEIPT VIEWER (Gate 51) ──────────────────────────────────────────

    AN ID, NEVER THE RECEIPT OBJECT — the ledger's `detailId` rule. The host
    re-resolves it from the live collection on every render, so an Unlink flips
    the open viewer in place and a Delete unmounts it.
  */
  const [viewingId, setViewingId] = useState<string | null>(null)
  // STABLE — it reaches the viewer's DS `Modal` as `onClose`, whose effect
  // re-runs on every identity change. See `ReceiptViewerHost`'s `close`.
  const closeViewer = useCallback(() => setViewingId(null), [])

  /*
    ── AUTO-MATCH RUNS HERE, AND ONLY HERE (Gate 50-C) ──────────────────────

    ONCE, OVER THE WHOLE BATCH, AT THE MOMENT IT IS ADDED. `autoMatchBatch`
    reads each capture's RAW extraction — unread fields still `null` — against
    the ledger and the library as they stand before the batch lands, and the
    display fallbacks are applied only afterwards, when the records are built.

    IT IS A HANDLER, NOT A RENDER-TIME DERIVATION, AND THAT IS THE RUN-ONCE
    RULING. Nothing re-matches the library when this tab re-renders, nothing
    re-matches after an unlink, and nothing re-matches after a delete: each
    makes a transaction receipt-less, so a re-run would find it a candidate
    again and re-link a receipt the user had just taken away from it.

    NO NEW MUTATOR. The link is decided BEFORE the receipt exists, so the
    existing `addReceipt` — the same one the detail sheet uses for a receipt
    that arrives already linked — carries it. It writes the receipt collection
    and nothing else, so an auto-link cannot move a ledger amount.
  */
  const saveCaptures = (captured: CapturedFile[]) => {
    const links = autoMatchBatch(
      captured.map((c) => c.extracted),
      transactions,
      receipts,
    )
    // ONE CLOCK READING FOR THE WHOLE SELECTION, and the names de-duplicated
    // across it — see `capturedToReceipts`. Every image picked together shares a
    // wall-clock stamp under Decision 7B, so without the batch step three photos
    // added at once would land as three cards with one name between them.
    capturedToReceipts(captured, links, new Date()).forEach(addReceipt)
  }

  // GROUPED FROM `addedAt` SINCE GATE 58 (`capturedAt` until then), NEVER FROM
  // A STORED MONTH — see `groupReceiptsByMonth` and `Receipt.addedAt`. Search
  // narrows BEFORE grouping so a month whose every receipt is filtered out
  // disappears with them rather than leaving an empty heading behind.
  //
  // THE SORT MODE PICKS THE GROUPING FUNCTION, NOT A POST-HOC RE-SORT OF ITS
  // OUTPUT (Gate 64). Both branches filter first — `filterReceipts` runs once,
  // shared — so search narrows before grouping in EITHER mode; only which
  // grouping function receives the narrowed list differs.
  const groups = useMemo(() => {
    const narrowed = filterReceipts(receipts, search, filter)
    return sortMode === 'added'
      ? groupReceiptsByMonth(narrowed)
      : groupReceiptsByCapturedDate(narrowed, (r) => receiptDateWasRead(r.id))
  }, [receipts, search, filter, sortMode])

  // THE CHIPS ARE AN OUTPUT OF THE FILTER, NEVER A SECOND COPY OF IT. One chip
  // per facet that is NOT at its default, so the row's emptiness IS the
  // statement that nothing is filtered.
  const chips = useMemo(() => receiptFilterChips(filter), [filter])

  /*
    THE RECOVERY ACTION RESETS BOTH NARROWING MECHANISMS, not just the facets.

    `filterReceipts(receipts, search, filter)` takes the search term and the
    facet set as SEPARATE arguments, so either can produce a zero result on its
    own and either can keep producing one after the other is cleared. An action
    that cleared only `filter` would therefore be able to leave the user still
    looking at nothing, which is not a recovery action — see `NoResults`'
    `actionLabel` for why the button is named after its outcome rather than
    after "clear filters".

    IT IS GUARANTEED TO RESOLVE THE STATE. With both at their defaults the
    predicate narrows nothing, so the list is the whole library.
  */
  const showAll = useCallback(() => {
    setSearch('')
    setFilter(RECEIPT_FILTER_ALL)
  }, [])

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

          THE TRAILING BUTTON OPENS THE FILTER SHEET — Gate 80-B. It was INERT
          from Gate 48 to Gate 80: a real control with a real accessible name
          and no `onClick` whatsoever. Keeping the markup is what made this a
          one-handler change rather than a rebuild, which is exactly what the
          note it replaces predicted.
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
              onClick={() => setIsFilterOpen(true)}
            >
              <Icon name="filter_list" size="m" />
            </button>
          }
        />
      </div>

      {/*
        THE APPLIED-FILTER CHIPS — the ledger's row, in the ledger's shape.

        `onDismiss` IS NOW SUPPLIED, where Gate 48 deliberately omitted it. The
        argument it was omitted under still holds and is what makes supplying it
        correct now: a dismiss affordance that did nothing was a control that
        lied, and these chips clear a real facet.

        THE KEY IS THE FACET, NOT THE LABEL OR THE INDEX. Two facets can print
        the same string — "All" is both the link default and, at a different
        range, nothing else — so a label key would collide, and an index key
        would re-identify every chip after one that disappears.
      */}
      <ul className="mvp-receipts__chips mvp-column--bleed">
        {chips.map((chip) => (
          <li key={chip.facet}>
            <FilterChip
              label={chip.label}
              onDismiss={() => setFilter((f) => clearReceiptFacet(f, chip.facet))}
            />
          </li>
        ))}
      </ul>

      {/*
        ── THE ONE ADD CONTROL (Gate 51) ─────────────────────────────────────
        Figma's `Frame 456` button: `Type=Primary, Size=M, Icon left=True,
        Icon right=False` — `variant="primary"`, `size="m"` (8/12 padding) and a
        20px `add` glyph, which is `Icon size="m"`. See the header for why the
        width comes from this row's layout rather than from the button.
      */}
      <div className="mvp-receipts__add mvp-column">
        <Button
          variant="primary"
          size="m"
          label="Add new receipt"
          leadingIcon={<Icon name="add" size="m" />}
          onClick={() => setIsAddOpen(true)}
        />
      </div>

      {groups.map((group) => (
        <section className="mvp-receipts__month" key={group.key}>
          {/*
            THE HEADING CARRIES NO TRAILING LINK AS OF GATE 51. It used to hold
            "+ Add Receipts", which repeated per month; Figma `1266:14283` hides
            that link (`Frame 530`, `hidden="true"`) and draws the screen-level
            button above instead. `SectionHeader` renders correctly without a
            `linkLabel` — the Homepage's "Monarch Academy" is the precedent.
          */}
          <SectionHeader label={group.label} />
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
                onOpen={() => setViewingId(receipt.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {/*
        THE NO-RESULTS STATE (Gate 80-C). `groups` is empty exactly when the
        search term and the facet set between them match nothing — and until
        this gate the screen rendered NOTHING there: measured on the
        `[overlay:applied]` walk state at 375, zero `.mvp-receipts__month`
        sections, the root box ending at y=326 and 403px of blank space down to
        the nav band.

        THE CHIPS STAY ABOVE IT, which is what makes the zero explainable: the
        row is derived from the filter, so the user can see which facets caused
        it and dismiss one without opening the sheet. The sort control and the
        add button stay for the same reason — nothing about a zero result makes
        adding a receipt unavailable.
      */}
      {groups.length === 0 && (
        <NoResults
          title="No receipts match"
          description="Try a wider date range, or dismiss a filter above."
          actionLabel="Show all receipts"
          onReset={showAll}
        />
      )}

      {/*
        MOUNTED CONDITIONALLY, so nothing of it exists in the DOM while it is
        closed. It also re-seeds its own staged list per open, the same property
        Gate 43's filter sheet gets from being mounted conditionally: reopening
        after a cancel starts empty rather than showing whatever was staged last
        time.
      */}
      {isAddOpen && (
        <AddReceiptsModal
          isOpen
          onClose={() => setIsAddOpen(false)}
          onSave={saveCaptures}
        />
      )}

      {/*
        ── THE FILTER SHEET (Gate 80-B) ──────────────────────────────────────
        MOUNTED CONDITIONALLY, for the seeding reason argued at the state
        declaration above and in `ReceiptFilterSheet`.
      */}
      {isFilterOpen && (
        <ReceiptFilterSheet
          receipts={receipts}
          filter={filter}
          sortMode={sortMode}
          search={search}
          onApply={(next, nextSort) => {
            setFilter(next)
            setSortMode(nextSort)
          }}
          onClose={closeFilter}
        />
      )}

      {/*
        ALWAYS MOUNTED, AND IT RENDERS NOTHING WHILE IDLE — its toast has to
        outlive the viewer it reports on. See `ReceiptViewerHost`.
      */}
      <ReceiptViewerHost receiptId={viewingId} onClose={closeViewer} onShow={setViewingId} />
    </div>
  )
}
