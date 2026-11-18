import { Button, Sheet } from '@monarch/design-system'
import { TransactionMark } from '../../components/TransactionMark'
import { recipientAccountLine } from '../../data/derive'
import { formatMyr } from '../../data/format'
import type { Amount, Recipient, TransferDetails } from '../../data/types'
import { REFERENCE_OPTIONS, optionLabel } from '../../data/newRecipientOptions'
import './transfer.css'

export interface ReviewTransferSheetProps {
  isOpen: boolean
  /** ✕, Escape and the scrim — all return to the amount screen, nothing written. */
  onClose: () => void
  /** "Transfer now": the send itself. */
  onConfirm: () => void
  amount: Amount
  recipient: Recipient
  /** "Main · 6235474597 • MN". */
  fromLabel: string
  newBalance: Amount
  /**
   * Gate 106 (Decision 40 = B): the new-recipient form's reference and note,
   * present only on the first send to the recipient that form just saved.
   */
  details?: TransferDetails
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * "REVIEW TRANSFER" — Gate 93, the confirmation step (Decision 19B; R93-5).
 * UNDRAWN: no frame in either Figma file is a confirmation (Phase A searched
 * every page). Built from this app's own parts.
 *
 * A `Sheet` OVER THE AMOUNT SCREEN, not a page (a `/transfer/review` route could
 * be reloaded with no amount behind it) and not a `Modal` (register G33: no
 * height cap and no scroll region). Every app with a documented flow puts an
 * explicit review between amount and send, and names the act on its button —
 * "Transfer now" is MAE's own wording.
 *
 * FOUR ROWS, IN THIS ORDER: the amount, To, From, the new balance. No "Type"
 * row — real review screens show who, from where and what is left, not a
 * bookkeeping category. Nothing here is editable: editing is the amount screen
 * underneath, one ✕ away.
 *
 * GATE 106 (Decision 40 = B; UNDRAWN): on the FIRST send to a recipient the
 * new-recipient form just saved, two more rows sit between From and the new
 * balance — "Recipient Reference" (always, the form's preset) and "Other Payment
 * Details" (only when something was typed). Between From and the balance because
 * they describe this transfer, like To and From, and the balance is its
 * consequence. Never "Reference": that label is Monarch's own `MNRC…` bank
 * reference on the detail sheet. A long note WRAPS — it is never truncated, so
 * what the payee will see is what the payer reads here.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ReviewTransferSheet({
  isOpen,
  onClose,
  onConfirm,
  amount,
  recipient,
  fromLabel,
  newBalance,
  details,
}: ReviewTransferSheetProps) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Review transfer"
      actions={<Button variant="primary" size="l" label="Transfer now" onClick={onConfirm} />}
    >
      <div className="mvp-review">
        <p className="mvp-review__amount type-header-h5">{formatMyr(amount)}</p>
        <dl className="mvp-review__rows">
          <div className="mvp-review__row">
            <dt className="type-body-sm">To</dt>
            <dd className="mvp-review__party">
              <TransactionMark mark={recipient.mark} size="l" />
              <span className="mvp-review__party-text">
                <span className="type-body-m-semibold">{recipient.name}</span>
                <span className="mvp-review__sub type-body-sm">{recipientAccountLine(recipient)}</span>
              </span>
            </dd>
          </div>
          <div className="mvp-review__row">
            <dt className="type-body-sm">From</dt>
            <dd className="type-body-m-medium">{fromLabel}</dd>
          </div>
          {details && (
            <div className="mvp-review__row mvp-review__row--text">
              <dt className="type-body-sm">Recipient Reference</dt>
              <dd className="mvp-review__note type-body-m-medium">
                {optionLabel(REFERENCE_OPTIONS, details.recipientReference)}
              </dd>
            </div>
          )}
          {details?.otherPaymentDetails && (
            <div className="mvp-review__row mvp-review__row--text">
              <dt className="type-body-sm">Other Payment Details</dt>
              <dd className="mvp-review__note type-body-m-medium">{details.otherPaymentDetails}</dd>
            </div>
          )}
          <div className="mvp-review__row">
            <dt className="type-body-sm">Your new balance</dt>
            <dd className="type-body-m-semibold">{formatMyr(newBalance)}</dd>
          </div>
        </dl>
      </div>
    </Sheet>
  )
}
