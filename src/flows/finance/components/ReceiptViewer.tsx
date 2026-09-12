import { useCallback, useState, type ReactNode } from 'react'
import {
  Button,
  Chips,
  Icon,
  IconButton,
  ListItem,
  Modal,
  ToastMobile,
} from '@monarch/design-system'
import { useAccounts } from '../../../accounts/AccountsProvider'
import { SectionHeader } from '../../../components/SectionHeader'
import { TransactionMark } from '../../../components/TransactionMark'
import { receiptImageUrl } from '../../../config/media'
import { formatMyr, formatSignedMyr, formatTimestamp } from '../../../data/format'
import type { Receipt, Transaction } from '../../../data/types'
import { fileTypeLabel } from '../receiptCapture'
import {
  ReceiptEditor,
  draftFrom,
  draftToEdit,
  isChanged,
  isValid,
  type EditorDraft,
} from './ReceiptEditor'
import { TransactionPicker } from './TransactionPicker'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RECEIPT VIEWER — Figma `Finance_Receipts_View receipt` (`1266:14285`),
 * Gate 51, completed at Gate 51-B.
 *
 * IT IS A `Modal`, NOT A `Sheet`, FOR THE REASON `AddReceiptsModal` ALREADY
 * RECORDS. The inner node is named "Bottom Sheet" (`1044:10853`) and its
 * geometry says otherwise: **343 wide at x=16**, all four corners rounded
 * (`rounded-[border-radius/md]` on every corner, `overflow-clip`), no home
 * indicator, a 64-tall header and a 152-tall footer holding two full-width
 * 48-tall buttons — the SAME frame shape as `1048:10593`, which Gate 50 read as
 * a Modal. Geometry wins; the layer name is the trap, now for the third time in
 * Flow 9. The Gate 51 prompt called this surface "a DS `Sheet`", and the Gate
 * 51-B prompt called it one again; the file does not.
 *
 * G28 APPLIES UNCHANGED: Figma fixes the header (64) and footer (152) heights
 * and the DS hugs both. Not overridden here, for the reason that entry gives.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SEVEN PRINCIPLES GATE 51-B'S UNDRAWN SURFACES WERE BUILT FROM
 *
 * No Figma frame exists for the picker, the editor, the unlinked state's detail
 * block, the mismatch line or the replace confirmation. Teku ruled (decision 1B,
 * 11 Sept) that the review thread designs them from this app's own existing
 * behaviour, so each one below carries the principle that produced it. Every
 * principle is a description of something already shipped here, not an
 * invention for this gate.
 *
 *   P1  ONE OVERLAY, MANY VIEWS. The picker and the editor are views INSIDE
 *       this Modal, not new overlays. The title changes and a back affordance
 *       returns. Precedent: `TransactionFilterSheet`'s `'filters' | 'merchant'`
 *       swap.
 *   P2  DATA-DRIVEN FLIPS. After link, edit or unlink the viewer re-renders
 *       from live data in place. The host re-resolves the receipt from the
 *       collection every render and never captures it.
 *   P3  CONFIRM ONLY WHAT CANNOT BE UNDONE. Delete and a receipt SWAP ask;
 *       link and edit do not.
 *   P4  TOAST ONLY WHEN THE SURFACE DISAPPEARS. Delete closes the viewer, so it
 *       toasts. A flip in place does not.
 *   P5  REUSE THE LEDGER'S ROW. Picker rows are the `ListItem` the ledger
 *       renders, with the same derived receipt glyph.
 *   P6  RECEIPTS NEVER REWRITE THE BANK. Linking, editing, unlinking and
 *       deleting write the receipt collection only. A total that differs from
 *       the linked transaction's amount is SHOWN, not fixed — see
 *       `TotalMismatch` below.
 *   P7  ONE DEFINITION OF "AGREE". The picker's suggestions reuse
 *       `totalMatches`, `withinWindow` and `merchantMatches` from
 *       `autoMatch.ts`. There is no second matching rule in this app.
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE VIEWS, ONE MODAL (P1)
 *
 *   'viewer'  the receipt. Linked or unlinked, driven by the DATA.
 *   'picker'  item L — choose a transaction to link this receipt to.
 *   'editor'  item E — correct merchant, date, time and total.
 *
 * ESCAPE AND THE ✕ CLOSE THE WHOLE VIEWER FROM ANY VIEW, and they are NOT
 * intercepted: they are the DS `Modal`'s own handlers and this file adds
 * nothing to them. An unsaved edit is discarded, which is the same outcome the
 * back affordance gives — so there is one rule ("leaving without Save discards")
 * rather than two behaviours depending on how you left.
 *
 * THE BACK AFFORDANCE SHIPS VISIBLY SHORT — register **G32**. `Modal` renders
 * `headerIconLeft` INSIDE the centred title group (`Modal.tsx:114-117`), and
 * its leading `mn-modal__header-side` span is `aria-hidden` with no children
 * (`:113`). So a back control lands beside the centred title rather than flush
 * left. NOT overridden with an MVP rule that moves it — that would be writing
 * over DS geometry, which this project does not do.
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO STATES OF THE 'viewer' VIEW, DRIVEN BY THE DATA — `ReceiptCard`'s rule.
 *
 *   LINKED    as drawn: image, the "Linked" pill, the transaction's row — THEN
 *             (Gate 51-B, undrawn) the Receipt details block and, only when the
 *             two figures differ, one line saying so. Footer: Unlink, Delete.
 *   UNLINKED  NOT DRAWN. Gate 51 shipped the image and Delete only and deferred
 *             the rest here. Now: image, Receipt details with its Edit link,
 *             then Link to transaction and Delete receipt.
 *
 * AFTER UNLINK, LINK OR EDIT THE MODAL STAYS OPEN AND FLIPS IN PLACE (P2),
 * because the host resolves the receipt from the live collection on every
 * render; the detail sheet does the same (Gate 49) and for the same reason: the
 * user sees what their click did.
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO DIVERGENCES FROM THE FRAME, BOTH REGISTERED, NEITHER FAKED:
 *
 *  - THE IMAGE WELL HAS NO FILL OF ITS OWN (register G30, `token-gap`). Figma
 *    binds the raw primitive `Gray/900`; no `--mapped-surface-*` token resolves
 *    to it in light, and a raw brand primitive is not written here.
 *  - "Delete receipt" IS `variant="tertiary"`, WHICH RENDERS PRIMARY BLUE
 *    RATHER THAN THE ERROR RED FIGMA DRAWS (register G29, `prop-gap`). The two
 *    halves of that sentence are one finding, not two: Figma draws the button
 *    borderless — which IS `tertiary` — in `text/error/default` +
 *    `icon/error/default`, and `ButtonVariant` is `primary | secondary |
 *    tertiary` with no error appearance, so a tertiary button's `--btn-text`
 *    resolves to `--mapped-text-primary-default`. The VARIANT is right and the
 *    COLOUR is short.
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

