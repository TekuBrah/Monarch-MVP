import { Divider, Icon, IconButton, IconObject, TrendIndicator } from '@monarch/design-system'
import type { IconObjectColor, TrendDirection } from '@monarch/design-system'
import type { IconName } from '@monarch/design-system'
import { splitMyr } from '../../../data/format'
import type { Amount } from '../../../data/types'

/**
 * The teal hero card at the top of a holding's drill-down.
 *
 * ⚠️ THE HERO IS NOT UNIFORM ACROSS TYPES, and getting this wrong was the
 * original spec's mistake. Figma's fixed-deposit hero draws a caption, an edit
 * affordance, a divider, the value, and a maturity line — and NO trend. That is
 * not an omission: a term deposit, a cash account, a joint account and a bar of
 * gold have no market movement to indicate, so a trend row on any of them would
 * be inventing a fact. Only Stocks, Unit Trust, PRS and the crypto wallets carry
 * one.
 *
 * A RULE-4 COMPOSITION. Figma authors no component for this frame; every part
 * inside it is a real DS component and only the arrangement is local.
 *
 * NOTE THIS IS WHERE `badgeColor` ACTUALLY LANDS. The overview's `CardBalance`
 * cannot express the category tint (it hard-codes a slate `IconObject`), but
 * this composition builds its own `IconObject` and so honours the measured hue.
 * The two surfaces will agree the moment the DS grows the prop.
 */
export interface HoldingHeroProps {
  /**
   * The card's caption line — the holding's name.
   *
   * NOT the category. `HeaderDefault` directly above already prints the category
   * as its subtitle, and rendering it here too put "Bank Account" on screen
   * twice, two rows apart. Figma's hero draws ONE caption line, so this is one
   * caption line.
   */
  name: string
  icon: IconName
  badgeColor: IconObjectColor
  value: Amount
  /** Omitted entirely for types with no market movement — see above. */
  trend?: { direction: TrendDirection; label: string }
  /** The line under the divider — "Maturity: 15 Dec 2027", "4.00 g of gold". */
  footnote?: string
  onEdit?: () => void
}

export function HoldingHero({
  name,
  icon,
  badgeColor,
  value,
  trend,
  footnote,
  onEdit,
}: HoldingHeroProps) {
  // Split from ONE formatted string, so the two halves cannot disagree.
  const { main, fraction } = splitMyr(value)

  return (
    <section className="mvp-finance__hero">
      <header className="mvp-finance__hero-head">
        <IconObject color={badgeColor} shape="circle" size="l">
          <Icon name={icon} size="m" />
        </IconObject>

        <div className="mvp-finance__hero-names">
          <span className="type-body-sm-semibold">{name}</span>
        </div>

        <IconButton
          variant="tertiary"
          size="s"
          ariaLabel={`Edit ${name}`}
          icon={<Icon name="edit" size="s" />}
          onClick={onEdit}
        />
      </header>

      <Divider weight={1} />

      <p className="mvp-finance__hero-amount">
        <span className="type-header-h4">{main}</span>
        <span className="type-header-h6">{fraction}</span>
      </p>

      {/* Rendered only where a move exists. `flat` still renders — it is an
          honest "no movement recorded", which is why the DS ships it. */}
      {trend && <TrendIndicator direction={trend.direction} label={trend.label} />}

      {footnote && (
        <p className="type-body-caption mvp-finance__hero-footnote">{footnote}</p>
      )}
    </section>
  )
}
