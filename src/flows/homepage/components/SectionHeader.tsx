import { Label, Link } from '@monarch/design-system'
import type { IconName } from '@monarch/design-system'
import { Icon } from '@monarch/design-system'

/**
 * A section heading row — a `Label` on the left, an optional "See all" `Link`
 * on the right. Used four times across the two Homepage screens.
 *
 * This is the SYS-3 / F1 A4 fix. In Figma, Fiat's "Transactions" is a raw
 * `text` node (`0:419`) while every comparable header — Crypto's "My Tokens",
 * "Featured Coin", Fiat's "Smart Insights" — is a `Label` instance. One header
 * escaped the component. Routing all four through here means the escape cannot
 * happen in code: there is no path that renders a section heading as raw text.
 *
 * Flow-local by design (architecture §1.1 rule 3) — it moves to
 * `src/components/` when a second flow needs it, not before.
 */
export interface SectionHeaderProps {
  label: string
  /** Leading glyph, where the design gives the heading one. */
  icon?: IconName
  /** Omit to render the heading with no trailing affordance. */
  linkLabel?: string
  onLinkClick?: () => void
}

export function SectionHeader({
  label,
  icon,
  linkLabel,
  onLinkClick,
}: SectionHeaderProps) {
  return (
    <div className="mvp-section-header">
      <Label
        label={label}
        size="s"
        iconBefore={icon ? <Icon name={icon} size="s" /> : undefined}
      />
      {linkLabel && (
        <Link
          label={linkLabel}
          size="s"
          iconAfter={<Icon name="chevron_right" size="xs" />}
          onClick={(e) => {
            e.preventDefault()
            onLinkClick?.()
          }}
        />
      )}
    </div>
  )
}