/** Integer cents, so two figures are compared the way `totalMatches` does. */
function toCents(value: number): number {
  return Math.round(value * 100)
}

/**
 * Whether a linked receipt's total disagrees with its transaction's amount.
 *
 * IN CENTS, AND AGAINST THE NEGATED AMOUNT — the same comparison
 * `autoMatch.ts`'s `totalMatches` makes, because it is the same question. A
 * float `!==` here would report a mismatch on values that print identically.
 */
function totalsDisagree(receipt: Receipt, transaction: Transaction): boolean {
  return toCents(receipt.total) !== toCents(-transaction.amount)
}

/* ───────────────────────────────────────────────────────── the details block */

/**
 * One label/value row. `<dt>`/`<dd>` inside a `<dl>`, the same shape the
 * detail sheet's `InfoRow` uses and for the same reason: these are terms and
 * their definitions, not two spans that happen to sit in a row.
 *
 * NO LEADING GLYPH, unlike the sheet's. The sheet's three rows carry a
 * calendar, a list and a card because Teku ruled them ONE GRAMMAR naming the
 * FIELD (Gate 50-A, decision B); that grammar belongs to that block. Three more
 * glyphs here would be a second, unrelated icon vocabulary inside the same
 * flow — and the registry has no `store` glyph anyway (register G16 is the
 * precedent for not substituting a near-miss).
 */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mvp-receipt-details__row">
      <dt className="mvp-receipt-details__row-label type-body-sm">{label}</dt>
      <dd className="mvp-receipt-details__row-value type-body-sm-medium">{value}</dd>
    </div>
  )
}

