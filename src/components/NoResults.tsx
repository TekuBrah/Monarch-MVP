import { Button, Icon, IconObject } from '@monarch/design-system'
import './NoResults.css'

/**
 * The NO-RESULTS state — a filter excluded every row.
 *
 * ⚠ THIS IS ERROR RECOVERY, NOT ONBOARDING, AND THE TWO ARE DIFFERENT DESIGNS.
 * A first-run EMPTY state ("you have no receipts yet") teaches a feature and
 * offers the action that creates the first record. This one tells a user that
 * the narrowing THEY applied matched nothing, and offers the action that undoes
 * it. Do not generalise this component to serve the first-run case: that state
 * is unreachable today — nothing can take either collection to zero records,
 * because there is no delete-all and no persistence to reset — and it arrives
 * with persistence, after the Flow 11 completion record. Building for it now
 * would be a prop nobody passes.
 *
 * UNDESIGNED WORK, under the 21 Sept ruling (what Teku designed in Figma is
 * followed exactly; what he did not design follows Claude's judgement). Read at
 * Gate 80-C from `v9MI8jxTaXiJA234Hkanlf`: Flow 8's section (`1266:14327`) is
 * three frames and Flow 9's (`1266:14277`) is eight instances, one annotation
 * and one component frame — NEITHER draws an empty or no-results state for
 * either list, which is what `ReceiptsTab`'s own header has said since Gate 48.
 * The DS ships nothing for it either: searches of `xhA5ARVgSeD3gA41lYDqST` for
 * an empty-state and an illustration component return only unrelated matches
 * (`crop_3_2`, `Scrollbar container`, `Header`, `img/bg01`).
 *
 * SO THE "ILLUSTRATION ONLY IF THERE IS ROOM" QUESTION WAS DECIDED BY WHAT
 * EXISTS, NOT BY THE SPACE. There IS room — measured on the Receipts applied
 * state at 375, 403px between the add button's bottom edge (310) and the nav
 * band's top (713) — and there is no illustration to put in it. The DS has no
 * illustration primitive, and authoring artwork is not a build step (the Gate 24
 * icon census and the Gate 76 goal images are both precedents for stopping at
 * that line). What the DS DOES ship, and what this app already uses for a mark
 * above a centred message, is an `IconObject` badge: `ComingSoon` uses
 * `color="slate" shape="circle" size="xxl"` around an `Icon size="l"`, and
 * Gate 80's education hero made the same call for the same reason. This is that
 * badge — it is not an illustration and is not claimed to be one.
 *
 * THE GLYPH IS `filter_list`, WHICH NAMES THE CAUSE. The state is produced by a
 * filter and resolved by clearing one, so the mark points at the mechanism the
 * user has to act on. `search` was the other candidate and is wrong whenever
 * the search box is empty, which is the common case; `search_off` is NOT in the
 * registry (109 glyphs at v2.8.0, counted).
 *
 * NO DS `Label`, DELIBERATELY, AND IT IS NOT AN OVERSIGHT.
 * `section-headers.spec.ts` fails on any DS `Label` rendered outside a
 * `.mvp-section-header`, and `.mvp-coming-soon` sits on its `BYPASS_EXCEPTIONS`
 * list for exactly that reason — its "Coming soon" pill IS a status chip. A
 * no-results state is not a status; it is a message plus a way out. So this
 * renders no `Label`, adds no exception to that guard, and leaves the Gate 78
 * shape alone.
 *
 * COMPOSITION, NOT A PRIMITIVE (rule 4). Three DS components — `IconObject`,
 * `Icon`, `Button` — arranged, with the layout box as the only local element.
 * It owns its own stylesheet, which is the rule `ComingSoon`'s header states.
 *
 * ⚠ A PROMOTION CANDIDATE FOR THE DS, REGISTERED AND NOT PROMOTED. A no-results
 * block is a general pattern and the DS ships none; it belongs on the DS round's
 * list beside the illustration gap, not in a flow gate. Until then it lives
 * here, in `src/components/` rather than in `src/flows/finance/`, because two
 * FLOWS consume it — Flow 8's ledger and Flow 9's receipts — which is the same
 * test that promoted `ComingSoon` out of `flows/homepage/` at Flow 7.
 *
 * THE COPY IS PARAMETERISED AND THE STRUCTURE IS NOT. Same mark, same heading
 * level, same spacing, same action placement on both surfaces; only the three
 * strings differ, because the facet sets differ.
 */
export interface NoResultsProps {
  /** Short, naming the state — "No receipts match". */
  title: string
  /**
   * One line that ADDS information rather than restating the title: which facet
   * is worth widening, and that the chips above are dismissible.
   */
  description: string
  /**
   * The one recovery action, labelled by its OUTCOME rather than its mechanism —
   * "Show all receipts", not "Clear filters".
   *
   * ⚠ THAT WORDING IS LOAD-BEARING, because the handler clears the search term
   * as well as the facets. A zero result can be caused by either, so an action
   * that cleared only the facets could leave the user still at zero — a
   * recovery action that does not recover. "Clear filters" would then be
   * describing a mechanism it exceeds; naming the outcome is accurate whatever
   * combination caused the state.
   */
  actionLabel: string
  /** Resets the facets AND the search term — see `actionLabel`. */
  onReset: () => void
}

export function NoResults({
  title,
  description,
  actionLabel,
  onReset,
}: NoResultsProps) {
  return (
    /*
      ⚠ THE LIVE REGION IS ON THIS BLOCK, NOT ON THE LIST, AND THAT IS A
      DELIBERATE DEPARTURE FROM "put it on the results region".

      A live region announces ADDITIONS to its subtree. Wrapping the results
      region would mean that going from zero back to everything announces all
      53 ledger rows — the filter change a user makes most often, turned into
      the longest possible utterance. Announcing the transition TO zero is the
      thing worth having, and that is what this does.

      IT FOLLOWS `CapturingBlock`, which is this repo's established pattern:
      `role="status" aria-live="polite"` on a block that is itself mounted
      conditionally. The honest cost of that pattern is that an inserted live
      region is less reliably announced than one already in the DOM. The
      alternative — a region that is always present — costs an 8px flex gap on
      every state of both tabs (both parents are `flex-direction: column` with
      `gap: var(--spacing-200)`), which would move every baseline of both tabs
      for a marginal gain; and `:empty { display: none }` to avoid that gap puts
      the region back to being inserted anyway.
    */
    <div className="mvp-no-results" role="status" aria-live="polite">
      <IconObject color="slate" shape="circle" size="xxl">
        <Icon name="filter_list" size="l" />
      </IconObject>

      {/* `h2` MATCHES `ComingSoon`, which is the only other heading these tab
          bodies render. Neither tab emits an `<h*>` of its own and
          `SectionHeader` renders a `<div>`, so there is no deeper level to nest
          under and inventing one would be inventing a hierarchy. */}
      <h2 className="type-header-h5 mvp-no-results__title">{title}</h2>

      <p className="type-body-sm mvp-no-results__description">{description}</p>

      {/* SECONDARY, NOT PRIMARY. On the Receipts tab a primary "Add new
          receipt" sits directly above this block, and two primaries competing
          in one column is the shape Gate 50 refused for the bulk modal's two
          source buttons. The outlined treatment also reads as the safe way
          back, which is what the delete confirmations' Cancel already
          establishes. Both surfaces take the same variant, because the brief
          requires identical action placement. */}
      <Button
        variant="secondary"
        size="m"
        label={actionLabel}
        onClick={onReset}
      />
    </div>
  )
}
