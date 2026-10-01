import { Button, Chips, Divider, Icon, InlineMessage, Sheet } from '@monarch/design-system'
import type { IconName } from '@monarch/design-system'
import { CRYPTO_WALLETS } from '../../../data/accounts'
import { HOLDINGS } from '../../../data/holdings'
import { TransactionMark } from '../../../components/TransactionMark'
import { receiptImageUrl } from '../../../config/media'
import { CapturingBlock } from './CapturingBlock'
import { advisoryBody, advisoryTitle, isPdfCapture, retakeLabel } from '../advisoryCopy'
import {
  contributionSourceLabel,
  goalSavedAfter,
  movementParties,
  receiptReadFailed,
  receiptSubtotalRead,
  receiptTaxRead,
  receiptTotalRead,
  transactionAccount,
  transactionCategory,
  transactionDisposition,
} from '../../../data/derive'
import {
  formatMyr,
  formatMyrOrUnread,
  formatSignedMyr,
  formatTimestamp,
} from '../../../data/format'
import type {
  Goal,
  Receipt,
  Transaction,
  TransactionDisposition,
} from '../../../data/types'

/**
 * The transaction detail sheet — Flow 9's core loop, in both its states.
 *
 * Figma `Finance_Transactions_Transaction details` (`1266:14278`, 375×812) is
 * the NO-RECEIPT state and `Finance_Transactions_Receipt added` (`1266:14279`,
 * 375×966) is the LINKED one. They are ONE component and one overlay: the
 * receipt block replaces the prompt block and nothing else about the sheet
 * changes, which is what the two frames actually differ by.
 *
 * COMPOSITION, NOT A PRIMITIVE (rule 4). Every control is a DS export — `Sheet`,
 * `Button`, `Chips`, `Divider`, `Icon` — plus this repo's own `TransactionMark`.
 * The stylesheet is layout rules in `finance.css` and owns no appearance the DS
 * could own.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT IS AN OVERLAY, NOT A ROUTE, AND THAT IS A READING OF THE FILE RATHER THAN
 * A CONVENIENCE. Figma draws both frames with the Transactions ledger fully
 * rendered BEHIND a Blanket — tabs, search field, chip row, nine rows and the
 * navbar all present. A route would replace that; a sheet is what the mockup
 * draws. It follows Gate 43's filter sheet exactly: enumerated `OVERLAY_STATES`
 * entries, no router change, no tab change.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE PANEL IS CAPPED AT THE VIEWPORT AND THE CONTENT SCROLLS, BY RULING.
 *
 * Figma's linked frame is 966 TALL — panel at y=69, height 897, with the home
 * indicator travelling down to y=941 while the Blanket stays 812 (register S2).
 * That is a drawing convention for "this is taller than one screen", not a spec
 * for a 966px phone, and 897 of panel cannot be shown on an 812 viewport.
 *
 * NO CSS WAS WRITTEN FOR IT. `Sheet` already caps its panel at
 * `calc(100dvh - var(--brand-scale-1100))` and already makes `.mn-sheet__content`
 * the one scrolling region — so the DEFAULT `sizing="hug"` gives the short state
 * its natural height and the linked state the cap, with no prop and no override.
 * `sizing="fill"` would have forced the SHORT state to the cap as well, which is
 * the opposite of what Figma draws.
 *
 * NO VISIBLE SCROLLBAR ANYWHERE — the standing rule, satisfied twice over:
 * `src/index.css` declares it on `*` (Gate 44) and `Sheet.css` declares it again
 * on its own content region. Scrolling BEHAVIOUR is untouched.
 *
 * G14 IS OPEN AND IS NOT FIXED HERE. `Sheet` does not lock background scroll, so
 * the ledger behind this still scrolls. Deferred deliberately: `overflow: hidden`
 * on `<body>` interacts with the full-page screenshot harness, and the fix is
 * DS-side in any case.
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS INERT — NOTHING, AS OF GATE 51:
 *
 *   "Add Receipt"    — FUNCTIONAL since Gate 50. Opens `ReceiptSourcePicker`.
 *   "View"           — FUNCTIONAL since Gate 51. Closes this sheet and opens
 *                      the receipt viewer on this transaction's receipt.
 *   "Unlink receipt" — FUNCTIONAL since Gate 49. See `ReceiptBlock`.
 *
 * THE PREDICTION GATE 49 MADE ABOUT THIS HELD TWICE: it left "Add Receipt" and
 * "View" as real `Button`s with real labels precisely so that later gates would
 * replace a HANDLER rather than the markup, and that is all Gates 50 and 51 did
 * — one `onClick` each, no change to the element, its label or its position.
 * The same bet Gate 41 made on the filter trigger and Gate 43 collected on.
 *
 * "View" SWAPS, IT DOES NOT STACK (Gate 51 ruling 7). One surface at a time:
 * the ledger closes this sheet and opens the viewer in the same update, and
 * closing the viewer returns to the ledger, not to this sheet.
 */
