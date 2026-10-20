import { Icon, IconObject } from '@monarch/design-system'
import type { IconName } from '@monarch/design-system'
import './EmptyState.css'

/**
 * The EMPTY state — the stored collection holds nothing. Gate 88.
 *
 * ⚠ A SIBLING OF `NoResults`, NOT AN EXTENSION OF IT. `NoResults` is error
 * recovery: a filter matched nothing and its one action undoes the filter.
 * This says what a list is FOR and how it fills, and implies no error. One
 * component with a `kind` prop would make the distinction a prop value someone
 * can pass wrongly; two names make every call site say which state it means.
 * Which of the two renders is decided by `listPresence` in `derive.ts`, from the
 * UNFILTERED count (R88-2).
 *
 * "EMPTIED", MOSTLY, RATHER THAN "FIRST RUN". Every list starts from the seed
 * and Reset restores the seed, so receipts, goals and budgets reach zero only
 * when a user deletes them (persisted since Gate 85). The one exception is a
 * newly created goal's contributions, which genuinely start empty.
 *
 * UNDESIGNED WORK, under the 21 Sept ruling. Read at Gate 88 Phase A: no frame
 * in `v9MI8jxTaXiJA234Hkanlf` draws an empty, zero or first-run state for any
 * list, and the DS (`xhA5ARVgSeD3gA41lYDqST`) ships no empty-state component.
 *
 * NO ACTION PROP, DELIBERATELY. On every surface that uses this the writer's own
 * control is already on screen — "Add new receipt", the Goals heading's "Add
 * New", the DS Add New budget card, Top-Up — so a second control for the same
 * writer would be two calls to action in one column (Gate 50's refusal). And
 * Decision 10 = A (Teku, 18 Oct 2026) keeps Reset data in Settings only, so no
 * empty state offers "Restore demo data". A prop nobody passes is what
 * `NoResults`' header calls building for nothing.
 *
 * NOT A LIVE REGION. Every path that empties a list on screen is a delete, and
 * every delete already raises a polite `role="status"` toast ("Receipt
 * deleted.", "Goal deleted.", "Budget deleted."). An inserted region with its
 * text already inside is often missed, and where it worked it would queue a
 * second message behind the toast. The page layout's real `h2` is what a
 * screen-reader user reaches by heading navigation. Focus is not moved.
 *
 * NO DS `Label`, for `NoResults`' reason: `section-headers.spec.ts` fails on a
 * `Label` outside a `.mvp-section-header`, and this is not a status chip.
 *
 * COMPOSITION, NOT A PRIMITIVE (rule 4): `IconObject` and `Icon` arranged, with
 * the layout box as the only local element, owning its stylesheet. A PROMOTION
 * CANDIDATE for the DS beside `NoResults` — registered (gap register §2ak), not
 * promoted here.
 */
export interface EmptyStateProps {
  /** Names the state — "No receipts". */
  title: string
  /** What the list is for and how it fills. Never an error. */
  description: string
  /**
   * `page` fills a tab body: centred mark, `h2`, one line — `NoResults`' and
   * `ComingSoon`'s rhythm. `section` stands in for one section's rows under its
   * existing heading: two left-aligned lines, no mark.
   */
  layout: 'page' | 'section'
  /** Page layout only. The glyph names the COLLECTION, where `NoResults`' names the cause. */
  icon?: IconName
}

export function EmptyState({ title, description, layout, icon }: EmptyStateProps) {
  if (layout === 'section') {
    return (
      <div className="mvp-empty-state mvp-empty-state--section">
        <p className="type-body-m-semibold mvp-empty-state__title">{title}</p>
        <p className="type-body-sm mvp-empty-state__description">{description}</p>
      </div>
    )
  }
  return (
    <div className="mvp-empty-state mvp-empty-state--page">
      {icon && (
        <IconObject color="slate" shape="circle" size="xxl">
          <Icon name={icon} size="l" />
        </IconObject>
      )}
      {/* `h2` for `NoResults`' reason: the tab bodies emit no heading of their
          own, so there is no deeper level to nest under. */}
      <h2 className="type-header-h5 mvp-empty-state__title">{title}</h2>
      <p className="type-body-sm mvp-empty-state__description">{description}</p>
    </div>
  )
}
