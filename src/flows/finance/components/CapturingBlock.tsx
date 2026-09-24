import { useEffect, useState } from 'react'
import { Loader } from '@monarch/design-system'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE PROCESSING MOMENT (Gate 50).
 *
 * Shown in place, inside whichever surface is capturing, while
 * `extractReceipt()` has not answered yet. NO NEW SCREEN — a full-screen
 * "processing" route would be a surface the user cannot leave and the design
 * does not draw.
 *
 * THE MOCKUP DRAWS NOTHING BETWEEN CAPTURE AND "RECEIPT ADDED", AND THAT IS A
 * MOCKUP GAP RATHER THAN A COMPONENT GAP — which is exactly why it is built here
 * instead of being registered. Rule 3 sends a MISSING PRIMITIVE to the DS; the
 * DS ships `Loader`, so nothing is missing. What is absent is a frame in Figma,
 * and a flow that shows the user nothing while it works is a defect in the flow,
 * not a licence to show them nothing.
 *
 * `Loader`, NOT `ProgressRing`, AND THE DISTINCTION IS SEMANTIC. `ProgressRing`
 * is DETERMINATE — it takes `value: number` 0-100 and prints a percentage — and
 * extraction has no progress to report: it is one opaque call that has either
 * answered or not. Feeding it a fake percentage would be drawing a number the
 * app does not know. `Loader` is the indeterminate spinner and is the honest
 * one.
 *
 * ──────────────── THE COPY IS INVENTED, AND IT IS FLAGGED ────────────────────
 *
 * Figma supplies no string for this moment because it draws no frame for it. The
 * two lines below are therefore the only copy in this gate not read off the
 * mockup. They are deliberately plain and deliberately not a claim about how
 * long it will take.
 *
 * ─────────────── HOW IT HOLDS A BASELINE, WHICH IT SHOULD NOT ────────────────
 *
 * `.mn-loader` is `animation: loader-spin 0.8s linear infinite` — the ONLY CSS
 * animation in either repo (grep: one match in the DS, zero in MVP `src/`). An
 * infinite animation cannot `finish()`, so the harness's `finishAnimations` used
 * to skip it and the spinner's rotation at capture would have been whatever the
 * wall clock happened to be: a baseline that differs every run.
 *
 * `finishAnimations` now PAUSES what it cannot finish, at `currentTime = 0`.
 * That is deterministic and it is the animation's own first frame, so the
 * baseline records a real render rather than a doctored one. See the harness for
 * the measurement that it moves nothing else: this is the first and only
 * animated element in the app.
 * ─────────────────────────────────────────────────────────────────────────────
 */
/**
 * ─────────── THE ELAPSED-TIME CAPTION (Gate 67, Flow 9 Decision 1) ───────────
 *
 * Gate 58's 6 s ceiling was retired as a LIMIT. A read now runs to completion,
 * up to the 30 s safety cutoff in `receiptCapture.ts`, and this caption tells
 * the user it is still going. Each line replaces the one before.
 *
 * TIME-BASED ON PURPOSE. It never names a reading stage: only 8 of 30 corpus
 * images trigger the second pass, so "reading it again" would be false on most
 * slow reads. It never says "thinking" either, because the product claim is
 * on-device reading with no AI.
 *
 * INSIDE THE SAME `role="status"` `aria-live="polite"` REGION, so a screen
 * reader announces each change. Nothing renders before 6 s, which is what keeps
 * `[overlay:add-saving]` (photographed at 0 s) byte-identical.
 */
const READING_CAPTIONS: { afterMs: number; text: string }[] = [
  { afterMs: 6000, text: "This one's taking a little longer…" },
  { afterMs: 12000, text: 'Photos can take a bit longer to read. Still working…' },
  { afterMs: 20000, text: 'Still working — thanks for your patience.' },
]

/**
 * Timers start at MOUNT and are cleared at UNMOUNT. `CapturingBlock` gives it a
 * `key` of the current read, so a bulk save restarts the count for every file
 * rather than timing the whole batch.
 */
function ReadingCaption() {
  const [caption, setCaption] = useState<string | null>(null)
  useEffect(() => {
    const timers = READING_CAPTIONS.map(({ afterMs, text }) =>
      setTimeout(() => setCaption(text), afterMs),
    )
    return () => timers.forEach(clearTimeout)
  }, [])
  if (caption === null) return null
  return <p className="mvp-capturing__caption type-body-caption">{caption}</p>
}

/**
 * `readKey` names the read in progress. The bulk modal reads its files one at a
 * time (Gate 52) and passes each file's index, so the caption's elapsed time is
 * counted from the start of the CURRENT read. The single-file surfaces mount a
 * fresh block per read and can leave it at its default.
 */
export function CapturingBlock({ count, readKey = 0 }: { count: number; readKey?: number }) {
  return (
    <div className="mvp-capturing" role="status" aria-live="polite">
      {/*
        THE `Loader` CARRIES ITS OWN `role="status"` AND `aria-label`. The
        wrapper's `role="status"` is not a duplicate of that: the loader
        announces "Loading", and this announces WHAT is loading. The visible
        line below is the accessible name of the region, which is why it is not
        `aria-hidden`.
      */}
      <Loader ariaLabel="Reading receipt" />
      <p className="mvp-capturing__label type-body-m">
        {count === 1 ? 'Reading your receipt…' : 'Reading your receipts…'}
      </p>
      <ReadingCaption key={readKey} />
    </div>
  )
}
