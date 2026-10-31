import { Button, Sheet } from '@monarch/design-system'
import { TransactionMark } from '../../components/TransactionMark'
import { recipientAccountLine } from '../../data/derive'
import { formatMyr } from '../../data/format'
import type { Amount, Recipient } from '../../data/types'
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
          <div className="mvp-review__row">
            <dt className="type-body-sm">Your new balance</dt>
            <dd className="type-body-m-semibold">{formatMyr(newBalance)}</dd>
          </div>
        </dl>
      </div>
    </Sheet>
  )
}
