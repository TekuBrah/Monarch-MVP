import { Icon, IconObject, Label } from '@monarch/design-system'
import type { IconName } from '@monarch/design-system'
// Imported here as well as by HomepageScreen: the three nav destinations render
// this component without the Homepage ever mounting, and a deep link straight
// to /transfer would otherwise arrive unstyled. Vite dedupes the import.
import '../homepage.css'

/**
 * The "coming soon" state.
 *
 * ONE mechanism, TWO uses, both owned by Flow 1:
 *  - the Cards and Stocks tabs, which F1 A1 resolved as "no content for now,
 *    tapping either shows a coming soon message — a known, deliberate state,
 *    not a missing screen";
 *  - the three nav destinations whose flows are not built yet.
 *
 * WHY IT LIVES HERE AND NOT IN `src/components/`. Architecture §1.1 rule 3:
 * promote to the shared bucket only when a SECOND FLOW needs it. Both uses are
 * inside Flow 1 today. It moves when Flow 2 asks for it, not in anticipation —
 * keeping `src/components/` small is what holds rule 4 (§1.2).
 *
 * WHY IT IS A COMPOSITION AND NOT A PRIMITIVE. §1.2's semantic test is that a
 * composition imports from `@monarch/design-system`, and that a local component
 * rendering only raw DOM with no DS import is the shape of a primitive and
 * should trigger rule 3 instead of being written. This is three DS components —
 * `IconObject`, `Icon`, `Label` — arranged; the only local element is the
 * layout box they sit in. A centred `<div>` with text would have failed that
 * test, and would have been the likeliest rule-4 trap in this flow.
 */
export interface ComingSoonProps {
  /** What is not here yet — "Cards", "Transfer". */
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
