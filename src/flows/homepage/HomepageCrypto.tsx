import { ListItem, Logo } from '@monarch/design-system'
import { useNavigate } from 'react-router-dom'
import { useAccounts } from '../../accounts/AccountsProvider'
import { topHoldings, trendOf } from '../../data/derive'
import { formatMyr, formatQuantity, formatSignedPercent } from '../../data/format'
import { FEATURED_COINS } from '../../data/market'
import { BalanceCard } from './components/BalanceCard'
import { SectionHeader } from './components/SectionHeader'

/**
 * `Homepage_Crypto` (`1266:14403`) — the Crypto tab's body.
 *
 * TWO THINGS ARE DELIBERATELY ABSENT, both recorded rather than worked around:
 *
 * C1 — the green sparklines beside the Featured Coin rows. They resolve to raw
 * vector geometry, not a DS component: Figma emits each one as a single
 * flattened `<img src=…svg>` named `graph`, and all three rows point at the
 * SAME asset, which a data-driven chart could not do. That was a Rule-3 gap,
 * raised with G1 (donut) and G3 (trend line) as ONE charting decision.
 *
 * RESOLVED DS-SIDE in v1.1.0 — `LineChart` now exists and a sparkline is that
 * component with its chrome switched off, sized for `ListItem`'s `miniChart`
 * slot. It is deliberately NOT adopted here: charts land with Flow 7, and this
 * flow is not being reopened for them. The rows still carry token, price and
 * move, so nothing is lost by waiting.
 *
 * A5 — Figma has two `navbar/mobile/section` instances at identical positions,
 * one hidden. Nav is shell-owned chrome here, so a duplicate cannot occur.
 */
export function HomepageCrypto() {
  const navigate = useNavigate()
  const { cryptoWallets, cryptoHoldings, cryptoTotal, cryptoChange } = useAccounts()

  const wallet = cryptoWallets[0]
  // "My Tokens" shows the largest holdings; "See all" is the rest.
  const shown = topHoldings(cryptoHoldings, 2)

  return (
    <div className="mvp-home__body">
      <BalanceCard
        logo={wallet?.logo ?? 'general'}
        group="Wallet"
        name={wallet?.name ?? 'Crypto'}
        // DERIVED: sum(holdings). See derive.ts for why this does not equal the
        // RM 102,354.02 the design draws.
        amount={cryptoTotal}
        change={cryptoChange}
        addLabel="Add crypto"
        onSend={() => navigate('/transfer')}
      />

      <section className="mvp-home__section mvp-home__section--inset">
        <SectionHeader label="My Tokens" linkLabel="See all" />
        <ul className="mvp-home__list">
          {shown.map((holding) => (
            <li key={holding.id}>
              <ListItem
                type="crypto"
                leading={<Logo name={holding.logo} size="m" />}
                title={holding.name}
                titleInfo={formatQuantity(
                  holding.quantity,
                  holding.quantityDecimals,
                  holding.symbol,
                )}
                amount={formatMyr(holding.valueMyr)}
                amountInfo={formatSignedPercent(holding.changePct)}
                // Derived from the same number the label formats, so the arrow
                // and the percentage cannot disagree. DS v1.1.0: before this
                // prop existed the row drew a green up-triangle unconditionally.
                trendDirection={trendOf(holding.changePct)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="mvp-home__section mvp-home__section--inset">
        <SectionHeader label="Featured Coin" linkLabel="See all" />
        <ul className="mvp-home__list">
          {FEATURED_COINS.map((coin) => (
            <li key={coin.id}>
              {/*
                `miniChart` is left undefined — see the C1 note above. It is the
                slot the sparkline would occupy once the DS has a chart.
              */}
              <ListItem
                type="crypto"
                leading={<Logo name={coin.logo} size="m" />}
                title={coin.name}
                titleInfo={coin.symbol}
                amount={formatMyr(coin.priceMyr)}
                amountInfo={formatSignedPercent(coin.changePct)}
                trendDirection={trendOf(coin.changePct)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
