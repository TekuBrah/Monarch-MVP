import { useCallback, useState } from 'react'
import { Button, Chips, Icon, ListItem, Modal, ToastMobile } from '@monarch/design-system'
import { useAccounts } from '../../../accounts/AccountsProvider'
import { TransactionMark } from '../../../components/TransactionMark'
import { receiptImageUrl } from '../../../config/media'
import { formatSignedMyr, formatTimestamp } from '../../../data/format'
import type { Receipt, Transaction } from '../../../data/types'
import { fileTypeLabel } from '../receiptCapture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RECEIPT VIEWER — Figma `Finance_Receipts_View receipt` (`1266:14285`),
 * Gate 51.
 *
 * IT IS A `Modal`, NOT A `Sheet`, FOR THE REASON `AddReceiptsModal` ALREADY
 * RECORDS. The inner node is named "Bottom Sheet" (`1044:10853`) and its
 * geometry says otherwise: **343 wide at x=16**, all four corners rounded
 * (`rounded-[border-radius/md]` on every corner, `overflow-clip`), no home
 * indicator, a 64-tall header and a 152-tall footer holding two full-width
 * 48-tall buttons — the SAME frame shape as `1048:10593`, which Gate 50 read as
 * a Modal. Geometry wins; the layer name is the trap, now for the third time in
 * Flow 9. The gate prompt called this surface "a DS `Sheet`"; the file does not.
 *
 * G28 APPLIES UNCHANGED: Figma fixes the header (64) and footer (152) heights
 * and the DS hugs both. Not overridden here, for the reason that entry gives.
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO STATES, DRIVEN BY THE DATA — the same rule `ReceiptCard` follows.
 *
 *   LINKED    as drawn: image, the "Linked" pill, the transaction's row, then
 *             Unlink receipt and Delete receipt.
 *   UNLINKED  NOT DRAWN. Built by ruling (Gate 51 ruling 4): the image and
 *             Delete receipt ONLY. No pill, no row, no Unlink. The rest of that
 *             state — receipt details, Edit, Link to transaction — is Gate 51-B.
 *
 * AFTER UNLINK THE MODAL STAYS OPEN AND FLIPS IN PLACE, because the host
 * resolves the receipt from the live collection on every render; the detail
 * sheet does the same (Gate 49) and for the same reason: the user sees what
 * their click did.
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO DIVERGENCES FROM THE FRAME, BOTH REGISTERED, NEITHER FAKED:
 *
 *  - THE IMAGE WELL HAS NO FILL OF ITS OWN (register G30, `token-gap`). Figma
 *    binds the raw primitive `Gray/900`; no `--mapped-surface-*` token resolves
 *    to it in light, and a raw brand primitive is not written here.
 *  - "Delete receipt" IS PRIMARY BLUE, NOT ERROR RED (register G29,
 *    `prop-gap`). Figma draws it borderless — `variant="tertiary"` — in
 *    `text/error/default` + `icon/error/default`. `ButtonVariant` is
 *    `primary | secondary | tertiary` and has no error appearance.
 */

/**
 * WHETHER A RECEIPT'S BYTES ARE A PDF, FROM ITS FILE NAME — the one fact a
 * `Receipt` carries about its format. A capture keeps the chosen file's own
 * name as `filename` (Gate 50); no seeded receipt is a PDF.
 */
function isPdfReceipt(receipt: Receipt): boolean {
  return fileTypeLabel(receipt.filename) === 'pdf'
}

/** The toast's copy, as ruled (Gate 51 ruling 5). */
const DELETED_TOAST = 'Receipt deleted.'

interface ReceiptViewerProps {
  receipt: Receipt
  transaction?: Transaction
  onUnlink: () => void
  onDelete: () => void
  onClose: () => void
}