/**
 * THE RECEIPT DETAILS BLOCK — Gate 51-B, item D. NOT DRAWN.
 *
 * IT SHOWS THE DISPLAY FALLBACKS, AND THAT IS THE WHOLE POINT OF IT. A field
 * extraction could not read is filled by `capturedToReceipt` with something
 * HONEST rather than something plausible — the merchant becomes the FILE'S OWN
 * NAME, the timestamp becomes the MOMENT OF CAPTURE, and the total becomes
 * ZERO. Until this gate none of those three was on screen anywhere, so a
 * misread was invisible and uncorrectable. Now a user sees `IMG_4821.jpg` where
 * a merchant should be, or `RM 0.00` where a total should be, and the Edit link
 * is one tap away.
 *
 * THE HEADING IS `SectionHeader` WITH A TRAILING LINK — the app's own "See all"
 * pattern, at `HomepageFiat.tsx:51` and five other call sites. Not a bespoke
 * row: a heading with a trailing affordance is exactly what that component is.
 */
function ReceiptDetails({ receipt, onEdit }: { receipt: Receipt; onEdit: () => void }) {
  return (
    <section className="mvp-receipt-details">
      <SectionHeader label="Receipt details" linkLabel="Edit" onLinkClick={onEdit} />
      <dl className="mvp-receipt-details__rows">
        <DetailRow label="Merchant" value={receipt.merchant} />
        <DetailRow label="Date" value={formatTimestamp(receipt.capturedAt)} />
        <DetailRow label="Total" value={formatMyr(receipt.total)} />
      </dl>
    </section>
  )
}

/**
 * THE TOTAL MISMATCH LINE — Gate 51-B, item D. NOT DRAWN.
 *
 * IT IS A STATEMENT, NOT A WARNING, AND THAT IS P6 MADE VISIBLE. This app never
 * reconciles the two figures: `linkReceipt` and `updateReceipt` write the
 * receipt collection and nothing else, so a hand-link or an edited total can
 * leave a receipt whose printed total is not the amount the bank recorded. The
 * honest thing is to print both and let the user decide which is wrong — the
 * same ruling that put a derived subtotal beside a printed total on six
 * receipts whose figures do not close (Gate 49).
 *
 * AUTO-MATCH CANNOT PRODUCE ONE. Its rule requires `-amount === total` to the
 * sen, so an auto-linked receipt always agrees. Only a hand-link or an edit can
 * reach this, which is why it arrives in the same gate as both.
 *
 * NO ERROR TREATMENT AND NO GLYPH. It is subtle body copy: nothing is broken,
 * and an alert colour would assert a defect the app cannot adjudicate.
 */
function TotalMismatch({
  receipt,
  transaction,
}: {
  receipt: Receipt
  transaction: Transaction
}) {
  return (
    <p className="mvp-receipt-details__mismatch type-body-caption">
      {`This receipt's total is ${formatMyr(receipt.total)}, and the transaction is ` +
        `${formatMyr(Math.abs(transaction.amount))}.`}
    </p>
  )
}

/* ─────────────────────────────────────────────────────────── the viewer view */

function ReceiptViewerBody({
  receipt,
  transaction,
  onEdit,
}: {
  receipt: Receipt
  transaction?: Transaction
  onEdit: () => void
}) {
  const isLinked = receipt.transactionId !== null && transaction !== undefined

  return (
    <>
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

      {/*
        THE DETAILS BLOCK SITS AFTER THE DESIGNED CONTENT IN BOTH STATES, which
        is what keeps the linked state's drawn portion byte-for-byte where Figma
        put it — the image, the pill and the row are untouched above it.
      */}
      <ReceiptDetails receipt={receipt} onEdit={onEdit} />

      {isLinked && totalsDisagree(receipt, transaction) && (
        <TotalMismatch receipt={receipt} transaction={transaction} />
      )}
    </>
  )
}

/* ────────────────────────────────────────────────────── the two confirmations */

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DELETE CONFIRMATION — NOT DRAWN, BUILT BY RULING (Gate 51 ruling 5).
 *
 * COMPOSED THE WAY `PresetModals.tsx` COMPOSES ITS CONFIRM MODALS: a DS `Modal`
 * with a title, one line of content and the action in the footer.
 *
 * WHY ONLY DELETE AND A SWAP ASK (P3): confirm only what cannot be undone, and
 * toast only when the surface the user acted on disappears (P4). Unlink can be
 * reversed — the picker links it back — and the viewer flips in place, so it
 * asks nothing and toasts nothing. An edit is likewise reversible by editing
 * again.
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
function ConfirmModal({
  title,
  body,
  confirmLabel,
  confirmIcon,
  onCancel,
  onConfirm,
}: {
  title: string
  body: string
  confirmLabel: string
  confirmIcon?: ReactNode
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" size="l" label="Cancel" onClick={onCancel} />
          <Button
            variant="tertiary"
            size="l"
            label={confirmLabel}
            leadingIcon={confirmIcon}
            onClick={onConfirm}
          />
        </>
      }
    >
      <p className="mvp-receipt-delete__body type-body-sm">{body}</p>
    </Modal>
  )
}