export interface TransactionDetailSheetProps {
  transaction: Transaction
  /** The linked receipt, or `undefined` — which IS the state distinction. */
  receipt?: Receipt
  onUnlink: (receiptId: string) => void
  /**
   * Open the receipt viewer on the linked receipt. Gate 51.
   *
   * THE CALLER SWAPS, THIS SHEET DOES NOT: the ledger closes this sheet and
   * opens the viewer in one update, so the two are never stacked (ruling 7).
   */
  onView: (receiptId: string) => void
  /**
   * Open the capture source picker. Gate 50.
   *
   * THIS GATE REPLACED A HANDLER, NOT THE MARKUP — which is exactly what Gate 49
   * left it in place for, and what Gate 41 did for the filter trigger before
   * that. The "Add Receipt" button, its label and its position are unchanged.
   */
  onAddReceipt: () => void
  /**
   * TRUE while extraction has not answered for this transaction's capture.
   *
   * The prompt block is replaced by the processing block IN PLACE: the sheet
   * does not close, no second surface opens, and the summary and info rows above
   * and below it do not move. The state lives in `TransactionsLedger` beside the
   * selected row, not here, because this component is rendered from data and
   * holds none of its own.
   */
  isCapturing: boolean
  /**
   * Retake the linked receipt's photograph — Gate 60, reshaped at Gate 61.
   * Offered only when that receipt's reading failed (`receiptReadFailed`).
   * IT REPLACES: the new photograph's receipt takes this transaction's link and
   * the original leaves the library. This line said "what it leaves alone",
   * which was Gate 60's shape. See `useReceiptRetake`.
   */
  onRetake: (receipt: Receipt) => void
  /**
   * The savings goals, for a contribution row — Gate 79.
   *
   * THE COLLECTION AND NOT A RESOLVED GOAL, which is a departure from the
   * `receipt?: Receipt` prop two fields up, and the reason is that a goal's
   * figures MOVE. `Goal.savedAmount` is provider state as of Gate 76 and
   * Gate 81 adds the writers, so a goal resolved once by the caller would
   * describe the pre-Top-Up world behind an open sheet — exactly what Gate 49
   * avoided by holding the selected row as an ID and re-resolving every
   * render. A receipt's identity, by contrast, is all this sheet needs of it.
   */
  goals: Goal[]
  /**
   * The whole ledger, for the progress line — Gate 79.
   *
   * `goalSavedAfter` WALKS BACKWARDS FROM THE STORED TOTAL over every later
   * contribution, so it genuinely needs the series and not just this row. The
   * alternative was for `TransactionsLedger` to compute the figure and pass a
   * number, which would put a derivation in a screen rather than in
   * `derive.ts` — and would make it untestable in Node, which is where the
   * 28-row series is actually proved.
   */
  transactions: Transaction[]
  onClose: () => void
}

