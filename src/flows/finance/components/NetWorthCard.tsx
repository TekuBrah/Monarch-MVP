import { Icon, IconButton, LineChart } from '@monarch/design-system'
import { formatMyr, formatSignedMyr, splitMyr } from '../../../data/format'
import { formatDayOfMonth } from '../../../data/today'
import type { Amount } from '../../../data/types'

/**
 * The Total Net Worth hero — the blue card at the top of `Finance_Overview01`.
 *
 * A RULE-4 COMPOSITION, NOT A MISSING PRIMITIVE. Figma does not author this as
 * a component: it is a frame with a gradient fill holding a label, a split
 * amount, a trend line and a chart. Everything inside it that IS a component is
 * one — `LineChart`, `IconButton`, `Icon` — and the only thing this file owns is
 * their arrangement.
 *
 * THE CHART IS DERIVED, NOT DRAWN (B6). Figma's chart is two flattened `<img>`
 * vectors; no series is recoverable from it. `netWorthSeries()` computes one
 * from the holdings, so the line moves when the money does.
 *
 * TWO DS TOKEN GAPS SHOW HERE AND ARE DELIBERATELY NOT WORKED AROUND:
 *
 *  E-3 — `LineChart` renders NO area fill under an `onColor` series, by design
 *  in the component. Figma draws a soft white wash beneath the line. Using the
 *  right prop and letting the gap show is the instruction; faking the wash with
 *  a local gradient would hide a real DS finding.
 *
 *  E-4 — axis labels use the mapped chrome tier, which in dark mode resolves
 *  near-black against this card. Also not worked around, for the same reason.
 *
 * Both belong to the DS token session. They are visible on purpose.
 */
export interface NetWorthCardProps {
  amount: Amount
  /** Month-to-date series, one point per elapsed day. */
  series: number[]
  /** Total x slots — the whole month, so the line stops where today is. */
  domain: number
  /** Month-to-date change, for the chart's callout. */
  change: Amount
  onToggleVisibility?: () => void
}

export function NetWorthCard({
  amount,
  series,
  domain,
  change,
  onToggleVisibility,
}: NetWorthCardProps) {
  // Split from ONE formatted string, so the two halves cannot disagree.
  const { main, fraction } = splitMyr(amount)

  /*
    Five evenly-spaced day labels across the month. Figma labels every gridline
    01–31, which at 375px wide is unreadable; five is the same axis sampled.
    Derived from `domain` so a 28-, 30- or 31-day month all label correctly.
  */
  const xLabels = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    formatDayOfMonth(Math.max(1, Math.round(t * domain))),
  )

  return (
    <section className="mvp-finance__networth">
      <header className="mvp-finance__networth-head">
        <p className="type-body-caption mvp-finance__networth-label">Total Net Worth</p>
        <IconButton
          variant="tertiary"
          size="s"
          ariaLabel="Hide net worth"
          icon={<Icon name="visibility" size="s" />}
          onClick={onToggleVisibility}
        />
      </header>

      <p className="mvp-finance__networth-amount">
        <span className="type-header-h4">{main}</span>
        <span className="type-header-h6">{fraction}</span>
      </p>

      <div className="mvp-finance__networth-chart">
        <LineChart
          points={series}
          color="onColor"
          // The line stops at today; gridlines and labels span the whole month.
          domain={domain}
          xLabels={xLabels}
          marker={{
            index: series.length - 1,
            label: formatSignedMyr(change),
          }}
          showGridlines
          showAxis
          // Chrome is interface, not data — it dark-flips; the series does not.
          chromeTone="onColor"
          summary={`Net worth month to date, ${formatMyr(
            series[0] ?? amount,
          )} to ${formatMyr(amount)}`}
        />
      </div>
    </section>
  )
}
