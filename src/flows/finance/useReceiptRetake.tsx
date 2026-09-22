import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useAccounts } from '../../accounts/AccountsProvider'
import { autoMatchBatch } from '../../data/autoMatch'
import type { Receipt } from '../../data/types'
import { ReceiptFileInput, type ReceiptFileInputHandle } from './components/ReceiptFileInput'
import { retakeSource } from './advisoryCopy'
import { capturedToReceipts, extractCapture } from './receiptCapture'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RETAKE — Gate 60, RESHAPED AT GATE 61.
 *
 * REOPENS THE SURFACE THE RECEIPT CAME FROM: the camera for a camera capture,
 * the file picker for an upload (`retakeSource`). One file, never a
 * multi-select — a retake replaces ONE photograph.
 *
 * ─────────────── A RETAKE REPLACES THE RECEIPT IT RETAKES ───────────────────
 *
 * DECISION 1, 20 SEPT. GATE 60 SHIPPED THIS AS AN ADD AND THAT WAS WRONG. A
 * user whose photograph read badly was told so and offered a retake; they took
 * a better one and were left holding TWO receipts — the original still attached
 * to the transaction and still showing the failed reading, the replacement
 * attached to nothing. They had done exactly what the app asked and the
 * transaction still showed the wrong figures, and fixing it meant noticing that
 * themselves, opening the new receipt, tapping "Link to transaction" and
 * clearing a confirmation. "Retake" also means REPLACE everywhere else in this
 * category, so the control contradicted its own label.
 *
 * SO: the replacement is created, it takes the original's link if there was
 * one, and the original is removed — in that order, in one `replaceReceipt`.
 *
 * ──────────────── ORDER OF OPERATIONS IS LOAD-BEARING ───────────────────────
 *
 * THE REPLACEMENT EXISTS AND IS VALID BEFORE THE ORIGINAL GOES. Nothing is
 * removed until `capturedToReceipts` has returned a record, so a cancelled
 * picker, a file that cannot be decoded or a read that fails leaves the
 * original exactly as it was — linked, in the library, with the viewer still
 * open on it. REMOVE-FIRST-AND-RESTORE-ON-FAILURE IS THE SHAPE TO AVOID: it
 * makes the user's data depend on an error path running correctly.
 *
 * A CANCELLED PICKER NEEDS NO HANDLING HERE AT ALL, and that is worth saying
 * rather than leaving to be rediscovered: `ReceiptFileInput` never calls
 * `onFiles` with an empty list (see its `onFiles` contract), so a cancel does
 * not reach this function. Nothing is created and nothing is removed because
 * nothing runs.
 *
 * ──────── AUTO-MATCH IS SKIPPED FOR AN INHERITED LINK, ACTIVELY ─────────────
 *
 * IT IS NOT A NO-OP AND MUST NOT BE WRITTEN AS ONE. When the original is
 * linked to T, T already has a receipt, so `candidatesFor` excludes it and
 * auto-match CANNOT return T — but it can still return some OTHER row U whose
 * total and date happen to match. Letting it run would link the replacement to
 * U and lose T's receipt entirely, which is the opposite of what a retake
 * means. So the inherited link wins outright and auto-match is never consulted.
 *
 * WHEN THE ORIGINAL IS UNLINKED, auto-match runs exactly as it does for any
 * Receipts-tab capture. The original is still in the library at that moment and
 * that is harmless: it has no `transactionId`, so it blocks no row
 * (`transactionHasReceipt` counts only linked receipts).
 *
 * THE LINK IS READ BEFORE THE AWAIT, and the window that opens is closed by the
 * UI rather than by this code: both surfaces render `CapturingBlock` while
 * extraction runs — the viewer with no footer, the sheet in place of its
 * receipt block — so neither offers an Unlink while a retake is in flight.
 * (The closure's `receipts` array cannot update across the await in any case,
 * so before and after would read the same thing; before is simply clearer.)
 *
 * THE REPLACEMENT IS AN ORDINARY RECEIPT, so a retake of a retake is not a
 * special case and has no limit. If the second photograph also reads badly it
 * shows the advisory itself and can be retaken again.
 *
 * AND THE VIEWER THEN OPENS ON THE NEW RECEIPT, so the user sees how the second
 * photograph read — `onRetaken` is the caller's hook for that, because only the
 * screen owns which receipt the viewer shows.
 *
 * NO CONFIRMATION. P3 confirms what cannot be undone; the user has explicitly
 * asked to retake THIS receipt, and the precondition for the advisory existing
 * at all is that its reading produced no line items or no total. Nobody
 * confirms discarding a blurry photo. The picker's Replace confirmation guards
 * a different thing — a link moving between two receipts the user may not have
 * meant to swap — and is untouched.
 *
 * NO AMOUNT MOVES, EVER (P6). `replaceReceipt` writes the receipt collection
 * and nothing else; the link moves, the transaction's figures do not.
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
  const { transactions, receipts, replaceReceipt } = useAccounts()
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
    // RE-RESOLVED FROM THE COLLECTION, NOT HELD FROM `start`. The host's
    // standing rule: anything carried across a render is looked up again rather
    // than frozen. If it is gone, there is nothing to replace.
    const original = receipts.find((r) => r.id === from)
    if (!original) return
    const inherited = original.transactionId

    setRetakingId(from)
    const capture = await extractCapture(file, URL.createObjectURL(file))
    /*
      THE LINK: inherited outright, or auto-match's answer when there was none.
      Not a fallback chain that happens to work — see the header for why an
      inherited link must SUPPRESS auto-match rather than merely outrank
      whatever it would have returned.
    */
    const link =
      inherited ?? autoMatchBatch([capture.extracted], transactions, receipts)[0] ?? null
    // The same call `ReceiptsTab.saveCaptures` makes, for a selection of one.
    const [replacement] = capturedToReceipts([capture], [link], new Date())

    // NOW, AND NOT BEFORE: the replacement exists, so the original may go.
    replaceReceipt(from, replacement)
    setRetakingId(null)
    onRetaken(replacement.id)
  }

  return { start, retakingId, input: <ReceiptFileInput ref={inputRef} onFiles={onFiles} /> }
}
