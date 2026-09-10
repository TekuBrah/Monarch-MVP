import { forwardRef, useImperativeHandle, useRef } from 'react'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE CONTROL, THREE ENTRY POINTS (Gate 50).
 *
 * The camera, the gallery and the bulk grid all reach the device through the
 * SAME `<input type="file">`. What differs between them is two attributes:
 *
 *   camera   accept=IMAGE_AND_PDF  capture="environment"  (one file, rear camera)
 *   gallery  accept=IMAGE_AND_PDF  multiple               (several at once)
 *   bulk     accept=IMAGE_AND_PDF  multiple               (the same element again)
 *
 * ──────── PDFs ARE ADMITTED AS OF GATE 50-B, AND THAT HAD A CONSEQUENCE ──────
 *
 * `accept` was `image/*` until real extraction existed, because nothing behind
 * the seam could read a PDF. `rasterise.ts` now draws page one before OCR, so a
 * PDF is a receipt this app can genuinely read — and an EMAILED receipt is a
 * PDF, which is at least as ordinary a thing for a user to have as a photograph.
 *
 * THE JPG/PDF BADGE VARIANT BECAME REACHABLE THE MOMENT THIS CHANGED. Gate 50
 * built the staged-tile badge off `fileTypeLabel(file.name)` and recorded that
 * its "pdf" reading was unreachable, because `accept` could not admit one. It is
 * reachable now. No committed baseline photographs a PDF tile — the walk stages
 * `receipt-capture.jpg` and nothing else — so this moved no pixels, and that was
 * confirmed rather than assumed.
 *
 * `capture="environment"` STAYS ON THE CAMERA ROW even though a camera cannot
 * produce a PDF. It is a hint about which picker to prefer, not a filter on what
 * comes back, and the two attributes are read independently by the browser.
 *
 * ─────────────── THE CAMERA SCREEN IS RETIRED — 2026-09-09 ───────────────────
 *
 * Figma `1266:14282` draws a full-screen camera: a back arrow, a live
 * viewfinder, a shutter. IT IS NOT BUILT, by Teku's ruling, and the frame is
 * deliberately left alone in the file — the same treatment "Watson" and "Monarch
 * Trust" already have.
 *
 * THE REASON IS THAT MONARCH IS A WEB APP AND CANNOT OWN THE DEVICE CAMERA. A
 * `capture` input summons the phone's OWN camera app; the drawn screen could
 * therefore never show a live viewfinder, only a button that summons one — a
 * whole screen costing a tap to do what this input does directly. So the Camera
 * row fires this input immediately, on every device.
 *
 * `getUserMedia` WAS THE ALTERNATIVE AND WAS REJECTED. A live video feed is a
 * different image every frame, so it could never hold a baseline — the surface
 * would be permanently outside the visual net, which is the one thing this
 * project does not accept of a user-facing screen.
 *
 * CONSEQUENCE, STATED PLAINLY: Flow 9 has NO full-screen surface, and the OS
 * file picker itself gets NO BASELINE. It is OS chrome — it is not in the page,
 * it cannot be screenshotted, and no harness can reach it. That is a real,
 * permanent gap in the visual net and it is named here rather than left silent.
 * What the suite CAN and does cover is everything on either side of it: the
 * surface that opens the picker, and the surface that receives its files.
 *
 * ─────────────────────── WHY `capture` IS NOT A BOOLEAN ──────────────────────
 *
 * `capture="environment"` is a HINT, not a guarantee: a desktop browser ignores
 * it entirely and opens an ordinary file dialog, and that is the correct
 * behaviour rather than a degradation. So "Camera" means "prefer the camera if
 * this device has one", and both rows land in the same handler.
 *
 * `multiple` IS OMITTED FOR CAMERA, DELIBERATELY. A camera returns one frame;
 * declaring `multiple` there would advertise a capability the source does not
 * have.
 *
 * ─────────────────────────── THE HIDDEN INPUT ────────────────────────────────
 *
 * `hidden`, and driven imperatively by the surface's own visible control. That
 * is the ordinary pattern for a styled file trigger, and the harness does NOT
 * reach for this element: `openOverlay`'s `chooseFiles` step clicks the REAL
 * visible button and intercepts the resulting `filechooser`, so the suite
 * exercises the same click path a user does — including the wiring between the
 * button and this input, which a test that poked the input directly would skip.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * What the picker will offer.
 *
 * `image/*` KEEPS THE WILDCARD rather than being expanded to a list, so a
 * device's own formats — HEIC on an iPhone, WebP on Android — are admitted
 * without this file having to enumerate them. `application/pdf` has to be named
 * explicitly because it is not an image and no wildcard covers it.
 */
const ACCEPT_IMAGE_AND_PDF = 'image/*,application/pdf'

export type ReceiptSource = 'camera' | 'gallery'

export interface ReceiptFileInputHandle {
  /** Open the OS picker for this source. */
  open: (source: ReceiptSource) => void
}

export interface ReceiptFileInputProps {
  /**
   * Called with everything the user chose. NEVER called with an empty list —
   * a cancelled picker fires `change` with zero files on some browsers and
   * nothing at all on others, and "the user cancelled" must not look the same
   * as "the user chose nothing", because the second would drop the surface into
   * its processing state with no work to do.
   */
  onFiles: (files: File[]) => void
}

export const ReceiptFileInput = forwardRef<
  ReceiptFileInputHandle,
  ReceiptFileInputProps
>(function ReceiptFileInput({ onFiles }, ref) {
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    open(source) {
      const input = inputRef.current
      if (!input) return
      // SET PER OPEN, NOT PER RENDER. One element serves both sources, so the
      // attributes are whatever the LAST caller asked for — which is why they
      // are written here, immediately before the click, rather than bound to a
      // piece of state that a re-render could reset underneath an open picker.
      input.multiple = source === 'gallery'
      if (source === 'camera') input.setAttribute('capture', 'environment')
      else input.removeAttribute('capture')
      input.click()
    },
  }))

  return (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT_IMAGE_AND_PDF}
      hidden
      onChange={(e) => {
        const files = Array.from(e.target.files ?? [])
        // RESET BEFORE DISPATCH. Without it, choosing the same file twice in a
        // row fires no `change` event at all, because the input's value has not
        // changed — a bug that looks exactly like a broken handler.
        e.target.value = ''
        if (files.length > 0) onFiles(files)
      }}
    />
  )
})
