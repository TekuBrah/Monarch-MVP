import { useId } from 'react'
import { Chips, Divider, Icon, ListItem } from '@monarch/design-system'
import { receiptImageUrl } from '../../../config/media'
import { TransactionMark } from '../../../components/TransactionMark'
import { formatSignedMyr, formatTimestamp } from '../../../data/format'
import type { Receipt, Transaction } from '../../../data/types'

/**
 * Figma `Item/receipts` — one captured receipt, in both of its variants.
 *
 * COMPOSITION, NOT A PRIMITIVE (rule 4). Every visual here is a DS export —
 * `Chips` for the Linked pill, `Divider` for the two rules, `Icon` for the link
 * glyph, `ListItem` for the paired transaction — and this file supplies layout
 * and nothing else. It defines no appearance the DS could own.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TWO VARIANTS ARE ONE COMPONENT DRIVEN BY THE DATA, NOT A `variant` PROP.
 *
 * Figma models `Linked=Yes` / `Linked=No` as a boolean property because a Figma
 * component has no data behind it. Here the question is already answered by
 * `Receipt.transactionId`: a linked receipt HAS one and an unlinked receipt does
 * not, so a prop would be a second statement of the same fact that a call site
 * could get wrong. `transaction` is passed in rather than looked up because this
 * component does not read context — the screen owns the join.
 *
 * A LINKED RECEIPT WHOSE TRANSACTION IS MISSING RENDERS AS UNLINKED, which is
 * the honest failure: it is a dangling id, and drawing a "Linked" badge over a
 * row that is not there would assert something false.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CARD IS A BUTTON AS OF GATE 51 — tapping it opens the receipt viewer.
 *
 * A REAL `<button>`, NOT A `role` ON THE OLD `<article>`, for the reason
 * `ListItem` gives when it takes `onClick`: a real button is focusable, Enter-
 * and Space-activated and announced already, with no keydown handler written
 * here. Its block-level children are the same shape the DS already ships inside
 * `ListItem`'s own `<button>` branch.
 *
 * NO INTERACTIVE ELEMENT NESTS INSIDE IT, ESTABLISHED FROM SOURCE. `Chips`
 * renders a `<div>` around a `<span>` (`Chips.tsx:25-27`), and the nested
 * `ListItem` renders a `<div>` because it is given no `onClick`
 * (`ListItem.tsx:114-122`). The only interactive node in the card is the card.
 *
 * ITS ACCESSIBLE NAME IS THE FILE NAME, NOT ALL OF ITS TEXT. Computed from
 * content it would read the name, the date, "Linked" and the whole transaction
 * row in one breath. `aria-labelledby` names it by the file — which is also the
 * title of the dialog it opens — and `aria-describedby` adds the capture date.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TRANSACTION ROW IS THE SHIPPED `ListItem` AT FULL SIZE. RULED, NOT CHOSEN.
 *
 * Figma draws a DETACHED lookalike inside this card: 36 tall, a 32px mark, 14px
 * at weight 500 — not a `ListItem` instance. It is not reproduced. The shipped
 * component renders at 44 with a 40px mark, exactly as `TransactionsLedger`
 * renders it, and the card grows to absorb the difference.
 *
 * THREE THINGS THAT WOULD EACH HAVE MATCHED THE MOCKUP AND ARE ALL FORBIDDEN
 * HERE — a `density` prop on the DS component (a new API for one call site), an
 * MVP rule reaching into `.mn-item` internals (equal-specificity override on DS
 * geometry, which Gate 13 removed on measurement), and a local copy of
 * `ListItem` (rule 1, outright). If the compact row is genuinely wanted it is a
 * DS conversation, not an MVP one.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DIVIDER ROW IS TWO `Divider`s FLANKING A GLYPH, AND THE ROTATION IS NOT
 * REPRODUCED. Figma draws the two rules rotated to 145.5 wide; here they are
 * ordinary horizontal rules that flex to fill whatever the card leaves them.
 * The rotation in the file is how a fixed-width rule gets centred in a fixed
 * frame — it is a Figma construction artifact, not a visual. A flex row
 * reproduces the drawn result and survives a viewport change; a rotated fixed
 * width does neither.
 */
export function ReceiptCard({
  receipt,
  transaction,
  onOpen,
}: {
  receipt: Receipt
  /**
   * The linked transaction, when there is one. The SCREEN resolves this from
   * `receipt.transactionId`; passing it keeps this component free of context.
   */
  transaction?: Transaction
  /** Open the receipt viewer on this receipt. Gate 51. */
  onOpen: () => void
}) {
  const isLinked = receipt.transactionId !== null && transaction !== undefined
  const nameId = useId()
  const dateId = useId()

  return (
    <button
      type="button"
      className="mvp-receipt-card"
      onClick={onOpen}
      aria-labelledby={nameId}
      aria-describedby={dateId}
    >
      <div className="mvp-receipt-card__head">
        {/*
          `alt=""` AND NOT A DESCRIPTION, DELIBERATELY. The filename beside it is
          the accessible name of this card, and a thumbnail of a receipt whose
          own text is unreadable at 48px adds nothing a screen reader can use.
          It is decoration for the label next to it.
        */}
        <img
          className="mvp-receipt-card__thumb"
          src={receiptImageUrl(receipt)}
          alt=""
        />
        <div className="mvp-receipt-card__meta">
          <span id={nameId} className="mvp-receipt-card__name type-body-sm-semibold">
            {receipt.displayName}
          </span>
          <span id={dateId} className="mvp-receipt-card__date type-body-caption">
            {formatTimestamp(receipt.capturedAt)}
          </span>
        </div>
        {isLinked && (
          /*
            `appearance="success"` + `isBold` IS FIGMA'S PILL EXACTLY, verified
            against the DS rather than matched by eye: `.mn-chips--success.mn-chips--bold`
            binds `--alias-success-400` -> `--brand-green-400` = #60c680, which is
            Figma's Green/400, over `--mapped-text-success-on-color` = white. The
            leading `done` checkmark is the component's own default.
          */
          <Chips label="Linked" appearance="success" isBold />
        )}
      </div>

      {isLinked && (
        <>
          <div className="mvp-receipt-card__rule" aria-hidden="true">
            <Divider />
            <Icon name="link" size="s" />
            <Divider />
          </div>
          {/*
            THE SAME PROPS `TransactionsLedger` PASSES, with the receipt glyph
            SUPPRESSED. A receipt icon on a row being shown INSIDE its own
            receipt would restate the card it sits in.

            `hasReceiptIcon={false}` IS EXPLICIT AND HAS TO BE. The DS defaults
            it to TRUE (`ListItem.tsx:51`), so OMITTING the prop draws the glyph —
            measured in the browser, not assumed: the first render of this card
            showed a `receipt_long` mark before the amount on every linked row.
            This is the same defaulted-slot trap `SectionHeader` records for
            `Link`, where omitting `iconBefore` rendered an `open_in_new` glyph
            nobody asked for; a default parameter fires on `undefined`, and
            "I did not pass it" is `undefined`.

            NO `onClick`, AND THAT IS WHAT KEEPS IT A `<div>`. Passed one, the DS
            renders a `<button>` — which would nest a button inside this card's.
          */}
          <ListItem
            type="default"
            leading={<TransactionMark mark={transaction.logo} size="m" />}
            title={transaction.merchant}
            titleInfo={transaction.method}
            amount={formatSignedMyr(transaction.amount)}
            amountInfo={formatTimestamp(transaction.occurredAt)}
            hasReceiptIcon={false}
          />
        </>
      )}
    </button>
  )
}
