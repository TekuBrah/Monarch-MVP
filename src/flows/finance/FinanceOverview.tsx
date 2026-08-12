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
 * was never given, and would stop the row reflowing on a wider frame. The ninth
 * card sitting alone on the last row is correct wrapping behaviour, not a defect.
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

      <section className="mvp-finance__section">
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
