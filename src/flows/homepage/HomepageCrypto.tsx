import { LineChart, ListItem, Logo } from '@monarch/design-system'
import type { ChartHue, TrendDirection } from '@monarch/design-system'
import { useNavigate } from 'react-router-dom'
import { useAccounts } from '../../accounts/AccountsProvider'
import {
  cryptoWalletChange,
  cryptoWalletTotal,
  topHoldings,
  trendOf,
  walletHoldings,
} from '../../data/derive'
import { formatMyr, formatQuantity, formatTrendPercent } from '../../data/format'
import { FEATURED_COINS } from '../../data/market'
import { SectionHeader } from '../../components/SectionHeader'
import { BalanceCard } from './components/BalanceCard'

/**
 * `Homepage_Crypto` (`1266:14403`) — the Crypto tab's body.
 *
 * TWO THINGS ARE DELIBERATELY ABSENT, both recorded rather than worked around:
 *
 * C1 — CLOSED. The green sparklines beside the Featured Coin rows resolved to
 * raw vector geometry, not a DS component: Figma emits each one as a single
 * flattened `<img src=…svg>` named `graph`, and all three rows point at the SAME
 * asset, which a data-driven chart could not do. That was a Rule-3 gap, raised
 * with G1 (donut) and G3 (trend line) as ONE charting decision.
 *
 * Resolved DS-side in v1.1.0 and adopted here now: a sparkline is `LineChart`
 * with its chrome switched off, in `ListItem`'s own `miniChart` slot. Nothing is
 * hand-rolled — an MVP-authored SVG sitting inside a DS card would have been the
 * rule-3 violation this waited to avoid.
 *
 * A5 — Figma has two `navbar/mobile/section` instances at identical positions,
 * one hidden. Nav is shell-owned chrome here, so a duplicate cannot occur.
 */

/**
 * Trend direction -> series hue, matching what `TrendIndicator` already paints
 * for the same direction (up = success/green, down = error/red, flat = subtle).
 *
 * Derived, never stored: the hue is a function of the direction the row already
 * shows, so the line and the triangle cannot disagree — the same reasoning that
 * put `trendDirection={trendOf(...)}` on these rows rather than a second field.
 * Flow-local until a second flow needs it (architecture §1.1 rule 3).
 */
const TREND_HUE: Record<TrendDirection, ChartHue> = {
  up: 'green',
  down: 'red',
  flat: 'gray',
}
export function HomepageCrypto() {
  const navigate = useNavigate()
  const { cryptoWallets, cryptoHoldings } = useAccounts()

  const wallet = cryptoWallets[0]
  /*
    SCOPED TO THE NAMED WALLET, from Flow 7 on.

    This card names one wallet, so it must total that wallet. Flow 1 summed the
    whole holdings list because only one wallet had ever been drawn — harmless
    then, wrong the moment Flow 7 added a second card. Nothing was hand-patched
    to fix it: the same `derive.ts` functions the Finance Overview uses are
    called here with the wallet's own tokens, and the card now reads
    RM 102,354.02, which is what Figma draws on this screen.
  */
  const tokens = walletHoldings(cryptoHoldings, wallet?.id ?? '')
  const walletTotal = cryptoWalletTotal(tokens)
  const walletChange = cryptoWalletChange(tokens)

  // "My Tokens" shows the largest holdings; "See all" is the rest.
  const shown = topHoldings(tokens, 2)

  return (
    <div className="mvp-home__body">
      <BalanceCard
        logo={wallet?.logo ?? 'general'}
        group="Wallet"
        name={wallet?.name ?? 'Crypto'}
        // DERIVED: sum(this wallet's holdings). As of Flow 7 this DOES equal the
        // RM 102,354.02 the design draws — the missing sixth holding was the
        // whole of the old shortfall. See accounts.ts for the evidence.
        amount={walletTotal}
        change={walletChange}
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
                amountInfo={formatTrendPercent(holding.changePct)}
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
              <ListItem
                type="crypto"
                leading={<Logo name={coin.logo} size="m" />}
                title={coin.name}
                titleInfo={coin.symbol}
                amount={formatMyr(coin.priceMyr)}
                amountInfo={formatTrendPercent(coin.changePct)}
                trendDirection={trendOf(coin.changePct)}
                /*
                  The sparkline. `showArea={false}` because Figma draws a bare
                  line in this row, not a filled area — and no `summary`, so the
                  chart renders `aria-hidden`: the row already announces the move
                  through `TrendIndicator`, and labelling the chart would state
                  the same fact twice (LineChart's own docstring makes this the
                  intended sparkline behaviour, not an omission).
                */
                miniChart={
                  <LineChart
                    points={coin.series}
                    color={TREND_HUE[trendOf(coin.changePct)]}
                    showArea={false}
                  />
                }
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
