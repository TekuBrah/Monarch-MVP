import { useCallback, useMemo, useState } from 'react'
import { Button, Field, FilterChip, Icon } from '@monarch/design-system'
import { useAccounts } from '../../accounts/AccountsProvider'
import { SectionHeader } from '../../components/SectionHeader'
import { ReceiptCard } from './components/ReceiptCard'
import { AddReceiptsModal } from './components/AddReceiptsModal'
import { ReceiptViewerHost } from './components/ReceiptViewer'
import { capturedToReceipt, type CapturedFile } from './receiptCapture'
import { filterReceipts, groupReceiptsByMonth } from '../../data/derive'
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
 * THE CHIPS ARE DECORATIVE, AND THAT IS STATED RATHER THAN HIDDEN.
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
  const { receipts, transactions, addReceipt } = useAccounts()
  const [search, setSearch] = useState('')

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
    display fallbacks are applied only afterwards, by `capturedToReceipt`.

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
    captured.forEach((capture, i) =>
      addReceipt(capturedToReceipt(capture, links[i] ?? null)),
    )
  }

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
        ALWAYS MOUNTED, AND IT RENDERS NOTHING WHILE IDLE — its toast has to
        outlive the viewer it reports on. See `ReceiptViewerHost`.
      */}
      <ReceiptViewerHost receiptId={viewingId} onClose={closeViewer} />
    </div>
  )
}