/* ──────────────────────────────────────────────────────────────── the host */

type ViewerView = 'viewer' | 'picker' | 'editor'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE HOST — one `Modal`, three views, two confirmations and a toast, as one
 * unit mounted by BOTH screens that can open a receipt: the Receipts tab (a
 * card) and the Transactions tab (the detail sheet's "View").
 *
 * IT IS ALWAYS MOUNTED AND RENDERS NOTHING WHILE IDLE. The toast must OUTLIVE
 * the viewer — Delete closes the viewer and then says so — so the toast's state
 * cannot live inside the thing that just closed. The screen owns WHICH receipt
 * is open (an id, like the ledger's `detailId`); this owns everything that
 * follows from it.
 *
 * THE RECEIPT IS RE-RESOLVED FROM THE LIVE COLLECTION ON EVERY RENDER, never
 * captured (P2). That is what makes Unlink, Link and Save flip the open viewer
 * in place, and what makes Delete unmount it: the record is gone, so nothing
 * renders.
 * ─────────────────────────────────────────────────────────────────────────────
 * EVERY CALLBACK THAT REACHES A DS OVERLAY IS `useCallback`-STABLE, AND THAT IS
 * NOT TIDINESS — it is register **G31**, measured. `Modal` and `Sheet` both
 * list `[isOpen, onClose]` as their open effect's dependencies
 * (`Modal.tsx:98`, `Sheet.tsx:203`) and both CLEANUPS call
 * `previouslyFocused.current?.focus?.()`. So a fresh `onClose` on any re-render
 * re-runs the effect, focuses the element UNDER the overlay, and `focus()`
 * scrolls the page behind it — 770px after Unlink and 808px after opening the
 * delete confirmation, measured at Gate 51 and recorded into two baselines
 * under a green 319-passed run before anyone opened the PNGs.
 *
 * THE VIEW STATE MAKES THIS WORSE, NOT BETTER: this host now re-renders on
 * every keystroke in the editor's draft, so an unstable callback would fire
 * that effect per character. The harness asserts `window.scrollY === 0` after
 * every prepare step, which is the tripwire.
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
  const {
    receipts,
    transactions,
    unlinkReceipt,
    deleteReceipt,
    linkReceipt,
    updateReceipt,
  } = useAccounts()
  const [view, setView] = useState<ViewerView>('viewer')
  const [isConfirming, setIsConfirming] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  /*
    THE PICKED ROW AWAITING A SWAP CONFIRMATION. An id and not a transaction,
    for the host's standing reason: anything held across a render is re-resolved
    from live data rather than frozen.
  */
  const [replacing, setReplacing] = useState<string | null>(null)
  /*
    THE EDITOR'S DRAFT, SEEDED WHEN THE EDITOR IS OPENED — not on mount, and not
    per render. `openEditor` reads the receipt as it stands at the moment the
    Edit link is pressed, so reopening after a save starts from what was saved.
    The same property `TransactionFilterSheet` gets from mounting conditionally;
    here the view is state rather than a mount, so the seeding is explicit.
  */
  const [draft, setDraft] = useState<EditorDraft | null>(null)

  const receipt = receiptId ? receipts.find((r) => r.id === receiptId) : undefined
  const transaction = receipt?.transactionId
    ? transactions.find((t) => t.id === receipt.transactionId)
    : undefined

  /*
    STABLE, AND IT HAS TO BE — see G31 above. Closing resets the VIEW as well as
    the confirmations, so reopening a receipt always starts on the viewer: a
    stale 'picker' would put the user back in a list they had already left.
  */
  const close = useCallback(() => {
    setIsConfirming(false)
    setReplacing(null)
    setView('viewer')
    setDraft(null)
    onClose()
  }, [onClose])

  // THE CONFIRMATIONS' `onClose`s, stable for the same reason.
  const cancelDelete = useCallback(() => setIsConfirming(false), [])
  const cancelReplace = useCallback(() => setReplacing(null), [])

  /*
    BACK DISCARDS. Returning to the viewer drops the draft, which is the same
    outcome Escape and the ✕ give — one rule rather than two behaviours
    depending on how the user left.
  */
  const back = useCallback(() => {
    setView('viewer')
    setDraft(null)
  }, [])

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

  if (!receipt) {
    // THE TOAST OUTLIVES THE RECEIPT, which is the whole reason this host exists
    // as a separate always-mounted component rather than living in the viewer.
    return toast ? <DeletedToast toast={toast} onDismiss={() => setToast(null)} /> : null
  }

  /*
    A PICK LINKS IMMEDIATELY WHEN THE ROW IS FREE, AND ASKS WHEN IT IS NOT (P3).
    "Free" is `transactionHasReceipt`'s question, asked here through the same
    collection the picker's rows read — so the row that draws a receipt glyph is
    exactly the row that raises the confirmation.

    NO CONFIRM ON THE FREE PATH: Unlink reverses it, nothing else moved (P6),
    and the viewer flips in place so the user sees the result (P2).
  */
  const pick = (picked: Transaction) => {
    const incumbent = receipts.find(
      (r) => r.transactionId === picked.id && r.id !== receipt.id,
    )
    if (incumbent) {
      setReplacing(picked.id)
      return
    }
    linkReceipt(receipt.id, picked.id)
    setView('viewer')
  }

  const confirmReplace = () => {
    if (!replacing) return
    linkReceipt(receipt.id, replacing)
    setReplacing(null)
    setView('viewer')
  }

  const openEditor = () => {
    setDraft(draftFrom(receipt))
    setView('editor')
  }

  const save = () => {
    if (!draft || !isValid(draft) || !isChanged(receipt, draft)) return
    updateReceipt(receipt.id, draftToEdit(draft))
    setView('viewer')
    setDraft(null)
  }

  const isLinked = receipt.transactionId !== null && transaction !== undefined
  const replacingRow = replacing ? transactions.find((t) => t.id === replacing) : undefined

  /*
    THE THREE VIEWS' TITLE, BODY AND FOOTER, CHOSEN ONCE. One `Modal` renders
    whichever set is current — the P1 shape. The 'viewer' title is the capture's
    camera-roll name, which is what Figma prints there and what the card that
    opened it prints: tapping "IMG_4806.jpg" opens a dialog called
    "IMG_4806.jpg".
  */
  const canSave = draft !== null && isValid(draft) && isChanged(receipt, draft)

  let title = receipt.displayName
  let body: ReactNode
  let footer: ReactNode

  if (view === 'picker') {
    title = 'Link to transaction'
    body = (
      <TransactionPicker
        receipt={receipt}
        transactions={transactions}
        receipts={receipts}
        onPick={pick}
      />
    )
    // NO FOOTER. Picking a row IS the action, so a footer button here would be
    // a second way to do the same thing or a control with nothing to do.
    footer = undefined
  } else if (view === 'editor' && draft) {
    title = 'Edit receipt'
    body = <ReceiptEditor receipt={receipt} draft={draft} onChange={setDraft} />
    footer = (
      <Button
        variant="primary"
        size="l"
        label="Save changes"
        isDisabled={!canSave}
        onClick={save}
      />
    )
  } else {
    body = (
      <ReceiptViewerBody
        receipt={receipt}
        transaction={transaction}
        onEdit={openEditor}
      />
    )
    footer = (
      <>
        {/*
          SIZE `l` WITH A 24px GLYPH, READ OFF THE FRAME: both drawn buttons are
          `py-[Scale/300]` (12) around a 24px `<element>`, which is `.mn-btn--l`'s
          vertical padding and `Icon size="l"` exactly. The label stays
          `body-sm-semibold` because `Button` fixes it; Figma's is `body/m`.

          THE UNLINKED STATE'S FIRST BUTTON IS "Link to transaction" AND IT IS
          PRIMARY — undrawn, built by ruling. It is the one thing a user can do
          with an unlinked receipt that the app cares about, and Delete beneath
          it stays exactly as Gate 51 shipped it.
        */}
        {isLinked ? (
          <Button
            variant="secondary"
            size="l"
            label="Unlink receipt"
            leadingIcon={<Icon name="link_off" size="l" />}
            onClick={() => unlinkReceipt(receipt.id)}
          />
        ) : (
          <Button
            variant="primary"
            size="l"
            label="Link to transaction"
            leadingIcon={<Icon name="link" size="l" />}
            onClick={() => setView('picker')}
          />
        )}
        <Button
          variant="tertiary"
          size="l"
          label="Delete receipt"
          leadingIcon={<Icon name="delete" size="l" />}
          onClick={() => setIsConfirming(true)}
        />
      </>
    )
  }

  return (
    <>
      <Modal
        isOpen
        onClose={close}
        /*
          ── THE CARD IS CAPPED TO THE VIEWPORT FROM HERE — register G33 ──────

          `Modal` BOUNDS ITS CARD TO NOTHING. `.mn-modal` is `position: fixed;
          inset: 0` with 16px padding and `align-items: center`, and
          `.mn-modal__card` declares no `max-height` and no scrolling region —
          so a card taller than the padded box centres and hangs off BOTH ends.
          `Sheet` has had both since it shipped (`max-height: calc(100dvh -
          var(--brand-scale-1100))` on the panel, `overflow-y: auto` +
          `min-height: 0` on the content), recorded in its own CSS as an
          INSTRUCTED addition that Figma does not draw. `Modal` never got the
          equivalent.

          IT IS PRE-EXISTING AND THIS GATE MADE IT ACUTE, measured both ways: at
          430 the Gate 51 LINKED viewer already rendered 787.33 tall in a 780
          padded box — 3.66px off each end, before one line of this gate's
          content existed. Adding the details block takes it to 872.66 at 375,
          which puts the Delete button 30px BELOW the viewport. A screen whose
          primary action is off screen is not shippable, so this could not be
          registered and left.

          THE SEAM IS THE DS'S OWN. `className` lands on `.mn-modal`
          (`Modal.tsx:100`), and `Modal.css` names `className` as the supported
          way a caller controls the card's size ("Figma frame width;
          caller-controllable via className/style" on `max-width`). So this is a
          SCOPED, higher-specificity rule reached through a documented escape
          hatch — not the equal-specificity global override on declared DS
          geometry that Gate 13 removed on measurement, and not a value fighting
          one the DS sets: `max-height` on that card is UNSET.

          IT IS STILL A WORKAROUND AND IS REGISTERED AS ONE. The fix belongs in
          `Modal.css`, mirroring `Sheet` exactly; when it lands, both rules here
          and this class go.
        */
        className="mvp-receipt-viewer-modal"
        title={title}
        /*
          THE BACK AFFORDANCE — only on a sub-view, because on the viewer there
          is nothing to go back TO and the ✕ already closes. It renders beside
          the centred title rather than flush left; that is G32 and it ships
          short rather than being moved by an MVP rule.

          ITS NAME SAYS WHERE IT GOES, not what it looks like: "Back to receipt"
          rather than "Back", so it is distinguishable from "Close" when read
          aloud in a dialog that has both.
        */
        headerIconLeft={
          view === 'viewer' ? undefined : (
            <IconButton
              variant="tertiary"
              size="s"
              ariaLabel="Back to receipt"
              icon={<Icon name="arrow_back" size="l" />}
              onClick={back}
            />
          )
        }
        footer={footer}
      >
        {body}
      </Modal>

      {isConfirming && (
        <ConfirmModal
          title="Delete receipt?"
          body="This removes the receipt and its image from your library. It can't be undone."
          confirmLabel="Delete"
          confirmIcon={<Icon name="delete" size="l" />}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}

      {/*
        THE SWAP CONFIRMATION (P3) — linking to a transaction that already has a
        receipt DISPLACES that receipt, and a displacement the user did not
        expect is not reversible by any single action they can see. The body
        names the payee and states exactly where the displaced capture goes, so
        "Replace" is not a euphemism for "delete".
      */}
      {replacingRow && (
        <ConfirmModal
          title="Replace this transaction's receipt?"
          body={`${replacingRow.merchant}'s current receipt will move to your library, unlinked.`}
          confirmLabel="Replace"
          onCancel={cancelReplace}
          onConfirm={confirmReplace}
        />
      )}

      {toast && <DeletedToast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  )
}

function DeletedToast({ toast, onDismiss }: { toast: string; onDismiss: () => void }) {
  return (
    <div className="mvp-finance-detail__toast mvp-finance-detail__toast--above-chrome">
      <ToastMobile
        appearance="success"
        title={toast}
        role="status"
        onDismiss={onDismiss}
      />
    </div>
  )
}
