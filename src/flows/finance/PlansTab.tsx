import { CardGoals, ListItem } from '@monarch/design-system'
import { useNavigate } from 'react-router-dom'

import { useAccounts } from '../../accounts/AccountsProvider'
import { SectionHeader } from '../../components/SectionHeader'
import { CommitmentMark } from '../../components/CommitmentMark'
import { goalImageUrl } from '../../config/media'
import { commitmentCadenceLabel, commitmentDueLabel, goalPercent } from '../../data/derive'
import { formatMyr } from '../../data/format'

/**
 * Flow 11 — `Finance_Plan` (`1266:14339`), the Plans tab's body.
 *
 * IT REPLACES A `ComingSoon` STUB, SO IT CHANGES FOUR BASELINES AND ADDS NONE.
 * `/finance [tab:plans]` has been one of the walk states since the tab list had
 * five entries — the general rule Gate 48 stated for Receipts and Gate 67
 * collected on for Budget. Only a genuinely new route, tab or overlay entry
 * moves `|WALK|`.
 *
 * TWO SECTIONS, EACH A `SectionHeader` PLUS A BODY. Figma draws both headings as
 * a `Label` on the left and an "Add New" text on the right, which is exactly the
 * component this app already owns — so neither heading is hand-rolled, and both
 * inherit the standing ruling that every section heading binds
 * `text/subtle/default`.
 *
 * "ADD NEW" IS NOT RENDERED AT ALL, ON EITHER HEADING. `SectionHeader` draws its
 * `Link` only when `linkLabel` is supplied, so omitting it is the whole of the
 * suppression. Both affordances write — Add a Goal is Gate 79's, Add Commitment
 * shows a "Coming soon." toast under the MVP scope rule — and Gate 44 settled
 * what to do in the meantime: a control that is drawn, focusable and announced
 * to a screen reader while being unable to do anything is worse than one that is
 * not there. The same call the Budget tab's own affordances made.
 *
 * THE GOAL CARDS ARE INERT THIS GATE, AND DELIBERATELY SO. `CardGoals.onClick`
 * exists and their destination — `/finance/plans/goals/:goalId` — does not until
 * Gate 77. Omitting the prop is not merely "not wiring it": the DS renders a
 * plain `<div>` without `onClick` and a real `<button>` with it, so the card is
 * not focusable, not announced as a control and carries no pointer cursor. A tap
 * target that leads nowhere is worse than an untapped card.
 */
export function PlansTab() {
  const navigate = useNavigate()
  const { goals, commitments } = useAccounts()

  return (
    <div className="mvp-plans">
      <section className="mvp-plans__section">
        <div className="mvp-column">
          <SectionHeader label="Goals" />
        </div>

        {/*
          FULL-BLEED AND HORIZONTALLY SCROLLED, BECAUSE FIGMA'S OWN ROW
          OVERFLOWS. `card/goals` is a hard 200px wide — the DS declares
          `width: 200px` and exposes no sizing prop — and Figma places two of
          them at x=0 and x=208 inside a 343px content column. 2 x 200 + 8 = 408
          against 343, so the second card is cut off at the frame edge in the
          file itself, exactly as the Smart Insights carousel is (A12 / SYS-9,
          disposition "intentional horizontal scroll").

          SO THE 200px IS NOT A DS GAP TO REGISTER. It is the drawn width, and
          the row scrolling is the drawn behaviour. `.mvp-column--bleed` carries
          the gutter as padding plus the `scroll-padding-left` that stops a
          snapped first card eating it — Gate 14's finding, and the reason that
          class exists at all.
        */}
        <ul className="mvp-plans__goals mvp-column--bleed">
          {goals.map((goal) => (
            <li key={goal.id}>
              <CardGoals
                image={<img src={goalImageUrl(goal.image)} alt="" />}
                title={goal.name}
                /*
                  DERIVED, FLOORED. Both seeded goals land on the exact integers
                  Figma prints (56% and 92%), so the seed cannot tell floor from
                  round — `goalPercent` states the rule for the first goal that
                  does not.
                */
                percentage={goalPercent(goal)}
                current={formatMyr(goal.savedAmount)}
                total={formatMyr(goal.targetAmount)}
                /*
                  TAPPABLE AS OF GATE 78, AND THIS IS A `navigate` RATHER THAN
                  A CALLBACK. The Savings Goals card on the Overview tab takes a
                  callback because /finance -> /finance would not remount
                  `FinanceScreen`, so its tab `useState` initialiser would never
                  re-run; this card goes to a genuinely different path, so the
                  router is what should move.

                  PASSING `onClick` ALSO FLIPS THE CARD'S ROOT <div> -> <button>,
                  which is what makes it focusable and announced as a control.
                  It moves no pixel: `.mn-card-goals` already carries the full
                  reset (background/border/padding/font-family/text-align) and
                  an explicit `width: 200px`, and every text node under it - the
                  title and all three `ProgressBar` labels - carries an explicit
                  `type-*` class, each of which sets font-size AND line-height,
                  so the UA button `font` shorthand is fully overridden. Same
                  mechanism Gate 49 measured for `ListItem`.
                */
                onClick={() => navigate(`/finance/plans/goals/${goal.id}`)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="mvp-plans__section mvp-column">
        <SectionHeader label="Commitments" />
        <ul className="mvp-plans__commitments">
          {commitments.map((commitment) => (
            <li key={commitment.id}>
              <ListItem
                leading={<CommitmentMark commitment={commitment} size="row" />}
                title={commitment.name}
                titleInfo={commitmentCadenceLabel(commitment)}
                amount={formatMyr(commitment.amount)}
                amountInfo={commitmentDueLabel(commitment)}
                /*
                  PASSED, NOT OMITTED. `ListItem.hasReceiptIcon` DEFAULTS TO
                  TRUE, so leaving it out draws a `receipt_long` glyph beside
                  every amount — the omitted-prop trap this repo has now hit
                  four times (`Link.iconBefore`, `ReceiptCard`, the holding
                  drill-down at Gate 53-B, and `HeaderDefault.hasSubtitle`). A
                  commitment is a plan, not a receipt.
                */
                hasReceiptIcon={false}
                /*
                  TAPPABLE AS OF GATE 80, and a `navigate` rather than a
                  callback for the reason the goal cards above take one: the
                  destination is a genuinely different path, so the router is
                  what should move. (The Overview tab's Savings Goals card
                  takes a callback instead because /finance -> /finance would
                  not remount `FinanceScreen`.)

                  PASSING `onClick` FLIPS `ListItem`'s ROOT <div> -> <button>,
                  which is what makes the row focusable and announced as a
                  control. Gate 49 measured that it moves no pixel:
                  `.mn-list-item` already carries the full reset
                  (background/border/padding/font-family/text-align/width),
                  and every text node inside carries an explicit `type-*`
                  class, each of which sets size AND line-height, so the UA
                  button `font` shorthand is fully overridden.
                */
                onClick={() =>
                  navigate(`/finance/plans/commitments/${commitment.id}`)
                }
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
