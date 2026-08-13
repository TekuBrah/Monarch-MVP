import { Label, Link } from '@monarch/design-system'
import type { IconName } from '@monarch/design-system'
import { Icon } from '@monarch/design-system'
import './SectionHeader.css'

/**
 * A section heading row — a `Label` on the left, an optional "See all" `Link`
 * on the right.
 *
 * This is the SYS-3 / F1 A4 fix. In Figma, Fiat's "Transactions" is a raw
 * `text` node (`0:419`) while every comparable header — Crypto's "My Tokens",
 * "Featured Coin", Fiat's "Smart Insights" — is a `Label` instance. One header
 * escaped the component. Routing all four through here means the escape cannot
 * happen in code: there is no path that renders a section heading as raw text.
 *
 * PROMOTED TO `src/components/` BY GATE 6, on the same architecture §1.1 rule 3
 * that moved `ComingSoon` — a flow-local component crosses into the shared
 * bucket when a SECOND FLOW needs it. Flow 7's `HoldingDetailScreen` was
 * hand-rolling its list heading as a bare `<Label size="s">`, so it rendered
 * without `mn-label--subtle` and broke the standing ruling that ALL section
 * headers bind `text/subtle/default`. The fix is not another prop at another
 * call site — it is one component that owns the pattern.
 *
 * WHICH IS WHY THERE IS NO `tone` PROP. `tone="subtle"` is applied internally
 * and is not exposed: the moment a call site can choose it, the rule stops being
 * a rule. Same reasoning for the class list — the wrapper, the `Label` and the
 * `Link` are this component's business, not its callers'.
 *
 * It brought its stylesheet with it (`SectionHeader.css`). `.mvp-section-header`
 * used to live in `homepage.css`, which would have made every Finance screen
 * depend on the Homepage's layout CSS to draw a heading.
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
        tone="subtle"
        iconBefore={icon ? <Icon name={icon} size="s" /> : undefined}
      />
      {linkLabel && (
        <Link
          label={linkLabel}
          size="s"
          weight="semibold"
          /*
            BOTH ICONS SUPPRESSED WITH `null`, NOT BY OMISSION — Figma inspects
            this link as text-only.
            `Link` DEFAULTS both slots to `<Icon name="open_in_new">`, and a
            default parameter only fires on `undefined`. So omitting `iconBefore`
            rendered an `open_in_new` glyph nobody asked for, and this header used
            to draw two icons: that one plus the chevron below. `null` is a valid
            `ReactNode`, is not `undefined`, so it defeats the default and the
            component's own `{iconBefore && …}` guard renders nothing.
            No override, no wrapper — the suppression is in Link's public API.
          */
          iconBefore={null}
          iconAfter={null}
          onClick={(e) => {
            e.preventDefault()
            onLinkClick?.()
          }}
        />
      )}
    </div>
  )
}