export function TransactionDetailSheet({
  transaction,
  receipt,
  onUnlink,
  onView,
  onAddReceipt,
  isCapturing,
  onRetake,
  goals,
  transactions,
  onClose,
}: TransactionDetailSheetProps) {
  /*
    WHAT THIS ROW IS, DERIVED — Gate 79. `transactionDisposition` reads `kind`
    and the sign of `amount`, in that order, and nothing is stored. It is
    computed once here and passed down rather than re-derived inside the body,
    so the branch and the block cannot disagree about which one is rendering.
  */
  const disposition = transactionDisposition(transaction)
  const category = transactionCategory(transaction.category)
  const account = transactionAccount(HOLDINGS, CRYPTO_WALLETS, transaction.accountId)

  return (
    <Sheet
      isOpen
      onClose={onClose}
      /*
        HUG — the default, written out anyway. See the header: the panel's own
        cap does the tall state's work, and 'fill' would wreck the short one.
        Stating it is cheaper than a future reader re-deriving why the prop is
        absent from a sheet whose sibling passes it.
      */
      sizing="hug"
      title="Transaction details"
      /*
        THE ✕ STAYS, UNLIKE THE FILTER SHEET, and both readings come from the
        same node type. `1021:13772` — this sheet's header — draws a 24×24
        element at x=335; the filter sheet's header draws none, which is why
        Gate 43 passed `showCloseButton={false}` and this does not. They simply
        differ in the file.
      */
    >
      {/*
        ── THE SUMMARY ─────────────────────────────────────────────────────
        Figma Frame 529 (343×124): a 56×56 round mark, `header/h6` merchant on
        `text/default/default`, `body/m` method on `text/subtle/default`, then a
        `surface/subtlest` box carrying the amount at `header/h5`.

        THE MARK IS `TransactionMark`, THE COMPONENT EVERY OTHER SURFACE USES.
        Its `size` steps to 'l' because Figma's mark is 56 where the ledger
        row's is 40 — one prop, not a second component.
      */}
      <div className="mvp-txn-detail__summary">
        <div className="mvp-txn-detail__identity">
          <TransactionMark mark={transaction.logo} size="l" />
          <div className="mvp-txn-detail__names">
            <span className="mvp-txn-detail__merchant type-header-h6">
              {transaction.merchant}
            </span>
            <span className="mvp-txn-detail__method type-body-m">
              {transaction.method}
            </span>
          </div>
        </div>
        <div className="mvp-txn-detail__amount-box">
          <span className="mvp-txn-detail__amount type-header-h5">
            {formatSignedMyr(transaction.amount)}
          </span>
        </div>
      </div>

      {/*
        ── THE BODY IS THREE-WAY ON DISPOSITION — GATE 79 ─────────────────────

        A PURCHASE KEEPS EXACTLY WHAT IT HAD: the receipt loop, then the
        Transaction info section. Not one line of either moved, which is why the
        six purchase baselines were predicted not to change and did not.

        A TRANSFER OR AN INCOME ROW GETS `MovementSummary` INSTEAD, AND THAT
        REPLACES BOTH — the receipt loop AND Transaction info. Replacing only the
        receipt loop would print Date twice (the summary carries it, and so does
        Transaction info) and would keep two rows that mean nothing on a movement:
        Category is `others` on all 33 seeded transfers, a filler that makes the
        record valid and nothing more, and Payment Method names the INSTITUTION
        ("Monarch Bank") where From names the ACCOUNT ("Main") — the same fact told
        worse. Suppressing the section is this gate's own call on undesigned work,
        and it is stated rather than implied: Figma draws no transfer frame at all.

        `isCapturing` CANNOT BE TRUE FOR A MOVEMENT, by construction rather than
        by assertion — the only path into a capture is "Add Receipt", which only
        `PromptBlock` offers, which only a purchase renders.
      */}
      {disposition === 'purchase' ? (
        <>
        {/*
          THREE-WAY, AND THE ORDER MATTERS. Capturing is checked FIRST because it
          is a state either of the other two can be in the middle of: the user can
          capture from the prompt block, and since Gate 61 they can replace one
          from the linked block — the retake, which is the later gate this note
          anticipated. Checking `receipt` first would leave the prompt on screen
          while a capture from the prompt block ran, and would leave the OLD
          receipt on screen while its replacement was being read.
        */}
        {isCapturing ? (
          <CapturingBlock count={1} />
        ) : receipt ? (
          <ReceiptBlock
            receipt={receipt}
            onUnlink={() => onUnlink(receipt.id)}
            onView={() => onView(receipt.id)}
            onRetake={() => onRetake(receipt)}
          />
        ) : (
          <PromptBlock onAddReceipt={onAddReceipt} />
        )}

        {/*
          ── TRANSACTION INFO ────────────────────────────────────────────────
          Three label/value rows under a heading. Figma names each row
          `list/chart legend`, but they are FRAMES, not instances of the DS
          `ChartLegendItem` — and the difference is load-bearing rather than
          pedantic. `ChartLegendItem` wraps its glyph in an `IconObject` badge (a
          tinted tile, 12px gap) and paints its title `--mapped-text-default-default`;
          these rows draw a BARE 20px glyph at `icon/subtle/default` beside a
          `text/subtle/default` label, and the node's bound variables contain no
          surface token at all. Using the DS component would add a badge the design
          does not draw, so this is composition: a label/value row is a layout,
          not a primitive.

          The register already asks the DS-side question as S4 — `list/chart legend`
          has been repurposed as key-value metadata four times across this file and
          has never once been an actual chart legend.
        */}
        <section className="mvp-txn-detail__info">
          <h3 className="mvp-txn-detail__info-heading type-body-m-semibold">
            Transaction info
          </h3>
          <dl className="mvp-txn-detail__rows">
            {/*
              ── THE THREE GLYPHS ARE ONE GRAMMAR, AND THE GRAMMAR IS "FIELD" ──

              A calendar, a list, a card. Each names the FIELD its row is about,
              never the VALUE in the row's right-hand column — so the Category row
              draws a list whatever the category is, and the Payment Method row
              draws a card whatever the institution is.

              Gates 41-49 shipped the second and third rows drawing the VALUE'S own
              glyph (`TRANSACTION_CATEGORIES[].icon`, the holding's `icon`) because
              the DS registry carried neither `list_alt` nor `credit_card` — that
              was a derivation from data rather than a near-miss substitution, which
              is what G16's ruling forbids, and it was the right call while the
              glyphs did not exist. DS v2.3.0 ships both (register G26, G27, both
              closed) and the rows are now as drawn.

              THE PATTERN THE DATE ROW SET IS WHAT THESE TWO NOW FOLLOW: a literal
              glyph naming the field, not an expression reading the record. Do not
              reintroduce value glyphs — a shopping cart beside "Category" breaks
              the pattern the calendar establishes one row above.
            */}
            <InfoRow
              icon="calendar_today"
              label="Date"
              value={formatTimestamp(transaction.occurredAt)}
            />
            {category && (
              <InfoRow icon="list_alt" label="Category" value={category.label} />
            )}
            {/*
              PAYMENT METHOD — Figma prints "Monarch Trust", a name that exists
              nowhere in this app's data; `transactionAccount` derives the real
              institution instead of transcribing one the rest of the app would
              contradict. That divergence is unchanged; only the glyph moved.
            */}
            {account && (
              <InfoRow icon="credit_card" label="Payment Method" value={account.label} />
            )}
          </dl>
        </section>
        </>
      ) : (
        <MovementSummary
          transaction={transaction}
          disposition={disposition}
          goals={goals}
          transactions={transactions}
        />
      )}
    </Sheet>
  )
}

