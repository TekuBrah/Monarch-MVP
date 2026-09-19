import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useAccounts } from '../../accounts/AccountsProvider'
import { autoMatchBatch } from '../../data/autoMatch'
import type { Receipt } from '../../data/types'
import { ReceiptFileInput, type ReceiptFileInputHandle } from './components/ReceiptFileInput'
import { retakeSource } from './components/ReceiptAdvisory'
import { capturedToReceipts, extractCapture } from './receiptCapture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RETAKE — Gate 60.
 *
 * REOPENS THE SURFACE THE RECEIPT CAME FROM: the camera for a camera capture,
 * the file picker for an upload (`retakeSource`). One file, never a
 * multi-select — a retake replaces ONE photograph.
 *
 * ─────────────── IT MAKES A NEW RECEIPT AND TOUCHES THE OLD ONE NOT AT ALL ────
 *
 * The original is not edited, not unlinked, not replaced and not deleted. Its
 * record, its link and its advisory are exactly as they were; the user deletes
 * it themselves if they want it gone (Delete asks first, P3).
 *
 * THE NEW RECEIPT IS LINKED THE WAY A RECEIPTS-TAB CAPTURE IS: by auto-match,
 * at the moment it is added. Auto-match NEVER displaces — a transaction that
 * already has a receipt is not a candidate — so when the original is linked,
 * the retake arrives unlinked, and taking over that transaction is the
 * existing "Link to transaction" pick, whose Replace confirmation already asks
 * before anything moves. That is deliberate: moving the link automatically
 * would unlink the original, which is exactly the mutation a retake must not
 * make, and a displacement nobody confirmed is what P3 exists to prevent.
 *
 * AND THE VIEWER THEN OPENS ON THE NEW RECEIPT, so the user sees how the second
 * photograph read before deciding anything — `onRetaken` is the caller's hook
 * for that, because only the screen owns which receipt the viewer shows.
 *
 * NO NEW OCR WORK. A retake is one ordinary capture through `extractCapture` —
 * the same one-or-two-pass read every capture gets, one worker per call (D8) —
 * and `extractCapture` still cannot reject, so a retake that reads nothing is an
 * unread receipt, not a lost one.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function useReceiptRetake(onRetaken: (receiptId: string) => void): {
  /** Open the picker for a retake of this receipt. */
  start: (receipt: Receipt) => void
  /** The receipt whose retake is being read, or `null`. */
  retakingId: string | null
  /** The hidden file input. Render it once, on a surface that outlives the picker. */
  input: ReactNode
} {
  const { transactions, receipts, addReceipt } = useAccounts()
  const inputRef = useRef<ReceiptFileInputHandle>(null)
  // WHICH RECEIPT THE OPEN PICKER IS A RETAKE OF. A ref, because the OS picker
  // returns after any number of renders and the answer must survive them all.
  const pending = useRef<string | null>(null)
  const [retakingId, setRetakingId] = useState<string | null>(null)

  const start = useCallback((receipt: Receipt) => {
    pending.current = receipt.id
    inputRef.current?.open(retakeSource(receipt), { single: true })
  }, [])

  const onFiles = async (files: File[]) => {
    const from = pending.current
    pending.current = null
    const file = files[0]
    if (!from || !file) return
    setRetakingId(from)
    const capture = await extractCapture(file, URL.createObjectURL(file))
    // The same call `ReceiptsTab.saveCaptures` makes, for a selection of one.
    const [link] = autoMatchBatch([capture.extracted], transactions, receipts)
    const [receipt] = capturedToReceipts([capture], [link ?? null], new Date())
    addReceipt(receipt)
    setRetakingId(null)
    onRetaken(receipt.id)
  }

  return { start, retakingId, input: <ReceiptFileInput ref={inputRef} onFiles={onFiles} /> }
}
