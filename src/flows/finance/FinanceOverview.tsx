import { CardBalance, Icon } from '@monarch/design-system'
import { useNavigate } from 'react-router-dom'
import { useAccounts } from '../../accounts/AccountsProvider'
import { chartDomain, goalsTotal, holdingValue, netWorthChange } from '../../data/derive'
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
 * A FINAL CARD WITH NO PARTNER IS HELD TO ONE COLUMN, deliberately — Teku's
 * ruling at Gate 33. It does NOT span the row. The constraint lives on the flex
 * item in finance.css (`:last-child:nth-child(odd)`), not on the component,
 * because `sizing="fill"` is precisely the prop that hands that decision to the
 * row. It is DORMANT at this gate's ten cards — see below.
 *
 * THE TENTH CARD IS "Savings Goals" AND FIGMA DOES NOT DRAW IT — Gate 76, on
 * Teku's ruling, on the Joint Account precedent of a card the frame omits. It is
 * ONE card for all goals rather than one per goal, it sits in this grid with the
 * bank cards rather than in a section of its own, and it is the only card here
 * that is not a `Holding`.
 *
 * THAT LAST POINT IS THE LOAD-BEARING ONE. Goals are a separate collection
 * (Gate 75), so `holdings` still has nine members: a goal cannot be drilled into
 * at `/finance/holding/...`, cannot be picked as Gate 79's Top-Up source, and
 * has no `holdingValue`. Its money reaches the hero through `netWorth`'s second
 * term, not by joining this array.
 *
 * THE LONE-CARD RULE GOES DORMANT AT TEN, BY DESIGN. Gate 33's
 * `:last-child:nth-child(odd)` is keyed to PARITY, not to a count, precisely so
 * it "survives the fixture growing or shrinking" — with ten cards every row
 * pairs and nothing is held to one column. The ninth card pairing with this one
 * is that rule working, not a regression.
 *
 * EVERY CARD IS TAPPABLE (B4) — `CardBalance.onClick` arrived in DS v1.2.0 for
 * exactly this. With `onClick` the component renders a real `<button>` with its
 * own `:focus-visible` ring, so all nine are keyboard-reachable without this
 * flow owning a single focus style. All TEN are, including the goal card.
 */
export interface FinanceOverviewProps {
  /**
   * Show this screen's Plans tab — what the "Savings Goals" card taps to.
   *
   * A CALLBACK, NOT A ROUTE, because the Finance tabs are in-screen state and
   * never reach the URL (B7). See the call site in `FinanceScreen` for why
   * `navigate` cannot do this from a card that is already on `/finance`.
   */
  onShowPlans: () => void
}

export function FinanceOverview({ onShowPlans }: FinanceOverviewProps) {
  const navigate = useNavigate()
  const { holdings, cryptoHoldings, netWorth, netWorthSeries, goals } = useAccounts()

  return (
    <div className="mvp-finance__body">
      <NetWorthCard
        // DERIVED — `sum(holdings) + sum(goals)`, never stored. Figma's
        // RM 450,958.84 is not reproduced; it is short of its own cards' sum.
        // See holdings.ts, and `netWorth` for why goals are a separate term.
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

          {/*
            THE COMBINED GOAL CARD. Outside the `map` because it is not a
            `Holding` — see the block comment above.
          */}
          <li className="mvp-finance__grid-item">
            <CardBalance
              sizing="fill"
              /*
                `icon_automatic_savings` is the glyph this tab's own Plans stub
                used, so the affordance and its destination agree.

                `cyan` IS A NEW CATEGORY TINT, AND IT HAD TO BE. The grid's
                badge colour encodes the CATEGORY — teal for Bank Account,
                green for Investment, yellow for Assets, orange for Crypto
                Wallet — so a new category needs a tint no other category holds.
                Green would have been the natural reading (the goal cards'
                progress bars are green) and is exactly the one that is taken.
                Figma draws no such card, so there is no measured value to
                transcribe; this is stated as a choice rather than dressed up as
                one.
              */
              icon={<Icon name="icon_automatic_savings" size="m" />}
              iconColor="cyan"
              type="Savings"
              name="Goals"
              /*
                DERIVED — `sum(savedAmount)`, in whole sen. The same figure
                `netWorth` adds, from the same function, so the card and the
                hero above it cannot disagree.
              */
              amount={formatMyr(goalsTotal(goals))}
              /*
                IT GOES TO THE PLANS TAB, NOT TO A DRILL-DOWN. A goal is not an
                account and must never acquire a `/finance/holding/...` route.
              */
              onClick={onShowPlans}
            />
          </li>
        </ul>
      </section>
    </div>
  )
}