/**
 * One label/value row. `<dt>`/`<dd>` inside a `<dl>` rather than two spans,
 * because that is what these are: three terms and their definitions.
 *
 * THE GLYPH NEEDS NO `aria-hidden` HERE — the DS `Icon` puts it on every SVG it
 * renders, so the row announces "Date, 15 Sept, 22:03" and not a stray graphic.
 * Stated because its absence looks like an omission.
 */
function InfoRow({
  icon,
  label,
  value,
}: {
  /**
   * OPTIONAL SINCE GATE 79, and absent on every `MovementSummary` row.
   *
   * THE PURCHASE ROWS' THREE GLYPHS ARE A GRAMMAR — a calendar, a list, a
   * card, each naming the FIELD its row is about (see the call sites). A
   * movement has five rows and the registry offers no comparable set for
   * From, To, Type and Reference, so extending the grammar would mean
   * inventing four glyphs with no drawn authority. Giving ONE of the five a
   * glyph would be worse than giving none.
   *
   * THE TWO ROW SETS ARE NEVER ON SCREEN TOGETHER, which is what makes that
   * safe rather than inconsistent: a purchase renders Transaction info and a
   * movement renders this summary, and the body is three-way on disposition.
   */
  icon?: IconName
  label: string
  value: string
}) {
  return (
    <div className="mvp-txn-detail__row">
      <dt className="mvp-txn-detail__row-label type-body-m-medium">
        {icon && <Icon name={icon} size="m" />}
        {label}
      </dt>
      <dd className="mvp-txn-detail__row-value type-body-m-medium">{value}</dd>
    </div>
  )
}