function ReceiptViewer({
  receipt,
  transaction,
  onUnlink,
  onDelete,
  onClose,
}: ReceiptViewerProps) {
  // SAME TEST AS `ReceiptCard`: a dangling `transactionId` renders UNLINKED
  // rather than drawing a "Linked" pill over a row that is not there.
  const isLinked = receipt.transactionId !== null && transaction !== undefined

  return (
    <Modal
      isOpen
      onClose={onClose}
      /*
        THE TITLE IS THE CAPTURE'S CAMERA-ROLL NAME, which is what Figma prints
        there ("IMG_4821.jpg") and what the card that opened it prints. Its
        accessible name is therefore the card's too — tapping "IMG_4806.jpg"
        opens a dialog called "IMG_4806.jpg".
      */
      title={receipt.displayName}
      footer={
        <>
          {/*
            SIZE `l` WITH A 24px GLYPH, READ OFF THE FRAME: both buttons are
            `py-[Scale/300]` (12) around a 24px `<element>`, which is `.mn-btn--l`'s
            vertical padding and `Icon size="l"` exactly. The label stays
            `body-sm-semibold` because `Button` fixes it; Figma's is `body/m`.
          */}
          {isLinked && (
            <Button
              variant="secondary"
              size="l"
              label="Unlink receipt"
              leadingIcon={<Icon name="link_off" size="l" />}
              onClick={onUnlink}
            />
          )}
          <Button
            variant="tertiary"
            size="l"
            label="Delete receipt"
            leadingIcon={<Icon name="delete" size="l" />}
            onClick={onDelete}
          />
        </>
      }
    >
      {/*
        THE WELL IS FIGMA'S 756/1008 BOX — exactly 3:4 — AT THE CONTENT
        COLUMN'S WIDTH (311 at 375, as drawn). `object-fit: contain`, NOT the
        file's `cover`: Figma's sample photo is itself 3:4, so cover and contain
        are the same picture there, but the ten delivered receipts are ~0.56
        (292x525 for `receipt_aeonbig01`), and cover would crop the top and
        bottom off every one of them. A viewer that crops the receipt it exists
        to show is not a viewer.
      */}
      <div className="mvp-receipt-viewer__well">
        {isPdfReceipt(receipt) ? (
          /*
            A PDF CAPTURE — NOT DRAWN, BUILT BY RULING. The same `icon_pdf`
            treatment `AddReceiptsModal` gives a staged PDF tile, because an
            `<img>` pointed at PDF bytes paints nothing. No inline PDF viewer and
            no new rasterisation.
          */
          <span className="mvp-receipt-viewer__file" role="img" aria-label="PDF receipt">
            <Icon name="icon_pdf" size="l" />
          </span>
        ) : (
          <img
            className="mvp-receipt-viewer__image"
            src={receiptImageUrl(receipt)}
            // THE IMAGE IS THE CONTENT HERE, unlike the card's thumbnail, so it
            // is not `alt=""`. The dialog's title already carries the file name.
            alt="Receipt image"
          />
        )}
      </div>

      {isLinked && (
        <div className="mvp-receipt-viewer__link">
          {/*
            A FLEX ROW AROUND THE PILL, so `Chips` hugs its label. In this
            column the pill would otherwise stretch to the full width.
          */}
          <div className="mvp-receipt-viewer__chip">
            <Chips label="Linked" appearance="success" isBold />
          </div>
          {/*
            THE SHIPPED `ListItem`, the same props `ReceiptCard` passes —
            including `hasReceiptIcon={false}`, which must be explicit because the
            DS defaults it to TRUE (`ListItem.tsx:51`). Figma's `Item/list`
            (`1044:10898`) draws no receipt glyph.
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
        </div>
      )}
    </Modal>
  )
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CONFIRMATION — NOT DRAWN, BUILT BY RULING (Gate 51 ruling 5).
 *
 * COMPOSED THE WAY `PresetModals.tsx` COMPOSES ITS CONFIRM MODALS: a DS `Modal`
 * with a title, one line of content and the action in the footer.
 *
 * WHY ONLY DELETE ASKS, stated as the principle so a later gate can apply it:
 * confirm only what cannot be undone, and toast only when the surface the user
 * acted on disappears. Unlink can be reversed (Gate 51-B links by hand) and the
 * viewer flips in place, so it asks nothing and toasts nothing.
 *
 * "Delete" TAKES THE VIEWER'S OWN SECOND BUTTON WHOLE — `tertiary`, `l`, the
 * `delete` glyph — because it is the same action. "Cancel" is `secondary`,
 * mirroring the viewer's first button: of the two, the SAFE action is the
 * outlined one. The prompt ruled Delete's variant; Cancel's is this file's call.
 *
 * IT STACKS OVER THE VIEWER, deliberately — Cancel must return to it unchanged.
 * Both portal to `document.body`, so this one is appended second and paints on
 * top; `[overlay:view-delete]` asserts exactly that two-dialog list.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function DeleteReceiptModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Delete receipt?"
      footer={
        <>
          <Button variant="secondary" size="l" label="Cancel" onClick={onCancel} />
          <Button
            variant="tertiary"
            size="l"
            label="Delete"
            leadingIcon={<Icon name="delete" size="l" />}
            onClick={onConfirm}
          />
        </>
      }
    >
      <p className="mvp-receipt-delete__body type-body-sm">
        This removes the receipt and its image from your library. It can't be undone.
      </p>
    </Modal>
  )
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE HOST — the viewer, its confirmation and its toast, as one unit mounted by
 * BOTH screens that can open a receipt: the Receipts tab (a card) and the
 * Transactions tab (the detail sheet's "View").
 *
 * IT IS ALWAYS MOUNTED AND RENDERS NOTHING WHILE IDLE. The toast must OUTLIVE
 * the viewer — Delete closes the viewer and then says so — so the toast's state
 * cannot live inside the thing that just closed. The screen owns WHICH receipt
 * is open (an id, like the ledger's `detailId`); this owns everything that
 * follows from it.
 *
 * THE RECEIPT IS RE-RESOLVED FROM THE LIVE COLLECTION ON EVERY RENDER, never
 * captured. That is what makes Unlink flip the open viewer in place, and what
 * makes Delete unmount it: the record is gone, so nothing renders.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TOAST REUSES THE FRAME-CAPPED FIXED RULE, AND ADDS NO SIXTH FIXED ELEMENT.
 * `.mvp-finance-detail__toast` is the fifth of the app's five `position: fixed`
 * elements; this renders that same rule. Only `--above-chrome` is added, and it
 * changes `bottom` and `z-index`, never `position` or the inset — see
 * `finance.css` for why `/finance` needs it and `/finance/holding/*` does not.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ReceiptViewerHost({
  receiptId,
  onClose,
}: {
  /** The receipt to show, or `null` for none. */
  receiptId: string | null
  onClose: () => void
}) {
  const { receipts, transactions, unlinkReceipt, deleteReceipt } = useAccounts()
  const [isConfirming, setIsConfirming] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const receipt = receiptId ? receipts.find((r) => r.id === receiptId) : undefined
  const transaction = receipt?.transactionId
    ? transactions.find((t) => t.id === receipt.transactionId)
    : undefined

  /*
    STABLE, AND IT HAS TO BE — measured at Gate 51, not assumed. The DS `Modal`
    re-runs its open effect whenever `onClose` changes identity (deps
    `[isOpen, onClose]`, `Modal.tsx`), and that effect's CLEANUP focuses the
    element that opened the modal. With a fresh `close` on every render,
    pressing Unlink or opening the confirmation re-rendered this host, focused
    the card UNDER the overlay, and `focus()` scrolled the page behind it —
    770px and 808px in the first mint of `view-unlinked` and `view-delete`.
    Both screens pass a stable `onClose` for the same reason; the harness now
    asserts the document is still at the top after every prepare step.
  */
  const close = useCallback(() => {
    setIsConfirming(false)
    onClose()
  }, [onClose])

  // THE CONFIRMATION'S `onClose`, stable for the same reason.
  const cancelDelete = useCallback(() => setIsConfirming(false), [])

  /*
    DELETE, THEN CLOSE BOTH, THEN SAY SO — in that order. `deleteReceipt` writes
    the receipt collection and nothing else, so the linked row becomes
    receipt-less through the derived `hasReceipt` and its amount does not move.
  */
  const confirmDelete = () => {
    if (!receipt) return
    deleteReceipt(receipt.id)
    setIsConfirming(false)
    onClose()
    setToast(DELETED_TOAST)
  }

  return (
    <>
      {receipt && (
        <ReceiptViewer
          receipt={receipt}
          transaction={transaction}
          onUnlink={() => unlinkReceipt(receipt.id)}
          onDelete={() => setIsConfirming(true)}
          onClose={close}
        />
      )}
      {receipt && isConfirming && (
        <DeleteReceiptModal
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}
      {toast && (
        <div className="mvp-finance-detail__toast mvp-finance-detail__toast--above-chrome">
          <ToastMobile
            appearance="success"
            title={toast}
            role="status"
            onDismiss={() => setToast(null)}
          />
        </div>
      )}
    </>
  )
}
