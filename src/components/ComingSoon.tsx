import { Icon, IconObject, Label } from '@monarch/design-system'
import type { IconName } from '@monarch/design-system'
import './ComingSoon.css'

/**
 * The "coming soon" state.
 *
 * PROMOTED TO `src/components/` BY FLOW 7. Architecture §1.1 rule 3 says a
 * flow-local component moves to the shared bucket when a SECOND FLOW needs it,
 * not in anticipation — and Flow 7 is that second flow. Its Finance tab bar has
 * five tabs of which one is built, so Transactions, Budget, Plans and Receipts
 * render this exactly as the Homepage's Cards and Stocks tabs do.
 *
 * Uses now, across two flows:
 *  - Flow 1: the Cards and Stocks tabs (F1 A1 — "a known, deliberate state, not
 *    a missing screen"), and the nav destinations whose flows are not built yet.
 *  - Flow 7: the four unbuilt Finance tabs.
 *
 * It brought its stylesheet with it. `.mvp-coming-soon` used to live in
 * `homepage.css`, which would have made every Finance screen import the whole
 * Homepage's CSS to render a placeholder.
 *
 * WHY IT IS A COMPOSITION AND NOT A PRIMITIVE (unchanged by the move). §1.2's
 * semantic test is that a composition imports from `@monarch/design-system`, and
 * that a local component rendering only raw DOM with no DS import is the shape
 * of a primitive and should trigger rule 3 instead of being written. This is
 * three DS components — `IconObject`, `Icon`, `Label` — arranged; the only local
 * element is the layout box they sit in.
 */
export interface ComingSoonProps {
  /** What is not here yet — "Cards", "Transfer", "Budget". */
  title: string
  /** One line on what it will do. Optional; the title alone is a valid state. */
  description?: string
  /** DS icon for the badge. Defaults to the app's generic "more" glyph. */
  icon?: IconName
}

export function ComingSoon({
  title,
  description,
  icon = 'icon_more',
}: ComingSoonProps) {
  return (
    <div className="mvp-coming-soon">
      <IconObject color="slate" shape="circle" size="xxl">
        <Icon name={icon} size="l" />
      </IconObject>

      <h2 className="type-header-h5 mvp-coming-soon__title">{title}</h2>

      <Label label="Coming soon" size="s" />

      {description && (
        <p className="type-body-sm mvp-coming-soon__description">{description}</p>
      )}
    </div>
  )
}
