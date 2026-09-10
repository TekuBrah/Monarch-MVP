import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PDF -> PIXELS (Gate 50-B).
 *
 * WHY THIS EXISTS AT ALL: TESSERACT READS PIXELS, NOT DOCUMENTS. A photographed
 * receipt is already an image and needs nothing; an EMAILED receipt is a PDF,
 * which is a description of glyph positions rather than a bitmap. Handing a PDF
 * straight to the OCR engine reads nothing — not an error, just an empty page —
 * so it has to be drawn first. Both are ordinary things for a user to have, so
 * both must work.
 *
 * IT IS NOT A TEXT EXTRACTOR, AND THAT IS DELIBERATE. `pdfjs-dist` can pull the
 * embedded text layer out of a PDF directly, and for a machine-generated receipt
 * that would be exact rather than merely accurate. It is not used, because then
 * a PDF and a photograph would travel through two different pipelines producing
 * two differently-shaped results, and the parser would have to be right about
 * both. One pipeline, one parser, one set of failure modes worth understanding.
 * A later gate may add the text-layer fast path; it should do so as a
 * measured improvement over this baseline, not as a second code path bolted on.
 * ─────────────────────────────────────────────────────────────────────────────
 * PAGE ONE ONLY.
 *
 * A receipt is one page. A multi-page PDF reaching this path is a statement or
 * an invoice bundle rather than a receipt, and reading page four of it would
 * produce a confident parse of the wrong document. So the first page is
 * rasterised and the rest are ignored — not summed, not concatenated, and not
 * an error, because a receipt with a terms-and-conditions page after it is
 * still a receipt.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE WORKER IS SERVED FROM THIS ORIGIN, exactly as the OCR engine's is.
 * `pdfjs-dist` defaults `GlobalWorkerOptions.workerSrc` to nothing and warns
 * that it will fall back to running on the main thread; the documented fix
 * points it at a CDN copy. `?url` makes Vite emit the worker as a
 * content-hashed asset instead, so no third party is involved.
 *
 * IT DOES NOT MAKE THE APP WORK OFFLINE — this comment used to say it did.
 * There is no service worker in this app (measured at the Gate 50-B correction
 * round), so with no network nothing loads at all. Own-origin delivery buys
 * privacy and independence from a domain this deploy does not control.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * The long edge, in device pixels, that a page is rasterised to.
 *
 * DERIVED FROM WHAT THE ENGINE NEEDS, NOT PICKED. Tesseract's own guidance is
 * that it wants roughly 300 DPI of the printed original; a PDF's own coordinate
 * space is 72 units to the inch, so a receipt-sized page needs about four times
 * its nominal dimensions. 2000 is what that comes to for an A4-height page
 * (842 units at 72/inch is 11.7 inches, and 11.7 x 170 is close to 2000), and it
 * is applied to the LONG EDGE so a narrow till-roll PDF is scaled by its length
 * rather than being blown up sideways.
 *
 * IT IS A CEILING, NEVER A FLOOR. A page already larger than this is drawn at
 * its own size rather than being downscaled, because throwing pixels away is
 * the one thing that certainly costs accuracy.
 */
const TARGET_LONG_EDGE = 2000

/**
 * Rasterise page one of a PDF and return it as a PNG blob.
 *
 * A BLOB RATHER THAN A CANVAS OR AN `ImageData`, so the caller's path is
 * identical for a PDF and for a photograph — both end up as a `Blob` handed to
 * `recognise()`. PNG rather than JPEG because this is a re-encode of already
 * lossy-or-vector source and a second lossy pass is free damage to the very
 * glyph edges the engine is about to measure.
 */
export async function rasterisePdfFirstPage(file: Blob): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

  const bytes = new Uint8Array(await file.arrayBuffer())
  // THE LOADING TASK IS KEPT, NOT JUST ITS PROMISE. Teardown lives on the task
  // (`destroy()`), not on the document proxy — the proxy only offers
  // `cleanup()`, which frees cached page resources and leaves the worker
  // running. Awaiting the promise inline would discard the only handle that can
  // shut the worker down.
  const loadingTask = pdfjs.getDocument({ data: bytes })
  const doc = await loadingTask.promise
  try {
    const page = await doc.getPage(1)

    const unscaled = page.getViewport({ scale: 1 })
    const longEdge = Math.max(unscaled.width, unscaled.height)
    const scale = longEdge > 0 ? Math.max(1, TARGET_LONG_EDGE / longEdge) : 1
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)

    const context = canvas.getContext('2d')
    if (!context) throw new Error('could not get a 2d context to rasterise the PDF')

    // WHITE, NOT TRANSPARENT. A canvas starts transparent, and a PDF page
    // usually paints no background of its own — so black glyphs would land on
    // transparent pixels, which flatten to BLACK when encoded, giving the engine
    // black-on-black. Filling first is what makes the page legible at all.
    //
    // AND IT MUST NOT BECOME A DESIGN TOKEN, which is the one thing a reader of
    // rule 2 would reach for here. This is not a surface anybody looks at — it
    // is the paper colour behind the glyphs the recogniser is about to measure.
    // `--mapped-surface-page` would dark-flip, and OCR of white text on black
    // paper is exactly the failure this line exists to prevent.
    context.fillStyle = 'white'
    context.fillRect(0, 0, canvas.width, canvas.height)

    // `canvas` is the current parameter and `canvasContext` the compatibility
    // one; the type requires `canvas`, so it is passed and the context is not.
    await page.render({ canvas, viewport }).promise

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })
    if (!blob) throw new Error('could not encode the rasterised PDF page')
    return blob
  } finally {
    // Aborts the transport and shuts the worker down. Without it, every PDF a
    // user adds in one sitting leaves a worker and a parsed document alive for
    // the life of the tab.
    await loadingTask.destroy()
  }
}
