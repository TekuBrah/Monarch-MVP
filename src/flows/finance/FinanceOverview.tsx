import { CardBalance, Icon } from '@monarch/design-system'
import { useNavigate } from 'react-router-dom'
import { useAccounts } from '../../accounts/AccountsProvider'
import { chartDomain, holdingValue, netWorthChange } from '../../data/derive'
import { formatMyr } from '../../data/format'
import { NetWorthCard } from './components/NetWorthCard'

/**
 * `Finance_Overview01` — the Overview tab's body.
 *
 * Two sections: the net-worth hero with its trend chart, and the balance-card
 * grid that the hero is the sum of.
 *
 * THE GRID IS A WRAPPING FLEX ROW, NOT A TWO-COLUMN CSS GRID. That is what
 * Figma authors — `flex-wrap` with `gap: 8`, and each `card/balance` carrying
 * `w-161 / min-w-128 / max-w-172` of its own. The difference is not cosmetic: a
 * fixed two-column grid would force the ninth card to stretch to a half-width it
 * was never given, and would stop the row reflowing on a wider frame.
 *
 * THE LONE NINTH CARD IS HELD TO ONE COLUMN, deliberately — Teku's ruling at
 * Gate 33. It does NOT span the row. The constraint lives on the flex item in
 * finance.css (`:last-child:nth-child(odd)`), not on the component, because
 * `sizing="fill"` is precisely the prop that hands that decision to the row.
 *
 * EVERY CARD IS TAPPABLE (B4) — `CardBalance.onClick` arrived in DS v1.2.0 for
 * exactly this. With `onClick` the component renders a real `<button>` with its
 * own `:focus-visible` ring, so all nine are keyboard-reachable without this
 * flow owning a single focus style.
 */
export function FinanceOverview() {
  const navigate = useNavigate()
  const { holdings, cryptoHoldings, netWorth, netWorthSeries } = useAccounts()

  return (
    <div className="mvp-finance__body">
      <NetWorthCard
        // DERIVED — sum(holdings), never stored. Figma's RM 450,958.84 is not
        // reproduced; it is short of its own cards' sum. See holdings.ts.
        amount={netWorth}
        series={netWorthSeries}
        domain={chartDomain()}
        change={netWorthChange(netWorthSeries)}
      />

      <section className="mvp-finance__section mvp-column">
        <ul className="mvp-finance__grid">
          {holdings.map((holding) => (
            <li key={holding.id} className="mvp-finance__grid-item">
              <CardBalance
                /*
                  The badge tint Figma paints per category, finally reachable.
                  `CardBalance.iconColor` arrived in DS v1.3.0 and passes straight
                  through to `IconObject` — the `slate` that every card used to
                  render is now only this prop's default, not a hard-coded value.
                  `holding.badgeColor` has carried the measured colour since Flow
                  7; this is the line that was waiting for it.
                */
                /*
                  THE CARD FILLS ITS TRACK — `sizing="fill"` arrived in DS
                  v1.11.0 and drops the component's own `width: 161px` and
                  `max-width: 172px` (`min-width: 128px` is deliberately kept).
                  Without it the card capped at 172 inside a 195px flex track at
                  430, leaving 23px of dead space on the right of every card and
                  stopping the row reaching the net-worth card's edge.
                */
                sizing="fill"
                icon={<Icon name={holding.icon} size="m" />}
                iconColor={holding.badgeColor}
                type={holding.category}
                name={holding.name}
                amount={formatMyr(holdingValue(holding, cryptoHoldings))}
                onClick={() => navigate(`/finance/holding/${holding.id}`)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
