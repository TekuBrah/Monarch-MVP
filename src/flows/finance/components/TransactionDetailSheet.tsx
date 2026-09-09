import { Button, Chips, Divider, Icon, Sheet } from '@monarch/design-system'
import type { IconName } from '@monarch/design-system'
import { CRYPTO_WALLETS } from '../../../data/accounts'
import { HOLDINGS } from '../../../data/holdings'
import { TransactionMark } from '../../../components/TransactionMark'
import { receiptUrl } from '../../../config/media'
import {
  receiptSubtotal,
  transactionAccount,
  transactionCategory,
} from '../../../data/derive'
import { formatMyr, formatSignedMyr, formatTimestamp } from '../../../data/format'
import type { Receipt, Transaction } from '../../../data/types'

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
 * WHAT IS INERT AT GATE 49, STATED SO NOTHING READS AS BROKEN:
 *
 *   "Add Receipt"    — the capture action sheet is Gate 50. Wired to NOTHING.
 *   "View"           — the full-screen receipt viewer is Gate 51. Wired to NOTHING.
 *   "Unlink receipt" — FUNCTIONAL. See `ReceiptBlock`.
 *
 * Both inert controls are real `Button`s carrying real labels, for the reason
 * Gate 41 left the filter trigger in place: the gate that wires them replaces a
 * handler rather than rebuilding the markup.
 */
export interface TransactionDetailSheetProps {
  transaction: Transaction
  /** The linked receipt, or `undefined` — which IS the state distinction. */
  receipt?: Receipt
  onUnlink: (receiptId: string) => void
  onClose: () => void
}

export function TransactionDetailSheet({
  transaction,
  receipt,
  onUnlink,
  onClose,
}: TransactionDetailSheetProps) {
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

      {receipt ? (
        <ReceiptBlock receipt={receipt} onUnlink={() => onUnlink(receipt.id)} />
      ) : (
        <PromptBlock />
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
  icon: IconName
  label: string
  value: string
}) {
  return (
    <div className="mvp-txn-detail__row">
      <dt className="mvp-txn-detail__row-label type-body-m-medium">
        <Icon name={icon} size="m" />
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
function PromptBlock() {
  return (
    <div className="mvp-txn-detail__prompt">
      <p className="mvp-txn-detail__prompt-title type-body-m-semibold">
        Add a receipt to track what you bought
      </p>
      <p className="mvp-txn-detail__prompt-body type-body-sm">
        This helps Monarch find savings on things you buy often.
      </p>
      <Button variant="primary" label="Add Receipt" />
    </div>
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
}: {
  receipt: Receipt
  onUnlink: () => void
}) {
  const subtotal = receiptSubtotal(receipt)

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
          src={receiptUrl(receipt.filename)}
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
        <span className="type-body-sm">{formatMyr(subtotal)}</span>
      </div>

      {/*
        NO TAX ROW WHERE THE PAPER PRINTS NO TAX LINE. `receipt-aia01` is the one
        insurance receipt — one premium, one total, no SST — so it carries
        `tax: null` and this row is absent rather than showing "RM 0.00", which
        would assert a zero the receipt does not.
      */}
      {receipt.tax !== null && (
        <>
          <Divider />
          <div className="mvp-txn-detail__total-row">
            <span className="type-body-sm">Sales Tax (6% SST)</span>
            <span className="type-body-sm">{formatMyr(receipt.tax)}</span>
          </div>
        </>
      )}

      <Divider />

      <div className="mvp-txn-detail__total-row mvp-txn-detail__total-row--grand">
        <span className="type-body-sm-semibold">
          Total{' '}
          <span className="mvp-txn-detail__total-note type-body-sm">Incl 6% SST</span>
        </span>
        <span className="type-body-sm-semibold">{formatMyr(receipt.total)}</span>
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