/**
 * THE NO-RECEIPT STATE'S PROMPT. Figma Frame 526 (343×144): a `surface/subtlest`
 * card holding a `body/m-semibold` line, a `body/sm` subline and a full-width
 * primary button.
 *
 * "Add Receipt" IS WIRED TO NOTHING AND SAYS SO. The capture action sheet is
 * Gate 50 — register G2, the only fully uncomponentised interactive surface in
 * the five flows, so it is a real piece of work rather than a handler. A real
 * `Button` with no handler is what Gate 41 left for the filter trigger, and that
 * gate replaced a handler rather than the markup.
 */
function PromptBlock({ onAddReceipt }: { onAddReceipt: () => void }) {
  return (
    <div className="mvp-txn-detail__prompt">
      <p className="mvp-txn-detail__prompt-title type-body-m-semibold">
        Add a receipt to track what you bought
      </p>
      <p className="mvp-txn-detail__prompt-body type-body-sm">
        This helps Monarch find savings on things you buy often.
      </p>
      {/*
        WIRED AT GATE 50. `Button` passes `onClick` straight through to the
        `<button>` and changes no class and no attribute when it is absent, so
        adding the handler is provably inert visually — which is why the four
        `detail` baselines were predicted not to move, and did not.
      */}
      <Button variant="primary" label="Add Receipt" onClick={onAddReceipt} />
    </div>
  )
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT A MOVEMENT OF MONEY SAYS INSTEAD OF A RECEIPT — Gate 79.
 *
 * ⚠ NOTHING IN FIGMA DRAWS THIS. Confirmed by MCP at Gate 79, not asserted:
 * section `1266:14277` ("Receipt add and link") enumerates eight frames and both
 * detail frames are the PURCHASE shape, and Flow 8's own section `1266:14327`
 * holds three frames, none of them a detail. So this is the undesigned-work
 * ruling (Teku, 21 Sept): what he designed is followed exactly, what he did not
 * follows Claude's judgement. The row set is grounded in what real transfer-detail
 * screens consistently show rather than invented from nothing.
 *
 * ONE COMPONENT SERVES BOTH A TRANSFER AND INCOME, because they are the same
 * layout over the same record with a different row set — and the row set is
 * DERIVED from the row rather than branched on by the caller. Two components
 * would be two copies of one `<dl>` whose only difference is two conditional
 * rows.
 *
 * THE ROWS REUSE `InfoRow` AND THE `__rows` / `__row` CLASSES the Transaction
 * info section already owns. A label/value row is a layout, not a primitive, and
 * this is the same layout — so no CSS was written for the rows themselves.
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY EACH ROW IS HERE, AND WHY THE TWO OPTIONAL ONES ARE OMITTED RATHER THAN
 * PLACEHOLDERED:
 *
 *   From / To    the two sides of the move. `movementParties` decides which side
 *                is the user's own account FROM THE SIGN, because the sign in
 *                this ledger is relative to `accountId`.
 *   Date         the full timestamp, through the one formatter. A purchase prints
 *                this in Transaction info; a movement prints it here, and the
 *                section this replaces is why it appears once rather than twice.
 *   Type         the contribution's own `contributionSource`, through
 *                `contributionSourceLabel` — the LABEL, never the stored
 *                `'automatic' | 'manual'` id. OMITTED ENTIRELY when the field is
 *                absent, which is every transfer that is not a contribution: a
 *                row reading "Type —" asserts that the field exists and was not
 *                read, which is false. The em dash is `UNREAD_FIGURE`'s job and
 *                this is not that case.
 *   Reference    the transaction id, VERBATIM — see below.
 *
 * ⚠ THE REFERENCE IS PRINTED AS STORED, AND THE BRIEF ASKED FOR IT "FORMATTED
 * FOR READING". It is `txn-bali-c16`, an internal slug, and every transform
 * available (upper-casing it, stripping the `txn-` prefix, regrouping it) dresses
 * a slug as a reference number without making it one. This repo's rule is one
 * formatter per shape and no invented formats — the same call already made on
 * two-decimal money against Figma's "RM 700" and on the padded day against its
 * "next on 1 Oct". Flagged for Teku rather than decided silently: if a real
 * reference format is wanted it belongs on the record, not in a display helper.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BUDGETS LINE EXISTS BECAUSE ITS ABSENCE LOOKS LIKE A BUG. A user who has
 * set a budget and then moved RM 250 into a savings goal will look for that 250
 * in the budget and not find it. `countsToward` rejects this row on its FIRST
 * clause for a transfer (`kind !== 'payment'`) and on its SECOND for income
 * (`amount >= 0`) — so the line is true of both dispositions, and that was
 * verified against that function rather than assumed. It is `text/subtle`, which
 * is what `__row-label` already uses on this surface, because it is an
 * explanation rather than a figure.
 *
 * THE PROGRESS LINE IS A FIGURE, SO IT IS NOT SUBTLE. It prints at
 * `text/default/default` to read as data rather than as a second disclaimer, and
 * it renders only when the goal resolves AND the row is one of its contributions
 * — `goalSavedAfter` returns undefined otherwise, which is also what happens if a
 * `goalId` names a goal that is gone.
 */
function MovementSummary({
  transaction,
  disposition,
  goals,
  transactions,
}: {
  transaction: Transaction
  disposition: TransactionDisposition
  goals: Goal[]
  transactions: Transaction[]
}) {
  const parties = movementParties(transaction, HOLDINGS, CRYPTO_WALLETS, goals)
  const goal =
    transaction.goalId === undefined
      ? undefined
      : goals.find((g) => g.id === transaction.goalId)
  const savedAfter =
    goal === undefined ? undefined : goalSavedAfter(transactions, goal, transaction.id)

  return (
    <section className="mvp-txn-detail__info">
      {/*
        THE HEADING IS "Transaction info" FOR ALL THREE DISPOSITIONS, and that is
        deliberate rather than lazy. It is accurate of a transfer and of income as
        much as of a purchase, it is the heading Figma already draws, and inventing
        "Transfer info" / "Deposit info" would be two new strings for a section
        whose ROWS already say which kind of row it is.
      */}
      <h3 className="mvp-txn-detail__info-heading type-body-m-semibold">
        Transaction info
      </h3>
      <dl className="mvp-txn-detail__rows">
        <InfoRow label="From" value={parties.from} />
        <InfoRow label="To" value={parties.to} />
        <InfoRow label="Date" value={formatTimestamp(transaction.occurredAt)} />
        {transaction.contributionSource && (
          <InfoRow
            label="Type"
            value={contributionSourceLabel(transaction.contributionSource)}
          />
        )}
        <InfoRow label="Reference" value={transaction.id} />
      </dl>
      <p className="mvp-txn-detail__movement-note type-body-sm">
        {disposition === 'transfer'
          ? "Transfers aren't counted in budgets."
          : "Money coming in isn't counted in budgets."}
      </p>
      {goal && savedAfter !== undefined && (
        <p className="mvp-txn-detail__movement-progress type-body-sm">
          {`${goal.name}: ${formatMyr(savedAfter)} of ${formatMyr(goal.targetAmount)} after this`}
        </p>
      )}
    </section>
  )
}

/**
 * THE LINKED STATE'S RECEIPT CARD. Figma Frame 530 (343×392).

 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SUBTOTAL IS DERIVED, AND ON SIX OF THE TEN RECEIPTS IT DOES NOT CLOSE.
 *
 * `receiptSubtotal()` sums the line items; `tax` and `total` are transcribed from
 * what the paper prints. On `receipt-aeonbig01` — the receipt the linked walk
 * state captures — that renders 204.80 + 24.29 against a printed total of
 * 429.19, i.e. RM 200.10 apart, and it is VISIBLE ON SCREEN.
 *
 * THAT IS THE RULING WORKING, NOT FAILING. The alternative was to store each
 * receipt's printed subtotal, which would make the arithmetic close by writing
 * down a number the line items directly beneath it contradict — the same
 * two-sources-for-one-fact shape that killed `Transaction.hasReceipt` at Gate 48.
 * The images are the defect; `receipts.ts` records all six to the cent.
 * ─────────────────────────────────────────────────────────────────────────────
 * "Unlink receipt" CARRIES `link_off`, which DS v2.3.0 added (register G25,
 * closed). It shipped text-only at Gate 49 because the registry then held `link`
 * and no `link_off`, and substituting `link` would have put a glyph on the button
 * stating the OPPOSITE of what it does — worse than no glyph.
 *
 * THE GLYPH IS NOT DECORATION HERE. Read off device photographs, a text-only
 * `variant="tertiary"` Button sitting inside a card reads as a text LINK rather
 * than as an action; the glyph is what makes it register as a button. That is
 * why this waited for the real glyph instead of shipping a near miss.
 *
 * "View" keeps its `visibility` glyph, and this row now matches it exactly:
 * both are `tertiary`/`s` with a `size="m"` leading glyph.
 */
function ReceiptBlock({
  receipt,
  onUnlink,
  onView,
  onRetake,
}: {
  receipt: Receipt
  onUnlink: () => void
  onView: () => void
  onRetake: () => void
}) {
  // GATE 58: a figure that was never read renders an em dash, not "RM 0.00" —
  // see the three `receipt*Read` derivations in `derive.ts`.
  const subtotal = receiptSubtotalRead(receipt)
  const tax = receiptTaxRead(receipt)

  return (
    <div className="mvp-txn-detail__receipt">
      {/*
        THE HEAD ROW IS THE SAME ARRANGEMENT `ReceiptCard` DRAWS on the Receipts
        tab — 48px thumbnail, filename, capture date, "Linked" pill — and it is
        deliberately NOT extracted into a shared component. The two differ in
        what surrounds them (that card carries a divider rule and a nested
        `ListItem`; this one carries an itemisation and two buttons), and a
        shared head would be a component whose entire content is a flex row of
        four things. Extract it if a third site appears.
      */}
      <div className="mvp-txn-detail__receipt-head">
        {/* `alt=""` — decoration for the filename beside it, per `ReceiptCard`. */}
        <img
          className="mvp-txn-detail__receipt-thumb"
          src={receiptImageUrl(receipt)}
          alt=""
        />
        <div className="mvp-txn-detail__receipt-meta">
          <span className="mvp-txn-detail__receipt-name type-body-sm-semibold">
            {receipt.displayName}
          </span>
          <span className="mvp-txn-detail__receipt-date type-body-caption">
            {formatTimestamp(receipt.capturedAt)}
          </span>
        </div>
        {/*
          THE SAME PILL `ReceiptCard` DRAWS: `.mn-chips--success.mn-chips--bold`
          binds `--alias-success-400` -> `--brand-green-400` = #60c680, which is
          Figma's Green/400, over white. The leading `done` checkmark is the
          component's own default.
        */}
        <Chips label="Linked" appearance="success" isBold />
      </div>

      {/*
        GATE 60 — THE ADVISORY, DIRECTLY UNDER THE HEAD ROW. This sheet is where
        a user lands after capturing from a transaction, and the items and totals
        below are exactly what did not come through, so it is said before them.
        UNFRAMED: this card already paints the surface a framed box would, and a
        box on its own ground is invisible (the Gate 52 finding).

        GATE 63: THE DS `InlineMessage`, `tone="warning"`, `isFramed={false}`.
        The card around it already paints `--mapped-surface-subtlest-default`,
        the same fill the framed variant would, so a frame here would be a card
        drawn on an identical ground. Unframed, the warning glyph carries the
        tone on its own. The text colour is the DS's own (Ruling A).
      */}
      {receiptReadFailed(receipt) && (
        <>
          <Divider />
          <InlineMessage
            tone="warning"
            isFramed={false}
            title={advisoryTitle(receipt)}
            actions={
              <Button
                variant="secondary"
                size="m"
                label={retakeLabel(receipt)}
                leadingIcon={
                  isPdfCapture(receipt) ? undefined : <Icon name="photo_camera" size="m" />
                }
                onClick={onRetake}
              />
            }
          >
            {advisoryBody(receipt)}
          </InlineMessage>
        </>
      )}

      <Divider />

      <p className="mvp-txn-detail__items-heading type-body-sm-semibold">Items</p>
      <ul className="mvp-txn-detail__items">
        {receipt.lineItems.map((item) => (
          /*
            KEYED ON THE NAME. Line items have no ids — they are transcription,
            not records — and no delivered receipt repeats a name within itself
            (checked across all ten). The index would be stable too, since this
            list never reorders; the name is used because it says what it
            identifies.
          */
          <li className="mvp-txn-detail__item" key={item.name}>
            <span className="mvp-txn-detail__item-name type-body-sm">
              {'• '}
              {item.name}
            </span>
            <span className="mvp-txn-detail__item-price type-body-sm">
              {formatMyr(item.price)}
            </span>
          </li>
        ))}
      </ul>

      <Divider />

      <div className="mvp-txn-detail__total-row">
        <span className="type-body-sm">Subtotal</span>
        <span className="type-body-sm">{formatMyrOrUnread(subtotal)}</span>
      </div>

      {/*
        NO TAX ROW WHERE THE PAPER PRINTS NO TAX LINE. `receipt-aia01` is the one
        insurance receipt — one premium, one total, no SST — so it carries
        `tax: null` and this row is absent rather than showing "RM 0.00", which
        would assert a zero the receipt does not. A MACHINE-READ receipt whose tax
        was not read keeps the row with an em dash instead (Gate 58) — the engine
        cannot know the line was absent. `receiptTaxRead` decides which.
      */}
      {tax !== 'no-row' && (
        <>
          <Divider />
          <div className="mvp-txn-detail__total-row">
            <span className="type-body-sm">Sales Tax (6% SST)</span>
            <span className="type-body-sm">{formatMyrOrUnread(tax)}</span>
          </div>
        </>
      )}

      <Divider />

      <div className="mvp-txn-detail__total-row mvp-txn-detail__total-row--grand">
        <span className="type-body-sm-semibold">
          Total{' '}
          <span className="mvp-txn-detail__total-note type-body-sm">Incl 6% SST</span>
        </span>
        <span className="type-body-sm-semibold">
          {formatMyrOrUnread(receiptTotalRead(receipt))}
        </span>
      </div>

      {/*
        TWO TERTIARY BUTTONS SIDE BY SIDE. Figma's pair is 154.5×28 each with a
        10px gap inside a 319 row, read off the MAIN COMPONENT (`1046:11273`),
        which binds `text/primary/default` and `icon/primary/default` with no
        surface fill — i.e. `variant="tertiary"` — at `body/sm-semibold` and 28
        tall, i.e. `size="s"` (`.mn-btn--s` is 4px padding around a 20px line box
        = 28 exactly).

        THE WIDTHS ARE NOT TRANSCRIBED. 154.5 is `(319 - 10) / 2`, an artifact of
        a fixed-width frame — the same shape as `ReceiptCard`'s 145.5 dividers.
        `flex: 1 1 0` reproduces it at 375 and survives 430, where a transcribed
        154.5 would be wrong.
      */}
      <div className="mvp-txn-detail__receipt-actions">
        <Button
          variant="tertiary"
          size="s"
          label="View"
          leadingIcon={<Icon name="visibility" size="m" />}
          onClick={onView}
        />
        <Button
          variant="tertiary"
          size="s"
          label="Unlink receipt"
          leadingIcon={<Icon name="link_off" size="m" />}
          onClick={onUnlink}
        />
      </div>
    </div>
  )
}
