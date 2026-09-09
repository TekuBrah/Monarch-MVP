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
export function CapturingBlock({ count }: { count: number }) {
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
    </div>
  )
}
