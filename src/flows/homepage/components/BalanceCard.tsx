import { Button, Icon, IconButton, Logo } from '@monarch/design-system'
import type { LogoName } from '@monarch/design-system'
import { formatPercent, formatSignedMyr, splitMyr } from '../../../data/format'
import type { Amount } from '../../../data/types'

/**
 * The balance hero at the top of both Homepage screens: an identity row, the
 * balance itself, an optional movement line, and the primary money actions.
 *
 * One component for both screens because Figma draws the same card twice with
 * two differences — the Crypto side adds a movement row and relabels the
 * primary button. Building it twice would be the mistake, and it is also how
 * the two copies drift apart in the first place.
 *
 * B1 IS FIXED HERE. Figma's Fiat "Send" (`0:408`) is a detached `<frame>` whose
 * text layer is still named "Button" — the component's default placeholder —
 * while its exact counterpart on Crypto is a real instance of the same size.
 * There is one `Send` below and it is the DS `Button`, so the detached copy has
 * no expression in code.
 */
export interface BalanceCardProps {
  logo: LogoName
  /** Caption above the name — "Account", "Wallet". */
  group: string
  /** "Main", "Marge's Crypto". */
  name: string
  amount: Amount
  /** Movement since the previous period. Crypto only; derived, never stored. */
  change?: { amount: Amount; pct: number }
  /** "Add money", "Add crypto". */
  addLabel: string
  onAdd?: () => void
  onSend?: () => void
  onMore?: () => void
  onToggleVisibility?: () => void
  onSwitch?: () => void
}

export function BalanceCard({
  logo,
  group,
  name,
  amount,
  change,
  addLabel,
  onAdd,
  onSend,
  onMore,
  onToggleVisibility,
  onSwitch,
}: BalanceCardProps) {
  // Split from ONE formatted string, so the two halves cannot disagree.
  const { main, fraction } = splitMyr(amount)
  const isUp = (change?.amount ?? 0) >= 0

  return (
    <section className="mvp-balance-card">
      <header className="mvp-balance-card__identity">
        <span className="mvp-balance-card__logo">
          <Logo name={logo} size="m" />
        </span>

        <div className="mvp-balance-card__names">
          <span className="type-body-caption mvp-balance-card__group">{group}</span>
          <button
            type="button"
            className="mvp-balance-card__switch type-body-sm-semibold"
            onClick={onSwitch}
          >
            {name}
            <Icon name="expand_more" size="s" />
          </button>
        </div>
      </header>

      <div className="mvp-balance-card__amount-row">
        <p className="mvp-balance-card__amount">
          <span className="type-header-h4">{main}</span>
          <span className="type-header-h6 mvp-balance-card__fraction">{fraction}</span>
        </p>
        <IconButton
          variant="tertiary"
          size="m"
          ariaLabel="Hide balance"
          icon={<Icon name="visibility" size="m" />}
          onClick={onToggleVisibility}
        />
      </div>

      {change && (
        <p className="mvp-balance-card__change">
          <span className="type-body-sm-semibold">{formatSignedMyr(change.amount)}</span>
          <span
            className={`mvp-balance-card__trend ${
              isUp ? 'mvp-balance-card__trend--up' : 'mvp-balance-card__trend--down'
            }`}
          >
            <Icon name={isUp ? 'icon_triangle_up' : 'icon_triangle_down'} size="xs" />
            <span className="type-body-caption">{formatPercent(change.pct)}</span>
          </span>
        </p>
      )}

      <div className="mvp-balance-card__actions">
        <Button
          variant="primary"
          size="m"
          label={addLabel}
          leadingIcon={<Icon name="add" size="m" />}
          onClick={onAdd}
        />
        <Button
          variant="tertiary"
          size="m"
          label="Send"
          leadingIcon={<Icon name="send" size="m" />}
          onClick={onSend}
        />
        <IconButton
          variant="tertiary"
          size="m"
          ariaLabel="More actions"
          icon={<Icon name="more_horiz" size="m" />}
          onClick={onMore}
        />
      </div>
    </section>
  )
}
