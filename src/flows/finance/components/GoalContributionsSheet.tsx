import { Sheet } from '@monarch/design-system'

import type { Transaction } from '../../../data/types'
import { ContributionRow } from './ContributionRow'

export interface GoalContributionsSheetProps {
  isOpen: boolean
  onClose: () => void
  /** Every contribution to this goal, newest first - `goalContributions`' own
   *  order, not re-sorted here. */
  contributions: Transaction[]
}

/**
 * -----------------------------------------------------------------------------
 * FLOW 11 - "See All" CONTRIBUTIONS (Gate 78).
 *
 * UNDESIGNED WORK. There is NO contributions bottom-sheet frame anywhere in the
 * case-study file - checked, not assumed. `1266:14344` does carry a `Bottom
 * Sheet` instance (`873:6583`), but it is HIDDEN and EMPTY: `get_metadata`
 * returns it with no children, in the instance and in the main component alike,
 * so it is an unconfigured component someone dropped on the frame and specifies
 * nothing. Same shape as the bare `Field` Gate 49 found on both transaction
 * detail frames, and not built for the same reason.
 *
 * So everything below is the 21 Sept ruling's second half - what Teku did not
 * design follows Claude's judgement - EXCEPT the rows themselves, which are the
 * drawn `list/chart legend` rows the screen above already uses.
 *
 * A SHEET AND NOT A ROUTE OR A MODAL, which IS a ruling (Flow 11 plan, 28 Sept):
 * the list has unknown length and must scroll, and `Sheet` is the DS surface
 * that caps at `calc(100dvh - var(--brand-scale-1100))` and scrolls its content
 * region internally.
 *
 * ------------------------------ THE FOUR PROPS ------------------------------
 *
 * `sizing="fill"` OPENS THE PANEL AT THAT CAP. The default hug would make the
 * sheet's height a function of how many contributions a goal happens to have -
 * 16 rows for Bali, 12 for Emergency, 1 for a goal topped up once - so the same
 * control would produce a different-sized surface per goal. Filling takes the
 * cap the panel already declares, so it introduces no new geometry and no new
 * literal (`SheetProps.sizing`'s own doc-comment makes exactly that point).
 *
 * THE ✕ IS KEPT, UNLIKE `TransactionFilterSheet`. That sheet suppresses it
 * because Figma draws a header with "Reset" and no ✕; this surface has no frame
 * to defer to, and it has no back control either - it is opened from a screen,
 * not pushed from another view - so the ✕ is the only visible dismissal.
 * `Sheet` supplies Escape and the scrim regardless.
 *
 * NO `onBack`, AND THE EMPTY LEADING SLOT IS THE POINT RATHER THAN AN OMISSION.
 * `OverlayHeader` is a three-column grid whose two side tracks are a FIXED,
 * IDENTICAL `--brand-scale-800`, and both `<div>`s render whatever they hold -
 * the empty one carries `aria-hidden` and keeps its width. So the title is
 * centred by arithmetic in all four icon combinations rather than balanced by
 * whatever the slots happen to contain. `goal-detail.spec.ts` asserts that in
 * the rendered DOM rather than taking it from the props.
 *
 * `contentPadding` IS LEFT AT `'default'`. The UI-1 rule is "no inner
 * container, no second shadow, no box within a box", and these rows already
 * satisfy it: `.mn-chart-legend-item` declares `background: none`, no border,
 * no radius and no shadow, so they sit flat on the sheet surface as they are.
 * `'none'` exists for a full-bleed child whose own tint must reach the panel
 * edges - `OptionList`'s selected row - and a contribution row has no tint and
 * no selected state, so releasing the sides would only pull the text off the
 * content column the screen behind it uses.
 *
 * ------------------------------- THE TITLE ----------------------------------
 *
 * "Contributions", NOT "Recent Contributions". The screen's heading says
 * "Recent" because it shows a four-row slice; this sheet is the whole list, so
 * repeating "Recent" would name it wrongly. Judgement, since nothing draws it.
 * -----------------------------------------------------------------------------
 */
export function GoalContributionsSheet({
  isOpen,
  onClose,
  contributions,
}: GoalContributionsSheetProps) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Contributions" sizing="fill">
      <ul className="mvp-goal-detail__rows">
        {contributions.map((t) => (
          <li key={t.id}>
            <ContributionRow transaction={t} />
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
